#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { resolveOntoHome } from "./core-runtime/discovery/onto-home.js";
import { resolveProjectRoot } from "./core-runtime/discovery/project-root.js";
import { printOntoReleaseChannelNotice } from "./core-runtime/release-channel/release-channel.js";
import {
  readSingleOptionValueFromArgv,
} from "./core-runtime/review/review-artifact-utils.js";

/**
 * Trust Boundary: check if .onto/ directory needs to be created in the
 * target project. If .onto/ doesn't exist yet, ask for user confirmation
 * before proceeding (the review will create .onto/review/{session}/).
 */
async function checkOntoDirectoryInit(
  projectRoot: string,
  ontoHome: string,
  argv: string[],
): Promise<boolean> {
  const ontoDir = path.join(projectRoot, ".onto");

  // Already exists — previous consent assumed
  if (fs.existsSync(ontoDir)) return true;

  // Self-review (projectRoot === ontoHome) — no consent needed
  if (path.resolve(projectRoot) === path.resolve(ontoHome)) return true;

  // Non-interactive: require --allow-onto-init
  if (argv.includes("--allow-onto-init")) return true;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      [
        `[onto] This project does not have a .onto/ directory yet: ${projectRoot}`,
        "Running a review will create .onto/review/ in this project.",
        "Pass --allow-onto-init to proceed, or create .onto/ manually.",
      ].join("\n"),
    );
    return false;
  }

  // Interactive: prompt user
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await readline.question(
      [
        `[onto] This project does not have a .onto/ directory: ${projectRoot}`,
        "A review session will create .onto/review/ in this directory.",
        "Consider adding .onto/review/ to .gitignore.",
        "Continue? (y/n): ",
      ].join("\n"),
    );
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    readline.close();
  }
}

async function handleReview(
  ontoHome: string,
  argv: string[],
): Promise<number> {
  const enrichedArgv = [...argv];

  if (!argv.includes("--onto-home")) {
    enrichedArgv.push("--onto-home", ontoHome);
  }

  let projectRoot: string | undefined;
  if (!argv.includes("--project-root")) {
    const firstNonFlag = argv.find(
      (arg) => !arg.startsWith("--") && !arg.startsWith("@"),
    );
    projectRoot = resolveProjectRoot(firstNonFlag);
    enrichedArgv.push("--project-root", projectRoot);
  } else {
    const idx = argv.indexOf("--project-root");
    projectRoot = idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
  }

  // Trust Boundary: confirm .onto/ creation in external projects
  if (projectRoot) {
    const allowed = await checkOntoDirectoryInit(
      path.resolve(projectRoot),
      ontoHome,
      argv,
    );
    if (!allowed) {
      console.error("[onto] Review canceled: .onto/ directory creation not approved.");
      return 1;
    }
  }

  const { runReviewInvokeCli } = await import(
    "./core-runtime/cli/review-invoke.js"
  );
  return runReviewInvokeCli(enrichedArgv);
}

async function handleCompleteSession(
  ontoHome: string,
  argv: string[],
): Promise<number> {
  const enrichedArgv = [...argv];

  if (!argv.includes("--onto-home")) {
    enrichedArgv.push("--onto-home", ontoHome);
  }

  const { runCompleteReviewSessionCli } = await import(
    "./core-runtime/cli/complete-review-session.js"
  );
  return runCompleteReviewSessionCli(enrichedArgv);
}

async function handleInfo(ontoHome: string): Promise<number> {
  const projectRoot = resolveProjectRoot();
  console.log(
    JSON.stringify(
      {
        onto_home: ontoHome,
        project_root: projectRoot,
        cwd: process.cwd(),
        node_version: process.version,
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();

  const argv = process.argv.slice(2);
  const subcommand = argv[0];
  const subcommandArgv = argv.slice(1);

  const ontoHomeFlag = readSingleOptionValueFromArgv(argv, "onto-home");
  const ontoHome = resolveOntoHome(ontoHomeFlag);

  // Set ONTO_HOME so spawned processes inherit it
  process.env.ONTO_HOME = ontoHome;

  switch (subcommand) {
    case "review":
      // Check for --complete-session mode
      if (subcommandArgv.includes("--complete-session")) {
        const filteredArgv = subcommandArgv.filter(
          (arg) => arg !== "--complete-session",
        );
        return handleCompleteSession(ontoHome, filteredArgv);
      }
      return handleReview(ontoHome, subcommandArgv);

    case "info":
      return handleInfo(ontoHome);

    case "learn":
    case "govern":
    case "build":
    case "ask":
      console.error(
        `[onto] Subcommand '${subcommand}' is not yet implemented in global CLI.`,
      );
      return 1;

    case "--version":
    case "-v":
      console.log("onto-productization-core (global CLI)");
      return 0;

    case "--help":
    case "-h":
    case undefined:
      console.log(
        [
          "Usage: onto <subcommand> [options]",
          "",
          "Subcommands:",
          "  review <target> <intent>   Run 9-lens review",
          "  review --complete-session   Complete a prepared session",
          "  info                        Show resolved onto home and project root",
          "",
          "Options:",
          "  --onto-home <path>         Override onto installation directory",
          "  --project-root <path>      Override target project root",
          "  --prepare-only             Prepare session without executing lenses",
          "  --allow-onto-init          Allow .onto/ creation in new projects (non-interactive)",
          "  --version, -v              Show version",
          "  --help, -h                 Show this help",
        ].join("\n"),
      );
      return 0;

    default:
      console.error(`[onto] Unknown subcommand: ${subcommand}`);
      console.error("Run 'onto --help' for usage.");
      return 1;
  }
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  },
);
