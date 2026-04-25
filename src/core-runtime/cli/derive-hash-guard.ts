/**
 * Derive-hash guard utility (P1-3 review iteration).
 *
 * Pure decision function for the catalog-derived dispatcher's load-time
 * integrity check. The generated `dispatcher.ts` calls this exactly once
 * at module load — passing the marker hash that was embedded at emit time
 * and the runtime hash recomputed from the current catalog. This module
 * decides whether to:
 *   - proceed silently (hashes match),
 *   - proceed with a stderr warning (hashes differ but the bypass env var
 *     is set — explicit dev-workflow escape), or
 *   - report a hard mismatch the caller must surface as a non-zero exit.
 *
 * Naming note: the previous name `assertCatalogHash()` was misleading —
 * the value compared is a **target-scoped derive hash** (computed via
 * `computeTargetDeriveHash(targetId, catalog, schemaVersion)`), not the
 * raw catalog hash. P1-3 review (UF-SEMANTICS-HASH-NAME) flagged the
 * mismatch; this module makes the semantics explicit at the function
 * name and test surface.
 *
 * The decision-function pattern (return a tagged result instead of
 * throwing or calling `process.exit`) keeps the unit-testable behavior
 * separate from the side-effects, so the negative path can be exercised
 * by `derive-hash-guard.test.ts` without mutating the generated
 * `dispatcher.ts` or spawning a subprocess.
 *
 * Authority of the bypass env var (P1-4):
 *   `ONTO_ALLOW_STALE_DISPATCHER=1` is a **dev-workflow-only** escape for
 *   local mid-edit cycles where the deriver has not yet been re-run. The
 *   `determinism-regression` GitHub workflow (`.github/workflows/
 *   determinism-regression.yml`) does NOT honor this env var — it runs
 *   `check:catalog-drift` directly and that script never reads it. CI is
 *   the canonical drift gate; the runtime entry guards in dispatcher.ts /
 *   preboot-dispatch.ts are defense-in-depth for invocations that bypass
 *   CI (e.g., a developer running `bin/onto` against an unsynced local
 *   working tree).
 */

export type DeriveHashCheckResult =
  | { kind: "ok" }
  | { kind: "bypassed"; reason: "env-allow-stale" }
  | { kind: "mismatch"; expected: string; actual: string };

/**
 * Compare the marker-embedded `expected` hash against the runtime-recomputed
 * `actual` hash. When they differ, honor a bypass when the named env var is
 * set to `"1"`. Otherwise report a mismatch.
 *
 * The function deliberately does not call `process.exit` or `console.error` —
 * the caller (the generated dispatcher) wires those side effects to the
 * tagged return values. This keeps the behavior unit-testable.
 */
export function checkDeriveHash(args: {
  expected: string;
  actual: string;
  env: NodeJS.ProcessEnv;
  bypassEnvVar: string;
}): DeriveHashCheckResult {
  if (args.expected === args.actual) return { kind: "ok" };
  if (args.env[args.bypassEnvVar] === "1") {
    return { kind: "bypassed", reason: "env-allow-stale" };
  }
  return { kind: "mismatch", expected: args.expected, actual: args.actual };
}

/**
 * Format a stderr-friendly message for the bypassed case. The dispatcher
 * still proceeds — this is only the human-readable warning.
 *
 * Operator-facing terminology uses **target-scoped derive-hash** (P1-3 4th
 * review UF-SEMANTICS-DERIVE-HASH-DIAGNOSTIC). The hash is the per-target
 * digest the deriver embedded in the marker, not the raw catalog hash.
 */
export function formatBypassWarning(targetLabel: string, bypassEnvVar: string): string {
  return (
    `[onto] WARNING: ${targetLabel}: target-scoped derive-hash mismatch — bypassed via ${bypassEnvVar}=1.\n`
  );
}

/**
 * Format a stderr-friendly fail message for the mismatch case. The
 * dispatcher will then exit non-zero.
 *
 * Operator-facing terminology uses **target-scoped derive-hash** (P1-3 4th
 * review UF-SEMANTICS-DERIVE-HASH-DIAGNOSTIC) so the message names the
 * comparand correctly: it is the per-target digest the deriver embedded in
 * the marker, not the raw catalog hash. The "actual" line says
 * `recomputed` to make it clear the live value is computed at runtime,
 * not read from the catalog file.
 */
export function formatMismatchError(args: {
  targetLabel: string;
  expected: string;
  actual: string;
  regenCommand: string;
  bypassEnvVar: string;
}): string {
  return (
    `[onto] ${args.targetLabel}: target-scoped derive-hash mismatch.\n` +
    `  The committed ${args.targetLabel} was emitted from a different catalog state than the one currently loaded.\n` +
    `  expected (marker):    ${args.expected}\n` +
    `  actual   (recomputed): ${args.actual}\n` +
    `Resolution: ${args.regenCommand}\n` +
    `Bypass for dev workflow: ${args.bypassEnvVar}=1\n`
  );
}
