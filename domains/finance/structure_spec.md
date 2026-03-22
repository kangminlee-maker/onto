# Finance Domain — 온톨로지 구조 명세

## 분류 축

| 축 | 값 | 설명 |
|---|---|---|
| 노드 유형 | Entity / Statement / Fact / Concept / Period / Note / Policy / Segment | 온톨로지 구성 요소 |
| 관계 방향 | 상향(귀속) / 하향(구성) / 수평(참조) | 엣지 방향 의미 |

## 필수 노드 유형 (8개)

| 유형 | 설명 | 예시 |
|---|---|---|
| Entity | 보고 주체 (법인) | 특정 상장기업 (종목코드 등으로 식별) |
| Statement | 재무제표 유형 | 연결재무상태표, 별도손익계산서 |
| FinancialFact | 개별 재무 수치 | 특정 회사의 특정 연도 매출액 (연결) |
| Concept | 계정과목 (택소노미 요소) | ifrs:Revenue, 기업별 확장 계정 |
| Period | 보고 기간 | 특정 회계연도 기간, 특정 보고 시점 |
| Note | 주석 정보 | 우발부채 상세, 회계정책 설명 |
| Policy | 회계정책 선택 | 재고자산: 선입선출법 |
| Segment | 사업부문 | 특정 사업부문 (기업별 정의) |

> Segment 노드는 대규모 기업에서 필수적이나, 세그먼트 라벨이 기업별 확장 계정이므로 Concept 노드와의 매핑이 선행되어야 한다.

## 필수 관계

### FinancialFact 관계 (4개)

| 관계 | 시작 노드 | 종료 노드 | 카디널리티 | 설명 |
|---|---|---|---|---|
| REPORTED_BY | FinancialFact | Entity | N:1 | 어떤 기업이 보고했는가 |
| BELONGS_TO | FinancialFact | Statement | N:1 | 어떤 재무제표에 속하는가 |
| HAS_CONCEPT | FinancialFact | Concept | N:1 | 어떤 계정과목인가 |
| IN_PERIOD | FinancialFact | Period | N:1 | 어떤 기간/시점인가 |

### Note 관계 (2개)

| 관계 | 시작 노드 | 종료 노드 | 카디널리티 | 설명 |
|---|---|---|---|---|
| ANNOTATES | Note | FinancialFact | N:M | 어떤 재무 수치를 설명하는가 |
| DISCLOSES_POLICY | Note | Policy | 1:N | 어떤 회계정책을 공시하는가 |

### Segment 관계

| 관계 | 시작 노드 | 종료 노드 | 카디널리티 | 설명 |
|---|---|---|---|---|
| IN_SEGMENT | FinancialFact | Segment | N:1 | 어떤 사업부문에 귀속되는가 (선택적) |
| PART_OF | Segment | Entity | N:1 | 어떤 기업의 사업부문인가 |

## 재무제표 완전성

하나의 Entity-Period 조합에 대해 다음 Statement가 존재해야 한다:
- 재무상태표 (필수)
- 손익계산서 (필수)
- 현금흐름표 (필수)
- 자본변동표 (필수)
- 포괄손익계산서 (필수, 손익계산서와 통합 가능)

> 금융업종의 경우 Statement 구성이 상이할 수 있다. 예: 보험업은 "보험계약부채 변동표"가 추가될 수 있다. 업종 분류 축(일반/금융)에 따라 완전성 기준이 분기된다.

## 고립 노드 금지

모든 노드는 최소 1개의 관계(엣지)를 가져야 한다.
- Entity 노드: 최소 1개의 REPORTED_BY 관계 필요
- Concept 노드: 최소 1개의 HAS_CONCEPT 관계 필요
- Period 노드: 최소 1개의 IN_PERIOD 관계 필요
- Note 노드: 최소 1개의 ANNOTATES 관계 필요

> 고립 노드가 감지되면 데이터 수집 오류 또는 매핑 누락으로 간주하고 경고를 발생시킨다.

## ID 체계

### 단일화 원칙
- 노드 ID는 원천에 관계없이 단일 체계로 통합
- ID 구성: `{EntityCode}_{PeriodKey}_{StatementType}_{ConceptID}`
- 임시 ID는 정규 ID 전환 전까지 참조 무결성 검증 대상에서 "경고" 처리

### 의미 식별자 보존
- XBRL 택소노미 요소 ID는 단순 기술 식별자가 아니라 의미 식별자(semantic identifier)
- 의미 식별자는 개념의 정의·계층·관계를 내포하므로, 자체 식별자를 새로 만들기보다 기존 요소 ID를 최대한 보존·활용

## 관련 문서

- [domain_scope.md](domain_scope.md) — 필수 개념 범주가 노드 유형으로 실현되는 관계
- [concepts.md](concepts.md) — Concept 노드의 동의어 매핑 및 확장 계정 처리
- [logic_rules.md](logic_rules.md) — 노드 간 관계에 적용되는 수학적 제약
- [dependency_rules.md](dependency_rules.md) — 관계(엣지)의 방향·비순환 규칙
- [extension_cases.md](extension_cases.md) — 새 노드 유형 추가 시나리오
