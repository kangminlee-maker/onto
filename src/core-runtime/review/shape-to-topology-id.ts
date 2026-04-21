/**
 * Review UX Redesign P2 — 6 shape → existing TopologyId mapping.
 *
 * # What this module is
 *
 * A pure function that converts the axis-derived `TopologyShape` (6 values)
 * plus host-context signals into one of the 10 canonical `TopologyId` values
 * used by the existing executor catalog. This is the **shim layer** — shape
 * is user-facing stable vocabulary; TopologyId is the internal dispatch
 * key held by `TOPOLOGY_CATALOG` and downstream executor mapping.
 *
 * # Why it exists
 *
 * Shape does not uniquely determine TopologyId because several shapes
 * depend on host type:
 *
 *   - `main_native` + Claude host  → `cc-main-agent-subagent`
 *   - `main_native` + Codex host   → `codex-main-subprocess`
 *   - `main_foreign` (codex) + CC  → `cc-main-codex-subprocess`
 *   - `main-teams_foreign` (codex) → `cc-teams-codex-subprocess`
 *   - `main-teams_foreign` (litellm) → `cc-teams-litellm-sessions`
 *
 * Isolating this in a separate pure function:
 *   (a) makes the mapping table auditable (see tests).
 *   (b) keeps the derivation step (shape) free of host-specific knowledge.
 *   (c) allows P7 to later remove the 10 ids and replace this shim with a
 *       direct shape → executor dispatch, without changing the shape API.
 *
 * # How it relates
 *
 * - Input: `TopologyShape` (from `topology-shape-derivation.ts`) +
 *   `{claudeHost, codexSessionActive}` + optional foreign subagent provider.
 * - Output: one of 10 `TopologyId` values, or `null` when the combination
 *   has no canonical TopologyId (e.g. `main_foreign` with litellm — the
 *   existing catalog has no "cc-main-litellm" entry; only teams variant).
 * - Caller (resolver) handles `null` by falling back to legacy priority
 *   ladder in P2, or by universal main_native fallback in P3.
 */

import type { ForeignProvider } from "../discovery/config-chain.js";
import type { TopologyId } from "./execution-topology-resolver.js";
import type { TopologyShape } from "./topology-shape-derivation.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ShapeMappingSignals {
  /** Claude Code session is hosting. Determines CC vs Codex branch. */
  claudeHost: boolean;
  /** Codex CLI session is hosting (used when claudeHost is false). */
  codexSessionActive: boolean;
}

export interface ShapeMappingInput {
  shape: TopologyShape;
  /** Foreign subagent provider when the shape carries one. null for native. */
  subagent_provider: ForeignProvider | null;
  signals: ShapeMappingSignals;
}

export interface ShapeMappingSuccess {
  ok: true;
  topology_id: TopologyId;
  trace: string[];
}

export interface ShapeMappingFailure {
  ok: false;
  reason: string;
  trace: string[];
}

export type ShapeMappingResult = ShapeMappingSuccess | ShapeMappingFailure;

// ---------------------------------------------------------------------------
// Main mapping function
// ---------------------------------------------------------------------------

/**
 * Map a 6-shape classification to one of the 10 canonical TopologyId values.
 *
 * Returns failure when the shape + signal combination has no canonical
 * TopologyId in the current catalog. Failure cases (post-P2):
 *   - `main_native` with neither Claude nor Codex host (plain terminal
 *     without codex OAuth — truly unreachable).
 *   - `main_foreign` with a provider that has no `cc-main-<provider>`
 *     entry in the catalog. Currently only `codex` has such an entry;
 *     `litellm` / `anthropic` / `openai` are teams-only in the existing
 *     10-topology catalog.
 *   - `main-teams_foreign` with an unsupported provider (only codex/litellm
 *     mapped).
 *
 * The caller (resolver) decides the fallback strategy — P2 falls back to
 * the legacy priority ladder; P3 will wrap with universal main_native.
 */
export function shapeToTopologyId(input: ShapeMappingInput): ShapeMappingResult {
  const { shape, subagent_provider, signals } = input;
  const trace: string[] = [];
  const log = (line: string): void => {
    trace.push(line);
  };

  log(
    `mapping shape=${shape} subagent_provider=${subagent_provider ?? "null"} ` +
      `claudeHost=${signals.claudeHost} codexSessionActive=${signals.codexSessionActive}`,
  );

  switch (shape) {
    case "main_native": {
      if (signals.claudeHost) {
        log("→ cc-main-agent-subagent (Claude host + native = Agent tool)");
        return { ok: true, topology_id: "cc-main-agent-subagent", trace };
      }
      if (signals.codexSessionActive) {
        log("→ codex-main-subprocess (Codex host + native = codex subprocess)");
        return { ok: true, topology_id: "codex-main-subprocess", trace };
      }
      log("no canonical TopologyId: main_native requires Claude or Codex host");
      return {
        ok: false,
        reason:
          "main_native shape requires Claude Code or Codex CLI host session. " +
          "Neither CLAUDECODE=1 nor CODEX_THREAD_ID detected.",
        trace,
      };
    }

    case "main_foreign": {
      // Existing catalog has only `cc-main-codex-subprocess` for flat-main
      // with foreign provider. Other foreign providers (litellm/anthropic/
      // openai) require teams mode in the current catalog.
      if (signals.claudeHost && subagent_provider === "codex") {
        log("→ cc-main-codex-subprocess (Claude + main + codex lens)");
        return { ok: true, topology_id: "cc-main-codex-subprocess", trace };
      }
      log(
        `no canonical TopologyId: main_foreign with provider=${subagent_provider} ` +
          `requires teams mode or a different provider`,
      );
      return {
        ok: false,
        reason:
          `main_foreign shape with provider=${subagent_provider} has no canonical TopologyId. ` +
          "Either (a) enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 for main-teams_foreign, " +
          "or (b) use provider=codex under Claude host for cc-main-codex-subprocess.",
        trace,
      };
    }

    case "main-teams_native": {
      log("→ cc-teams-agent-subagent (TeamCreate + native lens)");
      return { ok: true, topology_id: "cc-teams-agent-subagent", trace };
    }

    case "main-teams_foreign": {
      if (subagent_provider === "codex") {
        log("→ cc-teams-codex-subprocess (TeamCreate + codex lens)");
        return { ok: true, topology_id: "cc-teams-codex-subprocess", trace };
      }
      if (subagent_provider === "litellm") {
        log("→ cc-teams-litellm-sessions (TeamCreate + litellm lens)");
        return { ok: true, topology_id: "cc-teams-litellm-sessions", trace };
      }
      log(
        `no canonical TopologyId: main-teams_foreign with provider=${subagent_provider}`,
      );
      return {
        ok: false,
        reason:
          `main-teams_foreign shape with provider=${subagent_provider} has no canonical TopologyId. ` +
          "Only provider=codex or provider=litellm mapped in the current catalog.",
        trace,
      };
    }

    case "main-teams_a2a": {
      log("→ cc-teams-lens-agent-deliberation (TeamCreate + native + a2a)");
      return {
        ok: true,
        topology_id: "cc-teams-lens-agent-deliberation",
        trace,
      };
    }

    case "ext-teamlead_native": {
      // Only codex is supported as external teamlead in the current catalog.
      log("→ codex-nested-subprocess (external codex teamlead + nested codex lens)");
      return { ok: true, topology_id: "codex-nested-subprocess", trace };
    }
  }
}
