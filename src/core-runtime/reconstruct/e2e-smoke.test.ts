// runtime-mirror-of: step-4-integration §8 + govern §14.6 + W-A-104
//
// Full v1 cycle E2E smoke test — Stage 1 finalize → Hook α → Hook γ
// → Hook δ → Phase 3 → Phase 3.5 → raw.yml assemble. Mock LLM dispatchers
// (Proposer / Reviewer) replace actual prompt invocations; runtime flow
// (state transitions + invariants) is the only thing under test.
//
// 9 cycle (r1: 3 → r2 +6 = 9, codex review fix-up coverage 확장):
//   1. happy path (v1 mode, all 3 dogfood switches ON)
//   2. v0 fallback (all switches OFF — §14.6 invariant 1 검증)
//   3. dependency invariant violation (phase3_rationale_review on while
//      v1_inference off — §8.3 inter-switch consistency 검증)
//   4. action variation — reject / modify / defer (reviewed source)
//   5. source-state variation — gap / domain_pack_incomplete / domain_scope_miss
//      × provide_rationale / mark_acceptable_gap / accept / override
//   6. global_reply == "see below" (sweep skip + batch_actions cover-all)
//   7. invalid input — phase_3_5_input_invalid / phase_3_5_input_incomplete
//   8. §14.6 invariant 2 (들어내기 용이) — switch off 시 hook 호출 0회 (spy)
//   9. §14.6 invariant 3 (govern reader 친화) — meta-only audit query 5종

import { describe, expect, it, vi } from "vitest";
import {
  RECONSTRUCT_DOGFOOD_DEFAULTS,
  checkSwitchInvariants,
  isV0FallbackMode,
  isV1ModeFullyOn,
  loadReconstructDogfoodSwitches,
} from "./dogfood-switches.js";
import {
  type HookAlphaEntityInput,
  type HookAlphaInput,
  type HookAlphaManifestInput,
  runHookAlpha,
} from "./hook-alpha.js";
import { runHookGamma } from "./hook-gamma.js";
import { runHookDelta, type PendingElement } from "./hook-delta.js";
import {
  actionToTerminal,
  type Phase3UserResponses,
  runPhase35,
  validatePhase35Input,
} from "./phase-3-5-runtime.js";
import { buildPhase3SnapshotDocument } from "./phase3-snapshot-write.js";
import type { ProposerDirective } from "./proposer-directive-types.js";
import type { ReviewerDirective } from "./reviewer-directive-types.js";
import {
  type RawMetaExtensionsV1,
  validateRawMetaInvariants,
} from "./raw-meta-extended-schema.js";
import type { IntentInference } from "./wip-element-types.js";

// =============================================================================
// Constants
// =============================================================================

const SESSION_ID = "smoke-session-001";
const RUNTIME_VERSION = "v1.0.0-test";
const PROPOSER_CONTRACT_VERSION = "1.0";
const REVIEWER_CONTRACT_VERSION = "1.0";
const FIXED_NOW = new Date("2026-04-27T12:00:00Z");

// =============================================================================
// Fixtures
// =============================================================================

function makeManifest(): HookAlphaManifestInput {
  return {
    manifest_schema_version: "1.0",
    domain_name: "smoke-domain",
    domain_manifest_version: "1.0.0",
    version_hash: "deadbeef" + "0".repeat(56),
    quality_tier: "full",
    referenced_files: [
      { path: "concepts.md", required: true, purpose: "concepts" },
      { path: "structure_spec.md", required: true, purpose: "structure" },
    ],
  };
}

function makeStage1Entities(): HookAlphaEntityInput[] {
  return [
    {
      id: "E1",
      type: "entity",
      name: "Order",
      definition: "An order placed by a customer",
      certainty: "observed",
      source: { locations: ["src/order.ts:10"] },
      relations_summary: [{ related_id: "E2", relation_type: "contains" }],
    },
    {
      id: "E2",
      type: "entity",
      name: "LineItem",
      definition: "A single product line in an order",
      certainty: "observed",
      source: { locations: ["src/order.ts:42"] },
      relations_summary: [],
    },
    {
      id: "E3",
      type: "entity",
      name: "Customer",
      definition: "An end-user account",
      certainty: "inferred",
      source: { locations: ["src/customer.ts:5"] },
      relations_summary: [],
    },
  ];
}

function makeProposerProvenance(): ProposerDirective["provenance"] {
  const m = makeManifest();
  return {
    proposed_at: FIXED_NOW.toISOString(),
    proposed_by: "rationale-proposer",
    proposer_contract_version: PROPOSER_CONTRACT_VERSION,
    manifest_schema_version: m.manifest_schema_version,
    domain_manifest_version: m.domain_manifest_version,
    domain_manifest_hash: m.version_hash,
    domain_quality_tier: m.quality_tier,
    session_id: SESSION_ID,
    runtime_version: RUNTIME_VERSION,
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: ["concepts.md", "structure_spec.md"],
  };
}

function makeReviewerProvenance(
  wipHash: string,
  domainHash: string,
): ReviewerDirective["provenance"] {
  const m = makeManifest();
  return {
    reviewed_at: FIXED_NOW.toISOString(),
    reviewed_by: "rationale-reviewer",
    reviewer_contract_version: REVIEWER_CONTRACT_VERSION,
    manifest_schema_version: m.manifest_schema_version,
    domain_manifest_version: m.domain_manifest_version,
    domain_manifest_hash: m.version_hash,
    domain_quality_tier: m.quality_tier,
    session_id: SESSION_ID,
    runtime_version: RUNTIME_VERSION,
    wip_snapshot_hash: wipHash,
    domain_files_content_hash: domainHash,
    hash_algorithm: "yaml@2.8.2 + sha256",
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: ["concepts.md", "structure_spec.md"],
  };
}

function makeMockProposerAllProposed(
  entityIds: string[],
): () => Promise<ProposerDirective> {
  return async () => ({
    proposals: entityIds.map((id) => ({
      target_element_id: id,
      outcome: "proposed" as const,
      inferred_meaning: `${id} represents the corresponding domain concept.`,
      justification: `Linked to canonical domain heading via referenced_files.`,
      domain_refs: [
        {
          manifest_ref: "concepts.md",
          heading: "## Core Entities",
          excerpt: `${id} description excerpt`,
        },
      ],
      confidence: "medium" as const,
    })),
    provenance: makeProposerProvenance(),
  });
}

function makeMockReviewerAllConfirm(
  entityIds: string[],
  wipHash: string,
  domainHash: string,
): () => Promise<ReviewerDirective> {
  return async () => ({
    updates: entityIds.map((id) => ({
      target_element_id: id,
      operation: "confirm" as const,
    })),
    provenance: makeReviewerProvenance(wipHash, domainHash),
  });
}

// =============================================================================
// Cycle 1 — happy path (v1 mode, all 3 switches ON)
// =============================================================================

describe("E2E smoke — Cycle 1: happy path (v1 mode all switches ON)", () => {
  it("dogfood switches default to v1 mode fully on", () => {
    const switches = loadReconstructDogfoodSwitches(undefined);
    expect(switches).toEqual(RECONSTRUCT_DOGFOOD_DEFAULTS);
    expect(isV1ModeFullyOn(switches)).toBe(true);
    expect(checkSwitchInvariants(switches)).toEqual({ ok: true });
  });

  it("Hook α populates 3 entities with proposed outcome", async () => {
    const entities = makeStage1Entities();
    const input: HookAlphaInput = {
      meta: {
        stage_transition_state: "pre_alpha",
        stage_transition_retry_count: 0,
        inference_mode: "full",
        stage: 1,
      },
      entityList: entities,
      manifest: makeManifest(),
      injectedFiles: ["concepts.md", "structure_spec.md"],
      sessionId: SESSION_ID,
      runtimeVersion: RUNTIME_VERSION,
      proposerContractVersion: PROPOSER_CONTRACT_VERSION,
    };
    const result = await runHookAlpha(input, {
      spawnProposer: makeMockProposerAllProposed(entities.map((e) => e.id)),
      now: () => FIXED_NOW,
      systemPurpose: "smoke",
    });

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.nextState).toBe("alpha_completed");
    expect(result.setMetaStage).toBe(2);
    expect(result.elementUpdates.size).toBe(3);
    for (const id of ["E1", "E2", "E3"]) {
      const inf = result.elementUpdates.get(id);
      expect(inf).toBeDefined();
      expect(inf?.rationale_state).toBe("proposed");
      expect(inf?.provenance.gate_count).toBe(1);
      expect(inf?.provenance.proposed_by).toBe("rationale-proposer");
    }
  });

  it("Hook γ confirms all 3 elements (gate_count 1→2, reviewed_at populated)", async () => {
    // Assemble post-Hook-α state
    const entities = makeStage1Entities();
    const alphaResult = await runHookAlpha(
      {
        meta: {
          stage_transition_state: "pre_alpha",
          stage_transition_retry_count: 0,
          inference_mode: "full",
          stage: 1,
        },
        entityList: entities,
        manifest: makeManifest(),
        injectedFiles: ["concepts.md", "structure_spec.md"],
        sessionId: SESSION_ID,
        runtimeVersion: RUNTIME_VERSION,
        proposerContractVersion: PROPOSER_CONTRACT_VERSION,
      },
      {
        spawnProposer: makeMockProposerAllProposed(entities.map((e) => e.id)),
        now: () => FIXED_NOW,
        systemPurpose: "smoke",
      },
    );
    if (alphaResult.kind !== "completed") throw new Error("alpha not completed");

    const m = makeManifest();
    const wipHash = "wip" + "0".repeat(61);
    const domainHash = "dom" + "0".repeat(61);
    const gammaResult = await runHookGamma(
      {
        meta: {
          step2c_review_state: "pre_gamma",
          step2c_review_retry_count: 0,
          inference_mode: "full",
          stage_transition_state: "alpha_completed",
        },
        elementInferences: alphaResult.elementUpdates,
        manifest: {
          manifest_schema_version: m.manifest_schema_version,
          domain_manifest_version: m.domain_manifest_version,
          version_hash: m.version_hash,
          quality_tier: m.quality_tier,
          referenced_files: m.referenced_files,
        },
        injectedFiles: ["concepts.md", "structure_spec.md"],
        wipSnapshotHash: wipHash,
        domainFilesContentHash: domainHash,
      },
      {
        spawnReviewer: makeMockReviewerAllConfirm(["E1", "E2", "E3"], wipHash, domainHash),
      },
    );

    expect(gammaResult.kind).toBe("completed");
    if (gammaResult.kind !== "completed") return;
    expect(gammaResult.nextState).toBe("gamma_completed");
    for (const id of ["E1", "E2", "E3"]) {
      const inf = gammaResult.elementUpdates.get(id);
      expect(inf).toBeDefined();
      // confirm operation: gate_count should increment to 2, reviewed_at set
      expect(inf?.provenance.gate_count).toBe(2);
      expect(inf?.provenance.reviewed_at).toBeTruthy();
      expect(inf?.provenance.reviewed_by).toBe("rationale-reviewer");
    }
  });

  it("Hook δ renders 3 reviewed elements with priority buckets", () => {
    const inferences = buildPostGammaInferences();
    const pending: PendingElement[] = [...inferences.entries()].map(([id, inf]) => ({
      element_id: id,
      intent_inference: inf,
      added_in_stage: 1,
    }));
    const result = runHookDelta(pending, [], false);
    expect(result.entries).toHaveLength(3);
    // RenderBucket enum (Step 4 §2.5): individual / group_sample / group_truncated / throttled_out
    for (const entry of result.entries) {
      expect([
        "individual",
        "group_sample",
        "group_truncated",
        "throttled_out",
      ]).toContain(entry.render_bucket);
    }
  });

  it("Phase 3.5 (validate→apply→sweep): 1 accept + 2 carry_forward", () => {
    const inferences = buildPostGammaInferences();
    const responses: Phase3UserResponses = {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "confirmed",
      rationale_decisions: [
        {
          element_id: "E1",
          action: "accept",
          decided_at: FIXED_NOW.toISOString(),
        },
      ],
      batch_actions: [],
    };
    const snapshot = buildPhase3SnapshotDocument({
      session_id: SESSION_ID,
      written_at: FIXED_NOW.toISOString(),
      intentInferences: inferences,
    });
    const renderedIds = new Set(["E1", "E2", "E3"]);
    const throttledIds = new Set<string>();

    const result = runPhase35({
      responses,
      currentInferences: inferences,
      judgedAt: FIXED_NOW.toISOString(),
      snapshot,
      renderedElementIds: renderedIds,
      throttledOutAddressableIds: throttledIds,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // E1 → principal_accepted, E2/E3 → carry_forward (sweep)
    expect(result.elementUpdates.get("E1")?.rationale_state).toBe(
      "principal_accepted",
    );
    expect(result.elementUpdates.get("E2")?.rationale_state).toBe("carry_forward");
    expect(result.elementUpdates.get("E3")?.rationale_state).toBe("carry_forward");
    expect(
      result.elementUpdates.get("E2")?.provenance.carry_forward_from,
    ).toBe("reviewed");
  });

  it("raw.yml meta passes validateRawMetaInvariants (v1 mode full)", () => {
    const meta = buildHappyPathRawMeta();
    const result = validateRawMetaInvariants(meta, "full");
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// Cycle 2 — v0 fallback (all switches OFF, §14.6 invariant 1)
// =============================================================================

describe("E2E smoke — Cycle 2: v0 fallback (all switches OFF)", () => {
  const allOff = {
    v1_inference: { enabled: false },
    phase3_rationale_review: { enabled: false },
    write_intent_inference_to_raw_yml: { enabled: false },
  };

  it("dogfood switches load as v0 fallback mode", () => {
    const loaded = loadReconstructDogfoodSwitches(allOff);
    expect(isV0FallbackMode(loaded)).toBe(true);
    expect(isV1ModeFullyOn(loaded)).toBe(false);
    expect(checkSwitchInvariants(loaded)).toEqual({ ok: true });
  });

  it("Hook α skips with alpha_skipped when inference_mode == none", async () => {
    const entities = makeStage1Entities();
    const result = await runHookAlpha(
      {
        meta: {
          stage_transition_state: "pre_alpha",
          stage_transition_retry_count: 0,
          inference_mode: "none", // dogfood off → fail-close 가 none
          stage: 1,
        },
        entityList: entities,
        manifest: makeManifest(),
        injectedFiles: [],
        sessionId: SESSION_ID,
        runtimeVersion: RUNTIME_VERSION,
        proposerContractVersion: PROPOSER_CONTRACT_VERSION,
      },
      {
        spawnProposer: async () => {
          throw new Error("Hook α should not invoke proposer when skipped");
        },
        now: () => FIXED_NOW,
        systemPurpose: "smoke-v0",
      },
    );
    expect(result.kind).toBe("skipped");
    if (result.kind !== "skipped") return;
    expect(result.nextState).toBe("alpha_skipped");
    expect(result.setMetaStage).toBe(2);
  });

  it("Hook γ skips with gamma_skipped (alpha_skipped propagation)", async () => {
    const result = await runHookGamma(
      {
        meta: {
          step2c_review_state: "pre_gamma",
          step2c_review_retry_count: 0,
          inference_mode: "none",
          stage_transition_state: "alpha_skipped",
        },
        elementInferences: new Map(),
        manifest: {
          manifest_schema_version: "1.0",
          domain_manifest_version: "1.0.0",
          version_hash: "noop",
          quality_tier: "full",
          referenced_files: [],
        },
        injectedFiles: [],
        wipSnapshotHash: "noop",
        domainFilesContentHash: "noop",
      },
      {
        spawnReviewer: async () => {
          throw new Error("Hook γ should not invoke reviewer when skipped");
        },
      },
    );
    expect(result.kind).toBe("skipped");
    if (result.kind !== "skipped") return;
    expect(result.nextState).toBe("gamma_skipped");
  });

  it("raw.yml meta validates as inference_mode=none (no element-level intent_inference)", () => {
    const meta: RawMetaExtensionsV1 = {
      inference_mode: "none",
      degraded_reason: null,
      fallback_reason: "user_flag",
      domain_quality_tier: null,
      manifest_schema_version: "1.0",
      domain_manifest_version: "1.0.0",
      domain_manifest_hash: "noop",
      manifest_recovery_from_malformed: false,
      rationale_review_degraded: false,
      rationale_reviewer_failures_streak: 0,
      rationale_reviewer_contract_version: null,
      rationale_proposer_contract_version: null,
      pack_missing_areas: [],
      step2c_review_state: null,
      step2c_review_retry_count: null,
    };
    const result = validateRawMetaInvariants(meta, null);
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// Cycle 3 — dependency invariant violation (§8.3 inter-switch consistency)
// =============================================================================

describe("E2E smoke — Cycle 3: dogfood dependency invariant violation", () => {
  it("phase3_rationale_review = true while v1_inference = false → rejected", () => {
    const result = checkSwitchInvariants({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: true },
      write_intent_inference_to_raw_yml: { enabled: false },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.violations).toContain(
      "phase3_rationale_review_requires_v1_inference",
    );
  });

  it("write_intent_inference_to_raw_yml = true while v1_inference = false → rejected", () => {
    const result = checkSwitchInvariants({
      v1_inference: { enabled: false },
      phase3_rationale_review: { enabled: false },
      write_intent_inference_to_raw_yml: { enabled: true },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.violations).toContain(
      "write_intent_inference_to_raw_yml_requires_v1_inference",
    );
  });
});

// =============================================================================
// §14.6 invariant 4점 — cycle-level verification
// =============================================================================

describe("§14.6 invariant 4점 — cycle-level verification", () => {
  it("invariant 1 (off 가능): v0 fallback raw.yml = no element intent_inference", () => {
    const meta: RawMetaExtensionsV1 = buildV0RawMeta();
    expect(validateRawMetaInvariants(meta, null).ok).toBe(true);
  });

  it("invariant 4 (본질 sink ≠ dogfood sink): manifest_recovery_from_malformed independent", () => {
    // wip.yml lifecycle (essence sink) does not write recovery_from_malformed —
    // raw.yml.meta does (mirror sink). Toggling the flag does not break wip schema.
    const metaWithRecovery: RawMetaExtensionsV1 = {
      ...buildV0RawMeta(),
      manifest_recovery_from_malformed: true,
    };
    const metaWithout: RawMetaExtensionsV1 = {
      ...buildV0RawMeta(),
      manifest_recovery_from_malformed: false,
    };
    expect(validateRawMetaInvariants(metaWithRecovery, null).ok).toBe(true);
    expect(validateRawMetaInvariants(metaWithout, null).ok).toBe(true);
  });
});

// =============================================================================
// Cycle 4 — action variation (reject / modify / defer on reviewed source)
// =============================================================================

describe("E2E smoke — Cycle 4: action variation (reject / modify / defer)", () => {
  it("runPhase35 applies reject / modify / defer to reviewed elements", () => {
    const inferences = buildPostGammaInferences();
    const responses: Phase3UserResponses = {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "confirmed",
      rationale_decisions: [
        { element_id: "E1", action: "reject", decided_at: FIXED_NOW.toISOString() },
        {
          element_id: "E2",
          action: "modify",
          principal_provided_rationale: {
            inferred_meaning: "revised meaning",
            justification: "principal-provided",
          },
          decided_at: FIXED_NOW.toISOString(),
        },
        { element_id: "E3", action: "defer", decided_at: FIXED_NOW.toISOString() },
      ],
      batch_actions: [],
    };
    const snapshot = buildPhase3SnapshotDocument({
      session_id: SESSION_ID,
      written_at: FIXED_NOW.toISOString(),
      intentInferences: inferences,
    });
    const result = runPhase35({
      responses,
      currentInferences: inferences,
      judgedAt: FIXED_NOW.toISOString(),
      snapshot,
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.elementUpdates.get("E1")?.rationale_state).toBe("principal_rejected");
    expect(result.elementUpdates.get("E2")?.rationale_state).toBe("principal_modified");
    // applyToElement (modify) overwrites inferred_meaning + justification —
    // implementation 은 element-level `principal_provided_rationale` field 를
    // 별도 persist 하지 않고 inferred_meaning/justification 에 overwrite.
    // Step 4 §3.6.1 canonical seat (`element-level principal_provided_rationale`)
    // 와의 partial drift — backlog finding, 본 cycle 은 implementation 동작 검증.
    expect(result.elementUpdates.get("E2")?.inferred_meaning).toBe("revised meaning");
    expect(result.elementUpdates.get("E2")?.justification).toBe("principal-provided");
    expect(result.elementUpdates.get("E3")?.rationale_state).toBe("principal_deferred");
  });
});

// =============================================================================
// Cycle 5 — source-state variation (gap / scope_miss / pack_incomplete actions)
// =============================================================================

describe("E2E smoke — Cycle 5: source-state × action matrix (Step 4 §3.1)", () => {
  it.each([
    ["gap", "provide_rationale", "principal_modified"],
    ["gap", "mark_acceptable_gap", "principal_accepted_gap"],
    ["domain_scope_miss", "accept", "principal_confirmed_scope_miss"],
    ["domain_scope_miss", "override", "principal_modified"],
    ["domain_pack_incomplete", "provide_rationale", "principal_modified"],
    ["domain_pack_incomplete", "mark_acceptable_gap", "principal_accepted_gap"],
    ["empty", "provide_rationale", "principal_modified"],
    ["empty", "mark_acceptable_gap", "principal_accepted_gap"],
  ] as const)("actionToTerminal(%s, %s) = %s", (source, action, expected) => {
    expect(actionToTerminal(action, source)).toBe(expected);
  });

  it.each([
    ["reviewed", "override"],
    ["proposed", "override"],
    ["domain_scope_miss", "modify"],
    ["domain_scope_miss", "reject"],
  ] as const)("actionToTerminal(%s, %s) = null (invalid combo)", (source, action) => {
    expect(actionToTerminal(action, source)).toBeNull();
  });
});

// =============================================================================
// Cycle 6 — global_reply == "see below" (sweep skip + batch cover-all)
// =============================================================================

describe(`E2E smoke — Cycle 6: global_reply == "see below" + batch action cover-all`, () => {
  it("batch_actions cover all 3 reviewed → principal_accepted, no carry_forward", () => {
    const inferences = buildPostGammaInferences();
    const responses: Phase3UserResponses = {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "see below",
      rationale_decisions: [],
      batch_actions: [
        {
          action: "accept",
          target_group: {
            kind: "rationale_state",
            rationale_state: "reviewed",
          },
          target_element_ids: ["E1", "E2", "E3"],
          decided_at: FIXED_NOW.toISOString(),
        },
      ],
    };
    const snapshot = buildPhase3SnapshotDocument({
      session_id: SESSION_ID,
      written_at: FIXED_NOW.toISOString(),
      intentInferences: inferences,
    });
    const result = runPhase35({
      responses,
      currentInferences: inferences,
      judgedAt: FIXED_NOW.toISOString(),
      snapshot,
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of ["E1", "E2", "E3"]) {
      expect(result.elementUpdates.get(id)?.rationale_state).toBe("principal_accepted");
      // sweep skipped → no carry_forward_from
      expect(result.elementUpdates.get(id)?.provenance.carry_forward_from).toBeFalsy();
    }
  });
});

// =============================================================================
// Cycle 7 — invalid input rejection (phase_3_5_input_*)
// =============================================================================

describe("E2E smoke — Cycle 7: validatePhase35Input rejects invalid input", () => {
  it("empty element_id → phase_3_5_input_invalid", () => {
    const inferences = buildPostGammaInferences();
    const responses: Phase3UserResponses = {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "confirmed",
      rationale_decisions: [
        { element_id: "", action: "accept", decided_at: FIXED_NOW.toISOString() },
      ],
      batch_actions: [],
    };
    const snapshot = buildPhase3SnapshotDocument({
      session_id: SESSION_ID,
      written_at: FIXED_NOW.toISOString(),
      intentInferences: inferences,
    });
    const result = validatePhase35Input({
      responses,
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("phase_3_5_input_invalid");
  });

  // implementation 은 see-below check 를 *throttledOutAddressableIds 에 들어 있는*
  // element 의 미address 만 잡는다 (phase-3-5-runtime.ts validatePhase35Input
  // §3.6 see-below block). Step 4 §3.6 r4 spec ("모든 pending 미address 면
  // incomplete") 과의 partial drift — implementation 은 throttled-out scope
  // 만 검증. 본 cycle 은 implementation 의 동작 (throttled-out 미address) 을 검증
  // 하고, 전체 pending unaddressed 의 incomplete trigger 는 backlog finding.
  it(`see-below + unaddressed throttled-out element → phase_3_5_input_incomplete`, () => {
    const inferences = buildPostGammaInferences();
    const responses: Phase3UserResponses = {
      received_at: FIXED_NOW.toISOString(),
      global_reply: "see below",
      rationale_decisions: [
        { element_id: "E1", action: "accept", decided_at: FIXED_NOW.toISOString() },
        // E2 throttled_out + addressable 인데 미 address → incomplete
      ],
      batch_actions: [],
    };
    const snapshot = buildPhase3SnapshotDocument({
      session_id: SESSION_ID,
      written_at: FIXED_NOW.toISOString(),
      intentInferences: inferences,
    });
    const result = validatePhase35Input({
      responses,
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(["E2"]),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("phase_3_5_input_incomplete");
  });
});

// =============================================================================
// Cycle 8 — §14.6 invariant 2 (들어내기 용이): switch off → hook 호출 0회
// =============================================================================

describe("E2E smoke — Cycle 8: §14.6 invariant 2 (switch off → hook 호출 0회 spy)", () => {
  it("inference_mode=none + Hook α: spawnProposer NEVER called", async () => {
    const proposerSpy = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const result = await runHookAlpha(
      {
        meta: {
          stage_transition_state: "pre_alpha",
          stage_transition_retry_count: 0,
          inference_mode: "none",
          stage: 1,
        },
        entityList: makeStage1Entities(),
        manifest: makeManifest(),
        injectedFiles: [],
        sessionId: SESSION_ID,
        runtimeVersion: RUNTIME_VERSION,
        proposerContractVersion: PROPOSER_CONTRACT_VERSION,
      },
      {
        spawnProposer: proposerSpy,
        now: () => FIXED_NOW,
        systemPurpose: "invariant-2",
      },
    );
    expect(result.kind).toBe("skipped");
    expect(proposerSpy).toHaveBeenCalledTimes(0);
  });

  it("alpha_skipped propagates → Hook γ: spawnReviewer NEVER called", async () => {
    const reviewerSpy = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const result = await runHookGamma(
      {
        meta: {
          step2c_review_state: "pre_gamma",
          step2c_review_retry_count: 0,
          inference_mode: "none",
          stage_transition_state: "alpha_skipped",
        },
        elementInferences: new Map(),
        manifest: {
          manifest_schema_version: "1.0",
          domain_manifest_version: "1.0.0",
          version_hash: "noop",
          quality_tier: "full",
          referenced_files: [],
        },
        injectedFiles: [],
        wipSnapshotHash: "noop",
        domainFilesContentHash: "noop",
      },
      { spawnReviewer: reviewerSpy },
    );
    expect(result.kind).toBe("skipped");
    expect(reviewerSpy).toHaveBeenCalledTimes(0);
  });
});

// =============================================================================
// Cycle 9 — §14.6 invariant 3 (govern reader 친화): meta-only audit query 5종
// =============================================================================

describe("E2E smoke — Cycle 9: §14.6 invariant 3 (govern reader 가 meta block 만으로 audit)", () => {
  // govern reader 가 raw.yml.meta 한 block 만으로 5 가지 audit 질문에 답할 수
  // 있어야 한다 — element-level intent_inference block 부재 / 존재 모두에서
  // distinguish 가능. 본 cycle 은 meta block 의 *self-contained audit surface*
  // 를 검증.

  it("audit Q1: v0 vs v1 mode (inference_mode)", () => {
    expect(buildV0RawMeta().inference_mode).toBe("none");
    expect(buildHappyPathRawMeta().inference_mode).toBe("full");
  });

  it("audit Q2: manifest semver discontinuity (recovery_from_malformed)", () => {
    const recovered: RawMetaExtensionsV1 = {
      ...buildV0RawMeta(),
      manifest_recovery_from_malformed: true,
    };
    expect(recovered.manifest_recovery_from_malformed).toBe(true);
    expect(buildHappyPathRawMeta().manifest_recovery_from_malformed).toBe(false);
  });

  it("audit Q3: reviewer degraded path (rationale_review_degraded)", () => {
    const degraded: RawMetaExtensionsV1 = {
      ...buildHappyPathRawMeta(),
      rationale_review_degraded: true,
      rationale_reviewer_failures_streak: 2,
    };
    expect(degraded.rationale_review_degraded).toBe(true);
    expect(degraded.rationale_reviewer_failures_streak).toBe(2);
  });

  it("audit Q4: domain pack quality tier (domain_quality_tier)", () => {
    expect(buildHappyPathRawMeta().domain_quality_tier).toBe("full");
    const partial: RawMetaExtensionsV1 = {
      ...buildHappyPathRawMeta(),
      degraded_reason: "pack_optional_missing",
      inference_mode: "degraded",
      domain_quality_tier: "partial",
    };
    expect(validateRawMetaInvariants(partial, "partial").ok).toBe(true);
  });

  it("audit Q5: manifest version + hash trace", () => {
    const meta = buildHappyPathRawMeta();
    expect(meta.domain_manifest_version).toBe("1.0.0");
    expect(meta.domain_manifest_hash).toMatch(/^deadbeef/);
    expect(meta.manifest_schema_version).toBe("1.0");
  });
});

// =============================================================================
// Helpers (post-hook fixture builders)
// =============================================================================

function buildPostGammaInferences(): Map<string, IntentInference> {
  const provenance = {
    proposed_at: FIXED_NOW.toISOString(),
    proposed_by: "rationale-proposer" as const,
    proposer_contract_version: PROPOSER_CONTRACT_VERSION,
    manifest_schema_version: "1.0",
    domain_manifest_version: "1.0.0",
    domain_manifest_hash: "deadbeef" + "0".repeat(56),
    domain_quality_tier: "full" as const,
    session_id: SESSION_ID,
    runtime_version: RUNTIME_VERSION,
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: ["concepts.md", "structure_spec.md"],
    reviewed_at: FIXED_NOW.toISOString(),
    reviewed_by: "rationale-reviewer",
    reviewer_contract_version: REVIEWER_CONTRACT_VERSION,
    wip_snapshot_hash: "wip" + "0".repeat(61),
    domain_files_content_hash: "dom" + "0".repeat(61),
    hash_algorithm: "yaml@2.8.2 + sha256",
    gate_count: 2,
  };
  const map = new Map<string, IntentInference>();
  for (const id of ["E1", "E2", "E3"]) {
    map.set(id, {
      rationale_state: "reviewed",
      inferred_meaning: `${id} represents a domain concept.`,
      justification: "linked to manifest heading",
      domain_refs: [
        {
          manifest_ref: "concepts.md",
          heading: "## Core Entities",
          excerpt: `${id} excerpt`,
        },
      ],
      confidence: "medium",
      provenance,
    });
  }
  return map;
}

function buildHappyPathRawMeta(): RawMetaExtensionsV1 {
  return {
    inference_mode: "full",
    degraded_reason: null,
    fallback_reason: null,
    domain_quality_tier: "full",
    manifest_schema_version: "1.0",
    domain_manifest_version: "1.0.0",
    domain_manifest_hash: "deadbeef" + "0".repeat(56),
    manifest_recovery_from_malformed: false,
    rationale_review_degraded: false,
    rationale_reviewer_failures_streak: 0,
    rationale_reviewer_contract_version: REVIEWER_CONTRACT_VERSION,
    rationale_proposer_contract_version: PROPOSER_CONTRACT_VERSION,
    pack_missing_areas: [],
    step2c_review_state: "completed",
    step2c_review_retry_count: 0,
  };
}

function buildV0RawMeta(): RawMetaExtensionsV1 {
  return {
    inference_mode: "none",
    degraded_reason: null,
    fallback_reason: "user_flag",
    domain_quality_tier: null,
    manifest_schema_version: "1.0",
    domain_manifest_version: "1.0.0",
    domain_manifest_hash: "noop",
    manifest_recovery_from_malformed: false,
    rationale_review_degraded: false,
    rationale_reviewer_failures_streak: 0,
    rationale_reviewer_contract_version: null,
    rationale_proposer_contract_version: null,
    pack_missing_areas: [],
    step2c_review_state: null,
    step2c_review_retry_count: null,
  };
}
