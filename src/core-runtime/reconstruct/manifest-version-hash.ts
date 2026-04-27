// runtime-mirror-of: step-4-integration §5.5
//
// Domain pack manifest version_hash canonical algorithm.
// Producer for: W-A-95/96 (CLI atomic write), W-A-99 (pre-load gate mismatch detection).
//
// hash input boundary (Step 4 §5.5 r2 canonical):
//   - quality_tier (pack-spec)
//   - referenced_files_spec — { path, required, min_headings? } sorted by path (pack-spec)
//   - referenced_files_snapshot — { path -> sha256(file_bytes) } per classified path (pack-content)
// excluded:
//   - domain_name (pre-load gate is primary guard)
//   - manifest_schema_version (schema-only migration must not invalidate hash)
//   - version_hash (self-cycle elimination)
//   - recovery_from_malformed (audit signal, not pack semantic)
//   - domain_manifest_version (semver guard at §5.6.1)
//   - notes / upgrade_status / last_updated (Unenforced soft)
//   - manifest.yaml itself
//   - non-classified files in pack directory (auxiliary changes do not invalidate)

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";

import { contentHash } from "../scope-runtime/hash.js";

export const HASH_ALGORITHM = "sha256" as const;
export const VERSION_HASH_PREFIX = "sha256:" as const;
export const MISSING_FILE_SENTINEL = "__missing__" as const;

export interface ReferencedFileEntry {
  path: string;
  required: boolean;
  min_headings?: number | null;
}

export interface ManifestForHash {
  quality_tier: string;
  referenced_files: ReferencedFileEntry[];
}

/**
 * Canonical YAML serialization for hash input.
 *
 * Step 4 §5.5 specifies "js-yaml dump with {sortKeys: true, noRefs: true, lineWidth: -1}".
 * This project uses yaml v2 (eemeli) — semantically equivalent options:
 *   - sortMapEntries: true     ↔ js-yaml sortKeys: true     (deterministic key order)
 *   - lineWidth: 0             ↔ js-yaml lineWidth: -1      (no folding)
 *   - aliasDuplicateObjects: false ↔ js-yaml noRefs: true   (no anchors/aliases)
 */
export function canonicalYaml(value: unknown): string {
  return yamlStringify(value, {
    sortMapEntries: true,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
}

/**
 * pack-spec snapshot: referenced_files projected to { path, required, min_headings? },
 * sorted lexicographically by path.
 *
 * min_headings = null or undefined is omitted from the canonical representation
 * (Step 4 §5.5: "min_headings = null 인 경우 canonical representation 은 field 생략").
 */
export function computePackSpec(
  manifest: ManifestForHash,
): ReferencedFileEntry[] {
  const sorted = [...manifest.referenced_files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  return sorted.map((entry) => {
    const projected: ReferencedFileEntry = {
      path: entry.path,
      required: entry.required,
    };
    if (entry.min_headings !== undefined && entry.min_headings !== null) {
      projected.min_headings = entry.min_headings;
    }
    return projected;
  });
}

/**
 * pack-content map: per classified path, sha256(file bytes) hex digest.
 * Missing file → MISSING_FILE_SENTINEL. Caller (W-A-99 pre-load gate) decides
 * whether required=true + missing should halt with manifest_malformed.
 *
 * paths are resolved relative to packDir (~/.onto/domains/{name}/).
 */
export function computePackContentMap(
  manifest: ManifestForHash,
  packDir: string,
): Record<string, string> {
  const sortedPaths = manifest.referenced_files
    .map((f) => f.path)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const map: Record<string, string> = {};
  for (const filePath of sortedPaths) {
    const absolute = join(packDir, filePath);
    if (existsSync(absolute)) {
      const bytes = readFileSync(absolute);
      map[filePath] = contentHash(bytes);
    } else {
      map[filePath] = MISSING_FILE_SENTINEL;
    }
  }
  return map;
}

/**
 * Canonical version_hash:
 *   "sha256:" + hex(sha256(canonical_yaml({
 *     quality_tier,
 *     referenced_files_spec,         # pack-spec
 *     referenced_files_snapshot      # pack-content
 *   })))
 */
export function computeVersionHash(
  manifest: ManifestForHash,
  packDir: string,
): string {
  const referenced_files_snapshot = computePackContentMap(manifest, packDir);
  const referenced_files_spec = computePackSpec(manifest);

  const hashInput = canonicalYaml({
    quality_tier: manifest.quality_tier,
    referenced_files_spec,
    referenced_files_snapshot,
  });

  const digest = createHash(HASH_ALGORITHM).update(hashInput).digest("hex");
  return `${VERSION_HASH_PREFIX}${digest}`;
}
