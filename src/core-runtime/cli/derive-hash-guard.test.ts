/**
 * Tests — derive-hash-guard.test.ts (P1-3 review iteration).
 *
 * Covers the negative path of the dispatcher's load-time integrity check.
 * The generated `dispatcher.ts` calls `checkDeriveHash` and acts on the
 * tagged result; the side effects (stderr write, process.exit) are wired
 * by the caller. By unit-testing the decision function we exercise the
 * mismatch / bypass branches that were previously only reachable by
 * mutating the generated file or spawning a subprocess.
 *
 * P1-2c review (UF-COVERAGE-RUNTIME-STALE-GUARD) and P1-3 review (Must 2)
 * both flagged the absence of negative-path coverage; this test closes
 * that gap.
 */

import { describe, expect, it } from "vitest";
import {
  checkDeriveHash,
  formatBypassWarning,
  formatMismatchError,
} from "./derive-hash-guard.js";

describe("checkDeriveHash", () => {
  it("returns ok when expected and actual are equal", () => {
    const result = checkDeriveHash({
      expected: "abc123",
      actual: "abc123",
      env: {},
      bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
    });
    expect(result.kind).toBe("ok");
  });

  it("returns mismatch when hashes differ and no bypass env var is set", () => {
    const result = checkDeriveHash({
      expected: "abc123",
      actual: "def456",
      env: {},
      bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
    });
    expect(result.kind).toBe("mismatch");
    if (result.kind === "mismatch") {
      expect(result.expected).toBe("abc123");
      expect(result.actual).toBe("def456");
    }
  });

  it("returns mismatch when bypass env var is set to anything other than '1'", () => {
    for (const v of ["", "0", "true", "yes", "TRUE"]) {
      const result = checkDeriveHash({
        expected: "abc",
        actual: "xyz",
        env: { ONTO_ALLOW_STALE_DISPATCHER: v },
        bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
      });
      expect(result.kind).toBe("mismatch");
    }
  });

  it("returns bypassed when hashes differ and bypass env var is exactly '1'", () => {
    const result = checkDeriveHash({
      expected: "abc",
      actual: "xyz",
      env: { ONTO_ALLOW_STALE_DISPATCHER: "1" },
      bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
    });
    expect(result.kind).toBe("bypassed");
    if (result.kind === "bypassed") {
      expect(result.reason).toBe("env-allow-stale");
    }
  });

  it("uses the supplied bypass env var name (not hard-coded)", () => {
    const result = checkDeriveHash({
      expected: "a",
      actual: "b",
      env: { CUSTOM_BYPASS: "1", ONTO_ALLOW_STALE_DISPATCHER: "1" },
      bypassEnvVar: "DIFFERENT_NAME",
    });
    // Neither named env var matches the supplied bypass name; mismatch wins.
    expect(result.kind).toBe("mismatch");
  });

  it("ok takes precedence over a bypass env var (no false warning)", () => {
    // Even with bypass set, equal hashes should never produce a warning.
    const result = checkDeriveHash({
      expected: "same",
      actual: "same",
      env: { ONTO_ALLOW_STALE_DISPATCHER: "1" },
      bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
    });
    expect(result.kind).toBe("ok");
  });
});

describe("formatBypassWarning", () => {
  it("includes both the target label and the bypass env var name", () => {
    const out = formatBypassWarning("dispatcher.ts", "ONTO_ALLOW_STALE_DISPATCHER");
    expect(out).toContain("dispatcher.ts");
    expect(out).toContain("ONTO_ALLOW_STALE_DISPATCHER");
    expect(out).toContain("WARNING");
    expect(out.endsWith("\n")).toBe(true);
  });
});

describe("formatMismatchError", () => {
  it("includes target, both hashes, regen command, and bypass hint", () => {
    const out = formatMismatchError({
      targetLabel: "dispatcher.ts",
      expected: "deadbeef",
      actual: "feedface",
      regenCommand: "npm run generate:catalog -- --target=dispatcher",
      bypassEnvVar: "ONTO_ALLOW_STALE_DISPATCHER",
    });
    expect(out).toContain("dispatcher.ts");
    expect(out).toContain("deadbeef");
    expect(out).toContain("feedface");
    expect(out).toContain("npm run generate:catalog -- --target=dispatcher");
    expect(out).toContain("ONTO_ALLOW_STALE_DISPATCHER=1");
    expect(out.endsWith("\n")).toBe(true);
  });
});
