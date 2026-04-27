// runtime-mirror-of: step-2-rationale-proposer §3.7 + §3.7.1
//
// Runtime validation for the Rationale Proposer directive.
// §3.7: 9 reject conditions (atomic — partial application 금지).
// §3.7.1: 3 downgrade conditions (warning + apply, not reject).

import type {
  ProposerDirective,
  ProposerProposal,
} from "./proposer-directive-types.js";
import type { Confidence } from "./wip-element-types.js";

export type DirectiveRejectCode =
  | "proposals_count_mismatch" // rule 1
  | "duplicate_target_element_id" // rule 2
  | "hallucinated_target_element_id" // rule 3
  | "invalid_outcome" // rule 4
  | "outcome_field_violation" // rule 5
  | "hallucinated_manifest_ref" // rule 6
  | "provenance_mismatch" // rule 7
  | "uninjected_manifest_ref" // rule 8
  | "state_reason_missing"; // rule 9

export interface ValidatorInput {
  entityIds: string[]; // Stage 1 확정 entity_list ids (input package §2.1)
  manifestReferencedFiles: string[]; // manifest.referenced_files[].path
  injectedFiles: string[]; // domain_files_content 의 실 주입된 path subset
  optionalFiles: Set<string>; // manifest 의 required: false file path set (D3 판정)
  expectedManifestSchemaVersion: string; // pre-load gate 가 read 한 값
  expectedDomainManifestHash: string; // pre-load gate 가 read 한 값
}

export interface DowngradeWarning {
  rule: "D1" | "D2" | "D3";
  target_element_id: string;
  original: Confidence;
  downgraded: Confidence;
  reason: string;
}

export type ValidationResult =
  | {
      ok: true;
      directive: ProposerDirective; // confidence 가 downgrade-applied 됨
      warnings: DowngradeWarning[];
    }
  | {
      ok: false;
      code: DirectiveRejectCode;
      detail: string;
    };

/**
 * Validate + normalize a Proposer directive against §3.7 + §3.7.1.
 * Returns an immutable apply-ready directive on success, or a typed reject.
 */
export function validateProposerDirective(
  directive: ProposerDirective,
  input: ValidatorInput,
): ValidationResult {
  const warnings: DowngradeWarning[] = [];

  // rule 1: proposals.length == entity_list.length
  if (directive.proposals.length !== input.entityIds.length) {
    return reject(
      "proposals_count_mismatch",
      `proposals.length=${directive.proposals.length} != entity_list.length=${input.entityIds.length}`,
    );
  }

  // rule 2: no duplicate target_element_id
  const seenIds = new Set<string>();
  for (const p of directive.proposals) {
    if (seenIds.has(p.target_element_id)) {
      return reject(
        "duplicate_target_element_id",
        `duplicate target_element_id: ${p.target_element_id}`,
      );
    }
    seenIds.add(p.target_element_id);
  }

  // rule 3: every target_element_id ∈ entity_list ids
  const entitySet = new Set(input.entityIds);
  for (const p of directive.proposals) {
    if (!entitySet.has(p.target_element_id)) {
      return reject(
        "hallucinated_target_element_id",
        `target_element_id "${p.target_element_id}" not in entity_list`,
      );
    }
  }

  // rule 7: provenance manifest fields match input
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
    directive.provenance.domain_manifest_hash !== input.expectedDomainManifestHash
  ) {
    return reject(
      "provenance_mismatch",
      `provenance.domain_manifest_hash "${directive.provenance.domain_manifest_hash}" != input "${input.expectedDomainManifestHash}"`,
    );
  }

  // per-proposal: rules 4, 5, 6, 8, 9 + downgrades D1~D3
  const manifestSet = new Set(input.manifestReferencedFiles);
  const injectedSet = new Set(input.injectedFiles);
  const normalizedProposals: ProposerProposal[] = [];

  for (const p of directive.proposals) {
    // rule 4: outcome enum (LLM JSON output 이 enum 외 값일 가능성을 runtime 차단)
    const outcomeRaw = (p as { outcome: unknown }).outcome;
    if (
      outcomeRaw !== "proposed" &&
      outcomeRaw !== "gap" &&
      outcomeRaw !== "domain_scope_miss" &&
      outcomeRaw !== "domain_pack_incomplete"
    ) {
      return reject(
        "invalid_outcome",
        `target=${p.target_element_id} outcome="${String(outcomeRaw)}" not in enum`,
      );
    }

    // rule 5: outcome 별 field 요구 / 금지
    const fieldCheck = checkOutcomeFields(p);
    if (fieldCheck) return fieldCheck;

    // rule 9: state_reason required for non-proposed outcomes
    if (
      p.outcome === "gap" ||
      p.outcome === "domain_scope_miss" ||
      p.outcome === "domain_pack_incomplete"
    ) {
      if (
        typeof p.state_reason !== "string" ||
        p.state_reason.trim() === ""
      ) {
        return reject(
          "state_reason_missing",
          `target=${p.target_element_id} outcome=${p.outcome} state_reason missing/empty`,
        );
      }
    }

    // rules 6 + 8: domain_refs validation
    const refsToCheck =
      p.outcome === "proposed"
        ? p.domain_refs
        : p.outcome === "domain_pack_incomplete"
          ? p.domain_refs
          : (p.outcome === "domain_scope_miss" ? p.domain_refs : undefined) ??
            [];
    for (const ref of refsToCheck ?? []) {
      // rule 6: manifest_ref must be in manifest.referenced_files
      if (!manifestSet.has(ref.manifest_ref)) {
        return reject(
          "hallucinated_manifest_ref",
          `target=${p.target_element_id} manifest_ref "${ref.manifest_ref}" not in manifest.referenced_files`,
        );
      }
      // rule 8: manifest_ref must also be in injected files
      if (!injectedSet.has(ref.manifest_ref)) {
        return reject(
          "uninjected_manifest_ref",
          `target=${p.target_element_id} manifest_ref "${ref.manifest_ref}" listed in manifest but not injected (degraded pack)`,
        );
      }
    }

    // §3.7.1 downgrades (proposed outcome 만 — confidence existence)
    if (p.outcome === "proposed") {
      const downgradedConfidence = applyConfidenceDowngrades(
        p.confidence,
        p.domain_refs,
        input.optionalFiles,
        p.target_element_id,
        warnings,
      );
      normalizedProposals.push({
        ...p,
        confidence: downgradedConfidence,
      });
    } else {
      normalizedProposals.push(p);
    }
  }

  return {
    ok: true,
    directive: {
      proposals: normalizedProposals,
      provenance: directive.provenance,
    },
    warnings,
  };
}

function checkOutcomeFields(
  p: ProposerProposal,
): { ok: false; code: DirectiveRejectCode; detail: string } | null {
  const target = p.target_element_id;
  if (p.outcome === "proposed") {
    // required: inferred_meaning, justification, domain_refs (array), confidence
    if (typeof p.inferred_meaning !== "string" || p.inferred_meaning === "") {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=proposed missing inferred_meaning`,
      );
    }
    if (typeof p.justification !== "string" || p.justification === "") {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=proposed missing justification`,
      );
    }
    if (!Array.isArray(p.domain_refs)) {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=proposed domain_refs must be array (≥0)`,
      );
    }
    if (
      p.confidence !== "low" &&
      p.confidence !== "medium" &&
      p.confidence !== "high"
    ) {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=proposed confidence must be low|medium|high`,
      );
    }
    return null;
  }

  // gap / domain_scope_miss / domain_pack_incomplete: forbid proposed-only fields
  // §3.3 / §3.4 / §3.5: inferred_meaning / justification / confidence forbidden
  const forbidden = p as unknown as Record<string, unknown>;
  if (forbidden.inferred_meaning !== undefined) {
    return reject(
      "outcome_field_violation",
      `target=${target} outcome=${p.outcome} forbids inferred_meaning`,
    );
  }
  if (forbidden.justification !== undefined) {
    return reject(
      "outcome_field_violation",
      `target=${target} outcome=${p.outcome} forbids justification`,
    );
  }
  if (forbidden.confidence !== undefined) {
    return reject(
      "outcome_field_violation",
      `target=${target} outcome=${p.outcome} forbids confidence`,
    );
  }

  // gap: domain_refs forbidden (§3.3)
  if (p.outcome === "gap") {
    if (forbidden.domain_refs !== undefined) {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=gap forbids domain_refs`,
      );
    }
  }

  // domain_pack_incomplete: domain_refs required ≥ 1 (§3.5 r5)
  if (p.outcome === "domain_pack_incomplete") {
    if (!Array.isArray(p.domain_refs) || p.domain_refs.length === 0) {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=domain_pack_incomplete requires domain_refs.length ≥ 1`,
      );
    }
  }

  // domain_scope_miss: domain_refs optional, type-check if present
  if (p.outcome === "domain_scope_miss") {
    if (p.domain_refs !== undefined && !Array.isArray(p.domain_refs)) {
      return reject(
        "outcome_field_violation",
        `target=${target} outcome=domain_scope_miss domain_refs must be array when present`,
      );
    }
  }

  return null;
}

/**
 * §3.7.1 D1/D2/D3 — apply downgrades to confidence (proposed outcome only).
 * D2 가 absolute (domain_refs.length == 0 → 무조건 low) 라서 D1/D3 보다 우선.
 * D1: confidence == high && domain_refs.length < 2 → medium
 * D3: confidence == medium && all refs from optional files → low
 */
function applyConfidenceDowngrades(
  current: Confidence,
  domainRefs: import("./wip-element-types.js").DomainRef[],
  optionalFiles: Set<string>,
  targetId: string,
  warnings: DowngradeWarning[],
): Confidence {
  // D2: absolute precedence
  if (domainRefs.length === 0) {
    if (current !== "low") {
      warnings.push({
        rule: "D2",
        target_element_id: targetId,
        original: current,
        downgraded: "low",
        reason: "domain_refs.length == 0",
      });
      return "low";
    }
    return current;
  }

  // D1: high requires ≥2 refs
  let resolved: Confidence = current;
  if (resolved === "high" && domainRefs.length < 2) {
    warnings.push({
      rule: "D1",
      target_element_id: targetId,
      original: "high",
      downgraded: "medium",
      reason: "confidence==high but domain_refs.length < 2",
    });
    resolved = "medium";
  }

  // D3: medium with all refs from optional files
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
        reason: "confidence==medium but all domain_refs from optional files",
      });
      resolved = "low";
    }
  }

  return resolved;
}

function reject(
  code: DirectiveRejectCode,
  detail: string,
): { ok: false; code: DirectiveRejectCode; detail: string } {
  return { ok: false, code, detail };
}
