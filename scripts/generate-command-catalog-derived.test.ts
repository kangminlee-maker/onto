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
    expect(parseArgs(["--target=scripts"]).target).toBe("scripts");
    expect(parseArgs(["--target=all"]).target).toBe("all");
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
