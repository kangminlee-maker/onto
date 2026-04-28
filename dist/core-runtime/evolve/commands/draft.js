/**
 * /draft command orchestration.
 *
 * State-dependent behavior:
 * - align_locked → generate surface + transition to surface_iterating
 * - surface_iterating → apply feedback or confirm surface
 * - surface_confirmed → deep constraint discovery + Draft Packet rendering
 * - constraints_resolved → lock target
 * - target_locked → compile
 *
 * Surface generation and constraint discovery are agent-driven.
 * This module provides the event recording orchestration.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { renderDraftPacket } from "../renderers/draft-packet.js";
import { wrapGateError } from "./error-messages.js";
import { refreshScopeMd, slugifyTitle } from "./shared.js";
import { contentHash } from "../../scope-runtime/hash.js";
import { compile } from "../adapters/code-product/compile/compile.js";
// ─── Main ───
export function executeDraft(input) {
    const { paths, action } = input;
    const events = readEvents(paths.events);
    const state = reduce(events);
    switch (action.type) {
        case "generate_surface":
            return handleGenerateSurface(paths, state, action);
        case "apply_feedback":
            return handleApplyFeedback(paths, state, action);
        case "confirm_surface":
            return handleConfirmSurface(paths, state, action);
        case "surface_change_required":
            return handleSurfaceChangeRequired(paths, action);
        case "record_constraint":
            return handleRecordConstraint(paths, action);
        case "record_decision":
            return handleRecordDecision(paths, action);
        case "lock_target":
            return handleLockTarget(paths, state);
        case "compile":
            return handleCompile(paths, state, action);
    }
}
// ─── Action Handlers ───
function handleGenerateSurface(paths, state, action) {
    if (state.current_state !== "align_locked") {
        return { success: false, reason: `Surface 생성은 align_locked 상태에서만 가능합니다. 현재: ${state.current_state}` };
    }
    // post-PR #246 R1 (Phase B Step 3): process mode 의 surface 는 design-doc
    // markdown 골격이며 결정적이므로 runtime 이 직접 작성. experience/interface
    // 는 agent 가 surface 산출물을 작성하고 path/hash 를 인자로 전달하지만,
    // process 는 frontmatter 가 표준이라 caller-provided path/hash 를 무시하고
    // 본 함수가 design-doc-draft.md 를 직접 생성. 본문은 후속 step 에서 채움.
    let surfacePath = action.surfacePath;
    let surfaceHash = action.surfaceHash;
    if (state.entry_mode === "process") {
        const skeletonPath = join(paths.surface, "design-doc-draft.md");
        const skeleton = renderProcessDesignDocSkeleton(state);
        writeFileSync(skeletonPath, skeleton, "utf-8");
        surfacePath = skeletonPath;
        surfaceHash = contentHash(skeleton);
    }
    const result = appendScopeEvent(paths, {
        type: "surface.generated",
        actor: "system",
        payload: {
            surface_type: state.entry_mode,
            surface_path: surfacePath,
            content_hash: surfaceHash,
            based_on_snapshot: action.snapshotRevision,
        },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    // post-PR #216 §3.1.0: process mode 의 surface 는 design-doc markdown.
    // experience (UI mockup) / interface (API 명세) / process (design doc) 3-way.
    const guide = state.entry_mode === "experience"
        ? "`cd surface/preview && npm run dev`로 mockup을 확인하세요."
        : state.entry_mode === "process"
            ? "`surface/design-doc-draft.md`의 design 문서를 확인하세요."
            : "`surface/contract-diff/`의 API 명세를 확인하세요.";
    return {
        success: true,
        nextState: "surface_iterating",
        message: `Surface가 생성되었습니다. ${guide} 수정이 필요하면 피드백을 주세요. 이 모습이 맞으면 '확정합니다'라고 말씀해 주세요.`,
    };
}
// post-PR #246 R1 (Phase B Step 3): process scope 의 design-doc-draft.md 를
// 생성하는 helper. design 문서 표준 frontmatter (as_of/status/functional_area/
// purpose) + 권장 4 섹션 (배경/설계 영역/Phase 계획/Success criteria) 골격을
// 출력. 본문은 agent (LLM/사람) 가 surface_iterating 단계에서 채움.
function renderProcessDesignDocSkeleton(state) {
    const today = new Date().toISOString().slice(0, 10);
    const slug = slugifyTitle(state.title);
    const purpose = state.direction?.trim() || "TBD - 본문에서 작성";
    return `---
as_of: ${today}
status: design-draft
functional_area: ${slug}
purpose: |
  ${purpose.split("\n").join("\n  ")}
---

# ${state.title}

## 1. 배경

<!-- 동기와 문제 정의를 작성하세요. -->

## 2. 설계 영역

<!-- 핵심 설계 결정과 근거를 작성하세요. -->

## 3. Phase 계획

<!-- 단계별 구현 계획을 작성하세요. -->

## 4. Success criteria

<!-- 검증 기준을 작성하세요. -->
`;
}
function handleApplyFeedback(paths, state, action) {
    const classification = action.classification ?? "surface_only";
    // 1. Record feedback
    const fbResult = appendScopeEvent(paths, {
        type: "surface.revision_requested",
        actor: "user",
        payload: { feedback_text: action.feedbackText },
    });
    if (!fbResult.success)
        return { success: false, reason: wrapGateError(fbResult.reason) };
    // 2. Record feedback classification
    const classifyResult = appendScopeEvent(paths, {
        type: "feedback.classified",
        actor: "system",
        payload: {
            classification,
            confidence: action.classification ? 1.0 : 0.8,
            confirmed_by: action.classification ? "user" : "auto",
        },
    });
    if (!classifyResult.success)
        return { success: false, reason: wrapGateError(classifyResult.reason) };
    // 3. direction_change → redirect to align, early return
    if (classification === "direction_change") {
        const redirectResult = appendScopeEvent(paths, {
            type: "redirect.to_align",
            actor: "system",
            payload: {
                from_state: state.current_state,
                reason: "피드백 분류: direction_change — 방향 재검토가 필요합니다.",
            },
        });
        if (!redirectResult.success)
            return { success: false, reason: wrapGateError(redirectResult.reason) };
        refreshScopeMd(paths, redirectResult.state);
        return {
            success: true,
            nextState: "align_proposed",
            message: "방향 변경 피드백이 감지되었습니다. /align으로 방향을 재검토합니다.",
        };
    }
    // 4. Record revision
    const revResult = appendScopeEvent(paths, {
        type: "surface.revision_applied",
        actor: "system",
        payload: {
            revision_count: state.revision_count_surface + 1,
            surface_path: action.surfacePath,
            content_hash: action.surfaceHash,
        },
    });
    if (!revResult.success)
        return { success: false, reason: wrapGateError(revResult.reason) };
    refreshScopeMd(paths, revResult.state);
    // 5. target_change → append scope change notice
    const message = classification === "target_change"
        ? "피드백이 반영되었습니다. 범위가 변경되었습니다. Surface를 다시 확인해 주세요."
        : "피드백이 반영되었습니다. Surface를 다시 확인해 주세요.";
    return {
        success: true,
        nextState: "surface_iterating",
        message,
    };
}
function handleConfirmSurface(paths, state, action) {
    const result = appendScopeEvent(paths, {
        type: "surface.confirmed",
        actor: "user",
        payload: {
            final_surface_path: action.surfacePath,
            final_content_hash: action.surfaceHash,
            total_revisions: state.revision_count_surface,
        },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: "surface_confirmed",
        message: "Surface가 확정되었습니다. 3개 관점에서 정밀 스캔을 수행합니다.",
    };
}
function handleSurfaceChangeRequired(paths, action) {
    const result = appendScopeEvent(paths, {
        type: "surface.change_required",
        actor: "system",
        payload: {
            constraint_id: action.constraintId,
            reason: action.reason,
        },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: "surface_iterating",
        message: `${action.constraintId}: 제약 사항으로 인해 Surface 수정이 필요합니다. Surface를 다시 검토해 주세요.`,
    };
}
function handleRecordConstraint(paths, action) {
    const result = appendScopeEvent(paths, {
        type: "constraint.discovered",
        actor: "system",
        payload: action.constraintPayload,
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    const cstId = action.constraintPayload.constraint_id ?? "?";
    return {
        success: true,
        nextState: "surface_confirmed",
        message: `Constraint ${cstId}이 기록되었습니다.`,
    };
}
function handleRecordDecision(paths, action) {
    const result = appendScopeEvent(paths, {
        type: "constraint.decision_recorded",
        actor: "user",
        payload: action.decisionPayload,
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    const cstId = action.decisionPayload.constraint_id ?? "?";
    const decision = action.decisionPayload.decision ?? "?";
    // modify-direction → automatically redirect to Align
    if (decision === "modify-direction") {
        const redirectResult = appendScopeEvent(paths, {
            type: "redirect.to_align",
            actor: "system",
            payload: {
                from_state: result.next_state,
                reason: `${cstId}: modify-direction 결정으로 방향 재검토 필요`,
            },
        });
        if (!redirectResult.success)
            return { success: false, reason: wrapGateError(redirectResult.reason) };
        refreshScopeMd(paths, redirectResult.state);
        return {
            success: true,
            nextState: "align_proposed",
            message: `${cstId}: modify-direction. 방향을 재검토합니다. /align으로 진행하세요.`,
        };
    }
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: result.next_state,
        message: `${cstId}: ${decision} 결정이 기록되었습니다.`,
    };
}
function handleLockTarget(paths, state) {
    // Filter: decided constraints only (matches gate-guard Rule 6 criteria)
    const activeConstraints = state.constraint_pool.constraints
        .filter(c => c.status === "decided")
        .map(c => ({ constraint_id: c.constraint_id, decision: c.decision }));
    const result = appendScopeEvent(paths, {
        type: "target.locked",
        actor: "system",
        payload: {
            surface_hash: state.surface_hash ?? "",
            constraint_decisions: activeConstraints,
        },
    });
    if (!result.success)
        return { success: false, reason: wrapGateError(result.reason) };
    refreshScopeMd(paths, result.state);
    return {
        success: true,
        nextState: "target_locked",
        message: "모든 결정이 완료되었습니다. compile을 시작합니다.",
    };
}
function handleCompile(paths, state, action) {
    // post-PR #216 §3.1.0 / Phase B Step 2: process mode 는 compile 단계 skip.
    // process scope 의 산출물은 design-doc markdown 이며 build-spec / delta-set
    // / brownfield-detail 같은 code-product compile artifact 가 무의미.
    // F-15 (compile cryptic 예외) 의 직접 root cause — entry_mode 분기 부재.
    //
    // post-PR #246 R1 (Phase B Step 4): apply 분기가 생기면서 메시지가 가리킬
    // *실재* path 가 존재. 이전 honest 표기 ("후속 PR 에서 추가") 가 R1 머지
    // 시점부터 stale 이므로 현재 사용자가 따라갈 수 있는 경로를 안내.
    if (state.entry_mode === "process") {
        return {
            success: false,
            reason: wrapGateError("process mode 에선 compile 이 생략됩니다. design doc 작성을 마쳤으면 `onto evolve apply --scope-id <id> --action commit-design-doc` 로 development-records/evolve/ 에 commit 하세요."),
        };
    }
    // Execute compile FIRST (before recording compile.started)
    // This prevents orphaned compile.started events in the event stream on failure.
    const compileResult = compile(action.compileInput);
    if (!compileResult.success) {
        return {
            success: false,
            reason: wrapGateError(`Compile 실패: ${compileResult.reason}`),
            violations: compileResult.violations,
        };
    }
    // Record compile.started (only after successful compile)
    const startResult = appendScopeEvent(paths, {
        type: "compile.started",
        actor: "system",
        payload: {
            snapshot_revision: state.snapshot_revision,
            surface_hash: state.surface_hash ?? "",
        },
    });
    if (!startResult.success)
        return { success: false, reason: wrapGateError(startResult.reason) };
    const success = compileResult;
    // Save artifacts
    writeFileSync(join(paths.build, "build-spec.md"), success.buildSpecMd, "utf-8");
    writeFileSync(join(paths.build, "brownfield-detail.md"), success.brownfieldDetailMd, "utf-8");
    writeFileSync(join(paths.build, "delta-set.json"), success.deltaSetJson, "utf-8");
    writeFileSync(join(paths.build, "validation-plan.md"), success.validationPlanMd, "utf-8");
    // Record compile.completed
    const completeResult = appendScopeEvent(paths, {
        type: "compile.completed",
        actor: "system",
        payload: {
            build_spec_path: "build/build-spec.md",
            build_spec_hash: success.buildSpecHash,
            brownfield_detail_path: "build/brownfield-detail.md",
            brownfield_detail_hash: success.brownfieldDetailHash,
            delta_set_path: "build/delta-set.json",
            delta_set_hash: success.deltaSetHash,
            validation_plan_path: "build/validation-plan.md",
            validation_plan_hash: success.validationPlanHash,
        },
    });
    if (!completeResult.success)
        return { success: false, reason: wrapGateError(completeResult.reason) };
    refreshScopeMd(paths, completeResult.state);
    return {
        success: true,
        nextState: "compiled",
        message: "Build Spec이 생성되었습니다. 구현을 적용하세요.",
        data: {
            buildSpecHash: success.buildSpecHash,
            deltaSetHash: success.deltaSetHash,
            validationPlanHash: success.validationPlanHash,
            warnings: success.warnings,
        },
    };
}
// ─── Packet Rendering (UF-STRUCTURE-PACKET-SEAT) ───
/**
 * Render a Draft Packet and write it to `build/draft-packet.md`.
 *
 * Called by the agent when it has assembled DraftPacketContent
 * (after surface confirmation + constraint discovery).
 * Returns the content hash of the written packet.
 */
export function writeDraftPacket(paths, content) {
    const state = reduce(readEvents(paths.events));
    const md = renderDraftPacket(state, content);
    const packetPath = join(paths.build, "draft-packet.md");
    writeFileSync(packetPath, md, "utf-8");
    return { packetPath, packetHash: contentHash(md) };
}
// refreshScopeMd is imported from ./shared.ts (UF-CONCISENESS-SCOPE-MD consolidated)
