/**
 * Catalog hash — stable SHA-256 of the COMMAND_CATALOG's canonical JSON.
 *
 * Purpose (design doc §9.1): every derived artifact embeds this hash in its
 * GENERATED marker so CI drift check (P1-4) can verify that catalog + derived
 * were produced from the same snapshot. Determinism requirements:
 *
 *   - Object keys are emitted in sorted order so insertion order does not
 *     leak into the hash.
 *   - Array order is preserved (it is semantically meaningful — e.g.,
 *     realizations are ordered by the author's preference).
 *   - `undefined` values are dropped (they round-trip through JSON anyway).
 */

import { createHash } from "node:crypto";
import type {
  CommandCatalog,
  PublicEntry,
} from "../../src/core-runtime/cli/command-catalog.js";

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
