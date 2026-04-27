// runtime-mirror-of: step-3-rationale-reviewer §3.7.1

import { describe, expect, it } from "vitest";
import {
  canonicalYamlForSnapshot,
  computeDomainFilesContentHash,
  computeSnapshotHash,
  HASH_ALGORITHM_LABEL,
  serializeAndHash,
  snapshotHashMatches,
} from "./wip-snapshot-hash.js";

describe("wip-snapshot-hash (W-A-89 §3.7.1)", () => {
  describe("canonicalYamlForSnapshot", () => {
    it("sorts map keys lexicographically", () => {
      const out = canonicalYamlForSnapshot({ z: 1, a: 2, m: 3 });
      const lines = out.trim().split("\n");
      expect(lines[0]).toMatch(/^a:/);
      expect(lines[1]).toMatch(/^m:/);
      expect(lines[2]).toMatch(/^z:/);
    });

    it("preserves array order", () => {
      const out = canonicalYamlForSnapshot({ list: ["c", "a", "b"] });
      // arrays preserve list semantic — not sorted
      expect(out).toContain("- c");
      const cIdx = out.indexOf("- c");
      const aIdx = out.indexOf("- a");
      const bIdx = out.indexOf("- b");
      expect(cIdx).toBeLessThan(aIdx);
      expect(aIdx).toBeLessThan(bIdx);
    });

    it("does not emit YAML aliases for repeated objects", () => {
      const shared = { dup: true };
      const out = canonicalYamlForSnapshot({ a: shared, b: shared });
      expect(out).not.toMatch(/&|\*/);
    });
  });

  describe("computeSnapshotHash", () => {
    it("returns 64-char hex SHA-256", () => {
      const h = computeSnapshotHash({ a: 1 });
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic for same logical input regardless of key order", () => {
      const a = computeSnapshotHash({ x: 1, y: { p: 1, q: 2 } });
      const b = computeSnapshotHash({ y: { q: 2, p: 1 }, x: 1 });
      expect(a).toBe(b);
    });

    it("differs when leaf value changes", () => {
      const a = computeSnapshotHash({ x: 1 });
      const b = computeSnapshotHash({ x: 2 });
      expect(a).not.toBe(b);
    });

    it("differs when array order changes (list semantic)", () => {
      const a = computeSnapshotHash({ list: ["a", "b"] });
      const b = computeSnapshotHash({ list: ["b", "a"] });
      expect(a).not.toBe(b);
    });
  });

  describe("computeDomainFilesContentHash", () => {
    it("hashes file array preserving manifest order", () => {
      const a = computeDomainFilesContentHash([
        { path: "concepts.md", content: "X" },
        { path: "structure.md", content: "Y" },
      ]);
      const b = computeDomainFilesContentHash([
        { path: "structure.md", content: "Y" },
        { path: "concepts.md", content: "X" },
      ]);
      // order matters per §3.7.1 step 8
      expect(a).not.toBe(b);
    });

    it("differs when content changes", () => {
      const a = computeDomainFilesContentHash([{ path: "a.md", content: "x" }]);
      const b = computeDomainFilesContentHash([{ path: "a.md", content: "y" }]);
      expect(a).not.toBe(b);
    });
  });

  describe("serializeAndHash", () => {
    it("returns serialized + hash whose hash matches re-hashing the serialized", () => {
      const r = serializeAndHash({ k: "v" });
      const rehash = computeSnapshotHash({ k: "v" });
      expect(r.hash).toBe(rehash);
      expect(r.serialized).toContain("k: v");
    });
  });

  describe("snapshotHashMatches", () => {
    it("case-insensitive bit-exact compare", () => {
      expect(snapshotHashMatches("abc123", "ABC123")).toBe(true);
      expect(snapshotHashMatches("abc123", "abc124")).toBe(false);
    });
  });

  describe("library label", () => {
    it("declares the yaml library + sha256", () => {
      expect(HASH_ALGORITHM_LABEL).toBe("yaml@2.8.2 + sha256");
    });
  });
});
