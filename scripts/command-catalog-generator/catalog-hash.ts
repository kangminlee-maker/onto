/**
 * Catalog hash — re-export shim (P1-3).
 *
 * The implementation moved to `src/core-runtime/cli/catalog-hash.ts` so that
 * the generated `dispatcher.ts` `assertDispatcherDeriveHash()` runtime guard
 * can import the same canonical hash function. This file remains as the
 * deriver-side import path so existing imports in
 * scripts/command-catalog-generator/* do not need to change.
 */

export {
  canonicalJsonStringify,
  computeCatalogHash,
  computeEntryDeriveHash,
  computeTargetDeriveHash,
} from "../../src/core-runtime/cli/catalog-hash.js";
