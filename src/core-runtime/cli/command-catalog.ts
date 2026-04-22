/**
 * Command Catalog — migration evidence (Phase 1 P1-1a, 2026-04-23)
 *
 * Authority status: evidence only. Existing 5 surfaces (`.onto/commands/*.md`,
 * `package.json:scripts`, `src/cli.ts` switch, `.claude-plugin/plugin.json`,
 * `bin/onto`) remain authoritative until P1-3 dispatcher integration + P1-4
 * CI drift check activation.
 *
 * Design authority:
 *   `development-records/evolve/20260423-phase-1-catalog-ssot-design.md`
 *
 * Sub-PR: P1-1a (types + helpers + minimal entries + tests).
 *   P1-1b will populate the full surface (16+ public + 33+ runtime scripts).
 */

import { validateCatalog } from "./command-catalog-helpers.js";

// ---------------------------------------------------------------------------
// Type definitions (design doc §4.1)
// ---------------------------------------------------------------------------

type Common = {
  description: string;
  aliases?: readonly string[];
  deprecated_since?: string;
  removed_in?: string;
  successor?: string;
};

export type SlashRealization = {
  kind: "slash";
  invocation: string;
  prompt_body_ref: string;
};

export type CliRealization = {
  kind: "cli";
  invocation: string;
  cli_dispatch: {
    handler_module: string;
    handler_export?: string;
  };
};

export type PatternedSlashRealization = {
  kind: "patterned_slash";
  invocation_pattern: string;
  parameter_name: string;
  parameter_set: readonly string[];
  prompt_body_ref: string;
};

export type PublicRealization =
  | SlashRealization
  | CliRealization
  | PatternedSlashRealization;

export type PublicEntry = Common & {
  kind: "public";
  identity: string;
  phase: "preboot" | "post_boot";
  repair_path?: boolean;
  contract_ref?: string;
  doc_template_id: string;
  realizations: readonly PublicRealization[];
  runtime_scripts?: readonly string[];
};

export type RuntimeScriptEntry = Common & {
  kind: "runtime_script";
  name: string;
  script_path: string;
  invoker: "tsx" | "node-dist";
};

export type MetaRealization =
  | { kind: "long_flag"; invocation: string }
  | { kind: "short_flag"; invocation: string };

export type MetaEntry = Common & {
  kind: "meta";
  name: string;
  phase: "preboot";
  realizations: readonly MetaRealization[];
  cli_dispatch: { handler_module: string; handler_export?: string };
  default_for?: "bare_onto";
};

export type CatalogEntry = PublicEntry | RuntimeScriptEntry | MetaEntry;

export type CommandCatalog = {
  version: 1;
  entries: readonly CatalogEntry[];
};

// ---------------------------------------------------------------------------
// Migration registry (design doc §4.5)
// ---------------------------------------------------------------------------

export const META_NAME_REGISTRY = ["help", "version"] as const;
export type RegisteredMetaName = (typeof META_NAME_REGISTRY)[number];

export const CURRENT_CATALOG_VERSION = 1;

export const CATALOG_VERSION_HISTORY = {
  1: {
    introduced_in: "0.3.0",
    description:
      "Initial catalog with three entry kinds (PublicEntry + RuntimeScriptEntry + MetaEntry).",
    breaking_changes: [],
  },
} as const;

// ---------------------------------------------------------------------------
// Catalog declaration — P1-1a minimal entries
//
// Coverage: minimal viable subset to validate the type system + helpers
// end-to-end. P1-1b will populate the full surface from the 5-location
// survey (16+ public commands, 33+ runtime scripts, 3 legacy entries).
// ---------------------------------------------------------------------------

export const COMMAND_CATALOG: CommandCatalog = {
  version: 1,
  entries: [
    // PublicEntry cli-backed: info (preboot, no repair_path)
    {
      kind: "public",
      identity: "info",
      phase: "preboot",
      doc_template_id: "info",
      description:
        "Show installation mode, onto home, project root, and runtime info.",
      realizations: [
        {
          kind: "cli",
          invocation: "info",
          cli_dispatch: { handler_module: "src/cli.ts" },
        },
      ],
    },

    // PublicEntry cli-backed + slash: review (post_boot)
    {
      kind: "public",
      identity: "review",
      phase: "post_boot",
      doc_template_id: "review",
      description: "9-lens review with separate synthesize stage.",
      contract_ref: ".onto/processes/review/review.md",
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
      runtime_scripts: ["review:invoke"],
    },

    // PublicEntry prompt-backed: feedback
    {
      kind: "public",
      identity: "feedback",
      phase: "post_boot",
      doc_template_id: "feedback",
      description: "Submit feedback for ontology evolution.",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:feedback",
          prompt_body_ref: ".onto/commands/feedback.md",
        },
      ],
    },

    // RuntimeScriptEntry: review:invoke
    {
      kind: "runtime_script",
      name: "review:invoke",
      script_path: "src/core-runtime/cli/review-invoke.ts",
      invoker: "tsx",
      description: "Internal: review session invocation entrypoint.",
    },

    // MetaEntry: help (default_for: bare_onto)
    {
      kind: "meta",
      name: "help",
      phase: "preboot",
      cli_dispatch: { handler_module: "src/cli.ts" },
      default_for: "bare_onto",
      description: "Show usage and command list.",
      realizations: [
        { kind: "long_flag", invocation: "--help" },
        { kind: "short_flag", invocation: "-h" },
      ],
    },

    // MetaEntry: version
    {
      kind: "meta",
      name: "version",
      phase: "preboot",
      cli_dispatch: { handler_module: "src/cli.ts" },
      description: "Show onto version.",
      realizations: [
        { kind: "long_flag", invocation: "--version" },
        { kind: "short_flag", invocation: "-v" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Auto-validate at module load (design doc §4.6)
// ---------------------------------------------------------------------------

validateCatalog(COMMAND_CATALOG);
