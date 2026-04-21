/**
 * Execution Topology Resolver — Sketch v3 implementation (PR-A, 2026-04-18).
 *
 * # What this module is
 *
 * Single seat for selecting ONE of 10 canonical execution topologies for a
 * review session. Topology is the top-level decision — teamlead location +
 * lens spawn mechanism + deliberation channel — from which Transport rank
 * (S0~S3, sketch v2 / PR #94) derives as a property, not as a separate axis.
 *
 * # Why it exists
 *
 * PR-1 (PR #96) unified Layer 1 (`resolveExecutionProfile`) and Layer 2
 * (`resolveProvider`) into `resolveExecutionPlan`. Layer 3 —
 * `resolveExecutorConfig` in review-invoke.ts:718-731 — still re-reads
 * `host_runtime` independently, producing silent divergence in ~5 review
 * runs on 2026-04-17~18 (recorded in sketch v3 §1.2). Sketch v3 closes this
 * by making topology the primary decision: executor binary selection is a
 * static property of each topology option, not a Layer 3 re-judgment.
 *
 * This module is the new primary seat. `resolveExecutionPlan` (legacy P0-P4
 * ladder) remains functional until PR-E; `resolveExecutorConfig` keeps its
 * legacy logic through PR-A and migrates in PR-B/C/D/E.
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` — walk priority ladder, return topology or
 *   no_host. Emits `[topology]` STDERR for every branch (mirrors `[plan]`
 *   pattern from PR #96).
 * - `TOPOLOGY_CATALOG` — metadata for each of the 10 options (sketch v3 §3).
 * - `DEFAULT_TOPOLOGY_PRIORITY` — built-in priority walked when
 *   `config.execution_topology_priority` is unset.
 * - Downstream PR-B/C/D register actual spawn paths. Until then, only 3
 *   "supported" options have executor wiring; the remaining 7 are
 *   resolvable but not spawn-able (caller must check).
 *
 * # Design reference
 *
 * - Sketch v3: `development-records/evolve/20260418-execution-topology-priority-sketch.md`
 * - Sketch v2 (Transport): `development-records/evolve/20260417-context-separation-ladder-design-sketch.md`
 * - Handoff §2~§3: `development-records/plan/20260418-sketch-v3-implementation-handoff.md`
 */

import type { OntoConfig } from "../discovery/config-chain.js";
import {
  detectClaudeCodeEnvSignal,
  detectCodexBinaryAvailable,
  detectCodexEnvSignal,
  detectLiteLlmEndpoint,
} from "../discovery/host-detection.js";
import { validateReviewConfig } from "./review-config-validator.js";
import {
  deriveTopologyShape,
  type ShapeDerivationSignals,
} from "./topology-shape-derivation.js";
import { shapeToTopologyId } from "./shape-to-topology-id.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Canonical topology identifier. The 10 options from sketch v3 §3.
 *
 * Prefix convention:
 *   - `cc-teams-*` : Claude Code + TeamCreate teamlead
 *   - `cc-main-*`  : Claude Code + onto TS main teamlead
 *   - `codex-*`    : codex-subprocess-based (host-agnostic or codex host)
 *   - `generic-*`  : reserved for non-CC/non-codex host adapters (future)
 */
export type TopologyId =
  | "cc-teams-lens-agent-deliberation"
  | "cc-teams-agent-subagent"
  | "cc-teams-codex-subprocess"
  | "cc-main-agent-subagent"
  | "cc-main-codex-subprocess"
  | "cc-teams-litellm-sessions"
  | "codex-nested-subprocess"
  | "codex-main-subprocess"
  | "generic-nested-subagent"
  | "generic-main-subagent";

/** Where the teamlead agent runs. */
export type TeamleadLocation =
  | "onto-main"
  | "claude-teamcreate"
  | "codex-subprocess"
  | "generic-subagent";

/** Mechanism used to spawn each per-lens reasoning unit. */
export type LensSpawnMechanism =
  | "claude-agent-tool"
  | "claude-teamcreate-member"
  | "codex-subprocess"
  | "litellm-http"
  | "generic-subagent";

/** Transport rank inherited from sketch v2; here a derived property. */
export type TransportRank = "S0" | "S1" | "S2" | "S3";

/** Whether lens agents can converse (A2A) before synthesize. */
export type DeliberationChannel = "sendmessage-a2a" | "synthesizer-only";

/**
 * The resolved topology: a Topology metadata snapshot plus the decision
 * trace that led to its selection. plan_trace mirrors `[topology]` STDERR.
 */
export interface ExecutionTopology {
  id: TopologyId;
  teamlead_location: TeamleadLocation;
  lens_spawn_mechanism: LensSpawnMechanism;
  max_concurrent_lenses: number;
  transport_rank: TransportRank;
  deliberation_channel: DeliberationChannel;
  plan_trace: string[];
}

export type ExecutionTopologyResolution =
  | { type: "resolved"; topology: ExecutionTopology }
  | { type: "no_host"; plan_trace: string[]; reason: string };

export interface ResolveExecutionTopologyArgs {
  ontoConfig: OntoConfig;
  /** Environment snapshot; defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /**
   * Whether a Claude Code session is hosting this invocation. Defaults to
   * `detectClaudeCodeEnvSignal()`. Injected for test isolation.
   */
  claudeHost?: boolean;
  /**
   * Whether the Claude Code experimental agent-teams flag is set. Defaults
   * to `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1"`.
   */
  experimentalAgentTeams?: boolean;
  /**
   * Whether codex binary and `~/.codex/auth.json` are both reachable.
   * Defaults to `detectCodexBinaryAvailable()`.
   */
  codexAvailable?: boolean;
  /**
   * Whether a Codex CLI session is currently hosting this invocation.
   * Defaults to `detectCodexEnvSignal()`.
   */
  codexSessionActive?: boolean;
  /**
   * Whether a LiteLLM endpoint is configured (env or config field).
   * Defaults to `detectLiteLlmEndpoint() || Boolean(config.llm_base_url)`.
   */
  liteLlmEndpointAvailable?: boolean;
}

// ---------------------------------------------------------------------------
// Topology catalog (sketch v3 §3 table)
// ---------------------------------------------------------------------------

type TopologyMetadata = Omit<ExecutionTopology, "plan_trace">;

/**
 * Canonical metadata for each topology option.
 *
 * Per sketch v3 §3: once a topology id is chosen, all other attributes
 * (teamlead location, spawn mechanism, max concurrency, transport rank,
 * deliberation channel) are static. Principal cannot override them
 * individually — they must change the topology id.
 *
 * `execution_topology_overrides` in config allows per-topology
 * `max_concurrent_lenses` adjustment only. Other fields are immutable.
 */
export const TOPOLOGY_CATALOG: Record<TopologyId, TopologyMetadata> = {
  "cc-teams-lens-agent-deliberation": {
    id: "cc-teams-lens-agent-deliberation",
    teamlead_location: "claude-teamcreate",
    lens_spawn_mechanism: "claude-teamcreate-member",
    max_concurrent_lenses: 10,
    transport_rank: "S2",
    deliberation_channel: "sendmessage-a2a",
  },
  "cc-teams-agent-subagent": {
    id: "cc-teams-agent-subagent",
    teamlead_location: "claude-teamcreate",
    lens_spawn_mechanism: "claude-agent-tool",
    max_concurrent_lenses: 10,
    transport_rank: "S2",
    deliberation_channel: "synthesizer-only",
  },
  "cc-teams-codex-subprocess": {
    id: "cc-teams-codex-subprocess",
    teamlead_location: "claude-teamcreate",
    lens_spawn_mechanism: "codex-subprocess",
    max_concurrent_lenses: 5,
    transport_rank: "S0",
    deliberation_channel: "synthesizer-only",
  },
  "cc-main-agent-subagent": {
    id: "cc-main-agent-subagent",
    teamlead_location: "onto-main",
    lens_spawn_mechanism: "claude-agent-tool",
    max_concurrent_lenses: 10,
    transport_rank: "S2",
    deliberation_channel: "synthesizer-only",
  },
  "cc-main-codex-subprocess": {
    id: "cc-main-codex-subprocess",
    teamlead_location: "onto-main",
    lens_spawn_mechanism: "codex-subprocess",
    max_concurrent_lenses: 5,
    transport_rank: "S0",
    deliberation_channel: "synthesizer-only",
  },
  "cc-teams-litellm-sessions": {
    id: "cc-teams-litellm-sessions",
    teamlead_location: "claude-teamcreate",
    lens_spawn_mechanism: "litellm-http",
    max_concurrent_lenses: 1,
    transport_rank: "S1",
    deliberation_channel: "synthesizer-only",
  },
  "codex-nested-subprocess": {
    id: "codex-nested-subprocess",
    teamlead_location: "codex-subprocess",
    lens_spawn_mechanism: "codex-subprocess",
    max_concurrent_lenses: 5,
    transport_rank: "S0",
    deliberation_channel: "synthesizer-only",
  },
  "codex-main-subprocess": {
    id: "codex-main-subprocess",
    teamlead_location: "onto-main",
    lens_spawn_mechanism: "codex-subprocess",
    max_concurrent_lenses: 5,
    transport_rank: "S0",
    deliberation_channel: "synthesizer-only",
  },
  "generic-nested-subagent": {
    id: "generic-nested-subagent",
    teamlead_location: "generic-subagent",
    lens_spawn_mechanism: "generic-subagent",
    max_concurrent_lenses: 1,
    transport_rank: "S2",
    deliberation_channel: "synthesizer-only",
  },
  "generic-main-subagent": {
    id: "generic-main-subagent",
    teamlead_location: "onto-main",
    lens_spawn_mechanism: "generic-subagent",
    max_concurrent_lenses: 1,
    transport_rank: "S2",
    deliberation_channel: "synthesizer-only",
  },
};

/**
 * Built-in priority walked when `config.execution_topology_priority` is unset.
 *
 * Ordering rationale (sketch v3 §3 + handoff §2.5):
 *   1. 1-0 deliberation — strongest lens-independence safeguard (opt-in heavy)
 *   2. 1-1 teams+agent  — Claude-native, no codex dep
 *   3. 1-2 teams+codex  — mixed model flexibility
 *   4. 2-1 main+agent   — simplest CC path (broadest compatibility)
 *   5. 2-2 main+codex   — CC + codex lens
 *   6. 3-1 teams+litellm — local model path
 *   7. codex-A nested   — host-agnostic codex full stack
 *   8. codex-B main     — codex host path
 *   9, 10: generic-*    — reserved for future host adapters
 */
export const DEFAULT_TOPOLOGY_PRIORITY: TopologyId[] = [
  "cc-teams-lens-agent-deliberation",
  "cc-teams-agent-subagent",
  "cc-teams-codex-subprocess",
  "cc-main-agent-subagent",
  "cc-main-codex-subprocess",
  "cc-teams-litellm-sessions",
  "codex-nested-subprocess",
  "codex-main-subprocess",
  "generic-nested-subagent",
  "generic-main-subagent",
];

/**
 * Topology ids whose spawn path is implemented as of PR-A (2026-04-18).
 *
 * The remaining 7 options are registered in `TOPOLOGY_CATALOG` and
 * resolvable, but attempting to spawn a review unit against them in PR-A
 * will throw. Subsequent PRs (B/C/D) register spawn paths progressively.
 *
 * Callers that accept any resolved topology must check membership in this
 * set before dispatching to executors.
 */
export const PR_A_SUPPORTED_TOPOLOGIES: ReadonlySet<TopologyId> = new Set<TopologyId>([
  "cc-main-agent-subagent",
  "cc-main-codex-subprocess",
  "codex-main-subprocess",
]);

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

/**
 * Emit a `[topology]` prefixed decision line to STDERR.
 *
 * Parallels the `[plan]`, `[provider-ladder]`, `[model-call]`,
 * `[plan:executor]` prefixes already in use. `[topology]` sits at the top
 * of the layer stack: a reviewer scanning STDERR sees `[topology]` first
 * (macro decision) then `[plan]` (projection details) then `[model-call]`
 * (per-request invocation).
 *
 * No suppressor env var: topology decisions are load-bearing for review
 * reproducibility. Tests capture via `vi.spyOn(process.stderr, "write")`.
 */
function emitTopologyLog(line: string): void {
  process.stderr.write(`[topology] ${line}\n`);
}

// ---------------------------------------------------------------------------
// Per-topology requirement checks
// ---------------------------------------------------------------------------

interface DetectionSignals {
  claudeHost: boolean;
  experimentalAgentTeams: boolean;
  lensAgentTeamsMode: boolean;
  codexAvailable: boolean;
  codexSessionActive: boolean;
  liteLlmEndpointAvailable: boolean;
  genericNestedSpawnSupported: boolean;
}

interface RequirementCheckResult {
  ok: boolean;
  /** Human-readable reason when ok === false, used for `[topology] skip` logs. */
  reason: string;
}

/**
 * Evaluate whether the given topology id's prerequisites are satisfied by
 * the current detection signals. Returns a `{ ok, reason }` pair: `reason`
 * is populated for both branches so trace output explains matches AND skips.
 */
function checkTopologyRequirements(
  id: TopologyId,
  signals: DetectionSignals,
): RequirementCheckResult {
  switch (id) {
    case "cc-teams-lens-agent-deliberation": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      if (!signals.experimentalAgentTeams) {
        return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
      }
      if (!signals.lensAgentTeamsMode) {
        return { ok: false, reason: "need config.lens_agent_teams_mode=true" };
      }
      return { ok: true, reason: "CLAUDECODE + experimental-teams + lens_agent_teams_mode all set" };
    }
    case "cc-teams-agent-subagent": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      if (!signals.experimentalAgentTeams) {
        return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
      }
      return { ok: true, reason: "CLAUDECODE + experimental-teams set" };
    }
    case "cc-teams-codex-subprocess": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      if (!signals.experimentalAgentTeams) {
        return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
      }
      if (!signals.codexAvailable) {
        return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
      }
      return { ok: true, reason: "CLAUDECODE + experimental-teams + codex binary all set" };
    }
    case "cc-main-agent-subagent": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      return { ok: true, reason: "CLAUDECODE=1 detected" };
    }
    case "cc-main-codex-subprocess": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      if (!signals.codexAvailable) {
        return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
      }
      return { ok: true, reason: "CLAUDECODE + codex binary both present" };
    }
    case "cc-teams-litellm-sessions": {
      if (!signals.claudeHost) return { ok: false, reason: "need CLAUDECODE=1" };
      if (!signals.experimentalAgentTeams) {
        return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
      }
      if (!signals.liteLlmEndpointAvailable) {
        return { ok: false, reason: "need LITELLM_BASE_URL or config.llm_base_url" };
      }
      return { ok: true, reason: "CLAUDECODE + experimental-teams + LiteLLM endpoint all set" };
    }
    case "codex-nested-subprocess": {
      if (!signals.codexAvailable) {
        return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
      }
      return { ok: true, reason: "codex binary present (host-agnostic)" };
    }
    case "codex-main-subprocess": {
      if (!signals.codexSessionActive) {
        return { ok: false, reason: "need Codex CLI session signal (CODEX_THREAD_ID / CODEX_CI)" };
      }
      if (!signals.codexAvailable) {
        return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
      }
      return { ok: true, reason: "codex session + codex binary both present" };
    }
    case "generic-nested-subagent": {
      if (!signals.genericNestedSpawnSupported) {
        return { ok: false, reason: "need config.generic_nested_spawn_supported=true" };
      }
      return { ok: true, reason: "generic_nested_spawn_supported=true" };
    }
    case "generic-main-subagent": {
      // Future: would require a host adapter declaration. For PR-A, no
      // concrete precondition is specified (sketch v3 §3 TBD). We mark it
      // as unreachable so it never auto-matches — principals must set
      // `execution_topology_priority` explicitly AND declare the relevant
      // generic signal once that adapter lands.
      return { ok: false, reason: "generic host adapter not implemented (reserved)" };
    }
  }
}

// ---------------------------------------------------------------------------
// Priority + overrides resolution
// ---------------------------------------------------------------------------

/**
 * Validate a principal-provided priority array. Silently drops unknown ids
 * (with a `[topology]` warn log) and deduplicates while preserving order.
 *
 * Unknown ids would be the most common misconfiguration (typos like
 * `cc-main-codex` instead of `cc-main-codex-subprocess`). Skipping them
 * prevents breakage; the warning makes the typo visible without aborting.
 */
function normalizePriorityArray(
  raw: string[] | undefined,
  log: (line: string) => void,
): TopologyId[] {
  if (!raw || raw.length === 0) return [...DEFAULT_TOPOLOGY_PRIORITY];
  const seen = new Set<TopologyId>();
  const out: TopologyId[] = [];
  for (const entry of raw) {
    if (!(entry in TOPOLOGY_CATALOG)) {
      log(`priority: ignoring unknown topology id "${entry}"`);
      continue;
    }
    const id = entry as TopologyId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    log("priority: principal array had no valid ids → falling back to default priority");
    return [...DEFAULT_TOPOLOGY_PRIORITY];
  }
  return out;
}

/**
 * Apply `execution_topology_overrides.<id>.max_concurrent_lenses` on top of
 * the catalog default. Other fields are immutable (see catalog JSDoc).
 */
function applyOverrides(
  metadata: TopologyMetadata,
  overrides: OntoConfig["execution_topology_overrides"],
): TopologyMetadata {
  const per = overrides?.[metadata.id];
  if (!per) return metadata;
  if (typeof per.max_concurrent_lenses === "number" && per.max_concurrent_lenses > 0) {
    return { ...metadata, max_concurrent_lenses: per.max_concurrent_lenses };
  }
  return metadata;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Walk the execution topology priority ladder and return the first option
 * whose prerequisites are satisfied.
 *
 * Priority source:
 *   1. `args.ontoConfig.execution_topology_priority` (principal override)
 *   2. `DEFAULT_TOPOLOGY_PRIORITY` (built-in)
 *
 * For each id in the ordered array, `checkTopologyRequirements` evaluates
 * signals. First match wins. Every check emits a `[topology]` trace line
 * (both matches and skips), so operators can reconstruct the ladder walk
 * from STDERR alone.
 *
 * Returns:
 *   - `{ type: "resolved", topology }` — first matching topology.
 *   - `{ type: "no_host", ..., reason }` — no id met its requirements.
 */
export function resolveExecutionTopology(
  args: ResolveExecutionTopologyArgs,
): ExecutionTopologyResolution {
  const env = args.env ?? process.env;
  const trace: string[] = [];
  const log = (line: string): void => {
    emitTopologyLog(line);
    trace.push(line);
  };

  const signals: DetectionSignals = {
    claudeHost: args.claudeHost ?? detectClaudeCodeEnvSignal(),
    experimentalAgentTeams:
      args.experimentalAgentTeams ?? env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1",
    lensAgentTeamsMode: args.ontoConfig.lens_agent_teams_mode === true,
    codexAvailable: args.codexAvailable ?? detectCodexBinaryAvailable(),
    codexSessionActive: args.codexSessionActive ?? detectCodexEnvSignal(),
    liteLlmEndpointAvailable:
      args.liteLlmEndpointAvailable ??
      (Boolean(args.ontoConfig.llm_base_url) || detectLiteLlmEndpoint()),
    genericNestedSpawnSupported: args.ontoConfig.generic_nested_spawn_supported === true,
  };

  log(
    `signals: claudeHost=${signals.claudeHost} experimental=${signals.experimentalAgentTeams} ` +
      `lens_agent_teams_mode=${signals.lensAgentTeamsMode} codex=${signals.codexAvailable} ` +
      `codex_session=${signals.codexSessionActive} litellm=${signals.liteLlmEndpointAvailable} ` +
      `generic_nested=${signals.genericNestedSpawnSupported}`,
  );

  // ---- P2 axis-first branching (Review UX Redesign) -------------------
  // When `config.review` is present, user has opted into the new axis
  // schema. Derive shape → map to TopologyId → verify detection, emit a
  // single-entry priority. If any step fails we fall back to the legacy
  // priority ladder so operators who added a `review:` block but whose
  // environment changed still get a running review (universal fallback
  // semantics are strengthened in P3).
  const axisFirstId = resolveAxisFirstTopology(args.ontoConfig, signals, log);

  const priority = axisFirstId
    ? [axisFirstId]
    : normalizePriorityArray(args.ontoConfig.execution_topology_priority, log);
  const prioritySource = axisFirstId
    ? "review-axes"
    : args.ontoConfig.execution_topology_priority
      ? "config"
      : "default";
  log(`priority source=${prioritySource} order=[${priority.join(", ")}]`);

  for (const id of priority) {
    const check = checkTopologyRequirements(id, signals);
    if (!check.ok) {
      log(`${id}: skip — ${check.reason}`);
      continue;
    }
    log(`${id}: matched — ${check.reason}`);
    const metadata = applyOverrides(TOPOLOGY_CATALOG[id], args.ontoConfig.execution_topology_overrides);
    const override = args.ontoConfig.execution_topology_overrides?.[id];
    if (override?.max_concurrent_lenses && override.max_concurrent_lenses !== TOPOLOGY_CATALOG[id].max_concurrent_lenses) {
      log(
        `${id}: override max_concurrent_lenses ${TOPOLOGY_CATALOG[id].max_concurrent_lenses} → ${override.max_concurrent_lenses}`,
      );
    }
    return {
      type: "resolved",
      topology: { ...metadata, plan_trace: trace },
    };
  }

  log("no topology matched priority ladder");
  return {
    type: "no_host",
    plan_trace: trace,
    reason: buildNoTopologyReason(signals, priority),
  };
}

// ---------------------------------------------------------------------------
// Error message composition
// ---------------------------------------------------------------------------

function buildNoTopologyReason(
  signals: DetectionSignals,
  priority: TopologyId[],
): string {
  const lines: string[] = [];
  lines.push("Execution topology ladder 에서 일치하는 옵션이 없습니다.");
  lines.push("");
  lines.push("현재 환경 시그널:");
  lines.push(`  - Claude Code 세션 (CLAUDECODE=1):              ${signals.claudeHost}`);
  lines.push(`  - Experimental Agent Teams:                     ${signals.experimentalAgentTeams}`);
  lines.push(`  - Lens Agent Teams mode (config):               ${signals.lensAgentTeamsMode}`);
  lines.push(`  - Codex 바이너리 + ~/.codex/auth.json:          ${signals.codexAvailable}`);
  lines.push(`  - Codex CLI 세션 (CODEX_THREAD_ID / CODEX_CI):  ${signals.codexSessionActive}`);
  lines.push(`  - LiteLLM endpoint (config/env):                ${signals.liteLlmEndpointAvailable}`);
  lines.push(`  - Generic nested spawn (config):                ${signals.genericNestedSpawnSupported}`);
  lines.push("");
  lines.push(`검토한 priority: [${priority.join(", ")}]`);
  lines.push("");
  lines.push("해결 방법 (한 가지 선택):");
  lines.push("  1. Claude Code 세션에서 `onto review` 재실행 (CLAUDECODE=1 자동 감지)");
  lines.push("  2. codex CLI 설치 + `codex login` 으로 ~/.codex/auth.json 구성");
  lines.push("  3. `.onto/config.yml` 에 `execution_topology_priority: [옵션 ID]` 명시");
  lines.push(
    "     (옵션 ID: cc-teams-lens-agent-deliberation, cc-teams-agent-subagent, " +
      "cc-teams-codex-subprocess, cc-main-agent-subagent, cc-main-codex-subprocess, " +
      "cc-teams-litellm-sessions, codex-nested-subprocess, codex-main-subprocess, " +
      "generic-nested-subagent, generic-main-subagent)",
  );
  lines.push(
    "  4. LiteLLM 프록시 사용 시 `llm_base_url` 또는 `LITELLM_BASE_URL` 설정",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Spawn-time support check (PR-A scope)
// ---------------------------------------------------------------------------

/**
 * Error thrown when a resolver picks an option PR-A cannot spawn yet.
 *
 * The resolver itself never throws — it always returns a resolution.
 * Callers dispatching to executors call `assertSupportedInPrA(topology)`
 * before attempting to spawn; subsequent PRs extend the supported set.
 */
export class UnsupportedTopologyError extends Error {
  constructor(public readonly topologyId: TopologyId) {
    super(buildUnsupportedTopologyMessage(topologyId));
    this.name = "UnsupportedTopologyError";
  }
}

function buildUnsupportedTopologyMessage(id: TopologyId): string {
  const supported = [...PR_A_SUPPORTED_TOPOLOGIES].join(", ");
  const landingPr =
    id === "cc-teams-agent-subagent" ||
    id === "cc-teams-codex-subprocess" ||
    id === "cc-teams-litellm-sessions"
      ? "PR-B"
      : id === "codex-nested-subprocess"
        ? "PR-C"
        : id === "cc-teams-lens-agent-deliberation"
          ? "PR-D"
          : "후속 PR (generic-* adapter 설계 선행 필요)";
  return [
    `ExecutionTopology id="${id}" 는 현 설치에서 아직 구현되지 않았습니다 (${landingPr} 에서 제공 예정).`,
    "execution_topology_priority 배열에서 다음 중 하나로 fallback 하거나 순서를 조정하세요:",
    ...[...PR_A_SUPPORTED_TOPOLOGIES].map((s) => `  - ${s}`),
    "",
    `PR-A 기준 지원 옵션: ${supported}`,
  ].join("\n");
}

/**
 * Guard used by spawn-time code (PR-B/C/D/E will narrow the "unsupported"
 * set). Throws `UnsupportedTopologyError` when the resolved topology is
 * not yet wired for spawn in the current release.
 */
export function assertSupportedInPrA(topology: ExecutionTopology): void {
  if (!PR_A_SUPPORTED_TOPOLOGIES.has(topology.id)) {
    throw new UnsupportedTopologyError(topology.id);
  }
}

// ---------------------------------------------------------------------------
// P2 axis-first helper (Review UX Redesign)
// ---------------------------------------------------------------------------

/**
 * Attempt to derive a `TopologyId` from the new `review:` axis block.
 *
 * Returns the derived id on full success. Returns `null` (with trace lines
 * logged) when any step fails — validation, shape derivation, or
 * shape→id mapping. Caller treats `null` as "fall back to legacy priority
 * ladder".
 *
 * Three failure modes logged via `[topology]`:
 *   1. `review:` absent — no-op, caller uses legacy path silently.
 *   2. `review:` present but validator rejects — principal mis-configured;
 *      log each validation error and fall back.
 *   3. Derivation or mapping returns `ok=false` — axes valid but
 *      environment or shape/provider combo not mappable; log and fall back.
 *
 * P3 (universal fallback) will replace the "fall back to legacy priority"
 * behavior in case 3 with "fall back to main_native shape forcibly", once
 * the shape → executor wiring for main_native is proven end-to-end.
 */
function resolveAxisFirstTopology(
  config: OntoConfig,
  signals: DetectionSignals,
  log: (line: string) => void,
): TopologyId | null {
  const reviewBlock = config.review;
  if (reviewBlock === undefined) {
    return null;
  }

  const validation = validateReviewConfig(reviewBlock);
  if (!validation.ok) {
    log("review-axes: validation failed — falling back to legacy priority");
    for (const err of validation.errors) {
      log(`review-axes: invalid — ${err.path}: ${err.message}`);
    }
    return null;
  }

  const derivationSignals: ShapeDerivationSignals = {
    claudeHost: signals.claudeHost,
    codexSessionActive: signals.codexSessionActive,
    experimentalAgentTeams: signals.experimentalAgentTeams,
  };
  const derivation = deriveTopologyShape(validation.config, derivationSignals);
  for (const line of derivation.ok ? derivation.derived.trace : derivation.trace) {
    log(`review-axes: ${line}`);
  }
  if (!derivation.ok) {
    log("review-axes: shape derivation failed — falling back to legacy priority");
    for (const reason of derivation.reasons) {
      log(`review-axes: ${reason}`);
    }
    return null;
  }

  const mapping = shapeToTopologyId({
    shape: derivation.derived.shape,
    subagent_provider: derivation.derived.subagent_provider,
    signals: {
      claudeHost: signals.claudeHost,
      codexSessionActive: signals.codexSessionActive,
    },
  });
  for (const line of mapping.trace) {
    log(`review-axes: ${line}`);
  }
  if (!mapping.ok) {
    log("review-axes: shape→TopologyId mapping failed — falling back to legacy priority");
    log(`review-axes: ${mapping.reason}`);
    return null;
  }

  log(`review-axes: derived TopologyId=${mapping.topology_id}`);
  return mapping.topology_id;
}
