/**
 * Generated marker — wrap/extract helpers for derived artifacts.
 *
 * Two marker formats (design doc §7.3 + P1-2b plan §D6/§D7 v3):
 *
 *   1. Markdown whole-file marker (for .onto/commands/**\/*.md):
 *      First line of the file is a single HTML comment embedding a
 *      **per-entry `derive-hash`** (computed from the DERIVE_SCHEMA_VERSION,
 *      the single catalog entry, and the single template content — see
 *      `catalog-hash.ts:computeEntryDeriveHash`). The hash lets the P1-4 CI
 *      drift check detect template/catalog edits that were not accompanied
 *      by a regeneration of the .md.
 *
 *   2. TypeScript segment marker (for src/cli.ts help + dispatcher emit):
 *      A pair of line comments delimits a catalog-owned region inside an
 *      otherwise hand-written file. The same per-entry `derive-hash` lives
 *      inside the start marker.
 *
 * Naming: the marker label was `catalog-hash=` in P1-2a (when the hash was
 * a single composite over the whole catalog). P1-2b v3 narrowed the hash
 * scope to per-entry inputs and renamed the label to `derive-hash=`.
 *
 * Both wrap helpers produce deterministic output (same input → same bytes).
 * Both extract helpers are defensive — they return `null` if the marker is
 * missing or malformed so callers can distinguish "not generated yet" from
 * "generated but with a stale hash".
 */

const MD_MARKER_PREFIX =
  "<!-- GENERATED from ";
const MD_MARKER_SUFFIX_TEMPLATE =
  ". Edit catalog or template, then run `npm run generate:catalog`. derive-hash=";
const MD_MARKER_TRAILING = " -->";

const TS_SEGMENT_START_PREFIX =
  "// >>> GENERATED FROM CATALOG — do not edit; edit ";
const TS_SEGMENT_START_SUFFIX_TEMPLATE = " instead. derive-hash=";
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

/**
 * Extracted marker payload. Both markdown and TypeScript variants decode into
 * the same shape — sourcePath + catalogHash + body — so callers share one type.
 */
export type MarkerInfo = {
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
): MarkerInfo | null {
  const firstNewline = fileContent.indexOf("\n");
  if (firstNewline < 0) return null;
  // Strip a trailing \r so CRLF-encoded files (e.g., Windows checkouts with
  // core.autocrlf=true) are not misclassified as malformed.
  const firstLine = fileContent.slice(0, firstNewline).replace(/\r$/, "");
  if (!firstLine.startsWith(MD_MARKER_PREFIX)) return null;
  if (!firstLine.endsWith(MD_MARKER_TRAILING)) return null;
  const hashIdx = firstLine.indexOf(MD_MARKER_SUFFIX_TEMPLATE);
  if (hashIdx < 0) return null;
  const sourcePath = firstLine.slice(MD_MARKER_PREFIX.length, hashIdx);
  const catalogHash = firstLine.slice(
    hashIdx + MD_MARKER_SUFFIX_TEMPLATE.length,
    firstLine.length - MD_MARKER_TRAILING.length,
  );
  // Skip the blank line that wrap inserts, if present (handle both LF and CRLF).
  let bodyStart = firstNewline + 1;
  if (fileContent[bodyStart] === "\n") {
    bodyStart += 1;
  } else if (
    fileContent[bodyStart] === "\r" &&
    fileContent[bodyStart + 1] === "\n"
  ) {
    bodyStart += 2;
  }
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
): MarkerInfo | null {
  const startIdx = fileContent.indexOf(TS_SEGMENT_START_PREFIX);
  if (startIdx < 0) return null;
  const startLineEnd = fileContent.indexOf("\n", startIdx);
  if (startLineEnd < 0) return null;
  // Strip a trailing \r so the catalogHash slice does not absorb it under CRLF.
  const startLine = fileContent
    .slice(startIdx, startLineEnd)
    .replace(/\r$/, "");
  const hashIdx = startLine.indexOf(TS_SEGMENT_START_SUFFIX_TEMPLATE);
  if (hashIdx < 0) return null;
  const sourcePath = startLine.slice(TS_SEGMENT_START_PREFIX.length, hashIdx);
  const catalogHash = startLine.slice(
    hashIdx + TS_SEGMENT_START_SUFFIX_TEMPLATE.length,
  );
  // Line-anchor the end marker: require a preceding newline so the sentinel
  // cannot match when it appears as a substring inside the body (e.g., a
  // string literal or doc comment documenting the marker convention).
  const endAnchor = "\n" + TS_SEGMENT_END;
  const endAnchorIdx = fileContent.indexOf(endAnchor, startLineEnd);
  if (endAnchorIdx < 0) return null;
  const bodyRaw = fileContent.slice(startLineEnd + 1, endAnchorIdx + 1);
  const body = bodyRaw.endsWith("\n") ? bodyRaw.slice(0, -1) : bodyRaw;
  return { sourcePath, catalogHash, body };
}
