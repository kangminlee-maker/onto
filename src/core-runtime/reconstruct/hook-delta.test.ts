// runtime-mirror-of: step-4-integration §2.5 + §2.6 + §3.4.1

import { describe, expect, it } from "vitest";
import {
  computePriorityScore,
  DEFAULT_HOOK_DELTA_CONFIG,
  resolveGroupingKey,
  runHookDelta,
  type HookDeltaConfig,
  type PendingElement,
} from "./hook-delta.js";
import type {
  IntentInference,
  PackMissingArea,
  RationaleState,
} from "./wip-element-types.js";

function provenance(gateCount = 1): IntentInference["provenance"] {
  return {
    proposed_at: "2026-04-27T12:00:00.000Z",
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

function elt(
  id: string,
  state: RationaleState,
  opts: {
    confidence?: "low" | "medium" | "high" | null;
    gate?: number;
    stage?: 1 | 2;
    domain_refs?: { manifest_ref: string; heading: string; excerpt: string }[];
  } = {},
): PendingElement {
  const inf: IntentInference = {
    rationale_state: state,
    provenance: provenance(opts.gate ?? 1),
  };
  if (opts.confidence !== undefined && opts.confidence !== null) {
    inf.confidence = opts.confidence;
  }
  if (opts.domain_refs) inf.domain_refs = opts.domain_refs;
  return {
    element_id: id,
    intent_inference: inf,
    added_in_stage: opts.stage ?? 1,
  };
}

describe("computePriorityScore (§2.5)", () => {
  it("empty (gate=1) > gap > proposed > domain_scope_miss > reviewed", () => {
    const empty = computePriorityScore(elt("e", "empty", { gate: 1 }));
    const gap = computePriorityScore(elt("g", "gap", { gate: 1 }));
    const proposed = computePriorityScore(elt("p", "proposed", { confidence: "low", gate: 1 }));
    const scopeMiss = computePriorityScore(elt("sm", "domain_scope_miss", { gate: 1 }));
    const reviewedHigh = computePriorityScore(
      elt("rh", "reviewed", { confidence: "high", gate: 2 }),
    );
    expect(empty).toBeGreaterThan(gap);
    expect(gap).toBeGreaterThan(proposed);
    expect(proposed).toBeGreaterThan(scopeMiss);
    expect(scopeMiss).toBeGreaterThan(reviewedHigh);
  });

  it("Stage 2 origin gets +50 bonus", () => {
    const s1 = computePriorityScore(elt("a", "gap", { stage: 1, gate: 1 }));
    const s2 = computePriorityScore(elt("b", "gap", { stage: 2, gate: 1 }));
    expect(s2 - s1).toBe(50);
  });

  it("gate_count=1 single-gate gets +10 bonus, gate_count>=2 = 0", () => {
    const single = computePriorityScore(elt("a", "gap", { gate: 1 }));
    const dual = computePriorityScore(elt("b", "gap", { gate: 2 }));
    expect(single - dual).toBe(10);
  });

  it("reviewed confidence sub-tier: low > medium > high", () => {
    const low = computePriorityScore(
      elt("a", "reviewed", { confidence: "low", gate: 2 }),
    );
    const med = computePriorityScore(
      elt("b", "reviewed", { confidence: "medium", gate: 2 }),
    );
    const high = computePriorityScore(
      elt("c", "reviewed", { confidence: "high", gate: 2 }),
    );
    expect(low).toBe(4900); // 4*1000 + 9*100
    expect(med).toBe(4800);
    expect(high).toBe(4700);
  });
});

describe("resolveGroupingKey (§3.4.1)", () => {
  const noPackAreas: PackMissingArea[] = [];

  it("gap → rationale_state grouping", () => {
    const r = resolveGroupingKey(elt("g", "gap"), noPackAreas);
    expect(r?.kind).toBe("rationale_state");
  });

  it("empty → rationale_state grouping", () => {
    const r = resolveGroupingKey(elt("e", "empty"), noPackAreas);
    expect(r?.kind).toBe("rationale_state");
  });

  it("domain_scope_miss → rationale_state grouping", () => {
    const r = resolveGroupingKey(elt("sm", "domain_scope_miss"), noPackAreas);
    expect(r?.kind).toBe("rationale_state");
  });

  it("reviewed → rationale_state_with_confidence", () => {
    const r = resolveGroupingKey(
      elt("r", "reviewed", { confidence: "low" }),
      noPackAreas,
    );
    expect(r?.kind).toBe("rationale_state_with_confidence");
  });

  it("proposed (single-gate, non-degraded) → rationale_state_single_gate", () => {
    const r = resolveGroupingKey(elt("p", "proposed", { gate: 1 }), noPackAreas);
    expect(r?.kind).toBe("rationale_state_single_gate");
  });

  it("proposed (gate=2, γ-degraded) → rationale_state grouping", () => {
    const r = resolveGroupingKey(elt("p", "proposed", { gate: 2 }), noPackAreas);
    expect(r?.kind).toBe("rationale_state");
  });

  it("domain_pack_incomplete with matching pack_missing_area → pack_missing_area", () => {
    const packAreas: PackMissingArea[] = [
      {
        grouping_key: { manifest_ref: "concepts.md", heading: "## A" },
        element_ids: ["e1"],
      },
    ];
    const r = resolveGroupingKey(
      elt("e1", "domain_pack_incomplete", {
        domain_refs: [
          { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
        ],
      }),
      packAreas,
    );
    expect(r?.kind).toBe("pack_missing_area");
  });

  it("terminal principal_* state → null grouping", () => {
    const r = resolveGroupingKey(elt("p", "principal_accepted"), noPackAreas);
    expect(r).toBeNull();
  });
});

describe("runHookDelta — exhaustive partition invariant", () => {
  it("rendered + throttled == total for all configs", () => {
    const elements: PendingElement[] = [];
    for (let i = 0; i < 30; i++) {
      elements.push(elt(`e${i}`, "gap"));
    }
    const result = runHookDelta(elements, [], false);
    expect(result.rendered_count + result.throttled_out_count).toBe(30);
    expect(result.entries).toHaveLength(30);
  });

  it("small queue (<= max_individual_items): all individual", () => {
    const elements: PendingElement[] = [];
    for (let i = 0; i < 5; i++) elements.push(elt(`e${i}`, "gap"));
    const result = runHookDelta(elements, [], false);
    expect(result.entries.every((e) => e.render_bucket === "individual")).toBe(true);
    expect(result.throttled_out_count).toBe(0);
  });
});

describe("runHookDelta — bucket assignment", () => {
  it("priority-top max_individual_items → individual", () => {
    const elements: PendingElement[] = [];
    for (let i = 0; i < 30; i++) {
      elements.push(elt(`e${i}`, "empty")); // all empty (highest weight)
    }
    const result = runHookDelta(elements, [], false);
    const individualCount = result.entries.filter(
      (e) => e.render_bucket === "individual",
    ).length;
    // max_individual_items = 20, but residual (sub-threshold groups) may push more
    // total <100 (hard_cap), so all go individual or one of the groups
    expect(individualCount).toBeGreaterThanOrEqual(20);
  });

  it("group_sample + group_truncated split for groups above threshold", () => {
    // 25 gap elements — 20 priority-top individual, 5 residual would form
    // a group on rationale_state=gap (≥ grouping_threshold=5)
    const elements: PendingElement[] = [];
    for (let i = 0; i < 30; i++) {
      elements.push(elt(`e${i}`, "gap"));
    }
    // To force grouping we need > 20 priority-top + ≥5 same-key remaining
    // total 30 → 20 priority-top + 10 remaining (all gap key) → ≥5 → group
    const result = runHookDelta(elements, [], false);
    const samples = result.entries.filter(
      (e) => e.render_bucket === "group_sample",
    );
    const truncated = result.entries.filter(
      (e) => e.render_bucket === "group_truncated",
    );
    expect(samples.length).toBe(3); // group_summary_sample_count default 3
    expect(truncated.length).toBe(7); // 10 remaining - 3 samples
  });

  it("residual under grouping_threshold falls back to individual", () => {
    // 22 elements: 20 priority-top + 2 residual same-key (< threshold 5) → individual
    const elements: PendingElement[] = [];
    for (let i = 0; i < 22; i++) elements.push(elt(`e${i}`, "gap"));
    const result = runHookDelta(elements, [], false);
    const individuals = result.entries.filter(
      (e) => e.render_bucket === "individual",
    );
    expect(individuals.length).toBe(22); // residual 2 fall to individual list
    expect(result.throttled_out_count).toBe(0);
  });

  it("individual hard cap → throttled_out", () => {
    const config: HookDeltaConfig = {
      ...DEFAULT_HOOK_DELTA_CONFIG,
      max_individual_items: 5,
      grouping_threshold: 1000, // disable grouping
      max_individual_items_hard_cap: 10,
    };
    const elements: PendingElement[] = [];
    for (let i = 0; i < 15; i++) elements.push(elt(`e${i}`, "gap"));
    const result = runHookDelta(elements, [], false, config);
    const individuals = result.entries.filter(
      (e) => e.render_bucket === "individual",
    );
    const throttled = result.entries.filter(
      (e) => e.render_bucket === "throttled_out",
    );
    expect(individuals.length).toBe(10);
    expect(throttled.length).toBe(5);
  });
});

describe("runHookDelta — priority sort + histogram", () => {
  it("higher priority elements come earlier in entries (within bucket)", () => {
    const elements: PendingElement[] = [
      elt("low", "reviewed", { confidence: "high", gate: 2 }),
      elt("high", "empty", { gate: 1 }),
    ];
    const result = runHookDelta(elements, [], false);
    expect(result.entries[0]!.element_id).toBe("high");
    expect(result.entries[1]!.element_id).toBe("low");
  });

  it("gate_count_histogram aggregates by gate_count", () => {
    const elements: PendingElement[] = [
      elt("a", "gap", { gate: 1 }),
      elt("b", "gap", { gate: 1 }),
      elt("c", "gap", { gate: 2 }),
    ];
    const result = runHookDelta(elements, [], false);
    expect(result.gate_count_histogram).toEqual({ "1": 2, "2": 1 });
  });
});

describe("runHookDelta — pack_missing_area path (W-A-88 hand-off)", () => {
  it("domain_pack_incomplete with matching aggregate keys → pack_missing_area grouping", () => {
    const packAreas: PackMissingArea[] = [
      {
        grouping_key: { manifest_ref: "concepts.md", heading: "## A" },
        element_ids: ["e1", "e2", "e3", "e4", "e5", "e6"],
      },
    ];
    const elements: PendingElement[] = [];
    for (let i = 0; i < 30; i++) {
      // 25 unrelated empties + 6 pack_incomplete (will form group)
      elements.push(elt(`u${i}`, "empty", { gate: 1 }));
    }
    for (let i = 1; i <= 6; i++) {
      elements.push(
        elt(`e${i}`, "domain_pack_incomplete", {
          domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          ],
          gate: 1,
        }),
      );
    }
    const result = runHookDelta(elements, packAreas, false);
    const groupSampleEntries = result.entries.filter(
      (e) =>
        e.render_bucket === "group_sample" &&
        e.grouping_kind === "pack_missing_area",
    );
    expect(groupSampleEntries.length).toBe(3); // group_summary_sample_count
  });
});
