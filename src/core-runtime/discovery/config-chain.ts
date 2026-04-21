import path from "node:path";
import { fileExists, readYamlDocument } from "../review/review-artifact-utils.js";
import {
  adoptProfile,
  mergeOrthogonalFields,
} from "./config-profile.js";

export interface OntoConfig {
  // PR-K (2026-04-18, sketch v3 §7.4 Phase D stage 3): the five legacy
  // provider-profile fields below were REMOVED from the OntoConfig type:
  //   host_runtime, execution_realization, execution_mode,
  //   executor_realization, api_provider
  //
  // P9.5 (2026-04-21): `legacy-field-deprecation.ts` was also removed —
  // YAML configs that still set these fields parse into
  // `Record<string, unknown>` at read time, then the `OntoConfig` narrow
  // silently drops them (graceful ignore). Users on legacy-only configs
  // fall through to the resolver and receive `buildNoHostReason`'s
  // 6-option setup guide (which includes migration to the `review:`
  // axis block). Principals writing new code against `OntoConfig` still
  // cannot reintroduce the silent-divergence class PR #96 closed
  // (fields are absent from the type).
  /**
   * External HTTP API provider selection (sketch v2 §4.1 A).
   *
   * When `host_runtime: standalone` (or auto-detection lands on ts_inline_http),
   * this field picks the external-HTTP sub-path explicitly. Unlike the legacy
   * `api_provider`, this is scoped to the HTTP-API tier only — codex subprocess
   * is never expressed here (use host_runtime: codex instead).
   *
   * Accepted values: anthropic | openai | litellm
   *
   * Resolution priority (execution-plan-resolver.ts):
   *   external_http_provider > api_provider > subagent_llm.provider
   */
  external_http_provider?: "anthropic" | "openai" | "litellm";
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
  /** Review mode: core-axis | full */
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

  /**
   * Double opt-in for topology `cc-teams-lens-agent-deliberation` (sketch v3 §3).
   *
   * Even when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in the
   * Claude Code environment, the deliberation-enabled topology activates
   * only if this field is `true` — because keeping lens agents alive for
   * SendMessage A2A deliberation rounds materially changes memory and
   * latency characteristics, so we require explicit per-project consent.
   *
   * Profile-coupled: adopts atomically with the rest of the provider
   * profile (see `config-profile.ts` PROFILE_FIELDS).
   */
  lens_agent_teams_mode?: boolean;

  /**
   * Review UX Redesign P1 (2026-04-20) — user-facing axis block.
   *
   * Canonical replacement for `execution_topology_priority` + legacy
   * provider-profile fields. User declares 6 axes (A/B/C/E/F + D auto);
   * runtime derives topology shape. See
   * `development-records/evolve/20260420-review-execution-ux-redesign.md`.
   *
   * P1 scope: schema + validator + legacy translation only. Runtime does
   * NOT consume this field yet — P2 wires dispatch. Orthogonal (no atomic
   * profile adoption coupling).
   */
  review?: OntoReviewConfig;
}

// ---------------------------------------------------------------------------
// Review UX Redesign P1 — user-facing axis schema (2026-04-20)
// ---------------------------------------------------------------------------

/** Axis E — lens-to-lens deliberation channel. */
export type LensDeliberation = "synthesizer-only" | "sendmessage-a2a";

/** Foreign (non-host) provider identifiers. */
export type ForeignProvider = "codex" | "anthropic" | "openai" | "litellm";

/** Subagent provider domain — host-native or foreign. */
export type SubagentProvider = "main-native" | ForeignProvider;

/**
 * Explicit foreign-model spec — used by teamlead override or foreign subagent.
 * `main-native` cannot carry model_id / effort (enforced by the discriminated
 * union on SubagentSpec and by the "main" | ExplicitModelSpec union on
 * TeamleadSpec.model).
 */
export interface ExplicitModelSpec {
  provider: ForeignProvider;
  model_id: string;
  /** Provider-specific reasoning-effort domain (see design doc §2.2 F). */
  effort?: string;
}

/** Axis A — teamlead model. */
export interface TeamleadSpec {
  /** `"main"` = host main context (Claude Code / Codex CLI session). */
  model: "main" | ExplicitModelSpec;
}

/**
 * Axis B — subagent model. Discriminated union: `main-native` branch has no
 * model fields; foreign branches require model_id.
 */
export type SubagentSpec =
  | { provider: "main-native" }
  | {
      provider: ForeignProvider;
      model_id: string;
      effort?: string;
    };

/**
 * User-facing review execution config (canonical replacement for legacy
 * `execution_topology_priority`). Every field optional — absent block means
 * "universal fallback" (teamlead=main, subagent=main-native, deliberation=
 * synthesizer-only, concurrency=provider default). Runtime derivation is
 * P2's responsibility; P1 only defines the type and validator.
 */
export interface OntoReviewConfig {
  teamlead?: TeamleadSpec;
  subagent?: SubagentSpec;
  /** Axis C — user override of provider-default concurrency. */
  max_concurrent_lenses?: number;
  /** Axis E. */
  lens_deliberation?: LensDeliberation;
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
 * Orthogonal-only config chain resolver — skips atomic profile adoption
 * and legacy deprecation checks.
 *
 * # What this is
 *
 * Reads home + project `.onto/config.yml`, merges ONLY the orthogonal
 * fields (output_language, domains, review_mode, learning_extract_mode,
 * etc. — see `config-profile.ts:PROFILE_FIELDS` for the complement set),
 * and returns the merged partial config without running `adoptProfile`.
 *
 * # Why this exists
 *
 * Callers that only need a single orthogonal field (e.g.,
 * `resolveReviewSessionExtractMode` reading `learning_extract_mode`) do
 * NOT need provider-profile validation. Routing them through
 * `resolveConfigChain` caused false fail-fast throws once PR #96's atomic
 * profile adoption started rejecting "no provider profile declared"
 * configs — a test/tooling fixture that cares only about orthogonal
 * settings would be blocked by an unrelated profile gate.
 *
 * # How it relates
 *
 * Same underlying `readConfigAt` + `mergeOrthogonalFields` that
 * `resolveConfigChain` uses, sequenced without the adoption/legacy
 * stages. Callers that need a full config (including profile) continue
 * to use `resolveConfigChain`.
 */
export async function resolveOrthogonalConfigChain(
  ontoHome: string,
  projectRoot: string,
): Promise<Partial<OntoConfig>> {
  const homeConfig = await readConfigAt(ontoHome);
  const sameRoot = ontoHome === projectRoot;
  const projectConfig = sameRoot ? homeConfig : await readConfigAt(projectRoot);
  return mergeOrthogonalFields(homeConfig, projectConfig);
}

/**
 * Config chain resolver (home + project) with atomic profile adoption.
 *
 * # Behavior (post-P9.4, 2026-04-21)
 *
 *   - Project declares any profile fields  → project owns the profile atomically.
 *   - Project declares none, home declares some → global profile adopted silently.
 *   - Neither side declares any profile fields → empty profile returned; the
 *     topology resolver's universal `main_native` degrade decides whether a
 *     review run is actually viable and emits `no_host` when not.
 *
 * Orthogonal fields (output_language, domains, review_mode, listing limits,
 * learning_extract_mode, etc.) continue to merge last-wins — they do not
 * carry cross-provider semantics.
 *
 * # Why atomic adoption still runs
 *
 * Even though the "is this profile viable?" guard has moved to the topology
 * resolver, the atomic-ownership rule remains necessary: last-wins per-field
 * merge would silently produce frankenstein profiles (e.g., home's
 * `codex.model=gpt-5.4` inherited over project's `anthropic` profile).
 * `extractProfileFields` + `adoptProfile` enforce that PROFILE_FIELDS
 * transfer as a group from exactly one source.
 *
 * # P9.4 simplification
 *
 * Prior versions threw `buildBothIncompleteError` when neither side
 * declared a `review:` axis block and emitted a STDERR notice for
 * "touched-but-incomplete" projects. Both concerns are now owned by the
 * topology resolver (P9.3 universal `main_native` degrade) and this
 * function simply hands through whatever the adoption layer returned.
 *
 * Design: see `discovery/config-profile.ts` for the adoption policy details.
 */
export async function resolveConfigChain(
  ontoHome: string,
  projectRoot: string,
): Promise<OntoConfig> {
  const homeConfig = await readConfigAt(ontoHome);
  const sameRoot = ontoHome === projectRoot;
  const projectConfig = sameRoot ? homeConfig : await readConfigAt(projectRoot);

  const homePath = path.join(ontoHome, ".onto", "config.yml");
  const projectPath = path.join(projectRoot, ".onto", "config.yml");

  // P9.5 (2026-04-21): the legacy-field deprecation check was removed.
  // The 5 legacy provider-profile fields (host_runtime, execution_realization,
  // execution_mode, executor_realization, api_provider) were removed from
  // the OntoConfig type in P9.2 (PR-K, sketch v3 §7.4 Phase D stage 3), so
  // YAML parsers now silently drop them during Record<string, unknown> →
  // OntoConfig narrowing — graceful ignore is automatic. Users on
  // legacy-only configs fall through to the resolver, which emits
  // `buildNoHostReason` (6-option setup guide including `review:` axis
  // block migration) — a more current version of the guidance the prior
  // throw provided.

  const adoption = adoptProfile({
    home: homeConfig,
    project: projectConfig,
    homePath,
    projectPath,
    sameRoot,
  });

  const orthogonal = mergeOrthogonalFields(homeConfig, projectConfig);
  const merged = { ...orthogonal, ...adoption.profile } as OntoConfig;

  return merged;
}
