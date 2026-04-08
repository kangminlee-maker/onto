/**
 * Phase 3 Promote — Degraded state aggregator (Step 9b).
 *
 * Design authority:
 *   - learn-phase3-design-v4.md DD-11 (degraded state taxonomy)
 *   - learn-phase3-design-v4.md DD-12 (panel_minimum_unmet hard gate)
 *
 * Responsibility:
 *   - Aggregate DegradedStateEntry records emitted by panel-reviewer,
 *     judgment-auditor, and the orchestrator into operator-friendly views.
 *   - Map DegradedStateKind → severity tier so the report can highlight
 *     hard-gate items (panel_minimum_unmet) above informational ones
 *     (criterion_6_waived).
 *   - Determine which candidates are blocked from the ordinary apply path —
 *     these surface in the user-approval section as "needs explicit decision".
 *
 * Scope:
 *   - This module owns no I/O and emits no degraded states itself. The
 *     types stay in promote/types.ts so emitter modules can construct entries
 *     without depending on this aggregator. Aggregation is a one-way
 *     downstream operation from emitters into PromoteReport assembly.
 *
 * Severity tiers (axis = "what does the operator do?"):
 *   - blocking: candidate cannot follow the ordinary apply path; explicit
 *     review or waiver is required.
 *   - degraded: review still possible but with reduced confidence; the
 *     report should annotate the affected candidates but not block them.
 *   - informational: surfaced for transparency; no action required.
 */

import type { DegradedStateEntry, DegradedStateKind } from "./types.js";

// ---------------------------------------------------------------------------
// Severity classification
// ---------------------------------------------------------------------------

export type DegradedStateSeverity = "blocking" | "degraded" | "informational";

const SEVERITY_BY_KIND: Readonly<Record<DegradedStateKind, DegradedStateSeverity>> = {
  panel_minimum_unmet: "blocking",
  panel_contract_invalid: "degraded",
  member_unreachable: "degraded",
  criterion_6_blocked: "degraded",
  criterion_6_waived: "informational",
  stale_baseline: "blocking",
};

export function severityOf(kind: DegradedStateKind): DegradedStateSeverity {
  return SEVERITY_BY_KIND[kind];
}

// ---------------------------------------------------------------------------
// Aggregation views
// ---------------------------------------------------------------------------

export interface DegradedStateGroupedByKind {
  kind: DegradedStateKind;
  severity: DegradedStateSeverity;
  count: number;
  entries: DegradedStateEntry[];
}

export interface DegradedStateSummary {
  total: number;
  blocking_count: number;
  degraded_count: number;
  informational_count: number;
  by_kind: DegradedStateGroupedByKind[];
  blocked_candidate_ids: string[];
}

/**
 * Group entries by kind, preserving insertion order within each group so the
 * timeline of when each degraded state surfaced is recoverable.
 */
export function groupByKind(
  entries: DegradedStateEntry[],
): DegradedStateGroupedByKind[] {
  const buckets = new Map<DegradedStateKind, DegradedStateEntry[]>();
  for (const e of entries) {
    const arr = buckets.get(e.kind) ?? [];
    arr.push(e);
    buckets.set(e.kind, arr);
  }
  return Array.from(buckets.entries()).map(([kind, list]) => ({
    kind,
    severity: severityOf(kind),
    count: list.length,
    entries: list,
  }));
}

/**
 * Collect candidate ids that are blocked from the ordinary apply path.
 *
 * DD-12 hard gate: any candidate touched by a `panel_minimum_unmet` entry is
 * blocked. `stale_baseline` is also blocking but is session-wide rather than
 * per-candidate, so it does not contribute candidate ids here — the
 * orchestrator surfaces it as a top-level abort.
 */
export function collectBlockedCandidates(
  entries: DegradedStateEntry[],
): string[] {
  const blocked = new Set<string>();
  for (const e of entries) {
    if (e.kind !== "panel_minimum_unmet") continue;
    for (const id of e.affected_candidates ?? []) {
      blocked.add(id);
    }
  }
  return [...blocked].sort();
}

/**
 * Roll up the full degraded-state picture into a summary block ready for
 * inclusion in PromoteReport assembly.
 */
export function summarizeDegradedStates(
  entries: DegradedStateEntry[],
): DegradedStateSummary {
  const by_kind = groupByKind(entries);
  let blocking_count = 0;
  let degraded_count = 0;
  let informational_count = 0;
  for (const g of by_kind) {
    if (g.severity === "blocking") blocking_count += g.count;
    else if (g.severity === "degraded") degraded_count += g.count;
    else informational_count += g.count;
  }
  return {
    total: entries.length,
    blocking_count,
    degraded_count,
    informational_count,
    by_kind,
    blocked_candidate_ids: collectBlockedCandidates(entries),
  };
}

// ---------------------------------------------------------------------------
// Stable-baseline helper (called by promoter / promote-executor)
// ---------------------------------------------------------------------------

/**
 * Construct a `stale_baseline` entry from verifyBaselineHash() mismatches.
 *
 * The orchestrator calls verifyBaselineHash() on Phase B entry and converts
 * any mismatches into a single degraded state entry — the entry is itself a
 * blocking gate that aborts the apply path unless --force-stale is set.
 */
export function buildStaleBaselineEntry(
  mismatches: { path: string; reason: string }[],
): DegradedStateEntry {
  const detail =
    mismatches.length === 0
      ? "no mismatches (defensive entry)"
      : mismatches
          .map((m) => `${m.path}: ${m.reason}`)
          .join("; ");
  return {
    kind: "stale_baseline",
    detail,
    occurred_at: new Date().toISOString(),
  };
}
