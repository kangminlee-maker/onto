// runtime-mirror-of: step-3-rationale-reviewer §3.1 + §3.2~§3.6 + §3.7
//
// Rationale Reviewer agent output directive schema (W-A-89 input).
// 5 operations (selective partial output — variable length updates).

import type { Confidence, DomainRef } from "./wip-element-types.js";

export type ReviewerOperation =
  | "confirm"
  | "revise"
  | "mark_domain_scope_miss"
  | "mark_domain_pack_incomplete"
  | "populate_stage2_rationale";

export interface ReviewerUpdateCommon {
  target_element_id: string;
  reason?: string; // optional for confirm, required for others (validator enforces)
}

export interface UpdateConfirm extends ReviewerUpdateCommon {
  operation: "confirm";
}

export interface UpdateRevise extends ReviewerUpdateCommon {
  operation: "revise";
  new_inferred_meaning: string;
  new_justification: string;
  new_domain_refs: DomainRef[];
  new_confidence: Confidence;
}

export interface UpdateMarkDomainScopeMiss extends ReviewerUpdateCommon {
  operation: "mark_domain_scope_miss";
  state_reason: string;
  new_domain_refs?: DomainRef[]; // optional (§3.4 r2 R-12)
}

export interface UpdateMarkDomainPackIncomplete extends ReviewerUpdateCommon {
  operation: "mark_domain_pack_incomplete";
  state_reason: string;
  new_domain_refs: DomainRef[]; // required ≥ 1 (§3.5 mirror Step 2 r5 DIS-02)
}

export interface UpdatePopulateStage2Rationale extends ReviewerUpdateCommon {
  operation: "populate_stage2_rationale";
  new_inferred_meaning: string;
  new_justification: string;
  new_domain_refs: DomainRef[];
  new_confidence: Confidence;
}

export type ReviewerUpdate =
  | UpdateConfirm
  | UpdateRevise
  | UpdateMarkDomainScopeMiss
  | UpdateMarkDomainPackIncomplete
  | UpdatePopulateStage2Rationale;

/**
 * Top-level directive (§3.1).
 * updates is variable-length (may be 0). Selective partial output is core
 * to Step 3.
 */
export interface ReviewerDirective {
  updates: ReviewerUpdate[];
  provenance: ReviewerDirectiveProvenance;
}

/**
 * Top-level directive provenance (§3.7) — directive scope, separate from
 * element-level intent_inference.provenance (§3.7.2).
 */
export interface ReviewerDirectiveProvenance {
  reviewed_at: string; // ISO 8601 UTC — directive emit time
  reviewed_by: "rationale-reviewer";
  reviewer_contract_version: string;
  manifest_schema_version: string;
  domain_manifest_version: string;
  domain_manifest_hash: string;
  domain_quality_tier: "full" | "partial" | "minimal";
  session_id: string;
  runtime_version: string | null;
  wip_snapshot_hash: string; // SHA-256 of canonical-serialized wip_snapshot
  domain_files_content_hash: string; // SHA-256 of canonical-serialized injected pack content
  hash_algorithm: string; // e.g. "yaml@2.8.2 + sha256"
  input_chunks: number;
  truncated_fields: string[];
  effective_injected_files: string[];
}
