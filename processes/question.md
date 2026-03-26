# 개별 질문 모드

> 1인 에이전트에게 특정 관점의 질문을 합니다. Agent Teams 없이 Agent tool(subagent)로 실행합니다.
> 관련: 여러 관점이 필요하면 `/onto-review`로 팀 리뷰 실행. 학습이 쌓이면 `processes/promote.md`로 승격 가능.

### 1. Context Gathering

`process.md`의 **에러 처리 규칙**을 따릅니다: 에이전트 정의/질문 대상 읽기 실패 시 프로세스 중단. 학습/도메인 문서 부재 시 "아직 없음"으로 처리하고 계속 진행.

1. **에이전트 파일 수집**:
   - 정의: `~/.claude/plugins/onto-review/roles/{agent-id}.md`
   - 방법론 학습: `~/.claude/agent-memory/methodology/{agent-id}.md`
   - 소통 학습 (공통): `~/.claude/agent-memory/communication/common.md`
   - 소통 학습 (개별): `~/.claude/agent-memory/communication/{agent-id}.md`
   - 파일이 없으면 무시합니다.

2. **도메인 문서 수집**:
   - 도메인 판별 후, `~/.claude/agent-memory/domains/{domain}/` 하위에서 해당 에이전트의 도메인 문서를 읽습니다.

3. **도메인 학습 수집** (반드시 수행):
   - 글로벌: `~/.claude/agent-memory/domains/{domain}/learnings/{agent-id}.md`
   - **프로젝트**: `{project}/.onto-review/learnings/{agent-id}.md` — 해당 프로젝트에서 축적된 학습. **이 디렉토리가 존재하면 반드시 읽어야 합니다.**
   - 파일이 없으면 무시합니다.

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
{~/.claude/plugins/onto-review/roles/{agent-id}.md 내용}

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
- 방법론 학습: [{사실|판단}] (어떤 도메인에서든 적용 가능한 검증 원칙)
- 도메인 학습: [{사실|판단}] (이 도메인에서만 유효한 학습)
없으면 각각 "없음"으로 표기하세요.
```

### 3. 결과 출력

에이전트의 답변을 사용자에게 전달합니다.
다른 에이전트의 관점이 필요하다고 표기된 항목이 있으면, 사용자에게 알립니다:
"이 질문에 대해 {에이전트명}의 관점도 도움이 될 수 있습니다. `/onto-{dimension} {질문}`으로 추가 확인할 수 있습니다."

### 4. 학습 저장

`process.md`의 "학습 저장 규칙"을 따릅니다.
