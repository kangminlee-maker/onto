import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { OntoConfig } from "../discovery/config-chain.js";
import {
  DEFAULT_TOPOLOGY_PRIORITY,
  PR_A_SUPPORTED_TOPOLOGIES,
  TOPOLOGY_CATALOG,
  UnsupportedTopologyError,
  assertSupportedInPrA,
  resolveExecutionTopology,
  type ExecutionTopologyResolution,
  type TopologyId,
} from "./execution-topology-resolver.js";

// ---------------------------------------------------------------------------
// These tests assert the topology resolver invariants (sketch v3 §3-§5):
//
// (1) Every topology option can be matched when its prerequisites are met,
//     and skipped with a reason when they aren't — no silent resolution.
// (2) Priority order (principal config > default) is honored exactly:
//     the first matching id wins regardless of later "better" matches.
// (3) `execution_topology_overrides` adjusts max_concurrent_lenses only;
//     other catalog attributes are immutable.
// (4) `[topology]` STDERR prefix mirrors plan_trace — single source of
//     truth for observability.
// (5) The PR-A support set is exactly {cc-main-agent-subagent,
//     cc-main-codex-subprocess, codex-main-subprocess}; anything else
//     passed to `assertSupportedInPrA` throws with a migration hint.
// ---------------------------------------------------------------------------

type ResolveArgs = Parameters<typeof resolveExecutionTopology>[0];

const CLEAN_ENV: NodeJS.ProcessEnv = {};

function withSignals(overrides: Partial<ResolveArgs>): ResolveArgs {
  return {
    ontoConfig: {},
    env: CLEAN_ENV,
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

function expectNoHost(
  res: ExecutionTopologyResolution,
): Extract<ExecutionTopologyResolution, { type: "no_host" }> {
  if (res.type !== "no_host") {
    throw new Error(
      `expected no_host, got resolved topology id=${res.topology.id}`,
    );
  }
  return res;
}

// ---------------------------------------------------------------------------
// Positive matches — each of the 10 options in isolation
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — positive matches", () => {
  it("1-0 cc-teams-lens-agent-deliberation matches with triple opt-in", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: { lens_agent_teams_mode: true },
        claudeHost: true,
        experimentalAgentTeams: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-teams-lens-agent-deliberation");
    expect(resolved.topology.deliberation_channel).toBe("sendmessage-a2a");
    expect(resolved.topology.lens_spawn_mechanism).toBe("claude-teamcreate-member");
  });

  it("1-1 cc-teams-agent-subagent matches with CC + experimental", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-agent-subagent"],
        },
        claudeHost: true,
        experimentalAgentTeams: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-teams-agent-subagent");
    expect(resolved.topology.lens_spawn_mechanism).toBe("claude-agent-tool");
    expect(resolved.topology.max_concurrent_lenses).toBe(10);
  });

  it("1-2 cc-teams-codex-subprocess matches with CC + experimental + codex", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-codex-subprocess"],
        },
        claudeHost: true,
        experimentalAgentTeams: true,
        codexAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-teams-codex-subprocess");
    expect(resolved.topology.transport_rank).toBe("S0");
    expect(resolved.topology.max_concurrent_lenses).toBe(5);
  });

  it("2-1 cc-main-agent-subagent matches with CC alone (no experimental)", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-agent-subagent"],
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
    expect(resolved.topology.teamlead_location).toBe("onto-main");
  });

  it("2-2 cc-main-codex-subprocess matches with CC + codex", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-codex-subprocess"],
        },
        claudeHost: true,
        codexAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-codex-subprocess");
    expect(resolved.topology.lens_spawn_mechanism).toBe("codex-subprocess");
  });

  it("3-1 cc-teams-litellm-sessions matches with CC + experimental + litellm", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-litellm-sessions"],
        },
        claudeHost: true,
        experimentalAgentTeams: true,
        liteLlmEndpointAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-teams-litellm-sessions");
    expect(resolved.topology.transport_rank).toBe("S1");
    expect(resolved.topology.max_concurrent_lenses).toBe(1);
  });

  it("codex-A codex-nested-subprocess matches with codex binary alone (host-agnostic)", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["codex-nested-subprocess"],
        },
        codexAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("codex-nested-subprocess");
    expect(resolved.topology.teamlead_location).toBe("codex-subprocess");
  });

  it("codex-B codex-main-subprocess matches with codex session + codex binary", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["codex-main-subprocess"],
        },
        codexSessionActive: true,
        codexAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("codex-main-subprocess");
  });

  it("generic-1 generic-nested-subagent matches when principal declares support", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["generic-nested-subagent"],
          generic_nested_spawn_supported: true,
        },
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("generic-nested-subagent");
  });

  it("generic-2 generic-main-subagent is reserved and never auto-matches", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["generic-main-subagent"],
          generic_nested_spawn_supported: true,
        },
      }),
    );
    expectNoHost(res);
  });
});

// ---------------------------------------------------------------------------
// Negative matches — missing prerequisites produce skip, not silent match
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — negative matches (prerequisite missing)", () => {
  it("1-0 skips without lens_agent_teams_mode even with both env flags", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-lens-agent-deliberation"],
          lens_agent_teams_mode: false,
        },
        claudeHost: true,
        experimentalAgentTeams: true,
      }),
    );
    const nohost = expectNoHost(res);
    expect(nohost.plan_trace.some((l) => l.includes("lens_agent_teams_mode"))).toBe(true);
  });

  it("1-1 skips without experimental flag", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-agent-subagent"],
        },
        claudeHost: true,
        experimentalAgentTeams: false,
      }),
    );
    expectNoHost(res);
  });

  it("1-2 skips without codex binary", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-codex-subprocess"],
        },
        claudeHost: true,
        experimentalAgentTeams: true,
        codexAvailable: false,
      }),
    );
    expectNoHost(res);
  });

  it("2-1 skips without CLAUDECODE", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-agent-subagent"],
        },
        claudeHost: false,
      }),
    );
    expectNoHost(res);
  });

  it("2-2 skips when codex binary missing despite CC host", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-codex-subprocess"],
        },
        claudeHost: true,
        codexAvailable: false,
      }),
    );
    expectNoHost(res);
  });

  it("3-1 skips without LiteLLM endpoint", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-teams-litellm-sessions"],
        },
        claudeHost: true,
        experimentalAgentTeams: true,
        liteLlmEndpointAvailable: false,
      }),
    );
    expectNoHost(res);
  });

  it("codex-A skips without codex binary", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["codex-nested-subprocess"],
        },
        codexAvailable: false,
      }),
    );
    expectNoHost(res);
  });

  it("codex-B skips without codex session signal even when binary present", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["codex-main-subprocess"],
        },
        codexSessionActive: false,
        codexAvailable: true,
      }),
    );
    expectNoHost(res);
  });

  it("generic-1 skips without principal declaration", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["generic-nested-subagent"],
          generic_nested_spawn_supported: false,
        },
      }),
    );
    expectNoHost(res);
  });
});

// ---------------------------------------------------------------------------
// Priority override — first match wins, later options never examined
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — priority override", () => {
  it("principal priority overrides default; earlier id wins over later matching id", () => {
    // Both cc-main-agent-subagent (2-1) and codex-nested-subprocess (codex-A)
    // would match the signals, but priority puts codex first.
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: [
            "codex-nested-subprocess",
            "cc-main-agent-subagent",
          ],
        },
        claudeHost: true,
        codexAvailable: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("codex-nested-subprocess");
  });

  it("default priority picks cc-main-agent-subagent for a plain CC session", () => {
    // DEFAULT_TOPOLOGY_PRIORITY has 1-0, 1-1, 1-2 before 2-1; those
    // skip (missing experimental+codex), so 2-1 is the first match.
    const res = resolveExecutionTopology(
      withSignals({
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
  });

  it("unknown id in priority is ignored with a warn log (not thrown)", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: [
            "typo-xyz" as TopologyId,
            "cc-main-agent-subagent",
          ],
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
    expect(
      resolved.topology.plan_trace.some((l) =>
        l.includes(`ignoring unknown topology id "typo-xyz"`),
      ),
    ).toBe(true);
  });

  it("all-unknown principal array falls back to default priority silently", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: [
            "typo-1" as TopologyId,
            "typo-2" as TopologyId,
          ],
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
  });
});

// ---------------------------------------------------------------------------
// Per-topology max_concurrent_lenses overrides
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — execution_topology_overrides", () => {
  it("max_concurrent_lenses override takes effect and logs the change", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-agent-subagent"],
          execution_topology_overrides: {
            "cc-main-agent-subagent": { max_concurrent_lenses: 6 },
          },
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.max_concurrent_lenses).toBe(6);
    expect(
      resolved.topology.plan_trace.some((l) =>
        l.includes("override max_concurrent_lenses 10 → 6"),
      ),
    ).toBe(true);
  });

  it("override with zero/negative is ignored (falls back to catalog default)", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["cc-main-agent-subagent"],
          execution_topology_overrides: {
            "cc-main-agent-subagent": { max_concurrent_lenses: 0 },
          },
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.max_concurrent_lenses).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// plan_trace + [topology] STDERR — single source of truth
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — observability", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("emits [topology] prefix for every decision line", () => {
    resolveExecutionTopology(
      withSignals({
        ontoConfig: { execution_topology_priority: ["cc-main-agent-subagent"] },
        claudeHost: true,
      }),
    );
    const calls = stderrSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const topologyLines = calls.filter((l: string) => l.startsWith("[topology]"));
    expect(topologyLines.length).toBeGreaterThan(0);
    for (const line of topologyLines) {
      expect(line).toMatch(/^\[topology\] /);
    }
  });

  it("plan_trace matches the lines emitted to STDERR (no divergence)", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: { execution_topology_priority: ["cc-main-agent-subagent"] },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    const stderrLines = stderrSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((l: string) => l.startsWith("[topology] "))
      .map((l: string) => l.replace(/^\[topology\] /, "").replace(/\n$/, ""));
    expect(resolved.topology.plan_trace).toEqual(stderrLines);
  });

  it("no_host resolution still surfaces plan_trace with signals + tried priorities", () => {
    const res = resolveExecutionTopology(
      withSignals({}),
    );
    const nohost = expectNoHost(res);
    expect(nohost.plan_trace.length).toBeGreaterThan(0);
    expect(nohost.reason).toContain("Execution topology ladder");
    expect(nohost.reason).toContain("현재 환경 시그널");
    expect(nohost.reason).toContain("해결 방법");
  });
});

// ---------------------------------------------------------------------------
// PR-A support set — spawn-time guard
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — PR-A support set", () => {
  it("PR-A supports exactly 3 topologies", () => {
    expect(PR_A_SUPPORTED_TOPOLOGIES.size).toBe(3);
    expect(PR_A_SUPPORTED_TOPOLOGIES.has("cc-main-agent-subagent")).toBe(true);
    expect(PR_A_SUPPORTED_TOPOLOGIES.has("cc-main-codex-subprocess")).toBe(true);
    expect(PR_A_SUPPORTED_TOPOLOGIES.has("codex-main-subprocess")).toBe(true);
  });

  it("assertSupportedInPrA passes for supported ids", () => {
    for (const id of PR_A_SUPPORTED_TOPOLOGIES) {
      expect(() =>
        assertSupportedInPrA({
          ...TOPOLOGY_CATALOG[id],
          plan_trace: [],
        }),
      ).not.toThrow();
    }
  });

  it("assertSupportedInPrA throws UnsupportedTopologyError for non-supported ids", () => {
    const unsupported: TopologyId[] = [
      "cc-teams-lens-agent-deliberation",
      "cc-teams-agent-subagent",
      "cc-teams-codex-subprocess",
      "cc-teams-litellm-sessions",
      "codex-nested-subprocess",
      "generic-nested-subagent",
      "generic-main-subagent",
    ];
    for (const id of unsupported) {
      expect(() =>
        assertSupportedInPrA({ ...TOPOLOGY_CATALOG[id], plan_trace: [] }),
      ).toThrow(UnsupportedTopologyError);
    }
  });

  it("UnsupportedTopologyError message names the PR where the option lands", () => {
    try {
      assertSupportedInPrA({
        ...TOPOLOGY_CATALOG["cc-teams-agent-subagent"],
        plan_trace: [],
      });
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedTopologyError);
      const msg = (err as Error).message;
      expect(msg).toContain("PR-B");
      expect(msg).toContain("cc-main-agent-subagent");
    }
  });
});

// ---------------------------------------------------------------------------
// Catalog shape stability
// ---------------------------------------------------------------------------

describe("TOPOLOGY_CATALOG — shape", () => {
  it("has exactly 10 canonical entries matching DEFAULT_TOPOLOGY_PRIORITY", () => {
    const catalogIds = Object.keys(TOPOLOGY_CATALOG).sort();
    const priorityIds = [...DEFAULT_TOPOLOGY_PRIORITY].sort();
    expect(catalogIds).toEqual(priorityIds);
    expect(catalogIds.length).toBe(10);
  });

  it("each entry has all required static attributes populated", () => {
    for (const id of Object.keys(TOPOLOGY_CATALOG) as TopologyId[]) {
      const entry = TOPOLOGY_CATALOG[id];
      expect(entry.id).toBe(id);
      expect(entry.teamlead_location).toBeTruthy();
      expect(entry.lens_spawn_mechanism).toBeTruthy();
      expect(entry.max_concurrent_lenses).toBeGreaterThan(0);
      expect(["S0", "S1", "S2", "S3"]).toContain(entry.transport_rank);
      expect(["sendmessage-a2a", "synthesizer-only"]).toContain(entry.deliberation_channel);
    }
  });

  it("only 1-0 declares SendMessage A2A deliberation", () => {
    const a2a = (Object.keys(TOPOLOGY_CATALOG) as TopologyId[]).filter(
      (id) => TOPOLOGY_CATALOG[id].deliberation_channel === "sendmessage-a2a",
    );
    expect(a2a).toEqual(["cc-teams-lens-agent-deliberation"]);
  });
});

// ---------------------------------------------------------------------------
// env-defaulting (no injected signals) — uses process.env
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — env defaults", () => {
  it("falls back to host-detection helpers when signals are not injected", () => {
    // Inject ontoConfig + priority but omit detection flag args. The
    // resolver should call detectClaudeCodeEnvSignal() etc. — we stub
    // by spying on process.env. The real test: resolver does not crash
    // when signal args are undefined.
    const res = resolveExecutionTopology({
      ontoConfig: { execution_topology_priority: ["cc-main-agent-subagent"] },
      env: {},
    });
    // Result depends on the test runner's actual environment; we only
    // assert the shape is valid (resolved or no_host with a trace).
    expect(["resolved", "no_host"]).toContain(res.type);
    if (res.type === "no_host") {
      expect(res.plan_trace.length).toBeGreaterThan(0);
    }
  });
});
