#!/usr/bin/env bash
#
# Smoke test — topology `cc-teams-agent-subagent` (sketch v3 option 1-1).
#
# Handoff-only validation. 주체자가 TeamCreate 로 coordinator subagent nested
# spawn → coordinator 가 Agent tool 로 lens subagent 추가 nested spawn. 실
# dispatch 는 Claude Code 세션에서만 가능 — 본 스크립트는 handoff JSON 의
# topology 필드 정합성만 검증.
#
# What this script verifies:
#   1. resolver picked `cc-teams-agent-subagent`
#   2. STDOUT 에 `coordinator-start` handoff JSON
#   3. handoff topology.id === cc-teams-agent-subagent
#
# Requires:
#   - CLAUDECODE=1 (스크립트가 설정)
#   - CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (부모 세션의 ~/.claude*/settings.json
#     env 블록 또는 프로세스 환경 변수에 이미 존재해야 함 — 부재 시 resolver 의
#     experimental signal 이 false 이고 cc-teams-* 는 matched 못 함)
#   - Repo-built onto CLI (`npm run build:ts-core`)
#
# Exit codes: 0 pass / 1 fail / 2 skip (prereq missing).

set -euo pipefail

export SMOKE_TOPOLOGY_ID="cc-teams-agent-subagent"
# shellcheck disable=SC1091
source "$(dirname "$0")/fixture.sh"

# ── Prereqs ────────────────────────────────────────────────────────────────
if [[ -z "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" ]]; then
  smoke_skip "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env not set; cc-teams-* topologies require experimental signal"
fi

# ── Config ─────────────────────────────────────────────────────────────────
cat > "${SMOKE_CONFIG_FILE}" <<EOF
execution_topology_priority:
  - cc-teams-agent-subagent
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
  "\[topology\] cc-teams-agent-subagent: matched" \
  "topology resolver match"

smoke_assert_file_contains "${STDOUT_LOG}" \
  "\"handoff\": \"coordinator-start\"" \
  "coordinator-start handoff emission"

smoke_assert_file_contains "${STDOUT_LOG}" \
  "\"id\": \"cc-teams-agent-subagent\"" \
  "handoff topology.id"

smoke_pass
