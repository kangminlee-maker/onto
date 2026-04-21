import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  renderForUser,
  isRegisteredRenderPoint,
  loadRegistry,
  setRegistryPathForTesting,
} from "./render-for-user.js";

describe("render-for-user registry + rendering", () => {
  let tmpDir: string | null = null;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-render-test-"));
  });

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
    setRegistryPathForTesting(null);
  });

  function writeRegistry(fixture: string): string {
    const file = path.join(tmpDir as string, "external-render-points.yaml");
    fs.writeFileSync(file, fixture);
    setRegistryPathForTesting(file);
    return file;
  }

  it("parses a minimal registry with one entry", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points:
  - id: halt_message_config_malformed
    file: .onto/processes/reconstruct.md
    section: "Halt event rendering"
    rationale: "user-facing halt text"
`);
    const registry = loadRegistry();
    expect(registry.schema_version).toBe("v1");
    expect(registry.as_of).toBe("2026-04-17");
    expect(registry.points).toHaveLength(1);
    expect(registry.points[0]).toMatchObject({
      id: "halt_message_config_malformed",
      file: ".onto/processes/reconstruct.md",
      section: "Halt event rendering",
      rationale: "user-facing halt text",
    });
  });

  it("parses an empty registry (inline `points: []`)", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points: []
`);
    const registry = loadRegistry();
    expect(registry.points).toHaveLength(0);
  });

  it("isRegisteredRenderPoint returns true for a registered id", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points:
  - id: phase_3_user_summary
    file: .onto/processes/reconstruct.md
    rationale: "summary the principal reads"
`);
    expect(isRegisteredRenderPoint("phase_3_user_summary")).toBe(true);
    expect(isRegisteredRenderPoint("not_registered")).toBe(false);
  });

  it("renderForUser returns the internal payload verbatim when the id is registered (Phase 1 passthrough)", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points:
  - id: phase_5_completion_report
    file: .onto/processes/reconstruct.md
    rationale: "user-facing completion report"
`);
    const out = renderForUser({
      renderPointId: "phase_5_completion_report",
      internalPayload: "Completed with 5 elements.",
      userLanguage: "ko",
    });
    expect(out).toBe("Completed with 5 elements.");
  });

  it("renderForUser throws on unknown renderPointId and lists known ids", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points:
  - id: halt_message_config_malformed
    file: .onto/processes/reconstruct.md
    rationale: "malformed config halt"
`);
    expect(() =>
      renderForUser({
        renderPointId: "ghost_point",
        internalPayload: "body",
        userLanguage: "ko",
      }),
    ).toThrow(/ghost_point.*halt_message_config_malformed/s);
  });

  it("parser rejects an entry missing required fields", () => {
    writeRegistry(`schema_version: "v1"
as_of: "2026-04-17"
points:
  - id: incomplete_entry
    file: .onto/processes/reconstruct.md
`);
    expect(() => loadRegistry()).toThrow(/missing required field/);
  });

  it("loads the real authority registry by default (smoke test)", () => {
    setRegistryPathForTesting(null);
    // The real registry may be empty in the principle-only PR or populated
    // later. Either way, load must succeed and return a well-shaped object.
    const registry = loadRegistry();
    expect(typeof registry.schema_version).toBe("string");
    expect(Array.isArray(registry.points)).toBe(true);
  });
});
