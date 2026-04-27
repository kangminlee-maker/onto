// runtime-mirror-of: step-3-rationale-reviewer §6.2 + §3.2~§3.6 + §3.7.2

import { describe, expect, it } from "vitest";
import {
  runHookGamma,
  shouldSkipHookGamma,
  type HookGammaDeps,
  type HookGammaInput,
  type ReviewerInputPackage,
} from "./hook-gamma.js";
import type {
  ReviewerDirective,
  ReviewerDirectiveProvenance,
} from "./reviewer-directive-types.js";
import type { IntentInference } from "./wip-element-types.js";

function inferenceProposed(): IntentInference {
  return {
    rationale_state: "proposed",
    inferred_meaning: "prior m",
    justification: "prior j",
    domain_refs: [{ manifest_ref: "concepts.md", heading: "## A", excerpt: "x" }],
    confidence: "high",
    provenance: {
      proposed_at: "2026-04-27T11:00:00.000Z",
      proposed_by: "rationale-proposer",
      proposer_contract_version: "1.0",
      manifest_schema_version: "1.0",
      domain_manifest_version: "0.3.0",
      domain_manifest_hash: "sha256:abc123",
      domain_quality_tier: "full",
      session_id: "S1",
      runtime_version: "v0.0.0",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: [
        "concepts.md",
        "structure_spec.md",
      ],
      gate_count: 1,
    },
  };
}

function inferenceEmpty(): IntentInference {
  return {
    rationale_state: "empty",
    provenance: {
      proposed_at: "",
      proposed_by: "rationale-proposer",
      proposer_contract_version: "",
      manifest_schema_version: "",
      domain_manifest_version: "",
      domain_manifest_hash: "",
      domain_quality_tier: "full",
      session_id: "",
      runtime_version: "",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: [],
      gate_count: 1,
    },
  };
}

function baseInput(overrides: Partial<HookGammaInput> = {}): HookGammaInput {
  const inferences = new Map<string, IntentInference | undefined>();
  inferences.set("E1", inferenceProposed());
  inferences.set("E2", inferenceEmpty());

  return {
    meta: {
      step2c_review_state: "pre_gamma",
      step2c_review_retry_count: 0,
      inference_mode: "full",
      stage_transition_state: "alpha_completed",
    },
    elementInferences: inferences,
    manifest: {
      manifest_schema_version: "1.0",
      domain_manifest_version: "0.3.0",
      version_hash: "sha256:abc123",
      quality_tier: "full",
      referenced_files: [
        { path: "concepts.md", required: true },
        { path: "structure_spec.md", required: true },
        { path: "auxiliary.md", required: false },
      ],
    },
    injectedFiles: ["concepts.md", "structure_spec.md"],
    wipSnapshotHash: "wip-hash",
    domainFilesContentHash: "files-hash",
    ...overrides,
  };
}

function makeDeps(directive: ReviewerDirective | (() => never)): HookGammaDeps {
  return {
    spawnReviewer: async (_: ReviewerInputPackage) => {
      if (typeof directive === "function") return directive();
      return directive;
    },
  };
}

function baseProvenance(
  overrides: Partial<ReviewerDirectiveProvenance> = {},
): ReviewerDirectiveProvenance {
  return {
    reviewed_at: "2026-04-27T12:30:00.000Z",
    reviewed_by: "rationale-reviewer",
    reviewer_contract_version: "1.0",
    manifest_schema_version: "1.0",
    domain_manifest_version: "0.3.0",
    domain_manifest_hash: "sha256:abc123",
    domain_quality_tier: "full",
    session_id: "S1",
    runtime_version: "v0.0.0",
    wip_snapshot_hash: "wip-hash",
    domain_files_content_hash: "files-hash",
    hash_algorithm: "yaml@2.8.2 + sha256",
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: ["concepts.md", "structure_spec.md"],
    ...overrides,
  };
}

describe("shouldSkipHookGamma (§6.2 step 2c-precondition)", () => {
  it.each<[Partial<HookGammaInput["meta"]>, string | null]>([
    [{ inference_mode: "none" }, "inference_mode_none"],
    [{ stage_transition_state: "alpha_skipped" }, "alpha_skipped"],
    [{ stage_transition_state: "alpha_failed_continued_v0" }, "alpha_failed_continued_v0"],
    [{ inference_mode: "full", stage_transition_state: "alpha_completed" }, null],
    [{ inference_mode: "degraded", stage_transition_state: "alpha_completed" }, null],
  ])("meta=%j → %s", (metaOverride, expected) => {
    const input = baseInput({
      meta: { ...baseInput().meta, ...metaOverride },
    });
    expect(shouldSkipHookGamma(input)).toBe(expected);
  });
});

describe("runHookGamma — happy path (5 operations)", () => {
  it("confirm increments gate_count + populates provenance-3", async () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E1", operation: "confirm", reason: "verified" },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.rationale_state).toBe("proposed"); // confirm 은 state 변경 없음
    expect(e1.inferred_meaning).toBe("prior m"); // prior 유지
    expect(e1.provenance.reviewed_at).toBe("2026-04-27T12:30:00.000Z");
    expect(e1.provenance.reviewed_by).toBe("rationale-reviewer");
    expect(e1.provenance.gate_count).toBe(2); // 1 → 2
  });

  it("revise replaces 4 fields + state→reviewed + state_reason→null + gate→2", async () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_inferred_meaning: "new m",
          new_justification: "new j",
          new_domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
            { manifest_ref: "structure_spec.md", heading: "## B", excerpt: "y" },
          ],
          new_confidence: "high",
          reason: "fix justification",
        },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error("not completed");
    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.rationale_state).toBe("reviewed");
    expect(e1.inferred_meaning).toBe("new m");
    expect(e1.confidence).toBe("high"); // ≥2 refs, no downgrade
    expect(e1.state_reason).toBeUndefined();
    expect(e1.provenance.gate_count).toBe(2);
  });

  it("mark_domain_scope_miss clears inference fields + preserves prior domain_refs when absent", async () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "mark_domain_scope_miss",
          state_reason: "out of scope",
          // new_domain_refs absent → preserve prior
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error();
    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.rationale_state).toBe("domain_scope_miss");
    expect(e1.state_reason).toBe("out of scope");
    expect(e1.inferred_meaning).toBeUndefined();
    expect(e1.justification).toBeUndefined();
    expect(e1.confidence).toBeUndefined();
    expect(e1.domain_refs).toEqual([
      { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
    ]); // prior preserved
  });

  it("mark_domain_scope_miss with empty new_domain_refs replaces (empty array intentional)", async () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "mark_domain_scope_miss",
          state_reason: "negative observation",
          new_domain_refs: [], // present but empty → replace
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error();
    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.domain_refs).toEqual([]);
  });

  it("mark_domain_pack_incomplete replaces domain_refs (≥1 required)", async () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "mark_domain_pack_incomplete",
          state_reason: "missing concept",
          new_domain_refs: [
            { manifest_ref: "structure_spec.md", heading: "## scope", excerpt: "z" },
          ],
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error();
    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.rationale_state).toBe("domain_pack_incomplete");
    expect(e1.domain_refs).toHaveLength(1);
    expect(e1.inferred_meaning).toBeUndefined();
  });

  it("populate_stage2_rationale: brand-new + proposed_by=rationale-reviewer + gate=1", async () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E2", // empty
          operation: "populate_stage2_rationale",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
            { manifest_ref: "structure_spec.md", heading: "## B", excerpt: "y" },
          ],
          new_confidence: "high",
          reason: "stage 2 add",
        },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error();
    const e2 = result.elementUpdates.get("E2")!;
    expect(e2.rationale_state).toBe("reviewed");
    expect(e2.confidence).toBe("high");
    expect(e2.provenance.proposed_by).toBe("rationale-reviewer"); // §3.6 r2 C-5 option A
    expect(e2.provenance.gate_count).toBe(1); // single-gate
    expect(e2.provenance.proposed_at).toBe(e2.provenance.reviewed_at); // same timestamp
  });
});

describe("runHookGamma — selective partial output", () => {
  it("directive-absent elements are not in elementUpdates (caller leaves unchanged)", async () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E1", operation: "confirm" },
        // E2 not in updates
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    if (result.kind !== "completed") throw new Error();
    expect(result.elementUpdates.has("E1")).toBe(true);
    expect(result.elementUpdates.has("E2")).toBe(false); // not touched
  });

  it("0 updates is legal (selective partial, completed)", async () => {
    const directive: ReviewerDirective = {
      updates: [],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.elementUpdates.size).toBe(0);
  });
});

describe("runHookGamma — skip path", () => {
  it("inference_mode=none → kind=skipped", async () => {
    const input = baseInput({
      meta: {
        step2c_review_state: "pre_gamma",
        step2c_review_retry_count: 0,
        inference_mode: "none",
        stage_transition_state: "alpha_completed",
      },
    });
    const result = await runHookGamma(input, makeDeps(() => {
      throw new Error("should not spawn");
    }));
    expect(result.kind).toBe("skipped");
    if (result.kind !== "skipped") return;
    expect(result.reason).toBe("inference_mode_none");
  });

  it("alpha_skipped → kind=skipped", async () => {
    const input = baseInput({
      meta: {
        step2c_review_state: "pre_gamma",
        step2c_review_retry_count: 0,
        inference_mode: "full",
        stage_transition_state: "alpha_skipped",
      },
    });
    const result = await runHookGamma(input, makeDeps(() => {
      throw new Error("should not spawn");
    }));
    expect(result.kind).toBe("skipped");
  });

  it("alpha_failed_continued_v0 → kind=skipped", async () => {
    const input = baseInput({
      meta: {
        step2c_review_state: "pre_gamma",
        step2c_review_retry_count: 0,
        inference_mode: "full",
        stage_transition_state: "alpha_failed_continued_v0",
      },
    });
    const result = await runHookGamma(input, makeDeps(() => {
      throw new Error("should not spawn");
    }));
    expect(result.kind).toBe("skipped");
  });
});

describe("runHookGamma — failure paths", () => {
  it("spawn throw → kind=failed code=spawn_failure", async () => {
    const result = await runHookGamma(
      baseInput(),
      makeDeps(() => {
        throw new Error("LLM unreachable");
      }),
    );
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.reject.code).toBe("spawn_failure");
  });

  it("validator reject propagates code", async () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E_FAKE", operation: "confirm" },
      ],
      provenance: baseProvenance(),
    };
    const result = await runHookGamma(baseInput(), makeDeps(directive));
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.reject.code).toBe("hallucinated_target_element_id");
  });
});

describe("runHookGamma — illegal invocation", () => {
  it.each(["gamma_skipped", "gamma_completed", "gamma_failed_continued_degraded", "gamma_failed_aborted"] as const)(
    "%s → illegal_invocation",
    async (state) => {
      const input = baseInput({
        meta: {
          step2c_review_state: state,
          step2c_review_retry_count: 0,
          inference_mode: "full",
          stage_transition_state: "alpha_completed",
        },
      });
      const result = await runHookGamma(input, makeDeps({
        updates: [],
        provenance: baseProvenance(),
      }));
      expect(result.kind).toBe("illegal_invocation");
    },
  );
});
