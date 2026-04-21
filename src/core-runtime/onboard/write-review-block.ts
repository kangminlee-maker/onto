/**
 * Review UX Redesign P4 — write/update the `review:` block in `.onto/config.yml`.
 *
 * # What this module is
 *
 * A small helper that takes a validated `OntoReviewConfig` plus a path to
 * an `.onto/config.yml` file and either (a) adds a `review:` block to the
 * file or (b) replaces an existing one. The function also strips the legacy
 * `execution_topology_priority` field on request and surfaces a deprecation
 * notice the onboard prose can print verbatim.
 *
 * # Why it exists
 *
 * Onboard stage 7 (design doc §5.2) writes the user's chosen review axes
 * into `.onto/config.yml`. Without a dedicated seat this would require the
 * prose to embed YAML serialization instructions, which is error-prone — a
 * stray indent produces a silently invalid config. Centralizing the write
 * path means the onboard prose can describe the intent ("record the user's
 * answers in the review block") and delegate formatting to this helper.
 *
 * We use `yaml`'s `parseDocument` / `Document` API (not `parse` +
 * `stringify`) because the document round-trip preserves comments and
 * formatting where the existing file has them. That matters for configs
 * authored by humans — they often annotate fields with rationale.
 *
 * # How it relates
 *
 * - Consumes: `OntoReviewConfig` type from `discovery/config-chain.ts`.
 * - Validates with: `validateReviewConfig` from
 *   `review/review-config-validator.ts` — we re-validate to catch caller
 *   errors early (the onboard prose is a weak integrator).
 * - Exposed via: `npm run onboard:write-review-block -- <path> <json>`.
 *
 * # Guarantees
 *
 * 1. Existing top-level fields are preserved in order.
 * 2. Comments attached to preserved fields survive the round-trip.
 * 3. The legacy `execution_topology_priority` is removed only when the
 *    caller sets `stripLegacyPriority: true` — default is preserve.
 * 4. If the file does not exist, it is created with a minimal document
 *    containing only the `review:` block.
 * 5. If the input is not a valid `OntoReviewConfig`, the function returns a
 *    result object with `ok: false` and no write is performed.
 */

import fs from "node:fs";
import path from "node:path";
import { Document, parseDocument } from "yaml";

import type { OntoReviewConfig } from "../discovery/config-chain.js";
import {
  validateReviewConfig,
  type ValidationError,
} from "../review/review-config-validator.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WriteReviewBlockOptions {
  /**
   * When true, remove the legacy `execution_topology_priority` field from
   * the top-level document during the write. Onboard sets this to true so
   * the migrated config has a single source of truth; config-edit flows
   * pass false to avoid unintended data loss.
   */
  stripLegacyPriority?: boolean;
}

export interface WriteReviewBlockSuccess {
  ok: true;
  /** Path that was written. */
  path: string;
  /** True when the file did not exist before the write. */
  created: boolean;
  /** True when a pre-existing `review:` block was replaced. */
  replacedExistingBlock: boolean;
  /**
   * True when the legacy `execution_topology_priority` field was present
   * AND removed (opts.stripLegacyPriority=true). Onboard prints the
   * deprecation notice to the user when this is true.
   */
  strippedLegacyPriority: boolean;
}

export interface WriteReviewBlockFailure {
  ok: false;
  errors: ValidationError[];
}

export type WriteReviewBlockResult =
  | WriteReviewBlockSuccess
  | WriteReviewBlockFailure;

/**
 * Write (or update) the `review:` block in the given config file.
 *
 * The function re-validates `review` with `validateReviewConfig` before
 * touching the file — if validation fails, nothing is written and the
 * caller receives the structured error list.
 */
export function writeReviewBlock(
  configPath: string,
  review: OntoReviewConfig,
  options: WriteReviewBlockOptions = {},
): WriteReviewBlockResult {
  // Re-validate. The type system alone cannot catch callers who constructed
  // the object manually from JSON input (the most common P4 path — the
  // onboard prose builds the object from interactive answers).
  const validation = validateReviewConfig(review);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const absolute = path.resolve(configPath);
  const exists = fs.existsSync(absolute);

  // Load the existing document (or a fresh empty one). `parseDocument`
  // returns a `Document` node the YAML library can mutate and re-serialize
  // while preserving source formatting where practical.
  let doc: Document.Parsed | Document;
  if (exists) {
    const raw = fs.readFileSync(absolute, "utf8");
    doc = parseDocument(raw, { keepSourceTokens: false });
  } else {
    // Ensure the parent directory exists — `.onto/` may not be present on
    // a brand-new project until onboard creates it.
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    doc = new Document({});
  }

  // Detect the prior state of the document so we can report it back to the
  // onboard prose (for the user-facing summary).
  const replacedExistingBlock = exists && doc.has("review");
  const hadLegacyPriority = exists && doc.has("execution_topology_priority");

  // The yaml library accepts a plain object for `set` — it converts that
  // into the internal Node graph. We filter out undefined leaves so the
  // output does not carry `key: null` artifacts for absent axes.
  const serializable = pruneUndefined(review);
  doc.set("review", serializable);

  let strippedLegacyPriority = false;
  if (hadLegacyPriority && options.stripLegacyPriority === true) {
    doc.delete("execution_topology_priority");
    strippedLegacyPriority = true;
  }

  const serialized = doc.toString();
  fs.writeFileSync(absolute, serialized, "utf8");

  return {
    ok: true,
    path: absolute,
    created: !exists,
    replacedExistingBlock,
    strippedLegacyPriority,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip `undefined` leaves from a nested object. The `yaml` library would
 * otherwise serialize them as `null`, which is semantically different from
 * "absent" in the review block (an absent key = use universal fallback).
 */
function pruneUndefined(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((v) => pruneUndefined(v));
  }
  if (typeof input !== "object") return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined) continue;
    out[key] = pruneUndefined(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI entry — `npm run onboard:write-review-block -- <path> <json>`
// ---------------------------------------------------------------------------

function printHelp(): void {
  const lines = [
    "onboard:write-review-block",
    "",
    "Write or update the `review:` block in a .onto/config.yml file.",
    "",
    "Usage:",
    "  npm run onboard:write-review-block -- <config-path> <review-json>",
    "  npm run onboard:write-review-block -- --help",
    "",
    "Options:",
    "  --strip-legacy-priority   Remove `execution_topology_priority` if present.",
    "",
    "Arguments:",
    "  <config-path>  Path to .onto/config.yml (created if missing).",
    "  <review-json>  JSON string representing an OntoReviewConfig.",
    "",
    "Example:",
    "  npm run onboard:write-review-block -- .onto/config.yml \\",
    "    '{\"teamlead\":{\"model\":\"main\"},\"subagent\":{\"provider\":\"main-native\"}}'",
    "",
    "Output: single-line JSON describing the write result on stdout.",
    "Exit code 0 on success, 1 on validation/IO failure.",
  ];
  console.log(lines.join("\n"));
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (typeof entry !== "string" || entry.length === 0) return false;
  try {
    const entryUrl = new URL(`file://${entry}`).href;
    return import.meta.url === entryUrl;
  } catch {
    return false;
  }
}

function runCli(argv: string[]): number {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return argv.length === 0 ? 1 : 0;
  }

  const stripLegacyPriority = argv.includes("--strip-legacy-priority");
  const positional = argv.filter((a) => !a.startsWith("--"));
  if (positional.length < 2) {
    console.error(
      "error: two positional arguments required: <config-path> <review-json>. " +
        "Run with --help for usage.",
    );
    return 1;
  }

  const [configPath, reviewJson] = positional;
  let parsed: unknown;
  try {
    parsed = JSON.parse(reviewJson as string);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: <review-json> is not valid JSON: ${message}`);
    return 1;
  }

  const result = writeReviewBlock(
    configPath as string,
    parsed as OntoReviewConfig,
    { stripLegacyPriority },
  );
  console.log(JSON.stringify(result));
  return result.ok ? 0 : 1;
}

if (isMainModule()) {
  const exitCode = runCli(process.argv.slice(2));
  process.exit(exitCode);
}
