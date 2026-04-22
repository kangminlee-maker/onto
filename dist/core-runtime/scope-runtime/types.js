// ─── States ───
export const STATES = [
    "draft",
    "grounded",
    "exploring",
    "align_proposed",
    "align_locked",
    "surface_iterating",
    "surface_confirmed",
    "constraints_resolved",
    "target_locked",
    "compiled",
    "applied",
    "validated",
    "closed",
    "deferred",
    "rejected",
];
export const TERMINAL_STATES = new Set([
    "closed",
    "deferred",
    "rejected",
]);
// ─── Event Types ───
// Transition events: state changes defined in the matrix
export const TRANSITION_EVENT_TYPES = [
    "scope.created",
    "scope.closed",
    "input.attached",
    "grounding.started",
    "grounding.completed",
    "snapshot.marked_stale",
    "align.proposed",
    "align.revised",
    "align.locked",
    "redirect.to_grounding",
    "redirect.to_align",
    "surface.change_required",
    "surface.generated",
    "surface.revision_requested",
    "surface.revision_applied",
    "surface.confirmed",
    "constraint.discovered",
    "constraint.decision_recorded",
    "constraint.clarify_requested",
    "constraint.clarify_resolved",
    "constraint.invalidated",
    "target.locked",
    "compile.started",
    "compile.completed",
    "compile.constraint_gap_found",
    "apply.started",
    "apply.completed",
    "apply.decision_gap_found",
    "validation.started",
    "validation.completed",
    "exploration.started",
    "exploration.round_completed",
    "exploration.phase_transitioned",
];
// Global events: same behavior from every non-terminal state
export const GLOBAL_EVENT_TYPES = [
    "scope.deferred",
    "scope.rejected",
];
// Observational events: no state change, allowed in non-terminal states
export const OBSERVATIONAL_EVENT_TYPES = [
    "feedback.classified",
    "convergence.warning",
    "convergence.diagnosis",
    "convergence.blocked",
    "convergence.action_taken",
    "draft_packet.rendered",
    "constraint.evidence_updated",
    "prd.rendered",
    "pre_apply.review_completed",
    "prd.review_completed",
];
// ─── Source Key ───
export function sourceKey(entry) {
    switch (entry.type) {
        case "add-dir":
            return `add-dir:${entry.path}`;
        case "github-tarball":
            return `github-tarball:${entry.url}`;
        case "figma-mcp":
            return `figma-mcp:${entry.file_key}`;
        case "obsidian-vault":
            return `obsidian-vault:${entry.path}`;
        case "mcp":
            return `mcp:${entry.provider}`;
        default: {
            const _exhaustive = entry;
            throw new Error(`Unknown source type: ${entry.type}`);
        }
    }
}
// ─── Format Utilities ───
export function formatPerspective(p) {
    switch (p) {
        case "experience": return "Experience";
        case "code": return "Code";
        case "policy": return "Policy";
        default: return p;
    }
}
/** EvidenceStatus가 정책 문서에서 검증되지 않은 상태인지 판별 */
export function isEvidenceUnverified(status) {
    return status !== "verified";
}
/** Check if a constraint requires an external policy change process. */
export function isPolicyChangeRequired(c) {
    return (c.status !== "invalidated" &&
        c.decision === "inject" &&
        c.requires_policy_change === true);
}
