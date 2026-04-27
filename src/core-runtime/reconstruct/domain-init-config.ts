// runtime-mirror-of: step-4-integration §5.6 + §5.6.1 + §5.6.3
//
// `onto domain init <name> --config <path>` non-interactive runtime (W-A-96).
// Companion to W-A-95 (interactive). All 3 branches (init / migrate-existing /
// regenerate) accept --config path; this module loads + validates the config
// and writes the manifest using W-A-95 helpers (atomic write + backup).
//
// Failure codes (Step 4 §5.6.3 canonical):
//   - config_schema_invalid             — required field missing / type invalid
//   - manifest_version_format_invalid   — domain_manifest_version semver fail
//   - manifest_version_not_incremented  — regenerate non-bump
//   - manifest_already_exists           — init / migrate-existing branch precondition
//   - manifest_absent_for_regenerate    — regenerate branch precondition

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as yamlParse } from "yaml";

import {
  backupExistingManifest,
  writeManifestAtomic,
  type DomainInitArgs,
} from "./domain-init-cli.js";
import {
  compareDomainManifestVersion,
  isValidDomainManifestVersion,
  parseDomainManifestVersion,
} from "./manifest-semver.js";
import {
  computeVersionHash,
  type ManifestForHash,
  type ReferencedFileEntry,
} from "./manifest-version-hash.js";
import {
  preLoadManifest,
  SUPPORTED_MANIFEST_SCHEMA_VERSIONS,
  type ParsedManifest,
} from "./pre-load-gate.js";

export interface DomainInitConfigDeps {
  ontoHome: string;
  now: () => Date;
}

export type DomainInitConfigResult =
  | { ok: true; manifestPath: string; backupPath: string | null }
  | { ok: false; code: DomainInitConfigErrorCode; detail: string };

export type DomainInitConfigErrorCode =
  | "config_schema_invalid"
  | "manifest_version_format_invalid"
  | "manifest_version_not_incremented"
  | "manifest_already_exists"
  | "manifest_absent_for_regenerate";

interface DomainInitConfigYaml {
  name: string;
  domain_manifest_version: string;
  referenced_files: ReferencedFileEntry[];
  quality_tier: string;
  upgrade_status: string;
  notes?: string;
}

const REQUIRED_CONFIG_FIELDS = [
  "name",
  "domain_manifest_version",
  "referenced_files",
  "quality_tier",
  "upgrade_status",
] as const;

const VALID_TIERS = new Set(["full", "partial", "minimal"]);
const VALID_UPGRADE_STATUS = new Set([
  "completed",
  "in_progress",
  "not_started",
]);

/**
 * Validates a config YAML payload against §5.6 schema.
 * Returns ok with the typed config, or schema_invalid with a specific detail.
 *
 * Note: domain_manifest_version semver grammar is checked separately
 * (manifest_version_format_invalid is a distinct §5.6.3 code).
 */
export function validateDomainInitConfig(
  payload: unknown,
):
  | { ok: true; config: DomainInitConfigYaml }
  | { ok: false; detail: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, detail: "config top-level must be a mapping" };
  }
  const obj = payload as Record<string, unknown>;

  const missing = REQUIRED_CONFIG_FIELDS.filter(
    (f) => obj[f] === undefined || obj[f] === null,
  );
  if (missing.length > 0) {
    return {
      ok: false,
      detail: `required field missing: ${missing.join(", ")}`,
    };
  }

  if (typeof obj.name !== "string" || obj.name === "") {
    return { ok: false, detail: "name must be a non-empty string" };
  }
  if (typeof obj.domain_manifest_version !== "string") {
    return { ok: false, detail: "domain_manifest_version must be a string" };
  }
  if (typeof obj.quality_tier !== "string" || !VALID_TIERS.has(obj.quality_tier)) {
    return {
      ok: false,
      detail: `quality_tier must be one of ${[...VALID_TIERS].join(" | ")}`,
    };
  }
  if (
    typeof obj.upgrade_status !== "string" ||
    !VALID_UPGRADE_STATUS.has(obj.upgrade_status)
  ) {
    return {
      ok: false,
      detail: `upgrade_status must be one of ${[...VALID_UPGRADE_STATUS].join(" | ")}`,
    };
  }
  if (!Array.isArray(obj.referenced_files) || obj.referenced_files.length === 0) {
    return {
      ok: false,
      detail: "referenced_files must be a non-empty array",
    };
  }
  for (let i = 0; i < obj.referenced_files.length; i++) {
    const entry = obj.referenced_files[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, detail: `referenced_files[${i}] must be a mapping` };
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.path !== "string" || e.path === "") {
      return {
        ok: false,
        detail: `referenced_files[${i}].path must be a non-empty string`,
      };
    }
    if (typeof e.required !== "boolean") {
      return {
        ok: false,
        detail: `referenced_files[${i}].required must be a boolean`,
      };
    }
    if (
      e.min_headings !== undefined &&
      e.min_headings !== null &&
      typeof e.min_headings !== "number"
    ) {
      return {
        ok: false,
        detail: `referenced_files[${i}].min_headings must be number | null | absent`,
      };
    }
  }
  if (obj.notes !== undefined && typeof obj.notes !== "string") {
    return { ok: false, detail: "notes must be a string when present" };
  }

  return { ok: true, config: obj as unknown as DomainInitConfigYaml };
}

/**
 * Non-interactive equivalent of W-A-95's runDomainInit.
 * 3 branches share the same config-driven flow, differing only in pre-existing
 * manifest precondition + comparator gate.
 */
export async function runDomainInitFromConfig(
  args: DomainInitArgs,
  configPath: string,
  deps: DomainInitConfigDeps,
): Promise<DomainInitConfigResult> {
  const packDir = join(deps.ontoHome, "domains", args.domainName);
  const manifestPath = join(packDir, "manifest.yaml");
  const manifestExists = existsSync(manifestPath);

  // branch precondition
  if (args.branch === "init" && manifestExists) {
    return {
      ok: false,
      code: "manifest_already_exists",
      detail: `Manifest already exists at ${manifestPath}. Use --regenerate to regenerate.`,
    };
  }
  if (args.branch === "migrate-existing" && manifestExists) {
    return {
      ok: false,
      code: "manifest_already_exists",
      detail: `Manifest already exists at ${manifestPath}. Use --regenerate.`,
    };
  }
  if (args.branch === "regenerate" && !manifestExists) {
    return {
      ok: false,
      code: "manifest_absent_for_regenerate",
      detail: `Manifest not found at ${manifestPath}. Use --migrate-existing for a legacy pack.`,
    };
  }

  // load + parse config
  if (!existsSync(configPath)) {
    return {
      ok: false,
      code: "config_schema_invalid",
      detail: `config file not found: ${configPath}`,
    };
  }
  let parsed: unknown;
  try {
    parsed = yamlParse(readFileSync(configPath, "utf8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      code: "config_schema_invalid",
      detail: `YAML parse error in ${configPath}: ${msg}`,
    };
  }

  const validated = validateDomainInitConfig(parsed);
  if (!validated.ok) {
    return {
      ok: false,
      code: "config_schema_invalid",
      detail: validated.detail,
    };
  }
  const config = validated.config;

  // Identity SSOT: config.name must match args.domainName (review F1).
  // Without this check, config.name was an orphan field — declared required
  // by §5.6 schema but ignored at manifest write (which used args.domainName).
  // Now both must agree, eliminating the dual-authority ambiguity flagged by
  // 6 review lenses.
  if (config.name !== args.domainName) {
    return {
      ok: false,
      code: "config_schema_invalid",
      detail: `config.name="${config.name}" does not match CLI domain name "${args.domainName}" (identity SSOT)`,
    };
  }

  // semver grammar (§5.6.1) — distinct §5.6.3 code
  if (!isValidDomainManifestVersion(config.domain_manifest_version)) {
    return {
      ok: false,
      code: "manifest_version_format_invalid",
      detail: `domain_manifest_version "${config.domain_manifest_version}" does not match grammar`,
    };
  }

  // regenerate: backup + bump comparator
  let backupPath: string | null = null;
  let priorWasMalformed = false;
  if (args.branch === "regenerate") {
    backupPath = backupExistingManifest(packDir, manifestPath, deps.now());
    const preLoad = preLoadManifest(packDir);
    if (preLoad.ok) {
      const newSv = parseDomainManifestVersion(config.domain_manifest_version)!;
      const oldSv = parseDomainManifestVersion(
        preLoad.manifest.domain_manifest_version,
      )!;
      if (compareDomainManifestVersion(newSv, oldSv) <= 0) {
        return {
          ok: false,
          code: "manifest_version_not_incremented",
          detail: `new "${config.domain_manifest_version}" must be > prior "${preLoad.manifest.domain_manifest_version}"`,
        };
      }
    } else if (preLoad.code === "manifest_malformed") {
      priorWasMalformed = true; // §5.4.1 r7 — comparator skip on malformed recovery
    }
    // remove original so atomic write proceeds cleanly
    if (existsSync(manifestPath)) {
      const fs = await import("node:fs");
      fs.unlinkSync(manifestPath);
    }
  }

  // build + write manifest
  const referenced_files: ReferencedFileEntry[] = config.referenced_files.map(
    (entry) => {
      const out: ReferencedFileEntry = {
        path: entry.path,
        required: entry.required,
      };
      if (entry.min_headings !== undefined && entry.min_headings !== null) {
        out.min_headings = entry.min_headings;
      }
      return out;
    },
  );
  const manifestForHash: ManifestForHash = {
    quality_tier: config.quality_tier,
    referenced_files,
  };
  const version_hash = computeVersionHash(manifestForHash, packDir);

  const manifest: ParsedManifest = {
    manifest_schema_version: SUPPORTED_MANIFEST_SCHEMA_VERSIONS[
      SUPPORTED_MANIFEST_SCHEMA_VERSIONS.length - 1
    ] as string,
    domain_name: args.domainName,
    domain_manifest_version: config.domain_manifest_version,
    referenced_files,
    quality_tier: config.quality_tier,
    version_hash,
    notes: config.notes ?? "",
    upgrade_status: config.upgrade_status,
    last_updated: deps.now().toISOString(),
    recovery_from_malformed:
      args.branch === "regenerate" ? priorWasMalformed : false,
  };

  writeManifestAtomic(manifestPath, manifest);
  return { ok: true, manifestPath, backupPath };
}
