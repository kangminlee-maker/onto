// runtime-mirror-of: step-4-integration §5.6.1
//
// domain_manifest_version canonical grammar (semver subset) + comparator.
// W-A-99 (pre-load gate) consumes parse + isValid for grammar guard.
// W-A-95 (regenerate CLI) consumes compareDomainManifestVersion for bump
// enforcement (new > old).
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

/**
 * Lexicographic compare on (major, minor, patch).
 * Returns -1 (a < b), 0 (a == b), +1 (a > b).
 *
 * Both inputs must already be valid (parse-time precondition).
 * §5.6.1 comparator: new > old required for `--regenerate` bump.
 */
export function compareDomainManifestVersion(
  a: DomainManifestSemver,
  b: DomainManifestSemver,
): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}
