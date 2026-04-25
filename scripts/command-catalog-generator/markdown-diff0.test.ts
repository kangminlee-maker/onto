/**
 * Tests — markdown-diff0.test.ts (P1-2b plan §D10 / §D23 / §D24 / §D27)
 *
 * Stage 1 (runs unconditionally in default + UPDATE_SNAPSHOT modes):
 *   - Forward (§D23): every PublicEntry with `doc_template_id` has a matching
 *     template file in `src/core-runtime/cli/command-catalog-templates/`.
 *   - Reverse (§D24): every `*.md.template` file maps back to a PublicEntry
 *     whose `doc_template_id` equals the template basename.
 *
 * Stage 2:
 *   - Default mode: run `deriveAllMarkdown` with `snapshotMode: false` against
 *     the real catalog/templates/managed-tree → byte-compare each emitted
 *     file against the committed `.onto/commands/**\/*.md`.
 *   - UPDATE_SNAPSHOT=1 mode: run `deriveAllMarkdown` with `snapshotMode: true`
 *     and WRITE outputs to disk. This is the sole bootstrap seat (§D18/§D27).
 *     Operator reviews the git diff and commits.
 *
 * Idempotence guarantee: once `main` is in post-first-generation state, default
 * mode's byte-compare produces zero diff; UPDATE_SNAPSHOT re-run produces the
 * same bytes.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_CATALOG } from "../../src/core-runtime/cli/command-catalog.js";
import {
  deriveAllMarkdown,
  deriveMarkdown,
  computeEmissionPath,
} from "./markdown-deriver.js";
import {
  DEFAULT_TEMPLATES_DIR,
  readTemplate,
  templatePath,
} from "./template-loader.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const COMMANDS_DIR = path.resolve(REPO_ROOT, ".onto/commands");
const TEMPLATE_SUFFIX = ".md.template";

const SHOULD_UPDATE = process.env.UPDATE_SNAPSHOT === "1";

// ---------------------------------------------------------------------------
// Stage 1 — forward (D23) + reverse (D24) exact-set guards
// ---------------------------------------------------------------------------

describe("Stage 1 — template/entry exact-set guards", () => {
  it("forward (D23): every PublicEntry with doc_template_id has a matching template file", () => {
    const missing: Array<{ identity: string; expected: string }> = [];
    for (const entry of COMMAND_CATALOG.entries) {
      if (entry.kind !== "public") continue;
      const expected = templatePath(entry.doc_template_id, DEFAULT_TEMPLATES_DIR);
      if (!existsSync(expected)) {
        missing.push({ identity: entry.identity, expected });
      }
    }
    if (missing.length > 0) {
      const msg = missing
        .map((m) => `  ${m.identity} → ${m.expected}`)
        .join("\n");
      throw new Error(
        `Missing templates for ${missing.length} PublicEntry/entries:\n${msg}`,
      );
    }
  });

  it("reverse (D24): every *.md.template maps back to a PublicEntry", () => {
    if (!existsSync(DEFAULT_TEMPLATES_DIR)) {
      throw new Error(
        `Templates directory not found: ${DEFAULT_TEMPLATES_DIR}`,
      );
    }
    const docTemplateIds = new Set<string>();
    for (const entry of COMMAND_CATALOG.entries) {
      if (entry.kind !== "public") continue;
      docTemplateIds.add(entry.doc_template_id);
    }
    const orphans: string[] = [];
    for (const name of readdirSync(DEFAULT_TEMPLATES_DIR)) {
      if (!name.endsWith(TEMPLATE_SUFFIX)) continue;
      const id = name.slice(0, -TEMPLATE_SUFFIX.length);
      if (!docTemplateIds.has(id)) orphans.push(name);
    }
    if (orphans.length > 0) {
      throw new Error(
        `orphan template file(s) with no matching PublicEntry.doc_template_id: ` +
          `${orphans.join(", ")}. Either add a catalog entry or delete the template.`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Stage 2 — derive pipeline
// ---------------------------------------------------------------------------

describe("Stage 2 — derive pipeline", () => {
  if (SHOULD_UPDATE) {
    // Bootstrap / resnapshot branch (plan §D18/§D27). snapshotMode=true
    // downgrades D13 case (ii) so existing markerless files can be
    // overwritten with marker-prefixed versions.
    it("UPDATE_SNAPSHOT=1 — materializes markdown with snapshotMode=true (bootstrap, idempotent)", () => {
      // P1-3 idempotency parity: every emitted file is either freshly
      // written (first bootstrap or after a catalog edit) or skipped as
      // unchanged (rerun on a clean tree). Both states are healthy; only
      // a deriver error or a missing emission set would be wrong.
      const result = deriveAllMarkdown(COMMAND_CATALOG, {
        snapshotMode: true,
        projectRoot: REPO_ROOT,
      });
      expect(result.written.length + result.skippedUnchanged.length).toBeGreaterThan(0);
    });
  } else {
    it("default mode — byte-compare each emitted .md against committed file", () => {
      // Use in-memory dry-run equivalent: compute outputs without writing,
      // then manually byte-compare against committed files.
      // We compute by running dry-run (which returns skippedDryRun list
      // + classification), then we call deriveAllMarkdown logic to get
      // the actual per-entry content. For byte-compare we need the content
      // strings, which dry-run mode currently doesn't expose; so instead
      // we replicate the content computation here via the public helpers.
      //
      // Simpler path: call deriveAllMarkdown in default mode against a
      // repo-parallel tree. But the test needs to compare against the
      // real committed tree, so we replicate the derive here.

      // Just read each committed file and re-compute the expected derive
      // output per entry. Compare byte-by-byte.
      const mismatches: Array<{ path: string; reason: string }> = [];
      for (const entry of COMMAND_CATALOG.entries) {
        if (entry.kind !== "public") continue;
        const rel = computeEmissionPath(entry);
        const abs = path.resolve(REPO_ROOT, rel);
        const template = readTemplate(entry.doc_template_id);
        if (template === null) {
          mismatches.push({
            path: rel,
            reason: "template missing (see Stage 1)",
          });
          continue;
        }
        const expected = deriveMarkdown(entry, template);
        if (!existsSync(abs)) {
          mismatches.push({
            path: rel,
            reason: "committed file missing — run UPDATE_SNAPSHOT=1 to materialize",
          });
          continue;
        }
        const actual = readFileSync(abs, "utf8");
        if (actual !== expected) {
          mismatches.push({ path: rel, reason: "bytes differ (diff-0 broken)" });
        }
      }
      if (mismatches.length > 0) {
        const msg = mismatches
          .map((m) => `  ${m.path}: ${m.reason}`)
          .join("\n");
        throw new Error(
          `Diff-0 violations (${mismatches.length}):\n${msg}\n\n` +
            `Run the bootstrap command to regenerate:\n` +
            `  UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/markdown-diff0.test.ts`,
        );
      }
    });

    it("default mode — managed-tree boundary guards pass", () => {
      // Dry-run to exercise classifyExistingManagedFiles + allowlist/stale
      // assertions without writing.
      expect(() =>
        deriveAllMarkdown(COMMAND_CATALOG, {
          dryRun: true,
          projectRoot: REPO_ROOT,
        }),
      ).not.toThrow();
    });
  }
});
