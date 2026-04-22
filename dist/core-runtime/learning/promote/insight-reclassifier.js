/**
 * Phase 3 — Insight Reclassifier (Step 12 + follow-up apply path).
 *
 * Design authority:
 *   - learn-phase3-design-v2.md DD-9 (separate `onto reclassify-insights` command)
 *   - learn-phase3-design-v3.md DD-9 (collector mode + lineage)
 *   - learn-phase3-design-v4.md DD-9 (panel-reviewer reuse, batch-size,
 *     resumable progress)
 *
 * Purpose:
 *   - Phase 1 era left ~462 global learnings tagged `[insight]`. Insight is
 *     an under-classified label meaning "we don't know if this is a guardrail,
 *     foundation, or convention". This command walks each insight item, calls
 *     the LLM, and records a recommended reclassification. A follow-up apply
 *     path rewrites the role tag in place.
 *
 * Why a separate command from `onto promote`:
 *   - Cost separation: 462 × 3 panel members ≈ 1,400 LLM calls. Running this
 *     on every promote pass would balloon cost.
 *   - Migration vs steady-state separation: this is a one-shot cleanup that
 *     ideally finishes once and never runs again. Promote is a recurring
 *     workflow.
 *   - Audit trail isolation: insights reclassified here are tracked
 *     independently of promote outcomes so a reclassification regret can be
 *     undone without rolling back unrelated promotions.
 *
 * Phase A (analyze) vs Phase B (apply) split mirrors promote:
 *   - runInsightReclassifier is Phase A: classify and write report JSON.
 *   - applyInsightReclassifications is Phase B: read report JSON, rewrite
 *     the `[insight]` role tag to the proposed role in place, and record
 *     which entries were applied / skipped / failed.
 *
 * Apply semantics (Phase B):
 *   - Idempotent: each report entry carries the raw_line captured at classify
 *     time. At apply time we look up the line in the file by literal match.
 *     If the original line is gone (file was already rewritten or edited),
 *     the entry is recorded as "skipped_already_applied" rather than failing.
 *   - Three target forms:
 *       guardrail / foundation / convention → replace [insight] with [{role}]
 *       drop_role                           → remove the [insight] bracket
 *   - Skips entries without a proposed_role (kept as unclassified_pending in
 *     the Phase A output).
 *
 * Failure model:
 *   - Classify LLM unreachable: item is left unclassified, recorded as
 *     `unclassified_pending`. The operator re-runs after fixing API access.
 *   - Classify returns unrecognized role: skipped with error.
 *   - Apply target file missing: applyResult.failed entry with reason.
 */
import fs from "node:fs";
import path from "node:path";
import { callLlm, hashPrompt } from "../shared/llm-caller.js";
import { collect } from "./collector.js";
// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const RECLASSIFY_SYSTEM_PROMPT = `You are reclassifying [insight]-tagged learnings into one of three concrete role categories.

Output ONE JSON object:
{
  "proposed_role": "guardrail" | "foundation" | "convention" | "drop_role",
  "reason": "<one sentence explaining the choice>"
}

Definitions (learning-rules.md):
  - guardrail: situational warning with corrective action (Situation + Result + Corrective action)
  - foundation: reusable structural fact that other reasoning depends on
  - convention: formatting/naming/process rule the team follows
  - drop_role: the item is too vague or context-specific to fit any of the above —
    drop the role tag entirely

NO markdown fences, JSON only.`;
function buildReclassifyUserPrompt(item) {
    return [
        `Agent: ${item.agent_id}`,
        `Tags: [${item.applicability_tags.join(" ")}]`,
        `Type: ${item.type}`,
        `Source: ${item.source_project ?? "?"} / ${item.source_domain ?? "?"} / ${item.source_date ?? "?"}`,
        "",
        "Content:",
        item.content,
        "",
        'Respond with {"proposed_role": "...", "reason": "..."}.',
    ].join("\n");
}
const VALID_ROLES = [
    "guardrail",
    "foundation",
    "convention",
    "drop_role",
];
async function attemptClassify(item, modelId, retryFeedback) {
    let userPrompt = buildReclassifyUserPrompt(item);
    if (retryFeedback) {
        userPrompt +=
            `\n\nPrevious attempt was rejected: ${retryFeedback}\n` +
                `Fix the issue and respond again.`;
    }
    let llmText;
    let llmModelId;
    try {
        const result = await callLlm(RECLASSIFY_SYSTEM_PROMPT, userPrompt, {
            max_tokens: 512,
            ...(modelId ? { model_id: modelId } : {}),
        });
        llmText = result.text;
        llmModelId = result.model_id;
    }
    catch (error) {
        return {
            ok: false,
            kind: "provider_error",
            reason: `LLM unreachable: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
    let parsed;
    try {
        let cleaned = llmText.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
        }
        parsed = JSON.parse(cleaned);
    }
    catch (error) {
        return {
            ok: false,
            kind: "validation_error",
            reason: `malformed LLM JSON: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
    const role = parsed.proposed_role;
    if (!VALID_ROLES.includes(role)) {
        return {
            ok: false,
            kind: "validation_error",
            reason: `invalid proposed_role "${String(parsed.proposed_role)}"`,
        };
    }
    return {
        ok: true,
        role,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
        modelId: llmModelId,
    };
}
async function classifyOne(item, modelId) {
    // 1 retry on validation_error (malformed JSON or invalid role enum).
    // Provider errors (network, auth) skip the retry — they're not the
    // model's fault and retry won't help.
    let llmCalls = 0;
    const first = await attemptClassify(item, modelId);
    llmCalls += 1;
    let final = first;
    if (!first.ok && first.kind === "validation_error") {
        const second = await attemptClassify(item, modelId, first.reason);
        llmCalls += 1;
        final = second;
    }
    if (!final.ok) {
        return { ok: false, reason: final.reason, llmCalls };
    }
    const userPrompt = buildReclassifyUserPrompt(item);
    return {
        ok: true,
        llmCalls,
        reclassification: {
            agent_id: item.agent_id,
            source_path: item.source_path,
            line_number: item.line_number,
            raw_line: item.raw_line,
            current_role: item.role,
            proposed_role: final.role,
            reason: final.reason,
            llm_model_id: final.modelId,
            llm_prompt_hash: hashPrompt(RECLASSIFY_SYSTEM_PROMPT + "\n" + userPrompt),
        },
    };
}
// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
/**
 * Run the reclassifier in analyze mode.
 *
 * Output is written to `<sessionRoot>/insight-reclassification-report.json`
 * (unless dryRun). The apply phase (Phase B) is implemented in this same
 * module as applyInsightReclassifications — it reads the report JSON and
 * rewrites role tags in place. Originally planned to reuse Phase B's
 * axis_tag_change applicator via promote-executor, but the standalone
 * function path is simpler because single-line role rewrites don't need
 * the full PromoteReport + PromoteDecisions infrastructure.
 */
export async function runInsightReclassifier(config) {
    const sessionRoot = path.join(config.projectRoot, ".onto", "sessions", "reclassify-insights", config.sessionId);
    fs.mkdirSync(sessionRoot, { recursive: true });
    // Use the collector in reclassify-insights mode so candidate_items is
    // pre-filtered to global insight items per DD-18 §SST.
    const collection = collect({
        mode: "reclassify-insights",
        projectRoot: config.projectRoot,
    });
    let insights = collection.candidate_items;
    if (config.targetAgent) {
        insights = insights.filter((i) => i.agent_id === config.targetAgent);
    }
    if (config.batchSize !== undefined) {
        insights = insights.slice(0, config.batchSize);
    }
    const reclassified = [];
    const unclassified = [];
    let llmCalls = 0;
    if (config.dryRun) {
        return {
            session_id: config.sessionId,
            session_root: sessionRoot,
            total_insights: insights.length,
            reclassified: [],
            unclassified_pending: [],
            llm_calls: 0,
            dry_run: true,
        };
    }
    for (const item of insights) {
        const r = await classifyOne(item, config.modelId);
        llmCalls += r.llmCalls;
        if (r.ok) {
            reclassified.push(r.reclassification);
        }
        else {
            unclassified.push({ item, reason: r.reason });
        }
    }
    const report = {
        session_id: config.sessionId,
        generated_at: new Date().toISOString(),
        total_insights: insights.length,
        reclassified,
        unclassified_pending: unclassified.map((u) => ({
            agent_id: u.item.agent_id,
            source_path: u.item.source_path,
            line_number: u.item.line_number,
            reason: u.reason,
        })),
        llm_calls: llmCalls,
    };
    const reportPath = path.join(sessionRoot, "insight-reclassification-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    // ontoHome is currently unused but kept on the config so a follow-up Step
    // 13 patch can wire it through to the global learning file path resolver
    // when the apply phase lands.
    void config.ontoHome;
    return {
        session_id: config.sessionId,
        session_root: sessionRoot,
        total_insights: insights.length,
        reclassified,
        unclassified_pending: unclassified,
        llm_calls: llmCalls,
        dry_run: false,
    };
}
/**
 * Rewrite a single raw learning line, replacing the `[insight]` role
 * bracket with the proposed role (or removing the bracket for drop_role).
 *
 * Returns null when the raw line does not contain an `[insight]` bracket
 * at all — the caller should treat this as "already applied" to stay
 * idempotent. Production usage is that the current_role was "insight" at
 * classify time, so the bracket should exist unless a previous apply ran.
 */
export function rewriteInsightRoleTag(rawLine, proposedRole) {
    const bracket = "[insight]";
    if (!rawLine.includes(bracket))
        return null;
    if (proposedRole === "drop_role") {
        // Remove the bracket plus one adjacent space so we don't leave a
        // double-space in the output. Try trailing space first, then leading.
        if (rawLine.includes(`${bracket} `)) {
            return rawLine.replace(`${bracket} `, "");
        }
        if (rawLine.includes(` ${bracket}`)) {
            return rawLine.replace(` ${bracket}`, "");
        }
        return rawLine.replace(bracket, "");
    }
    return rawLine.replace(bracket, `[${proposedRole}]`);
}
function resolveAnchor(fileLines, rec) {
    const preRewrite = rec.raw_line;
    const postRewrite = rec.proposed_role !== null
        ? rewriteInsightRoleTag(preRewrite, rec.proposed_role)
        : null;
    // Anchor #1: the 1-indexed line_number pointer.
    const anchoredIdx = rec.line_number - 1;
    if (anchoredIdx >= 0 && anchoredIdx < fileLines.length) {
        const candidate = fileLines[anchoredIdx];
        if (candidate === preRewrite) {
            return {
                kind: "match_original",
                lineIndex: anchoredIdx,
                anchor: "line_number_and_raw_line",
            };
        }
        if (postRewrite !== null && candidate === postRewrite) {
            return {
                kind: "already_rewritten",
                lineIndex: anchoredIdx,
                anchor: "line_number_only",
            };
        }
    }
    // Anchor #2: verbatim raw_line scan fallback. Must be UNAMBIGUOUS.
    let firstMatch = -1;
    let matchCount = 0;
    for (let i = 0; i < fileLines.length; i++) {
        if (fileLines[i] === preRewrite) {
            if (firstMatch === -1)
                firstMatch = i;
            matchCount += 1;
            if (matchCount > 1)
                break;
        }
    }
    if (matchCount === 1 && firstMatch !== -1) {
        return {
            kind: "verbatim_fallback",
            lineIndex: firstMatch,
            anchor: "raw_line_scan",
        };
    }
    if (matchCount > 1) {
        return { kind: "ambiguous_raw_line", lineIndex: null, anchor: "none" };
    }
    // No anchor hit. File has drifted out from under the report.
    return { kind: "drift", lineIndex: null, anchor: "none" };
}
/**
 * Apply a reclassification report to the on-disk learning files.
 *
 * Reads the JSON report, walks each reclassification entry, resolves
 * the target line via line_number + raw_line anchors (see resolveAnchor),
 * and rewrites the `[insight]` role tag in the source file.
 *
 * Evidence-based idempotency (C3 + CC1):
 *   - applied / would_apply — original raw_line was located and rewritten
 *     (or would have been in dry-run)
 *   - skipped_already_applied — the proposed rewrite is already present at
 *     the recorded line_number (not just "line not found")
 *   - skipped_source_drift — neither original nor rewritten form matched.
 *     Operator must re-classify to resync.
 *
 * Atomicity: writes are per-file. Write failures roll back every applied
 * entry for that file. Dry-run never writes.
 */
export function applyInsightReclassifications(config) {
    const reportPath = config.reportPath;
    if (!fs.existsSync(reportPath)) {
        throw new Error(`Insight reclassification report not found: ${reportPath}`);
    }
    const raw = fs.readFileSync(reportPath, "utf8");
    const report = JSON.parse(raw);
    const reclassified = report.reclassified ?? [];
    const dryRun = config.dryRun === true;
    const entries = [];
    let applied = 0;
    let wouldApply = 0;
    let skippedNoProposal = 0;
    let skippedAlreadyApplied = 0;
    let skippedSourceDrift = 0;
    let failed = 0;
    // Group by source_path so we load each file at most once per run.
    const byFile = new Map();
    for (const r of reclassified) {
        const bucket = byFile.get(r.source_path);
        if (bucket)
            bucket.push(r);
        else
            byFile.set(r.source_path, [r]);
    }
    for (const [filePath, items] of byFile) {
        let fileLines = null;
        if (fs.existsSync(filePath)) {
            fileLines = fs.readFileSync(filePath, "utf8").split("\n");
        }
        for (const r of items) {
            if (r.proposed_role === null) {
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: null,
                    outcome: "skipped_no_proposal",
                    anchor_resolution: "none",
                    new_line: null,
                    error_message: null,
                });
                skippedNoProposal += 1;
                continue;
            }
            if (fileLines === null) {
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: r.proposed_role,
                    outcome: "failed",
                    anchor_resolution: "none",
                    new_line: null,
                    error_message: `source file not found: ${filePath}`,
                });
                failed += 1;
                continue;
            }
            const resolution = resolveAnchor(fileLines, r);
            // Already-rewritten: evidence-based idempotency success
            if (resolution.kind === "already_rewritten") {
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: r.proposed_role,
                    outcome: "skipped_already_applied",
                    anchor_resolution: resolution.anchor,
                    new_line: null,
                    error_message: null,
                });
                skippedAlreadyApplied += 1;
                continue;
            }
            // Drift or ambiguous: fail safe
            if (resolution.kind === "drift" ||
                resolution.kind === "ambiguous_raw_line") {
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: r.proposed_role,
                    outcome: "skipped_source_drift",
                    anchor_resolution: resolution.anchor,
                    new_line: null,
                    error_message: resolution.kind === "ambiguous_raw_line"
                        ? "multiple verbatim matches for raw_line (line_number drifted)"
                        : "neither line_number anchor nor verbatim raw_line matched",
                });
                skippedSourceDrift += 1;
                continue;
            }
            // Match confirmed — compute the rewrite
            const lineIdx = resolution.lineIndex;
            const newLine = rewriteInsightRoleTag(r.raw_line, r.proposed_role);
            if (newLine === null) {
                // raw_line has no [insight] bracket. The anchor matched so we
                // know this is the right line but the rewrite is a no-op —
                // treat as already applied for safety.
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: r.proposed_role,
                    outcome: "skipped_already_applied",
                    anchor_resolution: resolution.anchor,
                    new_line: null,
                    error_message: null,
                });
                skippedAlreadyApplied += 1;
                continue;
            }
            if (dryRun) {
                // Do NOT mutate fileLines in dry-run. Record preview only.
                entries.push({
                    agent_id: r.agent_id,
                    source_path: r.source_path,
                    line_number: r.line_number,
                    raw_line: r.raw_line,
                    current_role: r.current_role,
                    proposed_role: r.proposed_role,
                    outcome: "would_apply",
                    anchor_resolution: resolution.anchor,
                    new_line: newLine,
                    error_message: null,
                });
                wouldApply += 1;
                continue;
            }
            // Real apply
            fileLines[lineIdx] = newLine;
            entries.push({
                agent_id: r.agent_id,
                source_path: r.source_path,
                line_number: r.line_number,
                raw_line: r.raw_line,
                current_role: r.current_role,
                proposed_role: r.proposed_role,
                outcome: "applied",
                anchor_resolution: resolution.anchor,
                new_line: newLine,
                error_message: null,
            });
            applied += 1;
        }
        // Flush the file if any line was mutated AND we're not in dry-run.
        if (!dryRun &&
            fileLines !== null &&
            entries.some((e) => e.source_path === filePath && e.outcome === "applied")) {
            try {
                fs.writeFileSync(filePath, fileLines.join("\n"), "utf8");
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                for (const e of entries) {
                    if (e.source_path === filePath && e.outcome === "applied") {
                        e.outcome = "failed";
                        e.error_message = `write failed: ${message}`;
                        applied -= 1;
                        failed += 1;
                    }
                }
            }
        }
    }
    return {
        report_path: reportPath,
        report_generated_at: typeof report.generated_at === "string" ? report.generated_at : null,
        total_entries: reclassified.length,
        applied,
        would_apply: wouldApply,
        skipped_no_proposal: skippedNoProposal,
        skipped_already_applied: skippedAlreadyApplied,
        skipped_source_drift: skippedSourceDrift,
        failed,
        entries,
        dry_run: dryRun,
    };
}
