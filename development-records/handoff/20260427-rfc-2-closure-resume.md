# RFC-2 Closure → §8 Future Scope (Option A) — Session Resume Handoff

> **For**: next session (post `/clear`) resuming after RFC-2 sub-PR ladder full closure
> **Created**: 2026-04-27
> **Goal**: Option A (RFC-2 §8 deferred 항목) 진입 — 첫 항목 결정 + 작업 시작
> **Predecessors**:
> - `development-records/handoff/20260427-p2-rfc-1-closure-resume.md` — 직전 세션 handoff (RFC-1 closure 후 RFC-2 entry)
> - `development-records/evolve/20260427-declared-but-unimplemented-closure.md` — RFC-2 design v8 (canonical reference)

---

## 1. 현재 상태 (merged on `main`)

```
4487353 feat(catalog): R2-PR-4 — contract_ref shared validator + 7-path workflow trigger (#239)
1c5fb7e feat(catalog): R2-PR-3 — PublicEntry schema split (PublicCliEntry vs PublicSlashOnlyEntry) (#238)
7d9d08a feat(catalog): R2-PR-2 — deprecation lifecycle policy + historical_no_executor field (#237)
503bfb1 feat(catalog): R2-PR-1 — repair_path 제거 + wording cleanup + search gate (#235)
61499da docs(p2-rfc-2): Declared-but-Unimplemented Closure design (v8) (#234)
```

**Local main = origin/main = `4487353`**.

**Working tree 잔여**:
- `.onto/.layout-version.yaml` — onto runtime artifact (untracked)
- `dist/*` — built artifacts (prepare hook, untracked/modified)
- `.onto/config.yml` — user WIP (gpt-5.5 model_id 변경, untracked modification — RFC-2 scope 외)

---

## 2. RFC-2 closure 종합

### 2.1 sub-PR ladder 완전 마감

| sub-PR | scope | type | merge | LOC |
|---|---|---|---|---|
| **#234** docs | RFC-2 design (v8 idempotent, 7 review iterations) | docs | docs | 867 lines |
| **#235** R2-PR-1 | `repair_path` 제거 + wording cleanup + search gate | A | feat | -82 net |
| **#237** R2-PR-2 | deprecation lifecycle policy + `historical_no_executor` field (R2-2 + R2-3 통합) | adjacent + B | feat | +680 |
| **#238** R2-PR-3 | PublicEntry schema split (`PublicCliEntry` vs `PublicSlashOnlyEntry`) | A | feat | +162 net |
| **#239** R2-PR-4 | `contract_ref` shared validator + 7-path workflow trigger | C | feat | +196 |

### 2.2 closure 범위 — RFC-2 의 5 항목

| # | declared model | runtime now | closure type |
|---|---|---|---|
| R2-1 | `PublicEntry.repair_path?: boolean` | 제거 — preboot subset marking 의 single use 가 자기참조적 (`assertRepairPathPreboot`). future recovery routing 도입 시 explicit marker 재도입 (§8) | A type schema 제거 |
| R2-2 | cli.ts:774-780 `learn`/`ask`/`build` placeholder | 제거 — `build` 는 `historical_no_executor: true` 로 catalog declared, dispatcher lifecycle policy 가 intercept | adjacent legacy cleanup |
| R2-3 | `Common.removed_in?: string` | build-time cutover throw + runtime deprecation notice. fail-closed prerelease semver. all-kind enforcement (PublicEntry/RuntimeScriptEntry/MetaEntry) | B type — runtime + build-time |
| R2-4 | slash-only PublicEntry `phase` decorative | schema split — PublicCliEntry (phase 필수) vs PublicSlashOnlyEntry (phase 부재). canonical validator (`assertPublicCliEntryHasCliRealization`) + type-level discriminator | A type schema 분기 |
| R2-5 | `contract_ref` 파일 존재 검증 부재 | shared validator (`assertContractRefsExist`) + standalone CI script + 7-path workflow trigger + package-scripts deriver whitelist | C type validation |

### 2.3 schema_version trail (dispatcher target)

- P2-C baseline: `4` (RFC-1 마감 시점)
- R2-PR-1: `4 → 5` (repair_path 제거)
- R2-PR-2: `5 → 6` (lifecycle policy interception 주입)
- R2-PR-3: `6 → 7` (schema split)
- R2-PR-4: 변경 없음 (catalog 미변경)

### 2.4 핵심 architectural 산출물

**Lifecycle policy** (R2-PR-2):
- `getEntryLifecycleState(entry, version, executorAvailability)` — 4 state
- `getCliExecutorAvailability(entry)` — `present | intentionally_absent`
- `getLifecycleAction(entry, version)` — dispatcher 분기용
- `assertHistoricalNoExecutorBidirectional(catalog, cliCases)` — 4+1 conditions
- `extractCliMainNonPlaceholderCases(cliSource)` — cli.ts main switch parser
- `isSupportedSemver` + fail-closed throw — prerelease 거부

**Schema split** (R2-PR-3):
- `PublicCliEntry`: phase 필수, historical_no_executor + aliases 위치
- `PublicSlashOnlyEntry`: tuple `[Slash|PatternedSlash, ...]` (cli realization 부재 type-level 강제)
- `assertPublicCliEntryHasCliRealization` canonical validator

**Shared validator** (R2-PR-4):
- `assertContractRefsExist(catalog, fsAccessor)` — fsAccessor 로 testability
- `scripts/check-contract-refs.ts` — production fs 주입
- 7-path workflow trigger (catalog/validator/test/script/process/package/workflow)

### 2.5 bin/onto 동작 변화

| invocation | lifecycle state | 동작 |
|---|---|---|
| `bin/onto build` | deprecated_historical_no_executor | "deprecated since 0.2.0. Use 'reconstruct' instead." + exit 1 |
| `bin/onto reclassify-insights` | deprecated_with_executor | notice + executor 실행 |
| `bin/onto migrate-session-roots` | deprecated_with_executor (current 0.2.2 < removed_in 0.3.0) | notice + executor 실행 |
| `bin/onto learn` / `ask` | catalog 미등록 | "Unknown subcommand" + exit 1 |
| `bin/onto info` / `config` / `install` 등 | active | 정상 dispatch |

### 2.6 Test coverage

- `command-catalog.test.ts`: 78 tests (39 → 78, +39 across 4 PRs)
  - lifecycle helpers (4 state matrix, executor availability, lifecycle action)
  - all-kind removed_in build-time throw (RuntimeScriptEntry, MetaEntry)
  - fail-closed prerelease semver
  - bidirectional invariant 4+1 conditions
  - schema split (PublicCliEntry / PublicSlashOnlyEntry)
  - contract_ref shared validator (5 cases)
- `command-catalog-generator/`: 99 tests (변경 없음, narrowing 영향 only)

---

## 3. 다음 stage — Option A: §8 future scope 항목

### 3.1 7 후속 candidate (Task #11~#17)

| Task # | 항목 | trigger / 권고 시점 | scope 추정 |
|---|---|---|---|
| **#11** | Failure detection + recovery routing | config corrupt detection 실수요 도래 시 (현 시점 trigger 부재). 별 RFC. R2-PR-1 가 repair_path 제거했으므로 explicit marker 재도입 필요 | 큼 (~200 LOC + test) |
| **#12** | Slash-phase consumer 정의 | future preboot slash 또는 markdown grouping 실수요 시 | 작음 (~50-100 LOC) |
| **#13** | Non-CLI lifecycle enforcement (RuntimeScriptEntry / MetaEntry) | runtime deprecation notice for npm scripts 실수요 시. RuntimeScriptEntry 는 invocation 시점이 npm process — onto runtime 외부 | 중간 (~100 LOC) |
| **#14** | Prerelease/release-channel semver semantics | release management 정책 결정 (semver pre-release 채택, npm dist-tag, version stamping flow) — release axis | 중간-큼 (정책 결정이 더 큼) |
| **#15** | Process-ref validation 일반화 | template inline / generated doc cross-ref 등 broader process-ref. 현 시점 `contract_ref` 만 fallible — broader 는 별 surface | 큼 (~200 LOC, 다양한 reference 위치) |
| **#16** | Deprecated entry cli help 노출 정책 | `bin/onto --help` 출력에 deprecated entry 가 보일지 결정 (현재 [DEPRECATED] prefix 로 노출) | 작음 (~30-50 LOC) |
| **#17** | PublicCliEntry tuple type-level enforcement 보강 | catalog reordering 또는 별 type-level encoding | 중간 (~100 LOC, catalog reordering 영향 광범위) |

### 3.2 권고 첫 작업 — 두 candidate

#### Candidate A1: **#16 — Deprecated entry cli help 노출 정책** (가장 작음, immediate value)

- **Why**: 현재 ONTO_HELP_TEXT 가 `migrate-session-roots`, `reclassify-insights`, `build` 의 `[DEPRECATED ...]` prefix 출력 — user 가 처음 `--help` 볼 때 noise. R2-PR-2 가 lifecycle 처리한 후 user-facing 표면을 정리할 자연스러운 follow-on
- **Scope**:
  - 결정 옵션 (binary 또는 tri):
    - (a) deprecated entry 를 default `--help` 에서 hide. `--all` (또는 `--include-deprecated`) flag 도입 시 노출
    - (b) status quo (deprecated 노출, prefix 로 marking)
    - (c) deprecated 별 section 분리 (default 출력 후 "Deprecated subcommands (use --all to show)" 같은 footer)
  - cli-help-deriver.ts 변경 + ONTO_HELP_TEXT 출력 형태 결정 + cli.ts main 의 `--help` 분기 (`--all` 인지 검사)
- **LOC**: ~30-50
- **Risk**: 매우 낮음 (user-facing wording only)

#### Candidate A2: **#14 — Prerelease semver policy** (정책 결정 비중)

- **Why**: R2-PR-2 가 fail-closed throw 도입했으므로 release flow 가 prerelease 사용 시 build 차단. 정책 부재 시 향후 release 시점에 차단됨 — 사전 정책 결정 가치
- **Scope**:
  - 결정 영역 (이 자체가 별 RFC):
    - npm pre-release version 패턴 (예: `0.3.0-rc.1`) 채택 여부
    - `compareSemver` prerelease 지원 추가 (semver spec: `0.3.0-rc.1 < 0.3.0`)
    - npm dist-tag (`@beta`, `@rc`) 와 catalog version 정합 정책
    - release checklist 변경
  - implementation 비중 작음 (~50 LOC for compareSemver), 정책 결정 비중 큼
- **Risk**: 중간 — release flow 영향. 사전 검토 필요

### 3.3 권고 sequence

| sequence | 추천 시점 |
|---|---|
| **A**: #16 → #12 → #13 → #14 → #15 → #17 → #11 | 작은 항목부터 momentum. user-facing improvements 우선 |
| **B**: #14 → #16 → ... | release management 우선 (next version bump 0.3.0 전 정책 결정) |
| **C**: 한 항목씩 user 결정 | 각 항목이 별 RFC 또는 scope 결정 필요 — 한 번에 한 작업만 진입 |

내 권고: **Sequence A**. 이유:
- #16 가 가장 작은 scope + immediate user-facing value
- `--all` flag pattern 은 cli-help 의 first user-facing extension — 후속 axis (#12, #13) 의 reference pattern 이 됨
- #14 는 release 시점에 압박이 있을 때 별 axis 로 도입 (release 0.3.0 결정 시점에 자연스럽게 trigger)

---

## 4. 첫 작업 시작 명령 (Sequence A 가정 — #16 부터)

### 4.1 Setup

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -7

# 2. 빌드 잔여물 정리 (안전)
rm -f .onto/.layout-version.yaml
git checkout dist/ 2>/dev/null
git clean -fd dist/ 2>/dev/null

# 3. baseline test
npm run check:ts-core
npm run check:catalog-drift
npm run check:handler-exports
npm run check:contract-refs
npx vitest run src/core-runtime/cli/command-catalog.test.ts
```

### 4.2 #16 의 design + decision questions

```bash
# 현 cli-help-deriver 동작 확인 — deprecated 표현 위치
grep -n "deprecated\|DEPRECATED" scripts/command-catalog-generator/cli-help-deriver.ts

# 현 ONTO_HELP_TEXT 출력 확인
bin/onto --help

# user 결정 필요:
# - (a) hide by default, --all 도입
# - (b) status quo (prefix marking)
# - (c) section 분리 (footer note)
```

### 4.3 user 결정 후 typical flow

1. design doc (필요 시 — small scope) 또는 직접 implementation
2. cli-help-deriver.ts 변경 + cli.ts `--help` 분기 (옵션 a 시 `--all` flag 검사)
3. tests
4. baseline + smoke
5. commit + PR + merge

---

## 5. 다른 axis 옵션 (Option A 외)

next session 이 Option A 가 아닌 다른 axis 진입 결정 시:

- **Option B — track-b Phase 4 wave** — RFC-2 와 별 axis. `git log --oneline -- 'src/core-runtime/reconstruct/'` 로 진행 확인 후 다음 wave entry
- **Option C — Phase 2 Translation 실착수** — `development-records/evolve/20260417-phase-2-translation-design-sketch.md` 의 sketch → design doc 으로 promote
- **Option D — RFC-1 §11 future seam** — `development-records/evolve/20260427-catalog-runtime-projection-closure.md` §11 의 6 항목 (예: ONTO_HELP_TEXT extraction)

---

## 6. 결정 시 점검 사항

다음 stage 진입 결정 전:

1. **release timing**: 0.3.0 bump 가 가까우면 #14 (prerelease semver) 우선
2. **user-facing UX**: --help 출력이 deprecated 로 어수선하면 #16 우선
3. **stakeholder pressure**: track-b 진행 압박이 있으면 별 axis (Option B)
4. **design 부담**: #11, #15 는 별 RFC 필요 — 시간 예산 고려

---

## 7. 참조 파일 우선순위

### RFC-2 의 closure 산출물

- **`development-records/evolve/20260427-declared-but-unimplemented-closure.md`** — RFC-2 design v8 authority (867 lines, design-idempotent reached)
- `src/core-runtime/cli/command-catalog.ts` — PublicCliEntry / PublicSlashOnlyEntry / historical_no_executor field
- `src/core-runtime/cli/command-catalog-helpers.ts` — lifecycle helpers + assertContractRefsExist + assertPublicCliEntryHasCliRealization + assertHistoricalNoExecutorBidirectional
- `src/core-runtime/cli/dispatcher.ts` — lifecycle policy interception
- `scripts/check-contract-refs.ts` — Layer 0 canonical gate (contract_ref)
- `.github/workflows/determinism-regression.yml` — 7-path workflow trigger

### RFC-2 §8 future scope 정의

`development-records/evolve/20260427-declared-but-unimplemented-closure.md` §8 — 8 항목 (handoff doc §3 에 7개 + RFC-1 §11 future seam 1).

### Handoff 이력

- `development-records/handoff/20260425-phase-1-4-resume.md` — P1-4 진입 (이미 머지됨)
- `development-records/handoff/20260427-p2-rfc-1-closure-resume.md` — RFC-2 진입 (이미 머지됨)
- `development-records/handoff/20260427-rfc-2-closure-resume.md` — 본 문서 (RFC-2 closure → §8 future scope)

---

## 8. 한눈 정리

RFC-2 sub-PR ladder 완전 마감 (5 항목 closure: A/B/C/adjacent type 모두). 다음:

- **Option A 첫 작업 (권고)**: **#16 — Deprecated entry cli help 노출 정책**. user 결정 필요 옵션 3 종 (a hide+flag / b status quo / c section split). LOC ~30-50, risk 낮음
- 또는: #14 (release 압박 시), 다른 #11~#17 항목, 또는 다른 axis (track-b / Phase 2 Translation / RFC-1 §11 future seam)

권고 sequence: **A** (#16 → #12 → #13 → #14 → #15 → #17 → #11).
