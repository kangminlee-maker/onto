/**
 * AuditState spec — DD-17 + DD-21.
 *
 * Persisted YAML at ~/.onto/audit-state.yaml.
 *
 * Class boundary: parse() returns plain JSON; consumers reconstruct
 * AuditObligation class instances via AuditObligation.fromJSON(). The spec
 * intentionally does NOT import the class so this module stays in the kernel
 * dependency layer.
 */
import { parseRaw, serializeRaw, rejectPreV7, checkSchemaVersion, checkArray, } from "./spec-helpers.js";
const KIND = "audit_state";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const AuditStateSpec = {
    kind: KIND,
    current_schema_version: CURRENT_VERSION,
    supported_schema_versions: SUPPORTED,
    supported_formats: ["yaml"],
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
        checkArray(obj, "obligations", errors);
        return { valid: errors.length === 0, errors };
    },
};
