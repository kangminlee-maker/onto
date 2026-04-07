/**
 * Learning extraction LLM call wrapper — Phase 2.
 *
 * Thin wrapper around Anthropic SDK for A-8f, A-9f (repair), A-11 (semantic classification).
 * model_id fixed (no floating alias — U2).
 */

export interface LlmCallConfig {
  provider: "anthropic";
  model_id: string;
  max_tokens: number;
}

export interface LlmCallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model_id: string;
}

const DEFAULT_MODEL_ID = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Call Anthropic Messages API. Throws on error.
 */
export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  config?: Partial<LlmCallConfig>,
): Promise<LlmCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY required for learning extraction LLM calls.",
    );
  }

  const modelId = config?.model_id ?? DEFAULT_MODEL_ID;
  const maxTokens = config?.max_tokens ?? 1024;

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

/**
 * Compute a stable hash of a prompt string for audit trail.
 */
export function hashPrompt(prompt: string): string {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
}
