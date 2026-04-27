// runtime-mirror-of: step-3-rationale-reviewer §3.7.1
//
// wip_snapshot_hash + domain_files_content_hash canonical serialization.
//
// §3.7.1 rule:
//   1. Computation source: runtime-serialized YAML string (not raw file bytes)
//   2. Serialization: YAML 1.2 + sorted keys + LF line ending + UTF-8
//   3. Hash: SHA-256 hex lowercase
//   4. Library pinning: provenance.hash_algorithm = "yaml@<version> + sha256"
//
// File-based snapshot persistence (§3.7.1 step 4 r3 IA-SYN-4):
//   - 2c-spawn: serialize wip + persist to .onto/builds/{session}/wip-2c-snapshot.yml
//   - Step 4b: re-read file + canonical re-serialize + rehash + bit-exact compare
//   - manifest.referenced_files content 도 동일 (domain-files-2c-snapshot.yml)
//
// 본 module 은 hash 계산 + canonical serialize 만 expose. file persistence
// 는 caller (Runtime Coordinator) 책임 — file path 는 product-local
// .onto/builds/{session}/ 으로 product-locality principle 준수.

import { createHash } from "node:crypto";
import { stringify as yamlStringify } from "yaml";

export const HASH_ALGORITHM_LABEL = "yaml@2.8.2 + sha256" as const;

/**
 * Canonical YAML serialization for snapshot hashing.
 * yaml v2 의 sortMapEntries=true / lineWidth=0 / aliasDuplicateObjects=false
 * 와 manifest-version-hash 의 canonicalYaml 동일 방식.
 *
 * §3.7.1 항목 2 mirror: sortKeys + LF line ending + UTF-8 + arrays preserve order.
 */
export function canonicalYamlForSnapshot(value: unknown): string {
  // yaml v2 emits "\n" line endings by default — UTF-8 encoding is the JS
  // string default. sortMapEntries gives deterministic key order.
  return yamlStringify(value, {
    sortMapEntries: true,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
}

/**
 * Compute SHA-256 hex digest of a canonically serialized payload.
 * Used for both wip_snapshot_hash and domain_files_content_hash.
 */
export function computeSnapshotHash(value: unknown): string {
  const yaml = canonicalYamlForSnapshot(value);
  return createHash("sha256").update(yaml).digest("hex");
}

/**
 * Convenience for domain_files_content (array of {path, content}).
 * Preserves the manifest.referenced_files[] order (list semantic, §3.7.1
 * step 8 — array order preserved).
 */
export interface DomainFileContent {
  path: string;
  content: string;
}

export function computeDomainFilesContentHash(
  files: DomainFileContent[],
): string {
  // wrap in named container so the canonical YAML form is stable + identifiable
  return computeSnapshotHash({ domain_files_content: files });
}

/**
 * Compute hash + serialize together. Caller persists `serialized` to disk
 * (.onto/builds/{session}/wip-2c-snapshot.yml or domain-files-2c-snapshot.yml).
 */
export interface SerializedSnapshot {
  serialized: string; // canonical YAML string (UTF-8, LF)
  hash: string; // SHA-256 hex digest
}

export function serializeAndHash(value: unknown): SerializedSnapshot {
  const serialized = canonicalYamlForSnapshot(value);
  const hash = createHash("sha256").update(serialized).digest("hex");
  return { serialized, hash };
}

/**
 * Bit-exact compare for Step 4b rehash verification.
 * Caller re-reads the persistent snapshot file, canonical-serializes the
 * parsed object (re-canonicalization is a no-op if file was written via
 * canonicalYamlForSnapshot), and passes the result here.
 */
export function snapshotHashMatches(
  computed: string,
  expected: string,
): boolean {
  return (
    computed.length === expected.length &&
    computed.toLowerCase() === expected.toLowerCase()
  );
}
