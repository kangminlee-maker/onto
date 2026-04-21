import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionTopology } from "../review/execution-topology-resolver.js";
import {
  tryResolveTopologyForHandoff,
  tryTopologyDerivedExecutor,
} from "./review-invoke.js";

// ---------------------------------------------------------------------------
// P9.3-m1 Resolver caching invariants (2026-04-21):
//
// `runReviewInvokeCli` resolves `resolveExecutionTopology` exactly once
// per invocation and threads the result as `cached` to 3 downstream
// consumers. This file protects the cache plumbing from future
// regressions — a caller that accidentally drops the `cached` argument
// (reverting to the 3x resolver-call pattern) would re-emit the full
// `[topology]` STDERR trace, which these tests assert does NOT happen.
//
// The `[topology] signals:` line is the most stable counter because
// `resolveExecutionTopology` emits it exactly once at the very start of
// each invocation (see execution-topology-resolver.ts:413). When the
// helpers honour `cached`, they skip the resolver entirely and this
// line MUST NOT appear.
// ---------------------------------------------------------------------------

const FAKE_HOME = "/tmp/fake-onto-home";

const CACHED_LITELLM_TOPOLOGY: ExecutionTopology = {
  id: "cc-teams-litellm-sessions",
  teamlead_location: "claude-teamcreate",
  lens_spawn_mechanism: "litellm-http",
  max_concurrent_lenses: 3,
  transport_rank: "S2",
  deliberation_channel: "synthesizer-only",
  plan_trace: ["cached-by-runReviewInvokeCli"],
};

const CACHED_CC_MAIN_TOPOLOGY: ExecutionTopology = {
  id: "cc-main-agent-subagent",
  teamlead_location: "onto-main",
  lens_spawn_mechanism: "claude-agent-tool",
  max_concurrent_lenses: 3,
  transport_rank: "S0",
  deliberation_channel: "synthesizer-only",
  plan_trace: ["cached-by-runReviewInvokeCli"],
};

describe("tryResolveTopologyForHandoff — cached topology bypass", () => {
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

  function signalsTraceLines(): string[] {
    return stderrSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((l: string) => l.startsWith("[topology] signals:"));
  }

  it("cached=ExecutionTopology → descriptor returned without re-running resolver", () => {
    const descriptor = tryResolveTopologyForHandoff({}, CACHED_LITELLM_TOPOLOGY);
    expect(descriptor).not.toBeNull();
    expect(descriptor!.id).toBe("cc-teams-litellm-sessions");
    expect(descriptor!.teamlead_location).toBe("claude-teamcreate");
    expect(signalsTraceLines()).toHaveLength(0);
  });

  it("cached=null → returns null without re-running resolver", () => {
    const descriptor = tryResolveTopologyForHandoff({}, null);
    expect(descriptor).toBeNull();
    expect(signalsTraceLines()).toHaveLength(0);
  });

  it("cached=undefined → legacy behaviour (resolver runs, emits signals)", () => {
    // Two-argument call path preserved for test-harness compatibility;
    // this branch is what existing tests exercise.
    tryResolveTopologyForHandoff({});
    expect(signalsTraceLines()).toHaveLength(1);
  });
});

describe("tryTopologyDerivedExecutor — cached topology bypass", () => {
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

  function signalsTraceLines(): string[] {
    return stderrSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((l: string) => l.startsWith("[topology] signals:"));
  }

  it("cached=ExecutionTopology (binary-backed) → executor returned without re-running resolver", () => {
    const result = tryTopologyDerivedExecutor(
      { llm_base_url: "http://localhost:4000" },
      FAKE_HOME,
      CACHED_LITELLM_TOPOLOGY,
    );
    expect(result).not.toBeNull();
    expect(result!.bin).toBe("node");
    expect(result!.args[0]).toContain("inline-http-review-unit-executor.js");
    expect(signalsTraceLines()).toHaveLength(0);
  });

  it("cached=ExecutionTopology (no standalone binary) → null without re-running resolver", () => {
    const result = tryTopologyDerivedExecutor(
      {},
      FAKE_HOME,
      CACHED_CC_MAIN_TOPOLOGY,
    );
    expect(result).toBeNull();
    expect(signalsTraceLines()).toHaveLength(0);
  });

  it("cached=null → null without re-running resolver", () => {
    const result = tryTopologyDerivedExecutor({}, FAKE_HOME, null);
    expect(result).toBeNull();
    expect(signalsTraceLines()).toHaveLength(0);
  });

  it("cached=undefined → legacy behaviour (resolver runs, emits signals)", () => {
    process.env.CLAUDECODE = "1";
    tryTopologyDerivedExecutor({}, FAKE_HOME);
    expect(signalsTraceLines()).toHaveLength(1);
  });
});
