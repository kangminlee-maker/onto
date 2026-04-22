import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureGitignoreEntry } from "./gitignore-update.js";

describe("ensureGitignoreEntry", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-install-git-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a new .gitignore with the entry when file absent", () => {
    const gi = path.join(tmpDir, ".gitignore");
    const result = ensureGitignoreEntry(gi);
    expect(result.created).toBe(true);
    expect(result.alreadyPresent).toBe(false);
    expect(fs.readFileSync(gi, "utf8")).toBe(".onto/.env\n");
  });

  it("appends the entry to an existing .gitignore without duplication", () => {
    const gi = path.join(tmpDir, ".gitignore");
    fs.writeFileSync(gi, "node_modules/\ndist/\n");
    const result = ensureGitignoreEntry(gi);
    expect(result.created).toBe(false);
    expect(result.alreadyPresent).toBe(false);
    const content = fs.readFileSync(gi, "utf8");
    expect(content).toContain("node_modules/");
    expect(content.trim().endsWith(".onto/.env")).toBe(true);
  });

  it("is a no-op when the entry is already present", () => {
    const gi = path.join(tmpDir, ".gitignore");
    const original = "dist/\n.onto/.env\nnode_modules/\n";
    fs.writeFileSync(gi, original);
    const result = ensureGitignoreEntry(gi);
    expect(result.alreadyPresent).toBe(true);
    expect(fs.readFileSync(gi, "utf8")).toBe(original);
  });

  it("recognizes leading slash variants", () => {
    const gi = path.join(tmpDir, ".gitignore");
    fs.writeFileSync(gi, "/.onto/.env\n");
    const result = ensureGitignoreEntry(gi);
    expect(result.alreadyPresent).toBe(true);
  });

  it("ignores inline comments on the entry line", () => {
    const gi = path.join(tmpDir, ".gitignore");
    fs.writeFileSync(gi, ".onto/.env  # secrets\n");
    const result = ensureGitignoreEntry(gi);
    expect(result.alreadyPresent).toBe(true);
  });

  it("adds a trailing newline when the existing file has none", () => {
    const gi = path.join(tmpDir, ".gitignore");
    fs.writeFileSync(gi, "dist/");
    const result = ensureGitignoreEntry(gi);
    expect(result.alreadyPresent).toBe(false);
    expect(fs.readFileSync(gi, "utf8")).toBe("dist/\n.onto/.env\n");
  });

  it("dry-run returns expected content without writing", () => {
    const gi = path.join(tmpDir, ".gitignore");
    const result = ensureGitignoreEntry(gi, { dryRun: true });
    expect(result.content).toBe(".onto/.env\n");
    expect(fs.existsSync(gi)).toBe(false);
  });

  // Defense line #3 (bug-report-install-profile-scope-20260422.md ❸):
  // projectRoot option 이 주어진 경우 `.git/` 이 없으면 skip. HOME 또는
  // 임의 non-repo dir 이 project root 로 잘못 해소된 경우 `.gitignore` 를
  // 건드리지 않도록 하는 가드.
  it("skips when projectRoot has no .git directory", () => {
    const gi = path.join(tmpDir, ".gitignore");
    const result = ensureGitignoreEntry(gi, { projectRoot: tmpDir });
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("not-git-repo");
    expect(result.content).toBeUndefined();
    expect(fs.existsSync(gi)).toBe(false);
  });

  it("skips even when .gitignore already exists (does not touch non-repo)", () => {
    // 실제 버그 시나리오: HOME 에 .gitignore 가 dotfiles 관리용으로
    // 존재할 수 있음. HOME 에 `.git/` 없으면 건드리지 않아야 함.
    const gi = path.join(tmpDir, ".gitignore");
    const original = "dist/\nnode_modules/\n";
    fs.writeFileSync(gi, original);
    const result = ensureGitignoreEntry(gi, { projectRoot: tmpDir });
    expect(result.skipped).toBe(true);
    // 내용 변경 없음
    expect(fs.readFileSync(gi, "utf8")).toBe(original);
  });

  it("writes normally when projectRoot has .git", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    const gi = path.join(tmpDir, ".gitignore");
    const result = ensureGitignoreEntry(gi, { projectRoot: tmpDir });
    expect(result.skipped).toBeUndefined();
    expect(result.created).toBe(true);
    expect(fs.readFileSync(gi, "utf8")).toBe(".onto/.env\n");
  });

  it("backward compat — no projectRoot option 이면 기존 거동 유지 (skip 없음)", () => {
    // 기존 caller 가 projectRoot 없이 호출하던 경로 — unconditional write.
    // 이 거동은 install/cli.ts 가 projectRoot 를 전달하도록 migration 되기
    // 전의 호출자 또는 다른 용도의 caller 를 위해 유지.
    const gi = path.join(tmpDir, ".gitignore");
    const result = ensureGitignoreEntry(gi);
    expect(result.skipped).toBeUndefined();
    expect(result.created).toBe(true);
    expect(fs.existsSync(gi)).toBe(true);
  });
});
