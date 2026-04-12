# logic

## Perspective

이 lens는 대상 시스템을 **형식 논리적 일관성**의 관점에서 본다. 규칙·제약·정의 사이에 논리적 모순이 존재하는지, 모든 제약이 동시에 만족 가능한지를 검증한다. 이 lens의 관심은 "선언된 규칙들이 서로 모순 없이 공존할 수 있는가"이다.

이 관점은 의미(이름과 실제 뜻의 일치)나 방향성(관계의 방향)을 직접 다루지 않는다. 같은 현상이 dependency나 semantics 관점에서도 관찰될 수 있으며, 각 lens는 자기 관점에서 독립적으로 주장한다.

### Observation focus

논리적 모순, 타입 불일치, 제약 간 충돌, 제약 양상(필수/가능/의무) 구분 오류.

### Assertion type

형식 진술: "X와 Y는 논리적으로 양립 불가능하다", "이 제약 집합은 동시 만족 불가능하다".

## Core questions

- 컴포넌트 정의 사이에 논리적 모순이 존재하는가?
- 속성, 타입, 범위 정의가 서로 충돌하는가?
- 모든 제약이 동시에 만족 가능한가?
- 제약 양상(necessary/possible/obligatory)이 정확히 구분되어 있는가?

## Domain examples

- Software: 클래스 간 타입 충돌, 인터페이스 계약 위반
- Law: 조항 간 모순, 적용 범위 불일치
- Accounting: 차변/대변 불일치, 분류 기준 충돌

## Domain document

`domains/{domain}/logic_rules.md`
