import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tryTopologyDerivedExecutor } from "./review-invoke.js";
// ---------------------------------------------------------------------------
// Topology-derived executor dispatch invariants (P9.3, 2026-04-21):
//
// (1) Dispatch is always attempted — the former opt-in gate
//     (`execution_topology_priority` pre-P9.1, `config.review` presence
//     in P9.2) is removed. Resolver's universal `main_native` degrade
//     guarantees a viable topology whenever a host is reachable.
// (2) Resolved topology whose lens_spawn_mechanism has a standalone
//     binary → returns the mapped ReviewUnitExecutorConfig (caller
//     appends subagent/model args as usual).
// (3) Resolved topology whose mechanism has NO standalone binary
//     (claude-agent-tool, claude-teamcreate-member, codex-nested's
//     teamlead location) → returns null (fall through to coordinator
//     or dedicated orchestrators).
// (4) No reachable host (resolver returns `no_host`) → returns null.
// (5) `[plan:executor]` STDERR line emitted on successful topology
//     derivation, so operators can see topology → binary mapping.
// ---------------------------------------------------------------------------
const FAKE_HOME = "/tmp/fake-onto-home";
function withInjectedSignals(config, overrides = {}) {
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
            if (!(k in originalEnv))
                delete process.env[k];
        }
        for (const [k, v] of Object.entries(originalEnv)) {
            process.env[k] = v;
        }
    });
    it("no config.review block + no host → null (resolver returns no_host)", () => {
        // P9.3 (2026-04-21): dispatch attempts axis-first resolution for
        // every review invocation. Without CLAUDECODE / codex signals the
        // resolver's main_native degrade cannot map → no_host → null.
        const result = tryTopologyDerivedExecutor({}, FAKE_HOME);
        expect(result).toBeNull();
    });
    it("no config.review block + CC host → null (cc-main-agent-subagent has no standalone binary)", () => {
        // P9.3 invariant: even without a review block the resolver maps
        // main_native → cc-main-agent-subagent under CLAUDECODE=1. That
        // topology's mechanism is claude-agent-tool which has no
        // standalone binary, so dispatch falls through to coordinator.
        process.env.CLAUDECODE = "1";
        const result = tryTopologyDerivedExecutor({}, FAKE_HOME);
        expect(result).toBeNull();
    });
    it("missing ontoHome → null (required to resolve executor path)", () => {
        process.env.CLAUDECODE = "1";
        const result = tryTopologyDerivedExecutor({ review: { subagent: { provider: "main-native" } } }, undefined);
        expect(result).toBeNull();
    });
    it("review axis resolves to claude-agent-tool (cc-main-agent-subagent) → null (coordinator handoff is the seat)", () => {
        process.env.CLAUDECODE = "1";
        const result = tryTopologyDerivedExecutor({ review: { subagent: { provider: "main-native" } } }, FAKE_HOME);
        expect(result).toBeNull();
    });
    it("review axis resolves but no host signals → null (no_host case)", () => {
        // CLAUDECODE unset, no codex signals. Axis block derives to
        // main_native shape but the mapping is unreachable — no_host.
        const result = tryTopologyDerivedExecutor({ review: { subagent: { provider: "main-native" } } }, FAKE_HOME);
        expect(result).toBeNull();
    });
    it("review axis resolves to codex-nested-subprocess → null (PR-H dispatch branch is the seat)", () => {
        // Nested codex requires only codexAvailable; but the mapping module
        // rejects it (its teamlead is codex-subprocess, not a per-lens binary).
        // Without CLAUDECODE and with no real codex binary on the test
        // machine's PATH the resolver will return no_host; that's fine —
        // the test asserts null regardless, which is correct PR-F behaviour
        // for nested topology anyway.
        const result = tryTopologyDerivedExecutor({
            review: {
                teamlead: { model: { provider: "codex", model_id: "gpt-5.4" } },
                subagent: { provider: "codex", model_id: "gpt-5.4" },
            },
        }, FAKE_HOME);
        expect(result).toBeNull();
    });
});
describe("tryTopologyDerivedExecutor — successful derivation", () => {
    const originalEnv = { ...process.env };
    let stderrSpy;
    beforeEach(() => {
        delete process.env.CLAUDECODE;
        delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
        stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });
    afterEach(() => {
        stderrSpy.mockRestore();
        for (const k of Object.keys(process.env)) {
            if (!(k in originalEnv))
                delete process.env[k];
        }
        for (const [k, v] of Object.entries(originalEnv)) {
            process.env[k] = v;
        }
    });
    function topologyLogLines() {
        return stderrSpy.mock.calls
            .map((c) => String(c[0]))
            .filter((l) => l.startsWith("[plan:executor]"));
    }
    it("cc-teams-litellm-sessions axis block → litellm executor binary", () => {
        process.env.CLAUDECODE = "1";
        // P9.2 (2026-04-21): topology is selected exclusively through the
        // `config.review` axis block — legacy `execution_topology_priority`
        // field was removed from OntoConfig.
        const axisConfig = {
            review: {
                subagent: { provider: "litellm", model_id: "gpt-4o" },
            },
            llm_base_url: "http://localhost:4000",
        };
        // Without experimental flag, teams shape cannot activate → axis-first
        // fails → degrade to main_native → cc-main-agent-subagent (no
        // standalone binary) → null.
        const result = tryTopologyDerivedExecutor(withInjectedSignals(axisConfig), FAKE_HOME);
        expect(result).toBeNull();
        process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
        const result2 = tryTopologyDerivedExecutor(withInjectedSignals(axisConfig), FAKE_HOME);
        expect(result2).not.toBeNull();
        expect(result2.bin).toBe("node");
        expect(result2.args[0]).toContain("inline-http-review-unit-executor.js");
        expect(result2.args[0]).toContain(FAKE_HOME);
    });
    it("successful derivation emits [plan:executor] STDERR", () => {
        process.env.CLAUDECODE = "1";
        process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
        tryTopologyDerivedExecutor({
            review: {
                subagent: { provider: "litellm", model_id: "gpt-4o" },
            },
            llm_base_url: "http://localhost:4000",
        }, FAKE_HOME);
        const lines = topologyLogLines();
        expect(lines.length).toBe(1);
        expect(lines[0]).toContain("topology=cc-teams-litellm-sessions");
        expect(lines[0]).toContain("bin=node");
        expect(lines[0]).toContain("inline-http-review-unit-executor.js");
    });
    it("no [plan:executor] line when topology falls through", () => {
        // cc-main-agent-subagent has no standalone binary → fall through,
        // so no [plan:executor] line should be emitted for this derivation.
        // The resolver picks cc-main-agent-subagent via the axis block.
        process.env.CLAUDECODE = "1";
        tryTopologyDerivedExecutor({ review: { subagent: { provider: "main-native" } } }, FAKE_HOME);
        expect(topologyLogLines()).toHaveLength(0);
    });
});
describe("tryTopologyDerivedExecutor — axis-first decides (P9.2)", () => {
    const originalEnv = { ...process.env };
    beforeEach(() => {
        delete process.env.CLAUDECODE;
        delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
        vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        for (const k of Object.keys(process.env)) {
            if (!(k in originalEnv))
                delete process.env[k];
        }
        for (const [k, v] of Object.entries(originalEnv)) {
            process.env[k] = v;
        }
    });
    it("review axis selects the binary-backed topology when declared", () => {
        process.env.CLAUDECODE = "1";
        process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
        // Axis block declares subagent=litellm → shape=main-teams_foreign →
        // TopologyId=cc-teams-litellm-sessions (standalone binary).
        const result = tryTopologyDerivedExecutor({
            review: {
                subagent: { provider: "litellm", model_id: "gpt-4o" },
            },
            llm_base_url: "http://localhost:4000",
        }, FAKE_HOME);
        expect(result).not.toBeNull();
        expect(result.args[0]).toContain("inline-http-review-unit-executor.js");
    });
});
