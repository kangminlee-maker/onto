/**
 * Atomic profile adoption for review config chain — Review Recovery PR-1 addendum.
 *
 * # What this module is
 *
 * A policy module that enforces **atomic profile ownership** when merging
 * project `.onto/config.yml` over global `~/.onto/config.yml`:
 *
 *   - Provider-coupled fields (host_runtime, execution_realization,
 *     reasoning_effort, per-provider blocks, etc.) belong to ONE source only.
 *     Either the project owns the whole profile, or the global does —
 *     never a frankenstein merge.
 *   - Orthogonal fields (output_language, domains, review_mode, etc.) remain
 *     free to merge field-by-field because they carry no cross-provider
 *     semantics.
 *
 * # Why it exists
 *
 * The prior `resolveConfigChain` merged scalar-by-scalar with last-wins
 * semantics. When the global declared one complete profile (e.g., codex with
 * `execution_realization=subagent, model=gpt-5.4, reasoning_effort=high`)
 * and the project declared a different provider (e.g.,
 * `host_runtime=anthropic`) without re-declaring the orphaned coupling,
 * the merge produced a silently incoherent profile:
 *
 *   - host_runtime: anthropic            (project)
 *   - execution_realization: subagent    (inherited from global's codex slot)
 *   - model: gpt-5.4                     (inherited; anthropic would reject this)
 *   - reasoning_effort: high             (codex-only field; anthropic ignores)
 *
 * Downstream dispatch then silently dropped the orphans ("invalid model" was
 * masked by per-provider lookup) — producing drift nobody could see.
 *
 * # How it relates
 *
 * `adoptProfile()` is called from `resolveConfigChain()`. It returns the
 * adopted profile fields (one source), whether a notice should be emitted,
 * and whether the adoption failed entirely (both sides incomplete/absent).
 * `resolveConfigChain()` is the single integration seat for review callers.
 */

import type { OntoConfig } from "./config-chain.js";

// ---------------------------------------------------------------------------
// Legacy field reader (PR-K, 2026-04-18)
// ---------------------------------------------------------------------------

/**
 * Read a legacy profile field name from a raw config object without
 * requiring it to be in the OntoConfig type. PR-K removed 5 legacy
 * fields from the type definition (stage 3 of sketch v3 §7.4 Phase D),
 * but YAML configs may still contain them pre-migration — and PR-J's
 * structured `LegacyFieldRemovedError` depends on detecting them.
 *
 * This helper performs an unchecked cast to `Record<string, unknown>` and
 * narrows to `string | undefined` since all 5 legacy fields were
 * originally typed as `string | undefined`.
 */
function readLegacyField(
  config: OntoConfig | Record<string, unknown>,
  key: string,
): string | undefined {
  const value = (config as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

// ---------------------------------------------------------------------------
// Profile vs orthogonal field partitioning
// ---------------------------------------------------------------------------

/**
 * Top-level OntoConfig keys whose semantics are coupled to the provider choice.
 * A single source owns the entire set per adoption cycle.
 */
// PR-K (2026-04-18): PROFILE_FIELDS loosened from `Set<keyof OntoConfig>`
// to `Set<string>`. Rationale: the 5 legacy fields (host_runtime /
// execution_realization / execution_mode / executor_realization /
// api_provider) were removed from the OntoConfig interface (stage 3 of
// sketch v3 §7.4 Phase D) but their NAMES must still appear in
// PROFILE_FIELDS so runtime profile-completeness detection on raw YAML
// objects (which may still contain these fields pre-migration) continues
// to work. Using `Set<string>` permits string literals that are no longer
// in `keyof OntoConfig`.
export const PROFILE_FIELDS = new Set<string>([
  // Legacy profile fields (removed from OntoConfig type but still detected
  // via raw object reads — see `legacy-field-deprecation.ts`). Included
  // here so `adoptProfile` / `validateProfileCompleteness` recognize
  // these keys when present in a raw YAML config, letting PR-J's
  // fail-fast fire with a structured error rather than silent ignore.
  "host_runtime",
  "execution_realization",
  "execution_mode",
  "executor_realization",
  "api_provider",
  // Current profile fields (present in OntoConfig interface):
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
  // Sketch v3 / PR-A (2026-04-18). `lens_agent_teams_mode` and
  // `generic_nested_spawn_supported` are capability declarations that
  // must stay paired with the provider profile that claimed them —
  // e.g. a project declaring `lens_agent_teams_mode: true` commits the
  // whole profile to the 1-0 deliberation topology. Allowing a
  // frankenstein merge (project declares the flag, global supplies the
  // actual provider) would reintroduce the silent-divergence class PR-1
  // just closed. `execution_topology_priority` and
  // `execution_topology_overrides` stay orthogonal because they only
  // reorder/tune existing options, not declare new capability.
  "lens_agent_teams_mode",
  "generic_nested_spawn_supported",
]);

/**
 * Orthogonal fields (output language, domain scope, listing limits, etc.)
 * continue to merge last-wins across home → project. These do not encode
 * provider-coupled semantics.
 */
function isOrthogonalField(key: string): boolean {
  return !PROFILE_FIELDS.has(key as keyof OntoConfig);
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
 * Completeness rules (per host_runtime):
 *   - claude:   complete (host session provides model context)
 *   - codex:    complete (codex CLI picks default model when absent)
 *   - anthropic: needs anthropic.model or top-level model
 *   - openai:    needs openai.model or top-level model
 *   - litellm:   needs litellm.model or top-level model AND llm_base_url
 *   - standalone: needs one of {external_http_provider, api_provider,
 *     subagent_llm.provider} + corresponding model (and base_url for litellm)
 *   - (unset) + any profile field touched: incomplete (missing host_runtime)
 */
export function validateProfileCompleteness(
  config: OntoConfig | Record<string, unknown>,
): ProfileValidation {
  // PR-K: accept `Record<string, unknown>` so callers (tests, raw YAML
  // parsers) can pass objects with legacy fields that no longer exist
  // on the OntoConfig type.
  const typedConfig = config as OntoConfig;
  const touched = hasAnyProfileField(typedConfig);
  if (!touched) {
    return { complete: false, touched: false, reasons: [] };
  }

  const reasons: string[] = [];
  const host = readLegacyField(config, "host_runtime");

  if (!host) {
    reasons.push(
      "host_runtime 이 없음 (필수: claude | codex | anthropic | openai | litellm | standalone)",
    );
    return { complete: false, touched, reasons };
  }

  if (host === "claude" || host === "codex") {
    return { complete: true, touched, reasons: [] };
  }

  if (host === "anthropic") {
    if (!typedConfig.anthropic?.model && !typedConfig.model) {
      reasons.push(
        "host_runtime=anthropic 인데 anthropic.model 또는 top-level model 이 없음",
      );
    }
    return { complete: reasons.length === 0, touched, reasons };
  }

  if (host === "openai") {
    if (!typedConfig.openai?.model && !typedConfig.model) {
      reasons.push(
        "host_runtime=openai 인데 openai.model 또는 top-level model 이 없음",
      );
    }
    return { complete: reasons.length === 0, touched, reasons };
  }

  if (host === "litellm") {
    if (!typedConfig.litellm?.model && !typedConfig.model) {
      reasons.push(
        "host_runtime=litellm 인데 litellm.model 또는 top-level model 이 없음",
      );
    }
    if (!typedConfig.llm_base_url) {
      reasons.push("host_runtime=litellm 인데 llm_base_url 이 없음");
    }
    return { complete: reasons.length === 0, touched, reasons };
  }

  if (host === "standalone") {
    const provider =
      typedConfig.external_http_provider ??
      narrow(readLegacyField(typedConfig, "api_provider")) ??
      narrow(typedConfig.subagent_llm?.provider);
    if (!provider) {
      reasons.push(
        "host_runtime=standalone 인데 external_http_provider / api_provider / subagent_llm.provider 모두 없음",
      );
      return { complete: false, touched, reasons };
    }
    if (provider === "anthropic" && !typedConfig.anthropic?.model && !typedConfig.model) {
      reasons.push(
        "standalone+anthropic 인데 anthropic.model 또는 top-level model 이 없음",
      );
    }
    if (provider === "openai" && !typedConfig.openai?.model && !typedConfig.model) {
      reasons.push(
        "standalone+openai 인데 openai.model 또는 top-level model 이 없음",
      );
    }
    if (provider === "litellm") {
      if (!typedConfig.litellm?.model && !typedConfig.model) {
        reasons.push(
          "standalone+litellm 인데 litellm.model 또는 top-level model 이 없음",
        );
      }
      if (!typedConfig.llm_base_url) {
        reasons.push("standalone+litellm 인데 llm_base_url 이 없음");
      }
    }
    return { complete: reasons.length === 0, touched, reasons };
  }

  reasons.push(
    `host_runtime=${host} 는 인식되지 않는 값 (허용: claude | codex | anthropic | openai | litellm | standalone)`,
  );
  return { complete: false, touched, reasons };
}

function narrow(
  value: string | undefined,
): "anthropic" | "openai" | "litellm" | null {
  if (value === "anthropic" || value === "openai" || value === "litellm") {
    return value;
  }
  return null;
}

function hasAnyProfileField(config: OntoConfig | Record<string, unknown>): boolean {
  for (const field of PROFILE_FIELDS) {
    const value = (config as Record<string, unknown>)[field];
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
// PR-K: return type intersects with Record<string, unknown> so callers
// (tests, downstream merge) can read legacy field names no longer in
// the OntoConfig type.
export function extractProfileFields(
  config: OntoConfig | Record<string, unknown>,
): Partial<OntoConfig> & Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    const value = (config as Record<string, unknown>)[field];
    if (value !== undefined && value !== null) {
      out[field] = value;
    }
  }
  return out as Partial<OntoConfig> & Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Adoption
// ---------------------------------------------------------------------------

export interface ProfileAdoptionInputs {
  // PR-K: home/project accept `Record<string, unknown>` to allow YAML
  // configs containing legacy fields not in the OntoConfig type.
  home: OntoConfig | Record<string, unknown>;
  project: OntoConfig | Record<string, unknown>;
  /** Path where home config is expected (displayed in notices/errors). */
  homePath: string;
  /** Path where project config is expected (displayed in notices/errors). */
  projectPath: string;
  /** Whether home === project (e.g., running against the onto repo itself). */
  sameRoot: boolean;
}

export interface ProfileAdoption {
  /** Profile fields from exactly one source (or empty when neither viable). */
  // PR-K: intersect with Record to allow legacy field reads from tests.
  profile: Partial<OntoConfig> & Record<string, unknown>;
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
    "  예: 완전한 profile 1개를 설정하거나, 파일에서 profile 필드 전체를 제거해 global 을 사용합니다.",
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
  lines.push("");
  lines.push("Option A — Anthropic SDK (per-token):");
  lines.push("  host_runtime: anthropic");
  lines.push("  anthropic:");
  lines.push("    model: claude-haiku-4-5-20251001");
  lines.push("  # env: export ANTHROPIC_API_KEY=...");
  lines.push("");
  lines.push("Option B — Codex CLI (ChatGPT OAuth subscription):");
  lines.push("  host_runtime: codex");
  lines.push("  codex:");
  lines.push("    model: gpt-5.4");
  lines.push("    effort: high");
  lines.push(
    "  # 전제: codex 바이너리 설치 + `codex login` 으로 ~/.codex/auth.json 구성",
  );
  lines.push("");
  lines.push("Option C — Claude Code host (nested spawn):");
  lines.push("  host_runtime: claude");
  lines.push("  execution_realization: agent-teams");
  lines.push(
    "  # 전제: Claude Code 세션 안에서 실행 (CLAUDECODE=1 자동 감지)",
  );
  lines.push("");
  lines.push("Option D — LiteLLM proxy (로컬 모델 등):");
  lines.push("  host_runtime: standalone");
  lines.push("  external_http_provider: litellm");
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

function summarizeProfile(config: OntoConfig): string | null {
  const parts: string[] = [];
  const host = readLegacyField(config, "host_runtime");
  const apiProvider = readLegacyField(config, "api_provider");
  const executionRealization = readLegacyField(config, "execution_realization");
  if (host) parts.push(`host_runtime=${host}`);
  if (config.external_http_provider)
    parts.push(`external_http_provider=${config.external_http_provider}`);
  if (apiProvider) parts.push(`api_provider=${apiProvider}`);
  const modelForHost =
    (host === "anthropic" && config.anthropic?.model) ||
    (host === "openai" && config.openai?.model) ||
    (host === "litellm" && config.litellm?.model) ||
    (host === "codex" && config.codex?.model) ||
    config.model;
  if (modelForHost) parts.push(`model=${modelForHost}`);
  if (config.reasoning_effort)
    parts.push(`reasoning_effort=${config.reasoning_effort}`);
  if (executionRealization)
    parts.push(`execution_realization=${executionRealization}`);
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
// PR-K: accept raw Record for home/project too — callers may pass raw
// YAML objects containing legacy fields no longer in the OntoConfig type.
export function mergeOrthogonalFields(
  home: OntoConfig | Record<string, unknown>,
  project: OntoConfig | Record<string, unknown>,
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
