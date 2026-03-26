# 코드 기반 온톨로지 구축 프로세스 (적분형 탐색)

> Explorer가 코드를 탐색하고, 검증 에이전트들이 탐색 방향을 제시하는 반복 루프로 온톨로지를 점진적으로 구축합니다.
> 관련: 구축 후 `/onto-transform`으로 변환, `/onto-review`로 검증 가능.

## 설계 원리

### 검증과 탐색의 구조적 차이

- **검증(review)**: 범위가 확정된 입력에 대해 다관점으로 평가. 독립 병렬이 적합.
- **탐색(build)**: 범위가 미확정인 코드베이스에서 도메인 지식을 발견. 독립 탐색은 중복은 N배, 빈 영역은 합의 때서야 발견되어 불리.

따라서 build는 **적분형 탐색** 구조를 사용합니다:
- Explorer 1인이 코드를 읽고 **delta**(도메인 사실 보고)를 생성
- 검증 에이전트들이 delta를 분석하여 **label**(온톨로지 요소)을 부착하고 **epsilon**(다음 탐색 방향)을 제시
- Philosopher가 epsilon을 조율하고 수렴을 판정
- 종료 조건: (커버리지 충족) AND (새 fact = 0)

### 목적: 정밀 재현

이 프로세스의 목적은 **코드베이스의 도메인 지식을 정밀하게 재현**(brownfield 파악)하는 것입니다. 온톨로지를 통해 새로운 문제를 판단하는 것이 아닙니다.

코드에는 서비스의 모든 정보가 존재하지 않습니다:
- **코드에서 추출 가능**: 구조적 사실(Entity, 관계, 상태 전이, 의존)
- **코드에 내장되어 있으나 근거가 없는 것**: 비즈니스 정책(하드코딩된 규칙의 이유)
- **코드에 없는 것**: 사용자 경험, 설계 의도

이 세 가지를 `certainty` 분류로 구분하여, 사용자가 "어디까지 확정이고 어디부터 결정이 필요한지" 파악할 수 있도록 합니다.

### Certainty 분류 (2단계 판정)

| 등급 | 정의 | 판정 주체 |
|---|---|---|
| `deterministic` | 코드에서 직접 추출. 코드 변경 없이는 변하지 않음 | Explorer (1차) |
| `non-deterministic` | 코드에서 직접 추출할 수 없음 | Explorer (1차) |
| `code-embedded-policy` | 코드에 로직은 있으나 그 근거(정책)가 코드에 없음 | 검증 에이전트 (2차 세분화) |
| `inferred` | 합리적 추론이지만 코드에서 직접 확인되지 않음 | 검증 에이전트 (2차 세분화) |
| `not-in-code` | 이 소스에서 결정 불가. 다른 소스 필요 | 검증 에이전트 (2차 세분화) |

- **Explorer**는 `deterministic` / `non-deterministic`만 판정합니다 (코드 관찰 범위).
- **검증 에이전트**가 label 부여 시 `non-deterministic`을 세분화합니다 (도메인 해석 범위).
- 검증 에이전트가 Explorer의 certainty 판정이 잘못되었다고 판단하면, issues에 "certainty 재분류 요청"을 보고합니다. Philosopher가 patch 적용 시 반영합니다.

---

## 에이전트 구성 (build 모드)

| ID | 역할 | build에서의 행동 |
|---|---|---|
| `explorer` | 코드 탐색자 | 코드를 직접 읽고 delta(도메인 사실 보고)를 생성. certainty는 binary(deterministic/non-deterministic)만 판정. 온톨로지적 해석을 하지 않음 |
| 검증 에이전트 (N인) | 방향 제시자 | delta를 labeling하고, 자기 축에서 부족한 부분의 epsilon을 제시. **코드를 직접 읽지 않음**. non-deterministic fact의 certainty를 세분화 |
| `philosopher` | 조율자 | 검증 에이전트들의 epsilon을 통합 지시로 조율, 수렴 판정, 온톨로지 일관성 관리, patch 적용 |

검증 에이전트 정의(`roles/{agent-id}.md`)는 review와 동일합니다. build에서는 "검증"이 아니라 "자기 축에서의 빈 영역 식별 + label 부여"로 역할이 전환됩니다. 현재 검증 에이전트 목록은 `process.md`의 에이전트 구성 테이블에서 관리합니다.

---

### Phase 0: Schema Negotiation

온톨로지의 구조를 사용자와 협의하여 결정합니다. **탐색보다 반드시 먼저 실행**합니다.

**0.1 기존 schema 확인**
- `{project}/.onto-review/builds/{세션 ID}/schema.yml`이 이미 존재하면 내용을 보여주고 재사용 여부를 확인합니다.
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

사용자가 선택/커스터마이징한 구조를 `{project}/.onto-review/builds/{세션 ID}/schema.yml`에 저장합니다.

```yaml
name: {구조 이름}
version: 1
description: {이 구조를 선택한 이유 — 사용자 발언 기반}
element_types:
  - name: {요소 유형명}
    description: {이 유형이 무엇인가}
    has: [{하위 속성 목록}]
```

---

### Phase 0.5: Context Gathering (맥락 수집)

탐색 시작 전에 가용한 맥락을 최대한 수집합니다.

**0.5.1 프로젝트 전체 디렉토리 스캔**
- 프로젝트 최상위 디렉토리 목록을 수집합니다. 이 목록은 Phase 1의 종료 조건(커버리지 분모)으로 사용됩니다.
- `README.md`, `CLAUDE.md` 읽기 → 시스템 목적, 아키텍처 원칙 추출
- 문서 디렉토리(`docs/`, `*-docs/`, `**/document/`) 존재 여부 확인 → Explorer 초기 탐색 대상에 포함
- 테스트 코드(`test/`, `__tests__/`, `spec/`), CI/CD(`.github/workflows/`), API 명세(`openapi.yml`, `swagger.json`), 인프라(`Dockerfile`, `k8s/`, `terraform/`) 존재 여부 확인 → context_brief에 기록

**0.5.2 사용자 맥락 질문**
- "이 시스템의 핵심 비즈니스 흐름을 한 문장으로 설명해 주실 수 있나요?"
- "레거시 마이그레이션 이력이 있나요?"
- "관련 레포지토리(프론트엔드, 문서 등)가 있나요?"
- "이미 정의된 도메인 용어집이 있나요?"

사용자가 "없음" 또는 "모름"이면 생략하고 진행합니다.

**0.5.3 관련 소스 식별**
- $ARGUMENTS가 GitHub URL이면 자동 클론
- CLAUDE.md, package.json 등에서 관련 레포 참조 탐지
- 관련 소스가 있으면 사용자에게 "함께 분석할까요?" 제안

**0.5.4 맥락 요약 작성**

수집한 맥락을 `{project}/.onto-review/builds/{세션 ID}/context_brief.yml`에 저장합니다:

```yaml
context_brief:
  system_purpose: "{시스템이 해결하는 문제 — 1-2문장}"
  architecture: "{주요 기술 스택, 패키지 구조 — CLAUDE.md 기반}"
  legacy_context: "{레거시 이력 — 사용자 발언 기반}"
  sources:
    - type: backend-code
      path: {경로}
    - type: frontend-code
      path: {경로}
    - type: domain-docs
      path: {경로}
    - type: test-code
      path: {경로}
    - type: api-spec
      path: {경로}
    - type: infra
      path: {경로}
  all_directories: [{최상위 디렉토리 전체 목록}]
  known_terms: [{사용자가 제공한 도메인 용어}]
```

---

### Phase 1: 적분형 탐색 루프

`process.md`의 **Agent Teams 실행 방식**을 따릅니다 (에러 처리 규칙 포함).
TeamCreate로 팀(`onto-buildfromcode`)을 생성합니다.

**에러 처리 (build 고유)**:
- **Explorer 실패**: 프로세스 중단 + 사용자 안내 (대체 불가 단일 지점).
- **Philosopher 실패**: 프로세스 중단 + 사용자 안내 (대체 불가 단일 지점).
- **검증 에이전트 N인 중 일부 실패**: process.md의 graceful degradation 적용. 수렴 판정 시 분모를 응답한 에이전트 수로 조정.

#### 1.0 팀 구성

다음 에이전트를 teammate로 생성합니다:
- **explorer**: 코드 탐색 전담. Explore 타입 subagent 사용 권장.
- **검증 에이전트 N인**: 코드를 직접 읽지 않는 분석 에이전트.
- **philosopher**: epsilon 조율 + 수렴 판정 + patch 적용.

Explorer 초기 prompt:
```
당신은 코드 탐색자(Explorer)입니다.
onto-buildfromcode 팀에 참여합니다.

[역할]
코드베이스를 직접 읽고, 도메인 사실 보고(delta)를 생성합니다.
당신은 온톨로지적 해석(이것이 Entity인가, Aggregate인가)을 하지 않습니다.
코드에서 관찰한 사실을 도메인 언어로 서술하는 것이 당신의 역할입니다.

[certainty 판정 규칙]
각 fact에 대해 2단계 중 1차만 판정합니다:
- deterministic: 코드에서 직접 관찰한 사실 (클래스 정의, 필드, 관계, 제약)
- non-deterministic: 코드만으로 완전히 확인할 수 없는 사실

판별 기준: "코드를 변경하지 않으면 이 사실도 변하지 않는가?" → 예이면 deterministic.
경계 사례: 하드코딩된 상수(예: MIN_PAYMENT=500)는 deterministic (값 자체는 코드에서 확인 가능). 그 상수의 근거(왜 500인가)는 non-deterministic.

[해석 금지 범위]
다음은 하지 마세요:
- "이것은 Aggregate이다" 같은 온톨로지 유형 판단
- "이 정책은 비즈니스 요구사항에서 비롯된 것이다" 같은 의도 추론
- "이 구조는 좋다/나쁘다" 같은 가치 판단

다음은 해야 합니다:
- "이 클래스는 3개의 상태 필드를 가진다" 같은 관찰 사실 서술
- "이 필드는 다른 테이블의 ID를 참조하지만 JPA 관계 매핑이 없다" 같은 관찰

[context_brief]
{Phase 0.5에서 수집한 맥락 — context_brief.yml 내용}

[delta 보고 형식]
아래 "Delta 형식" 참조.

[팀 규칙]
- team lead의 탐색 지시(통합 epsilon)를 받아 코드를 탐색합니다.
- 탐색 결과를 delta 형식으로 team lead에게 보고합니다.
- 탐색에 실패한 경우(파일 접근 불가, 파싱 불가 등), delta의 status를 failed로 보고합니다.
- 한국어(존댓말)로 답변하세요.
- 비유/은유를 사용하지 마세요.
```

검증 에이전트 초기 prompt: `process.md`의 **Teammate 초기 prompt 템플릿** 사용. 단, [작업 지시]를 다음으로 교체:

```
[작업 지시 — build 모드]
당신은 build 모드로 동작합니다.
review 모드에서 당신의 역할은 "검증"이지만, build 모드에서는 "자기 축에서의 빈 영역 식별 + label 부여"로 전환됩니다.
코드를 직접 읽지 않습니다. Explorer가 보고한 delta(도메인 사실 보고)를 분석합니다.

각 라운드에서 team lead가 전달하는 내용:
- 이번 라운드의 delta (Explorer 보고)
- 현재까지 확정된 요소 목록 (anonymized wip — 누가 labeling했는지는 미포함)

수행 절차:
1. **Label**: delta의 각 fact에 대해, 당신의 전문 영역 관점에서 온톨로지 요소 유형을 부여합니다.
   - schema의 element_types 중 해당하는 것을 지정
   - 해당 없으면 "label 없음"
   - 근거를 1문장으로 명시
   - fact의 certainty가 non-deterministic이면, 아래 세분화를 수행:
     * code-embedded-policy: 코드에 로직이 있으나 그 근거(정책)가 코드에 없음
     * inferred: 코드에서 직접 확인되지 않는 추론
     * not-in-code: 이 소스에서 결정 불가

2. **Certainty별 처리 규칙**:
   - deterministic fact: 정상적으로 label 부여
   - code-embedded-policy fact: label 부여 + "정책 근거 미확인" issue 등록
   - inferred fact: label 부여 가능하나 certainty를 label에 전파
   - not-in-code fact: label 부여 불가. "이 영역에 개념 존재 가능" placeholder 기록 → Phase 3에서 사용자 결정 대상

3. **Epsilon**: 현재까지의 누적 요소 목록과 delta에서, 당신의 관점에서 아직 탐색되지 않은 영역을 제시합니다.
   - 구체적인 탐색 방향 (어디를, 무엇을 확인해야 하는지)
   - 더 이상 탐색할 것이 없으면 "epsilon 없음"
   - priority 기준:
     * high: 이것 없이는 현재 온톨로지가 오류를 포함
     * medium: 포괄성이 떨어지지만 오류는 아님
     * low: 알면 좋지만 필수는 아님

4. **Issue**: delta에서 발견된 문제/의문점, certainty 재분류 요청이 있으면 보고합니다.

[보고 형식]
아래 "Label/Epsilon 형식" 참조.
```

#### 1.1 Round 0: 초기 탐색

team lead가 Explorer에게 초기 탐색을 지시합니다:

```
[초기 탐색 지시]
코드베이스의 전체 구조를 파악하세요:
1. 소스 디렉토리 구조 (패키지/모듈 목록)
2. 각 모듈의 핵심 엔티티 (domain/ 디렉토리의 클래스 목록과 1줄 요약)
3. 프로젝트 문서가 있으면 (docs/, README.md 등) 핵심 내용 요약
4. 기술 스택 확인 (build 파일, 설정 파일)

깊이: 각 모듈의 domain/ 디렉토리까지만. 서비스 로직은 아직 보지 마세요.
Phase 0.5에서 이미 수집한 문서(README.md, CLAUDE.md)는 중복 탐색하지 마세요.

[module_inventory 보고]
delta₀에 반드시 module_inventory를 포함하세요:
- 탐색 대상이 되는 모든 소스 디렉토리/모듈의 목록
- 이 목록은 종료 조건의 커버리지 분모로 사용됩니다
- 형식: module_inventory: [{모듈 경로 목록}]
```

Explorer가 delta₀를 보고하면, team lead가 내용을 수정하지 않고 검증 에이전트들에게 전달합니다.

#### 1.2 Round N: 반복 루프

```
반복:
  1. team lead가 Explorer의 delta(N-1)을 검증 에이전트들에게 전달
     + 현재까지 확정된 요소 목록 (anonymized wip: labeled_by 제외)
  2. 검증 에이전트들이 각각 label + epsilon + issues를 보고
  2.5. Philosopher가 labels를 patch로 변환하여 wip.yml 갱신 (Phase 1.3)
  3. team lead가 검증 에이전트들의 epsilon 및 issues를 Philosopher에게 전달
  4. Philosopher가:
     a. epsilon 간 충돌 조율 (우선순위 판정)
     b. certainty 재분류 요청 반영
     c. 수렴 판정 (종료 여부)
     d. 통합 탐색 지시 생성
  5. team lead가 Philosopher의 통합 지시를 Explorer에게 전달
     (내용을 수정하거나 요약하지 않음)
  6. Explorer가 지시 방향으로 탐색 → delta(N) 보고
  → 1로 돌아감
```

**수렴 판정 (종료 조건)** — AND:
```
종료 = (커버리지 충족) AND (정보 수렴)

커버리지 충족 = module_inventory의 모든 모듈에서 최소 1건의 fact가 보고됨
정보 수렴 = Explorer가 보고한 delta의 새로운 fact 수 = 0
            (모든 epsilon 방향에서 이미 보고된 내용만 발견됨)

"새로운 fact" = 기존에 보고된 어떤 fact와도 subject+statement가 다른 fact.
               기존 fact의 detail 보강은 "새로운"에 해당하지 않음.
```

커버리지 미충족 시(fact=0이지만 미탐색 모듈 존재), Philosopher가 미탐색 모듈 대상 epsilon을 강제 생성합니다.

Philosopher가 종료를 판정합니다. convergence_status 형식:

```yaml
convergence_status:
  fact_convergence: true | false
  coverage_complete: true | false
  uncovered_modules: [{미탐색 모듈 목록}]
  converged_agents: [{epsilon 없음을 보고한 에이전트}]
  remaining_agents: [{epsilon이 있는 에이전트}]
  judgment: continue | terminate
  reason: "{판단 근거}"
```

**최대 라운드**: 7회. 수렴하지 않으면 현재 상태로 Phase 2로 진행하고, 미탐색 영역(remaining_agents의 epsilon + uncovered_modules)을 사용자에게 알립니다.

#### 1.3 라운드 간 온톨로지 축적

Phase 1.2의 **step 2.5**에서 실행됩니다 (검증 에이전트 보고 완료 후, Philosopher에게 epsilon 전달 전).

Philosopher가 검증 에이전트들의 labels를 **patch**로 변환하여 wip.yml을 갱신합니다.

**Patch 형식**:
```yaml
patch:
  round: {라운드 번호}
  source_labels: [{이번 라운드의 label 참조}]

  operations:
    - operation: add
      target_id: {새 element ID}
      type: {element_type}
      name: {이름}
      definition: {정의}
      certainty: {deterministic | code-embedded-policy | inferred | not-in-code}
      labeled_by: [{label을 부여한 에이전트}]
      source_deltas: [{근거 delta ID}]
      source_files: [{파일 목록}]
      details: {type별 상세}

    - operation: update
      target_id: {기존 element ID}
      add_labeled_by: [{추가 에이전트}]
      add_source_deltas: [{추가 delta ID}]
      merge_details: {보강할 상세}

    - operation: conflict
      target_id: {기존 element ID}
      conflicting_label: {모순되는 label 내용}
      reported_by: {보고 에이전트}
      resolution: pending | resolved
      # pending이면 issues에 기록, Phase 2에서 Philosopher가 최종 판정
```

**Patch 적용 규칙**:
- 새 element (add): wip.yml에 추가
- 기존 element에 추가 label (update): labeled_by에 에이전트 추가, details 보강
- 동일 type의 복수 에이전트 label (update): labeled_by 목록에 에이전트 추가 (합의로 간주)
- 기존 element과 모순되는 label (conflict): issues에 기록, Philosopher가 Phase 2에서 판정

온톨로지는 `{project}/.onto-review/builds/{세션 ID}/wip.yml`에 라운드마다 갱신됩니다.
Delta 원문은 `{project}/.onto-review/builds/{세션 ID}/deltas/d-{round}-{seq}.yml`에 저장됩니다.

```yaml
# wip.yml — 라운드마다 갱신
meta:
  schema: ./schema.yml
  round: {현재 라운드}
  status: in_progress
  module_inventory: [{Round 0에서 확정된 모듈 목록}]

elements:
  - id: {요소 ID}
    type: {element_type}
    name: {이름}
    definition: {정의}
    certainty: {등급}
    added_in_round: {처음 식별된 라운드}
    labeled_by: [{label을 부여한 에이전트 목록}]
    source_deltas: [{근거가 된 delta ID 목록}]
    source:
      files: [{파일 목록}]
      scope: {탐색 범위}
    details: {type별 상세}

# relations, constraints, issues도 동일한 축적 구조 (certainty 포함)
```

**Anonymized wip (검증 에이전트에게 공유하는 버전)**:
- wip.yml에서 `labeled_by` 필드를 제거한 버전
- 검증 에이전트는 "어떤 요소가 이미 식별되었는가"는 알지만, "누가 판단했는가"는 모름
- 이는 process.md의 "독립성 보장" 원칙의 **build 모드 예외**: 커버리지 완전성을 위해 이전 라운드의 확정 요소 목록은 공유하되, 판단 주체는 숨겨 anchoring bias를 완화

---

### Delta 형식

Explorer가 보고하는 delta의 형식:

```yaml
delta:
  id: d-{round}-{sequence}
  round: {라운드 번호}
  status: success | partial | failed
  trigger: "{이 탐색을 유발한 epsilon 요약. Round 0이면 '초기 탐색'}"

  # Round 0에서만 포함
  module_inventory: [{탐색 대상 모듈 전체 목록}]

  source:
    scope: "{탐색한 범위 (디렉토리 또는 파일 그룹)}"
    files: [{읽은 파일 목록}]

  facts:
    - subject: "{도메인 개체 또는 관계}"
      statement: "{도메인 사실 — Level 2}"
      certainty: deterministic | non-deterministic
      detail:  # 필수
        - "{코드 수준 사실 — 파일:라인}"  # certainty=deterministic 시
        - "{추론 근거 — 어떤 관찰에서 추론했는가}"  # certainty=non-deterministic 시
    # ... 추가 fact

  open_questions:  # Explorer도 해결하지 못한 불확실성
    - "{확인하지 못한 것}"
```

**status 필드**:
- `success`: 탐색 성공, facts가 포함됨
- `partial`: 일부 파일 탐색 실패, 읽은 파일의 facts는 포함됨
- `failed`: 해당 방향 전체 탐색 실패, facts 비어 있음

검증 에이전트는 status가 `failed`인 delta를 수신하면, 해당 방향을 "미탐색"으로 기록합니다 (delta=0과 구분).

**detail 필드 형식 (certainty별)**:
- `deterministic`: `"필드/관계 설명 — 파일:라인"` (코드 위치 필수)
- `non-deterministic`: `"추론 근거 설명"` 또는 `"탐색 범위 — 어디를 확인했으나 발견하지 못했는가"`

**Level 2 (도메인 사실)의 기준**:
- 코드에 근거하되 도메인 언어로 서술
- 온톨로지적 해석(Entity인가, Aggregate인가)을 포함하지 않음
- 각 fact의 source(파일)를 통해 Level 0(코드)까지 역추적 가능

예시 (이것은 올바른 Level 2):
```yaml
- subject: "수업(Lecture)"
  statement: "수업에는 3개의 독립적 상태 축이 존재한다"
  certainty: deterministic
  detail:
    - "status: LectureStatus enum (NONE=0, REGIST=1, DONE=2, CANCEL=3) — Lecture.java:77"
    - "invoiceStatus: InvoiceStatus inner enum (8값) — Lecture.java:226"
    - "classState: String (5값) — Lecture.java:199"
```

예시 (이것은 Level 2가 아님 — 온톨로지적 해석을 포함):
```yaml
# 잘못된 예시: Explorer가 해서는 안 되는 것
- subject: "수업(Lecture)"
  statement: "수업은 Aggregate Root이며, LectureOnline과 LectureStatusHistory를 하위 엔티티로 포함한다"
  # → 이것은 검증 에이전트의 label 영역
```

---

### Label/Epsilon 형식

검증 에이전트가 보고하는 형식:

```yaml
agent: {agent-id}
round: {라운드 번호}

labels:
  - delta_id: d-{round}-{seq}
    fact_index: {해당 fact의 인덱스, 0부터}
    type: "{schema의 element_type 또는 relation/constraint/issue}"
    target: "{온톨로지 요소 이름}"
    certainty_refinement: "{non-deterministic → code-embedded-policy/inferred/not-in-code. deterministic이면 생략}"
    rationale: "{왜 이 유형으로 판단했는가 — 1문장}"
    details: {추가 속성}
  # ... 추가 label

epsilons:
  - direction: "{어디를 무엇을 확인해야 하는가}"
    priority: high | medium | low
    rationale: "{왜 이 방향이 필요한가 — 1문장}"
  # ... 없으면 빈 배열 []

issues:
  - description: "{발견된 문제}"
    severity: critical | warning | info
    issue_type: finding | certainty_reclassification
    rationale: "{왜 문제인가}"
  # ... 없으면 빈 배열 []

learnings:
  communication: "없음"
  methodology: "[{유형}] {학습 내용}. 없으면 '없음'"
  domain: "[{유형}] {학습 내용}. 없으면 '없음'"
```

**epsilon의 적절한 구체성**:
```yaml
# 너무 추상적
- direction: "결제 도메인을 더 보라"

# 적절한 수준
- direction: "PaymentInfo.status가 String인데, PaymentGateway에서 이 status를 비교하는 모든 분기를 확인하여 실제 사용되는 값 집합을 수집하라"

# 너무 구체적
- direction: "PaymentGateway.java 1092줄의 'REFUNDED' 문자열을 확인하라"
```

**open_questions 처리**: 검증 에이전트는 delta의 `open_questions`를 확인하고, 자기 축에서 해당 질문이 중요하면 epsilon으로 전환합니다. 중요하지 않으면 무시합니다.

---

### Philosopher의 epsilon 통합 형식

```yaml
round: {다음 라운드 번호}
convergence_status:
  fact_convergence: true | false
  coverage_complete: true | false
  uncovered_modules: [{미탐색 모듈}]
  converged_agents: [{epsilon 없음 에이전트}]
  remaining_agents: [{epsilon 있는 에이전트}]
  judgment: continue | terminate
  reason: "{판단 근거}"

integrated_directions:
  - direction: "{통합된 탐색 방향}"
    requested_by: [{요청 에이전트 목록}]
    priority: high | medium | low
  # ... 우선순위 순 정렬

# 커버리지 미충족 시 강제 생성
forced_directions:
  - direction: "{미탐색 모듈} 디렉토리의 도메인 모델을 탐색하라"
    reason: "커버리지 미충족"
    priority: high
```

**Philosopher의 역할 범위 구분**:
- **Phase 1 (라운드 내)**: label 충돌 해소, certainty 재분류 반영, epsilon 통합. 라운드 단위의 일관성 관리.
- **Phase 2 (최종화)**: 전체 온톨로지의 구조적 일관성 검증, 탐색 방향 편향 검증, 유비쿼터스 언어/외부 시스템 정리.

---

### Phase 2: 최종화

탐색 루프가 종료되면, Philosopher가 wip.yml을 최종 검토합니다.

team lead가 Philosopher에게 전달하는 최종 검토 지시:

```
wip.yml을 최종 검토하세요.

[검토 항목]
1. 라운드 간 축적된 elements의 일관성 확인
2. 미해결 conflict가 있으면 판정하여 해소 또는 issues로 기록
3. 유비쿼터스 언어 섹션 정리 (탐색 중 발견된 도메인 용어)
4. 외부 시스템 경계 정리
5. 탐색 방향 편향 검증: Round 0의 module_inventory 대비 실제 탐색된 영역의 분포를 비교하여, 구조적으로 존재하지만 한 번도 깊이 탐색되지 않은 영역을 식별

[출력]
검토 완료된 wip.yml을 raw.yml 형식으로 변환하세요.
```

최종 검토 후 wip.yml → raw.yml로 변환합니다.

---

### Phase 3: 사용자 확인

```markdown
## 온톨로지 구축 결과 요약

### 구조: {schema name}
### 분석 대상: {$ARGUMENTS 또는 프로젝트 전체}
### 탐색 라운드: {N}회 ({수렴 | 최대 도달})

---

### certainty 분포
| 등급 | 요소 수 | 비율 |
|---|---|---|
| deterministic | N | N% |
| code-embedded-policy | N | N% |
| inferred | N | N% |
| not-in-code | N | N% |

### 탐색 커버리지
| 라운드 | 탐색 범위 | 새 fact 수 | 새 element 수 |
|---|---|---|---|
| 0 | 초기 탐색 (구조 파악) | N | N |
| 1 | {epsilon 요약} | N | N |

### 온톨로지 요소 — N건
| # | 유형 | 이름 | certainty | 식별 라운드 | 요약 |
|---|---|---|---|---|---|

### 사용자 결정 필요 항목
| # | 요소 | certainty | 결정 질문 |
|---|---|---|---|

### 발견된 이슈 — N건
| # | 심각도 | 설명 | 식별 라운드 |
|---|---|---|---|

### 미탐색 영역 (있는 경우)
- {미탐색 모듈 또는 수렴하지 않은 epsilon}

---

- 조정하실 부분이 있으면 알려주세요.
- 없으면 "확정"이라고 답해주세요.
```

---

### Phase 4: 저장

사용자가 확인하면 Raw Ontology를 저장합니다.

**저장 파일**: `{project}/.onto-review/builds/{세션 ID}/raw.yml`

```yaml
# Raw Ontology — 적분형 탐색으로 생성됨
meta:
  schema: ./schema.yml
  domain: {domain}
  source: {분석 대상 경로}
  date: {날짜}
  rounds: {총 라운드 수}
  convergence: converged | max_rounds_reached
  unexplored_directions: [{미탐색 영역 — max_rounds_reached 시}]
  agents: [explorer, {검증 에이전트 목록}, philosopher]

elements:
  - id: {요소 ID}
    type: {schema의 element_type}
    name: {이름}
    definition: {정의}
    certainty: {deterministic | code-embedded-policy | inferred | not-in-code}
    added_in_round: {라운드}
    labeled_by: [{에이전트}]
    source:
      files: [{파일}]
      deltas: [{delta ID}]
    details: {}

relations:
  - id: {관계 ID}
    from: {요소 ID}
    to: {요소 ID}
    type: {관계 유형}
    direction: {forward | backward | bidirectional}
    certainty: {등급}
    added_in_round: {라운드}
    labeled_by: [{에이전트}]
    source:
      files: [{파일}]
      deltas: [{delta ID}]

constraints:
  - id: {제약 ID}
    applies_to: {요소/관계 ID}
    description: {제약 내용}
    certainty: {등급}
    added_in_round: {라운드}
    labeled_by: [{에이전트}]
    source:
      files: [{파일}]
      deltas: [{delta ID}]

ubiquitous_language:
  - term: {도메인 용어}
    definition: {정의}
    used_in: [{관련 요소 ID}]
    source_delta: {delta ID}

external_systems:
  - name: {외부 시스템}
    role: {역할}
    integration_point: {연동 위치}
    direction: upstream | downstream | bidirectional

issues:
  - id: {이슈 ID}
    severity: critical | warning | info
    description: {설명}
    reported_by: [{agent-id}]
    discovered_in_round: {라운드}
    rationale: {이유}
```

**저장 규칙**:
- schema.yml이 없으면 `.onto-review/builds/{세션 ID}/` 디렉토리와 함께 생성
- raw.yml이 이미 존재하면 덮어쓰기 전에 사용자에게 확인
- wip.yml, deltas/ 디렉토리는 raw.yml 저장 후 삭제
- context_brief.yml은 유지 (향후 재실행 시 참조)

---

### Phase 5: 학습 저장

검증 에이전트 전원의 학습을 저장합니다. `process.md`의 "학습 저장 규칙"을 따릅니다.
Explorer는 학습을 저장하지 않습니다 (해석을 하지 않으므로).

완료 보고:

```markdown
## 온톨로지 구축 완료

| 항목 | 값 |
|---|---|
| 구조 | {schema name} |
| 탐색 라운드 | {N}회 |
| 수렴 상태 | {converged / max_rounds_reached} |
| 요소 | N건 (deterministic N / policy N / inferred N / not-in-code N) |
| 관계 | N건 |
| 제약 | N건 |
| 용어 | N건 |
| 외부 시스템 | N건 |
| 이슈 | N건 |

저장 경로:
- Schema: `.onto-review/builds/{세션 ID}/schema.yml`
- Raw Ontology: `.onto-review/builds/{세션 ID}/raw.yml`

### 다음 단계
- `/onto-transform` — 원하는 형식으로 변환
- `/onto-review .onto-review/builds/{세션 ID}/raw.yml` — 구축된 온톨로지를 패널로 검증
```

---

## 대상 코드 수집 규칙

- $ARGUMENTS가 디렉토리인 경우: 해당 디렉토리를 주 탐색 대상으로 설정.
- $ARGUMENTS가 GitHub URL인 경우: 자동 클론 후 탐색 대상으로 설정.
- $ARGUMENTS가 없는 경우: 프로젝트 루트를 탐색 대상으로 설정.
- 바이너리, node_modules, .git, 빌드 산출물은 제외.
- 비코드 텍스트 파일(마이그레이션, Proto, ADR)은 탐색 대상에 포함.
- Explorer가 Round 0에서 module_inventory를 보고. 50개 이상이면 Phase 0.5의 context_brief를 기반으로 초기 탐색 범위를 좁히되, module_inventory에는 전체 목록을 유지합니다.
