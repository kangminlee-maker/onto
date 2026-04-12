# Harness Transition Roadmap v1

작성일: 2026-04-12
상태: 분석·결정 세션 완료, 작업 착수 대기

이 문서는 외부 의존 없는 단일 파일 형태의 로드맵이다. 다른 세션에서 이 파일만 읽으면 전체 맥락과 결정, 현황, 다음 작업 순서를 이어받을 수 있어야 한다.

---

## 1. 상위 목표

onto를 프롬프트 기반 프로토타입에서 **LLM + runtime + script harness** 형태로 전환하고, 이 시스템이 **Principal(이용자이자 기여자) 동의 수준에 따라 자율 진화**할 수 있도록 만든다.

이 목표는 단일 작업이 아니라 네 개의 축으로 전개된다. 2026-04-07 ~ 2026-04-12의 scattered로 보였던 세션들은 모두 이 네 축의 하위 작업이다.

---

## 2. 가설 검증 과정 요약

### 2.1 초기 가설 (세션 분석 단계)

scattered 작업들이 네 주제("서비스 설계 방향 / Lexicon Stage 3 / sprint-kit을 design 외로 확장 / langchain 5글 insight")로 정리될 것이라 보았다.

### 2.2 1차 재해석

세션 전체 메시지를 검토한 결과:
- "Lexicon Stage 3"는 현재 scattered 작업의 주축이 아니라 후행 백로그였다
- "sprint-kit을 design 외로 확장"은 사용자 가설 표현. 실제 세션 언어는 "프롬프트 프로토타입 → harness 전환"
- "langchain 5글 insight"는 단독 주제가 아니라 "self-evolution 체계 설계"의 입력 재료
- 표면의 scattered는 단일 상위 목표의 하위 축들 (§1 참조)

### 2.3 핵심 질문: sprint-kit의 재활용 가능성

사용자 지적: "sprint-kit의 gate scoping/상태관리 등을 다른 entrypoint에서 활용할 수 있지 않은가?"

Codex 1차 조사(산출: `development-records/design/20260412-sprintkit-reuse-mapping.md`):
- B-1 lens 재활용 비율 4%
- B-2 build 재활용 비율 14%
- B-3 review 재활용 비율 12%

이 수치는 재해석이 필요했다.

### 2.4 재해석 → 실재 검증

사용자의 추가 지적: "sprint-kit도 design 프로세스이므로 의미론적 요구사항(adjudication, axiology, provenance)이 필요할 것이다. 다만 이걸 원칙이 아닌 Principal에게 위임하고 있을 것 같다."

실제 코드 확인 결과 (2026-04-12 본 세션):

- `src/core-runtime/design/commands/align.ts`의 `AlignVerdict = approve | revise | reject | redirect`, 주석 *"Processes user verdict on the Align Packet"*. **의미판단을 Principal에게 위임하는 구조가 코드로 확인됨**.
- `src/core-runtime/scope-runtime/types.ts`의 `STATES`는 draft/grounded/exploring/align_proposed/align_locked/surface_iterating/surface_confirmed/constraints_resolved/target_locked/compiled/applied/validated/closed 등 **design workflow에 하드코딩**.
- 소스 11파일 중 event-store/event-pipeline/hash/id/constants는 범용, constraint-pool은 중간 결합, state-machine(281줄)/gate-guard(440줄)/reducer(356줄)/types(정의)는 design-specific으로 깊게 결합.

결론: sprint-kit의 scope-runtime은 **"Principal 주도 의사결정을 지원하는 상태 머신 + gate"** 구조이며, 의미판단 seat는 비어 있는 게 아니라 **사람 자리**다. onto harness화는 이 사람 자리 중 일부에 LLM seat를 얹는 작업이다.

단, 현재 구현은 design-specific으로 하드코딩되어 있어 다른 entrypoint에 그대로 재활용 불가. 재활용하려면 **framework 추출 리팩토링이 선행**되어야 한다. 이 선행 작업을 이후 "A0"로 지칭한다.

### 2.5 두 번째 메타 결정: Lexicon provisional lifecycle

검증 과정에서 별도로 발견된 blocker: Lexicon 작업이 축 A/B/C의 blocker가 되고 있다는 인식.

원인 분석:
- "용어 확정 → 설계 → 구현" 순서는 chicken-and-egg
- 해보지 않은 것의 이름은 정확히 붙일 수 없다 (탁상공론 리스크)
- 용어 없이 설계하면 세션 반복으로 잘못 섞인 뜻이 canonical처럼 굳어진다 (drift 리스크, 세션 b0076442의 "learn은 review에서만 생성된다" 자기강화 사건이 예시)

결정: 용어에 **provisional 단계**를 둔다.
- 설계 탐색 중 새 용어 발견 → 즉시 core-lexicon.yaml에 `lifecycle_status: provisional`로 등재
- provisional 용어는 다른 canonical 문서에서 인용 금지 (drift 전파 차단)
- 그 용어를 쓰는 설계가 리뷰 통과(PR 머지 또는 9-lens 검증) → `promoted` 승격
- 승격된 후에만 authority/design-principles/processes에서 canonical 인용 가능

효과: "Stage 3 = 9건 전부 처리 후 축 B 착수"라는 프레임이 폐기된다. Stage 3는 상시 경로가 된다.

---

## 3. 네 축 정의

### 축 A — Harness 전환 + design 통합 마무리

전환(프로토타입 → harness) 또는 통합 마무리(포팅 완료 → onto 통합) 순서를 결정하는 축.

**전환 대상** (프로토타입 → harness 전환):
- review (우선순위 1, 현재 v2 설계 codex 작성 중)
- build, learn (2순위)
- ask, govern (3순위)

**통합 마무리 대상** (sprint-kit 포팅 완료 → onto 통합):
- design

design은 코드 레벨 포팅(sprint-kit 흡수)과 자기검증(self-application)은 완료되었으나, onto 시스템과의 통합은 미완이다. 다음 항목이 남아 있다:
1. Input semi-generalize — 현재 code-product/methodology 두 어댑터뿐, 스프레드시트/문서 등 범용 대상 어댑터 부재
2. core-lexicon entity/terms 등재 — design이 onto의 1급 entity로 온톨로지에 자리잡지 못함
3. A0 framework 추출 시 client 재배치 — 현재는 coupling 본체
4. 다른 entrypoint와의 경계·연동 설계 — build↔design, review↔design, learn↔design
5. Principal 위임 지점에 선택적 LLM seat — 일부 자동화 가능 영역 식별

### 축 B — 구성요소 재설계 (본 작업)

Harness 전환의 실제 구현 영역. 네 하위 작업.

**B-0 (= A0 선행 리팩토링). scope-runtime framework 추출**

- types.ts: STATES/EVENTS를 type parameter로 추출
- state-machine.ts: MATRIX를 생성자 주입
- gate-guard.ts: guard 함수 맵을 외부 주입
- reducer.ts: reducer 함수 맵을 외부 주입
- event-store/event-pipeline/hash/id/constants: 그대로 (이미 범용)

로직 재작성이 아닌 generics + dependency injection 추출. 주 리스크는 design 어댑터 회귀 — 기존 `.test.ts` 파일이 안전망.

**B-1. lens 파이프라인**

- roles/*.md v3 구현 완료 (2026-04-12)
- 미해결 5건: CONS-1, CC-1, naming, authority-gate, provenance
- 다음: 미해결 항목 처리 + A0 완료 후 framework-client로 재배치

**B-2. build 재설계**

- Philosopher → Runtime + 9-lens + Axiology Adjudicator(맥락분리·익명화) + Synthesize 4역할 분해 설계 완료 (2026-04-11)
- Build 3rd Review Backlog: CB 7건 + CC 7건 + R 8건 대기
- 이전엔 "Stage 3 완료 후" 보류였으나, Stage 3 프레임 폐기로 **A0 완료 후 착수**로 재설정

**B-3. review harness**

- Harness Self-Review 0-3단계 완료 (2026-04-12), PR #20 OPEN
- BLOCKING 3건: event_marker 의미, creation_gate dead code, health-history canonical 아님
- 권장: 옵션 C(최소 수정)로 PR #20 정리 → A0 착수

### 축 C — Self-evolution 체계 (메타 계층)

Onto가 스스로 평가하고 개선하는 체계.

- langchain 5글 통합 분석 완료: better-harness / anatomy-of-harness / improving-deep-agents / middleware / how-we-built
- Tier 1/2/3 + rank 구조 v2-v3 설계 완료
- 혼합파일 처리 기준 결정: harness 변경작업 진행 중인 review/design/learning에서 소비하는 파일만 리팩터링, 나머지는 option B(프로토타입 잔존, 추후 retire)
- 자동화 2~4단계:
  - 2단계: 큐 + conflict 체크 + drift 재검증 (~250줄)
  - 3단계: 격리 session + Tier 분류기 (~300줄)
  - 4단계: Tier 1 자동 실행 (사후 알림만)
- CC 결정: Single-change 권고(should). LLM 단독 시 의무, Principal 동의 시 예외. 실패 신호 기반 자동 트리거. 규모별 A1(제안)/A3(자동) 분기.

축 C 실행은 축 B 1사이클 운영 경험 축적 후 2단계부터 착수.

### 축 D — Lexicon provisional 경로 (상시 계층)

§2.5의 결정을 실체화하는 축. 다른 축과 달리 **상시 작동하는 절차**이며 단일 작업 덩어리가 아니다.

- 설계 탐색 중 용어 발견 → provisional 등재
- canonical 인용 금지 (drift 전파 차단)
- 리뷰 통과 시 promoted 승격

선행 확인 2건:
1. core-lexicon.yaml에 `lifecycle_status: provisional` 값이 이미 있는지
2. "provisional 인용 금지" 규칙을 authority/ 또는 design-principles/ 중 어디에 성문화할지

---

## 4. 완료/진행/대기 상태 (2026-04-12 기준)

### 완료 (최근 5일 머지/결정)

- Learn Phase 1/2/3 (PR #1)
- onto:design absorption — sprint-kit 흡수 (PR #4) + self-application (a85ba96)
- codex multi-agent fix (PR #8)
- project-locality principle (PR #5/#6)
- core-lexicon v0.2 E/A/R 모델 (PR #9)
- Lexicon Stage 2 + Principal 전파 (PR #10/#12/#13/#14)
- graphify 기반 build 업그레이드 hypothesis memo
- Harness self-review 0-3단계 + health history (커밋 2f465d6)

### 진행 중

- 축 A 전환 대상 중 review: v2 설계안 codex 작성 중 (세션 9eae203c)
- 축 B-1 lens v3 follow-up: 미해결 5건 (CONS-1, CC-1, naming, authority-gate, provenance)
- 축 B-3 review harness self-review: PR #20 OPEN, BLOCKING 3건

### 대기 (착수 전)

- 축 B-0 (A0): scope-runtime framework 추출 — 실측 완료, 착수 전
- 축 B-2 build 재설계: 설계 완료, Stage 3 프레임 폐기로 A0 완료 후 착수
- Build 3rd Review Backlog: PR #16 merge 후 처리
- Design Spec v4 잔여 (CC 4 + R 4)
- 축 A의 design 통합 마무리 5개 항목 (§3 축 A 참조)

### 메타 결정 (본 세션 2026-04-12)

- Lexicon provisional lifecycle 도입 → "Stage 3 9건 처리" 프레임 폐기
- A0 scope-runtime framework 추출이 축 B 선행 조건임 실측으로 확인
- sprint-kit 재활용 비율 4~14%는 A0 전 기준, 재측정 필요
- design은 축 A에 포함 (통합 마무리 대상)

---

## 5. 추천 작업 순서

분석·결정은 이번 세션에서 완료. 실제 착수는 다음 세션부터.

1. **축 D 선행 확인 2건** (빠른 작업)
   - core-lexicon.yaml에 provisional 상태 확인
   - 인용 금지 규칙 위치 결정 (authority/ 또는 design-principles/)

2. **축 B-3 PR #20 정리**
   - BLOCKING 3건을 옵션 C(최소 수정)로 처리
   - 머지 후 A0 착수 가능

3. **축 B-0 (A0) 착수** — scope-runtime framework 추출
   - 기존 design 테스트가 회귀 안전망
   - 완료 후 sprint-kit 재활용 매핑 재측정

4. **축 B 본작업 병렬 또는 순차**
   - B-1 미해결 5건 처리 + A0 이후 재배치
   - B-2 재개
   - B-3 신규 구현 (framework 위에서)
   - 각 하위작업 진행 중 발견 용어는 provisional 등재 (축 D 상시 작동)

5. **축 A 전환 대상 순차 진행**
   - review 전환 완료 후 build/learn → ask/govern 순서 재평가
   - review 전환 경험이 다음 순서 결정의 입력

6. **축 A 통합 마무리 — design**
   - A0 이후 design이 framework-client로 재배치 (B-0과 동일 작업의 design 측면)
   - Input semi-generalize
   - lexicon 등재 (provisional 경로)
   - 다른 entrypoint와의 경계·연동 설계
   - Principal 위임 지점 LLM seat 식별·구현

7. **축 C 2단계 착수**
   - 축 B 1사이클 완료 후 자동화 큐/conflict/drift 재검증 구현

---

## 6. 리스크와 주의사항

### 6.1 framework 추출의 design 회귀

A0는 design 어댑터에 영향을 준다. 각 scope-runtime 파일의 `.test.ts`가 회귀 안전망이지만, design/commands/* 쪽 통합 테스트도 전수 통과를 확인해야 한다. 회귀 시 rollback 가능한 작은 커밋 단위로 진행.

### 6.2 재활용 비율 재측정 필요

Codex의 현재 4%/14%/12%는 A0 전 기준. A0 완료 후 재측정하지 않고 축 B를 진행하면, 재활용 가능한 부분을 놓치거나 신규 설계 규모를 과대/과소 평가할 수 있다.

### 6.3 provisional 인용 금지 규칙의 성문화

이 규칙이 없으면 drift 차단 효과가 발휘되지 않는다. 축 D 선행 확인에서 반드시 성문화 위치를 결정하고, 실제 인용을 막는 검증 메커니즘(grep 기반 검사 등)을 추가해야 한다.

### 6.4 축 A의 design 통합 마무리가 축 B와 섞이는 문제

design의 "다른 entrypoint와의 경계·연동 설계"는 review/build/learn 각각의 harness 설계와 교차한다. 축 A/B 경계를 고정하려 하지 말고, 교차 작업은 "design↔X" 형태의 연결 설계 세션에서 함께 다룬다.

### 6.5 축 C를 너무 일찍 착수하는 리스크

자동화(축 C 2~4단계)는 축 B의 결과물이 안정화된 뒤 착수해야 한다. 불안정한 harness 위에 자동화를 얹으면 drift가 자동 증폭된다. 축 B의 1사이클 완료 후 2단계 착수가 안전선.

---

## 7. 참조 산출물

- `development-records/design/20260412-sprintkit-reuse-mapping.md` — Codex 1차 매핑 (4%/14%/12%, A0 전 기준)
- `src/core-runtime/scope-runtime/` — 본 세션에서 실측한 결합도 대상 (11파일, ~1900줄)
- `src/core-runtime/design/` — sprint-kit 포팅 코드, AlignVerdict 등 Principal 위임 증거
- `authority/core-lexicon.yaml` line 84~90 — lifecycle_status term, 값 6개 (seed/candidate/provisional/promoted/deprecated/retired)

---

## 8. 가설 검증 매트릭스

이 로드맵의 모든 주장은 가설 단위로 분해되어 명시적으로 검증되어야 한다. 아래는 축별로 식별된 가설 전수와 검증 상태.

**검증 방법 분류**:
- `[즉시]` — 코드/파일 직접 확인으로 해결
- `[POC]` — 소규모 프로토타입 실행으로 해결
- `[설계]` — 설계 문서 작성 + 리뷰로 해결
- `[실측]` — 실제 운영 후 결과 관찰
- `[탐색]` — 개념 매핑/분류 작업으로 해결

**상태**: ✅ 확정 / ⚠️ 부분 확인 / ⏳ 미검증

### 8.1 축 A 가설 (Harness 전환 + design 통합)

| ID | 가설 | 방법 | 상태 | 비고 |
|---|---|---|---|---|
| A-H1 | review를 첫 번째 전환 대상으로 삼는 것이 최선이다 | [탐색] | ⏳ | 프로세스별 사용 빈도·전환 난이도·의존성 매핑 필요 |
| A-H2 | 전환 순서 review → build/learn → ask/govern이 최적이다 | [탐색] | ⏳ | entrypoint 간 의존 그래프 |
| A-H3 | design과 build/review/learn 사이에 정의 가능한 겹침 영역이 있다 | [설계] | ⏳ | entity-relation 매핑 |
| A-H4 | code-product/methodology 외 spreadsheet/document 어댑터 추가로 범용성 확보 가능 | [설계] | ⏳ | input semi-generalize 어댑터 구조 |
| A-H5 | Principal 위임 지점이 타입으로 명시되어 있어 LLM seat 얹기가 구조적으로 가능 | [즉시] | ⚠️ | align.Verdict(4), draft.Action(7), apply.Action(5), close/defer 확인. 각 지점 seat 평가는 후속 |

### 8.2 축 B 가설 (구성요소 재설계)

| ID | 가설 | 방법 | 상태 | 비고 |
|---|---|---|---|---|
| B-H1 | A0 framework 추출이 로직 재작성 없이 generics+DI만으로 해결된다 | [POC] | ⏳ | state-machine.ts 부분 generics화 POC |
| B-H2 | 기존 design 테스트(~5270줄)가 회귀 안전망으로 충분 | [즉시] | ⚠️ | 규모 확인. 정확한 커버리지 측정은 미실행 |
| B-H3 | lens v3 구조가 framework-client로 재배치 가능 | [설계] | ⏳ | lens 소비 지점 ↔ scope-runtime state 매핑 |
| B-H4 | lens 미해결 5건(CONS-1/CC-1/naming/authority-gate/provenance)은 A0와 독립 처리 가능 | [즉시] | ⏳ | 각 건 코드 영향 범위 스캔 |
| B-H5 | build 4역할 분해(Runtime/9-lens/Axiology Adjudicator/Synthesize)가 scope-runtime 위에 얹히는 방식 타당 | [설계] | ⏳ | 4역할 × scope-runtime primitive 매핑 |
| B-H6 | Axiology Adjudicator "맥락분리·익명화"가 자기판정 문제를 실제 해소 | [POC] | ⏳ | 소규모 프로토타입 후 drift 측정 |
| B-H7 | review harness 미구현 영역이 PR #20 BLOCKING 3건으로 완전 요약됨 | [즉시] | ⏳ | self-review 이외 누락 스캔 |
| B-H8 | 축 B 하위작업에서 발견될 provisional 용어가 지금 일부 예측 가능 | [탐색] | ⏳ | Axiology Adjudicator, Runtime Coordinator 등 선제 열거 |

### 8.3 축 C 가설 (Self-evolution 체계)

| ID | 가설 | 방법 | 상태 | 비고 |
|---|---|---|---|---|
| C-H1 | langchain 5글 insight가 onto 개념으로 매핑 가능 | [탐색] | ⏳ | 5글 × onto 개념 1:1 대응 테이블 |
| C-H2 | Tier 1/2/3 분류가 Principal 동의 수준을 실질 분할 | [탐색] | ⏳ | 과거 결정 사례 retroactive 분류 |
| C-H3 | 실패 신호 기반 자동 트리거가 drift를 적시 포착 | [탐색] | ⏳ | 과거 drift 사례(b0076442의 learn 명제)를 이 트리거로 잡을 수 있었는지 사후 검증 |
| C-H4 | 격리 session 방식이 기존 세션 오염 차단 | [실측] | ⏳ | PR #8 이후 실제 운영 데이터 |
| C-H5 | 큐 기반 지연처리 + 유효성 재확인이 stale queue 문제 해결 | [설계] | ⏳ | 큐 내 항목 유효성 판정 로직 |

### 8.4 축 D 가설 (Lexicon provisional 경로)

| ID | 가설 | 방법 | 상태 | 비고 |
|---|---|---|---|---|
| D-H1 | core-lexicon.yaml이 provisional 상태를 이미 지원 | [즉시] | ✅ | 확정. line 84~90, 6개 값 중 provisional 포함 |
| D-H2 | 인용 금지가 기술적으로 구현 가능 (grep 기반 검사 등) | [POC] | ⏳ | 검증 도구 프로토타입 |
| D-H3 | 승격 기준("PR 머지 또는 9-lens 검증")이 기존 작업 흐름에서 자연 트리거 | [설계] | ⏳ | 기존 PR/리뷰 훅 연결 지점 |

### 8.5 교차 가설

| ID | 가설 | 방법 | 상태 | 비고 |
|---|---|---|---|---|
| X-H1 | 로드맵 단계 순서(축 D 확인 → B-3 PR #20 → A0 → 축 B 병렬 → 축 A → 축 C)가 의존관계상 최적 | [설계] | ⏳ | 의존 그래프 검증 |
| X-H2 | Axiology Adjudicator(B-2) ↔ Tier 구조(C) 사이에 결합 지점 있음 | [탐색] | ⏳ | 개념 매핑. 둘 다 의미판단 메타 레이어 |

### 8.6 검증 실행 계획

**이번 세션에서 완료** (2026-04-12):
- D-H1 ✅
- A-H5 ⚠️ (부분)
- B-H2 ⚠️ (규모 확인)

**다음 세션 우선 검증** ([즉시]·[POC] 중 빠른 것):
1. B-H4 lens 미해결 5건 A0 독립성 — 코드 스캔으로 해결
2. B-H7 review 미구현 영역 전수 — self-review 보고서 + 코드 스캔 교차
3. D-H2 인용 금지 검증 도구 — grep 기반 프로토타입
4. B-H1 A0 POC — state-machine.ts 한 파일 generics화 시도

**중기 검증** ([설계]·[탐색]):
- A-H1/A-H2 entrypoint 의존 그래프
- A-H3 design↔X 겹침 매핑
- B-H3 lens-framework 재배치 설계
- B-H5 build 4역할-primitive 매핑
- B-H8 provisional 용어 선제 열거
- C-H1 langchain 매핑 테이블
- C-H2/C-H3 retroactive 분류·검증
- D-H3 승격 기준 훅 설계
- X-H1/X-H2 교차 검증

**장기 검증** ([실측]):
- B-H6 Axiology 자기판정 해소 (프로토타입 실행 후)
- C-H4 격리 session 오염 차단 (운영 데이터)
- A-H4 범용 어댑터 구조 (spreadsheet/document 대상 실제 사용 후)

**검증 결과 반영 원칙**: 가설이 확정되면 로드맵 본문(§3~§5)의 해당 기술을 결론형으로 갱신. 반증되면 축 구조 자체를 재조정. 매트릭스는 항상 최신 검증 상태를 반영한다.
