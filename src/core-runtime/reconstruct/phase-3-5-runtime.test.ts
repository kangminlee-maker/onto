// runtime-mirror-of: step-4-integration §3.1 + §3.5 + §3.5.1 + §3.5.2

import { describe, expect, it } from "vitest";
import {
  actionToTerminal,
  applyRationaleDecisions,
  carryForwardSweep,
  runPhase35,
  validatePhase35Input,
  type Phase3UserResponses,
  type RationaleAction,
} from "./phase-3-5-runtime.js";
import type { IntentInference, RationaleState } from "./wip-element-types.js";
import { buildPhase3SnapshotDocument } from "./phase3-snapshot-write.js";

function provenance(gateCount = 1): IntentInference["provenance"] {
  return {
    proposed_at: "t",
    proposed_by: "rationale-proposer",
    proposer_contract_version: "1.0",
    manifest_schema_version: "1.0",
    domain_manifest_version: "0.1.0",
    domain_manifest_hash: "h",
    domain_quality_tier: "full",
    session_id: "S",
    runtime_version: "v",
    input_chunks: 1,
    truncated_fields: [],
    effective_injected_files: [],
    gate_count: gateCount,
  };
}

function inf(state: RationaleState): IntentInference {
  return { rationale_state: state, provenance: provenance() };
}

describe("actionToTerminal — §3.1 action-first matrix", () => {
  it.each<[RationaleAction, RationaleState, RationaleState]>([
    ["accept", "reviewed", "principal_accepted"],
    ["accept", "proposed", "principal_accepted"],
    ["accept", "domain_scope_miss", "principal_confirmed_scope_miss"],
    ["reject", "reviewed", "principal_rejected"],
    ["reject", "proposed", "principal_rejected"],
    ["modify", "reviewed", "principal_modified"],
    ["modify", "proposed", "principal_modified"],
    ["defer", "reviewed", "principal_deferred"],
    ["defer", "gap", "principal_deferred"],
    ["defer", "empty", "principal_deferred"],
    ["defer", "domain_scope_miss", "principal_deferred"],
    ["provide_rationale", "gap", "principal_modified"],
    ["provide_rationale", "domain_pack_incomplete", "principal_modified"],
    ["provide_rationale", "empty", "principal_modified"],
    ["mark_acceptable_gap", "gap", "principal_accepted_gap"],
    ["mark_acceptable_gap", "domain_pack_incomplete", "principal_accepted_gap"],
    ["mark_acceptable_gap", "empty", "principal_accepted_gap"],
    ["override", "domain_scope_miss", "principal_modified"],
  ])("(%s, %s) → %s", (action, source, terminal) => {
    expect(actionToTerminal(action, source)).toBe(terminal);
  });

  it.each<[RationaleAction, RationaleState]>([
    ["accept", "gap"],
    ["accept", "empty"],
    ["modify", "gap"],
    ["provide_rationale", "reviewed"],
    ["mark_acceptable_gap", "reviewed"],
    ["override", "reviewed"],
    ["override", "gap"],
  ])("(%s, %s) → null (invalid combo)", (action, source) => {
    expect(actionToTerminal(action, source)).toBeNull();
  });
});

describe("validatePhase35Input (§3.5.1)", () => {
  function setup() {
    const inferences = new Map<string, IntentInference | undefined>();
    inferences.set("E1", inf("reviewed"));
    inferences.set("E2", inf("gap"));
    inferences.set("E3", inf("domain_pack_incomplete"));
    const snapshot = buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: inferences,
    });
    return { inferences, snapshot };
  }

  it("happy: valid responses with matching snapshot", () => {
    const { inferences, snapshot } = setup();
    const responses: Phase3UserResponses = {
      received_at: "t",
      global_reply: "confirmed",
      rationale_decisions: [
        { element_id: "E1", action: "accept", decided_at: "t" },
      ],
      batch_actions: [],
    };
    const r = validatePhase35Input({
      responses,
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(true);
  });

  it("invalid: target not in wip.elements", () => {
    const { inferences, snapshot } = setup();
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E_FAKE", action: "accept", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("phase_3_5_input_invalid");
  });

  it("invalid: action × source state incompat", () => {
    const { inferences, snapshot } = setup();
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E2", action: "accept", decided_at: "t" }, // E2 is gap, accept invalid
        ],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("phase_3_5_input_invalid");
  });

  it("invalid: modify missing principal_provided_rationale", () => {
    const { inferences, snapshot } = setup();
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E1", action: "modify", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
  });

  it("invalid: stale snapshot (state drifted between render and reply)", () => {
    const { inferences, snapshot } = setup();
    // mutate after snapshot
    inferences.set("E1", inf("principal_modified"));
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("stale");
  });

  it("see-below mode: throttled_out unaddressed → phase_3_5_input_incomplete", () => {
    const { inferences, snapshot } = setup();
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "see below",
        rationale_decisions: [],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(["E1"]),
      throttledOutAddressableIds: new Set(["E2", "E3"]), // unaddressed
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("phase_3_5_input_incomplete");
  });

  it("invalid: duplicate element_id in rationale_decisions", () => {
    const { inferences, snapshot } = setup();
    const r = validatePhase35Input({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E1", action: "accept", decided_at: "t" },
          { element_id: "E1", action: "reject", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: inferences,
      snapshot,
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
  });
});

describe("applyRationaleDecisions (§3.5 step 2)", () => {
  function inferences() {
    const m = new Map<string, IntentInference>();
    m.set("E1", inf("reviewed"));
    m.set("E2", inf("gap"));
    m.set("E3", inf("domain_scope_miss"));
    return m;
  }

  it("individual decisions: state→terminal + principal_judged_at populated", () => {
    const r = applyRationaleDecisions({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E1", action: "accept", decided_at: "t" },
          {
            element_id: "E2",
            action: "provide_rationale",
            principal_provided_rationale: { inferred_meaning: "m", justification: "j" },
            decided_at: "t",
          },
        ],
        batch_actions: [],
      },
      currentInferences: inferences(),
      judgedAt: "2026-04-27T12:30:00.000Z",
    });
    expect(r.updates.get("E1")!.rationale_state).toBe("principal_accepted");
    expect(r.updates.get("E1")!.provenance.principal_judged_at).toBe(
      "2026-04-27T12:30:00.000Z",
    );
    const e2 = r.updates.get("E2")!;
    expect(e2.rationale_state).toBe("principal_modified");
    expect(e2.inferred_meaning).toBe("m");
    expect(r.excludedFromSweep).toEqual(new Set(["E1", "E2"]));
  });

  it("batch action covers all target_element_ids", () => {
    const r = applyRationaleDecisions({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [],
        batch_actions: [
          {
            action: "defer",
            target_group: { kind: "rationale_state", rationale_state: "gap" },
            target_element_ids: ["E2"],
            decided_at: "t",
          },
        ],
      },
      currentInferences: inferences(),
      judgedAt: "t",
    });
    expect(r.updates.get("E2")!.rationale_state).toBe("principal_deferred");
  });

  it("individual takes precedence over batch on same element", () => {
    const r = applyRationaleDecisions({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E1", action: "accept", decided_at: "t" },
        ],
        batch_actions: [
          {
            action: "reject",
            target_group: { kind: "rationale_state", rationale_state: "reviewed" },
            target_element_ids: ["E1"],
            decided_at: "t",
          },
        ],
      },
      currentInferences: inferences(),
      judgedAt: "t",
    });
    // accept (individual) wins, not reject (batch)
    expect(r.updates.get("E1")!.rationale_state).toBe("principal_accepted");
  });

  it("accept on domain_scope_miss → principal_confirmed_scope_miss (r2 split)", () => {
    const r = applyRationaleDecisions({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E3", action: "accept", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: inferences(),
      judgedAt: "t",
    });
    expect(r.updates.get("E3")!.rationale_state).toBe(
      "principal_confirmed_scope_miss",
    );
  });
});

describe("carryForwardSweep (§3.5.2 r3 fix — capture-before-overwrite)", () => {
  function inferences() {
    const m = new Map<string, IntentInference>();
    m.set("E1", inf("reviewed"));
    m.set("E2", inf("gap"));
    m.set("E3", inf("empty"));
    m.set("E4", inf("domain_scope_miss")); // excluded from sweep (special case)
    m.set("E5", inf("principal_accepted")); // excluded (terminal)
    return m;
  }

  it("global_reply != confirmed → no sweep (see-below)", () => {
    const r = carryForwardSweep({
      globalReply: "see below",
      currentInferences: inferences(),
      excludedFromSweep: new Set(),
    });
    expect(r.updates.size).toBe(0);
  });

  it("sweep all 5 sweepable source states + capture original_state", () => {
    const r = carryForwardSweep({
      globalReply: "confirmed",
      currentInferences: inferences(),
      excludedFromSweep: new Set(),
    });
    // E1 (reviewed), E2 (gap), E3 (empty) → sweep. E4/E5 excluded by source state.
    expect(r.updates.size).toBe(3);
    const e1 = r.updates.get("E1")!;
    expect(e1.rationale_state).toBe("carry_forward");
    expect(e1.provenance.carry_forward_from).toBe("reviewed");
    expect(e1.provenance.principal_judged_at).toBeNull();

    const e3 = r.updates.get("E3")!;
    expect(e3.provenance.carry_forward_from).toBe("empty");
  });

  it("excludedFromSweep skips per-item/batch addressed elements", () => {
    const r = carryForwardSweep({
      globalReply: "confirmed",
      currentInferences: inferences(),
      excludedFromSweep: new Set(["E1"]),
    });
    expect(r.updates.has("E1")).toBe(false);
    expect(r.updates.has("E2")).toBe(true);
  });

  it("domain_scope_miss is NEVER swept (§3.2 special case)", () => {
    const r = carryForwardSweep({
      globalReply: "confirmed",
      currentInferences: inferences(),
      excludedFromSweep: new Set(),
    });
    expect(r.updates.has("E4")).toBe(false);
  });

  it("terminal principal_* states are never swept", () => {
    const r = carryForwardSweep({
      globalReply: "confirmed",
      currentInferences: inferences(),
      excludedFromSweep: new Set(),
    });
    expect(r.updates.has("E5")).toBe(false);
  });
});

describe("runPhase35 — orchestration (validate → apply → sweep, fail-closed)", () => {
  function inferences() {
    const m = new Map<string, IntentInference>();
    m.set("E1", inf("reviewed"));
    m.set("E2", inf("gap"));
    m.set("E3", inf("empty"));
    return m;
  }

  function snapshotFor(map: Map<string, IntentInference>) {
    return buildPhase3SnapshotDocument({
      session_id: "S",
      written_at: "t",
      intentInferences: map,
    });
  }

  it("apply for E1, sweep for E2 + E3 (validation passes)", () => {
    const map = inferences();
    const r = runPhase35({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E1", action: "accept", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: map,
      judgedAt: "t",
      snapshot: snapshotFor(map),
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.elementUpdates.get("E1")!.rationale_state).toBe(
      "principal_accepted",
    );
    expect(r.elementUpdates.get("E2")!.rationale_state).toBe("carry_forward");
    expect(r.elementUpdates.get("E3")!.rationale_state).toBe("carry_forward");
    expect(r.elementUpdates.get("E2")!.provenance.carry_forward_from).toBe("gap");
    expect(r.elementUpdates.get("E3")!.provenance.carry_forward_from).toBe("empty");
  });

  it("see-below mode: no sweep occurs (validation passes)", () => {
    const map = inferences();
    const r = runPhase35({
      responses: {
        received_at: "t",
        global_reply: "see below",
        rationale_decisions: [
          { element_id: "E1", action: "accept", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: map,
      judgedAt: "t",
      snapshot: snapshotFor(map),
      renderedElementIds: new Set(["E1", "E2", "E3"]),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.elementUpdates.get("E1")!.rationale_state).toBe("principal_accepted");
    expect(r.elementUpdates.has("E2")).toBe(false); // no sweep in see-below
    expect(r.elementUpdates.has("E3")).toBe(false);
  });

  it("fail-closed: validation failure short-circuits apply/sweep (review consensus blocker)", () => {
    const map = inferences();
    const r = runPhase35({
      responses: {
        received_at: "t",
        global_reply: "confirmed",
        rationale_decisions: [
          { element_id: "E_HALLUCINATED", action: "accept", decided_at: "t" },
        ],
        batch_actions: [],
      },
      currentInferences: map,
      judgedAt: "t",
      snapshot: snapshotFor(map),
      renderedElementIds: new Set(),
      throttledOutAddressableIds: new Set(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.validationFailure.code).toBe("phase_3_5_input_invalid");
  });
});
