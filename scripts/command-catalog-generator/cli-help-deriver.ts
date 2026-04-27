/**
 * CLI help derive — P1-2c.
 *
 * Input:  catalog (`command-catalog.ts`).
 * Output: a TS segment inside `src/cli.ts` declaring `const ONTO_HELP_TEXT =
 *         [...].join("\n");`. The segment is line-anchored at column 0 (a
 *         constraint of `extractTypeScriptSegment` — the end marker must
 *         start a line).
 *
 * The static portions (Usage / Options / Installation blocks) live as
 * literals in this deriver; only the **Subcommands** section is computed
 * from the catalog. PublicEntry without a CliRealization (slash-only
 * prompt-backed commands) are intentionally omitted — they are not callable
 * via `onto <name>` and would mislead a CLI user.
 *
 * Bootstrap mechanics mirror dispatcher-deriver: the file is touched in-place
 * by `deriveAllCliHelp({snapshotMode: true})` only when UPDATE_SNAPSHOT=1.
 * Steady-state: `npm run generate:catalog -- --target=help` rewrites the
 * segment without disturbing surrounding hand-written code.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CliRealization,
  CommandCatalog,
  PublicEntry,
} from "../../src/core-runtime/cli/command-catalog.js";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import {
  extractTypeScriptSegment,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

export const DERIVE_SCHEMA_VERSION = "1";

const TARGET_ID = "cli-help";
const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";
const EMISSION_PATH = "src/cli.ts";

/** Static prefix block. Stable across catalog edits. */
const STATIC_HEADER: readonly string[] = [
  "Usage: onto <subcommand> [options]",
  "",
  "Subcommands:",
];

/** Static suffix block. Options/Installation sections are not catalog-derived. */
const STATIC_FOOTER: readonly string[] = [
  "",
  "Options:",
  "  --onto-home <path>         Override onto installation directory",
  "  --project-root <path>      Override target project root",
  "  --prepare-only             Prepare session without executing lenses",
  "  --allow-onto-init          Allow .onto/ creation in new projects (non-interactive)",
  "  --version, -v              Show version",
  "  --help, -h                 Show this help (active subcommands only)",
  "  --include-deprecated       With --help: also list deprecated subcommands",
  "",
  "Installation:",
  "  npm install -g onto-core   Global install (onto command everywhere)",
  "  npm install onto-core      Project install (npx onto within project, version pinned)",
];

const INVOCATION_COL_WIDTH = 24;

function pickCliRealization(entry: PublicEntry): CliRealization | undefined {
  return entry.realizations.find(
    (r): r is CliRealization => r.kind === "cli",
  );
}

function formatSubcommandLine(entry: PublicEntry, cliInvocation: string): string {
  const padded =
    cliInvocation.length >= INVOCATION_COL_WIDTH
      ? cliInvocation + "  "
      : cliInvocation.padEnd(INVOCATION_COL_WIDTH);
  const deprecation =
    entry.deprecated_since !== undefined
      ? `[DEPRECATED since ${entry.deprecated_since}` +
        (entry.successor !== undefined
          ? ` → ${entry.successor}`
          : entry.removed_in !== undefined
            ? ` → removed in ${entry.removed_in}`
            : "") +
        "] "
      : "";
  return `  ${padded}${deprecation}${entry.description}`;
}

export type BuildHelpOptions = {
  /**
   * Include deprecated PublicCliEntry rows. Default `false` — `bin/onto --help`
   * shows only active subcommands; `bin/onto --help --include-deprecated`
   * (R2-§8-PR-1) opts in to seeing deprecated rows with their `[DEPRECATED ...]`
   * marker.
   */
  includeDeprecated?: boolean;
};

/** Build the subcommand block (catalog-derived). */
export function buildSubcommandLines(
  catalog: CommandCatalog,
  opts: BuildHelpOptions = {},
): string[] {
  const includeDeprecated = opts.includeDeprecated ?? false;
  const out: string[] = [];
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const cli = pickCliRealization(entry);
    if (cli === undefined) continue; // slash-only entries not in `onto` CLI
    if (!includeDeprecated && entry.deprecated_since !== undefined) continue;
    out.push(formatSubcommandLine(entry, cli.invocation));
  }
  return out;
}

export function buildHelpLines(
  catalog: CommandCatalog,
  opts: BuildHelpOptions = {},
): string[] {
  return [
    ...STATIC_HEADER,
    ...buildSubcommandLines(catalog, opts),
    ...STATIC_FOOTER,
  ];
}

/**
 * Render the segment body — emits two TS const declarations:
 *   - `ONTO_HELP_TEXT`     — default view (deprecated subcommands hidden)
 *   - `ONTO_HELP_TEXT_ALL` — `--include-deprecated` view (all subcommands)
 *
 * Both are `export`ed so `preboot-dispatch.ts` (via `meta-handlers.onHelp`)
 * and direct `cli.ts:main` invocation can pick the right one based on argv.
 * Each help line is JSON-stringified to handle quotes / backslashes safely.
 */
export function renderHelpSegmentBody(catalog: CommandCatalog): string {
  const renderConst = (name: string, lines: readonly string[]): string => {
    const arrayLiterals = lines
      .map((line) => `  ${JSON.stringify(line)},`)
      .join("\n");
    return `export const ${name} = [\n${arrayLiterals}\n].join("\\n");\n`;
  };
  const linesDefault = buildHelpLines(catalog);
  const linesAll = buildHelpLines(catalog, { includeDeprecated: true });
  return (
    renderConst("ONTO_HELP_TEXT", linesDefault) +
    renderConst("ONTO_HELP_TEXT_ALL", linesAll)
  );
}

export function deriveCliHelpSegment(catalog: CommandCatalog): string {
  const body = renderHelpSegmentBody(catalog);
  const hash = computeTargetDeriveHash(TARGET_ID, catalog, DERIVE_SCHEMA_VERSION);
  return wrapTypeScriptSegmentMarker(body, MARKER_SOURCE_REF, hash);
}

export type DeriveCliHelpOptions = {
  dryRun?: boolean;
  snapshotMode?: boolean;
  projectRoot?: string;
};

export type DeriveCliHelpResult = {
  written: boolean;
  skippedDryRun: boolean;
  emissionPath: string;
};

/**
 * Splice the generated segment into `src/cli.ts`.
 *
 * Bounded path:
 *   1. Read the current cli.ts.
 *   2. If a TS segment marker already exists → splice in the new wrapped body
 *      between (start..end) markers. The exact byte offsets come from the
 *      marker extractor.
 *   3. If no marker exists → require `snapshotMode: true` (gated by
 *      UPDATE_SNAPSHOT=1) and append the new segment near the top of the
 *      file (after the last `import`/`from "..."` line).
 *   4. Write atomically (or skip when `dryRun`).
 */
export function deriveAllCliHelp(
  catalog: CommandCatalog,
  opts: DeriveCliHelpOptions = {},
): DeriveCliHelpResult {
  const projectRoot = opts.projectRoot ?? path.resolve(".");
  const dryRun = opts.dryRun ?? false;
  const snapshotMode = opts.snapshotMode ?? false;

  if (snapshotMode && process.env.UPDATE_SNAPSHOT !== "1") {
    throw new Error(
      "snapshotMode=true requires UPDATE_SNAPSHOT=1 in the environment. " +
        "This path is the sole bootstrap seat (plan §D18/§D27).",
    );
  }

  const absPath = path.resolve(projectRoot, EMISSION_PATH);
  if (!existsSync(absPath)) {
    throw new Error(
      `cli.ts not found at ${EMISSION_PATH} (resolved: ${absPath}). ` +
        `The cli-help deriver edits an existing file in place — it does not create one.`,
    );
  }

  const original = readFileSync(absPath, "utf8");
  const segmentWrapped = deriveCliHelpSegment(catalog);
  const updated = spliceCliHelpSegment(original, segmentWrapped, snapshotMode);

  if (dryRun) {
    return { written: false, skippedDryRun: true, emissionPath: EMISSION_PATH };
  }

  if (updated === original) {
    return { written: false, skippedDryRun: false, emissionPath: EMISSION_PATH };
  }
  writeFileSync(absPath, updated, "utf8");
  return { written: true, skippedDryRun: false, emissionPath: EMISSION_PATH };
}

/**
 * Replace the existing TS segment, OR (in snapshotMode) inject one after the
 * last top-level `import` line.
 */
export function spliceCliHelpSegment(
  fileContent: string,
  segmentWrapped: string,
  snapshotMode: boolean,
): string {
  const existing = extractTypeScriptSegment(fileContent);
  if (existing !== null) {
    // Find the start marker line + the end marker line, replace the whole
    // span (including both markers) with the new wrapped segment.
    const startMarkerIdx = fileContent.indexOf("// >>> GENERATED FROM CATALOG");
    const endAnchor = "\n// <<< END GENERATED";
    const endAnchorIdx = fileContent.indexOf(endAnchor, startMarkerIdx);
    if (startMarkerIdx < 0 || endAnchorIdx < 0) {
      throw new Error(
        "Internal: extractTypeScriptSegment succeeded but byte-offsets could not be located.",
      );
    }
    const endLineEnd = fileContent.indexOf("\n", endAnchorIdx + 1);
    const replaceUntil = endLineEnd >= 0 ? endLineEnd + 1 : fileContent.length;
    return (
      fileContent.slice(0, startMarkerIdx) +
      segmentWrapped +
      fileContent.slice(replaceUntil)
    );
  }

  if (!snapshotMode) {
    throw new Error(
      `cli.ts has no TS segment marker yet. Bootstrap via UPDATE_SNAPSHOT=1: ` +
        `\`UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/cli-help-deriver.test.ts\`. ` +
        `plan §D18.`,
    );
  }

  // Insert after the LAST top-level import statement. A line ends an import
  // statement when it terminates with `from "...";` or is a side-effect
  // import `import "...";`. This handles both single-line and multi-line
  // import declarations: `import {\n  foo,\n} from "bar";` ends on its
  // closing line.
  const lines = fileContent.split("\n");
  const importEndPattern =
    /(?:^\s*import\s+["'][^"']+["']\s*;\s*$)|(?:from\s+["'][^"']+["']\s*;\s*$)/;
  let lastImportEndLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] ?? "";
    if (importEndPattern.test(l)) lastImportEndLine = i;
  }
  if (lastImportEndLine < 0) {
    throw new Error(
      "Cannot locate the end of the import block in cli.ts (no `from \"...\";` line found).",
    );
  }
  // Insert after the import block, with one blank line of separation.
  const before = lines.slice(0, lastImportEndLine + 1).join("\n");
  const after = lines.slice(lastImportEndLine + 1).join("\n");
  return before + "\n\n" + segmentWrapped + after;
}

export const CLI_HELP_EMISSION_PATH = EMISSION_PATH;
