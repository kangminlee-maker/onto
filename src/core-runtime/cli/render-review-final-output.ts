#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import type { InvocationBindingArtifact, ReviewSessionMetadata } from "../review/artifact-types.js";
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

function extractSection(markdownText: string, heading: string): string | null {
  const lines = markdownText.split("\n");
  const acceptedHeadingLines = [`## ${heading}`, `### ${heading}`];
  const startIndex = lines.findIndex((line) =>
    acceptedHeadingLines.includes(line.trim()),
  );
  if (startIndex === -1) {
    return null;
  }

  const collected: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      break;
    }
    if (line.startsWith("## ")) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function sectionOrDefault(markdownText: string, headings: string[], fallback = "- none"): string {
  for (const heading of headings) {
    const extracted = extractSection(markdownText, heading);
    if (extracted && extracted.length > 0) {
      return extracted;
    }
  }
  return fallback;
}

function renderTargetSummary(
  bindingArtifact: InvocationBindingArtifact,
  projectRoot: string,
): string {
  return bindingArtifact.resolved_target_scope.resolved_refs
    .map((resolvedRef) => `- \`${toRelativePath(resolvedRef, projectRoot)}\``)
    .join("\n");
}

function renderConsensusHeading(
  participatingLensCount: number,
  reviewMode: string,
): string {
  if (reviewMode === "full") {
    return `### Consensus (${participatingLensCount}/${participatingLensCount})`;
  }
  return `### Consensus (${participatingLensCount}/${participatingLensCount}, light mode)`;
}

export async function runRenderReviewFinalOutputCli(
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

  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const sessionMetadataPath = path.join(sessionRoot, "session-metadata.yaml");
  const synthesisPath = path.join(sessionRoot, "synthesis.md");
  const deliberationPath = path.join(sessionRoot, "deliberation.md");
  const finalOutputPath = path.join(sessionRoot, "final-output.md");

  if (!(await fileExists(bindingPath))) {
    throw new Error(`Missing binding artifact: ${bindingPath}`);
  }
  if (!(await fileExists(sessionMetadataPath))) {
    throw new Error(`Missing session metadata artifact: ${sessionMetadataPath}`);
  }
  if (!(await fileExists(synthesisPath))) {
    throw new Error(`Missing synthesis artifact: ${synthesisPath}`);
  }

  const bindingArtifact = await readYamlDocument<InvocationBindingArtifact>(bindingPath);
  const sessionMetadata = await readYamlDocument<ReviewSessionMetadata>(sessionMetadataPath);
  const sourcePath = (await fileExists(deliberationPath)) ? deliberationPath : synthesisPath;
  const sourceText = await fs.readFile(sourcePath, "utf8");
  const sessionDate = (sessionMetadata.created_at ?? "").slice(0, 10);

  const consensus = sectionOrDefault(sourceText, [
    "Consensus",
    "Consensus Items",
    "Preserved Cross-Lens Consensus",
  ]);
  const conditionalConsensus = sectionOrDefault(sourceText, [
    "Conditional Consensus",
    "Unresolved Or Conditional Points",
  ]);
  const disagreement = sectionOrDefault(sourceText, [
    "Disagreement",
    "Contradicting Opinions",
  ]);
  const axiologyPerspectives = sectionOrDefault(
    sourceText,
    [
      "Axiology-Proposed Additional Perspectives",
      "Preserved New Perspective",
    ],
  );
  const purposeAlignment = sectionOrDefault(
    sourceText,
    ["Purpose Alignment Verification", "Synthesis Verdict"],
  );
  const immediateActions = sectionOrDefault(sourceText, [
    "Immediate Actions Required",
    "Immediate Actions",
  ]);
  const recommendations = sectionOrDefault(sourceText, [
    "Recommendations",
    "Synthesis Conclusion",
  ]);
  const uniqueFindingTagging = sectionOrDefault(sourceText, [
    "Unique Finding Tagging",
    "Preserved Specific Issues",
  ]);

  const finalOutputText = `---
session_id: ${bindingArtifact.session_id}
process: review
target: "${bindingArtifact.resolved_target_scope.resolved_refs
  .map((resolvedRef) => toRelativePath(resolvedRef, projectRoot))
  .join(" + ")}"
domain: ${bindingArtifact.resolved_session_domain}
date: ${sessionDate || "unknown"}
---

## 9-Lens Review Result

### Review Target
${renderTargetSummary(bindingArtifact, projectRoot)}

### Verification Context
- Domain: ${bindingArtifact.resolved_session_domain}
- Review mode: ${bindingArtifact.resolved_review_mode}
- Execution realization: ${bindingArtifact.resolved_execution_realization}
- Host runtime: ${bindingArtifact.resolved_host_runtime}
- Source artifact: \`${toRelativePath(sourcePath, projectRoot)}\`

${renderConsensusHeading(
    bindingArtifact.resolved_lens_set.length,
    bindingArtifact.resolved_review_mode,
  )}
${consensus}

### Conditional Consensus
${conditionalConsensus}

### Disagreement
${disagreement}

### Axiology-Proposed Additional Perspectives
${axiologyPerspectives}

### Purpose Alignment Verification
${purposeAlignment}

### Immediate Actions Required
${immediateActions}

### Recommendations
${recommendations}

### Unique Finding Tagging
${uniqueFindingTagging}
`;

  await fs.writeFile(finalOutputPath, finalOutputText.trimEnd() + "\n", "utf8");
  console.log(finalOutputPath);
  return 0;
}

async function main(): Promise<number> {
  return runRenderReviewFinalOutputCli(process.argv.slice(2));
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
