import { describe, it, expect } from "vitest";
import type { OntoConfig } from "./config-chain.js";
import {
  adoptProfile,
  extractProfileFields,
  hasAnyProfileField,
  hasReviewBlock,
  mergeOrthogonalFields,
  summarizeProfile,
} from "./config-profile.js";

// ---------------------------------------------------------------------------
// Atomic profile adoption invariants (post-P9.4, 2026-04-21).
// ---------------------------------------------------------------------------
//
// These tests assert two invariants:
//
//   (1) Ownership is atomic — one source owns the full profile slice.
//       No frankenstein merges where profile fields from different
//       sources coexist in the adopted result.
//
//   (2) The adoption layer does NOT decide whether a profile is "runnable".
//       Empty profiles and single-side-only profiles both return cleanly;
//       the topology resolver's universal `main_native` degrade owns the
//       "no viable host" fail-fast (P9.3).
// ---------------------------------------------------------------------------

// ─── hasAnyProfileField ───

describe("hasAnyProfileField", () => {
  it("empty config → false", () => {
    expect(hasAnyProfileField({})).toBe(false);
  });

  it("only orthogonal fields → false", () => {
    expect(
      hasAnyProfileField({
        output_language: "ko",
        review_mode: "full",
        domains: ["se"],
      }),
    ).toBe(false);
  });

  it("per-provider block set → true", () => {
    expect(hasAnyProfileField({ codex: { model: "gpt-5.4" } })).toBe(true);
  });

  it("top-level model set → true", () => {
    expect(hasAnyProfileField({ model: "gpt-5.4" })).toBe(true);
  });

  it("empty per-provider block (e.g. `codex: {}`) → false", () => {
    // YAML authors who wrote `codex:` without a body should not flip
    // profile ownership.
    expect(hasAnyProfileField({ codex: {} as never })).toBe(false);
  });
});

// ─── hasReviewBlock (surviving legacy-bypass SSOT) ───

describe("hasReviewBlock", () => {
  it("undefined / empty → false", () => {
    expect(hasReviewBlock(undefined)).toBe(false);
    expect(hasReviewBlock({})).toBe(false);
  });

  it("review block with one key → true", () => {
    expect(
      hasReviewBlock({
        review: { subagent: { provider: "main-native" } },
      }),
    ).toBe(true);
  });

  it("empty `review: {}` → false (prevents accidental opt-in)", () => {
    expect(hasReviewBlock({ review: {} as never })).toBe(false);
  });
});

// ─── extractProfileFields ───

describe("extractProfileFields", () => {
  it("returns only profile fields, not orthogonal", () => {
    const cfg: OntoConfig = {
      anthropic: { model: "claude-haiku-4-5" },
      reasoning_effort: "high",
      output_language: "ko", // orthogonal
      domains: ["se"], // orthogonal
      review_mode: "full", // orthogonal
    };
    const extracted = extractProfileFields(cfg);
    expect(extracted.anthropic).toEqual({ model: "claude-haiku-4-5" });
    expect(extracted.reasoning_effort).toBe("high");
    expect((extracted as { output_language?: string }).output_language).toBeUndefined();
    expect((extracted as { domains?: string[] }).domains).toBeUndefined();
    expect((extracted as { review_mode?: string }).review_mode).toBeUndefined();
  });
});

// ─── adoptProfile — decision table (post-P9.4) ───

const HOME_PATH = "/home/.onto/config.yml";
const PROJECT_PATH = "/project/.onto/config.yml";

function buildArgs(home: OntoConfig, project: OntoConfig) {
  return { home, project, homePath: HOME_PATH, projectPath: PROJECT_PATH, sameRoot: false };
}

describe("adoptProfile — decision branches", () => {
  it("project has profile → source=project", () => {
    const adoption = adoptProfile(
      buildArgs(
        {
          review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
          codex: { model: "gpt-5.4" },
          reasoning_effort: "high",
        },
        {
          review: { subagent: { provider: "main-native" } },
          anthropic: { model: "claude-haiku-4-5" },
        },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.source_path).toBe(PROJECT_PATH);
    expect(adoption.profile.anthropic).toEqual({ model: "claude-haiku-4-5" });
    // Atomic ownership invariant: home's codex-flavored fields must NOT appear.
    expect((adoption.profile as { reasoning_effort?: string }).reasoning_effort).toBeUndefined();
    expect(adoption.profile.codex).toBeUndefined();
  });

  it("project has ONLY review block (no profile fields) → source=project (ownership claimed)", () => {
    // P9.4 invariant: a non-empty `review:` axis block alone signals
    // profile ownership even without any PROFILE_FIELDS. This preserves
    // B-5 class behaviour where a project declares `review:` + empty
    // `codex: {}` and expects the codex namespace slot to survive
    // adoption (belonging to the project, not inherited from home).
    const adoption = adoptProfile(
      buildArgs(
        {
          review: { subagent: { provider: "main-native" } },
          anthropic: { model: "claude-haiku-4-5" },
        },
        {
          review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
          codex: {} as never, // empty namespace — not counted by hasAnyProfileField,
          // but the review block still claims ownership.
        },
      ),
    );
    expect(adoption.source).toBe("project");
    // Home's anthropic namespace MUST NOT leak into the adopted profile.
    expect(adoption.profile.anthropic).toBeUndefined();
  });

  it("project has profile without review block → still source=project", () => {
    // P9.4 change: a project with only a `codex:` namespace (no `review:`
    // axis block) now owns the profile. Previously this was treated as
    // "touched-but-incomplete" and deferred to home.
    const adoption = adoptProfile(
      buildArgs(
        {
          review: { subagent: { provider: "main-native" } },
          anthropic: { model: "claude-haiku-4-5" },
        },
        { codex: { model: "gpt-5.4" } /* no review block */ },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4" });
    expect(adoption.profile.anthropic).toBeUndefined();
  });

  it("project has no profile fields, home has → source=global", () => {
    const adoption = adoptProfile(
      buildArgs(
        {
          review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
          codex: { model: "gpt-5.4" },
        },
        {}, // absent / empty
      ),
    );
    expect(adoption.source).toBe("global");
    expect(adoption.source_path).toBe(HOME_PATH);
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4" });
  });

  it("project has no profile, home has only orthogonal fields → source=none", () => {
    const adoption = adoptProfile(
      buildArgs({ output_language: "ko" /* orthogonal only */ }, {}),
    );
    expect(adoption.source).toBe("none");
    expect(adoption.source_path).toBeNull();
    expect(adoption.profile).toEqual({});
  });

  it("both absent → source=none (no throw — resolver handles it)", () => {
    const adoption = adoptProfile(buildArgs({}, {}));
    expect(adoption.source).toBe("none");
    expect(adoption.profile).toEqual({});
  });

  it("sameRoot + home has profile → source=global", () => {
    const adoption = adoptProfile({
      home: {
        review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
        codex: { model: "gpt-5.4" },
      },
      // sameRoot: project is the same as home, so same object content.
      project: {
        review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
        codex: { model: "gpt-5.4" },
      },
      homePath: HOME_PATH,
      projectPath: PROJECT_PATH,
      sameRoot: true,
    });
    expect(adoption.source).toBe("global");
    expect(adoption.source_path).toBe(HOME_PATH);
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4" });
  });

  it("sameRoot + no profile → source=none", () => {
    const adoption = adoptProfile({
      home: {},
      project: {},
      homePath: HOME_PATH,
      projectPath: PROJECT_PATH,
      sameRoot: true,
    });
    expect(adoption.source).toBe("none");
    expect(adoption.profile).toEqual({});
  });
});

// ─── summarizeProfile ───

describe("summarizeProfile", () => {
  it("renders review=[subagent=<provider>] when the axis block declares subagent", () => {
    const summary = summarizeProfile({
      review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
      codex: { model: "gpt-5.4" },
    });
    expect(summary).toContain("review=[subagent=codex]");
    expect(summary).toContain("model=gpt-5.4");
  });

  it("renders review=[subagent=(default)] when review block has no subagent", () => {
    const summary = summarizeProfile({
      review: { teamlead: { model: "main" } },
    });
    expect(summary).toContain("review=[subagent=(default)]");
  });

  it("returns null when nothing profile-ish is declared", () => {
    expect(summarizeProfile({})).toBeNull();
  });
});

// ─── mergeOrthogonalFields ───

describe("mergeOrthogonalFields", () => {
  it("last-wins for scalars (project over home)", () => {
    const merged = mergeOrthogonalFields(
      { output_language: "en", review_mode: "core-axis" },
      { output_language: "ko" },
    );
    expect(merged.output_language).toBe("ko");
    expect(merged.review_mode).toBe("core-axis");
  });

  it("union-merges excluded_names", () => {
    const merged = mergeOrthogonalFields(
      { excluded_names: ["node_modules", ".git"] },
      { excluded_names: [".git", "dist"] },
    );
    expect(merged.excluded_names).toEqual(
      expect.arrayContaining(["node_modules", ".git", "dist"]),
    );
    expect(merged.excluded_names?.length).toBe(3);
  });

  it("drops profile fields entirely", () => {
    const merged = mergeOrthogonalFields(
      { codex: { model: "gpt-5.4" }, output_language: "ko" },
      { anthropic: { model: "claude-haiku-4-5" }, review_mode: "full" },
    );
    expect((merged as { codex?: unknown }).codex).toBeUndefined();
    expect((merged as { anthropic?: unknown }).anthropic).toBeUndefined();
    expect(merged.output_language).toBe("ko");
    expect(merged.review_mode).toBe("full");
  });

  it("passes review block through as orthogonal", () => {
    const merged = mergeOrthogonalFields(
      { review: { subagent: { provider: "codex", model_id: "gpt-5.4" } } },
      { review: { subagent: { provider: "main-native" } } },
    );
    // Last-wins: project overrides home.
    expect(merged.review).toEqual({ subagent: { provider: "main-native" } });
  });
});

// ─── Regression: migrated Review UX Redesign config ───

describe("regression — migrated Review UX Redesign config", () => {
  it("project declares review block + codex block → project owns", () => {
    const adoption = adoptProfile(
      buildArgs(
        {}, // empty global
        {
          review: {
            subagent: { provider: "codex", model_id: "gpt-5.4", effort: "medium" },
          },
          codex: { model: "gpt-5.4", effort: "medium" },
          review_mode: "core-axis",
        },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4", effort: "medium" });
  });
});
