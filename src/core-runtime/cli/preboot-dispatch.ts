// >>> GENERATED FROM CATALOG — do not edit; edit src/core-runtime/cli/command-catalog.ts instead. derive-hash=0342f42196b6e30536517f8ae56b1fd7c677cb5f8977a075f3a108aaa204c00b
/**
 * Preboot dispatcher — derived artifact (P1-3 emit; bin/onto routes preboot phase here via dispatch()).
 *
 * Owns MetaEntry handling inline (`--help` / `-h` / bare-`onto` and
 * `--version` / `-v`). Delegates other preboot PublicEntry to cli.ts
 * `main()`, which keeps its existing handler switch and bootstrap logic
 * (Q3(A) — handoff 20260425-phase-1-3-resume.md §5).
 *
 * To regenerate: `npm run generate:catalog -- --target=preboot-dispatch`.
 * Direct edits will be overwritten and fail the P1-4 CI drift check.
 */

import { ONTO_HELP_TEXT } from "../../cli.js";
import { readOntoVersion } from "../release-channel/release-channel.js";

const BARE_ONTO_SENTINEL = "<<bare>>";

/** Cli-backed preboot invocations (catalog-derived at emit time). */
const PREBOOT_PUBLIC_INVOCATIONS: ReadonlySet<string> = new Set([
  "config",
  "info",
  "install",
]);

export async function dispatchPreboot(
  invocation: string,
  argv: readonly string[],
): Promise<number> {
  if (
    invocation === "--help" ||
    invocation === "-h" ||
    invocation === BARE_ONTO_SENTINEL
  ) {
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
