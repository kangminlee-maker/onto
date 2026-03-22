# Ontology Domain — 개념 사전 및 해석 규칙

## 기본 구성 요소 용어

- Class = 클래스 → 동일 특성을 공유하는 개체의 집합. 온톨로지에서 개념(concept)을 형식적으로 표현
- Instance = 인스턴스 → 클래스에 속하는 개별 개체. Individual이라고도 함
- Property = 속성 → 개체의 특성을 기술. Object Property(개체 간 관계)와 Data Property(개체의 데이터 값)로 구분
- Relation = 관계 → 두 개체 사이의 의미적 연결. 방향, 다중성(cardinality), 역관계를 가짐
- Axiom = 공리 → 온톨로지에서 참으로 선언하는 명제. 추론의 기반

## 관계 유형 용어

- is-a (subclass-of) = 상위/하위 분류 관계 → 하위 클래스가 상위 클래스의 모든 특성을 상속
- part-of (mereological) = 부분-전체 관계 → 전체와 부분의 구성 관계. 이행적(transitive)일 수도 아닐 수도 있음
- has-property = 속성 보유 관계 → 개체가 특정 속성 값을 가짐
- depends-on = 의존 관계 → 한 개체의 존재나 정의가 다른 개체에 의존
- equivalent-to = 동일성 관계 → 두 클래스 또는 속성이 의미적으로 동일
- disjoint-with = 배타 관계 → 두 클래스가 공통 인스턴스를 가질 수 없음

## 제약 관련 용어

- Domain = 도메인(정의역) → 속성이 적용되는 주체 클래스. "이 속성은 어떤 클래스의 개체에 적용되는가"
- Range = 레인지(치역) → 속성의 값이 될 수 있는 클래스 또는 데이터 타입. "이 속성의 값은 무엇이 될 수 있는가"
- Cardinality = 기수 제약 → 관계에 참여하는 개체의 수 제한. min, max, exact
- Closure Axiom = 폐쇄 공리 → 명시된 것만 참이라는 제약. Open World Assumption의 반대
- Disjoint Union = 배타적 합집합 → 하위 클래스들이 상호 배타적이고 상위 클래스를 완전히 분할

## 온톨로지 설계 용어

- TBox = 용어 상자 → 클래스와 속성의 정의 집합. 스키마에 해당
- ABox = 단언 상자 → 인스턴스와 그 관계의 집합. 데이터에 해당
- Open World Assumption (OWA) = 개방 세계 가정 → 명시되지 않은 것은 거짓이 아니라 미지(unknown). OWL의 기본 가정
- Closed World Assumption (CWA) = 폐쇄 세계 가정 → 명시되지 않은 것은 거짓. 데이터베이스의 기본 가정
- Reasoner = 추론기 → 공리에 기반하여 암묵적 지식을 도출하는 소프트웨어. 일관성 검사, 분류 추론 수행
- Ontology Alignment = 온톨로지 정렬 → 서로 다른 온톨로지의 개념을 대응시키는 작업

## 버전 관리 용어

- Deprecation = 폐기 예고 → 개념/관계를 유지하되 향후 제거를 예고. 대체 개념 명시 필요
- Backward Compatible = 하위 호환 → 기존 인스턴스와 질의가 수정 없이 동작
- Breaking Change = 파괴적 변경 → 기존 인스턴스 또는 질의를 깨뜨리는 변경 (클래스 삭제, 제약 강화 등)

## 주의가 필요한 동형이의어

- "property": OWL Object Property(개체 간 관계) ≠ OWL Data Property(데이터 값) ≠ 프로그래밍 속성(field/attribute)
- "class": 온톨로지 클래스(개념 집합) ≠ 프로그래밍 클래스(코드 구조)
- "instance": 온톨로지 인스턴스(개별 개체) ≠ 프로그래밍 인스턴스(객체)
- "domain": 온톨로지 도메인(속성의 정의역) ≠ 비즈니스 도메인(업무 영역) ≠ DDD의 도메인
- "type": 온톨로지 타입(rdf:type, 클래스 소속) ≠ 프로그래밍 타입(데이터 타입)
- "schema": 온톨로지 스키마(TBox) ≠ DB 스키마 ≠ JSON Schema ≠ Schema.org
- "constraint": 온톨로지 제약(공리/SHACL) ≠ DB 제약(CHECK, FOREIGN KEY) ≠ 비즈니스 규칙

## 해석 원칙

- 온톨로지의 목적은 "세상의 모든 것을 표현"이 아니라 "특정 범위 내에서 일관된 의미 체계를 제공"하는 것이다. 범위 없는 온톨로지는 완성될 수 없다
- OWL의 Open World Assumption과 데이터베이스의 Closed World Assumption은 동일 데이터에 대해 다른 추론 결과를 낳는다. 가정의 차이를 명시하지 않으면 검증 결과가 모호해진다
- "클래스가 존재한다"와 "클래스가 올바르게 정의되었다"는 같지 않다. 클래스에 속성/제약/관계가 없으면 이름만 있는 빈 껍데기
- 형식적 표현(OWL, SHACL)과 자연어 정의는 별도 검증이 필요하다. 형식적으로 올바른 공리가 의도와 다를 수 있다
- 분류 기준이 혼합되면(예: 기능별 + 구조별을 같은 계층에서) 교차 분류가 발생하여 분류 체계가 불완전해진다

## 관련 문서
- domain_scope.md — 이 용어들이 사용되는 영역 정의
- logic_rules.md — 공리, 추론, 제약 관련 규칙
- structure_spec.md — 온톨로지 구조 설계 규칙
