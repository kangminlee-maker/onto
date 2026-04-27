// runtime-mirror-of: step-2-rationale-proposer §3.1 + §3.2 + §3.3 + §3.4 + §3.5 + §3.6
//
// Rationale Proposer agent output directive schema (W-A-88 input).
// Runtime validates this shape via proposer-directive-validator.ts.

import type { Confidence, DomainRef } from "./wip-element-types.js";

export type ProposerOutcome =
  | "proposed"
  | "gap"
  | "domain_scope_miss"
  | "domain_pack_incomplete";

/**
 * Variant proposal types per outcome (Step 2 §3.2 ~ §3.5).
 * Discriminated by `outcome`. Validator enforces field requirements + omissions.
 */
export type ProposerProposal =
  | ProposalProposed
  | ProposalGap
  | ProposalDomainScopeMiss
  | ProposalDomainPackIncomplete;

export interface ProposalCommon {
  target_element_id: string;
  __truncation_hint?: string; // per-entity truncation marker (Step 2 §3.1 r3)
}

export interface ProposalProposed extends ProposalCommon {
  outcome: "proposed";
  inferred_meaning: string; // 1~2 sentences
  justification: string; // 1~3 sentences
  domain_refs: DomainRef[]; // ≥ 0 (empty 시 §3.7.1 D2 → confidence 강제 low)
  confidence: Confidence; // self-reported, runtime downgrade-applied
}

export interface ProposalGap extends ProposalCommon {
  outcome: "gap";
  state_reason: string;
  // §3.3: inferred_meaning / justification / domain_refs / confidence forbidden
}

export interface ProposalDomainScopeMiss extends ProposalCommon {
  outcome: "domain_scope_miss";
  state_reason: string;
  domain_refs?: DomainRef[]; // optional
  // inferred_meaning / justification / confidence forbidden
}

export interface ProposalDomainPackIncomplete extends ProposalCommon {
  outcome: "domain_pack_incomplete";
  state_reason: string;
  domain_refs: DomainRef[]; // required, ≥ 1 (§3.5 r5 DIS-02)
  // inferred_meaning / justification / confidence forbidden
}

/**
 * Top-level directive (Step 2 §3.1).
 * provenance is session-level; per-element provenance is composed by Hook α
 * runtime when applying.
 */
export interface ProposerDirective {
  proposals: ProposerProposal[];
  provenance: {
    proposed_at: string; // ISO 8601 UTC
    proposed_by: "rationale-proposer";
    proposer_contract_version: string;
    manifest_schema_version: string;
    domain_manifest_version: string;
    domain_manifest_hash: string;
    domain_quality_tier: "full" | "partial" | "minimal";
    session_id: string;
    runtime_version: string;
    input_chunks: number; // default 1
    truncated_fields: string[]; // session-level
    effective_injected_files: string[]; // r3 UF-COVERAGE-01
  };
}
