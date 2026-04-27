// runtime-mirror-of: step-3-rationale-reviewer §6.2
//
// Hook γ step2c_review_state — 7 enum state machine.
// Step 2 §6.2 의 stage_transition_state 와 동형이지만, Phase 2 Step 2c 에
// 한정. Bounded cycle invariant: gamma_in_progress ↔ gamma_failed_retry_pending
// 만 cycle, retry_count ≤ 1.
//
// retry_count reset rule (§6.2 r2 C-6):
//   - gamma_completed / gamma_skipped 도달 → 0 reset
//   - gamma_failed_continued_degraded / gamma_failed_aborted 도달 → reset 안 함

export type Step2cReviewState =
  | "pre_gamma"
  | "gamma_skipped"
  | "gamma_in_progress"
  | "gamma_completed"
  | "gamma_failed_retry_pending"
  | "gamma_failed_continued_degraded"
  | "gamma_failed_aborted";

export const RESUMABLE_HOOK_GAMMA_STATES = new Set<Step2cReviewState>([
  "pre_gamma",
  "gamma_in_progress",
  "gamma_failed_retry_pending",
]);

export const PHASE_3_GATEABLE_STATES = new Set<Step2cReviewState>([
  "gamma_skipped",
  "gamma_completed",
  "gamma_failed_continued_degraded",
]);

export const REVIEW_TERMINATED_STATES = new Set<Step2cReviewState>([
  "gamma_failed_aborted",
]);

export type Step2cResumptionDecision =
  | "reenter_phase_2_step_2"
  | "advance_to_phase_3"
  | "phase_2_blocked";

export function decideStep2cResumption(
  state: Step2cReviewState,
): Step2cResumptionDecision {
  switch (state) {
    case "pre_gamma":
    case "gamma_in_progress":
    case "gamma_failed_retry_pending":
      return "reenter_phase_2_step_2";
    case "gamma_skipped":
    case "gamma_completed":
    case "gamma_failed_continued_degraded":
      return "advance_to_phase_3";
    case "gamma_failed_aborted":
      return "phase_2_blocked";
  }
}

export type Step2cTransitionEvent =
  | "precondition_skip" // pre_gamma → gamma_skipped
  | "spawn_reviewer" // pre_gamma → gamma_in_progress
  | "apply_success" // gamma_in_progress → gamma_completed
  | "directive_failure" // gamma_in_progress → gamma_failed_retry_pending
  | "retry" // gamma_failed_retry_pending → gamma_in_progress (retry_count++)
  | "degraded_continue" // gamma_failed_retry_pending → gamma_failed_continued_degraded
  | "abort"; // gamma_failed_retry_pending → gamma_failed_aborted

export interface Step2cTransitionResult {
  next: Step2cReviewState;
  /** atomic retry_count value to write (null = unchanged) */
  setRetryCount: 0 | null;
  /** retry edge increments retry_count by 1; caller increments before calling */
  incrementsRetryCount: boolean;
}

const TRANSITIONS: Record<
  Step2cReviewState,
  Partial<Record<Step2cTransitionEvent, Step2cTransitionResult>>
> = {
  pre_gamma: {
    precondition_skip: {
      next: "gamma_skipped",
      setRetryCount: 0,
      incrementsRetryCount: false,
    },
    spawn_reviewer: {
      next: "gamma_in_progress",
      setRetryCount: null,
      incrementsRetryCount: false,
    },
  },
  gamma_skipped: {},
  gamma_in_progress: {
    apply_success: {
      next: "gamma_completed",
      setRetryCount: 0,
      incrementsRetryCount: false,
    },
    directive_failure: {
      next: "gamma_failed_retry_pending",
      setRetryCount: null,
      incrementsRetryCount: false,
    },
  },
  gamma_completed: {},
  gamma_failed_retry_pending: {
    retry: {
      next: "gamma_in_progress",
      setRetryCount: null,
      incrementsRetryCount: true, // caller atomic increment before applying
    },
    degraded_continue: {
      next: "gamma_failed_continued_degraded",
      setRetryCount: null, // do NOT reset (structural leak 방지)
      incrementsRetryCount: false,
    },
    abort: {
      next: "gamma_failed_aborted",
      setRetryCount: null, // do NOT reset
      incrementsRetryCount: false,
    },
  },
  gamma_failed_continued_degraded: {},
  gamma_failed_aborted: {},
};

export function applyStep2cTransitionEvent(
  current: Step2cReviewState,
  event: Step2cTransitionEvent,
): Step2cTransitionResult {
  const allowed = TRANSITIONS[current][event];
  if (!allowed) {
    throw new Error(
      `illegal step2c transition: ${current} + ${event} (allowed: ${Object.keys(
        TRANSITIONS[current],
      ).join(", ") || "none — terminal"})`,
    );
  }
  return allowed;
}

/**
 * Bounded cycle invariant check (§6.2 r3 R-SYN-1 + C-SYN-10).
 * retry_count ≤ 1; values > 1 indicate runtime invariant violation.
 */
export function isWithinRetryBound(retryCount: number): boolean {
  return Number.isInteger(retryCount) && retryCount >= 0 && retryCount <= 1;
}
