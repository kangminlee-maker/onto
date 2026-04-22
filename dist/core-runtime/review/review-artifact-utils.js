import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
export const DEFAULT_EXCLUDED_NAMES = [
    ".git",
    "node_modules",
    ".onto",
    "dist",
    "build",
    ".next",
    "out",
    "__pycache__",
    ".venv",
    "venv",
    "coverage",
    ".cache",
    ".turbo",
    ".nuxt",
    ".output",
    ".svelte-kit",
    ".parcel-cache",
];
export const DEFAULT_DIRECTORY_LISTING_OPTIONS = {
    excluded_names: [...DEFAULT_EXCLUDED_NAMES],
    max_depth: 10,
    max_entries: 5000,
};
export function dumpYamlDocument(data) {
    return YAML.stringify(data).trimEnd();
}
export async function writeYamlDocument(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${dumpYamlDocument(data)}\n`, "utf8");
}
export async function readYamlDocument(filePath) {
    let text;
    try {
        text = await fs.readFile(filePath, "utf8");
    }
    catch (error) {
        throw new Error(`Failed to read artifact: ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
        return YAML.parse(text);
    }
    catch (error) {
        throw new Error(`Failed to parse YAML: ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export function parseMarkdownFrontmatter(markdownText) {
    if (!markdownText.startsWith("---\n")) {
        return {
            metadata: null,
            body: markdownText,
        };
    }
    const closingIndex = markdownText.indexOf("\n---\n", 4);
    if (closingIndex === -1) {
        return {
            metadata: null,
            body: markdownText,
        };
    }
    const frontmatterText = markdownText.slice(4, closingIndex);
    const bodyStart = closingIndex + "\n---\n".length;
    const body = markdownText.slice(bodyStart);
    // Treat malformed YAML as "frontmatter unavailable" rather than throwing.
    // Callers (e.g. assembler / runner deliberation-status detection) decide
    // how to fall back when metadata is null; surfacing a parse exception here
    // would short-circuit those decisions.
    let metadata;
    try {
        metadata = YAML.parse(frontmatterText);
    }
    catch {
        metadata = null;
    }
    return {
        metadata,
        body,
    };
}
export async function ensureDirectory(directoryPath) {
    await fs.mkdir(directoryPath, { recursive: true });
}
function formatOffset(minutesEastOfUtc) {
    const sign = minutesEastOfUtc >= 0 ? "+" : "-";
    const absoluteMinutes = Math.abs(minutesEastOfUtc);
    const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
    const minutes = String(absoluteMinutes % 60).padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
}
function formatLocalIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const offsetMinutes = -date.getTimezoneOffset();
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatOffset(offsetMinutes)}`;
}
export function requireString(value, optionName) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Missing required option --${optionName}`);
    }
    return value;
}
export function isoNow() {
    return formatLocalIso(new Date());
}
export function isoFromTimestamp(timestampMs) {
    return formatLocalIso(new Date(timestampMs));
}
export function toRelativePath(targetPath, projectRoot) {
    const relativePath = path.relative(projectRoot, targetPath);
    const normalized = relativePath === "" ? "." : relativePath;
    return normalized.split(path.sep).join(path.posix.sep);
}
export function normalizeDomainValue(domainValue) {
    if (["", "-", "@-", "none"].includes(domainValue)) {
        return "none";
    }
    return domainValue.startsWith("@") ? domainValue.slice(1) : domainValue;
}
export function parseBooleanFlag(optionValue, optionName) {
    if (typeof optionValue === "boolean") {
        return optionValue;
    }
    if (optionValue === undefined) {
        throw new Error(`Missing required option --${optionName}`);
    }
    if (optionValue === "true") {
        return true;
    }
    if (optionValue === "false") {
        return false;
    }
    throw new Error(`Invalid boolean value for --${optionName}: ${optionValue}`);
}
export async function collectFilePathsRecursively(rootPath, options, currentDepth) {
    const opts = options ?? DEFAULT_DIRECTORY_LISTING_OPTIONS;
    const depth = currentDepth ?? 0;
    if (depth >= opts.max_depth) {
        return [];
    }
    const directoryEntries = await fs.readdir(rootPath, { withFileTypes: true });
    const collected = [];
    for (const entry of directoryEntries) {
        if (opts.excluded_names.includes(entry.name)) {
            continue;
        }
        const entryPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            collected.push(...(await collectFilePathsRecursively(entryPath, opts, depth + 1)));
            continue;
        }
        if (entry.isFile()) {
            collected.push(entryPath);
        }
    }
    return collected.sort();
}
export async function readTextOrDirectoryListing(targetPath, options) {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
        try {
            return await fs.readFile(targetPath, "utf8");
        }
        catch (error) {
            throw new Error(`Failed to read target file: ${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    const opts = options ?? DEFAULT_DIRECTORY_LISTING_OPTIONS;
    if (opts.max_depth < 1) {
        console.warn(`[onto] Warning: max_depth is ${opts.max_depth}. No files will be listed.`);
    }
    const allPaths = await collectFilePathsRecursively(targetPath, opts);
    const truncated = allPaths.length > opts.max_entries;
    const filePaths = truncated ? allPaths.slice(0, opts.max_entries) : allPaths;
    let listing;
    if (filePaths.length > 0) {
        listing = filePaths
            .map((filePath) => `- ${path.relative(targetPath, filePath).split(path.sep).join(path.posix.sep)}`)
            .join("\n");
    }
    else {
        const rawEntries = await fs.readdir(targetPath);
        listing = rawEntries.length > 0
            ? `(empty after filtering — ${rawEntries.length} entries excluded by listing options)`
            : "(empty directory)";
    }
    const truncationNote = truncated
        ? `\n(listing truncated at ${opts.max_entries} entries; ${allPaths.length} total files found)\n`
        : "";
    return `[Directory Listing]\n${listing}\n${truncationNote}`;
}
export async function renderTargetSnapshot(resolvedTargetRefs, options) {
    const sections = [];
    for (const resolvedTargetRef of resolvedTargetRefs) {
        sections.push(`## ${resolvedTargetRef}`, "", await readTextOrDirectoryListing(resolvedTargetRef, options), "");
    }
    return `${sections.join("\n").trimEnd()}\n`;
}
export async function renderReviewTargetMaterializedInput(materializedKind, materializedRefs, options) {
    const sections = [`kind: ${materializedKind}`, ""];
    for (const materializedRef of materializedRefs) {
        sections.push(`## ${path.basename(materializedRef)}`);
        sections.push(`ref: ${materializedRef}`);
        sections.push("");
        sections.push(await readTextOrDirectoryListing(materializedRef, options));
        sections.push("");
    }
    return `${sections.join("\n").trimEnd()}\n`;
}
export function truncateForEmbedding(text, maxLines, fullRefPath) {
    const lines = text.split("\n");
    if (lines.length <= maxLines) {
        return text;
    }
    const truncatedText = lines.slice(0, maxLines).join("\n");
    return `${truncatedText}\n\n(truncated at ${maxLines} lines — full materialized input: ${fullRefPath})\n`;
}
export async function fileExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
export async function removeFileIfExists(targetPath) {
    try {
        await fs.unlink(targetPath);
    }
    catch (error) {
        if (error?.code === "ENOENT") {
            return;
        }
        throw error;
    }
}
export async function appendMarkdownLogEntry(logPath, title, body) {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    const trimmedBody = body.trim().length > 0 ? body.trim() : "(no details)";
    const entryText = `## ${isoNow()} | ${title}\n${trimmedBody}\n\n`;
    await fs.appendFile(logPath, entryText, "utf8");
}
export function readSingleOptionValueFromArgv(argv, optionName) {
    const optionToken = `--${optionName}`;
    const equalsPrefix = `${optionToken}=`;
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (typeof token === "string" && token.startsWith(equalsPrefix)) {
            return token.slice(equalsPrefix.length);
        }
        if (token !== optionToken) {
            continue;
        }
        const nextToken = argv[index + 1];
        if (typeof nextToken !== "string" || nextToken.startsWith("--")) {
            return undefined;
        }
        return nextToken;
    }
    return undefined;
}
export function readMultiOptionValuesFromArgv(argv, optionName) {
    const optionToken = `--${optionName}`;
    const collected = [];
    for (let index = 0; index < argv.length; index += 1) {
        if (argv[index] !== optionToken) {
            continue;
        }
        const nextToken = argv[index + 1];
        if (typeof nextToken !== "string" || nextToken.startsWith("--")) {
            continue;
        }
        collected.push(nextToken);
    }
    return collected;
}
export function hasOptionFlag(argv, optionName) {
    const optionToken = `--${optionName}`;
    return argv.includes(optionToken);
}
