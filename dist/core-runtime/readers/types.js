// ─── Source Entry (re-exported from kernel) ───
export { sourceKey } from "../scope-runtime/types.js";
// ─── Normalize to GroundingStartedPayload format ───
export function toGroundingSource(entry) {
    switch (entry.type) {
        case "add-dir":
            return { type: "add-dir", path_or_url: entry.path };
        case "github-tarball":
            return { type: "github-tarball", path_or_url: entry.url };
        case "figma-mcp":
            return { type: "figma-mcp", path_or_url: entry.file_key };
        case "obsidian-vault":
            return { type: "obsidian-vault", path_or_url: entry.path };
        case "mcp":
            return { type: "mcp", path_or_url: entry.provider };
        default: {
            const _exhaustive = entry;
            throw new Error(`Unknown source type: ${entry.type}`);
        }
    }
}
// ─── Empty Scan Result Factory ───
export function emptyScanResult(source) {
    return {
        source,
        scanned_at: new Date().toISOString(),
        files: [],
        content_hashes: {},
        dependency_graph: [],
        api_patterns: [],
        schema_patterns: [],
        config_patterns: [],
        doc_structure: [],
    };
}
export function isScanSkipped(result) {
    return "skipped" in result && result.skipped === true;
}
/** Type guard for ScanError */
export function isScanError(result) {
    return "error_type" in result;
}
