---
as_of: 2026-04-19
status: active
functional_area: phase-4-five-activity-v1-design-session
purpose: |
  /clear 후 다음 세션이 Phase 4 설계 — Stage 2 Track C/D (govern v1 ↔
  learn v1) 동시 설계를 즉시 시작할 수 있도록 self-contained handoff.
  주체자 Q1~Q7 결정 완료 (2026-04-19), design-input 문서 merged 상태
  가정. 본 handoff 는 design session entry 만 제공.
source_refs:
  design_input: "development-records/evolve/20260419-phase4-design-input.md"
  onto_direction: "development-records/evolve/20260413-onto-direction.md"
  v1_backlog_memory: "project_v1_and_autonomy_backlog.md"
  review_precedent: "project_core_axis_empirical_recomposition.md (PR #131 3-round dogfood)"
---

# Phase 4 설계 세션 Handoff — 2026-04-19 → Next Session

## 0. /clear 후 첫 명령

```
development-records/plan/20260419-phase4-handoff.md 읽고 Phase 4 Stage 2 설계 시작
```

본 handoff 는 self-contained. 이전 세션의 어떤 memory 도 기대하지 않는다.

## 1. 이전 세션 (2026-04-19) 요약

- **PR #131 merged** (`7853ac1`): core-axis lens set empirical recomposition v0.2.1 (4→6 lens cost-constrained Pareto-optimal). 3-round full review convergence (5 fail → 0 fail).
- **PR #132 merged** (`bb58541`): W-A-77 activity rename stragger 2 파일 흡수 (design→evolve, build→reconstruct).
- **Phase 4 design-input 문서 생성** + commit (branch: `docs/phase4-design-input`, commit `0f4a2db`).
- **Memory verification**: W-ID 142/142 (원 143 오류 정정), 축 D 미완 0 (이미 해소), §1.4 측정 인프라 3 측면 모두 구현.
- **주체자 Q1~Q7 결정 수집** (design-input §4 기록).

## 2. Phase 4 설계 범위 (주체자 결정 확정)

### 2.1 5 활동 v1 scope

| 활동 | v0 seat | v1 추가 범위 | 규모 |
|---|---|---|---|
| review | v0.2.1 (PR #131) + Phase 3-4 A1~A5 | 현 상태 유지 | — |
| evolve | 6-Phase Inquiry + CLI | ontology 활용 경로 완결 + learning 수집 완결 | M |
| reconstruct | 6-phase scope-runtime + CLI | domain knowledge "왜" 자동 추정 + Principal 검증 자동화 | L |
| learn | extractor + loader + promote v0 | 파일 자동 편집 + govern 기준 준수 강제 | M |
| govern | queue + drift engine + promote-principle (기록만) | 승인 강제 차단 + drift probe + authority 자동 반영 | L |

### 2.2 Track 순서 (Q2 결정: 옵션 A)

1. **Stage 2**: Track C (learn v1) + Track D (govern v1) **단일 세션 동시 설계** — 순환 의존 해소
2. **Stage 3a**: Track B (reconstruct v1) — C/D 합의 후
3. **Stage 3b**: Track A (evolve v1) — B 완료 후 (reconstruct 산출물 dependency)
4. **Stage 4**: Dogfood + Log 공통 계약
5. **Stage 5**: (Phase 5 로 분리 결정) 자율성 수준 2 trigger 도구

### 2.3 Dogfood + Log cross-cutting (Q6/Q7 결정)

- **Mandatory**: 각 activity v1 완료 기준 = §1.4 기준 + "dogfood 최소 3 세션 + feedback-to-product 증명"
- **Log seat**: `.onto/dogfood/{activity}/{session-id}/` (gitignored, 6 파일 구조) + `development-records/dogfood/` aggregated dashboard (commit)
- **Infra 재사용**: review-log.ts (W-A-71) + eval-persistence.ts (W-C-04) + usage-tracker.ts (W-A-72) raw data source
- **Precedent**: PR #131 의 3-round self-review (이미 실행된 dogfood 첫 precedent)
- **보강 (2026-04-22)**: 본 Log seat 는 dogfood layer 의 mirror seat 이며 5 활동의 본질 sink 가 아니다. 정본 규약 + Mandatory 재해석은 `.onto/processes/govern.md §14.6` (dogfood SDK-like sink 의존 방향 invariant) 참조.

## 3. Stage 2 설계 시작점 — Track C/D 순환 의존 해소

### 3.1 문제

- **govern v1** = 승인 강제 차단 + 자동 authority 반영. 외부 consumer 가 Principal 승인 없이 authority 파일 변경 못 하도록
- **learn v1** = 파일 자동 편집. promote decide approve 후 실제 `.onto/learnings/` 파일에 write
- **순환**: learn v1 의 자동 편집은 govern v1 의 승인 강제 없으면 Principal 우회 가능. govern v1 의 자동 반영은 learn v1 이 파일을 먼저 편집해야 원복 가능성 유지.

### 3.2 설계해야 할 계약

1. **2-phase commit 또는 staging area** — learn 이 "편집 제안" 을 staging 에 쓰고, govern 이 final commit
2. **Rollback protocol** — govern 판정이 reject 일 때 staging 에서 제거, commit 시 audit log
3. **Authority 파일 직접 편집 vs patch 제안** — govern 이 raw write 허용 또는 patch only 만 허용
4. **Principal 개입 지점** — learn 자동 편집은 어느 경계까지 자동, 어느 경계 초과 시 Principal 직접
5. **drift engine v1 과의 연결** — drift probe 가 staging 의 잠재 drift 먼저 감지

### 3.3 설계 input 으로 참조할 기존 자료

- `src/core-runtime/govern/queue.ts` — event log seat (이미 존재)
- `src/core-runtime/govern/drift-engine.ts` — classifier + router v0 (이미 존재)
- `src/core-runtime/govern/promote-principle.ts` — W-C-03 v0 (decide approve 후 수동 편집)
- `processes/govern.md` — v0 bounded minimum surface 계약
- `processes/learn/promote.md` — learn promotion 계약
- `project_onto_direction.md` §1.3 "Drift 정책 기반 분기" (3 분기: self_apply / queue / principal_direct)

### 3.4 설계 첫 단계 제안 (Phase 4 Stage 2 Step 1)

1. 현 `govern/drift-engine.ts` 의 3 분기 (self_apply / queue / principal_direct) 가 learn v1 의 자동 편집과 어떻게 결합되는지 기술
2. "learn 이 편집할 authority 파일" 과 "govern 이 강제 차단할 authority 파일" 의 intersection 정의
3. 2-phase commit 계약 초안 (staging area 경로, commit 조건, rollback 경로)
4. Principal 개입 지점 matrix (자동 vs Principal 의 경계)

## 4. W-ID 부여 규칙 (Q4 결정: 옵션 A)

기존 축 (W-A/B/C/D) 에 v1 W-ID 추가:
- Track C (learn v1) → `W-A-79~` 또는 `W-C-09~` 추가
- Track D (govern v1) → `W-C-09~` 추가 (같은 축)
- Track B (reconstruct v1) → `W-A-80~` 추가
- Track A (evolve v1) → `W-A-81~` 추가

**주의**: 기존 142 W-ID 는 모두 done. v1 은 신규 id 범위 (79+, 9+). dep graph 는 기존 v0 W-ID 를 `depends_on` 으로 가짐.

## 5. 다음 세션 entry 체크리스트

/clear 직후:

- [ ] `git status` → main, clean. Branch main 에서 작업 시작
- [ ] `git log --oneline -3` 확인 — top 3 에 `bb58541` (#132), `7853ac1` (#131), `0f4a2db` or merge commit 포함
- [ ] 본 handoff + design-input 정독
- [ ] §3.4 Phase 4 Stage 2 Step 1 부터 설계 시작
- [ ] 신규 branch `feat/phase4-stage2-govern-learn-v1` (또는 설계만 `docs/phase4-stage2-design`) 생성

## 6. 현 세션 종료 상태 (본 handoff 의 전제)

- main 에 PR #131 + #132 모두 merge 완료
- `docs/phase4-design-input` branch PR 진행 중 (주체자 approve 대기)
- 본 handoff 는 design-input PR merge 후 활성화

## 7. 참조

- **Design input**: `development-records/evolve/20260419-phase4-design-input.md`
- **Onto direction §1**: `development-records/evolve/20260413-onto-direction.md`
- **W-ID 실행 단계 (142/142)**: `development-records/evolve/20260413-onto-todo.md`
- **V1 backlog memory**: `project_v1_and_autonomy_backlog.md`
- **Dogfood precedent (PR #131 3-round)**: `project_core_axis_empirical_recomposition.md`

## 8. Lifecycle

- **Active**: Phase 4 Stage 2 (Track C/D) 설계 완료 시까지
- **Superseded**: Stage 2 설계 PR merge 시 "superseded by <PR>" 표시
- **Archive**: 전체 Phase 4 완료 시 reference 로 활용
