import path from "node:path";
import { fileExists, readYamlDocument } from "../review/review-artifact-utils.js";
import {
  adoptProfile,
  buildBothIncompleteError,
  mergeOrthogonalFields,
} from "./config-profile.js";
import { checkAndEmitLegacyDeprecation } from "./legacy-field-deprecation.js";

export interface OntoConfig {
  // PR-K (2026-04-18, sketch v3 §7.4 Phase D stage 3): the five legacy
  // provider-profile fields below were REMOVED from the OntoConfig type:
  //   host_runtime, execution_realization, execution_mode,
  //   executor_realization, api_provider
  //
  // Runtime behavior:
  //   - YAML configs that still set these fields parse into the object at
  //     read time (via `Record<string, unknown>` cast inside `readConfigAt`),
  //     so `legacy-field-deprecation.ts` can still DETECT them and throw
  //     `LegacyFieldRemovedError` (PR-J / stage 2). This preserves the
  //     fail-fast message even when the type no longer contains the field.
  //   - Downstream code that previously read these fields is now either
  //     dead (unreachable post-PR-J throw) or reads via
  //     `(config as Record<string, unknown>)[key]` when legacy detection
  //     still needs to see them.
  //
  // Net effect: principals writing NEW code against `OntoConfig` can't
  // accidentally reintroduce the silent-divergence class PR #96 closed,
  // while legacy YAML configs still produce a structured error rather than
  // a cryptic type failure.
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
 * and returns the merged partial config without running
 * `adoptProfile` or `checkAndEmitLegacyDeprecation`.
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
 * As of Review Recovery PR-1 (2026-04-18), provider-coupled fields
 * (host_runtime, execution_realization, per-provider model blocks, etc.)
 * are NO LONGER merged field-by-field. Instead:
 *
 *   - Project profile **complete**  → project owns the profile atomically.
 *   - Project profile **incomplete** (touched-but-invalid) + home complete
 *                                    → global profile adopted + STDERR
 *                                      notice explaining why and how to fix.
 *   - Project absent + home complete → global profile adopted silently.
 *   - **Both incomplete / absent**   → fail-fast with a detailed setup guide
 *                                      (buildBothIncompleteError).
 *
 * Orthogonal fields (output_language, domains, review_mode, listing limits,
 * learning_extract_mode, etc.) continue to merge last-wins — they do not
 * carry cross-provider semantics.
 *
 * Rationale: previously the last-wins merge silently produced frankenstein
 * profiles (e.g., home's codex `execution_realization=subagent` +
 * `reasoning_effort=high` inherited over project's `host_runtime=anthropic`).
 * The orphan fields were either ignored or mismatched downstream, masking
 * real config drift. Atomic adoption makes the ownership explicit.
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

  // Run the legacy-field check against each raw source BEFORE atomic
  // profile adoption. Reason: post-PR-K `validateProfileCompleteness` no
  // longer recognizes legacy fields (host_runtime etc.), so a legacy-only
  // config would be reported as "untouched" and the operator would receive
  // the generic `buildBothIncompleteError` setup guide instead of the
  // structured `LegacyFieldRemovedError` with per-field migration hints.
  //
  // Silent path (P9.2, 2026-04-21 — was execution_topology_priority pre-P9.1):
  // principals who have migrated to the `review:` axis block in EITHER side
  // (home or project) can retain legacy fields as historical artifacts.
  // We inspect merged review-block presence for this bypass.
  const reviewBlockPresent =
    homeConfig.review !== undefined || projectConfig.review !== undefined;
  const legacyCheckTarget = reviewBlockPresent
    ? ({ review: {} } as unknown as OntoConfig)
    : ({ ...homeConfig, ...projectConfig } as OntoConfig);
  checkAndEmitLegacyDeprecation(legacyCheckTarget);

  const adoption = adoptProfile({
    home: homeConfig,
    project: projectConfig,
    homePath,
    projectPath,
    sameRoot,
  });

  // Fail-fast when neither side declares a complete profile. The error
  // carries the full setup manual (4 canonical profile options) so the
  // operator has everything needed to fix the state in one read.
  if (adoption.source === "none") {
    throw buildBothIncompleteError(
      { home: homeConfig, project: projectConfig, homePath, projectPath, sameRoot },
      adoption.project_validation,
      adoption.home_validation,
    );
  }

  if (adoption.notice) {
    process.stderr.write(adoption.notice);
  }

  const orthogonal = mergeOrthogonalFields(homeConfig, projectConfig);
  const merged = { ...orthogonal, ...adoption.profile } as OntoConfig;

  return merged;
}
