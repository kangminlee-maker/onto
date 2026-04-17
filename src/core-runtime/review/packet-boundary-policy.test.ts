import { describe, it, expect } from "vitest";
import { parsePacketBoundaryPolicy } from "./packet-boundary-policy.js";

describe("parsePacketBoundaryPolicy — section detection", () => {
  it("returns all-unknown when no Boundary Policy section exists", () => {
    const policy = parsePacketBoundaryPolicy("# Prompt\n\nNo policy section here.");
    expect(policy.filesystem).toBe("unknown");
    expect(policy.network).toBe("unknown");
    expect(policy.tools).toBe("unknown");
    expect(policy.sectionBody).toBeUndefined();
  });

  it("matches case-insensitive heading", () => {
    const packet = "# Prompt\n\n## boundary policy\n- Filesystem: denied\n";
    const policy = parsePacketBoundaryPolicy(packet);
    expect(policy.filesystem).toBe("denied");
  });

  it("stops section body at the next heading", () => {
    const packet = [
      "## Boundary Policy",
      "- Filesystem: denied",
      "",
      "## Other Section",
      "- Filesystem: allowed  ",
    ].join("\n");
    const policy = parsePacketBoundaryPolicy(packet);
    expect(policy.filesystem).toBe("denied");
  });
});

describe("parsePacketBoundaryPolicy — filesystem (A1 regression)", () => {
  it("detects denied", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Filesystem: denied");
    expect(p.filesystem).toBe("denied");
    expect(p.filesystemRaw).toBe("denied");
  });

  it("detects allowed via read-only compound phrase", () => {
    const p = parsePacketBoundaryPolicy(
      "## Boundary Policy\n- Filesystem: read-only inside round1/ (lens outputs only)",
    );
    expect(p.filesystem).toBe("allowed");
  });

  it("returns unknown for unrecognised value", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Filesystem: whatever");
    expect(p.filesystem).toBe("unknown");
  });
});

describe("parsePacketBoundaryPolicy — tools (A4)", () => {
  it("detects Tools: required", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Tools: required");
    expect(p.tools).toBe("required");
    expect(p.toolsRaw).toBe("required");
  });

  it("detects required via synonyms (mandatory, needed, must)", () => {
    for (const v of ["mandatory", "needed", "must"]) {
      const p = parsePacketBoundaryPolicy(`## Boundary Policy\n- Tools: ${v}`);
      expect(p.tools).toBe("required");
    }
  });

  it("detects Tools: optional", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Tools: optional");
    expect(p.tools).toBe("optional");
  });

  it("detects Tools: denied", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Tools: denied");
    expect(p.tools).toBe("denied");
  });

  it("detects required via compound phrase (first token)", () => {
    const p = parsePacketBoundaryPolicy(
      "## Boundary Policy\n- Tools: required — lens outputs must be fetched via read_file",
    );
    expect(p.tools).toBe("required");
  });

  it("is case-insensitive on the key", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- TOOLS: Required");
    expect(p.tools).toBe("required");
  });

  it("returns unknown when Tools bullet is absent", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Filesystem: denied");
    expect(p.tools).toBe("unknown");
    expect(p.toolsRaw).toBeUndefined();
  });

  it("returns unknown for unrecognised value", () => {
    const p = parsePacketBoundaryPolicy("## Boundary Policy\n- Tools: sometimes");
    expect(p.tools).toBe("unknown");
  });
});

describe("parsePacketBoundaryPolicy — combined declarations", () => {
  it("parses filesystem + network + tools together", () => {
    const packet = [
      "## Boundary Policy",
      "- Filesystem: read-only inside round1/",
      "- Network: denied",
      "- Tools: required",
    ].join("\n");
    const p = parsePacketBoundaryPolicy(packet);
    expect(p.filesystem).toBe("allowed");
    expect(p.network).toBe("denied");
    expect(p.tools).toBe("required");
  });

  it("detects contradictory declaration (denied filesystem + required tools) raw but classifies each correctly", () => {
    // The parser itself does NOT enforce internal consistency — it just
    // reports what the packet said. The executor is responsible for rejecting
    // impossible combinations.
    const packet = [
      "## Boundary Policy",
      "- Filesystem: denied",
      "- Tools: required",
    ].join("\n");
    const p = parsePacketBoundaryPolicy(packet);
    expect(p.filesystem).toBe("denied");
    expect(p.tools).toBe("required");
  });
});
