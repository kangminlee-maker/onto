// >>> GENERATED FROM CATALOG — do not edit; edit src/core-runtime/cli/command-catalog.ts instead. derive-hash=73dbf317a7178450e7b50b524a3e0abf2a27c6ab74e2872ee3da647984d347a2
/**
 * Preboot dispatcher — derived artifact (P2-A — RFC-1 §4.1.2 thin shim).
 *
 * Authority seat: this file = production single authority. catalog-derived
 * static META_DISPATCH_TABLE / PUBLIC_DISPATCH_TABLE baked-in. thin shim —
 * forwards to underlying `dispatchPrebootCore` (hand-written, catalog-independent).
 *
 * Module load runs `assertPrebootDispatchDeriveHash()` (mirror of dispatcher.ts
 * §3.5 guard) so a stale preboot-dispatch.ts fails fast even if dispatcher.ts
 * itself is current. `ONTO_ALLOW_STALE_DISPATCHER=1` bypass mirrors dispatcher.
 *
 * test seam: `dispatch-preboot-core.test.ts` 가 dispatchPrebootCore 직접 import
 * + bogus tables 주입 (non-authoritative test hook — RFC-1 §6.1.1).
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
import {
  dispatchPrebootCore,
  type MetaDispatchTable,
  type PrebootRouting,
  type PublicDispatchTable,
} from "./dispatch-preboot-core.js";

const EXPECTED_DERIVE_HASH = "73dbf317a7178450e7b50b524a3e0abf2a27c6ab74e2872ee3da647984d347a2";
const DERIVE_SCHEMA_VERSION = "2";
const TARGET_ID = "preboot-dispatch";
const BYPASS_ENV_VAR = "ONTO_ALLOW_STALE_DISPATCHER";

/** Static dispatch tables — catalog-derived at emit time. */
const META_DISPATCH_TABLE: MetaDispatchTable = {
    "help": {
      handler_module: "src/core-runtime/cli/meta-handlers.ts",
      handler_export: "onHelp",
    },
    "version": {
      handler_module: "src/core-runtime/cli/meta-handlers.ts",
      handler_export: "onVersion",
    },
  };

const PUBLIC_DISPATCH_TABLE: PublicDispatchTable = {
    "config": {
      handler_module: "src/cli.ts",
    },
    "info": {
      handler_module: "src/cli.ts",
    },
    "install": {
      handler_module: "src/cli.ts",
    },
  };

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

/**
 * Thin shim — forwards to dispatchPrebootCore with the static tables.
 * Production single authority seat (RFC-1 §4.1.2). signature mirrors core.
 */
export async function dispatchPreboot(
  routing: PrebootRouting,
  argv: readonly string[],
): Promise<number> {
  return dispatchPrebootCore(routing, argv, META_DISPATCH_TABLE, PUBLIC_DISPATCH_TABLE);
}
// <<< END GENERATED
