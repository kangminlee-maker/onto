# Agent Process

개별 command(`onto-{dimension}`)와 팀 리뷰 command(`onto-review`)가 참조하는 공통 프로세스 정의.

## 에이전트 구성

### 온톨로지 검증 에이전트 (7인)
| ID | 역할 | 검증 차원 |
|---|---|---|
| `onto_logic` | 논리적 일관성 검증자 | 모순, 타입 충돌, 제약 상충 |
| `onto_structure` | 구조적 완전성 검증자 | 고립 노드, 끊어진 경로, 누락 관계 |
| `onto_dependency` | 의존성 무결성 검증자 | 순환, 역방향, 다이아몬드 의존 |
| `onto_semantics` | 의미적 정확성 검증자 | 이름-의미 일치, 동의어/동형이의어 |
| `onto_pragmatics` | 활용 적합성 검증자 | 질의 가능성, 역량 질문 테스트 |
| `onto_evolution` | 확장·진화 적합성 검증자 | 새 데이터/도메인 추가 시 깨짐 |
| `onto_coverage` | 도메인 포괄성 검증자 | 누락 하위 영역, 개념 편중, 표준 대비 빈 영역 |

### 목적 정합성 검증자 (1인)
| ID | 역할 |
|---|---|
| `philosopher` | 시스템 목적 기반 메타 관점 제공, 7인의 판단을 목적 관점에서 종합·재정의, 새로운 관점 제시 |

### 도메인 문서
각 에이전트는 실행 시 해당 도메인의 문서를 읽습니다:
```
~/.claude/agent-memory/domains/{domain}/
  ├── logic_rules.md        ← onto_logic
  ├── structure_spec.md     ← onto_structure
  ├── dependency_rules.md   ← onto_dependency
  ├── concepts.md           ← onto_semantics
  ├── competency_qs.md      ← onto_pragmatics
  ├── extension_cases.md    ← onto_evolution
  └── domain_scope.md       ← onto_coverage
```

### 도메인 판별 규칙

1. **프로젝트 선언 우선**: 프로젝트의 CLAUDE.md에 `domain:` 또는 `agent-domain:` 선언이 있으면 해당 도메인을 사용합니다.
2. **다중 도메인**: `secondary_domains:`가 선언되어 있으면, 주 도메인 문서를 우선 참조하고, 보조 도메인 문서를 추가로 참조합니다. 규칙이 충돌하면 주 도메인이 우선합니다.
3. **선언 없음**: 프로젝트에 도메인 선언이 없으면 사용자에게 질문합니다.
4. **도메인 문서 없음**: 선언된 도메인의 문서(`~/.claude/agent-memory/domains/{domain}/`)가 존재하지 않으면, 도메인 규칙 없이 범용 원칙만으로 검증합니다.

---

## 학습 저장 구조

에이전트의 학습은 **3개 경로**로 분리 저장됩니다:

| 학습 유형 | 저장 경로 | 내용 |
|---|---|---|
| **소통 학습 (공통)** | `~/.claude/agent-memory/communication/common.md` | 모든 에이전트에 적용되는 소통 규칙 |
| **소통 학습 (개별)** | `~/.claude/agent-memory/communication/{agent-id}.md` | 특정 에이전트의 소통 선호 |
| **방법론 학습** | `~/.claude/agent-memory/methodology/{agent-id}.md` | 도메인 무관한 검증 원칙, 일반적 교훈 |
| **도메인 학습** | `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md` | 특정 도메인에서만 유효한 학습 |

---

## 개별 질문 모드

### 1. Context Gathering

1. **에이전트 파일 수집**:
   - 정의: `~/.claude/plugins/onto-review/agents/{agent-id}.md`
   - 방법론 학습: `~/.claude/agent-memory/methodology/{agent-id}.md`
   - 소통 학습 (공통): `~/.claude/agent-memory/communication/common.md`
   - 소통 학습 (개별): `~/.claude/agent-memory/communication/{agent-id}.md`
   - 파일이 없으면 무시합니다.

2. **도메인 문서 수집**:
   - 도메인 판별 후, `~/.claude/agent-memory/domains/{domain}/` 하위에서 해당 에이전트의 도메인 문서를 읽습니다.
   - 도메인 학습 (글로벌): `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md`
   - 도메인 학습 (프로젝트): `{project}/.claude/learnings/{agent-id}.md` — 해당 프로젝트에서 축적된 학습

3. **질문 대상 수집**:
   - 질문이 파일/코드를 참조하는 경우: 해당 내용을 읽습니다.
   - 프로젝트의 CLAUDE.md, README.md에서 시스템 목적과 원칙을 파악합니다.

### 2. Agent Execution

Agent tool로 해당 에이전트를 **1인 실행**합니다.

전달 내용:

```
당신은 {역할}입니다.
아래 질문에 당신의 전문 영역 관점에서 답하세요.

[당신의 정의]
{~/.claude/plugins/onto-review/agents/{agent-id}.md 내용}

[과거 학습 — 방법론]
{~/.claude/agent-memory/methodology/{agent-id}.md 내용. 없으면 "아직 없음"}

[과거 학습 — 도메인]
{도메인 학습 (글로벌 + 프로젝트) 내용. 없으면 "아직 없음"}

[도메인 규칙]
{해당 에이전트의 도메인 문서 내용. 없으면 "도메인 문서 없음"}

[소통 학습]
{공통 + 개별 소통 학습 내용. 없으면 "아직 없음"}

[질문]
{$ARGUMENTS}

[시스템 목적과 원칙]
{CLAUDE.md/README.md 내용}

[지시]
- 핵심 질문을 기준으로, 자신의 전문 영역 관점에서 답하세요.
- 도메인 규칙을 검증 기준에 포함하세요.
- 자신의 전문 영역 밖의 내용은 "이 부분은 {다른 에이전트}의 관점이 필요합니다"로 표기하세요.
- 과거 학습을 참고하되, 현재 질문에 맞지 않는 학습은 무시하세요.

[보고 형식]
답변 마지막에 아래 섹션을 반드시 포함하세요:

### 새로 배운 것
- 소통 학습: (사용자 선호/소통 방식에 대한 발견)
- 방법론 학습: (어떤 도메인에서든 적용 가능한 검증 원칙)
- 도메인 학습: (이 도메인에서만 유효한 학습)
없으면 각각 "없음"으로 표기하세요.
```

### 3. 결과 출력

에이전트의 답변을 사용자에게 전달합니다.
다른 에이전트의 관점이 필요하다고 표기된 항목이 있으면, 사용자에게 알립니다:
"이 질문에 대해 {에이전트명}의 관점도 도움이 될 수 있습니다. `/onto-{dimension} {질문}`으로 추가 확인할 수 있습니다."

### 4. 학습 저장

아래 "학습 저장 규칙"을 따릅니다.

---

## 팀 리뷰 모드

### 1. Context Gathering

리뷰 대상($ARGUMENTS)을 파악합니다.

1. **리뷰 대상 수집**:
   - 파일/디렉토리인 경우: 해당 코드를 읽습니다.
   - 설계/결정인 경우: 관련 문서를 읽습니다.

2. **프로젝트 컨텍스트 수집**:
   - CLAUDE.md, README.md 등에서 시스템 목적과 원칙을 파악합니다.

3. **도메인 판별**:
   - 프로젝트의 도메인을 확인합니다.
   - `~/.claude/agent-memory/domains/{domain}/` 하위 문서를 수집합니다.

4. **에이전트 파일 수집** (8인 각각):
   - 정의: `~/.claude/plugins/onto-review/agents/{agent-id}.md`
   - 방법론 학습: `~/.claude/agent-memory/methodology/{agent-id}.md`
   - 도메인 학습 (글로벌): `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md`
   - 도메인 학습 (프로젝트): `{project}/.claude/learnings/{agent-id}.md`
   - 소통 학습 (공통): `~/.claude/agent-memory/communication/common.md`
   - 소통 학습 (개별): `~/.claude/agent-memory/communication/{agent-id}.md`
   - 파일이 없으면 무시합니다.

### 2. Round 1 — 7인 독립 리뷰

Agent tool로 7인(philosopher 제외)을 **병렬 실행**합니다.
하나의 메시지에서 7개의 Agent tool call을 동시에 보냅니다.

각 에이전트에게 전달할 내용:

```
당신은 {역할}입니다.
아래 내용을 당신의 전문 영역 관점에서 리뷰하세요.

[당신의 정의]
{~/.claude/plugins/onto-review/agents/{agent-id}.md 내용}

[과거 학습 — 방법론]
{~/.claude/agent-memory/methodology/{agent-id}.md 내용. 없으면 "아직 없음"}

[과거 학습 — 도메인]
{도메인 학습 (글로벌 + 프로젝트) 내용. 없으면 "아직 없음"}

[도메인 규칙]
{해당 에이전트의 도메인 문서 내용. 없으면 "도메인 문서 없음"}

[소통 학습]
{공통 + 개별 소통 학습 내용. 없으면 "아직 없음"}

[리뷰 대상]
{리뷰 대상 내용}

[시스템 목적과 원칙]
{CLAUDE.md/README.md 내용}

[지시]
- 핵심 질문 각각에 대해 구체적으로 답하세요.
- 도메인 규칙을 검증 기준에 포함하세요.
- 문제를 발견하면: (1) 무엇이 문제인지, (2) 왜 문제인지, (3) 어떻게 수정해야 하는지를 명시하세요.
- 문제가 없으면 "문제 없음"이 아니라, 왜 올바른지 근거를 제시하세요.
- 다른 에이전트의 관점은 모릅니다. 오직 자신의 관점에서만 판단하세요.
- 과거 학습을 참고하되, 현재 리뷰 대상에 맞지 않는 학습은 무시하세요.

[보고 형식]
리뷰 결과 마지막에 아래 섹션을 반드시 포함하세요:

### 새로 배운 것
- 소통 학습: (사용자 선호/소통 방식에 대한 발견)
- 방법론 학습: (어떤 도메인에서든 적용 가능한 검증 원칙)
- 도메인 학습: (이 도메인에서만 유효한 학습)
없으면 각각 "없음"으로 표기하세요.
```

### 3. Philosopher 종합

7인의 리뷰 결과를 Philosopher 관점에서 종합합니다.
이 단계는 메인 컨텍스트에서 직접 수행합니다 (별도 에이전트 아님).

Philosopher의 정의(`~/.claude/plugins/onto-review/agents/philosopher.md`)와
과거 학습(방법론 + 도메인)도 참고합니다.

종합 형식:

```markdown
## Philosopher 종합

### 합의된 사항
- (7인 중 다수가 동의한 판단)

### 모순되는 의견
- (상충하는 판단 + 각 근거 요약)

### 간과된 전제
- (어떤 에이전트도 언급하지 않았지만 시스템 목적/원칙상 검토가 필요한 사항)

### 미해결 쟁점
- (Round 2에서 각 에이전트가 재검토해야 할 항목)
```

### 4. Round 2 — 7인 재응답

Philosopher 종합을 포함하여 7인을 다시 **병렬 실행**합니다.

```
당신은 {역할}입니다.
Philosopher가 Round 1 리뷰를 종합했습니다.

[당신의 Round 1 리뷰]
{자신의 Round 1 결과}

[Philosopher 종합]
{종합 내용}

[지시]
- Philosopher의 종합을 읽고, 자신의 의견을 유지하거나 수정하세요.
- 모순되는 의견에 대해: 자신의 입장을 근거와 함께 재진술하거나, 상대 의견을 수용하세요.
- 간과된 전제에 대해: 자신의 관점에서 의견을 추가하세요.
- 미해결 쟁점에 대해: 명확한 판단을 제시하세요.
- 최종 판단을 "유지" 또는 "수정(이유)" 형태로 제출하세요.

[보고 형식]
리뷰 결과 마지막에 아래 섹션을 반드시 포함하세요:

### 새로 배운 것 (최종)
- 소통 학습: (사용자 선호/소통 방식에 대한 발견)
- 방법론 학습: (어떤 도메인에서든 적용 가능한 검증 원칙)
- 도메인 학습: (이 도메인에서만 유효한 학습)
없으면 각각 "없음"으로 표기하세요.
```

### 5. 최종 합의 정리

Round 2 결과를 Philosopher 관점에서 최종 종합합니다.

출력 형식:

```markdown
## 8-Agent Panel Review 결과

### 리뷰 대상
{리뷰 대상 요약}

### 합의 (8/8 또는 N/8)
- (전원 합의된 판단 목록)

### 조건부 합의
- (다수 합의 + 소수 유보. 유보 사유 명시)

### 미합의
- (합의에 도달하지 못한 항목. 각 입장 + 근거)

### 즉시 조치 필요
- (합의된 수정 사항 중 바로 반영해야 할 것)

### 권장 사항
- (합의된 개선 사항 중 이후 반영 가능한 것)
```

### 6. 학습 저장

8인 전원의 학습을 저장합니다. 아래 "학습 저장 규칙"을 따릅니다.

---

## 학습 저장 규칙

### 3분류 저장

**소통 학습** (`~/.claude/agent-memory/communication/{agent-id}.md`):
- "소통 학습" 항목 중 "없음"이 아닌 것을 저장합니다.
- 사용자의 소통 선호, 작업 방식, 피드백에 대한 발견입니다.

항목 형식:
```markdown
### {날짜} — {프로젝트명} / {질문/리뷰 대상 요약}

- **맥락**: {어떤 질문/리뷰에서, 어떤 상황에서 발견되었는지}
- **발견 내용**: {사용자 소통에 대해 새로 알게 된 것}
- **반영 여부**: 미반영 (사용자 확인 필요)
```

**방법론 학습** (`~/.claude/agent-memory/methodology/{agent-id}.md`):
- "방법론 학습" 항목을 파일 끝에 추가합니다.
- 도메인에 무관하게 적용 가능한 검증 원칙/교훈입니다.
- 기존 항목과 중복되면 추가하지 않습니다.
- 기존 항목과 모순되면 새 학습으로 교체합니다.

항목 형식:
```markdown
- {학습 내용} (출처: {프로젝트명}, {질문/리뷰 대상 요약}, {날짜})
```

**도메인 학습**:
- 저장 경로 판별:
  - 프로젝트에 `.claude/learnings/` 디렉토리가 존재하면: `{project}/.claude/learnings/{agent-id}.md` (프로젝트 수준)
  - 존재하지 않으면: `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md` (글로벌 수준)
- "도메인 학습" 항목을 파일 끝에 추가합니다.
- 해당 도메인/프로젝트에서만 유효한 학습입니다.
- 동일한 중복/모순 규칙을 적용합니다.

항목 형식:
```markdown
- {학습 내용} (출처: {질문/리뷰 대상 요약}, {날짜})
```

### 저장 후 안내

새로 추가된 communication 항목이 있으면 사용자에게 알립니다:
"communication 발견사항이 N건 기록되었습니다. `~/.claude/agent-memory/communication/`에서 확인하시고, 전역 설정(`~/.claude/CLAUDE.md`)에 반영할지 결정해 주세요."

---

## 코드 기반 온톨로지 구축 프로세스

코드베이스를 7인 에이전트가 다관점으로 분석하여 온톨로지를 구축합니다.
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

Agent tool로 7인(philosopher 제외)을 **병렬 실행**합니다.

각 에이전트에게 전달할 내용:

```
당신은 {역할}입니다.
아래 코드베이스를 분석하여, 당신의 전문 영역 관점에서 온톨로지 요소를 추출하세요.

[당신의 정의]
{~/.claude/plugins/onto-review/agents/{agent-id}.md 내용}

[온톨로지 구조 (schema)]
{schema.yml 내용}

[과거 학습 — 방법론]
{~/.claude/agent-memory/methodology/{agent-id}.md 내용. 없으면 "아직 없음"}

[과거 학습 — 도메인]
{도메인 학습 (글로벌 + 프로젝트) 내용. 없으면 "아직 없음"}

[도메인 규칙]
{해당 에이전트의 도메인 문서 내용. 없으면 "도메인 문서 없음"}

[소통 학습]
{공통 + 개별 소통 학습 내용. 없으면 "아직 없음"}

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
- onto_pragmatics: 실제 사용 패턴, 역량 질문(이 온톨로지로 답할 수 있는 질문), 접근 경로
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
  methodology: {방법론 학습. 없으면 "없음"}
  domain: {도메인 학습. 없으면 "없음"}
```
```

**대상 코드 수집 규칙**:
- $ARGUMENTS가 디렉토리인 경우: 해당 디렉토리 하위의 소스 파일을 재귀적으로 읽습니다.
- $ARGUMENTS가 파일인 경우: 해당 파일만 읽습니다.
- $ARGUMENTS가 없는 경우: 프로젝트의 주요 소스 디렉토리를 자동 탐지합니다 (src/, app/, lib/ 등).
- 바이너리, node_modules, .git, 빌드 산출물은 제외합니다.
- 파일이 너무 많으면 (50개 이상) 사용자에게 범위를 좁힐지 확인합니다.

### Phase 2: Philosopher 종합

7인의 추출 결과를 Philosopher 관점에서 **하나의 Raw Ontology로 통합**합니다.
이 단계는 메인 컨텍스트에서 직접 수행합니다.

Philosopher의 정의(`~/.claude/plugins/onto-review/agents/philosopher.md`)와
과거 학습(방법론 + 도메인)도 참고합니다.

**종합 규칙**:

1. **수렴도 산출**: 각 추출 항목에 대해, 몇 인의 에이전트가 독립적으로 식별했는가를 계산합니다.
   - 동일 개념: 이름이 다르더라도 같은 코드 위치를 참조하거나 의미가 동일하면 하나로 통합합니다.
   - 수렴도 = 해당 항목을 식별한 에이전트 수 / 전체 에이전트 수 (7)

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

7인 전원의 학습을 저장합니다. "학습 저장 규칙"을 따릅니다.

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

---

## 온톨로지 변환 프로세스

Raw Ontology(`.claude/ontology/raw.yml`)를 사용자가 원하는 형식으로 변환합니다.

### 1. 원본 확인

- $ARGUMENTS로 지정된 파일, 또는 `{project}/.claude/ontology/raw.yml`을 읽습니다.
- 파일이 없으면 안내하고 중단합니다: "`/onto-buildfromcode`를 먼저 실행하여 Raw Ontology를 구축해 주세요."
- schema.yml도 함께 읽어 온톨로지 구조를 파악합니다.

### 2. 출력 형식 협의

사용자에게 원하는 출력 형식을 질문합니다:

```markdown
## 변환 형식을 알려주세요

Raw Ontology를 어떤 형식으로 변환할까요?

**예시**:
- Markdown (사람이 읽는 문서)
- Mermaid (시각적 다이어그램)
- YAML (구조화 데이터)
- JSON-LD (Linked Data)
- OWL/RDF (표준 온톨로지)
- Markdown with inline YAML (하이브리드)
- 기타 — 원하는 형식을 설명해 주세요

**추가 옵션**:
- 포함 범위: 전체 / 확정 항목만 / 수렴도 N 이상
- 상세 수준: 근거 포함 / 근거 제외
```

### 3. 변환 실행

사용자가 지정한 형식에 맞춰 raw.yml의 내용을 변환합니다.

**변환 원칙**:
- Raw Ontology의 정보를 목적 형식이 허용하는 범위 내에서 최대한 보존합니다.
- 형식이 허용하지 않아 탈락하는 정보가 있으면 사용자에게 알립니다.
- 수렴도/근거 등 메타데이터는 형식이 지원하면 포함하고, 지원하지 않으면 주석/별도 파일로 분리합니다.

### 4. 저장

- 변환 결과를 `{project}/.claude/ontology/{형식별 파일명}`에 저장합니다.
  - 예: `ontology.md`, `ontology.mermaid`, `ontology.jsonld`, `ontology.owl`
- 파일명이 겹치면 사용자에게 확인합니다.

완료 보고:

```markdown
## 변환 완료

| 항목 | 값 |
|---|---|
| 원본 | {raw.yml 경로} |
| 출력 형식 | {형식} |
| 포함 범위 | {전체 / 확정만 / ...} |
| 탈락 정보 | {있으면 명시 / 없음} |

저장 경로: `.claude/ontology/{파일명}`
```

---

## 온보딩 프로세스

프로젝트에 onto-review 환경을 설정합니다.

### 1. 현황 진단

다음 항목을 순서대로 확인합니다:

| 확인 항목 | 경로 | 상태값 |
|---|---|---|
| 프로젝트 학습 디렉토리 | `{project}/.claude/learnings/` | 존재 / 미존재 |
| 도메인 선언 | `{project}/CLAUDE.md` 내 `domain:` 또는 `agent-domain:` | 선언됨 / 미선언 |
| 글로벌 도메인 문서 | `~/.claude/agent-memory/domains/{domain}/` | 존재 / 미존재 / 해당없음(도메인 미선언) |
| 글로벌 에이전트 메모리 | `~/.claude/agent-memory/` 하위 디렉토리들 | 존재하는 파일 목록 |

### 2. 사용자 확인

진단 결과를 아래 형식으로 보여주고 진행 여부를 확인합니다:

```markdown
## Onto Review 온보딩 진단

| 항목 | 상태 | 조치 |
|---|---|---|
| 프로젝트 학습 디렉토리 | {상태} | {생성 예정 / 이미 존재} |
| 도메인 선언 | {상태} | {질문 예정 / 이미 선언: {domain}} |
| 글로벌 도메인 문서 | {상태} | {안내 예정 / 이미 존재} |

진행할까요?
```

### 3. 환경 설정

사용자가 승인하면 다음을 실행합니다:

**3.1 프로젝트 학습 디렉토리 생성**
- `.claude/learnings/` 디렉토리가 없으면 생성합니다.
- `.claude/learnings/.gitkeep` 파일을 생성합니다 (빈 디렉토리의 Git 추적용).

**3.2 도메인 설정**
- CLAUDE.md에 `domain:` 선언이 없으면 사용자에게 질문합니다:
  "이 프로젝트의 도메인을 알려주세요. (예: `healthcare`, `fintech`, `e-commerce`) 도메인 규칙 없이 범용 원칙만으로 검증하려면 '없음'이라고 답해주세요."
- 사용자가 도메인을 지정하면, CLAUDE.md에 `domain: {domain}` 줄을 추가합니다.
- 보조 도메인이 있는지도 확인합니다: "보조 도메인이 있나요? (예: healthcare 프로젝트이지만 fintech 규칙도 일부 적용) 없으면 '없음'이라고 답해주세요."
- 보조 도메인이 있으면 `secondary_domains: {domain1}, {domain2}` 줄을 추가합니다.

**3.3 글로벌 도메인 문서 확인**
- 지정된 도메인의 글로벌 문서(`~/.claude/agent-memory/domains/{domain}/`)가 없으면 안내합니다:
  "도메인 `{domain}`의 글로벌 규칙 문서가 아직 없습니다. 리뷰/질문을 반복하면서 학습이 자동으로 축적됩니다. 별도의 도메인 규칙을 미리 정의하고 싶으시면 말씀해 주세요."

### 4. 완료 보고

```markdown
## Onboard 완료

| 항목 | 결과 |
|---|---|
| `.claude/learnings/` | {생성됨 / 이미 존재} |
| 도메인 | {domain / 없음 (범용 모드)} |
| 보조 도메인 | {domains / 없음} |
| 글로벌 도메인 문서 | {N개 존재 / 미존재 (자동 축적 예정)} |

### 다음 단계
- `/onto-review {대상}` — 8인 패널 리뷰 실행
- `/onto-{dimension} {질문}` — 개별 전문가 질문
- 학습이 쌓이면 `/promote-learnings` — 프로젝트 학습을 글로벌에 반영
```

---

## 학습 승격 프로세스

프로젝트 수준 도메인 학습(`{project}/.claude/learnings/`)을 검수하여 글로벌 수준(`~/.claude/agent-memory/domains/{domain}/learnings/`)으로 승격합니다.

### 전제 조건

- `{project}/.claude/learnings/` 디렉토리가 존재해야 합니다.
- CLAUDE.md에 `domain:`이 선언되어 있어야 합니다.
- 프로젝트 학습 파일이 1개 이상 존재해야 합니다.
- 조건 미충족 시 사용자에게 안내하고 중단합니다.

### 1. 대상 수집

**$ARGUMENTS가 있는 경우**: 지정된 에이전트의 학습 파일만 수집합니다.
- 예: `/promote-learnings onto_logic` → `{project}/.claude/learnings/onto_logic.md`만 대상

**$ARGUMENTS가 없는 경우**: `.claude/learnings/` 하위의 모든 `*.md` 파일을 수집합니다.

각 파일에 대해:
- 프로젝트 학습: `{project}/.claude/learnings/{agent-id}.md`의 각 항목
- 글로벌 학습: `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md`의 기존 항목

### 2. 사전 분석

각 프로젝트 학습 항목을 글로벌 학습과 대조하여 분류합니다:

| 분류 | 기준 | 처리 |
|---|---|---|
| **중복** | 글로벌에 동일 내용이 이미 존재 | 승격 대상에서 제외 |
| **모순** | 글로벌의 기존 항목과 상충 | 검수 시 명시적 판단 필요 |
| **신규** | 글로벌에 없는 새로운 학습 | 승격 후보 |

### 3. 일반화 가능성 검수

승격 후보(신규 + 모순)를 3인 에이전트 패널로 검수합니다.
Agent tool로 3인을 **병렬 실행**합니다.

**검수 에이전트 선정**:
- 해당 학습을 생성한 에이전트 본인
- `philosopher` (종합 관점)
- 학습 내용과 가장 관련 깊은 다른 에이전트 1인 (자동 선정)

각 검수 에이전트에게 전달할 내용:

```
당신은 {역할}입니다.
아래 프로젝트 수준 학습을 글로벌(도메인 수준)로 승격할지 검수해 주세요.

[도메인]
{domain}

[승격 후보 항목]
{항목 목록 — 각 항목에 신규/모순 태그 포함}

[글로벌 기존 학습]
{해당 에이전트의 글로벌 학습 전문}

[판단 기준]
1. 일반화 가능성: 이 학습이 이 프로젝트에서만 유효한가, 같은 도메인의 다른 프로젝트에서도 유효한가?
2. 정확성: 학습 내용이 사실에 기반하는가, 특수한 상황에서의 우연이 아닌가?
3. 모순 처리: 기존 글로벌 학습과 모순되는 경우, 어느 쪽이 더 일반적으로 올바른가?

[보고 형식]
각 항목에 대해:
- 판정: 승격 / 보류 / 기각
- 사유: (1문장)
- 모순 항목인 경우: 글로벌 기존 항목을 교체할지, 보류할지
```

### 4. 합의 판정

3인의 결과를 종합합니다:

| 합의 | 처리 |
|---|---|
| 3/3 승격 | 자동 승격 후보 |
| 2/3 승격 | 승격 후보 (소수 의견 첨부) |
| 2/3 이상 보류 | 보류 |
| 2/3 이상 기각 | 기각 |

**모순 항목**: 합의와 관계없이 반드시 사용자 확인을 거칩니다.

### 5. 사용자 승인

판정 결과를 사용자에게 제시합니다:

```markdown
## 학습 승격 검수 결과

### 도메인: {domain}
### 대상 에이전트: {agent-id 목록}

---

### 승격 권장 (N건)
| # | 에이전트 | 학습 내용 | 합의 | 비고 |
|---|---|---|---|---|
| 1 | {agent} | {내용 요약} | 3/3 | |
| 2 | {agent} | {내용 요약} | 2/3 | 소수 의견: {사유} |

### 모순 — 사용자 판단 필요 (N건)
| # | 에이전트 | 프로젝트 학습 | 글로벌 기존 | 패널 권장 |
|---|---|---|---|---|
| 1 | {agent} | {프로젝트 항목} | {글로벌 항목} | {교체/보류} |

### 보류 (N건)
| # | 에이전트 | 학습 내용 | 사유 |
|---|---|---|---|

### 기각 (N건)
| # | 에이전트 | 학습 내용 | 사유 |
|---|---|---|---|

---

승격을 진행할 항목 번호를 알려주세요. (예: "승격 전체", "승격 1,3", "모순 1번은 교체")
```

### 6. 승격 실행

사용자가 승인한 항목만 처리합니다:

- **신규 승격**: 항목을 `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md` 끝에 추가합니다.
  - 출처를 `(출처: {프로젝트명}에서 승격, {원래 출처}, {승격 날짜})`로 변경합니다.
- **모순 교체**: 글로벌의 기존 항목을 새 항목으로 교체합니다.
  - 교체된 항목은 `<!-- 교체됨 ({날짜}): {원래 내용} -->` 형태로 주석 보존합니다.
- **프로젝트 학습 정리**: 승격된 항목에 `(→ 글로벌 승격 완료, {날짜})` 태그를 붙입니다. 삭제하지 않습니다.

### 7. 완료 보고

```markdown
## 승격 완료

| 처리 | 건수 |
|---|---|
| 승격 (신규) | N건 |
| 승격 (교체) | N건 |
| 보류 | N건 |
| 기각 | N건 |
| 중복 (사전 제외) | N건 |

글로벌 학습 경로: `~/.claude/agent-memory/domains/{domain}/learnings/`
```

---

## Rules

- 모든 에이전트는 한국어(존댓말)로 답변합니다.
- 에이전트는 비유/은유를 사용하지 않습니다. 직접 설명합니다.
- 기술 용어는 유지하고 설명을 붙입니다.
- 팀 리뷰 모드에서 만장일치에 도달해도, 합의의 **논리적 근거**를 별도로 검증합니다.
- 질문/리뷰 대상이 불명확하면 사용자에게 질문합니다.
- 학습 파일이 200행을 초과하면, 사용자에게 알립니다. 정리 여부와 범위는 사용자가 결정합니다.
- 도메인 문서가 존재하지 않는 프로젝트에서는, 에이전트가 도메인 규칙 없이 범용 원칙만으로 검증합니다.
