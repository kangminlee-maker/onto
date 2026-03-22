# Finance Domain — 의존성 규칙

## 분류 축

| 축 | 값 | 설명 |
|---|---|---|
| 규칙 유형 | 비순환 / 방향 / 다이아몬드 / 참조무결성 | 의존성 제약의 성격 |
| 적용 범위 | 노드 내 / 노드 간 / 원천 간 | 제약이 적용되는 범위 |
| 위반 처리 | 차단 / 경고 / 자동보정 | 위반 시 시스템 동작 |

## 비순환 규칙 (필수 3개)

| ID | 규칙 | 설명 | 위반 처리 |
|---|---|---|---|
| AC01 | Entity → Statement → FinancialFact 경로에 순환 금지 | 보고 주체에서 재무 수치까지 단방향 | 차단 |
| AC02 | Concept 계층에 순환 금지 | 상위 계정 → 하위 계정 계층 구조 | 차단 |
| AC03 | Note → FinancialFact 참조에 순환 금지 | 주석이 본문을 참조하되, 본문이 주석을 역참조하지 않음 | 차단 |

## 방향 규칙 (6개)

| ID | 관계 | 허용 방향 | 금지 방향 | 위반 처리 |
|---|---|---|---|---|
| DR01 | REPORTED_BY | Fact → Entity | Entity → Fact | 차단 |
| DR02 | BELONGS_TO | Fact → Statement | Statement → Fact | 차단 |
| DR03 | HAS_CONCEPT | Fact → Concept | Concept → Fact | 차단 |
| DR04 | IN_PERIOD | Fact → Period | Period → Fact | 차단 |
| DR05 | ANNOTATES | Note → Fact | Fact → Note | 차단 |
| DR06 | IS_CHILD_OF | 하위 Concept → 상위 Concept | 상위 → 하위 (이 방향은 HAS_CHILD로 별도 정의 가능) | 경고 |

## 다이아몬드 규칙 (3개)

| ID | 상황 | 허용 여부 | 설명 |
|---|---|---|---|
| DM01 | 동일 Fact가 복수 Statement에 소속 | **허용** | 현금및현금성자산은 재무상태표·현금흐름표 양쪽에 출현 |
| DM02 | 동일 Concept이 복수 Entity에 사용 | **허용** | ifrs:Revenue는 모든 기업이 공유 |
| DM03 | 동일 Fact가 복수 Period에 귀속 | **금지** | 하나의 재무 수치는 정확히 하나의 기간/시점에 귀속 |

## 참조 무결성 (3개)

| ID | 규칙 | 설명 | 위반 처리 |
|---|---|---|---|
| RI01 | FinancialFact의 HAS_CONCEPT 대상 Concept이 반드시 존재 | 존재하지 않는 계정과목 참조 금지 | 차단 |
| RI02 | Note의 ANNOTATES 대상 FinancialFact가 반드시 존재 | 대상 없는 주석 참조 금지 | 차단 |
| RI03 | 임시 ID는 정규 ID 전환 전까지 참조 무결성 검증 대상에서 "경고" 처리 | 비구조화 원천에서 추출한 주석의 ID 불안정성 반영 | 경고 |

> RI03은 비구조화 원천(PDF 등)에서 추출한 주석의 ID 체계가 불안정한 현실을 반영한다. 구조화 원천에서 동일 주석을 확보하면 정규 ID로 전환하고, 이후 RI02와 동일한 "차단" 수준으로 격상한다.

## 원천 간 의존성

### 진실의 원천 전환 규칙

| 우선순위 | 원천 유형 | 조건 | 설명 |
|---|---|---|---|
| 1 | 구조화 데이터 (XBRL 등) | 구조 완전·파싱 성공 | 1차 원천 — 기계 판독 가능 |
| 2 | 반구조화 데이터 (HTML 등) | 구조화 원천 불완전 또는 파싱 실패 | 2차 원천 — 파싱 필요 |
| 3 | 비구조화 데이터 (PDF 등) | 반구조화 원천 미제공 | 3차 원천 — OCR 필요 |

- 금융업종에서 구조화 원천의 구조 불일치로 인해 반구조화 원천으로의 전환이 빈번함
- 반구조화 원천이 유일 원천인 경우 단일 장애점(SPOF) 위험 존재
- 원천 전환 시 ID 체계 단일화가 선행되어야 참조 무결성 유지 가능

### 택소노미/인스턴스 분리

- 택소노미(Concept 계층 정의)와 인스턴스(실제 재무 수치)는 별도 의존성 경로
- 택소노미 변경은 Concept 노드에만 영향, 인스턴스 변경은 FinancialFact 노드에만 영향
- 양쪽이 동시에 변경되면 HAS_CONCEPT 관계의 참조 무결성 재검증 필요

## 관련 문서

- [structure_spec.md](structure_spec.md) — 의존성 규칙이 적용되는 노드·관계 구조
- [logic_rules.md](logic_rules.md) — 논리 규칙과 의존성 규칙의 상호 보완 관계
- [domain_scope.md](domain_scope.md) — 원천 형식 축 및 업종 분류 축 정의
- [concepts.md](concepts.md) — 참조 무결성의 대상인 Concept 매핑 체계
- [extension_cases.md](extension_cases.md) — 의존성 규칙 변경이 필요한 확장 시나리오
