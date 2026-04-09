/**
 * Phase 3 Promote — Panel Reviewer (Step 8a).
 *
 * Design authority:
 *   - learn-phase3-design-v4.md DD-2 (3-agent panel composition + 축소 규칙)
 *   - learn-phase3-design-v5.md DD-7 (validator criteria 1~5)
 *   - learn-phase3-design-v4.md DD-7 (array validator signature)
 *   - learn-phase3-design-v4.md DD-12 (hard gate: valid_member_count < 2)
 *   - learn-phase3-design-v2.md DD-2 (per-member LLM call, API-based)
 *   - processes/promote.md Step 3 (criteria 1~6 definitions)
 *
 * Responsibility:
 *   - DD-2 Panel composition: originator + philosopher + auto_selected
 *     (축소 규칙: 관련 agent 부재 / 원본==auto_selected → 2-agent)
 *   - Per-member LLM call (1 batch for all candidates per member) via
 *     shared/llm-caller.ts. 1회 retry on validator failure.
 *   - DD-7 validator: criteria 1~5 array length + judgment coherence
 *     + duplicate_of coherence + consolidation_recommendation coherence
 *   - DD-12 hard gate: `consensus = panel_minimum_unmet` when valid
 *     member count drops below 2
 *   - Consensus aggregation: 3/3 / 2/3 / defer / reject / split
 *
 * Scope boundary:
 *   - Criteria 1~5 only. Criterion 6 (cross-agent dedup) is a separate
 *     single-agent sequential pass in a sibling helper.
 *   - Phase A (source-read-only). No mutation. No state persistence.
 *
 * Failure model:
 *   - LLM call failure → member becomes unreachable, consensus denominator
 *     shrinks dynamically. If every member is unreachable or
 *     contract_invalid → panel_minimum_unmet (DD-12).
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { callLlm, hashPrompt } from "../shared/llm-caller.js";
import type {
  CrossAgentDedupCluster,
  DegradedStateEntry,
  PanelConsensus,
  PanelCriterionJudgment,
  PanelMember,
  PanelMemberReview,
  PanelMemberRole,
  PanelVerdict,
  PanelVerdictKind,
  ParsedLearningItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Panel composition — DD-2
// ---------------------------------------------------------------------------

/**
 * Canonical philosopher agent id. Mirrors the philosopher learning file at
 * `~/.onto/learnings/philosopher.md` and the `philosopher` lens in the review
 * runtime. Exported so tests and higher-level helpers can reference it.
 */
export const PHILOSOPHER_AGENT_ID = "philosopher";

export interface PanelCompositionConfig {
  /** Override the home directory during tests. */
  ontoHome?: string;
  /**
   * When true, auto_selected member must not equal originator. When no
   * distinct auto_selected agent can be chosen the panel degrades to
   * 2-agent (originator + philosopher) per DD-2 축소 규칙.
   */
  allowAutoSelectedDegradation?: boolean;
}

/**
 * Enumerate known agent ids by listing `{ontoHome}/learnings/*.md`.
 *
 * The filename (without `.md`) is the agent id. We keep this derivation local
 * to panel-reviewer so the collector's own path handling is not spilled into
 * the public API — both modules agree on the `<home>/.onto/learnings/` layout
 * via shared/paths.ts conventions.
 */
function listKnownAgents(ontoHome?: string): string[] {
  const home = ontoHome ?? os.homedir();
  const dir = path.join(home, ".onto", "learnings");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .map((id) => (id.startsWith("onto_") ? id.slice(5) : id))
    .sort();
}

/**
 * Compose the 3-agent panel for a given candidate.
 *
 * DD-2 rules:
 *   1. Panel member 1: originator (candidate.agent_id)
 *   2. Panel member 2: philosopher (always)
 *   3. Panel member 3: auto_selected (first known agent that is neither
 *      originator nor philosopher). If none can be selected, degrade to
 *      2-agent.
 */
export function composePanel(
  candidate: ParsedLearningItem,
  config: PanelCompositionConfig = {},
): PanelMember[] {
  const members: PanelMember[] = [];

  members.push({
    agent_id: candidate.agent_id,
    role: "originator",
    reachable: true,
  });

  const philosopherSelf = candidate.agent_id === PHILOSOPHER_AGENT_ID;
  if (!philosopherSelf) {
    members.push({
      agent_id: PHILOSOPHER_AGENT_ID,
      role: "philosopher",
      reachable: true,
    });
  }

  // Auto-selected: first known agent that isn't originator or philosopher.
  const candidates = listKnownAgents(config.ontoHome).filter(
    (id) => id !== candidate.agent_id && id !== PHILOSOPHER_AGENT_ID,
  );
  if (candidates.length > 0) {
    members.push({
      agent_id: candidates[0]!,
      role: "auto_selected",
      reachable: true,
    });
  }
  // If no auto_selected agent exists we degrade gracefully to 2-agent.
  // If the originator IS philosopher we also naturally fall back.

  return members;
}

// ---------------------------------------------------------------------------
// Candidate identification
// ---------------------------------------------------------------------------

/**
 * Stable identifier for a panel candidate. Uses learning_id when present so
 * Phase 2-written items are addressable by their durable id. Falls back to a
 * short content hash for legacy items — the hash is stable across runs
 * because it's derived from raw_line only.
 */
export function candidateIdOf(item: ParsedLearningItem): string {
  if (item.learning_id) return item.learning_id;
  return crypto
    .createHash("sha256")
    .update(item.raw_line)
    .digest("hex")
    .slice(0, 12);
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const PANEL_SYSTEM_PROMPT_TEMPLATE = `You are reviewing promotion candidates for a learning management system as an expert in the role of {ROLE_AGENT_ID} ({ROLE_LABEL}).

Your task is to evaluate each candidate learning against 5 criteria AND recommend an axis tag adjustment. Output ONE JSON object per candidate in an "items" array. NO markdown fences, NO commentary, JSON only.

Criteria (processes/promote.md):
  1. Generalizability — is it valid across projects, or only in this project?
  2. Accuracy — is it based on facts or a coincidence from a unique situation?
  3. Contradiction handling — if it contradicts an existing global entry, which is more correct?
  4. Axis tag appropriateness — use the 2+1 stage test on the candidate's tags.
  5. Deduplication vs global — is this a domain variant of an existing principle?

For each candidate, return:
{
  "candidate_id": "<the id you were given>",
  "verdict": "promote" | "defer" | "reject",
  "criteria": [
    {"criterion": 1, "judgment": "yes" | "no" | "uncertain", "reasoning": "<one sentence>"},
    {"criterion": 2, "judgment": "yes" | "no" | "uncertain", "reasoning": "<one sentence>"},
    {"criterion": 3, "judgment": "yes" | "no" | "uncertain", "reasoning": "<one sentence>"},
    {"criterion": 4, "judgment": "yes" | "no" | "uncertain", "reasoning": "<one sentence>"},
    {"criterion": 5, "judgment": "yes" | "no" | "uncertain", "reasoning": "<one sentence>"}
  ],
  "axis_tag_recommendation": "retain" | "add_methodology" | "remove_methodology" | "modify" | "no_recommendation",
  "axis_tag_note": "<brief rationale>",
  "contradiction_resolution": "replace" | "defer" | "n/a",
  "reason": "<one-sentence summary of the verdict>"
}

Coherence rules (your output will be rejected if violated):
  - criteria array MUST contain exactly 5 entries, one per criterion 1..5
  - If every criterion 1..3 judgment is "yes" and criterion 4 is "yes"/"uncertain" and criterion 5 is "yes" (no duplicate), the verdict should be "promote"
  - If any criterion 1..3 judgment is "no", the verdict MUST NOT be "promote"
  - If criterion 5 judgment is "no" (is a duplicate of existing), the verdict MUST NOT be "promote" — recommend defer or reject
  - If you provide a consolidation recommendation (via reason), the verdict MUST NOT be "promote"
`;

const PANEL_USER_PROMPT_TEMPLATE = `Review the promotion candidates below against the existing global learnings and return ONE JSON object with an "items" array — one entry per candidate.

[Candidates] {CANDIDATE_COUNT}
{CANDIDATE_BLOCK}

[Existing Global Learnings] {GLOBAL_COUNT}
{GLOBAL_BLOCK}

Respond ONLY with valid JSON shaped as:
{"items":[{...}, {...}]}
`;

function formatCandidate(
  candidate: ParsedLearningItem,
  index: number,
): string {
  const id = candidateIdOf(candidate);
  const tags = candidate.applicability_tags.join(" ");
  const role = candidate.role ?? "<no-role>";
  return `${index + 1}. candidate_id=${id} type=${candidate.type} tags=[${tags}] role=${role} agent=${candidate.agent_id}\n   content: ${candidate.content}`;
}

function formatGlobal(item: ParsedLearningItem, index: number): string {
  const tags = item.applicability_tags.join(" ");
  const role = item.role ?? "<no-role>";
  return `${index + 1}. [${item.type}] tags=[${tags}] role=${role} agent=${item.agent_id}\n   content: ${item.content}`;
}

/**
 * Assemble the system + user prompt pair for a given panel member.
 *
 * Global items are truncated so the prompt stays under a safe LLM context.
 * The order is deterministic (by source_path + line_number) so the
 * prompt_hash is stable across runs.
 */
export interface PanelPromptConfig {
  member: PanelMember;
  candidates: ParsedLearningItem[];
  globalItems: ParsedLearningItem[];
  maxGlobalItems?: number;
  retryFeedback?: string[];
}

export interface BuiltPanelPrompt {
  system_prompt: string;
  user_prompt: string;
  prompt_hash: string;
}

export function buildPanelPrompt(config: PanelPromptConfig): BuiltPanelPrompt {
  const maxGlobal = config.maxGlobalItems ?? 80;

  const sortedGlobals = [...config.globalItems]
    .sort((a, b) => {
      const pathCmp = a.source_path.localeCompare(b.source_path);
      if (pathCmp !== 0) return pathCmp;
      return a.line_number - b.line_number;
    })
    .slice(0, maxGlobal);

  const candidateBlock = config.candidates
    .map((c, i) => formatCandidate(c, i))
    .join("\n");
  const globalBlock = sortedGlobals
    .map((g, i) => formatGlobal(g, i))
    .join("\n");

  let system_prompt = PANEL_SYSTEM_PROMPT_TEMPLATE.replace(
    "{ROLE_AGENT_ID}",
    config.member.agent_id,
  ).replace("{ROLE_LABEL}", config.member.role);

  if (config.retryFeedback && config.retryFeedback.length > 0) {
    system_prompt +=
      "\nPrevious attempt was rejected. Validator feedback:\n" +
      config.retryFeedback.map((f) => `  - ${f}`).join("\n") +
      "\nFix these issues and respond again.";
  }

  const user_prompt = PANEL_USER_PROMPT_TEMPLATE.replace(
    "{CANDIDATE_COUNT}",
    String(config.candidates.length),
  )
    .replace("{CANDIDATE_BLOCK}", candidateBlock || "(none)")
    .replace("{GLOBAL_COUNT}", String(sortedGlobals.length))
    .replace("{GLOBAL_BLOCK}", globalBlock || "(none)");

  return {
    system_prompt,
    user_prompt,
    prompt_hash: hashPrompt(system_prompt + "\n" + user_prompt),
  };
}

// ---------------------------------------------------------------------------
// LLM response parsing
// ---------------------------------------------------------------------------

interface RawItem {
  candidate_id?: unknown;
  verdict?: unknown;
  criteria?: unknown;
  axis_tag_recommendation?: unknown;
  axis_tag_note?: unknown;
  contradiction_resolution?: unknown;
  reason?: unknown;
}

/**
 * Extract the first JSON object from an LLM response string.
 *
 * Models sometimes wrap JSON in markdown fences despite instructions;
 * stripping triple backticks is enough in practice. If parsing fails we
 * surface the error — the caller decides whether to retry.
 */
function parsePanelJson(text: string): { items: RawItem[] } {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const parsed = JSON.parse(cleaned) as { items?: unknown };
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error(
      `panel response missing "items" array (got keys: ${Object.keys(parsed ?? {}).join(",")})`,
    );
  }
  return { items: parsed.items as RawItem[] };
}

// ---------------------------------------------------------------------------
// DD-7 validator — criteria 1~5 + coherence
// ---------------------------------------------------------------------------

export interface MemberReviewValidation {
  passed: boolean;
  failures: string[];
}

const VALID_VERDICTS: PanelVerdictKind[] = ["promote", "defer", "reject"];
const VALID_AXIS_RECOS: PanelMemberReview["axis_tag_recommendation"][] = [
  "retain",
  "add_methodology",
  "remove_methodology",
  "modify",
  "no_recommendation",
];

function validateCriteriaArray(
  criteria: PanelCriterionJudgment[],
): string[] {
  const failures: string[] = [];
  if (criteria.length !== 5) {
    failures.push(
      `criteria array length ${criteria.length}, expected exactly 5`,
    );
    return failures;
  }
  const seen = new Set<number>();
  for (const c of criteria) {
    if (c.criterion < 1 || c.criterion > 5) {
      failures.push(`criterion ${c.criterion} out of range 1..5`);
      continue;
    }
    if (seen.has(c.criterion)) {
      failures.push(`criterion ${c.criterion} repeated`);
      continue;
    }
    seen.add(c.criterion);
    if (!["yes", "no", "uncertain"].includes(c.judgment)) {
      failures.push(
        `criterion ${c.criterion}: invalid judgment "${c.judgment}"`,
      );
    }
  }
  for (let i = 1; i <= 5; i++) {
    if (!seen.has(i)) failures.push(`criterion ${i} missing`);
  }
  return failures;
}

/**
 * DD-7 per-member validator. Applies criteria array structural checks plus
 * judgment coherence checks (criteria 1~3 vs verdict, criterion 5 vs
 * verdict).
 */
export function validatePanelMemberReview(
  review: PanelMemberReview,
): MemberReviewValidation {
  const failures: string[] = [];

  if (!VALID_VERDICTS.includes(review.verdict)) {
    failures.push(`verdict "${review.verdict}" not in ${VALID_VERDICTS.join("|")}`);
  }
  if (!VALID_AXIS_RECOS.includes(review.axis_tag_recommendation)) {
    failures.push(
      `axis_tag_recommendation "${review.axis_tag_recommendation}" not valid`,
    );
  }

  failures.push(...validateCriteriaArray(review.criteria));
  if (failures.length > 0) {
    return { passed: false, failures };
  }

  // Criteria 1~5 vs verdict coherence (M-C fix: c4 is now in the all-yes
  // gate, matching the prompt at line 196 which says promote is required when
  // criteria 1..3 are yes AND criterion 4 is yes/uncertain AND criterion 5 is
  // yes. Without c4 in the check, the validator wrongly rejected coherent
  // responses like "c1-3 yes, c4 no, c5 yes, verdict defer" — the model
  // correctly avoided promoting an item with bad axis tags, but the validator
  // demanded promote anyway).
  const c = new Map(review.criteria.map((x) => [x.criterion, x.judgment]));
  const c1 = c.get(1);
  const c2 = c.get(2);
  const c3 = c.get(3);
  const c4 = c.get(4);
  const c5 = c.get(5);

  const c4PassesGate = c4 === "yes" || c4 === "uncertain";
  if (
    c1 === "yes" &&
    c2 === "yes" &&
    c3 === "yes" &&
    c4PassesGate &&
    c5 === "yes"
  ) {
    if (review.verdict !== "promote") {
      failures.push(
        "criteria 1,2,3 yes + c4 yes/uncertain + c5 yes but verdict is not promote",
      );
    }
  }
  if ((c1 === "no" || c2 === "no" || c3 === "no") && review.verdict === "promote") {
    failures.push("a criterion 1..3 judgment is no but verdict is promote");
  }
  if (c5 === "no" && review.verdict === "promote") {
    failures.push(
      "criterion 5 is no (duplicate of existing) but verdict is promote",
    );
  }

  return { passed: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Normalize raw LLM item → PanelMemberReview
// ---------------------------------------------------------------------------

interface NormalizeContext {
  member: PanelMember;
  candidateById: Map<string, ParsedLearningItem>;
  globalsByLine: Map<string, ParsedLearningItem>;
  llm_model_id: string;
  llm_prompt_hash: string;
}

/**
 * Convert a raw LLM item object into a typed PanelMemberReview. Returns null
 * when the raw object is structurally malformed — callers treat this as a
 * validator failure.
 */
function normalizeRawItem(
  raw: RawItem,
  ctx: NormalizeContext,
): { review: PanelMemberReview; candidate: ParsedLearningItem } | null {
  if (typeof raw.candidate_id !== "string") return null;
  const candidate = ctx.candidateById.get(raw.candidate_id);
  if (!candidate) return null;

  const verdict = raw.verdict as PanelVerdictKind;

  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria : [];
  const criteria: PanelCriterionJudgment[] = [];
  for (const r of rawCriteria) {
    const rr = r as Record<string, unknown>;
    const cnum = rr.criterion;
    if (typeof cnum !== "number") continue;
    if (cnum < 1 || cnum > 5) continue;
    const judgment = rr.judgment;
    if (judgment !== "yes" && judgment !== "no" && judgment !== "uncertain") {
      continue;
    }
    criteria.push({
      criterion: cnum as 1 | 2 | 3 | 4 | 5,
      judgment,
      reasoning: typeof rr.reasoning === "string" ? rr.reasoning : "",
    });
  }

  const review: PanelMemberReview = {
    member: ctx.member,
    verdict,
    criteria,
    axis_tag_recommendation:
      (raw.axis_tag_recommendation as PanelMemberReview["axis_tag_recommendation"]) ??
      "no_recommendation",
    axis_tag_note:
      typeof raw.axis_tag_note === "string" ? raw.axis_tag_note : "",
    reason: typeof raw.reason === "string" ? raw.reason : "",
    llm_model_id: ctx.llm_model_id,
    llm_prompt_hash: ctx.llm_prompt_hash,
  };

  if (
    raw.contradiction_resolution === "replace" ||
    raw.contradiction_resolution === "defer" ||
    raw.contradiction_resolution === "n/a"
  ) {
    review.contradiction_resolution = raw.contradiction_resolution;
  }

  return { review, candidate };
}

// ---------------------------------------------------------------------------
// Per-member LLM call with 1 retry
// ---------------------------------------------------------------------------

export interface PanelMemberCallResult {
  member: PanelMember;
  /** Per-candidate reviews in the same order as input candidates. Missing
   * candidates indicate contract failure for that slot. */
  reviews: Map<string, PanelMemberReview>;
  /** Validator failures across all items (flat). Empty when all passed. */
  failures: string[];
  /** "passed" | "retried_passed" | "contract_invalid" | "unreachable" */
  status:
    | "passed"
    | "retried_passed"
    | "contract_invalid"
    | "unreachable";
  unreachable_reason?: string;
}

interface CallPanelMemberConfig {
  member: PanelMember;
  candidates: ParsedLearningItem[];
  globalItems: ParsedLearningItem[];
  maxTokens?: number;
  modelId?: string;
  maxGlobalItems?: number;
}

export async function callPanelMember(
  config: CallPanelMemberConfig,
): Promise<PanelMemberCallResult> {
  const candidateById = new Map<string, ParsedLearningItem>(
    config.candidates.map((c) => [candidateIdOf(c), c]),
  );
  const globalsByLine = new Map<string, ParsedLearningItem>(
    config.globalItems.map((g) => [g.raw_line, g]),
  );

  const tryOnce = async (
    retryFeedback?: string[],
  ): Promise<PanelMemberCallResult> => {
    const promptCfg: PanelPromptConfig = {
      member: config.member,
      candidates: config.candidates,
      globalItems: config.globalItems,
    };
    if (config.maxGlobalItems !== undefined) {
      promptCfg.maxGlobalItems = config.maxGlobalItems;
    }
    if (retryFeedback !== undefined) {
      promptCfg.retryFeedback = retryFeedback;
    }
    const prompt = buildPanelPrompt(promptCfg);

    let llmText: string;
    let modelId: string;
    try {
      const result = await callLlm(prompt.system_prompt, prompt.user_prompt, {
        max_tokens: config.maxTokens ?? 4096,
        ...(config.modelId ? { model_id: config.modelId } : {}),
      });
      llmText = result.text;
      modelId = result.model_id;
    } catch (error) {
      return {
        member: { ...config.member, reachable: false },
        reviews: new Map(),
        failures: [],
        status: "unreachable",
        unreachable_reason:
          error instanceof Error ? error.message : String(error),
      };
    }

    let parsed: { items: RawItem[] };
    try {
      parsed = parsePanelJson(llmText);
    } catch (error) {
      return {
        member: config.member,
        reviews: new Map(),
        failures: [
          `panel response not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        status: "contract_invalid",
      };
    }

    const ctx: NormalizeContext = {
      member: config.member,
      candidateById,
      globalsByLine,
      llm_model_id: modelId,
      llm_prompt_hash: prompt.prompt_hash,
    };

    const reviews = new Map<string, PanelMemberReview>();
    const allFailures: string[] = [];

    for (const raw of parsed.items) {
      const normalized = normalizeRawItem(raw, ctx);
      if (!normalized) {
        allFailures.push(
          `item candidate_id=${String(raw.candidate_id)} could not be normalized (unknown id or malformed)`,
        );
        continue;
      }
      const validation = validatePanelMemberReview(normalized.review);
      if (!validation.passed) {
        const id = candidateIdOf(normalized.candidate);
        for (const f of validation.failures) {
          allFailures.push(`[${id}] ${f}`);
        }
        continue;
      }
      reviews.set(candidateIdOf(normalized.candidate), normalized.review);
    }

    // Missing candidates: LLM silently dropped some items
    for (const c of config.candidates) {
      const id = candidateIdOf(c);
      if (!reviews.has(id) && !allFailures.some((f) => f.includes(id))) {
        allFailures.push(`[${id}] no review returned for this candidate`);
      }
    }

    if (allFailures.length === 0) {
      return {
        member: config.member,
        reviews,
        failures: [],
        status: "passed",
      };
    }

    return {
      member: config.member,
      reviews,
      failures: allFailures,
      status: "contract_invalid",
    };
  };

  const first = await tryOnce();
  if (first.status === "passed" || first.status === "unreachable") {
    return first;
  }

  const second = await tryOnce(first.failures);
  if (second.status === "passed") {
    return {
      ...second,
      status: "retried_passed",
    };
  }
  return second;
}

// ---------------------------------------------------------------------------
// Consensus aggregation — DD-12 hard gate included
// ---------------------------------------------------------------------------

function tallyVerdicts(
  reviews: PanelMemberReview[],
): { promote: number; defer: number; reject: number } {
  const tally = { promote: 0, defer: 0, reject: 0 };
  for (const r of reviews) {
    tally[r.verdict] += 1;
  }
  return tally;
}

/**
 * DD-12 hard gate + DD-7 consensus mapping.
 *
 * Rules:
 *   - valid_member_count < 2 → panel_minimum_unmet (hard gate)
 *   - 3-agent panel + all promote → promote_3_3
 *   - 2-agent degraded panel + both promote → promote_2_3
 *     (m-1 fix: previously the n===2 unanimous case fell into the
 *     promote_3_3 branch because tally.promote === n. The label was
 *     misleading because there were only 2 members, not 3.)
 *   - strict majority promote (>= 2) → promote_2_3
 *   - strict majority defer (>= 2) → defer_majority
 *   - strict majority reject (>= 2) → reject_majority
 *   - otherwise → split
 */
export function aggregateConsensus(
  validReviews: PanelMemberReview[],
): PanelConsensus {
  if (validReviews.length < 2) return "panel_minimum_unmet";

  const tally = tallyVerdicts(validReviews);
  const n = validReviews.length;

  // m-1 fix: 2-member degraded panel with both promoting maps to promote_2_3,
  // not promote_3_3 (which implies a 3-member panel).
  if (n === 2 && tally.promote === 2) return "promote_2_3";

  if (tally.promote === n) return "promote_3_3";
  if (tally.promote >= 2) return "promote_2_3";
  if (tally.defer >= 2) return "defer_majority";
  if (tally.reject >= 2) return "reject_majority";
  return "split";
}

function computeMinorityOpinion(
  consensus: PanelConsensus,
  validReviews: PanelMemberReview[],
): string | undefined {
  if (consensus !== "promote_2_3") return undefined;
  const dissenters = validReviews.filter((r) => r.verdict !== "promote");
  if (dissenters.length === 0) return undefined;
  return dissenters
    .map((r) => `${r.member.agent_id} (${r.verdict}): ${r.reason}`)
    .join("; ");
}

// ---------------------------------------------------------------------------
// Public entry point: review a batch of candidates
// ---------------------------------------------------------------------------

export interface ReviewPanelConfig {
  candidates: ParsedLearningItem[];
  globalItems: ParsedLearningItem[];
  contradictionCandidates?: Set<string>;
  ontoHome?: string;
  maxTokens?: number;
  modelId?: string;
  maxGlobalItems?: number;
}

export interface ReviewPanelResult {
  verdicts: PanelVerdict[];
  degraded_states: DegradedStateEntry[];
}

/**
 * Compose a panel per candidate and run parallel LLM reviews.
 *
 * Design note: a single panel composition is shared across batched candidates
 * from the same originator. For minimal Phase A correctness we compose per
 * candidate — candidates from the same originator will redundantly construct
 * the same panel member list, but each member's LLM call is per-candidate
 * anyway, so there's no cost saving from merging here.
 *
 * TODO(step 13 eval): group candidates by originator and issue one LLM call
 * per (originator, philosopher, auto_selected) tuple to save N×3 calls.
 */
export async function reviewPanel(
  config: ReviewPanelConfig,
): Promise<ReviewPanelResult> {
  const verdicts: PanelVerdict[] = [];
  const degraded_states: DegradedStateEntry[] = [];
  const isContradiction = (id: string): boolean =>
    config.contradictionCandidates?.has(id) ?? false;

  for (const candidate of config.candidates) {
    const candidateId = candidateIdOf(candidate);
    const members = composePanel(
      candidate,
      config.ontoHome !== undefined ? { ontoHome: config.ontoHome } : {},
    );

    // One LLM call per member over a single-candidate batch. Batching across
    // candidates per originator is a Step 13 optimization.
    const memberResults = await Promise.all(
      members.map((member) =>
        callPanelMember({
          member,
          candidates: [candidate],
          globalItems: config.globalItems,
          ...(config.maxTokens !== undefined
            ? { maxTokens: config.maxTokens }
            : {}),
          ...(config.modelId !== undefined ? { modelId: config.modelId } : {}),
          ...(config.maxGlobalItems !== undefined
            ? { maxGlobalItems: config.maxGlobalItems }
            : {}),
        }),
      ),
    );

    // Collect member_reviews that survived validation for this candidate.
    const memberReviews: PanelMemberReview[] = [];
    const effectiveMembers: PanelMember[] = [];

    for (const result of memberResults) {
      if (result.status === "unreachable") {
        effectiveMembers.push({
          ...result.member,
          reachable: false,
          unreachable_reason: result.unreachable_reason ?? "unknown",
        });
        degraded_states.push({
          kind: "member_unreachable",
          detail: `${result.member.agent_id}: ${result.unreachable_reason ?? "unknown"}`,
          affected_candidates: [candidateId],
          affected_agents: [result.member.agent_id],
          occurred_at: new Date().toISOString(),
        });
        continue;
      }

      effectiveMembers.push(result.member);

      if (result.status === "contract_invalid") {
        degraded_states.push({
          kind: "panel_contract_invalid",
          detail: `${result.member.agent_id}: ${result.failures.join("; ")}`,
          affected_candidates: [candidateId],
          affected_agents: [result.member.agent_id],
          occurred_at: new Date().toISOString(),
        });
        continue;
      }

      // passed or retried_passed
      const review = result.reviews.get(candidateId);
      if (!review) {
        degraded_states.push({
          kind: "panel_contract_invalid",
          detail: `${result.member.agent_id}: validated call returned no review for candidate`,
          affected_candidates: [candidateId],
          affected_agents: [result.member.agent_id],
          occurred_at: new Date().toISOString(),
        });
        continue;
      }
      memberReviews.push(review);
    }

    const consensus = aggregateConsensus(memberReviews);

    if (consensus === "panel_minimum_unmet") {
      degraded_states.push({
        kind: "panel_minimum_unmet",
        detail: `candidate ${candidateId}: valid_member_count=${memberReviews.length}`,
        affected_candidates: [candidateId],
        occurred_at: new Date().toISOString(),
      });
    }

    const verdict: PanelVerdict = {
      candidate_id: candidateId,
      candidate,
      panel_members: effectiveMembers,
      member_reviews: memberReviews,
      consensus,
      is_contradiction: isContradiction(candidateId),
      matched_existing_line: null,
    };
    const minority = computeMinorityOpinion(consensus, memberReviews);
    if (minority !== undefined) {
      verdict.minority_opinion = minority;
    }
    verdicts.push(verdict);
  }

  return { verdicts, degraded_states };
}

// ---------------------------------------------------------------------------
// Criterion 6 — cross-agent dedup (LLM-driven)
// ---------------------------------------------------------------------------

/**
 * Cross-agent deduplication (criterion 6) — single-reviewer sequential path
 * with bi-directional removal protection.
 *
 * Algorithm:
 *   1. Pre-filter via Jaccard token overlap on significant content tokens.
 *      Cross-agent pairs (different agent_id) with similarity ≥ JACCARD_THRESHOLD
 *      become edges in a union-find structure.
 *   2. Each resulting connected component with ≥ 2 distinct agents becomes a
 *      "shortlist" candidate for LLM confirmation.
 *   3. The shortlist is capped at MAX_ITEMS_PER_SHORTLIST and the total number
 *      of shortlists at MAX_SHORTLISTS_PER_RUN to bound LLM cost.
 *   4. Per shortlist, one LLM call applies the same-principle test with
 *      agent-specific framing removed (not domain terms). The model returns
 *      a structured JSON: primary owner + consolidated principle + cases.
 *   5. Confirmed clusters become CrossAgentDedupCluster entries.
 *
 * Single-reviewer semantics (not 3-agent): promote.md §3 criterion 6 notes
 * that parallel 3-agent review risks bi-directional deletion (agent A removes
 * B while agent B removes A). The discovery path is intentionally one voice.
 *
 * Pre-filter rationale: an O(N²) naive LLM pass over candidates + globals is
 * cost-prohibitive at production scale (117 candidates × 1000 globals).
 * Jaccard is cheap, deterministic, and keeps the LLM load bounded.
 *
 * Failure model:
 *   - LLM unreachable or returns malformed JSON for a shortlist → that shortlist
 *     is dropped. Other shortlists proceed. (Recording degraded_states for
 *     dropped discovery shortlists is a follow-up — the current caller
 *     doesn't propagate them.)
 */

const CROSS_AGENT_DEDUP_SYSTEM_PROMPT = `You are detecting cross-agent principle duplication in a learning management system.

You will receive 2 or more learnings from DIFFERENT agents. Apply the same-principle test to decide whether they express the same underlying principle once agent-specific framing is removed:

(a) Remove agent-specific framing (e.g. "the philosopher asks...", "structurally...") from both items.
(b) Do the remaining sentences prescribe the same action?
(c) Can you identify a situation where one applies but the other does not? If yes, they are different principles.

If they ARE the same principle:
- Pick a primary_owner_agent: the agent closest to the verification dimension of the principle.
  Tiebreaker: the agent of the earliest-created learning (oldest source_date).
- Write a consolidated_principle statement that generalizes over the agents.
- Pick up to 3 representative_cases that maximize agent diversity.
- Compose a consolidated_line in the flat inline format:
  "- [{type}] [{axis tags}] [{purpose type}] General principle statement. (Representative cases: agent-A에서 X; agent-B에서 Y; agent-C에서 Z) (source: consolidated from [sources])"

Output ONE JSON object:
{
  "same_principle": true | false,
  "primary_owner_agent": "<agent_id>" | null,
  "primary_owner_reason": "<string>",
  "consolidated_principle": "<string>",
  "representative_cases": ["<case 1>", "<case 2>", "<case 3>"],
  "consolidated_line": "<inline format line>"
}

NO markdown fences, JSON only.`;

const JACCARD_THRESHOLD = 0.3;
const MAX_SHORTLISTS_PER_RUN = 20;
const MAX_ITEMS_PER_SHORTLIST = 10;
const MIN_TOKEN_LENGTH = 4;
const MIN_CJK_TOKEN_LENGTH = 2;

const STOPWORDS: ReadonlySet<string> = new Set([
  "with",
  "that",
  "this",
  "from",
  "into",
  "when",
  "where",
  "what",
  "which",
  "these",
  "those",
  "have",
  "been",
  "being",
  "should",
  "would",
  "could",
  "will",
  "must",
  "does",
  "they",
  "them",
  "their",
  "there",
  "then",
  "than",
  "some",
  "about",
  "also",
  "because",
  "such",
  "each",
  "while",
  "after",
  "before",
]);

/**
 * U4 fix: Unicode-aware tokenization. Previously the splitter was
 * `[^a-z0-9]+`, which stripped every Korean (and other non-Latin)
 * character. On a Korean-heavy corpus (like this repo's own learnings),
 * that made criterion 6 effectively blind — no shortlist ever formed.
 *
 * New behavior:
 *   - Split on characters that are NOT Unicode letters or numbers
 *     (`\p{L}` / `\p{N}` with the `u` flag).
 *   - Latin tokens still require MIN_TOKEN_LENGTH (4) to avoid matching
 *     on short words like "with" or "that".
 *   - Korean tokens (CJK ideographs and Hangul) use a lower threshold
 *     (MIN_CJK_TOKEN_LENGTH = 2) because one-syllable Korean words carry
 *     content ("코드", "검증", etc.).
 *   - English stopwords still filtered.
 */
function significantTokens(content: string): Set<string> {
  const tokens = new Set<string>();
  // Match runs of Unicode letters/numbers rather than splitting on
  // ASCII punctuation only.
  const matches = content.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!matches) return tokens;
  for (const word of matches) {
    if (STOPWORDS.has(word)) continue;
    if (isCjkWord(word)) {
      if (word.length < MIN_CJK_TOKEN_LENGTH) continue;
    } else if (word.length < MIN_TOKEN_LENGTH) {
      continue;
    }
    tokens.add(word);
  }
  return tokens;
}

// Hangul syllables + jamo + CJK unified ideographs cover Korean content.
const CJK_RE = /[\u3040-\u30ff\u3130-\u318f\uac00-\ud7af\u4e00-\u9fff]/;

function isCjkWord(word: string): boolean {
  return CJK_RE.test(word);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Minimal union-find with path compression. Indices are the slot positions in
 * the flattened item pool (candidates ++ globals).
 */
class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(x: number): number {
    let cur = x;
    while (this.parent[cur] !== cur) {
      this.parent[cur] = this.parent[this.parent[cur]!]!;
      cur = this.parent[cur]!;
    }
    return cur;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

interface ShortlistBuildResult {
  shortlists: ParsedLearningItem[][];
  /** Groups that had >=2 items AND >=2 distinct agents (valid candidates). */
  total_valid_groups: number;
  /** Shortlists that hit MAX_ITEMS_PER_SHORTLIST and lost members. */
  shortlists_truncated_count: number;
  /** Members dropped across all truncations (sum of items removed). */
  members_truncated_total: number;
  /** Valid groups beyond MAX_SHORTLISTS_PER_RUN that were dropped entirely. */
  shortlists_cap_dropped_count: number;
}

function buildShortlists(
  items: ParsedLearningItem[],
): ShortlistBuildResult {
  const empty: ShortlistBuildResult = {
    shortlists: [],
    total_valid_groups: 0,
    shortlists_truncated_count: 0,
    members_truncated_total: 0,
    shortlists_cap_dropped_count: 0,
  };
  if (items.length < 2) return empty;
  const tokens = items.map((it) => significantTokens(it.content));
  const uf = new UnionFind(items.length);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i]!.agent_id === items[j]!.agent_id) continue;
      const sim = jaccard(tokens[i]!, tokens[j]!);
      if (sim >= JACCARD_THRESHOLD) uf.union(i, j);
    }
  }

  // Group indices by root
  const groups = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) {
    const root = uf.find(i);
    const bucket = groups.get(root);
    if (bucket) bucket.push(i);
    else groups.set(root, [i]);
  }

  // First pass: filter to VALID groups (≥2 items, ≥2 distinct agents) and
  // record total valid group count so cap-drop tallies are accurate.
  const sortedRoots = [...groups.keys()].sort((a, b) => a - b);
  const validGroups: number[][] = [];
  for (const root of sortedRoots) {
    const indices = groups.get(root)!;
    if (indices.length < 2) continue;
    const agents = new Set(indices.map((idx) => items[idx]!.agent_id));
    if (agents.size < 2) continue;
    validGroups.push(indices);
  }

  // Second pass: apply the per-shortlist size cap and the total shortlist
  // count cap while recording bounded-loss metrics for C4.
  const shortlists: ParsedLearningItem[][] = [];
  let shortlistsTruncatedCount = 0;
  let membersTruncatedTotal = 0;
  for (const indices of validGroups) {
    if (shortlists.length >= MAX_SHORTLISTS_PER_RUN) break;
    let capped = indices;
    if (indices.length > MAX_ITEMS_PER_SHORTLIST) {
      capped = indices.slice(0, MAX_ITEMS_PER_SHORTLIST);
      shortlistsTruncatedCount += 1;
      membersTruncatedTotal += indices.length - MAX_ITEMS_PER_SHORTLIST;
    }
    shortlists.push(capped.map((idx) => items[idx]!));
  }
  const shortlistsCapDroppedCount = Math.max(
    0,
    validGroups.length - shortlists.length,
  );

  return {
    shortlists,
    total_valid_groups: validGroups.length,
    shortlists_truncated_count: shortlistsTruncatedCount,
    members_truncated_total: membersTruncatedTotal,
    shortlists_cap_dropped_count: shortlistsCapDroppedCount,
  };
}

function buildCrossAgentDedupUserPrompt(items: ParsedLearningItem[]): string {
  const lines: string[] = [
    "Learnings from different agents to compare:",
    "",
  ];
  items.forEach((item, i) => {
    lines.push(
      `${i + 1}. agent_id=${item.agent_id}`,
      `   role=${item.role ?? "null"}`,
      `   tags=[${item.applicability_tags.join(" ")}]`,
      `   source=${item.source_project ?? "?"}/${item.source_domain ?? "?"}/${item.source_date ?? "?"}`,
      `   content: ${item.content}`,
      "",
    );
  });
  lines.push("Apply the same-principle test and respond with the JSON object.");
  return lines.join("\n");
}

interface LlmClusterVerdict {
  primary_owner_agent: string;
  primary_owner_reason: string;
  consolidated_principle: string;
  representative_cases: string[];
  consolidated_line: string;
}

/**
 * Failure classification for llmConfirmCluster so the discovery pipeline
 * can surface bounded loss (C4). null outcomes are turned into a typed
 * reason the caller can aggregate into DedupDiscoveryMetrics.
 */
type ClusterConfirmFailure =
  | { kind: "provider_error"; detail: string }
  | { kind: "malformed_json"; detail: string }
  | { kind: "same_principle_false" }
  | { kind: "missing_field"; field: string }
  | { kind: "primary_owner_not_in_shortlist"; declared: string };

async function llmConfirmCluster(
  items: ParsedLearningItem[],
  modelId?: string,
): Promise<
  { ok: true; verdict: LlmClusterVerdict } | { ok: false; failure: ClusterConfirmFailure }
> {
  let responseText: string;
  try {
    const result = await callLlm(
      CROSS_AGENT_DEDUP_SYSTEM_PROMPT,
      buildCrossAgentDedupUserPrompt(items),
      {
        max_tokens: 1024,
        ...(modelId ? { model_id: modelId } : {}),
      },
    );
    responseText = result.text;
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "provider_error",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }

  let parsed: {
    same_principle?: unknown;
    primary_owner_agent?: unknown;
    primary_owner_reason?: unknown;
    consolidated_principle?: unknown;
    representative_cases?: unknown;
    consolidated_line?: unknown;
  };
  try {
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    parsed = JSON.parse(cleaned);
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "malformed_json",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }

  if (parsed.same_principle !== true) {
    return { ok: false, failure: { kind: "same_principle_false" } };
  }
  if (typeof parsed.primary_owner_agent !== "string") {
    return { ok: false, failure: { kind: "missing_field", field: "primary_owner_agent" } };
  }
  if (typeof parsed.consolidated_principle !== "string") {
    return { ok: false, failure: { kind: "missing_field", field: "consolidated_principle" } };
  }
  if (typeof parsed.consolidated_line !== "string") {
    return { ok: false, failure: { kind: "missing_field", field: "consolidated_line" } };
  }
  if (!Array.isArray(parsed.representative_cases)) {
    return { ok: false, failure: { kind: "missing_field", field: "representative_cases" } };
  }

  // C2 fix: primary_owner_agent must be one of the shortlist members. The
  // LLM can hallucinate an agent_id or pick an unrelated one; we fail closed
  // so approval never routes to an off-shortlist file.
  const shortlistAgents = new Set(items.map((it) => it.agent_id));
  if (!shortlistAgents.has(parsed.primary_owner_agent)) {
    return {
      ok: false,
      failure: {
        kind: "primary_owner_not_in_shortlist",
        declared: parsed.primary_owner_agent,
      },
    };
  }

  return {
    ok: true,
    verdict: {
      primary_owner_agent: parsed.primary_owner_agent,
      primary_owner_reason:
        typeof parsed.primary_owner_reason === "string"
          ? parsed.primary_owner_reason
          : "",
      consolidated_principle: parsed.consolidated_principle,
      representative_cases: parsed.representative_cases.filter(
        (c): c is string => typeof c === "string",
      ),
      consolidated_line: parsed.consolidated_line,
    },
  };
}

/**
 * Stable id derived from member identity so repeat runs against unchanged
 * inputs emit the same cluster_id.
 *
 * Stability caveat (review CC2):
 *   cluster_id is derived from the SHORTLIST members, not the full valid
 *   group. The shortlist may have been truncated by MAX_ITEMS_PER_SHORTLIST
 *   or the corpus may have grown between runs. Both conditions change the
 *   hashed member set and therefore the cluster_id.
 *
 *   This is the intentional trade-off: cluster_id is meant to identify
 *   "the cluster the LLM reviewed in THIS run," not "the canonical cluster
 *   for this principle across all runs." The applicator uses cluster_id
 *   for within-run apply-state idempotency (matching a cluster_id marker
 *   in the target file when re-applying the same report). It is NOT a
 *   durable operator-facing identity across independent runs; treat
 *   cluster_id as session-scoped and re-derive it from the report JSON
 *   when you need to match an existing apply.
 *
 *   If a future consumer needs cross-run identity, derive it from the
 *   consolidated_principle text + primary_owner_agent instead, and keep
 *   cluster_id as the run-local id.
 */
function hashCluster(items: ParsedLearningItem[]): string {
  const canonical = items
    .map((it) => `${it.agent_id}|${it.content}`)
    .sort()
    .join("\n");
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

export interface CrossAgentDedupConfig {
  modelId?: string;
}

/**
 * C4 fix: explicit bounded-loss metrics. discoverCrossAgentDedupClusters
 * caps work in multiple places (MAX_SHORTLISTS_PER_RUN, per-shortlist item
 * limit, LLM failures dropped). Previously these losses were silent — the
 * caller could not tell whether an empty cluster list meant "nothing to
 * merge" or "we dropped everything due to cost caps and provider errors".
 *
 * This struct exposes each loss channel so the caller (promoter) can surface
 * them into the PromoteReport's degraded_states or warnings.
 */
export interface DedupDiscoveryMetrics {
  pool_size: number;
  total_valid_groups: number;
  shortlists_processed: number;
  shortlists_cap_dropped_count: number;
  shortlists_truncated_count: number;
  members_truncated_total: number;
  llm_failures: {
    provider_error: number;
    malformed_json: number;
    same_principle_false: number;
    missing_field: number;
    primary_owner_not_in_shortlist: number;
  };
}

export interface CrossAgentDedupDiscoveryResult {
  clusters: CrossAgentDedupCluster[];
  metrics: DedupDiscoveryMetrics;
}

function emptyMetrics(poolSize: number): DedupDiscoveryMetrics {
  return {
    pool_size: poolSize,
    total_valid_groups: 0,
    shortlists_processed: 0,
    shortlists_cap_dropped_count: 0,
    shortlists_truncated_count: 0,
    members_truncated_total: 0,
    llm_failures: {
      provider_error: 0,
      malformed_json: 0,
      same_principle_false: 0,
      missing_field: 0,
      primary_owner_not_in_shortlist: 0,
    },
  };
}

export async function discoverCrossAgentDedupClusters(
  candidates: ParsedLearningItem[],
  globalItems: ParsedLearningItem[],
  config: CrossAgentDedupConfig = {},
): Promise<CrossAgentDedupDiscoveryResult> {
  // Candidates and globals are folded into a single pool so cross-scope
  // duplicates surface along with cross-agent duplicates inside either pool.
  const pool = [...candidates, ...globalItems];
  const metrics = emptyMetrics(pool.length);

  const built = buildShortlists(pool);
  metrics.total_valid_groups = built.total_valid_groups;
  metrics.shortlists_cap_dropped_count = built.shortlists_cap_dropped_count;
  metrics.shortlists_truncated_count = built.shortlists_truncated_count;
  metrics.members_truncated_total = built.members_truncated_total;

  if (built.shortlists.length === 0) {
    return { clusters: [], metrics };
  }

  const clusters: CrossAgentDedupCluster[] = [];
  for (const shortlist of built.shortlists) {
    metrics.shortlists_processed += 1;
    const outcome = await llmConfirmCluster(shortlist, config.modelId);
    if (!outcome.ok) {
      switch (outcome.failure.kind) {
        case "provider_error":
          metrics.llm_failures.provider_error += 1;
          break;
        case "malformed_json":
          metrics.llm_failures.malformed_json += 1;
          break;
        case "same_principle_false":
          metrics.llm_failures.same_principle_false += 1;
          break;
        case "missing_field":
          metrics.llm_failures.missing_field += 1;
          break;
        case "primary_owner_not_in_shortlist":
          metrics.llm_failures.primary_owner_not_in_shortlist += 1;
          break;
      }
      continue;
    }
    const verdict = outcome.verdict;
    clusters.push({
      cluster_id: hashCluster(shortlist),
      primary_owner_agent: verdict.primary_owner_agent,
      primary_owner_reason: verdict.primary_owner_reason,
      consolidated_principle: verdict.consolidated_principle,
      representative_cases: verdict.representative_cases,
      member_items: shortlist,
      consolidated_line: verdict.consolidated_line,
      user_approval_required: true,
    });
  }
  return { clusters, metrics };
}

// Test-only exports for unit coverage. Production imports go through
// discoverCrossAgentDedupClusters.
export const __testExports = {
  significantTokens,
  jaccard,
  buildShortlists,
  JACCARD_THRESHOLD,
  MAX_SHORTLISTS_PER_RUN,
  MAX_ITEMS_PER_SHORTLIST,
  MIN_CJK_TOKEN_LENGTH,
};
