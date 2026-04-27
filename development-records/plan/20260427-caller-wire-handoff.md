# Caller wire commit — Handoff (post-PR236, next-session entry)

**작성**: 2026-04-27 evening (PR #236 squash merged `bdc8a1a` 직후)
**전제 진행 상태**: PR #236 (`bdc8a1a`) — A1 (coordinator deterministic spec entry) + A3 (principal_provided_rationale persist) + review fix-up (C-1+C-2+CC-1) 완결. caller wire 4 항목 + UF P3 2건 미완.
**다음 세션 first command**:
```
development-records/plan/20260427-caller-wire-handoff.md 읽고 caller wire 진행
```

## 0. 본 handoff 의 목적

`/clear` 후 다음 세션이 *본 doc 만 read 해도* caller wire commit 진행 가능하도록 spec 입력 / decision 영역 / sequencing / risk 정리. 본 doc 는 *결정* 을 하지 않고 *결정 가능한 표면* 만 제공 — 다음 세션의 첫 단계가 path 선택.

## 1. 사전 점검 (다음 세션 시작 시)

```bash
# main HEAD 확인
git log --oneline -3
# 기대: 8f3ea98 (handoff lifecycle update) 또는 그 이상
#       bdc8a1a (PR #236 caller wire spec entry) 그 다음

# coordinator 상태 확인
ls src/core-runtime/reconstruct/coordinator.ts \
   src/core-runtime/reconstruct/coordinator.test.ts
# 기대: 둘 다 존재

# handleReconstructCli 의 explore step 확인 (placeholder 상태)
grep -nE "explore.*placeholder|실제 Explorer.*loop" \
  src/core-runtime/evolve/commands/reconstruct.ts
# 기대: line ~10 의 doc comment + explore handler 의 placeholder

# main 동기 + 새 branch
git checkout main && git pull --ff-only origin main
git checkout -b track-b/caller-wire-commit
```

## 2. Architecture 확인 (이미 결정된 사항)

PR #236 review 의 CC-1 narrowing 단계에서 발견:
- **`reconstruct` activity 가 이미 deterministic CLI subprocess pattern 으로 wire 되어 있음**. `handleReconstructCli` (`src/core-runtime/evolve/commands/reconstruct.ts`) 가 4 step bounded path (start/explore/complete/confirm) 처리.
- `explore` step 이 *placeholder* 로 명시: "실제 Explorer/lens loop 는 build runtime 확장과 함께 채운다" (file header line ~10 + explore handler comment).
- `.onto/commands/reconstruct.md` 도 cli/command-catalog 에서 *generated* — prompt 본문 직접 수정 path (Path B) 도 결국 cli wire 에 의존.

**즉 architecture 결정은 이미 closed**: caller wire 의 자연 위치 = `handleReconstructCli` 의 explore step (또는 complete step) 안에서 `runReconstructCoordinator()` 호출. LLM sub-agent spawn 은 review-invoke.ts 의 spawn 패턴 차용 (codex subprocess / inline-http executor / mock).

5 활동 wire pattern 통일성도 자연 만족 — review (review-invoke.ts) 와 reconstruct (handleReconstructCli) 모두 *deterministic CLI subprocess + LLM sub-agent spawn* 패턴.

## 3. 미완 4 항목 + UF P3 2건 — 결정 영역

### 3.1 미완 항목 1 — Production caller wire (가장 큰 scope)

**Spec source**: PR #236 `coordinator.ts` header "Remaining production wiring scope" + configuration.md §4.11 (d) "다음 commit scope" 1번 항목 + INTEGRATION.md "다음 commit scope" 1번 항목.

**결정 영역**: `handleReconstructCli` 의 어느 step 에서 coordinator dispatch?
- **Path α — explore step 안에서 호출**:
  - explore step 이 1회 invocation = 1 cycle 의 reconstruct (Hook α → γ → δ → Phase 3 user response 대기)
  - 여러 번 호출 가능 (current explore_invocations counter) — multi-cycle 자연
  - placeholder 명시 위치라 가장 자연
- **Path β — complete step 안에서 호출**:
  - complete step 이 *single-shot full cycle* — start → explore (placeholder) → complete (coordinator)
  - explore 가 explorer loop 만, complete 가 Hook α/γ/δ + Phase 3.5
  - bounded surface 가 단순하지만 long-running step (LLM 다수 호출)

**권고**: **Path α (explore step)** — explore_invocations counter 가 cycle 단위와 자연 매핑. 1 explore = 1 coordinator cycle. complete 는 user 가 ontology-draft.md 검토 후 호출하는 *closure step* 으로 유지.

**LLM sub-agent spawn 구조** (Hook α 의 spawnProposer / Hook γ 의 spawnReviewer):
- review-invoke.ts 가 `assessComplexity` + `selectLenses` 후 `executeReviewPromptExecution` 으로 codex subprocess / inline-http / mock executor spawn
- coordinator 는 spawn 책임을 *deps 로 inject* (DI 패턴) — caller (handleReconstructCli) 가 spawn 함수 build
- spawn 의 실제 구현은 *별도 module* 로 추출 권고 — `src/core-runtime/reconstruct/spawn-proposer.ts` + `spawn-reviewer.ts` (review 의 codex-review-unit-executor.ts pattern parallel)

**scope 추정**:
- handleReconstructCli explore step 구현 (~50-100 lines, placeholder 제거 + coordinator 호출 + state 갱신)
- spawn-proposer.ts + spawn-reviewer.ts (~150-300 lines each, codex subprocess + mock + inline-http variants)
- handleReconstructCli 단위 test (~100-150 lines)
- e2e test (mock spawn) (~100 lines)
- **총 ~500-750 lines**

### 3.2 미완 항목 2 — onConfigAbsent log sink

**Spec source**: PR #236 coordinator.ts CONTRACT + post-PR232 backlog A2.

**결정 영역**: caller (handleReconstructCli) 가 어디로 emit?
- **Option (a) console.warn**: 단순 — 사용자 STDERR 로 즉시 보임
- **Option (b) session-log**: `{session_root}/reconstruct-state.json` 또는 별도 audit log 파일에 기록 — silent 하지만 추후 audit 가능
- **Option (c) (a) + (b) 동시**: 이중 emit — 사용자 즉시 + audit 보존
- **Option (d) dashboard**: 미래 dashboard 확장 시 — 현 시점 미해당

**권고**: **Option (c)** — console.warn (사용자 즉시 인지) + session-log 의 `events` array 에 record (audit 보존). reconstruct-state.json schema 에 `events: { type: "config_absent_default_v1_applied", emitted_at: ISO } []` 추가.

**scope 추정**: ~30-50 lines (state schema + handler + test)

### 3.3 미완 항목 3 — raw.yml writer 의 writeIntentInferenceToRawYml consumption

**Spec source**: PR #236 coordinator.ts CONTRACT + Step 4 §4.3 raw.yml omit semantic + configuration.md §4.11 (b) omit semantic.

**결정 영역**: writer 위치 + omit 구현
- **Writer 위치**: `src/core-runtime/reconstruct/raw-yml-writer.ts` 신설 (또는 기존 raw-meta-extended-schema.ts 확장) — coordinator result 받아 raw.yml 직렬화
- **Omit 구현**: `result.writeIntentInferenceToRawYml === false` 일 때 `elements[].intent_inference` block 을 yaml stringify 시 omit (또는 element 자체에서 제거)

**Trade-off**:
- (a) 항상 wip schema 로 직렬화 후 *post-process* 로 omit — single source 의 schema, post 추출 단순
- (b) 직렬화 단계에서 분기 — 두 schema (v1 / v0) 의 분리

**권고**: **(a) post-process omit** — wip schema 가 단일 source (writeIntentInferenceToRawYml flag 와 무관). omit 은 yaml stringify 직후 단순 deletion.

**scope 추정**: ~100-150 lines (writer + test)

### 3.4 미완 항목 4 — config_malformed caller halt UX

**Spec source**: PR #236 coordinator.ts `kind: "config_malformed"` + configuration.md §4.11 (d) "다음 commit scope" 4번 항목.

**결정 영역**: caller 의 user-facing UX
- **Option (a) explicit halt + actionable message**: "Malformed config: {detail}. Edit `.onto/config.yml` to fix root structure (must be an object), then retry."
- **Option (b) interactive recovery**: prompt 가 사용자에게 "Reset config? (y/n)" — 자동 fix offer
- **Option (c) (a) + dry-run**: explicit halt + `--ignore-config` flag 로 v1 default 강제 적용 (debug용)

**권고**: **Option (a)** — onto 의 fail-explicit principle 일관. interactive recovery 는 over-engineering. `.onto/config.yml` 직접 수정이 명확한 path.

**scope 추정**: ~20-30 lines (halt handler + error message + test)

### 3.5 UF-EVOLUTION-1 — v0 phase3 input pruning caller 책임

**Source**: PR #236 review session 20260427-0fcb42d1 의 evolution lens UF.

**현재 상태**: v1_inference=false 시 coordinator 가 inference_mode="none" → Hook α self-skip → currentInferences empty → caller 가 phase3Responses 의 rationale_decisions 도 empty 로 prune 해서 줘야 함 (test fixture 가 그렇게 처리).

**결정 영역**:
- **(a) coordinator 자동 ignore**: v1_inference=false 시 coordinator 가 phase3Responses 의 모든 decision 을 자동 skip + result 에 `phase3_pruned: true` flag
- **(b) doc 명시 + caller 책임 그대로**: caller (handleReconstructCli) 가 v1/v0 분기에 따라 phase3Responses 자체를 build 안 함 (v0 mode 에는 phase 3 user response 자체가 없음)

**권고**: **(b)** — v0 fallback 에서는 user response 자체가 없으므로 caller 가 phase3Responses 를 build 하지 않는 것이 자연. coordinator 의 input shape 는 그대로 유지. 단 doc 에 caller 책임 명시.

**scope 추정**: caller wire commit 안에서 자연 처리 (별도 scope 0)

### 3.6 UF-COVERAGE-2 — failed_alpha / failed_gamma / failed_phase35 variant test

**Source**: PR #236 review session 20260427-0fcb42d1 의 coverage lens UF.

**현재 상태**: CoordinatorResult discriminated union 에 3 failure variant 정의되어 있지만 test 부재.

**결정 영역**: 추가 cycle 위치
- **(a) coordinator.test.ts 에 Cycle 8/9/10 추가** (각 variant 별 cycle)
- **(b) handleReconstructCli 단위 test 에 함께 (caller 가 result variant 별 분기 처리)**
- **(c) (a) + (b) 동시**

**권고**: **(c)** — coordinator.test.ts 의 variant test 가 *spec contract*, handleReconstructCli test 가 *caller 의 variant 별 UX 분기* 검증. 두 layer 모두 cover.

**scope 추정**: coordinator.test.ts 신규 3 cycle (~80-100 lines) + handleReconstructCli test 의 variant branch (~50 lines)

## 4. PR 분리 결정

**option (i) — single PR (caller wire 4 항목 + UF P3 2건 모두)**:
- 장점: 머지 후 reconstruct v1 production 진입 동시 — partial state 회피
- 단점: scope 큼 (~800-1100 lines), review 시간 길음

**option (ii) — 2 PR 분리**:
- PR-1: handleReconstructCli explore step + spawn-proposer/reviewer + onConfigAbsent + UF-COVERAGE-2 (caller core)
- PR-2: raw.yml writer + config_malformed UX + UF-EVOLUTION-1 doc (output / UX layer)
- 장점: 각 PR 의 review 순환 빠름
- 단점: PR-1 머지 후에도 reconstruct 가 raw.yml save 안 됨 — partial production state

**option (iii) — 3 PR (마이크로 atomic)**:
- PR-1: handleReconstructCli explore + spawn modules
- PR-2: onConfigAbsent log sink + UF-COVERAGE-2
- PR-3: raw.yml writer + config_malformed UX
- 장점: 가장 작은 scope, atomic
- 단점: 3 PR 의 review iteration overhead

**권고**: **option (i) — single PR** 이 자연. caller wire 의 4 항목 + UF P3 2건이 *동일 production wire* 의 부분 — 머지가 *reconstruct v1 production 진입* 의 single event. partial state 회피가 SDK-like invariant 의 정합성 유지.

다만 atomic commit 단위로는 분리:
- commit 1: handleReconstructCli explore step + spawn-proposer/reviewer modules (~400 lines)
- commit 2: onConfigAbsent log sink + reconstruct-state.json schema 확장 (~50 lines)
- commit 3: raw.yml writer + post-process omit (~120 lines)
- commit 4: config_malformed UX handler (~30 lines)
- commit 5: UF-COVERAGE-2 test (~150 lines)
- commit 6 (선택): UF-EVOLUTION-1 doc 명시

총 ~6 atomic commit, single PR.

## 5. 위험 + 주의사항

### 5.1 spawn-proposer/reviewer module 의 review pattern 차용 wide

review 의 codex-review-unit-executor.ts + inline-http-review-unit-executor.ts + mock-review-unit-executor.ts pattern 을 그대로 차용 시:
- prompt construction (PR #232 의 ProposerInputPackage / ReviewerInputPackage 직렬화)
- LLM call (codex subprocess / HTTP / mock)
- result parsing (ProposerDirective / ReviewerDirective deserialization + validation)
- failure 처리 (timeout / network / parse fail)

각 단계가 review 와 parallel 하므로 *공통 base module 추출* 검토 (e.g., `src/core-runtime/llm-spawn/` 신설). 다만 본 PR scope 는 reconstruct-only 차용 — 공통화는 follow-up.

### 5.2 e2e test 의 mock spawn 패턴

PR #236 의 `e2e-smoke.test.ts` 가 mock dispatcher (Cycle 1~9) — coordinator 직접 호출. 본 PR 의 handleReconstructCli test 는 *cli entry 호출 → mock spawn 통과* — review 의 e2e-review-invoke.test.sh pattern 차용. 또는 coordinator 의 deps inject 활용 (mock spawn 함수 직접 inject).

### 5.3 reconstruct.md (.onto/commands) 의 generated 파일

`.onto/commands/reconstruct.md` 가 cli/command-catalog 에서 generated. caller wire 후 explore step 의 description (placeholder → 실제 동작) 갱신 필요 — `command-catalog.ts` 또는 template 수정 후 `npm run generate:catalog`.

### 5.4 review pattern 의 공통 helper 추출 (out of scope)

review 의 host runtime 결정 (`resolveExecutionPlan` + `resolveExecutionTopology`) 가 reconstruct 에도 적용 가능. 다만 본 PR 은 codex-only path 부터 wire (가장 단순), 다른 host 는 follow-up.

## 6. 참조

- **PR #236** (coordinator spec entry, 머지 정본): https://github.com/kangminlee-maker/onto/pull/236 (`bdc8a1a`)
- **PR #236 review session**: `20260427-0fcb42d1` (codex/gpt-5.4/high × 9 lens)
- **post-PR232 backlog memory**: `/Users/kangmin/.claude-2/projects/-Users-kangmin-cowork-onto-4/memory/project_post_pr232_backlog.md` — A1 PARTIAL / A2 PARTIAL / A3 DONE
- **UF backlog memory**: `/Users/kangmin/.claude-2/projects/-Users-kangmin-cowork-onto-4/memory/project_pr236_uf_backlog.md` — P3 (UF-EVOLUTION-1 + UF-COVERAGE-2) 통합 권고
- **Coordinator source**: `src/core-runtime/reconstruct/coordinator.ts` (entry function `runReconstructCoordinator`)
- **handleReconstructCli source**: `src/core-runtime/evolve/commands/reconstruct.ts` (caller wire target)
- **review-invoke.ts reference pattern**: `src/core-runtime/cli/review-invoke.ts` + `codex-review-unit-executor.ts` + `inline-http-review-unit-executor.ts` + `mock-review-unit-executor.ts`
- **A1+A3 handoff doc** (parent context): `development-records/plan/20260427-a1-a3-handoff.md` (SUPERSEDED)
- **4 mirror seat post-PR236 wording**: `.onto/config.yml` + `dogfood-switches.ts` header + `configuration.md §4.11 (d)` + `INTEGRATION.md "Production wiring"`

## 7. 다음 세션 예상 시간

- §3.1 caller wire (handleReconstructCli + spawn modules): ~90~120분
- §3.2 onConfigAbsent log sink: ~20~30분
- §3.3 raw.yml writer: ~40~60분
- §3.4 config_malformed UX: ~10~20분
- §3.5 UF-EVOLUTION-1 doc: ~10분
- §3.6 UF-COVERAGE-2 test: ~30~40분
- 검증 + commit + PR open: ~20분
- 9-lens codex review (선택): ~30~40분
- review fix-up (consensus 가정): ~30~50분
- **총 ~280~390분 (4~6.5 시간)**

본 세션은 large scope — 두 세션으로 분할 권고:
- **Session 1**: §3.1 + §3.6 (caller wire core + variant test)
- **Session 2**: §3.2 + §3.3 + §3.4 + §3.5 (sink / writer / UX / doc)

## 8. Lifecycle

- **Active**: 다음 세션 entry 시 본 doc 첫 read. caller wire 결정 + 머지까지
- **Superseded**: caller wire PR 머지 시 status `active` → `superseded-by-pr-NNN`. 본 doc 는 development-records/plan/ 에 archive 유지
- **Memory pointer**: `project_caller_wire_handoff.md` (신설 권고) 가 본 doc 의 pointer
