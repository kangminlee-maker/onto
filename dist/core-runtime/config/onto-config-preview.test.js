import { describe, it, expect } from "vitest";
import { previewTopologyDerivation, renderPreview, } from "./onto-config-preview.js";
// ---------------------------------------------------------------------------
// previewTopologyDerivation — Review UX Redesign P5 (2026-04-21)
// ---------------------------------------------------------------------------
//
// These tests verify that the preview helper mirrors the runtime resolver's
// axis-first path:
//
//   (1) Happy path — a valid config + suitable host → correct shape +
//       canonical TopologyId + degraded=false.
//   (2) Derivation failure (a2a + no teams) → degrades to main_native.
//   (3) Mapping failure (main_foreign + litellm) → degrades to main_native.
//   (4) No Claude, no Codex → main_native unmappable → preview fails
//       (runtime would fall through to legacy ladder / no_host).
//   (5) renderPreview produces a stable human-readable block for CLI use.
// ---------------------------------------------------------------------------
const CLAUDE_NO_TEAMS = {
    claudeHost: true,
    codexSessionActive: false,
    experimentalAgentTeams: false,
};
const CLAUDE_TEAMS = {
    claudeHost: true,
    codexSessionActive: false,
    experimentalAgentTeams: true,
};
const CODEX_HOST = {
    claudeHost: false,
    codexSessionActive: true,
    experimentalAgentTeams: false,
};
const NEITHER = {
    claudeHost: false,
    codexSessionActive: false,
    experimentalAgentTeams: false,
};
describe("previewTopologyDerivation — happy paths", () => {
    it("empty config + Claude host → main_native / cc-main-agent-subagent", () => {
        const r = previewTopologyDerivation({}, CLAUDE_NO_TEAMS);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.shape).toBe("main_native");
            expect(r.topology_id).toBe("cc-main-agent-subagent");
            expect(r.degraded).toBe(false);
        }
    });
    it("teams + main-native → main-teams_native / cc-teams-agent-subagent", () => {
        const config = {
            teamlead: { model: "main" },
            subagent: { provider: "main-native" },
        };
        const r = previewTopologyDerivation(config, CLAUDE_TEAMS);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.shape).toBe("main-teams_native");
            expect(r.topology_id).toBe("cc-teams-agent-subagent");
            expect(r.degraded).toBe(false);
        }
    });
    it("Codex host + main-native → main_native / codex-main-subprocess", () => {
        const r = previewTopologyDerivation({ subagent: { provider: "main-native" } }, CODEX_HOST);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.shape).toBe("main_native");
            expect(r.topology_id).toBe("codex-main-subprocess");
        }
    });
});
describe("previewTopologyDerivation — degrade paths", () => {
    it("a2a without teams → degrades to main_native", () => {
        const config = {
            subagent: { provider: "main-native" },
            lens_deliberation: "sendmessage-a2a",
        };
        const r = previewTopologyDerivation(config, CLAUDE_NO_TEAMS);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.degraded).toBe(true);
            expect(r.shape).toBe("main_native");
            expect(r.topology_id).toBe("cc-main-agent-subagent");
            expect(r.trace.some((l) => l.startsWith("degrade:"))).toBe(true);
        }
    });
    it("main_foreign + litellm (Claude host) → degrades to main_native", () => {
        const config = {
            subagent: { provider: "litellm", model_id: "llama-8b" },
        };
        const r = previewTopologyDerivation(config, CLAUDE_NO_TEAMS);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.degraded).toBe(true);
            expect(r.topology_id).toBe("cc-main-agent-subagent");
            expect(r.trace.some((l) => l.includes("main_foreign(litellm)"))).toBe(true);
        }
    });
});
describe("previewTopologyDerivation — total failure (no host)", () => {
    it("main_native unmappable → preview fails with explanatory reason", () => {
        const r = previewTopologyDerivation({}, NEITHER);
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.reason).toContain("main_native fallback");
            expect(r.trace.some((l) => l.includes("unmappable"))).toBe(true);
        }
    });
});
describe("renderPreview — human-readable output", () => {
    it("success block includes shape + topology_id + trace", () => {
        const r = previewTopologyDerivation({}, CLAUDE_NO_TEAMS);
        const text = renderPreview(r);
        expect(text).toContain("Topology derivation preview");
        expect(text).toContain("shape:");
        expect(text).toContain("cc-main-agent-subagent");
        expect(text).toContain("Trace:");
    });
    it("degraded block includes (degraded) marker and fallback note", () => {
        const config = {
            subagent: { provider: "litellm", model_id: "llama-8b" },
        };
        const r = previewTopologyDerivation(config, CLAUDE_NO_TEAMS);
        const text = renderPreview(r);
        expect(text).toContain("(degraded)");
        expect(text).toContain("P3 universal fallback");
    });
    it("failure block includes reason + FAILED header", () => {
        const r = previewTopologyDerivation({}, NEITHER);
        const text = renderPreview(r);
        expect(text).toContain("FAILED");
        expect(text).toContain("reason:");
    });
});
