# P2 RFC-1 Closure — Session Resume Handoff

> **For**: next session (post `/clear`) resuming P2 work after RFC-1 ladder full closure
> **Created**: 2026-04-27
> **Goal**: 다음 stage (RFC-2 / RFC-3 / future seam / 다른 axis) 즉시 결정 가능 + 첫 작업 진입

---

## 1. 현재 상태 (merged on `main`)

```
4c61095 feat(catalog): P2-C — multi-CLI computePhaseMap iteration + collision throw (#231)
bb17aa2 feat(catalog): P2-B — aliases NORMALIZED projection + canonical lookup (#230)
9e11d74 feat(catalog): P2-A — cli_dispatch + MetaEntry routing closure (#229)
0f14153 docs(p2-rfc-1): Catalog → Runtime Projection Closure design (v9) (#228)
92225da feat(catalog): P1-4 — CI drift workflow + check-catalog-drift script (#224)
fb8e35a feat(catalog): P1-3 — bin/onto integration + preboot-dispatch + catalog → runtime authority (#223)
```

병렬로 머지된 track-b 작업: `8358992` (PR-α #225), `b62cbd1` (PR-β #226). 별 axis — catalog SSOT 와 무관.

**Working tree**: dist/ 에 untracked/modified 빌드 잔여물 있음 (build:ts-core 실행 결과). 안전하게 discard 가능 — `git checkout dist/` + `git clean -fd dist/`. 다음 세션 시 prepare 가 자동 rebuild.

**Local main = origin/main = `4c61095`**.

---

## 2. P2 RFC-1 closure 종합

### 2.1 sub-PR ladder 완전 마감

| sub-PR | scope | merge |
|---|---|---|
| **RFC-1 design v9** | 9 iteration (multi-agent + onto review codex nested 7회) → architecturally idempotent | #228 |
| **P2-A** cli_dispatch + meta routing | P2-1, 2, 3, 7. 신규 dispatch-preboot-core.ts + meta-handlers.ts + check-handler-exports.ts canonical gate | #229 |
| **P2-B** aliases NORMALIZED projection | P2-4. schema 이전 (Common→PublicEntry) + DispatchTarget 의 canonical_cli_invocation type-level invariant + canonical lookup | #230 |
| **P2-C** multi-CLI computePhaseMap | P2-5. computePhaseMap 모든 cli iteration + collision throw | #231 |

### 2.2 closure 범위 — RFC-1 의 6 항목

| # | declared model | runtime now |
|---|---|---|
| P2-1 | `CliRealization.cli_dispatch.handler_module` / `handler_export` (preboot publics + meta) | dispatchPrebootCore + dynamic import per target |
| P2-2 | `MetaEntry.cli_dispatch` + long_flag/short_flag realizations | catalog-driven static META_DISPATCH_TABLE |
| P2-3 | `BARE_ONTO_SENTINEL` 분기 + bare/default routing | dead code 제거, NORMALIZED honors default_for |
| P2-4 | `Common.aliases?` + NORMALIZED projection | PublicEntry 전용 + canonical_cli_invocation 매핑 |
| P2-5 | 다수 `CliRealization` per entry | computePhaseMap 모든 iteration + collision throw |
| P2-7 | `MetaEntry.default_for: "bare_onto"` chosen meta identity | dispatcher 가 `{ meta_name: target.name }` forward |

### 2.3 schema_version trail (dispatcher target)

- P1-3 baseline: `1`
- P2-A: `1 → 2`
- P2-B: `2 → 3`
- P2-C: `3 → 4` (current)

preboot-dispatch target: P2-A 가 `1 → 2`, 그 후 unchanged (canonical lookup 은 dispatcher 안에서 — preboot-dispatch 는 항상 canonical 수신).

### 2.4 핵심 architectural 산출물

**production seat (single authority)**:
- `dispatcher.ts` (catalog-derived) — NORMALIZED 통한 routing + canonical lookup
- `preboot-dispatch.ts` (catalog-derived thin shim) — static META_DISPATCH_TABLE + PUBLIC_DISPATCH_TABLE 으로 dispatchPrebootCore 호출

**underlying logic seat**:
- `dispatch-preboot-core.ts` (hand-written, catalog-independent) — Contract A/B/C 본체
- `meta-handlers.ts` (hand-written) — onHelp / onVersion

**defense stack hierarchy**:
- Layer 0 canonical gate: `scripts/check-handler-exports.ts` + CI (determinism-regression workflow)
- Layer 1 defense-in-depth: `dispatch-preboot-core.test.ts` bogus tables negative
- Layer 2 defense-in-depth: dispatchPrebootCore 의 typeof guard

**Three normative contracts**:
- Contract A — argv shape (routing-aware)
- Contract B — handler_export discovery
- Contract C — BARE_ONTO_SENTINEL non-leak

---

## 3. 다음 stage 옵션

### Option 1: RFC-2 stub 작성 (declared-but-unimplemented closure)

**정의**: schema 에 declared 됐지만 runtime 에 구현 없는 항목 — 구현 OR schema 제거 결정.

**구체 항목 (5개)**:

| # | 항목 | 결정 옵션 |
|---|---|---|
| P2-6 | `config`/`install` 의 `repair_path: true` declared, runtime 별도 recovery path 미구현 | (a) 구현 OR (b) schema 에서 `repair_path` 제거 |
| P2-9 | cli.ts main 의 `case "learn"`, `case "ask"` placeholder error, catalog 미등록 | (a) deprecated PublicEntry 등록 OR (b) cli.ts 코드 제거 |
| 추가 | `Common.removed_in` runtime enforcement 부재 — `removed_in: "0.3.0"` 도달 entry 도 호출 가능 | runtime 거부 invariant 추가 |
| 추가 | slash-only PublicEntry 의 `phase` 필드 decorative — dispatcher 미사용 | (a) invariant 강화 OR (b) schema 에서 phase 제거 |
| 추가 | `PublicEntry.contract_ref` 파일 존재 검증 부재 | build-time check 추가 |

**LOC 추정**: design doc ~200-400 lines + 후속 5 sub-PR (각 0.5-1 day).

**Risk**: 낮음 — 각 item isolated, P1/P2 와 무관.

### Option 2: RFC-3 stub 작성 (production surface hardening)

**정의**: production path 의 boundary contract + visibility + test coverage 강화.

**구체 항목 (3개)**:

| # | 항목 | 결정 |
|---|---|---|
| P2-8 | bin/onto 가 `--global` flag delegation bypass 인식, ONTO_HELP_TEXT 에 미노출 — user-facing path 불명확 | help text 에 추가 (cli-help-deriver 갱신) + 동작 spec 명시 |
| P2-10 | `RuntimeScriptEntry.args: string[]` 의 shell-safety contract 부재 | (a) contract 명시 (validateCatalog shell-safe 토큰 검증) OR (b) structured argv 모델 |
| P2-11 | dispatcher-smoke.test.ts dev tsx 만 cover (P2-A 가 light prod-smoke 추가) — full matrix 미커버 | matrix smoke 추가: dist build × delegation/no-delegation × global/local install |

**LOC 추정**: design doc ~150-300 lines + 후속 3 sub-PR.

**Risk**: 낮음 — production hardening, 기존 API 변경 minimal.

### Option 3: future seam 진입 (RFC-1 §11 의 6 항목)

| seam | trigger | 영향 |
|---|---|---|
| post_boot per-entry handler diversification | post_boot PublicEntry 의 handler_module 이 cli.ts 외 dedicated module 로 분기 | dispatcher 가 cli.ts main 일괄 위임 대신 catalog handler_module 직접 dynamic import |
| ONTO_HELP_TEXT cli.ts 외부 추출 | cli-help-deriver 의 emission_path 변경 | meta-handlers.ts 가 cli.ts 미로드 — full preboot authority isolation |
| cli.ts dual authority 일원화 | cli.ts main switch 의 `--help`/`--version` case 본문이 meta-handlers.ts 호출로 단일화 | 의미 중복 해소 (위 ONTO_HELP_TEXT 추출이 prerequisite) |
| multi-cli entry 의 명시적 canonical | 다수 CliRealization + alias entry 도입 시 array 순서 의존 회피 | catalog schema 에 canonical field 추가 — P2-B 의 build-time throw 해제 |
| handler_module future location rule | handler_module 이 `src/` 외부 (예: `node_modules/<plugin>/handler.ts`) | resolveHandlerModule 매핑 룰을 catalog schema 에서 explicit |
| schema-runtime invariant 일반화 | `Common.aliases` 외의 다른 entry-kind-specific field 의 schema seat alignment | validateCatalog 가 schema seat ↔ entry kind match 강제 |

### Option 4: 다른 axis

- **Phase 2 Translation** (`development-records/evolve/20260417-phase-2-translation-design-sketch.md`) — sketch 단계, trigger 미도달
- **Phase 4 (track-b)** — 진행 중 (Phase 3 PR-α #225 + PR-β #226 머지됨, 다음 wave)

---

## 4. 권고 sequence

| sequence | 추천 시점 |
|---|---|
| **Sequence A**: RFC-2 → RFC-3 → future seams | RFC family 완전 마감 우선. design 부담 있지만 P2 항목 모두 정합 |
| **Sequence B**: RFC-3 (작음) → P2-A scale RFC-2 → future seam | production hygiene 우선. 큰 RFC 시작 전 작은 RFC 로 momentum |
| **Sequence C**: RFC-2 만 → 결정 후 implementation → 그 후 RFC-3 | declared-but-unimplemented 가 가장 시급 (silent dead promise). RFC-2 implementation 5 sub-PR 후 RFC-3 |
| **Sequence D**: future seam 직진 (예: ONTO_HELP_TEXT 추출) | RFC family 작성 비용 회피, 직접 implementation 가능한 작은 항목 우선 |

내 권고: **Sequence A** — RFC family 완전 마감이 P2 의 자연 종결. RFC-2, RFC-3 는 RFC-1 처럼 9 iteration 가지 않을 가능성 높음 (작은 scope).

---

## 5. 첫 작업 시작 명령 (suggested)

```bash
# 1. 현 상태 확인
git status -sb
git log --oneline -8

# 2. 빌드 잔여물 정리 (안전)
git checkout dist/
git clean -fd dist/

# 3. baseline test
npm run check:ts-core
npm run check:catalog-drift
npm run check:handler-exports
npx vitest run scripts/command-catalog-generator/ src/core-runtime/cli/

# 4. 다음 stage 의 design doc 진입
# (예: RFC-2 시작 시)
cat development-records/evolve/20260427-catalog-runtime-projection-closure.md  # RFC-1 reference
# 신규 작성: development-records/evolve/20260427-declared-but-unimplemented-closure.md (RFC-2)

# 또는 Phase 4 작업이 우선이면:
cat development-records/handoff/20260425-phase-4-resume.md  # 만일 존재
git log --oneline -- 'src/core-runtime/reconstruct/' | head -5  # 최근 track-b 진행
```

---

## 6. 참조 파일 우선순위

### RFC-1 의 closure 산출물 (P2-A/B/C 가 구현)

- **`development-records/evolve/20260427-catalog-runtime-projection-closure.md`** — RFC-1 v9 design authority (796 lines)
- `src/core-runtime/cli/dispatch-preboot-core.ts` — Contract A/B/C 본체
- `src/core-runtime/cli/meta-handlers.ts` — onHelp / onVersion
- `scripts/check-handler-exports.ts` — Layer 0 canonical gate
- `src/core-runtime/cli/dispatcher-prod-smoke.test.ts` — bin/onto + dist matrix

### RFC-1 §11 future seams 정의

`development-records/evolve/20260427-catalog-runtime-projection-closure.md` §11 — 6 future seam 의 trigger + 영향 정리.

### P1 design

- `development-records/evolve/20260423-phase-1-catalog-ssot-design.md` — P1 design authority
- `development-records/evolve/20260423-activation-determinism-redesign.md` — P1 trigger

### Handoff 이력

- `development-records/handoff/20260425-phase-1-4-resume.md` — P1-4 진입 시 (이미 머지됨)
- `development-records/handoff/20260427-p2-rfc-1-closure-resume.md` — 본 문서

---

## 7. 결정 시 점검 사항

다음 stage 진입 결정 전:

1. **시간 예산**: RFC-2 / RFC-3 stub 은 RFC-1 처럼 multi-iteration onto review 필요한가? scope 가 작아 1-2 round 로 idempotent 가능 — 하지만 9 iteration 패턴이 반복될 위험 인지
2. **병렬성**: P2-A/B/C 처럼 한 RFC 에서 여러 sub-PR 분할 가능? RFC-2 의 5 항목은 각각 isolated 라 design 단계에서 sub-PR 분할 명시 필요
3. **dependency**: future seam 항목은 RFC-2/3 의 후속? 아니면 직접 implementation 가능? — ONTO_HELP_TEXT 추출은 cli-help-deriver 변경 → 별 RFC 필요 없을 수도
4. **stakeholder**: track-b 진행 (Phase 3) 와 catalog SSOT closure 우선순위 — 둘이 별 axis 라 평행 가능

---

## 8. 한눈 정리

P2 RFC-1 sub-PR ladder 완전 마감. catalog → runtime projection 6 항목 closure. 다음:
- **Option 1 (RFC-2)** — declared-but-unimplemented (5 항목)
- **Option 2 (RFC-3)** — production hardening (3 항목)
- **Option 3 (future seam)** — 직접 implementation (6 항목)
- **Option 4 (다른 axis)** — Phase 2 Translation / Phase 4 track-b

권고: **Sequence A — RFC-2 → RFC-3 → future seams**. 또는 user 의 stakeholder 우선순위 (production / declared promise / track-b 등) 따라 결정.
