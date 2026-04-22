/**
 * Shared helpers for ArtifactSpec implementations.
 *
 * Why: every spec parses/serializes JSON or YAML, performs the pre-v7 detection
 * (UF-COV-01), and validates schema_version. Centralizing the boilerplate keeps
 * each per-artifact spec to its structural validators only.
 */
import * as yaml from "yaml";
import { IncompatibleVersionError, } from "../artifact-registry.js";
export function parseRaw(content, format) {
    if (format === "yaml")
        return yaml.parse(content);
    return JSON.parse(content);
}
export function serializeRaw(data, format) {
    if (format === "yaml")
        return yaml.stringify(data);
    return JSON.stringify(data, null, 2);
}
/**
 * Detect pre-v7 artifacts (no schema_version field) and reject with a clear
 * action message. UF-COV-01 v8.
 */
export function rejectPreV7(raw, kind, supportedVersions) {
    if (typeof raw !== "object" || raw === null) {
        throw new IncompatibleVersionError(`${kind}: parsed content is not an object`);
    }
    const obj = raw;
    if (obj.schema_version === undefined) {
        throw new IncompatibleVersionError(`${kind}: pre-v7 artifact detected (no schema_version field). ` +
            `Phase 3 requires schema_version. Action: discard the legacy file ` +
            `and re-run the producing command to regenerate.`);
    }
    if (!supportedVersions.includes(obj.schema_version)) {
        throw new IncompatibleVersionError(`${kind}: schema_version "${obj.schema_version}" not in supported set ` +
            `[${supportedVersions.join(", ")}]`);
    }
    return obj;
}
export function checkString(obj, field, errors) {
    if (typeof obj[field] !== "string") {
        errors.push(`${field} must be a string`);
    }
}
export function checkOptionalString(obj, field, errors) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
        errors.push(`${field} must be a string when present`);
    }
}
export function checkNumber(obj, field, errors) {
    if (typeof obj[field] !== "number") {
        errors.push(`${field} must be a number`);
    }
}
export function checkArray(obj, field, errors) {
    if (!Array.isArray(obj[field])) {
        errors.push(`${field} must be an array`);
    }
}
export function checkSchemaVersion(obj, expected, errors) {
    if (obj.schema_version !== expected) {
        errors.push(`schema_version must be "${expected}"`);
    }
}
