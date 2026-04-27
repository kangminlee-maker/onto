/**
 * Preboot dispatch derive — P2-A (RFC-1 §4.1.2 — thin shim emit).
 *
 * Input:  catalog (`command-catalog.ts`).
 * Output: `src/core-runtime/cli/preboot-dispatch.ts` — entire file generated,
 *         wrapped in TS segment markers.
 *
 * Authority seat split (RFC-1 §4.1.2):
 *   - **Production seat (single authority)**: this generated file — catalog-derived,
 *     static emitted META_DISPATCH_TABLE / PUBLIC_DISPATCH_TABLE baked-in.
 *     thin shim — supplied tables 와 함께 underlying catalog-independent
 *     function (`dispatchPrebootCore`) 호출.
 *   - **Underlying logic seat**: hand-written `src/core-runtime/cli/dispatch-preboot-core.ts`.
 *     test seam 이 직접 import + bogus tables 주입 (non-authoritative).
 *
 * Module load runs `assertPrebootDispatchDeriveHash()` (mirror of dispatcher.ts
 * §3.5 guard) so a stale preboot-dispatch.ts fails fast even if dispatcher.ts
 * itself is current. `ONTO_ALLOW_STALE_DISPATCHER=1` bypass mirrors dispatcher.
 *
 * Authority of drift detection (P1-4): the canonical gate is the
 * `determinism-regression` CI workflow (`check:catalog-drift` script over all
 * derive targets). The runtime entry guard here is defense-in-depth for
 * unsynced local working trees.
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
  MetaEntry,
} from "../../src/core-runtime/cli/command-catalog.js";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import {
  extractTypeScriptSegment,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

/** Bumped P2-A: thin shim emit + catalog-driven tables (was hardcoded if-branches). */
export const DERIVE_SCHEMA_VERSION = "2";

const TARGET_ID = "preboot-dispatch";
const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";
const EMISSION_PATH = "src/core-runtime/cli/preboot-dispatch.ts";

type DispatchEntry = { handler_module: string; handler_export?: string };

/**
 * Build META_DISPATCH_TABLE from catalog: every MetaEntry's `cli_dispatch`
 * indexed by `name`. Sorted for deterministic emit byte order.
 */
export function buildMetaDispatchTable(
  catalog: CommandCatalog,
): Record<string, DispatchEntry> {
  const out: Record<string, DispatchEntry> = {};
  const metas: MetaEntry[] = [];
  for (const entry of catalog.entries) {
    if (entry.kind !== "meta") continue;
    metas.push(entry);
  }
  metas.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const meta of metas) {
    out[meta.name] = meta.cli_dispatch;
  }
  return out;
}

/**
 * Build PUBLIC_DISPATCH_TABLE from catalog: every preboot-phase PublicEntry's
 * CliRealization, indexed by canonical cli `invocation`. Sorted for
 * deterministic emit byte order. Note — alias keys are NOT registered (per
 * RFC-1 §4.2.3 single canonical lookup seat; aliases are resolved by
 * dispatcher-side canonical conversion via NORMALIZED, P2-B).
 */
export function buildPublicDispatchTable(
  catalog: CommandCatalog,
): Record<string, DispatchEntry> {
  const out: Record<string, DispatchEntry> = {};
  const rows: Array<{ invocation: string; dispatch: DispatchEntry }> = [];
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const pub = entry as PublicEntry;
    if (pub.phase !== "preboot") continue;
    for (const r of pub.realizations) {
      if (r.kind !== "cli") continue;
      rows.push({ invocation: r.invocation, dispatch: r.cli_dispatch });
    }
  }
  rows.sort((a, b) =>
    a.invocation < b.invocation ? -1 : a.invocation > b.invocation ? 1 : 0,
  );
  for (const row of rows) out[row.invocation] = row.dispatch;
  return out;
}

/** Format a dispatch table as a deterministic TS literal. */
function formatTableLiteral(table: Record<string, DispatchEntry>): string {
  const keys = Object.keys(table).sort();
  if (keys.length === 0) return "{}";
  const lines: string[] = ["{"];
  for (const key of keys) {
    const entry = table[key]!;
    const fields: string[] = [
      `      handler_module: ${JSON.stringify(entry.handler_module)},`,
    ];
    if (entry.handler_export !== undefined) {
      fields.push(`      handler_export: ${JSON.stringify(entry.handler_export)},`);
    }
    lines.push(`    ${JSON.stringify(key)}: {`);
    for (const f of fields) lines.push(f);
    lines.push("    },");
  }
  lines.push("  }");
  return lines.join("\n");
}

/** Render the body of preboot-dispatch.ts (no markers; caller wraps). */
export function renderPrebootDispatchBody(
  catalog: CommandCatalog,
  hash: string,
): string {
  const metaTable = buildMetaDispatchTable(catalog);
  const publicTable = buildPublicDispatchTable(catalog);
  const metaLiteral = formatTableLiteral(metaTable);
  const publicLiteral = formatTableLiteral(publicTable);

  return `/**
 * Preboot dispatcher — derived artifact (P2-A — RFC-1 §4.1.2 thin shim).
 *
 * Authority seat: this file = production single authority. catalog-derived
 * static META_DISPATCH_TABLE / PUBLIC_DISPATCH_TABLE baked-in. thin shim —
 * forwards to underlying \`dispatchPrebootCore\` (hand-written, catalog-independent).
 *
 * Module load runs \`assertPrebootDispatchDeriveHash()\` (mirror of dispatcher.ts
 * §3.5 guard) so a stale preboot-dispatch.ts fails fast even if dispatcher.ts
 * itself is current. \`ONTO_ALLOW_STALE_DISPATCHER=1\` bypass mirrors dispatcher.
 *
 * test seam: \`dispatch-preboot-core.test.ts\` 가 dispatchPrebootCore 직접 import
 * + bogus tables 주입 (non-authoritative test hook — RFC-1 §6.1.1).
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
import {
  dispatchPrebootCore,
  type MetaDispatchTable,
  type PrebootRouting,
  type PublicDispatchTable,
} from "./dispatch-preboot-core.js";

const EXPECTED_DERIVE_HASH = "${hash}";
const DERIVE_SCHEMA_VERSION = "${DERIVE_SCHEMA_VERSION}";
const TARGET_ID = "${TARGET_ID}";
const BYPASS_ENV_VAR = "ONTO_ALLOW_STALE_DISPATCHER";

/** Static dispatch tables — catalog-derived at emit time. */
const META_DISPATCH_TABLE: MetaDispatchTable = ${metaLiteral};

const PUBLIC_DISPATCH_TABLE: PublicDispatchTable = ${publicLiteral};

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
