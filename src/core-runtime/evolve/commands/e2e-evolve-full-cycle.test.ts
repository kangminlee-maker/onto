/**
 * Evolve full cycle E2E test (W-B-01).
 *
 * scope-runtime kernel 위에서 evolve 활동의 전체 lifecycle 을 검증한다:
 *   draft → grounded → align_proposed → align_locked → surface_iterating →
 *   surface_confirmed → constraints_resolved → target_locked → compiled →
 *   applied → validated → closed
 *
 * 초기 scope 생성(grounding)은 appendScopeEvent 로 직접 설정하고,
 * align 이후는 실제 command 함수(executeAlign/executeDraft/executeApply/executeClose)를 사용.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createScope } from "../../scope-runtime/scope-manager.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
import { executeAlign } from "./align.js";
import { executeDraft } from "./draft.js";
import { executeApply } from "./apply.js";
import { executeClose } from "./close.js";

let tmpDir: string;

beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "e2e-evolve-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("evolve full cycle E2E", () => {
  it("draft → closed: 전체 lifecycle 을 command 함수로 통과한다", () => {
    // ── Phase 0: Scope 생성 + Grounding ──
    writeFileSync(join(tmpDir, ".sprint-kit.yaml"), "apply_enabled: true\ndefault_sources: []\n", "utf-8");
    const paths = createScope(tmpDir, "E2E-FULL-001");

    appendScopeEvent(paths, {
      type: "scope.created",
      actor: "user",
      payload: { title: "E2E Full Cycle", description: "evolve full cycle test", entry_mode: "experience" },
    });
    appendScopeEvent(paths, {
      type: "grounding.started",
      actor: "system",
      payload: { sources: [{ type: "add-dir", path_or_url: "/test-project" }] },
    });
    appendScopeEvent(paths, {
      type: "grounding.completed",
      actor: "system",
      payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test-project": "h1" }, perspective_summary: { experience: 1, code: 1, policy: 1 } },
    });
    appendScopeEvent(paths, {
      type: "align.proposed",
      actor: "system",
      payload: { packet_path: "build/align-packet.md", packet_hash: "ap1", snapshot_revision: 1 },
    });

    let state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("align_proposed");

    // ── Phase 1: Align (executeAlign) ──
    const alignResult = executeAlign({
      paths,
      verdict: {
        type: "approve",
        direction: "사용자 온보딩 흐름 개선",
        scope_in: ["login", "signup"],
        scope_out: ["admin"],
      },
    });
    expect(alignResult.success).toBe(true);
    if (!alignResult.success) return;
    expect(alignResult.nextState).toBe("align_locked");

    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("align_locked");

    // ── Phase 2: Draft — Surface 생성 (executeDraft) ──
    const genResult = executeDraft({
      paths,
      action: { type: "generate_surface", surfacePath: "surface/preview/", surfaceHash: "sf1", snapshotRevision: 1 },
    });
    expect(genResult.success).toBe(true);
    if (!genResult.success) return;
    expect(genResult.nextState).toBe("surface_iterating");

    // ── Phase 2b: Surface 확인 ──
    const confirmResult = executeDraft({
      paths,
      action: { type: "confirm_surface", surfacePath: "surface/preview/", surfaceHash: "sf1" },
    });
    expect(confirmResult.success).toBe(true);
    if (!confirmResult.success) return;
    expect(confirmResult.nextState).toBe("surface_confirmed");

    // ── Phase 2c: Constraint 발견 + 결정 ──
    const constraintResult = executeDraft({
      paths,
      action: {
        type: "record_constraint",
        constraintPayload: {
          constraint_id: "CST-E2E-001",
          perspective: "code",
          summary: "기존 인증 모듈과 호환성 필요",
          severity: "required",
          discovery_stage: "draft_phase2",
          decision_owner: "product_owner",
          impact_if_ignored: "로그인 기능 장애",
          source_refs: [{ source: "auth.ts", detail: "OAuth 의존성" }],
        },
      },
    });
    expect(constraintResult.success).toBe(true);

    const decisionResult = executeDraft({
      paths,
      action: {
        type: "record_decision",
        decisionPayload: {
          constraint_id: "CST-E2E-001",
          decision: "inject",
          selected_option: "호환 래퍼 추가",
          decision_owner: "product_owner",
          rationale: "기존 모듈 변경 최소화",
        },
      },
    });
    expect(decisionResult.success).toBe(true);

    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("constraints_resolved");

    // ── Phase 2d: Target 잠금 ──
    const lockResult = executeDraft({
      paths,
      action: { type: "lock_target" },
    });
    expect(lockResult.success).toBe(true);
    if (!lockResult.success) return;
    expect(lockResult.nextState).toBe("target_locked");

    // ── Phase 2e: Compile ──
    // compile 은 code-product adapter 를 호출하므로, compile.started/completed 를 직접 기록
    appendScopeEvent(paths, {
      type: "compile.started",
      actor: "system",
      payload: { snapshot_revision: 1, surface_hash: "sf1" },
    });
    appendScopeEvent(paths, {
      type: "compile.completed",
      actor: "system",
      payload: {
        build_spec_path: "build/build-spec.md", build_spec_hash: "bs1",
        brownfield_detail_path: "build/brownfield-detail.md", brownfield_detail_hash: "bf1",
        delta_set_path: "build/delta-set.json", delta_set_hash: "ds1",
        validation_plan_path: "build/validation-plan.md", validation_plan_hash: "vp1",
      },
    });

    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("compiled");

    // ── Phase 3: Apply (executeApply) ──
    // pre-apply + PRD review gate 통과
    appendScopeEvent(paths, { type: "pre_apply.review_completed", actor: "agent", payload: { verdict: "pass", findings: [] } });
    appendScopeEvent(paths, { type: "prd.review_completed", actor: "agent", payload: { verdict: "pass", perspectives: ["prd_logic"], findings: [] } });

    const applyStartResult = executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" }, { projectRoot: tmpDir });
    expect(applyStartResult.success).toBe(true);

    const applyCompleteResult = executeApply(paths, { type: "complete_apply", result: "success" });
    expect(applyCompleteResult.success).toBe(true);
    if (!applyCompleteResult.success) return;
    expect(applyCompleteResult.nextState).toBe("applied");

    // ── Phase 4: Validation (executeApply) ──
    const valStartResult = executeApply(paths, { type: "start_validation", validationPlanHash: "vp1" });
    expect(valStartResult.success).toBe(true);

    const valCompleteResult = executeApply(paths, {
      type: "complete_validation",
      plan: [{
        val_id: "VAL-001",
        related_cst: "CST-E2E-001",
        decision_type: "inject",
        target: "auth.ts",
        method: "수동 테스트",
        pass_criteria: "온보딩 흐름 정상 동작",
        fail_action: "호환 래퍼 재구현",
      }],
      results: [{ val_id: "VAL-001", related_cst: "CST-E2E-001", result: "pass", detail: "수동 테스트 통과" }],
      actualPlanHash: "vp1",
    });
    expect(valCompleteResult.success).toBe(true);
    if (!valCompleteResult.success) return;
    expect(valCompleteResult.nextState).toBe("validated");

    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("validated");

    // ── Phase 5: Close (executeClose) ──
    const closeResult = executeClose(paths);
    expect(closeResult.success).toBe(true);
    if (!closeResult.success) return;
    expect(closeResult.nextState).toBe("closed");

    // ── Final verification ──
    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("closed");

    const events = readEvents(paths.events);
    expect(events.length).toBeGreaterThanOrEqual(18);

    // 핵심 상태 전이가 모두 기록되었는지 확인
    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("scope.created");
    expect(eventTypes).toContain("grounding.completed");
    expect(eventTypes).toContain("align.locked");
    expect(eventTypes).toContain("surface.confirmed");
    expect(eventTypes).toContain("constraint.decision_recorded");
    expect(eventTypes).toContain("target.locked");
    expect(eventTypes).toContain("compile.completed");
    expect(eventTypes).toContain("apply.completed");
    expect(eventTypes).toContain("validation.completed");
    expect(eventTypes).toContain("scope.closed");
  });

  // ─── PR #246 R1 (Phase B Step 6): process mode 의 단축 lifecycle E2E ───
  //
  // 검증 시나리오:
  //   draft → grounded → align_proposed → align_locked →
  //   surface_iterating → surface_confirmed → applied (compile/target_locked skip)
  //
  // process mode 는 design-doc 산출 use case 라 code-product 의
  // constraint→target_locked→compile 단계를 거치지 않음. surface_confirmed
  // 에서 곧장 commit_design_doc 으로 apply.started/completed 가 emit 되어
  // applied 로 전이.
  it("process mode 단축 lifecycle: surface_confirmed → applied (compile skip)", () => {
    // post-review fix-up CONS-3: skipGit 제거 — real git repo 사용
    execFileSync("git", ["init", "--quiet"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: tmpDir });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: tmpDir });
    writeFileSync(join(tmpDir, "README.md"), "init\n", "utf-8");
    execFileSync("git", ["add", "README.md"], { cwd: tmpDir });
    execFileSync("git", ["commit", "-m", "init", "--quiet"], { cwd: tmpDir });

    const paths = createScope(tmpDir, "E2E-PROCESS-001");

    appendScopeEvent(paths, {
      type: "scope.created",
      actor: "user",
      payload: { title: "process e2e", description: "process mode short cycle", entry_mode: "process" },
    });
    appendScopeEvent(paths, {
      type: "grounding.started",
      actor: "system",
      payload: { sources: [{ type: "add-dir", path_or_url: "/test-design" }] },
    });
    appendScopeEvent(paths, {
      type: "grounding.completed",
      actor: "system",
      payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test-design": "h1" }, perspective_summary: { experience: 0, code: 0, policy: 1 } },
    });
    appendScopeEvent(paths, {
      type: "align.proposed",
      actor: "system",
      payload: { packet_path: "build/align-packet.md", packet_hash: "ap1", snapshot_revision: 1 },
    });

    const alignResult = executeAlign({
      paths,
      verdict: { type: "approve", direction: "design 작성", scope_in: ["doc"], scope_out: ["code"] },
    });
    expect(alignResult.success).toBe(true);

    // Surface 생성 (process mode → runtime 이 design-doc-draft.md 골격 작성)
    const genResult = executeDraft({
      paths,
      action: { type: "generate_surface", surfacePath: "ignored", surfaceHash: "ignored", snapshotRevision: 1 },
    });
    expect(genResult.success).toBe(true);

    // surface 가 process mode 에선 design-doc-draft.md 가 paths.surface 안에 작성됨
    // (caller path 무시)

    // Surface 확정 — 본문은 agent (테스트에선 file 이미 작성됨) 이 채운 상태로 가정
    const confirmResult = executeDraft({
      paths,
      action: {
        type: "confirm_surface",
        surfacePath: join(paths.surface, "design-doc-draft.md"),
        surfaceHash: "sf-process",
      },
    });
    expect(confirmResult.success).toBe(true);

    let state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("surface_confirmed");
    expect(state.entry_mode).toBe("process");

    // commit_design_doc — compile / target_locked / pre-apply / PRD review 모두 우회
    const commitResult = executeApply(
      paths,
      { type: "commit_design_doc" },
      { projectRoot: tmpDir },
    );
    expect(commitResult.success).toBe(true);
    if (!commitResult.success) return;
    expect(commitResult.nextState).toBe("applied");

    state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("applied");

    // 단축 lifecycle 단언: code-product 전용 이벤트 미발생
    const eventTypes = readEvents(paths.events).map(e => e.type);
    expect(eventTypes).not.toContain("target.locked");
    expect(eventTypes).not.toContain("compile.started");
    expect(eventTypes).not.toContain("compile.completed");

    // 단축 path 의 핵심 이벤트 발생
    expect(eventTypes).toContain("surface.confirmed");
    expect(eventTypes).toContain("apply.started");
    expect(eventTypes).toContain("apply.completed");
  });
});
