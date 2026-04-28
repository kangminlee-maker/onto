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
import { validate, type ValidateInput } from "../adapters/code-product/validators/validate.js";
import type { ScopePaths } from "../../scope-runtime/scope-manager.js";
import { loadProjectConfig } from "../config/project-config.js";
import type {
  ConstraintDiscoveredPayload,
  ApplyDecisionGapFoundPayload,
  ValidationItemResult,
  ValidationPlanItem,
} from "../../scope-runtime/types.js";

// ─── Input ───

export type ApplyAction =
  | { type: "start_apply"; buildSpecHash: string }
  | { type: "complete_apply"; result: string }
  | {
      type: "report_gap";
      constraintPayload: ConstraintDiscoveredPayload;
      gapPayload: ApplyDecisionGapFoundPayload;
    }
  | { type: "start_validation"; validationPlanHash: string }
  | {
      type: "complete_validation";
      plan: ValidationPlanItem[];
      results: ValidationItemResult[];
      actualPlanHash: string;
    }
  // post-PR #246 R1 (Phase B Step 4): process mode 의 apply.
  // surface_confirmed (design-doc 작성 완료) 에서 곧장 호출되어 design-doc-draft.md
  // 를 development-records/evolve/{YYYYMMDD}-{slug}.md 로 이동 + git commit.
  // pushPr=true 일 때 git push + gh pr create. skipGit=true 는 unit test 용.
  | {
      type: "commit_design_doc";
      commitMessage?: string;
      pushPr?: boolean;
      prTitle?: string;
      prBody?: string;
      destinationDir?: string;
      slug?: string;
      skipGit?: boolean;
    };

// ─── Output ───

export interface ApplyResult {
  success: true;
  nextState: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ApplyFailure {
  success: false;
  reason: string;
}

export type ApplyOutput = ApplyResult | ApplyFailure;

// ─── Main ───

export function executeApply(
  paths: ScopePaths,
  action: ApplyAction,
  options?: { projectRoot?: string },
): ApplyOutput {
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
function handleStartApply(
  paths: ScopePaths,
  action: ApplyAction & { type: "start_apply" },
  projectRoot?: string,
): ApplyOutput {
  const config = projectRoot ? loadProjectConfig(projectRoot) : { default_sources: [] };
  const result = appendScopeEvent(paths, {
    type: "apply.started",
    actor: "agent",
    payload: { build_spec_hash: action.buildSpecHash },
  }, { apply_enabled: config.apply_enabled });

  if (!result.success) return { success: false, reason: wrapGateError(result.reason) };
  refreshScopeMd(paths, result.state);

  return {
    success: true,
    nextState: result.next_state,
    message: "Apply가 시작되었습니다. delta-set의 변경 사항을 적용하세요.",
  };
}

function handleCompleteApply(
  paths: ScopePaths,
  action: ApplyAction & { type: "complete_apply" },
): ApplyOutput {
  const result = appendScopeEvent(paths, {
    type: "apply.completed",
    actor: "agent",
    payload: { result: action.result },
  });

  if (!result.success) return { success: false, reason: wrapGateError(result.reason) };
  refreshScopeMd(paths, result.state);

  return {
    success: true,
    nextState: result.next_state,
    message: "구현이 완료되었습니다. validation을 시작하세요.",
  };
}

function handleReportGap(
  paths: ScopePaths,
  action: ApplyAction & { type: "report_gap" },
): ApplyOutput {
  // 1. constraint.discovered 먼저 기록 (참조 무결성)
  const discoverResult = appendScopeEvent(paths, {
    type: "constraint.discovered",
    actor: "system",
    payload: action.constraintPayload,
  });

  if (!discoverResult.success) return { success: false, reason: wrapGateError(discoverResult.reason) };

  // 2. apply.decision_gap_found 기록 → constraints_resolved로 역전이
  const gapResult = appendScopeEvent(paths, {
    type: "apply.decision_gap_found",
    actor: "agent",
    payload: action.gapPayload,
  });

  if (!gapResult.success) return { success: false, reason: wrapGateError(gapResult.reason) };
  refreshScopeMd(paths, gapResult.state);

  return {
    success: true,
    nextState: gapResult.next_state,
    message: `Gap이 발견되었습니다 (${action.gapPayload.new_constraint_id}). Draft에서 재결정 후 재compile이 필요합니다.`,
  };
}

// Note: validation.started is a self-transition (applied → applied).
// Same resilience pattern as apply.started above.
function handleStartValidation(
  paths: ScopePaths,
  action: ApplyAction & { type: "start_validation" },
): ApplyOutput {
  const result = appendScopeEvent(paths, {
    type: "validation.started",
    actor: "agent",
    payload: { validation_plan_hash: action.validationPlanHash },
  });

  if (!result.success) return { success: false, reason: wrapGateError(result.reason) };
  refreshScopeMd(paths, result.state);

  return {
    success: true,
    nextState: result.next_state,
    message: "Validation이 시작되었습니다. 각 VAL 항목을 검증하세요.",
  };
}

function handleCompleteValidation(
  paths: ScopePaths,
  action: ApplyAction & { type: "complete_validation" },
): ApplyOutput {
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

  if (!result.success) return { success: false, reason: wrapGateError(result.reason) };
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

// post-PR #246 R1 (Phase B Step 4): process mode 의 apply 분기.
//
// 흐름:
// 1. entry_mode === "process" + current_state === "surface_confirmed" 검증
// 2. paths.surface/design-doc-draft.md → development-records/evolve/{date}-{slug}.md 로 이동
// 3. git add + git commit (skipGit=true 면 생략 — unit test 용)
// 4. pushPr=true 면 git push + gh pr create
// 5. apply.started + apply.completed 이벤트 emit (state: surface_confirmed → applied)
//
// design 문서 출처: development-records/evolve/20260425-evolve-planning-extension.md §3.4
function handleCommitDesignDoc(
  paths: ScopePaths,
  action: ApplyAction & { type: "commit_design_doc" },
  projectRoot: string,
): ApplyOutput {
  const events = readEvents(paths.events);
  const state = reduce(events);

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

  const sourcePath = join(paths.surface, "design-doc-draft.md");
  if (!existsSync(sourcePath)) {
    return {
      success: false,
      reason: `design-doc-draft.md 가 존재하지 않습니다: ${sourcePath}. draft generate_surface 로 골격을 생성한 뒤 본문을 작성하세요.`,
    };
  }
  const content = readFileSync(sourcePath, "utf-8");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = action.slug ?? slugifyTitle(state.title);
  const destDir = action.destinationDir ?? join(projectRoot, "development-records", "evolve");
  const destPath = join(destDir, `${today}-${slug}.md`);

  if (existsSync(destPath)) {
    return {
      success: false,
      reason: `대상 경로에 이미 파일이 존재합니다: ${destPath}. --slug 옵션으로 충돌을 회피하세요.`,
    };
  }

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  writeFileSync(destPath, content, "utf-8");

  const commitMessage = action.commitMessage ?? `docs(evolve): ${state.title}`;
  const relDestPath = relative(projectRoot, destPath);

  let prUrl: string | undefined;
  let pushPrWarning: string | undefined;

  if (!action.skipGit) {
    try {
      execFileSync("git", ["add", relDestPath], { cwd: projectRoot, stdio: "pipe" });
      execFileSync("git", ["commit", "-m", commitMessage], { cwd: projectRoot, stdio: "pipe" });
    } catch (err) {
      // git commit 실패 시 dest 파일 롤백 (source 는 그대로 유지)
      if (existsSync(destPath)) unlinkSync(destPath);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        reason: `git commit 실패: ${errMsg}`,
      };
    }

    if (action.pushPr) {
      try {
        const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
          cwd: projectRoot,
          encoding: "utf-8",
        }).trim();
        execFileSync("git", ["push", "origin", branch], { cwd: projectRoot, stdio: "pipe" });
        const prTitle = action.prTitle ?? commitMessage;
        const prBody = action.prBody ?? `Auto-generated by onto evolve apply (process mode).\n\nScope: ${state.scope_id}\nTitle: ${state.title}`;
        const prResult = execFileSync(
          "gh",
          ["pr", "create", "--title", prTitle, "--body", prBody],
          { cwd: projectRoot, encoding: "utf-8" },
        );
        prUrl = prResult.trim();
      } catch (err) {
        // commit 은 이미 성공했으므로 push/PR 실패는 warning 으로 보고. 사용자가 수동 진행 가능.
        const errMsg = err instanceof Error ? err.message : String(err);
        pushPrWarning = `push/PR 생성 실패 (commit 은 성공): ${errMsg}`;
      }
    }
  }

  // source 제거 — git commit 이후 (또는 skipGit 모드) 에서만 안전.
  if (existsSync(sourcePath)) unlinkSync(sourcePath);

  // 이벤트 emit: apply.started + apply.completed
  const startResult = appendScopeEvent(paths, {
    type: "apply.started",
    actor: "agent",
    payload: { build_spec_hash: contentHash(content) },
  });
  if (!startResult.success) return { success: false, reason: wrapGateError(startResult.reason) };

  const completeResult = appendScopeEvent(paths, {
    type: "apply.completed",
    actor: "agent",
    payload: { result: `design doc committed at ${relDestPath}` },
  });
  if (!completeResult.success) return { success: false, reason: wrapGateError(completeResult.reason) };
  refreshScopeMd(paths, completeResult.state);

  const messageParts = [`Design doc 이 ${relDestPath} 로 commit 되었습니다.`];
  if (prUrl) messageParts.push(`PR: ${prUrl}`);
  if (pushPrWarning) messageParts.push(pushPrWarning);

  return {
    success: true,
    nextState: completeResult.next_state,
    message: messageParts.join(" "),
    data: {
      destinationPath: relDestPath,
      commitMessage,
      ...(prUrl ? { prUrl } : {}),
      ...(pushPrWarning ? { pushPrWarning } : {}),
    },
  };
}

// refreshScopeMd is imported from ./shared.ts (UF-CONCISENESS-SCOPE-MD consolidated)
