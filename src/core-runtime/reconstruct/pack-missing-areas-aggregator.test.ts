// runtime-mirror-of: step-2-rationale-proposer §6.3.1

import { describe, expect, it } from "vitest";
import { aggregatePackMissingAreas } from "./pack-missing-areas-aggregator.js";
import type { ProposerProposal } from "./proposer-directive-types.js";

function packIncomplete(
  id: string,
  refs: { manifest_ref: string; heading: string }[],
): ProposerProposal {
  return {
    target_element_id: id,
    outcome: "domain_pack_incomplete",
    state_reason: "test reason",
    domain_refs: refs.map((r) => ({
      manifest_ref: r.manifest_ref,
      heading: r.heading,
      excerpt: "x",
    })),
  };
}

function gap(id: string): ProposerProposal {
  return {
    target_element_id: id,
    outcome: "gap",
    state_reason: "no match",
  };
}

function proposed(id: string): ProposerProposal {
  return {
    target_element_id: id,
    outcome: "proposed",
    inferred_meaning: "m",
    justification: "j",
    domain_refs: [],
    confidence: "low",
  };
}

describe("aggregatePackMissingAreas (W-A-88 §6.3.1)", () => {
  it("returns [] when no domain_pack_incomplete proposals", () => {
    expect(
      aggregatePackMissingAreas([gap("E1"), proposed("E2")]),
    ).toEqual([]);
  });

  it("groups by exact manifest_ref + heading match", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
      packIncomplete("E2", [
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
      packIncomplete("E3", [
        { manifest_ref: "concepts.md", heading: "## B" },
      ]),
    ]);
    expect(result).toEqual([
      {
        grouping_key: { manifest_ref: "concepts.md", heading: "## A" },
        element_ids: ["E1", "E2"],
      },
      {
        grouping_key: { manifest_ref: "concepts.md", heading: "## B" },
        element_ids: ["E3"],
      },
    ]);
  });

  it("treats different manifest_ref as different groups (non-semantic)", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "concepts.md", heading: "## Session" },
      ]),
      packIncomplete("E2", [
        { manifest_ref: "structure_spec.md", heading: "## Session" },
      ]),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.grouping_key.manifest_ref).sort()).toEqual([
      "concepts.md",
      "structure_spec.md",
    ]);
  });

  it("treats heading paraphrase as different groups (non-semantic)", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "concepts.md", heading: "## Sessions" },
      ]),
      packIncomplete("E2", [
        { manifest_ref: "concepts.md", heading: "## Session" },
      ]),
    ]);
    expect(result).toHaveLength(2); // singular vs plural — different headings
  });

  it("excludes gap / domain_scope_miss / proposed from aggregation", () => {
    const result = aggregatePackMissingAreas([
      gap("E1"),
      {
        target_element_id: "E2",
        outcome: "domain_scope_miss",
        state_reason: "out of scope",
      },
      proposed("E3"),
      packIncomplete("E4", [
        { manifest_ref: "concepts.md", heading: "## X" },
      ]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.element_ids).toEqual(["E4"]);
  });

  it("orders groups deterministically (manifest_ref then heading lexicographic)", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "z.md", heading: "## A" },
      ]),
      packIncomplete("E2", [
        { manifest_ref: "a.md", heading: "## Z" },
      ]),
      packIncomplete("E3", [
        { manifest_ref: "a.md", heading: "## A" },
      ]),
    ]);
    expect(result.map((g) => `${g.grouping_key.manifest_ref}:${g.grouping_key.heading}`)).toEqual([
      "a.md:## A",
      "a.md:## Z",
      "z.md:## A",
    ]);
  });

  it("element_ids within a group are sorted", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("Z", [
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
      packIncomplete("A", [
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
      packIncomplete("M", [
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
    ]);
    expect(result[0]!.element_ids).toEqual(["A", "M", "Z"]);
  });

  it("element with multiple refs contributes to each group", () => {
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "concepts.md", heading: "## A" },
        { manifest_ref: "concepts.md", heading: "## B" },
      ]),
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.element_ids.includes("E1"))).toBe(true);
  });

  it("does not duplicate element_id within the same group", () => {
    // (degenerate: same ref appearing twice in domain_refs)
    const result = aggregatePackMissingAreas([
      packIncomplete("E1", [
        { manifest_ref: "concepts.md", heading: "## A" },
        { manifest_ref: "concepts.md", heading: "## A" },
      ]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.element_ids).toEqual(["E1"]);
  });
});
