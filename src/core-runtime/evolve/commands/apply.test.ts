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

let tmpDir: string;

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
    if (!result.success) return;
    expect(result.nextState).toBe("compiled");

    const state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("compiled");
  });

  it("complete_apply → applied", () => {
    const paths = setupCompiled();
    // post-review fix-up CONS-1: start_apply 가 game-guard Rule 5a (apply_enabled)
    // 를 통과하려면 projectRoot 가 필요. 이전엔 start_apply 가 silent fail 하고
    // complete_apply 만 통과해서 apply.started 없이 applied 로 advance 했음
    // (Rule 5f 가 catch). 정상 fixture 로 수정.
    executeApply(paths, { type: "start_apply", buildSpecHash: "bs1" }, { projectRoot: tmpDir });

    const result = executeApply(paths, { type: "complete_apply", result: "success" });
    expect(result.success).toBe(true);
    if (!result.success) return;
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
    if (!valCompleteResult.success) return;
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
    if (!result.success) return;
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
    if (!result.success) return;
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

// ─── PR #246 R1 (Phase B Step 4 + 9/9 lens consensus fix-up) ───
//
// commit_design_doc — process mode apply 검증.
//
// post-review fix-up:
// - CONS-3: skipGit / destinationDir / slug 제거 → 모든 테스트가 real git
//   (git init in tmpDir) 사용. canonical artifact 경로 약화 방지.
// - CONS-4: setupSurfaceConfirmedProcessScope 가 surface_type: "process"
//   기록 (SurfaceType 3-enum) — entry_mode 와 정합.
// - CONS-1: lifecycle ordering 검증 (apply.started 가 file/git 보다 먼저)
// - CONS-2: payload structure 검증 (process_artifact 필드 + state.title 단일 SSOT)

function setupGitRepo(repoDir: string): void {
  execFileSync("git", ["init", "--quiet"], { cwd: repoDir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoDir });
  // Initial commit so HEAD exists (push/pr 같은 후속 step 에 필요할 수도)
  writeFileSync(join(repoDir, "README.md"), "init\n", "utf-8");
  execFileSync("git", ["add", "README.md"], { cwd: repoDir });
  execFileSync("git", ["commit", "-m", "init", "--quiet"], { cwd: repoDir });
}

function setupSurfaceConfirmedProcessScope(scopesDir: string, scopeId: string, options?: { title?: string }) {
  const paths = createScope(scopesDir, scopeId);
  const title = options?.title ?? "Process Apply Test";
  appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title, description: "process scope test", entry_mode: "process" } });
  appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
  appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } } });
  appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "build/align-packet.md", packet_hash: "h", snapshot_revision: 1 } });
  appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "design 작성", locked_scope_boundaries: { in: ["doc"], out: ["code"] }, locked_in_out: true } });
  // post-review fix-up CONS-4: surface_type 을 "process" 로 — entry_mode 와 정합.
  appendScopeEvent(paths, { type: "surface.generated", actor: "system", payload: { surface_type: "process", surface_path: join(paths.surface, "design-doc-draft.md"), content_hash: "sf-proc", based_on_snapshot: 1 } });
  appendScopeEvent(paths, { type: "surface.confirmed", actor: "user", payload: { final_surface_path: join(paths.surface, "design-doc-draft.md"), final_content_hash: "sf-proc", total_revisions: 0 } });
  return paths;
}

function writeDesignDocDraft(paths: { surface: string }, content?: string): string {
  const draftPath = join(paths.surface, "design-doc-draft.md");
  writeFileSync(
    draftPath,
    content ?? "---\nas_of: 2026-04-28\nstatus: design-draft\n---\n# Test design doc\n",
    "utf-8",
  );
  return draftPath;
}

describe("executeApply — commit_design_doc (process mode)", () => {
  it("commit_design_doc moves confirmed surface + transitions state to applied", () => {
    setupGitRepo(tmpDir);
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-001", { title: "Phase B Step 4 verify" });
    const draftPath = writeDesignDocDraft(paths);
    expect(existsSync(draftPath)).toBe(true);

    const result = executeApply(
      paths,
      { type: "commit_design_doc" },
      { projectRoot: tmpDir },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.nextState).toBe("applied");

    // Source unlinked, destination written
    expect(existsSync(draftPath)).toBe(false);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // slug 는 state.title 에서 derive (단일 SSOT)
    const expectedDest = join(tmpDir, "development-records", "evolve", `${today}-phase-b-step-4-verify.md`);
    expect(existsSync(expectedDest)).toBe(true);
    expect(readFileSync(expectedDest, "utf-8")).toContain("# Test design doc");

    const state = reduce(readEvents(paths.events));
    expect(state.current_state).toBe("applied");
    expect(result.data?.destinationPath).toBe(`development-records/evolve/${today}-phase-b-step-4-verify.md`);

    // CONS-2 structured payload — apply.completed.process_artifact 검증
    const completedEvent = readEvents(paths.events).find(e => e.type === "apply.completed");
    expect(completedEvent).toBeDefined();
    const completedPayload = completedEvent!.payload as { process_artifact?: { destination_path: string; commit_message: string } };
    expect(completedPayload.process_artifact).toBeDefined();
    expect(completedPayload.process_artifact!.destination_path).toBe(`development-records/evolve/${today}-phase-b-step-4-verify.md`);
    expect(completedPayload.process_artifact!.commit_message).toBe("docs(evolve): Phase B Step 4 verify");
  });

  it("commit_design_doc rejects non-process scopes (gate-guard Rule 5e)", () => {
    const paths = setupCompiled();
    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/process entry mode/);
  });

  it("commit_design_doc rejects when current_state !== surface_confirmed", () => {
    const paths = createScope(tmpDir, "SC-PROC-COMMIT-002");
    appendScopeEvent(paths, { type: "scope.created", actor: "user", payload: { title: "incomplete", description: "d", entry_mode: "process" } });
    appendScopeEvent(paths, { type: "grounding.started", actor: "system", payload: { sources: [{ type: "add-dir", path_or_url: "/test" }] } });
    appendScopeEvent(paths, { type: "grounding.completed", actor: "system", payload: { snapshot_revision: 1, source_hashes: { "add-dir:/test": "h1" }, perspective_summary: { experience: 1, code: 0, policy: 1 } } });
    appendScopeEvent(paths, { type: "align.proposed", actor: "system", payload: { packet_path: "p", packet_hash: "h", snapshot_revision: 1 } });
    appendScopeEvent(paths, { type: "align.locked", actor: "user", payload: { locked_direction: "x", locked_scope_boundaries: { in: ["a"], out: ["b"] }, locked_in_out: true } });

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/surface_confirmed 상태에서만/);
  });

  it("commit_design_doc fails when confirmed surface file missing", () => {
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-003");
    // Do NOT write the draft file

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/confirmed surface 파일이 존재하지 않습니다/);
  });

  it("commit_design_doc fails when destination already exists", () => {
    setupGitRepo(tmpDir);
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-004", { title: "collision-test" });
    writeDesignDocDraft(paths);

    // Pre-create destination at expected path (slug derives from title)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const evolveDir = join(tmpDir, "development-records", "evolve");
    mkdirSync(evolveDir, { recursive: true });
    writeFileSync(join(evolveDir, `${today}-collision-test.md`), "preexisting content", "utf-8");

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/이미 파일이 존재합니다/);
  });

  it("commit_design_doc with custom commitMessage echoes message in payload", () => {
    setupGitRepo(tmpDir);
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-COMMIT-005", { title: "custom message scope" });
    writeDesignDocDraft(paths);

    const result = executeApply(
      paths,
      {
        type: "commit_design_doc",
        commitMessage: "docs(evolve): custom message override",
      },
      { projectRoot: tmpDir },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data?.commitMessage).toBe("docs(evolve): custom message override");

    // git log 에 custom message 기록됨
    const log = execFileSync("git", ["log", "--oneline", "-1"], { cwd: tmpDir, encoding: "utf-8" });
    expect(log).toContain("docs(evolve): custom message override");
  });

  it("commit_design_doc emits apply.started BEFORE git commit (CONS-1 ordering)", () => {
    setupGitRepo(tmpDir);
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-LIFECYCLE-001", { title: "ordering verify" });
    writeDesignDocDraft(paths);

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(true);

    // Event order: apply.started must precede apply.completed (durable evidence
    // is recorded *before* file/git side effects)
    const events = readEvents(paths.events);
    const applyStartedIdx = events.findIndex(e => e.type === "apply.started");
    const applyCompletedIdx = events.findIndex(e => e.type === "apply.completed");
    expect(applyStartedIdx).toBeGreaterThanOrEqual(0);
    expect(applyCompletedIdx).toBeGreaterThan(applyStartedIdx);
  });

  it("commit_design_doc rolls back destination on git failure", () => {
    // No git init → git add will fail
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-ROLLBACK-001", { title: "rollback test" });
    const draftPath = writeDesignDocDraft(paths);

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/git commit 실패/);

    // Destination rolled back, source preserved (recovery)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const expectedDest = join(tmpDir, "development-records", "evolve", `${today}-rollback-test.md`);
    expect(existsSync(expectedDest)).toBe(false);
    expect(existsSync(draftPath)).toBe(true);

    // apply.started 는 ledger 에 남아있음 (durable evidence — caller 가 재시도 시
    // 동일 lifecycle 진단 가능)
    const events = readEvents(paths.events);
    expect(events.some(e => e.type === "apply.started")).toBe(true);
    expect(events.some(e => e.type === "apply.completed")).toBe(false);
  });

  it("apply.completed without preceding apply.started is rejected (gate-guard Rule 5f)", () => {
    // Process scope at surface_confirmed. Try to emit apply.completed directly.
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-LIFECYCLE-002");

    const result = appendScopeEvent(paths, {
      type: "apply.completed",
      actor: "agent",
      payload: { result: "naked completion attempt" },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/apply\.started 가 기록된 상태에서만/);
  });

  // ─── post-round 2 review (NEW-CONS-1): Rule 5g process_artifact invariant ───
  it("process apply.completed without process_artifact is rejected (gate-guard Rule 5g)", () => {
    // Process scope at surface_confirmed with apply.started already recorded —
    // but apply.completed payload missing process_artifact (commit_design_doc 우회 시도)
    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-RULE5G-001");

    // 먼저 apply.started 기록 (Rule 5f 통과)
    const startedResult = appendScopeEvent(paths, {
      type: "apply.started",
      actor: "agent",
      payload: { build_spec_hash: "" },
    });
    expect(startedResult.success).toBe(true);

    // process_artifact 없이 apply.completed 시도 → Rule 5g rejection
    const completedResult = appendScopeEvent(paths, {
      type: "apply.completed",
      actor: "agent",
      payload: { result: "bypass commit_design_doc" },
    });
    expect(completedResult.success).toBe(false);
    if (completedResult.success) return;
    expect(completedResult.reason).toMatch(/process_artifact .* 모두 기록되어야 합니다/);
  });

  // ─── post-round 2 review (UF-AX-1): commit SHA in process_artifact ───
  it("commit_design_doc records commit SHA in process_artifact + path-bound commit", () => {
    setupGitRepo(tmpDir);

    // Pre-stage an unrelated change to verify path-binding (commit 에 포함되면 안 됨)
    writeFileSync(join(tmpDir, "unrelated.txt"), "should not be committed by us\n", "utf-8");
    execFileSync("git", ["add", "unrelated.txt"], { cwd: tmpDir });

    const paths = setupSurfaceConfirmedProcessScope(tmpDir, "SC-PROC-UFAX1-001", { title: "path bind verify" });
    writeDesignDocDraft(paths);

    const result = executeApply(paths, { type: "commit_design_doc" }, { projectRoot: tmpDir });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // process_artifact 의 commit_sha 가 채워졌는가
    const completedEvent = readEvents(paths.events).find(e => e.type === "apply.completed");
    expect(completedEvent).toBeDefined();
    const completedPayload = completedEvent!.payload as { process_artifact?: { commit_sha?: string } };
    expect(completedPayload.process_artifact?.commit_sha).toBeDefined();
    expect(completedPayload.process_artifact!.commit_sha).toMatch(/^[0-9a-f]{40}$/);

    // git log 의 HEAD commit 이 우리가 기록한 SHA 와 동일
    const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: tmpDir, encoding: "utf-8" }).trim();
    expect(completedPayload.process_artifact!.commit_sha).toBe(headSha);

    // Path-bind 검증: HEAD commit 이 unrelated.txt 를 *포함하지 않음*
    const filesInCommit = execFileSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
      { cwd: tmpDir, encoding: "utf-8" },
    ).trim().split("\n");
    expect(filesInCommit).toContain(`development-records/evolve/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-path-bind-verify.md`);
    expect(filesInCommit).not.toContain("unrelated.txt");

    // unrelated.txt 는 여전히 staged 상태 (우리 commit 영향 받지 않음)
    const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: tmpDir, encoding: "utf-8" }).trim();
    expect(stagedFiles).toContain("unrelated.txt");
  });
});
