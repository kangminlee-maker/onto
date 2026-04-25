/**
 * Tests — dispatcher-smoke.test.ts (P1-3).
 *
 * End-to-end smoke checks that exercise the full bin/onto → dispatcher.ts
 * → preboot-dispatch.ts (or cli.ts main) routing in dev mode (tsx). These
 * are the only tests that actually reach the generated dispatcher.ts at
 * runtime; deriver-side `*-deriver.test.ts` tests verify byte-output but
 * never load the emitted file.
 *
 * The `assertDispatcherDeriveHash()` runtime guard is implicitly exercised
 * on every spawn: if the EXPECTED_DERIVE_HASH (in the generated dispatcher.ts)
 * disagrees with the live catalog, dispatcher's module load fails fast
 * with a non-zero exit code. So a passing smoke = the catalog and
 * dispatcher.ts are in sync.
 *
 * Drift behavior (negative path) is not covered here — simulating a
 * mismatch requires either module mocking or temporarily mutating the
 * generated file, both of which are brittle. The P1-4 CI drift workflow
 * is the canonical guard for that case (design §9).
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const BIN_ONTO = path.join(REPO_ROOT, "bin", "onto");

type SpawnResult = {
  stdout: string;
  stderr: string;
  status: number;
};

function runOnto(args: readonly string[], extraEnv?: Record<string, string>): SpawnResult {
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

describe("dispatcher smoke (P1-3)", () => {
  it("bin/onto --version → exit 0 + onto-core <version>", () => {
    const r = runOnto(["--version"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^onto-core \d+\.\d+\.\d+/);
  });

  it("bin/onto --help → exit 0 + Usage banner + Subcommands section", () => {
    const r = runOnto(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
    expect(r.stdout).toContain("Subcommands:");
    expect(r.stdout).toContain("info");
    expect(r.stdout).toContain("review");
  });

  it("bin/onto -h → same as --help (short flag)", () => {
    const r = runOnto(["-h"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
  });

  it("bin/onto (bare) → exit 0 + help text (default_for=bare_onto)", () => {
    const r = runOnto([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto <subcommand>");
  });

  it("bin/onto <unknown> → non-zero exit + stderr 'Unknown subcommand'", () => {
    const r = runOnto(["definitely-not-a-subcommand-xyz"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("Unknown subcommand");
  });

  it("ONTO_ALLOW_STALE_DISPATCHER=1 does not break a non-drift run", () => {
    // Sanity: the env flag is a bypass for drift, not a behavior toggle in the
    // happy path. Setting it on a clean run must produce the same output.
    const r = runOnto(["--version"], { ONTO_ALLOW_STALE_DISPATCHER: "1" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^onto-core \d+\.\d+\.\d+/);
  });

  // P1-3 review Must 1 — exercise the dispatcher's PHASE_MAP routing
  // beyond meta-only. `info` is a preboot PublicEntry that flows through
  // dispatcher → preboot-dispatch → cli.ts main; `coordinator` (no args)
  // is a post_boot PublicEntry that flows through dispatcher → cli.ts main.

  it("preboot PublicEntry — bin/onto info → exit 0 + JSON with onto_home key", () => {
    const r = runOnto(["info"]);
    expect(r.status).toBe(0);
    // info prints a JSON blob describing the install. The exact shape is
    // owned by cli.ts; this assertion is shape-only so cosmetic edits do
    // not falsely fail the smoke.
    expect(r.stdout).toContain("onto_home");
    expect(r.stdout).toContain("installation_mode");
  });

  it("post_boot PublicEntry — bin/onto coordinator (no args) → exit 0 + subcommand help", () => {
    const r = runOnto(["coordinator"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage: onto coordinator <subcommand>");
    expect(r.stdout).toContain("start");
    expect(r.stdout).toContain("next");
    expect(r.stdout).toContain("status");
  });

  // P1-3 5th review (session 20260425-db4ba824) — close the dispatcher
  // boundary regression by verifying that NORMALIZED-recognized but
  // bin/onto-inadmissible invocations are rejected at dispatcher.ts, not
  // forwarded into cli.ts main(). The 4th-pass commit (d46a9e8) added
  // the rejection logic; this case is the standing regression guard.
  it("slash invocation rejected at dispatcher boundary — bin/onto /onto:review → exit 1", () => {
    const r = runOnto(["/onto:review"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("slash command");
    expect(r.stderr).toContain("/onto:review");
    // The error must not be the generic "Unknown subcommand" — that would
    // mean dispatcher leaked the slash key downstream instead of rejecting
    // at the boundary.
    expect(r.stderr).not.toContain("Unknown subcommand");
  });
});
