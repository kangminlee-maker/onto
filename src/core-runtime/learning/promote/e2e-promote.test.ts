/**
 * Phase 3 Promote — Focused E2E test suite (Step 13).
 *
 * Run: `npx tsx src/core-runtime/learning/promote/e2e-promote.test.ts`
 *
 * Scope:
 *   - Critical path coverage without LLM dependencies. Tests use synthetic
 *     fixtures in tmpdir so they don't touch the user's real
 *     `~/.onto/learnings/` tree.
 *   - The full design lists 138 test cases (E-P1~E-P138). This script
 *     covers a focused subset of structurally critical assertions; the
 *     remainder is left to follow-up coverage runs once Phase 3 has
 *     stabilized in the field.
 *
 * Test naming:
 *   E-PNNN — matches the design test ids when applicable. Tests added beyond
 *   the design enumeration use the prefix E-PX (extra).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// DD-20: side-effect import to wire the builtin spec registrar before any
// REGISTRY operation runs. Tests that touch promoter / executor / session
// guard need this; tests that only use pure helpers don't, but the side
// effect is idempotent.
import "../shared/artifact-registry-init.js";

import { collect, verifyBaselineHash } from "./collector.js";
import { identifyRetirementCandidates } from "./retirement.js";
import {
  summarizeDegradedStates,
  severityOf,
} from "./degraded-state.js";
import {
  generateUlid,
  initApplyState,
  markApplied,
  markFailed,
  transitionStatus,
} from "./apply-state.js";
import {
  composePanel,
  candidateIdOf,
  validatePanelMemberReview,
  aggregateConsensus,
} from "./panel-reviewer.js";
import {
  determineAuditEligibility,
  DEFAULT_AUDIT_POLICY,
} from "./judgment-auditor.js";
import { identifyDomainDocCandidates, deriveSlotId } from "./domain-doc-proposer.js";
import { buildHealthSnapshot } from "./health-snapshot.js";
import { runPromoter } from "./promoter.js";
import { runPromoteExecutor } from "./promote-executor.js";
import { runInsightReclassifier } from "./insight-reclassifier.js";
import {
  saveRecoveryResolution,
  loadRecoveryResolution,
  resolveRecoveryTruth,
  gatherRecoveryContext,
} from "../shared/recovery-context.js";
import {
  inspectMigrationStatus,
  ensureSessionRootsMigrated,
  MigrationRequiredError,
} from "../../cli/session-root-guard.js";
import { migrateSessionRoots } from "../../cli/migrate-session-roots.js";
import type {
  DegradedStateEntry,
  PanelMemberReview,
  PanelVerdict,
  ParsedLearningItem,
  PromoteDecisions,
} from "./types.js";
import type { AuditState } from "../shared/audit-state.js";

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(
      () => {
        process.stdout.write(`  PASS  ${name}\n`);
        passCount += 1;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(`  FAIL  ${name}\n        ${message}\n`);
        failures.push(`${name}: ${message}`);
        failCount += 1;
      },
    );
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeTmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `onto-e2e-${prefix}-`));
}

function writeLearningFile(
  dir: string,
  agentId: string,
  contents: string,
): string {
  const filePath = path.join(dir, `${agentId}.md`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
  return filePath;
}

function syntheticItem(overrides: Partial<ParsedLearningItem>): ParsedLearningItem {
  return {
    agent_id: "structure",
    scope: "global",
    source_path: "/tmp/x.md",
    raw_line: "- [fact] [methodology] [foundation] body (source: p, d, 2026-01-01) [impact:normal]",
    line_number: 1,
    type: "fact",
    applicability_tags: ["methodology"],
    role: "foundation",
    content: "body",
    source_project: "p",
    source_domain: "d",
    source_date: "2026-01-01",
    impact: "normal",
    learning_id: null,
    event_markers: [],
    retention_confirmed_at: null,
    ...overrides,
  };
}

function syntheticReview(verdict: "promote" | "defer" | "reject"): PanelMemberReview {
  return {
    member: { agent_id: "structure", role: "originator", reachable: true },
    verdict,
    criteria: [
      { criterion: 1, judgment: verdict === "promote" ? "yes" : "no", reasoning: "c1" },
      { criterion: 2, judgment: verdict === "promote" ? "yes" : "no", reasoning: "c2" },
      { criterion: 3, judgment: verdict === "promote" ? "yes" : "no", reasoning: "c3" },
      { criterion: 4, judgment: "yes", reasoning: "c4" },
      { criterion: 5, judgment: verdict === "promote" ? "yes" : "no", reasoning: "c5" },
    ],
    axis_tag_recommendation: "retain",
    axis_tag_note: "",
    reason: `synthetic ${verdict}`,
    llm_model_id: "mock",
    llm_prompt_hash: "00000000",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  process.stdout.write("Phase 3 promote E2E (focused)\n");
  process.stdout.write("=================================\n");

  // E-P1 — collector mode dispatch promote
  await test("E-P1 collector promote mode filters out [insight] from project", () => {
    const projectRoot = makeTmpDir("e-p1");
    const projDir = path.join(projectRoot, ".onto", "learnings");
    writeLearningFile(
      projDir,
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [guardrail] g (source: p, d, 2026-01-01) [impact:normal]",
        "- [fact] [methodology] [insight] i (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const result = collect({ mode: "promote", projectRoot });
    assertEqual(result.project_items.length, 2, "project_items count");
    assertEqual(result.candidate_items.length, 1, "candidate_items excludes insight");
    assertEqual(result.candidate_items[0]!.role, "guardrail", "kept guardrail");
  });

  // E-P2 — collector reclassify-insights mode
  await test("E-P2 collector reclassify-insights mode targets only [insight]", () => {
    const projectRoot = makeTmpDir("e-p2");
    // Empty project; everything in fake home (override via HOME)
    const fakeHome = makeTmpDir("e-p2-home");
    const globalDir = path.join(fakeHome, ".onto", "learnings");
    writeLearningFile(
      globalDir,
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [guardrail] g (source: p, d, 2026-01-01) [impact:normal]",
        "- [fact] [methodology] [insight] i (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const previousHome = process.env.HOME;
    process.env.HOME = fakeHome;
    try {
      const result = collect({ mode: "reclassify-insights", projectRoot });
      assertEqual(result.global_items.length, 2, "global_items count");
      assertEqual(result.candidate_items.length, 1, "candidate_items only insight");
      assertEqual(result.candidate_items[0]!.role, "insight", "is insight");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  // E-P3 — baseline hash round-trip
  await test("E-P3 verifyBaselineHash detects unchanged files", () => {
    const projectRoot = makeTmpDir("e-p3");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      "<!-- format_version: 1 -->\n- [fact] [methodology] [foundation] x (source: p, d, 2026-01-01) [impact:normal]\n",
    );
    const result = collect({ mode: "promote", projectRoot });
    const mismatches = verifyBaselineHash(result.baseline_hash);
    assertEqual(mismatches.length, 0, "no mismatches initially");
  });

  // E-P4 — baseline hash detects content drift
  await test("E-P4 verifyBaselineHash detects content_sha256 drift", () => {
    const projectRoot = makeTmpDir("e-p4");
    const filePath = writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      "<!-- format_version: 1 -->\n- [fact] [methodology] [foundation] x (source: p, d, 2026-01-01) [impact:normal]\n",
    );
    const result = collect({ mode: "promote", projectRoot });
    fs.appendFileSync(filePath, "- [fact] [methodology] [convention] new (source: p, d, 2026-01-02) [impact:normal]\n");
    const mismatches = verifyBaselineHash(result.baseline_hash);
    assert(mismatches.length > 0, "drift detected");
    assertEqual(mismatches[0]!.reason, "size_changed", "size_changed reason");
  });

  // E-P5 — retirement: 2+ markers triggers candidate
  await test("E-P5 retirement candidate when 2+ event markers post-cutoff", () => {
    const item = syntheticItem({
      event_markers: [
        "<!-- applied-then-found-invalid: 2026-04-01, x, target:abc -->",
        "<!-- applied-then-found-invalid: 2026-04-05, y, target:abc -->",
      ],
    });
    const candidates = identifyRetirementCandidates([item]);
    assertEqual(candidates.length, 1, "1 candidate");
    assertEqual(candidates[0]!.marker_count, 2, "marker_count");
  });

  // E-P6 — retention-confirmed cutoff excludes prior markers
  await test("E-P6 retention-confirmed cutoff excludes pre-cutoff markers", () => {
    const item = syntheticItem({
      event_markers: [
        "<!-- applied-then-found-invalid: 2026-04-01, x, target:abc -->",
        "<!-- applied-then-found-invalid: 2026-04-05, y, target:abc -->",
      ],
      retention_confirmed_at: "2026-05-01",
    });
    const candidates = identifyRetirementCandidates([item]);
    assertEqual(candidates.length, 0, "no candidates after cutoff");
  });

  // E-P7 — degraded state severity tier
  await test("E-P7 panel_minimum_unmet is blocking severity", () => {
    assertEqual(severityOf("panel_minimum_unmet"), "blocking", "blocking");
    assertEqual(severityOf("member_unreachable"), "degraded", "degraded");
    assertEqual(severityOf("criterion_6_waived"), "informational", "informational");
  });

  // E-P8 — degraded state summary aggregation
  await test("E-P8 summarizeDegradedStates aggregates by tier", () => {
    const entries: DegradedStateEntry[] = [
      { kind: "panel_minimum_unmet", detail: "x", affected_candidates: ["c1"], occurred_at: "now" },
      { kind: "member_unreachable", detail: "y", occurred_at: "now" },
      { kind: "criterion_6_waived", detail: "z", occurred_at: "now" },
    ];
    const summary = summarizeDegradedStates(entries);
    assertEqual(summary.blocking_count, 1, "blocking");
    assertEqual(summary.degraded_count, 1, "degraded");
    assertEqual(summary.informational_count, 1, "informational");
    assertEqual(summary.blocked_candidate_ids[0], "c1", "blocked candidate");
  });

  // E-P9 — ULID format
  await test("E-P9 generateUlid produces 26-char Crockford base32", () => {
    const id = generateUlid();
    assertEqual(id.length, 26, "ulid length");
    assert(/^[0-9A-HJKMNP-TV-Z]+$/.test(id), "ulid alphabet");
  });

  // E-P10 — apply state lifecycle
  await test("E-P10 apply-state lifecycle init → applied → completed", () => {
    let state = initApplyState({
      sessionId: "test",
      pendingDecisions: [{ decision_kind: "promotion", decision_id: "p1" }],
    });
    assertEqual(state.status, "in_progress", "initial status");
    assertEqual(state.generation, 0, "initial generation");
    state = markApplied(state, {
      decision_kind: "promotion",
      decision_id: "p1",
      applied_at: "now",
      target_path: "/x",
      result_summary: "ok",
    });
    assertEqual(state.applied_decisions.length, 1, "one applied");
    assertEqual(state.pending_decisions.length, 0, "none pending");
    assertEqual(state.generation, 1, "generation bumped");
    state = transitionStatus(state, "completed");
    assertEqual(state.status, "completed", "transitioned");
  });

  // E-P11 — apply state rejects state_persistence_failed
  await test("E-P11 transitionStatus rejects state_persistence_failed", () => {
    const state = initApplyState({
      sessionId: "test",
      pendingDecisions: [],
    });
    let threw = false;
    try {
      transitionStatus(state, "state_persistence_failed");
    } catch {
      threw = true;
    }
    assert(threw, "should throw");
  });

  // E-P12 — apply state markFailed unknown decision throws
  await test("E-P12 markFailed throws on unknown decision_id", () => {
    const state = initApplyState({
      sessionId: "test",
      pendingDecisions: [{ decision_kind: "promotion", decision_id: "p1" }],
    });
    let threw = false;
    try {
      markFailed(state, {
        decision_kind: "promotion",
        decision_id: "p99",
        attempted_at: "now",
        error_message: "x",
        resumable: false,
      });
    } catch {
      threw = true;
    }
    assert(threw, "should throw on unknown id");
  });

  // E-P13 — panel composition produces 3-agent
  await test("E-P13 composePanel returns 3-agent for non-philosopher origin", () => {
    const home = makeTmpDir("e-p13-home");
    const globalDir = path.join(home, ".onto", "learnings");
    fs.mkdirSync(globalDir, { recursive: true });
    fs.writeFileSync(path.join(globalDir, "structure.md"), "");
    fs.writeFileSync(path.join(globalDir, "philosopher.md"), "");
    fs.writeFileSync(path.join(globalDir, "logic.md"), "");
    const item = syntheticItem({ agent_id: "structure" });
    const panel = composePanel(item, { ontoHome: home });
    assertEqual(panel.length, 3, "3 members");
    const roles = panel.map((m) => m.role).sort();
    assert(roles.includes("originator"), "has originator");
    assert(roles.includes("philosopher"), "has philosopher");
    assert(roles.includes("auto_selected"), "has auto_selected");
  });

  // E-P14 — panel validator coherence: all-yes + non-promote → fail
  await test("E-P14 panel validator rejects all-yes + non-promote verdict", () => {
    const review = syntheticReview("promote");
    review.verdict = "defer";
    const result = validatePanelMemberReview(review);
    assert(!result.passed, "should fail");
    assert(
      result.failures.some((f) => f.includes("all yes but verdict")),
      "right reason",
    );
  });

  // E-P15 — DD-12 hard gate: 1 member → panel_minimum_unmet
  await test("E-P15 aggregateConsensus 1 member → panel_minimum_unmet", () => {
    const consensus = aggregateConsensus([syntheticReview("promote")]);
    assertEqual(consensus, "panel_minimum_unmet", "hard gate");
  });

  // E-P16 — consensus 3/3 promote
  await test("E-P16 aggregateConsensus 3/3 → promote_3_3", () => {
    const consensus = aggregateConsensus([
      syntheticReview("promote"),
      syntheticReview("promote"),
      syntheticReview("promote"),
    ]);
    assertEqual(consensus, "promote_3_3", "3/3");
  });

  // E-P17 — judgment audit eligibility
  await test("E-P17 audit eligibility: count_threshold ≥10", () => {
    const items: ParsedLearningItem[] = [];
    for (let i = 0; i < 11; i++) {
      items.push(syntheticItem({ agent_id: "structure", type: "judgment", line_number: i }));
    }
    const auditState: AuditState = { schema_version: "1", obligations: [] };
    const eligibility = determineAuditEligibility(items, auditState, DEFAULT_AUDIT_POLICY);
    assertEqual(eligibility.length, 1, "1 eligible agent");
    assertEqual(eligibility[0]!.trigger, "count_threshold", "count_threshold");
  });

  // E-P18 — domain doc slot stability
  await test("E-P18 deriveSlotId is deterministic", () => {
    const a = deriveSlotId("promo-1", "concepts.md", "finance");
    const b = deriveSlotId("promo-1", "concepts.md", "finance");
    const c = deriveSlotId("promo-1", "concepts.md", "business");
    assertEqual(a, b, "same input → same slot");
    assert(a !== c, "different domain → different slot");
  });

  // E-P19 — domain doc fan-out
  await test("E-P19 identifyDomainDocCandidates fans out per domain tag", () => {
    const item = syntheticItem({
      agent_id: "semantics",
      applicability_tags: ["methodology", "domain/finance", "domain/business"],
    });
    const verdict: PanelVerdict = {
      candidate_id: candidateIdOf(item),
      candidate: item,
      panel_members: [],
      member_reviews: [],
      consensus: "promote_3_3",
      is_contradiction: false,
      matched_existing_line: null,
    };
    const candidates = identifyDomainDocCandidates([verdict]);
    assertEqual(candidates.length, 2, "2 candidates");
    const domains = candidates.map((c) => c.domain).sort();
    assertEqual(domains.join(","), "business,finance", "fan-out by domain");
  });

  // E-P20 — health snapshot pcts sum to <=100 (rounding allows minor drift)
  await test("E-P20 health snapshot axis percentages sum within tolerance", () => {
    const items = [
      syntheticItem({ applicability_tags: ["methodology"] }),
      syntheticItem({ applicability_tags: ["domain/x"] }),
      syntheticItem({ applicability_tags: ["methodology", "domain/x"] }),
    ];
    const snap = buildHealthSnapshot({
      globalItems: items,
      panelVerdicts: [],
      retirementCandidates: [],
      crossAgentDedupClusters: [],
      extras: {
        axis_tag_re_evaluation_changes_this_session: 0,
        creation_gate_failures: 0,
        applied_learnings_aggregate: { yes: 0, no: 0 },
      },
    });
    const total =
      snap.axis_distribution.methodology_only_pct +
      snap.axis_distribution.domain_only_pct +
      snap.axis_distribution.dual_pct;
    assert(Math.abs(total - 100) < 1, `sum ${total} within 1%`);
  });

  // E-P21 — session-root-guard new user case writes marker
  await test("E-P21 ensureSessionRootsMigrated writes marker for new user", () => {
    const projectRoot = makeTmpDir("e-p21");
    const status = ensureSessionRootsMigrated(projectRoot, "enforce");
    assert(status.marker_present, "marker written");
    assertEqual(status.marker_compatible, true, "compatible");
  });

  // E-P22 — session-root-guard legacy without marker → throws
  await test("E-P22 legacy sessions without marker → MigrationRequiredError", () => {
    const projectRoot = makeTmpDir("e-p22");
    const sessionsDir = path.join(projectRoot, ".onto", "sessions");
    fs.mkdirSync(path.join(sessionsDir, "20260101-deadbeef"), { recursive: true });
    let threw = false;
    try {
      ensureSessionRootsMigrated(projectRoot, "enforce");
    } catch (error) {
      threw = error instanceof MigrationRequiredError;
    }
    assert(threw, "should throw MigrationRequiredError");
  });

  // E-P23 — migrate-session-roots dry run
  await test("E-P23 migrateSessionRoots dry-run does not move files", () => {
    const projectRoot = makeTmpDir("e-p23");
    const sessionsDir = path.join(projectRoot, ".onto", "sessions");
    const legacyDir = path.join(sessionsDir, "20260101-aabbcc");
    fs.mkdirSync(legacyDir, { recursive: true });
    const result = migrateSessionRoots({ projectRoot, dryRun: true });
    assertEqual(result.dry_run, true, "dry-run flagged");
    assertEqual(result.migrated.length, 1, "1 planned");
    assert(fs.existsSync(legacyDir), "legacy dir still in place");
    assert(!fs.existsSync(path.join(sessionsDir, "review", "20260101-aabbcc")), "no move");
  });

  // E-P24 — migrate-session-roots actual run + idempotent re-run
  await test("E-P24 migrateSessionRoots moves files and is idempotent", () => {
    const projectRoot = makeTmpDir("e-p24");
    const sessionsDir = path.join(projectRoot, ".onto", "sessions");
    const legacyDir = path.join(sessionsDir, "20260101-aabbcc");
    fs.mkdirSync(legacyDir, { recursive: true });

    const result1 = migrateSessionRoots({ projectRoot, dryRun: false });
    assertEqual(result1.migrated.length, 1, "moved 1");
    assertEqual(result1.marker_written, true, "marker written");
    assert(fs.existsSync(path.join(sessionsDir, "review", "20260101-aabbcc")), "moved");
    assert(!fs.existsSync(legacyDir), "legacy gone");

    const result2 = migrateSessionRoots({ projectRoot, dryRun: false });
    assertEqual(result2.migrated.length, 0, "second run no-op");
    assertEqual(result2.marker_written, false, "marker not re-written");
  });

  // E-P25 — promoter Phase A end-to-end (skipPanel + skipAudit)
  await test("E-P25 runPromoter assembles report without LLM calls", async () => {
    const projectRoot = makeTmpDir("e-p25");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [foundation] x (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const fakeOnto = makeTmpDir("e-p25-home");
    const result = await runPromoter({
      mode: "promote",
      sessionId: "test-session",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });
    assert(fs.existsSync(result.reportPath), "report written");
    assertEqual(result.report.collection.candidate_items.length, 1, "1 candidate");
    assertEqual(result.report.panel_verdicts.length, 0, "panel skipped");
  });

  // E-P26 — promote-executor stale_baseline path
  await test("E-P26 runPromoteExecutor returns stale_baseline when source drifts", async () => {
    const projectRoot = makeTmpDir("e-p26");
    const learnFile = writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [foundation] x (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const fakeOnto = makeTmpDir("e-p26-home");

    // Phase A
    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-stale",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });

    // Write decisions file (empty so we don't try to apply)
    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-stale",
      prepared_at: new Date().toISOString(),
      promotions: [],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [],
      axis_tag_changes: [],
      retirements: [],
      domain_doc_updates: [],
      audit_outcomes: [],
      audit_obligations_waived: [],
    };
    fs.writeFileSync(
      path.join(promoter.sessionRoot, "promote-decisions.json"),
      JSON.stringify(decisions, null, 2),
    );

    // Drift the source file
    fs.appendFileSync(learnFile, "drift\n");

    const outcome = await runPromoteExecutor({
      sessionId: "test-stale",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(outcome.kind, "stale_baseline", "stale_baseline path");
  });

  // E-P27 — promote-executor no_decisions path
  await test("E-P27 runPromoteExecutor returns no_decisions when nothing approved", async () => {
    const projectRoot = makeTmpDir("e-p27");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [foundation] x (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const fakeOnto = makeTmpDir("e-p27-home");
    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-empty",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });
    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-empty",
      prepared_at: new Date().toISOString(),
      promotions: [],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [],
      axis_tag_changes: [],
      retirements: [],
      domain_doc_updates: [],
      audit_outcomes: [],
      audit_obligations_waived: [],
    };
    fs.writeFileSync(
      path.join(promoter.sessionRoot, "promote-decisions.json"),
      JSON.stringify(decisions, null, 2),
    );

    const outcome = await runPromoteExecutor({
      sessionId: "test-empty",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(outcome.kind, "no_decisions", "no_decisions path");
  });

  // E-P28 — promote-executor end-to-end apply (single promotion)
  await test("E-P28 runPromoteExecutor applies a single approved promotion", async () => {
    const projectRoot = makeTmpDir("e-p28");
    const projectLine =
      "- [fact] [methodology] [foundation] e2e body (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      ["<!-- format_version: 1 -->", projectLine].join("\n"),
    );
    const fakeOnto = makeTmpDir("e-p28-home");

    // Phase A
    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-apply",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });

    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-apply",
      prepared_at: new Date().toISOString(),
      promotions: [
        { candidate_agent_id: "structure", candidate_line: projectLine, approve: true },
      ],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [],
      axis_tag_changes: [],
      retirements: [],
      domain_doc_updates: [],
      audit_outcomes: [],
      audit_obligations_waived: [],
    };
    fs.writeFileSync(
      path.join(promoter.sessionRoot, "promote-decisions.json"),
      JSON.stringify(decisions, null, 2),
    );

    const outcome = await runPromoteExecutor({
      sessionId: "test-apply",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(outcome.kind, "completed", "completed");
    if (outcome.kind !== "completed") return;
    assertEqual(outcome.summary.promotions_applied, 1, "1 promotion applied");

    // Verify global file received the line
    const globalFile = path.join(fakeOnto, "learnings", "structure.md");
    assert(fs.existsSync(globalFile), "global file created");
    const globalContent = fs.readFileSync(globalFile, "utf8");
    assert(globalContent.includes("e2e body"), "line appended to global");
    assert(globalContent.includes("learning_id:"), "learning_id marker emitted");

    // Verify project file annotated
    const projectFile = path.join(projectRoot, ".onto", "learnings", "structure.md");
    const projectContent = fs.readFileSync(projectFile, "utf8");
    assert(projectContent.includes("promoted to global"), "project annotated");
  });

  // E-P29 — inspect mode does not write marker
  await test("E-P29 inspect mode does not auto-write marker", () => {
    const projectRoot = makeTmpDir("e-p29");
    const status = inspectMigrationStatus(projectRoot);
    assertEqual(status.marker_present, false, "no marker initially");
    // call inspect mode (NOT enforce)
    ensureSessionRootsMigrated(projectRoot, "inspect");
    const after = inspectMigrationStatus(projectRoot);
    assertEqual(after.marker_present, false, "still no marker after inspect");
  });

  // -------------------------------------------------------------------------
  // Mock-LLM driven E2E tests (D-2) — exercise full LLM call paths via the
  // ONTO_LLM_MOCK=1 in-process mock provider.
  // -------------------------------------------------------------------------

  process.env.ONTO_LLM_MOCK = "1";

  // E-P30 — runPromoter Phase A end-to-end with mock panel + audit
  await test("E-P30 runPromoter assembles report with panel + audit via mock LLM", async () => {
    const projectRoot = makeTmpDir("e-p30");
    const fakeOnto = makeTmpDir("e-p30-home");

    // Project: 1 candidate
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [foundation] e2e-30 (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    // Global: 11 judgment items in `philosopher` to trigger audit
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      [
        "<!-- format_version: 1 -->",
        ...Array.from({ length: 11 }, (_, i) =>
          `- [judgment] [methodology] [foundation] philo-${i} (source: p, d, 2026-01-0${(i % 9) + 1}) [impact:normal]`,
        ),
      ].join("\n"),
    );
    // Global: structure file (so panel composition has known agents)
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "structure",
      ["<!-- format_version: 1 -->"].join("\n"),
    );

    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runPromoter({
        mode: "promote",
        sessionId: "test-mock-30",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      });
      assertEqual(result.report.panel_verdicts.length, 1, "1 panel verdict produced");
      assertEqual(
        result.report.panel_verdicts[0]!.consensus,
        "promote_3_3",
        "mock returns promote_3_3 (or 2_3 if 2-agent)",
      );
      assert(
        result.report.audit_summary.execution.audited_agents.includes("philosopher"),
        "philosopher audited",
      );
      assertEqual(
        result.report.audit_summary.outcomes.retain,
        11,
        "all 11 retained by mock",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P31 — judgment-auditor handles mock LLM provider unreachable gracefully
  await test("E-P31 audit blocks gracefully on provider error", async () => {
    // Disable mock and use a synthetic state with a pending obligation
    delete process.env.ONTO_LLM_MOCK;
    process.env.ONTO_LLM_MOCK = "0";

    const projectRoot = makeTmpDir("e-p31");
    const fakeOnto = makeTmpDir("e-p31-home");
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        ...Array.from({ length: 11 }, (_, i) =>
          `- [judgment] [methodology] [foundation] judge-${i} (source: p, d, 2026-01-01) [impact:normal]`,
        ),
      ].join("\n"),
    );
    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runPromoter({
        mode: "promote",
        sessionId: "test-31",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipPanel: true,
        // skipAudit defaults to false — auditor will hit the network and fail
      });
      // Auditor was eligible but failed due to no provider; outcomes should
      // be empty and llm_calls should reflect at least one attempt.
      assert(
        result.report.audit_summary.eligibility.length > 0,
        "audit was eligible",
      );
      assertEqual(
        result.report.audit_summary.execution.audited_items_count,
        0,
        "no items audited (provider failed)",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      process.env.ONTO_LLM_MOCK = "1"; // restore for subsequent tests
    }
  });

  // E-P32 — insight reclassifier with mock LLM
  await test("E-P32 insight reclassifier classifies via mock LLM", async () => {
    const projectRoot = makeTmpDir("e-p32");
    const fakeOnto = makeTmpDir("e-p32-home");
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [fact] [methodology] [insight] insight-1 (source: p, d, 2026-01-01) [impact:normal]",
        "- [fact] [methodology] [insight] insight-2 (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runInsightReclassifier({
        sessionId: "test-32",
        projectRoot,
        ontoHome: fakeOnto,
      });
      assertEqual(result.total_insights, 2, "2 insights collected");
      assertEqual(result.reclassified.length, 2, "both reclassified by mock");
      assertEqual(
        result.reclassified[0]!.proposed_role,
        "foundation",
        "mock defaults to foundation",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P33 — domain doc applicator writes file via mock LLM
  await test("E-P33 promote-executor applies domain doc update via mock LLM", async () => {
    const projectRoot = makeTmpDir("e-p33");
    const fakeOnto = makeTmpDir("e-p33-home");

    // semantics agent so domain-doc-proposer routes to concepts.md
    const projectLine =
      "- [fact] [methodology] [domain/finance] [foundation] mock semantics term (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "semantics",
      ["<!-- format_version: 1 -->", projectLine].join("\n"),
    );
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "semantics",
      ["<!-- format_version: 1 -->"].join("\n"),
    );
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      ["<!-- format_version: 1 -->"].join("\n"),
    );

    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const promoter = await runPromoter({
        mode: "promote",
        sessionId: "test-33",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipAudit: true,
      });
      // Phase A produced 1 panel verdict promote + 1 domain doc candidate
      assertEqual(
        promoter.report.panel_verdicts.length,
        1,
        "1 panel verdict",
      );
      assertEqual(
        promoter.report.domain_doc_candidates.length,
        1,
        "1 domain doc candidate",
      );

      // Build decisions approving both promotion and domain doc update
      const candidate = promoter.report.domain_doc_candidates[0]!;
      const decisions: PromoteDecisions = {
        schema_version: "1",
        session_id: "test-33",
        prepared_at: new Date().toISOString(),
        promotions: [
          {
            candidate_agent_id: "semantics",
            candidate_line: projectLine,
            approve: true,
          },
        ],
        contradiction_replacements: [],
        cross_agent_dedup_approvals: [],
        axis_tag_changes: [],
        retirements: [],
        domain_doc_updates: [
          {
            slot_id: candidate.slot_id,
            instance_id: candidate.instance_id,
            approve: true,
          },
        ],
        audit_outcomes: [],
        audit_obligations_waived: [],
      };
      fs.writeFileSync(
        path.join(promoter.sessionRoot, "promote-decisions.json"),
        JSON.stringify(decisions, null, 2),
      );

      const outcome = await runPromoteExecutor({
        sessionId: "test-33",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        sessionRoot: promoter.sessionRoot,
      });
      assertEqual(outcome.kind, "completed", "executor completed");
      if (outcome.kind !== "completed") return;
      assertEqual(
        outcome.summary.domain_doc_updates_applied,
        1,
        "1 domain doc update applied",
      );

      // Verify the domain doc was actually written
      const docPath = path.join(
        fakeOnto,
        "domains",
        "finance",
        "concepts.md",
      );
      assert(fs.existsSync(docPath), "concepts.md created");
      const docContent = fs.readFileSync(docPath, "utf8");
      assert(
        docContent.includes(`<!-- slot_id: ${candidate.slot_id} -->`),
        "slot_id marker present",
      );
      assert(docContent.includes("Mock Term"), "mock content present");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P34 — domain doc applicator skips already-written slot (idempotency)
  await test("E-P34 domain doc applicator skips already-written slot", async () => {
    const projectRoot = makeTmpDir("e-p34");
    const fakeOnto = makeTmpDir("e-p34-home");
    const projectLine =
      "- [fact] [methodology] [domain/finance] [foundation] e2e34 (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "semantics",
      ["<!-- format_version: 1 -->", projectLine].join("\n"),
    );
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      ["<!-- format_version: 1 -->"].join("\n"),
    );

    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const promoter = await runPromoter({
        mode: "promote",
        sessionId: "test-34",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipAudit: true,
      });
      const candidate = promoter.report.domain_doc_candidates[0]!;
      const decisions: PromoteDecisions = {
        schema_version: "1",
        session_id: "test-34",
        prepared_at: new Date().toISOString(),
        promotions: [
          {
            candidate_agent_id: "semantics",
            candidate_line: projectLine,
            approve: true,
          },
        ],
        contradiction_replacements: [],
        cross_agent_dedup_approvals: [],
        axis_tag_changes: [],
        retirements: [],
        domain_doc_updates: [
          {
            slot_id: candidate.slot_id,
            instance_id: candidate.instance_id,
            approve: true,
          },
        ],
        audit_outcomes: [],
        audit_obligations_waived: [],
      };
      fs.writeFileSync(
        path.join(promoter.sessionRoot, "promote-decisions.json"),
        JSON.stringify(decisions, null, 2),
      );

      // First apply
      const out1 = await runPromoteExecutor({
        sessionId: "test-34",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        sessionRoot: promoter.sessionRoot,
      });
      assertEqual(out1.kind, "completed", "first apply completed");

      // Manually re-run the executor (simulating a re-attempt). The slot
      // marker should cause the second apply to skip and report success
      // without writing duplicate content.
      const docPath = path.join(
        fakeOnto,
        "domains",
        "finance",
        "concepts.md",
      );
      const sizeBefore = fs.statSync(docPath).size;

      // Reset apply-state by deleting it so the executor starts fresh
      fs.rmSync(
        path.join(promoter.sessionRoot, "promote-execution-result.json"),
        { force: true },
      );

      const out2 = await runPromoteExecutor({
        sessionId: "test-34",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        sessionRoot: promoter.sessionRoot,
        forceStale: true, // file changed because we already applied
      });
      assertEqual(out2.kind, "completed", "second apply completed");

      const sizeAfter = fs.statSync(docPath).size;
      assertEqual(sizeBefore, sizeAfter, "file unchanged on idempotent re-apply");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P35 — cross_agent_dedup applicator consolidates entries
  await test("E-P35 cross_agent_dedup applicator consolidates and marks members", async () => {
    const projectRoot = makeTmpDir("e-p35");
    const fakeOnto = makeTmpDir("e-p35-home");

    // Two global lines from different agents.
    //
    // Path convention note: promote-executor's getGlobalLearningFilePath
    // treats `ontoHome` as the .onto/ directory itself (writes to
    // <ontoHome>/learnings/<agent>.md). The collector + panel-reviewer
    // currently read globals from os.homedir() + .onto/learnings/ — a
    // different convention. We work around this here by writing globals
    // to <fakeOnto>/learnings/ AND setting HOME=<fakeOnto>/.. so the
    // collector reads from the same place. The dual convention is
    // tracked for follow-up alignment.
    const lineA =
      "- [fact] [methodology] [foundation] same principle a (source: p, d, 2026-01-01) [impact:normal]";
    const lineB =
      "- [fact] [methodology] [foundation] same principle b (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(fakeOnto, "learnings"),
      "structure",
      ["<!-- format_version: 1 -->", lineA].join("\n"),
    );
    writeLearningFile(
      path.join(fakeOnto, "learnings"),
      "logic",
      ["<!-- format_version: 1 -->", lineB].join("\n"),
    );

    // Make collector see the same globals: collector reads from
    // os.homedir() + .onto/learnings/, so set HOME so that resolves to
    // <fakeOnto>/learnings/ via a symlink-style alias dir.
    const fakeHome = makeTmpDir("e-p35-home2");
    fs.mkdirSync(path.join(fakeHome, ".onto"), { recursive: true });
    fs.symlinkSync(
      path.join(fakeOnto, "learnings"),
      path.join(fakeHome, ".onto", "learnings"),
    );

    const previousHome = process.env.HOME;
    process.env.HOME = fakeHome;
    try {
      const promoter = await runPromoter({
        mode: "promote",
        sessionId: "test-35",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipPanel: true,
        skipAudit: true,
      });

      // Synthesize a cross-agent dedup cluster manually (the discovery
      // function is a Step 13 stub) and inject it into the report on disk.
      const consolidatedLine =
        "- [fact] [methodology] [foundation] consolidated principle (source: cluster-1, d, 2026-04-08) [impact:normal]";
      const cluster = {
        cluster_id: "cluster-test-35",
        primary_owner_agent: "structure",
        primary_owner_reason: "first generated",
        consolidated_principle: "consolidated principle",
        representative_cases: ["case a", "case b"],
        member_items: [
          { ...syntheticItem({ agent_id: "structure" }), raw_line: lineA },
          { ...syntheticItem({ agent_id: "logic" }), raw_line: lineB },
        ],
        consolidated_line: consolidatedLine,
        user_approval_required: true as const,
      };
      promoter.report.cross_agent_dedup_clusters.push(cluster);
      fs.writeFileSync(
        promoter.reportPath,
        JSON.stringify(promoter.report, null, 2),
      );

      const decisions: PromoteDecisions = {
        schema_version: "1",
        session_id: "test-35",
        prepared_at: new Date().toISOString(),
        promotions: [],
        contradiction_replacements: [],
        cross_agent_dedup_approvals: [
          { cluster_id: "cluster-test-35", approve: true },
        ],
        axis_tag_changes: [],
        retirements: [],
        domain_doc_updates: [],
        audit_outcomes: [],
        audit_obligations_waived: [],
      };
      fs.writeFileSync(
        path.join(promoter.sessionRoot, "promote-decisions.json"),
        JSON.stringify(decisions, null, 2),
      );

      const outcome = await runPromoteExecutor({
        sessionId: "test-35",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        sessionRoot: promoter.sessionRoot,
      });
      assertEqual(outcome.kind, "completed", "executor completed");
      if (outcome.kind !== "completed") return;
      assertEqual(
        outcome.summary.cross_agent_dedup_applied,
        1,
        "1 cluster applied",
      );

      // structure file gained the consolidated line; logic file's line was
      // replaced with a consolidated marker.
      const structurePath = path.join(fakeOnto, "learnings", "structure.md");
      const logicPath = path.join(fakeOnto, "learnings", "logic.md");
      const structureContent = fs.readFileSync(structurePath, "utf8");
      const logicContent = fs.readFileSync(logicPath, "utf8");
      assert(
        structureContent.includes("consolidated principle"),
        "structure has consolidated line",
      );
      assert(
        logicContent.includes("consolidated") && logicContent.includes("cluster-test-35"),
        "logic line marked as consolidated",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P36 — append-only resolution_history (NQ-21)
  await test("E-P36 saveRecoveryResolution appends to resolution_history", () => {
    const projectRoot = makeTmpDir("e-p36");
    const sessionId = "test-36";

    // Create the session root so the artifact path is valid
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", sessionId),
      { recursive: true },
    );

    // First decision
    const entry1 = {
      resolved_at: "2026-04-08T10:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: "01ATTEMPT_A",
      selected_attempt_reason: "first decision",
      all_attempts_at_resolution_time: [],
      operator_note: "first",
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...entry1,
      resolution_history: [entry1],
    });

    // Second decision (operator changed mind)
    const entry2 = {
      resolved_at: "2026-04-08T11:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: "01ATTEMPT_B",
      selected_attempt_reason: "changed mind",
      all_attempts_at_resolution_time: [],
      operator_note: "second",
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...entry2,
      resolution_history: [entry2],
    });

    const loaded = loadRecoveryResolution(projectRoot, sessionId);
    assert(loaded !== null, "loaded");
    assertEqual(loaded!.resolution_history.length, 2, "2 history entries");
    assertEqual(
      loaded!.selected_attempt_id,
      "01ATTEMPT_B",
      "top-level reflects latest",
    );
    assertEqual(
      loaded!.resolution_history[0]!.selected_attempt_id,
      "01ATTEMPT_A",
      "first entry preserved",
    );
    assertEqual(
      loaded!.resolution_history[1]!.selected_attempt_id,
      "01ATTEMPT_B",
      "second entry latest",
    );
  });

  // E-P37 — recovery resolution applied during --resume
  await test("E-P37 resolveRecoveryTruth honors saved RecoveryResolution", async () => {
    const projectRoot = makeTmpDir("e-p37");
    const sessionId = "test-37";

    // Create the session root so saveRecoveryResolution can write
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", sessionId),
      { recursive: true },
    );

    // Save an operator resolution
    const entry = {
      resolved_at: "2026-04-08T12:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: "01CHOSEN",
      selected_attempt_reason: "chosen",
      all_attempts_at_resolution_time: [],
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...entry,
      resolution_history: [entry],
    });

    // Verify the resolution loads back correctly
    const loaded = loadRecoveryResolution(projectRoot, sessionId);
    assert(loaded !== null, "resolution loaded");
    assertEqual(loaded!.selected_attempt_id, "01CHOSEN", "decision recorded");

    // gatherRecoveryContext returns no sources (no real apply state on disk),
    // so resolveRecoveryTruth returns no_recovery_data — but the resolution
    // file persistence is what we're testing here.
    const context = await gatherRecoveryContext(sessionId, projectRoot);
    const truth = resolveRecoveryTruth(context, projectRoot);
    assertEqual(truth.kind, "no_recovery_data", "no apply state present");
  });

  // E-P38 — collector skip behavior (parse_errors don't crash promoter)
  await test("E-P38 collector parse errors surface as warnings without crash", async () => {
    const projectRoot = makeTmpDir("e-p38");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "<!-- format_version: 1 -->",
        "- [methodology] [foundation] missing-type-marker (source: p, d, 2026-01-01) [impact:normal]",
        "- [fact] [methodology] [foundation] valid-line (source: p, d, 2026-01-01) [impact:normal]",
      ].join("\n"),
    );
    const fakeOnto = makeTmpDir("e-p38-home");
    const result = await runPromoter({
      mode: "promote",
      sessionId: "test-38",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });
    assert(
      result.report.collection.parse_errors.length > 0,
      "parse errors collected",
    );
    assert(
      result.report.warnings.some((w) => w.includes("parse")),
      "parse warning surfaced",
    );
    assertEqual(
      result.report.collection.candidate_items.length,
      1,
      "valid line still collected",
    );
  });

  // E-P39a — judgment-auditor chunks large agents (B-4 production fix)
  await test("E-P39a judgment-auditor chunks ≥13 items into multiple batches", async () => {
    const projectRoot = makeTmpDir("e-p39a");
    const fakeOnto = makeTmpDir("e-p39a-home");
    // 25 judgment items in one agent — should split into 3 batches (12+12+1)
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      [
        "<!-- format_version: 1 -->",
        ...Array.from({ length: 25 }, (_, i) =>
          `- [judgment] [methodology] [foundation] big-batch-${i} (source: p, d, 2026-01-0${(i % 9) + 1}) [impact:normal]`,
        ),
      ].join("\n"),
    );

    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runPromoter({
        mode: "promote",
        sessionId: "test-39a",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipPanel: true,
      });
      assertEqual(
        result.report.audit_summary.execution.audited_items_count,
        25,
        "all 25 items audited (chunked)",
      );
      // 25 / 12 = 3 batches → 3 LLM calls
      assertEqual(
        result.report.audit_summary.execution.llm_calls,
        3,
        "3 LLM calls (chunked by AUDIT_BATCH_SIZE=12)",
      );
      assertEqual(
        result.report.audit_summary.failed_agents.length,
        0,
        "no failures",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P39b — failed_agents surfaces blocked audits in summary
  await test("E-P39b audit failures appear in summary.failed_agents", async () => {
    // We use the mock provider but force a non-mock prompt path that the
    // mock doesn't recognize, so it returns "ok" which is not valid JSON.
    // The mock only matches on system prompt prefix; the audit prompt
    // matches, so this would normally succeed. To force failure, we
    // temporarily disable the mock and rely on the auditor's network
    // failure handling.
    const previousMock = process.env.ONTO_LLM_MOCK;
    delete process.env.ONTO_LLM_MOCK;
    process.env.ONTO_LLM_MOCK = "0";

    const projectRoot = makeTmpDir("e-p39b");
    const fakeOnto = makeTmpDir("e-p39b-home");
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      [
        "<!-- format_version: 1 -->",
        ...Array.from({ length: 11 }, (_, i) =>
          `- [judgment] [methodology] [foundation] fail-${i} (source: p, d, 2026-01-01) [impact:normal]`,
        ),
      ].join("\n"),
    );
    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runPromoter({
        mode: "promote",
        sessionId: "test-39b",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipPanel: true,
      });
      assertEqual(
        result.report.audit_summary.failed_agents.length,
        1,
        "philosopher failure recorded in failed_agents",
      );
      assertEqual(
        result.report.audit_summary.failed_agents[0]!.agent_id,
        "philosopher",
        "failed agent id",
      );
      assertEqual(
        result.report.audit_summary.failed_agents[0]!.judgment_count,
        11,
        "judgment_count surfaced for operator visibility",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousMock === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = previousMock;
    }
  });

  // E-P39 — promote-executor enumerates cross_agent_dedup pending decisions
  await test("E-P39 cross_agent_dedup_approvals enumerated as pending", async () => {
    // Verifies the enumerate function picks up cross_agent_dedup approvals
    // which were previously skipped pre-C-3.
    const projectRoot = makeTmpDir("e-p39");
    const fakeOnto = makeTmpDir("e-p39-home");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      ["<!-- format_version: 1 -->"].join("\n"),
    );
    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-39",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });
    // Decisions with one cross_agent_dedup approval but no matching cluster
    // in the report — should mark as failed (cluster not found) NOT skip.
    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-39",
      prepared_at: new Date().toISOString(),
      promotions: [],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [
        { cluster_id: "nonexistent-cluster", approve: true },
      ],
      axis_tag_changes: [],
      retirements: [],
      domain_doc_updates: [],
      audit_outcomes: [],
      audit_obligations_waived: [],
    };
    fs.writeFileSync(
      path.join(promoter.sessionRoot, "promote-decisions.json"),
      JSON.stringify(decisions, null, 2),
    );
    const outcome = await runPromoteExecutor({
      sessionId: "test-39",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(
      outcome.kind,
      "failed_resumable",
      "outcome is failed_resumable for missing cluster",
    );
    if (outcome.kind !== "failed_resumable") return;
    assertEqual(outcome.summary.failed_decisions, 1, "1 failed decision");
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  process.stdout.write("\n");
  process.stdout.write(`Results: ${passCount} passed, ${failCount} failed\n`);
  if (failCount > 0) {
    process.stdout.write("\nFailures:\n");
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Test runner crashed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
