import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import yaml from "yaml";
import {
  executeReconstructStart,
  executeReconstructExplore,
  executeReconstructComplete,
  executeReconstructConfirm,
  composeRawMetaForCycle,
  composeRawElementsForCycle,
} from "./reconstruct.js";
import type {
  ReconstructExploreCoordinatorOptions,
  ReconstructSessionState,
} from "./reconstruct.js";
import type { CoordinatorDeps, CoordinatorResult } from "../../reconstruct/coordinator.js";
import type { ProposerDirective } from "../../reconstruct/proposer-directive-types.js";
import type { ReviewerDirective } from "../../reconstruct/reviewer-directive-types.js";
import type {
  HookAlphaEntityInput,
  HookAlphaManifestInput,
} from "../../reconstruct/hook-alpha.js";
import type { IntentInference } from "../../reconstruct/wip-element-types.js";

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

  // PR #241 review C-3 fix: lifecycle gate
  it("coordinator failure event 후 complete → 거부 (lifecycle gate)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-fail-1",
    });
    // Manually simulate a failed coordinator cycle by writing state with a
    // failure event. Using the helper would also work but inline construction
    // is clearer for this gate test.
    const root = join(tmpRoot, "c-fail-1");
    const stateBefore = JSON.parse(
      readFileSync(join(root, "reconstruct-state.json"), "utf-8"),
    );
    const stateWithFailure = {
      ...stateBefore,
      current_state: "exploring",
      explore_invocations: 1,
      events: [
        {
          type: "coordinator_failed_alpha",
          emitted_at: "2026-04-27T20:00:00Z",
          detail: "alpha kind=failed",
        },
      ],
    };
    writeFileSync(
      join(root, "reconstruct-state.json"),
      JSON.stringify(stateWithFailure, null, 2),
      "utf-8",
    );

    expect(() =>
      executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "c-fail-1" }),
    ).toThrow(/explore cycle to be successful.*coordinator_failed_alpha/);
  });

  it("coordinator_completed event 후 complete → 정상 진행", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-ok-1",
    });
    const root = join(tmpRoot, "c-ok-1");
    const stateBefore = JSON.parse(
      readFileSync(join(root, "reconstruct-state.json"), "utf-8"),
    );
    const stateOk = {
      ...stateBefore,
      current_state: "exploring",
      explore_invocations: 1,
      events: [
        {
          type: "coordinator_completed",
          emitted_at: "2026-04-27T20:00:00Z",
          detail: "element_updates_count=1, write_intent_inference_to_raw_yml=true",
        },
      ],
    };
    writeFileSync(
      join(root, "reconstruct-state.json"),
      JSON.stringify(stateOk, null, 2),
      "utf-8",
    );

    const result = executeReconstructComplete({
      sessionsDir: tmpRoot,
      sessionId: "c-ok-1",
    });
    expect(result.state.current_state).toBe("converted");
  });

  // PR #241 review round 2 UF-STRUCTURE-1 fix
  it("config_parse_failed event 후 complete → 거부 (cycle-terminal event)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-parse-fail-1",
    });
    const root = join(tmpRoot, "c-parse-fail-1");
    const stateBefore = JSON.parse(
      readFileSync(join(root, "reconstruct-state.json"), "utf-8"),
    );
    const stateWithParseFailure = {
      ...stateBefore,
      // appendCycleTerminalEventBestEffort transitions current_state to
      // `exploring` in real production — mirror that here so the lifecycle
      // gate (downstream of the gathering_context check) actually fires.
      current_state: "exploring",
      events: [
        {
          type: "config_parse_failed",
          emitted_at: "2026-04-27T20:00:00Z",
          detail: "Failed to parse .onto/config.yml: bad indentation",
        },
      ],
    };
    writeFileSync(
      join(root, "reconstruct-state.json"),
      JSON.stringify(stateWithParseFailure, null, 2),
      "utf-8",
    );

    expect(() =>
      executeReconstructComplete({
        sessionsDir: tmpRoot,
        sessionId: "c-parse-fail-1",
      }),
    ).toThrow(/explore cycle to be successful.*config_parse_failed/);
  });

  // PR #242 round 2 review conditional consensus fix (coverage lens):
  // the new cycle-terminal event types added in round 1 fix-up
  // (stage1_scanner_failed / wire_build_failed) need explicit lifecycle
  // gate coverage so the filter expansion is locked in by tests.
  it("stage1_scanner_failed event 후 complete → 거부 (cycle-terminal event)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-stage1-fail-1",
    });
    const root = join(tmpRoot, "c-stage1-fail-1");
    const stateBefore = JSON.parse(
      readFileSync(join(root, "reconstruct-state.json"), "utf-8"),
    );
    const stateWithStage1Failure = {
      ...stateBefore,
      current_state: "exploring",
      events: [
        {
          type: "stage1_scanner_failed",
          emitted_at: "2026-04-27T20:00:00Z",
          detail: "validation (orphan_module_ref): entity \"E1\".module_id=\"M-NOT\" not in module_inventory",
        },
      ],
    };
    writeFileSync(
      join(root, "reconstruct-state.json"),
      JSON.stringify(stateWithStage1Failure, null, 2),
      "utf-8",
    );

    expect(() =>
      executeReconstructComplete({
        sessionsDir: tmpRoot,
        sessionId: "c-stage1-fail-1",
      }),
    ).toThrow(/explore cycle to be successful.*stage1_scanner_failed/);
  });

  it("wire_build_failed event 후 complete → 거부 (cycle-terminal event)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-wire-fail-1",
    });
    const root = join(tmpRoot, "c-wire-fail-1");
    const stateBefore = JSON.parse(
      readFileSync(join(root, "reconstruct-state.json"), "utf-8"),
    );
    const stateWithWireFailure = {
      ...stateBefore,
      current_state: "exploring",
      events: [
        {
          type: "wire_build_failed",
          emitted_at: "2026-04-27T20:00:00Z",
          detail: "ENOENT: no such file or directory",
        },
      ],
    };
    writeFileSync(
      join(root, "reconstruct-state.json"),
      JSON.stringify(stateWithWireFailure, null, 2),
      "utf-8",
    );

    expect(() =>
      executeReconstructComplete({
        sessionsDir: tmpRoot,
        sessionId: "c-wire-fail-1",
      }),
    ).toThrow(/explore cycle to be successful.*wire_build_failed/);
  });

  it("placeholder mode (events 부재) → backward compat 통과", async () => {
    // Sessions that ran without --coordinator (no coordinator events recorded)
    // bypass the lifecycle gate — tested implicitly by the 'exploring →
    // converted 전이' test above, but explicit-named here for clarity.
    executeReconstructStart({
      source: "./src",
      intent: "t",
      sessionsDir: tmpRoot,
      sessionId: "c-legacy-1",
    });
    await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "c-legacy-1",
    });
    const result = executeReconstructComplete({
      sessionsDir: tmpRoot,
      sessionId: "c-legacy-1",
    });
    expect(result.state.current_state).toBe("converted");
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

// =============================================================================
// raw-yml integration (post-PR242 follow-up)
//
// Verifies the post-Phase 3.5 writer wire — coordinator's `completed` cycle
// must produce a `raw.yml` artifact at the session root with §4.2-valid meta,
// or emit a typed audit event on validation/FS failure.
//
// Coverage:
//   1. v0 fallback (all switches off) — meta.inference_mode="none" +
//      fallback_reason="user_flag", elements without intent_inference block.
//   2. v1 degraded (manifest tier=minimal forces degraded mode) — meta.
//      inference_mode="degraded" + degraded_reason="pack_tier_minimal",
//      element-level intent_inference block included.
//   3. composeRawMetaForCycle — direct unit verification for v0 + v1 paths.
//   4. raw_yml_meta_invariant_violation event — surfaces when
//      requestedInferenceMode + manifest tier disagree (full + minimal).
//   5. coordinator failure (e.g. failed_alpha) — no raw_yml_* event emitted.
// =============================================================================

const FIXED_NOW_RAW = new Date("2026-04-28T12:00:00Z");
const RAW_RUNTIME_VERSION = "v1.0.0-test";
const RAW_PROPOSER_CV = "1.0";

function makeStubManifest(
  qualityTier: "full" | "partial" | "minimal" = "minimal",
): HookAlphaManifestInput {
  return {
    manifest_schema_version: "1.0",
    domain_name: "stub-domain",
    domain_manifest_version: "1.0.0",
    version_hash: "stub" + "0".repeat(60),
    quality_tier: qualityTier,
    referenced_files: [],
  };
}

function makeStubEntity(): HookAlphaEntityInput {
  return {
    id: "E1",
    type: "entity",
    name: "Order",
    definition: "An order placed by a customer",
    certainty: "observed",
    source: { locations: ["src/order.ts:10"] },
    relations_summary: [],
  };
}

function makeMockProposer(): () => Promise<ProposerDirective> {
  // outcome=`gap` matches the stub manifest's empty `referenced_files` —
  // any `domain_refs` would trigger `hallucinated_manifest_ref` reject.
  // `state_reason` mandatory per §3.3 r5.
  return async () => ({
    proposals: [
      {
        target_element_id: "E1",
        outcome: "gap" as const,
        state_reason: "mock spawn — no LLM invoked (test fixture)",
      },
    ],
    provenance: {
      proposed_at: FIXED_NOW_RAW.toISOString(),
      proposed_by: "rationale-proposer",
      proposer_contract_version: RAW_PROPOSER_CV,
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "stub" + "0".repeat(60),
      domain_quality_tier: "minimal",
      session_id: "raw-test",
      runtime_version: RAW_RUNTIME_VERSION,
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: [],
    },
  });
}

function makeMockReviewer(): () => Promise<ReviewerDirective> {
  return async () => ({
    updates: [{ target_element_id: "E1", operation: "confirm" as const }],
    provenance: {
      reviewed_at: FIXED_NOW_RAW.toISOString(),
      reviewed_by: "rationale-reviewer",
      reviewer_contract_version: "1.0",
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "stub" + "0".repeat(60),
      domain_quality_tier: "minimal",
      session_id: "raw-test",
      runtime_version: RAW_RUNTIME_VERSION,
      wip_snapshot_hash: "wip" + "0".repeat(61),
      domain_files_content_hash: "dom" + "0".repeat(61),
      hash_algorithm: "yaml@2.8.2 + sha256",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: [],
    },
  });
}

function makeMockDeps(overrides: Partial<CoordinatorDeps> = {}): CoordinatorDeps {
  return {
    spawnProposer: makeMockProposer(),
    spawnReviewer: makeMockReviewer(),
    now: () => FIXED_NOW_RAW,
    systemPurpose: "raw-yml-integration-test",
    ...overrides,
  };
}

function makeFullV1Config(): unknown {
  return {
    reconstruct: {
      v1_inference: { enabled: true },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: true },
    },
  };
}

function makeFullV0Config(): unknown {
  return {
    reconstruct: {
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: false },
      write_intent_inference_to_raw_yml: { enabled: false },
    },
  };
}

const RAW_REVIEWER_CV = "1.0";

function makeCoordinatorOptions(args: {
  configRaw: unknown;
  manifestTier?: "full" | "partial" | "minimal";
  requestedInferenceMode?: "full" | "degraded";
  deps?: CoordinatorDeps;
}): ReconstructExploreCoordinatorOptions {
  return {
    configRaw: args.configRaw,
    entityList: [makeStubEntity()],
    manifest: makeStubManifest(args.manifestTier),
    injectedFiles: [],
    proposerContractVersion: RAW_PROPOSER_CV,
    reviewerContractVersion: RAW_REVIEWER_CV,
    wipSnapshotHash: "wip" + "0".repeat(61),
    domainFilesContentHash: "dom" + "0".repeat(61),
    phase3Responses: {
      received_at: FIXED_NOW_RAW.toISOString(),
      global_reply: "confirmed",
      rationale_decisions: [],
      batch_actions: [],
    },
    phase3JudgedAt: FIXED_NOW_RAW.toISOString(),
    renderedElementIds: new Set(),
    throttledOutAddressableIds: new Set(),
    deps: args.deps ?? makeMockDeps(),
    runtimeVersion: RAW_RUNTIME_VERSION,
    stage: 1,
    ...(args.requestedInferenceMode !== undefined
      ? { requestedInferenceMode: args.requestedInferenceMode }
      : {}),
  };
}

describe("raw-yml integration (post-Phase 3.5 writer wire)", () => {
  it("v0 fallback cycle → raw.yml written + raw_yml_written event + element-level intent_inference omitted", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "raw-yml v0 path",
      sessionsDir: tmpRoot,
      sessionId: "raw-v0",
    });

    const result = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-v0",
      coordinator: makeCoordinatorOptions({ configRaw: makeFullV0Config() }),
    });

    expect(result.coordinator_result?.kind).toBe("completed");

    const events = result.state.events ?? [];
    const writtenEvent = events.find((e) => e.type === "raw_yml_written");
    expect(writtenEvent).toBeDefined();
    expect(writtenEvent?.detail).toMatch(/element_count=1/);
    expect(writtenEvent?.detail).toMatch(/intent_inference_included=false/);

    const rawPath = join(tmpRoot, "raw-v0", "raw.yml");
    expect(existsSync(rawPath)).toBe(true);
    const parsed = yaml.parse(readFileSync(rawPath, "utf-8"));
    expect(parsed.meta.inference_mode).toBe("none");
    expect(parsed.meta.fallback_reason).toBe("user_flag");
    expect(parsed.meta.domain_quality_tier).toBeNull();
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0].id).toBe("E1");
    expect(parsed.elements[0].intent_inference).toBeUndefined();
  });

  it("v1 degraded cycle (minimal manifest) → raw.yml written + element-level intent_inference included", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "raw-yml v1 degraded",
      sessionsDir: tmpRoot,
      sessionId: "raw-v1",
    });

    const result = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-v1",
      coordinator: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "degraded",
        manifestTier: "minimal",
      }),
    });

    expect(result.coordinator_result?.kind).toBe("completed");

    const events = result.state.events ?? [];
    const writtenEvent = events.find((e) => e.type === "raw_yml_written");
    expect(writtenEvent).toBeDefined();
    expect(writtenEvent?.detail).toMatch(/intent_inference_included=true/);

    const rawPath = join(tmpRoot, "raw-v1", "raw.yml");
    expect(existsSync(rawPath)).toBe(true);
    const parsed = yaml.parse(readFileSync(rawPath, "utf-8"));
    expect(parsed.meta.inference_mode).toBe("degraded");
    expect(parsed.meta.degraded_reason).toBe("pack_tier_minimal");
    expect(parsed.meta.fallback_reason).toBeNull();
    expect(parsed.meta.domain_quality_tier).toBe("minimal");
    expect(parsed.elements[0].intent_inference).toBeDefined();
  });

  it("requestedInferenceMode='full' with minimal manifest → raw_yml_meta_invariant_violation event, no raw.yml file", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "raw-yml invariant fail",
      sessionsDir: tmpRoot,
      sessionId: "raw-bad",
    });

    const result = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-bad",
      coordinator: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "full",
        manifestTier: "minimal",
      }),
    });

    expect(result.coordinator_result?.kind).toBe("completed");

    const events = result.state.events ?? [];
    const violation = events.find(
      (e) => e.type === "raw_yml_meta_invariant_violation",
    );
    expect(violation).toBeDefined();
    // Validator's `full` branch fires first: domain_quality_tier matches the
    // manifest tier (minimal), so the top-level mismatch guard skips, but the
    // `inference_mode=full requires domain_quality_tier="full"` check rejects.
    expect(violation?.detail).toContain("raw_yml_meta_invariant_violation");
    expect(violation?.detail).toMatch(
      /inference_mode=full requires domain_quality_tier="full"/,
    );

    expect(existsSync(join(tmpRoot, "raw-bad", "raw.yml"))).toBe(false);
    // The Phase 3.5 pipeline still recorded its own success (the
    // `coordinator_completed` event remains for audit), but post-PR244
    // consensus #2 fail-close: artifact failure is now cycle-terminal and
    // blocks `complete`. See the dedicated fail-close test below.
    expect(events.find((e) => e.type === "coordinator_completed")).toBeDefined();
  });

  it("raw_yml_meta_invariant_violation event blocks complete (fail-close)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "fail-close",
      sessionsDir: tmpRoot,
      sessionId: "raw-fc-1",
    });

    await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-fc-1",
      coordinator: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "full",
        manifestTier: "minimal",
      }),
    });

    // Fail-close: complete must reject because the most recent cycle-terminal
    // event is `raw_yml_meta_invariant_violation`, not `coordinator_completed`.
    expect(() =>
      executeReconstructComplete({ sessionsDir: tmpRoot, sessionId: "raw-fc-1" }),
    ).toThrow(/explore cycle to be successful.*raw_yml_meta_invariant_violation/);
  });

  it("reviewer contract version flows from coord opts (no literal in compose)", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "reviewer-cv",
      sessionsDir: tmpRoot,
      sessionId: "raw-cv",
    });

    // Override the SSOT to a sentinel value the literal "1.0" would never
    // accidentally produce — the meta must reflect the override exactly.
    const coord = makeCoordinatorOptions({
      configRaw: makeFullV1Config(),
      requestedInferenceMode: "degraded",
      manifestTier: "minimal",
    });
    coord.reviewerContractVersion = "9.9-sentinel";

    await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-cv",
      coordinator: coord,
    });

    const rawPath = join(tmpRoot, "raw-cv", "raw.yml");
    expect(existsSync(rawPath)).toBe(true);
    const parsed = yaml.parse(readFileSync(rawPath, "utf-8"));
    expect(parsed.meta.rationale_reviewer_contract_version).toBe(
      "9.9-sentinel",
    );
  });

  it("coordinator failure (failed_alpha) → no raw_yml_* events emitted", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "raw-yml failed cycle",
      sessionsDir: tmpRoot,
      sessionId: "raw-fail",
    });

    const failingDeps = makeMockDeps({
      spawnProposer: async () => {
        throw new Error("simulated proposer failure");
      },
    });

    const result = await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-fail",
      coordinator: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "degraded",
        manifestTier: "minimal",
        deps: failingDeps,
      }),
    });

    expect(result.coordinator_result?.kind).toBe("failed_alpha");

    const events = result.state.events ?? [];
    expect(events.some((e) => e.type.startsWith("raw_yml_"))).toBe(false);
    expect(existsSync(join(tmpRoot, "raw-fail", "raw.yml"))).toBe(false);
  });

  it("placeholder mode (no coordinator) → no raw.yml file written", async () => {
    executeReconstructStart({
      source: "./src",
      intent: "placeholder",
      sessionsDir: tmpRoot,
      sessionId: "raw-placeholder",
    });

    await executeReconstructExplore({
      sessionsDir: tmpRoot,
      sessionId: "raw-placeholder",
    });

    expect(existsSync(join(tmpRoot, "raw-placeholder", "raw.yml"))).toBe(false);
  });
});

describe("composeRawMetaForCycle (unit)", () => {
  function makeFakeCompletedResult(args: {
    v1On: boolean;
    alphaCompleted: boolean;
    gammaCompleted: boolean;
  }): Extract<CoordinatorResult, { kind: "completed" }> {
    const switches = {
      v1_inference: Object.freeze({ enabled: args.v1On }),
      phase3_rationale_review: Object.freeze({ enabled: args.v1On }),
      write_intent_inference_to_raw_yml: Object.freeze({ enabled: args.v1On }),
    };
    return {
      kind: "completed",
      switches,
      alpha: args.alphaCompleted
        ? {
            kind: "completed",
            nextState: "alpha_completed",
            setMetaStage: 2,
            elementUpdates: new Map<string, IntentInference>(),
            packMissingAreas: [],
            warnings: [],
          }
        : { kind: "skipped", nextState: "alpha_skipped", setMetaStage: 2 },
      gamma: args.gammaCompleted
        ? {
            kind: "completed",
            nextState: "gamma_completed",
            elementUpdates: new Map<string, IntentInference>(),
            warnings: [],
          }
        : { kind: "skipped_by_switch", reason: "phase3_rationale_review_disabled" },
      delta: null,
      phase35: {
        ok: true,
        elementUpdates: new Map<string, IntentInference>(),
        excludedFromSweep: new Set<string>(),
      },
      writeIntentInferenceToRawYml: args.v1On,
    };
  }

  it("v0 fallback — inference_mode=none, fallback_reason=user_flag, contract versions null", () => {
    const meta = composeRawMetaForCycle({
      result: makeFakeCompletedResult({
        v1On: false,
        alphaCompleted: false,
        gammaCompleted: false,
      }),
      manifest: makeStubManifest("minimal"),
      coord: makeCoordinatorOptions({ configRaw: makeFullV0Config() }),
    });

    expect(meta.inference_mode).toBe("none");
    expect(meta.fallback_reason).toBe("user_flag");
    expect(meta.degraded_reason).toBeNull();
    expect(meta.domain_quality_tier).toBeNull();
    expect(meta.rationale_proposer_contract_version).toBeNull();
    expect(meta.rationale_reviewer_contract_version).toBeNull();
    expect(meta.rationale_review_degraded).toBe(false);
  });

  it("v1 degraded with non-minimal manifest — degraded_reason=null (heuristic narrowed; validator rejects)", () => {
    // Post-PR244 review consensus #3: the prior `pack_optional_missing`
    // fallback for non-minimal degraded mode was removed. Composer returns
    // null, validator rejects (degraded mode requires non-null
    // degraded_reason), and the wire surfaces the gap as
    // raw_yml_meta_invariant_violation rather than a misleading heuristic.
    const meta = composeRawMetaForCycle({
      result: makeFakeCompletedResult({
        v1On: true,
        alphaCompleted: true,
        gammaCompleted: true,
      }),
      manifest: makeStubManifest("partial"),
      coord: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "degraded",
        manifestTier: "partial",
      }),
    });

    expect(meta.inference_mode).toBe("degraded");
    expect(meta.degraded_reason).toBeNull();
  });

  it("v1 degraded with minimal manifest — degraded_reason=pack_tier_minimal", () => {
    const meta = composeRawMetaForCycle({
      result: makeFakeCompletedResult({
        v1On: true,
        alphaCompleted: true,
        gammaCompleted: true,
      }),
      manifest: makeStubManifest("minimal"),
      coord: makeCoordinatorOptions({
        configRaw: makeFullV1Config(),
        requestedInferenceMode: "degraded",
      }),
    });

    expect(meta.inference_mode).toBe("degraded");
    expect(meta.degraded_reason).toBe("pack_tier_minimal");
    expect(meta.fallback_reason).toBeNull();
    expect(meta.domain_quality_tier).toBe("minimal");
    expect(meta.rationale_proposer_contract_version).toBe(RAW_PROPOSER_CV);
    expect(meta.rationale_reviewer_contract_version).toBe("1.0");
    expect(meta.step2c_review_state).toBe("completed");
  });
});

describe("composeRawElementsForCycle (unit)", () => {
  it("attaches intent_inference when elementUpdates has entry; omits otherwise", () => {
    const inf: IntentInference = {
      rationale_state: "principal_accepted",
      provenance: {
        proposed_at: FIXED_NOW_RAW.toISOString(),
        proposed_by: "rationale-proposer",
        proposer_contract_version: "1.0",
        manifest_schema_version: "1.0",
        domain_manifest_version: "1.0.0",
        domain_manifest_hash: "stub" + "0".repeat(60),
        domain_quality_tier: "minimal",
        session_id: "raw-test",
        runtime_version: RAW_RUNTIME_VERSION,
        input_chunks: 1,
        truncated_fields: [],
        effective_injected_files: [],
        gate_count: 1,
      },
    };
    const updates = new Map<string, IntentInference>([["E1", inf]]);
    const elements = composeRawElementsForCycle(
      [
        makeStubEntity(),
        { ...makeStubEntity(), id: "E2", name: "Customer" },
      ],
      updates,
    );

    expect(elements).toHaveLength(2);
    expect(elements[0]?.id).toBe("E1");
    expect(elements[0]?.intent_inference).toBe(inf);
    expect(elements[1]?.id).toBe("E2");
    expect(elements[1]?.intent_inference).toBeUndefined();
  });
});
