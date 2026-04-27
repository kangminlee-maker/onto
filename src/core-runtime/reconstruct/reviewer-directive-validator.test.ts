// runtime-mirror-of: step-3-rationale-reviewer §3.8 + §3.8.1

import { describe, expect, it } from "vitest";
import { validateReviewerDirective } from "./reviewer-directive-validator.js";
import type { ReviewerValidatorInput } from "./reviewer-directive-validator.js";
import type {
  ReviewerDirective,
  ReviewerDirectiveProvenance,
} from "./reviewer-directive-types.js";
import type { IntentInference } from "./wip-element-types.js";

function inferenceProposed(): IntentInference {
  return {
    rationale_state: "proposed",
    inferred_meaning: "m",
    justification: "j",
    domain_refs: [{ manifest_ref: "concepts.md", heading: "## A", excerpt: "x" }],
    confidence: "high",
    provenance: {
      proposed_at: "2026-04-27T12:00:00.000Z",
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

function baseInput(
  overrides: Partial<ReviewerValidatorInput> = {},
): ReviewerValidatorInput {
  const inferences = new Map<string, IntentInference | undefined>();
  inferences.set("E1", inferenceProposed());
  inferences.set("E2", inferenceEmpty()); // Stage 2-added entity
  inferences.set("E3", inferenceProposed());
  return {
    elementInferences: inferences,
    manifestReferencedFiles: [
      "concepts.md",
      "structure_spec.md",
      "logic_rules.md",
      "domain_scope.md",
      "auxiliary.md",
    ],
    injectedFiles: [
      "concepts.md",
      "structure_spec.md",
      "logic_rules.md",
      "domain_scope.md",
    ],
    optionalFiles: new Set(["auxiliary.md"]),
    expectedManifestSchemaVersion: "1.0",
    expectedDomainManifestHash: "sha256:abc123",
    expectedWipSnapshotHash: "wip-hash-abc",
    expectedDomainFilesContentHash: "files-hash-xyz",
    ...overrides,
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
    wip_snapshot_hash: "wip-hash-abc",
    domain_files_content_hash: "files-hash-xyz",
    hash_algorithm: "yaml@2.8.2 + sha256",
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: [
      "concepts.md",
      "structure_spec.md",
    ],
    ...overrides,
  };
}

describe("validateReviewerDirective — happy path", () => {
  it("accepts variable-length updates (selective partial output)", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "confirm",
          reason: "verified",
        },
        {
          target_element_id: "E2",
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
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual([]);
  });

  it("accepts empty updates array (Reviewer judges nothing — selective partial)", () => {
    const directive: ReviewerDirective = {
      updates: [],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
  });
});

describe("validateReviewerDirective — 12 reject conditions (§3.8)", () => {
  it("rule 1: duplicate target_element_id", () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E1", operation: "confirm" },
        { target_element_id: "E1", operation: "confirm" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("duplicate_target_element_id");
  });

  it("rule 2: hallucinated target_element_id", () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E_FAKE", operation: "confirm" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("hallucinated_target_element_id");
  });

  it("rule 3: invalid operation enum", () => {
    const directive = {
      updates: [
        { target_element_id: "E1", operation: "weird_op" },
      ],
      provenance: baseProvenance(),
    } as unknown as ReviewerDirective;
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("invalid_operation");
  });

  it("rule 4: revise missing new_inferred_meaning", () => {
    const directive = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_justification: "j",
          new_domain_refs: [],
          new_confidence: "low",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    } as unknown as ReviewerDirective;
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("operation_field_violation");
  });

  it("rule 5: confirm forbids inferred_meaning", () => {
    const directive = {
      updates: [
        {
          target_element_id: "E1",
          operation: "confirm",
          inferred_meaning: "should not be here",
        },
      ],
      provenance: baseProvenance(),
    } as unknown as ReviewerDirective;
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("operation_field_violation");
  });

  it("rule 6: hallucinated manifest_ref", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "fake.md", heading: "## A", excerpt: "x" },
          ],
          new_confidence: "low",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("hallucinated_manifest_ref");
  });

  it("rule 7: uninjected manifest_ref (manifest 에는 있지만 injected 안 됨)", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "auxiliary.md", heading: "## A", excerpt: "x" },
          ],
          new_confidence: "low",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("uninjected_manifest_ref");
  });

  it("rule 8: populate_stage2_rationale on non-empty target", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1", // not empty
          operation: "populate_stage2_rationale",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          ],
          new_confidence: "low",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("populate_stage2_target_not_empty");
  });

  it("rule 9: provenance.manifest_schema_version mismatch", () => {
    const directive: ReviewerDirective = {
      updates: [],
      provenance: baseProvenance({ manifest_schema_version: "9.99" }),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provenance_mismatch");
  });

  it("rule 10: wip_snapshot_hash mismatch", () => {
    const directive: ReviewerDirective = {
      updates: [],
      provenance: baseProvenance({ wip_snapshot_hash: "wrong-hash" }),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("wip_snapshot_hash_mismatch");
  });

  it("rule 11: revise on empty target", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E2", // empty
          operation: "revise",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [],
          new_confidence: "low",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("non_populate_target_is_empty");
  });

  it("rule 12: domain_files_content_hash mismatch", () => {
    const directive: ReviewerDirective = {
      updates: [],
      provenance: baseProvenance({ domain_files_content_hash: "wrong" }),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("domain_files_content_hash_mismatch");
  });
});

describe("validateReviewerDirective — §3.8.1 downgrades", () => {
  it("D1: revise high with 1 ref → medium + warning", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          ],
          new_confidence: "high",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings[0]!.rule).toBe("D1");
    const u = r.directive.updates[0]!;
    if (u.operation !== "revise") throw new Error("expected revise");
    expect(u.new_confidence).toBe("medium");
  });

  it("D2: populate_stage2 with 0 refs → low (absolute)", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E2",
          operation: "populate_stage2_rationale",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [],
          new_confidence: "high",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings[0]!.rule).toBe("D2");
    const u = r.directive.updates[0]!;
    if (u.operation !== "populate_stage2_rationale") throw new Error();
    expect(u.new_confidence).toBe("low");
  });

  it("D3: revise medium with all-optional refs → low", () => {
    const directive: ReviewerDirective = {
      updates: [
        {
          target_element_id: "E1",
          operation: "revise",
          new_inferred_meaning: "m",
          new_justification: "j",
          new_domain_refs: [
            { manifest_ref: "auxiliary.md", heading: "## A", excerpt: "x" },
          ],
          new_confidence: "medium",
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, {
      ...baseInput(),
      injectedFiles: [
        "concepts.md",
        "structure_spec.md",
        "logic_rules.md",
        "domain_scope.md",
        "auxiliary.md",
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => w.rule === "D3")).toBe(true);
    const u = r.directive.updates[0]!;
    if (u.operation !== "revise") throw new Error();
    expect(u.new_confidence).toBe("low");
  });

  it("confirm + mark_* operations get no downgrade (no new_confidence)", () => {
    const directive: ReviewerDirective = {
      updates: [
        { target_element_id: "E1", operation: "confirm" },
        {
          target_element_id: "E3",
          operation: "mark_domain_pack_incomplete",
          state_reason: "missing concept",
          new_domain_refs: [
            { manifest_ref: "domain_scope.md", heading: "## scope", excerpt: "z" },
          ],
          reason: "r",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateReviewerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual([]);
  });
});
