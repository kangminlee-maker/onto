// runtime-mirror-of: step-4-integration §8 + govern §14.6 + W-A-104
//
// Full v1 cycle E2E smoke test — Stage 1 finalize → Hook α → Hook γ
// → Hook δ → Phase 3 → Phase 3.5 → raw.yml assemble. Mock LLM dispatchers
// (Proposer / Reviewer) replace actual prompt invocations; runtime flow
// (state transitions + invariants) is the only thing under test.
//
// 3 cycle:
//   1. happy path (v1 mode, all 3 dogfood switches ON)
//   2. v0 fallback (all switches OFF — §14.6 invariant 1 검증)
//   3. dependency invariant violation (phase3_rationale_review on while
//      v1_inference off — §8.3 inter-switch consistency 검증)

import { describe, expect, it } from "vitest";
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
  type Phase3UserResponses,
  runPhase35,
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
