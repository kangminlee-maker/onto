import { buildConstraintPool, isConstraintsResolved } from "./constraint-pool.js";
/**
 * Compute the current ScopeState from an event sequence.
 *
 * Pure function — deterministic, no side effects, no external I/O.
 * Events MUST be sorted by revision (ascending). This is guaranteed
 * by event-store.readEvents() which reads events.ndjson line by line.
 */
export function reduce(events) {
    // ── Constraint pool (separate traversal) ──
    const constraint_pool = buildConstraintPool(events);
    // ── Single traversal for all other fields ──
    let scope_id = "";
    let title = "";
    let description = "";
    let entry_mode = "experience";
    let current_state = "draft";
    let direction;
    let scope_boundaries;
    let surface_hash;
    let surface_path;
    let grounding_sources;
    let lastGroundingRev = -1;
    let lastStaleRev = -1;
    let stale = false;
    let stale_sources;
    let stale_since;
    let lastBlockedRev = -1;
    let lastActionTakenRev = -1;
    let revision_count_align = 0;
    let revision_count_surface = 0;
    let retry_count_compile = 0;
    let validation_plan_hash;
    let validation_result;
    let last_backward_reason;
    const verdict_log = [];
    const feedback_history = [];
    let pre_apply_completed = false;
    let prd_review_completed = false;
    let exploration_progress;
    let latest_revision = 0;
    for (const evt of events) {
        current_state = evt.state_after;
        latest_revision = evt.revision;
        switch (evt.type) {
            // ── Scope ──
            case "scope.created": {
                const p = evt.payload;
                scope_id = evt.scope_id;
                title = p.title;
                description = p.description;
                entry_mode = p.entry_mode;
                break;
            }
            // ── Redirect (backward) ──
            case "redirect.to_grounding": {
                const p = evt.payload;
                last_backward_reason = p.reason;
                pre_apply_completed = false;
                prd_review_completed = false;
                // exploring → grounded: exploration_progress 초기화.
                // exploration-log.md(파일)는 보존되므로 맥락 소실 없음.
                if (exploration_progress && !exploration_progress.completed_at) {
                    exploration_progress = undefined;
                }
                break;
            }
            case "redirect.to_align": {
                const p = evt.payload;
                last_backward_reason = p.reason;
                pre_apply_completed = false;
                prd_review_completed = false;
                break;
            }
            case "surface.change_required": {
                const p = evt.payload;
                last_backward_reason = p.reason;
                break;
            }
            // ── Align ──
            case "align.locked": {
                const p = evt.payload;
                direction = p.locked_direction;
                scope_boundaries = p.locked_scope_boundaries;
                last_backward_reason = undefined;
                verdict_log.push({
                    type: "align.locked",
                    revision: evt.revision,
                    ts: evt.ts,
                    locked_direction: p.locked_direction,
                });
                break;
            }
            case "align.revised":
                revision_count_align++;
                break;
            // ── Surface ──
            case "surface.confirmed": {
                const p = evt.payload;
                surface_hash = p.final_content_hash;
                surface_path = p.final_surface_path;
                break;
            }
            case "surface.revision_applied":
                revision_count_surface++;
                break;
            // ── Grounding / Stale ──
            case "grounding.started": {
                const p = evt.payload;
                grounding_sources = p.sources;
                break;
            }
            case "grounding.completed": {
                lastGroundingRev = evt.revision;
                break;
            }
            case "snapshot.marked_stale": {
                const p = evt.payload;
                lastStaleRev = evt.revision;
                stale_sources = p.stale_sources;
                stale_since = evt.revision;
                break;
            }
            // ── Constraint decisions → verdict log ──
            case "constraint.decision_recorded": {
                const p = evt.payload;
                verdict_log.push({
                    type: "constraint.decision_recorded",
                    revision: evt.revision,
                    ts: evt.ts,
                    constraint_id: p.constraint_id,
                    decision: p.decision,
                    decision_owner: p.decision_owner,
                });
                break;
            }
            case "constraint.clarify_resolved": {
                const p = evt.payload;
                verdict_log.push({
                    type: "constraint.clarify_resolved",
                    revision: evt.revision,
                    ts: evt.ts,
                    constraint_id: p.constraint_id,
                    decision: p.decision,
                    decision_owner: p.decision_owner,
                });
                break;
            }
            // ── Compile retry tracking ──
            case "compile.constraint_gap_found":
                retry_count_compile++;
                pre_apply_completed = false;
                prd_review_completed = false;
                break;
            case "compile.completed": {
                const cp = evt.payload;
                retry_count_compile = 0;
                validation_plan_hash = cp.validation_plan_hash;
                break;
            }
            case "validation.completed": {
                const vp = evt.payload;
                validation_result = {
                    result: vp.result,
                    pass_count: vp.pass_count,
                    fail_count: vp.fail_count,
                    items: vp.items,
                };
                break;
            }
            // ── Convergence ──
            case "convergence.blocked":
                lastBlockedRev = evt.revision;
                break;
            case "convergence.action_taken":
                lastActionTakenRev = evt.revision;
                break;
            // ── Feedback ──
            case "feedback.classified":
                feedback_history.push(evt.payload);
                break;
            // ── Exploration ──
            case "exploration.started": {
                const p = evt.payload;
                exploration_progress = {
                    current_phase: 1,
                    current_phase_name: "목적 정밀화",
                    total_rounds: 0,
                    entry_mode: p.entry_mode,
                    decisions: [],
                    assumptions: [],
                    phase_history: [{ phase: 1, phase_name: "목적 정밀화", entered_at: evt.revision }],
                    completed_at: undefined,
                };
                break;
            }
            case "exploration.round_completed": {
                const p = evt.payload;
                if (exploration_progress) {
                    exploration_progress.total_rounds++;
                    for (const d of p.decisions) {
                        exploration_progress.decisions.push({
                            round: d.round,
                            phase: p.phase,
                            topic: p.topic,
                            question: d.question,
                            answer: d.answer,
                        });
                    }
                    if (p.assumptions_found) {
                        for (const a of p.assumptions_found) {
                            exploration_progress.assumptions.push({
                                content: a,
                                type: "discovered",
                                status: "unverified",
                                source_phase: p.phase,
                            });
                        }
                    }
                }
                break;
            }
            case "exploration.phase_transitioned": {
                const p = evt.payload;
                if (exploration_progress) {
                    exploration_progress.current_phase = p.to_phase;
                    const phaseNames = {
                        1: "목적 정밀화", 2: "영역 탐색", 3: "현재 상태 공유",
                        4: "시나리오 탐색", 5: "가정 검증", 6: "범위 합의",
                    };
                    exploration_progress.current_phase_name = phaseNames[p.to_phase] ?? `Phase ${p.to_phase}`;
                    exploration_progress.phase_history.push({
                        phase: p.to_phase,
                        phase_name: exploration_progress.current_phase_name,
                        entered_at: evt.revision,
                    });
                }
                break;
            }
            // ── Pre-Apply Review ──
            case "pre_apply.review_completed":
                pre_apply_completed = true;
                break;
            // ── PRD Multi-Perspective Review ──
            case "prd.review_completed":
                prd_review_completed = true;
                break;
            // ── Exploration completed (via align.proposed) ──
            case "align.proposed": {
                if (exploration_progress && !exploration_progress.completed_at) {
                    exploration_progress.completed_at = evt.revision;
                }
                break;
            }
        }
    }
    // ── Derived fields ──
    stale = lastStaleRev > lastGroundingRev;
    // Clear stale detail when not stale
    if (!stale) {
        stale_sources = undefined;
        stale_since = undefined;
    }
    const compile_ready = isConstraintsResolved(constraint_pool) && !stale;
    const convergence_blocked = lastBlockedRev > -1 && lastBlockedRev > lastActionTakenRev;
    return {
        scope_id,
        title,
        description,
        entry_mode,
        current_state,
        direction,
        scope_boundaries,
        surface_hash,
        surface_path,
        grounding_sources,
        constraint_pool,
        last_backward_reason,
        stale,
        stale_sources,
        stale_since,
        compile_ready,
        convergence_blocked,
        revision_count_align,
        revision_count_surface,
        retry_count_compile,
        snapshot_revision: lastGroundingRev > 0 ? lastGroundingRev : 0,
        validation_plan_hash,
        validation_result,
        verdict_log,
        feedback_history,
        pre_apply_completed,
        prd_review_completed,
        exploration_progress,
        latest_revision,
    };
}
