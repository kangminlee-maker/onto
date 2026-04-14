import { describe, it, expect } from "vitest";
import {
  genericMcpSourceHashKey,
  genericMcpSourceHash,
  scanGenericMcp,
  recordGenericMcpGrounding,
  type GenericMcpSource,
} from "./mcp-generic.js";

function makeSource(provider: string): GenericMcpSource {
  return { type: "mcp", provider };
}

describe("genericMcpSourceHashKey", () => {
  it("returns key in 'mcp:{provider}' format", () => {
    expect(genericMcpSourceHashKey(makeSource("linear"))).toBe("mcp:linear");
  });

  it("handles provider with hyphens and numbers", () => {
    expect(genericMcpSourceHashKey(makeSource("slack-v2"))).toBe("mcp:slack-v2");
  });

  it("produces consistent keys across calls", () => {
    const source = makeSource("github");
    expect(genericMcpSourceHashKey(source)).toBe(genericMcpSourceHashKey(source));
  });
});

describe("genericMcpSourceHash", () => {
  it("returns { key, value } with provider key and response digest", () => {
    expect(genericMcpSourceHash(makeSource("linear"), "sha256:deadbeef")).toEqual({
      key: "mcp:linear",
      value: "sha256:deadbeef",
    });
  });

  it("key matches genericMcpSourceHashKey output", () => {
    const source = makeSource("notion");
    expect(genericMcpSourceHash(source, "digest").key).toBe(
      genericMcpSourceHashKey(source),
    );
  });
});

describe("scanGenericMcp", () => {
  it("returns empty ScanResult bound to the source", () => {
    const source = makeSource("empty-provider");
    const result = scanGenericMcp(source);
    expect(result.source).toEqual(source);
    expect(result.files).toEqual([]);
    expect(result.content_hashes).toEqual({});
    expect(result.dependency_graph).toEqual([]);
    expect(result.doc_structure).toEqual([]);
  });
});

describe("recordGenericMcpGrounding", () => {
  it("records responseDigest into content_hashes", () => {
    const source = makeSource("linear");
    const result = recordGenericMcpGrounding(source, { responseDigest: "abc123" });
    expect(result.content_hashes).toEqual({ "mcp:linear": "abc123" });
  });

  it("records optional metadata into doc_structure frontmatter", () => {
    const source = makeSource("slack");
    const result = recordGenericMcpGrounding(source, {
      responseDigest: "d1",
      toolsSeen: ["list_channels", "search_messages"],
      sampleCount: 17,
      retrievedAt: "2026-04-14T01:00:00Z",
    });
    expect(result.doc_structure).toHaveLength(1);
    const entry = result.doc_structure[0]!;
    expect(entry.file).toBe("mcp:slack");
    expect(entry.format).toBe("json");
    expect(entry.frontmatter).toEqual({
      provider: "slack",
      responseDigest: "d1",
      toolsSeen: ["list_channels", "search_messages"],
      sampleCount: 17,
      retrievedAt: "2026-04-14T01:00:00Z",
    });
  });

  it("omits undefined optional fields but always includes provider + digest", () => {
    const source = makeSource("minimal");
    const result = recordGenericMcpGrounding(source, { responseDigest: "d2" });
    const entry = result.doc_structure[0]!;
    expect(entry.frontmatter).toEqual({
      provider: "minimal",
      responseDigest: "d2",
    });
  });
});
