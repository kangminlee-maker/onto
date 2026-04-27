# reconstruct/ — Integration scope

> Resolves review CC-INTEGRATION-01 (PR #226 round1, structure + coverage)
> and PR #227 round1 review consensus #2 (orphan production paths — structure +
> dependency + pragmatics + coverage 4 lens).

## Current scope (Track B phase 3, PRs #225 / #226 / #227)

본 디렉토리의 모든 module 은 **scaffolding** — Step 4 protocol §2~§5 의 spec
을 type + algorithm 으로 self-contained 하게 구현. **production runtime caller
(Runtime Coordinator) 와의 wiring 은 phase 3 scope 밖.**

각 module 의 unit test 는 input → output behavior 를 검증하며, dependency
injection (예: `runHookAlpha({ spawnProposer })`, `runHookGamma({ spawnReviewer })`,
`runDomainInit({ io, now })`) 으로 testability 를 확보. mock dispatcher 가
LLM agent 호출을 대신.

## Production wiring — Coordinator spec entry landed (post-PR232 wire commit)

> **CONTRACT (4 mirror seats 동일 sentence)**: `.onto/config.yml` 의 `reconstruct:` block 의 deterministic spec entry 는 `coordinator.ts` 의 `runReconstructCoordinator()` — boot 시 switch load + invariant check (위반 시 halt) + Hook α / γ / δ + Phase 3.5 dispatch 를 single-shot full cycle 로 wire. Caller-side wire (reconstruct.md prompt 가 coordinator 호출하는 production runtime path) 는 **여전히 별도 commit scope** — 본 commit 단계에서는 coordinator + unit test 가 wire shape 의 contract layer.

| W-ID | scope | 책임 module |
|---|---|---|
| W-A-101 | wip.yml schema mirror — Step 1 §4 + Step 2/3/4 wip 변경 통합. authority seat (`reconstruct.md §wip.yml schema`) update | (no new runtime module — type-only) |
| W-A-102 | mirror marker final coherence — `canonical-mirror-of` (W-A-80~87) + `runtime-mirror-of` (W-A-88~104) 양 scope cross-cutting verify | (audit + 1 fix: W-A-101 marker prefix `step-{2,3}-protocol` → `step-{2,3}-rationale-{proposer,reviewer}` 정합. INTEGRATION.md 는 integration narrative — marker 의무 없음 명시) |
| W-A-103 | dogfood off switches — `.onto/config.yml` reconstruct dogfood disable. §14.6 4 점 (off 가능 / 들어내기 / govern friendly / 본질 ≠ dogfood) 검증 | config schema |
| W-A-104 | E2E smoke — full v1 cycle (mock): `onto domain init` (W-A-95/96) → reconstruct (Hook α/γ/δ) → Phase 3 → Phase 3.5 → raw.yml assemble | E2E test module (`e2e-smoke.test.ts`) |
| **post-PR232** | **Coordinator wire commit** — `runReconstructCoordinator()` deterministic spec entry: boot switch load + invariant halt + Hook α/γ/δ + Phase 3.5 dispatch with switch gating. Production caller (reconstruct.md prompt 가 coordinator 호출) 는 다음 commit scope. | `coordinator.ts` + `coordinator.test.ts` (11 test, 4 mode + invariant halt + spy + audit) |

Switch gating 효과 (Step 4 §8.3 + configuration.md §4.11):
- `v1_inference == false` → coordinator 가 inference_mode=`none` 으로 매핑 → Hook α/γ 자체 skip, Hook δ 미호출
- `phase3_rationale_review == false` → coordinator 가 Hook γ invocation 자체 skip (`gamma: skipped_by_switch`)
- `write_intent_inference_to_raw_yml == false` → coordinator 가 `result.writeIntentInferenceToRawYml = false` propagate (raw.yml writer 가 omit)

Silent-default audit signal: coordinator 가 `configRaw == null` 또는 `reconstruct:` block 부재 detect 시 `deps.onConfigAbsent?.()` emit — caller 가 `reconstruct_config_absent_default_v1_applied` 로 log (post-PR232 backlog A2 해소).

## 검증 안 되는 영역 (phase 4 까지 deferred)

review 가 지적한 다음 영역은 본 디렉토리의 unit test scope 밖:

- **Hook α `gap` / `domain_scope_miss` outcome 의 normal-path test** — current
  test 는 `proposed` + `domain_pack_incomplete` 만 happy path. gap/scope_miss
  도 동일 flow 이지만 별도 happy-path test 부재. W-A-104 의 E2E 가 cover.
- **Hook δ unmatched `domain_pack_incomplete` fallback grouping** —
  pack_missing_areas aggregate 와 매칭 안 되는 domain_pack_incomplete entry
  가 rationale_state grouping 으로 fallback. resolveGroupingKey 의 마지막
  분기 (line 196-202) 가 그것을 cover 하지만 fallback path 의 unit test
  부재.
- **Coordinator 의 retry / degraded_continue / abort 분기** — Hook α 의
  `runHookAlpha` 와 Hook γ 의 `runHookGamma` 가 "single-shot" invocation
  으로 design. retry/degraded/abort 의 orchestration 은 caller 책임. W-A-104
  E2E 가 cover.

## PR-γ (#227) review-fixed gaps

PR #227 round1 review (session `20260427-4d4bab17`) 가 두 highest-priority
blocker 와 추가 4 finding 을 지적. fix 결과:

- **Phase 3.5 validation closure** (consensus, structure + coverage + axiology
  + pragmatics) — `runPhase35` 에 fail-closed validation 통합. invalid input
  은 apply/sweep 진입 차단 → discriminated union return.
- **failure-code production wiring orphan** (consensus, structure + dependency
  + pragmatics + coverage) — 본 INTEGRATION.md 에서 phase 4 W-A-104 wiring
  scope 명시 (해소 = scope-by-declaration, PR-β 와 동일 패턴).
- **`config_schema_invalid` recovery text dangling reference** (consensus,
  logic + pragmatics) — interactive recovery 가 self-contained "without
  --config" path 로 변경.
- **canonical failure-code authority duplication** (consensus, evolution +
  conciseness) — failure-codes.ts 가 single seat. test fixture 가 별도 source
  으로 보일 risk 는 v1.1 backlog (test 가 production code 의 source-of-truth
  를 import 하는 형태로 refactor).
- **`principal_confirmed_scope_miss` terminal semantics** (conditional
  consensus, semantics + conciseness vs structure + dependency) — PR-β
  UF-LOGIC-02 fix (Hook δ comment) 와 동일 dual-scope 명시 적용. terminal
  set 안에 들어있지만 §3.1 matrix 가 추가 action 허용 — terminal 정의의
  spec-intentional dual scope.

남은 single-lens UF (semantics: FailureOrigin rename, evolution: Phase 3.5
state logic 분산) 는 v1.1 refactor backlog.

## Provenance — review 결과의 commit trail

PR #226 round1 review (session `20260427-78e8b15c`) 의 finding:

- **Consensus C-PROV-01** (logic + semantics + conciseness) — fix commit:
  "clarify proposed_by overload semantics"
- **Conditional Consensus CC-INTEGRATION-01** (structure + coverage) — fix:
  본 INTEGRATION.md (scope explicit declaration)
- **UF-LOGIC-02** (domain_scope_miss dual scope) — fix commit:
  "document domain_scope_miss terminal-rendered dual scope"
- **UF-EVOLUTION-02** (phase3-snapshot.yml schema version) — fix commit:
  "add schema version to phase3-snapshot.yml"
- **UF-PRAGMATICS-01** (queue missing vs blank) — fix commit:
  "distinguish missing vs blank intent_inference"
- **UF-PRAGMATICS-02** (queue grouping metadata) — fix commit:
  "preserve Hook δ grouping metadata in queue"
- **UF-PRAGMATICS-03** (downgrade cause persist) — fix commit:
  "persist confidence downgrade cause"
- **UF-EVOLUTION-01** (contract_version compatibility) — fix commit:
  "enforce contract_version compatibility"

남은 UF (single-lens, MINOR) 는 phase 4 또는 v1.1 backlog 흡수:
- UF-STRUCTURE-02 (runtime_version 빈 string) — defensive handling
- UF-DEPENDENCY-01 (retry edge bypass) — runtime invariant
- UF-DEPENDENCY-02 (effective_injected_files dual authority)
- UF-CONCISENESS-02 (hook handoff schema duplicated)
- UF-AXIOLOGY-01 (rank 1-3 binding) — review-time
