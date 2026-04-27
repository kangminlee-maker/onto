// runtime-mirror-of: step-4-integration §5.6.1

import { describe, expect, it } from "vitest";
import {
  isValidDomainManifestVersion,
  parseDomainManifestVersion,
} from "./manifest-semver.js";

describe("manifest-semver — grammar parse (W-A-99 prereq subset)", () => {
  describe("parseDomainManifestVersion — valid", () => {
    it.each([
      ["0.0.0", { major: 0, minor: 0, patch: 0 }],
      ["0.1.0", { major: 0, minor: 1, patch: 0 }],
      ["1.0.0", { major: 1, minor: 0, patch: 0 }],
      ["0.3.15", { major: 0, minor: 3, patch: 15 }],
      ["10.20.30", { major: 10, minor: 20, patch: 30 }],
      ["0.10.0", { major: 0, minor: 10, patch: 0 }],
    ])("parses %s", (input, expected) => {
      expect(parseDomainManifestVersion(input)).toEqual(expected);
    });
  });

  describe("parseDomainManifestVersion — invalid", () => {
    it.each([
      "0.3",            // missing patch
      "0.3.0.0",        // 4 components
      "v0.3.0",         // v-prefix
      "0.03.0",         // leading zero
      "01.0.0",         // leading zero major
      "0.0.07",         // leading zero patch
      "0.3.0-alpha",    // pre-release
      "0.3.0+abc",      // build metadata
      "",               // empty
      "abc",            // non-numeric
      " 0.3.0",         // leading space
      "0.3.0 ",         // trailing space
      "0.-1.0",         // negative
    ])("rejects %s", (input) => {
      expect(parseDomainManifestVersion(input)).toBeNull();
    });
  });

  describe("isValidDomainManifestVersion — type guard", () => {
    it("accepts valid semver string", () => {
      expect(isValidDomainManifestVersion("0.3.0")).toBe(true);
    });

    it("rejects invalid semver string", () => {
      expect(isValidDomainManifestVersion("v0.3.0")).toBe(false);
    });

    it("rejects non-string types", () => {
      expect(isValidDomainManifestVersion(undefined)).toBe(false);
      expect(isValidDomainManifestVersion(null)).toBe(false);
      expect(isValidDomainManifestVersion(0)).toBe(false);
      expect(isValidDomainManifestVersion({ major: 0 })).toBe(false);
      expect(isValidDomainManifestVersion(["0.3.0"])).toBe(false);
    });
  });
});
