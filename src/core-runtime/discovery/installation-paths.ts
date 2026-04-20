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
 *   1. `{installRoot}/.onto/{kind}/` — if exists, return
 *   2. `{installRoot}/{kind}/`       — legacy fallback, if exists, return
 *   3. Throw — neither location exists (installation corrupted or wrong root)
 *
 * Phase 7 removes the legacy fallback.
 */

export type InstallationResourceKind =
  | "authority"
  | "design-principles"
  | "processes"
  | "roles"
  | "commands"
  | "domains";

const NEW_LAYOUT_ROOT = ".onto";

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

  const legacyPath = path.join(installRoot, kind);
  if (fs.existsSync(legacyPath)) {
    cache.set(cacheKey, legacyPath);
    return legacyPath;
  }

  throw new Error(
    `[installation-paths] Neither .onto/${kind}/ nor ${kind}/ exists under ${installRoot}. ` +
      `Installation may be corrupted or the kind is unknown.`,
  );
}

/** Test helper — clears the cache so tests can swap fixture installations. */
export function __resetInstallationPathCacheForTesting(): void {
  cache.clear();
}
