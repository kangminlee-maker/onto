import { describe, it, expect } from "vitest";
import { canonicalizeLensId } from "./lens-registry.js";

describe("canonicalizeLensId — Phase 0 dual-read (W-A-01)", () => {
  it("strips onto_ prefix from legacy IDs", () => {
    expect(canonicalizeLensId("onto_logic")).toBe("logic");
    expect(canonicalizeLensId("onto_axiology")).toBe("axiology");
    expect(canonicalizeLensId("onto_synthesize")).toBe("synthesize");
  });

  it("is idempotent — bare IDs pass through unchanged", () => {
    expect(canonicalizeLensId("logic")).toBe("logic");
    expect(canonicalizeLensId("axiology")).toBe("axiology");
    expect(canonicalizeLensId("synthesize")).toBe("synthesize");
  });

  it("handles all 10 rename targets", () => {
    const targets = [
      "logic", "structure", "dependency", "semantics", "pragmatics",
      "evolution", "coverage", "conciseness", "axiology", "synthesize",
    ];
    for (const bare of targets) {
      expect(canonicalizeLensId(`onto_${bare}`)).toBe(bare);
      expect(canonicalizeLensId(bare)).toBe(bare);
    }
  });

  it("does not strip prefix when not exact onto_ match", () => {
    expect(canonicalizeLensId("ontology")).toBe("ontology");
    expect(canonicalizeLensId("onto-logic")).toBe("onto-logic");
    expect(canonicalizeLensId("custom_logic")).toBe("custom_logic");
  });
});
