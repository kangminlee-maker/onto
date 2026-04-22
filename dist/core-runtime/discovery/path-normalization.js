/**
 * Path-segment utilities.
 *
 * Originally introduced (Phase 5, 2026-04-21) to centralize canonical/legacy
 * path aliases during the 8-phase repo-layout migration. Phase 7 removed
 * the legacy side of the migration, so the alias list is now empty and the
 * rewrite helper is effectively identity. What remains load-bearing is the
 * segment-bound prefix check — still consumed by drift-engine and
 * promote-principle validation to prevent near-miss prefix collisions
 * (e.g., `.onto/principlesABC/` must not match `.onto/principles`).
 */
/**
 * Segment-bound prefix check for directory paths.
 *
 * `dir` is the directory prefix; trailing slash is optional (normalized
 * internally). A path is considered inside `dir` only when it starts
 * with `dir + "/"` followed by at least one character — never when the
 * prefix ends mid-segment, and never when the path is the bare directory.
 *
 *   startsWithDirPrefix("a/b/c.md", "a")      → true
 *   startsWithDirPrefix("a/b/c.md", "a/")     → true
 *   startsWithDirPrefix("ab/c.md",  "a")      → false  (segment boundary)
 *   startsWithDirPrefix("a",        "a")      → false  (not a path under a)
 *   startsWithDirPrefix(".onto/principlesABC/x.md", ".onto/principles") → false
 */
export function startsWithDirPrefix(relPath, dir) {
    const normalized = dir.endsWith("/") ? dir : dir + "/";
    return relPath.length > normalized.length && relPath.startsWith(normalized);
}
