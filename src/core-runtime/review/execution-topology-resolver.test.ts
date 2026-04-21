import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PR_A_SUPPORTED_TOPOLOGIES,
  TOPOLOGY_CATALOG,
  UnsupportedTopologyError,
  assertSupportedInPrA,
  resolveExecutionTopology,
  type ExecutionTopologyResolution,
  type TopologyId,
} from "./execution-topology-resolver.js";

// ---------------------------------------------------------------------------
// Invariants covered here (post-P9.1, 2026-04-21):
//
// (1) TOPOLOGY_CATALOG has exactly 8 canonical entries, each with the
//     full static attribute set populated. A2A deliberation belongs to
//     exactly one entry.
// (2) `assertSupportedInPrA` matches the PR-A support set: 3 ids pass,
//     all others throw UnsupportedTopologyError with a PR-migration hint.
// (3) `execution_topology_overrides.<id>.max_concurrent_lenses` is the
//     only override applied at resolution time; zero / negative values
//     fall back to catalog default.
// (4) `[topology]` STDERR prefix mirrors plan_trace 1:1.
// (5) `no_host` resolution composes a reason listing signals + guidance.
// (6) Legacy `execution_topology_priority` field is ignored at runtime
//     (the ladder walk was retired in P9.1; field removal lands in P9.2).
// (7) When `config.review` is absent, the resolver takes the main_native
//     degrade path — the legacy priority ladder is not consulted.
//
// Axis-first positive / negative coverage lives in
// `execution-topology-resolver-axis-first.test.ts`.
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

/**
 * Minimal `config.review` axis block that derives to `cc-main-agent-subagent`
 * under a Claude host. Used as a vehicle for exercising resolver plumbing
 * (overrides, observability) without duplicating axis-first happy-path
 * coverage.
 */
const REVIEW_BLOCK_MAIN_NATIVE: NonNullable<ResolveArgs["ontoConfig"]["review"]> = {
  teamlead: { model: "main" },
  subagent: { provider: "main-native" },
};

// ---------------------------------------------------------------------------
// (3) execution_topology_overrides — max_concurrent_lenses only
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — execution_topology_overrides", () => {
  it("max_concurrent_lenses override takes effect and logs the change", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          review: REVIEW_BLOCK_MAIN_NATIVE,
          execution_topology_overrides: {
            "cc-main-agent-subagent": { max_concurrent_lenses: 6 },
          },
        },
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
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
          review: REVIEW_BLOCK_MAIN_NATIVE,
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
// (4) plan_trace + [topology] STDERR — single source of truth
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
        ontoConfig: { review: REVIEW_BLOCK_MAIN_NATIVE },
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
        ontoConfig: { review: REVIEW_BLOCK_MAIN_NATIVE },
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

  // (5) no_host composition
  it("no_host resolution surfaces plan_trace + guidance reason", () => {
    const res = resolveExecutionTopology(withSignals({}));
    const nohost = expectNoHost(res);
    expect(nohost.plan_trace.length).toBeGreaterThan(0);
    expect(nohost.reason).toContain("Execution topology 를 도출할 수 없습니다");
    expect(nohost.reason).toContain("현재 환경 시그널");
    expect(nohost.reason).toContain("해결 방법");
  });
});

// ---------------------------------------------------------------------------
// (2) PR-A support set — spawn-time guard
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
// (1) Catalog shape stability
// ---------------------------------------------------------------------------

const EXPECTED_CATALOG_IDS: TopologyId[] = [
  "cc-teams-lens-agent-deliberation",
  "cc-teams-agent-subagent",
  "cc-teams-codex-subprocess",
  "cc-main-agent-subagent",
  "cc-main-codex-subprocess",
  "cc-teams-litellm-sessions",
  "codex-nested-subprocess",
  "codex-main-subprocess",
];

describe("TOPOLOGY_CATALOG — shape", () => {
  it("has exactly 8 canonical entries (post-P7 trim)", () => {
    const catalogIds = Object.keys(TOPOLOGY_CATALOG).sort();
    expect(catalogIds).toEqual([...EXPECTED_CATALOG_IDS].sort());
    expect(catalogIds.length).toBe(8);
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

  it("only cc-teams-lens-agent-deliberation declares SendMessage A2A deliberation", () => {
    const a2a = (Object.keys(TOPOLOGY_CATALOG) as TopologyId[]).filter(
      (id) => TOPOLOGY_CATALOG[id].deliberation_channel === "sendmessage-a2a",
    );
    expect(a2a).toEqual(["cc-teams-lens-agent-deliberation"]);
  });
});

// ---------------------------------------------------------------------------
// (6) P9.1 — legacy `execution_topology_priority` is ignored at runtime
// (7) review absent → main_native degrade (no ladder walk)
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — P9.1 ladder retirement", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("no review block + CC host → main_native degrade → cc-main-agent-subagent", () => {
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {},
        claudeHost: true,
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
    expect(
      resolved.topology.plan_trace.some((l) =>
        l.includes("topology source=fallback-main-native"),
      ),
    ).toBe(true);
    expect(
      resolved.topology.plan_trace.some((l) =>
        l.includes("degraded: requested=<review-block-absent>"),
      ),
    ).toBe(true);
  });

  it("no review block + no host signals → no_host (fail-fast, no ladder)", () => {
    const res = resolveExecutionTopology(withSignals({}));
    const nohost = expectNoHost(res);
    expect(
      nohost.plan_trace.some((l) =>
        l.includes("no topology resolved (axis-first + main_native fallback both failed)"),
      ),
    ).toBe(true);
    // Guarantee we did NOT emit the old priority-ladder trace shape.
    expect(nohost.plan_trace.some((l) => l.includes("priority source="))).toBe(
      false,
    );
  });

  it("legacy execution_topology_priority in config is acknowledged but ignored", () => {
    // Even with a priority array that names a specific id, the resolver
    // MUST NOT walk it. Under a Claude host with no `config.review`, the
    // main_native degrade picks cc-main-agent-subagent. The legacy array
    // value (`codex-nested-subprocess`) is never selected.
    const res = resolveExecutionTopology(
      withSignals({
        ontoConfig: {
          execution_topology_priority: ["codex-nested-subprocess"],
        },
        claudeHost: true,
        codexAvailable: true, // would make codex-nested viable under old ladder
      }),
    );
    const resolved = expectResolved(res);
    expect(resolved.topology.id).toBe("cc-main-agent-subagent");
    expect(
      resolved.topology.plan_trace.some((l) =>
        l.includes(
          "legacy execution_topology_priority present in config but ignored",
        ),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// env-defaulting (no injected signals) — uses process.env
// ---------------------------------------------------------------------------

describe("resolveExecutionTopology — env defaults", () => {
  it("falls back to host-detection helpers when signals are not injected", () => {
    // Inject ontoConfig but omit detection flag args. The resolver should
    // call detectClaudeCodeEnvSignal() etc. — we only assert the shape is
    // valid (resolved or no_host with a trace).
    const res = resolveExecutionTopology({
      ontoConfig: { review: REVIEW_BLOCK_MAIN_NATIVE },
      env: {},
    });
    expect(["resolved", "no_host"]).toContain(res.type);
    if (res.type === "no_host") {
      expect(res.plan_trace.length).toBeGreaterThan(0);
    }
  });
});
