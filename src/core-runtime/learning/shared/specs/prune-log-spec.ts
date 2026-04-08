/**
 * PruneLogEntry spec — DD-16 (SYN-D-02 part 2).
 *
 * Append-only JSONL at ~/.onto/backups/.prune-log.jsonl. Records every
 * checkpoint pruning event with reason and freed bytes.
 */

import type { ArtifactSpec, ValidationResult } from "../artifact-registry.js";
import type { PruneLogEntry } from "../../promote/types.js";
import {
  rejectPreV7,
  checkSchemaVersion,
  checkString,
  checkNumber,
} from "./spec-helpers.js";

const KIND = "prune_log_entry";
const CURRENT_VERSION = "1";
const SUPPORTED: readonly string[] = ["1"];

export const PruneLogSpec: ArtifactSpec<PruneLogEntry> = {
  kind: KIND,
  current_schema_version: CURRENT_VERSION,
  supported_schema_versions: SUPPORTED,
  supported_formats: ["json"],

  parse(content, _format) {
    const raw = JSON.parse(content);
    return rejectPreV7<PruneLogEntry>(raw, KIND, SUPPORTED);
  },

  serialize(data, _format) {
    return JSON.stringify(data);
  },

  validate(data): ValidationResult {
    const errors: string[] = [];
    if (typeof data !== "object" || data === null) {
      return { valid: false, errors: ["data is not an object"] };
    }
    const obj = data as Record<string, unknown>;
    checkSchemaVersion(obj, CURRENT_VERSION, errors);
    checkString(obj, "session_id", errors);
    checkString(obj, "pruned_at", errors);
    checkString(obj, "reason", errors);
    checkNumber(obj, "bytes_freed", errors);
    return { valid: errors.length === 0, errors };
  },
};
