/**
 * Tests — template-loader.ts
 *
 * Directory-scan primitives. P1-2a keeps the real templates directory empty
 * (placeholder only), so behavior is exercised against temporary fixture
 * directories.
 */

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATES_DIR,
  listAvailableTemplates,
  readTemplate,
  templatePath,
} from "./template-loader.js";

describe("template-loader with fixture directory", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "onto-tpl-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns [] for an empty directory", () => {
    expect(listAvailableTemplates(dir)).toEqual([]);
  });

  it("returns [] when the directory does not exist", () => {
    const missing = join(dir, "does-not-exist");
    expect(listAvailableTemplates(missing)).toEqual([]);
  });

  it("lists template ids with sorted order, suffix stripped", () => {
    writeFileSync(join(dir, "review.md.template"), "review body");
    writeFileSync(join(dir, "feedback.md.template"), "feedback body");
    writeFileSync(join(dir, "not-a-template.md"), "should be ignored");
    mkdirSync(join(dir, "nested"));
    expect(listAvailableTemplates(dir)).toEqual(["feedback", "review"]);
  });

  it("readTemplate returns null for missing id", () => {
    expect(readTemplate("missing", dir)).toBeNull();
  });

  it("readTemplate returns file content for existing id", () => {
    writeFileSync(join(dir, "review.md.template"), "# review template");
    expect(readTemplate("review", dir)).toBe("# review template");
  });

  it("templatePath joins id with the conventional suffix", () => {
    expect(templatePath("review", dir)).toBe(join(dir, "review.md.template"));
  });
});

describe("template-loader default directory", () => {
  it("resolves to src/core-runtime/cli/command-catalog-templates", () => {
    expect(DEFAULT_TEMPLATES_DIR.endsWith("command-catalog-templates")).toBe(
      true,
    );
  });

  it("returns an array (empty or placeholder contents) without throwing", () => {
    expect(() => listAvailableTemplates()).not.toThrow();
    expect(Array.isArray(listAvailableTemplates())).toBe(true);
  });
});
