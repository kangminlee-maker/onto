---
as_of: 2026-04-19
status: design-input
functional_area: phase-4-five-activity-v1
purpose: |
  Phase 4 설계 세션의 input 정리. 5 활동 (review/evolve/reconstruct/learn/
  govern) 의 v0 seat 와 v1 범위, 설계 constraint, 합의 대기 지점을 단일
  seat 에 기록. 실제 설계 세션 (/clear 후 focused attention) 진입 전의
  준비 자료.
source_refs:
  onto_direction: "development-records/evolve/20260413-onto-direction.md"
  w_id_status: "development-records/evolve/20260413-onto-todo.md (142/142 done)"
  v1_backlog_memory: "project_v1_and_autonomy_backlog.md (Phase 4 권장 구조)"
  review_maturation: "project_core_axis_empirical_recomposition.md (PR #131, review v0.2.1)"
  phase_3_closure: "project_phase_3_complete.md (Phase 3-4 A1~A5 방어선 3층)"
  autonomy_levels: "§1.3 수준 0/1/2 정의"
---

# Phase 4 Design Input — 5 Activity v1 + Autonomy Level 2

## 0. 현재 위치

- W-ID 142/142 (100%) 전수 done — 실행 단계 종료
- review v0.2.1 성숙 (PR #131, 3-round empirical review convergence)
- 다른 4 활동 (evolve/reconstruct/learn/govern) 은 v0 "bounded minimum surface"
- 자율성 수준: 0~1 구간 (drift engine v0 + govern runtime v0)

## 1. 5 활동 v0 → v1 범위

### 1.1 review — 현재 가장 성숙

**v0 (현재)**: Phase 3-4 A1~A5 방어선 3층 + core-axis v0.2.1 cost-constrained Pareto-optimal 6-lens.

**v1 여부**: **아직 필요 없음**. §9.1 direct comparison 실험 결과 후 재평가. 현 시점 추가 v1 scope 선언은 premature.

### 1.2 evolve — 기본 구현 + partial learning 수집

**v0 (현재)**: 6-Phase Evolve Inquiry 구현, `onto evolve` CLI, scope-runtime kernel 흡수.

**v1 추가 범위**:
- **ontology 활용 경로 완결** — ontology 가 있을 때 constraint 추출 → proposal 반영 자동화
- **learning 자동 수집 완결** — 현재 review 가 learning 저장; evolve 중 발견된 패턴도 저장하되 review 와 중복 방지

**의존**: reconstruct v1 (안정적 ontology 산출) 이 선행 — evolve 는 reconstruct 결과 소비

**규모**: M

### 1.3 reconstruct — 기본 구현 + 수동 도메인 추정

**v0 (현재)**: 6-phase scope-runtime + `onto reconstruct` CLI, dual-read + canonical entity E/A/R 모델.

**v1 추가 범위**:
- **domain knowledge 기반 "왜" 자동 추정** — product 에서 요소 추출 후 `~/.onto/domains/{domain}/` 를 LLM-as-judge 로 활용해 의도/맥락 추론
- **Principal 검증 경로 자동화** — 추정 결과를 Principal 에게 confirm/reject 인터페이스로 제시

**의존**: domain 문서 품질 (11 도메인 중 8+ upgrade 완료). LLM-as-judge 설계 필요.

**규모**: L (onto 의 "기제" 축 §1.0 측면 3 를 현실화하는 핵심)

### 1.4 learn — 수동 편집 단계

**v0 (현재)**: 
- extractor (review 세션에서 learning 자동 수집)
- loader (promoted only consumption)
- promote pipeline (W-C-03, decide approve 후 파일 편집 **수동**)
- promote-principle v0 (knowledge → principle 경로 기록만)

**v1 추가 범위**:
- **파일 자동 편집** — decide approve 후 `.onto/learnings/` 파일 실제 write (현재 수동)
- **govern 기준 준수 강제** — govern 이 정한 promotion 기준을 learn 이 검증하지 않으면 reject

**의존**: **govern v1 (승인 강제)** 가 선행되어야 자동 편집의 Principal 우회 방지 가능. 순환 의존 — Track C/D 동시 합의.

**규모**: M

### 1.5 govern — 기록 인터페이스만

**v0 (현재)**:
- queue (W-C-01) — 제안 + 판정 event log
- drift engine (W-C-02) — classifier + router v0
- promote-principle (W-C-03) — 판정 기록만

**v1 추가 범위**:
- **승인 강제 차단** — pre-commit hook + CI check + merge gate. Principal 승인 없는 authority 변경 차단
- **자동 drift probe** — authority 파일 변경 diff 자동 분석, 규칙 충돌 검출
- **authority 파일 자동 반영** — decide approve 후 실제 `authority/` + `design-principles/` + `processes/` 파일 write

**의존**: learn v1 과 **순환 의존** — govern 의 자동 반영은 learn 이 편집을 먼저 해야 원복 가능성 보장. learn 은 govern 의 강제 차단으로 우회 방지.

**규모**: L

## 1.6 공통 축: Dogfood + Log (cross-cutting constraint)

Phase 4 의 **필수 공통 축**. 각 entrypoint 가 v1 성숙도에 도달할 때마다 다음 protocol 준수:

### 1.6.1 Dogfood 정의

onto 자체가 product (§1.3). 각 activity v1 진입 조건:
- **해당 activity 의 실제 사용** — onto 프로젝트의 실 작업 (PR, 문서 개선, 규범 변경 등) 에 해당 entrypoint 를 **mandatory** 로 사용
- **Principal 개입 기록** — 수락/반려/수정 등 판단 trace
- **자동 판단 vs Principal 판단 비율** 측정 — 자율성 수준 1→2 trigger 데이터

**precedent**: PR #131 (review v0.2.1) 이 **3-round self-review** 로 dogfood — 같은 product 의 리뷰 시스템으로 해당 리뷰 시스템의 변경을 검증. 이 pattern 이 5 활동 전수로 확장.

### 1.6.2 기존 구현 기반

이미 존재하는 3 측면 측정 인프라가 raw data seat:
- `src/core-runtime/readers/review-log.ts` (W-A-71, 점진성)
- `src/core-runtime/scope-runtime/eval-persistence.ts` (W-C-04, 지속성)
- `src/core-runtime/learning/usage-tracker.ts` (W-A-72, 기제)

W-C-05 consumption feedback dogfood 가 **방법론 prototype** — 5 활동 전수 확장 시 참조.

### 1.6.3 Dogfood 로그 계약

각 activity v1 구현 시 다음 단일 log seat 에 기록:

```
.onto/dogfood/{activity}/{session-id}/
  ├── metadata.yaml       # activity, target, timestamp, principal_id
  ├── invocation.md       # 호출 당시 context (argv, config)
  ├── output.md           # activity 산출물 (review final / evolve plan / reconstruct ontology / learn promote decision / govern decision)
  ├── principal-judgment.yaml  # accept / reject / modify + rationale
  ├── measurement.yaml    # 3 측면 metric (N번째 시도 time, eval 회귀 여부, knowledge 히트율)
  └── feedback-to-product.md   # 본 세션이 이후 어느 PR / 규범 변경에 feedback 됐는지 pointer
```

**Seat 정책**: `.onto/dogfood/` 는 gitignored (session artifact), 단 집계된 dashboard 만 `development-records/dogfood/` 에 commit.

> **보강 (2026-04-22)**: 본 §1.6.3 의 `.onto/dogfood/{activity}/{session-id}/` 는 dogfood layer 의 mirror seat 이며 5 활동의 본질 sink 가 아니다. 정본 규약 + 위치 가이드 + Q6 재해석은 `.onto/processes/govern.md §14.6` (dogfood SDK-like sink 의존 방향 invariant) 참조.

### 1.6.4 Product 개선 feedback loop

로그 소비처 3 축:

1. **v2 설계 input** — dogfood log aggregation 이 차기 activity v2 의 empirical 근거
2. **자율성 수준 2 trigger 정량화** — 수준 1 사이클 카운트 + Principal 개입률 + drift metric false positive/negative 수집
3. **onto 상위 가치 (§1.0) 검증** — 3 측면 지표의 시계열 관찰

### 1.6.5 v1 진입 완료 기준 추가

각 activity 의 v1 완료 기준 (기존 §1.4 + 본 섹션):
- ✅ §1.4 활동별 완료 기준 만족
- ✅ **dogfood 최소 3 세션** 수행 + 로그 완결 (본 절 추가 요구사항)
- ✅ **feedback-to-product 가시적** (해당 dogfood 세션이 실제 후속 작업에 영향 증명)

---

## 2. 설계 Constraint

### 2.1 순환 의존 (Track C ↔ Track D)

govern v1 ↔ learn v1 은 **단일 설계 세션에서 양쪽 계약 동시 합의** 필요. 순차 구현 시 partial v1 inconsistency 위험:

- learn v1 먼저 → 자동 편집되지만 govern 강제 없어 Principal 우회 가능
- govern v1 먼저 → 강제 차단되지만 learn 이 자동 편집 못 해 원복 복잡

### 2.2 자율성 수준 2 의 empirical trigger

§1.3 수준 2 (drift 감수 자체 실행) 는 수준 1 운영 데이터 축적 후 평가. 구체 trigger:

- 전제 1: 수준 1 에서 **최소 10 self-apply 사이클** 누적 (dogfood protocol 가 시작점, 현재 0)
- 전제 2: drift engine v1 의 false positive/negative rate 측정 + 허용 수준 정의
- 전제 3: govern v1 의 승인 강제 차단 안정화 (즉, govern v1 완료)

**현재**: 모든 전제 미충족. Phase 4 는 수준 2 설계 **아닌** 수준 1 공고화 + 수준 2 trigger 도구 마련.

### 2.3 측정 infrastructure 연동

§1.4 3 측면 모두 구현됨 (검증 완료):
- 측면 1 점진성: `review-log.ts` (W-A-71)
- 측면 2 지속성: `eval-persistence.ts` (W-C-04)
- 측면 3 기제: `usage-tracker.ts` (W-A-72)

각 activity v1 진행 시 3 측면 관측치를 dashboard 에 축적 → 수준 2 trigger 정량화.

### 2.4 단일 PR 에 담을 수 없는 규모

5 활동 × 4 track × (protocol + implementation + validation) = 최소 12 PR. Phase 4 는 multi-session multi-PR 프로젝트.

## 3. Phase 4 설계 세션 권장 구조

### Stage 1: 범위 합의 (현 세션 or 신 세션 어디서나)

- 주체자가 본 design-input 을 읽고 "scope 승인" 혹은 "축소/확장" 지시
- v1 우선순위 선언: evolve/reconstruct/learn/govern 중 어느 것을 먼저?

### Stage 2: Track C/D 단일 설계 세션 (must be single session, /clear 필요)

- govern v1 ↔ learn v1 계약 simultaneously 합의
- 순환 의존 해소 기전 설계 (예: 2-phase commit, staging area, rollback protocol)
- W-ID 부여 여부 결정

### Stage 3: Track A (evolve) + Track B (reconstruct) 설계

- Track C/D 합의 후 진행 (learn v1 이 evolve/reconstruct 의 learning 수집 수단이므로)
- Track B (reconstruct) 가 Track A (evolve) 에 선행 — ontology 산출 dependency

### Stage 4: Dogfood + Log 공통 계약 (cross-cutting)

- §1.6 dogfood 로그 seat 구조 확정 (`.onto/dogfood/{activity}/{session}/`)
- 각 activity v1 구현 시 dogfood log 자동 emit 계약
- `development-records/dogfood/` aggregated dashboard 설계 (집계 주기 / 소비자 / format)
- Principal 개입 trace format 합의
- feedback-to-product pointer 기록 계약 (해당 dogfood → 후속 PR 연결)

### Stage 5: 자율성 수준 2 trigger 도구

- 3 측면 측정치 dashboard 구현 (dogfood log aggregation 소비)
- 수준 1 사이클 카운트 + drift metric false positive/negative 수집
- 수준 2 선언 기준 정량화

## 4. 주체자 합의 결과 (2026-04-19)

Q1~Q7 전원 결정. 이후 섹션은 각 옵션과 함께 확정된 답변 표시.

| Q | 결정 | 근거 |
|---|---|---|
| Q1 | **Phase 4 scope 전체 동의** | 5 활동 v1 (review 는 유지) + 수준 1 공고화 |
| Q2 | **옵션 A: Track C/D 동시 → B → A** | 순환 의존 먼저 해소 (권장) |
| Q3 | **옵션 B: 수준 2 는 Phase 5** | Phase 4 scope 관리 (권장) |
| Q4 | **옵션 A: 기존 축 (W-A/B/C/D) 에 v1 W-ID 추가** | 연속성, 최소 변경 |
| Q5 | **옵션 B: /clear 후 focused session** | 순환 의존 설계 집중력 (권장) |
| Q6 | **옵션 A: Mandatory dogfood** | 주체자 확정 2026-04-19 |
| Q7 | **옵션 A: aggregated only public** | 주체자 확정 2026-04-19 — `.onto/dogfood/` gitignored, `development-records/dogfood/` dashboard 만 commit |

## 5. 원 합의 대기 지점 (archive — §4 에서 결정 완료)

### Q1: Phase 4 scope 전체 동의?

본 문서의 v1 범위 (1.2~1.5) 를 Phase 4 로 확정?

### Q2: Track 우선순위?

- 옵션 A: Track C/D 동시 설계 (순환 의존 해소 후 Track A/B 진행) — 권장
- 옵션 B: Track B (reconstruct v1) 먼저 — "기제" 축 empirical 증명 우선
- 옵션 C: Track A (evolve v1) 먼저 — 주체자 매일 UX 개선 우선

### Q3: 수준 2 관심도?

- 옵션 A: Phase 4 에서 수준 2 trigger 도구까지 포함 — **long scope**
- 옵션 B: Phase 4 는 수준 1 공고화까지만, 수준 2 는 Phase 5 — 권장 (scope 관리)

### Q4: W-ID 체계 확장?

- 옵션 A: 기존 축 (W-A/B/C/D) 에 v1 W-ID 추가 — 연속성
- 옵션 B: 신규 축 (W-E?) — v1 을 별 epoch 으로 취급
- 옵션 C: W-ID 체계 deprecate, Phase 4 는 Track-based 관리 — clean break

### Q5: 설계 세션 언제?

- 옵션 A: 지금 이어서 진행 (본 세션, context 누적됨)
- 옵션 B: /clear 후 focused session (권장 — Stage 2 순환 의존 설계는 집중력 필요)

### Q6: Dogfood protocol 의 강도?

- 옵션 A: **Mandatory** — 각 activity v1 은 "dogfood 최소 3 세션 + feedback-to-product 증명" 을 완료 기준에 포함 (권장 — 본 섹션 §1.6 기본 design)
- 옵션 B: **Recommended** — dogfood 를 권고 수준으로만. 로그 seat 는 구현하되 v1 완료 기준엔 비포함
- 옵션 C: **Opt-in** — dogfood 는 activity 별 주체자 판단. 공통 계약 없음

### Q7: Dogfood 로그 공개 수준?

- 옵션 A: **Session artifact `.onto/dogfood/` 는 gitignored, aggregated dashboard 만 commit** (권장 — session 별 세부는 민감할 수 있음, 집계만 공개)
- 옵션 B: 전체 commit (full transparency)
- 옵션 C: aggregated dashboard 조차 private (외부 auditor 없음)

## 6. 현 세션에서 추가 가능한 작업

Phase 4 정식 설계는 별도 세션 (§4 Q5 결정: /clear 후 focused). 현 세션에서 할 수 있는 것:

1. ✅ 본 design-input 문서 commit (본 PR 로 진행)
2. ✅ 주체자 Q1~Q7 답변 수집 완료 (2026-04-19)
3. 다음 세션 startup handoff 작성 — `development-records/plan/20260419-phase4-handoff.md` 별 파일

본 단계에서 **구현** 은 불가 — 설계 합의 (Stage 2 Track C/D 동시) 가 선행되어야 함.
