// runtime-mirror-of: step-3-rationale-reviewer §3.8 + §3.8.1
//
// Runtime validation for the Rationale Reviewer directive.
// §3.8: 12 reject conditions (atomic — partial application 금지).
// §3.8.1: 3 downgrade conditions (warning + apply, not reject).
//
// empty/non-empty definition is canonical at §3.1.2:
//   empty:     rationale_state == "empty" OR intent_inference field 부재
//   non-empty: rationale_state != "empty" AND intent_inference populated

import type {
  ReviewerDirective,
  ReviewerUpdate,
} from "./reviewer-directive-types.js";
import type {
  Confidence,
  IntentInference,
} from "./wip-element-types.js";

export type ReviewerRejectCode =
  | "duplicate_target_element_id" // rule 1
  | "hallucinated_target_element_id" // rule 2
  | "invalid_operation" // rule 3
  | "operation_field_violation" // rule 4 + 5
  | "hallucinated_manifest_ref" // rule 6
  | "uninjected_manifest_ref" // rule 7
  | "populate_stage2_target_not_empty" // rule 8
  | "provenance_mismatch" // rule 9
  | "wip_snapshot_hash_mismatch" // rule 10
  | "non_populate_target_is_empty" // rule 11
  | "domain_files_content_hash_mismatch"; // rule 12

export interface ReviewerValidatorInput {
  /** wip.yml.elements[] 의 id → 기존 intent_inference (없으면 undefined) */
  elementInferences: Map<string, IntentInference | undefined>;
  manifestReferencedFiles: string[];
  injectedFiles: string[];
  optionalFiles: Set<string>; // §3.8.1 D3 판정
  expectedManifestSchemaVersion: string;
  expectedDomainManifestHash: string;
  expectedWipSnapshotHash: string;
  expectedDomainFilesContentHash: string;
}

export interface ReviewerDowngradeWarning {
  rule: "D1" | "D2" | "D3";
  target_element_id: string;
  original: Confidence;
  downgraded: Confidence;
  reason: string;
}

export type ReviewerValidationResult =
  | {
      ok: true;
      directive: ReviewerDirective; // confidence downgrade-applied
      warnings: ReviewerDowngradeWarning[];
    }
  | {
      ok: false;
      code: ReviewerRejectCode;
      detail: string;
    };

/**
 * empty/non-empty per §3.1.2:
 *   - empty: intent_inference 부재 OR rationale_state == "empty"
 *   - non-empty: 그 외
 */
export function isIntentInferenceEmpty(
  inference: IntentInference | undefined,
): boolean {
  if (inference === undefined) return true;
  return inference.rationale_state === "empty";
}

/**
 * Supported reviewer_contract_version list (review UF-EVOLUTION-01).
 * v1 baseline = "1.0". Mirror of SUPPORTED_PROPOSER_CONTRACT_VERSIONS pattern.
 */
export const SUPPORTED_REVIEWER_CONTRACT_VERSIONS = ["1.0"] as const;

export function validateReviewerDirective(
  directive: ReviewerDirective,
  input: ReviewerValidatorInput,
): ReviewerValidationResult {
  const warnings: ReviewerDowngradeWarning[] = [];

  // reviewer_contract_version compatibility (review UF-EVOLUTION-01)
  if (
    !SUPPORTED_REVIEWER_CONTRACT_VERSIONS.includes(
      directive.provenance.reviewer_contract_version as (typeof SUPPORTED_REVIEWER_CONTRACT_VERSIONS)[number],
    )
  ) {
    return reject(
      "provenance_mismatch",
      `provenance.reviewer_contract_version "${directive.provenance.reviewer_contract_version}" not in supported list [${SUPPORTED_REVIEWER_CONTRACT_VERSIONS.join(", ")}]`,
    );
  }

  // rule 9: provenance manifest fields match input
  if (
    directive.provenance.manifest_schema_version !==
    input.expectedManifestSchemaVersion
  ) {
    return reject(
      "provenance_mismatch",
      `provenance.manifest_schema_version "${directive.provenance.manifest_schema_version}" != input "${input.expectedManifestSchemaVersion}"`,
    );
  }
  if (
    directive.provenance.domain_manifest_hash !==
    input.expectedDomainManifestHash
  ) {
    return reject(
      "provenance_mismatch",
      `provenance.domain_manifest_hash "${directive.provenance.domain_manifest_hash}" != input "${input.expectedDomainManifestHash}"`,
    );
  }

  // rule 10: wip_snapshot_hash mismatch
  if (
    directive.provenance.wip_snapshot_hash !== input.expectedWipSnapshotHash
  ) {
    return reject(
      "wip_snapshot_hash_mismatch",
      `provenance.wip_snapshot_hash "${directive.provenance.wip_snapshot_hash}" != recomputed "${input.expectedWipSnapshotHash}"`,
    );
  }

  // rule 12: domain_files_content_hash mismatch
  if (
    directive.provenance.domain_files_content_hash !==
    input.expectedDomainFilesContentHash
  ) {
    return reject(
      "domain_files_content_hash_mismatch",
      `provenance.domain_files_content_hash "${directive.provenance.domain_files_content_hash}" != recomputed "${input.expectedDomainFilesContentHash}"`,
    );
  }

  // rule 1: no duplicate target_element_id
  const seen = new Set<string>();
  for (const u of directive.updates) {
    if (seen.has(u.target_element_id)) {
      return reject(
        "duplicate_target_element_id",
        `duplicate target_element_id: ${u.target_element_id}`,
      );
    }
    seen.add(u.target_element_id);
  }

  // per-update: rules 2, 3, 4, 5, 6, 7, 8, 11
  const manifestSet = new Set(input.manifestReferencedFiles);
  const injectedSet = new Set(input.injectedFiles);
  const normalizedUpdates: ReviewerUpdate[] = [];

  for (const u of directive.updates) {
    // rule 2: target_element_id ∈ wip.elements[].id
    if (!input.elementInferences.has(u.target_element_id)) {
      return reject(
        "hallucinated_target_element_id",
        `target_element_id "${u.target_element_id}" not in wip.elements[]`,
      );
    }

    // rule 3: operation enum
    const opRaw = (u as { operation: unknown }).operation;
    if (
      opRaw !== "confirm" &&
      opRaw !== "revise" &&
      opRaw !== "mark_domain_scope_miss" &&
      opRaw !== "mark_domain_pack_incomplete" &&
      opRaw !== "populate_stage2_rationale"
    ) {
      return reject(
        "invalid_operation",
        `target=${u.target_element_id} operation="${String(opRaw)}" not in enum`,
      );
    }

    // rules 4 + 5: operation 별 field 요구사항 + confirm 금지 field
    const fieldCheck = checkOperationFields(u);
    if (fieldCheck) return fieldCheck;

    // rule 8: populate_stage2_rationale → target must be empty
    // rule 11: non-populate operation → target must be non-empty
    const inference = input.elementInferences.get(u.target_element_id);
    const isEmpty = isIntentInferenceEmpty(inference);
    if (u.operation === "populate_stage2_rationale" && !isEmpty) {
      return reject(
        "populate_stage2_target_not_empty",
        `target=${u.target_element_id} populate_stage2_rationale requires empty intent_inference but state=${inference?.rationale_state}`,
      );
    }
    if (
      (u.operation === "revise" ||
        u.operation === "mark_domain_scope_miss" ||
        u.operation === "mark_domain_pack_incomplete" ||
        u.operation === "confirm") &&
      isEmpty
    ) {
      return reject(
        "non_populate_target_is_empty",
        `target=${u.target_element_id} operation=${u.operation} requires non-empty intent_inference (use populate_stage2_rationale instead)`,
      );
    }

    // rules 6 + 7: domain_refs validation
    const refsToCheck = collectRefsForCheck(u);
    for (const ref of refsToCheck) {
      if (!manifestSet.has(ref.manifest_ref)) {
        return reject(
          "hallucinated_manifest_ref",
          `target=${u.target_element_id} manifest_ref "${ref.manifest_ref}" not in manifest.referenced_files`,
        );
      }
      if (!injectedSet.has(ref.manifest_ref)) {
        return reject(
          "uninjected_manifest_ref",
          `target=${u.target_element_id} manifest_ref "${ref.manifest_ref}" listed but not injected (degraded pack)`,
        );
      }
    }

    // §3.8.1 downgrades — revise + populate_stage2_rationale (new_confidence)
    if (u.operation === "revise" || u.operation === "populate_stage2_rationale") {
      const downgraded = applyConfidenceDowngrades(
        u.new_confidence,
        u.new_domain_refs,
        input.optionalFiles,
        u.target_element_id,
        warnings,
      );
      normalizedUpdates.push({ ...u, new_confidence: downgraded });
    } else {
      normalizedUpdates.push(u);
    }
  }

  return {
    ok: true,
    directive: {
      updates: normalizedUpdates,
      provenance: directive.provenance,
    },
    warnings,
  };
}

function checkOperationFields(
  u: ReviewerUpdate,
):
  | { ok: false; code: ReviewerRejectCode; detail: string }
  | null {
  const target = u.target_element_id;

  if (u.operation === "confirm") {
    // rule 5: forbid 5 fields
    const x = u as unknown as Record<string, unknown>;
    for (const forbidden of [
      "inferred_meaning",
      "justification",
      "domain_refs",
      "confidence",
      "state_reason",
      "new_inferred_meaning",
      "new_justification",
      "new_domain_refs",
      "new_confidence",
    ]) {
      if (x[forbidden] !== undefined) {
        return reject(
          "operation_field_violation",
          `target=${target} confirm forbids ${forbidden}`,
        );
      }
    }
    return null;
  }

  if (u.operation === "revise") {
    if (typeof u.new_inferred_meaning !== "string" || u.new_inferred_meaning === "") {
      return reject(
        "operation_field_violation",
        `target=${target} revise requires new_inferred_meaning`,
      );
    }
    if (typeof u.new_justification !== "string" || u.new_justification === "") {
      return reject(
        "operation_field_violation",
        `target=${target} revise requires new_justification`,
      );
    }
    if (!Array.isArray(u.new_domain_refs)) {
      return reject(
        "operation_field_violation",
        `target=${target} revise requires new_domain_refs (array, ≥0)`,
      );
    }
    if (
      u.new_confidence !== "low" &&
      u.new_confidence !== "medium" &&
      u.new_confidence !== "high"
    ) {
      return reject(
        "operation_field_violation",
        `target=${target} revise requires new_confidence enum`,
      );
    }
    if (typeof u.reason !== "string" || u.reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} revise requires reason`,
      );
    }
    return null;
  }

  if (u.operation === "mark_domain_scope_miss") {
    if (typeof u.state_reason !== "string" || u.state_reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_scope_miss requires state_reason`,
      );
    }
    if (u.new_domain_refs !== undefined && !Array.isArray(u.new_domain_refs)) {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_scope_miss new_domain_refs must be array when present`,
      );
    }
    if (typeof u.reason !== "string" || u.reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_scope_miss requires reason`,
      );
    }
    return null;
  }

  if (u.operation === "mark_domain_pack_incomplete") {
    if (typeof u.state_reason !== "string" || u.state_reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_pack_incomplete requires state_reason`,
      );
    }
    if (!Array.isArray(u.new_domain_refs) || u.new_domain_refs.length === 0) {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_pack_incomplete requires new_domain_refs.length ≥ 1`,
      );
    }
    if (typeof u.reason !== "string" || u.reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} mark_domain_pack_incomplete requires reason`,
      );
    }
    return null;
  }

  if (u.operation === "populate_stage2_rationale") {
    if (typeof u.new_inferred_meaning !== "string" || u.new_inferred_meaning === "") {
      return reject(
        "operation_field_violation",
        `target=${target} populate_stage2_rationale requires new_inferred_meaning`,
      );
    }
    if (typeof u.new_justification !== "string" || u.new_justification === "") {
      return reject(
        "operation_field_violation",
        `target=${target} populate_stage2_rationale requires new_justification`,
      );
    }
    if (!Array.isArray(u.new_domain_refs)) {
      return reject(
        "operation_field_violation",
        `target=${target} populate_stage2_rationale requires new_domain_refs (array, ≥0)`,
      );
    }
    if (
      u.new_confidence !== "low" &&
      u.new_confidence !== "medium" &&
      u.new_confidence !== "high"
    ) {
      return reject(
        "operation_field_violation",
        `target=${target} populate_stage2_rationale requires new_confidence enum`,
      );
    }
    if (typeof u.reason !== "string" || u.reason === "") {
      return reject(
        "operation_field_violation",
        `target=${target} populate_stage2_rationale requires reason`,
      );
    }
    return null;
  }

  // unreachable due to rule 3
  return null;
}

function collectRefsForCheck(
  u: ReviewerUpdate,
): { manifest_ref: string }[] {
  switch (u.operation) {
    case "confirm":
      return [];
    case "revise":
      return u.new_domain_refs;
    case "mark_domain_scope_miss":
      return u.new_domain_refs ?? [];
    case "mark_domain_pack_incomplete":
      return u.new_domain_refs;
    case "populate_stage2_rationale":
      return u.new_domain_refs;
  }
}

function applyConfidenceDowngrades(
  current: Confidence,
  domainRefs: import("./wip-element-types.js").DomainRef[],
  optionalFiles: Set<string>,
  targetId: string,
  warnings: ReviewerDowngradeWarning[],
): Confidence {
  // D2 absolute precedence
  if (domainRefs.length === 0) {
    if (current !== "low") {
      warnings.push({
        rule: "D2",
        target_element_id: targetId,
        original: current,
        downgraded: "low",
        reason: "new_domain_refs.length == 0",
      });
      return "low";
    }
    return current;
  }
  let resolved: Confidence = current;
  if (resolved === "high" && domainRefs.length < 2) {
    warnings.push({
      rule: "D1",
      target_element_id: targetId,
      original: "high",
      downgraded: "medium",
      reason: "new_confidence==high but new_domain_refs.length < 2",
    });
    resolved = "medium";
  }
  if (resolved === "medium") {
    const allOptional = domainRefs.every((r) =>
      optionalFiles.has(r.manifest_ref),
    );
    if (allOptional) {
      warnings.push({
        rule: "D3",
        target_element_id: targetId,
        original: "medium",
        downgraded: "low",
        reason: "new_confidence==medium but all new_domain_refs from optional files",
      });
      resolved = "low";
    }
  }
  return resolved;
}

function reject(
  code: ReviewerRejectCode,
  detail: string,
): { ok: false; code: ReviewerRejectCode; detail: string } {
  return { ok: false, code, detail };
}
