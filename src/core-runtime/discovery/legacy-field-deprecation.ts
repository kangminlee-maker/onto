/**
 * Legacy config field deprecation — PR-E (2026-04-18).
 *
 * # What this module is
 *
 * A single seat that scans an `OntoConfig` for legacy provider-profile
 * fields (`host_runtime`, `execution_realization`, `execution_mode`,
 * `executor_realization`, `api_provider`) and emits a structured
 * deprecation warning to STDERR when any are present without a
 * companion `execution_topology_priority` entry.
 *
 * # Why it exists
 *
 * Sketch v3 (PR #98) + PR-A (PR #99) introduced `execution_topology_priority`
 * as the canonical seat for selecting a review execution topology. Legacy
 * fields remain functional for backward compatibility, but continuing to
 * use them masks the topology-aware routing path wired in PR-B/C/D and
 * re-creates the silent divergence class PR-1 (PR #96) just closed.
 *
 * The deprecation warning is the **first migration stage** (sketch v3 §7.4
 * Phase D). Subsequent stages:
 *   - Warning → error: future PR can upgrade `emitLegacyFieldDeprecation`
 *     from `process.stderr.write` to `throw`.
 *   - Field removal: the OntoConfig legacy fields (JSDoc + PROFILE_FIELDS
 *     entries) get deleted once the warning-phase sunset lands.
 *
 * # How it relates
 *
 * - Called once per process from `resolveConfigChain()` after atomic
 *   profile adoption, so the warning is emitted for each legacy-config
 *   review run regardless of which config source (home / project) owned
 *   the profile.
 * - `execution_topology_priority` presence short-circuits the warning —
 *   principals who have migrated don't see repeated nags even if they
 *   kept a legacy field for reference (e.g., documentation).
 *
 * # Design reference
 *
 * - Sketch v3 §6.2 (legacy 호환 adapter 유지), §7.4 Phase D
 * - Handoff §7.1 / §7.3: verification requires a "deprecation error
 *   메시지" visible to the operator
 * - Migration guide: docs/topology-migration-guide.md
 */

import type { OntoConfig } from "./config-chain.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Keys on `OntoConfig` that sketch v3 treats as legacy provider-profile
 * selectors. Each implies a topology decision that the new
 * `execution_topology_priority` field expresses more cleanly.
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
  /** `true` when the new topology priority field is also set. */
  topology_priority_set: boolean;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Scan a config for legacy field presence. Pure — no side effects, no
 * `process.stderr.write`. Callers decide whether to warn based on the
 * detection shape + their policy.
 *
 * Presence definition: `typeof value === "string"` AND `value.length > 0`.
 * An empty string or `undefined` does not count. This matches how the
 * legacy resolvers (`resolveExecutionPlan` P1 branches, `resolveExecutorConfig`)
 * treat these fields — empty string is ignored.
 */
export function detectLegacyFieldUsage(config: OntoConfig): LegacyUsageDetection {
  const detected: LegacyProfileField[] = [];
  for (const field of LEGACY_PROFILE_FIELDS) {
    const value = (config as Record<string, unknown>)[field];
    if (typeof value === "string" && value.length > 0) {
      detected.push(field);
    }
  }
  const topology_priority_set =
    Array.isArray(config.execution_topology_priority) &&
    config.execution_topology_priority.length > 0;
  return { detected, topology_priority_set };
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
 * Emit the deprecation warning to STDERR. Format mirrors the
 * `[onto:config]` / `[topology]` prefix conventions used elsewhere.
 *
 * Silent when `topology_priority_set` — the principal has migrated and
 * may retain legacy fields as historical artifacts. Silent when nothing
 * is detected.
 */
export function emitLegacyFieldDeprecation(
  config: OntoConfig,
  detection: LegacyUsageDetection,
): void {
  if (detection.detected.length === 0) return;
  if (detection.topology_priority_set) return;

  const lines: string[] = [];
  lines.push(
    "[onto:deprecation] Legacy provider profile 필드가 사용되었습니다. " +
      "Sketch v3 기반의 `execution_topology_priority` 로 마이그레이션 하세요.",
  );
  for (const field of detection.detected) {
    const value = String((config as Record<string, unknown>)[field]);
    lines.push(
      `[onto:deprecation]   - ${field}=${value} → 권장 topology: ${suggestTopologyFor(field, value)}`,
    );
  }
  lines.push(
    "[onto:deprecation] Migration guide: docs/topology-migration-guide.md",
  );
  lines.push(
    "[onto:deprecation] 현재 호환 유지 중 — 필드 제거 시점은 후속 PR 에서 공지.",
  );
  process.stderr.write(lines.join("\n") + "\n");
}

/**
 * Convenience wrapper: detect + emit in one call. Intended entrypoint for
 * `resolveConfigChain()`.
 */
export function checkAndEmitLegacyDeprecation(config: OntoConfig): LegacyUsageDetection {
  const detection = detectLegacyFieldUsage(config);
  emitLegacyFieldDeprecation(config, detection);
  return detection;
}
