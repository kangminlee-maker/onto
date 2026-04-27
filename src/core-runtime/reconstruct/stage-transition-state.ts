// runtime-mirror-of: step-2-rationale-proposer §6.2
//
// Hook α stage_transition_state — 7 enum state machine.
// Persisted at meta.stage_transition_state in wip.yml. Atomic write + fsync
// for crash recovery (resumption logic re-enters by reading the persisted
// state).

export type StageTransitionState =
  | "pre_alpha" // Stage 1 finalize 후, Hook α 진입 전
  | "alpha_skipped" // inference_mode == none 또는 entity_list empty
  | "alpha_in_progress" // Proposer spawn 직전 ~ directive apply 직전
  | "alpha_completed" // directive apply 완료
  | "alpha_failed_retry_pending" // full failure 후 retry 대기 (Principal 응답 미수신)
  | "alpha_failed_continued_v0" // Principal [v] Switch to v0-only
  | "alpha_failed_aborted"; // Principal [a] Abort

export const RESUMABLE_HOOK_ALPHA_STATES = new Set<StageTransitionState>([
  "pre_alpha",
  "alpha_in_progress",
  "alpha_failed_retry_pending",
]);

export const STAGE_2_GATEABLE_STATES = new Set<StageTransitionState>([
  "alpha_skipped",
  "alpha_completed",
  "alpha_failed_continued_v0",
]);

export const SESSION_TERMINATED_STATES = new Set<StageTransitionState>([
  "alpha_failed_aborted",
]);

/**
 * Pure resumption decision: given the persisted state, what does the runtime
 * do next?
 *
 * - "reenter_hook_alpha"  → Hook α flow 재진입 (pre_alpha / in_progress /
 *                           retry_pending). retry_pending 의 경우 retry_count
 *                           를 atomic increment 한 후 진입
 * - "advance_to_stage_2"  → Stage 2 exploration 바로 (skipped / completed /
 *                           continued_v0). 후자 2개는 entity_intent_inferences
 *                           가 v0 baseline 으로 empty
 * - "session_terminated"  → 세션 종료. Principal 이 재실행 결정 필요
 */
export type ResumptionDecision =
  | "reenter_hook_alpha"
  | "advance_to_stage_2"
  | "session_terminated";

export function decideResumption(
  state: StageTransitionState,
): ResumptionDecision {
  switch (state) {
    case "pre_alpha":
    case "alpha_in_progress":
    case "alpha_failed_retry_pending":
      return "reenter_hook_alpha";
    case "alpha_skipped":
    case "alpha_completed":
    case "alpha_failed_continued_v0":
      return "advance_to_stage_2";
    case "alpha_failed_aborted":
      return "session_terminated";
  }
}

/**
 * State machine transition events (Step 2 §6.2 r2~r3 canonical flow):
 *
 * pre_alpha + precondition_skip          → alpha_skipped (also sets meta.stage = 2)
 * pre_alpha + spawn_proposer             → alpha_in_progress
 * alpha_in_progress + apply_success      → alpha_completed (also sets meta.stage = 2)
 * alpha_in_progress + directive_failure  → alpha_failed_retry_pending
 * alpha_failed_retry_pending + retry     → alpha_in_progress  (retry_count++ before)
 * alpha_failed_retry_pending + v0_switch → alpha_failed_continued_v0 (sets meta.stage = 2)
 * alpha_failed_retry_pending + abort     → alpha_failed_aborted (preserve meta.stage = 1)
 */
export type StageTransitionEvent =
  | "precondition_skip"
  | "spawn_proposer"
  | "apply_success"
  | "directive_failure"
  | "retry"
  | "v0_switch"
  | "abort";

export interface StageTransitionTransitionResult {
  next: StageTransitionState;
  /** target meta.stage value after the transition. null = unchanged */
  setMetaStage: 1 | 2 | null;
}

const TRANSITIONS: Record<
  StageTransitionState,
  Partial<Record<StageTransitionEvent, StageTransitionTransitionResult>>
> = {
  pre_alpha: {
    precondition_skip: { next: "alpha_skipped", setMetaStage: 2 },
    spawn_proposer: { next: "alpha_in_progress", setMetaStage: null },
  },
  alpha_skipped: {},
  alpha_in_progress: {
    apply_success: { next: "alpha_completed", setMetaStage: 2 },
    directive_failure: {
      next: "alpha_failed_retry_pending",
      setMetaStage: null,
    },
  },
  alpha_completed: {},
  alpha_failed_retry_pending: {
    retry: { next: "alpha_in_progress", setMetaStage: null },
    v0_switch: { next: "alpha_failed_continued_v0", setMetaStage: 2 },
    abort: { next: "alpha_failed_aborted", setMetaStage: null },
  },
  alpha_failed_continued_v0: {},
  alpha_failed_aborted: {},
};

/**
 * Returns the next state + meta.stage set value, or throws if the (state,
 * event) pair is not a legal transition. Caller is responsible for fsync
 * after applying the result.
 */
export function applyStageTransitionEvent(
  current: StageTransitionState,
  event: StageTransitionEvent,
): StageTransitionTransitionResult {
  const allowed = TRANSITIONS[current][event];
  if (!allowed) {
    throw new Error(
      `illegal transition: ${current} + ${event} (allowed events: ${Object.keys(
        TRANSITIONS[current],
      ).join(", ") || "none — terminal"})`,
    );
  }
  return allowed;
}
