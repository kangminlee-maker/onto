/**
 * Generated marker — wrap/extract helpers for derived artifacts.
 *
 * Two marker formats (design doc §7.3):
 *
 *   1. Markdown whole-file marker (for .onto/commands/**\/*.md):
 *      First line of the file is a single HTML comment naming the catalog as
 *      source and embedding the catalog hash so CI drift check (P1-4) can
 *      compare the hash in the marker against a freshly-computed catalog hash.
 *
 *   2. TypeScript segment marker (for src/cli.ts help + dispatcher emit):
 *      A pair of line comments delimits a catalog-owned region inside an
 *      otherwise hand-written file. The hash lives inside the start marker.
 *
 * Both wrap helpers produce deterministic output (same input → same bytes).
 * Both extract helpers are defensive — they return `null` if the marker is
 * missing or malformed so callers can distinguish "not generated yet" from
 * "generated but with a stale hash".
 */

const MD_MARKER_PREFIX =
  "<!-- GENERATED from ";
const MD_MARKER_SUFFIX_TEMPLATE =
  ". Edit catalog or template, then run `npm run generate:catalog`. catalog-hash=";
const MD_MARKER_TRAILING = " -->";

const TS_SEGMENT_START_PREFIX =
  "// >>> GENERATED FROM CATALOG — do not edit; edit ";
const TS_SEGMENT_START_SUFFIX_TEMPLATE = " instead. catalog-hash=";
const TS_SEGMENT_END = "// <<< END GENERATED";

function buildMarkdownMarker(sourcePath: string, catalogHash: string): string {
  return (
    MD_MARKER_PREFIX +
    sourcePath +
    MD_MARKER_SUFFIX_TEMPLATE +
    catalogHash +
    MD_MARKER_TRAILING
  );
}

function buildTsSegmentStart(sourcePath: string, catalogHash: string): string {
  return (
    TS_SEGMENT_START_PREFIX +
    sourcePath +
    TS_SEGMENT_START_SUFFIX_TEMPLATE +
    catalogHash
  );
}

export type MarkdownMarkerInfo = {
  sourcePath: string;
  catalogHash: string;
  body: string;
};

export type TsSegmentInfo = {
  sourcePath: string;
  catalogHash: string;
  body: string;
};

export function wrapMarkdownMarker(
  body: string,
  sourcePath: string,
  catalogHash: string,
): string {
  const marker = buildMarkdownMarker(sourcePath, catalogHash);
  // Ensure exactly one blank line after the marker for readability.
  const trimmedBody = body.startsWith("\n") ? body.slice(1) : body;
  return marker + "\n\n" + trimmedBody;
}

export function extractMarkdownMarker(
  fileContent: string,
): MarkdownMarkerInfo | null {
  const firstNewline = fileContent.indexOf("\n");
  if (firstNewline < 0) return null;
  const firstLine = fileContent.slice(0, firstNewline);
  if (!firstLine.startsWith(MD_MARKER_PREFIX)) return null;
  if (!firstLine.endsWith(MD_MARKER_TRAILING)) return null;
  const hashIdx = firstLine.indexOf(MD_MARKER_SUFFIX_TEMPLATE);
  if (hashIdx < 0) return null;
  const sourcePath = firstLine.slice(MD_MARKER_PREFIX.length, hashIdx);
  const catalogHash = firstLine.slice(
    hashIdx + MD_MARKER_SUFFIX_TEMPLATE.length,
    firstLine.length - MD_MARKER_TRAILING.length,
  );
  // Skip the blank line that wrap inserts, if present.
  let bodyStart = firstNewline + 1;
  if (fileContent[bodyStart] === "\n") bodyStart += 1;
  return {
    sourcePath,
    catalogHash,
    body: fileContent.slice(bodyStart),
  };
}

export function wrapTypeScriptSegmentMarker(
  body: string,
  sourcePath: string,
  catalogHash: string,
): string {
  const start = buildTsSegmentStart(sourcePath, catalogHash);
  const trimmedBody = body.endsWith("\n") ? body : body + "\n";
  return start + "\n" + trimmedBody + TS_SEGMENT_END + "\n";
}

export function extractTypeScriptSegment(
  fileContent: string,
): TsSegmentInfo | null {
  const startIdx = fileContent.indexOf(TS_SEGMENT_START_PREFIX);
  if (startIdx < 0) return null;
  const startLineEnd = fileContent.indexOf("\n", startIdx);
  if (startLineEnd < 0) return null;
  const startLine = fileContent.slice(startIdx, startLineEnd);
  const hashIdx = startLine.indexOf(TS_SEGMENT_START_SUFFIX_TEMPLATE);
  if (hashIdx < 0) return null;
  const sourcePath = startLine.slice(TS_SEGMENT_START_PREFIX.length, hashIdx);
  const catalogHash = startLine.slice(
    hashIdx + TS_SEGMENT_START_SUFFIX_TEMPLATE.length,
  );
  const endIdx = fileContent.indexOf(TS_SEGMENT_END, startLineEnd + 1);
  if (endIdx < 0) return null;
  const bodyRaw = fileContent.slice(startLineEnd + 1, endIdx);
  const body = bodyRaw.endsWith("\n") ? bodyRaw.slice(0, -1) : bodyRaw;
  return { sourcePath, catalogHash, body };
}
