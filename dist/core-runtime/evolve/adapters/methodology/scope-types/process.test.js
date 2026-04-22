import { describe, it, expect } from "vitest";
import { validateProcessScopeConfig, processScopeDefaults, } from "./process.js";
describe("process scope type", () => {
    it("has correct defaults", () => {
        expect(processScopeDefaults.perspectives).toContain("authority-consistency");
        expect(processScopeDefaults.entry_mode).toBe("experience");
        expect(processScopeDefaults.surface_type).toBe("markdown");
    });
    it("validates a well-formed config", () => {
        const config = {
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
        const config = {
            authority_sources: [],
            target_document: ".onto/processes/evolve.md",
            perspectives: ["authority-consistency"],
        };
        const result = validateProcessScopeConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("At least one authority source is required for a process scope");
    });
    it("allows duplicate authority ranks (onto hierarchy has shared ranks)", () => {
        const config = {
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
        const config = {
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
        const config = {
            authority_sources: [{ path: "a.md", rank: 1, description: "A" }],
            target_document: "",
            perspectives: ["authority-consistency"],
        };
        const result = validateProcessScopeConfig(config);
        expect(result.valid).toBe(false);
    });
    it("rejects config with no perspectives", () => {
        const config = {
            authority_sources: [{ path: "a.md", rank: 1, description: "A" }],
            target_document: ".onto/processes/evolve.md",
            perspectives: [],
        };
        const result = validateProcessScopeConfig(config);
        expect(result.valid).toBe(false);
    });
});
