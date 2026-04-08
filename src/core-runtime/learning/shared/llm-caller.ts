/**
 * Learning extraction LLM call wrapper — Phase 2.
 *
 * Supports multiple providers with automatic fallback:
 *   1. ONTO_LLM_MOCK=1 → in-process mock provider (test only)
 *   2. ANTHROPIC_API_KEY env var → Anthropic API
 *   3. OPENAI_API_KEY env var → OpenAI API
 *   4. ~/.codex/auth.json (`OPENAI_API_KEY` field) → OpenAI API
 *      (only the API-key mode of codex CLI auth is supported. The chatgpt
 *      OAuth mode is intentionally NOT honored — see "Why no OAuth fallback"
 *      below.)
 *
 * model_id fixed per provider (no floating alias — U2).
 *
 * Why no OAuth fallback:
 *   Production validation B-1 (2026-04-08) found that the chatgpt OAuth
 *   `tokens.access_token` from ~/.codex/auth.json fails when used as an
 *   OpenAI API key against api.openai.com:
 *
 *     401 You have insufficient permissions for this operation.
 *     Missing scopes: model.request.
 *
 *   The chatgpt OAuth token authenticates against chatgpt.com's backend
 *   (which uses a different wire format and endpoint set than the public
 *   OpenAI API). Treating it as an OpenAI API key is structurally wrong:
 *   the codex CLI uses it via its own backend, but onto's llm-caller calls
 *   the public OpenAI SDK, which only accepts proper sk-... API keys.
 *
 *   Previously this fallback was present and silently broken — operators
 *   discovered the failure only at first LLM call. Now the resolver fails
 *   fast with a clear instruction to set ANTHROPIC_API_KEY or a real
 *   OPENAI_API_KEY (or run `codex login` with API key mode rather than
 *   chatgpt mode).
 *
 * Mock provider:
 *   When ONTO_LLM_MOCK=1 is set, callLlm() routes to an in-process mock that
 *   pattern-matches the system prompt against known Phase 3 prompts (panel
 *   review, judgment audit, insight reclassify, domain doc) and returns
 *   deterministic JSON. This unblocks E2E tests that need to exercise the
 *   full LLM call path without real API credentials. NEVER ship with this
 *   env var set in production — there's no real reasoning happening.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface LlmCallConfig {
  provider: "anthropic" | "openai";
  model_id: string;
  max_tokens: number;
}

export interface LlmCallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model_id: string;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
// Phase 3 production found 30s too tight for large audit batches (philosopher
// 37 items was timing out then SDK-retrying for 90s total). 120s is generous
// enough for ~50-item single-batch audits while still failing fast on real
// network problems.
const DEFAULT_TIMEOUT_MS = 120_000;
// SDK auto-retry hides failures behind a long stall. We surface failures
// faster (1 retry instead of the default 2) so operators see provider errors
// within ~2× timeout instead of ~3×.
const DEFAULT_MAX_RETRIES = 1;

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

interface ResolvedProvider {
  provider: "anthropic" | "openai";
  apiKey: string;
  defaultModel: string;
}

/**
 * Resolve the best available LLM provider.
 *
 * Priority: ANTHROPIC_API_KEY → OPENAI_API_KEY env → ~/.codex/auth.json
 * (only the OPENAI_API_KEY field, not chatgpt OAuth — see file header).
 */
function resolveProvider(preferred?: "anthropic" | "openai"): ResolvedProvider {
  // 1. Explicit ANTHROPIC_API_KEY
  if (preferred !== "openai" && process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: DEFAULT_ANTHROPIC_MODEL,
    };
  }

  // 2. Explicit OPENAI_API_KEY
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: DEFAULT_OPENAI_MODEL,
    };
  }

  // 3. Codex CLI credentials (~/.codex/auth.json) — API-key mode ONLY.
  //    The chatgpt OAuth mode is intentionally not honored: the OAuth
  //    token authenticates against chatgpt.com, not api.openai.com, and
  //    silently 401s with "Missing scopes: model.request" when used as
  //    an OpenAI API key. See file header "Why no OAuth fallback".
  let chatgptOAuthSeen = false;
  const codexAuthPath = path.join(os.homedir(), ".codex", "auth.json");
  if (fs.existsSync(codexAuthPath)) {
    try {
      const auth = JSON.parse(fs.readFileSync(codexAuthPath, "utf8"));
      if (typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY.length > 0) {
        return {
          provider: "openai",
          apiKey: auth.OPENAI_API_KEY,
          defaultModel: DEFAULT_OPENAI_MODEL,
        };
      }
      // Detect chatgpt OAuth presence so we can guide the user explicitly.
      if (
        auth.auth_mode === "chatgpt" ||
        (auth.tokens && typeof auth.tokens.access_token === "string")
      ) {
        chatgptOAuthSeen = true;
      }
    } catch {
      // Malformed auth.json — ignore silently and fall through to the
      // no-provider error below.
    }
  }

  // 4. Preferred anthropic but not available — check again without preference
  if (preferred === undefined && process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: DEFAULT_ANTHROPIC_MODEL,
    };
  }

  const guidance = chatgptOAuthSeen
    ? // Targeted message: user has chatgpt OAuth but no usable API key.
      "No LLM API key available for learning extraction. Detected ~/.codex/auth.json " +
      "with chatgpt OAuth (auth_mode=chatgpt), but the OAuth access_token cannot " +
      "authenticate against api.openai.com (it's a chatgpt.com backend token). " +
      "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (a real sk-... key), or re-run " +
      "`codex login` and choose API key mode instead of chatgpt OAuth."
    : "No LLM provider available for learning extraction. " +
      "Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or place an API key in ~/.codex/auth.json " +
      "(field: OPENAI_API_KEY). Note: chatgpt OAuth mode is not supported — use API key mode.";
  throw new Error(guidance);
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  modelId: string,
  maxTokens: number,
): Promise<LlmCallResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  });

  const response = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? (block as { text: string }).text : ""))
    .join("\n");

  return {
    text,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    model_id: modelId,
  };
}

// ---------------------------------------------------------------------------
// OpenAI call
// ---------------------------------------------------------------------------

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  modelId: string,
  maxTokens: number,
): Promise<LlmCallResult> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  });

  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  return {
    text,
    input_tokens: response.usage?.prompt_tokens ?? 0,
    output_tokens: response.usage?.completion_tokens ?? 0,
    model_id: modelId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call LLM with automatic provider resolution.
 * Tries: ONTO_LLM_MOCK → ANTHROPIC_API_KEY → OPENAI_API_KEY → ~/.codex/auth.json
 */
export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  config?: Partial<LlmCallConfig>,
): Promise<LlmCallResult> {
  // Test-only mock provider — gated by ONTO_LLM_MOCK=1.
  if (process.env.ONTO_LLM_MOCK === "1") {
    return callMockProvider(systemPrompt, userPrompt);
  }

  const resolved = resolveProvider(config?.provider);
  const modelId = config?.model_id ?? resolved.defaultModel;
  const maxTokens = config?.max_tokens ?? 1024;

  if (resolved.provider === "anthropic") {
    return callAnthropic(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
  }
  return callOpenAI(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
}

// ---------------------------------------------------------------------------
// Mock provider — test only, gated by ONTO_LLM_MOCK=1
// ---------------------------------------------------------------------------

const MOCK_MODEL_ID = "mock-llm-deterministic";

/**
 * Pattern-match the system prompt against known Phase 3 prompt headers and
 * return a deterministic JSON response shaped to satisfy each module's
 * validator. The matching is intentionally string-prefix based — fragile by
 * design so a prompt change forces a test update rather than silently
 * accepting drift.
 *
 * Coverage:
 *   - Panel reviewer (criteria 1~5)
 *   - Judgment auditor (audit outcomes)
 *   - Insight reclassifier (proposed_role)
 *   - Domain doc proposer Phase B (reflection_form + content)
 *   - Phase 2 semantic classifier (decision)
 *
 * N-1 fix: previously, unknown prompts fell through to a generic "ok" string,
 * which made prompt drift a downstream parse failure instead of an immediate
 * mock-dispatch failure. Now unknown prompts raise an error so test breakage
 * surfaces at the mock layer with the actual prompt prefix in the message.
 */
function callMockProvider(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmCallResult> {
  let text: string;

  if (systemPrompt.startsWith("You are reviewing promotion candidates")) {
    // Panel reviewer — extract candidate_ids from the user prompt and return
    // one item per id with all-yes criteria + promote verdict.
    const candidateIds = extractCandidateIds(userPrompt);
    text = JSON.stringify({
      items: candidateIds.map((id) => ({
        candidate_id: id,
        verdict: "promote",
        criteria: [1, 2, 3, 4, 5].map((c) => ({
          criterion: c,
          judgment: "yes",
          reasoning: `mock reasoning for criterion ${c}`,
        })),
        axis_tag_recommendation: "retain",
        axis_tag_note: "mock — keep current tags",
        contradiction_resolution: "n/a",
        reason: "mock — all criteria passed deterministically",
      })),
    });
  } else if (
    systemPrompt.startsWith(
      "You are re-verifying previously promoted [judgment]-type learnings",
    )
  ) {
    // Judgment auditor — extract item count and return retain for each.
    const count = extractJudgmentItemCount(userPrompt);
    text = JSON.stringify({
      outcomes: Array.from({ length: count }, (_, i) => ({
        item_index: i,
        decision: "retain",
        reason: "mock — judgment still valid",
        modified_content: null,
      })),
    });
  } else if (
    systemPrompt.startsWith(
      "You are reclassifying [insight]-tagged learnings",
    )
  ) {
    // Insight reclassifier — return foundation as a safe default.
    text = JSON.stringify({
      proposed_role: "foundation",
      reason: "mock — defaulted to foundation",
    });
  } else if (
    systemPrompt.startsWith("You are updating a domain document")
  ) {
    // Domain doc proposer Phase B.
    text = JSON.stringify({
      reflection_form: "add_term",
      content:
        "**Mock Term** — A mock entry produced by the deterministic LLM provider.",
    });
  } else if (
    systemPrompt.startsWith("You are a semantic classifier")
  ) {
    // Phase 2 semantic classifier (legacy compatibility).
    text = JSON.stringify({
      decision: "save",
      conflict_kind: null,
      matched_existing_line: null,
      reason: "mock — no overlap detected",
    });
  } else {
    // N-1 fail-loud: unknown prompt → throw with the prefix so tests
    // immediately point at the prompt that drifted. The previous "ok"
    // fallback masked drift behind a downstream JSON parse failure.
    const prefix = systemPrompt.slice(0, 80).replace(/\n/g, " ");
    return Promise.reject(
      new Error(
        `mock LLM provider: no pattern matched system prompt prefix "${prefix}". ` +
          `If this is a new Phase 3 prompt, add a matching branch in callMockProvider. ` +
          `If this is an old prompt that changed, update the matching prefix.`,
      ),
    );
  }

  return Promise.resolve({
    text,
    input_tokens: estimateMockTokens(systemPrompt + userPrompt),
    output_tokens: estimateMockTokens(text),
    model_id: MOCK_MODEL_ID,
  });
}

function extractCandidateIds(userPrompt: string): string[] {
  // Panel prompt format: `1. candidate_id=abc123 type=...`
  const ids: string[] = [];
  const re = /candidate_id=([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(userPrompt)) !== null) {
    ids.push(m[1]!);
  }
  return ids;
}

function extractJudgmentItemCount(userPrompt: string): number {
  const m = userPrompt.match(/Judgment items to re-verify:\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

function estimateMockTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Compute a stable hash of a prompt string for audit trail.
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}
