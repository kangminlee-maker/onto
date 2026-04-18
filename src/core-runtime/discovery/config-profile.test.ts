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
// Atomic profile adoption invariants — Review Recovery PR-1 addendum
// ---------------------------------------------------------------------------
//
// These tests assert three invariants:
//
//   (1) Completeness is a provider-aware check — claude/codex are self-
//       sufficient, anthropic/openai need a model, litellm needs a model
//       AND a base_url, standalone re-routes to an inner provider.
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

describe("validateProfileCompleteness — per provider", () => {
  it("host=claude → complete (host session provides model)", () => {
    const v = validateProfileCompleteness({ host_runtime: "claude" });
    expect(v.complete).toBe(true);
    expect(v.touched).toBe(true);
  });

  it("host=codex → complete (codex CLI picks default)", () => {
    const v = validateProfileCompleteness({ host_runtime: "codex" });
    expect(v.complete).toBe(true);
  });

  it("host=anthropic without model → incomplete with specific reason", () => {
    const v = validateProfileCompleteness({ host_runtime: "anthropic" });
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(true);
    expect(v.reasons[0]).toContain("anthropic.model");
  });

  it("host=anthropic + anthropic.model → complete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "anthropic",
      anthropic: { model: "claude-haiku-4-5" },
    });
    expect(v.complete).toBe(true);
  });

  it("host=anthropic + top-level model → complete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "anthropic",
      model: "claude-sonnet-4-6",
    });
    expect(v.complete).toBe(true);
  });

  it("host=litellm missing base_url → incomplete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "litellm",
      litellm: { model: "llama-8b" },
    });
    expect(v.complete).toBe(false);
    expect(v.reasons.some((r) => r.includes("llm_base_url"))).toBe(true);
  });

  it("host=litellm + model + base_url → complete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "litellm",
      litellm: { model: "llama-8b" },
      llm_base_url: "http://localhost:4000",
    });
    expect(v.complete).toBe(true);
  });

  it("host=standalone without provider → incomplete", () => {
    const v = validateProfileCompleteness({ host_runtime: "standalone" });
    expect(v.complete).toBe(false);
    expect(
      v.reasons.some((r) => r.includes("external_http_provider")),
    ).toBe(true);
  });

  it("host=standalone + external_http_provider=anthropic + model → complete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "standalone",
      external_http_provider: "anthropic",
      anthropic: { model: "claude-haiku-4-5" },
    });
    expect(v.complete).toBe(true);
  });

  it("host=standalone + external_http_provider=litellm + model + base_url → complete", () => {
    const v = validateProfileCompleteness({
      host_runtime: "standalone",
      external_http_provider: "litellm",
      litellm: { model: "llama-8b" },
      llm_base_url: "http://localhost:4000",
    });
    expect(v.complete).toBe(true);
  });

  it("host not set but other profile field touched → incomplete", () => {
    const v = validateProfileCompleteness({
      model: "gpt-5.4", // touches profile without host
    });
    expect(v.complete).toBe(false);
    expect(v.touched).toBe(true);
    expect(v.reasons[0]).toContain("host_runtime");
  });

  it("unknown host_runtime value → incomplete with allowlist", () => {
    const v = validateProfileCompleteness({
      host_runtime: "mystery" as string,
    });
    expect(v.complete).toBe(false);
    expect(v.reasons[0]).toContain("인식되지 않는");
  });
});

// ─── extractProfileFields ───

describe("extractProfileFields", () => {
  it("returns only profile fields, not orthogonal", () => {
    // PR-K: use raw Record to allow legacy `host_runtime` field which is
    // no longer in the OntoConfig type post-removal.
    const cfg: Record<string, unknown> = {
      host_runtime: "anthropic",
      anthropic: { model: "claude-haiku-4-5" },
      output_language: "ko", // orthogonal
      domains: ["se"], // orthogonal
      review_mode: "full", // orthogonal
      reasoning_effort: "high", // profile
    };
    const extracted = extractProfileFields(cfg);
    expect(extracted.host_runtime).toBe("anthropic");
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

function buildArgs(
  home: OntoConfig | Record<string, unknown>,
  project: OntoConfig | Record<string, unknown>,
) {
  return { home, project, homePath: HOME_PATH, projectPath: PROJECT_PATH, sameRoot: false };
}

describe("adoptProfile — 6 decision branches", () => {
  it("Case 1: project complete → source=project, no notice", () => {
    const adoption = adoptProfile(
      buildArgs(
        { host_runtime: "codex", model: "gpt-5.4", reasoning_effort: "high" },
        { host_runtime: "anthropic", anthropic: { model: "claude-haiku-4-5" } },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.source_path).toBe(PROJECT_PATH);
    expect(adoption.notice).toBeUndefined();
    expect(adoption.profile.host_runtime).toBe("anthropic");
    // Crucially: home's codex-flavored fields must NOT appear.
    expect(adoption.profile.model).toBeUndefined();
    expect(adoption.profile.reasoning_effort).toBeUndefined();
  });

  it("Case 2: project touched-but-incomplete + home complete → source=global, notice emitted", () => {
    const adoption = adoptProfile(
      buildArgs(
        { host_runtime: "codex", model: "gpt-5.4", reasoning_effort: "high" },
        { host_runtime: "anthropic" /* missing model */ },
      ),
    );
    expect(adoption.source).toBe("global");
    expect(adoption.source_path).toBe(HOME_PATH);
    expect(adoption.notice).toBeDefined();
    expect(adoption.notice).toContain("Project config 가 불완전");
    expect(adoption.notice).toContain(PROJECT_PATH);
    expect(adoption.notice).toContain(HOME_PATH);
    expect(adoption.notice).toContain("anthropic.model");
    // Adopted profile is from HOME atomically
    expect(adoption.profile.host_runtime).toBe("codex");
    expect(adoption.profile.model).toBe("gpt-5.4");
  });

  it("Case 3: project absent + home complete → source=global, no notice", () => {
    const adoption = adoptProfile(
      buildArgs(
        { host_runtime: "codex", codex: { model: "gpt-5.4" } },
        {}, // absent / empty
      ),
    );
    expect(adoption.source).toBe("global");
    expect(adoption.notice).toBeUndefined();
    expect(adoption.profile.host_runtime).toBe("codex");
  });

  it("Case 4: project complete + home incomplete → source=project (project owns)", () => {
    const adoption = adoptProfile(
      buildArgs(
        { host_runtime: "anthropic" /* missing model */ },
        { host_runtime: "codex" },
      ),
    );
    expect(adoption.source).toBe("project");
    expect(adoption.profile.host_runtime).toBe("codex");
    expect(adoption.notice).toBeUndefined();
  });

  it("Case 5: both incomplete → source=none (caller throws)", () => {
    const adoption = adoptProfile(
      buildArgs(
        { host_runtime: "anthropic" /* missing model */ },
        { host_runtime: "litellm" /* missing model AND base_url */ },
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
  it("includes all 4 canonical profile options + both paths + per-side reasons", () => {
    const err = buildBothIncompleteError(
      buildArgs({}, { host_runtime: "anthropic" }),
      { complete: false, touched: true, reasons: ["anthropic.model 없음"] },
      { complete: false, touched: false, reasons: [] },
    );
    const msg = err.message;
    expect(msg).toContain("Review profile 을 해소할 수 없습니다");
    expect(msg).toContain(PROJECT_PATH);
    expect(msg).toContain(HOME_PATH);
    expect(msg).toContain("anthropic.model 없음");
    expect(msg).toContain("파일이 없거나"); // for home untouched
    expect(msg).toContain("Option A — Anthropic");
    expect(msg).toContain("Option B — Codex");
    expect(msg).toContain("Option C — Claude Code");
    expect(msg).toContain("Option D — LiteLLM");
  });
});

// ─── mergeOrthogonalFields ───

describe("mergeOrthogonalFields", () => {
  it("last-wins for scalars (project over home)", () => {
    const merged = mergeOrthogonalFields(
      { output_language: "en", review_mode: "light" },
      { output_language: "ko" },
    );
    expect(merged.output_language).toBe("ko");
    expect(merged.review_mode).toBe("light");
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
      { host_runtime: "codex", model: "gpt-5.4", output_language: "ko" },
      { anthropic: { model: "claude-haiku-4-5" }, review_mode: "full" },
    );
    expect((merged as { host_runtime?: string }).host_runtime).toBeUndefined();
    expect((merged as { model?: string }).model).toBeUndefined();
    expect((merged as { anthropic?: unknown }).anthropic).toBeUndefined();
    expect(merged.output_language).toBe("ko");
    expect(merged.review_mode).toBe("full");
  });
});

// ─── Regression: the exact frankenstein from the user's actual state ───

describe("regression — real-world frankenstein scenario", () => {
  it("home=codex/gpt-5.4/subagent/high + project=anthropic/sonnet-4-6 → project owns, no codex orphans", () => {
    const adoption = adoptProfile(
      buildArgs(
        {
          host_runtime: "codex",
          execution_realization: "subagent",
          model: "gpt-5.4",
          review_mode: "full",
          reasoning_effort: "high",
          output_language: "ko",
        } as OntoConfig,
        {
          host_runtime: "anthropic",
          anthropic: { model: "claude-sonnet-4-6" },
        },
      ),
    );
    expect(adoption.source).toBe("project");
    // Profile slice from project only
    expect(adoption.profile.host_runtime).toBe("anthropic");
    expect(adoption.profile.anthropic?.model).toBe("claude-sonnet-4-6");
    // NO codex-era orphans
    expect(adoption.profile.execution_realization).toBeUndefined();
    expect(adoption.profile.model).toBeUndefined();
    expect(adoption.profile.reasoning_effort).toBeUndefined();
  });
});
