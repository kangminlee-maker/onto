---
as_of: 2026-04-18
status: active
functional_area: sketch-v3-post-merge-cleanup-and-e2e-migration
purpose: |
  Sketch v3 track 13 PR (#99~#111) 전수 merge 완료 후 남은 cleanup,
  refactor, deferred 작업을 다음 세션이 연속 실행할 수 있도록 정리.
  이번 세션 (2026-04-18) 은 "broad breadth, pragmatic scope" 전략으로
  type-level 제거 + opt-in 통합에 집중, **runtime dead code 와 실 E2E**
  는 다음 세션 대상. 본 handoff 는 /clear 후 새 세션이 즉시 착수할 수
  있도록 우선순위 + scope + 진입점 을 self-contained 로 제공.
source_refs:
  prior_sketch_v3_handoff: "development-records/plan/20260418-sketch-v3-implementation-handoff.md (PR-A~E 계획, 완수)"
  merged_prs: "#99 (PR-A foundation) → #111 (PR-K removal). 13 PRs."
  memory_sketch_v3_complete: "project_sketch_v3_complete.md (13 PR 완결 기록)"
  memory_sketch_v3_deferred: "project_sketch_v3_deferred.md (5 deferred 항목, 모두 COMPLETED)"
  memory_e2e_migration: "project_e2e_test_migration.md (3 E2E 파일 개선 플랜)"
---

# Cleanup & Refactor Handoff — 2026-04-18 → Next Session

## 0. /clear 후 첫 명령

```
development-records/plan/20260418-cleanup-and-refactor-handoff.md 읽고 §2 부터 우선순위 순서대로 진행해줘
```

새 세션은 §2 의 **Priority 1 (dead code cleanup) 또는 Priority 2 (E2E test migration) 중 하나** 를 먼저 선택 (두 트랙 독립, 상호 의존성 없음). 두 트랙 모두 본 세션 사이즈 (13 PR 연속 실행) 보다 작음 — 여유가 있으면 priority 3 (자동 deliberation) 또는 4 (실 E2E 실행) 로 진행.

## 1. 현재 저장소 상태 (2026-04-18 세션 종료 시점)

### 1.1 Main 의 최신 상태

- **`b81fa17`** `feat(topology)!: OntoConfig 에서 legacy 5 필드 제거 (PR-K, removal stage) (#111)`
- **`8ab23bf`** `feat(topology)!: legacy field deprecation warning → error stage (PR-J) (#110)`
- **`d409289`** `feat(topology): smoke test scripts for topology end-to-end verification (PR-M) (#109)`
- **`1dc4583`** `feat(topology): runReviewInvokeCli 내 codex-nested 분기 (PR-L) (#108)`
- **`8dafdb9`** `docs(topology): coordinator prompt topology field 소비 명시 (PR-I) (#107)`
- (이전 7 PRs) `#99~#106` — Foundation A~E + Integration F/G/H

### 1.2 검증 상태

- `npm run check:ts-core` — **0 에러**
- `npm run lint:output-language-boundary` — **401 files / 0 violations**
- 전체 `npx vitest run` — **1568 passed / 5 skipped**
- 3 pre-existing E2E "실패" 잔존 (vitest 포맷 불일치 + 일부 stale fixtures) — §2 Priority 2 에서 다룸

### 1.3 Sketch v3 track 완결 상태

Sketch v3 §7.4 Phase D 3-stage roadmap 전부 완료:

- Stage 1 (warning) — PR #103
- Stage 2 (error) — PR #110
- Stage 3 (removal) — PR #111

Deferred 5 항목 모두 COMPLETED — `project_sketch_v3_deferred.md` 참조.

## 2. 다음 세션 우선순위 (독립 트랙)

### Priority 1 — Runtime dead code cleanup

**Context**: PR-K (#111) 가 OntoConfig 타입에서 legacy 5 필드를 제거했지만, 이 필드를 READ 하는 runtime 코드는 `Record<string, unknown>` cast 로 여전히 남아 있음. PR-J (#110) 가 config load 시점에 throw 하므로 이 read 경로는 **도달 불가능한 dead code**. 코드 위생 + 가독성 + topology resolver 의 단일 seat 지위 강화를 위해 제거.

**Scope**:

- `src/core-runtime/review/execution-plan-resolver.ts`:
  - P1b: `configHost === "codex"` 분기 — DEAD
  - P1c: `configHost === "claude"` 분기 — DEAD
  - P1d: `configHost === "litellm" | "anthropic" | "openai"` — DEAD
  - P1e: `configHost === "standalone"` — DEAD
  - (P1a `explicitCodex` 플래그는 유지 — CLI flag, OntoConfig 와 무관)
  - (P1f env `ONTO_HOST_RUNTIME` 는 유지 — env override 여전히 유효)
  - (P2~P4 auto-detection 은 유지 — claudeHost / codexAvailable / external_http_provider 기반)
  - `configRealization` 읽기 → DEAD (post-P1 removal)
  - `api_provider` 읽기 → 보류 검토 (external_http_provider 로 대체되지만 historical alias)
- `src/core-runtime/cli/review-invoke.ts`:
  - `resolveExecutorConfig` 의 legacy auto-select 블록 (~720~737) — DEAD
  - `appendSubagentLlmArgs` 의 `legacyApiProvider` 읽기 — DEAD
  - `resolveExecutionProfile` 의 P1 projection (standalone coercion 포함) — DEAD
  - `runReviewInvokeCli` 의 `hostRuntimeForAssessment` 읽기 — DEAD (complexity assessment trigger)
- `src/core-runtime/discovery/config-profile.ts`:
  - `validateProfileCompleteness` 의 host 분기 (claude/codex/anthropic/openai/litellm/standalone) — DEAD
  - `summarizeProfile` 의 legacy field 출력 — 유지 가능 (error message 용도 일 때만)
  - `LEGACY_PROFILE_FIELDS` 를 `PROFILE_FIELDS` 에서 분리 — detection 전용으로 명시
- `src/core-runtime/learning/shared/llm-caller.ts`:
  - `config.api_provider` / `config.host_runtime` 읽기 — DEAD (후속 PR #94 이후 external_http_provider 로 대체됨)

**예상 ripple**:

- 기존 unit test 의 P1 branch 검증 테스트 (~20 건) → 삭제 또는 topology-path 로 전환
- `config-profile.test.ts` 의 atomic profile adoption 테스트 → 단순화
- Error message 일부가 짧아짐 (legacy guidance 제거)

**Strategy**:

1. Feature branch `feat/cleanup-dead-legacy-paths`
2. 위 파일들 P1 관련 블록 주석 `PR-K: dead code post-PR-J` 로 마크된 곳 식별
3. 해당 블록 삭제 (함수 전체 / 분기 / 읽기)
4. Affected test 수정 (삭제 or 리팩터)
5. Typecheck + vitest + lint 반복
6. 1 개 PR 로 merge

**Size**: 중간 (~400~600 줄 삭제, 테스트 10~20 건 삭제·수정)

**Risk**: 낮음 (runtime 에서 도달 불가능한 코드 삭제) — 단, test 에서 검증하던 branch 들이 사라지므로 test set 은 topology-path 로 재작성해야 함.

### Priority 2 — E2E test migration (3 파일)

**Context**: 현재 vitest 가 3 E2E 파일을 "No test suite found" 로 실패 처리. 직접 `npx tsx <path>` 실행 시:

- `e2e-promote.test.ts` (8479 줄) — **164/0 pass** (포맷만 vitest 불일치)
- `e2e-start-review-session.test.ts` (371 줄) — 6/**5 fail** (learning_extract_mode 미해결, **실제 regression 가능성**)
- `e2e-codex-multi-agent-fixes.test.ts` (853 줄) — 23/**6 fail** (PR #96 atomic profile adoption 과 stale fixtures)

**Scope**: `project_e2e_test_migration.md` 의 Phase A/B/C 참조.

**권장 순서**:

1. **e2e-promote**: Phase A 만. 164 test 가 전부 pass 하는 상태에서 format 만 vitest `describe/it` 로 변환 → CI 가시화.
2. **e2e-start-review-session**: Phase B. 5 failure 의 근본 원인 진단.
   - 가설: PR #96 의 `mergeOrthogonalFields` 또는 `resolveReviewSessionExtractMode` 가 `learning_extract_mode` 를 올바르게 전달하지 않음.
   - Phase 1: 진단 (real regression 인지 stale assertion 인지).
   - Phase 2: 진단 결과에 따라 코드 수정 또는 test 업데이트.
   - Phase 3: vitest 포맷 변환.
3. **e2e-codex-multi-agent-fixes**: Phase C. 6 fixtures 를 `host_runtime: codex` + topology priority 를 포함한 완전한 profile 로 업데이트. B-1~B-6 은 PR #96 이후 유효한 케이스로 재해석 (partial profile tolerance → atomic profile adoption).

**Size**: 대 (e2e-promote 만 8479 줄 rewrite). 3 PR 로 분할 권장.

**Risk**: Phase B 진단에 따라 real regression 발견 가능성 — 가치 있는 결과.

### Priority 3 — 자동 deliberation (state machine wiring)

**Context**: PR-I (#107) 가 prompt 레벨에서 §16 deliberation protocol 을 명시했지만, 실제 `awaiting_deliberation` state 는 `coordinator-state-machine.ts:510` 에서 `throw "not yet implemented"`. Coordinator subagent 는 현재 수동으로 SendMessage 호출해야 함.

**Scope**: `src/core-runtime/cli/coordinator-state-machine.ts` 의 awaiting_deliberation case 구현:

- Trigger: synthesis output의 `deliberation_status` 가 `required` 이고 topology.id === "cc-teams-lens-agent-deliberation"
- Action: PR-D (`teamcreate-lens-deliberation-executor.ts`) 의 `buildDeliberationRound1Prompt` / `buildDeliberationRound2Prompt` 를 호출해 agent 지시 페이로드 구성
- Response: coordinator subagent (Claude) 가 SendMessage 실행 후 결과 artifact 를 받아 state 진행
- Completion: round1 (+ round2) 완료 → artifact 검증 → `completing` state 로 전이

**Strategy**:

- coordinator-state-machine.ts 는 TypeScript 이므로 SendMessage 자체를 호출할 수는 없음 — 대신 Claude agent 에게 전달할 **agents[] 지시 페이로드** 를 반환 (기존 `awaiting_lens_dispatch` 와 동일 패턴).
- agent 페이로드에 deliberation round prompt + 응답 기록 경로 (`deliberation/round1/<lens>-deliberation.md`) 명시.
- Coordinator Claude 가 이 지시를 따라 SendMessage 호출 + artifact 작성.
- 다음 `next` 호출 시 coordinator-state-machine 이 artifact 존재 확인 → `completing` 진행.

**Size**: 중간 (~300 줄 추가 + test).

**Risk**: 높음 — prompt engineering 성격 (Claude 가 실제로 지침을 따르는지 검증 필요). 수동 Claude Code 세션 smoke test 필요.

### Priority 4 — Real E2E smoke execution

**Context**: PR-M (#109) 가 `scripts/smoke-topology/` 에 3 자동 스크립트 + 5 수동 가이드 준비. 실제 실행은 비용 이슈로 주체자 승인 후.

**Scope**: 각 스크립트 실행 + 결과 기록.

- `bash scripts/smoke-topology/codex-nested-subprocess.sh` — 가장 self-contained
- `bash scripts/smoke-topology/cc-main-codex-subprocess.sh`
- `bash scripts/smoke-topology/codex-main-subprocess.sh`
- (수동) Claude Code 세션에서 5 Claude-host topology

**비용 예상**: 각 실행 당 lens N (=9) + synthesize 1 = 10 LLM call. 7 topology × 10 = 70 call. Claude Code / ChatGPT 구독 내 소비 (외부 API key 요금 아님).

**Strategy**:

1. 주체자 승인 획득 ("smoke test 실행 OK" 명시).
2. 각 topology 순차 실행 (병렬 시 sandbox 충돌 가능성).
3. 결과 (pass/fail, 발견된 문제) 를 `development-records/benchmark/20260418-topology-smoke-results.md` 에 기록.
4. 발견된 bug 는 후속 PR 로 수정.

**Size**: 작 (실행 + 결과 기록 만). 단 smoke 가 **실패할 경우** 버그 수정 PR 이 파생됨.

**Risk**: 실행 자체 low risk. 발견된 버그의 수정이 다음 트랙.

## 3. 의존성 그래프

```
Priority 1 (dead code cleanup)       ┐
Priority 2 (E2E test migration)       ├── 독립. 주체자 우선순위 판단
Priority 3 (자동 deliberation wiring) ┘

Priority 4 (real smoke execution)    ── 주체자 승인 필요. 언제든 가능
```

**권장 순서**:

1. Priority 1 먼저 (가장 clean-up 성격 강함, risk 낮음).
2. Priority 2 다음 (value 높음, 특히 Phase B 진단에서 regression 발견 가능).
3. Priority 3 또는 4 선택 (time / budget 에 따라).

두 세션 이상으로 분리 가능. 1+2 한 세션, 3+4 다음 세션 pattern 추천.

## 4. 세션 시작 체크리스트

새 세션 `/clear` 직후:

- [ ] `git status` — main, clean
- [ ] `git log --oneline -5` — 최신 5 commits 가 #107~#111 + cleanup 시작 전
- [ ] `npm run check:ts-core` — 0 에러
- [ ] `npx vitest run 2>&1 | grep -E "Tests "` — 1568 passed / 5 skipped
- [ ] MEMORY.md 의 `project_sketch_v3_complete` + `project_sketch_v3_deferred` + `project_e2e_test_migration` 3 entry 확인
- [ ] 본 handoff (`20260418-cleanup-and-refactor-handoff.md`) §2 읽고 우선순위 선택

## 5. Anti-patterns (이번 세션에서 학습)

이번 2026-04-18 세션에서 발견한 주의점:

### 5.1 Type-level 제거 != 코드 제거

PR-K 가 OntoConfig 타입에서 legacy 5 필드를 제거했으나, 실제 reading code 는 `Record<string, unknown>` cast 로 남아있음. 이것은 "silent skip" 이 아니라 runtime dead code — PR-J 의 throw 가 먼저 작동. 다음 세션 Priority 1 은 이 dead code 를 물리적으로 제거.

### 5.2 Vitest 포맷 불일치 = silent 실패

`*.test.ts` 확장자를 쓰지만 custom minimal test runner (`async function test()`, `passCount`) 를 쓰는 파일 3 개는 vitest 가 "No test suite found" 로 실패 처리. 이는 **실제 테스트 실패** 와 동일한 종료 코드. 포맷 변환 필요.

### 5.3 Legacy field 가 야기하는 dual 의미

`host_runtime` 같은 필드 이름이 (a) OntoConfig INPUT (user config) 과 (b) ExecutionPlan OUTPUT (resolver 결과) 양쪽에 존재. PR-K 는 (a) 를 제거했지만 (b) 는 유지 — 이 이중성은 의도적이나 혼동 가능. 새 코드 작성 시 이 구별 명확히.

## 6. Memory pointers

다음 세션이 참조할 핵심 memory:

- `project_sketch_v3_complete.md` — 13 PR 완결 기록. 경로별 현재 상태 요약 테이블 포함
- `project_sketch_v3_deferred.md` — 5 항목 완료 상태 (이력 참조용)
- `project_e2e_test_migration.md` — Priority 2 상세 (Phase A/B/C)
- `MEMORY.md` — 전체 인덱스

## 7. 본 handoff 의 라이프사이클

- **Active**: 다음 세션이 Priority 1~4 중 하나를 시작할 때까지
- **Superseded**: 첫 PR 생성 시점에 `status: superseded` + 갱신된 handoff (cleanup 완료 상태 반영) 작성
- **Archive**: 모든 priority 완료 시 `development-records/benchmark/` 로 최종 결과 집계 후 archive

## 8. Reference

- Sketch v3 track wrap: `project_sketch_v3_complete.md`
- Sketch v3 설계: `development-records/evolve/20260418-execution-topology-priority-sketch.md`
- 구현 handoff (이전): `development-records/plan/20260418-sketch-v3-implementation-handoff.md`
- Migration guide: `docs/topology-migration-guide.md`
- Coordinator prompt: `processes/review/nested-spawn-coordinator-contract.md` §2.2 + §16
- Smoke scripts: `scripts/smoke-topology/`
