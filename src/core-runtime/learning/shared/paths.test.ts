import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveLearningFilePaths, resolveWritePaths } from "./paths.js";

describe("paths — Phase 0 dual-read (W-A-01)", () => {
  let tmpProject: string;
  let tmpHome: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "onto-paths-test-"));
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-home-test-"));
    originalHome = process.env.HOME;
    process.env.HOME = tmpHome;
    fs.mkdirSync(path.join(tmpHome, ".onto", "learnings"), { recursive: true });
    fs.mkdirSync(path.join(tmpProject, ".onto", "learnings"), { recursive: true });
  });

  afterEach(() => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    fs.rmSync(tmpProject, { recursive: true, force: true });
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  describe("resolveLearningFilePaths — read fallback", () => {
    it("prefers canonical (bare) path when both exist", () => {
      fs.writeFileSync(path.join(tmpHome, ".onto", "learnings", "logic.md"), "canonical");
      fs.writeFileSync(path.join(tmpHome, ".onto", "learnings", "onto_logic.md"), "legacy");
      const result = resolveLearningFilePaths("logic", tmpProject);
      expect(result.user_path).toMatch(/logic\.md$/);
      expect(result.user_path).not.toMatch(/onto_logic\.md$/);
    });

    it("falls back to onto_ legacy when canonical absent", () => {
      fs.writeFileSync(path.join(tmpHome, ".onto", "learnings", "onto_axiology.md"), "legacy");
      const result = resolveLearningFilePaths("axiology", tmpProject);
      expect(result.user_path).toMatch(/onto_axiology\.md$/);
    });

    it("returns null when neither exists", () => {
      const result = resolveLearningFilePaths("structure", tmpProject);
      expect(result.user_path).toBeNull();
      expect(result.project_path).toBeNull();
    });

    it("accepts onto_ prefixed input and resolves to bare canonical first", () => {
      fs.writeFileSync(path.join(tmpHome, ".onto", "learnings", "semantics.md"), "canonical");
      const result = resolveLearningFilePaths("onto_semantics", tmpProject);
      expect(result.user_path).toMatch(/semantics\.md$/);
      expect(result.user_path).not.toMatch(/onto_semantics\.md$/);
    });
  });

  describe("resolveWritePaths — always canonical write", () => {
    it("writes to bare canonical filename even with onto_ prefixed input", () => {
      const result = resolveWritePaths("onto_evolution", tmpProject);
      expect(result.write_path).toMatch(/evolution\.md$/);
      expect(result.write_path).not.toMatch(/onto_evolution\.md$/);
    });

    it("write_scope is product per Project Locality Principle", () => {
      const result = resolveWritePaths("coverage", tmpProject);
      expect(result.write_scope).toBe("product");
    });

    it("read_paths includes both canonical and legacy when present", () => {
      fs.writeFileSync(path.join(tmpHome, ".onto", "learnings", "pragmatics.md"), "user-canonical");
      fs.writeFileSync(path.join(tmpProject, ".onto", "learnings", "onto_pragmatics.md"), "project-legacy");
      const result = resolveWritePaths("pragmatics", tmpProject);
      expect(result.read_paths.length).toBeGreaterThanOrEqual(2);
      expect(result.read_paths.some(p => p.endsWith("pragmatics.md"))).toBe(true);
      expect(result.read_paths.some(p => p.endsWith("onto_pragmatics.md"))).toBe(true);
    });

    it("creates project learnings dir if missing", () => {
      const freshProject = fs.mkdtempSync(path.join(os.tmpdir(), "onto-fresh-"));
      try {
        const result = resolveWritePaths("structure", freshProject);
        expect(fs.existsSync(path.join(freshProject, ".onto", "learnings"))).toBe(true);
        expect(result.write_scope).toBe("product");
      } finally {
        fs.rmSync(freshProject, { recursive: true, force: true });
      }
    });
  });
});
