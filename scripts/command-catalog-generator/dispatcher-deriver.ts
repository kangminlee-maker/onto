/**
 * Dispatcher derive — P1-2c.
 *
 * Input:  catalog (`command-catalog.ts`).
 * Output: `src/core-runtime/cli/dispatcher.ts` — entire file is generated,
 *         wrapped in TS segment markers (start at line 1, end at last line).
 *
 * P1-2c authority status: emit only — no caller imports this file. P1-3
 * attaches `bin/onto` to the generated `dispatch()` export.
 *
 * Steady-state: `npm run generate:catalog -- --target=dispatcher`.
 * Bootstrap (one-time): UPDATE_SNAPSHOT=1 path identical to markdown deriver
 * (plan §D18 / §D27 reused).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CommandCatalog } from "../../src/core-runtime/cli/command-catalog.js";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import {
  extractTypeScriptSegment,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

/** Bumped when dispatcher emit rules change. Cascade-invalidates the marker. */
export const DERIVE_SCHEMA_VERSION = "1";

const TARGET_ID = "dispatcher";
const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";
const EMISSION_PATH = "src/core-runtime/cli/dispatcher.ts";

/**
 * Body of the generated dispatcher.ts (no markers — those are added by
 * `wrapTypeScriptSegmentMarker`). The body is identical across catalog
 * snapshots; the per-snapshot variation lives entirely in the marker hash.
 *
 * The body's behavior is intentionally minimal in P1-2c: it consults the
 * NormalizedInvocationSet only to distinguish known/unknown invocations.
 * P1-3 will replace the placeholder branch with phase dispatch + handler
 * invocation (design §8.1, §8.4).
 */
const DISPATCHER_BODY = `/**
 * Command dispatcher — derived artifact (P1-2c emit-only; P1-3 wires bin/onto).
 *
 * To regenerate: \`npm run generate:catalog -- --target=dispatcher\`.
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
        "No default command for bare \`onto\`. Run \`onto --help\` for the command list.\\n",
      );
      return 1;
    }
    process.stderr.write(
      \`Unknown subcommand: "\${arg}". Run \\\`onto --help\\\` for the command list.\\n\`,
    );
    return 1;
  }
  // Phase dispatch + handler invocation lands in P1-3 (bin/onto integration).
  process.stderr.write(
    \`Dispatcher reached "\${arg}" but P1-3 handler wiring is not yet active.\\n\`,
  );
  return 1;
}
`;

export function deriveDispatcher(catalog: CommandCatalog): string {
  const hash = computeTargetDeriveHash(TARGET_ID, catalog, DERIVE_SCHEMA_VERSION);
  return wrapTypeScriptSegmentMarker(DISPATCHER_BODY, MARKER_SOURCE_REF, hash);
}

export type DeriveDispatcherOptions = {
  dryRun?: boolean;
  snapshotMode?: boolean;
  projectRoot?: string;
};

export type DeriveDispatcherResult = {
  written: boolean;
  skippedDryRun: boolean;
  emissionPath: string;
};

/**
 * Bounded path (mirrors markdown-deriver §D22 v9 structure):
 *   1. Compute body + wrap with marker.
 *   2. Verify managed-tree boundary at the emission path:
 *        - If the file is absent, ACCEPT (deriver creates it).
 *        - If the file exists with a TS segment marker, ACCEPT (overwrite).
 *        - If the file exists WITHOUT a marker, fail closed unless
 *          `snapshotMode: true` (bootstrap escape gated by UPDATE_SNAPSHOT=1).
 *   3. Write atomically (or skip when `dryRun`).
 */
export function deriveAllDispatcher(
  catalog: CommandCatalog,
  opts: DeriveDispatcherOptions = {},
): DeriveDispatcherResult {
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
  const content = deriveDispatcher(catalog);

  // Managed-tree boundary at the single emission path.
  if (existsSync(absPath)) {
    const existing = readFileSync(absPath, "utf8");
    const marker = extractTypeScriptSegment(existing);
    if (marker === null && !snapshotMode) {
      throw new Error(
        `Handwritten content at generator-managed path "${EMISSION_PATH}" ` +
          `(no TS segment marker found). The deriver would overwrite it. ` +
          `Bootstrap this state via UPDATE_SNAPSHOT=1 npx vitest run ` +
          `scripts/command-catalog-generator/dispatcher-deriver.test.ts. ` +
          `plan §D13 case (ii), §D18.`,
      );
    }
  }

  if (dryRun) {
    return { written: false, skippedDryRun: true, emissionPath: EMISSION_PATH };
  }

  // Skip write when bytes are unchanged (idempotency + clean mtime).
  if (existsSync(absPath) && readFileSync(absPath, "utf8") === content) {
    return { written: false, skippedDryRun: false, emissionPath: EMISSION_PATH };
  }

  const parentDir = path.dirname(absPath);
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  writeFileSync(absPath, content, "utf8");
  return { written: true, skippedDryRun: false, emissionPath: EMISSION_PATH };
}

export const DISPATCHER_EMISSION_PATH = EMISSION_PATH;
