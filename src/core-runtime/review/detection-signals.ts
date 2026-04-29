/**
 * Review execution interactive — detection signals (Phase B-1, schema v1).
 *
 * # What this is
 *
 * A read-only seat that gathers raw, observable environment facts that a
 * host agent (Claude Code prose, Codex CLI prose) needs to decide which
 * AskUserQuestion / request_user_input chain to render for review
 * execution-axis selection. The TS runtime emits these as JSON; the host
 * prose consumes them.
 *
 * # Layer responsibility (L1 only) — see contract §3.0
 *
 * v1 of this schema lives at **Layer L1: raw detection**. Every field is
 * the answer to a single observable question — "is this file present?",
 * "is this env var set?", "is this config field declared?". Field names
 * are honest about what was observed (e.g. `path_has_codex_binary`, not
 * `codex_available`). NO synthesis, NO policy interpretation, NO
 * cross-field derivation happens here.
 *
 * The "Layer L2" question — "which of the four review-flow branches
 * should the host prose enter (first-run / subsequent / drift / fail-
 * fast)?" — is the host prose's responsibility. It receives this L1
 * inventory plus separate calls to `review-config-validator` and (later)
 * a drift checker, then composes the L2 decision itself.
 *
 * # Why this separation
 *
 * Mixing L1 and L2 in a single schema forced field semantics to drift
 * across review rounds (PR #251 round 1~3): some fields tried to be raw
 * facts, others tried to be decision inputs, naming did not match
 * implementation, and `schema_version` rules became unsafe. Pinning v1
 * as L1-only stops the conflation: every field has one observable
 * referent, names declare it, and version policy is straightforward
 * (field add = minor bump; field semantic change = major bump).
 *
 * # How it relates
 *
 * - Inputs: every probe is delegated to `host-detection.ts`. This module
 *   only assembles the v1 schema shape from those predicates plus a
 *   review-block-presence check and a YAML-parse-health probe.
 * - Output schema: pinned in
 *   `.onto/processes/review/detection-signals-contract.md` (v1).
 * - Caller: `runReviewInvokeCli` early-exit branch on
 *   `--emit-detection-signals` (review-invoke.ts).
 */

import path from "node:path";

import {
  detectAnthropicApiKey,
  detectCodexAuthFile,
  detectCodexAuthOpenAiKey,
  detectCodexBinary,
  detectHostRuntimeCategory,
  detectLiteLlmEndpoint,
  detectOpenAiEnvKey,
  detectTeamsEnv,
} from "../discovery/host-detection.js";
import type { OntoConfig } from "../discovery/config-chain.js";
import {
  fileExists,
  readYamlDocument,
} from "./review-artifact-utils.js";

// ---------------------------------------------------------------------------
// Public surface — schema v1 (L1 raw detection only)
// ---------------------------------------------------------------------------

/**
 * v1 schema. Pinned in detection-signals-contract.md.
 *
 * Every field name declares the observable it reports — no derived
 * judgements (no `*_available`, no `*_ready`, no `*_can_*`). See
 * contract §3.0 for the L1 / L2 boundary that motivates the naming.
 */
export interface DetectionSignalsV1 {
  schema_version: "v1";
  /**
   * Detected runtime host category (observed from env signals + codex
   * binary presence). NOT influenced by `ontoConfig.host_runtime`
   * override — that override is for downstream resolvers, not for raw
   * runtime-fact reporting.
   */
  host_detected: "claude-code" | "codex" | "standalone";
  /**
   * `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is the literal
   * string `"1"`. Any other value (including `"0"`, `"true"`, unset)
   * reports false. The TeamCreate gate is exact-string-match in the
   * Claude Code harness, so this field reports that exact-match fact.
   */
  claude_code_teams_env_set: boolean;
  codex: {
    /** `codex` executable found on `process.env.PATH` (file-existence). */
    binary_on_path: boolean;
    /**
     * `~/.codex/auth.json` file exists. Reports file presence ONLY —
     * does not validate the credential inside is usable.
     */
    auth_file_present: boolean;
  };
  /** `process.env.LITELLM_BASE_URL` is set (any non-empty value). */
  litellm_base_url_set: boolean;
  credentials: {
    /** `process.env.ANTHROPIC_API_KEY` is set (any non-empty value). */
    env_has_anthropic_api_key: boolean;
    /** `process.env.OPENAI_API_KEY` is set (any non-empty value). */
    env_has_openai_api_key: boolean;
    /**
     * `~/.codex/auth.json` contains a non-empty `OPENAI_API_KEY` field
     * (codex API-key mode places the key there). Independent from
     * `env_has_openai_api_key` — host prose composes the union itself
     * if it needs the "reachable from any source" view.
     */
    codex_auth_has_openai_api_key: boolean;
  };
  /**
   * `ontoConfig.review` is a non-null object — i.e. the axis block has
   * been DECLARED. Validity (well-formedness for actual review use) is
   * NOT checked here; that is `review-config-validator.ts`'s job, run
   * separately by the host prose.
   */
  review_block_declared: boolean;
  /**
   * Non-null when `.onto/config.yml` failed to parse as YAML. The
   * string is the parser error message. Null when parse succeeded
   * OR when the file is absent (file-absent is reported through
   * `review_block_declared=false`, not through this field).
   *
   * Why: `readOntoConfig` warn-and-fall-through behavior previously
   * collapsed parse failure into "no review block", which made
   * `review_block_declared=false` ambiguous between "user has not
   * configured yet" and "user's config is broken". The host prose
   * needs to distinguish these — the first is first-run interactive,
   * the second is fail-fast with a fix-the-file message.
   */
  config_parse_error: string | null;
}

// ---------------------------------------------------------------------------
// Config read with parse-health capture
// ---------------------------------------------------------------------------

/** Result of a parse-health-aware config read. */
export interface ConfigReadWithHealth {
  /** Parsed config when parse succeeded; empty object on error/absence. */
  rawConfig: OntoConfig;
  /** Parser error message when YAML parse failed; null otherwise. */
  parseError: string | null;
}

/**
 * Read `.onto/config.yml` while preserving parse-health information.
 *
 * Distinct from `readOntoConfig` (in review-invoke.ts) which on parse
 * failure emits a `console.warn` and returns `{}`. That fallback
 * behavior is correct for review dispatch (degrade gracefully) but
 * wrong for detection (loses the parse-failure fact). This helper
 * returns the parse error string explicitly so detection-signals can
 * emit it as `config_parse_error`.
 */
export async function readConfigWithParseHealth(
  projectRoot: string,
): Promise<ConfigReadWithHealth> {
  const configPath = path.join(projectRoot, ".onto", "config.yml");
  if (!(await fileExists(configPath))) {
    return { rawConfig: {}, parseError: null };
  }
  try {
    const raw = await readYamlDocument<unknown>(configPath);
    if (raw === null || typeof raw !== "object") {
      // Parsed successfully but the root is a scalar / null. Per
      // PR #251 round 4 review CC1, this case must NOT collapse into
      // first-run absence (which is `parseError: null` + empty config
      // when the file simply does not exist). Emit a distinct parse
      // error string so host prose treats it as fail-fast like a
      // genuine YAML parse failure.
      return {
        rawConfig: {},
        parseError: `Config root is not a YAML object: ${configPath}`,
      };
    }
    return { rawConfig: raw as OntoConfig, parseError: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { rawConfig: {}, parseError: message };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map host-detection's internal category to the user-facing label used
 * in design-draft examples. The internal "claude" → "claude-code"
 * rename keeps the JSON aligned with how the host prose talks about
 * the runtime to the subject.
 */
function toUserFacingHost(
  category: "claude" | "codex" | "standalone",
): DetectionSignalsV1["host_detected"] {
  if (category === "claude") return "claude-code";
  return category;
}

/**
 * Decide whether the review axis block has been DECLARED.
 *
 * "block declared" means `ontoConfig.review` is a non-null object.
 * Validity is the validator's job, not detection's.
 */
function detectReviewBlockDeclared(rawConfig: OntoConfig): boolean {
  const block = (rawConfig as { review?: unknown }).review;
  return typeof block === "object" && block !== null;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Gather the v1 detection signals from current env + the supplied
 * config-read result.
 *
 * Pure read: no env mutation, no I/O of its own (the I/O for parse
 * health happens in `readConfigWithParseHealth`, the I/O for codex
 * binary / auth / env vars happens inside host-detection predicates).
 *
 * # Why host detection ignores the config here
 *
 * `detectHostRuntimeCategory` accepts a `config.host_runtime` override,
 * but this module passes an empty config so the `host_detected` field
 * reports the OBSERVED runtime fact only. Config-level overrides
 * belong to the downstream resolvers (execution-profile / review-
 * invoke handoff), not to a raw runtime-environment signal that the
 * host prose uses to pick its own input tool.
 */
export function gatherDetectionSignals(
  read: ConfigReadWithHealth = { rawConfig: {}, parseError: null },
): DetectionSignalsV1 {
  const hostCategory = detectHostRuntimeCategory({});
  return {
    schema_version: "v1",
    host_detected: toUserFacingHost(hostCategory),
    claude_code_teams_env_set: detectTeamsEnv(),
    codex: {
      binary_on_path: detectCodexBinary(),
      auth_file_present: detectCodexAuthFile(),
    },
    litellm_base_url_set: detectLiteLlmEndpoint(),
    credentials: {
      env_has_anthropic_api_key: detectAnthropicApiKey(),
      env_has_openai_api_key: detectOpenAiEnvKey(),
      codex_auth_has_openai_api_key: detectCodexAuthOpenAiKey(),
    },
    review_block_declared: detectReviewBlockDeclared(read.rawConfig),
    config_parse_error: read.parseError,
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
    host_detected: signals.host_detected,
    claude_code_teams_env_set: signals.claude_code_teams_env_set,
    codex: {
      binary_on_path: signals.codex.binary_on_path,
      auth_file_present: signals.codex.auth_file_present,
    },
    litellm_base_url_set: signals.litellm_base_url_set,
    credentials: {
      env_has_anthropic_api_key: signals.credentials.env_has_anthropic_api_key,
      env_has_openai_api_key: signals.credentials.env_has_openai_api_key,
      codex_auth_has_openai_api_key: signals.credentials.codex_auth_has_openai_api_key,
    },
    review_block_declared: signals.review_block_declared,
    config_parse_error: signals.config_parse_error,
  };
  return JSON.stringify(ordered, null, 2);
}
