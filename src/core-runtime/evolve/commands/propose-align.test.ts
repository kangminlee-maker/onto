import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { executeProposeAlign } from "./propose-align.js";
import { createScope } from "../../scope-runtime/scope-manager.js";
import { appendScopeEvent } from "../../scope-runtime/event-pipeline.js";
import { readEvents } from "../../scope-runtime/event-store.js";
import { reduce } from "../../scope-runtime/reducer.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sprint-propose-align-"));
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function setupGrounded() {
  const paths = createScope(tmpDir, "SC-PA-001");
  appendScopeEvent(paths, {
    type: "scope.created",
    actor: "user",
    payload: {
      title: "Propose align test",
      description: "test scope",
      entry_mode: "experience",
    },
  });
  appendScopeEvent(paths, {
    type: "grounding.started",
    actor: "system",
    payload: {
      sources: [{ type: "add-dir", path_or_url: "/test" }],
    },
  });
  appendScopeEvent(paths, {
    type: "grounding.completed",
    actor: "system",
    payload: {
      snapshot_revision: 1,
      source_hashes: { "add-dir:/test": "h1" },
      perspective_summary: { experience: 1, code: 1, policy: 1 },
    },
  });
  return paths;
}

const VALID_INPUT = JSON.stringify({
  interpreted_direction: "test direction",
  proposed_scope: { in: ["feature X"], out: ["feature Y"] },
  scenarios: ["scenario 1"],
  as_is: { experience: "exp-baseline", policy: "policy-baseline", code: "code-baseline" },
  constraints: [
    {
      summary: "constraint 1",
      perspective: "code",
      severity: "required",
      decision_owner: "builder",
      impact_if_ignored: "breaks flow",
      source_refs: [{ source: "code", detail: "src/foo.ts" }],
      why_conflict: "conflict between X and Y",
      scale: "medium",
    },
  ],
  decision_questions: ["Q1?"],
});

describe("executeProposeAlign", () => {
  it("grounded + valid input → align_proposed + packet + events", () => {
    const paths = setupGrounded();
    const result = executeProposeAlign(paths, VALID_INPUT);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.constraints_registered).toBe(1);
    expect(result.next_state).toBe("align_proposed");

    const packet = readFileSync(result.packet_path, "utf-8");
    expect(packet).toContain("Align Packet");
    expect(packet).toContain("test direction");
    expect(packet).toContain("feature X");

    const events = readEvents(paths.events);
    const state = reduce(events);
    expect(state.current_state).toBe("align_proposed");
    expect(state.constraint_pool.summary.total).toBe(1);
  });

  it("rejects when not in grounded state", () => {
    const paths = createScope(tmpDir, "SC-PA-002");
    appendScopeEvent(paths, {
      type: "scope.created",
      actor: "user",
      payload: { title: "t", description: "d", entry_mode: "experience" },
    });
    const result = executeProposeAlign(paths, VALID_INPUT);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain("grounded");
  });

  it("rejects invalid JSON", () => {
    const paths = setupGrounded();
    const result = executeProposeAlign(paths, "not-json");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain("Failed to parse JSON");
  });

  it("rejects missing required fields", () => {
    const paths = setupGrounded();
    const result = executeProposeAlign(paths, JSON.stringify({}));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain("Invalid propose-align input");
  });

  it("rejects empty scope_in", () => {
    const paths = setupGrounded();
    const bad = JSON.stringify({
      interpreted_direction: "x",
      proposed_scope: { in: [], out: [] },
      as_is: { experience: "", policy: "", code: "" },
    });
    const result = executeProposeAlign(paths, bad);
    expect(result.success).toBe(false);
  });

  it("accepts zero-constraints input (empty tensions ok per renderer)", () => {
    const paths = setupGrounded();
    const input = JSON.stringify({
      interpreted_direction: "x",
      proposed_scope: { in: ["a"], out: [] },
      as_is: { experience: "e", policy: "p", code: "c" },
      constraints: [],
    });
    const result = executeProposeAlign(paths, input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.constraints_registered).toBe(0);
  });
});
