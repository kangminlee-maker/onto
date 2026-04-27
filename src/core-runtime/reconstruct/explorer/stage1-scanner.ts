// runtime-mirror-of: reconstruct.md §1.1 (Stage 1, Round 0: Initial Structure Exploration)
//
// Stage 1 Round 0 scanner — single-shot entry that combines the spawn layer
// (codex / mock / future inline-http) with directive validation. The scanner
// is the canonical entry consumed by handleReconstructCli — replacing the
// PR #241 stub fixture (`STUB-001` placeholder) with a real Stage 1 result.
//
// Boundary in this PR:
//   - Round 0 only (single LLM call). Round N iterative loop +
//     convergence detection + module_inventory deltas are follow-up commits.
//   - profile = "codebase" only. spreadsheet / database / document profiles
//     widen `SourceProfileKind` in follow-up commits.
//   - fact_type = entity only. enum / property / relation / code_mapping
//     follow-up.

import type { HookAlphaEntityInput } from "../hook-alpha.js";
import type { SpawnExplorer } from "./spawn-explorer.js";
import type {
  SourceProfileKind,
  Stage1RoundZeroResult,
} from "./stage1-directive-types.js";
import { validateStage1Directive } from "./stage1-directive-validator.js";

/**
 * Caller-supplied Round 0 input. Profile is constrained to "codebase" at
 * the type level — non-codebase callers fail to compile, providing the
 * source-profile seam declared in entities-scanner handoff §2.4.
 */
export interface Stage1RoundZeroInput {
  profile: SourceProfileKind;
  /** Filesystem path to the analysis target (codebase root, file, glob). */
  source: string;
  /** Free-text intent / purpose statement (caller's `--intent` flag). */
  intent: string;
  sessionId: string;
  runtimeVersion: string;
  /** Default "1.0" (the SUPPORTED_EXPLORER_CONTRACT_VERSIONS baseline). */
  explorerContractVersion?: string;
}

export interface Stage1RoundZeroDeps {
  spawnExplorer: SpawnExplorer;
}

/**
 * Stage 1 scanner failure modes. The `code` field carries the underlying
 * validator reject code on validation failures so callers can dispatch
 * (e.g. retry on `provenance_mismatch`, fail-fast on `empty_entities`).
 */
export class Stage1ScannerError extends Error {
  constructor(
    message: string,
    public readonly stage: "spawn" | "validation",
    public readonly code?: string,
  ) {
    super(message);
    this.name = "Stage1ScannerError";
  }
}

/**
 * Run Stage 1 Round 0 entity scan. Canonical entry — do NOT introduce a
 * synonym in this PR (handoff §2.4 explicit constraint).
 *
 * Pipeline:
 *   1. Defensive runtime profile gate (type-level guard backstop).
 *   2. spawnExplorer → Stage1ExplorerDirective (raw, unvalidated).
 *      Throws (CodexSpawnError or other) bubble up wrapped as
 *      `Stage1ScannerError(stage="spawn")`.
 *   3. validateStage1Directive → typed reject or accept.
 *      Reject codes wrapped as `Stage1ScannerError(stage="validation", code)`.
 *   4. Project to HookAlphaEntityInput[] (strip directive-only `module_id`)
 *      and return both forms (entities + full directive).
 */
export async function runStage1RoundZero(
  input: Stage1RoundZeroInput,
  deps: Stage1RoundZeroDeps,
): Promise<Stage1RoundZeroResult> {
  // Runtime profile gate — backstop for the type-level seam. The literal
  // union is currently {"codebase"} so the only path that reaches this
  // check is a caller that casts through `unknown`; future widenings of
  // SourceProfileKind keep this gate as the architectural boundary marker.
  if (input.profile !== "codebase") {
    throw new Stage1ScannerError(
      `Stage 1 scanner: profile "${input.profile}" not supported (codebase only in this PR)`,
      "validation",
      "invalid_profile",
    );
  }

  const explorerContractVersion = input.explorerContractVersion ?? "1.0";

  let directive;
  try {
    directive = await deps.spawnExplorer({
      profile: input.profile,
      source: input.source,
      intent: input.intent,
      sessionId: input.sessionId,
      runtimeVersion: input.runtimeVersion,
      explorerContractVersion,
    });
  } catch (e) {
    throw new Stage1ScannerError(
      `Stage 1 explorer spawn failed: ${e instanceof Error ? e.message : String(e)}`,
      "spawn",
    );
  }

  const validation = validateStage1Directive(directive, {
    acceptedProfile: input.profile,
    expectedSessionId: input.sessionId,
  });

  if (!validation.ok) {
    throw new Stage1ScannerError(
      `Stage 1 directive rejected: ${validation.code}: ${validation.detail}`,
      "validation",
      validation.code,
    );
  }

  // Strip directive-only `module_id` to produce HookAlphaEntityInput[].
  // The id remains addressable through the full directive on
  // `result.directive.entities[i].module_id` for downstream consumers
  // (raw-yml writer, future Round N convergence).
  const entities: HookAlphaEntityInput[] = validation.directive.entities.map(
    ({ module_id: _module_id, ...rest }) => rest,
  );

  return { entities, directive: validation.directive };
}
