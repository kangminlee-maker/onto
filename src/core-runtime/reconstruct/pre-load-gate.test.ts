// runtime-mirror-of: step-4-integration §5.4.2 + §5.5

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { computeVersionHash } from "./manifest-version-hash.js";
import {
  SUPPORTED_MANIFEST_SCHEMA_VERSIONS,
  preLoadManifest,
} from "./pre-load-gate.js";

function buildValidPackDir(rootTmp: string, domain = "demo-domain"): string {
  const packDir = path.join(rootTmp, domain);
  fs.mkdirSync(packDir, { recursive: true });
  fs.writeFileSync(path.join(packDir, "concepts.md"), "# concepts\n");
  fs.writeFileSync(path.join(packDir, "structure.md"), "# structure\n");

  const manifestForHash = {
    quality_tier: "full",
    referenced_files: [
      { path: "concepts.md", required: true, min_headings: 1 },
      { path: "structure.md", required: false },
    ],
  };
  const version_hash = computeVersionHash(manifestForHash, packDir);

  const manifest = {
    manifest_schema_version: "1.0",
    domain_name: domain,
    domain_manifest_version: "0.1.0",
    referenced_files: manifestForHash.referenced_files,
    quality_tier: "full",
    version_hash,
    notes: "test fixture",
    upgrade_status: "completed",
  };
  fs.writeFileSync(
    path.join(packDir, "manifest.yaml"),
    yamlStringify(manifest),
  );
  return packDir;
}

function rewriteManifest(
  packDir: string,
  patch: Record<string, unknown>,
): void {
  const raw = fs.readFileSync(path.join(packDir, "manifest.yaml"), "utf8");
  const obj = yamlParse(raw) as Record<string, unknown>;
  Object.assign(obj, patch);
  fs.writeFileSync(
    path.join(packDir, "manifest.yaml"),
    yamlStringify(obj),
  );
}

describe("pre-load-gate (W-A-99)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-preload-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("happy path", () => {
    it("returns ok with parsed manifest for a valid pack", () => {
      const packDir = buildValidPackDir(tmpDir);
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.manifest.domain_name).toBe("demo-domain");
        expect(result.manifest.domain_manifest_version).toBe("0.1.0");
        expect(result.manifest.referenced_files).toHaveLength(2);
      }
    });
  });

  describe("manifest_malformed — parse-time", () => {
    it("missing manifest.yaml file", () => {
      const packDir = path.join(tmpDir, "no-manifest");
      fs.mkdirSync(packDir, { recursive: true });
      const result = preLoadManifest(packDir);
      expect(result).toEqual({
        ok: false,
        code: "manifest_malformed",
        detail: expect.stringContaining("not found"),
      });
    });

    it("YAML parse error", () => {
      const packDir = path.join(tmpDir, "broken-yaml");
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        "key: : invalid : :\n  - badly indented\n   nested",
      );
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
      }
    });

    it("top-level array instead of mapping", () => {
      const packDir = path.join(tmpDir, "array-top");
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        "- foo\n- bar\n",
      );
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
        expect(result.detail).toContain("mapping");
      }
    });
  });

  describe("manifest_malformed — required field missing", () => {
    it.each([
      "manifest_schema_version",
      "domain_name",
      "domain_manifest_version",
      "referenced_files",
      "quality_tier",
      "version_hash",
    ])("missing %s halts as malformed", (field) => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, { [field]: null });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
        expect(result.detail).toContain(field);
      }
    });
  });

  describe("manifest_malformed — schema version + structural", () => {
    it("unsupported manifest_schema_version", () => {
      expect(SUPPORTED_MANIFEST_SCHEMA_VERSIONS).toEqual(["1.0"]);
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, { manifest_schema_version: "9.99" });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
        expect(result.detail).toContain("manifest_schema_version");
      }
    });

    it("referenced_files not an array", () => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, { referenced_files: "not an array" });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
      }
    });

    it("referenced_files entry missing path", () => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, {
        referenced_files: [{ required: true }],
      });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
      }
    });

    it("referenced_files entry with non-numeric min_headings", () => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, {
        referenced_files: [
          { path: "concepts.md", required: true, min_headings: "three" },
        ],
      });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
      }
    });
  });

  describe("manifest_identity_mismatch", () => {
    it("packDir basename != manifest.domain_name", () => {
      const packDir = buildValidPackDir(tmpDir, "demo-domain");
      rewriteManifest(packDir, { domain_name: "wrong-name" });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_identity_mismatch");
        expect(result.detail).toContain("demo-domain");
        expect(result.detail).toContain("wrong-name");
      }
    });
  });

  describe("manifest_version_format_invalid", () => {
    it.each(["0.3", "v0.3.0", "0.03.0", "0.3.0-alpha", "abc"])(
      "rejects %s as format invalid",
      (badVersion) => {
        const packDir = buildValidPackDir(tmpDir);
        rewriteManifest(packDir, { domain_manifest_version: badVersion });
        const result = preLoadManifest(packDir);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.code).toBe("manifest_version_format_invalid");
        }
      },
    );
  });

  describe("manifest_version_hash_mismatch", () => {
    it("classified file edited after manifest write", () => {
      const packDir = buildValidPackDir(tmpDir);
      fs.writeFileSync(path.join(packDir, "concepts.md"), "# CHANGED\n");
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_version_hash_mismatch");
        expect(result.detail).toContain("sha256:");
      }
    });

    it("stored version_hash manually corrupted", () => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, {
        version_hash: "sha256:" + "0".repeat(64),
      });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_version_hash_mismatch");
      }
    });

    it("auxiliary (non-classified) pack file added → still ok (hash unchanged)", () => {
      const packDir = buildValidPackDir(tmpDir);
      fs.writeFileSync(path.join(packDir, "auxiliary.md"), "# noise\n");
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(true);
    });
  });

  describe("sequencing — earlier checks fire before later ones", () => {
    it("malformed YAML fires before identity check (no domain_name read needed)", () => {
      const packDir = path.join(tmpDir, "wrong-name");
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        ":::not yaml at all:::",
      );
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_malformed");
      }
    });

    it("identity mismatch fires before semver grammar (when both would fail)", () => {
      const packDir = buildValidPackDir(tmpDir, "demo-domain");
      rewriteManifest(packDir, {
        domain_name: "wrong-name",
        domain_manifest_version: "v0.3.0",
      });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_identity_mismatch");
      }
    });

    it("semver grammar fires before hash recompute (when both would fail)", () => {
      const packDir = buildValidPackDir(tmpDir);
      rewriteManifest(packDir, {
        domain_manifest_version: "v0.3.0",
        version_hash: "sha256:" + "f".repeat(64),
      });
      const result = preLoadManifest(packDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_version_format_invalid");
      }
    });
  });
});
