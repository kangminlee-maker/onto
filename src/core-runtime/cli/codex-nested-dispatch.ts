/**
 * Codex Nested Dispatch Bridge — PR-H (2026-04-18).
 *
 * # What this module is
 *
 * The bridge between review session artifacts (execution-plan.yaml +
 * lens packet paths) and the PR-C codex-nested teamlead orchestrator.
 * It reads the execution plan, constructs the
 * `NestedLensDispatchInput`, invokes `runCodexNestedTeamlead`, and
 * classifies per-lens outcomes into the
 * `ReviewPromptExecutionResult`-compatible shape used downstream by
 * `completeReviewSession`.
 *
 * # Why it exists
 *
 * PR-C delivered the orchestrator (`runCodexNestedTeamlead`) as a pure
 * function over lens inputs → outcomes, intentionally decoupled from
 * onto's session artifacts so it could be unit-tested without
 * filesystem fixtures. PR-H adds the thin integration that the
 * runner (`runReviewInvokeCli`) can branch into when the resolved
 * topology is `codex-nested-subprocess`.
 *
 * Keeping this seat **separate** from `executeReviewPromptExecution`
 * (which uses per-lens subprocess spawning) preserves the existing
 * review flow for all other topologies — codex-nested-subprocess is
 * architecturally different (one outer teamlead codex, N nested inner
 * codexes) and does not fit the per-lens executor loop.
 *
 * # How it relates
 *
 * - `resolveExecutionTopology()` selects the topology id.
 * - `tryResolveTopologyForHandoff()` (PR-G) surfaces it to the
 *   coordinator; for non-claude topologies it also flows through
 *   `runReviewInvokeCli` directly.
 * - `executeReviewViaCodexNested()` (here) handles the nested-dispatch
 *   execution phase — the equivalent of `executeReviewPromptExecution`
 *   for the nested topology.
 * - `completeReviewSession()` downstream consumes the result to compile
 *   the final review record.
 *
 * # Scope of PR-H
 *
 * - Bridge function `executeReviewViaCodexNested`
 * - Output-file validation (exists + non-empty) on top of orchestrator
 *   outcomes — a per-lens `status: "ok"` in the orchestrator is
 *   necessary but not sufficient; the file must actually be written.
 * - Tests with injected orchestrator + injected filesystem
 *
 * **Deferred** to a subsequent integration PR:
 *   - Synthesize step execution for codex-nested topology (this PR
 *     returns `synthesis_executed: false` and defers synthesize to the
 *     caller or a follow-up wire-in).
 *   - Wire-in at `runReviewInvokeCli` (the caller branch itself).
 *   - Error log and deliberation artifact integration.
 *
 * # Design reference
 *
 * - Sketch v3 §3.1 option codex-A
 * - PR #101 (PR-C) — `runCodexNestedTeamlead`
 * - Handoff §5 (PR-C scope), §10 risk 2 resolution
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { OntoConfig } from "../discovery/config-chain.js";
import type { ReviewExecutionPlan } from "../review/artifact-types.js";
import { readYamlDocument } from "../review/review-artifact-utils.js";
import {
  type NestedLensDispatchInput,
  type CodexNestedTeamleadResult,
  runCodexNestedTeamlead,
} from "./codex-nested-teamlead-executor.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CodexNestedDispatchArgs {
  /** Absolute path to the review session directory. */
  sessionRoot: string;
  /** Project root (for outer codex cwd). Defaults to parent of sessionRoot. */
  projectRoot?: string;
  ontoConfig: OntoConfig;
  /**
   * Per-invocation timeout for the outer codex (ms). Forwarded to
   * `runCodexNestedTeamlead`. Defaults to 10 minutes.
   */
  timeout_ms?: number;
  /**
   * Codex binary override for tests / non-standard installations.
   * Defaults to `"codex"` (PATH-resolved).
   */
  codex_bin?: string;
}

/**
 * Shape compatible with `ReviewPromptExecutionResult` for drop-in use
 * by downstream pipeline (`completeReviewSession`). `synthesis_executed`
 * is always `false` in PR-H; a follow-up integration PR extends this
 * bridge to run synthesize inside the same nested dispatch.
 */
export interface CodexNestedDispatchResult {
  session_root: string;
  executed_lens_count: number;
  participating_lens_ids: string[];
  degraded_lens_ids: string[];
  synthesis_executed: false;
  synthesis_output_path: string;
  error_log_path: string | null;
  halt_reason?: string;
  /** Raw orchestrator result — retained for debugging / artifact capture. */
  nested_raw: CodexNestedTeamleadResult;
}

// ---------------------------------------------------------------------------
// Filesystem validation (injectable for tests)
// ---------------------------------------------------------------------------

export interface OutputFileInspector {
  (outputPath: string): Promise<{ exists: boolean; size: number }>;
}

const defaultInspector: OutputFileInspector = async (p) => {
  try {
    const stat = await fs.stat(p);
    return { exists: stat.isFile(), size: stat.size };
  } catch {
    return { exists: false, size: 0 };
  }
};

// ---------------------------------------------------------------------------
// Artifact archival
// ---------------------------------------------------------------------------

/**
 * Persist the outer codex's captured stdout/stderr to files under
 * `<sessionRoot>`. Used for post-hoc inspection of nested-dispatch
 * diagnostics (ENV-BEFORE / ENV-AFTER / LENS_DISPATCH_SUMMARY) since the
 * orchestrator result is not propagated through review-invoke's final
 * JSON output.
 *
 * Silently swallows write errors — an artifact write failure must not
 * mask the actual dispatch outcome. The archive is best-effort.
 */
async function archiveOuterStreams(
  sessionRoot: string,
  nestedResult: CodexNestedTeamleadResult,
): Promise<void> {
  const stdoutPath = path.join(sessionRoot, "nested-outer-stdout.log");
  const stderrPath = path.join(sessionRoot, "nested-outer-stderr.log");
  await Promise.all([
    fs.writeFile(stdoutPath, nestedResult.outer_stdout ?? "").catch(() => {}),
    fs.writeFile(stderrPath, nestedResult.outer_stderr ?? "").catch(() => {}),
  ]);
}

// ---------------------------------------------------------------------------
// Spawn-config resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the `model` / `effort` to pass to the codex-nested orchestrator.
 *
 * # Single knob, deliberate
 *
 * The orchestrator's `runCodexNestedTeamlead` currently accepts ONE
 * `{ model, reasoning_effort }` pair and applies it to both the outer
 * codex teamlead AND every inner codex lens subprocess. For the
 * `codex-nested-subprocess` topology this is by design: the shape is
 * `ext-teamlead_native` (external codex teamlead + nested codex lens),
 * so teamlead and subagent ARE the same provider. Splitting the knob
 * would be possible (separate `outer_*` / `inner_*` inputs), but
 * would create four config-shape combinations that need to agree or
 * error, for no empirical benefit observed in any current topology.
 *
 * # Resolution priority (highest first)
 *
 *   1. `review.subagent` when `provider === "codex"` — the P2
 *      canonical location for the spawn target's config. In
 *      `ext-teamlead_native` this single seat steers both outer and
 *      inner codex.
 *   2. `review.teamlead.model` when it is an explicit
 *      `{ provider: "codex" }` spec — fallback when subagent is
 *      `main-native` or absent but teamlead is an external codex.
 *   3. Legacy top-level `codex.*` — pre-P2 configs still in the wild.
 *   4. Legacy top-level `model` / `reasoning_effort` — even older shape.
 *
 * # Why P2 moved it + why this bridge exists
 *
 * Review UX Redesign P2 moved user-facing config into `review:` axis
 * block, but `codex-nested-dispatch` initially kept reading only the
 * legacy top-level `codex.*`. When a smoke script (or real principal)
 * put `effort: medium` under `review.subagent` (the P2 canonical
 * location), it silently fell through and the nested codex ran with
 * `~/.codex/config.toml` defaults (often `xhigh`), causing outer
 * teamlead timeouts during multi-lens dispatch (2026-04-22 D-1 smoke
 * drift). This helper bridges the generation gap.
 *
 * Returns `{}` when nothing resolves — caller omits both fields from
 * the orchestrator input (codex picks its own defaults).
 */
export function resolveCodexSpawnConfig(
  config: OntoConfig,
): { model?: string; effort?: string } {
  const sub = config.review?.subagent;
  if (sub && sub.provider === "codex") {
    return {
      ...(sub.model_id ? { model: sub.model_id } : {}),
      ...(sub.effort ? { effort: sub.effort } : {}),
    };
  }
  const tl = config.review?.teamlead?.model;
  if (tl && tl !== "main" && tl.provider === "codex") {
    return {
      ...(tl.model_id ? { model: tl.model_id } : {}),
      ...(tl.effort ? { effort: tl.effort } : {}),
    };
  }
  if (config.codex?.model || config.codex?.effort) {
    return {
      ...(config.codex.model ? { model: config.codex.model } : {}),
      ...(config.codex.effort ? { effort: config.codex.effort } : {}),
    };
  }
  return {
    ...(config.model ? { model: config.model } : {}),
    ...(config.reasoning_effort ? { effort: config.reasoning_effort } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main bridge function
// ---------------------------------------------------------------------------

/**
 * Execute a review via the codex-nested topology. Reads the execution
 * plan from `sessionRoot/execution-plan.yaml`, dispatches all lens
 * packets through one outer codex teamlead + inner codex per lens, and
 * classifies outcomes into participating / degraded lens sets.
 *
 * An orchestrator `status: "ok"` is NOT sufficient for `participating` —
 * the output file must exist AND be non-empty. This guards against the
 * outer codex reporting success when the inner codex silently failed to
 * write its `-o` output (a codex CLI quirk documented in §9 of
 * `docs/codex-nested-topology-sandbox.md`).
 *
 * Injection:
 *   - `runImpl`: replace the orchestrator (default: `runCodexNestedTeamlead`)
 *   - `inspector`: replace the file-existence probe (default: `fs.stat`)
 */
export async function executeReviewViaCodexNested(
  args: CodexNestedDispatchArgs,
  runImpl: typeof runCodexNestedTeamlead = runCodexNestedTeamlead,
  inspector: OutputFileInspector = defaultInspector,
): Promise<CodexNestedDispatchResult> {
  const executionPlanPath = path.join(args.sessionRoot, "execution-plan.yaml");
  // `readYamlDocument` throws with a descriptive message when the file
  // is missing or malformed — let it propagate so the caller sees the
  // session artifact problem directly rather than a generic null check.
  const plan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);

  const lenses: NestedLensDispatchInput[] = plan.lens_prompt_packet_seats.map(
    (seat) => ({
      lens_id: seat.lens_id,
      packet_path: seat.packet_path,
      output_path: seat.output_path,
    }),
  );

  const spawnConfig = resolveCodexSpawnConfig(args.ontoConfig);

  const nestedResult = await runImpl({
    lenses,
    ...(spawnConfig.model ? { model: spawnConfig.model } : {}),
    ...(spawnConfig.effort ? { reasoning_effort: spawnConfig.effort } : {}),
    ...(args.projectRoot ? { project_root: args.projectRoot } : {}),
    ...(typeof args.timeout_ms === "number" ? { timeout_ms: args.timeout_ms } : {}),
    ...(args.codex_bin ? { codex_bin: args.codex_bin } : {}),
  });

  // Archive the outer codex's stdout/stderr to session artifacts. The outer
  // stream carries the ENV-BEFORE / ENV-AFTER diagnostics and the
  // LENS_DISPATCH_SUMMARY sentinel — valuable for post-hoc auditing of
  // "what environment each lens actually ran in". review-invoke's final
  // JSON does not propagate `nested_raw`, so without this archive step
  // the outer trace would be unrecoverable once the session ends.
  await archiveOuterStreams(args.sessionRoot, nestedResult);

  const participating: string[] = [];
  const degraded: string[] = [];
  for (let i = 0; i < lenses.length; i += 1) {
    const lens = lenses[i]!;
    const outcome = nestedResult.outcomes[i];
    const orchestratorOk = outcome?.status === "ok";
    if (!orchestratorOk) {
      degraded.push(lens.lens_id);
      continue;
    }
    const probe = await inspector(lens.output_path);
    if (probe.exists && probe.size > 0) {
      participating.push(lens.lens_id);
    } else {
      degraded.push(lens.lens_id);
    }
  }

  // Determine halt_reason when orchestrator signalled teamlead-level
  // failure (e.g., timeout, no summary) — surfaces to the caller for
  // error reporting. Per-lens degradation alone does NOT halt.
  let halt_reason: string | undefined;
  if (!nestedResult.summary_parsed && nestedResult.outer_exit_code !== 0) {
    halt_reason =
      `codex-nested outer teamlead failed (exit=${nestedResult.outer_exit_code}, summary=${nestedResult.summary_parsed ? "parsed" : "missing"})`;
  }

  return {
    session_root: args.sessionRoot,
    executed_lens_count: lenses.length,
    participating_lens_ids: participating,
    degraded_lens_ids: degraded,
    synthesis_executed: false,
    synthesis_output_path: plan.synthesis_output_path,
    error_log_path: plan.error_log_path ?? null,
    nested_raw: nestedResult,
    ...(halt_reason ? { halt_reason } : {}),
  };
}
