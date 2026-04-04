import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export function dumpYamlDocument(data: unknown): string {
  return YAML.stringify(data).trimEnd();
}

export async function writeYamlDocument(
  filePath: string,
  data: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${dumpYamlDocument(data)}\n`, "utf8");
}

export async function readYamlDocument<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return YAML.parse(text) as T;
}

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}

function formatOffset(minutesEastOfUtc: number): string {
  const sign = minutesEastOfUtc >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(minutesEastOfUtc);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function formatLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatOffset(
    offsetMinutes,
  )}`;
}

export function isoNow(): string {
  return formatLocalIso(new Date());
}

export function isoFromTimestamp(timestampMs: number): string {
  return formatLocalIso(new Date(timestampMs));
}

export function toRelativePath(targetPath: string, projectRoot: string): string {
  const relativePath = path.relative(projectRoot, targetPath);
  const normalized = relativePath === "" ? "." : relativePath;
  return normalized.split(path.sep).join(path.posix.sep);
}

export function normalizeDomainValue(domainValue: string): string {
  if (["", "-", "@-", "none"].includes(domainValue)) {
    return "none";
  }
  return domainValue.startsWith("@") ? domainValue.slice(1) : domainValue;
}

export function parseBooleanFlag(
  optionValue: string | boolean | undefined,
  optionName: string,
): boolean {
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

export async function collectFilePathsRecursively(rootPath: string): Promise<string[]> {
  const directoryEntries = await fs.readdir(rootPath, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of directoryEntries) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectFilePathsRecursively(entryPath)));
      continue;
    }
    if (entry.isFile()) {
      collected.push(entryPath);
    }
  }

  return collected.sort();
}

export async function readTextOrDirectoryListing(targetPath: string): Promise<string> {
  const stats = await fs.stat(targetPath);
  if (!stats.isDirectory()) {
    return fs.readFile(targetPath, "utf8");
  }

  const filePaths = await collectFilePathsRecursively(targetPath);
  const listing = filePaths.length
    ? filePaths
        .map((filePath) => `- ${path.relative(targetPath, filePath).split(path.sep).join(path.posix.sep)}`)
        .join("\n")
    : "(empty directory)";
  return `[Directory Listing]\n${listing}\n`;
}

export async function renderTargetSnapshot(resolvedTargetRefs: string[]): Promise<string> {
  const sections: string[] = [];
  for (const resolvedTargetRef of resolvedTargetRefs) {
    sections.push(`## ${resolvedTargetRef}`, "", await readTextOrDirectoryListing(resolvedTargetRef), "");
  }
  return `${sections.join("\n").trimEnd()}\n`;
}

export async function renderReviewTargetMaterializedInput(
  materializedKind: string,
  materializedRefs: string[],
): Promise<string> {
  const sections: string[] = [`kind: ${materializedKind}`, ""];
  for (const materializedRef of materializedRefs) {
    sections.push(`## ${path.basename(materializedRef)}`);
    sections.push(`ref: ${materializedRef}`);
    sections.push("");
    sections.push(await readTextOrDirectoryListing(materializedRef));
    sections.push("");
  }
  return `${sections.join("\n").trimEnd()}\n`;
}

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function readSingleOptionValueFromArgv(
  argv: string[],
  optionName: string,
): string | undefined {
  const optionToken = `--${optionName}`;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== optionToken) {
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

export function readMultiOptionValuesFromArgv(
  argv: string[],
  optionName: string,
): string[] {
  const optionToken = `--${optionName}`;
  const collected: string[] = [];
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

export function hasOptionFlag(argv: string[], optionName: string): boolean {
  const optionToken = `--${optionName}`;
  return argv.includes(optionToken);
}
