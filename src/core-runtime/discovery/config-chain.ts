import path from "node:path";
import { fileExists, readYamlDocument } from "../review/review-artifact-utils.js";

export interface OntoConfig {
  /** Conceptual execution model: subagent | agent-teams */
  execution_realization?: string;
  host_runtime?: string;
  /** Legacy alias for execution_realization */
  execution_mode?: string;
  /** Specific executor to use: subagent | agent-teams | codex | api | mock */
  executor_realization?: string;
  /**
   * API provider for background task LLM calls: anthropic | openai | litellm | codex
   * - anthropic/openai: SDK direct call, per-token billing
   * - litellm: OpenAI-compatible proxy; requires llm_base_url
   * - codex: codex CLI OAuth subprocess (subscription); requires ~/.codex/auth.json chatgpt mode + codex binary
   * If omitted, resolveProvider uses cost-order auto-resolution.
   */
  api_provider?: string;
  /** LLM model to use (e.g. gpt-5.4, claude-sonnet-4-20250514) */
  model?: string;
  /**
   * Base URL for LLM-compatible proxy (LiteLLM etc.).
   * Used when api_provider="litellm" or when presence alone signals litellm selection.
   * Resolution: CLI flag > env LITELLM_BASE_URL > this field > onto-home config.
   */
  llm_base_url?: string;
  /**
   * If codex OAuth is detected but the codex binary is missing, a one-time STDERR
   * install guidance is emitted per session. Set true to suppress it (e.g. corporate
   * environments where codex install is policy-blocked).
   */
  suppress_codex_install_notice?: boolean;
  /** Review mode: light | full */
  review_mode?: string;
  /** Reasoning effort level passed to executor (e.g. low, medium, high, xhigh) */
  reasoning_effort?: string;
  max_concurrent_lenses?: number | string;
  domain?: string;
  secondary_domains?: string[] | string;
  domains?: string[];
  excluded_names?: string[];
  max_listing_depth?: number | string;
  max_listing_entries?: number | string;
  max_embed_lines?: number | string;
  output_language?: string;
  /**
   * Learning extraction mode for review sessions.
   * Valid values: disabled | shadow | active
   * Resolution priority: env var ONTO_LEARNING_EXTRACT_MODE > this field > default (disabled).
   * - disabled: extractor is skipped (Newly Learned sections are written to round1 files but not processed)
   * - shadow: extractor runs and writes manifest but does NOT update live project learnings
   * - active: extractor runs and updates {project}/.onto/learnings/{agent-id}.md
   */
  learning_extract_mode?: string;
  /**
   * Codex-specific overrides.
   * Used when execution_mode is "codex" or --codex flag is set.
   * CLI executor path: codex.model → fallback for top-level model when in codex mode.
   * Prompt path: team lead reads codex.model / codex.effort and inserts into [Codex Configuration].
   * Background task path (llm-caller): codex.model is passed as `-m` to `codex exec` when
   * api_provider="codex" or when cost-order auto-resolves to codex.
   */
  codex?: {
    model?: string;
    /** Reasoning effort for codex. Maps to model_reasoning_effort in codex config. */
    effort?: string;
  };

  /**
   * Per-provider model overrides for background task (learn/govern/promote) LLM calls.
   * When active provider matches one of these, its nested `model` wins over the
   * top-level `model` field. Mirrors the existing `codex.model` pattern across all
   * providers. Bridge: resolveLearningProviderConfig in llm-caller.ts.
   *
   * Precedence per provider (highest first):
   *   CLI flag model > OntoConfig.{provider}.model > OntoConfig.model > fail-fast (api-key paths)
   *
   * Note: codex provider tolerates missing model (codex CLI picks its own default).
   * anthropic / openai / litellm all require a model — fail-fast when unresolved.
   */
  anthropic?: { model?: string };
  openai?: { model?: string };
  litellm?: { model?: string };

  /**
   * Phase 2 host-decoupling: subagent LLM configuration for review unit execution.
   *
   * When set, `resolveExecutorConfig()` auto-selects the
   * `inline-http-review-unit-executor` binary instead of the codex executor,
   * passing provider/model/base_url as CLI flags to the executor.
   *
   * This decouples the **subagent LLM** (per-lens executor) from the
   * **main LLM** (orchestrator host runtime). Examples:
   *   - host_runtime: claude + subagent_llm: { provider: litellm, model: llama-8b }
   *     → Claude Code session orchestrates; LiteLLM 8B executes lenses
   *   - host_runtime: codex + subagent_llm: { provider: anthropic, model: claude-haiku }
   *     → Codex CLI session orchestrates; Anthropic Haiku executes lenses
   *   - host_runtime: standalone (no main host LLM) — auto-uses ts_inline_http
   *     → TS process orchestrates and calls subagent_llm.provider directly
   *
   * Precedence: CLI --executor-bin/--executor-realization > subagent_llm
   *   > OntoConfig.executor_realization > host-runtime default (codex/inline-http).
   */
  subagent_llm?: {
    provider?: string;     // anthropic | openai | litellm | codex
    model?: string;
    base_url?: string;     // Required when provider=litellm
    max_tokens?: number;
    embed_domain_docs?: boolean;
    /**
     * Phase 3-2 tool-mode selector for ts_inline_http executor:
     *   - "native": always use callLlmWithTools (Tier 1 function-calling loop).
     *     Requires provider in {anthropic, openai, litellm} and a model that
     *     supports tool_use / function_call. Fails fast if those preconditions
     *     are not met.
     *   - "inline": always use single-turn callLlm with all context inlined
     *     (Tier 2). Use this for small models without function-call support
     *     (e.g. Qwen3-4B-Instruct).
     *   - "auto" (default): try Tier 1 if the resolved provider supports it,
     *     fall back to Tier 2 if the loop returns empty / errors.
     *
     * Precedence: CLI --tool-mode > this field > "auto".
     */
    tool_mode?: "native" | "inline" | "auto";
  };

  /**
   * Phase 2 host-decoupling: main LLM configuration for standalone host
   * orchestration (Phase 3 wiring).
   *
   * Currently RESERVED — when host_runtime: claude or codex, the main LLM is
   * the host session itself (no config needed). For host_runtime: standalone,
   * Phase 3 will wire this to drive lens selection and synthesize meta-reasoning
   * via TS-process direct LLM calls.
   *
   * Phase 2 acceptance: schema present + recognized by config parser; runtime
   * consumption is per-task (background tasks use api_provider/model already).
   */
  main_llm?: {
    provider?: string;
    model?: string;
    base_url?: string;
    max_tokens?: number;
  };
}

async function readConfigAt(dir: string): Promise<OntoConfig> {
  const configPath = path.join(dir, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return {};
  }
  const raw = await readYamlDocument<Record<string, unknown>>(configPath);
  if (raw === null || typeof raw !== "object") {
    return {};
  }
  return raw as OntoConfig;
}

/**
 * 4-tier config merge (last-wins: later application overrides earlier).
 *
 * Application order (each step overrides the previous):
 * 1. Built-in defaults (not in this function — caller provides)
 * 2. {ontoHome}/.onto/config.yml — installation-level defaults
 * 3. {projectRoot}/.onto/config.yml — project-specific overrides (wins over ontoHome)
 * 4. CLI flags — handled upstream by the caller (wins over everything)
 *
 * Merge strategy:
 * - Scalar keys: last-wins (project overrides onto-home)
 * - Array keys: replacement (project replaces onto-home entirely)
 *   Exception: excluded_names uses union (concat + dedup)
 */
export async function resolveConfigChain(
  ontoHome: string,
  projectRoot: string,
): Promise<OntoConfig> {
  const homeConfig = await readConfigAt(ontoHome);
  if (ontoHome === projectRoot) {
    return homeConfig;
  }
  const projectConfig = await readConfigAt(projectRoot);

  const merged: OntoConfig = { ...homeConfig };

  for (const [key, value] of Object.entries(projectConfig)) {
    if (value === undefined || value === null) continue;

    if (key === "excluded_names") {
      // Union merge for excluded_names
      const homeNames = Array.isArray(homeConfig.excluded_names)
        ? homeConfig.excluded_names
        : [];
      const projectNames = Array.isArray(value) ? value : [];
      const union = [...new Set([...homeNames, ...projectNames])];
      (merged as Record<string, unknown>)[key] = union;
    } else {
      // All other keys: last-wins (replacement)
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}
