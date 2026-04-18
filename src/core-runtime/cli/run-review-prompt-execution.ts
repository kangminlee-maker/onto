#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type { OntoConfig } from "../discovery/config-chain.js";
import type {
  DeliberationStatus,
  EffectiveBoundaryState,
  ReviewExecutionRealization,
  ReviewExecutionResultArtifact,
  ReviewExecutionPlan,
  ReviewExecutionStatus,
  ReviewUnitExecutionResult,
} from "../review/artifact-types.js";
import {
  appendMarkdownLogEntry,
  fileExists,
  isoFromTimestamp,
  parseMarkdownFrontmatter,
  removeFileIfExists,
  readYamlDocument,
  writeYamlDocument,
} from "../review/review-artifact-utils.js";
import type { ExecutionTopology } from "../review/execution-topology-resolver.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import { executeReviewViaCodexNested } from "./codex-nested-dispatch.js";

export interface ReviewUnitExecutorConfig {
  bin: string;
  args: string[];
}

interface ExecutionDispatchResult {
  unit_id: string;
  unit_kind: "lens" | "synthesize";
  packet_path: string;
  output_path: string;
}

export interface ReviewPromptExecutionResult {
  session_root: string;
  executed_lens_count: number;
  synthesis_output_path: string;
  participating_lens_ids: string[];
  degraded_lens_ids: string[];
  synthesis_executed: boolean;
  error_log_path: string | null;
  halt_reason?: string;
}

interface ExecutionFailure {
  unit_id: string;
  unit_kind: "lens" | "synthesize";
  packet_path: string;
  output_path: string;
  message: string;
}

interface ExecutionOutcome {
  dispatch: ExecutionDispatchResult;
  success: boolean;
  startedAtMs: number;
  completedAtMs: number;
  failure?: ExecutionFailure;
}

function isSuccessfulOutcome(
  outcome: ExecutionOutcome | undefined,
): outcome is ExecutionOutcome & { success: true } {
  return outcome !== undefined && outcome.success;
}

function isFailureOutcome(
  outcome: ExecutionOutcome | undefined,
): outcome is ExecutionOutcome & { success: false; failure: ExecutionFailure } {
  return (
    outcome !== undefined &&
    !outcome.success &&
    outcome.failure !== undefined
  );
}

async function appendExecutionProgress(
  errorLogPath: string,
  title: string,
  bodyLines: string[],
): Promise<void> {
  await appendMarkdownLogEntry(errorLogPath, title, bodyLines.join("\n"));
}

function renderEffectiveBoundaryStateLog(
  effectiveBoundaryState: EffectiveBoundaryState,
): string {
  return [
    `web_research: requested=${effectiveBoundaryState.web_research.requested_policy}, effective=${effectiveBoundaryState.web_research.effective_policy}, guarantee=${effectiveBoundaryState.web_research.guarantee_level}`,
    `repo_exploration: requested=${effectiveBoundaryState.repo_exploration.requested_policy}, effective=${effectiveBoundaryState.repo_exploration.effective_policy}, guarantee=${effectiveBoundaryState.repo_exploration.guarantee_level}`,
    `recursive_reference_expansion: requested=${effectiveBoundaryState.recursive_reference_expansion.requested_policy}, effective=${effectiveBoundaryState.recursive_reference_expansion.effective_policy}, guarantee=${effectiveBoundaryState.recursive_reference_expansion.guarantee_level}`,
    `source_mutation: requested=${effectiveBoundaryState.source_mutation.requested_policy}, effective=${effectiveBoundaryState.source_mutation.effective_policy}, guarantee=${effectiveBoundaryState.source_mutation.guarantee_level}`,
    `filesystem_scope_effective: ${effectiveBoundaryState.filesystem_scope.effective_allowed_roots.join(", ")}`,
    `filesystem_scope_guarantee: ${effectiveBoundaryState.filesystem_scope.guarantee_level}`,
    ...effectiveBoundaryState.web_research.notes.map((note) => `note.web_research: ${note}`),
    ...effectiveBoundaryState.repo_exploration.notes.map((note) => `note.repo_exploration: ${note}`),
    ...effectiveBoundaryState.recursive_reference_expansion.notes.map(
      (note) => `note.recursive_reference_expansion: ${note}`,
    ),
    ...effectiveBoundaryState.source_mutation.notes.map((note) => `note.source_mutation: ${note}`),
    ...effectiveBoundaryState.filesystem_scope.notes.map(
      (note) => `note.filesystem_scope: ${note}`,
    ),
  ].join("\n");
}

function renderLensOutputRefsSection(
  projectRoot: string,
  lensDispatches: ExecutionDispatchResult[],
): string {
  const sections = lensDispatches.map((dispatch) => {
    const relativeOutputPath = path.relative(projectRoot, dispatch.output_path);
    return `- ${dispatch.unit_id}: ${relativeOutputPath}`;
  });
  return `## Runtime Participating Lens Outputs\n${sections.join("\n")}\n`;
}

function renderDegradedLensFailuresSection(
  failures: ExecutionFailure[],
): string {
  if (failures.length === 0) {
    return "";
  }
  return `## Degraded Lens Failures\n${failures
    .map(
      (failure) =>
        `- ${failure.unit_id}: ${failure.message.replaceAll("\n", " ").trim()}`,
    )
    .join("\n")}\n`;
}

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function requirePositiveInteger(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid positive integer for --${optionName}: ${value}`);
  }
  return parsed;
}

function defaultMaxConcurrentLensesForExecutorConfig(
  executorConfig: ReviewUnitExecutorConfig,
): number {
  if (executorConfig.bin === "npm" || executorConfig.bin.endsWith("npm.cmd")) {
    if (executorConfig.args.includes("review:codex-unit-executor")) {
      // 9 lenses can run concurrently with stagger + retry to mitigate
      // thundering herd and transient API rate-limit failures.
      return 9;
    }
  }
  return 1;
}

/** Default stagger delay between successive lens dispatches (ms).
 *  Spreads initial burst to avoid thundering-herd on the external API. */
function defaultStaggerDelayMsForExecutorConfig(
  executorConfig: ReviewUnitExecutorConfig,
): number {
  if (executorConfig.bin === "npm" || executorConfig.bin.endsWith("npm.cmd")) {
    if (executorConfig.args.includes("review:codex-unit-executor")) {
      // codex executor spawns an external process → API request per lens
      return 1500;
    }
  }
  return 0;
}

/** Default retry count for individual lens execution failures.
 *  Set high (10) to absorb transient network timeouts and CLI crashes
 *  without losing a lens to degraded status. Each retry uses exponential
 *  backoff (8s, 16s, 24s, ...) so the worst-case total wait before
 *  final failure is ~7 minutes — acceptable for a lens that normally
 *  takes 3-5 minutes. */
const DEFAULT_LENS_MAX_RETRIES = 10;

/** Delay before first retry (ms). Doubles on each subsequent retry. */
const DEFAULT_LENS_RETRY_INITIAL_DELAY_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureNonEmptyOutputFile(outputPath: string): Promise<void> {
  if (!(await fileExists(outputPath))) {
    throw new Error(`Executor did not create output file: ${outputPath}`);
  }

  const fileText = await fs.readFile(outputPath, "utf8");
  if (fileText.trim().length === 0) {
    throw new Error(`Executor created empty output file: ${outputPath}`);
  }
}

async function invokeExecutor(
  executorConfig: ReviewUnitExecutorConfig,
  projectRoot: string,
  sessionRoot: string,
  dispatch: ExecutionDispatchResult,
): Promise<void> {
  await fs.mkdir(path.dirname(dispatch.output_path), { recursive: true });

  const child = spawn(
    executorConfig.bin,
    [
      ...executorConfig.args,
      "--project-root",
      projectRoot,
      "--session-root",
      sessionRoot,
      "--unit-id",
      dispatch.unit_id,
      "--unit-kind",
      dispatch.unit_kind,
      "--packet-path",
      dispatch.packet_path,
      "--output-path",
      dispatch.output_path,
    ],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(process.env.ONTO_HOME ? { ONTO_HOME: process.env.ONTO_HOME } : {}),
      },
    },
  );

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer | string) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    const stderrMessage = stderr.trim();
    const stdoutMessage = stdout.trim();
    const combinedMessage = [stderrMessage, stdoutMessage]
      .filter((message) => message.length > 0)
      .join("\n");
    throw new Error(
      combinedMessage.length > 0
        ? combinedMessage
        : `Executor exited with code ${exitCode} for ${dispatch.unit_id}`,
    );
  }

  await ensureNonEmptyOutputFile(dispatch.output_path);
}

function toUnitExecutionResult(
  outcome: ExecutionOutcome,
): ReviewUnitExecutionResult {
  return {
    unit_id: outcome.dispatch.unit_id,
    unit_kind: outcome.dispatch.unit_kind,
    packet_path: outcome.dispatch.packet_path,
    output_path: outcome.dispatch.output_path,
    status: outcome.success ? "completed" : "failed",
    started_at: isoFromTimestamp(outcome.startedAtMs),
    completed_at: isoFromTimestamp(outcome.completedAtMs),
    duration_ms: Math.max(0, outcome.completedAtMs - outcome.startedAtMs),
    // TS runner measures process wall-clock via Date.now() around
    // invokeExecutor; both ends are exact to millisecond precision.
    timestamp_provenance: "runner_wallclock",
    failure_message: outcome.failure?.message ?? null,
  };
}

function deriveExecutionStatus(params: {
  synthesisExecuted: boolean;
  degradedLensIds: string[];
}): ReviewExecutionStatus {
  if (!params.synthesisExecuted) {
    return "halted_partial";
  }
  if (params.degradedLensIds.length > 0) {
    return "completed_with_degradation";
  }
  return "completed";
}

async function readStructuredDeliberationStatus(
  synthesizeOutputPath: string,
  deliberationOutputPath: string,
  executionRealization: ReviewExecutionRealization,
): Promise<DeliberationStatus | null> {
  // Mirrors the precedence rule in `assemble-review-record.ts`
  // (`detectDeliberationStatus`) per `processes/review/synthesize-prompt-contract.md`
  // §6.4 and `processes/review/record-contract.md` §4.5:
  //   1. synthesis.md frontmatter — primary for both realizations.
  //   2. realization-aware fallback when frontmatter is unavailable:
  //        - cross-process (agent-teams): deliberation.md presence ⇒ performed
  //        - in-process (subagent): no fallback signal ⇒ null (defer to assembler)
  if (await fileExists(synthesizeOutputPath)) {
    const synthesizeText = await fs.readFile(synthesizeOutputPath, "utf8");
    const parsed = parseMarkdownFrontmatter<{ deliberation_status?: string }>(
      synthesizeText,
    );
    const frontmatterStatus = parsed.metadata?.deliberation_status;
    if (
      frontmatterStatus === "not_needed" ||
      frontmatterStatus === "performed" ||
      frontmatterStatus === "required_but_unperformed"
    ) {
      return frontmatterStatus;
    }
  }
  if (
    executionRealization === "agent-teams" &&
    (await fileExists(deliberationOutputPath))
  ) {
    return "performed";
  }
  return null;
}

async function writeExecutionResultArtifact(
  executionPlan: ReviewExecutionPlan,
  artifact: ReviewExecutionResultArtifact,
): Promise<void> {
  await writeYamlDocument(executionPlan.execution_result_path, artifact);
}

async function resetExecutionOutputs(
  executionPlan: ReviewExecutionPlan,
): Promise<void> {
  const pathsToClear = [
    executionPlan.execution_result_path,
    executionPlan.error_log_path,
    executionPlan.synthesis_output_path,
    executionPlan.deliberation_output_path,
    executionPlan.final_output_path,
    path.join(
      executionPlan.prompt_packets_root,
      "synthesize.runtime.prompt.md",
    ),
    ...executionPlan.lens_execution_seats.map((seat) => seat.output_path),
  ];

  await Promise.all(pathsToClear.map((targetPath) => removeFileIfExists(targetPath)));
}

async function appendExecutionFailure(
  errorLogPath: string,
  failure: ExecutionFailure,
  effectiveBoundaryState?: EffectiveBoundaryState,
): Promise<void> {
  await appendMarkdownLogEntry(
    errorLogPath,
    `${failure.unit_kind} failure: ${failure.unit_id}`,
    [
      `unit_id: ${failure.unit_id}`,
      `unit_kind: ${failure.unit_kind}`,
      `packet_path: ${failure.packet_path}`,
      `output_path: ${failure.output_path}`,
      `message: ${failure.message}`,
      ...(effectiveBoundaryState
        ? [
            "",
            "[effective_boundary_state]",
            renderEffectiveBoundaryStateLog(effectiveBoundaryState),
          ]
        : []),
    ].join("\n"),
  );
}

export async function executeReviewPromptExecution(
  params: {
    projectRoot: string;
    sessionRoot: string;
    defaultExecutorConfig: ReviewUnitExecutorConfig;
    synthesizeExecutorConfig?: ReviewUnitExecutorConfig;
    maxConcurrentLenses?: number;
    /**
     * PR-L (2026-04-18): resolved topology from `runReviewInvokeCli`.
     * When `topology.id === "codex-nested-subprocess"`, the lens dispatch
     * phase is handled by `executeReviewViaCodexNested` (PR-H bridge)
     * instead of the per-lens worker pool — one outer codex teamlead
     * + nested inner codex per lens. Synthesize step continues through
     * the regular per-unit dispatch (uses `synthesizeExecutorConfig`).
     *
     * When undefined or any other topology id: existing per-lens worker
     * pool behavior (backward compatible).
     */
    topology?: ExecutionTopology;
    /**
     * PR-L: OntoConfig for codex-nested dispatch (model / reasoning_effort
     * forwarded to outer codex teamlead). Ignored for non-nested paths.
     */
    ontoConfig?: OntoConfig;
  },
): Promise<ReviewPromptExecutionResult> {
  const projectRoot = path.resolve(params.projectRoot);
  const sessionRoot = path.resolve(params.sessionRoot);
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const executionPlan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);
  const executionStartedAtMs = Date.now();
  await resetExecutionOutputs(executionPlan);
  await appendMarkdownLogEntry(
    executionPlan.error_log_path,
    "runner boundary state",
    renderEffectiveBoundaryStateLog(executionPlan.effective_boundary_state),
  );

  const defaultExecutorConfig = params.defaultExecutorConfig;
  const synthesizeExecutorConfig =
    params.synthesizeExecutorConfig ?? defaultExecutorConfig;
  const maxConcurrentLenses = Math.max(
    1,
    Math.min(
      params.maxConcurrentLenses ?? 1,
      executionPlan.lens_prompt_packet_seats.length || 1,
    ),
  );

  const lensDispatches: ExecutionDispatchResult[] =
    executionPlan.lens_prompt_packet_seats.map((seat) => ({
      unit_id: seat.lens_id,
      unit_kind: "lens" as const,
      packet_path: seat.packet_path,
      output_path: seat.output_path,
    }));

  console.log(
    `[review runner] parallel lens dispatch enabled: max_concurrent=${maxConcurrentLenses}`,
  );
  await appendExecutionProgress(
    executionPlan.error_log_path,
    "runner parallel dispatch policy",
    [`max_concurrent_lenses: ${maxConcurrentLenses}`],
  );

  const staggerDelayMs = defaultStaggerDelayMsForExecutorConfig(defaultExecutorConfig);
  const maxRetries = DEFAULT_LENS_MAX_RETRIES;
  const retryInitialDelayMs = DEFAULT_LENS_RETRY_INITIAL_DELAY_MS;

  if (staggerDelayMs > 0) {
    console.log(
      `[review runner] stagger delay: ${staggerDelayMs}ms between successive lens dispatches`,
    );
  }

  const executionOutcomes: Array<ExecutionOutcome | undefined> = new Array(
    lensDispatches.length,
  );
  let nextLensIndex = 0;

  async function runLensWorker(workerIndex: number): Promise<void> {
    // Stagger initial dispatch to avoid thundering-herd on external APIs.
    // Only the very first dispatch of each worker is staggered; subsequent
    // picks (after a lens completes) are not staggered since the burst has
    // already been spread out by then.
    if (staggerDelayMs > 0 && workerIndex > 0) {
      await sleep(workerIndex * staggerDelayMs);
    }

    while (true) {
      const currentIndex = nextLensIndex;
      nextLensIndex += 1;
      if (currentIndex >= lensDispatches.length) {
        return;
      }

      const dispatch = lensDispatches[currentIndex];
      if (!dispatch) {
        return;
      }
      console.log(`[review runner] starting ${dispatch.unit_kind}: ${dispatch.unit_id}`);
      await appendExecutionProgress(
        executionPlan.error_log_path,
        `runner dispatch started: ${dispatch.unit_id}`,
        [
          `unit_id: ${dispatch.unit_id}`,
          `unit_kind: ${dispatch.unit_kind}`,
          `packet_path: ${dispatch.packet_path}`,
          `output_path: ${dispatch.output_path}`,
        ],
      );

      const startedAtMs = Date.now();
      let lastError: unknown = undefined;
      let succeeded = false;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await invokeExecutor(defaultExecutorConfig, projectRoot, sessionRoot, dispatch);
          succeeded = true;
          break;
        } catch (error: unknown) {
          lastError = error;
          if (attempt < maxRetries) {
            const retryDelay = retryInitialDelayMs * (attempt + 1);
            console.log(
              `[review runner] ${dispatch.unit_id} attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`,
            );
            await appendExecutionProgress(
              executionPlan.error_log_path,
              `runner dispatch retry: ${dispatch.unit_id}`,
              [
                `attempt: ${attempt + 1}/${maxRetries}`,
                `retry_delay_ms: ${retryDelay}`,
                `error: ${error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)}`,
              ],
            );
            await sleep(retryDelay);
          }
        }
      }

      if (succeeded) {
        const completedAtMs = Date.now();
        console.log(`[review runner] completed ${dispatch.unit_kind}: ${dispatch.unit_id}`);
        await appendExecutionProgress(
          executionPlan.error_log_path,
          `runner dispatch completed: ${dispatch.unit_id}`,
          [
            `unit_id: ${dispatch.unit_id}`,
            `unit_kind: ${dispatch.unit_kind}`,
            `output_path: ${dispatch.output_path}`,
          ],
        );
        executionOutcomes[currentIndex] = {
          dispatch,
          success: true,
          startedAtMs,
          completedAtMs,
        };
      } else {
        const completedAtMs = Date.now();
        const failure: ExecutionFailure = {
          unit_id: dispatch.unit_id,
          unit_kind: dispatch.unit_kind,
          packet_path: dispatch.packet_path,
          output_path: dispatch.output_path,
          message: lastError instanceof Error ? lastError.message : String(lastError),
        };
        await removeFileIfExists(dispatch.output_path);
        await appendExecutionFailure(
          executionPlan.error_log_path,
          failure,
          executionPlan.effective_boundary_state,
        );
        executionOutcomes[currentIndex] = {
          dispatch,
          success: false,
          startedAtMs,
          completedAtMs,
          failure,
        };
      }
    }
  }

  // PR-L (2026-04-18): codex-nested-subprocess topology bypasses the per-lens
  // worker pool. One outer codex teamlead is spawned (PR-H bridge) which in
  // turn spawns nested codex per lens inside its own shell. Outcomes from the
  // bridge are mapped into the same `executionOutcomes[]` shape so the post-
  // dispatch code (halt check, synthesize, result artifact) stays identical.
  if (params.topology?.id === "codex-nested-subprocess") {
    console.log(
      `[review runner] topology=codex-nested-subprocess → outer codex teamlead dispatch (bypasses per-lens worker pool)`,
    );
    await appendExecutionProgress(
      executionPlan.error_log_path,
      "runner topology dispatch: codex-nested-subprocess",
      [
        `teamlead_location: ${params.topology.teamlead_location}`,
        `lens_spawn_mechanism: ${params.topology.lens_spawn_mechanism}`,
        `transport_rank: ${params.topology.transport_rank}`,
        `planned_lens_count: ${lensDispatches.length}`,
      ],
    );
    const nestedStartedAtMs = Date.now();
    const nestedResult = await executeReviewViaCodexNested({
      sessionRoot,
      projectRoot,
      ontoConfig: params.ontoConfig ?? {},
    });
    const nestedCompletedAtMs = Date.now();
    // Map PR-H outcomes into executionOutcomes[] in lensDispatches order.
    // `participating_lens_ids` is the authoritative success set (orchestrator
    // ok AND output file exists + non-empty). Missing / failed → record as
    // ExecutionFailure; also remove empty output files for consistency with
    // worker-pool cleanup path.
    for (let i = 0; i < lensDispatches.length; i += 1) {
      const dispatch = lensDispatches[i]!;
      const reported = nestedResult.nested_raw.outcomes[i];
      const participating = nestedResult.participating_lens_ids.includes(
        dispatch.unit_id,
      );
      if (participating) {
        console.log(`[review runner] completed ${dispatch.unit_kind}: ${dispatch.unit_id}`);
        await appendExecutionProgress(
          executionPlan.error_log_path,
          `runner nested dispatch completed: ${dispatch.unit_id}`,
          [
            `unit_id: ${dispatch.unit_id}`,
            `unit_kind: ${dispatch.unit_kind}`,
            `output_path: ${dispatch.output_path}`,
          ],
        );
        executionOutcomes[i] = {
          dispatch,
          success: true,
          startedAtMs: nestedStartedAtMs,
          completedAtMs: nestedCompletedAtMs,
        };
      } else {
        const message =
          reported?.status === "fail" && reported.error
            ? reported.error
            : nestedResult.halt_reason ??
              "codex-nested dispatch failed (output missing or orchestrator rejected)";
        const failure: ExecutionFailure = {
          unit_id: dispatch.unit_id,
          unit_kind: dispatch.unit_kind,
          packet_path: dispatch.packet_path,
          output_path: dispatch.output_path,
          message,
        };
        await removeFileIfExists(dispatch.output_path);
        await appendExecutionFailure(
          executionPlan.error_log_path,
          failure,
          executionPlan.effective_boundary_state,
        );
        executionOutcomes[i] = {
          dispatch,
          success: false,
          startedAtMs: nestedStartedAtMs,
          completedAtMs: nestedCompletedAtMs,
          failure,
        };
      }
    }
    // Capture outer teamlead halt_reason for the post-dispatch halt check
    // (synthesize may still run if enough lenses participated, matching the
    // worker-pool semantics).
    if (nestedResult.halt_reason) {
      await appendExecutionProgress(
        executionPlan.error_log_path,
        "runner nested teamlead halt",
        [nestedResult.halt_reason],
      );
    }
  } else {
    await Promise.all(
      Array.from(
        { length: Math.min(maxConcurrentLenses, lensDispatches.length) },
        async (_, workerIndex) => runLensWorker(workerIndex),
      ),
    );
  }

  const successfulLensDispatches = executionOutcomes
    .filter(isSuccessfulOutcome)
    .map((outcome) => outcome.dispatch);
  const executionFailures = executionOutcomes
    .filter(isFailureOutcome)
    .map((outcome) => outcome.failure);

  if (successfulLensDispatches.length < 2) {
    const haltReason =
      successfulLensDispatches.length === 0
        ? "No participating lens outputs were produced."
        : "Fewer than two participating lens outputs remain after degraded execution.";
    await appendMarkdownLogEntry(
      executionPlan.error_log_path,
      "runner halted before synthesize",
      `${haltReason}\n\n[effective_boundary_state]\n${renderEffectiveBoundaryStateLog(
        executionPlan.effective_boundary_state,
      )}`,
    );
    const degradedLensIds = executionFailures
      .filter((failure) => failure.unit_kind === "lens")
      .map((failure) => failure.unit_id);
    const executionCompletedAtMs = Date.now();
    await writeExecutionResultArtifact(executionPlan, {
      session_id: executionPlan.session_id,
      session_root: sessionRoot,
      execution_realization: executionPlan.execution_realization,
      host_runtime: executionPlan.host_runtime,
      review_mode: executionPlan.review_mode,
      execution_status: deriveExecutionStatus({
        synthesisExecuted: false,
        degradedLensIds,
      }),
      execution_started_at: isoFromTimestamp(executionStartedAtMs),
      execution_completed_at: isoFromTimestamp(executionCompletedAtMs),
      total_duration_ms: Math.max(0, executionCompletedAtMs - executionStartedAtMs),
      planned_lens_ids: lensDispatches.map((dispatch) => dispatch.unit_id),
      participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
      degraded_lens_ids: degradedLensIds,
      excluded_lens_ids: lensDispatches
        .map((dispatch) => dispatch.unit_id)
        .filter(
          (lensId) =>
            !successfulLensDispatches.some((dispatch) => dispatch.unit_id === lensId) &&
            !degradedLensIds.includes(lensId),
        ),
      executed_lens_count: successfulLensDispatches.length,
      synthesis_executed: false,
      deliberation_status: null,
      halt_reason: haltReason,
      error_log_path: executionPlan.error_log_path,
      lens_execution_results: executionOutcomes
        .filter((outcome): outcome is ExecutionOutcome => outcome !== undefined)
        .map(toUnitExecutionResult),
      synthesize_execution_result: null,
    });
    return {
      session_root: sessionRoot,
      executed_lens_count: successfulLensDispatches.length,
      synthesis_output_path: executionPlan.synthesis_output_path,
      participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
      degraded_lens_ids: executionFailures
        .filter((failure) => failure.unit_kind === "lens")
        .map((failure) => failure.unit_id),
      synthesis_executed: false,
      error_log_path: executionPlan.error_log_path,
      halt_reason: haltReason,
    };
  }

  const synthesizePacketRuntimePath = path.join(
    executionPlan.prompt_packets_root,
    "synthesize.runtime.prompt.md",
  );
  const synthesizePacketText = await fs.readFile(
    executionPlan.synthesize_prompt_packet_path,
    "utf8",
  );
  const enrichedSynthesizePacketText = `${synthesizePacketText.trimEnd()}\n\n${renderLensOutputRefsSection(
    projectRoot,
    successfulLensDispatches,
  )}\n${renderDegradedLensFailuresSection(
    executionFailures.filter((failure) => failure.unit_kind === "lens"),
  )}`;
  await fs.writeFile(
    synthesizePacketRuntimePath,
    enrichedSynthesizePacketText.trimEnd() + "\n",
    "utf8",
  );

  const synthesizeDispatch: ExecutionDispatchResult = {
    unit_id: "synthesize",
    unit_kind: "synthesize",
    packet_path: synthesizePacketRuntimePath,
    output_path: executionPlan.synthesis_output_path,
  };

  console.log("[review runner] starting synthesize: synthesize");
  await appendExecutionProgress(
    executionPlan.error_log_path,
    "runner dispatch started: synthesize",
    [
      `unit_id: ${synthesizeDispatch.unit_id}`,
      `unit_kind: ${synthesizeDispatch.unit_kind}`,
      `packet_path: ${synthesizeDispatch.packet_path}`,
      `output_path: ${synthesizeDispatch.output_path}`,
    ],
  );
  const synthesizeStartedAtMs = Date.now();
  const synthesizeMaxRetries = 1; // process.md: "Retry once before halting"
  let synthesizeOutcome: ExecutionOutcome | null = null;
  let synthesizeLastError: unknown = undefined;
  let synthesizeSucceeded = false;

  for (let attempt = 0; attempt <= synthesizeMaxRetries; attempt++) {
    try {
      await invokeExecutor(
        synthesizeExecutorConfig,
        projectRoot,
        sessionRoot,
        synthesizeDispatch,
      );
      synthesizeSucceeded = true;
      break;
    } catch (error: unknown) {
      synthesizeLastError = error;
      if (attempt < synthesizeMaxRetries) {
        const retryDelay = DEFAULT_LENS_RETRY_INITIAL_DELAY_MS;
        console.log(
          `[review runner] synthesize attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`,
        );
        await appendExecutionProgress(
          executionPlan.error_log_path,
          "runner synthesize retry",
          [
            `attempt: ${attempt + 1}/${synthesizeMaxRetries}`,
            `retry_delay_ms: ${retryDelay}`,
            `error: ${error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)}`,
          ],
        );
        await sleep(retryDelay);
      }
    }
  }

  if (synthesizeSucceeded) {
    synthesizeOutcome = {
      dispatch: synthesizeDispatch,
      success: true,
      startedAtMs: synthesizeStartedAtMs,
      completedAtMs: Date.now(),
    };
  }

  if (!synthesizeSucceeded) {
    const error = synthesizeLastError;
    const failure: ExecutionFailure = {
      unit_id: synthesizeDispatch.unit_id,
      unit_kind: synthesizeDispatch.unit_kind,
      packet_path: synthesizeDispatch.packet_path,
      output_path: synthesizeDispatch.output_path,
      message: error instanceof Error ? error.message : String(error),
    };
    synthesizeOutcome = {
      dispatch: synthesizeDispatch,
      success: false,
      startedAtMs: synthesizeStartedAtMs,
      completedAtMs: Date.now(),
      failure,
    };
    executionFailures.push(failure);
    await removeFileIfExists(synthesizeDispatch.output_path);
    await appendExecutionFailure(
      executionPlan.error_log_path,
      failure,
      executionPlan.effective_boundary_state,
    );
    const degradedLensIds = executionFailures
      .filter((recordedFailure) => recordedFailure.unit_kind === "lens")
      .map((recordedFailure) => recordedFailure.unit_id);
    const executionCompletedAtMs = Date.now();
    await writeExecutionResultArtifact(executionPlan, {
      session_id: executionPlan.session_id,
      session_root: sessionRoot,
      execution_realization: executionPlan.execution_realization,
      host_runtime: executionPlan.host_runtime,
      review_mode: executionPlan.review_mode,
      execution_status: deriveExecutionStatus({
        synthesisExecuted: false,
        degradedLensIds,
      }),
      execution_started_at: isoFromTimestamp(executionStartedAtMs),
      execution_completed_at: isoFromTimestamp(executionCompletedAtMs),
      total_duration_ms: Math.max(0, executionCompletedAtMs - executionStartedAtMs),
      planned_lens_ids: lensDispatches.map((dispatch) => dispatch.unit_id),
      participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
      degraded_lens_ids: degradedLensIds,
      excluded_lens_ids: lensDispatches
        .map((dispatch) => dispatch.unit_id)
        .filter(
          (lensId) =>
            !successfulLensDispatches.some((dispatch) => dispatch.unit_id === lensId) &&
            !degradedLensIds.includes(lensId),
        ),
      executed_lens_count: successfulLensDispatches.length,
      synthesis_executed: false,
      deliberation_status: null,
      halt_reason: `Synthesize execution failed: ${failure.message}`,
      error_log_path: executionPlan.error_log_path,
      lens_execution_results: executionOutcomes
        .filter((outcome): outcome is ExecutionOutcome => outcome !== undefined)
        .map(toUnitExecutionResult),
      synthesize_execution_result: synthesizeOutcome
        ? toUnitExecutionResult(synthesizeOutcome)
        : null,
    });
    return {
      session_root: sessionRoot,
      executed_lens_count: successfulLensDispatches.length,
      synthesis_output_path: executionPlan.synthesis_output_path,
      participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
      degraded_lens_ids: executionFailures
        .filter((recordedFailure) => recordedFailure.unit_kind === "lens")
        .map((recordedFailure) => recordedFailure.unit_id),
      synthesis_executed: false,
      error_log_path: executionPlan.error_log_path,
      halt_reason: `Synthesize execution failed: ${failure.message}`,
    };
  }

  console.log("[review runner] completed synthesize: synthesize");
  await appendExecutionProgress(
    executionPlan.error_log_path,
    "runner dispatch completed: synthesize",
    [
      `unit_id: ${synthesizeDispatch.unit_id}`,
      `unit_kind: ${synthesizeDispatch.unit_kind}`,
      `output_path: ${synthesizeDispatch.output_path}`,
    ],
  );
  const degradedLensIds = executionFailures
    .filter((failure) => failure.unit_kind === "lens")
    .map((failure) => failure.unit_id);
  const executionCompletedAtMs = Date.now();
  const deliberationStatus = await readStructuredDeliberationStatus(
    executionPlan.synthesis_output_path,
    executionPlan.deliberation_output_path,
    executionPlan.execution_realization,
  );
  await writeExecutionResultArtifact(executionPlan, {
    session_id: executionPlan.session_id,
    session_root: sessionRoot,
    execution_realization: executionPlan.execution_realization,
    host_runtime: executionPlan.host_runtime,
    review_mode: executionPlan.review_mode,
    execution_status: deriveExecutionStatus({
      synthesisExecuted: true,
      degradedLensIds,
    }),
    execution_started_at: isoFromTimestamp(executionStartedAtMs),
    execution_completed_at: isoFromTimestamp(executionCompletedAtMs),
    total_duration_ms: Math.max(0, executionCompletedAtMs - executionStartedAtMs),
    planned_lens_ids: lensDispatches.map((dispatch) => dispatch.unit_id),
    participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
    degraded_lens_ids: degradedLensIds,
    excluded_lens_ids: lensDispatches
      .map((dispatch) => dispatch.unit_id)
      .filter(
        (lensId) =>
          !successfulLensDispatches.some((dispatch) => dispatch.unit_id === lensId) &&
          !degradedLensIds.includes(lensId),
      ),
    executed_lens_count: successfulLensDispatches.length,
    synthesis_executed: true,
    deliberation_status: deliberationStatus,
    halt_reason: null,
    error_log_path: executionPlan.error_log_path,
    lens_execution_results: executionOutcomes
      .filter((outcome): outcome is ExecutionOutcome => outcome !== undefined)
      .map(toUnitExecutionResult),
    synthesize_execution_result: synthesizeOutcome
      ? toUnitExecutionResult(synthesizeOutcome)
      : null,
  });

  return {
    session_root: sessionRoot,
    executed_lens_count: successfulLensDispatches.length,
    synthesis_output_path: executionPlan.synthesis_output_path,
    participating_lens_ids: successfulLensDispatches.map((dispatch) => dispatch.unit_id),
    degraded_lens_ids: degradedLensIds,
    synthesis_executed: true,
    error_log_path: executionPlan.error_log_path,
  };
}

export async function runReviewPromptExecution(
  argv: string[],
): Promise<ReviewPromptExecutionResult> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
      "executor-bin": { type: "string" },
      "executor-arg": { type: "string", multiple: true, default: [] },
      "synthesize-executor-bin": { type: "string" },
      "synthesize-executor-arg": { type: "string", multiple: true, default: [] },
      "max-concurrent-lenses": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const defaultExecutorConfig: ReviewUnitExecutorConfig = {
    bin: requireString(values["executor-bin"], "executor-bin"),
    args: values["executor-arg"],
  };
  const synthesizeExecutorConfig: ReviewUnitExecutorConfig =
    typeof values["synthesize-executor-bin"] === "string" &&
    values["synthesize-executor-bin"].length > 0
      ? {
          bin: values["synthesize-executor-bin"],
          args: values["synthesize-executor-arg"],
        }
      : defaultExecutorConfig;
  const maxConcurrentLenses =
    typeof values["max-concurrent-lenses"] === "string" &&
    values["max-concurrent-lenses"].length > 0
      ? requirePositiveInteger(values["max-concurrent-lenses"], "max-concurrent-lenses")
      : defaultMaxConcurrentLensesForExecutorConfig(defaultExecutorConfig);

  return executeReviewPromptExecution({
    projectRoot: requireString(values["project-root"], "project-root"),
    sessionRoot: requireString(values["session-root"], "session-root"),
    defaultExecutorConfig,
    synthesizeExecutorConfig,
    maxConcurrentLenses,
  });
}

export async function runReviewPromptExecutionCli(
  argv: string[],
): Promise<number> {
  const result = await runReviewPromptExecution(argv);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runReviewPromptExecutionCli(process.argv.slice(2));
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
