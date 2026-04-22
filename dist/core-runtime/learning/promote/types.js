/**
 * Phase 3 Promote — Type definitions.
 *
 * Design authority:
 *   - learn-phase3-design-v9.md (final)
 *   - learn-phase3-design-v8.md (DD-1~DD-22 base)
 *   - learn-phase3-design-v7.md (DD-20/21/22 introduction)
 *   - learn-phase3-design-v6.md (DD-1~DD-19 body)
 *
 * This module is the canonical type seat for promote pipeline. Modules under
 * src/core-runtime/learning/promote/ import their interfaces from here.
 *
 * Layering:
 *   - Phase A (source-read-only): collection → audit → panel review → report
 *   - Phase B (mutation): decisions → checkpoint → apply → state persist
 *
 * Naming convention:
 *   - kind: discriminator on union types (e.g., "promote" | "reclassify-insights")
 *   - schema_version: persisted artifact version (DD-20)
 *   - attempt_id: ULID, unique per Phase B attempt (DD-22)
 *   - generation: monotonic within an attempt (DD-22)
 */
export {};
