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

  it("no config.review block → null (opt-in gate blocks descriptor)", () => {
    // P9.2 (2026-04-21): opt-in gate switched from `execution_topology_priority`
    // (removed) to `config.review` presence.
    expect(tryResolveTopologyForHandoff({})).toBeNull();
  });

  it("undefined ontoConfig → null", () => {
    expect(tryResolveTopologyForHandoff(undefined)).toBeNull();
  });

  it("empty `review: {}` does NOT activate opt-in (PR #162 self-review M2)", () => {
    // Regression guard: an accidentally-empty review block (YAML author
    // wrote `review:` and forgot the body) must NOT be treated as
    // opt-in. `hasReviewBlock` rejects zero-key objects.
    process.env.CLAUDECODE = "1";
    expect(
      tryResolveTopologyForHandoff({ review: {} as never }),
    ).toBeNull();
  });

  it("review block set but no signal matches → null (no_host)", () => {
    // No CLAUDECODE, no experimental flag, no codex, no litellm.
    expect(
      tryResolveTopologyForHandoff({
        review: {
          subagent: { provider: "codex", model_id: "gpt-5.4" },
        },
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
      review: { subagent: { provider: "main-native" } },
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
    // P9.2 (2026-04-21): deliberation topology is selected through the
    // `config.review` axis block (`lens_deliberation: sendmessage-a2a`)
    // + `lens_agent_teams_mode: true` double opt-in.
    const descriptor = tryResolveTopologyForHandoff({
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
      review: { subagent: { provider: "main-native" } },
    });
    expect(descriptor).not.toBeNull();
    expect(Object.keys(descriptor!)).not.toContain("plan_trace");
  });

  it("descriptor is JSON round-trip stable", () => {
    process.env.CLAUDECODE = "1";
    const descriptor = tryResolveTopologyForHandoff({
      review: { subagent: { provider: "main-native" } },
    });
    const json = JSON.stringify(descriptor);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(descriptor);
  });
});
