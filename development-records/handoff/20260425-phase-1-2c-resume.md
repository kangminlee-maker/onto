# Phase 1 P1-2c — Session Resume Handoff

> **For**: next session (post `/clear`) resuming Phase 1 implementation
> **Created**: 2026-04-25
> **Goal**: 바로 P1-2c (dispatcher + cli.ts help + package.json scripts emitters) 작업에 착수 가능하도록 self-contained context

---

## 1. 현재 상태 (merged on `main`)

```
01d9729 feat(catalog): P1-2b — markdown derive + 20 templates + diff-0 + managed-tree guards (#212)
095f431 chore(phase-4): Step 2 decision — backfill related_pr to PR #213 (#214)
bdf8a3d docs(phase-4): Stage 3 Step 4 — Integration (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment) (#213)
754f382 fix(review): propagate ONTO_HOME at review:invoke entry (B4) (#210)
13267d8 feat(catalog): P1-2a — generator infrastructure (hash + marker + template-loader + entry script) (#207)
3728ec2 feat(catalog): P1-1b — populate full entries from 5-location survey (47 entries) (#206)
9272338 feat(catalog): P1-1a — command-catalog.ts types + helpers + minimal entries + tests (#205)
```

**Working tree**: clean. Local main = origin/main.
**P1-2b merged**: 2026-04-25, 44 files, ~1300 lines diff.

---

## 2. Phase 1 구현 roadmap — 어디까지 왔고 다음은 뭔가

| stage | 상태 | PR |
|---|---|---|
| P1-1a types/helpers/minimal/tests | ✅ merged | #205 |
| P1-1b full entries (47) | ✅ merged | #206 |
| P1-2a generator infrastructure | ✅ merged | #207 |
| ONTO_HOME propagation fix | ✅ merged | #210 |
| **P1-2b markdown derive + templates + diff-0** | ✅ **merged** | **#212** |
| **P1-2c dispatcher + cli.ts help + package.json scripts emitters** | ▶ **다음** | — |
| P1-3 bin/onto integration + preboot-dispatch + catalog → runtime authority | pending | — |
| P1-4 CI drift workflow | pending | — |

---

## 3. P1-2c scope — 구체 산출물

**Goal**: design §7.1의 4 derive targets 중 **markdown 외 3개**를 emitter로 추가. P1-2b의 deriver 인프라(marker, hash, validation pipeline)를 재사용.

### Deliverables

세 개의 새 emitter + 각 emitter의 test + 기존 파일에 marker segment 삽입.

#### 3.1 `dispatcher.ts` emitter

- **파일**: `src/core-runtime/cli/dispatcher.ts` (전체 파일이 derive 대상; 지금 없음 — P1-2c가 처음 만든다)
- **소비자**: P1-3에서 `bin/onto`가 import 예정 (P1-2c 시점에는 import되지 않음, 단순 emit만)
- **내용 (design §8.1)**:
  ```typescript
  import { getNormalizedInvocationSet } from "./command-catalog-helpers.js";
  import { COMMAND_CATALOG } from "./command-catalog.js";

  const NORMALIZED = getNormalizedInvocationSet(COMMAND_CATALOG);

  export async function dispatch(argv: string[]) {
    const arg = argv[0] ?? "<<bare>>";
    const target = NORMALIZED.get(arg);
    if (!target) {
      if (arg === "<<bare>>") {
        process.stderr.write(`No default command for bare \`onto\`. ...\n`);
        return 1;
      }
      return failUnknownCommand(arg);
    }
    // phase 분기 + handler 호출
  }
  ```
- **Marker**: 전체 파일이 generated → markdown-style marker 사용 (TypeScript header comment), OR TypeScript segment marker로 전체 body wrap. 전자가 단순.
- **Emitter 위치**: `scripts/command-catalog-generator/dispatcher-deriver.ts` (신규)

#### 3.2 `src/cli.ts` help segment emitter

- **파일**: `src/cli.ts` (기존 파일; **segment**만 generated)
- **Marker (design §7.3)**:
  ```typescript
  // >>> GENERATED FROM CATALOG ... derive-hash=...
  const HELP_TEXT = `... (catalog-derived) ...`;
  // <<< END GENERATED
  ```
- **`marker.ts`의 `wrapTypeScriptSegmentMarker` / `extractTypeScriptSegment`** 재사용. P1-2a에서 이미 구현되어 있음.
- **현 상태**: cli.ts에 marker가 아직 삽입돼 있지 않음. P1-2c 첫 실행 시 segment 삽입 + 내용 generate. **idempotence + diff-0** 동일 패턴.
- **Emitter 위치**: `scripts/command-catalog-generator/cli-help-deriver.ts` (신규)

#### 3.3 `package.json:scripts` emitter

- **파일**: `package.json` (기존 파일; **`scripts` 객체 안의 RuntimeScriptEntry-derived 항목**만 generated)
- **Marker 문제**: JSON은 line comment를 지원 안 함. 두 가지 옵션:
  - **(A)** `package.json` 안에 `// <<< GENERATED ... >>>` 같은 marker를 별도 sentinel 키로 (`"__catalog_generated_scripts": "<<< managed by generate:catalog >>>"`)
  - **(B)** `package.json`에 marker 안 박고, **별도 sidecar 파일**에 hash 기록 (`scripts/.derive-snapshot.json`)
  - **(C)** 안 박고, P1-4 CI drift check가 catalog ↔ scripts 1:1 일치만 검증 (design §9.1 마지막 행 — "catalog ↔ scripts 1:1")
- **권고**: **(C)**. design doc은 다른 3개 derive target에 hash marker를 명시하지만 package.json:scripts 행은 "catalog ↔ scripts 1:1"로만 명시. JSON에 marker 박는 건 hack 성향이 강하므로 1:1 invariant test로 충분.
- **Emitter 위치**: `scripts/command-catalog-generator/package-scripts-deriver.ts` (신규)

#### 3.4 generator entry 통합

- `scripts/generate-command-catalog-derived.ts` 의 `--target=dispatcher`, `--target=help`, `--target=package-scripts` 분기를 각 emitter에 연결
- `deriveTargetStatus`: dispatcher / help / package-scripts → `"ready"`로 flip
- 모든 derive 호출에 P1-2b가 도입한 `projectRoot` anchor + `snapshotMode` env gate 동일 적용

#### 3.5 Tests (각 emitter당 2개)

- `scripts/command-catalog-generator/dispatcher-deriver.test.ts` — 단위 + diff-0
- `scripts/command-catalog-generator/cli-help-deriver.test.ts` — 단위 + segment marker round-trip + diff-0
- `scripts/command-catalog-generator/package-scripts-deriver.test.ts` — RuntimeScriptEntry 1:1 + 누락/orphan 감지

총 예상 ~700~900 lines (3 deriver + 3 test + 1 generator entry 변경 + 1 cli.ts segment + 1 package.json segment).

---

## 4. P1-2b 에서 굳어진 결정 (재사용 / 답습)

| 결정 | P1-2b에서 결과 | P1-2c 적용 |
|---|---|---|
| `DERIVE_SCHEMA_VERSION` 상수 | `"1"` (`scripts/command-catalog-generator/markdown-deriver.ts`) | 동일 상수 재사용. dispatcher + help도 input에 포함 |
| 마커 라벨 | `derive-hash=` (catalog-hash 아님) | 동일 |
| 마커 hash 계산 | per-entry: `computeEntryDeriveHash(entry, templateContent, schemaVersion)` | dispatcher/help는 entry-단위가 아니라 catalog-단위(전체 normalized set 기반) → **`computeCatalogHash`** 또는 새 helper 필요 (P1-2a `computeCatalogHash` 그대로 사용 권고) |
| `snapshotMode` env gate | `UPDATE_SNAPSHOT=1`이 아닌데 `snapshotMode: true` 통과 시 throw | 동일 패턴. dispatcher.ts (신규) / cli.ts segment (기존) / package.json (기존) 모두 in-set markerless 충돌 시 D13 case (ii) CONFLICT |
| `projectRoot` anchor | generator entry가 `import.meta.url` 기준으로 `repoRoot` 계산 후 deriver에 명시 전달 | 동일 |
| Validation 시점 | `command-catalog.ts` 모듈 로드 시 `validateCatalog(COMMAND_CATALOG)` 자동 호출 → deriver 진입 시 재호출 안 함 (vitest SSR 순환 import 방지) | 동일 |
| Bootstrap seat | `UPDATE_SNAPSHOT=1 npx vitest run scripts/command-catalog-generator/markdown-diff0.test.ts` | P1-2c는 추가 `*-diff0.test.ts` 3개 또는 단일 통합 `derive-diff0.test.ts`. **추천**: 단일 `derive-diff0.test.ts`로 4 target 모두 검증 (UPDATE_SNAPSHOT 분기는 target별 독립 가능) |
| Steady-state | `npm run generate:catalog -- --target=<x>` (default mode) | 동일 |
| Managed-tree boundary | `CATALOG_BACKED_NON_DERIVED_EXCEPTIONS` 상수 | dispatcher.ts는 emission set에 새로 추가됨. cli.ts/package.json은 **segment 단위 derive**라 case (ii) CONFLICT가 다른 의미 — 기존 hand-written 영역과 segment 영역 분리 처리 필요 |

---

## 5. P1-2c 시작 전 결정 필요 사항 (alignment 우선)

### Q1. `package.json:scripts`에 marker를 박을 것인가?

**옵션**:
- (A) JSON sentinel 키로 marker (`"__catalog_generated_scripts_marker": "..."`) — 흉측하지만 1:1 sync 검증 가능
- (B) sidecar `scripts/.derive-snapshot.json`에 hash 기록 — 깔끔
- (C) marker 없음, P1-4 CI drift가 catalog ↔ package.json:scripts 1:1만 검증 — design §9.1 그대로

**권고**: **(C)**. design doc의 9.1 표가 이미 "catalog ↔ scripts 1:1"로 명시.

### Q2. `cli.ts` segment 가 차지할 영역은 어디인가?

`src/cli.ts`의 help text는 현재 `handleInfoOrHelp` 같은 함수 안에 인라인 string으로 있음. P1-2c segment를 어디에 박을지:
- (A) 기존 help 함수 내부 일부 const block을 marker로 교체
- (B) 별도 const `HELP_TEXT_GENERATED_BLOCK = `...`;`을 marker로 wrapping, 함수가 import해서 사용
- (C) 새 export 만들고 마커는 module top-level에 둠

**권고**: **(B)** 또는 **(C)**. cli.ts의 기존 help 구조 먼저 확인 필수.

### Q3. dispatcher.ts emit이 P1-2c에서 importable해야 하는가, dead code인가?

design §8.4 표:
> P1-2 머지 직후: dispatcher.ts catalog 에서 generator emit. **bin/onto 는 아직 import 안 함**

→ **dead code (emit only)**. P1-3에서 bin/onto가 import 시작.

### Q4. `--target=all` 동작은?

P1-2b는 `markdown` 1개만 ready였음. P1-2c에서 4개 모두 ready. `--target=all`이 4개 emitter를 순차/병렬 호출. 현재 구현 확인 필요.

---

## 6. 참조 파일 우선순위 (읽어야 할 순서)

1. **현재 generator 코드** (재사용 패턴):
   - `scripts/generate-command-catalog-derived.ts` — entry script + target dispatch
   - `scripts/command-catalog-generator/markdown-deriver.ts` — emitter 패턴 (D13/D22/snapshotMode/projectRoot)
   - `scripts/command-catalog-generator/marker.ts` — `wrapTypeScriptSegmentMarker` / `extractTypeScriptSegment` (P1-2c help+dispatcher가 사용)
   - `scripts/command-catalog-generator/markdown-diff0.test.ts` — diff-0 test 패턴 (Stage 1 forward + reverse + Stage 2)

2. **Design contract** (필수):
   - `development-records/evolve/20260423-phase-1-catalog-ssot-design.md` — 특히 §7.1 derive targets, §8.1 dispatcher.ts, §8.4 timing, §9 CI drift
   - 본 handoff §3, §4

3. **catalog 구조**:
   - `src/core-runtime/cli/command-catalog.ts` — 47 entries
   - `src/core-runtime/cli/command-catalog-helpers.ts` — `getNormalizedInvocationSet` (dispatcher가 import)

4. **수정 대상 기존 파일**:
   - `src/cli.ts` — help text 영역 확인 (Q2 결정)
   - `package.json` — scripts 영역 + 현재 RuntimeScriptEntry 25개 매핑 확인
   - `bin/onto` — P1-3에서 손댐, P1-2c는 미수정

5. **P1-2b 리뷰 산출물** (deferred 항목 흡수 여부 검토):
   - `.onto/review/20260425-c21a59fb/final-output.md` (PR#212 review)
   - C3 (multi-realization emission seat 형식화), Rec (`doc_template_id` vs `identity`), Rec (help.md sync check)

---

## 7. Gotchas / watch-outs

- **Circular import**: `command-catalog.ts` ↔ `command-catalog-helpers.ts` 순환은 vitest SSR에서 TDZ 에러 가능. P1-2b는 deriver에서 `validateCatalog`를 import하지 않고 module-load-time validation에 의존. P1-2c도 동일하게 `import type`만 쓰거나, value import 하지 말 것.
- **tsconfig rootDir**: `src/`로 설정됨. `scripts/` 하위는 tsx-run 전용, 정적 typecheck 안 됨. vitest가 SSR로 typecheck 대체.
- **vitest config**: `scripts/**/*.test.ts` 픽업 설정됨 (P1-2a에서 추가). 새 test 추가 시 별도 설정 불필요.
- **`UPDATE_SNAPSHOT=1` env gate**: P1-2c emitter 모두 동일 적용. snapshotMode true는 bootstrap-only (PR#212 IA-1 fix).
- **`projectRoot` anchor**: generator entry에서 `import.meta.url`로 repoRoot 계산해 emitter에 명시 전달 (PR#212 IA-2 fix). cli.ts/package.json segment는 repoRoot 기준 절대 경로 사용 필수.
- **first-run bootstrap**: P1-2c 첫 실행이 cli.ts에 segment를 박고 package.json:scripts에 generated 항목을 넣는 transition. P1-2b처럼 PR이 post-first-generation state를 commit해야 main이 idempotent.
- **`help.md` 처리**: P1-2b는 `CATALOG_BACKED_NON_DERIVED_EXCEPTIONS = [".onto/commands/help.md"]`로 우회. P1-2c는 markdown 안 건드리므로 무관. 단, MetaEntry schema 확장이 P1-2c에 들어가면 `help.md`가 emission set에 합류 — 별도 결정 필요.
- **deferred items from PR#212 review**: C3 / `doc_template_id` 정리 / help.md stale `/onto:ask-logic` — P1-2c 진입 시 우선순위 결정 필요.

---

## 8. 작업 시작 후 첫 명령 (suggested)

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -8

# 2. 기존 cli.ts help 영역 + package.json scripts 영역 답사
grep -n "HELP_TEXT\|usage\|--help" src/cli.ts | head -10
grep -nE '"scripts": \{|"review:|"coordinator:|"onboard:|"migrate:' package.json | head -20

# 3. P1-2b 패턴 확인
head -60 scripts/command-catalog-generator/markdown-deriver.ts
head -50 scripts/command-catalog-generator/markdown-diff0.test.ts

# 4. baseline 테스트 (P1-2b 머지 직후 통과 상태)
npm run check:ts-core
npx vitest run scripts/ src/core-runtime/cli/command-catalog.test.ts
# → 111 passed 여야 정상

# 5. design doc §7.1 / §8 / §9 다시 읽기
sed -n '320,400p' development-records/evolve/20260423-phase-1-catalog-ssot-design.md

# 6. P1-2c 작업 branch 생성
git checkout -b phase-1-2c-emitter-trio
```

이후 §3 Deliverables 순서대로 작성:
1. `dispatcher-deriver.ts` (가장 단순; entire-file emit)
2. `cli-help-deriver.ts` (segment marker 사용)
3. `package-scripts-deriver.ts` (JSON 1:1, marker 없는 결정 시)
4. generator entry 통합 + 4 deriveTargetStatus → ready
5. 통합 또는 분리 diff-0 tests
6. UPDATE_SNAPSHOT bootstrap → cli.ts segment + package.json scripts block 갱신
7. typecheck → vitest → commit → PR

---

## 9. P1-2c 완료 후 P1-3 로 이어질 작업

- `bin/onto` 변경: 기존 `dist/cli.js` 직접 import → `dispatcher.ts` import → dispatcher가 phase 분기. bin/onto는 Delegation/Handoff 전담.
- `preboot-dispatch.ts` 신규 생성: preboot 명령(`info`, `install`, `config`, `--help`, `--version`) handler. descriptor 미요구. **P1-3 PR에서 dispatcher.ts와 함께 추가**.
- catalog의 authority status flip: migration evidence → runtime authority (design §6.1).
- 기존 `src/cli.ts` switch table은 이 시점에 deprecated.

P1-4에서 `.github/workflows/determinism-regression.yml` 추가, drift check 활성화.

---

## 10. PR#212 review 에서 deferred된 followups (P1-2c 진입 시 결정)

| 항목 | 출처 | P1-2c 처리 권고 |
|---|---|---|
| C3 multi-realization emission seat 형식화 | session 20260425-c21a59fb | dispatcher가 normalized invocation set 기반이라 자연 해소. 별도 작업 불필요할 가능성 높음 |
| Rec: `doc_template_id` vs `identity` concept 정리 | session 20260425-c21a59fb | P1-2c scope 밖. 별도 PR로 다룰지 결정. P1-3까지 동일하게 둬도 무방 |
| Rec: `help.md` 명시적 sync check | session 20260425-c21a59fb | P1-2c에서 MetaEntry schema 확장과 함께 처리 가능. 미확장 시 deferred |
| `help.md`의 stale `/onto:ask-logic` 참조 | session 20260425-c21a59fb | help.md가 catalog-backed-non-derived인 한 P1-2c scope 밖. follow-up issue로 |
| REC-5 deprecated entry retirement protocol | P1-2b plan v9 forward note | P1-2c emitter에 STALE 분류 동일 패턴 재사용 시 자연 적용 |
| REC-6 `DERIVE_SCHEMA_VERSION` bump 기준 | P1-2b plan v9 forward note | 별도 docstring 추가로 처리 |
| REC-7 `CATALOG_BACKED_NON_DERIVED_EXCEPTIONS` admission 기준 | P1-2b plan v9 forward note | help.md 처리와 함께 결정 |
| REC-8 placeholder extension 프로토콜 | P1-2b plan v9 forward note | P1-2c가 새 placeholder 도입할 일 없으면 deferred |
| v8 IA-v8-4/5 forward-notes → canonical | P1-2b plan v8 review | P1-2c에서 자연 흡수 가능 |
