/**
 * Phase 3 Promote — Collection health snapshot (Step 9d).
 *
 * Design authority:
 *   - processes/promote.md §9 (Collection Health Snapshot)
 *   - learn-phase3-design-v4.md §1.3 (P-15 metric assembly)
 *
 * Responsibility:
 *   - Aggregate axis distribution, purpose distribution, judgment ratio,
 *     and other operator-facing metrics from the global learning pool.
 *   - Roll up panel-derived counts (creation gate failures, axis tag
 *     re-evaluation, applied learnings yes/no) supplied by the orchestrator.
 *   - Identify agents whose learning files have crossed the separation
 *     trigger threshold (>100 lines per agent file).
 *
 * Scope:
 *   - Pure aggregator. No I/O. No mutation.
 *   - Uses ParsedLearningItem fields and a few report-side counters that the
 *     orchestrator computes after panel review and audit completion.
 *
 * Note: time-series comparison (Previous/Δ) is intentionally NOT implemented
 * (promote.md §9 final paragraph). The user manually compares against the
 * prior promote report.
 */

import type {
  CrossAgentDedupCluster,
  HealthSnapshot,
  ParsedLearningItem,
  PanelVerdict,
  RetirementCandidate,
} from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Separation trigger: when an agent's learning file exceeds this row count
 * the operator is prompted to consider splitting it (promote.md §9 footnote).
 */
export const SEPARATION_TRIGGER_LINE_COUNT = 100;

// ---------------------------------------------------------------------------
// Inputs supplied by the orchestrator
// ---------------------------------------------------------------------------

/**
 * Counters that originate outside this module — typically computed by
 * promoter.ts during Phase A assembly. They are passed in rather than
 * recomputed here so health-snapshot stays a pure aggregator and avoids
 * duplicating Phase A logic.
 */
export interface HealthSnapshotExtras {
  axis_tag_re_evaluation_changes_this_session: number;
  creation_gate_failures: number;
  applied_learnings_aggregate: { yes: number; no: number };
  /**
   * Optional override for line counts. When omitted, the snapshot derives
   * line counts from item.line_number per agent.
   */
  agent_line_counts?: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

interface AxisCounts {
  methodology_only: number;
  domain_only: number;
  dual: number;
}

function classifyAxis(item: ParsedLearningItem): keyof AxisCounts | null {
  const hasMethodology = item.applicability_tags.includes("methodology");
  const hasDomain = item.applicability_tags.some((t) =>
    t.startsWith("domain/"),
  );
  if (hasMethodology && hasDomain) return "dual";
  if (hasMethodology) return "methodology_only";
  if (hasDomain) return "domain_only";
  return null; // unclassified — not counted in distribution
}

function tallyAxis(items: ParsedLearningItem[]): AxisCounts {
  const counts: AxisCounts = {
    methodology_only: 0,
    domain_only: 0,
    dual: 0,
  };
  for (const item of items) {
    const axis = classifyAxis(item);
    if (axis !== null) counts[axis] += 1;
  }
  return counts;
}

function tallyPurpose(
  items: ParsedLearningItem[],
): HealthSnapshot["purpose_distribution"] {
  const counts = { guardrail: 0, foundation: 0, convention: 0, insight: 0 };
  for (const item of items) {
    if (item.role === null) continue;
    counts[item.role] += 1;
  }
  return counts;
}

function judgmentRatio(items: ParsedLearningItem[]): number {
  if (items.length === 0) return 0;
  const judgmentCount = items.filter((i) => i.type === "judgment").length;
  return Math.round((judgmentCount / items.length) * 1000) / 10; // 1 decimal
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 1000) / 10;
}

/**
 * Identify agents whose learning files have grown past the separation
 * trigger threshold. Uses the highest line_number observed per agent in the
 * given item pool, or the explicit `agent_line_counts` override when
 * provided. The override exists because line_number reflects the position
 * of an item, not the file's total line count — for empty/sparse files the
 * override gives a more accurate signal.
 */
function findSeparationTriggers(
  items: ParsedLearningItem[],
  override?: Map<string, number>,
): string[] {
  const triggered: string[] = [];

  if (override) {
    for (const [agent, count] of override) {
      if (count > SEPARATION_TRIGGER_LINE_COUNT) triggered.push(agent);
    }
  } else {
    const maxLineByAgent = new Map<string, number>();
    for (const item of items) {
      const current = maxLineByAgent.get(item.agent_id) ?? 0;
      if (item.line_number > current) {
        maxLineByAgent.set(item.agent_id, item.line_number);
      }
    }
    for (const [agent, count] of maxLineByAgent) {
      if (count > SEPARATION_TRIGGER_LINE_COUNT) triggered.push(agent);
    }
  }

  return triggered.sort();
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface BuildHealthSnapshotConfig {
  globalItems: ParsedLearningItem[];
  panelVerdicts: PanelVerdict[];
  retirementCandidates: RetirementCandidate[];
  crossAgentDedupClusters: CrossAgentDedupCluster[];
  extras: HealthSnapshotExtras;
}

/**
 * Build the snapshot from already-assembled report components.
 *
 * Why pass in panel_verdicts/retirement_candidates rather than recomputing:
 *   - Avoids drifting from the report state. The report is canonical; the
 *     snapshot is a derived view of it.
 *   - Lets the orchestrator decide whether to recompute — e.g., a re-run
 *     after audit changes might want to refresh metrics without re-running
 *     panel review.
 *
 * Note on `event_marker_review_candidates`: this is the count of items the
 * retirement analyzer surfaced as candidates (i.e., 2+ countable markers).
 * It is not the total event marker count across the global pool.
 *
 * Scope semantics (W-C-06 signal scope 명시):
 *   - globalItems, retirementCandidates → GLOBAL scope (~/.onto/learnings/)
 *   - panelVerdicts → PROJECT scope ({project}/.onto/learnings/)
 *   - crossAgentDedupClusters → GLOBAL scope (cross-agent dedup)
 * These scopes are intentionally different: retirement operates on promoted
 * (global) items, while panel review operates on project items being promoted.
 * The snapshot aggregates both, labeled by their source scope.
 */
export function buildHealthSnapshot(
  config: BuildHealthSnapshotConfig,
): HealthSnapshot {
  const total = config.globalItems.length;
  const axis = tallyAxis(config.globalItems);
  const purpose = tallyPurpose(config.globalItems);

  return {
    total_global_learnings: total,
    axis_distribution: {
      methodology_only_pct: pct(axis.methodology_only, total),
      domain_only_pct: pct(axis.domain_only, total),
      dual_pct: pct(axis.dual, total),
    },
    purpose_distribution: purpose,
    judgment_ratio_pct: judgmentRatio(config.globalItems),
    cross_agent_dedup_clusters_remaining:
      config.crossAgentDedupClusters.length,
    axis_tag_re_evaluation_changes_this_session:
      config.extras.axis_tag_re_evaluation_changes_this_session,
    event_marker_review_candidates: config.retirementCandidates.length,
    creation_gate_failures: config.extras.creation_gate_failures,
    applied_learnings_aggregate: config.extras.applied_learnings_aggregate,
    separation_trigger_agents: findSeparationTriggers(
      config.globalItems,
      config.extras.agent_line_counts,
    ),
  };
}
