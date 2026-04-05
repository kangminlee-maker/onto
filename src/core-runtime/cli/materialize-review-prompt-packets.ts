#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type {
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
  truncateForEmbedding,
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

async function readOptionalText(targetPath: string): Promise<string> {
  if (!(await fileExists(targetPath))) {
    return "";
  }
  return fs.readFile(targetPath, "utf8");
}

function renderBoundaryPolicySection(
  binding: InvocationBindingArtifact,
  projectRoot: string,
): string {
  return `## Boundary Policy
- web research: ${binding.boundary_policy.web_research_policy}
- repo exploration: ${binding.boundary_policy.repo_exploration_policy}
- recursive reference expansion: ${binding.boundary_policy.recursive_reference_expansion_policy}
- filesystem allowed roots:
${binding.boundary_policy.filesystem_scope.allowed_roots
  .map((rootPath) => `  - ${toRelativePath(rootPath, projectRoot)}`)
  .join("\n")}
- source mutation: ${binding.boundary_policy.write_policy.source_mutation_policy}
- allowed output refs:
${binding.boundary_policy.write_policy.allowed_output_refs
  .map((outputPath) => `  - ${toRelativePath(outputPath, projectRoot)}`)
  .join("\n")}
- extra exploration citation required: ${
    binding.boundary_policy.provenance_policy.extra_exploration_citation_required
  }
- web source citation required: ${
    binding.boundary_policy.provenance_policy.web_source_citation_required
  }`;
}

function renderBoundaryEnforcementSection(
  binding: InvocationBindingArtifact,
): string {
  return `## Boundary Enforcement Profile
- prompt: ${binding.boundary_enforcement_profile.prompt_boundary_enforcement}
- filesystem: ${binding.boundary_enforcement_profile.filesystem_boundary_enforcement}
- network: ${binding.boundary_enforcement_profile.network_boundary_enforcement}
- write: ${binding.boundary_enforcement_profile.write_boundary_enforcement}`;
}

function renderEffectiveBoundaryStateSection(
  binding: InvocationBindingArtifact,
  projectRoot: string,
): string {
  const state = binding.effective_boundary_state;
  return `## Effective Boundary State
- web research: requested=${state.web_research.requested_policy}, effective=${state.web_research.effective_policy}, guarantee=${state.web_research.guarantee_level}
- repo exploration: requested=${state.repo_exploration.requested_policy}, effective=${state.repo_exploration.effective_policy}, guarantee=${state.repo_exploration.guarantee_level}
- recursive reference expansion: requested=${state.recursive_reference_expansion.requested_policy}, effective=${state.recursive_reference_expansion.effective_policy}, guarantee=${state.recursive_reference_expansion.guarantee_level}
- source mutation: requested=${state.source_mutation.requested_policy}, effective=${state.source_mutation.effective_policy}, guarantee=${state.source_mutation.guarantee_level}
- filesystem effective allowed roots:
${state.filesystem_scope.effective_allowed_roots
  .map((rootPath) => `  - ${toRelativePath(rootPath, projectRoot)}`)
  .join("\n")}
- filesystem guarantee: ${state.filesystem_scope.guarantee_level}`;
}

const DEFAULT_MAX_EMBED_LINES = 300;

export async function runMaterializeReviewPromptPacketsCli(
  argv: string[],
): Promise<number> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
      "max-embed-lines": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  let maxEmbedLines =
    typeof values["max-embed-lines"] === "string" && values["max-embed-lines"].length > 0
      ? Number.parseInt(values["max-embed-lines"], 10)
      : DEFAULT_MAX_EMBED_LINES;
  if (!Number.isFinite(maxEmbedLines) || maxEmbedLines < 1) {
    console.warn(
      `[onto] Invalid max-embed-lines value (${values["max-embed-lines"]}), using default ${DEFAULT_MAX_EMBED_LINES}.`,
    );
    maxEmbedLines = DEFAULT_MAX_EMBED_LINES;
  }

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
  const promptPacketsRoot =
    executionPlan.prompt_packets_root ?? path.join(sessionRoot, "prompt-packets");
  const materializedInputText = await readOptionalText(binding.materialized_input_path);
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
    if (roleDefinitionText.trim().length === 0) {
      console.warn(
        `[onto] Warning: role definition not found for ${seat.lens_id} at ${roleDefinitionPath}`,
      );
    }
    const lensPacketText = `# Review Lens Prompt Packet

session_id: ${executionPlan.session_id}
lens_id: ${seat.lens_id}
execution_realization: ${executionPlan.execution_realization}
host_runtime: ${executionPlan.host_runtime}
review_mode: ${executionPlan.review_mode}
session_domain: ${binding.resolved_session_domain}
output_path: ${toRelativePath(seat.output_path, projectRoot)}
request_summary: ${interpretation.intent_summary}

## Canonical Role
You are ${seat.lens_id}.
Execute as a ContextIsolatedReasoningUnit.
Do not read other lens outputs during Round 1.

## Role Definition Source
${toRelativePath(roleDefinitionPath, projectRoot)}

${roleDefinitionText.trim().length > 0 ? `${roleDefinitionText.trim()}\n` : ""}

## Authoritative Artifact Inputs
- materialized input: ${toRelativePath(binding.materialized_input_path, projectRoot)}
- role definition: ${toRelativePath(roleDefinitionPath, projectRoot)}
- interpretation: ${toRelativePath(interpretationPath, projectRoot)}
- binding: ${toRelativePath(bindingPath, projectRoot)}

## Embedded Materialized Input

${materializedInputText.trim().length > 0 ? truncateForEmbedding(materializedInputText.trim(), maxEmbedLines, toRelativePath(binding.materialized_input_path, projectRoot)) : "(unavailable)"}

## Optional Context Inputs
- session metadata: ${toRelativePath(sessionMetadataPath, projectRoot)}
- target snapshot: ${toRelativePath(binding.target_snapshot_path, projectRoot)}
- context candidate assembly: ${toRelativePath(contextCandidateAssemblyPath, projectRoot)}

${renderBoundaryPolicySection(binding, projectRoot)}

${renderBoundaryEnforcementSection(binding)}

${renderEffectiveBoundaryStateSection(binding, projectRoot)}

## Session Summary
- requested target: ${toRelativePath(sessionMetadata.requested_target, projectRoot)}
- target scope kind: ${binding.resolved_target_scope.kind}
- resolved target refs:
${binding.resolved_target_scope.resolved_refs
  .map((resolvedRef) => `  - ${toRelativePath(resolvedRef, projectRoot)}`)
  .join("\n")}
- review mode: ${binding.resolved_review_mode}
- lens set: ${binding.resolved_lens_set.join(", ")}

## Execution Directives
- Read the role definition and the materialized input first.
- Prefer the smallest sufficient set of files.
- Only read optional context inputs if the primary inputs are not enough.
- Do not recursively chase additional document links or reference chains found inside the target text.
- Use the materialized input as the authoritative target input.
- Use only your lens-specific perspective.
- Perform structural inspection first when applicable.
- If you find an issue, state what, why, and how to fix it.
- If you find no issue, state why it is correct.
- Write your result to: ${toRelativePath(seat.output_path, projectRoot)}
`;

    await fs.writeFile(seat.packet_path, lensPacketText.trimEnd() + "\n", "utf8");
  }

  const synthesizePacketText = `# Review Synthesize Prompt Packet

session_id: ${executionPlan.session_id}
execution_realization: ${executionPlan.execution_realization}
host_runtime: ${executionPlan.host_runtime}
review_mode: ${executionPlan.review_mode}
session_domain: ${binding.resolved_session_domain}
output_path: ${toRelativePath(executionPlan.synthesis_output_path, projectRoot)}
request_summary: ${interpretation.intent_summary}

## Canonical Role
You are onto_synthesize.
You are not an independent review lens.
You must preserve lens evidence and must not invent new independent perspectives.

## Required Artifact Inputs
- materialized input: ${toRelativePath(binding.materialized_input_path, projectRoot)}
- interpretation: ${toRelativePath(interpretationPath, projectRoot)}
- binding: ${toRelativePath(bindingPath, projectRoot)}

## Optional Context Inputs
- session metadata: ${toRelativePath(sessionMetadataPath, projectRoot)}
- target snapshot: ${toRelativePath(binding.target_snapshot_path, projectRoot)}
- context candidate assembly: ${toRelativePath(contextCandidateAssemblyPath, projectRoot)}

${renderBoundaryPolicySection(binding, projectRoot)}

${renderBoundaryEnforcementSection(binding)}

${renderEffectiveBoundaryStateSection(binding, projectRoot)}

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
- Read the materialized input first, then all participating lens outputs.
- Prefer the smallest sufficient set of files.
- Only read optional context inputs if the materialized input and lens outputs are not enough.
- Do not recursively chase additional document links or reference chains found inside the target text or lens outputs.
- Preserve consensus, disagreement, overlooked premises, and axiology-proposed additional perspectives.
- Do not invent New Perspectives yourself.
- If deliberation is unavailable, preserve unresolved disagreement explicitly.
- Start the output with YAML frontmatter using this exact field:
  - \`deliberation_status: not_needed | performed | required_but_unperformed\`
- Write your result to: ${toRelativePath(executionPlan.synthesis_output_path, projectRoot)}

## Required Output Sections
Use exactly these heading names in your output. The downstream renderer extracts sections by exact heading match. Do not add numbering prefixes, suffixes, or rename these headings.

\`\`\`
## Consensus
## Conditional Consensus
## Disagreement
## Axiology-Proposed Additional Perspectives
## Purpose Alignment Verification
## Immediate Actions Required
## Recommendations
## Unique Finding Tagging
\`\`\`
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
  await printOntoReleaseChannelNotice();
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
