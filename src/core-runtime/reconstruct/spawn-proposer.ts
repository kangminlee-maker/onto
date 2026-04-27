// runtime-mirror-of: step-2-rationale-proposer §2 + §3 + §3.7 (validator)
//
// Hook α (Rationale Proposer) LLM spawn factory functions. Returns the
// `spawnProposer` shape consumed by `runHookAlpha` / `runReconstructCoordinator`
// (DI pattern — coordinator is transport-agnostic).
//
// Variants:
//   - makeCodexProposer  — codex CLI subprocess (production path)
//   - makeMockProposer   — pre-canned directive (test / fixture / fallback)
//
// Out of scope (follow-up commits):
//   - makeInlineHttpProposer (HTTP transport for non-codex hosts)
//   - retry / degraded_continue orchestration (Hook α + caller responsibility)

import type { HookAlphaDeps, ProposerInputPackage } from "./hook-alpha.js";
import type { ProposerDirective } from "./proposer-directive-types.js";
import {
  type ValidatorInput,
  validateProposerDirective,
} from "./proposer-directive-validator.js";
import {
  type CodexSpawnConfig,
  CodexSpawnError,
  parseDirectiveYaml,
  runCodexSpawn,
} from "./spawn-common.js";

// ============================================================================
// Codex variant
// ============================================================================

export interface CodexProposerConfig extends CodexSpawnConfig {
  /**
   * Optional reads of host-side state to populate validator input. Caller (the
   * handleReconstructCli explore step) typically passes the live values from
   * the session context.
   */
  buildValidatorInput: (input: ProposerInputPackage) => ValidatorInput;
}

/**
 * Construct a `spawnProposer` function backed by codex CLI subprocess.
 *
 * Behavior on each invocation:
 *   1. Build the bounded prompt (Step 2 Proposer protocol contract + input
 *      package serialized as YAML)
 *   2. Spawn `codex exec` with the prompt as stdin
 *   3. Parse stdout as YAML directive (raw or fenced block)
 *   4. Validate via `validateProposerDirective` against pre-computed
 *      `ValidatorInput` (entity ids, manifest references, injected files,
 *      provenance hashes)
 *   5. Return the validated, downgrade-applied directive
 *
 * Throws on any failure (Hook α treats throws as `directive_failure`):
 *   - CodexSpawnError (spawn / exit / timeout / parse)
 *   - Error wrapping ValidationResult.code on validator reject
 */
export function makeCodexProposer(
  config: CodexProposerConfig,
): HookAlphaDeps["spawnProposer"] {
  return async (input: ProposerInputPackage): Promise<ProposerDirective> => {
    const prompt = buildProposerPrompt(input);
    const stdout = await runCodexSpawn(config, prompt);
    const raw = parseDirectiveYaml(stdout);
    // The directive shape is structural (interface ProposerDirective) — TS cast
    // is safe because `validateProposerDirective` performs the runtime checks.
    const directive = raw as unknown as ProposerDirective;
    const validatorInput = config.buildValidatorInput(input);
    const result = validateProposerDirective(directive, validatorInput);
    if (!result.ok) {
      throw new CodexSpawnError(
        `proposer directive rejected: ${result.code}: ${result.detail}`,
        "parse",
      );
    }
    return result.directive;
  };
}

// ============================================================================
// Mock variant
// ============================================================================

/**
 * Construct a `spawnProposer` that returns a pre-canned directive. Useful for:
 *   - unit / e2e test (deterministic flow)
 *   - dry-run (no LLM cost)
 *   - degraded_continue v0 fallback when LLM is unavailable
 *
 * The directive is returned as-is (no validation) so test fixtures can stage
 * intentionally invalid directives to exercise validator rejection paths.
 * Production callers should prefer `makeCodexProposer`.
 */
export function makeMockProposer(
  directive: ProposerDirective,
): HookAlphaDeps["spawnProposer"] {
  return async () => directive;
}

/**
 * Mock variant that throws — exercises Hook α's `spawn_failure` rejection.
 */
export function makeFailingMockProposer(
  message = "mock proposer spawn failure",
): HookAlphaDeps["spawnProposer"] {
  return async () => {
    throw new Error(message);
  };
}

// ============================================================================
// Prompt construction
// ============================================================================

/**
 * Build the bounded prompt for the Proposer agent. Mirrors Step 2 §2 input
 * package + protocol contract reference.
 *
 * The prompt is intentionally compact — the protocol contract itself is
 * embedded by reference (`See: .onto/processes/reconstruct.md Step 2`)
 * rather than inlined, since codex execution context already has access to
 * the repo's process docs via the `-C <projectRoot>` flag.
 *
 * Directive output format: raw YAML on stdout (no prose preamble, no fence).
 * `parseDirectiveYaml` accepts both raw and fenced for resilience.
 */
function buildProposerPrompt(input: ProposerInputPackage): string {
  const inputYaml = serializeInputPackage(input);
  return [
    `You are the Rationale Proposer (Hook α) for the onto reconstruct activity.`,
    ``,
    `System purpose: ${input.systemPurpose}`,
    ``,
    `Task: For each entity in the input package below, emit a proposal under one of`,
    `four outcomes: proposed | gap | domain_scope_miss | domain_pack_incomplete.`,
    ``,
    `Authoritative protocol contract:`,
    `  - .onto/processes/reconstruct.md Step 2 — Rationale Proposer (§3.1 ~ §3.7)`,
    `  - Output schema: src/core-runtime/reconstruct/proposer-directive-types.ts`,
    ``,
    `Validation rules (runtime will reject your directive on violation):`,
    `  1. proposals.length must equal entity_list.length (one proposal per entity)`,
    `  2. target_element_id must be unique and from the entity_list`,
    `  3. outcome ∈ {proposed, gap, domain_scope_miss, domain_pack_incomplete}`,
    `  4. proposed: inferred_meaning + justification + domain_refs[] + confidence`,
    `  5. gap / domain_scope_miss / domain_pack_incomplete: state_reason required`,
    `  6. domain_refs.manifest_ref must be a path that appears in injected_files`,
    `  7. provenance.proposer_contract_version = "${input.proposerContractVersion}"`,
    ``,
    `Output: a single YAML object matching the ProposerDirective schema. Do not`,
    `wrap in code fences. Do not add commentary before or after the YAML.`,
    ``,
    `Input package:`,
    inputYaml,
  ].join("\n");
}

/**
 * Serialize the input package as YAML embedded in the prompt body. The keys
 * mirror `ProposerInputPackage` exactly so the LLM can reference them by name.
 */
function serializeInputPackage(input: ProposerInputPackage): string {
  // Hand-roll YAML for readability + to avoid dragging the `yaml` package's
  // stringify quirks into the prompt (e.g. flow-style fallback for long
  // arrays). Each field is separated for prompt-token clarity.
  const lines: string[] = [];
  lines.push(`session_id: ${quoteYaml(input.sessionId)}`);
  lines.push(`runtime_version: ${quoteYaml(input.runtimeVersion)}`);
  lines.push(
    `proposer_contract_version: ${quoteYaml(input.proposerContractVersion)}`,
  );
  lines.push(`manifest:`);
  lines.push(`  manifest_schema_version: ${quoteYaml(input.manifest.manifest_schema_version)}`);
  lines.push(`  domain_name: ${quoteYaml(input.manifest.domain_name)}`);
  lines.push(`  domain_manifest_version: ${quoteYaml(input.manifest.domain_manifest_version)}`);
  lines.push(`  version_hash: ${quoteYaml(input.manifest.version_hash)}`);
  lines.push(`  quality_tier: ${quoteYaml(input.manifest.quality_tier)}`);
  lines.push(`  referenced_files:`);
  for (const f of input.manifest.referenced_files) {
    lines.push(`    - path: ${quoteYaml(f.path)}`);
    lines.push(`      required: ${f.required}`);
    if (f.purpose) lines.push(`      purpose: ${quoteYaml(f.purpose)}`);
  }
  lines.push(`injected_files:`);
  for (const f of input.injectedFiles) lines.push(`  - ${quoteYaml(f)}`);
  lines.push(`entity_list:`);
  for (const e of input.entityList) {
    lines.push(`  - id: ${quoteYaml(e.id)}`);
    lines.push(`    type: ${quoteYaml(e.type)}`);
    lines.push(`    name: ${quoteYaml(e.name)}`);
    lines.push(`    definition: ${quoteYaml(e.definition)}`);
    lines.push(`    certainty: ${quoteYaml(e.certainty)}`);
    lines.push(`    source:`);
    lines.push(`      locations:`);
    for (const loc of e.source.locations) lines.push(`        - ${quoteYaml(loc)}`);
    if (e.relations_summary.length > 0) {
      lines.push(`    relations_summary:`);
      for (const r of e.relations_summary) {
        lines.push(`      - related_id: ${quoteYaml(r.related_id)}`);
        lines.push(`        relation_type: ${quoteYaml(r.relation_type)}`);
      }
    }
  }
  return lines.join("\n");
}

function quoteYaml(value: string): string {
  // Defensive double-quote — handles colons, leading dashes, special chars.
  // Escape backslash first, then double quote.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
