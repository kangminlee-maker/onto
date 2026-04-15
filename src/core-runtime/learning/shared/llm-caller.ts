/**
 * Background task (learn/govern/promote) LLM call wrapper.
 *
 * Cost-order provider resolution ladder (lower priority number = higher priority):
 *   1. Caller-explicit: callLlm(..., { provider }) — overrides any auto-resolution
 *   2. Config-explicit: OntoConfig.api_provider — user override, wins over cost-order
 *   3. codex CLI OAuth subscription (declared_billing_mode=subscription)
 *      Requires ~/.codex/auth.json chatgpt mode + codex binary on PATH.
 *      Invokes `codex exec --ephemeral -` as subprocess; OAuth token goes to
 *      chatgpt.com backend, which cannot be reached via the OpenAI SDK.
 *   4. LiteLLM (declared_billing_mode=per_token, cost_order_rank=variable)
 *      Requires llm_base_url resolved via CLI flag / env LITELLM_BASE_URL /
 *      project config / onto-home config.
 *   5. Anthropic API key — ANTHROPIC_API_KEY env (per-token)
 *   6. OpenAI per-token — OPENAI_API_KEY env, or ~/.codex/auth.json OPENAI_API_KEY field
 *
 *   Priority 0 (special): ONTO_LLM_MOCK=1 → in-process mock (test only)
 *
 *   Credential 전무 시 fail-fast with cost-order guidance. Host main-model
 *   delegation ("fall through to host-spawned subagent") is an execution
 *   realization axis concept and NOT part of this ladder — see
 *   development-records/plan/20260415-litellm-provider-design.md §1.0.
 *
 * Graceful fallback (§3.7 c):
 *   When codex OAuth is detected but the codex binary is absent, the resolver
 *   falls back to the next cost-order path and emits a one-time STDERR install
 *   notice. Suppressible via ONTO_SUPPRESS_CODEX_INSTALL_NOTICE=1 env or
 *   .onto/config.yml suppress_codex_install_notice: true.
 *
 * Mock provider:
 *   When ONTO_LLM_MOCK=1 is set, callLlm() routes to an in-process mock that
 *   pattern-matches the system prompt against known Phase 3 prompts (panel
 *   review, judgment audit, insight reclassify, domain doc) and returns
 *   deterministic JSON. This unblocks E2E tests that need to exercise the
 *   full LLM call path without real API credentials. NEVER ship with this
 *   env var set in production — there's no real reasoning happening.
 *
 * Design: development-records/plan/20260415-litellm-provider-design.md
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

/**
 * Minimal subset of OntoConfig that resolveLearningProviderConfig reads.
 * Kept narrow to avoid learning→discovery coupling; callers pass a shape-compatible object.
 */
export interface LearningProviderConfigInputs {
  api_provider?: string;
  model?: string;
  llm_base_url?: string;
  codex?: { model?: string; effort?: string };
  anthropic?: { model?: string };
  openai?: { model?: string };
  litellm?: { model?: string };
}

/**
 * CLI flag overrides that win over OntoConfig values.
 * Maps to the CLI-flag > env > project-config > onto-home-config precedence (D3).
 */
export interface LearningProviderCliOverrides {
  provider?: "anthropic" | "openai" | "litellm" | "codex";
  llm_base_url?: string;
  model?: string;
  reasoning_effort?: string;
}

/**
 * Bridge: OntoConfig + CLI overrides → Partial<LlmCallConfig> that callLlm consumes.
 *
 * Callers (learning/promote panel-reviewer, promote-executor, judgment-auditor,
 * insight-reclassifier, extractor, semantic-classifier) should:
 *
 *   const partial = resolveLearningProviderConfig({ config: ontoConfig, cliOverrides });
 *   const result = await callLlm(system, user, { ...partial, max_tokens: 2048 });
 *
 * This replaces the pattern of callers building Partial<LlmCallConfig> ad-hoc, and is
 * the canonical seat where OntoConfig translates to provider resolution input.
 *
 * Design: development-records/plan/20260415-litellm-provider-design.md §3.6a
 */
export function resolveLearningProviderConfig(args: {
  config?: LearningProviderConfigInputs;
  cliOverrides?: LearningProviderCliOverrides;
}): Partial<LlmCallConfig> {
  const config = args.config ?? {};
  const cli = args.cliOverrides ?? {};

  // provider: CLI > config.api_provider (narrowed to valid enum)
  const configProvider = narrowProvider(config.api_provider);
  const provider = cli.provider ?? configProvider;

  // model: CLI > config.{provider}.model (when provider is known) > config.model
  // When provider is auto-resolved (neither CLI nor config explicit), we can't
  // know the eventual provider here, so we fall back to the top-level model.
  // The dispatch layer (callLlm) fails fast if no model reaches the api-key paths.
  const providerSpecific = pickProviderModel(config, provider);
  const model_id = cli.model ?? providerSpecific ?? config.model;

  // base_url: CLI > env LITELLM_BASE_URL > config.llm_base_url
  const base_url =
    cli.llm_base_url ?? process.env.LITELLM_BASE_URL ?? config.llm_base_url;

  // reasoning_effort: CLI > config.codex.effort (codex only)
  const isCodex = provider === "codex";
  const reasoning_effort = cli.reasoning_effort ?? (isCodex ? config.codex?.effort : undefined);

  const out: Partial<LlmCallConfig> = {};
  if (provider) out.provider = provider;
  if (model_id) out.model_id = model_id;
  if (base_url) out.base_url = base_url;
  if (reasoning_effort) out.reasoning_effort = reasoning_effort;
  return out;
}

function pickProviderModel(
  config: LearningProviderConfigInputs,
  provider: LlmCallConfig["provider"] | undefined,
): string | undefined {
  switch (provider) {
    case "codex":
      return config.codex?.model;
    case "anthropic":
      return config.anthropic?.model;
    case "openai":
      return config.openai?.model;
    case "litellm":
      return config.litellm?.model;
    default:
      return undefined;
  }
}

function narrowProvider(value: string | undefined): LlmCallConfig["provider"] | undefined {
  if (value === "anthropic" || value === "openai" || value === "litellm" || value === "codex") {
    return value;
  }
  return undefined;
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
// Provider resolution (cost-order)
// ---------------------------------------------------------------------------
//
// Priority (lower number = higher priority):
//   1. Caller-explicit (config.provider argument to callLlm — handled in callLlm itself)
//   2. Config-explicit api_provider (via Partial<LlmCallConfig>.provider — handled in callLlm)
//   3. codex CLI OAuth subscription — ~/.codex/auth.json chatgpt mode + codex binary on PATH
//   4. LiteLLM — llm_base_url resolved via config/env
//   5. Anthropic API key — ANTHROPIC_API_KEY env
//   6. OpenAI per-token — OPENAI_API_KEY env OR ~/.codex/auth.json OPENAI_API_KEY field
//
// Credential 전무 시 fail-fast. Host main-model delegation is execution realization axis,
// not part of this ladder (see development-records/plan/20260415-litellm-provider-design.md §1.0).

interface ResolvedProvider {
  provider: "anthropic" | "openai" | "litellm" | "codex";
  apiKey: string;           // For codex: unused (subprocess uses ~/.codex auth); filled with sentinel.
  baseUrl?: string;         // For litellm; for openai/anthropic undefined.
  /** For codex missing-binary case: telemetry to trigger the (c) graceful-fallback notice in callLlm. */
  codexOauthPresentButBinaryMissing?: boolean;
  /** For codex missing-binary fallback: the provider that was actually selected (for the STDERR notice). */
  fallbackFrom?: "codex-oauth";
}

interface CodexAuthState {
  chatgptOAuth: boolean;
  openaiApiKey: string | null;
}

function readCodexAuthState(): CodexAuthState {
  const codexAuthPath = path.join(os.homedir(), ".codex", "auth.json");
  if (!fs.existsSync(codexAuthPath)) {
    return { chatgptOAuth: false, openaiApiKey: null };
  }
  try {
    const auth = JSON.parse(fs.readFileSync(codexAuthPath, "utf8"));
    const oauth =
      auth.auth_mode === "chatgpt" ||
      (auth.tokens && typeof auth.tokens.access_token === "string");
    const openaiKey =
      typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY.length > 0
        ? auth.OPENAI_API_KEY
        : null;
    return { chatgptOAuth: Boolean(oauth), openaiApiKey: openaiKey };
  } catch {
    return { chatgptOAuth: false, openaiApiKey: null };
  }
}

function codexBinaryOnPath(): boolean {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, "codex");
    if (fs.existsSync(candidate)) return true;
  }
  return false;
}

/**
 * Resolve the best available LLM provider by cost-order (auto-resolution).
 * Called by callLlm when no caller-explicit or config-explicit provider is set.
 *
 * Returns a ResolvedProvider with declared provider identity + credentials.
 * Throws with guidance (§3.7 d) when no provider path is viable.
 *
 * Special case: if codex OAuth is detected but binary is missing AND another
 * credential is available, we fall back to that credential path and set
 * `fallbackFrom: "codex-oauth"` so callLlm can emit the (c) notice.
 */
function resolveProvider(
  preferred?: LlmCallConfig["provider"],
  configBaseUrl?: string,
): ResolvedProvider {
  // Priority 1-2: caller-explicit / config-explicit anthropic or openai.
  // These constrain the search to one provider; missing credential fails fast
  // rather than silently falling through to cost-order.
  // (codex and litellm are handled inline in callLlm before reaching here.)
  if (preferred === "anthropic") {
    if (process.env.ANTHROPIC_API_KEY) {
      return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
    }
    throw new Error(explicitProviderMissingCredentialError("anthropic"));
  }
  if (preferred === "openai") {
    if (process.env.OPENAI_API_KEY) {
      return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
    }
    const codexAuth = readCodexAuthState();
    if (codexAuth.openaiApiKey) {
      return { provider: "openai", apiKey: codexAuth.openaiApiKey };
    }
    throw new Error(explicitProviderMissingCredentialError("openai"));
  }

  // Auto cost-order resolution.
  const codexAuth = readCodexAuthState();

  // Priority 3: codex CLI OAuth subscription.
  if (codexAuth.chatgptOAuth) {
    if (codexBinaryOnPath()) {
      return {
        provider: "codex",
        apiKey: "codex-oauth",          // sentinel; unused
      };
    }
    // OAuth detected but binary missing — fall through, mark for (c) notice.
    const fallback = tryNonCodexProviders(configBaseUrl);
    if (fallback) {
      return { ...fallback, codexOauthPresentButBinaryMissing: true, fallbackFrom: "codex-oauth" };
    }
    // No other credential either — (d) with install guidance emphasized.
    throw new Error(buildNoProviderError({ codexOauthPresent: true, codexBinaryPresent: false }));
  }

  // Priority 4-6: no codex OAuth case.
  const fallback = tryNonCodexProviders(configBaseUrl);
  if (fallback) return fallback;

  throw new Error(buildNoProviderError({ codexOauthPresent: false, codexBinaryPresent: codexBinaryOnPath() }));
}

function explicitProviderMissingCredentialError(
  provider: "anthropic" | "openai",
): string {
  const envVar = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  return [
    `api_provider=${provider} 명시적으로 선택되었으나 ${envVar}가 환경변수에 없습니다.`,
    ...(provider === "openai"
      ? ["(~/.codex/auth.json의 OPENAI_API_KEY 필드도 비어 있거나 없음)"]
      : []),
    `명시적 provider override를 사용하려면 ${envVar}를 export하세요.`,
    "cost-order 자동 해소를 원하면 .onto/config.yml에서 api_provider를 제거하세요.",
  ].join("\n");
}

function tryNonCodexProviders(configBaseUrl?: string): ResolvedProvider | null {
  // Priority 4: LiteLLM — env or config has base URL.
  const resolvedBaseUrl = process.env.LITELLM_BASE_URL ?? configBaseUrl;
  if (resolvedBaseUrl) {
    const apiKey = process.env.LITELLM_API_KEY ?? "sk-litellm-placeholder";
    return {
      provider: "litellm",
      apiKey,
      baseUrl: resolvedBaseUrl,
    };
  }

  // Priority 5: Anthropic API key.
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  // Priority 6: OpenAI per-token — env OPENAI_API_KEY or auth.json OPENAI_API_KEY field.
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }
  const codexAuth = readCodexAuthState();
  if (codexAuth.openaiApiKey) {
    return {
      provider: "openai",
      apiKey: codexAuth.openaiApiKey,
    };
  }

  return null;
}

function buildNoProviderError(ctx: {
  codexOauthPresent: boolean;
  codexBinaryPresent: boolean;
}): string {
  const lines: string[] = [];
  lines.push("background task용 LLM provider를 해소할 수 없습니다.");
  lines.push("");
  if (ctx.codexOauthPresent && !ctx.codexBinaryPresent) {
    lines.push("~/.codex/auth.json에 chatgpt OAuth 자격이 있으나 codex 바이너리가 PATH에 없습니다.");
    lines.push("이 경로는 cost-order 최상위(구독제, 호출당 한계비용 0) 이므로 가장 행동 장벽이 낮습니다:");
    lines.push("  → codex 설치: https://github.com/openai/codex");
    lines.push("  → 설치 후 `codex --version` 으로 PATH 인식 확인");
    lines.push("");
  }
  lines.push("권장 순서(비용 낮은 순):");
  lines.push("  1. codex OAuth 구독: ~/.codex/auth.json을 chatgpt 모드로 구성 + codex 바이너리 설치 (구독제, 한계비용 0)");
  lines.push("  2. LiteLLM: llm_base_url을 .onto/config.yml에 설정하거나 LITELLM_BASE_URL을 export (로컬 모델 사용 시 0)");
  lines.push("  3. Anthropic API: ANTHROPIC_API_KEY를 export (per-token 과금)");
  lines.push("  4. OpenAI per-token: OPENAI_API_KEY를 export, 또는 ~/.codex/auth.json의 OPENAI_API_KEY 필드 (per-token 과금)");
  return lines.join("\n");
}

/**
 * Construct a fail-fast error for api-key providers when no model is specified.
 * Used by anthropic / openai / litellm dispatch branches. codex is exempt because
 * the codex CLI picks its own default when `-m` is omitted.
 *
 * Hardcoded DEFAULT_ANTHROPIC_MODEL / DEFAULT_OPENAI_MODEL constants were removed
 * from this module (2026-04-15): model choice is a user decision (cost / quality /
 * account compatibility) and should not be hardcoded in library code where it can
 * silently go stale or mismatch account permissions.
 */
function missingModelError(provider: "anthropic" | "openai" | "litellm"): Error {
  const providerField = provider; // "anthropic" | "openai" | "litellm"
  return new Error(
    [
      `provider=${provider} 경로는 model 지정이 필요합니다. 하드코딩된 기본 모델은 제거되었습니다.`,
      "다음 중 한 가지로 설정하세요:",
      `  1. .onto/config.yml 의 \`${providerField}.model: <model-id>\` (해당 provider 전용)`,
      "  2. .onto/config.yml 의 `model: <model-id>` (provider 무관 기본값)",
      "  3. 호출부에서 LlmCallConfig.model_id 인자 전달 (런타임 override)",
      "(codex provider는 model 미지정 시 codex CLI가 자체 기본값을 사용하므로 이 메시지의 대상이 아닙니다.)",
    ].join("\n"),
  );
}

/** One-time STDERR install notice emitted when codex OAuth is detected but binary missing. */
let codexInstallNoticeShown = false;
function maybeEmitCodexInstallNotice(opts: {
  fallbackProvider: string;
  fallbackBillingMode: string;
  suppress: boolean;
}): void {
  if (codexInstallNoticeShown || opts.suppress) return;
  codexInstallNoticeShown = true;
  const msg = [
    "[onto] 구독제 cost-order 최상위 경로(codex OAuth)를 놓치고 있습니다.",
    "~/.codex/auth.json에 chatgpt OAuth 자격이 있으나 codex 바이너리를 PATH에서 찾을 수 없습니다.",
    "",
    "codex를 설치하면 이 경로가 자동으로 활성화됩니다 (구독제, 호출당 한계비용 0):",
    "  설치: https://github.com/openai/codex",
    "  설치 후 `codex --version` 으로 PATH 인식 확인.",
    "",
    `지금은 다음 cost-order 경로로 폴백합니다: ${opts.fallbackProvider} (declared_billing_mode=${opts.fallbackBillingMode}).`,
    "명시적으로 다른 provider를 쓰려면 .onto/config.yml에 api_provider를 지정하세요.",
    "세션당 1회만 표시됩니다. `suppress_codex_install_notice: true`로 끌 수 있습니다.",
    "",
  ].join("\n");
  process.stderr.write(msg);
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

  // Caller-explicit codex (priority 1) → subprocess spawn, no credential resolution.
  if (config?.provider === "codex") {
    return callCodexCli(
      systemPrompt,
      userPrompt,
      config.model_id,
      config.reasoning_effort,
    );
  }

  // Caller-explicit litellm (priority 1) → OpenAI-compatible proxy.
  if (config?.provider === "litellm") {
    const baseUrl = config.base_url ?? process.env.LITELLM_BASE_URL;
    if (!baseUrl) {
      throw new Error(
        "api_provider=litellm requires base_url (set via LlmCallConfig.base_url, env LITELLM_BASE_URL, or .onto/config.yml llm_base_url)",
      );
    }
    const modelId = config.model_id;
    if (!modelId) throw missingModelError("litellm");
    const apiKey = process.env.LITELLM_API_KEY ?? "sk-litellm-placeholder";
    const maxTokens = config.max_tokens ?? 1024;
    return callOpenAI(systemPrompt, userPrompt, apiKey, modelId, maxTokens, baseUrl, "litellm");
  }

  // Auto-resolution by cost-order (priority 3-6). config-explicit anthropic/openai
  // flows through resolveProvider too (preferred arg filters candidates).
  const resolved = resolveProvider(config?.provider, config?.base_url);
  const maxTokens = config?.max_tokens ?? 1024;

  // Graceful-fallback notice: codex OAuth present but binary missing (§3.7 c).
  if (resolved.codexOauthPresentButBinaryMissing) {
    const suppress = Boolean(process.env.ONTO_SUPPRESS_CODEX_INSTALL_NOTICE);
    maybeEmitCodexInstallNotice({
      fallbackProvider: resolved.provider,
      fallbackBillingMode: resolved.provider === "anthropic" || resolved.provider === "openai" ? "per_token" : "per_token",
      suppress,
    });
  }

  switch (resolved.provider) {
    case "codex": {
      // codex CLI picks its own default model when -m is omitted. Do NOT fall back
      // to DEFAULT_OPENAI_MODEL here: codex OAuth (chatgpt account) rejects many
      // openai-native model IDs like gpt-4o-mini with:
      //   "The '<model>' model is not supported when using Codex with a ChatGPT account."
      // Only pass -m when the user explicitly supplied a model.
      return callCodexCli(
        systemPrompt,
        userPrompt,
        config?.model_id,
        config?.reasoning_effort,
      );
    }
    case "litellm": {
      const modelId = config?.model_id;
      if (!modelId) throw missingModelError("litellm");
      return callOpenAI(
        systemPrompt,
        userPrompt,
        resolved.apiKey,
        modelId,
        maxTokens,
        resolved.baseUrl,
        "litellm",
      );
    }
    case "anthropic": {
      const modelId = config?.model_id;
      if (!modelId) throw missingModelError("anthropic");
      return callAnthropic(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
    }
    case "openai": {
      const modelId = config?.model_id;
      if (!modelId) throw missingModelError("openai");
      return callOpenAI(systemPrompt, userPrompt, resolved.apiKey, modelId, maxTokens);
    }
  }
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
