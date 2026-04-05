#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { runPrepareReviewSessionCli } from "./prepare-review-session.js";
import { runMaterializeReviewPromptPacketsCli } from "./materialize-review-prompt-packets.js";
import {
  readSingleOptionValueFromArgv,
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

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runStartReviewSessionCli(process.argv.slice(2));
}

export interface StartReviewSessionResult {
  session_root: string;
  bounded_start_steps: string[];
}

export async function startReviewSession(
  argv: string[],
): Promise<StartReviewSessionResult> {
  await runPrepareReviewSessionCli(argv);

  const projectRoot = path.resolve(
    readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
  );
  const sessionId = requireString(
    readSingleOptionValueFromArgv(argv, "session-id"),
    "session-id",
  );
  const sessionRoot = path.join(projectRoot, ".onto", "review", sessionId);

  const maxEmbedLines = readSingleOptionValueFromArgv(argv, "max-embed-lines");
  const promptPacketsArgs = [
    "--project-root",
    projectRoot,
    "--session-root",
    sessionRoot,
  ];
  if (typeof maxEmbedLines === "string" && maxEmbedLines.length > 0) {
    promptPacketsArgs.push("--max-embed-lines", maxEmbedLines);
  }

  await runMaterializeReviewPromptPacketsCli(promptPacketsArgs);

  return {
    session_root: sessionRoot,
    bounded_start_steps: [
      "review:prepare-session",
      "review:materialize-prompt-packets",
    ],
  };
}

export async function runStartReviewSessionCli(
  argv: string[],
): Promise<number> {
  const result = await startReviewSession(argv);
  console.log(
    JSON.stringify(result, null, 2),
  );
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
