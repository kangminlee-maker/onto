/**
 * onto design — CLI entry point.
 *
 * Routes design subcommands to the appropriate command handler.
 */

import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { resolveScopePaths, type ScopePaths } from "../scope-runtime/scope-manager.js";

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
      return handleDesignAlign(subArgv);
    case "draft":
      return handleDesignDraft(subArgv);
    case "apply":
      return handleDesignApply(subArgv);
    case "close":
      return handleDesignClose(subArgv);

    case "--help":
    case "-h":
    case undefined:
      console.log(
        [
          "Usage: onto design <subcommand> [options]",
          "",
          "Subcommands:",
          "  start <description>         Start or resume a design scope",
          "  align --scope-id <id>       Lock or revise alignment direction",
          "  draft --scope-id <id>       Generate draft packet / confirm surface / decide constraints",
          "  apply --scope-id <id>       Apply design to implementation",
          "  close --scope-id <id>       Close a validated scope",
          "",
          "Options:",
          "  --project-root <path>       Project root (default: cwd)",
          "  --scopes-dir <path>         Scopes directory (default: <project-root>/scopes)",
          "  --project-name <name>       Project name for scope ID generation",
          "  --scope-id <id>             Target scope ID (required for align/draft/apply/close)",
          "  --entry-mode <mode>         'experience' or 'interface' (default: experience)",
          "  --verdict <verdict>         Align verdict: approve/revise/reject/rescan",
        ].join("\n"),
      );
      return 0;

    default:
      console.error(`[onto] Unknown design subcommand: ${subcommand}`);
      console.error("Run 'onto design --help' for usage.");
      return 1;
  }
}

// ─── Shared helpers ───

function readOption(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

function resolveScopePathsFromArgv(argv: string[]): ScopePaths | null {
  const scopeId = readOption(argv, "scope-id");
  if (!scopeId) {
    console.error("[onto] --scope-id is required.");
    return null;
  }
  const projectRoot = readOption(argv, "project-root") ?? process.cwd();
  const scopesDir = readOption(argv, "scopes-dir") ?? join(projectRoot, "scopes");
  return resolveScopePaths(scopesDir, scopeId);
}

// ─── start ───

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

// ─── align ───

async function handleDesignAlign(argv: string[]): Promise<number> {
  const paths = resolveScopePathsFromArgv(argv);
  if (!paths) return 1;

  const jsonInput = readOption(argv, "json");
  if (!jsonInput) {
    console.error("[onto] design align requires --json '<verdict-object>'.");
    console.error("Example: --json '{\"type\":\"approve\",\"direction\":\"...\",\"scope_in\":[],\"scope_out\":[]}'");
    return 1;
  }

  const { executeAlign } = await import("./commands/align.js");
  const verdict = JSON.parse(jsonInput);
  const result = executeAlign({ paths, verdict });
  console.log(JSON.stringify(result, null, 2));
  return result.success ? 0 : 1;
}

// ─── draft ───

async function handleDesignDraft(argv: string[]): Promise<number> {
  const paths = resolveScopePathsFromArgv(argv);
  if (!paths) return 1;

  const jsonInput = readOption(argv, "json");
  if (!jsonInput) {
    console.error("[onto] design draft requires --json '<action-object>'.");
    console.error("Example: --json '{\"type\":\"generate_surface\"}'");
    return 1;
  }

  const { executeDraft } = await import("./commands/draft.js");
  const action = JSON.parse(jsonInput);
  const result = executeDraft({ paths, action });
  console.log(JSON.stringify(result, null, 2));
  return result.success ? 0 : 1;
}

// ─── apply ───

async function handleDesignApply(argv: string[]): Promise<number> {
  const paths = resolveScopePathsFromArgv(argv);
  if (!paths) return 1;

  const jsonInput = readOption(argv, "json");
  if (!jsonInput) {
    console.error("[onto] design apply requires --json '<action-object>'.");
    console.error("Example: --json '{\"type\":\"start_apply\",\"buildSpecHash\":\"...\"}'");
    return 1;
  }

  const projectRoot = readOption(argv, "project-root") ?? process.cwd();
  const { executeApply } = await import("./commands/apply.js");
  const action = JSON.parse(jsonInput);
  const result = executeApply(paths, action, { projectRoot });
  console.log(JSON.stringify(result, null, 2));
  return result.success ? 0 : 1;
}

// ─── close ───

async function handleDesignClose(argv: string[]): Promise<number> {
  const paths = resolveScopePathsFromArgv(argv);
  if (!paths) return 1;

  const { executeClose } = await import("./commands/close.js");
  const result = executeClose(paths);
  console.log(JSON.stringify(result, null, 2));
  return result.success ? 0 : 1;
}
