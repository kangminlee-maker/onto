#!/usr/bin/env bash
#
# Smoke test — topology `cc-main-codex-subprocess` (sketch v3 option 2-2).
#
# Simulates Claude Code host environment via CLAUDECODE=1 env. Real Agent tool
# orchestration is not possible from a plain shell — this script instead
# verifies the **self path** (non-coordinator-start route): when the resolved
# topology uses onto-main teamlead + codex-subprocess lens, the runner
# proceeds to `runReviewPromptExecution` with codex executor per lens.
#
# Note: when CLAUDECODE=1 is set, auto-resolution normally emits a
# coordinator-start handoff. But when `execution_topology_priority` picks
# `cc-main-codex-subprocess` (onto-main teamlead, not claude-teamcreate),
# the runner stays in self path with the codex executor binary (mapping
# seat in PR #100).
#
# Requires:
#   - codex binary + ~/.codex/auth.json
#   - Repo-built onto CLI (`npm run build`)
#
# Exit codes: 0 pass / 1 fail / 2 skip (prereq missing).

set -euo pipefail

export SMOKE_TOPOLOGY_ID="cc-main-codex-subprocess"
# shellcheck disable=SC1091
source "$(dirname "$0")/fixture.sh"

# ── Prereqs ────────────────────────────────────────────────────────────────
if ! command -v codex >/dev/null 2>&1; then
  smoke_skip "codex binary not on PATH"
fi
if [[ ! -f "${HOME}/.codex/auth.json" ]]; then
  smoke_skip "~/.codex/auth.json missing; run \`codex login\` first"
fi

# ── Config ─────────────────────────────────────────────────────────────────
cat > "${SMOKE_CONFIG_FILE}" <<EOF
execution_topology_priority:
  - cc-main-codex-subprocess
review_mode: light
codex:
  model: gpt-5.4
  effort: medium
EOF

# ── Execute ────────────────────────────────────────────────────────────────
STDERR_LOG="${SMOKE_TMP_ROOT}/review.stderr.log"
STDOUT_LOG="${SMOKE_TMP_ROOT}/review.stdout.log"

cd "${SMOKE_TMP_ROOT}"
# Set CLAUDECODE=1 to satisfy cc-main-* requirement. Unset Codex session
# signals to avoid codex-B matching first. Coordinator-start handoff emission
# vs self path execution is decided by onto; for this topology (onto-main
# teamlead) we expect self path.
CLAUDECODE=1 env -u CLAUDE_PROJECT_DIR -u CODEX_THREAD_ID -u CODEX_CI \
  node "${ONTO_CLI}" \
    "$(basename "${SMOKE_TARGET_FILE}")" "${SMOKE_INTENT}" \
    --project-root "${SMOKE_TMP_ROOT}" \
    --onto-home "${SMOKE_TMP_ROOT}" \
    --no-watch \
    > "${STDOUT_LOG}" 2> "${STDERR_LOG}" || {
      smoke_fail "onto review exited non-zero; see ${STDERR_LOG}"
    }

# ── Assertions ─────────────────────────────────────────────────────────────

# (1) Resolver picked cc-main-codex-subprocess.
smoke_assert_stderr_contains "${STDERR_LOG}" \
  "\[topology\] cc-main-codex-subprocess: matched" \
  "topology resolver match"

# (2) PR-F executor mapping emitted (codex executor selected).
smoke_assert_stderr_contains "${STDERR_LOG}" \
  "\[plan:executor\] topology=cc-main-codex-subprocess" \
  "PR-F executor mapping"

# If a coordinator-start handoff was emitted instead (which can happen for
# claude-agent-tool topologies), we detect it and skip further assertions
# with a specific message — this topology SHOULD NOT produce handoff.
if grep -q '"handoff": "coordinator-start"' "${STDOUT_LOG}"; then
  smoke_fail "coordinator-start handoff emitted — cc-main-codex-subprocess should run self path"
fi

# (3) Lens outputs non-empty + (4) synthesize output.
SESSION_ROOT="$(readlink -f "${SMOKE_TMP_ROOT}/.onto/review/.latest-session" 2>/dev/null || true)"
if [[ -z "${SESSION_ROOT}" || ! -d "${SESSION_ROOT}" ]]; then
  smoke_fail "unable to locate session_root; stderr=${STDERR_LOG}"
fi

ROUND1_COUNT="$(find "${SESSION_ROOT}/round1" -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')"
if [[ "${ROUND1_COUNT}" -lt 1 ]]; then
  smoke_fail "no round1/*.md files produced under ${SESSION_ROOT}"
fi
for f in "${SESSION_ROOT}/round1"/*.md; do
  smoke_assert_nonempty_file "${f}" "lens output ${f##*/}"
done
smoke_assert_nonempty_file "${SESSION_ROOT}/synthesis.md" "synthesis.md"

smoke_pass
