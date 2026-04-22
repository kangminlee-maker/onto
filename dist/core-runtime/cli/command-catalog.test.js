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
import { COMMAND_CATALOG, CURRENT_CATALOG_VERSION, } from "./command-catalog.js";
import { assertCatalogVersionSupported, assertDeprecationLifecycle, assertEntryRealizationsNonEmpty, assertMetaNameRegistered, assertNoAliasCollision, assertNoRuntimeScriptCollision, assertRepairPathPreboot, assertReservedNamespaceUnused, assertRuntimeScriptsReferenceExists, assertSuccessorReferenceExists, getNormalizedInvocationSet, validateCatalog, } from "./command-catalog-helpers.js";
function makeCatalog(entries) {
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
    });
});
// ---------------------------------------------------------------------------
// catalog.version load gate
// ---------------------------------------------------------------------------
describe("assertCatalogVersionSupported", () => {
    it("passes when version matches CURRENT_CATALOG_VERSION", () => {
        const catalog = {
            version: CURRENT_CATALOG_VERSION,
            entries: [],
        };
        expect(() => assertCatalogVersionSupported(catalog)).not.toThrow();
    });
    it("throws actionable error when version mismatches", () => {
        // @ts-expect-error testing version=2 against runtime that supports 1
        const catalog = { version: 2, entries: [] };
        expect(() => assertCatalogVersionSupported(catalog)).toThrow(/Unsupported catalog\.version.*Resolution.*downgrade.*upgrade/s);
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
        expect(() => assertReservedNamespaceUnused(catalog)).toThrow(/Reserved namespace violation.*<<reserved/s);
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
        expect(() => assertReservedNamespaceUnused(catalog)).toThrow(/Reserved namespace violation.*>>weird/s);
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
        expect(() => assertNoRuntimeScriptCollision(catalog)).toThrow(/RuntimeScriptEntry collision.*review:invoke/s);
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
        expect(() => assertMetaNameRegistered(catalog)).toThrow(/MetaEntry\.name "ask".*META_NAME_REGISTRY/s);
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
        expect(() => assertSuccessorReferenceExists(catalog)).toThrow(/successor reference not found.*old.*nonexistent/s);
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
        expect(() => assertRuntimeScriptsReferenceExists(catalog)).toThrow(/runtime_scripts reference not found.*review.*does-not-exist/s);
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
        expect(() => assertDeprecationLifecycle(catalog)).toThrow(/removed_in.*no deprecated_since/s);
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
        expect(() => assertDeprecationLifecycle(catalog)).toThrow(/removed_in="0\.3\.0" must be > deprecated_since="0\.5\.0"/);
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
        expect(() => assertRepairPathPreboot(catalog)).toThrow(/repair_path.*phase="post_boot".*requires phase="preboot"/s);
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
        expect(() => assertEntryRealizationsNonEmpty(catalog)).toThrow(/Empty realizations.*public.*x/s);
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
        expect(() => assertEntryRealizationsNonEmpty(catalog)).toThrow(/Empty realizations.*meta.*help/s);
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
        expect(() => assertNoAliasCollision(catalog)).toThrow(/Alias collision.*shared.*a.*b/s);
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
        expect(() => getNormalizedInvocationSet(catalog)).toThrow(/Normalized invocation collision.*<<bare>>/s);
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
        expect(() => getNormalizedInvocationSet(catalog)).toThrow(/Normalized invocation collision.*\/onto:ask-logic/s);
    });
});
// ---------------------------------------------------------------------------
// Normalized invocation set — same-name slash + cli (no collision)
// ---------------------------------------------------------------------------
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
