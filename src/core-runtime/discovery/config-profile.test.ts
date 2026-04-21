import { describe, it, expect } from "vitest";
import type { OntoConfig } from "./config-chain.js";
import {
  adoptProfile,
  buildBothIncompleteError,
  extractProfileFields,
  mergeOrthogonalFields,
  validateProfileCompleteness,
} from "./config-profile.js";

// ---------------------------------------------------------------------------
// Atomic profile adoption invariants — Review Recovery PR-1 addendum (post-PR-K).
// ---------------------------------------------------------------------------
//
// These tests assert three invariants:
//
//   (1) Completeness hinges on `execution_topology_priority`. Principals who
//       have migrated to sketch v3 are "complete" at the adoption layer;
//       per-provider compatibility validation moves to
//       `execution-topology-resolver.ts` and the executor spawn path.
//
//   (2) Adoption is atomic — one source owns the full profile slice.
//       No frankenstein merges where profile fields from different sources
//       coexist in the adopted result.
//
//   (3) Incompleteness on the project side is NEVER silent — either a
//       STDERR notice is produced (when home can cover) or a fail-fast
//       setup guide is thrown (when home also cannot cover).
// ---------------------------------------------------------------------------

// ─── validateProfileCompleteness ───

describe("validateProfileCompleteness — untouched", () => {
  it("empty config → not complete, not touched", () => {
    const v = validateProfileCompleteness({});
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(false);
    expect(v.reasons).toEqual([]);
  });

  it("only orthogonal fields set → not complete, not touched", () => {
    const v = validateProfileCompleteness({
      output_language: "ko",
      review_mode: "full",
      domains: ["se"],
    });
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(false);
  });
});

describe("validateProfileCompleteness — review block is the canonical signal (P9.2)", () => {
  it("review block set → complete, touched", () => {
    const v = validateProfileCompleteness({
      review: { subagent: { provider: "main-native" } },
    });
    expect(v.complete).toBe(true);
    expect(v.touched).toBe(true);
    expect(v.reasons).toEqual([]);
  });

  it("review block + per-provider block → complete (topology resolver validates at runtime)", () => {
    const v = validateProfileCompleteness({
      review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
      codex: { model: "gpt-5.4", effort: "high" },
    });
    expect(v.complete).toBe(true);
  });

  it("review block + litellm block → complete", () => {
    const v = validateProfileCompleteness({
      review: { subagent: { provider: "litellm", model_id: "llama-8b" } },
      litellm: { model: "llama-8b" },
      llm_base_url: "http://localhost:4000",
    });
    expect(v.complete).toBe(true);
  });

  it("review absent → falls through to per-profile check", () => {
    const v = validateProfileCompleteness({});
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(false);
  });
});

describe("validateProfileCompleteness — profile fields without review block", () => {
  it("per-provider block touched but no review block → incomplete with migration hint", () => {
    const v = validateProfileCompleteness({
      codex: { model: "gpt-5.4" },
    });
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(true);
    expect(v.reasons[0]).toContain("`review:` axis block");
    expect(v.reasons[0]).toContain("migration");
  });

  it("model field touched but nothing else → incomplete with migration hint", () => {
    const v = validateProfileCompleteness({
      model: "gpt-5.4",
    });
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(true);
    expect(v.reasons[0]).toContain("`review:` axis block");
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

// ─── adoptProfile — decision table ───

const HOME_PATH = "/home/.onto/config.yml";
const PROJECT_PATH = "/project/.onto/config.yml";

function buildArgs(home: OntoConfig, project: OntoConfig) {
  return { home, project, homePath: HOME_PATH, projectPath: PROJECT_PATH, sameRoot: false };
}

describe("adoptProfile — decision branches", () => {
  it("Case 1: project complete via review block → source=project, no notice", () => {
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
    expect(adoption.notice).toBeUndefined();
    expect(adoption.profile.anthropic).toEqual({ model: "claude-haiku-4-5" });
    // Crucially: home's codex-flavored fields must NOT appear.
    expect((adoption.profile as { reasoning_effort?: string }).reasoning_effort).toBeUndefined();
    expect(adoption.profile.codex).toBeUndefined();
  });

  it("Case 2: project touched-but-incomplete + home complete → source=global, notice emitted", () => {
    const adoption = adoptProfile(
      buildArgs(
        {
          review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
          codex: { model: "gpt-5.4" },
        },
        { anthropic: { model: "claude-haiku-4-5" } /* missing review block */ },
      ),
    );
    expect(adoption.source).toBe("global");
    expect(adoption.source_path).toBe(HOME_PATH);
    expect(adoption.notice).toBeDefined();
    expect(adoption.notice).toContain("Project config 가 불완전");
    expect(adoption.notice).toContain(PROJECT_PATH);
    expect(adoption.notice).toContain(HOME_PATH);
    expect(adoption.notice).toContain("`review:` axis block");
    // Adopted profile is from HOME atomically
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4" });
    // Home's review block is orthogonal, NOT part of the profile slice.
    expect(adoption.profile.review).toBeUndefined();
  });

  it("Case 3: project absent + home complete → source=global, no notice", () => {
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
    expect(adoption.notice).toBeUndefined();
    expect(adoption.profile.codex).toEqual({ model: "gpt-5.4" });
  });

  it("Case 4: project complete + home incomplete → source=project (project owns)", () => {
    const adoption = adoptProfile(
      buildArgs(
        { anthropic: { model: "claude-haiku-4-5" } /* touched, no review block */ },
        { review: { subagent: { provider: "codex", model_id: "gpt-5.4" } } },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.notice).toBeUndefined();
  });

  it("Case 5: both incomplete → source=none (caller throws)", () => {
    const adoption = adoptProfile(
      buildArgs(
        { anthropic: { model: "claude-haiku-4-5" } /* missing review block */ },
        { litellm: { model: "llama-8b" } /* missing review block */ },
      ),
    );
    expect(adoption.source).toBe("none");
    expect(adoption.source_path).toBeNull();
    expect(adoption.project_validation.complete).toBe(false);
    expect(adoption.home_validation.complete).toBe(false);
  });

  it("Case 6: both absent → source=none", () => {
    const adoption = adoptProfile(buildArgs({}, {}));
    expect(adoption.source).toBe("none");
  });
});

// ─── buildBothIncompleteError ───

describe("buildBothIncompleteError", () => {
  it("includes all 4 canonical topology options + both paths + per-side reasons + migration guide", () => {
    const err = buildBothIncompleteError(
      buildArgs({}, { anthropic: { model: "claude-haiku-4-5" } }),
      { complete: false, touched: true, reasons: ["`review:` axis block 이 없음"] },
      { complete: false, touched: false, reasons: [] },
    );
    const msg = err.message;
    expect(msg).toContain("Review profile 을 해소할 수 없습니다");
    expect(msg).toContain(PROJECT_PATH);
    expect(msg).toContain(HOME_PATH);
    expect(msg).toContain("`review:` axis block 이 없음");
    expect(msg).toContain("파일이 없거나"); // for home untouched
    expect(msg).toContain("topology-migration-guide.md");
    expect(msg).toContain("Option A — Codex");
    expect(msg).toContain("Option B — Claude Code Agent");
    expect(msg).toContain("Option C — Claude Code TeamCreate");
    expect(msg).toContain("Option D — LiteLLM");
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

  it("passes review block through as orthogonal (P9.2 — was execution_topology_priority pre-removal)", () => {
    const merged = mergeOrthogonalFields(
      { review: { subagent: { provider: "codex", model_id: "gpt-5.4" } } },
      { review: { subagent: { provider: "main-native" } } },
    );
    // Last-wins: project overrides home.
    expect(merged.review).toEqual({ subagent: { provider: "main-native" } });
  });
});

// ─── Regression: post-PR-K migrated config should be adoptable ───

describe("regression — migrated Review UX Redesign config", () => {
  it("project declares review block + codex block → project owns without host_runtime", () => {
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
