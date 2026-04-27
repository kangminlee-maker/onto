// runtime-mirror-of: step-2-rationale-proposer §6.2

import { describe, expect, it } from "vitest";
import {
  applyStageTransitionEvent,
  decideResumption,
  RESUMABLE_HOOK_ALPHA_STATES,
  SESSION_TERMINATED_STATES,
  STAGE_2_GATEABLE_STATES,
  type StageTransitionState,
} from "./stage-transition-state.js";

describe("stage_transition_state machine (W-A-88 substrate)", () => {
  describe("decideResumption — 7 states partition", () => {
    it.each<[StageTransitionState, "reenter_hook_alpha" | "advance_to_stage_2" | "session_terminated"]>([
      ["pre_alpha", "reenter_hook_alpha"],
      ["alpha_in_progress", "reenter_hook_alpha"],
      ["alpha_failed_retry_pending", "reenter_hook_alpha"],
      ["alpha_skipped", "advance_to_stage_2"],
      ["alpha_completed", "advance_to_stage_2"],
      ["alpha_failed_continued_v0", "advance_to_stage_2"],
      ["alpha_failed_aborted", "session_terminated"],
    ])("%s → %s", (state, expected) => {
      expect(decideResumption(state)).toBe(expected);
    });
  });

  describe("partition sets are exhaustive + disjoint", () => {
    const allStates: StageTransitionState[] = [
      "pre_alpha",
      "alpha_skipped",
      "alpha_in_progress",
      "alpha_completed",
      "alpha_failed_retry_pending",
      "alpha_failed_continued_v0",
      "alpha_failed_aborted",
    ];

    it("every state is in exactly one partition", () => {
      for (const s of allStates) {
        const inResumable = RESUMABLE_HOOK_ALPHA_STATES.has(s) ? 1 : 0;
        const inGateable = STAGE_2_GATEABLE_STATES.has(s) ? 1 : 0;
        const inTerminated = SESSION_TERMINATED_STATES.has(s) ? 1 : 0;
        expect(inResumable + inGateable + inTerminated).toBe(1);
      }
    });
  });

  describe("applyStageTransitionEvent — legal transitions", () => {
    it("pre_alpha + precondition_skip → alpha_skipped + setMetaStage 2", () => {
      const r = applyStageTransitionEvent("pre_alpha", "precondition_skip");
      expect(r).toEqual({ next: "alpha_skipped", setMetaStage: 2 });
    });

    it("pre_alpha + spawn_proposer → alpha_in_progress (stage unchanged)", () => {
      const r = applyStageTransitionEvent("pre_alpha", "spawn_proposer");
      expect(r).toEqual({ next: "alpha_in_progress", setMetaStage: null });
    });

    it("alpha_in_progress + apply_success → alpha_completed + setMetaStage 2", () => {
      const r = applyStageTransitionEvent("alpha_in_progress", "apply_success");
      expect(r).toEqual({ next: "alpha_completed", setMetaStage: 2 });
    });

    it("alpha_in_progress + directive_failure → alpha_failed_retry_pending", () => {
      const r = applyStageTransitionEvent(
        "alpha_in_progress",
        "directive_failure",
      );
      expect(r).toEqual({
        next: "alpha_failed_retry_pending",
        setMetaStage: null,
      });
    });

    it("alpha_failed_retry_pending + retry → alpha_in_progress", () => {
      const r = applyStageTransitionEvent("alpha_failed_retry_pending", "retry");
      expect(r).toEqual({ next: "alpha_in_progress", setMetaStage: null });
    });

    it("alpha_failed_retry_pending + v0_switch → alpha_failed_continued_v0 + stage 2", () => {
      const r = applyStageTransitionEvent(
        "alpha_failed_retry_pending",
        "v0_switch",
      );
      expect(r).toEqual({
        next: "alpha_failed_continued_v0",
        setMetaStage: 2,
      });
    });

    it("alpha_failed_retry_pending + abort → alpha_failed_aborted (stage preserved)", () => {
      const r = applyStageTransitionEvent("alpha_failed_retry_pending", "abort");
      expect(r).toEqual({
        next: "alpha_failed_aborted",
        setMetaStage: null,
      });
    });
  });

  describe("applyStageTransitionEvent — illegal transitions throw", () => {
    it.each<[StageTransitionState, Parameters<typeof applyStageTransitionEvent>[1]]>([
      ["pre_alpha", "apply_success"], // can't apply before spawning
      ["pre_alpha", "retry"],
      ["alpha_in_progress", "precondition_skip"],
      ["alpha_in_progress", "v0_switch"],
      ["alpha_completed", "spawn_proposer"], // terminal-from-here
      ["alpha_skipped", "retry"],
      ["alpha_failed_continued_v0", "retry"],
      ["alpha_failed_aborted", "retry"],
    ])("%s + %s throws", (state, event) => {
      expect(() => applyStageTransitionEvent(state, event)).toThrow(
        /illegal transition/,
      );
    });
  });
});
