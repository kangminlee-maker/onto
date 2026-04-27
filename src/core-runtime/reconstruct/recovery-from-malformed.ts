// runtime-mirror-of: step-4-integration §5.6.1 + §4.1 + §4.4
//
// recovery_from_malformed audit signal mirror (W-A-100).
//
// Layer 1 (manifest.yaml — write side, W-A-95 책임):
//   --regenerate CLI 가 malformed recovery path 에서 true 로 populate.
//   다음 --regenerate 정상 path 시 false 로 재write (clear rule).
//
// Layer 2 (raw.yml.meta.manifest_recovery_from_malformed — read side, 본 모듈):
//   reconstruct runtime 이 manifest pre-load 시 audit signal 을 raw.yml meta 로
//   read-copy. govern / learn 등 raw.yml consumer 가 "domain_manifest_version
//   monotonicity 깨질 수 있음" 인식 (§5.6.1 r7 intentional discontinuity).
//
// W-A-94 의 RawMetaExtensionsV1.manifest_recovery_from_malformed 가 sink seat.

import type { ParsedManifest } from "./pre-load-gate.js";

/**
 * §4.4 persistence chain row "manifest_recovery_from_malformed":
 *   Populated by Runtime (pre-Phase 1) — manifest.yaml.recovery_from_malformed
 *   를 read-mirror.
 *
 * Returns the boolean to populate at meta.manifest_recovery_from_malformed.
 * Default false when the manifest field is absent (pre-r8 manifests).
 */
export function mirrorRecoveryFromMalformed(
  manifest: Pick<ParsedManifest, "recovery_from_malformed">,
): boolean {
  return manifest.recovery_from_malformed === true;
}

/**
 * Audit-only interpretation helper for raw.yml consumers (govern / learn).
 *
 * §5.6.1 r7 intentional discontinuity note: when this flag is true, the
 * `domain_manifest_version` value in this raw.yml may be lower than the
 * previous reconstruct session's value (e.g. 0.5.2 → 0.1.0 after malformed
 * recovery). Consumers expecting semver monotonicity must branch on this.
 */
export function isManifestRecoveryDiscontinuity(
  meta: { manifest_recovery_from_malformed: boolean },
): boolean {
  return meta.manifest_recovery_from_malformed === true;
}
