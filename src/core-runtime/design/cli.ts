/**
 * onto design — CLI entry point.
 *
 * Routes design subcommands to the appropriate command handler.
 * Currently wired: start
 * Planned: align, draft, apply, close
 */

import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export async function handleDesignCli(
  ontoHome: string,
  argv: string[],
): Promise<number> {
  const subcommand = argv[0];
  const subArgv = argv.slice(1);

  switch (subcommand) {
    case "start":
      return handleDesignStart(ontoHome, subArgv);

    case "align":
    case "draft":
    case "apply":
    case "close":
      console.error(`[onto] design ${subcommand} is not yet implemented.`);
      return 1;

    case "--help":
    case "-h":
    case undefined:
      console.log(
        [
          "Usage: onto design <subcommand> [options]",
          "",
          "Subcommands:",
          "  start <description>         Start or resume a design scope",
          "  align                       (planned) Generate align packet",
          "  draft                       (planned) Generate draft packet",
          "  apply                       (planned) Apply design to implementation",
          "  close                       (planned) Close design scope",
          "",
          "Options:",
          "  --project-root <path>       Project root (default: cwd)",
          "  --scopes-dir <path>         Scopes directory (default: <project-root>/scopes)",
          "  --project-name <name>       Project name for scope ID generation",
          "  --scope-id <id>             Resume an existing scope",
          "  --entry-mode <mode>         'experience' or 'interface' (default: experience)",
        ].join("\n"),
      );
      return 0;

    default:
      console.error(`[onto] Unknown design subcommand: ${subcommand}`);
      console.error("Run 'onto design --help' for usage.");
      return 1;
  }
}

// ─── start ───

function readOption(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

async function handleDesignStart(
  _ontoHome: string,
  argv: string[],
): Promise<number> {
  const { executeStart } = await import("./commands/start.js");

  const projectRoot = readOption(argv, "project-root") ?? process.cwd();
  const scopesDir = readOption(argv, "scopes-dir") ?? join(projectRoot, "scopes");
  const projectName = readOption(argv, "project-name");
  const scopeId = readOption(argv, "scope-id");
  const entryMode = (readOption(argv, "entry-mode") ?? "experience") as "experience" | "interface";

  // Collect non-flag arguments as description
  const rawInput = argv
    .filter((arg) => !arg.startsWith("--"))
    .join(" ")
    .trim();

  if (!rawInput && !scopeId) {
    console.error("[onto] design start requires a description or --scope-id to resume.");
    return 1;
  }

  // Ensure scopes directory exists
  if (!existsSync(scopesDir)) {
    mkdirSync(scopesDir, { recursive: true });
  }

  try {
    const result = await executeStart({
      rawInput: rawInput || "",
      projectRoot,
      scopesDir,
      ...(projectName !== undefined ? { projectName } : {}),
      ...(scopeId !== undefined ? { scopeId } : {}),
      entryMode,
      onProgress: (msg: string) => console.log(`  ${msg}`),
    });

    if (!result.success) {
      console.error(`[onto] design start failed: ${result.reason} (step: ${result.step})`);
      return 1;
    }

    if (result.action === "initialized") {
      console.log(
        JSON.stringify({
          status: "initialized",
          scope_id: result.scopeId,
          brief_path: result.briefPath,
          message: "Scope initialized. Fill in the brief, then run 'onto design start' again.",
        }, null, 2),
      );
      return 0;
    }

    if (result.action === "resume_info") {
      console.log(
        JSON.stringify({
          status: "resume",
          scope_id: result.scopeId,
          current_state: result.currentState,
          next_action: result.nextAction,
        }, null, 2),
      );
      return 0;
    }

    // Full execution result
    console.log(
      JSON.stringify({
        status: "executed",
        paths: result.paths,
        scan_results: result.scanResults.length,
        scan_errors: result.scanErrors.length,
        total_files: result.totalFiles,
      }, null, 2),
    );
    return 0;
  } catch (error) {
    console.error(
      `[onto] design start error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}
