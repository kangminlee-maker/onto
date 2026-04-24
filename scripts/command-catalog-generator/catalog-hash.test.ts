/**
 * Tests — catalog-hash.ts
 *
 * Deterministic hash + canonical JSON behavior.
 */

import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import type { CommandCatalog } from "../../src/core-runtime/cli/command-catalog.js";
import { canonicalJsonStringify, computeCatalogHash } from "./catalog-hash.js";

describe("canonicalJsonStringify", () => {
  it("emits object keys in sorted order regardless of insertion", () => {
    const a = canonicalJsonStringify({ b: 1, a: 2, c: 3 });
    const b = canonicalJsonStringify({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("preserves array order", () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("drops undefined values from objects", () => {
    const out = canonicalJsonStringify({ a: 1, b: undefined, c: 3 });
    expect(out).toBe('{"a":1,"c":3}');
  });

  it("round-trips nested structures deterministically", () => {
    const value = {
      z: [{ b: 2, a: 1 }, { a: 1, b: 2 }],
      a: { nested: { y: 2, x: 1 } },
    };
    expect(canonicalJsonStringify(value)).toBe(
      '{"a":{"nested":{"x":1,"y":2}},"z":[{"a":1,"b":2},{"a":1,"b":2}]}',
    );
  });
});

describe("computeCatalogHash", () => {
  it("returns a 64-char hex sha256 for the real catalog", () => {
    const hash = computeCatalogHash(COMMAND_CATALOG);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic across repeated calls on the same catalog", () => {
    const a = computeCatalogHash(COMMAND_CATALOG);
    const b = computeCatalogHash(COMMAND_CATALOG);
    expect(a).toBe(b);
  });

  it("changes when the catalog changes", () => {
    const original = computeCatalogHash(COMMAND_CATALOG);
    const mutated: CommandCatalog = {
      ...COMMAND_CATALOG,
      entries: COMMAND_CATALOG.entries.slice(0, -1),
    };
    expect(computeCatalogHash(mutated)).not.toBe(original);
  });

  it("is insensitive to key insertion order", () => {
    const a: CommandCatalog = { version: 1, entries: [] };
    const b = { entries: [], version: 1 } as unknown as CommandCatalog;
    expect(computeCatalogHash(a)).toBe(computeCatalogHash(b));
  });
});
