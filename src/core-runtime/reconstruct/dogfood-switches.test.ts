// runtime-mirror-of: step-4-integration §8.2 §8.3 + govern §14.6

import { describe, expect, it } from "vitest";
import {
  RECONSTRUCT_DOGFOOD_DEFAULTS,
  checkSwitchInvariants,
  isV0FallbackMode,
  isV1ModeFullyOn,
  loadReconstructDogfoodSwitches,
} from "./dogfood-switches.js";

describe("RECONSTRUCT_DOGFOOD_DEFAULTS (Step 4 §8.3)", () => {
  it("defaults all 3 switches to enabled = true (v1 mode)", () => {
    expect(RECONSTRUCT_DOGFOOD_DEFAULTS.v1_inference.enabled).toBe(true);
    expect(RECONSTRUCT_DOGFOOD_DEFAULTS.phase3_rationale_review.enabled).toBe(
      true,
    );
    expect(
      RECONSTRUCT_DOGFOOD_DEFAULTS.write_intent_inference_to_raw_yml.enabled,
    ).toBe(true);
  });

  it("is frozen (mutation rejected)", () => {
    expect(Object.isFrozen(RECONSTRUCT_DOGFOOD_DEFAULTS)).toBe(true);
    expect(Object.isFrozen(RECONSTRUCT_DOGFOOD_DEFAULTS.v1_inference)).toBe(
      true,
    );
  });
});

describe("loadReconstructDogfoodSwitches", () => {
  it("returns defaults when raw is null / undefined", () => {
    expect(loadReconstructDogfoodSwitches(null)).toEqual({
      v1_inference: { enabled: true },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: true },
    });
    expect(loadReconstructDogfoodSwitches(undefined)).toEqual({
      v1_inference: { enabled: true },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: true },
    });
  });

  it("merges partial overrides with defaults", () => {
    const result = loadReconstructDogfoodSwitches({
      phase3_rationale_review: { enabled: false },
    });
    expect(result.v1_inference.enabled).toBe(true);
    expect(result.phase3_rationale_review.enabled).toBe(false);
    expect(result.write_intent_inference_to_raw_yml.enabled).toBe(true);
  });

  it("reads all-off (v0 fallback) override", () => {
    const result = loadReconstructDogfoodSwitches({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: false },
      write_intent_inference_to_raw_yml: { enabled: false },
    });
    expect(isV0FallbackMode(result)).toBe(true);
    expect(isV1ModeFullyOn(result)).toBe(false);
  });

  it("rejects non-object root", () => {
    expect(() => loadReconstructDogfoodSwitches("nope")).toThrow(
      /must be an object/,
    );
    expect(() => loadReconstructDogfoodSwitches([1, 2, 3])).toThrow(
      /must be an object/,
    );
  });

  it("rejects non-object switch entry", () => {
    expect(() =>
      loadReconstructDogfoodSwitches({ v1_inference: "true" }),
    ).toThrow(/v1_inference must be an object/);
  });

  it("rejects non-boolean enabled", () => {
    expect(() =>
      loadReconstructDogfoodSwitches({
        v1_inference: { enabled: "yes" },
      }),
    ).toThrow(/v1_inference\.enabled must be a boolean/);
  });

  it("falls back to default when enabled is omitted within an entry", () => {
    const result = loadReconstructDogfoodSwitches({
      v1_inference: {},
    });
    expect(result.v1_inference.enabled).toBe(true);
  });
});

describe("checkSwitchInvariants — §8.3 inter-switch dependency", () => {
  it("passes when all switches are on", () => {
    expect(
      checkSwitchInvariants({
        v1_inference: { enabled: true },
        phase3_rationale_review: { enabled: true },
        write_intent_inference_to_raw_yml: { enabled: true },
      }),
    ).toEqual({ ok: true });
  });

  it("passes when all switches are off (v0 fallback — §14.6 invariant 1)", () => {
    expect(
      checkSwitchInvariants({
        v1_inference: { enabled: false },
        phase3_rationale_review: { enabled: false },
        write_intent_inference_to_raw_yml: { enabled: false },
      }),
    ).toEqual({ ok: true });
  });

  it("flags phase3_rationale_review on while v1_inference off", () => {
    const result = checkSwitchInvariants({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: false },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toContain(
        "phase3_rationale_review_requires_v1_inference",
      );
    }
  });

  it("flags write_intent_inference_to_raw_yml on while v1_inference off", () => {
    const result = checkSwitchInvariants({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: false },
      write_intent_inference_to_raw_yml: { enabled: true },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toContain(
        "write_intent_inference_to_raw_yml_requires_v1_inference",
      );
    }
  });

  it("reports both violations together when both sub-switches contradict v1_inference", () => {
    const result = checkSwitchInvariants({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: true },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toEqual([
        "phase3_rationale_review_requires_v1_inference",
        "write_intent_inference_to_raw_yml_requires_v1_inference",
      ]);
    }
  });

  it("permits sub-switches off while v1_inference on (subset disable)", () => {
    expect(
      checkSwitchInvariants({
        v1_inference: { enabled: true },
        phase3_rationale_review: { enabled: false },
        write_intent_inference_to_raw_yml: { enabled: false },
      }),
    ).toEqual({ ok: true });
  });
});

describe("isV1ModeFullyOn / isV0FallbackMode", () => {
  it("isV1ModeFullyOn requires all 3 enabled", () => {
    expect(isV1ModeFullyOn(RECONSTRUCT_DOGFOOD_DEFAULTS)).toBe(true);
    expect(
      isV1ModeFullyOn({
        v1_inference: { enabled: true },
        phase3_rationale_review: { enabled: false },
        write_intent_inference_to_raw_yml: { enabled: true },
      }),
    ).toBe(false);
  });

  it("isV0FallbackMode requires all 3 disabled", () => {
    expect(
      isV0FallbackMode({
        v1_inference: { enabled: false },
        phase3_rationale_review: { enabled: false },
        write_intent_inference_to_raw_yml: { enabled: false },
      }),
    ).toBe(true);
    expect(
      isV0FallbackMode({
        v1_inference: { enabled: false },
        phase3_rationale_review: { enabled: true },
        write_intent_inference_to_raw_yml: { enabled: false },
      }),
    ).toBe(false);
  });
});
