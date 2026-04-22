import path from "node:path";
import { fileExists, readYamlDocument } from "../review/review-artifact-utils.js";
import { adoptProfile, mergeOrthogonalFields, } from "./config-profile.js";
async function readConfigAt(dir) {
    const configPath = path.join(dir, ".onto", "config.yml");
    if (!(await fileExists(configPath))) {
        return {};
    }
    const raw = await readYamlDocument(configPath);
    if (raw === null || typeof raw !== "object") {
        return {};
    }
    return raw;
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
export async function resolveOrthogonalConfigChain(ontoHome, projectRoot) {
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
export async function resolveConfigChain(ontoHome, projectRoot) {
    const homeConfig = await readConfigAt(ontoHome);
    const sameRoot = ontoHome === projectRoot;
    const projectConfig = sameRoot ? homeConfig : await readConfigAt(projectRoot);
    const homePath = path.join(ontoHome, ".onto", "config.yml");
    const projectPath = path.join(projectRoot, ".onto", "config.yml");
    // P9.5 (2026-04-21): the legacy-field deprecation check was removed.
    // The 5 legacy provider-profile fields (host_runtime, execution_realization,
    // execution_mode, executor_realization, api_provider) were removed from
    // the OntoConfig type in P9.2 (PR-K, sketch v3 §7.4 Phase D stage 3);
    // typed code cannot read them. YAML values survive in the merged
    // object via `mergeOrthogonalFields` (they are not in PROFILE_FIELDS)
    // but no production consumer reads them — graceful ignore is achieved
    // by removing all consumers rather than filtering the values. Users
    // on legacy-only configs fall through to the resolver, which emits
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
    const merged = { ...orthogonal, ...adoption.profile };
    return merged;
}
