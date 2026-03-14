# Onto Review

8인 에이전트 패널(7인 검증자 + 1인 Philosopher)로 논리 체계를 다관점 검증하는 Claude Code 플러그인.

온톨로지 구조에서 영감을 받아 설계되었으며, 소프트웨어, 법률, 회계 등 도메인에 관계없이 적용 가능합니다.

## 에이전트 구성

| ID | 역할 | 검증 차원 |
|---|---|---|
| `onto_logic` | 논리적 일관성 검증자 | 모순, 타입 충돌, 제약 상충 |
| `onto_structure` | 구조적 완전성 검증자 | 고립된 요소, 끊어진 경로, 누락 관계 |
| `onto_dependency` | 의존성 무결성 검증자 | 순환, 역방향, 다이아몬드 의존 |
| `onto_semantics` | 의미적 정확성 검증자 | 이름-의미 일치, 동의어/동형이의어 |
| `onto_pragmatics` | 활용 적합성 검증자 | 질의 가능성, 역량 질문 테스트 |
| `onto_evolution` | 확장·진화 적합성 검증자 | 새 데이터/도메인 추가 시 깨짐 |
| `onto_coverage` | 도메인 포괄성 검증자 | 누락 하위 영역, 개념 편중 |
| `philosopher` | 목적 정합성 검증자 | 시스템 목적 기반 메타 관점, 종합, 새로운 관점 제시 |

## 명령어

### 팀 리뷰
| 명령어 | 설명 |
|---|---|
| `/onto-review {대상}` | 8인 패널로 대상을 다관점 리뷰 |

### 개별 질문
| 명령어 | 설명 |
|---|---|
| `/onto-logic {질문}` | 논리적 일관성 관점 |
| `/onto-structure {질문}` | 구조적 완전성 관점 |
| `/onto-dependency {질문}` | 의존성 무결성 관점 |
| `/onto-semantics {질문}` | 의미적 정확성 관점 |
| `/onto-pragmatics {질문}` | 활용 적합성 관점 |
| `/onto-evolution {질문}` | 확장·진화 적합성 관점 |
| `/onto-coverage {질문}` | 도메인 포괄성 관점 |
| `/onto-philosopher {질문}` | 목적 정합성 관점 |

### 온톨로지 구축/변환
| 명령어 | 설명 |
|---|---|
| `/onto-buildfromcode {경로}` | 코드베이스에서 온톨로지 추출 |
| `/onto-transform {파일}` | Raw Ontology를 원하는 형식으로 변환 |

### 환경 관리
| 명령어 | 설명 |
|---|---|
| `/onto-onboard` | 프로젝트에 onto-review 환경 설정 |
| `/onto-promotelearnings` | 프로젝트 학습을 글로벌 수준으로 승격 |

## 팀 리뷰 흐름

```
Round 1: 7인 독립 리뷰
    ↓
Philosopher 종합 + 새로운 관점 제시
    ↓
Round 2: 7인 재응답 (독립)
    ↓
Philosopher 종합 + 목적/철학 부합 확인
    ↓
(미합의 시) Round 3: 쟁점 토론 (직접 소통 개방)
    ↓
최종 합의 정리
```

- Round 1~2: Agent Teams로 실행하되, teammate 간 독립성 유지
- Round 3: 미합의 항목에 대해서만 teammate 간 직접 토론 허용
- Fallback: TeamCreate 실패 시 Agent tool(subagent) 방식으로 전환

## 디렉토리 구조

```
onto-review/
├── process.md              # 공통 정의 (에이전트 구성, 도메인 규칙, Agent Teams, 학습 저장)
├── processes/
│   ├── review.md           # 팀 리뷰 모드
│   ├── question.md         # 개별 질문 모드
│   ├── build.md            # 코드 기반 온톨로지 구축
│   ├── transform.md        # 온톨로지 변환
│   ├── onboard.md          # 온보딩
│   └── promote.md          # 학습 승격
├── agents/
│   ├── onto_logic.md
│   ├── onto_structure.md
│   ├── onto_dependency.md
│   ├── onto_semantics.md
│   ├── onto_pragmatics.md
│   ├── onto_evolution.md
│   ├── onto_coverage.md
│   └── philosopher.md
├── commands/               # 13개 명령어 정의
└── .claude-plugin/         # 플러그인 메타데이터
```

## 학습 체계

에이전트는 리뷰/질문을 통해 3종류의 학습을 축적합니다:

| 학습 유형 | 저장 위치 | 범위 |
|---|---|---|
| 소통 학습 | `~/.claude/agent-memory/communication/` | 사용자 소통 선호 |
| 방법론 학습 | `~/.claude/agent-memory/methodology/` | 도메인 무관 검증 원칙 |
| 도메인 학습 | `~/.claude/agent-memory/domains/{domain}/learnings/` 또는 `{project}/.claude/learnings/` | 특정 도메인/프로젝트 학습 |

프로젝트 수준 학습은 `/onto-promotelearnings`로 글로벌 수준에 승격할 수 있습니다.

## 시작하기

```
/onto-onboard              # 프로젝트 환경 설정
/onto-review {대상}        # 8인 패널 리뷰 실행
/onto-logic {질문}         # 개별 에이전트에게 질문
```
