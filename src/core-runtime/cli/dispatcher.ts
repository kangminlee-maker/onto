// >>> GENERATED FROM CATALOG — do not edit; edit src/core-runtime/cli/command-catalog.ts instead. derive-hash=eaf20c87e3cd44683be6dcad4b353bf96965b0ffef4c90ae60f070c0533e04d4
/**
 * Command dispatcher — derived artifact (P1-2c emit-only; P1-3 wires bin/onto).
 *
 * To regenerate: `npm run generate:catalog -- --target=dispatcher`.
 * Direct edits will be overwritten and fail the P1-4 CI drift check.
 */

import { getNormalizedInvocationSet } from "./command-catalog-helpers.js";
import { COMMAND_CATALOG } from "./command-catalog.js";

const NORMALIZED = getNormalizedInvocationSet(COMMAND_CATALOG);

const BARE_ONTO_SENTINEL = "<<bare>>";

export async function dispatch(argv: readonly string[]): Promise<number> {
  const arg = argv[0] ?? BARE_ONTO_SENTINEL;
  const target = NORMALIZED.get(arg);
  if (target === undefined) {
    if (arg === BARE_ONTO_SENTINEL) {
      process.stderr.write(
        "No default command for bare `onto`. Run `onto --help` for the command list.\n",
      );
      return 1;
    }
    process.stderr.write(
      `Unknown subcommand: "${arg}". Run \`onto --help\` for the command list.\n`,
    );
    return 1;
  }
  // Phase dispatch + handler invocation lands in P1-3 (bin/onto integration).
  process.stderr.write(
    `Dispatcher reached "${arg}" but P1-3 handler wiring is not yet active.\n`,
  );
  return 1;
}
// <<< END GENERATED
