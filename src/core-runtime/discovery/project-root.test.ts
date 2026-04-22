import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProjectRoot } from "./project-root.js";

// ---------------------------------------------------------------------------
// Regression guard for bug-report-install-profile-scope-20260422.md (❶ + ❷):
// `resolveProjectRoot` 가 walk-up 중 HOME 디렉토리의 `.onto/config.yml` 을
// 발견했을 때 HOME 자체를 project root 로 반환해서는 안 된다. HOME 의
// `.onto/` 는 global config 이며 project root 가 아니다.
// ---------------------------------------------------------------------------

describe("resolveProjectRoot — HOME boundary (defense #1)", () => {
  let tmpHome: string;
  let cwdInsideHome: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-proj-root-home-"));
    // CWD 는 HOME 하위 경로 (실제 시나리오: ~/cowork/fc-design-3)
    cwdInsideHome = path.join(tmpHome, "cowork", "fc-design-3");
    fs.mkdirSync(cwdInsideHome, { recursive: true });
    // HOME 에만 global `.onto/config.yml` 설치
    fs.mkdirSync(path.join(tmpHome, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, ".onto", "config.yml"),
      "output_language: ko\n",
      "utf8",
    );
    process.chdir(cwdInsideHome);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("CWD 하위에 .onto/ 없고 HOME 에만 있을 때 HOME 을 project root 로 반환하지 않는다", () => {
    // Regression: 이전 버그에서는 HOME 을 반환했다 (bug report ❷ 근본 원인).
    const result = resolveProjectRoot(undefined, tmpHome);
    expect(fs.realpathSync(result)).not.toBe(fs.realpathSync(tmpHome));
  });

  it("CWD 하위에 .onto/ 없고 HOME 에만 있을 때 CWD 를 반환한다 (fallback)", () => {
    // HOME 보다 상위로 올라가면 walk-up 이 `.git` 도 못 찾아 step 5 CWD
    // fallback 으로 수렴. CWD 자체는 project root 로 적합.
    const result = resolveProjectRoot(undefined, tmpHome);
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(cwdInsideHome));
  });

  it("CWD 하위 실제 project 에 .onto/ 있으면 그 project 를 반환한다", () => {
    const projectDir = path.join(cwdInsideHome, "real-project");
    fs.mkdirSync(path.join(projectDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, ".onto", "config.yml"),
      "output_language: en\n",
      "utf8",
    );
    process.chdir(projectDir);
    const result = resolveProjectRoot(undefined, tmpHome);
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(projectDir));
  });

  it("CWD 가 HOME 자체일 때 walk-up 은 다른 위치를 찾지 못하고 CWD fallback 이 동작 (방어선 2 의 target)", () => {
    // 방어적 케이스 — 사용자가 `cd ~` 후 `onto install --profile-scope project`
    // 실행하는 엣지. walk-up 단계 (hasOntoConfig / hasGitOrPackageJson) 는 HOME
    // 에서 false 처리하지만, step 5 CWD fallback 은 `process.cwd()` 를 그대로
    // 반환한다. 따라서 CWD 가 HOME 이면 HOME 이 반환된다 — 이 엣지는
    // `resolveInstallPaths` 의 sanity check (writer.ts, 방어선 2) 가 잡아야 한다.
    // 본 테스트는 **walk-up 단계의 HOME 경계는 작동** 하지만 **CWD fallback 이
    // HOME 을 반환할 수 있다** 는 계약을 기록해 방어선 2 가 왜 필요한지
    // 문서화한다.
    process.chdir(tmpHome);
    const result = resolveProjectRoot(undefined, tmpHome);
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(tmpHome));
    // → 방어선 2 (writer.resolveInstallPaths) 가 projectRoot === homeDir 를
    //   throw 로 차단. writer.test.ts 의 "defense #2" 케이스 참조.
  });

  it("HOME 에 .git 또는 package.json 이 있어도 HOME 을 반환하지 않는다", () => {
    // 홈 dotfiles repo 시나리오 — ~/.git, ~/package.json 존재하는 케이스.
    fs.mkdirSync(path.join(tmpHome, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, "package.json"),
      JSON.stringify({ name: "dotfiles" }),
      "utf8",
    );
    const result = resolveProjectRoot(undefined, tmpHome);
    expect(fs.realpathSync(result)).not.toBe(fs.realpathSync(tmpHome));
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(cwdInsideHome));
  });
});

describe("resolveProjectRoot — 정상 해소 경로 (regression 안전성)", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-proj-root-normal-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("targetPath 의 조상에 .onto/ 가 있으면 그 project root 반환", () => {
    const projectDir = path.join(tmpDir, "my-project");
    const sub = path.join(projectDir, "src", "nested");
    fs.mkdirSync(sub, { recursive: true });
    fs.mkdirSync(path.join(projectDir, ".onto"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, ".onto", "config.yml"),
      "",
      "utf8",
    );
    // homeDir override: 임의 경로로 둬서 HOME 경계 영향 배제
    const home = path.join(tmpDir, "fake-home");
    fs.mkdirSync(home, { recursive: true });
    const result = resolveProjectRoot(sub, home);
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(projectDir));
  });

  it(".git 또는 package.json 만 있어도 walk-up step 4 로 찾는다", () => {
    const projectDir = path.join(tmpDir, "git-project");
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    process.chdir(projectDir);
    const home = path.join(tmpDir, "fake-home");
    fs.mkdirSync(home, { recursive: true });
    const result = resolveProjectRoot(undefined, home);
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(projectDir));
  });
});
