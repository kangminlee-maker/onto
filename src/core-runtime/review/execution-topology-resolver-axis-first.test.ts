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
//   (3) When both axis derivation and `main_native` degrade fail, the
//       resolver fails fast with `no_host` (P9.1 ladder retirement,
//       2026-04-21): there is no legacy-priority fallback.
//
//   (4) When `config.review` is absent, the resolver skips axis-first
//       and attempts `main_native` degrade directly — same universal
//       fallback path as a validation/derivation/mapping failure.
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
    expect(r.topology.plan_trace.some((l) => l.includes("topology source=review-axes")))
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
          // Retained as a defensive check: legacy `execution_topology_priority`
          // would have selected this id pre-P9.1. After P9.1 the field is
          // acknowledged but ignored — the degrade path owns the decision.
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
    // source = review-axes because the degrade produced a single-entry
    // TopologyId through the axis-first path; the legacy priority array
    // was acknowledged (see "ignored" trace line) but never consulted.
    expect(
      r.topology.plan_trace.some((l) => l.includes("topology source=review-axes")),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("legacy execution_topology_priority present in config but ignored"),
      ),
    ).toBe(true);
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
          // Retained as defensive check: pre-P9.1 this would have won
          // via the legacy priority ladder. After P9.1 the field is
          // ignored at runtime (see resolver's "legacy ... ignored" log).
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
      r.topology.plan_trace.some((l) => l.includes("topology source=review-axes")),
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
          // Same defensive check — legacy ladder would have favored
          // this id pre-P9.1 but the field is now a runtime no-op.
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
      r.topology.plan_trace.some((l) => l.includes("topology source=review-axes")),
    ).toBe(true);
  });

  it("everything fails (main_native also unmappable) → no_host fail-fast", () => {
    // P9.1 (2026-04-21): legacy priority ladder is retired. When axis
    // derivation fails AND the `main_native` degrade cannot map (neither
    // Claude nor Codex host), the resolver returns `no_host`. The
    // `execution_topology_priority` array, even when pointing at an id
    // whose prerequisites are met (here: codex-nested-subprocess via
    // codex binary), is NOT consulted — ladder walking no longer exists.
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
    if (res.type !== "no_host") {
      throw new Error(
        `expected no_host, got resolved topology id=${res.topology.id}`,
      );
    }
    expect(res.plan_trace.some((l) => l.includes("mapping failed"))).toBe(true);
    expect(
      res.plan_trace.some((l) =>
        l.includes("degraded: requested=main_native → actual=main_native"),
      ),
    ).toBe(true);
    expect(
      res.plan_trace.some((l) =>
        l.includes("degrade-fallback: main_native unmappable"),
      ),
    ).toBe(true);
    expect(
      res.plan_trace.some((l) =>
        l.includes("no topology resolved (axis-first + main_native fallback both failed)"),
      ),
    ).toBe(true);
    // Negative: the retired ladder's "priority source=config" log shape
    // must NOT surface — any regression would revive the dead path.
    expect(res.plan_trace.some((l) => l.includes("priority source="))).toBe(false);
    // Regression guard (PR #161 review): when `config.review` is present
    // but its internal degrade exhausts, the outer resolver must NOT
    // invoke a second `attemptMainNativeDegrade` with a misleading
    // `<review-block-absent>` label. Exactly one `degraded: requested=`
    // line should appear, and it must not carry that sentinel.
    expect(
      res.plan_trace.filter((l) => l.includes("degraded: requested=")).length,
    ).toBe(1);
    expect(
      res.plan_trace.some((l) => l.includes("<review-block-absent>")),
    ).toBe(false);
  });
});

describe("resolveExecutionTopology — review absent → main_native degrade", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("no review block + CC host → main_native degrade → cc-main-agent-subagent", () => {
    // P9.1 (2026-04-21): when `config.review` is absent, the resolver
    // no longer walks the legacy priority ladder. It goes directly to
    // the universal `main_native` degrade path with
    // requested=<review-block-absent>. The degrade maps main_native
    // against the Claude host → cc-main-agent-subagent.
    const res = resolveExecutionTopology(
      args({
        ontoConfig: {},
        claudeHost: true,
      }),
    );
    const r = expectResolved(res);
    expect(r.topology.id).toBe("cc-main-agent-subagent");
    // No axis-first trace: the review block was absent, so we never
    // entered the axis pipeline — only the direct degrade.
    expect(r.topology.plan_trace.some((l) => l.includes("review-axes: "))).toBe(
      false,
    );
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("degraded: requested=<review-block-absent>"),
      ),
    ).toBe(true);
    expect(
      r.topology.plan_trace.some((l) =>
        l.includes("topology source=fallback-main-native"),
      ),
    ).toBe(true);
  });
});
