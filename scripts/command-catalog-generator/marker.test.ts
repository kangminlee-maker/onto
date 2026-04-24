/**
 * Tests — marker.ts
 *
 * Wrap/extract round-trip for both markdown and TypeScript segment markers.
 */

import { describe, expect, it } from "vitest";
import {
  extractMarkdownMarker,
  extractTypeScriptSegment,
  wrapMarkdownMarker,
  wrapTypeScriptSegmentMarker,
} from "./marker.js";

const SRC = "src/core-runtime/cli/command-catalog.ts";
const HASH = "a".repeat(64);

describe("wrapMarkdownMarker + extractMarkdownMarker", () => {
  it("round-trips body, sourcePath, catalogHash", () => {
    const body = "# review\n\nbody content\nsecond line\n";
    const wrapped = wrapMarkdownMarker(body, SRC, HASH);
    const info = extractMarkdownMarker(wrapped);
    expect(info).not.toBeNull();
    expect(info!.sourcePath).toBe(SRC);
    expect(info!.catalogHash).toBe(HASH);
    expect(info!.body).toBe(body);
  });

  it("produces the documented marker line on first line", () => {
    const wrapped = wrapMarkdownMarker("content\n", SRC, HASH);
    expect(wrapped.startsWith("<!-- GENERATED from ")).toBe(true);
    expect(wrapped.includes(`catalog-hash=${HASH}`)).toBe(true);
    expect(wrapped.split("\n")[0]).toMatch(/ -->$/);
  });

  it("is deterministic — same inputs yield same bytes", () => {
    const a = wrapMarkdownMarker("x\n", SRC, HASH);
    const b = wrapMarkdownMarker("x\n", SRC, HASH);
    expect(a).toBe(b);
  });

  it("extract returns null when marker is absent", () => {
    expect(extractMarkdownMarker("# just markdown\n")).toBeNull();
  });

  it("extract returns null when marker is malformed", () => {
    expect(extractMarkdownMarker("<!-- GENERATED but nope -->\nbody")).toBeNull();
  });

  it("tolerates CRLF-encoded files (bug_006 regression)", () => {
    const body = "# review\n\nbody\n";
    const lf = wrapMarkdownMarker(body, SRC, HASH);
    const crlf = lf.replace(/\n/g, "\r\n");
    const info = extractMarkdownMarker(crlf);
    expect(info).not.toBeNull();
    expect(info!.sourcePath).toBe(SRC);
    expect(info!.catalogHash).toBe(HASH);
    // Body bytes remain CRLF — only the marker line is normalized.
    expect(info!.body.startsWith("# review")).toBe(true);
  });
});

describe("wrapTypeScriptSegmentMarker + extractTypeScriptSegment", () => {
  it("round-trips body, sourcePath, catalogHash", () => {
    const body = "const HELP_TEXT = `usage ...`;";
    const wrapped = wrapTypeScriptSegmentMarker(body, SRC, HASH);
    const info = extractTypeScriptSegment(wrapped);
    expect(info).not.toBeNull();
    expect(info!.sourcePath).toBe(SRC);
    expect(info!.catalogHash).toBe(HASH);
    expect(info!.body).toBe(body);
  });

  it("tolerates surrounding hand-written TypeScript", () => {
    const body = "const X = 1;";
    const segment = wrapTypeScriptSegmentMarker(body, SRC, HASH);
    const file =
      "import foo from 'bar';\n\n// hand-written above\n" +
      segment +
      "\n// hand-written below\nexport {};\n";
    const info = extractTypeScriptSegment(file);
    expect(info).not.toBeNull();
    expect(info!.body).toBe(body);
  });

  it("is deterministic — same inputs yield same bytes", () => {
    const a = wrapTypeScriptSegmentMarker("x;", SRC, HASH);
    const b = wrapTypeScriptSegmentMarker("x;", SRC, HASH);
    expect(a).toBe(b);
  });

  it("extract returns null when start marker is absent", () => {
    expect(
      extractTypeScriptSegment("const X = 1;\n// <<< END GENERATED\n"),
    ).toBeNull();
  });

  it("extract returns null when end marker is missing", () => {
    const start =
      "// >>> GENERATED FROM CATALOG — do not edit; edit " +
      SRC +
      " instead. catalog-hash=" +
      HASH +
      "\nbody without terminator\n";
    expect(extractTypeScriptSegment(start)).toBeNull();
  });

  it("preserves body that contains the literal end sentinel (bug_002 regression)", () => {
    const body =
      'const MARKER_DOC = "catalog-derived regions end with // <<< END GENERATED";';
    const wrapped = wrapTypeScriptSegmentMarker(body, SRC, HASH);
    const info = extractTypeScriptSegment(wrapped);
    expect(info).not.toBeNull();
    expect(info!.body).toBe(body);
  });

  it("tolerates CRLF-encoded segments (bug_006 regression)", () => {
    const body = "const X = 1;";
    const lf = wrapTypeScriptSegmentMarker(body, SRC, HASH);
    const crlf = lf.replace(/\n/g, "\r\n");
    const info = extractTypeScriptSegment(crlf);
    expect(info).not.toBeNull();
    expect(info!.sourcePath).toBe(SRC);
    expect(info!.catalogHash).toBe(HASH);
  });
});
