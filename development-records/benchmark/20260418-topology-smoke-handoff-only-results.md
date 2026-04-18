---
as_of: 2026-04-18
purpose: |
  PR #117 후속. 사용자 요청 "가능한 모든 case 실행, LLM 호출 발생 case 만
  제외" 에 따라 5 Claude-host topology 에 대한 handoff-only smoke script
  신규 작성 + 실행. 이로써 sketch v3 catalog 8 topology 전수 smoke green
  확인 (LLM 호출 포함 + 제외 합산).
source_refs:
  prior_benchmark: "development-records/benchmark/20260418-topology-smoke-results.md"
  pr_117: "fix(smoke-topology): resolve 6 assertion-structure bugs (2026-04-18 merged, commit ad98401)"
  sketch_v3: "development-records/evolve/20260418-execution-topology-priority-sketch.md"
  manual_guide: "scripts/smoke-topology/manual-claude-host-topologies.md"
---

# Topology Smoke Handoff-Only Results — 2026-04-18

## Executive Summary

PR #117 머지 직후, Claude-host 5 topology (수동 실행 가정) 에 대해 **handoff-only 검증 방식** 의 smoke script 를 신규 작성 + 실행. 기존 자동 3 script 와 합해 **sketch v3 catalog 8 topology 전수 smoke green** 달성.

Handoff-only 검증이 가능한 이유: CLAUDECODE=1 환경에서 Claude-host topology 는 resolver 가 `coordinator-start` handoff JSON 을 emit 하고 종료함. 실 agent dispatch 는 주체자 (Claude Code) 세션 안에서만 발생하므로, plain shell 에서는 handoff JSON 의 정합성까지만 검증 가능하지만 — 이 검증만으로도 (a) resolver 가 해당 topology 를 선택했는지, (b) handoff payload 에 올바른 `topology.id` 가 담겼는지, (c) PR-G 가 구현한 topology descriptor 전달 경로가 작동하는지 확인됩니다. Full end-to-end (lens output, synthesis) 는 별도 경로 (Claude Code 세션 수동).

- **신규 script 5 개**: `cc-main-agent-subagent` / `cc-teams-agent-subagent` / `cc-teams-codex-subprocess` / `cc-teams-lens-agent-deliberation` / `cc-teams-litellm-sessions`
- **첫 실행 all-green (5/5)**: PR #117 의 stream / onto-home / cat / JSON-field assertion 패턴 재사용이 정확함을 확인
- **비용 0 LLM call**: handoff 단계까지만 진행, agent dispatch 없음

## 실행 결과 표

| 스크립트 | Prereq | 실행 결과 | exit | 비고 |
|---|---|---|---|---|
| `cc-main-agent-subagent.sh` | CLAUDECODE=1 | **PASS** | 0 | 가장 simple path |
| `cc-teams-agent-subagent.sh` | + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS | **PASS** | 0 | TeamCreate-based coordinator |
| `cc-teams-codex-subprocess.sh` | + codex binary | **PASS** | 0 | Claude teamlead + GPT lens 혼재 |
| `cc-teams-lens-agent-deliberation.sh` | + `lens_agent_teams_mode: true` config | **PASS** | 0 | 유일한 SendMessage A2A deliberation |
| `cc-teams-litellm-sessions.sh` | + LiteLLM endpoint reachable | **PASS** | 0 | `localhost:4000` reachable 감지 → skip 아니라 정식 green |

## Assertion 3 단계

모든 handoff-only 스크립트 공통 체크:

1. **Resolver match** (stderr): `[topology] <id>: matched` 라인 존재
2. **Handoff emission** (stdout): `"handoff": "coordinator-start"` 존재
3. **Topology identity** (stdout): `"id": "<id>"` 존재 (handoff payload 내부)

이 3 단계는 **최소 정합성** 검증. PR-G (topology descriptor 전달) + PR-I (prompt 소비) 의 end-to-end chain 중 "resolver 판정 → handoff payload 구성" 구간만 커버. 실 agent 가 handoff 를 읽고 dispatch 하는지는 Claude Code 세션 필요.

### 추가 field assertion 보강 후보 (후속 PR)

첫 실행 후 관찰된 handoff JSON 에는 아래 추가 필드가 있으며, topology 별로 예상값이 sketch v3 설계로부터 정의됨. 후속 PR 에서 assertion 보강 가능:

- `teamlead_location` — `"onto-main"` / `"claude-teamcreate"`
- `lens_spawn_mechanism` — `"agent-tool"` / `"claude-agent-subagent"` / `"codex-subprocess"` / `"inline-http"`
- `deliberation_channel` — `"synthesizer-only"` / `"sendmessage-a2a"`
- `max_concurrent_lenses` — topology 별 정수 (lens_agent_teams_mode 는 deliberation 특성상 1 가능)

이번 PR 은 최소 3 단계로 scope 확정. 추가 필드 assertion 은 실측 관찰 + design 문서 대조 후 별도 PR.

## 8 Topology Catalog 전수 smoke 상태 (2026-04-18 현재)

| # | topology | path 종류 | smoke script | 상태 |
|---|---|---|---|---|
| 1 | `codex-nested-subprocess` | full LLM (outer codex teamlead) | `codex-nested-subprocess.sh` | PASS (PR #117 + 재실행) |
| 2 | `codex-main-subprocess` | full LLM (codex CLI per lens) | `codex-main-subprocess.sh` | PASS (PR #117 + 재실행) |
| 3 | `cc-main-codex-subprocess` | handoff-only | `cc-main-codex-subprocess.sh` | PASS (PR #117) |
| 4 | `cc-main-agent-subagent` | handoff-only | **신규** | PASS (본 PR) |
| 5 | `cc-teams-agent-subagent` | handoff-only | **신규** | PASS (본 PR) |
| 6 | `cc-teams-codex-subprocess` | handoff-only | **신규** | PASS (본 PR) |
| 7 | `cc-teams-lens-agent-deliberation` | handoff-only | **신규** | PASS (본 PR) |
| 8 | `cc-teams-litellm-sessions` | handoff-only | **신규** | PASS (본 PR, LiteLLM endpoint reachable) |

**8/8 green** — sketch v3 catalog 전수 smoke 커버리지 달성.

## 수정된 기존 파일

- `scripts/smoke-topology/README.md` — "자동 실행 가능 스크립트" 3 → 8 로 갱신. LLM 호출 계열 3 + handoff-only 계열 5 분류. 비용 표 + 스크립트 구조 갱신

## 비용 기록

- 신규 5 script 실행: 0 LLM call (handoff-only)
- 재실행 검증 없음 (첫 실행 5/5 green 이므로 재실행 불필요)
- 본 세션 smoke 누적 총액: 20 call (PR #117) + 0 call (본 PR) = **20 LLM call**

## 주목할 관찰

### 1. LiteLLM endpoint 가 실제로 reachable

`cc-teams-litellm-sessions.sh` 의 prereq probe (`curl -fsS $LITELLM_URL/health` 또는 `/v1/models`) 가 `http://localhost:4000` 에 응답 받음 — 주체자 머신에 LiteLLM 서버가 동작 중. 이로 인해 skip (exit 2) 이 아닌 정식 matched + handoff emit 경로로 검증됨. 다른 개발자 머신에서는 skip 이 정상.

### 2. `experimental_agent_teams` signal 은 부모 셸에서 상속

Claude Code 세션은 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 을 child 프로세스로 전파 (아마도 `~/.claude/settings.json` 의 env 블록 효과). 스크립트가 이 env 를 직접 설정하지 않아도 resolver 의 experimental signal 이 true — plain terminal 에서 실행 시 부재할 수 있으므로 각 `cc-teams-*` 스크립트는 prereq check 에서 `[[ -z "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" ]] && smoke_skip` 로 처리.

### 3. "수동 전용 topology" 개념 해체

PR #117 전 README 는 5 Claude-host topology 를 "수동 실행 전용" 으로 분류. 그러나 handoff-only 검증이라는 layered scope 를 도입하면 "자동 가능 scope" 가 resolver + handoff emission layer 까지로 확장 가능. full end-to-end 는 여전히 수동이지만, handoff 층 regression 은 CI 에서 잡을 수 있음. README 에서 이 구분을 명시적 표현으로 갱신.

## 후속 권장

### 단기

- **CI 투입**: 8 script 전수 green 이므로 smoke CI job 가능. cost control 을 위해 LLM 호출 2 script (codex-nested, codex-main) 는 manual trigger, handoff-only 5 + cc-main-codex 는 PR CI 에서 자동 실행 권장
- **추가 field assertion 보강** (후속 PR): teamlead_location / lens_spawn_mechanism / deliberation_channel / max_concurrent_lenses. 실측 handoff JSON 을 design 문서와 대조해서 정확한 기대값 확정 후 적용

### 장기

- **onto core 로그 stream 일관성 감사**: 20260418-topology-smoke-results.md 에서 이미 언급. `[review runner]` 만 stdout, 나머지 stderr 인 혼재 해소 필요
- **Handoff payload schema 공식화**: PR-G 의 handoff JSON 구조를 TypeScript interface / JSON Schema 로 공식화. smoke assertion 도 schema 기반 validation 으로 upgrade 가능

## 참조

- PR #117 (2026-04-18 merged, commit ad98401) — 1 차 smoke fix + 첫 green
- `scripts/smoke-topology/manual-claude-host-topologies.md` — full end-to-end 수동 실행 가이드
- `development-records/evolve/20260418-execution-topology-priority-sketch.md` — 8 topology catalog 설계
- `processes/review/nested-spawn-coordinator-contract.md` — coordinator start / next state 전이
- PR-G: `src/core-runtime/cli/review-invoke.ts` 의 `emitCoordinatorStartHandoff`
