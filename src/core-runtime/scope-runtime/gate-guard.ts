import type {
  Event,
  EventType,
  State,
  Actor,
  ScopeState,
  ConstraintDecisionRecordedPayload,
  ConstraintClarifyRequestedPayload,
  ConstraintClarifyResolvedPayload,
  ConstraintInvalidatedPayload,
  SurfaceChangeRequiredPayload,
  ValidationCompletedPayload,
} from "./types.js";
import { resolveTransition } from "./state-machine.js";
import { MAX_COMPILE_RETRIES, MAX_EXPLORATION_ROUNDS } from "./constants.js";
import { findConstraint, isConstraintsResolved } from "./constraint-pool.js";

// ─── Actor validation mapping ───

/**
 * Allowed actors per event type.
 *
 * Events not listed here are allowed for ALL actors (gradual adoption).
 * This mapping encodes the intended actor constraints:
 * - user: human PO actions (scope creation, locking, decisions)
 * - system: automated pipeline actions (grounding, compile, surface generation)
 * - agent: AI-driven actions (apply, validation, constraint discovery/decisions)
 */
export const ACTOR_MAPPING: Partial<Record<string, ReadonlySet<Actor>>> = {
  // User-initiated events
  "scope.created":                new Set(["user"]),
  "scope.closed":                 new Set(["user"]),
  "surface.confirmed":            new Set(["user"]),
  "align.locked":                 new Set(["user"]),

  // User or agent decisions
  "constraint.decision_recorded": new Set(["user", "agent"]),
  "constraint.clarify_resolved":  new Set(["user", "agent"]),

  // System-initiated pipeline events (user allowed for gradual adoption)
  "grounding.started":            new Set(["system", "user"]),
  "grounding.completed":          new Set(["system", "user"]),
  "compile.started":              new Set(["system", "user"]),
  "compile.completed":            new Set(["system", "user"]),
  "surface.generated":            new Set(["system", "user"]),

  // Agent-driven actions (user allowed for gradual adoption)
  "apply.started":                new Set(["agent", "user"]),
  "apply.completed":              new Set(["agent", "user"]),
  "validation.started":           new Set(["agent", "user"]),
  "validation.completed":         new Set(["agent", "user"]),

  // Mixed actors
  "constraint.discovered":        new Set(["system", "agent", "user"]),
  "align.proposed":               new Set(["system", "user"]),
  "align.revised":                new Set(["system", "user"]),
  "exploration.started":            new Set(["agent", "system"]),
  "exploration.round_completed":    new Set(["agent", "system"]),
  "exploration.phase_transitioned": new Set(["agent", "system"]),
};

// ─── Result type ───

export type GateResult =
  | { allowed: true; next_state: State }
  | { allowed: false; reason: string };

// ─── Gate options (caller-provided context) ───

export interface GateOptions {
  apply_enabled?: boolean | undefined;
}

// ─── Events that reference a constraint_id ───

const CONSTRAINT_REF_EVENTS = new Set<string>([
  "constraint.decision_recorded",
  "constraint.clarify_requested",
  "constraint.clarify_resolved",
  "constraint.invalidated",
  "surface.change_required",
]);

// ─── Events blocked during convergence ───

const CONVERGENCE_BLOCKED_EVENTS = new Set<string>([
  "align.revised",
  "surface.revision_applied",
]);

// ─── Main validation function ───

/**
 * Validate an event before appending to the event store.
 *
 * Checks rules in order:
 * 1. State transition authorization (state machine matrix)
 * 2. Referential integrity (constraint_id existence)
 * 3. Required override validation (rationale required)
 * 3b. Required constraint invalidation protection [GC-017]
 * 4. Convergence blocking (revise blocked after convergence.blocked)
 * 5a. Apply gate (apply_enabled in config)
 * 5c. Pre-Apply Review gate (pre_apply.review_completed required before apply)
 * 5b. Compile retry limit (compile.started blocked after 3 gap_found cycles)
 *
 * On success, returns the determined next_state (resolving conditional targets).
 * On failure, returns the reason for rejection.
 */
export function validateEvent(
  state: ScopeState,
  newEvent: Event,
  options?: GateOptions,
): GateResult {
  const eventType = newEvent.type;

  // ── Special case: scope.created is a bootstrap event ──
  // Not in the state machine matrix. Allowed only when no events exist yet.
  if (eventType === "scope.created") {
    if (state.latest_revision === 0) {
      return { allowed: true, next_state: "draft" };
    }
    return {
      allowed: false,
      reason: `scope.created is only allowed as the first event (current revision: ${state.latest_revision})`,
    };
  }

  // ── Rule 0: Actor validation ──
  const allowedActors = ACTOR_MAPPING[eventType];
  if (allowedActors && !allowedActors.has(newEvent.actor)) {
    return {
      allowed: false,
      reason: `Actor denied: "${newEvent.actor}" is not allowed for "${eventType}". Allowed: ${[...allowedActors].join(", ")}`,
    };
  }

  // ── Rule 1: State transition authorization ──
  const outcome = resolveTransition(state.current_state, eventType);
  if (!outcome.allowed) {
    return {
      allowed: false,
      reason: `Transition denied: "${state.current_state}" does not allow "${eventType}"`,
    };
  }

  // ── Rule 2: Referential integrity ──
  if (CONSTRAINT_REF_EVENTS.has(eventType)) {
    const constraintId = extractConstraintId(newEvent);
    if (constraintId !== undefined) {
      const entry = findConstraint(state.constraint_pool, constraintId);
      if (!entry) {
        return {
          allowed: false,
          reason: `Referential integrity: constraint_id "${constraintId}" not found in pool`,
        };
      }

      // ── Rule 3: Required override validation ──
      if (
        eventType === "constraint.decision_recorded" ||
        eventType === "constraint.clarify_resolved"
      ) {
        const decision = (newEvent.payload as { decision: string }).decision;
        if (
          entry.severity === "required" &&
          decision === "override"
        ) {
          const rationale = (newEvent.payload as { rationale?: string }).rationale;
          if (!rationale || rationale.trim() === "") {
            return {
              allowed: false,
              reason: `Required constraint "${constraintId}" with override decision requires non-empty rationale`,
            };
          }
        }
      }

      // ── Rule 3b: Required constraint invalidation protection [GC-017] ──
      if (
        eventType === "constraint.invalidated" &&
        entry.severity === "required" &&
        newEvent.actor === "system"
      ) {
        return {
          allowed: false,
          reason: `Required constraint "${constraintId}" cannot be invalidated by system alone. User confirmation is required.`,
        };
      }
    }
  }

  // ── Rule 4: Convergence blocking ──
  if (
    state.convergence_blocked &&
    CONVERGENCE_BLOCKED_EVENTS.has(eventType)
  ) {
    return {
      allowed: false,
      reason: `Convergence blocked: cannot "${eventType}" until convergence.action_taken is recorded`,
    };
  }

  // ── Rule 5a: Apply gate — requires apply_enabled in .sprint-kit.yaml ──
  // post-PR #246 R1 (Phase B Step 4): process entry mode 는 코드 변경이 없으므로
  // .sprint-kit.yaml apply_enabled 게이트 적용 대상이 아님.
  if (eventType === "apply.started" && state.entry_mode !== "process" && options?.apply_enabled !== true) {
    return {
      allowed: false,
      reason: "Apply gate: apply 단계를 실행하려면 .sprint-kit.yaml에 apply_enabled: true를 추가하세요.",
    };
  }

  // ── Rule 5c: Pre-Apply Review gate — apply requires pre_apply.review_completed ──
  // post-PR #246 R1: process mode 는 code-product brownfield/policy/logic 점검이
  // 무의미하므로 Pre-Apply Review 게이트 미적용.
  if (eventType === "apply.started" && state.entry_mode !== "process" && !state.pre_apply_completed) {
    return {
      allowed: false,
      reason: "Apply gate: Pre-Apply Review가 완료되어야 합니다. pre_apply.review_completed 이벤트가 먼저 기록되어야 합니다.",
    };
  }

  // ── Rule 5d: PRD Review gate — apply requires prd.review_completed ──
  // post-PR #246 R1: process mode 는 code-product 다관점 리뷰가 무의미.
  if (eventType === "apply.started" && state.entry_mode !== "process" && !state.prd_review_completed) {
    return {
      allowed: false,
      reason: "Apply gate: PRD 다관점 리뷰가 완료되어야 합니다. prd.review_completed 이벤트가 먼저 기록되어야 합니다.",
    };
  }

  // ── Rule 5e: Process apply scope — apply.started/completed from surface_confirmed
  //              requires entry_mode === "process" (code-product 는 compile 경유) ──
  if (
    (eventType === "apply.started" || eventType === "apply.completed") &&
    state.current_state === "surface_confirmed" &&
    state.entry_mode !== "process"
  ) {
    return {
      allowed: false,
      reason: `Apply gate: surface_confirmed 에서 apply 진입은 process entry mode 만 가능합니다. 현재 entry_mode=${state.entry_mode} 는 compile 단계를 거쳐야 합니다.`,
    };
  }

  // ── Rule 5f: apply.completed lifecycle lineage — preceding apply.started 필수 ──
  //
  // post-PR #246 R1 review (CONS-1 9/9 consensus): state machine 이 surface_confirmed
  // / compiled 양쪽에서 apply.completed 를 forward 로 허용하므로, naïve caller 가
  // apply.started 없이 곧장 apply.completed 를 emit 하면 ledger 상에 lifecycle
  // 시작점이 없는 채로 state 가 applied 로 진입할 수 있다. lifecycle marker
  // (state.apply_started_pending) 으로 직전 apply.started 의 존재를 보장.
  if (eventType === "apply.completed" && !state.apply_started_pending) {
    return {
      allowed: false,
      reason: "Apply gate: apply.completed 는 직전 apply.started 가 기록된 상태에서만 가능합니다. 먼저 apply.started 이벤트를 기록하세요.",
    };
  }

  // ── Rule 5g: process scope apply.completed 는 process_artifact 필수 ──
  //
  // post-round 2 review (NEW-CONS-1 9/9 consensus): process mode 가 surface_confirmed
  // 에서 apply.completed 로 advance 가능한데, 단순히 apply.started 가 선행됐다는
  // 것만으론 *commit_design_doc 의 invariant* (design doc 이 development-records
  // 에 commit 됐고 git custody chain 이 닫혔음) 가 보장되지 않는다. naïve caller
  // 가 commit_design_doc 우회로 process scope 를 applied 로 advance 시킬 수
  // 있는 영역. payload 의 process_artifact 가 채워진 경우만 허용 → commit_design_doc
  // 만이 process scope 의 apply 경로가 됨.
  if (
    eventType === "apply.completed" &&
    state.current_state === "surface_confirmed" &&
    state.entry_mode === "process"
  ) {
    const payload = newEvent.payload as { process_artifact?: { source_path?: unknown; destination_path?: unknown; destination_hash?: unknown; commit_message?: unknown; commit_sha?: unknown } };
    const artifact = payload.process_artifact;
    if (
      !artifact ||
      typeof artifact.source_path !== "string" ||
      typeof artifact.destination_path !== "string" ||
      typeof artifact.destination_hash !== "string" ||
      typeof artifact.commit_message !== "string" ||
      typeof artifact.commit_sha !== "string"
    ) {
      return {
        allowed: false,
        reason: "Apply gate: process scope 의 apply.completed 는 process_artifact (source_path / destination_path / destination_hash / commit_message / commit_sha) 가 모두 기록되어야 합니다. commit_design_doc action 으로 호출하세요.",
      };
    }
  }

  // ── Rule 5b: Compile retry limit ──
  if (
    eventType === "compile.started" &&
    state.retry_count_compile >= MAX_COMPILE_RETRIES
  ) {
    return {
      allowed: false,
      reason: `Compile retry limit exceeded (${state.retry_count_compile} gap_found cycles). Consider scope.deferred or redirect.to_align.`,
    };
  }

  // ── Rule 6: target.locked requires all constraints resolved ──
  if (eventType === "target.locked" && !isConstraintsResolved(state.constraint_pool)) {
    const { summary } = state.constraint_pool;
    const reasons: string[] = [];
    if (summary.undecided > 0) reasons.push(`미결정 ${summary.undecided}건`);
    if (summary.clarify_pending > 0) reasons.push(`clarify 대기 ${summary.clarify_pending}건`);
    return {
      allowed: false,
      reason: `Target lock 불가: ${reasons.join(", ")}. 모든 constraint 결정이 완료되어야 합니다.`,
    };
  }

  // ── Rule 7: Exploration round limit ──
  if (
    eventType === "exploration.round_completed" &&
    state.exploration_progress &&
    state.exploration_progress.total_rounds >= MAX_EXPLORATION_ROUNDS
  ) {
    return {
      allowed: false,
      reason: `Exploration round limit exceeded (${state.exploration_progress.total_rounds} rounds). align.proposed로 진행하거나 scope.deferred를 고려하세요.`,
    };
  }

  // ── Rule 8: Exploration sequence integrity ──
  // Rule 8a (align.proposed during exploration) is now handled structurally by MATRIX:
  // exploring state allows align.proposed; grounded state allows align.proposed.
  // Protocol determines when agent should record align.proposed.

  // Rule 8b: exploration.round_completed/phase_transitioned require exploration.started
  // MATRIX enforces this structurally (only exploring state allows these events).
  // This rule provides a clearer error message.
  if (
    (eventType === "exploration.round_completed" ||
      eventType === "exploration.phase_transitioned") &&
    !state.exploration_progress
  ) {
    return {
      allowed: false,
      reason: `exploration.started 이벤트가 먼저 기록되어야 합니다.`,
    };
  }

  // Rule 8c: exploration.started blocked when exploration already in progress
  if (
    eventType === "exploration.started" &&
    state.exploration_progress &&
    !state.exploration_progress.completed_at
  ) {
    return {
      allowed: false,
      reason: `Exploration이 이미 진행 중입니다 (Phase ${state.exploration_progress.current_phase}/6). 완료 후 재시작 가능합니다.`,
    };
  }

  // ── Resolve next state (handle conditional targets) ──
  const next_state = resolveNextState(outcome, state, newEvent);

  return { allowed: true, next_state };
}

// ─── Conditional target resolution ───

/**
 * Determine the actual next state when conditional_targets exist.
 *
 * Handles two cases:
 * 1. surface_confirmed + constraint decision/clarify/invalidated
 *    → constraints_resolved if all constraints are now resolved
 * 2. applied + validation.completed
 *    → validated (pass), constraints_resolved (fail), or grounded (fail+stale)
 */
function resolveNextState(
  outcome: { allowed: true; next_state: State; conditional_targets?: State[] },
  state: ScopeState,
  event: Event,
): State {
  if (!outcome.conditional_targets || outcome.conditional_targets.length === 0) {
    return outcome.next_state;
  }

  const eventType = event.type as EventType;

  // Case 1: surface_confirmed → constraints_resolved (conditional)
  if (
    state.current_state === "surface_confirmed" &&
    (eventType === "constraint.decision_recorded" ||
      eventType === "constraint.clarify_resolved" ||
      eventType === "constraint.invalidated")
  ) {
    // Simulate: apply this event to the pool, then check resolution
    const simulatedPool = simulateConstraintEvent(state, event);
    if (isConstraintsResolved(simulatedPool)) {
      return "constraints_resolved";
    }
    return "surface_confirmed";
  }

  // Case 2: applied + validation.completed → validated / constraints_resolved / grounded
  if (
    state.current_state === "applied" &&
    eventType === "validation.completed"
  ) {
    const p = event.payload as ValidationCompletedPayload;
    // stale → grounded (regardless of pass/fail)
    if (state.stale) {
      return "grounded";
    }
    if (p.result === "pass") {
      return "validated";
    }
    // fail + target issue → constraints_resolved
    return "constraints_resolved";
  }

  // Default: use matrix default
  return outcome.next_state;
}

// ─── Helpers ───

/**
 * Simulate applying a constraint event to get an updated pool.
 * Used for conditional target resolution without mutating the original pool.
 */
function simulateConstraintEvent(
  state: ScopeState,
  event: Event,
): ScopeState["constraint_pool"] {
  // Deep clone the constraints array to avoid mutation
  const clonedConstraints = state.constraint_pool.constraints.map((c) => ({
    ...c,
  }));

  const eventType = event.type as EventType;

  if (eventType === "constraint.decision_recorded") {
    const p = event.payload as ConstraintDecisionRecordedPayload;
    const entry = clonedConstraints.find(
      (c) => c.constraint_id === p.constraint_id,
    );
    if (entry) {
      entry.status = "decided";
    }
  } else if (eventType === "constraint.clarify_resolved") {
    const p = event.payload as ConstraintClarifyResolvedPayload;
    const entry = clonedConstraints.find(
      (c) => c.constraint_id === p.constraint_id,
    );
    if (entry) {
      entry.status = "decided";
    }
  } else if (eventType === "constraint.invalidated") {
    const p = event.payload as ConstraintInvalidatedPayload;
    const entry = clonedConstraints.find(
      (c) => c.constraint_id === p.constraint_id,
    );
    if (entry) {
      entry.status = "invalidated";
    }
  }

  // Recompute summary
  let decided = 0;
  let clarify_pending = 0;
  let invalidated = 0;
  let undecided = 0;
  let required = 0;
  let recommended = 0;

  for (const c of clonedConstraints) {
    if (c.severity === "required") required++;
    else recommended++;
    switch (c.status) {
      case "decided": decided++; break;
      case "clarify_pending": clarify_pending++; break;
      case "invalidated": invalidated++; break;
      case "undecided": undecided++; break;
    }
  }

  return {
    constraints: clonedConstraints,
    summary: {
      total: clonedConstraints.length,
      required,
      recommended,
      decided,
      clarify_pending,
      invalidated,
      undecided,
    },
  };
}

/** Extract constraint_id from event payload, if present. */
function extractConstraintId(event: Event): string | undefined {
  const payload = event.payload as Record<string, unknown>;
  if (typeof payload.constraint_id === "string") {
    return payload.constraint_id;
  }
  return undefined;
}
