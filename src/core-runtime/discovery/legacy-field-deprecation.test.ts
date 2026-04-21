import { describe, expect, it } from "vitest";
import type { OntoConfig } from "./config-chain.js";
import {
  LEGACY_PROFILE_FIELDS,
  LegacyFieldRemovedError,
  checkAndEmitLegacyDeprecation,
  detectLegacyFieldUsage,
  emitLegacyFieldDeprecation,
} from "./legacy-field-deprecation.js";

// ---------------------------------------------------------------------------
// These tests assert PR-E migration invariants (updated P9.2, 2026-04-21):
//
// (1) Legacy field detection is limited to the catalog set and only
//     triggers on non-empty string values.
// (2) Deprecation error is silent when the new `review:` axis block is
//     set OR nothing legacy is used. (Pre-P9.2 signal was
//     `execution_topology_priority`; after field removal the axis block
//     is the canonical migration marker.)
// (3) When the error fires, every detected legacy field gets a line with
//     a topology suggestion + migration guide pointer.
// ---------------------------------------------------------------------------

describe("LEGACY_PROFILE_FIELDS", () => {
  it("lists exactly the 5 legacy provider-profile fields", () => {
    expect([...LEGACY_PROFILE_FIELDS]).toEqual([
      "host_runtime",
      "execution_realization",
      "execution_mode",
      "executor_realization",
      "api_provider",
    ]);
  });
});

// ---------------------------------------------------------------------------
// detectLegacyFieldUsage
// ---------------------------------------------------------------------------

describe("detectLegacyFieldUsage", () => {
  it("empty config detects nothing", () => {
    const d = detectLegacyFieldUsage({});
    expect(d.detected).toEqual([]);
    expect(d.review_block_set).toBe(false);
  });

  it("detects host_runtime alone", () => {
    const d = detectLegacyFieldUsage({ host_runtime: "codex" });
    expect(d.detected).toEqual(["host_runtime"]);
  });

  it("detects multiple legacy fields in catalog order", () => {
    const d = detectLegacyFieldUsage({
      host_runtime: "anthropic",
      execution_realization: "subagent",
      api_provider: "anthropic",
    });
    expect(d.detected).toEqual(["host_runtime", "execution_realization", "api_provider"]);
  });

  it("empty strings do not count as presence", () => {
    const d = detectLegacyFieldUsage({ host_runtime: "" });
    expect(d.detected).toEqual([]);
  });

  it("review_block_set true when config.review is a non-null object", () => {
    const d = detectLegacyFieldUsage({
      review: { subagent: { provider: "main-native" } },
    });
    expect(d.review_block_set).toBe(true);
  });

  it("review_block_set false when config.review is absent", () => {
    const d = detectLegacyFieldUsage({});
    expect(d.review_block_set).toBe(false);
  });

  it("review_block_set false when `review: {}` is empty (PR #162 self-review M2)", () => {
    // Regression guard: empty review block does NOT activate the
    // silent-bypass for legacy fields — they still throw.
    const d = detectLegacyFieldUsage({ review: {} as never });
    expect(d.review_block_set).toBe(false);
  });

  it("reports both legacy AND review-block presence (migrated principal retaining legacy for reference)", () => {
    const d = detectLegacyFieldUsage({
      host_runtime: "claude",
      review: { subagent: { provider: "main-native" } },
    });
    expect(d.detected).toEqual(["host_runtime"]);
    expect(d.review_block_set).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// emitLegacyFieldDeprecation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// emitLegacyFieldDeprecation (PR-J: now throws, formerly STDERR warning)
// ---------------------------------------------------------------------------

describe("emitLegacyFieldDeprecation (error stage)", () => {
  it("silent (no throw) when nothing detected", () => {
    expect(() =>
      emitLegacyFieldDeprecation({}, { detected: [], review_block_set: false }),
    ).not.toThrow();
  });

  it("silent (no throw) when review_block_set (migrated principal)", () => {
    expect(() =>
      emitLegacyFieldDeprecation(
        {
          host_runtime: "codex",
          review: { subagent: { provider: "codex", model_id: "gpt-5.4" } },
        },
        { detected: ["host_runtime"], review_block_set: true },
      ),
    ).not.toThrow();
  });

  it("throws LegacyFieldRemovedError when legacy used without review block", () => {
    expect(() =>
      emitLegacyFieldDeprecation(
        { host_runtime: "codex", api_provider: "codex" },
        { detected: ["host_runtime", "api_provider"], review_block_set: false },
      ),
    ).toThrow(LegacyFieldRemovedError);
  });

  it("error message includes per-field entries + suggestion", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "codex", api_provider: "codex" },
        { detected: ["host_runtime", "api_provider"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(LegacyFieldRemovedError);
      const msg = (err as Error).message;
      expect(msg).toContain("[onto:legacy-removed]");
      expect(msg).toContain("host_runtime=codex");
      expect(msg).toContain("api_provider=codex");
    }
  });

  it("suggests cc-main-codex-subprocess for host_runtime=codex", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "codex" },
        { detected: ["host_runtime"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("cc-main-codex-subprocess");
    }
  });

  it("suggests cc-main-agent-subagent for host_runtime=claude", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "claude" },
        { detected: ["host_runtime"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("cc-main-agent-subagent");
    }
  });

  it("error message points to the migration guide", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "codex" },
        { detected: ["host_runtime"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("docs/topology-migration-guide.md");
    }
  });

  it("LegacyFieldRemovedError exposes detected + suggestions for programmatic handlers", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "codex", api_provider: "openai" },
        { detected: ["host_runtime", "api_provider"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      const e = err as LegacyFieldRemovedError;
      expect(e.detected).toEqual(["host_runtime", "api_provider"]);
      expect(e.suggestions.length).toBe(2);
      expect(e.suggestions[0]!.field).toBe("host_runtime");
      expect(e.suggestions[0]!.suggestion).toContain("cc-main-codex-subprocess");
    }
  });

  it("legacy standalone + anthropic is still structured in the thrown message", () => {
    try {
      emitLegacyFieldDeprecation(
        { host_runtime: "anthropic" },
        { detected: ["host_runtime"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("host_runtime=anthropic");
      expect(msg.toLowerCase()).toMatch(/legacy http|canonical topology 없음/);
    }
  });

  it("executor_realization=codex triggers throw with cc-main-codex-subprocess suggestion", () => {
    try {
      emitLegacyFieldDeprecation(
        { executor_realization: "codex" },
        { detected: ["executor_realization"], review_block_set: false },
      );
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).message).toContain("cc-main-codex-subprocess");
    }
  });
});

// ---------------------------------------------------------------------------
// checkAndEmitLegacyDeprecation — convenience wrapper
// ---------------------------------------------------------------------------

describe("checkAndEmitLegacyDeprecation (error stage)", () => {
  it("throws when legacy used without topology priority", () => {
    expect(() => checkAndEmitLegacyDeprecation({ host_runtime: "codex" })).toThrow(
      LegacyFieldRemovedError,
    );
  });

  it("returns detection silently when review block is set (migrated)", () => {
    const detection = checkAndEmitLegacyDeprecation({
      host_runtime: "claude",
      api_provider: "anthropic",
      review: { subagent: { provider: "main-native" } },
    });
    expect(detection.detected).toEqual(["host_runtime", "api_provider"]);
    expect(detection.review_block_set).toBe(true);
  });

  it("clean config returns empty detection without throwing", () => {
    const detection = checkAndEmitLegacyDeprecation({});
    expect(detection.detected).toEqual([]);
    expect(detection.review_block_set).toBe(false);
  });
});
