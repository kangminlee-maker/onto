// runtime-mirror-of: step-1-flow-review §4.2 + step-2-rationale-proposer §3.6
//
// wip.yml element + intent_inference type scaffolding.
// Initial seat for W-A-88 (Hook α). W-A-89 (Hook γ) / W-A-90 (Hook δ) /
// W-A-93 (Phase 3.5) / W-A-94 (raw.yml meta) all import these types.
//
// Step 1 §4.2 RationaleState lifecycle (12 enum):
//   intermediate (5): empty | proposed | reviewed | gap | domain_pack_incomplete
//   terminal     (7): principal_accepted | principal_rejected | principal_modified
//                    | principal_deferred | principal_accepted_gap | carry_forward
//                    | domain_scope_miss

export type RationaleState =
  // intermediate (Phase 3.5 종료 전 terminal 로 전이 필수)
  | "empty"
  | "proposed"
  | "reviewed"
  | "gap"
  | "domain_pack_incomplete"
  // terminal (Phase 4 Save 허용)
  | "principal_accepted"
  | "principal_rejected"
  | "principal_modified"
  | "principal_deferred"
  | "principal_accepted_gap"
  | "carry_forward"
  | "domain_scope_miss";

export const INTERMEDIATE_RATIONALE_STATES = new Set<RationaleState>([
  "empty",
  "proposed",
  "reviewed",
  "gap",
  "domain_pack_incomplete",
]);

export const TERMINAL_RATIONALE_STATES = new Set<RationaleState>([
  "principal_accepted",
  "principal_rejected",
  "principal_modified",
  "principal_deferred",
  "principal_accepted_gap",
  "carry_forward",
  "domain_scope_miss",
]);

export type Confidence = "low" | "medium" | "high";

export interface DomainRef {
  manifest_ref: string; // manifest.referenced_files[].path
  heading: string; // 도메인 md 의 heading path
  excerpt: string; // ≤ 100 chars
}

/**
 * `proposed_*` field origin enum (review C-PROV-01 — overload disambiguation).
 *
 * Step 3 §3.6 r2 C-5 option A: `populate_stage2_rationale` (Hook γ Reviewer)
 * 이 brand-new intent_inference 를 emit 시 `proposed_by` field 가
 * `"rationale-reviewer"` 로 set. 즉 `proposed_*` field 는 actor-neutral 한
 * "최초 generation 시점" 의미 — Hook α 가 generated 시 proposer, Hook γ 가
 * stage2 신규 entity 에 대해 generated 시 reviewer.
 *
 * Field 이름 `proposed_*` 의 misnomer 는 spec backward compat 으로 유지 —
 * downstream consumer 는 `proposed_by` enum value 로 origin 식별.
 */
export type ProposedByOrigin = "rationale-proposer" | "rationale-reviewer";

export interface IntentInferenceProvenance {
  // ── generation-origin provenance (actor-neutral semantic, review C-PROV-01) ──
  // proposed_at = 최초 generation 시점 (Hook α emission 또는 Hook γ
  //               populate_stage2_rationale emission 시점)
  // proposed_by = generation 의 actor: rationale-proposer (Hook α) 또는
  //               rationale-reviewer (Hook γ populate_stage2_rationale)
  // proposer_contract_version = origin actor 의 contract version 의 value.
  //               name 의 misnomer 는 backward compat 으로 유지 — origin
  //               식별은 proposed_by 로.
  // 본 3 field 의 actor-neutral 해석은 Step 3 §3.6 r2 C-5 option A canonical.
  proposed_at: string; // ISO 8601 UTC — generation 시점
  proposed_by: ProposedByOrigin;
  proposer_contract_version: string; // origin actor 의 contract version
  manifest_schema_version: string;
  domain_manifest_version: string;
  domain_manifest_hash: string; // version_hash
  domain_quality_tier: "full" | "partial" | "minimal";
  session_id: string;
  runtime_version: string;
  input_chunks: number; // default 1 (single-shot)
  truncated_fields: string[]; // session-level truncation
  effective_injected_files: string[]; // r3 UF-COVERAGE-01

  // Hook α directive provenance fields (per-element)
  __truncation_hint?: string; // per-entity truncation marker
  // gate count: Step 2 r3-amendment (Step 4 P-DEC-A1)
  // Hook α populate 시 1, Hook γ revise/confirm 시 2 로 증가
  gate_count: number;

  // Hook γ (W-A-89) populate 시 추가됨 — interface 에 forward declared
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_contract_version?: string;

  // Hook δ (W-A-93) populate 시 추가됨 — interface 에 forward declared
  principal_judged_at?: string;
}

/**
 * Step 2 §3.5.1: state_reason field — single unified persistence sink.
 * Populated for outcomes ∈ {gap, domain_scope_miss, domain_pack_incomplete}.
 */
export interface IntentInference {
  rationale_state: RationaleState;
  state_reason?: string; // outcome ∈ {gap, domain_scope_miss, domain_pack_incomplete}
  // outcome == proposed 만 populate
  inferred_meaning?: string;
  justification?: string;
  domain_refs?: DomainRef[]; // outcome 별 카디널리티 — §3.2~§3.5
  confidence?: Confidence; // post-validation value
  provenance: IntentInferenceProvenance;
}

/**
 * Subset of wip.yml element fields touched by Hook α.
 * Other fields (id, type, name, definition, certainty, source, relations,
 * principal_provided_rationale, principal_note, etc.) are owned by other
 * hooks / Stage 1 explorer; not modeled here to avoid cross-W-ID coupling.
 */
export interface WipElementForHookAlpha {
  id: string;
  type: string;
  name: string;
  definition: string;
  certainty:
    | "observed"
    | "rationale-absent"
    | "inferred"
    | "ambiguous"
    | "not-in-source";
  // intent_inference is populated by Hook α (or pre-existing from Stage 2 explorer)
  intent_inference?: IntentInference;
}

/**
 * Step 2 §6.3.1: pack-level aggregation seat.
 * Hook α post-aggregates outcome == domain_pack_incomplete elements by
 * (manifest_ref, heading) — non-semantic strict matching.
 */
export interface PackMissingArea {
  grouping_key: {
    manifest_ref: string;
    heading: string;
  };
  element_ids: string[];
}
