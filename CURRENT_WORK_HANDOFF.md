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
- **글로벌 CLI** `onto review <target> <intent>` — 어디서든 실행 가능 (2026-04-06).
- `onto info` — resolved onto home, project root 표시.
- **Nested Spawn Coordinator**: `onto review --prepare-only` → Agent tool dispatch → `onto review --complete-session`. Codex/Claude CLI 없이 구독 내 작동.
- **`--prepare-only` 플래그**: 전처리 + 세션 준비까지만 수행. `PrepareOnlyResult` interface.
- **Role/Domain 해석 정책**: core roles는 ontoHome only (project override 금지). custom roles는 projectRoot → ontoHome fallback. terminal failure = error.
- **Config 우선순위 체인**: ontoHome config + projectRoot config 4-tier merge. 스칼라: last-wins, 배열: replace, excluded_names: union.
- **Discovery 모듈**: `src/core-runtime/discovery/` — onto-home.ts, project-root.ts, config-chain.ts.
- **Executor 직접 경로 해석**: `npm run` 대신 `{ontoHome}/dist/` 또는 `{ontoHome}/src/` + tsx. `ONTO_HOME` env를 spawned executor에 전파.
- directory listing 필터 (62K → 348줄), embed truncation (300줄), kind `directory_listing` 통일.
- executor 5종: mock, subagent, agent-teams, codex, api (anthropic/openai).
- `--diff-range` git diff target 지원. Agent tool 경로 E2E 성공.
- synthesize packet에 Required Output Sections + Tagging Completeness Rule.
- Individual Lens Findings 참조가 final-output.md에 포함.
- E2E 테스트 **42건 ALL PASS**.
- **Codex CLI 비활성화** (과금 문제). 재활성화: `mv /opt/homebrew/bin/codex.disabled /opt/homebrew/bin/codex`

### 2.2 작동하는 실행 경로

| 환경 | 방법 | 비용 | 상태 |
|---|---|---|---|
| Claude Code 세션 (기본) | `onto review --prepare-only` → Agent tool dispatch → `onto review --complete-session` | 구독 | **작동 (권장)** |
| Claude Code 세션 (diff) | 위와 동일 + `--diff-range` | 구독 | **작동** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization mock` | 무료 | **작동** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization api` | API 과금 | **작동** |
| repo-local CLI | `npm run review:invoke -- ...` | executor별 | **작동 (하위 호환)** |

### 2.3 작동하지 않는 것 / 제한

- **Codex CLI 비활성화**: 과금 문제로 차단. 재활성화: `mv /opt/homebrew/bin/codex.disabled /opt/homebrew/bin/codex`
- **Claude CLI subprocess 인증**: `-p` 모드에서 작동 안 함. `anthropics/claude-code#8938` 미해결.
- **Platform scope**: macOS, Linux만 지원. Windows는 별도 설계.

### 2.4 실행 경로 복구 계획

Nested Spawn Coordinator (Agent tool)이 현재 유일한 실제 리뷰 경로. model-independent 실행 가치의 임시 축소 상태.

| 차단된 경로 | 차단 원인 | 복구 조건 | 복구 행동 |
|---|---|---|---|
| subagent + codex | codex CLI 비활성화 (과금) | 예산 확보 | `mv codex.disabled codex` + E2E 검증 |
| subagent/agent-teams + claude | Claude CLI -p 인증 버그 #8938 | upstream 수정 | CLI 업데이트 + E2E 검증 |
| api + anthropic | API 키 + 과금 필요 | `ANTHROPIC_API_KEY` 설정 | `--executor-realization api` E2E 검증 |

---

## 3. 다음 작업 우선순위

### 3.1 진화 항목 (discovered-enhancements.md)

1. directory target 패턴 기반 최소 파일 세트 포함
2. git diff target의 kind/scope 분리 (현재 `single_text`로 우회)
3. Trust Boundary: .onto/ 최초 생성 확인 (auto-detection 프로덕션 전 blocker)

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
| **글로벌 CLI** | `src/cli.ts`, `bin/onto` |
| **discovery** | `src/core-runtime/discovery/onto-home.ts`, `project-root.ts`, `config-chain.ts` |

---

## 6. 커밋 이력 (2026-04-06)

| Commit | 내용 |
|---|---|
| `56904f8` | Nested Spawn Coordinator: thin entrypoint + execution contract |
| `3489920` | synthesize heading mismatch 수정 |
| `4ed31fe` | `--prepare-only` 플래그 추가 |
| `25a9658` | 외부 레포 의존성 제거 |
| `3e8e74d` | Individual Lens Findings 참조 추가 |
| `907330d` | HANDOFF 갱신 |
| `3cdd5c5` | E38 request_text 검증 |
| `8bd9b53` | Synthesize tagging 예방 규칙 |
| `96c49b4` | 글로벌 CLI 구현 (42/42 ALL PASS) |
| `c556342` | Role/Domain 해석 정책 + Config chain 교체 |
| `40366d2` | discovered-enhancements 갱신 (Trust Boundary 기록) |
