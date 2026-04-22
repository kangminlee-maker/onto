/**
 * ApplyExecutionState spec — DD-15 + DD-22.
 *
 * Persisted JSON at {sessionRoot}/promote-execution-result.json. Phase B
 * persists this state on every meaningful step so failed_resumable runs can
 * pick up where they left off.
 */
import { parseRaw, serializeRaw, rejectPreV7, checkSchemaVersion, checkString, checkNumber, checkArray, } from "./spec-helpers.js";
const KIND = "apply_execution_state";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const ApplyExecutionStateSpec = {
    kind: KIND,
    current_schema_version: CURRENT_VERSION,
    supported_schema_versions: SUPPORTED,
    supported_formats: ["json"],
    parse(content, format) {
        const raw = parseRaw(content, format);
        return rejectPreV7(raw, KIND, SUPPORTED);
    },
    serialize(data, format) {
        return serializeRaw(data, format);
    },
    validate(data) {
        const errors = [];
        if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["data is not an object"] };
        }
        const obj = data;
        checkSchemaVersion(obj, CURRENT_VERSION, errors);
        checkString(obj, "session_id", errors);
        checkString(obj, "attempt_id", errors);
        checkString(obj, "attempt_started_at", errors);
        checkNumber(obj, "generation", errors);
        checkString(obj, "last_updated_at", errors);
        checkString(obj, "status", errors);
        checkArray(obj, "applied_decisions", errors);
        checkArray(obj, "failed_decisions", errors);
        checkArray(obj, "pending_decisions", errors);
        return { valid: errors.length === 0, errors };
    },
};
