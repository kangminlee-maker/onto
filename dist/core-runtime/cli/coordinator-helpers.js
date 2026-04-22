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
import { appendMarkdownLogEntry, fileExists, isoNow, readYamlDocument, requireString, writeYamlDocument, parseMarkdownFrontmatter, } from "../review/review-artifact-utils.js";
function toRelativePath(absolutePath, projectRoot) {
    return path.relative(projectRoot, absolutePath);
}
function renderBoundaryStateLog(effectiveBoundaryState) {
    const lines = [];
    for (const [dimension, state] of Object.entries(effectiveBoundaryState)) {
        if (state && typeof state === "object" && "requested_policy" in state) {
            const s = state;
            lines.push(`${dimension}: requested=${s.requested_policy}, effective=${s.effective_policy}, guarantee=${s.guarantee_level}`);
            const notes = s.notes;
            if (Array.isArray(notes)) {
                for (const note of notes) {
                    lines.push(`note.${dimension}: ${note}`);
                }
            }
        }
        else if (dimension === "filesystem_scope" && state && typeof state === "object") {
            const fs = state;
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
export async function initCoordinatorLog(argv) {
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
    const executionPlan = await readYamlDocument(executionPlanPath);
    const errorLogPath = executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");
    const maxConcurrentLenses = executionPlan.max_concurrent_lenses ??
        executionPlan.lens_prompt_packet_seats.length;
    await appendMarkdownLogEntry(errorLogPath, "runner boundary state", renderBoundaryStateLog(executionPlan.effective_boundary_state));
    await appendMarkdownLogEntry(errorLogPath, "runner parallel dispatch policy", `max_concurrent_lenses: ${maxConcurrentLenses}`);
    return {
        error_log_path: errorLogPath,
        max_concurrent_lenses: maxConcurrentLenses,
        lens_count: executionPlan.lens_prompt_packet_seats.length,
    };
}
export async function runInitCoordinatorLog(argv) {
    const result = await initCoordinatorLog(argv);
    console.log(JSON.stringify(result, null, 2));
    return 0;
}
export async function buildSynthesizeRuntimePacket(argv) {
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
    const executionPlan = await readYamlDocument(executionPlanPath);
    const errorLogPath = executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");
    // Check lens outputs
    const participating = [];
    const degraded = [];
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
        await appendMarkdownLogEntry(errorLogPath, `lens failure: ${seat.lens_id}`, `unit_id: ${seat.lens_id}\nunit_kind: lens\npacket_path: ${seat.packet_path}\noutput_path: ${seat.output_path}\nmessage: output file missing or empty`);
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
    const synthesizePacketText = await fs.readFile(executionPlan.synthesize_prompt_packet_path, "utf8");
    const lensRefsSection = participating
        .map((lensId) => {
        const seat = executionPlan.lens_prompt_packet_seats.find((s) => s.lens_id === lensId);
        return `- ${lensId}: ${toRelativePath(seat?.output_path ?? "", projectRoot)}`;
    })
        .join("\n");
    const degradedSection = degraded.length > 0
        ? `\n## Degraded Lens Failures\n${degraded.map((d) => `- ${d.lens_id}: ${d.message}`).join("\n")}\n`
        : "";
    const runtimePacketPath = path.join(executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets"), "synthesize.runtime.prompt.md");
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
export async function runBuildSynthesizeRuntimePacket(argv) {
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
//   tracked as a follow-up (K2 of PR #25 re-review; session
//   .onto/review/20260413-7880b48f).
function deriveExecutionStatus(synthesisExecuted, degradedLensCount) {
    if (!synthesisExecuted)
        return "halted_partial";
    if (degradedLensCount > 0)
        return "completed_with_degradation";
    return "completed";
}
/**
 * Read coordinator state file. Fails soft by returning a null `state`,
 * but preserves the reason (missing vs unreadable) for observability.
 */
async function readCoordinatorStateFile(sessionRoot) {
    const stateFilePath = path.join(sessionRoot, "coordinator-state.yaml");
    if (!(await fileExists(stateFilePath))) {
        return { kind: "missing", state: null };
    }
    try {
        const state = await readYamlDocument(stateFilePath);
        return { kind: "present", state };
    }
    catch {
        return { kind: "unreadable", state: null };
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
function findTransitionAt(stateFile, toState) {
    if (!stateFile)
        return null;
    if (!Array.isArray(stateFile.transitions))
        return null;
    const transition = stateFile.transitions.find((t) => t.to === toState);
    return transition?.at ?? null;
}
/** Read file mtime as ISO string. Returns null on failure. */
async function readFileMtimeIsoOrNull(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return stat.mtime.toISOString();
    }
    catch {
        return null;
    }
}
/**
 * Compute duration in ms, clamping negative deltas to 0.
 *
 * A negative delta indicates clock inversion (wall vs filesystem mtime, or
 * state-transition timestamp ordering mismatch) and is typically a sign of
 * clock skew or misconfigured NTP, not normal execution. We warn when
 * `unitId` is provided so that clamping is not silent.
 */
function computeDurationMs(startedAt, completedAt, unitId) {
    const delta = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (delta < 0 && unitId) {
        console.warn(`[coordinator-helpers] negative duration clamped for ${unitId}: ` +
            `started_at=${startedAt}, completed_at=${completedAt} (clock skew?)`);
    }
    return Math.max(0, delta);
}
/**
 * Warn on stderr AND persist to error-log.md with a structured prefix.
 * The `kind` discriminator lets post-session aggregators group degradation
 * events without parsing the free-form message body.
 */
async function warnAndLogDegradation(errorLogPath, kind, title, message) {
    console.warn(`[coordinator-helpers] ${message}`);
    await appendMarkdownLogEntry(errorLogPath, title, `degradation_kind: ${kind}\n${message}`);
}
export async function writeExecutionResult(argv) {
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
    const executionPlan = await readYamlDocument(executionPlanPath);
    const executionStartedAt = typeof values["started-at"] === "string"
        ? values["started-at"]
        : isoNow();
    const synthesisExecuted = values["synthesis-executed"] !== "false";
    const haltReason = typeof values["halt-reason"] === "string" && values["halt-reason"].length > 0
        ? values["halt-reason"]
        : null;
    // Check lens outputs
    const planned = executionPlan.lens_prompt_packet_seats.map((s) => s.lens_id);
    const participating = [];
    const degraded = [];
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
    const excluded = planned.filter((id) => !participating.includes(id) && !degraded.includes(id));
    // Read deliberation status from synthesis frontmatter
    let deliberationStatus = null;
    const synthesisPath = executionPlan.synthesis_output_path;
    if (synthesisExecuted && await fileExists(synthesisPath)) {
        const synthesisText = await fs.readFile(synthesisPath, "utf8");
        const parsed = parseMarkdownFrontmatter(synthesisText);
        deliberationStatus = parsed.metadata?.deliberation_status ?? null;
    }
    const deliberationPath = executionPlan.deliberation_output_path;
    if (deliberationPath && await fileExists(deliberationPath)) {
        deliberationStatus = "performed";
    }
    const completedAt = isoNow();
    // Per-unit timestamp precision: read coordinator state transitions + file mtime.
    // On any failure, fall back to batch timestamps (executionStartedAt / completedAt)
    // while emitting a warning so the degradation is not silent. Warnings are also
    // persisted to error-log.md so that post-session inspection can reconstruct
    // whether per-unit timing was degraded for this session.
    const errorLogPath = executionPlan.error_log_path ?? path.join(sessionRoot, "error-log.md");
    const readOutcome = await readCoordinatorStateFile(sessionRoot);
    const stateFile = readOutcome.state;
    if (readOutcome.kind === "missing") {
        await warnAndLogDegradation(errorLogPath, "state_file_missing", "per-unit timestamp degraded", "coordinator-state.yaml not found; falling back to batch timestamps for per-unit started_at.");
    }
    else if (readOutcome.kind === "unreadable") {
        await warnAndLogDegradation(errorLogPath, "state_file_unreadable", "per-unit timestamp degraded", "coordinator-state.yaml present but unreadable (YAML parse failed); falling back to batch timestamps for per-unit started_at.");
    }
    const lensDispatchAt = findTransitionAt(stateFile, "awaiting_lens_dispatch");
    if (stateFile && !lensDispatchAt) {
        await warnAndLogDegradation(errorLogPath, "transition_missing_lens", "per-unit timestamp degraded (lens)", "coordinator-state.yaml has no 'awaiting_lens_dispatch' transition; falling back to batch timestamp for lens started_at.");
    }
    const lensStartedAt = lensDispatchAt ?? executionStartedAt;
    const lensResults = await Promise.all(executionPlan.lens_prompt_packet_seats.map(async (seat) => {
        const isParticipating = participating.includes(seat.lens_id);
        const mtimeIso = isParticipating
            ? await readFileMtimeIsoOrNull(seat.output_path)
            : null;
        if (isParticipating && mtimeIso === null) {
            await warnAndLogDegradation(errorLogPath, "mtime_read_failed", `per-unit timestamp degraded (lens:${seat.lens_id})`, `fs.stat failed for ${seat.output_path}; falling back to batch completedAt.`);
        }
        const unitCompletedAt = mtimeIso ?? completedAt;
        // Provenance: both started_at and completed_at must come from per-unit
        // sources (state transition + mtime) for the unit to count as
        // `coordinator_derived`. If either falls back to batch, or the unit is
        // non-participating, we mark it `batch_fallback` so consumers don't
        // treat batch values as per-unit measurements.
        const hasPerUnitStart = Boolean(lensDispatchAt);
        const hasPerUnitEnd = isParticipating && mtimeIso !== null;
        const provenance = hasPerUnitStart && hasPerUnitEnd
            ? "coordinator_derived"
            : "batch_fallback";
        return {
            unit_id: seat.lens_id,
            unit_kind: "lens",
            packet_path: seat.packet_path,
            output_path: seat.output_path,
            status: isParticipating ? "completed" : "failed",
            started_at: lensStartedAt,
            completed_at: unitCompletedAt,
            duration_ms: computeDurationMs(lensStartedAt, unitCompletedAt, `lens:${seat.lens_id}`),
            timestamp_provenance: provenance,
            failure_message: degraded.includes(seat.lens_id) ? "output file missing or empty" : null,
        };
    }));
    // Per-PR #25 review NF-2: log any lens that ended up in `excluded` (neither
    // participating nor degraded) so a post-session reader can reconstruct why
    // the planned set did not fully resolve.
    if (excluded.length > 0) {
        await warnAndLogDegradation(errorLogPath, "lens_excluded", "lens excluded from participating/degraded partition", `excluded_lens_ids: ${excluded.join(", ")} (planned but neither participating nor degraded)`);
    }
    const runtimePacketPath = path.join(executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets"), "synthesize.runtime.prompt.md");
    const synthesizeDispatchAt = findTransitionAt(stateFile, "awaiting_synthesize_dispatch");
    if (synthesisExecuted && stateFile && !synthesizeDispatchAt) {
        await warnAndLogDegradation(errorLogPath, "transition_missing_synthesize", "per-unit timestamp degraded (synthesize)", "coordinator-state.yaml has no 'awaiting_synthesize_dispatch' transition; falling back to batch timestamp for synthesize started_at.");
    }
    const synthesizeStartedAt = synthesizeDispatchAt ?? executionStartedAt;
    const synthesizeMtimeIso = synthesisExecuted
        ? await readFileMtimeIsoOrNull(synthesisPath)
        : null;
    if (synthesisExecuted && synthesizeMtimeIso === null) {
        await warnAndLogDegradation(errorLogPath, "mtime_read_failed", "per-unit timestamp degraded (synthesize)", `fs.stat failed for ${synthesisPath}; falling back to batch completedAt.`);
    }
    const synthesizeCompletedAt = synthesizeMtimeIso ?? completedAt;
    const synthesizeProvenance = synthesizeDispatchAt && synthesizeMtimeIso
        ? "coordinator_derived"
        : "batch_fallback";
    const synthesizeResult = synthesisExecuted
        ? {
            unit_id: "synthesize",
            unit_kind: "synthesize",
            packet_path: runtimePacketPath,
            output_path: synthesisPath,
            status: (await fileExists(synthesisPath)) ? "completed" : "failed",
            started_at: synthesizeStartedAt,
            completed_at: synthesizeCompletedAt,
            duration_ms: computeDurationMs(synthesizeStartedAt, synthesizeCompletedAt, "synthesize"),
            timestamp_provenance: synthesizeProvenance,
            failure_message: null,
        }
        : null;
    const artifact = {
        session_id: executionPlan.session_id,
        session_root: sessionRoot,
        execution_realization: executionPlan.execution_realization,
        host_runtime: executionPlan.host_runtime,
        review_mode: executionPlan.review_mode,
        execution_status: deriveExecutionStatus(synthesisExecuted, degraded.length),
        execution_started_at: executionStartedAt,
        execution_completed_at: completedAt,
        total_duration_ms: computeDurationMs(executionStartedAt, completedAt),
        planned_lens_ids: planned,
        participating_lens_ids: participating,
        degraded_lens_ids: degraded,
        excluded_lens_ids: excluded,
        executed_lens_count: participating.length,
        synthesis_executed: synthesisExecuted,
        deliberation_status: deliberationStatus,
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
export async function runWriteExecutionResult(argv) {
    const result = await writeExecutionResult(argv);
    console.log(JSON.stringify(result, null, 2));
    return 0;
}
// ─────────────────────────────────────────────
// CLI dispatch
// ─────────────────────────────────────────────
/** SSOT for subcommand names: one map, used both by dispatch and the help text. */
const SUBCOMMANDS = {
    "init-log": runInitCoordinatorLog,
    "build-synthesize-packet": runBuildSynthesizeRuntimePacket,
    "write-execution-result": runWriteExecutionResult,
};
async function main() {
    const subcommand = process.argv[2];
    const subArgv = process.argv.slice(3);
    const handler = subcommand && (subcommand in SUBCOMMANDS)
        ? SUBCOMMANDS[subcommand]
        : null;
    if (!handler) {
        console.error(`Unknown coordinator-helper subcommand: ${subcommand}`);
        console.error(`Available: ${Object.keys(SUBCOMMANDS).join(", ")}`);
        return 1;
    }
    return handler(subArgv);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().then((exitCode) => process.exit(exitCode), (error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
