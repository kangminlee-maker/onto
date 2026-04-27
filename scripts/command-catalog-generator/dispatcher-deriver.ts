/**
 * Dispatcher derive — P1-3.
 *
 * Input:  catalog (`command-catalog.ts`).
 * Output: `src/core-runtime/cli/dispatcher.ts` — entire file is generated,
 *         wrapped in TS segment markers (start at line 1, end at last line).
 *
 * P1-3 authority status: **CLI subcommand dispatch authority**. Scope is
 * the `bin/onto <subcommand>` entry path. `bin/onto` imports `dispatch()`
 * and routes by phase:
 *   - preboot → preboot-dispatch.ts (also catalog-derived)
 *   - post_boot → cli.ts main() (legacy switch table — Q3(A) handoff
 *     20260425-phase-1-3-resume.md §5)
 *
 * Slash invocations and `npm run` script invocations consume the catalog
 * as data (markdown derive / package.json scripts) but do not route
 * through this dispatcher — see command-catalog.ts header for the full
 * authority-scope statement.
 *
 * The emitted body embeds an `assertDispatcherDeriveHash()` entry guard
 * (Activation Determinism Redesign §3.5) — at module-load time it recomputes
 * the dispatcher's target-scoped derive hash via `computeTargetDeriveHash`
 * and compares against the marker hash. Mismatch → stderr + exit 1, unless
 * `ONTO_ALLOW_STALE_DISPATCHER=1` is set (Q1(C) — bypass for dev workflows
 * mid-edit). The decision logic itself lives in `derive-hash-guard.ts`.
 *
 * Authority of drift detection (P1-4): the canonical gate is the
 * `determinism-regression` CI workflow which runs `npm run check:catalog-drift`
 * over all 5 derive targets and never honors the bypass env var. The runtime
 * entry guard here is defense-in-depth for `bin/onto` invocations against
 * an unsynced local working tree.
 *
 * Steady-state: `npm run generate:catalog -- --target=dispatcher`.
 * Bootstrap: UPDATE_SNAPSHOT=1 path identical to other emitters.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CommandCatalog,
  PublicEntry,
  CliRealization,
} from "../../src/core-runtime/cli/command-catalog.js";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import {
  extractTypeScriptSegment,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

/** Bumped when dispatcher emit rules change. Cascade-invalidates the marker.
 * P2-A: 1→2 — meta routing forwards `{ meta_name: target.name }`,
 * public preboot routing forwards `{ public_invocation: arg }` (Contract A discriminator).
 * Dead `target === undefined && arg === BARE_ONTO_SENTINEL` branch removed.
 * P2-B: 2→3 — canonical lookup. cli target 의 `target.canonical_cli_invocation`
 * 으로 PHASE_MAP 조회 + canonical 보존 forwarding (alias 도 동일 path —
 * NORMALIZED 가 alias key 에 canonical 매핑). PHASE_MAP / PUBLIC_DISPATCH_TABLE
 * 알리아스 미등록 (single canonical lookup seat — RFC-1 §4.2.3, §4.2.4).
 */
export const DERIVE_SCHEMA_VERSION = "3";

const TARGET_ID = "dispatcher";
const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";
const EMISSION_PATH = "src/core-runtime/cli/dispatcher.ts";

/**
 * Compute the invocation → phase map at deriver time. Public CLI invocations
 * only — meta entries are deliberately excluded because the dispatcher
 * routes them through the `target.entry_kind === "meta"` short-circuit
 * before consulting `PHASE_MAP`. Including them duplicated the routing
 * decision (P1-3 review UF-CONCISENESS-PHASE-MAP-REDUNDANT).
 *
 * Slash and patterned_slash invocations live in `NORMALIZED` but are
 * unreachable via `bin/onto`, so they are also omitted.
 */
export function computePhaseMap(
  catalog: CommandCatalog,
): Record<string, "preboot" | "post_boot"> {
  const map: Record<string, "preboot" | "post_boot"> = {};
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const pub = entry as PublicEntry;
    const cli = pub.realizations.find(
      (r): r is CliRealization => r.kind === "cli",
    );
    if (cli) map[cli.invocation] = pub.phase;
  }
  return map;
}

function renderDispatcherBody(catalog: CommandCatalog, hash: string): string {
  const phaseMap = computePhaseMap(catalog);
  const phaseMapJson = JSON.stringify(phaseMap, Object.keys(phaseMap).sort(), 2);
  return `/**
 * Command dispatcher — derived artifact (P1-3 CLI subcommand dispatch authority).
 *
 * \`bin/onto\` imports \`dispatch()\` and forwards argv. The dispatcher routes
 * \`bin/onto <subcommand>\` invocations only — slash and \`npm run\` paths
 * consume the catalog separately and do not enter here.
 *
 * Routing by phase: preboot invocations go to preboot-dispatch.ts
 * (catalog-derived), post_boot invocations delegate to cli.ts main()
 * (legacy handler switch preserved through P1-3 — Q3(A) decision).
 *
 * Module load also runs \`assertDispatcherDeriveHash()\` (Activation Determinism
 * §3.5): recomputes the dispatcher's target-scoped derive hash and compares
 * against the marker hash. Mismatch fails fast, unless
 * \`ONTO_ALLOW_STALE_DISPATCHER=1\` bypasses. The decision logic lives in
 * \`derive-hash-guard.ts\` (pure, unit-testable) so the negative path is
 * exercised without mutating this generated file.
 *
 * To regenerate: \`npm run generate:catalog -- --target=dispatcher\`.
 * Direct edits will be overwritten and fail the P1-4 CI drift check.
 */

import { pathToFileURL } from "node:url";
import { computeTargetDeriveHash } from "./catalog-hash.js";
import { getNormalizedInvocationSet } from "./command-catalog-helpers.js";
import { COMMAND_CATALOG } from "./command-catalog.js";
import {
  checkDeriveHash,
  formatBypassWarning,
  formatMismatchError,
} from "./derive-hash-guard.js";

const NORMALIZED = getNormalizedInvocationSet(COMMAND_CATALOG);
const BARE_ONTO_SENTINEL = "<<bare>>";

const EXPECTED_DERIVE_HASH = "${hash}";
const DERIVE_SCHEMA_VERSION = "${DERIVE_SCHEMA_VERSION}";
const TARGET_ID = "${TARGET_ID}";
const BYPASS_ENV_VAR = "ONTO_ALLOW_STALE_DISPATCHER";

const PHASE_MAP: Readonly<Record<string, "preboot" | "post_boot">> = ${phaseMapJson};

function assertDispatcherDeriveHash(): void {
  const actual = computeTargetDeriveHash(TARGET_ID, COMMAND_CATALOG, DERIVE_SCHEMA_VERSION);
  const result = checkDeriveHash({
    expected: EXPECTED_DERIVE_HASH,
    actual,
    env: process.env,
    bypassEnvVar: BYPASS_ENV_VAR,
  });
  if (result.kind === "ok") return;
  if (result.kind === "bypassed") {
    process.stderr.write(formatBypassWarning("dispatcher.ts", BYPASS_ENV_VAR));
    return;
  }
  process.stderr.write(
    formatMismatchError({
      targetLabel: "dispatcher.ts",
      expected: result.expected,
      actual: result.actual,
      regenCommand: "npm run generate:catalog -- --target=dispatcher",
      bypassEnvVar: BYPASS_ENV_VAR,
    }),
  );
  process.exit(1);
}

assertDispatcherDeriveHash();

export async function dispatch(argv: readonly string[]): Promise<number> {
  const arg = argv[0] ?? BARE_ONTO_SENTINEL;
  const target = NORMALIZED.get(arg);
  if (target === undefined) {
    // Unknown subcommand — including bare-onto when no MetaEntry has
    // \`default_for: "bare_onto"\` (catalog-driven default; current catalog
    // declares help as default so this branch is unreachable for sentinel).
    process.stderr.write(
      \`[onto] Unknown subcommand: "\${arg}". Run \\\`onto --help\\\` for the command list.\\n\`,
    );
    return 1;
  }
  // Boundary: bin/onto admits only cli and meta invocations. NORMALIZED also
  // contains slash and patterned_slash keys (used by markdown derive + the
  // host's slash dispatcher), but these are not bin/onto subcommands and
  // must be rejected explicitly here so the boundary is closed at the
  // dispatcher rather than relying on a downstream cli.ts fallback.
  if (
    target.entry_kind === "public" &&
    target.realization_kind !== "cli"
  ) {
    process.stderr.write(
      \`[onto] "\${arg}" is a slash command, not a bin/onto subcommand. \` +
        \`Invoke it as /onto:... inside Claude Code, or call its cli \` +
        \`realization (if any) instead.\\n\`,
    );
    return 1;
  }
  // MetaEntry (help/version) is always preboot by schema; route directly.
  // P2-A: forward routing object \`{ meta_name: target.name }\` (Contract A
  // discriminator) — chosen meta identity preserved across dispatcher boundary.
  // For bare-onto sentinel we forward the original argv (already empty by definition).
  if (target.entry_kind === "meta") {
    const { dispatchPreboot } = await import("./preboot-dispatch.js");
    return dispatchPreboot(
      { meta_name: target.name },
      arg === BARE_ONTO_SENTINEL ? argv : argv.slice(1),
    );
  }
  // PublicEntry cli realization — phase derived from PHASE_MAP at emit time.
  // P2-B: canonical lookup — alias 가 들어와도 NORMALIZED 가 canonical 보유.
  // dispatcher 가 \`target.canonical_cli_invocation\` 으로 변환 후 forward.
  // PHASE_MAP / PUBLIC_DISPATCH_TABLE 은 canonical key 만 (single seat).
  const canonical = target.canonical_cli_invocation;
  const phase = PHASE_MAP[canonical] ?? "post_boot";
  if (phase === "preboot") {
    const { dispatchPreboot } = await import("./preboot-dispatch.js");
    return dispatchPreboot(
      { public_invocation: canonical },
      argv.slice(1),
    );
  }
  // post_boot — delegate to cli.ts main with [canonical, ...tail] so cli.ts
  // main 의 argv[0] switch 가 alias 가 아닌 canonical case 와 매치.
  const { main } = await import("../../cli.js");
  return main([canonical, ...argv.slice(1)]);
}

// Auto-run when dispatcher.ts is the process entry (matches cli.ts gating).
// bin/onto in dev mode spawns \`tsx dispatcher.ts ...\` so this fires; in prod
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
        \`[onto] dispatcher: \${err instanceof Error ? err.message : String(err)}\\n\`,
      );
      process.exit(1);
    },
  );
}
`;
}

export function deriveDispatcher(catalog: CommandCatalog): string {
  const hash = computeTargetDeriveHash(TARGET_ID, catalog, DERIVE_SCHEMA_VERSION);
  const body = renderDispatcherBody(catalog, hash);
  return wrapTypeScriptSegmentMarker(body, MARKER_SOURCE_REF, hash);
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
