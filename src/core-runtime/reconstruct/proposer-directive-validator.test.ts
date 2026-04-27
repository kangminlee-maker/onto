// runtime-mirror-of: step-2-rationale-proposer §3.7 + §3.7.1

import { describe, expect, it } from "vitest";
import { validateProposerDirective } from "./proposer-directive-validator.js";
import type { ProposerDirective } from "./proposer-directive-types.js";
import type { ValidatorInput } from "./proposer-directive-validator.js";

function baseInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  return {
    entityIds: ["E1", "E2"],
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
    ...overrides,
  };
}

function baseProvenance(overrides = {}): ProposerDirective["provenance"] {
  return {
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
      "logic_rules.md",
      "domain_scope.md",
    ],
    ...overrides,
  };
}

describe("validateProposerDirective — happy path", () => {
  it("accepts a directive with all 4 outcomes (1 each, 2 entities) — minimal proposed + gap", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
            { manifest_ref: "structure_spec.md", heading: "## B", excerpt: "y" },
          ],
          confidence: "high",
        },
        {
          target_element_id: "E2",
          outcome: "gap",
          state_reason: "no match",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual([]);
  });
});

describe("validateProposerDirective — 9 reject conditions (§3.7)", () => {
  it("rule 1: proposals.length != entity_list.length → proposals_count_mismatch", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "gap",
          state_reason: "x",
        },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("proposals_count_mismatch");
  });

  it("rule 2: duplicate target_element_id → duplicate_target_element_id", () => {
    const directive: ProposerDirective = {
      proposals: [
        { target_element_id: "E1", outcome: "gap", state_reason: "x" },
        { target_element_id: "E1", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("duplicate_target_element_id");
  });

  it("rule 3: target_element_id not in entity_list → hallucinated_target_element_id", () => {
    const directive: ProposerDirective = {
      proposals: [
        { target_element_id: "E1", outcome: "gap", state_reason: "x" },
        { target_element_id: "E_HALLUCINATED", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("hallucinated_target_element_id");
  });

  it("rule 4: outcome enum 외 값 → invalid_outcome", () => {
    const directive = {
      proposals: [
        { target_element_id: "E1", outcome: "weird", state_reason: "x" },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    } as unknown as ProposerDirective;
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("invalid_outcome");
  });

  it("rule 5: outcome=proposed missing inferred_meaning → outcome_field_violation", () => {
    const directive = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          // missing inferred_meaning
          justification: "j",
          domain_refs: [],
          confidence: "low",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "x" },
      ],
      provenance: baseProvenance(),
    } as unknown as ProposerDirective;
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("outcome_field_violation");
  });

  it("rule 5: outcome=gap with inferred_meaning present → outcome_field_violation", () => {
    const directive = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "gap",
          state_reason: "x",
          inferred_meaning: "should not be here",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    } as unknown as ProposerDirective;
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("outcome_field_violation");
  });

  it("rule 5: domain_pack_incomplete with empty domain_refs → outcome_field_violation", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "domain_pack_incomplete",
          state_reason: "missing concept",
          domain_refs: [],
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("outcome_field_violation");
  });

  it("rule 6: domain_refs.manifest_ref not in manifest → hallucinated_manifest_ref", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "fake.md", heading: "## A", excerpt: "x" },
            { manifest_ref: "concepts.md", heading: "## B", excerpt: "y" },
          ],
          confidence: "high",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "x" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("hallucinated_manifest_ref");
  });

  it("rule 7: provenance.manifest_schema_version mismatch → provenance_mismatch", () => {
    const directive: ProposerDirective = {
      proposals: [
        { target_element_id: "E1", outcome: "gap", state_reason: "x" },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance({ manifest_schema_version: "9.99" }),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provenance_mismatch");
  });

  it("rule 7: provenance.domain_manifest_hash mismatch → provenance_mismatch", () => {
    const directive: ProposerDirective = {
      proposals: [
        { target_element_id: "E1", outcome: "gap", state_reason: "x" },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance({ domain_manifest_hash: "sha256:wrong" }),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provenance_mismatch");
  });

  it("rule 8: manifest_ref in manifest but not injected → uninjected_manifest_ref", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            // auxiliary.md is in manifest as optional but NOT in injectedFiles
            { manifest_ref: "auxiliary.md", heading: "## A", excerpt: "x" },
          ],
          confidence: "low",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "x" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("uninjected_manifest_ref");
  });

  it("rule 9: state_reason missing for outcome=gap → state_reason_missing", () => {
    const directive = {
      proposals: [
        { target_element_id: "E1", outcome: "gap" },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    } as unknown as ProposerDirective;
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("state_reason_missing");
  });

  it("rule 9: state_reason empty string for outcome=domain_scope_miss → state_reason_missing", () => {
    const directive: ProposerDirective = {
      proposals: [
        { target_element_id: "E1", outcome: "domain_scope_miss", state_reason: "" },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("state_reason_missing");
  });
});

describe("validateProposerDirective — §3.7.1 downgrades (D1/D2/D3)", () => {
  it("D1: high confidence with 1 ref → medium + warning", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          ],
          confidence: "high",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]!.rule).toBe("D1");
    const proposed = r.directive.proposals[0]!;
    if (proposed.outcome !== "proposed") throw new Error("expected proposed");
    expect(proposed.confidence).toBe("medium");
  });

  it("D2: high confidence with 0 refs → low (D2 absolute precedence)", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [],
          confidence: "high",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]!.rule).toBe("D2");
    const proposed = r.directive.proposals[0]!;
    if (proposed.outcome !== "proposed") throw new Error("expected proposed");
    expect(proposed.confidence).toBe("low");
  });

  it("D3: medium confidence with all-optional refs → low + warning", () => {
    // To trigger D3, refs must be from optional file AND that optional file
    // must be injected (else rule 8 rejects). Adjust input.
    const input = baseInput({
      injectedFiles: [
        "concepts.md",
        "structure_spec.md",
        "logic_rules.md",
        "domain_scope.md",
        "auxiliary.md",
      ],
    });
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "auxiliary.md", heading: "## A", excerpt: "x" },
          ],
          confidence: "medium",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => w.rule === "D3")).toBe(true);
    const proposed = r.directive.proposals[0]!;
    if (proposed.outcome !== "proposed") throw new Error("expected proposed");
    expect(proposed.confidence).toBe("low");
  });

  it("no downgrade: high confidence with 2 required refs", () => {
    const directive: ProposerDirective = {
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
            { manifest_ref: "structure_spec.md", heading: "## B", excerpt: "y" },
          ],
          confidence: "high",
        },
        { target_element_id: "E2", outcome: "gap", state_reason: "y" },
      ],
      provenance: baseProvenance(),
    };
    const r = validateProposerDirective(directive, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toHaveLength(0);
  });
});
