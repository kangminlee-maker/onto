/**
 * Command Catalog — CLI subcommand dispatch authority (Phase 1 P1-3, 2026-04-25)
 *
 * Authority status: **CLI subcommand dispatch authority**. Scope is the
 * `bin/onto <subcommand>` entry path — the catalog-derived `dispatcher.ts`
 * + `preboot-dispatch.ts` route every CLI subcommand:
 *   - preboot → `preboot-dispatch.ts` (catalog-derived)
 *   - post_boot → `cli.ts` `main()` (legacy handler switch preserved)
 *
 * Out of scope (intentionally) — these consume the catalog as data without
 * routing through `dispatcher.ts`:
 *   - Slash invocations (`/onto:review`, `/onto:feedback`, ...) — Claude Code
 *     dispatches these via the markdown files at `.onto/commands/*.md`.
 *     The catalog is still the SSOT for the markdown content (P1-2b
 *     deriver), but the runtime path is the host's slash dispatcher,
 *     not `bin/onto`.
 *   - `npm run review:*` and other RuntimeScriptEntry invocations —
 *     dispatched by npm, not by bin/onto.
 *
 * Catalog edits cascade-invalidate the dispatcher / preboot-dispatch /
 * markdown / cli help marker hashes. `assertDispatcherDeriveHash()` at
 * dispatcher load fails fast on stale derived (Activation Determinism
 * Redesign §3.5). P1-4 will add the CI drift workflow that prevents
 * un-regenerated catalog edits from landing on main.
 *
 * Design authority:
 *   `development-records/evolve/20260423-phase-1-catalog-ssot-design.md`
 *   `development-records/evolve/20260423-activation-determinism-redesign.md`
 *
 * Sub-PR ladder:
 *   P1-1a/1b types + entries · P1-2a/b/c emitter trio · P1-3 (this) bin/onto
 *   integration · P1-4 CI drift workflow (next).
 */

import {
  CATALOG_VERSION_HISTORY as _CATALOG_VERSION_HISTORY,
  CURRENT_CATALOG_VERSION as _CURRENT_CATALOG_VERSION,
  META_NAME_REGISTRY as _META_NAME_REGISTRY,
  type RegisteredMetaName as _RegisteredMetaName,
} from "./catalog-meta.js";
import { validateCatalog } from "./command-catalog-helpers.js";

// Re-export catalog metadata under their historical names so existing callers
// that import these from `command-catalog.js` keep working. P1-3: moved to
// `catalog-meta.ts` to break the circular value-import that caused TDZ in
// dispatcher.ts (see catalog-meta.ts header).
export const META_NAME_REGISTRY = _META_NAME_REGISTRY;
export type RegisteredMetaName = _RegisteredMetaName;
export const CURRENT_CATALOG_VERSION = _CURRENT_CATALOG_VERSION;
export const CATALOG_VERSION_HISTORY = _CATALOG_VERSION_HISTORY;

// ---------------------------------------------------------------------------
// Type definitions (design doc §4.1)
// ---------------------------------------------------------------------------

// P2-B: `aliases` 가 Common 에서 PublicEntry 로 이전 (RFC-1 §4.2.0).
// 현 catalog usage 0 — type 정의 변경만, 데이터 영향 없음.
// schema-runtime alignment: runtime 이 PublicEntry 만 honor (cli realization
// 한정 invariant — slash-only / multi-cli / meta entry 의 alias 는 build-time
// throw, getNormalizedInvocationSet 에서 강제).
type Common = {
  description: string;
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
  /** P2-B (RFC-1 §4.2.0): aliases 는 PublicEntry 전용. cli realization 보유
   * 한 single-cli entry 에서만 허용 (multi-cli + alias 는 canonical 모호성으로
   * future seam). NORMALIZED 에 alias key 로 등록되며 canonical_cli_invocation
   * 으로 dispatcher 가 변환 후 forward (silent no-op 차단). */
  aliases?: readonly string[];
};

export type RuntimeScriptEntry = Common & {
  kind: "runtime_script";
  name: string;
  script_path: string;
  invoker: "tsx" | "node-dist" | "bash";
  args?: readonly string[];
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
// Migration registry (design doc §4.5) — see catalog-meta.ts for the
// canonical declarations. They are re-exported above so existing imports
// from `command-catalog.js` keep working unchanged.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Catalog declaration — P1-1b populated entries
//
// Coverage: 5-location survey (`.onto/commands/`, `package.json:scripts`,
// `src/cli.ts` switch, `.claude-plugin/plugin.json`, `bin/onto`).
// 20 PublicEntry + 25 RuntimeScriptEntry + 2 MetaEntry = 47 entries total.
//
// Slash convention for nested .onto/commands/{subdir}/{name}.md:
//   `/onto:{subdir}:{name}` (e.g., learn/promote.md → /onto:learn:promote)
//
// File existence assertions (handler_module, prompt_body_ref, contract_ref,
// script_path) are build-time tests per design §4.3 — validation 추가는 후속.
// ---------------------------------------------------------------------------

const CLI_HANDLER = { handler_module: "src/cli.ts" } as const;

export const COMMAND_CATALOG: CommandCatalog = {
  version: 1,
  entries: [
    // ───────────────────────────────────────────────────────────────────────
    // PublicEntry — cli-backed (with optional slash)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "public",
      identity: "info",
      phase: "preboot",
      doc_template_id: "info",
      description:
        "Show installation mode, onto home, project root, and runtime info.",
      realizations: [{ kind: "cli", invocation: "info", cli_dispatch: CLI_HANDLER }],
    },

    {
      kind: "public",
      identity: "config",
      phase: "preboot",
      repair_path: true,
      doc_template_id: "config",
      description: "Inspect or modify onto configuration (repair-path).",
      contract_ref: ".onto/processes/configuration.md",
      realizations: [{ kind: "cli", invocation: "config", cli_dispatch: CLI_HANDLER }],
    },

    {
      kind: "public",
      identity: "install",
      phase: "preboot",
      repair_path: true,
      doc_template_id: "install",
      description: "First-run setup wizard (providers, auth, output language). Repair-path.",
      contract_ref: ".onto/processes/install.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:install",
          prompt_body_ref: ".onto/commands/install.md",
        },
        { kind: "cli", invocation: "install", cli_dispatch: CLI_HANDLER },
      ],
    },

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
        { kind: "cli", invocation: "review", cli_dispatch: CLI_HANDLER },
      ],
      runtime_scripts: [
        "review:invoke",
        "review:start-session",
        "review:run-prompt-execution",
        "review:complete-session",
        "review:prepare-session",
        "review:bootstrap-binding",
        "review:materialize-execution-preparation",
        "review:materialize-prompt-packets",
        "review:codex-unit-executor",
        "review:mock-unit-executor",
        "review:inline-http-unit-executor",
        "review:render-final-output",
        "review:finalize-session",
        "review:assemble-record",
        "review:write-interpretation",
        "review:watch",
        "review:coordinator-init-log",
        "review:coordinator-build-synthesize-packet",
        "review:coordinator-write-execution-result",
      ],
    },

    {
      kind: "public",
      identity: "coordinator",
      phase: "post_boot",
      doc_template_id: "coordinator",
      description: "Internal review orchestration state machine (Agent Teams nested spawn).",
      realizations: [{ kind: "cli", invocation: "coordinator", cli_dispatch: CLI_HANDLER }],
      runtime_scripts: ["coordinator:start", "coordinator:next", "coordinator:status"],
    },

    {
      kind: "public",
      identity: "evolve",
      phase: "post_boot",
      doc_template_id: "evolve",
      description: "Evolve ontology — design and apply changes via aligned process.",
      contract_ref: ".onto/processes/evolve.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:evolve",
          prompt_body_ref: ".onto/commands/evolve.md",
        },
        { kind: "cli", invocation: "evolve", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "reconstruct",
      phase: "post_boot",
      doc_template_id: "reconstruct",
      description: "Reconstruct ontology from analysis targets (code, docs, etc.).",
      contract_ref: ".onto/processes/reconstruct.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:reconstruct",
          prompt_body_ref: ".onto/commands/reconstruct.md",
        },
        { kind: "cli", invocation: "reconstruct", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "govern",
      phase: "post_boot",
      doc_template_id: "govern",
      description: "Govern principles — track, propose, decide.",
      contract_ref: ".onto/processes/govern.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:govern",
          prompt_body_ref: ".onto/commands/govern.md",
        },
        { kind: "cli", invocation: "govern", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "promote",
      phase: "post_boot",
      doc_template_id: "promote",
      description: "Promote project-level learnings to global-level.",
      contract_ref: ".onto/processes/learn/promote.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:learn:promote",
          prompt_body_ref: ".onto/commands/learn/promote.md",
        },
        { kind: "cli", invocation: "promote", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "health",
      phase: "post_boot",
      doc_template_id: "health",
      description: "Show learning pool health dashboard (global or project).",
      contract_ref: ".onto/processes/learn/health.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:learn:health",
          prompt_body_ref: ".onto/commands/learn/health.md",
        },
        { kind: "cli", invocation: "health", cli_dispatch: CLI_HANDLER },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // PublicEntry — prompt-backed (slash only)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "public",
      identity: "feedback",
      phase: "post_boot",
      doc_template_id: "feedback",
      description: "Submit feedback for ontology evolution.",
      contract_ref: ".onto/processes/feedback.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:feedback",
          prompt_body_ref: ".onto/commands/feedback.md",
        },
      ],
    },

    {
      kind: "public",
      identity: "backup",
      phase: "post_boot",
      doc_template_id: "backup",
      description: "Backup onto session and learning data.",
      contract_ref: ".onto/processes/backup.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:backup",
          prompt_body_ref: ".onto/commands/backup.md",
        },
      ],
    },

    {
      kind: "public",
      identity: "restore",
      phase: "post_boot",
      doc_template_id: "restore",
      description: "Restore onto session and learning data from backup.",
      contract_ref: ".onto/processes/restore.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:restore",
          prompt_body_ref: ".onto/commands/restore.md",
        },
      ],
    },

    {
      kind: "public",
      identity: "transform",
      phase: "post_boot",
      doc_template_id: "transform",
      description: "Transform ontology between formats.",
      contract_ref: ".onto/processes/transform.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:transform",
          prompt_body_ref: ".onto/commands/transform.md",
        },
      ],
    },

    {
      kind: "public",
      identity: "create-domain",
      phase: "post_boot",
      doc_template_id: "create-domain",
      description: "Create a new domain knowledge structure.",
      contract_ref: ".onto/processes/create-domain.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:create-domain",
          prompt_body_ref: ".onto/commands/create-domain.md",
        },
      ],
    },

    {
      kind: "public",
      identity: "onboard",
      phase: "post_boot",
      doc_template_id: "onboard",
      description: "Set up onto environment for a project.",
      contract_ref: ".onto/processes/onboard.md",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:onboard",
          prompt_body_ref: ".onto/commands/onboard.md",
        },
      ],
      runtime_scripts: ["onboard:detect-review-axes", "onboard:write-review-block"],
    },

    {
      kind: "public",
      identity: "promote-domain",
      phase: "post_boot",
      doc_template_id: "promote-domain",
      description: "Promote a project domain to global.",
      realizations: [
        {
          kind: "slash",
          invocation: "/onto:learn:promote-domain",
          prompt_body_ref: ".onto/commands/learn/promote-domain.md",
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // PublicEntry — deprecated (cli-backed only, with deprecation lifecycle)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "public",
      identity: "reclassify-insights",
      phase: "post_boot",
      doc_template_id: "reclassify-insights",
      description: "Reclassify insights — superseded by promote.",
      deprecated_since: "0.2.0",
      successor: "promote",
      realizations: [
        { kind: "cli", invocation: "reclassify-insights", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "migrate-session-roots",
      phase: "post_boot",
      doc_template_id: "migrate-session-roots",
      description: "One-time migration tool — scheduled for removal.",
      deprecated_since: "0.2.0",
      removed_in: "0.3.0",
      realizations: [
        { kind: "cli", invocation: "migrate-session-roots", cli_dispatch: CLI_HANDLER },
      ],
    },

    {
      kind: "public",
      identity: "build",
      phase: "post_boot",
      doc_template_id: "build",
      description: "Build ontology — superseded by reconstruct.",
      deprecated_since: "0.2.0",
      successor: "reconstruct",
      realizations: [{ kind: "cli", invocation: "build", cli_dispatch: CLI_HANDLER }],
    },

    // ───────────────────────────────────────────────────────────────────────
    // RuntimeScriptEntry — review:* (19)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "runtime_script",
      name: "review:invoke",
      script_path: "src/core-runtime/cli/review-invoke.ts",
      invoker: "tsx",
      description: "Review combined entrypoint (start+run+complete).",
    },
    {
      kind: "runtime_script",
      name: "review:start-session",
      script_path: "src/core-runtime/cli/start-review-session.ts",
      invoker: "tsx",
      description: "Initialize review session artifacts.",
    },
    {
      kind: "runtime_script",
      name: "review:run-prompt-execution",
      script_path: "src/core-runtime/cli/run-review-prompt-execution.ts",
      invoker: "tsx",
      description: "Dispatch lens executors and synthesize for a session.",
    },
    {
      kind: "runtime_script",
      name: "review:complete-session",
      script_path: "src/core-runtime/cli/complete-review-session.ts",
      invoker: "tsx",
      description: "Render final output and finalize session record.",
    },
    {
      kind: "runtime_script",
      name: "review:prepare-session",
      script_path: "src/core-runtime/cli/prepare-review-session.ts",
      invoker: "tsx",
      description: "Internal: prepare session pre-execution artifacts.",
    },
    {
      kind: "runtime_script",
      name: "review:bootstrap-binding",
      script_path: "src/core-runtime/cli/bootstrap-review-binding.ts",
      invoker: "tsx",
      description: "Internal: bootstrap binding artifact for review.",
    },
    {
      kind: "runtime_script",
      name: "review:materialize-execution-preparation",
      script_path: "src/core-runtime/cli/materialize-review-execution-preparation.ts",
      invoker: "tsx",
      description: "Internal: materialize execution-preparation artifacts.",
    },
    {
      kind: "runtime_script",
      name: "review:materialize-prompt-packets",
      script_path: "src/core-runtime/cli/materialize-review-prompt-packets.ts",
      invoker: "tsx",
      description: "Internal: materialize prompt packets.",
    },
    {
      kind: "runtime_script",
      name: "review:codex-unit-executor",
      script_path: "src/core-runtime/cli/codex-review-unit-executor.ts",
      invoker: "tsx",
      description: "Codex-backed lens/synthesize executor.",
    },
    {
      kind: "runtime_script",
      name: "review:mock-unit-executor",
      script_path: "src/core-runtime/cli/mock-review-unit-executor.ts",
      invoker: "tsx",
      description: "Mock executor for testing.",
    },
    {
      kind: "runtime_script",
      name: "review:inline-http-unit-executor",
      script_path: "src/core-runtime/cli/inline-http-review-unit-executor.ts",
      invoker: "tsx",
      description: "Inline HTTP executor (LiteLLM, OpenAI, Anthropic).",
    },
    {
      kind: "runtime_script",
      name: "review:render-final-output",
      script_path: "src/core-runtime/cli/render-review-final-output.ts",
      invoker: "tsx",
      description: "Render review final-output.md from session artifacts.",
    },
    // `review:finalize-session` and `review:assemble-record` are coexisting
    // synonyms pointing at `assemble-review-record.ts`. The canonical authority
    // chain (BLUEPRINT.md, productized-live-path.md, review.md, runtime
    // bounded_complete_steps in complete-review-session.ts) treats
    // `review:finalize-session` as the de-facto primary lifecycle name.
    // `review:assemble-record` is retained as an alternate invocation that
    // matches the script filename. Neither is deprecated.
    {
      kind: "runtime_script",
      name: "review:finalize-session",
      script_path: "src/core-runtime/cli/assemble-review-record.ts",
      invoker: "tsx",
      description: "Assemble review-record.yaml — final step in the review lifecycle.",
    },
    {
      kind: "runtime_script",
      name: "review:assemble-record",
      script_path: "src/core-runtime/cli/assemble-review-record.ts",
      invoker: "tsx",
      description: "Assemble review-record.yaml — alternate invocation name (matches script filename).",
    },
    {
      kind: "runtime_script",
      name: "review:write-interpretation",
      script_path: "src/core-runtime/cli/write-review-interpretation.ts",
      invoker: "tsx",
      description: "Internal: write interpretation.yaml.",
    },
    {
      kind: "runtime_script",
      name: "review:watch",
      script_path: "scripts/onto-review-watch.sh",
      invoker: "bash",
      description: "Live watcher pane for review session progress.",
    },
    {
      kind: "runtime_script",
      name: "review:coordinator-init-log",
      script_path: "src/core-runtime/cli/coordinator-helpers.ts",
      invoker: "tsx",
      args: ["init-log"],
      description: "Coordinator helper: init session log.",
    },
    {
      kind: "runtime_script",
      name: "review:coordinator-build-synthesize-packet",
      script_path: "src/core-runtime/cli/coordinator-helpers.ts",
      invoker: "tsx",
      args: ["build-synthesize-packet"],
      description: "Coordinator helper: build synthesize packet.",
    },
    {
      kind: "runtime_script",
      name: "review:coordinator-write-execution-result",
      script_path: "src/core-runtime/cli/coordinator-helpers.ts",
      invoker: "tsx",
      args: ["write-execution-result"],
      description: "Coordinator helper: write execution result.",
    },

    // ───────────────────────────────────────────────────────────────────────
    // RuntimeScriptEntry — coordinator:* (3)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "runtime_script",
      name: "coordinator:start",
      script_path: "src/core-runtime/cli/coordinator-state-machine.ts",
      invoker: "tsx",
      args: ["start"],
      description: "Coordinator state machine: start.",
    },
    {
      kind: "runtime_script",
      name: "coordinator:next",
      script_path: "src/core-runtime/cli/coordinator-state-machine.ts",
      invoker: "tsx",
      args: ["next"],
      description: "Coordinator state machine: next step.",
    },
    {
      kind: "runtime_script",
      name: "coordinator:status",
      script_path: "src/core-runtime/cli/coordinator-state-machine.ts",
      invoker: "tsx",
      args: ["status"],
      description: "Coordinator state machine: status.",
    },

    // ───────────────────────────────────────────────────────────────────────
    // RuntimeScriptEntry — onboard:* (2)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "runtime_script",
      name: "onboard:detect-review-axes",
      script_path: "src/core-runtime/onboard/detect-review-axes.ts",
      invoker: "tsx",
      description: "Detect review execution axes from environment.",
    },
    {
      kind: "runtime_script",
      name: "onboard:write-review-block",
      script_path: "src/core-runtime/onboard/write-review-block.ts",
      invoker: "tsx",
      description: "Write review axes block to .onto/config.yml.",
    },

    // ───────────────────────────────────────────────────────────────────────
    // RuntimeScriptEntry — migrate:* (1)
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "runtime_script",
      name: "migrate:agent-id-rename",
      script_path: "scripts/migrate-agent-id-rename.sh",
      invoker: "bash",
      description: "One-time migration: agent-id rename.",
    },

    // ───────────────────────────────────────────────────────────────────────
    // MetaEntry — help (default_for: bare_onto), version
    // ───────────────────────────────────────────────────────────────────────

    {
      kind: "meta",
      name: "help",
      phase: "preboot",
      // P2-A: meta dispatch decomposition — handler 본문이 meta-handlers.ts 에 거주
      cli_dispatch: {
        handler_module: "src/core-runtime/cli/meta-handlers.ts",
        handler_export: "onHelp",
      },
      default_for: "bare_onto",
      description: "Show usage and command list.",
      realizations: [
        { kind: "long_flag", invocation: "--help" },
        { kind: "short_flag", invocation: "-h" },
      ],
    },
    {
      kind: "meta",
      name: "version",
      phase: "preboot",
      // P2-A: meta dispatch decomposition — handler 본문이 meta-handlers.ts 에 거주
      cli_dispatch: {
        handler_module: "src/core-runtime/cli/meta-handlers.ts",
        handler_export: "onVersion",
      },
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
