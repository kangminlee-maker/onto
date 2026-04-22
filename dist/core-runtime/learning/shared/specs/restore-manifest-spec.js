/**
 * RestoreManifest spec — DD-16 (RESTORE-MANIFEST-01 + SYN-UF-02).
 *
 * Auto-generated alongside each backup directory at
 * ~/.onto/backups/{session-id}/restore-manifest.yaml.
 *
 * Single canonical seat for restore commands. Recovery builders must read
 * from manifest_path on the RecoverabilityCheckpoint, not derive paths from
 * the backup file names.
 */
import { parseRaw, serializeRaw, rejectPreV7, checkSchemaVersion, checkString, checkNumber, checkArray, } from "./spec-helpers.js";
const KIND = "restore_manifest";
const CURRENT_VERSION = "1";
const SUPPORTED = ["1"];
export const RestoreManifestSpec = {
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
        checkString(obj, "attempt_id", errors);
        checkNumber(obj, "generation", errors);
        checkString(obj, "created_at", errors);
        checkArray(obj, "backups", errors);
        checkArray(obj, "restore_order", errors);
        checkArray(obj, "verification_after_restore", errors);
        return { valid: errors.length === 0, errors };
    },
};
