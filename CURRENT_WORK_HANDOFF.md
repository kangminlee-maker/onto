# Current Work Handoff

> 상태: Active
> 목적: 다음 `LLM`이 이 문서 하나를 읽고 현재 작업 상태를 이해한 뒤 바로 다음 작업을 이어갈 수 있게 한다.
> 작업 위치: `/Users/kangmin/cowork/onto`
> 현재 브랜치: `onto-harness`

---

## 1. 먼저 읽을 것

이 문서를 읽은 뒤 아래 순서로 읽는다.

1. `CLAUDE.md`
2. `AGENTS.md`
3. `dev-docs/ontology-as-code-guideline.md`
4. `dev-docs/llm-native-development-guideline.md`
5. `dev-docs/llm-runtime-interface-principles.md`
6. `commands/review.md`
7. `dev-docs/review-productized-live-path.md`
8. `dev-docs/review-nested-spawn-coordinator-contract.md`

중요:

- 설치된 plugin/skill copy보다 이 레포의 문서와 코드가 authority다.
- 특히 `commands/review.md`와 `package.json`이 현재 repo-local canonical execution truth다.
- `CLAUDE.md`가 개발 원칙 문서 2개를 참조한다. 항상 확인한다.

---

## 2. 현재 상태 요약

### 2.1 달성된 것

- `review:invoke` canonical entrypoint가 작동한다.
- directory listing 필터 (62K → 348줄), embed truncation (300줄), kind `directory_listing` 통일 완료.
- **4 lens + synthesize**: codex executor로 E2E 성공 (세션 `20260405-e8b28bc0`).
- **9 lens + synthesize**: Agent tool로 E2E 성공 (세션 `20260405-a98b65a7`).
- E2E 테스트 **38건 ALL PASS** (`npm run test:e2e`). 외부 레포 의존성 제거 완료.
- edge case 107건 분석, 보안/높은/중간 우선순위 전부 수정.
- executor 5종 구현: mock, subagent, agent-teams, codex, api (anthropic/openai).
- `--diff-range` git diff target 지원.
- 외부 target boundary auto-approve.
- `discovered-enhancements.md`에 진화 항목 4건 기록.
- **Nested Spawn Coordinator 구현 완료** (2026-04-06):
  - `commands/review.md`를 thin entrypoint로 축소 (경로 선택 + 사용자 옵션만 남김)
  - `dev-docs/review-nested-spawn-coordinator-contract.md` 신규 생성 (7-phase 실행 계약)
  - 9-lens 자가 리뷰로 검증 → 6건 finding 전부 반영
  - authority seat 분리, artifact-derived 값 참조, ReviewRecord chain 보강, boundary quartet/extension points 선언
- **`--prepare-only` 플래그 구현** (2026-04-06):
  - `review:invoke --prepare-only`가 전처리 + session 준비까지만 수행, 실행/완료 건너뜀
  - `PrepareOnlyResult` TypeScript interface 선언 (concept→contract→type chain)
  - coordinator Phase 1의 22-arg 수동 구성 문제 해소
  - E2E 테스트 E38 추가
- **Synthesize heading mismatch 수정** (2026-04-06):
  - synthesize packet에 Required Output Sections 추가 — renderer가 기대하는 정확한 heading 8개 명시
  - final-output.md가 synthesis 내용을 정상 렌더링
- **Individual Lens Findings 참조** (2026-04-06):
  - final-output.md에 각 lens output 파일 경로 포함
  - synthesis가 finding을 누락해도 lens output에서 항상 확인 가능 — 구조적 누락 방지
  - degraded lens 표시 포함
- **Codex CLI 비활성화** (2026-04-06): 과금 문제. `codex` → `codex.disabled` 이름 변경.
- **외부 레포 의존성 제거** (2026-04-06): E2E 테스트에서 `../AI-data-dashboard` 참조를 onto 레포 내부 커밋으로 교체.
- **`--diff-range` Agent tool 경로 E2E 성공** (2026-04-06): 세션 `20260406-832810a9`. `--prepare-only` + Agent dispatch + `complete-session`.

### 2.2 작동하는 실행 경로

| 환경 | 방법 | 비용 | 상태 |
|---|---|---|---|
| Claude Code 세션 (기본) | `review:invoke --prepare-only` → Agent tool dispatch → `review:complete-session` | 구독 | **작동 (권장)** |
| Claude Code 세션 (기본, diff) | 위와 동일 + `--diff-range` | 구독 | **작동** |
| CLI | `review:invoke --executor-realization api` | API 과금 | **작동** |
| CLI | `review:invoke --executor-realization mock` | 무료 | **작동 (테스트용)** |

### 2.3 작동하지 않는 것 / 제한

- **Codex CLI 비활성화**: 과금 문제로 차단. codex executor, codex fallback 모두 불가. 재활성화: `mv /opt/homebrew/bin/codex.disabled /opt/homebrew/bin/codex`
- **Claude CLI subprocess 인증**: `-p` 모드에서 작동 안 함. `anthropics/claude-code#8938` 미해결.
- **`--codex`, `--claude` 플래그**: CLI executor path로 라우팅되나, 위 두 문제로 실제 실행 불가.
- Claude CLI + Codex 모두 차단된 상태에서 **Nested Spawn Coordinator (Agent tool)이 유일한 실제 리뷰 경로**.

---

## 3. 다음 작업 우선순위

### 3.1 즉시 진행 가능

1. **글로벌 플러그인 재동기화**: 코드 변경이 많으므로 글로벌 캐시/마켓플레이스 sync 필요.

2. **E38 테스트에 `request_text` 검증 추가**: diff review에서 pragmatics와 evolution 두 lens가 독립적으로 지적. `request_text`가 `PrepareOnlyResult`에서 유일한 비파생 값이므로 존재/비공백 검증 필요.

3. **Synthesize packet에 tagging 예방 규칙 추가**: "Every finding ID from lens outputs must appear in exactly one of the 4 classification sections" — 태깅 누락 확률을 낮추는 예방 조치. (감지/재시도는 불필요하다고 판단 — lens output 파일 참조로 구조적 누락 방지 완료.)

### 3.2 진화 항목 (discovered-enhancements.md)

4. directory target 패턴 기반 최소 파일 세트 포함
5. git diff target의 kind/scope 분리 (현재 `single_text`로 우회)
6. cross-project 리뷰 UX 개선

---

## 4. 개발 원칙 요약

치환 작업 시 아래를 따른다 (`dev-docs/ontology-as-code-guideline.md` §8.3):

> **"이것 없이 다음 실행이 성공할 수 있는가?"**
> - 아니오 → 지금 구현 (blocker)
> - 예 → 기록만 하고, 실행 성공 이후에 구현 (enhancement)

의사결정 프레임 (`dev-docs/llm-native-development-guideline.md`):
1. 의미 판단 필요? → LLM
2. 경계 제어 필요? → runtime
3. 품질 무해 고정 가능? → script

---

## 5. 핵심 파일 맵

| 역할 | 파일 |
|---|---|
| 개발 원칙 | `CLAUDE.md`, `dev-docs/ontology-as-code-guideline.md`, `dev-docs/llm-native-development-guideline.md` |
| 진화 기록 | `dev-docs/discovered-enhancements.md` |
| E2E 테스트 | `src/core-runtime/cli/e2e-review-invoke.test.sh` (`npm run test:e2e`) |
| 실행 entrypoint | `src/core-runtime/cli/review-invoke.ts` |
| executor | `src/core-runtime/cli/subagent-review-unit-executor.ts`, `api-review-unit-executor.ts`, `agent-teams-review-unit-executor.ts` |
| artifact 유틸 | `src/core-runtime/review/review-artifact-utils.ts`, `materializers.ts` |
| 타입 | `src/core-runtime/review/artifact-types.ts` |
| 렌더러 | `src/core-runtime/cli/render-review-final-output.ts` |
| 설정 | `.onto/config.yml` |
| **스킬 (thin entrypoint)** | `commands/review.md` |
| **coordinator 계약** | `dev-docs/review-nested-spawn-coordinator-contract.md` |

---

## 6. 이번 세션 커밋 이력 (2026-04-06)

| Commit | 내용 |
|---|---|
| `56904f8` | Nested Spawn Coordinator: thin entrypoint + execution contract |
| `3489920` | synthesize heading mismatch 수정 |
| `4ed31fe` | `--prepare-only` 플래그 추가 |
| `25a9658` | 외부 레포 의존성 제거 (38/38 ALL PASS) |
| `3e8e74d` | Individual Lens Findings 참조를 final output에 추가 |
