/**
 * Host runtime detection — single seat for "where is onto running?"
 *
 * This module is the canonical seat for detecting the host runtime environment.
 * It replaces 3 duplicated detection functions previously in
 * bootstrap-review-binding.ts, prepare-review-session.ts, and review-invoke.ts.
 *
 * # Two-axis LLM model
 *
 * onto distinguishes two LLM roles:
 *
 * 1. **Main LLM (orchestrator)** — runs the main session, makes meta decisions
 *    (lens selection, synthesize). Currently bound to the host runtime
 *    (Claude Code session, Codex CLI session, or standalone TS process).
 *
 * 2. **Subagent LLM (per-lens executor)** — runs the actual lens reasoning
 *    work for each of the 9 review lenses. Can be the SAME or DIFFERENT
 *    LLM than the main LLM. Resolution is independent of host detection.
 *
 * This module covers Axis 1 (host runtime / main LLM environment) only.
 * Axis 2 (subagent LLM provider) is handled by `learning/shared/llm-caller.ts`
 * for background tasks; review-time subagent provider is set per execution
 * realization (TeamCreate / Agent tool / codex exec / direct LLM call).
 *
 * # Detection priority (highest to lowest)
 *
 *   1. ONTO_HOST_RUNTIME env var (explicit override; e.g. "standalone")
 *   2. ontoConfig.host_runtime in .onto/config.yml (project override)
 *   3. CLAUDECODE=1 / CLAUDE_PROJECT_DIR / CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
 *      → "claude" (Claude Code session detected)
 *   4. CODEX_THREAD_ID / CODEX_CI → "codex" (Codex CLI session detected)
 *   5. codex binary on PATH + ~/.codex/auth.json → "codex" (codex available)
 *   6. None of the above → "standalone" (TS process; no host LLM)
 *
 * # Capability matrix per host
 *
 * | Host        | hasTeamCreate | hasAgentSpawn | hasCodexExec | Notes |
 * |-------------|---------------|---------------|--------------|-------|
 * | claude      | true          | true          | (auxiliary)  | Full Claude Code tool suite |
 * | codex       | false         | false         | true         | codex exec ephemeral subprocess |
 * | standalone  | false         | false         | false        | Pure TS; LLM via direct SDK/HTTP |
 *
 * Capability detection is environmental — `claude` host always reports
 * `hasTeamCreate: true` because the Claude Code session can invoke TeamCreate.
 * Whether the session-level orchestration actually uses TeamCreate vs flat
 * Agent tool is a separate decision (see `resolveExecutionProfile`).
 */

import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Detected host runtime category. */
export type DetectedHostRuntime = "claude" | "codex" | "standalone";

/**
 * Capabilities available within the detected host runtime.
 *
 * - `hasTeamCreate`: Claude Code's TeamCreate tool (nested team spawning)
 * - `hasAgentSpawn`: Claude Code's Agent tool (flat subagent spawning)
 * - `hasCodexExec`: codex binary on PATH + ~/.codex/auth.json present
 * - `hasAnthropicApiKey`: ANTHROPIC_API_KEY env var
 * - `hasOpenAiApiKey`: OPENAI_API_KEY env var (or ~/.codex/auth.json field)
 * - `hasLiteLlmEndpoint`: LITELLM_BASE_URL env var
 */
export interface HostCapabilities {
  hasTeamCreate: boolean;
  hasAgentSpawn: boolean;
  hasCodexExec: boolean;
  hasAnthropicApiKey: boolean;
  hasOpenAiApiKey: boolean;
  hasLiteLlmEndpoint: boolean;
}

/** Result of full host detection. */
export interface HostDetectionResult {
  hostRuntime: DetectedHostRuntime;
  capabilities: HostCapabilities;
  /** What signal triggered the detection (for diagnostics). */
  detectionSource:
    | "env_override"
    | "config_override"
    | "claude_env_signal"
    | "codex_env_signal"
    | "codex_binary_available"
    | "standalone_default";
}

/** Subset of OntoConfig consumed by host detection. */
export interface HostDetectionConfig {
  host_runtime?: string | undefined;
}

// ---------------------------------------------------------------------------
// Env var names (single seat — referenced by docs)
// ---------------------------------------------------------------------------

export const ENV_ONTO_HOST_RUNTIME = "ONTO_HOST_RUNTIME";

// Claude Code signals (any one is sufficient)
const CLAUDE_ENV_SIGNALS = [
  "CLAUDECODE",
  "CLAUDE_PROJECT_DIR",
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
] as const;

// Codex CLI signals (any one is sufficient)
const CODEX_ENV_SIGNALS = ["CODEX_THREAD_ID", "CODEX_CI"] as const;

// LLM provider env vars
const ENV_ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY";
const ENV_OPENAI_API_KEY = "OPENAI_API_KEY";
const ENV_LITELLM_BASE_URL = "LITELLM_BASE_URL";

// ---------------------------------------------------------------------------
// Low-level signal detectors (exported for reuse / testing)
// ---------------------------------------------------------------------------

/**
 * True when any Claude Code session env signal is present.
 *
 * Replaces the legacy `detectClaudeCodeHost()` from review-invoke.ts (which
 * checked only CLAUDECODE === "1"). The expanded signal set matches the
 * detection logic previously duplicated in bootstrap-review-binding.ts and
 * prepare-review-session.ts.
 */
export function detectClaudeCodeEnvSignal(): boolean {
  for (const name of CLAUDE_ENV_SIGNALS) {
    if (process.env[name]) {
      return true;
    }
  }
  return false;
}

/** True when any Codex CLI session env signal is present. */
export function detectCodexEnvSignal(): boolean {
  for (const name of CODEX_ENV_SIGNALS) {
    if (process.env[name]) {
      return true;
    }
  }
  return false;
}

/**
 * True when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var is exactly "1".
 *
 * This is a stricter probe than `detectClaudeCodeEnvSignal` — the latter
 * reports "any of three Claude env vars present" for host *category*
 * detection, while this one is the specific TeamCreate activation gate.
 * Detection signals (review/detection-signals.ts) use this directly to
 * expose `teams_env` boolean to the host prose.
 */
export function detectTeamsEnv(): boolean {
  return process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
}

/**
 * True when ~/.codex/auth.json exists (binary-independent file probe).
 *
 * Distinct from `detectCodexBinaryAvailable`, which requires BOTH the
 * codex binary on PATH AND the auth.json file. Splitting the auth file
 * probe out lets callers (e.g., detection-signals.ts) report
 * `codex.binary` and `codex.auth` independently — useful when the binary
 * is missing but auth artifacts exist (signals "user had codex installed
 * before" → upgrade guidance), or vice versa.
 *
 * Naming caveat (deferred to a follow-up): this only checks file
 * presence, not whether the credentials inside are valid/usable.
 */
export function detectCodexAuthFile(): boolean {
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  return fsSync.existsSync(authPath);
}

/**
 * True when the codex executable is on PATH (file-presence only).
 *
 * Distinct from `detectCodexBinaryAvailable`, which is the legacy
 * "binary AND auth" availability check used by callers who need to know
 * whether codex can actually run a task end-to-end. This helper exposes
 * the PATH-only fact so detection-signals.ts can emit `codex.binary` and
 * `codex.auth` as independent capability axes — letting host prose
 * distinguish "binary installed but unauthenticated" from "binary
 * missing entirely". (PR #251 round 2 review C1+C2.)
 */
export function detectCodexBinary(): boolean {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    if (fsSync.existsSync(path.join(dir, "codex"))) {
      return true;
    }
  }
  return false;
}

/**
 * True when codex binary is on PATH AND ~/.codex/auth.json exists.
 *
 * Replaces the legacy `detectCodexAvailable()` from review-invoke.ts.
 * Both conditions must hold — auth.json alone or binary alone is insufficient.
 *
 * Used by callers who need a single availability boolean ("can codex
 * actually run?"): review-invoke / detect-review-axes / execution-plan-
 * resolver / host capability matrix. detection-signals.ts deliberately
 * does NOT use this — it emits the two facts independently via
 * `detectCodexBinary` + `detectCodexAuthFile`.
 */
export function detectCodexBinaryAvailable(): boolean {
  const pathEnv = process.env.PATH ?? "";
  let codexOnPath = false;
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    if (fsSync.existsSync(path.join(dir, "codex"))) {
      codexOnPath = true;
      break;
    }
  }
  if (!codexOnPath) return false;
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  return fsSync.existsSync(authPath);
}

/** True when ANTHROPIC_API_KEY is set. */
export function detectAnthropicApiKey(): boolean {
  return Boolean(process.env[ENV_ANTHROPIC_API_KEY]);
}

/**
 * True when `process.env.OPENAI_API_KEY` is set (env source only).
 *
 * Single-source raw fact. Use `detectCodexAuthOpenAiKey` separately if
 * you need the auth.json source. The legacy union helper
 * `detectOpenAiApiKey` is preserved for callers that intentionally want
 * "reachable from any source" semantics. (PR #251 round 4 review C2.)
 */
export function detectOpenAiEnvKey(): boolean {
  return Boolean(process.env[ENV_OPENAI_API_KEY]);
}

/**
 * True when `~/.codex/auth.json` contains a non-empty `OPENAI_API_KEY`
 * field (codex API-key mode places the key there).
 *
 * Single-source raw fact. Returns false on file absence or JSON parse
 * failure. (PR #251 round 4 review C2.)
 */
export function detectCodexAuthOpenAiKey(): boolean {
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  if (!fsSync.existsSync(authPath)) return false;
  try {
    const raw = fsSync.readFileSync(authPath, "utf8");
    const parsed = JSON.parse(raw) as { OPENAI_API_KEY?: unknown };
    return typeof parsed.OPENAI_API_KEY === "string" && parsed.OPENAI_API_KEY.length > 0;
  } catch {
    return false;
  }
}

/**
 * True when an OpenAI-compatible API key is reachable from any source.
 *
 * Union of `detectOpenAiEnvKey` and `detectCodexAuthOpenAiKey`. Used by
 * callers ("can OpenAI be used at all?") who do not need to distinguish
 * the source (`install/detect.ts` capability scan, host capability
 * matrix). detection-signals.ts deliberately does NOT use this — it
 * emits the two source facts independently per L1 honesty.
 */
export function detectOpenAiApiKey(): boolean {
  return detectOpenAiEnvKey() || detectCodexAuthOpenAiKey();
}

/** True when LITELLM_BASE_URL env var is set. */
export function detectLiteLlmEndpoint(): boolean {
  return Boolean(process.env[ENV_LITELLM_BASE_URL]);
}

// ---------------------------------------------------------------------------
// Capability matrix per host
// ---------------------------------------------------------------------------

/**
 * Build the capability matrix for a given host runtime.
 *
 * - Orchestration capabilities (hasTeamCreate, hasAgentSpawn) are tied to
 *   the host runtime — only `claude` host has them.
 * - Inference capabilities (hasAnthropicApiKey, hasOpenAiApiKey,
 *   hasLiteLlmEndpoint, hasCodexExec) are environmental — detected
 *   independently of the host.
 *
 * This separation means: a Claude main session can use a LiteLLM subagent
 * if LITELLM_BASE_URL is set. A Codex main session can use an Anthropic
 * subagent if ANTHROPIC_API_KEY is set. The host runtime determines what
 * orchestration is possible; subagent provider selection happens elsewhere.
 */
export function detectHostCapabilities(hostRuntime: DetectedHostRuntime): HostCapabilities {
  return {
    hasTeamCreate: hostRuntime === "claude",
    hasAgentSpawn: hostRuntime === "claude",
    hasCodexExec: detectCodexBinaryAvailable(),
    hasAnthropicApiKey: detectAnthropicApiKey(),
    hasOpenAiApiKey: detectOpenAiApiKey(),
    hasLiteLlmEndpoint: detectLiteLlmEndpoint(),
  };
}

// ---------------------------------------------------------------------------
// Host runtime resolution
// ---------------------------------------------------------------------------

function normalizeHostRuntimeValue(value: string | undefined): DetectedHostRuntime | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "claude" || trimmed === "codex" || trimmed === "standalone") {
    return trimmed;
  }
  return null;
}

/**
 * Detect the active host runtime, returning category + capabilities + source.
 *
 * Priority order (highest first):
 *   1. ONTO_HOST_RUNTIME env var (claude | codex | standalone)
 *   2. config.host_runtime (claude | codex)
 *   3. Claude Code env signals → claude
 *   4. Codex CLI env signals → codex
 *   5. codex binary + auth.json present → codex (passive availability)
 *   6. None → standalone
 *
 * No `unknown` category — every environment resolves to one of three values.
 * `standalone` is the default when no host signal is present, on the
 * principle that a TS process invocation with no host signals is a valid
 * standalone use case (the TS process itself orchestrates).
 */
export function detectHostRuntime(
  config: HostDetectionConfig = {},
): HostDetectionResult {
  // Priority 1: explicit env override
  const envOverride = normalizeHostRuntimeValue(process.env[ENV_ONTO_HOST_RUNTIME]);
  if (envOverride) {
    return {
      hostRuntime: envOverride,
      capabilities: detectHostCapabilities(envOverride),
      detectionSource: "env_override",
    };
  }

  // Priority 2: config override
  const configOverride = normalizeHostRuntimeValue(config.host_runtime);
  if (configOverride) {
    return {
      hostRuntime: configOverride,
      capabilities: detectHostCapabilities(configOverride),
      detectionSource: "config_override",
    };
  }

  // Priority 3: Claude Code env signals
  if (detectClaudeCodeEnvSignal()) {
    return {
      hostRuntime: "claude",
      capabilities: detectHostCapabilities("claude"),
      detectionSource: "claude_env_signal",
    };
  }

  // Priority 4: Codex CLI env signals (active session)
  if (detectCodexEnvSignal()) {
    return {
      hostRuntime: "codex",
      capabilities: detectHostCapabilities("codex"),
      detectionSource: "codex_env_signal",
    };
  }

  // Priority 5: codex binary + auth.json present (passive availability)
  if (detectCodexBinaryAvailable()) {
    return {
      hostRuntime: "codex",
      capabilities: detectHostCapabilities("codex"),
      detectionSource: "codex_binary_available",
    };
  }

  // Priority 6: standalone default
  return {
    hostRuntime: "standalone",
    capabilities: detectHostCapabilities("standalone"),
    detectionSource: "standalone_default",
  };
}

/**
 * Convenience: detect host runtime category only (no capabilities, no source).
 *
 * Use when caller only needs the category — typically for legacy code paths
 * that previously used `detectClaudeCodeHost()` returning a boolean.
 */
export function detectHostRuntimeCategory(
  config: HostDetectionConfig = {},
): DetectedHostRuntime {
  return detectHostRuntime(config).hostRuntime;
}

// ---------------------------------------------------------------------------
// Backward-compat shims (legacy boolean predicates)
// ---------------------------------------------------------------------------

/**
 * Legacy: returns true when host is detected as Claude Code.
 *
 * Replaces `detectClaudeCodeHost()` from review-invoke.ts (which only
 * checked `CLAUDECODE === "1"`). The new implementation uses the full
 * Claude env signal set and the consolidated detection priority.
 */
export function isClaudeCodeHost(config: HostDetectionConfig = {}): boolean {
  return detectHostRuntimeCategory(config) === "claude";
}

/**
 * Legacy: returns true when host is detected as Codex CLI.
 *
 * Includes both active session (CODEX_THREAD_ID/CODEX_CI) and passive
 * availability (binary + auth.json). For active session only, use
 * `detectCodexEnvSignal()`.
 */
export function isCodexHost(config: HostDetectionConfig = {}): boolean {
  return detectHostRuntimeCategory(config) === "codex";
}
