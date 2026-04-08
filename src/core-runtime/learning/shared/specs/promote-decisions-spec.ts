/**
 * PromoteDecisions spec — Phase B input.
 *
 * Persisted JSON at {sessionRoot}/promote-decisions.json. The user (or
 * --approve-all flag) writes this between Phase A and Phase B to express
 * which candidates to promote, retire, etc.
 */

import type { ArtifactSpec, ValidationResult } from "../artifact-registry.js";
import type { PromoteDecisions } from "../../promote/types.js";
import {
  parseRaw,
  serializeRaw,
  rejectPreV7,
  checkSchemaVersion,
  checkString,
  checkArray,
} from "./spec-helpers.js";

const KIND = "promote_decisions";
const CURRENT_VERSION = "1";
const SUPPORTED: readonly string[] = ["1"];

export const PromoteDecisionsSpec: ArtifactSpec<PromoteDecisions> = {
  kind: KIND,
  current_schema_version: CURRENT_VERSION,
  supported_schema_versions: SUPPORTED,
  supported_formats: ["json"],

  parse(content, format) {
    const raw = parseRaw(content, format);
    return rejectPreV7<PromoteDecisions>(raw, KIND, SUPPORTED);
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
    checkString(obj, "prepared_at", errors);
    checkArray(obj, "promotions", errors);
    checkArray(obj, "contradiction_replacements", errors);
    checkArray(obj, "cross_agent_dedup_approvals", errors);
    checkArray(obj, "axis_tag_changes", errors);
    checkArray(obj, "retirements", errors);
    checkArray(obj, "domain_doc_updates", errors);
    checkArray(obj, "audit_outcomes", errors);
    checkArray(obj, "audit_obligations_waived", errors);
    return { valid: errors.length === 0, errors };
  },
};
