/**
 * Catalog metadata constants — extracted from `command-catalog.ts` to break
 * the circular value-import between `command-catalog.ts` and
 * `command-catalog-helpers.ts`.
 *
 * Why this exists (P1-3):
 *   - command-catalog.ts auto-validates on load (`validateCatalog(...)` at
 *     module bottom), which calls helpers that reference module-level state
 *     (e.g., MANAGED_TREE_RELATIVE) declared inside command-catalog-helpers.ts.
 *   - command-catalog-helpers.ts imports CURRENT_CATALOG_VERSION + META_NAME_REGISTRY
 *     from command-catalog.ts as VALUES.
 *   - Circular value imports create a TDZ window: when an entry module imports
 *     helpers first (e.g., dispatcher.ts), helpers.ts starts evaluating its
 *     imports, which triggers catalog.ts evaluation, which auto-validates
 *     using helpers — but helpers.ts body hasn't initialized yet.
 *
 * Resolution: move the few const values that helpers.ts needs from catalog.ts
 * into this third module. helpers.ts imports values from catalog-meta.ts (not
 * catalog.ts), and only uses `import type` from catalog.ts. catalog.ts
 * re-exports these constants for backwards compatibility with existing
 * downstream callers that import them via `command-catalog.js`.
 */

export const META_NAME_REGISTRY = ["help", "version"] as const;
export type RegisteredMetaName = (typeof META_NAME_REGISTRY)[number];

export const CURRENT_CATALOG_VERSION = 1;

export const CATALOG_VERSION_HISTORY = {
  1: {
    introduced_in: "0.3.0",
    description:
      "Initial catalog with three entry kinds (PublicEntry + RuntimeScriptEntry + MetaEntry).",
    breaking_changes: [],
  },
} as const;
