# Per-Session Domain Selection 설계문서

> 리뷰 2회 (sessions 20260328-73fb7d00, 20260328-185fe380), 8+1 에이전트 패널 리뷰 완료

## 해결하려는 문제

현재 프로젝트에 도메인이 1개 고정되어 있어서, 리뷰마다 다른 도메인 관점이 필요한 상황을 처리할 수 없다. 또한 도메인이 고정되면 학습이 잘못된 도메인에 축적되는 문제가 발생한다.

---

## 0. Terminology

| Term | Meaning | Example |
|------|---------|---------|
| **domain (도메인)** | 자체 도메인 문서로 검증 규칙을 제공하는 주제 영역 | `software-engineering`, `ontology` |
| **project domains** | `config.yml` `domains:`에 선언된 프로젝트 관련 도메인들. global domains의 부분집합 | `domains: [software-engineering, ontology]` |
| **global domains** | `~/.onto/domains/`에 문서가 설치된 모든 도메인 | directory listing |
| **session domain** | 현재 프로세스 실행 세션에서 선택된 단일 도메인. "프로세스 실행" 단위이며, Claude Code의 대화 세션과 다른 개념 | `{session_domain}` 변수 |
| **no-domain mode** | `{session_domain}`이 empty인 상태. 도메인 문서 없이 에이전트 기본 방법론만으로 검증 | `[-]` 또는 `@-` 선택 시 |

---

## 1. Domain Model Change

### Before
```yaml
domain: software-engineering
secondary_domains: ontology
output_language: ko
```

### After (config.yml SSOT)
```yaml
domains:
  - software-engineering
  - ontology
output_language: ko
```

**`domains:`는 순서 없는 집합(unordered set)**이다.
- `[A, B]`와 `[B, A]`는 동일
- 어떤 도메인도 다른 도메인보다 우선하지 않음
- "이 프로젝트에 관련 있는 도메인이 무엇인가"만 선언
- 이전 형식 호환: `domain: A` + `secondary_domains: B` → `domains: [A, B]` (자동 변환 + 마이그레이션 안내)
- config.yml `domains:`가 존재하면 CLAUDE.md의 `domain:`/`agent-domain:` 선언은 무시

---

## 2. Command Syntax

### Non-interactive (도메인 지정)
```
/onto:{process} {target} @{domain}
/onto:{process} {target} @-          ← no-domain mode
```
- `@`는 **독립된 공백 구분 토큰**일 때만 도메인 접두사로 인식
- 경로 내 `@` (예: `node_modules/@types/`)는 도메인으로 파싱하지 않음
- `@-`로 non-interactive 모드에서도 no-domain 지정 가능
- `@` 토큰이 2개 이상인 경우: 첫 번째만 도메인으로 인식, 나머지는 경고 후 무시

### Interactive (도메인 미지정)
```
/onto:{process} {target}
```
→ Domain Selection 흐름(Section 3) 실행

---

## 3. Domain Selection Flow

모든 프로세스(review, build, question)에 공통 적용되는 공유 모듈.

### 단계별 흐름

1. **대상 분석** — 리뷰 대상을 읽고 1-2문장 요약
2. **가용 도메인 수집** — config.yml `domains:` + `~/.onto/domains/` 합산, 중복 제거
3. **추천 도메인 도출** — 가용 도메인 목록 + 대상 내용 분석 + 세션 맥락을 기반으로 LLM이 추천. 추천은 **제안**이며 사용자의 최종 선택을 대체하지 않음
4. **선택 UI 표시**

```
## Target Summary
Reviewing the core process definition file...

Suggested domain: ontology (verification methodology and agent design)

Available domains:
  [a] ontology ← suggested
  ──────────────────────────
  [b] software-engineering ← project
  ──────────────────────────
  [c] accounting
  [d] business
  ...
  ──────────────────────────
  [-] 도메인 규칙 없이 검증 (에이전트 기본 방법론만 적용)

Select domain [a]: _
```

5. **입력 대기 (Enter 확인)** — Enter만 누르면 추천 도메인 선택. 다른 라벨/도메인명 입력 시 해당 도메인 선택. 타이머 없음
6. **확인 후 진행**

### UI 규칙
- 라벨: 소문자 a-z (숫자 아님). UI 표시 상 추천 > 프로젝트 > 글로벌 순서로 배치하나, 이 순서는 표시 편의일 뿐 도메인 간 우선순위를 의미하지 않음
- 중복 제거: 상위 섹션 우선 (추천 > 프로젝트 > 글로벌)
- 26개 초과 도메인: "기타 N개 도메인은 도메인 이름을 직접 입력하세요" 안내

### 교차 영역 대상 가이드
리뷰 대상이 여러 도메인에 걸치는 경우, **관련 도메인별로 각각 리뷰를 실행**하는 것이 현재의 의도된 워크플로우이다. 향후 다중 도메인 동시 적용을 별도 설계할 예정.

---

## 4. Edge Cases (SSOT)

다른 섹션은 이 테이블을 참조한다. 동작 정의를 여기에만 기술하고 다른 곳에서 중복 서술하지 않는다.

| Case | Behavior |
|---|---|
| `@{domain}` with non-existent domain | 경고: "Domain '{domain}' not found." 가용 도메인 표시. 다시 선택 요청. 자동 폴백 금지 |
| `@` with no domain name | 경로의 일부로 취급, interactive 선택으로 진행 |
| `@-` (non-interactive no-domain) | → §5-B |
| `@` 토큰 2개 이상 | 첫 번째만 도메인으로 인식, 나머지는 경고 후 무시 |
| No config.yml, no global domains | 선택 생략, no-domain mode로 진행 (→ §5-B) |
| No config.yml, global domains exist | 대상 내용 분석 기반 추천, 전체 글로벌 도메인 표시 |
| Config.yml `domains:` empty | No config.yml과 동일 취급 |
| Old format `domain:` + `secondary_domains:` | unordered set으로 변환. 마이그레이션 안내 |
| Domain directory exists but 0 files | 목록에 표시하되 "(empty — no rules)" 표기 |
| `[-]` selected (interactive no-domain) | → §5-B |
| 추천 도메인 0개 (LLM이 추천 산출 실패) | 추천 없이 가용 도메인 목록만 표시. 기본값 없이 사용자 입력 대기 |
| Enter 입력 (기본값 선택) | 추천 도메인 선택 |
| 미드세션 도메인 변경 요청 | 현재 프로세스 종료 후 새 프로세스를 다른 도메인으로 재실행 필요 |
| 도메인 제거 시 기존 학습 | 기존 `[domain/X]` 태그 학습은 유지. 해당 도메인 리뷰 시에만 로딩 |
| 26개 초과 도메인 | a-z 라벨로 26개까지 표시 + "도메인 이름 직접 입력" 안내 |

---

## 5. Domain Determination Rules (SSOT)

### A. Session domain (per process execution)

1. `@{domain}` 지정 → 존재 확인 (비존재 시 → §4) → `{session_domain}` = `{domain}`
2. `@-` 지정 → `{session_domain}` = empty
3. `@{domain}` 미지정 → Domain Selection 흐름 (§3) → 선택된 도메인 설정
4. `[-]` 선택 → `{session_domain}` = empty

### B. "No domain" mode (`{session_domain}` empty)

에이전트의 기본 검증 방법론(논리적 일관성, 구조적 완전성 등)은 온톨로지적 방법론에 기반한다. No-domain mode는 이 기본 방법론만으로 검증하되, 특정 도메인의 규칙 문서는 적용하지 않는 모드이다.

- 도메인 문서 로딩: 건너뜀
- Self-Loading: 도메인 문서 줄 건너뜀 (파일 부재 시 graceful degradation이 이미 이를 처리)
- 학습 저장: `[methodology]` 태그만. `[domain/...]` 태그 없음
- 학습 저장 경로: `{project}/.onto/learnings/{agent-id}.md`
- 검증 범위 안내: 이 모드에서는 도메인 특화 규칙 없이 검증하므로, 도메인 특화 이슈를 놓칠 수 있음

### C. Project domains (config.yml)

1. config.yml `domains:` 존재 → 프로젝트 관련 도메인 (unordered set)
2. config.yml `domains:` 부재 + CLAUDE.md `domain:`/`agent-domain:` 존재 → 하위 호환 fallback (unordered set으로 변환)
3. config.yml `domains:` 존재 시 → CLAUDE.md의 도메인 선언은 무시
4. 어디에도 선언 없음 → onboard에서 질문, 또는 첫 실행 시 질문

### D. Per-process domain resolution

| Process | Domain resolution |
|---------|-------------------|
| review, build, question | §5-A (세션 도메인 선택) |
| promote | 학습 태그의 `[domain/X]`에서 자동 결정 (선택 불필요) |
| transform | 도메인 컨텍스트 불필요 |
| onboard | 사용자에게 관련 도메인 목록 질문 |

---

## 6. Integration with Process Files

### 6-1. review.md — 새로운 Step 0 삽입
```
### 0. Domain Selection
Determine {session_domain} per Section 5-A of process.md.
```

### 6-2. process.md Teammate Initial Prompt
```
2. Domain document: ~/.onto/domains/{session_domain}/{corresponding domain document}
   (Skip this line if {session_domain} is empty)
```

### 6-3. Learning Storage
| `{session_domain}` | Domain tag | Storage path |
|---------------------|-----------|-------------|
| Has value | `[domain/{session_domain}]` | `{project}/.onto/learnings/{agent-id}.md` |
| Empty | No domain tag. `[methodology]` only | `{project}/.onto/learnings/{agent-id}.md` |

Global storage path for promote: `~/.onto/learnings/{agent-id}.md` (domain tag preserved in entry).

### 6-4. build.md, question.md
동일한 Step 0 추가

### 6-5. promote.md
Domain Selection 불필요. 학습 태그의 `[domain/X]`에서 자동 결정. 도메인 태그 없는 학습은 methodology-only로 승격.

### 6-6. onboard.md
```
"Which domains are relevant to this project? You can specify multiple.
(e.g., software-engineering, ontology)
Order does not matter. If unsure, you can skip and select domains per review."
```

---

## 7. Files to Modify

| File | Change | Scope |
|---|---|---|
| `process.md` §Domain Determination Rules | unordered set + per-session selection 재작성 | Major |
| `process.md` §Teammate Initial Prompt | `{domain}` → `{session_domain}`, skip-if-empty | Minor |
| `process.md` §Learning Storage Rules | domain tag uses `{session_domain}` | Medium |
| `processes/review.md` | Step 0 삽입 | Major |
| `processes/build.md` | Step 0 추가 | Medium |
| `processes/question.md` | Step 0 추가 | Medium |
| `processes/promote.md` | domain config 의존 제거 | Minor |
| `processes/onboard.md` §3.3 | unordered set 질문 + `domains:` 형식 | Medium |
| `commands/review.md` | `@{domain}`, `@-` 옵션 설명 | Minor |
| `commands/build.md` | `@{domain}`, `@-` 옵션 설명 | Minor |
| `commands/ask-*.md` | `@{domain}`, `@-` 옵션 설명 | Minor |
| `README.md` | domain config 섹션 업데이트 | Medium |
| `dev-docs/BLUEPRINT.md` | domain model + command 구조 | Medium |
| `dev-docs/translation-reference.yaml` | session_domain, project_domains, global_domains 추가 | Minor |
| `migrate-sessions.sh` | `domain:` → `domains:` 변환 | Minor |

---

## 8. Verification Checklist

§4 Edge Cases와 1:1 대응.

| # | Test case | Expected | Edge Case ref |
|---|-----------|----------|---------------|
| 1 | `/onto:review target @ontology` | non-interactive, ontology 사용 | — |
| 2 | `/onto:review target @nonexistent` | 경고 + 다시 선택 | Row 1 |
| 3 | `/onto:review target @` | `@`를 경로 일부로 취급, interactive | Row 2 |
| 4 | `/onto:review target @-` | non-interactive, no-domain mode | Row 3 |
| 5 | `/onto:review target @a @b` | 첫 번째만 인식, 나머지 경고 | Row 4 |
| 6 | `/onto:review target` | interactive UI 표시 | — |
| 7 | Enter 입력 (기본값) | 추천 도메인 선택 | Row 12 |
| 7b | 추천 0개 + Enter | 기본값 없이 입력 대기 | Row 11 |
| 8 | `[-]` 선택 | no-domain mode | Row 10 |
| 9 | No config.yml, no global domains | 선택 생략, no-domain mode | Row 5 |
| 10 | No config.yml, global domains exist | 대상 분석 기반 추천, 글로벌 도메인 표시 | Row 6 |
| 11 | Domain dir exists, 0 files | "(empty — no rules)" 표시 | Row 9 |
| 12 | old config format | unordered set 변환 | Row 8 |
| 13 | `@types/node` in path | `@` 파싱하지 않음 | — |
| 14 | 미드세션 도메인 변경 | 재실행 안내 | Row 12 |
| 15 | 도메인 제거 후 기존 학습 | 학습 유지, 해당 도메인 리뷰 시만 로딩 | Row 13 |

---

## 9. Review Session Decisions

### Session 1 (20260328-73fb7d00)

| Decision | Rationale |
|----------|-----------|
| Non-existent domain → re-ask | 사용자가 `@X`로 명시한 의도 존중. 자동 폴백은 의도 무시 |
| `domains:` = unordered set | 서비스 철학: "작업 성격에 따라 적합한 도메인이 개입" |
| `@none` 제거 → `[-]` | 에이전트 기본 방법론 자체가 온톨로지적 검증. ontology 도메인 문서는 온톨로지 공학 규칙이므로 기본값으로 부적합 |
| "정의 1곳 + 참조 N곳" 원칙 | 동일 동작의 중복 서술이 모순의 구조적 원인 |

### Session 2 (20260328-185fe380, @llm-native-development)

| Decision | Rationale |
|----------|-----------|
| SSOT 통합 — 중복 서술 → 참조 전환 | 문서 자체가 선언한 원칙을 문서가 위반 (Pattern A) |
| Step 2-3 순서 수정 + "결정" → "도출" | 가용 도메인 수집 전에 추천 불가 (Pattern B) |
| `@-` 구문 추가 (non-interactive no-domain) | 두 모드 간 선택 가능 값 집합 비대칭 해소 (Pattern C) |
| §4 ↔ §8 양방향 대응 완성 | 엣지 케이스-검증 불일치 해소 (Pattern D) |
| 교차 영역: 현재 도메인별 재실행, 향후 다중 동시 적용 설계 예정 | PO 결정 |

### Session 3 (20260328-e955728f, @software-engineering)

| Decision | Rationale |
|----------|-----------|
| `domains: []` = 키 부재와 동일 (Option A) | 빈 집합 = "아직 식별 못함"이지 "도메인 없음 선언"이 아님. no-domain 진입은 `@-`/`[-]`가 담당 |
| 5초 타이머 제거 → Enter 확인 | Claude Code CLI에서 실시간 타이머 구현 불가. "실현 가능한 동작만 명세" 원칙. Enter 1회로 의식적 선택 보장 |
| 추천 0개 시 폴백: 기본값 없이 입력 대기 | 자동 선택 대상 부재 시 종단 상태 미정의 해소 |
| 선언 수준(동등성)과 런타임 수준(추천/선택)의 구분 필요 | 대부분의 잔여 이슈가 이 경계 부재에서 파생 |
| 교차 영역 리뷰: 각 실행은 독립 세션, 결과 비참조, 학습 분리 | 교차 영역 워크플로우 최소 가이드 |
