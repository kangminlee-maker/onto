import { sourceKey, emptyScanResult } from "./types.js";
export function genericMcpSourceHashKey(source) {
    return sourceKey(source);
}
export function genericMcpSourceHash(source, responseDigest) {
    return { key: sourceKey(source), value: responseDigest };
}
export function scanGenericMcp(source) {
    return emptyScanResult(source);
}
export function recordGenericMcpGrounding(source, payload) {
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
