# onto-review — Known Issues

## Issue 1-A: team-lead LLM 컨텍스트 포화로 인한 inbox 메시지 부분 인식 실패 (2026-03-25)

### 상태: 확인됨, 해결 방안 설계됨

### 관찰된 증상

8인 패널 리뷰에서 team-lead가 7인 중 3인의 리뷰만 인식함.

| 에이전트 | 리뷰 보고 수신 | idle 알림 수신 | 비고 |
|---------|:---:|:---:|------|
| onto_logic | X | O | idle로 전환되었으나 보고 미수신 |
| onto_semantics | X | X | idle 알림도 미수신 |
| onto_structure | **O** | O | 정상 |
| onto_dependency | X | O | idle 전환 후 보고 미수신 |
| onto_pragmatics | **O** | O | 정상 |
| onto_evolution | X | X | idle 알림도 미수신 |
| onto_coverage | **O** | O | 정상 |

재요청(SendMessage) 후에도 미인식 4인의 결과는 수신되지 않았습니다.

### 근본 원인 (inbox 데이터 검증 완료)

**transport 계층은 정상. team-lead LLM의 컨텍스트 포화가 원인.**

검증된 사실:
- 7인 전원의 리뷰가 team-lead inbox에 도착함 (5,031~9,456자/인)
- 모든 메시지 `read=True` (transport 레이어 성공)
- 재전송 4인의 결과도 inbox에 존재, 역시 `read=True`
- team-lead inbox 총 메시지 크기: ~64,517자 (7인 원문 + idle 알림 + 재전송)
- Philosopher에게 3인만 전달, 18,072자 원문을 3,997자로 요약 ("원문 그대로" 규칙 위반)

**인과 경로**: team-lead의 기존 컨텍스트(process.md + review.md + 에이전트 정의 + 리뷰 대상) 위에 ~64,517자가 inbox로 유입 → LLM이 일부 메시지만 인식 → 3인 결과만 Philosopher에게 전달 → 원문조차 요약됨 (컨텍스트 부족)

### 해결 방안

#### 파일 기반 컨텍스트 외부화

현행 Agent Teams → fallback → Subagent 흐름을 유지하면서, 리뷰 원문 전달을 파일 기반으로 변경합니다. MCP 서버 불필요 — 내장 Write/Read 도구만 사용.

데이터 흐름 변경:
```
[현행]  Reviewer → SendMessage(원문) → team-lead 컨텍스트 적재 → SendMessage(원문) → Philosopher
[변경]  Reviewer → Write(파일) → team-lead에 경로만 보고 → Philosopher → Read × 7(파일)
```

세션 디렉토리: `{project}/.onto-review/review/{YYYYMMDD}-{hash8}/round1/{agent-id}.md`
- 세션 ID(`{YYYYMMDD}-{hash8}`)는 team_name과 동일 (팀 생성 시 한 번 생성, 충돌 없음)
- team-lead가 세션 디렉토리를 생성하고 경로를 reviewer 초기 prompt에 포함

컨텍스트 분리 효과:
- team-lead: ~64,517자 → ~500자 (경로 문자열만)
- "원문 그대로" 규칙이 구조적으로 보장됨 (파일에 보존, 중간 전달 없음)
- Philosopher가 자기 컨텍스트에서 7인 원문을 직접 Read (의도된 적재)

Write 실패 시 fallback:
- reviewer가 Write 실패 시 SendMessage로 원문 전달 (현행 방식)
- team-lead가 해당 원문을 대리 Write하거나, Philosopher에게 혼합 전달

### 현재 대응 (process.md:93 graceful degradation)

- 미인식 에이전트를 제외하고 수신된 결과로 진행
- 합의 판정 시 분모를 조정 (예: 3/8 → 3/3)
- Philosopher 미응답 시 team lead가 직접 종합

---

## Issue 1-B: team_name 고정으로 인한 세션 간 에이전트 누수 (2026-03-25)

### 상태: 확인됨, 해결 방안 설계됨

### 관찰된 증상

#### 증상 1: `-2` 인스턴스의 세션 간 누수

원래 팀(8인)을 shutdown한 후, 다른 세션에서 생성된 `-2` 접미사 인스턴스들이 현재 세션의 team lead에게 메시지를 보내기 시작했습니다:

- `onto_logic-2`, `onto_semantics-2`, `onto_structure-2`, `onto_dependency-2`, `onto_pragmatics-2`, `onto_evolution-2`, `onto_coverage-2`
- 이들은 **원래 리뷰 대상이 아닌 다른 주제**를 리뷰하고 있었음 → 다른 세션에서 생성된 에이전트임이 확인됨
- config.json 검증: team-lead의 `cwd=/Users/kangmin/cowork/sprint-kit`, -2 에이전트들의 `cwd=/Users/kangmin/cowork/onto-review` → 서로 다른 세션
- TeamDelete가 `-2` 인스턴스들 때문에 실패 (7 active members). 별도 shutdown 필요.

#### 증상 2: 다른 프로젝트 세션에 팀 잔류

sprint-kit 세션을 재개(resume)했을 때, onto-review 세션에서 실행된 패널 리뷰의 system-reminder가 sprint-kit 세션에 나타남.

### 근본 원인

- `team_name`이 `onto-review`로 고정 (process.md:101)
- `~/.claude/teams/onto-review/config.json`이 파일 시스템에 공유됨
- 같은 `team_name`을 사용하는 팀이 여러 세션에서 동시에 존재 가능
- 다른 세션에서 생성된 에이전트가 같은 team_name의 inbox에 메시지를 보냄

### 해결 방안

1. **세션 ID 기반 team_name**: `onto-review-{YYYYMMDD}-{hash8}` 형태로 세션별 고유 team_name 생성 (충돌 불가, git commit처럼 추적 가능)
2. **TeamCreate 전 기존 팀 확인**: `~/.claude/teams/onto-review-*` 패턴으로 기존 팀 존재 확인. 있으면 사용자에게 안내.
3. **다중 세션 동시 실행 금지 규칙 유지**: 한 세션에서 onto-review 진행 중이면 다른 세션에서 실행하지 않아야 함 (타임스탬프로 격리되지만, 동일 세션 재실행 시 이전 팀 잔류 가능)

### 적용 위치

- process.md:101 — team_name 규칙 변경
- review.md:41 — team_name 하드코딩 제거
- process.md:114~116 — 고아 팀 정리 규칙에 타임스탬프 패턴 매칭 추가

---

## Issue 1 참고: -2 에이전트들의 분석 내용

-2 인스턴스들은 원래 리뷰 대상 대신 메시지 유실 문제를 분석했습니다. 주요 발견:

- **onto_semantics-2**: "라우팅 문제"라는 진단명이 부정확 — 라우팅(transport)은 성공, 실패는 LLM 인식 단계. 메시지 생명주기 5단계 제안: 제출→polling→주입→인식→활용
- **onto_logic-2**: 컨텍스트 윈도우 포화 가설이 누락과 요약 전달을 동시에 설명할 수 있음. 재전송 후에도 동일 실패 반복은 구조적 한계의 증거
- **onto_coverage-2**: 7인 리뷰 합계 ~45,635자 + idle 14건. team lead 기존 컨텍스트와 합산 시 포화 가능성. build 프로세스(반복 루프)에서 더 심각할 수 있음
- **onto_evolution-2**: "원문 그대로 전달" 규칙 자체가 규모에 비례하는 실패 원인. 프로세스가 암묵적으로 가정하는 인프라 동작 목록 명시 필요

---

## Issue 1 검증 이력

### 2026-03-25: inbox 데이터 기반 근본 원인 검증

기존 KNOWN-ISSUES는 Issue 1-A와 1-B를 하나의 이슈("팀 메시지 유실 + 세션 간 누수")로 기술하고, 근본 원인을 "team_name 공유로 인한 세션 간 라우팅 문제"로 분석했습니다.

inbox 데이터(`~/.claude/teams/onto-review/inboxes/team-lead.json`) 검증 결과:
- **Issue 1-A의 원인은 세션 간 누수가 아니라 LLM 컨텍스트 포화**임이 확인됨 (단일 세션 내에서 발생)
- **Issue 1-B의 원인은 team_name 공유**로 기존 분석이 정확

두 문제는 원인이 다르고 해결책도 달라, 별도 이슈(1-A, 1-B)로 분리했습니다.

### 2026-03-25: 해결 설계안 8인 패널 리뷰 (Subagent 모드)

설계안(MCP 외부화 + 제어/데이터 평면 분리)에 대해 8인 패널 리뷰를 수행했습니다.

주요 리뷰 결과:
- Degradation 체계 불완전 (7/7 합의) → 2×2 매트릭스로 재구성 필요
- 동기화 프로토콜 부재 (4/7 합의) → SendMessage 3기능 분해 후 대체 필수
- 부분 실패 경로 미정의 (5/7 합의)
- 세션 격리 고립 (5/7 합의)

PO 결정:
- MCP 외부화는 **선택적 활성화**로 분리 (MCP Key 설정 필요)
- 기본 모드는 현행 Agent Teams → fallback → Subagent 유지
- 설계 복잡성은 분기를 명확히 정의하고 프로세스를 독립 설계하여 관리
