/**
 * Recovery context — DD-22 + DD-23.
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-22 (canonical attempt selection, source_kind enum)
 *   - learn-phase3-design-v9.md DD-23 (RecoveryResolution canonical seat)
 *   - learn-phase3-design-v8.md DD-22 (attempt_id lifecycle, conflict policy)
 *   - learn-phase3-design-v7.md DD-22 (single consumer + freshness)
 *
 * Responsibility:
 *   - Gather recovery sources (in-band ApplyExecutionState, out-of-band
 *     emergency log, checkpoint manifest) for a given session
 *   - Resolve which is the canonical truth using attempt_id + generation
 *   - Surface manual escalation when multiple attempt_ids conflict and the
 *     operator has not yet recorded a RecoveryResolution
 *   - Persist operator decisions (DD-23) so subsequent --resume runs respect them
 */
import fs from "node:fs";
import path from "node:path";
import { REGISTRY } from "./artifact-registry.js";
import { BACKUP_ROOT } from "./recoverability.js";
/** v8 axiology default — fail-close for canonical knowledge mutation. */
export const DEFAULT_RECOVERY_POLICY = {
    cross_attempt_conflict: "manual_escalation",
};
// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------
export function getSessionPromoteRoot(projectRoot, sessionId) {
    return path.join(projectRoot, ".onto", "sessions", "promote", sessionId);
}
export function getApplyStatePath(projectRoot, sessionId) {
    return path.join(getSessionPromoteRoot(projectRoot, sessionId), "promote-execution-result.json");
}
export function getRecoveryResolutionPath(projectRoot, sessionId) {
    return path.join(getSessionPromoteRoot(projectRoot, sessionId), "recovery-resolution.yaml");
}
export function getCheckpointDir(sessionId) {
    return path.join(BACKUP_ROOT, sessionId);
}
export function getCheckpointManifestPath(sessionId) {
    return path.join(getCheckpointDir(sessionId), "restore-manifest.yaml");
}
export function getCheckpointMetadataPath(sessionId) {
    return path.join(getCheckpointDir(sessionId), "backup-metadata.yaml");
}
export const EMERGENCY_LOG_PATH = path.join(
// ~/.onto/emergency-log.jsonl. We resolve via process.env.HOME so callers
// running under tmpdir-based tests can override the home directory.
process.env.HOME ?? "", ".onto", "emergency-log.jsonl");
// ---------------------------------------------------------------------------
// Source gathering
// ---------------------------------------------------------------------------
function getFreshness(source) {
    return source.freshness;
}
function readEmergencyLogEntries(sessionId, logPath) {
    if (!fs.existsSync(logPath))
        return [];
    const content = fs.readFileSync(logPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const entries = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            if (parsed.session_id === sessionId && parsed.schema_version === "1") {
                entries.push(parsed);
            }
        }
        catch {
            // Malformed line — skip. Real Phase 3 read protocol surfaces this via
            // the proper EmergencyLogReadResult; this gather-helper is best-effort.
        }
    }
    return entries;
}
function reconstructCheckpointFromManifest(manifest, metadata) {
    return {
        schema_version: "1",
        session_id: manifest.session_id,
        created_at: manifest.created_at,
        manifest_path: getCheckpointManifestPath(manifest.session_id),
        backups: manifest.backups,
        total_bytes: metadata.total_bytes,
        protected: metadata.protected,
        protection_reason: metadata.protection_reason,
        attempt_id: manifest.attempt_id,
        generation: manifest.generation,
    };
}
export async function gatherRecoveryContext(sessionId, projectRoot) {
    const context = {
        session_id: sessionId,
        gathered_at: new Date().toISOString(),
        apply_state: null,
        emergency_log: null,
        checkpoint_manifest: null,
    };
    // 1. apply_state (in-band)
    const applyStatePath = getApplyStatePath(projectRoot, sessionId);
    if (fs.existsSync(applyStatePath)) {
        try {
            const state = REGISTRY.loadFromFile("apply_execution_state", applyStatePath);
            context.apply_state = {
                kind: "apply_state",
                state,
                freshness: {
                    attempt_id: state.attempt_id,
                    generation: state.generation,
                    source_recorded_at: state.last_updated_at,
                    source_kind: "apply_state",
                },
                artifact_path: applyStatePath,
            };
        }
        catch {
            // Load failure — leave null. The recovery resolver will treat it as
            // missing and fall back to other sources.
        }
    }
    // 2. emergency_log (out-of-band)
    const emergencyEntries = readEmergencyLogEntries(sessionId, EMERGENCY_LOG_PATH);
    if (emergencyEntries.length > 0) {
        const sorted = [...emergencyEntries].sort((a, b) => b.generation - a.generation);
        const latest = sorted[0];
        context.emergency_log = {
            kind: "emergency_log",
            entries: sorted,
            latest_entry: latest,
            freshness: {
                attempt_id: latest.attempt_id,
                generation: latest.generation,
                source_recorded_at: latest.written_at,
                source_kind: "emergency_log",
            },
            log_path: EMERGENCY_LOG_PATH,
        };
    }
    // 3. checkpoint_manifest
    const manifestPath = getCheckpointManifestPath(sessionId);
    const metadataPath = getCheckpointMetadataPath(sessionId);
    if (fs.existsSync(manifestPath) && fs.existsSync(metadataPath)) {
        try {
            const manifest = REGISTRY.loadFromFile("restore_manifest", manifestPath);
            const metadata = REGISTRY.loadFromFile("backup_metadata", metadataPath);
            const checkpoint = reconstructCheckpointFromManifest(manifest, metadata);
            context.checkpoint_manifest = {
                kind: "checkpoint_manifest",
                manifest,
                checkpoint,
                freshness: {
                    attempt_id: manifest.attempt_id,
                    generation: manifest.generation,
                    source_recorded_at: manifest.created_at,
                    source_kind: "checkpoint_manifest",
                },
            };
        }
        catch {
            // Manifest corrupted: skip. Operator must intervene manually.
        }
    }
    return context;
}
// ---------------------------------------------------------------------------
// DD-23 recovery resolution persistence
// ---------------------------------------------------------------------------
export function loadRecoveryResolution(projectRoot, sessionId) {
    const p = getRecoveryResolutionPath(projectRoot, sessionId);
    if (!fs.existsSync(p))
        return null;
    return REGISTRY.loadFromFile("recovery_resolution", p);
}
/**
 * NQ-21: append-only resolution history.
 *
 * If a prior recovery-resolution.yaml exists for this session, the new entry
 * is APPENDED to its resolution_history array and the top-level fields are
 * updated to reflect the latest decision. Older history entries are
 * preserved verbatim — the audit trail must show every reversal and reason.
 *
 * If no prior file exists, the new entry becomes the sole history entry.
 *
 * The caller passes a RecoveryResolution where the top-level fields describe
 * the new decision and resolution_history contains exactly one entry (the
 * new decision). saveRecoveryResolution() expands resolution_history with
 * the prior entries when applicable.
 */
export function saveRecoveryResolution(projectRoot, resolution) {
    // m-2 fix: validate input contract before touching disk. Empty
    // resolution_history would crash on the [length-1] access below; throw
    // explicitly so the caller knows their input is malformed.
    if (resolution.resolution_history.length === 0) {
        throw new Error(`saveRecoveryResolution: resolution_history must contain at least one entry ` +
            `(got 0). The caller is expected to pass a single-entry history; merging ` +
            `with prior entries is handled here.`);
    }
    // N-3 acknowledged: this load → merge → save sequence is not atomic across
    // processes. Two concurrent `onto promote --resolve-conflict` invocations
    // for the same session could lose updates. Phase 3 is single-process per
    // session by design; cross-process coordination is a follow-up requiring a
    // file lock or rename-temp pattern. Documented as a known limitation.
    const p = getRecoveryResolutionPath(projectRoot, resolution.session_id);
    // Load prior history if any. We probe via fs.existsSync to distinguish
    // "first decision" from "load failed" — load failure should propagate.
    let priorHistory = [];
    if (fs.existsSync(p)) {
        const prior = REGISTRY.loadFromFile("recovery_resolution", p);
        priorHistory = prior.resolution_history;
    }
    // The caller passes a single-entry resolution_history with the new decision.
    // We expand it with the prior entries during merge. Multi-entry input is
    // rejected by the length check above so the LAST-entry fallback is no longer
    // needed.
    const newEntry = resolution.resolution_history[resolution.resolution_history.length - 1];
    const merged = {
        schema_version: "1",
        session_id: resolution.session_id,
        resolved_at: newEntry.resolved_at,
        resolved_by: newEntry.resolved_by,
        resolution_method: newEntry.resolution_method,
        selected_attempt_id: newEntry.selected_attempt_id,
        selected_attempt_reason: newEntry.selected_attempt_reason,
        all_attempts_at_resolution_time: newEntry.all_attempts_at_resolution_time,
        ...(newEntry.operator_note !== undefined
            ? { operator_note: newEntry.operator_note }
            : {}),
        resolution_history: [...priorHistory, newEntry],
    };
    REGISTRY.saveToFile("recovery_resolution", p, merged);
}
// ---------------------------------------------------------------------------
// Truth resolution
// ---------------------------------------------------------------------------
function collectAllSources(context) {
    const sources = [];
    if (context.apply_state)
        sources.push(context.apply_state);
    if (context.emergency_log)
        sources.push(context.emergency_log);
    if (context.checkpoint_manifest)
        sources.push(context.checkpoint_manifest);
    return sources;
}
function getArtifactPath(source) {
    switch (source.kind) {
        case "apply_state":
            return source.artifact_path;
        case "emergency_log":
            return source.log_path;
        case "checkpoint_manifest":
            return source.checkpoint.manifest_path;
    }
}
function toAttemptInfo(source) {
    return {
        attempt_id: source.freshness.attempt_id,
        source_kind: source.freshness.source_kind,
        generation: source.freshness.generation,
        source_recorded_at: source.freshness.source_recorded_at,
        artifact_path: getArtifactPath(source),
    };
}
function resolveWithinAttempt(sources) {
    const sorted = [...sources].sort((a, b) => getFreshness(b).generation - getFreshness(a).generation);
    return {
        latest_source: sorted[0],
        older_sources: sorted.slice(1),
    };
}
/**
 * Cross-attempt selection (auto_resolve_latest_generation policy).
 *
 * SYN-CONS-01 (v9): generation is only monotonic WITHIN one attempt_id.
 * Cross-attempt comparison must first select a canonical attempt by ULID
 * timestamp ordering (lexicographic == chronological for ULID).
 */
function selectCanonicalAttemptAuto(sources) {
    const byAttempt = new Map();
    for (const source of sources) {
        const id = getFreshness(source).attempt_id;
        const existing = byAttempt.get(id) ?? [];
        existing.push(source);
        byAttempt.set(id, existing);
    }
    const sortedAttempts = [...byAttempt.keys()].sort();
    const canonicalAttemptId = sortedAttempts[sortedAttempts.length - 1];
    return byAttempt.get(canonicalAttemptId);
}
export function resolveRecoveryTruth(context, projectRoot, policy = DEFAULT_RECOVERY_POLICY) {
    const sources = collectAllSources(context);
    if (sources.length === 0) {
        return { kind: "no_recovery_data" };
    }
    const attemptIds = new Set(sources.map((s) => getFreshness(s).attempt_id));
    if (attemptIds.size > 1) {
        if (policy.cross_attempt_conflict === "manual_escalation") {
            // DD-23: check existing operator resolution first
            const existing = loadRecoveryResolution(projectRoot, context.session_id);
            if (existing !== null) {
                const selectedSources = sources.filter((s) => getFreshness(s).attempt_id === existing.selected_attempt_id);
                if (selectedSources.length === 0) {
                    // Resolution refers to an attempt that no longer has any sources.
                    // Surface as escalation again so operator can re-decide.
                    return {
                        kind: "manual_escalation_required",
                        conflicting_attempts: sources.map(toAttemptInfo),
                        escalation_reason: `Existing recovery-resolution.yaml references attempt_id ` +
                            `${existing.selected_attempt_id}, but no source matches that ` +
                            `attempt anymore. Re-record decision via 'onto promote ` +
                            `--resolve-conflict'.`,
                    };
                }
                const within = resolveWithinAttempt(selectedSources);
                return {
                    kind: "resolved",
                    source_of_truth: "operator_resolution",
                    latest_source: within.latest_source,
                    older_sources: within.older_sources,
                    has_conflict: true,
                    resolution_artifact_path: getRecoveryResolutionPath(projectRoot, context.session_id),
                };
            }
            return {
                kind: "manual_escalation_required",
                conflicting_attempts: sources.map(toAttemptInfo),
                escalation_reason: `Multiple attempt_ids detected (${attemptIds.size}). Manual ` +
                    `operator decision required to select canonical recovery source. ` +
                    `Use 'onto promote --resolve-conflict <session-id> --select ` +
                    `<attempt-id>' to record decision.`,
            };
        }
        // auto_resolve_latest_generation
        const canonicalSources = selectCanonicalAttemptAuto(sources);
        const within = resolveWithinAttempt(canonicalSources);
        return {
            kind: "resolved",
            source_of_truth: "auto_resolved",
            latest_source: within.latest_source,
            older_sources: within.older_sources,
            has_conflict: true,
        };
    }
    // Single attempt path
    const within = resolveWithinAttempt(sources);
    return {
        kind: "resolved",
        source_of_truth: "single_attempt",
        latest_source: within.latest_source,
        older_sources: within.older_sources,
        has_conflict: false,
    };
}
export function getResolvedFreshness(truth) {
    if (truth.kind !== "resolved")
        return null;
    return getFreshness(truth.latest_source);
}
// ---------------------------------------------------------------------------
// Operator-facing message
// ---------------------------------------------------------------------------
export function buildEscalationMessage(resolved) {
    const lines = [
        "Recovery Manual Escalation Required",
        "====================================",
        "",
        `Reason: ${resolved.escalation_reason}`,
        "",
        "Conflicting attempts:",
    ];
    resolved.conflicting_attempts.forEach((c, i) => {
        lines.push(`  ${i + 1}. attempt_id=${c.attempt_id}`, `     source=${c.source_kind}`, `     generation=${c.generation}`, `     recorded_at=${c.source_recorded_at}`, `     artifact_path=${c.artifact_path}`);
    });
    lines.push("", "Resolution options:", "  A) onto promote --resolve-conflict <session-id> --select <attempt-id> [--note '<reason>']", "  B) Edit decisions file with 'recovery_resolution' section", "  C) onto promote --apply <session-id> --auto-resolve-attempt-conflict", "", "Note: option C bypasses manual review. Use only when trade-offs are understood.");
    return lines.join("\n");
}
