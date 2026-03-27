# Onto Review — Blueprint

> 이 문서는 onto 시스템의 구조, 원리, 사용법을 기술합니다.
> 대상 독자: 비개발자 제품 전문가.
> 목적: 이 문서와 LLM만으로 시스템을 백지에서 재구축할 수 있어야 합니다.

---

## 1. 시스템 정체성

### 무엇인가

onto는 **Claude Code 플러그인**입니다. Claude Code(터미널에서 동작하는 AI 코딩 도구) 안에서 슬래시 명령어(`/onto:review`, `/onto:build` 등)로 실행됩니다.

이 플러그인은 두 가지 기능을 제공합니다:

1. **검증(review)**: 문서, 코드, 설계안 등 범위가 확정된 대상을 에이전트 패널이 다관점으로 검증
2. **구축(build)**: 분석 대상(코드, 스프레드시트, DB, 문서)에서 온톨로지(도메인 지식의 구조화된 표현)를 자동으로 추출

### 왜 존재하는가

하나의 관점으로 검증하면 특정 측면의 문제를 놓칩니다. 예를 들어 논리적으로 정합하더라도 실제 사용 시 질의가 불가능할 수 있고, 구조적으로 완전하더라도 새 도메인 추가 시 깨질 수 있습니다. onto는 7개의 서로 다른 검증 축을 가진 에이전트가 독립적으로 평가하고, 8번째 에이전트(Philosopher)가 이를 종합하여 "세부에 매몰되지 않고 목적에 부합하는가"를 판정합니다.

### 핵심 설계 원칙

| 원칙 | 의미 | 이것이 없으면 |
|---|---|---|
| **다관점 독립 검증** | 검증 에이전트들이 서로의 결과를 모른 채 독립적으로 판단 | 선행 의견에 끌려가는 anchoring bias 발생 |
| **목적 정합성 검증** | Philosopher가 세부 결과를 목적 관점에서 재해석 | 세부 기준은 충족하나 전체 목적과 어긋나는 결과 |
| **수렴 방지** | "의견 동질화 방지"가 아니라, 세부 매몰로 인한 목적 상실 방지 | 기술적 완벽주의에 빠져 본래 질문을 놓침 |
| **도메인 무관 설계** | 검증 에이전트의 축(논리, 구조, 의존성...)은 도메인에 관계없이 적용 | 도메인마다 별도 시스템이 필요 |
| **학습 축적** | 리뷰/질문마다 에이전트가 학습을 기록하고, 다음 실행에 활용 | 같은 실수를 반복하거나, 이전 맥락을 잃음 |

---

## 2. 용어 정의

이 문서에서 반복적으로 사용되는 용어입니다.

| 용어 | 정의 |
|---|---|
| **온톨로지** | 도메인 지식을 구조화한 표현. "어떤 개체가 존재하고, 어떤 관계를 맺고, 어떤 제약이 있는가"를 정의한 것 |
| **에이전트** | 특정 역할을 부여받은 AI 인스턴스. 각각 독립된 판단 기준과 전문 영역을 가짐 |
| **team lead** | 에이전트 팀을 생성하고 조율하는 주체. Claude Code의 메인 프로세스가 이 역할을 수행 |
| **teammate** | team lead가 생성한 개별 에이전트 인스턴스 |
| **delta** | Explorer가 소스를 탐색하고 보고하는 도메인 사실 단위 (build 프로세스 전용) |
| **epsilon** | 검증 에이전트가 제시하는 "다음에 탐색해야 할 방향" (build 프로세스 전용) |
| **label** | 검증 에이전트가 delta에 부여하는 온톨로지 유형 (예: "이것은 Entity이다") |
| **patch** | Philosopher가 label들을 온톨로지 요소로 변환하여 wip.yml에 적용하는 변경 단위 |
| **certainty** | 사실의 확실성 등급. observed(소스에서 확인) ~ not-in-source(외부 정보 필요). 1차(Explorer: observed/pending) → 2차(검증 에이전트: rationale-absent/inferred/ambiguous/not-in-source) |
| **wip.yml** | 구축 진행 중인 온톨로지 파일. 라운드마다 갱신됨 |
| **raw.yml** | 구축 완료된 온톨로지 파일. wip.yml에서 변환됨 |
| **schema.yml** | 온톨로지의 틀(어떤 유형의 요소를 사용할 것인가)을 정의한 파일 |
| **도메인 문서** | 특정 도메인의 검증 기준을 정의한 문서 7종. 에이전트가 판단 시 참조 |
| **학습** | 에이전트가 리뷰/질문 과정에서 발견한 교훈. 소통/방법론/도메인 3종류로 분류 |
| **promote (승격)** | 프로젝트 수준의 학습을 글로벌 수준(도메인 전체)으로 격상하는 프로세스 |
| **Agent Teams** | Claude Code의 멀티 에이전트 기능. TeamCreate로 팀 생성, SendMessage로 통신 |
| **subagent (fallback)** | Agent Teams가 실패할 때 사용하는 대체 실행 방식. Agent tool로 개별 에이전트를 순차 실행 |
| **fact_type** | Explorer가 보고하는 도메인 사실의 유형. entity, enum, property, relation, state_transition, command, query, policy_constant, flow, code_mapping의 10종. Stage 1/2에서 탐색 범위를 제한하는 기준 |
| **structured_data** | delta 내 fact의 구조화된 부속 데이터. fact_type별로 정해진 필드(예: entity이면 name, fields 등)를 포함. 선택적이나 가능한 한 포함 |
| **Stage 1 / Stage 2** | build Phase 1의 2단계 구분. Stage 1(Structure)은 Entity, Enum, Relation, Property를 식별하고, Stage 2(Behavior)는 Stage 1 결과를 기반으로 State Machine, Command, Query, Policy, Flow를 식별. 각 Stage는 독립적으로 적분형 루프를 수행 |
| **canonical.yaml** | golden 디렉토리 내 스키마 중립 원본 예시. 동일한 도메인 사실을 각 스키마(B/C/D)가 어떻게 표현하는지의 공통 출발점 |
| **golden** | 스키마별 golden example(모범 출력 예시)을 모아둔 디렉토리. Phase 4(저장)에서 raw.yml 형식을 결정할 때 참조 |

---

## 3. 에이전트 구성

> **설계 원칙**: 이 에이전트들은 MECE 분류가 아닌, 경험적으로 유효한 독립 검증 관점의 집합입니다. 단일 분류 축을 의도적으로 사용하지 않으며, 각 관점의 유지 정당성은 고유 탐지 영역의 존재 여부로 검증합니다.

### 3.1 검증 에이전트

각 에이전트는 고유한 **검증 축**을 가지며, 같은 대상을 서로 다른 관점에서 평가합니다.

#### onto_logic — 논리적 일관성 검증자

**검증 대상**: 정의 간 모순, 타입 충돌, 제약 조건의 상충

**검증 절차**:
1. 모든 명시적/암묵적 공리(axiom)를 추출
2. 공리 쌍 간 논리적 양립 가능성을 검증
3. 타입 계층의 일관성을 확인 (하위 타입이 상위 타입의 제약을 위반하는지)
4. 제약 조건이 서로 충돌하는지 확인

**참조하는 도메인 문서**: `logic_rules.md` — 도메인별 논리 규칙 (없으면 범용 논리학 원칙 사용)

**보고 형식**: 모순 발견 시 "전제 A + 전제 B → 모순" 구조로 추론 경로를 제시

---

#### onto_structure — 구조적 완전성 검증자

**검증 대상**: 고립된 요소, 끊어진 경로, 누락된 관계, 접근 불가 노드

**검증 절차**:
1. 전체 요소와 관계를 그래프로 구성
2. 연결되지 않은 고립 노드 탐지
3. 관계의 양쪽 끝이 모두 정의되어 있는지 확인 (끊어진 참조)
4. 경로 완전성 검증: 임의의 두 노드 간 도달 가능한 경로가 존재하는지

**참조하는 도메인 문서**: `structure_spec.md` — 도메인별 구조 규격

---

#### onto_dependency — 의존성 무결성 검증자

**검증 대상**: 순환 의존, 역방향 의존, 다이아몬드 의존, 의존 방향 위반

**검증 절차**:
1. 모든 의존 관계를 방향 그래프로 구성
2. 순환 참조 탐지 (A→B→C→A)
3. 계층 구조의 방향 위반 확인 (하위가 상위에 의존해야 하는데 역방향인 경우)
4. 다이아몬드 의존: 동일 대상에 서로 다른 경로로 의존하여 충돌 가능성이 있는 경우

**참조하는 도메인 문서**: `dependency_rules.md` — 도메인별 의존 규칙

---

#### onto_semantics — 의미적 정확성 검증자

**검증 대상**: 이름과 실제 의미의 불일치, 동의어(다른 이름 같은 것), 동형이의어(같은 이름 다른 것)

**검증 절차**:
1. 모든 용어의 이름과 정의를 대조
2. 정의가 유사한데 이름이 다른 쌍 탐지 (동의어 후보)
3. 이름이 같은데 정의가 다른 쌍 탐지 (동형이의어 후보)
4. 업계 표준 용어와의 매핑 확인

**참조하는 도메인 문서**: `concepts.md` — 도메인 핵심 개념 정의 (축적 가능형: 학습으로 보완됨)

---

#### onto_pragmatics — 활용 적합성 검증자

**검증 대상**: 실제로 질의가 가능한지, 역량 질문(competency question)에 답할 수 있는지

**검증 절차**:
1. 도메인의 역량 질문 목록을 로드
2. 각 질문에 대해 현재 온톨로지로 답변이 가능한지 검증
3. 답변 불가능한 질문이 있으면, 누락된 요소를 구체적으로 식별
4. 질의 경로가 실용적인지 확인 (답을 얻기 위해 10단계 이상의 관계 순회가 필요하면 비실용적)

**참조하는 도메인 문서**: `competency_qs.md` — 도메인별 역량 질문 목록 (축적 가능형)

---

#### onto_evolution — 확장/진화 적합성 검증자

**검증 대상**: 새 데이터, 새 도메인, 새 요구사항 추가 시 기존 구조가 깨지는지

**검증 절차**:
1. 확장 시나리오를 로드
2. 각 시나리오에 대해 기존 구조의 변경 없이 수용 가능한지 시뮬레이션
3. 변경이 필요하면 영향 범위와 파급 효과를 산정
4. "확장을 위해 기존 구조를 파괴해야 하는 경우"를 critical로 분류

**참조하는 도메인 문서**: `extension_cases.md` — 도메인별 확장 시나리오

---

#### onto_coverage — 도메인 포괄성 검증자

**검증 대상**: 누락된 하위 영역, 특정 영역으로의 편중, 표준 대비 빈 영역

**검증 절차**:
1. 도메인 범위 정의를 로드
2. 현재 온톨로지가 범위 정의의 모든 영역을 포괄하는지 확인
3. 영역별 요소 수의 편중도 분석
4. 해당 도메인의 표준(ISO, IFRS 등)과 대비하여 누락 영역 탐지

**참조하는 도메인 문서**: `domain_scope.md` — 도메인 범위 정의 (범위 정의형: 이것이 없으면 onto_coverage의 역할이 무력화됨)

---

#### onto_conciseness — 간결성 검증자

**검증 대상**: 중복 정의, 과잉 명세, 실용적 차이를 만들지 않는 구분

**검증 절차**:
1. 동일하거나 유사한 개념이 다른 경로로 중복 정의된 것을 탐지
2. 상위 개념이 보장하는 제약의 하위 재선언(과잉 명세) 탐지
3. 실제 차이를 만들지 않는 하위 분류 탐지
4. 자식이 하나뿐인 불필요한 중간 계층 탐지

**참조하는 도메인 문서**: `conciseness_rules.md` — 도메인별 간결성 기준

---

### 3.2 Philosopher — 목적 정합성 검증자

Philosopher는 검증 에이전트들과 근본적으로 다른 역할을 합니다.

**검증 에이전트와의 차이**:
- 검증 에이전트: 각자의 축에서 기준 충족 여부를 판단
- Philosopher: 검증 에이전트들의 판단 결과를 시스템의 "상위 목적"에 비추어 재해석

**하는 일**:
1. 검증 에이전트들의 결과를 합의/모순/간과된 전제/새로운 관점으로 분류
2. 만장일치인 항목에도 "합의의 논리적 근거"를 별도 검증 (전원 동의해도 근거가 부실하면 지적)
3. 세부 기준 충족에 매몰되어 본래 목적과 어긋나는 경우를 포착
4. 검증 에이전트들이 모두 놓친 관점을 새로 제시

**참조하는 도메인 문서**: 없음. 도메인에 독립적인 메타 관점을 유지.

**build 모드에서의 추가 역할**:
- 검증 에이전트들의 epsilon(탐색 방향)을 통합 지시로 조율
- 수렴 판정 (종료 여부 결정)
- wip.yml에 patch를 적용하여 온톨로지를 라운드마다 갱신

---

### 3.4 검증 차원 포괄성 체크리스트

에이전트 구성의 포괄성을 확인하기 위한 메타 도구입니다. 이 체크리스트는 에이전트 구성 축이 아니라, 현재 에이전트들이 모든 검증 차원을 빠짐없이 포괄하는지 확인하는 참조 프레임입니다. 표준 프레임워크(Gomez-Perez, Obrst, OntoClean)에서 교차 도출된 검증 차원입니다.

| 검증 차원 | 검증 질문 | 포괄 에이전트 | 표준 프레임워크 대응 |
|-----------|----------|-------------|-------------------|
| 형식적 정합성 | 정의 간 모순이 없는가? | onto_logic, onto_dependency | Gomez-Perez: Consistency, Obrst: L4 |
| 의미적 정확성 | 각 개념이 대상을 정확히 표현하는가? | onto_semantics | Obrst: L1, OntoClean: Rigidity/Identity |
| 구조적 완전성 | 내부 연결이 빠짐없이 존재하는가? | onto_structure | Obrst: L2-L3, Gomez-Perez: Completeness (내부) |
| 도메인 포괄성 | 모든 관련 개념이 표현되었는가? | onto_coverage | Gomez-Perez: Completeness (외부) |
| 최소성 | 불필요한 요소가 없는가? | onto_conciseness | Gomez-Perez: Conciseness |
| 화용적 적합성 | 실제 사용 목적에 부합하는가? | onto_pragmatics | Brank: Application-based |
| 진화 적응성 | 변경 시 적응할 수 있는가? | onto_evolution | — |

> 이 체크리스트의 검증 차원은 에이전트와 다대다(N:M) 관계입니다. 에이전트는 "독립 관점 집합"이므로, 한 에이전트가 여러 차원을 포괄하거나 한 차원이 여러 에이전트에 걸칠 수 있습니다.

---

### 3.5 도메인 확장 시 에이전트 재평가 조건

현재 검증 에이전트는 도메인 무관하게 설계되어 있습니다. 단, 아래 도메인에 진입할 경우 에이전트 구성의 재평가가 필요합니다:

| 조건 | 이유 | 재평가 대상 |
|------|------|------------|
| 인간/집단을 분류하는 도메인 진입 (의료, 교육, 법률, HR) | 윤리학/가치론(2.5)의 검증이 필요해짐 — "이 분류가 특정 집단에 불이익을 주는가" | 규범적 판단 에이전트 추가 검토 |
| 금융/행정 도메인 진입 | 사회적 존재론(3.1)의 비중이 증가 — 제도적 구성물의 존재 방식이 핵심이 됨 | onto_semantics의 존재 유형 검증 비중 조정 |

---

### 3.6 Explorer — 소스 탐색자 (build 전용)

build 프로세스에서만 존재하는 에이전트입니다. 소스 유형(코드, 스프레드시트, DB, 문서)에 따라 탐색 도구가 달라지지만, 역할은 동일합니다.

**하는 일**: 소스를 직접 탐색하고, 도메인 사실(delta)을 fact_type별로 구조화하여 서술합니다. 구조 인식(서식 차이, 참조 관계 등)은 수행하되, 관찰 근거를 명시합니다. 가능한 한 structured_data(fact_type별 정형 데이터)를 포함합니다.
**하지 않는 일**: 온톨로지적 해석 (예: "이것은 Aggregate이다", "이것은 헤더이다"). 이것은 검증 에이전트가 합니다.

**Stage별 탐색 범위**: Stage 1에서는 구조적 사실(entity, enum, property, relation, code_mapping)에 집중하고, Stage 2에서는 Stage 1에서 확정된 Entity를 기반으로 행위적 사실(state_transition, command, query, policy_constant, flow)을 탐색합니다.

**예시** (올바른 보고 — 코드):
> "Payment 클래스는 status, amount, createdAt 필드를 가지며, PaymentGateway에서 status를 문자열 비교로 분기한다"

**예시** (올바른 보고 — 스프레드시트):
> "A1:F1 셀이 병합되어 있고, 배경색 #4472C4, 폰트 Bold이며, 아래 행과 서식이 다르다"

**예시** (해서는 안 되는 보고):
> "Payment는 Aggregate Root이며, PaymentGateway는 Domain Service이다"

이 분리가 존재하는 이유: Explorer가 해석까지 하면, 검증 에이전트의 독립적 판단이 Explorer의 해석에 anchoring됩니다.

---

## 4. 프로세스

### 4.1 팀 리뷰 (review)

**명령어**: `/onto:review {대상}`
**입력**: 범위가 확정된 문서, 코드, 설계안
**출력**: 에이전트 패널의 합의/쟁점/권장사항 보고서

#### 흐름

```
1. Context Gathering
   team lead가 대상을 읽고, 도메인을 판별하고, 시스템 목적을 파악

2. Team 생성 + Round 1 (검증 에이전트 독립 리뷰)
   - 세션 ID 생성 (예: 20260325-a3f7b2c1)
   - 전체 teammate 생성 (검증 에이전트 + Philosopher)
   - 검증 에이전트들이 독립적으로 검증. 서로의 결과를 모름
   - 각자 결과를 세션 디렉토리에 파일로 저장
   - team lead에게 파일 경로만 보고

3. Philosopher 종합
   - 검증 에이전트들의 결과 파일을 직접 읽음
   - 합의 / 모순 / 간과된 전제 / 새로운 관점으로 분류
   - 쟁점이 있으면 해당 에이전트 간 직접 토론 지시

4. 쟁점 토론 (조건부)
   - Philosopher가 지정한 에이전트들만 참여
   - 토론 후에도 합의에 이르지 못하면 "미합의"로 기록

5. 최종 출력
   합의사항 (N/8), 조건부 합의, 목적 부합 검증,
   즉시 조치 필요 항목, 권장 사항

6. 마무리
   학습 저장, 승격 안내, Team 종료
```

#### 핵심 규칙

- **team lead는 내용에 개입하지 않음**: 결과를 수정하거나 요약하지 않고, 있는 그대로 전달
- **파일 기반 전달**: 리뷰 원문이 team lead의 컨텍스트를 거치지 않고, 파일로 직접 전달. Issue 1-A의 해결책
- **만장일치도 검증**: 전원이 동의해도, 그 합의의 논리적 근거를 별도로 확인

---

### 4.2 개별 질문 (question)

**명령어**: `/onto:ask-{dimension} {질문}` (예: `/onto:ask-logic 이 설계에 모순이 있나요?`)
**입력**: 특정 관점으로 답변받고 싶은 질문
**출력**: 해당 에이전트 1인의 답변 + 학습 기록

전원을 동원할 필요 없이, 특정 축의 전문가 1인에게 직접 질문합니다.
에이전트는 자신의 역할 정의 + 방법론 학습 + 도메인 문서 + 도메인 학습을 로드한 후 답변합니다.

---

### 4.3 온톨로지 구축 (build)

**명령어**: `/onto:build {경로|URL}`
**입력**: 분석 대상 (경로 미지정 시 프로젝트 전체. 코드, 스프레드시트, DB, 문서 지원)
**출력**: `raw.yml` — 소스에서 추출한 온톨로지

이 프로세스가 review와 구조적으로 다른 이유:
- review: 범위가 확정됨 → 검증 에이전트들이 독립 병렬로 각자 평가하면 됨
- build: 범위가 미확정 → 독립 탐색하면 중복은 7배, 빈 영역은 끝에 가서야 발견됨

따라서 build는 **적분형 탐색** 구조를 사용합니다.

#### 흐름

```
Phase 0: Schema Negotiation
   온톨로지의 "틀"을 사용자와 결정
   4가지 선택지: Action-Centric / Knowledge Graph / Domain-Driven / 커스텀
   (Schema A — Axiom 기반은 build에서 미지원. review/transform에서만 사용 가능)
   → schema.yml 저장

Phase 0.5: Context Gathering
   프로젝트 스캔 (디렉토리 목록, README, 문서, 테스트 등)
   사용자에게 질문 (핵심 흐름, 레거시, 관련 레포, 용어집)
   → context_brief.yml 저장

Phase 1: 적분형 탐색 루프 (2 Stage × 최대 5라운드 = 최대 10라운드)
   Stage 1 — Structure (Entity, Enum, Relation, Property 식별)
     fact_type 범위: entity, enum, property, relation, code_mapping
     Round 0: Explorer가 전체 구조를 파악 (모듈 목록 = 커버리지 분모)
     Round N (반복):
       1. Explorer의 delta를 검증 에이전트에게 전달
       2. 검증 에이전트: label + epsilon + issues 보고
       2.5. Philosopher: label을 patch로 변환 → wip.yml 갱신
       3. Philosopher: epsilon 통합, 수렴 판정
       4. Explorer: 통합 지시 방향으로 탐색 → 새 delta 보고
       → 반복
     종료 조건: (모든 모듈에서 1건 이상 fact 보고) AND (새 fact = 0)

   Stage 2 — Behavior (State Machine, Command, Query, Policy, Flow 식별)
     fact_type 범위: state_transition, command, query, policy_constant, flow
     Stage 1의 wip.yml(확정된 Entity 목록)을 참조하여 행위 탐색
     동일한 적분형 루프를 Stage 2 fact_type 범위로 재실행
     Schema A 선택 시: Stage 2 생략 (Axiom 기반은 행위 명세를 포함하지 않음)

Phase 2: 최종화
   Philosopher가 wip.yml을 최종 검토
   미해결 conflict 판정, 용어 정리, 외부 시스템 정리, 탐색 편향 검증
   wip.yml → raw.yml 변환

Phase 3: 사용자 확인
   certainty 분포, 커버리지, 사용자 결정 필요 항목 제시

Phase 4: 저장
   raw.yml 저장, wip.yml과 deltas/ 삭제

Phase 5: 학습 저장
```

#### Certainty 분류 (사실의 확실성)

build에서 발견한 모든 사실에는 확실성 등급이 부여됩니다.

**1차 판정 (Explorer)**:

| 등급 | 의미 | 예시 |
|---|---|---|
| `observed` | 소스에서 직접 관찰. 소스가 바뀌지 않으면 이 사실도 안 바뀜 | "Payment 클래스에 status 필드가 있다" |
| `pending` | 소스만으로 확정할 수 없음 | "이 상수의 근거가 소스에 없다" |

**2차 판정 (검증 에이전트가 `pending`를 세분화)**:

| 등급 | 의미 | 예시 | 하류 행위 |
|---|---|---|---|
| `rationale-absent` | 구현은 소스에 있으나 근거가 없음 | "500원 하드코딩 — 왜 500인지 모름" | Phase 3에서 근거 확인 요청 |
| `inferred` | 합리적 추론이지만 직접 확인 불가 | "이벤트 통신으로 추정됨" | Phase 3에서 추론 품질과 함께 제시 |
| `ambiguous` | 동등하게 타당한 복수 해석이 존재 | "인증인지 인가인지 불분명" | Phase 3에서 해석 선택지 제시 |
| `not-in-source` | 이 소스에서 결정 불가 | "사용자 시나리오" | Phase 3에서 사용자 결정 요청 |

이 분류가 존재하는 이유: 사용자가 "어디까지 확정이고 어디부터 결정이 필요한지" 파악하기 위함. 각 등급은 Phase 3에서 서로 다른 행위를 유발합니다. certainty는 fact_type(도메인 사실의 유형)과 독립적으로 부여됩니다 — entity든 command든 동일한 certainty 판정 기준을 적용합니다.

---

### 4.4 온톨로지 변환 (transform)

**명령어**: `/onto:transform {파일}`
**입력**: `raw.yml` (build의 출력)
**출력**: 사용자가 선택한 형식으로 변환된 온톨로지

지원 형식:
- Markdown (사람이 읽기 위한 문서)
- Mermaid (다이어그램)
- YAML / JSON-LD (데이터 교환)
- OWL/RDF (학술/추론 도구)
- 하이브리드 (복수 형식 조합)

---

### 4.5 온보딩 (onboard)

**명령어**: `/onto:onboard`
**출력**: 프로젝트에 onto 환경 설정 완료

진행 순서:
1. **진단**: 학습 디렉토리 존재 여부, CLAUDE.md의 도메인 선언 여부, 글로벌 도메인 문서 존재 여부, 에이전트 메모리 현황
2. **사용자 확인**: 진단 결과를 보여주고, 설정할 항목을 확인
3. **환경 설정**: `.onto/learnings/` 디렉토리 생성, CLAUDE.md에 도메인 선언 추가, 도메인 문서 설치 제안, 범위 문서 초안 생성

---

### 4.6 학습 승격 (promote)

**명령어**: `/onto:promote`
**입력**: 프로젝트 수준 학습 (`{project}/.onto/learnings/`)
**출력**: 검수를 거쳐 글로벌 수준으로 승격된 학습

프로젝트에서 축적된 학습 중 "다른 프로젝트에서도 유효한 것"을 글로벌 수준(도메인 전체)으로 격상합니다.

**3인 검수 패널**: 해당 에이전트 + Philosopher + 관련 에이전트 1인
- 3/3 합의: 자동 승격
- 2/3 합의: 권장 (소수 의견 첨부하여 사용자 판단)
- 2/3 이상 보류/기각: 승격 안 함

도메인 문서(`concepts.md`, `competency_qs.md`, `domain_scope.md`)의 갱신이 필요하면 제안하되, **사용자의 명시적 승인 없이 자동 수정하지 않습니다**.

---

## 5. 도메인 시스템

### 5.1 도메인 판별 규칙

에이전트가 어떤 도메인의 기준으로 검증할지 결정하는 순서:

1. **프로젝트 선언 우선**: CLAUDE.md에 `domain: software-engineering` 같은 선언이 있으면 해당 도메인 사용
2. **다중 도메인**: `secondary_domains: ontology` 같은 보조 도메인 선언이 있으면, 주 도메인 우선 참조 + 보조 도메인 추가 참조
3. **선언 없음**: 사용자에게 질문
4. **도메인 문서 없음**: 선언은 있으나 해당 도메인의 문서가 설치되지 않았으면, 범용 원칙만으로 검증

### 5.2 도메인 문서 7종

각 도메인에는 최대 7개의 기준 문서가 존재합니다. 에이전트마다 자신의 축에 해당하는 문서를 참조합니다.

| 문서 | 사용 에이전트 | 유형 | 설명 |
|---|---|---|---|
| `domain_scope.md` | onto_coverage | 범위 정의형 | 이 도메인이 포괄하는 영역의 정의. 없으면 onto_coverage 역할 무력화 |
| `concepts.md` | onto_semantics | 축적 가능형 | 핵심 개념과 용어 정의. 학습을 통해 점진적으로 보완됨 |
| `competency_qs.md` | onto_pragmatics | 축적 가능형 | 역량 질문 목록. "이 온톨로지로 이 질문에 답할 수 있어야 한다" |
| `logic_rules.md` | onto_logic | 규칙 정의형 | 도메인 고유 논리 규칙. 사용자가 직접 작성/수정 |
| `structure_spec.md` | onto_structure | 규칙 정의형 | 도메인 고유 구조 규격 |
| `dependency_rules.md` | onto_dependency | 규칙 정의형 | 도메인 고유 의존 규칙 |
| `extension_cases.md` | onto_evolution | 규칙 정의형 | 확장 시나리오 |

**도메인 문서 보호 원칙**: 도메인 문서는 에이전트가 자동으로 수정할 수 없습니다. promote의 갱신 제안, onboard의 초안 생성 모두 사용자 확인을 거칩니다. 도메인 문서는 "특정 프로젝트의 학습"이 아니라 "도메인 전체에 적용되는 합의된 기준"이므로, 자동 변경은 위험합니다.

**저장 경로**: `~/.onto/domains/{도메인명}/`

### 5.3 제공되는 도메인

| 도메인 | 설명 |
|---|---|
| `software-engineering` | 코드 품질, 아키텍처, 타입 안전성, 테스트 전략 |
| `llm-native-development` | LLM 친화적 파일 구조, ontology-as-code. software-engineering을 상속하며 개념을 재정의 |
| `accounting` | 복식부기, K-IFRS, 세무 조정, 감사 |
| `finance` | 재무제표, XBRL, 수익인식(IFRS 15), 금융상품(IFRS 9), 리스(IFRS 16) |
| `business` | 경영 전략, 마케팅, 재무관리, 조직/인사, 혁신관리 |
| `market-intelligence` | 시장 분석, 경쟁 정보, 위험 평가, 데이터 신뢰도 |
| `ontology` | 온톨로지 설계 자체. OWL/RDFS/SKOS, 분류 일관성 |
| `visual-design` | 타이포그래피, 색채, 레이아웃, 모션, 브랜드, 접근성 (WCAG) |
| `ui-design` | 내비게이션, 폼, 피드백, 반응형, WAI-ARIA 접근성 |

**설치 방법**: `./setup-domains.sh` 실행 (대화형 선택 또는 `--all`로 전체 설치)

---

## 6. 학습 체계

### 6.1 학습의 3분류

에이전트가 리뷰/질문을 수행하면서 발견한 교훈을 3가지 경로로 분리 저장합니다.

| 학습 유형 | 저장 경로 | 범위 | 예시 |
|---|---|---|---|
| **소통 학습** | `~/.onto/communication/` | 사용자의 소통 선호 | "이 사용자는 비유를 싫어한다", "요약 없이 diff만 원한다" |
| **방법론 학습** | `~/.onto/methodology/{agent-id}.md` | 도메인에 무관한 검증 원칙 | "단일 책임 위반 여부는 클래스명보다 의존 수로 판단하는 것이 정확하다" |
| **도메인 학습** | `{project}/.onto/learnings/{agent-id}.md` (프로젝트) 또는 `~/.onto/domains/{domain}/learnings/{agent-id}.md` (글로벌) | 특정 도메인/프로젝트에서만 유효한 교훈 | "이 프로젝트의 Payment 모듈은 이벤트 소싱을 사용한다" |

### 6.2 유형 태깅

각 학습 항목에는 `[사실]` 또는 `[판단]` 태그가 부여됩니다.

- **[사실]**: 정의, 구조, 관계에 대한 객관적 기술. 축적해도 편향을 유발하지 않음
- **[판단]**: "이 패턴은 문제이다" 같은 가치 판단. 맥락이 변하면 유효성이 달라지므로, 10건 이상 축적되면 재검증 대상

### 6.3 방법론 학습의 자기 검증

방법론 학습은 검수 없이 글로벌에 직접 저장되므로, 저장 전에 자기 검증이 필수입니다:

> "이 학습에서 특정 기술 스택/프레임워크/도메인 용어를 제거해도 원칙이 성립하는가?"

성립하면 방법론, 성립하지 않으면 도메인 학습으로 재분류합니다.

### 6.4 학습 투입 시 검증

축적된 학습을 다음 리뷰/질문에서 사용할 때:
- **출처 태깅 검증**: 학습의 출처 도메인과 현재 대상의 도메인이 일치하는지 확인. 불일치하면 `[다른 도메인 출처]` 태그를 붙여 에이전트가 적용 여부를 판단
- **판단 학습 재검증**: `[판단]` 유형이 10건 이상이면, promote 실행 시 기존 판단의 유효성을 재검증

---

## 7. 실행 인프라

### 7.1 Agent Teams (우선 실행 방식)

Claude Code의 멀티 에이전트 기능입니다.

- **TeamCreate**: 팀을 생성합니다. team_name은 `{프로세스}-{세션ID}` 형식 (예: `onto-20260325-a3f7b2c1`)
- **SendMessage**: teammate 간 메시지를 전송합니다
- **TeamDelete**: 팀을 삭제합니다

**세션 ID**: `{YYYYMMDD}-{hash8}` 형식. 날짜로 시간 순서를 파악하고, 8자리 랜덤 해시로 충돌을 방지합니다.

**세션 디렉토리**: `{project}/.onto/{프로세스}/{세션ID}/` — 리뷰 결과 파일이 저장되는 곳

### 7.2 Subagent Fallback

TeamCreate가 실패하면 Agent tool(subagent) 방식으로 전환합니다.

차이점:
- teammate가 자기 로딩(필요한 파일을 직접 읽기)할 수 없으므로, team lead가 모든 컨텍스트를 직접 포함하여 전달
- SendMessage로 직접 토론 불가 → 쟁점 토론 생략 (미합의 항목은 그대로 최종 보고에 포함)
- 파일 기반 전달은 동일하게 적용

### 7.3 에러 처리

에러를 2가지로 분류합니다:

| 분류 | 조건 | 대응 |
|---|---|---|
| **프로세스 중단형** | 리뷰 대상 읽기 실패, 에이전트 정의 파일 읽기 실패, Explorer 실패(build), Philosopher 실패(build) | 프로세스를 중단하고 사용자에게 안내 |
| **graceful degradation형** | 검증 에이전트 일부 실패, 학습 파일 부재, 도메인 문서 부재 | 해당 에이전트를 제외하고 나머지로 진행. 합의 판정 시 분모를 조정 |

### 7.4 팀 생명주기 관리

#### 생성 전 확인
- `~/.claude/teams/{프로세스}-*` 패턴으로 기존 팀이 있는지 확인
- 고아 팀/파일(config.json 없이 inbox만 남은 디렉토리) 존재 시 사용자에게 정리 안내

#### 종료 절차
1. 모든 teammate에게 shutdown_request 전송
2. 각 teammate의 shutdown_approved 확인
3. 미응답 시 30초 후 재전송 (최대 3회)
4. 전원 종료 확인 후 TeamDelete 실행

#### 금지 사항
- `rm -rf ~/.claude/teams/{team}/` 등 팀 디렉토리의 수동 삭제는 금지. 에이전트 프로세스가 살아남아 다른 세션의 작업을 오염시킴
- TeamDelete가 "active member" 오류로 실패하면, 미종료 에이전트에 shutdown_request를 재전송. 그래도 실패하면 사용자에게 수동 정리를 안내

### 7.5 team lead의 역할 범위

team lead는 **구조 조율자**입니다.

**허용되는 것** (Context Gathering 단계):
- 리뷰 대상 파악, 도메인 판별, 프로세스 흐름 결정

**금지되는 것** (전달 단계):
- 수집한 결과를 수정하거나 요약하는 것
- 자신의 판단을 리뷰에 개입시키는 것
- teammate 간 결과를 교차 공유하는 것 (독립성 보장)

**build 모드 예외**: 이전 라운드의 확정 요소 목록을 anonymized 형태(labeled_by 필드 제거)로 공유. "무엇이 이미 식별되었는가"는 알려주되 "누가 판단했는가"는 숨겨, 독립성과 커버리지의 균형을 유지.

---

## 8. 파일 구조

### 8.1 플러그인 코드 (배포되는 파일)

```
onto/
├── .claude-plugin/
│   ├── plugin.json           # 플러그인 메타데이터 (이름, 설명, 버전)
│   └── marketplace.json      # 마켓플레이스 배포 정보
│
├── process.md                # 공통 정의 — 모든 프로세스가 참조하는 상위 규칙
│                             #   에이전트 구성, 도메인 문서, Agent Teams 실행 방식,
│                             #   학습 저장 규칙, 팀 생명주기, team lead 역할
│
├── processes/                # 프로세스 정의 (6개)
│   ├── review.md             #   팀 리뷰 (에이전트 패널)
│   ├── question.md           #   개별 질문 (1인)
│   ├── build.md              #   온톨로지 구축 (적분형 탐색)
│   ├── transform.md          #   온톨로지 변환
│   ├── onboard.md            #   프로젝트 온보딩
│   └── promote.md            #   학습 승격
│
├── roles/                    # 에이전트 역할 정의 (8개)
│   ├── onto_logic.md         #   논리적 일관성
│   ├── onto_structure.md     #   구조적 완전성
│   ├── onto_dependency.md    #   의존성 무결성
│   ├── onto_semantics.md     #   의미적 정확성
│   ├── onto_pragmatics.md    #   활용 적합성
│   ├── onto_evolution.md     #   확장/진화 적합성
│   ├── onto_coverage.md      #   도메인 포괄성
│   └── philosopher.md        #   목적 정합성
│
├── commands/                 # 명령어 정의 (13개)
│   ├── review.md
│   ├── build.md
│   ├── transform.md
│   ├── onboard.md
│   ├── promote.md
│   ├── ask-logic.md
│   ├── ask-structure.md
│   ├── ask-dependency.md
│   ├── ask-semantics.md
│   ├── ask-pragmatics.md
│   ├── ask-evolution.md
│   ├── ask-coverage.md
│   └── ask-philosopher.md
│
├── domains/                  # 도메인 기준 문서 (9개 도메인)
│   ├── software-engineering/   # 7개 문서
│   ├── llm-native-development/ # 8개 문서 (prompt_interface.md 추가)
│   ├── accounting/             # 7개 문서
│   ├── finance/                # 7개 문서
│   ├── business/               # 7개 문서
│   ├── market-intelligence/    # 7개 문서
│   ├── ontology/               # 7개 문서
│   ├── visual-design/          # 7개 문서
│   └── ui-design/              # 7개 문서
│
├── golden/                  # 스키마별 golden example (B/C/D)
│   ├── canonical.yaml       #   스키마 중립 원본
│   ├── b-action-centric.yaml
│   ├── c-knowledge-graph.yaml
│   ├── d-domain-driven.yaml
│   └── schema-*.yml         #   스키마 템플릿
│
├── setup-domains.sh          # 도메인 문서 설치 스크립트
├── CLAUDE.md                 # 프로젝트 도메인 선언
├── README.md                 # 사용자 안내
└── KNOWN-ISSUES.md           # 알려진 이슈 및 해결 방안
```

### 8.2 런타임 생성 디렉토리 (실행 시 만들어지는 것)

**분류 축**:

| 축 | 역할 | 예시 |
|---|---|---|
| 1차: 프로세스 유형 | 데이터의 종류를 구분 | `review/`, `builds/`, `learnings/` |
| 2차: 세션 ID | 동일 프로세스의 실행 인스턴스를 격리 | `20260326-3be34f0f/` |
| 3차: 라운드 번호 | 에이전트 실행 단계를 구분 | `round1/` |

**디렉토리 역할 정의**:

| 디렉토리 | 역할 | 포함 내용 | 생명주기 |
|---|---|---|---|
| `review/{session-id}/` | 하나의 review 세션에 속한 모든 데이터 | 라운드 결과 + Philosopher 종합 | 세션 종료 후 영구 보존 |
| `builds/{session-id}/` | 하나의 build 세션에 속한 모든 데이터 | 라운드 결과 + 온톨로지 산출물 | 세션 종료 후 영구 보존 (wip, deltas는 완료 시 삭제) |
| `learnings/` | 프로젝트 수준 학습 축적 | 에이전트별 학습 파일 | 세션 횡단, 프로젝트 수명과 동일 |

**round 번호 체계**: review는 `round1`(1-indexed), build는 `round0`(0-indexed). review의 round1은 "첫 번째 독립 검증 라운드"를 의미하고, build의 round0은 "초기 탐색 라운드(Phase 0에서 시작)"를 의미합니다.

**세션 메타데이터**: 각 프로세스의 최종 산출물에 YAML 형식으로 메타데이터를 포함합니다.
- review: `philosopher_synthesis.md`의 YAML frontmatter (`---` 블록)
- build: `raw.yml`의 `meta:` 키 (기존 방식 유지)

review frontmatter 형식:
```yaml
---
session_id: "{세션 ID}"
process: review
target: "{리뷰 대상 요약}"
domain: "{domain / 없음}"
date: "{YYYY-MM-DD}"
---
```

```
{project}/
├── .onto/                 # 런타임 데이터 (gitignored)
│   ├── review/{session-id}/      #   review 세션 (라운드 결과 + 산출물 통합)
│   │   ├── round1/               #     검증 에이전트 결과 ({agent-id}.md)
│   │   └── philosopher_synthesis.md  # Philosopher 종합 판정
│   ├── builds/{session-id}/      #   build 세션 (라운드 결과 + 산출물 통합)
│   │   ├── round0~N/             #     라운드별 에이전트 결과 ({agent-id}.yml)
│   │   ├── schema.yml            #     온톨로지 구조 정의
│   │   ├── context_brief.yml     #     build 맥락 요약
│   │   ├── wip.yml               #     진행 중 온톨로지 (완료 시 삭제)
│   │   ├── deltas/               #     Explorer의 delta 원문 (완료 시 삭제)
│   │   ├── _repos/               #     분석 대상 레포 클론 (외부 URL 시)
│   │   └── raw.yml               #     완성된 온톨로지
│   └── learnings/                #   프로젝트 수준 학습 ({agent-id}.md)
```

### 8.3 글로벌 저장소 (사용자 홈 디렉토리)

```
~/.onto/
├── communication/            # 소통 학습
│   ├── common.md             #   전체 에이전트 공통
│   └── {agent-id}.md         #   에이전트별 개별
├── methodology/              # 방법론 학습
│   └── {agent-id}.md         #   에이전트별 (도메인 무관)
└── domains/{domain}/         # 도메인별 저장소
    ├── domain_scope.md       #   범위 정의
    ├── concepts.md           #   핵심 개념
    ├── competency_qs.md      #   역량 질문
    ├── logic_rules.md        #   논리 규칙
    ├── structure_spec.md     #   구조 규격
    ├── dependency_rules.md   #   의존 규칙
    ├── extension_cases.md    #   확장 시나리오
    └── learnings/            #   글로벌 도메인 학습
        └── {agent-id}.md
```

---

## 9. 알려진 제약과 해결 방안

### Issue 1-A: team lead의 컨텍스트 포화

**문제**: 전체 에이전트의 리뷰 원문(약 64,500자)이 team lead의 컨텍스트에 한꺼번에 유입되면, LLM이 일부 메시지만 인식합니다. 실제로 검증 에이전트 중 3인의 결과만 인식된 사례가 있습니다.

**원인**: Agent Teams의 메시지 전달(transport)은 성공했으나, team lead LLM이 컨텍스트 한계로 모든 메시지를 처리하지 못함.

**해결**: 파일 기반 전달. 검증 에이전트가 결과를 파일로 저장하고, team lead에게는 파일 경로(약 500자)만 보고합니다. Philosopher가 파일을 직접 읽어 원문을 처리합니다. 이렇게 하면 team lead 컨텍스트에 원문이 적재되지 않고, "원문 그대로 전달" 규칙도 구조적으로 보장됩니다.

### Issue 1-B: 세션 간 에이전트 누수

**문제**: team_name이 고정(`onto`)이었을 때, 다른 세션에서 생성된 에이전트가 현재 세션의 team lead에게 메시지를 보내는 현상. 다른 프로젝트의 리뷰 내용이 현재 세션에 유입됨.

**원인**: `~/.claude/teams/onto/` 디렉토리가 파일 시스템에 공유되어, 같은 team_name을 사용하는 팀이 여러 세션에서 동시에 존재.

**해결**: 세션 ID 기반 team_name (`onto-20260325-a3f7b2c1`). 세션마다 고유한 이름을 사용하여 격리.

---

## 10. 사용법

### 설치

```
/plugin marketplace add kangminlee-maker/onto
/plugin install onto@kangminlee-maker/onto
```

### 도메인 문서 설치 (선택)

```bash
./setup-domains.sh              # 대화형 선택
./setup-domains.sh --all        # 전체 설치
./setup-domains.sh software-engineering finance  # 특정 도메인만
```

### 프로젝트 환경 설정

```
/onto:onboard
```

### 에이전트 패널 리뷰

```
/onto:review {리뷰 대상 파일 또는 경로}
```

### 특정 관점으로 질문

```
/onto:ask-logic {질문}
/onto:ask-structure {질문}
/onto:ask-dependency {질문}
/onto:ask-semantics {질문}
/onto:ask-pragmatics {질문}
/onto:ask-evolution {질문}
/onto:ask-coverage {질문}
/onto:ask-philosopher {질문}
```

### 온톨로지 구축

```
/onto:build              # 프로젝트 전체
/onto:build src/         # 특정 디렉토리
/onto:build {GitHub URL} # 외부 레포
```

### 온톨로지 변환

```
/onto:transform .onto/builds/{세션 ID}/raw.yml
```

### 학습 승격

```
/onto:promote
```

---

## 11. 재구축 가이드

이 시스템을 백지에서 재구축할 때의 핵심 결정 순서:

### 11.1 구조적 결정

1. **에이전트 구성 결정**: 검증 축(논리, 구조, 의존성, 의미, 활용, 진화, 포괄성 등) + 메타 검증(Philosopher). 이 구성은 온톨로지 검증 이론에서 도출된 것으로, 축을 추가/제거할 수 있으나 각 축이 다른 축과 독립적이어야 합니다.

2. **프로세스 분리 결정**: review(검증)와 build(구축)는 에이전트는 같지만 실행 구조가 다릅니다. review는 1회 병렬, build는 반복 루프. 이 차이는 "입력 범위가 확정되었는가"에서 비롯됩니다.

3. **학습 3분류 결정**: 소통/방법론/도메인. 이 분류는 "이 학습이 어디에서 재사용 가능한가"에 의해 결정됩니다. 소통은 모든 도메인에서 유효, 방법론은 도메인에 무관한 원칙, 도메인은 특정 도메인/프로젝트에서만 유효.

4. **도메인 문서 보호 결정**: 에이전트가 도메인 문서를 자동 수정할 수 없게 한 이유는, 도메인 문서가 "특정 프로젝트의 학습"이 아니라 "도메인 전체의 합의된 기준"이기 때문입니다. 잘못된 학습이 기준을 오염시키면, 이후 모든 검증이 오염됩니다.

### 11.2 인프라 결정

5. **파일 기반 전달**: 에이전트 간 결과 전달 시 메시지가 아닌 파일을 사용. team lead의 컨텍스트 포화를 방지하고, 원문 보존을 구조적으로 보장.

6. **세션 ID 격리**: 각 실행마다 고유 세션 ID를 생성하여, 다른 세션의 에이전트가 현재 세션을 오염시키는 것을 방지.

7. **Fallback 체계**: Agent Teams → subagent. 실행 방식은 다르지만 목적과 출력 형식은 동일. subagent에서는 쟁점 토론이 생략됨.

### 11.3 파일 생성 순서

1. `.claude-plugin/plugin.json` — 플러그인 메타데이터
2. `process.md` — 공통 정의 (모든 프로세스의 상위 규칙)
3. `roles/` — 에이전트 역할 정의
4. `processes/` — 6개 프로세스 정의
5. `commands/` — 13개 명령어 정의 (각 명령어가 어떤 프로세스 파일을 읽고 실행할지 지정)
6. `domains/` — 도메인 기준 문서
7. `setup-domains.sh` — 도메인 문서 설치 스크립트

### 11.4 의존 관계

```
process.md ← processes/*.md ← commands/*.md
                ↑
             roles/*.md (에이전트 정의)
                ↑
          domains/*/*.md (도메인 문서, 런타임에 참조)
```

- `commands/*.md`는 해당 프로세스 파일(`processes/*.md`)과 공통 정의(`process.md`)를 읽으라는 지시를 포함
- `processes/*.md`는 `process.md`의 공통 규칙을 참조
- `roles/*.md`는 독립적이나, `process.md`의 에이전트 구성 테이블에 등록되어야 함
- `domains/*/*.md`는 런타임에 에이전트가 자기 로딩으로 읽음

---

## 12. 시스템 단계

**현재: 축적기**

학습 축적이 우선이며, 프로세스 세분화(promote 분리 등)는 실행 경험이 충분히 쌓인 성숙기에 검토합니다. promote를 1회 이상 실행한 후, 실제 마찰을 기반으로 구조 변경을 판단합니다.

---

## 13. MCP 서버 외부화 설계 (미구현)

> **상태**: 설계 문서. 구현 시작 전.
> **동기**: onto를 Codex, Cursor 등 Claude Code 외의 MCP 호환 호스트에서도 사용 가능하게 만들기.
> **참고 모델**: Ouroboros 플러그인의 MCP 서버 아키텍처.

### 13.1 현재 구조의 플랫폼 종속성

현재 onto는 오케스트레이션(에이전트 생성, 병렬 실행, 메시지 라우팅)을 **호스트(Claude Code)**에 의존합니다:

| 기능 | 사용하는 호스트 기능 |
|---|---|
| 에이전트 병렬 실행 | Agent Teams (TeamCreate) 또는 Agent tool |
| 에이전트 간 통신 | SendMessage |
| 에이전트 자기 로딩 | teammate가 Read 도구로 파일 직접 읽기 |
| 학습 저장 | teammate가 Write 도구로 파일 직접 쓰기 |

이 기능들은 Claude Code 전용이므로, 다른 플랫폼(Codex, Cursor 등)에서는 작동하지 않습니다.

### 13.2 설계 원칙: 오케스트레이션 소유권 이전

**핵심 변경**: 오케스트레이션을 호스트에서 MCP 서버로 이전합니다.

```
[현재]
호스트(Claude Code)가 오케스트레이션 소유
  → TeamCreate, Agent tool, SendMessage로 에이전트 관리
  → 호스트 없으면 작동 불가

[변경 후]
MCP 서버가 오케스트레이션 소유
  → 서버가 직접 LLM API 호출하여 에이전트 실행
  → 서버 내부에서 병렬 실행, 메시지 라우팅, 학습 저장
  → 호스트는 stateless 클라이언트 (MCP tool만 호출)
```

### 13.3 아키텍처

```
[호스트: Claude Code / Codex / Cursor]     ← stateless
         ↓ JSON-RPC over stdio (MCP 프로토콜)
[onto MCP 서버]                     ← stateful
  ├─ 에이전트 실행 엔진
  │   ├─ 에이전트 병렬 실행 (async)
  │   ├─ 에이전트 간 메시지 라우팅
  │   └─ LLM API 직접 호출 (Claude API / OpenAI API)
  ├─ 세션 관리
  │   └─ {project}/.onto/{프로세스}/{세션 ID}/
  ├─ 학습 저장 체계
  │   └─ ~/.onto/ (기존 구조 유지)
  └─ 도메인 문서 관리
      └─ ~/.onto/domains/{domain}/
```

### 13.4 MCP Tool 설계

호스트에 노출되는 도구:

| Tool | 입력 | 출력 | 설명 |
|---|---|---|---|
| `onto_review_start` | target, domain, purpose | session_id | 에이전트 패널 리뷰 시작 (non-blocking) |
| `onto_review_status` | session_id | 진행 상황 (단계, 완료 에이전트 수) | 폴링용 |
| `onto_review_result` | session_id | 최종 리뷰 결과 전문 | 완료 후 결과 수신 |
| `onto_question` | dimension, question, domain | 답변 | 개별 에이전트 질문 (blocking) |
| `onto_build_start` | path_or_url, schema | session_id | 온톨로지 구축 시작 |
| `onto_build_status` | session_id | 진행 상황 (라운드, 커버리지) | 폴링용 |
| `onto_build_result` | session_id | 온톨로지 결과 | 완료 후 결과 수신 |
| `onto_session_list` | — | 세션 목록 | 활성/완료 세션 조회 |

**non-blocking 패턴** (Ouroboros와 동일):
```
호스트: onto_review_start(target="process.md") → session_id
호스트: onto_review_status(session_id) → "Round 1: 5/7 완료"
호스트: onto_review_status(session_id) → "Philosopher 종합 중"
호스트: onto_review_result(session_id) → 최종 결과
```

### 13.5 서버가 LLM을 직접 호출

현재 onto에서 호스트의 Agent tool이 하는 일을, MCP 서버가 직접 수행합니다:

```
[현재]
호스트 → Agent tool(prompt="당신은 onto_logic입니다...") → Claude Code 내부 LLM 호출

[MCP 서버]
서버 → Claude API / OpenAI API (직접 호출)
     → 에이전트 역할 prompt + 리뷰 대상 + 도메인 문서를 조합
     → 검증 에이전트 async 병렬 호출
     → 결과를 세션 디렉토리에 저장
     → Philosopher에게 검증 에이전트 결과 전달 (서버 내부)
```

이로써:
- **Claude API 사용 시**: 현재와 동일한 품질
- **OpenAI API 사용 시**: 모델 선택의 자유
- **호스트가 무엇이든 상관없음**: MCP 지원만 하면 됨

### 13.6 부수 효과: 기존 문제의 구조적 해소

| 기존 문제 | MCP 서버에서의 상태 |
|---|---|
| **Issue 1-A** (team-lead 컨텍스트 포화) | 해소됨. 서버가 에이전트 결과를 직접 관리하므로 호스트 컨텍스트에 적재되지 않음 |
| **Issue 1-B** (세션 간 에이전트 누수) | 해소됨. 서버가 세션을 격리 관리. ~/.claude/teams/ 미사용 |
| 파일 기반 전달의 복잡성 | 해소됨. 서버 내부 메모리에서 전달. 파일은 결과 보존용으로만 사용 |
| Fallback 분기 (Teams → Agent tool) | 해소됨. 서버가 단일 실행 경로를 소유 |

### 13.7 트레이드오프

**얻는 것:**
- 플랫폼 독립 (MCP 지원 호스트 전부)
- 호스트 컨텍스트 포화 근본 해결
- 실행 경로 단순화 (Teams/Agent tool/Fallback 분기 제거)
- 모델 선택의 자유 (Claude, OpenAI, 기타)

**비용:**
- MCP 서버 구현 필요 (Python 또는 TypeScript)
- 사용자가 LLM API 키를 별도 설정해야 함
- process.md/review.md의 프로세스 로직을 실행 가능한 코드로 번역해야 함
- 배포 복잡도 증가 (플러그인 + MCP 서버)
- 디버깅 난이도 증가 (서버 로그 확인 필요)

### 13.8 현재 플러그인과의 공존

MCP 서버 전환 후에도, 현재 플러그인 구조(commands/, roles/, processes/)는 유지합니다:

- **commands/*.md**: MCP 서버가 없는 환경에서의 fallback으로 유지 (기존 Claude Code 전용 모드)
- **roles/*.md**: MCP 서버가 에이전트 prompt를 조합할 때 참조
- **processes/*.md**: MCP 서버의 오케스트레이션 로직의 원본 정의 (코드와 문서 이중 유지)
- **domains/**: 기존 도메인 문서 설치 스크립트 유지

### 13.9 구현 단계 (계획)

| 단계 | 범위 | 설명 |
|---|---|---|
| **1단계** | 개별 질문 | `onto_question` tool 구현. 단일 에이전트 호출만으로 가장 단순 |
| **2단계** | 에이전트 패널 리뷰 | `onto_review_start/status/result` 구현. 핵심 가치 |
| **3단계** | 학습 체계 | 학습 저장/로딩을 서버가 관리 |
| **4단계** | build 프로세스 | 적분형 탐색 루프를 서버가 관리 |

각 단계는 기존 플러그인 모드와 병행 운영 가능합니다. MCP 서버가 설정되어 있으면 서버 모드, 없으면 기존 플러그인 모드로 동작합니다.
