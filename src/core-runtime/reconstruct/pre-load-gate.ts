// runtime-mirror-of: step-4-integration §5.4.2 + §5.5
//
// Domain pack manifest pre-load gate. Step 4 §5.4.2 canonical.
//
// Sequential halt conditions (parse-first, hash-last per §5.4.2):
//   1. YAML parse fail / file missing                       → manifest_malformed
//   2. Top-level non-mapping                                → manifest_malformed
//   3. Required field missing (6 fields per §5.4.2 r6)      → manifest_malformed
//   4. manifest_schema_version unsupported (§5.7)           → manifest_malformed
//   5. referenced_files structural type error               → manifest_malformed
//   6. Identity mismatch (basename(packDir) ≠ domain_name)  → manifest_identity_mismatch
//   7. domain_manifest_version semver grammar invalid (§5.6.1) → manifest_version_format_invalid
//   7.5. required:true file existence (review F2, §5.5 line 1234) → manifest_malformed
//   8. version_hash recompute (§5.5) ≠ stored               → manifest_version_hash_mismatch

import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse as yamlParse } from "yaml";

import { isValidDomainManifestVersion } from "./manifest-semver.js";
import {
  computeVersionHash,
  type ManifestForHash,
  type ReferencedFileEntry,
} from "./manifest-version-hash.js";

export const SUPPORTED_MANIFEST_SCHEMA_VERSIONS = ["1.0"] as const;

const REQUIRED_FIELDS = [
  "manifest_schema_version",
  "domain_name",
  "domain_manifest_version",
  "referenced_files",
  "quality_tier",
  "version_hash",
] as const;

export type PreLoadFailureCode =
  | "manifest_malformed"
  | "manifest_identity_mismatch"
  | "manifest_version_format_invalid"
  | "manifest_version_hash_mismatch";

export interface ParsedManifest {
  manifest_schema_version: string;
  domain_name: string;
  domain_manifest_version: string;
  referenced_files: ReferencedFileEntry[];
  quality_tier: string;
  version_hash: string;
  recovery_from_malformed?: boolean;
  notes?: string;
  upgrade_status?: string;
  last_updated?: string;
}

export type PreLoadGateResult =
  | { ok: true; manifest: ParsedManifest }
  | { ok: false; code: PreLoadFailureCode; detail: string };

/**
 * Loads packDir/manifest.yaml and validates pre-load invariants.
 * packDir = directory containing manifest.yaml (basename = expected domain_name).
 *
 * Sequencing matters: parse-time errors must fire before identity (which needs
 * domain_name field) and before hash recompute (which is the most expensive
 * check). §5.4.2 r6: "두 halt 모두 version_hash 계산 이전에 발생".
 */
export function preLoadManifest(packDir: string): PreLoadGateResult {
  const manifestPath = join(packDir, "manifest.yaml");

  // 1. file presence
  if (!existsSync(manifestPath)) {
    return malformed(`manifest.yaml not found at ${manifestPath}`);
  }

  // 1. YAML parse
  const raw = readFileSync(manifestPath, "utf8");
  let parsed: unknown;
  try {
    parsed = yamlParse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return malformed(`YAML parse error: ${msg}`);
  }

  // 2. top-level mapping
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return malformed("manifest.yaml top-level must be a mapping");
  }
  const obj = parsed as Record<string, unknown>;

  // 3. required field check (6 fields per §5.4.2 r6)
  const missing = REQUIRED_FIELDS.filter(
    (f) => obj[f] === undefined || obj[f] === null,
  );
  if (missing.length > 0) {
    return malformed(`required field missing: ${missing.join(", ")}`);
  }

  // 4. manifest_schema_version supported_list (§5.7)
  const schemaVersion = obj.manifest_schema_version;
  if (
    typeof schemaVersion !== "string" ||
    !SUPPORTED_MANIFEST_SCHEMA_VERSIONS.includes(
      schemaVersion as (typeof SUPPORTED_MANIFEST_SCHEMA_VERSIONS)[number],
    )
  ) {
    return malformed(
      `unsupported manifest_schema_version "${String(schemaVersion)}" (supported: ${SUPPORTED_MANIFEST_SCHEMA_VERSIONS.join(", ")})`,
    );
  }

  // 5. referenced_files structural type check
  if (!Array.isArray(obj.referenced_files)) {
    return malformed("referenced_files must be an array");
  }
  for (let i = 0; i < obj.referenced_files.length; i++) {
    const entry = obj.referenced_files[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return malformed(`referenced_files[${i}] must be a mapping`);
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.path !== "string" || typeof e.required !== "boolean") {
      return malformed(
        `referenced_files[${i}] requires { path: string, required: boolean }`,
      );
    }
    if (
      e.min_headings !== undefined &&
      e.min_headings !== null &&
      typeof e.min_headings !== "number"
    ) {
      return malformed(
        `referenced_files[${i}].min_headings must be number | null | absent`,
      );
    }
  }

  // additional structural type checks for fields that drive identity / semver / hash
  if (typeof obj.domain_name !== "string") {
    return malformed("domain_name must be a string");
  }
  if (typeof obj.quality_tier !== "string") {
    return malformed("quality_tier must be a string");
  }
  if (typeof obj.version_hash !== "string") {
    return malformed("version_hash must be a string");
  }

  // 6. identity check (path ↔ domain_name) — §5.4.2 manifest_identity_mismatch
  const expectedDomainName = basename(packDir);
  if (obj.domain_name !== expectedDomainName) {
    return {
      ok: false,
      code: "manifest_identity_mismatch",
      detail: `path basename "${expectedDomainName}" != manifest.domain_name "${obj.domain_name}"`,
    };
  }

  // 7. semver grammar (§5.6.1) — manifest_version_format_invalid
  if (!isValidDomainManifestVersion(obj.domain_manifest_version)) {
    return {
      ok: false,
      code: "manifest_version_format_invalid",
      detail: `domain_manifest_version "${String(obj.domain_manifest_version)}" does not match grammar MAJOR.MINOR.PATCH (no leading zeros, no v-prefix, no pre-release)`,
    };
  }

  // 7.5. required:true file existence check (review F2, §5.5 line 1234)
  // spec: "file_hash = '__missing__'  # required: false 인 경우 정상,
  //         required: true 는 halt"
  // hash recompute 이전에 enforce — sentinel-based hash 가 missing file 을
  // stable 하게 hash 하므로 hash compare 가 이 violation 을 catch 못 함.
  // 3 review lens 합의 (structure + dependency + coverage).
  for (const entry of obj.referenced_files as ReferencedFileEntry[]) {
    if (entry.required) {
      const absolute = join(packDir, entry.path);
      if (!existsSync(absolute)) {
        return malformed(
          `required file "${entry.path}" missing at ${absolute} (referenced_files[].required=true)`,
        );
      }
    }
  }

  // 8. version_hash recompute + compare — manifest_version_hash_mismatch
  const manifestForHash: ManifestForHash = {
    quality_tier: obj.quality_tier,
    referenced_files: obj.referenced_files as ReferencedFileEntry[],
  };
  const recomputed = computeVersionHash(manifestForHash, packDir);
  if (recomputed !== obj.version_hash) {
    return {
      ok: false,
      code: "manifest_version_hash_mismatch",
      detail: `stored version_hash "${obj.version_hash}" != recomputed "${recomputed}"`,
    };
  }

  return { ok: true, manifest: obj as unknown as ParsedManifest };
}

function malformed(detail: string): PreLoadGateResult {
  return { ok: false, code: "manifest_malformed", detail };
}
