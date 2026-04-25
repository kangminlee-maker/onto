/**
 * Preboot dispatch derive — P1-3.
 *
 * Input:  catalog (`command-catalog.ts`).
 * Output: `src/core-runtime/cli/preboot-dispatch.ts` — entire file generated,
 *         wrapped in TS segment markers.
 *
 * What preboot-dispatch.ts handles:
 *   - MetaEntry invocations (`--help`/`-h`/bare-`onto`, `--version`/`-v`)
 *     are owned inline (print ONTO_HELP_TEXT / version string).
 *   - PublicEntry with `phase: "preboot"` and a CliRealization (info, config,
 *     install) delegate to `cli.ts`'s `main()` so the existing handler
 *     surface stays untouched in P1-3 (Q3(A) decision in handoff).
 *   - `repair_path: true` entries: bootstrap is each handler's responsibility
 *     today (cli.ts main switch handles the repair flow internally), so the
 *     deriver does not emit additional bootstrap glue.
 *
 * The set of preboot-public invocations is computed from the catalog at
 * derive time and embedded as a constant in the emitted body. Catalog
 * change → marker hash change → re-emit required.
 *
 * Steady-state: `npm run generate:catalog -- --target=preboot-dispatch`.
 * Bootstrap: UPDATE_SNAPSHOT=1 vitest path identical to dispatcher-deriver
 * (plan §D18 / §D27 reused).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CommandCatalog,
  PublicEntry,
} from "../../src/core-runtime/cli/command-catalog.js";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import {
  extractTypeScriptSegment,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

export const DERIVE_SCHEMA_VERSION = "1";

const TARGET_ID = "preboot-dispatch";
const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";
const EMISSION_PATH = "src/core-runtime/cli/preboot-dispatch.ts";

/**
 * Collect cli-backed preboot invocations from the catalog (PublicEntry with
 * phase=preboot AND a CliRealization). Returns sorted list for determinism.
 */
export function collectPrebootCliInvocations(
  catalog: CommandCatalog,
): string[] {
  const out: string[] = [];
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const pub = entry as PublicEntry;
    if (pub.phase !== "preboot") continue;
    for (const r of pub.realizations) {
      if (r.kind === "cli") out.push(r.invocation);
    }
  }
  return Array.from(new Set(out)).sort();
}

/** Render the body of preboot-dispatch.ts (no markers; caller wraps). */
export function renderPrebootDispatchBody(catalog: CommandCatalog, hash: string): string {
  const prebootInvocations = collectPrebootCliInvocations(catalog);
  const literalArray = prebootInvocations
    .map((s) => `  ${JSON.stringify(s)},`)
    .join("\n");

  return `/**
 * Preboot dispatcher — derived artifact (P1-3 emit; bin/onto routes preboot phase here via dispatch()).
 *
 * Owns MetaEntry handling inline (\`--help\` / \`-h\` / bare-\`onto\` and
 * \`--version\` / \`-v\`). Delegates other preboot PublicEntry to cli.ts
 * \`main()\`, which keeps its existing handler switch and bootstrap logic
 * (Q3(A) — handoff 20260425-phase-1-3-resume.md §5).
 *
 * Module load runs \`assertPrebootDispatchDeriveHash()\` (mirror of dispatcher.ts
 * §3.5 guard) so a stale preboot-dispatch.ts fails fast even if dispatcher.ts
 * itself is current. \`ONTO_ALLOW_STALE_DISPATCHER=1\` bypass mirrors dispatcher.
 *
 * Imports of cli.ts (\`ONTO_HELP_TEXT\`, \`main\`) are dynamic — preboot must
 * not pull cli.ts into the module load graph just to emit a help string
 * (avoids the dependency reversal flagged in P1-3 review UF-DEPENDENCY-PREBOOT-REVERSE-IMPORT).
 *
 * To regenerate: \`npm run generate:catalog -- --target=preboot-dispatch\`.
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

const EXPECTED_DERIVE_HASH = "${hash}";
const DERIVE_SCHEMA_VERSION = "${DERIVE_SCHEMA_VERSION}";
const TARGET_ID = "${TARGET_ID}";
const BYPASS_ENV_VAR = "ONTO_ALLOW_STALE_DISPATCHER";

/** Cli-backed preboot invocations (catalog-derived at emit time). */
const PREBOOT_PUBLIC_INVOCATIONS: ReadonlySet<string> = new Set([
${literalArray}
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
    console.log(\`onto-core \${version}\`);
    return 0;
  }
  if (PREBOOT_PUBLIC_INVOCATIONS.has(invocation)) {
    // Delegate to cli.ts main with the full forwarded argv (subcommand at front).
    const { main } = await import("../../cli.js");
    return main([invocation, ...argv]);
  }
  process.stderr.write(
    \`[onto] preboot-dispatch: no handler for invocation "\${invocation}".\\n\`,
  );
  return 1;
}
`;
}

export function derivePrebootDispatch(catalog: CommandCatalog): string {
  const hash = computeTargetDeriveHash(TARGET_ID, catalog, DERIVE_SCHEMA_VERSION);
  const body = renderPrebootDispatchBody(catalog, hash);
  return wrapTypeScriptSegmentMarker(body, MARKER_SOURCE_REF, hash);
}

export type DerivePrebootDispatchOptions = {
  dryRun?: boolean;
  snapshotMode?: boolean;
  projectRoot?: string;
};

export type DerivePrebootDispatchResult = {
  written: boolean;
  skippedDryRun: boolean;
  emissionPath: string;
};

export function deriveAllPrebootDispatch(
  catalog: CommandCatalog,
  opts: DerivePrebootDispatchOptions = {},
): DerivePrebootDispatchResult {
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
  const content = derivePrebootDispatch(catalog);

  if (existsSync(absPath)) {
    const existing = readFileSync(absPath, "utf8");
    const marker = extractTypeScriptSegment(existing);
    if (marker === null && !snapshotMode) {
      throw new Error(
        `Handwritten content at generator-managed path "${EMISSION_PATH}" ` +
          `(no TS segment marker found). The deriver would overwrite it. ` +
          `Bootstrap this state via UPDATE_SNAPSHOT=1 npx vitest run ` +
          `scripts/command-catalog-generator/preboot-dispatch-deriver.test.ts. ` +
          `plan §D13 case (ii), §D18.`,
      );
    }
  }

  if (dryRun) {
    return { written: false, skippedDryRun: true, emissionPath: EMISSION_PATH };
  }

  if (existsSync(absPath) && readFileSync(absPath, "utf8") === content) {
    return { written: false, skippedDryRun: false, emissionPath: EMISSION_PATH };
  }

  const parentDir = path.dirname(absPath);
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  writeFileSync(absPath, content, "utf8");
  return { written: true, skippedDryRun: false, emissionPath: EMISSION_PATH };
}

export const PREBOOT_DISPATCH_EMISSION_PATH = EMISSION_PATH;
