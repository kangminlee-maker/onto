/**
 * Review UX Redesign P1 — pure validator for the `review:` config block.
 *
 * # What this module is
 *
 * A pure function suite that accepts an `unknown` (the shape YAML casting
 * produces under `OntoConfig.review`) and returns either a typed
 * `OntoReviewConfig` or a list of structured validation errors. The
 * validator enforces the **discriminated union semantics** that YAML
 * cast-reads cannot verify — e.g. `subagent.provider = "main-native"` must
 * not carry `model_id` / `effort`, and `subagent.provider` of a foreign
 * provider must carry `model_id`.
 *
 * # Why it exists
 *
 * `readConfigAt` in `config-chain.ts` casts raw YAML into `OntoConfig`
 * without runtime structure checks. Downstream consumers (P2 topology
 * derivation, P4 onboard, P5 config CLI) need a single seat that both
 * (a) surfaces config errors with precise `review.*.path` location and
 * (b) narrows the discriminated union so compile-time type guards hold
 * for the rest of the pipeline.
 *
 * # How it relates
 *
 * - Input:  raw `review` block (from YAML cast). Permissively typed.
 * - Output: `{ ok: true, config: OntoReviewConfig }` or
 *           `{ ok: false, errors: ValidationError[] }`.
 * - P1 does NOT call this validator from runtime — it is pure/library.
 *   P2 wires the call inside the review-invoke path.
 */
// Domain tables kept next to the validator — same file changes together with
// schema changes, so drift between type and validator is impossible.
const FOREIGN_PROVIDERS = [
    "codex",
    "anthropic",
    "openai",
    "litellm",
];
const SUBAGENT_PROVIDERS = ["main-native", ...FOREIGN_PROVIDERS];
const LENS_DELIBERATIONS = [
    "synthesizer-only",
    "sendmessage-a2a",
];
/**
 * Validate a raw `review` block (as cast from YAML) and return either the
 * narrowed OntoReviewConfig or a structured error list.
 *
 * `undefined` / missing block → `{ ok: true, config: {}, errors: [] }`.
 * Consumers should treat `{}` as "all defaults" (universal fallback).
 */
export function validateReviewConfig(raw) {
    const errors = [];
    if (raw === undefined || raw === null) {
        return { ok: true, config: {}, errors: [] };
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
        errors.push({
            path: "review",
            message: "review block must be a YAML mapping (object), not scalar/array.",
        });
        return { ok: false, errors };
    }
    const obj = raw;
    const out = {};
    rejectUnknownKeys(obj, ["teamlead", "subagent", "max_concurrent_lenses", "lens_deliberation"], "review", errors);
    if ("teamlead" in obj) {
        const teamlead = validateTeamlead(obj.teamlead, errors);
        if (teamlead)
            out.teamlead = teamlead;
    }
    if ("subagent" in obj) {
        const subagent = validateSubagent(obj.subagent, errors);
        if (subagent)
            out.subagent = subagent;
    }
    if ("max_concurrent_lenses" in obj) {
        const concurrency = validateConcurrency(obj.max_concurrent_lenses, errors);
        if (concurrency !== null)
            out.max_concurrent_lenses = concurrency;
    }
    if ("lens_deliberation" in obj) {
        const deliberation = validateDeliberation(obj.lens_deliberation, errors);
        if (deliberation)
            out.lens_deliberation = deliberation;
    }
    // Cross-field constraint: lens_deliberation=sendmessage-a2a requires
    // teamlead=main (D=true is a runtime-only constraint, not a syntactic
    // one, so P1 enforces only the static teamlead constraint).
    if (out.lens_deliberation === "sendmessage-a2a" &&
        out.teamlead &&
        out.teamlead.model !== "main") {
        errors.push({
            path: "review.lens_deliberation",
            message: "lens_deliberation=sendmessage-a2a requires teamlead.model=main. " +
                "External teamlead does not support lens-to-lens A2A deliberation.",
        });
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, config: out, errors: [] };
}
// ---------------------------------------------------------------------------
// Teamlead
// ---------------------------------------------------------------------------
function validateTeamlead(raw, errors) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        errors.push({
            path: "review.teamlead",
            message: "teamlead must be a mapping with a `model` field.",
        });
        return null;
    }
    const obj = raw;
    rejectUnknownKeys(obj, ["model"], "review.teamlead", errors);
    if (!("model" in obj)) {
        errors.push({
            path: "review.teamlead.model",
            message: "teamlead.model is required when teamlead block is declared.",
        });
        return null;
    }
    const model = obj.model;
    if (model === "main") {
        return { model: "main" };
    }
    const explicit = validateExplicitModel(model, "review.teamlead.model", errors);
    if (!explicit)
        return null;
    return { model: explicit };
}
function validateExplicitModel(raw, pathPrefix, errors) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        errors.push({
            path: pathPrefix,
            message: 'model must be either "main" (string) or a mapping ' +
                "{provider, model_id, effort?}.",
        });
        return null;
    }
    const obj = raw;
    rejectUnknownKeys(obj, ["provider", "model_id", "effort"], pathPrefix, errors);
    const provider = obj.provider;
    if (typeof provider !== "string") {
        errors.push({
            path: `${pathPrefix}.provider`,
            message: "provider must be a string.",
        });
        return null;
    }
    if (!FOREIGN_PROVIDERS.includes(provider)) {
        errors.push({
            path: `${pathPrefix}.provider`,
            message: `provider must be one of: ${FOREIGN_PROVIDERS.join(", ")} (got "${provider}"). "main-native" is only valid under subagent, not under an explicit model spec.`,
        });
        return null;
    }
    const modelId = obj.model_id;
    if (typeof modelId !== "string" || modelId.length === 0) {
        errors.push({
            path: `${pathPrefix}.model_id`,
            message: "model_id is required (non-empty string) for foreign providers.",
        });
        return null;
    }
    const spec = {
        provider: provider,
        model_id: modelId,
    };
    if ("effort" in obj) {
        if (typeof obj.effort !== "string" || obj.effort.length === 0) {
            errors.push({
                path: `${pathPrefix}.effort`,
                message: "effort must be a non-empty string when present.",
            });
            return null;
        }
        spec.effort = obj.effort;
    }
    return spec;
}
// ---------------------------------------------------------------------------
// Subagent
// ---------------------------------------------------------------------------
function validateSubagent(raw, errors) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        errors.push({
            path: "review.subagent",
            message: "subagent must be a mapping with a `provider` field.",
        });
        return null;
    }
    const obj = raw;
    rejectUnknownKeys(obj, ["provider", "model_id", "effort"], "review.subagent", errors);
    const provider = obj.provider;
    if (typeof provider !== "string") {
        errors.push({
            path: "review.subagent.provider",
            message: "subagent.provider is required and must be a string.",
        });
        return null;
    }
    if (!SUBAGENT_PROVIDERS.includes(provider)) {
        errors.push({
            path: "review.subagent.provider",
            message: `subagent.provider must be one of: ${SUBAGENT_PROVIDERS.join(", ")} (got "${provider}").`,
        });
        return null;
    }
    if (provider === "main-native") {
        // Discriminated-union enforcement: main-native branch must not carry
        // model_id / effort (those are foreign-provider-only).
        if ("model_id" in obj) {
            errors.push({
                path: "review.subagent.model_id",
                message: "model_id is not allowed when subagent.provider=main-native. " +
                    "main-native resolves via the host's native subagent mechanism.",
            });
        }
        if ("effort" in obj) {
            errors.push({
                path: "review.subagent.effort",
                message: "effort is not allowed when subagent.provider=main-native. " +
                    "Effort configuration for main-native is host-managed (e.g. Claude Code Agent tool).",
            });
        }
        if (errors.some((e) => e.path.startsWith("review.subagent"))) {
            return null;
        }
        return { provider: "main-native" };
    }
    // Foreign branch
    const modelId = obj.model_id;
    if (typeof modelId !== "string" || modelId.length === 0) {
        errors.push({
            path: "review.subagent.model_id",
            message: `model_id is required (non-empty string) when subagent.provider=${provider}.`,
        });
        return null;
    }
    const spec = {
        provider: provider,
        model_id: modelId,
    };
    if ("effort" in obj) {
        if (typeof obj.effort !== "string" || obj.effort.length === 0) {
            errors.push({
                path: "review.subagent.effort",
                message: "effort must be a non-empty string when present.",
            });
            return null;
        }
        spec.effort = obj.effort;
    }
    return spec;
}
// ---------------------------------------------------------------------------
// Scalar axes
// ---------------------------------------------------------------------------
function validateConcurrency(raw, errors) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
        errors.push({
            path: "review.max_concurrent_lenses",
            message: "max_concurrent_lenses must be a finite number.",
        });
        return null;
    }
    if (!Number.isInteger(raw) || raw < 1) {
        errors.push({
            path: "review.max_concurrent_lenses",
            message: "max_concurrent_lenses must be a positive integer (>= 1).",
        });
        return null;
    }
    return raw;
}
function validateDeliberation(raw, errors) {
    if (typeof raw !== "string") {
        errors.push({
            path: "review.lens_deliberation",
            message: "lens_deliberation must be a string.",
        });
        return null;
    }
    if (!LENS_DELIBERATIONS.includes(raw)) {
        errors.push({
            path: "review.lens_deliberation",
            message: `lens_deliberation must be one of: ${LENS_DELIBERATIONS.join(", ")} (got "${raw}").`,
        });
        return null;
    }
    return raw;
}
// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function rejectUnknownKeys(obj, allowed, pathPrefix, errors) {
    const allowedSet = new Set(allowed);
    for (const key of Object.keys(obj)) {
        if (!allowedSet.has(key)) {
            errors.push({
                path: `${pathPrefix}.${key}`,
                message: `Unknown field. Allowed: ${allowed.join(", ")}.`,
            });
        }
    }
}
