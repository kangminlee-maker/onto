import { describe, it, expect } from "vitest";
import {
  validateProcessScopeConfig,
  processScopeDefaults,
  type ProcessScopeConfig,
} from "./process.js";

describe("process scope type", () => {
  it("has correct defaults", () => {
    expect(processScopeDefaults.perspectives).toContain("authority-consistency");
    expect(processScopeDefaults.entry_mode).toBe("experience");
    expect(processScopeDefaults.surface_type).toBe("markdown");
  });

  it("validates a well-formed config", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [
        { path: "authority/core-lexicon.yaml", rank: 1, description: "Core concepts" },
        { path: "design-principles/ontology-as-code-guideline.md", rank: 2, description: "OaC principles" },
      ],
      target_document: "processes/design.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects config with no authority sources", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [],
      target_document: "processes/design.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one authority source is required for a process scope");
  });

  it("rejects config with duplicate authority ranks", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [
        { path: "a.md", rank: 1, description: "A" },
        { path: "b.md", rank: 1, description: "B" },
      ],
      target_document: "processes/design.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Authority source ranks must be unique");
  });

  it("rejects config with empty target_document", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [{ path: "a.md", rank: 1, description: "A" }],
      target_document: "",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects config with no perspectives", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [{ path: "a.md", rank: 1, description: "A" }],
      target_document: "processes/design.md",
      perspectives: [],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
  });
});
