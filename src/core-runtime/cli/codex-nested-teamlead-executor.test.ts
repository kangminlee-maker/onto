import { describe, it, expect } from "vitest";
import {
  buildNestedTeamleadPrompt,
  parseNestedTeamleadSummary,
  runCodexNestedTeamlead,
  type CodexNestedTeamleadInput,
  type NestedLensDispatchInput,
} from "./codex-nested-teamlead-executor.js";

// ---------------------------------------------------------------------------
// These tests assert the PR-C orchestrator invariants:
//
// (1) The prompt embeds every lens in the same order with packet/output
//     paths and the sandbox flag the outer codex needs.
// (2) The summary parser extracts the LENS_DISPATCH_SUMMARY line and
//     tolerates surrounding noise; malformed lines are ignored; last-one
//     wins when multiple are present.
// (3) `runCodexNestedTeamlead` reconciles inputs with reported outcomes:
//     missing lens_ids become `fail` (teamlead noncompliance), reported
//     failures carry the reported error, timeouts mark every lens failed.
// ---------------------------------------------------------------------------

const LENSES: NestedLensDispatchInput[] = [
  {
    lens_id: "logic",
    packet_path: "/tmp/session/round1/logic-packet.md",
    output_path: "/tmp/session/round1/logic.md",
  },
  {
    lens_id: "pragmatics",
    packet_path: "/tmp/session/round1/pragmatics-packet.md",
    output_path: "/tmp/session/round1/pragmatics.md",
  },
  {
    lens_id: "axiology",
    packet_path: "/tmp/session/round1/axiology-packet.md",
    output_path: "/tmp/session/round1/axiology.md",
  },
];

// ---------------------------------------------------------------------------
// buildNestedTeamleadPrompt
// ---------------------------------------------------------------------------

describe("buildNestedTeamleadPrompt", () => {
  it("embeds every lens with its packet and output paths in order", () => {
    const prompt = buildNestedTeamleadPrompt({ lenses: LENSES });
    for (let i = 0; i < LENSES.length; i += 1) {
      const lens = LENSES[i]!;
      expect(prompt).toContain(`Lens #${i + 1}`);
      expect(prompt).toContain(`lens_id: ${lens.lens_id}`);
      expect(prompt).toContain(`packet: ${lens.packet_path}`);
      expect(prompt).toContain(`output: ${lens.output_path}`);
    }
  });

  it("includes sandbox danger-full-access and ephemeral flags for inner codex", () => {
    const prompt = buildNestedTeamleadPrompt({ lenses: LENSES });
    expect(prompt).toContain("--sandbox danger-full-access");
    expect(prompt).toContain("--ephemeral");
    expect(prompt).toContain("--skip-git-repo-check");
  });

  it("declares the LENS_DISPATCH_SUMMARY sentinel the parser looks for", () => {
    const prompt = buildNestedTeamleadPrompt({ lenses: LENSES });
    expect(prompt).toContain("LENS_DISPATCH_SUMMARY:");
  });

  it("passes through model + reasoning_effort when provided", () => {
    const prompt = buildNestedTeamleadPrompt({
      lenses: LENSES.slice(0, 1),
      model: "gpt-5.4",
      reasoning_effort: "high",
    });
    expect(prompt).toContain("-m gpt-5.4");
    expect(prompt).toContain("model_reasoning_effort=high");
  });

  it("omits the model/effort flags when unset (codex uses its defaults)", () => {
    const prompt = buildNestedTeamleadPrompt({ lenses: LENSES.slice(0, 1) });
    expect(prompt).not.toContain(" -m ");
    expect(prompt).not.toContain("model_reasoning_effort=");
  });

  it("states the number of lenses explicitly (sanity check for the outer codex)", () => {
    const prompt = buildNestedTeamleadPrompt({ lenses: LENSES });
    expect(prompt).toContain(`Number of lenses: ${LENSES.length}`);
  });
});

// ---------------------------------------------------------------------------
// parseNestedTeamleadSummary
// ---------------------------------------------------------------------------

describe("parseNestedTeamleadSummary", () => {
  it("returns null when no summary line is present", () => {
    expect(parseNestedTeamleadSummary("just model commentary\nnothing here\n")).toBeNull();
  });

  it("extracts a valid summary line with all lens results", () => {
    const stdout = [
      "dispatched lens#1...",
      "dispatched lens#2...",
      'LENS_DISPATCH_SUMMARY:{"lens_results":[{"lens_id":"logic","status":"ok"},{"lens_id":"pragmatics","status":"fail","error":"exit 1"}]}',
    ].join("\n");
    const result = parseNestedTeamleadSummary(stdout);
    expect(result).not.toBeNull();
    expect(result!.lens_results).toHaveLength(2);
    expect(result!.lens_results[0]).toEqual({ lens_id: "logic", status: "ok" });
    expect(result!.lens_results[1]).toEqual({
      lens_id: "pragmatics",
      status: "fail",
      error: "exit 1",
    });
  });

  it("ignores malformed summary lines", () => {
    const stdout = "LENS_DISPATCH_SUMMARY:not-json-at-all\nno summary visible\n";
    expect(parseNestedTeamleadSummary(stdout)).toBeNull();
  });

  it("takes the last summary line when multiple appear", () => {
    const stdout = [
      'LENS_DISPATCH_SUMMARY:{"lens_results":[{"lens_id":"a","status":"fail"}]}',
      'LENS_DISPATCH_SUMMARY:{"lens_results":[{"lens_id":"a","status":"ok"}]}',
    ].join("\n");
    const result = parseNestedTeamleadSummary(stdout);
    expect(result!.lens_results[0]!.status).toBe("ok");
  });

  it("tolerates leading/trailing whitespace around the summary line", () => {
    const stdout = '   LENS_DISPATCH_SUMMARY:{"lens_results":[]}   \n';
    const result = parseNestedTeamleadSummary(stdout);
    expect(result).not.toBeNull();
    expect(result!.lens_results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// runCodexNestedTeamlead — injected spawn for deterministic tests
// ---------------------------------------------------------------------------

type SpawnArgs = Parameters<typeof runCodexNestedTeamlead>[1];

function fakeSpawn(
  stdout: string,
  stderr: string,
  exit_code: number,
  timed_out = false,
): NonNullable<SpawnArgs> {
  return async () => ({ stdout, stderr, exit_code, timed_out });
}

describe("runCodexNestedTeamlead", () => {
  it("returns outcomes in input order with ok statuses on clean exit", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES };
    const stdout = `LENS_DISPATCH_SUMMARY:${JSON.stringify({
      lens_results: [
        { lens_id: "logic", status: "ok" },
        { lens_id: "pragmatics", status: "ok" },
        { lens_id: "axiology", status: "ok" },
      ],
    })}`;
    const result = await runCodexNestedTeamlead(input, fakeSpawn(stdout, "", 0));
    expect(result.summary_parsed).toBe(true);
    expect(result.outer_exit_code).toBe(0);
    expect(result.outcomes.map((o) => o.lens_id)).toEqual(["logic", "pragmatics", "axiology"]);
    expect(result.outcomes.every((o) => o.status === "ok")).toBe(true);
  });

  it("propagates per-lens failures from the summary", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES };
    const stdout = `LENS_DISPATCH_SUMMARY:${JSON.stringify({
      lens_results: [
        { lens_id: "logic", status: "ok" },
        { lens_id: "pragmatics", status: "fail", error: "inner codex exit 1" },
        { lens_id: "axiology", status: "ok" },
      ],
    })}`;
    const result = await runCodexNestedTeamlead(input, fakeSpawn(stdout, "", 0));
    expect(result.outcomes[0]!.status).toBe("ok");
    expect(result.outcomes[1]!.status).toBe("fail");
    expect(result.outcomes[1]!.error).toContain("inner codex exit 1");
    expect(result.outcomes[2]!.status).toBe("ok");
  });

  it("marks missing lens_ids as fail with teamlead-noncompliance reason", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES };
    // Summary omits axiology entirely.
    const stdout = `LENS_DISPATCH_SUMMARY:${JSON.stringify({
      lens_results: [
        { lens_id: "logic", status: "ok" },
        { lens_id: "pragmatics", status: "ok" },
      ],
    })}`;
    const result = await runCodexNestedTeamlead(input, fakeSpawn(stdout, "", 0));
    expect(result.outcomes[2]!.status).toBe("fail");
    expect(result.outcomes[2]!.error).toContain("axiology");
    expect(result.outcomes[2]!.error).toContain("summary missing");
  });

  it("marks all lenses fail when outer codex never emits a summary", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES };
    const stdout = "just commentary, no summary line\n";
    const result = await runCodexNestedTeamlead(input, fakeSpawn(stdout, "something went wrong", 1));
    expect(result.summary_parsed).toBe(false);
    expect(result.outer_exit_code).toBe(1);
    expect(result.outcomes.every((o) => o.status === "fail")).toBe(true);
    for (const outcome of result.outcomes) {
      expect(outcome.error).toContain("did not emit");
    }
  });

  it("timeout marks all lenses fail with explicit timeout reason", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES, timeout_ms: 1234 };
    const result = await runCodexNestedTeamlead(
      input,
      fakeSpawn("", "", 137, true),
    );
    expect(result.summary_parsed).toBe(false);
    expect(result.outcomes.every((o) => o.status === "fail")).toBe(true);
    for (const outcome of result.outcomes) {
      expect(outcome.error).toContain("1234");
      expect(outcome.error).toContain("timed out");
    }
  });

  it("trusts per-lens summary even when outer exit code is non-zero", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES };
    const stdout = `LENS_DISPATCH_SUMMARY:${JSON.stringify({
      lens_results: [
        { lens_id: "logic", status: "ok" },
        { lens_id: "pragmatics", status: "ok" },
        { lens_id: "axiology", status: "fail", error: "model context length exceeded" },
      ],
    })}`;
    // Outer codex exits 1 (e.g., because one nested lens failed), but
    // summary is still reliable.
    const result = await runCodexNestedTeamlead(input, fakeSpawn(stdout, "", 1));
    expect(result.summary_parsed).toBe(true);
    expect(result.outer_exit_code).toBe(1);
    expect(result.outcomes[0]!.status).toBe("ok");
    expect(result.outcomes[1]!.status).toBe("ok");
    expect(result.outcomes[2]!.status).toBe("fail");
    expect(result.outcomes[2]!.error).toContain("context length");
  });

  it("captures outer stdout/stderr verbatim for debugging", async () => {
    const input: CodexNestedTeamleadInput = { lenses: LENSES.slice(0, 1) };
    const stdoutRaw = "outer commentary\nmore details\n";
    const stderrRaw = "some warning\n";
    const result = await runCodexNestedTeamlead(
      input,
      fakeSpawn(stdoutRaw, stderrRaw, 0),
    );
    expect(result.outer_stdout).toBe(stdoutRaw);
    expect(result.outer_stderr).toBe(stderrRaw);
  });
});
