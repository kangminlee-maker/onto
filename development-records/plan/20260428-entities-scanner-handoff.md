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
# main HEAD 확인 (PR #241 머지 후, 461ded3 또는 그 이상)
git log --oneline -5
# 기대: 461ded3 (caller wire handoff lifecycle update) 또는 그 이상
#       946733d (PR #241 caller wire 머지) 그 다음

# caller wire 결과 확인 (handleReconstructCli explore step 의 stub fixture)
grep -n "STUB-001\|stub-domain\|Stub entity" src/core-runtime/evolve/commands/reconstruct.ts
# 기대: buildExploreCoordinatorOptions 안에 1 placeholder entity stub

# spawn modules 존재 확인
ls src/core-runtime/reconstruct/spawn-*.ts
# 기대: spawn-common.ts + spawn-proposer.ts + spawn-reviewer.ts (3 files)

# raw-yml-writer 존재 확인
ls src/core-runtime/reconstruct/raw-yml-writer*.ts
# 기대: raw-yml-writer.ts + raw-yml-writer.test.ts

# inline-http variant 의 future scope 위치 확인 (§2.5 통합 대상)
grep -nE "inline.?http|InlineHttp|inline_http" src/core-runtime/reconstruct/spawn-*.ts \
   src/core-runtime/evolve/commands/reconstruct.ts | head -10
# 기대: 4 mirror seat (spawn-common header / spawn-proposer header /
#       spawn-reviewer header / coordinator-options doc) 의 "future scope" 명시

# inline-http executor reference (§2.5 transport pattern)
ls src/core-runtime/cli/inline-http-review-unit-executor.ts
wc -l src/core-runtime/cli/inline-http-review-unit-executor.ts
# 기대: ~878 lines (anthropic/openai/litellm provider 분기 포함)

# main 동기 + 새 branch
git checkout main && git pull --ff-only origin main
git checkout -b track-b/entities-scanner
```

## 2. Spec 입력 — Stage 1 entities scanner 의 정확한 scope

### 2.1 spec source

`.onto/processes/reconstruct.md` (1636 줄) 의 §"Phase 1: Integral Exploration Loop":
- §1.1 Stage 1, Round 0: Initial Structure Exploration (line 589)
- §1.2 Round N: Iterative Loop (line 619)
- §"Explorer Profiles by Source Type" (line 146) — codebase / spreadsheet / database / document profile 별 분기

**Stage 1 fact space** (reconstruct.md spec 전체):
- `entity` — 본 PR scope (codebase 의 type / class / module 단위)
- `enum` / `property` / `relation` / `code_mapping` — **본 PR 밖 (follow-up commit)**

본 PR 의 narrowing: *Stage 1 fact space 의 entity 만*. 나머지 4 fact_type 은 Round N iterative loop 와 함께 후속 commit 진입 (§3 참조).

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
const entities = await runStage1RoundZero({
  source: session.source,
  intent: session.intent,
  // ... explorer config from .onto/config.yml
});
```

### 2.3 결정 영역 — scanner architecture

#### Option α — single-shot Round 0 only

- Explorer agent 가 1회 LLM call 로 source 분석 → entity_list 산출 (Phase 1 §1.1 Round 0 만)
- 본 PR scope. 단순 + 빠름.
- iterative loop (Round N) 는 follow-up commit

#### Option β — iterative loop (Round 0 → Round N)

- Round 0 → Round N (convergence detection) 의 multi-round LLM call
- spec 정확 (reconstruct.md §1.1 + §1.2)
- 큰 scope (~1500-2500 lines) — 별도 multi-week PR

**권고**: **Option α** — 본 PR boundary 가 "Round 0 single-shot scanner 가 real entities 를 produce" 까지. iterative loop + convergence detection + module_inventory 관리는 follow-up commit.

> **Note** (PR #241 review C-2 conciseness fix): 이전 handoff revision 에 Option α / γ 가 별도 옵션으로 표기되었으나, *본 PR 의 stated boundary 아래 두 옵션은 same path* (Round 0 single-shot only) — Option γ ("hybrid") 는 spurious distinction. 단일 옵션 (Option α) 로 collapse.

### 2.4 본 PR scope (Option α — Round 0 single-shot)

#### 신설 module — single Round 0 entry naming

- `src/core-runtime/reconstruct/explorer/stage1-scanner.ts` (~300-500 lines)
  - **`runStage1RoundZero(input, deps)`** (canonical entry name — 본 PR 안에서 다른 이름 절대 사용 금지)
  - `parseExplorerDirective(yaml)` — YAML output → typed entity_list
  - `validateStage1Output(entities, ...)` — id uniqueness + type enum + certainty enum 검증
- `src/core-runtime/reconstruct/explorer/spawn-explorer.ts` (~250-400 lines, codex+mock+inline-http)
  - `makeCodexExplorer(config)` — codex subprocess factory (review/spawn-proposer pattern)
  - `makeMockExplorer(entities)` — pre-canned entity_list (test / fixture)
  - **`makeInlineHttpExplorer(config)`** — non-codex host transport (anthropic / openai / litellm), §2.5 inline-http 통합 참조
  - prompt builder (Phase 1 §1.1 Round 0 protocol contract reference; entity fact_type만 명시)

#### Inline-http variant 통합 (§2.5)

PR #241 의 spawn-proposer/reviewer 가 codex + mock 만 — `makeInlineHttpProposer` / `makeInlineHttpReviewer` 가 4 파일 header 에 *future scope* 로만 명시. 본 Session 2 에서 *통합 처리* (3 spawn module 모두 inline-http 동시 wire).

#### Source-profile seam (PR #241 review C-2 evolution fix)

본 PR 의 entry 가 *codebase profile only* 임을 architecture-level 로 보장:

```typescript
// stage1-scanner.ts header
export type SourceProfileKind = "codebase";  // | "spreadsheet" | "database" | "document" — follow-up

export interface Stage1RoundZeroInput {
  profile: SourceProfileKind;  // 본 PR 은 "codebase" 만 accept
  source: string;
  intent: string;
}
```

향후 다른 profile 진입 시 `Stage1RoundZeroInput.profile` 의 union 확장 + profile 별 prompt builder 분기 → 본 entry 의 caller (handleReconstructCli) 변경 0. 즉 *seam 이 type-level 에 미리 자리잡음*.

#### handleReconstructCli wire 갱신

- `buildExploreCoordinatorOptions` 안에서 stub entity 대체:
  ```typescript
  const entities = await runStage1RoundZero({
    profile: "codebase",
    source: session.source,
    intent: session.intent,
  }, { spawnExplorer });
  ```
- explorer config 는 `.onto/config.yml` 에서 read (기존 codex config 활용 가능)

#### test

- `stage1-scanner.test.ts` (~200 lines): Round 0 entry / Explorer directive parse / validator / fixture-based assertions / non-codebase profile 거부 (type-level guard)
- `spawn-explorer.test.ts` (~100 lines): mock factory + prompt builder snapshot

**Session 2 base scope (entities scanner + raw-yml integration): 총 ~800-1200 lines, 3-5 시간 추정**.

(§2.5 inline-http 통합 추가 시 +600-800 lines, +2-3 시간 — 총 1400-2000 lines, 5-8 시간)

#### Out-of-scope (follow-up commits, 명시 ledger)

다음 항목은 본 PR 머지 후 별도 commit / PR 진입:
1. **iterative loop (Round N)**: convergence detection + module_inventory 관리 + uncovered_modules 추적
2. **Stage 1 fact space 확장**: enum / property / relation / code_mapping fact_types
3. **Source-profile 확장**: spreadsheet / database / document profile 추가 (Stage1RoundZeroInput.profile union 확장 + 각 profile prompt builder)
4. **Stage 1 → Stage 2 transition**: Hook α invocation 이후 Stage 2 behavior exploration entry
5. **raw-yml-writer ↔ complete step 통합**: PR #241 review C-3 deferred 항목 — entities scanner PR 안에서 동시 처리 권고 (§4.3 참조)

각 항목은 *본 handoff doc 의 후속 handoff doc* 으로 분리. ownership 은 항목별 명시 follow-up — 본 doc 머지 시점에 single ledger로 추적.

> **Note** (post-PR241 머지 시점 갱신): 이전 handoff revision 에 *inline-http variant* 가 본 ledger 의 6번 항목으로 있었으나, 본 Session 2 에 통합 결정 (§2.5). PR #241 의 4 mirror seat (spawn-common.ts / spawn-proposer.ts / spawn-reviewer.ts header + reconstruct.ts coordinator-options) 의 "future scope" 명시는 본 PR 머지 시점에 *implemented* 로 일관 갱신.

### 2.5 Inline-http variant 통합 (post-PR241 머지 후 추가 결정)

**배경**: PR #241 의 spawn-proposer / spawn-reviewer 가 codex + mock 만 — `makeInlineHttpProposer/Reviewer` 가 4 파일 header 에 *future scope* 명시. host_runtime != "codex" (anthropic / openai / litellm / standalone) 일 때 reconstruct production 진입 불가. Session 2 가 entities scanner 와 함께 통합.

#### 결정 영역 — inline-http 구현 깊이

##### Option I — Full implementation

- spawn-common.ts 에 `runInlineHttpSpawn(config, prompt) → Promise<string>` 추출 (transport abstraction)
- 각 spawn module 에 `makeInlineHttpProposer/Reviewer/Explorer` 신설 — prompt builder + parser + validator 는 codex variant 와 *공유* (transport 만 교체), DRY
- handleReconstructCli `buildSpawnDeps` 에 host_runtime 분기 추가:
  - host_runtime=codex → buildCodexSpawnDeps (현재)
  - host_runtime∈{anthropic, openai, litellm, standalone} → buildInlineHttpSpawnDeps (신규)
  - --mock flag → buildMockSpawnDeps (현재)
- review 의 `cli/inline-http-review-unit-executor.ts` (~878 lines) 가 reference pattern. reconstruct 는 prompt/parser/validator 재사용 가능해 *transport layer 만* — ~300-500 lines for 3 spawn modules
- test ~200 lines

scope 추정: **~600-800 lines on top of Session 2 base, +2-3 시간**

##### Option II — Interface placeholder only

- 각 spawn module 의 `makeInlineHttp*` factory function signature 만 신설 — body 는 `throw new Error("inline-http transport not yet implemented")`
- type-level interface 완성 — future contributor 가 throw 부분만 채우면 production-ready
- handleReconstructCli 의 host_runtime 분기 도 *placeholder dispatch* — host_runtime != "codex" 시 명시적 halt 메시지
- 본 PR 머지 후 별도 small follow-up PR 이 *transport implementation* 만 채움

scope 추정: **~50-100 lines, +30분**

#### 권고: Option I (Full implementation)

이유:
- 사용자 요청 명시 — "다음 작업에 통합" = 진정한 implementation 의도
- review 의 inline-http executor (~878 lines) 가 *반복 사용 가능 pattern*. reconstruct 는 prompt/parser/validator 재사용 가능 → review 보다 작은 scope
- *transport abstraction* 추출 (spawn-common 의 runInlineHttpSpawn) 이 자연 — 향후 다른 transport (e.g., Anthropic Messages API direct) 추가 시 재사용
- production reach 확대 — Claude Code session (anthropic provider) / OpenAI subscription / local MLX (litellm) 모두 reconstruct production 진입 가능 (현재는 codex only)

Option II 는 *시간 부족 시* fallback — 본 PR 안에서 Option I 가 manageable 안 되면 placeholder 로 narrow.

#### 본 통합의 추가 신설/수정

- `spawn-common.ts` (~+300-400 lines): `runInlineHttpSpawn(config, prompt) → Promise<string>` + provider 분기 (anthropic / openai / litellm) + retry 처리 + sandbox enforcement
- `spawn-proposer.ts` (+~30-50 lines): `makeInlineHttpProposer(config)` — 기존 prompt builder + parser + validator 재사용, `runInlineHttpSpawn` 호출만 차이
- `spawn-reviewer.ts` (+~30-50 lines): 동일 pattern
- `explorer/spawn-explorer.ts` (Session 2 신설 시 함께 — `makeInlineHttpExplorer`)
- `evolve/commands/reconstruct.ts` `buildSpawnDeps` (+~50-80 lines): host_runtime 분기 + buildInlineHttpSpawnDeps 신설
- 4 mirror seat (spawn-common header / spawn-proposer header / spawn-reviewer header / coordinator-options doc) 의 "future scope" 명시를 *implemented* 로 갱신 — *intentional disclosure update*
- test (~150-200 lines): inline-http variant 의 mock LLM (HTTP fixture) + provider 별 분기 검증

#### 위험 + 주의사항

- HTTP transport 의 retry / timeout / rate limit 처리 — review pattern 차용
- subagent_llm.tool_mode (`native` / `inline` / `auto`) 처리 — reconstruct 는 단일 turn directive output 이므로 `inline` mode 만 충분 가능 (review 의 boundary policy 와 다름)
- provider 별 max_tokens / model_id / API key resolution — review 의 config-chain 활용 가능
- *production observation* — 첫 inline-http 호출의 prompt response quality 가 codex variant 와 다를 수 있음 (provider 별 calibration)

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

- **PR #241** (caller wire commit, squash merged `946733d`): https://github.com/kangminlee-maker/onto/pull/241
- **PR #236** (coordinator spec entry, parent context): https://github.com/kangminlee-maker/onto/pull/236 (`bdc8a1a`)
- **caller wire handoff doc** (parent, SUPERSEDED): `development-records/plan/20260427-caller-wire-handoff.md`
- **reconstruct.md spec**: `.onto/processes/reconstruct.md` (Phase 1 §1.1 + §1.2 + Explorer Profiles by Source Type)
- **Stub fixture 위치**: `src/core-runtime/evolve/commands/reconstruct.ts` `buildExploreCoordinatorOptions` 안 (commit `946733d`)
- **codex spawn pattern reference**: `src/core-runtime/reconstruct/spawn-proposer.ts` (PR #241), `src/core-runtime/cli/codex-review-unit-executor.ts`
- **inline-http executor reference (§2.5)**: `src/core-runtime/cli/inline-http-review-unit-executor.ts` (~878 lines, anthropic/openai/litellm provider 분기)
- **PR #241 round 2 deferred backlog**: `project_pr241_round2_backlog.md` (분류 A 의 4 항목 — stub stage 1 surface / raw-yml runtime edge / handoff contradiction / handoff naming — 이 본 PR 머지 시 자연 해소)

## 6. 다음 세션 예상 시간

### Session 2 base (entities scanner + raw-yml integration, 권고 minimum)

- §2.4 stage1-scanner + spawn-explorer (codex+mock) + test: ~3-4 시간
- §4.3 raw-yml-writer 통합 (complete step wire): ~1-2 시간
- 검증 + commit + PR open: ~30분
- **base 총 ~4.5-6.5 시간**

### Session 2 with §2.5 inline-http 통합 (Option I full)

- 위 base + §2.5 inline-http variant (3 spawn module + handleReconstructCli 분기 + test): ~+2-3 시간
- 4 mirror seat "future scope" → "implemented" 갱신: ~15분
- **확장 총 ~7-10 시간**

### Review iteration (선택)

- 9-lens codex review: ~30-40분
- review fix-up (round 1 consensus 가정): ~30-50분
- (round 2 차단 권고 — PR #232 / PR #241 divergence pattern 회피)

### 권고 분할

- **Single session attempt** (Option I 의 *transport abstraction* 가 review pattern 으로 작아 manageable): 7-10 시간을 single session 으로 시도
- **2 session 분할** (시간 부족 시): Session 2a (entities scanner + raw-yml, ~5 시간) → Session 2b (inline-http variant, ~3 시간 + 그 시점 fresh review)
- **Option II fallback**: 본 PR 안에서 Option I 가 시간 초과 시 inline-http 를 placeholder 로 narrow + 별도 small follow-up PR — 사용자 결정

## 7. Lifecycle

- **Active**: 다음 세션 entry 시 본 doc 첫 read. entities scanner PR 머지까지
- **Superseded**: entities scanner PR 머지 시 status `active` → `superseded-by-pr-NNN`
- **Memory pointer**: `project_entities_scanner_handoff.md` (신설 권고)
