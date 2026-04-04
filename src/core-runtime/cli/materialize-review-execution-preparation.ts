#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import type {
  ReviewTargetScopeKind,
  ReviewTargetMaterializedInputKind,
} from "../review/artifact-types.js";
import { materializeReviewExecutionPreparationArtifacts } from "../review/materializers.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function requireTargetScopeKind(value: string): ReviewTargetScopeKind {
  if (value === "file" || value === "directory" || value === "bundle") {
    return value;
  }
  throw new Error(`Invalid --scope-kind: ${value}`);
}

function requireMaterializedInputKind(
  value: string,
): ReviewTargetMaterializedInputKind {
  if (
    value === "single_text" ||
    value === "directory_listing_plus_selected_contents" ||
    value === "bundle_member_texts"
  ) {
    return value;
  }
  throw new Error(`Invalid --materialized-kind: ${value}`);
}

async function main(): Promise<number> {
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
    },
    strict: true,
    allowPositionals: false,
  });

  const resolvedTargetRefs = values["resolved-target-ref"].map((ref) => path.resolve(ref));
  if (resolvedTargetRefs.length === 0) {
    throw new Error("At least one --resolved-target-ref is required.");
  }

  const executionPreparationRoot =
    await materializeReviewExecutionPreparationArtifacts({
      sessionRoot: requireString(values["session-root"], "session-root"),
      scopeKind: requireTargetScopeKind(
        requireString(values["scope-kind"], "scope-kind"),
      ),
      resolvedTargetRefs,
      materializedKind: requireMaterializedInputKind(
        requireString(values["materialized-kind"], "materialized-kind"),
      ),
      materializedRefs: values["materialized-ref"],
      systemPurposeRefs: values["system-purpose-ref"],
      domainContextRefs: values["domain-context-ref"],
      learningContextRefs: values["learning-context-ref"],
      roleDefinitionRefs: values["role-definition-ref"],
      executionRuleRefs: values["execution-rule-ref"],
    });
  console.log(executionPreparationRoot);
  return 0;
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  },
);
