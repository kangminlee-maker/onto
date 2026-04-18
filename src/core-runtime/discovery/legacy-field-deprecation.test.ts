import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OntoConfig } from "./config-chain.js";
import {
  LEGACY_PROFILE_FIELDS,
  checkAndEmitLegacyDeprecation,
  detectLegacyFieldUsage,
  emitLegacyFieldDeprecation,
} from "./legacy-field-deprecation.js";

// ---------------------------------------------------------------------------
// These tests assert PR-E migration invariants:
//
// (1) Legacy field detection is limited to the catalog set and only
//     triggers on non-empty string values.
// (2) Deprecation warning is silent when the new
//     `execution_topology_priority` is set OR nothing legacy is used.
// (3) When warning fires, every detected legacy field gets a line with
//     a topology suggestion + migration guide pointer.
// ---------------------------------------------------------------------------

describe("LEGACY_PROFILE_FIELDS", () => {
  it("lists exactly the 5 legacy provider-profile fields", () => {
    expect([...LEGACY_PROFILE_FIELDS]).toEqual([
      "host_runtime",
      "execution_realization",
      "execution_mode",
      "executor_realization",
      "api_provider",
    ]);
  });
});

// ---------------------------------------------------------------------------
// detectLegacyFieldUsage
// ---------------------------------------------------------------------------

describe("detectLegacyFieldUsage", () => {
  it("empty config detects nothing", () => {
    const d = detectLegacyFieldUsage({});
    expect(d.detected).toEqual([]);
    expect(d.topology_priority_set).toBe(false);
  });

  it("detects host_runtime alone", () => {
    const d = detectLegacyFieldUsage({ host_runtime: "codex" });
    expect(d.detected).toEqual(["host_runtime"]);
  });

  it("detects multiple legacy fields in catalog order", () => {
    const d = detectLegacyFieldUsage({
      host_runtime: "anthropic",
      execution_realization: "subagent",
      api_provider: "anthropic",
    });
    expect(d.detected).toEqual(["host_runtime", "execution_realization", "api_provider"]);
  });

  it("empty strings do not count as presence", () => {
    const d = detectLegacyFieldUsage({ host_runtime: "" });
    expect(d.detected).toEqual([]);
  });

  it("topology_priority_set true when execution_topology_priority is a non-empty array", () => {
    const d = detectLegacyFieldUsage({
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    expect(d.topology_priority_set).toBe(true);
  });

  it("topology_priority_set false for empty array", () => {
    const d = detectLegacyFieldUsage({ execution_topology_priority: [] });
    expect(d.topology_priority_set).toBe(false);
  });

  it("reports both legacy AND topology presence (migrated principal retaining legacy for reference)", () => {
    const d = detectLegacyFieldUsage({
      host_runtime: "claude",
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    expect(d.detected).toEqual(["host_runtime"]);
    expect(d.topology_priority_set).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// emitLegacyFieldDeprecation
// ---------------------------------------------------------------------------

describe("emitLegacyFieldDeprecation", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  function stderrOutput(): string {
    return stderrSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");
  }

  it("silent when nothing detected", () => {
    emitLegacyFieldDeprecation({}, { detected: [], topology_priority_set: false });
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("silent when topology_priority is already set (migrated principal)", () => {
    emitLegacyFieldDeprecation(
      {
        host_runtime: "codex",
        execution_topology_priority: ["cc-main-codex-subprocess"],
      },
      { detected: ["host_runtime"], topology_priority_set: true },
    );
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("emits per-field [onto:deprecation] lines when legacy used without topology", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "codex", api_provider: "codex" },
      { detected: ["host_runtime", "api_provider"], topology_priority_set: false },
    );
    const out = stderrOutput();
    expect(out).toContain("[onto:deprecation]");
    expect(out).toContain("host_runtime=codex");
    expect(out).toContain("api_provider=codex");
  });

  it("message suggests the topology priority replacement for host_runtime=codex", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "codex" },
      { detected: ["host_runtime"], topology_priority_set: false },
    );
    expect(stderrOutput()).toContain("cc-main-codex-subprocess");
  });

  it("message suggests cc-main-agent-subagent for host_runtime=claude", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "claude" },
      { detected: ["host_runtime"], topology_priority_set: false },
    );
    expect(stderrOutput()).toContain("cc-main-agent-subagent");
  });

  it("message points to the migration guide", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "codex" },
      { detected: ["host_runtime"], topology_priority_set: false },
    );
    expect(stderrOutput()).toContain("docs/topology-migration-guide.md");
  });

  it("message explicitly states backward compatibility is preserved (no sudden break)", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "codex" },
      { detected: ["host_runtime"], topology_priority_set: false },
    );
    expect(stderrOutput()).toContain("호환 유지");
  });

  it("legacy standalone + anthropic/openai flags 'current canonical topology 없음' path", () => {
    emitLegacyFieldDeprecation(
      { host_runtime: "anthropic" },
      { detected: ["host_runtime"], topology_priority_set: false },
    );
    const out = stderrOutput();
    expect(out).toContain("host_runtime=anthropic");
    // Preserve legacy HTTP path — no false migration suggestion
    expect(out.toLowerCase()).toMatch(/legacy http|canonical topology 없음/);
  });

  it("executor_realization=codex → cc-main-codex-subprocess suggestion", () => {
    emitLegacyFieldDeprecation(
      { executor_realization: "codex" },
      { detected: ["executor_realization"], topology_priority_set: false },
    );
    expect(stderrOutput()).toContain("cc-main-codex-subprocess");
  });
});

// ---------------------------------------------------------------------------
// checkAndEmitLegacyDeprecation — convenience wrapper
// ---------------------------------------------------------------------------

describe("checkAndEmitLegacyDeprecation", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("detects AND emits in one call", () => {
    const detection = checkAndEmitLegacyDeprecation({ host_runtime: "codex" });
    expect(detection.detected).toEqual(["host_runtime"]);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("returns the detection structure for inspection", () => {
    const detection = checkAndEmitLegacyDeprecation({
      host_runtime: "claude",
      api_provider: "anthropic",
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    expect(detection.detected).toEqual(["host_runtime", "api_provider"]);
    expect(detection.topology_priority_set).toBe(true);
    // Silent because topology is set
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("clean config triggers no emission and returns empty detection", () => {
    const detection = checkAndEmitLegacyDeprecation({});
    expect(detection.detected).toEqual([]);
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
