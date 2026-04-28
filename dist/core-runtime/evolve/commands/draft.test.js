import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { executeDraft } from "./draft.js";
import { createScope } from "../../scope-runtime/scope-manager.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
let tmpDir;
beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "sprint-draft-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });
/** Set up scope through align_locked */
function setupAlignLocked() {
    const paths = createScope(tmpDir, "SC-DRAFT-001");
    appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title: "Test", description: "d", entry_mode: "experience" } });
    appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
    appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 1, policy: 1 } } });
    appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 } });
    appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "test", locked_scope_boundaries: { in: ["a"], out: ["b"] }, locked_in_out: true } });
    return paths;
}
/** Set up scope through surface_iterating */
function setupSurfaceIterating() {
    const paths = setupAlignLocked();
    appendScopeEvent(paths, { type: "surface.generated", actor: "system", payload: { surface_type: "experience", surface_path: "surface/preview/", content_hash: "sf1", based_on_snapshot: 1 } });
    return paths;
}
describe("executeDraft", () => {
    it("generate_surface: align_locked → surface_iterating", () => {
        const paths = setupAlignLocked();
        const result = executeDraft({
            paths,
            action: { type: "generate_surface", surfacePath: "surface/preview/", surfaceHash: "sf1", snapshotRevision: 1 },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_iterating");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("surface_iterating");
    });
    it("apply_feedback: surface_iterating → surface_iterating", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "apply_feedback", feedbackText: "버튼 위치 변경", surfacePath: "surface/preview/", surfaceHash: "sf2" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_iterating");
    });
    it("confirm_surface: surface_iterating → surface_confirmed", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "confirm_surface", surfacePath: "surface/preview/", surfaceHash: "sf_final" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_confirmed");
    });
    it("generate_surface fails when not align_locked", () => {
        const paths = setupSurfaceIterating(); // already surface_iterating
        const result = executeDraft({
            paths,
            action: { type: "generate_surface", surfacePath: "surface/preview/", surfaceHash: "sf", snapshotRevision: 1 },
        });
        expect(result.success).toBe(false);
    });
    it("apply_feedback with classification=surface_only records feedback.classified", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "apply_feedback", feedbackText: "색상 변경", surfacePath: "surface/preview/", surfaceHash: "sf3", classification: "surface_only" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_iterating");
        const events = readEvents(paths.events);
        const classifiedEvents = events.filter(e => e.type === "feedback.classified");
        expect(classifiedEvents.length).toBe(1);
        expect(classifiedEvents[0].payload).toEqual({
            classification: "surface_only",
            confidence: 1.0,
            confirmed_by: "user",
        });
        // revision_applied should also be recorded
        const revisionEvents = events.filter(e => e.type === "surface.revision_applied");
        expect(revisionEvents.length).toBe(1);
    });
    it("apply_feedback with classification=direction_change issues redirect.to_align", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "apply_feedback", feedbackText: "방향을 바꿔야 합니다", surfacePath: "surface/preview/", surfaceHash: "sf4", classification: "direction_change" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("align_proposed");
        const events = readEvents(paths.events);
        const classifiedEvents = events.filter(e => e.type === "feedback.classified");
        expect(classifiedEvents.length).toBe(1);
        expect(classifiedEvents[0].payload).toEqual({
            classification: "direction_change",
            confidence: 1.0,
            confirmed_by: "user",
        });
        const redirectEvents = events.filter(e => e.type === "redirect.to_align");
        expect(redirectEvents.length).toBe(1);
        // revision_applied should NOT be recorded (early return)
        const revisionEvents = events.filter(e => e.type === "surface.revision_applied");
        expect(revisionEvents.length).toBe(0);
        const state = reduce(events);
        expect(state.current_state).toBe("align_proposed");
    });
    it("apply_feedback without classification defaults to surface_only", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "apply_feedback", feedbackText: "간격 조정", surfacePath: "surface/preview/", surfaceHash: "sf5" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_iterating");
        const events = readEvents(paths.events);
        const classifiedEvents = events.filter(e => e.type === "feedback.classified");
        expect(classifiedEvents.length).toBe(1);
        expect(classifiedEvents[0].payload).toEqual({
            classification: "surface_only",
            confidence: 0.8,
            confirmed_by: "auto",
        });
    });
    it("apply_feedback with classification=target_change appends scope change message", () => {
        const paths = setupSurfaceIterating();
        const result = executeDraft({
            paths,
            action: { type: "apply_feedback", feedbackText: "범위 수정", surfacePath: "surface/preview/", surfaceHash: "sf6", classification: "target_change" },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("surface_iterating");
        expect(result.message).toContain("범위가 변경되었습니다");
    });
    it("full flow: generate → feedback → confirm → constraint → decision → lock", () => {
        const paths = setupAlignLocked();
        // Generate surface
        executeDraft({ paths, action: { type: "generate_surface", surfacePath: "surface/preview/", surfaceHash: "sf1", snapshotRevision: 1 } });
        // Confirm surface
        executeDraft({ paths, action: { type: "confirm_surface", surfacePath: "surface/preview/", surfaceHash: "sf1" } });
        // Discover constraint
        executeDraft({ paths, action: { type: "record_constraint", constraintPayload: {
                    constraint_id: "CST-001", perspective: "code", summary: "test", severity: "required",
                    discovery_stage: "draft_phase2", decision_owner: "product_owner",
                    impact_if_ignored: "fails", source_refs: [{ source: "test.ts", detail: "d" }],
                } } });
        // Record decision
        executeDraft({ paths, action: { type: "record_decision", decisionPayload: {
                    constraint_id: "CST-001", decision: "inject", selected_option: "fix",
                    decision_owner: "product_owner", rationale: "필수",
                } } });
        // Lock target
        const lockResult = executeDraft({ paths, action: { type: "lock_target" } });
        expect(lockResult.success).toBe(true);
        if (!lockResult.success)
            return;
        expect(lockResult.nextState).toBe("target_locked");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("target_locked");
    });
    // ─── PR #216 §3.1.0 Phase B Step 2: process mode handleCompile 분기 ───
    // F-15 (compile cryptic 예외) 의 root cause 였던 entry_mode 분기 부재 해소.
    // process mode 는 compile 단계 skip — surface 가 design-doc markdown 이라
    // build-spec / delta-set / brownfield-detail 같은 code-product artifact 가
    // 무의미. Phase B Step 3-6 (apply 의 process 분기 등) 은 별도 commit.
    it("process mode + compile → fail-close with skip message (no compile invoked)", () => {
        const paths = createScope(tmpDir, "SC-PROCESS-001");
        // entry_mode="process" 로 scope 시작 (post-PR #216 §3.1.0 wiring)
        appendScopeEvent(paths, {
            type: "scope.created",
            actor: "user",
            payload: { title: "Process Test", description: "process scope test", entry_mode: "process" },
        });
        appendScopeEvent(paths, {
            type: "grounding.started",
            actor: "system",
            payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] },
        });
        appendScopeEvent(paths, {
            type: "grounding.completed",
            actor: "system",
            payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } },
        });
        appendScopeEvent(paths, {
            type: "align.proposed",
            actor: "system",
            payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 },
        });
        appendScopeEvent(paths, {
            type: "align.locked",
            actor: "user",
            payload: { locked_direction: "test", locked_scope_boundaries: { in: ["a"], out: ["b"] }, locked_in_out: true },
        });
        // surface → confirm → target_locked 까지 정상 진행 (process mode 도 동일)
        executeDraft({ paths, action: { type: "generate_surface", surfacePath: "surface/design-doc-draft.md", surfaceHash: "sf1", snapshotRevision: 1 } });
        executeDraft({ paths, action: { type: "confirm_surface", surfacePath: "surface/design-doc-draft.md", surfaceHash: "sf1" } });
        executeDraft({ paths, action: { type: "record_constraint", constraintPayload: {
                    constraint_id: "CST-001", perspective: "policy", summary: "test", severity: "required",
                    discovery_stage: "draft_phase2", decision_owner: "product_owner",
                    impact_if_ignored: "fails", source_refs: [{ source: "test.md", detail: "d" }],
                } } });
        executeDraft({ paths, action: { type: "record_decision", decisionPayload: {
                    constraint_id: "CST-001", decision: "inject", selected_option: "fix",
                    decision_owner: "product_owner", rationale: "필수",
                } } });
        executeDraft({ paths, action: { type: "lock_target" } });
        const state = reduce(readEvents(paths.events));
        expect(state.entry_mode).toBe("process");
        expect(state.current_state).toBe("target_locked");
        // 핵심 단언: compile action 은 process mode 에서 skip + fail-close.
        // CompileInput 은 어떤 stub 도 무방 — 분기 자체가 input 검증 전에 결정.
        const compileResult = executeDraft({
            paths,
            action: {
                type: "compile",
                compileInput: {}, // 실제로 사용 안 됨 — 분기에서 early return
            },
        });
        expect(compileResult.success).toBe(false);
        if (compileResult.success)
            return;
        expect(compileResult.reason).toMatch(/process mode 에선 compile 이 생략/);
        // compile 이 실제로 호출 안 됐으므로 compile.started / compile.completed
        // event 가 새로 기록되지 않음을 단언 (ledger pristine).
        const events = readEvents(paths.events);
        expect(events.find((e) => e.type === "compile.started")).toBeUndefined();
        expect(events.find((e) => e.type === "compile.completed")).toBeUndefined();
    });
    // ─── PR #246 R1 (Phase B Step 3): process mode generate_surface 가
    // design-doc-draft.md 골격 파일을 실제 작성 ───
    it("process mode generate_surface — design-doc-draft.md 골격 파일이 작성됨", () => {
        const paths = createScope(tmpDir, "SC-PROCESS-SKEL-001");
        appendScopeEvent(paths, {
            type: "scope.created",
            actor: "user",
            payload: { title: "Phase B Step 3 Skeleton", description: "process mode skeleton write", entry_mode: "process" },
        });
        appendScopeEvent(paths, {
            type: "grounding.started",
            actor: "system",
            payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] },
        });
        appendScopeEvent(paths, {
            type: "grounding.completed",
            actor: "system",
            payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } },
        });
        appendScopeEvent(paths, {
            type: "align.proposed",
            actor: "system",
            payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 },
        });
        appendScopeEvent(paths, {
            type: "align.locked",
            actor: "user",
            payload: { locked_direction: "Phase B Step 3 의 process 분기 골격 작성 검증", locked_scope_boundaries: { in: ["doc"], out: ["code"] }, locked_in_out: true },
        });
        // caller 가 surfacePath/surfaceHash 를 어떻게 넘기든 process mode 는
        // runtime 이 design-doc-draft.md 를 직접 작성하므로 무시됨.
        const result = executeDraft({
            paths,
            action: { type: "generate_surface", surfacePath: "ignored", surfaceHash: "ignored", snapshotRevision: 1 },
        });
        expect(result.success).toBe(true);
        // 핵심 단언: skeleton 파일이 실제 작성됐는가
        const skeletonPath = join(paths.surface, "design-doc-draft.md");
        expect(existsSync(skeletonPath)).toBe(true);
        const content = readFileSync(skeletonPath, "utf-8");
        // frontmatter 의 표준 필드 확인
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/as_of: \d{4}-\d{2}-\d{2}/);
        expect(content).toMatch(/status: design-draft/);
        expect(content).toMatch(/functional_area: phase-b-step-3-skeleton/);
        expect(content).toMatch(/purpose: \|/);
        expect(content).toContain("Phase B Step 3 의 process 분기");
        // 본문 권장 4 섹션 확인
        expect(content).toContain("# Phase B Step 3 Skeleton");
        expect(content).toContain("## 1. 배경");
        expect(content).toContain("## 2. 설계 영역");
        expect(content).toContain("## 3. Phase 계획");
        expect(content).toContain("## 4. Success criteria");
    });
    it("process mode generate_surface guide 메시지 — design-doc-draft.md 안내", () => {
        const paths = createScope(tmpDir, "SC-PROCESS-002");
        appendScopeEvent(paths, {
            type: "scope.created",
            actor: "user",
            payload: { title: "Process Test 2", description: "guide test", entry_mode: "process" },
        });
        appendScopeEvent(paths, {
            type: "grounding.started",
            actor: "system",
            payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] },
        });
        appendScopeEvent(paths, {
            type: "grounding.completed",
            actor: "system",
            payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } },
        });
        appendScopeEvent(paths, {
            type: "align.proposed",
            actor: "system",
            payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 },
        });
        appendScopeEvent(paths, {
            type: "align.locked",
            actor: "user",
            payload: { locked_direction: "process", locked_scope_boundaries: { in: ["doc"], out: ["code"] }, locked_in_out: true },
        });
        const result = executeDraft({
            paths,
            action: { type: "generate_surface", surfacePath: "surface/design-doc-draft.md", surfaceHash: "sf-proc", snapshotRevision: 1 },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        // 가이드 메시지가 process mode 의 design-doc 경로를 가리켜야 함
        // (이전엔 interface fallback 으로 contract-diff 안내가 잘못 노출됐을 영역)
        expect(result.message).toMatch(/design-doc-draft\.md/);
    });
});
