#!/usr/bin/env tsx
/**
 * Output Language Boundary Lint
 *
 * Enforces `design-principles/output-language-boundary.md` in CI.
 * Scans the repo for violations of the internal-English / external-translate
 * policy and exits non-zero when any are found.
 *
 * Current checks (progressive — more will be added as authors adopt the
 * render-for-user seat):
 *
 *   R1. Prohibited pattern in prompts/instructions:
 *         `Respond in {output_language}`
 *       Anywhere outside the allowlist is a violation. The pattern is the
 *       exact literal the previous (pre-boundary) agent prompts used; it
 *       directs an LLM to respond in a variable language, which is exactly
 *       what the principle forbids inside agent hand-off paths.
 *
 *   R2. Static validation of `renderForUser({renderPointId: "X"})` calls:
 *       every literal-string renderPointId in `src/` MUST exist in
 *       `authority/external-render-points.yaml`. This duplicates the
 *       runtime check in render-for-user.ts but catches violations at
 *       CI time before they reach production. Dynamic (non-literal)
 *       renderPointId arguments are skipped (can't be statically
 *       validated) — those fall back to the runtime check.
 *       See design-principles/output-language-boundary.md §8/§9.
 *
 * Usage:
 *   npx tsx scripts/lint-output-language-boundary.ts
 *   npm run lint:output-language-boundary
 *
 * Exit code 0 = pass, 1 = violations found.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

interface Violation {
  rule: string;
  file: string;
  line: number;
  excerpt: string;
  guidance: string;
}

/**
 * Files that are permitted to contain the prohibited pattern because they
 * describe it (principle doc, lint script itself, history / legacy notes).
 * Paths are repo-relative.
 */
const R1_ALLOWLIST: readonly string[] = [
  "design-principles/output-language-boundary.md",
  "scripts/lint-output-language-boundary.ts",
  "CHANGELOG.md", // historical references to the pre-boundary pattern
];

const R1_PATTERN = /Respond in \{output_language\}/;
const R1_GUIDANCE =
  "Agent prompts must not direct the LLM to respond in a variable language. " +
  "Replace with `Respond in English` + a note about the Runtime Coordinator's render seat. " +
  "See design-principles/output-language-boundary.md §3.1.";

/**
 * R2: renderForUser call with literal renderPointId string.
 * Matches `renderForUser({renderPointId: "X"` or `renderForUser({renderPointId: 'X'`
 * across line breaks (object literal may span lines). Captures the id value.
 * Dynamic (variable/expression) renderPointId is NOT matched — skipped, runtime
 * check protects those calls.
 */
const R2_CALL_PATTERN =
  /renderForUser\s*\(\s*\{[^}]*?renderPointId\s*:\s*["']([a-zA-Z0-9_\-]+)["']/gs;
const R2_REGISTRY_PATH = "authority/external-render-points.yaml";
const R2_GUIDANCE_TEMPLATE = (id: string, known: string): string =>
  `renderPointId "${id}" is not registered in ${R2_REGISTRY_PATH}. ` +
  `Add an entry (rationale: post-call no agent consumption) or fix the id. ` +
  `Known ids: ${known}. See design-principles/output-language-boundary.md §4.`;

/**
 * Directories scanned by default. We deliberately skip `.onto/`, `dist/`,
 * `node_modules/`, `.git/`, and the temporary session artifacts under
 * `.onto/review/` — those are either gitignored or held ephemeral.
 */
const SCAN_ROOTS: readonly string[] = [
  "processes",
  "commands",
  "design-principles",
  "authority",
  "roles",
  "src",
  "scripts",
  "development-records",
];

const SCAN_TOP_LEVEL_FILES: readonly string[] = [
  "process.md",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CHANGELOG.md",
  "BLUEPRINT.md",
];

const FILE_EXTENSIONS = new Set([".md", ".ts", ".yaml", ".yml"]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".onto",
  ".claude",
  "coverage",
]);

function listFiles(root: string): string[] {
  const result: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (!FILE_EXTENSIONS.has(ext)) continue;
      result.push(full);
    }
  };
  walk(root);
  return result;
}

function repoRelative(absolute: string): string {
  return path.relative(REPO_ROOT, absolute);
}

/**
 * Parse `authority/external-render-points.yaml` to extract the set of
 * registered `id:` values. Uses a minimal line-scan — the file is a simple
 * points: list-of-records shape. Avoids adding a YAML dep.
 */
function loadRegisteredRenderPointIds(): Set<string> {
  const registryAbs = path.join(REPO_ROOT, R2_REGISTRY_PATH);
  const ids = new Set<string>();
  let content: string;
  try {
    content = fs.readFileSync(registryAbs, "utf8");
  } catch {
    return ids; // empty set — registry missing is a separate concern
  }
  let inPoints = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (/^points:\s*$/.test(line)) {
      inPoints = true;
      continue;
    }
    if (!inPoints) continue;
    const idMatch = /^\s*-\s*id:\s*"?([a-zA-Z0-9_\-]+)"?/.exec(line);
    if (idMatch && idMatch[1] !== undefined) {
      ids.add(idMatch[1]);
    }
  }
  return ids;
}

const REGISTERED_IDS = loadRegisteredRenderPointIds();

function scanFile(absolutePath: string, violations: Violation[]): void {
  const rel = repoRelative(absolutePath);

  let content: string;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }

  // R1 — applies to non-allowlisted files only
  if (!R1_ALLOWLIST.includes(rel)) {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (R1_PATTERN.test(line)) {
        violations.push({
          rule: "R1",
          file: rel,
          line: i + 1,
          excerpt: line.trim(),
          guidance: R1_GUIDANCE,
        });
      }
    }
  }

  // R2 — renderForUser call with unregistered literal renderPointId.
  // Scanned only in src/ (TS callers). test fixtures that inject their own
  // registry via setRegistryPathForTesting are excluded by path.
  if (rel.startsWith("src/") && !rel.includes(".test.")) {
    R2_CALL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = R2_CALL_PATTERN.exec(content)) !== null) {
      const id = match[1];
      if (id === undefined) continue;
      if (REGISTERED_IDS.has(id)) continue;
      const lineNumber = content.slice(0, match.index).split(/\r?\n/).length;
      const knownPreview = [...REGISTERED_IDS].slice(0, 3).join(", ") +
        (REGISTERED_IDS.size > 3 ? ", ..." : "") +
        (REGISTERED_IDS.size === 0 ? "(none)" : "");
      violations.push({
        rule: "R2",
        file: rel,
        line: lineNumber,
        excerpt: match[0],
        guidance: R2_GUIDANCE_TEMPLATE(id, knownPreview),
      });
    }
  }
}

function main(): void {
  const allFiles: string[] = [];
  for (const root of SCAN_ROOTS) {
    const absRoot = path.join(REPO_ROOT, root);
    if (!fs.existsSync(absRoot)) continue;
    allFiles.push(...listFiles(absRoot));
  }
  for (const file of SCAN_TOP_LEVEL_FILES) {
    const abs = path.join(REPO_ROOT, file);
    if (fs.existsSync(abs)) allFiles.push(abs);
  }

  const violations: Violation[] = [];
  for (const file of allFiles) scanFile(file, violations);

  if (violations.length === 0) {
    process.stdout.write(
      `[lint:output-language-boundary] clean — ${allFiles.length} files scanned, 0 violations.\n`,
    );
    process.exit(0);
  }

  process.stderr.write(
    `[lint:output-language-boundary] ${violations.length} violation(s) found across ${allFiles.length} files:\n\n`,
  );
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byRule.get(v.rule) ?? [];
    list.push(v);
    byRule.set(v.rule, list);
  }
  for (const [rule, list] of byRule) {
    process.stderr.write(`── Rule ${rule} ──\n`);
    for (const v of list) {
      process.stderr.write(`  ${v.file}:${v.line}\n`);
      process.stderr.write(`    ${v.excerpt}\n`);
    }
    if (list.length > 0) {
      process.stderr.write(`  guidance: ${list[0].guidance}\n\n`);
    }
  }
  process.stderr.write(
    "Fix the listed lines or add the file to the rule's allowlist in " +
      "scripts/lint-output-language-boundary.ts (only for legitimate " +
      "description / historical reference cases — not to silence a real " +
      "violation).\n",
  );
  process.exit(1);
}

main();
