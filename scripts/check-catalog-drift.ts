#!/usr/bin/env tsx
/**
 * Catalog drift check — Phase 1 P1-4.
 *
 * Design authority:
 *   development-records/evolve/20260423-phase-1-catalog-ssot-design.md §9
 *   development-records/evolve/20260423-activation-determinism-redesign.md §8
 *
 * Purpose: read-only verification that the catalog and its 5 derived
 * artifacts are byte-identical to what the deriver would emit right now.
 * Exits 0 on clean state, exits 1 with per-target drift report on mismatch.
 *
 * Authority position: this script is the canonical drift guard for the
 * `cli.ts` ONTO_HELP_TEXT segment (which has no module-load entry guard —
 * it is a const declaration inside a multi-purpose module). For
 * `dispatcher.ts` and `preboot-dispatch.ts` it is a redundant guard:
 * those files also fail-fast at module load via their respective
 * `assert*DeriveHash()` entry checks (`derive-hash-guard.ts`). Running
 * this in CI catches drift before the runtime guards would, and surfaces
 * a single aggregated report instead of one-target-at-a-time.
 *
 * Drift kinds reported:
 *   - markdown    : per-entry derived `.md` differs from on-disk bytes
 *                   (or structural failure: stale markered file, missing
 *                   template, markerless collision)
 *   - dispatcher  : `src/core-runtime/cli/dispatcher.ts` differs
 *   - preboot-dispatch : `src/core-runtime/cli/preboot-dispatch.ts` differs
 *   - cli-help    : the catalog-derived TS segment in `src/cli.ts` differs
 *   - package-scripts : RuntimeScriptEntry set / values diverge from
 *                   `package.json:scripts` (also reports orphan scripts
 *                   not in `EXCLUDED_PACKAGE_SCRIPTS`)
 *
 * The script never writes anything. The dev workflow for fixing drift is
 * the catalog generator: `npm run generate:catalog`.
 *
 * Build/lint layer (design §4.2): not a RuntimeScriptEntry. The
 * `check:catalog-drift` package script is registered in
 * `EXCLUDED_PACKAGE_SCRIPTS` (package-scripts-deriver.ts) so the deriver
 * does not flag it as orphan.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";

import {
  CLI_HELP_EMISSION_PATH,
  deriveCliHelpSegment,
  spliceCliHelpSegment,
} from "./command-catalog-generator/cli-help-deriver.js";
import {
  deriveDispatcher,
  DISPATCHER_EMISSION_PATH,
} from "./command-catalog-generator/dispatcher-deriver.js";
import { extractTypeScriptSegment } from "./command-catalog-generator/marker.js";
import {
  buildEmissionSet,
  deriveAllMarkdown,
  deriveMarkdown,
} from "./command-catalog-generator/markdown-deriver.js";
import {
  diffScripts,
  type ScriptDriftIssue,
} from "./command-catalog-generator/package-scripts-deriver.js";
import {
  derivePrebootDispatch,
  PREBOOT_DISPATCH_EMISSION_PATH,
} from "./command-catalog-generator/preboot-dispatch-deriver.js";
import {
  DEFAULT_TEMPLATES_DIR,
  readTemplate,
} from "./command-catalog-generator/template-loader.js";

type DriftTarget =
  | "markdown"
  | "dispatcher"
  | "preboot-dispatch"
  | "cli-help"
  | "package-scripts";

type DriftIssueKind =
  | "structural"
  | "missing-on-disk"
  | "byte-mismatch"
  | "value-mismatch"
  | "orphan";

type DriftIssue = {
  target: DriftTarget;
  path: string;
  kind: DriftIssueKind;
  detail?: string;
};

function checkMarkdownDrift(repoRoot: string): DriftIssue[] {
  const issues: DriftIssue[] = [];

  // Structural validation — surfaces stale markered files, markerless
  // collisions, and missing templates as a single aggregate error. We
  // catch and convert so the rest of the report still runs.
  try {
    deriveAllMarkdown(COMMAND_CATALOG, { dryRun: true, projectRoot: repoRoot });
  } catch (err) {
    issues.push({
      target: "markdown",
      path: ".onto/commands/",
      kind: "structural",
      detail: (err as Error).message,
    });
    return issues;
  }

  const emissionEntries = buildEmissionSet(COMMAND_CATALOG);
  for (const { entry, emissionPath } of emissionEntries) {
    const template = readTemplate(entry.doc_template_id, DEFAULT_TEMPLATES_DIR);
    if (template === null) {
      issues.push({
        target: "markdown",
        path: emissionPath,
        kind: "missing-on-disk",
        detail: `template ${entry.doc_template_id}.md.template not found`,
      });
      continue;
    }
    const expected = deriveMarkdown(entry, template);
    const absPath = path.resolve(repoRoot, emissionPath);
    if (!existsSync(absPath)) {
      issues.push({
        target: "markdown",
        path: emissionPath,
        kind: "missing-on-disk",
      });
      continue;
    }
    const actual = readFileSync(absPath, "utf8");
    if (expected !== actual) {
      issues.push({
        target: "markdown",
        path: emissionPath,
        kind: "byte-mismatch",
      });
    }
  }
  return issues;
}

function checkWholeFileDrift(
  target: Extract<DriftTarget, "dispatcher" | "preboot-dispatch">,
  emissionPath: string,
  expected: string,
  repoRoot: string,
): DriftIssue[] {
  const absPath = path.resolve(repoRoot, emissionPath);
  if (!existsSync(absPath)) {
    return [{ target, path: emissionPath, kind: "missing-on-disk" }];
  }
  const actual = readFileSync(absPath, "utf8");
  if (expected !== actual) {
    return [{ target, path: emissionPath, kind: "byte-mismatch" }];
  }
  return [];
}

function checkCliHelpDrift(repoRoot: string): DriftIssue[] {
  const absPath = path.resolve(repoRoot, CLI_HELP_EMISSION_PATH);
  if (!existsSync(absPath)) {
    return [
      { target: "cli-help", path: CLI_HELP_EMISSION_PATH, kind: "missing-on-disk" },
    ];
  }
  const fileContent = readFileSync(absPath, "utf8");
  if (extractTypeScriptSegment(fileContent) === null) {
    return [
      {
        target: "cli-help",
        path: CLI_HELP_EMISSION_PATH,
        kind: "structural",
        detail: "no TS segment marker in src/cli.ts (run generate:catalog --target=help)",
      },
    ];
  }
  const expectedSegment = deriveCliHelpSegment(COMMAND_CATALOG);
  // spliceCliHelpSegment(file, segment, false) returns the file with the
  // current marker block replaced by the freshly-derived segment. If that
  // result equals the original file bytes, the segment is in sync.
  const wouldBe = spliceCliHelpSegment(fileContent, expectedSegment, false);
  if (wouldBe !== fileContent) {
    return [
      { target: "cli-help", path: CLI_HELP_EMISSION_PATH, kind: "byte-mismatch" },
    ];
  }
  return [];
}

function checkPackageScriptsDrift(repoRoot: string): DriftIssue[] {
  const absPath = path.resolve(repoRoot, "package.json");
  const original = readFileSync(absPath, "utf8");
  const pkg = JSON.parse(original) as { scripts?: Record<string, string> };
  const drift = diffScripts(COMMAND_CATALOG, pkg.scripts ?? {});
  return drift.map((d): DriftIssue => mapScriptDrift(d));
}

function mapScriptDrift(d: ScriptDriftIssue): DriftIssue {
  if (d.kind === "missing-from-package") {
    return {
      target: "package-scripts",
      path: "package.json",
      kind: "missing-on-disk",
      detail: `${d.name} (expected: ${JSON.stringify(d.expected)})`,
    };
  }
  if (d.kind === "value-mismatch") {
    return {
      target: "package-scripts",
      path: "package.json",
      kind: "value-mismatch",
      detail: `${d.name}: expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.actual)}`,
    };
  }
  return {
    target: "package-scripts",
    path: "package.json",
    kind: "orphan",
    detail: `${d.name} not in catalog and not in EXCLUDED_PACKAGE_SCRIPTS`,
  };
}

function formatReport(issues: readonly DriftIssue[]): string {
  const byTarget = new Map<DriftTarget, DriftIssue[]>();
  for (const issue of issues) {
    const list = byTarget.get(issue.target);
    if (list === undefined) byTarget.set(issue.target, [issue]);
    else list.push(issue);
  }
  const lines: string[] = [
    `[catalog-drift] ${issues.length} issue(s) across ${byTarget.size} target(s):`,
    "",
  ];
  const order: DriftTarget[] = [
    "markdown",
    "dispatcher",
    "preboot-dispatch",
    "cli-help",
    "package-scripts",
  ];
  for (const target of order) {
    const group = byTarget.get(target);
    if (group === undefined) continue;
    lines.push(`[${target}]`);
    for (const issue of group) {
      const detail = issue.detail !== undefined ? ` — ${issue.detail}` : "";
      lines.push(`  ${issue.kind}: ${issue.path}${detail}`);
    }
    lines.push("");
  }
  lines.push(
    "Resolution: `npm run generate:catalog` and commit the regenerated artifacts in the same PR.",
  );
  lines.push(
    "Bypass for local dev workflow only: ONTO_ALLOW_STALE_DISPATCHER=1 (NOT honored by CI).",
  );
  return lines.join("\n") + "\n";
}

function main(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");

  const dispatcherExpected = deriveDispatcher(COMMAND_CATALOG);
  const prebootExpected = derivePrebootDispatch(COMMAND_CATALOG);

  const issues: DriftIssue[] = [
    ...checkMarkdownDrift(repoRoot),
    ...checkWholeFileDrift(
      "dispatcher",
      DISPATCHER_EMISSION_PATH,
      dispatcherExpected,
      repoRoot,
    ),
    ...checkWholeFileDrift(
      "preboot-dispatch",
      PREBOOT_DISPATCH_EMISSION_PATH,
      prebootExpected,
      repoRoot,
    ),
    ...checkCliHelpDrift(repoRoot),
    ...checkPackageScriptsDrift(repoRoot),
  ];

  if (issues.length === 0) {
    process.stdout.write(
      "[catalog-drift] all 5 derive targets in sync (markdown · dispatcher · preboot-dispatch · cli-help · package-scripts).\n",
    );
    return;
  }

  process.stderr.write(formatReport(issues));
  process.exit(1);
}

const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    main();
  } catch (err) {
    process.stderr.write(
      `check-catalog-drift: ${(err as Error).message}\n`,
    );
    process.exit(1);
  }
}
