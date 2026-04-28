import { describe, it, expect } from "vitest";
import {
  validateProcessScopeConfig,
  processScopeDefaults,
  type ProcessScopeConfig,
} from "./process.js";

describe("process scope type", () => {
  it("has correct defaults", () => {
    expect(processScopeDefaults.perspectives).toContain("authority-consistency");
    // post-PR #216 §3.1.0 wiring 완성: process scope 의 default entry_mode 가
    // EntryMode 3-enum 의 "process" 로 정합. 이전엔 state machine compatibility
    // 워크어라운드로 "experience" 였음 (PR #244 직후까지의 buggy state).
    expect(processScopeDefaults.entry_mode).toBe("process");
    expect(processScopeDefaults.surface_type).toBe("markdown");
  });

  it("validates a well-formed config", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [
        { path: ".onto/authority/core-lexicon.yaml", rank: 1, description: "Core concepts" },
        { path: ".onto/principles/ontology-as-code-guideline.md", rank: 2, description: "OaC principles" },
      ],
      target_document: ".onto/processes/evolve.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects config with no authority sources", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [],
      target_document: ".onto/processes/evolve.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one authority source is required for a process scope");
  });

  it("allows duplicate authority ranks (onto hierarchy has shared ranks)", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [
        { path: ".onto/principles/oac.md", rank: 2, description: "OaC" },
        { path: ".onto/principles/llm-native.md", rank: 2, description: "LLM-Native" },
      ],
      target_document: ".onto/processes/evolve.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects config with non-positive authority rank", () => {
    const config: ProcessScopeConfig = {
      authority_sources: [
        { path: "a.md", rank: 0, description: "A" },
      ],
      target_document: ".onto/processes/evolve.md",
      perspectives: ["authority-consistency"],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
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
      target_document: ".onto/processes/evolve.md",
      perspectives: [],
    };

    const result = validateProcessScopeConfig(config);
    expect(result.valid).toBe(false);
  });
});
