#!/usr/bin/env node

import { execSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { completeReviewSession } from "./complete-review-session.js";
import {
  executeReviewPromptExecution,
  type ReviewUnitExecutorConfig,
} from "./run-review-prompt-execution.js";
import type { PrepareOnlyResult } from "../review/artifact-types.js";
import { startReviewSession } from "./start-review-session.js";
import { spawnWatcherPane } from "./spawn-watcher.js";
import { generateReviewSessionId } from "../review/materializers.js";
import {
  fileExists,
  hasOptionFlag,
  normalizeDomainValue,
  readMultiOptionValuesFromArgv,
  readYamlDocument,
  readSingleOptionValueFromArgv,
} from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
import { resolveOntoHome } from "../discovery/onto-home.js";
import { resolveConfigChain, type OntoConfig } from "../discovery/config-chain.js";
import { loadCoreLensRegistry } from "../discovery/lens-registry.js";
import { detectCodexBinaryAvailable } from "../discovery/host-detection.js";

/**
 * Executor realization for review unit execution.
 *
 * - "codex":           codex CLI subprocess (codex-review-unit-executor.ts)
 * - "mock":            in-process deterministic stub (mock-review-unit-executor.ts)
 * - "ts_inline_http":  TS process directly calls LLM HTTP endpoint (Phase 2 of host
 *                      runtime decoupling). Selected automatically when
 *                      OntoConfig.subagent_llm is set or host_runtime is "standalone".
 *                      See `inline-http-review-unit-executor.ts`.
 */
type ExecutorRealization = "codex" | "mock" | "ts_inline_http";
type ReviewTargetScopeKind = "file" | "directory" | "bundle";
type ReviewMode = "light" | "full";
type BoundaryDecisionAction = "approve_external_boundary" | "rerun_target" | "cancel";

// PrepareOnlyResult is imported from artifact-types.ts (canonical type authority)
// OntoConfig is imported from discovery/config-chain.ts (single source of truth)

interface HostFacingPositionals {
  target?: string;
  requestedDomainToken?: string;
  intentText?: string;
}

interface ResolvedReviewInvokeInputs {
  requestedTarget: string;
  targetPath: string;
  resolvedTargetRefs: string[];
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind:
    | "single_text"
    | "directory_listing"
    | "bundle_member_texts";
  requestText: string;
  requestedDomainToken: string;
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
  bundleKind?: string;
  reviewMode: ReviewMode;
  reviewModeRecommendation: ReviewMode;
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
  filesystemAllowedRoots: string[];
}

interface ReviewInvokeRouteSummary {
  combined_entrypoint: "review:invoke";
  bounded_invoke_steps: string[];
  execution_realization: "subagent" | "agent-teams" | "ts_inline_http";
  host_runtime: "codex" | "claude" | "standalone" | "litellm" | "anthropic" | "openai";
  review_mode: ReviewMode;
  max_concurrent_lenses: number;
  concurrency_strategy: "bounded_parallel";
  synthesize_waits_for_all_lenses: true;
}

// Lens IDs derived from authority/core-lens-registry.yaml (single source of truth)
const _registry = loadCoreLensRegistry();
const FULL_REVIEW_LENS_IDS = _registry.full_review_lens_ids;
const LIGHT_REVIEW_LENS_IDS = _registry.light_review_lens_ids;

const KNOWN_PASSTHROUGH_OPTION_NAMES = [
  "project-root",
  "onto-home",
  "plugin-root",
  "session-id",
  "requested-target",
  "requested-domain-token",
  "entrypoint",
  "target-scope-kind",
  "primary-ref",
  "member-ref",
  "bundle-kind",
  "intent-summary",
  "domain-recommendation",
  "domain-selection-required",
  "review-mode-recommendation",
  "always-include-lens-id",
  "recommended-lens-id",
  "rationale",
  "ambiguity-note",
  "resolved-target-ref",
  "domain-final-value",
  "domain-selection-mode",
  "review-mode",
  "lens-id",
  "binding-note",
  "web-research-policy",
  "repo-exploration-policy",
  "recursive-reference-expansion-policy",
  "filesystem-allowed-root",
  "materialized-kind",
  "materialized-ref",
  "system-purpose-ref",
  "domain-context-ref",
  "learning-context-ref",
  "role-definition-ref",
  "execution-rule-ref",
  "excluded-name",
  "max-listing-depth",
  "max-listing-entries",
  "max-embed-lines",
] as const;

const KNOWN_PASSTHROUGH_FLAG_NAMES = ["codex"] as const;

const KNOWN_INVOKE_ONLY_OPTION_NAMES = [
  "request-text",
  "executor-realization",
  "executor-bin",
  "executor-arg",
  "synthesize-executor-realization",
  "synthesize-executor-bin",
  "synthesize-executor-arg",
  "max-concurrent-lenses",
  "filesystem-boundary-decision",
  "diff-range",
  "model",
  "reasoning-effort",
  "domain",
] as const;

const KNOWN_INVOKE_ONLY_FLAG_NAMES = ["codex", "prepare-only", "no-watch", "no-domain"] as const;

function requireString(
  value: string | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function packageManagerBin(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

// Single source for executor script names. Used by both npm-run and direct-path resolution.
const EXECUTOR_SCRIPT_FILENAMES: Record<ExecutorRealization, string> = {
  codex: "codex-review-unit-executor",
  mock: "mock-review-unit-executor",
  ts_inline_http: "inline-http-review-unit-executor",
};

const EXECUTOR_NPM_SCRIPTS: Record<ExecutorRealization, string> = {
  codex: "review:codex-unit-executor",
  mock: "review:mock-unit-executor",
  ts_inline_http: "review:inline-http-unit-executor",
};

function resolveExecutorScript(realization: ExecutorRealization): string {
  return EXECUTOR_NPM_SCRIPTS[realization] ?? "review:mock-unit-executor";
}

function resolveDirectExecutorPath(
  realization: ExecutorRealization,
  ontoHome: string,
): { bin: string; scriptPath: string } | null {
  const filename = EXECUTOR_SCRIPT_FILENAMES[realization];
  if (!filename) return null;

  // Prefer compiled dist/ if available
  const distPath = path.join(
    ontoHome, "dist", "core-runtime", "cli", `${filename}.js`,
  );
  if (fsSync.existsSync(distPath)) {
    return { bin: "node", scriptPath: distPath };
  }

  // Dev mode: use tsx with source
  const srcPath = path.join(
    ontoHome, "src", "core-runtime", "cli", `${filename}.ts`,
  );
  const tsxBin = path.join(ontoHome, "node_modules", ".bin", "tsx");
  if (fsSync.existsSync(srcPath) && fsSync.existsSync(tsxBin)) {
    return { bin: tsxBin, scriptPath: srcPath };
  }

  return null;
}

function buildExecutorConfigFromRealization(
  realization: ExecutorRealization,
  ontoHome?: string,
): ReviewUnitExecutorConfig {
  // When ontoHome is available, use direct script paths (global CLI path)
  if (typeof ontoHome === "string" && ontoHome.length > 0) {
    const direct = resolveDirectExecutorPath(realization, ontoHome);
    if (direct) {
      // No "--" separator for direct invocation. The "--" is only needed
      // for npm run (to separate npm args from script args). With direct
      // tsx/node invocation, "--" would be interpreted by parseArgs as
      // end-of-options, causing all subsequent args to be treated as
      // positional — triggering "Unexpected argument" errors.
      return { bin: direct.bin, args: [direct.scriptPath] };
    }
  }

  // Legacy npm run fallback (when invoked via npm run from onto repo)
  return {
    bin: packageManagerBin(),
    args: ["run", resolveExecutorScript(realization), "--"],
  };
}

function stripOptionsFromArgv(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): string[] {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const stripped: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (flagTokens.has(token)) {
      continue;
    }
    if (!optionTokens.has(token)) {
      stripped.push(token);
      continue;
    }

    const nextToken = argv[index + 1];
    if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
      index += 1;
    }
  }

  return stripped;
}

function splitArgvIntoOptionsAndPositionals(
  argv: string[],
  optionNames: string[],
  flagNames: string[] = [],
): {
  optionTokens: string[];
  positionals: string[];
} {
  const optionTokens = new Set(optionNames.map((optionName) => `--${optionName}`));
  const flagTokens = new Set(flagNames.map((flagName) => `--${flagName}`));
  const preservedOptions: string[] = [];
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string") {
      continue;
    }
    if (token === "--") {
      continue;
    }
    if (flagTokens.has(token)) {
      preservedOptions.push(token);
      continue;
    }
    if (optionTokens.has(token)) {
      preservedOptions.push(token);
      const nextToken = argv[index + 1];
      if (typeof nextToken === "string" && !nextToken.startsWith("--")) {
        preservedOptions.push(nextToken);
        index += 1;
      }
      continue;
    }
    positionals.push(token);
  }

  return {
    optionTokens: preservedOptions,
    positionals,
  };
}

function ensureSessionIdArg(argv: string[]): string[] {
  const sessionId = readSingleOptionValueFromArgv(argv, "session-id");
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return argv;
  }
  return [...argv, "--session-id", generateReviewSessionId()];
}

function appendExecutorModelArgs(
  config: ReviewUnitExecutorConfig,
  argv: string[],
  ontoConfig?: OntoConfig,
): ReviewUnitExecutorConfig {
  // Mock executor does not accept --model/--reasoning-effort flags.
  // Skip model/effort args when the executor targets the mock script.
  // Note: with the direct-executor path strategy, bin is "node" / "tsx" and
  // the mock filename lives in args[0] (the script path), so we have to
  // probe both fields.
  const isMock =
    config.bin.includes("mock-review-unit-executor") ||
    config.args.some((arg) => arg.includes("mock-review-unit-executor"));
  if (isMock) return config;

  const args = [...config.args];
  // Resolution: CLI flag > top-level config > codex namespace (fallback for codex mode)
  const model =
    readSingleOptionValueFromArgv(argv, "model") ??
    ontoConfig?.model ??
    ontoConfig?.codex?.model;
  if (typeof model === "string" && model.length > 0) {
    args.push("--model", model);
  }
  const reasoningEffort =
    readSingleOptionValueFromArgv(argv, "reasoning-effort") ??
    ontoConfig?.reasoning_effort ??
    ontoConfig?.codex?.effort;
  if (typeof reasoningEffort === "string" && reasoningEffort.length > 0) {
    args.push("--reasoning-effort", reasoningEffort);
  }
  return { bin: config.bin, args };
}

/**
 * Phase 2 wiring: append subagent_llm config fields as inline-http executor
 * CLI flags. Called when the auto-selection logic picks ts_inline_http based
 * on subagent_llm config or standalone host detection.
 *
 * Translates OntoConfig.subagent_llm → inline-http executor flags:
 *   subagent_llm.provider → --provider
 *   subagent_llm.model → --model
 *   subagent_llm.base_url → --llm-base-url
 *   subagent_llm.max_tokens → --max-tokens
 *   subagent_llm.embed_domain_docs → --embed-domain-docs
 *
 * Falls back to top-level api_provider/model/llm_base_url when subagent_llm
 * fields are unset — so a user with `api_provider: litellm; model: llama-8b`
 * and `host_runtime: standalone` (no subagent_llm block) still gets a
 * working executor.
 */
function appendSubagentLlmArgs(
  config: ReviewUnitExecutorConfig,
  ontoConfig?: OntoConfig,
): ReviewUnitExecutorConfig {
  const args = [...config.args];
  const sub = ontoConfig?.subagent_llm;

  const provider = sub?.provider ?? ontoConfig?.api_provider;
  if (typeof provider === "string" && provider.length > 0) {
    args.push("--provider", provider);
  }

  const model = sub?.model ?? ontoConfig?.model;
  if (typeof model === "string" && model.length > 0) {
    args.push("--model", model);
  }

  const baseUrl = sub?.base_url ?? ontoConfig?.llm_base_url;
  if (typeof baseUrl === "string" && baseUrl.length > 0) {
    args.push("--llm-base-url", baseUrl);
  }

  const maxTokens = sub?.max_tokens;
  if (typeof maxTokens === "number" && maxTokens > 0) {
    args.push("--max-tokens", String(maxTokens));
  }

  if (sub?.embed_domain_docs === true) {
    args.push("--embed-domain-docs");
  }

  return { bin: config.bin, args };
}

// ---------------------------------------------------------------------------
// Execution realization auto-resolution (stay-in-host)
//
// Decides whether `onto review` should run the codex CLI path itself or hand
// off to the Claude host via `onto coordinator start`. Three inputs matter:
//
//   - explicit CLI `--codex` flag                        → self (codex path)
//   - OntoConfig.host_runtime / execution_realization    → explicit override
//   - auto detection (CLAUDECODE=1 / codex on PATH)      → stay-in-host
//
// Priority rank between hosts is NOT hardcoded here — user situation varies
// (subscription mix, context headroom, local hardware). Default policy prefers
// the current host ecosystem; cross-host switches require explicit opt-in.
// Design: development-records/plan/20260415T1700-execution-realization-priority-design.md
// Authority: authority/core-lexicon.yaml:LlmAgentSpawnRealization
// ---------------------------------------------------------------------------

export interface ResolvedExecutionProfile {
  execution_realization: "subagent" | "agent-teams" | "ts_inline_http";
  host_runtime: "codex" | "claude" | "standalone" | "litellm" | "anthropic" | "openai";
}

export type ExecutionProfileResolution =
  | { type: "resolved"; profile: ResolvedExecutionProfile }
  | { type: "no_host" };

export type ExecutionRealizationHandoff =
  | { type: "self"; profile: ResolvedExecutionProfile }
  | { type: "coordinator_start"; profile: ResolvedExecutionProfile }
  | { type: "no_host" };

/**
 * Legacy boolean predicate. Returns true when host is detected as Claude Code.
 *
 * NOTE: signal set differs from upstream `isClaudeCodeHost()` — this preserves
 * the legacy "CLAUDECODE === '1'" check exclusively, because some review
 * call-sites rely on the narrower signal (CLAUDECODE alone) to decide whether
 * to emit a coordinator-start handoff JSON. Broadening this to all 3 Claude
 * env signals would change auto-resolution behavior for users who set
 * CLAUDE_PROJECT_DIR without the rest. See `discovery/host-detection.ts`
 * for the full multi-signal `isClaudeCodeHost()` and capability matrix.
 */
export function detectClaudeCodeHost(): boolean {
  return process.env.CLAUDECODE === "1";
}

/**
 * Legacy boolean predicate. Returns true when codex binary + auth.json are
 * both present. Wraps the canonical seat in `discovery/host-detection.ts`.
 */
export function detectCodexAvailable(): boolean {
  return detectCodexBinaryAvailable();
}

/**
 * Resolves the (execution_realization, host_runtime) profile without deciding
 * action (handoff vs self-execute). This is the single seat that writes
 * {realization, host} into session artifacts so Claude-host runs don't get
 * recorded as `subagent + codex` anymore.
 *
 * LiteLLM is type-recognized (`ReviewHostRuntime` includes "litellm") but
 * review wiring is deferred — explicit `host_runtime: "litellm"` config is
 * fail-closed here rather than silently falling through.
 */
export function resolveExecutionProfile(args: {
  explicitCodex: boolean;
  ontoConfig: OntoConfig;
}): ExecutionProfileResolution {
  if (args.explicitCodex) {
    return { type: "resolved", profile: { execution_realization: "subagent", host_runtime: "codex" } };
  }

  const configHost = args.ontoConfig.host_runtime;
  const configRealization = args.ontoConfig.execution_realization;

  // Phase 2 wiring: litellm and other direct-call hosts are now valid.
  // Route to ts_inline_http executor (same as standalone).
  if (configHost === "litellm" || configHost === "anthropic" || configHost === "openai") {
    return { type: "resolved", profile: { execution_realization: "ts_inline_http", host_runtime: configHost as "litellm" | "anthropic" | "openai" } };
  }

  if (configHost === "claude") {
    const realization =
      configRealization === "subagent" || configRealization === "agent-teams"
        ? configRealization
        : "agent-teams";
    return { type: "resolved", profile: { execution_realization: realization, host_runtime: "claude" } };
  }
  if (configHost === "codex") {
    return { type: "resolved", profile: { execution_realization: "subagent", host_runtime: "codex" } };
  }
  if (configHost === "standalone") {
    return { type: "resolved", profile: { execution_realization: "ts_inline_http", host_runtime: "standalone" } };
  }

  // ONTO_HOST_RUNTIME env var: explicit override that wins over auto-detection.
  // This bridges Phase 1 host-detection (discovery/host-detection.ts) with
  // the execution profile resolution. Without this, a user inside a Claude Code
  // session cannot force standalone mode via env var — CLAUDECODE=1 always wins.
  const envHostRuntime = process.env.ONTO_HOST_RUNTIME?.trim().toLowerCase();
  if (envHostRuntime === "standalone") {
    return { type: "resolved", profile: { execution_realization: "ts_inline_http", host_runtime: "standalone" } };
  }
  if (envHostRuntime === "litellm" || envHostRuntime === "anthropic" || envHostRuntime === "openai") {
    return { type: "resolved", profile: { execution_realization: "ts_inline_http", host_runtime: envHostRuntime as "litellm" | "anthropic" | "openai" } };
  }
  if (envHostRuntime === "claude") {
    return { type: "resolved", profile: { execution_realization: "agent-teams", host_runtime: "claude" } };
  }
  if (envHostRuntime === "codex") {
    return { type: "resolved", profile: { execution_realization: "subagent", host_runtime: "codex" } };
  }

  // Auto-resolution (stay-in-host). Within Claude host, agent_teams_claude is
  // the default preferred; the subject session falls to subagent_claude (flat)
  // if TeamCreate is unavailable — that decision is the subject's, not onto's.
  if (detectClaudeCodeHost()) {
    return { type: "resolved", profile: { execution_realization: "agent-teams", host_runtime: "claude" } };
  }
  if (detectCodexAvailable()) {
    return { type: "resolved", profile: { execution_realization: "subagent", host_runtime: "codex" } };
  }

  // Phase 2 wiring: when no host signal is detected AND subagent_llm config
  // exists, treat as standalone (TS process orchestrates with direct LLM call).
  // Without subagent_llm, we can't meaningfully execute — fall through to no_host.
  if (args.ontoConfig.subagent_llm?.provider) {
    return { type: "resolved", profile: { execution_realization: "ts_inline_http", host_runtime: "standalone" } };
  }

  return { type: "no_host" };
}

/**
 * Wraps resolveExecutionProfile with action decision:
 * - prepareOnly=true + resolved Claude → "self" (coordinator-state-machine is
 *   already calling this internally; don't emit handoff JSON, just record the
 *   profile into session artifacts)
 * - prepareOnly=false + resolved Claude → "coordinator_start" (emit handoff)
 * - resolved codex → "self" (self-execute via codex subprocess)
 * - resolved standalone → "self" (self-execute via ts_inline_http)
 * - no_host → "no_host"
 */
export function resolveExecutionRealizationHandoff(args: {
  explicitCodex: boolean;
  prepareOnly: boolean;
  ontoConfig: OntoConfig;
}): ExecutionRealizationHandoff {
  const profile = resolveExecutionProfile({
    explicitCodex: args.explicitCodex,
    ontoConfig: args.ontoConfig,
  });
  if (profile.type === "no_host") return { type: "no_host" };

  // Claude host: emit handoff unless we're in prepare-only mode (coordinator
  // state machine is already calling us — it needs artifacts prepared, not a
  // handoff JSON written to stdout).
  if (profile.profile.host_runtime === "claude" && !args.prepareOnly) {
    return { type: "coordinator_start", profile: profile.profile };
  }
  return { type: "self", profile: profile.profile };
}

function buildNoHostDetectedError(): Error {
  return new Error(
    [
      "Review execution realization을 해소할 수 없습니다.",
      "현재 host 감지 결과: Claude Code 세션 아님(CLAUDECODE unset), codex CLI 미설치 또는 ~/.codex/auth.json 부재, subagent_llm 미설정.",
      "",
      "다음 중 한 가지로 해결하세요:",
      "  1. Claude Code 세션에서 `onto review` 재실행 (CLAUDECODE=1 감지 시 coordinator-start 안내)",
      "  2. codex CLI 설치 + `codex login` 후 재실행",
      "  3. `--codex` 플래그로 codex path 강제 (auth·binary 있어야 성공)",
      "  4. `.onto/config.yml` 에 host_runtime: claude 또는 codex 명시",
      "  5. `.onto/config.yml` 에 host_runtime: standalone + subagent_llm: { provider, model } 설정 (LiteLLM/Anthropic/OpenAI 직접 호출)",
      "  6. `ONTO_HOST_RUNTIME=standalone` env var + `subagent_llm` config 설정",
    ].join("\n"),
  );
}

function emitCoordinatorStartHandoff(args: {
  preferredRealization: "subagent" | "agent-teams" | "ts_inline_http";
  requestedTarget: string;
  requestText: string;
}): void {
  // Shell-escape: wrap in double quotes and escape embedded double quotes/backslashes.
  const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  // preferred: plan-time recommendation based on onto's resolution policy
  //   (typically agent-teams nested when TeamCreate is expected to be available).
  // actual:    deferred — determined by subject session at TeamCreate attempt time.
  //   onto child process cannot introspect the subject session's capability.
  //   coordinator-state-machine then records the realized path into session
  //   artifacts (binding.yaml / execution-plan.yaml / session-metadata.yaml).
  const payload = {
    handoff: "coordinator-start",
    host_runtime: "claude" as const,
    preferred_realization: args.preferredRealization,
    actual_realization: "deferred_to_subject_session" as const,
    requested_target: args.requestedTarget,
    request_text: args.requestText,
    next_action: {
      cli: `onto coordinator start ${q(args.requestedTarget)} ${q(args.requestText)}`,
      orchestration_guidance: {
        preferred:
          "TeamCreate로 coordinator subagent를 nested spawn, coordinator가 Agent tool로 9 lens + synthesize subagent 추가 nested spawn (canonical path = agent_teams_claude).",
        fallback:
          "TeamCreate 비가용 환경에서는 주체자 세션이 Agent tool로 lens subagent를 직접 spawn 가능 (canonical path = subagent_claude). coordinator state machine은 양쪽 모두 수용.",
        recording_note:
          "주체자가 실제 선택한 realization은 coordinator-state-machine이 session artifact(binding.yaml 등)에 기록. 본 handoff payload의 preferred_realization은 plan-time 권장이지 actual truth가 아님.",
      },
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

function resolveExecutorConfig(
  argv: string[],
  optionPrefix: "" | "synthesize-",
  ontoConfig?: OntoConfig,
  ontoHome?: string,
): ReviewUnitExecutorConfig {
  const optionPrefixLabel = optionPrefix.length > 0 ? optionPrefix : "";
  const explicitBin = readSingleOptionValueFromArgv(
    argv,
    `${optionPrefixLabel}executor-bin`,
  );
  const explicitArgs = readMultiOptionValuesFromArgv(
    argv,
    `${optionPrefixLabel}executor-arg`,
  );
  if (typeof explicitBin === "string" && explicitBin.length > 0) {
    return appendExecutorModelArgs(
      { bin: explicitBin, args: explicitArgs },
      argv,
      ontoConfig,
    );
  }

  // Read the prefixed flag first, then fall back to the non-prefixed flag
  // when running in synthesize mode. The test suite (and most operators)
  // pass `--executor-realization mock` and expect both lens AND synthesize
  // to honor it.
  const explicitRealization =
    readSingleOptionValueFromArgv(argv, `${optionPrefixLabel}executor-realization`) ??
    (optionPrefixLabel.length > 0
      ? readSingleOptionValueFromArgv(argv, "executor-realization")
      : undefined);
  if (explicitRealization === "codex" || explicitRealization === "mock" || explicitRealization === "ts_inline_http") {
    return appendExecutorModelArgs(
      buildExecutorConfigFromRealization(explicitRealization, ontoHome),
      argv,
      ontoConfig,
    );
  }
  if (
    typeof explicitRealization === "string" &&
    explicitRealization.length > 0
  ) {
    throw new Error(
      `Unsupported --${optionPrefixLabel}executor-realization: ${explicitRealization}. ` +
        `Supported values: codex, mock, ts_inline_http. Claude host runs (agent_teams_claude / subagent_claude) are routed via coordinator-start handoff when CLAUDECODE=1 is detected. See authority/core-lexicon.yaml:LlmAgentSpawnRealization.`,
    );
  }

  const configRealization = ontoConfig?.executor_realization;
  if (configRealization === "codex" || configRealization === "mock" || configRealization === "ts_inline_http") {
    return appendExecutorModelArgs(
      buildExecutorConfigFromRealization(configRealization as ExecutorRealization, ontoHome),
      argv,
      ontoConfig,
    );
  }
  if (typeof configRealization === "string" && configRealization.length > 0) {
    throw new Error(
      `Unsupported executor_realization in config: ${configRealization}. ` +
        `Supported values: codex, mock, ts_inline_http. Claude host runs (agent_teams_claude / subagent_claude) are routed via coordinator-start handoff when CLAUDECODE=1 is detected. See authority/core-lexicon.yaml:LlmAgentSpawnRealization.`,
    );
  }

  // Phase 2 wiring: auto-select ts_inline_http executor when:
  //   1. subagent_llm config is set (user explicitly wants cross-host subagent), or
  //   2. host_runtime is standalone (no host tool ecosystem → must use direct call)
  // Precedence: this check comes AFTER explicit --executor-realization and config
  // executor_realization, so explicit choices always win.
  const subagentLlm = ontoConfig?.subagent_llm;
  const hostRuntime = ontoConfig?.host_runtime;
  if (
    (subagentLlm && typeof subagentLlm.provider === "string" && subagentLlm.provider.length > 0) ||
    hostRuntime === "standalone"
  ) {
    return appendSubagentLlmArgs(
      buildExecutorConfigFromRealization("ts_inline_http", ontoHome),
      ontoConfig,
    );
  }

  return appendExecutorModelArgs(
    buildExecutorConfigFromRealization("codex", ontoHome),
    argv,
    ontoConfig,
  );
}

async function readOntoConfig(projectRoot: string): Promise<OntoConfig> {
  const configPath = path.join(projectRoot, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return {};
  }
  const raw = await readYamlDocument<Record<string, unknown>>(configPath);
  if (raw === null || typeof raw !== "object") {
    console.warn(`[onto] Warning: ${configPath} is not a valid YAML object. Using defaults.`);
    return {};
  }
  return raw as OntoConfig;
}

function parseHostFacingPositionals(positionals: string[]): HostFacingPositionals {
  if (positionals.length === 0) {
    return {};
  }

  const [target, second, ...rest] = positionals;
  if (typeof target !== "string" || target.length === 0) {
    return {};
  }

  if (typeof second === "string" && second.startsWith("@")) {
    return {
      target,
      requestedDomainToken: second,
      intentText: rest.join(" ").trim(),
    };
  }

  return {
    target,
    intentText: [second, ...rest].filter((value) => typeof value === "string").join(" ").trim(),
  };
}

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  let resolvedCandidate: string;
  let resolvedRoot: string;
  try {
    resolvedCandidate = fsSync.realpathSync(candidatePath);
    resolvedRoot = fsSync.realpathSync(rootPath);
  } catch {
    resolvedCandidate = path.resolve(candidatePath);
    resolvedRoot = path.resolve(rootPath);
  }
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === "") {
    return true;
  }
  if (relative.startsWith("..")) {
    return false;
  }
  return !path.isAbsolute(relative);
}

function normalizeFilesystemAllowedRoot(
  root: string,
  defaultProjectRoot: string,
): string {
  if (path.isAbsolute(root)) {
    return path.resolve(root);
  }
  return path.resolve(defaultProjectRoot, root);
}

function normalizeFilesystemAllowedRoots(
  filesystemAllowedRoots: string[],
  defaultProjectRoot: string,
): string[] {
  const resolved = filesystemAllowedRoots.length > 0
    ? filesystemAllowedRoots.map((root) => normalizeFilesystemAllowedRoot(
      root,
      defaultProjectRoot,
    ))
    : [path.resolve(defaultProjectRoot)];
  const deduped: string[] = [];
  for (const root of resolved) {
    if (!deduped.includes(root)) {
      deduped.push(root);
    }
  }
  return deduped;
}

function isInsideAnyDeclaredFilesystemRoot(
  targetPath: string,
  allowedRoots: string[],
): boolean {
  return allowedRoots.some((allowedRoot) => isPathInsideRoot(targetPath, allowedRoot));
}

function deriveFilesystemBoundaryFromTarget(
  targetPath: string,
  targetScopeKind: ReviewTargetScopeKind,
): string {
  return targetScopeKind === "file"
    ? path.dirname(targetPath)
    : targetPath;
}

async function promptForFilesystemBoundaryDecision(
  requestedTarget: string,
  absoluteTargetPath: string,
  projectRoot: string,
): Promise<{
  action: BoundaryDecisionAction;
}> {
  const promptText = [
    "Requested review target is outside project root.",
    `project-root: ${projectRoot}`,
    `requested target: ${requestedTarget}`,
    `resolved absolute target: ${absoluteTargetPath}`,
    "This target is outside the default filesystem boundary and needs an explicit decision.",
    "1) Continue with this exact target and approve an explicit filesystem boundary.",
    "2) Cancel and rerun using a project-relative target path.",
    "3) Cancel and stop execution.",
    "Enter 1, 2, or 3:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer === "1" || /^(approve|yes|y)$/i.test(answer)) {
        return {
          action: "approve_external_boundary",
        };
      }
      if (answer === "2") {
        return { action: "rerun_target" };
      }
      if (answer === "3" || /^(cancel|no|n)$/i.test(answer)) {
        return { action: "cancel" };
      }
      console.error(`Invalid boundary decision: ${answer}. Enter 1, 2, or 3.`);
    }
  } finally {
    readline.close();
  }
}

function parseFilesystemBoundaryDecision(
  argv: string[],
): BoundaryDecisionAction | undefined {
  const rawDecision = readSingleOptionValueFromArgv(
    argv,
    "filesystem-boundary-decision",
  );
  const decision = typeof rawDecision === "string" ? rawDecision.toLowerCase() : "";
  if (decision === "approve" || decision === "approve_external_boundary") {
    return "approve_external_boundary";
  }
  if (decision === "rerun" || decision === "rerun_target") {
    return "rerun_target";
  }
  if (decision === "cancel") {
    return "cancel";
  }
  if (decision.length > 0) {
    throw new Error(
      `Invalid --filesystem-boundary-decision value: ${rawDecision}. Use approve, rerun, or cancel.`,
    );
  }
  return undefined;
}

function normalizeDomainToken(domainValue: string): string | null {
  const trimmed = domainValue.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (["-", "@-", "none"].includes(trimmed)) {
    return "@-";
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function collectConfiguredDomainTokens(ontoConfig: OntoConfig): string[] {
  const collected: string[] = [];
  const pushToken = (domainValue: string | undefined): void => {
    if (typeof domainValue !== "string") {
      return;
    }
    const normalized = normalizeDomainToken(domainValue);
    if (!normalized || collected.includes(normalized)) {
      return;
    }
    collected.push(normalized);
  };
  const pushTokenList = (domainValues: string[] | string | undefined): void => {
    if (Array.isArray(domainValues)) {
      for (const domainValue of domainValues) {
        pushToken(domainValue);
      }
      return;
    }
    if (typeof domainValues === "string") {
      const splitValues = domainValues.includes(",")
        ? domainValues.split(",")
        : [domainValues];
      for (const domainValue of splitValues) {
        pushToken(domainValue);
      }
    }
  };

  pushToken(ontoConfig.domain);
  pushTokenList(ontoConfig.secondary_domains);
  pushTokenList(ontoConfig.domains);
  return collected;
}

async function promptForDomainSelection(
  configuredDomainTokens: string[],
): Promise<string> {
  const optionTokens = configuredDomainTokens.includes("@-")
    ? [...configuredDomainTokens]
    : [...configuredDomainTokens, "@-"];
  const optionLines = optionTokens.map(
    (domainToken, index) => `${index + 1}. ${domainToken}`,
  );
  const promptText = [
    "Multiple configured domains are available for this review.",
    "Select a domain token for this session:",
    ...optionLines,
    "Enter a number or domain token:",
  ].join("\n");

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = (await readline.question(`${promptText}\n> `)).trim();
      if (answer.length === 0) {
        continue;
      }
      const numericIndex = Number.parseInt(answer, 10);
      if (Number.isFinite(numericIndex)) {
        const selectedToken = optionTokens[numericIndex - 1];
        if (selectedToken) {
          return selectedToken;
        }
      }
      const normalizedAnswer = normalizeDomainToken(answer);
      if (normalizedAnswer && optionTokens.includes(normalizedAnswer)) {
        return normalizedAnswer;
      }
      console.error(
        `Invalid domain selection: ${answer}. Choose one of ${optionTokens.join(", ")}`,
      );
    }
  } finally {
    readline.close();
  }
}

async function resolveDomainSelection(
  requestedDomainToken: string,
  ontoConfig: OntoConfig,
): Promise<{
  domainRecommendation: string;
  domainFinalValue: string;
  domainSelectionMode: string;
  domainSelectionRequired: boolean;
}> {
  if (requestedDomainToken.length > 0) {
    return {
      domainRecommendation: requestedDomainToken,
      domainFinalValue: normalizeDomainValue(requestedDomainToken),
      domainSelectionMode: "explicit_token",
      domainSelectionRequired: false,
    };
  }

  const configuredDomainTokens = collectConfiguredDomainTokens(ontoConfig);
  if (configuredDomainTokens.length === 0) {
    return {
      domainRecommendation: "@-",
      domainFinalValue: "none",
      domainSelectionMode: "no_domain_default",
      domainSelectionRequired: false,
    };
  }

  if (configuredDomainTokens.length === 1) {
    const selectedToken = configuredDomainTokens[0]!;
    return {
      domainRecommendation: selectedToken,
      domainFinalValue: normalizeDomainValue(selectedToken),
      domainSelectionMode: "project_default",
      domainSelectionRequired: false,
    };
  }

  const domainRecommendation = configuredDomainTokens[0]!;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      [
        "Multiple configured domains are available, but interactive domain selection is unavailable in this non-interactive environment.",
        `Configured domains: ${configuredDomainTokens.join(", ")}`,
        "Pass an explicit domain token such as `@ontology` or `@-`.",
      ].join("\n"),
    );
  }

  const selectedToken = await promptForDomainSelection(configuredDomainTokens);
  return {
    domainRecommendation,
    domainFinalValue: normalizeDomainValue(selectedToken),
    domainSelectionMode: "interactive_selection",
    domainSelectionRequired: true,
  };
}

function resolveReviewMode(argv: string[], ontoConfig?: OntoConfig): ReviewMode {
  const explicitValue = readSingleOptionValueFromArgv(argv, "review-mode");
  if (explicitValue === "light" || explicitValue === "full") {
    return explicitValue;
  }
  const configValue = ontoConfig?.review_mode;
  if (configValue === "light" || configValue === "full") {
    return configValue;
  }
  return "full";
}

function resolveLensDefaultsForReviewMode(reviewMode: ReviewMode): {
  resolvedLensIds: string[];
  alwaysIncludeLensIds: string[];
  recommendedLensIds: string[];
  rationale: string[];
} {
  if (reviewMode === "light") {
    return {
      resolvedLensIds: [...LIGHT_REVIEW_LENS_IDS],
      alwaysIncludeLensIds: [..._registry.always_include_lens_ids],
      recommendedLensIds: ["logic", "pragmatics", "evolution"],
      rationale: [
        "host-facing positional invoke currently defaults light review to logic, pragmatics, evolution, and axiology.",
      ],
    };
  }

  return {
    resolvedLensIds: [...FULL_REVIEW_LENS_IDS],
    alwaysIncludeLensIds: ["axiology"],
    recommendedLensIds: [...FULL_REVIEW_LENS_IDS],
    rationale: [
      "host-facing positional invoke currently defaults to full 9-lens review until interactive interpretation is productized.",
    ],
  };
}

async function resolveTargetInput(
  projectRoot: string,
  requestedTarget: string,
  explicitFilesystemAllowedRoots: string[],
  argv: string[],
): Promise<{
  absoluteTargetPath: string;
  targetScopeKind: ReviewTargetScopeKind;
  materializedKind: "single_text" | "directory_listing";
  filesystemAllowedRoots: string[];
}> {
  const absoluteTargetPath = path.resolve(projectRoot, requestedTarget);
  const declaredFilesystemAllowedRoots = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  const targetStats = await fs.stat(absoluteTargetPath);
  const targetScopeKind = targetStats.isDirectory() ? "directory" : "file";
  const materializedKind = targetStats.isDirectory()
    ? "directory_listing"
    : "single_text";
  const derivedBoundaryRoot = deriveFilesystemBoundaryFromTarget(
    absoluteTargetPath,
    targetScopeKind,
  );

  if (
    !isInsideAnyDeclaredFilesystemRoot(
      absoluteTargetPath,
      declaredFilesystemAllowedRoots,
    )
  ) {
    const nonInteractiveDecision = parseFilesystemBoundaryDecision(argv);
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      if (nonInteractiveDecision === "approve_external_boundary") {
        if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
          declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
        }
        return {
          absoluteTargetPath,
          targetScopeKind,
          materializedKind,
          filesystemAllowedRoots: declaredFilesystemAllowedRoots,
        };
      }
      if (nonInteractiveDecision === "rerun_target") {
        throw new Error(
          [
            "Please rerun review using a repo-relative target",
            `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
            "or pass --filesystem-boundary-decision=rerun_target with corrected target.",
          ].join("\n"),
        );
      }
      if (nonInteractiveDecision === "cancel") {
        throw new Error(
          [
            "Review canceled by user decision.",
            "Re-run with an alternative target or explicit boundary decision.",
          ].join("\n"),
        );
      }
      console.error(
        [
          "[onto] Auto-approving external filesystem boundary:",
          `  project-root: ${projectRoot}`,
          `  resolved target: ${absoluteTargetPath}`,
          `  approved root: ${derivedBoundaryRoot}`,
          "  (pass --filesystem-boundary-decision cancel to prevent this)",
        ].join("\n"),
      );
      if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
        declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
      }
      return {
        absoluteTargetPath,
        targetScopeKind,
        materializedKind,
        filesystemAllowedRoots: declaredFilesystemAllowedRoots,
      };
    }
    const boundaryDecision = await promptForFilesystemBoundaryDecision(
      requestedTarget,
      absoluteTargetPath,
      projectRoot,
    );
    if (boundaryDecision.action === "rerun_target") {
      throw new Error(
        [
          "Please rerun review using a repo-relative target",
          `within ${projectRoot}, for example: ${path.relative(projectRoot, absoluteTargetPath)}`,
        ].join("\n"),
      );
    }
    if (boundaryDecision.action === "cancel") {
      throw new Error(
        [
          "Review canceled by user decision.",
          "If you want to review this target, choose option 1 in an interactive run.",
        ].join("\n"),
      );
    }
    if (!declaredFilesystemAllowedRoots.includes(derivedBoundaryRoot)) {
      declaredFilesystemAllowedRoots.push(derivedBoundaryRoot);
    }
  }

  if (targetStats.isDirectory()) {
    return {
      absoluteTargetPath,
      targetScopeKind,
      materializedKind,
      filesystemAllowedRoots: declaredFilesystemAllowedRoots,
    };
  }
  return {
    absoluteTargetPath,
    targetScopeKind,
    materializedKind,
    filesystemAllowedRoots: declaredFilesystemAllowedRoots,
  };
}

async function resolveReviewInvokeInputs(
  argv: string[],
  ontoConfig: OntoConfig,
  projectRoot: string,
): Promise<ResolvedReviewInvokeInputs> {
  const parsedPositionals = parseHostFacingPositionals(
    splitArgvIntoOptionsAndPositionals(
      argv,
      [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
      [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
    ).positionals,
  );

  const explicitRequestedTarget = readSingleOptionValueFromArgv(argv, "requested-target");
  const explicitTargetScopeKind = readSingleOptionValueFromArgv(argv, "target-scope-kind");
  const explicitPrimaryRef = readSingleOptionValueFromArgv(argv, "primary-ref");
  const explicitMemberRefs = readMultiOptionValuesFromArgv(argv, "member-ref");
  const explicitBundleKind = readSingleOptionValueFromArgv(argv, "bundle-kind");
  const explicitFilesystemAllowedRoots = readMultiOptionValuesFromArgv(
    argv,
    "filesystem-allowed-root",
  );
  const requestedTarget = explicitRequestedTarget ?? parsedPositionals.target;
  const bundleRequested =
    explicitTargetScopeKind === "bundle" || explicitMemberRefs.length > 0;
  if (
    !bundleRequested &&
    (typeof requestedTarget !== "string" || requestedTarget.length === 0)
  ) {
    throw new Error(
      "Missing review target. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --requested-target.",
    );
  }

  const MAX_REQUEST_TEXT_LENGTH = 2000;
  let requestText =
    readSingleOptionValueFromArgv(argv, "request-text") ??
    readSingleOptionValueFromArgv(argv, "intent-summary") ??
    parsedPositionals.intentText;
  if (typeof requestText !== "string" || requestText.length === 0) {
    throw new Error(
      "Missing review intent. Use `npm run review:invoke -- <target> \"<intent>\"` or pass --request-text.",
    );
  }
  if (requestText.length > MAX_REQUEST_TEXT_LENGTH) {
    console.warn(
      `[onto] Request text truncated from ${requestText.length} to ${MAX_REQUEST_TEXT_LENGTH} characters.`,
    );
    requestText = requestText.slice(0, MAX_REQUEST_TEXT_LENGTH);
  }

  // Domain selection precedence (highest to lowest):
  //   1. --requested-domain-token (internal/legacy machine-facing flag, used by CLI runners)
  //   2. --no-domain flag (canonical user-facing, equivalent to legacy @-)
  //   3. --domain {name} option (canonical user-facing, equivalent to legacy @{name})
  //   4. positional @{domain} or @- (legacy short syntax — kept for backward compat;
  //      conflicts with Claude Code's @filename mention syntax)
  //   5. empty → triggers domain resolution (interactive selection or no-domain default)
  const noDomainFlag = hasOptionFlag(argv, "no-domain");
  const explicitDomainName = readSingleOptionValueFromArgv(argv, "domain");
  if (noDomainFlag && typeof explicitDomainName === "string" && explicitDomainName.length > 0) {
    throw new Error(
      "Conflicting domain flags: --no-domain cannot be combined with --domain. Use exactly one.",
    );
  }
  const canonicalDomainToken = noDomainFlag
    ? "@-"
    : typeof explicitDomainName === "string" && explicitDomainName.length > 0
      ? (normalizeDomainToken(explicitDomainName) ?? "")
      : "";
  const requestedDomainToken =
    readSingleOptionValueFromArgv(argv, "requested-domain-token") ??
    (canonicalDomainToken.length > 0 ? canonicalDomainToken : undefined) ??
    parsedPositionals.requestedDomainToken ??
    "";
  const resolvedDomainSelection = await resolveDomainSelection(
    requestedDomainToken,
    ontoConfig,
  );

  const reviewMode = resolveReviewMode(argv, ontoConfig);
  const explicitLensIds = readMultiOptionValuesFromArgv(argv, "lens-id");
  const lensDefaults = resolveLensDefaultsForReviewMode(reviewMode);
  const resolvedLensIds = explicitLensIds.length > 0
    ? explicitLensIds
    : lensDefaults.resolvedLensIds;
  const diffRange = readSingleOptionValueFromArgv(argv, "diff-range");

  let absoluteTargetPath = "";
  let targetScopeKind: ReviewTargetScopeKind;
  let materializedKind: "single_text" | "directory_listing" | "bundle_member_texts";
  let resolvedTargetRefs: string[];
  let filesystemAllowedRoots: string[] = normalizeFilesystemAllowedRoots(
    explicitFilesystemAllowedRoots,
    projectRoot,
  );
  let bundleKind: string | undefined;

  if (typeof diffRange === "string" && diffRange.length > 0) {
    if (!/^[a-zA-Z0-9_.\/\-~^@{}:]+(?:\.\.[a-zA-Z0-9_.\/\-~^@{}:]+)?$/.test(diffRange)) {
      throw new Error(
        `Invalid --diff-range value: ${diffRange}. Expected a git ref range like "abc123..def456" or "HEAD~3".`,
      );
    }
    const diffTargetDir = typeof requestedTarget === "string" && requestedTarget.length > 0
      ? path.resolve(projectRoot, requestedTarget)
      : projectRoot;
    let diffOutput: string;
    try {
      diffOutput = execSync(`git diff ${diffRange}`, {
        cwd: diffTargetDir,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (gitError: unknown) {
      const gitMessage = gitError instanceof Error ? gitError.message : String(gitError);
      if (gitMessage.includes("Not a git repository") || gitMessage.includes("not a git repository")) {
        throw new Error(
          `--diff-range requires a git repository. ${diffTargetDir} is not a git repository.`,
        );
      }
      if (gitMessage.includes("unknown revision")) {
        throw new Error(
          `Invalid git revision in --diff-range "${diffRange}". Commit not found in ${diffTargetDir}.`,
        );
      }
      throw new Error(
        `git diff failed in ${diffTargetDir}: ${gitMessage.split("\n")[0]}`,
      );
    }
    if (diffOutput.trim().length === 0) {
      throw new Error(`git diff ${diffRange} produced empty output in ${diffTargetDir}`);
    }
    const sessionId = readSingleOptionValueFromArgv(argv, "session-id") ?? generateReviewSessionId();
    const diffFilePath = path.join(projectRoot, ".onto", "review", sessionId, "diff-target.patch");
    await fs.mkdir(path.dirname(diffFilePath), { recursive: true });
    await fs.writeFile(diffFilePath, diffOutput, "utf8");
    absoluteTargetPath = diffFilePath;
    targetScopeKind = "file";
    materializedKind = "single_text";
    resolvedTargetRefs = [diffFilePath];
    if (!filesystemAllowedRoots.includes(path.resolve(diffTargetDir))) {
      filesystemAllowedRoots.push(path.resolve(diffTargetDir));
    }
  } else if (bundleRequested) {
    targetScopeKind = "bundle";
    materializedKind = "bundle_member_texts";
    bundleKind = explicitBundleKind && explicitBundleKind.length > 0
      ? explicitBundleKind
      : "host_facing_bundle";
    const primaryRefRaw = explicitPrimaryRef ?? requestedTarget ?? explicitMemberRefs[0];
    if (typeof primaryRefRaw !== "string" || primaryRefRaw.length === 0) {
      throw new Error(
        "Bundle review target requires --primary-ref or at least one --member-ref.",
      );
    }
    absoluteTargetPath = path.resolve(projectRoot, primaryRefRaw);
    const orderedRefs = [
      absoluteTargetPath,
      ...explicitMemberRefs.map((memberRef) => path.resolve(projectRoot, memberRef)),
    ];
    resolvedTargetRefs = orderedRefs.filter(
      (resolvedRef, index) => orderedRefs.indexOf(resolvedRef) === index,
    );
  } else {
  const resolvedTargetInput = await resolveTargetInput(
      projectRoot,
      requestedTarget as string,
      explicitFilesystemAllowedRoots,
      argv,
    );
    absoluteTargetPath = resolvedTargetInput.absoluteTargetPath;
    targetScopeKind = resolvedTargetInput.targetScopeKind;
    materializedKind = resolvedTargetInput.materializedKind;
    resolvedTargetRefs = [absoluteTargetPath];
    filesystemAllowedRoots = resolvedTargetInput.filesystemAllowedRoots;
  }

  if (resolvedLensIds.length === 0) {
    throw new Error(
      "No lens IDs resolved. Specify at least one --lens-id or use --review-mode full|light.",
    );
  }

  return {
    requestedTarget: requestedTarget ?? explicitPrimaryRef ?? absoluteTargetPath,
    targetPath: absoluteTargetPath,
    resolvedTargetRefs,
    targetScopeKind,
    materializedKind,
    requestText,
    requestedDomainToken,
    domainRecommendation: resolvedDomainSelection.domainRecommendation,
    domainFinalValue: resolvedDomainSelection.domainFinalValue,
    domainSelectionMode: resolvedDomainSelection.domainSelectionMode,
    domainSelectionRequired: resolvedDomainSelection.domainSelectionRequired,
    ...(bundleKind ? { bundleKind } : {}),
    reviewMode,
    reviewModeRecommendation: reviewMode,
    resolvedLensIds,
    alwaysIncludeLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.alwaysIncludeLensIds,
    recommendedLensIds:
      explicitLensIds.length > 0 ? resolvedLensIds : lensDefaults.recommendedLensIds,
    rationale:
      explicitLensIds.length > 0
        ? ["host-facing invoke preserved the explicitly requested lens set."]
        : lensDefaults.rationale,
    filesystemAllowedRoots,
  };
}

function appendReviewInvokeDerivedArgs(
  argv: string[],
  resolvedInputs: ResolvedReviewInvokeInputs,
): string[] {
  const appended = [...argv];

  const appendSingleIfAbsent = (optionName: string, value: string): void => {
    if (readSingleOptionValueFromArgv(appended, optionName) !== undefined) {
      return;
    }
    appended.push(`--${optionName}`, value);
  };

  const appendMultiIfAbsent = (optionName: string, values: string[]): void => {
    if (readMultiOptionValuesFromArgv(appended, optionName).length > 0) {
      return;
    }
    for (const value of values) {
      appended.push(`--${optionName}`, value);
    }
  };

  appendSingleIfAbsent("requested-target", resolvedInputs.requestedTarget);
  appendSingleIfAbsent("target-scope-kind", resolvedInputs.targetScopeKind);
  appendSingleIfAbsent("primary-ref", resolvedInputs.targetPath);
  appendSingleIfAbsent("intent-summary", resolvedInputs.requestText);
  appendSingleIfAbsent("domain-recommendation", resolvedInputs.domainRecommendation);
  appendSingleIfAbsent(
    "domain-selection-required",
    resolvedInputs.domainSelectionRequired ? "true" : "false",
  );
  appendSingleIfAbsent("review-mode-recommendation", resolvedInputs.reviewModeRecommendation);
  appendSingleIfAbsent("domain-final-value", resolvedInputs.domainFinalValue);
  appendSingleIfAbsent("domain-selection-mode", resolvedInputs.domainSelectionMode);
  appendSingleIfAbsent("review-mode", resolvedInputs.reviewMode);
  appendSingleIfAbsent("materialized-kind", resolvedInputs.materializedKind);
  appendMultiIfAbsent("always-include-lens-id", resolvedInputs.alwaysIncludeLensIds);
  appendMultiIfAbsent("recommended-lens-id", resolvedInputs.recommendedLensIds);
  appendMultiIfAbsent("rationale", resolvedInputs.rationale);
  appendMultiIfAbsent("resolved-target-ref", resolvedInputs.resolvedTargetRefs);
  appendMultiIfAbsent(
    "filesystem-allowed-root",
    resolvedInputs.filesystemAllowedRoots,
  );
  appendMultiIfAbsent("lens-id", resolvedInputs.resolvedLensIds);
  appendMultiIfAbsent("materialized-ref", resolvedInputs.resolvedTargetRefs);
  if (resolvedInputs.targetScopeKind === "bundle") {
    appendMultiIfAbsent("member-ref", resolvedInputs.resolvedTargetRefs.slice(1));
    if (
      typeof resolvedInputs.bundleKind === "string" &&
      resolvedInputs.bundleKind.length > 0 &&
      readSingleOptionValueFromArgv(appended, "bundle-kind") === undefined
    ) {
      appended.push("--bundle-kind", resolvedInputs.bundleKind);
    }
  }

  if (
    resolvedInputs.requestedDomainToken.length > 0 &&
    readSingleOptionValueFromArgv(appended, "requested-domain-token") === undefined
  ) {
    appended.push("--requested-domain-token", resolvedInputs.requestedDomainToken);
  }

  return appended;
}

async function readOptionalReviewSummary(
  sessionRoot: string,
): Promise<{
  reviewRecord:
    | {
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }
    | null;
  binding:
    | {
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }
    | null;
}> {
  const bindingPath = path.join(sessionRoot, "binding.yaml");
  const reviewRecordPath = path.join(sessionRoot, "review-record.yaml");

  const binding = (await fileExists(bindingPath))
    ? await readYamlDocument<{
        review_record_path?: string;
        final_output_path?: string;
        execution_result_path?: string;
      }>(bindingPath)
    : null;
  const reviewRecord = (await fileExists(reviewRecordPath))
    ? await readYamlDocument<{
        record_status?: string;
        deliberation_status?: string;
        participating_lens_ids?: string[];
        degraded_lens_ids?: string[];
        final_output_ref?: string | null;
        execution_result_ref?: string | null;
      }>(reviewRecordPath)
    : null;

  return {
    reviewRecord,
    binding,
  };
}

function resolveMaxConcurrentLenses(
  argv: string[],
  ontoConfig: OntoConfig,
): number {
  const explicitValue = readSingleOptionValueFromArgv(argv, "max-concurrent-lenses");
  if (typeof explicitValue === "string" && explicitValue.length > 0) {
    const parsed = Number.parseInt(explicitValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid max concurrent lenses: ${explicitValue}`);
    }
    return parsed;
  }

  const configValue = ontoConfig.max_concurrent_lenses;
  if (
    (typeof configValue === "string" && configValue.length > 0) ||
    typeof configValue === "number"
  ) {
    const parsed = Number.parseInt(String(configValue), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(`Invalid .onto/config.yml max_concurrent_lenses: ${configValue}`);
    }
    return parsed;
  }

  return 9;
}

function rejectRemovedFlags(argv: string[]): void {
  if (hasOptionFlag(argv, "claude")) {
    throw new Error(
      "--claude is no longer accepted. The `onto review` CLI runs Codex only. " +
        "For Claude execution, use `onto coordinator start` (Agent Teams nested spawn).",
    );
  }
  for (const removed of ["host-runtime", "execution-realization", "execution-mode"]) {
    const optionToken = `--${removed}`;
    const present =
      hasOptionFlag(argv, removed) ||
      argv.some((token) => token.startsWith(`${optionToken}=`));
    if (present) {
      throw new Error(
        `--${removed} is no longer accepted. The \`onto review\` CLI is codex-only; ` +
          "remove the flag.",
      );
    }
  }
}

function appendCanonicalExecutionProfileArgs(
  argv: string[],
  profile: ResolvedExecutionProfile,
): string[] {
  return [
    ...argv,
    "--execution-realization",
    profile.execution_realization,
    "--host-runtime",
    profile.host_runtime,
  ];
}

function appendDirectoryListingConfigArgs(
  targetArgv: string[],
  originalArgv: string[],
  ontoConfig: OntoConfig,
): string[] {
  const result = [...targetArgv];

  if (
    readMultiOptionValuesFromArgv(result, "excluded-name").length === 0 &&
    Array.isArray(ontoConfig.excluded_names) &&
    ontoConfig.excluded_names.length > 0
  ) {
    for (const name of ontoConfig.excluded_names) {
      result.push("--excluded-name", name);
    }
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-depth") === undefined &&
    ontoConfig.max_listing_depth !== undefined
  ) {
    result.push("--max-listing-depth", String(ontoConfig.max_listing_depth));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-listing-entries") === undefined &&
    ontoConfig.max_listing_entries !== undefined
  ) {
    result.push("--max-listing-entries", String(ontoConfig.max_listing_entries));
  }

  if (
    readSingleOptionValueFromArgv(result, "max-embed-lines") === undefined &&
    ontoConfig.max_embed_lines !== undefined
  ) {
    result.push("--max-embed-lines", String(ontoConfig.max_embed_lines));
  }

  return result;
}

interface ReviewInvokeSetup {
  ontoHome: string | undefined;
  projectRoot: string;
  ontoConfig: OntoConfig;
  resolvedInvokeInputs: ResolvedReviewInvokeInputs;
  maxConcurrentLenses: number;
  startArgv: string[];
  /**
   * Resolved execution profile that drove the startArgv's --execution-realization
   * and --host-runtime args. Downstream consumers (runReviewInvokeCli,
   * reviewPrepareOnly) use this to return artifact-consistent responses.
   * null when resolution yielded no_host AND caller hasn't forced a fallback.
   */
  executionProfile: ResolvedExecutionProfile | null;
}

async function resolveReviewInvokeSetup(argv: string[]): Promise<ReviewInvokeSetup> {
  rejectRemovedFlags(argv);
  const ontoHomeFlag = readSingleOptionValueFromArgv(argv, "onto-home");
  let ontoHome: string | undefined;
  try {
    ontoHome = resolveOntoHome(ontoHomeFlag);
  } catch {
    // When invoked via npm run (legacy path), onto home resolution from
    // import.meta.url or CWD will succeed. If it fails, we proceed without
    // ontoHome — executor resolution falls back to npm run scripts.
    ontoHome = undefined;
  }
  const projectRoot = path.resolve(
    readSingleOptionValueFromArgv(argv, "project-root") ?? ".",
  );
  const ontoConfig = ontoHome
    ? await resolveConfigChain(ontoHome, projectRoot)
    : await readOntoConfig(projectRoot);
  const resolvedInvokeInputs = await resolveReviewInvokeInputs(
    argv,
    ontoConfig,
    projectRoot,
  );
  const maxConcurrentLenses = resolveMaxConcurrentLenses(argv, ontoConfig);

  const { optionTokens: argvWithoutPositionals } = splitArgvIntoOptionsAndPositionals(
    argv,
    [...KNOWN_INVOKE_ONLY_OPTION_NAMES, ...KNOWN_PASSTHROUGH_OPTION_NAMES],
    [...KNOWN_INVOKE_ONLY_FLAG_NAMES, ...KNOWN_PASSTHROUGH_FLAG_NAMES],
  );

  const normalizedStartArgv = appendReviewInvokeDerivedArgs(
    ensureSessionIdArg(
      stripOptionsFromArgv(
        argvWithoutPositionals,
        [...KNOWN_INVOKE_ONLY_OPTION_NAMES],
        [...KNOWN_INVOKE_ONLY_FLAG_NAMES],
      ),
    ),
    resolvedInvokeInputs,
  );
  // Resolve execution profile ONCE here so session artifacts, startArgv, and
  // downstream responses all share the same (realization, host) pair. This is
  // the single seat that writes the Claude-host profile into prepared session
  // artifacts — closes the "Claude run recorded as codex" artifact seam gap
  // (review consensus #1, 2026-04-16).
  const explicitCodex = hasOptionFlag(argv, "codex");
  const profileResolution = resolveExecutionProfile({ explicitCodex, ontoConfig });
  // Defaults when no host detected: preserve the prior hardcoded behavior so
  // --prepare-only in a credential-less env still gets artifacts prepared and
  // downstream fail-fast surfaces at resolveExecutorConfig. runReviewInvokeCli
  // (non-prepareOnly) explicitly re-checks and throws earlier.
  const executionProfile: ResolvedExecutionProfile | null =
    profileResolution.type === "resolved" ? profileResolution.profile : null;
  const profileForArtifacts: ResolvedExecutionProfile = executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  const startArgvWithProfile = appendCanonicalExecutionProfileArgs(
    normalizedStartArgv,
    profileForArtifacts,
  );
  const startArgv = appendDirectoryListingConfigArgs(
    startArgvWithProfile,
    argv,
    ontoConfig,
  );
  return {
    ontoHome,
    projectRoot,
    ontoConfig,
    resolvedInvokeInputs,
    maxConcurrentLenses,
    startArgv,
    executionProfile,
  };
}

/**
 * Runs review preparation and returns the result directly (no console output).
 * Used by the coordinator state machine to avoid console.log capture.
 *
 * The execution_realization / host_runtime in the returned result mirror the
 * values that were written into the prepared session artifacts (via
 * setup.executionProfile). This closes the artifact seam gap where Claude-path
 * runs were previously recorded as `subagent + codex` regardless of host.
 */
export async function reviewPrepareOnly(argv: string[]): Promise<PrepareOnlyResult> {
  const setup = await resolveReviewInvokeSetup(argv);
  const startResult = await startReviewSession(setup.startArgv);
  const sessionRoot = path.resolve(startResult.session_root);
  const profile: ResolvedExecutionProfile = setup.executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  return {
    prepare_only: true,
    session_root: sessionRoot,
    request_text: setup.resolvedInvokeInputs.requestText,
    execution_realization: profile.execution_realization,
    host_runtime: profile.host_runtime,
    review_mode: setup.resolvedInvokeInputs.reviewMode,
  };
}

export async function runReviewInvokeCli(argv: string[]): Promise<number> {
  const prepareOnly = hasOptionFlag(argv, "prepare-only");
  const explicitCodex = hasOptionFlag(argv, "codex");

  const setup = await resolveReviewInvokeSetup(argv);

  // Auto-resolve execution realization before starting a session. When the
  // resolution points at the Claude host, we don't start a session here — we
  // emit a handoff JSON that tells the subject session to invoke
  // `onto coordinator start`, which owns Claude-host preparation itself.
  // See design record §3.2.
  const handoff = resolveExecutionRealizationHandoff({
    explicitCodex,
    prepareOnly,
    ontoConfig: setup.ontoConfig,
  });
  if (handoff.type === "no_host") {
    throw buildNoHostDetectedError();
  }
  if (handoff.type === "coordinator_start") {
    emitCoordinatorStartHandoff({
      preferredRealization: handoff.profile.execution_realization,
      requestedTarget: setup.resolvedInvokeInputs.requestedTarget,
      requestText: setup.resolvedInvokeInputs.requestText,
    });
    return 0;
  }

  const resolvedProjectRoot = path.resolve(
    readSingleOptionValueFromArgv(setup.startArgv, "project-root") ?? ".",
  );

  const noWatch = hasOptionFlag(argv, "no-watch");

  const startResult = await startReviewSession(setup.startArgv);

  if (prepareOnly) {
    const sessionRoot = path.resolve(startResult.session_root);
    const profile: ResolvedExecutionProfile = setup.executionProfile ?? {
      execution_realization: "subagent",
      host_runtime: "codex",
    };
    const result: PrepareOnlyResult = {
      prepare_only: true,
      session_root: sessionRoot,
      request_text: setup.resolvedInvokeInputs.requestText,
      execution_realization: profile.execution_realization,
      host_runtime: profile.host_runtime,
      review_mode: setup.resolvedInvokeInputs.reviewMode,
    };
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  const sessionRoot = path.resolve(startResult.session_root);

  // Auto-attach the live watcher pane AFTER session creation so the watcher
  // receives the exact session-root as an explicit argument. Prior behaviour
  // spawned the watcher before startReviewSession and relied on the shared
  // `.onto/review/.latest-session` pointer — but that pointer is a project-
  // global single file, so concurrent review sessions (two or more
  // `onto review --codex` invocations running in parallel) caused each
  // watcher to latch onto whichever session wrote `.latest-session` last.
  // Passing sessionRoot explicitly eliminates that race.
  if (!noWatch) {
    const watcherResult = spawnWatcherPane(resolvedProjectRoot, sessionRoot);
    if (watcherResult.spawned) {
      console.log(
        `[review runner] live watcher attached via ${watcherResult.mechanism}`,
      );
    } else {
      console.log(
        `[review runner] live progress: open another terminal and run \`npm run review:watch -- "${sessionRoot}"\`` +
          (watcherResult.reason ? ` (${watcherResult.reason})` : ""),
      );
    }
  }

  const resolvedRequestText = setup.resolvedInvokeInputs.requestText;
  const defaultExecutorConfig = resolveExecutorConfig(
    argv,
    "",
    setup.ontoConfig,
    setup.ontoHome,
  );
  const synthesizeExecutorConfig = resolveExecutorConfig(
    argv,
    "synthesize-",
    setup.ontoConfig,
    setup.ontoHome,
  );

  const promptExecutionResult = await executeReviewPromptExecution({
    projectRoot: resolvedProjectRoot,
    sessionRoot,
    defaultExecutorConfig,
    maxConcurrentLenses: setup.maxConcurrentLenses,
    ...(synthesizeExecutorConfig.bin === defaultExecutorConfig.bin &&
    JSON.stringify(synthesizeExecutorConfig.args) ===
      JSON.stringify(defaultExecutorConfig.args)
      ? {}
      : { synthesizeExecutorConfig }),
  });

  const completeSessionResult = await completeReviewSession([
    "--project-root",
    resolvedProjectRoot,
    "--session-root",
    sessionRoot,
    "--request-text",
    resolvedRequestText,
  ]);
  const reviewSummary = await readOptionalReviewSummary(sessionRoot);
  const boundedInvokeSteps = [
    "review:start-session",
    "review:run-prompt-execution",
    "review:complete-session",
  ] as const;
  const routeProfile: ResolvedExecutionProfile = setup.executionProfile ?? {
    execution_realization: "subagent",
    host_runtime: "codex",
  };
  const routeSummary: ReviewInvokeRouteSummary = {
    combined_entrypoint: "review:invoke",
    bounded_invoke_steps: [...boundedInvokeSteps],
    execution_realization: routeProfile.execution_realization,
    host_runtime: routeProfile.host_runtime,
    review_mode: setup.resolvedInvokeInputs.reviewMode,
    max_concurrent_lenses: setup.maxConcurrentLenses,
    concurrency_strategy: "bounded_parallel",
    synthesize_waits_for_all_lenses: true,
  };
  const finalOutputPath =
    reviewSummary.binding?.final_output_path ?? path.join(sessionRoot, "final-output.md");
  const reviewRecordPath =
    reviewSummary.binding?.review_record_path ?? path.join(sessionRoot, "review-record.yaml");
  const executionResultPath =
    reviewSummary.binding?.execution_result_path ?? path.join(sessionRoot, "execution-result.yaml");

  console.log(
    JSON.stringify(
      {
        entrypoint_plan: {
          entrypoint: "review",
          target: setup.resolvedInvokeInputs.requestedTarget,
          target_scope_kind: setup.resolvedInvokeInputs.targetScopeKind,
          resolved_target_refs: setup.resolvedInvokeInputs.resolvedTargetRefs,
          request_text: resolvedRequestText,
          requested_domain_token:
            setup.resolvedInvokeInputs.requestedDomainToken.length > 0
              ? setup.resolvedInvokeInputs.requestedDomainToken
              : null,
          domain_selection_required: setup.resolvedInvokeInputs.domainSelectionRequired,
          domain_selection_mode: setup.resolvedInvokeInputs.domainSelectionMode,
          domain_final_value: setup.resolvedInvokeInputs.domainFinalValue,
          review_mode: setup.resolvedInvokeInputs.reviewMode,
        },
        route_summary: routeSummary,
        review_result: {
          session_root: sessionRoot,
          final_output_path: finalOutputPath,
          review_record_path: reviewRecordPath,
          execution_result_path: executionResultPath,
          record_status: reviewSummary.reviewRecord?.record_status ?? null,
          deliberation_status:
            reviewSummary.reviewRecord?.deliberation_status ?? null,
          participating_lens_ids:
            reviewSummary.reviewRecord?.participating_lens_ids ??
            promptExecutionResult.participating_lens_ids,
          degraded_lens_ids:
            reviewSummary.reviewRecord?.degraded_lens_ids ??
            promptExecutionResult.degraded_lens_ids,
        },
        session_root: sessionRoot,
        bounded_invoke_steps: [...boundedInvokeSteps],
        prompt_execution_result: promptExecutionResult,
        complete_session_result: completeSessionResult,
        max_concurrent_lenses: setup.maxConcurrentLenses,
        executor_realization:
          defaultExecutorConfig.bin === packageManagerBin()
            ? defaultExecutorConfig.args[1] === "review:codex-unit-executor"
              ? "codex"
              : defaultExecutorConfig.args[1] === "review:mock-unit-executor"
                ? "mock"
                : "custom"
            : "custom",
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  await printOntoReleaseChannelNotice();
  return runReviewInvokeCli(process.argv.slice(2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
