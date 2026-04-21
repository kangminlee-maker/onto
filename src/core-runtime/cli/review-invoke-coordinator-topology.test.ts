import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tryResolveTopologyForHandoff } from "./review-invoke.js";

// ---------------------------------------------------------------------------
// These tests assert PR-G's coordinator handoff enrichment invariants:
//
// (1) Principals without `execution_topology_priority` → null descriptor
//     (existing handoff payload shape unchanged; backward-compatible).
// (2) Principals with `execution_topology_priority` AND a resolvable
//     topology → non-null descriptor with all 6 static attributes,
//     minus plan_trace (handoff payload stays compact).
// (3) Descriptor is JSON-serializable with deterministic shape —
//     downstream coordinator consumers parse it unmodified.
// (4) Topology fails to resolve (signals missing) → null, matching the
//     PR-F fall-through policy.
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    process.env[k] = v;
  }
}

describe("tryResolveTopologyForHandoff — null paths", () => {
  beforeEach(() => {
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });
  afterEach(restoreEnv);

  it("no execution_topology_priority → null", () => {
    expect(tryResolveTopologyForHandoff({})).toBeNull();
  });

  it("empty execution_topology_priority array → null", () => {
    expect(
      tryResolveTopologyForHandoff({ execution_topology_priority: [] }),
    ).toBeNull();
  });

  it("undefined ontoConfig → null", () => {
    expect(tryResolveTopologyForHandoff(undefined)).toBeNull();
  });

  it("priority set but no signal matches → null (no_host)", () => {
    // No CLAUDECODE, no experimental flag, no codex, no litellm.
    expect(
      tryResolveTopologyForHandoff({
        execution_topology_priority: ["cc-teams-agent-subagent"],
      }),
    ).toBeNull();
  });
});

describe("tryResolveTopologyForHandoff — resolved descriptor", () => {
  beforeEach(() => {
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });
  afterEach(restoreEnv);

  it("cc-main-agent-subagent resolves to descriptor with 6 static attributes", () => {
    process.env.CLAUDECODE = "1";
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    expect(descriptor).not.toBeNull();
    expect(descriptor!.id).toBe("cc-main-agent-subagent");
    expect(descriptor!.teamlead_location).toBe("onto-main");
    expect(descriptor!.lens_spawn_mechanism).toBe("claude-agent-tool");
    expect(descriptor!.max_concurrent_lenses).toBe(10);
    expect(descriptor!.transport_rank).toBe("S2");
    expect(descriptor!.deliberation_channel).toBe("synthesizer-only");
  });

  it("cc-teams-lens-agent-deliberation resolves when triple opt-in met", () => {
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    // P9.1 (2026-04-21): deliberation topology is selected through the
    // `config.review` axis block (`lens_deliberation: sendmessage-a2a`),
    // not via the retired priority ladder. `execution_topology_priority`
    // is retained purely to satisfy the P9.3-scope gate inside
    // `tryResolveTopologyForHandoff`; its contents are ignored by the
    // resolver.
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: ["cc-teams-lens-agent-deliberation"],
      review: {
        subagent: { provider: "main-native" },
        lens_deliberation: "sendmessage-a2a",
      },
      lens_agent_teams_mode: true,
    });
    expect(descriptor).not.toBeNull();
    expect(descriptor!.id).toBe("cc-teams-lens-agent-deliberation");
    expect(descriptor!.deliberation_channel).toBe("sendmessage-a2a");
    expect(descriptor!.lens_spawn_mechanism).toBe("claude-teamcreate-member");
  });

  it("descriptor does NOT include plan_trace (compact handoff JSON)", () => {
    process.env.CLAUDECODE = "1";
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    expect(descriptor).not.toBeNull();
    expect(Object.keys(descriptor!)).not.toContain("plan_trace");
  });

  it("descriptor is JSON round-trip stable", () => {
    process.env.CLAUDECODE = "1";
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: ["cc-main-agent-subagent"],
    });
    const json = JSON.stringify(descriptor);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(descriptor);
  });

  it("legacy execution_topology_priority is ignored (P9.1); axis block decides", () => {
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    // Pre-P9.1 this legacy array would have been walked and
    // `cc-teams-agent-subagent` selected ahead of cc-main-agent-subagent.
    // After P9.1 the ladder is retired; absent `config.review`, the
    // resolver takes the main_native degrade path. Coexisting legacy
    // field is acknowledged but has no runtime effect.
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: [
        "cc-teams-agent-subagent",
        "cc-main-agent-subagent",
      ],
    });
    expect(descriptor!.id).toBe("cc-main-agent-subagent");
  });

  it("unknown id in legacy priority field does not crash descriptor resolution", () => {
    process.env.CLAUDECODE = "1";
    // P9.1: legacy priority is ignored regardless of contents. Previously
    // the normalization step would warn-and-skip unknown ids; the new
    // invariant is simpler — the array itself is a no-op.
    const descriptor = tryResolveTopologyForHandoff({
      execution_topology_priority: [
        "typo-unknown" as never,
        "cc-main-agent-subagent",
      ],
    });
    expect(descriptor!.id).toBe("cc-main-agent-subagent");
  });
});
