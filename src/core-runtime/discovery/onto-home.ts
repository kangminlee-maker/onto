import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { walkUpFor } from "./walk-up.js";

/**
 * Validates whether a directory is an onto installation root.
 *
 * Marker: package.json with name "onto-core" AND a roles dir AND an authority
 * dir. Phase 0 of the repo-layout migration accepts both the legacy top-level
 * layout (`roles/`, `authority/`) and the new `.onto/` layout — an install
 * partway through migration is still a valid root.
 */
export function isOntoRoot(dir: string): boolean {
  try {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.name !== "onto-core") return false;
    const rolesPresent =
      fs.existsSync(path.join(dir, "roles")) ||
      fs.existsSync(path.join(dir, ".onto", "roles"));
    if (!rolesPresent) return false;
    const authorityPresent =
      fs.existsSync(path.join(dir, "authority")) ||
      fs.existsSync(path.join(dir, ".onto", "authority"));
    if (!authorityPresent) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the onto installation directory.
 *
 * Precedence (CLI flag > env > auto-detection):
 * 1. --onto-home CLI flag
 * 2. ONTO_HOME environment variable
 * 3. Walk up from executing script location
 * 4. Walk up from CWD (backward compat when running from onto repo)
 */
export function resolveOntoHome(
  ontoHomeFlag: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  // 1. CLI flag (highest precedence)
  if (typeof ontoHomeFlag === "string" && ontoHomeFlag.length > 0) {
    const resolved = path.resolve(ontoHomeFlag);
    if (!isOntoRoot(resolved)) {
      throw new Error(
        `Invalid onto home: ${resolved}. Expected package.json with name "onto-core", roles/ and authority/ directories.`,
      );
    }
    return resolved;
  }

  // 2. ONTO_HOME env
  const envHome = env.ONTO_HOME;
  if (typeof envHome === "string" && envHome.length > 0) {
    const resolved = path.resolve(envHome);
    if (!isOntoRoot(resolved)) {
      throw new Error(
        `Invalid ONTO_HOME: ${resolved}. Expected package.json with name "onto-core", roles/ and authority/ directories.`,
      );
    }
    return resolved;
  }

  // 3. Walk up from executing script location
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fromScript = walkUpFor(scriptDir, isOntoRoot);
  if (fromScript) return fromScript;

  // 4. Walk up from CWD
  const fromCwd = walkUpFor(process.cwd(), isOntoRoot);
  if (fromCwd) return fromCwd;

  throw new Error(
    "Cannot locate onto installation. Set ONTO_HOME environment variable, pass --onto-home, or run from the onto repository.",
  );
}
