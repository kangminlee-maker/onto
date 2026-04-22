import { sourceKey, emptyScanResult } from "./types.js";
export function figmaSourceHashKey(source) {
    return sourceKey(source);
}
export function figmaSourceHash(source, lastModified) {
    return { key: sourceKey(source), value: lastModified };
}
export function scanFigmaMcp(source) {
    return emptyScanResult(source);
}
export function recordFigmaGrounding(source, payload) {
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
