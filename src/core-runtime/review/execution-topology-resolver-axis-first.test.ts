import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveExecutionTopology,
  type ExecutionTopologyResolution,
} from "./execution-topology-resolver.js";

// ---------------------------------------------------------------------------
// P2/P3 axis-first integration (Review UX Redesign, 2026-04-21)
// ---------------------------------------------------------------------------
//
// These tests verify the axis-first branch in `resolveExecutionTopology`:
//
//   (1) Happy paths — `config.review` present and all derivation steps
//       succeed. priority_source = "review-axes" and the derived
//       TopologyId is a single-entry priority array.
//
//   (2) P3 universal fallback — when validation / derivation / mapping
//       fails, the resolver emits a `[topology] degraded: requested=...
//       → actual=main_native (reason: ...)` line and attempts to resolve
//       the `main_native` shape against the current host signals. If
//       that succeeds, that TopologyId is used (NOT the legacy ladder).
//
//   (3) Legacy-ladder fallback reserved for the case where `main_native`
//       itself is unmappable (neither Claude nor Codex host). Only then
//       does the resolver fall through to `execution_topology_priority`
//       / DEFAULT_TOPOLOGY_PRIORITY.
//
//   (4) When `config.review` is absent, behavior is identical to pre-P2:
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

describe("resolveExecutionTopology — P3 universal fallback (degrade to main_native)", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("invalid review block degrades to main_native (NOT legacy ladder)", () => {
    // Validator rejects `main-native + model_id`. Under P3, the degrade
    // path maps `main_native` shape against Claude host →
    // `cc-main-agent-subagent`. `execution_topology_priority` must NOT
    // be consulted (we verify by including a distinct entry that would
    // otherwise win).
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          review: {
            subagent: { provider: "main-native", model_id: "x" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          // Would resolve to codex-main-subprocess on a legacy walk; the
          // P3 degrade pre-empts this.
          execution_topology_priority: ["codex-main-subprocess"],
        },
        claudeHost: true,
        codexSessionActive: true,
        codexAvailable: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(
      r.topology.plan_trace.some((l) => l.includes("validation failed")),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("degraded: requested=<validation-failed> → actual=main_native"),
      ),
    ).toBe(true);
    // priority_source = review-axes because the degrade produced a
    // single-entry TopologyId; legacy `execution_topology_priority`
    // array was NOT walked.
    expect(
      r.topology.plan_trace.some((l) => l.includes("priority source=review-axes")),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) => l.includes("priority source=config")),
    ).toBe(false);
  });

  it("derivation failure (a2a without teams) degrades to main_native", () => {
    // sendmessage-a2a requested but CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0.
    // Derivation emits a violation — P3 degrade takes over, maps
    // main_native to the Claude host → cc-main-agent-subagent.
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "main-native" },
            lens_deliberation: "sendmessage-a2a",
          },
          // Would win on a legacy walk; P3 degrade must pre-empt.
          execution_topology_priority: ["codex-main-subprocess"],
        },
        claudeHost: true,
        codexSessionActive: true,
        codexAvailable: true,
        experimentalAgentTeams: false,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(
      r.topology.plan_trace.some((l) => l.includes("shape derivation failed")),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes(
          "degraded: requested=a2a-deliberation → actual=main_native",
        ),
      ),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) => l.includes("priority source=review-axes")),
    ).toBe(true);
  });

  it("axis mapping failure (main_foreign + litellm) degrades to main_native", () => {
    // main_foreign shape with provider=litellm has NO TopologyId in the
    // catalog (only codex mapped). P3 degrades to main_native, which
    // under Claude host maps to cc-main-agent-subagent.
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {
          review: {
            subagent: { provider: "litellm", model_id: "gpt-4o" },
          },
          execution_topology_priority: ["codex-main-subprocess"],
        },
        claudeHost: true,
        codexSessionActive: true,
        codexAvailable: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    expect(
      r.topology.plan_trace.some((l) => l.includes("mapping failed")),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes(
          "degraded: requested=main_foreign(litellm) → actual=main_native",
        ),
      ),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) => l.includes("priority source=review-axes")),
    ).toBe(true);
  });

  it("everything fails (main_native also unmappable) → legacy ladder is used", () => {
    // Neither Claude nor Codex host → main_native cannot be mapped.
    // Only in this case does the resolver fall through to the legacy
    // priority ladder (here: codex-nested-subprocess via codex binary).
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
    // Degrade attempt was made, but the fallback-fallback mapping
    // emitted an "unmappable" line, so legacy ladder took over.
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("degraded: requested=main_native → actual=main_native"),
      ),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("degrade-fallback: main_native unmappable"),
      ),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) => l.includes("priority source=config")),
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
