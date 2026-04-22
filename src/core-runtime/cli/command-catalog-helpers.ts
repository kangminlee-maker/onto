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

import {
  CURRENT_CATALOG_VERSION,
  META_NAME_REGISTRY,
  type CatalogEntry,
  type CommandCatalog,
} from "./command-catalog.js";

// ---------------------------------------------------------------------------
// DispatchTarget + NormalizedInvocationSet (design doc §4.7)
// ---------------------------------------------------------------------------

export type DispatchTarget =
  | {
      entry_kind: "public";
      identity: string;
      realization_kind: "slash" | "cli" | "patterned_slash";
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
      for (const r of entry.realizations) {
        if (r.kind === "slash" || r.kind === "cli") {
          addOrThrow(set, r.invocation, {
            entry_kind: "public",
            identity,
            realization_kind: r.kind,
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
              realization_kind: r.kind,
            });
          }
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
    }
    // RuntimeScriptEntry: outside normalized invocation set (design §4.7)
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
  const parts = (s: string): number[] =>
    s.split(".").map((p) => Number.parseInt(p, 10));
  const av = parts(a);
  const bv = parts(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

export function assertDeprecationLifecycle(catalog: CommandCatalog): void {
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
  }
}

// ---------------------------------------------------------------------------
// repair_path → preboot constraint (design doc §4.3)
// ---------------------------------------------------------------------------

export function assertRepairPathPreboot(catalog: CommandCatalog): void {
  for (const entry of catalog.entries) {
    if (entry.kind !== "public") continue;
    if (entry.repair_path === true && entry.phase !== "preboot") {
      throw new Error(
        `repair_path constraint violation: PublicEntry "${entry.identity}" ` +
          `has repair_path=true but phase="${entry.phase}". ` +
          `repair_path requires phase="preboot".`,
      );
    }
  }
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
// Alias collision (design doc §4.3 — Common.aliases union)
// ---------------------------------------------------------------------------

export function assertNoAliasCollision(catalog: CommandCatalog): void {
  const seen = new Map<string, string>();
  for (const entry of catalog.entries) {
    if (!entry.aliases) continue;
    for (const alias of entry.aliases) {
      if (seen.has(alias)) {
        throw new Error(
          `Alias collision: "${alias}" claimed by both ` +
            `"${seen.get(alias)}" and "${entryName(entry)}".`,
        );
      }
      seen.set(alias, entryName(entry));
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
// Single entry point — runs all runtime-load assertions
// ---------------------------------------------------------------------------

export function validateCatalog(catalog: CommandCatalog): void {
  assertCatalogVersionSupported(catalog);
  assertEntryRealizationsNonEmpty(catalog);
  assertReservedNamespaceUnused(catalog);
  assertNoRuntimeScriptCollision(catalog);
  assertMetaNameRegistered(catalog);
  assertSuccessorReferenceExists(catalog);
  assertRuntimeScriptsReferenceExists(catalog);
  assertDeprecationLifecycle(catalog);
  assertRepairPathPreboot(catalog);
  assertNoAliasCollision(catalog);
  // getNormalizedInvocationSet 호출 자체가 invariant 검증 (collision throw)
  getNormalizedInvocationSet(catalog);
}
