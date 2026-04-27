/**
 * package.json:scripts derive — P1-2c.
 *
 * Per design §9.1, this target uses **no marker**. The integrity check is a
 * 1:1 set equality between catalog RuntimeScriptEntry names and the
 * package.json scripts keys, after removing build/lint/test scripts that
 * are explicitly out of catalog scope.
 *
 * Bootstrap mechanics:
 *   - Steady-state: `npm run generate:catalog -- --target=package-scripts`.
 *     Computes expected script lines, verifies 1:1, rewrites the scripts
 *     block deterministically (preserves EXCLUDED keys in current order,
 *     emits catalog-derived keys in catalog declaration order).
 *   - Bootstrap (one-time): UPDATE_SNAPSHOT=1 — same path; lifts the
 *     "EXCLUDED only contains scripts already in package.json" invariant if
 *     a fresh checkout would otherwise fail.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CommandCatalog,
  RuntimeScriptEntry,
} from "../../src/core-runtime/cli/command-catalog.js";

export const DERIVE_SCHEMA_VERSION = "1";

const EMISSION_PATH = "package.json";

/**
 * package.json scripts that are out of catalog scope (build / lint / test
 * tooling). These remain hand-written; the deriver preserves them verbatim
 * in their current order. Adding to this list requires explicit decision
 * (analogous to CATALOG_BACKED_NON_DERIVED_EXCEPTIONS in markdown-deriver).
 */
export const EXCLUDED_PACKAGE_SCRIPTS: readonly string[] = [
  "prepare",
  "build:ts-core",
  "check:ts-core",
  "lint:output-language-boundary",
  "generate:catalog",
  "check:catalog-drift",
  "check:handler-exports",
  "test:e2e",
  "test:e2e:promote",
  "test:e2e:start-review-session",
  "test:e2e:codex-multi-agent-fixes",
];

/** Build the npm-script command string for a single RuntimeScriptEntry. */
export function buildScriptCommand(entry: RuntimeScriptEntry): string {
  let runner: string;
  switch (entry.invoker) {
    case "tsx":
      runner = "tsx";
      break;
    case "bash":
      runner = "bash";
      break;
    case "node-dist":
      // No catalog entry uses this today (P1-2c). Reserved for future use
      // when the dist-bundled CLI replaces tsx invocation.
      runner = "node";
      break;
  }
  const argsTail =
    entry.args !== undefined && entry.args.length > 0
      ? " " + entry.args.join(" ")
      : "";
  return `${runner} ${entry.script_path}${argsTail}`;
}

export type PackageScripts = Record<string, string>;

/**
 * Produce the expected `scripts` object: EXCLUDED keys (preserved values
 * + current order) followed by catalog-derived entries (catalog order).
 */
export function buildExpectedScripts(
  catalog: CommandCatalog,
  currentScripts: PackageScripts,
): PackageScripts {
  const expected: PackageScripts = {};

  // 1. EXCLUDED keys — keep current value + relative order from currentScripts.
  const excludedSet = new Set<string>(EXCLUDED_PACKAGE_SCRIPTS);
  const currentKeys = Object.keys(currentScripts);
  for (const key of currentKeys) {
    if (excludedSet.has(key)) {
      expected[key] = currentScripts[key]!;
    }
  }

  // 2. Catalog-derived keys — emit in catalog declaration order.
  for (const entry of catalog.entries) {
    if (entry.kind !== "runtime_script") continue;
    expected[entry.name] = buildScriptCommand(entry);
  }

  return expected;
}

export type ScriptDriftIssue =
  | { kind: "missing-from-package"; name: string; expected: string }
  | { kind: "value-mismatch"; name: string; expected: string; actual: string }
  | { kind: "orphan-package-script"; name: string; actual: string };

/**
 * Compare current scripts vs expected. Returns drift issues without throwing
 * so callers can format a single aggregate error.
 */
export function diffScripts(
  catalog: CommandCatalog,
  currentScripts: PackageScripts,
): ScriptDriftIssue[] {
  const issues: ScriptDriftIssue[] = [];
  const expected = buildExpectedScripts(catalog, currentScripts);

  for (const [name, expectedValue] of Object.entries(expected)) {
    const actual = currentScripts[name];
    if (actual === undefined) {
      issues.push({ kind: "missing-from-package", name, expected: expectedValue });
      continue;
    }
    if (actual !== expectedValue) {
      issues.push({
        kind: "value-mismatch",
        name,
        expected: expectedValue,
        actual,
      });
    }
  }

  // Orphan: keys in package.json that are neither EXCLUDED nor in catalog.
  const catalogScriptNames = new Set<string>();
  for (const entry of catalog.entries) {
    if (entry.kind !== "runtime_script") continue;
    catalogScriptNames.add(entry.name);
  }
  const allowed = new Set<string>([...EXCLUDED_PACKAGE_SCRIPTS, ...catalogScriptNames]);
  for (const [name, actual] of Object.entries(currentScripts)) {
    if (!allowed.has(name)) {
      issues.push({ kind: "orphan-package-script", name, actual });
    }
  }

  return issues;
}

export type DerivePackageScriptsOptions = {
  dryRun?: boolean;
  snapshotMode?: boolean;
  projectRoot?: string;
};

export type DerivePackageScriptsResult = {
  written: boolean;
  skippedDryRun: boolean;
  emissionPath: string;
  /** Drift issues observed BEFORE rewrite (empty if scripts were already aligned). */
  driftBefore: ScriptDriftIssue[];
};

const PACKAGE_JSON_INDENT = 2;

/**
 * Bounded path:
 *   1. Read package.json (text + parsed object).
 *   2. Compute expected scripts.
 *   3. Detect drift.
 *   4. If snapshotMode=false and any orphan-package-script issue exists,
 *      fail closed (caller must add to EXCLUDED or remove the key).
 *   5. Rewrite scripts in-place (or skip when dryRun).
 */
export function deriveAllPackageScripts(
  catalog: CommandCatalog,
  opts: DerivePackageScriptsOptions = {},
): DerivePackageScriptsResult {
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
  const original = readFileSync(absPath, "utf8");
  const trailingNewline = original.endsWith("\n");
  const pkg = JSON.parse(original) as { scripts?: PackageScripts; [k: string]: unknown };
  const currentScripts = pkg.scripts ?? {};

  const driftBefore = diffScripts(catalog, currentScripts);
  const orphans = driftBefore.filter((i) => i.kind === "orphan-package-script");
  if (orphans.length > 0 && !snapshotMode) {
    const lines = orphans.map((o) =>
      `  ${(o as { kind: "orphan-package-script"; name: string }).name}`,
    );
    throw new Error(
      `Orphan package.json scripts (not in catalog and not in EXCLUDED_PACKAGE_SCRIPTS):\n` +
        lines.join("\n") +
        `\nResolution: add to EXCLUDED_PACKAGE_SCRIPTS in package-scripts-deriver.ts ` +
        `or remove the key from package.json. design §9.1.`,
    );
  }

  const expectedScripts = buildExpectedScripts(catalog, currentScripts);
  pkg.scripts = expectedScripts;

  const updated =
    JSON.stringify(pkg, null, PACKAGE_JSON_INDENT) +
    (trailingNewline ? "\n" : "");

  if (dryRun) {
    return {
      written: false,
      skippedDryRun: true,
      emissionPath: EMISSION_PATH,
      driftBefore,
    };
  }
  if (updated === original) {
    return {
      written: false,
      skippedDryRun: false,
      emissionPath: EMISSION_PATH,
      driftBefore,
    };
  }
  writeFileSync(absPath, updated, "utf8");
  return {
    written: true,
    skippedDryRun: false,
    emissionPath: EMISSION_PATH,
    driftBefore,
  };
}

export const PACKAGE_SCRIPTS_EMISSION_PATH = EMISSION_PATH;
