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
 *
 * Phase 2 scope: append-only extraction. A-12r (conflict replace) and
 * A-12rej (conflict reject) are intentionally deferred to Phase 3 promote
 * per R1-U1 design decision. Conflict items are recorded in manifest
 * ConflictProposal[] but NOT executed against live storage.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TAG_PATTERN, GUARDRAIL_PATTERN, RAW_LLM_LINE_RE, NEWLY_LEARNED_HEADER_RE, } from "./shared/patterns.js";
import { resolveWritePaths } from "./shared/paths.js";
import { extractContent, isContentDuplicate } from "./shared/duplicate-check.js";
import { classifyLearningItem } from "./shared/semantic-classifier.js";
import { callLlm } from "./shared/llm-caller.js";
import { parseEventMarkers, matchMarkersToLearnings, attachEventMarkers, } from "./feedback.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateLearningId(content) {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}
function isoDate() {
    return new Date().toISOString().slice(0, 10);
}
function isoTimestamp() {
    return new Date().toISOString();
}
/**
 * A-7: Assemble source metadata and produce full §1.3 line.
 */
function assembleSourceMetadata(rawLine, projectRoot, sessionDomain) {
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
function parseNewlyLearnedSection(lensOutput) {
    const headerMatch = lensOutput.match(NEWLY_LEARNED_HEADER_RE);
    if (!headerMatch)
        return [];
    const sectionStart = headerMatch.index + headerMatch[0].length;
    const rest = lensOutput.slice(sectionStart);
    // Section ends at the next heading or end of string
    const nextHeadingMatch = rest.match(/\n##[#]?\s/);
    const sectionText = nextHeadingMatch
        ? rest.slice(0, nextHeadingMatch.index)
        : rest;
    const lines = sectionText.split("\n");
    const rawLines = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (/^[-*+]\s+none\s*$/i.test(trimmed))
            continue;
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
async function repairTagFormat(rawLine, failureReason) {
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
        if (RAW_LLM_LINE_RE.test(repaired))
            return repaired;
        return null;
    }
    catch {
        return null;
    }
}
async function repairGuardrailFormat(rawLine) {
    try {
        const userPrompt = `Original line: ${rawLine}

This is a [guardrail] learning item but it's missing the required three elements.
Required: **Situation**: ... **Result**: ... **Corrective action**: ...
Add the missing elements to the content. Return ONLY the corrected line.`;
        const result = await callLlm(REPAIR_SYSTEM_PROMPT, userPrompt, {
            max_tokens: 512,
        });
        const repaired = result.text.trim();
        if (GUARDRAIL_PATTERN.test(repaired))
            return repaired;
        return null;
    }
    catch {
        return null;
    }
}
// ---------------------------------------------------------------------------
// Per-item pipeline
// ---------------------------------------------------------------------------
async function processItem(rawLine, lensId, config, existingLines, writePaths) {
    // A-7: Assemble source metadata
    const assembled = assembleSourceMetadata(rawLine, config.projectRoot, config.sessionDomain);
    // A-8: TAG_PATTERN validation
    if (!TAG_PATTERN.test(assembled)) {
        // A-8f: Repair attempt (1x)
        const repaired = await repairTagFormat(rawLine, "TAG_PATTERN validation failed");
        if (repaired) {
            const repairedAssembled = assembleSourceMetadata(repaired, config.projectRoot, config.sessionDomain);
            if (TAG_PATTERN.test(repairedAssembled)) {
                // Repaired — continue with repaired line
                return processValidatedItem(repairedAssembled, rawLine, repaired, true, lensId, config, existingLines, writePaths);
            }
        }
        // A-8f2: Quarantine
        const q8Trace = {
            kind: "quarantined",
            lens_id: lensId,
            raw_line: rawLine,
            assembled_line: assembled,
            failure_stage: repaired ? "A-8f" : "A-8",
            failure_reason: "TAG_PATTERN validation failed after repair attempt",
        };
        if (repaired)
            q8Trace.repaired_line = repaired;
        return { trace: q8Trace };
    }
    return processValidatedItem(assembled, rawLine, undefined, false, lensId, config, existingLines, writePaths);
}
async function processValidatedItem(assembled, rawLine, repairedLine, repaired, lensId, config, existingLines, writePaths) {
    // A-9: GUARDRAIL_PATTERN check (guardrail only)
    const hasGuardrail = /\[guardrail\]/.test(assembled);
    if (hasGuardrail && !GUARDRAIL_PATTERN.test(assembled)) {
        // A-9f: Repair attempt (1x)
        const guardrailRepaired = await repairGuardrailFormat(rawLine);
        if (guardrailRepaired) {
            const grAssembled = assembleSourceMetadata(guardrailRepaired, config.projectRoot, config.sessionDomain);
            if (TAG_PATTERN.test(grAssembled) && GUARDRAIL_PATTERN.test(grAssembled)) {
                return processClassifiedItem(grAssembled, rawLine, guardrailRepaired, true, lensId, config, existingLines, writePaths);
            }
        }
        // A-9f2: Quarantine
        const q9Trace = {
            kind: "quarantined",
            lens_id: lensId,
            raw_line: rawLine,
            assembled_line: assembled,
            failure_stage: guardrailRepaired ? "A-9f" : "A-9",
            failure_reason: "GUARDRAIL_PATTERN validation failed after repair attempt",
        };
        if (guardrailRepaired)
            q9Trace.repaired_line = guardrailRepaired;
        return { trace: q9Trace };
    }
    return processClassifiedItem(assembled, rawLine, repairedLine, repaired, lensId, config, existingLines, writePaths);
}
async function processClassifiedItem(assembled, rawLine, repairedLine, repaired, lensId, config, existingLines, writePaths) {
    // A-10: Content-level dedup
    const content = extractContent(assembled);
    if (content && isContentDuplicate(content, existingLines)) {
        return {
            trace: buildClassifiedTrace({
                assembled, rawLine, repaired, lensId,
                decision: "duplicate_skip",
                reason: "Exact content match with existing item.",
                writePaths, mode: config.mode,
                ...(repairedLine !== undefined ? { repairedLine } : {}),
            }),
        };
    }
    // A-11: Semantic classification
    const classification = await classifyLearningItem(assembled, existingLines);
    const decision = classification.decision;
    // Build trace base
    const traceCtx = {
        assembled, rawLine, repaired, lensId,
        decision,
        reason: classification.reason,
        writePaths, mode: config.mode,
        modelId: classification.model_id,
        promptHash: classification.prompt_hash,
    };
    if (repairedLine !== undefined)
        traceCtx.repairedLine = repairedLine;
    if (classification.conflict_kind)
        traceCtx.conflictKind = classification.conflict_kind;
    if (classification.matched_existing_line)
        traceCtx.matchedExistingLine = classification.matched_existing_line;
    const trace = buildClassifiedTrace(traceCtx);
    let conflictProposal;
    if (decision === "conflict_propose_replace" ||
        decision === "conflict_propose_keep" ||
        decision === "conflict_propose_coexist") {
        conflictProposal = {
            lens_id: lensId,
            new_item_line: assembled,
            matched_existing_line: classification.matched_existing_line ?? "",
            decision,
            conflict_kind: classification.conflict_kind,
            reason: classification.reason,
        };
    }
    // A-13 + A-14: Write (save + active only)
    if (decision === "save" && config.mode === "active") {
        const learningId = generateLearningId(assembled);
        const lineWithId = `${assembled}\n<!-- learning_id: ${learningId} taxonomy_version: phase2-v1 -->`;
        try {
            // Ensure directory exists
            const dir = path.dirname(writePaths.write_path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Ensure format_version marker exists
            if (!fs.existsSync(writePaths.write_path)) {
                fs.writeFileSync(writePaths.write_path, `<!-- format_version: 1 -->\n`, "utf8");
            }
            // Concurrency contract: single session writes to each agent file at a time.
            // Concurrent sessions writing to the same agent file are not supported.
            fs.appendFileSync(writePaths.write_path, `${lineWithId}\n`, "utf8");
            trace.learning_id = learningId;
            trace.persistence_result = "written";
        }
        catch (error) {
            trace.persistence_result = "write_error";
            trace.write_error =
                error instanceof Error ? error.message : String(error);
        }
    }
    const result = { trace };
    if (conflictProposal)
        result.conflictProposal = conflictProposal;
    return result;
}
function getPersistenceResult(decision, mode) {
    switch (decision) {
        case "save":
            return mode === "active" ? "written" : "skipped_shadow";
        case "duplicate_skip":
            return "skipped_duplicate";
        case "conflict_propose_replace":
        case "conflict_propose_keep":
        case "conflict_propose_coexist":
            return "skipped_conflict";
        case "unclassified_pending":
            return "skipped_unclassified";
        default: {
            const _exhaustive = decision;
            return "skipped_shadow";
        }
    }
}
function buildClassifiedTrace(ctx) {
    const trace = {
        kind: "classified",
        lens_id: ctx.lensId,
        raw_line: ctx.rawLine,
        assembled_line: ctx.assembled,
        repaired: ctx.repaired,
        decision: ctx.decision,
        reason: ctx.reason,
        write_path: ctx.decision === "save" && ctx.mode === "active" ? ctx.writePaths.write_path : null,
        write_scope: ctx.decision === "save" && ctx.mode === "active" ? ctx.writePaths.write_scope : null,
        learning_id: null,
        persistence_result: getPersistenceResult(ctx.decision, ctx.mode),
        model_id: ctx.modelId ?? "none",
        prompt_hash: ctx.promptHash ?? "none",
    };
    if (ctx.repairedLine !== undefined)
        trace.repaired_line = ctx.repairedLine;
    if (ctx.conflictKind !== undefined)
        trace.conflict_kind = ctx.conflictKind;
    if (ctx.matchedExistingLine !== undefined)
        trace.matched_existing_line = ctx.matchedExistingLine;
    return trace;
}
function captureBaselineSnapshot(agentIds, projectRoot) {
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
function loadExistingLines(readPaths) {
    const lines = [];
    for (const fp of readPaths) {
        if (!fs.existsSync(fp))
            continue;
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
export async function runLearningExtraction(config) {
    const timestamp = isoTimestamp();
    const errors = [];
    const itemTraces = [];
    const conflictProposals = [];
    const allMarkerTraces = [];
    // Collect unique agent IDs
    const agentIds = config.executionPlan.lens_prompt_packet_seats.map((s) => s.lens_id);
    // Baseline snapshot (R4-IA3: captured at extractor entry)
    try {
        const baseline = captureBaselineSnapshot(agentIds, config.projectRoot);
        const snapshotPath = path.join(config.sessionRoot, "execution-preparation", "learning-baseline-snapshot.yaml");
        const snapshotDir = path.dirname(snapshotPath);
        if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
        }
        fs.writeFileSync(snapshotPath, JSON.stringify(baseline, null, 2), "utf8");
    }
    catch (error) {
        errors.push(`Baseline snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Process each lens output
    for (const seat of config.executionPlan.lens_prompt_packet_seats) {
        const lensId = seat.lens_id;
        const outputPath = seat.output_path;
        try {
            if (!fs.existsSync(outputPath))
                continue;
            const lensOutput = fs.readFileSync(outputPath, "utf8");
            // Parse ### Newly Learned section
            const rawLines = parseNewlyLearnedSection(lensOutput);
            // Resolve paths for this agent
            const writePaths = resolveWritePaths(lensId, config.projectRoot);
            const existingLines = loadExistingLines(writePaths.read_paths);
            // Process each raw learning line through the DAG
            for (const rawLine of rawLines) {
                try {
                    const result = await processItem(rawLine, lensId, config, existingLines, writePaths);
                    itemTraces.push(result.trace);
                    if (result.conflictProposal) {
                        conflictProposals.push(result.conflictProposal);
                    }
                    // If saved in active mode, add to existing lines for subsequent dedup
                    if (result.trace.kind === "classified" &&
                        result.trace.persistence_result === "written") {
                        existingLines.push(result.trace.assembled_line);
                    }
                }
                catch (error) {
                    errors.push(`[${lensId}] Item processing error: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            // C-11: Parse and process event markers
            const markers = parseEventMarkers(lensOutput, lensId, config.sessionId, isoDate());
            if (markers.length > 0) {
                const allLearningPaths = resolveWritePaths(lensId, config.projectRoot).read_paths;
                const markerTraces = matchMarkersToLearnings(markers, allLearningPaths);
                // Attach markers (active only, shadow skips writes)
                attachEventMarkers(markerTraces, config.mode);
                allMarkerTraces.push(...markerTraces);
            }
        }
        catch (error) {
            errors.push(`[${lensId}] Lens processing error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Build classified traces early (needed by quarantine + manifest)
    const classifiedTraces = itemTraces.filter((t) => t.kind === "classified");
    // Quarantine file (for quarantined items + unclassified_pending — REC-4)
    const quarantinedItems = itemTraces.filter((t) => t.kind === "quarantined");
    const unclassifiedItems = classifiedTraces.filter((t) => t.decision === "unclassified_pending");
    const allQuarantineItems = [...quarantinedItems, ...unclassifiedItems];
    if (allQuarantineItems.length > 0) {
        try {
            const quarantinePath = path.join(config.sessionRoot, "execution-preparation", "learning-quarantine.yaml");
            const quarantineDir = path.dirname(quarantinePath);
            if (!fs.existsSync(quarantineDir)) {
                fs.mkdirSync(quarantineDir, { recursive: true });
            }
            fs.writeFileSync(quarantinePath, JSON.stringify(allQuarantineItems, null, 2), "utf8");
        }
        catch (error) {
            errors.push(`Quarantine write failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Build manifest
    const manifest = {
        schema_version: "1",
        session_id: config.sessionId,
        extract_mode: config.mode,
        taxonomy_version: "phase2-v1",
        timestamp,
        items_parsed: itemTraces.length,
        items_saved: classifiedTraces.filter((t) => t.persistence_result === "written").length,
        items_quarantined: quarantinedItems.length,
        items_duplicate_skipped: classifiedTraces.filter((t) => t.decision === "duplicate_skip").length,
        items_conflict_proposed: conflictProposals.length,
        items_unclassified_pending: classifiedTraces.filter((t) => t.decision === "unclassified_pending").length,
        markers_found: allMarkerTraces.length,
        markers_attached: allMarkerTraces.filter((t) => t.resolution === "attached").length,
        markers_skipped_shadow: allMarkerTraces.filter((t) => t.resolution === "skipped_shadow").length,
        markers_unresolved: allMarkerTraces.filter((t) => t.resolution === "unresolved_no_id" ||
            t.resolution === "unresolved_not_found").length,
        item_traces: itemTraces,
        marker_traces: allMarkerTraces,
        conflict_proposals: conflictProposals,
        errors,
    };
    return manifest;
}
