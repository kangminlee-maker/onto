/**
 * Phase 3 Promote — Phase B Orchestrator (Step 10b).
 *
 * Design authority:
 *   - learn-phase3-design-v9.md DD-15 (Phase B atomicity + dual failure modes)
 *   - learn-phase3-design-v9.md DD-22 (recovery context + canonical attempt selection)
 *   - learn-phase3-design-v9.md DD-23 (RecoveryResolution operator seat)
 *   - learn-phase3-design-v8.md DD-16 (recoverability checkpoint)
 *   - learn-phase3-design-v5.md §1.3 Phase B canonical sequence
 *   - processes/promote.md Step 6 (Promotion Execution)
 *
 * Responsibility:
 *   - Load PromoteReport + PromoteDecisions for a session.
 *   - Verify baseline freshness (DD-10) — abort with stale_baseline degraded
 *     state when files have shifted unless --force-stale.
 *   - Recovery: gather context, resolve truth, route manual_escalation to
 *     operator. When --resume, load prior ApplyExecutionState.
 *   - Create recoverability checkpoint (DD-16) before any mutation.
 *   - Initialize ApplyExecutionState (DD-15 + DD-22 attempt_id).
 *   - Apply approved decisions in order, persisting state on each step:
 *       1. promotions          (append to global file)
 *       2. contradiction_replacements (in-place line replace)
 *       3. axis_tag_changes    (in-place line edit)
 *       4. retirements         (delete or comment out)
 *       5. audit_outcomes      (modify/delete based on audit)
 *       6. obligation_waive    (audit-state transition)
 *       7. cross_agent_dedup_approvals (stub — TODO step 13)
 *       8. domain_doc_updates  (stub — TODO step 13)
 *   - Transition status: in_progress → completed | failed_resumable |
 *     apply_verification_failed.
 *   - Emergency log on state_persistence_failed (DD-15 dual failure).
 *
 * Scope boundary:
 *   - Domain doc LLM call is intentionally TODO for Step 13. Phase B currently
 *     accepts the approval but does not generate content; the report shows
 *     candidates only.
 *   - Cross-agent dedup application is TODO for the same reason.
 *
 * File-mutation contract:
 *   - All learning file edits are line-level operations against the .md
 *     storage. We use simple string-replace because the file format is one
 *     learning per line + optional `<!-- learning_id: ... -->` comment line.
 *   - Backups go through createRecoverabilityCheckpoint() before any edit
 *     so a single restore command can roll back the whole attempt.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { callLlm } from "../shared/llm-caller.js";
import { REGISTRY } from "../shared/artifact-registry.js";
import {
  loadAuditState,
  saveAuditState,
  findObligation,
  type AuditState,
} from "../shared/audit-state.js";
import {
  createRecoverabilityCheckpoint,
} from "../shared/recoverability.js";
import {
  gatherRecoveryContext,
  resolveRecoveryTruth,
  buildEscalationMessage,
  getSessionPromoteRoot,
  type RecoveryResolutionPolicy,
} from "../shared/recovery-context.js";
import { verifyBaselineHash } from "./collector.js";
import {
  generateUlid,
  initApplyState,
  loadApplyState,
  markApplied,
  markFailed,
  persistApplyState,
  transitionStatus,
} from "./apply-state.js";
import type {
  AppliedDecision,
  ApplyExecutionState,
  AuditOutcomeDecision,
  AxisTagChangeDecision,
  ContradictionReplacementDecision,
  CrossAgentDedupCluster,
  CrossAgentDedupDecision,
  DomainDocCandidate,
  PendingDecisionRef,
  PromoteDecisions,
  PromoteReport,
  PromotionDecision,
  RetirementDecision,
} from "./types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RunPromoteExecutorConfig {
  sessionId: string;
  projectRoot: string;
  /** Override `~/.onto/`. */
  ontoHome?: string;
  /** Override session root path. */
  sessionRoot?: string;
  /** Override audit-state path. */
  auditStatePath?: string;
  /** Resume a prior failed attempt. */
  resume?: boolean;
  /** Skip baseline freshness check (sets stale_baseline to warning only). */
  forceStale?: boolean;
  /** Recovery resolution policy override. Defaults to manual_escalation. */
  recoveryPolicy?: RecoveryResolutionPolicy;
  /** Dry run: prepare and verify but do not actually apply. */
  dryRun?: boolean;
  /** LLM model id override forwarded to domain-doc Phase B content generation. */
  modelId?: string;
}

export type RunPromoteExecutorOutcome =
  | {
      kind: "completed";
      state: ApplyExecutionState;
      statePath: string;
      summary: ExecutionSummary;
    }
  | {
      kind: "failed_resumable";
      state: ApplyExecutionState;
      statePath: string;
      summary: ExecutionSummary;
      reason: string;
    }
  | {
      kind: "stale_baseline";
      mismatches: ReturnType<typeof verifyBaselineHash>;
      message: string;
    }
  | {
      kind: "manual_escalation_required";
      message: string;
    }
  | {
      kind: "no_decisions";
      message: string;
    };

export interface ExecutionSummary {
  promotions_applied: number;
  contradiction_replacements_applied: number;
  axis_tag_changes_applied: number;
  retirements_applied: number;
  audit_outcomes_applied: number;
  obligations_waived: number;
  cross_agent_dedup_applied: number;
  domain_doc_updates_applied: number;
  failed_decisions: number;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function resolveSessionRoot(config: RunPromoteExecutorConfig): string {
  return (
    config.sessionRoot ?? getSessionPromoteRoot(config.projectRoot, config.sessionId)
  );
}

function resolveAuditStatePath(config: RunPromoteExecutorConfig): string {
  if (config.auditStatePath) return config.auditStatePath;
  const home = config.ontoHome ?? path.join(os.homedir(), ".onto");
  return path.join(home, "audit-state.yaml");
}

function getGlobalLearningFilePath(agentId: string, ontoHome?: string): string {
  const home = ontoHome ?? path.join(os.homedir(), ".onto");
  return path.join(home, "learnings", `${agentId}.md`);
}

function getProjectLearningFilePath(projectRoot: string, agentId: string): string {
  return path.join(projectRoot, ".onto", "learnings", `${agentId}.md`);
}

// ---------------------------------------------------------------------------
// Decision applicators (per-kind file mutators)
// ---------------------------------------------------------------------------

function decisionId(kind: string, identity: string): string {
  // Stable string id derived from per-decision identity. Used by
  // markApplied/markFailed to track pending → applied/failed transitions.
  return `${kind}::${identity}`;
}

function ensureFileExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "<!-- format_version: 1 -->\n", "utf8");
  }
}

/**
 * Append a learning line + learning_id comment to the target file.
 *
 * Phase 2 extractor pattern: line followed by `<!-- learning_id: <hash> -->`
 * marker on the next line so future runs can dedup against the durable id.
 */
function appendLearningLine(
  filePath: string,
  line: string,
  learningId: string,
): void {
  ensureFileExists(filePath);
  const block = `${line}\n<!-- learning_id: ${learningId} taxonomy_version: phase3-promoted -->\n`;
  fs.appendFileSync(filePath, block, "utf8");
}

/**
 * Replace the first line in the file that matches `existingLine` with
 * `newLine`. Returns true on success, false when no match was found.
 *
 * Used by contradiction_replacement and axis_tag_change.
 */
function replaceLineInFile(
  filePath: string,
  existingLine: string,
  newLine: string,
): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === existingLine) {
      lines[i] = newLine;
      fs.writeFileSync(filePath, lines.join("\n"), "utf8");
      return true;
    }
  }
  return false;
}

/**
 * Comment out a line by replacing it with `<!-- retired ({date}): {original} -->`.
 *
 * promote.md §6 says project entries are tagged `(-> promoted to global, ...)`
 * and not deleted. Retirement of GLOBAL entries follows a similar
 * preserve-as-comment pattern so the audit trail survives.
 */
function commentOutLine(filePath: string, existingLine: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const date = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === existingLine) {
      lines[i] = `<!-- retired (${date}): ${existingLine} -->`;
      fs.writeFileSync(filePath, lines.join("\n"), "utf8");
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Per-decision-kind applicators
// ---------------------------------------------------------------------------

interface ApplyContext {
  projectRoot: string;
  ontoHome?: string;
  state: ApplyExecutionState;
  sessionRoot: string;
  /** Mutable count tally — bumped per applicator. */
  summary: ExecutionSummary;
}

/**
 * Apply a single approved promotion. Promotes the project line to the global
 * file under the same agent_id. The original project entry is annotated with
 * `(-> promoted to global, <date>)` per promote.md §6.
 */
function applyPromotion(
  decision: PromotionDecision,
  ctx: ApplyContext,
): void {
  if (!decision.approve) return;

  const id = decisionId("promotion", `${decision.candidate_agent_id}|${decision.candidate_line}`);

  try {
    const globalPath = getGlobalLearningFilePath(
      decision.candidate_agent_id,
      ctx.ontoHome,
    );
    const learningId = hashLine(decision.candidate_line);

    // Append to global. The line itself is the canonical §1.3 form already
    // (collector parsed it as a ParsedLearningItem and the operator approved
    // the literal text).
    appendLearningLine(globalPath, decision.candidate_line, learningId);

    // Annotate the project file: mark the source line as "promoted to global".
    const projectPath = getProjectLearningFilePath(
      ctx.projectRoot,
      decision.candidate_agent_id,
    );
    annotateProjectLine(projectPath, decision.candidate_line);

    ctx.state = markApplied(ctx.state, {
      decision_kind: "promotion",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: globalPath,
      result_summary: `appended to ${path.basename(globalPath)}`,
    });
    ctx.summary.promotions_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "promotion",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

function annotateProjectLine(filePath: string, line: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const date = new Date().toISOString().slice(0, 10);
  const annotation = ` (-> promoted to global, ${date})`;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === line && !lines[i]!.includes("promoted to global")) {
      lines[i] = lines[i] + annotation;
      fs.writeFileSync(filePath, lines.join("\n"), "utf8");
      return;
    }
  }
}

function applyContradictionReplacement(
  decision: ContradictionReplacementDecision,
  ctx: ApplyContext,
): void {
  if (!decision.approve) return;
  const id = decisionId(
    "contradiction_replacement",
    `${decision.agent_id}|${decision.existing_line}`,
  );
  try {
    const globalPath = getGlobalLearningFilePath(decision.agent_id, ctx.ontoHome);
    // Preserve the replaced entry as a comment for audit trail.
    const date = new Date().toISOString().slice(0, 10);
    const preservedLine = `<!-- replaced (${date}): ${decision.existing_line} -->`;
    const ok =
      replaceLineInFile(globalPath, decision.existing_line, preservedLine) &&
      (() => {
        const learningId = hashLine(decision.new_line);
        appendLearningLine(globalPath, decision.new_line, learningId);
        return true;
      })();
    if (!ok) {
      throw new Error(`existing line not found in ${globalPath}`);
    }
    ctx.state = markApplied(ctx.state, {
      decision_kind: "contradiction_replacement",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: globalPath,
      result_summary: `replaced 1 line in ${path.basename(globalPath)}`,
    });
    ctx.summary.contradiction_replacements_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "contradiction_replacement",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

function applyAxisTagChange(
  decision: AxisTagChangeDecision,
  ctx: ApplyContext,
): void {
  if (!decision.approve) return;
  const id = decisionId("axis_tag_change", `${decision.agent_id}|${decision.original_line}`);
  try {
    const globalPath = getGlobalLearningFilePath(decision.agent_id, ctx.ontoHome);
    const ok = replaceLineInFile(
      globalPath,
      decision.original_line,
      decision.new_line,
    );
    if (!ok) throw new Error(`original line not found in ${globalPath}`);
    ctx.state = markApplied(ctx.state, {
      decision_kind: "axis_tag_change",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: globalPath,
      result_summary: `axis tags updated in ${path.basename(globalPath)}`,
    });
    ctx.summary.axis_tag_changes_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "axis_tag_change",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

function applyRetirement(
  decision: RetirementDecision,
  ctx: ApplyContext,
  auditState: AuditState,
): void {
  const id = decisionId("retirement", `${decision.agent_id}|${decision.line_excerpt}`);
  if (!decision.approve_retire) {
    // retention_confirmed: append <!-- retention-confirmed: <date> --> after
    // the matching line so future passes know this item was reviewed.
    try {
      const globalPath = getGlobalLearningFilePath(decision.agent_id, ctx.ontoHome);
      const date = new Date().toISOString().slice(0, 10);
      const ok = insertCommentAfter(
        globalPath,
        decision.line_excerpt,
        `<!-- retention-confirmed: ${date} -->`,
      );
      if (!ok) throw new Error(`line not found in ${globalPath}`);
      ctx.state = markApplied(ctx.state, {
        decision_kind: "retirement",
        decision_id: id,
        applied_at: new Date().toISOString(),
        target_path: globalPath,
        result_summary: `retention confirmed in ${path.basename(globalPath)}`,
      });
    } catch (error) {
      ctx.state = markFailed(ctx.state, {
        decision_kind: "retirement",
        decision_id: id,
        attempted_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
        resumable: true,
      });
      ctx.summary.failed_decisions += 1;
    }
    return;
  }

  try {
    const globalPath = getGlobalLearningFilePath(decision.agent_id, ctx.ontoHome);
    const ok = commentOutLine(globalPath, decision.line_excerpt);
    if (!ok) throw new Error(`line not found in ${globalPath}`);
    ctx.state = markApplied(ctx.state, {
      decision_kind: "retirement",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: globalPath,
      result_summary: `retired in ${path.basename(globalPath)}`,
    });
    ctx.summary.retirements_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "retirement",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
  // auditState parameter unused for retirement; reserved for future
  // event-marker side-effects (touching obligations linked to retired items).
  void auditState;
}

function insertCommentAfter(
  filePath: string,
  matchLine: string,
  comment: string,
): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === matchLine) {
      lines.splice(i + 1, 0, comment);
      fs.writeFileSync(filePath, lines.join("\n"), "utf8");
      return true;
    }
  }
  return false;
}

function applyAuditOutcome(
  decision: AuditOutcomeDecision,
  ctx: ApplyContext,
): void {
  const id = decisionId(
    "audit_outcome",
    `${decision.agent_id}|${decision.line_excerpt}`,
  );
  try {
    const globalPath = getGlobalLearningFilePath(decision.agent_id, ctx.ontoHome);
    if (decision.decision === "delete") {
      const ok = commentOutLine(globalPath, decision.line_excerpt);
      if (!ok) throw new Error(`line not found in ${globalPath}`);
    } else if (decision.decision === "modify") {
      if (!decision.modified_content) {
        throw new Error(`audit_outcome modify requires modified_content`);
      }
      const ok = replaceLineInFile(
        globalPath,
        decision.line_excerpt,
        decision.modified_content,
      );
      if (!ok) throw new Error(`line not found in ${globalPath}`);
    }
    // retain: no-op
    ctx.state = markApplied(ctx.state, {
      decision_kind: "audit_outcome",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: globalPath,
      result_summary: `audit outcome (${decision.decision}) applied`,
    });
    ctx.summary.audit_outcomes_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "audit_outcome",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

/**
 * Apply an approved cross-agent dedup cluster (criterion 6).
 *
 * The cluster's primary_owner_agent receives the consolidated_line via the
 * normal append path. Every member item NOT owned by the primary owner is
 * replaced in-place with a `<!-- consolidated into: cluster_id -->` marker
 * so the audit trail survives — promote.md §6 explicitly says retirement-
 * style operations should preserve content as comments.
 *
 * The decision shape only carries cluster_id + approve. The full cluster
 * data (member items, primary owner, consolidated text) lives in
 * PromoteReport.cross_agent_dedup_clusters; the caller passes the matching
 * cluster in via the third arg so the applicator stays a pure function of
 * its inputs.
 */
function applyCrossAgentDedup(
  decision: CrossAgentDedupDecision,
  cluster: CrossAgentDedupCluster,
  ctx: ApplyContext,
): void {
  if (!decision.approve) return;
  const id = decisionId("cross_agent_dedup", decision.cluster_id);
  try {
    // 1. Append consolidated entry to the primary owner's global file.
    const primaryPath = getGlobalLearningFilePath(
      cluster.primary_owner_agent,
      ctx.ontoHome,
    );
    const learningId = hashLine(cluster.consolidated_line);
    appendLearningLine(primaryPath, cluster.consolidated_line, learningId);

    // 2. For each member item NOT owned by the primary, replace its line
    //    with a consolidation marker. We keep the original text inside the
    //    comment so the operator can recover it manually if needed.
    let consolidatedCount = 0;
    for (const member of cluster.member_items) {
      if (member.agent_id === cluster.primary_owner_agent) continue;
      const memberPath = getGlobalLearningFilePath(
        member.agent_id,
        ctx.ontoHome,
      );
      const date = new Date().toISOString().slice(0, 10);
      const marker = `<!-- consolidated (${date}) into ${decision.cluster_id}: ${member.raw_line} -->`;
      const ok = replaceLineInFile(memberPath, member.raw_line, marker);
      if (ok) consolidatedCount += 1;
    }

    ctx.state = markApplied(ctx.state, {
      decision_kind: "cross_agent_dedup",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: primaryPath,
      result_summary:
        `consolidated to ${path.basename(primaryPath)}; ` +
        `${consolidatedCount} member entries marked`,
    });
    ctx.summary.cross_agent_dedup_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "cross_agent_dedup",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

// ---------------------------------------------------------------------------
// Domain doc update — DD-19 Phase B
// ---------------------------------------------------------------------------

const DOMAIN_DOC_SYSTEM_PROMPT = `You are updating a domain document with a newly promoted learning.

Output ONE JSON object:
{
  "reflection_form": "add_term" | "modify_definition" | "add_question" | "modify_question" | "add_sub_area" | "modify_scope" | "add_standard",
  "content": "<the markdown block to insert into the document — 1-5 lines, no fences>"
}

Reflection form selection by target document:
  - concepts.md → "add_term" | "modify_definition"
  - competency_qs.md → "add_question" | "modify_question"
  - domain_scope.md → "add_sub_area" | "modify_scope" | "add_standard"

Respond ONLY with valid JSON (no markdown fences).`;

function buildDomainDocUserPrompt(candidate: DomainDocCandidate): string {
  return [
    `Target document: ${candidate.target_doc}`,
    `Domain: ${candidate.domain}`,
    `Originating agent: ${candidate.agent_id}`,
    "",
    "Promoted learning:",
    candidate.candidate_summary,
    "",
    `Generate a JSON object with reflection_form (matching the target doc) and content (the markdown block).`,
  ].join("\n");
}

function getDomainDocPath(
  domain: string,
  targetDoc: DomainDocCandidate["target_doc"],
  ontoHome?: string,
): string {
  const home = ontoHome ?? path.join(os.homedir(), ".onto");
  return path.join(home, "domains", domain, targetDoc);
}

interface DomainDocLlmResult {
  reflection_form: string;
  content: string;
  llm_model_id: string;
}

async function callDomainDocLlm(
  candidate: DomainDocCandidate,
  modelId?: string,
): Promise<DomainDocLlmResult> {
  const userPrompt = buildDomainDocUserPrompt(candidate);
  const result = await callLlm(DOMAIN_DOC_SYSTEM_PROMPT, userPrompt, {
    max_tokens: 1024,
    ...(modelId ? { model_id: modelId } : {}),
  });

  let cleaned = result.text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const parsed = JSON.parse(cleaned) as {
    reflection_form?: unknown;
    content?: unknown;
  };
  if (
    typeof parsed.reflection_form !== "string" ||
    typeof parsed.content !== "string" ||
    parsed.content.length === 0
  ) {
    throw new Error(
      `domain doc LLM returned invalid shape: reflection_form=${typeof parsed.reflection_form}, content=${typeof parsed.content}`,
    );
  }
  return {
    reflection_form: parsed.reflection_form,
    content: parsed.content,
    llm_model_id: result.model_id,
  };
}

/**
 * Apply an approved domain doc update.
 *
 * Phase B contract:
 *   1. Look up the approved DomainDocCandidate (by slot_id + instance_id).
 *      Lookup happens in the caller; this function receives the candidate.
 *   2. Call the LLM to generate reflection_form + content.
 *   3. Append the content under a generated heading at
 *      `~/.onto/domains/{domain}/{target_doc}` (creating the file if absent).
 *
 * The slot_id is included in a comment so subsequent runs can detect that
 * this slot has already been written and skip duplicate insertions. We
 * intentionally append rather than replace because domain docs grow
 * incrementally and overwrite would lose prior content.
 */
async function applyDomainDocUpdate(
  candidate: DomainDocCandidate,
  ctx: ApplyContext,
  modelId?: string,
): Promise<void> {
  const id = decisionId(
    "domain_doc_update",
    `${candidate.slot_id}|${candidate.instance_id}`,
  );
  try {
    const docPath = getDomainDocPath(
      candidate.domain,
      candidate.target_doc,
      ctx.ontoHome,
    );

    // Skip if this slot was already written by an earlier attempt.
    if (fs.existsSync(docPath)) {
      const existing = fs.readFileSync(docPath, "utf8");
      if (existing.includes(`<!-- slot_id: ${candidate.slot_id} -->`)) {
        ctx.state = markApplied(ctx.state, {
          decision_kind: "domain_doc_update",
          decision_id: id,
          applied_at: new Date().toISOString(),
          target_path: docPath,
          result_summary: `slot ${candidate.slot_id} already present, skipped`,
        });
        ctx.summary.domain_doc_updates_applied += 1;
        return;
      }
    }

    const llmResult = await callDomainDocLlm(candidate, modelId);

    // Build the appended block. Each entry is wrapped in slot/instance
    // markers so future regeneration can detect it.
    const date = new Date().toISOString().slice(0, 10);
    const block = [
      "",
      `<!-- slot_id: ${candidate.slot_id} -->`,
      `<!-- instance_id: ${candidate.instance_id} -->`,
      `<!-- reflection_form: ${llmResult.reflection_form} | source_promotion: ${candidate.approved_promotion_id} | added: ${date} -->`,
      llmResult.content.trim(),
      "",
    ].join("\n");

    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    if (!fs.existsSync(docPath)) {
      fs.writeFileSync(
        docPath,
        `# ${candidate.target_doc.replace(".md", "")} — ${candidate.domain}\n`,
        "utf8",
      );
    }
    fs.appendFileSync(docPath, block, "utf8");

    ctx.state = markApplied(ctx.state, {
      decision_kind: "domain_doc_update",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: docPath,
      result_summary:
        `appended ${llmResult.reflection_form} block to ${candidate.target_doc} (model=${llmResult.llm_model_id})`,
    });
    ctx.summary.domain_doc_updates_applied += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "domain_doc_update",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      // LLM call failures are resumable (network blip), but JSON parse
      // failures are not (the model can't generate valid JSON for this
      // candidate without prompt changes). We mark as resumable so the
      // operator can re-run; the next attempt may use a different model.
      resumable: true,
    });
    ctx.summary.failed_decisions += 1;
  }
}

function applyObligationWaive(
  obligationId: string,
  reason: string,
  ctx: ApplyContext,
  auditState: AuditState,
  sessionId: string,
): void {
  const id = decisionId("obligation_waive", obligationId);
  try {
    const ob = findObligation(auditState, obligationId);
    if (!ob) throw new Error(`obligation ${obligationId} not found`);
    ob.transition("waived", reason, { session_id: sessionId });
    ctx.state = markApplied(ctx.state, {
      decision_kind: "obligation_waive",
      decision_id: id,
      applied_at: new Date().toISOString(),
      target_path: "audit-state.yaml",
      result_summary: `waived obligation ${obligationId}`,
    });
    ctx.summary.obligations_waived += 1;
  } catch (error) {
    ctx.state = markFailed(ctx.state, {
      decision_kind: "obligation_waive",
      decision_id: id,
      attempted_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      resumable: false,
    });
    ctx.summary.failed_decisions += 1;
  }
}

function hashLine(line: string): string {
  // Mirror Phase 2 generateLearningId pattern: 12-char sha256 prefix.
  return crypto.createHash("sha256").update(line).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------------------
// Pending decision enumeration
// ---------------------------------------------------------------------------

function enumeratePendingDecisions(
  decisions: PromoteDecisions,
): PendingDecisionRef[] {
  const refs: PendingDecisionRef[] = [];

  for (const d of decisions.promotions) {
    if (!d.approve) continue;
    refs.push({
      decision_kind: "promotion",
      decision_id: decisionId(
        "promotion",
        `${d.candidate_agent_id}|${d.candidate_line}`,
      ),
    });
  }
  for (const d of decisions.contradiction_replacements) {
    if (!d.approve) continue;
    refs.push({
      decision_kind: "contradiction_replacement",
      decision_id: decisionId(
        "contradiction_replacement",
        `${d.agent_id}|${d.existing_line}`,
      ),
    });
  }
  for (const d of decisions.axis_tag_changes) {
    if (!d.approve) continue;
    refs.push({
      decision_kind: "axis_tag_change",
      decision_id: decisionId("axis_tag_change", `${d.agent_id}|${d.original_line}`),
    });
  }
  for (const d of decisions.retirements) {
    refs.push({
      decision_kind: "retirement",
      decision_id: decisionId("retirement", `${d.agent_id}|${d.line_excerpt}`),
    });
  }
  for (const d of decisions.audit_outcomes) {
    refs.push({
      decision_kind: "audit_outcome",
      decision_id: decisionId("audit_outcome", `${d.agent_id}|${d.line_excerpt}`),
    });
  }
  for (const d of decisions.audit_obligations_waived) {
    refs.push({
      decision_kind: "obligation_waive",
      decision_id: decisionId("obligation_waive", d.obligation_id),
    });
  }
  for (const d of decisions.cross_agent_dedup_approvals) {
    if (!d.approve) continue;
    refs.push({
      decision_kind: "cross_agent_dedup",
      decision_id: decisionId("cross_agent_dedup", d.cluster_id),
    });
  }
  for (const d of decisions.domain_doc_updates) {
    if (!d.approve) continue;
    refs.push({
      decision_kind: "domain_doc_update",
      decision_id: decisionId(
        "domain_doc_update",
        `${d.slot_id}|${d.instance_id}`,
      ),
    });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runPromoteExecutor(
  config: RunPromoteExecutorConfig,
): Promise<RunPromoteExecutorOutcome> {
  const sessionRoot = resolveSessionRoot(config);
  const auditStatePath = resolveAuditStatePath(config);

  // -------------------------------------------------------------------------
  // Step 1: Load report + decisions
  // -------------------------------------------------------------------------
  const reportPath = path.join(sessionRoot, "promote-report.json");
  const decisionsPath = path.join(sessionRoot, "promote-decisions.json");

  const report = REGISTRY.loadFromFile<PromoteReport>(
    "promote_report",
    reportPath,
  );
  const decisions = REGISTRY.loadFromFile<PromoteDecisions>(
    "promote_decisions",
    decisionsPath,
  );

  // -------------------------------------------------------------------------
  // Step 2: Baseline freshness check (DD-10)
  // -------------------------------------------------------------------------
  const mismatches = verifyBaselineHash(report.collection.baseline_hash);
  if (mismatches.length > 0 && !config.forceStale) {
    return {
      kind: "stale_baseline",
      mismatches,
      message:
        `Baseline hash check failed for ${mismatches.length} file(s). ` +
        `Re-run 'onto promote' to regenerate the report or pass --force-stale ` +
        `to proceed (UNSAFE: source files have shifted since Phase A).`,
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: Recovery context (only on --resume)
  // -------------------------------------------------------------------------
  let priorState: ApplyExecutionState | null = null;
  if (config.resume) {
    const context = await gatherRecoveryContext(
      config.sessionId,
      config.projectRoot,
    );
    const truth = resolveRecoveryTruth(
      context,
      config.projectRoot,
      config.recoveryPolicy,
    );

    if (truth.kind === "manual_escalation_required") {
      return {
        kind: "manual_escalation_required",
        message: buildEscalationMessage(truth),
      };
    }
    if (truth.kind === "resolved" && truth.latest_source.kind === "apply_state") {
      priorState = truth.latest_source.state;
    }
    if (truth.kind === "no_recovery_data") {
      // Nothing to resume from. Treat as fresh attempt.
      priorState = null;
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Pending decision enumeration
  // -------------------------------------------------------------------------
  const pendingDecisions = enumeratePendingDecisions(decisions);
  if (pendingDecisions.length === 0) {
    return {
      kind: "no_decisions",
      message:
        "promote-decisions.json contains no approved decisions. Nothing to apply.",
    };
  }

  // -------------------------------------------------------------------------
  // Step 5: Recoverability checkpoint (DD-16)
  // -------------------------------------------------------------------------
  const attemptId = priorState?.attempt_id ?? generateUlid();
  const generation = priorState?.generation ?? 0;

  let checkpointPath: string | null = null;
  if (!config.dryRun) {
    const prep = await createRecoverabilityCheckpoint(
      config.sessionId,
      config.projectRoot,
      attemptId,
      generation,
    );
    if (prep.kind === "created" && prep.checkpoint) {
      checkpointPath = prep.checkpoint.manifest_path;
    }
  }

  // -------------------------------------------------------------------------
  // Step 6: Initialize / restore ApplyExecutionState
  // -------------------------------------------------------------------------
  let state =
    priorState ??
    initApplyState({
      sessionId: config.sessionId,
      attemptId,
      pendingDecisions,
      recoverabilityCheckpointPath: checkpointPath,
    });

  // Resume edge case: prior state may have already-applied decisions. Filter
  // pending list against applied/failed so we don't double-apply.
  if (priorState) {
    const alreadyHandled = new Set([
      ...priorState.applied_decisions.map(
        (d) => `${d.decision_kind}:${d.decision_id}`,
      ),
      ...priorState.failed_decisions.map(
        (d) => `${d.decision_kind}:${d.decision_id}`,
      ),
    ]);
    state = {
      ...state,
      pending_decisions: pendingDecisions.filter(
        (p) => !alreadyHandled.has(`${p.decision_kind}:${p.decision_id}`),
      ),
    };
  }

  if (config.dryRun) {
    return {
      kind: "completed",
      state,
      statePath: path.join(sessionRoot, "promote-execution-result.json"),
      summary: emptySummary(),
    };
  }

  // -------------------------------------------------------------------------
  // Step 7: Apply approved decisions (each one persists state)
  // -------------------------------------------------------------------------
  const auditState = loadAuditState(auditStatePath);
  const summary: ExecutionSummary = emptySummary();
  const ctx: ApplyContext = {
    projectRoot: config.projectRoot,
    state,
    sessionRoot,
    summary,
    ...(config.ontoHome !== undefined ? { ontoHome: config.ontoHome } : {}),
  };

  try {
    for (const d of decisions.promotions) {
      applyPromotion(d, ctx);
      persistApplyState(sessionRoot, ctx.state);
    }
    for (const d of decisions.contradiction_replacements) {
      applyContradictionReplacement(d, ctx);
      persistApplyState(sessionRoot, ctx.state);
    }
    for (const d of decisions.axis_tag_changes) {
      applyAxisTagChange(d, ctx);
      persistApplyState(sessionRoot, ctx.state);
    }
    for (const d of decisions.retirements) {
      applyRetirement(d, ctx, auditState);
      persistApplyState(sessionRoot, ctx.state);
    }
    for (const d of decisions.audit_outcomes) {
      applyAuditOutcome(d, ctx);
      persistApplyState(sessionRoot, ctx.state);
    }
    for (const d of decisions.audit_obligations_waived) {
      applyObligationWaive(
        d.obligation_id,
        d.reason,
        ctx,
        auditState,
        config.sessionId,
      );
      persistApplyState(sessionRoot, ctx.state);
    }

    // Cross-agent dedup: look up the cluster from the report by cluster_id.
    const clusterById = new Map(
      report.cross_agent_dedup_clusters.map((c) => [c.cluster_id, c]),
    );
    for (const d of decisions.cross_agent_dedup_approvals) {
      if (!d.approve) continue;
      const cluster = clusterById.get(d.cluster_id);
      if (!cluster) {
        ctx.state = markFailed(ctx.state, {
          decision_kind: "cross_agent_dedup",
          decision_id: decisionId("cross_agent_dedup", d.cluster_id),
          attempted_at: new Date().toISOString(),
          error_message: `cluster_id ${d.cluster_id} not in report.cross_agent_dedup_clusters`,
          resumable: false,
        });
        ctx.summary.failed_decisions += 1;
        persistApplyState(sessionRoot, ctx.state);
        continue;
      }
      applyCrossAgentDedup(d, cluster, ctx);
      persistApplyState(sessionRoot, ctx.state);
    }

    // Domain doc updates: look up the candidate from the report by slot_id +
    // instance_id, then call the LLM to generate the content.
    const candidateBySlotInstance = new Map(
      report.domain_doc_candidates.map((c) => [
        `${c.slot_id}|${c.instance_id}`,
        c,
      ]),
    );
    for (const d of decisions.domain_doc_updates) {
      if (!d.approve) continue;
      const candidate = candidateBySlotInstance.get(
        `${d.slot_id}|${d.instance_id}`,
      );
      if (!candidate) {
        ctx.state = markFailed(ctx.state, {
          decision_kind: "domain_doc_update",
          decision_id: decisionId(
            "domain_doc_update",
            `${d.slot_id}|${d.instance_id}`,
          ),
          attempted_at: new Date().toISOString(),
          error_message: `domain doc candidate ${d.slot_id}|${d.instance_id} not in report.domain_doc_candidates`,
          resumable: false,
        });
        ctx.summary.failed_decisions += 1;
        persistApplyState(sessionRoot, ctx.state);
        continue;
      }
      await applyDomainDocUpdate(candidate, ctx, config.modelId);
      persistApplyState(sessionRoot, ctx.state);
    }
  } catch (error) {
    // Catastrophic mid-loop failure (e.g., file system error). Mark state as
    // failed_resumable and persist before propagating.
    ctx.state = transitionStatus(ctx.state, "failed_resumable");
    const statePath = persistApplyState(sessionRoot, ctx.state);
    return {
      kind: "failed_resumable",
      state: ctx.state,
      statePath,
      summary,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  // Persist mutated audit-state for obligation waives.
  saveAuditState(auditState, auditStatePath);

  // -------------------------------------------------------------------------
  // Step 8: Determine final status
  // -------------------------------------------------------------------------
  const finalStatus = summary.failed_decisions > 0 ? "failed_resumable" : "completed";
  ctx.state = transitionStatus(ctx.state, finalStatus);
  const statePath = persistApplyState(sessionRoot, ctx.state);

  if (finalStatus === "failed_resumable") {
    return {
      kind: "failed_resumable",
      state: ctx.state,
      statePath,
      summary,
      reason: `${summary.failed_decisions} decision(s) failed during apply`,
    };
  }

  return {
    kind: "completed",
    state: ctx.state,
    statePath,
    summary,
  };
}

function emptySummary(): ExecutionSummary {
  return {
    promotions_applied: 0,
    contradiction_replacements_applied: 0,
    axis_tag_changes_applied: 0,
    retirements_applied: 0,
    audit_outcomes_applied: 0,
    obligations_waived: 0,
    cross_agent_dedup_applied: 0,
    domain_doc_updates_applied: 0,
    failed_decisions: 0,
  };
}

// loadApplyState exported for CLI consumers needing to inspect state without
// running the executor (e.g., `onto promote --status <session-id>`).
export { loadApplyState };
