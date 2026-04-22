import { describe, it, expect } from "vitest";
import { figmaSourceHashKey, figmaSourceHash, scanFigmaMcp, recordFigmaGrounding, } from "./mcp-figma.js";
function makeSource(fileKey) {
    return { type: "figma-mcp", file_key: fileKey };
}
describe("figmaSourceHashKey", () => {
    it("returns key in 'figma-mcp:{file_key}' format", () => {
        expect(figmaSourceHashKey(makeSource("abc123"))).toBe("figma-mcp:abc123");
    });
    it("handles file_key with special characters", () => {
        expect(figmaSourceHashKey(makeSource("XyZ_0-9"))).toBe("figma-mcp:XyZ_0-9");
    });
    it("handles empty file_key", () => {
        expect(figmaSourceHashKey(makeSource(""))).toBe("figma-mcp:");
    });
    it("produces consistent keys across multiple calls", () => {
        const source = makeSource("consistent-key");
        expect(figmaSourceHashKey(source)).toBe(figmaSourceHashKey(source));
    });
});
describe("figmaSourceHash", () => {
    it("returns correct { key, value } pair", () => {
        expect(figmaSourceHash(makeSource("file123"), "2024-01-15T10:30:00Z")).toEqual({
            key: "figma-mcp:file123",
            value: "2024-01-15T10:30:00Z",
        });
    });
    it("key matches figmaSourceHashKey output", () => {
        const source = makeSource("match-test");
        expect(figmaSourceHash(source, "2024-06-01T00:00:00Z").key).toBe(figmaSourceHashKey(source));
    });
    it("preserves lastModified value exactly", () => {
        const timestamp = "2025-12-31T23:59:59.999Z";
        expect(figmaSourceHash(makeSource("ts-test"), timestamp).value).toBe(timestamp);
    });
});
describe("scanFigmaMcp", () => {
    it("returns an empty ScanResult bound to the source", () => {
        const source = makeSource("empty-scan");
        const result = scanFigmaMcp(source);
        expect(result.source).toEqual(source);
        expect(result.files).toEqual([]);
        expect(result.content_hashes).toEqual({});
        expect(result.dependency_graph).toEqual([]);
        expect(result.doc_structure).toEqual([]);
        expect(typeof result.scanned_at).toBe("string");
    });
});
describe("recordFigmaGrounding", () => {
    it("populates content_hashes with lastModified under the source key", () => {
        const source = makeSource("grounding-1");
        const result = recordFigmaGrounding(source, { lastModified: "2026-04-14T00:00:00Z" });
        expect(result.content_hashes).toEqual({
            "figma-mcp:grounding-1": "2026-04-14T00:00:00Z",
        });
    });
    it("records optional metadata into doc_structure frontmatter", () => {
        const source = makeSource("meta");
        const result = recordFigmaGrounding(source, {
            lastModified: "2026-04-14T00:00:00Z",
            fileName: "Design System",
            nodeCount: 42,
            pageCount: 3,
        });
        expect(result.doc_structure).toHaveLength(1);
        const entry = result.doc_structure[0];
        expect(entry.file).toBe("figma-mcp:meta");
        expect(entry.format).toBe("json");
        expect(entry.frontmatter).toEqual({
            lastModified: "2026-04-14T00:00:00Z",
            fileName: "Design System",
            nodeCount: 42,
            pageCount: 3,
        });
    });
    it("omits undefined optional fields from frontmatter", () => {
        const source = makeSource("minimal");
        const result = recordFigmaGrounding(source, { lastModified: "2026-04-14T00:00:00Z" });
        const entry = result.doc_structure[0];
        expect(entry.frontmatter).toEqual({ lastModified: "2026-04-14T00:00:00Z" });
    });
});
