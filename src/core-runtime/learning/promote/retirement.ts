/**
 * Phase 3 Promote — Retirement analyzer (Step 9a).
 *
 * Design authority:
 *   - learn-phase3-design-v2.md DD-6 (event marker 기반 퇴역)
 *   - processes/promote.md Step 4a (event marker review)
 *
 * Responsibility:
 *   - Identify global learnings carrying 2+ event markers (`applied-then-found-invalid`)
 *     since the most recent `retention-confirmed` checkpoint, surface them as
 *     retirement candidates for the operator's Step 5 review.
 *
 * Scope:
 *   - Phase A only. No mutation. The actual retirement (file edits) happens
 *     in Phase B promote-executor with explicit decisions.
 *
 * Marker grammar (collector.ts emits the full comment text):
 *   <!-- applied-then-found-invalid: YYYY-MM-DD, <excerpt>, target:<learning_id> -->
 *   <!-- retention-confirmed: YYYY-MM-DD -->
 *
 * Cutoff rule (promote.md §4a):
 *   When `retention_confirmed_at` is set, only event markers with a date
 *   STRICTLY AFTER that timestamp are counted toward the 2+ threshold.
 *   Markers attached before retention-confirmed are considered already
 *   reviewed and explicitly retained.
 */

import type { ParsedLearningItem, RetirementCandidate } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** DD-6 minimum threshold. The design fixes this at 2 — see promote.md §4a. */
export const RETIREMENT_MARKER_THRESHOLD = 2;

const EVENT_MARKER_DATE_RE =
  /<!--\s*(?:applied-then-found-invalid|observed-obsolete):\s*(\d{4}-\d{2}-\d{2})/;

// ---------------------------------------------------------------------------
// Marker date parsing
// ---------------------------------------------------------------------------

/**
 * Extract the YYYY-MM-DD prefix from an event marker comment string.
 *
 * Returns null when the marker text is malformed (no date prefix). The
 * collector currently writes well-formed markers, but legacy items written by
 * humans before Phase 2 may have looser shapes — those are dropped from the
 * count rather than triggering an error.
 */
function parseMarkerDate(markerText: string): string | null {
  const m = markerText.match(EVENT_MARKER_DATE_RE);
  return m ? m[1]! : null;
}

/**
 * Compare two ISO date strings (YYYY-MM-DD). Lexicographic == chronological.
 */
function isStrictlyAfter(date: string, cutoff: string): boolean {
  return date > cutoff;
}

// ---------------------------------------------------------------------------
// Per-item analysis
// ---------------------------------------------------------------------------

interface MarkerAnalysis {
  /** Markers that count toward the threshold (post-cutoff when applicable). */
  countable: string[];
  /** Markers excluded by retention-confirmed cutoff. */
  excluded_by_retention: string[];
  /** Markers we couldn't parse a date from — kept for transparency. */
  undated: string[];
}

function analyzeItemMarkers(item: ParsedLearningItem): MarkerAnalysis {
  const countable: string[] = [];
  const excluded: string[] = [];
  const undated: string[] = [];

  for (const marker of item.event_markers) {
    const date = parseMarkerDate(marker);
    if (date === null) {
      undated.push(marker);
      continue;
    }
    if (
      item.retention_confirmed_at !== null &&
      !isStrictlyAfter(date, item.retention_confirmed_at)
    ) {
      excluded.push(marker);
      continue;
    }
    countable.push(marker);
  }

  return {
    countable,
    excluded_by_retention: excluded,
    undated,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RetirementAnalysisConfig {
  /** Threshold override for tests. Defaults to RETIREMENT_MARKER_THRESHOLD. */
  threshold?: number;
}

/**
 * Identify retirement candidates from a global item pool.
 *
 * Input is the global slice of CollectionResult (`global_items`). Project
 * items are excluded because retirement targets already-promoted learnings.
 * The promote.md §4a wording explicitly limits this to global learnings.
 *
 * Returns one candidate per item that crossed the threshold. The reason
 * string is human-readable so the operator can decide without re-running
 * analysis. Marker counts are exposed in `marker_count` so a downstream
 * UI can sort by severity.
 */
export function identifyRetirementCandidates(
  globalItems: ParsedLearningItem[],
  config: RetirementAnalysisConfig = {},
): RetirementCandidate[] {
  const threshold = config.threshold ?? RETIREMENT_MARKER_THRESHOLD;
  const candidates: RetirementCandidate[] = [];

  for (const item of globalItems) {
    if (item.event_markers.length === 0) continue;

    const analysis = analyzeItemMarkers(item);
    if (analysis.countable.length < threshold) continue;

    const reasonParts = [
      `${analysis.countable.length} event marker(s) since` +
        (item.retention_confirmed_at
          ? ` retention-confirmed (${item.retention_confirmed_at})`
          : " creation"),
    ];
    if (analysis.excluded_by_retention.length > 0) {
      reasonParts.push(
        `${analysis.excluded_by_retention.length} marker(s) excluded by retention-confirmed cutoff`,
      );
    }
    if (analysis.undated.length > 0) {
      reasonParts.push(
        `${analysis.undated.length} undated marker(s) ignored`,
      );
    }

    candidates.push({
      item,
      marker_count: analysis.countable.length,
      markers: analysis.countable,
      retention_confirmed_at: item.retention_confirmed_at,
      reason: reasonParts.join("; "),
    });
  }

  // Sort by severity (highest marker_count first) so reviewers see hot spots
  // at the top of the report.
  candidates.sort((a, b) => b.marker_count - a.marker_count);

  return candidates;
}
