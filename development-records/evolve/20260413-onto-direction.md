# onto 상위 목표 (§1)

작성일: 2026-04-13
상태: 초안 (2026-04-13 Principal 확정)

이 문서는 onto 프로젝트의 최상위 목표와 핵심 개념을 정의한다. 모든 하위 설계, 구현, 작업 분해는 본 문서의 내용과 align되어야 한다. 기존 작업물이 본 문서와 align되지 않으면 rank 1이라도 재검토 대상.

---

## §1.0 가치

onto는 **Principal이 product를 다루는 작업—reconstruct(product로부터 ontology 구축), review(검증), design(기능 추가)—의 시간과 비용을 최소화**하는 것을 최상위 가치로 둔다. 이 최소화는 세 측면에서 성립해야 한다.

1. **점진성** — 같은 종류의 작업을 반복할수록 시간·비용이 줄어든다
2. **지속성** — 기반 LLM이 바뀌어도 최소화 효과가 깨지지 않으며, 변화를 활용한다
3. **기제** — vanilla LLM이 가질 수 없는 3종 context(domain / principal / project)의 누적·정제가 이 최소화의 수단이다

세 측면은 독립이 아니다. **3이 1의 재료**이자 **2의 방어**이다.

---

## §1.1 핵심 개념

onto는 다음 일곱 개 핵심 개념을 다룬다. 모든 하위 활동·구조는 이 개념 집합 위에서 정의된다.

### 정의

**product**: Principal이 시간·비용을 투입해 만들어 현재 작동하고 있는 실체. 코드, 스프레드시트, 문서, 도메인 자료, 조직 프로세스 등 형식을 가리지 않음. onto의 모든 활동은 product를 대상으로 하거나, product에 대한 이해를 다루거나, product 작업의 부산물을 관리한다.

**ontology**: product의 설계도. product의 요소, 요소 간 관계, 각 요소가 왜 존재하는가(의도·맥락)를 명시적으로 서술한다. ontology는 product가 아니며, product 없이 독립 존재할 수 없다. product 하나에 여러 ontology가 존재할 수 있고, ontology 없이도 product는 작동한다. ontology가 있으면 review·design의 시간·비용·품질이 개선된다.

**domain**: product가 속한 분류. 같은 domain의 product들은 일관된 패턴(구조적 규약, 관행, 설계 관습)을 공유한다. 이 패턴이 reconstruct 활동에서 소실된 "왜"를 추정하는 근거가 된다.

**learning**: onto의 모든 활동 과정에서 발생하는 단축 정보. "이 종류 작업에서는 이런 패턴이 통한다"는 실용 발견물. 원칙이 아니며, 활용하면 시간·비용을 줄인다. lifecycle_status로 `seed → candidate → provisional → promoted` 성장 경로를 거치며, 유효성을 잃으면 `deprecated → retired`로 퇴출된다.

**knowledge**: promoted 단계의 learning을 지칭하는 별칭. 축적된 knowledge가 §1.0 측면 3(기제)의 비교우위 누적을 이룬다.

**principle**: 규범적 결정으로 확정된 상위 층. 본문은 `design-principles/` (rank 2-4) 와 `processes/` (rank 5) 에 존재한다. `authority/core-lexicon.yaml` (rank 1) 은 principle entity **정의만** 담고 본문은 담지 않는다. promoted term 과는 별개 층 — promoted term 은 lexicon inventory (개념 식별), principle 은 normative commitment (행동 규범). 1차 구분 단서: `execution_rules_ref` 보유 여부. knowledge → principle 승격 경로 (canonical term: `learning_to_principle_promotion`) 는 W-C-03 에서 구현 예정 — **현재는 도착지 (principle entity) 와 용어만 W-D-05 에서 확정, 실 경로는 보류 중**. 모든 onto 활동이 준수해야 할 제약.

**reconstruct**: product → ontology의 역설계 활동. product에서 요소·관계를 뽑아내고, 소실된 "왜·맥락"을 domain knowledge로 추정·부여하고, 이를 결합해 ontology를 형식화한다. onto의 활동 중 유일하게 ontology를 **출력**하는 활동.

### 개념 관계도

```
              principle (규범 층)
                  │
                  ▼  제약 부과
   ┌──────────────────────────────────┐
   │                                   │
   │    review ──┐                     │
   │    design ──┼─► product ◄─► ontology
   │ reconstruct ┘       │          ▲
   │                     │ (역설계)  │
   │                     └──────────┘
   │                                   │
   │           모든 활동 → learning    │
   │                  │                │
   │              (lifecycle)          │
   │                  ▼                │
   │             knowledge             │
   │                  │                │
   └──────────────────┼────────────────┘
                      ▼  활용
          [다음 작업의 시간·비용 단축]

           domain
      (reconstruct의 추정 근거)
```

---

## §1.2 onto의 다섯 활동

onto는 다섯 활동으로 이루어진다. 각 활동은 대상(object)과 산출(output)이 명확히 구분된다.

| 활동 | 대상 | 산출 | ontology 역할 |
|---|---|---|---|
| **review** | product | 검증 결과 | 선택적 입력 (있으면 빠르고 정확) |
| **evolve** | product | 변경 계획 | 선택적 입력 (있으면 constraints 파악 빠름) |
| **reconstruct** | product | **ontology** | 출력 |
| **learn** | review·evolve·reconstruct에서 발생한 learning | promoted learning (= knowledge) | 간접적 |
| **govern** | principle, 계약, 구조적 규칙, lifecycle 규칙, drift 정책 | 갱신된 규범 | 간접적 |

### 활동 관계

- **review/evolve**는 ontology가 있으면 활용, 없어도 수행 가능 (비용 차이만)
- **reconstruct**는 ontology 부재 상태를 해소
- **learn**은 앞 세 활동의 부산물 관리 (독립 대상 없음)
- **govern**은 앞 네 활동이 준수할 규범을 관리 (메타)

### learn과 govern의 경계 계약

둘 다 "관리"이나 **대상이 다름**:
- learn 대상: learning artifact (경험적·bottom-up)
- govern 대상: normative artifact (규범적·top-down)

계약: **govern이 기준을 정하고, learn이 실행한다.** 예: govern이 "learning promotion은 3회 독립 검증 필요"로 정하면, learn이 그 기준으로 실행. learn이 독자적으로 기준을 변경할 수 없다.

### learn의 향후 개발 범위

현재 scope는 개별 프로젝트 내 learning 관리. **조직(팀·회사 등) 차원의 learning 수집·승격·공유 관리 방식은 향후 learn 개발 방향으로 둔다.** 본 §1의 learn 정의는 프로젝트 내부 lifecycle에만 적용.

### knowledge → principle 경로

**Structure drift 해소 (W-D-05, 2026-04-16)**: 승격 "도착지" 구조는 확정됨.
- `principle` entity 를 `authority/core-lexicon.yaml` 에 신설 — 정의 + principle vs promoted term 구별 규칙 + 3 계층 authoring path 명시.
- 승격 canonical term `learning_to_principle_promotion` 등재 (3분리 중 하나).
- principle 본문 배치: `design-principles/*.md` + `processes/*.md`. `authority/` 는 정의만.

**경로 구현 완료 (W-C-03, 2026-04-16)**: 승격 기준 3축 (Quality/workload-evidence + Frequency/similar_to + Completeness/schema) + Principal gate + runtime CLI (`onto govern promote-principle`) 확정. processes/govern.md §13 참조. v0 는 기록만 (decide approve 후 파일 편집 수동). 자동 반영은 v1 잔존.

### 폐기된 개념: ask

이전 설계에서 거론된 `ask` 활동 개념은 폐기. Principal에 의해 직접 사용된 적이 없음. 필요한 경우 단일 lens review로 대체한다. 현재 `commands/ask-*.md` 명령군은 향후 review 계열로 이동 또는 제거 대상.

---

## §1.3 자기 적용과 자율성

### onto = product

onto 자체가 하나의 product이다. 코드(`src/core-runtime/`), 규범(`authority/`, `design-principles/`, `processes/`), 명령(`commands/`)은 모두 Principal이 만든 작동 실체. 따라서 onto에게 review·evolve·reconstruct를 적용할 수 있다.

### Drift 정책 기반 분기

self-application은 govern이 정한 drift 정책에 따라 분기한다.

| 분기 | 조건 | 처리 |
|---|---|---|
| **자체 실행** | drift가 양의 피드백을 만들지 않는 변경 (local, contained) | 별도 세션에서 실행 + Principal 보고 |
| **큐 적재** | drift 증폭 가능성 있는 변경 (amplifying) | 큐에 쌓고 Principal 승인 대기 |
| **Principal 직접** | govern 자체 변경, 핵심 가치(§1.0) 변경 | 자체 실행 불가, 항상 Principal 승인 |

### 자율성 수준

| 수준 | 정의 |
|---|---|
| **수준 0** | 모든 변경 Principal 승인 (자기 적용 없음) |
| **수준 1** | drift 위험 없는 변경 자체 실행 + 보고, 나머지 큐 |
| **수준 2** | 일부 drift 감수 변경까지 자체 실행 (향후, 수준 1 운영 데이터 축적 후 재평가) |

현재 상태: 수준 0~1 사이. 수준 1 완전 도달이 §1.0 측면 1(점진성)의 시간 축 증폭 조건.

---

## §1.4 측정

### §1.0 세 측면의 관찰 가능 지표

| 측면 | 지표 | 수집 위치 |
|---|---|---|
| **점진성** | 같은 종류 작업의 **N번째 시도 시간 / 1번째 시도 시간** | 활동별 실행 로그 |
| **지속성** | LLM 모델 교체 전후 **eval 통과율 회귀 0** | eval 인프라 (축 C) |
| **기제** | **knowledge 활용 히트율** + reconstruct 시 **domain knowledge 추정 적중률** | learn 기록 + reconstruct 기록 |

구체 측정 방법(LLM-as-judge·샘플링·Principal 리뷰 등)은 후속 설계 세션에서 결정.

### 활동별 완료 기준

| 활동 | 완료(구현) 기준 |
|---|---|
| **review** | 검증 결과 산출 + learning 자동 수집 + ontology 유무 경로 분기 |
| **evolve** | 변경 계획 산출 + learning 자동 수집 + ontology 활용 경로 |
| **reconstruct** | ontology 초안 산출 + domain knowledge 기반 "왜" 추정 + Principal 검증 경로 |
| **learn** | 수집·저장·검증·승격 자동 운영 + govern 기준 준수 |
| **govern** | 규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제 |

---

## §1.5 네 축 재정의

| 축 | 성격 | 정의 |
|---|---|---|
| **축 A** (entrypoint 구현) | 활동별 | 다섯 활동(review, evolve, reconstruct, learn, govern)의 구현. command·process·calling convention |
| **축 B** (기반 인프라) | 공통 | product·ontology·learning 저장·처리 공통 인프라. scope-runtime, readers, middleware 기반 |
| **축 C** (자율성 진화) | 메타 | self-application 메커니즘 + drift 판정 + 큐·승인 흐름 + 수준 0→1→2 엔진 |
| **축 D** (상시 원칙) | 교차 | lexicon provisional lifecycle. 모든 축에서 새 용어 등장 시 등록·관리 |

### 축 간 의존

- **A → B**: 활동 구현은 기반 인프라 위에서 작동. A0(scope-runtime framework 추출)는 A의 선행
- **C → A, B**: 자율성은 A·B가 최소 1사이클 운영된 경험 위에서만 설계 가능
- **D → A, B, C**: 모든 축에서 새 용어가 등장하면 D가 등록·관리. 독립 축이 아닌 교차 원칙

---

## 다음 작업

1. 작업 목록 초안 작성: 각 축별 task-level 분해 (to-do list)
2. 축 D 선행 확인 (lexicon provisional lifecycle 성문화 위치, 인용 금지 검증 도구)
