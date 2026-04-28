import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DeliberationOptInError,
  buildDeliberationPlan,
  buildPeerDeliberationPrompt,
  deliberationArtifactPath,
  extractConflictingPairsFromSynthesize1,
  extractDisagreementsFromPeerArtifacts,
  readDeliberationArtifact,
  requireDeliberationOptIn,
  runLensAgentDeliberation,
  writeDeliberationArtifact,
  type ConflictingLensPair,
  type LensPrimaryOutput,
  type PeerArtifactEntry,
} from "./teamcreate-lens-deliberation-executor.js";

// ---------------------------------------------------------------------------
// These tests assert the Option E (2026-04-29) deliberation protocol
// invariants, including the C1/C2/R1 fix-up for the xhigh round-1 review:
//
// (1) Triple opt-in is enforced at module boundary.
// (2) Peer prompt embeds peer's primary output + target_section +
//     conflict_summary.
// (3) Artifact paths are deterministic AND order-independent AND
//     **per-conflict unique** (C1) — the same lens pair with multiple
//     conflicts must NOT collide on a single path.
// (4) Read/write round-trip preserves content.
// (5) extractConflictingPairsFromSynthesize1 returns `{resolved, skipped}`,
//     records skip reasons (unknown lens id / missing id / duplicate id /
//     missing field), and never silently drops malformed entries.
// (6) extractDisagreementsFromPeerArtifacts carries (source, peer,
//     conflict_id, target_section) onto each Disagreement.
// (7) buildDeliberationPlan emits 2 steps per conflicting pair (parallel
//     symmetric replies — R1) and propagates conflict_id to each step.
// (8) runLensAgentDeliberation:
//       - empty pairs + no expected_status → empty plan (no-conflict path)
//       - empty pairs + expected_status="needed" → throws (C2 silent
//         collapse guard)
//       - non-empty pairs → reads each unique primary once, populates plan.
// ---------------------------------------------------------------------------

const PRIMARY_OUTPUTS: LensPrimaryOutput[] = [
  { lens_id: "logic", output_path: "/tmp/fake/round0/logic.md" },
  { lens_id: "pragmatics", output_path: "/tmp/fake/round0/pragmatics.md" },
  { lens_id: "axiology", output_path: "/tmp/fake/round0/axiology.md" },
];

function pairFromIds(
  id: string,
  a_id: string,
  b_id: string,
  target_section: string,
  summary: string,
): ConflictingLensPair {
  const a = PRIMARY_OUTPUTS.find((p) => p.lens_id === a_id);
  const b = PRIMARY_OUTPUTS.find((p) => p.lens_id === b_id);
  if (!a || !b) throw new Error("test fixture lens_id missing");
  return { id, lens_a: a, lens_b: b, target_section, summary };
}

// ---------------------------------------------------------------------------
// requireDeliberationOptIn
// ---------------------------------------------------------------------------

describe("requireDeliberationOptIn", () => {
  it("passes when all three flags satisfied", () => {
    expect(() =>
      requireDeliberationOptIn(
        { lens_agent_teams_mode: true },
        {
          CLAUDECODE: "1",
          CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
        },
      ),
    ).not.toThrow();
  });

  it("throws with CLAUDECODE missing", () => {
    try {
      requireDeliberationOptIn(
        { lens_agent_teams_mode: true },
        { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(DeliberationOptInError);
      expect((err as DeliberationOptInError).missing.join("\n")).toContain("CLAUDECODE=1");
    }
  });

  it("throws with experimental flag missing", () => {
    try {
      requireDeliberationOptIn(
        { lens_agent_teams_mode: true },
        { CLAUDECODE: "1" },
      );
      expect.fail("expected throw");
    } catch (err) {
      const m = (err as DeliberationOptInError).missing.join("\n");
      expect(m).toContain("EXPERIMENTAL_AGENT_TEAMS");
    }
  });

  it("throws with config.lens_agent_teams_mode missing", () => {
    try {
      requireDeliberationOptIn(
        {},
        {
          CLAUDECODE: "1",
          CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
        },
      );
      expect.fail("expected throw");
    } catch (err) {
      const m = (err as DeliberationOptInError).missing.join("\n");
      expect(m).toContain("lens_agent_teams_mode");
    }
  });
});

// ---------------------------------------------------------------------------
// buildPeerDeliberationPrompt
// ---------------------------------------------------------------------------

describe("buildPeerDeliberationPrompt", () => {
  it("embeds peer output + conflict context + own lens identity", () => {
    const prompt = buildPeerDeliberationPrompt({
      own_lens_id: "logic",
      peer_lens_id: "axiology",
      peer_output: "axiology lens primary content",
      target_section: "structure-section-3",
      conflict_summary: "logic flags type narrowing; axiology defends value alignment",
    });
    expect(prompt).toContain('lens "logic" replying to "axiology"');
    expect(prompt).toContain("axiology lens primary content");
    expect(prompt).toContain("structure-section-3");
    expect(prompt).toContain("logic flags type narrowing");
  });

  it("declares required response section headings (합의 / 이견 / 합성)", () => {
    const prompt = buildPeerDeliberationPrompt({
      own_lens_id: "pragmatics",
      peer_lens_id: "conciseness",
      peer_output: "<peer>",
      target_section: "naming",
      conflict_summary: "<summary>",
    });
    expect(prompt).toContain("## 합의 가능 지점");
    expect(prompt).toContain("## 지속적 이견");
    expect(prompt).toContain("- **이견 항목**");
    expect(prompt).toContain("## 합성 제안");
  });

  it("scopes the reply to the conflict (target 영역 한정)", () => {
    const prompt = buildPeerDeliberationPrompt({
      own_lens_id: "logic",
      peer_lens_id: "semantics",
      peer_output: "<peer>",
      target_section: "narrowing",
      conflict_summary: "<summary>",
    });
    expect(prompt).toContain("target 영역 에 한정");
  });
});

// ---------------------------------------------------------------------------
// deliberationArtifactPath
// ---------------------------------------------------------------------------

describe("deliberationArtifactPath", () => {
  it("computes pair directory from sorted lens ids and includes conflict_id subdir", () => {
    const p = deliberationArtifactPath("/sess/delib", "logic", "axiology", "narrowing-1", "logic");
    expect(p).toBe(
      path.join("/sess/delib", "axiology--logic", "narrowing-1", "logic-deliberation.md"),
    );
  });

  it("is order-independent: (a,b) and (b,a) resolve to the same directory", () => {
    const ab = deliberationArtifactPath("/sess/delib", "logic", "axiology", "c1", "axiology");
    const ba = deliberationArtifactPath("/sess/delib", "axiology", "logic", "c1", "axiology");
    expect(ab).toBe(ba);
  });

  it("authoring lens determines the file name within the conflict directory", () => {
    const fromA = deliberationArtifactPath("/sess/delib", "logic", "axiology", "c1", "logic");
    const fromB = deliberationArtifactPath("/sess/delib", "logic", "axiology", "c1", "axiology");
    expect(path.dirname(fromA)).toBe(path.dirname(fromB));
    expect(path.basename(fromA)).toBe("logic-deliberation.md");
    expect(path.basename(fromB)).toBe("axiology-deliberation.md");
  });

  it("C1: same lens pair with different conflict_ids resolves to distinct paths", () => {
    const p1 = deliberationArtifactPath("/sess/delib", "logic", "axiology", "c1", "logic");
    const p2 = deliberationArtifactPath("/sess/delib", "logic", "axiology", "c2", "logic");
    expect(p1).not.toBe(p2);
    expect(path.dirname(p1)).not.toBe(path.dirname(p2));
  });
});

// ---------------------------------------------------------------------------
// writeDeliberationArtifact / readDeliberationArtifact
// ---------------------------------------------------------------------------

describe("write/read deliberation artifact round-trip", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "onto-delib-rw-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("preserves content across write+read", async () => {
    const written = await writeDeliberationArtifact(
      tmpDir,
      "logic",
      "axiology",
      "narrowing-1",
      "logic",
      "## 합의 가능 지점\n내용\n",
    );
    expect(written).toBe(
      deliberationArtifactPath(tmpDir, "logic", "axiology", "narrowing-1", "logic"),
    );
    const back = await readDeliberationArtifact(
      tmpDir,
      "logic",
      "axiology",
      "narrowing-1",
      "logic",
    );
    expect(back).toBe("## 합의 가능 지점\n내용\n");
  });
});

// ---------------------------------------------------------------------------
// extractConflictingPairsFromSynthesize1
// ---------------------------------------------------------------------------

describe("extractConflictingPairsFromSynthesize1", () => {
  const lookup = new Map(PRIMARY_OUTPUTS.map((p) => [p.lens_id, p]));

  it("returns empty resolved + empty skipped for null/undefined frontmatter", () => {
    expect(extractConflictingPairsFromSynthesize1(null, lookup)).toEqual({
      resolved: [],
      skipped: [],
    });
    expect(extractConflictingPairsFromSynthesize1(undefined, lookup)).toEqual({
      resolved: [],
      skipped: [],
    });
  });

  it("returns empty resolved + empty skipped when conflicting_pairs absent or empty", () => {
    expect(
      extractConflictingPairsFromSynthesize1(
        { deliberation_status: "not_needed" },
        lookup,
      ),
    ).toEqual({ resolved: [], skipped: [] });
    expect(
      extractConflictingPairsFromSynthesize1(
        { conflicting_pairs: [] },
        lookup,
      ),
    ).toEqual({ resolved: [], skipped: [] });
  });

  it("resolves entries with valid id + lens ids + fields", () => {
    const out = extractConflictingPairsFromSynthesize1(
      {
        deliberation_status: "needed",
        conflicting_pairs: [
          {
            id: "narrowing-1",
            lens_a: "logic",
            lens_b: "axiology",
            target_section: "structure-section-3",
            summary: "narrowing concern vs value alignment",
          },
        ],
      },
      lookup,
    );
    expect(out.resolved).toHaveLength(1);
    expect(out.skipped).toHaveLength(0);
    expect(out.resolved[0]!.id).toBe("narrowing-1");
    expect(out.resolved[0]!.lens_a.lens_id).toBe("logic");
    expect(out.resolved[0]!.lens_b.lens_id).toBe("axiology");
  });

  it("skips entries with unknown lens_id and records reason", () => {
    const out = extractConflictingPairsFromSynthesize1(
      {
        conflicting_pairs: [
          { id: "c1", lens_a: "logic", lens_b: "unknown-lens", target_section: "x", summary: "y" },
          { id: "c2", lens_a: "logic", lens_b: "pragmatics", target_section: "n", summary: "m" },
        ],
      },
      lookup,
    );
    expect(out.resolved).toHaveLength(1);
    expect(out.resolved[0]!.id).toBe("c2");
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toBe("unknown_lens_id");
  });

  it("skips entries with missing id and records reason", () => {
    const out = extractConflictingPairsFromSynthesize1(
      {
        conflicting_pairs: [
          // @ts-expect-error — deliberately omitting id to exercise validation
          { lens_a: "logic", lens_b: "axiology", target_section: "x", summary: "y" },
        ],
      },
      lookup,
    );
    expect(out.resolved).toHaveLength(0);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toBe("missing_id");
  });

  it("skips entries with duplicate id and records reason", () => {
    const out = extractConflictingPairsFromSynthesize1(
      {
        conflicting_pairs: [
          { id: "dup", lens_a: "logic", lens_b: "axiology", target_section: "x", summary: "y" },
          { id: "dup", lens_a: "logic", lens_b: "pragmatics", target_section: "x", summary: "y" },
        ],
      },
      lookup,
    );
    expect(out.resolved).toHaveLength(1);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toBe("duplicate_id");
  });

  it("skips entries with missing field and records reason", () => {
    const out = extractConflictingPairsFromSynthesize1(
      {
        conflicting_pairs: [
          // @ts-expect-error — deliberately omitting target_section
          { id: "c1", lens_a: "logic", lens_b: "axiology", summary: "y" },
        ],
      },
      lookup,
    );
    expect(out.resolved).toHaveLength(0);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0]!.reason).toBe("missing_field");
  });
});

// ---------------------------------------------------------------------------
// extractDisagreementsFromPeerArtifacts
// ---------------------------------------------------------------------------

describe("extractDisagreementsFromPeerArtifacts", () => {
  it("parses 지속적 이견 section and carries (source, peer, conflict_id, target) trio", () => {
    const artifacts: PeerArtifactEntry[] = [
      {
        source_lens_id: "logic",
        peer_lens_id: "axiology",
        conflict_id: "narrowing-1",
        target_section: "structure-section-3",
        content: [
          "## 합의 가능 지점",
          "- 일부 동의",
          "",
          "## 지속적 이견",
          "- **이견 항목**: 타입 좁히기 우선",
          "  - 본 lens (logic) 입장: 좁히기 미흡 catch 우선",
          "  - peer lens (axiology) 입장: principal goal 우선",
          "  - 해소 경로 (있다면): 없음",
          "",
          "## 합성 제안",
          "없음",
        ].join("\n"),
      },
    ];
    const out = extractDisagreementsFromPeerArtifacts(artifacts);
    expect(out).toHaveLength(1);
    expect(out[0]!.source_lens_id).toBe("logic");
    expect(out[0]!.peer_lens_id).toBe("axiology");
    expect(out[0]!.conflict_id).toBe("narrowing-1");
    expect(out[0]!.target_section).toBe("structure-section-3");
    expect(out[0]!.title).toBe("타입 좁히기 우선");
  });

  it("tolerates English heading variant", () => {
    const artifacts: PeerArtifactEntry[] = [
      {
        source_lens_id: "x",
        peer_lens_id: "y",
        conflict_id: "c1",
        target_section: "z",
        content: [
          "## Persistent Disagreements",
          "- **이견 항목**: 영문 변형",
          "  설명",
        ].join("\n"),
      },
    ];
    expect(extractDisagreementsFromPeerArtifacts(artifacts)).toHaveLength(1);
  });

  it("returns empty when section absent", () => {
    const artifacts: PeerArtifactEntry[] = [
      {
        source_lens_id: "x",
        peer_lens_id: "y",
        conflict_id: "c1",
        target_section: "z",
        content: "## 합의 가능 지점\n전부 합의\n",
      },
    ];
    expect(extractDisagreementsFromPeerArtifacts(artifacts)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildDeliberationPlan
// ---------------------------------------------------------------------------

describe("buildDeliberationPlan", () => {
  it("returns empty plan for empty conflicting_pairs", () => {
    const plan = buildDeliberationPlan(
      { conflicting_pairs: [], deliberation_dir: "/sess/delib" },
      () => "<unused prompt>",
    );
    expect(plan.steps).toEqual([]);
    expect(plan.all_artifact_paths).toEqual([]);
  });

  it("emits 2 steps per pair (parallel symmetric replies) with conflict_id propagated", () => {
    const plan = buildDeliberationPlan(
      {
        conflicting_pairs: [
          pairFromIds("c1", "logic", "axiology", "structure-section-3", "summary 1"),
          pairFromIds("c2", "pragmatics", "logic", "naming-area", "summary 2"),
        ],
        deliberation_dir: "/sess/delib",
      },
      (own, peer, pair) =>
        `prompt|${own.lens_id}|${peer.lens_id}|${pair.id}|${pair.target_section}`,
    );
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[0]).toMatchObject({
      lens_id: "logic",
      peer_lens_id: "axiology",
      conflict_id: "c1",
    });
    expect(plan.steps[1]).toMatchObject({
      lens_id: "axiology",
      peer_lens_id: "logic",
      conflict_id: "c1",
    });
    expect(plan.steps[2]).toMatchObject({
      lens_id: "pragmatics",
      peer_lens_id: "logic",
      conflict_id: "c2",
    });
    expect(plan.steps[3]).toMatchObject({
      lens_id: "logic",
      peer_lens_id: "pragmatics",
      conflict_id: "c2",
    });
  });

  it("C1: same lens pair with multiple conflicts produces distinct artifact paths", () => {
    const plan = buildDeliberationPlan(
      {
        conflicting_pairs: [
          pairFromIds("c1", "logic", "axiology", "structure-section-3", "summary 1"),
          pairFromIds("c2", "logic", "axiology", "naming-area", "summary 2"),
        ],
        deliberation_dir: "/sess/delib",
      },
      () => "<prompt>",
    );
    expect(plan.steps).toHaveLength(4);
    const paths = plan.steps.map((s) => s.artifact_path);
    // All 4 paths are distinct — no two conflicts on the same pair collide.
    expect(new Set(paths).size).toBe(4);
    // First two share pair dir but diverge on conflict_id subdir.
    expect(path.dirname(plan.steps[0]!.artifact_path)).toContain("axiology--logic");
    expect(path.dirname(plan.steps[0]!.artifact_path)).toContain("c1");
    expect(path.dirname(plan.steps[2]!.artifact_path)).toContain("axiology--logic");
    expect(path.dirname(plan.steps[2]!.artifact_path)).toContain("c2");
  });
});

// ---------------------------------------------------------------------------
// runLensAgentDeliberation
// ---------------------------------------------------------------------------

describe("runLensAgentDeliberation", () => {
  const env = {
    CLAUDECODE: "1",
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
  };

  it("returns empty plan when no conflicts (no expected_status, no LLM calls)", async () => {
    const plan = await runLensAgentDeliberation({
      ontoConfig: { lens_agent_teams_mode: true },
      input: { conflicting_pairs: [], deliberation_dir: "/sess/delib" },
      env,
    });
    expect(plan.steps).toEqual([]);
    expect(plan.all_artifact_paths).toEqual([]);
  });

  it("returns empty plan when expected_status='not_needed' and no conflicts", async () => {
    const plan = await runLensAgentDeliberation({
      ontoConfig: { lens_agent_teams_mode: true },
      input: {
        conflicting_pairs: [],
        deliberation_dir: "/sess/delib",
        expected_status: "not_needed",
      },
      env,
    });
    expect(plan.steps).toEqual([]);
  });

  it("C2: throws when expected_status='needed' but conflicting_pairs is empty (silent collapse guard)", async () => {
    await expect(
      runLensAgentDeliberation({
        ontoConfig: { lens_agent_teams_mode: true },
        input: {
          conflicting_pairs: [],
          deliberation_dir: "/sess/delib",
          expected_status: "needed",
        },
        env,
      }),
    ).rejects.toThrow(/silent.*collapse|invariant|needed.*empty/i);
  });

  it("reads each unique primary output once + emits a populated plan", async () => {
    const reads: string[] = [];
    const fakeContents: Record<string, string> = {
      "/tmp/fake/round0/logic.md": "logic primary",
      "/tmp/fake/round0/axiology.md": "axiology primary",
    };
    const plan = await runLensAgentDeliberation({
      ontoConfig: { lens_agent_teams_mode: true },
      input: {
        conflicting_pairs: [
          pairFromIds("c1", "logic", "axiology", "section-3", "narrowing vs value"),
          pairFromIds("c2", "axiology", "logic", "section-5", "another conflict"),
        ],
        deliberation_dir: "/sess/delib",
        expected_status: "needed",
      },
      env,
      readPrimary: async (p) => {
        reads.push(p);
        return fakeContents[p] ?? "";
      },
    });
    expect(reads.sort()).toEqual([
      "/tmp/fake/round0/axiology.md",
      "/tmp/fake/round0/logic.md",
    ]);
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[0]!.prompt).toContain("axiology primary");
  });

  it("propagates DeliberationOptInError when opt-in incomplete", async () => {
    await expect(
      runLensAgentDeliberation({
        ontoConfig: {},
        input: {
          conflicting_pairs: [pairFromIds("c1", "logic", "axiology", "x", "y")],
          deliberation_dir: "/sess/delib",
        },
        env,
      }),
    ).rejects.toBeInstanceOf(DeliberationOptInError);
  });
});
