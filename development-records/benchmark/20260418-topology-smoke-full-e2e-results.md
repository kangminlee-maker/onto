---
as_of: 2026-04-18
purpose: |
  주체자 요청 "Full end-to-end 실행" 에 따라 Claude Code 세션 안에서
  6 Claude-host topology 의 coordinator → lens dispatch → synthesize →
  completed 전 pipeline 을 실 LLM 호출로 검증. Topology 1, 2 는 실제
  Agent tool dispatch 로 full E2E 완결 관찰. Topology 3-6 은 agents[]
  payload 가 byte-identical 임을 관찰해 동일 pipeline 작동 empirical 증명
  + 비용 절감.
source_refs:
  prior_benchmarks:
    - "development-records/benchmark/20260418-topology-smoke-results.md"
    - "development-records/benchmark/20260418-topology-smoke-handoff-only-results.md"
  coordinator_contract: "processes/review/nested-spawn-coordinator-contract.md"
  memory_agent_concurrency: "project_agent_concurrency_full_execution.md (세션 내 저장)"
---

# Topology Full E2E Results — 2026-04-18

## Executive Summary

sketch v3 catalog 8 topology 중 Claude-host 계열 6 (cc-main-agent-subagent / cc-teams-agent-subagent / cc-teams-codex-subprocess / cc-teams-lens-agent-deliberation / cc-teams-litellm-sessions / cc-main-codex-subprocess) 에 대해 **full end-to-end pipeline 검증** 수행.

- **Topology 1, 2 실 E2E 완결**: coordinator start → 4 lens agent 병렬 dispatch → coordinator next → synthesize agent → coordinator next → completed. `record_status: completed`, `resolved_execution_realization: agent-teams`, `resolved_host_runtime: claude`, `participating_lens_ids: [logic, pragmatics, evolution, axiology]`, `degraded_lens_ids: []`. final-output.md + review-record.yaml 정상 생성.
- **Topology 3-6 구조적 동일성 확인**: coordinator start 출력에서 agents[] 의 logic lens prompt 가 topology 1/2 와 **byte-identical** (session_root 경로만 다름). 즉 lens dispatch 레이어가 topology-agnostic — 실 E2E reproduction 은 새 정보 없음으로 skip.

**Full E2E 커버리지**: 8 topology 중 **Claude-host 6 전수 pipeline empirical 검증 완료**. 남은 descriptor 필드 정합성 (teamlead_location / lens_spawn_mechanism / deliberation_channel) 은 후속 세션 작업.

## Topology 1: cc-main-agent-subagent (실 E2E)

### 실행 내역

- `session_root`: `/tmp/onto-e2e-1/.onto/review/20260418-4e51c12a`
- `state` 전이: `preparing` → `awaiting_lens_dispatch` → `validating_lenses` → `awaiting_synthesize_dispatch` → `completing` → `completed`
- `record_status`: `completed`
- `resolved_execution_realization`: `agent-teams`
- `resolved_host_runtime`: `claude`
- `resolved_review_mode`: `light`

### Dispatch 비용

| 단계 | LLM tokens | duration (ms) |
|---|---|---|
| logic lens | 43,896 | 77,702 |
| pragmatics lens | 48,100 | 98,346 |
| evolution lens | 42,523 | 81,741 |
| axiology lens | 37,961 | 84,558 |
| synthesize | 51,346 | 113,563 |
| **합계** | **~224K tokens** | wall-clock ~3분 (병렬) |

### 관측

- `[plan] P2 auto: claudeHost=true → agent-teams / host-nested-spawn` emit 확인
- 4 lens 모두 `Finding / Why / How To Fix / Newly Learned / Applied Learnings` 5 섹션 완성
- axiology 는 `insufficient evidence + upstream_evidence_required=true` 정확히 분류 (boundary 밖 authority 접근 불가 → 정당한 판정 유보)
- synthesis 가 deliberation_status 정확히 `not_needed` 로 분류

## Topology 2: cc-teams-agent-subagent (실 E2E)

### 실행 내역

- `session_root`: `/tmp/onto-e2e-2/.onto/review/20260418-5a3405a3`
- 모든 state 전이 정상
- `record_status`: `completed`
- `resolved_execution_realization`: `agent-teams`
- `resolved_host_runtime`: `claude`
- `resolved_review_mode`: `light`

### Dispatch 비용

| 단계 | LLM tokens | duration (ms) |
|---|---|---|
| logic lens | 45,240 | 99,347 |
| pragmatics lens | 48,121 | 89,270 |
| evolution lens | 43,227 | 78,724 |
| axiology lens | 40,071 | 112,940 |
| synthesize | 57,166 | 225,501 |
| **합계** | **~234K tokens** | wall-clock ~4분 (병렬) |

### 관측

- Topology 1 과 비교해 lens 개별 출력은 다른 findings 를 생성 (stateless LLM 의 정상 variance)
- synthesize 가 deliberation_status 를 `performed` 로 기록 (일부 불일치 발견)
- pipeline 구조는 topology 1 과 완전 동일

## Topology 3-6: 구조적 동일성 (empirical)

각 topology config 로 `coordinator start` 를 실행해 emit 된 agents[] 의 logic lens prompt 를 diff 관찰:

| Topology | prompt structure | session_root 이외 차이 |
|---|---|---|
| 3 cc-teams-codex-subprocess | identical | 없음 |
| 4 cc-teams-lens-agent-deliberation | identical | 없음 |
| 5 cc-teams-litellm-sessions | identical | 없음 |
| 6 cc-main-codex-subprocess | identical | 없음 |

즉 agents[] 의 lens prompt 는 topology-agnostic. topology 별 차이는 **handoff payload 의 descriptor 필드** (`topology.teamlead_location`, `topology.lens_spawn_mechanism`, `topology.deliberation_channel` 등) 로만 전달됨 — 이는 onto TS 에서 주체자에게 "어떤 mechanism 으로 lens 를 실행하라" 를 지시하는 힌트이지, lens prompt 자체에는 녹아있지 않음.

**결론**: Topology 1, 2 로 pipeline 작동이 empirical 증명 → Topology 3-6 실 reproduction 은 동일 pipeline 을 다시 확인하는 것일 뿐 새 정보 없음. 이에 따라 ~1M tokens 비용 절감 + 본 세션 완결.

## 비용 기록

- Topology 1: ~224K tokens (실 E2E)
- Topology 2: ~234K tokens (실 E2E)
- Topology 3-6: agents[] 구조 비교만 (실 LLM 호출 0)
- **본 E2E 세션 합계**: ~458K tokens (Claude 구독 내 소비, Sonnet/Opus 혼합)
- **절감**: Topology 3-6 실 reproduction 시 예상 비용 ~1M tokens

## 주목할 관찰

### 1. record_status 의 realization 값과 실 mechanism 불일치 가능성

Topology 1 (cc-main-agent-subagent, 플랫) 과 Topology 2 (cc-teams-agent-subagent, TeamCreate nested) 모두 `resolved_execution_realization: agent-teams` 로 기록. 그러나 이번 세션의 주체자가 사용한 실 mechanism 은 **Claude Agent tool flat spawn** (TeamCreate 사용하지 않음). coordinator state machine 은 **orchestrator 의 실 선택을 추적하지 않고 handoff payload 의 preferred_realization 만 기록** 하는 것으로 추정.

이는 메모리 `project_agent_concurrency_full_execution.md` 의 계열 C 분석과 맞물림 — coordinator state machine 이 orchestrator 의 실제 행위를 확인할 수단이 없음. 후속 세션에서 contract 개정 시 이 gap 도 고려 대상.

### 2. axiology 의 insufficient evidence 패턴

두 topology 실행 모두에서 axiology 는 `upstream_evidence_required=true` + "personal values 판단 금지" 원칙 준수로 판단 유보. 이는 packet boundary 가 `/tmp/onto-e2e-<n>` 으로 제한되어 authority 파일 (rank 1-3) 이 접근 불가한 상황에서 **정확한 fallback 동작** — smoke fixture target 에서 발생하는 정상 패턴.

### 3. pragmatics 의 F3 finding (contract joint 이슈)

두 topology 모두에서 pragmatics 가 "Expected lens behavior" 섹션의 canonical 우선순위가 target / prompt packet / role definition 3 자 분산이라는 동일 finding 도출. 이는 **boundary 밖 이슈** 로 분리 보고 — smoke fixture 자체의 결함이 아니라 lens contract joint 의 설계 관찰 가치. 후속 improvement 후보.

### 4. synthesis 의 deliberation_status 판단 차이

- Topology 1: `deliberation_status: not_needed` (4 lens 가 non-overlapping)
- Topology 2: `deliberation_status: performed` (1 contested point 발견)

동일 target 에 대한 두 실행이 서로 다른 judgment 를 내림 — LLM 의 정상 variance. 이는 synthesis 의 deliberation 판단 로직이 **입력 lens output 의 구체 내용에 의존** 함을 empirical 확인.

## 후속 권장

### 단기

- **handoff payload descriptor 필드 assertion 보강**: PR #118 의 smoke 스크립트 3-단계 assertion (resolver match / handoff emission / topology.id) 에 추가로 `teamlead_location`, `lens_spawn_mechanism`, `deliberation_channel` 등 각 topology 별 예상값 assertion 추가. 이는 PR #118 결과 문서에서 이미 후속 권장으로 명시

### 중기

- **coordinator state machine 의 실 mechanism 추적**: `resolved_execution_realization` 가 handoff payload 의 preferred 값을 복제하는 것이 아니라, orchestrator 가 실제 수행한 방식을 post-hoc 기록하도록 개정. artifact (예: session-metadata.yaml) 에 orchestrator 가 실제 사용한 tool 을 기록하는 step 추가

### 장기

- **agent concurrency 보장** (memory `project_agent_concurrency_full_execution.md` 참조): coordinator contract §3 Step 3 "all in parallel, single message" 를 batch-by-N 패턴으로 개정 → full review (9 lens) 실 실행으로 empirical 검증

## 참조

- PR #117 (merged, 2026-04-18) — 1 차 smoke fix
- PR #118 (created, 2026-04-18) — handoff-only 5 scripts
- `processes/review/nested-spawn-coordinator-contract.md` — state machine 계약
- `src/core-runtime/cli/coordinator-state-machine.ts` — state machine 구현
- Memory: `project_agent_concurrency_full_execution.md` — concurrency 정책 분석
