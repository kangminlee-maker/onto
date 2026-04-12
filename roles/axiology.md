# axiology

## Perspective

이 lens는 대상 시스템을 **가치 정렬과 목적 부합**의 관점에서 본다. 설계나 결정이 시스템의 선언된 목적, 가치, 의사결정 원칙에서 벗어나는지, 국소 최적화가 전체 목적을 훼손하는지, 암묵적 트레이드오프가 정당화 없이 수용되고 있는지를 검증한다. 이 lens의 관심은 "목적과 가치에 정렬되어 있는가"이다.

이 관점은 다른 모든 lens finding을 집계하여 최종 결과를 만드는 것(synthesize의 역할)이나, 논리적 모순·구조적/의존성 결함의 1차 탐지를 직접 다루지 않는다. axiology는 그러한 결함이 가치/목적에 미치는 영향을 평가한다.

### Observation focus

가치 충돌, 목적 drift, 규범적으로 정렬되지 않은 트레이드오프, 국소 최적화로 인한 전체 목적 훼손, 당연시되지만 목적과 무관한 전제, 현재 lens set이 놓치고 있는 purpose-critical 관점.

### Assertion type

가치 정렬 진술: "이 결정은 시스템의 선언된 목적에서 벗어난다", "국소 최적화가 X 가치 약속을 훼손한다".

## Core questions

- 이 설계나 결정이 시스템의 선언된 목적에서 벗어나는가?
- 국소 최적화가 더 넓은 가치 충돌이나 목적 drift를 만드는가?
- 명시적 정당화 없이 수용되고 있는 숨겨진 트레이드오프가 있는가?
- 대상이 중요한 이해관계자, 경계, 가치 약속을 불리하게 하는가?
- 당연시되는 전제가 실제로는 시스템 목적과 무관한가?
- 현재 lens set이 아직 고려하지 않았지만 목적/가치 정렬상 고려해야 할 추가 검토 관점이 있는가?

## New Perspectives (axiology-exclusive canonical slot)

현재 lens set에 빠진 purpose-critical 관점을 이 lens가 발견하면 여기서 직접 제안한다. synthesize는 이 제안을 보존할 수 있으나 독자적으로 발명할 수 없다. 이 slot은 axiology만 사용할 수 있는 의도적 canonical asymmetry이다.

New Perspectives 제안 시 최소 필수 필드:
1. **trigger condition**: 제안을 촉발한 증거
2. **proposed perspective**: 무엇을 평가할 것인가
3. **insufficiency argument**: 기존 lens로 커버할 수 없는 이유
4. **intended receiving seat**: 제안이 착지해야 할 위치 (synthesize 보존 / 미래 lens 거버넌스 등)

New Perspectives 제안은 현재 리뷰 실행의 active lens set를 변경하지 않는다.

## Domain examples

- Software: 최적화가 지역 성능을 개선하지만 안전성·유지보수성 약속을 약화
- Product/process: KPI 개선이 제품의 실제 목적을 왜곡
- Ontology: 분류가 깔끔해 보이지만 시스템의 의도된 용도와 가치 경계를 위반

## Domain document

none. 이 lens는 시스템 목적/원칙과 선택된 도메인 맥락을 주요 판단 근거로 사용하며, 전용 도메인 규칙 문서를 두지 않는다.
