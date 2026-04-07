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
3. `authority/ontology-as-code-guideline.md`
4. `authority/llm-native-development-guideline.md`
5. `authority/llm-runtime-interface-principles.md`
6. `commands/review.md`
7. `processes/review/productized-live-path.md`
8. `processes/review/nested-spawn-coordinator-contract.md`

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
- **Config 적용 순서 체인**: 내장 기본값 → ontoHome config → projectRoot config → CLI 플래그 (last-wins: 나중에 적용되는 것이 이전 것을 덮어씀). 배열: replace, excluded_names: union.
- **Discovery 모듈**: `src/core-runtime/discovery/` — onto-home.ts, project-root.ts, config-chain.ts.
- **Executor 직접 경로 해석**: `npm run` 대신 `{ontoHome}/dist/` 또는 `{ontoHome}/src/` + tsx. `ONTO_HOME` env를 spawned executor에 전파.
- directory listing 필터 (62K → 348줄), embed truncation (300줄), kind `directory_listing` 통일.
- executor 5종: mock, subagent, agent-teams, codex, api (anthropic/openai).
- `--diff-range` git diff target 지원. Agent tool 경로 E2E 성공.
- synthesize packet에 Required Output Sections + Tagging Completeness Rule.
- Individual Lens Findings 참조가 final-output.md에 포함.
- **Coordinator State Machine (DeterministicStateEnforcer)**: `onto coordinator start` → `next` → `next` 패턴. 9개 state, 12 간선. auto state 전이는 완료 후 기록 (크래시 안전).
- E2E 테스트 **49건 ALL PASS**.
- **Codex CLI 재활성화됨** (v0.118.0). `subagent + codex` 경로 사용 가능.

### 2.2 작동하는 실행 경로

| 환경 | 방법 | 비용 | 상태 |
|---|---|---|---|
| Claude Code 세션 (state machine) | `onto coordinator start` → Agent dispatch → `onto coordinator next` × 2 | 구독 | **작동 (권장)** |
| Claude Code 세션 (기존) | `onto review --prepare-only` → Agent tool dispatch → `onto review --complete-session` | 구독 | **작동 (하위 호환)** |
| Claude Code 세션 (diff) | 위와 동일 + `--diff-range` | 구독 | **작동** |
| CLI (codex executor) | `onto review <target> <intent> --codex` | Codex 할당량 | **작동 (재활성화됨)** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization mock` | 무료 | **작동** |
| 글로벌 CLI (어디서든) | `onto review <target> <intent> --executor-realization api` | API 과금 | **작동** |
| repo-local CLI | `npm run review:invoke -- ...` | executor별 | **작동 (하위 호환)** |

### 2.3 작동하지 않는 것 / 제한

- **Claude CLI subprocess 경로 차단**: `--claude` 플래그 (subagent/agent-teams + claude CLI subprocess). 인증 버그 `anthropics/claude-code#8938` 미해결 + 복구 계획 없음. Agent Teams/Agent tool 경로는 정상 작동.
- **Platform scope**: macOS, Linux만 지원. Windows는 별도 설계.

### 2.4 실행 경로 복구 계획

| 차단된 경로 | 차단 원인 | 복구 조건 | 복구 행동 |
|---|---|---|---|
| api + anthropic | API 키 + 과금 필요 | `ANTHROPIC_API_KEY` 설정 | `--executor-realization api` E2E 검증 |

**참고**: Claude CLI subprocess 경로(`--claude`)는 복구 계획에서 제외. Agent Teams + Agent tool이 동일 기능을 구독 내에서 제공하므로 Claude CLI subprocess 경로의 실질적 가치가 없음.

---

## 3. 다음 작업

### 3.1 완료: Coordinator State Machine 구현

설계 v3 기반 구현 완료. E2E 49/49 ALL PASS.

| 파일 | 변경 |
|---|---|
| `src/core-runtime/cli/coordinator-state-machine.ts` | **신규**. 상태 전이 + auto state 실행 + dispatch 지시 생성 |
| `src/core-runtime/review/artifact-types.ts` | CoordinatorStateName, CoordinatorStateFile, CoordinatorStateTransition, CoordinatorAgentInstruction, CoordinatorStartResult, CoordinatorNextResult, ALLOWED_TRANSITIONS |
| `src/cli.ts` | `coordinator start`, `coordinator next`, `coordinator status` 서브커맨드 |
| `package.json` | coordinator:start/next/status 스크립트 추가 |
| `commands/review.md` | state machine 기반 coordinator 패턴으로 갱신 |
| `processes/review/nested-spawn-coordinator-contract.md` | state machine 기반 재서술 (7-phase → state machine) |
| `authority/core-lexicon.yaml` | DeterministicStateEnforcer, auto_state, await_state, terminal_state 등록 |
| E2E 테스트 | E45~E49: coordinator start/status/next-halt/next-terminal/full-cycle |

실행 패턴: `onto coordinator start <target> <intent>` → lens Agent dispatch → `onto coordinator next` → synthesize Agent dispatch → `onto coordinator next` → presentation

### 3.2 완료: Learn Phase 1 + 1.5 구현

커밋: `56e52b5` (구현), `f814d05` (Eval 버그 수정 5건)

**Phase 1 (C-1~C-4, C-6, C-6b, C-7)**: 기존 학습을 prompt packet에 자동 삽입
**Phase 1.5 (C-3c, C-5a, C-5b)**: 타도메인 규칙 포함 + tier 정렬 + 토큰 예산

| 파일 | 역할 |
|---|---|
| `src/core-runtime/learning/loader.ts` | 학습 로딩 파이프라인 전체 |
| `src/core-runtime/cli/materialize-review-prompt-packets.ts` | prompt packet 삽입 + manifest 기록 |
| `authority/core-lexicon.yaml` | 4개 용어 등록 |
| `.onto/temp/phase-1.5-design-draft.md` | Phase 1.5 설계 (2회 9-lens 리뷰) |
| `.onto/temp/learn-implementation-design-v4.md` | 전체 설계 v4 (5회 9-lens 리뷰) |

**Eval 결과**: CTRL vs EXP 비교 3/3 PASS (발견 수 +43%, Applied Learnings 명시 보고, 타도메인 기여 확인)

**환경변수**: `ONTO_LEARNING_LOAD_DISABLED=1` (전체 비활성), `ONTO_LEARNING_TIER_DISABLED=1` (Phase 1 fallback), `ONTO_LEARNING_CROSS_DOMAIN_DISABLED=1` (C-3c 비활성)

**주의**: `./bin/onto`는 `dist/` 우선 사용. 코드 변경 후 `npx tsc --outDir dist` 필수.

### 3.3 완료: Learn Phase 2 설계 (5회 9-lens 리뷰)

설계 문서: `/Users/kangmin/.claude-1/plans/logical-snuggling-parrot.md` (v4, R5 반영)

**리뷰 이력**:
- R1 (v1, 20260407-d724d7da): 13건 지적 → 전면 재설계
- R2 (v2, 20260407-acce5778): 6건 잔여
- R3 (v3, 20260407-3e8c4f9f): consensus 해소
- R4 (v3, 20260407-a7fb71c8): blocker 2건 + enhancement 5건
- R5 (v4, 20260407-be89dd41): IA-1 해소, IA-2 구현 시 해소

**최종 판정**: shadow-first 조건부 GO. blocker 0건 (구현 시 자연 해소).

### 3.4 즉시 진행: Learn Phase 2 구현

**읽을 파일** (구현 시작 전):
1. `/Users/kangmin/.claude-1/plans/logical-snuggling-parrot.md` — Phase 2 설계 v4 (정규 설계 문서)
2. `.onto/temp/learn-implementation-design-v4.md` — 상위 설계 (§2 축적 원자 작업 + §1 인터페이스 계약)
3. `src/core-runtime/learning/loader.ts` — Phase 1.5 구현 (공유 모듈 기준)
4. `src/core-runtime/cli/coordinator-state-machine.ts` — completing 상태 (Step 2.5 삽입 대상)

**구현 순서** (14개 파일):
```
F0(shared/mode.ts) → F1(shared/patterns.ts) → F2(shared/paths.ts) → F9(loader.ts import 변경)
→ F3(shared/llm-caller.ts) → F4(shared/duplicate-check.ts) → F5(shared/semantic-classifier.ts)
→ F8(prompt-sections.ts) → F12(artifact-types.ts 타입) → F11(materialize 프롬프트 주입)
→ F7(feedback.ts) → F6(extractor.ts) → F13(start-review-session.ts 모드 영속)
→ F10(coordinator-state-machine.ts Step 2.5 통합)
```

**구현 시 반영할 R5 잔여 3건**:
1. read path에서 `readExtractMode()` 사용 (raw cast 금지) — F10, F11에서 적용
2. manifest 필드명 `items_unclassified_pending` 사용 — F12에서 적용
3. `schema_version: "1"` 유지 (Phase 2 첫 배포)

**환경변수**: `ONTO_LEARNING_EXTRACT_MODE=disabled|shadow|active` (단일 enum)

**빌드**: 코드 변경 후 `npx tsc --outDir dist` 필수 (`./bin/onto`는 dist/ 우선)

**Phase 2 배포 전제** (설계 v4 §5):
1. 진행 중 세션 없음
2. `ONTO_LEARNING_EXTRACT_MODE=shadow` 환경변수
3. 10건 shadow mode 통과 후 `active` 전환

### 3.4 진화 항목

1. directory target 패턴 기반 최소 파일 세트 포함 (enhancement)
2. git diff target의 kind/scope 분리 (enhancement, 영향 범위 큼)
3. lens rename (onto_ 접두사 제거 + CLI `lens` + `.lens/` + `LENS_HOME`) — 보류

---

## 4. 개발 원칙 요약

치환 작업 시 아래를 따른다 (`authority/ontology-as-code-guideline.md` §8.3):

> **"이것 없이 다음 실행이 성공할 수 있는가?"**
> - 아니오 → 지금 구현 (blocker)
> - 예 → 기록만 하고, 실행 성공 이후에 구현 (enhancement)

의사결정 프레임 (`authority/llm-native-development-guideline.md`):
1. 의미 판단 필요? → LLM
2. 경계 제어 필요? → runtime
3. 품질 무해 고정 가능? → script

---

## 5. 핵심 파일 맵

| 역할 | 파일 |
|---|---|
| 개발 원칙 | `CLAUDE.md`, `authority/ontology-as-code-guideline.md`, `authority/llm-native-development-guideline.md` |
| 진화 기록 | `dev-docs/tracking/20260406-discovered-enhancements.md` |
| E2E 테스트 | `src/core-runtime/cli/e2e-review-invoke.test.sh` (`npm run test:e2e`) |
| 실행 entrypoint | `src/core-runtime/cli/review-invoke.ts` |
| executor | `src/core-runtime/cli/subagent-review-unit-executor.ts`, `api-review-unit-executor.ts`, `agent-teams-review-unit-executor.ts` |
| artifact 유틸 | `src/core-runtime/review/review-artifact-utils.ts`, `materializers.ts` |
| 타입 | `src/core-runtime/review/artifact-types.ts` |
| 렌더러 | `src/core-runtime/cli/render-review-final-output.ts` |
| 설정 | `.onto/config.yml` |
| **스킬 (thin entrypoint)** | `commands/review.md` |
| **coordinator state machine** | `src/core-runtime/cli/coordinator-state-machine.ts` |
| **coordinator 계약** | `processes/review/nested-spawn-coordinator-contract.md` |
| **글로벌 CLI** | `src/cli.ts`, `bin/onto` |
| **discovery** | `src/core-runtime/discovery/onto-home.ts`, `project-root.ts`, `config-chain.ts` |

---

## 6. 이번 세션 요약

23건 커밋. 49/49 E2E ALL PASS. 주요 성과:

- Nested Spawn Coordinator + 글로벌 CLI `onto review` + `--prepare-only`
- Role/Domain 해석 정책 + Config 적용 순서 체인 + Lens registry
- Coordinator CLI helpers + Trust Boundary + Domain 해석 정책
- Synthesize heading fix + Lens findings refs + Tagging 규칙
- 9-lens self-review 5회 실행, 각 리뷰 결과 반영
- Coordinator State Machine v3 설계 완료 (3회 리뷰 iteration)
- **Coordinator State Machine 구현**: 8파일 변경, E2E 5건 추가 (E45~E49)
