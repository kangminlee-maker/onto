/**
 * Legacy review-mode policy — centralized seat for handling renamed mode values.
 *
 * # Why this file exists (evolution-F1)
 *
 * Before v0.2.0, `ReviewMode` values were `'light' | 'full'`. PR #127
 * (2026-04-19) renamed `'light'` → `'core-axis'` to align the mode name with
 * its selection rationale (at that time: meta-level 4 axes; revised in
 * v0.2.1 to cost-constrained Pareto-optimal core lens set — registry is SSOT).
 * The rename is big-bang (dual-read 미제공) but the runtime still needs to:
 *
 *   1. Reject new inputs that carry old values with a friendly migration
 *      message (not a bare "Invalid review mode" error).
 *   2. Normalize old values found in historical persisted artifacts
 *      (`.onto/review/<session>/execution-result.yaml`) so progressiveness
 *      and audit readers remain functional.
 *
 * Previously (PR #127 initial) these two policies were duplicated across
 * 4 consumers:
 *   - prepare-review-session.ts requireReviewMode validator
 *   - bootstrap-review-binding.ts requireReviewMode validator
 *   - write-review-interpretation.ts requireReviewMode validator
 *   - review-log.ts parseSession reader normalization
 *
 * Duplication means future rename/alias changes must touch 4 seats, each
 * a drift risk. This module consolidates the policy into one canonical seat
 * so future rename cycles have a single entry point.
 *
 * # What this file owns
 *
 * - `LEGACY_REVIEW_MODE_MAP`: single source of truth for old → new mode
 *   mappings
 * - `isLegacyReviewMode`: predicate for old values
 * - `getLegacyReplacement`: look up the new value for a legacy input
 * - `formatLegacyMigrationError`: produce a user-facing friendly error for
 *   stale CLI/config inputs
 * - `normalizeLegacyReviewMode`: map legacy values for reader-only
 *   normalization (returns `string` to preserve original when there is
 *   no mapping)
 *
 * # What this file does NOT own
 *
 * - The canonical `ReviewMode` union (that lives in `artifact-types.ts`)
 * - Other legacy fields (e.g. `suggest_light` JSON key in
 *   `complexity-assessment.ts`) — those use structural `undefined`
 *   fallback, not this map
 *
 * Reference: CHANGELOG.md "Legacy persisted-state policy" + Consumer
 * migration matrix; `development-records/evolve/20260418-light-to-core-axis-rename-proposal.md`
 */

import type { ReviewMode } from "./artifact-types.js";

/**
 * Single source of truth for legacy → current ReviewMode value mappings.
 * Adding a new rename cycle: add the old → new entry here; the 4 consumers
 * automatically pick up the new mapping.
 */
export const LEGACY_REVIEW_MODE_MAP: Readonly<Record<string, ReviewMode>> = {
  light: "core-axis",
};

/** True if `value` is a known legacy ReviewMode name. */
export function isLegacyReviewMode(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_REVIEW_MODE_MAP, value);
}

/** Returns the current ReviewMode for a legacy input, or null if unknown. */
export function getLegacyReplacement(value: string): ReviewMode | null {
  return LEGACY_REVIEW_MODE_MAP[value] ?? null;
}

/**
 * Friendly migration error for stale CLI/config inputs.
 * `flag` is the surface the user was using (e.g. `--review-mode`,
 * `review_mode`, `--review-mode-recommendation`).
 */
export function formatLegacyMigrationError(flag: string, legacyValue: string): string {
  const replacement = getLegacyReplacement(legacyValue);
  if (replacement === null) {
    return `Invalid ${flag}: ${legacyValue}`;
  }
  return (
    `\`${flag} ${legacyValue}\` was renamed to ` +
    `\`${flag} ${replacement}\` in v0.2.0 (PR #127). ` +
    `See CHANGELOG.md for migration.`
  );
}

/**
 * Reader-only normalization: map a raw value to its canonical replacement
 * when it is a known legacy name. Returns the original string otherwise
 * (caller narrows to ReviewMode if it trusts the source).
 */
export function normalizeLegacyReviewMode(value: string): string {
  return LEGACY_REVIEW_MODE_MAP[value] ?? value;
}
