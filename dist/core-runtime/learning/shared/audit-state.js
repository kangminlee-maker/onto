/**
 * Audit state ledger — DD-17.
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-17
 *   - learn-phase3-design-v6.md DD-17 (lifecycle definitions)
 *   - learn-phase3-design-v8.md DD-21 (class boundary, no transition helper)
 *
 * Responsibility:
 *   - Load/save the obligation ledger via REGISTRY
 *   - Carry-forward processing (DD-17 lifecycle)
 *   - Detect new obligations from PromoteReport thresholds
 *
 * Class boundary:
 *   - On disk we use AuditStateJSON (plain). In memory we hold AuditObligation
 *     class instances so DD-21 invariants are enforced.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REGISTRY } from "./artifact-registry.js";
import { AuditObligation } from "../promote/audit-obligation.js";
export const DEFAULT_AUDIT_STATE_PATH = path.join(os.homedir(), ".onto", "audit-state.yaml");
export const DEFAULT_MAX_CARRY_FORWARD = 3;
export function getAuditStatePath(ontoHome) {
    if (ontoHome) {
        return path.join(ontoHome, "audit-state.yaml");
    }
    return DEFAULT_AUDIT_STATE_PATH;
}
/**
 * Load audit state. If the file does not exist returns an empty ledger so
 * fresh users do not need to bootstrap manually.
 */
export function loadAuditState(filePath) {
    const target = filePath ?? DEFAULT_AUDIT_STATE_PATH;
    if (!fs.existsSync(target)) {
        return { schema_version: "1", obligations: [] };
    }
    const json = REGISTRY.loadFromFile("audit_state", target);
    return {
        schema_version: "1",
        obligations: json.obligations.map((j) => AuditObligation.fromJSON(j)),
    };
}
export function saveAuditState(state, filePath) {
    const target = filePath ?? DEFAULT_AUDIT_STATE_PATH;
    const json = {
        schema_version: "1",
        obligations: state.obligations.map((o) => o.toJSON()),
    };
    REGISTRY.saveToFile("audit_state", target, json);
}
// ---------------------------------------------------------------------------
// Carry-forward processing
// ---------------------------------------------------------------------------
/**
 * Advance the carry-forward count for all active (pending/blocked) obligations.
 *
 * Lifecycle (DD-17):
 *   - blocked → pending automatically (re-entry on next promote)
 *   - pending obligations whose count exceeds max_carry_forward → expired_unattended
 *
 * `expired_unattended` is intentionally NOT a terminal state — the operator
 * can waive it. This visibility is the v6 SYN-D-01 fix: silent cleanup was
 * a governance defect, so the obligation stays on the ledger until explicitly
 * resolved.
 */
export function processCarryForward(state, sessionId) {
    for (const ob of state.obligations) {
        if (ob.status !== "pending" && ob.status !== "blocked")
            continue;
        ob.incrementCarryForward();
        if (ob.hasExceededCarryForward()) {
            ob.transition("expired_unattended", `carry_forward_count (${ob.carry_forward_count}) exceeded max ` +
                `(${ob.max_carry_forward})`, { session_id: sessionId });
            continue;
        }
        if (ob.status === "blocked") {
            ob.transition("pending", `Re-entry from blocked (carry_forward ${ob.carry_forward_count})`, { session_id: sessionId });
        }
    }
    return state;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function findObligation(state, obligationId) {
    return state.obligations.find((o) => o.obligation_id === obligationId);
}
export function getExpiredUnattended(state) {
    return state.obligations.filter((o) => o.status === "expired_unattended");
}
export function getActiveObligations(state) {
    return state.obligations.filter((o) => o.isActive());
}
export function countCarriedForward(state) {
    return state.obligations.filter((o) => o.carry_forward_count > 0).length;
}
