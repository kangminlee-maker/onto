/**
 * Atomic profile adoption for review config chain — Review Recovery PR-1 addendum.
 *
 * # What this module is
 *
 * A policy module that enforces **atomic profile ownership** when merging
 * project `.onto/config.yml` over global `~/.onto/config.yml`:
 *
 *   - Provider-coupled fields (per-provider model blocks, subagent_llm,
 *     external_http_provider, lens_agent_teams_mode, etc.) belong to ONE
 *     source only. Either the project owns the whole profile, or the global
 *     does — never a frankenstein merge.
 *   - Orthogonal fields (output_language, domains, review_mode, etc.) remain
 *     free to merge field-by-field because they carry no cross-provider
 *     semantics.
 *
 * # Why it exists
 *
 * The prior `resolveConfigChain` merged scalar-by-scalar with last-wins
 * semantics. When the global declared one complete profile and the project
 * declared a different provider without re-declaring the orphaned coupling,
 * the merge produced a silently incoherent profile — downstream dispatch
 * silently dropped the orphans, producing drift nobody could see.
 *
 * # How it relates
 *
 * `adoptProfile()` is called from `resolveConfigChain()`. It returns the
 * adopted profile fields (one source), whether a notice should be emitted,
 * and whether the adoption failed entirely (both sides incomplete/absent).
 * `resolveConfigChain()` is the single integration seat for review callers.
 *
 * # Canonical seat history
 *
 * The "profile is declared" signal has migrated across three phases:
 *
 *   - pre-PR-K (≤ 2026-04-17): legacy provider-profile fields
 *     (`host_runtime`, `execution_realization`, `api_provider`, ...).
 *   - PR-K ~ P9.1 (2026-04-18 ~ 04-21): `execution_topology_priority`
 *     array declared a canonical topology seat.
 *   - Post-P9.2 (2026-04-21): the `review:` axis block is the canonical
 *     seat. `hasReviewBlock(config)` (below) is the SSOT predicate used
 *     by `validateProfileCompleteness` and shared with the opt-in gates
 *     in `review-invoke.ts` and the silent-bypass in
 *     `legacy-field-deprecation.ts`. Runtime validation of per-provider
 *     compatibility still lives in the topology resolver and the
 *     executor spawn path, not in profile adoption.
 */

import type { OntoConfig } from "./config-chain.js";

// ---------------------------------------------------------------------------
// Profile vs orthogonal field partitioning
// ---------------------------------------------------------------------------

/**
 * Top-level OntoConfig keys whose semantics are coupled to the provider choice.
 * A single source owns the entire set per adoption cycle.
 */
export const PROFILE_FIELDS = new Set<keyof OntoConfig>([
  "external_http_provider",
  "model",
  "reasoning_effort",
  "llm_base_url",
  "anthropic",
  "openai",
  "litellm",
  "codex",
  "subagent_llm",
  "main_llm",
  // Sketch v3 / PR-A (2026-04-18). `lens_agent_teams_mode` is a capability
  // declaration that must stay paired with the provider profile that
  // claimed it — e.g. a project declaring `lens_agent_teams_mode: true`
  // commits the whole profile to the 1-0 deliberation topology. Allowing
  // a frankenstein merge (project declares the flag, global supplies the
  // actual provider) would reintroduce the silent-divergence class PR-1
  // just closed.
  //
  // P7 (2026-04-21): `generic_nested_spawn_supported` removed along with
  // the `generic-*` TopologyIds it gated.
  //
  // P9.2 (2026-04-21): `execution_topology_priority` and
  // `execution_topology_overrides` removed from `OntoConfig` entirely;
  // the `review:` axis block is orthogonal by design (see
  // `OntoConfig.review` JSDoc).
  "lens_agent_teams_mode",
]);

/**
 * Orthogonal fields (output language, domain scope, listing limits, etc.)
 * continue to merge last-wins across home → project. These do not encode
 * provider-coupled semantics.
 */
function isOrthogonalField(key: string): boolean {
  return !PROFILE_FIELDS.has(key as keyof OntoConfig);
}

/**
 * Single source of truth for "does this config declare the Review UX
 * Redesign opt-in?". Post-P9.2 (2026-04-21) this judgment is shared by
 * three consumer layers:
 *   - `validateProfileCompleteness` (completeness signal),
 *   - `checkAndEmitLegacyDeprecation` silent-bypass (`review_block_set`),
 *   - the opt-in gates in `review-invoke.ts`
 *     (`tryResolveTopologyForHandoff`, `tryTopologyDerivedExecutor`).
 *
 * A block counts as declared when it is a non-null object with **at
 * least one key**. An empty `review: {}` (YAML author wrote `review:`
 * and forgot the body) does NOT count — we guard against accidental
 * opt-in that would otherwise silently flip atomic profile adoption
 * and gate dispatch. This mirrors the prior
 * `execution_topology_priority: []` behavior, where an empty array
 * also failed the opt-in test.
 *
 * Accepts either a typed `OntoConfig` or a raw `Record<string, unknown>`
 * (legacy-field-deprecation reads YAML before typing).
 */
export function hasReviewBlock(
  config: OntoConfig | Record<string, unknown> | undefined,
): boolean {
  if (config === undefined || config === null) return false;
  const review = (config as { review?: unknown }).review;
  if (typeof review !== "object" || review === null) return false;
  return Object.keys(review as Record<string, unknown>).length > 0;
}

// ---------------------------------------------------------------------------
// Completeness validation
// ---------------------------------------------------------------------------

export interface ProfileValidation {
  /** True when the profile can produce a valid ExecutionPlan as-is. */
  complete: boolean;
  /** True when at least one profile field is set (even if incomplete). */
  touched: boolean;
  /** Human-readable reasons for incompleteness, empty when complete or untouched. */
  reasons: string[];
}

/**
 * Determine whether a config declares a complete provider profile.
 *
 * Completeness rules (post-P9.2, 2026-04-21):
 *   1. A non-empty `review:` axis block is declared → complete. The
 *      topology resolver owns per-provider validation at run time;
 *      profile adoption only needs to know that the principal has
 *      declared a canonical seat.
 *   2. Otherwise if any profile field is touched → incomplete, with a
 *      migration hint. Reaching this branch without a review block
 *      typically means legacy config or a partial migration — legacy
 *      configs throw at config load (see `legacy-field-deprecation.ts`),
 *      so this branch catches the residual partial-migration case.
 *   3. Untouched → not complete, not touched (empty reasons).
 *
 * History: pre-P9.2 the signal was `execution_topology_priority`
 * (length > 0); pre-PR-K it was the provider-profile fields
 * (host_runtime, execution_realization, etc). The `hasReviewBlock`
 * helper is the SSOT for the current definition.
 */
export function validateProfileCompleteness(
  config: OntoConfig,
): ProfileValidation {
  if (hasReviewBlock(config)) {
    return { complete: true, touched: true, reasons: [] };
  }

  const touched = hasAnyProfileField(config);
  if (!touched) {
    return { complete: false, touched: false, reasons: [] };
  }

  return {
    complete: false,
    touched,
    reasons: [
      "`review:` axis block 이 없음. Review UX Redesign migration 필요 (docs/topology-migration-guide.md §7 참고).",
    ],
  };
}

function hasAnyProfileField(config: OntoConfig): boolean {
  for (const field of PROFILE_FIELDS) {
    const value = (config as Record<string, unknown>)[field as string];
    if (value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      // Skip empty objects (e.g., `anthropic: {}` written but empty)
      if (Object.keys(value as object).length === 0) continue;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Profile extraction
// ---------------------------------------------------------------------------

/**
 * Extract only profile-scoped fields from a config. Orthogonal fields are
 * dropped — this is the "profile slice" that adoption transfers atomically.
 */
export function extractProfileFields(
  config: OntoConfig,
): Partial<OntoConfig> {
  const out: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    const value = (config as Record<string, unknown>)[field as string];
    if (value !== undefined && value !== null) {
      out[field as string] = value;
    }
  }
  return out as Partial<OntoConfig>;
}

// ---------------------------------------------------------------------------
// Adoption
// ---------------------------------------------------------------------------

export interface ProfileAdoptionInputs {
  home: OntoConfig;
  project: OntoConfig;
  /** Path where home config is expected (displayed in notices/errors). */
  homePath: string;
  /** Path where project config is expected (displayed in notices/errors). */
  projectPath: string;
  /** Whether home === project (e.g., running against the onto repo itself). */
  sameRoot: boolean;
}

export interface ProfileAdoption {
  /** Profile fields from exactly one source (or empty when neither viable). */
  profile: Partial<OntoConfig>;
  /** Which side owns the adopted profile. "none" when both incomplete/absent. */
  source: "project" | "global" | "none";
  /** Absolute path to the source config file (for traceability). */
  source_path: string | null;
  /** STDERR notice to emit when project was partial and global was used. */
  notice?: string;
  /** Validation outcomes for both sides (for error message composition). */
  project_validation: ProfileValidation;
  home_validation: ProfileValidation;
}

/**
 * Adopt exactly one profile atomically.
 *
 * Decision table:
 *   project complete                        → adopt project
 *   project touched-but-incomplete + home complete → adopt global + emit notice
 *   project absent + home complete          → adopt global silently
 *   project complete + home anything        → adopt project
 *   any other combination                   → source="none" (caller decides)
 *
 * This function never throws; the "both incomplete" decision is surfaced via
 * source="none" so the caller (resolveConfigChain) composes the fail-fast
 * error with full context.
 */
export function adoptProfile(args: ProfileAdoptionInputs): ProfileAdoption {
  const project_validation = validateProfileCompleteness(args.project);
  const home_validation = validateProfileCompleteness(args.home);

  // Case 1: project declares a complete profile — project wins, no notice.
  if (project_validation.complete && !args.sameRoot) {
    return {
      profile: extractProfileFields(args.project),
      source: "project",
      source_path: args.projectPath,
      project_validation,
      home_validation,
    };
  }

  // Case 2: project touched but incomplete AND home is complete — use home,
  // but emit a detailed notice so the principal can fix the project config.
  if (
    project_validation.touched &&
    !project_validation.complete &&
    home_validation.complete
  ) {
    return {
      profile: extractProfileFields(args.home),
      source: "global",
      source_path: args.homePath,
      notice: buildProjectIncompleteNotice(args, project_validation, args.home),
      project_validation,
      home_validation,
    };
  }

  // Case 3: project untouched, home complete — use home silently.
  if (!project_validation.touched && home_validation.complete) {
    return {
      profile: extractProfileFields(args.home),
      source: "global",
      source_path: args.homePath,
      project_validation,
      home_validation,
    };
  }

  // Case 4: sameRoot + project complete (onto-home equals project; sameRoot
  // short-circuited case 1 to avoid double-counting). Use it as global.
  if (args.sameRoot && project_validation.complete) {
    return {
      profile: extractProfileFields(args.project),
      source: "global",
      source_path: args.homePath,
      project_validation,
      home_validation,
    };
  }

  // Case 5: neither side usable → source="none", caller throws.
  return {
    profile: {},
    source: "none",
    source_path: null,
    project_validation,
    home_validation,
  };
}

// ---------------------------------------------------------------------------
// Notice / error message composition
// ---------------------------------------------------------------------------

const NOTICE_PREFIX = "[onto:config] ";

function buildProjectIncompleteNotice(
  args: ProfileAdoptionInputs,
  project_validation: ProfileValidation,
  home: OntoConfig,
): string {
  const lines: string[] = [];
  lines.push(
    `${NOTICE_PREFIX}Project config 가 불완전해서 global config 를 사용합니다.`,
  );
  lines.push(`  Project config 경로:   ${args.projectPath}`);
  lines.push("  불완전 사유:");
  for (const reason of project_validation.reasons) {
    lines.push(`    - ${reason}`);
  }
  lines.push(`  사용 중인 global:      ${args.homePath}`);
  const summary = summarizeProfile(home);
  if (summary) {
    lines.push(`    → ${summary}`);
  }
  lines.push("");
  lines.push(`  Project config 수정 방법: ${args.projectPath} 편집.`);
  lines.push(
    "  예: `review:` axis block 을 설정하거나, 파일에서 profile 필드 전체를 제거해 global 을 사용합니다.",
  );
  lines.push("");
  return lines.join("\n") + "\n";
}

/**
 * Build the fail-fast error message used when neither side declares a complete
 * profile. This is a long multi-line guide — operators have no working config,
 * so the message is the entire setup manual distilled to one screen.
 */
export function buildBothIncompleteError(
  args: ProfileAdoptionInputs,
  project_validation: ProfileValidation,
  home_validation: ProfileValidation,
): Error {
  const lines: string[] = [];
  lines.push("Review profile 을 해소할 수 없습니다.");
  lines.push(
    "Project 와 global config 모두 완전한 provider profile 이 없습니다.",
  );
  lines.push("");

  lines.push(`Project config: ${args.projectPath}`);
  if (!project_validation.touched) {
    lines.push("  (파일이 없거나 profile 필드가 전혀 선언되지 않음)");
  } else {
    for (const reason of project_validation.reasons) {
      lines.push(`  - ${reason}`);
    }
  }
  lines.push("");

  lines.push(`Global config: ${args.homePath}`);
  if (!home_validation.touched) {
    lines.push("  (파일이 없거나 profile 필드가 전혀 선언되지 않음)");
  } else {
    for (const reason of home_validation.reasons) {
      lines.push(`  - ${reason}`);
    }
  }
  lines.push("");

  lines.push(
    "다음 중 한 쪽에 완전한 profile 1개를 설정하세요 (project 가 우선, 없으면 global).",
  );
  lines.push("Migration guide: docs/topology-migration-guide.md");
  lines.push("");
  lines.push("Option A — Codex CLI (ChatGPT OAuth subscription):");
  lines.push("  review:");
  lines.push("    subagent:");
  lines.push("      provider: codex");
  lines.push("      model_id: gpt-5.4");
  lines.push("      effort: high");
  lines.push("  codex:");
  lines.push("    model: gpt-5.4");
  lines.push("    effort: high");
  lines.push("  # 전제: codex 바이너리 설치 + `codex login`");
  lines.push("");
  lines.push("Option B — Claude Code Agent tool (nested subagent):");
  lines.push("  review:");
  lines.push("    subagent:");
  lines.push("      provider: main-native");
  lines.push("  # 전제: Claude Code 세션 안에서 실행");
  lines.push("");
  lines.push("Option C — Claude Code TeamCreate (experimental):");
  lines.push("  review:");
  lines.push("    subagent:");
  lines.push("      provider: main-native");
  lines.push("  # 전제: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1");
  lines.push("");
  lines.push("Option D — LiteLLM proxy (로컬 모델 등):");
  lines.push("  review:");
  lines.push("    subagent:");
  lines.push("      provider: litellm");
  lines.push("      model_id: llama-8b");
  lines.push("  llm_base_url: http://localhost:4000");
  lines.push("  litellm:");
  lines.push("    model: llama-8b");
  lines.push("");
  lines.push("저장 위치:");
  lines.push(`  - Project (이 프로젝트에만 적용): ${args.projectPath}`);
  lines.push(
    `  - Global (모든 프로젝트 기본값):  ${args.homePath}`,
  );
  return new Error(lines.join("\n"));
}

export function summarizeProfile(config: OntoConfig): string | null {
  const parts: string[] = [];
  if (config.external_http_provider)
    parts.push(`external_http_provider=${config.external_http_provider}`);
  if (config.review) {
    const subagent = config.review.subagent
      ? `subagent=${config.review.subagent.provider}`
      : "subagent=(default)";
    parts.push(`review=[${subagent}]`);
  }
  const modelForHost =
    config.anthropic?.model ||
    config.openai?.model ||
    config.litellm?.model ||
    config.codex?.model ||
    config.model;
  if (modelForHost) parts.push(`model=${modelForHost}`);
  if (config.reasoning_effort)
    parts.push(`reasoning_effort=${config.reasoning_effort}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ---------------------------------------------------------------------------
// Orthogonal merge utility (used by resolveConfigChain)
// ---------------------------------------------------------------------------

/**
 * Merge orthogonal (non-profile) fields from home and project with last-wins
 * semantics, same as legacy behavior. `excluded_names` uses union merge
 * (historical exception preserved).
 */
export function mergeOrthogonalFields(
  home: OntoConfig,
  project: OntoConfig,
): Partial<OntoConfig> {
  const merged: Partial<OntoConfig> = {};
  for (const [key, value] of Object.entries(home)) {
    if (!isOrthogonalField(key) || value === undefined || value === null)
      continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  for (const [key, value] of Object.entries(project)) {
    if (!isOrthogonalField(key) || value === undefined || value === null)
      continue;
    if (key === "excluded_names") {
      const homeNames = Array.isArray(home.excluded_names)
        ? home.excluded_names
        : [];
      const projectNames = Array.isArray(value) ? (value as string[]) : [];
      (merged as Record<string, unknown>)[key] = [
        ...new Set([...homeNames, ...projectNames]),
      ];
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
