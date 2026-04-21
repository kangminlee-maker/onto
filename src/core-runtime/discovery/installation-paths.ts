import fs from "node:fs";
import path from "node:path";

/**
 * Installation resource path resolver — dual-path migration support.
 *
 * Phase 0 of repo layout migration (2026-04-20). During the transition from
 * top-level directories (authority/, design-principles/, ...) to the
 * `.onto/` layout, this module centralizes path resolution so consumers
 * don't hardcode either path shape.
 *
 * Resolution order:
 *   1. `{installRoot}/.onto/{kind}/`          — if exists, return
 *   2. `{installRoot}/{legacyName}/`          — legacy fallback, if exists, return
 *   3. Throw — neither location exists (installation corrupted or wrong root)
 *
 * For most kinds `legacyName === kind`. Phase 5 renamed `design-principles/` to
 * `.onto/principles/`, so the `principles` kind maps to the legacy dir name
 * `design-principles` via `LEGACY_DIR_OVERRIDES`.
 *
 * Phase 7 removes the legacy fallback.
 */

export type InstallationResourceKind =
  | "authority"
  | "principles"
  | "processes"
  | "roles"
  | "commands"
  | "domains";

const NEW_LAYOUT_ROOT = ".onto";

/**
 * For kinds whose legacy top-level directory name differs from the Phase-3+
 * canonical `.onto/` subdir name (a rename, not just a move), map the kind to
 * the legacy dir name used in the `{installRoot}/{legacyName}/` fallback.
 */
const LEGACY_DIR_OVERRIDES: Partial<Record<InstallationResourceKind, string>> = {
  // Phase 5 rename: `.onto/principles/` ← legacy `design-principles/`.
  principles: "design-principles",
};

const cache = new Map<string, string>();

export function resolveInstallationPath(
  kind: InstallationResourceKind,
  installRoot: string,
): string {
  const cacheKey = `${installRoot}::${kind}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const newPath = path.join(installRoot, NEW_LAYOUT_ROOT, kind);
  if (fs.existsSync(newPath)) {
    cache.set(cacheKey, newPath);
    return newPath;
  }

  const legacyDirName = LEGACY_DIR_OVERRIDES[kind] ?? kind;
  const legacyPath = path.join(installRoot, legacyDirName);
  if (fs.existsSync(legacyPath)) {
    cache.set(cacheKey, legacyPath);
    return legacyPath;
  }

  throw new Error(
    `[installation-paths] Neither .onto/${kind}/ nor ${legacyDirName}/ exists under ${installRoot}. ` +
      `Installation may be corrupted or the kind is unknown.`,
  );
}

/** Test helper — clears the cache so tests can swap fixture installations. */
export function __resetInstallationPathCacheForTesting(): void {
  cache.clear();
}
