import { sourceKey, emptyScanResult, type SourceEntry, type ScanResult } from "./types.js";

/**
 * figma-mcp source skeleton.
 *
 * figma-mcp is agent-mediated: the LLM agent calls the Figma MCP server directly
 * during grounding. There is no automated file scanner — the agent records what
 * it retrieved via the helpers here, and stale-check delegates change detection
 * to the agent protocol (`get_metadata` → compare `lastModified`).
 *
 * Skeleton responsibilities:
 * - `scanFigmaMcp`: kernel-compat entry that returns an empty ScanResult.
 *   Callers that iterate sources uniformly (design grounding, review collectors)
 *   do not need to special-case figma-mcp.
 * - `recordFigmaGrounding`: agent-invoked grounding recorder. Takes a payload
 *   the agent gathered from Figma MCP and produces a structured ScanResult
 *   plus a content_hashes entry suitable for the grounding.completed event.
 * - `figmaSourceHashKey` / `figmaSourceHash`: stable hash-key helpers shared
 *   with stale detection.
 *
 * See: commands/stale-check.ts, docs/agent-protocol/start.md
 */

export type FigmaSource = SourceEntry & { type: "figma-mcp" };

export interface FigmaGroundingPayload {
  lastModified: string;
  fileName?: string | undefined;
  nodeCount?: number | undefined;
  pageCount?: number | undefined;
}

export function figmaSourceHashKey(source: FigmaSource): string {
  return sourceKey(source);
}

export function figmaSourceHash(
  source: FigmaSource,
  lastModified: string,
): { key: string; value: string } {
  return { key: sourceKey(source), value: lastModified };
}

export function scanFigmaMcp(source: FigmaSource): ScanResult {
  return emptyScanResult(source);
}

export function recordFigmaGrounding(
  source: FigmaSource,
  payload: FigmaGroundingPayload,
): ScanResult {
  const base = emptyScanResult(source);
  const key = sourceKey(source);
  return {
    ...base,
    content_hashes: { [key]: payload.lastModified },
    doc_structure: [
      {
        file: key,
        format: "json",
        frontmatter: {
          lastModified: payload.lastModified,
          ...(payload.fileName !== undefined ? { fileName: payload.fileName } : {}),
          ...(payload.nodeCount !== undefined ? { nodeCount: payload.nodeCount } : {}),
          ...(payload.pageCount !== undefined ? { pageCount: payload.pageCount } : {}),
        },
      },
    ],
  };
}
