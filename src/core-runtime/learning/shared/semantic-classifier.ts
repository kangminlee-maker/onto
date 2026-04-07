/**
 * Semantic classifier — A-11 (Phase 2).
 *
 * LLM-based semantic classification of new learning items against existing items.
 * U4 해소: single decision enum + optional conflict_kind.
 * R4-IA1: LLM 실패 → unclassified_pending (저장 안 함).
 */

import { callLlm, hashPrompt, type LlmCallConfig } from "./llm-caller.js";

export type SemanticDecision =
  | "save"
  | "duplicate_skip"
  | "conflict_propose_replace"
  | "conflict_propose_keep"
  | "conflict_propose_coexist"
  | "unclassified_pending";

export type ConflictKind = "contradiction" | "supersession" | "disambiguation";

export interface SemanticClassificationResult {
  decision: SemanticDecision;
  conflict_kind?: ConflictKind;
  matched_existing_line?: string;
  reason: string;
  model_id: string;
  prompt_hash: string;
}

const SYSTEM_PROMPT = `You are a semantic classifier for a learning management system.
Given a NEW learning item and a list of EXISTING learning items, determine:

1. Is the new item semantically equivalent to any existing item? → "duplicate_skip"
2. Does the new item conflict with an existing item?
   - Contradiction (opposite claims) → "conflict_propose_replace"
   - Supersession (new item updates/replaces) → "conflict_propose_replace"
   - Disambiguation (both valid in different contexts) → "conflict_propose_coexist"
   - If unsure whether new or existing is better → "conflict_propose_keep"
3. No semantic overlap → "save"

Respond ONLY with valid JSON (no markdown fences):
{
  "decision": "<one of: save, duplicate_skip, conflict_propose_replace, conflict_propose_keep, conflict_propose_coexist>",
  "conflict_kind": "<one of: contradiction, supersession, disambiguation> or null",
  "matched_existing_line": "<the existing line that matches/conflicts, or null>",
  "reason": "<brief explanation>"
}`;

/**
 * Classify a new learning item against existing items.
 * A-11: LLM semantic classification.
 */
export async function classifyLearningItem(
  newLine: string,
  existingLines: string[],
  modelId?: string,
): Promise<SemanticClassificationResult> {
  if (existingLines.length === 0) {
    return {
      decision: "save",
      reason: "No existing items to compare against.",
      model_id: "none",
      prompt_hash: "none",
    };
  }

  const userPrompt = `NEW ITEM:
${newLine}

EXISTING ITEMS (${existingLines.length}):
${existingLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}`;

  const promptHash = hashPrompt(SYSTEM_PROMPT + userPrompt);

  try {
    const callConfig: Partial<LlmCallConfig> = { max_tokens: 512 };
    if (modelId) callConfig.model_id = modelId;
    const result = await callLlm(SYSTEM_PROMPT, userPrompt, callConfig);

    const parsed = JSON.parse(result.text.trim());
    const decision = parsed.decision as string;

    const validDecisions: SemanticDecision[] = [
      "save",
      "duplicate_skip",
      "conflict_propose_replace",
      "conflict_propose_keep",
      "conflict_propose_coexist",
    ];

    if (!validDecisions.includes(decision as SemanticDecision)) {
      return {
        decision: "unclassified_pending",
        reason: `Invalid decision from LLM: "${decision}"`,
        model_id: result.model_id,
        prompt_hash: promptHash,
      };
    }

    return {
      decision: decision as SemanticDecision,
      conflict_kind: parsed.conflict_kind ?? undefined,
      matched_existing_line: parsed.matched_existing_line ?? undefined,
      reason: parsed.reason ?? "",
      model_id: result.model_id,
      prompt_hash: promptHash,
    };
  } catch (error) {
    return {
      decision: "unclassified_pending",
      reason: `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
      model_id: modelId ?? "claude-sonnet-4-20250514",
      prompt_hash: promptHash,
    };
  }
}
