#!/usr/bin/env node
import path from "node:path";
import { parseArgs } from "node:util";
import { materializeReviewExecutionPreparationArtifacts } from "../review/materializers.js";
import { DEFAULT_DIRECTORY_LISTING_OPTIONS } from "../review/review-artifact-utils.js";
import { printOntoReleaseChannelNotice } from "../release-channel/release-channel.js";
function requireString(value, optionName) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Missing required option --${optionName}`);
    }
    return value;
}
function requireTargetScopeKind(value) {
    if (value === "file" || value === "directory" || value === "bundle") {
        return value;
    }
    throw new Error(`Invalid --scope-kind: ${value}`);
}
function requireMaterializedInputKind(value) {
    if (value === "single_text" ||
        value === "directory_listing" ||
        value === "bundle_member_texts") {
        return value;
    }
    throw new Error(`Invalid --materialized-kind: ${value}`);
}
async function main() {
    await printOntoReleaseChannelNotice();
    const { values } = parseArgs({
        options: {
            "session-root": { type: "string" },
            "scope-kind": { type: "string" },
            "resolved-target-ref": { type: "string", multiple: true, default: [] },
            "materialized-kind": { type: "string" },
            "materialized-ref": { type: "string", multiple: true, default: [] },
            "system-purpose-ref": { type: "string", multiple: true, default: [] },
            "domain-context-ref": { type: "string", multiple: true, default: [] },
            "learning-context-ref": { type: "string", multiple: true, default: [] },
            "role-definition-ref": { type: "string", multiple: true, default: [] },
            "execution-rule-ref": { type: "string", multiple: true, default: [] },
            "excluded-name": { type: "string", multiple: true, default: [] },
            "max-listing-depth": { type: "string" },
            "max-listing-entries": { type: "string" },
        },
        strict: true,
        allowPositionals: false,
    });
    const resolvedTargetRefs = values["resolved-target-ref"].map((ref) => path.resolve(ref));
    if (resolvedTargetRefs.length === 0) {
        throw new Error("At least one --resolved-target-ref is required.");
    }
    const directoryListingOptions = {
        excluded_names: values["excluded-name"].length > 0
            ? values["excluded-name"]
            : DEFAULT_DIRECTORY_LISTING_OPTIONS.excluded_names,
        max_depth: typeof values["max-listing-depth"] === "string"
            ? Number.parseInt(values["max-listing-depth"], 10)
            : DEFAULT_DIRECTORY_LISTING_OPTIONS.max_depth,
        max_entries: typeof values["max-listing-entries"] === "string"
            ? Number.parseInt(values["max-listing-entries"], 10)
            : DEFAULT_DIRECTORY_LISTING_OPTIONS.max_entries,
    };
    const executionPreparationRoot = await materializeReviewExecutionPreparationArtifacts({
        sessionRoot: requireString(values["session-root"], "session-root"),
        scopeKind: requireTargetScopeKind(requireString(values["scope-kind"], "scope-kind")),
        resolvedTargetRefs,
        materializedKind: requireMaterializedInputKind(requireString(values["materialized-kind"], "materialized-kind")),
        materializedRefs: values["materialized-ref"],
        systemPurposeRefs: values["system-purpose-ref"],
        domainContextRefs: values["domain-context-ref"],
        learningContextRefs: values["learning-context-ref"],
        roleDefinitionRefs: values["role-definition-ref"],
        executionRuleRefs: values["execution-rule-ref"],
        directoryListingOptions,
    });
    console.log(executionPreparationRoot);
    return 0;
}
main().then((exitCode) => process.exit(exitCode), (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
