#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { runAssembleReviewRecordCli } from "./assemble-review-record.js";
import { runRenderReviewFinalOutputCli } from "./render-review-final-output.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import { appendMarkdownLogEntry } from "../review/review-artifact-utils.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runCompleteReviewSessionCli(process.argv.slice(2));
}

export interface CompleteReviewSessionResult {
  session_root: string;
  bounded_complete_steps: string[];
  final_output_rendered: boolean;
}

export async function completeReviewSession(
  argv: string[],
): Promise<CompleteReviewSessionResult> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
      "request-text": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const projectRoot = requireString(values["project-root"], "project-root");
  const sessionRoot = requireString(values["session-root"], "session-root");
  const requestText = requireString(values["request-text"], "request-text");
  const errorLogPath = path.join(sessionRoot, "error-log.md");

  let finalOutputRendered = false;

  try {
    await runRenderReviewFinalOutputCli([
      "--project-root",
      projectRoot,
      "--session-root",
      sessionRoot,
    ]);
    finalOutputRendered = true;
  } catch (error: unknown) {
    await appendMarkdownLogEntry(
      errorLogPath,
      "final output render failed",
      error instanceof Error ? error.message : String(error),
    );
  }

  await runAssembleReviewRecordCli([
    "--project-root",
    projectRoot,
    "--session-root",
    sessionRoot,
    "--request-text",
    requestText,
  ]);

  return {
    session_root: sessionRoot,
    bounded_complete_steps: [
      "review:render-final-output",
      "review:finalize-session",
    ],
    final_output_rendered: finalOutputRendered,
  };
}

export async function runCompleteReviewSessionCli(
  argv: string[],
): Promise<number> {
  const result = await completeReviewSession(argv);
  console.log(JSON.stringify(result, null, 2));
  return 0;
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
