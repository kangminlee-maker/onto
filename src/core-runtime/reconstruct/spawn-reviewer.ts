// runtime-mirror-of: step-3-rationale-reviewer §2 + §3 + §3.8 (validator)
//
// Hook γ (Rationale Reviewer) LLM spawn factory functions. Returns the
// `spawnReviewer` shape consumed by `runHookGamma` / `runReconstructCoordinator`
// (DI pattern — coordinator is transport-agnostic).
//
// Variants:
//   - makeCodexReviewer  — codex CLI subprocess (production path)
//   - makeMockReviewer   — pre-canned directive (test / fixture / fallback)
//
// Out of scope (follow-up commits):
//   - makeInlineHttpReviewer (HTTP transport for non-codex hosts)
//   - retry / degraded_continue orchestration

import type { HookGammaDeps, ReviewerInputPackage } from "./hook-gamma.js";
import type { ReviewerDirective } from "./reviewer-directive-types.js";
import {
  type ReviewerValidatorInput,
  validateReviewerDirective,
} from "./reviewer-directive-validator.js";
import {
  type CodexSpawnConfig,
  CodexSpawnError,
  parseDirectiveYaml,
  runCodexSpawn,
} from "./spawn-common.js";

// ============================================================================
// Codex variant
// ============================================================================

export interface CodexReviewerConfig extends CodexSpawnConfig {
  /**
   * Build the per-cycle ReviewerValidatorInput. Caller (handleReconstructCli)
   * passes manifest references / injected files / optional files / expected
   * hashes computed at the cycle's snapshot point.
   */
  buildValidatorInput: (input: ReviewerInputPackage) => ReviewerValidatorInput;
  /**
   * Reviewer contract version expected on the directive's provenance. Mirrors
   * SUPPORTED_REVIEWER_CONTRACT_VERSIONS — caller passes the active value
   * (typically "1.0") so the prompt can advertise the expected number.
   */
  reviewerContractVersion: string;
}

/**
 * Construct a `spawnReviewer` function backed by codex CLI subprocess.
 *
 * Behavior on each invocation mirrors `makeCodexProposer` — only the input
 * package shape and validator differ.
 */
export function makeCodexReviewer(
  config: CodexReviewerConfig,
): HookGammaDeps["spawnReviewer"] {
  return async (input: ReviewerInputPackage): Promise<ReviewerDirective> => {
    const prompt = buildReviewerPrompt(input, config.reviewerContractVersion);
    const stdout = await runCodexSpawn(config, prompt);
    const raw = parseDirectiveYaml(stdout);
    const directive = raw as unknown as ReviewerDirective;
    const validatorInput = config.buildValidatorInput(input);
    const result = validateReviewerDirective(directive, validatorInput);
    if (!result.ok) {
      throw new CodexSpawnError(
        `reviewer directive rejected: ${result.code}: ${result.detail}`,
        "parse",
      );
    }
    return result.directive;
  };
}

// ============================================================================
// Mock variant
// ============================================================================

export function makeMockReviewer(
  directive: ReviewerDirective,
): HookGammaDeps["spawnReviewer"] {
  return async () => directive;
}

export function makeFailingMockReviewer(
  message = "mock reviewer spawn failure",
): HookGammaDeps["spawnReviewer"] {
  return async () => {
    throw new Error(message);
  };
}

// ============================================================================
// Prompt construction
// ============================================================================

function buildReviewerPrompt(
  input: ReviewerInputPackage,
  reviewerContractVersion: string,
): string {
  const inputYaml = serializeInputPackage(input);
  return [
    `You are the Rationale Reviewer (Hook γ) for the onto reconstruct activity.`,
    ``,
    `Task: Review each element's existing intent_inference (if present) and emit a`,
    `selective updates list with one of five operations: confirm | revise |`,
    `mark_domain_scope_miss | mark_domain_pack_incomplete | populate_stage2_rationale.`,
    `Output is *partial* — omit elements that need no change.`,
    ``,
    `Authoritative protocol contract:`,
    `  - .onto/processes/reconstruct.md Step 3 — Rationale Reviewer (§3.1 ~ §3.8)`,
    `  - Output schema: src/core-runtime/reconstruct/reviewer-directive-types.ts`,
    ``,
    `Validation rules (runtime will reject your directive on violation):`,
    `  1. target_element_id unique and present in element_inferences`,
    `  2. operation ∈ {confirm, revise, mark_domain_scope_miss,`,
    `       mark_domain_pack_incomplete, populate_stage2_rationale}`,
    `  3. populate_stage2_rationale only on currently empty intent_inference`,
    `  4. non-populate operations only on currently non-empty intent_inference`,
    `  5. domain_refs.manifest_ref must appear in injected_files`,
    `  6. provenance.wip_snapshot_hash = "${input.wipSnapshotHash}"`,
    `  7. provenance.domain_files_content_hash = "${input.domainFilesContentHash}"`,
    `  8. provenance.reviewer_contract_version = "${reviewerContractVersion}"`,
    ``,
    `Output: a single YAML object matching the ReviewerDirective schema. Do not`,
    `wrap in code fences. Do not add commentary before or after the YAML.`,
    ``,
    `Input package:`,
    inputYaml,
  ].join("\n");
}

function serializeInputPackage(input: ReviewerInputPackage): string {
  const lines: string[] = [];
  lines.push(`wip_snapshot_hash: ${quoteYaml(input.wipSnapshotHash)}`);
  lines.push(
    `domain_files_content_hash: ${quoteYaml(input.domainFilesContentHash)}`,
  );
  lines.push(`manifest:`);
  lines.push(
    `  manifest_schema_version: ${quoteYaml(input.manifest.manifest_schema_version)}`,
  );
  lines.push(
    `  domain_manifest_version: ${quoteYaml(input.manifest.domain_manifest_version)}`,
  );
  lines.push(`  version_hash: ${quoteYaml(input.manifest.version_hash)}`);
  lines.push(`  quality_tier: ${quoteYaml(input.manifest.quality_tier)}`);
  lines.push(`  referenced_files:`);
  for (const f of input.manifest.referenced_files) {
    lines.push(`    - path: ${quoteYaml(f.path)}`);
    lines.push(`      required: ${f.required}`);
  }
  lines.push(`injected_files:`);
  for (const f of input.injectedFiles) lines.push(`  - ${quoteYaml(f)}`);
  lines.push(`element_inferences:`);
  for (const [id, inf] of input.elementInferences.entries()) {
    lines.push(`  - element_id: ${quoteYaml(id)}`);
    if (inf === undefined) {
      lines.push(`    intent_inference: null`);
    } else {
      lines.push(`    intent_inference:`);
      lines.push(`      rationale_state: ${quoteYaml(inf.rationale_state)}`);
      if (inf.inferred_meaning !== undefined) {
        lines.push(`      inferred_meaning: ${quoteYaml(inf.inferred_meaning)}`);
      }
      if (inf.justification !== undefined) {
        lines.push(`      justification: ${quoteYaml(inf.justification)}`);
      }
      if (inf.state_reason !== undefined) {
        lines.push(`      state_reason: ${quoteYaml(inf.state_reason)}`);
      }
      if (inf.confidence !== undefined) {
        lines.push(`      confidence: ${quoteYaml(inf.confidence)}`);
      }
    }
  }
  return lines.join("\n");
}

function quoteYaml(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
