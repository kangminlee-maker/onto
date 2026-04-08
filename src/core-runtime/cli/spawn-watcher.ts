import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type WatcherMechanism = "tmux" | "iterm2" | "apple_terminal";

export interface SpawnWatcherResult {
  spawned: boolean;
  mechanism?: WatcherMechanism;
  reason?: string;
}

/**
 * Attempt to spawn the onto:review live watcher in a side pane / split / new tab
 * using the most appropriate terminal multiplexer detected from the environment.
 *
 * Detection priority (most universal first):
 *   1. tmux (any OS, via $TMUX env var)
 *   2. iTerm2 on macOS (via $TERM_PROGRAM === 'iTerm.app')
 *   3. Apple Terminal on macOS (via $TERM_PROGRAM === 'Apple_Terminal')
 *
 * Returns silently with `spawned: false` if no supported mechanism is found.
 * The caller should print a fallback hint in that case.
 *
 * This function never throws — it returns a result object instead, so the
 * runtime continues even if the spawn fails.
 */
export function spawnWatcherPane(
  projectRoot: string,
  sessionRoot?: string,
): SpawnWatcherResult {
  const watcherScript = path.join(projectRoot, "scripts", "onto-review-watch.sh");

  if (!fs.existsSync(watcherScript)) {
    return { spawned: false, reason: "watcher script not found" };
  }

  // Build the watcher command. If sessionRoot is not yet known (spawn before
  // session creation), call without args — the watcher script will wait for
  // `.onto/review/.latest-session` to appear.
  const watcherArgs = sessionRoot
    ? `bash "${watcherScript}" "${sessionRoot}"`
    : `bash "${watcherScript}"`;

  // Priority 1: tmux (works on any OS, most universal)
  if (process.env.TMUX) {
    try {
      const result = spawnSync(
        "tmux",
        ["split-window", "-h", "-l", "60", watcherArgs],
        { stdio: "ignore" },
      );
      if (result.status === 0) {
        // Refocus original pane so user keeps typing in Claude Code / shell
        spawnSync("tmux", ["select-pane", "-l"], { stdio: "ignore" });
        return { spawned: true, mechanism: "tmux" };
      }
    } catch {
      // fall through
    }
  }

  // Priority 2: iTerm2 on macOS
  // Use `split vertically` (= left/right split in iTerm2 terminology)
  // so Claude Code stays on the left and the watcher appears on the right.
  if (
    process.platform === "darwin" &&
    process.env.TERM_PROGRAM === "iTerm.app"
  ) {
    try {
      const escapedCmd = watcherArgs.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const script =
        `tell application "iTerm2"\n` +
        `  tell current window\n` +
        `    tell current session of current tab\n` +
        `      split vertically with default profile command "${escapedCmd}"\n` +
        `    end tell\n` +
        `  end tell\n` +
        `end tell`;
      const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
      if (result.status === 0) {
        return { spawned: true, mechanism: "iterm2" };
      }
    } catch {
      // fall through
    }
  }

  // Priority 3: Apple Terminal on macOS
  if (
    process.platform === "darwin" &&
    process.env.TERM_PROGRAM === "Apple_Terminal"
  ) {
    try {
      const escapedCmd = watcherArgs.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const script =
        `tell application "Terminal"\n` +
        `  do script "${escapedCmd}"\n` +
        `end tell`;
      const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
      if (result.status === 0) {
        return { spawned: true, mechanism: "apple_terminal" };
      }
    } catch {
      // fall through
    }
  }

  return {
    spawned: false,
    reason: "no supported terminal multiplexer detected (tmux, iTerm2, Apple Terminal)",
  };
}
