#!/usr/bin/env bash
#
# Smoke test — topology `cc-teams-lens-agent-deliberation` (sketch v3 option 1-0).
#
# Handoff-only validation. 유일한 lens 간 deliberation 옵션. 3 중 opt-in +
# SendMessage A2A. 실 deliberation round 는 Claude Code 세션 + coordinator
# 수동 실행 필요 — 본 스크립트는 resolver + handoff JSON 검증만.
#
# What this script verifies:
#   1. resolver picked `cc-teams-lens-agent-deliberation`
#   2. STDOUT 에 `coordinator-start` handoff JSON
#   3. handoff topology.id === cc-teams-lens-agent-deliberation
#
# Requires:
#   - CLAUDECODE=1 (스크립트가 설정)
#   - CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (부모 환경)
#   - config 에 `lens_agent_teams_mode: true` (스크립트가 설정)
#   - Repo-built onto CLI (`npm run build:ts-core`)
#
# Exit codes: 0 pass / 1 fail / 2 skip (prereq missing).

set -euo pipefail

export SMOKE_TOPOLOGY_ID="cc-teams-lens-agent-deliberation"
# shellcheck disable=SC1091
source "$(dirname "$0")/fixture.sh"

# ── Prereqs ────────────────────────────────────────────────────────────────
if [[ -z "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" ]]; then
  smoke_skip "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env not set"
fi

# ── Config ─────────────────────────────────────────────────────────────────
cat > "${SMOKE_CONFIG_FILE}" <<EOF
execution_topology_priority:
  - cc-teams-lens-agent-deliberation
lens_agent_teams_mode: true
review_mode: light
EOF

# ── Execute ────────────────────────────────────────────────────────────────
STDERR_LOG="${SMOKE_TMP_ROOT}/review.stderr.log"
STDOUT_LOG="${SMOKE_TMP_ROOT}/review.stdout.log"

cd "${SMOKE_TMP_ROOT}"
CLAUDECODE=1 env -u CLAUDE_PROJECT_DIR -u CODEX_THREAD_ID -u CODEX_CI \
  node "${ONTO_CLI}" \
    "$(basename "${SMOKE_TARGET_FILE}")" "${SMOKE_INTENT}" \
    --project-root "${SMOKE_TMP_ROOT}" \
    --onto-home "${ONTO_REPO_ROOT}" \
    --no-watch \
    > "${STDOUT_LOG}" 2> "${STDERR_LOG}" || {
      smoke_fail "onto review exited non-zero; see ${STDERR_LOG}"
    }

# ── Assertions ─────────────────────────────────────────────────────────────

smoke_assert_file_contains "${STDERR_LOG}" \
  "\[topology\] cc-teams-lens-agent-deliberation: matched" \
  "topology resolver match"

smoke_assert_file_contains "${STDOUT_LOG}" \
  "\"handoff\": \"coordinator-start\"" \
  "coordinator-start handoff emission"

smoke_assert_file_contains "${STDOUT_LOG}" \
  "\"id\": \"cc-teams-lens-agent-deliberation\"" \
  "handoff topology.id"

smoke_pass
