import { sourceKey, emptyScanResult, type SourceEntry, type ScanResult } from "./types.js";

/**
 * generic mcp source skeleton (type: "mcp").
 *
 * A generic MCP source delegates grounding to any MCP provider the agent
 * invokes directly (e.g. linear-mcp, slack-mcp). Like figma-mcp, there is no
 * automated scanner — the agent calls provider tools and records the outcome
 * through the helpers here. The `provider` string identifies the source
 * uniquely inside content_hashes and stale tracking.
 *
 * Skeleton responsibilities:
 * - `scanGenericMcp`: kernel-compat entry returning emptyScanResult so source
 *   iteration loops stay uniform.
 * - `recordGenericMcpGrounding`: agent-invoked recorder that preserves the
 *   response digest (used for stale detection) and any tools/sample counts
 *   the agent observed.
 * - `genericMcpSourceHashKey` / `genericMcpSourceHash`: hash-key helpers that
 *   keep `mcp:{provider}` canonical with `sourceKey`.
 *
 * Evolution hooks: once a provider has stable scan semantics (e.g. a fixed
 * HTTP API), a dedicated reader can replace the agent-mediated path while
 * keeping the hash-key contract.
 */

export type GenericMcpSource = SourceEntry & { type: "mcp" };

export interface GenericMcpGroundingPayload {
  responseDigest: string;
  toolsSeen?: string[] | undefined;
  sampleCount?: number | undefined;
  retrievedAt?: string | undefined;
}

export function genericMcpSourceHashKey(source: GenericMcpSource): string {
  return sourceKey(source);
}

export function genericMcpSourceHash(
  source: GenericMcpSource,
  responseDigest: string,
): { key: string; value: string } {
  return { key: sourceKey(source), value: responseDigest };
}

export function scanGenericMcp(source: GenericMcpSource): ScanResult {
  return emptyScanResult(source);
}

export function recordGenericMcpGrounding(
  source: GenericMcpSource,
  payload: GenericMcpGroundingPayload,
): ScanResult {
  const base = emptyScanResult(source);
  const key = sourceKey(source);
  return {
    ...base,
    content_hashes: { [key]: payload.responseDigest },
    doc_structure: [
      {
        file: key,
        format: "json",
        frontmatter: {
          provider: source.provider,
          responseDigest: payload.responseDigest,
          ...(payload.toolsSeen !== undefined ? { toolsSeen: payload.toolsSeen } : {}),
          ...(payload.sampleCount !== undefined ? { sampleCount: payload.sampleCount } : {}),
          ...(payload.retrievedAt !== undefined ? { retrievedAt: payload.retrievedAt } : {}),
        },
      },
    ],
  };
}
