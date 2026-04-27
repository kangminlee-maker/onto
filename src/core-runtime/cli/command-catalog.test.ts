/**
 * Command Catalog tests (Phase 1 P1-1a, 2026-04-23)
 *
 * Coverage: every invariant declared in design doc §4.3 + §4.5 +
 * normalized invocation set behavior + bare-onto sentinel cases.
 *
 * Pattern: each invariant gets a happy-path case (real catalog passes)
 * and one or more failure cases via locally-constructed catalogs.
 */

import { describe, expect, it } from "vitest";
import {
  COMMAND_CATALOG,
  CURRENT_CATALOG_VERSION,
  type CatalogEntry,
  type CommandCatalog,
} from "./command-catalog.js";
import {
  assertCatalogVersionSupported,
  assertDeprecationLifecycle,
  assertDocTemplateIdUnique,
  assertEntryRealizationsNonEmpty,
  assertMetaNameRegistered,
  assertNoAliasCollision,
  assertNoRuntimeScriptCollision,
  assertPromptBodyRefInManagedTree,
  assertRepairPathPreboot,
  assertReservedNamespaceUnused,
  assertRuntimeScriptsReferenceExists,
  assertSuccessorReferenceExists,
  getNormalizedInvocationSet,
  validateCatalog,
} from "./command-catalog-helpers.js";

function makeCatalog(entries: CatalogEntry[]): CommandCatalog {
  return { version: 1, entries };
}

// ---------------------------------------------------------------------------
// Real catalog — happy path
// ---------------------------------------------------------------------------

describe("COMMAND_CATALOG (real catalog)", () => {
  it("passes all runtime-load invariants via validateCatalog", () => {
    expect(() => validateCatalog(COMMAND_CATALOG)).not.toThrow();
  });

  it("getNormalizedInvocationSet contains expected public + meta keys", () => {
    const set = getNormalizedInvocationSet(COMMAND_CATALOG);
    // Public — info (cli)
    expect(set.has("info")).toBe(true);
    // Public — review (slash + cli)
    expect(set.has("/onto:review")).toBe(true);
    expect(set.has("review")).toBe(true);
    // Public — feedback (slash only)
    expect(set.has("/onto:feedback")).toBe(true);
    // Meta — help / version
    expect(set.has("--help")).toBe(true);
    expect(set.has("-h")).toBe(true);
    expect(set.has("--version")).toBe(true);
    expect(set.has("-v")).toBe(true);
    // Bare onto sentinel — help has default_for: bare_onto
    expect(set.has("<<bare>>")).toBe(true);
  });

  it("RuntimeScriptEntry NOT in normalized invocation set", () => {
    const set = getNormalizedInvocationSet(COMMAND_CATALOG);
    expect(set.has("review:invoke")).toBe(false);
    expect(set.has("coordinator:start")).toBe(false);
    expect(set.has("onboard:detect-review-axes")).toBe(false);
  });

  // P1-1b expanded coverage
  it("has expected entry counts (P1-1b populated)", () => {
    const counts = { public: 0, runtime_script: 0, meta: 0 };
    for (const entry of COMMAND_CATALOG.entries) counts[entry.kind]++;
    expect(counts.public).toBe(20);
    expect(counts.runtime_script).toBe(25);
    expect(counts.meta).toBe(2);
  });

  it("includes deprecated legacy entries with valid lifecycle", () => {
    const deprecated = COMMAND_CATALOG.entries.filter(
      (e) => e.deprecated_since !== undefined,
    );
    const names = deprecated.map((e) =>
      e.kind === "public" ? e.identity : "name" in e ? e.name : "",
    );
    expect(names).toContain("reclassify-insights");
    expect(names).toContain("migrate-session-roots");
    expect(names).toContain("build");
  });

  it("repair_path commands (install, config) are preboot", () => {
    const repairPathEntries = COMMAND_CATALOG.entries.filter(
      (e) => e.kind === "public" && e.repair_path === true,
    );
    expect(repairPathEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of repairPathEntries) {
      if (entry.kind === "public") expect(entry.phase).toBe("preboot");
    }
  });

  it("nested slash commands use /onto:learn:* convention", () => {
    const set = getNormalizedInvocationSet(COMMAND_CATALOG);
    expect(set.has("/onto:learn:promote")).toBe(true);
    expect(set.has("/onto:learn:health")).toBe(true);
    expect(set.has("/onto:learn:promote-domain")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// catalog.version load gate
// ---------------------------------------------------------------------------

describe("assertCatalogVersionSupported", () => {
  it("passes when version matches CURRENT_CATALOG_VERSION", () => {
    const catalog: CommandCatalog = {
      version: CURRENT_CATALOG_VERSION,
      entries: [],
    };
    expect(() => assertCatalogVersionSupported(catalog)).not.toThrow();
  });

  it("throws actionable error when version mismatches", () => {
    // @ts-expect-error testing version=2 against runtime that supports 1
    const catalog: CommandCatalog = { version: 2, entries: [] };
    expect(() => assertCatalogVersionSupported(catalog)).toThrow(
      /Unsupported catalog\.version.*Resolution.*downgrade.*upgrade/s,
    );
  });
});

// ---------------------------------------------------------------------------
// Reserved namespace
// ---------------------------------------------------------------------------

describe("assertReservedNamespaceUnused", () => {
  it("throws when PublicEntry has invocation starting with <<", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "bad",
        phase: "post_boot",
        doc_template_id: "bad",
        description: "x",
        realizations: [
          {
            kind: "cli",
            invocation: "<<reserved",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertReservedNamespaceUnused(catalog)).toThrow(
      /Reserved namespace violation.*<<reserved/s,
    );
  });

  it("throws when MetaEntry has invocation starting with >>", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "help",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        description: "x",
        realizations: [{ kind: "long_flag", invocation: ">>weird" }],
      },
    ]);
    expect(() => assertReservedNamespaceUnused(catalog)).toThrow(
      /Reserved namespace violation.*>>weird/s,
    );
  });
});

// ---------------------------------------------------------------------------
// RuntimeScriptEntry name uniqueness
// ---------------------------------------------------------------------------

describe("assertNoRuntimeScriptCollision", () => {
  it("throws when two RuntimeScriptEntry have same name", () => {
    const catalog = makeCatalog([
      {
        kind: "runtime_script",
        name: "review:invoke",
        script_path: "src/foo.ts",
        invoker: "tsx",
        description: "x",
      },
      {
        kind: "runtime_script",
        name: "review:invoke",
        script_path: "src/bar.ts",
        invoker: "tsx",
        description: "y",
      },
    ]);
    expect(() => assertNoRuntimeScriptCollision(catalog)).toThrow(
      /RuntimeScriptEntry collision.*review:invoke/s,
    );
  });
});

// ---------------------------------------------------------------------------
// MetaEntry.name registry
// ---------------------------------------------------------------------------

describe("assertMetaNameRegistered", () => {
  it("throws when MetaEntry.name not in META_NAME_REGISTRY", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "ask",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        description: "x",
        realizations: [{ kind: "long_flag", invocation: "--ask" }],
      },
    ]);
    expect(() => assertMetaNameRegistered(catalog)).toThrow(
      /MetaEntry\.name "ask".*META_NAME_REGISTRY/s,
    );
  });
});

// ---------------------------------------------------------------------------
// successor reference
// ---------------------------------------------------------------------------

describe("assertSuccessorReferenceExists", () => {
  it("throws when successor points to nonexistent entry", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "old",
        phase: "post_boot",
        doc_template_id: "old",
        description: "x",
        deprecated_since: "0.1.0",
        successor: "nonexistent",
        realizations: [
          {
            kind: "cli",
            invocation: "old",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertSuccessorReferenceExists(catalog)).toThrow(
      /successor reference not found.*old.*nonexistent/s,
    );
  });

  it("passes when successor points to existing entry", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "old",
        phase: "post_boot",
        doc_template_id: "old",
        description: "x",
        deprecated_since: "0.1.0",
        successor: "new",
        realizations: [
          {
            kind: "cli",
            invocation: "old",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
      {
        kind: "public",
        identity: "new",
        phase: "post_boot",
        doc_template_id: "new",
        description: "y",
        realizations: [
          {
            kind: "cli",
            invocation: "new",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertSuccessorReferenceExists(catalog)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runtime_scripts reference
// ---------------------------------------------------------------------------

describe("assertRuntimeScriptsReferenceExists", () => {
  it("throws when PublicEntry references nonexistent runtime script", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "review",
        phase: "post_boot",
        doc_template_id: "review",
        description: "x",
        runtime_scripts: ["does-not-exist"],
        realizations: [
          {
            kind: "cli",
            invocation: "review",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertRuntimeScriptsReferenceExists(catalog)).toThrow(
      /runtime_scripts reference not found.*review.*does-not-exist/s,
    );
  });
});

// ---------------------------------------------------------------------------
// Deprecation lifecycle
// ---------------------------------------------------------------------------

describe("assertDeprecationLifecycle", () => {
  it("throws when removed_in present without deprecated_since", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "x",
        phase: "post_boot",
        doc_template_id: "x",
        description: "x",
        removed_in: "1.0.0",
        realizations: [
          {
            kind: "cli",
            invocation: "x",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertDeprecationLifecycle(catalog)).toThrow(
      /removed_in.*no deprecated_since/s,
    );
  });

  it("throws when removed_in <= deprecated_since", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "x",
        phase: "post_boot",
        doc_template_id: "x",
        description: "x",
        deprecated_since: "0.5.0",
        removed_in: "0.3.0",
        realizations: [
          {
            kind: "cli",
            invocation: "x",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertDeprecationLifecycle(catalog)).toThrow(
      /removed_in="0\.3\.0" must be > deprecated_since="0\.5\.0"/,
    );
  });

  it("passes when removed_in > deprecated_since", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "x",
        phase: "post_boot",
        doc_template_id: "x",
        description: "x",
        deprecated_since: "0.2.0",
        removed_in: "0.3.0",
        realizations: [
          {
            kind: "cli",
            invocation: "x",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertDeprecationLifecycle(catalog)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// repair_path → preboot
// ---------------------------------------------------------------------------

describe("assertRepairPathPreboot", () => {
  it("throws when repair_path: true but phase: post_boot", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "x",
        phase: "post_boot",
        doc_template_id: "x",
        description: "x",
        repair_path: true,
        realizations: [
          {
            kind: "cli",
            invocation: "x",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertRepairPathPreboot(catalog)).toThrow(
      /repair_path.*phase="post_boot".*requires phase="preboot"/s,
    );
  });

  it("passes when repair_path: true with phase: preboot", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "install",
        phase: "preboot",
        doc_template_id: "install",
        description: "x",
        repair_path: true,
        realizations: [
          {
            kind: "cli",
            invocation: "install",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertRepairPathPreboot(catalog)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Realizations non-empty
// ---------------------------------------------------------------------------

describe("assertEntryRealizationsNonEmpty", () => {
  it("throws when PublicEntry has empty realizations", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "x",
        phase: "post_boot",
        doc_template_id: "x",
        description: "x",
        realizations: [],
      },
    ]);
    expect(() => assertEntryRealizationsNonEmpty(catalog)).toThrow(
      /Empty realizations.*public.*x/s,
    );
  });

  it("throws when MetaEntry has empty realizations", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "help",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        description: "x",
        realizations: [],
      },
    ]);
    expect(() => assertEntryRealizationsNonEmpty(catalog)).toThrow(
      /Empty realizations.*meta.*help/s,
    );
  });
});

// ---------------------------------------------------------------------------
// Alias collision
// ---------------------------------------------------------------------------

describe("assertNoAliasCollision", () => {
  it("throws when two entries claim same alias", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "a",
        phase: "post_boot",
        doc_template_id: "a",
        description: "x",
        aliases: ["shared"],
        realizations: [
          {
            kind: "cli",
            invocation: "a",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
      {
        kind: "public",
        identity: "b",
        phase: "post_boot",
        doc_template_id: "b",
        description: "y",
        aliases: ["shared"],
        realizations: [
          {
            kind: "cli",
            invocation: "b",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertNoAliasCollision(catalog)).toThrow(
      /Alias collision.*shared.*a.*b/s,
    );
  });

  // P2-B (RFC-1 §4.2.2): alias ↔ 전체 invocation namespace cross-check.
  it("throws when alias collides with another entry's cli invocation", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "alpha",
        phase: "post_boot",
        doc_template_id: "alpha",
        description: "x",
        realizations: [
          {
            kind: "cli",
            invocation: "alpha",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
      {
        kind: "public",
        identity: "beta",
        phase: "post_boot",
        doc_template_id: "beta",
        description: "y",
        aliases: ["alpha"],  // ← collides with alpha entry's invocation
        realizations: [
          {
            kind: "cli",
            invocation: "beta",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => assertNoAliasCollision(catalog)).toThrow(
      /Alias collision.*alpha.*beta.*alpha/s,
    );
  });
});

// ---------------------------------------------------------------------------
// P2-B (RFC-1 §4.2.1): alias NORMALIZED projection invariants
// ---------------------------------------------------------------------------

describe("getNormalizedInvocationSet — alias projection (P2-B)", () => {
  it("registers alias as cli target with canonical_cli_invocation", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "coordinator",
        phase: "post_boot",
        doc_template_id: "coordinator",
        description: "x",
        aliases: ["coord"],
        realizations: [
          {
            kind: "cli",
            invocation: "coordinator",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    const set = getNormalizedInvocationSet(catalog);
    // Both canonical and alias map to cli targets with the same canonical_cli_invocation.
    const coord = set.get("coord");
    const coordinator = set.get("coordinator");
    expect(coord).toEqual({
      entry_kind: "public",
      identity: "coordinator",
      realization_kind: "cli",
      canonical_cli_invocation: "coordinator",
    });
    expect(coordinator).toEqual({
      entry_kind: "public",
      identity: "coordinator",
      realization_kind: "cli",
      canonical_cli_invocation: "coordinator",
    });
  });

  it("throws on slash-only PublicEntry with aliases (cli realization required)", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "feedback",
        phase: "post_boot",
        doc_template_id: "feedback",
        description: "x",
        aliases: ["fb"],
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:feedback",
            prompt_body_ref: ".onto/commands/feedback.md",
          },
        ],
      },
    ]);
    expect(() => getNormalizedInvocationSet(catalog)).toThrow(
      /Aliases on PublicEntry.*feedback.*require ≥1 CliRealization/s,
    );
  });

  it("throws on multi-CLI PublicEntry with aliases (canonical 모호성, future seam)", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "compound",
        phase: "post_boot",
        doc_template_id: "compound",
        description: "x",
        aliases: ["cmp"],
        realizations: [
          {
            kind: "cli",
            invocation: "compound",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
          {
            kind: "cli",
            invocation: "compound-alt",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    expect(() => getNormalizedInvocationSet(catalog)).toThrow(
      /Aliases on multi-CLI PublicEntry.*compound.*not supported/s,
    );
  });

  it("cli realization target carries canonical_cli_invocation = self invocation", () => {
    // Verifies the type-level invariant — canonical_cli_invocation only on
    // cli targets, set to the self-invocation string when not aliased.
    const set = getNormalizedInvocationSet(COMMAND_CATALOG);
    const info = set.get("info");
    expect(info?.entry_kind).toBe("public");
    if (info && info.entry_kind === "public" && info.realization_kind === "cli") {
      expect(info.canonical_cli_invocation).toBe("info");
    } else {
      throw new Error("expected info to be a cli target with canonical_cli_invocation");
    }
  });

  it("slash target does NOT carry canonical_cli_invocation field (type-level invariant)", () => {
    const set = getNormalizedInvocationSet(COMMAND_CATALOG);
    const review = set.get("/onto:review");
    expect(review?.entry_kind).toBe("public");
    if (review && review.entry_kind === "public") {
      // type narrowing: realization_kind for slash targets is "slash" or "patterned_slash".
      expect(review.realization_kind).not.toBe("cli");
      // No canonical_cli_invocation on slash targets — type system enforces this.
      expect((review as Record<string, unknown>).canonical_cli_invocation).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Normalized invocation set behavior — bare onto sentinel
// ---------------------------------------------------------------------------

describe("getNormalizedInvocationSet — bare onto sentinel", () => {
  it("0 entry with default_for: bare_onto → no <<bare>> in set", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "version",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        description: "x",
        realizations: [{ kind: "long_flag", invocation: "--version" }],
        // no default_for
      },
    ]);
    const set = getNormalizedInvocationSet(catalog);
    expect(set.has("<<bare>>")).toBe(false);
  });

  it("1 entry with default_for: bare_onto → <<bare>> in set", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "help",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        default_for: "bare_onto",
        description: "x",
        realizations: [{ kind: "long_flag", invocation: "--help" }],
      },
    ]);
    const set = getNormalizedInvocationSet(catalog);
    expect(set.has("<<bare>>")).toBe(true);
  });

  it("2+ entries with default_for: bare_onto → throws collision at load", () => {
    const catalog = makeCatalog([
      {
        kind: "meta",
        name: "help",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        default_for: "bare_onto",
        description: "x",
        realizations: [{ kind: "long_flag", invocation: "--help" }],
      },
      {
        kind: "meta",
        name: "version",
        phase: "preboot",
        cli_dispatch: { handler_module: "src/cli.ts" },
        default_for: "bare_onto",
        description: "y",
        realizations: [{ kind: "long_flag", invocation: "--version" }],
      },
    ]);
    expect(() => getNormalizedInvocationSet(catalog)).toThrow(
      /Normalized invocation collision.*<<bare>>/s,
    );
  });
});

// ---------------------------------------------------------------------------
// Normalized invocation set — patterned realization expansion
// ---------------------------------------------------------------------------

describe("getNormalizedInvocationSet — patterned realization", () => {
  it("expands parameter_set into individual normalized keys", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "ask",
        phase: "post_boot",
        doc_template_id: "ask",
        description: "x",
        realizations: [
          {
            kind: "patterned_slash",
            invocation_pattern: "/onto:ask-{dim}",
            parameter_name: "dim",
            parameter_set: ["logic", "dependency"],
            prompt_body_ref: ".onto/commands/ask.md",
          },
        ],
      },
    ]);
    const set = getNormalizedInvocationSet(catalog);
    expect(set.has("/onto:ask-logic")).toBe(true);
    expect(set.has("/onto:ask-dependency")).toBe(true);
    expect(set.has("/onto:ask-{dim}")).toBe(false); // unexpanded pattern not added
  });

  it("throws collision when expanded patterned key collides with existing", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "ask",
        phase: "post_boot",
        doc_template_id: "ask",
        description: "x",
        realizations: [
          {
            kind: "patterned_slash",
            invocation_pattern: "/onto:ask-{dim}",
            parameter_name: "dim",
            parameter_set: ["logic"],
            prompt_body_ref: ".onto/commands/ask.md",
          },
        ],
      },
      {
        kind: "public",
        identity: "ask-logic-direct",
        phase: "post_boot",
        doc_template_id: "ask-logic-direct",
        description: "y",
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:ask-logic",
            prompt_body_ref: ".onto/commands/ask-logic.md",
          },
        ],
      },
    ]);
    expect(() => getNormalizedInvocationSet(catalog)).toThrow(
      /Normalized invocation collision.*\/onto:ask-logic/s,
    );
  });
});

// ---------------------------------------------------------------------------
// Normalized invocation set — same-name slash + cli (no collision)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// assertDocTemplateIdUnique (P1-2b §D9)
// ---------------------------------------------------------------------------

describe("assertDocTemplateIdUnique", () => {
  it("real catalog passes (every PublicEntry has unique doc_template_id)", () => {
    expect(() => assertDocTemplateIdUnique(COMMAND_CATALOG)).not.toThrow();
  });

  it("throws on duplicate doc_template_id across two PublicEntries", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "a",
        phase: "post_boot",
        doc_template_id: "dup",
        description: "x",
        realizations: [
          { kind: "cli", invocation: "a", cli_dispatch: { handler_module: "src/cli.ts" } },
        ],
      },
      {
        kind: "public",
        identity: "b",
        phase: "post_boot",
        doc_template_id: "dup",
        description: "y",
        realizations: [
          { kind: "cli", invocation: "b", cli_dispatch: { handler_module: "src/cli.ts" } },
        ],
      },
    ]);
    expect(() => assertDocTemplateIdUnique(catalog)).toThrow(
      /doc_template_id collision/,
    );
  });
});

// ---------------------------------------------------------------------------
// assertPromptBodyRefInManagedTree (P1-2b §D25)
// ---------------------------------------------------------------------------

describe("assertPromptBodyRefInManagedTree", () => {
  it("real catalog passes (every prompt_body_ref is inside .onto/commands/)", () => {
    expect(() =>
      assertPromptBodyRefInManagedTree(COMMAND_CATALOG),
    ).not.toThrow();
  });

  it("rejects a traversal that escapes the managed tree", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "bad",
        phase: "post_boot",
        doc_template_id: "bad",
        description: "x",
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:bad",
            prompt_body_ref: ".onto/commands/../elsewhere/bad.md",
          },
        ],
      },
    ]);
    expect(() => assertPromptBodyRefInManagedTree(catalog)).toThrow(
      /escapes managed tree/,
    );
  });

  it("rejects an absolute path outside the managed tree", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "bad",
        phase: "post_boot",
        doc_template_id: "bad",
        description: "x",
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:bad",
            prompt_body_ref: "/tmp/outside.md",
          },
        ],
      },
    ]);
    expect(() => assertPromptBodyRefInManagedTree(catalog)).toThrow(
      /escapes managed tree/,
    );
  });

  it("accepts a nested-subdir path inside the managed tree", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "ok",
        phase: "post_boot",
        doc_template_id: "ok",
        description: "x",
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:learn:ok",
            prompt_body_ref: ".onto/commands/learn/ok.md",
          },
        ],
      },
    ]);
    expect(() => assertPromptBodyRefInManagedTree(catalog)).not.toThrow();
  });
});

describe("getNormalizedInvocationSet — same identity, different realizations", () => {
  it("PublicEntry with both slash + cli does not collide (different invocation strings)", () => {
    const catalog = makeCatalog([
      {
        kind: "public",
        identity: "review",
        phase: "post_boot",
        doc_template_id: "review",
        description: "x",
        realizations: [
          {
            kind: "slash",
            invocation: "/onto:review",
            prompt_body_ref: ".onto/commands/review.md",
          },
          {
            kind: "cli",
            invocation: "review",
            cli_dispatch: { handler_module: "src/cli.ts" },
          },
        ],
      },
    ]);
    const set = getNormalizedInvocationSet(catalog);
    expect(set.has("/onto:review")).toBe(true);
    expect(set.has("review")).toBe(true);
    expect(set.size).toBe(2);
  });
});
