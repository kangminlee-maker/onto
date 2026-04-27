import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  executeReconstructStart,
  executeReconstructExplore,
  executeReconstructComplete,
  executeReconstructConfirm,
} from "./reconstruct.js";
import type { ReconstructSessionState } from "./reconstruct.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = join(tmpdir(), `reconstruct-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpRoot, { recursive: true });
});
afterEach(() => {
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

function readStateFile(sessionRoot: string): ReconstructSessionState {
  return JSON.parse(readFileSync(join(sessionRoot, "reconstruct-state.json"), "utf-8"));
}

describe("executeReconstructStart", () => {
  it("session 초기화: gathering_context 상태로 시작", () => {
    const result = executeReconstructStart({
      source: "./src",
      intent: "recover domain ontology",
      sessionsDir: tmpRoot,
      sessionId: "test-001",
    });

    expect(result.success).toBe(true);
    expect(result.session_id).toBe("test-001");
    expect(result.state.current_state).toBe("gathering_context");
    expect(result.state.source).toBe("./src");
    expect(result.state.intent).toBe("recover domain ontology");
    expect(result.state.explore_invocations).toBe(0);
    expect(result.state.ontology_draft_path).toBeNull();
    expect(result.state.principal_review_status).toBe("pending");
  });

  it("state 파일이 session root 에 저장된다", () => {
    const result = executeReconstructStart({
      source: "./src",
      intent: "test",
      sessionsDir: tmpRoot,
      sessionId: "test-002",
    });

    const persisted = readStateFile(result.session_root);
    expect(persisted.session_id).toBe("test-002");
    expect(persisted.current_state).toBe("gathering_context");
  });

  it("중복 session id 는 에러", () => {
    executeReconstructStart({
      source: "./src",
      intent: "first",
      sessionsDir: tmpRoot,
      sessionId: "dup",
    });

    expect(() =>
      executeReconstructStart({
        source: "./src",
        intent: "second",
        sessionsDir: tmpRoot,
        sessionId: "dup",
      }),
    ).toThrow(/session already exists/);
  });

  it("source 가 비어있으면 에러", () => {
    expect(() =>
      executeReconstructStart({
        source: "   ",
        intent: "x",
        sessionsDir: tmpRoot,
      }),
    ).toThrow(/source is required/);
  });

  it("intent 가 비어있으면 에러", () => {
    expect(() =>
      executeReconstructStart({
        source: "./src",
        intent: "",
        sessionsDir: tmpRoot,
      }),
    ).toThrow(/intent is required/);
  });

  it("session-id 미지정 시 date-hex 형식으로 자동 생성", () => {
    const result = executeReconstructStart({
      source: "./src",
      intent: "auto",
      sessionsDir: tmpRoot,
    });

    expect(result.session_id).toMatch(/^\d{8}-[0-9a-f]+$/);
  });
});

describe("executeReconstructExplore", () => {
  function startFixture(id: string = "x1") {
    return executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: id,
    });
  }

  it("gathering_context → exploring 전이 + invocation 증가", async () => {
    startFixture("e1");

    const result = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "e1",
    });

    expect(result.success).toBe(true);
    expect(result.state.current_state).toBe("exploring");
    expect(result.state.explore_invocations).toBe(1);
  });

  it("여러 번 호출 시 invocations 누적", async () => {
    startFixture("e2");

    await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "e2" });
    await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "e2" });
    const result = await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "e2" });

    expect(result.state.explore_invocations).toBe(3);
  });

  it("존재하지 않는 session id 는 에러", async () => {
    await expect(
      executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "nope" }),
    ).rejects.toThrow(/session not found/);
  });

  it("converted 이후 explore 는 에러", async () => {
    startFixture("e3");
    await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "e3" });
    executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "e3" });

    await expect(
      executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "e3" }),
    ).rejects.toThrow(/already converted/);
  });
});

describe("executeReconstructComplete", () => {
  async function startAndExplore(id: string) {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: id,
    });
    await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: id });
  }

  it("exploring → converted 전이 + ontology-draft.md 생성", async () => {
    await startAndExplore("c1");

    const result = executeReconstructComplete({
      sessionsDir: tmpRoot,
      sessionId: "c1",
    });

    expect(result.success).toBe(true);
    expect(result.state.current_state).toBe("converted");
    expect(result.state.ontology_draft_path).toBe(join(tmpRoot, "c1", "ontology-draft.md"));
    expect(existsSync(result.state.ontology_draft_path!)).toBe(true);
  });

  it("draft 파일에 source/intent/invocations 가 포함된다", async () => {
    await startAndExplore("c2");
    await executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "c2" });

    executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "c2" });

    const draft = readFileSync(join(tmpRoot, "c2", "ontology-draft.md"), "utf-8");
    expect(draft).toContain("source: ./src");
    expect(draft).toContain("intent: t");
    expect(draft).toContain("explore invocations: 2");
  });

  it("Principal 검증 경로: complete 는 principal_review_status = requested", async () => {
    await startAndExplore("c3");

    const result = executeReconstructComplete({
      sessionsDir: tmpRoot,
      sessionId: "c3",
    });

    expect(result.state.principal_review_status).toBe("requested");
  });

  it("explore 없이 complete 는 에러 (gathering_context 에서 직접 complete 금지)", () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c4",
    });

    expect(() =>
      executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "c4" }),
    ).toThrow(/requires at least one explore/);
  });

  it("이미 converted 된 session 재 complete 는 에러", async () => {
    await startAndExplore("c5");
    executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "c5" });

    expect(() =>
      executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "c5" }),
    ).toThrow(/already converted/);
  });

  it("존재하지 않는 session id 는 에러", () => {
    expect(() =>
      executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "nope" }),
    ).toThrow(/session not found/);
  });
});

describe("confirm (W-B-07: principal confirmation seat)", () => {
  function startExploreComplete(id: string) {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: id,
    });
    executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: id });
    return executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: id });
  }

  it("confirm --verdict passed 는 principal_review_status = passed", () => {
    startExploreComplete("cf1");

    const result = executeReconstructConfirm({
      sessionsDir: tmpRoot,
      sessionId: "cf1",
      verdict: "passed",
    });

    expect(result.state.principal_review_status).toBe("passed");
    expect(result.state.current_state).toBe("converted");
  });

  it("confirm --verdict rejected 는 principal_review_status = rejected", () => {
    startExploreComplete("cf2");

    const result = executeReconstructConfirm({
      sessionsDir: tmpRoot,
      sessionId: "cf2",
      verdict: "rejected",
    });

    expect(result.state.principal_review_status).toBe("rejected");
  });

  it("exploring 상태에서 confirm 은 에러", () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "cf3",
    });
    executeReconstructExplore({ sessionsDir: tmpRoot, sessionId: "cf3" });

    expect(() =>
      executeReconstructConfirm({
        sessionsDir: tmpRoot,
        sessionId: "cf3",
        verdict: "passed",
      }),
    ).toThrow(/expected "converted"/);
  });

  it("이미 confirm 된 session 재 confirm 은 에러", () => {
    startExploreComplete("cf4");
    executeReconstructConfirm({
      sessionsDir: tmpRoot,
      sessionId: "cf4",
      verdict: "passed",
    });

    expect(() =>
      executeReconstructConfirm({
        sessionsDir: tmpRoot,
        sessionId: "cf4",
        verdict: "rejected",
      }),
    ).toThrow(/expected "requested"/);
  });

  it("confirm 결과가 state 파일에 persist", () => {
    const completed = startExploreComplete("cf5");
    executeReconstructConfirm({
      sessionsDir: tmpRoot,
      sessionId: "cf5",
      verdict: "passed",
    });

    const root = join(tmpRoot, "cf5");
    const persisted = readStateFile(root);
    expect(persisted.principal_review_status).toBe("passed");
  });
});

describe("end-to-end bounded path (review 4-step: start→explore→complete→confirm)", () => {
  it("start → explore → complete → confirm 전체 작동", async () => {
    const started = executeReconstructStart({
      source: "./src",
      intent: "E2E",
      sessionsDir: tmpRoot,
      sessionId: "e2e",
    });
    expect(started.state.current_state).toBe("gathering_context");

    const explored = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "e2e",
    });
    expect(explored.state.current_state).toBe("exploring");

    const completed = executeReconstructComplete({
      sessionsDir: tmpRoot,
      sessionId: "e2e",
    });
    expect(completed.state.current_state).toBe("converted");
    expect(completed.state.principal_review_status).toBe("requested");

    const confirmed = executeReconstructConfirm({
      sessionsDir: tmpRoot,
      sessionId: "e2e",
      verdict: "passed",
    });
    expect(confirmed.state.principal_review_status).toBe("passed");

    const persisted = readStateFile(started.session_root);
    expect(persisted.current_state).toBe("converted");
    expect(persisted.principal_review_status).toBe("passed");
    expect(persisted.explore_invocations).toBe(1);
    expect(persisted.ontology_draft_path).not.toBeNull();
  });
});
