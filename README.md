# Onto Review

8인 에이전트 패널(7인 검증자 + 1인 Philosopher)로 논리 체계를 다관점 검증하고, 코드베이스에서 온톨로지를 자동 구축하는 Claude Code 플러그인.

온톨로지 구조에서 영감을 받아 설계되었으며, 소프트웨어, 법률, 회계 등 도메인에 관계없이 적용 가능합니다.

**두 가지 핵심 기능**:
- **검증 (review)**: 범위가 확정된 대상을 8인 패널이 독립 병렬로 다관점 검증
- **구축 (build)**: 범위가 미확정인 코드베이스에서 적분형 탐색으로 온톨로지를 점진적 구축

## 설치

Claude Code에서 아래 명령어를 순서대로 실행합니다:

```
/plugin marketplace add kangminlee-maker/onto-review
/plugin install onto-review@kangminlee-maker/onto-review
```

## 도메인 기본 문서 설치 (선택)

플러그인에 포함된 도메인 기본 문서를 설치하면, 리뷰 시 도메인별 전문 기준이 적용됩니다.

```bash
# 대화형 — 도메인 선택
./setup-domains.sh

# 전체 설치
./setup-domains.sh --all

# 특정 도메인만 설치
./setup-domains.sh software-engineering finance
```

| 도메인 | 설명 |
|---|---|
| `software-engineering` | 코드 품질, 아키텍처, 타입 안전성, 테스트 전략 |
| `llm-native-development` | LLM 친화적 파일/폴더 구조, ontology-as-code |
| `finance` | 재무제표, XBRL, 회계 항등식, 기업 간 비교 |
| `business` | 경영 전략, 매출 인식, ROI, 변화관리 |
| `market-intelligence` | 시장 분석, 경쟁 정보, 위험 평가, 데이터 신뢰도 |
| `accounting` | K-IFRS, 복식부기, 세무 조정, 감사 |
| `ontology` | 온톨로지 설계, OWL/RDFS/SKOS, 분류 일관성 |

도메인 문서 없이도 사용 가능합니다 (범용 원칙으로 검증). `/onto-onboard` 실행 시에도 설치를 안내합니다.

## 에이전트 구성

| ID | 역할 | 검증 차원 |
|---|---|---|
| `onto_logic` | 논리적 일관성 검증자 | 모순, 타입 충돌, 제약 상충 |
| `onto_structure` | 구조적 완전성 검증자 | 고립된 요소, 끊어진 경로, 누락 관계 |
| `onto_dependency` | 의존성 무결성 검증자 | 순환, 역방향, 다이아몬드 의존 |
| `onto_semantics` | 의미적 정확성 검증자 | 이름-의미 일치, 동의어/동형이의어 |
| `onto_pragmatics` | 활용 적합성 검증자 | 질의 가능성, 역량 질문 테스트 |
| `onto_evolution` | 확장·진화 적합성 검증자 | 새 데이터/도메인 추가 시 깨짐 |
| `onto_coverage` | 도메인 포괄성 검증자 | 누락 하위 영역, 개념 편중, 표준 대비 빈 영역 |
| `philosopher` | 목적 정합성 검증자 | 세부 매몰 방지, 목적 복귀, 새로운 관점 제시 |

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
| `/onto-buildfromcode {경로\|URL}` | 코드베이스에서 온톨로지 구축 (적분형 탐색) |
| `/onto-transform {파일}` | Raw Ontology를 원하는 형식으로 변환 |

### 환경 관리
| 명령어 | 설명 |
|---|---|
| `/onto-onboard` | 프로젝트에 onto-review 환경 설정 |
| `/onto-promotelearnings` | 프로젝트 학습을 글로벌 수준으로 승격 |

## 팀 리뷰 흐름 (6단계)

```
1. Context Gathering (team lead)
2. Team 생성 + Round 1 — 7인 독립 리뷰 (구조 점검 포함)
3. Philosopher 종합 + 판정
   ├── 합의 명확 → 최종 출력
   └── 쟁점 존재 → 4. 직접 토론 → 최종 출력
5. 최종 출력
6. 마무리 (학습 저장 + 승격 안내 + Team 종료)
```

- Round 1: 완전 독립 — 다른 에이전트의 관점을 모른 채, 구조 점검(ME+CE) 후 내용 검증
- **파일 기반 전달**: reviewer가 결과를 세션 디렉토리에 Write → team-lead에 경로만 보고 → Philosopher가 Read로 직접 읽기 (team-lead 컨텍스트 포화 방지)
- **세션 ID**: `{YYYYMMDD}-{hash8}` 형태로 team_name과 세션 디렉토리를 고유하게 식별 (세션 간 충돌 방지, git commit처럼 추적 가능)
- 쟁점 토론: 모순/간과된 전제가 있을 때만 해당 에이전트 간 직접 소통
- Fallback: TeamCreate 실패 시 Agent tool(subagent) 방식으로 전환 (파일 기반 전달은 동일 적용)

## 코드 기반 온톨로지 구축 (적분형 탐색)

검증(review)과 달리, 코드 기반 구축(build)은 범위가 미확정이므로 **적분형 탐색** 구조를 사용합니다:

```
┌─────────────────────────────────────────────┐
│            Explorer (코드 탐색자)              │
│  코드를 직접 읽고 delta(도메인 사실 보고)를 생성   │
└──────────┬───────────────────┬──────────────┘
           │ delta 보고         │ epsilon 수신
           ▼                   ▲
┌─────────────────────────────────────────────┐
│        7인 검증 에이전트 (방향 제시자)           │
│  delta에 label(온톨로지 유형) 부착              │
│  자기 축에서 빈 영역의 epsilon(다음 방향) 제시    │
│  코드를 직접 읽지 않음                          │
└──────────┬───────────────────┬──────────────┘
           │ epsilon 보고       │ 통합 지시
           ▼                   ▲
┌─────────────────────────────────────────────┐
│          Philosopher (조율자)                 │
│  epsilon 통합, 수렴 판정, 온톨로지 일관성 관리    │
└─────────────────────────────────────────────┘

종료 = (모든 모듈 최소 1회 탐색) AND (새 fact = 0)
```

### 목적: 정밀 재현

코드 기반 온톨로지의 목적은 **brownfield를 정밀하게 재현**하는 것입니다. 온톨로지로 새 문제를 판단하는 것이 아닙니다.

- **코드에서 추출 가능**: 구조적 사실 → `deterministic`
- **코드에 내장되어 있으나 근거 없음**: 비즈니스 정책 → `code-embedded-policy`
- **코드에 없음**: 사용자 경험, 설계 의도 → `not-in-code` (사용자 결정 대상)

### 구축 흐름

```
0.  Schema 협의 (사용자와 온톨로지 구조 선택)
0.5 Context Gathering (문서, 사용자 맥락, 관련 레포 수집)
1.  적분형 탐색 루프 (Explorer ↔ 7인 ↔ Philosopher, 최대 7라운드)
2.  최종화 (Philosopher 검토, wip.yml → raw.yml)
3.  사용자 확인 (certainty 분포, 커버리지, 결정 필요 항목 제시)
4.  저장
5.  학습 저장
```

## 디렉토리 구조

```
onto-review/
├── process.md              # 공통 정의 (에이전트 구성, 도메인 규칙, Agent Teams, 학습 저장)
├── processes/
│   ├── review.md           # 팀 리뷰 모드 (6단계)
│   ├── question.md         # 개별 질문 모드
│   ├── build.md            # 코드 기반 온톨로지 구축
│   ├── transform.md        # 온톨로지 변환
│   ├── onboard.md          # 온보딩
│   └── promote.md          # 학습 승격
├── roles/
│   ├── onto_logic.md       # 논리적 일관성
│   ├── onto_structure.md   # 구조적 완전성
│   ├── onto_dependency.md  # 의존성 무결성
│   ├── onto_semantics.md   # 의미적 정확성
│   ├── onto_pragmatics.md  # 활용 적합성
│   ├── onto_evolution.md   # 확장·진화 적합성
│   ├── onto_coverage.md    # 도메인 포괄성
│   └── philosopher.md      # 목적 정합성
├── KNOWN-ISSUES.md         # 알려진 이슈 및 해결 방안
├── commands/               # 13개 명령어 정의
└── .claude-plugin/         # 플러그인 메타데이터
```

### 런타임 생성 디렉토리

```
{project}/.onto-review/           # 런타임 데이터 (gitignored)
├── sessions/                     #   에이전트 라운드별 결과
├── review/{session-id}/          #   review 산출물
├── builds/{session-id}/          #   build 산출물 (schema, raw.yml 등)
└── learnings/                    #   프로젝트 수준 학습
```

## 학습 체계

에이전트는 리뷰/질문을 통해 3종류의 학습을 축적합니다:

| 학습 유형 | 저장 위치 | 범위 | 유형 태깅 |
|---|---|---|---|
| 소통 학습 | `~/.claude/agent-memory/communication/` | 사용자 소통 선호 | — |
| 방법론 학습 | `~/.claude/agent-memory/methodology/` | 도메인 무관 검증 원칙 | [사실] / [판단] |
| 도메인 학습 | `{project}/.onto-review/learnings/` (프로젝트) 또는 `~/.claude/agent-memory/domains/{domain}/learnings/` (글로벌) | 특정 도메인/프로젝트 학습 | [사실] / [판단] |

- 프로젝트 수준 학습은 `/onto-promotelearnings`로 글로벌 수준에 승격할 수 있습니다
- 도메인 문서는 사용자의 명시적 승인 없이 자동 수정되지 않습니다

## 도메인 문서 (7종)

| 유형 | 문서 | 부재 시 | 갱신 방식 |
|---|---|---|---|
| 범위 정의형 | `domain_scope.md` | 역할 무력화 | promote 제안 → 사용자 승인 |
| 축적 가능형 | `concepts.md`, `competency_qs.md` | 성능 저하 | promote 제안 → 사용자 승인 |
| 규칙 정의형 | `logic_rules.md`, `structure_spec.md`, `dependency_rules.md`, `extension_cases.md` | 성능 저하 (LLM 대체 가능) | 사용자 직접 작성 |

## 마이그레이션

기존 버전에서 세션 데이터가 `.claude/sessions/`에 저장되어 있는 경우, 아래 스크립트로 `.onto-review/`로 이동할 수 있습니다.

```bash
# 대상 확인 (실제 이동 없음)
./migrate-sessions.sh --dry-run

# 마이그레이션 실행
./migrate-sessions.sh

# 다른 프로젝트 지정
./migrate-sessions.sh /path/to/project
```

`.claude/sessions/`가 없으면 자동으로 건너뜁니다.

## 시작하기

```
/onto-onboard                        # 프로젝트 환경 설정
/onto-review {대상}                   # 8인 패널 리뷰 실행
/onto-logic {질문}                    # 개별 에이전트에게 질문
/onto-buildfromcode {경로|GitHub URL}  # 코드에서 온톨로지 구축
```
