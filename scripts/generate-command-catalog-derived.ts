#!/usr/bin/env tsx
/**
 * Command Catalog Generator — Phase 1 P1-2a entry script.
 *
 * Design authority:
 *   development-records/evolve/20260423-phase-1-catalog-ssot-design.md §7
 *
 * Status (P1-2a): infrastructure only. This script loads the catalog, hashes
 * it, prints a summary, and exits. Actual derive logic (markdown, dispatcher,
 * cli.ts help segment, package.json scripts) is P1-2b and P1-2c.
 *
 * CLI surface (already stable for P1-2b/c — only new targets get added):
 *
 *   --dry-run           Do not write any files. Always honored by emitters.
 *   --target=<target>   One of: markdown | dispatcher | help | scripts | all.
 *                       Default: all. P1-2a ignores the value (no emitters
 *                       implemented yet) but validates the option so future
 *                       callers do not need to relearn the flag surface.
 *
 * This script lives in the build/lint layer (design §4.2) and is therefore
 * NOT registered as a RuntimeScriptEntry in the catalog.
 */

import { pathToFileURL } from "node:url";
import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
import { getNormalizedInvocationSet } from "../src/core-runtime/cli/command-catalog-helpers.js";
import type { CommandCatalog } from "../src/core-runtime/cli/command-catalog.js";
import { computeCatalogHash } from "./command-catalog-generator/catalog-hash.js";
import { listAvailableTemplates } from "./command-catalog-generator/template-loader.js";

type Target = "markdown" | "dispatcher" | "help" | "scripts" | "all";
const VALID_TARGETS: readonly Target[] = [
  "markdown",
  "dispatcher",
  "help",
  "scripts",
  "all",
];

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

export type CatalogSummary = {
  catalogHash: string;
  entryCounts: { public: number; runtime_script: number; meta: number };
  normalizedInvocationCount: number;
  availableTemplateCount: number;
  target: Target;
  dryRun: boolean;
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
  };
}

export function formatSummary(s: CatalogSummary): string {
  return [
    "command-catalog generator — P1-2a summary",
    `  catalog hash        : ${s.catalogHash}`,
    `  entries             : ${s.entryCounts.public} public · ` +
      `${s.entryCounts.runtime_script} runtime_script · ${s.entryCounts.meta} meta`,
    `  normalized set size : ${s.normalizedInvocationCount}`,
    `  templates available : ${s.availableTemplateCount}`,
    `  target              : ${s.target}`,
    `  dry-run             : ${s.dryRun ? "yes" : "no"}`,
    "",
    "P1-2a: no derive output is written. Emitters land in P1-2b/c.",
  ].join("\n");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const summary = summarizeCatalog(COMMAND_CATALOG, options);
  process.stdout.write(formatSummary(summary) + "\n");
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
