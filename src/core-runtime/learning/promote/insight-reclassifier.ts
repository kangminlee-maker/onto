/**
 * Phase 3 — Insight Reclassifier (Step 12).
 *
 * Design authority:
 *   - learn-phase3-design-v2.md DD-9 (separate `onto reclassify-insights` command)
 *   - learn-phase3-design-v3.md DD-9 (collector mode + lineage)
 *   - learn-phase3-design-v4.md DD-9 (panel-reviewer reuse, batch-size,
 *     resumable progress)
 *
 * Purpose:
 *   - Phase 1 era left ~462 global learnings tagged `[insight]`. Insight is
 *     an under-classified label meaning "we don't know if this is a guardrail,
 *     foundation, or convention". This command walks each insight item, calls
 *     the LLM, and records a recommended reclassification.
 *
 * Why a separate command from `onto promote`:
 *   - Cost separation: 462 × 3 panel members ≈ 1,400 LLM calls. Running this
 *     on every promote pass would balloon cost.
 *   - Migration vs steady-state separation: this is a one-shot cleanup that
 *     ideally finishes once and never runs again. Promote is a recurring
 *     workflow.
 *   - Audit trail isolation: insights reclassified here are tracked
 *     independently of promote outcomes so a reclassification regret can be
 *     undone without rolling back unrelated promotions.
 *
 * Phase A (analysis) vs Phase B (apply) split mirrors promote:
 *   - This file currently implements analysis only. The result includes a
 *     "proposed_role" per insight item; an --apply flag in a follow-up wires
 *     the line edit through promote-executor's existing axis_tag_change path.
 *
 * Failure model:
 *   - LLM unreachable: item is left unclassified, recorded as
 *     `unclassified_pending`. The operator re-runs after fixing API access.
 *   - LLM returns unrecognized role: skipped with error in `unclassified_reasons`.
 *
 * Scope:
 *   - This implementation is intentionally compact for the Phase 3 MVP. It
 *     handles classification + serialization of results into a JSON report
 *     under the session root. Apply path (writing the new role tag back into
 *     the global file) is a TODO that piggybacks on Phase B's
 *     axis_tag_change applicator (Step 13).
 */

import fs from "node:fs";
import path from "node:path";

import { callLlm, hashPrompt } from "../shared/llm-caller.js";
import { collect } from "./collector.js";
import type {
  CollectionResult,
  LearningPurposeRole,
  ParsedLearningItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ReclassificationRole =
  | "guardrail"
  | "foundation"
  | "convention"
  | "drop_role"; // Operator may decide to remove the role tag entirely.

export interface InsightReclassification {
  agent_id: string;
  source_path: string;
  line_number: number;
  current_role: LearningPurposeRole;
  proposed_role: ReclassificationRole | null;
  reason: string;
  llm_model_id: string;
  llm_prompt_hash: string;
}

export interface InsightReclassifierResult {
  session_id: string;
  session_root: string;
  total_insights: number;
  reclassified: InsightReclassification[];
  unclassified_pending: { item: ParsedLearningItem; reason: string }[];
  llm_calls: number;
  dry_run: boolean;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RunInsightReclassifierConfig {
  sessionId: string;
  projectRoot: string;
  ontoHome?: string;
  /** Restrict the run to one agent's file. */
  targetAgent?: string;
  /** Stop after this many items (testing / batch control). */
  batchSize?: number;
  /** Plan only — do not write the report or apply role changes. */
  dryRun?: boolean;
  modelId?: string;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const RECLASSIFY_SYSTEM_PROMPT = `You are reclassifying [insight]-tagged learnings into one of three concrete role categories.

Output ONE JSON object:
{
  "proposed_role": "guardrail" | "foundation" | "convention" | "drop_role",
  "reason": "<one sentence explaining the choice>"
}

Definitions (learning-rules.md):
  - guardrail: situational warning with corrective action (Situation + Result + Corrective action)
  - foundation: reusable structural fact that other reasoning depends on
  - convention: formatting/naming/process rule the team follows
  - drop_role: the item is too vague or context-specific to fit any of the above —
    drop the role tag entirely

NO markdown fences, JSON only.`;

function buildReclassifyUserPrompt(item: ParsedLearningItem): string {
  return [
    `Agent: ${item.agent_id}`,
    `Tags: [${item.applicability_tags.join(" ")}]`,
    `Type: ${item.type}`,
    `Source: ${item.source_project ?? "?"} / ${item.source_domain ?? "?"} / ${item.source_date ?? "?"}`,
    "",
    "Content:",
    item.content,
    "",
    'Respond with {"proposed_role": "...", "reason": "..."}.',
  ].join("\n");
}

const VALID_ROLES: ReclassificationRole[] = [
  "guardrail",
  "foundation",
  "convention",
  "drop_role",
];

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function classifyOne(
  item: ParsedLearningItem,
  modelId: string | undefined,
): Promise<{
  ok: true;
  reclassification: InsightReclassification;
  llmCalls: number;
} | {
  ok: false;
  reason: string;
  llmCalls: number;
}> {
  const userPrompt = buildReclassifyUserPrompt(item);

  let llmText: string;
  let llmModelId: string;
  try {
    const result = await callLlm(RECLASSIFY_SYSTEM_PROMPT, userPrompt, {
      max_tokens: 512,
      ...(modelId ? { model_id: modelId } : {}),
    });
    llmText = result.text;
    llmModelId = result.model_id;
  } catch (error) {
    return {
      ok: false,
      reason: `LLM unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`,
      llmCalls: 1,
    };
  }

  let parsed: { proposed_role?: unknown; reason?: unknown };
  try {
    let cleaned = llmText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    parsed = JSON.parse(cleaned);
  } catch (error) {
    return {
      ok: false,
      reason: `malformed LLM JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
      llmCalls: 1,
    };
  }

  const role = parsed.proposed_role as ReclassificationRole;
  if (!VALID_ROLES.includes(role)) {
    return {
      ok: false,
      reason: `invalid proposed_role "${String(parsed.proposed_role)}"`,
      llmCalls: 1,
    };
  }

  return {
    ok: true,
    llmCalls: 1,
    reclassification: {
      agent_id: item.agent_id,
      source_path: item.source_path,
      line_number: item.line_number,
      current_role: item.role,
      proposed_role: role,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      llm_model_id: llmModelId,
      llm_prompt_hash: hashPrompt(RECLASSIFY_SYSTEM_PROMPT + "\n" + userPrompt),
    },
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Run the reclassifier in analyze mode.
 *
 * Output is written to `<sessionRoot>/insight-reclassification-report.json`
 * (unless dryRun). The follow-up apply path will read that file and route
 * each reclassification through Phase B's axis_tag_change applicator —
 * tracked as Step 13 work.
 */
export async function runInsightReclassifier(
  config: RunInsightReclassifierConfig,
): Promise<InsightReclassifierResult> {
  const sessionRoot = path.join(
    config.projectRoot,
    ".onto",
    "sessions",
    "reclassify-insights",
    config.sessionId,
  );
  fs.mkdirSync(sessionRoot, { recursive: true });

  // Use the collector in reclassify-insights mode so candidate_items is
  // pre-filtered to global insight items per DD-18 §SST.
  const collection: CollectionResult = collect({
    mode: "reclassify-insights",
    projectRoot: config.projectRoot,
  });

  let insights = collection.candidate_items;
  if (config.targetAgent) {
    insights = insights.filter((i) => i.agent_id === config.targetAgent);
  }
  if (config.batchSize !== undefined) {
    insights = insights.slice(0, config.batchSize);
  }

  const reclassified: InsightReclassification[] = [];
  const unclassified: { item: ParsedLearningItem; reason: string }[] = [];
  let llmCalls = 0;

  if (config.dryRun) {
    return {
      session_id: config.sessionId,
      session_root: sessionRoot,
      total_insights: insights.length,
      reclassified: [],
      unclassified_pending: [],
      llm_calls: 0,
      dry_run: true,
    };
  }

  for (const item of insights) {
    const r = await classifyOne(item, config.modelId);
    llmCalls += r.llmCalls;
    if (r.ok) {
      reclassified.push(r.reclassification);
    } else {
      unclassified.push({ item, reason: r.reason });
    }
  }

  const report = {
    session_id: config.sessionId,
    generated_at: new Date().toISOString(),
    total_insights: insights.length,
    reclassified,
    unclassified_pending: unclassified.map((u) => ({
      agent_id: u.item.agent_id,
      source_path: u.item.source_path,
      line_number: u.item.line_number,
      reason: u.reason,
    })),
    llm_calls: llmCalls,
  };
  const reportPath = path.join(sessionRoot, "insight-reclassification-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  // ontoHome is currently unused but kept on the config so a follow-up Step
  // 13 patch can wire it through to the global learning file path resolver
  // when the apply phase lands.
  void config.ontoHome;

  return {
    session_id: config.sessionId,
    session_root: sessionRoot,
    total_insights: insights.length,
    reclassified,
    unclassified_pending: unclassified,
    llm_calls: llmCalls,
    dry_run: false,
  };
}
