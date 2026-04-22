import fs from "node:fs";
import path from "node:path";
const NEW_LAYOUT_ROOT = ".onto";
const cache = new Map();
export function resolveInstallationPath(kind, installRoot) {
    const cacheKey = `${installRoot}::${kind}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined)
        return cached;
    const canonicalPath = path.join(installRoot, NEW_LAYOUT_ROOT, kind);
    if (fs.existsSync(canonicalPath)) {
        cache.set(cacheKey, canonicalPath);
        return canonicalPath;
    }
    throw new Error(`[installation-paths] .onto/${kind}/ not found under ${installRoot}. ` +
        `Installation may be corrupted, or the project may still be on a ` +
        `pre-migration legacy layout — run scripts/repo-layout-migration-replace.py ` +
        `to migrate to the .onto/ layout.`);
}
/** Test helper — clears the cache so tests can swap fixture installations. */
export function __resetInstallationPathCacheForTesting() {
    cache.clear();
}
