/**
 * Process Scope Type.
 *
 * Defines the "process" scope type for designing methodologies,
 * processes, and governance structures.
 *
 * A process scope differs from a code-product scope in:
 * 1. Grounding sources are authority documents, not code files.
 * 2. Surface is a process document (Markdown), not a UI mockup or API spec.
 * 3. Constraints come from authority consistency, not code architecture.
 * 4. Validation checks document coherence, not test execution.
 */

export interface ProcessScopeConfig {
  /** Authority documents that define the rules this process must follow. */
  authority_sources: Array<{
    path: string;
    rank: number;
    description: string;
  }>;
  /** The target document being designed or revised. */
  target_document: string;
  /** Perspectives to apply during constraint discovery. */
  perspectives: string[];
}

export interface ProcessScopeDefaults {
  perspectives: string[];
  entry_mode: "experience";
  surface_type: "markdown";
}

export const processScopeDefaults: ProcessScopeDefaults = {
  perspectives: ["authority-consistency"],
  entry_mode: "experience",
  surface_type: "markdown",
};

/**
 * Validate that a process scope configuration is well-formed.
 */
export function validateProcessScopeConfig(
  config: ProcessScopeConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.authority_sources.length === 0) {
    errors.push("At least one authority source is required for a process scope");
  }

  if (!config.target_document) {
    errors.push("target_document must be specified");
  }

  if (config.perspectives.length === 0) {
    errors.push("At least one perspective is required");
  }

  // Authority sources must have unique ranks
  const ranks = config.authority_sources.map((s) => s.rank);
  if (new Set(ranks).size !== ranks.length) {
    errors.push("Authority source ranks must be unique");
  }

  return { valid: errors.length === 0, errors };
}
