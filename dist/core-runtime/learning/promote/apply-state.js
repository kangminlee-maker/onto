/**
 * Phase 3 Promote — Apply Execution State helper (Step 9c).
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-22 (attempt_id lifecycle, generation
 *     monotonic within an attempt)
 *   - learn-phase3-design-v8.md DD-15 (Phase B atomicity, dual failure modes)
 *   - learn-phase3-design-v5.md DD-15 (initial atomic apply contract)
 *
 * Responsibility:
 *   - Generate ULID-shaped attempt_ids for fresh Phase B attempts so cross-
 *     attempt resolution (DD-22) can rely on lexicographic == chronological
 *     ordering.
 *   - Provide builder helpers for the ApplyExecutionState lifecycle:
 *     init → applied / failed / pending updates → status transitions →
 *     persist.
 *   - Wrap REGISTRY.saveToFile so the canonical JSON path is computed once
 *     and the generation counter is enforced to be monotonic.
 *
 * Scope:
 *   - Phase B helper. promoter.ts (Phase A) does not call this.
 *   - This module does NOT decide which decisions to apply; it only mutates
 *     the ApplyExecutionState struct in memory and persists it to disk.
 *   - Atomic write: REGISTRY.saveToFile writes through a temp + rename
 *     dance via the spec-helpers module, so partial-write recovery is
 *     handled at the registry layer.
 *
 * Failure model split (DD-15):
 *   - apply_verification_failed and state_persistence_failed are distinct
 *     terminal states. The latter never reaches a persisted ApplyExecutionState
 *     because, by definition, persistence itself failed — it goes to the
 *     emergency log instead. The discriminator stays in the type so recovery
 *     code can pattern-match exhaustively.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { REGISTRY } from "../shared/artifact-registry.js";
// ---------------------------------------------------------------------------
// ULID generation — DD-22 attempt_id
// ---------------------------------------------------------------------------
/**
 * Crockford base32 alphabet — RFC ULID spec.
 *
 * I = 1-like; L = 1-like; O = 0-like; U = excluded for profanity reasons.
 * These exclusions yield a 32-character set: 0-9 + A-Z minus {I,L,O,U}.
 */
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function encodeBase32(value, length) {
    let v = value;
    const chars = new Array(length);
    for (let i = length - 1; i >= 0; i--) {
        chars[i] = CROCKFORD_BASE32.charAt(Number(v % 32n));
        v /= 32n;
    }
    return chars.join("");
}
/**
 * Generate a ULID (26-character Crockford base32 string).
 *
 * Format:
 *   - Chars 0..9: 48-bit timestamp (ms since epoch) — 10 base32 chars
 *   - Chars 10..25: 80-bit randomness — 16 base32 chars
 *
 * Lexicographic ordering matches chronological ordering by construction.
 * That property is what DD-22 canonical attempt selection relies on.
 *
 * Note: this is a minimal in-tree implementation to avoid pulling in a
 * runtime dependency. If we need monotonic ULIDs (millisecond collisions
 * within a single process), upgrade to the `ulid` npm package.
 */
export function generateUlid() {
    const timestampMs = Date.now();
    const timestampBig = BigInt(timestampMs);
    const tsPart = encodeBase32(timestampBig, 10);
    const randBytes = crypto.randomBytes(10);
    let randBig = 0n;
    for (const byte of randBytes) {
        randBig = (randBig << 8n) | BigInt(byte);
    }
    const randPart = encodeBase32(randBig, 16);
    return tsPart + randPart;
}
// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
/**
 * Canonical path for ApplyExecutionState persistence.
 *
 * sessionRoot is `{projectRoot}/.onto/sessions/promote/{session-id}/`. The
 * filename is fixed so recovery can always discover it without needing
 * extra metadata.
 */
export function getApplyStatePath(sessionRoot) {
    return path.join(sessionRoot, "promote-execution-result.json");
}
/**
 * Construct a fresh ApplyExecutionState for a new attempt.
 *
 * DD-22 lifecycle rule 1: a fresh apply (no --resume) generates a NEW
 * attempt_id. The caller passes one explicitly (when running a deterministic
 * test) or omits it to get a fresh ULID.
 *
 * The state starts in `in_progress` with generation=0 and an empty
 * applied/failed list. The pending list snapshots the decisions the caller
 * is about to apply so recovery can identify which slots were promised.
 */
export function initApplyState(config) {
    const now = new Date().toISOString();
    return {
        schema_version: "1",
        session_id: config.sessionId,
        attempt_id: config.attemptId ?? generateUlid(),
        attempt_started_at: now,
        generation: 0,
        last_updated_at: now,
        status: "in_progress",
        applied_decisions: [],
        failed_decisions: [],
        pending_decisions: [...config.pendingDecisions],
        recoverability_checkpoint_path: config.recoverabilityCheckpointPath ?? null,
    };
}
// ---------------------------------------------------------------------------
// Mutation helpers — pure transforms over the in-memory state
// ---------------------------------------------------------------------------
/**
 * Mark a pending decision as applied. Removes it from `pending_decisions`
 * and appends to `applied_decisions`. Bumps generation + last_updated_at.
 *
 * Throws when the decision_id is not in the pending list — that would mean
 * the caller double-applied or applied an unexpected decision, which is a
 * symptom of a higher-layer bug we want to catch loudly.
 */
export function markApplied(state, applied) {
    const stillPending = state.pending_decisions.filter((p) => !(p.decision_id === applied.decision_id && p.decision_kind === applied.decision_kind));
    if (stillPending.length === state.pending_decisions.length) {
        throw new Error(`apply-state.markApplied: decision ${applied.decision_kind}/${applied.decision_id} ` +
            `not found in pending_decisions (already applied or never declared)`);
    }
    return bump({
        ...state,
        applied_decisions: [...state.applied_decisions, applied],
        pending_decisions: stillPending,
    });
}
/**
 * Mark a pending decision as failed. Same removal/move semantics as
 * markApplied, but the destination is `failed_decisions`.
 *
 * `resumable` records whether the failure can be retried in a `--resume`
 * flow. The caller decides; this helper does not classify.
 */
export function markFailed(state, failed) {
    const stillPending = state.pending_decisions.filter((p) => !(p.decision_id === failed.decision_id && p.decision_kind === failed.decision_kind));
    if (stillPending.length === state.pending_decisions.length) {
        throw new Error(`apply-state.markFailed: decision ${failed.decision_kind}/${failed.decision_id} ` +
            `not found in pending_decisions`);
    }
    return bump({
        ...state,
        failed_decisions: [...state.failed_decisions, failed],
        pending_decisions: stillPending,
    });
}
/**
 * Record verification failures discovered after apply (DD-15
 * apply_verification_failed path).
 */
export function recordVerificationFailures(state, failures) {
    if (failures.length === 0)
        return state;
    return bump({
        ...state,
        verification_failures: [
            ...(state.verification_failures ?? []),
            ...failures,
        ],
    });
}
/**
 * Transition the state's status field. Phase B's terminal transitions are:
 *   in_progress → completed
 *   in_progress → failed_resumable  (one or more applied + recoverable failure)
 *   in_progress → apply_verification_failed (post-apply check failed)
 *
 * `state_persistence_failed` is intentionally rejected here because, by
 * definition, that state never gets persisted — the caller writes an
 * emergency log entry instead.
 */
export function transitionStatus(state, to) {
    if (to === "state_persistence_failed") {
        throw new Error(`apply-state.transitionStatus: state_persistence_failed cannot be ` +
            `persisted into ApplyExecutionState — write to the emergency log instead`);
    }
    return bump({ ...state, status: to });
}
/**
 * Generation + timestamp bump. Every mutation goes through this helper so the
 * monotonic invariant (DD-22) is enforced in one place.
 */
function bump(state) {
    return {
        ...state,
        generation: state.generation + 1,
        last_updated_at: new Date().toISOString(),
    };
}
// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
/**
 * Persist the state to disk via REGISTRY.saveToFile.
 *
 * The registry's saveToFile helper handles atomic write semantics (write to
 * a sibling temp file then rename). On disk failure the caller catches the
 * thrown error and routes it to the emergency log path.
 *
 * Returns the resolved path so callers can record it for audit.
 */
export function persistApplyState(sessionRoot, state) {
    const target = getApplyStatePath(sessionRoot);
    REGISTRY.saveToFile("apply_execution_state", target, state);
    return target;
}
/**
 * Load a previously persisted ApplyExecutionState (for `--resume`).
 *
 * Returns null when the file does not exist (fresh attempt). Throws when
 * the file exists but is structurally invalid — the caller routes that to
 * the recovery path (gatherRecoveryContext + RecoveryResolution).
 */
export function loadApplyState(sessionRoot) {
    const target = getApplyStatePath(sessionRoot);
    // Distinguish "no prior attempt" from "corrupted prior state" — fs probe
    // returns null for the former, REGISTRY.loadFromFile throws for the latter.
    if (!fs.existsSync(target))
        return null;
    return REGISTRY.loadFromFile("apply_execution_state", target);
}
