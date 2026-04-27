# Entities scanner — Handoff (post-PR241, Session 2 entry)

**작성**: 2026-04-28 (PR #241 caller wire commit 직후, Option B series Session 2 entry)
**전제 진행 상태**: PR #241 (`track-b/caller-wire-commit`) — handleReconstructCli 가 coordinator 호출 + spawn modules + raw-yml-writer 신설. **Stub fixture (1 placeholder entity per cycle) 가 본 PR 의 advertised limitation**. real Stage 1 entities scanner = 본 handoff 의 scope.
**다음 세션 first command**:
```
development-records/plan/20260428-entities-scanner-handoff.md 읽고 entities scanner 진행
```

## 0. 본 handoff 의 목적

`/clear` 후 다음 세션이 *본 doc 만 read 해도* entities scanner 신설 진행 가능하도록 spec 입력 / decision 영역 / sequencing / risk 정리. handoff doc 패턴 — 결정은 다음 세션, 본 doc 는 *결정 가능한 표면* 만.

## 1. 사전 점검 (다음 세션 시작 시)

```bash
# main HEAD 확인 (PR #241 머지 가정)
git log --oneline -3
# 기대: PR #241 머지 commit 이 HEAD 또는 그 가까이

# caller wire 결과 확인 (handleReconstructCli explore step 의 stub fixture)
grep -n "STUB-001\|stub-domain\|Stub entity" src/core-runtime/evolve/commands/reconstruct.ts
# 기대: buildExploreCoordinatorOptions 안에 1 placeholder entity stub

# spawn modules 존재 확인
ls src/core-runtime/reconstruct/spawn-*.ts
# 기대: spawn-common.ts + spawn-proposer.ts + spawn-reviewer.ts

# raw-yml-writer 존재 확인
ls src/core-runtime/reconstruct/raw-yml-writer*.ts
# 기대: raw-yml-writer.ts + raw-yml-writer.test.ts

# main 동기 + 새 branch
git checkout main && git pull --ff-only origin main
git checkout -b track-b/entities-scanner
```

## 2. Spec 입력 — Stage 1 entities scanner 의 정확한 scope

### 2.1 spec source

`.onto/processes/reconstruct.md` (1636 줄) 의 §"Phase 1: Integral Exploration Loop":
- §1.1 Stage 1, Round 0: Initial Structure Exploration (line 589)
- §1.2 Round N: Iterative Loop (line 619)
- 각 round 가 Explorer agent 의 LLM call — entity / enum / property / relation / code_mapping facts 발견
- patch format (lens 가 entity certainty reclassification 요청)
- convergence detection
- module_inventory 관리 (Phase 0.5 / Round 0)

### 2.2 본 commit 이 채워야 할 capability

PR #241 의 stub fixture (`STUB-001` placeholder) 를 *real Stage 1 결과* 로 swap-in. 즉 `executeReconstructExplore` 의 explore step 이 *real entities array* 를 build 할 수 있어야:

```typescript
// PR #241 의 buildExploreCoordinatorOptions 안 (현재 stub)
const stubEntity: HookAlphaEntityInput = {
  id: "STUB-001",
  type: "entity",
  name: "Placeholder",
  ...
};

// 본 commit 후 (real scanner)
const entities = await runStage1Scanner({
  source: session.source,
  intent: session.intent,
  // ... explorer config from .onto/config.yml
});
```

### 2.3 결정 영역 — scanner architecture

#### Option α — single-shot LLM scanner

- Explorer agent 가 1회 LLM call 로 source 분석 → entity_list 산출
- 단순 + 빠름
- 본 PR scope 적합 (Phase 1 의 Round N iterative loop 미구현)

#### Option β — iterative loop (spec 정확)

- Round 0 → Round N (convergence detection) 의 multi-round LLM call
- spec 정확 (reconstruct.md §1.1 + §1.2)
- 큰 scope (~1500-2500 lines) — multi-week PR

#### Option γ — hybrid

- Round 0 만 구현 (initial structure exploration), iterative loop 는 follow-up
- 본 commit 이 *Round 0 single-shot* — 후속 commit 이 iterative loop wire
- Option α 의 단순성 + Option β 의 spec 정확 진화 path

**권고**: **Option γ** — Round 0 만 본 commit. iterative loop + convergence detection 은 다음 commit (별도 PR). 본 commit 의 boundary = "Stage 1 Round 0 single-shot scanner 가 real entities 를 produce".

### 2.4 본 PR scope (권고: Option γ Round 0)

#### 신설 module

- `src/core-runtime/reconstruct/explorer/stage1-scanner.ts` (~300-500 lines)
  - `runStage1RoundZero(input, deps)` — Explorer LLM call + entity_list parse
  - `parseExplorerDirective(yaml)` — YAML output → typed entity_list
  - `validateStage1Output(entities, ...)` — id uniqueness + type enum + certainty enum 검증
- `src/core-runtime/reconstruct/explorer/spawn-explorer.ts` (~200-300 lines)
  - `makeCodexExplorer(config)` — codex subprocess factory (review/spawn-proposer pattern)
  - `makeMockExplorer(entities)` — pre-canned entity_list (test / fixture)
  - prompt builder (Phase 1 §1.1 protocol contract reference)

#### handleReconstructCli wire 갱신

- `buildExploreCoordinatorOptions` 안에서 stub entity 대체:
  ```typescript
  const entities = await runStage1RoundZero({
    source: session.source,
    intent: session.intent,
  }, { spawnExplorer });
  ```
- explorer config 는 `.onto/config.yml` 에서 read (기존 codex config 활용 가능)

#### test

- `stage1-scanner.test.ts` (~200 lines): Round 0 entry / Explorer directive parse / validator / fixture-based assertions
- `spawn-explorer.test.ts` (~100 lines): mock factory + prompt builder snapshot

**총 ~800-1200 lines, 3-5 시간 추정**.

## 3. iterative loop (Round N) 의 follow-up scope

본 commit 후 남은 작업:
- Round N convergence detection (Phase 1 §1.2)
- module_inventory 관리 + uncovered_modules 추적
- Stage 1 → Stage 2 transition (Hook α invocation)
- Stage 2 behavior exploration (entity → behavior facts)
- Phase 0.5 Context Gathering / Phase 0 Schema Negotiation

각 항목이 substantive — 별도 commit / PR 시리즈. 본 handoff 의 scope 는 *Round 0 만*.

## 4. 위험 + 주의사항

### 4.1 reconstruct.md 의 spec 규모

1636 줄 spec 의 *전체* 구현은 multi-week. 본 commit 은 *Round 0 minimum viable* — Phase 0/0.5/Stage 2 는 별도. handoff doc 마지막 §3 list 가 follow-up tracking.

### 4.2 Explorer agent prompt quality

본 PR 의 prompt 는 *first iteration* — production observation 후 fine-tune 필요. 초기 LLM 호출 시 entity 추출 quality 가 낮을 수 있음 (특히 codebase 의 type 추출이 모호한 case). 본 PR 머지 후 *prompt calibration* 이 별도 작업.

### 4.3 raw-yml-writer 통합 (PR #241 미완 → 본 PR 에서 통합 권고)

PR #241 이 raw-yml-writer 를 *standalone module* 로 신설 — handleReconstructCli explore wire 와의 integration 미완. 본 entities scanner PR 에서 동시 통합 권장:
- explore step 매 cycle 종료 시 raw.yml write (또는 complete step 1회 — 결정 영역)
- 권고: complete step 1회 (cycle 마다 write 는 I/O overhead + intermediate state)

### 4.4 Stage 1 Round 0 의 입력 boundary

- source 가 codebase (typescript / python) 일 때만 본 PR 적용
- spreadsheet / database / document source 는 별도 explorer profile (reconstruct.md §"Explorer Profiles by Source Type")
- 본 PR scope = codebase only

## 5. 참조

- **PR #241** (caller wire commit): https://github.com/kangminlee-maker/onto/pull/241
- **PR #236** (coordinator spec entry, parent context): https://github.com/kangminlee-maker/onto/pull/236 (`bdc8a1a`)
- **caller wire handoff doc** (parent): `development-records/plan/20260427-caller-wire-handoff.md`
- **reconstruct.md spec**: `.onto/processes/reconstruct.md` (Phase 1 §1.1 + §1.2 + Explorer Profiles by Source Type)
- **Stub fixture 위치**: `src/core-runtime/evolve/commands/reconstruct.ts` `buildExploreCoordinatorOptions` 안
- **review pattern reference**: `src/core-runtime/cli/codex-review-unit-executor.ts`

## 6. 다음 세션 예상 시간

- §2.4 stage1-scanner + spawn-explorer + test: ~3-4 시간
- §4.3 raw-yml-writer 통합 (complete step wire): ~1-2 시간
- 검증 + commit + PR open: ~30분
- 9-lens codex review (선택): ~30-40분
- review fix-up: ~30-50분
- **총 ~5-7 시간 (1 session 가능 또는 2 session 분할)**

## 7. Lifecycle

- **Active**: 다음 세션 entry 시 본 doc 첫 read. entities scanner PR 머지까지
- **Superseded**: entities scanner PR 머지 시 status `active` → `superseded-by-pr-NNN`
- **Memory pointer**: `project_entities_scanner_handoff.md` (신설 권고)
