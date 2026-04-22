/**
 * Topology → ReviewUnitExecutor mapping — PR-B (2026-04-18).
 *
 * # What this module is
 *
 * A thin function seat that maps a resolved `ExecutionTopology` (from
 * `src/core-runtime/review/execution-topology-resolver.ts`) to the concrete
 * `ReviewUnitExecutorConfig` (bin + argv) used by
 * `executeReviewPromptExecution` to spawn each lens / synthesize unit.
 *
 * # Why it exists
 *
 * PR-A established topology as the primary decision seat. PR-B wires the
 * lens spawn path: for each canonical topology id, which executor binary
 * handles per-lens reasoning?
 *
 * The mapping is deterministic — it reads only `topology.lens_spawn_mechanism`:
 *
 *   - `codex-subprocess`          → codex-review-unit-executor.ts
 *   - `litellm-http`              → inline-http-review-unit-executor.ts
 *                                   (provider=litellm; base_url comes from
 *                                   topology context)
 *   - `claude-agent-tool`         → coordinator-start handoff path
 *                                   (no standalone executor binary; the
 *                                   Claude coordinator subagent spawns
 *                                   lens subagents via its own Agent tool)
 *   - `claude-teamcreate-member`  → PR-D (SendMessage A2A lifecycle)
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` decides WHICH topology applies.
 * - `mapTopologyToExecutorConfig()` (here) decides HOW to run each lens
 *   under that topology at the TS subprocess level.
 * - The TeamCreate teamlead layer (`cc-teams-*` variants vs `cc-main-*`)
 *   is an orthogonal coordinator-state-machine concern — same lens
 *   executor applies within either teamlead pattern.
 */
// ---------------------------------------------------------------------------
// PR-B support set (widened from PR-A)
// ---------------------------------------------------------------------------
/**
 * Topology ids whose lens spawn path is wired as of PR-B (2026-04-18).
 *
 * Added over PR-A's 3-option set: `cc-teams-agent-subagent` (1-1),
 * `cc-teams-codex-subprocess` (1-2), `cc-teams-litellm-sessions` (3-1).
 *
 * The `cc-teams-*` variants differ from their `cc-main-*` counterparts
 * only in the teamlead layer: `cc-teams-*` expects the Claude coordinator
 * subagent to invoke `TeamCreate` for an intermediate teamlead agent who
 * then dispatches per-lens subagents; `cc-main-*` has the coordinator
 * itself dispatch lens subagents directly. The **lens executor binary
 * is identical** in both cases — PR-B's delta is therefore (a) support
 * set widening, (b) coordinator handoff enrichment so the coordinator
 * state machine knows which pattern to apply.
 *
 * Still not spawn-supported after PR-B:
 *   - `cc-teams-lens-agent-deliberation` (1-0) — PR-D (SendMessage A2A)
 *   - `codex-nested-subprocess` (codex-A)      — PR-C (outer codex teamlead)
 *   - `generic-nested-subagent` / `generic-main-subagent` — future
 */
export const PR_B_SUPPORTED_TOPOLOGIES = new Set([
    "cc-main-agent-subagent",
    "cc-main-codex-subprocess",
    "codex-main-subprocess",
    "cc-teams-agent-subagent",
    "cc-teams-codex-subprocess",
    "cc-teams-litellm-sessions",
]);
/**
 * Mechanisms whose executor binary lives in the onto TS distribution.
 *
 * `claude-agent-tool` is NOT in this set — there is no standalone binary
 * for it; lens subagents are spawned by the Claude coordinator via its
 * own Agent tool invocation, not via `child_process.spawn` from TS.
 */
const TS_EXECUTABLE_MECHANISMS = new Set([
    "codex-subprocess",
    "litellm-http",
]);
/**
 * True when the topology's lens spawn mechanism resolves to a TS-executable
 * binary (`codex-review-unit-executor.ts` or
 * `inline-http-review-unit-executor.ts`), i.e. the caller can invoke
 * `mapTopologyToExecutorConfig()` and feed the result to
 * `executeReviewPromptExecution()`.
 *
 * For `claude-agent-tool` topologies the caller must route via the
 * coordinator-start handoff instead — no subprocess executor exists.
 */
export function hasStandaloneLensExecutor(topology) {
    return TS_EXECUTABLE_MECHANISMS.has(topology.lens_spawn_mechanism);
}
// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------
export class TopologyExecutorMappingError extends Error {
    topologyId;
    reason;
    constructor(topologyId, reason) {
        super(`ExecutionTopology id="${topologyId}" 를 ReviewUnitExecutor 로 매핑할 수 없습니다: ${reason}`);
        this.topologyId = topologyId;
        this.reason = reason;
        this.name = "TopologyExecutorMappingError";
    }
}
// ---------------------------------------------------------------------------
// Executor config builders (delegate to existing binary paths)
// ---------------------------------------------------------------------------
/**
 * Path resolution mirrors the legacy `buildExecutorConfigFromRealization`
 * pattern in review-invoke.ts — relative to `ontoHome/dist/core-runtime/cli/*`.
 *
 * Kept local (not imported from review-invoke) to avoid circular imports
 * — review-invoke.ts already imports from cli/run-review-prompt-execution,
 * and this module imports from cli/run-review-prompt-execution's type
 * exports. Direct dependency on review-invoke would close the cycle.
 */
import path from "node:path";
function codexExecutorConfig(ontoHome) {
    return {
        bin: "node",
        args: [path.join(ontoHome, "dist", "core-runtime", "cli", "codex-review-unit-executor.js")],
    };
}
function inlineHttpExecutorConfig(ontoHome) {
    return {
        bin: "node",
        args: [
            path.join(ontoHome, "dist", "core-runtime", "cli", "inline-http-review-unit-executor.js"),
        ],
    };
}
// ---------------------------------------------------------------------------
// Main mapping function
// ---------------------------------------------------------------------------
/**
 * Map a resolved topology to the review-unit executor that handles each
 * lens / synthesize invocation under that topology.
 *
 * Throws `TopologyExecutorMappingError` when:
 *   - The topology id is not in `PR_B_SUPPORTED_TOPOLOGIES` (caller should
 *     not reach this function for unsupported ids; guard upstream).
 *   - The lens_spawn_mechanism requires a TS-invisible dispatch path
 *     (`claude-agent-tool`, `claude-teamcreate-member`) —
 *     these are not subprocess executors; see `hasStandaloneLensExecutor`.
 *
 * For topologies where the subagent_llm config contributes (litellm path),
 * the returned config's args do NOT yet include subagent_llm CLI flags;
 * the caller (review-invoke's `resolveExecutorConfig` or equivalent) is
 * responsible for appending those based on OntoConfig. This module's
 * scope is mechanism→binary, not config→argv.
 */
export function mapTopologyToExecutorConfig(topology, ontoHome, _ontoConfig) {
    if (!PR_B_SUPPORTED_TOPOLOGIES.has(topology.id)) {
        throw new TopologyExecutorMappingError(topology.id, `PR-B 지원 set 밖. 지원되는 옵션: ${[...PR_B_SUPPORTED_TOPOLOGIES].join(", ")}`);
    }
    switch (topology.lens_spawn_mechanism) {
        case "codex-subprocess":
            return codexExecutorConfig(ontoHome);
        case "litellm-http":
            return inlineHttpExecutorConfig(ontoHome);
        case "claude-agent-tool":
            throw new TopologyExecutorMappingError(topology.id, "claude-agent-tool lens spawn 은 coordinator-start handoff 로 route 하세요 " +
                "(Claude coordinator subagent 가 Agent tool 로 lens subagent 를 spawn). " +
                "Subprocess executor 가 존재하지 않습니다.");
        case "claude-teamcreate-member":
            throw new TopologyExecutorMappingError(topology.id, "claude-teamcreate-member lens spawn 은 PR-D 에서 제공 예정 " +
                "(SendMessage A2A deliberation lifecycle).");
    }
}
/** Drop `plan_trace` for handoff transmission. */
export function toCoordinatorTopologyDescriptor(topology) {
    return {
        id: topology.id,
        teamlead_location: topology.teamlead_location,
        lens_spawn_mechanism: topology.lens_spawn_mechanism,
        max_concurrent_lenses: topology.max_concurrent_lenses,
        transport_rank: topology.transport_rank,
        deliberation_channel: topology.deliberation_channel,
    };
}
