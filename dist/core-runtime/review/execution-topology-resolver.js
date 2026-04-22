/**
 * Execution Topology Resolver — axis-first only (P9.1, 2026-04-21).
 *
 * # What this module is
 *
 * Single seat for selecting ONE canonical execution topology for a review
 * session. Topology is the top-level decision — teamlead location + lens
 * spawn mechanism + deliberation channel.
 *
 * # Why it exists
 *
 * Review UX Redesign (P1~P8, PRs #152~#160) established `config.review`
 * axis block as the canonical way users express topology intent, with a
 * single `main_native` degrade step as the universal safety net. P9.1
 * (this file) retires the legacy priority ladder that walked
 * `DEFAULT_TOPOLOGY_PRIORITY`; axis-first derivation + `main_native`
 * degrade now form the entire selection surface.
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` — run axis-first derivation → degrade →
 *   prerequisite check → return topology or `no_host`. Emits `[topology]`
 *   STDERR for every branch (mirrors `[plan]` pattern from PR #96).
 * - `TOPOLOGY_CATALOG` — metadata for the 8 canonical options.
 * - `PR_A_SUPPORTED_TOPOLOGIES` — spawn-time support set (narrows as
 *   later PRs register executors).
 *
 * # Design reference
 *
 * - P9 handoff: `project_review_ux_redesign_p9_handoff.md` (memory)
 * - Completion doc: `development-records/evolve/20260421-review-ux-redesign-completion.md`
 * - Sketch v3: `development-records/evolve/20260418-execution-topology-priority-sketch.md`
 */
import { detectClaudeCodeEnvSignal, detectCodexBinaryAvailable, detectCodexEnvSignal, detectLiteLlmEndpoint, } from "../discovery/host-detection.js";
import { validateReviewConfig } from "./review-config-validator.js";
import { deriveTopologyShape, } from "./topology-shape-derivation.js";
import { shapeToTopologyId } from "./shape-to-topology-id.js";
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
export const TOPOLOGY_CATALOG = {
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
};
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
export const PR_A_SUPPORTED_TOPOLOGIES = new Set([
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
function emitTopologyLog(line) {
    process.stderr.write(`[topology] ${line}\n`);
}
/**
 * Evaluate whether the given topology id's prerequisites are satisfied by
 * the current detection signals. Returns a `{ ok, reason }` pair: `reason`
 * is populated for both branches so trace output explains matches AND skips.
 */
function checkTopologyRequirements(id, signals) {
    switch (id) {
        case "cc-teams-lens-agent-deliberation": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
            if (!signals.experimentalAgentTeams) {
                return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
            }
            if (!signals.lensAgentTeamsMode) {
                return { ok: false, reason: "need config.lens_agent_teams_mode=true" };
            }
            return { ok: true, reason: "CLAUDECODE + experimental-teams + lens_agent_teams_mode all set" };
        }
        case "cc-teams-agent-subagent": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
            if (!signals.experimentalAgentTeams) {
                return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
            }
            return { ok: true, reason: "CLAUDECODE + experimental-teams set" };
        }
        case "cc-teams-codex-subprocess": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
            if (!signals.experimentalAgentTeams) {
                return { ok: false, reason: "need CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" };
            }
            if (!signals.codexAvailable) {
                return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
            }
            return { ok: true, reason: "CLAUDECODE + experimental-teams + codex binary all set" };
        }
        case "cc-main-agent-subagent": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
            return { ok: true, reason: "CLAUDECODE=1 detected" };
        }
        case "cc-main-codex-subprocess": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
            if (!signals.codexAvailable) {
                return { ok: false, reason: "need codex binary + ~/.codex/auth.json" };
            }
            return { ok: true, reason: "CLAUDECODE + codex binary both present" };
        }
        case "cc-teams-litellm-sessions": {
            if (!signals.claudeHost)
                return { ok: false, reason: "need CLAUDECODE=1" };
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
    }
}
// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------
/**
 * Derive a single ExecutionTopology for this review session.
 *
 * Decision surface (P9.1, 2026-04-21):
 *   1. Axis-first — if `config.review` is present, derive TopologyId from
 *      the axis block via `shapeToTopologyId`. Source: `review-axes`.
 *   2. Fallback — if `config.review` is absent OR axis-first fails at any
 *      stage (validate / derive / map), attempt a single `main_native`
 *      degrade against current host signals. Source: `fallback-main-native`.
 *   3. If `main_native` itself is unmappable (neither Claude nor Codex
 *      host available), fail-fast with `no_host`.
 *
 * After a TopologyId is resolved, `checkTopologyRequirements` still runs
 * against it — the axis/shape pipeline gates on host presence only, while
 * `checkTopologyRequirements` covers the full signal set (codex binary,
 * experimental flag, LiteLLM endpoint, etc). A requirement miss at this
 * stage also yields `no_host`.
 *
 * P9.2 (2026-04-21) removed `execution_topology_priority` and
 * `execution_topology_overrides` from `OntoConfig`. The canonical
 * concurrency override is now `review.max_concurrent_lenses` (Axis C),
 * applied below after the topology id is resolved.
 *
 * Returns:
 *   - `{ type: "resolved", topology }` — resolved id passed its requirements.
 *   - `{ type: "no_host", plan_trace, reason }` — axis + degrade both
 *     failed, OR the derived id failed its detailed requirement check.
 */
export function resolveExecutionTopology(args) {
    const env = args.env ?? process.env;
    const trace = [];
    const log = (line) => {
        emitTopologyLog(line);
        trace.push(line);
    };
    const signals = {
        claudeHost: args.claudeHost ?? detectClaudeCodeEnvSignal(),
        experimentalAgentTeams: args.experimentalAgentTeams ?? env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1",
        lensAgentTeamsMode: args.ontoConfig.lens_agent_teams_mode === true,
        codexAvailable: args.codexAvailable ?? detectCodexBinaryAvailable(),
        codexSessionActive: args.codexSessionActive ?? detectCodexEnvSignal(),
        liteLlmEndpointAvailable: args.liteLlmEndpointAvailable ??
            (Boolean(args.ontoConfig.llm_base_url) || detectLiteLlmEndpoint()),
    };
    log(`signals: claudeHost=${signals.claudeHost} experimental=${signals.experimentalAgentTeams} ` +
        `lens_agent_teams_mode=${signals.lensAgentTeamsMode} codex=${signals.codexAvailable} ` +
        `codex_session=${signals.codexSessionActive} litellm=${signals.liteLlmEndpointAvailable}`);
    // Axis-first → degrade → fail-fast. `resolveAxisFirstTopology` handles
    // its own `main_native` degrade for validate/derive/map failures when
    // `config.review` is present. The outer degrade below fires ONLY for
    // the distinct "review block absent" case — otherwise we would emit a
    // second misleading `degraded: requested=<review-block-absent>` line
    // after the inner helper already exhausted the single-step fallback.
    const axisFirstId = resolveAxisFirstTopology(args.ontoConfig, signals, log);
    const resolvedId = axisFirstId ??
        (args.ontoConfig.review === undefined
            ? attemptMainNativeDegrade({
                requested: "<review-block-absent>",
                reason: "config.review block absent — legacy priority ladder retired in P9.1",
                signals,
                log,
            })
            : null);
    const source = axisFirstId ? "review-axes" : "fallback-main-native";
    if (!resolvedId) {
        log("no topology resolved (axis-first + main_native fallback both failed)");
        return {
            type: "no_host",
            plan_trace: trace,
            reason: buildNoTopologyReason(signals),
        };
    }
    log(`topology source=${source} id=${resolvedId}`);
    const check = checkTopologyRequirements(resolvedId, signals);
    if (!check.ok) {
        log(`${resolvedId}: skip — ${check.reason}`);
        log("derived topology failed detailed requirements check");
        return {
            type: "no_host",
            plan_trace: trace,
            reason: buildNoTopologyReason(signals),
        };
    }
    log(`${resolvedId}: matched — ${check.reason}`);
    const metadata = applyReviewConcurrencyOverride(TOPOLOGY_CATALOG[resolvedId], args.ontoConfig.review?.max_concurrent_lenses, log);
    return {
        type: "resolved",
        topology: { ...metadata, plan_trace: trace },
    };
}
/**
 * Apply `review.max_concurrent_lenses` (Axis C) on top of the catalog
 * default. P9.2 (2026-04-21) made this the canonical override seat — the
 * previous `execution_topology_overrides` map was removed. Non-positive
 * values are ignored (fall back to catalog default) with a warning log.
 */
function applyReviewConcurrencyOverride(metadata, requested, log) {
    if (requested === undefined)
        return metadata;
    // The TypeScript type already narrows `requested` to `number`, but
    // YAML parsing can yield `"6"` (string) or other non-numeric shapes
    // for this field. The runtime typeof check is defensive against that
    // parse-time coercion, not against typed in-process call sites.
    if (typeof requested !== "number" || requested <= 0) {
        log(`${metadata.id}: review.max_concurrent_lenses=${requested} ignored (must be positive integer)`);
        return metadata;
    }
    if (requested === metadata.max_concurrent_lenses)
        return metadata;
    log(`${metadata.id}: override max_concurrent_lenses ${metadata.max_concurrent_lenses} → ${requested} (via review.max_concurrent_lenses)`);
    return { ...metadata, max_concurrent_lenses: requested };
}
// ---------------------------------------------------------------------------
// Error message composition
// ---------------------------------------------------------------------------
function buildNoTopologyReason(signals) {
    const lines = [];
    lines.push("Execution topology 를 도출할 수 없습니다 (axis-first + main_native degrade 모두 실패).");
    lines.push("");
    lines.push("현재 환경 시그널:");
    lines.push(`  - Claude Code 세션 (CLAUDECODE=1):              ${signals.claudeHost}`);
    lines.push(`  - Experimental Agent Teams:                     ${signals.experimentalAgentTeams}`);
    lines.push(`  - Lens Agent Teams mode (config):               ${signals.lensAgentTeamsMode}`);
    lines.push(`  - Codex 바이너리 + ~/.codex/auth.json:          ${signals.codexAvailable}`);
    lines.push(`  - Codex CLI 세션 (CODEX_THREAD_ID / CODEX_CI):  ${signals.codexSessionActive}`);
    lines.push(`  - LiteLLM endpoint (config/env):                ${signals.liteLlmEndpointAvailable}`);
    lines.push("");
    lines.push("해결 방법 (한 가지 선택):");
    lines.push("  1. Claude Code 세션에서 `onto review` 재실행 (CLAUDECODE=1 자동 감지)");
    lines.push("  2. codex CLI 설치 + `codex login` 으로 ~/.codex/auth.json 구성");
    lines.push("  3. `.onto/config.yml` 의 `review:` axis block 을 재구성 — 특히 `subagent.provider` 가 " +
        "현재 host 에서 사용 불가능하지 않은지 확인 (`onto onboard --re-detect` 추천)");
    lines.push("  4. LiteLLM 프록시 사용 시 `llm_base_url` 또는 `LITELLM_BASE_URL` 설정");
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
    topologyId;
    constructor(topologyId) {
        super(buildUnsupportedTopologyMessage(topologyId));
        this.topologyId = topologyId;
        this.name = "UnsupportedTopologyError";
    }
}
function buildUnsupportedTopologyMessage(id) {
    const supported = [...PR_A_SUPPORTED_TOPOLOGIES].join(", ");
    const landingPr = id === "cc-teams-agent-subagent" ||
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
export function assertSupportedInPrA(topology) {
    if (!PR_A_SUPPORTED_TOPOLOGIES.has(topology.id)) {
        throw new UnsupportedTopologyError(topology.id);
    }
}
// ---------------------------------------------------------------------------
// P2 axis-first helper (Review UX Redesign)
// ---------------------------------------------------------------------------
/**
 * Attempt to derive a `TopologyId` from the `review:` axis block.
 *
 * Semantics (P9.1, 2026-04-21):
 *   - `review:` absent → return `null`. Caller (`resolveExecutionTopology`)
 *     attempts `main_native` degrade directly, since the legacy priority
 *     ladder was retired in P9.1.
 *   - `review:` present but validation / derivation / mapping fails →
 *     attempt a `main_native` degrade here. Emit a `[topology] degraded:
 *     requested=<hint> → actual=main_native (reason: ...)` trace line and
 *     map the `main_native` shape against the current host signals. If
 *     that mapping succeeds, return its TopologyId.
 *   - Only when `main_native` itself is unmappable (neither Claude nor
 *     Codex host) do we return `null`, signaling the caller to produce
 *     a `no_host` result.
 *
 * Why a single degrade step, not a chain: the design restricts fallback
 * to exactly one level (`main_native`) to keep the trace legible and
 * avoid a silently-traversed cascade. More-specific topologies require
 * explicit opt-in via the axis block; the degrade path is the safety
 * net, not an opinionated retry.
 *
 * The degrade trace's `requested=` string is the best-available hint of
 * the user's intent:
 *   - validation failure   → "<validation-failed>" (no narrowed config)
 *   - derivation failure   → last-known axis hint (e.g. "a2a-deliberation"
 *                              or "teamlead=external(codex)")
 *   - mapping failure      → the derived shape string, optionally with
 *                              the foreign provider (e.g. "main_foreign(litellm)").
 */
function resolveAxisFirstTopology(config, signals, log) {
    const reviewBlock = config.review;
    if (reviewBlock === undefined) {
        return null;
    }
    const validation = validateReviewConfig(reviewBlock);
    if (!validation.ok) {
        log("review-axes: validation failed");
        for (const err of validation.errors) {
            log(`review-axes: invalid — ${err.path}: ${err.message}`);
        }
        return attemptMainNativeDegrade({
            requested: "<validation-failed>",
            reason: `config.review validation failed (${validation.errors.length} error(s))`,
            signals,
            log,
        });
    }
    const derivationSignals = {
        claudeHost: signals.claudeHost,
        codexSessionActive: signals.codexSessionActive,
        experimentalAgentTeams: signals.experimentalAgentTeams,
    };
    const derivation = deriveTopologyShape(validation.config, derivationSignals);
    for (const line of derivation.ok ? derivation.derived.trace : derivation.trace) {
        log(`review-axes: ${line}`);
    }
    if (!derivation.ok) {
        log("review-axes: shape derivation failed");
        for (const reason of derivation.reasons) {
            log(`review-axes: ${reason}`);
        }
        const requestedHint = describeDerivationIntent(validation.config);
        const reasonLine = derivation.reasons[0] ?? "shape derivation failed";
        return attemptMainNativeDegrade({
            requested: requestedHint,
            reason: reasonLine,
            signals,
            log,
        });
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
        log("review-axes: shape→TopologyId mapping failed");
        log(`review-axes: ${mapping.reason}`);
        const providerSuffix = derivation.derived.subagent_provider
            ? `(${derivation.derived.subagent_provider})`
            : "";
        const requestedHint = `${derivation.derived.shape}${providerSuffix}`;
        return attemptMainNativeDegrade({
            requested: requestedHint,
            reason: mapping.reason,
            signals,
            log,
        });
    }
    log(`review-axes: derived TopologyId=${mapping.topology_id}`);
    return mapping.topology_id;
}
/**
 * Emit the `[topology] degraded: requested=... → actual=main_native (reason: ...)`
 * trace line, then attempt to map the `main_native` shape against the
 * current host signals. Returns the resulting TopologyId on success, or
 * `null` when `main_native` itself is unmappable (neither Claude nor
 * Codex host available — caller produces `no_host`).
 */
function attemptMainNativeDegrade(args) {
    const { requested, reason, signals, log } = args;
    log(`degraded: requested=${requested} → actual=main_native (reason: ${reason})`);
    const mapping = shapeToTopologyId({
        shape: "main_native",
        subagent_provider: null,
        signals: {
            claudeHost: signals.claudeHost,
            codexSessionActive: signals.codexSessionActive,
        },
    });
    for (const line of mapping.trace) {
        log(`degrade-fallback: ${line}`);
    }
    if (!mapping.ok) {
        log("degrade-fallback: main_native unmappable (no Claude/Codex host) — resolver will return no_host");
        return null;
    }
    log(`degrade-fallback: resolved TopologyId=${mapping.topology_id}`);
    return mapping.topology_id;
}
/**
 * Produce a short human-readable intent hint from a validated review
 * config when derivation fails. Used as the `requested=` field in the
 * degrade trace so operators can reconstruct "what did the user actually
 * ask for" from STDERR alone.
 *
 * Ordering of hint precedence:
 *   1. a2a deliberation (highest-signal user intent)
 *   2. external teamlead provider
 *   3. foreign subagent provider
 *   4. plain "main+native" (unusual — derivation rarely fails here)
 */
function describeDerivationIntent(config) {
    if (config.lens_deliberation === "sendmessage-a2a") {
        return "a2a-deliberation";
    }
    if (config.teamlead && config.teamlead.model !== "main") {
        return `teamlead=external(${config.teamlead.model.provider})`;
    }
    if (config.subagent && config.subagent.provider !== "main-native") {
        return `subagent=${config.subagent.provider}`;
    }
    return "main+native";
}
