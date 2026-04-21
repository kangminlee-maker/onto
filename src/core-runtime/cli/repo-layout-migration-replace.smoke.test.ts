/**
 * Smoke test for scripts/repo-layout-migration-replace.py.
 *
 * Phase 7 review follow-up (`coverage::migration-script-reuse-test-gap`):
 * the script is retained as a generic tool for future similar migrations,
 * but without a test surface its reuse claim has no executable evidence.
 * These tests pin the load-bearing invariants:
 *   - `--old` trailing-slash contract (substring-safety)
 *   - marker-based double-prefix prevention (the guard that makes the
 *     Phase 6–style `new` ⊃ `old` case work)
 *   - `--dry-run` does not write files
 *
 * The script is Python; the tests invoke it via child_process.spawnSync.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..", "..");
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "repo-layout-migration-replace.py");

function runScript(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("python3", [SCRIPT_PATH, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: typeof result.status === "number" ? result.status : -1,
  };
}

function makeTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `onto-migration-smoke-${prefix}-`));
}

describe("scripts/repo-layout-migration-replace.py — smoke invariants", () => {
  const tmpRoots: string[] = [];

  beforeEach(() => {
    tmpRoots.length = 0;
  });

  afterEach(() => {
    for (const root of tmpRoots) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("rejects --old without trailing slash (substring-safe contract)", () => {
    const root = makeTempRoot("no-slash");
    tmpRoots.push(root);
    const result = runScript(
      ["--old", "foo", "--new", ".onto/foo/", "--root", root, "--dry-run"],
      root,
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/substring-safe contract|must end with '\/'/);
  });

  it("performs a simple rewrite when new does not contain old", () => {
    const root = makeTempRoot("simple");
    tmpRoots.push(root);
    const fixture = path.join(root, "notes.md");
    fs.writeFileSync(fixture, "reference to oldpath/file.md and oldpath/other.md\n", "utf8");

    const result = runScript(
      ["--old", "oldpath/", "--new", "canon/", "--root", root],
      root,
    );
    expect(result.status).toBe(0);
    expect(fs.readFileSync(fixture, "utf8")).toBe(
      "reference to canon/file.md and canon/other.md\n",
    );
  });

  it("marker guard: when --new contains --old, rewriting is idempotent across reruns", () => {
    // This is the Phase 6 pattern — `.onto/authority/` contains `authority/`.
    // Naive str.replace would produce `.onto/.onto/authority/authority/...`
    // on rerun. The NUL-sentinel marker protects already-new references.
    const root = makeTempRoot("marker");
    tmpRoots.push(root);
    const fixture = path.join(root, "refs.md");
    fs.writeFileSync(
      fixture,
      "legacy authority/core.yaml and existing .onto/authority/other.yaml\n",
      "utf8",
    );

    // First run — rewrite legacy to canonical.
    let result = runScript(
      ["--old", "authority/", "--new", ".onto/authority/", "--root", root],
      root,
    );
    expect(result.status).toBe(0);
    expect(fs.readFileSync(fixture, "utf8")).toBe(
      "legacy .onto/authority/core.yaml and existing .onto/authority/other.yaml\n",
    );

    // Second run — file already fully canonical. Guard must keep it stable.
    result = runScript(
      ["--old", "authority/", "--new", ".onto/authority/", "--root", root],
      root,
    );
    expect(result.status).toBe(0);
    expect(fs.readFileSync(fixture, "utf8")).toBe(
      "legacy .onto/authority/core.yaml and existing .onto/authority/other.yaml\n",
    );
  });

  it("--dry-run does not write files even when matches exist", () => {
    const root = makeTempRoot("dry-run");
    tmpRoots.push(root);
    const fixture = path.join(root, "refs.md");
    const original = "pointer to oldref/x.md\n";
    fs.writeFileSync(fixture, original, "utf8");

    const result = runScript(
      ["--old", "oldref/", "--new", "newref/", "--root", root, "--dry-run"],
      root,
    );
    expect(result.status).toBe(0);
    expect(fs.readFileSync(fixture, "utf8")).toBe(original);
  });

  it("excludes .onto/review/ by default (audit-artifact guard)", () => {
    const root = makeTempRoot("review-exclude");
    tmpRoots.push(root);
    const reviewFile = path.join(root, ".onto", "review", "past-session", "final.md");
    fs.mkdirSync(path.dirname(reviewFile), { recursive: true });
    fs.writeFileSync(reviewFile, "historical reference to oldname/x.md\n", "utf8");

    const result = runScript(
      ["--old", "oldname/", "--new", "newname/", "--root", root],
      root,
    );
    expect(result.status).toBe(0);
    expect(fs.readFileSync(reviewFile, "utf8")).toBe(
      "historical reference to oldname/x.md\n",
    );
  });
});
