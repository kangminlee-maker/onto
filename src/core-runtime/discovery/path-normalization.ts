/**
 * Path normalization helpers for repo layout migration.
 *
 * Centralizes path-shape knowledge for the 8-phase migration (Phase 0-7).
 * Consumers that need to validate, classify, or persist path references
 * during the canonical (.onto/) ↔ legacy dual-layout window import from
 * here instead of inlining prefix lists.
 *
 * Relation to `installation-paths.ts`:
 *   - `installation-paths.ts` owns *kind-level* resolution: given a
 *     resource kind ("principles", "processes", ...), pick a directory.
 *     Its `LEGACY_DIR_OVERRIDES` is a kind → legacy-dir map.
 *   - This file owns *path-level* rewriting: given a raw path string,
 *     normalize or segment-check it. Its `LAYOUT_ALIASES` is a list of
 *     canonical/legacy prefix pairs.
 *   - Both surfaces must agree on aliases. `path-normalization.test.ts`
 *     cross-checks them.
 */

/**
 * Canonical/legacy prefix pairs for each migrated top-level directory.
 * Both members include the trailing slash to support segment-bound
 * prefix checks.
 *
 * Phase 6 (authority) is included pre-emptively so drift-engine can
 * classify `.onto/authority/` as governance core once the rename lands,
 * without requiring a second code change.
 */
export const LAYOUT_ALIASES: ReadonlyArray<{
  readonly canonical: string;
  readonly legacy: string;
}> = [
  { canonical: ".onto/principles/", legacy: "design-principles/" }, // Phase 5 (rename)
  { canonical: ".onto/processes/", legacy: "processes/" }, // Phase 4
  { canonical: ".onto/roles/", legacy: "roles/" }, // Phase 3
  { canonical: ".onto/domains/", legacy: "domains/" }, // Phase 2
  { canonical: ".onto/commands/", legacy: "commands/" }, // Phase 1
  { canonical: ".onto/authority/", legacy: "authority/" }, // Phase 6 (planned)
];

/**
 * Segment-bound prefix check for directory paths.
 *
 * `dir` is the directory prefix; trailing slash is optional (normalized
 * internally). A path is considered inside `dir` only when it starts
 * with `dir + "/"` — never when the prefix ends mid-segment.
 *
 *   startsWithDirPrefix("a/b/c.md", "a")      → true
 *   startsWithDirPrefix("a/b/c.md", "a/")     → true
 *   startsWithDirPrefix("ab/c.md",  "a")      → false  (segment boundary)
 *   startsWithDirPrefix("a",        "a")      → false  (not a path under a)
 *   startsWithDirPrefix(".onto/principlesABC/x.md", ".onto/principles") → false
 */
export function startsWithDirPrefix(relPath: string, dir: string): boolean {
  const normalized = dir.endsWith("/") ? dir : dir + "/";
  // Require at least one character after the trailing slash so that a
  // bare directory reference (e.g., ".onto/principles" or ".onto/principles/")
  // is not treated as "a path under that directory". The caller is asking
  // about file paths, not the directory itself.
  return relPath.length > normalized.length && relPath.startsWith(normalized);
}

/**
 * Rewrite a repo-relative path to the canonical `.onto/` shape when it
 * begins with a known legacy prefix. Idempotent on already-canonical
 * paths and on paths that don't match any alias.
 *
 *   canonicalizeLayoutPath("design-principles/foo.md") → ".onto/principles/foo.md"
 *   canonicalizeLayoutPath(".onto/principles/foo.md")  → ".onto/principles/foo.md"
 *   canonicalizeLayoutPath("src/core-runtime/foo.ts")  → "src/core-runtime/foo.ts"
 */
export function canonicalizeLayoutPath(relPath: string): string {
  for (const { canonical, legacy } of LAYOUT_ALIASES) {
    if (startsWithDirPrefix(relPath, legacy)) {
      return canonical + relPath.slice(legacy.length);
    }
  }
  return relPath;
}
