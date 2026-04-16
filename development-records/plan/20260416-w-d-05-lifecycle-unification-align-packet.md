---
as_of: 2026-04-16T22:30:00+09:00
status: implemented
functional_area: lifecycle-unification-align
purpose: W-D-05 (lifecycle 통합 재정의) align-packet + 구현 기록. W-C-03 knowledge→principle 승격 설계 중 발견된 drift 3건 해소 + 핵심 개념 기반 재확정.
blocks: W-C-03
implementation_commit: "세션 13 구현 완료 (2026-04-16). Q1~Q6 주체자 승인 (I 일괄) + 9-lens SHOULD-FIX 3건 적용 후 S1~S5 구현."
---

## 0. 구현 상태 (2026-04-16 세션 13 최종)

- **Q1~Q6 주체자 승인**: (I) 전체 권장안 일괄 승인.
- **9-lens 독립 리뷰**: BLOCKING 0, SHOULD-FIX 4 (통합 3건), MINOR 1 → GO-WITH-FIX.
- **SHOULD-FIX 3건 반영 (A 선택)**:
  - Fix 1: 3분리 이름을 `lexicon_term_promotion` / `learning_scope_promotion` / `learning_to_principle_promotion` 3단어 대칭형으로 통일
  - Fix 2: Q1 정의에서 "authority/" 는 entity 정의만, 본문은 design-principles/processes/ 로 분리 명시 (CLAUDE.md rank 구분 준수)
  - Fix 3: 의존 그래프 — 관계 정의는 core-lexicon.yaml entity relations, mermaid diagram 은 processes/govern.md §12 로 분리
- **MINOR 1건**: S4 는 principle entity **정의 + 구별 규칙만** 명시. 기존 promoted term (activity_enum 등) 의 principle-tier 재분류는 **별도 W-ID** (scope creep 방지).

## 0.1 실제 구현 산출물

- `authority/core-lexicon.yaml` v0.13.0 → v0.14.0:
  - `principle` entity 신설 (principal entity 앞 배치) — Q1 정의 Fix 2 반영 + Q2 구별 규칙 + Q5 execution_rules_ref
  - `lexicon_term_promotion` / `learning_scope_promotion` / `learning_to_principle_promotion` 3 term 신설
  - `shared_attributes.lifecycle_status` 에 `execution_rules_ref.transition_canonical_owner` 추가 (M-08 refresh protocol)
- `processes/govern.md` §12 신설 — 6 하위 섹션 (canonical 이름 표, mermaid diagram, lifecycle_status 전이 owner, 3 계층 authoring path, principle vs promoted term 구별, scope 경계)
- `processes/learn/promote.md` 상단 — W-D-05 용어 정렬 note 추가 (learning_scope_promotion canonical 참조)
- `development-records/evolve/20260413-onto-direction.md`:
  - principle 개념 정의 교체 (W-D-05 Fix 2 반영)
  - §1.2 "knowledge → principle 경로" 섹션 — structure drift 해소 기록 + 실 경로 W-C-03 으로 위임 명시
- `development-records/evolve/20260413-onto-todo.md`:
  - W-D-05 seat active → done + rewrite_trace
---

# W-D-05 Lifecycle 통합 재정의 — Align Packet

## 1. 발견 경위

세션 13 에서 W-C-03 (knowledge → principle 승격 경로) 설계를 시작. 주체자 요청으로 "이미 존재하는 내부 승격 기준" 전수 리서치 + "이들이 drift·중복인가" 검증 진행. 리서치 결과 **BLOCKING 1건 + SHOULD-FIX 1건 + MINOR 1건** 의 drift 발견. W-C-03 을 지금 바로 구현하면 기존 ambiguity 위에 새 개념을 쌓아 drift 누적 risk → W-C-03 lifecycle 보류, **선행 W-D-05** 로 drift 해소 결정 (주체자 승인 2026-04-16).

## 2. Drift 발견 요약

### 2.1 Semantic drift (MINOR): "promoted" 용어 중복

| 맥락 | 의미 | 근거 |
|---|---|---|
| `provisional_lifecycle.promoted` | term 이 `provisional_terms` → `terms` 이동 (lexicon 정식 등재) | `authority/core-lexicon.yaml` L131-166 |
| `learning promote` 결과 | learning 이 project → user scope 이동 (글로벌 소비 가능) | `processes/learn/promote.md` |

같은 `promoted` 단어가 다른 대상·다른 이동을 지칭.

### 2.2 Conciseness drift (SHOULD-FIX): lifecycle_status 전이 책임 분산

- `shared_attributes.lifecycle_status` 값 집합 6개 (seed, candidate, provisional, promoted, deprecated, retired)
- `provisional_lifecycle.states` 값 집합 4개 + transition-only 2개
- **deprecated/retired 관리 주체 분산**: M-08 refresh protocol vs. event marker (promote Step 4a) vs. judgment audit 3곳에 분산, canonical owner 없음
- learning · term 의 lifecycle 전이 속도 차이에 대한 sync 규칙 부재

### 2.3 Structure drift (**BLOCKING for W-C-03**): knowledge → principle 경로의 전제 미해결

**핵심 발견**:
- **design-principles/ 파일들의 authoring path 가 미정의**
  - `learning.execution_rules_ref = "processes/learn/promote.md"` (명시)
  - `domain_document.execution_rules_ref = "processes/learn/promote-domain.md"` (명시)
  - **`principle` / `design-principles/` 의 execution_rules_ref: 미정의**
- **기존 promoted term ≠ principle 관계가 암묵적**
  - `activity_enum`, `axis_enum` 등 core-lexicon term 이 이미 `promoted` (consumption 가능)
  - §1.1 은 "term promoted" 와 "principle" 을 **다른 층** 이라 선언
  - 구체 구별 기준 없음 → "activity_enum 은 principle 인가?" 에 답할 수 없음

→ W-C-03 의 "도착지" (principle) 가 정의되지 않은 채로 승격 "경로" 만 설계하면 drift 가중.

## 3. 리서치 근거 (요약)

### 3.1 내부 onto 승격·전이 기준 8건 조사 결과

반복 등장 축:
- 수량 임계 (judgment 10, event marker 2, compile retry 3, exploration 20)
- 합의/review (panel 3/3 or 2/3, 9-lens PASS/CONDITIONAL)
- 영향도 (required/recommended)
- 완전성 (SEED marker 0, 모든 domain files)

판정자 분포: agent 자동 → panel → principal 3계층.

### 3.2 외부 유사 시스템 analog (CNCF, IETF, Python PEP)

공통 판단 축 (모든 시스템 공통):
1. Exposure (실사용·기간)
2. Consensus/Review (합의·panel·lens)
3. Quality verification (audit·impact·solid)
4. Completeness (명확·완전 기술)
5. Authority gate (지명된 최종 판정자)

## 4. Interpreted Direction (W-D-05 본 작업 방향)

onto 의 "성숙도·승격·규범층 구분" 을 다루는 **lifecycle 체계 전반** 을 단일 정합 모델로 재확정한다. W-C-03 이 소비할 개념적 기반 (principle 정의, 승격 경로 도착지, lifecycle 용어 일관성) 을 명시적으로 성문화한다.

## 5. Proposed Scope

### 5.1 In (5 sub-task)

| # | sub-task | 해소 대상 drift |
|---|---|---|
| S1 | "promoted" 용어 분리 — `term_promoted` / `learning_promoted` / `principle_promoted` 3개 canonical 이름 확정 + lexicon 명문화 | 2.1 Semantic |
| S2 | lifecycle_status 전이 책임 단일화 — deprecated/retired 관리 owner canonical 1개 지정 + learning·term sync 규칙 성문화 | 2.2 Conciseness |
| S3 | 3 계층 (`authority/`, `design-principles/`, `processes/`) authoring path 성문화 — 각 계층의 작성·갱신·폐기 경로를 execution_rules_ref 로 명시 | 2.3 Structure |
| S4 | `principle` entity 신설 — core-lexicon 에 정의 + core_value + relations + execution_rules_ref. 기존 promoted term 과의 구별 규칙 명시 | 2.3 Structure |
| S5 | learning · term · principle 의존 그래프 명시 — 3 lifecycle 이 어디서 교차하는가 diagram + 교차 지점 권한·책임 | 2.2 + 2.3 |

### 5.2 Out (본 W-ID 범위 밖)

- knowledge → principle 의 구체 승격 기준 (impact threshold, consensus 조건 등) — **W-C-03 으로 유지**
- 기존 artifact 의 대규모 migration (예: 기존 모든 promoted term 을 principle 여부로 재분류) — 필요 시 별도 maintenance W-ID
- cross-project 규범 (전역 principle) — W-C-03 이후 재평가

## 6. Scenarios

### 6.1 principle 정의 성문화 후 W-C-03 이 소비하는 시나리오

작업자가 특정 promoted learning (예: "review 리뷰 시 domain context 오염에 주의") 을 `design-principles/` 에 반영하려 함:

1. W-D-05 로 성문화된 `principle` entity 정의 참조 → principle 이 "규범적 결정 확정 상위 층" 이고 authoring path 가 정의되어 있음 확인
2. W-C-03 이 제공할 `onto govern promote-principle` CLI 호출 → 대상 learning + 도착지 design-principles/X.md 지정
3. govern queue 에 제안 append → Principal decide → approve 시 design-principles/X.md 에 실제 반영 (v0 는 수동)

W-D-05 완료 전에는 2단계의 "도착지" 가 불명확하여 경로 자체가 성립 안 됨.

### 6.2 기존 term 의 principle-tier 분류 시나리오

주체자가 `activity_enum` 이 principle 인지 묻는 상황:
- 현재: 답할 수 없음 ("promoted term 이고 consumption 가능한 것은 맞지만 principle 인지 별도 선언 없음")
- W-D-05 후: S4 의 구별 규칙 적용 → 명확한 답 (YES/NO + 근거)

## 7. As-Is

### 7.1 Experience

주체자·기여자가 "이 learning 을 design-principles 에 반영하자" 는 판단을 할 때, 반영 경로가 문서화되어 있지 않아 매번 임의적 수작업. W-C-03 설계 시도에서 "도착지" 가 정의되지 않음을 발견.

### 7.2 Policy

§1.1/§1.2 "knowledge → principle 경로는 보류 중" 상태. §1.1 은 principle 과 promoted term 을 "다른 층" 이라고 선언하나 구체 구별 기준 없음.

### 7.3 Code

- `learning.execution_rules_ref = "processes/learn/promote.md"` (learning 전이 명시)
- `domain_document.execution_rules_ref = "processes/learn/promote-domain.md"` (domain 전이 명시)
- `principle` / `design-principles/`: **execution_rules_ref 미정의**
- `provisional_lifecycle` 은 lexicon term 만 대상. principle 은 포함 안 됨.

## 8. Constraints (9-lens 근거)

| # | 요지 | lens | severity | 근거 |
|---|---|---|---|---|
| C-01 | "promoted" 용어가 대상별로 분리되어야 함 (term/learning/principle) | semantics | required | 2.1 Semantic drift |
| C-02 | lifecycle_status 의 deprecated/retired 관리 owner 는 canonical 1개여야 함 | conciseness | required | 2.2 Conciseness drift |
| C-03 | `principle` 은 lexicon entity 로 등재되어야 함 (현재 term 도 entity 도 아님) | structure | required | §1.1/§1.2 "보류 중" 해소 전제 |
| C-04 | 3 계층 (authority/design-principles/processes) 의 authoring path 가 execution_rules_ref 로 성문화되어야 함 | structure | required | 2.3 Structure drift |
| C-05 | 기존 promoted term 중 어느 것이 principle-tier 인지 명시 분류 필요 (activity_enum, axis_enum 등) | semantics | required | §1.1 "다른 층" 선언 구체화 |
| C-06 | 대규모 기존 artifact migration 은 본 W-ID scope 밖 (bounded minimum surface 유지) | pragmatics | recommended | W-D-05 scope creep 방지 |
| C-07 | learning · term · principle 의존 그래프는 diagram + cross-ref 로 명시 | dependency | recommended | 2.2 sync 규칙 전제 |
| C-08 | W-D-05 는 verification_consumer=principal (설계 검토 + 승인 필수) | axiology | required | 핵심 개념 변경이므로 주체자 판단 필수 |

## 9. Decision Questions (주체자께 묻는 항목, 다음 세션 설계 시)

### Q1: principle 의 정의

추천안: "규범적 결정으로 확정된 상위 층. 모든 onto 활동이 준수해야 할 제약. `authority/`, `design-principles/`, `processes/` 에 존재. promoted term 과는 별개 층으로 구분됨 — promoted term 은 lexicon inventory (개념 식별) 이고, principle 은 normative commitment (행동 규범)."

### Q2: principle 과 promoted term 의 구별 규칙

옵션:
- (a) principle 은 execution_rules (무엇을 해야 하는가) 를 포함, term 은 definition (무엇인가) 만 — **기본값 추천**
- (b) 별도 attribute (예: `is_principle_tier: true`) 로 명시
- (c) 파일 위치로 구별 (authority 는 term, design-principles/processes 는 principle)

### Q3: "promoted" 3분리의 canonical 이름

추천:
- `lexicon_term_promotion` (provisional_terms → terms)
- `learning_scope_promotion` (project → user scope)
- `principle_promotion` (learning → principle, W-C-03 대상)

### Q4: deprecated/retired 관리 canonical owner

옵션:
- (a) M-08 refresh protocol (주기 scan) — **현재 설정**
- (b) promote Step 4a event marker review — learning 에만 적용
- (c) judgment audit — judgment-type 에만 적용
- (d) 통합 audit process 신설

추천: (a) 유지 + (b)/(c) 를 M-08 의 하위 경로로 재분류.

### Q5: authoring path 성문화 정도

옵션:
- (a) execution_rules_ref 한 줄 + 상세는 processes/ 파일 별도 관리 — **bounded 추천**
- (b) 각 계층별 전용 process 문서 신설 (processes/author-authority.md 등) — scope creep

### Q6: 의존 그래프 표현 매체

- Markdown 표 (authority/ 에 authoring, learning 이 promote, principle 은 W-C-03 경로)
- Diagram (mermaid 등 시각화)
- 둘 다

추천: 둘 다. Markdown 표는 machine-readable, diagram 은 인간 이해.

## 10. Target Artifacts (다음 세션 구현 산출물)

| 파일 | 변경 유형 |
|---|---|
| `authority/core-lexicon.yaml` | v0.13.0 → v0.14.0: principle entity 신설 + learning/term/principle 간 relations + promoted 용어 분리 notes |
| `authority/core-lexicon.yaml` | `provisional_lifecycle` 용어 정비 (lexicon_term_promotion 으로 명명) |
| `processes/learn/promote.md` | authoring path 섹션 명시 + learning_scope_promotion 용어 명시 |
| `processes/govern.md` §10 | W-C-03 blocked-by W-D-05 관계 기록 + principle entity 참조 |
| `design-principles/` | (선택) 각 파일 상단에 authoring path 참조 (execution_rules_ref 를 따름) |
| `development-records/evolve/20260413-onto-direction.md` | §1.1/§1.2 "보류 중" 문구 갱신 (drift 해소 맥락 추가, 실제 "해소" 는 W-C-03 완료 시) |
| `development-records/evolve/20260413-onto-todo.md` | W-D-05 seat active → done + rewrite_trace |

본 세션 (13) 에서 구현 안 함. align-packet 만 작성.

## 11. Verification Method

verification_consumer: **principal** (핵심 개념 변경이므로 주체자 설계 검토 + 승인 필수)

verification_method:
1. 다음 세션 설계 구현 전 독립 9-lens 리뷰 (본 drift 리서치로 편향 가능성 존재)
2. 주체자 Q1~Q6 decide → principle entity 구조 확정
3. 구현 완료 후 다시 독립 9-lens 리뷰 + 주체자 최종 승인

## 12. Next Session Plan (세션 14)

1. 본 align-packet 재독 + decision questions Q1~Q6 주체자 답변 수집
2. 독립 9-lens 리뷰 (본 리서치 편향 제거용)
3. BLOCKING 해소 후 S1~S5 구현
4. 구현 후 재리뷰 + 주체자 최종 승인
5. W-C-03 해제 (depends_on blocking 해소)

예상 세션 소요: 1~2 세션.

## 13. Dependency / W-C-03 관계

- **W-C-03 은 W-D-05 완료까지 blocked**. `depends_on: [DL-022, BL-122, W-C-01, **W-D-05**]` 로 갱신.
- **W-D-05 완료 = W-C-03 unblock**. W-C-03 은 W-D-05 가 제공하는 principle entity 를 도착지로 삼음.
- W-D-05 자체는 W-C-01 govern runtime 이나 W-C-02 drift engine 에 의존하지 않음 (개념 정의 작업). 따라서 축 C 블록과 독립 진행 가능.
