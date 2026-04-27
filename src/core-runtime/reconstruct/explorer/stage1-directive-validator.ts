// runtime-mirror-of: reconstruct.md §1.1 + §1.2 (entity / module_inventory rules)
//
// Runtime validation for Stage 1 Round 0 explorer directive.
// Mirrors proposer-directive-validator.ts pattern: typed reject codes,
// ValidatorInput injection, atomic ValidationResult.

import type {
  SourceProfileKind,
  Stage1Entity,
  Stage1ExplorerDirective,
} from "./stage1-directive-types.js";

/**
 * Supported explorer_contract_version list. v1 baseline = "1.0".
 * Future bumps add versions; runtime rejects directives with unsupported
 * contract version via `provenance_mismatch`.
 */
export const SUPPORTED_EXPLORER_CONTRACT_VERSIONS = ["1.0"] as const;

const VALID_CERTAINTY_VALUES = new Set<Stage1Entity["certainty"]>([
  "observed",
  "rationale-absent",
  "inferred",
  "ambiguous",
  "not-in-source",
]);

export type Stage1DirectiveRejectCode =
  | "invalid_profile"
  | "empty_entities"
  | "duplicate_entity_id"
  | "empty_module_inventory"
  | "duplicate_module_id"
  | "orphan_module_ref"
  | "orphan_relation_target"
  | "invalid_certainty"
  | "empty_source_locations"
  | "provenance_mismatch";

export interface Stage1ValidatorInput {
  /** Profile that the caller is asking the explorer to honor. The directive's
   *  `profile` field MUST equal this value (architectural seam — non-codebase
   *  profiles are out of scope in this PR). */
  acceptedProfile: SourceProfileKind;
  /** session_id the caller expects in `provenance.session_id`. */
  expectedSessionId: string;
}

export type Stage1ValidationResult =
  | { ok: true; directive: Stage1ExplorerDirective }
  | { ok: false; code: Stage1DirectiveRejectCode; detail: string };

/**
 * Validate a Stage 1 Round 0 directive. Returns the directive unchanged on
 * success (no normalization needed in this PR — confidence downgrade etc.
 * apply only to Hook α/γ rationale layers, not Stage 1 entity scanning).
 */
export function validateStage1Directive(
  directive: Stage1ExplorerDirective,
  input: Stage1ValidatorInput,
): Stage1ValidationResult {
  // profile gate (non-codebase rejected at the entry point — type-level seam)
  if (directive.profile !== input.acceptedProfile) {
    return reject(
      "invalid_profile",
      `directive.profile "${directive.profile}" != accepted "${input.acceptedProfile}"`,
    );
  }

  if (directive.entities.length === 0) {
    return reject(
      "empty_entities",
      "directive.entities is empty — Stage 1 must report at least one entity",
    );
  }

  // entity id uniqueness
  const entityIdSet = new Set<string>();
  for (const e of directive.entities) {
    if (entityIdSet.has(e.id)) {
      return reject("duplicate_entity_id", `duplicate entity id "${e.id}"`);
    }
    entityIdSet.add(e.id);
  }

  // certainty enum
  for (const e of directive.entities) {
    if (!VALID_CERTAINTY_VALUES.has(e.certainty)) {
      return reject(
        "invalid_certainty",
        `entity "${e.id}".certainty="${e.certainty}" not in enum`,
      );
    }
  }

  // source.locations non-empty
  for (const e of directive.entities) {
    if (e.source.locations.length === 0) {
      return reject(
        "empty_source_locations",
        `entity "${e.id}".source.locations is empty`,
      );
    }
  }

  // module_inventory non-empty
  if (directive.module_inventory.length === 0) {
    return reject(
      "empty_module_inventory",
      "directive.module_inventory is empty — Stage 1 spec requires at least one module",
    );
  }

  // module_inventory module_id uniqueness
  const moduleIdSet = new Set<string>();
  for (const m of directive.module_inventory) {
    if (moduleIdSet.has(m.module_id)) {
      return reject(
        "duplicate_module_id",
        `duplicate module_inventory.module_id "${m.module_id}"`,
      );
    }
    moduleIdSet.add(m.module_id);
  }

  // every entity.module_id ∈ module_inventory
  for (const e of directive.entities) {
    if (!moduleIdSet.has(e.module_id)) {
      return reject(
        "orphan_module_ref",
        `entity "${e.id}".module_id="${e.module_id}" not in module_inventory`,
      );
    }
  }

  // every relations_summary[].related_id ∈ entity_id_set (PR #242 review
  // consensus 2/9 — structure + dependency lens). Self-references are
  // permitted (an entity may relate to itself); the gate is that the
  // target id must exist in the directive so downstream consumers can
  // dereference without dangling pointers.
  for (const e of directive.entities) {
    for (const rel of e.relations_summary) {
      if (!entityIdSet.has(rel.related_id)) {
        return reject(
          "orphan_relation_target",
          `entity "${e.id}".relations_summary references unknown entity "${rel.related_id}" (relation_type="${rel.relation_type}")`,
        );
      }
    }
  }

  // provenance: contract version + session_id + actor
  if (
    !SUPPORTED_EXPLORER_CONTRACT_VERSIONS.includes(
      directive.provenance.explorer_contract_version as
        (typeof SUPPORTED_EXPLORER_CONTRACT_VERSIONS)[number],
    )
  ) {
    return reject(
      "provenance_mismatch",
      `provenance.explorer_contract_version "${directive.provenance.explorer_contract_version}" not in supported list [${SUPPORTED_EXPLORER_CONTRACT_VERSIONS.join(", ")}]`,
    );
  }
  if (directive.provenance.session_id !== input.expectedSessionId) {
    return reject(
      "provenance_mismatch",
      `provenance.session_id "${directive.provenance.session_id}" != expected "${input.expectedSessionId}"`,
    );
  }
  if (directive.provenance.explored_by !== "stage1-explorer") {
    return reject(
      "provenance_mismatch",
      `provenance.explored_by "${directive.provenance.explored_by}" != "stage1-explorer"`,
    );
  }

  return { ok: true, directive };
}

function reject(
  code: Stage1DirectiveRejectCode,
  detail: string,
): Stage1ValidationResult {
  return { ok: false, code, detail };
}
