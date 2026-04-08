/**
 * ExtractMode enum + validator — Phase 2.
 *
 * Single validator shared by write path (session start) and read path
 * (Step 2.5, prompt materialization). R4-IA2, R5-IA-R5-1 해소.
 */

const VALID_MODES = ["disabled", "shadow", "active"] as const;
export type ExtractMode = (typeof VALID_MODES)[number];

/**
 * Validate raw env/config value into ExtractMode.
 * Invalid value → fail-fast (throw). Silent degradation 금지.
 */
export function validateExtractMode(raw: string | undefined): ExtractMode {
  const value = raw ?? "disabled";
  if (!VALID_MODES.includes(value as ExtractMode)) {
    throw new Error(
      `Invalid ONTO_LEARNING_EXTRACT_MODE: "${value}". Valid: ${VALID_MODES.join(", ")}`,
    );
  }
  return value as ExtractMode;
}

/**
 * Read persisted extract mode from session metadata.
 * Same validator — no raw cast (R5-IA-R5-1).
 */
export function readExtractMode(sessionMetadata: {
  learning_extract_mode?: string;
}): ExtractMode {
  return validateExtractMode(sessionMetadata.learning_extract_mode);
}
