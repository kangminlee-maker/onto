/**
 * Command Catalog Helpers (Phase 1 P1-1a, 2026-04-23)
 *
 * Runtime invariant assertions + getNormalizedInvocationSet (single source).
 *
 * Design authority:
 *   `development-records/evolve/20260423-phase-1-catalog-ssot-design.md`
 *   §4.3 (invariants), §4.6 (helpers), §4.7 (normalized set)
 *
 * Note on circular import: this file uses `import type` only from
 * `command-catalog.ts`. TypeScript erases type-only imports at runtime,
 * so command-catalog.ts (which value-imports `validateCatalog` from this
 * file) does not create a runtime cycle.
 */

import path from "node:path";
import {
  CURRENT_CATALOG_VERSION,
  META_NAME_REGISTRY,
} from "./catalog-meta.js";
import type {
  CatalogEntry,
  CliRealization,
  CommandCatalog,
  PublicEntry,
} from "./command-catalog.js";

// ---------------------------------------------------------------------------
// Module-level constants — declared at the top so circular-import callers
// (e.g., command-catalog.ts auto-validate on load) cannot hit a TDZ before
// these initialize. P1-3 surfaced this when dispatcher.ts imported
// `getNormalizedInvocationSet` which forced helpers.ts to evaluate, then
// command-catalog.ts's bottom `validateCatalog(...)` ran while helpers.ts
// was still in its imports — `MANAGED_TREE_RELATIVE` was uninitialized.
// ---------------------------------------------------------------------------

const MANAGED_TREE_RELATIVE = ".onto/commands/";

// ---------------------------------------------------------------------------
// DispatchTarget + NormalizedInvocationSet (design doc §4.7)
// ---------------------------------------------------------------------------

/**
 * P2-B (RFC-1 §4.2.1 — type-level invariant): `canonical_cli_invocation`
 * 은 CLI realization 한정. slash / patterned_slash target 에는 미부여.
 * meta target 도 별 axis (cli realization 없음). dispatcher 의 access 자체가
 * 컴파일 시점에 강제됨 — alias key 도 canonical_cli_invocation 보유.
 */
export type DispatchTarget =
  | {
      entry_kind: "public";
      identity: string;
      realization_kind: "cli";
      canonical_cli_invocation: string;
    }
  | {
      entry_kind: "public";
      identity: string;
      realization_kind: "slash" | "patterned_slash";
    }
  | {
      entry_kind: "meta";
      name: string;
      realization_kind?: "long_flag" | "short_flag";
    };

export type NormalizedInvocationSet = Map<string, DispatchTarget>;

const BARE_ONTO_SENTINEL = "<<bare>>" as const;

function addOrThrow(
  set: NormalizedInvocationSet,
  key: string,
  target: DispatchTarget,
): void {
  if (set.has(key)) {
    const existing = set.get(key);
    throw new Error(
      `Normalized invocation collision: "${key}" already mapped. ` +
        `existing=${JSON.stringify(existing)}, new=${JSON.stringify(target)}`,
    );
  }
  set.set(key, target);
}

export function getNormalizedInvocationSet(
  catalog: CommandCatalog,
): NormalizedInvocationSet {
  const set: NormalizedInvocationSet = new Map();

  for (const entry of catalog.entries) {
    if (entry.kind === "public") {
      const identity = entry.identity;
      // P2-B: collect cli realizations once for canonical lookup + alias invariant.
      const cliRealizations = entry.realizations.filter(
        (r): r is CliRealization => r.kind === "cli",
      );

      for (const r of entry.realizations) {
        if (r.kind === "cli") {
          addOrThrow(set, r.invocation, {
            entry_kind: "public",
            identity,
            realization_kind: "cli",
            canonical_cli_invocation: r.invocation,
          });
        } else if (r.kind === "slash") {
          addOrThrow(set, r.invocation, {
            entry_kind: "public",
            identity,
            realization_kind: "slash",
          });
        } else {
          // patterned_slash: expand parameter_set
          for (const param of r.parameter_set) {
            const expanded = r.invocation_pattern.replace(
              `{${r.parameter_name}}`,
              param,
            );
            addOrThrow(set, expanded, {
              entry_kind: "public",
              identity,
              realization_kind: "patterned_slash",
            });
          }
        }
      }

      // P2-B (RFC-1 §4.2.1): aliases NORMALIZED projection — single-cli only.
      if (entry.aliases !== undefined && entry.aliases.length > 0) {
        if (cliRealizations.length === 0) {
          throw new Error(
            `Aliases on PublicEntry "${identity}" require ≥1 CliRealization. ` +
              `Slash-only entries cannot carry aliases (RFC-1 §4.2.2).`,
          );
        }
        if (cliRealizations.length > 1) {
          throw new Error(
            `Aliases on multi-CLI PublicEntry "${identity}" not supported in this RFC scope. ` +
              `Canonical resolution requires explicit canonical declaration — future seam (RFC-1 §11).`,
          );
        }
        const canonical = cliRealizations[0]!.invocation;
        for (const alias of entry.aliases) {
          addOrThrow(set, alias, {
            entry_kind: "public",
            identity,
            realization_kind: "cli",
            canonical_cli_invocation: canonical,
          });
        }
      }
    } else if (entry.kind === "meta") {
      for (const r of entry.realizations) {
        addOrThrow(set, r.invocation, {
          entry_kind: "meta",
          name: entry.name,
          realization_kind: r.kind,
        });
      }
      if (entry.default_for === "bare_onto") {
        addOrThrow(set, BARE_ONTO_SENTINEL, {
          entry_kind: "meta",
          name: entry.name,
        });
      }
      // P2-B: meta entry 의 aliases 는 schema 에 부재 (Common.aliases 가
      // PublicEntry 로 이전 후). 추가 alternate invocation 은 long_flag /
      // short_flag realization 으로 표현 (RFC-1 §4.2.2).
    }
    // RuntimeScriptEntry: outside normalized invocation set (design §4.7).
    // aliases schema 도 부재 (PublicEntry-only).
  }

  return set;
}

// ---------------------------------------------------------------------------
// Reserved namespace protection (design doc §4.3)
// ---------------------------------------------------------------------------

function isReservedInvocation(invocation: string): boolean {
  return invocation.startsWith("<<") || invocation.startsWith(">>");
}

export function assertReservedNamespaceUnused(catalog: CommandCatalog): void {
  for (const entry of catalog.entries) {
    if (entry.kind === "public") {
      for (const r of entry.realizations) {
        const inv = r.kind === "patterned_slash" ? r.invocation_pattern : r.invocation;
        if (isReservedInvocation(inv)) {
          throw new Error(
            `Reserved namespace violation: "${inv}" in PublicEntry "${entry.identity}". ` +
              `Invocations starting with "<<" or ">>" are reserved for sentinels.`,
          );
        }
      }
    } else if (entry.kind === "meta") {
      for (const r of entry.realizations) {
        if (isReservedInvocation(r.invocation)) {
          throw new Error(
            `Reserved namespace violation: "${r.invocation}" in MetaEntry "${entry.name}".`,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// RuntimeScriptEntry name uniqueness (design doc §4.3)
// ---------------------------------------------------------------------------

export function assertNoRuntimeScriptCollision(catalog: CommandCatalog): void {
  const seen = new Set<string>();
  for (const entry of catalog.entries) {
    if (entry.kind !== "runtime_script") continue;
    if (seen.has(entry.name)) {
      throw new Error(
        `RuntimeScriptEntry collision: "${entry.name}" appears more than once.`,
      );
    }
    seen.add(entry.name);
  }
}

// ---------------------------------------------------------------------------
// MetaEntry.name registry membership (design doc §4.3)
// ---------------------------------------------------------------------------

export function assertMetaNameRegistered(catalog: CommandCatalog): void {
  const registered = new Set<string>(META_NAME_REGISTRY);
  for (const entry of catalog.entries) {
    if (entry.kind !== "meta") continue;
    if (!registered.has(entry.name)) {
      throw new Error(
        `MetaEntry.name "${entry.name}" not in META_NAME_REGISTRY ` +
          `[${[...registered].join(", ")}].`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// successor / runtime_scripts cross-reference (design doc §4.3)
// ---------------------------------------------------------------------------

function entryName(entry: CatalogEntry): string {
  if (entry.kind === "public") return entry.identity;
  return entry.name;
}

function collectAllNames(catalog: CommandCatalog): Set<string> {
  const names = new Set<string>();
  for (const entry of catalog.entries) {
    names.add(entryName(entry));
  }
  return names;
}

export function assertSuccessorReferenceExists(catalog: CommandCatalog): void {
  const allNames = collectAllNames(catalog);
  for (const entry of catalog.entries) {
    if (entry.successor && !allNames.has(entry.successor)) {
      throw new Error(
        `successor reference not found: entry "${entryName(entry)}" ` +
          `successor="${entry.successor}".`,
      );
    }
  }
}

export function assertRuntimeScriptsReferenceExists(
  catalog: CommandCatalog,
): void {
  const runtimeScriptNames = new Set<string>();
  for (const entry of catalog.entries) {
    if (entry.kind === "runtime_script") runtimeScriptNames.add(entry.name);
  }
  for (const entry of catalog.entries) {
    if (entry.kind !== "public" || !entry.runtime_scripts) continue;
    for (const ref of entry.runtime_scripts) {
      if (!runtimeScriptNames.has(ref)) {
        throw new Error(
          `runtime_scripts reference not found: PublicEntry "${entry.identity}" ` +
            `references runtime_script "${ref}".`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Deprecation lifecycle (design doc §4.3)
// ---------------------------------------------------------------------------

function compareSemver(a: string, b: string): number {
  // Inlined `parts` to avoid an esbuild __name-helper edge case observed when
  // dispatcher.ts (P1-3) imports this module via tsx — the named arrow form
  // tripped `TypeError: __name is not a function` at runtime even though
  // vitest's bundler handled it fine.
  const av = a.split(".").map((p) => Number.parseInt(p, 10));
  const bv = b.split(".").map((p) => Number.parseInt(p, 10));
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/**
 * R2-PR-2 (RFC-2 §4.3 fail-closed): dotted-integer 만 supported.
 * prerelease string ("0.3.0-rc.1"), build metadata ("0.3.0+abc"), 비-semver →
 * 미지원 → 호출처에서 explicit throw (skip 옵션 부재 — lifecycle gate gap 회피).
 */
function isSupportedSemver(version: string): boolean {
  return /^\d+(\.\d+)*$/.test(version);
}

export function assertDeprecationLifecycle(
  catalog: CommandCatalog,
  currentVersion?: string,
): void {
  for (const entry of catalog.entries) {
    if (entry.removed_in && !entry.deprecated_since) {
      throw new Error(
        `Deprecation lifecycle violation: entry "${entryName(entry)}" has ` +
          `removed_in="${entry.removed_in}" but no deprecated_since.`,
      );
    }
    if (
      entry.removed_in &&
      entry.deprecated_since &&
      compareSemver(entry.removed_in, entry.deprecated_since) <= 0
    ) {
      throw new Error(
        `Deprecation lifecycle violation: entry "${entryName(entry)}" ` +
          `removed_in="${entry.removed_in}" must be > ` +
          `deprecated_since="${entry.deprecated_since}".`,
      );
    }
    // R2-PR-2 (RFC-2 §4.2.1, §4.3): build-time cutover enforcement.
    // current version >= entry.removed_in → throw (catalog cleanup 강제).
    // unsupported semver string → fail-closed throw (skip 옵션 부재).
    if (entry.removed_in && currentVersion !== undefined) {
      if (!isSupportedSemver(currentVersion)) {
        throw new Error(
          `compareSemver does not support unsupported version "${currentVersion}" (current). ` +
            `Remove or normalize, or update prerelease/build-metadata semver policy ` +
            `(RFC-2 §8). removed_in check skipped without explicit policy = lifecycle gate gap.`,
        );
      }
      if (!isSupportedSemver(entry.removed_in)) {
        throw new Error(
          `compareSemver does not support unsupported version "${entry.removed_in}" ` +
            `(entry "${entryName(entry)}".removed_in). Remove or normalize, or update ` +
            `prerelease/build-metadata semver policy (RFC-2 §8).`,
        );
      }
      if (compareSemver(currentVersion, entry.removed_in) >= 0) {
        throw new Error(
          `Deprecation cutover reached: entry "${entryName(entry)}" has ` +
            `removed_in="${entry.removed_in}" but current version="${currentVersion}" >= removed_in. ` +
            `Remove from catalog before this release.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// R2-PR-2 (RFC-2 §4.2.1-4.2.3): Lifecycle policy + executor availability
// ---------------------------------------------------------------------------

/**
 * R2-PR-2 (RFC-2 §4.2.1): executor availability classification.
 * "present" = invocation-level non-placeholder dispatch availability — cli.ts main
 * case 가 실행 본문 보유 (placeholder error 아님). handler_module + handler_export
 * 의 존재는 Layer 0 prerequisite (RFC-1 check-handler-exports) 일 뿐.
 * "intentionally_absent" = catalog 의 historical_no_executor: true — declared 의도.
 * (broken handler refs 는 build-time check-handler-exports 가 reject — runtime
 * classification 영역 밖, RFC-2 §4.2.5)
 */
export type ExecutorAvailability = "present" | "intentionally_absent";

export function getCliExecutorAvailability(
  entry: PublicEntry,
): ExecutorAvailability {
  return entry.historical_no_executor === true ? "intentionally_absent" : "present";
}

/**
 * R2-PR-2 (RFC-2 §4.2.1): 4 lifecycle states. dispatcher 가 PublicEntry 진입 시
 * 호출하여 상태별 분기 (active / deprecated_with_executor → notice + dispatch /
 * deprecated_historical_no_executor → notice + return 1 / removed → defensive).
 */
export type LifecycleState =
  | "active"
  | "deprecated_with_executor"
  | "deprecated_historical_no_executor"
  | "removed_at_or_past_cutover";

export function getEntryLifecycleState(
  entry: PublicEntry,
  currentVersion: string,
  executorAvailability: ExecutorAvailability,
): LifecycleState {
  if (entry.removed_in !== undefined) {
    if (
      isSupportedSemver(currentVersion) &&
      isSupportedSemver(entry.removed_in) &&
      compareSemver(currentVersion, entry.removed_in) >= 0
    ) {
      return "removed_at_or_past_cutover";
    }
  }
  if (entry.deprecated_since === undefined) return "active";
  return executorAvailability === "present"
    ? "deprecated_with_executor"
    : "deprecated_historical_no_executor";
}

/**
 * R2-PR-2 (RFC-2 §4.2.1): dispatcher 의 lifecycle policy 분기 결과.
 * "continue" — 정상 dispatch / "notice_then_continue" — notice + dispatch /
 * "notice_then_exit" — notice + return 1 (cli.ts main 위임 안 함) /
 * "removed" — defensive (build-time throw 가 unreachable).
 */
export type LifecycleAction =
  | { kind: "continue" }
  | { kind: "notice_then_continue"; notice: string }
  | { kind: "notice_then_exit"; notice: string };

function formatDeprecationNotice(entry: PublicEntry): string {
  const name = entry.identity;
  const since = entry.deprecated_since ?? "";
  const successor = entry.successor;
  const base = `[onto] '${name}' is deprecated since ${since}.`;
  return successor !== undefined
    ? `${base} Use '${successor}' instead.\n`
    : `${base}\n`;
}

function formatRemovedNotice(entry: PublicEntry, currentVersion: string): string {
  return (
    `[onto] '${entry.identity}' was removed in ${entry.removed_in} (current ${currentVersion}). ` +
    `${entry.successor !== undefined ? `Use '${entry.successor}' instead. ` : ""}` +
    `(defensive — build-time throw should have prevented this state)\n`
  );
}

export function getLifecycleAction(
  entry: PublicEntry,
  currentVersion: string,
): LifecycleAction {
  const availability = getCliExecutorAvailability(entry);
  const state = getEntryLifecycleState(entry, currentVersion, availability);
  switch (state) {
    case "active":
      return { kind: "continue" };
    case "deprecated_with_executor":
      return { kind: "notice_then_continue", notice: formatDeprecationNotice(entry) };
    case "deprecated_historical_no_executor":
      return { kind: "notice_then_exit", notice: formatDeprecationNotice(entry) };
    case "removed_at_or_past_cutover":
      return { kind: "notice_then_exit", notice: formatRemovedNotice(entry, currentVersion) };
  }
}

/**
 * R2-PR-2 (RFC-2 §4.2.3 v7 — bidirectional invariant): static catalog↔cli-case
 * consistency. lifecycle interception (dispatcher pre-delegation ordering) 은 별
 * dispatcher behavior test 의 owner — 본 invariant 영역 밖.
 *
 * 4+1 조건 양방향:
 * 1. historical_no_executor: true → entry 가 PublicCliEntry (cli realization 보유)
 * 2. historical_no_executor: true → entry 가 deprecated_since 설정
 * 3. historical_no_executor: true → cli invocation 이 cliCases 에 부재
 * 4. historical_no_executor: false/미설정 + cli realization 보유 → cli.ts main 에 case 존재
 * 5. (4 의 일부 — non-placeholder body propagation): cliCases 입력은 "non-placeholder
 *    executor cases only" — placeholder error 본문 case 는 input 에 미포함, 즉 condition 4
 *    가 case 부재로 throw
 *
 * cliCases: cli.ts main switch 에서 non-placeholder executor 본문 보유 case 의 invocation set.
 */
export function assertHistoricalNoExecutorBidirectional(
  catalog: CommandCatalog,
  cliCases: ReadonlySet<string>,
): void {
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const cliInvocations = entry.realizations
      .filter((r): r is CliRealization => r.kind === "cli")
      .map((r) => r.invocation);
    const hasCli = cliInvocations.length > 0;

    if (entry.historical_no_executor === true) {
      // (1) transient PR-2 invariant — cli realization 보유 entry 만 (R2-PR-3 schema split 전)
      if (!hasCli) {
        throw new Error(
          `historical_no_executor invariant violation: PublicEntry "${entry.identity}" has ` +
            `historical_no_executor=true but no CliRealization. ` +
            `historical_no_executor requires cli realization (RFC-2 §4.2.3 transient invariant).`,
        );
      }
      // (2) deprecated_since 설정 강제
      if (entry.deprecated_since === undefined) {
        throw new Error(
          `historical_no_executor invariant violation: PublicEntry "${entry.identity}" has ` +
            `historical_no_executor=true but no deprecated_since. ` +
            `historical entries must be deprecated (RFC-2 §4.2.3 condition 2).`,
        );
      }
      // (3) cli.ts main case 부재 정합 — 둘 다 존재 시 owner 위반
      for (const inv of cliInvocations) {
        if (cliCases.has(inv)) {
          throw new Error(
            `historical_no_executor invariant violation: PublicEntry "${entry.identity}" has ` +
              `historical_no_executor=true but cli.ts main switch has case "${inv}" with non-placeholder body. ` +
              `Either remove the case or set historical_no_executor=false (RFC-2 §4.2.3 condition 3).`,
          );
        }
      }
    } else if (hasCli) {
      // (4 + 5) cli.ts main case 존재 + non-placeholder body 강제
      for (const inv of cliInvocations) {
        if (!cliCases.has(inv)) {
          throw new Error(
            `historical_no_executor invariant violation: PublicEntry "${entry.identity}" has ` +
              `cli realization "${inv}" but cli.ts main switch has no non-placeholder case for it. ` +
              `Either add the executor body or set historical_no_executor=true with deprecated_since ` +
              `(RFC-2 §4.2.3 condition 4).`,
          );
        }
      }
    }
  }
}

/**
 * R2-PR-2 (RFC-2 §4.2.3): cli.ts main switch 에서 non-placeholder executor 본문
 * 을 가진 case 의 invocation set 추출. assertHistoricalNoExecutorBidirectional 의
 * cliCases 입력으로 사용. R2-PR-2 가 placeholder 3 case (learn/ask/build) 제거한
 * 후라 현 시점 main switch 의 모든 case 가 non-placeholder.
 */
export function extractCliMainNonPlaceholderCases(cliSource: string): Set<string> {
  const cases = new Set<string>();
  // main 함수 본문 추출 (안정적 매칭 — async function main(...) { ... }\n}).
  const mainMatch = cliSource.match(
    /export\s+async\s+function\s+main\s*\([^)]*\)[^{]*\{([\s\S]*)/,
  );
  if (mainMatch === null) return cases;
  const body = mainMatch[1] ?? "";
  // case "X": 패턴 추출. 본 R2-PR-2 가 placeholder 제거한 후라 모두 non-placeholder.
  // 미래 placeholder 재도입 시 본 추출 로직을 case body 검사로 확장 (RFC-2 §4.2.3 v7).
  const caseRe = /case\s+"([^"]+)"\s*:/g;
  let m;
  while ((m = caseRe.exec(body)) !== null) {
    cases.add(m[1]!);
  }
  return cases;
}

// ---------------------------------------------------------------------------
// Realizations non-empty (design doc §4.3)
// ---------------------------------------------------------------------------

export function assertEntryRealizationsNonEmpty(catalog: CommandCatalog): void {
  for (const entry of catalog.entries) {
    if (entry.kind === "public" || entry.kind === "meta") {
      if (entry.realizations.length === 0) {
        throw new Error(
          `Empty realizations: ${entry.kind} entry "${entryName(entry)}" ` +
            `must have ≥1 realization.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Alias collision (RFC-1 §4.2.2 — alias ↔ 전체 invocation namespace cross-check)
// ---------------------------------------------------------------------------

/**
 * P2-B (RFC-1 §4.2.2): alias collision check 가 alias ↔ alias 만이 아니라
 * 전체 invocation namespace (cli / slash / meta long_flag/short_flag + alias)
 * cross-check. NORMALIZED 가 invocation 충돌은 catch 하지만, alias 도입 시점에
 * 명시적 invariant 로 사용자에게 명확한 error 메시지 제공.
 *
 * 또한 PublicEntry 한정 invariant 검증 — slash-only / multi-cli alias 는
 * getNormalizedInvocationSet 에서 throw (above), 본 함수는 alias 자체의
 * collision 만 검사.
 */
export function assertNoAliasCollision(catalog: CommandCatalog): void {
  // 1. invocation namespace 수집 — alias 와 충돌 검사 대상.
  const invocationOwners = new Map<string, string>();
  for (const entry of catalog.entries) {
    if (entry.kind === "public") {
      for (const r of entry.realizations) {
        const inv = r.kind === "patterned_slash" ? r.invocation_pattern : r.invocation;
        invocationOwners.set(inv, entryName(entry));
      }
    } else if (entry.kind === "meta") {
      for (const r of entry.realizations) {
        invocationOwners.set(r.invocation, entryName(entry));
      }
    }
  }

  // 2. alias 검사 — PublicEntry 한정 (Common 에서 이전 후 schema-narrow).
  const aliasOwners = new Map<string, string>();
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    if (entry.aliases === undefined) continue;
    for (const alias of entry.aliases) {
      // alias ↔ 다른 entry 의 invocation 충돌
      const invocationOwner = invocationOwners.get(alias);
      if (invocationOwner !== undefined && invocationOwner !== entryName(entry)) {
        throw new Error(
          `Alias collision: "${alias}" (alias of "${entryName(entry)}") collides ` +
            `with invocation owned by "${invocationOwner}".`,
        );
      }
      // alias ↔ 다른 alias 충돌
      const aliasOwner = aliasOwners.get(alias);
      if (aliasOwner !== undefined) {
        throw new Error(
          `Alias collision: "${alias}" claimed by both ` +
            `"${aliasOwner}" and "${entryName(entry)}".`,
        );
      }
      aliasOwners.set(alias, entryName(entry));
    }
  }
}

// ---------------------------------------------------------------------------
// catalog.version load gate (design doc §4.5)
// ---------------------------------------------------------------------------

export function assertCatalogVersionSupported(catalog: CommandCatalog): void {
  if (catalog.version !== CURRENT_CATALOG_VERSION) {
    throw new Error(
      `Unsupported catalog.version: declared=${catalog.version}, ` +
        `runtime supports=${CURRENT_CATALOG_VERSION}. ` +
        `Resolution: either downgrade the catalog to version ${CURRENT_CATALOG_VERSION}, ` +
        `or upgrade the runtime to a build that supports catalog.version ${catalog.version}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// PublicEntry.doc_template_id uniqueness (P1-2b plan §D9)
// ---------------------------------------------------------------------------

export function assertDocTemplateIdUnique(catalog: CommandCatalog): void {
  const seen = new Map<string, string>();
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    const id = entry.doc_template_id;
    const prior = seen.get(id);
    if (prior !== undefined) {
      throw new Error(
        `doc_template_id collision: "${id}" claimed by both ` +
          `"${prior}" and "${entry.identity}". Each PublicEntry must have a ` +
          `unique doc_template_id (plan §D9).`,
      );
    }
    seen.set(id, entry.identity);
  }
}

// ---------------------------------------------------------------------------
// prompt_body_ref managed-tree containment (P1-2b plan §D25)
// ---------------------------------------------------------------------------

/**
 * Asserts every SlashRealization's `prompt_body_ref` resolves inside
 * `.onto/commands/`. Uses path-resolution containment (not a prefix-only
 * string check) so traversal segments (`..`) are normalized first —
 * e.g., `.onto/commands/../elsewhere/x.md` fails.
 *
 * Resolution is done relative to a nominal root (`/`) rather than the actual
 * project root because (a) the catalog is evaluated at import time from
 * various CWDs, and (b) the invariant we want is "after resolution, the path
 * is inside `.onto/commands/`" — which is independent of project root.
 */
export function assertPromptBodyRefInManagedTree(
  catalog: CommandCatalog,
): void {
  // Use a fixed synthetic root so containment is a property of the ref string
  // itself, not of the caller's CWD. Node's `path.resolve` normalizes `..`.
  const root = path.resolve("/");
  const managed = path.resolve(root, MANAGED_TREE_RELATIVE);
  const managedPrefix = managed.endsWith(path.sep) ? managed : managed + path.sep;
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    for (const r of entry.realizations) {
      if (r.kind !== "slash" && r.kind !== "patterned_slash") continue;
      const ref = r.kind === "slash" ? r.prompt_body_ref : r.prompt_body_ref;
      const resolved = path.resolve(root, ref);
      if (resolved !== managed && !resolved.startsWith(managedPrefix)) {
        throw new Error(
          `prompt_body_ref escapes managed tree: entry "${entry.identity}" ` +
            `has realization prompt_body_ref="${ref}" which resolves to ` +
            `"${resolved}" — not inside "${managed}". plan §D25.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Single entry point — runs all runtime-load assertions
// ---------------------------------------------------------------------------

/**
 * R2-PR-2 (RFC-2): validateCatalog 가 currentVersion + cliMainCases 를 optional 로
 * 받아 lifecycle cutover + historical_no_executor invariant 까지 검증. 두 input 이
 * 미제공 시 (예: lightweight load — lazy validation) 해당 invariant skip — module-load
 * caller (command-catalog.ts) 는 fs read 후 명시 전달.
 */
export function validateCatalog(
  catalog: CommandCatalog,
  options?: {
    currentVersion?: string;
    cliMainCases?: ReadonlySet<string>;
  },
): void {
  assertCatalogVersionSupported(catalog);
  assertEntryRealizationsNonEmpty(catalog);
  assertReservedNamespaceUnused(catalog);
  assertNoRuntimeScriptCollision(catalog);
  assertMetaNameRegistered(catalog);
  assertSuccessorReferenceExists(catalog);
  assertRuntimeScriptsReferenceExists(catalog);
  assertDeprecationLifecycle(catalog, options?.currentVersion);
  assertNoAliasCollision(catalog);
  assertDocTemplateIdUnique(catalog);
  assertPromptBodyRefInManagedTree(catalog);
  if (options?.cliMainCases !== undefined) {
    assertHistoricalNoExecutorBidirectional(catalog, options.cliMainCases);
  }
  // getNormalizedInvocationSet 호출 자체가 invariant 검증 (collision throw)
  getNormalizedInvocationSet(catalog);
}
