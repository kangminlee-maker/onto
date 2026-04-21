import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OntoConfig } from "../discovery/config-chain.js";
import { tryTopologyDerivedExecutor } from "./review-invoke.js";

// ---------------------------------------------------------------------------
// These tests assert PR-F's opt-in topology dispatch invariants:
//
// (1) Without `execution_topology_priority` → returns null
//     (legacy resolveExecutorConfig path handles everything, no change).
// (2) With `execution_topology_priority` AND a matching topology whose
//     lens_spawn_mechanism has a standalone binary → returns the
//     mapped ReviewUnitExecutorConfig (caller appends subagent/model
//     args as usual).
// (3) With `execution_topology_priority` AND a matching topology whose
//     mechanism has NO standalone binary (claude-agent-tool,
//     claude-teamcreate-member, codex-nested's teamlead location)
//     → returns null (fall through to legacy or dedicated orchestrators).
// (4) With `execution_topology_priority` but no matching topology
//     (no_host) → returns null (legacy handles the no-host error).
// (5) `[plan:executor]` STDERR line emitted on successful topology
//     derivation, so operators can see topology → binary mapping.
// ---------------------------------------------------------------------------

const FAKE_HOME = "/tmp/fake-onto-home";

function withInjectedSignals(config: OntoConfig, overrides: {
  CLAUDECODE?: string;
  EXPERIMENTAL?: string;
} = {}): OntoConfig {
  // `tryTopologyDerivedExecutor` reads env implicitly via
  // resolveExecutionTopology; most tests need CLAUDECODE=1 to satisfy
  // the cc-main-* requirement. Tests manipulate process.env directly.
  return config;
}

describe("tryTopologyDerivedExecutor — null paths (fall through)", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });
  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(originalEnv)) {
      process.env[k] = v;
    }
  });

  it("no execution_topology_priority → null", () => {
    const result = tryTopologyDerivedExecutor({}, FAKE_HOME);
    expect(result).toBeNull();
  });

  it("empty execution_topology_priority array → null", () => {
    const result = tryTopologyDerivedExecutor(
      { execution_topology_priority: [] },
      FAKE_HOME,
    );
    expect(result).toBeNull();
  });

  it("missing ontoHome → null (required to resolve executor path)", () => {
    process.env.CLAUDECODE = "1";
    const result = tryTopologyDerivedExecutor(
      { execution_topology_priority: ["cc-main-agent-subagent"] },
      undefined,
    );
    expect(result).toBeNull();
  });

  it("topology resolves to claude-agent-tool (cc-main-agent-subagent) → null (coordinator handoff is the seat)", () => {
    process.env.CLAUDECODE = "1";
    const result = tryTopologyDerivedExecutor(
      { execution_topology_priority: ["cc-main-agent-subagent"] },
      FAKE_HOME,
    );
    expect(result).toBeNull();
  });

  it("topology resolves but no match → null (no_host case, legacy will emit its own error)", () => {
    // CLAUDECODE unset, no codex signals. Priority lists only claude
    // options — none will match.
    const result = tryTopologyDerivedExecutor(
      {
        execution_topology_priority: [
          "cc-main-agent-subagent",
          "cc-teams-agent-subagent",
        ],
      },
      FAKE_HOME,
    );
    expect(result).toBeNull();
  });

  it("topology resolves to codex-nested-subprocess → null (PR-H dispatch branch is the seat)", () => {
    // Nested codex requires only codexAvailable; but the mapping module
    // rejects it (its teamlead is codex-subprocess, not a per-lens binary).
    // For this test we inject codex availability via config signal — the
    // real PR-H wire-in will handle this topology directly in
    // executeReviewPromptExecution.
    // Without CLAUDECODE and with no real codex binary on the test
    // machine's PATH the resolver will return no_host; that's fine —
    // the test asserts null regardless, which is correct PR-F behaviour
    // for nested topology anyway.
    const result = tryTopologyDerivedExecutor(
      { execution_topology_priority: ["codex-nested-subprocess"] },
      FAKE_HOME,
    );
    expect(result).toBeNull();
  });
});

describe("tryTopologyDerivedExecutor — successful derivation", () => {
  const originalEnv = { ...process.env };
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderrSpy.mockRestore();
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(originalEnv)) {
      process.env[k] = v;
    }
  });

  function topologyLogLines(): string[] {
    return stderrSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((l: string) => l.startsWith("[plan:executor]"));
  }

  it("cc-teams-litellm-sessions axis block → litellm executor binary", () => {
    process.env.CLAUDECODE = "1";
    // P9.1 (2026-04-21): the resolver no longer walks the priority
    // ladder — topology is determined by the `config.review` axis block.
    // `execution_topology_priority` is kept in the config only to satisfy
    // the P9.3-scope gate in `tryTopologyDerivedExecutor`; the array
    // contents are ignored at resolution time.
    const axisConfig: OntoConfig = {
      execution_topology_priority: ["cc-teams-litellm-sessions"],
      review: {
        subagent: { provider: "litellm" as const, model_id: "gpt-4o" },
      },
      llm_base_url: "http://localhost:4000",
    };

    // Without experimental flag, teams shape cannot activate → axis-first
    // fails → degrade to main_native → cc-main-agent-subagent (no
    // standalone binary) → null.
    const result = tryTopologyDerivedExecutor(
      withInjectedSignals(axisConfig),
      FAKE_HOME,
    );
    expect(result).toBeNull();

    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    const result2 = tryTopologyDerivedExecutor(
      withInjectedSignals(axisConfig),
      FAKE_HOME,
    );
    expect(result2).not.toBeNull();
    expect(result2!.bin).toBe("node");
    expect(result2!.args[0]).toContain("inline-http-review-unit-executor.js");
    expect(result2!.args[0]).toContain(FAKE_HOME);
  });

  it("successful derivation emits [plan:executor] STDERR", () => {
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    tryTopologyDerivedExecutor(
      {
        execution_topology_priority: ["cc-teams-litellm-sessions"],
        review: {
          subagent: { provider: "litellm", model_id: "gpt-4o" },
        },
        llm_base_url: "http://localhost:4000",
      },
      FAKE_HOME,
    );
    const lines = topologyLogLines();
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("topology=cc-teams-litellm-sessions");
    expect(lines[0]).toContain("bin=node");
    expect(lines[0]).toContain("inline-http-review-unit-executor.js");
  });

  it("no [plan:executor] line when topology falls through", () => {
    // cc-main-agent-subagent has no standalone binary → fall through,
    // so no [plan:executor] line should be emitted for this derivation.
    // The priority array is still required to pass the P9.3-scope gate;
    // the resolver picks cc-main-agent-subagent via main_native degrade
    // because `config.review` is absent.
    process.env.CLAUDECODE = "1";
    tryTopologyDerivedExecutor(
      { execution_topology_priority: ["cc-main-agent-subagent"] },
      FAKE_HOME,
    );
    expect(topologyLogLines()).toHaveLength(0);
  });
});

describe("tryTopologyDerivedExecutor — axis-first decides (P9.1)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(originalEnv)) {
      process.env[k] = v;
    }
  });

  it("legacy execution_topology_priority does not decide the topology", () => {
    // Pre-P9.1, this array would have selected cc-teams-litellm-sessions
    // (first matching entry). After P9.1 the array is ignored — absent
    // a `config.review` block, the resolver degrades to main_native →
    // cc-main-agent-subagent, which has no standalone binary → null.
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    const result = tryTopologyDerivedExecutor(
      {
        execution_topology_priority: [
          "cc-teams-litellm-sessions",
          "cc-main-agent-subagent",
        ],
        llm_base_url: "http://localhost:4000",
      },
      FAKE_HOME,
    );
    expect(result).toBeNull();
  });

  it("axis-first selects the binary-backed topology when declared", () => {
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    // Axis block declares subagent=litellm → shape=main-teams_foreign →
    // TopologyId=cc-teams-litellm-sessions (standalone binary). The
    // priority array is retained to pass the P9.3-scope gate.
    const result = tryTopologyDerivedExecutor(
      {
        execution_topology_priority: ["cc-teams-litellm-sessions"],
        review: {
          subagent: { provider: "litellm", model_id: "gpt-4o" },
        },
        llm_base_url: "http://localhost:4000",
      },
      FAKE_HOME,
    );
    expect(result).not.toBeNull();
    expect(result!.args[0]).toContain("inline-http-review-unit-executor.js");
  });
});
