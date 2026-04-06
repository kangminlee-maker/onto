import fs from "node:fs";
import path from "node:path";

function walkUpFor(
  startDir: string,
  predicate: (dir: string) => boolean,
): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (true) {
    if (predicate(current)) return current;
    const parent = path.dirname(current);
    if (parent === current || current === root) return null;
    current = parent;
  }
}

/**
 * Checks for .onto/config.yml existence only as a directory marker.
 * Does NOT read config values (diamond dependency prevention).
 */
function hasOntoConfig(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".onto", "config.yml"));
}

function hasGitOrPackageJson(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, ".git")) ||
    fs.existsSync(path.join(dir, "package.json"))
  );
}

/**
 * Resolves the target project root directory.
 *
 * Precedence:
 * 1. --project-root CLI flag (already handled upstream — this function
 *    is called only when no explicit flag is provided)
 * 2. Walk up from target path for .onto/config.yml
 * 3. Walk up from CWD for .onto/config.yml
 * 4. Walk up from CWD for .git or package.json
 * 5. CWD fallback
 */
export function resolveProjectRoot(targetPath?: string): string {
  // 2. Walk up from target
  if (typeof targetPath === "string" && targetPath.length > 0) {
    const resolvedTarget = path.resolve(targetPath);
    const startDir = fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory()
      ? resolvedTarget
      : path.dirname(resolvedTarget);
    const fromTarget = walkUpFor(startDir, hasOntoConfig);
    if (fromTarget) return fromTarget;
  }

  // 3. Walk up from CWD for .onto/config.yml
  const fromCwdConfig = walkUpFor(process.cwd(), hasOntoConfig);
  if (fromCwdConfig) return fromCwdConfig;

  // 4. Walk up from CWD for .git or package.json
  const fromCwdGit = walkUpFor(process.cwd(), hasGitOrPackageJson);
  if (fromCwdGit) return fromCwdGit;

  // 5. CWD fallback
  return process.cwd();
}
