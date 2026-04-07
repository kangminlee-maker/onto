/**
 * Learning extraction LLM call wrapper — Phase 2.
 *
 * Supports multiple providers with automatic fallback:
 *   1. ANTHROPIC_API_KEY env var → Anthropic API
 *   2. OPENAI_API_KEY env var → OpenAI API
 *   3. ~/.codex/auth.json → OpenAI API (Codex CLI credentials)
 *
 * model_id fixed per provider (no floating alias — U2).
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
const DEFAULT_TIMEOUT_MS = 30_000;

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
 * Priority: ANTHROPIC_API_KEY → OPENAI_API_KEY → ~/.codex/auth.json
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

  // 3. Codex CLI credentials (~/.codex/auth.json)
  //    Supports both API key mode (OPENAI_API_KEY) and OAuth mode (tokens.access_token)
  const codexAuthPath = path.join(os.homedir(), ".codex", "auth.json");
  if (fs.existsSync(codexAuthPath)) {
    try {
      const auth = JSON.parse(fs.readFileSync(codexAuthPath, "utf8"));
      // API key mode
      if (typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY.length > 0) {
        return {
          provider: "openai",
          apiKey: auth.OPENAI_API_KEY,
          defaultModel: DEFAULT_OPENAI_MODEL,
        };
      }
      // OAuth mode (chatgpt auth_mode)
      if (auth.tokens?.access_token && typeof auth.tokens.access_token === "string") {
        return {
          provider: "openai",
          apiKey: auth.tokens.access_token,
          defaultModel: DEFAULT_OPENAI_MODEL,
        };
      }
    } catch {
      // Fall through
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

  throw new Error(
    "No LLM provider available for learning extraction. " +
    "Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or authenticate Codex CLI (codex login).",
  );
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
  const client = new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS });

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
  const client = new OpenAI({ apiKey, timeout: DEFAULT_TIMEOUT_MS });

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
 * Tries: ANTHROPIC_API_KEY → OPENAI_API_KEY → ~/.codex/auth.json
 */
export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  config?: Partial<LlmCallConfig>,
): Promise<LlmCallResult> {
  const resolved = resolveProvider(config?.provider);
  const modelId = config?.model_id ?? resolved.defaultModel;
  const maxTokens = config?.max_tokens ?? 1024;

  if (resolved.provider === "anthropic") {
    return callAnthropic(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
  }
  return callOpenAI(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
}

/**
 * Compute a stable hash of a prompt string for audit trail.
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}
