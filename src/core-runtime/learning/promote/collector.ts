/**
 * Phase 3 Promote — Collector (Step 7).
 *
 * Design authority:
 *   - learn-phase3-design-v9.md (delta + DD-23)
 *   - learn-phase3-design-v6.md DD-18 §SST (candidate_items canonical definition)
 *   - learn-phase3-design-v5.md §5.1 (collector.ts skeleton)
 *   - learn-phase3-design-v5.md DD-10 (BaselineHash + freshness gate)
 *   - processes/promote.md Step 1~2
 *   - learning-rules.md (file format)
 *
 * Responsibility:
 *   - Discover learning files (project + global) per CollectorMode.
 *   - Parse §1.3 lines into ParsedLearningItem (Phase 3 shape from promote/types.ts).
 *   - Capture BaselineHash (DD-10) for freshness re-check at Phase B.
 *   - Build candidate_items per DD-18 §SST table (mode-dispatched filter).
 *   - Return CollectionResult with project_items / global_items / candidate_items
 *     as separate canonical seats. Consumers MUST read candidate_items rather
 *     than re-deriving from project_items/global_items.
 *
 * Layering:
 *   - Phase A only (strict source-read-only). No mutation, no LLM calls.
 *   - Reuses TAG_PATTERN/SOURCE_PATTERN/CONTENT_CAPTURE from shared/patterns.ts.
 *   - File path resolution mirrors shared/paths.ts: bare-id .md files under
 *     `<root>/.onto/learnings/`. Phase 0 dual-read tolerates `onto_` legacy
 *     filenames during the migration window.
 *
 * Failure model:
 *   - Per-line parse failures append to parse_errors and the line is skipped.
 *     Collection itself does not throw; the caller decides whether parse_errors
 *     gates Phase A. v5 §5.1 explicitly returns parse failures rather than
 *     aborting the whole collection.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

import {
  ITEM_LINE_RE,
  SOURCE_PATTERN,
} from "../shared/patterns.js";
import type {
  BaselineHash,
  BaselineHashFile,
  CollectionResult,
  CollectorMode,
  LearningImpact,
  LearningPurposeRole,
  LearningScope,
  LearningType,
  ParsedLearningItem,
  ParseError,
} from "./types.js";

// ---------------------------------------------------------------------------
// Path discovery
// ---------------------------------------------------------------------------

const LEARNINGS_SUBDIR = path.join(".onto", "learnings");

function getProjectLearningsDir(projectRoot: string): string {
  return path.join(projectRoot, LEARNINGS_SUBDIR);
}

function getGlobalLearningsDir(): string {
  return path.join(os.homedir(), LEARNINGS_SUBDIR);
}

/**
 * agent_id is the file basename without `.md`. Phase 0 dual-read accepts the
 * legacy `onto_` prefix; canonical agent_id strips it so promote outputs join
 * cleanly with the rest of the runtime.
 */
function deriveAgentId(filename: string): string {
  const base = filename.endsWith(".md") ? filename.slice(0, -3) : filename;
  return base.startsWith("onto_") ? base.slice(5) : base;
}

interface DiscoveredFile {
  absolute_path: string;
  agent_id: string;
  scope: LearningScope;
}

function listLearningFiles(
  dir: string,
  scope: LearningScope,
): DiscoveredFile[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: DiscoveredFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    files.push({
      absolute_path: path.join(dir, entry.name),
      agent_id: deriveAgentId(entry.name),
      scope,
    });
  }
  // Sort for deterministic baseline hash ordering.
  files.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path));
  return files;
}

// ---------------------------------------------------------------------------
// Line parsing
// ---------------------------------------------------------------------------

const LEARNING_ID_COMMENT_RE =
  /<!--\s*learning_id:\s*(\w+)(?:\s+taxonomy_version:\s*[\w.-]+)?\s*-->/;
const EVENT_MARKER_COMMENT_RE =
  /<!--\s*(applied-then-found-invalid|observed-obsolete):\s*([^>]*?)\s*-->/g;
const RETENTION_CONFIRMED_RE =
  /<!--\s*retention-confirmed:\s*(\d{4}-\d{2}-\d{2})\s*-->/;

interface ApplicabilityParts {
  applicability_tags: string[];
  role: LearningPurposeRole;
}

/**
 * Extract applicability tags and role from the bracket-tag prefix of a line.
 *
 * §1.3 grammar:
 *   - [type] [methodology|domain/X]+ [role]? content (source: ...) [impact:...]
 *
 * The role bracket is optional. When [insight] appears it is preserved as-is
 * because Phase 3 reclassify-insights (DD-9) needs to find it; Phase 1 loader's
 * "insight → null" rewrite is intentionally NOT applied here.
 */
function extractApplicabilityAndRole(line: string): ApplicabilityParts {
  const applicability_tags: string[] = [];
  let role: LearningPurposeRole = null;

  const bracketRe = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  // Skip the first bracket which is the [type] discriminator.
  let firstSeen = false;
  while ((match = bracketRe.exec(line)) !== null) {
    const value = match[1]!;
    if (!firstSeen) {
      firstSeen = true;
      continue; // [fact] | [judgment]
    }
    if (value === "methodology" || value.startsWith("domain/")) {
      applicability_tags.push(value);
      continue;
    }
    if (
      value === "guardrail" ||
      value === "foundation" ||
      value === "convention" ||
      value === "insight"
    ) {
      role = value as LearningPurposeRole;
      continue;
    }
    if (value.startsWith("impact:")) {
      // impact handled by IMPACT_RE; bracket scan ignores it.
      break;
    }
  }

  return { applicability_tags, role };
}

interface ParsedLine {
  item: Omit<
    ParsedLearningItem,
    "learning_id" | "event_markers" | "retention_confirmed_at"
  >;
}

/**
 * Lenient §1.3 line parser.
 *
 * Phase 3 collector intentionally accepts BOTH strict Phase 2 output and
 * pre-Phase 2 legacy lines: the whole point of promote is to review legacy
 * items and elevate or retire them. Strict TAG_PATTERN would drop too much.
 *
 * Required: line begins with `- [fact]` / `- [judgment]` and at least one
 * applicability tag.
 *
 * Best-effort: source metadata may be missing or use the pre-Phase 2 2-field
 * shape `(source: <description>, <date>)`. Impact defaults to "normal" when
 * absent. Trailing annotations (e.g., `(-> promoted to global, ...)`) are
 * tolerated.
 *
 * parse_errors only fires when the line truly cannot be classified — i.e.,
 * the type discriminator is missing or there is no usable applicability tag.
 */
function parseLearningLine(
  rawLine: string,
  agentId: string,
  scope: LearningScope,
  sourcePath: string,
  lineNumber: number,
): ParsedLine | { error: string } {
  const typeMatch = rawLine.match(ITEM_LINE_RE);
  if (!typeMatch) {
    return { error: "line does not start with [fact] or [judgment] marker" };
  }
  const type = typeMatch[1] as LearningType;

  const { applicability_tags, role } = extractApplicabilityAndRole(rawLine);
  if (applicability_tags.length === 0) {
    return { error: "no applicability tags ([methodology] or [domain/X])" };
  }

  const impactMatch = rawLine.match(/\[impact:(high|normal)\]/);
  const impact = (impactMatch?.[1] ?? "normal") as LearningImpact;

  // Source metadata: try strict 3-field shape first, fall back to 2-field
  // legacy shape, fall back to null when absent entirely.
  let source_project: string | null = null;
  let source_domain: string | null = null;
  let source_date: string | null = null;
  const source3 = rawLine.match(SOURCE_PATTERN);
  if (source3) {
    source_project = source3[1]!.trim();
    source_domain = source3[2]!.trim();
    source_date = source3[3]!.trim();
  } else {
    const source2 = rawLine.match(
      /\(source:\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})\)/,
    );
    if (source2) {
      source_project = source2[1]!.trim();
      source_date = source2[2]!.trim();
    }
  }

  // Content: strip the leading `- [type] [tags...] [role]?` prefix and the
  // trailing `(source: ...)` / `[impact:...]` / `(-> ...)` annotations. The
  // remainder is the human-readable body.
  const content = extractContentBody(rawLine);
  if (!content) {
    return { error: "empty content body" };
  }

  return {
    item: {
      agent_id: agentId,
      scope,
      source_path: sourcePath,
      raw_line: rawLine,
      line_number: lineNumber,
      type,
      applicability_tags,
      role,
      content,
      source_project,
      source_domain,
      source_date,
      impact,
    },
  };
}

/**
 * Strip the §1.3 wrapper and return just the content body.
 *
 * Strategy:
 *   1. Drop the leading `- [type] [tag] [role]?` bracket prefix.
 *   2. Drop everything from the first `(source: ...)` onward (which also
 *      removes trailing `(-> ...)` and `[impact:...]` annotations attached
 *      after the source clause).
 *   3. Trim whitespace.
 *
 * If no source clause exists, also strip a trailing `[impact:...]` and any
 * trailing `(-> ...)` notes so legacy lines without source still produce a
 * clean body.
 */
function extractContentBody(rawLine: string): string {
  // Remove leading list marker.
  let body = rawLine.replace(/^[-*+]\s+/, "");
  // Remove leading bracket prefix: walk through consecutive `[...]` blocks.
  while (true) {
    const m = body.match(/^\[[^\]]+\]\s*/);
    if (!m) break;
    body = body.slice(m[0].length);
  }
  // Cut at the first source clause if present.
  const sourceIdx = body.indexOf("(source:");
  if (sourceIdx >= 0) {
    body = body.slice(0, sourceIdx);
  } else {
    // No source clause: still strip trailing impact and `(-> ...)` notes.
    body = body.replace(/\s*\[impact:(high|normal)\]\s*$/, "");
    body = body.replace(/\s*\(->[^)]*\)\s*$/, "");
  }
  return body.trim();
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

interface FileParseResult {
  items: ParsedLearningItem[];
  errors: ParseError[];
  baseline: BaselineHashFile;
}

function parseLearningFile(file: DiscoveredFile): FileParseResult {
  const buffer = fs.readFileSync(file.absolute_path);
  const content = buffer.toString("utf8");
  const lines = content.split("\n");

  const items: ParsedLearningItem[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue; // markdown heading
    if (trimmed.startsWith("<!--")) continue; // top-of-file format marker
    if (!/^[-*+]\s+\[/.test(trimmed)) continue;

    const parsed = parseLearningLine(
      trimmed,
      file.agent_id,
      file.scope,
      file.absolute_path,
      i + 1,
    );

    if ("error" in parsed) {
      errors.push({
        source_path: file.absolute_path,
        line_number: i + 1,
        raw_line: trimmed,
        error: parsed.error,
      });
      continue;
    }

    // Look ahead for trailing comment annotations attached to this learning.
    let learning_id: string | null = null;
    let retention_confirmed_at: string | null = null;
    const event_markers: string[] = [];

    let lookahead = i + 1;
    while (lookahead < lines.length) {
      const nextRaw = lines[lookahead]!.trim();
      if (!nextRaw) break;
      if (!nextRaw.startsWith("<!--")) break;

      const idMatch = nextRaw.match(LEARNING_ID_COMMENT_RE);
      if (idMatch) {
        learning_id = idMatch[1]!;
        lookahead++;
        continue;
      }

      const retentionMatch = nextRaw.match(RETENTION_CONFIRMED_RE);
      if (retentionMatch) {
        retention_confirmed_at = retentionMatch[1]!;
        lookahead++;
        continue;
      }

      const markerRe = new RegExp(EVENT_MARKER_COMMENT_RE.source, "g");
      let mm: RegExpExecArray | null;
      let isMarker = false;
      while ((mm = markerRe.exec(nextRaw)) !== null) {
        // Store the FULL marker comment text so retirement.ts can parse the
        // date for retention-confirmed cutoff handling (DD-6 + promote.md §4a).
        event_markers.push(mm[0]!);
        isMarker = true;
      }
      if (isMarker) {
        lookahead++;
        continue;
      }

      // Unrecognized comment — stop scanning so we don't swallow neighbours.
      break;
    }

    items.push({
      ...parsed.item,
      learning_id,
      event_markers,
      retention_confirmed_at,
    });
  }

  const baseline: BaselineHashFile = {
    path: file.absolute_path,
    scope: file.scope,
    agent_id: file.agent_id,
    size_bytes: buffer.byteLength,
    content_sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    line_count: lines.length,
  };

  return { items, errors, baseline };
}

// ---------------------------------------------------------------------------
// DD-18 §SST candidate selection (canonical definition — single seat)
// ---------------------------------------------------------------------------

/**
 * DD-18 §SST canonical definition. This is the only place candidate_items is
 * computed; consumers must read CollectionResult.candidate_items rather than
 * recomputing it.
 *
 * | Mode                 | candidate_items                                       |
 * |----------------------|-------------------------------------------------------|
 * | promote              | project_items.filter(item => item.role !== "insight") |
 * | reclassify-insights  | global_items.filter(item => item.role === "insight")  |
 */
function buildCandidateItems(
  mode: CollectorMode,
  project_items: ParsedLearningItem[],
  global_items: ParsedLearningItem[],
): ParsedLearningItem[] {
  switch (mode) {
    case "promote":
      return project_items.filter((item) => item.role !== "insight");
    case "reclassify-insights":
      return global_items.filter((item) => item.role === "insight");
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown CollectorMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CollectorConfig {
  mode: CollectorMode;
  projectRoot: string;
}

export function collect(config: CollectorConfig): CollectionResult {
  const collected_at = new Date().toISOString();

  const projectFiles = listLearningFiles(
    getProjectLearningsDir(config.projectRoot),
    "project",
  );
  const globalFiles = listLearningFiles(getGlobalLearningsDir(), "global");

  const project_items: ParsedLearningItem[] = [];
  const global_items: ParsedLearningItem[] = [];
  const parse_errors: ParseError[] = [];
  const baseline_files: BaselineHashFile[] = [];

  for (const file of projectFiles) {
    const result = parseLearningFile(file);
    project_items.push(...result.items);
    parse_errors.push(...result.errors);
    baseline_files.push(result.baseline);
  }
  for (const file of globalFiles) {
    const result = parseLearningFile(file);
    global_items.push(...result.items);
    parse_errors.push(...result.errors);
    baseline_files.push(result.baseline);
  }

  const candidate_items = buildCandidateItems(
    config.mode,
    project_items,
    global_items,
  );

  const baseline_hash: BaselineHash = {
    schema_version: "1",
    source_scope: config.mode,
    captured_at: collected_at,
    files: baseline_files,
  };

  return {
    schema_version: "1",
    mode: config.mode,
    collected_at,
    project_items,
    global_items,
    candidate_items,
    baseline_hash,
    parse_errors,
  };
}

// ---------------------------------------------------------------------------
// Baseline freshness check (DD-10 — used by Phase B)
// ---------------------------------------------------------------------------

export interface BaselineMismatch {
  path: string;
  reason:
    | "file_missing"
    | "size_changed"
    | "content_sha256_changed"
    | "line_count_changed";
  expected: string;
  actual: string;
}

/**
 * Re-hash the files captured in a BaselineHash and report any mismatches.
 *
 * Phase B calls this before mutation to confirm the source files have not
 * shifted between Phase A's collect() snapshot and the apply window.
 *
 * Returns an empty array when the baseline still holds. The caller decides
 * whether to halt (default) or proceed with --force-stale.
 */
export function verifyBaselineHash(
  baseline: BaselineHash,
): BaselineMismatch[] {
  const mismatches: BaselineMismatch[] = [];

  for (const file of baseline.files) {
    if (!fs.existsSync(file.path)) {
      mismatches.push({
        path: file.path,
        reason: "file_missing",
        expected: file.content_sha256,
        actual: "<missing>",
      });
      continue;
    }

    const buffer = fs.readFileSync(file.path);
    if (buffer.byteLength !== file.size_bytes) {
      mismatches.push({
        path: file.path,
        reason: "size_changed",
        expected: String(file.size_bytes),
        actual: String(buffer.byteLength),
      });
      continue;
    }

    const sha = crypto.createHash("sha256").update(buffer).digest("hex");
    if (sha !== file.content_sha256) {
      mismatches.push({
        path: file.path,
        reason: "content_sha256_changed",
        expected: file.content_sha256,
        actual: sha,
      });
      continue;
    }

    const lineCount = buffer.toString("utf8").split("\n").length;
    if (lineCount !== file.line_count) {
      mismatches.push({
        path: file.path,
        reason: "line_count_changed",
        expected: String(file.line_count),
        actual: String(lineCount),
      });
    }
  }

  return mismatches;
}
