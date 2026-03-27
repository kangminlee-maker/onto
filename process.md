# Agent Process — 공통 정의

각 프로세스 파일(`processes/`)이 참조하는 공통 정의.

**현재 시스템 단계: 축적기** — 학습 축적이 우선이며, 프로세스 세분화(promote 분리 등)는 실행 경험이 충분히 쌓인 성숙기에 검토합니다. promote를 1회 이상 실행한 후, 실제 마찰을 기반으로 구조 변경을 판단합니다.

## 프로세스 맵

| 프로세스 | 파일 | 설명 | 관련 프로세스 |
|---|---|---|---|
| 온보딩 | `processes/onboard.md` | 프로젝트에 onto-review 환경 설정 | → 리뷰, 질문 |
| 개별 질문 | `processes/question.md` | 1인 에이전트에게 질문 | 학습 → 승격 |
| 팀 리뷰 | `processes/review.md` | 에이전트 패널 리뷰 (Agent Teams) | 학습 → 승격 |
| 온톨로지 구축 | `processes/build.md` | 분석 대상에서 온톨로지 구축 (Agent Teams) | → 변환, 리뷰 |
| 변환 | `processes/transform.md` | Raw Ontology 형식 변환 | 구축 → |
| 학습 승격 | `processes/promote.md` | 프로젝트 학습을 글로벌로 승격 (Agent Teams) | 리뷰/질문 → |

---

## 에이전트 구성

### 설계 원칙

이 에이전트들은 MECE 분류가 아닌, 경험적으로 유효한 독립 검증 관점의 집합입니다. 단일 분류 축을 의도적으로 사용하지 않으며, 각 관점의 유지 정당성은 고유 탐지 영역의 존재 여부로 검증합니다.

### 검증 에이전트
| ID | 역할 | 검증 차원 |
|---|---|---|
| `onto_logic` | 논리적 일관성 검증자 | 모순, 타입 충돌, 제약 상충 |
| `onto_structure` | 구조적 완전성 검증자 | 고립된 요소, 끊어진 경로, 누락 관계 |
| `onto_dependency` | 의존성 무결성 검증자 | 순환, 역방향, 다이아몬드 의존 |
| `onto_semantics` | 의미적 정확성 검증자 | 이름-의미 일치, 동의어/동형이의어 |
| `onto_pragmatics` | 활용 적합성 검증자 | 질의 가능성, 역량 질문 테스트 |
| `onto_evolution` | 확장·진화 적합성 검증자 | 새 데이터/도메인 추가 시 깨짐 |
| `onto_coverage` | 도메인 포괄성 검증자 | 누락 하위 영역, 개념 편중, 표준 대비 빈 영역 |
| `onto_conciseness` | 간결성 검증자 | 중복 정의, 과잉 명세, 불필요한 구분 |

### 검증 차원 포괄성 체크리스트

에이전트 구성의 포괄성을 확인하기 위한 메타 도구입니다. 에이전트 구성 축이 아니라, 현재 에이전트들이 모든 검증 차원을 빠짐없이 포괄하는지 확인하는 참조 프레임입니다.

| 검증 차원 | 검증 질문 | 포괄 에이전트 | 표준 프레임워크 대응 |
|-----------|----------|-------------|-------------------|
| 형식적 정합성 | 정의 간 모순이 없는가? | onto_logic, onto_dependency | Gomez-Perez: Consistency, Obrst: L4 |
| 의미적 정확성 | 각 개념이 대상을 정확히 표현하는가? | onto_semantics | Obrst: L1, OntoClean: Rigidity/Identity |
| 구조적 완전성 | 내부 연결이 빠짐없이 존재하는가? | onto_structure | Obrst: L2-L3, Gomez-Perez: Completeness (내부) |
| 도메인 포괄성 | 모든 관련 개념이 표현되었는가? | onto_coverage | Gomez-Perez: Completeness (외부) |
| 최소성 | 불필요한 요소가 없는가? | onto_conciseness | Gomez-Perez: Conciseness |
| 화용적 적합성 | 실제 사용 목적에 부합하는가? | onto_pragmatics | Brank: Application-based |
| 진화 적응성 | 변경 시 적응할 수 있는가? | onto_evolution | — |

> 검증 차원과 에이전트는 다대다(N:M) 관계입니다. 에이전트는 "독립 관점 집합"이므로, 한 에이전트가 여러 차원을 포괄하거나 한 차원이 여러 에이전트에 걸칠 수 있습니다.

### 목적 정합성 검증자 (1인)
| ID | 역할 |
|---|---|
| `philosopher` | 시스템 목적 기반 메타 관점 제공, 검증 에이전트들의 판단을 목적 관점에서 종합·재정의, 새로운 관점 제시 |

### 도메인 문서
각 에이전트는 실행 시 해당 도메인의 문서를 읽습니다 (파일이 없으면 범용 원칙으로 검증):

| 유형 | 문서 | 에이전트 | 부재 시 영향 | 갱신 방식 |
|---|---|---|---|---|
| **범위 정의형** | `domain_scope.md` | onto_coverage | 역할 무력화 | promote 제안 → 사용자 승인 |
| **축적 가능형** | `concepts.md` | onto_semantics | 성능 저하 (학습으로 보완) | promote 제안 → 사용자 승인 |
| **축적 가능형** | `competency_qs.md` | onto_pragmatics | 성능 저하 (학습으로 보완) | promote 제안 → 사용자 승인 |
| **규칙 정의형** | `logic_rules.md` | onto_logic | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성/수정 |
| **규칙 정의형** | `structure_spec.md` | onto_structure | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성/수정 |
| **규칙 정의형** | `dependency_rules.md` | onto_dependency | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성/수정 |
| **규칙 정의형** | `extension_cases.md` | onto_evolution | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성/수정 |
| **규칙 정의형** | `conciseness_rules.md` | onto_conciseness | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성/수정 |

경로: `~/.claude/agent-memory/domains/{domain}/`

**도메인 문서 보호 원칙**: 도메인 문서는 사용자의 **명시적 승인 없이 자동 수정되지 않습니다.** promote 7단계의 갱신 제안, onboard의 초안 생성 모두 사용자 확인을 거칩니다. 에이전트가 리뷰/질문 실행 중 도메인 문서를 직접 수정하는 것은 금지됩니다. 도메인 문서는 프로젝트별 학습과 구분되는 **도메인 수준의 합의된 기준**이며, 특정 프로젝트의 특화 내용이 아닌 도메인 전체에 적용되는 범용 기준만 포함합니다.

### 도메인 판별 규칙

1. **플러그인 설정 우선**: 프로젝트의 `.onto-review/config.yml`에 `domain:` 선언이 있으면 해당 도메인을 사용합니다.
2. **CLAUDE.md 하위 호환**: `.onto-review/config.yml`이 없거나 `domain:`이 없으면, CLAUDE.md의 `domain:` 또는 `agent-domain:` 선언을 사용합니다.
3. **다중 도메인**: `secondary_domains:`가 선언되어 있으면(config.yml 또는 CLAUDE.md), 주 도메인 문서를 우선 참조하고, 보조 도메인 문서를 추가로 참조합니다. 규칙이 충돌하면 주 도메인이 우선합니다.
4. **선언 없음**: 어디에도 도메인 선언이 없으면 사용자에게 질문합니다.
5. **도메인 문서 없음**: 선언된 도메인의 문서(`~/.claude/agent-memory/domains/{domain}/`)가 존재하지 않으면, 도메인 규칙 없이 범용 원칙만으로 검증합니다.
6. **도메인 확장 시 에이전트 재평가**: 아래 조건에 해당하는 도메인에 진입하면, 에이전트 구성의 재평가가 필요합니다.

| 조건 | 이유 | 재평가 대상 |
|------|------|------------|
| 인간/집단을 분류하는 도메인 (의료, 교육, 법률, HR) | 윤리학/가치론의 검증이 필요 — "이 분류가 특정 집단에 불이익을 주는가" | 규범적 판단 에이전트 추가 검토 |
| 금융/행정 도메인 | 사회적 존재론의 비중 증가 — 제도적 구성물의 존재 방식이 핵심 | onto_semantics의 존재 유형 검증 비중 조정 |

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

## Agent Teams 실행 방식

병렬 에이전트 실행이 필요한 프로세스(팀 리뷰, 코드 기반 구축, 학습 승격)는 **Agent Teams**를 우선 사용합니다.

### Fallback 규칙

TeamCreate 실패 시, Agent tool(subagent) 방식으로 fallback합니다. 프로세스의 **목적과 출력 형식**은 동일하되, 실행 방식은 다릅니다:
- TeamCreate/SendMessage 대신 Agent tool을 사용합니다.
- 각 Agent tool call에 에이전트 정의 + 컨텍스트 + 작업 지시를 합쳐서 전달합니다. (teammate가 자기 로딩할 수 없으므로 team lead가 내용을 직접 포함)
- **파일 기반 전달은 동일하게 적용합니다**: subagent도 Write 도구로 결과를 파일에 저장하고, team lead에게는 경로만 반환합니다. Philosopher subagent도 Read 도구로 파일을 직접 읽습니다.
- 쟁점 토론(직접 SendMessage)은 생략합니다. Philosopher가 "쟁점 토론 필요"로 판정하더라도, 미합의 항목은 그대로 최종 보고에 포함합니다.
- Fallback 시 team lead가 각 Agent tool call에 포함해야 하는 내용: 에이전트 정의 + 방법론 학습 + 도메인 문서 + 도메인 학습 + 소통 학습 + 작업 지시 + **세션 경로**. (자기 로딩이 불가능하므로 모든 컨텍스트를 직접 포함)

### 에러 처리 규칙

에러를 2가지로 분류하여 대응합니다:
- **프로세스 중단형**: 리뷰 대상 읽기 실패, 에이전트 정의 파일 읽기 실패 → 프로세스 중단 + 사용자 안내.
- **graceful degradation형**: teammate 미응답/실패, 학습 파일 부재, 도메인 문서 부재 → 해당 에이전트를 제외하거나 "아직 없음"으로 처리하고 나머지로 계속 진행. 합의 판정 시 분모를 조정.

**프로세스별 에러 처리 확장**: 각 프로세스에서 대체 불가능한 단일 역할(예: build의 Explorer, Philosopher)이 실패하면 프로세스 중단형으로 분류합니다. 해당 프로세스 파일에 명시합니다.

### 팀 생명주기 관리

#### 팀 생성

TeamCreate 시 세션 ID를 생성하고, 이를 team_name과 세션 디렉토리에 동일하게 사용합니다.

**세션 ID 형식**: `{YYYYMMDD}-{hash8}`
- `YYYYMMDD`: 생성 날짜 (시간 순서 파악용)
- `hash8`: 8자리 랜덤 해시 (충돌 방지, 추적 식별자)
- 생성 방법: `$(date +%Y%m%d)-$(openssl rand -hex 4)` (예: `20260325-a3f7b2c1`)

**team_name**: `{프로세스 이름}-{세션 ID}` (예: `onto-review-20260325-a3f7b2c1`)
**세션 디렉토리**: `{project}/.onto-review/{프로세스}/{세션 ID}/`

TeamCreate 전에 `~/.claude/teams/{프로세스 이름}-*` 패턴으로 기존 팀이 있는지 확인합니다. 있으면 사용자에게 안내합니다.

#### 팀 종료 절차 (필수 준수)

1. **전원 shutdown 확인**: 모든 teammate에게 shutdown_request를 **개별 SendMessage로** 전송합니다 (구조화된 메시지는 `to: "*"` 브로드캐스트 불가).
2. **응답 대기**: 각 teammate의 shutdown_approved를 확인합니다.
3. **미응답 처리**: 30초 내 미응답 시 재전송합니다 (최대 3회).
4. **전원 종료 후 TeamDelete**: 모든 teammate가 종료된 후에만 TeamDelete를 실행합니다.

**금지 사항**:
- `rm -rf ~/.claude/teams/{team}/` 등 팀 디렉토리의 수동 삭제는 **금지**합니다. 에이전트 프로세스가 살아남아 다른 세션의 작업을 수신하고, 현재 세션에 무관한 결과를 보고하는 크로스 세션 오염이 발생합니다.
- TeamDelete가 "active member" 오류로 실패하면, 미종료 에이전트에 shutdown_request를 재전송합니다. 그래도 실패하면 사용자에게 수동 정리를 안내합니다.

#### 고아 팀/파일 정리

`~/.claude/teams/`에 이전 세션의 팀 디렉토리가 남아 있을 수 있습니다. 팀 생성 전에 기존 팀을 확인합니다.

**team lead의 행동 규칙**:
1. `ls ~/.claude/teams/{프로세스 이름}-*`로 기존 팀 존재 여부만 확인합니다.
2. 기존 팀이 발견되면 사용자에게 안내합니다: "이전 세션의 팀 `{팀명}`이 남아 있습니다. 정리가 필요하면 `! rm -rf ~/.claude/teams/{팀명} ~/.claude/tasks/{팀명}` 을 실행해 주세요."
3. **team lead가 직접 삭제(rm, rm -rf 등)를 시도하지 않습니다.** `~/.claude/` 경로의 파일을 Bash로 생성·수정·삭제하는 것은 민감 경로 권한 질문을 유발하며, 사용자 경험을 저해합니다.
4. 사용자가 정리를 완료하면(또는 무시하면) 새 팀을 생성합니다.

### Team lead 역할: 구조 조율자

team lead는 **구조 조율자**입니다. 각 에이전트의 작업 내용이 아니라, 작업 간 관계와 전체 방향성을 관리합니다.

**의사결정 단계** (Context Gathering):
- 리뷰 대상 파악, 도메인 판별, 프로세스 흐름 결정 — 판단이 허용됩니다.

**전달 단계** (Round 1 이후):
- 수집한 결과를 전달할 때 내용을 수정하거나 요약하지 않는다.
- 자신의 판단을 리뷰에 개입시키지 않는다.
- teammate 간 결과를 교차 공유하지 않는다 (독립성 보장).
  - **build 모드 예외**: build 프로세스의 anonymized wip 공유 규칙은 `processes/build.md`를 참조합니다.

**생명주기 관리**: 생성 → 작업 할당 → 에러 처리 → **전원 shutdown 확인** → 종료.

### Teammate 초기 prompt 템플릿

각 teammate 생성 시 (Agent tool의 prompt), 정체성 설정 + 자기 로딩 + **Round 1 작업 지시**를 하나의 prompt에 통합합니다. teammate는 생성 즉시 작업을 시작합니다.

team lead는 Context Gathering에서 확보한 **도메인명**, **플러그인 경로**, **리뷰 대상**, **시스템 목적**을 resolve하여 변수를 채웁니다.

```
당신은 {역할}입니다.
{팀명} 팀에 참여합니다.

[당신의 정의]
{~/.claude/plugins/onto-review/roles/{agent-id}.md 내용}

[컨텍스트 자기 로딩]
아래 파일들을 직접 읽고 자신의 컨텍스트를 구성하세요. 파일이 없으면 무시하세요:
1. 방법론 학습: ~/.claude/agent-memory/methodology/{agent-id}.md
2. 도메인 문서: ~/.claude/agent-memory/domains/{domain}/{해당 도메인 문서}
3. 도메인 학습 (글로벌): ~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md
4. 도메인 학습 (프로젝트): {project}/.onto-review/learnings/{agent-id}.md
5. 소통 학습 (공통): ~/.claude/agent-memory/communication/common.md
6. 소통 학습 (개별): ~/.claude/agent-memory/communication/{agent-id}.md

[에이전트-도메인 문서 매핑]
| agent-id | 도메인 문서 |
|---|---|
| onto_logic | logic_rules.md |
| onto_structure | structure_spec.md |
| onto_dependency | dependency_rules.md |
| onto_semantics | concepts.md |
| onto_pragmatics | competency_qs.md |
| onto_evolution | extension_cases.md |
| onto_coverage | domain_scope.md |
| onto_conciseness | conciseness_rules.md |
| explorer | (없음) |
| philosopher | (없음) |

[작업 지시]
{프로세스별 작업 지시 — 리뷰 대상, 시스템 목적, 구체적 지시사항}
{build 프로세스인 경우: certainty 등급(observed, rationale-absent, inferred, ambiguous, not-in-source)의 정의는 processes/build.md의 "Certainty 분류 (2단계 판정)" 섹션이 SSOT입니다.}

[팀 규칙]
- 리뷰 결과를 {세션 경로}/round1/{agent-id}.md에 Write 도구로 저장하세요.
- 저장 완료 후, team lead에게 **파일 경로만** 보고하세요. 리뷰 원문을 메시지에 포함하지 마세요.
- Write 실패 시에만 SendMessage로 원문을 직접 보고하세요.
- team lead가 허용하기 전에는 다른 teammate에게 직접 메시지를 보내지 마세요.
- 한국어(존댓말)로 답변하세요.
- 비유/은유를 사용하지 마세요.
```

**에이전트 정의**(roles/{agent-id}.md)는 team lead가 읽어서 초기 prompt에 직접 포함합니다 (에이전트당 ~14행, 부담 경미). 나머지 컨텍스트는 teammate가 자기 로딩합니다.

---

## 학습 저장 규칙

### 3분류 저장

**소통 학습**:
- `~/.claude/agent-memory/communication/common.md` (공통): 모든 에이전트에 적용되는 소통 규칙. 팀 리뷰에서 발견된 사항은 여기에 저장합니다.
- `~/.claude/agent-memory/communication/{agent-id}.md` (개별): 특정 에이전트의 소통 선호. 개별 질문(`/onto-{dimension}`)에서 발견된 사항만 여기에 저장합니다.
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

**분류 판별 규칙**: 학습 내용에 특정 기술 스택, 프레임워크, 도메인 고유 패턴(예: "이벤트 소싱", "barrel export", "IFRS")이 언급되어 있으면 **도메인 학습으로 분류**합니다. 방법론 학습은 "어떤 도메인에서든 적용 가능한 원칙"만 포함합니다.

**분류 자기 검증** (methodology 저장 전 필수): 방법론 학습으로 분류한 항목이 실제로 도메인 무관한지 저장 전에 자기 검증합니다. "이 학습에서 특정 기술 스택/프레임워크/도메인 용어를 제거해도 원칙이 성립하는가?" — 성립하면 방법론, 성립하지 않으면 도메인 학습으로 재분류합니다. methodology는 검수 없이 글로벌에 직접 저장되므로, 이 자기 검증이 유일한 품질 게이트입니다.

항목 형식:
```markdown
- [{유형}] {학습 내용} (출처: {프로젝트명}, {도메인}, {날짜})
```

`{유형}` 태그:
- `사실`: 정의, 구조, 관계에 대한 객관적 기술. 축적해도 판단 편향을 유발하지 않음.
- `판단`: "이 패턴은 문제이다/아니다", "이 구조는 허용된다" 등의 가치 판단. 맥락 변화에 따라 유효성이 달라질 수 있으므로 재검증 대상.

**도메인 학습**:
- 저장 경로 판별:
  - 프로젝트에 `.onto-review/learnings/` 디렉토리가 존재하면: `{project}/.onto-review/learnings/{agent-id}.md` (프로젝트 수준)
  - 존재하지 않으면: `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md` (글로벌 수준)
- "도메인 학습" 항목을 파일 끝에 추가합니다.
- 해당 도메인/프로젝트에서만 유효한 학습입니다.
- 동일한 중복/모순 규칙을 적용합니다.

항목 형식:
```markdown
- [{유형}] {학습 내용} (출처: {질문/리뷰 대상 요약}, {날짜})
```

### 학습 검증 규칙

학습이 에이전트 판단에 투입될 때, 다음 검증을 수행합니다:

**출처 태깅 검증** (필수):
- 학습 항목의 출처(프로젝트명, 도메인)와 현재 리뷰 대상의 도메인이 일치하는지 확인합니다.
- 불일치하는 학습에는 `[다른 도메인 출처]` 태그를 붙여, 에이전트가 적용 여부를 판단할 수 있게 합니다.

**판단 학습 재검증** (권장):
- `[판단]` 유형의 학습이 10건 이상 축적된 에이전트는, `/onto-promotelearnings` 실행 시 기존 판단 학습의 유효성을 재검증합니다.
- 재검증 기준: 이 판단이 현재 맥락에서도 여전히 유효한가? 과거 판단에 매몰되어 현재 대상의 목적을 놓치고 있지 않은가?

### 저장 후 안내

새로 추가된 communication 항목이 있으면 사용자에게 알립니다:
"communication 발견사항이 N건 기록되었습니다. `~/.claude/agent-memory/communication/`에서 확인하시고, 전역 설정(`~/.claude/CLAUDE.md`)에 반영할지 결정해 주세요."

---

## Rules

- 모든 에이전트는 한국어(존댓말)로 답변합니다.
- 에이전트는 비유/은유를 사용하지 않습니다. 직접 설명합니다.
- 기술 용어는 유지하고 설명을 붙입니다.
- 팀 리뷰 모드에서 만장일치에 도달해도, 합의의 **논리적 근거**를 별도로 검증합니다.
- 질문/리뷰 대상이 불명확하면 사용자에게 질문합니다.
- 학습 파일이 200행을 초과하면, 사용자에게 알립니다. 정리 여부와 범위는 사용자가 결정합니다.
- 도메인 문서가 존재하지 않는 프로젝트에서는, 에이전트가 도메인 규칙 없이 범용 원칙만으로 검증합니다.
