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
  ReviewExecutionPlan,
  ReviewExecutionResultArtifact,
  ReviewExecutionStatus,
  ReviewUnitExecutionResult,
} from "../review/artifact-types.js";
import {
  appendMarkdownLogEntry,
  fileExists,
  readYamlDocument,
  writeYamlDocument,
  parseMarkdownFrontmatter,
} from "../review/review-artifact-utils.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function isoNow(): string {
  return new Date().toISOString();
}

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

export async function runInitCoordinatorLog(argv: string[]): Promise<number> {
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

  console.log(JSON.stringify({
    error_log_path: errorLogPath,
    max_concurrent_lenses: maxConcurrentLenses,
    lens_count: executionPlan.lens_prompt_packet_seats.length,
  }, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// Subcommand: build-synthesize-runtime-packet
// ─────────────────────────────────────────────

export async function runBuildSynthesizeRuntimePacket(argv: string[]): Promise<number> {
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
    console.log(JSON.stringify({
      halt: true,
      halt_reason: haltReason,
      participating_lens_ids: participating,
      degraded_lens_ids: degraded.map((d) => d.lens_id),
    }, null, 2));
    return 0;
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
    "onto_synthesize.runtime.prompt.md",
  );
  const enrichedText = `${synthesizePacketText.trimEnd()}\n\n## Runtime Participating Lens Outputs\n${lensRefsSection}\n${degradedSection}`;
  await fs.writeFile(runtimePacketPath, enrichedText.trimEnd() + "\n", "utf8");

  console.log(JSON.stringify({
    halt: false,
    participating_lens_ids: participating,
    degraded_lens_ids: degraded.map((d) => d.lens_id),
    runtime_packet_path: runtimePacketPath,
  }, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// Subcommand: write-execution-result
// ─────────────────────────────────────────────

function deriveExecutionStatus(
  synthesisExecuted: boolean,
  degradedLensCount: number,
): ReviewExecutionStatus {
  if (!synthesisExecuted) return "halted_partial";
  if (degradedLensCount > 0) return "completed_with_degradation";
  return "completed";
}

export async function runWriteExecutionResult(argv: string[]): Promise<number> {
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

  const lensResults: ReviewUnitExecutionResult[] =
    executionPlan.lens_prompt_packet_seats.map((seat) => ({
      unit_id: seat.lens_id,
      unit_kind: "lens" as const,
      packet_path: seat.packet_path,
      output_path: seat.output_path,
      status: participating.includes(seat.lens_id) ? "completed" as const : "failed" as const,
      started_at: executionStartedAt,
      completed_at: completedAt,
      duration_ms: Math.max(0, endMs - startMs),
      failure_message: degraded.includes(seat.lens_id) ? "output file missing or empty" : null,
    }));

  const runtimePacketPath = path.join(
    executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets"),
    "onto_synthesize.runtime.prompt.md",
  );

  const synthesizeResult: ReviewUnitExecutionResult | null = synthesisExecuted
    ? {
        unit_id: "onto_synthesize",
        unit_kind: "synthesize",
        packet_path: runtimePacketPath,
        output_path: synthesisPath,
        status: (await fileExists(synthesisPath)) ? "completed" : "failed",
        started_at: executionStartedAt,
        completed_at: completedAt,
        duration_ms: Math.max(0, endMs - startMs),
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
    error_log_path: executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md"),
    lens_execution_results: lensResults,
    synthesize_execution_result: synthesizeResult,
  };

  const resultPath = executionPlan.execution_result_path ?? path.join(sessionRoot, "execution-result.yaml");
  await writeYamlDocument(resultPath, artifact);

  console.log(JSON.stringify({
    execution_result_path: resultPath,
    execution_status: artifact.execution_status,
    participating_lens_count: participating.length,
    degraded_lens_count: degraded.length,
  }, null, 2));
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
