---
as_of: 2026-04-15T13:30:00+09:00
supersedes: 20260415-execution-session9-startup.md
status: active
functional_area: execution-startup
purpose: 실행 단계 세션 10 startup handoff. 세션 9 종료 후 (104/141 = 73.8%), 남은 C 블로커 4건 + example entry 정리 + 기타 잔여 진행 준비.
---

# 실행 단계 Session 10 Startup Handoff

## 첫 명령

```
/Users/kangmin/cowork/onto-4/development-records/plan/20260415-execution-session10-startup.md 읽고 실행 단계 이어서 진행해줘
```

---

## 1. 현재 상태 (세션 9 종료 시점)

### 진행률 (2026-04-15 세션 9 종료)

| 항목 | 수치 |
|---|---|
| **전체 done** | **104/141 (73.8%)** — 73% 돌파, 세션 9 단독 +33.4%p |
| **active** | 14건 (examples 2건 포함 = 실질 12건) |
| **deferred** | 25건 |
| canonical-advancing done | 14/18 (77.8%) |
| 축 A | 70/78 (89.7%) |
| 축 B | 29/51 (57%) |
| 축 C | 0/8 (0%) ← 본 세션 주요 진입 |
| 축 D | 4/4 (100%) ← 완결 |

### 브랜치 / PR

- 세션 9 `exec/session9-20260415` → **PR #45 OPEN** (7 commit). merge 대기.
- 세션 10 진입 전 PR #45 merge 확인 → main 동기화 → 신규 `exec/session10-YYYYMMDD` 생성.

### 세션 9 완결 cluster

1. **build_review_cycle** (48 W-ID): done 47 + deferred 1 (R-29 external)
2. **agent_id_rename** (6 W-ID): 6 Phase + migration script + 12 dual-read tests
3. **A축 supporting 잔여** (5 W-ID): lexicon v0.11.0 — competency_question + competency_scope + provenance + modularity_boundary + fact_type(v0.10.0)

### 세션 9 보관

- `development-records/plan/20260415-business-domain-wave-worklist.md` — business_domain_wave 8 W-ID 작업 리스트 보관 (주체자 지시)
- `development-records/plan/20260415-deferred-inventory-session9-review.md` — 25 deferred 전수 재검토 + 재활성 trigger 명시

---

## 2. 세션 10 진입 대상

### 2.1 남은 active 14건 실체 (주의: 2건은 example entry)

| 분류 | 건수 | 처리 경로 |
|---|---|---|
| **C 블로커** | 4건 (W-C-01/02/03/05) | 본 세션 주요 진입 대상 |
| **business_domain_wave 보관** | 8건 (W-A-06~10, W-B-41~43) | 주체자 지시 "나중에 진행" — 보관 유지 |
| **Schema example entries** | 2건 (line 151 W-B-01 + line 177 W-A-10) | **실제 item 아님** — §1.4 schema sanity check 예시 |

### 2.2 Example entry 2건 명확화

`development-records/evolve/20260413-onto-todo.md` line 148:

> ### 1.4 valid record 예시 (schema sanity check, **실제 item 아님**)

그 아래 `line 151 id: W-B-01` + `line 177 id: W-A-10` 두 YAML 블록은 schema 문서화 예시. 주석 `# 예시 — M-06 에서 실제 할당` 명시. 다음 3 특징:
- `lifecycle_status: active` 가 template default 로 설정되어 있어 audit script 가 active 로 집계
- 실제 W-B-01 (real) 은 line 2072 에 있으며 `lifecycle_status: done` — A0 framework 추출, session 6 이전 완결
- 실제 W-A-10 (real) 은 Business 교차 참조 + 글로벌 동기화 — business_domain_wave cluster 포함

**세션 10 진입 시 대응**:
- (a) 예시 보존: §1.4 는 schema 문서화 목적, 그대로 유지
- (b) Audit tool 필터링 규약 도입: 예시 블록에 `# schema-example-marker` 주석 추가하여 스크립트 가 제외 가능하도록 
- (c) 상태 변경: 예시 블록의 `lifecycle_status` 를 `example` 또는 새 enum 값으로 변경 (enum 확장 필요)

**추천: 옵션 b** — 최소 침습, 예시 기능 보존, audit 집계 정확.

### 2.3 "W-B-01 scope-runtime framework 추출" 정정

세션 9 종료 메모에 이 항목이 "남은 active" 로 기재되었으나 **정정**: real W-B-01 (line 2072) 은 이미 `done`. 기재 혼동의 원인은 §1.4 예시 블록 (line 151) 의 lifecycle_status=active. 실제 scope-runtime framework 추출 작업은 이미 완료된 상태.

---

## 3. C 블로커 cluster 상세 (W-C-01/02/03/05)

### 3.1 선행 조건 — A·B 1 사이클 readiness

**"A·B 1 사이클" 의미** (from `development-records/evolve/20260413-onto-direction.md` §1.0):

onto 는 Principal 이 product 를 다루는 세 작업 (reconstruct → review → evolve) 의 시간·비용을 최소화한다. "1 사이클" = 적어도 한 번 실제 product 에 대해 이 세 작업을 전체로 수행한 경험 + 그 경험 데이터.

**세션 10 진입 전 확인 사항**:
- reconstruct CLI 가 실제 product 하나에 대해 end-to-end 실행된 이력 확인 (`.onto/builds/` 또는 이에 상응하는 session 기록)
- review CLI 가 실제 target 에 대해 end-to-end 실행된 이력 확인 (`.onto/review/` 세션 기록)
- evolve CLI 가 실제 goal 에 대해 end-to-end 실행된 이력 확인 (`.onto/evolve/` 또는 onto-harness 의 evolve 세션)
- 세션 9 에서 작성한 12 dual-read tests + 기존 1130 tests pass 유지

**현 시점 판단 재료**:
- `.onto/review/` 에 2026-04-08 ~ 현재까지 26개 review 세션 기록 존재
- reconstruct/evolve CLI 실제 실행 이력은 세션 10 진입 시 실측 필요
- 본 handoff 는 세션 10 에서 readiness 재확인 후 진입 권장

### 3.2 W-C ordering (DR-M06-05)

```
DL-021 W-C-01 (govern runtime 도입)    [선행, 다른 C 모두의 prerequisite]
       │
       ├─ DL-019 W-C-02 (drift engine + 큐·승인)
       ├─ DL-022 W-C-03 (knowledge → principle 승격)
       └─ BL-120 W-C-05 (Feature 15 Consumption Feedback Verification, P1)
```

### 3.3 W-C-01 Govern runtime 도입

**목적**: §1.4 govern 활동 완료 기준 충족 — 규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제.

**산출물**:
- `commands/govern.md` — CLI 진입점 명세
- `processes/govern.md` — 계약 정본
- `src/core-runtime/evolve/commands/govern.ts` — CLI handler
- `authority/core-lexicon.yaml` — govern entity 또는 term 추가

**Verification**: CLI integration test. govern command 실행 (규범 등재·갱신·폐기 추적 + Principal 승인 강제 + drift 정책 entry point).

**의존**: DL-021, W-B-01 (done 이므로 blocker 없음).

### 3.4 W-C-02 Drift engine + 큐·승인 흐름

**목적**: §1.3 수준 0→1 도달 조건 충족 — onto 가 자신의 규범 drift 를 자동 판정하고 큐·승인 흐름으로 해소.

**산출물**:
- `src/core-runtime/scope-runtime/drift-engine.ts`
- `processes/govern.md` (drift 흐름 계약 반영)

**Verification**: unit test — drift 감지 + 큐 등록 + Principal 승인 흐름 + 수준 0→1 판정 조건 3건 pass.

**의존**: DL-019, W-C-01 (선행), W-B-01 (done).

### 3.5 W-C-03 Knowledge → principle 승격 경로

**목적**: §1.2 "보류 중" 해소 — promoted learning 이 principle 으로 승격되는 경로 runtime 정식화.

**산출물**:
- `src/core-runtime/loader.ts` (승격 감지·처리 경로)
- `learning-rules.md` (승격 기준)
- `processes/govern.md` (승격 흐름)

**Verification**: Principal 승인 — 승격 기준 + 경로 + runtime 구현.

**의존**: DL-022, BL-122, W-C-01 (선행).

### 3.6 W-C-05 Feature 15 Consumption Feedback Verification (P1)

**목적**: §1.0 기제 측정 — 학습 소비 실측 검증 + §1.0 기제 신뢰도 metric 산출. priority P1 이므로 C cluster 중 최우선.

**산출물**:
- `src/core-runtime/loader.ts` (instrumentation 추가)
- `process.md` (측정 프로토콜 반영)
- `learning-rules.md` (소비 검증 규칙)
- `.onto/temp/consumption-feedback-verification/` (실측 계획 + 결과)

**Verification**: E2E — 학습 소비 검증 실측 계획 실행 + §1.0 기제 측정 직접 instrumentation + 점진성 proxy 동시 계측.

**의존**: BL-120, W-B-17 (check), W-A-72 (check). W-C-01 은 직접 의존 아님 — 평행 진입 가능할 수 있으나 통상 W-C-01 이후 진행.

### 3.7 예상 세션 소요

- W-C-01: 1 세션 (command + process + runtime + test, scope 중간)
- W-C-02: 1~2 세션 (drift engine + 큐·승인 흐름, scope 큼)
- W-C-03: 1 세션 (승격 경로, Principal 결정 수반)
- W-C-05: 1 세션 (instrumentation + 실측 계획 실행)

C cluster 완결까지 총 4~5 세션 예상. 완결 시 진행률 **+4 → 108/141 (76.6%)**.

---

## 4. 세션 10 진입 추천 순서

### 옵션 A (권장): C-01 → C-02 → C-03 순차

- 가장 명확한 의존 체인
- 각 W-ID 별 독립 PR 생성 가능 (bisect 친화)
- Principal 승인 필요 지점이 W-C-01 끝 + W-C-03 에 집중

### 옵션 B: C-05 우선 (P1 priority)

- priority P1 반영
- W-C-01 에 소프트 의존 (instrumentation hook 이 govern runtime 을 참조할 수 있음)
- W-C-05 구현 중 W-C-01 필요성 판단 후 분기

### 옵션 C: example entry 정리 선행

- 세션 10 초반에 §1.4 예시 2건에 `# schema-example-marker` 주석 추가
- audit script 집계 정확성 확보
- 이후 옵션 A 또는 B 진입

**추천**: 옵션 C → 옵션 A. example entry 정리 (5분) 후 C-01 진입.

---

## 5. 세션 10 체크리스트

1. 본 파일 전체 읽기
2. `main` 최신 동기화 + PR #45 merge 확인
3. 새 브랜치: `git checkout -b exec/session10-<date>`
4. `npx vitest run` 으로 1130 pass baseline 재확인
5. A·B 1 사이클 readiness 실측:
   - `.onto/review/` 세션 개수 확인 (최소 1건)
   - reconstruct CLI 실제 실행 이력 확인
   - evolve CLI 실제 실행 이력 확인
6. example entry 정리 (옵션 C 선택 시) — line 151/177 에 `# schema-example-marker` 주석 추가
7. W-C-01 착수 → commands/govern.md + processes/govern.md + src/ handler + test
8. 세션 종료 시 seat-sync (W-C-01 active → done + rewrite_trace)

---

## 6. 핵심 입력 파일

```bash
cat development-records/plan/20260415-execution-session10-startup.md    # 본 파일
cat development-records/evolve/20260413-onto-todo.md                    # W-ID seat
cat development-records/evolve/20260413-onto-direction.md               # §1 정본 (§1.0 가치 + §1.3 수준 + §1.4 완료 기준)
cat development-records/evolve/20260413-onto-todo-dep-graph.md          # 축 C 의존 (A·B 1사이클 rationale)
cat authority/core-lexicon.yaml                                          # v0.11.0
cat development-records/plan/20260415-deferred-inventory-session9-review.md  # 25 deferred 재검토
cat development-records/plan/20260415-business-domain-wave-worklist.md  # business 보관
```

---

## 7. 참조 memory

- `project_execution_phase_progress.md` — 세션 9 종료 시점 104/141
- `project_onto_direction.md` — §1 정본 canonical
- `feedback_end_of_session_seat_sync.md` — seat 갱신 필수

---

## 8. 주의 및 잠재 risk

1. **M-06 seat drift 패턴 3회 연속 확인**. C 블로커 진입 전 `.onto/temp/` + `src/core-runtime/scope-runtime/` 에 govern/drift/knowledge 관련 이미 구현된 부분이 없는지 실측 선행. 기존 구현 발견 시 seat 를 먼저 정렬.

2. **A·B 1사이클 판정 주체 모호**. "1사이클 운영된 경험" 의 판정 기준이 정량적으로 명시되지 않음. 세션 10 초반에 주체자(user) 께 readiness 판정 요청 권장.

3. **W-C-01 의 scope 클 수 있음**. govern runtime 은 reconstruct/evolve 와 동등 수준의 CLI + process + runtime + test 일괄 작업. session 9 의 W-A-77 (build→reconstruct) + W-A-78 (design→evolve) 재평가 시 estimate 도움.

4. **Example entry 그대로 두면 audit tool 카운트 왜곡**. 옵션 C 로 주석 추가 권장.

---

## 9. 예상 결과

세션 10 에서 C cluster 1~2건 (W-C-01 + 가능 시 W-C-05) 완료 시:
- 진행률 104 → 105~106/141 (74.5~75.2%)
- 축 C 0/8 → 1~2/8 (12.5~25%)
- canonical-advancing 14/18 → 15~17/18

세션 10~14 (4~5 세션) 에서 C cluster 전원 완결 시:
- 진행률 104 → 108/141 (76.6%)
- 축 C 4/8 (50%)
- C 블로커 cluster 완결, 남은 active = business_domain_wave 8건 만
