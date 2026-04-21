#!/usr/bin/env bash
#
# review-pr.sh — PR review via codex-main-subprocess + full 9-lens.
#
# Deterministic wrapper. The purpose is to remove LLM-level command
# assembly (diff generation, env unset list, config block, executor
# paths, flag choices) that is otherwise error-prone on every run
# (e.g. `--no-watch` accidentally inherited from smoke-script copy).
# The subject principal only picks a git ref range; everything else
# is fixed here.
#
# Usage:
#   bash scripts/review-pr.sh [GIT_REF_RANGE]
#
#   GIT_REF_RANGE defaults to `main..HEAD` — current branch vs main.
#   Explicit examples:
#     bash scripts/review-pr.sh main..HEAD
#     bash scripts/review-pr.sh main..feat/xyz
#     bash scripts/review-pr.sh HEAD~3..HEAD
#
# Fixed behaviour (not overridable here — edit the script if you
# truly need a different setup rather than ad-hoc assembly):
#   - Topology:         codex-main-subprocess
#                       (CODEX_THREAD_ID set, CLAUDE* unset → non-handoff path
#                        so review-invoke reaches the watcher call site too)
#   - Review mode:      full (9 lens)
#   - Subagent:         main-native (onto TS teamlead spawns codex per lens)
#   - Watcher:          ENABLED (iTerm2 / tmux / Apple Terminal auto-detected)
#   - Project root:     isolated tmp (config.yml + target diff only)
#   - Onto home:        this repo (authority / roles / lens registry)
#   - Session artifact: preserved on success so round1/*.md + synthesis.md
#                       remain inspectable
#
# Prereqs:
#   - codex binary on PATH + ~/.codex/auth.json
#   - repo's `dist/core-runtime/cli/review-invoke.js` built
#     (`npm run build:ts-core`)
#
# Exit: 0 review completed / non-zero invoke failed (tmp preserved for
# debugging).

set -euo pipefail

REF="${1:-main..HEAD}"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# ── Prereqs ────────────────────────────────────────────────────────────────
if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex binary not found on PATH. Install codex CLI and run \`codex login\`." >&2
  exit 2
fi
if [[ ! -f "${HOME}/.codex/auth.json" ]]; then
  echo "ERROR: ~/.codex/auth.json missing. Run \`codex login\`." >&2
  exit 2
fi
CLI="${REPO_ROOT}/dist/core-runtime/cli/review-invoke.js"
if [[ ! -f "${CLI}" ]]; then
  echo "ERROR: review-invoke.js not built at ${CLI}. Run \`npm run build:ts-core\` first." >&2
  exit 2
fi

# ── Workspace ──────────────────────────────────────────────────────────────
REVIEW_DIR="$(mktemp -d -t onto-review-pr-XXXXXX)"
mkdir -p "${REVIEW_DIR}/.onto"
echo "review workspace: ${REVIEW_DIR}" >&2

# Generate the diff as the review target. Empty diff → abort so we do
# not burn LLM tokens on a no-op review.
DIFF_FILE="${REVIEW_DIR}/pr.diff"
git -C "${REPO_ROOT}" diff "${REF}" > "${DIFF_FILE}"
if [[ ! -s "${DIFF_FILE}" ]]; then
  echo "ERROR: diff for range '${REF}' is empty. Nothing to review." >&2
  rm -rf "${REVIEW_DIR}"
  exit 2
fi
DIFF_BYTES=$(wc -c < "${DIFF_FILE}" | tr -d " ")
DIFF_LINES=$(wc -l < "${DIFF_FILE}" | tr -d " ")
echo "target diff: ${DIFF_BYTES} bytes, ${DIFF_LINES} lines (${REF})" >&2

# Axis-first config: subagent=main-native under codex host → topology
# resolves to codex-main-subprocess. Fixed.
cat > "${REVIEW_DIR}/.onto/config.yml" <<'EOF'
review:
  teamlead:
    model: main
  subagent:
    provider: main-native
review_mode: full
EOF

# Commit sha / intent for traceability in review-record.
COMMIT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short HEAD)"
INTENT="PR review (${REF} @ ${COMMIT_SHA})"

# ── Execute ────────────────────────────────────────────────────────────────
# NOTE: --no-watch is DELIBERATELY ABSENT so the live watcher pane spawns
# (iTerm2 split / tmux split / Apple Terminal tab, whichever the current
# env supports). CLAUDE_* unset + CODEX_THREAD_ID set routes through the
# non-handoff dispatch path so the watcher call site is actually reached.
cd "${REVIEW_DIR}"
STDOUT_LOG="${REVIEW_DIR}/review.stdout.log"
STDERR_LOG="${REVIEW_DIR}/review.stderr.log"
set +e
CODEX_THREAD_ID="review-pr-$(date +%s)" \
  env -u CLAUDECODE -u CLAUDE_PROJECT_DIR -u CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS \
  node "${CLI}" \
    "$(basename "${DIFF_FILE}")" "${INTENT}" \
    --project-root "${REVIEW_DIR}" \
    --onto-home "${REPO_ROOT}" \
    > "${STDOUT_LOG}" 2> "${STDERR_LOG}"
EC=$?
set -e

SESSION_DIR="$(find "${REVIEW_DIR}/.onto/review" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1 || true)"

if [[ "${EC}" -ne 0 ]]; then
  echo "review failed (exit=${EC}). Workspace preserved: ${REVIEW_DIR}" >&2
  exit "${EC}"
fi

echo "" >&2
echo "review complete." >&2
echo "  workspace:  ${REVIEW_DIR}" >&2
if [[ -n "${SESSION_DIR}" ]]; then
  echo "  session:    ${SESSION_DIR}" >&2
  echo "  synthesis:  ${SESSION_DIR}/synthesis.md" >&2
  echo "  final:      ${SESSION_DIR}/final-output.md" >&2
  echo "  round1:     ${SESSION_DIR}/round1/" >&2
fi
