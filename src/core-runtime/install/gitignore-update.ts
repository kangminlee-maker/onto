/**
 * `.gitignore` updater for project-scope install.
 *
 * When the user picks project scope, the `.env` file lives under the
 * repo at `<root>/.onto/.env` — secrets on a developer machine. The
 * gitignore needs to exclude that path; otherwise a `git add` of
 * anything under `.onto/` would stage credentials.
 *
 * Scope of this module:
 *
 *   - **In**: append `.onto/.env` to the project `.gitignore` if the
 *     file exists and the entry is missing.
 *   - **In**: create a new `.gitignore` with a single entry if it
 *     doesn't exist yet.
 *   - **Out**: touching `.env.example`, `config.yml`, or any other
 *     tracked onto resource. Those are intentionally in git.
 *   - **Out**: global scope — `~/.onto/.env` doesn't live in any repo.
 *
 * # Why idempotent match-on-trimmed-line
 *
 * `.gitignore` tolerates variations: blank lines, inline comments,
 * leading slash, trailing slash. We normalize each line for the
 * membership test but append the canonical form if missing. This
 * means re-running install never produces a duplicate entry.
 */

import fs from "node:fs";
import path from "node:path";

const CANONICAL_ENTRY = ".onto/.env";

/**
 * Line-level check: does `line` match our target entry, ignoring
 * leading/trailing whitespace, a leading `/`, and any inline comment
 * (gitignore doesn't support inline comments on entry lines, but we
 * tolerate them defensively)?
 */
function lineMatches(line: string, target: string): boolean {
  const stripped = line.split("#")[0]?.trim() ?? "";
  if (!stripped) return false;
  const normalized = stripped.replace(/^\//, "");
  return normalized === target;
}

export interface EnsureGitignoreEntryResult {
  /** Whether the entry was already present (no write). */
  alreadyPresent: boolean;
  /** Whether we created the file (did not exist before). */
  created: boolean;
  /** Final on-disk content of `.gitignore`. `undefined` when skipped. */
  content: string | undefined;
  /**
   * True when the update was skipped — the call was gated by
   * `options.projectRoot` and that directory has no `.git/`. Caller
   * should surface this in the completion summary so the principal
   * knows no `.gitignore` was touched.
   *
   * Added 2026-04-22 as the 3rd defense line for
   * bug-report-install-profile-scope-20260422.md ❸ (HOME `.gitignore`
   * in-place append 사고).
   */
  skipped?: boolean;
  /** Machine-stable reason when skipped. Currently only `not-git-repo`. */
  skipReason?: string;
}

/**
 * Ensure `.onto/.env` is listed in the given `.gitignore` file.
 *
 * Creates the file if absent. Appends the entry if the file exists
 * but the entry isn't found. No-ops when the entry is already
 * present (as `/X`, `X`, `X  # comment`, etc.).
 *
 * When `options.projectRoot` is provided, the function first verifies
 * that `<projectRoot>/.git/` exists. If absent, the call returns a
 * `skipped: true` result without touching the filesystem — prevents
 * polluting a non-repo directory's `.gitignore` when `projectRoot`
 * was mis-resolved (e.g. HOME). Backward compat: callers that omit
 * `options.projectRoot` retain the previous unconditional behavior.
 *
 * Returns the resulting file content so the caller can log it in
 * dry-run mode or include it in the completion summary.
 */
export function ensureGitignoreEntry(
  gitignorePath: string,
  options: { dryRun?: boolean; projectRoot?: string } = {},
): EnsureGitignoreEntryResult {
  const { dryRun = false, projectRoot } = options;

  if (projectRoot !== undefined) {
    const gitDir = path.join(projectRoot, ".git");
    if (!fs.existsSync(gitDir)) {
      return {
        alreadyPresent: false,
        created: false,
        content: undefined,
        skipped: true,
        skipReason: "not-git-repo",
      };
    }
  }

  if (!fs.existsSync(gitignorePath)) {
    const content = `${CANONICAL_ENTRY}\n`;
    if (!dryRun) {
      fs.writeFileSync(gitignorePath, content, "utf8");
    }
    return { alreadyPresent: false, created: true, content };
  }

  const original = fs.readFileSync(gitignorePath, "utf8");
  const lines = original.split(/\r?\n/);
  const already = lines.some((line) => lineMatches(line, CANONICAL_ENTRY));
  if (already) {
    return { alreadyPresent: true, created: false, content: original };
  }

  // Append — preserve trailing newline convention.
  const trailingNewline = original.endsWith("\n");
  const prefix = trailingNewline ? original : `${original}\n`;
  const content = `${prefix}${CANONICAL_ENTRY}\n`;

  if (!dryRun) {
    fs.writeFileSync(gitignorePath, content, "utf8");
  }
  return { alreadyPresent: false, created: false, content };
}
