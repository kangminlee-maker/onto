// runtime-mirror-of: step-4-integration §5.6.1 + §4.1 + §4.4

import { describe, expect, it } from "vitest";
import {
  isManifestRecoveryDiscontinuity,
  mirrorRecoveryFromMalformed,
} from "./recovery-from-malformed.js";

describe("mirrorRecoveryFromMalformed (W-A-100, depends on W-A-94)", () => {
  it("manifest.recovery_from_malformed=true → meta mirror=true", () => {
    expect(
      mirrorRecoveryFromMalformed({ recovery_from_malformed: true }),
    ).toBe(true);
  });

  it("manifest.recovery_from_malformed=false → meta mirror=false", () => {
    expect(
      mirrorRecoveryFromMalformed({ recovery_from_malformed: false }),
    ).toBe(false);
  });

  it("manifest.recovery_from_malformed absent → meta mirror=false (defensive default)", () => {
    expect(mirrorRecoveryFromMalformed({})).toBe(false);
  });

});

describe("isManifestRecoveryDiscontinuity (audit-only consumer helper)", () => {
  it("true flag → discontinuity (semver monotonicity may break)", () => {
    expect(
      isManifestRecoveryDiscontinuity({
        manifest_recovery_from_malformed: true,
      }),
    ).toBe(true);
  });

  it("false flag → continuity (semver monotonic across sessions)", () => {
    expect(
      isManifestRecoveryDiscontinuity({
        manifest_recovery_from_malformed: false,
      }),
    ).toBe(false);
  });
});
