import { TERMINAL_STATES, OBSERVATIONAL_EVENT_TYPES } from "./types.js";
const OBSERVATIONAL_SET = new Set(OBSERVATIONAL_EVENT_TYPES);
// State × TransitionEvent matrix.
// Only explicitly listed combinations are allowed. Everything else is denied.
const MATRIX = {
    // ── draft ──
    draft: {
        "input.attached": { next: "draft", kind: "self" },
        "grounding.started": { next: "draft", kind: "self" },
        "grounding.completed": { next: "grounded", kind: "forward" },
        "constraint.discovered": { next: "draft", kind: "self" },
    },
    // ── grounded ──
    grounded: {
        "align.proposed": { next: "align_proposed", kind: "forward" },
        "constraint.discovered": { next: "grounded", kind: "self" },
        "snapshot.marked_stale": { next: "grounded", kind: "self" },
        "exploration.started": { next: "exploring", kind: "forward" },
    },
    // ── exploring ──
    exploring: {
        "exploration.round_completed": { next: "exploring", kind: "self" },
        "exploration.phase_transitioned": { next: "exploring", kind: "self" },
        "align.proposed": { next: "align_proposed", kind: "forward" },
        "constraint.discovered": { next: "exploring", kind: "self" },
        "snapshot.marked_stale": { next: "exploring", kind: "self" },
        "redirect.to_grounding": { next: "grounded", kind: "backward" },
    },
    // ── align_proposed ──
    align_proposed: {
        "align.locked": { next: "align_locked", kind: "forward" },
        "align.revised": { next: "align_proposed", kind: "self" },
        "snapshot.marked_stale": { next: "align_proposed", kind: "self" },
        "redirect.to_grounding": { next: "grounded", kind: "backward" },
    },
    // ── align_locked ──
    align_locked: {
        "surface.generated": { next: "surface_iterating", kind: "forward" },
        "snapshot.marked_stale": { next: "align_proposed", kind: "backward" },
    },
    // ── surface_iterating ──
    surface_iterating: {
        "surface.revision_requested": {
            next: "surface_iterating",
            kind: "self",
        },
        "surface.revision_applied": { next: "surface_iterating", kind: "self" },
        "surface.confirmed": { next: "surface_confirmed", kind: "forward" },
        "constraint.discovered": { next: "surface_iterating", kind: "self" },
        "redirect.to_align": { next: "align_proposed", kind: "backward" },
        "snapshot.marked_stale": { next: "surface_iterating", kind: "self" },
    },
    // ── surface_confirmed ──
    surface_confirmed: {
        "constraint.discovered": { next: "surface_confirmed", kind: "self" },
        "constraint.decision_recorded": {
            next: "surface_confirmed",
            kind: "self",
            conditional: ["constraints_resolved"],
        },
        "constraint.clarify_requested": {
            next: "surface_confirmed",
            kind: "self",
        },
        "constraint.clarify_resolved": {
            next: "surface_confirmed",
            kind: "self",
            conditional: ["constraints_resolved"],
        },
        "constraint.invalidated": {
            next: "surface_confirmed",
            kind: "self",
            conditional: ["constraints_resolved"],
        },
        "target.locked": { next: "target_locked", kind: "forward" },
        "surface.change_required": {
            next: "surface_iterating",
            kind: "backward",
        },
        "redirect.to_align": { next: "align_proposed", kind: "backward" },
        "snapshot.marked_stale": { next: "surface_confirmed", kind: "self" },
    },
    // ── constraints_resolved ──
    constraints_resolved: {
        "constraint.discovered": {
            next: "surface_confirmed",
            kind: "backward",
        },
        "constraint.decision_recorded": {
            next: "constraints_resolved",
            kind: "self",
        },
        "constraint.invalidated": { next: "constraints_resolved", kind: "self" },
        "target.locked": { next: "target_locked", kind: "forward" },
        "surface.change_required": {
            next: "surface_iterating",
            kind: "backward",
        },
        "redirect.to_align": { next: "align_proposed", kind: "backward" },
        "snapshot.marked_stale": { next: "constraints_resolved", kind: "self" },
    },
    // ── target_locked ──
    target_locked: {
        "constraint.discovered": { next: "target_locked", kind: "self" },
        "compile.started": { next: "target_locked", kind: "self" },
        "compile.completed": { next: "compiled", kind: "forward" },
        "compile.constraint_gap_found": {
            next: "constraints_resolved",
            kind: "backward",
        },
        "snapshot.marked_stale": {
            next: "constraints_resolved",
            kind: "backward",
        },
    },
    // ── compiled ──
    compiled: {
        "constraint.discovered": { next: "compiled", kind: "self" },
        "compile.constraint_gap_found": {
            next: "constraints_resolved",
            kind: "backward",
        },
        "apply.started": { next: "compiled", kind: "self" },
        "apply.completed": { next: "applied", kind: "forward" },
        "apply.decision_gap_found": {
            next: "constraints_resolved",
            kind: "backward",
        },
        "snapshot.marked_stale": { next: "grounded", kind: "backward" },
    },
    // ── applied ──
    applied: {
        "validation.started": { next: "applied", kind: "self" },
        "validation.completed": {
            next: "validated",
            kind: "forward",
            conditional: ["constraints_resolved", "grounded"],
        },
        "snapshot.marked_stale": { next: "applied", kind: "self" },
    },
    // ── validated ──
    validated: {
        "scope.closed": { next: "closed", kind: "forward" },
    },
};
// validation.completed has conditional next state (pass vs fail).
// The matrix records the default (pass → validated).
// Gate guard / pipeline handles fail variants.
// This is documented here for completeness but the conditional logic
// lives in gate-guard.ts (Phase 2).
// ─── Public API ───
/**
 * Check whether a transition event is allowed from the given state.
 * Returns the outcome (allowed + next state, or denied).
 */
export function canTransition(state, eventType) {
    const stateRow = MATRIX[state];
    if (!stateRow) {
        return { allowed: false };
    }
    const entry = stateRow[eventType];
    if (!entry) {
        return { allowed: false };
    }
    const result = {
        allowed: true,
        next_state: entry.next,
        kind: entry.kind,
    };
    if (entry.conditional) {
        result.conditional_targets = entry.conditional;
    }
    return result;
}
/**
 * Check whether a global event is allowed from the given state.
 * Global events (scope.deferred, scope.rejected) are allowed from every non-terminal state.
 */
export function canApplyGlobal(state, eventType) {
    if (TERMINAL_STATES.has(state)) {
        return { allowed: false };
    }
    const targetState = eventType === "scope.deferred" ? "deferred" : "rejected";
    return { allowed: true, next_state: targetState, kind: "forward" };
}
/**
 * Check whether an observational event is allowed from the given state.
 * Observational events are allowed in every non-terminal state.
 * They do not change state (state_after === state_before).
 */
export function canApplyObservational(state, _eventType) {
    if (TERMINAL_STATES.has(state)) {
        return { allowed: false };
    }
    return { allowed: true, next_state: state, kind: "self" };
}
/**
 * Unified check: given current state and any event type, return the transition outcome.
 */
export function resolveTransition(state, eventType) {
    // Global events
    if (eventType === "scope.deferred" || eventType === "scope.rejected") {
        return canApplyGlobal(state, eventType);
    }
    // Observational events
    if (OBSERVATIONAL_SET.has(eventType)) {
        return canApplyObservational(state, eventType);
    }
    // Transition events
    return canTransition(state, eventType);
}
/**
 * Get all allowed events from a given state (transition events only).
 * Useful for debugging and testing.
 */
export function allowedTransitionEvents(state) {
    const stateRow = MATRIX[state];
    if (!stateRow)
        return [];
    return Object.keys(stateRow);
}
// ═══════════════════════════════════════════════════════════════════
// Multi-domain state machine definitions (W-B-02 dedup)
//
// 본 파일이 모든 onto 프로세스 state machine 의 단일 SSOT.
// - Design scope: 위의 MATRIX (15 states)
// - Review coordinator: REVIEW_TRANSITIONS (9 states)
// - Reconstruct session: RECONSTRUCT_TRANSITIONS (8 states)
// ═══════════════════════════════════════════════════════════════════
// ─── Review coordinator (10 states) ───
// auto 3: preparing, validating_lenses, completing
// await 4: awaiting_lens_dispatch, awaiting_adjudication, awaiting_synthesize_dispatch, awaiting_deliberation
// terminal 3: completed, halted_partial, failed
export const REVIEW_STATES = [
    "preparing",
    "awaiting_lens_dispatch",
    "validating_lenses",
    "awaiting_adjudication",
    "awaiting_synthesize_dispatch",
    "awaiting_deliberation",
    "completing",
    "completed",
    "halted_partial",
    "failed",
];
export const REVIEW_TERMINAL_STATES = new Set([
    "completed",
    "halted_partial",
    "failed",
]);
export const REVIEW_TRANSITIONS = {
    "(init)": ["preparing"],
    preparing: ["awaiting_lens_dispatch", "failed"],
    awaiting_lens_dispatch: ["validating_lenses"],
    validating_lenses: ["awaiting_adjudication", "awaiting_synthesize_dispatch", "halted_partial", "failed"],
    awaiting_adjudication: ["awaiting_synthesize_dispatch", "failed"],
    awaiting_synthesize_dispatch: ["completing", "awaiting_deliberation"],
    awaiting_deliberation: ["completing"],
    completing: ["completed", "failed"],
    completed: [],
    halted_partial: [],
    failed: [],
};
/**
 * Review coordinator 전이 검증.
 */
export function canReviewTransition(from, to) {
    const allowed = REVIEW_TRANSITIONS[from];
    return allowed != null && allowed.includes(to);
}
// ─── Reconstruct session (8 states) ───
// build.md 의 Phase 0~4 를 형식화한 상태 모델.
// auto 4: negotiating, gathering_context, exploring, adjudicating
// await 2: awaiting_user_review, processing_responses
// terminal 2: converted, reconstruct_failed
export const RECONSTRUCT_STATES = [
    "negotiating",
    "gathering_context",
    "reconstruct_exploring",
    "adjudicating",
    "awaiting_user_review",
    "processing_responses",
    "converting",
    "converted",
    "reconstruct_failed",
];
export const RECONSTRUCT_TERMINAL_STATES = new Set([
    "converted",
    "reconstruct_failed",
]);
export const RECONSTRUCT_TRANSITIONS = {
    "(init)": ["negotiating"],
    negotiating: ["gathering_context", "reconstruct_failed"], // Phase 0
    gathering_context: ["reconstruct_exploring", "reconstruct_failed"], // Phase 0.5
    reconstruct_exploring: ["adjudicating", "reconstruct_failed"], // Phase 1 (Stage 1+2)
    adjudicating: ["awaiting_user_review", "reconstruct_failed"], // Phase 2
    awaiting_user_review: ["processing_responses", "reconstruct_failed"], // Phase 3
    processing_responses: ["converting", "awaiting_user_review", "reconstruct_failed"], // Phase 3.5 (re-entry 가능)
    converting: ["converted", "reconstruct_failed"], // Phase 4
    converted: [],
    reconstruct_failed: [],
};
/**
 * Reconstruct session 전이 검증.
 */
export function canReconstructTransition(from, to) {
    const allowed = RECONSTRUCT_TRANSITIONS[from];
    return allowed != null && allowed.includes(to);
}
