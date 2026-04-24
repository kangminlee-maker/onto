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
import type { CommandCatalog } from "../../src/core-runtime/cli/command-catalog.js";

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
