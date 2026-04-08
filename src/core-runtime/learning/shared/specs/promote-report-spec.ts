/**
 * PromoteReport spec — DD-20.
 *
 * Phase A output, persisted as JSON. Snapshot of all collection/audit/panel
 * data needed for Phase B to apply user decisions.
 */

import type { ArtifactSpec, ValidationResult } from "../artifact-registry.js";
import type { PromoteReport } from "../../promote/types.js";
import {
  parseRaw,
  serializeRaw,
  rejectPreV7,
  checkSchemaVersion,
  checkString,
  checkArray,
} from "./spec-helpers.js";

const KIND = "promote_report";
const CURRENT_VERSION = "1";
const SUPPORTED: readonly string[] = ["1"];

export const PromoteReportSpec: ArtifactSpec<PromoteReport> = {
  kind: KIND,
  current_schema_version: CURRENT_VERSION,
  supported_schema_versions: SUPPORTED,
  supported_formats: ["json"],

  parse(content, format) {
    const raw = parseRaw(content, format);
    return rejectPreV7<PromoteReport>(raw, KIND, SUPPORTED);
  },

  serialize(data, format) {
    return serializeRaw(data, format);
  },

  validate(data): ValidationResult {
    const errors: string[] = [];
    if (typeof data !== "object" || data === null) {
      return { valid: false, errors: ["data is not an object"] };
    }
    const obj = data as Record<string, unknown>;
    checkSchemaVersion(obj, CURRENT_VERSION, errors);
    checkString(obj, "session_id", errors);
    checkString(obj, "generated_at", errors);
    checkString(obj, "mode", errors);
    if (obj.collection === undefined || obj.collection === null) {
      errors.push("collection must be present");
    }
    checkArray(obj, "pre_analysis", errors);
    checkArray(obj, "panel_verdicts", errors);
    checkArray(obj, "cross_agent_dedup_clusters", errors);
    if (obj.audit_summary === undefined || obj.audit_summary === null) {
      errors.push("audit_summary must be present");
    }
    checkArray(obj, "retirement_candidates", errors);
    checkArray(obj, "conflict_proposals", errors);
    checkArray(obj, "domain_doc_candidates", errors);
    if (obj.health_snapshot === undefined || obj.health_snapshot === null) {
      errors.push("health_snapshot must be present");
    }
    checkArray(obj, "degraded_states", errors);
    checkArray(obj, "warnings", errors);
    return { valid: errors.length === 0, errors };
  },
};
