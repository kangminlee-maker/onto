/**
 * BackupMetadata spec — DD-16 (BACKUP-PROTECTION-01).
 *
 * Persisted YAML at ~/.onto/backups/{session-id}/backup-metadata.yaml.
 * Tracks protection state so prune respects active sessions and unrecoverable
 * failures.
 */
import { parseRaw, serializeRaw, rejectPreV7, checkSchemaVersion, checkString, checkNumber, } from "./spec-helpers.js";
const KIND = "backup_metadata";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const BackupMetadataSpec = {
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
        checkString(obj, "session_id", errors);
        checkString(obj, "created_at", errors);
        checkNumber(obj, "total_bytes", errors);
        if (typeof obj.protected !== "boolean") {
            errors.push("protected must be a boolean");
        }
        return { valid: errors.length === 0, errors };
    },
};
