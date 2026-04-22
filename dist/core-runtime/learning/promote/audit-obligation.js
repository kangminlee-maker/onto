/**
 * AuditObligation — encapsulated class (DD-21).
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-21 (status documented as cache)
 *   - learn-phase3-design-v8.md DD-21 (construction invariants + kernel separation)
 *   - learn-phase3-design-v7.md DD-21 (introduction)
 *
 * Why encapsulation:
 *   - v6 review found that `obligation.status = X` direct assignment was a
 *     latent bug surface. The mandatory transitionObligation() helper relied
 *     on grep-based code review for enforcement.
 *   - DD-21 moves enforcement into the type system: status / status_history /
 *     carry_forward_count are private fields. The TypeScript compiler catches
 *     any mutation attempt as an error.
 *   - v8 added construction invariants so AuditObligation.fromJSON() also
 *     verifies status ↔ status_history consistency. Bad serialized data fails
 *     loudly at deserialization, not at the next transition.
 *
 * Cache documentation (v9 SYN-UF-CONC-01):
 *   #status mirrors #status_history[last].to. This is an intentional cache,
 *   not a duplicate. The constructor enforces the invariant; transition()
 *   updates both atomically; the field is private so external mutation is
 *   impossible. Consumers can use `obligation.status` directly without
 *   re-deriving from history.
 */
import { isLegalTransition, isTerminalStatus, IllegalTransitionError, InvariantViolatedError, } from "../shared/audit-obligation-kernel.js";
export class AuditObligation {
    // Immutable public identity
    obligation_id;
    trigger_kind;
    detected_at;
    detected_after_session;
    affected_agents;
    reason;
    max_carry_forward;
    // Encapsulated mutable state — only mutable through methods on this class
    #status;
    #status_history;
    #carry_forward_count;
    constructor(init) {
        this.obligation_id = init.obligation_id;
        this.trigger_kind = init.trigger_kind;
        this.detected_at = init.detected_at;
        this.detected_after_session = init.detected_after_session;
        this.affected_agents = init.affected_agents;
        this.reason = init.reason;
        this.max_carry_forward = init.max_carry_forward;
        // Initialize status_history (default = single initial transition)
        this.#status_history = init.status_history
            ? [...init.status_history]
            : [
                {
                    from: null,
                    to: "pending",
                    at: init.detected_at,
                    reason: "initial detection",
                    session_id: init.detected_after_session,
                },
            ];
        // Construction invariant 1: status_history must be non-empty
        if (this.#status_history.length === 0) {
            throw new InvariantViolatedError(`AuditObligation ${init.obligation_id}: status_history cannot be empty`);
        }
        // Construction invariant 2: declared status must match the last history entry
        const lastTransition = this.#status_history[this.#status_history.length - 1];
        const declaredStatus = init.status ?? lastTransition.to;
        if (declaredStatus !== lastTransition.to) {
            throw new InvariantViolatedError(`AuditObligation ${init.obligation_id}: declared status (${declaredStatus}) ` +
                `does not match last status_history.to (${lastTransition.to})`);
        }
        this.#status = declaredStatus;
        // Construction invariant 3: carry_forward_count must be non-negative
        this.#carry_forward_count = init.carry_forward_count ?? 0;
        if (this.#carry_forward_count < 0) {
            throw new InvariantViolatedError(`AuditObligation ${init.obligation_id}: carry_forward_count must be >= 0`);
        }
        if (this.max_carry_forward < 0) {
            throw new InvariantViolatedError(`AuditObligation ${init.obligation_id}: max_carry_forward must be >= 0`);
        }
    }
    // Read-only accessors. No setters by design.
    get status() {
        return this.#status;
    }
    get status_history() {
        return this.#status_history;
    }
    get carry_forward_count() {
        return this.#carry_forward_count;
    }
    /**
     * Apply a state transition. Only legal way to change status.
     *
     * Captures `from` BEFORE mutation so the recorded transition reflects the
     * pre-state, not the post-state (avoids the SYN-CONS-01 bug from v5 where a
     * waive transition recorded `from: waived`).
     */
    transition(to, reason, context = {}) {
        const fromStatus = this.#status;
        if (!isLegalTransition(fromStatus, to)) {
            throw new IllegalTransitionError(`Illegal transition: ${fromStatus} → ${to} for obligation ${this.obligation_id}`);
        }
        // Atomic in the sense that both updates happen together.
        this.#status = to;
        const transition = {
            from: fromStatus,
            to,
            at: context.at ?? new Date().toISOString(),
            reason,
        };
        if (context.session_id !== undefined) {
            transition.session_id = context.session_id;
        }
        this.#status_history.push(transition);
    }
    /**
     * Increment carry-forward count. Only legal mutation for this field.
     * Use processCarryForward() in audit-state.ts for the carry-forward DAG;
     * this method exists so other modules can replay the same operation.
     */
    incrementCarryForward() {
        this.#carry_forward_count += 1;
    }
    isTerminal() {
        return isTerminalStatus(this.#status);
    }
    isActive() {
        return !this.isTerminal() && this.#status !== "expired_unattended";
    }
    hasExceededCarryForward() {
        return this.#carry_forward_count > this.max_carry_forward;
    }
    /**
     * Serialize to plain object for persistence.
     * Returns a fresh copy of arrays so the caller cannot mutate internal state.
     */
    toJSON() {
        return {
            obligation_id: this.obligation_id,
            trigger_kind: this.trigger_kind,
            detected_at: this.detected_at,
            detected_after_session: this.detected_after_session,
            affected_agents: [...this.affected_agents],
            reason: this.reason,
            max_carry_forward: this.max_carry_forward,
            status: this.#status,
            status_history: this.#status_history.map((t) => ({ ...t })),
            carry_forward_count: this.#carry_forward_count,
        };
    }
    /**
     * Deserialize from plain object. Constructor invariants enforce structural
     * consistency, so corrupted ledger entries fail loudly here rather than at
     * the next transition.
     */
    static fromJSON(data) {
        if (data === null || typeof data !== "object") {
            throw new InvariantViolatedError(`AuditObligation.fromJSON: data is not an object`);
        }
        // Check required fields explicitly so deserialization mismatches throw
        // (NQ-21 / v9 §14.3 recommendation: explicit throw, no defaults).
        const required = [
            "obligation_id",
            "trigger_kind",
            "detected_at",
            "detected_after_session",
            "affected_agents",
            "reason",
            "max_carry_forward",
            "status",
            "status_history",
            "carry_forward_count",
        ];
        const dataRecord = data;
        for (const field of required) {
            if (dataRecord[field] === undefined) {
                throw new InvariantViolatedError(`AuditObligation.fromJSON: missing required field "${field}" ` +
                    `(obligation_id=${data.obligation_id ?? "<unknown>"})`);
            }
        }
        return new AuditObligation({
            obligation_id: data.obligation_id,
            trigger_kind: data.trigger_kind,
            detected_at: data.detected_at,
            detected_after_session: data.detected_after_session,
            affected_agents: data.affected_agents,
            reason: data.reason,
            max_carry_forward: data.max_carry_forward,
            status: data.status,
            status_history: data.status_history,
            carry_forward_count: data.carry_forward_count,
        });
    }
}
