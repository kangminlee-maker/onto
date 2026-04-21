/**
 * Legacy config field deprecation — PR-E → PR-J (2026-04-18).
 *
 * # What this module is
 *
 * A single seat that scans an `OntoConfig` for legacy provider-profile
 * fields (`host_runtime`, `execution_realization`, `execution_mode`,
 * `executor_realization`, `api_provider`) and **throws a fail-fast
 * error** when any are present without a companion
 * `execution_topology_priority` entry. As of PR-J (2026-04-18), the
 * prior warning-stage behavior (STDERR `[onto:deprecation]` only) has
 * been escalated to error-stage — legacy-field usage now halts the
 * review run.
 *
 * # Why it exists
 *
 * Sketch v3 (PR #98) + PR-A (PR #99) introduced `execution_topology_priority`
 * as the canonical seat for selecting a review execution topology. Legacy
 * fields re-create the silent divergence class PR-1 (PR #96) just closed.
 * PR-E (PR #103) introduced the warning-stage deprecation; PR-J promotes
 * it to error-stage now that migration guide + coordinator prompt
 * (PR #107) and dispatch integration (PR #104, #108) are complete —
 * principals have a full migration path.
 *
 * # Stages (sketch v3 §7.4 Phase D)
 *
 *   Stage 1 (PR-E / PR #103): STDERR warning, review continues
 *   Stage 2 (PR-J / THIS PR): throws `LegacyFieldRemovedError`, review halts
 *   Stage 3 (PR-K / next):   OntoConfig type fields removed entirely
 *
 * # How it relates
 *
 * - Called once per process from `resolveConfigChain()` after atomic
 *   profile adoption. Legacy-config review runs now fail at config load
 *   — the principal sees a structured error directing them to the
 *   migration guide before any lens dispatch.
 * - `execution_topology_priority` presence short-circuits the throw —
 *   principals who have migrated can keep legacy fields as historical
 *   artifacts (e.g., documentation) without being blocked.
 *
 * # Design reference
 *
 * - Sketch v3 §6.2 (legacy 호환 adapter 유지), §7.4 Phase D
 * - Handoff §7.1 / §7.3: verification required a "deprecation error
 *   메시지" — PR-J realizes this as a true throw rather than a warning
 * - Migration guide: docs/topology-migration-guide.md
 */

import type { OntoConfig } from "./config-chain.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Keys on `OntoConfig` that sketch v3 treats as legacy provider-profile
 * selectors. Each implies a topology decision that the `review:` axis
 * block now expresses canonically (P9.2, 2026-04-21).
 */
export const LEGACY_PROFILE_FIELDS = [
  "host_runtime",
  "execution_realization",
  "execution_mode",
  "executor_realization",
  "api_provider",
] as const;

export type LegacyProfileField = (typeof LEGACY_PROFILE_FIELDS)[number];

export interface LegacyUsageDetection {
  /** The legacy fields present in the config, in catalog order. */
  detected: LegacyProfileField[];
  /**
   * `true` when the principal has migrated to the new `review:` axis
   * block. Previously gated on `execution_topology_priority`; P9.2
   * (2026-04-21) removed that field and migrated the silent-bypass
   * signal to the `review:` block.
   */
  review_block_set: boolean;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Scan a config for legacy field presence. Pure — no side effects.
 *
 * Accepts `OntoConfig` OR raw `Record<string, unknown>`. Post-PR-K the
 * 5 legacy fields are no longer part of the `OntoConfig` type but still
 * appear in YAML-parsed raw objects, so loosening the parameter type
 * here lets callers (including tests) pass either shape without verbose
 * casts at every call site.
 *
 * Presence definition: `typeof value === "string"` AND `value.length > 0`.
 * An empty string or `undefined` does not count. This matches how the
 * legacy resolvers (`resolveExecutionPlan` P1 branches, `resolveExecutorConfig`)
 * treated these fields.
 */
export function detectLegacyFieldUsage(
  config: OntoConfig | Record<string, unknown>,
): LegacyUsageDetection {
  const detected: LegacyProfileField[] = [];
  const raw = config as Record<string, unknown>;
  for (const field of LEGACY_PROFILE_FIELDS) {
    const value = raw[field];
    if (typeof value === "string" && value.length > 0) {
      detected.push(field);
    }
  }
  const reviewBlock = raw.review;
  const review_block_set =
    typeof reviewBlock === "object" && reviewBlock !== null;
  return { detected, review_block_set };
}

// ---------------------------------------------------------------------------
// Warning emission
// ---------------------------------------------------------------------------

/**
 * Map a legacy field to the topology priority suggestion printed in the
 * deprecation warning. Best-effort: some legacy values (e.g.,
 * `api_provider=codex`) have multiple reasonable topology landings, so
 * the message lists the **simplest** mapping and points to the migration
 * guide for the full table.
 */
function suggestTopologyFor(field: LegacyProfileField, value: string): string {
  const v = value.toLowerCase();
  if (field === "host_runtime") {
    if (v === "codex") return "[cc-main-codex-subprocess, codex-main-subprocess, codex-nested-subprocess]";
    if (v === "claude") return "[cc-main-agent-subagent]";
    if (v === "litellm") return "[cc-teams-litellm-sessions] (Claude Code 세션 필요) 또는 legacy HTTP 경로 유지";
    if (v === "anthropic" || v === "openai") {
      return "현재 canonical topology 없음 — legacy HTTP 경로 유지 (사용 중 문제 없음)";
    }
    if (v === "standalone") return "사용 중 provider 에 맞는 cc-main-* 또는 codex-* topology";
  }
  if (field === "execution_realization" || field === "execution_mode") {
    if (v === "agent-teams") return "[cc-teams-agent-subagent]";
    if (v === "subagent") return "[cc-main-agent-subagent]";
  }
  if (field === "executor_realization") {
    if (v === "codex") return "[cc-main-codex-subprocess] (또는 codex-* variant)";
    if (v === "ts_inline_http") return "[cc-teams-litellm-sessions] 또는 legacy HTTP 경로 유지";
  }
  if (field === "api_provider") {
    if (v === "codex") return "[codex-main-subprocess, codex-nested-subprocess]";
    if (v === "anthropic" || v === "openai" || v === "litellm") {
      return "cc-teams-litellm-sessions (litellm) 또는 legacy HTTP 경로 유지";
    }
  }
  return "migration guide 참고";
}

/**
 * Thrown by `emitLegacyFieldDeprecation` when legacy provider-profile
 * fields are used without a companion `execution_topology_priority`.
 * PR-J (2026-04-18) escalated the prior STDERR warning to a throw.
 *
 * `detected` / `suggestions` / `migrationGuide` are exposed so test
 * harnesses and CLI error handlers can render structured messages.
 */
export class LegacyFieldRemovedError extends Error {
  constructor(
    public readonly detected: LegacyProfileField[],
    public readonly suggestions: Array<{ field: LegacyProfileField; value: string; suggestion: string }>,
    public readonly migrationGuide: string = "docs/topology-migration-guide.md",
  ) {
    const lines: string[] = [];
    lines.push(
      "[onto:legacy-removed] Legacy provider profile 필드는 이제 error-stage 입니다 (PR-J, sketch v3 §7.4 Phase D).",
    );
    lines.push(
      "[onto:legacy-removed] 사용된 필드:",
    );
    for (const sug of suggestions) {
      lines.push(
        `[onto:legacy-removed]   - ${sug.field}=${sug.value} → 권장 topology: ${sug.suggestion}`,
      );
    }
    lines.push(
      "[onto:legacy-removed] 해결: .onto/config.yml 에 `review:` axis block 추가 후 legacy 필드 제거. `onto onboard --re-detect` 로 자동 생성 가능.",
    );
    lines.push(
      `[onto:legacy-removed] Migration guide: ${migrationGuide}`,
    );
    lines.push(
      "[onto:legacy-removed] Principal 이 이미 `review:` 블록을 남겼다면 legacy 필드를 유지해도 무방 (silent) — 그렇지 않은 경우 본 에러 발생.",
    );
    super(lines.join("\n"));
    this.name = "LegacyFieldRemovedError";
  }
}

/**
 * Throw `LegacyFieldRemovedError` when legacy fields are used without
 * topology priority. Silent when `topology_priority_set` (migrated
 * principal) or when nothing is detected.
 *
 * Prior behavior (PR-E / warning stage): wrote `[onto:deprecation]` to
 * STDERR and continued. Post-PR-J: throws to halt the review run.
 *
 * The function name is kept as `emitLegacyFieldDeprecation` for
 * backward compatibility with callers. Function body now throws rather
 * than emits — semantic shift but API signature (void return) unchanged.
 */
export function emitLegacyFieldDeprecation(
  config: OntoConfig | Record<string, unknown>,
  detection: LegacyUsageDetection,
): void {
  if (detection.detected.length === 0) return;
  if (detection.review_block_set) return;

  const raw = config as Record<string, unknown>;
  const suggestions = detection.detected.map((field) => {
    const value = String(raw[field]);
    return { field, value, suggestion: suggestTopologyFor(field, value) };
  });
  throw new LegacyFieldRemovedError(detection.detected, suggestions);
}

/**
 * Convenience wrapper: detect + throw-if-needed. Intended entrypoint for
 * `resolveConfigChain()`. Propagates `LegacyFieldRemovedError` when the
 * config uses legacy fields without topology priority.
 */
export function checkAndEmitLegacyDeprecation(
  config: OntoConfig | Record<string, unknown>,
): LegacyUsageDetection {
  const detection = detectLegacyFieldUsage(config);
  emitLegacyFieldDeprecation(config, detection);
  return detection;
}
