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
 *
 * Perspectives are derived from the methodology adapter (adapter.ts = SSOT).
 * This eliminates UF-CONCISENESS-METADATA-DUPLICATION.
 */

import { methodologyAdapter } from "../adapter.js";

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
  entry_mode: "process";
  surface_type: "markdown";
}

export const processScopeDefaults: ProcessScopeDefaults = {
  /** Derived from adapter.ts — single source of truth for methodology capabilities. */
  perspectives: methodologyAdapter.perspectives,
  // post-PR #216 §3.1.0 진단: 이전엔 "experience" 로 fallback (state machine
  // compatibility 워크어라운드). EntryMode 가 3-enum 으로 확장되며 정합 회복.
  entry_mode: "process",
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

  // Authority sources at the same rank are allowed (e.g., onto authority
  // hierarchy has rank 2 for both OaC and LLM-Native guidelines).
  // Only validate that ranks are positive integers.
  for (const source of config.authority_sources) {
    if (!Number.isInteger(source.rank) || source.rank < 1) {
      errors.push(`Authority source rank must be a positive integer: ${source.path} has rank ${source.rank}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
