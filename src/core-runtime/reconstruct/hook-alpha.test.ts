// runtime-mirror-of: step-2-rationale-proposer §6.2 + §3.7 + §6.3.1

import { describe, expect, it } from "vitest";
import {
  runHookAlpha,
  shouldSkipHookAlpha,
  type HookAlphaDeps,
  type HookAlphaInput,
  type ProposerInputPackage,
} from "./hook-alpha.js";
import type { ProposerDirective } from "./proposer-directive-types.js";

function baseInput(overrides: Partial<HookAlphaInput> = {}): HookAlphaInput {
  return {
    meta: {
      stage_transition_state: "pre_alpha",
      stage_transition_retry_count: 0,
      inference_mode: "full",
      stage: 1,
    },
    entityList: [
      {
        id: "E1",
        type: "function",
        name: "doX",
        definition: "does x",
        certainty: "observed",
        source: { locations: ["src/x.ts:10"] },
        relations_summary: [],
      },
      {
        id: "E2",
        type: "function",
        name: "doY",
        definition: "does y",
        certainty: "observed",
        source: { locations: ["src/y.ts:20"] },
        relations_summary: [],
      },
    ],
    manifest: {
      manifest_schema_version: "1.0",
      domain_name: "demo",
      domain_manifest_version: "0.3.0",
      version_hash: "sha256:abc123",
      quality_tier: "full",
      referenced_files: [
        { path: "concepts.md", required: true, min_headings: 3 },
        { path: "structure_spec.md", required: true },
        { path: "logic_rules.md", required: true },
        { path: "domain_scope.md", required: true },
        { path: "auxiliary.md", required: false },
      ],
    },
    injectedFiles: [
      "concepts.md",
      "structure_spec.md",
      "logic_rules.md",
      "domain_scope.md",
    ],
    sessionId: "S1",
    runtimeVersion: "v0.0.0",
    proposerContractVersion: "1.0",
    ...overrides,
  };
}

function makeDeps(
  directive: ProposerDirective | (() => never),
): HookAlphaDeps {
  return {
    spawnProposer: async (_input: ProposerInputPackage) => {
      if (typeof directive === "function") return directive();
      return directive;
    },
    now: () => new Date("2026-04-27T12:00:00.000Z"),
    systemPurpose: "test product",
  };
}

function happyDirective(): ProposerDirective {
  return {
    proposals: [
      {
        target_element_id: "E1",
        outcome: "proposed",
        inferred_meaning: "meaning of doX",
        justification: "explained by concept A",
        domain_refs: [
          { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          { manifest_ref: "structure_spec.md", heading: "## B", excerpt: "y" },
        ],
        confidence: "high",
      },
      {
        target_element_id: "E2",
        outcome: "domain_pack_incomplete",
        state_reason: "no concept for Y",
        domain_refs: [
          { manifest_ref: "domain_scope.md", heading: "## scope", excerpt: "z" },
        ],
      },
    ],
    provenance: {
      proposed_at: "2026-04-27T12:00:00.000Z",
      proposed_by: "rationale-proposer",
      proposer_contract_version: "1.0",
      manifest_schema_version: "1.0",
      domain_manifest_version: "0.3.0",
      domain_manifest_hash: "sha256:abc123",
      domain_quality_tier: "full",
      session_id: "S1",
      runtime_version: "v0.0.0",
      input_chunks: 1,
      truncated_fields: [],
      effective_injected_files: [
        "concepts.md",
        "structure_spec.md",
        "logic_rules.md",
        "domain_scope.md",
      ],
    },
  };
}

describe("shouldSkipHookAlpha (§6.2 step 5a precondition)", () => {
  it("skips when inference_mode == none", () => {
    const input = baseInput({
      meta: {
        stage_transition_state: "pre_alpha",
        stage_transition_retry_count: 0,
        inference_mode: "none",
        stage: 1,
      },
    });
    expect(shouldSkipHookAlpha(input)).toBe(true);
  });

  it("skips when entity_list is empty", () => {
    const input = baseInput({ entityList: [] });
    expect(shouldSkipHookAlpha(input)).toBe(true);
  });

  it("does not skip when full + ≥1 entity", () => {
    expect(shouldSkipHookAlpha(baseInput())).toBe(false);
  });
});

describe("runHookAlpha — happy path (completed)", () => {
  it("returns alpha_completed + setMetaStage 2 + element updates + warnings", async () => {
    const result = await runHookAlpha(baseInput(), makeDeps(happyDirective()));
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.nextState).toBe("alpha_completed");
    expect(result.setMetaStage).toBe(2);
    expect(result.elementUpdates.size).toBe(2);

    const e1 = result.elementUpdates.get("E1")!;
    expect(e1.rationale_state).toBe("proposed");
    expect(e1.inferred_meaning).toBe("meaning of doX");
    expect(e1.confidence).toBe("high"); // not downgraded (≥2 required refs)
    expect(e1.provenance.gate_count).toBe(1); // r3-amendment

    const e2 = result.elementUpdates.get("E2")!;
    expect(e2.rationale_state).toBe("domain_pack_incomplete");
    expect(e2.state_reason).toBe("no concept for Y");
    expect(e2.domain_refs).toHaveLength(1);
    expect(e2.inferred_meaning).toBeUndefined();

    // pack_missing_areas: 1 group (E2's domain_scope.md ## scope)
    expect(result.packMissingAreas).toHaveLength(1);
    expect(result.packMissingAreas[0]!.element_ids).toEqual(["E2"]);
  });

  it("populates session-level provenance for each element", async () => {
    const result = await runHookAlpha(baseInput(), makeDeps(happyDirective()));
    if (result.kind !== "completed") throw new Error("not completed");
    for (const inference of result.elementUpdates.values()) {
      expect(inference.provenance.proposed_by).toBe("rationale-proposer");
      expect(inference.provenance.session_id).toBe("S1");
      expect(inference.provenance.domain_manifest_hash).toBe("sha256:abc123");
    }
  });
});

describe("runHookAlpha — skip path", () => {
  it("inference_mode=none → kind=skipped + setMetaStage 2", async () => {
    const input = baseInput({
      meta: {
        stage_transition_state: "pre_alpha",
        stage_transition_retry_count: 0,
        inference_mode: "none",
        stage: 1,
      },
    });
    const result = await runHookAlpha(input, makeDeps(happyDirective()));
    expect(result.kind).toBe("skipped");
    if (result.kind !== "skipped") return;
    expect(result.nextState).toBe("alpha_skipped");
    expect(result.setMetaStage).toBe(2);
  });

  it("entity_list empty → kind=skipped", async () => {
    const input = baseInput({ entityList: [] });
    const result = await runHookAlpha(input, makeDeps(happyDirective()));
    expect(result.kind).toBe("skipped");
  });

  it("skip from non-pre_alpha state is illegal", async () => {
    const input = baseInput({
      entityList: [],
      meta: {
        stage_transition_state: "alpha_in_progress",
        stage_transition_retry_count: 0,
        inference_mode: "full",
        stage: 1,
      },
    });
    const result = await runHookAlpha(input, makeDeps(happyDirective()));
    expect(result.kind).toBe("illegal_invocation");
  });
});

describe("runHookAlpha — failure paths", () => {
  it("spawn throw → kind=failed code=spawn_failure", async () => {
    const result = await runHookAlpha(
      baseInput(),
      makeDeps(() => {
        throw new Error("LLM unreachable");
      }),
    );
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.nextState).toBe("alpha_failed_retry_pending");
    expect(result.setMetaStage).toBeNull();
    expect(result.reject.code).toBe("spawn_failure");
    expect(result.reject.detail).toContain("LLM unreachable");
  });

  it("validator reject → kind=failed with reject code from validator", async () => {
    const bad: ProposerDirective = {
      ...happyDirective(),
      proposals: [
        {
          target_element_id: "E1",
          outcome: "gap",
          state_reason: "x",
        },
        {
          target_element_id: "E_HALLUCINATED",
          outcome: "gap",
          state_reason: "y",
        },
      ],
    };
    const result = await runHookAlpha(baseInput(), makeDeps(bad));
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.reject.code).toBe("hallucinated_target_element_id");
  });

  it("D1/D2 downgrade still completes (warning, not reject)", async () => {
    const directive: ProposerDirective = {
      ...happyDirective(),
      proposals: [
        {
          target_element_id: "E1",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [
            { manifest_ref: "concepts.md", heading: "## A", excerpt: "x" },
          ],
          confidence: "high", // → D1 medium
        },
        {
          target_element_id: "E2",
          outcome: "proposed",
          inferred_meaning: "m",
          justification: "j",
          domain_refs: [], // → D2 low
          confidence: "high",
        },
      ],
    };
    const result = await runHookAlpha(baseInput(), makeDeps(directive));
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.warnings.some((w) => w.rule === "D1")).toBe(true);
    expect(result.warnings.some((w) => w.rule === "D2")).toBe(true);
  });
});

describe("runHookAlpha — illegal invocation states", () => {
  it.each(["alpha_skipped", "alpha_completed", "alpha_failed_continued_v0", "alpha_failed_aborted"] as const)(
    "%s → illegal_invocation",
    async (state) => {
      const input = baseInput({
        meta: {
          stage_transition_state: state,
          stage_transition_retry_count: 0,
          inference_mode: "full",
          stage: 1,
        },
      });
      const result = await runHookAlpha(input, makeDeps(happyDirective()));
      expect(result.kind).toBe("illegal_invocation");
    },
  );
});
