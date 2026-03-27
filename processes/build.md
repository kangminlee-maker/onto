# 온톨로지 구축 프로세스 (적분형 탐색)

> Explorer가 소스를 탐색하고, 검증 에이전트들이 탐색 방향을 제시하는 반복 루프로 온톨로지를 점진적으로 구축합니다.
> 관련: 구축 후 `/onto:transform`으로 변환, `/onto:review`로 검증 가능.

## 범용화 범위

이 프로세스는 **확장 가능 설계**입니다. 현재 지원하는 소스 유형은 코드베이스, 스프레드시트, 데이터베이스, 문서이며, 새로운 소스 유형은 `explorers/{source_type}.md` 프로파일 파일 추가 및 Phase 0.5 맥락 질문 추가로 지원합니다. 모든 소스 유형에 대한 완전 범용 추상화가 아닙니다.

## 설계 원리

### 검증과 탐색의 구조적 차이

- **검증(review)**: 범위가 확정된 입력에 대해 다관점으로 평가. 독립 병렬이 적합.
- **탐색(build)**: 범위가 미확정인 소스에서 도메인 지식을 발견. 독립 탐색은 중복은 N배, 빈 영역은 합의 때서야 발견되어 불리.

따라서 build는 **적분형 탐색** 구조를 사용합니다:
- Explorer 1인이 소스를 탐색하고 **delta**(도메인 사실 보고)를 생성
- 검증 에이전트들이 delta를 분석하여 **label**(온톨로지 요소)을 부착하고 **epsilon**(다음 탐색 방향)을 제시
- Philosopher가 epsilon을 조율하고 수렴을 판정
- 종료 조건: (커버리지 충족) AND (새 fact = 0)

### 목적: 정밀 재현

이 프로세스의 목적은 **분석 대상의 도메인 지식을 정밀하게 재현**(brownfield 파악)하는 것입니다. 온톨로지를 통해 새로운 문제를 판단하는 것이 아닙니다.

소스에는 대상의 모든 정보가 존재하지 않습니다:
- **소스에서 직접 관찰 가능**: 구조적 사실(Entity, 관계, 상태 전이, 의존, 수식, 스키마)
- **소스에 구현되어 있으나 근거가 없는 것**: 비즈니스 정책(하드코딩된 규칙의 이유, 서식 규칙의 의미)
- **소스에 없는 것**: 설계 의도, 사용자 경험, 조직 맥락

이 세 가지를 `certainty` 분류로 구분하여, 사용자가 "어디까지 확정이고 어디부터 결정이 필요한지" 파악할 수 있도록 합니다.

### Certainty 분류 (2단계 판정)

이 분류의 목적은 Phase 3에서 사용자에게 제시할 **행동 유형을 결정**하는 것입니다. 각 등급은 서로 다른 사용자 행동을 유발합니다.

> 이 섹션이 certainty 등급의 **단일 정의 위치(SSOT)**입니다. 다른 위치(Label/Epsilon 형식, Phase 3 출력 등)에서는 이 정의를 참조합니다.

**1차 판정 (Explorer)**:

| 등급 | 정의 | 판별 기준 |
|---|---|---|
| `observed` | 소스에서 직접 관찰한 사실. 소스 변경 없이는 변하지 않음 | "소스를 변경하지 않으면 이 사실도 변하지 않는가?" → 예 |
| `pending` | 소스만으로 확정할 수 없는 사실 | 위 질문에 "아니오" 또는 "알 수 없음" |

경계 사례: 하드코딩된 상수(예: MIN_PAYMENT=500)는 `observed`(값 자체는 소스에서 확인 가능). 그 상수의 근거(왜 500인가)는 `pending`.

**2차 판정 (검증 에이전트가 label 부여 시 `pending`를 세분화)**:

| 등급 | 정의 | 하류 행위 |
|---|---|---|
| `rationale-absent` | 구현은 소스에 있으나, 그 근거가 소스에 없음 | Phase 3에서 "정책 근거 미확인" 항목으로 사용자에게 제시 |
| `inferred` | 합리적 추론이지만 소스에서 직접 확인되지 않음 | Phase 3에서 추론 품질과 함께 사용자에게 제시. 후속 라운드에서 반박 시 `pending`로 강등 가능 |
| `ambiguous` | 소스의 해석이 동등하게 타당한 복수의 방향으로 갈리며, 단일 추론으로 수렴할 수 없음 | Phase 3에서 "복수 해석이 가능합니다. 선택해 주세요"와 함께 해석 선택지를 사용자에게 제시 |
| `not-in-source` | 이 소스에서 결정 불가. 다른 소스 또는 사용자 입력 필요 | Phase 3에서 "사용자 결정 필요" 항목으로 제시. label 부여 불가 — placeholder만 기록 |

`ambiguous` 판별 기준: "동등하게 타당한 해석이 2개 이상 존재하고, 현재 소스에서 하나로 좁힐 근거가 없는가?" → 예이면 `ambiguous`. 하나가 더 타당하면 `inferred`로 판정하고 rationale에 대안 해석을 언급합니다.

검증 에이전트가 Explorer의 1차 판정이 잘못되었다고 판단하면, issues에 "certainty 재분류 요청"을 보고합니다. Philosopher가 patch 적용 시 반영합니다.

**abduction_quality** (`inferred` 판정 시 필수):

추론의 품질을 자기 평가합니다. Phase 3에서 사용자 결정 항목의 우선순위 결정에 사용됩니다:
```yaml
abduction_quality:
  explanatory_power: high | medium | low   # 관찰된 구조를 얼마나 잘 설명하는가
  coherence: consistent | partial | conflicting  # 기존 확정 fact들과 모순 없는가
```

경쟁하는 label이 존재하여 Philosopher가 선택해야 할 때, 다음 규칙을 적용합니다:
1. `coherence: conflicting`인 후보는 비교 대상에서 제외합니다 (conflict 연산으로 별도 처리).
2. 나머지 후보 중 `explanatory_power`를 먼저 비교합니다 (high > medium > low).
3. 동점이면 `coherence`를 비교합니다 (consistent > partial).

**justification 가이드라인**:

검증 에이전트가 label의 `rationale` 필드를 작성할 때, 다음을 포함합니다:
- **관찰된 근거**: 어떤 사례/패턴에서 관찰했는가 (해당 시 사례 수 명시)
- **논리적 연결**: 관찰에서 판단까지의 추론 경로
- 1-2문장으로 작성합니다.

---

## 에이전트 구성 (build 모드)

| ID | 역할 | build에서의 행동 |
|---|---|---|
| `explorer` | 소스 탐색자 | 소스를 직접 탐색하고 delta(도메인 사실 보고)를 생성. certainty는 binary(`observed`/`pending`)만 판정. 온톨로지적 해석을 하지 않음. 구조 인식은 수행 |
| 검증 에이전트 (N인) | 방향 제시자 | delta를 labeling하고, 자기 축에서 부족한 부분의 epsilon을 제시. **소스를 직접 탐색하지 않음**. `pending` fact의 certainty를 세분화 |
| `philosopher` | 조율자 | 검증 에이전트들의 epsilon을 통합 지시로 조율, 수렴 판정, 온톨로지 일관성 관리, patch 적용 |

검증 에이전트 정의(`roles/{agent-id}.md`)는 review와 동일합니다. build에서는 "검증"이 아니라 "자기 축에서의 빈 영역 식별 + label 부여"로 역할이 전환됩니다. 현재 검증 에이전트 목록은 `process.md`의 에이전트 구성 테이블에서 관리합니다.

### Explorer의 구조 인식과 온톨로지적 해석의 구분

Explorer는 "무엇이 있는가"를 보고합니다. "그것이 무엇을 의미하는가"는 검증 에이전트가 판단합니다.

| 행위 | 구조 인식 (Explorer 허용) | 온톨로지적 해석 (Explorer 금지) |
|---|---|---|
| 코드 | "이 클래스는 3개의 상태 필드를 가진다" | "이것은 Aggregate Root이다" |
| 스프레드시트 | "이 행은 병합 셀, Bold, 배경색이 다르다" | "이것은 테이블의 헤더이다" |
| DB | "이 테이블은 FK 없는 3개 컬럼을 가진다" | "이것은 Lookup 테이블이다" |

구조 인식에 해석이 불가피하게 개입되는 경우(스프레드시트의 서식 패턴 등), Explorer는 **관찰 근거를 명시**합니다.

### 소스 유형별 Explorer 프로파일

Explorer의 프로세스 로직은 동일합니다. 소스 유형별 탐색 도구, 구조 인식 범위, 맥락 질문은 **Explorer 프로파일**에 정의됩니다.

| 소스 유형 | 프로파일 |
|---|---|
| 코드베이스 | `explorers/code.md` |
| 스프레드시트 | `explorers/spreadsheet.md` |
| DB | `explorers/database.md` |
| 문서 | `explorers/document.md` |

새 소스 유형 추가 시: `explorers/{source_type}.md` 생성 + 이 테이블에 행 추가.

각 프로파일 파일은 다음을 정의합니다: 탐색 도구, module_inventory 단위, 구조 인식 범위, 소스 유형 판별 조건, detail 위치 표기 형식, Phase 0.5 맥락 질문, Phase 0.5 스캔 대상.

비코드 소스의 탐색 도구가 가용하지 않을 경우(MCP 서버 미설정 등), 사용자에게 안내하고 프로세스를 중단합니다.

---

### Phase 0: Schema Negotiation

온톨로지의 구조를 사용자와 협의하여 결정합니다. **탐색보다 반드시 먼저 실행**합니다.

**0.1 기존 schema 확인**
- `{project}/.onto/builds/{세션 ID}/schema.yml`이 이미 존재하면 내용을 보여주고 재사용 여부를 확인합니다.
- 존재하지 않으면 0.2로 진행합니다.

**0.2 구조 선택지 제시**

Phase 0.5의 맥락(소스 유형, 아키텍처, 도메인)을 아직 수집하지 않았으므로, team lead가 $ARGUMENTS와 프로젝트의 CLAUDE.md/README.md에서 파악 가능한 정보를 기반으로 추천합니다.

```markdown
## 온톨로지 구조를 선택해 주세요

> **추천: {추천 스키마}** — {추천 이유 1문장. 프로젝트 특성에서 도출}

### A. Axiom 기반 (학술/추론) — 현재 미지원, 향후 구현 예정
- 구성: Class, Property, Axiom, Individual
- 특징: 논리적 추론 가능, 모순 자동 검출
- 적합: 엄밀한 도메인 모델링, 표준 준수 필요 시
- ⚠️ Axiom 정의는 코드 탐색으로 자동 추출이 어려워, 별도 프로세스가 필요합니다. B/C/D 중 선택해 주세요.

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

**추천 판단 기준**:
- 소스가 단일 서비스 코드베이스 + 명확한 비즈니스 로직 경계 → D
- 소스가 데이터 플랫폼, 다수 테이블/API의 운영 시스템 → B
- 소스가 문서, 스프레드시트, 또는 구조가 불명확한 초기 탐색 → C
- 판단 불가 → C (가장 유연)

**0.3 Schema 확정 및 저장**

사용자가 선택/커스터마이징한 구조를 `{project}/.onto/builds/{세션 ID}/schema.yml`에 저장합니다.

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

**0.5.1 소스 유형 판별 및 스캔**

$ARGUMENTS와 파일 확장자/내용으로 소스 유형을 자동 판별합니다. 판별이 모호한 경우(`.json`, `.csv` 등 복수 유형에 해당하는 확장자), 사용자에게 소스 유형을 질문합니다.

소스 유형 판별 후, 해당 프로파일(`explorers/{source_type}.md`)에 정의된 탐색 도구의 가용성을 확인합니다. 도구가 미가용(MCP 서버 미설정 등)이면 사용자에게 안내하고 프로세스를 중단합니다. 이 검증은 Schema 선택(Phase 0) 전에 완료하여, 사용자의 시간 낭비를 방지합니다.

소스 유형별 스캔 대상은 각 Explorer 프로파일의 "Phase 0.5 스캔 대상" 섹션에 정의됩니다. 소스 유형별 맥락 질문은 프로파일의 "Phase 0.5 맥락 질문" 섹션에 정의됩니다.

프로젝트 최상위 모듈 목록을 수집합니다(`all_modules`). 이 목록은 Explorer의 초기 탐색 범위를 안내하는 참조 정보입니다. 커버리지 분모는 Explorer가 Round 0에서 보고하는 `module_inventory`이며, `all_modules`와 다를 수 있습니다.

**0.5.2 사용자 맥락 질문**

Explorer 프로파일의 "Phase 0.5 맥락 질문"을 사용합니다. 사용자가 "없음" 또는 "모름"이면 생략하고 진행합니다.

**0.5.3 관련 소스 식별**
- $ARGUMENTS가 GitHub URL이면 자동 클론
- CLAUDE.md, package.json 등에서 관련 레포 참조 탐지
- 관련 소스가 있으면 사용자에게 "함께 분석할까요?" 제안

**0.5.4 맥락 요약 작성**

수집한 맥락을 `{project}/.onto/builds/{세션 ID}/context_brief.yml`에 저장합니다:

```yaml
context_brief:
  source_type: code | spreadsheet | database | document | mixed
  source_profile:
    type: {소스 유형}
    format: {xlsx | csv | sql | py | java | ...}
  system_purpose: "{대상이 해결하는 문제 — 1-2문장}"
  architecture: "{주요 기술 스택/구조 — CLAUDE.md 또는 사용자 발언 기반}"
  legacy_context: "{레거시 이력 — 사용자 발언 기반}"
  sources:
    - type: {소스 유형}
      path: {경로}
  all_modules: [{최상위 모듈/시트/테이블 전체 목록}]
  known_terms: [{사용자가 제공한 도메인 용어}]
```

---

### Phase 1: 적분형 탐색 루프

Phase 1은 **2개 Stage**로 구성됩니다. 각 Stage 내에서 기존 적분형 루프(Explorer→검증→Philosopher)가 독립적으로 동작합니다.

| Stage | 목적 | fact_type 범위 | 최대 라운드 |
|---|---|---|---|
| Stage 1: Structure | Entity, Enum, Relation, Property 식별 | entity, enum, property, relation, code_mapping | 5 |
| Stage 2: Behavior | State Machine, Command, Query, Policy, Flow 식별 | state_transition, command, query, policy_constant, flow | 5 |

Stage 1이 수렴(또는 최대 도달)하면 Stage 2로 진행합니다. Stage 2의 Explorer는 Stage 1의 wip.yml(확정된 Entity 목록)을 참조하여 행위 탐색을 수행합니다.

**Schema A 선택 시**: Axiom 정의는 코드 탐색으로 자동 추출이 어려워 별도 프로세스가 필요하며, 현재 미지원입니다. Phase 0에서 사용자에게 B/C/D 중 재선택을 안내합니다.
**Schema C 선택 시**: Stage 2의 command/query는 Entity(entity_type: command/query)로 변환됩니다.

`process.md`의 **Agent Teams 실행 방식**을 따릅니다 (에러 처리 규칙 포함).
TeamCreate로 팀(`onto-build`)을 생성합니다.

**에러 처리 (build 고유)**:
- **Explorer 실패**: 프로세스 중단 + 사용자 안내 (대체 불가 단일 지점).
- **Philosopher 실패**: 프로세스 중단 + 사용자 안내 (대체 불가 단일 지점).
- **검증 에이전트 N인 중 일부 실패**: process.md의 graceful degradation 적용. 수렴 판정 시 분모를 응답한 에이전트 수로 조정.

#### 1.0 팀 구성

다음 에이전트를 teammate로 생성합니다:
- **explorer**: 소스 탐색 전담. Explore 타입 subagent 사용 권장.
- **검증 에이전트 N인**: 소스를 직접 탐색하지 않는 분석 에이전트.
- **philosopher**: epsilon 조율 + 수렴 판정 + patch 적용.

Explorer 초기 prompt 구성:

team lead가 Phase 0.5에서 판별한 소스 유형에 따라, `explorers/{source_type}.md` 프로파일을 읽고 아래 템플릿의 변수를 채웁니다.

```
당신은 소스 탐색자(Explorer)입니다.
onto-build 팀에 참여합니다.

[역할]
분석 대상을 직접 탐색하고, 도메인 사실 보고(delta)를 생성합니다.
당신은 온톨로지적 해석(이것이 Entity인가, Aggregate인가)을 하지 않습니다.
소스에서 관찰한 사실을 도메인 언어로 서술하는 것이 당신의 역할입니다.
구조 인식(서식 차이, 참조 관계 등의 관찰)은 수행하되, 관찰 근거를 명시하세요.

[구조화 보고 규칙]
가능한 한 structured_data를 포함하세요. 특히:
- 클래스/테이블 발견 시: fact_type: entity + structured_data로 필드 목록
- enum 발견 시: fact_type: enum + values 목록
- FK/참조 발견 시: fact_type: relation + from/to/fk_column
- 상태 전이 발견 시: fact_type: state_transition + from/to/trigger
- 서비스 메서드 발견 시: fact_type: command 또는 query + 시그니처
- 하드코딩 상수 발견 시: fact_type: policy_constant + value
구조화가 불가능하면 statement + detail만으로 보고하세요.

[소스 유형: {source_type}]
- 탐색 도구: {프로파일의 "탐색 도구"}
- module_inventory 단위: {프로파일의 "module_inventory 단위"}
- 구조 인식 범위: {프로파일의 "구조 인식 범위"}
- detail 위치 표기: {프로파일의 "detail 위치 표기"}

[구조 인식 예시]
{프로파일의 "구조 인식 예시" — 올바른 보고 / 해서는 안 되는 보고}

[certainty 판정 규칙]
각 fact에 대해 1차 판정만 수행합니다:
- observed: 소스에서 직접 관찰한 사실 (구조, 값, 관계, 제약)
- pending: 소스만으로 완전히 확인할 수 없는 사실

판별 기준: "소스를 변경하지 않으면 이 사실도 변하지 않는가?" → 예이면 observed.
경계 사례: 하드코딩된 상수(예: MIN_PAYMENT=500)는 observed (값 자체는 소스에서 확인 가능). 그 상수의 근거(왜 500인가)는 pending.

[context_brief]
{Phase 0.5에서 수집한 맥락 — context_brief.yml 내용}

[delta 보고 형식]
아래 "Delta 형식" 참조.

[팀 규칙]
- team lead의 탐색 지시(통합 epsilon)를 받아 소스를 탐색합니다.
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
소스를 직접 탐색하지 않습니다. Explorer가 보고한 delta(도메인 사실 보고)를 분석합니다.

각 라운드에서 team lead가 전달하는 내용:
- 소스 유형 (code / spreadsheet / database / document)
- 이번 라운드의 delta (Explorer 보고)
- 현재까지 확정된 요소 목록 (anonymized wip — 누가 labeling했는지는 미포함)

delta의 `source.type`과 `detail` 필드의 위치 표기는 소스 유형에 따라 다릅니다 (파일:라인, 시트:셀범위, 스키마.테이블.컬럼 등). 소스 유형별 표기 규칙은 `explorers/{source_type}.md`의 "detail 위치 표기"를 참조하세요.

수행 절차:
1. **Label**: delta의 각 fact에 대해, 당신의 전문 영역 관점에서 온톨로지 요소 유형을 부여합니다.
   - schema의 element_types 중 해당하는 것을 지정
   - 해당 없으면 "label 없음"
   - 근거를 1문장으로 명시
   - fact의 certainty가 pending이면, 아래 세분화를 수행 (정의는 "Certainty 분류" 섹션 참조):
     * rationale-absent: 구현은 소스에 있으나 그 근거가 소스에 없음
     * inferred: 소스에서 직접 확인되지 않는 추론. abduction_quality도 평가
     * ambiguous: 동등하게 타당한 복수 해석이 존재하며 단일 추론으로 수렴 불가
     * not-in-source: 이 소스에서 결정 불가. 다른 소스 또는 사용자 입력 필요

2. **Certainty별 처리 규칙**:
   - observed fact: 정상적으로 label 부여
   - rationale-absent fact: label 부여 + "근거 미확인" issue 등록
   - inferred fact: label 부여 가능하나 certainty를 label에 전파. 후속 라운드에서 반박 시 pending로 강등
   - ambiguous fact: 가장 유력한 해석으로 잠정 label 부여 + 대안 해석을 issue에 등록. Phase 3에서 해석 선택지를 사용자에게 제시
   - not-in-source fact: label 부여 불가. "이 영역에 개념 존재 가능" placeholder 기록 → Phase 3에서 사용자 결정 대상

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

Philosopher 초기 prompt:
```
당신은 조율자(Philosopher)입니다.
onto-build 팀에 참여합니다.

[역할]
검증 에이전트들의 epsilon을 통합 지시로 조율하고, 수렴을 판정하며, 온톨로지의 일관성을 관리합니다.
labels를 patch로 변환하여 wip.yml을 갱신합니다.

[수행 절차]
각 라운드에서 team lead가 전달하는 내용:
- 검증 에이전트들의 labels, epsilons, issues
- 현재 wip.yml

수행:
1. labels를 아래 "Patch 형식"에 따라 patch로 변환하여 wip.yml 갱신
2. epsilons 간 충돌 조율 (우선순위 판정)
3. certainty 재분류 요청 반영
4. 수렴 판정 — 아래 "convergence_status 형식" 사용
5. 통합 탐색 지시 생성 — 아래 "epsilon 통합 형식" 사용

[patch 형식]
아래 "Patch 형식" 참조.

[convergence_status 형식]
아래 "Philosopher의 epsilon 통합 형식" 참조.

[팀 규칙]
- team lead의 지시를 받아 작업합니다.
- 한국어(존댓말)로 답변하세요.
- 비유/은유를 사용하지 마세요.
```

#### 1.1 Stage 1, Round 0: 구조 초기 탐색

team lead가 Explorer에게 초기 탐색을 지시합니다:

```
[초기 탐색 지시]
분석 대상의 전체 구조를 파악하세요:
1. 소스 구조 (패키지/모듈/시트/테이블 목록)
2. 각 모듈의 핵심 엔티티 (도메인 모델의 목록과 1줄 요약)
3. 문서가 있으면 핵심 내용 요약
4. 기술 스택/포맷 확인

깊이: 각 모듈의 도메인 모델까지만. 세부 로직은 아직 보지 마세요.
Phase 0.5에서 이미 수집한 문서는 중복 탐색하지 마세요.

[fact_type 범위]
Stage 1입니다. entity, enum, property, relation, code_mapping에 집중하세요.
상태 전이 규칙, 서비스 메서드, 비즈니스 상수는 Stage 2에서 탐색합니다.

> code_mapping은 Stage 1에서 시작하되, Stage 2에서 추가 발견(예: 서비스 레이어의 레거시 명칭)이 있으면 보완합니다. code_mapping fact_type은 양 Stage에서 허용됩니다.

[module_inventory 보고]
delta₀에 반드시 module_inventory를 포함하세요:
- 탐색 대상이 되는 모든 모듈/시트/테이블의 목록
- 이 목록은 종료 조건의 커버리지 분모로 사용됩니다
- 형식: module_inventory: [{모듈 목록}]
```

Explorer가 delta₀를 보고하면, team lead가 내용을 수정하지 않고 검증 에이전트들에게 전달합니다.

#### 1.2 Round N: 반복 루프 (Stage 1, Stage 2 공통)

```
반복:
  1. team lead가 Explorer의 delta(N-1)을 검증 에이전트들에게 전달
     + 현재까지 확정된 요소 목록 (anonymized wip: labeled_by 제외)
  2. 검증 에이전트들이 각각 label + epsilon + issues를 보고
  2.5. Philosopher가 labels를 patch로 변환하여 wip.yml 갱신 (Phase 1.4)
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

**최대 라운드**: 각 Stage 5회 (전체 최대 10회). 수렴하지 않으면 현재 상태로 Phase 2로 진행하고, 미탐색 영역(remaining_agents의 epsilon + uncovered_modules)을 사용자에게 알립니다.

#### 1.3 Stage 전환

**Stage 2에서 Stage 1 누락 Entity 발견 시**:
- Explorer가 해당 Entity를 fact_type: entity로 보고합니다 (Stage fact_type 범위 예외).
- Philosopher가 wip.yml에 추가하되, added_in_stage: 2, note: "Stage 2에서 보완 발견"을 표기합니다.
- 이 Entity의 properties/relations는 Stage 2의 남은 라운드에서 탐색합니다.

**Stage 간 certainty 전파 규칙**:

Stage 1에서 확정된 element의 certainty는 Stage 2에서 변경될 수 있습니다. Stage 2의 행위 탐색이 Stage 1의 구조적 판단에 새로운 증거를 제공할 수 있기 때문입니다.

| 상황 | 허용 여부 | 처리 |
|---|---|---|
| Stage 2에서 Stage 1 element의 certainty를 **강등**(demote) | 허용 | Stage 2 검증 에이전트가 issues에 "certainty 재분류 요청" 보고. Philosopher가 demote patch 적용 |
| Stage 2에서 Stage 1 element의 certainty를 **승격**(upgrade: ambiguous→inferred) | 허용 | Stage 2의 추가 증거가 해석을 좁혔을 때. Philosopher가 upgrade patch 적용 |
| Stage 2에서 Stage 1 element의 **type을 변경** | 불허 | type 변경이 필요하면 issues에 기록하고 Phase 3에서 사용자에게 제시 |

Stage 1이 종료되면 (수렴 또는 최대 5회 도달):
1. Philosopher가 Stage 1의 wip.yml을 확정합니다.
2. wip.yml의 `meta.stage`를 2로 갱신합니다.
3. team lead가 Explorer에게 Stage 2 초기 지시를 전달합니다:

```
[Stage 2 초기 탐색 지시]
Stage 1에서 식별된 Entity를 기반으로 행위를 파악하세요:
1. 각 Entity의 상태 전이 규칙 (상태 필드의 값 변경 조건과 트리거)
2. 서비스/게이트웨이 메서드 → command(상태 변경) 또는 query(조회) 분류
3. 하드코딩된 비즈니스 상수 (policy_constant)
4. 엔티티 간 비즈니스 흐름 (flow)

[fact_type 범위]
Stage 2입니다. state_transition, command, query, policy_constant, flow에 집중하세요.

Stage 1 wip.yml을 참조하세요: {wip.yml 경로}
```

4. Stage 2의 Round 0부터 적분형 루프를 재시작합니다.
5. Stage 2의 module_inventory는 Stage 1에서 확정된 Entity 목록으로 대체합니다.

#### 1.4 라운드 간 온톨로지 축적

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
      certainty: {observed | rationale-absent | inferred | ambiguous | not-in-source}
      labeled_by: [{label을 부여한 에이전트}]
      source_deltas: [{근거 delta ID}]
      source_locations: [{소스 위치 목록}]
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

    - operation: demote
      target_id: {기존 element ID}
      from_certainty: inferred
      to_certainty: pending
      reason: "{반박 근거}"
      # 후속 라운드에서 기존 inferred fact가 반박된 경우

    - operation: upgrade
      target_id: {기존 element ID}
      from_certainty: ambiguous
      to_certainty: inferred
      reason: "{우세 해석과 그 근거}"
      # 추가 증거로 하나의 해석이 우세해진 경우

    - operation: nullify
      target_id: {기존 element ID}
      from_certainty: ambiguous
      to_certainty: not-in-source
      reason: "{모든 해석 배제 근거}"
      # 모든 해석이 후속 증거로 배제된 경우
```

**Patch 적용 규칙**:
- 새 element (add): wip.yml에 추가
- 기존 element에 추가 label (update): labeled_by에 에이전트 추가, details 보강
- 동일 type의 복수 에이전트 label (update): labeled_by 목록에 에이전트 추가 (합의로 간주)
- 기존 element과 모순되는 label (conflict): issues에 기록, Philosopher가 Phase 2에서 판정
- 기존 inferred element 반박 (demote): certainty를 pending로 강등, 다음 라운드에서 재판정
- 기존 ambiguous element 해소 (upgrade): 추가 증거로 하나의 해석이 우세해지면 inferred로 승격. rationale에 대안 해석 기록 유지
- 기존 ambiguous element 전원 배제 (nullify): 모든 해석이 후속 증거로 배제되면 not-in-source로 전환. issue에 배제 근거 기록

온톨로지는 `{project}/.onto/builds/{세션 ID}/wip.yml`에 라운드마다 갱신됩니다.
Delta 원문은 `{project}/.onto/builds/{세션 ID}/deltas/d-{round}-{seq}.yml`에 저장됩니다.

```yaml
# wip.yml — 라운드마다 갱신
meta:
  schema: ./schema.yml
  source_type: {code | spreadsheet | database | document | mixed}
  stage: {1 | 2}
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
      locations: [{소스 위치 목록}]
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
    type: {code | spreadsheet | database | document}
    scope: "{탐색한 범위 (디렉토리, 시트, 테이블 등)}"
    locations: [{탐색한 소스 위치 목록}]

  facts:
    - subject: "{도메인 개체 또는 관계}"
      statement: "{도메인 사실 — 자연어 요약}"
      certainty: observed | pending
      lens: [structure | rationale | presentation]
      fact_type: entity | enum | property | relation | state_transition | command | query | policy_constant | flow | code_mapping
      structured_data:  # fact_type별 구조화 데이터 (optional)
        # entity: {name, domain, db_table, properties: [{name, type, nullable, description, enum_ref, constraints}]}
        # enum: {name, values: [{value, code, description}]}
        # property: {entity, name, type, enum_ref, nullable}
        # relation: {from, to, type, cardinality, fk_column}
        # state_transition: {entity, field, from, to, trigger, guard, side_effects}
        # command: {name, actor, target_entities, preconditions, results, state_transitions, side_effects, source_code}
        # query: {name, actor, target_entities, description, source_code}
        # policy_constant: {name, value, unit, description, used_by}
        # flow: {name, steps, external_dependencies}
        # code_mapping: {canonical, legacy_aliases, code_entity, db_table, fk_variants}
      detail:
        - "{소스 위치 포함 설명}"
        # 코드: "필드 정의 — User.java:42"
        # 스프레드시트: "수식 =SUM(B2:B10) — Sheet1:B11"
        # DB: "FK 제약 — orders.user_id → users.id"
    # ... 추가 fact

  open_questions:  # Explorer도 해결하지 못한 불확실성
    - "{확인하지 못한 것}"
```

**status 필드**:
- `success`: 탐색 성공, facts가 포함됨
- `partial`: 일부 소스 탐색 실패, 탐색된 부분의 facts는 포함됨
- `failed`: 해당 방향 전체 탐색 실패, facts 비어 있음

검증 에이전트는 status가 `failed`인 delta를 수신하면, 해당 방향을 "미탐색"으로 기록합니다 (delta=0과 구분).

**detail 필드 형식 (certainty별)**:
- `observed`: `"구조/값 설명 — 소스 위치"` (소스 위치 필수)
- `pending`: `"추론 근거 설명"` 또는 `"탐색 범위 — 어디를 확인했으나 발견하지 못했는가"`

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
    certainty_refinement: "{pending → rationale-absent/inferred/ambiguous/not-in-source. observed이면 생략}"
    abduction_quality:  # inferred일 때만. Phase 3 사용자 결정 우선순위에 사용
      explanatory_power: high | medium | low
      coherence: consistent | partial | conflicting
    justification: "{왜 이 유형으로 판단했는가 — 1문장}"
    details: {추가 속성}
  # ... 추가 label

epsilons:
  - direction: "{어디를 무엇을 확인해야 하는가}"
    priority: high | medium | low
    justification: "{왜 이 방향이 필요한가 — 1문장}"
  # ... 없으면 빈 배열 []

issues:
  - description: "{발견된 문제}"
    severity: critical | warning | info
    issue_type: finding | certainty_reclassification
    justification: "{왜 문제인가}"
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
  - direction: "{미탐색 모듈}을 탐색하라"
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
### 소스 유형: {code | spreadsheet | database | document | mixed}
### 탐색 라운드: {N}회 ({수렴 | 최대 도달})

---

### certainty 분포
| 등급 | 요소 수 | 비율 |
|---|---|---|
| observed | N | N% |
| rationale-absent | N | N% |
| inferred | N | N% |
| ambiguous | N | N% |
| not-in-source | N | N% |

### 탐색 커버리지
| 라운드 | 탐색 범위 | 새 fact 수 | 새 element 수 |
|---|---|---|---|
| 0 | 초기 탐색 (구조 파악) | N | N |
| 1 | {epsilon 요약} | N | N |

### 온톨로지 요소 — N건
| # | 유형 | 이름 | certainty | 식별 라운드 | 요약 |
|---|---|---|---|---|---|

### 사용자 결정 필요 항목
| # | 요소 | certainty | 결정 질문 | 추론 품질 (inferred만) |
|---|---|---|---|---|

- `rationale-absent` 항목: "구현은 확인되었으나 근거를 알려주세요"
- `inferred` 항목: 추론 품질(explanatory_power, coherence) 순으로 정렬 — 품질 낮은 추론이 우선 확인 대상
- `ambiguous` 항목: "복수 해석이 가능합니다. 선택해 주세요" + 각 해석 선택지와 근거
- `not-in-source` 항목: "이 소스에서 확인할 수 없습니다. 정보를 제공해 주세요"

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

**저장 파일**: `{project}/.onto/builds/{세션 ID}/raw.yml`

**저장 형식은 선택된 schema에 따라 결정됩니다**:
- Schema B: `golden/schema-b.yml`의 sections 구조를 따름
- Schema C: `golden/schema-c.yml`의 sections 구조를 따름
- Schema D: `golden/schema-d.yml`의 sections 구조를 따름
- Schema E (커스텀): 사용자 정의 schema.yml의 구조를 따름

각 schema의 구체적 형식은 해당 golden example을 참조하세요.

**공통 meta 헤더** (모든 schema에 동일):

```yaml
# Raw Ontology — 적분형 탐색으로 생성됨
meta:
  schema: ./schema.yml
  source_type: {code | spreadsheet | database | document | mixed}
  domain: {domain}
  source: {분석 대상 경로}
  date: {날짜}
  rounds: {총 라운드 수}
  convergence: converged | max_rounds_reached
  unexplored_directions: [{미탐색 영역 — max_rounds_reached 시}]
  agents: [explorer, {검증 에이전트 목록}, philosopher]
```

**Schema C 기본 형식** (Schema C 선택 시, 또는 커스텀 schema의 참고용):

```yaml
elements:
  - id: {요소 ID}
    type: {schema의 element_type}
    name: {이름}
    definition: {정의}
    certainty: {observed | rationale-absent | inferred | ambiguous | not-in-source}
    added_in_round: {라운드}
    labeled_by: [{에이전트}]
    source:
      locations: [{소스 위치}]
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
      locations: [{소스 위치}]
      deltas: [{delta ID}]

constraints:
  - id: {제약 ID}
    applies_to: {요소/관계 ID}
    description: {제약 내용}
    certainty: {등급}
    added_in_round: {라운드}
    labeled_by: [{에이전트}]
    source:
      locations: [{소스 위치}]
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
    justification: {이유}
```

**Schema B/D의 raw.yml 형식**: 해당 golden example의 구조를 따릅니다. meta 헤더 아래에 각 schema의 sections를 그대로 사용합니다.
- Schema B: `golden/object-types.yaml` + `golden/action-types.yaml`의 구조 (enums, object_types, link_types, actors, action_types, functions, domain_flows)
- Schema D: `golden/d-domain-driven.yaml`의 구조 (bounded_contexts, aggregates, entities, value_objects, domain_events, commands, queries, sagas, relationships)

**저장 규칙**:
- schema.yml이 없으면 `.onto/builds/` 디렉토리와 함께 생성
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
| 소스 유형 | {source_type} |
| 탐색 라운드 | {N}회 |
| 수렴 상태 | {converged / max_rounds_reached} |
| 요소 | N건 (observed N / rationale-absent N / inferred N / ambiguous N / not-in-source N) |
| 관계 | N건 |
| 제약 | N건 |
| 용어 | N건 |
| 외부 시스템 | N건 |
| 이슈 | N건 |

저장 경로:
- Schema: `.onto/builds/{세션 ID}/schema.yml`
- Raw Ontology: `.onto/builds/{세션 ID}/raw.yml`

### 다음 단계
- `/onto:transform` — 원하는 형식으로 변환
- `/onto:review .onto/builds/{세션 ID}/raw.yml` — 구축된 온톨로지를 패널로 검증
```

---

## 대상 소스 수집 규칙

- $ARGUMENTS가 디렉토리인 경우: 해당 디렉토리를 주 탐색 대상으로 설정.
- $ARGUMENTS가 파일(.xlsx, .csv 등)인 경우: 해당 파일을 탐색 대상으로 설정.
- $ARGUMENTS가 GitHub URL인 경우: 자동 클론 후 탐색 대상으로 설정.
- $ARGUMENTS가 없는 경우: 프로젝트 루트를 탐색 대상으로 설정.
- 바이너리, node_modules, .git, 빌드 산출물은 제외.
- 비코드 텍스트 파일(마이그레이션, Proto, ADR)은 탐색 대상에 포함.
- Explorer가 Round 0에서 module_inventory를 보고. 50개 이상이면 Phase 0.5의 context_brief를 기반으로 초기 탐색 범위를 좁히되, module_inventory에는 전체 목록을 유지합니다.

---

## 변경 전파 체크리스트

이 파일(build.md)을 변경할 때, 아래 문서의 해당 섹션을 동기화해야 합니다.

| 문서 | 동기화 대상 섹션 |
|---|---|
| `README.md` | 3행(설명), 에이전트 테이블, "온톨로지 구축" 섹션, certainty 설명, 디렉토리 구조 |
| `dev-docs/BLUEPRINT.md` | 2절(용어 정의), 3.6절(Explorer), 4.3절(build), certainty 테이블, 디렉토리 구조, MCP 인터페이스 |
| `process.md` | Teammate prompt 템플릿의 certainty 관련, 에이전트-도메인 문서 매핑 |
| `explorers/*.md` | 소스 유형별 프로파일 — build.md의 certainty 등급명/형식이 변경되면 프로파일의 예시도 동기화 |
