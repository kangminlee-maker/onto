#!/usr/bin/env node
import path from "node:path";
import { parseArgs } from "node:util";
import { parseBooleanFlag, } from "../review/review-artifact-utils.js";
import { writeInvocationInterpretationArtifact } from "../review/materializers.js";
import { formatLegacyMigrationError, isLegacyReviewMode, } from "../review/legacy-mode-policy.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
function requireString(value, optionName) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Missing required option --${optionName}`);
    }
    return value;
}
function optionalString(value) {
    return typeof value === "string" ? value : "";
}
function requireReviewTargetScopeKind(value) {
    if (value === "file" || value === "directory" || value === "bundle") {
        return value;
    }
    throw new Error(`Invalid --target-scope-kind: ${value}`);
}
function requireReviewMode(value) {
    if (value === "core-axis" || value === "full") {
        return value;
    }
    if (isLegacyReviewMode(value)) {
        throw new Error(formatLegacyMigrationError("--review-mode-recommendation", value));
    }
    throw new Error(`Invalid --review-mode-recommendation: ${value}`);
}
async function main() {
    await printOntoReleaseChannelNotice();
    const { values } = parseArgs({
        options: {
            "session-root": { type: "string" },
            entrypoint: { type: "string", default: "review" },
            "target-scope-kind": { type: "string" },
            "primary-ref": { type: "string" },
            "member-ref": { type: "string", multiple: true, default: [] },
            "bundle-kind": { type: "string" },
            "intent-summary": { type: "string" },
            "domain-recommendation": { type: "string", default: "" },
            "domain-selection-required": { type: "string", default: "true" },
            "review-mode-recommendation": { type: "string" },
            "always-include-lens-id": { type: "string", multiple: true, default: [] },
            "recommended-lens-id": { type: "string", multiple: true, default: [] },
            rationale: { type: "string", multiple: true, default: [] },
            "ambiguity-note": { type: "string", multiple: true, default: [] },
        },
        strict: true,
        allowPositionals: false,
    });
    const sessionRoot = path.resolve(requireString(values["session-root"], "session-root"));
    const targetScopeKind = requireReviewTargetScopeKind(requireString(values["target-scope-kind"], "target-scope-kind"));
    const primaryRef = requireString(values["primary-ref"], "primary-ref");
    const reviewModeRecommendation = requireReviewMode(requireString(values["review-mode-recommendation"], "review-mode-recommendation"));
    const interpretationParams = {
        sessionRoot,
        entrypoint: requireString(values.entrypoint, "entrypoint"),
        targetScopeKind,
        primaryRef,
        memberRefs: values["member-ref"],
        intentSummary: requireString(values["intent-summary"], "intent-summary"),
        domainRecommendation: optionalString(values["domain-recommendation"]),
        domainSelectionRequired: parseBooleanFlag(values["domain-selection-required"], "domain-selection-required"),
        reviewModeRecommendation,
        alwaysIncludeLensIds: values["always-include-lens-id"],
        recommendedLensIds: values["recommended-lens-id"],
        rationale: values.rationale,
        ambiguityNotes: values["ambiguity-note"],
        ...(typeof values["bundle-kind"] === "string" && values["bundle-kind"].length > 0
            ? { bundleKind: values["bundle-kind"] }
            : {}),
    };
    const interpretationArtifactPath = await writeInvocationInterpretationArtifact(interpretationParams);
    console.log(interpretationArtifactPath);
    return 0;
}
main().then((exitCode) => process.exit(exitCode), (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
