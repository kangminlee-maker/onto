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
- E2E 테스트 37건 중 36건 PASS (`npm run test:e2e`). 1건(E24 diff+bundle)은 외부 레포 git 상태 문제.
- edge case 107건 분석, 보안/높은/중간 우선순위 전부 수정.
- executor 5종 구현: mock, subagent, agent-teams, codex, api (anthropic/openai).
- `--diff-range` git diff target 지원.
- 외부 target boundary auto-approve.
- Claude→codex 자동 fallback.
- `discovered-enhancements.md`에 진화 항목 4건 기록.
- **Nested Spawn Coordinator 스킬 구현 완료** (2026-04-06):
  - `commands/review.md`를 thin entrypoint로 축소 (경로 선택 + 사용자 옵션만 남김)
  - `dev-docs/review-nested-spawn-coordinator-contract.md` 신규 생성 (7-phase 실행 계약)
  - 9-lens 자가 리뷰로 검증 → 6건 finding 전부 반영
  - authority seat 분리, artifact-derived 값 참조, ReviewRecord chain 보강, boundary quartet/extension points 선언

### 2.2 작동하는 실행 경로

| 환경 | coordinator | lens executor | 비용 | 상태 |
|---|---|---|---|---|
| Claude Code 세션 | **Nested Spawn Coordinator** | Agent tool (세션 내) | 구독 | **작동 (권장)** |
| Claude Code 세션 | Agent coordinator (nested) | Agent subagent | 구독 | **작동** |
| CLI (어디서든) | `review:invoke` | api (anthropic) | API 과금 | **작동** |
| CLI (어디서든) | `review:invoke` | api (openai) | API 과금 | **작동** |
| CLI (어디서든) | `review:invoke` | mock | 무료 | **작동 (테스트용)** |

### 2.3 작동하지 않는 것 / 제한

- **Codex CLI 비활성화** (2026-04-06): 과금 문제로 `codex` → `codex.disabled`로 이름 변경. codex executor, codex fallback 모두 차단 상태. 재활성화: `mv /opt/homebrew/bin/codex.disabled /opt/homebrew/bin/codex`
- **Claude CLI subprocess 인증**: `CLAUDE_CODE_OAUTH_TOKEN`, setup-token, Keychain 모두 `-p` 모드에서 작동 안 함. `anthropics/claude-code#8938` 미해결.
- Claude CLI + Codex 모두 차단된 상태에서 **Nested Spawn Coordinator (Agent tool)이 유일한 실제 리뷰 경로**.

---

## 3. 다음 작업 우선순위

### 3.1 즉시 진행 가능

1. **Nested Spawn Coordinator 실전 E2E 검증**: Agent tool 경로로 실제 리뷰 1건 실행. `review:start-session` → Agent dispatch → `review:complete-session` 흐름을 commands/review.md 스킬 호출로 end-to-end 검증.

2. **`start-session` arg pre-processing gap 해소**: 현재 coordinator의 Phase 1에서 `review:start-session`에 positional arg를 직접 전달할 수 없음 (start-session은 `--option value` 형식만 인식). `review:invoke`의 `resolveReviewInvokeInputs()` 로직을 coordinator가 수행하거나, `review:invoke --skip-execution` 플래그 추가 필요.

3. **`--diff-range` 실제 executor 테스트**: mock으로만 검증됨. Agent tool 경로로 실제 diff review 1건 실행.

4. **글로벌 플러그인 재동기화**: 코드 변경이 많으므로 글로벌 캐시/마켓플레이스 sync 필요.

### 3.2 진화 항목 (discovered-enhancements.md)

5. directory target 패턴 기반 최소 파일 세트 포함
6. git diff target의 kind/scope 분리 (현재 `single_text`로 우회)
7. cross-project 리뷰 UX 개선

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
| 설정 | `.onto/config.yml` |
| **스킬 (thin entrypoint)** | `commands/review.md` |
| **coordinator 계약** | `dev-docs/review-nested-spawn-coordinator-contract.md` |

---

## 6. 작업 트리 주의사항

현재 worktree에 uncommitted 변경이 있다:
- `AGENTS.md` (수정)
- `commands/review.md` (수정)
- `dev-docs/review-nested-spawn-coordinator-contract.md` (신규)
- `CURRENT_WORK_HANDOFF.md` (수정)

이 변경들은 nested spawn coordinator 구현의 일부이므로 함부로 reset하지 않는다.
