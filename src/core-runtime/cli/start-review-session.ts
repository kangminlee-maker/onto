#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runPrepareReviewSessionCli } from "./prepare-review-session.js";
import { runMaterializeReviewPromptPacketsCli } from "./materialize-review-prompt-packets.js";
import {
  readSingleOptionValueFromArgv,
  readYamlDocument,
  writeYamlDocument,
} from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import type { ReviewSessionMetadata } from "../review/artifact-types.js";
import {
  validateExtractMode,
  type ExtractMode,
} from "../learning/shared/mode.js";
import { resolveOntoHome } from "../discovery/onto-home.js";
import { resolveConfigChain } from "../discovery/config-chain.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

/**
 * Resolve the extract mode for a review session.
 *
 * Resolution priority:
 *   1. `ONTO_LEARNING_EXTRACT_MODE` env var (if set and non-empty)
 *   2. `.onto/config.yml` `learning_extract_mode` field (if env var not set)
 *   3. default `"disabled"` (via validateExtractMode)
 *
 * Invalid values at step 1 or step 2 fail-fast via validateExtractMode.
 * A config.yml read failure (file missing, parse error, etc.) is swallowed
 * and the resolver falls through — env var → default is the stable baseline
 * and a missing or malformed config file should not block session startup.
 *
 * Empty-env-var normalization: an env var set to the empty string is
 * treated identically to an unset env var. Without this, the empty string
 * would pass the nullish check in the final `??` and be forwarded to the
 * validator, which then throws "Invalid ONTO_LEARNING_EXTRACT_MODE: ''"
 * instead of allowing config.yml to supply the value. The normalization
 * matches the `length === 0` branch that already triggered config read.
 *
 * Exported for direct testing. `startReviewSession` is the only production
 * caller.
 */
export async function resolveReviewSessionExtractMode(
  argv: string[],
  projectRoot: string,
): Promise<ExtractMode> {
  const rawEnv = process.env.ONTO_LEARNING_EXTRACT_MODE;
  // Normalize undefined AND empty string to undefined so the `??` chain
  // below works correctly (nullish coalescing does not treat "" as nullish).
  const envExtractMode: string | undefined =
    rawEnv === undefined || rawEnv.length === 0 ? undefined : rawEnv;
  let configExtractMode: string | undefined;
  if (envExtractMode === undefined) {
    try {
      const ontoHomeFlag = readSingleOptionValueFromArgv(argv, "onto-home");
      const ontoHome = resolveOntoHome(
        typeof ontoHomeFlag === "string" ? ontoHomeFlag : undefined,
      );
      const config = await resolveConfigChain(ontoHome, projectRoot);
      configExtractMode = config.learning_extract_mode;
    } catch {
      // best-effort: config read failure falls through to default
    }
  }
  return validateExtractMode(envExtractMode ?? configExtractMode);
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

  // Phase 2: Validate + persist extract mode (R4-IA2, single validator, fail-fast)
  // Resolution: env var > config.yml > default. See resolveReviewSessionExtractMode.
  const extractMode = await resolveReviewSessionExtractMode(argv, projectRoot);
  const sessionMetadataPath = path.join(sessionRoot, "session-metadata.yaml");
  const sessionMetadata = await readYamlDocument<ReviewSessionMetadata>(
    sessionMetadataPath,
  );
  sessionMetadata.learning_extract_mode = extractMode;
  await writeYamlDocument(sessionMetadataPath, sessionMetadata);

  const maxEmbedLines = readSingleOptionValueFromArgv(argv, "max-embed-lines");
  const ontoHomePassthrough = readSingleOptionValueFromArgv(argv, "onto-home");
  const promptPacketsArgs = [
    "--project-root",
    projectRoot,
    "--session-root",
    sessionRoot,
  ];
  if (typeof ontoHomePassthrough === "string" && ontoHomePassthrough.length > 0) {
    promptPacketsArgs.push("--onto-home", ontoHomePassthrough);
  }
  if (typeof maxEmbedLines === "string" && maxEmbedLines.length > 0) {
    promptPacketsArgs.push("--max-embed-lines", maxEmbedLines);
  }

  await runMaterializeReviewPromptPacketsCli(promptPacketsArgs);

  // Write `.latest-session` pointer so the watcher script and other tools can
  // auto-discover the current session without parsing buffered npm stdout.
  // This is a deterministic side-effect: a single line containing the absolute
  // session-root path. Best-effort — failure here must not block session start.
  try {
    const latestSessionPath = path.join(
      projectRoot,
      ".onto",
      "review",
      ".latest-session",
    );
    await fs.writeFile(latestSessionPath, sessionRoot, "utf8");
  } catch {
    // best-effort, ignore
  }

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
