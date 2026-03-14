# 코드 기반 온톨로지 구축 프로세스

> 코드베이스를 7인 reviewer + Philosopher가 다관점으로 분석하여 온톨로지를 구축합니다.
> 관련: 구축 후 `/onto-transform`으로 변환, `/onto-review`로 검증 가능.

코드베이스를 7인 reviewer가 다관점으로 추출하고, Philosopher가 종합합니다.
추출 결과에서 독립적으로 수렴하는 항목일수록 높은 신뢰도를 부여합니다 (귀납적 수렴 원리).

### Phase 0: Schema Negotiation

온톨로지의 구조를 사용자와 협의하여 결정합니다. **추출보다 반드시 먼저 실행**합니다.

**0.1 기존 schema 확인**
- `{project}/.claude/ontology/schema.yml`이 이미 존재하면 내용을 보여주고 재사용 여부를 확인합니다.
- 존재하지 않으면 0.2로 진행합니다.

**0.2 구조 선택지 제시**

```markdown
## 온톨로지 구조를 선택해 주세요

### A. Axiom 기반 (학술/추론)
- 구성: Class, Property, Axiom, Individual
- 특징: 논리적 추론 가능, 모순 자동 검출
- 적합: 엄밀한 도메인 모델링, 표준 준수 필요 시

### B. Action-Centric (Palantir 스타일)
- 구성: ObjectType, LinkType, ActionType, Function
- 특징: Axiom 없음, 행위 중심, 실용적
- 적합: 데이터 플랫폼, 운영 시스템

### C. Knowledge Graph
- 구성: Entity, Relation, Property
- 특징: 단순 그래프 구조, 유연함
- 적합: 검색, 추천, 데이터 연결

### D. Domain-Driven
- 구성: Aggregate, Entity, ValueObject, DomainEvent, Command
- 특징: 비즈니스 로직 경계 중심
- 적합: 마이크로서비스, 이벤트 기반 시스템

### E. 커스텀
- 위 구조를 조합하거나 직접 정의

선택지를 고르시거나, 원하는 구조를 설명해 주세요.
```

**0.3 Schema 확정 및 저장**

사용자가 선택/커스터마이징한 구조를 `{project}/.claude/ontology/schema.yml`에 저장합니다.

schema.yml 형식:
```yaml
name: {구조 이름}
version: 1
description: {이 구조를 선택한 이유 — 사용자 발언 기반}
element_types:
  - name: {요소 유형명}
    description: {이 유형이 무엇인가}
    has: [{하위 속성 목록}]
  # ... 추가 요소 유형
```

예시 (Action-Centric 선택 시):
```yaml
name: action-centric
version: 1
description: "행위 중심, 운영 시스템 모델링"
element_types:
  - name: ObjectType
    description: "도메인의 핵심 개체"
    has: [properties, linkTypes]
  - name: LinkType
    description: "ObjectType 간 관계"
    has: [direction, cardinality]
  - name: ActionType
    description: "시스템이 수행하는 행위"
    has: [input, output, sideEffects]
  - name: Function
    description: "ActionType 내부의 계산 로직"
    has: [parameters, returnType]
```

### Phase 1: 7인 병렬 추출

`process.md`의 **Agent Teams 실행 방식**을 따릅니다 (에러 처리 규칙, 구조 조율자 역할 포함).
TeamCreate로 팀(`onto-buildfromcode`)을 생성하고, 7인 reviewer + Philosopher를 teammate로 생성합니다.
초기 prompt: `process.md`의 **Teammate 초기 prompt 템플릿** 사용 (팀명: `onto-buildfromcode`).

team lead(구조 조율자)가 7인 reviewer에게 SendMessage로 추출 지시를 **개별 전달**합니다.
추출 결과를 Philosopher에게 전달할 때 **수정/요약 없이 원문 그대로** 전달합니다.

각 reviewer에게 전달할 SendMessage 내용:

```
코드베이스를 분석하여, 당신의 전문 영역 관점에서 온톨로지 요소를 추출하세요.

[온톨로지 구조 (schema)]
{schema.yml 내용}

[분석 대상 코드]
{$ARGUMENTS로 지정된 코드, 또는 프로젝트 전체의 주요 소스 파일}

[시스템 목적과 원칙]
{CLAUDE.md/README.md 내용}

[지시]
- schema에 정의된 element_types에 맞춰 추출하세요.
- 각 추출 항목에 대해: (1) 어떤 코드에서 발견했는가 (파일, 라인), (2) 왜 이 요소로 판단했는가를 명시하세요.
- 자신의 전문 영역에서 보이는 것만 추출하세요. 다른 에이전트의 관점은 추측하지 마세요.
- 확신하지 못하는 항목은 "후보"로 표기하세요.

[에이전트별 추출 초점]
- onto_structure: 개체 간 계층/관계 구조, 고립된 개체, 누락된 연결
- onto_semantics: 이름-의미 매핑, 용어 정의, 동의어/동형이의어
- onto_dependency: 의존 방향, 순환, 필수/선택 의존
- onto_logic: 제약 조건, 불변 조건, 타입 충돌, 상태 전이 규칙
- onto_pragmatics: 실제 사용 패턴, 역량 질문(이 체계로 답할 수 있는 질문), 접근 경로
- onto_evolution: 확장 지점, 변동 가능 영역, 현재 구조의 확장 한계
- onto_coverage: 도메인 하위 영역 포괄 여부, 개념 범주 편중, 표준 대비 누락 영역

[보고 형식]
YAML 형식으로 보고하세요:

```yaml
agent: {agent-id}
elements:
  - id: {요소 ID}
    type: {schema의 element_type}
    name: {이름}
    definition: {정의}
    source:
      file: {파일 경로}
      line: {라인 번호}
    confidence: high | medium | low
    rationale: {왜 이 요소로 판단했는가}
    details: {type별 상세 — properties, constraints, relations 등}
  # ...

issues:
  - description: {발견된 문제/의문점}
    severity: critical | warning | info
    rationale: {왜 문제인가}

learnings:
  communication: {소통 학습. 없으면 "없음"}
  methodology: "[{유형}] {학습 내용}. 없으면 '없음'"
  domain: "[{유형}] {학습 내용}. 없으면 '없음'"
  # {유형}: 사실 또는 판단
```
```

**대상 코드 수집 규칙**:
- $ARGUMENTS가 디렉토리인 경우: 해당 디렉토리 하위의 소스 파일을 재귀적으로 읽습니다.
- $ARGUMENTS가 파일인 경우: 해당 파일만 읽습니다.
- $ARGUMENTS가 없는 경우: 프로젝트의 주요 소스 디렉토리를 자동 탐지합니다 (src/, app/, lib/ 등).
- 바이너리, node_modules, .git, 빌드 산출물은 제외합니다.
- 파일이 너무 많으면 (50개 이상) 사용자에게 범위를 좁힐지 확인합니다.

### Phase 2: Philosopher 종합

team lead가 7인의 추출 결과를 Philosopher teammate에게 SendMessage로 전달합니다.
Philosopher가 **하나의 Raw Ontology로 통합**합니다.

**종합 규칙**:

1. **수렴도 산출**: 각 추출 항목에 대해, 몇 인의 에이전트가 독립적으로 식별했는가를 계산합니다.
   - 동일 개념: 이름이 다르더라도 같은 코드 위치를 참조하거나 의미가 동일하면 하나로 통합합니다.
   - 수렴도 = 해당 항목을 식별한 에이전트 수 / 실제 응답한 에이전트 수 (에러로 제외된 에이전트는 분모에서 제외)

2. **신뢰도 등급 부여**:
   - 확정 (5인 이상 독립 식별): 높은 신뢰도. 그대로 포함.
   - 추정 (2~4인 식별): 중간 신뢰도. 근거를 명시하여 포함.
   - 후보 (1인만 식별): 낮은 신뢰도. 별도 섹션에 분리.

3. **모순 처리**: 에이전트 간 상충하는 추출이 있으면:
   - 각 에이전트의 근거를 나란히 배치합니다.
   - 코드 설계 이슈일 가능성을 검토합니다.
   - issues 섹션에 기록합니다.

4. **통합 형식**: 아래 Raw Ontology YAML 형식으로 정리합니다.

### Phase 3: 사용자 확인

통합된 결과를 사용자에게 **요약 형태로** 제시합니다:

```markdown
## 온톨로지 구축 결과 요약

### 구조: {schema name}
### 분석 대상: {$ARGUMENTS 또는 프로젝트 전체}

---

### 확정 항목 (수렴도 5/7 이상) — N건
| # | 유형 | 이름 | 수렴도 | 요약 |
|---|---|---|---|---|
| 1 | {type} | {name} | {N}/7 | {한 줄 설명} |

### 추정 항목 (수렴도 2~4/7) — N건
| # | 유형 | 이름 | 수렴도 | 식별 에이전트 | 요약 |
|---|---|---|---|---|---|

### 후보 항목 (수렴도 1/7) — N건
| # | 유형 | 이름 | 식별 에이전트 | 포함 여부 |
|---|---|---|---|---|

### 발견된 이슈 — N건
| # | 심각도 | 설명 |
|---|---|---|

---

- 후보 항목 중 포함/제외할 것이 있으면 알려주세요.
- 이슈에 대한 판단이 필요한 것이 있으면 알려주세요.
- 없으면 "확정"이라고 답해주세요.
```

### Phase 4: 저장

사용자가 확인하면 Raw Ontology를 저장합니다.

**저장 파일**: `{project}/.claude/ontology/raw.yml`

Raw Ontology YAML 형식:

```yaml
# Raw Ontology — 자동 생성됨
# 이 파일은 /onto-buildfromcode에 의해 생성되었습니다.
# 변환: /onto-transform 으로 원하는 형식으로 변환할 수 있습니다.

meta:
  schema: ./schema.yml
  domain: {domain}
  source: {분석 대상 경로}
  date: {날짜}
  agents: [onto_logic, onto_structure, onto_dependency, onto_semantics, onto_pragmatics, onto_evolution, onto_coverage]

elements:
  - id: {요소 ID}
    type: {schema의 element_type}
    name: {이름}
    definition: {정의}
    confidence: confirmed | estimated | candidate
    convergence:
      score: {N}/7
      agents:
        {agent-id}: {해당 에이전트의 근거 — 1문장}
        # ... 식별한 에이전트만 포함
    source:
      file: {파일 경로}
      line: {라인 번호}
    details:
      # type별 상세 내용
      # ObjectType이면: properties, linkTypes
      # ActionType이면: input, output, sideEffects
      # Class이면: properties, axioms
      # ... schema에 따라 달라짐
  # ... 모든 요소

relations:
  - id: {관계 ID}
    from: {요소 ID}
    to: {요소 ID}
    type: {관계 유형}
    direction: {forward | backward | bidirectional}
    convergence:
      score: {N}/7
      agents:
        {agent-id}: {근거}
    source:
      file: {파일 경로}
      line: {라인 번호}
  # ... 모든 관계

constraints:
  - id: {제약 ID}
    applies_to: {요소 ID 또는 관계 ID}
    description: {제약 내용}
    convergence:
      score: {N}/7
      agents:
        {agent-id}: {근거}
    source:
      file: {파일 경로}
      line: {라인 번호}
  # ... 모든 제약

issues:
  - id: {이슈 ID}
    severity: critical | warning | info
    description: {이슈 설명}
    reported_by: [{agent-id 목록}]
    rationale: {왜 이슈인가}
  # ... 모든 이슈
```

**schema.yml이 없으면** `.claude/ontology/` 디렉토리와 함께 생성합니다.
**raw.yml이 이미 존재하면** 덮어쓰기 전에 사용자에게 확인합니다.

### Phase 5: 학습 저장

7인 전원의 학습을 저장합니다. `process.md`의 "학습 저장 규칙"을 따릅니다.

완료 보고:

```markdown
## 온톨로지 구축 완료

| 항목 | 값 |
|---|---|
| 구조 | {schema name} |
| 확정 항목 | N건 |
| 추정 항목 | N건 |
| 후보 항목 | N건 (포함 M / 제외 K) |
| 이슈 | N건 |

저장 경로:
- Schema: `.claude/ontology/schema.yml`
- Raw Ontology: `.claude/ontology/raw.yml`

### 다음 단계
- `/onto-transform` — 원하는 형식으로 변환
- `/onto-review .claude/ontology/raw.yml` — 구축된 온톨로지를 8인 패널로 검증
```
