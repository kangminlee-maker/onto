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
  | "malformed_directive_shape"
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
  // Runtime shape guards (PR #242 round 2 review conditional consensus —
  // dependency + coverage lens). The TypeScript signature constrains
  // compile-time callers, but runtime input arrives via parsed YAML cast
  // (`raw as Stage1ExplorerDirective` in spawn-explorer.ts), so a malformed
  // LLM emission can reach this entry with field shapes that violate the
  // schema. Without these guards, accesses like `directive.entities.length`
  // would throw a generic TypeError at the CLI catch — bypassing the typed
  // `Stage1ScannerError(stage="validation")` path the audit lifecycle gate
  // depends on (caller catch routes `malformed_directive_shape` rejects via
  // the scanner error class so `stage1_scanner_failed` is recorded).
  const root = directive as unknown as Record<string, unknown>;
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return reject(
      "malformed_directive_shape",
      `directive root must be an object, got ${Array.isArray(root) ? "array" : typeof root}`,
    );
  }
  if (!Array.isArray(root.entities)) {
    return reject(
      "malformed_directive_shape",
      `directive.entities must be an array, got ${Array.isArray(root.entities) ? "array" : typeof root.entities}`,
    );
  }
  if (!Array.isArray(root.module_inventory)) {
    return reject(
      "malformed_directive_shape",
      `directive.module_inventory must be an array, got ${typeof root.module_inventory}`,
    );
  }
  if (
    !root.provenance ||
    typeof root.provenance !== "object" ||
    Array.isArray(root.provenance)
  ) {
    return reject(
      "malformed_directive_shape",
      `directive.provenance must be an object`,
    );
  }

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

  // entity id uniqueness — also gates each entity is an object (round 2
  // shape guard: e.id access on a non-object element would throw generic
  // TypeError otherwise).
  const entityIdSet = new Set<string>();
  for (const e of directive.entities) {
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      return reject(
        "malformed_directive_shape",
        "each directive.entities entry must be an object",
      );
    }
    if (typeof e.id !== "string") {
      return reject(
        "malformed_directive_shape",
        `entity entry must have a string id, got ${typeof e.id}`,
      );
    }
    if (!Array.isArray(e.relations_summary)) {
      return reject(
        "malformed_directive_shape",
        `entity "${e.id}".relations_summary must be an array, got ${typeof e.relations_summary}`,
      );
    }
    if (!e.source || typeof e.source !== "object" || !Array.isArray(e.source.locations)) {
      return reject(
        "malformed_directive_shape",
        `entity "${e.id}".source must be an object with a locations array`,
      );
    }
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

  // module_inventory module_id uniqueness — also gates each module is an
  // object with a string module_id (round 2 shape guard).
  const moduleIdSet = new Set<string>();
  for (const m of directive.module_inventory) {
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      return reject(
        "malformed_directive_shape",
        "each directive.module_inventory entry must be an object",
      );
    }
    if (typeof m.module_id !== "string") {
      return reject(
        "malformed_directive_shape",
        `module_inventory entry must have a string module_id, got ${typeof m.module_id}`,
      );
    }
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
