import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { executeApply } from "./apply.js";
import { createScope } from "../../scope-runtime/scope-manager.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";
let tmpDir;
beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "sprint-apply-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });
/** Set up scope through compiled state */
function setupCompiled() {
    writeFileSync(join(tmpDir, ".sprint-kit.yaml"), "apply_enabled: true\ndefault_sources: []\n", "utf-8");
    const paths = createScope(tmpDir, "SC-APPLY-001");
    appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title: "Test", description: "d", entry_mode: "experience" } });
    appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
    appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 1, policy: 1 } } });
    appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 } });
    appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "test", locked_scope_boundaries: { in: ["a"], out: ["b"] }, locked_in_out: true } });
    appendScopeEvent(paths, { type: "surface.generated", actor: "system", payload: { surface_type: "experience", surface_path: "surface/preview/", content_hash: "sf1", based_on_snapshot: 1 } });
    appendScopeEvent(paths, { type: "surface.confirmed", actor: "user", payload: { final_surface_path: "surface/preview/", final_content_hash: "sf1", total_revisions: 0 } });
    appendScopeEvent(paths, { type: "constraint.discovered", actor: "system", payload: { constraint_id: "CST-001", perspective: "code", summary: "test constraint", severity: "required", discovery_stage: "draft_phase2", decision_owner: "product_owner", impact_if_ignored: "fails", source_refs: [{ source: "test.ts", detail: "d" }] } });
    appendScopeEvent(paths, { type: "constraint.decision_recorded", actor: "user", payload: { constraint_id: "CST-001", decision: "inject", selected_option: "fix", decision_owner: "product_owner", rationale: "필수" } });
    appendScopeEvent(paths, { type: "target.locked", actor: "system", payload: { surface_hash: "sf1", constraint_decisions: [{ constraint_id: "CST-001", decision: "inject" }] } });
    appendScopeEvent(paths, { type: "compile.started", actor: "system", payload: { snapshot_revision: 1, surface_hash: "sf1" } });
    appendScopeEvent(paths, { type: "compile.completed", actor: "system", payload: { build_spec_path: "build/build-spec.md", build_spec_hash: "bs1", brownfield_detail_path: "build/brownfield-detail.md", brownfield_detail_hash: "bf1", delta_set_path: "build/delta-set.json", delta_set_hash: "ds1", validation_plan_path: "build/validation-plan.md", validation_plan_hash: "vp1" } });
    appendScopeEvent(paths, { type: "pre_apply.review_completed", actor: "agent", payload: { verdict: "pass", findings: [] } });
    appendScopeEvent(paths, { type: "prd.review_completed", actor: "agent", payload: { verdict: "pass", perspectives: ["prd_logic", "prd_structure", "prd_dependency", "prd_semantics", "prd_pragmatics", "prd_evolution", "prd_coverage", "prd_conciseness"], findings: [] } });
    return paths;
}
/** Set up scope through applied state */
function setupApplied() {
    const paths = setupCompiled();
    appendScopeEvent(paths, { type: "apply.started", actor: "agent", payload: { build_spec_hash: "bs1" } }, { apply_enabled: true });
    appendScopeEvent(paths, { type: "apply.completed", actor: "agent", payload: { result: "success" } });
    return paths;
}
describe("executeApply", () => {
    it("start_apply → compiled (self transition)", () => {
        const paths = setupCompiled();
        const result = executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" }, { projectRoot: tmpDir });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("compiled");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("compiled");
    });
    it("complete_apply → applied", () => {
        const paths = setupCompiled();
        executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" });
        const result = executeApply(paths, { type: "complete_apply", result: "success" });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("applied");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("applied");
    });
    it("full happy path: start → complete → validate → pass", () => {
        const paths = setupCompiled();
        // start_apply
        const startResult = executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" }, { projectRoot: tmpDir });
        expect(startResult.success).toBe(true);
        // complete_apply
        const completeResult = executeApply(paths, { type: "complete_apply", result: "success" });
        expect(completeResult.success).toBe(true);
        // start_validation
        const valStartResult = executeApply(paths, { type: "start_validation", validationPlanHash: "vp1" });
        expect(valStartResult.success).toBe(true);
        // complete_validation (pass)
        const valCompleteResult = executeApply(paths, {
            type: "complete_validation",
            plan: [{ val_id: "VAL-001", related_cst: "CST-001", decision_type: "inject", target: "test.ts", method: "manual", pass_criteria: "works", fail_action: "fix" }],
            results: [{ val_id: "VAL-001", related_cst: "CST-001", result: "pass", detail: "확인 완료" }],
            actualPlanHash: "vp1",
        });
        expect(valCompleteResult.success).toBe(true);
        if (!valCompleteResult.success)
            return;
        expect(valCompleteResult.nextState).toBe("validated");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("validated");
    });
    it("report_gap → constraints_resolved (backward transition)", () => {
        const paths = setupCompiled();
        executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" });
        const result = executeApply(paths, {
            type: "report_gap",
            constraintPayload: {
                constraint_id: "CST-002",
                perspective: "code",
                summary: "edge case 발견",
                severity: "required",
                discovery_stage: "apply",
                decision_owner: "product_owner",
                impact_if_ignored: "data loss",
                source_refs: [{ source: "handler.ts", detail: "line 42" }],
            },
            gapPayload: {
                new_constraint_id: "CST-002",
                description: "미결정 edge case 발견",
            },
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("constraints_resolved");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("constraints_resolved");
    });
    it("validation fail → constraints_resolved", () => {
        const paths = setupApplied();
        // start_validation
        executeApply(paths, { type: "start_validation", validationPlanHash: "vp1" });
        // complete_validation (fail)
        const result = executeApply(paths, {
            type: "complete_validation",
            plan: [{ val_id: "VAL-001", related_cst: "CST-001", decision_type: "inject", target: "test.ts", method: "manual", pass_criteria: "works", fail_action: "fix" }],
            results: [{ val_id: "VAL-001", related_cst: "CST-001", result: "fail", detail: "구현 누락" }],
            actualPlanHash: "vp1",
        });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("constraints_resolved");
        expect(result.data?.result).toBe("fail");
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("constraints_resolved");
    });
    it("start_apply fails when not in compiled state", () => {
        const paths = setupApplied(); // already applied
        const result = executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" }, { projectRoot: tmpDir });
        expect(result.success).toBe(false);
    });
});
// ─── PR #246 R1 (Phase B Step 4): commit_design_doc — process mode apply ───
//
// 검증 대상:
// - process scope (entry_mode="process") 가 surface_confirmed 까지 도달한 뒤
//   commit_design_doc 호출 → design-doc-draft.md 가 development-records/evolve/
//   {YYYYMMDD}-{slug}.md 로 이동, state 가 applied 로 전이
// - non-process scope 에서는 거부 (gate-guard Rule 5e)
// - source 파일 부재 / destination 충돌 시 명시적 실패
// - --slug 옵션으로 destination filename 변경
//
// git 실행은 skipGit=true 로 우회 (별도 happy-path test 가 실 git repo 사용).
function setupSurfaceConfirmedProcessScope(scopesDir, scopeId, options) {
    const paths = createScope(scopesDir, scopeId);
    const title = options?.title ?? "Process Apply Test";
    appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title, description: "process scope test", entry_mode: "process" } });
    appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
    appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } } });
    appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 } });
    appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "design 작성", locked_scope_boundaries: { in: ["doc"], out: ["code"] }, locked_in_out: true } });
    appendScopeEvent(paths, { type: "surface.generated", actor: "system", payload: { surface_type: "interface", surface_path: join(paths.surface, "design-doc-draft.md"), content_hash: "sf-proc", based_on_snapshot: 1 } });
    appendScopeEvent(paths, { type: "surface.confirmed", actor: "user", payload: { final_surface_path: join(paths.surface, "design-doc-draft.md"), final_content_hash: "sf-proc", total_revisions: 0 } });
    return paths;
}
function writeDesignDocDraft(paths, content) {
    const draftPath = join(paths.surface, "design-doc-draft.md");
    writeFileSync(draftPath, content ?? "---\nas_of: 2026-04-28\nstatus: design-draft\n---\n# Test design doc\n", "utf-8");
    return draftPath;
}
describe("executeApply — commit_design_doc (process mode)", () => {
    it("commit_design_doc moves draft + transitions state to applied (skipGit)", () => {
        const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-001", { title: "Phase B Step 4 verify" });
        const draftPath = writeDesignDocDraft(paths);
        expect(existsSync(draftPath)).toBe(true);
        const result = executeApply(paths, { type: "commit_design_doc", skipGit: true, slug: "phase-b-step-4-verify" }, { projectRoot: tmpDir });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.nextState).toBe("applied");
        // Draft was moved (source unlinked)
        expect(existsSync(draftPath)).toBe(false);
        // Destination created in development-records/evolve/{YYYYMMDD}-{slug}.md
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const expectedDest = join(tmpDir, "development-records", "evolve", `${today}-phase-b-step-4-verify.md`);
        expect(existsSync(expectedDest)).toBe(true);
        expect(readFileSync(expectedDest, "utf-8")).toContain("# Test design doc");
        // State transitioned: surface_confirmed → applied
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("applied");
        // Result data echoes destination path
        expect(result.data?.destinationPath).toBe(`development-records/evolve/${today}-phase-b-step-4-verify.md`);
    });
    it("commit_design_doc rejects non-process scopes (gate-guard Rule 5e)", () => {
        // Use the existing experience-mode setupCompiled — already at compiled state
        const paths = setupCompiled();
        const result = executeApply(paths, { type: "commit_design_doc", skipGit: true }, { projectRoot: tmpDir });
        expect(result.success).toBe(false);
        if (result.success)
            return;
        expect(result.reason).toMatch(/process entry mode/);
    });
    it("commit_design_doc rejects when current_state !== surface_confirmed", () => {
        // Process scope at align_locked (before surface generation)
        const paths = createScope(tmpDir, "SC-PROC-COMMIT-002");
        appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title: "incomplete", description: "d", entry_mode: "process" } });
        appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
        appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } } });
        appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "p", packet_hash: "h", snapshot_revision: 1 } });
        appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "x", locked_scope_boundaries: { in: ["a"], out: ["b"] }, locked_in_out: true } });
        // align_locked, surface 미생성 — surface_confirmed 아님
        const result = executeApply(paths, { type: "commit_design_doc", skipGit: true }, { projectRoot: tmpDir });
        expect(result.success).toBe(false);
        if (result.success)
            return;
        expect(result.reason).toMatch(/surface_confirmed 상태에서만/);
    });
    it("commit_design_doc fails when design-doc-draft.md missing", () => {
        const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-003");
        // Do NOT write the draft file
        const result = executeApply(paths, { type: "commit_design_doc", skipGit: true }, { projectRoot: tmpDir });
        expect(result.success).toBe(false);
        if (result.success)
            return;
        expect(result.reason).toMatch(/design-doc-draft\.md 가 존재하지 않습니다/);
    });
    it("commit_design_doc fails when destination already exists", () => {
        const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-004", { title: "collision-test" });
        writeDesignDocDraft(paths);
        // Pre-create destination at expected path
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const evolveDir = join(tmpDir, "development-records", "evolve");
        mkdirSync(evolveDir, { recursive: true });
        writeFileSync(join(evolveDir, `${today}-collision-test.md`), "preexisting content", "utf-8");
        const result = executeApply(paths, { type: "commit_design_doc", skipGit: true }, { projectRoot: tmpDir });
        expect(result.success).toBe(false);
        if (result.success)
            return;
        expect(result.reason).toMatch(/이미 파일이 존재합니다/);
    });
    it("commit_design_doc with custom commitMessage and slug echoes both in result", () => {
        const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-005");
        writeDesignDocDraft(paths);
        const result = executeApply(paths, {
            type: "commit_design_doc",
            skipGit: true,
            slug: "custom-slug",
            commitMessage: "docs(evolve): custom message",
        }, { projectRoot: tmpDir });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        expect(result.data?.commitMessage).toBe("docs(evolve): custom message");
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        expect(result.data?.destinationPath).toBe(`development-records/evolve/${today}-custom-slug.md`);
    });
    it("commit_design_doc happy path with real git commit (full integration)", () => {
        // Initialize tmpDir as a git repo
        execFileSync("git", ["init", "--quiet"], { cwd: tmpDir });
        execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: tmpDir });
        execFileSync("git", ["config", "user.name", "Test User"], { cwd: tmpDir });
        // Initial commit so HEAD exists
        writeFileSync(join(tmpDir, "README.md"), "init\n", "utf-8");
        execFileSync("git", ["add", "README.md"], { cwd: tmpDir });
        execFileSync("git", ["commit", "-m", "init", "--quiet"], { cwd: tmpDir });
        const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-006", { title: "real git" });
        writeDesignDocDraft(paths, "---\nstatus: design-draft\n---\n# real git\n");
        const result = executeApply(paths, { type: "commit_design_doc", slug: "real-git-test" }, { projectRoot: tmpDir });
        expect(result.success).toBe(true);
        if (!result.success)
            return;
        // git log shows the commit
        const log = execFileSync("git", ["log", "--oneline", "-1"], { cwd: tmpDir, encoding: "utf-8" });
        expect(log).toContain("docs(evolve): real git");
        // State is applied
        const state = reduce(readEvents(paths.events));
        expect(state.current_state).toBe("applied");
    });
});
