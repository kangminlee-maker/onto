# Topology Smoke Tests

Sketch v3 10 옵션 중 주체자가 수동 실행해 end-to-end 검증하는 smoke
test 스크립트 모음. **CI 에 상시 실행 넣지 않는다** — 실제 LLM 호출이
포함되어 토큰 비용 발생.

## 언제 실행하는가

- 새 topology 옵션을 sketch v3 catalog 에 추가 한 직후
- `executeReviewPromptExecution` / `resolveExecutorConfig` / coordinator
  state machine 에 변경이 있을 때 affected topology 로 검증
- Release 직전 regression 확인 (subscription 한도 내에서)

## Prerequisites

공통:
- `onto` CLI 빌드됨 (`npm run build:ts-core` — TypeScript → dist/ 컴파일)
- `~/.onto/config.yml` 또는 tmp `.onto/config.yml` 에 자격 세팅 가능
- 본 repo 의 `scripts/smoke-topology/fixture.sh` 를 source 할 수 있는 bash 4+

topology 별:

| topology | codex binary | CLAUDECODE=1 | experimental TeamCreate | Codex CLI session | LiteLLM endpoint |
|---|---|---|---|---|---|
| cc-main-agent-subagent | — | ✅ | — | — | — |
| cc-main-codex-subprocess | ✅ | ✅ | — | — | — |
| cc-teams-agent-subagent | — | ✅ | ✅ | — | — |
| cc-teams-codex-subprocess | ✅ | ✅ | ✅ | — | — |
| cc-teams-litellm-sessions | — | ✅ | ✅ | — | ✅ |
| cc-teams-lens-agent-deliberation | — | ✅ | ✅ + `lens_agent_teams_mode: true` | — | — |
| codex-main-subprocess | ✅ | — | — | ✅ | — |
| codex-nested-subprocess | ✅ | — | — | — | — |

**codex binary**: `which codex` + `~/.codex/auth.json` (chatgpt OAuth 또는 API key).
**Codex CLI session**: `CODEX_THREAD_ID` / `CODEX_CI` env 설정되어 있음.

## 자동 실행 가능 스크립트

**3 개**. 이들은 plain shell 에서 바로 `bash scripts/smoke-topology/<name>.sh` 로 실행.

- `codex-nested-subprocess.sh` — 가장 self-contained. codex binary 만 있으면 실행.
- `cc-main-codex-subprocess.sh` — `CLAUDECODE=1` env 를 스크립트가 설정 후 실행. 그러나 실제 Claude session 이 없으면 coordinator-start handoff 가 emit 될 뿐 실제 Agent 는 dispatch 안 됨 — 이 스크립트는 **handoff JSON 의 topology 필드 검증까지만** 수행.
- `codex-main-subprocess.sh` — `CODEX_THREAD_ID` env 를 스크립트가 설정 후 codex-path 확인.

## 수동 실행 전용 topology

Claude Code 세션 안에서만 의미 있는 topology. 스크립트가 아니라 **Claude Code 세션에서 직접 `/onto:review` 실행**:

- `cc-main-agent-subagent` — `.onto/config.yml` 에 `execution_topology_priority: [cc-main-agent-subagent]` 설정 + `/onto:review <target> "<intent>"`
- `cc-teams-*` — 추가로 `~/.claude*/settings.json` 에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- `cc-teams-lens-agent-deliberation` — 추가로 `lens_agent_teams_mode: true`

각 topology 별 실행 가이드: `manual-claude-host-topologies.md`.

## 스크립트 구조

모든 자동 스크립트는 동일한 phase 구조:

1. **Prereq check** — 필요한 binary / env 검증. 부재 시 skip 아니라 fail-fast.
2. **Fixture setup** — `fixture.sh` source → tmp project root + target md + config.yml.
3. **Execution** — `node dist/core-runtime/cli/review-invoke.js <target> "<intent>" --no-watch`.
4. **Assertion**:
   - session-metadata.yaml 의 execution_realization / host_runtime 확인
   - round1/ 아래 각 lens output 파일 존재 + 비어있지 않음
   - synthesis.md 존재 + 비어있지 않음
   - `[topology]` / `[plan:executor]` STDERR 라인에 기대 topology id 포함
5. **Cleanup** — tmp 제거 (실패 시에는 경로를 남겨 디버깅 가능).

## 종료 코드

- `0`: PASS
- `1`: FAIL with error message
- `2`: SKIP (prereq 미충족)

## 비용 의식

각 자동 스크립트는 **light mode** (`--review-mode light`) + **작은 target 하나**
로 token 최소화. light mode 는 `authority/core-lens-registry.yaml` 의
`light_review_lens_ids` 에 정의된 **4 lens** (logic / pragmatics / evolution /
axiology) 만 실행하므로, 실행 당 LLM 호출은 **lens 4 + synthesize 1 = 5 회**.

예상 비용:

- 자동 3 topology:
  - `codex-nested-subprocess` — 5 call (full path)
  - `codex-main-subprocess` — 5 call (full path)
  - `cc-main-codex-subprocess` — 0 call (coordinator-start handoff 후
    subject session 위임, 실 agent dispatch 는 Claude Code 세션 필요)
  - 소계 **10 call**
- 수동 5 topology (Claude Code 세션 안에서 실행): 각 5 call × 5 = **25 call**
- 합계 **약 35 call** — 구독 내 소비 수준이나 빈번히 돌리지는 않는 것이 원칙

> 참고: 이전 README 기술의 "7 × 10~12 ≈ 80" 은 `full_review_lens_ids` (9 lens)
> 가정. 실제 smoke 는 light mode 이므로 절반 이하.
