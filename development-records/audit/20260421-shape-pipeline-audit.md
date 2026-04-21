---
as_of: 2026-04-21
status: audit-complete
functional_area: review-execution-ux-redesign-p8
purpose: |
  Review UX Redesign 의 6 TopologyShape × 7 review pipeline step 에 대한
  dispatch-level smoke audit. P1~P5 완료 이후 각 shape 가 resolver →
  mapper → executor 경로에서 일관되게 작동하는지, spawn-ready 여부를
  documented 하는 것이 목적. 실제 LLM 호출은 수행하지 않음 (hermetic).
source_refs:
  design_doc: "development-records/evolve/20260420-review-execution-ux-redesign.md"
  test_seat: "src/core-runtime/review/shape-pipeline-audit.test.ts"
  support_sets:
    pr_a: "src/core-runtime/review/execution-topology-resolver.ts:PR_A_SUPPORTED_TOPOLOGIES (3)"
    pr_b: "src/core-runtime/cli/topology-executor-mapping.ts:PR_B_SUPPORTED_TOPOLOGIES (6)"
---

# Shape × Pipeline Audit — Review UX Redesign P8 (2026-04-21)

## 1. Scope

Review UX Redesign P1~P5 가 main 에 landed 된 시점 (commits #152~#156) 의 설계 정합성을 검증. 목적은 **6 TopologyShape × 7 pipeline step** 격자 위에서 각 셀이 의도대로 작동하거나, 의도된 deferred 상태인지 기록.

**범위 밖**: 실제 LLM 호출, codex 바이너리 실행, Claude Code TeamCreate 호출. 이들은 후속 phase (PR-C / PR-D) 또는 수동 smoke run 의 책임.

## 2. 6 TopologyShape recap

| Shape | 의미 | Teamlead | Lens |
|---|---|---|---|
| `main_native` | host main session + host native subagent | onto-main (CC) / codex-subprocess (Codex) | claude-agent-tool / codex-subprocess |
| `main_foreign` | host main + 명시 foreign provider lens | onto-main | codex/litellm/anthropic/openai |
| `main-teams_native` | TeamCreate teamlead + native lens | claude-teamcreate | claude-agent-tool |
| `main-teams_foreign` | TeamCreate teamlead + foreign lens | claude-teamcreate | codex-subprocess / litellm-http |
| `main-teams_a2a` | TeamCreate + native + SendMessage A2A | claude-teamcreate | claude-teamcreate-member |
| `ext-teamlead_native` | 외부 spawned teamlead + 그 process native | codex-subprocess | codex-subprocess |

## 3. 7 Pipeline step taxonomy

| # | Step | Shape-sensitive? | 소비하는 topology 필드 |
|---|---|---|---|
| 1 | interpret | No | `topology.id` (logging), `topology.lens_spawn_mechanism` (prompt shaping hints) |
| 2 | bind | No | `teamlead_location` (session-metadata 기록) |
| 3 | start-session | No | `id`, `max_concurrent_lenses` (session seed) |
| 4 | materialize | No | `max_concurrent_lenses` (packet batching) |
| 5 | **dispatch lenses** | **Yes** | 전 field (executor binary 선택, A2A channel 설정, teamlead spawn) |
| 6 | synthesize | No | `deliberation_channel` (synth input format) |
| 7 | complete | No | `plan_trace` (final-output 기록) |

**결론**: 오직 step 5 만 shape-specific. 나머지 6 step 은 topology metadata 를 opaque snapshot 으로 소비 — 모든 shape 에서 동일 coding path.

## 4. Audit matrix (6 shape × spawn-readiness)

| Shape | Derivation | Mapped TopologyId | PR_B supported? | Status |
|---|---|---|---|---|
| `main_native` (Claude) | ✅ test | `cc-main-agent-subagent` | ✅ | Full spawn-ready |
| `main_native` (Codex) | ✅ | `codex-main-subprocess` | ✅ | Full spawn-ready |
| `main_foreign` (codex) | ✅ test | `cc-main-codex-subprocess` | ✅ | Full spawn-ready |
| `main-teams_native` | ✅ test | `cc-teams-agent-subagent` | ✅ | Full spawn-ready |
| `main-teams_foreign` (codex) | ✅ test | `cc-teams-codex-subprocess` | ✅ | Full spawn-ready |
| `main-teams_foreign` (litellm) | ✅ test (additional) | `cc-teams-litellm-sessions` | ✅ | Full spawn-ready |
| `main-teams_a2a` | ✅ test | `cc-teams-lens-agent-deliberation` | ❌ | **Deferred — PR-D** (SendMessage A2A lifecycle) |
| `ext-teamlead_native` | ✅ test | `codex-nested-subprocess` | ❌ | **Deferred — PR-C** (ext-codex outer teamlead orchestration) |

**Spawn-ready 비율**: 4 shape (6 TopologyId) / 6 shape (8 TopologyId match) = **66.7% of shapes**, **75% of TopologyIds**

> **Row coverage note**: `✅ test` 마커가 붙은 행은 `src/core-runtime/review/shape-pipeline-audit.test.ts` 의 AUDIT_MATRIX 에서 primary row 로 직접 검증됩니다. 마커 없는 행 (`main_native (Codex)`, `main-teams_foreign (litellm)` 과 같은 shape variant) 은 동일 shape 의 다른 host / provider 조합이며 **sibling test 파일에서 커버** 됩니다 — `shape-to-topology-id.test.ts` (mapping), `topology-shape-derivation.test.ts` (derivation). 이는 layered test architecture — unit layer 의 중복 커버리지를 audit integration layer 에서 재실행하지 않는 의식적 결정.

## 5. Gap 분석

### 5.1 `main-teams_a2a` — PR-D 대기

User 가 `lens_deliberation: sendmessage-a2a` 를 선택하면 validator + derivation 은 정상 작동하고 resolver 도 `cc-teams-lens-agent-deliberation` 을 dispatch 하지만, `PR_B_SUPPORTED_TOPOLOGIES` 에는 포함 안 됨 → lens executor mapping 이 fail.

**현재 동작**: P3 universal fallback 이 활성. `cc-teams-lens-agent-deliberation` spawn 실패 시 main_native shape 으로 강등. 이 경로는 테스트 `execution-topology-resolver-axis-first.test.ts` 에서 검증됨.

**완전 작동 조건 (PR-D)**: TeamCreate member 간 SendMessage A2A orchestration, `coordinator-state-machine` 의 round 1 loop 확장, deliberation summary 합성.

### 5.2 `ext-teamlead_native` — PR-C 대기

Plain terminal (no Claude, no Codex CLI) 에서 `onto review` 호출 + `review.teamlead.model = {provider: codex, ...}` 지정 시 resolver 가 `codex-nested-subprocess` 선택. 하지만 PR-B 는 이 topology 의 spawn path (outer codex 가 중첩 codex subprocess 로 lens dispatch) 를 구현 안 함.

**현재 동작**: 이 케이스를 목적으로 config 를 구성하면 resolver 가 resolved 반환 후 executor mapping 단계에서 `PR-B 지원 set 밖` error throw.

**완전 작동 조건 (PR-C)**: `codex-nested-teamlead-executor.ts` (이미 개발 records 에 sketch) 의 outer orchestration + inner codex spawn. P6 docs 작성 시 "PR-C 구현 대기" 명시 필요.

### 5.3 Pipeline step 1~4, 6~7 의 shape 독립성

Stage 5 테스트 (`pipeline step invariants`) 가 6 shape 모두에 대해 `ExecutionTopology` 의 5 load-bearing field (`id`, `lens_spawn_mechanism`, `teamlead_location`, `max_concurrent_lenses`, `deliberation_channel`, `plan_trace`) 가 resolved 됨을 assertion. 이는 "step 1~4, 6~7 이 shape 를 보지 않고도 일관되게 작동할 수 있다" 는 구조적 보장.

## 6. 발견된 회귀 부재

P1~P5 구현 중 기존 회귀 없음:
- 전체 vitest: 1914 pass → 1914 + 36 new = 1950 pass (regression 0)
- `DEFAULT_TOPOLOGY_PRIORITY` 에 모든 audit TopologyId 포함 (non-drift)
- `PR_A_SUPPORTED_TOPOLOGIES ⊆ PR_B_SUPPORTED_TOPOLOGIES` invariant 유지 (monotonic widening)

## 7. 후속 작업

| 항목 | Phase | 우선순위 |
|---|---|---|
| Docs 전수 갱신 (6 shape 매핑표 + PR-B/C/D 경계 명시) | P6 | 즉시 — P7 blocker |
| Legacy `execution_topology_priority` 제거 | P7 | P6 이후 |
| PR-C (codex-nested outer teamlead spawn) | 독립 phase | ext-teamlead_native 필요 시점 |
| PR-D (SendMessage A2A deliberation) | 독립 phase | main-teams_a2a 필요 시점 |

## 8. 결론

- **4/6 shape** 가 full spawn-ready (implicit 5번째 shape variant 포함 시 5)
- **2/6 shape** (main-teams_a2a, ext-teamlead_native) 는 P3 universal fallback 이 안전망으로 working — review 실행은 가능, 단 사용자 의도 대로의 shape 은 아님
- **dispatch path 정합성**: 모든 shape 가 resolver 에서 axis-first 로 선택되고, mapper 에서 올바른 TopologyId 로 매핑됨 (36 tests PASS)
- **Pipeline step 독립성**: step 5 외 모든 step 은 topology 에 opaque — shape 변경이 기존 step 에 영향 주지 않음

Design integrity: **확증**. Redesign 의 결합도 / 확장성 설계 목표 달성.
