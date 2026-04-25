#!/usr/bin/env tsx
/**
 * Command Catalog Generator — Phase 1 P1-2b entry script.
 *
 * Design authority:
 *   development-records/evolve/20260423-phase-1-catalog-ssot-design.md §7
 *   development-records/plan/... (P1-2b plan body, v9)
 *
 * Status (P1-2b): markdown derive emitter shipped. Other targets still pending
 * (dispatcher / help segment / package-scripts land in P1-2c).
 *
 * CLI surface:
 *
 *   --dry-run                      Do not write any files. Always honored by emitters.
 *   --target=<target>              One of: markdown | dispatcher | help | package-scripts | all.
 *                                  Default: all. Unshipped targets print their phase.
 *
 * Bootstrap vs steady-state (plan §D18):
 *   - Steady-state: `npm run generate:catalog -- --target=markdown` (this file).
 *     Runs in default mode (snapshotMode=false); D13 case (ii) stays fail-closed.
 *   - Bootstrap (one-time, authoring-only):
 *     `UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/markdown-diff0.test.ts`.
 *     This is the ONLY path that flips snapshotMode=true.
 *
 * This script lives in the build/lint layer (design §4.2) and is therefore
 * NOT registered as a RuntimeScriptEntry in the catalog.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
import { getNormalizedInvocationSet } from "../src/core-runtime/cli/command-catalog-helpers.js";
import type { CommandCatalog } from "../src/core-runtime/cli/command-catalog.js";
import { computeCatalogHash } from "./command-catalog-generator/catalog-hash.js";
import {
  deriveAllMarkdown,
  type DeriveResult,
} from "./command-catalog-generator/markdown-deriver.js";
import { listAvailableTemplates } from "./command-catalog-generator/template-loader.js";

// Derive targets. `package-scripts` (not `scripts`) disambiguates from the
// scripts/ directory and RuntimeScriptEntry surfaces that also carry the
// word "scripts" in this subsystem.
type DeriveTarget = "markdown" | "dispatcher" | "help" | "package-scripts";
type Target = DeriveTarget | "all";
const DERIVE_TARGETS: readonly DeriveTarget[] = [
  "markdown",
  "dispatcher",
  "help",
  "package-scripts",
];
const VALID_TARGETS: readonly Target[] = [...DERIVE_TARGETS, "all"];

// Which P1 sub-PR lands each derive target. P1-2a only reports readiness —
// every target is "pending" until its emitter PR merges.
const DERIVE_TARGET_PHASE: Readonly<Record<DeriveTarget, string>> = {
  markdown: "P1-2b",
  dispatcher: "P1-2c",
  help: "P1-2c",
  "package-scripts": "P1-2c",
};

export type GeneratorOptions = {
  dryRun: boolean;
  target: Target;
};

export function parseArgs(argv: readonly string[]): GeneratorOptions {
  let dryRun = false;
  let target: Target = "all";
  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--target=")) {
      const value = arg.slice("--target=".length);
      if (!(VALID_TARGETS as readonly string[]).includes(value)) {
        throw new Error(
          `--target must be one of ${VALID_TARGETS.join(" | ")}, got "${value}".`,
        );
      }
      target = value as Target;
      continue;
    }
    throw new Error(`Unknown argument: "${arg}".`);
  }
  return { dryRun, target };
}

/**
 * Static capability flag per derive target (plan §D8).
 * `"ready"`  — the target's emitter code ships in the current runtime.
 * `"pending"` — the emitter has not landed yet; the named phase will add it.
 *
 * This is NOT a per-run result. Whether a given invocation succeeded is
 * communicated via exit code + stdout in the standard CLI convention.
 */
export type DeriveTargetStatus = "pending" | "ready";

export type CatalogSummary = {
  catalogHash: string;
  entryCounts: { public: number; runtime_script: number; meta: number };
  normalizedInvocationCount: number;
  availableTemplateCount: number;
  target: Target;
  dryRun: boolean;
  deriveTargetStatus: Readonly<Record<DeriveTarget, DeriveTargetStatus>>;
};

/** Static capability map (plan §D8). Flips ONLY when emitter code ships. */
const DERIVE_TARGET_CAPABILITY: Readonly<Record<DeriveTarget, DeriveTargetStatus>> = {
  markdown: "ready", // P1-2b shipped.
  dispatcher: "pending",
  help: "pending",
  "package-scripts": "pending",
};

export function summarizeCatalog(
  catalog: CommandCatalog,
  options: GeneratorOptions,
): CatalogSummary {
  const entryCounts = { public: 0, runtime_script: 0, meta: 0 };
  for (const entry of catalog.entries) entryCounts[entry.kind]++;
  const normalized = getNormalizedInvocationSet(catalog);
  return {
    catalogHash: computeCatalogHash(catalog),
    entryCounts,
    normalizedInvocationCount: normalized.size,
    availableTemplateCount: listAvailableTemplates().length,
    target: options.target,
    dryRun: options.dryRun,
    deriveTargetStatus: DERIVE_TARGET_CAPABILITY,
  };
}

function formatTargetStatusLines(
  status: Readonly<Record<DeriveTarget, DeriveTargetStatus>>,
): string[] {
  const labelWidth = Math.max(...DERIVE_TARGETS.map((t) => t.length));
  return DERIVE_TARGETS.map((t) => {
    const state = status[t];
    const suffix =
      state === "pending" ? ` (lands in ${DERIVE_TARGET_PHASE[t]})` : "";
    return `    ${t.padEnd(labelWidth)} : ${state}${suffix}`;
  });
}

export function formatSummary(s: CatalogSummary): string {
  return [
    "command-catalog generator — summary",
    `  catalog hash        : ${s.catalogHash}`,
    `  entries             : ${s.entryCounts.public} public · ` +
      `${s.entryCounts.runtime_script} runtime_script · ${s.entryCounts.meta} meta`,
    `  normalized set size : ${s.normalizedInvocationCount}`,
    `  templates available : ${s.availableTemplateCount}`,
    `  target              : ${s.target}`,
    `  dry-run             : ${s.dryRun ? "yes" : "no"}`,
    "  derive targets:",
    ...formatTargetStatusLines(s.deriveTargetStatus),
  ].join("\n");
}

export function formatDeriveResult(r: DeriveResult, dryRun: boolean): string {
  const lines: string[] = [];
  if (dryRun) {
    lines.push(`  dry-run: would write ${r.skippedDryRun.length} file(s):`);
    for (const rel of r.skippedDryRun) lines.push(`    - ${rel}`);
  } else {
    lines.push(`  wrote ${r.written.length} file(s):`);
    for (const rel of r.written) lines.push(`    - ${rel}`);
  }
  return lines.join("\n");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const summary = summarizeCatalog(COMMAND_CATALOG, options);
  process.stdout.write(formatSummary(summary) + "\n");

  const shouldRunMarkdown =
    options.target === "markdown" || options.target === "all";
  if (shouldRunMarkdown) {
    process.stdout.write("\n[markdown]\n");
    // Anchor projectRoot to the script's own repo-local location so
    // classification + write targets don't drift with the caller's CWD
    // (PR#212 review IA-2 / UF-DEP-ROOT).
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(scriptDir, "..");
    const result = deriveAllMarkdown(COMMAND_CATALOG, {
      dryRun: options.dryRun,
      projectRoot: repoRoot,
    });
    process.stdout.write(formatDeriveResult(result, options.dryRun) + "\n");
  }
}

// Use pathToFileURL (repo idiom, matches ~50 other entry scripts). It handles
// Windows drive letters, UNC paths, and URL-reserved characters (#, %) that
// a bare `new URL("file://" + path)` would mis-parse.
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
      `generate-command-catalog-derived: ${(err as Error).message}\n`,
    );
    process.exit(1);
  }
}
