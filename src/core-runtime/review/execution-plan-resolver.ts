/**
 * Unified ExecutionPlan resolver — Review Recovery PR-1 (R1 + R2 + R5).
 *
 * # What this module is
 *
 * A single resolver that computes the full infrastructure-layer plan for a
 * review session: (a) which executor subprocess path to take (codex /
 * ts_inline_http / agent-teams), (b) which external LLM provider to dispatch
 * against, (c) retry policy, and (d) an observability trace of every
 * decision point.
 *
 * # Why it exists
 *
 * Prior to PR-1 there were TWO independent resolvers making overlapping
 * decisions in silence:
 *   - Layer 1 (`resolveExecutionProfile` in review-invoke.ts) decided the
 *     executor binary path from OntoConfig.host_runtime + env + host
 *     detection, producing `{execution_realization, host_runtime}`.
 *   - Layer 2 (`resolveProvider` in llm-caller.ts) decided the HTTP API
 *     provider (Anthropic / OpenAI / LiteLLM / Codex) via cost-order ladder,
 *     re-checking codex auth independently of Layer 1.
 *
 * When Layer 1 routed to `standalone / ts_inline_http` despite a valid codex
 * OAuth state, the divergence was silent — Layer 2 never saw the Layer 1
 * rationale and vice versa. Drill-down of 5 failed review runs (2026-04-17~18)
 * traced every failure to a form of this silent divergence.
 *
 * # How it relates
 *
 * `resolveExecutionPlan` is the single seat. Both legacy wrappers
 * (`resolveExecutionProfile` in review-invoke.ts, `resolveProvider` inside
 * `callLlm`) delegate here and project the subset they need, so the two
 * layers can never disagree again.
 *
 * # Scope of PR-1
 *
 * - Infrastructure transport (separation_rank + execution_realization +
 *   host_runtime + provider_identity) — R1 + R2
 * - Retry policy basic shape (timeout + attempts + backoff) — R4 per-error
 *   `classify` is deferred to PR-2
 * - Observability trace (plan_trace + `[plan]` STDERR) — R5 extension
 *
 * Deferred to PR-3: lens_dispatch budget, synthesize_strategy quorum.
 *
 * # Design reference
 *
 * `development-records/evolve/20260417-context-separation-ladder-design-sketch.md` §3.1
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { OntoConfig } from "../discovery/config-chain.js";
import { detectCodexBinaryAvailable } from "../discovery/host-detection.js";
import type { TopologyId } from "./execution-topology-resolver.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Context-separation rank (see sketch §1.2). Higher rank = stronger main-context
 * isolation. The ladder prefers higher rank when multiple paths are viable.
 *
 * S0 Subprocess (codex CLI)           — full isolation
 * S1 External HTTP API (inline-http)  — process shared, API context independent
 * S2 Host nested spawn                — main-context shared (claude TeamCreate)
 * S3 In-process mock                  — test only
 */
export type SeparationRank = "S0" | "S1" | "S2" | "S3";

export type ExecutionRealization =
  | "subagent"
  | "agent-teams"
  | "ts_inline_http"
  | "mock";

export type HostRuntime =
  | "codex"
  | "claude"
  | "standalone"
  | "litellm"
  | "anthropic"
  | "openai"
  | "mock";

export type ProviderIdentity =
  | "codex"
  | "anthropic"
  | "openai"
  | "litellm"
  | "claude-code"
  | "mock";

export interface ExecutionPlan {
  separation_rank: SeparationRank;
  execution_realization: ExecutionRealization;
  host_runtime: HostRuntime;
  provider_identity: ProviderIdentity;
  /** Chosen per-request model id; undefined when the executor picks its own (codex). */
  model_id?: string;
  /** LiteLLM / custom OpenAI-compatible base URL when applicable. */
  base_url?: string;
  retry_policy: RetryPolicy;
  /** Ordered list of decision points; emitted to STDERR and available for session artifacts. */
  plan_trace: string[];
  /**
   * Sketch v3 / PR-A (2026-04-18): reverse-mapped canonical topology id
   * for this plan. Populated when the P0-P4 ladder's decision aligns with
   * one of the 10 canonical topologies in
   * `src/core-runtime/review/execution-topology-resolver.ts`; left
   * undefined for legacy HTTP paths (standalone + anthropic/openai/litellm
   * without Claude Code) that sketch v3 does not cover directly.
   *
   * This is observational in PR-A — downstream dispatch (PR-B/C/D/E)
   * reads it to route to topology-specific spawn paths. Populating it
   * here keeps the old P0-P4 ladder as the source of truth while
   * progressively shifting to topology-driven dispatch.
   */
  topology_id?: TopologyId;
}

export interface RetryPolicy {
  timeout_ms: number;
  max_attempts: number;
  backoff: "exponential" | "linear" | "none";
}

export type ExecutionPlanResolution =
  | { type: "resolved"; plan: ExecutionPlan }
  | { type: "no_host"; plan_trace: string[]; reason: string };

export interface ResolveExecutionPlanArgs {
  /** --codex CLI flag explicitly requested. */
  explicitCodex: boolean;
  ontoConfig: OntoConfig;
  /**
   * Environment variable snapshot. Defaults to process.env. Tests inject a
   * controlled map so ladder decisions are reproducible without mutating
   * the global env.
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Whether a Claude Code session is currently hosting this invocation.
   * Defaults to `process.env.CLAUDECODE === "1"`. Injected for test isolation.
   */
  claudeHost?: boolean;
  /**
   * Whether the codex binary + auth.json pair is reachable. Defaults to
   * `detectCodexBinaryAvailable()`. Injected for test isolation.
   */
  codexAvailable?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS =
  Number(process.env.ONTO_LLM_TIMEOUT_MS) || 120_000;
const DEFAULT_MAX_ATTEMPTS = 2;

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

/**
 * Plan-level STDERR log. Mirrors `[provider-ladder]` and `[model-call]`
 * patterns (PR #91 / PR #93) so operators can reconstruct the full decision
 * sequence from a single STDERR capture.
 *
 * No suppressor env var: decision rationale is load-bearing for review
 * reproducibility. Tests capture via vi.spyOn(process.stderr, "write").
 */
function emitPlanLog(line: string): void {
  process.stderr.write(`[plan] ${line}\n`);
}

// ---------------------------------------------------------------------------
// Codex auth introspection (shared with llm-caller.ts; duplicated for
// resolver independence — both seats converge on detectCodexBinaryAvailable
// but this resolver needs the chatgpt-OAuth distinction separately).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Ladder resolution
// ---------------------------------------------------------------------------

/**
 * Compute the ExecutionPlan by walking the context-separation ladder.
 *
 * Priority (higher rank = preferred, matches sketch §3.2):
 *   P0  Mock (ONTO_LLM_MOCK=1)                        — test only
 *   P1  Explicit config override (api_provider / host_runtime)
 *   P2  Codex CLI subprocess (S0) — --codex flag or detected + chatgpt OAuth
 *   P3  External HTTP API (S1) — requires explicit external_http_provider
 *       field; 3a anthropic, 3b openai, 3c litellm
 *   P4  Host nested spawn (S2) — opt-in via execution_realization=agent-teams
 *   Fail-fast when nothing is viable.
 */
export function resolveExecutionPlan(
  args: ResolveExecutionPlanArgs,
): ExecutionPlanResolution {
  const env = args.env ?? process.env;
  const claudeHost = args.claudeHost ?? env.CLAUDECODE === "1";
  const codexAvailable =
    args.codexAvailable ?? detectCodexBinaryAvailable();
  const trace: string[] = [];

  const log = (line: string): void => {
    emitPlanLog(line);
    trace.push(line);
  };

  const retry_policy: RetryPolicy = {
    timeout_ms: DEFAULT_TIMEOUT_MS,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    backoff: "exponential",
  };

  // P0: Mock — test envelope.
  if (env.ONTO_LLM_MOCK === "1") {
    log("P0 mock: matched (ONTO_LLM_MOCK=1)");
    return {
      type: "resolved",
      plan: {
        separation_rank: "S3",
        execution_realization: "mock",
        host_runtime: "mock",
        provider_identity: "mock",
        retry_policy,
        plan_trace: trace,
      },
    };
  }

  const configHost = args.ontoConfig.host_runtime;
  const configRealization = args.ontoConfig.execution_realization;

  // P1a: Explicit --codex flag. Overrides all other inputs.
  if (args.explicitCodex) {
    log("P1 explicit-codex: matched (--codex flag)");
    return resolveCodexPlan(log, trace, retry_policy, args.ontoConfig);
  }

  // P1b: config.host_runtime=codex. Semantically identical to --codex.
  if (configHost === "codex") {
    log("P1 explicit-config: matched (host_runtime=codex)");
    return resolveCodexPlan(log, trace, retry_policy, args.ontoConfig);
  }

  // P1c: config.host_runtime=claude. Host nested spawn (S2).
  if (configHost === "claude") {
    const realization: ExecutionRealization =
      configRealization === "subagent" || configRealization === "agent-teams"
        ? (configRealization as ExecutionRealization)
        : "agent-teams";
    log(
      `P1 explicit-config: matched (host_runtime=claude, realization=${realization})`,
    );
    return {
      type: "resolved",
      plan: {
        separation_rank: "S2",
        execution_realization: realization,
        host_runtime: "claude",
        provider_identity: "claude-code",
        retry_policy,
        plan_trace: trace,
      },
    };
  }

  // P1d: config.host_runtime explicitly names an external HTTP provider.
  if (
    configHost === "litellm" ||
    configHost === "anthropic" ||
    configHost === "openai"
  ) {
    log(
      `P1 explicit-config: matched (host_runtime=${configHost} → ts_inline_http)`,
    );
    return resolveExternalHttpPlan(log, trace, retry_policy, args.ontoConfig, {
      forcedProvider: configHost,
    });
  }

  // P1e: config.host_runtime=standalone. Forces ts_inline_http; provider
  // resolution follows external_http_provider / api_provider lookup.
  if (configHost === "standalone") {
    log("P1 explicit-config: host_runtime=standalone → ts_inline_http path");
    return resolveExternalHttpPlan(log, trace, retry_policy, args.ontoConfig);
  }

  // P1f: env ONTO_HOST_RUNTIME override.
  const envHost = env.ONTO_HOST_RUNTIME?.trim().toLowerCase();
  if (envHost === "codex") {
    log("P1 env-override: ONTO_HOST_RUNTIME=codex");
    return resolveCodexPlan(log, trace, retry_policy, args.ontoConfig);
  }
  if (envHost === "claude") {
    log("P1 env-override: ONTO_HOST_RUNTIME=claude → agent-teams");
    return {
      type: "resolved",
      plan: {
        separation_rank: "S2",
        execution_realization: "agent-teams",
        host_runtime: "claude",
        provider_identity: "claude-code",
        retry_policy,
        plan_trace: trace,
      },
    };
  }
  if (
    envHost === "litellm" ||
    envHost === "anthropic" ||
    envHost === "openai"
  ) {
    log(`P1 env-override: ONTO_HOST_RUNTIME=${envHost} → ts_inline_http`);
    return resolveExternalHttpPlan(
      log,
      trace,
      retry_policy,
      args.ontoConfig,
      { forcedProvider: envHost as "litellm" | "anthropic" | "openai" },
    );
  }
  if (envHost === "standalone") {
    log("P1 env-override: ONTO_HOST_RUNTIME=standalone → ts_inline_http");
    return resolveExternalHttpPlan(log, trace, retry_policy, args.ontoConfig);
  }

  // P2: Auto-detected Claude Code host (stay-in-host).
  if (claudeHost) {
    log("P2 auto: claudeHost=true → agent-teams / host-nested-spawn");
    return {
      type: "resolved",
      plan: {
        separation_rank: "S2",
        execution_realization: "agent-teams",
        host_runtime: "claude",
        provider_identity: "claude-code",
        retry_policy,
        plan_trace: trace,
      },
    };
  }

  // P3: Auto-detected codex (S0 preferred over S1 by separation rank).
  //
  // Note: detectCodexBinaryAvailable checks for binary-on-PATH + auth.json file
  // presence only — not auth content. This preserves the legacy Layer 1 judgment
  // (review-invoke's prior detectCodexAvailable), keeping "auth.json exists" as
  // sufficient for routing; content validation (chatgpt OAuth vs API key) stays
  // in callCodexCli at actual invocation time, matching the layer separation
  // the prior code established.
  if (codexAvailable) {
    log("P3 auto: codex binary + auth.json present → subprocess");
    return resolveCodexPlan(log, trace, retry_policy, args.ontoConfig);
  }
  log("P3 auto: codex binary unavailable → skip");

  // P4: subagent_llm config or external_http_provider makes ts_inline_http viable.
  if (args.ontoConfig.subagent_llm?.provider || hasExternalHttpConfig(args.ontoConfig)) {
    log("P4 auto: subagent_llm or external_http_provider present → ts_inline_http");
    return resolveExternalHttpPlan(log, trace, retry_policy, args.ontoConfig);
  }

  log("final: no viable path → no_host");
  return {
    type: "no_host",
    plan_trace: trace,
    reason: buildNoHostReason(),
  };
}

// ---------------------------------------------------------------------------
// Sub-resolvers
// ---------------------------------------------------------------------------

function resolveCodexPlan(
  log: (line: string) => void,
  trace: string[],
  retry_policy: RetryPolicy,
  config: OntoConfig,
): ExecutionPlanResolution {
  const modelId = config.codex?.model ?? config.model;
  log(
    `codex plan: separation_rank=S0 executor=subprocess model_id=${modelId ?? "(codex default)"}`,
  );
  return {
    type: "resolved",
    plan: {
      separation_rank: "S0",
      execution_realization: "subagent",
      host_runtime: "codex",
      provider_identity: "codex",
      ...(modelId ? { model_id: modelId } : {}),
      retry_policy,
      plan_trace: trace,
    },
  };
}

function resolveExternalHttpPlan(
  log: (line: string) => void,
  trace: string[],
  retry_policy: RetryPolicy,
  config: OntoConfig,
  opts?: { forcedProvider?: "litellm" | "anthropic" | "openai" },
): ExecutionPlanResolution {
  const providerField = pickExternalProviderField(config, opts);
  if (!providerField.provider) {
    log(
      "external-http: no provider identified (external_http_provider, api_provider, subagent_llm.provider all unset)",
    );
    return {
      type: "no_host",
      plan_trace: trace,
      reason: buildMissingExternalProviderReason(),
    };
  }

  const provider = providerField.provider;
  const modelId =
    (provider === "anthropic" && config.anthropic?.model) ||
    (provider === "openai" && config.openai?.model) ||
    (provider === "litellm" && config.litellm?.model) ||
    config.subagent_llm?.model ||
    config.model;
  const base_url =
    provider === "litellm"
      ? config.llm_base_url ?? config.subagent_llm?.base_url
      : config.subagent_llm?.base_url;

  log(
    `external-http plan: provider=${provider} source=${providerField.source} model_id=${modelId ?? "(unresolved)"} base_url=${base_url ?? "(default)"}`,
  );

  return {
    type: "resolved",
    plan: {
      separation_rank: "S1",
      execution_realization: "ts_inline_http",
      host_runtime: provider,
      provider_identity: provider,
      ...(modelId ? { model_id: modelId } : {}),
      ...(base_url ? { base_url } : {}),
      retry_policy,
      plan_trace: trace,
    },
  };
}

// ---------------------------------------------------------------------------
// Provider field lookup
// ---------------------------------------------------------------------------

interface ProviderFieldResult {
  provider: "anthropic" | "openai" | "litellm" | null;
  source: string;
}

function pickExternalProviderField(
  config: OntoConfig,
  opts?: { forcedProvider?: "litellm" | "anthropic" | "openai" },
): ProviderFieldResult {
  if (opts?.forcedProvider) {
    return { provider: opts.forcedProvider, source: "forced (config.host_runtime or env)" };
  }
  const ext = narrowExternalProvider(
    (config as { external_http_provider?: string }).external_http_provider,
  );
  if (ext) return { provider: ext, source: "external_http_provider" };
  const api = narrowExternalProvider(config.api_provider);
  if (api) return { provider: api, source: "api_provider" };
  const subagent = narrowExternalProvider(config.subagent_llm?.provider);
  if (subagent) return { provider: subagent, source: "subagent_llm.provider" };
  return { provider: null, source: "(none)" };
}

function narrowExternalProvider(
  value: string | undefined,
): "anthropic" | "openai" | "litellm" | null {
  if (value === "anthropic" || value === "openai" || value === "litellm") {
    return value;
  }
  return null;
}

function hasExternalHttpConfig(config: OntoConfig): boolean {
  return (
    Boolean((config as { external_http_provider?: string }).external_http_provider) ||
    Boolean(config.api_provider) ||
    Boolean(config.subagent_llm?.provider)
  );
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

function buildNoHostReason(): string {
  return [
    "Review execution plan을 해소할 수 없습니다.",
    "현재 감지 결과: Claude Code 세션 아님(CLAUDECODE unset), codex 바이너리 또는 ~/.codex/auth.json 부재, subagent_llm/external_http_provider/api_provider 모두 미설정.",
    "",
    "다음 중 한 가지로 해결하세요:",
    "  1. Claude Code 세션에서 `onto review` 재실행",
    "  2. codex CLI 설치 + `codex login` 후 재실행",
    "  3. `--codex` 플래그로 codex subprocess 강제",
    "  4. `.onto/config.yml` 에 host_runtime: claude 또는 codex 명시",
    "  5. `.onto/config.yml` 에 host_runtime: standalone + external_http_provider: <anthropic|openai|litellm>",
    "  6. `ONTO_HOST_RUNTIME=standalone` env + external_http_provider config",
  ].join("\n");
}

function buildMissingExternalProviderReason(): string {
  return [
    "External HTTP provider 미지정.",
    "`.onto/config.yml` 에 다음 중 하나를 추가하세요:",
    "  external_http_provider: anthropic    # 또는 openai | litellm",
    "  # 또는 기존 필드",
    "  api_provider: anthropic",
    "  # 또는",
    "  subagent_llm: { provider: anthropic, model: <model-id> }",
  ].join("\n");
}
