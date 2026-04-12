#!/usr/bin/env node

/**
 * CLI helpers for the Nested Spawn Coordinator.
 *
 * These automate the deterministic boilerplate that the coordinator
 * previously performed manually between Agent tool dispatches.
 *
 * Non-deterministic elements (documented):
 * - Failure messages: generic "output file missing or empty" (Agent tool
 *   does not provide structured error info)
 * - Timing: approximate timestamps recorded at CLI invocation time
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
  CoordinatorStateFile,
  ReviewExecutionPlan,
  ReviewExecutionResultArtifact,
  ReviewExecutionStatus,
  ReviewUnitExecutionResult,
} from "../review/artifact-types.js";
import {
  appendMarkdownLogEntry,
  fileExists,
  isoNow,
  readYamlDocument,
  requireString,
  writeYamlDocument,
  parseMarkdownFrontmatter,
} from "../review/review-artifact-utils.js";

function toRelativePath(absolutePath: string, projectRoot: string): string {
  return path.relative(projectRoot, absolutePath);
}

function renderBoundaryStateLog(
  effectiveBoundaryState: Record<string, unknown>,
): string {
  const lines: string[] = [];
  for (const [dimension, state] of Object.entries(effectiveBoundaryState)) {
    if (state && typeof state === "object" && "requested_policy" in state) {
      const s = state as Record<string, unknown>;
      lines.push(
        `${dimension}: requested=${s.requested_policy}, effective=${s.effective_policy}, guarantee=${s.guarantee_level}`,
      );
      const notes = s.notes;
      if (Array.isArray(notes)) {
        for (const note of notes) {
          lines.push(`note.${dimension}: ${note}`);
        }
      }
    } else if (dimension === "filesystem_scope" && state && typeof state === "object") {
      const fs = state as Record<string, unknown>;
      const roots = Array.isArray(fs.effective_allowed_roots)
        ? fs.effective_allowed_roots.join(", ")
        : String(fs.effective_allowed_roots ?? "");
      lines.push(`filesystem_scope_effective: ${roots}`);
      lines.push(`filesystem_scope_guarantee: ${fs.guarantee_level}`);
      if (Array.isArray(fs.notes)) {
        for (const note of fs.notes) {
          lines.push(`note.filesystem_scope: ${note}`);
        }
      }
    }
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────
// Subcommand: init-coordinator-log
// ─────────────────────────────────────────────

export interface InitCoordinatorLogResult {
  error_log_path: string;
  max_concurrent_lenses: number;
  lens_count: number;
}

export async function initCoordinatorLog(argv: string[]): Promise<InitCoordinatorLogResult> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const executionPlan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);

  const errorLogPath = executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");
  const maxConcurrentLenses =
    executionPlan.max_concurrent_lenses ??
    executionPlan.lens_prompt_packet_seats.length;

  await appendMarkdownLogEntry(
    errorLogPath,
    "runner boundary state",
    renderBoundaryStateLog(executionPlan.effective_boundary_state as unknown as Record<string, unknown>),
  );
  await appendMarkdownLogEntry(
    errorLogPath,
    "runner parallel dispatch policy",
    `max_concurrent_lenses: ${maxConcurrentLenses}`,
  );

  return {
    error_log_path: errorLogPath,
    max_concurrent_lenses: maxConcurrentLenses,
    lens_count: executionPlan.lens_prompt_packet_seats.length,
  };
}

export async function runInitCoordinatorLog(argv: string[]): Promise<number> {
  const result = await initCoordinatorLog(argv);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// Subcommand: build-synthesize-runtime-packet
// ─────────────────────────────────────────────

export interface BuildSynthesizePacketResult {
  halt: boolean;
  halt_reason: string | undefined;
  participating_lens_ids: string[];
  degraded_lens_ids: string[];
  runtime_packet_path: string | undefined;
}

export async function buildSynthesizeRuntimePacket(argv: string[]): Promise<BuildSynthesizePacketResult> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
      "project-root": { type: "string", default: "." },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));
  const projectRoot = path.resolve(requireString(values["project-root"], "project-root"));
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const executionPlan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);
  const errorLogPath = executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");

  // Check lens outputs
  const participating: string[] = [];
  const degraded: Array<{ lens_id: string; message: string }> = [];

  for (const seat of executionPlan.lens_prompt_packet_seats) {
    if (await fileExists(seat.output_path)) {
      const text = await fs.readFile(seat.output_path, "utf8");
      if (text.trim().length > 0) {
        participating.push(seat.lens_id);
        continue;
      }
    }
    degraded.push({
      lens_id: seat.lens_id,
      message: "output file missing or empty",
    });
    await appendMarkdownLogEntry(
      errorLogPath,
      `lens failure: ${seat.lens_id}`,
      `unit_id: ${seat.lens_id}\nunit_kind: lens\npacket_path: ${seat.packet_path}\noutput_path: ${seat.output_path}\nmessage: output file missing or empty`,
    );
  }

  const minimumParticipating = executionPlan.minimum_participating_lenses ?? 2;

  if (participating.length < minimumParticipating) {
    const haltReason = participating.length === 0
      ? "No participating lens outputs were produced."
      : `Fewer than ${minimumParticipating} participating lens outputs remain after degraded execution.`;
    await appendMarkdownLogEntry(errorLogPath, "runner halted before synthesize", haltReason);
    return {
      halt: true,
      halt_reason: haltReason,
      participating_lens_ids: participating,
      degraded_lens_ids: degraded.map((d) => d.lens_id),
      runtime_packet_path: undefined,
    };
  }

  // Build enriched synthesize packet
  const synthesizePacketText = await fs.readFile(
    executionPlan.synthesize_prompt_packet_path,
    "utf8",
  );
  const lensRefsSection = participating
    .map((lensId) => {
      const seat = executionPlan.lens_prompt_packet_seats.find((s) => s.lens_id === lensId);
      return `- ${lensId}: ${toRelativePath(seat?.output_path ?? "", projectRoot)}`;
    })
    .join("\n");
  const degradedSection = degraded.length > 0
    ? `\n## Degraded Lens Failures\n${degraded.map((d) => `- ${d.lens_id}: ${d.message}`).join("\n")}\n`
    : "";

  const runtimePacketPath = path.join(
    executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets"),
    "synthesize.runtime.prompt.md",
  );
  const enrichedText = `${synthesizePacketText.trimEnd()}\n\n## Runtime Participating Lens Outputs\n${lensRefsSection}\n${degradedSection}`;
  await fs.writeFile(runtimePacketPath, enrichedText.trimEnd() + "\n", "utf8");

  return {
    halt: false,
    halt_reason: undefined,
    participating_lens_ids: participating,
    degraded_lens_ids: degraded.map((d) => d.lens_id),
    runtime_packet_path: runtimePacketPath,
  };
}

export async function runBuildSynthesizeRuntimePacket(argv: string[]): Promise<number> {
  const result = await buildSynthesizeRuntimePacket(argv);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// Subcommand: write-execution-result
// ─────────────────────────────────────────────
//
// Per-unit timestamp provenance (coordinator path):
// - started_at: derived from coordinator-state.yaml transition timestamps
//   (awaiting_lens_dispatch / awaiting_synthesize_dispatch). Represents
//   dispatch instruction time, which precedes actual agent execution start.
//   Over-estimation bound: dispatch latency + agent boot + LLM execution +
//   file-write. Typically tens of seconds to a few minutes for LLM agents;
//   unsuitable for ms-scale SLA comparisons.
// - completed_at: derived from fs.stat(output_path).mtime for participating
//   units. Filesystem mtime precision is platform-dependent (e.g. HFS+ 1s).
//   Post-write assumption: round1/*.md and synthesis.md must not be re-touched
//   by any writer after the dispatched agent completes (deliberation writes
//   to deliberation.md, render writes to final-output.md — no overlap).
// - Non-participating / failed / skipped cases fall back to the batch
//   `completedAt` for completed_at: those timestamps are NOT per-unit
//   measurements and `duration_ms` for such units is batch wall-clock
//   time, not per-unit execution time.
// - TS runner path (run-review-prompt-execution.ts) uses process wall-clock
//   measurements; both paths write to the same ReviewUnitExecutionResult
//   interface but carry different semantic provenance. Consumers comparing
//   `duration_ms` across realizations must account for this (see
//   `execution_realization` field). A discriminator field at schema level is
//   tracked as a follow-up (K2 of PR #25 review).

function deriveExecutionStatus(
  synthesisExecuted: boolean,
  degradedLensCount: number,
): ReviewExecutionStatus {
  if (!synthesisExecuted) return "halted_partial";
  if (degradedLensCount > 0) return "completed_with_degradation";
  return "completed";
}

/** Read coordinator state file if present. Returns null on any failure. */
async function readCoordinatorStateFileOrNull(
  sessionRoot: string,
): Promise<CoordinatorStateFile | null> {
  const stateFilePath = path.join(sessionRoot, "coordinator-state.yaml");
  if (!(await fileExists(stateFilePath))) {
    return null;
  }
  try {
    return await readYamlDocument<CoordinatorStateFile>(stateFilePath);
  } catch {
    return null;
  }
}

/**
 * Find the timestamp of the first transition with matching `to` state.
 *
 * Invariant (current state machine): each target state appears at most once in
 * `transitions` per session, so "first match" is unambiguous. If future
 * retry/resume flows allow re-entering the same state, the semantics of
 * `started_at` would straddle cycles — switch to `findLast`-style lookup then.
 *
 * Fails soft by returning `null` when `stateFile` is absent or the
 * `transitions` array is missing/malformed (runtime YAML shape is not
 * compile-time guaranteed).
 */
function findTransitionAt(
  stateFile: CoordinatorStateFile | null,
  toState: string,
): string | null {
  if (!stateFile) return null;
  if (!Array.isArray(stateFile.transitions)) return null;
  const transition = stateFile.transitions.find((t) => t.to === toState);
  return transition?.at ?? null;
}

/** Read file mtime as ISO string. Returns null on failure. */
async function readFileMtimeIsoOrNull(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

function computeDurationMs(startedAt: string, completedAt: string): number {
  return Math.max(
    0,
    new Date(completedAt).getTime() - new Date(startedAt).getTime(),
  );
}

export interface WriteExecutionResultOutput {
  execution_result_path: string;
  execution_status: string;
  participating_lens_count: number;
  degraded_lens_count: number;
}

export async function writeExecutionResult(argv: string[]): Promise<WriteExecutionResultOutput> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
      "started-at": { type: "string" },
      "synthesis-executed": { type: "string", default: "true" },
      "halt-reason": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const executionPlan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);
  const executionStartedAt = typeof values["started-at"] === "string"
    ? values["started-at"]
    : isoNow();
  const synthesisExecuted = values["synthesis-executed"] !== "false";
  const haltReason = typeof values["halt-reason"] === "string" && values["halt-reason"].length > 0
    ? values["halt-reason"]
    : null;

  // Check lens outputs
  const planned = executionPlan.lens_prompt_packet_seats.map((s) => s.lens_id);
  const participating: string[] = [];
  const degraded: string[] = [];

  for (const seat of executionPlan.lens_prompt_packet_seats) {
    if (await fileExists(seat.output_path)) {
      const text = await fs.readFile(seat.output_path, "utf8");
      if (text.trim().length > 0) {
        participating.push(seat.lens_id);
        continue;
      }
    }
    degraded.push(seat.lens_id);
  }

  const excluded = planned.filter(
    (id) => !participating.includes(id) && !degraded.includes(id),
  );

  // Read deliberation status from synthesis frontmatter
  let deliberationStatus: string | null = null;
  const synthesisPath = executionPlan.synthesis_output_path;
  if (synthesisExecuted && await fileExists(synthesisPath)) {
    const synthesisText = await fs.readFile(synthesisPath, "utf8");
    const parsed = parseMarkdownFrontmatter<{ deliberation_status?: string }>(synthesisText);
    deliberationStatus = parsed.metadata?.deliberation_status ?? null;
  }
  const deliberationPath = executionPlan.deliberation_output_path;
  if (deliberationPath && await fileExists(deliberationPath)) {
    deliberationStatus = "performed";
  }

  const completedAt = isoNow();
  const startMs = new Date(executionStartedAt).getTime();
  const endMs = new Date(completedAt).getTime();

  // Per-unit timestamp precision: read coordinator state transitions + file mtime.
  // On any failure, fall back to batch timestamps (executionStartedAt / completedAt)
  // while emitting a warning so the degradation is not silent. Warnings are also
  // persisted to error-log.md so that post-session inspection can reconstruct
  // whether per-unit timing was degraded for this session.
  const errorLogPath =
    executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");
  const stateFile = await readCoordinatorStateFileOrNull(sessionRoot);
  if (!stateFile) {
    const msg =
      "coordinator-state.yaml missing or unreadable; falling back to batch timestamps for per-unit started_at.";
    console.warn(`[coordinator-helpers] ${msg}`);
    await appendMarkdownLogEntry(
      errorLogPath,
      "per-unit timestamp degraded",
      msg,
    );
  }

  const lensDispatchAt = findTransitionAt(stateFile, "awaiting_lens_dispatch");
  if (stateFile && !lensDispatchAt) {
    const msg =
      "coordinator-state.yaml has no 'awaiting_lens_dispatch' transition; falling back to batch timestamp for lens started_at.";
    console.warn(`[coordinator-helpers] ${msg}`);
    await appendMarkdownLogEntry(
      errorLogPath,
      "per-unit timestamp degraded (lens)",
      msg,
    );
  }
  const lensStartedAt = lensDispatchAt ?? executionStartedAt;

  const lensResults: ReviewUnitExecutionResult[] = await Promise.all(
    executionPlan.lens_prompt_packet_seats.map(async (seat) => {
      const isParticipating = participating.includes(seat.lens_id);
      const mtimeIso = isParticipating
        ? await readFileMtimeIsoOrNull(seat.output_path)
        : null;
      const unitCompletedAt = mtimeIso ?? completedAt;
      return {
        unit_id: seat.lens_id,
        unit_kind: "lens" as const,
        packet_path: seat.packet_path,
        output_path: seat.output_path,
        status: isParticipating ? ("completed" as const) : ("failed" as const),
        started_at: lensStartedAt,
        completed_at: unitCompletedAt,
        duration_ms: computeDurationMs(lensStartedAt, unitCompletedAt),
        failure_message: degraded.includes(seat.lens_id) ? "output file missing or empty" : null,
      };
    }),
  );

  const runtimePacketPath = path.join(
    executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets"),
    "synthesize.runtime.prompt.md",
  );

  const synthesizeDispatchAt = findTransitionAt(
    stateFile,
    "awaiting_synthesize_dispatch",
  );
  if (synthesisExecuted && stateFile && !synthesizeDispatchAt) {
    const msg =
      "coordinator-state.yaml has no 'awaiting_synthesize_dispatch' transition; falling back to batch timestamp for synthesize started_at.";
    console.warn(`[coordinator-helpers] ${msg}`);
    await appendMarkdownLogEntry(
      errorLogPath,
      "per-unit timestamp degraded (synthesize)",
      msg,
    );
  }
  const synthesizeStartedAt = synthesizeDispatchAt ?? executionStartedAt;
  const synthesizeMtimeIso = synthesisExecuted
    ? await readFileMtimeIsoOrNull(synthesisPath)
    : null;
  const synthesizeCompletedAt = synthesizeMtimeIso ?? completedAt;

  const synthesizeResult: ReviewUnitExecutionResult | null = synthesisExecuted
    ? {
        unit_id: "synthesize",
        unit_kind: "synthesize",
        packet_path: runtimePacketPath,
        output_path: synthesisPath,
        status: (await fileExists(synthesisPath)) ? "completed" : "failed",
        started_at: synthesizeStartedAt,
        completed_at: synthesizeCompletedAt,
        duration_ms: computeDurationMs(synthesizeStartedAt, synthesizeCompletedAt),
        failure_message: null,
      }
    : null;

  const artifact: ReviewExecutionResultArtifact = {
    session_id: executionPlan.session_id,
    session_root: sessionRoot,
    execution_realization: executionPlan.execution_realization,
    host_runtime: executionPlan.host_runtime,
    review_mode: executionPlan.review_mode,
    execution_status: deriveExecutionStatus(synthesisExecuted, degraded.length),
    execution_started_at: executionStartedAt,
    execution_completed_at: completedAt,
    total_duration_ms: Math.max(0, endMs - startMs),
    planned_lens_ids: planned,
    participating_lens_ids: participating,
    degraded_lens_ids: degraded,
    excluded_lens_ids: excluded,
    executed_lens_count: participating.length,
    synthesis_executed: synthesisExecuted,
    deliberation_status: deliberationStatus as ReviewExecutionResultArtifact["deliberation_status"],
    halt_reason: haltReason,
    error_log_path: errorLogPath,
    lens_execution_results: lensResults,
    synthesize_execution_result: synthesizeResult,
  };

  const resultPath = executionPlan.execution_result_path ?? path.join(sessionRoot, "execution-result.yaml");
  await writeYamlDocument(resultPath, artifact);

  return {
    execution_result_path: resultPath,
    execution_status: artifact.execution_status,
    participating_lens_count: participating.length,
    degraded_lens_count: degraded.length,
  };
}

export async function runWriteExecutionResult(argv: string[]): Promise<number> {
  const result = await writeExecutionResult(argv);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// CLI dispatch
// ─────────────────────────────────────────────

async function main(): Promise<number> {
  const subcommand = process.argv[2];
  const subArgv = process.argv.slice(3);

  switch (subcommand) {
    case "init-log":
      return runInitCoordinatorLog(subArgv);
    case "build-synthesize-packet":
      return runBuildSynthesizeRuntimePacket(subArgv);
    case "write-execution-result":
      return runWriteExecutionResult(subArgv);
    default:
      console.error(`Unknown coordinator-helper subcommand: ${subcommand}`);
      console.error("Available: init-log, build-synthesize-packet, write-execution-result");
      return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
