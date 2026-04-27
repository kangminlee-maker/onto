// runtime-mirror-of: reconstruct.md §1.1 (Initial Structure Exploration)
//                  + spawn-proposer.ts pattern (codex+mock+failing-mock factory family)
//
// Stage 1 Round 0 explorer LLM spawn factory functions. Returns the
// `spawnExplorer` shape consumed by `runStage1RoundZero` (DI pattern —
// scanner is transport-agnostic).
//
// Variants:
//   - makeCodexExplorer        — codex CLI subprocess (production path)
//   - makeMockExplorer         — pre-canned directive (test / fixture / fallback)
//   - makeFailingMockExplorer  — exercises spawn_failure rejection
//
// Out of scope (Session 2b — separate PR):
//   - makeInlineHttpExplorer (HTTP transport for non-codex hosts —
//     anthropic / openai / litellm / standalone). The scanner caller
//     (handleReconstructCli) currently wires only codex+mock variants;
//     host_runtime != "codex" branches arrive in Session 2b.

import type { SourceProfileKind, Stage1ExplorerDirective } from "./stage1-directive-types.js";
import {
  type CodexSpawnConfig,
  CodexSpawnError,
  parseDirectiveYaml,
  runCodexSpawn,
} from "../spawn-common.js";

/**
 * Input package handed to the explorer at each spawn invocation. The shape
 * is intentionally narrow — Round 0 needs only the source path, intent, and
 * provenance metadata to emit the directive.
 */
export interface ExplorerInputPackage {
  profile: SourceProfileKind;
  /** Filesystem path of the analysis target (codebase root, file glob, etc). */
  source: string;
  /** Free-text intent / purpose statement (caller's `--intent` flag). */
  intent: string;
  sessionId: string;
  runtimeVersion: string;
  /** Currently always "1.0" — bump in lockstep with SUPPORTED_EXPLORER_CONTRACT_VERSIONS. */
  explorerContractVersion: string;
}

/**
 * Spawn factory return type. Caller invokes the function once per Round —
 * Round 0 in this PR (Round N follow-up will reuse the same shape with
 * delta inputs).
 */
export type SpawnExplorer = (
  input: ExplorerInputPackage,
) => Promise<Stage1ExplorerDirective>;

// ============================================================================
// Codex variant
// ============================================================================

export type CodexExplorerConfig = CodexSpawnConfig;

/**
 * Construct a `spawnExplorer` function backed by codex CLI subprocess.
 *
 * Behavior on each invocation:
 *   1. Build the bounded prompt (Round 0 protocol contract reference + input
 *      package serialized as YAML)
 *   2. Spawn `codex exec` with the prompt as stdin
 *   3. Parse stdout as YAML directive (raw or fenced block)
 *   4. Return the parsed directive (caller validates via
 *      `validateStage1Directive`)
 *
 * Throws `CodexSpawnError` on any spawn / exit / timeout / parse failure.
 * Validation rejects (orphan module ids, bad certainty enum, etc.) bubble up
 * through the scanner — the spawn layer is intentionally validator-agnostic
 * to mirror the spawn-proposer pattern (validator-injected at the entry).
 */
export function makeCodexExplorer(config: CodexExplorerConfig): SpawnExplorer {
  return async (input: ExplorerInputPackage): Promise<Stage1ExplorerDirective> => {
    const prompt = buildExplorerPrompt(input);
    const stdout = await runCodexSpawn(config, prompt);
    const raw = parseDirectiveYaml(stdout);
    // Structural typing — validator (called by scanner) enforces actual shape.
    return raw as unknown as Stage1ExplorerDirective;
  };
}

// ============================================================================
// Mock variants
// ============================================================================

/**
 * Construct a `spawnExplorer` that returns a pre-canned directive. Useful for:
 *   - unit / e2e test (deterministic flow)
 *   - dry-run (no LLM cost)
 *   - degraded_continue v0 fallback when LLM is unavailable
 *
 * The directive is returned as-is (no validation) so test fixtures can stage
 * intentionally invalid directives to exercise validator rejection paths.
 * Production callers prefer `makeCodexExplorer`.
 */
export function makeMockExplorer(
  directive: Stage1ExplorerDirective,
): SpawnExplorer {
  return async () => directive;
}

/**
 * Mock variant that throws — exercises the scanner's `spawn_failure` path.
 */
export function makeFailingMockExplorer(
  message = "mock explorer spawn failure",
): SpawnExplorer {
  return async () => {
    throw new CodexSpawnError(message, "spawn");
  };
}

// ============================================================================
// Prompt construction
// ============================================================================

/**
 * Build the bounded prompt for the Stage 1 Round 0 Explorer agent.
 *
 * Pattern mirrors `buildProposerPrompt` (spawn-proposer.ts:127): the
 * authoritative protocol contract (`reconstruct.md §1.1`) is embedded by
 * reference, not inlined. codex's `-C <projectRoot>` flag gives the spawned
 * process access to the repo's process docs directly.
 *
 * Output format: raw YAML on stdout (no prose preamble, no fence).
 * `parseDirectiveYaml` accepts both raw and fenced for resilience.
 */
export function buildExplorerPrompt(input: ExplorerInputPackage): string {
  return [
    `You are the Stage 1 Round 0 Explorer for the onto reconstruct activity.`,
    ``,
    `Source profile: ${input.profile}`,
    `Source path: ${input.source}`,
    `Intent: ${input.intent}`,
    ``,
    `Task: Survey the overall structure of the analysis target and emit a`,
    `Stage1ExplorerDirective. Depth: up to each module's domain models only`,
    `(do NOT analyze detailed logic — that is Stage 2).`,
    ``,
    `Authoritative protocol contract:`,
    `  - .onto/processes/reconstruct.md §"Phase 1, Stage 1, Round 0"`,
    `  - Output schema: src/core-runtime/reconstruct/explorer/stage1-directive-types.ts`,
    ``,
    `Required directive fields:`,
    `  1. profile: must equal "${input.profile}"`,
    `  2. entities[]: at least one entity. Each entity:`,
    `       - id (unique within directive)`,
    `       - type (string, typically "entity")`,
    `       - name (1 line)`,
    `       - definition (1 line summary)`,
    `       - certainty ∈ {observed, rationale-absent, inferred, ambiguous, not-in-source}`,
    `       - source.locations[] (≥ 1 file/path/cell reference)`,
    `       - relations_summary[] (may be empty)`,
    `       - module_id (must reference module_inventory)`,
    `  3. module_inventory[]: at least one module entry. Each module:`,
    `       - module_id (unique within inventory)`,
    `       - module_path`,
    `       - description (optional)`,
    `  4. provenance:`,
    `       - explored_at: ISO 8601 UTC`,
    `       - explored_by: "stage1-explorer"`,
    `       - explorer_contract_version: "${input.explorerContractVersion}"`,
    `       - session_id: "${input.sessionId}"`,
    `       - runtime_version: "${input.runtimeVersion}"`,
    `       - input_chunks: 1`,
    `       - truncated_fields: []`,
    ``,
    `fact_type scope: this is Stage 1 Round 0 — focus on entity facts only.`,
    `enum / property / relation / code_mapping fact types are out of scope here`,
    `(follow-up commits). State transitions / service methods / business`,
    `constants belong to Stage 2.`,
    ``,
    `Output: a single YAML object matching Stage1ExplorerDirective. Do not`,
    `wrap in code fences. Do not add commentary before or after the YAML.`,
    `Respond in English.`,
  ].join("\n");
}
