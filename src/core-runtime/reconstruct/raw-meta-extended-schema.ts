// runtime-mirror-of: step-4-integration §4.1 + §4.2 + §4.3 + §4.4
//
// raw.yml meta v1 extended schema (W-A-94). Track B phase 3 의 11/13.
//
// v0 baseline meta (schema/source_type/domain/source/date/rounds/...) 는 본
// 모듈 scope 밖 — v1 extension 만 책임:
//   - intent_inference mode (inference_mode / degraded_reason / fallback_reason
//     / domain_quality_tier)
//   - manifest pair (manifest_schema_version / domain_manifest_version /
//     domain_manifest_hash / manifest_recovery_from_malformed)
//   - γ review session-level (rationale_review_degraded /
//     rationale_reviewer_failures_streak / *_contract_version)
//   - pack_missing_areas (Hook α post-aggregate)
//   - step2c_review_state / step2c_review_retry_count
//
// §4.2 mutual exclusion + co-occurrence matrix enforcement:
//   raw_yml_meta_invariant_violation halt + manifest_quality_tier_mismatch halt
//
// W-A-100 (recovery_from_malformed mirror) reads manifest_recovery_from_malformed
// from this seat.

import type { PackMissingArea } from "./wip-element-types.js";

// ============================================================================
// §4.1 raw.yml meta v1 extension types
// ============================================================================

export type InferenceMode = "full" | "degraded" | "none";

export type DegradedReason =
  | "pack_optional_missing"
  | "pack_quality_floor"
  | "pack_tier_minimal";

export type FallbackReason =
  | "user_flag"
  | "principal_confirmed_no_domain"
  | "proposer_failure_downgraded";

export type DomainQualityTier = "full" | "partial" | "minimal";

export type Step2cReviewStateRaw =
  | "completed"
  | "partial"
  | "degraded"
  | "aborted";

/**
 * v1 extended meta block. Combined with v0 baseline meta in raw.yml.
 * Caller (raw.yml writer) merges this with v0 meta before atomic write.
 */
export interface RawMetaExtensionsV1 {
  // intent_inference mode (Step 1 §4.7)
  inference_mode: InferenceMode;
  degraded_reason: DegradedReason | null;
  fallback_reason: FallbackReason | null;
  domain_quality_tier: DomainQualityTier | null;

  // manifest pair (Step 1 §6.2 + §5.6.1 audit signal)
  manifest_schema_version: string | null;
  domain_manifest_version: string | null;
  domain_manifest_hash: string | null;
  manifest_recovery_from_malformed: boolean;

  // γ review session-level summary (Step 3 §7.1 + §7.4 + §10.1)
  rationale_review_degraded: boolean;
  rationale_reviewer_failures_streak: number;
  rationale_reviewer_contract_version: string | null;
  rationale_proposer_contract_version: string | null;

  // pack-level aggregation (Step 2 §6.3.1) — Hook α post-pass result
  pack_missing_areas: PackMissingArea[];

  // γ review artifact provenance (Step 3 §6.2)
  step2c_review_state: Step2cReviewStateRaw | null;
  step2c_review_retry_count: number | null;
}

// ============================================================================
// §4.2 mutual exclusion + co-occurrence matrix validation
// ============================================================================

export type RawMetaValidationFailureCode =
  | "raw_yml_meta_invariant_violation"
  | "manifest_quality_tier_mismatch";

export type RawMetaValidationResult =
  | { ok: true }
  | { ok: false; code: RawMetaValidationFailureCode; detail: string };

/**
 * Validates raw.yml meta v1 extensions against the §4.2 mutual exclusion +
 * co-occurrence matrix.
 *
 * Pre-conditions checked (in order):
 *   1. inference_mode == full → degraded/fallback NULL, tier=='full',
 *      manifest tier=='full'
 *   2. inference_mode == degraded → degraded_reason NOT NULL, fallback NULL,
 *      domain_quality_tier == manifest.quality_tier
 *   3. degraded × pack_optional_missing → tier ∈ {full, partial} (minimal 금지)
 *   4. degraded × pack_tier_minimal → tier == 'minimal'
 *   5. inference_mode == none → degraded NULL, fallback NOT NULL, tier NULL,
 *      rationale_review_degraded == false
 */
export function validateRawMetaInvariants(
  meta: RawMetaExtensionsV1,
  manifestQualityTier: DomainQualityTier | null,
): RawMetaValidationResult {
  // §4.2 manifest.quality_tier ↔ domain_quality_tier 1:1 mirror
  if (
    meta.inference_mode !== "none" &&
    meta.domain_quality_tier !== manifestQualityTier
  ) {
    return {
      ok: false,
      code: "manifest_quality_tier_mismatch",
      detail: `meta.domain_quality_tier="${meta.domain_quality_tier}" != manifest.quality_tier="${manifestQualityTier}"`,
    };
  }

  if (meta.inference_mode === "full") {
    if (meta.degraded_reason !== null) {
      return invariant(
        `inference_mode=full requires degraded_reason=null, got "${meta.degraded_reason}"`,
      );
    }
    if (meta.fallback_reason !== null) {
      return invariant(
        `inference_mode=full requires fallback_reason=null, got "${meta.fallback_reason}"`,
      );
    }
    if (meta.domain_quality_tier !== "full") {
      return invariant(
        `inference_mode=full requires domain_quality_tier="full", got "${meta.domain_quality_tier}"`,
      );
    }
    if (manifestQualityTier !== "full") {
      return invariant(
        `inference_mode=full requires manifest.quality_tier="full", got "${manifestQualityTier}"`,
      );
    }
    return { ok: true };
  }

  if (meta.inference_mode === "degraded") {
    if (meta.degraded_reason === null) {
      return invariant("inference_mode=degraded requires degraded_reason NOT NULL");
    }
    if (meta.fallback_reason !== null) {
      return invariant(
        `inference_mode=degraded requires fallback_reason=null, got "${meta.fallback_reason}"`,
      );
    }
    if (meta.domain_quality_tier === null) {
      return invariant("inference_mode=degraded requires domain_quality_tier NOT NULL");
    }

    if (meta.degraded_reason === "pack_optional_missing") {
      if (
        meta.domain_quality_tier !== "full" &&
        meta.domain_quality_tier !== "partial"
      ) {
        return invariant(
          `degraded_reason=pack_optional_missing requires domain_quality_tier ∈ {full, partial}, got "${meta.domain_quality_tier}"`,
        );
      }
    }
    if (meta.degraded_reason === "pack_tier_minimal") {
      if (meta.domain_quality_tier !== "minimal") {
        return invariant(
          `degraded_reason=pack_tier_minimal requires domain_quality_tier="minimal", got "${meta.domain_quality_tier}"`,
        );
      }
    }
    return { ok: true };
  }

  // inference_mode === "none"
  if (meta.degraded_reason !== null) {
    return invariant(
      `inference_mode=none requires degraded_reason=null, got "${meta.degraded_reason}"`,
    );
  }
  if (meta.fallback_reason === null) {
    return invariant("inference_mode=none requires fallback_reason NOT NULL");
  }
  if (meta.domain_quality_tier !== null) {
    return invariant(
      `inference_mode=none requires domain_quality_tier=null, got "${meta.domain_quality_tier}"`,
    );
  }
  if (meta.rationale_review_degraded !== false) {
    return invariant(
      "inference_mode=none requires rationale_review_degraded=false (γ 미실행)",
    );
  }
  return { ok: true };
}

function invariant(detail: string): RawMetaValidationResult {
  return { ok: false, code: "raw_yml_meta_invariant_violation", detail };
}

// ============================================================================
// §4.3 element-level intent_inference block — predicate
// ============================================================================

/**
 * §4.3 r3 closure: inference_mode == "none" 시 element-level intent_inference
 * block 은 raw.yml 에서 omit (v0 호환). 본 함수가 caller 의 element-level
 * persist gate.
 */
export function shouldPersistElementIntentInference(
  meta: Pick<RawMetaExtensionsV1, "inference_mode">,
): boolean {
  return meta.inference_mode !== "none";
}
