// >>> GENERATED FROM CATALOG — do not edit; edit src/core-runtime/cli/command-catalog.ts instead. derive-hash=eaf20c87e3cd44683be6dcad4b353bf96965b0ffef4c90ae60f070c0533e04d4
/**
 * Command dispatcher — derived artifact (P1-3 catalog-derived runtime authority).
 *
 * `bin/onto` imports `dispatch()` and forwards argv. The dispatcher routes
 * by phase: preboot invocations go to preboot-dispatch.ts (catalog-derived),
 * post_boot invocations delegate to cli.ts main() (legacy handler switch
 * preserved through P1-3 — Q3(A) decision).
 *
 * Module load also runs `assertCatalogHash()` (Activation Determinism §3.5):
 * recomputes the whole-catalog derive hash and compares against the marker
 * hash. Mismatch fails fast, unless `ONTO_ALLOW_STALE_DISPATCHER=1` bypasses.
 *
 * To regenerate: `npm run generate:catalog -- --target=dispatcher`.
 * Direct edits will be overwritten and fail the P1-4 CI drift check.
 */

import { pathToFileURL } from "node:url";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import { getNormalizedInvocationSet } from "./command-catalog-helpers.js";
import { COMMAND_CATALOG } from "./command-catalog.js";

const NORMALIZED = getNormalizedInvocationSet(COMMAND_CATALOG);
const BARE_ONTO_SENTINEL = "<<bare>>";

const EXPECTED_DERIVE_HASH = "eaf20c87e3cd44683be6dcad4b353bf96965b0ffef4c90ae60f070c0533e04d4";
const DERIVE_SCHEMA_VERSION = "1";
const TARGET_ID = "dispatcher";

const PHASE_MAP: Readonly<Record<string, "preboot" | "post_boot">> = {
  "--help": "preboot",
  "--version": "preboot",
  "-h": "preboot",
  "-v": "preboot",
  "build": "post_boot",
  "config": "preboot",
  "coordinator": "post_boot",
  "evolve": "post_boot",
  "govern": "post_boot",
  "health": "post_boot",
  "info": "preboot",
  "install": "preboot",
  "migrate-session-roots": "post_boot",
  "promote": "post_boot",
  "reclassify-insights": "post_boot",
  "reconstruct": "post_boot",
  "review": "post_boot"
};

function assertCatalogHash(): void {
  const actual = computeTargetDeriveHash(TARGET_ID, COMMAND_CATALOG, DERIVE_SCHEMA_VERSION);
  if (actual === EXPECTED_DERIVE_HASH) return;
  if (process.env.ONTO_ALLOW_STALE_DISPATCHER === "1") {
    process.stderr.write(
      "[onto] WARNING: dispatcher.ts derive-hash mismatch — bypassed via ONTO_ALLOW_STALE_DISPATCHER=1.\n",
    );
    return;
  }
  process.stderr.write(
    "[onto] dispatcher.ts derive-hash mismatch (catalog edit not regenerated).\n" +
      `  expected (marker): ${EXPECTED_DERIVE_HASH}\n` +
      `  actual   (catalog): ${actual}\n` +
      "Resolution: npm run generate:catalog -- --target=dispatcher\n" +
      "Bypass for dev workflow: ONTO_ALLOW_STALE_DISPATCHER=1\n",
  );
  process.exit(1);
}

assertCatalogHash();

export async function dispatch(argv: readonly string[]): Promise<number> {
  const arg = argv[0] ?? BARE_ONTO_SENTINEL;
  const target = NORMALIZED.get(arg);
  if (target === undefined) {
    if (arg === BARE_ONTO_SENTINEL) {
      // No default_for=bare_onto in the catalog — fall through to preboot help.
      const { dispatchPreboot } = await import("./preboot-dispatch.js");
      return dispatchPreboot(BARE_ONTO_SENTINEL, argv);
    }
    process.stderr.write(
      `[onto] Unknown subcommand: "${arg}". Run \`onto --help\` for the command list.\n`,
    );
    return 1;
  }
  // MetaEntry (help/version) is always preboot by schema; route directly.
  // For bare-onto sentinel we forward the full argv (already empty by definition).
  if (target.entry_kind === "meta") {
    const { dispatchPreboot } = await import("./preboot-dispatch.js");
    return dispatchPreboot(arg, arg === BARE_ONTO_SENTINEL ? argv : argv.slice(1));
  }
  // PublicEntry — phase derived from PHASE_MAP at emit time.
  const phase = PHASE_MAP[arg] ?? "post_boot";
  if (phase === "preboot") {
    const { dispatchPreboot } = await import("./preboot-dispatch.js");
    return dispatchPreboot(arg, argv.slice(1));
  }
  // post_boot — delegate to cli.ts main with full argv (subcommand at front).
  const { main } = await import("../../cli.js");
  return main(argv);
}

// Auto-run when dispatcher.ts is the process entry (matches cli.ts gating).
// bin/onto in dev mode spawns `tsx dispatcher.ts ...` so this fires; in prod
// bin/onto imports dist/dispatcher.js and calls dispatch() explicitly, where
// import.meta.url !== process.argv[1] → auto-run skipped.
const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  dispatch(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (err: unknown) => {
      process.stderr.write(
        `[onto] dispatcher: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(1);
    },
  );
}
// <<< END GENERATED
