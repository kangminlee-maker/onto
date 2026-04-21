#!/usr/bin/env node

/**
 * Coordinator State Machine — Deterministic State Enforcer for review process.
 *
 * 9 states (auto 3, await 3, terminal 3), 12 edges.
 * Auto state transitions are recorded in two phases:
 *   1. Entry transition recorded in memory (not flushed to disk)
 *   2. Exit transition recorded and flushed after auto state completes
 * On crash, the on-disk state file points to the previous await state.
 *
 * Design authority: .onto/temp/coordinator-state-machine-v3.md
 */

import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
  CoordinatorStateName,
  CoordinatorStateFile,
  CoordinatorAgentInstruction,
  CoordinatorStartResult,
  CoordinatorNextResult,
  ReviewExecutionPlan,
} from "../review/artifact-types.js";
import { ALLOWED_TRANSITIONS } from "../review/artifact-types.js";
import fs from "node:fs/promises";
import {
  isoNow,
  readYamlDocument,
  requireString,
  writeYamlDocument,
  fileExists,
  appendMarkdownLogEntry,
  parseMarkdownFrontmatter,
} from "../review/review-artifact-utils.js";
import type { ReviewSessionMetadata } from "../review/artifact-types.js";
import { readExtractMode } from "../learning/shared/mode.js";
import {
  initCoordinatorLog,
  buildSynthesizeRuntimePacket,
  writeExecutionResult,
} from "./coordinator-helpers.js";

// ─────────────────────────────────────────────
// Derived constants
// ─────────────────────────────────────────────

/** Derived from ALLOWED_TRANSITIONS: states with no outgoing edges. */
const TERMINAL_STATES: CoordinatorStateName[] = (
  Object.entries(ALLOWED_TRANSITIONS) as [
    CoordinatorStateName | "(init)",
    CoordinatorStateName[],
  ][]
)
  .filter(([key, targets]) => key !== "(init)" && targets.length === 0)
  .map(([key]) => key as CoordinatorStateName);

const AGENT_PROMPT_TEMPLATE = `You are a single bounded review unit executing as an Agent Teams-style ContextIsolatedReasoningUnit.

Unit id: {unit_id}
Unit kind: {unit_kind}
Authoritative prompt packet path: {packet_path}
Canonical output path: {output_path}

Rules:
- Read the prompt packet file at {packet_path}. Treat it as the authoritative contract.
- Treat the Boundary Policy and Effective Boundary State in the packet as hard constraints.
- Read the files referenced by the prompt packet when needed.
- Stay within the smallest sufficient file set implied by the packet.
- Do not recursively follow reference chains beyond the files explicitly listed in the packet unless the packet requires it.
- Do not use web research when the packet says web research is denied.
- Do not read outside the allowed filesystem scope described in the packet.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files yourself.
- Do not change the required output structure from the packet.
- Preserve disagreement and uncertainty explicitly when present.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly as insufficient access or insufficient evidence within boundary instead of broadening the search.

Read the prompt packet, execute the review, then write the complete output to {output_path}.`;

function buildAgentPrompt(
  unitId: string,
  unitKind: string,
  packetPath: string,
  outputPath: string,
): string {
  return AGENT_PROMPT_TEMPLATE.replace(/\{unit_id\}/g, unitId)
    .replace(/\{unit_kind\}/g, unitKind)
    .replace(/\{packet_path\}/g, packetPath)
    .replace(/\{output_path\}/g, outputPath);
}

// ─────────────────────────────────────────────
// State file I/O
// ─────────────────────────────────────────────

function stateFilePath(sessionRoot: string): string {
  return path.join(sessionRoot, "coordinator-state.yaml");
}

async function readStateFile(
  sessionRoot: string,
): Promise<CoordinatorStateFile> {
  return readYamlDocument<CoordinatorStateFile>(stateFilePath(sessionRoot));
}

async function writeStateFile(
  sessionRoot: string,
  state: CoordinatorStateFile,
): Promise<void> {
  await writeYamlDocument(stateFilePath(sessionRoot), state);
}

/**
 * Validates transition legality, updates current_state, and appends to
 * the transitions log. Does NOT flush to disk — caller decides when to write.
 *
 * Validates both:
 * - State-position: `from` must match `state.current_state` (except "(init)")
 * - Edge-existence: `from → to` must be in ALLOWED_TRANSITIONS
 */
function applyTransition(
  state: CoordinatorStateFile,
  from: CoordinatorStateName | "(init)",
  to: CoordinatorStateName,
): void {
  // State-position validation
  if (from !== "(init)" && state.current_state !== from) {
    throw new Error(
      `State position mismatch: current_state is "${state.current_state}" but transition starts from "${from}"`,
    );
  }
  // Edge-existence validation
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid state transition: ${from} → ${to}. Allowed: ${(allowed ?? []).join(", ")}`,
    );
  }
  state.current_state = to;
  state.transitions.push({ from, to, at: isoNow() });
}

// ─────────────────────────────────────────────
// Build agent instructions from execution plan
// ─────────────────────────────────────────────

function buildLensAgentInstructions(
  executionPlan: ReviewExecutionPlan,
): CoordinatorAgentInstruction[] {
  return executionPlan.lens_prompt_packet_seats.map((seat) => ({
    lens_id: seat.lens_id,
    description: `Review lens: ${seat.lens_id}`,
    prompt: buildAgentPrompt(
      seat.lens_id,
      "lens",
      seat.packet_path,
      seat.output_path,
    ),
    output_path: seat.output_path,
    packet_path: seat.packet_path,
  }));
}

function buildSynthesizeAgentInstruction(
  executionPlan: ReviewExecutionPlan,
  runtimePacketPath: string,
): CoordinatorAgentInstruction {
  return {
    lens_id: "synthesize",
    description: "Synthesize lens findings",
    prompt: buildAgentPrompt(
      "synthesize",
      "synthesize",
      runtimePacketPath,
      executionPlan.synthesis_output_path,
    ),
    output_path: executionPlan.synthesis_output_path,
    packet_path: runtimePacketPath,
  };
}

// ─────────────────────────────────────────────
// coordinator start
// ─────────────────────────────────────────────

export async function coordinatorStart(
  argv: string[],
): Promise<CoordinatorStartResult> {
  let sessionRoot: string | undefined;
  let requestText = "";

  try {
    // Phase 1: Create session via reviewPrepareOnly
    const { reviewPrepareOnly } = await import("./review-invoke.js");
    const enrichedArgv = [...argv];
    if (!enrichedArgv.includes("--prepare-only")) {
      enrichedArgv.push("--prepare-only");
    }
    const prepareResult = await reviewPrepareOnly(enrichedArgv);
    sessionRoot = path.resolve(prepareResult.session_root);
    requestText = prepareResult.request_text;

    // State file created immediately after session directory exists (CCON-1).
    // current_state="preparing" — auto state is still running (initCoordinatorLog pending).
    const stateFile: CoordinatorStateFile = {
      schema_version: "1",
      current_state: "preparing",
      session_root: sessionRoot,
      request_text: requestText,
      started_at: isoNow(),
      halt_reason: null,
      error_message: null,
      transitions: [{ from: "(init)", to: "preparing", at: isoNow() }],
    };
    await writeStateFile(sessionRoot, stateFile);

    // Phase 2: Initialize coordinator log (still within "preparing" auto state)
    await initCoordinatorLog(["--session-root", sessionRoot]);

    // Read execution plan
    const executionPlan = await readYamlDocument<ReviewExecutionPlan>(
      path.join(sessionRoot, "execution-plan.yaml"),
    );

    // preparing complete → transition to awaiting_lens_dispatch
    applyTransition(stateFile, "preparing", "awaiting_lens_dispatch");
    await writeStateFile(sessionRoot, stateFile);

    return {
      state: "awaiting_lens_dispatch",
      session_root: sessionRoot,
      request_text: requestText,
      agents: buildLensAgentInstructions(executionPlan),
      max_concurrent_lenses: executionPlan.max_concurrent_lenses ?? 5,
    };
  } catch (error) {
    if (sessionRoot) {
      try {
        // State file may exist (created after Phase 1) — update it
        const existing = await readStateFile(sessionRoot);
        existing.error_message =
          error instanceof Error ? error.message : String(error);
        applyTransition(existing, "preparing", "failed");
        await writeStateFile(sessionRoot, existing);
      } catch {
        // State file doesn't exist (Phase 1 failed) — create one
        const failedState: CoordinatorStateFile = {
          schema_version: "1",
          current_state: "failed",
          session_root: sessionRoot,
          request_text: requestText,
          started_at: isoNow(),
          halt_reason: null,
          error_message:
            error instanceof Error ? error.message : String(error),
          transitions: [
            { from: "(init)", to: "preparing", at: isoNow() },
            { from: "preparing", to: "failed", at: isoNow() },
          ],
        };
        await writeStateFile(sessionRoot, failedState);
      }
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// coordinator next
// ─────────────────────────────────────────────

export async function coordinatorNext(
  sessionRoot: string,
  projectRoot: string,
  orchestratorReportedRealization?: string,
): Promise<CoordinatorNextResult> {
  const stateFile = await readStateFile(sessionRoot);

  // Orchestrator self-reporting: record on first provided value (idempotent).
  // Closes the gap between binding.yaml's plan-time resolved_execution_realization
  // and the caller's actual dispatch mechanism. Contract §18.
  if (
    orchestratorReportedRealization &&
    !stateFile.orchestrator_reported_realization
  ) {
    stateFile.orchestrator_reported_realization = orchestratorReportedRealization;
    await writeStateFile(sessionRoot, stateFile);
  }

  const currentState = stateFile.current_state;

  if (TERMINAL_STATES.includes(currentState)) {
    throw new Error(`Session already terminated (state: ${currentState})`);
  }

  switch (currentState) {
    case "awaiting_lens_dispatch": {
      try {
        // Record auto state entry in memory (not flushed — crash-safe)
        applyTransition(
          stateFile,
          "awaiting_lens_dispatch",
          "validating_lenses",
        );

        // Run validating_lenses auto state
        const result = await buildSynthesizeRuntimePacket([
          "--session-root",
          sessionRoot,
          "--project-root",
          projectRoot,
        ]);

        if (result.halt) {
          stateFile.halt_reason = result.halt_reason ?? null;
          applyTransition(stateFile, "validating_lenses", "halted_partial");
          await writeStateFile(sessionRoot, stateFile);
          return {
            state: "halted_partial",
            session_root: sessionRoot,
            halt_reason: result.halt_reason,
            participating_lens_ids: result.participating_lens_ids,
            degraded_lens_ids: result.degraded_lens_ids,
          };
        }

        const executionPlan = await readYamlDocument<ReviewExecutionPlan>(
          path.join(sessionRoot, "execution-plan.yaml"),
        );
        const runtimePacketPath =
          result.runtime_packet_path ??
          path.join(
            executionPlan.prompt_packets_root ??
              path.join(sessionRoot, "prompt-packets"),
            "synthesize.runtime.prompt.md",
          );

        applyTransition(
          stateFile,
          "validating_lenses",
          "awaiting_synthesize_dispatch",
        );
        await writeStateFile(sessionRoot, stateFile);

        return {
          state: "awaiting_synthesize_dispatch",
          session_root: sessionRoot,
          agent: buildSynthesizeAgentInstruction(
            executionPlan,
            runtimePacketPath,
          ),
          participating_lens_ids: result.participating_lens_ids,
          degraded_lens_ids: result.degraded_lens_ids,
        };
      } catch (error) {
        // Reload from disk — in-memory state may have partial transitions
        const diskState = await readStateFile(sessionRoot);
        diskState.error_message =
          error instanceof Error ? error.message : String(error);
        // If still at awaiting_lens_dispatch on disk, record the full path
        if (diskState.current_state === "awaiting_lens_dispatch") {
          applyTransition(
            diskState,
            "awaiting_lens_dispatch",
            "validating_lenses",
          );
        }
        applyTransition(diskState, "validating_lenses", "failed");
        await writeStateFile(sessionRoot, diskState);
        return {
          state: "failed",
          session_root: sessionRoot,
          error_message: diskState.error_message,
        };
      }
    }

    case "awaiting_synthesize_dispatch": {
      // ── Deliberation note ──
      //
      // synthesize-prompt-contract.md §5.1 defines three values for
      // `deliberation_status`:
      //   - not_needed              → lens 간 disagreement 없음
      //   - performed               → synthesize 가 in-process deliberation
      //                               수행 + Deliberation Decision 기록 완료
      //   - required_but_unperformed → synthesize task 자체가 실패했을 때
      //                               record assembler 가 부여하는 failure
      //                               marker. synthesize output 에는 이 값이
      //                               나타나지 않아야 함.
      //
      // Deliberation 은 synthesize 단계 *내부* 에서 수행되는 canonical
      // 설계이며, external deliberation agent 는 존재하지 않는다. 즉
      // `awaiting_deliberation` state 는 일반 flow 에서 도달하지 않는다
      // (해당 case 의 throw 는 설계 상 invariant 위반 감지용 guard).
      //
      // 여기서의 책임은 synthesize output 의 frontmatter 가 비정상 값
      // (`required_but_unperformed`) 이면 completing 으로 진행하지 않고
      // fail-fast 하는 것. 이전에는 이 step 이 생략되어 있어, synthesize
      // task 실패가 completed 로 silent-advance 될 risk 가 있었다.

      try {
        // Record auto state entry in memory (not flushed — crash-safe)
        applyTransition(
          stateFile,
          "awaiting_synthesize_dispatch",
          "completing",
        );

        // Run completing auto state
        // Step 1: Check synthesis output
        const executionPlan = await readYamlDocument<ReviewExecutionPlan>(
          path.join(sessionRoot, "execution-plan.yaml"),
        );
        if (!(await fileExists(executionPlan.synthesis_output_path))) {
          throw new Error("completing step 1: synthesis output missing");
        }

        // Step 2: Deliberation-status guard (fail-fast on synthesize failure).
        // Reads synthesis output frontmatter — if `deliberation_status` is
        // `required_but_unperformed`, this is a signal from the upstream
        // record assembler (or synthesize task itself) that the synthesize
        // stage failed. Proceeding to completed would suppress that failure.
        const synthesisText = await fs.readFile(
          executionPlan.synthesis_output_path,
          "utf8",
        );
        const synthesisFrontmatter = parseMarkdownFrontmatter<{
          deliberation_status?: string;
        }>(synthesisText).metadata;
        const synthesisDeliberationStatus =
          synthesisFrontmatter?.deliberation_status;
        if (synthesisDeliberationStatus === "required_but_unperformed") {
          throw new Error(
            "completing step 2: synthesis output declares " +
              "`deliberation_status: required_but_unperformed` — synthesize " +
              "task failed (see synthesize-prompt-contract.md §5.1). " +
              "Re-run synthesize dispatch or halt the session; do not " +
              "advance to completed.",
          );
        }

        // Step 2.5: Learning extraction (Phase 2)
        const sessionMetadata = await readYamlDocument<ReviewSessionMetadata>(
          path.join(sessionRoot, "session-metadata.yaml"),
        );
        const extractMode = readExtractMode(sessionMetadata);

        if (extractMode !== "disabled") {
          try {
            const { runLearningExtraction } = await import(
              "../learning/extractor.js"
            );
            const extractionManifest = await runLearningExtraction({
              sessionRoot,
              projectRoot,
              executionPlan,
              mode: extractMode as "shadow" | "active",
              sessionId: executionPlan.session_id,
              sessionDomain:
                sessionMetadata.requested_domain_token || null,
            });
            // Persist manifest (shadow and production both)
            await writeYamlDocument(
              path.join(
                sessionRoot,
                "execution-preparation",
                "learning-extraction-manifest.yaml",
              ),
              extractionManifest,
            );
          } catch (error) {
            // Non-blocking: extraction failure must not prevent review completion
            await appendMarkdownLogEntry(
              path.join(sessionRoot, "error-log.md"),
              "learning extraction failed (non-blocking)",
              error instanceof Error ? error.message : String(error),
            );
          }
        }

        // Step 3: write-execution-result
        const startedAt =
          stateFile.transitions.find((t) => t.to === "preparing")?.at ??
          stateFile.started_at;
        const writeOutput = await writeExecutionResult([
          "--session-root",
          sessionRoot,
          "--started-at",
          startedAt,
        ]);

        // Step 4: complete-session
        const { completeReviewSession } = await import(
          "./complete-review-session.js"
        );
        const stateForRequest = await readStateFile(sessionRoot);
        await completeReviewSession([
          "--project-root",
          projectRoot,
          "--session-root",
          sessionRoot,
          "--request-text",
          stateForRequest.request_text,
        ]);

        applyTransition(stateFile, "completing", "completed");
        await writeStateFile(sessionRoot, stateFile);

        // Read review record status
        const reviewRecordPath =
          executionPlan.review_record_path ??
          path.join(sessionRoot, "review-record.yaml");
        let recordStatus: string | undefined;
        if (await fileExists(reviewRecordPath)) {
          const record = await readYamlDocument<{ record_status?: string }>(
            reviewRecordPath,
          );
          recordStatus = record.record_status;
        }

        return {
          state: "completed",
          session_root: sessionRoot,
          final_output_path:
            executionPlan.final_output_path ??
            path.join(sessionRoot, "final-output.md"),
          review_record_path: reviewRecordPath,
          record_status: recordStatus,
        };
      } catch (error) {
        // Reload from disk — in-memory state may have partial transitions
        const diskState = await readStateFile(sessionRoot);
        diskState.error_message =
          error instanceof Error ? error.message : String(error);
        if (diskState.current_state === "awaiting_synthesize_dispatch") {
          applyTransition(
            diskState,
            "awaiting_synthesize_dispatch",
            "completing",
          );
        }
        applyTransition(diskState, "completing", "failed");
        await writeStateFile(sessionRoot, diskState);
        return {
          state: "failed",
          session_root: sessionRoot,
          error_message: diskState.error_message,
        };
      }
    }

    case "awaiting_adjudication": {
      throw new Error(
        "Adjudication dispatch is not yet implemented. Build-mode pipeline extension (W-B-05).",
      );
    }

    case "awaiting_deliberation": {
      // Design invariant guard — this state is unreachable in the canonical
      // review flow. Deliberation is performed in-process by synthesize
      // (see synthesize-prompt-contract.md §5 / §6), which emits
      // `deliberation_status: performed` in its frontmatter. No external
      // deliberation agent is dispatched. Reaching this state indicates
      // an upstream wiring defect (e.g., a transition emitted
      // `awaiting_deliberation` without a corresponding agent contract).
      throw new Error(
        "awaiting_deliberation is unreachable under the canonical review " +
          "flow — synthesize performs in-process deliberation and emits " +
          "`deliberation_status: performed`. No external deliberation agent " +
          "exists. Reaching this state signals an upstream transition " +
          "wiring defect; investigate the caller that emitted the transition.",
      );
    }

    default:
      throw new Error(`Unexpected state for next: ${currentState}`);
  }
}

// ─────────────────────────────────────────────
// coordinator status
// ─────────────────────────────────────────────

export async function coordinatorStatus(
  sessionRoot: string,
): Promise<CoordinatorStateFile> {
  return readStateFile(sessionRoot);
}

// ─────────────────────────────────────────────
// CLI entrypoints
// ─────────────────────────────────────────────

async function cliStart(argv: string[]): Promise<number> {
  try {
    const result = await coordinatorStart(argv);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(
      `[coordinator] start failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

async function cliNext(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
      "project-root": { type: "string", default: "." },
      "orchestrator-reported-realization": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(
    requireString(values["session-root"], "session-root"),
  );
  const projectRoot = path.resolve(
    requireString(values["project-root"], "project-root"),
  );
  const orchestratorReportedRealization = values[
    "orchestrator-reported-realization"
  ] as string | undefined;

  try {
    const result = await coordinatorNext(
      sessionRoot,
      projectRoot,
      orchestratorReportedRealization,
    );
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(
      `[coordinator] next failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

async function cliStatus(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(
    requireString(values["session-root"], "session-root"),
  );

  try {
    const state = await coordinatorStatus(sessionRoot);
    console.log(JSON.stringify(state, null, 2));
    return 0;
  } catch (error) {
    console.error(
      `[coordinator] status failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

// ─────────────────────────────────────────────
// CLI dispatch
// ─────────────────────────────────────────────

async function main(): Promise<number> {
  const subcommand = process.argv[2];
  const subArgv = process.argv.slice(3);

  switch (subcommand) {
    case "start":
      return cliStart(subArgv);
    case "next":
      return cliNext(subArgv);
    case "status":
      return cliStatus(subArgv);
    default:
      console.error(`Unknown coordinator subcommand: ${subcommand}`);
      console.error("Available: start, next, status");
      return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
