// runtime-mirror-of: step-4-integration §5.6 + §5.6.1 + §5.6.3

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { computeVersionHash } from "./manifest-version-hash.js";
import {
  runDomainInitFromConfig,
  validateDomainInitConfig,
} from "./domain-init-config.js";

function seedPackFiles(
  ontoHome: string,
  domain: string,
  files: Record<string, string>,
): string {
  const packDir = path.join(ontoHome, "domains", domain);
  fs.mkdirSync(packDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(packDir, name), content);
  }
  return packDir;
}

function writeConfigFile(dir: string, payload: unknown): string {
  const configPath = path.join(dir, "config.yaml");
  fs.writeFileSync(configPath, yamlStringify(payload));
  return configPath;
}

const validConfig = {
  name: "demo",
  domain_manifest_version: "0.1.0",
  referenced_files: [
    { path: "concepts.md", required: true, min_headings: 3 },
    { path: "structure_spec.md", required: true },
  ],
  quality_tier: "full",
  upgrade_status: "completed",
  notes: "test config",
};

describe("validateDomainInitConfig (W-A-96)", () => {
  it("accepts valid config", () => {
    const r = validateDomainInitConfig(validConfig);
    expect(r.ok).toBe(true);
  });

  it.each([
    "name",
    "domain_manifest_version",
    "referenced_files",
    "quality_tier",
    "upgrade_status",
  ])("rejects when '%s' missing", (field) => {
    const c = { ...validConfig } as Record<string, unknown>;
    delete c[field];
    const r = validateDomainInitConfig(c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain(field);
  });

  it("rejects non-string name", () => {
    const r = validateDomainInitConfig({ ...validConfig, name: 42 });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid quality_tier", () => {
    const r = validateDomainInitConfig({ ...validConfig, quality_tier: "ultra" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("quality_tier");
  });

  it("rejects invalid upgrade_status", () => {
    const r = validateDomainInitConfig({
      ...validConfig,
      upgrade_status: "totally_done",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty referenced_files", () => {
    const r = validateDomainInitConfig({ ...validConfig, referenced_files: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects referenced_files entry missing required boolean", () => {
    const r = validateDomainInitConfig({
      ...validConfig,
      referenced_files: [{ path: "a.md" }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects min_headings of wrong type", () => {
    const r = validateDomainInitConfig({
      ...validConfig,
      referenced_files: [
        { path: "a.md", required: true, min_headings: "many" },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("accepts notes absent", () => {
    const c = { ...validConfig } as Record<string, unknown>;
    delete c.notes;
    const r = validateDomainInitConfig(c);
    expect(r.ok).toBe(true);
  });

  it("rejects non-mapping top-level", () => {
    const r = validateDomainInitConfig(["array"]);
    expect(r.ok).toBe(false);
  });
});

describe("runDomainInitFromConfig (W-A-96)", () => {
  let ontoHome: string;
  let workDir: string;

  beforeEach(() => {
    ontoHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-cfg-"));
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-cfgwork-"));
  });

  afterEach(() => {
    fs.rmSync(ontoHome, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function deps() {
    return {
      ontoHome,
      now: () => new Date("2026-04-27T12:00:00.000Z"),
    };
  }

  it("init happy path — manifest written from config", async () => {
    seedPackFiles(ontoHome, "demo", {
      "concepts.md": "# c\n",
      "structure_spec.md": "# s\n",
    });
    const configPath = writeConfigFile(workDir, validConfig);
    const r = await runDomainInitFromConfig(
      { branch: "init", domainName: "demo" },
      configPath,
      deps(),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = yamlParse(fs.readFileSync(r.manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(m.domain_name).toBe("demo");
    expect(m.domain_manifest_version).toBe("0.1.0");
    expect(m.recovery_from_malformed).toBe(false);
    expect(m.last_updated).toBe("2026-04-27T12:00:00.000Z");
    expect(m.notes).toBe("test config");
  });

  it("config_schema_invalid — config file missing", async () => {
    seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
    const r = await runDomainInitFromConfig(
      { branch: "init", domainName: "demo" },
      path.join(workDir, "no-such.yaml"),
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("config_schema_invalid");
      expect(r.detail).toContain("not found");
    }
  });

  it("config_schema_invalid — required field missing", async () => {
    seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
    const c = { ...validConfig } as Record<string, unknown>;
    delete c.quality_tier;
    const configPath = writeConfigFile(workDir, c);
    const r = await runDomainInitFromConfig(
      { branch: "init", domainName: "demo" },
      configPath,
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("config_schema_invalid");
      expect(r.detail).toContain("quality_tier");
    }
  });

  it("manifest_version_format_invalid — semver grammar fail", async () => {
    seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
    const configPath = writeConfigFile(workDir, {
      ...validConfig,
      domain_manifest_version: "v0.3.0",
    });
    const r = await runDomainInitFromConfig(
      { branch: "init", domainName: "demo" },
      configPath,
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("manifest_version_format_invalid");
    }
  });

  it("init refuses when manifest exists", async () => {
    const packDir = seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
    fs.writeFileSync(path.join(packDir, "manifest.yaml"), "existing: true\n");
    const configPath = writeConfigFile(workDir, validConfig);
    const r = await runDomainInitFromConfig(
      { branch: "init", domainName: "demo" },
      configPath,
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("manifest_already_exists");
  });

  it("regenerate refuses when manifest absent", async () => {
    seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
    const configPath = writeConfigFile(workDir, validConfig);
    const r = await runDomainInitFromConfig(
      { branch: "regenerate", domainName: "demo" },
      configPath,
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("manifest_absent_for_regenerate");
  });

  describe("regenerate branch — bump comparator", () => {
    function seedValidPriorManifest(version: string): string {
      const packDir = seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
      });
      const refs = [
        { path: "concepts.md", required: true, min_headings: 3 },
        { path: "structure_spec.md", required: true },
      ];
      const version_hash = computeVersionHash(
        { quality_tier: "full", referenced_files: refs },
        packDir,
      );
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        yamlStringify({
          manifest_schema_version: "1.0",
          domain_name: "demo",
          domain_manifest_version: version,
          referenced_files: refs,
          quality_tier: "full",
          version_hash,
        }),
      );
      return packDir;
    }

    it("happy path — bump enforced + backup + recovery=false", async () => {
      seedValidPriorManifest("0.3.0");
      const configPath = writeConfigFile(workDir, {
        ...validConfig,
        domain_manifest_version: "0.3.1",
      });
      const r = await runDomainInitFromConfig(
        { branch: "regenerate", domainName: "demo" },
        configPath,
        deps(),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.backupPath).toMatch(/manifest\.yaml\.bak-/);
      const m = yamlParse(fs.readFileSync(r.manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(m.domain_manifest_version).toBe("0.3.1");
      expect(m.recovery_from_malformed).toBe(false);
    });

    it("non-bump (same version) → manifest_version_not_incremented", async () => {
      seedValidPriorManifest("0.3.0");
      const configPath = writeConfigFile(workDir, {
        ...validConfig,
        domain_manifest_version: "0.3.0",
      });
      const r = await runDomainInitFromConfig(
        { branch: "regenerate", domainName: "demo" },
        configPath,
        deps(),
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("manifest_version_not_incremented");
      }
    });

    it("downgrade → manifest_version_not_incremented", async () => {
      seedValidPriorManifest("0.5.0");
      const configPath = writeConfigFile(workDir, {
        ...validConfig,
        domain_manifest_version: "0.4.0",
      });
      const r = await runDomainInitFromConfig(
        { branch: "regenerate", domainName: "demo" },
        configPath,
        deps(),
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("manifest_version_not_incremented");
      }
    });

    it("malformed prior → comparator skip + recovery_from_malformed=true", async () => {
      const packDir = seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
      });
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        ":::not yaml at all:::",
      );
      const configPath = writeConfigFile(workDir, validConfig);
      const r = await runDomainInitFromConfig(
        { branch: "regenerate", domainName: "demo" },
        configPath,
        deps(),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const m = yamlParse(fs.readFileSync(r.manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(m.recovery_from_malformed).toBe(true);
      expect(r.backupPath).not.toBeNull();
    });
  });
});
