/**
 * Tests — dispatcher-prod-smoke.test.ts (P2-A — RFC-1 §6.1.2 prod path).
 *
 * Verifies the **production path** through `bin/onto` after `npm run build:ts-core`:
 * bin/onto sees `dist/core-runtime/cli/dispatcher.js` exists and imports it
 * directly (no tsx). This exercises:
 *   - `resolveHandlerModule()` 의 dev↔prod 매핑 (`/dist/` URL detection +
 *     `src/`→`dist/` + `.ts`→`.js` rewrite)
 *   - `ONTO_HOME` initialization by bin/onto (UF-DEPENDENCY-ONTO-HOME-SMOKE)
 *   - Static `META_DISPATCH_TABLE` / `PUBLIC_DISPATCH_TABLE` baked into
 *     compiled preboot-dispatch.js
 *   - `dispatchPrebootCore` dynamic-import resolution from compiled module
 *
 * The `dispatcher-smoke.test.ts` companion covers dev (tsx) path. This file
 * is the **prod-divergence guard** — without it, P2-A could land with prod
 * silently broken (RFC-1 §7.1 risk row 1).
 *
 * Test discipline: build dist before each suite (slow). To avoid blowing
 * dev cycle time, this test file is opt-in via `npx vitest run` (not
 * included in the default vitest watch). The 5-step prerequisite (RFC-1 §5.3
 * step 5) explicitly runs this script before merge.
 *
 * Coverage target rows (RFC-1 §6.1.2):
 *   - prod-path long-flag (`--help`, `--version`)
 *   - prod-path short-flag (`-h`, `-v`) — UF-COVERAGE-PROD-SHORT-FLAG-PATH
 *   - prod-path public preboot dispatch (`info`, etc.)
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const BIN_ONTO = path.join(REPO_ROOT, "bin", "onto");
const DIST_DISPATCHER = path.join(
  REPO_ROOT,
  "dist",
  "core-runtime",
  "cli",
  "dispatcher.js",
);

type SpawnResult = {
  stdout: string;
  stderr: string;
  status: number;
};

function runOntoProd(
  args: readonly string[],
  extraEnv?: Record<string, string>,
): SpawnResult {
  try {
    const stdout = execFileSync(BIN_ONTO, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, ONTO_HOME: REPO_ROOT, ...(extraEnv ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err) {
    const e = err as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
    };
    return {
      stdout: typeof e.stdout === "string" ? e.stdout : (e.stdout?.toString() ?? ""),
      stderr: typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString() ?? ""),
      status: e.status ?? 1,
    };
  }
}

describe("dispatcher prod smoke (P2-A — bin/onto via compiled dist)", () => {
  beforeAll(() => {
    // Build dist if missing or older than any source file. This makes the
    // test self-bootstrapping in CI; locally, dev can pre-build to skip.
    let needsBuild = !existsSync(DIST_DISPATCHER);
    if (!needsBuild) {
      const distMtime = statSync(DIST_DISPATCHER).mtimeMs;
      const srcDispatcher = path.join(
        REPO_ROOT,
        "src",
        "core-runtime",
        "cli",
        "dispatcher.ts",
      );
      const srcMtime = statSync(srcDispatcher).mtimeMs;
      if (srcMtime > distMtime) needsBuild = true;
    }
    if (needsBuild) {
      execFileSync("npm", ["run", "build:ts-core"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    }
    if (!existsSync(DIST_DISPATCHER)) {
      throw new Error(
        `dispatcher-prod-smoke: build did not produce ${DIST_DISPATCHER}. ` +
          `Check tsconfig.json + npm run build:ts-core output.`,
      );
    }
  }, /* timeout */ 60000);

  it("bin/onto --help (prod) → exit 0 + Usage banner", () => {
    const r = runOntoProd(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
    expect(r.stdout).toContain("Subcommands:");
  });

  it("bin/onto -h (prod short-flag) → exit 0 + Usage banner — UF-COVERAGE-PROD-SHORT-FLAG-PATH", () => {
    const r = runOntoProd(["-h"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
  });

  it("bin/onto --version (prod) → exit 0 + onto-core <version>", () => {
    const r = runOntoProd(["--version"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^onto-core \d+\.\d+\.\d+/);
  });

  it("bin/onto -v (prod short-flag non-help meta) → exit 0 + version", () => {
    const r = runOntoProd(["-v"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^onto-core \d+\.\d+\.\d+/);
  });

  it("bin/onto (bare, prod) → exit 0 + Usage banner (default_for=bare_onto routing)", () => {
    const r = runOntoProd([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
  });

  it("bin/onto info (prod public preboot) → exit 0 + JSON with onto_home", () => {
    const r = runOntoProd(["info"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("onto_home");
    expect(r.stdout).toContain("installation_mode");
  });

  it("bin/onto <unknown> (prod) → exit 1 + 'Unknown subcommand'", () => {
    const r = runOntoProd(["definitely-not-a-subcommand-xyz"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("Unknown subcommand");
  });
});
