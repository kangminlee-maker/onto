/**
 * Phase 3: Step 1.5 Complexity Assessment — standalone LLM-based review mode selection.
 *
 * When `host_runtime` is standalone (no interactive host LLM session), the TS
 * process must decide `review_mode` (light vs full) and select relevant lenses
 * by calling `main_llm` directly.
 *
 * Two-step process:
 *   1. Q2/Q3 assessment: cheap triggers to decide whether light review is appropriate
 *   2. Lens selection: §7 Reverse Application to select relevant lenses (only if light)
 *
 * # When this is used
 *
 * - `host_runtime: standalone` AND `--review-mode` not explicitly set
 * - `host_runtime: standalone` AND `--review-mode light` AND `--lens-id` not set
 *
 * # When this is NOT used
 *
 * - `host_runtime: claude` or `codex` → host session handles Step 1.5 interactively
 * - `--review-mode full` explicitly set → no assessment needed (9 lenses)
 * - `--lens-id` explicitly set → user override, no assessment
 *
 * # LLM provider
 *
 * Uses `main_llm` config from `.onto/config.yml`. Falls back to `subagent_llm`
 * if `main_llm` is not set. Falls back to top-level `api_provider` / `model`.
 */

import type { OntoConfig } from "../discovery/config-chain.js";
import {
  callLlm,
  resolveLearningProviderConfig,
  type LlmCallConfig,
} from "../learning/shared/llm-caller.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComplexityAssessmentResult {
  suggestLight: boolean;
  q2Rationale: string;
  q3Rationale: string;
}

export interface LensSelectionResult {
  selectedLensIds: string[];
  rationale: string;
}

// ---------------------------------------------------------------------------
// LLM config resolution for main_llm
// ---------------------------------------------------------------------------

function resolveMainLlmConfig(ontoConfig: OntoConfig): Partial<LlmCallConfig> {
  const mainLlm = ontoConfig.main_llm;

  // Priority: main_llm > subagent_llm > top-level
  if (mainLlm?.provider) {
    const partial: Partial<LlmCallConfig> = {
      provider: mainLlm.provider as LlmCallConfig["provider"],
    };
    if (mainLlm.model) partial.model_id = mainLlm.model;
    if (mainLlm.base_url) partial.base_url = mainLlm.base_url;
    if (mainLlm.max_tokens) partial.max_tokens = mainLlm.max_tokens;
    return partial;
  }

  if (ontoConfig.subagent_llm?.provider) {
    const partial: Partial<LlmCallConfig> = {
      provider: ontoConfig.subagent_llm.provider as LlmCallConfig["provider"],
    };
    if (ontoConfig.subagent_llm.model) partial.model_id = ontoConfig.subagent_llm.model;
    if (ontoConfig.subagent_llm.base_url) partial.base_url = ontoConfig.subagent_llm.base_url;
    return partial;
  }

  // Fall back to top-level config (same as background tasks)
  return resolveLearningProviderConfig({ config: ontoConfig, cliOverrides: {} });
}

// ---------------------------------------------------------------------------
// Q2/Q3 Complexity Assessment
// ---------------------------------------------------------------------------

const COMPLEXITY_SYSTEM_PROMPT = `You are a review complexity assessor. You will be given a review target description and must answer two questions to determine whether a lightweight review (fewer lenses) is appropriate.

Answer in JSON format:
{
  "q2_cross_verification_secondary": true/false,
  "q2_rationale": "...",
  "q3_miss_risk_acceptable": true/false,
  "q3_rationale": "...",
  "suggest_light": true/false
}

Q2: Is cross-verification between multiple review dimensions secondary (not critical)?
- Cross-verification IS critical for: system-wide design changes, multi-file modifications, new concept introduction
- Cross-verification IS secondary for: single-perspective judgment, existing design modifications, documentation accuracy checks

Q3: Is the risk of missing a finding acceptable?
- Risk is HIGH for: pre-implementation final verification, safety mechanism design, changes affecting existing users
- Risk is LOW for: exploratory questions, early direction setting, internal documentation, post-review follow-up checks

suggest_light = true only if BOTH q2 AND q3 are true.`;

export async function assessComplexity(
  targetDescription: string,
  reviewIntent: string,
  ontoConfig: OntoConfig,
): Promise<ComplexityAssessmentResult> {
  const llmConfig = resolveMainLlmConfig(ontoConfig);

  const userPrompt = `Review target: ${targetDescription}\n\nReview intent: ${reviewIntent}\n\nAssess the complexity of this review target.`;

  const result = await callLlm(COMPLEXITY_SYSTEM_PROMPT, userPrompt, {
    ...llmConfig,
    max_tokens: llmConfig.max_tokens ?? 512,
  });

  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { suggestLight: false, q2Rationale: "JSON parse failed — defaulting to full", q3Rationale: "" };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      q2_cross_verification_secondary?: boolean;
      q2_rationale?: string;
      q3_miss_risk_acceptable?: boolean;
      q3_rationale?: string;
      suggest_light?: boolean;
    };

    return {
      suggestLight: parsed.suggest_light === true,
      q2Rationale: parsed.q2_rationale ?? "",
      q3Rationale: parsed.q3_rationale ?? "",
    };
  } catch {
    // Parse failure → default to full review (safe fallback)
    return { suggestLight: false, q2Rationale: "JSON parse failed — defaulting to full", q3Rationale: "" };
  }
}

// ---------------------------------------------------------------------------
// Lens Selection (§7 Reverse Application)
// ---------------------------------------------------------------------------

const LENS_SELECTION_SYSTEM_PROMPT = `You are a review lens selector. Given a review target, select which review lenses are most relevant.

Available lenses (select 2-4 from this list):
- logic: Logical consistency — contradictions, type conflicts, constraint clashes
- structure: Structural completeness — isolated elements, broken paths, missing relations
- dependency: Dependency integrity — circular, reverse, diamond dependencies
- semantics: Semantic accuracy — name-meaning alignment, synonyms/homonyms
- pragmatics: Pragmatic fitness — queryability, competency question testing
- evolution: Evolution fitness — breakage on new data/domain addition
- coverage: Domain coverage — missing subdomains, concept bias, gaps
- conciseness: Conciseness — duplicate definitions, over-specification
- axiology: Purpose and value alignment — purpose drift, value conflicts (ALWAYS INCLUDE)

Answer in JSON format:
{
  "selected_lens_ids": ["axiology", "logic", ...],
  "rationale": "..."
}

Rules:
- ALWAYS include "axiology" (purpose alignment is mandatory for every review)
- Select 2-4 lenses total (including axiology)
- Choose lenses whose verification dimension is most relevant to the target
- Prefer fewer lenses when the target is narrow in scope`;

export async function selectLenses(
  targetDescription: string,
  reviewIntent: string,
  ontoConfig: OntoConfig,
): Promise<LensSelectionResult> {
  const llmConfig = resolveMainLlmConfig(ontoConfig);

  const userPrompt = `Review target: ${targetDescription}\n\nReview intent: ${reviewIntent}\n\nSelect the most relevant review lenses.`;

  const result = await callLlm(LENS_SELECTION_SYSTEM_PROMPT, userPrompt, {
    ...llmConfig,
    max_tokens: llmConfig.max_tokens ?? 512,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { selectedLensIds: ["axiology", "logic", "pragmatics", "evolution"], rationale: "JSON parse failed — using default light set" };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      selected_lens_ids?: string[];
      rationale?: string;
    };

    const validLenses = ["logic", "structure", "dependency", "semantics", "pragmatics", "evolution", "coverage", "conciseness", "axiology"];
    const selectedIds = (parsed.selected_lens_ids ?? []).filter((id) => validLenses.includes(id));

    // Ensure axiology is always included
    if (!selectedIds.includes("axiology")) {
      selectedIds.push("axiology");
    }

    if (selectedIds.length < 2) {
      return { selectedLensIds: ["axiology", "logic", "pragmatics", "evolution"], rationale: "Too few valid lenses selected — using default light set" };
    }

    return {
      selectedLensIds: selectedIds,
      rationale: parsed.rationale ?? "",
    };
  } catch {
    return { selectedLensIds: ["axiology", "logic", "pragmatics", "evolution"], rationale: "JSON parse failed — using default light set" };
  }
}
