// runtime-mirror-of: step-4-integration §5.6.1
//
// domain_manifest_version canonical grammar (semver subset).
// W-A-99 (pre-load gate) consumes parse + isValid for grammar guard.
// W-A-95 (regenerate CLI) will extend this module with comparator (compare > 0).
//
// grammar:
//   domain_manifest_version = MAJOR "." MINOR "." PATCH
//   MAJOR | MINOR | PATCH = 1+ digit, no leading zero except "0"
//   pre-release / build-metadata (-alpha, +abc) v1 unsupported

export interface DomainManifestSemver {
  major: number;
  minor: number;
  patch: number;
}

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseDomainManifestVersion(
  value: string,
): DomainManifestSemver | null {
  const m = SEMVER_REGEX.exec(value);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

export function isValidDomainManifestVersion(value: unknown): value is string {
  return typeof value === "string" && SEMVER_REGEX.test(value);
}
