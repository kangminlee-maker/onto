// runtime-mirror-of: step-4-integration §5.6.3

import { describe, expect, it } from "vitest";
import {
  ALL_CANONICAL_FAILURE_CODES,
  CANONICAL_FAILURE_CODES,
  formatFailureMessage,
  type CanonicalFailureCode,
} from "./failure-codes.js";

describe("CANONICAL_FAILURE_CODES (W-A-98 §5.6.3)", () => {
  it("declares exactly 4 codes (§5.6.3 canonical)", () => {
    expect(ALL_CANONICAL_FAILURE_CODES).toHaveLength(4);
    expect([...ALL_CANONICAL_FAILURE_CODES].sort()).toEqual([
      "config_schema_invalid",
      "manifest_malformed",
      "manifest_version_format_invalid",
      "manifest_version_not_incremented",
    ]);
  });

  it("each entry has trigger / primarySection / exampleScenario / recovery", () => {
    for (const code of ALL_CANONICAL_FAILURE_CODES) {
      const entry = CANONICAL_FAILURE_CODES[code];
      expect(entry.trigger).toBeTruthy();
      expect(entry.primarySection).toBeTruthy();
      expect(entry.exampleScenario).toBeTruthy();
      expect(entry.recovery.interactive).toBeTruthy();
      expect(entry.recovery.non_interactive).toBeTruthy();
    }
  });

  it("manifest_malformed primary section = §5.4.2", () => {
    expect(CANONICAL_FAILURE_CODES.manifest_malformed.primarySection).toContain(
      "§5.4.2",
    );
  });

  it("config_schema_invalid is non-interactive specific (recovery refers to --config)", () => {
    expect(
      CANONICAL_FAILURE_CODES.config_schema_invalid.recovery.non_interactive,
    ).toContain("--config");
  });

  it("manifest_version_not_incremented recovery references comparator constraint", () => {
    const e = CANONICAL_FAILURE_CODES.manifest_version_not_incremented;
    expect(e.recovery.interactive).toMatch(/strictly greater/);
    expect(e.recovery.non_interactive).toMatch(/strictly greater/);
  });
});

describe("formatFailureMessage", () => {
  it("substitutes {domain} placeholder", () => {
    const out = formatFailureMessage(
      "manifest_malformed",
      "interactive",
      { domain: "demo" },
    );
    expect(out).toContain("onto domain init --regenerate demo");
    expect(out).not.toContain("{domain}");
  });

  it("substitutes <path> placeholder for non-interactive", () => {
    const out = formatFailureMessage(
      "config_schema_invalid",
      "non_interactive",
      { domain: "demo", configPath: "init.yaml" },
    );
    expect(out).toContain("init.yaml");
    expect(out).not.toContain("<path>");
  });

  it("output includes Error / Trigger / Primary section / Recovery sections", () => {
    const out = formatFailureMessage(
      "manifest_version_format_invalid",
      "interactive",
      { domain: "demo" },
    );
    expect(out).toContain("Error: manifest_version_format_invalid");
    expect(out).toContain("Trigger:");
    expect(out).toContain("Primary section:");
    expect(out).toContain("Recovery:");
  });

  it.each<[CanonicalFailureCode]>([
    ["manifest_malformed"],
    ["manifest_version_format_invalid"],
    ["manifest_version_not_incremented"],
    ["config_schema_invalid"],
  ])("emits readable message for code %s × both origins", (code) => {
    const interactive = formatFailureMessage(code, "interactive", {
      domain: "demo",
    });
    const nonInteractive = formatFailureMessage(code, "non_interactive", {
      domain: "demo",
      configPath: "x.yaml",
    });
    expect(interactive.length).toBeGreaterThan(50);
    expect(nonInteractive.length).toBeGreaterThan(50);
    expect(interactive).not.toBe(nonInteractive);
  });
});
