import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { walkUpFor } from "./walk-up.js";

/**
 * Canonicalize a path for identity comparison across symlink layers.
 *
 * macOS 에서 `/tmp` → `/private/tmp`, `/var/folders/…` → `/private/var/folders/…`
 * 같은 시스템 symlink 때문에 `path.resolve` 만으로는 동일 디렉토리인지 확인
 * 할 수 없다 (같은 위치를 가리키는 두 표기가 문자열 수준에서 다름). HOME
 * 경계 판정이 symlink prefix 차이로 실패하지 않도록 `fs.realpathSync` 로
 * 정규화한다. 존재하지 않는 경로는 fallback 으로 `path.resolve` 만 수행.
 */
function canonPath(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/**
 * Build a predicate that treats HOME as a non-project boundary.
 *
 * HOME 의 `.onto/config.yml` 은 global config — project root 로 취급하면
 * `~/.onto/` 가 project scope install 대상으로 오인되어 global 이 덮어쓰여진다
 * (bug-report-install-profile-scope-20260422.md §4.1 실증). HOME 에 도달하면
 * predicate 가 false 를 반환해 walk-up 이 HOME 자체를 project root 로 선택하지
 * 않도록 한다.
 */
function makeHasOntoConfig(homeDir: string) {
  const home = canonPath(homeDir);
  return (dir: string): boolean => {
    if (canonPath(dir) === home) return false;
    return fs.existsSync(path.join(dir, ".onto", "config.yml"));
  };
}

/**
 * Same HOME-boundary policy as {@link makeHasOntoConfig} — HOME 이 .git 또는
 * package.json 을 가지고 있어도 (예: 홈 디렉토리 dotfiles 관리) project root
 * 로 취급하지 않는다.
 */
function makeHasGitOrPackageJson(homeDir: string) {
  const home = canonPath(homeDir);
  return (dir: string): boolean => {
    if (canonPath(dir) === home) return false;
    return (
      fs.existsSync(path.join(dir, ".git")) ||
      fs.existsSync(path.join(dir, "package.json"))
    );
  };
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
 *
 * HOME 경계: walk-up 중 HOME 디렉토리를 만나면 그 위치의 `.onto/config.yml`
 * 또는 `.git`/`package.json` 은 **무시**된다. HOME 의 `.onto/` 는 global
 * config 이며 project root 가 아니다. `homeDir` 인자로 override 가능 (테스트).
 */
export function resolveProjectRoot(
  targetPath?: string,
  homeDir: string = os.homedir(),
): string {
  const hasOntoConfig = makeHasOntoConfig(homeDir);
  const hasGitOrPackageJson = makeHasGitOrPackageJson(homeDir);

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
