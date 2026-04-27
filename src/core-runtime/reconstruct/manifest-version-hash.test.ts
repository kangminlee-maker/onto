// runtime-mirror-of: step-4-integration §5.5

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  HASH_ALGORITHM,
  MISSING_FILE_SENTINEL,
  VERSION_HASH_PREFIX,
  canonicalYaml,
  computePackContentMap,
  computePackSpec,
  computeVersionHash,
  type ManifestForHash,
} from "./manifest-version-hash.js";

function writePackFiles(
  dir: string,
  files: Record<string, string | Buffer>,
): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

describe("manifest-version-hash (W-A-97)", () => {
  let packDir: string;

  beforeEach(() => {
    packDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-pack-"));
  });

  afterEach(() => {
    fs.rmSync(packDir, { recursive: true, force: true });
  });

  describe("constants", () => {
    it("declares sha256 algorithm and prefix", () => {
      expect(HASH_ALGORITHM).toBe("sha256");
      expect(VERSION_HASH_PREFIX).toBe("sha256:");
    });
  });

  describe("canonicalYaml", () => {
    it("sorts map keys lexicographically", () => {
      const out = canonicalYaml({ b: 2, a: 1, c: 3 });
      const lines = out.trim().split("\n");
      expect(lines[0]).toMatch(/^a:/);
      expect(lines[1]).toMatch(/^b:/);
      expect(lines[2]).toMatch(/^c:/);
    });

    it("is deterministic for same logical input", () => {
      const a = canonicalYaml({ x: 1, y: { p: 1, q: 2 } });
      const b = canonicalYaml({ y: { q: 2, p: 1 }, x: 1 });
      expect(a).toBe(b);
    });

    it("does not emit YAML aliases for repeated objects", () => {
      const shared = { dup: true };
      const out = canonicalYaml({ left: shared, right: shared });
      expect(out).not.toMatch(/&|\*/);
    });

    it("does not fold long lines", () => {
      const long = "x".repeat(200);
      const out = canonicalYaml({ value: long });
      expect(out).toContain(long);
    });
  });

  describe("computePackSpec", () => {
    it("sorts entries lexicographically by path", () => {
      const manifest: ManifestForHash = {
        quality_tier: "full",
        referenced_files: [
          { path: "z.md", required: true },
          { path: "a.md", required: false },
          { path: "m.md", required: true, min_headings: 3 },
        ],
      };
      const spec = computePackSpec(manifest);
      expect(spec.map((e) => e.path)).toEqual(["a.md", "m.md", "z.md"]);
    });

    it("omits min_headings when null or undefined", () => {
      const manifest: ManifestForHash = {
        quality_tier: "full",
        referenced_files: [
          { path: "a.md", required: true, min_headings: null },
          { path: "b.md", required: true },
          { path: "c.md", required: true, min_headings: 0 },
        ],
      };
      const spec = computePackSpec(manifest);
      expect(spec[0]).toEqual({ path: "a.md", required: true });
      expect(spec[1]).toEqual({ path: "b.md", required: true });
      expect(spec[2]).toEqual({
        path: "c.md",
        required: true,
        min_headings: 0,
      });
    });
  });

  describe("computePackContentMap", () => {
    it("hashes existing files and marks missing ones with sentinel", () => {
      writePackFiles(packDir, { "a.md": "alpha", "b.md": "beta" });
      const manifest: ManifestForHash = {
        quality_tier: "full",
        referenced_files: [
          { path: "a.md", required: true },
          { path: "b.md", required: true },
          { path: "c.md", required: false },
        ],
      };
      const map = computePackContentMap(manifest, packDir);
      expect(map["a.md"]).toMatch(/^[0-9a-f]{64}$/);
      expect(map["b.md"]).toMatch(/^[0-9a-f]{64}$/);
      expect(map["c.md"]).toBe(MISSING_FILE_SENTINEL);
      expect(map["a.md"]).not.toBe(map["b.md"]);
    });
  });

  describe("computeVersionHash — determinism + format", () => {
    function baseManifest(): ManifestForHash {
      return {
        quality_tier: "full",
        referenced_files: [
          { path: "a.md", required: true, min_headings: 3 },
          { path: "b.md", required: false },
        ],
      };
    }

    beforeEach(() => {
      writePackFiles(packDir, { "a.md": "alpha", "b.md": "beta" });
    });

    it("returns 'sha256:<64 hex>' format", () => {
      const h = computeVersionHash(baseManifest(), packDir);
      expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    it("is deterministic across calls with identical input", () => {
      const a = computeVersionHash(baseManifest(), packDir);
      const b = computeVersionHash(baseManifest(), packDir);
      expect(a).toBe(b);
    });

    it("is independent of referenced_files input order", () => {
      const ordered = baseManifest();
      const reversed: ManifestForHash = {
        quality_tier: ordered.quality_tier,
        referenced_files: [...ordered.referenced_files].reverse(),
      };
      expect(computeVersionHash(ordered, packDir)).toBe(
        computeVersionHash(reversed, packDir),
      );
    });
  });

  describe("computeVersionHash — input-set invariants (Step 4 §5.5)", () => {
    function manifest(): ManifestForHash {
      return {
        quality_tier: "full",
        referenced_files: [
          { path: "a.md", required: true, min_headings: 3 },
          { path: "b.md", required: false },
        ],
      };
    }

    beforeEach(() => {
      writePackFiles(packDir, { "a.md": "alpha", "b.md": "beta" });
    });

    it("CHANGES when classified file content changes", () => {
      const before = computeVersionHash(manifest(), packDir);
      fs.writeFileSync(path.join(packDir, "a.md"), "ALPHA-CHANGED");
      const after = computeVersionHash(manifest(), packDir);
      expect(after).not.toBe(before);
    });

    it("CHANGES when quality_tier changes", () => {
      const before = computeVersionHash(manifest(), packDir);
      const m2 = { ...manifest(), quality_tier: "draft" };
      const after = computeVersionHash(m2, packDir);
      expect(after).not.toBe(before);
    });

    it("CHANGES when referenced_files[].required toggles", () => {
      const before = computeVersionHash(manifest(), packDir);
      const m2 = manifest();
      m2.referenced_files[1]!.required = true;
      const after = computeVersionHash(m2, packDir);
      expect(after).not.toBe(before);
    });

    it("CHANGES when referenced_files[].min_headings changes", () => {
      const before = computeVersionHash(manifest(), packDir);
      const m2 = manifest();
      m2.referenced_files[0]!.min_headings = 5;
      const after = computeVersionHash(m2, packDir);
      expect(after).not.toBe(before);
    });

    it("CHANGES when a referenced_files[].path is added", () => {
      writePackFiles(packDir, { "c.md": "gamma" });
      const before = computeVersionHash(manifest(), packDir);
      const m2 = manifest();
      m2.referenced_files.push({ path: "c.md", required: false });
      const after = computeVersionHash(m2, packDir);
      expect(after).not.toBe(before);
    });

    it("min_headings = null and absent are equivalent", () => {
      const m1 = manifest();
      m1.referenced_files[1]!.min_headings = null;
      const m2 = manifest();
      delete (m2.referenced_files[1] as ManifestForHash["referenced_files"][number]).min_headings;
      expect(computeVersionHash(m1, packDir)).toBe(
        computeVersionHash(m2, packDir),
      );
    });

    it("UNCHANGED when an unclassified pack file is added (auxiliary isolation)", () => {
      const before = computeVersionHash(manifest(), packDir);
      writePackFiles(packDir, { "auxiliary.md": "noise" });
      const after = computeVersionHash(manifest(), packDir);
      expect(after).toBe(before);
    });

    it("UNCHANGED when an optional classified file is missing (sentinel determinism)", () => {
      fs.unlinkSync(path.join(packDir, "b.md"));
      const a = computeVersionHash(manifest(), packDir);
      const b = computeVersionHash(manifest(), packDir);
      expect(a).toBe(b);
    });

    it("DIFFERS between 'file present' and 'file missing' (sentinel ≠ content hash)", () => {
      const present = computeVersionHash(manifest(), packDir);
      fs.unlinkSync(path.join(packDir, "b.md"));
      const missing = computeVersionHash(manifest(), packDir);
      expect(missing).not.toBe(present);
    });
  });
});
