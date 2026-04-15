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
  provider: "anthropic" | "openai" | "litellm" | "codex";
  model_id: string;
  max_tokens: number;
  /** Optional base URL for litellm (OpenAI-compatible proxy) or openai custom endpoint. Ignored by codex/anthropic. */
  base_url?: string;
  /** codex-only: reasoning effort passed as `model_reasoning_effort`. Ignored by other providers. */
  reasoning_effort?: string;
}

export interface LlmCallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model_id: string;
  /** Actual endpoint hit (audit trail). SDK/subprocess providers each fill their own sentinel. */
  effective_base_url?: string;
  /**
   * Declarative billing classification used by onto's cost-order ladder.
   * NOT a measured billing truth — e.g. LiteLLM downstream is opaque so it's
   * recorded conservatively as per_token even if the backend is a free local
   * model. Authority concept: authority/core-lexicon.yaml entities.LlmBillingMode.
   */
  declared_billing_mode?: "subscription" | "per_token";
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

  // (Dead fallback branch removed — the earlier ANTHROPIC_API_KEY check at
  // step 1 already handles both the `preferred === undefined` and the
  // `preferred !== "openai"` cases, so the previous duplicate probe here was
  // unreachable. Kept a comment to document the cleanup for future readers.)

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
    effective_base_url: "https://api.anthropic.com",
    declared_billing_mode: "per_token",
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
  baseUrl?: string,
  providerLabel: "openai" | "litellm" = "openai",
): Promise<LlmCallResult> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
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

  const defaultOpenAIBase = "https://api.openai.com/v1";
  return {
    text,
    input_tokens: response.usage?.prompt_tokens ?? 0,
    output_tokens: response.usage?.completion_tokens ?? 0,
    model_id: modelId,
    effective_base_url: baseUrl ?? defaultOpenAIBase,
    // LiteLLM downstream is opaque; record conservatively as per_token.
    // The cost-order rank for litellm is variable (LlmBillingMode) — this field captures audit signal.
    declared_billing_mode: "per_token",
  };
}

// ---------------------------------------------------------------------------
// codex CLI call (OAuth subscription path)
// ---------------------------------------------------------------------------

/**
 * Invoke `codex exec --ephemeral -` as a subprocess for a single-turn
 * prompt → text response. Uses the host's codex CLI authentication
 * (chatgpt OAuth via ~/.codex/auth.json), which routes through chatgpt.com's
 * backend — cannot be reached via the OpenAI SDK.
 *
 * Design: development-records/plan/20260415-litellm-provider-design.md §3.5a
 *
 * --ephemeral keeps this learning call from persisting a session file
 *   alongside review sessions. --skip-git-repo-check lets learning run
 *   from non-repo cwd. No -C/-s/-o: this is single-turn, no agentic scaffold.
 */
async function callCodexCli(
  systemPrompt: string,
  userPrompt: string,
  modelId?: string,
  reasoningEffort?: string,
): Promise<LlmCallResult> {
  const { spawn } = await import("node:child_process");

  const args: string[] = ["exec", "--skip-git-repo-check", "--ephemeral"];
  if (modelId) args.push("-m", modelId);
  if (reasoningEffort) args.push("-c", `model_reasoning_effort="${reasoningEffort}"`);
  args.push("-");

  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  const child = spawn("codex", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  child.stdout.on("data", (chunk: Buffer | string) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += String(chunk);
  });

  child.stdin.write(combinedPrompt);
  child.stdin.end();

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, DEFAULT_TIMEOUT_MS);

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeoutHandle);
      if (err.code === "ENOENT") {
        reject(new Error(
          "codex CLI not found on PATH. Install codex to use the OAuth subscription path: https://github.com/openai/codex",
        ));
      } else {
        reject(err);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve(code ?? 1);
    });
  });

  if (timedOut) {
    throw new Error(`codex CLI call timed out after ${DEFAULT_TIMEOUT_MS}ms`);
  }
  if (exitCode !== 0) {
    const combined = [stderr.trim(), stdout.trim()]
      .filter((m) => m.length > 0)
      .join("\n");
    throw new Error(
      combined.length > 0 ? combined : `codex CLI exited with code ${exitCode}`,
    );
  }

  const text = stdout.trim();
  // codex exec does not return usage metadata in stdout; estimate by char count.
  // LlmCallResult carries these as approximate; audit may flag via declared_billing_mode=subscription.
  const estimateTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

  return {
    text,
    input_tokens: estimateTokens(combinedPrompt),
    output_tokens: estimateTokens(text),
    model_id: modelId ?? "codex-default",
    effective_base_url: "codex-cli://oauth",
    declared_billing_mode: "subscription",
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

  // Caller-explicit codex → subprocess spawn, no API-key resolution needed.
  if (config?.provider === "codex") {
    return callCodexCli(
      systemPrompt,
      userPrompt,
      config.model_id,
      config.reasoning_effort,
    );
  }

  // Caller-explicit litellm → OpenAI-compatible proxy; use baseURL from config
  // and either LITELLM_API_KEY env or a placeholder (proxies often self-auth).
  if (config?.provider === "litellm") {
    const baseUrl = config.base_url;
    if (!baseUrl) {
      throw new Error(
        "api_provider=litellm requires base_url (set via LlmCallConfig.base_url, CLI flag, env LITELLM_BASE_URL, or .onto/config.yml llm_base_url)",
      );
    }
    const apiKey = process.env.LITELLM_API_KEY ?? "sk-litellm-placeholder";
    const modelId = config.model_id ?? DEFAULT_OPENAI_MODEL;
    const maxTokens = config.max_tokens ?? 1024;
    return callOpenAI(systemPrompt, userPrompt, apiKey, modelId, maxTokens, baseUrl, "litellm");
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
 *   - Cross-agent dedup (criterion 6, same-principle test)
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
    systemPrompt.startsWith(
      "You are detecting cross-agent principle duplication",
    )
  ) {
    // Cross-agent dedup (criterion 6) — extract the first agent from the
    // user prompt as primary owner and fabricate a consolidated line. The
    // mock happy path always confirms same_principle so tests can exercise
    // the structural path.
    //
    // Negative-path hooks (CG3 + UF3):
    //   ONTO_LLM_MOCK_DEDUP_BOGUS_OWNER=1
    //     → return a primary_owner_agent that is NOT in the shortlist so the
    //       C2 runtime guard in llmConfirmCluster rejects the cluster.
    //   ONTO_LLM_MOCK_DEDUP_SAME_PRINCIPLE_FALSE=1
    //     → return same_principle=false so the UF2 metric bucket bumps.
    //   ONTO_LLM_MOCK_DEDUP_MALFORMED=1
    //     → emit non-JSON so the malformed_json failure channel fires.
    //
    // These hooks are test-only and gated on the ONTO_LLM_MOCK=1 envelope
    // already checked above; production runs never see them.
    if (process.env.ONTO_LLM_MOCK_DEDUP_MALFORMED === "1") {
      text = "{this is not valid json at all";
    } else if (process.env.ONTO_LLM_MOCK_DEDUP_SAME_PRINCIPLE_FALSE === "1") {
      text = JSON.stringify({
        same_principle: false,
        primary_owner_agent: null,
        primary_owner_reason: "mock — disagreement",
        consolidated_principle: "",
        representative_cases: [],
        consolidated_line: "",
      });
    } else {
      const firstAgent = extractFirstDedupAgent(userPrompt);
      const agentCount = countDedupAgents(userPrompt);
      const bogusOwner =
        process.env.ONTO_LLM_MOCK_DEDUP_BOGUS_OWNER === "1"
          ? "offshortlist_ghost_agent"
          : firstAgent;
      text = JSON.stringify({
        same_principle: true,
        primary_owner_agent: bogusOwner,
        primary_owner_reason: "mock — first listed agent",
        consolidated_principle:
          "Mock consolidated principle produced by the deterministic LLM provider.",
        representative_cases: Array.from(
          { length: Math.min(agentCount, 3) },
          (_, i) => `mock case ${i + 1}`,
        ),
        consolidated_line:
          "- [fact] [methodology] [foundation] mock consolidated principle " +
          "(Representative cases: mock case 1; mock case 2) (source: consolidated from mock-mock-2026-04-09)",
      });
    }
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
    effective_base_url: "mock://deterministic",
    declared_billing_mode: "per_token",
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

/**
 * Cross-agent dedup user prompt lists items as:
 *   1. agent_id=structure
 *      ...
 *   2. agent_id=philosopher
 *      ...
 * Pick the first agent_id we see so the mock's primary_owner_agent matches
 * the first listed shortlist member. Falls back to "structure" when no
 * agent_id appears at all (shouldn't happen in practice).
 */
function extractFirstDedupAgent(userPrompt: string): string {
  const m = userPrompt.match(/agent_id=([A-Za-z0-9_-]+)/);
  return m ? m[1]! : "structure";
}

/**
 * Count the distinct agent_id references in the cross-agent dedup user prompt
 * so the mock can emit a plausible representative_cases list sized to the
 * shortlist.
 */
function countDedupAgents(userPrompt: string): number {
  const ids = new Set<string>();
  const re = /agent_id=([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(userPrompt)) !== null) {
    ids.add(m[1]!);
  }
  return ids.size;
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
