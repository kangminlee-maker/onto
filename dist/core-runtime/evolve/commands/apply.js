/**
 * /apply command orchestration.
 *
 * State-dependent behavior:
 * - compiled → apply.started (start applying delta-set)
 * - compiled → apply.completed (delta-set applied successfully)
 * - compiled → apply.decision_gap_found (edge case found during apply → constraints_resolved)
 * - applied → validation.started (begin validation)
 * - applied → validation.completed (validate() + record result)
 *
 * Apply and validation are agent-driven.
 * This module provides the event recording orchestration.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { contentHash } from "../../scope-runtime/hash.js";
import { wrapGateError } from "./error-messages.js";
import { refreshScopeMd, slugifyTitle } from "./shared.js";
import { validate } from "../adapters/code-product/validators/validate.js";
import { loadProjectConfig } from "../config/project-config.js";
// ─── Main ───
export function executeApply(paths, action, options) {
    switch (action.type) {
        case "start_apply":
            return handleStartApply(paths, action, options?.projectRoot);
        case "complete_apply":
            return handleCompleteApply(paths, action);
        case "report_gap":
            return handleReportGap(paths, action);
        case "start_validation":
            return handleStartValidation(paths, action);
        case "complete_validation":
            return handleCompleteValidation(paths, action);
        case "commit_design_doc":
            return handleCommitDesignDoc(paths, action, options?.projectRoot ?? process.cwd());
    }
}
// ─── Action Handlers ───
// Note: apply.started is a self-transition (compiled → compiled).
// If the process is interrupted before complete_apply, this event can be
// re-recorded on resume without state corruption. Duplicate self-transitions are acceptable.
function handleStartApply(paths, action, projectRoot) {
    const config = projectRoot ? loadProjectConfig(projectRoot) : { default_sources: [] };
    const result = appendScopeEvent(paths, {
        type: "apply.started",
        actor: "agent",
        payload: { build_spec_hash: action.buildSpecHash },
    }, { apply_enabled: config.apply_enabled });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: result.next_state,
        message: "Apply가 시작되었습니다. delta-set의 변경 사항을 적용하세요.",
    };
}
function handleCompleteApply(paths, action) {
    const result = appendScopeEvent(paths, {
        type: "apply.completed",
        actor: "agent",
        payload: { result: action.result },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: result.next_state,
        message: "구현이 완료되었습니다. validation을 시작하세요.",
    };
}
function handleReportGap(paths, action) {
    // 1. constraint.discovered 먼저 기록 (참조 무결성)
    const discoverResult = appendScopeEvent(paths, {
        type: "constraint.discovered",
        actor: "system",
        payload: action.constraintPayload,
    });
    if (!discoverResult.success)
        return { success: false, reason: wrapGateError(discoverResult.reason) };
    // 2. apply.decision_gap_found 기록 → constraints_resolved로 역전이
    const gapResult = appendScopeEvent(paths, {
        type: "apply.decision_gap_found",
        actor: "agent",
        payload: action.gapPayload,
    });
    if (!gapResult.success)
        return { success: false, reason: wrapGateError(gapResult.reason) };
    refreshScopeMd(paths, gapResult.state);
    return {
        success: true,
        nextState: gapResult.next_state,
        message: `Gap이 발견되었습니다 (${action.gapPayload.new_constraint_id}). Draft에서 재결정 후 재compile이 필요합니다.`,
    };
}
// Note: validation.started is a self-transition (applied → applied).
// Same resilience pattern as apply.started above.
function handleStartValidation(paths, action) {
    const result = appendScopeEvent(paths, {
        type: "validation.started",
        actor: "agent",
        payload: { validation_plan_hash: action.validationPlanHash },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: result.next_state,
        message: "Validation이 시작되었습니다. 각 VAL 항목을 검증하세요.",
    };
}
function handleCompleteValidation(paths, action) {
    // 1. validate() 순수 함수 호출
    const state = reduce(readEvents(paths.events));
    const validateOutput = validate({
        state,
        plan: action.plan,
        results: action.results,
        actualPlanHash: action.actualPlanHash,
    });
    if (!validateOutput.success) {
        return { success: false, reason: wrapGateError(validateOutput.reason) };
    }
    // 2. validation.completed 이벤트 기록
    const result = appendScopeEvent(paths, {
        type: "validation.completed",
        actor: "agent",
        payload: {
            result: validateOutput.result,
            pass_count: validateOutput.pass_count,
            fail_count: validateOutput.fail_count,
            items: validateOutput.items,
        },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    if (validateOutput.result === "pass") {
        return {
            success: true,
            nextState: result.next_state,
            message: "모든 검증이 통과했습니다. 결과를 확인하시고, 종료하려면 '완료'라고 말씀해 주세요.",
            data: {
                result: validateOutput.result,
                pass_count: validateOutput.pass_count,
                fail_count: validateOutput.fail_count,
            },
        };
    }
    return {
        success: true,
        nextState: result.next_state,
        message: `검증 실패: ${validateOutput.fail_count}건. 해당 constraint에 대해 재결정이 필요합니다.`,
        data: {
            result: validateOutput.result,
            pass_count: validateOutput.pass_count,
            fail_count: validateOutput.fail_count,
        },
    };
}
// post-PR #246 R1 (Phase B Step 4 + 9/9 lens consensus 4 fix-up):
// process mode 의 apply 분기.
//
// Lifecycle ordering (CONS-1):
//   1. validate (entry_mode + state + surface_path 존재)
//   2. emit apply.started — durable evidence 가 *side effect 보다 먼저*. side
//      effect 후 ledger append 가 실패해도 apply.started 는 이미 기록되어 있어
//      재진입 시 apply_started_pending=true 로 진단 가능.
//   3. write dest file (source 는 보존 — rollback 용)
//   4. git add + git commit (real git always — skipGit 같은 escape hatch 없음)
//   5. on commit failure: rollback dest, return failure (apply.started 는
//      ledger 에 남음. caller 가 재시도 시 self-transition 이라 무해, 또는
//      backward redirect 이벤트로 lifecycle reset 가능)
//   6. unlink source (commit 후에만 안전)
//   7. optional push + gh pr create (실패 시 warning, commit 은 보존)
//   8. emit apply.completed with structured process_artifact payload
//
// Surface identity (CONS-4): hard-coded `design-doc-draft.md` 대신 confirmed
//   surface_path 를 state 에서 읽음.
//
// Slug SSOT (CONS-2): destination filename 은 항상 state.title 에서 derive —
//   `--slug` 같은 override 없음. functional_area (frontmatter) 와 destination
//   filename 이 동일 helper (slugifyTitle) 로 produce 되어 drift 불가능.
//
// Escape hatches (CONS-3): skipGit / destinationDir 모두 제거. test 는
//   `git init` 으로 격리된 tmp repo 를 만들어 사용.
//
// design 문서 출처: development-records/evolve/20260425-evolve-planning-extension.md §3.4
function handleCommitDesignDoc(paths, action, projectRoot) {
    const events = readEvents(paths.events);
    const state = reduce(events);
    // ── Step 1: precondition validation ──
    if (state.entry_mode !== "process") {
        return {
            success: false,
            reason: `commit_design_doc 는 process entry mode 에서만 가능합니다. 현재 entry_mode=${state.entry_mode}.`,
        };
    }
    if (state.current_state !== "surface_confirmed") {
        return {
            success: false,
            reason: `commit_design_doc 는 surface_confirmed 상태에서만 가능합니다. 현재: ${state.current_state}.`,
        };
    }
    const sourcePath = state.surface_path;
    if (!sourcePath) {
        return {
            success: false,
            reason: "confirmed surface_path 가 state 에 없습니다. surface.confirmed 이벤트가 final_surface_path 와 함께 기록됐는지 확인하세요.",
        };
    }
    if (!existsSync(sourcePath)) {
        return {
            success: false,
            reason: `confirmed surface 파일이 존재하지 않습니다: ${sourcePath}. draft generate_surface → confirm_surface 흐름을 다시 확인하세요.`,
        };
    }
    const content = readFileSync(sourcePath, "utf-8");
    const sourceHash = contentHash(content);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const slug = slugifyTitle(state.title);
    const destDir = join(projectRoot, "development-records", "evolve");
    const destPath = join(destDir, `${today}-${slug}.md`);
    const relDestPath = relative(projectRoot, destPath);
    if (existsSync(destPath)) {
        return {
            success: false,
            reason: `대상 경로에 이미 파일이 존재합니다: ${relDestPath}. scope title 을 변경하거나 destination 을 비운 후 다시 시도하세요.`,
        };
    }
    // ── Step 2: emit apply.started BEFORE side effects (CONS-1 ordering) ──
    const startResult = appendScopeEvent(paths, {
        type: "apply.started",
        actor: "agent",
        // post-review fix-up (CONS-2): build_spec_hash 는 code-product 전용 의미.
        // process mode 는 build-spec 산출물이 없으므로 빈 문자열로 lineage 만 표기.
        // 실제 design-doc artifact metadata 는 apply.completed 의 process_artifact
        // 에서 구조화 payload 로 carry.
        payload: { build_spec_hash: "" },
    });
    if (!startResult.success)
        return { success: false, reason: wrapGateError(startResult.reason) };
    // ── Step 3-4: file move + path-bound git commit ──
    //
    // post-round 2 fix-up (UF-AX-1): `git commit -m '<msg>' -- <relDestPath>` 로
    // path-bind 하여 미리 staged 된 unrelated change 가 우리 commit 에 섞이지 않도록
    // 함. `git add <path>` + `git commit -- <path>` 조합은 *해당 path 만* commit
    // 으로 들어가는 것을 보장 (`-- <path>` 가 pathspec 으로 작동).
    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }
    writeFileSync(destPath, content, "utf-8");
    const commitMessage = action.commitMessage ?? `docs(evolve): ${state.title}`;
    let commitSha;
    try {
        execFileSync("git", ["add", relDestPath], { cwd: projectRoot, stdio: "pipe" });
        execFileSync("git", ["commit", "-m", commitMessage, "--", relDestPath], { cwd: projectRoot, stdio: "pipe" });
        commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: projectRoot,
            encoding: "utf-8",
        }).trim();
    }
    catch (err) {
        // git 실패 → dest 롤백, source 보존. apply.started 는 ledger 에 남으나
        // caller 가 재시도하면 새 apply.started 가 자기-전이로 추가되거나, 또는
        // 다른 backward 이벤트로 lifecycle 정리 가능.
        if (existsSync(destPath))
            unlinkSync(destPath);
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            reason: `git commit 실패: ${errMsg} (apply.started 는 ledger 에 기록됨 — 재시도 가능)`,
        };
    }
    // ── Step 5: optional push + PR ──
    let prUrl;
    let pushPrWarning;
    if (action.pushPr) {
        try {
            const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
                cwd: projectRoot,
                encoding: "utf-8",
            }).trim();
            execFileSync("git", ["push", "origin", branch], { cwd: projectRoot, stdio: "pipe" });
            const prTitle = action.prTitle ?? commitMessage;
            const prBody = action.prBody ?? `Auto-generated by onto evolve apply (process mode).\n\nScope: ${state.scope_id}\nTitle: ${state.title}`;
            const prResult = execFileSync("gh", ["pr", "create", "--title", prTitle, "--body", prBody], { cwd: projectRoot, encoding: "utf-8" });
            prUrl = prResult.trim();
        }
        catch (err) {
            // commit 은 이미 성공 — push/PR 실패는 warning. 사용자가 수동 진행 가능.
            const errMsg = err instanceof Error ? err.message : String(err);
            pushPrWarning = `push/PR 생성 실패 (commit 은 성공): ${errMsg}`;
        }
    }
    // ── Step 6: emit apply.completed with structured process_artifact ──
    //
    // post-round 2 fix-up (UF-CONC-1): result 는 process_artifact 의 stable summary
    // 로만 기능 — destination_path 의 중복 storage 방지. structured payload 가 SSOT.
    const processArtifact = {
        source_path: relative(projectRoot, sourcePath),
        source_hash: sourceHash,
        destination_path: relDestPath,
        destination_hash: sourceHash,
        commit_message: commitMessage,
        commit_sha: commitSha,
        ...(prUrl ? { pr_url: prUrl } : {}),
    };
    const completeResult = appendScopeEvent(paths, {
        type: "apply.completed",
        actor: "agent",
        payload: {
            result: `design doc committed (sha=${commitSha.slice(0, 7)})`,
            process_artifact: processArtifact,
        },
    });
    if (!completeResult.success) {
        // post-round 2 fix-up (NEW-CONS-3): apply.completed append 실패 시 git commit 은
        // 이미 성공했지만 ledger 가 모름. source 는 *아직 unlink 되지 않은 상태* 이므로
        // 재진입 시 destination 충돌 → 사용자에게 명시적 진단 노출 → 수동 복구 가능.
        return {
            success: false,
            reason: wrapGateError(`${completeResult.reason} — git commit 은 ${commitSha.slice(0, 7)} 로 성공했으나 ledger 기록 실패. ledger 와 git 정합 후 재진입 필요.`),
        };
    }
    refreshScopeMd(paths, completeResult.state);
    // ── Step 7: source unlink (apply.completed durable record 후만 안전) ──
    //
    // post-round 2 fix-up (NEW-CONS-3): 이전 ordering 은 git commit 후 source 를
    // 즉시 unlink → apply.completed append 실패 시 ledger 미기록 + source 소실
    // 의 disconnected state. unlink 를 *apply.completed durable 후* 로 이동 →
    // ledger 실패 시 source 가 recovery anchor 로 보존됨.
    if (existsSync(sourcePath))
        unlinkSync(sourcePath);
    const messageParts = [`Design doc 이 ${relDestPath} 로 commit 되었습니다 (sha=${commitSha.slice(0, 7)}).`];
    if (prUrl)
        messageParts.push(`PR: ${prUrl}`);
    if (pushPrWarning)
        messageParts.push(pushPrWarning);
    return {
        success: true,
        nextState: completeResult.next_state,
        message: messageParts.join(" "),
        data: {
            destinationPath: relDestPath,
            destinationHash: sourceHash,
            commitMessage,
            commitSha,
            ...(prUrl ? { prUrl } : {}),
            ...(pushPrWarning ? { pushPrWarning } : {}),
        },
    };
}
// refreshScopeMd is imported from ./shared.ts (UF-CONCISENESS-SCOPE-MD consolidated)
