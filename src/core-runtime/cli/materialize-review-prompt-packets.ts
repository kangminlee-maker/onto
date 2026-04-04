#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
  ContextCandidateAssembly,
  InvocationBindingArtifact,
  InvocationInterpretationArtifact,
  ReviewExecutionPlan,
  ReviewLensPromptPacketSeat,
  ReviewSessionMetadata,
} from "../review/artifact-types.js";
import {
  fileExists,
  readYamlDocument,
  toRelativePath,
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

function renderRefList(title: string, refs: string[], projectRoot: string): string {
  if (refs.length === 0) {
    return `## ${title}\n- none\n`;
  }
  return `## ${title}\n${refs
    .map((refPath) => `- ${toRelativePath(refPath, projectRoot)}`)
    .join("\n")}\n`;
}

async function readOptionalText(targetPath: string): Promise<string> {
  if (!(await fileExists(targetPath))) {
    return "";
  }
  return fs.readFile(targetPath, "utf8");
}

function renderEmbeddedArtifactSection(title: string, content: string): string {
  const normalizedContent = content.trim();
  if (normalizedContent.length === 0) {
    return `## ${title}\n(unavailable)\n`;
  }
  return `## ${title}\n\n${normalizedContent}\n`;
}

export async function runMaterializeReviewPromptPacketsCli(
  argv: string[],
): Promise<number> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const projectRoot = path.resolve(requireString(values["project-root"], "project-root"));
  const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));

  const interpretationPath = path.join(sessionRoot, "interpretation.yaml");
  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const sessionMetadataPath = path.join(sessionRoot, "session-metadata.yaml");
  const executionPlanPath = path.join(sessionRoot, "execution-plan.yaml");
  const contextCandidateAssemblyPath = path.join(
    sessionRoot,
    "execution-preparation",
    "context-candidate-assembly.yaml",
  );

  const interpretation = await readYamlDocument<InvocationInterpretationArtifact>(
    interpretationPath,
  );
  const binding = await readYamlDocument<InvocationBindingArtifact>(bindingPath);
  const sessionMetadata = await readYamlDocument<ReviewSessionMetadata>(
    sessionMetadataPath,
  );
  const executionPlan = await readYamlDocument<ReviewExecutionPlan>(executionPlanPath);
  const contextAssembly = await readYamlDocument<ContextCandidateAssembly>(
    contextCandidateAssemblyPath,
  );
  const interpretationText = await readOptionalText(interpretationPath);
  const bindingText = await readOptionalText(bindingPath);
  const sessionMetadataText = await readOptionalText(sessionMetadataPath);
  const targetSnapshotText = await readOptionalText(binding.target_snapshot_path);
  const materializedInputText = await readOptionalText(binding.materialized_input_path);
  const contextCandidateAssemblyText = await readOptionalText(
    contextCandidateAssemblyPath,
  );
  const promptPacketsRoot =
    executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets");
  const lensPromptPacketSeats: ReviewLensPromptPacketSeat[] =
    executionPlan.lens_prompt_packet_seats ??
    binding.resolved_lens_set.map((lensId) => ({
      lens_id: lensId,
      packet_path: path.join(promptPacketsRoot, `${lensId}.prompt.md`),
      output_path: path.join(binding.round1_root, `${lensId}.md`),
    }));
  const synthesizePromptPacketPath =
    executionPlan.synthesize_prompt_packet_path ??
    path.join(promptPacketsRoot, "onto_synthesize.prompt.md");

  await fs.mkdir(promptPacketsRoot, { recursive: true });

  for (const seat of lensPromptPacketSeats) {
    const roleDefinitionPath = path.resolve(projectRoot, "roles", `${seat.lens_id}.md`);
    const roleDefinitionText = await readOptionalText(roleDefinitionPath);
    const lensPacketText = `# Review Lens Prompt Packet

session_id: ${executionPlan.session_id}
lens_id: ${seat.lens_id}
execution_realization: ${executionPlan.execution_realization}
host_runtime: ${executionPlan.host_runtime}
review_mode: ${executionPlan.review_mode}
session_domain: ${binding.resolved_session_domain}
output_path: ${seat.output_path}

## Canonical Role
You are ${seat.lens_id}.
Execute as a ContextIsolatedReasoningUnit.
Do not read other lens outputs during Round 1.

## Role Definition Source
${roleDefinitionPath}

${roleDefinitionText.trim().length > 0 ? `${roleDefinitionText.trim()}\n` : ""}

## Required Artifact Inputs
- interpretation: ${toRelativePath(interpretationPath, projectRoot)}
- binding: ${toRelativePath(bindingPath, projectRoot)}
- session metadata: ${toRelativePath(sessionMetadataPath, projectRoot)}
- target snapshot: ${toRelativePath(binding.target_snapshot_path, projectRoot)}
- materialized input: ${toRelativePath(binding.materialized_input_path, projectRoot)}
- context candidate assembly: ${toRelativePath(contextCandidateAssemblyPath, projectRoot)}

${renderEmbeddedArtifactSection("Embedded Interpretation Artifact", interpretationText)}
${renderEmbeddedArtifactSection("Embedded Binding Artifact", bindingText)}
${renderEmbeddedArtifactSection("Embedded Session Metadata", sessionMetadataText)}
${renderEmbeddedArtifactSection("Embedded Target Snapshot", targetSnapshotText)}
${renderEmbeddedArtifactSection("Embedded Materialized Input", materializedInputText)}
${renderEmbeddedArtifactSection(
  "Embedded Context Candidate Assembly",
  contextCandidateAssemblyText,
)}

## Execution Directives
- Read the materialized input as the authoritative target input.
- Use only your lens-specific perspective.
- Perform structural inspection first when applicable.
- If you find an issue, state what, why, and how to fix it.
- If you find no issue, state why it is correct.
- Write your result to: ${seat.output_path}

${renderRefList("System Purpose Refs", contextAssembly.system_purpose_refs, projectRoot)}
${renderRefList("Domain Context Refs", contextAssembly.domain_context_refs, projectRoot)}
${renderRefList("Learning Context Refs", contextAssembly.learning_context_refs, projectRoot)}
${renderRefList("Role Definition Refs", contextAssembly.role_definition_refs, projectRoot)}
${renderRefList("Execution Rule Refs", contextAssembly.execution_rule_refs, projectRoot)}
`;

    await fs.writeFile(seat.packet_path, lensPacketText.trimEnd() + "\n", "utf8");
  }

  const synthesizePacketText = `# Review Synthesize Prompt Packet

session_id: ${executionPlan.session_id}
execution_realization: ${executionPlan.execution_realization}
host_runtime: ${executionPlan.host_runtime}
review_mode: ${executionPlan.review_mode}
session_domain: ${binding.resolved_session_domain}
output_path: ${executionPlan.synthesis_output_path}

## Canonical Role
You are onto_synthesize.
You are not an independent review lens.
You must preserve lens evidence and must not invent new independent perspectives.

## Required Artifact Inputs
- interpretation: ${toRelativePath(interpretationPath, projectRoot)}
- binding: ${toRelativePath(bindingPath, projectRoot)}
- session metadata: ${toRelativePath(sessionMetadataPath, projectRoot)}
- target snapshot: ${toRelativePath(binding.target_snapshot_path, projectRoot)}
- materialized input: ${toRelativePath(binding.materialized_input_path, projectRoot)}
- context candidate assembly: ${toRelativePath(contextCandidateAssemblyPath, projectRoot)}

${renderEmbeddedArtifactSection("Embedded Interpretation Artifact", interpretationText)}
${renderEmbeddedArtifactSection("Embedded Binding Artifact", bindingText)}
${renderEmbeddedArtifactSection("Embedded Session Metadata", sessionMetadataText)}
${renderEmbeddedArtifactSection("Embedded Target Snapshot", targetSnapshotText)}
${renderEmbeddedArtifactSection("Embedded Materialized Input", materializedInputText)}
${renderEmbeddedArtifactSection(
  "Embedded Context Candidate Assembly",
  contextCandidateAssemblyText,
)}

## Participating Lens Outputs
${(executionPlan.lens_execution_seats ?? binding.resolved_lens_set.map((lensId) => ({
    lens_id: lensId,
    output_path: path.join(binding.round1_root, `${lensId}.md`),
  })))
  .map(
    (seat) =>
      `- ${seat.lens_id}: ${toRelativePath(seat.output_path, projectRoot)}`,
  )
  .join("\n")}

## Execution Directives
- Read all participating lens outputs.
- Preserve consensus, disagreement, overlooked premises, and axiology-proposed additional perspectives.
- Do not invent New Perspectives yourself.
- If deliberation is unavailable, preserve unresolved disagreement explicitly.
- Write your result to: ${executionPlan.synthesis_output_path}

${renderRefList("System Purpose Refs", contextAssembly.system_purpose_refs, projectRoot)}
${renderRefList("Domain Context Refs", contextAssembly.domain_context_refs, projectRoot)}
${renderRefList("Learning Context Refs", contextAssembly.learning_context_refs, projectRoot)}
${renderRefList("Execution Rule Refs", contextAssembly.execution_rule_refs, projectRoot)}
`;

  await fs.writeFile(
    synthesizePromptPacketPath,
    synthesizePacketText.trimEnd() + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
        {
        prompt_packets_root: promptPacketsRoot,
        lens_prompt_packet_count: lensPromptPacketSeats.length,
        synthesize_prompt_packet_path: synthesizePromptPacketPath,
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  return runMaterializeReviewPromptPacketsCli(process.argv.slice(2));
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
