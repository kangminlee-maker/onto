import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetInstallationPathCacheForTesting,
  resolveInstallationPath,
} from "./installation-paths.js";

function makeTempInstallRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "onto-install-paths-"));
}

describe("resolveInstallationPath — Phase 0 dual-path fallback", () => {
  const tmpRoots: string[] = [];

  beforeEach(() => {
    __resetInstallationPathCacheForTesting();
  });

  afterEach(() => {
    __resetInstallationPathCacheForTesting();
    for (const root of tmpRoots) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tmpRoots.length = 0;
  });

  it("returns .onto/{kind}/ when only new layout exists", () => {
    const installRoot = makeTempInstallRoot();
    tmpRoots.push(installRoot);
    const newPath = path.join(installRoot, ".onto", "authority");
    fs.mkdirSync(newPath, { recursive: true });

    const resolved = resolveInstallationPath("authority", installRoot);
    expect(resolved).toBe(newPath);
  });

  it("falls back to {kind}/ when only legacy layout exists", () => {
    const installRoot = makeTempInstallRoot();
    tmpRoots.push(installRoot);
    const legacyPath = path.join(installRoot, "roles");
    fs.mkdirSync(legacyPath, { recursive: true });

    const resolved = resolveInstallationPath("roles", installRoot);
    expect(resolved).toBe(legacyPath);
  });

  it("prefers .onto/{kind}/ when both layouts exist", () => {
    const installRoot = makeTempInstallRoot();
    tmpRoots.push(installRoot);
    const newPath = path.join(installRoot, ".onto", "domains");
    const legacyPath = path.join(installRoot, "domains");
    fs.mkdirSync(newPath, { recursive: true });
    fs.mkdirSync(legacyPath, { recursive: true });

    const resolved = resolveInstallationPath("domains", installRoot);
    expect(resolved).toBe(newPath);
  });

  it("throws when neither layout exists", () => {
    const installRoot = makeTempInstallRoot();
    tmpRoots.push(installRoot);

    expect(() => resolveInstallationPath("commands", installRoot)).toThrow(
      /Neither \.onto\/commands\/ nor commands\/ exists/,
    );
  });

  // Phase 5 rename: the `principles` kind maps to the legacy dir name
  // `design-principles/` (not `principles/`) via LEGACY_DIR_OVERRIDES.
  describe("principles kind (Phase 5 rename)", () => {
    it("returns .onto/principles/ when new layout exists", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      const newPath = path.join(installRoot, ".onto", "principles");
      fs.mkdirSync(newPath, { recursive: true });

      const resolved = resolveInstallationPath("principles", installRoot);
      expect(resolved).toBe(newPath);
    });

    it("falls back to design-principles/ when only legacy layout exists", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      const legacyPath = path.join(installRoot, "design-principles");
      fs.mkdirSync(legacyPath, { recursive: true });

      const resolved = resolveInstallationPath("principles", installRoot);
      expect(resolved).toBe(legacyPath);
    });

    it("does NOT fall back to principles/ (the non-prefixed legacy-looking dir)", () => {
      // A repo that happens to have an unrelated `principles/` at the root
      // must NOT trick the resolver. Only `.onto/principles/` (new) or
      // `design-principles/` (legacy per rename override) are valid.
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      fs.mkdirSync(path.join(installRoot, "principles"), { recursive: true });

      expect(() => resolveInstallationPath("principles", installRoot)).toThrow(
        /Neither \.onto\/principles\/ nor design-principles\/ exists/,
      );
    });

    it("throws with both layouts missing — error names design-principles as legacy", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);

      expect(() => resolveInstallationPath("principles", installRoot)).toThrow(
        /Neither \.onto\/principles\/ nor design-principles\/ exists/,
      );
    });
  });

  // Phase 6 (2026-04-21) moved authority/ → .onto/authority/. The resolver
  // is now the single seat both loaders consume (render-for-user +
  // error-messages) after the review-driven refactor. Matrix coverage for
  // all four states pins consumer-binding correctness at this boundary.
  describe("authority kind (Phase 6 move) — 4-state matrix", () => {
    it("canonical-only: returns .onto/authority/", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      const canonical = path.join(installRoot, ".onto", "authority");
      fs.mkdirSync(canonical, { recursive: true });

      expect(resolveInstallationPath("authority", installRoot)).toBe(canonical);
    });

    it("legacy-only: falls back to authority/", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      const legacy = path.join(installRoot, "authority");
      fs.mkdirSync(legacy, { recursive: true });

      expect(resolveInstallationPath("authority", installRoot)).toBe(legacy);
    });

    it("both-present: prefers canonical (.onto/authority/) silently", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      const canonical = path.join(installRoot, ".onto", "authority");
      const legacy = path.join(installRoot, "authority");
      fs.mkdirSync(canonical, { recursive: true });
      fs.mkdirSync(legacy, { recursive: true });

      expect(resolveInstallationPath("authority", installRoot)).toBe(canonical);
    });

    it("neither-present: throws with dual-path error message", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);

      expect(() => resolveInstallationPath("authority", installRoot)).toThrow(
        /Neither \.onto\/authority\/ nor authority\/ exists/,
      );
    });
  });

  // Phase 6 review follow-up (CC2): both_present observability.
  describe("ONTO_DEBUG_LAYOUT=1 — both_present stderr diagnostic", () => {
    it("emits a diagnostic line when both canonical and legacy exist", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      fs.mkdirSync(path.join(installRoot, ".onto", "authority"), { recursive: true });
      fs.mkdirSync(path.join(installRoot, "authority"), { recursive: true });

      const origEnv = process.env.ONTO_DEBUG_LAYOUT;
      const writes: string[] = [];
      const origWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: unknown) => {
        writes.push(typeof chunk === "string" ? chunk : String(chunk));
        return true;
      }) as typeof process.stderr.write;
      process.env.ONTO_DEBUG_LAYOUT = "1";
      try {
        resolveInstallationPath("authority", installRoot);
      } finally {
        process.stderr.write = origWrite;
        if (origEnv === undefined) delete process.env.ONTO_DEBUG_LAYOUT;
        else process.env.ONTO_DEBUG_LAYOUT = origEnv;
      }
      expect(writes.some((l) => l.includes("both_present kind=authority"))).toBe(true);
    });

    it("stays silent when only one layout is present", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      fs.mkdirSync(path.join(installRoot, ".onto", "authority"), { recursive: true });

      const origEnv = process.env.ONTO_DEBUG_LAYOUT;
      const writes: string[] = [];
      const origWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: unknown) => {
        writes.push(typeof chunk === "string" ? chunk : String(chunk));
        return true;
      }) as typeof process.stderr.write;
      process.env.ONTO_DEBUG_LAYOUT = "1";
      try {
        resolveInstallationPath("authority", installRoot);
      } finally {
        process.stderr.write = origWrite;
        if (origEnv === undefined) delete process.env.ONTO_DEBUG_LAYOUT;
        else process.env.ONTO_DEBUG_LAYOUT = origEnv;
      }
      expect(writes.some((l) => l.includes("both_present"))).toBe(false);
    });

    it("stays silent when ONTO_DEBUG_LAYOUT is unset (no-op for normal runs)", () => {
      const installRoot = makeTempInstallRoot();
      tmpRoots.push(installRoot);
      fs.mkdirSync(path.join(installRoot, ".onto", "authority"), { recursive: true });
      fs.mkdirSync(path.join(installRoot, "authority"), { recursive: true });

      const origEnv = process.env.ONTO_DEBUG_LAYOUT;
      delete process.env.ONTO_DEBUG_LAYOUT;
      const writes: string[] = [];
      const origWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: unknown) => {
        writes.push(typeof chunk === "string" ? chunk : String(chunk));
        return true;
      }) as typeof process.stderr.write;
      try {
        resolveInstallationPath("authority", installRoot);
      } finally {
        process.stderr.write = origWrite;
        if (origEnv === undefined) delete process.env.ONTO_DEBUG_LAYOUT;
        else process.env.ONTO_DEBUG_LAYOUT = origEnv;
      }
      expect(writes.some((l) => l.includes("both_present"))).toBe(false);
    });
  });
});
