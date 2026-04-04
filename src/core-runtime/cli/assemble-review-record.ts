#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
  InvocationBindingArtifact,
  ReviewRecord,
  ReviewRecordStatus,
} from "../review/artifact-types.js";
import {
  collectFilePathsRecursively,
  fileExists,
  isoFromTimestamp,
  readYamlDocument,
  toRelativePath,
  writeYamlDocument,
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

async function detectDeliberationStatus(
  synthesisPath: string,
  deliberationPath: string,
): Promise<ReviewRecord["deliberation_status"]> {
  if (await fileExists(deliberationPath)) {
    return "performed";
  }

  if (!(await fileExists(synthesisPath))) {
    return "required_but_unperformed";
  }

  const synthesisText = (await fs.readFile(synthesisPath, "utf8")).toLowerCase();
  if (synthesisText.includes("not needed") || synthesisText.includes("불필요")) {
    return "not_needed";
  }
  if (synthesisText.includes("needed") || synthesisText.includes("필요")) {
    return "required_but_unperformed";
  }
  return "not_needed";
}

async function collectDegradedLensIds(errorLogPath: string): Promise<string[]> {
  if (!(await fileExists(errorLogPath))) {
    return [];
  }

  const errorLogText = await fs.readFile(errorLogPath, "utf8");
  const matches = errorLogText.match(/\bonto_[a-z_]+\b/g) ?? [];
  const uniqueLensIds: string[] = [];
  for (const lensId of matches) {
    if (!uniqueLensIds.includes(lensId)) {
      uniqueLensIds.push(lensId);
    }
  }
  return uniqueLensIds;
}

async function deriveRecordStatus(
  errorLogPath: string,
  finalOutputPath: string,
): Promise<ReviewRecordStatus> {
  if (!(await fileExists(errorLogPath))) {
    return "completed";
  }
  if (await fileExists(finalOutputPath)) {
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
  const sessionMetadata = await readYamlDocument<{ created_at?: string }>(
    sessionMetadataPath,
  );

  const lensResultRefs: Record<string, string> = {};
  const participatingLensIds: string[] = [];
  if (await fileExists(round1Root)) {
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

  const degradedLensIds = await collectDegradedLensIds(errorLogPath);
  const excludedLensIds = invocationBindingArtifact.resolved_lens_set.filter(
    (lensId) =>
      !participatingLensIds.includes(lensId) && !degradedLensIds.includes(lensId),
  );

  const sessionFilePaths = await collectFilePathsRecursively(sessionRoot);
  const updatedAtSource =
    sessionFilePaths.length > 0
      ? Math.max(
          ...(
            await Promise.all(
              sessionFilePaths.map(async (filePath) => (await fs.stat(filePath)).mtimeMs),
            )
          ),
        )
      : (await fs.stat(sessionRoot)).mtimeMs;

  const reviewRecord: ReviewRecord = {
    review_record_id: sessionId,
    session_id: sessionId,
    entrypoint: "review",
    record_status: await deriveRecordStatus(errorLogPath, finalOutputPath),
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
    degradation_notes_ref: (await fileExists(errorLogPath))
      ? toRelativePath(errorLogPath, projectRoot)
      : null,
    synthesis_result_ref: (await fileExists(synthesisPath))
      ? toRelativePath(synthesisPath, projectRoot)
      : null,
    deliberation_status: await detectDeliberationStatus(
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
