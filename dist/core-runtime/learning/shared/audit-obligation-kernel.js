/**
 * AuditObligation kernel — pure types and constants (DD-21 SYN-D1).
 *
 * Design authority: learn-phase3-design-v9.md DD-21, learn-phase3-design-v8.md DD-21.
 *
 * This module is intentionally dependency-free (no I/O, no class, no other
 * modules from learning/). Other modules import enums/types from here so the
 * dependency graph stays low and AuditObligation class can sit above this.
 *
 * Why kernel separation:
 *   1. Lowers import coupling — modules that need only the type/enum (e.g., a
 *      reporter that prints a status) do not transitively depend on the class.
 *   2. Construction invariants in AuditObligation can reuse these constants
 *      without circular import risk.
 *   3. v6 review's dependency-03 finding: obligation kernel was seated too high.
 */
/**
 * Legal transition matrix (DD-17 + EXPIRED-UNATTENDED-01 fix in v6 review).
 *
 * Rationale:
 *   - pending: initial active state. Can move into in_progress, be waived, or
 *     expire unattended (carry-forward exhausted before P-14 picked it up).
 *   - in_progress: P-14 is currently processing. Terminates as fulfilled,
 *     transient blocked, or no_eligible_agents (irrecoverable).
 *   - blocked: transient failure (LLM timeout, etc.). Re-enters pending on the
 *     next promote, may also be waived or expire.
 *   - no_eligible_agents / fulfilled / waived: terminal.
 *   - expired_unattended: ledger-visible but not strictly terminal — operator
 *     may waive it after manual review.
 *
 * v6 review found that pending/blocked → expired_unattended ingress was missing
 * from the legal transition matrix; v9 makes it explicit so the carry-forward
 * exhaustion path is enforceable.
 */
export const LEGAL_TRANSITIONS = {
    pending: ["in_progress", "waived", "expired_unattended"],
    in_progress: ["fulfilled", "blocked", "no_eligible_agents"],
    blocked: ["pending", "fulfilled", "waived", "expired_unattended"],
    no_eligible_agents: [],
    fulfilled: [],
    waived: [],
    expired_unattended: ["waived"],
};
export function isLegalTransition(from, to) {
    return LEGAL_TRANSITIONS[from].includes(to);
}
/**
 * Strictly terminal statuses — no outgoing legal transitions.
 *
 * Note: expired_unattended is intentionally NOT included here because the
 * operator can waive it. Use isStrictlyTerminal() if you need the strict set,
 * or check `isActive()` on the AuditObligation class for active/inactive.
 */
export const TERMINAL_STATUSES = new Set([
    "fulfilled",
    "no_eligible_agents",
    "waived",
]);
export function isTerminalStatus(status) {
    return TERMINAL_STATUSES.has(status);
}
export class IllegalTransitionError extends Error {
    constructor(message) {
        super(message);
        this.name = "IllegalTransitionError";
    }
}
export class InvariantViolatedError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvariantViolatedError";
    }
}
