import { describe, it, expect } from "vitest";
import { getEntryModeRouting } from "./entry-mode-routing.js";
import type { EntryMode } from "../scope-runtime/types.js";

const ALL_MODES: EntryMode[] = ["experience", "interface", "process"];

describe("entry-mode-routing — total coverage", () => {
  it("returns routing for every EntryMode (no undefined)", () => {
    for (const mode of ALL_MODES) {
      const routing = getEntryModeRouting(mode);
      expect(routing).toBeDefined();
      expect(routing.surfaceSubpath).toBeTruthy();
      expect(routing.surfaceLabel).toBeTruthy();
      expect(routing.guideMessageAfterGeneration).toBeTruthy();
      expect(routing.nextActionAlignLocked).toBeTruthy();
      expect(routing.nextActionSurfaceIterating).toBeTruthy();
    }
  });

  it("only process mode has runtime-written skeleton", () => {
    expect(getEntryModeRouting("process").hasRuntimeWrittenSkeleton).toBe(true);
    expect(getEntryModeRouting("experience").hasRuntimeWrittenSkeleton).toBe(false);
    expect(getEntryModeRouting("interface").hasRuntimeWrittenSkeleton).toBe(false);
  });

  it("each mode has distinct surfaceSubpath (no collision)", () => {
    const subpaths = ALL_MODES.map(m => getEntryModeRouting(m).surfaceSubpath);
    const unique = new Set(subpaths);
    expect(unique.size).toBe(ALL_MODES.length);
  });

  it("surface labels remain stable canonical values", () => {
    expect(getEntryModeRouting("experience").surfaceLabel).toBe("surface/preview/");
    expect(getEntryModeRouting("interface").surfaceLabel).toBe("surface/contract-diff/");
    expect(getEntryModeRouting("process").surfaceLabel).toBe("surface/design-doc-draft.md");
  });
});

describe("entry-mode-routing — message content sanity", () => {
  it("experience messages reference mockup", () => {
    const r = getEntryModeRouting("experience");
    expect(r.guideMessageAfterGeneration).toMatch(/mockup/);
    expect(r.nextActionAlignLocked).toMatch(/화면 설계/);
    expect(r.nextActionSurfaceIterating).toMatch(/mockup/);
  });

  it("interface messages reference API 명세", () => {
    const r = getEntryModeRouting("interface");
    expect(r.guideMessageAfterGeneration).toMatch(/API 명세/);
    expect(r.nextActionAlignLocked).toMatch(/API 명세/);
    expect(r.nextActionSurfaceIterating).toMatch(/API 명세/);
  });

  it("process messages reference design doc", () => {
    const r = getEntryModeRouting("process");
    expect(r.guideMessageAfterGeneration).toMatch(/design 문서|design-doc/);
    expect(r.nextActionAlignLocked).toMatch(/design doc/);
    expect(r.nextActionSurfaceIterating).toMatch(/design doc/);
  });
});
