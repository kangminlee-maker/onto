// runtime-mirror-of: step-4-integration §2.5 + §2.6 + §3.4.1
//
// Hook δ — Phase 3 rendering algorithm (W-A-90).
//
// Deterministic runtime — no LLM dispatch. Inputs are wip.yml's
// terminal-pending elements + the pack_missing_areas aggregate (W-A-88
// output). Output is a 4-bucket exhaustive partition with priority scores.
//
// 7-step partition algorithm (§2.5 r5 mechanical):
//   1. compute priority score for every terminal-pending element
//   2. priority-top individual allocation (top max_individual_items)
//   3. group candidate construction by §3.4.1 canonical grouping key
//   4. element_count >= grouping_threshold → group candidate; else residual
//   5. individual hard cap → throttled_out for excess (lowest priority first)
//   6. group row hard cap → throttled_out for excess group (group sum priority)
//   7. surviving groups split into group_sample / group_truncated
//
// Exhaustive partition invariant:
//   individual + group_sample + group_truncated + throttled_out == total

import type {
  Confidence,
  IntentInference,
  PackMissingArea,
  RationaleState,
} from "./wip-element-types.js";

export interface HookDeltaConfig {
  max_individual_items: number; // default 20
  grouping_threshold: number; // default 5
  group_summary_sample_count: number; // default 3
  max_individual_items_hard_cap: number; // default 100
  max_group_rows: number; // default 50
}

export const DEFAULT_HOOK_DELTA_CONFIG: HookDeltaConfig = {
  max_individual_items: 20,
  grouping_threshold: 5,
  group_summary_sample_count: 3,
  max_individual_items_hard_cap: 100,
  max_group_rows: 50,
};

export type RenderBucket =
  | "individual"
  | "group_sample"
  | "group_truncated"
  | "throttled_out";

export type GroupingKind =
  | "pack_missing_area"
  | "rationale_state"
  | "rationale_state_with_confidence"
  | "rationale_state_single_gate";

export interface PendingElement {
  element_id: string;
  intent_inference: IntentInference;
  added_in_stage: 1 | 2;
}

export interface RenderEntry {
  element_id: string;
  render_bucket: RenderBucket;
  priority_score: number;
  rationale_state: RationaleState;
  confidence: Confidence | null;
  gate_count: number;
  /** the grouping key kind (if assigned to a group), else null */
  grouping_kind: GroupingKind | null;
  /** the grouping key value used for matching (only meaningful if grouping_kind != null) */
  grouping_key_value?:
    | { manifest_ref: string; heading: string }
    | { rationale_state: RationaleState }
    | { rationale_state: RationaleState; confidence: Confidence | null }
    | { rationale_state: RationaleState; single_gate: true };
}

export interface HookDeltaResult {
  entries: RenderEntry[];
  rendered_count: number;
  throttled_out_count: number;
  total_pending_count: number;
  gate_count_histogram: Record<string, number>;
  /** carries through to rationale-queue.yaml + raw.yml */
  rationale_review_degraded: boolean;
}

/**
 * §2.5 priority weight tables (r5 + r2 + r6).
 *
 * rationale_state weight (×1000):
 *   empty=11, gap=10, domain_pack_incomplete=10, proposed=9 (γ-degraded only),
 *   domain_scope_miss=5, reviewed=4, principal_*=0, carry_forward=0
 *
 * Note (review UF-LOGIC-02 — terminal-rendered dual scope clarification):
 * `domain_scope_miss` 는 Step 1 §4.2 의 terminal state 정의에 속하지만 Step 4
 * §3.1 matrix 가 Phase 3 에서 Principal 의 추가 action 을 허용 (accept →
 * principal_confirmed_scope_miss / override → principal_modified / defer →
 * principal_deferred). 즉 γ 판정 후 Principal explicit confirmation 미수신
 * 상태에서는 surface 대상 — weight=5 (non-zero) 가 그것 표현. "미판정 +
 * global confirmed" 시 §3.1 matrix 의 special-case row 가 domain_scope_miss
 * 를 그대로 유지 (sweep 대상 아님, §3.5.2). terminal 정의와 rendered 동작이
 * spec 의도된 dual scope.
 */
const RATIONALE_STATE_WEIGHT: Record<RationaleState, number> = {
  empty: 11,
  gap: 10,
  domain_pack_incomplete: 10,
  proposed: 9,
  domain_scope_miss: 5,
  reviewed: 4,
  principal_accepted: 0,
  principal_rejected: 0,
  principal_modified: 0,
  principal_deferred: 0,
  principal_accepted_gap: 0,
  carry_forward: 0,
};

const CONFIDENCE_SCORE: Record<"low" | "medium" | "high" | "null", number> = {
  low: 1,
  medium: 2,
  high: 3,
  null: 1, // null treated as low (rationale_state ∈ {empty,gap,...} 에서 정상)
};

/**
 * §2.5 priority score formula:
 *   weight*1000 + (10 - confidence_score)*100 + (added_in_stage==2 ? 50 : 0) + gate_count_bonus
 */
export function computePriorityScore(
  e: PendingElement,
): number {
  const state = e.intent_inference.rationale_state;
  const conf = e.intent_inference.confidence;
  const confKey = conf == null ? "null" : conf;

  const stateWeight = RATIONALE_STATE_WEIGHT[state] * 1000;
  const confidenceTerm = (10 - CONFIDENCE_SCORE[confKey]) * 100;
  const stage2Bonus = e.added_in_stage === 2 ? 50 : 0;
  const gate = e.intent_inference.provenance.gate_count;
  const gateBonus = gate == null || gate === 1 ? 10 : 0;

  return stateWeight + confidenceTerm + stage2Bonus + gateBonus;
}

/**
 * §3.4.1 canonical grouping key resolution per source state.
 * Returns null if the element is not eligible for any grouping (e.g. terminal
 * principal_* or carry_forward — those are not pending in the first place).
 */
export function resolveGroupingKey(
  e: PendingElement,
  packMissingAreas: PackMissingArea[],
): {
  kind: GroupingKind;
  value: NonNullable<RenderEntry["grouping_key_value"]>;
  identity: string; // canonical string identity for bucket map
} | null {
  const inf = e.intent_inference;
  const state = inf.rationale_state;

  // domain_pack_incomplete → pack_missing_area key (manifest_ref, heading)
  if (state === "domain_pack_incomplete") {
    // first matching ref that is in pack_missing_areas
    for (const ref of inf.domain_refs ?? []) {
      const matched = packMissingAreas.find(
        (a) =>
          a.grouping_key.manifest_ref === ref.manifest_ref &&
          a.grouping_key.heading === ref.heading,
      );
      if (matched) {
        return {
          kind: "pack_missing_area",
          value: {
            manifest_ref: matched.grouping_key.manifest_ref,
            heading: matched.grouping_key.heading,
          },
          identity: `pack_missing_area\0${matched.grouping_key.manifest_ref}\0${matched.grouping_key.heading}`,
        };
      }
    }
    // no matching ref — fall through to rationale_state grouping
  }

  // reviewed → (rationale_state, confidence) (r6 — low/medium/high 전수)
  if (state === "reviewed") {
    return {
      kind: "rationale_state_with_confidence",
      value: { rationale_state: state, confidence: inf.confidence ?? null },
      identity: `rationale_state_with_confidence\0reviewed\0${inf.confidence ?? "null"}`,
    };
  }

  // proposed: distinguish γ-degraded (group by rationale_state) vs single-gate
  // non-degraded (group by single_gate=true)
  if (state === "proposed") {
    const gate = inf.provenance.gate_count;
    const isSingleGate = gate == null || gate === 1;
    if (isSingleGate) {
      return {
        kind: "rationale_state_single_gate",
        value: { rationale_state: state, single_gate: true },
        identity: `rationale_state_single_gate\0proposed`,
      };
    }
    // γ-degraded proposed (gate_count >= 2 but state still proposed)
    return {
      kind: "rationale_state",
      value: { rationale_state: state },
      identity: `rationale_state\0proposed`,
    };
  }

  // gap / empty / domain_scope_miss → rationale_state
  if (state === "gap" || state === "empty" || state === "domain_scope_miss") {
    return {
      kind: "rationale_state",
      value: { rationale_state: state },
      identity: `rationale_state\0${state}`,
    };
  }

  // domain_pack_incomplete that didn't match a pack_missing_area: fall through
  if (state === "domain_pack_incomplete") {
    return {
      kind: "rationale_state",
      value: { rationale_state: state },
      identity: `rationale_state\0domain_pack_incomplete`,
    };
  }

  // terminal states: not pending, no grouping
  return null;
}

/**
 * Run Hook δ over the terminal-pending elements + Hook α's pack_missing_areas
 * aggregate. Returns the 4-bucket partition with priority scores.
 *
 * Caller (W-A-91) writes the result to .onto/builds/{session}/rationale-queue.yaml.
 */
export function runHookDelta(
  pending: PendingElement[],
  packMissingAreas: PackMissingArea[],
  rationale_review_degraded: boolean,
  config: HookDeltaConfig = DEFAULT_HOOK_DELTA_CONFIG,
): HookDeltaResult {
  const total = pending.length;

  // step 1: priority score
  const scored = pending.map((e) => {
    const grouping = resolveGroupingKey(e, packMissingAreas);
    return {
      element: e,
      score: computePriorityScore(e),
      grouping,
    };
  });

  // sort descending by priority (stable: ties retain input order)
  scored.sort((a, b) => b.score - a.score);

  // step 2: priority-top individual allocation
  const priorityTopIndividuals = scored.slice(0, config.max_individual_items);
  const remainder = scored.slice(config.max_individual_items);

  // step 3 + 4: group candidate construction; residual fallback to individual
  type Bucket = { kind: GroupingKind; identity: string; value: RenderEntry["grouping_key_value"]; members: typeof scored };
  const bucketMap = new Map<string, Bucket>();
  const ungroupable: typeof scored = [];

  for (const s of remainder) {
    if (!s.grouping) {
      ungroupable.push(s);
      continue;
    }
    let bucket = bucketMap.get(s.grouping.identity);
    if (!bucket) {
      bucket = {
        kind: s.grouping.kind,
        identity: s.grouping.identity,
        value: s.grouping.value,
        members: [],
      };
      bucketMap.set(s.grouping.identity, bucket);
    }
    bucket.members.push(s);
  }

  const groupCandidates: Bucket[] = [];
  const residualIndividuals: typeof scored = [...ungroupable];
  for (const bucket of bucketMap.values()) {
    if (bucket.members.length >= config.grouping_threshold) {
      groupCandidates.push(bucket);
    } else {
      // residual: append (lower priority — already after priority top)
      residualIndividuals.push(...bucket.members);
    }
  }
  // residual within their own group sorted by priority
  residualIndividuals.sort((a, b) => b.score - a.score);

  // step 5: individual hard cap
  const individualPool = [...priorityTopIndividuals, ...residualIndividuals];
  const individualCap = config.max_individual_items_hard_cap;
  const individualsRendered = individualPool.slice(0, individualCap);
  const individualsThrottled = individualPool.slice(individualCap);
  // individualsThrottled is in priority-desc order; cap kept the highest

  // step 6: group hard cap by group's total priority sum (descending)
  const groupsSorted = [...groupCandidates].sort((a, b) => {
    const sumA = a.members.reduce((acc, m) => acc + m.score, 0);
    const sumB = b.members.reduce((acc, m) => acc + m.score, 0);
    return sumB - sumA;
  });
  const groupsKept = groupsSorted.slice(0, config.max_group_rows);
  const groupsThrottled = groupsSorted.slice(config.max_group_rows);

  // step 7: split kept groups into sample / truncated
  const entries: RenderEntry[] = [];

  for (const s of individualsRendered) {
    entries.push(toEntry(s, "individual", s.grouping));
  }
  for (const s of individualsThrottled) {
    entries.push(toEntry(s, "throttled_out", s.grouping));
  }
  for (const group of groupsKept) {
    // sort group members by priority (desc), top sample_count = group_sample,
    // rest = group_truncated
    const sortedMembers = [...group.members].sort((a, b) => b.score - a.score);
    const samples = sortedMembers.slice(0, config.group_summary_sample_count);
    const truncated = sortedMembers.slice(config.group_summary_sample_count);
    for (const s of samples) entries.push(toEntry(s, "group_sample", s.grouping));
    for (const s of truncated)
      entries.push(toEntry(s, "group_truncated", s.grouping));
  }
  for (const group of groupsThrottled) {
    for (const s of group.members) {
      entries.push(toEntry(s, "throttled_out", s.grouping));
    }
  }

  // counters + histogram
  let rendered = 0;
  let throttledOut = 0;
  const histogram: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.render_bucket === "throttled_out") throttledOut++;
    else rendered++;
    const gateKey = String(entry.gate_count);
    histogram[gateKey] = (histogram[gateKey] ?? 0) + 1;
  }

  // exhaustive partition invariant
  if (rendered + throttledOut !== total) {
    throw new Error(
      `partition invariant violation: rendered=${rendered} + throttled=${throttledOut} != total=${total}`,
    );
  }

  return {
    entries,
    rendered_count: rendered,
    throttled_out_count: throttledOut,
    total_pending_count: total,
    gate_count_histogram: histogram,
    rationale_review_degraded,
  };
}

function toEntry(
  s: { element: PendingElement; score: number },
  bucket: RenderBucket,
  grouping: ReturnType<typeof resolveGroupingKey>,
): RenderEntry {
  const inf = s.element.intent_inference;
  const entry: RenderEntry = {
    element_id: s.element.element_id,
    render_bucket: bucket,
    priority_score: s.score,
    rationale_state: inf.rationale_state,
    confidence: inf.confidence ?? null,
    gate_count: inf.provenance.gate_count ?? 1,
    grouping_kind: grouping?.kind ?? null,
  };
  if (grouping) entry.grouping_key_value = grouping.value;
  return entry;
}
