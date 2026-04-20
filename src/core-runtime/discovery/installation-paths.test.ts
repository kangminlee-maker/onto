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
});
