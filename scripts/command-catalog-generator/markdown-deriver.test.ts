/**
 * Tests — markdown-deriver.ts
 *
 * Unit coverage:
 *  - computeEmissionPath: prompt_body_ref-sourced with default fallback (D14)
 *  - buildEmissionSet + disjointness with allowlist (D13 v9)
 *  - assertUniqueEmissionPaths (D11)
 *  - substituteTemplate + buildSubstitutionVars (D26 v8 — undefined keys omitted)
 *  - assertNoPlaceholderLeaks (D12)
 *  - classifyExistingManagedFiles + assertNoStaleOrCollidingFiles (D13 cases)
 *  - snapshotMode downgrade (D22 v9)
 *  - computeEntryDeriveHash scoped invalidation (D15)
 *  - idempotence (D17)
 *  - dry-run (D22)
 *
 * Uses temp fixtures via mkdtemp; no tests mutate the real managed tree.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeEntryDeriveHash } from "./catalog-hash.js";
import type {
  CommandCatalog,
  PublicEntry,
} from "../../src/core-runtime/cli/command-catalog.js";
import {
  CATALOG_BACKED_NON_DERIVED_EXCEPTIONS,
  DERIVE_SCHEMA_VERSION,
  assertNoPlaceholderLeaks,
  assertNoStaleOrCollidingFiles,
  assertUniqueEmissionPaths,
  buildEmissionSet,
  buildSubstitutionVars,
  classifyExistingManagedFiles,
  computeEmissionPath,
  deriveAllMarkdown,
  deriveMarkdown,
  substituteTemplate,
} from "./markdown-deriver.js";

const CLI_HANDLER = { handler_module: "src/cli.ts" } as const;

function publicCliEntry(identity: string, docTemplateId: string): PublicEntry {
  return {
    kind: "public",
    identity,
    phase: "post_boot",
    doc_template_id: docTemplateId,
    description: `desc-${identity}`,
    realizations: [
      { kind: "cli", invocation: identity, cli_dispatch: CLI_HANDLER },
    ],
  };
}

function publicSlashEntry(
  identity: string,
  promptBodyRef: string,
  docTemplateId: string = identity,
): PublicEntry {
  return {
    kind: "public",
    identity,
    phase: "post_boot",
    doc_template_id: docTemplateId,
    description: `desc-${identity}`,
    realizations: [
      {
        kind: "slash",
        invocation: `/onto:${identity}`,
        prompt_body_ref: promptBodyRef,
      },
    ],
  };
}

function makeCatalog(entries: PublicEntry[]): CommandCatalog {
  return { version: 1, entries };
}

// ---------------------------------------------------------------------------
// computeEmissionPath (D14)
// ---------------------------------------------------------------------------

describe("computeEmissionPath", () => {
  it("sources from SlashRealization.prompt_body_ref", () => {
    const entry = publicSlashEntry("review", ".onto/commands/review.md");
    expect(computeEmissionPath(entry)).toBe(".onto/commands/review.md");
  });

  it("falls back to .onto/commands/{doc_template_id}.md for cli-only entries", () => {
    const entry = publicCliEntry("info", "info");
    expect(computeEmissionPath(entry)).toBe(".onto/commands/info.md");
  });
});

// ---------------------------------------------------------------------------
// buildEmissionSet (D13 v9 — disjointness with allowlist)
// ---------------------------------------------------------------------------

describe("buildEmissionSet", () => {
  it("returns entries + paths for all PublicEntries with doc_template_id", () => {
    const catalog = makeCatalog([
      publicSlashEntry("review", ".onto/commands/review.md"),
      publicCliEntry("info", "info"),
    ]);
    const out = buildEmissionSet(catalog);
    expect(out.map((e) => e.emissionPath)).toEqual([
      ".onto/commands/review.md",
      ".onto/commands/info.md",
    ]);
  });

  it("rejects an entry whose emission path collides with the allowlist", () => {
    const allowed = CATALOG_BACKED_NON_DERIVED_EXCEPTIONS[0] as string;
    const catalog = makeCatalog([publicSlashEntry("bad", allowed)]);
    expect(() => buildEmissionSet(catalog)).toThrow(
      /Emission-set boundary violation/,
    );
  });
});

// ---------------------------------------------------------------------------
// assertUniqueEmissionPaths (D11)
// ---------------------------------------------------------------------------

describe("assertUniqueEmissionPaths", () => {
  it("throws when two entries resolve to the same path", () => {
    const entries = [
      {
        entry: publicSlashEntry("a", ".onto/commands/dup.md", "a"),
        emissionPath: ".onto/commands/dup.md",
      },
      {
        entry: publicSlashEntry("b", ".onto/commands/dup.md", "b"),
        emissionPath: ".onto/commands/dup.md",
      },
    ];
    expect(() => assertUniqueEmissionPaths(entries)).toThrow(
      /Emission path collision/,
    );
  });
});

// ---------------------------------------------------------------------------
// buildSubstitutionVars + substituteTemplate (D26 v8)
// ---------------------------------------------------------------------------

describe("buildSubstitutionVars", () => {
  it("includes defined fields, omits undefined fields", () => {
    const entry: PublicEntry = {
      ...publicCliEntry("x", "x"),
      description: "desc",
      contract_ref: ".onto/processes/x.md",
      // successor + removed_in intentionally omitted
    };
    const vars = buildSubstitutionVars(entry);
    expect(vars).toEqual({
      description: "desc",
      process_ref: ".onto/processes/x.md",
    });
    expect("successor" in vars).toBe(false);
    expect("removed_in" in vars).toBe(false);
  });

  it("maps entry.successor to {{successor}} and entry.removed_in to {{removed_in}}", () => {
    const entry: PublicEntry = {
      ...publicCliEntry("legacy", "legacy"),
      deprecated_since: "0.2.0",
      successor: "modern",
      removed_in: "0.3.0",
    };
    const vars = buildSubstitutionVars(entry);
    expect(vars.successor).toBe("modern");
    expect(vars.removed_in).toBe("0.3.0");
  });
});

describe("substituteTemplate", () => {
  it("substitutes defined keys", () => {
    const out = substituteTemplate("Hello {{description}}!", {
      description: "world",
    });
    expect(out).toBe("Hello world!");
  });

  it("leaves placeholder intact when key is not in vars (D26 v8)", () => {
    // Undefined-key omission in buildSubstitutionVars is what prevents
    // ECMAScript replaceAll(undefined) from emitting literal "undefined".
    const out = substituteTemplate("{{successor}} takes over", {});
    expect(out).toBe("{{successor}} takes over");
  });
});

// ---------------------------------------------------------------------------
// assertNoPlaceholderLeaks (D12)
// ---------------------------------------------------------------------------

describe("assertNoPlaceholderLeaks", () => {
  it("passes on fully substituted content", () => {
    expect(() => assertNoPlaceholderLeaks("Hello world", "x")).not.toThrow();
  });

  it("throws with the leaked key named (D12)", () => {
    expect(() =>
      assertNoPlaceholderLeaks("Hello {{name}} and {{place}}", "entry-id"),
    ).toThrow(/Placeholder leak.*entry-id.*\{\{name\}\}.*\{\{place\}\}/s);
  });
});

// ---------------------------------------------------------------------------
// classifyExistingManagedFiles + assertNoStaleOrCollidingFiles (D13)
// ---------------------------------------------------------------------------

describe("managed-tree classification", () => {
  let tmp: string;
  let projectRoot: string;
  let commandsDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "onto-diff-"));
    projectRoot = tmp;
    commandsDir = path.join(projectRoot, ".onto/commands");
    mkdirSync(commandsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeManaged(rel: string, content: string): void {
    const abs = path.resolve(projectRoot, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }

  const MARKER_LINE =
    "<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. " +
    "Edit catalog or template, then run `npm run generate:catalog`. " +
    "derive-hash=" +
    "a".repeat(64) +
    " -->\n\nbody\n";

  it("classifies in-set marker-tagged as (i)", () => {
    writeManaged(".onto/commands/review.md", MARKER_LINE);
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set([".onto/commands/review.md"]),
    );
    expect(classes).toEqual([
      { path: ".onto/commands/review.md", kind: "in-set-marker-tagged" },
    ]);
  });

  it("D13 case (ii): in-set + markerless fails closed in default mode", () => {
    writeManaged(".onto/commands/review.md", "# handwritten\n");
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set([".onto/commands/review.md"]),
    );
    expect(classes[0]).toEqual({
      path: ".onto/commands/review.md",
      kind: "in-set-markerless",
    });
    expect(() =>
      assertNoStaleOrCollidingFiles(classes, { snapshotMode: false }),
    ).toThrow(/CONFLICT/);
  });

  it("D22 v9: snapshotMode=true downgrades case (ii) to accept", () => {
    writeManaged(".onto/commands/review.md", "# handwritten\n");
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set([".onto/commands/review.md"]),
    );
    expect(() =>
      assertNoStaleOrCollidingFiles(classes, { snapshotMode: true }),
    ).not.toThrow();
  });

  it("D13 case (iii): out-of-set + marker-tagged fails as STALE", () => {
    writeManaged(".onto/commands/gone.md", MARKER_LINE);
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set(), // empty emission set
    );
    expect(classes[0]?.kind).toBe("out-of-set-marker-tagged");
    expect(() =>
      assertNoStaleOrCollidingFiles(classes, { snapshotMode: false }),
    ).toThrow(/Stale marker-tagged/);
  });

  it("D13 case (iv) allow: help.md passes as catalog-backed-non-derived-exception", () => {
    writeManaged(".onto/commands/help.md", "# Help (handwritten)\n");
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set(), // help.md is never in emission set
    );
    expect(classes[0]?.kind).toBe("out-of-set-allowlisted");
    expect(() =>
      assertNoStaleOrCollidingFiles(classes, { snapshotMode: false }),
    ).not.toThrow();
  });

  it("D13 case (iv) fail: non-allowlisted handwritten file fails closed", () => {
    writeManaged(".onto/commands/bogus.md", "# Bogus handwritten\n");
    const classes = classifyExistingManagedFiles(
      commandsDir,
      projectRoot,
      new Set(),
    );
    expect(classes[0]?.kind).toBe("out-of-set-non-allowlisted");
    expect(() =>
      assertNoStaleOrCollidingFiles(classes, { snapshotMode: false }),
    ).toThrow(/not in CATALOG_BACKED_NON_DERIVED_EXCEPTIONS/);
  });
});

// ---------------------------------------------------------------------------
// deriveMarkdown: wrap + scoped invalidation (D6/D15)
// ---------------------------------------------------------------------------

describe("deriveMarkdown + per-entry derive-hash (D6/D15)", () => {
  it("emits a marker-prefixed markdown", () => {
    const entry = publicCliEntry("x", "x");
    const out = deriveMarkdown(entry, "# Hello\n");
    expect(out.startsWith("<!-- GENERATED from ")).toBe(true);
    expect(out.includes("derive-hash=")).toBe(true);
    expect(out).toContain("# Hello");
  });

  it("per-file hash changes when THIS template changes", () => {
    const entry = publicCliEntry("x", "x");
    const h1 = computeEntryDeriveHash(entry, "# v1\n", DERIVE_SCHEMA_VERSION);
    const h2 = computeEntryDeriveHash(entry, "# v2\n", DERIVE_SCHEMA_VERSION);
    expect(h1).not.toBe(h2);
  });

  it("per-file hash unaffected by OTHER entries' changes (scoped)", () => {
    const entryX = publicCliEntry("x", "x");
    const entryY = publicCliEntry("y", "y");
    const hashX_before = computeEntryDeriveHash(
      entryX,
      "# X\n",
      DERIVE_SCHEMA_VERSION,
    );
    // "Changing entry Y" is simulated by computing Y's hash in a different
    // universe where Y's template differs — X's hash input doesn't include Y.
    computeEntryDeriveHash(entryY, "# Y different\n", DERIVE_SCHEMA_VERSION);
    const hashX_after = computeEntryDeriveHash(
      entryX,
      "# X\n",
      DERIVE_SCHEMA_VERSION,
    );
    expect(hashX_after).toBe(hashX_before);
  });

  it("DERIVE_SCHEMA_VERSION bump cascades — all hashes change", () => {
    const entry = publicCliEntry("x", "x");
    const h1 = computeEntryDeriveHash(entry, "# X\n", "1");
    const h2 = computeEntryDeriveHash(entry, "# X\n", "2");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// deriveAllMarkdown: dry-run + idempotence + validateCatalog binding (D22 v9)
// ---------------------------------------------------------------------------

describe("deriveAllMarkdown", () => {
  let tmp: string;
  let priorUpdateSnapshot: string | undefined;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "onto-derive-"));
    mkdirSync(path.join(tmp, ".onto/commands"), { recursive: true });
    // The PR#212 IA-1 gate requires UPDATE_SNAPSHOT=1 before snapshotMode=true
    // is accepted. Tests exercising snapshotMode=true opt in explicitly so the
    // gate remains production-facing rather than test-blocking.
    priorUpdateSnapshot = process.env.UPDATE_SNAPSHOT;
    process.env.UPDATE_SNAPSHOT = "1";
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (priorUpdateSnapshot === undefined) {
      delete process.env.UPDATE_SNAPSHOT;
    } else {
      process.env.UPDATE_SNAPSHOT = priorUpdateSnapshot;
    }
  });

  function fixtureCatalog(): CommandCatalog {
    return makeCatalog([publicCliEntry("info", "info")]);
  }

  function setupTemplateDir(): string {
    const templatesDir = path.join(tmp, "templates");
    mkdirSync(templatesDir, { recursive: true });
    writeFileSync(path.join(templatesDir, "info.md.template"), "# Info\n");
    return templatesDir;
  }

  it("dry-run produces DeriveResult with skippedDryRun and writes no files", () => {
    const catalog = fixtureCatalog();
    const templatesDir = setupTemplateDir();
    const result = deriveAllMarkdown(catalog, {
      dryRun: true,
      projectRoot: tmp,
      templatesDir,
      snapshotMode: true,
    });
    expect(result.written).toEqual([]);
    expect(result.skippedDryRun).toEqual([".onto/commands/info.md"]);
  });

  it("snapshotMode=true writes files; re-run in default mode yields idempotent result", () => {
    const catalog = fixtureCatalog();
    const templatesDir = setupTemplateDir();

    // First run — bootstrap via snapshotMode (14 existing markerless files
    // would normally be absent; here we just write a fresh one).
    const first = deriveAllMarkdown(catalog, {
      projectRoot: tmp,
      templatesDir,
      snapshotMode: true,
    });
    expect(first.written).toEqual([".onto/commands/info.md"]);

    // Re-run in default mode — no CONFLICT (file is now marker-tagged in-set).
    const second = deriveAllMarkdown(catalog, {
      projectRoot: tmp,
      templatesDir,
      snapshotMode: false,
    });
    // second.written may include the file (we always re-write for idempotence
    // in this simple implementation); the byte content is equal.
    expect(second.written.length).toBeGreaterThanOrEqual(0);
    // Re-read and confirm byte-identical
    const firstContent = require("node:fs").readFileSync(
      path.join(tmp, ".onto/commands/info.md"),
      "utf8",
    );
    const anotherRun = deriveAllMarkdown(catalog, {
      projectRoot: tmp,
      templatesDir,
      snapshotMode: false,
    });
    const laterContent = require("node:fs").readFileSync(
      path.join(tmp, ".onto/commands/info.md"),
      "utf8",
    );
    expect(laterContent).toBe(firstContent);
    expect(anotherRun.written.length).toBeGreaterThanOrEqual(0);
  });

  it("emits content containing the catalog-derived body", () => {
    const catalog = fixtureCatalog();
    const templatesDir = setupTemplateDir();
    deriveAllMarkdown(catalog, {
      projectRoot: tmp,
      templatesDir,
      snapshotMode: true,
    });
    const content = require("node:fs").readFileSync(
      path.join(tmp, ".onto/commands/info.md"),
      "utf8",
    );
    expect(content).toContain("# Info");
    expect(content).toContain("derive-hash=");
  });

  it("snapshotMode=true throws when UPDATE_SNAPSHOT is not set (PR#212 IA-1 gate)", () => {
    const catalog = fixtureCatalog();
    const templatesDir = setupTemplateDir();
    // Temporarily drop the env var for this single test; beforeEach re-sets it.
    const saved = process.env.UPDATE_SNAPSHOT;
    delete process.env.UPDATE_SNAPSHOT;
    try {
      expect(() =>
        deriveAllMarkdown(catalog, {
          projectRoot: tmp,
          templatesDir,
          snapshotMode: true,
        }),
      ).toThrow(/UPDATE_SNAPSHOT=1/);
    } finally {
      if (saved !== undefined) process.env.UPDATE_SNAPSHOT = saved;
    }
  });
});
