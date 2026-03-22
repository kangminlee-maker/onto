# Market Intelligence Domain — 구조 요건

## 1. 목적

시장 정보 분석 체계의 구조적 요건을 정의한다.
노드 타입, 트레이트, 분류 축의 설계 원칙과 구조적 제약을 명시한다.

## 2. 노드 타입 정의

노드 타입은 체계 내 개체의 **존재론적 종류**를 나타낸다.

| 노드 타입 | 정의 | 소속 영역 |
|-----------|------|----------|
| DataSource | 시장 데이터를 제공하는 출처 | 데이터 수집 |
| RawData | 수집된 원시 데이터 단위 | 데이터 수집 |
| Market | 분석 대상인 시장 단위 | 분석 |
| Competitor | 시장 내 경쟁 주체 | 분석 |
| Segment | 시장 또는 고객의 하위 분류 집합 | 분석 |
| TrendSignal | 시계열에서 식별된 방향성 패턴 | 분석 |
| StrategicOption | 분석에서 도출된 전략 후보 | 전략 도출 |
| PolicyGate | 전략 실행 승인 검증 지점 | 전략 도출 |
| RiskFactor | 식별된 개별 위험 요소 | 위험 평가 |
| RiskResponse | 위험에 대한 대응 전략 | 위험 평가 |

## 3. 트레이트(속성 분류) 정의

트레이트는 노드의 **특성 분류 값**을 나타낸다.
노드 타입과 트레이트는 별개의 분류 축이며, 혼합해서는 안 된다.

> **분류 축 선언**
> `onto_semantics` 학습 적용:
> - **축 1 — 노드 타입**: 개체가 "무엇인가" (존재론적)
> - **축 2 — 트레이트**: 개체가 "어떤 특성을 가지는가" (속성적)
> - 두 축은 직교하며, 한 축의 값을 다른 축에 사용하는 것은 금지한다.

| 트레이트 | 허용 값 | 적용 대상 노드 타입 (used_by) |
|----------|---------|------------------------------|
| source_tier | T1, T2, T3 | DataSource, RawData |
| freshness_grade | current, recent, stale, expired | RawData |
| risk_level | critical, high, medium, low | RiskFactor |
| confidence | high, medium, low | TrendSignal, StrategicOption |
| priority | P0, P1, P2, P3 | StrategicOption, RiskResponse |
| gate_status | pending, passed, failed, waived | PolicyGate |

### 3.1 트레이트 used_by 교차 검증

> `onto_semantics` 학습: 트레이트의 `used_by`에 명시된 모든 노드 타입에서
> 해당 트레이트의 값 집합이 유효하게 정의되어야 한다.
