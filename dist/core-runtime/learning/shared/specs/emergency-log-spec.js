/**
 * EmergencyLogEntry spec — DD-15.
 *
 * Append-only JSONL at ~/.onto/emergency-log.jsonl. Each entry is one JSON
 * object on a single line. Spec.serialize emits a single object (no trailing
 * newline); the registry's appendToFile() adds the newline.
 */
import { rejectPreV7, checkSchemaVersion, checkString, checkNumber, } from "./spec-helpers.js";
const KIND = "emergency_log_entry";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const EmergencyLogSpec = {
    kind: KIND,
    current_schema_version: CURRENT_VERSION,
    supported_schema_versions: SUPPORTED,
    supported_formats: ["json"],
    parse(content, _format) {
        const raw = JSON.parse(content);
        return rejectPreV7(raw, KIND, SUPPORTED);
    },
    serialize(data, _format) {
        return JSON.stringify(data);
    },
    validate(data) {
        const errors = [];
        if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["data is not an object"] };
        }
        const obj = data;
        checkSchemaVersion(obj, CURRENT_VERSION, errors);
        checkString(obj, "entry_id", errors);
        checkString(obj, "session_id", errors);
        checkString(obj, "written_at", errors);
        checkString(obj, "attempt_id", errors);
        checkNumber(obj, "generation", errors);
        checkString(obj, "fatal_error_kind", errors);
        checkString(obj, "fatal_error_message", errors);
        checkString(obj, "session_root", errors);
        return { valid: errors.length === 0, errors };
    },
};
