/**
 * Review execution interactive — detection signals (Phase B-1, schema v1).
 *
 * # What this is
 *
 * A read-only seat that gathers the environment + config signals a host
 * agent (Claude Code prose, Codex CLI prose) needs to decide which
 * AskUserQuestion / request_user_input chain to render for review
 * execution-axis selection. The TS runtime emits these as JSON; the host
 * prose consumes them.
 *
 * # Why it exists
 *
 * Per design-draft `development-records/evolve/20260425-review-execution-
 * interactive-selection.md` §3, the interactive selection flow lives in
 * the host prose (Claude Code / Codex CLI) — TS must not call host tools
 * directly. So the runtime contribution is "expose the deciding inputs
 * deterministically as JSON" and let the prose drive the chain.
 *
 * # How it relates
 *
 * - Inputs: reuses six `host-detection.ts` predicates verbatim.
 * - Output schema: pinned in
 *   `.onto/processes/review/detection-signals-contract.md` (v1).
 * - Caller: `runReviewInvokeCli` early-exit branch on
 *   `--emit-detection-signals` (review-invoke.ts).
 *
 * # Schema versioning
 *
 * v1 emits the minimal field set that design-draft §3.1 examples use.
 * Option-E activation (PR #250 follow-up) is expected to extend this
 * to v1.1 with `lens_agent_teams_mode` / `a2a_deliberation`. The
 * `schema_version` literal lets the host prose branch on capability
 * additively without breaking existing consumers.
 */

import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  detectAnthropicApiKey,
  detectCodexBinaryAvailable,
  detectHostRuntimeCategory,
  detectLiteLlmEndpoint,
  detectOpenAiApiKey,
  type HostDetectionConfig,
} from "../discovery/host-detection.js";

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** v1 schema. Pinned in detection-signals-contract.md. */
export interface DetectionSignalsV1 {
  schema_version: "v1";
  /** Host runtime as user-facing label (NOT the internal category). */
  host: "claude-code" | "codex" | "standalone";
  /** True when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env signal is present. */
  teams_env: boolean;
  codex: {
    /** codex binary on PATH. */
    binary: boolean;
    /** ~/.codex/auth.json present (independent of binary). */
    auth: boolean;
  };
  /** LITELLM_BASE_URL env present. */
  litellm_endpoint: boolean;
  credentials: {
    /** ANTHROPIC_API_KEY env present. */
    anthropic: boolean;
    /** OPENAI_API_KEY env OR ~/.codex/auth.json:OPENAI_API_KEY present. */
    openai: boolean;
  };
  /** True iff `ontoConfig.review` is a present object (axis block declared). */
  review_block_present: boolean;
  /**
   * Reserved for drift-detection (design-draft §3.3).
   * Phase B-1: always null. Future PRs will populate when validateReviewConfig
   * passes but checkRequirements fails (e.g. "codex binary missing").
   */
  drift_reason: string | null;
}

/** Subset of OntoConfig consumed here. */
export interface DetectionSignalsConfig extends HostDetectionConfig {
  review?: unknown;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map host-detection's internal category to the user-facing label used in
 * design-draft examples. The internal "claude" → user-facing "claude-code"
 * rename keeps the JSON aligned with how the host prose talks about the
 * runtime to the subject (the user does not say "claude host"; the brand
 * is Claude Code).
 */
function toUserFacingHost(
  category: "claude" | "codex" | "standalone",
): DetectionSignalsV1["host"] {
  if (category === "claude") return "claude-code";
  return category;
}

/**
 * Direct env probe for CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS.
 *
 * `detectClaudeCodeEnvSignal()` reports "any Claude env signal" which is
 * useful for host *category* detection but conflates three different env
 * vars. The TeamCreate gate is specifically `…_AGENT_TEAMS=1`, so we read
 * that variable directly here.
 */
function detectTeamsEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
}

/** ~/.codex/auth.json present (binary-independent). */
function detectCodexAuth(): boolean {
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  return fsSync.existsSync(authPath);
}

/**
 * Decide whether the review axis block has been declared.
 *
 * Phase B-1 rule: "block present" means `ontoConfig.review` is a non-null
 * object — ANY sub-field declaration counts as "axis block adopted". A
 * stricter "block valid" check is the validator's job (review-config-
 * validator.ts), not detection.
 */
function detectReviewBlockPresent(config: DetectionSignalsConfig): boolean {
  const block = config.review;
  return typeof block === "object" && block !== null;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Gather the v1 detection signals from current env + the supplied config.
 *
 * Pure read: no env mutation, no I/O beyond filesystem existence checks
 * already inside host-detection predicates. Safe to invoke at the very
 * top of any CLI entry point.
 */
export function gatherDetectionSignals(
  config: DetectionSignalsConfig = {},
): DetectionSignalsV1 {
  const hostCategory = detectHostRuntimeCategory(config);
  return {
    schema_version: "v1",
    host: toUserFacingHost(hostCategory),
    teams_env: detectTeamsEnv(),
    codex: {
      binary: detectCodexBinaryAvailable(),
      auth: detectCodexAuth(),
    },
    litellm_endpoint: detectLiteLlmEndpoint(),
    credentials: {
      anthropic: detectAnthropicApiKey(),
      openai: detectOpenAiApiKey(),
    },
    review_block_present: detectReviewBlockPresent(config),
    drift_reason: null,
  };
}

/**
 * Stable JSON serialization.
 *
 * Why a dedicated helper: the field order in the emitted JSON is
 * a contract surface (host prose may regex-match key order in error
 * messages). `JSON.stringify` follows insertion order, so the helper
 * pins emission order to the v1 schema regardless of how the gather
 * builder is later refactored.
 */
export function formatDetectionSignalsJson(signals: DetectionSignalsV1): string {
  const ordered = {
    schema_version: signals.schema_version,
    host: signals.host,
    teams_env: signals.teams_env,
    codex: {
      binary: signals.codex.binary,
      auth: signals.codex.auth,
    },
    litellm_endpoint: signals.litellm_endpoint,
    credentials: {
      anthropic: signals.credentials.anthropic,
      openai: signals.credentials.openai,
    },
    review_block_present: signals.review_block_present,
    drift_reason: signals.drift_reason,
  };
  return JSON.stringify(ordered, null, 2);
}
