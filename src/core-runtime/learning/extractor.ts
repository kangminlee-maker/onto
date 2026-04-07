/**
 * Learning extraction orchestrator — Phase 2.
 *
 * Executes the A-7~A-14 accumulation DAG + C-11 feedback markers.
 * Design authority: Phase 2 설계 v4 (logical-snuggling-parrot.md)
 *
 * Principles:
 * - Extraction is fail-safe (리뷰 차단 금지)
 * - Validation is fail-close (quarantine)
 * - Classification failure is fail-close (unclassified_pending — 저장 안 함)
 * - Live storage gate: save + active only
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  ReviewExecutionPlan,
  ExtractionManifest,
  ExtractionItemTrace,
  ClassifiedItemTrace,
  QuarantinedItemTrace,
  ConflictProposal,
  MarkerTrace,
} from "../review/artifact-types.js";
import {
  TAG_PATTERN,
  SOURCE_PATTERN,
  GUARDRAIL_PATTERN,
  CONTENT_CAPTURE,
  RAW_LLM_LINE_RE,
  NEWLY_LEARNED_HEADER_RE,
} from "./shared/patterns.js";
import { resolveWritePaths } from "./shared/paths.js";
import { extractContent, isContentDuplicate } from "./shared/duplicate-check.js";
import { classifyLearningItem } from "./shared/semantic-classifier.js";
import { callLlm, hashPrompt } from "./shared/llm-caller.js";
import {
  parseEventMarkers,
  matchMarkersToLearnings,
  attachEventMarkers,
} from "./feedback.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ExtractionConfig {
  sessionRoot: string;
  projectRoot: string;
  executionPlan: ReviewExecutionPlan;
  mode: "shadow" | "active";
  sessionId: string;
  sessionDomain: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateLearningId(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * A-7: Assemble source metadata and produce full §1.3 line.
 */
function assembleSourceMetadata(
  rawLine: string,
  projectRoot: string,
  sessionDomain: string | null,
): string {
  const project = path.basename(projectRoot);
  const domain = sessionDomain ?? "none";
  const date = isoDate();

  // Raw LLM line ends with [impact:...] — insert source before it
  const impactMatch = rawLine.match(/\s+\[impact:(high|normal)\]\s*$/);
  if (impactMatch) {
    const beforeImpact = rawLine.slice(0, impactMatch.index);
    return `${beforeImpact} (source: ${project}, ${domain}, ${date}) ${impactMatch[0].trim()}`;
  }

  // Fallback: append source at the end
  return `${rawLine.trimEnd()} (source: ${project}, ${domain}, ${date})`;
}

/**
 * Parse raw LLM lines from the ### Newly Learned section of a lens output.
 */
function parseNewlyLearnedSection(lensOutput: string): string[] {
  const headerMatch = lensOutput.match(NEWLY_LEARNED_HEADER_RE);
  if (!headerMatch) return [];

  const sectionStart = headerMatch.index! + headerMatch[0].length;
  const rest = lensOutput.slice(sectionStart);

  // Section ends at the next heading or end of string
  const nextHeadingMatch = rest.match(/\n##[#]?\s/);
  const sectionText = nextHeadingMatch
    ? rest.slice(0, nextHeadingMatch.index)
    : rest;

  const lines = sectionText.split("\n");
  const rawLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[-*+]\s+none\s*$/i.test(trimmed)) continue;
    if (/^[-*+]\s+\[/.test(trimmed)) {
      rawLines.push(trimmed);
    }
  }

  return rawLines;
}

// ---------------------------------------------------------------------------
// Repair helpers (A-8f, A-9f)
// ---------------------------------------------------------------------------

const REPAIR_SYSTEM_PROMPT = `You are a formatting repair assistant. Fix the learning item line to match the required format. Return ONLY the corrected line, nothing else.`;

async function repairTagFormat(
  rawLine: string,
  failureReason: string,
): Promise<string | null> {
  try {
    const userPrompt = `Original line: ${rawLine}

Failure: ${failureReason}

Required format: - [{fact|judgment}] [{methodology|domain/{name}}]+ [{guardrail|foundation|convention}]? {content} [impact:{high|normal}]
Rules: type required, applicability 1+, role optional (guardrail|foundation|convention only), impact required.
Fix the line and return ONLY the corrected line.`;

    const result = await callLlm(REPAIR_SYSTEM_PROMPT, userPrompt, {
      max_tokens: 256,
    });
    const repaired = result.text.trim();
    if (RAW_LLM_LINE_RE.test(repaired)) return repaired;
    return null;
  } catch {
    return null;
  }
}

async function repairGuardrailFormat(
  rawLine: string,
): Promise<string | null> {
  try {
    const userPrompt = `Original line: ${rawLine}

This is a [guardrail] learning item but it's missing the required three elements.
Required: **Situation**: ... **Result**: ... **Corrective action**: ...
Add the missing elements to the content. Return ONLY the corrected line.`;

    const result = await callLlm(REPAIR_SYSTEM_PROMPT, userPrompt, {
      max_tokens: 512,
    });
    const repaired = result.text.trim();
    if (GUARDRAIL_PATTERN.test(repaired)) return repaired;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-item pipeline
// ---------------------------------------------------------------------------

async function processItem(
  rawLine: string,
  lensId: string,
  config: ExtractionConfig,
  existingLines: string[],
  writePaths: ReturnType<typeof resolveWritePaths>,
): Promise<{
  trace: ExtractionItemTrace;
  conflictProposal?: ConflictProposal;
}> {
  // A-7: Assemble source metadata
  const assembled = assembleSourceMetadata(
    rawLine,
    config.projectRoot,
    config.sessionDomain,
  );

  // A-8: TAG_PATTERN validation
  if (!TAG_PATTERN.test(assembled)) {
    // A-8f: Repair attempt (1x)
    const repaired = await repairTagFormat(rawLine, "TAG_PATTERN validation failed");
    if (repaired) {
      const repairedAssembled = assembleSourceMetadata(
        repaired,
        config.projectRoot,
        config.sessionDomain,
      );
      if (TAG_PATTERN.test(repairedAssembled)) {
        // Repaired — continue with repaired line
        return processValidatedItem(
          repairedAssembled,
          rawLine,
          repaired,
          true,
          lensId,
          config,
          existingLines,
          writePaths,
        );
      }
    }

    // A-8f2: Quarantine
    const q8Trace: QuarantinedItemTrace = {
      kind: "quarantined",
      lens_id: lensId,
      raw_line: rawLine,
      assembled_line: assembled,
      failure_stage: repaired ? "A-8f" : "A-8",
      failure_reason: "TAG_PATTERN validation failed after repair attempt",
    };
    if (repaired) q8Trace.repaired_line = repaired;
    return { trace: q8Trace };
  }

  return processValidatedItem(
    assembled,
    rawLine,
    undefined,
    false,
    lensId,
    config,
    existingLines,
    writePaths,
  );
}

async function processValidatedItem(
  assembled: string,
  rawLine: string,
  repairedLine: string | undefined,
  repaired: boolean,
  lensId: string,
  config: ExtractionConfig,
  existingLines: string[],
  writePaths: ReturnType<typeof resolveWritePaths>,
): Promise<{
  trace: ExtractionItemTrace;
  conflictProposal?: ConflictProposal;
}> {
  // A-9: GUARDRAIL_PATTERN check (guardrail only)
  const hasGuardrail = /\[guardrail\]/.test(assembled);
  if (hasGuardrail && !GUARDRAIL_PATTERN.test(assembled)) {
    // A-9f: Repair attempt (1x)
    const guardrailRepaired = await repairGuardrailFormat(rawLine);
    if (guardrailRepaired) {
      const grAssembled = assembleSourceMetadata(
        guardrailRepaired,
        config.projectRoot,
        config.sessionDomain,
      );
      if (TAG_PATTERN.test(grAssembled) && GUARDRAIL_PATTERN.test(grAssembled)) {
        return processClassifiedItem(
          grAssembled,
          rawLine,
          guardrailRepaired,
          true,
          lensId,
          config,
          existingLines,
          writePaths,
        );
      }
    }

    // A-9f2: Quarantine
    const q9Trace: QuarantinedItemTrace = {
      kind: "quarantined",
      lens_id: lensId,
      raw_line: rawLine,
      assembled_line: assembled,
      failure_stage: guardrailRepaired ? "A-9f" : "A-9",
      failure_reason: "GUARDRAIL_PATTERN validation failed after repair attempt",
    };
    if (guardrailRepaired) q9Trace.repaired_line = guardrailRepaired;
    return { trace: q9Trace };
  }

  return processClassifiedItem(
    assembled,
    rawLine,
    repairedLine,
    repaired,
    lensId,
    config,
    existingLines,
    writePaths,
  );
}

async function processClassifiedItem(
  assembled: string,
  rawLine: string,
  repairedLine: string | undefined,
  repaired: boolean,
  lensId: string,
  config: ExtractionConfig,
  existingLines: string[],
  writePaths: ReturnType<typeof resolveWritePaths>,
): Promise<{
  trace: ExtractionItemTrace;
  conflictProposal?: ConflictProposal;
}> {
  // A-10: Content-level dedup
  const content = extractContent(assembled);
  if (content && isContentDuplicate(content, existingLines)) {
    return {
      trace: buildClassifiedTrace(
        assembled,
        rawLine,
        repairedLine,
        repaired,
        lensId,
        "duplicate_skip",
        "Exact content match with existing item.",
        writePaths,
        config.mode,
        "skipped_duplicate",
      ),
    };
  }

  // A-11: Semantic classification
  // Filter existing lines to same applicability domain for efficiency
  const classification = await classifyLearningItem(assembled, existingLines);

  const decision = classification.decision;

  // Build trace base
  const trace = buildClassifiedTrace(
    assembled,
    rawLine,
    repairedLine,
    repaired,
    lensId,
    decision,
    classification.reason,
    writePaths,
    config.mode,
    getPersistenceResult(decision, config.mode),
    classification.model_id,
    classification.prompt_hash,
    classification.conflict_kind,
    classification.matched_existing_line,
  );

  let conflictProposal: ConflictProposal | undefined;

  if (
    decision === "conflict_propose_replace" ||
    decision === "conflict_propose_keep" ||
    decision === "conflict_propose_coexist"
  ) {
    conflictProposal = {
      lens_id: lensId,
      new_item_line: assembled,
      matched_existing_line: classification.matched_existing_line ?? "",
      decision,
      conflict_kind: classification.conflict_kind!,
      reason: classification.reason,
    };
  }

  // A-13 + A-14: Write (save + active only)
  if (decision === "save" && config.mode === "active") {
    const learningId = generateLearningId(assembled);
    const lineWithId = `${assembled}\n<!-- learning_id: ${learningId} -->`;

    try {
      // Ensure directory exists
      const dir = path.dirname(writePaths.write_path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Ensure format_version marker exists
      if (!fs.existsSync(writePaths.write_path)) {
        fs.writeFileSync(
          writePaths.write_path,
          `<!-- format_version: 2 -->\n`,
          "utf8",
        );
      }

      fs.appendFileSync(writePaths.write_path, `${lineWithId}\n`, "utf8");

      (trace as ClassifiedItemTrace).learning_id = learningId;
      (trace as ClassifiedItemTrace).persistence_result = "written";
    } catch (error) {
      (trace as ClassifiedItemTrace).persistence_result = "write_error";
      (trace as ClassifiedItemTrace).write_error =
        error instanceof Error ? error.message : String(error);
    }
  }

  const result: { trace: ExtractionItemTrace; conflictProposal?: ConflictProposal } = { trace };
  if (conflictProposal) result.conflictProposal = conflictProposal;
  return result;
}

function getPersistenceResult(
  decision: ClassifiedItemTrace["decision"],
  mode: "shadow" | "active",
): ClassifiedItemTrace["persistence_result"] {
  if (decision === "save") {
    return mode === "active" ? "written" : "skipped_shadow";
  }
  if (decision === "duplicate_skip") return "skipped_duplicate";
  if (decision.startsWith("conflict_propose_")) return "skipped_conflict";
  if (decision === "unclassified_pending") return "skipped_unclassified";
  return "skipped_shadow";
}

function buildClassifiedTrace(
  assembled: string,
  rawLine: string,
  repairedLine: string | undefined,
  repaired: boolean,
  lensId: string,
  decision: ClassifiedItemTrace["decision"],
  reason: string,
  writePaths: ReturnType<typeof resolveWritePaths>,
  mode: "shadow" | "active",
  persistenceResult: ClassifiedItemTrace["persistence_result"],
  modelId?: string,
  promptHash?: string,
  conflictKind?: ClassifiedItemTrace["conflict_kind"],
  matchedExistingLine?: string,
): ClassifiedItemTrace {
  const trace: ClassifiedItemTrace = {
    kind: "classified",
    lens_id: lensId,
    raw_line: rawLine,
    assembled_line: assembled,
    repaired,
    decision,
    reason,
    write_path:
      decision === "save" && mode === "active" ? writePaths.write_path : null,
    write_scope:
      decision === "save" && mode === "active" ? writePaths.write_scope : null,
    learning_id: null,
    persistence_result: persistenceResult,
    model_id: modelId ?? "none",
    prompt_hash: promptHash ?? "none",
  };
  if (repairedLine !== undefined) trace.repaired_line = repairedLine;
  if (conflictKind !== undefined) trace.conflict_kind = conflictKind;
  if (matchedExistingLine !== undefined) trace.matched_existing_line = matchedExistingLine;
  return trace;
}

// ---------------------------------------------------------------------------
// Baseline snapshot (CONS-4, R4-IA3)
// ---------------------------------------------------------------------------

interface BaselineSnapshot {
  captured_at: string;
  agents: {
    agent_id: string;
    file_paths: string[];
    item_count: number;
    content_hash: string;
  }[];
}

function captureBaselineSnapshot(
  agentIds: string[],
  projectRoot: string,
): BaselineSnapshot {
  const agents = agentIds.map((agentId) => {
    const wp = resolveWritePaths(agentId, projectRoot);
    let itemCount = 0;
    let contentForHash = "";

    for (const rp of wp.read_paths) {
      if (fs.existsSync(rp)) {
        const content = fs.readFileSync(rp, "utf8");
        contentForHash += content;
        const lines = content.split("\n");
        itemCount += lines.filter((l) => /^[-*+]\s+\[/.test(l.trim())).length;
      }
    }

    return {
      agent_id: agentId,
      file_paths: wp.read_paths,
      item_count: itemCount,
      content_hash: crypto
        .createHash("sha256")
        .update(contentForHash)
        .digest("hex")
        .slice(0, 16),
    };
  });

  return { captured_at: isoTimestamp(), agents };
}

// ---------------------------------------------------------------------------
// Load existing learning lines for dedup
// ---------------------------------------------------------------------------

function loadExistingLines(readPaths: string[]): string[] {
  const lines: string[] = [];
  for (const fp of readPaths) {
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (/^[-*+]\s+\[/.test(trimmed)) {
        lines.push(trimmed);
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runLearningExtraction(
  config: ExtractionConfig,
): Promise<ExtractionManifest> {
  const timestamp = isoTimestamp();
  const errors: string[] = [];
  const itemTraces: ExtractionItemTrace[] = [];
  const conflictProposals: ConflictProposal[] = [];
  const allMarkerTraces: MarkerTrace[] = [];

  // Collect unique agent IDs
  const agentIds = config.executionPlan.lens_prompt_packet_seats.map(
    (s) => s.lens_id,
  );

  // Baseline snapshot (R4-IA3: captured at extractor entry)
  try {
    const baseline = captureBaselineSnapshot(agentIds, config.projectRoot);
    const snapshotPath = path.join(
      config.sessionRoot,
      "execution-preparation",
      "learning-baseline-snapshot.yaml",
    );
    const snapshotDir = path.dirname(snapshotPath);
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify(baseline, null, 2),
      "utf8",
    );
  } catch (error) {
    errors.push(
      `Baseline snapshot failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Process each lens output
  for (const seat of config.executionPlan.lens_prompt_packet_seats) {
    const lensId = seat.lens_id;
    const outputPath = seat.output_path;

    try {
      if (!fs.existsSync(outputPath)) continue;
      const lensOutput = fs.readFileSync(outputPath, "utf8");

      // Parse ### Newly Learned section
      const rawLines = parseNewlyLearnedSection(lensOutput);

      // Resolve paths for this agent
      const writePaths = resolveWritePaths(lensId, config.projectRoot);
      const existingLines = loadExistingLines(writePaths.read_paths);

      // Process each raw learning line through the DAG
      for (const rawLine of rawLines) {
        try {
          const result = await processItem(
            rawLine,
            lensId,
            config,
            existingLines,
            writePaths,
          );
          itemTraces.push(result.trace);
          if (result.conflictProposal) {
            conflictProposals.push(result.conflictProposal);
          }

          // If saved in active mode, add to existing lines for subsequent dedup
          if (
            result.trace.kind === "classified" &&
            result.trace.persistence_result === "written"
          ) {
            existingLines.push(result.trace.assembled_line);
          }
        } catch (error) {
          errors.push(
            `[${lensId}] Item processing error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // C-11: Parse and process event markers
      const markers = parseEventMarkers(
        lensOutput,
        lensId,
        config.sessionId,
        isoDate(),
      );

      if (markers.length > 0) {
        const allLearningPaths = resolveWritePaths(
          lensId,
          config.projectRoot,
        ).read_paths;
        const markerTraces = matchMarkersToLearnings(markers, allLearningPaths);

        // Attach markers (active only, shadow skips writes)
        attachEventMarkers(markerTraces, config.mode);
        allMarkerTraces.push(...markerTraces);
      }
    } catch (error) {
      errors.push(
        `[${lensId}] Lens processing error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Quarantine file (for quarantined items)
  const quarantinedItems = itemTraces.filter(
    (t): t is QuarantinedItemTrace => t.kind === "quarantined",
  );
  if (quarantinedItems.length > 0) {
    try {
      const quarantinePath = path.join(
        config.sessionRoot,
        "execution-preparation",
        "learning-quarantine.yaml",
      );
      const quarantineDir = path.dirname(quarantinePath);
      if (!fs.existsSync(quarantineDir)) {
        fs.mkdirSync(quarantineDir, { recursive: true });
      }
      fs.writeFileSync(
        quarantinePath,
        JSON.stringify(quarantinedItems, null, 2),
        "utf8",
      );
    } catch (error) {
      errors.push(
        `Quarantine write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Build manifest
  const classifiedTraces = itemTraces.filter(
    (t): t is ClassifiedItemTrace => t.kind === "classified",
  );

  const manifest: ExtractionManifest = {
    schema_version: "1",
    session_id: config.sessionId,
    extract_mode: config.mode,
    taxonomy_version: "phase2-v1",
    timestamp,

    items_parsed: itemTraces.length,
    items_saved: classifiedTraces.filter(
      (t) => t.persistence_result === "written",
    ).length,
    items_quarantined: quarantinedItems.length,
    items_duplicate_skipped: classifiedTraces.filter(
      (t) => t.decision === "duplicate_skip",
    ).length,
    items_conflict_proposed: conflictProposals.length,
    items_unclassified_pending: classifiedTraces.filter(
      (t) => t.decision === "unclassified_pending",
    ).length,
    markers_found: allMarkerTraces.length,
    markers_attached: allMarkerTraces.filter(
      (t) => t.resolution === "attached",
    ).length,
    markers_unresolved: allMarkerTraces.filter(
      (t) =>
        t.resolution === "unresolved_no_id" ||
        t.resolution === "unresolved_not_found",
    ).length,

    item_traces: itemTraces,
    marker_traces: allMarkerTraces,
    conflict_proposals: conflictProposals,
    errors,
  };

  return manifest;
}
