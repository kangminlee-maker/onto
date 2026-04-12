/**
 * Phase 3 Promote — Harness review suggestions (post-Phase A).
 *
 * Design authority:
 *   - Task 1 specification: promote 완료 후 harness 파일 리뷰 제안
 *
 * Responsibility:
 *   - Read the completed PromoteReport and detect signals that indicate
 *     potential harness problems (lens prompts, panel contracts, etc.).
 *   - Map each signal to a specific harness file path + reason.
 *   - Return a markdown string for operator review. Empty string when no
 *     suggestions are warranted.
 *
 * Scope:
 *   - Read-only: consumes PromoteReport + verifies file existence only.
 *   - Missing canonical seats (e.g., retired agents like `philosopher`) are
 *     silently skipped rather than emitted as dead-path suggestions.
 */

import fs from "node:fs";
import path from "node:path";

import type { PromoteReport, PanelVerdict, DegradedStateEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Threshold: suggest event-marker lens review when candidates exceed this. */
const EVENT_MARKER_REVIEW_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Suggestion type
// ---------------------------------------------------------------------------

interface HarnessReviewSuggestion {
  file: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Signal detectors
// ---------------------------------------------------------------------------

/**
 * Signal 1: panel verdicts with reject_majority or split consensus.
 *
 * When a panel cannot converge on promote or defer, the originating lens's
 * role definition may need calibration. Map to `roles/{agent_id}.md` for the
 * originator of each such verdict.
 */
function detectVerdictSignals(
  panelVerdicts: PanelVerdict[],
  projectRoot: string,
): HarnessReviewSuggestion[] {
  const suggestions: HarnessReviewSuggestion[] = [];
  const seenFiles = new Set<string>();

  for (const verdict of panelVerdicts) {
    if (
      verdict.consensus !== "reject_majority" &&
      verdict.consensus !== "split"
    ) {
      continue;
    }

    // The originator is the first panel member with role "originator".
    const originator = verdict.panel_members.find(
      (m) => m.role === "originator",
    );
    if (!originator) continue;

    const file = `roles/${originator.agent_id}.md`;
    if (seenFiles.has(file)) continue;
    seenFiles.add(file);

    // Skip retired/legacy agents whose canonical role file no longer exists.
    if (!fs.existsSync(path.join(projectRoot, file))) continue;

    suggestions.push({
      file,
      reason:
        `Panel consensus=${verdict.consensus} for candidate from ${originator.agent_id}. ` +
        `The lens role definition may need re-calibration.`,
    });
  }

  return suggestions;
}

/**
 * Signal 2: degraded states with panel_contract_invalid.
 *
 * When the panel contract validation fails, the lens prompt contract itself
 * may be outdated or inconsistent.
 */
function detectContractSignals(
  degradedStates: DegradedStateEntry[],
  projectRoot: string,
): HarnessReviewSuggestion[] {
  const contractInvalids = degradedStates.filter(
    (d) => d.kind === "panel_contract_invalid",
  );
  if (contractInvalids.length === 0) return [];

  const file = "processes/review/lens-prompt-contract.md";
  if (!fs.existsSync(path.join(projectRoot, file))) return [];

  // Include the first detail so the operator can distinguish true contract
  // drift from transient LLM/network failures (which do not warrant harness
  // changes).
  const firstDetail = contractInvalids[0]?.detail ?? "(no detail captured)";

  return [
    {
      file,
      reason:
        `${contractInvalids.length} panel_contract_invalid event(s). First detail: "${truncate(firstDetail, 200)}". ` +
        `Review only if the detail indicates contract/prompt mismatch; ` +
        `transient LLM/network failures do not warrant harness changes.`,
    },
  ];
}

/**
 * Signal 3: creation gate failures > 0.
 *
 * When items fail the creation gate, the prompt section that generates
 * learning lines may need adjustment.
 */
function detectCreationGateSignals(
  creationGateFailures: number,
  projectRoot: string,
): HarnessReviewSuggestion[] {
  if (creationGateFailures <= 0) return [];

  const file = "src/core-runtime/learning/prompt-sections.ts";
  if (!fs.existsSync(path.join(projectRoot, file))) return [];

  return [
    {
      file,
      reason:
        `${creationGateFailures} creation gate failure(s). ` +
        `The prompt section that generates learning lines may produce malformed output.`,
    },
  ];
}

/**
 * Signal 4: event_marker_review_candidates exceeds threshold.
 *
 * When many items carry event markers, the lens with the most markers is
 * likely producing unstable judgments that keep getting invalidated.
 */
function detectEventMarkerSignals(
  eventMarkerReviewCandidates: number,
  panelVerdicts: PanelVerdict[],
  projectRoot: string,
): HarnessReviewSuggestion[] {
  if (eventMarkerReviewCandidates <= EVENT_MARKER_REVIEW_THRESHOLD) return [];

  // Find the agent with the most event markers across panel verdicts.
  const markerCountByAgent = new Map<string, number>();
  for (const verdict of panelVerdicts) {
    const agentId = verdict.candidate.agent_id;
    const markerCount = verdict.candidate.event_markers.length;
    if (markerCount > 0) {
      markerCountByAgent.set(
        agentId,
        (markerCountByAgent.get(agentId) ?? 0) + markerCount,
      );
    }
  }

  if (markerCountByAgent.size === 0) return [];

  // Pick the agent with the highest marker count.
  let topAgent = "";
  let topCount = 0;
  for (const [agent, count] of markerCountByAgent) {
    if (count > topCount) {
      topAgent = agent;
      topCount = count;
    }
  }

  if (!topAgent) return [];

  const file = `roles/${topAgent}.md`;
  // Skip retired/legacy agents whose canonical role file no longer exists.
  if (!fs.existsSync(path.join(projectRoot, file))) return [];

  return [
    {
      file,
      reason:
        `${eventMarkerReviewCandidates} event marker review candidates (threshold: ${EVENT_MARKER_REVIEW_THRESHOLD}). ` +
        `Lens ${topAgent} has the most markers (${topCount}). ` +
        `Its role definition may be producing unstable judgments.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Generate a markdown section listing harness files that should be reviewed
 * based on signals in the promote report.
 *
 * Returns empty string when no suggestions are warranted.
 */
export function generateHarnessReviewSuggestions(
  report: PromoteReport,
  projectRoot: string,
): string {
  const suggestions: HarnessReviewSuggestion[] = [
    ...detectVerdictSignals(report.panel_verdicts, projectRoot),
    ...detectContractSignals(report.degraded_states, projectRoot),
    ...detectCreationGateSignals(
      report.health_snapshot.creation_gate_failures,
      projectRoot,
    ),
    ...detectEventMarkerSignals(
      report.health_snapshot.event_marker_review_candidates,
      report.panel_verdicts,
      projectRoot,
    ),
  ];

  if (suggestions.length === 0) return "";

  // Deduplicate by file path — keep the first reason encountered.
  const seen = new Set<string>();
  const deduped: HarnessReviewSuggestion[] = [];
  for (const s of suggestions) {
    if (seen.has(s.file)) continue;
    seen.add(s.file);
    deduped.push(s);
  }

  const lines: string[] = [
    "",
    "## Harness Review Suggestions",
    "",
  ];

  for (const s of deduped) {
    lines.push(`- **${s.file}**`);
    lines.push(`  ${s.reason}`);
  }

  lines.push("");

  return lines.join("\n");
}
