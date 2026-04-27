// runtime-mirror-of: step-4-integration §5.3 + §5.4 + §5.4.1 + §5.4.2

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { computeVersionHash } from "./manifest-version-hash.js";
import {
  type ConsoleIo,
  type DomainInitDeps,
  runDomainInit,
} from "./domain-init-cli.js";

class QueueIo implements ConsoleIo {
  public logs: string[] = [];
  public errors: string[] = [];
  private answers: string[];

  constructor(answers: string[]) {
    this.answers = [...answers];
  }

  async question(_prompt: string): Promise<string> {
    if (this.answers.length === 0) {
      throw new Error(`QueueIo: no more answers (prompt was: ${_prompt})`);
    }
    return this.answers.shift()!;
  }

  log(line: string): void {
    this.logs.push(line);
  }

  error(line: string): void {
    this.errors.push(line);
  }
}

function makeDeps(ontoHome: string, answers: string[]): DomainInitDeps {
  return {
    ontoHome,
    io: new QueueIo(answers),
    now: () => new Date("2026-04-27T12:00:00.000Z"),
  };
}

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

describe("runDomainInit (W-A-95)", () => {
  let ontoHome: string;

  beforeEach(() => {
    ontoHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-cli-"));
  });

  afterEach(() => {
    fs.rmSync(ontoHome, { recursive: true, force: true });
  });

  describe("init branch", () => {
    it("happy path — 4 canonical files + tier full + 0.1.0", async () => {
      seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
      });
      const answers = [
        "y", "y", "y", "y",                  // 4 classify (defaults all true)
        "full",                               // quality_tier
        "completed",                          // upgrade_status
        "test pack",                          // notes
        "0.1.0",                              // version
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "init", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const manifestRaw = fs.readFileSync(result.manifestPath, "utf8");
      const manifest = yamlParse(manifestRaw) as Record<string, unknown>;
      expect(manifest.domain_name).toBe("demo");
      expect(manifest.quality_tier).toBe("full");
      expect(manifest.domain_manifest_version).toBe("0.1.0");
      expect(manifest.manifest_schema_version).toBe("1.0");
      expect(manifest.recovery_from_malformed).toBe(false);
      expect(manifest.last_updated).toBe("2026-04-27T12:00:00.000Z");
      expect(manifest.version_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect((manifest.referenced_files as unknown[]).length).toBe(4);
    });

    it("empty pack directory → empty_pack_directory", async () => {
      const packDir = path.join(ontoHome, "domains", "empty");
      fs.mkdirSync(packDir, { recursive: true });
      const deps = makeDeps(ontoHome, []);
      const result = await runDomainInit(
        { branch: "init", domainName: "empty" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("empty_pack_directory");
      }
    });

    it("init refuses when manifest already exists", async () => {
      const packDir = seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
      });
      fs.writeFileSync(path.join(packDir, "manifest.yaml"), "existing: true\n");
      const deps = makeDeps(ontoHome, []);
      const result = await runDomainInit(
        { branch: "init", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_already_exists");
      }
    });

    it("default required for canonical = true, others = false", async () => {
      seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
        "extra.md": "# x\n",
      });
      const answers = [
        "", "", "", "", "",                  // 5 classify all default
        "partial", "in_progress", "", "0.2.0",
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "init", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const manifest = yamlParse(
        fs.readFileSync(result.manifestPath, "utf8"),
      ) as Record<string, unknown>;
      const refs = manifest.referenced_files as Array<{
        path: string;
        required: boolean;
      }>;
      expect(refs.find((r) => r.path === "concepts.md")?.required).toBe(true);
      expect(refs.find((r) => r.path === "extra.md")?.required).toBe(false);
    });
  });

  describe("migrate-existing branch", () => {
    it("rejects when manifest already exists", async () => {
      const packDir = seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
      fs.writeFileSync(path.join(packDir, "manifest.yaml"), "existing: true\n");
      const deps = makeDeps(ontoHome, []);
      const result = await runDomainInit(
        { branch: "migrate-existing", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_already_exists");
      }
    });

    it("happy path — same flow as init", async () => {
      seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
      });
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "migrated", "0.3.0",
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "migrate-existing", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const m = yamlParse(fs.readFileSync(result.manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(m.domain_manifest_version).toBe("0.3.0");
      expect(m.recovery_from_malformed).toBe(false);
    });
  });

  describe("regenerate branch", () => {
    function seedValidManifest(domain = "demo", version = "0.3.0"): string {
      const packDir = seedPackFiles(ontoHome, domain, {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
      });
      const refs = [
        { path: "concepts.md", required: true },
        { path: "structure_spec.md", required: true },
        { path: "logic_rules.md", required: true },
        { path: "domain_scope.md", required: true },
      ];
      const version_hash = computeVersionHash(
        { quality_tier: "full", referenced_files: refs },
        packDir,
      );
      const manifest = {
        manifest_schema_version: "1.0",
        domain_name: domain,
        domain_manifest_version: version,
        referenced_files: refs,
        quality_tier: "full",
        version_hash,
        notes: "prior",
        upgrade_status: "completed",
      };
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        yamlStringify(manifest),
      );
      return packDir;
    }

    it("rejects when manifest absent", async () => {
      seedPackFiles(ontoHome, "demo", { "concepts.md": "# c\n" });
      const deps = makeDeps(ontoHome, []);
      const result = await runDomainInit(
        { branch: "regenerate", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_absent_for_regenerate");
      }
    });

    it("happy path — bump enforced + backup created", async () => {
      seedValidManifest("demo", "0.3.0");
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "regenerated", "0.3.1",
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "regenerate", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.backupPath).toMatch(/manifest\.yaml\.bak-/);
      expect(fs.existsSync(result.backupPath!)).toBe(true);
      const m = yamlParse(fs.readFileSync(result.manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(m.domain_manifest_version).toBe("0.3.1");
      expect(m.recovery_from_malformed).toBe(false);
    });

    it("rejects non-bump (new <= old) with manifest_version_not_incremented", async () => {
      seedValidManifest("demo", "0.3.0");
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "", "0.3.0", // same version
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "regenerate", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_version_not_incremented");
      }
    });

    it("rejects downgrade", async () => {
      seedValidManifest("demo", "0.5.2");
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "", "0.4.0",
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "regenerate", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("manifest_version_not_incremented");
      }
    });

    it("malformed manifest — recovery skips comparator + sets recovery_from_malformed=true", async () => {
      const packDir = seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
      });
      // intentionally malformed manifest (YAML parse fail)
      fs.writeFileSync(
        path.join(packDir, "manifest.yaml"),
        ":::not yaml at all:::",
      );
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "recovery", "0.1.0", // any value (no comparator)
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "regenerate", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const m = yamlParse(fs.readFileSync(result.manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(m.recovery_from_malformed).toBe(true);
      expect(m.domain_manifest_version).toBe("0.1.0");
      expect(result.backupPath).not.toBeNull();
    });
  });

  describe("semver prompt retry", () => {
    it("re-asks on invalid semver, accepts on valid follow-up", async () => {
      seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
        "structure_spec.md": "# s\n",
        "logic_rules.md": "# l\n",
        "domain_scope.md": "# d\n",
      });
      const answers = [
        "y", "y", "y", "y",
        "full", "completed", "",
        "v0.3.0",   // invalid
        "0.3.0",    // valid
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "init", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(true);
      const io = deps.io as QueueIo;
      expect(io.errors.some((e) => e.includes("Invalid semver"))).toBe(true);
    });

    it("aborts after 3 invalid semver attempts", async () => {
      seedPackFiles(ontoHome, "demo", {
        "concepts.md": "# c\n",
      });
      const answers = [
        "y",
        "full", "completed", "",
        "bad1", "bad2", "bad3",
      ];
      const deps = makeDeps(ontoHome, answers);
      const result = await runDomainInit(
        { branch: "init", domainName: "demo" },
        deps,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("user_aborted");
      }
    });
  });
});
