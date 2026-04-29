#!/usr/bin/env node

import { execSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { completeReviewSession } from "./complete-review-session.js";
import {
  executeReviewPromptExecution,
  type ReviewUnitExecutorConfig,
} from "./run-review-prompt-execution.js";
import type { PrepareOnlyResult } from "../review/artifact-types.js";
import { startReviewSession } from "./start-review-session.js";
import { spawnWatcherPane } from "./spawn-watcher.js";
import { generateReviewSessionId } from "../review/materializers.js";
import {
  fileExists,
  hasOptionFlag,
  normalizeDomainValue,
  readMultiOptionValuesFromArgv,
  readYamlDocument,
  readSingleOptionValueFromArgv,
} from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import { resolveOntoHome } from "../discovery/onto-home.js";
import { resolveConfigChain, type OntoConfig } from "../discovery/config-chain.js";
import { loadCoreLensRegistry } from "../discovery/lens-registry.js";
import { detectCodexBinaryAvailable } from "../discovery/host-detection.js";
import {
  formatDetectionSignalsJson,
  gatherDetectionSignals,
  readConfigWithParseHealth,
} from "../review/detection-signals.js";
import { resolveExecutionPlan } from "../review/execution-plan-resolver.js";
import {
  resolveExecutionTopology,
  type ExecutionTopology,
} from "../review/execution-topology-resolver.js";
import {
  hasStandaloneLensExecutor,
  mapTopologyToExecutorConfig,
  toCoordinatorTopologyDescriptor,
  type CoordinatorTopologyDescriptor,
} from "./topology-executor-mapping.js";
import { assessComplexity, selectLenses } from "./complexity-assessment.js";

/**
 * Executor realization for review unit execution.
 *
 * - "codex":           codex CLI subprocess (codex-review-unit-executor.ts)
 * - "mock":            in-process deterministic stub (mock-review-unit-executor.ts)
 * - "ts_inline_http":  TS process directly calls LLM HTTP endpoint (Phase 2 of host
 *                      runtime decoupling). Selected automatically when
 *                      OntoConfig.subagent_llm or OntoConfig.external_http_provider is set.
 *                      See `inline-http-review-unit-executor.ts`.
 */
type ExecutorRealization = "codex" | "mock" | "ts_inline_http";
type ReviewTargetScopeKind = "file" | "directory" | "bundle";
type ReviewMode = "core-axis" | "full";
type BoundaryDecisionAction = "approve_external_boundary" | "rerun_target" | "cancel";

// PrepareOnlyResult is imported from artifact-types.ts (canonical type authority)
// OntoConfig is imported from discovery/config-chain.ts (single source of truth)

interface HostFacingPositionals {
  target?: string;
  requestedDomainToken?: string;
  intentText?: string;
}

interface ResolvedReviewInvokeInputs {
  requestedTarget: string;
  targetPath: string;
  resolvedTargetRefs: string[];
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind:
    | "single_text"
    | "directory_listing"
    | "bundle_member_texts";
  requestText: string;
  requestedDomainToken: string;
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
  bundleKind?: string;
  reviewMode: ReviewMode;
  reviewModeRecommendation: ReviewMode;
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
  filesystemAllowedRoots: string[];
}

interface ReviewInvokeRouteSummary {
  combined_entrypoint: "review:invoke";
  bounded_invoke_steps: string[];
  execution_realization: "subagent" | "agent-teams" | "ts_inline_http";
  host_runtime: "codex" | "claude" | "standalone" | "litellm" | "anthropic" | "openai";
  review_mode: ReviewMode;
  max_concurrent_lenses: number;
  concurrency_strategy: "bounded_parallel";
  synthesize_waits_for_all_lenses: true;
}

// Lens IDs derived from .onto/authority/core-lens-registry.yaml (single source of truth)
const _registry = loadCoreLensRegistry();
const FULL_REVIEW_LENS_IDS = _registry.full_review_lens_ids;
const CORE_AXIS_LENS_IDS = _registry.core_axis_lens_ids;

const KNOWN_PASSTHROUGH_OPTION_NAMES = [
  "project-root",
  "onto-home",
  "plugin-root",
  "session-id",
  "requested-target",
  "requested-domain-token",
  "entrypoint",
  "target-scope-kind",
  "primary-ref",
  "member-ref",
  "bundle-kind",
  "intent-summary",
  "domain-recommendation",
  "domain-selection-required",
  "review-mode-recommendation",
  "always-include-lens-id",
  "recommended-lens-id",
  "rationale",
  "ambiguity-note",
  "resolved-target-ref",
  "domain-final-value",
  "domain-selection-mode",
  "review-mode",
  "lens-id",
  "binding-note",
  "web-research-policy",
  "repo-exploration-policy",
  "recursive-reference-expansion-policy",
  "filesystem-allowed-root",
  "materialized-kind",
  "materialized-ref",
  "system-purpose-ref",
  "domain-context-ref",
  "learning-context-ref",
  "role-definition-ref",
  "execution-rule-ref",
  "excluded-name",
  "max-listing-depth",
  "max-listing-entries",
  "max-embed-lines",
] as const;

const KNOWN_PASSTHROUGH_FLAG_NAMES = ["codex"] as const;

const KNOWN_INVOKE_ONLY_OPTION_NAMES = [
  "request-text",
  "executor-realization",
  "executor-bin",
  "executor-arg",
  "synthesize-executor-realization",
  "synthesize-executor-bin",
  "synthesize-executor-arg",
  "max-concurrent-lenses",
  "filesystem-boundary-decision",
  "diff-range",
  "model",
  "reasoning-effort",
  "domain",
] as const;

const KNOWN_INVOKE_ONLY_FLAG_NAMES = [
  "codex",
  "prepare-only",
  "no-watch",
  "no-domain",
  "emit-detection-signals",
] as const;

function requireString(
  value: string | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function packageManagerBin(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

// Single source for executor script names. Used by both npm-run and direct-path resolution.
const EXECUTOR_SCRIPT_FILENAMES: Record<ExecutorRealization, string> = {
  codex: "codex-review-unit-executor",
  mock: "mock-review-unit-executor",
  ts_inline_http: "inline-http-review-unit-executor",
};

const EXECUTOR_NPM_SCRIPTS: Record<ExecutorRealization, string> = {
  codex: "review:codex-unit-executor",
  mock: "review:mock-unit-executor",
  ts_inline_http: "review:inline-http-unit-executor",
};

function resolveExecutorScript(realization: ExecutorRealization): string {
  return EXECUTOR_NPM_SCRIPTS[realization] ?? "review:mock-unit-executor";
}

function resolveDirectExecutorPath(
  realization: ExecutorRealization,
  ontoHome: string,
): { bin: string; scriptPath: string } | null {
  const filename = EXECUTOR_SCRIPT_FILENAMES[realization];
  if (!filename) return null;

  // Prefer compiled dist/ if available
  const distPath = path.join(
    ontoHome, "dist", "core-runtime", "cli", `${filename}.js`,
  );
  const srcPath = path.join(
    ontoHome, "src", "core-runtime", "cli", `${filename}.ts`,
  );

  if (fsSync.existsSync(distPath)) {
    // Dev-workflow guard: when src/ has been edited since dist/ was compiled,
    // the dist binary ships stale behaviour that silently overrides source
    // changes. Warn on STDERR so editors of review-invoke / executor code
    // notice the divergence immediately. Non-fatal — the dist is still used
    // because installed deployments have no src/ and we cannot distinguish
    // "dev repo with stale dist" from "installed package" purely from mtime.
    try {
      if (fsSync.existsSync(srcPath)) {
        const distStat = fsSync.statSync(distPath);
        const srcStat = fsSync.statSync(srcPath);
        if (srcStat.mtimeMs > distStat.mtimeMs) {
          process.stderr.write(
            `[onto] WARNING: dist/${filename}.js is older than src/${filename}.ts. ` +
              `Using the compiled version, which may not reflect your recent edits. ` +
              `Rebuild (npm run build) or move dist/ aside to force the src/tsx path.\n`,
          );
        }
      }
    } catch {
      // stat failure is non-fatal; fall through to the dist path.
    }
    return { bin: "node", scriptPath: distPath };
  }

  // Dev mode: use tsx with source
  const tsxBin = path.join(ontoHome, "node_modules", ".bin", "tsx");
  if (fsSync.existsSync(srcPath) && fsSync.existsSync(tsxBin)) {
    return { bin: tsxBin, scriptPath: srcPath };
  }

  return null;
}

function buildExecutorConfigFromRealization(
  realization: ExecutorRealization,
  ontoHome?: string,
): ReviewUnitExecutorConfig {
  // When ontoHome is available, use direct script paths (global CLI path)
  if (typeof ontoHome === "string" && ontoHome.length > 0) {
    const direct = resolveDirectExecutorPath(realization, ontoHome);
    if (direct) {
      // No "--" separator for direct invocation. The "--" is only needed
      // for npm run (to separate npm args from script args). With direct
      // tsx/node invocation, "--" would be interpreted by parseArgs as
      // end-of-options, causing all subsequent args to be treated as
      // positional — triggering "Unexpected argument" errors.
      return { bin: direct.bin, args: [direct.scriptPath] };
    }
  }

  // Legacy npm run fallback (when invoked via npm run from onto repo)
  return {
    bin: packageManagerBin(),
    args: ["run", resolveExecutorScript(realization), "--"],
  };
}

function stripOptionsFromArgv(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): string[] {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const stripped: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (flagTokens.has(token)) {
      continue;
    }
    if (!optionTokens.has(token)) {
      stripped.push(token);
      continue;
    }

    const nextToken = argv[index + 1];
    if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
      index += 1;
    }
  }

  return stripped;
}

function splitArgvIntoOptionsAndPositionals(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): {
  optionTokens: string[];
  positionals: string[];
} {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const preservedOptions: string[] = [];
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (token === "--") {
      continue;
    }
    if (flagTokens.has(token)) {
      preservedOptions.push(token);
      continue;
    }
    if (optionTokens.has(token)) {
      preservedOptions.push(token);
      const nextToken = argv[index + 1];
      if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
        preservedOptions.push(nextToken);
        index += 1;
      }
      continue;
    }
    positionals.push(token);
  }

  return {
    optionTokens: preservedOptions,
    positionals,
  };
}

function ensureSessionIdArg(argv: string[]): string[] {
  const sessionId = readSingleOptionValueFromArgv(argv, "session-id");
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return argv;
  }
  return [...argv, "--session-id", generateReviewSessionId()];
}

function appendExecutorModelArgs(
  config: ReviewUnitExecutorConfig,
  argv: string[],
  ontoConfig?: OntoConfig,
): ReviewUnitExecutorConfig {
  // Mock executor does not accept --model/--reasoning-effort flags.
  // Skip model/effort args when the executor targets the mock script.
  // Note: with the direct-executor path strategy, bin is "node" / "tsx" and
  // the mock filename lives in args[0] (the script path), so we have to
  // probe both fields.
  const isMock =
    config.bin.includes("mock-review-unit-executor") ||
    config.args.some((arg) => arg.includes("mock-review-unit-executor"));
  if (isMock) return config;

  const args = [...config.args];
  // Resolution: CLI flag > top-level config > codex namespace (fallback for codex mode)
  const model =
    readSingleOptionValueFromArgv(argv, "model") ??
    ontoConfig?.model ??
    ontoConfig?.codex?.model;
  if (typeof model === "string" && model.length > 0) {
    args.push("--model", model);
  }
  const reasoningEffort =
    readSingleOptionValueFromArgv(argv, "reasoning-effort") ??
    ontoConfig?.reasoning_effort ??
    ontoConfig?.codex?.effort;
  if (typeof reasoningEffort === "string" && reasoningEffort.length > 0) {
    args.push("--reasoning-effort", reasoningEffort);
  }
  return { bin: config.bin, args };
}

/**
 * Phase 2 wiring: append subagent_llm config fields as inline-http executor
 * CLI flags. Called when the auto-selection logic picks ts_inline_http based
 * on subagent_llm config or standalone host detection.
 *
 * Translates OntoConfig.subagent_llm → inline-http executor flags:
 *   subagent_llm.provider → --provider
 *   subagent_llm.model → --model
 *   subagent_llm.base_url → --llm-base-url
 *   subagent_llm.max_tokens → --max-tokens
 *   subagent_llm.embed_domain_docs → --embed-domain-docs
 *
 * Falls back to top-level `external_http_provider` / `model` / `llm_base_url`
 * when `subagent_llm` fields are unset — so a user with
 * `external_http_provider: litellm; litellm: { model: llama-8b }` (no
 * subagent_llm block) still gets a working executor.
 */
function appendSubagentLlmArgs(
  config: ReviewUnitExecutorConfig,
  ontoConfig?: OntoConfig,
): ReviewUnitExecutorConfig {
  const args = [...config.args];
  const sub = ontoConfig?.subagent_llm;

  const provider = sub?.provider ?? ontoConfig?.external_http_provider;
  if (typeof provider === "string" && provider.length > 0) {
    args.push("--provider", provider);
  }

  const model = sub?.model ?? ontoConfig?.model;
  if (typeof model === "string" && model.length > 0) {
    args.push("--model", model);
  }

  const baseUrl = sub?.base_url ?? ontoConfig?.llm_base_url;
  if (typeof baseUrl === "string" && baseUrl.length > 0) {
    args.push("--llm-base-url", baseUrl);
  }

  const maxTokens = sub?.max_tokens;
  if (typeof maxTokens === "number" && maxTokens > 0) {
    args.push("--max-tokens", String(maxTokens));
  }

  if (sub?.embed_domain_docs === true) {
    args.push("--embed-domain-docs");
  }

  const toolMode = (sub as { tool_mode?: unknown })?.tool_mode;
  if (typeof toolMode === "string" && toolMode.length > 0) {
    args.push("--tool-mode", toolMode);
  }

  return { bin: config.bin, args };
}

// ---------------------------------------------------------------------------
// Execution realization auto-resolution (stay-in-host)
//
// Decides whether `onto review` should run the codex CLI path itself or hand
// off to the Claude host via `onto coordinator start`. Three inputs matter:
//
//   - explicit CLI `--codex` flag                        → self (codex path)
//   - env ONTO_HOST_RUNTIME override                     → explicit override
//   - auto detection (CLAUDECODE=1 / codex on PATH /
//       external_http_provider / subagent_llm)            → stay-in-host
//
// Review UX Redesign seat is the `review:` axis block (see
// `review/execution-topology-resolver.ts`); this ladder is the fallback
// path used when the resolver cannot map to a canonical TopologyId.
//
// Priority rank between hosts is NOT hardcoded here — user situation varies
// (subscription mix, context headroom, local hardware). Default policy prefers
// the current host ecosystem; cross-host switches require explicit opt-in.
// Design: development-records/plan/20260415T1700-execution-realization-priority-design.md
// Authority: .onto/authority/core-lexicon.yaml:LlmAgentSpawnRealization
// ---------------------------------------------------------------------------

export interface ResolvedExecutionProfile {
  execution_realization: "subagent" | "agent-teams" | "ts_inline_http";
  host_runtime: "codex" | "claude" | "standalone" | "litellm" | "anthropic" | "openai";
}

export type ExecutionProfileResolution =
  | { type: "resolved"; profile: ResolvedExecutionProfile }
  | { type: "no_host" };

export type ExecutionRealizationHandoff =
  | { type: "self"; profile: ResolvedExecutionProfile }
  | { type: "coordinator_start"; profile: ResolvedExecutionProfile }
  | { type: "no_host" };

/**
 * Legacy boolean predicate. Returns true when host is detected as Claude Code.
 *
 * NOTE: signal set differs from upstream `isClaudeCodeHost()` — this preserves
 * the legacy "CLAUDECODE === '1'" check exclusively, because some review
 * call-sites rely on the narrower signal (CLAUDECODE alone) to decide whether
 * to emit a coordinator-start handoff JSON. Broadening this to all 3 Claude
 * env signals would change auto-resolution behavior for users who set
 * CLAUDE_PROJECT_DIR without the rest. See `discovery/host-detection.ts`
 * for the full multi-signal `isClaudeCodeHost()` and capability matrix.
 */
export function detectClaudeCodeHost(): boolean {
  return process.env.CLAUDECODE === "1";
}

/**
 * Legacy boolean predicate. Returns true when codex binary + auth.json are
 * both present. Wraps the canonical seat in `discovery/host-detection.ts`.
 */
export function detectCodexAvailable(): boolean {
  return detectCodexBinaryAvailable();
}

/**
 * Resolves the (execution_realization, host_runtime) profile.
 *
 * As of Review Recovery PR-1 (2026-04-18) this function is a thin adapter
 * over `resolveExecutionPlan` in `src/core-runtime/review/execution-plan-resolver.ts`
 * — the unified resolver that also governs provider identity, retry policy,
 * and emits `[plan]` observability. The adapter preserves this legacy public
 * API so existing call-sites (coordinator-state-machine, session artifact
 * writers, the review-invoke-auto-resolution test suite) keep working while
 * the ts_inline_http / standalone host_runtime mapping is normalized.
 *
 * Semantic normalization: when the unified plan selects an external HTTP
 * path (separation_rank=S1), it sets host_runtime to the concrete provider
 * (anthropic / openai / litellm). For the historical case where the user
 * wrote `host_runtime: standalone` (or left it unset with subagent_llm
 * configured and no external_http_provider), legacy callers expect the
 * `standalone` token — we detect that case here and project it back.
 */
export function resolveExecutionProfile(args: {
  explicitCodex: boolean;
  ontoConfig: OntoConfig;
}): ExecutionProfileResolution {
  const resolution = resolveExecutionPlan({
    explicitCodex: args.explicitCodex,
    ontoConfig: args.ontoConfig,
  });
  if (resolution.type === "no_host") {
    return { type: "no_host" };
  }
  const plan = resolution.plan;

  // Legacy ts_inline_http surface exposes `standalone` when auto-detection
  // landed on external-HTTP with no concrete provider name in config (env
  // ONTO_HOST_RUNTIME=standalone or no external_http_provider). The unified
  // plan always names the concrete provider when it can; reverse the mapping
  // for backward compatibility with the session-artifact schema.
  let host_runtime: ResolvedExecutionProfile["host_runtime"] =
    plan.host_runtime === "mock" ? "standalone" : plan.host_runtime;
  if (plan.execution_realization === "ts_inline_http") {
    const envHost = process.env.ONTO_HOST_RUNTIME?.trim().toLowerCase();
    if (
      envHost === "standalone" ||
      (envHost === undefined && !args.ontoConfig.external_http_provider)
    ) {
      host_runtime = "standalone";
    }
  }

  const execution_realization: ResolvedExecutionProfile["execution_realization"] =
    plan.execution_realization === "mock" ? "ts_inline_http" : plan.execution_realization;

  return {
    type: "resolved",
    profile: { execution_realization, host_runtime },
  };
}

/**
 * Wraps resolveExecutionProfile with action decision:
 * - prepareOnly=true + resolved Claude → "self" (coordinator-state-machine is
 *   already calling this internally; don't emit handoff JSON, just record the
 *   profile into session artifacts)
 * - prepareOnly=false + resolved Claude → "coordinator_start" (emit handoff)
 * - resolved codex → "self" (self-execute via codex subprocess)
 * - resolved standalone → "self" (self-execute via ts_inline_http)
 * - no_host → "no_host"
 */
export function resolveExecutionRealizationHandoff(args: {
  explicitCodex: boolean;
  prepareOnly: boolean;
  ontoConfig: OntoConfig;
}): ExecutionRealizationHandoff {
  const profile = resolveExecutionProfile({
    explicitCodex: args.explicitCodex,
    ontoConfig: args.ontoConfig,
  });
  if (profile.type === "no_host") return { type: "no_host" };

  // Claude host: emit handoff unless we're in prepare-only mode (coordinator
  // state machine is already calling us — it needs artifacts prepared, not a
  // handoff JSON written to stdout).
  if (profile.profile.host_runtime === "claude" && !args.prepareOnly) {
    return { type: "coordinator_start", profile: profile.profile };
  }
  return { type: "self", profile: profile.profile };
}

function buildNoHostDetectedError(): Error {
  return new Error(
    [
      "Review execution realization을 해소할 수 없습니다.",
      "현재 host 감지 결과: Claude Code 세션 아님(CLAUDECODE unset), codex CLI 미설치 또는 ~/.codex/auth.json 부재, subagent_llm / external_http_provider 미설정.",
      "",
      "다음 중 한 가지로 해결하세요:",
      "  1. Claude Code 세션에서 `onto review` 재실행 (CLAUDECODE=1 감지 시 coordinator-start 안내)",
      "  2. codex CLI 설치 + `codex login` 후 재실행",
      "  3. `--codex` 플래그로 codex path 강제 (auth·binary 있어야 성공)",
      "  4. `.onto/config.yml` 에 `review:` axis block 추가 (docs/topology-migration-guide.md §7 참고)",
      "  5. `.onto/config.yml` 에 external_http_provider + subagent_llm: { provider, model } 설정 (LiteLLM/Anthropic/OpenAI 직접 호출)",
      "  6. `ONTO_HOST_RUNTIME=standalone` env var + `subagent_llm` config 설정",
    ].join("\n"),
  );
}

/**
 * Resolve a coordinator topology descriptor from OntoConfig for handoff
 * payload inclusion.
 *
 * # Semantics (P9.3, 2026-04-21)
 *
 * Always attempts axis-first resolution. The previous `opt-in` gate
 * (PR-G, initially `execution_topology_priority` — later bridged to
 * `config.review` in P9.2) is removed: because
 * `resolveExecutionTopology` owns a universal `main_native` degrade
 * since Review UX Redesign P3, every review invocation can safely
 * produce a topology, so every coordinator handoff can carry one.
 *
 * Returns `null` only in two terminal cases:
 *   - `ontoConfig` is `undefined` (defensive — callers always pass a
 *     resolved config, but the type allows undefined for test harness
 *     isolation).
 *   - Resolver returns `no_host` (axis + main_native degrade both
 *     failed — typically neither Claude nor Codex host reachable).
 *
 * When the topology resolves, the returned descriptor is the
 * `plan_trace`-stripped subset suitable for JSON transmission
 * (see `toCoordinatorTopologyDescriptor`).
 *
 * Note on `review: {}`: dispatch treats an empty review block the
 * same as an absent one — the resolver's main_native degrade path
 * handles both identically. Post-P9.4 config load no longer throws on
 * empty/absent profiles; post-P9.5 legacy-field detection is also
 * gone. The resolver is the sole authority on "can this review run?".
 */
export function tryResolveTopologyForHandoff(
  ontoConfig: OntoConfig | undefined,
  cached?: ExecutionTopology | null,
): CoordinatorTopologyDescriptor | null {
  if (ontoConfig === undefined) return null;
  // P9.3-m1 (2026-04-21): accept a pre-resolved topology from the caller
  // to avoid re-emitting the `[topology]` STDERR trace for the same
  // invocation. `cached === undefined` preserves legacy single-argument
  // behaviour (test harness compatibility); `cached === null` is the
  // explicit signal that the caller already resolved and got `no_host`.
  if (cached !== undefined) {
    return cached === null ? null : toCoordinatorTopologyDescriptor(cached);
  }
  const resolution = resolveExecutionTopology({ ontoConfig });
  if (resolution.type !== "resolved") return null;
  return toCoordinatorTopologyDescriptor(resolution.topology);
}

function emitCoordinatorStartHandoff(args: {
  preferredRealization: "subagent" | "agent-teams" | "ts_inline_http";
  requestedTarget: string;
  requestText: string;
  topology?: CoordinatorTopologyDescriptor | null;
}): void {
  // Shell-escape: wrap in double quotes and escape embedded double quotes/backslashes.
  const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  // preferred: plan-time recommendation based on onto's resolution policy
  //   (typically agent-teams nested when TeamCreate is expected to be available).
  // actual:    deferred — determined by subject session at TeamCreate attempt time.
  //   onto child process cannot introspect the subject session's capability.
  //   coordinator-state-machine then records the realized path into session
  //   artifacts (binding.yaml / execution-plan.yaml / session-metadata.yaml).
  //
  // P9.3 (2026-04-21): the `topology` field is populated for every
  // review invocation — `tryResolveTopologyForHandoff` always attempts
  // axis-first resolution and the resolver's universal `main_native`
  // degrade keeps a viable topology reachable whenever a Claude or
  // Codex host is present. The coordinator state machine consumes
  // `topology.id` / `topology.teamlead_location` /
  // `topology.lens_spawn_mechanism` as authoritative, replacing the
  // prior preferred_realization heuristic.
  const payload: {
    handoff: "coordinator-start";
    host_runtime: "claude";
    preferred_realization: typeof args.preferredRealization;
    actual_realization: "deferred_to_subject_session";
    requested_target: string;
    request_text: string;
    topology?: CoordinatorTopologyDescriptor;
    next_action: {
      cli: string;
      orchestration_guidance: {
        preferred: string;
        fallback: string;
        recording_note: string;
        topology_note?: string;
      };
    };
  } = {
    handoff: "coordinator-start",
    host_runtime: "claude",
    preferred_realization: args.preferredRealization,
    actual_realization: "deferred_to_subject_session",
    requested_target: args.requestedTarget,
    request_text: args.requestText,
    next_action: {
      cli: `onto coordinator start ${q(args.requestedTarget)} ${q(args.requestText)}`,
      orchestration_guidance: {
        preferred:
          "TeamCreate로 coordinator subagent를 nested spawn, coordinator가 Agent tool로 9 lens + synthesize subagent 추가 nested spawn (canonical path = agent_teams_claude).",
        fallback:
          "TeamCreate 비가용 환경에서는 주체자 세션이 Agent tool로 lens subagent를 직접 spawn 가능 (canonical path = subagent_claude). coordinator state machine은 양쪽 모두 수용.",
        recording_note:
          "주체자가 실제 선택한 realization은 coordinator-state-machine이 session artifact(binding.yaml 등)에 기록. 본 handoff payload의 preferred_realization은 plan-time 권장이지 actual truth가 아님.",
      },
    },
  };
  if (args.topology) {
    payload.topology = args.topology;
    payload.next_action.orchestration_guidance.topology_note =
      `Resolver 가 topology="${args.topology.id}" 를 선택했습니다. ` +
      `세부 도출 경로 (axis-first / main_native degrade) 는 STDERR ` +
      `\`[topology]\` trace 를 참고하세요. ` +
      `teamlead_location="${args.topology.teamlead_location}", ` +
      `lens_spawn_mechanism="${args.topology.lens_spawn_mechanism}", ` +
      `deliberation_channel="${args.topology.deliberation_channel}". ` +
      `preferred/fallback 힌트 대신 이 topology 를 canonical 로 따르세요.`;
  }
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Attempt topology-first executor selection.
 *
 * # Semantics (P9.3, 2026-04-21)
 *
 * Always attempts axis-first resolution — the previous opt-in gate
 * (PR-F initially `execution_topology_priority`, bridged to
 * `config.review` in P9.2) is removed. Because the resolver owns a
 * universal `main_native` degrade since P3, every invocation can
 * safely attempt dispatch; the decision whether a standalone executor
 * binary applies is then made entirely from the resolved topology's
 * spawn mechanism.
 *
 * When the resolved topology has a standalone lens executor binary
 * (codex-subprocess or litellm-http mechanism), the mapping is
 * returned directly; the caller then applies `appendSubagentLlmArgs` /
 * `appendExecutorModelArgs` as usual.
 *
 * Returns `null` — "fall through to coordinator / other dispatch" —
 * in four cases:
 *   1. `ontoConfig` undefined (defensive — tests may inject undefined)
 *   2. `ontoHome` unavailable (required to resolve executor paths)
 *   3. Topology resolver returns `no_host` (neither Claude nor Codex
 *      host reachable — axis + main_native degrade both failed)
 *   4. Topology resolved but its mechanism has no standalone binary
 *      (claude-agent-tool → coordinator handoff is the right seat;
 *       claude-teamcreate-member → PR-D protocol; codex-nested-subprocess
 *       → PR-H dispatch branch)
 *
 * Successful dispatch emits a `[plan:executor]` STDERR line so
 * operators can verify the topology→binary mapping.
 *
 * Note on `review: {}`: same as `tryResolveTopologyForHandoff` —
 * dispatch treats an empty review block identically to an absent one
 * (main_native degrade handles both). Post-P9.5 `hasReviewBlock` is
 * consumed only by `claimsProfileOwnership` inside `config-profile.ts`
 * (the atomic-adoption ownership signal), no longer by any dispatch
 * or legacy-detection gate.
 */
export function tryTopologyDerivedExecutor(
  ontoConfig: OntoConfig | undefined,
  ontoHome: string | undefined,
  cached?: ExecutionTopology | null,
): ReviewUnitExecutorConfig | null {
  if (ontoConfig === undefined) return null;
  if (!ontoHome) return null;
  // P9.3-m1 (2026-04-21): same caching contract as
  // `tryResolveTopologyForHandoff` — `cached === undefined` preserves
  // legacy two-argument behaviour; `cached === null` means caller
  // already resolved and got `no_host`; `cached === ExecutionTopology`
  // reuses the pre-resolved instance without re-running the resolver.
  let topology: ExecutionTopology;
  if (cached !== undefined) {
    if (cached === null) return null;
    topology = cached;
  } else {
    const resolution = resolveExecutionTopology({ ontoConfig });
    if (resolution.type !== "resolved") return null;
    topology = resolution.topology;
  }
  if (!hasStandaloneLensExecutor(topology)) return null;
  try {
    const base = mapTopologyToExecutorConfig(topology, ontoHome, ontoConfig);
    process.stderr.write(
      `[plan:executor] topology=${topology.id} bin=${base.bin} ` +
        `args[0]=${base.args[0] ?? "(none)"}\n`,
    );
    return base;
  } catch {
    return null;
  }
}

function resolveExecutorConfig(
  argv: string[],
  optionPrefix: "" | "synthesize-",
  ontoConfig?: OntoConfig,
  ontoHome?: string,
  cachedTopology?: ExecutionTopology | null,
): ReviewUnitExecutorConfig {
  const optionPrefixLabel = optionPrefix.length > 0 ? optionPrefix : "";
  const explicitBin = readSingleOptionValueFromArgv(
    argv,
    `${optionPrefixLabel}executor-bin`,
  );
  const explicitArgs = readMultiOptionValuesFromArgv(
    argv,
    `${optionPrefixLabel}executor-arg`,
  );
  if (typeof explicitBin === "string" && explicitBin.length > 0) {
    return appendExecutorModelArgs(
      { bin: explicitBin, args: explicitArgs },
      argv,
      ontoConfig,
    );
  }

  // Read the prefixed flag first, then fall back to the non-prefixed flag
  // when running in synthesize mode. The test suite (and most operators)
  // pass `--executor-realization mock` and expect both lens AND synthesize
  // to honor it.
  const explicitRealization =
    readSingleOptionValueFromArgv(argv, `${optionPrefixLabel}executor-realization`) ??
    (optionPrefixLabel.length > 0
      ? readSingleOptionValueFromArgv(argv, "executor-realization")
      : undefined);
  if (explicitRealization === "codex" || explicitRealization === "mock" || explicitRealization === "ts_inline_http") {
    return appendExecutorModelArgs(
      buildExecutorConfigFromRealization(explicitRealization, ontoHome),
      argv,
      ontoConfig,
    );
  }
  if (
    typeof explicitRealization === "string" &&
    explicitRealization.length > 0
  ) {
    throw new Error(
      `Unsupported --${optionPrefixLabel}executor-realization: ${explicitRealization}. ` +
        `Supported values: codex, mock, ts_inline_http. Claude host runs (agent_teams_claude / subagent_claude) are routed via coordinator-start handoff when CLAUDECODE=1 is detected. See .onto/authority/core-lexicon.yaml:LlmAgentSpawnRealization.`,
    );
  }

  // P9.3 (2026-04-21): topology-first dispatch runs for every review
  // invocation — resolver's universal `main_native` degrade guarantees
  // a reachable topology whenever a host is present. Takes the resolved
  // topology over the legacy `executor_realization` field that follows.
  //
  // Only activated when the resolved topology has a standalone binary;
  // other cases fall through to legacy behaviour (see
  // `tryTopologyDerivedExecutor` for the fallthrough rationale). For
  // codex-nested-subprocess + claude-teamcreate-member the caller
  // should branch ABOVE this function (PR-H / PR-D integrations); this
  // resolver stays scoped to subprocess-executor dispatch.
  const topologyDerived = tryTopologyDerivedExecutor(
    ontoConfig,
    ontoHome,
    cachedTopology,
  );
  if (topologyDerived) {
    // Topology's lens_spawn_mechanism="litellm-http" → inline-http
    // executor needs subagent_llm / legacy provider args; codex-
    // subprocess → codex executor needs model/reasoning-effort args.
    // The existing append helpers handle both paths.
    const withSubagent = appendSubagentLlmArgs(topologyDerived, ontoConfig);
    return appendExecutorModelArgs(withSubagent, argv, ontoConfig);
  }

  // Auto-select ts_inline_http executor when the principal has declared
  // an external HTTP provider — either explicitly via external_http_provider,
  // or via subagent_llm.provider for the cross-host subagent pattern.
  // Precedence: this check comes AFTER explicit --executor-realization
  // (CLI flag wins) and topology-first dispatch, so explicit choices always win.
  const subagentLlm = ontoConfig?.subagent_llm;
  const hasExternalProvider =
    (subagentLlm && typeof subagentLlm.provider === "string" && subagentLlm.provider.length > 0) ||
    Boolean(ontoConfig?.external_http_provider);
  if (hasExternalProvider) {
    return appendSubagentLlmArgs(
      buildExecutorConfigFromRealization("ts_inline_http", ontoHome),
      ontoConfig,
    );
  }

  return appendExecutorModelArgs(
    buildExecutorConfigFromRealization("codex", ontoHome),
    argv,
    ontoConfig,
  );
}

async function readOntoConfig(projectRoot: string): Promise<OntoConfig> {
  const configPath = path.join(projectRoot, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return {};
  }
  const raw = await readYamlDocument<Record<string, unknown>>(configPath);
  if (raw === null || typeof raw !== "object") {
    console.warn(`[onto] Warning: ${configPath} is not a valid YAML object. Using defaults.`);
    return {};
  }
  return raw as OntoConfig;
}

function parseHostFacingPositionals(positionals: string[]): HostFacingPositionals {
  if (positionals.length === 0) {
    return {};
  }

  const [target, second, ...rest] = positionals;
  if (typeof target !== "string" || target.length === 0) {
    return {};
  }

  if (typeof second === "string" && second.startsWith("@")) {
    return {
      target,
      requestedDomainToken: second,
      intentText: rest.join(" ").trim(),
    };
  }

  return {
    target,
    intentText: [second, ...rest].filter((value) => typeof value === "string").join(" ").trim(),
  };
}

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  let resolvedCandidate: string;
  let resolvedRoot: string;
  try {
    resolvedCandidate = fsSync.realpathSync(candidatePath);
    resolvedRoot = fsSync.realpathSync(rootPath);
  } catch {
    resolvedCandidate = path.resolve(candidatePath);
    resolvedRoot = path.resolve(rootPath);
  }
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === "") {
    return true;
  }
  if (relative.startsWith("..")) {
    return false;
  }
  return !path.isAbsolute(relative);
}

function normalizeFilesystemAllowedRoot(
  root: string,
  defaultProjectRoot: string,
): string {
  if (path.isAbsolute(root)) {
    return path.resolve(root);
  }
  return path.resolve(defaultProjectRoot, root);
}

function normalizeFilesystemAllowedRoots(
  filesystemAllowedRoots: string[],
  defaultProjectRoot: string,
): string[] {
  const resolved = filesystemAllowedRoots.length > 0
    ? filesystemAllowedRoots.map((root) => normalizeFilesystemAllowedRoot(
      root,
      defaultProjectRoot,
    ))
    : [path.resolve(defaultProjectRoot)];
  const deduped: string[] = [];
  for (const root of resolved) {
    if (!deduped.includes(root)) {
      deduped.push(root);
    }
  }
  return deduped;
}

function isInsideAnyDeclaredFilesystemRoot(
  targetPath: string,
  allowedRoots: string[],
): boolean {
  return allowedRoots.some((allowedRoot) => isPathInsideRoot(targetPath, allowedRoot));
}

function deriveFilesystemBoundaryFromTarget(
  targetPath: string,
  targetScopeKind: ReviewTargetScopeKind,
): string {
  return targetScopeKind === "file"
    ? path.dirname(targetPath)
    : targetPath;
}

async function promptForFilesystemBoundaryDecision(
  requestedTarget: string,
  absoluteTargetPath: string,
  projectRoot: string,
): Promise<{
  action: BoundaryDecisionAction;
}> {
  const promptText = [
    "Requested review target is outside project root.",
    `project-root: ${projectRoot}`,
    `requested target: ${requestedTarget}`,
    `resolved absolute target: ${absoluteTargetPath}`,
    "This target is outside the default filesystem boundary and needs an explicit decision.",
    "1) Continue with this exact target and approve an explicit filesystem boundary.",
    "2) Cancel and rerun using a project-relative target path.",
    "3) Cancel and stop execution.",
    "Enter 1, 2, or 3:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer === "1" || /^(approve|yes|y)$/i.test(answer)) {
        return {
          action: "approve_external_boundary",
        };
      }
      if (answer === "2") {
        return { action: "rerun_target" };
      }
      if (answer === "3" || /^(cancel|no|n)$/i.test(answer)) {
        return { action: "cancel" };
      }
      console.error(`Invalid boundary decision: ${answer}. Enter 1, 2, or 3.`);
    }
  } finally {
    readline.close();
  }
}

function parseFilesystemBoundaryDecision(
  argv: string[],
): BoundaryDecisionAction | undefined {
  const rawDecision = readSingleOptionValueFromArgv(
    argv,
    "filesystem-boundary-decision",
  );
  const decision = typeof rawDecision === "string" ? rawDecision.toLowerCase() : "";
  if (decision === "approve" || decision === "approve_external_boundary") {
    return "approve_external_boundary";
  }
  if (decision === "rerun" || decision === "rerun_target") {
    return "rerun_target";
  }
  if (decision === "cancel") {
    return "cancel";
  }
  if (decision.length > 0) {
    throw new Error(
      `Invalid --filesystem-boundary-decision value: ${rawDecision}. Use approve, rerun, or cancel.`,
    );
  }
  return undefined;
}

function normalizeDomainToken(domainValue: string): string | null {
  const trimmed = domainValue.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (["-", "@-", "none"].includes(trimmed)) {
    return "@-";
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function collectConfiguredDomainTokens(ontoConfig: OntoConfig): string[] {
  const collected: string[] = [];
  const pushToken = (domainValue: string | undefined): void => {
    if (typeof domainValue !== "string") {
      return;
    }
    const normalized = normalizeDomainToken(domainValue);
    if (!normalized || collected.includes(normalized)) {
      return;
    }
    collected.push(normalized);
  };
  const pushTokenList = (domainValues: string[] | string | undefined): void => {
    if (Array.isArray(domainValues)) {
      for (const domainValue of domainValues) {
        pushToken(domainValue);
      }
      return;
    }
    if (typeof domainValues === "string") {
      const splitValues = domainValues.includes(",")
        ? domainValues.split(",")
        : [domainValues];
      for (const domainValue of splitValues) {
        pushToken(domainValue);
      }
    }
  };

  pushToken(ontoConfig.domain);
  pushTokenList(ontoConfig.secondary_domains);
  pushTokenList(ontoConfig.domains);
  return collected;
}

async function promptForDomainSelection(
  configuredDomainTokens: string[],
): Promise<string> {
  const optionTokens = configuredDomainTokens.includes("@-")
    ? [...configuredDomainTokens]
    : [...configuredDomainTokens, "@-"];
  const optionLines = optionTokens.map(
    (domainToken, index) => `${index + 1}. ${domainToken}`,
  );
  const promptText = [
    "Multiple configured domains are available for this review.",
    "Select a domain token for this session:",
    ...optionLines,
    "Enter a number or domain token:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer.length === 0) {
        continue;
      }
      const numericIndex = Number.parseInt(answer, 10);
      if (Number.isFinite(numericIndex)) {
        const selectedToken = optionTokens[numericIndex - 1];
        if (selectedToken) {
          return selectedToken;
        }
      }
      const normalizedAnswer = normalizeDomainToken(answer);
      if (normalizedAnswer && optionTokens.includes(normalizedAnswer)) {
        return normalizedAnswer;
      }
      console.error(
        `Invalid domain selection: ${answer}. Choose one of ${optionTokens.join(", ")}`,
      );
    }
  } finally {
    readline.close();
  }
}

async function resolveDomainSelection(
  requestedDomainToken: string,
  ontoConfig: OntoConfig,
): Promise<{
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
}> {
  if (requestedDomainToken.length > 0) {
    return {
      domainRecommendation: requestedDomainToken,
      domainFinalValue: normalizeDomainValue(requestedDomainToken),
      domainSelectionMode: "explicit_token",
      domainSelectionRequired: false,
    };
  }

  const configuredDomainTokens = collectConfiguredDomainTokens(ontoConfig);
  if (configuredDomainTokens.length === 0) {
    return {
      domainRecommendation: "@-",
      domainFinalValue: "none",
      domainSelectionMode: "no_domain_default",
      domainSelectionRequired: false,
    };
  }

  if (configuredDomainTokens.length === 1) {
    const selectedToken = configuredDomainTokens[0]!;
    return {
      domainRecommendation: selectedToken,
      domainFinalValue: normalizeDomainValue(selectedToken),
      domainSelectionMode: "project_default",
      domainSelectionRequired: false,
    };
  }

  const domainRecommendation = configuredDomainTokens[0]!;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      [
        "Multiple configured domains are available, but interactive domain selection is unavailable in this non-interactive environment.",
        `Configured domains: ${configuredDomainTokens.join(", ")}`,
        "Pass an explicit domain token such as `@ontology` or `@-`.",
      ].join("\n"),
    );
  }

  const selectedToken = await promptForDomainSelection(configuredDomainTokens);
  return {
    domainRecommendation,
    domainFinalValue: normalizeDomainValue(selectedToken),
    domainSelectionMode: "interactive_selection",
    domainSelectionRequired: true,
  };
}

function resolveReviewMode(argv: string[], ontoConfig?: OntoConfig): ReviewMode {
  const explicitValue = readSingleOptionValueFromArgv(argv, "review-mode");
  if (explicitValue === "core-axis" || explicitValue === "full") {
    return explicitValue;
  }
  const configValue = ontoConfig?.review_mode;
  if (configValue === "core-axis" || configValue === "full") {
    return configValue;
  }
  return "full";
}

function resolveLensDefaultsForReviewMode(reviewMode: ReviewMode): {
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
} {
  if (reviewMode === "core-axis") {
    return {
      resolvedLensIds: [...CORE_AXIS_LENS_IDS],
      alwaysIncludeLensIds: [..._registry.always_include_lens_ids],
      recommendedLensIds: [...CORE_AXIS_LENS_IDS],
      rationale: [
        `host-facing positional invoke defaults core-axis review to the cost-constrained Pareto-optimal core lens set (${CORE_AXIS_LENS_IDS.join(", ")}) from .onto/authority/core-lens-registry.yaml.`,
      ],
    };
  }

  return {
    resolvedLensIds: [...FULL_REVIEW_LENS_IDS],
    alwaysIncludeLensIds: ["axiology"],
    recommendedLensIds: [...FULL_REVIEW_LENS_IDS],
    rationale: [
      "host-facing positional invoke currently defaults to full 9-lens review until interactive interpretation is productized.",
    ],
  };
}

async function resolveTargetInput(
  projectRoot: string,
  requestedTarget: string,
  explicitFilesystemAllowedRoots: string[],
  argv: string[],
): Promise<{
  absoluteTargetPath: string;
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind: "single_text" | "directory_listing";
  filesystemAllowedRoots: string[];
}> {
  const absoluteTargetPath = path.resolve(projectRoot, requestedTarget);
  const declaredFilesystemAllowedRoots = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  const targetStats = await fs.stat(absoluteTargetPath);
  const targetScopeKind = targetStats.isDirectory() ? "directory" : "file";
  const materializedKind = targetStats.isDirectory()
    ? "directory_listing"
    : "single_text";
  const derivedBoundaryRoot = deriveFilesystemBoundaryFromTarget(
    absoluteTargetPath,
    targetScopeKind,
  );

  if (
    !isInsideAnyDeclaredFilesystemRoot(
      absoluteTargetPath,
      declaredFilesystemAllowedRoots,
    )
  ) {
    const nonInteractiveDecision = parseFilesystemBoundaryDecision(argv);
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      if (nonInteractiveDecision === "approve_external_boundary") {
        if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
          declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
        }
        return {
          absoluteTargetPath,
          targetScopeKind,
          materializedKind,
          filesystemAllowedRoots: declaredFilesystemAllowedRoots,
        };
      }
      if (nonInteractiveDecision === "rerun_target") {
        throw new Error(
          [
            "Please rerun review using a repo-relative target",
            `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
            "or pass --filesystem-boundary-decision=rerun_target with corrected target.",
          ].join("\n"),
        );
      }
      if (nonInteractiveDecision === "cancel") {
        throw new Error(
          [
            "Review canceled by user decision.",
            "Re-run with an alternative target or explicit boundary decision.",
          ].join("\n"),
        );
      }
      console.error(
        [
          "[onto] Auto-approving external filesystem boundary:",
          `  project-root: ${projectRoot}`,
          `  resolved target: ${absoluteTargetPath}`,
          `  approved root: ${derivedBoundaryRoot}`,
          "  (pass --filesystem-boundary-decision cancel to prevent this)",
        ].join("\n"),
      );
      if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
        declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
      }
      return {
        absoluteTargetPath,
        targetScopeKind,
        materializedKind,
        filesystemAllowedRoots: declaredFilesystemAllowedRoots,
      };
    }
    const boundaryDecision = await promptForFilesystemBoundaryDecision(
      requestedTarget,
      absoluteTargetPath,
      projectRoot,
    );
    if (boundaryDecision.action === "rerun_target") {
      throw new Error(
        [
          "Please rerun review using a repo-relative target",
          `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
        ].join("\n"),
      );
    }
    if (boundaryDecision.action === "cancel") {
      throw new Error(
        [
          "Review canceled by user decision.",
          "If you want to review this target, choose option 1 in an interactive run.",
        ].join("\n"),
      );
    }
    if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
      declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
    }
  }

  if (targetStats.isDirectory()) {
    return {
      absoluteTargetPath,
      targetScopeKind,
      materializedKind,
      filesystemAllowedRoots: declaredFilesystemAllowedRoots,
    };
  }
  return {
    absoluteTargetPath,
    targetScopeKind,
    materializedKind,
    filesystemAllowedRoots: declaredFilesystemAllowedRoots,
  };
}

async function resolveReviewInvokeInputs(
  argv: string[],
  ontoConfig: OntoConfig,
  projectRoot: string,
): Promise<ResolvedReviewInvokeInputs> {
  const parsedPositionals = parseHostFacingPositionals(
    splitArgvIntoOptionsAndPositionals(
      argv,
      [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
      [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
    ).positionals,
  );

  const explicitRequestedTarget = readSingleOptionValueFromArgv(argv, "requested-target");
  const explicitTargetScopeKind = readSingleOptionValueFromArgv(argv, "target-scope-kind");
  const explicitPrimaryRef = readSingleOptionValueFromArgv(argv, "primary-ref");
  const explicitMemberRefs = readMultiOptionValuesFromArgv(argv, "member-ref");
  const explicitBundleKind = readSingleOptionValueFromArgv(argv, "bundle-kind");
  const explicitFilesystemAllowedRoots = readMultiOptionValuesFromArgv(
    argv,
    "filesystem-allowed-root",
  );
  const requestedTarget = explicitRequestedTarget ?? parsedPositionals.target;
  const bundleRequested =
    explicitTargetScopeKind === "bundle" || explicitMemberRefs.length > 0;
  if (
    !bundleRequested &&
    (typeof requestedTarget !== "string" || requestedTarget.length === 0)
  ) {
    throw new Error(
      "Missing review target. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --requested-target.",
    );
  }

  const MAX_REQUEST_TEXT_LENGTH = 2000;
  let requestText =
    readSingleOptionValueFromArgv(argv, "request-text") ??
    readSingleOptionValueFromArgv(argv, "intent-summary") ??
    parsedPositionals.intentText;
  if (typeof requestText !== "string" || requestText.length === 0) {
    throw new Error(
      "Missing review intent. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --request-text.",
    );
  }
  if (requestText.length > MAX_REQUEST_TEXT_LENGTH) {
    console.warn(
      `[onto] Request text truncated from ${requestText.length} to ${MAX_REQUEST_TEXT_LENGTH} characters.`,
    );
    requestText = requestText.slice(0, MAX_REQUEST_TEXT_LENGTH);
  }

  // Domain selection precedence (highest to lowest):
  //   1. --requested-domain-token (internal/legacy machine-facing flag, used by CLI runners)
  //   2. --no-domain flag (canonical user-facing, equivalent to legacy @-)
  //   3. --domain {name} option (canonical user-facing, equivalent to legacy @{name})
  //   4. positional @{domain} or @- (legacy short syntax — kept for backward compat;
  //      conflicts with Claude Code's @filename mention syntax)
  //   5. empty → triggers domain resolution (interactive selection or no-domain default)
  const noDomainFlag = hasOptionFlag(argv, "no-domain");
  const explicitDomainName = readSingleOptionValueFromArgv(argv, "domain");
  if (noDomainFlag && typeof explicitDomainName === "string" && explicitDomainName.length > 0) {
    throw new Error(
      "Conflicting domain flags: --no-domain cannot be combined with --domain. Use exactly one.",
    );
  }
  const canonicalDomainToken = noDomainFlag
    ? "@-"
    : typeof explicitDomainName === "string" && explicitDomainName.length > 0
      ? (normalizeDomainToken(explicitDomainName) ?? "")
      : "";
  const requestedDomainToken =
    readSingleOptionValueFromArgv(argv, "requested-domain-token") ??
    (canonicalDomainToken.length > 0 ? canonicalDomainToken : undefined) ??
    parsedPositionals.requestedDomainToken ??
    "";
  const resolvedDomainSelection = await resolveDomainSelection(
    requestedDomainToken,
    ontoConfig,
  );

  let reviewMode = resolveReviewMode(argv, ontoConfig);
  const explicitLensIds = readMultiOptionValuesFromArgv(argv, "lens-id");

  // Phase 3: standalone LLM-based complexity assessment (Step 1.5)
  // When no explicit review-mode or lens-id is set AND the principal is
  // running against a direct-call external HTTP provider (env override or
  // external_http_provider config), call main_llm to assess whether
  // core-axis review (cost-constrained Pareto-optimal core lens set from registry)
  // is appropriate vs full 9-lens.
  const envHostRuntime = process.env.ONTO_HOST_RUNTIME?.trim().toLowerCase();
  const isStandaloneHost =
    envHostRuntime === "standalone" ||
    envHostRuntime === "litellm" ||
    envHostRuntime === "anthropic" ||
    envHostRuntime === "openai" ||
    Boolean(ontoConfig.external_http_provider);
  const noExplicitMode = !readSingleOptionValueFromArgv(argv, "review-mode");
  const noExplicitLens = explicitLensIds.length === 0;

  let resolvedLensIds: string[];

  const lensDefaults = resolveLensDefaultsForReviewMode(reviewMode);

  if (isStandaloneHost && noExplicitMode && noExplicitLens) {
    // Step 1.5: LLM-based assessment
    const targetDesc = typeof requestedTarget === "string" ? requestedTarget : "(bundle)";
    try {
      const assessment = await assessComplexity(targetDesc, requestText ?? "", ontoConfig);
      if (assessment.suggestCoreAxis) {
        reviewMode = "core-axis";
        const lensSelection = await selectLenses(targetDesc, requestText ?? "", ontoConfig);
        resolvedLensIds = lensSelection.selectedLensIds;
        console.error(`[onto] Step 1.5: core-axis review suggested (Q2: ${assessment.q2Rationale.slice(0, 80)}). Lenses: ${resolvedLensIds.join(", ")}`);
      } else {
        reviewMode = "full";
        resolvedLensIds = [...FULL_REVIEW_LENS_IDS];
        console.error(`[onto] Step 1.5: full review suggested (Q2: ${assessment.q2Rationale.slice(0, 80)})`);
      }
    } catch (err) {
      // Assessment failed → default to full review (safe fallback)
      reviewMode = "full";
      resolvedLensIds = [...FULL_REVIEW_LENS_IDS];
      console.error(`[onto] Step 1.5: assessment failed (${err instanceof Error ? err.message : String(err)}), defaulting to full review`);
    }
  } else {
    resolvedLensIds = explicitLensIds.length > 0
      ? explicitLensIds
      : lensDefaults.resolvedLensIds;
  }
  const diffRange = readSingleOptionValueFromArgv(argv, "diff-range");

  let absoluteTargetPath = "";
  let targetScopeKind: ReviewTargetScopeKind;
  let materializedKind: "single_text" | "directory_listing" | "bundle_member_texts";
  let resolvedTargetRefs: string[];
  let filesystemAllowedRoots: string[] = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  let bundleKind: string | undefined;

  if (typeof diffRange === "string" && diffRange.length > 0) {
    if (!/^[a-zA-Z0-9_.\/\-~^@{}:]+(?:\.\.[a-zA-Z0-9_.\/\-~^@{}:]+)?$/.test(diffRange)) {
      throw new Error(
        `Invalid --diff-range value: ${diffRange}. Expected a git ref range like "abc123..def456" or "HEAD~3".`,
      );
    }
    const diffTargetDir = typeof requestedTarget === "string" && requestedTarget.length > 0
      ? path.resolve(projectRoot, requestedTarget)
      : projectRoot;
    let diffOutput: string;
    try {
      diffOutput = execSync(`git diff ${diffRange}`, {
        cwd: diffTargetDir,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (gitError: unknown) {
      const gitMessage = gitError instanceof Error ? gitError.message : String(gitError);
      if (gitMessage.includes("Not a git repository") || gitMessage.includes("not a git repository")) {
        throw new Error(
          `--diff-range requires a git repository. ${diffTargetDir} is not a git repository.`,
        );
      }
      if (gitMessage.includes("unknown revision")) {
        throw new Error(
          `Invalid git revision in --diff-range "${diffRange}". Commit not found in ${diffTargetDir}.`,
        );
      }
      throw new Error(
        `git diff failed in ${diffTargetDir}: ${gitMessage.split("\n")[0]}`,
      );
    }
    if (diffOutput.trim().length === 0) {
      throw new Error(`git diff ${diffRange} produced empty output in ${diffTargetDir}`);
    }
    const sessionId = readSingleOptionValueFromArgv(argv, "session-id") ?? generateReviewSessionId();
    const diffFilePath = path.join(projectRoot, ".onto", "review", sessionId, "diff-target.patch");
    await fs.mkdir(path.dirname(diffFilePath), { recursive: true });
    await fs.writeFile(diffFilePath, diffOutput, "utf8");
    absoluteTargetPath = diffFilePath;
    targetScopeKind = "file";
    materializedKind = "single_text";
    resolvedTargetRefs = [diffFilePath];
    if (!filesystemAllowedRoots.includes(path.resolve(diffTargetDir))) {
      filesystemAllowedRoots.push(path.resolve(diffTargetDir));
    }
  } else if (bundleRequested) {
    targetScopeKind = "bundle";
    materializedKind = "bundle_member_texts";
    bundleKind = explicitBundleKind && explicitBundleKind.length > 0
      ? explicitBundleKind
      : "host_facing_bundle";
    const primaryRefRaw = explicitPrimaryRef ?? requestedTarget ?? explicitMemberRefs[0];
    if (typeof primaryRefRaw !== "string" || primaryRefRaw.length === 0) {
      throw new Error(
        "Bundle review target requires --primary-ref or at least one --member-ref.",
      );
    }
    absoluteTargetPath = path.resolve(projectRoot, primaryRefRaw);
    const orderedRefs = [
      absoluteTargetPath,
      ...explicitMemberRefs.map((memberRef) => path.resolve(projectRoot, memberRef)),
    ];
    resolvedTargetRefs = orderedRefs.filter(
      (resolvedRef, index) => orderedRefs.indexOf(resolvedRef) === index,
    );
  } else {
  const resolvedTargetInput = await resolveTargetInput(
      projectRoot,
      requestedTarget as string,
      explicitFilesystemAllowedRoots,
      argv,
    );
    absoluteTargetPath = resolvedTargetInput.absoluteTargetPath;
    targetScopeKind = resolvedTargetInput.targetScopeKind;
    materializedKind = resolvedTargetInput.materializedKind;
    resolvedTargetRefs = [absoluteTargetPath];
    filesystemAllowedRoots = resolvedTargetInput.filesystemAllowedRoots;
  }

  if (resolvedLensIds.length === 0) {
    throw new Error(
      "No lens IDs resolved. Specify at least one --lens-id or use --review-mode full|core-axis.",
    );
  }

  return {
    requestedTarget: requestedTarget ?? explicitPrimaryRef ?? absoluteTargetPath,
    targetPath: absoluteTargetPath,
    resolvedTargetRefs,
    targetScopeKind,
    materializedKind,
    requestText,
    requestedDomainToken,
    domainRecommendation: resolvedDomainSelection.domainRecommendation,
    domainFinalValue: resolvedDomainSelection.domainFinalValue,
    domainSelectionMode: resolvedDomainSelection.domainSelectionMode,
    domainSelectionRequired: resolvedDomainSelection.domainSelectionRequired,
    ...(bundleKind ? { bundleKind } : {}),
    reviewMode,
    reviewModeRecommendation: reviewMode,
    resolvedLensIds,
    alwaysIncludeLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.alwaysIncludeLensIds,
    recommendedLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.recommendedLensIds,
    rationale:
      explicitLensIds.length > 0
        ? ["host-facing invoke preserved the explicitly requested lens set."]
        : lensDefaults.rationale,
    filesystemAllowedRoots,
  };
}

function appendReviewInvokeDerivedArgs(
  argv: string[],
  resolvedInputs: ResolvedReviewInvokeInputs,
): string[] {
  const appended = [...argv];

  const appendSingleIfAbsent = (optionName: string, value: string): void => {
    if (readSingleOptionValueFromArgv(appended, optionName) !== undefined) {
      return;
    }
    appended.push(`--${optionName}`, value);
  };

  const appendMultiIfAbsent = (optionName: string, values: string[]): void => {
    if (readMultiOptionValuesFromArgv(appended, optionName).length > 0) {
      return;
    }
    for (const value of values) {
      appended.push(`--${optionName}`, value);
    }
  };

  appendSingleIfAbsent("requested-target", resolvedInputs.requestedTarget);
  appendSingleIfAbsent("target-scope-kind", resolvedInputs.targetScopeKind);
  appendSingleIfAbsent("primary-ref", resolvedInputs.targetPath);
  appendSingleIfAbsent("intent-summary", resolvedInputs.requestText);
  appendSingleIfAbsent("domain-recommendation", resolvedInputs.domainRecommendation);
  appendSingleIfAbsent(
    "domain-selection-required",
    resolvedInputs.domainSelectionRequired ? "true" : "false",
  );
  appendSingleIfAbsent("review-mode-recommendation", resolvedInputs.reviewModeRecommendation);
  appendSingleIfAbsent("domain-final-value", resolvedInputs.domainFinalValue);
  appendSingleIfAbsent("domain-selection-mode", resolvedInputs.domainSelectionMode);
  appendSingleIfAbsent("review-mode", resolvedInputs.reviewMode);
  appendSingleIfAbsent("materialized-kind", resolvedInputs.materializedKind);
  appendMultiIfAbsent("always-include-lens-id", resolvedInputs.alwaysIncludeLensIds);
  appendMultiIfAbsent("recommended-lens-id", resolvedInputs.recommendedLensIds);
  appendMultiIfAbsent("rationale", resolvedInputs.rationale);
  appendMultiIfAbsent("resolved-target-ref", resolvedInputs.resolvedTargetRefs);
  appendMultiIfAbsent(
    "filesystem-allowed-root",
    resolvedInputs.filesystemAllowedRoots,
  );
  appendMultiIfAbsent("lens-id", resolvedInputs.resolvedLensIds);
  appendMultiIfAbsent("materialized-ref", resolvedInputs.resolvedTargetRefs);
  if (resolvedInputs.targetScopeKind === "bundle") {
    appendMultiIfAbsent("member-ref", resolvedInputs.resolvedTargetRefs.slice(1));
    if (
      typeof resolvedInputs.bundleKind === "string" &&
      resolvedInputs.bundleKind.length > 0 &&
      readSingleOptionValueFromArgv(appended, "bundle-kind") === undefined
    ) {
      appended.push("--bundle-kind", resolvedInputs.bundleKind);
    }
  }

  if (
    resolvedInputs.requestedDomainToken.length > 0 &&
    readSingleOptionValueFromArgv(appended, "requested-domain-token") === undefined
  ) {
    appended.push("--requested-domain-token", resolvedInputs.requestedDomainToken);
  }

  return appended;
}

async function readOptionalReviewSummary(
  sessionRoot: string,
): Promise<{
  reviewRecord:
    | {
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }
    | null;
  binding:
    | {
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }
    | null;
}> {
  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const reviewRecordPath = path.join(sessionRoot, "review-record.yaml");

  const binding = (await fileExists(bindingPath))
    ? await readYamlDocument<{
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }>(bindingPath)
    : null;
  const reviewRecord = (await fileExists(reviewRecordPath))
    ? await readYamlDocument<{
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }>(reviewRecordPath)
    : null;

  return {
    reviewRecord,
    binding,
  };
}

function resolveMaxConcurrentLenses(
  argv: string[],
  ontoConfig: OntoConfig,
): number {
  const explicitValue = readSingleOptionValueFromArgv(argv, "max-concurrent-lenses");
  if (typeof explicitValue === "string" && explicitValue.length > 0) {
    const parsed = Number.parseInt(explicitValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid max concurrent lenses: ${explicitValue}`);
    }
    return parsed;
  }

  const configValue = ontoConfig.max_concurrent_lenses;
  if (
    (typeof configValue === "string" && configValue.length > 0) ||
    typeof configValue === "number"
  ) {
    const parsed = Number.parseInt(String(configValue), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid .onto/config.yml max_concurrent_lenses: ${configValue}`);
    }
    return parsed;
  }

  return 9;
}

function rejectRemovedFlags(argv: string[]): void {
  if (hasOptionFlag(argv, "claude")) {
    throw new Error(
      "--claude is no longer accepted. The `onto review` CLI runs Codex only. " +
        "For Claude execution, use `onto coordinator start` (Agent Teams nested spawn).",
    );
  }
  for (const removed of ["host-runtime", "execution-realization", "execution-mode"]) {
    const optionToken = `--${removed}`;
    const present =
      hasOptionFlag(argv, removed) ||
      argv.some((token) => token.startsWith(`${optionToken}=`));
    if (present) {
      throw new Error(
        `--${removed} is no longer accepted. The \`onto review\` CLI is codex-only; ` +
          "remove the flag.",
      );
    }
  }
}

function appendCanonicalExecutionProfileArgs(
  argv: string[],
  profile: ResolvedExecutionProfile,
): string[] {
  return [
    ...argv,
    "--execution-realization",
    profile.execution_realization,
    "--host-runtime",
    profile.host_runtime,
  ];
}

function appendDirectoryListingConfigArgs(
  targetArgv: string[],
  originalArgv: string[],
  ontoConfig: OntoConfig,
): string[] {
  const result = [...targetArgv];

  if (
    readMultiOptionValuesFromArgv(result, "excluded-name").length === 0 &&
    Array.isArray(ontoConfig.excluded_names) &&
    ontoConfig.excluded_names.length > 0
  ) {
    for (const name of ontoConfig.excluded_names) {
      result.push("--excluded-name", name);
    }
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-depth") === undefined &&
    ontoConfig.max_listing_depth !== undefined
  ) {
    result.push("--max-listing-depth", String(ontoConfig.max_listing_depth));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-entries") === undefined &&
    ontoConfig.max_listing_entries !== undefined
  ) {
    result.push("--max-listing-entries", String(ontoConfig.max_listing_entries));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-embed-lines") === undefined &&
    ontoConfig.max_embed_lines !== undefined
  ) {
    result.push("--max-embed-lines", String(ontoConfig.max_embed_lines));
  }

  return result;
}

interface ReviewInvokeSetup {
  ontoHome: string | undefined;
  projectRoot: string;
  ontoConfig: OntoConfig;
  resolvedInvokeInputs: ResolvedReviewInvokeInputs;
  maxConcurrentLenses: number;
  startArgv: string[];
  /**
   * Resolved execution profile that drove the startArgv's --execution-realization
   * and --host-runtime args. Downstream consumers (runReviewInvokeCli,
   * reviewPrepareOnly) use this to return artifact-consistent responses.
   * null when resolution yielded no_host AND caller hasn't forced a fallback.
   */
  executionProfile: ResolvedExecutionProfile | null;
}

async function resolveReviewInvokeSetup(argv: string[]): Promise<ReviewInvokeSetup> {
  rejectRemovedFlags(argv);
  const ontoHomeFlag = readSingleOptionValueFromArgv(argv, "onto-home");
  let ontoHome: string | undefined;
  try {
    ontoHome = resolveOntoHome(ontoHomeFlag);
    // Activation/Execution Determinism Redesign B4: propagate ONTO_HOME to
    // process.env so spawned children (lens + synthesize executors in
    // run-review-prompt-execution.ts:invokeExecutor) inherit the same
    // install. Without this, `npm run review:invoke` bypasses the global
    // `onto` CLI (which sets process.env.ONTO_HOME at src/cli.ts:667) and
    // the synthesize-spawn guard throws.
    process.env.ONTO_HOME = ontoHome;
  } catch {
    // When invoked via npm run (legacy path), onto home resolution from
    // import.meta.url or CWD will succeed. If it fails, we proceed without
    // ontoHome — executor resolution falls back to npm run scripts.
    ontoHome = undefined;
  }
  const projectRoot = path.resolve(
    readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
  );
  const ontoConfig = ontoHome
    ? await resolveConfigChain(ontoHome, projectRoot)
    : await readOntoConfig(projectRoot);
  const resolvedInvokeInputs = await resolveReviewInvokeInputs(
    argv,
    ontoConfig,
    projectRoot,
  );
  const maxConcurrentLenses = resolveMaxConcurrentLenses(argv, ontoConfig);

  const { optionTokens: argvWithoutPositionals } = splitArgvIntoOptionsAndPositionals(
    argv,
    [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
    [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
  );

  const normalizedStartArgv = appendReviewInvokeDerivedArgs(
    ensureSessionIdArg(
      stripOptionsFromArgv(
        argvWithoutPositionals,
        [...KNOWN_INVOKE_ONLY_OPTION_NAMES],
        [...KNOWN_INVOKE_ONLY_FLAG_NAMES],
      ),
    ),
    resolvedInvokeInputs,
  );
  // Resolve execution profile ONCE here so session artifacts, startArgv, and
  // downstream responses all share the same (realization, host) pair. This is
  // the single seat that writes the Claude-host profile into prepared session
  // artifacts — closes the "Claude run recorded as codex" artifact seam gap
  // (review consensus #1, 2026-04-16).
  const explicitCodex = hasOptionFlag(argv, "codex");
  const profileResolution = resolveExecutionProfile({ explicitCodex, ontoConfig });
  // Defaults when no host detected: preserve the prior hardcoded behavior so
  // --prepare-only in a credential-less env still gets artifacts prepared and
  // downstream fail-fast surfaces at resolveExecutorConfig. runReviewInvokeCli
  // (non-prepareOnly) explicitly re-checks and throws earlier.
  const executionProfile: ResolvedExecutionProfile | null =
    profileResolution.type === "resolved" ? profileResolution.profile : null;
  const profileForArtifacts: ResolvedExecutionProfile = executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  const startArgvWithProfile = appendCanonicalExecutionProfileArgs(
    normalizedStartArgv,
    profileForArtifacts,
  );
  const startArgv = appendDirectoryListingConfigArgs(
    startArgvWithProfile,
    argv,
    ontoConfig,
  );
  return {
    ontoHome,
    projectRoot,
    ontoConfig,
    resolvedInvokeInputs,
    maxConcurrentLenses,
    startArgv,
    executionProfile,
  };
}

/**
 * Runs review preparation and returns the result directly (no console output).
 * Used by the coordinator state machine to avoid console.log capture.
 *
 * The execution_realization / host_runtime in the returned result mirror the
 * values that were written into the prepared session artifacts (via
 * setup.executionProfile). This closes the artifact seam gap where Claude-path
 * runs were previously recorded as `subagent + codex` regardless of host.
 */
export async function reviewPrepareOnly(argv: string[]): Promise<PrepareOnlyResult> {
  const setup = await resolveReviewInvokeSetup(argv);
  const startResult = await startReviewSession(setup.startArgv);
  const sessionRoot = path.resolve(startResult.session_root);
  const profile: ResolvedExecutionProfile = setup.executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  return {
    prepare_only: true,
    session_root: sessionRoot,
    request_text: setup.resolvedInvokeInputs.requestText,
    execution_realization: profile.execution_realization,
    host_runtime: profile.host_runtime,
    review_mode: setup.resolvedInvokeInputs.reviewMode,
  };
}

export async function runReviewInvokeCli(argv: string[]): Promise<number> {
  // Phase B-1 (interactive runtime detection signals, design-draft §3.1):
  // when `--emit-detection-signals` is present, skip the full review setup
  // pipeline (which mutates ONTO_HOME, validates targets, resolves
  // execution profile, etc.) and emit only the v1 detection signal JSON.
  //
  // Why early: the host prose calls this BEFORE deciding to launch a real
  // review session, so the runtime must respond as a pure read — no env
  // mutation, no target requirement, no profile derivation.
  if (hasOptionFlag(argv, "emit-detection-signals")) {
    const projectRoot = path.resolve(
      readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
    );
    // Use the parse-health-aware reader instead of `readOntoConfig`,
    // which warns-and-falls-through on parse failure (correct for
    // dispatch, lossy for detection). The parse error string flows
    // into the v1 `config_parse_error` field so host prose can
    // distinguish "user has not configured yet" from "user's config
    // is broken" — see contract §3.1.
    const read = await readConfigWithParseHealth(projectRoot);
    const signals = gatherDetectionSignals(read);
    process.stdout.write(`${formatDetectionSignalsJson(signals)}\n`);
    return 0;
  }

  const prepareOnly = hasOptionFlag(argv, "prepare-only");
  const explicitCodex = hasOptionFlag(argv, "codex");

  const setup = await resolveReviewInvokeSetup(argv);

  // Auto-resolve execution realization before starting a session. When the
  // resolution points at the Claude host, we don't start a session here — we
  // emit a handoff JSON that tells the subject session to invoke
  // `onto coordinator start`, which owns Claude-host preparation itself.
  // See design record §3.2.
  const handoff = resolveExecutionRealizationHandoff({
    explicitCodex,
    prepareOnly,
    ontoConfig: setup.ontoConfig,
  });
  if (handoff.type === "no_host") {
    throw buildNoHostDetectedError();
  }

  if (handoff.type === "coordinator_start") {
    // P9.3 (2026-04-21): resolver always attempts axis-first derivation,
    // so every coordinator handoff carries a topology descriptor (null
    // only when the resolver itself could not find a viable host). The
    // coordinator state machine follows it as canonical rather than
    // inferring from preferred_realization alone.
    //
    // P9.3-m1 (2026-04-21): coordinator_start returns early before the
    // prepare-only / full-dispatch split, so this branch has exactly
    // ONE resolver consumer. No caching needed — let
    // `tryResolveTopologyForHandoff` do its own resolve via the legacy
    // two-argument call path.
    const topologyDescriptor = tryResolveTopologyForHandoff(setup.ontoConfig);
    emitCoordinatorStartHandoff({
      preferredRealization: handoff.profile.execution_realization,
      requestedTarget: setup.resolvedInvokeInputs.requestedTarget,
      requestText: setup.resolvedInvokeInputs.requestText,
      topology: topologyDescriptor,
    });
    return 0;
  }

  const resolvedProjectRoot = path.resolve(
    readSingleOptionValueFromArgv(setup.startArgv, "project-root") ?? ".",
  );
  const rawOntoHome = readSingleOptionValueFromArgv(setup.startArgv, "onto-home");
  const resolvedOntoHome = rawOntoHome ? path.resolve(rawOntoHome) : undefined;

  const noWatch = hasOptionFlag(argv, "no-watch");

  const startResult = await startReviewSession(setup.startArgv);

  if (prepareOnly) {
    const sessionRoot = path.resolve(startResult.session_root);
    const profile: ResolvedExecutionProfile = setup.executionProfile ?? {
      execution_realization: "subagent",
      host_runtime: "codex",
    };
    const result: PrepareOnlyResult = {
      prepare_only: true,
      session_root: sessionRoot,
      request_text: setup.resolvedInvokeInputs.requestText,
      execution_realization: profile.execution_realization,
      host_runtime: profile.host_runtime,
      review_mode: setup.resolvedInvokeInputs.reviewMode,
    };
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  const sessionRoot = path.resolve(startResult.session_root);

  // Auto-attach the live watcher pane AFTER session creation so the watcher
  // receives the exact session-root as an explicit argument. Prior behaviour
  // spawned the watcher before startReviewSession and relied on the shared
  // `.onto/review/.latest-session` pointer — but that pointer is a project-
  // global single file, so concurrent review sessions (two or more
  // `onto review --codex` invocations running in parallel) caused each
  // watcher to latch onto whichever session wrote `.latest-session` last.
  // Passing sessionRoot explicitly eliminates that race.
  if (!noWatch) {
    const watcherResult = spawnWatcherPane(
      resolvedProjectRoot,
      sessionRoot,
      resolvedOntoHome,
    );
    if (watcherResult.spawned) {
      // Distinguish dry-run (mechanism detected, no osascript/tmux invoked)
      // from real attach (actual side pane / split / tab opened). Log
      // readers need both to verify "did the pane appear?" without
      // conflating it with "did detection logic reach the right branch?".
      const action = watcherResult.dry_run
        ? "detection via"
        : "attached via";
      console.log(
        `[review runner] live watcher ${action} ${watcherResult.mechanism}`,
      );
    } else {
      console.log(
        `[review runner] live progress: open another terminal and run \`npm run review:watch -- "${sessionRoot}"\`` +
          (watcherResult.reason ? ` (${watcherResult.reason})` : ""),
      );
    }
  }

  // P9.3-m1 (2026-04-21): resolve topology EXACTLY ONCE for the full-
  // dispatch path and thread it to the 3 downstream consumers
  // (resolveExecutorConfig ×2 + topologyForDispatch). Placement here
  // (post-prepareOnly, post-watcher-spawn) is deliberate:
  //   - The coordinator_start branch returned earlier with its own
  //     single resolver call, so it never reaches this cache.
  //   - The prepare-only branch also returned earlier, preserving its
  //     prior zero-resolver-call observability (no `[topology]` STDERR
  //     lines emitted for `onto review --prepare-only`).
  //
  // Staleness assumption: `setup.ontoConfig` is readonly and
  // `process.env` is not mutated inside `runReviewInvokeCli` between
  // this cache site and the downstream helpers, so the cached snapshot
  // stays authoritative. A future consumer that mutates env (e.g.
  // injecting CLAUDECODE) between here and the helpers would silently
  // drift — keep the mutation/consumption points adjacent or re-resolve
  // explicitly in that case.
  const cachedTopologyResolution = resolveExecutionTopology({
    ontoConfig: setup.ontoConfig,
  });
  const cachedTopology: ExecutionTopology | null =
    cachedTopologyResolution.type === "resolved"
      ? cachedTopologyResolution.topology
      : null;

  const resolvedRequestText = setup.resolvedInvokeInputs.requestText;
  const defaultExecutorConfig = resolveExecutorConfig(
    argv,
    "",
    setup.ontoConfig,
    setup.ontoHome,
    cachedTopology,
  );
  const synthesizeExecutorConfig = resolveExecutorConfig(
    argv,
    "synthesize-",
    setup.ontoConfig,
    setup.ontoHome,
    cachedTopology,
  );

  // P9.3-m1 (2026-04-21): reuse the cached topology instead of calling
  // `resolveExecutionTopology` a third time. `null` corresponds to the
  // prior `no_host` → `undefined` semantics expected by
  // `executeReviewPromptExecution`.
  const topologyForDispatch: ExecutionTopology | undefined =
    cachedTopology ?? undefined;

  const promptExecutionResult = await executeReviewPromptExecution({
    projectRoot: resolvedProjectRoot,
    sessionRoot,
    defaultExecutorConfig,
    maxConcurrentLenses: setup.maxConcurrentLenses,
    ...(synthesizeExecutorConfig.bin === defaultExecutorConfig.bin &&
    JSON.stringify(synthesizeExecutorConfig.args) ===
      JSON.stringify(defaultExecutorConfig.args)
      ? {}
      : { synthesizeExecutorConfig }),
    ...(topologyForDispatch ? { topology: topologyForDispatch } : {}),
    ontoConfig: setup.ontoConfig,
  });

  const completeSessionResult = await completeReviewSession([
    "--project-root",
    resolvedProjectRoot,
    "--session-root",
    sessionRoot,
    "--request-text",
    resolvedRequestText,
  ]);
  const reviewSummary = await readOptionalReviewSummary(sessionRoot);
  const boundedInvokeSteps = [
    "review:start-session",
    "review:run-prompt-execution",
    "review:complete-session",
  ] as const;
  const routeProfile: ResolvedExecutionProfile = setup.executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  const routeSummary: ReviewInvokeRouteSummary = {
    combined_entrypoint: "review:invoke",
    bounded_invoke_steps: [...boundedInvokeSteps],
    execution_realization: routeProfile.execution_realization,
    host_runtime: routeProfile.host_runtime,
    review_mode: setup.resolvedInvokeInputs.reviewMode,
    max_concurrent_lenses: setup.maxConcurrentLenses,
    concurrency_strategy: "bounded_parallel",
    synthesize_waits_for_all_lenses: true,
  };
  const finalOutputPath =
    reviewSummary.binding?.final_output_path ?? path.join(sessionRoot, "final-output.md");
  const reviewRecordPath =
    reviewSummary.binding?.review_record_path ?? path.join(sessionRoot, "review-record.yaml");
  const executionResultPath =
    reviewSummary.binding?.execution_result_path ?? path.join(sessionRoot, "execution-result.yaml");

  console.log(
    JSON.stringify(
      {
        entrypoint_plan: {
          entrypoint: "review",
          target: setup.resolvedInvokeInputs.requestedTarget,
          target_scope_kind: setup.resolvedInvokeInputs.targetScopeKind,
          resolved_target_refs: setup.resolvedInvokeInputs.resolvedTargetRefs,
          request_text: resolvedRequestText,
          requested_domain_token:
            setup.resolvedInvokeInputs.requestedDomainToken.length > 0
              ? setup.resolvedInvokeInputs.requestedDomainToken
              : null,
          domain_selection_required: setup.resolvedInvokeInputs.domainSelectionRequired,
          domain_selection_mode: setup.resolvedInvokeInputs.domainSelectionMode,
          domain_final_value: setup.resolvedInvokeInputs.domainFinalValue,
          review_mode: setup.resolvedInvokeInputs.reviewMode,
        },
        route_summary: routeSummary,
        review_result: {
          session_root: sessionRoot,
          final_output_path: finalOutputPath,
          review_record_path: reviewRecordPath,
          execution_result_path: executionResultPath,
          record_status: reviewSummary.reviewRecord?.record_status ?? null,
          deliberation_status:
            reviewSummary.reviewRecord?.deliberation_status ?? null,
          participating_lens_ids:
            reviewSummary.reviewRecord?.participating_lens_ids ??
            promptExecutionResult.participating_lens_ids,
          degraded_lens_ids:
            reviewSummary.reviewRecord?.degraded_lens_ids ??
            promptExecutionResult.degraded_lens_ids,
        },
        session_root: sessionRoot,
        bounded_invoke_steps: [...boundedInvokeSteps],
        prompt_execution_result: promptExecutionResult,
        complete_session_result: completeSessionResult,
        max_concurrent_lenses: setup.maxConcurrentLenses,
        executor_realization:
          defaultExecutorConfig.bin === packageManagerBin()
            ? defaultExecutorConfig.args[1] === "review:codex-unit-executor"
              ? "codex"
              : defaultExecutorConfig.args[1] === "review:mock-unit-executor"
                ? "mock"
                : "custom"
            : "custom",
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runReviewInvokeCli(process.argv.slice(2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
