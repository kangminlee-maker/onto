# 간결성 규칙 (software-engineering)

이 문서는 onto_conciseness가 간결성 검증 시 참조하는 도메인별 규칙입니다.
간결성 판정의 **유형(허용/제거) → 검증 기준 → 역할 경계 → 측정 방법** 순으로 구성됩니다.

---

## 1. 허용되는 중복

각 규칙에 강도를 태깅합니다:
- **[MUST-ALLOW]**: 제거 시 체계가 깨지는 중복. 유지 필수.
- **[MAY-ALLOW]**: 편의상 유지하는 중복. 통합 가능하나, 통합 비용 대비 이득이 명확할 때만 제거.

### 상태 관리

- [MUST-ALLOW] 터미널 상태의 다중 정의 — 전환 이벤트, 프로젝터 분기, 후속 허용 이벤트 목록이 각각 상태를 참조. 하나라도 제거하면 상태 전환 정합성 검증 불가.
- [MUST-ALLOW] 이벤트 소싱 시스템에서 이벤트 스키마와 프로젝션 로직이 동일 도메인 사실을 다른 형식으로 표현. 이벤트는 불변 기록이므로 프로젝션과 통합 불가.

### Source of Truth 관련

- [MUST-ALLOW] Source of Truth가 외부 시스템에 있을 때, 내부에 참조용 사본(캐시, 동기화 복사본) 유지. 제거 시 외부 의존 추적 불가.
- [MAY-ALLOW] 외부 API 스키마를 내부 타입으로 재정의. 외부 변경 격리 목적이면 유지, 단순 복사이면 제거 대상.

### 계약과 인터페이스

- [MUST-ALLOW] 인터페이스 계약의 양측 재선언 — 제공자(서버)와 소비자(클라이언트)가 각각 계약을 정의. 제거 시 독립 검증 불가.
- [MAY-ALLOW] 에러 경로와 정상 경로가 동일 데이터를 다른 맥락에서 기술. 가독성 목적이면 유지, 완전 중복이면 통합 가능.

### 횡단 관심사

- [MAY-ALLOW] cross-cutting concern(보안, 로깅, 인증)이 여러 모듈에 등장. 관심사 분리 원칙(SoC) 상 허용되나, 동일 로직의 복사(copy-paste)는 제거 대상.

---

## 2. 제거 대상 패턴

각 규칙에 강도를 태깅합니다:
- **[MUST-REMOVE]**: 존재 자체가 오류를 유발하거나 잘못된 추론을 일으키는 중복.
- **[SHOULD-REMOVE]**: 해가 크지 않으나 불필요한 복잡도를 추가하는 중복.

### 관계 중복

- [MUST-REMOVE] 동일 관계의 다중 경로 표현 — A→B와 A→C→B가 동일 의미일 때, 하나의 경로만 유지. 양쪽 유지 시 갱신 누락으로 불일치 발생.
- [MUST-REMOVE] 상위 제약이 이미 보장하는 하위 재선언 — 상위 인터페이스가 null 불가를 보장하면, 하위 구현에서 재선언 불필요.

### 분류 중복

- [SHOULD-REMOVE] 자식이 1개뿐인 중간 계층 노드 — 분류 의미가 없으므로 상위와 병합.
- [SHOULD-REMOVE] 인스턴스가 존재하지 않는 분류 노드 — 실제 데이터가 없는 빈 분류는 제거. 단, 향후 확장을 위한 예약(extension_cases.md 참조)이면 유지.

### 정의 중복

- [MUST-REMOVE] 동일 개념을 다른 경로/이름으로 중복 정의 — concepts.md의 동의어 매핑을 기준으로 판별.
- [SHOULD-REMOVE] 동일 검증 로직이 여러 모듈에 복사 — 공통 모듈로 추출 필요.

---

## 3. 최소 세분화 기준

하위 분류는 아래 중 **하나 이상**을 충족해야 허용됩니다. 하나도 충족하지 않으면 상위와 병합합니다.

1. **역량 질문 차이**: competency_qs.md의 질문에 대해 다른 답을 생성하는가?
2. **제약 조건 차이**: 다른 제약 조건(cardinality, 타입, 범위)이 적용되는가?
3. **의존 관계 차이**: 다른 모듈/시스템에 의존하거나, 다른 모듈/시스템이 의존하는가?

예시:
- `HttpError`와 `ValidationError`는 다른 제약(HTTP 상태 코드 vs 필드 목록)이 적용되므로 분류 정당.
- `InternalServerError`와 `UnexpectedError`가 동일 처리 로직을 타면 병합 대상.

---

## 4. 경계 — 도메인 특화 적용 사례

경계 정의의 정본은 `roles/onto_conciseness.md`입니다. 이 섹션은 software-engineering 도메인에서의 구체적 적용 사례만 기술합니다.

### onto_pragmatics 경계

- onto_conciseness: 불필요한 요소가 **존재**하는가 (구조 수준)
- onto_pragmatics: 불필요한 정보가 질의 실행을 **방해**하는가 (실행 수준)
- 예: API 응답에 미사용 필드 포함 → onto_pragmatics. 미사용 엔티티가 스키마에 정의됨 → onto_conciseness.

### onto_coverage 경계

- onto_conciseness: 없어야 할 것이 있는가 (축소 방향)
- onto_coverage: 있어야 할 것이 없는가 (확장 방향)
- 예: 보안/인증은 있으나 인가 체계 미정의 → onto_coverage. 인증과 인가가 동일 모듈에 중복 정의 → onto_conciseness.

### onto_logic 경계 (선행/후행 관계)

- onto_logic 선행: 논리적 동치(함의) 여부를 판별
- onto_conciseness 후행: 동치 확인 후 제거 여부를 판단
- 예: 상위 인터페이스의 제약이 하위 구현의 제약을 함의 → onto_logic이 동치 판별 → onto_conciseness가 "하위 재선언 불필요" 판정.

### onto_semantics 경계 (선행/후행 관계)

- onto_semantics 선행: 의미 동일성(동의어 여부)을 판별
- onto_conciseness 후행: 동의어 확인 후 병합 필요성을 판단
- 예: user/account/member가 동일 개념 → onto_semantics가 동의어 판별 → onto_conciseness가 "하나의 정규 용어로 통합" 판정.

---

## 5. 정량 기준

도메인에서 관찰된 임계값이 축적되면 기록합니다.

- (아직 정의되지 않음 — 리뷰를 통해 축적됩니다)

---

## 관련 문서

- `concepts.md` — 용어 정의, 동의어 매핑, 동형이의어 목록 (중복 판별의 의미 기준)
- `structure_spec.md` — 고립 노드 규칙, 필수 관계 요건 (구조적 관점의 제거 기준)
- `competency_qs.md` — 역량 질문 목록 (최소 세분화의 "실제 차이" 판단 기준)
- `dependency_rules.md` — Source of Truth 관리 규칙 (참조 사본 허용 근거)
- `logic_rules.md` — 제약 상충 검사 규칙 (논리적 동치 판별 기준)
