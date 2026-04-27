// runtime-mirror-of: step-4-integration §4.1 + §4.2 + §4.3

import { describe, expect, it } from "vitest";
import {
  shouldPersistElementIntentInference,
  validateRawMetaInvariants,
  type RawMetaExtensionsV1,
} from "./raw-meta-extended-schema.js";

function baseMeta(
  overrides: Partial<RawMetaExtensionsV1> = {},
): RawMetaExtensionsV1 {
  return {
    inference_mode: "full",
    degraded_reason: null,
    fallback_reason: null,
    domain_quality_tier: "full",
    manifest_schema_version: "1.0",
    domain_manifest_version: "0.3.0",
    domain_manifest_hash: "sha256:abc",
    manifest_recovery_from_malformed: false,
    rationale_review_degraded: false,
    rationale_reviewer_failures_streak: 0,
    rationale_reviewer_contract_version: "1.0",
    rationale_proposer_contract_version: "1.0",
    pack_missing_areas: [],
    step2c_review_state: "completed",
    step2c_review_retry_count: 0,
    ...overrides,
  };
}

describe("validateRawMetaInvariants — §4.2 happy paths", () => {
  it("inference_mode=full + manifest tier=full passes", () => {
    expect(validateRawMetaInvariants(baseMeta(), "full").ok).toBe(true);
  });

  it("inference_mode=degraded × optional_missing × full tier passes", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_optional_missing",
        domain_quality_tier: "full",
      }),
      "full",
    );
    expect(r.ok).toBe(true);
  });

  it("inference_mode=degraded × optional_missing × partial tier passes", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_optional_missing",
        domain_quality_tier: "partial",
      }),
      "partial",
    );
    expect(r.ok).toBe(true);
  });

  it("inference_mode=degraded × tier_minimal × minimal tier passes", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_tier_minimal",
        domain_quality_tier: "minimal",
      }),
      "minimal",
    );
    expect(r.ok).toBe(true);
  });

  it("inference_mode=none × user_flag passes", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "none",
        domain_quality_tier: null,
        fallback_reason: "user_flag",
        manifest_schema_version: null,
        domain_manifest_version: null,
        domain_manifest_hash: null,
        rationale_review_degraded: false,
        rationale_reviewer_failures_streak: 0,
      }),
      null,
    );
    expect(r.ok).toBe(true);
  });
});

describe("validateRawMetaInvariants — invariant violations", () => {
  it("full mode with degraded_reason set → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({ degraded_reason: "pack_optional_missing" }),
      "full",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("raw_yml_meta_invariant_violation");
  });

  it("full mode with fallback_reason set → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({ fallback_reason: "user_flag" }),
      "full",
    );
    expect(r.ok).toBe(false);
  });

  it("full mode with non-full tier → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({ domain_quality_tier: "partial" }),
      "partial",
    );
    expect(r.ok).toBe(false);
  });

  it("degraded mode missing degraded_reason → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: null,
        domain_quality_tier: "partial",
      }),
      "partial",
    );
    expect(r.ok).toBe(false);
  });

  it("degraded × optional_missing × minimal tier → invariant violation (precedence)", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_optional_missing",
        domain_quality_tier: "minimal",
      }),
      "minimal",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("optional_missing");
  });

  it("degraded × tier_minimal × non-minimal tier → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_tier_minimal",
        domain_quality_tier: "partial",
      }),
      "partial",
    );
    expect(r.ok).toBe(false);
  });

  it("none mode missing fallback_reason → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "none",
        domain_quality_tier: null,
        fallback_reason: null,
        rationale_review_degraded: false,
        rationale_reviewer_failures_streak: 0,
      }),
      null,
    );
    expect(r.ok).toBe(false);
  });

  it("none mode with rationale_review_degraded=true → invariant violation", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "none",
        domain_quality_tier: null,
        fallback_reason: "user_flag",
        rationale_review_degraded: true, // disallowed
        rationale_reviewer_failures_streak: 0,
      }),
      null,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("rationale_review_degraded");
  });
});

describe("validateRawMetaInvariants — manifest_quality_tier_mismatch", () => {
  it("non-none mode with mismatch → manifest_quality_tier_mismatch", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "degraded",
        degraded_reason: "pack_optional_missing",
        domain_quality_tier: "full",
      }),
      "partial", // manifest disagrees
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("manifest_quality_tier_mismatch");
  });

  it("none mode skips tier mismatch check (tier=null on both)", () => {
    const r = validateRawMetaInvariants(
      baseMeta({
        inference_mode: "none",
        domain_quality_tier: null,
        fallback_reason: "user_flag",
        rationale_review_degraded: false,
        rationale_reviewer_failures_streak: 0,
      }),
      "full", // not enforced when none
    );
    expect(r.ok).toBe(true);
  });
});

describe("shouldPersistElementIntentInference (§4.3 r3 closure)", () => {
  it("persists when inference_mode=full or degraded", () => {
    expect(
      shouldPersistElementIntentInference({ inference_mode: "full" }),
    ).toBe(true);
    expect(
      shouldPersistElementIntentInference({ inference_mode: "degraded" }),
    ).toBe(true);
  });

  it("omits when inference_mode=none (v0 compat)", () => {
    expect(
      shouldPersistElementIntentInference({ inference_mode: "none" }),
    ).toBe(false);
  });
});
