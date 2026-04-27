// runtime-mirror-of: step-4-integration §3.1 + §3.5 + §3.5.1 + §3.5.2 + §3.6 + §3.8.1
//
// Phase 3.5 runtime (W-A-93). Runtime sole-writer (LLM 불개입, §3.8).
//
// Step sequencing (§3.5):
//   1.   Unresolved conflicts (v0)               — out of scope here
//   1.5. Rationale decisions validation (W-A-93) — §3.5.1 6-check
//   2.   Rationale decisions apply (W-A-93)      — §3.1 action-first matrix
//   3-4. v0 (Other adjustments)                  — out of scope
//   5.   Atomicity (single fsync)                — caller responsibility
//   6.   Invariants (rationale_state terminal)   — §3.8.1 enforced post-apply
//   7.   v0 (Pending-certainty promotion)        — out of scope
//   8.   carry_forward sweep (W-A-93)            — §3.5.2

import {
  detectStaleElements,
  type Phase3SnapshotDocument,
} from "./phase3-snapshot-write.js";
import { TERMINAL_RATIONALE_STATES } from "./wip-element-types.js";
import type {
  IntentInference,
  RationaleState,
} from "./wip-element-types.js";

// ============================================================================
// §3.6 phase3_user_responses schema
// ============================================================================

export type RationaleAction =
  | "accept"
  | "reject"
  | "modify"
  | "defer"
  | "provide_rationale"
  | "mark_acceptable_gap"
  | "override";

export type BatchAction = "accept" | "reject" | "defer" | "mark_acceptable_gap";

export interface PrincipalProvidedRationale {
  inferred_meaning: string;
  justification: string;
}

export interface RationaleDecision {
  element_id: string;
  action: RationaleAction;
  principal_provided_rationale?: PrincipalProvidedRationale;
  principal_note?: string | null;
  decided_at: string;
}

export type BatchTargetGroupKind =
  | "pack_missing_area"
  | "rationale_state"
  | "rationale_state_with_confidence"
  | "rationale_state_single_gate";

export interface BatchActionEntry {
  action: BatchAction;
  target_group: {
    kind: BatchTargetGroupKind;
    manifest_ref?: string | null;
    heading?: string | null;
    rationale_state?: string | null;
    confidence?: string | null;
  };
  target_element_ids: string[];
  decided_at: string;
}

export interface Phase3UserResponses {
  received_at: string;
  global_reply: "confirmed" | "see below";
  rationale_decisions: RationaleDecision[];
  batch_actions: BatchActionEntry[];
  // v0 fields (not modeled here — out of W-A-93 scope)
}

// ============================================================================
// §3.1 action-first canonical matrix
// ============================================================================

/**
 * Returns the terminal RationaleState for a given (action, source_state) pair,
 * or null if the combination is invalid (UI should never produce, runtime
 * rejects via validator step 4).
 */
export function actionToTerminal(
  action: RationaleAction,
  source: RationaleState,
): RationaleState | null {
  switch (action) {
    case "accept":
      if (source === "reviewed" || source === "proposed") return "principal_accepted";
      if (source === "domain_scope_miss") return "principal_confirmed_scope_miss";
      return null;
    case "reject":
      if (source === "reviewed" || source === "proposed") return "principal_rejected";
      return null;
    case "modify":
      if (source === "reviewed" || source === "proposed") return "principal_modified";
      return null;
    case "defer":
      if (
        source === "reviewed" ||
        source === "proposed" ||
        source === "gap" ||
        source === "domain_pack_incomplete" ||
        source === "domain_scope_miss" ||
        source === "empty"
      ) {
        return "principal_deferred";
      }
      return null;
    case "provide_rationale":
      if (source === "gap" || source === "domain_pack_incomplete" || source === "empty") {
        return "principal_modified";
      }
      return null;
    case "mark_acceptable_gap":
      if (source === "gap" || source === "domain_pack_incomplete" || source === "empty") {
        return "principal_accepted_gap";
      }
      return null;
    case "override":
      if (source === "domain_scope_miss") return "principal_modified";
      return null;
  }
}

const BATCHABLE_ACTIONS = new Set<RationaleAction>([
  "accept",
  "reject",
  "defer",
  "mark_acceptable_gap",
]);

/** Actions requiring per-element principal_provided_rationale */
const RATIONALE_REQUIRED_ACTIONS = new Set<RationaleAction>([
  "modify",
  "provide_rationale",
  "override",
]);

// ============================================================================
// §3.5.1 step 1.5 validation (6-check)
// ============================================================================

export type Phase35ValidationFailureCode =
  | "phase_3_5_input_invalid"
  | "phase_3_5_input_incomplete";

export interface Phase35ValidationInput {
  responses: Phase3UserResponses;
  /** wip.yml elements id → current intent_inference */
  currentInferences: Map<string, IntentInference | undefined>;
  /** Phase 3 rendering 시점 snapshot — stale check base */
  snapshot: Phase3SnapshotDocument;
  /** rationale-queue.yaml entries — see-below mode 의 throttled_out check */
  renderedElementIds: Set<string>;
  /** rationale-queue.yaml entries 중 throttled_out + non-domain_scope_miss */
  throttledOutAddressableIds: Set<string>;
}

export type Phase35ValidationResult =
  | { ok: true }
  | { ok: false; code: Phase35ValidationFailureCode; detail: string };

export function validatePhase35Input(
  input: Phase35ValidationInput,
): Phase35ValidationResult {
  const seenIndividual = new Set<string>();

  // 1. Schema-ish validation + duplicate
  for (const d of input.responses.rationale_decisions) {
    if (typeof d.element_id !== "string" || d.element_id === "") {
      return invalid("rationale_decisions[].element_id missing");
    }
    if (typeof d.action !== "string") {
      return invalid(`rationale_decisions[${d.element_id}].action missing`);
    }
    if (seenIndividual.has(d.element_id)) {
      return invalid(`duplicate element_id in rationale_decisions: ${d.element_id}`);
    }
    seenIndividual.add(d.element_id);

    // 6. principal_provided_rationale required for modify / provide_rationale / override
    if (RATIONALE_REQUIRED_ACTIONS.has(d.action)) {
      const ppr = d.principal_provided_rationale;
      if (
        !ppr ||
        typeof ppr.inferred_meaning !== "string" ||
        ppr.inferred_meaning === "" ||
        typeof ppr.justification !== "string" ||
        ppr.justification === ""
      ) {
        return invalid(
          `rationale_decisions[${d.element_id}] action=${d.action} requires principal_provided_rationale`,
        );
      }
    }
  }

  // 2. Target existence + 4. action × source state compat (matrix lookup)
  for (const d of input.responses.rationale_decisions) {
    const inf = input.currentInferences.get(d.element_id);
    if (!inf) {
      return invalid(
        `rationale_decisions[${d.element_id}] target not in wip.elements[]`,
      );
    }
    const terminal = actionToTerminal(d.action, inf.rationale_state);
    if (terminal === null) {
      return invalid(
        `rationale_decisions[${d.element_id}] action=${d.action} invalid for source=${inf.rationale_state}`,
      );
    }
  }

  // 3. Source state currency (snapshot stale check)
  const stale = detectStaleElements(input.snapshot, input.currentInferences);
  if (stale.length > 0) {
    return invalid(
      `stale elements detected (snapshot mismatch): ${stale.join(", ")}`,
    );
  }

  // 5. Batch normalization + per-element compat
  for (const b of input.responses.batch_actions) {
    if (!BATCHABLE_ACTIONS.has(b.action)) {
      return invalid(`batch_actions[].action=${b.action} not batchable`);
    }
    for (const id of b.target_element_ids) {
      const inf = input.currentInferences.get(id);
      if (!inf) {
        return invalid(`batch_actions target ${id} not in wip.elements[]`);
      }
      const terminal = actionToTerminal(b.action, inf.rationale_state);
      if (terminal === null) {
        return invalid(
          `batch_actions[${id}] action=${b.action} invalid for source=${inf.rationale_state}`,
        );
      }
    }
  }

  // §3.6 see-below mode — v1 narrow scope (PR #232 r3 fix-up alignment):
  //   * Implementation checks the *throttled-out addressable* subset only (Hook δ
  //     `throttled_out` bucket × non-domain_scope_miss). If 1+ such element is
  //     unaddressed by per-item/batch action → phase_3_5_input_incomplete halt.
  //   * Step 4 §3.6 r4 spec calls for *every* pending intent_inference element
  //     (full-scope cover); the v1 implementation deliberately narrows this to
  //     throttled-out scope. The narrow ↔ full-scope reconciliation is a v1.1
  //     backlog (protocol amendment narrowing r4 OR implementation widening
  //     to all pending). Mirror seats: `.onto/processes/reconstruct.md` line
  //     1059~1071 wip schema comment + line 1679 §3.5.1 본문.
  if (input.responses.global_reply === "see below") {
    const addressed = new Set<string>();
    for (const d of input.responses.rationale_decisions) addressed.add(d.element_id);
    for (const b of input.responses.batch_actions) {
      for (const id of b.target_element_ids) addressed.add(id);
    }
    const unaddressedThrottled: string[] = [];
    for (const id of input.throttledOutAddressableIds) {
      if (!addressed.has(id)) unaddressedThrottled.push(id);
    }
    if (unaddressedThrottled.length > 0) {
      return {
        ok: false,
        code: "phase_3_5_input_incomplete",
        detail: `see-below mode: ${unaddressedThrottled.length} throttled_out element(s) unaddressed: ${unaddressedThrottled.slice(0, 5).join(", ")}${unaddressedThrottled.length > 5 ? "..." : ""}`,
      };
    }
  }

  return { ok: true };
}

function invalid(detail: string): Phase35ValidationResult {
  return { ok: false, code: "phase_3_5_input_invalid", detail };
}

// ============================================================================
// §3.5 step 2 — rationale decisions apply
// ============================================================================

export interface Phase35ApplyResult {
  /** element_id → updated intent_inference */
  updates: Map<string, IntentInference>;
  /** ids covered by per-item or batch action (excluded from sweep) */
  excludedFromSweep: Set<string>;
}

export interface Phase35ApplyInput {
  responses: Phase3UserResponses;
  currentInferences: Map<string, IntentInference>;
  /** ISO 8601 UTC — populate principal_judged_at for all per-item/batch decisions */
  judgedAt: string;
}

export function applyRationaleDecisions(
  input: Phase35ApplyInput,
): Phase35ApplyResult {
  const updates = new Map<string, IntentInference>();
  const excluded = new Set<string>();

  // 1. rationale_decisions[] (individual) — 우선 (§3.6 step 3)
  for (const d of input.responses.rationale_decisions) {
    const prior = input.currentInferences.get(d.element_id);
    if (!prior) continue; // validated, but defensive
    const terminal = actionToTerminal(d.action, prior.rationale_state);
    if (terminal === null) continue;
    updates.set(
      d.element_id,
      applyToElement(prior, terminal, d, input.judgedAt),
    );
    excluded.add(d.element_id);
  }

  // 2. batch_actions[] — individual 의 element_id 와 겹치면 individual 우선 (skip)
  for (const b of input.responses.batch_actions) {
    for (const id of b.target_element_ids) {
      if (excluded.has(id)) continue;
      const prior = input.currentInferences.get(id);
      if (!prior) continue;
      const terminal = actionToTerminal(b.action, prior.rationale_state);
      if (terminal === null) continue;
      updates.set(id, applyBatch(prior, terminal, b, input.judgedAt));
      excluded.add(id);
    }
  }

  return { updates, excludedFromSweep: excluded };
}

function applyToElement(
  prior: IntentInference,
  terminal: RationaleState,
  decision: RationaleDecision,
  judgedAt: string,
): IntentInference {
  const next: IntentInference = {
    ...prior,
    rationale_state: terminal,
    provenance: {
      ...prior.provenance,
      principal_judged_at: judgedAt,
    },
  };

  // For modify / provide_rationale / override: replace inferred_meaning + justification
  if (
    decision.action === "modify" ||
    decision.action === "provide_rationale" ||
    decision.action === "override"
  ) {
    const ppr = decision.principal_provided_rationale!;
    next.inferred_meaning = ppr.inferred_meaning;
    next.justification = ppr.justification;
    delete next.state_reason;
  }

  return next;
}

function applyBatch(
  prior: IntentInference,
  terminal: RationaleState,
  _batch: BatchActionEntry,
  judgedAt: string,
): IntentInference {
  // batchable actions: accept / reject / defer / mark_acceptable_gap — none
  // require principal_provided_rationale, so we just transition state +
  // populate principal_judged_at.
  return {
    ...prior,
    rationale_state: terminal,
    provenance: {
      ...prior.provenance,
      principal_judged_at: judgedAt,
    },
  };
}

// ============================================================================
// §3.5.2 carry_forward sweep
// ============================================================================

const SWEEPABLE_SOURCE_STATES = new Set<RationaleState>([
  "reviewed",
  "proposed",
  "gap",
  "domain_pack_incomplete",
  "empty",
]);

export interface Phase35SweepInput {
  globalReply: "confirmed" | "see below";
  currentInferences: Map<string, IntentInference>;
  excludedFromSweep: Set<string>;
}

export interface Phase35SweepResult {
  updates: Map<string, IntentInference>;
}

/**
 * §3.5.2 carry_forward sweep (r3 fix — capture original_state before overwrite).
 *
 * For every element whose:
 *   - rationale_state ∈ {reviewed, proposed, gap, domain_pack_incomplete, empty}
 *   - element_id NOT in excludedFromSweep (rationale_decisions ∪ batch_actions targets)
 *   - global_reply == "confirmed"
 *
 * Capture original_state, write provenance.carry_forward_from = original_state,
 * write provenance.principal_judged_at = null, write rationale_state = "carry_forward".
 *
 * Returns updates map (only for elements actually swept).
 */
export function carryForwardSweep(
  input: Phase35SweepInput,
): Phase35SweepResult {
  const updates = new Map<string, IntentInference>();
  if (input.globalReply !== "confirmed") return { updates };

  for (const [id, inf] of input.currentInferences.entries()) {
    if (input.excludedFromSweep.has(id)) continue;
    if (!SWEEPABLE_SOURCE_STATES.has(inf.rationale_state)) continue;

    // r3 fix — capture before overwrite
    const original_state = inf.rationale_state;

    updates.set(id, {
      ...inf,
      rationale_state: "carry_forward",
      provenance: {
        ...inf.provenance,
        carry_forward_from: original_state,
        principal_judged_at: null,
      },
    });
  }

  return { updates };
}

// ============================================================================
// Top-level orchestration: validate → apply → sweep
// ============================================================================

export type Phase35RuntimeResult =
  | {
      ok: true;
      /** combined updates map (rationale_decisions + batch_actions + sweep) */
      elementUpdates: Map<string, IntentInference>;
      /** for audit / debugging */
      excludedFromSweep: Set<string>;
    }
  | {
      ok: false;
      validationFailure: Phase35ValidationResult & { ok: false };
    };

/**
 * §3.5 lifecycle: **validate → apply → sweep** (review consensus blocker).
 *
 * fail-closed: validatePhase35Input 가 ok=false 이면 apply/sweep 진입하지 않고
 * 즉시 validationFailure return. 이로써 invalid input 이 wip 에 mutation 되는
 * 경로 차단 — review 가 지적한 "validate 가 caller 책임" gap 해소.
 *
 * Caller (Runtime Coordinator) 의 책임은 validatePhase35Input 의 4 input
 * (responses / currentInferences / snapshot / renderedElementIds /
 * throttledOutAddressableIds) 을 build 하여 본 함수에 전달.
 */
export function runPhase35(
  input: Phase35ApplyInput & {
    snapshot: Phase35ValidationInput["snapshot"];
    renderedElementIds: Phase35ValidationInput["renderedElementIds"];
    throttledOutAddressableIds: Phase35ValidationInput["throttledOutAddressableIds"];
  },
): Phase35RuntimeResult {
  // step 1.5 validate (review consensus blocker — runtime fail-closed)
  const validation = validatePhase35Input({
    responses: input.responses,
    currentInferences: input.currentInferences,
    snapshot: input.snapshot,
    renderedElementIds: input.renderedElementIds,
    throttledOutAddressableIds: input.throttledOutAddressableIds,
  });
  if (!validation.ok) {
    return { ok: false, validationFailure: validation };
  }

  // step 2 apply
  const apply = applyRationaleDecisions(input);

  // Build "after-apply" snapshot for sweep — current state + apply updates
  const afterApply = new Map(input.currentInferences);
  for (const [id, inf] of apply.updates.entries()) {
    afterApply.set(id, inf);
  }

  // step 8 sweep
  const sweep = carryForwardSweep({
    globalReply: input.responses.global_reply,
    currentInferences: afterApply,
    excludedFromSweep: apply.excludedFromSweep,
  });

  // sweep.updates 가 apply.updates 와 겹치지 않음 (sweep 은 excluded 에서만 동작)
  const combined = new Map(apply.updates);
  for (const [id, inf] of sweep.updates.entries()) combined.set(id, inf);

  // §3.8.1 invariant: post-apply + sweep 후 모든 element 가 terminal state 여야 함
  void TERMINAL_RATIONALE_STATES;

  return {
    ok: true,
    elementUpdates: combined,
    excludedFromSweep: apply.excludedFromSweep,
  };
}
