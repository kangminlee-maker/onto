#!/usr/bin/env bash
#
# onto:review live progress watcher
#
# Polls .onto/review/{session-id}/error-log.md and renders lens dispatch events.
# Designed to be invoked automatically (via tmux split-window or iTerm2 osascript)
# or manually (via `npm run review:watch`).
#
# Usage:
#   bash scripts/onto-review-watch.sh                    # auto-discover latest session
#   bash scripts/onto-review-watch.sh /path/to/session   # explicit session-root
#
# Exits when final-output.md appears (review complete) or on Ctrl+C.

set -uo pipefail

# Resolve project root from script location
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Resolve session-root
#
# NOTE on concurrent sessions: `.onto/review/.latest-session` and `ls -t` both
# select the most recently touched session at the project level. With two or
# more review sessions running in parallel, either fallback may snap onto the
# OTHER session's root and render progress on the wrong pane. The auto-spawn
# path in review-invoke.ts now always passes an explicit session-root, so this
# zero-arg fallback is used only for manual `npm run review:watch` invocations.
# Callers who are running multiple reviews in parallel should pass the specific
# session-root: `npm run review:watch -- /path/to/.onto/review/<session-id>`.
if [ "${1:-}" != "" ]; then
  SESSION_ROOT="$1"
else
  # Wait for .latest-session to appear (session may not be created yet when
  # watcher is spawned early — before startReviewSession completes).
  echo "${C_DIM:-}Waiting for review session to start (zero-arg mode; uses .latest-session pointer)...${C_RESET:-}"
  for i in {1..60}; do
    if [ -f ".onto/review/.latest-session" ]; then
      SESSION_ROOT="$(cat .onto/review/.latest-session)"
      [ -d "$SESSION_ROOT" ] && break
    fi
    sleep 1
  done

  # Fallback: pick most recently modified session directory
  if [ -z "${SESSION_ROOT:-}" ] || [ ! -d "${SESSION_ROOT:-}" ]; then
    LATEST_DIR="$(ls -t .onto/review/ 2>/dev/null | grep -v '^\.' | head -1)"
    if [ -n "$LATEST_DIR" ] && [ -d ".onto/review/$LATEST_DIR" ]; then
      SESSION_ROOT=".onto/review/$LATEST_DIR"
    fi
  fi

  if [ -n "${SESSION_ROOT:-}" ] && [ -d "${SESSION_ROOT:-}" ]; then
    echo "${C_YELLOW:-}Note:${C_RESET:-} resolved to ${C_BOLD:-}${SESSION_ROOT}${C_RESET:-} via zero-arg lookup."
    echo "${C_DIM:-}  If multiple reviews are running concurrently this may not be the session you intended.${C_RESET:-}"
    echo "${C_DIM:-}  Pass an explicit path to target a specific session: npm run review:watch -- <session-root>${C_RESET:-}"
  fi
fi

if [ -z "${SESSION_ROOT:-}" ] || [ ! -d "$SESSION_ROOT" ]; then
  echo "Error: no review session found." >&2
  echo "  Tried: \$1, .onto/review/.latest-session, ls .onto/review/" >&2
  exit 1
fi

# Make absolute
SESSION_ROOT="$(cd "$SESSION_ROOT" && pwd)"
ERROR_LOG="$SESSION_ROOT/error-log.md"
FINAL_OUTPUT="$SESSION_ROOT/final-output.md"
SESSION_ID="$(basename "$SESSION_ROOT")"

# ANSI colors (only if TTY)
if [ -t 1 ]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_GREEN=$'\033[32m'
  C_BLUE=$'\033[34m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
  C_CYAN=$'\033[36m'
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_GREEN=""
  C_BLUE=""
  C_YELLOW=""
  C_RED=""
  C_CYAN=""
fi

print_header() {
  echo "${C_CYAN}════════════════════════════════════════════════════════════════${C_RESET}"
  echo "${C_BOLD}  onto:review live watcher${C_RESET}"
  echo "  Session: ${C_BOLD}${SESSION_ID}${C_RESET}"
  echo "  ${C_DIM}${SESSION_ROOT}${C_RESET}"
  echo "${C_CYAN}════════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
}

print_footer_complete() {
  echo ""
  echo "${C_CYAN}════════════════════════════════════════════════════════════════${C_RESET}"
  echo "${C_GREEN}${C_BOLD}  ✓ Review complete${C_RESET}"
  echo "  Final:  ${FINAL_OUTPUT}"
  echo "  Record: ${SESSION_ROOT}/review-record.yaml"
  echo "${C_CYAN}════════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
  echo "${C_DIM}Press Enter to close this pane...${C_RESET}"
  # shellcheck disable=SC2034
  read -r _ || true
}

print_header

# Wait for error-log.md to appear (max 60 seconds)
WAIT_COUNT=0
while [ ! -f "$ERROR_LOG" ]; do
  if [ "$WAIT_COUNT" -ge 60 ]; then
    echo "${C_RED}Error: $ERROR_LOG did not appear within 60s${C_RESET}" >&2
    exit 1
  fi
  if [ "$WAIT_COUNT" -eq 0 ]; then
    echo "${C_DIM}Waiting for runtime to start producing events...${C_RESET}"
  fi
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

# Trap Ctrl+C for clean exit
trap 'echo ""; echo "${C_DIM}Watcher stopped (review may still be running).${C_RESET}"; exit 0' INT TERM

# Poll loop
LAST_LINE=0
while true; do
  CURRENT_LINES=$(wc -l < "$ERROR_LOG" 2>/dev/null || echo 0)
  if [ "$CURRENT_LINES" -gt "$LAST_LINE" ]; then
    sed -n "$((LAST_LINE + 1)),${CURRENT_LINES}p" "$ERROR_LOG" | awk \
      -v c_green="$C_GREEN" \
      -v c_blue="$C_BLUE" \
      -v c_yellow="$C_YELLOW" \
      -v c_red="$C_RED" \
      -v c_dim="$C_DIM" \
      -v c_reset="$C_RESET" '
      /^## .* runner dispatch started:/ {
        ts = ""
        if (match($0, /## [0-9T:+.-]+/)) {
          ts = substr($0, RSTART + 3, RLENGTH - 3)
          # Extract HH:MM:SS portion
          if (match(ts, /T[0-9:]+/)) {
            ts = substr(ts, RSTART + 1, 8)
          }
        }
        sub(/.*runner dispatch started: /, "")
        printf "  %s%s%s  %s▶ START%s   %s\n", c_dim, ts, c_reset, c_blue, c_reset, $0
      }
      /^## .* runner dispatch completed:/ {
        ts = ""
        if (match($0, /## [0-9T:+.-]+/)) {
          ts = substr($0, RSTART + 3, RLENGTH - 3)
          if (match(ts, /T[0-9:]+/)) {
            ts = substr(ts, RSTART + 1, 8)
          }
        }
        sub(/.*runner dispatch completed: /, "")
        printf "  %s%s%s  %s✓ DONE%s    %s\n", c_dim, ts, c_reset, c_green, c_reset, $0
      }
      /^## .* runner halted:/ {
        ts = ""
        if (match($0, /## [0-9T:+.-]+/)) {
          ts = substr($0, RSTART + 3, RLENGTH - 3)
          if (match(ts, /T[0-9:]+/)) {
            ts = substr(ts, RSTART + 1, 8)
          }
        }
        sub(/.*runner halted: /, "")
        printf "  %s%s%s  %s✗ HALT%s    %s\n", c_dim, ts, c_reset, c_red, c_reset, $0
      }
      /max_concurrent_lenses:/ {
        printf "  %s%s%s\n", c_dim, $0, c_reset
      }
    '
    LAST_LINE=$CURRENT_LINES
  fi

  if [ -f "$FINAL_OUTPUT" ]; then
    # Final flush, then exit
    sleep 1
    CURRENT_LINES=$(wc -l < "$ERROR_LOG" 2>/dev/null || echo 0)
    if [ "$CURRENT_LINES" -gt "$LAST_LINE" ]; then
      sed -n "$((LAST_LINE + 1)),${CURRENT_LINES}p" "$ERROR_LOG" | awk '
        /runner dispatch completed:/ {
          sub(/.*runner dispatch completed: /, "")
          printf "  ✓ DONE    %s\n", $0
        }
      '
    fi
    print_footer_complete
    exit 0
  fi

  sleep 1
done
