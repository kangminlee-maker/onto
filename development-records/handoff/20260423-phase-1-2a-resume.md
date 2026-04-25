# Phase 1 P1-2a — Session Resume Handoff

> **For**: next session (post `/clear`) resuming Phase 1 implementation
> **Created**: 2026-04-23
> **Goal**: 바로 P1-2a (generator infrastructure) 작업에 착수 가능하도록 self-contained context

---

## 1. 현재 상태 (merged on `main`)

```
3728ec2 feat(catalog): P1-1b — populate full entries from 5-location survey (47 entries) (#206)
9272338 feat(catalog): P1-1a — command-catalog.ts types + helpers + minimal entries + tests (#205)
11a5781 docs(design): Phase 1 — Catalog SSOT + Dispatcher + Phase Gate Design (fully aligned 9/9) (#204)
87816f7 docs(drafts): capture Principal Operating Contract WIP in development-records/evolve/ (#200)
da88843 Activation/Execution Determinism Redesign — transition (dist bridge + ONTO_HOME propagation) + target-state design doc (#199)
```

**Working tree**: clean (이 handoff 파일 제외).
**Local main = origin/main** 동기화.

---

## 2. Phase 1 구현 roadmap — 어디까지 왔고 다음은 뭔가

| stage | 상태 | PR |
|---|---|---|
| P1-1a types/helpers/minimal/tests | ✅ merged | #205 |
| P1-1b full entries (47) | ✅ merged | #206 |
| P1-1 declaration only 전체 | ✅ **mafrged** | — |
| **P1-2a generator infrastructure** | ▶ **다음** | — |
| P1-2b markdown derive | pending | — |
| P1-2c dispatcher.ts + cli.ts help + package.json scripts derive | pending | — |
| P1-3 bin/onto + dispatcher integration + preboot-dispatch | pending | — |
| P1-4 CI drift workflow | pending | — |

---

## 3. P1-2a scope — 구체 산출물

**Goal**: generator 의 infrastructure 만 (실제 derive logic 은 P1-2b/c). catalog 데이터를 load + iterate + hash 계산 + marker 처리 까지.

### Deliverables (4 files + 1 npm script)

1. **`scripts/generate-command-catalog-derived.ts`** (신규) — generator entry script
   - Imports `COMMAND_CATALOG` from `src/core-runtime/cli/command-catalog.js`
   - CLI args: `--dry-run`, `--target=<markdown|dispatcher|help|scripts|all>`
   - P1-2a 범위: load + print summary (entry counts by kind / normalized invocation set size / catalog hash)
   - **No actual derive outputs yet** — 그건 P1-2b/c

2. **`scripts/command-catalog-generator/` directory** (신규, generator utilities)
   - `catalog-hash.ts` — `computeCatalogHash(catalog)` — catalog 내용의 stable hash (SHA-256 of canonical JSON)
   - `marker.ts` — `wrapMarkdownMarker(content, sourcePath)`, `wrapTypeScriptSegmentMarker(content, sourcePath)` — generated marker 삽입/검증 utilities
   - `template-loader.ts` — P1-2b use 용 placeholder. directory scan + read template file by `doc_template_id`

3. **`package.json:scripts`** 에 `generate:catalog` 등록
   - script: `tsx scripts/generate-command-catalog-derived.ts`
   - 주의: 이 script 자체는 **build/lint layer 에 속함** (design §4.2), 즉 RuntimeScriptEntry 가 **아님** — catalog 에 등재하지 않음

4. **test** — `scripts/command-catalog-generator/*.test.ts` 또는 `scripts/generate-command-catalog-derived.test.ts`
   - catalog 가 load 되고 hash 계산이 deterministic 한가
   - marker wrap/unwrap round-trip
   - dry-run 모드가 아무 파일도 변경 안 함

### 주요 design 결정 (이미 확정)

- **generator 호출**: 수동 강제 (Q4 decision). `npm run generate:catalog` 수행 후 결과 파일을 같은 commit 에 포함. CI drift check (P1-4) 가 누락 차단
- **Template 위치**: `src/core-runtime/cli/command-catalog-templates/{doc_template_id}.md.template` (P1-2b 에서 생성, P1-2a 에서는 directory 만 준비)
- **Generated marker format**:
  - Markdown 파일 첫 줄: `<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run \`npm run generate:catalog\`. -->`
  - TS segment: `// >>> GENERATED FROM CATALOG ... // <<< END GENERATED`
- **Catalog status**: P1-2 merge 단계 → catalog + generator coexist, derived 가 기존 파일과 **diff 0** (P1-2b 에서 조정)

---

## 4. 참조 파일 우선순위 (읽어야 할 순서)

1. **Design contract** (필수):
   - `development-records/evolve/20260423-phase-1-catalog-ssot-design.md`
   - 특히 §7 Generator 설계, §4.5 catalog.version, §4.7 normalized set, §9 CI drift

2. **Catalog 구조** (읽기):
   - `src/core-runtime/cli/command-catalog.ts` — 47 entries + types
   - `src/core-runtime/cli/command-catalog-helpers.ts` — `getNormalizedInvocationSet`, 10 assertion 함수, `validateCatalog`
   - `src/core-runtime/cli/command-catalog.test.ts` — test 패턴 reference (vitest)

3. **기존 codebase 패턴**:
   - `scripts/` 디렉토리의 기존 shell scripts (migrate-*.sh) — 구조 reference
   - `src/core-runtime/cli/*.test.ts` — vitest pattern (spawn-watcher.test.ts 등)

4. **Activation Determinism 상위 context**:
   - `development-records/evolve/20260423-activation-determinism-redesign.md` §3 Command-authoring Authority, §8 CI lint

---

## 5. Gotchas / watch-outs

- **generator script 자체는 catalog entry 가 아님** — build/lint layer 이므로 RuntimeScriptEntry 등재 금지 (design §4.2 — build/check/lint/test 는 catalog 범위 밖)
- **CATALOG_VERSION_HISTORY 는 이미 skeleton 선언됨** — 재선언 금지 (command-catalog.ts 참조)
- **Template directory (`command-catalog-templates/`) 는 P1-2a 에서는 empty 또는 README 만** — P1-2b 에서 실제 template 파일 추가
- **`validateCatalog(COMMAND_CATALOG)` auto-load** — command-catalog.ts 가 import 될 때 자동 validation. generator script 는 catalog import 시점에 이미 validated 된 catalog 만 보게 됨
- **현 package.json scripts 에 `generate:catalog` 없음** — 추가 필요 (P1-2a 작업의 한 step)

---

## 6. 작업 시작 후 첫 명령 (suggested)

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -5

# 2. design doc + catalog 구조 재확인
head -50 development-records/evolve/20260423-phase-1-catalog-ssot-design.md
grep -c "kind:" src/core-runtime/cli/command-catalog.ts  # 47 expected

# 3. 기존 tests 정상 통과 확인 (baseline)
npx vitest run src/core-runtime/cli/command-catalog.test.ts
# → 30 passed 여야 정상

# 4. P1-2a 작업 branch 생성
git checkout -b phase-1-2a-generator-infrastructure
```

이후 §3 Deliverables 순서대로 작성 → typecheck → test → commit → PR.

---

## 7. P1-2a 완료 후 P1-2b 로 이어질 작업

- Template files 생성: `command-catalog-templates/{doc_template_id}.md.template` (20 PublicEntry × 1 template + 2 MetaEntry × 1 = 약 22 template)
- Generator 의 markdown derive 로직 (template + entry → derived `.onto/commands/{name}.md`)
- 기존 `.onto/commands/*.md` 와 generated 의 diff 0 조정
- `validateCatalog` 에 `assertPromptBodyExists` / `assertHandlerModuleExists` 등 build-time file existence check 추가 (design §4.3 build-time invariants)

P1-2c 에서 dispatcher.ts + cli.ts help + package.json scripts derive.
