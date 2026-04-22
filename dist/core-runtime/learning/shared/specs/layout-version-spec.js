/**
 * LayoutVersion spec — DD-8.
 *
 * Persisted at {projectRoot}/.onto/.layout-version.yaml. Identifies the
 * session-root layout version so old layouts trigger migration before any
 * promote command touches files.
 */
import { parseRaw, serializeRaw, rejectPreV7, checkSchemaVersion, checkString, } from "./spec-helpers.js";
const KIND = "layout_version";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const LayoutVersionSpec = {
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
        checkString(obj, "layout_version", errors);
        if (obj.layout_version !== "v3") {
            errors.push(`layout_version must be "v3"`);
        }
        checkString(obj, "written_at", errors);
        return { valid: errors.length === 0, errors };
    },
};
