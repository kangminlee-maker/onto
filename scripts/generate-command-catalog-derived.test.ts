/**
 * Tests — generate-command-catalog-derived.ts
 *
 * Pure-function coverage (parseArgs / summarizeCatalog / formatSummary) plus
 * a subprocess sanity check that the script runs end-to-end and does not
 * write any files in --dry-run mode.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
import {
  formatSummary,
  parseArgs,
  summarizeCatalog,
} from "./generate-command-catalog-derived.js";

describe("parseArgs", () => {
  it("returns defaults when no args are given", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, target: "all" });
  });

  it("parses --dry-run", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it("parses --target=<target>", () => {
    expect(parseArgs(["--target=markdown"]).target).toBe("markdown");
    expect(parseArgs(["--target=dispatcher"]).target).toBe("dispatcher");
    expect(parseArgs(["--target=help"]).target).toBe("help");
    expect(parseArgs(["--target=package-scripts"]).target).toBe("package-scripts");
    expect(parseArgs(["--target=all"]).target).toBe("all");
  });

  it("rejects the old homonym --target=scripts", () => {
    // Renamed to `package-scripts` so it does not collide with other senses
    // of the word "scripts" in this subsystem (RuntimeScriptEntry, scripts/
    // directory, npm scripts). Regression guard for the rename.
    expect(() => parseArgs(["--target=scripts"])).toThrow(
      /--target must be one of/,
    );
  });

  it("parses combined flags in any order", () => {
    expect(parseArgs(["--target=markdown", "--dry-run"])).toEqual({
      dryRun: true,
      target: "markdown",
    });
    expect(parseArgs(["--dry-run", "--target=markdown"])).toEqual({
      dryRun: true,
      target: "markdown",
    });
  });

  it("throws on unknown --target value", () => {
    expect(() => parseArgs(["--target=bogus"])).toThrow(/--target must be one of/);
  });

  it("throws on unknown argument", () => {
    expect(() => parseArgs(["--write"])).toThrow(/Unknown argument/);
  });
});

describe("summarizeCatalog", () => {
  it("matches the P1-1b populated counts", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: false, target: "all" });
    expect(s.entryCounts).toEqual({ public: 20, runtime_script: 25, meta: 2 });
  });

  it("returns a 64-char hex catalog hash", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: false, target: "all" });
    expect(s.catalogHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalized set size > number of PublicEntry (slash + cli + patterned + meta + sentinel)", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: false, target: "all" });
    expect(s.normalizedInvocationCount).toBeGreaterThan(s.entryCounts.public);
  });

  it("marks every derive target as pending in P1-2a (no emitters shipped)", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: false, target: "all" });
    expect(s.deriveTargetStatus).toEqual({
      markdown: "pending",
      dispatcher: "pending",
      help: "pending",
      "package-scripts": "pending",
    });
  });
});

describe("formatSummary", () => {
  it("contains a note that no derive output is written in P1-2a", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: true, target: "all" });
    expect(formatSummary(s)).toMatch(/no derive output is written/);
  });

  it("reports dry-run: yes when dryRun is true", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: true, target: "all" });
    expect(formatSummary(s)).toMatch(/dry-run\s*: yes/);
  });

  it("renders a derive-target readiness block naming each phase", () => {
    const s = summarizeCatalog(COMMAND_CATALOG, { dryRun: true, target: "all" });
    const out = formatSummary(s);
    expect(out).toMatch(/derive targets:/);
    expect(out).toMatch(/markdown\s+: pending \(lands in P1-2b\)/);
    expect(out).toMatch(/dispatcher\s+: pending \(lands in P1-2c\)/);
    expect(out).toMatch(/help\s+: pending \(lands in P1-2c\)/);
    expect(out).toMatch(/package-scripts\s+: pending \(lands in P1-2c\)/);
  });
});

describe("end-to-end subprocess", () => {
  const repoRoot = resolve(__dirname, "..");
  const scriptPath = resolve(__dirname, "generate-command-catalog-derived.ts");

  function snapshotMtimesBefore(): Map<string, number> {
    const snap = new Map<string, number>();
    for (const rel of [
      "src/core-runtime/cli/command-catalog.ts",
      "package.json",
      ".onto/commands/review.md",
    ]) {
      const full = resolve(repoRoot, rel);
      try {
        snap.set(rel, statSync(full).mtimeMs);
      } catch {
        // File may not exist in every checkout; skip.
      }
    }
    return snap;
  }

  it("runs --dry-run successfully and prints the summary", () => {
    const out = execFileSync(
      "npx",
      ["tsx", scriptPath, "--dry-run", "--target=all"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(out).toMatch(/command-catalog generator — P1-2a summary/);
    expect(out).toMatch(/dry-run\s*: yes/);
  });

  it("--dry-run does not modify tracked files", () => {
    const before = snapshotMtimesBefore();
    execFileSync("npx", ["tsx", scriptPath, "--dry-run"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    for (const [rel, mtime] of before) {
      const full = resolve(repoRoot, rel);
      expect(statSync(full).mtimeMs).toBe(mtime);
    }
  });

  it("exits non-zero on unknown flag", () => {
    let caught: Error | null = null;
    try {
      execFileSync("npx", ["tsx", scriptPath, "--write"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).not.toBeNull();
  });
});
