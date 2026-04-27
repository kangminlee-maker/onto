// runtime-mirror-of: reconstruct.md §"Phase 1 — Stage 1, Round 0: Initial Structure Exploration"
//
// Stage 1 Round 0 explorer agent output directive schema.
// Runtime validates this shape via stage1-directive-validator.ts.
//
// PR scope: entity fact_type only. The Stage 1 fact space declared by spec is
// {entity, enum, property, relation, code_mapping}; the other four fact_types
// are out-of-scope here (Round N iterative loop + Stage 2 follow-up commits —
// see entities-scanner handoff §2.4 ledger).
//
// Source profile seam: profile="codebase" only in this PR. The union is
// pre-declared so future profiles (spreadsheet | database | document) widen
// `SourceProfileKind` without touching the directive consumer (handleReconstructCli).

import type { HookAlphaEntityInput } from "../hook-alpha.js";

/**
 * Source profile classifier (reconstruct.md §"Explorer Profiles by Source Type").
 *
 * Codebase profile is the only accepted value in this PR. The literal union is
 * intentionally a one-element type — extension to spreadsheet/database/document
 * is a follow-up commit that widens the union AND adds matching prompt builders
 * in spawn-explorer.ts.
 */
export type SourceProfileKind = "codebase";

/**
 * Stage 1 entity certainty enum — mirrors WipElementForHookAlpha.certainty
 * (wip-element-types.ts:165). Kept aligned by structural identity, not import,
 * so the explorer directive remains a self-contained schema.
 */
export type Stage1EntityCertainty =
  | "observed"
  | "rationale-absent"
  | "inferred"
  | "ambiguous"
  | "not-in-source";

/**
 * Single entity record emitted by Stage 1 Round 0 explorer.
 *
 * Wire-compat with HookAlphaEntityInput is intentional: scanner.ts strips
 * `module_id` and forwards the remaining fields directly into
 * `HookAlphaEntityInput[]`. The structural overlap (id, type, name, definition,
 * certainty, source, relations_summary) is the public contract.
 *
 * `module_id` is the back-link to module_inventory — required by spec for
 * coverage denominator computation (Round N convergence), retained on the
 * directive even though Round N itself is a follow-up commit.
 */
export interface Stage1Entity {
  id: string;
  type: string;
  name: string;
  definition: string;
  certainty: Stage1EntityCertainty;
  source: { locations: string[] };
  relations_summary: { related_id: string; relation_type: string }[];
  /** module_inventory back-link — convergence coverage denominator. */
  module_id: string;
}

/**
 * Module inventory entry — reconstruct.md §1.1 "module_inventory Report".
 *
 * Module inventory is the coverage denominator for the Round N termination
 * condition. Round 0 reports it once; Round N tracks `uncovered_modules`
 * (delta against previously-reported facts) — Round N implementation is
 * follow-up; this PR persists the inventory so that follow-up has the data.
 */
export interface Stage1ModuleInventoryEntry {
  module_id: string;
  module_path: string;
  description?: string;
}

/**
 * Stage 1 Round 0 explorer directive — top-level output schema.
 *
 * Validation contract (stage1-directive-validator.ts):
 *   - profile === "codebase" (current PR scope)
 *   - entities.length ≥ 1 (empty source is a degenerate case; explorer must
 *     emit at least one entity OR raise an error from the spawn layer)
 *   - entity ids are unique within the directive
 *   - every entity.module_id exists in module_inventory
 *   - module_inventory.length ≥ 1
 *   - provenance fields present and well-formed
 */
export interface Stage1ExplorerDirective {
  profile: SourceProfileKind;
  entities: Stage1Entity[];
  module_inventory: Stage1ModuleInventoryEntry[];
  provenance: {
    /** ISO 8601 UTC timestamp at directive emission. */
    explored_at: string;
    /** Fixed actor identifier — mirrors proposer-directive-types provenance.proposed_by. */
    explored_by: "stage1-explorer";
    /** Contract version of the explorer protocol; see runtime-mirror-of header. */
    explorer_contract_version: string;
    session_id: string;
    runtime_version: string;
    /** Always 1 in Round 0 single-shot; future Round N may chunk source. */
    input_chunks: number;
    /** Field-level truncation markers (e.g. ["entities[42].definition"]). */
    truncated_fields: string[];
  };
}

/**
 * Result returned to the caller (handleReconstructCli) by `runStage1RoundZero`.
 *
 * - `entities` is a wire-compat HookAlphaEntityInput[] — caller passes this
 *   directly into the coordinator options without further transformation.
 * - `directive` preserves the original explorer output (including
 *   module_inventory + provenance) for downstream consumers (raw-yml writer +
 *   future Round N convergence).
 *
 * The split avoids forcing the caller to import directive types just to
 * fulfill the coordinator contract, while keeping the full directive
 * available for future use without re-running the LLM call.
 */
export interface Stage1RoundZeroResult {
  entities: HookAlphaEntityInput[];
  directive: Stage1ExplorerDirective;
}
