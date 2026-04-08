#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { runSubagentReviewUnitExecutorCli } from "./subagent-review-unit-executor.js";

export async function runCodexReviewUnitExecutorCli(
  argv: string[],
): Promise<number> {
  return runSubagentReviewUnitExecutorCli(argv);
}

async function main(): Promise<number> {
  return runCodexReviewUnitExecutorCli(process.argv.slice(2));
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
