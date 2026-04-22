/**
 * Session Root Migrator — DD-8 (Step 11b).
 *
 * Design authority:
 *   - learn-phase3-design-v4.md DD-8 (1-time idempotent migration)
 *   - learn-phase3-design-v9.md DD-8 (.layout-version.yaml seat)
 *
 * Responsibility:
 *   - Move pre-v3 session directories from `.onto/sessions/{id}/` to
 *     `.onto/sessions/review/{id}/`. Pre-v3 sessions were all review
 *     sessions; promote and reclassify-insights are post-v3 additions, so
 *     unscoped legacy ids are unambiguous.
 *   - Write the layout-version marker after migration succeeds so
 *     subsequent commands skip the gate.
 *   - Idempotent: re-running after a successful migration writes nothing,
 *     reports `migrated_count: 0`. Safe to re-run if a partial run was
 *     interrupted.
 *
 * Failure semantics:
 *   - Per-session move uses `fs.renameSync` (atomic on the same filesystem).
 *     If a move fails mid-list, the function records the partial state and
 *     surfaces it to the caller. The caller decides whether to retry.
 *   - Marker is only written when ALL legacy sessions migrated successfully
 *     — partial migration leaves the marker absent so the gate keeps firing.
 *
 * Dry-run support:
 *   - The CLI exposes `--dry-run` so operators can preview the plan without
 *     touching the filesystem. The dry-run path emits the same MigrationResult
 *     shape so plan output is structured.
 */
import fs from "node:fs";
import path from "node:path";
import { inspectMigrationStatus, writeLayoutMarker, getSessionsDir, } from "./session-root-guard.js";
// ---------------------------------------------------------------------------
// Migration entry point
// ---------------------------------------------------------------------------
export function migrateSessionRoots(config) {
    const before = inspectMigrationStatus(config.projectRoot);
    // Already-migrated case: just write the marker if needed.
    if (before.legacy_session_count === 0) {
        if (config.dryRun) {
            return {
                dry_run: true,
                before,
                migrated: [],
                failures: [],
                marker_written: false,
            };
        }
        if (!before.marker_present) {
            writeLayoutMarker(config.projectRoot);
            return {
                dry_run: false,
                before,
                migrated: [],
                failures: [],
                marker_written: true,
            };
        }
        return {
            dry_run: false,
            before,
            migrated: [],
            failures: [],
            marker_written: false,
        };
    }
    const sessionsDir = getSessionsDir(config.projectRoot);
    const reviewDir = path.join(sessionsDir, "review");
    const planned = before.legacy_session_ids.map((id) => ({
        session_id: id,
        from: path.join(sessionsDir, id),
        to: path.join(reviewDir, id),
    }));
    if (config.dryRun) {
        return {
            dry_run: true,
            before,
            migrated: planned,
            failures: [],
            marker_written: false,
        };
    }
    fs.mkdirSync(reviewDir, { recursive: true });
    const migrated = [];
    const failures = [];
    for (const session of planned) {
        try {
            // Defensive: refuse to overwrite an existing destination.
            if (fs.existsSync(session.to)) {
                throw new Error(`destination ${session.to} already exists`);
            }
            fs.renameSync(session.from, session.to);
            migrated.push(session);
        }
        catch (error) {
            failures.push({
                session_id: session.session_id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Marker is only written when ALL legacy sessions migrated successfully.
    // Partial runs leave the marker absent so the gate keeps firing on the
    // next invocation.
    let marker_written = false;
    if (failures.length === 0) {
        writeLayoutMarker(config.projectRoot);
        marker_written = true;
    }
    return {
        dry_run: false,
        before,
        migrated,
        failures,
        marker_written,
    };
}
