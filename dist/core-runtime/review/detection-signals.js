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
import { detectAnthropicApiKey, detectCodexAuthFile, detectCodexBinary, detectHostRuntimeCategory, detectLiteLlmEndpoint, detectOpenAiApiKey, detectTeamsEnv, } from "../discovery/host-detection.js";
import { fileExists, readYamlDocument, } from "./review-artifact-utils.js";
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
export async function readConfigWithParseHealth(projectRoot) {
    const configPath = path.join(projectRoot, ".onto", "config.yml");
    if (!(await fileExists(configPath))) {
        return { rawConfig: {}, parseError: null };
    }
    try {
        const raw = await readYamlDocument(configPath);
        if (raw === null || typeof raw !== "object") {
            // Parsed but the document was a scalar / null — treat as empty
            // config without flagging a parse error (the YAML itself parsed).
            return { rawConfig: {}, parseError: null };
        }
        return { rawConfig: raw, parseError: null };
    }
    catch (error) {
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
function toUserFacingHost(category) {
    if (category === "claude")
        return "claude-code";
    return category;
}
/**
 * Decide whether the review axis block has been DECLARED.
 *
 * "block declared" means `ontoConfig.review` is a non-null object.
 * Validity is the validator's job, not detection's.
 */
function detectReviewBlockDeclared(rawConfig) {
    const block = rawConfig.review;
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
export function gatherDetectionSignals(read = { rawConfig: {}, parseError: null }) {
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
            anthropic_api_key_set: detectAnthropicApiKey(),
            openai_api_key_reachable: detectOpenAiApiKey(),
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
export function formatDetectionSignalsJson(signals) {
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
            anthropic_api_key_set: signals.credentials.anthropic_api_key_set,
            openai_api_key_reachable: signals.credentials.openai_api_key_reachable,
        },
        review_block_declared: signals.review_block_declared,
        config_parse_error: signals.config_parse_error,
    };
    return JSON.stringify(ordered, null, 2);
}
