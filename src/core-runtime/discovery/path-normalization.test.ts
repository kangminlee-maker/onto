import { describe, expect, it } from "vitest";
import {
  LAYOUT_ALIASES,
  canonicalizeLayoutPath,
  startsWithDirPrefix,
} from "./path-normalization.js";

describe("startsWithDirPrefix — segment-bound check", () => {
  it("matches exact segment boundary with trailing slash", () => {
    expect(startsWithDirPrefix(".onto/principles/foo.md", ".onto/principles/")).toBe(true);
    expect(startsWithDirPrefix(".onto/principles/sub/bar.md", ".onto/principles")).toBe(true);
  });

  it("rejects mid-segment prefix collision", () => {
    expect(startsWithDirPrefix(".onto/principlesABC/foo.md", ".onto/principles")).toBe(false);
    expect(startsWithDirPrefix(".onto/principles_backup/foo.md", ".onto/principles")).toBe(false);
    expect(startsWithDirPrefix("design-principlesX/foo.md", "design-principles")).toBe(false);
  });

  it("rejects the directory itself (must be a path under the directory)", () => {
    expect(startsWithDirPrefix(".onto/principles", ".onto/principles")).toBe(false);
    expect(startsWithDirPrefix(".onto/principles/", ".onto/principles")).toBe(false);
  });

  it("treats trailing slash in `dir` argument uniformly", () => {
    const p = ".onto/principles/foo.md";
    expect(startsWithDirPrefix(p, ".onto/principles")).toBe(true);
    expect(startsWithDirPrefix(p, ".onto/principles/")).toBe(true);
  });
});

describe("canonicalizeLayoutPath", () => {
  it("rewrites Phase 5 design-principles/ → .onto/principles/", () => {
    expect(canonicalizeLayoutPath("design-principles/ontology-as-code.md")).toBe(
      ".onto/principles/ontology-as-code.md",
    );
  });

  it("rewrites known legacy prefixes from other phases", () => {
    expect(canonicalizeLayoutPath("processes/review/binding.md")).toBe(
      ".onto/processes/review/binding.md",
    );
    expect(canonicalizeLayoutPath("roles/logic.md")).toBe(".onto/roles/logic.md");
    expect(canonicalizeLayoutPath("commands/review.md")).toBe(".onto/commands/review.md");
    expect(canonicalizeLayoutPath("domains/ontology/foo.md")).toBe(
      ".onto/domains/ontology/foo.md",
    );
    expect(canonicalizeLayoutPath("authority/core-lexicon.yaml")).toBe(
      ".onto/authority/core-lexicon.yaml",
    );
  });

  it("is idempotent on already-canonical paths", () => {
    const canonical = ".onto/principles/foo.md";
    expect(canonicalizeLayoutPath(canonical)).toBe(canonical);
    expect(canonicalizeLayoutPath(canonicalizeLayoutPath(canonical))).toBe(canonical);
  });

  it("does not rewrite mid-segment collisions", () => {
    expect(canonicalizeLayoutPath("design-principlesX/foo.md")).toBe("design-principlesX/foo.md");
    expect(canonicalizeLayoutPath("rolesABC/bar.md")).toBe("rolesABC/bar.md");
  });

  it("leaves unrelated paths untouched", () => {
    expect(canonicalizeLayoutPath("src/core-runtime/foo.ts")).toBe("src/core-runtime/foo.ts");
    expect(canonicalizeLayoutPath("README.md")).toBe("README.md");
    expect(canonicalizeLayoutPath("")).toBe("");
  });
});

describe("LAYOUT_ALIASES consistency", () => {
  it("every canonical starts with .onto/ and ends with /", () => {
    for (const { canonical } of LAYOUT_ALIASES) {
      expect(canonical.startsWith(".onto/")).toBe(true);
      expect(canonical.endsWith("/")).toBe(true);
    }
  });

  it("every legacy ends with /", () => {
    for (const { legacy } of LAYOUT_ALIASES) {
      expect(legacy.endsWith("/")).toBe(true);
    }
  });

  it("aliases agree with installation-paths LEGACY_DIR_OVERRIDES for kind-name renames", async () => {
    // Dynamic import to avoid cyclic static import during module init.
    const installation = await import("./installation-paths.js");
    type Kind =
      | "authority"
      | "principles"
      | "processes"
      | "roles"
      | "commands"
      | "domains";
    const inferredOverrides: Record<string, string> = {};
    for (const { canonical, legacy } of LAYOUT_ALIASES) {
      const kind = canonical.slice(".onto/".length, -1);
      const legacyDir = legacy.slice(0, -1);
      if (kind !== legacyDir) {
        inferredOverrides[kind] = legacyDir;
      }
    }
    // Every kind whose legacy dir name differs in installation-paths
    // must match our LAYOUT_ALIASES inference.
    for (const kind of Object.keys(inferredOverrides) as Kind[]) {
      try {
        installation.resolveInstallationPath(kind, "/nonexistent-root");
      } catch (err) {
        // We only care that the thrown message references the expected
        // legacy dir name — confirms the two seats agree.
        const msg = (err as Error).message;
        expect(msg).toContain(inferredOverrides[kind] + "/");
      }
    }
  });
});
