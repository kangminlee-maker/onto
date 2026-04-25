# Phase 1 P1-3 — Session Resume Handoff

> **For**: next session (post `/clear`) resuming Phase 1 implementation
> **Created**: 2026-04-25
> **Goal**: 바로 P1-3 (bin/onto integration + preboot-dispatch + catalog → runtime authority flip) 작업에 착수 가능하도록 self-contained context

---

## 1. 현재 상태 (merged on `main`)

```
1ee7af3 feat(catalog): P1-2c — dispatcher + cli.ts help + package.json scripts emitters (#220)
43d0cee feat(track-b): phase 2 batch — W-A-86 + W-A-87 role 파일 신설 (2 atomic commits) (#222)
48cdbc5 docs(track-b): phase 2 handoff — W-A-86 + W-A-87 role 파일 신설 준비 (#221)
0f239f9 feat(track-b): phase 1 batch — W-A-81~W-A-85 canonical seat migration (5 atomic commits) (#219)
a2c9063 feat(reconstruct): W-A-80 Phase 1 Stage Transition — Hook α canonical promotion (#218)
01d9729 feat(catalog): P1-2b — markdown derive + 20 templates + diff-0 + managed-tree guards (#212)
```

**Working tree**: clean. Local main = origin/main.
**P1-2c merged**: 2026-04-25. 4 commits squashed:
- `a555785` 본 commit (3 deriver + schema 확장 + bootstrap)
- `dc930c7` 1차 리뷰 fix (5건)
- `804ca7f` 2차 리뷰 fix (axiology must — finalize-session deprecation revert)
- `c39c57d` 3차 리뷰 follow-up (record-contract.md alignment)

P1-2c review sessions:
- `.onto/review/20260425-8e502229/` — 1st pass (3 Must + 2 Should + 4 UF)
- `.onto/review/20260425-ac80d649/` — 2nd pass (axiology Must)
- `.onto/review/20260425-4cd579dc/` — 3rd pass (merge-safe, 0 immediate actions)

---

## 2. Phase 1 구현 roadmap — 어디까지 왔고 다음은 뭔가

| stage | 상태 | PR |
|---|---|---|
| P1-1a types/helpers/minimal/tests | ✅ merged | #205 |
| P1-1b full entries (47) | ✅ merged | #206 |
| P1-2a generator infrastructure | ✅ merged | #207 |
| ONTO_HOME propagation fix | ✅ merged | #210 |
| P1-2b markdown derive + templates + diff-0 | ✅ merged | #212 |
| P1-2c dispatcher + cli.ts help + package.json scripts emitters | ✅ merged | #220 |
| **P1-3 bin/onto integration + preboot-dispatch + catalog → runtime authority** | ▶ **다음** | — |
| P1-4 CI drift workflow | pending | — |

**Authority transition (design §6.1)**:
- P1-2 머지 직후 (현재): catalog + generator coexist, derived = 기존과 diff 0
- **P1-3 머지 직후**: **catalog → runtime authority** (dispatcher + preboot-dispatch 가 catalog-derived 로 실행 경로 자체)
- P1-4 머지 직후: full authority + CI drift regression 차단

---

## 3. P1-3 scope — 구체 산출물

**Goal**: `bin/onto` 가 dispatcher.ts 를 import 시작 → catalog 가 명령 surface 의 runtime authority. preboot 명령은 신규 `preboot-dispatch.ts` 에서 처리.

### Deliverables

#### 3.1 `preboot-dispatch.ts` 신규 생성

- **파일**: `src/core-runtime/cli/preboot-dispatch.ts` (지금 없음)
- **목적**: descriptor 미요구 명령 (preboot phase) handler — `info`, `install`, `config`, `--help`, `--version`, `feedback`, `transform`, ...
- **마커**: dispatcher.ts 와 동일하게 TS segment marker (전체 파일 generated)
- **catalog 로부터 emit**: PublicEntry/MetaEntry 중 `phase: "preboot"` 인 entry 의 handler 호출 + `repair_path: true` 인 명령은 best-effort bootstrap 시도 후 handler 호출
- **Emitter 신규**: `scripts/command-catalog-generator/preboot-dispatch-deriver.ts` (P1-2c 의 dispatcher-deriver 패턴 그대로)
- **DERIVE_TARGET 추가**: `preboot-dispatch` (5번째 target). `DERIVE_TARGET_PHASE` 에 `"P1-3"`, `DERIVE_TARGET_CAPABILITY` 에 `"ready"`

#### 3.2 `dispatcher.ts` 본문 갱신 — phase 분기 + handler 호출 활성화

- **현재 (P1-2c)**: dead code — argv lookup 만 하고 P1-3 wiring 미적용 stderr 출력
- **변경**: NORMALIZED.get(arg) → DispatchTarget 의 `entry_kind` + `realization_kind` 로 분기
  - `entry_kind: "meta"` → preboot-dispatch.ts 로 위임
  - `entry_kind: "public"` + `phase: "preboot"` → preboot-dispatch.ts 로 위임
  - `entry_kind: "public"` + `phase: "post_boot"` → 기존 cli.ts handler 경로 (legacy switch 유지, 단계적 흡수)
- **본문 갱신은 deriver 의 DISPATCHER_BODY 변경**으로 일어남 (catalog 수정 아님). DISPATCHER_BODY 가 미완성 stub 에서 phase 분기 실코드로 진화.
- **`assertCatalogHash()` runtime guard** (Activation Determinism §3.5): dispatcher.ts 진입 첫 줄에 marker hash ↔ runtime 계산 hash 비교, mismatch 시 stderr + exit nonzero. 본 PR 의 핵심 추가. (P1-2c 에서 deferred 됨.)

#### 3.3 `bin/onto` 변경

- **현재**: `dist/cli.js` 또는 `src/cli.ts` 직접 import
- **변경**: `dist/cli.js` 대신 `dist/core-runtime/cli/dispatcher.js` import (개발 모드는 `src/core-runtime/cli/dispatcher.ts` via tsx)
- **bin/onto 책임**: Delegation/Handoff only — local 위임 결정 + ONTO_HOME 설정 + dispatcher 호출. 명령 surface 는 catalog 가 결정.
- **legacy switch 의 운명**: `src/cli.ts` 의 main switch 는 dispatcher 가 아직 흡수 못한 post_boot 명령용 fallback 으로 유지. P1-3 PR 에서 일부 (예: review, coordinator) 는 dispatcher 가 직접 부르도록 흡수 가능. 전수 흡수는 P1-3 또는 후속.

#### 3.4 catalog 의 authority status 갱신

- **첫 줄 주석 변경**: `// Catalog migration evidence — Phase 1 P1-1 (2026-04-XX). Authority status: evidence only ...` → `// Catalog runtime authority — Phase 1 P1-3 (2026-04-XX). Authority status: runtime authority. dispatcher.ts + preboot-dispatch.ts derive from this catalog.`

#### 3.5 Tests

- `preboot-dispatch-deriver.ts` + 동일 패턴 test (unit + diff-0 + UPDATE_SNAPSHOT bootstrap)
- `bin/onto` smoke test — `onto info`, `onto --help`, `onto --version` 가 dispatcher 통과해서 정확한 output 내는지
- `assertCatalogHash()` runtime guard test — drift 시 stderr emit + nonzero exit 확인
- **(P1-2c deferred 흡수)**: cli-help-deriver 의 multi-line import bootstrap regression fixture — 신규 파일에 `import {\n  ...\n} from "...";` 만 있는 케이스로 splice 동작 회귀 검증

총 예상 +500~700 lines (1 deriver + 1 test + bin/onto 변경 + dispatcher.ts 본문 진화 + catalog 첫줄주석 + smoke test + runtime guard).

---

## 4. P1-2c 에서 굳어진 결정 (재사용 / 답습)

| 결정 | P1-2c 결과 | P1-3 적용 |
|---|---|---|
| `DERIVE_SCHEMA_VERSION` 상수 (per-deriver) | `"1"` 이 모든 deriver 에 공통 | preboot-dispatch-deriver 도 `"1"` 로 시작 |
| 마커 hash 계산 | 전체 파일 emit 은 `computeTargetDeriveHash(targetId, catalog, schemaVersion)` | preboot-dispatch 도 동일 helper, `targetId="preboot-dispatch"` |
| `snapshotMode` env gate | `UPDATE_SNAPSHOT=1` 강제 | 동일 |
| `projectRoot` anchor | generator entry → emitter 명시 전달 | 동일 |
| skip-when-unchanged | dispatcher 가 도입 (PR#220 dc930c7) | preboot-dispatch 도 동일 |
| TS segment marker — whole-file wrap | dispatcher 가 채택 | preboot-dispatch 도 채택 |
| `runtime_scripts: [...]` 의 PublicEntry 참조 | 변경 없음 | 변경 없음 |
| coexisting synonym (`finalize-session`/`assemble-record`) | 명시 comment block 으로 보존 | 동일 패턴 (deprecation 함부로 추가 금지) |

---

## 5. P1-3 시작 전 결정 필요 사항 (alignment 우선)

### Q1. `assertCatalogHash()` 의 mismatch 시 처리

**옵션**:
- (A) stderr emit + `process.exit(1)` 즉시
- (B) stderr warn + 계속 진행 (stale execution 허용)
- (C) `ONTO_ALLOW_STALE_DISPATCHER=1` env 로 (B) 우회 가능, default 는 (A)

**권고**: **(C)** — production 안전성 + emergency fallback. design §3.5 가 fail-fast 명시이므로 (A) 가 strict 해석이지만, dev workflow 에서 catalog 만 수정하고 generator 재실행 안 한 상태에 갇히면 답답하므로 env 우회 두는 것이 실용.

### Q2. preboot-dispatch.ts 가 직접 호출하는 handler 의 경로

**옵션**:
- (A) catalog 의 `cli_dispatch.handler_module` 을 그대로 dynamic import — handler-export 명시되면 그 export 호출
- (B) preboot-dispatch.ts 에 hand-coded switch 로 각 preboot 명령 → handler 매핑

**권고**: **(A)** — catalog SSOT 원칙 일관. handler_module + handler_export 가 이미 catalog 에 존재하므로 deriver 가 dynamic import 코드 emit. P1-1a 의 schema 가 이를 위해 설계됨.

### Q3. dispatcher.ts 가 post_boot 명령을 어떻게 routing 할 것인가

**옵션**:
- (A) cli.ts 의 main 함수 직접 호출 (현 switch 그대로 유지) — 점진적
- (B) catalog 의 handler_module 로 dynamic import (post_boot 도 catalog 가 SSOT) — 일관적
- (C) hybrid — review/coordinator 같은 무거운 handler 는 (B), 나머지는 (A)

**권고**: **(A)** — 첫 P1-3 PR 은 보수적. cli.ts switch 는 그대로 두고 dispatcher 가 cli.ts main 을 호출. `bounded_complete_steps` JSON 등 downstream 에 영향 없음. (B) 로의 전환은 P1-3 후속 또는 P2 에서.

### Q4. legacy `src/cli.ts` 의 ONTO_HELP_TEXT segment 운명

**현재**: P1-2c 가 segment marker 로 catalog-derive. dispatcher 는 아직 별도 help 처리.

**옵션**:
- (A) 유지 — cli.ts 가 `--help` 받으면 `console.log(ONTO_HELP_TEXT)`. dispatcher 는 `MetaEntry` 인 `help`/`-h` 를 cli.ts 로 routing.
- (B) preboot-dispatch.ts 가 `help` MetaEntry handler 직접 가짐 → cli.ts 의 case `"--help"` 제거, ONTO_HELP_TEXT 도 preboot-dispatch.ts 로 이동

**권고**: **(B)** — preboot-dispatch.ts 가 catalog 에서 emit 하므로 ONTO_HELP_TEXT 는 거기에 같이 있는 게 자연. cli.ts 의 segment marker 제거 → cli.ts 를 더 줄이는 방향.

### Q5. P1-2c review 의 deferred 3건 중 무엇을 P1-3 에 흡수

| 항목 | P1-3 적합도 |
|---|---|
| `assertCatalogHash()` runtime guard | **흡수** — design §3.5 가 dispatcher.js 진입 시점에 명시. P1-3 가 자연스러운 시점. |
| multi-line import bootstrap regression fixture | **흡수** — cli-help-deriver test 에 추가, 작은 작업 |
| `RuntimeScriptEntry.args` shell-safe contract | **defer P1-4 또는 후속** — 현재 bash invoker 2개. 늘 때 처리 |

---

## 6. 참조 파일 우선순위 (읽어야 할 순서)

1. **현재 P1-2c 코드** (재사용 패턴):
   - `src/core-runtime/cli/dispatcher.ts` — 현 emit 본문 (P1-3 가 진화시킬 대상)
   - `scripts/command-catalog-generator/dispatcher-deriver.ts` — emitter 패턴
   - `scripts/command-catalog-generator/marker.ts` — `wrapTypeScriptSegmentMarker`
   - `scripts/command-catalog-generator/dispatcher-deriver.test.ts` — diff-0 test 패턴

2. **Design contract** (필수):
   - `development-records/evolve/20260423-phase-1-catalog-ssot-design.md` — 특히 §8.1 dispatcher, §8.3 preboot-dispatch, §8.4 timing, §9 CI drift
   - `development-records/evolve/20260423-activation-determinism-redesign.md` — §3.5 dispatcher.js integrity owner + assertCatalogHash 명시

3. **수정 대상 기존 파일**:
   - `bin/onto` — dispatcher import 로 변경
   - `src/cli.ts` — switch 일부 또는 전체 deprecated 화. ONTO_HELP_TEXT segment 처리 (Q4 결정)
   - `src/core-runtime/cli/command-catalog.ts` — 첫줄 주석 변경 (migration evidence → runtime authority)

4. **catalog 구조** (변경 없음, 참고):
   - `src/core-runtime/cli/command-catalog-helpers.ts` — `getNormalizedInvocationSet`, `DispatchTarget` 타입
   - `src/core-runtime/cli/command-catalog.ts` — 47 entries

5. **P1-2c review 산출물** (deferred 항목 흡수 여부 검토):
   - `.onto/review/20260425-8e502229/final-output.md` (1차)
   - `.onto/review/20260425-ac80d649/final-output.md` (2차)
   - `.onto/review/20260425-4cd579dc/final-output.md` (3차, 최종 merge-safe verdict)

---

## 7. Gotchas / watch-outs

- **dispatcher.ts 의 NORMALIZED 는 module load 시 1회 계산** — catalog import 시 `validateCatalog` 가 자동 호출 (P1-2b 결정). circular import 주의: `command-catalog.ts` ↔ `command-catalog-helpers.ts` 는 `import type` 만, value import 금지.
- **`assertCatalogHash()` 의 비교 대상**: marker 의 derive-hash (per-target) vs 런타임 `computeTargetDeriveHash(...)` 결과. 두 hash 가 같은 입력 + schema 로 계산돼야 일치. `DERIVE_SCHEMA_VERSION` 의 일관성이 핵심.
- **`assertCatalogHash()` 호출 시점**: dispatcher.ts 의 module top-level 에서 1회 (import 시 즉시). dispatch() 함수 내부 아님. mismatch 시 module load 자체가 fail.
- **bin/onto 의 production 경로**: `dist/cli.js` 가 빌드 산출물. P1-3 변경 시 `dist/core-runtime/cli/dispatcher.js` 가 새 entry. `prepare` lifecycle hook 으로 빌드 → 빌드 누락 시 dispatcher 못 찾음. dist commit 정책이 active 인지 확인 (Activation Determinism §A1).
- **post_boot handler 호출 시 stay-in-host 정책 보존**: `onto review` 가 codex/claude 로 분기하는 로직은 cli.ts 의 review handler 안에 있음. dispatcher → cli.ts main 호출 경로에서도 그대로 유지되도록 검증.
- **ONTO_HOME propagation** (PR #210 fix): bin/onto 가 dispatcher 호출 시 env 가 그대로 전달되는지. tsx 실행 경로에서 env 손실 없는지 smoke test 필수.
- **multi-line import regression fixture** (deferred 흡수 시): cli-help-deriver.test.ts 에 `import {\n  foo,\n  bar,\n} from "baz";` 만 있는 fileContent fixture 로 splice 가 closing line 뒤에 segment 삽입하는지 단위 test.

---

## 8. 작업 시작 후 첫 명령 (suggested)

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -8

# 2. P1-2c 패턴 답사
head -80 scripts/command-catalog-generator/dispatcher-deriver.ts
head -80 src/core-runtime/cli/dispatcher.ts
grep -n "phase\|repair_path\|preboot" src/core-runtime/cli/command-catalog.ts | head -20

# 3. baseline test (P1-2c 머지 직후 통과 상태)
npm run check:ts-core
npx vitest run scripts/ src/core-runtime/cli/command-catalog.test.ts
# → 137 passed 여야 정상

# 4. design doc §8 + Activation Determinism §3.5 다시 읽기
sed -n '370,415p' development-records/evolve/20260423-phase-1-catalog-ssot-design.md
sed -n '93,105p' development-records/evolve/20260423-activation-determinism-redesign.md

# 5. P1-3 작업 branch 생성
git checkout -b phase-1-3-runtime-authority
```

이후 §3 Deliverables 순서대로 작성:

1. `preboot-dispatch-deriver.ts` (신규 emitter; dispatcher-deriver 미러)
2. `preboot-dispatch-deriver.test.ts` (unit + diff-0)
3. dispatcher-deriver.ts 의 `DISPATCHER_BODY` 변경 — phase 분기 + handler dispatch + `assertCatalogHash()` 진입 가드
4. generator entry 통합 (`--target=preboot-dispatch` 분기 추가, 5 target ready)
5. UPDATE_SNAPSHOT bootstrap → preboot-dispatch.ts 생성 + dispatcher.ts 본문 갱신
6. `bin/onto` 변경 (dispatcher.js 또는 dispatcher.ts via tsx 호출)
7. `src/cli.ts` switch 정리 (Q4 결정에 따름)
8. `src/core-runtime/cli/command-catalog.ts` 첫줄 주석 변경
9. smoke test + runtime guard test + multi-line import regression fixture
10. typecheck + vitest → commit + PR

---

## 9. P1-3 완료 후 P1-4 로 이어질 작업

- `.github/workflows/determinism-regression.yml` 신규 — design §9 의 CI drift check 활성화
  - `.onto/commands/**/*.md` catalog hash ↔ marker hash
  - `dispatcher.ts` catalog hash ↔ marker hash
  - `preboot-dispatch.ts` catalog hash ↔ marker hash
  - `src/cli.ts` help segment catalog hash ↔ segment marker hash
  - `package.json:scripts` (RuntimeScriptEntry) catalog ↔ scripts 1:1
- 자동 regenerate 안 함 — 개발자가 catalog 수정 후 `npm run generate:catalog` + 같은 commit 에 derived 변경 포함 강제

---

## 10. P1-2c review 에서 deferred 된 followups (P1-3 진입 시 결정)

| 항목 | 출처 | P1-3 처리 권고 |
|---|---|---|
| runtime `assertCatalogHash()` (Activation Determinism §3.5) | 1차 review UF-COVERAGE-RUNTIME-STALE-GUARD | **흡수** — dispatcher.ts 진입 첫 줄. design 이 dispatcher.js 시점 명시 |
| multi-line import bootstrap regression fixture | 1차 review UF-COVERAGE-CLI-BOOTSTRAP-MULTILINE | **흡수** — cli-help-deriver.test.ts 에 fixture 추가 (작은 작업) |
| `RuntimeScriptEntry.args` shell-safe contract | 1차 review UF-EVOLUTION-ARGS-CONTRACT | **defer** — 현재 bash invoker 2개. P1-4 또는 후속에서 |
| `record-contract.md:312` finalize-session 정정 | 3차 review evolution lens recommendation | **이미 처리됨** — `c39c57d` |

---

## 11. 한눈 정리

P1-3 = catalog 가 명령 surface 의 runtime authority 가 되는 단계. 핵심 신규는:
- `preboot-dispatch.ts` (catalog-derived)
- `dispatcher.ts` 본문 진화 (phase 분기 + handler dispatch + assertCatalogHash)
- `bin/onto` 가 dispatcher.ts import 시작
- `src/cli.ts` 의 일부 또는 전체 switch 가 dispatcher 에 흡수

성공 조건: P1-3 머지 후 `onto info`, `onto --help`, `onto --version`, `onto review ...` 모두 dispatcher 경로로 실행되며, `npm run generate:catalog -- --target=all` 5 target idempotent.
