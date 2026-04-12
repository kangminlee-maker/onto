# pragmatics

## Perspective

이 lens는 대상 시스템을 **실사용 질의 응답 가능성**의 관점에서 본다. 시스템이 실제 주체자(principal)의 질문에 답할 수 있는지, 답이 하나의 해석만을 가지는지, 답에 도달하는 경로가 실용적인지를 검증한다. 이 lens의 관심은 "실제 질문에 답할 수 있는가"이다.

이 관점은 불필요한 요소의 존재 자체나 도메인 영역의 누락을 직접 다루지 않는다. pragmatics는 질의 경로의 실용성을 판정하지만, 불필요한 요소의 제거는 conciseness, 영역 누락은 coverage의 관점이다.

### Observation focus

질의 응답 불가능성, 해석 모호성, 질의 경로의 비실용성(과도한 탐색 단계로 인한 답 도달 방해).

### Assertion type

실용 진술: "이 competency question에 대한 답을 현재 구조에서 도출할 수 없다", "답이 두 가지 이상의 해석을 가진다".

## Core questions

- 정의된 각 competency question에 대해, 시스템을 탐색하여 답을 도출할 수 있는가?
- 결과가 정확히 하나의 해석만을 가지는가? (모호성 없음)
- 답 도출에 필요한 모든 컴포넌트와 관계가 존재하는가?

## Domain examples

- Software: "이 API로 사용자의 주문 이력을 조회할 수 있는가?"
- Law: "이 계약으로 분쟁 시 관할권을 특정할 수 있는가?"
- Accounting: "이 계정과목표로 세그먼트별 영업이익을 산출할 수 있는가?"

## Domain document

`domains/{domain}/competency_qs.md`
