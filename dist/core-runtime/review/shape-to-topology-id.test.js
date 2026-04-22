import { describe, it, expect } from "vitest";
import { shapeToTopologyId } from "./shape-to-topology-id.js";
// ---------------------------------------------------------------------------
// shapeToTopologyId — Review UX Redesign P2 (2026-04-21)
// ---------------------------------------------------------------------------
//
// Coverage:
//   (1) Design doc §4.2 Host × Shape mapping table — every listed
//       (shape, host, provider) combination has a corresponding assertion.
//   (2) Un-mapped combinations return `ok=false` with a reason, not a
//       silent fallback. P2's integrator decides fallback strategy.
//   (3) Trace accumulates for both success and failure — operator can read
//       STDERR and reconstruct the decision.
// ---------------------------------------------------------------------------
const CLAUDE = {
    claudeHost: true,
    codexSessionActive: false,
};
const CODEX = {
    claudeHost: false,
    codexSessionActive: true,
};
const NEITHER = {
    claudeHost: false,
    codexSessionActive: false,
};
function input(shape, provider, signals) {
    return { shape, subagent_provider: provider, signals };
}
describe("shapeToTopologyId — main_native host branching", () => {
    it("main_native + Claude host → cc-main-agent-subagent", () => {
        const r = shapeToTopologyId(input("main_native", null, CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-main-agent-subagent");
    });
    it("main_native + Codex host → codex-main-subprocess", () => {
        const r = shapeToTopologyId(input("main_native", null, CODEX));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("codex-main-subprocess");
    });
    it("main_native + neither → failure with clear reason", () => {
        const r = shapeToTopologyId(input("main_native", null, NEITHER));
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.reason).toContain("Claude Code");
            expect(r.reason).toContain("Codex CLI");
        }
    });
});
describe("shapeToTopologyId — main_foreign mapping", () => {
    it("main_foreign + codex + Claude → cc-main-codex-subprocess", () => {
        const r = shapeToTopologyId(input("main_foreign", "codex", CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-main-codex-subprocess");
    });
    it("main_foreign + litellm + Claude → unsupported (teams mode required)", () => {
        const r = shapeToTopologyId(input("main_foreign", "litellm", CLAUDE));
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toContain("teams");
    });
    it("main_foreign + anthropic + Claude → unsupported (no catalog entry)", () => {
        const r = shapeToTopologyId(input("main_foreign", "anthropic", CLAUDE));
        expect(r.ok).toBe(false);
    });
    it("main_foreign + codex + Codex host → unsupported (main_foreign requires Claude host)", () => {
        const r = shapeToTopologyId(input("main_foreign", "codex", CODEX));
        expect(r.ok).toBe(false);
    });
});
describe("shapeToTopologyId — teams variants", () => {
    it("main-teams_native → cc-teams-agent-subagent (host-agnostic)", () => {
        const r = shapeToTopologyId(input("main-teams_native", null, CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-teams-agent-subagent");
    });
    it("main-teams_foreign + codex → cc-teams-codex-subprocess", () => {
        const r = shapeToTopologyId(input("main-teams_foreign", "codex", CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-teams-codex-subprocess");
    });
    it("main-teams_foreign + litellm → cc-teams-litellm-sessions", () => {
        const r = shapeToTopologyId(input("main-teams_foreign", "litellm", CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-teams-litellm-sessions");
    });
    it("main-teams_foreign + anthropic → unsupported (no catalog entry)", () => {
        const r = shapeToTopologyId(input("main-teams_foreign", "anthropic", CLAUDE));
        expect(r.ok).toBe(false);
    });
    it("main-teams_foreign + openai → unsupported (no catalog entry)", () => {
        const r = shapeToTopologyId(input("main-teams_foreign", "openai", CLAUDE));
        expect(r.ok).toBe(false);
    });
    it("main-teams_a2a → cc-teams-lens-agent-deliberation", () => {
        const r = shapeToTopologyId(input("main-teams_a2a", null, CLAUDE));
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.topology_id).toBe("cc-teams-lens-agent-deliberation");
    });
});
describe("shapeToTopologyId — external teamlead", () => {
    it("ext-teamlead_native → codex-nested-subprocess (host-agnostic)", () => {
        const r1 = shapeToTopologyId(input("ext-teamlead_native", "codex", CLAUDE));
        const r2 = shapeToTopologyId(input("ext-teamlead_native", "codex", CODEX));
        const r3 = shapeToTopologyId(input("ext-teamlead_native", "codex", NEITHER));
        expect(r1.ok && r2.ok && r3.ok).toBe(true);
        if (r1.ok)
            expect(r1.topology_id).toBe("codex-nested-subprocess");
        if (r2.ok)
            expect(r2.topology_id).toBe("codex-nested-subprocess");
        if (r3.ok)
            expect(r3.topology_id).toBe("codex-nested-subprocess");
    });
});
describe("shapeToTopologyId — trace is populated", () => {
    it("success result carries a non-empty trace", () => {
        const r = shapeToTopologyId(input("main_native", null, CLAUDE));
        expect(r.trace.length).toBeGreaterThan(0);
        expect(r.trace.some((l) => l.includes("mapping shape"))).toBe(true);
    });
    it("failure result carries a non-empty trace", () => {
        const r = shapeToTopologyId(input("main_native", null, NEITHER));
        expect(r.trace.length).toBeGreaterThan(0);
    });
});
