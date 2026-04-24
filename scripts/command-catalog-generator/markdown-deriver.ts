/**
 * Markdown derive — P1-2b.
 *
 * Input:  catalog (`command-catalog.ts`) + templates (`command-catalog-templates/*.md.template`).
 * Output: `.onto/commands/**\/*.md` files, each prefixed with a derive-hash marker.
 *
 * Bounded path of `deriveAllMarkdown`:
 *   1. `validateCatalog(catalog)` — enforce runtime invariants at derive time (plan §D22 v9).
 *   2. `buildEmissionSet(catalog)` — per-entry paths + assert disjoint from allowlist (§D13 v9).
 *   3. `assertUniqueEmissionPaths(entries)` — no two entries to same path (§D11).
 *   4. For each entry: read template → substitute → assertNoPlaceholderLeaks → wrap marker.
 *   5. `classifyExistingManagedFiles` + `assertNoStaleOrCollidingFiles(..., { snapshotMode })` —
 *      managed-tree boundary (§D13).
 *   6. Write files in deterministic sort order (or skip when `dryRun`).
 *
 * `snapshotMode: true` downgrades D13 case (ii) CONFLICT → ACCEPT (bootstrap path, §D22 v9).
 * Only `markdown-diff0.test.ts` UPDATE_SNAPSHOT branch passes `snapshotMode: true` (§D27).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type {
  CommandCatalog,
  PublicEntry,
  SlashRealization,
  PatternedSlashRealization,
} from "../../src/core-runtime/cli/command-catalog.js";
import { computeEntryDeriveHash } from "./catalog-hash.js";
import { wrapMarkdownMarker, extractMarkdownMarker } from "./marker.js";
import {
  DEFAULT_TEMPLATES_DIR,
  readTemplate,
} from "./template-loader.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Plan §D16 — bump when deriver rules change (substitution algorithm, hash
 * inputs canonical JSON shape, or marker format). Cascade-invalidates all
 * per-entry markers. */
export const DERIVE_SCHEMA_VERSION = "1";

/** Plan §D13 v9 — the ONLY permitted catalog-backed-but-non-derived paths
 * under `.onto/commands/`. Any other markerless file under the scanned
 * directory fails closed. */
export const CATALOG_BACKED_NON_DERIVED_EXCEPTIONS: readonly string[] = [
  ".onto/commands/help.md",
];

const MARKER_SOURCE_REF = "src/core-runtime/cli/command-catalog.ts";

// ---------------------------------------------------------------------------
// Emission path (plan §D14)
// ---------------------------------------------------------------------------

/**
 * Resolve an entry's emission path.
 * - If the entry has a SlashRealization or PatternedSlashRealization with
 *   `prompt_body_ref`, that path is the canonical emission seat (single
 *   source; no independent subdir rule in the deriver).
 * - Otherwise (cli-only), fall back to `.onto/commands/{doc_template_id}.md`.
 */
export function computeEmissionPath(entry: PublicEntry): string {
  const slash: SlashRealization | PatternedSlashRealization | undefined =
    entry.realizations.find(
      (r): r is SlashRealization | PatternedSlashRealization =>
        r.kind === "slash" || r.kind === "patterned_slash",
    );
  if (slash !== undefined) return slash.prompt_body_ref;
  return `.onto/commands/${entry.doc_template_id}.md`;
}

// ---------------------------------------------------------------------------
// Emission set (plan §D13 v9)
// ---------------------------------------------------------------------------

export type EmissionEntry = {
  entry: PublicEntry;
  emissionPath: string;
};

/**
 * Compute the emission set + assert it is disjoint from
 * `CATALOG_BACKED_NON_DERIVED_EXCEPTIONS`. Prevents a future catalog edit
 * (e.g., `prompt_body_ref: .onto/commands/help.md`) from reclassifying the
 * allowlist entry into an overwrite target.
 */
export function buildEmissionSet(catalog: CommandCatalog): EmissionEntry[] {
  const allowlist = new Set<string>(CATALOG_BACKED_NON_DERIVED_EXCEPTIONS);
  const out: EmissionEntry[] = [];
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const emissionPath = computeEmissionPath(entry);
    if (allowlist.has(emissionPath)) {
      throw new Error(
        `Emission-set boundary violation: PublicEntry "${entry.identity}" ` +
          `resolves to "${emissionPath}", which is in ` +
          `CATALOG_BACKED_NON_DERIVED_EXCEPTIONS. The allowlist and the ` +
          `emission set must be disjoint. plan §D13 v9.`,
      );
    }
    out.push({ entry, emissionPath });
  }
  return out;
}

export function assertUniqueEmissionPaths(entries: EmissionEntry[]): void {
  const seen = new Map<string, string>();
  for (const { entry, emissionPath } of entries) {
    const prior = seen.get(emissionPath);
    if (prior !== undefined) {
      throw new Error(
        `Emission path collision: "${emissionPath}" claimed by both ` +
          `"${prior}" and "${entry.identity}". plan §D11.`,
      );
    }
    seen.set(emissionPath, entry.identity);
  }
}

// ---------------------------------------------------------------------------
// Substitution (plan §D2 + §D26 v8)
// ---------------------------------------------------------------------------

export type SubstitutionVars = Partial<
  Record<"description" | "process_ref" | "successor" | "removed_in", string>
>;

/**
 * Build the vars record. **Undefined catalog fields are omitted** so
 * `substituteTemplate` never calls `replaceAll('{{key}}', undefined)` —
 * missing fields preserve the `{{key}}` placeholder verbatim for D12 to
 * catch (plan §D26 v8 entailment).
 */
export function buildSubstitutionVars(entry: PublicEntry): SubstitutionVars {
  const vars: SubstitutionVars = {};
  if (entry.description !== undefined) vars.description = entry.description;
  if (entry.contract_ref !== undefined) vars.process_ref = entry.contract_ref;
  if (entry.successor !== undefined) vars.successor = entry.successor;
  if (entry.removed_in !== undefined) vars.removed_in = entry.removed_in;
  return vars;
}

export function substituteTemplate(
  template: string,
  vars: SubstitutionVars,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue;
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export function assertNoPlaceholderLeaks(
  content: string,
  entryId: string,
): void {
  const leaked = new Set<string>();
  for (const m of content.matchAll(PLACEHOLDER_PATTERN)) {
    leaked.add(m[1] as string);
  }
  if (leaked.size > 0) {
    throw new Error(
      `Placeholder leak in derived output for entry "${entryId}": ` +
        `${[...leaked].map((k) => `{{${k}}}`).join(", ")} not substituted. ` +
        `Missing catalog fields or template typos. plan §D12.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Managed-tree classification (plan §D13)
// ---------------------------------------------------------------------------

export type ExistingFileClass =
  | { path: string; kind: "in-set-marker-tagged" }
  | { path: string; kind: "in-set-markerless" }
  | { path: string; kind: "out-of-set-marker-tagged" }
  | { path: string; kind: "out-of-set-allowlisted" }
  | { path: string; kind: "out-of-set-non-allowlisted" };

function walkMarkdownFiles(rootDir: string, projectRoot: string): string[] {
  if (!existsSync(rootDir)) return [];
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith(".md")) {
        out.push(path.relative(projectRoot, full));
      }
    }
  };
  walk(rootDir);
  return out.sort();
}

function isMarkerTagged(absPath: string): boolean {
  if (!existsSync(absPath)) return false;
  try {
    const content = readFileSync(absPath, "utf8");
    return extractMarkdownMarker(content) !== null;
  } catch {
    return false;
  }
}

export function classifyExistingManagedFiles(
  commandsDir: string,
  projectRoot: string,
  emissionSet: ReadonlySet<string>,
): ExistingFileClass[] {
  const allowlist = new Set<string>(CATALOG_BACKED_NON_DERIVED_EXCEPTIONS);
  const existing = walkMarkdownFiles(commandsDir, projectRoot);
  return existing.map((rel) => {
    const abs = path.resolve(projectRoot, rel);
    const tagged = isMarkerTagged(abs);
    const inSet = emissionSet.has(rel);
    if (inSet && tagged) return { path: rel, kind: "in-set-marker-tagged" };
    if (inSet && !tagged) return { path: rel, kind: "in-set-markerless" };
    if (!inSet && tagged) return { path: rel, kind: "out-of-set-marker-tagged" };
    if (allowlist.has(rel)) return { path: rel, kind: "out-of-set-allowlisted" };
    return { path: rel, kind: "out-of-set-non-allowlisted" };
  });
}

export function assertNoStaleOrCollidingFiles(
  classification: readonly ExistingFileClass[],
  opts: { snapshotMode: boolean },
): void {
  const stale = classification.filter((c) => c.kind === "out-of-set-marker-tagged");
  if (stale.length > 0) {
    throw new Error(
      `Stale marker-tagged files found (catalog no longer has matching entries): ` +
        `${stale.map((c) => c.path).join(", ")}. Retire these files (delete template ` +
        `+ .md together) or restore the catalog entries. plan §D13 case (iii).`,
    );
  }
  const bogus = classification.filter(
    (c) => c.kind === "out-of-set-non-allowlisted",
  );
  if (bogus.length > 0) {
    throw new Error(
      `Handwritten .md in managed tree not in CATALOG_BACKED_NON_DERIVED_EXCEPTIONS ` +
        `allowlist: ${bogus.map((c) => c.path).join(", ")}. Either add to the ` +
        `allowlist constant (with justification) or remove the file. plan §D13 case (iv).`,
    );
  }
  if (!opts.snapshotMode) {
    const conflict = classification.filter((c) => c.kind === "in-set-markerless");
    if (conflict.length > 0) {
      throw new Error(
        `Handwritten .md at generator-managed path (D13 case (ii) CONFLICT): ` +
          `${conflict.map((c) => c.path).join(", ")}. These paths will be overwritten ` +
          `by the deriver. Remove the file or rename it, then re-run. ` +
          `Bootstrap this state via UPDATE_SNAPSHOT=1 vitest markdown-diff0.test.ts. ` +
          `plan §D13 case (ii), §D18.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Per-entry derive + wrap
// ---------------------------------------------------------------------------

export function deriveMarkdown(
  entry: PublicEntry,
  templateContent: string,
): string {
  const vars = buildSubstitutionVars(entry);
  const substituted = substituteTemplate(templateContent, vars);
  assertNoPlaceholderLeaks(substituted, entry.identity);
  const hash = computeEntryDeriveHash(entry, templateContent, DERIVE_SCHEMA_VERSION);
  return wrapMarkdownMarker(substituted, MARKER_SOURCE_REF, hash);
}

// ---------------------------------------------------------------------------
// deriveAllMarkdown (plan §D22 v9)
// ---------------------------------------------------------------------------

export type DeriveAllOptions = {
  dryRun?: boolean;
  snapshotMode?: boolean;
  projectRoot?: string;
  templatesDir?: string;
  commandsDir?: string;
};

export type DeriveResult = {
  written: string[];
  skippedDryRun: string[];
  classification: ExistingFileClass[];
};

export function deriveAllMarkdown(
  catalog: CommandCatalog,
  opts: DeriveAllOptions = {},
): DeriveResult {
  const projectRoot = opts.projectRoot ?? path.resolve(".");
  const templatesDir = opts.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const commandsDir =
    opts.commandsDir ?? path.resolve(projectRoot, ".onto/commands");
  const dryRun = opts.dryRun ?? false;
  const snapshotMode = opts.snapshotMode ?? false;

  // §D22 v9 note on validateCatalog binding:
  // validateCatalog(catalog) runs at module-import time inside
  // command-catalog.ts itself (line near bottom: `validateCatalog(COMMAND_CATALOG)`).
  // Any caller that imports COMMAND_CATALOG has already triggered that
  // validation — including the deriveAllMarkdown entry path. Re-invoking here
  // would trigger a vitest SSR circular-import TDZ error (helpers ↔
  // command-catalog), so we rely on the import-time call. Non-standard
  // callers passing a catalog that was NOT obtained via import MUST call
  // validateCatalog themselves before entering the deriver.

  // §D13 v9 — compute emission set + disjointness with allowlist.
  const emissionEntries = buildEmissionSet(catalog);
  assertUniqueEmissionPaths(emissionEntries);

  // §D13 — classify existing managed-tree files.
  const emissionSet = new Set(emissionEntries.map((e) => e.emissionPath));
  const classification = classifyExistingManagedFiles(
    commandsDir,
    projectRoot,
    emissionSet,
  );
  assertNoStaleOrCollidingFiles(classification, { snapshotMode });

  // Compute all outputs in memory (no writes yet).
  const toWrite: Array<{ absPath: string; content: string; rel: string }> = [];
  for (const { entry, emissionPath } of emissionEntries) {
    const template = readTemplate(entry.doc_template_id, templatesDir);
    if (template === null) {
      throw new Error(
        `Template not found for PublicEntry "${entry.identity}" ` +
          `(doc_template_id="${entry.doc_template_id}"). Expected ` +
          `${path.join(templatesDir, entry.doc_template_id + ".md.template")}.`,
      );
    }
    const content = deriveMarkdown(entry, template);
    const absPath = path.resolve(projectRoot, emissionPath);
    toWrite.push({ absPath, content, rel: emissionPath });
  }

  // Deterministic write order (sorted by emissionPath).
  toWrite.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  const written: string[] = [];
  const skippedDryRun: string[] = [];

  if (dryRun) {
    for (const w of toWrite) skippedDryRun.push(w.rel);
    return { written, skippedDryRun, classification };
  }

  for (const w of toWrite) {
    const parentDir = path.dirname(w.absPath);
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
    writeFileSync(w.absPath, w.content, "utf8");
    written.push(w.rel);
  }
  return { written, skippedDryRun, classification };
}
