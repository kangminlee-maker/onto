/**
 * Catalog hash utilities — stable SHA-256 over canonical-JSON inputs.
 *
 * Two distinct hashes participate in the runtime/CI drift contract; both
 * are derived from the catalog through this module but they cover
 * different scopes:
 *
 *   1. **Per-entry derive hash** (`computeEntryDeriveHash`): inputs are a
 *      single PublicEntry + that entry's `.md.template` content + the
 *      deriver's schema version. Used by the markdown deriver — each
 *      `.onto/commands/*.md` carries its own derive-hash marker.
 *   2. **Target-scoped derive hash** (`computeTargetDeriveHash`): inputs
 *      are a target-id label + the whole catalog + the deriver's schema
 *      version. Used by the markered whole-file emitters (dispatcher.ts,
 *      preboot-dispatch.ts) and the `src/cli.ts` help segment. Each
 *      target's marker carries its OWN target-namespaced digest, NOT the
 *      raw catalog hash.
 *
 * Operator-facing diagnostics call the embedded value a **target-scoped
 * derive-hash**, never the catalog hash, because two emitters can produce
 * two different markers from the same catalog snapshot.
 *
 * `computeCatalogHash` exists as a primitive for the catalog summary +
 * future CI drift checks but is not currently embedded in any marker.
 *
 * Determinism requirements (apply to all three helpers):
 *
 *   - Object keys are emitted in sorted order so insertion order does not
 *     leak into the hash.
 *   - Array order is preserved (it is semantically meaningful — e.g.,
 *     realizations are ordered by the author's preference).
 *   - `undefined` values are dropped (they round-trip through JSON anyway).
 *
 * Location note (P1-3): this file lives under `src/core-runtime/cli/` (not
 * `scripts/`) so the runtime — specifically the generated `dispatcher.ts`
 * `assertDispatcherDeriveHash()` entry guard — can import it. The
 * `scripts/command-catalog-generator/catalog-hash.ts` shim re-exports from
 * here so existing deriver-side imports stay intact.
 */

import { createHash } from "node:crypto";
import type {
  CommandCatalog,
  PublicEntry,
} from "./command-catalog.js";

export function canonicalJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJsonStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const body = keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k]))
      .join(",");
    return "{" + body + "}";
  }
  // `undefined`, functions, symbols — not expected in a serializable catalog.
  throw new Error(
    `canonicalJsonStringify: unsupported value type ${typeof value}`,
  );
}

export function computeCatalogHash(catalog: CommandCatalog): string {
  const canonical = canonicalJsonStringify(catalog);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Per-entry derive hash (plan §D6 v3 / §D16).
 *
 * Inputs:
 *   - `deriveSchemaVersion`: bumps when deriver rules change (plan §D16).
 *   - `entry`: the single PublicEntry this derive output corresponds to.
 *   - `templateContent`: the raw bytes of the entry's `.md.template` file.
 *
 * Scoped invalidation: editing one template only changes THAT entry's hash.
 * Unreferenced (orphan) templates never enter any hash — they cannot silently
 * perturb marker values. A bump of `deriveSchemaVersion` cascade-invalidates
 * every entry's marker in one go.
 */
export function computeEntryDeriveHash(
  entry: PublicEntry,
  templateContent: string,
  deriveSchemaVersion: string,
): string {
  const canonical = canonicalJsonStringify({
    derive_schema_version: deriveSchemaVersion,
    entry,
    template: templateContent,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Whole-catalog target derive hash (P1-2c).
 *
 * Used by markered emitters whose output spans the entire catalog rather
 * than a single PublicEntry: dispatcher.ts, preboot-dispatch.ts, and the
 * src/cli.ts help segment.
 *
 * Note: `package.json:scripts` is the fourth derive target but is
 * **markerless** by design (§9.1) — its drift guard is a 1:1 set + value
 * invariant rather than a hash. It does not consume this helper.
 *
 * `targetId` namespaces the hash so two emitters cannot accidentally produce
 * the same digest from the same catalog. `deriveSchemaVersion` cascade-
 * invalidates a target's markers when its deriver rules change.
 */
export function computeTargetDeriveHash(
  targetId: string,
  catalog: CommandCatalog,
  deriveSchemaVersion: string,
): string {
  const canonical = canonicalJsonStringify({
    derive_schema_version: deriveSchemaVersion,
    target_id: targetId,
    catalog,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
