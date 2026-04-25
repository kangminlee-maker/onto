# Phase 1 P1-4 — Session Resume Handoff

> **For**: next session (post `/clear`) resuming Phase 1 implementation
> **Created**: 2026-04-25
> **Goal**: 바로 P1-4 (CI drift workflow + 5차 review 의 P1-4-classified followups) 작업 착수 가능하도록 self-contained context

---

## 1. 현재 상태 (merged on `main`)

```
fb8e35a feat(catalog): P1-3 — bin/onto integration + preboot-dispatch + catalog → runtime authority (#223)
1ee7af3 feat(catalog): P1-2c — dispatcher + cli.ts help + package.json scripts emitters (#220)
43d0cee feat(track-b): phase 2 batch — W-A-86 + W-A-87 role 파일 신설 (2 atomic commits) (#222)
48cdbc5 docs(track-b): phase 2 handoff — W-A-86 + W-A-87 role 파일 신설 준비 (#221)
0f239f9 feat(track-b): phase 1 batch — W-A-81~W-A-85 canonical seat migration (5 atomic commits) (#219)
```

**Working tree**: clean. Local main = origin/main = `fb8e35a`.

**P1-3 merged**: 2026-04-25. 8 commits squashed:
- `b14f60f` baseline regression fix (track-b PR #219 의 `domain-init.md` 가 allowlist 누락)
- `e7088b3` 본 commit — bin/onto + dispatcher + preboot-dispatch + catalog-meta extraction
- `6f8c287` 1차 review fix — Must 3 + Should 4/6 흡수 (skip-when-unchanged, derive-hash-guard 추출, PHASE_MAP trim)
- `eea3fbf` 2차 review fix — textual rename `assertCatalogHash` → `assertDispatcherDeriveHash` (5곳)
- `dcb5518` 3차 review fix — narrow scope ("CLI subcommand dispatch authority") + dynamic ONTO_HELP_TEXT import + preboot derive-hash guard parity
- `d46a9e8` 4차 review fix — slash boundary restriction + diagnostic wording
- `0e0e0b5` 5차 review fix — slash regression guard + catalog-hash header narrative

**P1-3 review sessions** (모두 `.onto/review/`):
- `20260425-81328cef` 1차
- `20260425-4e3bdecc` 2차
- `20260425-1d8a30bd` 3차 (last scoped review)
- `20260425-1c214994` 1차 general
- `20260425-7a66822a` 2차 general
- `20260425-db4ba824` 3차 general (final, merge-safe)

---

## 2. Phase 1 구현 roadmap — 어디까지 왔고 다음은 뭔가

| stage | 상태 | PR |
|---|---|---|
| P1-1a/1b types + 47 entries | ✅ merged | #205 / #206 |
| P1-2a/2b/2c emitter trio + bootstrap | ✅ merged | #207 / #212 / #220 |
| P1-3 bin/onto + preboot-dispatch + catalog → CLI dispatch authority | ✅ merged | #223 |
| **P1-4 CI drift workflow + 5차 review followups** | ▶ **다음** | — |
| (P2 architectural followups) | pending | (별도 RFC / 결정) |

**Authority transition (design §6.1)**:
- 현재 (P1-3 머지 후): catalog 가 **CLI subcommand dispatch authority**. bin/onto 가 catalog-derived dispatcher 통과. slash + npm run 경로는 catalog 를 data 로 소비하지만 dispatcher 통과 안 함.
- **P1-4 머지 직후**: full authority + CI drift regression 차단

---

## 3. P1-4 scope — 구체 산출물

**Goal**: catalog 변경이 derived artifacts 재생성 없이 main 에 land 하는 것을 CI 가 차단. design §9 의 첫 구현.

### 3.1 핵심: `.github/workflows/determinism-regression.yml`

design §9.1 의 5 target check:

| target | mechanism |
|---|---|
| `.onto/commands/**/*.md` | per-entry derive-hash marker (P1-2b) ↔ runtime computeEntryDeriveHash 비교 |
| `src/core-runtime/cli/dispatcher.ts` | target-scoped derive-hash marker (P1-2c) ↔ computeTargetDeriveHash("dispatcher", catalog, schemaVersion) 비교 |
| `src/core-runtime/cli/preboot-dispatch.ts` | 동일 mechanism, target-id="preboot-dispatch" |
| `src/cli.ts` help segment | target-scoped derive-hash marker ↔ computeTargetDeriveHash("cli-help", catalog, schemaVersion) 비교 |
| `package.json:scripts` | RuntimeScriptEntry 1:1 set + value equality |

**Workflow shape**:
- trigger: PR + push to main
- runs `npm run generate:catalog -- --target=all --dry-run` 또는 동등 check 명령
- mismatch 발견 시 fail with diff
- 자동 regenerate 안 함 (수동 강제) — 개발자가 catalog 수정 후 `npm run generate:catalog` + 같은 commit 에 derived 변경 포함 필수

### 3.2 5차 review 의 P1-4-classified followups (흡수 권고)

| 항목 | source | 설명 |
|---|---|---|
| **`src/cli.ts` ONTO_HELP_TEXT segment derive-hash guard parity** | 4차 review Must 1 + 5차 Conditional | dispatcher.ts + preboot-dispatch.ts 는 module-load 시 assertXxxDeriveHash 가드 보유. cli.ts segment 도 동등 가드 — segment marker hash ↔ runtime computeTargetDeriveHash("cli-help", ...) 비교. 단, segment 는 module 의 일부라 module-load 시 가드는 부적합. **CI drift workflow 가 canonical guard** 인 게 자연 — 이 PR 에서 자동 해결 |
| **`ONTO_ALLOW_STALE_DISPATCHER` 의 P1-4 의미 재정립** | P1-3 conditional consensus | dispatcher.ts / preboot-dispatch.ts 의 mismatch 시 bypass. CI drift workflow 가 main protection 이면 env override 는 dev workflow only. P1-4 README/docblock 에 명시 |

### 3.3 추가 (선택 — small 영역 cleanup)

5차 review 의 in-boundary findings 가 모두 P1-3 에 흡수됐으므로 P1-4 의 본질은 §3.1 + §3.2 만. 그 외에는 P2 architectural 영역이라 P1-4 scope 밖.

**총 예상 +200~300 lines** (workflow yaml + 보조 npm script + docblock 갱신).

---

## 4. P1-3 review 에서 P2 / 후속으로 분류된 항목 ("이후 작업의 참고물")

P1-3 의 5번에 걸친 review iteration 에서 surface 된 **architectural items**. 모두 P1-4 scope 밖 (CI drift 로 해결 불가). P2 또는 별도 RFC 단계 필요.

| # | 항목 | 출처 | 설명 |
|---|---|---|---|
| P2-1 | **`cli_dispatch` dead schema metadata** | P1-2c review C5 carryover | catalog 의 `handler_module` / `handler_export` 가 schema 에 있지만 dispatcher 가 cli.ts main 으로 일괄 위임. 둘 중 하나로 통일 (catalog 직접 dispatch OR 메타데이터 제거) |
| P2-2 | **MetaEntry hardcoded preboot handling** | P1-2c review carryover | `--help`/`--version` inline 처리 하드코딩. MetaEntry 가 schema-extensible 인데 새 meta 추가 시 preboot-dispatch.ts 코드 수정 필요. catalog-driven 으로 derive |
| P2-3 | **bare/default/meta catalog-driven 화** | 4차 review Must 2 / 5차 Recommendation | dispatcher 의 BARE_ONTO_SENTINEL hardcoded 분기 + preboot-dispatch.ts 의 help/version inline. `default_for: bare_onto` 가 schema 에 있지만 runtime 에서는 무조건 help. catalog 가 default 명령 결정 가능하게 |
| P2-4 | **aliases dispatch projection** | 4차 review UF-COVERAGE-ALIAS-DISPATCH-GAP | `Common.aliases` 가 schema 에 있고 collision-validate 만 됨. NORMALIZED 에 미투영. 첫 alias 도입 시 deriver/runtime 양쪽 갱신 필요 |
| P2-5 | **multi-CLI realization phase mapping** | 4차 review UF-EVOLUTION-MULTI-CLI-PHASE-MAP | `computePhaseMap` 이 first cli realization 만 walk. schema 가 multi 허용하므로 future entry 가 alias 가지면 silently misroute. 모든 cli invocation 별 phase 매핑으로 |
| P2-6 | **`repair_path` runtime closure** | 4차 review UF-AXIOLOGY-REPAIR-PATH-CLOSURE | `config` / `install` 이 `repair_path: true` 인데 preboot-dispatch.ts 가 cli.ts main 으로 단순 delegate. 별도 recovery path 미구현. 둘 중 하나 (구현 OR schema 에서 제거) |
| P2-7 | **`MetaEntry.default_for: "bare_onto"` 모델 미실현** | 5차 review UF-CONCISENESS-BARE-ONTO-OVERSPEC | catalog 에 default_for 선언되지만 runtime 에서 chosen-meta identity 보존 안 함 — 단순히 help dispatch 와 동일. P2-3 와 함께 결정 |
| P2-8 | **`--global` flag help visibility** | 5차 review UF-PRAGMATICS-GLOBAL-BYPASS-SURFACE | bin/onto 가 `--global` delegation bypass 인식. 그런데 catalog-derived ONTO_HELP_TEXT 에는 미노출. user-facing path 불명확 |
| P2-9 | **Legacy `learn` / `ask` cli.ts branches** | 3차 review UF-COVERAGE-LEGACY-NAMESPACE-MIGRATION | cli.ts main switch 의 `case "learn":` `case "ask":` placeholder error. catalog 미등록. 등록 (deprecated PublicEntry) OR 제거 결정 |
| P2-10 | **`RuntimeScriptEntry.args` shell-safety contract** | P1-2c carryover | 현재 bash invoker 2개. `args: string[]` 가 shell-safe 토큰임을 보장하는 계약 명시 또는 structured argv 모델 |
| P2-11 | **bin/onto dist + local-delegation smoke** | 5차 review Must 3 partial | dispatcher-smoke.test.ts 는 dev tsx path 만. production dist 경로 + project-local delegation 경로는 미커버 |

---

## 5. P1-3 에서 굳어진 결정 (P1-4 적용 전 점검)

| 결정 | P1-3 결과 | P1-4 적용 |
|---|---|---|
| `derive-hash-guard.ts` pure decision module | dispatcher.ts + preboot-dispatch.ts 의 entry guard 가 사용 | CI drift workflow 도 동일 utility 활용 가능 (subprocess 실행 후 stderr parse, 또는 직접 import) |
| `ONTO_ALLOW_STALE_DISPATCHER` env override | dev workflow escape, default fail-fast | P1-4 README/wiki 에 "CI 는 bypass 안 함, dev only" 명시 |
| `assertDispatcherDeriveHash` / `assertPrebootDispatchDeriveHash` 별도 함수명 | target 별 명시적 가드 | P1-4 의 cli-help segment 도 동일 패턴 OR CI drift 만으로 충분 결정 |
| `computeTargetDeriveHash(targetId, catalog, schemaVersion)` | 5 target 중 3개 사용 (markdown 은 entry-scoped, package-scripts 는 markerless) | CI drift check 가 동일 hash 함수 직접 호출 |
| `getNormalizedInvocationSet` 에 cli/slash/patterned_slash 모두 포함 | dispatcher 가 boundary 에서 slash/patterned reject | CI drift 는 invocation 분류 무관 — file content hash check 만 |

---

## 6. 참조 파일 우선순위

1. **Design contract (필수)**:
   - `development-records/evolve/20260423-phase-1-catalog-ssot-design.md` 특히 §9 CI drift check
   - `development-records/evolve/20260423-activation-determinism-redesign.md` §8 (CI/lint 확장)

2. **P1-3 산출물 (재사용)**:
   - `src/core-runtime/cli/derive-hash-guard.ts` — pure decision module, CI 도 사용 가능
   - `src/core-runtime/cli/catalog-hash.ts` — `computeTargetDeriveHash`, `computeEntryDeriveHash`, `computeCatalogHash`
   - `scripts/command-catalog-generator/markdown-deriver.ts` — DeriveResult.skippedUnchanged 패턴
   - `scripts/generate-command-catalog-derived.ts` — 5 target 호출 entry script

3. **CI workflow 패턴**:
   - `.github/workflows/lint-output-language-boundary.yml` — repo 의 기존 lint workflow (있다면 참조)
   - `.github/workflows/onto-dir-allowlist.yml` — 동일

4. **P1-3 review 산출물 (P2 followup decision 시 참조)**:
   - `.onto/review/20260425-1c214994/final-output.md` (1차 general — fundamental issues 발견)
   - `.onto/review/20260425-7a66822a/final-output.md` (2차 general — boundary leak)
   - `.onto/review/20260425-db4ba824/final-output.md` (3차 general — merge-safe verdict + reference findings)

---

## 7. P1-4 시작 전 결정 필요 사항 (alignment 우선)

### Q1. CI drift workflow 의 fail mode

**옵션**:
- (A) `npm run generate:catalog -- --target=all` 실행 후 `git diff --exit-code` — 변경 있으면 fail
- (B) 별도 `npm run check:catalog-drift` 추가 — dry-run 으로 hash 비교만, write 안 함, mismatch report
- (C) (A) + (B) 둘 다

**권고**: **(B)**. dry-run pure check 가 cleaner — CI 가 working tree 변경 안 함, log 가 명확. (A) 는 "변경됐다" 까지만 알리고 어떤 target 인지 모름.

### Q2. cli.ts help segment 의 guard 처리

**옵션**:
- (A) cli.ts segment 도 module-load 시 assertCliHelpDeriveHash 가드 (dispatcher 와 동일 패턴)
- (B) CI drift workflow 만 — module-load 가드는 dispatcher/preboot 만 (이미 entry point), cli.ts 는 module 의 일부라 적절치 않음

**권고**: **(B)**. cli.ts 의 segment 는 const declaration 이고 module body 에 다른 logic 존재 — entry 도 아니고 single-purpose module 도 아님. CI drift 가 canonical guard.

### Q3. determinism workflow 가 cover 하는 추가 항목

design §9.1 외에 cover 할 만한 것:
- typecheck pass (이미 별도 workflow 가능)
- vitest pass (이미 별도)
- `npm run generate:catalog --dry-run` 실패 (catalog validation)

**권고**: P1-4 는 §9.1 5 target 만. typecheck/vitest 는 별도 workflow.

### Q4. P2 followup 들 P1-4 흡수 여부

§4 의 11 항목 중 P1-4 scope 안에 흡수할 것 있는가?

**권고**: **없음**. 모두 architectural — 별도 RFC + 결정 후 P2 작업으로 분리. P1-4 는 design §9 의 CI drift 만 명확히 마감.

---

## 8. 작업 시작 후 첫 명령 (suggested)

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -10

# 2. baseline test
npm run check:ts-core
npx vitest run scripts/ src/core-runtime/cli/
# → ~393 passed (5 baseline e2e timeout 무관)

# 3. P1-2c P1-3 의 catalog-hash + derive-hash-guard 답사
head -40 src/core-runtime/cli/catalog-hash.ts
head -50 src/core-runtime/cli/derive-hash-guard.ts
head -50 scripts/command-catalog-generator/markdown-deriver.ts

# 4. design doc §9 + Activation Determinism §8 다시 읽기
sed -n '417,440p' development-records/evolve/20260423-phase-1-catalog-ssot-design.md
sed -n '434,455p' development-records/evolve/20260423-activation-determinism-redesign.md

# 5. 기존 .github/workflows/ 확인
ls -la .github/workflows/ 2>/dev/null

# 6. P1-4 작업 branch 생성
git checkout -b phase-1-4-ci-drift
```

이후 §3 deliverables 순서:

1. `npm run check:catalog-drift` 신규 script 신설 (Q1 권고)
   - `scripts/check-catalog-drift.ts` 작성 — 5 target 의 hash check 결과 보고, mismatch 시 nonzero exit
   - `package.json:scripts` 에 추가 (P1-2c 의 EXCLUDED_PACKAGE_SCRIPTS 에 등록)
2. `.github/workflows/determinism-regression.yml` 작성
   - trigger: PR + push to main
   - steps: setup-node + npm ci + npm run check:catalog-drift
3. README / docblock 업데이트 — `ONTO_ALLOW_STALE_DISPATCHER` 의 dev-only 명시
4. typecheck + vitest + smoke + commit + PR

---

## 9. P1-4 완료 후 다음 단계

P1 phase 종결. 다음 stage 옵션:
- **P2**: §4 의 architectural items 중 priority 결정 후 RFC + 작업
- **Phase 2 — Translation**: `development-records/evolve/20260417-phase-2-translation-design-sketch.md` 진입
- **Phase 4 (track-b)**: 이미 진행 중 (W-A-80~87 완료, 다음 wave)

---

## 10. 한눈 정리

P1-4 = catalog SSOT pipeline 의 마감 단계. 핵심 산출물 단 하나:
- `.github/workflows/determinism-regression.yml` (CI drift workflow)
- 보조: `npm run check:catalog-drift` script

성공 조건: P1-4 머지 후 catalog 변경만 한 PR (derived 미재생성) 이 CI fail. drift regression 차단됨.

P1-3 의 5 round review 가 surface 한 11 P2 architectural items 는 별도 RFC + 결정 후 P2 단계 작업. P1-4 의 boundary 안 에서는 §9.1 5 target check 만 명확히.
