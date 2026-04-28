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
// invariants:
//
// (1) Triple opt-in is enforced at module boundary — missing any of
//     CLAUDECODE, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, or
//     config.lens_agent_teams_mode throws DeliberationOptInError with
//     the missing items enumerated.
// (2) Peer prompt embeds peer's primary output + target_section +
//     conflict_summary, declares the required response section
//     headings, and asks for an own-lens reply scoped to the conflict.
// (3) Artifact paths are deterministic AND order-independent: the same
//     pair of lens IDs maps to the same directory regardless of which
//     lens is `lens_a` in the input.
// (4) Read/write round-trip preserves content.
// (5) extractConflictingPairsFromSynthesize1 reads frontmatter and
//     resolves lens IDs to their LensPrimaryOutput entries; unknown
//     lens IDs are skipped (wiring defect signal).
// (6) extractDisagreementsFromPeerArtifacts finds "## 지속적 이견"
//     sections, parses "- **이견 항목**:" entries, and carries
//     (source, peer, target_section) trio onto each Disagreement.
// (7) buildDeliberationPlan emits 2 steps per conflicting pair (one
//     per lens) in stable order. Empty pairs → empty plan.
// (8) runLensAgentDeliberation produces an empty plan when no
//     conflicts and a populated plan otherwise; reads each unique
//     primary output once.
// ---------------------------------------------------------------------------

const PRIMARY_OUTPUTS: LensPrimaryOutput[] = [
  { lens_id: "logic", output_path: "/tmp/fake/round0/logic.md" },
  { lens_id: "pragmatics", output_path: "/tmp/fake/round0/pragmatics.md" },
  { lens_id: "axiology", output_path: "/tmp/fake/round0/axiology.md" },
];

function pairFromIds(
  a_id: string,
  b_id: string,
  target_section: string,
  summary: string,
): ConflictingLensPair {
  const a = PRIMARY_OUTPUTS.find((p) => p.lens_id === a_id);
  const b = PRIMARY_OUTPUTS.find((p) => p.lens_id === b_id);
  if (!a || !b) throw new Error("test fixture lens_id missing");
  return { lens_a: a, lens_b: b, target_section, summary };
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
  it("computes pair directory from sorted lens ids", () => {
    const p = deliberationArtifactPath("/sess/delib", "logic", "axiology", "logic");
    expect(p).toBe(path.join("/sess/delib", "axiology--logic", "logic-deliberation.md"));
  });

  it("is order-independent: (a,b) and (b,a) resolve to the same directory", () => {
    const ab = deliberationArtifactPath("/sess/delib", "logic", "axiology", "axiology");
    const ba = deliberationArtifactPath("/sess/delib", "axiology", "logic", "axiology");
    expect(ab).toBe(ba);
  });

  it("authoring lens determines the file name within the pair directory", () => {
    const fromA = deliberationArtifactPath("/sess/delib", "logic", "axiology", "logic");
    const fromB = deliberationArtifactPath("/sess/delib", "logic", "axiology", "axiology");
    expect(path.dirname(fromA)).toBe(path.dirname(fromB));
    expect(path.basename(fromA)).toBe("logic-deliberation.md");
    expect(path.basename(fromB)).toBe("axiology-deliberation.md");
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
      "logic",
      "## 합의 가능 지점\n내용\n",
    );
    expect(written).toBe(
      deliberationArtifactPath(tmpDir, "logic", "axiology", "logic"),
    );
    const back = await readDeliberationArtifact(tmpDir, "logic", "axiology", "logic");
    expect(back).toBe("## 합의 가능 지점\n내용\n");
  });
});

// ---------------------------------------------------------------------------
// extractConflictingPairsFromSynthesize1
// ---------------------------------------------------------------------------

describe("extractConflictingPairsFromSynthesize1", () => {
  const lookup = new Map(PRIMARY_OUTPUTS.map((p) => [p.lens_id, p]));

  it("returns empty array for null/undefined frontmatter", () => {
    expect(extractConflictingPairsFromSynthesize1(null, lookup)).toEqual([]);
    expect(extractConflictingPairsFromSynthesize1(undefined, lookup)).toEqual([]);
  });

  it("returns empty array when conflicting_pairs absent or empty", () => {
    expect(
      extractConflictingPairsFromSynthesize1(
        { deliberation_status: "not_needed" },
        lookup,
      ),
    ).toEqual([]);
    expect(
      extractConflictingPairsFromSynthesize1(
        { conflicting_pairs: [] },
        lookup,
      ),
    ).toEqual([]);
  });

  it("resolves lens ids to LensPrimaryOutput entries", () => {
    const pairs = extractConflictingPairsFromSynthesize1(
      {
        deliberation_status: "needed",
        conflicting_pairs: [
          {
            lens_a: "logic",
            lens_b: "axiology",
            target_section: "structure-section-3",
            summary: "narrowing concern vs value alignment",
          },
        ],
      },
      lookup,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.lens_a.lens_id).toBe("logic");
    expect(pairs[0]!.lens_a.output_path).toBe("/tmp/fake/round0/logic.md");
    expect(pairs[0]!.lens_b.lens_id).toBe("axiology");
    expect(pairs[0]!.target_section).toBe("structure-section-3");
  });

  it("skips entries whose lens_id is unknown (wiring defect)", () => {
    const pairs = extractConflictingPairsFromSynthesize1(
      {
        conflicting_pairs: [
          { lens_a: "logic", lens_b: "unknown-lens", target_section: "x", summary: "y" },
          { lens_a: "logic", lens_b: "pragmatics", target_section: "n", summary: "m" },
        ],
      },
      lookup,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.lens_b.lens_id).toBe("pragmatics");
  });
});

// ---------------------------------------------------------------------------
// extractDisagreementsFromPeerArtifacts
// ---------------------------------------------------------------------------

describe("extractDisagreementsFromPeerArtifacts", () => {
  it("parses 지속적 이견 section and carries (source, peer, target) trio", () => {
    const artifacts: PeerArtifactEntry[] = [
      {
        source_lens_id: "logic",
        peer_lens_id: "axiology",
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
    expect(out[0]!.target_section).toBe("structure-section-3");
    expect(out[0]!.title).toBe("타입 좁히기 우선");
    expect(out[0]!.body).toContain("logic");
    expect(out[0]!.body).toContain("axiology");
  });

  it("tolerates English heading variant", () => {
    const artifacts: PeerArtifactEntry[] = [
      {
        source_lens_id: "x",
        peer_lens_id: "y",
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

  it("emits 2 steps per pair (one per lens) in stable order", () => {
    const plan = buildDeliberationPlan(
      {
        conflicting_pairs: [
          pairFromIds("logic", "axiology", "structure-section-3", "summary 1"),
          pairFromIds("pragmatics", "logic", "naming-area", "summary 2"),
        ],
        deliberation_dir: "/sess/delib",
      },
      (own, peer, pair) =>
        `prompt|${own.lens_id}|${peer.lens_id}|${pair.target_section}`,
    );
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[0]).toMatchObject({ lens_id: "logic", peer_lens_id: "axiology" });
    expect(plan.steps[1]).toMatchObject({ lens_id: "axiology", peer_lens_id: "logic" });
    expect(plan.steps[2]).toMatchObject({ lens_id: "pragmatics", peer_lens_id: "logic" });
    expect(plan.steps[3]).toMatchObject({ lens_id: "logic", peer_lens_id: "pragmatics" });
    expect(plan.steps[0]!.target_section).toBe("structure-section-3");
    expect(plan.steps[2]!.target_section).toBe("naming-area");
  });

  it("artifact_path uses sorted pair directory", () => {
    const plan = buildDeliberationPlan(
      {
        conflicting_pairs: [
          pairFromIds("logic", "axiology", "x", "y"),
        ],
        deliberation_dir: "/sess/delib",
      },
      () => "<prompt>",
    );
    expect(path.dirname(plan.steps[0]!.artifact_path)).toBe(
      path.join("/sess/delib", "axiology--logic"),
    );
    expect(path.dirname(plan.steps[1]!.artifact_path)).toBe(
      path.join("/sess/delib", "axiology--logic"),
    );
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

  it("returns empty plan when no conflicts (no LLM calls, no artifacts)", async () => {
    const plan = await runLensAgentDeliberation({
      ontoConfig: { lens_agent_teams_mode: true },
      input: { conflicting_pairs: [], deliberation_dir: "/sess/delib" },
      env,
    });
    expect(plan.steps).toEqual([]);
    expect(plan.all_artifact_paths).toEqual([]);
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
          pairFromIds("logic", "axiology", "section-3", "narrowing vs value"),
          pairFromIds("axiology", "logic", "section-5", "another conflict"),
        ],
        deliberation_dir: "/sess/delib",
      },
      env,
      readPrimary: async (p) => {
        reads.push(p);
        return fakeContents[p] ?? "";
      },
    });
    // Only 2 unique paths even though logic+axiology appear twice as a pair
    expect(reads.sort()).toEqual([
      "/tmp/fake/round0/axiology.md",
      "/tmp/fake/round0/logic.md",
    ]);
    expect(plan.steps).toHaveLength(4);
    // First step prompt embeds peer's primary content
    expect(plan.steps[0]!.prompt).toContain("axiology primary");
  });

  it("propagates DeliberationOptInError when opt-in incomplete", async () => {
    await expect(
      runLensAgentDeliberation({
        ontoConfig: {},
        input: {
          conflicting_pairs: [pairFromIds("logic", "axiology", "x", "y")],
          deliberation_dir: "/sess/delib",
        },
        env,
      }),
    ).rejects.toBeInstanceOf(DeliberationOptInError);
  });
});
