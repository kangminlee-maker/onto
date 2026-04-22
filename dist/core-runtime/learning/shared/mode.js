/**
 * ExtractMode enum + validator — Phase 2.
 *
 * Single validator shared by write path (session start) and read path
 * (Step 2.5, prompt materialization). R4-IA2, R5-IA-R5-1 해소.
 */
const VALID_MODES = ["disabled", "shadow", "active"];
/**
 * Validate raw env/config value into ExtractMode.
 * Invalid value → fail-fast (throw). Silent degradation 금지.
 */
export function validateExtractMode(raw) {
    const value = raw ?? "disabled";
    if (!VALID_MODES.includes(value)) {
        throw new Error(`Invalid ONTO_LEARNING_EXTRACT_MODE: "${value}". Valid: ${VALID_MODES.join(", ")}`);
    }
    return value;
}
/**
 * Read persisted extract mode from session metadata.
 * Same validator — no raw cast (R5-IA-R5-1).
 */
export function readExtractMode(sessionMetadata) {
    return validateExtractMode(sessionMetadata.learning_extract_mode);
}
