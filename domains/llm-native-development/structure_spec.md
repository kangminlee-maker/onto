# LLM-Native Development Domain — 구조 명세

## 프로젝트 필수 파일 (메타 파일)

| 역할 | 파일명 | 위치 | 설명 | 제약 |
|---|---|---|---|---|
| LLM 지시 파일 | 프로젝트별 관례에 따름 | 프로젝트 루트 | LLM에게 프로젝트 지시사항 전달. 이 파일 없이 작업하면 오류가 발생하는 정보만 기재 | 300줄 이하 |
| 구조 맵 | ARCHITECTURE.md 또는 llms.txt | 프로젝트 루트 | 전체 체계의 구조 맵. 디렉토리 구조, 각 디렉토리의 역할, 핵심 파일 목록 | 최상위 디렉토리 전수 언급 |
| 탐색 인덱스 | INDEX.md | 각 디렉토리 1개 | 해당 디렉토리 내 파일 목록과 각 파일의 한 줄 설명. 파일 존재 여부의 진실의 원천 | — |
| 인간 가독성 안내 | README.md | 각 디렉토리 (선택) | INDEX.md 대신 사용 가능. 인간 가독성 중심 | INDEX.md와 병존 시 INDEX.md 우선 |
| 기능 명세 | spec.md | 기능 디렉토리 | 구현 전 기능 명세. 요구사항, 아키텍처 결정, 테스트 전략 포함 | 구현 파일과 같은 디렉토리 |

**LLM 지시 파일의 벤더별 관례:**
| LLM 생태계 | 파일명 | 비고 |
|---|---|---|
| Claude Code | CLAUDE.md | 프로젝트 루트 + 하위 디렉토리별 배치 가능 |
| Cursor | .cursorrules | 프로젝트 루트 |
| GitHub Copilot | .github/copilot-instructions.md | .github 디렉토리 |
| Windsurf | .windsurfrules | 프로젝트 루트 |
| 범용 (AGENTS.md 표준) | AGENTS.md | Linux Foundation 관리, 다중 에이전트 대응 |

프로젝트에서 사용하는 LLM 생태계에 맞는 파일명을 선택합니다. 복수의 LLM 생태계를 동시에 사용하는 경우, 각 생태계의 지시 파일을 병행 배치할 수 있습니다.

## frontmatter 규격 (진실의 원천)

이 섹션이 frontmatter에 관한 모든 규칙의 진실의 원천입니다. 다른 파일(logic_rules.md, dependency_rules.md)에서 frontmatter를 참조할 때는 이 정의를 따릅니다.

### 필수 필드
- `title`: 파일의 제목 (문자열)
- `type`: 파일 유형. 허용 값: `concept`, `rule`, `spec`, `index`, `architecture`, `config`
- `description`: 한 줄 설명 (문자열)

### 관계 필드 (선택)
- `depends_on`: 이 파일이 의존하는 파일 경로 목록
- `related_to`: 관련 파일 경로 목록 (방향 없는 연관)
- `parent`: 상위 개념 파일 경로

### 변경 추적 필드 (선택)
- `last_updated`: 최종 갱신일 (YYYY-MM-DD). git 위임 시 생략 가능
- `update_reason`: 최종 갱신 이유 (문자열). git 위임 시 생략 가능

## 파일 구조 필수 요소

- **본문**: Markdown 형식. 제목(H1)은 파일당 1개, 하위 섹션(H2~H3)으로 구조화
- **파일 크기**: 단일 파일 500줄 이하 권장. 초과 시 개념 분리를 검토. 이 수치는 현재 주요 LLM(128K~1M 토큰)의 컨텍스트 효율을 고려한 경험적 기준임

## 디렉토리 구조 규칙

- 최대 깊이: 3단계 (예: domains/software-engineering/concepts.md). 이 수치는 LLM의 탐색 비용을 최소화하기 위한 경험적 기준임
- 각 디렉토리는 단일 관심사를 표현한다
- 디렉토리명은 복수형 명사 또는 도메인 이름을 사용한다 (예: domains, roles, processes)
- 단일 파일만 포함하는 디렉토리는 만들지 않는다. 파일을 상위 디렉토리에 배치한다
- 디렉토리 당 권장 파일 수: 3~20개. 20개 초과 시 하위 디렉토리 분리 또는 서브 인덱스 도입 검토

## 파일명 규칙

- snake_case 사용 (예: domain_scope.md, logic_rules.md)
- 파일명은 내용의 역할을 직접 표현한다
- 예약된 파일명과 역할 (위 "프로젝트 필수 파일" 테이블 참조): ARCHITECTURE.md, INDEX.md, README.md, spec.md, llms.txt, 및 각 LLM 생태계별 지시 파일
- 숫자 접두사를 사용한 순서 표현은 피한다. 순서는 INDEX.md에서 명시한다

## 참조 체인 상한

- 하나의 작업을 수행하기 위해 읽어야 하는 파일: 5개 이하 권장. "작업"은 extension_cases.md의 시나리오 단위로 정의. 이 수치는 LLM의 컨텍스트 윈도우 활용 효율을 고려한 경험적 기준임

## 필수 관계

- 모든 개념 파일은 최소 1개의 다른 문서에서 참조되거나, INDEX.md에 등록되어야 한다
- 모든 디렉토리는 INDEX.md 또는 README.md를 포함해야 한다
- ARCHITECTURE.md는 최상위 디렉토리들과 그 역할을 모두 언급해야 한다

## 고립 요소 금지

- 어디에서도 참조되지 않는 개념 파일 → 경고 (고립 문서)
- INDEX.md에 등록되지 않은 파일 → 경고 (미등록 파일)
- frontmatter에 관계가 하나도 없는 개념 파일 → 경고 (관계 미정의)

## 관련 문서
- concepts.md — 파일 유형(개념 파일 vs 메타 파일) 정의
- logic_rules.md — frontmatter 정합성 규칙 (본 파일의 규격을 참조)
- dependency_rules.md — 참조 무결성 규칙 (본 파일의 규격을 참조)
