import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveExecutionTopology,
  type ExecutionTopologyResolution,
} from "./execution-topology-resolver.js";

// ---------------------------------------------------------------------------
// P2 axis-first integration (Review UX Redesign, 2026-04-21)
// ---------------------------------------------------------------------------
//
// These tests verify the axis-first branch added in `resolveExecutionTopology`:
//
//   (1) When `config.review` is present and all derivation steps succeed,
//       priority_source = "review-axes" and the derived TopologyId is a
//       single-entry priority array.
//
//   (2) When derivation or shape→id mapping fails, the resolver logs the
//       failure reason but FALLS BACK to the legacy priority ladder (from
//       `execution_topology_priority` or DEFAULT_TOPOLOGY_PRIORITY). This
//       preserves backward compat for principals who add `review:` block
//       but whose environment temporarily doesn't match.
//
//   (3) When `config.review` is absent, behavior is identical to pre-P2:
//       legacy priority ladder walked, no axis-first trace emitted.
// ---------------------------------------------------------------------------

type ResolveArgs = Parameters<typeof resolveExecutionTopology>[0];

function args(overrides: Partial<ResolveArgs>): ResolveArgs {
  return {
    ontoConfig: {},
    env: {},
    claudeHost: false,
    experimentalAgentTeams: false,
    codexAvailable: false,
    codexSessionActive: false,
    liteLlmEndpointAvailable: false,
    ...overrides,
  };
}

function expectResolved(
  res: ExecutionTopologyResolution,
): Extract<ExecutionTopologyResolution, { type: "resolved" }> {
  if (res.type !== "resolved") {
    throw new Error(`expected resolved, got no_host: ${res.reason.slice(0, 120)}`);
  }
  return res;
}

describe("resolveExecutionTopology — axis-first happy paths", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("Claude host + main-native axes → cc-main-agent-subagent", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            teamlead: { model: "main" },
            subagent: { provider: "main-native" },
          },
        },
        claudeHost: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(r.topology.plan_trace.some((l) => l.includes("priority source=review-axes")))
      .toBe(true);
    expect(r.topology.plan_trace.some((l) => l.includes("derived TopologyId=cc-main-agent-subagent")))
      .toBe(true);
  });

  it("Claude host + codex subagent → cc-main-codex-subprocess", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "codex", model_id: "gpt-5.4" },
          },
        },
        claudeHost: true,
        codexAvailable: true, // required by cc-main-codex-subprocess downstream check
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-codex-subprocess");
  });

  it("Codex host + main-native → codex-main-subprocess", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "main-native" },
          },
        },
        codexSessionActive: true,
        codexAvailable: true, // required by codex-main-subprocess downstream check
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("codex-main-subprocess");
  });

  it("Claude + teams + native + a2a → cc-teams-lens-agent-deliberation", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "main-native" },
            lens_deliberation: "sendmessage-a2a",
          },
          // The resolver's own requirement check for the deliberation
          // topology ALSO inspects `lens_agent_teams_mode`. Set true so
          // the topology passes the downstream requirement gate.
          lens_agent_teams_mode: true,
        },
        claudeHost: true,
        experimentalAgentTeams: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-teams-lens-agent-deliberation");
  });

  it("external codex teamlead → codex-nested-subprocess", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            teamlead: { model: { provider: "codex", model_id: "gpt-5.4" } },
            subagent: { provider: "codex", model_id: "gpt-5.4" },
          },
        },
        // codex-nested-subprocess requires codex available + no CC session
        codexAvailable: true,
        claudeHost: false,
        codexSessionActive: false,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("codex-nested-subprocess");
  });
});

describe("resolveExecutionTopology — axis-first fallback to legacy", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("invalid review block falls back to legacy priority ladder", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          // Invalid: main-native + model_id is rejected by validator
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          review: {
            subagent: { provider: "main-native", model_id: "x" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          execution_topology_priority: ["cc-main-agent-subagent"],
        },
        claudeHost: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(r.topology.plan_trace.some((l) => l.includes("validation failed"))).toBe(
      true,
    );
    expect(r.topology.plan_trace.some((l) => l.includes("priority source=config"))).toBe(
      true,
    );
  });

  it("derivation failure (a2a + no teams) falls back to legacy priority", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "main-native" },
            lens_deliberation: "sendmessage-a2a",
          },
          execution_topology_priority: ["cc-main-agent-subagent"],
        },
        claudeHost: true,
        experimentalAgentTeams: false, // a2a impossible — teams off
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("shape derivation failed"),
      ),
    ).toBe(true);
  });

  it("mapping failure (main_native without Claude/Codex) falls back", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "main-native" },
          },
          execution_topology_priority: ["codex-nested-subprocess"],
        },
        claudeHost: false,
        codexSessionActive: false,
        codexAvailable: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("codex-nested-subprocess");
    expect(
      r.topology.plan_trace.some((l) => l.includes("mapping failed")),
    ).toBe(true);
  });
});

describe("resolveExecutionTopology — review absent = legacy unchanged", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("no review block → no axis-first trace, priority_source=default", () => {
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {},
        claudeHost: true,
      }),
    );
    const r = expectResolved(res);
    // Should reach cc-main-agent-subagent via DEFAULT_TOPOLOGY_PRIORITY
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(r.topology.plan_trace.some((l) => l.includes("review-axes"))).toBe(
      false,
    );
    expect(r.topology.plan_trace.some((l) => l.includes("priority source=default")))
      .toBe(true);
  });
});
