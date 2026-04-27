# Declared-but-Unimplemented Closure (P2 RFC-2)

> **Status**: draft v8 (2026-04-27, v7 focused verification — design-idempotent reached)
> **Trigger**: P2 RFC-1 closure (sub-PR ladder #229/230/231 머지) 가 catalog → runtime projection 6 항목 (P2-1, 2, 3, 4, 5, 7) 닫음. 그 직후 surface 된 declared-but-unimplemented 5 항목 — schema 가 표명한 약속 중 runtime 이 invariant 강제·field 사용·존재 검증을 하지 않는 항목들.
> **Predecessors**:
> - `development-records/evolve/20260427-catalog-runtime-projection-closure.md` (RFC-1 v9, P2-A/B/C 의 design authority)
> - `development-records/handoff/20260427-p2-rfc-1-closure-resume.md` §3 Option 1 (본 RFC 의 trigger 도출)
>
> **Iteration trail**:
> - v1 (2026-04-27): 5 항목 격차 분석 + 4 sub-PR ladder + 항목별 옵션 + 권고.
> - v2 (2026-04-27): `onto review` (codex nested, session `20260427-038cc9bf`, 9 lens) 의 5 consensus blocker + 3 deliberation decision + 7 unique finding 반영. 핵심 변경:
>   - **§2.1 taxonomy**: D 가 "legacy CLI placeholder cleanup" bucket (peer 아님, C-C4 닫음). B 가 "build-time invariant 만 존재" → "removed_in 의 invariant 가 build-time 에 형식 검증만, runtime/cutover 거부 부재" 로 narrow (consensus blocker #5).
>   - **§4.1 R2-1**: rationale 재작성 — "preboot phase alias" 가 아닌 "no independent runtime consumer today". `repair_path` 가 preboot 의 subset 을 marking (semantics/dependency/pragmatics/evolution lens disagreement 반영). 제거 후 future recovery routing 의 explicit marker reintroduction 명시. §4.1.4 wording cleanup section 추가 (templates/generated docs/help).
>   - **§4.2 + §4.3 통합 — Deprecation Lifecycle Policy Table**: 3 states (deprecated_with_executor / deprecated_historical_no_executor / removed_at_or_past_cutover) × executor presence × exit code × build-time/runtime layer. `bin/onto build` 의 단일 종결 동작 명시 (consensus blocker #1, deliberation decision: build = deprecated_historical_no_executor).
>   - **§4.4 R2-4**: 옵션 (a) markdown grouping 거부 (consensus blocker #2). 권고 변경 → **schema split (PublicCliEntry vs PublicSlashOnlyEntry)** — phase 가 cli realization 보유 시 필수, slash-only 시 부재.
>   - **§4.5 R2-5**: shared validator owner 명시 (단일 invariant, 다중 invocation path). workflow path filter `.onto/processes/**`. package-scripts deriver 의 `check:contract-refs` 처리 (E-E3). scope 명시 — `Common.removed_in` 이 broader 이나 본 RFC 는 CLI PublicEntry 의 contract_ref 한정 (S-S4 + COV-2 일부 닫음).
>   - **§5 sub-PR ladder**: semantic independence vs integration independence 구분. generated markdown write-set overlap + per-target derive schema/hash seat. 모든 sub-PR 머지 전 serial rebase/regenerate/baseline check 강제 (consensus blocker #4).
>   - **§7 risk**: prerelease/release-channel semver semantics (E-E6 → out of scope), Common.removed_in 의 non-CLI scope (COV-2 → out of scope).
>   - **§8 out of scope** 확장: failure detection routing 재도입 + slash-phase consumer + non-CLI removed_in lifecycle + prerelease semver policy.
> - v3 (2026-04-27): `onto review` (codex nested, session `20260427-8d6f1af3`, 9 lens) 의 2 consensus blocker (`PublicCliEntry` CLI realization under-enforce, prerelease fail-closed) + 3 deliberation decision (executor availability owner, sub-PR ladder artifact-impact, D 명명) + 1 unique finding (P-F4 search gate exclusion) 반영. 작은 변경 (v2.1/v3 — full redesign 아님). 핵심 변경:
>   - **§2.1 taxonomy**: D 를 "adjacent legacy CLI cleanup item" 으로 명시 (peer gap type 아님, C-F1 닫음).
>   - **§4.1.4 search gate**: exclusion 명시 (`dist/**`, generated `.onto/commands/*.md`, `src/cli.ts` 의 ONTO_HELP_TEXT). 즉 "수동 wording 잔존" 만 차단, generated/derived 는 derive 재실행으로 자동 cleanup (P-F4 닫음).
>   - **§4.2.1 lifecycle policy table**: executor availability 를 explicit input/owner 로 분리. helper signature `getEntryLifecycleState(entry, currentVersion, executorAvailability)`. executorAvailability owner = 신규 helper `getCliExecutorAvailability(entry): "present" | "intentionally_absent"` (v4 에서 명명 정정 — v3 시점엔 "placeholder_only").
>   - **§4.2.1 + §4.2.5 신규**: **Broken handler reference 는 build-time invariant fail** — handler_module/handler_export 가 module 미존재 또는 export 미존재 시 build throw (현 `check-handler-exports.ts` 가 수행). `deprecated_historical_no_executor` state 는 cli.ts case 의 placeholder error 만 의미. broken handler ref 는 RFC-1 closure 의 일부 (Layer 0 canonical gate) — 본 RFC 에서 reaffirm.
>   - **§4.3 prerelease**: "throw or skip" → **fail-closed**. unsupported semver string (예: prerelease) 발견 시 build throw + 명확한 error message ("compareSemver does not support prerelease versions; remove ${X} or update prerelease policy"). skip 옵션 폐기 (lifecycle gate gap 재오픈 회피).
>   - **§4.4.3 PublicCliEntry CLI presence enforcement**: type-level + validator 병행. (a) type-level — `realizations` 가 `[CliRealization, ...PublicRealization[]]` 형태 (tuple 으로 최소 1 cli) — TS 표현력 한계로 부분만. (b) validator `assertPublicCliEntryHasCliRealization(catalog)` 추가 — `PublicCliEntry` 의 모든 entry 가 최소 1 cli realization 보유 검증. 둘 다 적용.
>   - **§4.5.3 workflow trigger expansion**: path filter 확장 — `src/core-runtime/cli/command-catalog-helpers.ts` (validator owner), `src/core-runtime/cli/command-catalog.test.ts` (test invocation), `scripts/check-contract-refs.ts` (script), `package.json` (script 정의), `.onto/processes/**` (process 파일), `src/core-runtime/cli/command-catalog.ts` (catalog), `.github/workflows/<exact-name>.yml` (workflow 자체 변경 시).
>   - **§5.1 신규 — Artifact Impact Table**: 4 sub-PR × 6 artifact dimension (catalog entries, derived outputs, schema_version, catalog hash, ladder order, baseline profile) 매트릭스. R2-PR-2 → R2-PR-3 명시적 integration dependency.
>   - **§6 targeted tests** (v2 review 의 immediate action #5 일부): executor present/absent lifecycle classification, broken handler ref fail, slash-only + phase reject, cli without phase reject, unsupported prerelease fail, contract-ref workflow coverage.
> - v4 (2026-04-27): `onto review` (codex nested, session `20260427-540d79f3`, 9 lens) 의 6 immediate actions (wording consistency fixes — full redesign 아님) 반영. 핵심 변경:
>   - **§4.2.1 helper comment 정리**: `ExecutorAvailability` 의 comment 에서 `broken_handler_ref` 언급 제거. broken ref 는 §4.2.5 의 build-time invariant — lifecycle classification 영역 아님.
>   - **§4.2.1 lifecycle table row 정리**: `deprecated_historical_no_executor` 행의 정의에서 "handler_module reference 가 깨짐" 제거 (build-time fail 로 unreachable). cli.ts case 부재 만 의미.
>   - **§4.2.3 invariant 강화**: `assertHistoricalNoExecutorPlaceholderAbsent` → `assertHistoricalNoExecutorBidirectional` — 4 조건 양방향 검증 (deprecated entry 만 / cli.ts case 부재 / lifecycle interception 보장 / false-default 시 executor 존재). transient PR-2 invariant 추가 (cli realization 보유 entry 만 허용 — R2-PR-3 schema split 전 broad PublicEntry 시).
>   - **§4.5.6 sync**: §4.5.3 의 7-path workflow trigger 를 §4.5.6 의 적용 step 에서 reference (재명시 X — SSOT). conditional consensus 닫음.
>   - **§7.2 prerelease 정정**: cross-cutting risk 에서 "throw or skip" 표현 제거 → "fail-closed throw" 로 단일 표현.
>   - **§2.1 D 표 분리**: A/B/C 표 와 D 의 visual 분리 — 별 row 에 explicit "(adjacent — not peer gap type)" 주석 추가. peer 인상 제거.
>   - **§5.1 R2-PR-2 의존성 정정**: §5.2 와 정합 — R2-PR-1 ↔ R2-PR-2 의 semantic 의존성 = "partial (PublicEntry schema 영역 동일)". §5.1 표의 semantic 의존성 column 통일.
>   - **§6 R2-PR-2 추가 test (COV-F3)**: RuntimeScriptEntry / MetaEntry 의 `removed_in <= currentVersion` build-time throw test 추가 (all-kind enforcement 확인).
>   - **historical_no_executor 정의 명확화**: "deprecated PublicCliEntry retained for historical/informational compatibility with intentionally absent executor dispatch."
> - v5 (2026-04-27): `onto review` (codex nested, session `20260427-72805472`, 9 lens) 의 1 primary blocker + 2 conditional consensus + 1 unique finding (모두 narrow wording fixes — design idempotency 도달 직전) 반영. 핵심 변경:
>   - **§6.1 R2-PR-2 stale literal 정정**: `"placeholder_only"` → `"intentionally_absent"` (v4 의 rename 누락 — primary blocker 닫음).
>   - **§4.2.3 invariant scope narrow**: `assertHistoricalNoExecutorBidirectional` 의 4 조건 = **static catalog↔cli-case consistency 한정**. lifecycle interception (dispatcher pre-delegation ordering) 은 invariant signature 로 verify 불가 → **별 dispatcher behavior test 명시 분리**. conditional consensus #1 닫음.
>   - **§4.2.1 `ExecutorAvailability.present` 명확화**: "invocation-level non-placeholder dispatch availability" — handler_module + handler_export 존재 (Layer 0 prerequisite) 만으로는 부족, cli.ts main case 가 실행 본문 보유까지 의미 (S-F2 닫음).
>   - **§4.4 tuple ordering 의미 명확화**: `[CliRealization, ...PublicRealization[]]` 은 **tactical TypeScript encoding** — ontology 의미는 "has at least one CLI realization". canonical invariant = `assertPublicCliEntryHasCliRealization` validator (`realizations.some(r => r.kind === "cli")`). conditional consensus #2 닫음 (S-F3 + CON-F2).
> - v6 (2026-04-27): `onto review` (codex nested, session `20260427-691a6620`, 9 lens narrow verification) 의 3 residual defects (모두 narrow wording cleanup) 반영. 핵심 변경:
>   - **§4.2.1 "전제 조건" block 분리**: static catalog↔cli-case invariant preconditions vs runtime dispatcher behavior requirement 명확 분리. v5 의 "전제 조건 (양방향 invariant — §4.2.3)" 가 runtime interception 도 bundled — v6 에서 두 group 으로 split.
>   - **lifecycle table `deprecated_with_executor` row 정정**: "executor 존재 (cli.ts case 또는 handler_module + handler_export 가 실제 함수)" → "ExecutorAvailability.present / invocation-level non-placeholder dispatch availability". handler_module + export 는 Layer 0 prerequisite note 로만. v5 §4.2.1 helper comment 와 정합.
>   - **§9.2 v5 closure table COV-F3 정정**: tuple-head encoding 의 dual entry 정리 — Conditional Consensus #2 의 closure 만 유지, "S-F3 + CON-F2 tuple head encoding" unique finding row 제거 (재중복).
> - v7 (2026-04-27): `onto review` (codex nested, session `20260427-c0e1a69c`, 9 lens narrow verification) 의 2 residual defects (모두 trivial wording cleanup — RFC-1 v9 패턴 last iteration 도달) 반영. 7 lens idempotent, 2 lens (structure/dependency) residual 발견. 핵심 변경:
>   - **§4.2.3 condition 4 + §6.1 non-placeholder body propagation**: invariant condition 4 와 R2-PR-2 test 에 "cli.ts case 본문이 placeholder error 아님" enforcement 명시. v5/v6 의 `ExecutorAvailability.present` 정의 ("invocation-level non-placeholder dispatch availability") 가 invariant/test owner 까지 propagate.
>   - **§9.2 COV-F3 identifier 정정**: COV-F3 = all-kind removed_in tests 만 보존 (v3 unique finding 의 canonical identifier). v6 의 tuple-head dual-entry 항목은 "tuple-head dual-entry accounting" 으로 별 label.
> - **v8 (2026-04-27)**: `onto review` (codex nested, session `20260427-4f8dd52f`, 9 lens focused verification) 의 단일 1-line defect (§9.2 stale parenthetical) 반영. 7 lens (logic/dependency/pragmatics/evolution/coverage/conciseness/axiology) idempotent 판정, 2 lens (structure/semantics) residual 으로 발견한 line 823 의 stale `COV-F3 닫음` parenthetical 정정 → "tuple-head dual-entry accounting 닫음". lens 명시: "After the one-line §9.2 cleanup, treat RFC-2 v7 as design-idempotent for this focused scope." → **v8 = design-idempotent reached**.
>
> **Sub-PR ladder (proposed)**: 5 항목 isolated → 4 sub-PR (R2-2 + R2-3 deprecated handling 통합). 각 PR LOC ~70-200 (v5/v6/v7/v8 동일 — narrow wording fix, LOC 영향 0), 병렬 coding 가능 / serial rebase·regenerate·check 강제 (자세한 의존성 §5 참조).

---

## 1. 한 문장

> **Schema 가 declared 했지만 runtime 이 honor 하지 않는 5 항목을 — 각각 (a) implementation 또는 (b) schema/code 제거 의 결정 + 적용 으로 — 마감.**

본 RFC 는 RFC-1 의 boundary 밖 항목의 집합. RFC-1 이 "schema 가 풍부하나 runtime 이 일부만 읽음" 의 6 항목을 닫았다면, RFC-2 는 "schema 가 약속하나 runtime 이 invariant 강제 부재 또는 field 미사용 또는 존재 검증 부재" 의 5 항목을 닫는다.

### 1.1 v1 → v2 grammar 정리 (L-F1 닫음)

v1 의 "binary (a) 구현 OR (b) 제거" grammar 는 일부 항목 (R2-3 의 (a)+(b) 통합, R2-4 의 docs-only) 와 conflict — v2 는 grammar 를 **"결정 + 적용"** 로 일반화. 항목별 옵션 수는 항목 자체의 결정 공간이 결정 (binary 강제 X).

---

## 2. 배경 — RFC-1 closure 후 surface

### 2.1 격차 type 분류 (v2 명세 정정)

**Declared-but-unimplemented gap types (3 정식 type — A/B/C)**. type 은 descriptive 분류이지 normative invariant 가 아님 — 본 절의 type 명명은 항목의 surface 패턴 분류일 뿐 (C-C4).

| type | 정의 | 본 RFC 항목 |
|---|---|---|
| **(A) declared field, runtime 미참조** | schema 에 field 가 있으나 invariant 강제·routing 결정·표시 등 어디에도 직접 사용되지 않음 — purely informational marker (단, 다른 invariant 의 input 으로는 사용 가능) | R2-1 (`repair_path`), R2-4 (slash-only `phase`) |
| **(B) lifecycle invariant 의 build-time 형식 검증만 존재, runtime cutover 거부 부재** | schema 가 lifecycle field (`deprecated_since` / `removed_in`) 를 declared 하고 build-time 에 형식 일관성 (예: `removed_in > deprecated_since`) 만 검증. runtime 의 cutover (current version >= removed_in 시 거부) 부재 | R2-3 (`removed_in`) |
| **(C) declared field, validation 부재** | schema 가 외부 reference 를 갖지만 그 ref 의 존재/유효성 검증 부재 (silent broken ref 가능) | R2-5 (`contract_ref` 파일 존재) |

**Adjacent cleanup item (R2-2 — A/B/C 와 peer 아님, v4 명시 분리)**:

R2-2 (`learn`/`ask`/`build` placeholder) 는 위 A/B/C 와 다른 axis: **RFC-1 closure 직후 surface 된 cli.ts main 의 legacy placeholder cleanup**. catalog 의 declared 와 정합되지 않는 hardcoded case (catalog 미등록 → dispatcher 가 도달 불가, 또는 catalog 등록인데 misleading message). 본 RFC 의 closure 범위에는 포함되나 declared-but-unimplemented gap **type 으로는 분류하지 않음** — R2-2 + R2-3 통합 lifecycle policy 의 일부로 함께 처리 (§4.2).

→ 정식 gap type = **A, B, C 3 종**. R2-2 는 RFC-2 가 함께 마감하는 **adjacent legacy cleanup**.

**type 명명 변경 추적 (v1 → v4)**:
- D 는 v1 에서 "schema gap type 의 peer" 로 표현, v2 에서 "legacy placeholder cleanup" 로 narrow, v3 에서 "(D) [adjacent]" 표 안 marking, **v4 에서 표 자체에서 분리 — A/B/C 만 정식 type, R2-2 는 별 paragraph 의 adjacent cleanup item** (C-C1 + C-F1 완전 닫음).
- B 는 v1 에서 "build-time invariant 만 있고 runtime 거부 부재" → v2 에서 "lifecycle invariant 의 build-time 형식 검증만, runtime cutover 거부 부재" — current-version invariant 가 이미 존재함을 imply 하지 않도록 narrow.

### 2.2 왜 RFC-1 가 이 항목들을 다루지 않았나

RFC-1 의 closure 범위는 "**catalog 가 declared 한 모델을 runtime 이 honor 하도록 dispatcher/preboot-dispatch 의 hardcoded 분기 제거**" — 즉 declared model 의 **routing 활용**. 본 RFC 의 5 항목은 routing 와 무관한 **declared invariant·field·existence** 의 enforcement 격차로, RFC-1 의 §3 6 항목과 axis 가 다름.

RFC-1 의 §11 future seam 6 항목 역시 본 RFC 와 별개 — future seam 은 "trigger 가 도래하면 도입할 변경" 인 반면, 본 RFC 는 "현 시점에서 이미 declared 되었으나 runtime 이 미반응" 의 cleanup.

---

## 3. 5 항목 격차 표

### 3.1 한눈 격차

| # | 항목 | type | declared (schema) | runtime (현재) | user-facing 결과 |
|---|---|---|---|---|---|
| **R2-1** | `PublicEntry.repair_path?: boolean` | A | `config`, `install` 에 `repair_path: true` declared | `assertRepairPathPreboot()` build-time check 만 (preboot 강제). dispatcher / cli.ts 미참조 | 명시 의도 (실패 시 복구 routing) 미실현. schema 표면이 약속 표명, runtime 영향 = preboot subset marking 의 build-time invariant 만 |
| **R2-2** | cli.ts:774-780 `learn` / `ask` / `build` placeholder | adjacent (§2.1) | `learn`, `ask` catalog 미등록. `build` catalog 등록 (deprecated, successor: reconstruct, executor 부재) | dispatcher 가 catalog routing — `learn`/`ask` 는 unknown reject (default case), `build` 는 cli.ts placeholder 도달 → "not yet implemented" 출력 (executor 부재) | `learn`/`ask` placeholder 는 dead code (도달 불가). `build` 는 misleading message — deprecated_historical 인데 unimplemented 처럼 표현 |
| **R2-3** | `Common.removed_in?: string` | B | `migrate-session-roots`: `removed_in: "0.3.0"` (현 version 0.2.2). `Common` 이라 모든 entry kind 가 보유 가능 | build-time: `removed_in > deprecated_since` 형식 검증. runtime: cutover (current >= removed_in) 거부 부재 | 0.3.0 release 후에도 entry 가 catalog 에 잔존 시 호출 가능 — schema 의 deprecation lifecycle 약속 silent break. **scope**: `Common` 이 broader 이나 본 RFC 는 CLI PublicEntry 한정 (COV-2 일부) |
| **R2-4** | `PublicEntry.phase: "preboot" \| "post_boot"` (slash-only entries) | A | slash-only 7 entry (`feedback`, `backup`, `restore`, `transform`, `create-domain`, `onboard`, `promote-domain`) 모두 `phase: post_boot` declared | dispatcher PHASE_MAP 은 cli realization 에서만 derive (dispatcher-deriver.ts:99-107). slash-only 의 phase 는 PHASE_MAP / repair_path / cli-help / markdown 어디에도 미참조 | decorative field — schema 의 type uniformity 만 보장. 실제 runtime 영향 0. type 의 misleading uniformity (slash-only 가 phase 갖는 듯 보이나 실제 의미 없음) |
| **R2-5** | `PublicEntry.contract_ref?: string` | C | 14 entries 가 `.onto/processes/*.md` 참조. `markdown-deriver.ts:155` 가 `{{process_ref}}` 템플릿 변수로 사용 | `command-catalog.ts:156-157` 명시 TODO — "build-time tests per design §4.3 — validation 추가는 후속". 현재 모든 contract_ref 가 우연히 존재 | broken contract_ref 가 silent 로 markdown-deriver 까지 전파 → 잘못된 process_ref injection. 향후 process 파일 rename/삭제 시 PR 이 통과 가능. **scope**: 본 RFC 는 `contract_ref` 만 한정 — 다른 process 참조 (template hardcoded, generated doc 등) 는 별 scope (S-S4 → §8) |

### 3.2 격차의 공통 원인

이 5 항목은 P1 의 catalog SSOT 통합 시점에 **"schema model 은 풍부하게 표명하되 enforcement 는 점진"** 라는 의식적 분리의 결과. P1-3 review 에서 surface 된 6 항목은 RFC-1 (P2-A/B/C) 가 닫았고, 본 RFC 의 5 항목은 P1 design (`development-records/evolve/20260423-phase-1-catalog-ssot-design.md`) §4.3 의 build-time invariant 항목 중 일부 + cli.ts main switch 의 legacy placeholder 항목.

---

## 4. 항목별 결정 + 적용

각 항목은 결정 공간이 다름 (binary 가 아닐 수 있음). 본 RFC 가 권고 결정을 v2 에서 lens consensus 반영하여 제시하되, **확정은 user 결정**.

### 4.1 R2-1 `repair_path` 결정

#### 4.1.1 v1 → v2 rationale 정정

v1 은 "`repair_path` 는 preboot phase 의 alias" 라고 표현했으나, 9-lens review 의 semantics/dependency/pragmatics/evolution lens 가 모두 disagreement 표명:

> `repair_path` 는 preboot 와 equivalent 가 아니다. preboot 의 **subset** 을 marking — preboot phase 중 "post_boot bootstrap 실패 환경에서도 호출 가능한 것" 만 marking. 현 build-time invariant (`repair_path: true → phase: preboot`) 는 이 subset relationship 의 한 방향 (subset → superset) 만 검증 — "preboot 인 모든 entry 가 repair_path 인 것은 아니다" 가 정상 (예: `info` 는 preboot 이지만 repair_path 아님).

→ v2 정정: 제거 결정의 rationale 은 "`no information loss`" 가 아니라 **"`no independent runtime consumer today`"**. 즉 declared marker 가 의미적으로 preboot 의 subset 정보를 표현하나, **그 정보를 활용하는 runtime consumer 가 없음** (dispatcher 미참조, cli.ts 미참조, fallback help 미존재). build-time invariant 의 단일 사용처는 자기참조적 (`repair_path → preboot` 강제 — 즉 marker 자신의 placement 만 검증).

#### 4.1.2 결정 옵션 (v2 정정)

**(a) 구현 — runtime recovery routing**:
- bin/onto 가 post_boot bootstrap 실패를 detect → repair_path entries 만 노출하는 fallback help 출력 또는 routing
- LOC: ~200 (failure detection mechanism + fallback help + test)
- **Risk**: failure detection 신규 mechanism. config / install 외 추가 실수요 불명

**(b) 제거 — schema 에서 `repair_path` 필드 삭제 + wording cleanup**:
- `assertRepairPathPreboot` 함수 + 호출 + 3 test 제거
- `config` / `install` 의 `repair_path: true` 제거 (phase: preboot 그대로 유지)
- **§4.1.4 wording cleanup section 의 모든 항목 처리** (templates/generated docs/help text)
- effect: schema 표면 단순화. preboot subset 정보 (recovery intent) 의 explicit marker 손실 — future recovery routing 도입 시 **별 marker 또는 explicit criteria 재도입 필요** (§8 out of scope 명시)
- LOC: ~70 (제거 + wording cleanup)

**권고 (v2)**: **(b) 제거**. 단 v2 에서 새로 명시:
- 제거의 rationale 은 "no independent runtime consumer today" — recovery intent marker 의 정보 손실 발생함을 인정
- §4.1.4 의 wording cleanup 모두 적용 (search gate 로 잔존 표현 차단)
- 향후 recovery routing 도입 시 별 RFC 에서 explicit marker 재도입 (§8)

#### 4.1.3 적용 (옵션 b 가정)

- `src/core-runtime/cli/command-catalog.ts`:
  - `PublicEntry` type 에서 `repair_path?: boolean` 라인 제거 (line 100)
  - `config` (line 183) 의 `repair_path: true,` 라인 제거
  - `install` (line 194) 의 `repair_path: true,` 라인 제거
  - description 에서 "(repair-path)" / "Repair-path." 표현 정리
- `src/core-runtime/cli/command-catalog-helpers.ts`:
  - `assertRepairPathPreboot` 함수 + `validateCatalog` 안의 호출 제거 (line 339-350)
- `src/core-runtime/cli/command-catalog.test.ts`:
  - `it("repair_path commands (install, config) are preboot")` (line 94) — 제거
  - `it("throws when repair_path: true but phase: post_boot")` (line 403) — 제거
  - `it("passes when repair_path: true with phase: preboot")` (line 426) — 제거
- catalog hash bump → 5 derive target 재실행

#### 4.1.4 Wording cleanup (v2 신규)

`repair_path` 의 표현이 schema 외부에 잔존 시 silent contradiction. PR 의 cleanup scope:

| location | 현 표현 (검색 패턴) | cleanup |
|---|---|---|
| catalog description | `repair-path` / `Repair-path` (config/install entry description) | 제거 |
| markdown templates (`.onto/templates/` 또는 deriver 의 inline) | `{{repair_path}}` / `repair-path` | grep 후 제거 |
| generated `.onto/commands/*.md` | derive 자동 재생성으로 cleanup. drift workflow 가 미정합 detect | drift 가 검증 |
| ONTO_HELP_TEXT (cli.ts 내 generated) | `repair-path` 표현 가능성 — derive 재실행으로 cleanup | derive 자동 |
| `.onto/processes/configuration.md`, `.onto/processes/install.md` | hardcoded "repair-path" 표현 가능성 | grep 후 수동 정리 |
| development-records | 이력 보존 — 변경 X | (skip) |

PR 의 검증 step (v3 정정 — exclusion 명시, P-F4 반영):
```bash
# search gate — 수동 wording 잔존만 차단
# exclusion 이유:
#   - development-records/        : 이력 보존 (RFC-1, 본 RFC, handoff 등 repair_path 표현 정상)
#   - dist/                       : 빌드 산출물, prepare hook 이 자동 재생성
#   - .onto/commands/*.md         : derive 자동 재생성 (markdown-deriver) — drift workflow 가 검증
#   - src/cli.ts                  : ONTO_HELP_TEXT 가 cli-help-deriver 자동 재생성 — drift 가 검증
git grep -lE 'repair_path|repair-path|Repair-path' \
  -- ':!development-records/' \
     ':!dist/' \
     ':!.onto/commands/' \
     ':!src/cli.ts' \
     ':!.git/'
```

위 결과가 0 line 이어야 PR 진입 OK. derive 재생성 영역 (dist/, .onto/commands/, ONTO_HELP_TEXT in cli.ts) 의 표현 잔존은 catalog drift workflow 가 자동 detect (catalog 변경 후 derive 재실행 안 했으면 fail).

---

### 4.2 R2-2 + R2-3 통합: Deprecation Lifecycle Policy

v1 은 R2-2 (cli.ts placeholder) 와 R2-3 (`removed_in` enforcement) 를 별 항목으로 다루었으나 9-lens review 가 **`bin/onto build` 의 단일 종결 동작 미정의** 를 #1 consensus blocker 로 surface. 두 항목은 같은 axis 의 결정으로 통합:

#### 4.2.1 Normative Lifecycle Policy Table

각 entry 의 lifecycle state 는 (deprecated_since, removed_in, executor presence, current version) 의 함수. 정책:

| state | 정의 (lifecycle field + executor) | runtime 동작 | exit code | build-time 동작 |
|---|---|---|---|---|
| **active** | `deprecated_since` 미설정 | 정상 dispatch | (executor 결정) | 정상 |
| **deprecated_with_executor** | `deprecated_since` 설정 + `ExecutorAvailability.present` (= invocation-level non-placeholder dispatch availability — cli.ts main case 가 실행 본문 보유). handler_module + handler_export 의 존재는 Layer 0 prerequisite (RFC-1 check-handler-exports) 일 뿐 — `present` 의 충분조건 아님 | stderr 에 deprecation notice (`[onto] '${name}' is deprecated since ${deprecated_since}.` + successor 가 set 이면 ` Use '${successor}' instead.`) → **executor 실행** (정상 dispatch) | executor 결정 (정상 path 의 exit code) | 정상 |
| **deprecated_historical_no_executor** | `deprecated_since` 설정 + executor 의도적 부재 (cli.ts case 부재 — `historical_no_executor: true` catalog field 가 owner). broken handler ref 는 본 state 에 도달하지 못함 — §4.2.5 build-time fail | stderr 에 deprecation notice + successor guidance → **실행 없이 종료** | **1** (nonzero) | 정상 (catalog 에 잔존 — historical informational entry) |
| **removed_at_or_past_cutover** | `removed_in` 설정 + current version >= `removed_in` | (정상 path 에선 unreachable — build-time throw 가 차단) defense-in-depth: stderr 에 "removed" 메시지 → 종료 | **1** | **throw**: `entry "${name}" has removed_in="${X}" but current version="${Y}" >= removed_in. remove from catalog before this release.` |

**state 결정 로직** (dispatcher 또는 dispatch-preboot-core 진입 시):
```ts
type ExecutorAvailability = "present" | "intentionally_absent";
// "present" = invocation-level non-placeholder dispatch availability — cli.ts main switch 의 case 가 실제 executor 본문 (import + handler 호출) 보유
//   주의: handler_module + handler_export 존재만으로는 "present" 가 아님 — Layer 0 prerequisite (RFC-1 check-handler-exports) 일 뿐. case 본문이 placeholder error (예: "not yet implemented") 면 "present" 아님
// "intentionally_absent" = historical_no_executor: true 인 entry — catalog 가 declared "executor 가 의도적 부재"
// (broken handler ref 는 build-time check-handler-exports 가 reject — runtime classification 영역 밖, §4.2.5)

function getEntryLifecycleState(
  entry: PublicEntry,
  currentVersion: string,
  executorAvailability: ExecutorAvailability,
): "active" | "deprecated_with_executor" | "deprecated_historical_no_executor" | "removed_at_or_past_cutover" {
  if (entry.removed_in !== undefined && compareSemver(currentVersion, entry.removed_in) >= 0) {
    return "removed_at_or_past_cutover";
  }
  if (entry.deprecated_since === undefined) return "active";
  return executorAvailability === "present"
    ? "deprecated_with_executor"
    : "deprecated_historical_no_executor"; // executorAvailability === "intentionally_absent"
}
```

**executor availability owner (v3 신규)** — explicit input 으로 분리. owner = catalog 의 신규 field `PublicCliEntry.historical_no_executor?: boolean` (default false):

```ts
function getCliExecutorAvailability(entry: PublicCliEntry): ExecutorAvailability {
  // catalog SSOT — entry 자체가 declarative input
  // historical_no_executor: true → cli.ts 의 case 가 의도적 부재. dispatcher 가 lifecycle policy 분기에서 intercept
  // historical_no_executor: false (default) → cli.ts main 의 case 가 실행 본문 보유
  // (broken handler refs 는 §4.2.5 build-time fail — 이 함수에 도달 불가)
  return entry.historical_no_executor === true ? "intentionally_absent" : "present";
}
```

owner 위치: `src/core-runtime/cli/command-catalog-helpers.ts` (또는 별 helper module).

**왜 catalog field 인가** (v2 → v3 변경 이유): v2 는 implicit (cli.ts 의 case 본문 검사) 또는 hardcoded list (`["build"]`) 를 검토. 9-lens review 의 deliberation decision 이 "explicit executor availability ownership/input" 을 요구 — implicit/hardcoded 는 owner 가 불명확하여 거부. catalog 가 P1 의 SSOT 원칙상 declarative seat — entry 자체가 owner 가 자연.

**field 의 정의 (v4 명확화)**:
> `historical_no_executor: true` 는 **deprecated PublicCliEntry 가 historical/informational compatibility 를 위해 catalog 에 보존되되 executor dispatch 가 의도적으로 부재함** 을 declare 한다.

**전제 조건 (v6 — 두 layer 분리 명시)**:

(A) **Static catalog↔cli-case invariant** (build-time, `assertHistoricalNoExecutorBidirectional` 가 owner — §4.2.3):
- `historical_no_executor: true` 만 허용되는 case: PublicCliEntry + `deprecated_since` 설정 + cli.ts main switch 에 해당 invocation 의 case 부재 (또는 case 본문이 placeholder error)
- `historical_no_executor: false` 또는 미설정: cli.ts main 에 case 가 존재 + **본문이 non-placeholder executor (실제 import + handler 호출, placeholder error 아님)**
- 두 표현이 inconsistent → build-time invariant 가 throw
- v7: `cliCases` 입력 정의 — "cli.ts main switch 에서 non-placeholder executor 본문을 가진 case 의 invocation set". placeholder error 본문 case 는 cliCases 에 포함되지 않음 (condition 4 가 case 부재로 throw)

(B) **Runtime dispatcher behavior requirement** (runtime, `dispatcher.test.ts` 가 owner — §4.2.3 후반):
- `historical_no_executor: true` entry 호출 시 dispatcher 가 lifecycle policy 분기에서 intercept (cli.ts main 위임 전, notice + return 1)
- 이 ordering 은 static invariant signature 로 verify 불가 — 별 dispatcher behavior test 가 owner

(C) **broken handler refs**: 본 field 와 무관 — §4.2.5 build-time `check-handler-exports` 가 차단 (Layer 0)

**현 catalog 적용**:
- `build`: 신규 `historical_no_executor: true` 설정 (R2-PR-2 가 cli.ts case 동시 제거)
- `migrate-session-roots`, `reclassify-insights`: 미설정 (default false). 두 entry 모두 cli.ts case + 실행 본문 보유

#### 4.2.2 R2-2 + R2-3 의 구체 적용

본 정책의 entry 별 결과:

| entry | lifecycle field | historical_no_executor | state | 적용 동작 |
|---|---|---|---|---|
| `migrate-session-roots` | `deprecated_since: 0.2.0`, `removed_in: 0.3.0` | (default false) | deprecated_with_executor (current 0.2.2 < 0.3.0) | notice + executor 실행. 0.3.0 cutover 시 build-time throw → catalog 에서 제거 강제 |
| `reclassify-insights` | `deprecated_since: 0.2.0`, successor: promote | (default false) | deprecated_with_executor | notice + executor 실행 |
| `build` | `deprecated_since: 0.2.0`, successor: reconstruct | **true (v3 신규)** | **deprecated_historical_no_executor** | notice + 종료 (exit 1). cli.ts:775 placeholder case 제거 — catalog field 가 정합 owner. dispatcher 가 lifecycle policy 에서 intercept (cli.ts main 위임 전) |
| `learn` | catalog 미등록 | (해당 없음) | (해당 없음 — dispatcher unknown reject) | cli.ts:774 case 제거. dispatcher default case 가 처리 |
| `ask` | catalog 미등록 | (해당 없음) | (해당 없음 — dispatcher unknown reject) | cli.ts:776 case 제거. dispatcher default case 가 처리 |

**effect**: `bin/onto build` 의 단일 종결 동작 = "deprecated since 0.2.0. Use 'reconstruct' instead." + exit 1 (consensus blocker #1 닫음).

#### 4.2.3 적용 (PR scope)

- `src/cli.ts`: line 774-780 의 3 case 제거 (`learn` / `ask` / `build`). dispatcher 의 lifecycle policy 와 default case 가 모든 invocation 을 cover
- `src/core-runtime/cli/command-catalog.ts`:
  - `PublicCliEntry` (R2-PR-3 의 schema split 후) 또는 `PublicEntry` (R2-PR-2 가 R2-PR-3 보다 먼저 머지 시) 에 `historical_no_executor?: boolean` field 추가 (default false)
  - `build` entry 에 `historical_no_executor: true` 추가
- `src/core-runtime/cli/command-catalog-helpers.ts`:
  - `assertDeprecationLifecycle` 확장: package.json 의 current version read → 각 entry 의 `removed_in <= current version` 검사 → throw (state = removed_at_or_past_cutover 의 build-time 동작)
  - 새 helper: `getCliExecutorAvailability(entry: PublicCliEntry): ExecutorAvailability` (catalog field 읽기)
  - 새 helper: `getEntryLifecycleState(entry, currentVersion, executorAvailability): "active" | "deprecated_with_executor" | "deprecated_historical_no_executor" | "removed_at_or_past_cutover"`
  - 새 invariant: `assertHistoricalNoExecutorBidirectional(catalog, cliCases)` (v4 강화, **v5 scope narrow** — static catalog↔cli-case consistency 한정) — 4 조건 양방향 검증:
    1. `historical_no_executor: true` → entry 가 PublicCliEntry (cli realization 보유) — slash-only entry 에 set 시 throw
    2. `historical_no_executor: true` → entry 가 `deprecated_since` 설정 — non-deprecated entry 에 set 시 throw
    3. `historical_no_executor: true` → 해당 cli invocation 이 cli.ts main switch 에 case 로 부재 — 둘 다 존재 시 throw (정합 owner 위반)
    4. `historical_no_executor: false` 또는 미설정 + cli realization 보유 → cli.ts main 에 case 존재 **+ 본문이 non-placeholder executor (placeholder error 아님)** — case 부재 시 throw (orphan executor) 또는 case 본문이 placeholder error 시 throw (executor body 부재). v7 — `cliCases` 입력은 "non-placeholder executor cases only" 로 narrow (placeholder case 는 input 에 포함되지 않음 → condition 4 가 case 부재로 throw)
  - **transient PR-2 invariant (v4 신규)** — R2-PR-3 schema split 전, broad PublicEntry 가 `historical_no_executor` field 보유 시기. 추가 검증: `historical_no_executor: true` 인 entry 가 `realizations.some(r => r.kind === "cli")` — cli realization 부재 entry 에 set 시 throw (R2-PR-3 schema split 후 PublicCliEntry 로 자동 narrowing)
- **dispatcher behavior test (v5 분리)** — invariant 가 cover 못 하는 runtime ordering 검증. 별 layer:
  - dispatcher 가 `historical_no_executor: true` entry 를 만나면 lifecycle policy 분기 (notice + return 1) 가 cli.ts main 위임 **전** 에 발생 — pre-delegation ordering
  - test seat: `dispatcher.test.ts` 또는 `dispatch-preboot-core.test.ts` — mock catalog × historical entry 호출 시 cli.ts main 의 case 가 실행되지 않고 lifecycle notice 만 출력 verify
  - 위 test 가 invariant 와 별 layer — invariant 는 schema 정합 (build-time), test 는 runtime 동작 검증
- `src/core-runtime/cli/dispatcher.ts` (또는 dispatch-preboot-core.ts) 의 dispatch 진입에서:
  - target entry 가 PublicEntry 면 `getEntryLifecycleState(entry, currentVersion, getCliExecutorAvailability(entry))` 호출
  - state 별 분기:
    - `active` → 정상 dispatch
    - `deprecated_with_executor` → notice + 정상 dispatch (cli.ts main 위임)
    - `deprecated_historical_no_executor` → notice + return 1 (cli.ts main 위임 안 함)
    - `removed_at_or_past_cutover` → defensive notice + return 1 (build-time throw 가 차단했어야 하므로 unreachable defense)
- test:
  - 각 state 별 stderr snapshot test (dispatcher 또는 cli.ts main entry)
  - `assertDeprecationLifecycle` 의 mock catalog × current version > removed_in throw test
  - executor presence 판정 helper 의 entry kind 별 test

#### 4.2.4 Scope 한정 (COV-2 일부 닫음, 일부 §8)

`Common.removed_in` 은 모든 entry kind (PublicEntry, RuntimeScriptEntry, MetaEntry) 가 보유 가능. **본 RFC 의 R2-3 lifecycle policy 는 PublicEntry 한정**:
- PublicEntry: dispatcher 가 routing — lifecycle policy 적용
- RuntimeScriptEntry: npm scripts 가 dispatch — lifecycle policy 별 axis (npm script 호출 시점에 build-time throw 만 의미). 본 RFC 는 build-time throw 만 cover (npm script 진입에 runtime notice 추가는 future)
- MetaEntry: `--help`/`-h`/`--version`/`-v` — `removed_in` 사용처 없음 (현 catalog 에 deprecated meta 부재). 향후 추가 시 별 처리

→ build-time throw 는 **모든 kind 적용** (entry kind 무관하게 catalog 에서 제거 강제). runtime notice 는 PublicEntry 한정. 비-PublicEntry 의 runtime lifecycle 는 §8 future scope.

#### 4.2.5 Broken handler reference = build-time invariant fail (v3 신규)

9-lens v2 review deliberation decision: "Broken `handler_module` / `handler_export` references should be build-time invariant failures, not historical no-executor states."

본 RFC 는 이 invariant 를 reaffirm — RFC-1 closure 의 일부:
- **Layer 0 canonical gate**: `scripts/check-handler-exports.ts` 가 catalog 의 모든 cli realization 의 `handler_module` (현 `src/cli.ts`) + `handler_export` (현 함수 export) 를 검증. file 미존재 또는 export 미존재 → process exit 1
- 본 RFC 는 신규 invariant 추가 안 함. 단 **lifecycle policy 가 broken ref 와 historical_no_executor 를 정합 분리** 명시:
  - broken `handler_module` / `handler_export` → build-time `check:handler-exports` fail. catalog 자체가 reject
  - `historical_no_executor: true` → catalog field 의 explicit declared. handler_module reference 는 valid (cli.ts 자체는 존재), 단 cli.ts main 의 case 가 부재 (catalog field 가 dispatcher intercept 의 owner)

→ 두 case 가 다른 layer 에서 처리. broken ref 는 PR 진입 차단 (build-time), historical_no_executor 는 runtime 의 lifecycle policy 분기 (declared informational entry).

---

### 4.3 R2-3 prerelease/release-channel semver semantics — §8 로 deferral (v3 정정)

E-E6 unique finding: `removed_in` 의 prerelease/release-channel semver 정책 부재. 예:
- `removed_in: "0.3.0"` 일 때 current version `0.3.0-rc.1` 는 cutover 도달인가?
- `removed_in: "0.3.0"` 일 때 current version `0.3.0-beta` 는?
- semver spec 상 `0.3.0-rc.1 < 0.3.0`. 현 `compareSemver` (command-catalog-helpers.ts:296-311) 는 prerelease 미지원 (단순 dotted-integer split).

**v2 결정**: prerelease/release-channel 정책은 **본 RFC scope 밖**. 이유:
- 현 release flow 가 prerelease 를 사용하지 않음 (0.2.2 → 0.3.0 직접 bump 패턴)
- 정책 결정은 release management 의 별 axis (semver 채택 정도, npm tag 사용 등)
- 본 RFC 의 build-time throw 는 단순 비교로 충분 (current `0.3.0` >= removed_in `0.3.0` → throw, current `0.2.2` < `0.3.0` → 통과)

→ 본 RFC 의 `compareSemver` 는 dotted-integer 만 지원. prerelease string (예: `0.3.0-rc.1`) 은 build-time throw check 에서 **fail-closed** (v3 정정 — v2 의 "throw or skip" 거부, 9-lens consensus blocker #2 닫음):

```ts
// assertDeprecationLifecycle 안의 version check 분기
function isSupportedSemver(version: string): boolean {
  // dotted-integer 만 — "0.3.0", "1.2.3" 등
  // unsupported: prerelease ("0.3.0-rc.1"), build metadata ("0.3.0+abc"), 비-semver 등
  return /^\d+(\.\d+)*$/.test(version);
}

function checkRemovedInCutover(entry, currentVersion) {
  if (entry.removed_in === undefined) return;
  if (!isSupportedSemver(currentVersion)) {
    throw new Error(
      `compareSemver does not support unsupported version "${currentVersion}" (current). ` +
      `Remove or normalize, or update prerelease/build-metadata semver policy (RFC-2 §8). ` +
      `removed_in check skipped without explicit policy = lifecycle gate gap.`,
    );
  }
  if (!isSupportedSemver(entry.removed_in)) {
    throw new Error(
      `compareSemver does not support unsupported version "${entry.removed_in}" (entry "${entryName(entry)}".removed_in). ` +
      `Remove or normalize, or update prerelease/build-metadata semver policy (RFC-2 §8).`,
    );
  }
  // 양쪽 모두 supported — 정상 비교
  if (compareSemver(currentVersion, entry.removed_in) >= 0) {
    throw new Error(/* removed_at_or_past_cutover */);
  }
}
```

→ unsupported version 발견 시 **build throw + 명확한 error message** (skip 옵션 폐기). 정책 도입은 §8 future RFC.

---

### 4.4 R2-4 slash-only PublicEntry `phase` 결정 (v2 권고 변경)

#### 4.4.1 v1 → v2 권고 변경

v1 권고: 옵션 (a) markdown grouping (의미 부여). 9-lens review consensus blocker #2:

> Markdown grouping is too weak or underspecified to close a declared schema/runtime gap, especially because the current markdown deriver emits per-entry files rather than an aggregate grouping surface.

→ v2 권고 변경 → **schema split (v1 옵션 b 를 v2 에서 권고 채택)**

#### 4.4.2 결정 옵션 (v2)

**(a) [v1 권고, v2 거부] markdown grouping**:
- markdown-deriver 가 phase 별 grouping
- **거부 이유**: markdown-deriver 는 entry 당 별 .md 파일 생성. aggregate grouping surface 부재 — phase 별 section header 는 출력 위치 없음. 옵션 (a) 가 underspecified.

**(b) [v2 권고] schema split — `PublicCliEntry` vs `PublicSlashOnlyEntry`** (v3 정정 — type-level + validator 병행 enforcement):
- `PublicEntry` type 을 두 union variant 로 분리:
  - `PublicCliEntry`: cli realization 보유 (최소 1 CLI realization 보장). `phase` 필수.
  - `PublicSlashOnlyEntry`: slash realization 만 (CLI realization 부재). `phase` field 부재.
- **CLI realization presence enforcement (v3 도입, v5 ontology meaning 명확화)**:
  - **Ontology canonical invariant**: `PublicCliEntry` = "**has at least one CLI realization**" (`realizations.some(r => r.kind === "cli")`). 이 의미가 schema 의 정식 정의 — ordering 무관.
  - **Type-level (1차 tactical 가드)**: `realizations` 의 type 을 tuple 로 — `readonly [CliRealization, ...PublicRealization[]]` (head 는 cli, tail 은 자유). 이는 **tactical TypeScript encoding** — TS 표현력 한계 우회 (TS 의 array `.some()` 검증 은 type-level 표현 불가, 가장 가까운 근사가 tuple 의 head). ontology meaning ≠ "CLI first" — 단순히 array literal 형태에서 한 자리에 CLI 를 강제하여 "최소 1 CLI" 를 type 으로 part-encode.
  - **Validator (2차 canonical 가드)**: 신규 `assertPublicCliEntryHasCliRealization(catalog)` — `kind === "public"` 이고 `"phase" in entry` 인 모든 entry 가 `realizations.some(r => r.kind === "cli")` 인지 검증. **canonical invariant 의 직접 표현**. 위반 시 throw.
  - 두 layer 의 관계: tuple 은 **tactical** (IDE/컴파일에서 catch — array literal 의 head 가 잘못된 kind 면 즉시 type error), validator 는 **canonical** (module load 시 ontology invariant 직접 검증 — tuple 우회 case 도 cover). validator 가 정식 owner; tuple 은 보조 표현 (fast-fail).
- 모든 PublicEntry consumer 가 narrowing 필요:
  - `validateCatalog` (command-catalog-helpers.ts) + `assertPublicCliEntryHasCliRealization` 추가
  - `dispatcher-deriver.ts` (computePhaseMap — 이미 cli realization 만 walk 하므로 narrowing 추가)
  - `markdown-deriver.ts` (phase 미참조 — narrowing 만 필요)
  - `cli-help-deriver.ts` (cli realization 만 cover — narrowing 추가)
- effect: schema 에서 phase 의 의미 = "cli realization 의 routing phase". slash-only 가 phase 갖지 않음 — type + validator 정합. v2 의 under-enforce risk 닫음
- LOC: ~200 (type 분기 + validator + consumer narrowing — v2 대비 +20)

**(c) docs-only marker — status quo + 명시 comment**:
- schema 변경 없음. PublicEntry type comment 에 "slash-only entries 의 phase 는 type uniformity 위함, runtime 영향 없음" 명시
- LOC: ~10
- **약점**: 격차 unresolved (lens 가 "documentation-only and not fully closed" 로 분류)

**(d) real slash-phase consumer 정의**:
- slash-only 의 phase 가 의미 가질 곳 명시 (예: markdown frontmatter, slash-only entries 의 ordering, future preboot slash 의 dispatcher 동작)
- LOC: ~40-100 (consumer 정의에 따라)
- **약점**: 의미 부여가 인위적 — 자연 consumer 없음

**v2 권고**: **(b) schema split**. lens deliberation 결과 — "prefer schema split unless real slash-phase consumer is specified". 현 시점 real consumer 없으므로 schema split 채택.

#### 4.4.3 적용 (옵션 b 가정)

- `src/core-runtime/cli/command-catalog.ts`:
  - 신규 type (v3 — type-level CLI presence enforcement 포함):
    ```ts
    export type PublicCliEntry = Common & {
      kind: "public";
      identity: string;
      phase: "preboot" | "post_boot";
      historical_no_executor?: boolean;  // v3 R2-PR-2 도 추가 — entries 둘 다 PublicCliEntry 에 정의
      contract_ref?: string;
      doc_template_id: string;
      // type-level: 최소 1 CliRealization 보장 (head 가 cli). tail 은 자유 (추가 cli, slash, patterned_slash)
      realizations: readonly [CliRealization, ...PublicRealization[]];
      runtime_scripts?: readonly string[];
      aliases?: readonly string[];
    };
    export type PublicSlashOnlyEntry = Common & {
      kind: "public";
      identity: string;
      contract_ref?: string;
      doc_template_id: string;
      // CLI realization 부재 — slash + patterned_slash 만
      realizations: readonly [SlashRealization | PatternedSlashRealization, ...(SlashRealization | PatternedSlashRealization)[]];
      runtime_scripts?: readonly string[];
    };
    export type PublicEntry = PublicCliEntry | PublicSlashOnlyEntry;
    ```
  - 7 slash-only entry 의 `phase: post_boot` 라인 제거 (feedback, backup, restore, transform, create-domain, onboard, promote-domain)
  - cli realization 보유 entry 는 `PublicCliEntry` 로 type-narrowing (자동 — TS inference). entry 의 array literal 첫 번째가 cli 가 아닌 경우 type error
- `src/core-runtime/cli/command-catalog-helpers.ts`:
  - `validateCatalog` 의 PublicEntry 사용처에서 narrowing — `entry.kind === "public" && "phase" in entry` 또는 별 helper `isCliEntry(entry)` 로 분기
  - 신규 `assertPublicCliEntryHasCliRealization(catalog)` (v3) — type tuple 표현 우회 case (예: array literal 의 head 가 slash 인데 tail 에 cli 있는 경우 type 가 reject 하지만, 변종 표현으로 우회 가능 시) 의 2차 가드
  - `assertEntryRealizationsNonEmpty`, `assertNoAliasCollision`, `assertCliInvocationsLowercase` 등 narrowing 처리
- `scripts/command-catalog-generator/dispatcher-deriver.ts`:
  - `computePhaseMap` 의 `entry.kind === "public"` 후 cli realization 검사가 자연스러운 narrowing — 변경 minimal
- `scripts/command-catalog-generator/markdown-deriver.ts`:
  - phase 미참조 — narrowing 만 (현재도 entry.kind === "public" 분기 후 진행)
- `scripts/command-catalog-generator/cli-help-deriver.ts`:
  - cli realization 만 cover — narrowing 추가
- test:
  - `command-catalog.test.ts`: PublicSlashOnlyEntry 의 phase 부재 type test (또는 invalid catalog mock 으로 type error verify)
  - PublicCliEntry 의 phase 필수 type test

#### 4.4.4 PR scope 와 R2-PR-1 의존성

R2-PR-3 (옵션 b schema split) 와 R2-PR-1 (repair_path 제거) 둘 다 PublicEntry schema 변경 → conflict 회피 위해 **R2-PR-1 머지 후 R2-PR-3 진입** (§5.3).

---

### 4.5 R2-5 `contract_ref` 파일 존재 검증 결정 (v2 정정)

#### 4.5.1 v1 → v2 정정

v1 권고: (a) test + (c) script + (a)+(c) 통합. 9-lens review consensus blocker #3:

> Adding a check step is insufficient unless `.onto/processes/**`, the new script, and related tests/templates trigger the workflow. (...) keep both developer-test and CI entrypoints, but require a single validator owner.

v2 정정 — **shared validator owner + multi-invocation paths + workflow trigger paths**:

#### 4.5.2 Shared validator owner

단일 validator function 이 invariant 를 own. 두 invocation path 가 같은 함수 호출:

- **shared validator** (예: `src/core-runtime/cli/command-catalog-helpers.ts` 의 `assertContractRefsExist(catalog, fsAccessor): void`):
  - catalog 의 PublicEntry 중 contract_ref set 된 것을 walk
  - fsAccessor 로 파일 존재 검사 (testability)
  - violation 발견 시 throw (또는 collect + throw)

- **invocation path 1: vitest test** (`src/core-runtime/cli/command-catalog.test.ts`):
  - `it("contract_ref files exist")` — `assertContractRefsExist(COMMAND_CATALOG, realFsAccessor)` 호출, throw 없으면 pass

- **invocation path 2: standalone CI script** (`scripts/check-contract-refs.ts`):
  - `assertContractRefsExist(COMMAND_CATALOG, realFsAccessor)` 호출
  - throw catch + stderr 출력 + `process.exit(1)`

→ **conciseness C-2 닫음**: 같은 file-existence loop 가 두 곳에 duplicate 되지 않음. 한 함수 owner.

#### 4.5.3 Workflow trigger paths (v3 확장)

v2 review conditional consensus: workflow trigger 가 actual validator owner + test files 도 cover 해야. v3 확장 — CI workflow 가 `check:contract-refs` 를 실행하는 trigger path:

- **catalog SSOT**: `src/core-runtime/cli/command-catalog.ts` (contract_ref 추가/변경)
- **validator owner**: `src/core-runtime/cli/command-catalog-helpers.ts` (`assertContractRefsExist` 의 home)
- **vitest invocation path**: `src/core-runtime/cli/command-catalog.test.ts` (test 코드 자체 변경)
- **standalone script**: `scripts/check-contract-refs.ts` (CI invocation path)
- **script 정의**: `package.json` (npm script 또는 화이트리스트 변경)
- **process 파일**: `.onto/processes/**` (rename/삭제/추가 — contract_ref target)
- **workflow 자체**: `.github/workflows/<exact-workflow-file>.yml` (path filter 또는 step 변경 시 self-trigger)

**workflow seat 명시 (v3)**: PR 진입 시 정확한 workflow file name 결정 — 다음 후보:
- `.github/workflows/determinism-regression.yml` — RFC-1 의 P1-4 workflow (catalog drift gate)
- `.github/workflows/catalog-drift.yml` — 별 workflow (있는 경우)
- 신규 `.github/workflows/contract-refs.yml` — 별 file 분리

→ 권고: **기존 `determinism-regression.yml` 에 step 추가 + path filter 확장**. 신규 workflow file 분리는 CI complexity 증가 — 단일 workflow 안 step 추가가 minimal.

#### 4.5.4 Package-scripts deriver 처리 (E-E3 닫음)

`package.json` 에 `"check:contract-refs": "tsx scripts/check-contract-refs.ts"` 추가 시, package-scripts deriver 가 catalog 와 정합성 검사 가능:

- 현 deriver (`scripts/command-catalog-generator/package-scripts-deriver.ts`) 가 `RuntimeScriptEntry` 만 emit 하는지 확인
- 만약 deriver 가 모든 npm script 를 walk 하면 `check:contract-refs` 가 unmatched script 로 fail
- 결정: (i) `check:contract-refs` 를 RuntimeScriptEntry 로 modeling — catalog 에 등록, deriver 가 emit. 또는 (ii) deriver 의 ALLOWED_NON_CATALOG_SCRIPTS 화이트리스트에 추가 (다른 dev/build script 가 그렇듯)

→ **권고 (ii)**: `check:contract-refs` 는 dev tool — runtime script 와 axis 다름. 현 deriver 의 ALLOWED 패턴 확인 후 동일하게 처리. RuntimeScriptEntry 로 modeling 은 unnecessary (semantic mismatch).

#### 4.5.5 Scope 한정 (S-S4 → §8)

S-S4 unique finding: `contract_ref` validation 이 `contract_ref` field 만 cover. process 파일 reference 가 다른 위치에 hardcoded 시 (예: template 안 ".onto/processes/X.md" 문자열, generated doc 안 link, principle 문서 cross-ref) 미커버.

**v2 결정**: 본 RFC scope 는 `contract_ref` 한정. 다른 process reference 는 broader process-ref validation 의 별 RFC. §8 future scope.

#### 4.5.6 적용

- `src/core-runtime/cli/command-catalog-helpers.ts`:
  - 신규 `assertContractRefsExist(catalog, fsAccessor)` (또는 `validateContractRefs`)
  - `validateCatalog` 안에서는 호출 안 함 (startup overhead 회피 — module load 시 fs.existsSync 회피)
- `scripts/check-contract-refs.ts` 신규:
  ```ts
  import { COMMAND_CATALOG } from "../src/core-runtime/cli/command-catalog.js";
  import { assertContractRefsExist } from "../src/core-runtime/cli/command-catalog-helpers.js";
  import { existsSync } from "node:fs";
  import { resolve } from "node:path";

  try {
    assertContractRefsExist(
      COMMAND_CATALOG,
      (relPath) => existsSync(resolve(process.cwd(), relPath)),
    );
    console.log("[check-contract-refs] all contract_ref(s) verified.");
  } catch (e) {
    console.error(`[check-contract-refs] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  ```
- `package.json` scripts: `"check:contract-refs": "tsx scripts/check-contract-refs.ts"`
- package-scripts deriver: `check:contract-refs` 화이트리스트 추가 (E-E3 처리)
- `.github/workflows/determinism-regression.yml` (workflow seat 권고 §4.5.3):
  - new step: `npm run check:contract-refs`
  - path filter 추가 — **§4.5.3 의 7-path 모두 적용** (SSOT — 본 적용 단계가 §4.5.3 의 항목별 path 를 전부 포함):
    1. `src/core-runtime/cli/command-catalog.ts` (catalog SSOT)
    2. `src/core-runtime/cli/command-catalog-helpers.ts` (validator owner)
    3. `src/core-runtime/cli/command-catalog.test.ts` (vitest invocation path)
    4. `scripts/check-contract-refs.ts` (standalone script)
    5. `package.json` (script 정의)
    6. `.onto/processes/**` (process 파일)
    7. `.github/workflows/determinism-regression.yml` (workflow self-trigger)
- `src/core-runtime/cli/command-catalog.test.ts`:
  - `it("all contract_ref files exist")` test — `assertContractRefsExist(COMMAND_CATALOG, realFs)` 호출
- `src/core-runtime/cli/command-catalog.ts` line 156-157 의 TODO 주석 갱신/제거

---

## 5. Sub-PR ladder (v3 정정)

### 5.1 4 sub-PR 분할

| sub-PR | scope | 권고 옵션 (v3) | LOC | semantic 의존성 | integration 의존성 |
|---|---|---|---|---|---|
| **R2-PR-1** | R2-1 (`repair_path` 제거 + wording cleanup + search gate) | (b) 제거 | ~70 | none | catalog hash bump, schema_version 4 → 5 |
| **R2-PR-2** | R2-2 + R2-3 통합 (deprecation lifecycle policy + executor availability owner + historical_no_executor field) | R2-2 (b) + R2-3 (c) + v3 catalog field | ~200 (v2 +20, executor owner + invariant) | partial — R2-PR-1 (둘 다 PublicEntry/PublicCliEntry schema 편집 — repair_path 제거 ↔ historical_no_executor 추가, 다른 line) | catalog hash bump, schema_version 5 → 6 |
| **R2-PR-3** | R2-4 (schema split — PublicCliEntry vs PublicSlashOnlyEntry + type tuple + assertPublicCliEntryHasCliRealization) | (b) schema split + v3 type-level + validator | ~200 (v2 +20, validator) | **R2-PR-1, R2-PR-2 (PublicEntry/PublicCliEntry schema 영역 동일)** | catalog hash bump, schema_version 6 → 7 |
| **R2-PR-4** | R2-5 (contract_ref shared validator + multi-path + workflow trigger expansion + package-scripts whitelist) | shared validator + 7 path filter | ~120 | none | none (script 추가 + workflow 변경, catalog 미변경) |

### 5.2 Semantic vs Integration independence (v2 신규)

9-lens review consensus blocker #4:

> Parallel branch work may be possible, but merge/rebase must be serially revalidated across catalog-derived outputs, markdown output/schema/hash seats, package-script derivation, and workflow path filters.

**Semantic independence**: 두 PR 의 코드 변경이 같은 line 또는 같은 function 을 touch 하지 않음 → conflict-free git merge 가능
**Integration independence**: 두 PR 머지 후 통합 산출물 (catalog hash, derived markdown, dispatcher schema_version, workflow path filter, package-scripts deriver 출력) 이 정합

| pair | semantic 독립? | integration 독립? | 처리 |
|---|---|---|---|
| R2-PR-1 ↔ R2-PR-2 | **partial** — 둘 다 PublicEntry/PublicCliEntry schema 편집 (repair_path 제거 ↔ historical_no_executor 추가), 다른 line 이라 git merge 자동 가능하지만 semantic 영역 동일 | no (catalog hash 둘 다 bump) | 병렬 coding OK / 머지 직렬 |
| R2-PR-1 ↔ R2-PR-3 | **no** (PublicEntry schema 둘 다 변경) | no (catalog hash 둘 다 bump, type 분기 영향) | R2-PR-1 머지 후 R2-PR-3 rebase + 진입 |
| R2-PR-1 ↔ R2-PR-4 | yes | yes (R2-PR-4 catalog 미변경) | 완전 병렬 |
| R2-PR-2 ↔ R2-PR-3 | **partial** (R2-PR-2 의 `historical_no_executor` field 가 R2-PR-3 의 PublicCliEntry 분기로 이동 — 같은 type 영역) | no (catalog hash 둘 다 bump, type 영역 동일) | 병렬 coding OK / **머지 직렬 필수 (R2-PR-2 → R2-PR-3 rebase + field PublicCliEntry 로 이동)** |
| R2-PR-2 ↔ R2-PR-4 | yes | yes | 완전 병렬 |
| R2-PR-3 ↔ R2-PR-4 | yes | yes | 완전 병렬 |

### 5.3 Catalog hash bump 직렬

R2-PR-1, R2-PR-2, R2-PR-3 가 catalog 변경 → catalog hash bump 발생. RFC-1 P2-A/B/C 의 schema_version trail (1 → 2 → 3 → 4) 답습:
- R2-PR-1 머지 → catalog 변경 (PublicEntry 에서 repair_path 제거), schema_version 4 → 5
- R2-PR-2 머지 → catalog 변경 (PublicCliEntry/PublicEntry 에 historical_no_executor field 추가, build entry 에 historical_no_executor: true 추가), schema_version 5 → 6
- R2-PR-3 머지 → schema 분기 (PublicEntry → PublicCliEntry + PublicSlashOnlyEntry), 7 slash-only entry phase 제거, schema_version 6 → 7
- R2-PR-4 머지 → catalog 미변경 (script + workflow 만), schema_version 영향 없음

직렬 머지 순서: **R2-PR-1 → R2-PR-2 → R2-PR-3** (R2-PR-2 가 historical_no_executor field 추가, R2-PR-3 가 PublicEntry → schema split 로 type 자체 변경 — R2-PR-2 의 field 가 PublicCliEntry 로 이동됨). R2-PR-4 는 시점 무관.

### 5.3.1 Artifact Impact Table (v3 신규)

각 sub-PR 의 6 artifact dimension 영향:

| sub-PR | catalog entries 변경 | derived outputs 변경 | schema_version | catalog hash | required ladder order | baseline profile |
|---|---|---|---|---|---|---|
| R2-PR-1 | yes (config/install repair_path 제거 + PublicEntry type field 제거) | dispatcher.ts (재emit), preboot-dispatch.ts (변경 없음 — alias 영역), markdown (재emit, repair_path 표현 제거), cli-help (재emit), package-scripts (변경 없음) | 4 → 5 | bump | 1번 (선두) | §5.4 step 1-6 |
| R2-PR-2 | yes (historical_no_executor field 추가 + build 에 적용) | dispatcher.ts (lifecycle policy 분기 추가), preboot-dispatch.ts (변경 없음 — preboot publics 는 deprecated 없음), markdown (변경 가능 — deprecation 표현), cli-help (재emit, historical_no_executor 영향) | 5 → 6 | bump | 2번 | §5.4 step 1-6 |
| R2-PR-3 | yes (PublicEntry → PublicCliEntry + PublicSlashOnlyEntry 분기, 7 slash-only phase 제거, type tuple) | dispatcher.ts (narrowing), preboot-dispatch.ts (narrowing), markdown (narrowing), cli-help (narrowing), package-scripts (narrowing) | 6 → 7 | bump | 3번 | §5.4 step 1-6 |
| R2-PR-4 | no (catalog 자체 변경 없음) | derived outputs 변경 없음. 신규 script + workflow file 변경만 | 영향 없음 | 영향 없음 | 시점 무관 | §5.4 step 1-7 (step 7 = check:contract-refs 신규) |

**해석**:
- R2-PR-1, 2, 3 의 ladder order 는 catalog hash 직렬 + schema 변경 영역 동일 (PublicEntry/PublicCliEntry) 으로 인한 강제. 각 PR 의 다음 PR 머지 직전 rebase + regenerate
- R2-PR-2 → R2-PR-3 의 명시적 integration dependency: R2-PR-2 의 `historical_no_executor` field 가 R2-PR-3 의 schema split 후 `PublicCliEntry` 안으로 자동 이동 (PublicSlashOnlyEntry 는 cli realization 부재 → historical_no_executor 의미 없음). R2-PR-3 의 `PublicCliEntry` type 정의에 historical_no_executor 포함.
- R2-PR-4 는 모든 dimension 에서 독립

### 5.4 Per-PR baseline check (병렬 진입 시 강제)

각 PR 머지 직전 (또는 머지 후 즉시) 다음 baseline 재실행:
1. `git rebase origin/main` (다른 PR 가 머지된 경우)
2. `npm run generate:catalog` (catalog 변경 PR 인 경우)
3. `npm run check:ts-core` — TS 컴파일
4. `npm run check:catalog-drift` — 5 derive sync
5. `npm run check:handler-exports` — 15 handler reference 유효
6. `npx vitest run scripts/command-catalog-generator/ src/core-runtime/cli/`
7. (R2-PR-4 머지 후) `npm run check:contract-refs` — 14 contract_ref 유효

---

## 6. Test strategy

### 6.1 PR-별 test 추가/제거

**R2-PR-1**:
- `command-catalog.test.ts` 의 repair_path 관련 3 test 제거 (94, 403, 426)
- type-level: `PublicEntry` 에 `repair_path` field 부재 — TS 정의가 single source
- search gate test: `it("no repair_path|repair-path|Repair-path wording outside development-records")` — `git grep` 호출 또는 inline grep

**R2-PR-2** (v3 — targeted tests 추가):
- lifecycle policy state 별 test:
  - `getEntryLifecycleState(entry, version, executorAvailability)` 의 4 state 분기 — input 조합 매트릭스 (deprecated_since × removed_in × executorAvailability × current version)
  - 각 state 별 dispatcher entry 진입 시 stderr snapshot
- `getCliExecutorAvailability(entry)` test:
  - `historical_no_executor: true` entry → "intentionally_absent"
  - `historical_no_executor: false` 또는 미설정 → "present"
- `assertDeprecationLifecycle` 의 mock catalog × current version > removed_in throw test
- **all-kind build-time removal test (v4 신규, COV-F3 닫음)**: mock catalog × `RuntimeScriptEntry` 의 `removed_in <= currentVersion` → throw. mock × `MetaEntry` 의 `removed_in <= currentVersion` → throw. PublicEntry 외 entry kind 도 build-time enforcement 적용 verify
- `assertHistoricalNoExecutorBidirectional` test (v4 강화) — 4 조건 양방향:
  1. `historical_no_executor: true` 가 slash-only entry 에 set → throw
  2. `historical_no_executor: true` 가 non-deprecated entry 에 set → throw
  3. `historical_no_executor: true` + cli.ts case 존재 (non-placeholder body) → throw (정합 owner 위반)
  4. `historical_no_executor: false/미설정` + cli realization 보유 + cli.ts case 부재 또는 cli.ts case 본문이 placeholder error → throw (orphan executor 또는 placeholder body)
- transient PR-2 invariant test: broad PublicEntry (R2-PR-3 schema split 전) 에서 cli realization 부재 entry 에 historical_no_executor: true set → throw
- **fail-closed prerelease test (v3 신규)**:
  - mock catalog × current version "0.3.0-rc.1" → throw with explicit unsupported semver message
  - mock catalog × removed_in "0.3.0-beta" → throw
- `bin/onto build` 의 종결 동작 verify (deprecated_historical_no_executor → exit 1 + notice with successor)
- `bin/onto migrate-session-roots` 의 종결 동작 verify (deprecated_with_executor → notice + executor 실행)
- `bin/onto learn`/`ask` 의 unknown reject (현 default case 동작 — 변경 없음 verify)

**R2-PR-3** (v3 — targeted tests 추가):
- `command-catalog.test.ts`:
  - PublicSlashOnlyEntry 의 phase 부재 type test (mock entry 에 phase 추가 시 type error verify)
  - PublicCliEntry 의 phase 필수 type test (phase 없는 mock 에서 type error)
  - **type tuple test (v3 신규)**: realizations array literal 의 head 가 cli realization 이 아니면 type error
  - **`assertPublicCliEntryHasCliRealization` validator test (v3 신규)**: type tuple 우회 case 의 2차 가드 — mock catalog × PublicCliEntry without cli realization → throw
- 7 slash-only entry 의 phase 제거 후 catalog validate pass

**R2-PR-4** (v3 — targeted tests 추가):
- `command-catalog.test.ts`: `it("all contract_ref files exist")` — `assertContractRefsExist` 호출
- `assertContractRefsExist` 단위 test:
  - mock catalog × broken contract_ref → throw
  - mock catalog × valid contract_ref → no throw
  - **mock fsAccessor 통한 testability** — fs 의 mocking 으로 테스트 isolation
- `scripts/check-contract-refs.ts` smoke test (CI 에서 standalone)
- **workflow trigger coverage test (v3 신규)**: workflow file (`.github/workflows/determinism-regression.yml`) 의 path filter 가 §4.5.3 의 7 path 모두 cover 검증 — yaml parse + path 비교

### 6.2 Baseline regression

§5.4 의 7 step (R2-PR-4 머지 후 +1) baseline 모두 green 유지.

---

## 7. Risk

### 7.1 PR-별 risk

| PR | risk | mitigation |
|---|---|---|
| R2-PR-1 | external user 가 `repair_path` 를 schema 의 forward-looking promise 로 인식·의존 가능성 | catalog schema 가 internal-only (외부 import 없음). RFC-1 closure 직후라 user 가 catalog 재학습 중 — cleanup window. 향후 recovery routing 도입 시 explicit marker 재도입 명시 (§8) |
| R2-PR-1 | wording cleanup 누락 시 silent contradiction (schema 제거인데 docs 잔존) | search gate test (§4.1.4) 가 PR 진입 차단 |
| R2-PR-2 | lifecycle policy 의 state 결정 로직이 entry kind 별 차이 — bug 가능 | state 결정 helper (`getEntryLifecycleState`) 가 isolated function, unit test 로 cover |
| R2-PR-2 | `bin/onto build` 의 동작 변경 (현재: "not yet implemented" + exit 1, v2 후: "deprecated since 0.2.0" + exit 1) — user-facing message 변화 | 의도된 동작 (consensus blocker #1 closure). exit code 동일 (1) 이라 script breakage 없음 |
| R2-PR-2 | build-time version check 가 release 전 catalog cleanup 잊으면 release 차단 | 의도된 동작. release checklist 에 명시 + check error message 가 cleanup 안내 포함 |
| R2-PR-3 | schema 분기 — PublicEntry consumer 광범위 narrowing 필요 | TS strict mode 가 narrowing 누락 발견. consumer 마다 unit test |
| R2-PR-3 | R2-PR-1 머지 직후 rebase — catalog entries (config, install) 의 repair_path 제거가 PublicCliEntry 분기 narrowing 와 동일 영역 | rebase 시 conflict 가능 — 직렬 머지로 회피 |
| R2-PR-4 | future broken contract_ref 가 PR 진입 시 즉시 fail (기대 동작) | 의도. CI gate fail 시 명확한 error message 로 fix 안내 |
| R2-PR-4 | workflow path filter 가 catalog 외 변경 (예: `.onto/processes/X.md` rename) 도 trigger — CI run 빈도 증가 | 의도. 현 빈도 baseline 대비 minor (process 파일 변경 빈도 낮음) |

### 7.2 Cross-cutting risk

- **catalog hash bump 직렬**: R2-PR-1 → R2-PR-2 → R2-PR-3 순서 강제 (§5.3)
- **integration vs semantic independence**: §5.2 의 pair 별 처리. 머지 직전 baseline check 7 step 강제 (§5.4)
- **prerelease semver semantics**: 본 RFC 가 dotted-integer 만 cover. prerelease (`0.3.0-rc.1`) 가 catalog version 으로 등장 시 `compareSemver` 가 **fail-closed throw** (§4.3 — skip 옵션 부재). prerelease 자체의 정책 (semver 채택, npm tag 등) 은 §8 future
- **non-PublicEntry lifecycle**: RuntimeScriptEntry / MetaEntry 의 `removed_in` runtime 처리 부재 (§8 future)

---

## 8. Out of scope (v2 확장)

본 RFC 의 closure 외 항목 (future RFC / future seam):

- **Failure detection + recovery routing** (R2-1 옵션 a 가 trigger 시) — 별 RFC. R2-1 의 `repair_path` 제거가 recovery intent marker 손실 → future recovery routing 도입 시 explicit marker (예: `bootstrap_resilient: true` 또는 별 entry kind) 재도입 + dispatcher 의 fallback help 출력
- **Slash-phase consumer 정의** (R2-4 옵션 d 가 trigger 시) — 별 RFC. slash-only entry 의 phase 가 의미 갖는 consumer 정의 (markdown frontmatter, ordering, future preboot slash 등)
- **Non-CLI lifecycle enforcement** (COV-2 잔여) — `Common.removed_in` 이 RuntimeScriptEntry / MetaEntry 에 set 시 runtime 처리. 본 RFC 는 PublicEntry 한정
- **Prerelease/release-channel semver semantics** (E-E6) — `compareSemver` 의 prerelease 지원 + npm tag 와 catalog version 의 정합 정책. release management 의 별 axis
- **Process-ref validation 일반화** (S-S4) — `contract_ref` 외 process ref (template hardcoded, generated doc cross-ref, principle 문서 link) 의 broader validation. 본 RFC 는 `contract_ref` 한정
- **Deprecated entry 의 cli help 노출 정책** — 현 cli-help-deriver 가 deprecated 를 surface (DEPRECATED prefix). `--all` flag 로 hidden 옵션 도입 여부는 별 검토
- **Post_boot per-entry handler diversification** — RFC-1 §11 future seam (그대로 유지)
- **PublicEntry 의 multi-cli + alias 모호성** — RFC-1 §11 future seam (그대로 유지)

---

## 9. 한눈 정리 + 권고 옵션

### 9.1 v2 권고 옵션 요약

| # | 항목 | v1 권고 | v2 권고 (review 반영) |
|---|---|---|---|
| R2-1 | `repair_path` | (b) 제거 — preboot alias 표현 | (b) 제거 + wording cleanup + future marker 재도입 명시. rationale = "no independent runtime consumer today" (preboot subset relationship 인정) |
| R2-2 | cli.ts placeholder | (b) 제거 + R2-3 통합 | **R2-2 + R2-3 통합 = lifecycle policy table** (deprecated_with_executor / deprecated_historical_no_executor / removed_at_or_past_cutover) |
| R2-3 | `removed_in` enforcement | (c) build-time throw + runtime notice | 변경 없음 (lifecycle policy 안에 통합). prerelease semver → §8 |
| R2-4 | slash-only `phase` | (a) markdown grouping | **(b) schema split — PublicCliEntry vs PublicSlashOnlyEntry** (consensus blocker #2 닫음) |
| R2-5 | `contract_ref` validation | (a)+(c) test + script + CI gate | **shared validator owner + workflow path triggers + package-scripts deriver 화이트리스트** (consensus blocker #3 닫음). non-contract_ref process refs → §8 |

### 9.2 9-lens review 반영 status

**v1 → v2 closure** (직전 review 반영):

| consensus blocker | v2 closure |
|---|---|
| #1 R2-2/R2-3 build 단일 동작 정의 | §4.2.1 lifecycle policy table + §4.2.2 build = deprecated_historical_no_executor |
| #2 R2-4 옵션 (a) 거부 | §4.4 권고 변경 → schema split (b) |
| #3 R2-5 single validator + workflow trigger | §4.5.2 shared validator + §4.5.3 trigger paths |
| #4 sub-PR ladder integration coupling | §5.2 semantic vs integration independence + §5.4 baseline check 강제 |
| #5 A/B/C/D taxonomy 정정 | §2.1 D = legacy CLI cleanup, B = build-time 형식 검증만 |

**v2 → v3 closure** (v3 신규 — 9-lens v2 review session `20260427-8d6f1af3`):

| consensus blocker / decision | v3 closure |
|---|---|
| #1 v2 PublicCliEntry CLI realization under-enforce | §4.4.3 type tuple `[CliRealization, ...PublicRealization[]]` + `assertPublicCliEntryHasCliRealization` validator (병행) |
| #2 v2 prerelease "throw or skip" 거부 → fail-closed | §4.3 — `isSupportedSemver` + 명확한 throw message. skip 옵션 폐기 |
| Decision: lifecycle executor availability owner | §4.2.1 — `getEntryLifecycleState(entry, version, executorAvailability)` signature + 신규 catalog field `historical_no_executor` 가 owner |
| Decision: broken handler ref = build-time fail | §4.2.5 신규 — RFC-1 Layer 0 (`check-handler-exports.ts`) 가 처리. `historical_no_executor` 와 broken ref 는 다른 layer |
| Decision: sub-PR artifact-impact table | §5.3.1 신규 — 6 dimension 매트릭스. R2-PR-2 → R2-PR-3 명시적 integration dependency |
| Decision: D = adjacent (not peer) | §2.1 — D 를 "adjacent legacy CLI cleanup item" 으로 narrow. C-F1 닫음 |
| Conditional: R2-5 trigger expand | §4.5.3 — 7 path filter (catalog/validator/test/script/process/package/workflow) |

| v2 unique finding | v3 closure |
|---|---|
| P-F4 search gate exclusion | §4.1.4 — exclusion list 명시 (dist/, .onto/commands/, src/cli.ts, .git/) |
| Logic boundary limitation | (수용 — boundary 제약은 보통 review 환경의 한계) |

**v3 → v4 closure** (v4 신규 — 9-lens v3 review session `20260427-540d79f3`):

| consensus blocker / decision | v4 closure |
|---|---|
| Decision: broken_handler_ref residual contradiction | §4.2.1 — ExecutorAvailability 에서 `broken_handler_ref` 제거, "intentionally_absent" 로 명명. lifecycle table row 에서 "handler_module reference 가 깨짐" 표현 제거 |
| Decision: assertHistoricalNoExecutor → bidirectional | §4.2.3 — `assertHistoricalNoExecutorBidirectional` 4 조건 양방향 검증 + transient PR-2 invariant |
| Decision: §4.5.6 ↔ §4.5.3 trigger sync | §4.5.6 — §4.5.3 의 7-path 모두 적용 (SSOT) |
| Decision: §7.2 prerelease "throw or skip" 제거 | §7.2 — "fail-closed throw" 단일 표현 |
| Decision: D taxonomy 분리 | §2.1 — A/B/C 표 와 R2-2 adjacent paragraph 분리 |
| Decision: §5.1 R2-PR-2 의존성 정합 | §5.1 + §5.2 — "partial (PublicEntry schema 영역 동일)" 통일 |

| v3 unique finding | v4 closure |
|---|---|
| S-F3 R2-PR-2 dependency contradiction | §5.1 + §5.2 정합 |
| D-F3 transient broad PublicEntry field seat | §4.2.3 transient PR-2 invariant — historical_no_executor 가 cli realization 보유 entry 만 |
| S-F4 historical_no_executor 명명 boundary | §4.2.1 정의 sentence — "deprecated PublicCliEntry retained for historical/informational compatibility with intentionally absent executor dispatch" |
| COV-F3 all-kind removed_in tests | §6 R2-PR-2 — RuntimeScriptEntry/MetaEntry build-time throw test 추가 |
| C-C1 D over-modeled as 4th peer | §2.1 표 분리 (Decision 위 row 와 동일) |

**v4 → v5 closure** (v5 신규 — 9-lens v4 review session `20260427-72805472`):

| consensus blocker / decision | v5 closure |
|---|---|
| Primary blocker: §6.1 stale `placeholder_only` literal | §6.1 — "intentionally_absent" 로 정정 (단순 rename gap) |
| Conditional #1: assertHistoricalNoExecutorBidirectional scope | §4.2.3 — invariant scope = static catalog↔cli-case consistency 한정. lifecycle interception (dispatcher pre-delegation ordering) = 별 dispatcher behavior test 명시 분리 |
| Conditional #2: PublicCliEntry tuple ordering 의미 | §4.4 — tuple = **tactical TypeScript encoding** (TS 표현력 한계 우회). ontology canonical invariant = "has at least one CLI realization" (`assertPublicCliEntryHasCliRealization` validator). validator 가 정식 owner |

| v4 unique finding | v5 closure |
|---|---|
| S-F2 ExecutorAvailability.present 의미 boundary | §4.2.1 — "invocation-level non-placeholder dispatch availability" 명시. handler_module + export 존재만 으로는 insufficient (Layer 0 prerequisite) |

(v5 의 S-F3 + CON-F2 tuple head encoding 은 Conditional Consensus #2 와 동일 항목 — 별 row 중복 제거, tuple-head dual-entry accounting 닫음)

**v5 → v6 closure** (v6 신규 — 9-lens v5 narrow verification session `20260427-691a6620`):

| residual defect | v6 closure |
|---|---|
| §4.2.1 "전제 조건" runtime interception bundled | §4.2.1 — (A) Static catalog↔cli-case invariant / (B) Runtime dispatcher behavior requirement / (C) Broken handler refs 3 group 분리 |
| lifecycle table `deprecated_with_executor` 의 handler_module + export alternate route | row 정정 — `ExecutorAvailability.present` (invocation-level non-placeholder dispatch). handler_module + export 는 Layer 0 prerequisite note 로만 |
| §9.2 tuple-head dual-entry accounting | v4 unique finding row 제거 — Conditional Consensus #2 가 단일 closure seat. **identifier 정정 (v7)**: COV-F3 는 v3 의 all-kind removed_in tests canonical identifier 만 보존 — tuple-head 항목은 별 label "tuple-head dual-entry accounting" |

**v6 → v7 closure** (v7 신규 — 9-lens v6 narrow verification session `20260427-c0e1a69c`):

| residual defect | v7 closure |
|---|---|
| Non-placeholder body propagation (§4.2.3 condition 4 + §6.1 test) | §4.2.1 (A) + §4.2.3 condition 4 + §6.1 test 모두 "non-placeholder executor body" 명시. `cliCases` 입력 정의 = "non-placeholder executor cases only" — placeholder case 는 input 에 미포함 |
| §9.2 COV-F3 identifier reuse | v6 closure row 의 label 변경 — "tuple-head dual-entry accounting" 별 identifier. COV-F3 는 v3 all-kind removed_in tests canonical 만 보존 |

**v7 → v8 closure** (v8 신규 — 9-lens v7 focused verification session `20260427-4f8dd52f`, **design-idempotent reached**):

| residual defect | v8 closure |
|---|---|
| §9.2 line 823 stale `COV-F3 닫음` parenthetical (1-line wording) | line 823 의 closing parenthetical 을 "tuple-head dual-entry accounting 닫음" 으로 정정. lens 권고대로 단일 line cleanup. lens 명시: 이 fix 후 design-idempotent 도달 |

### 9.3 다음 단계 — design-idempotent reached

본 v8 = lens 명시 design-idempotent 도달 ("After the one-line §9.2 cleanup, treat RFC-2 v7 as design-idempotent for this focused scope" — v8 가 그 cleanup 적용). 이전 7 review iteration (v1 v1, v2 v2, v3 v3, v4 v4, v5 v5, v6 narrow verification, v7 focused verification) 의 issue 규모 수렴 패턴:
- v1: 5 consensus + 7 unique finding (large structural)
- v2: 2 consensus + 5 unique (medium structural)
- v3: 6 immediate actions (wording consistency)
- v4: 1 primary + 2 conditional + 1 unique (narrow)
- v5: 3 residual defects (narrow)
- v6: 2 narrow residual
- v7: 1 line cleanup
- v8: idempotent

다음:
1. **R2-PR-1 진입** — sub-PR ladder (§5.1) 의 직렬 / 병렬 패턴 따라 4 sub-PR 처리. 직렬: R2-PR-1 → R2-PR-2 → R2-PR-3 (catalog hash bump 직렬 + PublicEntry/PublicCliEntry schema 영역 동일). 병렬: R2-PR-4 (시점 무관)
2. (선택) v8 final verification — lens 가 권고하지 않은 추가 review pass. RFC-1 v9 가 last iteration 후 sub-PR ladder 진입한 것과 같은 pattern (additional verification 없이 진입 가능)

권고 변경 시:
- R2-1 옵션 (a) 채택 → 별 RFC (failure detection mechanism 신규)
- R2-4 옵션 (c) docs-only 또는 (d) real consumer → §4.4.2 의 옵션 비용 비교 후 결정
- R2-5 single-path (CI script 만 또는 vitest 만) → §4.5.2 shared validator 유지 가능 (invocation path 1개로 축소)
- R2-2 의 `historical_no_executor` field 도입 거부 → 별 detection mechanism (catalog 외부 manifest 또는 cli.ts 정적 분석) 필요 — semantic 동일하나 owner 위치 다름
