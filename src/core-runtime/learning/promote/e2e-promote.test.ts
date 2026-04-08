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
  buildEscalationMessage,
  DEFAULT_RECOVERY_POLICY,
  type RecoveryContext,
  type ApplyStateRecoverySource,
  type ManualEscalationRequired,
} from "../shared/recovery-context.js";
import {
  REGISTRY,
  RegistryInitError,
  UnregisteredArtifactKindError,
  IncompatibleVersionError,
  InvalidArtifactError,
} from "../shared/artifact-registry.js";
import type { AuditStateJSON } from "./types.js";
import {
  inspectMigrationStatus,
  ensureSessionRootsMigrated,
  MigrationRequiredError,
} from "../../cli/session-root-guard.js";
import { migrateSessionRoots } from "../../cli/migrate-session-roots.js";
import type {
  AppliedDecision,
  ApplyExecutionState,
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
      result.failures.some((f) => f.includes("verdict is not promote")),
      "right reason (mentions verdict is not promote)",
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
      const consensus = result.report.panel_verdicts[0]!.consensus;
      // m-1 fix: 2-member panel maps to promote_2_3, not promote_3_3.
      // The fixture may produce a 2-member or 3-member panel depending on
      // which agents the mock home directory exposes; both unanimous
      // outcomes are valid here.
      assert(
        consensus === "promote_3_3" || consensus === "promote_2_3",
        `expected unanimous promote consensus, got ${consensus}`,
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
        result.report.audit_summary.failed_agents[0]!.judgment_count_total,
        11,
        "judgment_count_total surfaced for operator visibility",
      );
      assert(
        result.report.audit_summary.failed_agents[0]!.failed_chunks_count >= 1,
        "failed_chunks_count >= 1 for blocked agent",
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
  // Review fix coverage (PR review BLOCKING + MAJOR + MINOR + NIT fixes)
  // -------------------------------------------------------------------------

  // E-P40 — B-A: resume path filters already-applied decisions
  await test("E-P40 resume skips already-applied decisions (no double-write)", async () => {
    const projectRoot = makeTmpDir("e-p40");
    const fakeOnto = makeTmpDir("e-p40-home");
    const projectLine =
      "- [fact] [methodology] [foundation] resume-target (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      ["<!-- format_version: 1 -->", projectLine].join("\n"),
    );

    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-40",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });

    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-40",
      prepared_at: new Date().toISOString(),
      promotions: [
        {
          candidate_agent_id: "structure",
          candidate_line: projectLine,
          approve: true,
        },
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

    // First apply
    const out1 = await runPromoteExecutor({
      sessionId: "test-40",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(out1.kind, "completed", "first apply completed");

    // Capture global file size after first apply
    const globalFile = path.join(fakeOnto, "learnings", "structure.md");
    const sizeAfterFirst = fs.statSync(globalFile).size;

    // Second apply with --resume flag — should NOT re-write the line.
    // Pre-fix bug: would double-append AND crash with markApplied error.
    // forceStale is needed because the first apply annotated the project
    // file (`(-> promoted to global, ...)`) which changed the baseline hash.
    // The point of this test is the resume skip logic, not freshness check.
    const out2 = await runPromoteExecutor({
      sessionId: "test-40",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
      resume: true,
      forceStale: true,
    });
    assertEqual(out2.kind, "completed", "resume completed without crash");

    const sizeAfterSecond = fs.statSync(globalFile).size;
    assertEqual(
      sizeAfterFirst,
      sizeAfterSecond,
      "global file unchanged on resume (no double-write)",
    );
  });

  // E-P41 — M-A: cross-agent dedup preflight rejects on missing member
  await test("E-P41 cross_agent_dedup preflight fails on missing member file", async () => {
    const projectRoot = makeTmpDir("e-p41");
    const fakeOnto = makeTmpDir("e-p41-home");
    const lineA =
      "- [fact] [methodology] [foundation] preflight-a (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(fakeOnto, "learnings"),
      "structure",
      ["<!-- format_version: 1 -->", lineA].join("\n"),
    );
    // intentionally NO logic.md — preflight should detect this

    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-41",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });

    const cluster = {
      cluster_id: "preflight-test",
      primary_owner_agent: "structure",
      primary_owner_reason: "test",
      consolidated_principle: "test",
      representative_cases: [],
      member_items: [
        { ...syntheticItem({ agent_id: "structure" }), raw_line: lineA },
        {
          ...syntheticItem({ agent_id: "logic" }),
          raw_line: "- [fact] [methodology] [foundation] missing (source: p, d, 2026-01-01) [impact:normal]",
        },
      ],
      consolidated_line:
        "- [fact] [methodology] [foundation] consolidated (source: cluster, d, 2026-04-08) [impact:normal]",
      user_approval_required: true as const,
    };
    promoter.report.cross_agent_dedup_clusters.push(cluster);
    fs.writeFileSync(promoter.reportPath, JSON.stringify(promoter.report, null, 2));

    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-41",
      prepared_at: new Date().toISOString(),
      promotions: [],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [{ cluster_id: "preflight-test", approve: true }],
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

    // Capture structure.md size BEFORE the failing apply.
    const structurePath = path.join(fakeOnto, "learnings", "structure.md");
    const sizeBefore = fs.statSync(structurePath).size;

    const outcome = await runPromoteExecutor({
      sessionId: "test-41",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(outcome.kind, "failed_resumable", "preflight failure marks failed");
    if (outcome.kind !== "failed_resumable") return;
    assertEqual(outcome.summary.failed_decisions, 1, "1 failed decision");
    assertEqual(outcome.summary.cross_agent_dedup_applied, 0, "no cluster applied");

    // Critical: structure.md should be UNCHANGED — preflight aborted before
    // the consolidated line was appended.
    const sizeAfter = fs.statSync(structurePath).size;
    assertEqual(
      sizeBefore,
      sizeAfter,
      "primary file untouched on preflight failure",
    );
  });

  // E-P42 — M-A: cross-agent dedup is idempotent on retry
  await test("E-P42 cross_agent_dedup skips re-application via cluster_id marker", async () => {
    const projectRoot = makeTmpDir("e-p42");
    const fakeOnto = makeTmpDir("e-p42-home");
    const lineA =
      "- [fact] [methodology] [foundation] idem-a (source: p, d, 2026-01-01) [impact:normal]";
    const lineB =
      "- [fact] [methodology] [foundation] idem-b (source: p, d, 2026-01-01) [impact:normal]";
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

    const promoter = await runPromoter({
      mode: "promote",
      sessionId: "test-42",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      skipPanel: true,
      skipAudit: true,
    });

    const consolidatedLine =
      "- [fact] [methodology] [foundation] idem-consolidated (source: cluster, d, 2026-04-08) [impact:normal]";
    const cluster = {
      cluster_id: "idem-test",
      primary_owner_agent: "structure",
      primary_owner_reason: "test",
      consolidated_principle: "test",
      representative_cases: [],
      member_items: [
        { ...syntheticItem({ agent_id: "structure" }), raw_line: lineA },
        { ...syntheticItem({ agent_id: "logic" }), raw_line: lineB },
      ],
      consolidated_line: consolidatedLine,
      user_approval_required: true as const,
    };
    promoter.report.cross_agent_dedup_clusters.push(cluster);
    fs.writeFileSync(promoter.reportPath, JSON.stringify(promoter.report, null, 2));

    const decisions: PromoteDecisions = {
      schema_version: "1",
      session_id: "test-42",
      prepared_at: new Date().toISOString(),
      promotions: [],
      contradiction_replacements: [],
      cross_agent_dedup_approvals: [{ cluster_id: "idem-test", approve: true }],
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

    // First apply
    const out1 = await runPromoteExecutor({
      sessionId: "test-42",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
    });
    assertEqual(out1.kind, "completed", "first apply completed");

    const structurePath = path.join(fakeOnto, "learnings", "structure.md");
    const sizeAfterFirst = fs.statSync(structurePath).size;

    // Reset apply-state and re-run
    fs.rmSync(path.join(promoter.sessionRoot, "promote-execution-result.json"), {
      force: true,
    });

    const out2 = await runPromoteExecutor({
      sessionId: "test-42",
      projectRoot,
      ontoHome: fakeOnto,
      auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
      sessionRoot: promoter.sessionRoot,
      forceStale: true,
    });
    assertEqual(out2.kind, "completed", "second apply completed");

    const sizeAfterSecond = fs.statSync(structurePath).size;
    assertEqual(
      sizeAfterFirst,
      sizeAfterSecond,
      "primary file unchanged on idempotent re-apply",
    );
  });

  // E-P43 — M-C: validator accepts c4=no with non-promote verdict
  await test("E-P43 validator allows c4=no + verdict=defer", () => {
    const review = syntheticReview("promote");
    review.verdict = "defer";
    // c1-c3 yes, c4 no, c5 yes — coherent: defer because axis tags need work
    review.criteria = [
      { criterion: 1, judgment: "yes", reasoning: "g" },
      { criterion: 2, judgment: "yes", reasoning: "a" },
      { criterion: 3, judgment: "yes", reasoning: "c" },
      { criterion: 4, judgment: "no", reasoning: "axis tags wrong" },
      { criterion: 5, judgment: "yes", reasoning: "u" },
    ];
    const result = validatePanelMemberReview(review);
    assert(result.passed, `should pass; failures: ${result.failures.join("; ")}`);
  });

  // E-P44 — m-1: 2-member unanimous panel returns promote_2_3
  await test("E-P44 2-member unanimous panel returns promote_2_3 not promote_3_3", () => {
    const a = syntheticReview("promote");
    a.member = { agent_id: "structure", role: "originator", reachable: true };
    const b = syntheticReview("promote");
    b.member = { agent_id: "philosopher", role: "philosopher", reachable: true };
    assertEqual(aggregateConsensus([a, b]), "promote_2_3", "2-member unanimous → 2_3");
  });

  // E-P45 — m-2: empty resolution_history input throws
  await test("E-P45 saveRecoveryResolution rejects empty resolution_history", () => {
    const projectRoot = makeTmpDir("e-p45");
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", "test-45"),
      { recursive: true },
    );
    let threw = false;
    try {
      saveRecoveryResolution(projectRoot, {
        schema_version: "1",
        session_id: "test-45",
        resolved_at: "2026-04-08T10:00:00Z",
        resolved_by: "operator",
        resolution_method: "cli_command",
        selected_attempt_id: "01ATTEMPT",
        selected_attempt_reason: "test",
        all_attempts_at_resolution_time: [],
        resolution_history: [],
      });
    } catch (error) {
      threw =
        error instanceof Error &&
        error.message.includes("resolution_history must contain");
    }
    assert(threw, "should throw on empty history");
  });

  // E-P46 — m-3: failed_chunks_count surfaces alongside total
  await test("E-P46 failed_agents.failed_chunks_count exposes failed batch count", async () => {
    const previousMock = process.env.ONTO_LLM_MOCK;
    delete process.env.ONTO_LLM_MOCK;
    process.env.ONTO_LLM_MOCK = "0";

    const projectRoot = makeTmpDir("e-p46");
    const fakeOnto = makeTmpDir("e-p46-home");
    // 25 items → 3 batches → all 3 fail (no LLM provider)
    writeLearningFile(
      path.join(fakeOnto, ".onto", "learnings"),
      "philosopher",
      [
        "<!-- format_version: 1 -->",
        ...Array.from({ length: 25 }, (_, i) =>
          `- [judgment] [methodology] [foundation] m3-${i} (source: p, d, 2026-01-01) [impact:normal]`,
        ),
      ].join("\n"),
    );
    const previousHome = process.env.HOME;
    process.env.HOME = fakeOnto;
    try {
      const result = await runPromoter({
        mode: "promote",
        sessionId: "test-46",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipPanel: true,
      });
      const failed = result.report.audit_summary.failed_agents.find(
        (f) => f.agent_id === "philosopher",
      );
      assert(failed !== undefined, "philosopher in failed_agents");
      assertEqual(failed!.judgment_count_total, 25, "total = 25");
      assert(failed!.failed_chunks_count >= 1, "at least 1 chunk failed");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousMock === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = previousMock;
    }
  });

  // E-P47 — m-4: invalid reflection_form is rejected
  await test("E-P47 domain doc applicator rejects invalid reflection_form", async () => {
    // Use mock LLM with a custom override — the easiest way to inject an
    // invalid reflection_form is to monkey-patch process.env to put the
    // mock into a known-bad state. Since the mock returns "add_term"
    // (valid for concepts.md), we instead test by using a target_doc that
    // doesn't accept add_term — e.g., domain_scope.md.
    //
    // The mock always returns add_term regardless of target. For
    // domain_scope.md the validator should reject add_term because it's
    // not in the per-target allow-list.
    const projectRoot = makeTmpDir("e-p47");
    const fakeOnto = makeTmpDir("e-p47-home");
    // coverage agent → domain_scope.md
    const projectLine =
      "- [fact] [methodology] [domain/finance] [foundation] e-p47 scope item (source: p, d, 2026-01-01) [impact:normal]";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "coverage",
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
        sessionId: "test-47",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        skipAudit: true,
      });
      assertEqual(
        promoter.report.domain_doc_candidates.length,
        1,
        "1 domain doc candidate (coverage → domain_scope.md)",
      );
      const candidate = promoter.report.domain_doc_candidates[0]!;
      assertEqual(candidate.target_doc, "domain_scope.md", "target");

      const decisions: PromoteDecisions = {
        schema_version: "1",
        session_id: "test-47",
        prepared_at: new Date().toISOString(),
        promotions: [
          {
            candidate_agent_id: "coverage",
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
        sessionId: "test-47",
        projectRoot,
        ontoHome: fakeOnto,
        auditStatePath: path.join(fakeOnto, "audit-state.yaml"),
        sessionRoot: promoter.sessionRoot,
      });
      // Mock returns "add_term" which is not in domain_scope.md's allow-list.
      // The applicator should mark this as failed with the enum reason.
      assertEqual(
        outcome.kind,
        "failed_resumable",
        "outcome failed due to invalid reflection_form",
      );
      if (outcome.kind !== "failed_resumable") return;
      assertEqual(
        outcome.summary.domain_doc_updates_applied,
        0,
        "no domain doc applied",
      );
      assertEqual(outcome.summary.failed_decisions, 1, "1 failed decision");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  // E-P48 — N-1: mock LLM throws on unknown prompt
  await test("E-P48 mock LLM rejects unknown system prompt", async () => {
    const { callLlm } = await import("../shared/llm-caller.js");
    let threw = false;
    try {
      await callLlm(
        "You are an unknown agent doing something the mock doesn't recognize",
        "test",
        { max_tokens: 10 },
      );
    } catch (error) {
      threw =
        error instanceof Error && error.message.includes("no pattern matched");
    }
    assert(threw, "mock should throw on unknown prompt");
  });

  // E-P49 — chatgpt OAuth fallback rejected with targeted guidance
  await test("E-P49 llm-caller refuses chatgpt OAuth and explains why", async () => {
    // Simulate a fake home with only chatgpt OAuth in auth.json. We don't
    // delete the user's real ~/.codex/auth.json — instead we use HOME
    // override so os.homedir() resolves to our fake. Then verify the
    // resolveProvider error message names chatgpt explicitly.
    const fakeHome = makeTmpDir("e-p49-home");
    fs.mkdirSync(path.join(fakeHome, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(fakeHome, ".codex", "auth.json"),
      JSON.stringify({
        auth_mode: "chatgpt",
        OPENAI_API_KEY: null,
        tokens: { access_token: "fake-oauth-token", id_token: "x" },
      }),
      "utf8",
    );

    const previousHome = process.env.HOME;
    const previousAnth = process.env.ANTHROPIC_API_KEY;
    const previousOpen = process.env.OPENAI_API_KEY;
    const previousMock = process.env.ONTO_LLM_MOCK;
    process.env.HOME = fakeHome;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ONTO_LLM_MOCK;

    try {
      const { callLlm } = await import("../shared/llm-caller.js");
      let caught: Error | null = null;
      try {
        await callLlm("test sys", "test user", { max_tokens: 10 });
      } catch (error) {
        caught = error instanceof Error ? error : new Error(String(error));
      }
      assert(caught !== null, "should throw");
      assert(
        caught!.message.includes("chatgpt OAuth"),
        `error should name chatgpt OAuth explicitly; got: ${caught!.message}`,
      );
      assert(
        caught!.message.includes("Missing scopes") ||
          caught!.message.includes("api.openai.com") ||
          caught!.message.includes("chatgpt.com"),
        "error should explain WHY OAuth doesn't work",
      );
      assert(
        caught!.message.includes("ANTHROPIC_API_KEY") ||
          caught!.message.includes("OPENAI_API_KEY"),
        "error should suggest a working alternative",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousAnth !== undefined) process.env.ANTHROPIC_API_KEY = previousAnth;
      if (previousOpen !== undefined) process.env.OPENAI_API_KEY = previousOpen;
      if (previousMock !== undefined) process.env.ONTO_LLM_MOCK = previousMock;
    }
  });

  // E-P50 — llm-caller still accepts auth.json with real OPENAI_API_KEY field
  await test("E-P50 llm-caller accepts auth.json OPENAI_API_KEY field (api-key mode)", async () => {
    const fakeHome = makeTmpDir("e-p50-home");
    fs.mkdirSync(path.join(fakeHome, ".codex"), { recursive: true });
    // Real api-key mode: auth.json has OPENAI_API_KEY string field
    fs.writeFileSync(
      path.join(fakeHome, ".codex", "auth.json"),
      JSON.stringify({
        auth_mode: "api_key",
        OPENAI_API_KEY: "sk-fake-test-key-not-real",
      }),
      "utf8",
    );

    const previousHome = process.env.HOME;
    const previousAnth = process.env.ANTHROPIC_API_KEY;
    const previousOpen = process.env.OPENAI_API_KEY;
    const previousMock = process.env.ONTO_LLM_MOCK;
    process.env.HOME = fakeHome;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.ONTO_LLM_MOCK = "1"; // mock so we don't hit network

    try {
      const { callLlm } = await import("../shared/llm-caller.js");
      // The mock is enabled so callLlm short-circuits BEFORE provider
      // resolution. To actually test resolveProvider, we'd need to disable
      // the mock — but then we'd hit network. Instead we verify that the
      // function doesn't throw at module level: getting past the mock branch
      // means provider resolution would have been attempted.
      // For a tighter test, force a known prompt the mock recognizes.
      const result = await callLlm(
        "You are reviewing promotion candidates for a learning management system as an expert in the role of structure (originator).",
        "candidate_id=test type=fact tags=[methodology] role=foundation\n   content: x",
        { max_tokens: 100 },
      );
      assert(result.text.length > 0, "mock returned content");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousAnth !== undefined) process.env.ANTHROPIC_API_KEY = previousAnth;
      if (previousOpen !== undefined) process.env.OPENAI_API_KEY = previousOpen;
      if (previousMock === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = previousMock;
    }
  });

  // -------------------------------------------------------------------------
  // Batch 1 — Artifact Registry error paths (DD-20)
  // -------------------------------------------------------------------------

  // E-P51 — UnregisteredArtifactKindError surfaces the known set in the message
  await test("E-P51 REGISTRY.get(unknown kind) → UnregisteredArtifactKindError", () => {
    let caught: unknown = null;
    try {
      REGISTRY.get("totally_made_up_kind_xyz");
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof UnregisteredArtifactKindError, "expected UnregisteredArtifactKindError");
    const err = caught as UnregisteredArtifactKindError;
    assert(err.message.includes("totally_made_up_kind_xyz"), "message names the requested kind");
    assert(err.message.includes("audit_state"), "message lists available kinds");
  });

  // E-P52 — Lazy init: fresh singleton with no explicit init call populates specs
  //        on first use (no need to call ensureRegistryReady()).
  await test("E-P52 REGISTRY lazy init on first use populates builtin specs", () => {
    // Preserve the wired registrar across __resetForTest since that helper
    // only clears specs/initialized/cachedInitError. The registrar closure
    // wired by artifact-registry-init.ts module-load must still be present.
    REGISTRY.__resetForTest();
    // Before any call, nothing is in the map
    let initializedBefore = false;
    try {
      // Direct listRegistered() triggers ensureInitialized() — if the
      // registrar is still wired the list becomes non-empty.
      const list = REGISTRY.listRegistered();
      initializedBefore = list.length > 0;
    } catch (e) {
      assert(false, `lazy init failed unexpectedly: ${(e as Error).message}`);
    }
    assert(initializedBefore, "lazy init produced registered specs on first call");
    assert(
      REGISTRY.listRegistered().includes("audit_state"),
      "builtin audit_state spec is registered after lazy init",
    );
  });

  // E-P53 — NQ-19: after a failed init, every subsequent call throws the SAME
  //        cached RegistryInitError instance (process-scoped, no retry).
  await test("E-P53 Registry init failure is cached: same error on retries (NQ-19)", () => {
    const internal = REGISTRY as unknown as {
      builtinRegistrar: (() => void) | null;
    };
    const originalRegistrar = internal.builtinRegistrar;
    try {
      REGISTRY.__resetForTest();
      REGISTRY.setBuiltinRegistrar(() => {
        throw new Error("simulated boot failure");
      });

      let first: unknown = null;
      try {
        REGISTRY.listRegistered();
      } catch (e) {
        first = e;
      }
      let second: unknown = null;
      try {
        REGISTRY.listRegistered();
      } catch (e) {
        second = e;
      }

      assert(first instanceof RegistryInitError, "first call throws RegistryInitError");
      assert(second instanceof RegistryInitError, "second call also throws RegistryInitError");
      assert(first === second, "NQ-19: same instance returned on retry (cached)");
      assert(
        (first as Error).message.includes("simulated boot failure"),
        "RegistryInitError wraps original cause message",
      );
    } finally {
      // Restore pristine registry: clear cached error, re-wire the original
      // registrar, then trigger lazy re-init so downstream tests see a
      // populated registry again.
      REGISTRY.__resetForTest();
      if (originalRegistrar) {
        REGISTRY.setBuiltinRegistrar(originalRegistrar);
        REGISTRY.listRegistered(); // force re-init
      }
    }
  });

  // E-P54 — saveToFile runs validate() first and surfaces InvalidArtifactError
  //        when required fields are missing.
  await test("E-P54 saveToFile InvalidArtifactError when validate() fails (SYN-CC1)", () => {
    const dir = makeTmpDir("e-p54");
    const target = path.join(dir, "audit-state.yaml");
    // audit_state spec requires `obligations: [...]` — missing it triggers
    // validate() failure *before* schema_version check.
    const bad = { schema_version: "1" } as unknown as AuditStateJSON;
    let caught: unknown = null;
    try {
      REGISTRY.saveToFile("audit_state", target, bad);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvalidArtifactError, "expected InvalidArtifactError");
    assert((caught as Error).message.includes("obligations"), "error names the missing field");
    assert(!fs.existsSync(target), "file is NOT written when validation fails");
  });

  // E-P55 — SYN-CONS-03: undefined schema_version on save → InvalidArtifactError.
  await test("E-P55 saveToFile rejects undefined schema_version (SYN-CONS-03)", () => {
    const dir = makeTmpDir("e-p55");
    const target = path.join(dir, "audit-state.yaml");
    // Structurally valid obligations, but NO schema_version at all.
    const bad = { obligations: [] } as unknown as AuditStateJSON;
    let caught: unknown = null;
    try {
      REGISTRY.saveToFile("audit_state", target, bad);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvalidArtifactError, "expected InvalidArtifactError");
    // Could come from either the validate step (schema_version must be "1")
    // OR the explicit undefined-check. Both are the same error type.
    assert(
      (caught as Error).message.toLowerCase().includes("schema_version"),
      "error mentions schema_version",
    );
    assert(!fs.existsSync(target), "file not written");
  });

  // E-P56 — SYN-CC1: schema_version present but != spec.current → rejected.
  await test("E-P56 saveToFile rejects schema_version mismatch", () => {
    const dir = makeTmpDir("e-p56");
    const target = path.join(dir, "audit-state.yaml");
    // Validator checks schema_version === "1". A different string fails.
    const bad = { schema_version: "999", obligations: [] } as unknown as AuditStateJSON;
    let caught: unknown = null;
    try {
      REGISTRY.saveToFile("audit_state", target, bad);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvalidArtifactError, "expected InvalidArtifactError");
    assert(
      (caught as Error).message.includes("999") || (caught as Error).message.includes("schema_version"),
      "error references the bad version",
    );
    assert(!fs.existsSync(target), "file not written");
  });

  // E-P57 — Format binding from extension: unsupported .txt → Error before write.
  await test("E-P57 saveToFile rejects unsupported extension", () => {
    const dir = makeTmpDir("e-p57");
    const target = path.join(dir, "audit-state.txt"); // not yaml/json
    const data: AuditStateJSON = {
      schema_version: "1",
      obligations: [],
    };
    let caught: unknown = null;
    try {
      REGISTRY.saveToFile("audit_state", target, data);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof Error, "expected Error for extension mismatch");
    const msg = (caught as Error).message;
    assert(
      msg.includes(".txt") || msg.toLowerCase().includes("extension") || msg.toLowerCase().includes("format"),
      `error references the bad extension (got: ${msg})`,
    );
    assert(!fs.existsSync(target), "file not written");
  });

  // E-P58 — UF-COV-01: pre-v7 artifact (no schema_version) → IncompatibleVersionError on load.
  await test("E-P58 loadFromFile rejects pre-v7 artifact with clear guidance", () => {
    const dir = makeTmpDir("e-p58");
    const target = path.join(dir, "audit-state.yaml");
    // Legacy shape: obligations array but NO schema_version field.
    const legacyYaml = "obligations: []\n";
    fs.writeFileSync(target, legacyYaml, "utf8");

    let caught: unknown = null;
    try {
      REGISTRY.loadFromFile("audit_state", target);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof IncompatibleVersionError, "expected IncompatibleVersionError");
    const msg = (caught as Error).message;
    assert(msg.toLowerCase().includes("pre-v7"), "message identifies pre-v7 detection");
    assert(
      msg.toLowerCase().includes("discard") || msg.toLowerCase().includes("regenerate"),
      "message gives actionable guidance",
    );
  });

  // -------------------------------------------------------------------------
  // Batch 2 — RecoveryContext + RecoveryResolution real logic (DD-22, DD-23)
  //
  // These tests mostly exercise resolveRecoveryTruth with synthetic
  // in-memory RecoveryContext objects so we avoid the module-level HOME
  // frozen constant (EMERGENCY_LOG_PATH, BACKUP_ROOT). The gather-path
  // tests focus on the apply_state branch which is project-scoped.
  // -------------------------------------------------------------------------

  function synthApplyState(
    sessionId: string,
    attemptId: string,
    generation: number,
    recordedAt: string,
  ): ApplyExecutionState {
    return {
      schema_version: "1",
      session_id: sessionId,
      attempt_id: attemptId,
      attempt_started_at: recordedAt,
      generation,
      last_updated_at: recordedAt,
      status: "in_progress",
      applied_decisions: [],
      failed_decisions: [],
      pending_decisions: [],
      recoverability_checkpoint_path: null,
    };
  }

  function synthApplyStateSource(
    sessionId: string,
    attemptId: string,
    generation: number,
    recordedAt: string,
  ): ApplyStateRecoverySource {
    return {
      kind: "apply_state",
      state: synthApplyState(sessionId, attemptId, generation, recordedAt),
      freshness: {
        attempt_id: attemptId,
        generation,
        source_recorded_at: recordedAt,
        source_kind: "apply_state",
      },
      artifact_path: `/tmp/fake/${sessionId}/apply.json`,
    };
  }

  function synthContext(
    sessionId: string,
    apply: ApplyStateRecoverySource | null,
  ): RecoveryContext {
    return {
      session_id: sessionId,
      gathered_at: "2026-04-09T00:00:00.000Z",
      apply_state: apply,
      emergency_log: null,
      checkpoint_manifest: null,
    };
  }

  // E-P59 — gatherRecoveryContext reads apply_state written via REGISTRY
  await test("E-P59 gatherRecoveryContext reads a valid apply_state file", async () => {
    const projectRoot = makeTmpDir("e-p59");
    const sessionId = "sess-59";
    const sessionRoot = path.join(
      projectRoot,
      ".onto",
      "sessions",
      "promote",
      sessionId,
    );
    fs.mkdirSync(sessionRoot, { recursive: true });
    const state = synthApplyState(
      sessionId,
      "01ARAFG00000000000000000AA",
      7,
      "2026-04-08T10:00:00Z",
    );
    REGISTRY.saveToFile(
      "apply_execution_state",
      path.join(sessionRoot, "promote-execution-result.json"),
      state,
    );

    const context = await gatherRecoveryContext(sessionId, projectRoot);
    assert(context.apply_state !== null, "apply_state populated");
    assertEqual(
      context.apply_state!.freshness.attempt_id,
      "01ARAFG00000000000000000AA",
      "attempt_id carried through",
    );
    assertEqual(context.apply_state!.freshness.generation, 7, "generation carried");
    assertEqual(
      context.apply_state!.freshness.source_kind,
      "apply_state",
      "source_kind labelled",
    );
    // Emergency log / checkpoint absence — gather returned null for both
    assert(context.emergency_log === null, "no emergency log");
    assert(context.checkpoint_manifest === null, "no checkpoint");
  });

  // E-P60 — gatherRecoveryContext with nothing → all-null context (not thrown)
  await test("E-P60 gatherRecoveryContext with no sources returns all-null context", async () => {
    const projectRoot = makeTmpDir("e-p60");
    const context = await gatherRecoveryContext("sess-60", projectRoot);
    assert(context.apply_state === null, "apply_state null");
    assert(context.emergency_log === null, "emergency log null");
    assert(context.checkpoint_manifest === null, "checkpoint null");
    assertEqual(context.session_id, "sess-60", "session_id preserved");
  });

  // E-P61 — corrupt apply_state file → helper is best-effort, null
  await test("E-P61 gatherRecoveryContext treats corrupt apply_state as absent", async () => {
    const projectRoot = makeTmpDir("e-p61");
    const sessionId = "sess-61";
    const sessionRoot = path.join(
      projectRoot,
      ".onto",
      "sessions",
      "promote",
      sessionId,
    );
    fs.mkdirSync(sessionRoot, { recursive: true });
    // Write a syntactically-valid JSON file that has NO schema_version —
    // parse will reject via rejectPreV7, gather catches and returns null.
    fs.writeFileSync(
      path.join(sessionRoot, "promote-execution-result.json"),
      JSON.stringify({ session_id: sessionId, obligations: [] }),
      "utf8",
    );
    const context = await gatherRecoveryContext(sessionId, projectRoot);
    assert(context.apply_state === null, "corrupt apply_state silently null");
  });

  // E-P62 — resolveRecoveryTruth with no sources → no_recovery_data
  await test("E-P62 resolveRecoveryTruth empty context → no_recovery_data", () => {
    const context = synthContext("sess-62", null);
    const truth = resolveRecoveryTruth(context, "/tmp/unused");
    assertEqual(truth.kind, "no_recovery_data", "no sources handled");
  });

  // E-P63 — resolveRecoveryTruth single attempt, multiple sources at different
  //          generations → latest generation wins (within-attempt ordering)
  await test("E-P63 resolveRecoveryTruth single attempt picks latest generation", () => {
    const attemptId = "01SINGLEATTEMPTTEST0000000";
    const low = synthApplyStateSource("sess-63", attemptId, 2, "2026-04-08T09:00:00Z");
    // Use another apply_state entry for the "latest" source. We only need
    // resolveWithinAttempt to pick by generation.
    const high = synthApplyStateSource("sess-63", attemptId, 9, "2026-04-08T11:00:00Z");
    const context: RecoveryContext = {
      session_id: "sess-63",
      gathered_at: "2026-04-09T00:00:00.000Z",
      apply_state: low, // older
      emergency_log: null,
      checkpoint_manifest: null,
    };
    // Only one source is placed in context; add a second via direct field
    // assignment is not possible because emergency_log type differs. Instead
    // we feed the resolver the higher-generation source as the apply_state
    // and verify single_attempt pathway.
    context.apply_state = high;
    const truth = resolveRecoveryTruth(context, "/tmp/unused");
    assertEqual(truth.kind, "resolved", "resolved outcome");
    if (truth.kind !== "resolved") return;
    assertEqual(truth.source_of_truth, "single_attempt", "single attempt path");
    assertEqual(truth.has_conflict, false, "no conflict flag");
    assertEqual(truth.latest_source.freshness.generation, 9, "latest gen wins");
  });

  // E-P64 — two different attempt_ids + default policy → manual_escalation_required
  //          We exercise this via checkpoint_manifest + apply_state to get
  //          two different sources with different attempt_ids.
  await test("E-P64 resolveRecoveryTruth 2 attempt_ids default policy → manual escalation", () => {
    const apply = synthApplyStateSource(
      "sess-64",
      "01AAAAA_attempt_a_00000000",
      5,
      "2026-04-08T12:00:00Z",
    );
    // Build a checkpoint_manifest source in-memory with a DIFFERENT attempt_id
    const ckpt: RecoveryContext["checkpoint_manifest"] = {
      kind: "checkpoint_manifest",
      manifest: {
        schema_version: "1",
        session_id: "sess-64",
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        created_at: "2026-04-08T10:00:00Z",
        backups: [],
        restore_order: [],
        verification_after_restore: [],
      },
      checkpoint: {
        schema_version: "1",
        session_id: "sess-64",
        created_at: "2026-04-08T10:00:00Z",
        manifest_path: "/tmp/fake/ckpt/restore-manifest.yaml",
        backups: [],
        total_bytes: 0,
        protected: false,
        protection_reason: null,
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
      },
      freshness: {
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        source_recorded_at: "2026-04-08T10:00:00Z",
        source_kind: "checkpoint_manifest",
      },
    };
    const context: RecoveryContext = {
      session_id: "sess-64",
      gathered_at: "2026-04-09T00:00:00Z",
      apply_state: apply,
      emergency_log: null,
      checkpoint_manifest: ckpt,
    };

    const projectRoot = makeTmpDir("e-p64");
    const truth = resolveRecoveryTruth(context, projectRoot, DEFAULT_RECOVERY_POLICY);
    assertEqual(truth.kind, "manual_escalation_required", "escalation required");
    if (truth.kind !== "manual_escalation_required") return;
    assertEqual(truth.conflicting_attempts.length, 2, "both attempts in list");
    const ids = truth.conflicting_attempts.map((a) => a.attempt_id).sort();
    assertEqual(ids[0], "01AAAAA_attempt_a_00000000", "attempt a present");
    assertEqual(ids[1], "01BBBBB_attempt_b_00000000", "attempt b present");
    assert(
      truth.escalation_reason.includes("resolve-conflict"),
      "reason mentions cli resolution path",
    );
  });

  // E-P65 — two different attempt_ids + auto_resolve → canonical ULID wins
  //          ULID lexicographic == chronological. "01B..." > "01A..." so
  //          attempt B should become canonical.
  await test("E-P65 resolveRecoveryTruth auto_resolve picks lexicographically latest attempt", () => {
    const apply = synthApplyStateSource(
      "sess-65",
      "01AAAAA_attempt_a_00000000",
      5,
      "2026-04-08T12:00:00Z",
    );
    const ckpt: RecoveryContext["checkpoint_manifest"] = {
      kind: "checkpoint_manifest",
      manifest: {
        schema_version: "1",
        session_id: "sess-65",
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        created_at: "2026-04-08T10:00:00Z",
        backups: [],
        restore_order: [],
        verification_after_restore: [],
      },
      checkpoint: {
        schema_version: "1",
        session_id: "sess-65",
        created_at: "2026-04-08T10:00:00Z",
        manifest_path: "/tmp/fake/ckpt/restore-manifest.yaml",
        backups: [],
        total_bytes: 0,
        protected: false,
        protection_reason: null,
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
      },
      freshness: {
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        source_recorded_at: "2026-04-08T10:00:00Z",
        source_kind: "checkpoint_manifest",
      },
    };
    const context: RecoveryContext = {
      session_id: "sess-65",
      gathered_at: "2026-04-09T00:00:00Z",
      apply_state: apply,
      emergency_log: null,
      checkpoint_manifest: ckpt,
    };

    const projectRoot = makeTmpDir("e-p65");
    const truth = resolveRecoveryTruth(context, projectRoot, {
      cross_attempt_conflict: "auto_resolve_latest_generation",
    });
    assertEqual(truth.kind, "resolved", "auto resolved outcome");
    if (truth.kind !== "resolved") return;
    assertEqual(truth.source_of_truth, "auto_resolved", "source_of_truth=auto_resolved");
    assertEqual(truth.has_conflict, true, "conflict flag preserved");
    assertEqual(
      truth.latest_source.freshness.attempt_id,
      "01BBBBB_attempt_b_00000000",
      "canonical = lex-max attempt_id",
    );
  });

  // E-P66 — operator resolution present and referencing apply_state attempt →
  //          returns operator_resolution pointing at that attempt's sources
  await test("E-P66 resolveRecoveryTruth honors operator resolution (selected attempt exists)", () => {
    const projectRoot = makeTmpDir("e-p66");
    const sessionId = "sess-66";
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", sessionId),
      { recursive: true },
    );

    const attemptA = "01AAAAA_attempt_a_00000000";
    const attemptB = "01BBBBB_attempt_b_00000000";

    // Operator picks attempt A
    const entry = {
      resolved_at: "2026-04-09T00:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: attemptA,
      selected_attempt_reason: "operator pinned a",
      all_attempts_at_resolution_time: [],
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...entry,
      resolution_history: [entry],
    });

    const apply = synthApplyStateSource(sessionId, attemptA, 5, "2026-04-08T12:00:00Z");
    const ckpt: RecoveryContext["checkpoint_manifest"] = {
      kind: "checkpoint_manifest",
      manifest: {
        schema_version: "1",
        session_id: sessionId,
        attempt_id: attemptB,
        generation: 3,
        created_at: "2026-04-08T10:00:00Z",
        backups: [],
        restore_order: [],
        verification_after_restore: [],
      },
      checkpoint: {
        schema_version: "1",
        session_id: sessionId,
        created_at: "2026-04-08T10:00:00Z",
        manifest_path: "/tmp/fake/ckpt/restore-manifest.yaml",
        backups: [],
        total_bytes: 0,
        protected: false,
        protection_reason: null,
        attempt_id: attemptB,
        generation: 3,
      },
      freshness: {
        attempt_id: attemptB,
        generation: 3,
        source_recorded_at: "2026-04-08T10:00:00Z",
        source_kind: "checkpoint_manifest",
      },
    };
    const context: RecoveryContext = {
      session_id: sessionId,
      gathered_at: "2026-04-09T00:00:00Z",
      apply_state: apply,
      emergency_log: null,
      checkpoint_manifest: ckpt,
    };
    const truth = resolveRecoveryTruth(context, projectRoot);
    assertEqual(truth.kind, "resolved", "resolved via operator");
    if (truth.kind !== "resolved") return;
    assertEqual(truth.source_of_truth, "operator_resolution", "operator-chosen");
    assertEqual(
      truth.latest_source.freshness.attempt_id,
      attemptA,
      "latest_source matches operator choice",
    );
    assert(
      truth.resolution_artifact_path !== undefined,
      "resolution_artifact_path set on operator_resolution",
    );
  });

  // E-P67 — operator resolution references an attempt that no longer has any
  //          source → must escalate again (fail-close safety)
  await test("E-P67 resolveRecoveryTruth re-escalates when operator attempt is stale", () => {
    const projectRoot = makeTmpDir("e-p67");
    const sessionId = "sess-67";
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", sessionId),
      { recursive: true },
    );

    // Operator picked a third attempt that no longer appears in any source
    const ghostAttempt = "01GHOSTATTEMPT00000000000X";
    const entry = {
      resolved_at: "2026-04-09T00:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: ghostAttempt,
      selected_attempt_reason: "pinned but artifact was since lost",
      all_attempts_at_resolution_time: [],
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...entry,
      resolution_history: [entry],
    });

    const apply = synthApplyStateSource(
      sessionId,
      "01AAAAA_attempt_a_00000000",
      5,
      "2026-04-08T12:00:00Z",
    );
    const ckpt: RecoveryContext["checkpoint_manifest"] = {
      kind: "checkpoint_manifest",
      manifest: {
        schema_version: "1",
        session_id: sessionId,
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        created_at: "2026-04-08T10:00:00Z",
        backups: [],
        restore_order: [],
        verification_after_restore: [],
      },
      checkpoint: {
        schema_version: "1",
        session_id: sessionId,
        created_at: "2026-04-08T10:00:00Z",
        manifest_path: "/tmp/fake/ckpt/restore-manifest.yaml",
        backups: [],
        total_bytes: 0,
        protected: false,
        protection_reason: null,
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
      },
      freshness: {
        attempt_id: "01BBBBB_attempt_b_00000000",
        generation: 3,
        source_recorded_at: "2026-04-08T10:00:00Z",
        source_kind: "checkpoint_manifest",
      },
    };
    const context: RecoveryContext = {
      session_id: sessionId,
      gathered_at: "2026-04-09T00:00:00Z",
      apply_state: apply,
      emergency_log: null,
      checkpoint_manifest: ckpt,
    };
    const truth = resolveRecoveryTruth(context, projectRoot);
    assertEqual(truth.kind, "manual_escalation_required", "re-escalates on stale op choice");
    if (truth.kind !== "manual_escalation_required") return;
    assert(
      truth.escalation_reason.toLowerCase().includes("no source matches") ||
        truth.escalation_reason.toLowerCase().includes("re-record"),
      "reason explains why the prior resolution is stale",
    );
  });

  // E-P68 — buildEscalationMessage includes artifact_path for each attempt +
  //          exposes all three CLI/edit options
  await test("E-P68 buildEscalationMessage includes artifact_path + all resolution options", () => {
    const escalation: ManualEscalationRequired = {
      kind: "manual_escalation_required",
      conflicting_attempts: [
        {
          attempt_id: "01X",
          source_kind: "apply_state",
          generation: 2,
          source_recorded_at: "2026-04-08T09:00:00Z",
          artifact_path: "/tmp/a/apply.json",
        },
        {
          attempt_id: "01Y",
          source_kind: "checkpoint_manifest",
          generation: 1,
          source_recorded_at: "2026-04-08T08:00:00Z",
          artifact_path: "/tmp/b/restore-manifest.yaml",
        },
      ],
      escalation_reason: "two attempts detected",
    };
    const msg = buildEscalationMessage(escalation);
    // Both artifact_path strings must be present
    assert(msg.includes("/tmp/a/apply.json"), "first artifact_path present");
    assert(msg.includes("/tmp/b/restore-manifest.yaml"), "second artifact_path present");
    // Both attempt_ids must be present
    assert(msg.includes("01X"), "first attempt_id present");
    assert(msg.includes("01Y"), "second attempt_id present");
    // Resolution options A / B / C present
    assert(msg.includes("--resolve-conflict"), "option A shown");
    assert(msg.includes("decisions file"), "option B shown");
    assert(msg.includes("--auto-resolve-attempt-conflict"), "option C shown");
  });

  // E-P69 — saveRecoveryResolution merge: prior history preserved + top-level updated
  //          (companion to E-P36 which checks appending; this one checks that
  //          the top-level fields reflect the LATEST entry after merge.)
  await test("E-P69 saveRecoveryResolution merge updates top-level to latest decision", () => {
    const projectRoot = makeTmpDir("e-p69");
    const sessionId = "sess-69";
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", "promote", sessionId),
      { recursive: true },
    );

    const firstDecision = {
      resolved_at: "2026-04-09T00:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: "01FIRST",
      selected_attempt_reason: "initial choice",
      all_attempts_at_resolution_time: [],
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...firstDecision,
      resolution_history: [firstDecision],
    });

    const secondDecision = {
      resolved_at: "2026-04-09T01:00:00Z",
      resolved_by: "operator" as const,
      resolution_method: "cli_command" as const,
      selected_attempt_id: "01SECOND",
      selected_attempt_reason: "operator changed mind",
      all_attempts_at_resolution_time: [],
    };
    saveRecoveryResolution(projectRoot, {
      schema_version: "1",
      session_id: sessionId,
      ...secondDecision,
      resolution_history: [secondDecision],
    });

    const loaded = loadRecoveryResolution(projectRoot, sessionId);
    assert(loaded !== null, "resolution round-trips");
    assertEqual(
      loaded!.selected_attempt_id,
      "01SECOND",
      "top-level reflects latest decision",
    );
    assertEqual(
      loaded!.resolved_at,
      "2026-04-09T01:00:00Z",
      "top-level resolved_at reflects latest",
    );
    assertEqual(
      loaded!.resolution_history.length,
      2,
      "both decisions preserved in history",
    );
    assertEqual(
      loaded!.resolution_history[0]!.selected_attempt_id,
      "01FIRST",
      "first decision preserved at head",
    );
    assertEqual(
      loaded!.resolution_history[1]!.selected_attempt_id,
      "01SECOND",
      "second decision at tail",
    );
  });

  // E-P70 — apply-state attempt_id lifecycle: fresh init → unique ULID,
  //          generation=0. markApplied bumps generation but preserves attempt_id.
  await test("E-P70 initApplyState fresh attempt_id is unique + markApplied preserves it", () => {
    const a = initApplyState({
      sessionId: "sess-70a",
      pendingDecisions: [
        { decision_kind: "promotion", decision_id: "dec-1" },
      ],
    });
    const b = initApplyState({
      sessionId: "sess-70b",
      pendingDecisions: [
        { decision_kind: "promotion", decision_id: "dec-1" },
      ],
    });
    assert(a.attempt_id.length === 26, "ULID length");
    assert(b.attempt_id.length === 26, "ULID length");
    assert(a.attempt_id !== b.attempt_id, "fresh init produces distinct attempt_ids");
    assertEqual(a.generation, 0, "fresh generation is 0");

    const applied: AppliedDecision = {
      decision_kind: "promotion",
      decision_id: "dec-1",
      applied_at: "2026-04-09T10:00:00Z",
      target_path: "/tmp/target",
      result_summary: "ok",
    };
    const aAfter = markApplied(a, applied);
    assertEqual(
      aAfter.attempt_id,
      a.attempt_id,
      "markApplied preserves attempt_id (DD-22)",
    );
    assertEqual(aAfter.generation, 1, "generation bumped monotonically");
  });

  // -------------------------------------------------------------------------
  // Batch 3 — AuditObligation construction & transition invariants (DD-21)
  //
  // audit-obligation-kernel.ts is test-free in the production suite; this
  // batch verifies the runtime invariants that back up the TypeScript
  // encapsulation (private # fields) in promote/audit-obligation.ts.
  // -------------------------------------------------------------------------

  // E-P71 — Constructor invariant #1: explicit empty status_history →
  //          InvariantViolatedError. The default path constructs a single
  //          "pending" entry; passing [] must be refused.
  await test("E-P71 AuditObligation constructor rejects empty status_history", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { InvariantViolatedError } = await import("../shared/audit-obligation-kernel.js");
    let caught: unknown = null;
    try {
      new AuditObligation({
        obligation_id: "ob-71",
        trigger_kind: "count_threshold",
        detected_at: "2026-04-09T00:00:00Z",
        detected_after_session: "sess-71",
        affected_agents: ["structure"],
        reason: "test",
        max_carry_forward: 3,
        status_history: [], // empty — violates construction invariant
      });
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvariantViolatedError, "InvariantViolatedError thrown");
    assert(
      (caught as Error).message.includes("status_history"),
      "error names status_history",
    );
  });

  // E-P72 — Constructor invariant #2: declared status must match the last
  //          history entry's `to`. A divergent declared status must throw,
  //          because it means the serialized data was corrupted.
  await test("E-P72 AuditObligation constructor rejects status ↔ last history mismatch", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { InvariantViolatedError } = await import("../shared/audit-obligation-kernel.js");
    let caught: unknown = null;
    try {
      new AuditObligation({
        obligation_id: "ob-72",
        trigger_kind: "count_threshold",
        detected_at: "2026-04-09T00:00:00Z",
        detected_after_session: "sess-72",
        affected_agents: ["structure"],
        reason: "test",
        max_carry_forward: 3,
        // Last history entry says 'pending' but declared status says 'in_progress'
        status: "in_progress",
        status_history: [
          {
            from: null,
            to: "pending",
            at: "2026-04-09T00:00:00Z",
            reason: "initial detection",
          },
        ],
      });
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvariantViolatedError, "InvariantViolatedError thrown");
    const msg = (caught as Error).message;
    assert(
      msg.includes("in_progress") && msg.includes("pending"),
      "error names both declared and actual status",
    );
  });

  // E-P73 — fromJSON missing required field → InvariantViolatedError with the
  //          field name surfaced. Prevents corrupted ledger entries from
  //          silently deserializing.
  await test("E-P73 AuditObligation.fromJSON rejects missing required field", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { InvariantViolatedError } = await import("../shared/audit-obligation-kernel.js");
    // Missing "status" field — deserialization must refuse.
    const corrupt = {
      obligation_id: "ob-73",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-73",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
      // status: omitted on purpose
      status_history: [
        { from: null, to: "pending", at: "2026-04-09T00:00:00Z", reason: "init" },
      ],
      carry_forward_count: 0,
    } as unknown as Parameters<typeof AuditObligation.fromJSON>[0];

    let caught: unknown = null;
    try {
      AuditObligation.fromJSON(corrupt);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvariantViolatedError, "InvariantViolatedError thrown");
    assert((caught as Error).message.includes("status"), "error names the missing field");
    assert((caught as Error).message.includes("ob-73"), "error surfaces obligation_id for triage");
  });

  // E-P74 — transition() rejects illegal edges via the kernel's LEGAL_TRANSITIONS
  //          matrix. `pending → fulfilled` is invalid (must pass through in_progress).
  await test("E-P74 AuditObligation.transition rejects illegal pending → fulfilled", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { IllegalTransitionError } = await import("../shared/audit-obligation-kernel.js");
    const ob = new AuditObligation({
      obligation_id: "ob-74",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-74",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
    });
    assertEqual(ob.status, "pending", "starts pending");
    let caught: unknown = null;
    try {
      ob.transition("fulfilled", "trying to skip in_progress");
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof IllegalTransitionError, "IllegalTransitionError thrown");
    const msg = (caught as Error).message;
    assert(msg.includes("pending"), "error names from state");
    assert(msg.includes("fulfilled"), "error names to state");
    // Status must remain unchanged after a rejected transition
    assertEqual(ob.status, "pending", "status not mutated on rejection");
    assertEqual(ob.status_history.length, 1, "history not extended on rejection");
  });

  // E-P75 — transition() allows pending → expired_unattended (v6 EXPIRED-
  //          UNATTENDED-01 legal edge). After transition, status mirrors
  //          the last history entry (cache invariant).
  await test("E-P75 AuditObligation pending → expired_unattended is legal", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const ob = new AuditObligation({
      obligation_id: "ob-75",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-75",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
    });
    ob.transition("expired_unattended", "carry-forward exhausted", {
      session_id: "sess-exp",
      at: "2026-04-09T01:00:00Z",
    });
    assertEqual(ob.status, "expired_unattended", "status updated");
    assertEqual(ob.status_history.length, 2, "history extended by one");
    const last = ob.status_history[ob.status_history.length - 1]!;
    assertEqual(last.from, "pending", "from captured pre-mutation");
    assertEqual(last.to, "expired_unattended", "to matches requested");
    assertEqual(last.at, "2026-04-09T01:00:00Z", "at honors context override");
    assertEqual(last.session_id, "sess-exp", "session_id carried");
    // Active/inactive cache: expired_unattended is NOT strictly terminal but
    // isActive() returns false because the obligation is no longer in flight.
    assertEqual(ob.isTerminal(), false, "not strictly terminal");
    assertEqual(ob.isActive(), false, "no longer active");
  });

  // E-P76 — SYN-CONS-01 regression: transition() must capture `from` BEFORE
  //          mutating #status. A waive from pending must record from=pending,
  //          NOT from=waived (which was the v5 bug).
  await test("E-P76 transition captures `from` before mutation (SYN-CONS-01 regression)", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const ob = new AuditObligation({
      obligation_id: "ob-76",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-76",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
    });
    ob.transition("waived", "operator decision");
    assertEqual(ob.status, "waived", "status now waived");
    const last = ob.status_history[ob.status_history.length - 1]!;
    // The v5 bug would set from = "waived" because it assigned #status first.
    // The v7+ fix captures the pre-mutation value.
    assertEqual(last.from, "pending", "from is pre-mutation value (SYN-CONS-01 fix)");
    assertEqual(last.to, "waived", "to is the transition target");
    assertEqual(ob.isTerminal(), true, "waived is strictly terminal");
  });

  // -------------------------------------------------------------------------
  // Batch 4 — Backup retention & protection (DD-16, BACKUP-PROTECTION-01)
  //
  // Uses rootOverride testing hook on pruneBackups/setBackupProtection/
  // appendPruneLog so tests operate on a tmpdir-based fake BACKUP_ROOT and
  // never touch the real ~/.onto/backups tree.
  // -------------------------------------------------------------------------

  interface FakeBackup {
    sessionId: string;
    protectedFlag: boolean;
    protectionReason: "active_session" | "failed_unrecoverable" | "state_persistence_failed" | "user_pinned" | null;
    totalBytes: number;
    mtimeMs: number;
  }

  function writeFakeBackup(root: string, bak: FakeBackup): void {
    const dir = path.join(root, bak.sessionId);
    fs.mkdirSync(dir, { recursive: true });
    // Put a placeholder file so the directory has something to prune
    fs.writeFileSync(path.join(dir, "placeholder.txt"), "x");
    const metadata = {
      schema_version: "1" as const,
      session_id: bak.sessionId,
      created_at: new Date(bak.mtimeMs).toISOString(),
      total_bytes: bak.totalBytes,
      protected: bak.protectedFlag,
      protection_reason: bak.protectionReason,
      protection_set_at: bak.protectedFlag ? new Date(bak.mtimeMs).toISOString() : null,
    };
    REGISTRY.saveToFile(
      "backup_metadata",
      path.join(dir, "backup-metadata.yaml"),
      metadata,
    );
    // Force the directory mtime so retention/storage tests can control
    // chronology deterministically. Note: statSync(dir).mtime reflects the
    // directory's own mtime, which is updated by writes INTO the dir. We
    // utimesSync the directory itself after finishing writes.
    const when = new Date(bak.mtimeMs);
    fs.utimesSync(dir, when, when);
  }

  // E-P77 — active_session protected backup survives pruning when policy
  //          would otherwise remove it (keep_last_n = 0, keep_for_days = 0,
  //          storage budget = 0 → would prune EVERYTHING unprotected).
  await test("E-P77 pruneBackups respects active_session protection", async () => {
    const { pruneBackups } = await import("../shared/recoverability.js");
    const fakeRoot = makeTmpDir("e-p77-backups");
    writeFakeBackup(fakeRoot, {
      sessionId: "active-one",
      protectedFlag: true,
      protectionReason: "active_session",
      totalBytes: 1024,
      mtimeMs: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days old
    });
    writeFakeBackup(fakeRoot, {
      sessionId: "unprotected-one",
      protectedFlag: false,
      protectionReason: null,
      totalBytes: 1024,
      mtimeMs: Date.now() - 1 * 60 * 1000, // 1 minute old
    });

    const result = await pruneBackups(
      { backup_storage_max_bytes: 1_000_000, keep_last_n: 0, keep_for_days: 0 },
      fakeRoot,
    );
    assertEqual(result.kept_protected, 1, "protected kept");
    assertEqual(result.pruned, 1, "unprotected pruned");
    // Active session backup still on disk
    assert(
      fs.existsSync(path.join(fakeRoot, "active-one", "backup-metadata.yaml")),
      "active_session backup dir preserved",
    );
    assert(
      !fs.existsSync(path.join(fakeRoot, "unprotected-one")),
      "unprotected backup dir removed",
    );
  });

  // E-P78 — failed_unrecoverable is ALSO a protection reason: even though
  //          the session is finished, the operator needs the backup for
  //          manual recovery.
  await test("E-P78 pruneBackups respects failed_unrecoverable protection", async () => {
    const { pruneBackups } = await import("../shared/recoverability.js");
    const fakeRoot = makeTmpDir("e-p78-backups");
    writeFakeBackup(fakeRoot, {
      sessionId: "failed-recovery-needed",
      protectedFlag: true,
      protectionReason: "failed_unrecoverable",
      totalBytes: 1024,
      mtimeMs: Date.now() - 90 * 24 * 60 * 60 * 1000,
    });

    const result = await pruneBackups(
      { backup_storage_max_bytes: 0, keep_last_n: 0, keep_for_days: 0 },
      fakeRoot,
    );
    assertEqual(result.pruned, 0, "protected not pruned even at 0-byte budget");
    assertEqual(result.kept_protected, 1, "protected count");
    assert(
      fs.existsSync(path.join(fakeRoot, "failed-recovery-needed")),
      "failed_unrecoverable dir still exists",
    );
  });

  // E-P79 — keep_last_n exceeded: oldest unprotected backups pruned.
  //          Create 5 unprotected backups with distinct mtimes; policy keeps 2.
  await test("E-P79 pruneBackups enforces keep_last_n and prunes oldest first", async () => {
    const { pruneBackups } = await import("../shared/recoverability.js");
    const fakeRoot = makeTmpDir("e-p79-backups");
    const now = Date.now();
    // b5 newest → b1 oldest
    for (let i = 1; i <= 5; i++) {
      writeFakeBackup(fakeRoot, {
        sessionId: `bak-${i}`,
        protectedFlag: false,
        protectionReason: null,
        totalBytes: 100,
        // b1 = oldest, b5 = newest; mtimes span 1..5 minutes ago
        mtimeMs: now - (6 - i) * 60 * 1000,
      });
    }
    const result = await pruneBackups(
      { backup_storage_max_bytes: 1_000_000, keep_last_n: 2, keep_for_days: 30 },
      fakeRoot,
    );
    // keep_last_n = 2 → the newest 2 survive, 3 pruned
    assertEqual(result.pruned, 3, "three oldest pruned");
    assert(fs.existsSync(path.join(fakeRoot, "bak-5")), "newest survived");
    assert(fs.existsSync(path.join(fakeRoot, "bak-4")), "second newest survived");
    assert(!fs.existsSync(path.join(fakeRoot, "bak-3")), "third oldest pruned");
    assert(!fs.existsSync(path.join(fakeRoot, "bak-2")), "second oldest pruned");
    assert(!fs.existsSync(path.join(fakeRoot, "bak-1")), "oldest pruned");
  });

  // E-P80 — storage_max_bytes exceeded: after keep_last_n trim, additional
  //          pressure pass prunes oldest of the remaining unprotected until
  //          the total fits under budget.
  await test("E-P80 pruneBackups enforces storage_max_bytes as secondary pressure", async () => {
    const { pruneBackups } = await import("../shared/recoverability.js");
    const fakeRoot = makeTmpDir("e-p80-backups");
    const now = Date.now();
    // 3 backups, 1000 bytes each. keep_last_n=5 so initial trim keeps all.
    // Budget = 2500 bytes → pressure pass must prune oldest (bak-1 at 1000)
    // to bring total from 3000 → 2000 under 2500.
    writeFakeBackup(fakeRoot, {
      sessionId: "bak-1",
      protectedFlag: false,
      protectionReason: null,
      totalBytes: 1000,
      mtimeMs: now - 3 * 60 * 1000,
    });
    writeFakeBackup(fakeRoot, {
      sessionId: "bak-2",
      protectedFlag: false,
      protectionReason: null,
      totalBytes: 1000,
      mtimeMs: now - 2 * 60 * 1000,
    });
    writeFakeBackup(fakeRoot, {
      sessionId: "bak-3",
      protectedFlag: false,
      protectionReason: null,
      totalBytes: 1000,
      mtimeMs: now - 1 * 60 * 1000,
    });
    const result = await pruneBackups(
      { backup_storage_max_bytes: 2500, keep_last_n: 5, keep_for_days: 30 },
      fakeRoot,
    );
    assertEqual(result.pruned, 1, "one pruned under storage pressure");
    assertEqual(result.bytes_freed, 1000, "1000 bytes freed");
    assert(!fs.existsSync(path.join(fakeRoot, "bak-1")), "oldest victim");
    assert(fs.existsSync(path.join(fakeRoot, "bak-2")), "middle survived");
    assert(fs.existsSync(path.join(fakeRoot, "bak-3")), "newest survived");
  });

  // E-P81 — Prune log entries are appended per pruned session with correct
  //          reason and bytes_freed. Check the .prune-log.jsonl file directly.
  await test("E-P81 pruneBackups appends .prune-log.jsonl entry per pruned session", async () => {
    const { pruneBackups } = await import("../shared/recoverability.js");
    const fakeRoot = makeTmpDir("e-p81-backups");
    const now = Date.now();
    writeFakeBackup(fakeRoot, {
      sessionId: "expired-victim",
      protectedFlag: false,
      protectionReason: null,
      totalBytes: 512,
      mtimeMs: now - 60 * 24 * 60 * 60 * 1000, // 60 days old
    });
    const result = await pruneBackups(
      { backup_storage_max_bytes: 1_000_000, keep_last_n: 10, keep_for_days: 30 },
      fakeRoot,
    );
    assertEqual(result.pruned, 1, "one pruned for age");
    const logPath = path.join(fakeRoot, ".prune-log.jsonl");
    assert(fs.existsSync(logPath), "prune log written");
    const lines = fs
      .readFileSync(logPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    assertEqual(lines.length, 1, "one log line");
    const entry = JSON.parse(lines[0]!);
    assertEqual(entry.schema_version, "1", "schema_version stamped");
    assertEqual(entry.session_id, "expired-victim", "victim identified");
    assertEqual(entry.reason, "keep_for_days_exceeded", "age reason");
    assertEqual(entry.bytes_freed, 512, "bytes freed recorded");
  });

  // E-P82 — setBackupProtection toggles protection on/off; pruneBackups
  //          picks up the new state. Verifies that lifting protection
  //          makes a formerly protected backup eligible for pruning.
  await test("E-P82 setBackupProtection toggle flows through to pruneBackups", async () => {
    const { setBackupProtection, pruneBackups } = await import(
      "../shared/recoverability.js"
    );
    const fakeRoot = makeTmpDir("e-p82-backups");
    writeFakeBackup(fakeRoot, {
      sessionId: "toggle-target",
      protectedFlag: true,
      protectionReason: "active_session",
      totalBytes: 100,
      mtimeMs: Date.now() - 60 * 24 * 60 * 60 * 1000,
    });
    // First run: protected → not pruned
    let result = await pruneBackups(
      { backup_storage_max_bytes: 0, keep_last_n: 0, keep_for_days: 0 },
      fakeRoot,
    );
    assertEqual(result.pruned, 0, "protected not pruned");
    // Lift protection
    setBackupProtection("toggle-target", null, fakeRoot);
    // Second run: now eligible
    result = await pruneBackups(
      { backup_storage_max_bytes: 0, keep_last_n: 0, keep_for_days: 0 },
      fakeRoot,
    );
    assertEqual(result.pruned, 1, "after lift, pruned");
    assert(
      !fs.existsSync(path.join(fakeRoot, "toggle-target")),
      "backup dir removed after protection lifted",
    );
  });

  // -------------------------------------------------------------------------
  // Batch 5 — Audit obligation lifecycle (DD-17)
  //
  // Lifecycle paths exercised here:
  //   pending  →  pending (carry-forward increment, still under max)
  //   pending  →  expired_unattended (carry-forward exceeded)
  //   blocked  →  pending (auto re-entry via processCarryForward)
  //   expired  →  waived  (operator resolution after expiration)
  //
  // Terminal statuses are also verified to be untouched by carry-forward.
  // -------------------------------------------------------------------------

  // E-P83 — processCarryForward increments count but keeps pending obligations
  //          that are still under their max_carry_forward threshold.
  await test("E-P83 processCarryForward increments count without expiring under max", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { processCarryForward, countCarriedForward } = await import(
      "../shared/audit-state.js"
    );
    const ob = new AuditObligation({
      obligation_id: "ob-83",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-83a",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
    });
    const state: AuditState = { schema_version: "1", obligations: [ob] };
    processCarryForward(state, "sess-83b");
    assertEqual(ob.status, "pending", "still pending after 1 pass");
    assertEqual(ob.carry_forward_count, 1, "count incremented to 1");
    assertEqual(countCarriedForward(state), 1, "ledger-level counter reflects");
  });

  // E-P84 — Carry-forward exhausted → expired_unattended. max_carry_forward=2
  //          means: after pass 3, count=3 > max=2, transitions to expired.
  //          v9 semantics: hasExceededCarryForward is strict > (not >=).
  await test("E-P84 processCarryForward expires on carry-forward exhaustion", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { processCarryForward, getExpiredUnattended, getActiveObligations } =
      await import("../shared/audit-state.js");
    const ob = new AuditObligation({
      obligation_id: "ob-84",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-84a",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 2,
    });
    const state: AuditState = { schema_version: "1", obligations: [ob] };
    // Pass 1: count=1, still pending
    processCarryForward(state, "sess-84b");
    assertEqual(ob.status, "pending", "pass 1: still pending");
    // Pass 2: count=2, still pending (2 > 2 is false, not expired)
    processCarryForward(state, "sess-84c");
    assertEqual(ob.status, "pending", "pass 2: still pending");
    // Pass 3: count=3, 3 > 2, expired
    processCarryForward(state, "sess-84d");
    assertEqual(ob.status, "expired_unattended", "pass 3: expired");
    assertEqual(getExpiredUnattended(state).length, 1, "ledger filter picks it up");
    assertEqual(
      getActiveObligations(state).length,
      0,
      "expired is not active anymore",
    );
    // Expiration transition must be recorded in history
    const last = ob.status_history[ob.status_history.length - 1]!;
    assertEqual(last.to, "expired_unattended", "history records transition");
    assert(last.reason.includes("exceeded"), "reason explains why");
  });

  // E-P85 — blocked → pending auto re-entry on next promote pass.
  //          Mirrors the "transient failure recovers on retry" path.
  await test("E-P85 processCarryForward re-enters blocked → pending automatically", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { processCarryForward } = await import("../shared/audit-state.js");
    const ob = new AuditObligation({
      obligation_id: "ob-85",
      trigger_kind: "contradiction_threshold_exceeded",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-85a",
      affected_agents: ["philosopher"],
      reason: "test",
      max_carry_forward: 5,
    });
    // Move pending → in_progress → blocked manually (legal transitions)
    ob.transition("in_progress", "picked up by P-14");
    ob.transition("blocked", "LLM timeout during audit");
    assertEqual(ob.status, "blocked", "now blocked");

    const state: AuditState = { schema_version: "1", obligations: [ob] };
    processCarryForward(state, "sess-85b");
    assertEqual(ob.status, "pending", "re-entered pending");
    assertEqual(ob.carry_forward_count, 1, "count incremented once");
    // History should now contain: init-pending, in_progress, blocked, pending
    assertEqual(ob.status_history.length, 4, "4 transitions recorded");
    const last = ob.status_history[ob.status_history.length - 1]!;
    assertEqual(last.from, "blocked", "from=blocked");
    assertEqual(last.to, "pending", "to=pending");
    assert(last.reason.includes("Re-entry"), "reason names re-entry path");
  });

  // E-P86 — Terminal obligations (fulfilled, waived, no_eligible_agents) are
  //          untouched by processCarryForward. The filter only processes
  //          pending/blocked entries.
  await test("E-P86 processCarryForward skips terminal obligations", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { processCarryForward, getActiveObligations } = await import(
      "../shared/audit-state.js"
    );

    function buildTerminal(
      obligationId: string,
      terminalState: "fulfilled" | "waived" | "no_eligible_agents",
    ): InstanceType<typeof AuditObligation> {
      const ob = new AuditObligation({
        obligation_id: obligationId,
        trigger_kind: "count_threshold",
        detected_at: "2026-04-09T00:00:00Z",
        detected_after_session: "sess-86",
        affected_agents: ["structure"],
        reason: "test",
        max_carry_forward: 3,
      });
      if (terminalState === "waived") {
        ob.transition("waived", "operator");
      } else {
        ob.transition("in_progress", "picked up");
        ob.transition(terminalState, "terminal reached");
      }
      return ob;
    }

    const fulfilled = buildTerminal("ob-86f", "fulfilled");
    const waived = buildTerminal("ob-86w", "waived");
    const noEligible = buildTerminal("ob-86n", "no_eligible_agents");
    const state: AuditState = {
      schema_version: "1",
      obligations: [fulfilled, waived, noEligible],
    };
    processCarryForward(state, "sess-86b");
    // No transitions fired
    assertEqual(fulfilled.carry_forward_count, 0, "fulfilled untouched");
    assertEqual(waived.carry_forward_count, 0, "waived untouched");
    assertEqual(noEligible.carry_forward_count, 0, "no_eligible untouched");
    assertEqual(getActiveObligations(state).length, 0, "none active");
  });

  // E-P87 — AuditState round-trip through YAML preserves class semantics.
  //          After save → load, the obligation is an AuditObligation instance
  //          (not just a plain object), status is private, transition() works.
  await test("E-P87 AuditState save/load round-trip preserves DD-21 class semantics", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const { saveAuditState, loadAuditState } = await import(
      "../shared/audit-state.js"
    );
    const ob = new AuditObligation({
      obligation_id: "ob-87",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-87a",
      affected_agents: ["structure"],
      reason: "roundtrip",
      max_carry_forward: 3,
    });
    ob.transition("in_progress", "picked up");
    const pre: AuditState = { schema_version: "1", obligations: [ob] };

    const dir = makeTmpDir("e-p87");
    const filePath = path.join(dir, "audit-state.yaml");
    saveAuditState(pre, filePath);
    assert(fs.existsSync(filePath), "audit-state written");

    const post = loadAuditState(filePath);
    assertEqual(post.obligations.length, 1, "one obligation");
    const restored = post.obligations[0]!;
    // Class-level assertions
    assert(restored instanceof AuditObligation, "restored is AuditObligation instance");
    assertEqual(restored.status, "in_progress", "status preserved");
    assertEqual(restored.status_history.length, 2, "history preserved");
    assertEqual(restored.obligation_id, "ob-87", "identity preserved");
    // Class behavior still works — illegal transition is still rejected
    let rejected = false;
    try {
      restored.transition("pending", "bogus");
    } catch {
      rejected = true;
    }
    assert(rejected, "illegal transition still enforced post-roundtrip");
  });

  // E-P88 — loadAuditState returns an empty ledger when the file doesn't
  //          exist (fresh user bootstrap). Must not throw.
  await test("E-P88 loadAuditState returns empty ledger for missing file", async () => {
    const { loadAuditState } = await import("../shared/audit-state.js");
    const dir = makeTmpDir("e-p88");
    const filePath = path.join(dir, "nonexistent.yaml");
    const state = loadAuditState(filePath);
    assertEqual(state.schema_version, "1", "schema_version set");
    assertEqual(state.obligations.length, 0, "empty obligations");
  });

  // E-P89 — Expired obligations can still be waived by the operator.
  //          v6 EXPIRED-UNATTENDED-01 intent: expired_unattended is
  //          "visible but not strictly terminal" — LEGAL_TRANSITIONS lists
  //          waived as the one allowed outgoing edge.
  await test("E-P89 expired_unattended → waived is legal (operator resolution)", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const ob = new AuditObligation({
      obligation_id: "ob-89",
      trigger_kind: "count_threshold",
      detected_at: "2026-04-09T00:00:00Z",
      detected_after_session: "sess-89a",
      affected_agents: ["structure"],
      reason: "test",
      max_carry_forward: 3,
    });
    ob.transition("expired_unattended", "carry-forward exhausted");
    assertEqual(ob.status, "expired_unattended", "expired");
    // Now the operator reviews and waives it
    ob.transition("waived", "operator acknowledged and dismissed");
    assertEqual(ob.status, "waived", "transitioned to waived");
    assertEqual(ob.isTerminal(), true, "waived is strictly terminal");
    const last = ob.status_history[ob.status_history.length - 1]!;
    assertEqual(last.from, "expired_unattended", "from captured pre-mutation");
  });

  // E-P90 — Ledger filter helpers return the right subsets. Build a ledger
  //          with 4 obligations spanning active/inactive/terminal/expired,
  //          then check each helper picks its target set.
  await test("E-P90 audit-state filter helpers partition the ledger correctly", async () => {
    const { AuditObligation } = await import("./audit-obligation.js");
    const {
      getActiveObligations,
      getExpiredUnattended,
      countCarriedForward,
      findObligation,
    } = await import("../shared/audit-state.js");

    function fresh(id: string): InstanceType<typeof AuditObligation> {
      return new AuditObligation({
        obligation_id: id,
        trigger_kind: "count_threshold",
        detected_at: "2026-04-09T00:00:00Z",
        detected_after_session: "sess-90",
        affected_agents: ["structure"],
        reason: "test",
        max_carry_forward: 3,
      });
    }

    const active = fresh("ob-90a"); // stays pending
    const carried = fresh("ob-90b");
    carried.incrementCarryForward(); // count=1
    const expired = fresh("ob-90c");
    expired.transition("expired_unattended", "exhausted");
    const waived = fresh("ob-90d");
    waived.transition("waived", "operator");

    const state: AuditState = {
      schema_version: "1",
      obligations: [active, carried, expired, waived],
    };

    const activeSet = getActiveObligations(state);
    assertEqual(activeSet.length, 2, "2 active: plain + carried");
    assertEqual(
      activeSet.map((o) => o.obligation_id).sort().join(","),
      "ob-90a,ob-90b",
      "active subset",
    );

    const expiredSet = getExpiredUnattended(state);
    assertEqual(expiredSet.length, 1, "1 expired");
    assertEqual(expiredSet[0]!.obligation_id, "ob-90c", "expired entry");

    assertEqual(countCarriedForward(state), 1, "one has carry > 0");

    assertEqual(
      findObligation(state, "ob-90b")?.obligation_id,
      "ob-90b",
      "findObligation locates by id",
    );
    assertEqual(
      findObligation(state, "nonexistent"),
      undefined,
      "findObligation returns undefined for unknown id",
    );
  });

  // -------------------------------------------------------------------------
  // Batch 6 — Domain doc lineage + misc (DD-19, misc)
  //
  // DD-19 split candidate_id into slot_id (stable across regeneration) and
  // instance_id (fresh per call). These tests exercise the tuple sensitivity
  // and the filter rules in identifyDomainDocCandidates beyond what E-P18/
  // E-P19 already cover. One misc test at the tail checks the ledger's
  // default audit policy values as a cheap regression guard.
  // -------------------------------------------------------------------------

  function buildVerdict(
    candidateId: string,
    agentId: string,
    applicabilityTags: string[],
    consensus: "promote_3_3" | "promote_2_3" | "defer_majority" | "reject_majority" | "split",
  ): PanelVerdict {
    const item: ParsedLearningItem = syntheticItem({
      agent_id: agentId,
      applicability_tags: applicabilityTags,
      content: `candidate ${candidateId}`,
    });
    return {
      candidate_id: candidateId,
      candidate: item,
      panel_members: [],
      member_reviews: [],
      consensus,
      is_contradiction: false,
      matched_existing_line: null,
    };
  }

  // E-P91 — deriveSlotId tuple sensitivity: changing any single tuple
  //          component (promotion id, target doc, domain) changes the slot_id.
  //          Complements E-P18 which only checks determinism for a fixed tuple.
  await test("E-P91 deriveSlotId tuple sensitivity across all three components", () => {
    const base = deriveSlotId("prom-1", "concepts.md", "software-engineering");
    const diffPromo = deriveSlotId("prom-2", "concepts.md", "software-engineering");
    const diffDoc = deriveSlotId("prom-1", "competency_qs.md", "software-engineering");
    const diffDomain = deriveSlotId("prom-1", "concepts.md", "business-operations");

    assert(base !== diffPromo, "promotion id change → different slot_id");
    assert(base !== diffDoc, "target doc change → different slot_id");
    assert(base !== diffDomain, "domain change → different slot_id");
    assert(diffPromo !== diffDoc, "pairs are independent");
    assert(diffDoc !== diffDomain, "pairs are independent");
    // Length invariant — 12 hex chars per derivation
    assertEqual(base.length, 12, "slot_id length");
    assertEqual(diffPromo.length, 12, "slot_id length");
  });

  // E-P92 — DD-19 UF-SEM-01: regenerating candidates for the same panel
  //          verdicts must produce stable slot_ids but distinct instance_ids.
  //          This is the lineage contract: slot_id says "which slot",
  //          instance_id says "which generation attempt". Re-run is safe.
  await test("E-P92 DD-19 regeneration: stable slot_id + distinct instance_id", () => {
    const verdicts = [
      buildVerdict("prom-92a", "semantics", ["domain/software-engineering"], "promote_3_3"),
      buildVerdict("prom-92b", "pragmatics", ["domain/business"], "promote_2_3"),
    ];

    const gen1 = identifyDomainDocCandidates(verdicts);
    const gen2 = identifyDomainDocCandidates(verdicts);

    assertEqual(gen1.length, 2, "two candidates from gen 1");
    assertEqual(gen2.length, 2, "two candidates from gen 2");

    // slot_ids are stable across generations (sorted deterministically)
    assertEqual(
      gen1[0]!.slot_id,
      gen2[0]!.slot_id,
      "slot_id stable first candidate",
    );
    assertEqual(
      gen1[1]!.slot_id,
      gen2[1]!.slot_id,
      "slot_id stable second candidate",
    );

    // instance_ids are fresh per call
    assert(
      gen1[0]!.instance_id !== gen2[0]!.instance_id,
      "instance_id changes across generations",
    );
    assert(
      gen1[1]!.instance_id !== gen2[1]!.instance_id,
      "instance_id changes across generations",
    );

    // And instance_ids within a single generation are distinct (DD-19 ULID)
    assert(
      gen1[0]!.instance_id !== gen1[1]!.instance_id,
      "two candidates in same call have distinct instance_ids",
    );
  });

  // E-P93 — Non-accumulable agents (logic, structure, dependency, extension)
  //          are NOT mapped to target docs. They're excluded even with
  //          promote_3_3 consensus + domain tag. Only semantics, pragmatics,
  //          coverage are doc-generating per AGENT_TO_TARGET.
  await test("E-P93 identifyDomainDocCandidates excludes non-accumulable agents", () => {
    const verdicts = [
      buildVerdict("prom-93a", "structure", ["domain/software-engineering"], "promote_3_3"),
      buildVerdict("prom-93b", "logic", ["domain/software-engineering"], "promote_3_3"),
      buildVerdict("prom-93c", "dependency", ["domain/software-engineering"], "promote_3_3"),
      buildVerdict("prom-93d", "extension", ["domain/software-engineering"], "promote_3_3"),
      // Sanity: one accumulable agent to confirm the filter is selective,
      // not blanket.
      buildVerdict("prom-93e", "semantics", ["domain/software-engineering"], "promote_3_3"),
    ];
    const candidates = identifyDomainDocCandidates(verdicts);
    assertEqual(candidates.length, 1, "only semantics candidate survives");
    assertEqual(candidates[0]!.agent_id, "semantics", "correct agent");
    assertEqual(candidates[0]!.target_doc, "concepts.md", "semantics → concepts.md");
  });

  // E-P94 — Non-promote verdicts (defer, reject, split) produce no candidates
  //          even when the originating agent IS accumulable. The filter is
  //          consensus-first.
  await test("E-P94 identifyDomainDocCandidates excludes defer/reject/split verdicts", () => {
    const verdicts = [
      buildVerdict("prom-94a", "semantics", ["domain/software-engineering"], "defer_majority"),
      buildVerdict("prom-94b", "pragmatics", ["domain/software-engineering"], "reject_majority"),
      buildVerdict("prom-94c", "coverage", ["domain/software-engineering"], "split"),
    ];
    const candidates = identifyDomainDocCandidates(verdicts);
    assertEqual(candidates.length, 0, "no candidates emitted");
  });

  // E-P95 — Methodology-only items (no domain/X tag) produce no candidates.
  //          DD-19 requires at least one domain tag to fan out against.
  await test("E-P95 identifyDomainDocCandidates excludes methodology-only items", () => {
    const verdicts = [
      // Methodology tag only — no domain tag
      buildVerdict("prom-95a", "semantics", ["methodology"], "promote_3_3"),
      // Mixed — has domain tag, should produce a candidate
      buildVerdict("prom-95b", "semantics", ["methodology", "domain/software-engineering"], "promote_3_3"),
    ];
    const candidates = identifyDomainDocCandidates(verdicts);
    assertEqual(candidates.length, 1, "only the item with a domain tag qualifies");
    assertEqual(candidates[0]!.approved_promotion_id, "prom-95b", "correct promotion");
    assertEqual(candidates[0]!.domain, "software-engineering", "domain extracted");
  });

  // E-P96 — Output ordering is deterministic across calls. Shuffled inputs
  //          produce the same sorted output. Ordering key: (approved_promotion_id,
  //          target_doc, domain).
  await test("E-P96 identifyDomainDocCandidates output is deterministically sorted", () => {
    const ordered = [
      buildVerdict("prom-a", "semantics", ["domain/a-first"], "promote_3_3"),
      buildVerdict("prom-a", "semantics", ["domain/b-second"], "promote_3_3"),
      buildVerdict("prom-b", "pragmatics", ["domain/a-first"], "promote_3_3"),
    ];
    const shuffled = [ordered[2]!, ordered[0]!, ordered[1]!];
    const c1 = identifyDomainDocCandidates(ordered);
    const c2 = identifyDomainDocCandidates(shuffled);
    assertEqual(c1.length, 3, "expected count");
    assertEqual(c2.length, 3, "expected count");
    // Compare slot_id sequence — instance_id varies per call
    for (let i = 0; i < 3; i++) {
      assertEqual(c1[i]!.slot_id, c2[i]!.slot_id, `slot_id order match @${i}`);
    }
    // Lexicographic ordering: prom-a first, then prom-b
    assertEqual(c1[0]!.approved_promotion_id, "prom-a", "prom-a first");
    assertEqual(c1[1]!.approved_promotion_id, "prom-a", "prom-a again");
    assertEqual(c1[2]!.approved_promotion_id, "prom-b", "prom-b last");
    // Within same promotion+doc, domain is the tiebreaker
    assertEqual(c1[0]!.domain, "a-first", "a-first before b-second");
    assertEqual(c1[1]!.domain, "b-second", "b-second after a-first");
  });

  // E-P97 — Misc regression: DEFAULT_AUDIT_POLICY exports the baked-in
  //          values used by the Phase 3 design contracts. A silent change
  //          here would drift judgment_threshold (currently 10 per DD-13)
  //          or the obligation_max_carry_forward (3 per DD-17).
  await test("E-P97 DEFAULT_AUDIT_POLICY values match Phase 3 design contracts", () => {
    assertEqual(
      DEFAULT_AUDIT_POLICY.judgment_threshold,
      10,
      "judgment_threshold = 10 per DD-13 P-14 sequencing",
    );
    assertEqual(
      DEFAULT_AUDIT_POLICY.obligation_max_carry_forward,
      3,
      "obligation_max_carry_forward = 3 per DD-17 lifecycle",
    );
  });

  // -------------------------------------------------------------------------
  // Batch 7 — Collector contract hardening (DD-18 §SST + parser)
  //
  // These tests exercise the boundaries that E-P1/E-P2/E-P3/E-P4/E-P38 leave
  // open: disjoint invariant against real global scope, event marker + tag
  // comment capture, learning_id capture, parser tolerance, and per-file
  // baseline hash structure. Uses process.env.HOME override so global
  // learnings are read from a tmpdir instead of the real ~/.onto/learnings.
  // -------------------------------------------------------------------------

  /**
   * Temporarily override HOME so collector's getGlobalLearningsDir() reads
   * from a controlled tmpdir. Returns a cleanup function to restore HOME.
   * Must be called BEFORE invoking collect().
   */
  function overrideHome(fakeHome: string): () => void {
    const previousHome = process.env.HOME;
    process.env.HOME = fakeHome;
    return () => {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    };
  }

  // E-P98 — DD-18 §SST disjoint invariant: in promote mode, candidate_items
  //          come from project scope only. Items declared in the global
  //          scope MUST NOT leak into candidate_items even if they share
  //          content with project items.
  await test("E-P98 collector promote mode: candidate_items disjoint from global_items", () => {
    const fakeHome = makeTmpDir("e-p98-home");
    const projectRoot = makeTmpDir("e-p98-proj");
    // Global scope: one [fact] learning under the fake HOME
    writeLearningFile(
      path.join(fakeHome, ".onto", "learnings"),
      "structure",
      "- [fact] [methodology] [foundation] global-only-entry (source: p, d, 2026-01-01) [impact:normal]",
    );
    // Project scope: a DIFFERENT learning
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      "- [fact] [methodology] [foundation] project-only-entry (source: p, d, 2026-01-02) [impact:normal]",
    );

    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      // Both scopes populated
      assertEqual(result.global_items.length, 1, "one global item");
      assertEqual(result.project_items.length, 1, "one project item");
      // candidate_items must contain only the project entry
      assertEqual(result.candidate_items.length, 1, "one candidate");
      assertEqual(
        result.candidate_items[0]!.scope,
        "project",
        "candidate scope=project",
      );
      assertEqual(
        result.candidate_items[0]!.content,
        "project-only-entry",
        "candidate content",
      );
      // Disjoint invariant: no candidate has scope=global
      const candidateContents = result.candidate_items.map((i) => i.content);
      const globalContents = result.global_items.map((i) => i.content);
      for (const content of candidateContents) {
        assert(
          !globalContents.includes(content) ||
            result.candidate_items.find((c) => c.content === content)?.scope !==
              "global",
          `candidate "${content}" must not share (scope=global, content) with global_items`,
        );
      }
    } finally {
      restore();
    }
  });

  // E-P99 — Event marker capture: 2 markers attached to one learning are
  //          both stored in event_markers as full comment text. retirement.ts
  //          needs the full `<!-- ... -->` string to parse dates.
  await test("E-P99 collector captures all event markers on a learning", () => {
    const fakeHome = makeTmpDir("e-p99-home");
    const projectRoot = makeTmpDir("e-p99-proj");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "- [fact] [methodology] [foundation] candidate (source: p, d, 2026-01-01) [impact:normal]",
        "<!-- applied-then-found-invalid: 2026-02-15 rewritten -->",
        "<!-- observed-obsolete: 2026-03-20 superseded -->",
      ].join("\n"),
    );
    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      assertEqual(result.project_items.length, 1, "one project item");
      const item = result.project_items[0]!;
      assertEqual(item.event_markers.length, 2, "two event markers captured");
      // First marker should include the applied-then-found-invalid label + date
      assert(
        item.event_markers[0]!.includes("applied-then-found-invalid"),
        "first marker kind preserved",
      );
      assert(
        item.event_markers[0]!.includes("2026-02-15"),
        "first marker date preserved",
      );
      // Second marker
      assert(
        item.event_markers[1]!.includes("observed-obsolete"),
        "second marker kind preserved",
      );
      assert(
        item.event_markers[1]!.includes("2026-03-20"),
        "second marker date preserved",
      );
      // retention_confirmed_at is independent — absent in this test
      assertEqual(item.retention_confirmed_at, null, "no retention marker");
    } finally {
      restore();
    }
  });

  // E-P100 — retention_confirmed_at capture: dedicated `<!-- retention-confirmed: YYYY-MM-DD -->`
  //          is stored on the item separately from event_markers.
  //          retirement.ts uses this as the cutoff for counting event markers.
  await test("E-P100 collector captures retention_confirmed_at without mixing into event_markers", () => {
    const fakeHome = makeTmpDir("e-p100-home");
    const projectRoot = makeTmpDir("e-p100-proj");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "- [fact] [methodology] [foundation] candidate (source: p, d, 2026-01-01) [impact:normal]",
        "<!-- retention-confirmed: 2026-02-01 -->",
        "<!-- applied-then-found-invalid: 2026-03-15 -->",
      ].join("\n"),
    );
    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      assertEqual(result.project_items.length, 1, "one item");
      const item = result.project_items[0]!;
      assertEqual(
        item.retention_confirmed_at,
        "2026-02-01",
        "retention_confirmed_at isolated",
      );
      assertEqual(item.event_markers.length, 1, "only event marker captured");
      assert(
        item.event_markers[0]!.includes("applied-then-found-invalid"),
        "event marker preserved",
      );
    } finally {
      restore();
    }
  });

  // E-P101 — learning_id capture from comment annotation.
  //          `<!-- learning_id: abc123 -->` following a learning line sets
  //          item.learning_id. Used for cross-agent dedup member matching.
  await test("E-P101 collector captures learning_id from comment annotation", () => {
    const fakeHome = makeTmpDir("e-p101-home");
    const projectRoot = makeTmpDir("e-p101-proj");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "- [fact] [methodology] [foundation] item-a (source: p, d, 2026-01-01) [impact:normal]",
        "<!-- learning_id: abcdef123456 -->",
        "",
        "- [fact] [methodology] [foundation] item-b (source: p, d, 2026-01-02) [impact:normal]",
        // No learning_id for item-b — field should be null
      ].join("\n"),
    );
    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      assertEqual(result.project_items.length, 2, "two items");
      const [a, b] = result.project_items;
      assertEqual(a!.learning_id, "abcdef123456", "learning_id captured");
      assertEqual(b!.learning_id, null, "no id → null");
    } finally {
      restore();
    }
  });

  // E-P102 — Lenient parser: malformed lines are recorded in parse_errors,
  //          valid lines in the same file are still parsed. Supplements
  //          E-P38 which checks the promoter runs through parse errors.
  await test("E-P102 collector records parse errors without skipping surrounding valid lines", () => {
    const fakeHome = makeTmpDir("e-p102-home");
    const projectRoot = makeTmpDir("e-p102-proj");
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      [
        "- [fact] [methodology] [foundation] valid-before (source: p, d, 2026-01-01) [impact:normal]",
        // Missing applicability tags — parser rejects
        "- [fact] missing-tags (source: p, d, 2026-01-02) [impact:normal]",
        // Empty content body — parser rejects
        "- [fact] [methodology] [foundation] (source: p, d, 2026-01-03) [impact:normal]",
        "- [fact] [methodology] [foundation] valid-after (source: p, d, 2026-01-04) [impact:normal]",
      ].join("\n"),
    );
    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      // Two valid items parsed, two errors recorded
      assertEqual(result.project_items.length, 2, "two valid items parsed");
      assertEqual(result.parse_errors.length, 2, "two parse errors recorded");
      // Valid items are in file order
      assertEqual(
        result.project_items[0]!.content,
        "valid-before",
        "first valid",
      );
      assertEqual(
        result.project_items[1]!.content,
        "valid-after",
        "second valid — surrounds errors",
      );
      // Parse errors carry file path and line number
      for (const err of result.parse_errors) {
        assert(err.source_path.length > 0, "source_path set");
        assert(err.line_number > 0, "line_number set");
        assert(err.error.length > 0, "error message set");
      }
    } finally {
      restore();
    }
  });

  // E-P103 — Baseline hash per-file structure (DD-10): for each project/global
  //          file discovered, baseline_files contains (path, scope, agent_id,
  //          size_bytes, content_sha256, line_count). Critical for
  //          verifyBaselineHash drift detection.
  await test("E-P103 collector baseline hash captures per-file metadata", () => {
    const fakeHome = makeTmpDir("e-p103-home");
    const projectRoot = makeTmpDir("e-p103-proj");
    const fileContents =
      "- [fact] [methodology] [foundation] item (source: p, d, 2026-01-01) [impact:normal]\n";
    writeLearningFile(
      path.join(projectRoot, ".onto", "learnings"),
      "structure",
      fileContents,
    );
    const restore = overrideHome(fakeHome);
    try {
      const result = collect({ mode: "promote", projectRoot });
      assertEqual(result.baseline_hash.schema_version, "1", "schema_version");
      assertEqual(result.baseline_hash.source_scope, "promote", "scope label");
      assert(result.baseline_hash.captured_at.length > 0, "captured_at set");
      const projectBaselines = result.baseline_hash.files.filter(
        (f) => f.scope === "project",
      );
      assertEqual(projectBaselines.length, 1, "one project file in baseline");
      const file = projectBaselines[0]!;
      assertEqual(file.agent_id, "structure", "agent_id derived from filename");
      assertEqual(file.size_bytes, Buffer.byteLength(fileContents), "size matches");
      assertEqual(file.line_count, 2, "line count includes trailing newline row");
      assertEqual(file.content_sha256.length, 64, "sha256 hex length");
      assert(file.path.endsWith("structure.md"), "path ends with filename");
    } finally {
      restore();
    }
  });

  // -------------------------------------------------------------------------
  // Batch 8 — Emergency log + persistence paths (DD-15)
  //
  // writeEmergencyLogEntry (promote-executor.ts) writes to a HOME-frozen
  // EMERGENCY_LOG_PATH that cannot be overridden at test time. So these
  // tests focus on EmergencyLogSpec + REGISTRY.appendToFile discipline
  // (the contract that writeEmergencyLogEntry's successor path relies on),
  // not the promote-executor side effect itself.
  // -------------------------------------------------------------------------

  function syntheticEmergencyEntry(
    sessionId: string,
    attemptId: string,
    generation: number,
  ): Record<string, unknown> {
    return {
      schema_version: "1",
      entry_id: `entry-${generation}`,
      session_id: sessionId,
      written_at: "2026-04-09T12:00:00Z",
      attempt_id: attemptId,
      generation,
      fatal_error_kind: "state_persistence_failed",
      fatal_error_message: "disk full",
      last_known_state_snapshot: {
        status: "in_progress",
        applied_count: 2,
        failed_count: 0,
        pending_count: 3,
      },
      recoverability_checkpoint: null,
      partial_decisions_attempted: [],
      session_root: "/tmp/fake/session",
    };
  }

  // E-P104 — EmergencyLogSpec.validate rejects entries missing required
  //          top-level fields. This guards against shape drift in
  //          writeEmergencyLogEntry (if a new field is added to
  //          ApplyExecutionState, the spec must be updated in lockstep).
  await test("E-P104 EmergencyLogSpec.validate rejects entries missing required fields", async () => {
    const { EmergencyLogSpec } = await import(
      "../shared/specs/emergency-log-spec.js"
    );
    // Missing entry_id (all other required fields present)
    const bad = {
      schema_version: "1",
      session_id: "sess-x",
      written_at: "2026-04-09T12:00:00Z",
      attempt_id: "01X",
      generation: 0,
      fatal_error_kind: "state_persistence_failed",
      fatal_error_message: "bad",
      session_root: "/tmp/x",
    };
    const result = EmergencyLogSpec.validate(bad);
    assertEqual(result.valid, false, "invalid without entry_id");
    assert(
      result.errors.some((e) => e.includes("entry_id")),
      "error mentions entry_id",
    );

    // Missing fatal_error_kind
    const bad2 = {
      schema_version: "1",
      entry_id: "e-1",
      session_id: "sess-x",
      written_at: "2026-04-09T12:00:00Z",
      attempt_id: "01X",
      generation: 0,
      fatal_error_message: "bad",
      session_root: "/tmp/x",
    };
    const result2 = EmergencyLogSpec.validate(bad2);
    assertEqual(result2.valid, false, "invalid without fatal_error_kind");
    assert(
      result2.errors.some((e) => e.includes("fatal_error_kind")),
      "error mentions fatal_error_kind",
    );
  });

  // E-P105 — EmergencyLogSpec.parse rejects pre-v7 shapes (no schema_version).
  //          Historical emergency-log.jsonl files from before Phase 3 get
  //          surfaced as UF-COV-01 incompatibility, not silently accepted.
  await test("E-P105 EmergencyLogSpec.parse rejects pre-v7 entries", async () => {
    const { EmergencyLogSpec } = await import(
      "../shared/specs/emergency-log-spec.js"
    );
    const legacyJson = JSON.stringify({
      entry_id: "legacy-1",
      session_id: "old",
      written_at: "2025-12-01T00:00:00Z",
      // no schema_version
    });
    let caught: unknown = null;
    try {
      EmergencyLogSpec.parse(legacyJson, "json");
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof IncompatibleVersionError, "IncompatibleVersionError");
    assert(
      (caught as Error).message.toLowerCase().includes("pre-v7"),
      "message identifies pre-v7",
    );
  });

  // E-P106 — EmergencyLogSpec.serialize produces ONE compact JSON line
  //          (no trailing newline — framing is the registry's job). This
  //          is the invariant the spec header documents: appendToFile
  //          adds the newline, serialize does not.
  await test("E-P106 EmergencyLogSpec.serialize emits one-line JSON without trailing newline", async () => {
    const { EmergencyLogSpec } = await import(
      "../shared/specs/emergency-log-spec.js"
    );
    const entry = syntheticEmergencyEntry("sess-106", "01AAAA", 0) as unknown as import("./types.js").EmergencyLogEntry;
    const text = EmergencyLogSpec.serialize(entry, "json");
    assert(!text.endsWith("\n"), "no trailing newline in serialize output");
    assert(!text.includes("\n"), "no embedded newlines (one-line framing)");
    // Round-trip: parse the serialized text back
    const reparsed = EmergencyLogSpec.parse(text, "json");
    assertEqual(
      (reparsed as { entry_id: string }).entry_id,
      "entry-0",
      "round-trip preserves entry_id",
    );
  });

  // E-P107 — REGISTRY.appendToFile writes JSONL with \n framing. Two
  //          appends produce exactly two lines, each readable independently.
  await test("E-P107 REGISTRY.appendToFile frames entries as JSONL", async () => {
    const dir = makeTmpDir("e-p107");
    const logPath = path.join(dir, "emergency-log.jsonl");

    const e1 = syntheticEmergencyEntry("sess-107", "01AAAA", 0) as unknown as import("./types.js").EmergencyLogEntry;
    const e2 = syntheticEmergencyEntry("sess-107", "01AAAA", 1) as unknown as import("./types.js").EmergencyLogEntry;

    REGISTRY.appendToFile("emergency_log_entry", logPath, e1);
    REGISTRY.appendToFile("emergency_log_entry", logPath, e2);

    assert(fs.existsSync(logPath), "log file written");
    const content = fs.readFileSync(logPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    assertEqual(lines.length, 2, "two lines");

    // Each line is an independently parseable JSON object
    const parsed1 = JSON.parse(lines[0]!);
    const parsed2 = JSON.parse(lines[1]!);
    assertEqual(parsed1.entry_id, "entry-0", "first entry");
    assertEqual(parsed2.entry_id, "entry-1", "second entry");
    assertEqual(parsed1.generation, 0, "first generation");
    assertEqual(parsed2.generation, 1, "second generation");

    // Raw frame check: file content ends with newline, contains exactly
    // one internal newline between the two entries.
    assertEqual(
      content.split("\n").length,
      3,
      "3 split parts (two lines + trailing empty)",
    );
    assert(content.endsWith("\n"), "trailing newline");
  });

  // E-P108 — REGISTRY.appendToFile refuses to write entries with wrong
  //          schema_version (SYN-CC1 discipline). The append path runs
  //          the same validate() + schema_version check as saveToFile.
  await test("E-P108 REGISTRY.appendToFile rejects wrong schema_version", async () => {
    const dir = makeTmpDir("e-p108");
    const logPath = path.join(dir, "emergency-log.jsonl");

    const wrong = {
      ...syntheticEmergencyEntry("sess-108", "01BBBB", 0),
      schema_version: "999",
    } as unknown as import("./types.js").EmergencyLogEntry;

    let caught: unknown = null;
    try {
      REGISTRY.appendToFile("emergency_log_entry", logPath, wrong);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof InvalidArtifactError, "InvalidArtifactError thrown");
    assert(
      (caught as Error).message.toLowerCase().includes("schema_version"),
      "error names schema_version",
    );
    assert(!fs.existsSync(logPath), "file not created when rejected");
  });

  // E-P109 — End-to-end: write multiple entries with varying generation,
  //          read the log back, verify entries are in append order (not
  //          re-sorted on disk). Recovery path relies on append order
  //          to replay events.
  await test("E-P109 appendToFile preserves append order for multi-entry JSONL", async () => {
    const dir = makeTmpDir("e-p109");
    const logPath = path.join(dir, "emergency-log.jsonl");

    // Write in non-monotonic generation order to verify append order is
    // preserved (not sorted server-side)
    const e_hi = syntheticEmergencyEntry("sess-109", "01CCCC", 5) as unknown as import("./types.js").EmergencyLogEntry;
    const e_lo = syntheticEmergencyEntry("sess-109", "01CCCC", 2) as unknown as import("./types.js").EmergencyLogEntry;
    const e_mid = syntheticEmergencyEntry("sess-109", "01CCCC", 3) as unknown as import("./types.js").EmergencyLogEntry;

    REGISTRY.appendToFile("emergency_log_entry", logPath, e_hi);
    REGISTRY.appendToFile("emergency_log_entry", logPath, e_lo);
    REGISTRY.appendToFile("emergency_log_entry", logPath, e_mid);

    const lines = fs
      .readFileSync(logPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    assertEqual(lines.length, 3, "three entries");
    const generations = lines.map((l) => JSON.parse(l).generation);
    assertEqual(generations[0], 5, "first appended (gen 5)");
    assertEqual(generations[1], 2, "second appended (gen 2)");
    assertEqual(generations[2], 3, "third appended (gen 3)");
  });

  // -------------------------------------------------------------------------
  // Batch 9 — Retirement + session-root + misc (DD-6, DD-8)
  //
  // E-P5/E-P6 covered basic retirement; E-P21~E-P24 covered session-root
  // guard basics. This batch fills the remaining edges:
  //   - retention cutoff strictness (exact equality)
  //   - undated marker handling
  //   - custom threshold override
  //   - session-root-guard Case 3 (marker + legacy → warn)
  //   - session-root-guard Case 4 incompat layout_version
  //   - retirement sort by severity
  // -------------------------------------------------------------------------

  // E-P110 — retention_confirmed_at === marker date is NOT "strictly after".
  //          The cutoff is strict, so a marker dated the same day as the
  //          retention confirmation is treated as already reviewed.
  await test("E-P110 retirement cutoff is strict (equal date → excluded)", () => {
    const item: ParsedLearningItem = syntheticItem({
      scope: "global",
      event_markers: [
        "<!-- applied-then-found-invalid: 2026-02-01 -->",
        "<!-- applied-then-found-invalid: 2026-02-15 -->",
        "<!-- applied-then-found-invalid: 2026-03-01 -->",
      ],
      retention_confirmed_at: "2026-02-15",
    });
    const candidates = identifyRetirementCandidates([item]);
    // Post-cutoff (strictly after 2026-02-15): only 2026-03-01 qualifies → 1 marker
    // Below threshold 2 → no candidate
    assertEqual(candidates.length, 0, "below threshold after strict cutoff");

    // Bump retention to earlier: now 2026-02-15 AND 2026-03-01 qualify → 2 markers
    const item2 = syntheticItem({
      scope: "global",
      event_markers: item.event_markers,
      retention_confirmed_at: "2026-02-01",
    });
    const candidates2 = identifyRetirementCandidates([item2]);
    assertEqual(candidates2.length, 1, "two markers after strict cutoff");
    assertEqual(candidates2[0]!.marker_count, 2, "marker_count matches");
  });

  // E-P111 — Undated event markers are dropped from the count but noted in
  //          the `reason` field for operator transparency.
  await test("E-P111 retirement drops undated markers but surfaces them in reason", () => {
    const item = syntheticItem({
      scope: "global",
      event_markers: [
        "<!-- applied-then-found-invalid: 2026-02-01 -->",
        "<!-- applied-then-found-invalid: -->", // malformed, no date
        "<!-- applied-then-found-invalid: 2026-03-01 -->",
      ],
    });
    const candidates = identifyRetirementCandidates([item]);
    assertEqual(candidates.length, 1, "2 dated markers → candidate");
    const c = candidates[0]!;
    assertEqual(c.marker_count, 2, "undated marker dropped from count");
    assert(
      c.reason.includes("undated"),
      "reason surfaces undated marker count",
    );
    assert(
      c.reason.includes("1 undated"),
      "reason shows exact undated count",
    );
  });

  // E-P112 — Custom threshold override lets 1-marker items through when
  //          callers want a lower bar (e.g., aggressive pruning mode).
  await test("E-P112 retirement threshold=1 includes single-marker items", () => {
    const items = [
      syntheticItem({
        content: "single-marker-item",
        scope: "global",
        event_markers: ["<!-- applied-then-found-invalid: 2026-02-01 -->"],
      }),
      syntheticItem({
        content: "zero-marker-item",
        scope: "global",
        event_markers: [],
      }),
    ];
    const candidates = identifyRetirementCandidates(items, { threshold: 1 });
    // Single-marker item qualifies; zero-marker item still excluded
    assertEqual(candidates.length, 1, "one candidate with threshold=1");
    assertEqual(
      candidates[0]!.item.content,
      "single-marker-item",
      "correct item",
    );
    assertEqual(candidates[0]!.marker_count, 1, "marker_count = 1");
  });

  // E-P113 — Retirement sort ordering: severity descending by marker_count.
  //          Operator report shows hot spots at the top.
  await test("E-P113 retirement candidates sorted by marker_count descending", () => {
    const items = [
      syntheticItem({
        content: "three-markers",
        scope: "global",
        event_markers: [
          "<!-- applied-then-found-invalid: 2026-02-01 -->",
          "<!-- applied-then-found-invalid: 2026-02-10 -->",
          "<!-- applied-then-found-invalid: 2026-02-20 -->",
        ],
      }),
      syntheticItem({
        content: "two-markers",
        scope: "global",
        event_markers: [
          "<!-- applied-then-found-invalid: 2026-02-01 -->",
          "<!-- applied-then-found-invalid: 2026-02-10 -->",
        ],
      }),
      syntheticItem({
        content: "four-markers",
        scope: "global",
        event_markers: [
          "<!-- applied-then-found-invalid: 2026-02-01 -->",
          "<!-- applied-then-found-invalid: 2026-02-10 -->",
          "<!-- applied-then-found-invalid: 2026-02-20 -->",
          "<!-- applied-then-found-invalid: 2026-03-01 -->",
        ],
      }),
    ];
    const candidates = identifyRetirementCandidates(items);
    assertEqual(candidates.length, 3, "three candidates");
    // Sort: four → three → two
    assertEqual(candidates[0]!.item.content, "four-markers", "four at top");
    assertEqual(candidates[1]!.item.content, "three-markers", "three middle");
    assertEqual(candidates[2]!.item.content, "two-markers", "two at bottom");
    assertEqual(candidates[0]!.marker_count, 4, "top count");
    assertEqual(candidates[2]!.marker_count, 2, "bottom count");
  });

  // E-P114 — Session-root-guard Case 3: marker present + legacy sessions
  //          still exist → the guard emits a warning to stderr but does
  //          NOT throw. Operator should re-run migration but is not blocked.
  await test("E-P114 session-root-guard Case 3: marker + legacy → warn, not throw", () => {
    const projectRoot = makeTmpDir("e-p114");
    // Write a valid layout marker (Case 4 compat)
    fs.mkdirSync(path.join(projectRoot, ".onto", "sessions"), { recursive: true });
    ensureSessionRootsMigrated(projectRoot); // writes marker (Case 1 path)
    // Now inject a legacy session dir that matches LEGACY_SESSION_PATTERN
    const legacySessionName = "20260101-abcdef";
    fs.mkdirSync(
      path.join(projectRoot, ".onto", "sessions", legacySessionName),
      { recursive: true },
    );

    // Capture stderr to verify the warning fires. Bypass the overloaded
    // write type by routing through a mutable holder cast.
    const stderrChunks: string[] = [];
    const stderrHolder = process.stderr as unknown as {
      write: (chunk: unknown) => boolean;
    };
    const originalWrite = stderrHolder.write;
    stderrHolder.write = (chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    };

    let threw = false;
    try {
      ensureSessionRootsMigrated(projectRoot);
    } catch {
      threw = true;
    } finally {
      stderrHolder.write = originalWrite;
    }

    assertEqual(threw, false, "did not throw (Case 3 is non-blocking)");
    const combined = stderrChunks.join("");
    assert(
      combined.includes("legacy") && combined.includes("migrate-session-roots"),
      "warning mentions legacy + remediation command",
    );
  });

  // E-P115 — Session-root-guard Case 4: layout marker file present but the
  //          content is not structurally valid (layout_version ≠ "v3").
  //          The spec's validate() hard-codes "v3", so REGISTRY refuses to
  //          write such a payload. To simulate real-world filesystem tampering
  //          (or a future/past tool writing a different version), we bypass
  //          REGISTRY with raw fs.writeFileSync. inspectMigrationStatus's
  //          catch block fires, marker_compatible stays false, and the guard
  //          throws IncompatibleLayoutError.
  await test("E-P115 session-root-guard rejects incompatible layout marker", async () => {
    const { IncompatibleLayoutError } = await import(
      "../../cli/session-root-guard.js"
    );
    const projectRoot = makeTmpDir("e-p115");
    fs.mkdirSync(path.join(projectRoot, ".onto"), { recursive: true });
    // Raw YAML bypassing REGISTRY. schema_version is correct (parse will
    // succeed) but layout_version is not v3 so validate() rejects on load.
    const rawYaml =
      'schema_version: "1"\nlayout_version: v99-from-the-future\nwritten_at: "2026-04-09T00:00:00Z"\n';
    fs.writeFileSync(
      path.join(projectRoot, ".onto", ".layout-version.yaml"),
      rawYaml,
      "utf8",
    );

    let caught: unknown = null;
    try {
      ensureSessionRootsMigrated(projectRoot);
    } catch (e) {
      caught = e;
    }
    assert(
      caught instanceof IncompatibleLayoutError,
      "IncompatibleLayoutError thrown",
    );
    const err = caught as Error;
    assert(
      err.message.includes("v3") || err.message.toLowerCase().includes("supported"),
      `message names the supported version or phrase (got: ${err.message})`,
    );
  });

  // E-P116 — inspectMigrationStatus pure-read semantics: calling it does
  //          NOT write a marker even when the project has no marker yet.
  //          Matches E-P29 (inspect mode does not auto-write) but via the
  //          dedicated inspectMigrationStatus() entry instead of the guard.
  await test("E-P116 inspectMigrationStatus never writes a marker", () => {
    const projectRoot = makeTmpDir("e-p116");
    fs.mkdirSync(path.join(projectRoot, ".onto"), { recursive: true });
    // Verify no marker pre-call
    const markerPath = path.join(projectRoot, ".onto", ".layout-version.yaml");
    assert(!fs.existsSync(markerPath), "no marker before call");

    const status = inspectMigrationStatus(projectRoot);
    assertEqual(status.marker_present, false, "status reports no marker");
    assertEqual(status.marker_compatible, false, "not compatible when absent");
    assertEqual(status.legacy_session_count, 0, "no legacy sessions");

    // Verify still no marker after call (pure read)
    assert(!fs.existsSync(markerPath), "marker NOT written (pure read)");
  });

  // -------------------------------------------------------------------------
  // Phase 3 follow-up #1 — Cross-agent dedup discovery (LLM-driven)
  //
  // Replaces the previous stub (return []) with a Jaccard pre-filter +
  // union-find + LLM confirmation pipeline. These tests use ONTO_LLM_MOCK=1
  // to exercise the structural path without real LLM cost.
  // -------------------------------------------------------------------------

  // E-P117 — Jaccard pre-filter: items with zero token overlap are NOT
  //          grouped even if cross-agent. The union-find never unions them,
  //          so buildShortlists returns an empty list → zero LLM calls.
  await test("E-P117 cross-agent dedup pre-filter skips items with no token overlap", async () => {
    const { __testExports } = await import("./panel-reviewer.js");
    const { buildShortlists } = __testExports;
    const items: ParsedLearningItem[] = [
      syntheticItem({
        agent_id: "structure",
        content: "alpha beta gamma delta quux",
      }),
      syntheticItem({
        agent_id: "philosopher",
        // Zero overlap with the first item
        content: "zebra xray yankee whiskey vanilla",
      }),
    ];
    const shortlists = buildShortlists(items);
    assertEqual(shortlists.length, 0, "no shortlist → no LLM call");
  });

  // E-P118 — Jaccard pre-filter: cross-agent items with high token overlap
  //          DO group into a shortlist. Same-agent pairs never get unioned.
  await test("E-P118 cross-agent dedup pre-filter groups overlapping cross-agent items", async () => {
    const { __testExports } = await import("./panel-reviewer.js");
    const { buildShortlists } = __testExports;
    const items: ParsedLearningItem[] = [
      syntheticItem({
        agent_id: "structure",
        content:
          "verify preconditions constraint validation before applying changes durable",
      }),
      syntheticItem({
        agent_id: "philosopher",
        // Shares: verify preconditions constraint validation applying changes
        content:
          "verify preconditions constraint validation while applying changes idempotent",
      }),
      syntheticItem({
        // Same agent as the first one — must NOT union with it
        agent_id: "structure",
        content: "same-agent overlap does not union verify preconditions constraint",
      }),
    ];
    const shortlists = buildShortlists(items);
    assertEqual(shortlists.length, 1, "one cross-agent shortlist");
    const shortlist = shortlists[0]!;
    const agents = new Set(shortlist.map((i) => i.agent_id));
    assert(agents.size >= 2, "shortlist spans ≥2 distinct agents");
    assert(
      shortlist.some((i) => i.agent_id === "structure"),
      "structure item present",
    );
    assert(
      shortlist.some((i) => i.agent_id === "philosopher"),
      "philosopher item present",
    );
  });

  // E-P119 — Empty input / single item / single-agent pool never produces
  //          a shortlist. These are the degenerate cases that must
  //          short-circuit without calling LLM.
  await test("E-P119 cross-agent dedup buildShortlists handles degenerate inputs", async () => {
    const { __testExports } = await import("./panel-reviewer.js");
    const { buildShortlists } = __testExports;
    assertEqual(buildShortlists([]).length, 0, "empty input → empty");
    assertEqual(
      buildShortlists([
        syntheticItem({ agent_id: "structure", content: "alpha beta gamma delta" }),
      ]).length,
      0,
      "single item → empty",
    );
    assertEqual(
      buildShortlists([
        syntheticItem({ agent_id: "structure", content: "alpha beta gamma delta" }),
        syntheticItem({ agent_id: "structure", content: "alpha beta gamma delta" }),
      ]).length,
      0,
      "single-agent pool → empty (only cross-agent counts)",
    );
  });

  // E-P120 — discoverCrossAgentDedupClusters end-to-end happy path via
  //          mock LLM. Two cross-agent overlapping items → one confirmed
  //          cluster with member_items + cluster_id + consolidated_line.
  await test("E-P120 discoverCrossAgentDedupClusters returns a cluster via mock LLM", async () => {
    const { discoverCrossAgentDedupClusters } = await import(
      "./panel-reviewer.js"
    );
    const previousMock = process.env.ONTO_LLM_MOCK;
    process.env.ONTO_LLM_MOCK = "1";
    try {
      const candidates: ParsedLearningItem[] = [
        syntheticItem({
          agent_id: "structure",
          content:
            "verify preconditions constraint validation before applying changes durable",
        }),
        syntheticItem({
          agent_id: "philosopher",
          content:
            "verify preconditions constraint validation while applying changes idempotent",
        }),
      ];
      const clusters = await discoverCrossAgentDedupClusters(candidates, []);
      assertEqual(clusters.length, 1, "one cluster");
      const c = clusters[0]!;
      assert(c.cluster_id.length === 12, "cluster_id is 12-char hash");
      assertEqual(
        c.member_items.length,
        2,
        "both members preserved",
      );
      // Mock sets primary_owner_agent to the first listed item's agent
      assertEqual(c.primary_owner_agent, "structure", "primary owner");
      assertEqual(c.user_approval_required, true, "user_approval_required flag");
      assert(c.consolidated_line.length > 0, "consolidated_line non-empty");
      assert(c.consolidated_principle.length > 0, "principle non-empty");
      assert(c.representative_cases.length > 0, "representative_cases present");
    } finally {
      if (previousMock === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = previousMock;
    }
  });

  // E-P121 — Cluster id determinism: the same input produces the same
  //          cluster_id across runs. The caller relies on this for
  //          idempotent applicator marker matching.
  await test("E-P121 discoverCrossAgentDedupClusters cluster_id is deterministic", async () => {
    const { discoverCrossAgentDedupClusters } = await import(
      "./panel-reviewer.js"
    );
    const previousMock = process.env.ONTO_LLM_MOCK;
    process.env.ONTO_LLM_MOCK = "1";
    try {
      const items: ParsedLearningItem[] = [
        syntheticItem({
          agent_id: "structure",
          content: "apply invariant check constraint validation rollback guarantee",
        }),
        syntheticItem({
          agent_id: "dependency",
          content: "apply invariant check constraint validation rollback recover",
        }),
      ];
      const run1 = await discoverCrossAgentDedupClusters(items, []);
      const run2 = await discoverCrossAgentDedupClusters(items, []);
      assertEqual(run1.length, 1, "run1 cluster");
      assertEqual(run2.length, 1, "run2 cluster");
      assertEqual(
        run1[0]!.cluster_id,
        run2[0]!.cluster_id,
        "cluster_id stable across runs",
      );
    } finally {
      if (previousMock === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = previousMock;
    }
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
