/**
 * Tests — package-scripts-deriver.test.ts (P1-2c).
 *
 * Stage 1 (unit + invariants):
 *   - buildScriptCommand handles tsx / bash invokers and args correctly.
 *   - buildExpectedScripts preserves EXCLUDED keys' values + relative order.
 *   - diffScripts detects orphan / missing / mismatched entries.
 *   - 1:1 invariant against committed package.json: every catalog
 *     RuntimeScriptEntry name appears as a package.json scripts key, and
 *     every package.json scripts key is either in catalog or in
 *     EXCLUDED_PACKAGE_SCRIPTS.
 *
 * Stage 2 (diff-0):
 *   - Default mode: deriveAllPackageScripts dry-run produces the same JSON
 *     bytes as the committed package.json.
 *   - UPDATE_SNAPSHOT=1: actually rewrite package.json.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import type { RuntimeScriptEntry } from "../../src/core-runtime/cli/command-catalog.js";
import {
  EXCLUDED_PACKAGE_SCRIPTS,
  PACKAGE_SCRIPTS_EMISSION_PATH,
  buildExpectedScripts,
  buildScriptCommand,
  deriveAllPackageScripts,
  diffScripts,
} from "./package-scripts-deriver.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const PACKAGE_JSON_ABS = path.resolve(REPO_ROOT, PACKAGE_SCRIPTS_EMISSION_PATH);

const SHOULD_UPDATE = process.env.UPDATE_SNAPSHOT === "1";

function readPackageScripts(): Record<string, string> {
  const text = readFileSync(PACKAGE_JSON_ABS, "utf8");
  const pkg = JSON.parse(text) as { scripts?: Record<string, string> };
  return pkg.scripts ?? {};
}

const SAMPLE_TSX_NO_ARGS: RuntimeScriptEntry = {
  kind: "runtime_script",
  name: "review:invoke",
  script_path: "src/core-runtime/cli/review-invoke.ts",
  invoker: "tsx",
  description: "x",
};

const SAMPLE_TSX_WITH_ARGS: RuntimeScriptEntry = {
  kind: "runtime_script",
  name: "coordinator:start",
  script_path: "src/core-runtime/cli/coordinator-state-machine.ts",
  invoker: "tsx",
  args: ["start"],
  description: "x",
};

const SAMPLE_BASH: RuntimeScriptEntry = {
  kind: "runtime_script",
  name: "review:watch",
  script_path: "scripts/onto-review-watch.sh",
  invoker: "bash",
  description: "x",
};

describe("Stage 1 — package-scripts-deriver unit", () => {
  it("buildScriptCommand: tsx without args", () => {
    expect(buildScriptCommand(SAMPLE_TSX_NO_ARGS)).toBe(
      "tsx src/core-runtime/cli/review-invoke.ts",
    );
  });

  it("buildScriptCommand: tsx with args", () => {
    expect(buildScriptCommand(SAMPLE_TSX_WITH_ARGS)).toBe(
      "tsx src/core-runtime/cli/coordinator-state-machine.ts start",
    );
  });

  it("buildScriptCommand: bash invoker", () => {
    expect(buildScriptCommand(SAMPLE_BASH)).toBe(
      "bash scripts/onto-review-watch.sh",
    );
  });

  it("buildExpectedScripts preserves EXCLUDED keys' values + order", () => {
    const current: Record<string, string> = {
      prepare: "echo hi",
      "build:ts-core": "tsc -p tsconfig.json",
      "review:invoke": "WRONG",
    };
    const expected = buildExpectedScripts(COMMAND_CATALOG, current);
    expect(expected.prepare).toBe("echo hi");
    expect(expected["build:ts-core"]).toBe("tsc -p tsconfig.json");
    // catalog-derived value supersedes any current value.
    expect(expected["review:invoke"]).toBe(
      "tsx src/core-runtime/cli/review-invoke.ts",
    );
    // EXCLUDED keys come first.
    const keys = Object.keys(expected);
    const prepareIdx = keys.indexOf("prepare");
    const reviewIdx = keys.indexOf("review:invoke");
    expect(prepareIdx).toBeGreaterThanOrEqual(0);
    expect(reviewIdx).toBeGreaterThan(prepareIdx);
  });

  it("diffScripts detects orphan keys", () => {
    const current: Record<string, string> = {
      "review:invoke": "tsx src/core-runtime/cli/review-invoke.ts",
      "stray:key": "echo no",
    };
    const issues = diffScripts(COMMAND_CATALOG, current);
    const orphans = issues.filter((i) => i.kind === "orphan-package-script");
    expect(orphans.some((o) => o.kind === "orphan-package-script" && o.name === "stray:key")).toBe(
      true,
    );
  });

  it("diffScripts detects missing-from-package", () => {
    const current: Record<string, string> = {}; // empty
    const issues = diffScripts(COMMAND_CATALOG, current);
    expect(issues.some((i) => i.kind === "missing-from-package")).toBe(true);
  });

  it("diffScripts detects value-mismatch", () => {
    const current = readPackageScripts();
    const tampered = { ...current, "review:invoke": "tsx WRONG_PATH" };
    const issues = diffScripts(COMMAND_CATALOG, tampered);
    expect(
      issues.some(
        (i) =>
          i.kind === "value-mismatch" && i.name === "review:invoke",
      ),
    ).toBe(true);
  });

  it("EXCLUDED list and catalog runtime_script names are disjoint", () => {
    const catalogNames = new Set<string>();
    for (const e of COMMAND_CATALOG.entries) {
      if (e.kind === "runtime_script") catalogNames.add(e.name);
    }
    for (const x of EXCLUDED_PACKAGE_SCRIPTS) {
      expect(catalogNames.has(x)).toBe(false);
    }
  });

  it("snapshotMode=true without UPDATE_SNAPSHOT=1 throws", () => {
    if (process.env.UPDATE_SNAPSHOT === "1") return;
    expect(() =>
      deriveAllPackageScripts(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      }),
    ).toThrow(/UPDATE_SNAPSHOT=1/);
  });
});

describe("Stage 2 — derive pipeline", () => {
  if (SHOULD_UPDATE) {
    it("UPDATE_SNAPSHOT=1 — rewrites package.json (bootstrap)", () => {
      const result = deriveAllPackageScripts(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(typeof result.written).toBe("boolean");
    });
  } else {
    it("default mode — package.json scripts match catalog (1:1, value-equal)", () => {
      const current = readPackageScripts();
      const issues = diffScripts(COMMAND_CATALOG, current);
      if (issues.length > 0) {
        const lines = issues
          .map((i) => `  ${i.kind} :: ${(i as { name: string }).name}`)
          .join("\n");
        throw new Error(
          `package.json scripts drift vs catalog (${issues.length}):\n${lines}\n\n` +
            `Run: UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/package-scripts-deriver.test.ts`,
        );
      }
    });

    it("default mode — dry-run does not raise", () => {
      expect(() =>
        deriveAllPackageScripts(COMMAND_CATALOG, {
          dryRun: true,
          projectRoot: REPO_ROOT,
        }),
      ).not.toThrow();
    });
  }
});
