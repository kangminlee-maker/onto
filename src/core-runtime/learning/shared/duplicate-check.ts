/**
 * Content-level dedup — A-10, P-3 (Phase 2/3 공용).
 *
 * CC2 반영: content 부분만 추출 → trim 후 exact match.
 * 태그/소스/임팩트 차이는 A-11(semantic classifier)이 처리.
 */

import { CONTENT_CAPTURE } from "./patterns.js";

/**
 * Extract content portion from a fully assembled learning line.
 * Returns null if the line doesn't match the expected format.
 */
export function extractContent(line: string): string | null {
  const match = line.match(CONTENT_CAPTURE);
  return match?.[1]?.trim() ?? null;
}

/**
 * Check if new content is an exact duplicate of any existing line's content.
 * A-10: content-level dedup (not full-line match).
 */
export function isContentDuplicate(
  newContent: string,
  existingLines: string[],
): boolean {
  const normalized = newContent.trim();
  for (const line of existingLines) {
    const existing = extractContent(line);
    if (existing && existing === normalized) return true;
  }
  return false;
}
