// >>> GENERATED FROM CATALOG — do not edit; edit src/core-runtime/cli/command-catalog.ts instead. derive-hash=0342f42196b6e30536517f8ae56b1fd7c677cb5f8977a075f3a108aaa204c00b
/**
 * Preboot dispatcher — derived artifact (P1-3 emit; bin/onto routes preboot phase here via dispatch()).
 *
 * Owns MetaEntry handling inline (`--help` / `-h` / bare-`onto` and
 * `--version` / `-v`). Delegates other preboot PublicEntry to cli.ts
 * `main()`, which keeps its existing handler switch and bootstrap logic
 * (Q3(A) — handoff 20260425-phase-1-3-resume.md §5).
 *
 * Module load runs `assertPrebootDispatchDeriveHash()` (mirror of dispatcher.ts
 * §3.5 guard) so a stale preboot-dispatch.ts fails fast even if dispatcher.ts
 * itself is current. `ONTO_ALLOW_STALE_DISPATCHER=1` bypass mirrors dispatcher.
 *
 * Imports of cli.ts (`ONTO_HELP_TEXT`, `main`) are dynamic — preboot must
 * not pull cli.ts into the module load graph just to emit a help string
 * (avoids the dependency reversal flagged in P1-3 review UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT).
 *
 * To regenerate: `npm run generate:catalog -- --target=preboot-dispatch`.
 * Direct edits will be overwritten and fail the P1-4 CI drift check.
 */

import { computeTargetDeriveHash } from "./catalog-hash.js";
import { COMMAND_CATALOG } from "./command-catalog.js";
import {
  checkDeriveHash,
  formatBypassWarning,
  formatMismatchError,
} from "./derive-hash-guard.js";
import { readOntoVersion } from "../release-channel/release-channel.js";

const BARE_ONTO_SENTINEL = "<<bare>>";

const EXPECTED_DERIVE_HASH = "0342f42196b6e30536517f8ae56b1fd7c677cb5f8977a075f3a108aaa204c00b";
const DERIVE_SCHEMA_VERSION = "1";
const TARGET_ID = "preboot-dispatch";
const BYPASS_ENV_VAR = "ONTO_ALLOW_STALE_DISPATCHER";

/** Cli-backed preboot invocations (catalog-derived at emit time). */
const PREBOOT_PUBLIC_INVOCATIONS: ReadonlySet<string> = new Set([
  "config",
  "info",
  "install",
]);

function assertPrebootDispatchDeriveHash(): void {
  const actual = computeTargetDeriveHash(TARGET_ID, COMMAND_CATALOG, DERIVE_SCHEMA_VERSION);
  const result = checkDeriveHash({
    expected: EXPECTED_DERIVE_HASH,
    actual,
    env: process.env,
    bypassEnvVar: BYPASS_ENV_VAR,
  });
  if (result.kind === "ok") return;
  if (result.kind === "bypassed") {
    process.stderr.write(formatBypassWarning("preboot-dispatch.ts", BYPASS_ENV_VAR));
    return;
  }
  process.stderr.write(
    formatMismatchError({
      targetLabel: "preboot-dispatch.ts",
      expected: result.expected,
      actual: result.actual,
      regenCommand: "npm run generate:catalog -- --target=preboot-dispatch",
      bypassEnvVar: BYPASS_ENV_VAR,
    }),
  );
  process.exit(1);
}

assertPrebootDispatchDeriveHash();

export async function dispatchPreboot(
  invocation: string,
  argv: readonly string[],
): Promise<number> {
  if (
    invocation === "--help" ||
    invocation === "-h" ||
    invocation === BARE_ONTO_SENTINEL
  ) {
    // Dynamic import: preboot must not statically depend on cli.ts.
    const { ONTO_HELP_TEXT } = await import("../../cli.js");
    console.log(ONTO_HELP_TEXT);
    return 0;
  }
  if (invocation === "--version" || invocation === "-v") {
    const version = await readOntoVersion();
    console.log(`onto-core ${version}`);
    return 0;
  }
  if (PREBOOT_PUBLIC_INVOCATIONS.has(invocation)) {
    // Delegate to cli.ts main with the full forwarded argv (subcommand at front).
    const { main } = await import("../../cli.js");
    return main([invocation, ...argv]);
  }
  process.stderr.write(
    `[onto] preboot-dispatch: no handler for invocation "${invocation}".\n`,
  );
  return 1;
}
// <<< END GENERATED
