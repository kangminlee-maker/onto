// runtime-mirror-of: coordinator.ts CONTRACT
//
// Coordinator switch-gating + invariant-halt behavior tests.
//
// Cycle coverage (4 mode + audit signal + spy verification + C-2 malformed):
//   1. full v1 (all switches on)        → α + γ + δ + Phase 3.5 invoked
//   2. v1 without review                → α + δ + Phase 3.5 invoked, γ skipped_by_switch
//   3. v0 fallback (all switches off)   → α self-skips (inference_mode=none),
//                                          γ skipped_by_switch, δ not invoked
//   4. invariant violation              → halt before any Hook invocation
//   5. config-absent silent default     → onConfigAbsent emit + v1 mode applied
//   6. spy: switches off → spawnProposer / spawnReviewer 호출 0회 (§14.6 inv 2)
//   7. config_malformed (review C-2)    → array root / scalar root → halt with
//                                          kind="config_malformed"; onConfigAbsent
//                                          NOT fired; no Hook invocation

import { describe, expect, it, vi } from "vitest";
import {
  runReconstructCoordinator,
  type CoordinatorDeps,
  type CoordinatorInput,
} from "./coordinator.js";
import { buildPhase3SnapshotDocument } from "./phase3-snapshot-write.js";
import type { ProposerDirective } from "./proposer-directive-types.js";
import type { ReviewerDirective } from "./reviewer-directive-types.js";

// =============================================================================
// Fixtures
// =============================================================================

const FIXED_NOW = new Date("2026-04-27T12:00:00Z");
const SESSION_ID = "coord-session-001";
const RUNTIME_VERSION = "v1.0.0-test";
const PROPOSER_CV = "1.0";
const REVIEWER_CV = "1.0";

function makeInput(overrides: Partial<CoordinatorInput> = {}): CoordinatorInput {
  const entityList = [
    {
      id: "E1",
      type: "entity",
      name: "Order",
      definition: "An order placed by a customer",
      certainty: "observed" as const,
      source: { locations: ["src/order.ts:10"] },
      relations_summary: [],
    },
  ];
  const manifest = {
    manifest_schema_version: "1.0",
    domain_name: "coord-domain",
    domain_manifest_version: "1.0.0",
    version_hash: "deadbeef" + "0".repeat(56),
    quality_tier: "full" as const,
    referenced_files: [
      { path: "concepts.md", required: true, purpose: "concepts" },
    ],
  };
  const phase3Snapshot = buildPhase3SnapshotDocument({
    session_id: SESSION_ID,
    written_at: FIXED_NOW.toISOString(),
    intentInferences: new Map(),
  });
  return {
    configRaw: makeFullV1Config(),
    stage: 1,
    requestedInferenceMode: "full",
    entityList,
    manifest,
    injectedFiles: ["concepts.md"],
    sessionId: SESSION_ID,
    runtimeVersion: RUNTIME_VERSION,
    proposerContractVersion: PROPOSER_CV,
    wipSnapshotHash: "wip" + "0".repeat(61),
    domainFilesContentHash: "dom" + "0".repeat(61),
    phase3Responses: {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "confirmed",
      rationale_decisions: [
        { element_id: "E1", action: "accept", decided_at: FIXED_NOW.toISOString() },
      ],
      batch_actions: [],
    },
    phase3Snapshot,
    phase3JudgedAt: FIXED_NOW.toISOString(),
    renderedElementIds: new Set(["E1"]),
    throttledOutAddressableIds: new Set(),
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

function makeV1WithoutReviewConfig(): unknown {
  return {
    reconstruct: {
      v1_inference: { enabled: true },
      phase3_rationale_review: { enabled: false },
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

function makeInvariantViolationConfig(): unknown {
  return {
    reconstruct: {
      // phase3_rationale_review on while v1_inference off — invariant violated
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: false },
    },
  };
}

function makeMockProposer(): () => Promise<ProposerDirective> {
  return async () => ({
    proposals: [
      {
        target_element_id: "E1",
        outcome: "proposed" as const,
        inferred_meaning: "E1 represents a domain concept.",
        justification: "linked to concepts.md heading.",
        domain_refs: [
          {
            manifest_ref: "concepts.md",
            heading: "## Core Entities",
            excerpt: "E1 description excerpt",
          },
        ],
        confidence: "medium" as const,
      },
    ],
    provenance: {
      proposed_at: FIXED_NOW.toISOString(),
      proposed_by: "rationale-proposer",
      proposer_contract_version: PROPOSER_CV,
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "deadbeef" + "0".repeat(56),
      domain_quality_tier: "full",
      session_id: SESSION_ID,
      runtime_version: RUNTIME_VERSION,
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: ["concepts.md"],
    },
  });
}

function makeMockReviewer(): () => Promise<ReviewerDirective> {
  return async () => ({
    updates: [
      {
        target_element_id: "E1",
        operation: "confirm" as const,
      },
    ],
    provenance: {
      reviewed_at: FIXED_NOW.toISOString(),
      reviewed_by: "rationale-reviewer",
      reviewer_contract_version: REVIEWER_CV,
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "deadbeef" + "0".repeat(56),
      domain_quality_tier: "full",
      session_id: SESSION_ID,
      runtime_version: RUNTIME_VERSION,
      wip_snapshot_hash: "wip" + "0".repeat(61),
      domain_files_content_hash: "dom" + "0".repeat(61),
      hash_algorithm: "yaml@2.8.2 + sha256",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: ["concepts.md"],
    },
  });
}

function makeDeps(overrides: Partial<CoordinatorDeps> = {}): CoordinatorDeps {
  return {
    spawnProposer: makeMockProposer(),
    spawnReviewer: makeMockReviewer(),
    now: () => FIXED_NOW,
    systemPurpose: "coord-test",
    ...overrides,
  };
}

// =============================================================================
// Cycle 1 — full v1 mode
// =============================================================================

describe("runReconstructCoordinator — Cycle 1: full v1 mode", () => {
  it("dispatches α + γ + δ + Phase 3.5; all switches reflected", async () => {
    const result = await runReconstructCoordinator(makeInput(), makeDeps());
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.switches.v1_inference.enabled).toBe(true);
    expect(result.switches.phase3_rationale_review.enabled).toBe(true);
    expect(result.switches.write_intent_inference_to_raw_yml.enabled).toBe(true);
    expect(result.alpha.kind).toBe("completed");
    expect(result.gamma.kind).toBe("completed");
    expect(result.delta).not.toBeNull();
    expect(result.phase35.ok).toBe(true);
    // E1: accept on reviewed → principal_accepted
    expect(result.phase35.elementUpdates.get("E1")?.rationale_state).toBe(
      "principal_accepted",
    );
    expect(result.writeIntentInferenceToRawYml).toBe(true);
  });

  it("Hook γ updates merge over Hook α (gate_count = 2)", async () => {
    const result = await runReconstructCoordinator(makeInput(), makeDeps());
    if (result.kind !== "completed" || result.gamma.kind !== "completed") {
      throw new Error("expected completed gamma");
    }
    const inf = result.gamma.elementUpdates.get("E1");
    expect(inf?.provenance.gate_count).toBe(2);
    expect(inf?.provenance.reviewed_by).toBe("rationale-reviewer");
  });
});

// =============================================================================
// Cycle 2 — v1 without review (phase3_rationale_review off)
// =============================================================================

describe("runReconstructCoordinator — Cycle 2: v1 without review", () => {
  it("dispatches α + δ + Phase 3.5; γ is skipped_by_switch", async () => {
    const reviewerSpy = vi.fn(makeMockReviewer());
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: makeV1WithoutReviewConfig() }),
      makeDeps({ spawnReviewer: reviewerSpy }),
    );
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.switches.phase3_rationale_review.enabled).toBe(false);
    expect(result.alpha.kind).toBe("completed");
    expect(result.gamma.kind).toBe("skipped_by_switch");
    if (result.gamma.kind === "skipped_by_switch") {
      expect(result.gamma.reason).toBe("phase3_rationale_review_disabled");
    }
    expect(result.delta).not.toBeNull();
    expect(result.phase35.ok).toBe(true);
    // §14.6 invariant 2 — switch off → reviewer NEVER spawned
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });
});

// =============================================================================
// Cycle 3 — full v0 fallback
// =============================================================================

describe("runReconstructCoordinator — Cycle 3: full v0 fallback", () => {
  it("α self-skips (inference_mode=none); γ skipped_by_switch; δ null", async () => {
    const proposerSpy = vi.fn(makeMockProposer());
    const reviewerSpy = vi.fn(makeMockReviewer());
    // v0 fallback flow: phase3 responses on a non-existent element are
    // intentionally pruned upstream — for this test we feed empty responses
    // so Phase 3.5 has no work but completes.
    const input = makeInput({
      configRaw: makeFullV0Config(),
      phase3Responses: {
        received_at: FIXED_NOW.toISOString(),
        global_reply: "confirmed",
        rationale_decisions: [],
        batch_actions: [],
      },
      renderedElementIds: new Set(),
    });
    const result = await runReconstructCoordinator(
      input,
      makeDeps({
        spawnProposer: proposerSpy,
        spawnReviewer: reviewerSpy,
      }),
    );
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.switches.v1_inference.enabled).toBe(false);
    expect(result.alpha.kind).toBe("skipped");
    expect(result.gamma.kind).toBe("skipped_by_switch");
    expect(result.delta).toBeNull();
    expect(result.writeIntentInferenceToRawYml).toBe(false);
    // §14.6 invariant 2 — both spies untouched
    expect(proposerSpy).toHaveBeenCalledTimes(0);
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });
});

// =============================================================================
// Cycle 4 — invariant violation halt
// =============================================================================

describe("runReconstructCoordinator — Cycle 4: invariant violation halt", () => {
  it("phase3_rationale_review=true while v1_inference=false → halt before any Hook", async () => {
    const proposerSpy = vi.fn(makeMockProposer());
    const reviewerSpy = vi.fn(makeMockReviewer());
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: makeInvariantViolationConfig() }),
      makeDeps({
        spawnProposer: proposerSpy,
        spawnReviewer: reviewerSpy,
      }),
    );
    expect(result.kind).toBe("invariant_violation");
    if (result.kind !== "invariant_violation") return;
    expect(result.violations).toContain(
      "phase3_rationale_review_requires_v1_inference",
    );
    // Both Hook spawns must NOT be called — halt is before any Hook dispatch
    expect(proposerSpy).toHaveBeenCalledTimes(0);
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });

  it("write_intent_inference_to_raw_yml=true while v1_inference=false → halt", async () => {
    const result = await runReconstructCoordinator(
      makeInput({
        configRaw: {
          reconstruct: {
            v1_inference: { enabled: false },
            phase3_rationale_review: { enabled: false },
            write_intent_inference_to_raw_yml: { enabled: true },
          },
        },
      }),
      makeDeps(),
    );
    expect(result.kind).toBe("invariant_violation");
    if (result.kind !== "invariant_violation") return;
    expect(result.violations).toContain(
      "write_intent_inference_to_raw_yml_requires_v1_inference",
    );
  });
});

// =============================================================================
// Cycle 5 — config-absent silent default audit signal
// =============================================================================

describe("runReconstructCoordinator — Cycle 5: config-absent emit", () => {
  it("configRaw=null → onConfigAbsent fired + v1 mode applied", async () => {
    const onAbsent = vi.fn();
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: null }),
      makeDeps({ onConfigAbsent: onAbsent }),
    );
    expect(onAbsent).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    // silent default = full v1 ON (configuration.md §4.11 (c) r4 strengthening)
    expect(result.switches.v1_inference.enabled).toBe(true);
    expect(result.switches.phase3_rationale_review.enabled).toBe(true);
    expect(result.switches.write_intent_inference_to_raw_yml.enabled).toBe(true);
  });

  it("configRaw provided but reconstruct: block absent → onConfigAbsent fires", async () => {
    const onAbsent = vi.fn();
    await runReconstructCoordinator(
      makeInput({ configRaw: { output_language: "ko" } }),
      makeDeps({ onConfigAbsent: onAbsent }),
    );
    expect(onAbsent).toHaveBeenCalledTimes(1);
  });

  it("configRaw with explicit reconstruct block → onConfigAbsent NOT fired", async () => {
    const onAbsent = vi.fn();
    await runReconstructCoordinator(
      makeInput({ configRaw: makeFullV1Config() }),
      makeDeps({ onConfigAbsent: onAbsent }),
    );
    expect(onAbsent).toHaveBeenCalledTimes(0);
  });
});

// =============================================================================
// Cycle 6 — Hook gating spy verification (§14.6 invariant 2 explicit)
// =============================================================================

describe("runReconstructCoordinator — Cycle 6: §14.6 invariant 2 (들어내기 용이) spy", () => {
  it("v1_inference off → spawnProposer NEVER called even with non-empty entityList", async () => {
    const proposerSpy = vi.fn(makeMockProposer());
    await runReconstructCoordinator(
      makeInput({
        configRaw: makeFullV0Config(),
        phase3Responses: {
          received_at: FIXED_NOW.toISOString(),
          global_reply: "confirmed",
          rationale_decisions: [],
          batch_actions: [],
        },
        renderedElementIds: new Set(),
      }),
      makeDeps({ spawnProposer: proposerSpy }),
    );
    expect(proposerSpy).toHaveBeenCalledTimes(0);
  });

  it("phase3_rationale_review off → spawnReviewer NEVER called", async () => {
    const reviewerSpy = vi.fn(makeMockReviewer());
    await runReconstructCoordinator(
      makeInput({ configRaw: makeV1WithoutReviewConfig() }),
      makeDeps({ spawnReviewer: reviewerSpy }),
    );
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });
});

// =============================================================================
// Cycle 7 — config_malformed (review C-2 fail-close split)
// =============================================================================

describe("runReconstructCoordinator — Cycle 7: config_malformed halt (C-2)", () => {
  it("configRaw is array → halt with kind=config_malformed (no Hook, no audit)", async () => {
    const onAbsent = vi.fn();
    const proposerSpy = vi.fn(makeMockProposer());
    const reviewerSpy = vi.fn(makeMockReviewer());
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: [1, 2, 3] }),
      makeDeps({
        onConfigAbsent: onAbsent,
        spawnProposer: proposerSpy,
        spawnReviewer: reviewerSpy,
      }),
    );
    expect(result.kind).toBe("config_malformed");
    if (result.kind !== "config_malformed") return;
    expect(result.detail).toMatch(/array/);
    // C-2 fail-close: malformed != absent — onConfigAbsent must NOT fire
    expect(onAbsent).toHaveBeenCalledTimes(0);
    // No Hook invocation — halt is before any dispatch
    expect(proposerSpy).toHaveBeenCalledTimes(0);
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });

  it("configRaw is scalar string → halt with kind=config_malformed", async () => {
    const onAbsent = vi.fn();
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: "not-an-object" }),
      makeDeps({ onConfigAbsent: onAbsent }),
    );
    expect(result.kind).toBe("config_malformed");
    if (result.kind !== "config_malformed") return;
    expect(result.detail).toMatch(/string/);
    expect(onAbsent).toHaveBeenCalledTimes(0);
  });

  it("configRaw is scalar number → halt with kind=config_malformed", async () => {
    const result = await runReconstructCoordinator(
      makeInput({ configRaw: 42 }),
      makeDeps(),
    );
    expect(result.kind).toBe("config_malformed");
    if (result.kind !== "config_malformed") return;
    expect(result.detail).toMatch(/number/);
  });
});
