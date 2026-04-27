// runtime-mirror-of: step-3-rationale-reviewer §6.2

import { describe, expect, it } from "vitest";
import {
  applyStep2cTransitionEvent,
  decideStep2cResumption,
  isWithinRetryBound,
  PHASE_3_GATEABLE_STATES,
  RESUMABLE_HOOK_GAMMA_STATES,
  REVIEW_TERMINATED_STATES,
  type Step2cReviewState,
} from "./step2c-review-state.js";

describe("step2c_review_state machine (W-A-89 substrate)", () => {
  describe("decideStep2cResumption", () => {
    it.each<[Step2cReviewState, "reenter_phase_2_step_2" | "advance_to_phase_3" | "phase_2_blocked"]>([
      ["pre_gamma", "reenter_phase_2_step_2"],
      ["gamma_in_progress", "reenter_phase_2_step_2"],
      ["gamma_failed_retry_pending", "reenter_phase_2_step_2"],
      ["gamma_skipped", "advance_to_phase_3"],
      ["gamma_completed", "advance_to_phase_3"],
      ["gamma_failed_continued_degraded", "advance_to_phase_3"],
      ["gamma_failed_aborted", "phase_2_blocked"],
    ])("%s → %s", (state, expected) => {
      expect(decideStep2cResumption(state)).toBe(expected);
    });
  });

  describe("partition exhaustive + disjoint", () => {
    const allStates: Step2cReviewState[] = [
      "pre_gamma",
      "gamma_skipped",
      "gamma_in_progress",
      "gamma_completed",
      "gamma_failed_retry_pending",
      "gamma_failed_continued_degraded",
      "gamma_failed_aborted",
    ];
    it("every state is in exactly one partition", () => {
      for (const s of allStates) {
        const inResumable = RESUMABLE_HOOK_GAMMA_STATES.has(s) ? 1 : 0;
        const inGateable = PHASE_3_GATEABLE_STATES.has(s) ? 1 : 0;
        const inTerminated = REVIEW_TERMINATED_STATES.has(s) ? 1 : 0;
        expect(inResumable + inGateable + inTerminated).toBe(1);
      }
    });
  });

  describe("legal transitions", () => {
    it("pre_gamma + precondition_skip → gamma_skipped + retry_count 0", () => {
      const r = applyStep2cTransitionEvent("pre_gamma", "precondition_skip");
      expect(r.next).toBe("gamma_skipped");
      expect(r.setRetryCount).toBe(0);
      expect(r.incrementsRetryCount).toBe(false);
    });

    it("pre_gamma + spawn_reviewer → gamma_in_progress (no count change)", () => {
      const r = applyStep2cTransitionEvent("pre_gamma", "spawn_reviewer");
      expect(r.next).toBe("gamma_in_progress");
      expect(r.setRetryCount).toBeNull();
    });

    it("gamma_in_progress + apply_success → gamma_completed + retry_count 0 reset", () => {
      const r = applyStep2cTransitionEvent("gamma_in_progress", "apply_success");
      expect(r.next).toBe("gamma_completed");
      expect(r.setRetryCount).toBe(0);
    });

    it("gamma_in_progress + directive_failure → gamma_failed_retry_pending", () => {
      const r = applyStep2cTransitionEvent(
        "gamma_in_progress",
        "directive_failure",
      );
      expect(r.next).toBe("gamma_failed_retry_pending");
      expect(r.setRetryCount).toBeNull();
    });

    it("retry_pending + retry → gamma_in_progress + incrementsRetryCount true", () => {
      const r = applyStep2cTransitionEvent("gamma_failed_retry_pending", "retry");
      expect(r.next).toBe("gamma_in_progress");
      expect(r.incrementsRetryCount).toBe(true);
    });

    it("retry_pending + degraded_continue → continued_degraded (no retry reset)", () => {
      const r = applyStep2cTransitionEvent(
        "gamma_failed_retry_pending",
        "degraded_continue",
      );
      expect(r.next).toBe("gamma_failed_continued_degraded");
      expect(r.setRetryCount).toBeNull(); // structural leak 방지
    });

    it("retry_pending + abort → gamma_failed_aborted (no retry reset)", () => {
      const r = applyStep2cTransitionEvent("gamma_failed_retry_pending", "abort");
      expect(r.next).toBe("gamma_failed_aborted");
      expect(r.setRetryCount).toBeNull();
    });
  });

  describe("illegal transitions", () => {
    it.each<[Step2cReviewState, Parameters<typeof applyStep2cTransitionEvent>[1]]>([
      ["pre_gamma", "apply_success"],
      ["pre_gamma", "retry"],
      ["gamma_completed", "spawn_reviewer"],
      ["gamma_skipped", "retry"],
      ["gamma_in_progress", "precondition_skip"],
      ["gamma_failed_aborted", "retry"],
      ["gamma_failed_continued_degraded", "retry"],
    ])("%s + %s throws", (state, event) => {
      expect(() => applyStep2cTransitionEvent(state, event)).toThrow(
        /illegal step2c transition/,
      );
    });
  });

  describe("bounded cycle invariant", () => {
    it.each([
      [0, true],
      [1, true],
      [2, false],
      [-1, false],
      [1.5, false],
    ])("isWithinRetryBound(%i) = %s", (n, expected) => {
      expect(isWithinRetryBound(n as number)).toBe(expected);
    });
  });
});
