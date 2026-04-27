// runtime-mirror-of: step-4-integration §5.3 + §5.4 + §5.4.1 + §5.4.2 + §5.5 + §5.6.1
//
// `onto domain init` CLI runtime. Step 4 §5 canonical (W-A-95).
//
// 3 interactive branches:
//   1. init               — `onto domain init <name>`              (new pack)
//   2. --migrate-existing — `onto domain init --migrate-existing <name>` (legacy pack, manifest absent)
//   3. --regenerate       — `onto domain init --regenerate <name>` (manifest exists, bytes-level backup + bump)
//
// --config <path> non-interactive branch is W-A-96 (separate module).
//
// Each branch produces a manifest.yaml via §5.3 7-step flow:
//   1. Scan ~/.onto/domains/{name}/*.md
//   2. Classify (required true/false per file)
//   3. quality_tier (full | partial | minimal)
//   4. upgrade_status + notes
//   5. domain_manifest_version (semver, default "0.1.0")
//   6. last_updated auto-populate (ISO 8601 UTC)
//   7. version_hash compute (W-A-97) + atomic write

import { readdirSync } from "node:fs";
import * as fs from "node:fs";
import { basename, join } from "node:path";
import { stringify as yamlStringify } from "yaml";

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

const CANONICAL_REQUIRED_FILES = [
  "concepts.md",
  "structure_spec.md",
  "logic_rules.md",
  "domain_scope.md",
] as const;

type Branch = "init" | "migrate-existing" | "regenerate";

export interface DomainInitArgs {
  branch: Branch;
  domainName: string;
}

export interface DomainInitDeps {
  ontoHome: string; // ~/.onto/
  io: ConsoleIo;
  now: () => Date;
}

export interface ConsoleIo {
  question(prompt: string): Promise<string>;
  log(line: string): void;
  error(line: string): void;
}

export type DomainInitResult =
  | { ok: true; manifestPath: string; backupPath: string | null }
  | { ok: false; code: DomainInitErrorCode; detail: string };

export type DomainInitErrorCode =
  | "empty_pack_directory"
  | "manifest_already_exists"
  | "manifest_absent_for_regenerate"
  | "manifest_version_not_incremented"
  | "user_aborted";

/**
 * Pure runner. Caller injects ontoHome / io / now. Test in-memory.
 */
export async function runDomainInit(
  args: DomainInitArgs,
  deps: DomainInitDeps,
): Promise<DomainInitResult> {
  const packDir = join(deps.ontoHome, "domains", args.domainName);
  const manifestPath = join(packDir, "manifest.yaml");
  const manifestExists = fs.existsSync(manifestPath);

  // branch precondition
  if (args.branch === "migrate-existing" && manifestExists) {
    return {
      ok: false,
      code: "manifest_already_exists",
      detail: `Manifest already exists at ${manifestPath}. Use 'onto domain init --regenerate ${args.domainName}' to regenerate interactively.`,
    };
  }
  if (args.branch === "regenerate" && !manifestExists) {
    return {
      ok: false,
      code: "manifest_absent_for_regenerate",
      detail: `Manifest not found at ${manifestPath}. Use 'onto domain init --migrate-existing ${args.domainName}' for a legacy pack.`,
    };
  }
  if (args.branch === "init" && manifestExists) {
    return {
      ok: false,
      code: "manifest_already_exists",
      detail: `Manifest already exists at ${manifestPath}. Use '--regenerate' to regenerate.`,
    };
  }

  // §5.4.1 — regenerate: bytes-level backup before any read attempt.
  // Backup also when manifest is malformed (parse-independent).
  let backupPath: string | null = null;
  let priorManifest: ParsedManifest | null = null;
  let priorWasMalformed = false;
  if (args.branch === "regenerate") {
    backupPath = backupExistingManifest(packDir, manifestPath, deps.now());
    const preLoad = preLoadManifest(packDir);
    if (preLoad.ok) {
      priorManifest = preLoad.manifest;
    } else if (preLoad.code === "manifest_malformed") {
      priorWasMalformed = true;
    } else {
      // identity / format / hash mismatch — recoverable via fresh interactive,
      // not a malformed flag (manifest was parseable).
      priorManifest = null;
    }
    // Now physically remove the original so a clean write proceeds.
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
  }

  // §5.3 step 1 — scan
  const scanned = scanPackMarkdown(packDir);
  if (scanned.length === 0) {
    return {
      ok: false,
      code: "empty_pack_directory",
      detail: `Empty directory at ${packDir}. Create canonical files first (concepts.md, structure_spec.md, logic_rules.md, domain_scope.md).`,
    };
  }

  // §5.3 step 2 — classify (per-file required true/false)
  const referenced_files: ReferencedFileEntry[] = [];
  for (const file of scanned) {
    const isCanonical = (CANONICAL_REQUIRED_FILES as readonly string[]).includes(file);
    const priorEntry = priorManifest?.referenced_files.find((e) => e.path === file);
    const defaultRequired = priorEntry?.required ?? isCanonical;
    const ans = await deps.io.question(
      `[2/7] '${file}' required? (y/n) [default: ${defaultRequired ? "y" : "n"}] `,
    );
    const required = parseYesNo(ans, defaultRequired);
    const entry: ReferencedFileEntry = { path: file, required };
    if (priorEntry?.min_headings !== undefined && priorEntry.min_headings !== null) {
      entry.min_headings = priorEntry.min_headings;
    }
    referenced_files.push(entry);
  }

  // §5.3 step 3 — quality_tier
  const tierDefault = priorManifest?.quality_tier ?? "full";
  const tierAns = await deps.io.question(
    `[3/7] quality_tier (full | partial | minimal) [default: ${tierDefault}]: `,
  );
  const quality_tier = (tierAns.trim() || tierDefault).toLowerCase();
  if (!["full", "partial", "minimal"].includes(quality_tier)) {
    return { ok: false, code: "user_aborted", detail: `invalid quality_tier "${quality_tier}"` };
  }

  // §5.3 step 4 — upgrade_status + notes
  const upgradeDefault = priorManifest?.upgrade_status ?? "not_started";
  const upgradeAns = await deps.io.question(
    `[4/7] upgrade_status (completed | in_progress | not_started) [default: ${upgradeDefault}]: `,
  );
  const upgrade_status = (upgradeAns.trim() || upgradeDefault).toLowerCase();
  const notesDefault = priorManifest?.notes ?? "";
  const notes = (
    await deps.io.question(`[4/7] notes (free text) [default: "${notesDefault}"]: `)
  ).trim() || notesDefault;

  // §5.3 step 5 — domain_manifest_version
  const versionAns = await readVersion(deps.io, args.branch, priorManifest, priorWasMalformed);
  if ("error" in versionAns) {
    return { ok: false, code: versionAns.error, detail: versionAns.detail };
  }
  const domain_manifest_version = versionAns.version;

  // §5.3 step 6 — last_updated auto
  const last_updated = deps.now().toISOString();

  // §5.3 step 7 — version_hash compute (§5.5) + atomic write
  const manifestForHash: ManifestForHash = {
    quality_tier,
    referenced_files,
  };
  const version_hash = computeVersionHash(manifestForHash, packDir);

  // recovery_from_malformed marker (§5.4.1 r7 + r8 clear rule)
  let recovery_from_malformed: boolean;
  if (args.branch === "regenerate") {
    recovery_from_malformed = priorWasMalformed; // true 유지 / false 재write
  } else {
    recovery_from_malformed = false; // init / migrate-existing default
  }

  const manifest: ParsedManifest = {
    manifest_schema_version: SUPPORTED_MANIFEST_SCHEMA_VERSIONS[
      SUPPORTED_MANIFEST_SCHEMA_VERSIONS.length - 1
    ] as string,
    domain_name: args.domainName,
    domain_manifest_version,
    referenced_files,
    quality_tier,
    version_hash,
    notes,
    upgrade_status,
    last_updated,
    recovery_from_malformed,
  };

  writeManifestAtomic(manifestPath, manifest);
  deps.io.log(`Wrote ${manifestPath}`);
  return { ok: true, manifestPath, backupPath };
}

export function scanPackMarkdown(packDir: string): string[] {
  if (!fs.existsSync(packDir)) return [];
  const entries = readdirSync(packDir, { withFileTypes: true });
  const md = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
  return md;
}

function parseYesNo(input: string, defaultValue: boolean): boolean {
  const t = input.trim().toLowerCase();
  if (t === "") return defaultValue;
  if (t === "y" || t === "yes") return true;
  if (t === "n" || t === "no") return false;
  return defaultValue;
}

async function readVersion(
  io: ConsoleIo,
  branch: Branch,
  prior: ParsedManifest | null,
  priorWasMalformed: boolean,
): Promise<
  | { version: string }
  | { error: "manifest_version_not_incremented" | "user_aborted"; detail: string }
> {
  const defaultSuggestion =
    branch === "regenerate" && prior
      ? prior.domain_manifest_version
      : "0.1.0";

  for (let attempt = 0; attempt < 3; attempt++) {
    const ans = await io.question(
      `[5/7] domain_manifest_version (semver MAJOR.MINOR.PATCH) [default: ${defaultSuggestion}]: `,
    );
    const candidate = ans.trim() || defaultSuggestion;
    if (!isValidDomainManifestVersion(candidate)) {
      io.error(`Invalid semver "${candidate}". Try again (e.g. 0.1.0).`);
      continue;
    }
    if (
      branch === "regenerate" &&
      prior &&
      !priorWasMalformed
    ) {
      const newSv = parseDomainManifestVersion(candidate)!;
      const oldSv = parseDomainManifestVersion(prior.domain_manifest_version)!;
      if (compareDomainManifestVersion(newSv, oldSv) <= 0) {
        return {
          error: "manifest_version_not_incremented",
          detail: `new version "${candidate}" must be > prior "${prior.domain_manifest_version}"`,
        };
      }
    }
    return { version: candidate };
  }
  return { error: "user_aborted", detail: "exceeded 3 invalid version attempts" };
}

export function writeManifestAtomic(manifestPath: string, manifest: ParsedManifest): void {
  const tmpPath = `${manifestPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, yamlStringify(manifest));
  fs.renameSync(tmpPath, manifestPath);
}

export function backupExistingManifest(
  packDir: string,
  manifestPath: string,
  now: Date,
): string | null {
  if (!fs.existsSync(manifestPath)) return null;
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backupPath = join(packDir, `manifest.yaml.bak-${stamp}`);
  fs.copyFileSync(manifestPath, backupPath);
  return backupPath;
}
