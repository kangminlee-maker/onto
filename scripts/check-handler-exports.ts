#!/usr/bin/env tsx
/**
 * handler_export canonical gate — Phase 2 P2-A (RFC-1 §6.1 defense stack).
 *
 * Design authority:
 *   development-records/evolve/20260427-catalog-runtime-projection-closure.md
 *   §6.1 (defense stack hierarchy) + §7.1 (risk row 2)
 *
 * Purpose: read-only verification that every catalog `cli_dispatch` entry
 * (PublicEntry CliRealization + MetaEntry) points to a real handler — the
 * `handler_module` file exists, and the named `handler_export` (or default
 * `main`) is a function.
 *
 * Authority position: **canonical gate** in the 3-layer defense stack:
 *   - Layer 0 (canonical gate, this script): build-time fail-close in CI.
 *     PR with bogus handler_export cannot land on main.
 *   - Layer 1 (defense-in-depth): `dispatch-preboot-core.test.ts` smoke
 *     negative case — direct call to `dispatchPrebootCore` with bogus
 *     fixture tables verifies the runtime guard message.
 *   - Layer 2 (defense-in-depth): `dispatchPrebootCore` runtime
 *     `typeof handler !== "function"` guard — first invocation fail-fast.
 *
 * The script must run BEFORE any test / smoke that depends on production
 * dispatch (so CI catches drift before the more expensive paths). Called
 * from `package.json:scripts:check:handler-exports`.
 *
 * Why NOT in `validateCatalog`: re-introducing handler dynamic-import into
 * catalog module load violates the P1-3 dependency invariant
 * (UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT). The catalog must remain
 * importable without pulling cli.ts / handler modules into the load graph.
 *
 * Build/lint layer (design §4.2): not a RuntimeScriptEntry. The
 * `check:handler-exports` package script is registered in
 * `EXCLUDED_PACKAGE_SCRIPTS` so the package-scripts deriver does not flag
 * it as orphan.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
import type {
  CommandCatalog,
  CliRealization,
} from "../src/core-runtime/cli/command-catalog.js";

type HandlerRef = {
  source: string; // e.g., 'MetaEntry "help"' or 'PublicEntry "info" cli realization'
  handler_module: string;
  handler_export: string; // resolved (default "main")
};

type CheckIssue =
  | { kind: "module-not-found"; ref: HandlerRef; absPath: string }
  | { kind: "import-error"; ref: HandlerRef; message: string }
  | { kind: "export-missing"; ref: HandlerRef; availableExports: string[] }
  | { kind: "export-not-function"; ref: HandlerRef; actualType: string };

function collectHandlerRefs(catalog: CommandCatalog): HandlerRef[] {
  const refs: HandlerRef[] = [];
  for (const entry of catalog.entries) {
    if (entry.kind === "meta") {
      const exp = entry.cli_dispatch.handler_export ?? "main";
      refs.push({
        source: `MetaEntry "${entry.name}"`,
        handler_module: entry.cli_dispatch.handler_module,
        handler_export: exp,
      });
    } else if (entry.kind === "public") {
      for (const r of entry.realizations) {
        if (r.kind !== "cli") continue;
        const cli = r as CliRealization;
        const exp = cli.cli_dispatch.handler_export ?? "main";
        refs.push({
          source: `PublicEntry "${entry.identity}" cli realization`,
          handler_module: cli.cli_dispatch.handler_module,
          handler_export: exp,
        });
      }
    }
    // RuntimeScriptEntry has no cli_dispatch — out of scope.
  }
  return refs;
}

async function checkRef(
  ref: HandlerRef,
  repoRoot: string,
): Promise<CheckIssue | null> {
  // Build-time path resolution: catalog declares installation-internal
  // path (e.g., "src/cli.ts"). At build time, repoRoot IS the installation
  // root (we're running from the source tree). No dev/prod mapping needed
  // because we're checking the dev source paths exist.
  const absPath = path.resolve(repoRoot, ref.handler_module);
  if (!existsSync(absPath)) {
    return { kind: "module-not-found", ref, absPath };
  }
  // Dynamic import via file:// URL. We're loading the actual source — this
  // is a build-time check that exercises the same import chain as the
  // runtime. It pulls cli.ts into THIS process, but this script is NOT
  // catalog-load-time; it's a separate build-time tool, so the
  // UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT invariant is preserved.
  let mod: Record<string, unknown>;
  try {
    mod = (await import(/* @vite-ignore */ pathToFileURL(absPath).href)) as Record<
      string,
      unknown
    >;
  } catch (err) {
    return {
      kind: "import-error",
      ref,
      message: err instanceof Error ? err.message : String(err),
    };
  }
  if (!(ref.handler_export in mod)) {
    return {
      kind: "export-missing",
      ref,
      availableExports: Object.keys(mod).sort(),
    };
  }
  const value = mod[ref.handler_export];
  if (typeof value !== "function") {
    return { kind: "export-not-function", ref, actualType: typeof value };
  }
  return null;
}

function formatIssue(issue: CheckIssue): string {
  const head = `[${issue.ref.source}] ${issue.ref.handler_module}#${issue.ref.handler_export}`;
  switch (issue.kind) {
    case "module-not-found":
      return `${head}\n  module-not-found: ${issue.absPath} does not exist`;
    case "import-error":
      return `${head}\n  import-error: ${issue.message}`;
    case "export-missing":
      return (
        `${head}\n  export-missing: "${issue.ref.handler_export}" not found.\n` +
        `  available exports: ${issue.availableExports.join(", ") || "(none)"}`
      );
    case "export-not-function":
      return `${head}\n  export-not-function: typeof = ${issue.actualType}`;
  }
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");

  const refs = collectHandlerRefs(COMMAND_CATALOG);
  const issues: CheckIssue[] = [];
  for (const ref of refs) {
    const issue = await checkRef(ref, repoRoot);
    if (issue !== null) issues.push(issue);
  }

  if (issues.length === 0) {
    process.stdout.write(
      `[handler-exports] all ${refs.length} handler reference(s) verified — module exists, export is function.\n`,
    );
    return;
  }

  process.stderr.write(
    `[handler-exports] ${issues.length} issue(s) across ${refs.length} reference(s):\n\n`,
  );
  for (const issue of issues) {
    process.stderr.write(formatIssue(issue) + "\n\n");
  }
  process.stderr.write(
    `Resolution: fix the catalog's cli_dispatch entry OR add the missing export to the handler module, then commit.\n`,
  );
  process.exit(1);
}

const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(
      `check-handler-exports: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}

export { collectHandlerRefs, checkRef };
export type { HandlerRef, CheckIssue };
