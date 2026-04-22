import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { contentHash } from "../scope-runtime/hash.js";
import { getLogger } from "../logger.js";
import { walkDirectory, computeDirectoryHashFromMap, normalizePath } from "./file-utils.js";
import { detectPatterns } from "./patterns/index.js";
import { sourceKey, emptyScanResult } from "./types.js";
/**
 * Scan a local file or directory and produce a ScanResult.
 *
 * Pure I/O function: reads file system, no network calls.
 * For single files, wraps the file as a 1-item scan.
 * For directories, walks the tree respecting .gitignore and exclusion rules.
 */
export function scanLocal(source) {
    const fullPath = normalizePath(source.path);
    let stat;
    try {
        stat = statSync(fullPath);
    }
    catch {
        return emptyScanResult(source);
    }
    if (stat.isFile()) {
        return scanSingleFile(source, fullPath);
    }
    return scanDirectory(source, fullPath);
}
export function scanDirectory(source, rootPath) {
    const files = walkDirectory(rootPath);
    const deps = [];
    const apis = [];
    const schemas = [];
    const configs = [];
    const docs = [];
    const contentHashMap = new Map();
    for (const file of files) {
        const absPath = join(rootPath, file.path);
        let content;
        try {
            content = readFileSync(absPath, "utf-8");
        }
        catch (error) {
            getLogger().debug("scanDirectory: failed to read file", { path: absPath, error });
            contentHashMap.set(file.path, "unreadable");
            continue;
        }
        contentHashMap.set(file.path, contentHash(content));
        const patterns = detectPatterns(content, file.path);
        deps.push(...patterns.deps);
        apis.push(...patterns.apis);
        schemas.push(...patterns.schemas);
        configs.push(...patterns.configs);
        docs.push(...patterns.docs);
    }
    const dirHash = computeDirectoryHashFromMap(contentHashMap);
    return {
        source,
        scanned_at: new Date().toISOString(),
        files,
        content_hashes: { [sourceKey(source)]: dirHash },
        dependency_graph: deps,
        api_patterns: apis,
        schema_patterns: schemas,
        config_patterns: configs,
        doc_structure: docs,
    };
}
function scanSingleFile(source, filePath) {
    let content;
    try {
        content = readFileSync(filePath, "utf-8");
    }
    catch {
        return emptyScanResult(source);
    }
    const hash = contentHash(content);
    const fileName = filePath.split("/").pop() ?? filePath;
    let sizeBytes = content.length;
    try {
        sizeBytes = statSync(filePath).size;
    }
    catch { /* use content.length as fallback */ }
    const fileEntry = {
        path: fileName,
        category: "other",
        language: undefined,
        size_bytes: sizeBytes,
    };
    const patterns = detectPatterns(content, fileName);
    return {
        source,
        scanned_at: new Date().toISOString(),
        files: [fileEntry],
        content_hashes: { [sourceKey(source)]: hash },
        dependency_graph: patterns.deps,
        api_patterns: patterns.apis,
        schema_patterns: patterns.schemas,
        config_patterns: patterns.configs,
        doc_structure: patterns.docs,
    };
}
