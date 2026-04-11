# BUG: Subagent Fallback on First Install

## 현상

onto 플러그인을 처음 설치한 환경에서 `/onto:review`, `/onto:build` 등을 실행하면, Agent Teams(TeamCreate)를 시도하지 않고 항상 subagent(Agent tool) fallback으로 실행된다. 사용자(=주체자)가 "Agent Teams를 사용하라"고 명시적으로 지시해야 그 다음부터 Agent Teams로 전환된다.

## 재현 조건

- 새 프로젝트에서 `/onto:onboard` 후 첫 `/onto:review` 실행
- 또는 새 대화 세션에서 첫 onto 프로세스 실행

## 근본 원인

### 1. TeamCreate는 Claude Code의 deferred tool

Claude Code의 tool 시스템에서 TeamCreate, SendMessage, TeamDelete는 **deferred tool**로 분류된다. Deferred tool은 대화 시작 시 스키마가 로드되지 않으며, `ToolSearch` 도구를 사용해 명시적으로 fetch해야 호출 가능하다.

```
[Claude Code tool 분류]
- 기본 로드: Read, Write, Edit, Glob, Grep, Bash, Agent, ...
- Deferred (ToolSearch 필요): TeamCreate, SendMessage, TeamDelete, WebFetch, ...
```

### 2. process.md가 TeamCreate의 사용 가능성을 가정

process.md의 "Team Creation" 섹션(line 304-316):
```
When executing TeamCreate, generate a session ID...
Before TeamCreate, check whether an existing team exists...
```

TeamCreate를 직접 참조하지만, **ToolSearch로 먼저 fetch하라는 지시가 없다.** LLM은 TeamCreate의 스키마를 모르므로 호출할 수 없다.

### 3. Agent tool은 항상 사용 가능

Agent tool은 기본 로드 도구이므로 ToolSearch 없이 즉시 사용 가능하다. LLM은 TeamCreate를 모르는 상태에서 Agent tool로 동일한 결과를 달성할 수 있으므로, 저항 없이 Agent tool을 선택한다.

### 4. Fallback 조건과 실제 동작의 불일치

```
[process.md가 정의한 fallback 조건]
"When TeamCreate fails, fall back to the Agent tool (subagent) approach."

[실제 발생하는 동작]
TeamCreate 스키마를 모름 → 시도 자체를 안 함 → Agent tool 직접 사용

→ "실패(fail)"가 아니라 "부재(absent)"이므로 fallback 조건에 해당하지 않음.
→ LLM은 fallback을 의식적으로 선택한 것이 아니라, 유일하게 아는 도구를 사용한 것.
```

## 영향

- Agent Teams의 장점(에이전트 간 직접 통신, Deliberation, 팀 생명주기 관리)이 비활성화됨
- Philosopher가 검증 에이전트와 직접 deliberation 불가 → 모든 리뷰가 "deliberation not needed"로 단축됨
- 사용자(=주체자)가 수동으로 개입해야 Agent Teams 활성화 → 일관성 없는 사용 경험

## 수정 제안

### Option A: process.md에 ToolSearch 지시 추가 (최소 변경)

process.md의 "Team Creation" 섹션 시작 부분에 다음을 추가:

```markdown
#### Tool Availability Check (필수 — Team Creation 전 실행)

TeamCreate, SendMessage, TeamDelete는 deferred tool일 수 있다.
Team Creation 전에 반드시 다음을 실행한다:

ToolSearch("select:TeamCreate,SendMessage,TeamDelete")

ToolSearch 실패 시(도구가 존재하지 않는 환경) → Fallback Rules 적용.
ToolSearch 성공 시 → TeamCreate로 진행.
```

### Option B: 각 프로세스 파일의 Team Creation 단계에 개별 추가

review.md, build.md, promote.md 각각의 "Team creation via TeamCreate" 단계에:

```markdown
**Step 2.5 — Tool availability check**:
Run `ToolSearch("select:TeamCreate,SendMessage,TeamDelete")` to ensure Agent Teams tools are available.
If unavailable, apply Fallback Rules from process.md.
```

### Option C: skill 파일(commands/*.md)에 pre-flight check 추가

각 command 파일이 프로세스 파일을 로드하기 전에 ToolSearch를 실행하도록:

```markdown
# Pre-flight: Ensure Agent Teams tools are available
Before reading process files, run:
ToolSearch("select:TeamCreate,SendMessage,TeamDelete")
```

## 권장: Option A

이유:
1. 단일 수정 지점 (process.md만 변경)
2. 모든 프로세스에 일괄 적용
3. 기존 fallback 로직과 자연스럽게 연결

## 관련 파일

| 파일 | 수정 필요 여부 |
|------|-------------|
| `process.md` | **수정 필요** — Team Creation 섹션에 ToolSearch 지시 추가 |
| `processes/review.md` | Option B 선택 시 수정 |
| `processes/build.md` | Option B 선택 시 수정 |
| `processes/promote.md` | Option B 선택 시 수정 |
| `README.md` | 설치 후 주의사항에 deferred tool 언급 추가 권장 |
| `BLUEPRINT.md` | Section 7.1에 deferred tool 전제조건 추가 권장 |

## 발견 일자

2026-03-30, AI-data-dashboard 프로젝트에서 onto:build + onto:review 실행 시 관찰.
