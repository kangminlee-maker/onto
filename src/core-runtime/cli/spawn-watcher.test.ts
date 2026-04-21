import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { spawnWatcherPane } from "./spawn-watcher.js";

// ---------------------------------------------------------------------------
// Fixture: temp project dir with (or without) the watcher script present.
// ---------------------------------------------------------------------------

interface Fixture {
  projectRoot: string;
  sessionRoot: string;
  cleanup: () => void;
}

function mkProjectRoot(withWatcherScript: boolean): Fixture {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "onto-watcher-test-"),
  );
  const sessionRoot = path.join(
    projectRoot,
    ".onto",
    "review",
    "20260422-fixture",
  );
  fs.mkdirSync(sessionRoot, { recursive: true });
  if (withWatcherScript) {
    const scriptsDir = path.join(projectRoot, "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(scriptsDir, "onto-review-watch.sh"),
      "#!/usr/bin/env bash\n# test fixture — no-op\n",
      { mode: 0o755 },
    );
  }
  return {
    projectRoot,
    sessionRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  };
}

// ---------------------------------------------------------------------------
// Env stubbing — save + restore the env vars `spawnWatcherPane` inspects.
// ---------------------------------------------------------------------------

const WATCHED_ENV_KEYS = [
  "ONTO_WATCHER_DRY_RUN",
  "TMUX",
  "TMUX_PANE",
  "TERM_PROGRAM",
  "ITERM_SESSION_ID",
] as const;

function saveEnv(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of WATCHED_ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function clearWatchedEnv(): void {
  for (const key of WATCHED_ENV_KEYS) {
    delete process.env[key];
  }
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of WATCHED_ENV_KEYS) {
    const prev = snapshot[key];
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("spawnWatcherPane — prereq failure", () => {
  let fixture: Fixture;
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = saveEnv();
    clearWatchedEnv();
  });
  afterEach(() => {
    restoreEnv(envSnapshot);
    if (fixture) fixture.cleanup();
  });

  it("returns spawned=false when watcher script is missing", () => {
    fixture = mkProjectRoot(false);
    process.env.TMUX = "/tmp/tmux-1000/default,12345,0";
    process.env.ONTO_WATCHER_DRY_RUN = "1";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(false);
    expect(result.reason).toContain("watcher script not found");
  });

  it("returns spawned=false when no terminal multiplexer signal detected", () => {
    fixture = mkProjectRoot(true);
    // Every detection-priority env is unset — even dry-run cannot fake a
    // mechanism that has no signal to match.
    process.env.ONTO_WATCHER_DRY_RUN = "1";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(false);
    expect(result.reason).toContain("no supported terminal multiplexer");
  });
});

describe("spawnWatcherPane — dry-run detection priority", () => {
  let fixture: Fixture;
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = saveEnv();
    clearWatchedEnv();
    fixture = mkProjectRoot(true);
    process.env.ONTO_WATCHER_DRY_RUN = "1";
  });
  afterEach(() => {
    restoreEnv(envSnapshot);
    if (fixture) fixture.cleanup();
  });

  it("detects tmux when $TMUX is set (priority 1)", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,12345,0";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(true);
    expect(result.mechanism).toBe("tmux");
  });

  it("detects iTerm2 when TERM_PROGRAM=iTerm.app AND ITERM_SESSION_ID is set (priority 2)", () => {
    process.env.TERM_PROGRAM = "iTerm.app";
    process.env.ITERM_SESSION_ID = "w0t0p0:ABCD1234-FAKE-UUID";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(true);
    expect(result.mechanism).toBe("iterm2");
  });

  it("detects Apple Terminal when TERM_PROGRAM=Apple_Terminal (priority 3)", () => {
    process.env.TERM_PROGRAM = "Apple_Terminal";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(true);
    expect(result.mechanism).toBe("apple_terminal");
  });

  it("prefers tmux over iTerm2 when both signals present (priority order)", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,12345,0";
    process.env.TERM_PROGRAM = "iTerm.app";
    process.env.ITERM_SESSION_ID = "w0t0p0:ABCD1234-FAKE-UUID";
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.mechanism).toBe("tmux");
  });

  it("iTerm2 without ITERM_SESSION_ID falls through (does NOT spawn)", () => {
    // Regression guard: spawning into the currently-focused iTerm2 tab
    // would land on the wrong tab. spawn-watcher.ts must refuse, not
    // fall back.
    process.env.TERM_PROGRAM = "iTerm.app";
    // ITERM_SESSION_ID intentionally unset.
    const result = spawnWatcherPane(fixture.projectRoot, fixture.sessionRoot);
    expect(result.spawned).toBe(false);
    expect(result.reason).toContain("no supported terminal multiplexer");
  });
});
