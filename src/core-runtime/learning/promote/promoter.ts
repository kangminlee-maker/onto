/**
 * Phase 3 Promote — Phase A Orchestrator (Step 10a).
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-1 (2-Phase + strict source-read-only Phase A)
 *   - learn-phase3-design-v5.md §1.3 Phase A canonical sequence
 *   - learn-phase3-design-v5.md DD-13/DD-19 (P-14 audit ordering + lineage)
 *   - processes/promote.md Step 1~9
 *
 * Responsibility:
 *   - Strict source-read-only orchestration of Phase A:
 *       1. Collect (collector.ts) — produces CollectionResult per DD-18 §SST
 *       2. Pre-analysis (placeholder for P-3 exact / P-4 semantic dedup —
 *          stubbed; the panel evaluates criterion 5 anyway)
 *       3. Panel review (panel-reviewer.ts) — DD-2 + DD-7 + DD-12 hard gate
 *       4. Cross-agent dedup discovery (criterion 6 stub)
 *       5. Carry-forward processing on AuditState (DD-17)
 *       6. Judgment audit P-14 (judgment-auditor.ts) — DD-13 + DD-17
 *       7. Retirement analysis (retirement.ts) — DD-6
 *       8. Domain doc candidate identification (domain-doc-proposer.ts) —
 *          DD-19 Phase A part
 *       9. Health snapshot (health-snapshot.ts) — promote.md §9
 *      10. Persist PromoteReport via REGISTRY
 *      11. Persist mutated AuditState (carry-forward + transitions)
 *
 *   - Returns the assembled PromoteReport so the CLI can present it.
 *
 * Scope boundary:
 *   - NO mutation to learning files. The only persisted writes are:
 *       - promote-report.json (PromoteReport)
 *       - audit-state.yaml (AuditObligation transitions from carry-forward
 *         and P-14 lifecycle)
 *     Both are control artifacts, not user-facing learning content.
 *   - Cross-agent dedup criterion 6 is a no-op stub for Phase A MVP. The
 *     LLM-driven version is scheduled for Step 13 follow-up.
 *
 * Failure model:
 *   - Collector never throws; parse_errors are surfaced in
 *     PromoteReport.warnings.
 *   - Panel review can produce degraded states (member_unreachable,
 *     panel_contract_invalid, panel_minimum_unmet) — collected but Phase A
 *     does NOT abort on them. Phase B's gate is the hard gate.
 *   - Audit failures route through obligation lifecycle transitions.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REGISTRY } from "../shared/artifact-registry.js";
import {
  loadAuditState,
  saveAuditState,
  processCarryForward,
  type AuditState,
} from "../shared/audit-state.js";
import { collect } from "./collector.js";
import {
  reviewPanel,
  discoverCrossAgentDedupClusters,
  candidateIdOf,
} from "./panel-reviewer.js";
import {
  runJudgmentAudit,
  DEFAULT_AUDIT_POLICY,
} from "./judgment-auditor.js";
import { identifyRetirementCandidates } from "./retirement.js";
import { identifyDomainDocCandidates } from "./domain-doc-proposer.js";
import { buildHealthSnapshot } from "./health-snapshot.js";
import type {
  AuditPolicy,
  CollectorMode,
  ConflictProposalView,
  PreAnalysisResult,
  PromoteReport,
} from "./types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RunPromoterConfig {
  mode: CollectorMode;
  sessionId: string;
  projectRoot: string;
  /** Override `~/.onto/` for tests. */
  ontoHome?: string;
  /** Override audit-state.yaml location (defaults under ontoHome). */
  auditStatePath?: string;
  /** Override session root (defaults under projectRoot/.onto/sessions/promote/<id>/). */
  sessionRoot?: string;
  /** Skip the (expensive) panel LLM calls. Used by smoke tests. */
  skipPanel?: boolean;
  /** Skip the (expensive) judgment audit LLM calls. */
  skipAudit?: boolean;
  /** Audit policy override (defaults to DEFAULT_AUDIT_POLICY). */
  auditPolicy?: AuditPolicy;
  /** LLM model id override forwarded to panel-reviewer + judgment-auditor. */
  modelId?: string;
}

export interface RunPromoterResult {
  report: PromoteReport;
  reportPath: string;
  auditStatePath: string;
  sessionRoot: string;
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function resolveSessionRoot(config: RunPromoterConfig): string {
  if (config.sessionRoot) return config.sessionRoot;
  return path.join(
    config.projectRoot,
    ".onto",
    "sessions",
    "promote",
    config.sessionId,
  );
}

function resolveAuditStatePath(config: RunPromoterConfig): string {
  if (config.auditStatePath) return config.auditStatePath;
  const home = config.ontoHome ?? path.join(os.homedir(), ".onto");
  return path.join(home, "audit-state.yaml");
}

// ---------------------------------------------------------------------------
// Pre-analysis stub (P-3 exact dedup, P-4 semantic dedup)
// ---------------------------------------------------------------------------

/**
 * Pre-analysis pass — currently a structural stub.
 *
 * The full design includes P-3 (exact dedup) and P-4 (semantic dedup) before
 * the panel review. We stub it because the panel's criterion 5 already runs
 * the semantic same-principle test against globals; emitting a separate
 * pre-analysis layer would create two LLM call paths for the same axis
 * without a clear cost win for the MVP.
 *
 * The function returns an empty list so PromoteReport assembly stays stable;
 * step 13 follow-up will replace this with the LLM-driven dedup pass once
 * we measure the actual rejection rate from the panel.
 */
function runPreAnalysis(): PreAnalysisResult[] {
  return [];
}

// ---------------------------------------------------------------------------
// Phase A entry point
// ---------------------------------------------------------------------------

export async function runPromoter(
  config: RunPromoterConfig,
): Promise<RunPromoterResult> {
  const sessionRoot = resolveSessionRoot(config);
  const auditStatePath = resolveAuditStatePath(config);
  fs.mkdirSync(sessionRoot, { recursive: true });

  // -------------------------------------------------------------------------
  // Step 1: Collect — DD-18 §SST canonical seats
  // -------------------------------------------------------------------------
  const collection = collect({
    mode: config.mode,
    projectRoot: config.projectRoot,
  });

  const warnings: string[] = [];
  if (collection.parse_errors.length > 0) {
    warnings.push(
      `${collection.parse_errors.length} learning lines failed to parse — ` +
        `see parse_errors. These items are excluded from this session.`,
    );
  }

  // -------------------------------------------------------------------------
  // Step 2: Pre-analysis (stub)
  // -------------------------------------------------------------------------
  const pre_analysis = runPreAnalysis();

  // -------------------------------------------------------------------------
  // Step 3: Panel review — DD-2 + DD-7 + DD-12
  // -------------------------------------------------------------------------
  let panelVerdicts: PromoteReport["panel_verdicts"] = [];
  let degradedFromPanel: PromoteReport["degraded_states"] = [];

  if (!config.skipPanel && collection.candidate_items.length > 0) {
    const panelResult = await reviewPanel({
      candidates: collection.candidate_items,
      globalItems: collection.global_items,
      ...(config.ontoHome !== undefined ? { ontoHome: config.ontoHome } : {}),
      ...(config.modelId !== undefined ? { modelId: config.modelId } : {}),
    });
    panelVerdicts = panelResult.verdicts;
    degradedFromPanel = panelResult.degraded_states;
  } else if (config.skipPanel) {
    warnings.push(
      "Panel review skipped (skipPanel=true). " +
        "PromoteReport contains zero panel_verdicts.",
    );
  }

  // -------------------------------------------------------------------------
  // Step 4: Cross-agent dedup (criterion 6) — stub
  // -------------------------------------------------------------------------
  const cross_agent_dedup_clusters = discoverCrossAgentDedupClusters(
    collection.candidate_items,
    collection.global_items,
  );

  // -------------------------------------------------------------------------
  // Step 5: Audit-state carry-forward + Step 6: P-14 judgment audit
  // -------------------------------------------------------------------------
  let auditState: AuditState = loadAuditState(auditStatePath);
  auditState = processCarryForward(auditState, config.sessionId);

  let auditOutcomes: PromoteReport["audit_summary"] = {
    policy: config.auditPolicy ?? DEFAULT_AUDIT_POLICY,
    obligations_processed: [],
    eligibility: [],
    execution: { audited_agents: [], audited_items_count: 0, llm_calls: 0 },
    outcomes: { retain: 0, modify: 0, delete: 0, audit_to_conflict_proposal: 0 },
  };
  const auditConflictProposals: ConflictProposalView[] = [];

  if (!config.skipAudit) {
    const auditResult = await runJudgmentAudit({
      globalItems: collection.global_items,
      state: auditState,
      sessionId: config.sessionId,
      ...(config.auditPolicy !== undefined
        ? { policy: config.auditPolicy }
        : {}),
      ...(config.modelId !== undefined ? { modelId: config.modelId } : {}),
    });
    auditOutcomes = auditResult.summary;

    // DD-19 lineage: audit_to_conflict_proposal outcomes flow into
    // ConflictProposal[] with origin="judgment_audit" + obligation linkage.
    for (const outcome of auditResult.outcomes) {
      if (outcome.decision !== "audit_to_conflict_proposal") continue;
      auditConflictProposals.push({
        source_session_id: config.sessionId,
        lens_id: outcome.agent_id,
        new_item_line: outcome.item.raw_line,
        matched_existing_line: outcome.item.raw_line,
        decision: "conflict_propose_keep",
        conflict_kind: "contradiction",
        reason: outcome.reason,
      });
    }
  } else {
    warnings.push("Judgment audit skipped (skipAudit=true).");
  }

  // -------------------------------------------------------------------------
  // Step 7: Retirement analysis — DD-6
  // -------------------------------------------------------------------------
  const retirement_candidates = identifyRetirementCandidates(
    collection.global_items,
  );

  // -------------------------------------------------------------------------
  // Step 8: Domain doc candidates — DD-19 Phase A part
  // -------------------------------------------------------------------------
  const domain_doc_candidates = identifyDomainDocCandidates(panelVerdicts);

  // -------------------------------------------------------------------------
  // Step 9: Health snapshot — promote.md §9
  // -------------------------------------------------------------------------
  const health_snapshot = buildHealthSnapshot({
    globalItems: collection.global_items,
    panelVerdicts,
    retirementCandidates: retirement_candidates,
    crossAgentDedupClusters: cross_agent_dedup_clusters,
    extras: {
      axis_tag_re_evaluation_changes_this_session: countAxisTagChanges(
        panelVerdicts,
      ),
      creation_gate_failures: 0, // Phase 3 MVP — populated when extractor wires it through
      applied_learnings_aggregate: { yes: 0, no: 0 },
    },
  });

  // -------------------------------------------------------------------------
  // Step 10: Build PromoteReport
  // -------------------------------------------------------------------------
  const generated_at = new Date().toISOString();

  // ConflictProposal[] from collector + audit. The collector currently surfaces
  // none (Phase 2 ConflictProposal merging is a Step 13 follow-up), so the
  // only entries are audit-derived.
  const conflict_proposals: ConflictProposalView[] = auditConflictProposals;

  const report: PromoteReport = {
    schema_version: "1",
    session_id: config.sessionId,
    generated_at,
    mode: config.mode,
    collection,
    pre_analysis,
    panel_verdicts: panelVerdicts,
    cross_agent_dedup_clusters,
    audit_summary: auditOutcomes,
    retirement_candidates,
    conflict_proposals,
    domain_doc_candidates,
    health_snapshot,
    degraded_states: degradedFromPanel,
    warnings,
  };

  // -------------------------------------------------------------------------
  // Step 11: Persist via REGISTRY
  // -------------------------------------------------------------------------
  const reportPath = path.join(sessionRoot, "promote-report.json");
  REGISTRY.saveToFile("promote_report", reportPath, report);

  // Persist the mutated audit state (carry-forward + P-14 transitions). The
  // ledger lives outside the session root because it's the canonical
  // cross-session truth (DD-17 SYN-UF-03).
  saveAuditState(auditState, auditStatePath);

  return {
    report,
    reportPath,
    auditStatePath,
    sessionRoot,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Count panel verdicts whose axis_tag_recommendation differs from "retain".
 *
 * This is the per-session axis tag re-evaluation churn — promote.md §9
 * exposes it so operators can spot taxonomies that are still settling.
 */
function countAxisTagChanges(
  verdicts: PromoteReport["panel_verdicts"],
): number {
  let count = 0;
  for (const v of verdicts) {
    for (const r of v.member_reviews) {
      if (
        r.axis_tag_recommendation !== "retain" &&
        r.axis_tag_recommendation !== "no_recommendation"
      ) {
        count += 1;
        break; // count once per candidate
      }
    }
  }
  return count;
}

// Re-export for CLI consumers needing to compute candidate ids over a
// loaded report (e.g., to match a user's "promote 1,3" selection).
export { candidateIdOf };
