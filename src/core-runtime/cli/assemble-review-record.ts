#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
  InvocationBindingArtifact,
  ReviewExecutionResultArtifact,
  ReviewRecord,
  ReviewRecordStatus,
} from "../review/artifact-types.js";
import {
  fileExists,
  isoFromTimestamp,
  parseMarkdownFrontmatter,
  readYamlDocument,
  toRelativePath,
  writeYamlDocument,
} from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

async function detectDeliberationStatus(
  executionResult: ReviewExecutionResultArtifact | null,
  synthesisPath: string,
  deliberationPath: string,
): Promise<ReviewRecord["deliberation_status"]> {
  if (
    executionResult?.deliberation_status === "not_needed" ||
    executionResult?.deliberation_status === "performed" ||
    executionResult?.deliberation_status === "required_but_unperformed"
  ) {
    return executionResult.deliberation_status;
  }

  if (await fileExists(deliberationPath)) {
    return "performed";
  }

  if (!(await fileExists(synthesisPath))) {
    return "required_but_unperformed";
  }

  const synthesisText = await fs.readFile(synthesisPath, "utf8");
  const parsed = parseMarkdownFrontmatter<{ deliberation_status?: string }>(
    synthesisText,
  );
  const frontmatterStatus = parsed.metadata?.deliberation_status;
  if (frontmatterStatus === "not_needed" || frontmatterStatus === "performed") {
    return frontmatterStatus;
  }
  // Anything else (malformed/missing frontmatter, or the failure-only marker
  // `required_but_unperformed` written by a non-conforming synthesize) is
  // treated as a failure surface rather than being silently downgraded to
  // `not_needed`.
  return "required_but_unperformed";
}

interface ErrorLogSummary {
  degradedLensIds: string[];
  hasExecutionFailure: boolean;
  hasRunnerHalt: boolean;
}

async function summarizeErrorLog(errorLogPath: string): Promise<ErrorLogSummary> {
  if (!(await fileExists(errorLogPath))) {
    return {
      degradedLensIds: [],
      hasExecutionFailure: false,
      hasRunnerHalt: false,
    };
  }

  const errorLogText = await fs.readFile(errorLogPath, "utf8");
  const lensFailureMatches = Array.from(
    errorLogText.matchAll(/\|\s+lens failure:\s+(?:onto_)?([a-z_]+)/g),
  );
  const uniqueLensIds: string[] = [];
  for (const match of lensFailureMatches) {
    const lensId = match[1];
    if (typeof lensId !== "string") {
      continue;
    }
    if (!uniqueLensIds.includes(lensId)) {
      uniqueLensIds.push(lensId);
    }
  }

  return {
    degradedLensIds: uniqueLensIds,
    hasExecutionFailure:
      /\|\s+(?:lens|synthesize) failure:\s+/m.test(errorLogText),
    hasRunnerHalt: /\|\s+runner halted before synthesize/m.test(errorLogText),
  };
}

async function deriveRecordStatus(
  executionResult: ReviewExecutionResultArtifact | null,
  errorLogSummary: ErrorLogSummary,
  finalOutputPath: string,
): Promise<ReviewRecordStatus> {
  if (executionResult) {
    return executionResult.execution_status;
  }

  const finalOutputExists = await fileExists(finalOutputPath);
  if (!errorLogSummary.hasExecutionFailure && !errorLogSummary.hasRunnerHalt) {
    return finalOutputExists ? "completed" : "halted_partial";
  }
  if (finalOutputExists) {
    return "completed_with_degradation";
  }
  return "halted_partial";
}

export async function runAssembleReviewRecordCli(
  argv: string[],
): Promise<number> {
  const { values } = parseArgs({
    options: {
      "session-root": { type: "string" },
      "project-root": { type: "string", default: "." },
      "request-text": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));
  const projectRoot = path.resolve(requireString(values["project-root"], "project-root"));
  const requestText = requireString(values["request-text"], "request-text");
  const sessionId = path.basename(sessionRoot);

  const interpretationPath = path.join(sessionRoot, "interpretation.yaml");
  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const sessionMetadataPath = path.join(sessionRoot, "session-metadata.yaml");
  const executionPreparationRoot = path.join(sessionRoot, "execution-preparation");
  const targetSnapshotPath = path.join(executionPreparationRoot, "target-snapshot.md");
  const materializedInputPath = path.join(executionPreparationRoot, "materialized-input.md");
  const contextCandidateAssemblyPath = path.join(
    executionPreparationRoot,
    "context-candidate-assembly.yaml",
  );
  const synthesisPath = path.join(sessionRoot, "synthesis.md");
  const deliberationPath = path.join(sessionRoot, "deliberation.md");
  const finalOutputPath = path.join(sessionRoot, "final-output.md");
  const executionResultPath = path.join(sessionRoot, "execution-result.yaml");
  const errorLogPath = path.join(sessionRoot, "error-log.md");
  const reviewRecordPath = path.join(sessionRoot, "review-record.yaml");
  const round1Root = path.join(sessionRoot, "round1");

  if (!(await fileExists(interpretationPath))) {
    throw new Error(`Missing interpretation artifact: ${interpretationPath}`);
  }
  if (!(await fileExists(bindingPath))) {
    throw new Error(`Missing binding artifact: ${bindingPath}`);
  }

  const invocationBindingArtifact =
    await readYamlDocument<InvocationBindingArtifact>(bindingPath);
  const executionResult = (await fileExists(executionResultPath))
    ? await readYamlDocument<ReviewExecutionResultArtifact>(executionResultPath)
    : null;
  const sessionMetadata = await readYamlDocument<{ created_at?: string }>(
    sessionMetadataPath,
  );

  const lensResultRefs: Record<string, string> = {};
  const participatingLensIds: string[] = executionResult?.participating_lens_ids
    ? [...executionResult.participating_lens_ids]
    : [];
  if (executionResult) {
    for (const unitResult of executionResult.lens_execution_results) {
      if (unitResult.status !== "completed") {
        continue;
      }
      lensResultRefs[unitResult.unit_id] = toRelativePath(
        unitResult.output_path,
        projectRoot,
      );
    }
  } else if (await fileExists(round1Root)) {
    const round1FilePaths = await fs.readdir(round1Root);
    for (const entryName of round1FilePaths.sort()) {
      if (!entryName.endsWith(".md")) {
        continue;
      }
      const lensId = entryName.replace(/\.md$/u, "");
      const lensResultPath = path.join(round1Root, entryName);
      lensResultRefs[lensId] = toRelativePath(lensResultPath, projectRoot);
      participatingLensIds.push(lensId);
    }
  }

  const errorLogSummary = await summarizeErrorLog(errorLogPath);
  const degradedLensIds =
    executionResult?.degraded_lens_ids ?? errorLogSummary.degradedLensIds;
  const excludedLensIds =
    executionResult?.excluded_lens_ids ??
    invocationBindingArtifact.resolved_lens_set.filter(
      (lensId) =>
        !participatingLensIds.includes(lensId) && !degradedLensIds.includes(lensId),
    );
  const updatedAtSource = executionResult
    ? Date.parse(executionResult.execution_completed_at)
    : (await fs.stat(sessionRoot)).mtimeMs;

  const reviewRecord: ReviewRecord = {
    review_record_id: sessionId,
    session_id: sessionId,
    entrypoint: "review",
    record_status: await deriveRecordStatus(
      executionResult,
      errorLogSummary,
      finalOutputPath,
    ),
    created_at:
      sessionMetadata.created_at ?? isoFromTimestamp((await fs.stat(sessionRoot)).mtimeMs),
    updated_at: isoFromTimestamp(updatedAtSource),
    request_text: requestText,
    review_target_scope_ref: toRelativePath(bindingPath, projectRoot),
    interpretation_ref: toRelativePath(interpretationPath, projectRoot),
    binding_ref: toRelativePath(bindingPath, projectRoot),
    domain_final_selection_ref: toRelativePath(bindingPath, projectRoot),
    resolved_review_mode: invocationBindingArtifact.resolved_review_mode,
    resolved_execution_realization:
      invocationBindingArtifact.resolved_execution_realization,
    resolved_host_runtime: invocationBindingArtifact.resolved_host_runtime,
    resolved_lens_ids: invocationBindingArtifact.resolved_lens_set,
    execution_result_ref: executionResult
      ? toRelativePath(executionResultPath, projectRoot)
      : null,
    session_metadata_ref: (await fileExists(sessionMetadataPath))
      ? toRelativePath(sessionMetadataPath, projectRoot)
      : null,
    target_snapshot_ref: (await fileExists(targetSnapshotPath))
      ? toRelativePath(targetSnapshotPath, projectRoot)
      : null,
    materialized_input_ref: (await fileExists(materializedInputPath))
      ? toRelativePath(materializedInputPath, projectRoot)
      : null,
    context_candidate_assembly_ref: (await fileExists(contextCandidateAssemblyPath))
      ? toRelativePath(contextCandidateAssemblyPath, projectRoot)
      : null,
    lens_result_refs: lensResultRefs,
    participating_lens_ids: participatingLensIds,
    excluded_lens_ids: excludedLensIds,
    degraded_lens_ids: degradedLensIds,
    degradation_notes_ref:
      ((executionResult?.execution_status !== "completed") ||
        errorLogSummary.hasExecutionFailure ||
        errorLogSummary.hasRunnerHalt) &&
      (await fileExists(errorLogPath))
      ? toRelativePath(errorLogPath, projectRoot)
      : null,
    synthesis_result_ref: (await fileExists(synthesisPath))
      ? toRelativePath(synthesisPath, projectRoot)
      : null,
    deliberation_status: await detectDeliberationStatus(
      executionResult,
      synthesisPath,
      deliberationPath,
    ),
    deliberation_result_ref: (await fileExists(deliberationPath))
      ? toRelativePath(deliberationPath, projectRoot)
      : null,
    final_output_ref: (await fileExists(finalOutputPath))
      ? toRelativePath(finalOutputPath, projectRoot)
      : null,
  };

  await writeYamlDocument(reviewRecordPath, reviewRecord);
  console.log(reviewRecordPath);
  return 0;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runAssembleReviewRecordCli(process.argv.slice(2));
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
