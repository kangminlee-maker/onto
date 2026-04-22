---
as_of: 2026-04-23
revision: 7
status: pre-decision-structural-review
functional_area: phase-4-stage-3-step-1
purpose: |
  Phase 4 Stage 3 Step 1 (reconstruct v1 차이 축 재정의) 의 결정 (Q surface)
  을 확정하기 전에 reconstruct v1 flow 의 구조적 합리성을 먼저 검증하기
  위한 사전 리뷰 문서. 4 축 (사용자 / LLM / runtime / script) 으로 단계별
  작동 방식을 서술하여 canonical seat + state lifecycle 을 우선 고정한 뒤
  fail-close contract, domain-pack manifest, hook point 계약 순으로 결정을
  정당화한다. 축적된 추론 품질이 가장 중요한 제약이다.
authority_stance: non-authoritative-review
canonicality: scaffolding
revision_history:
  - revision: 1
    date: 2026-04-22
    change: "초안 — 4 축 분해 + 4 Hook (α/β/γ/δ) 제안"
  - revision: 2
    date: 2026-04-22
    change: |
      /onto:review 1차 (20260422-6763a95c, 9/9 consensus, 4 BLOCKING + 6 UF
      + 2 axiology) 반영. canonical state lifecycle 단일화, fail-close
      contract + v0 fallback rename, Hook β 를 α 의 gated propagation rule
      로 재분류, Hook γ failure/degradation contract, agent rename
      (Proposer / Reviewer), field split, manifest 도입, provenance,
      throttling, OaC 순서 재편.
  - revision: 3
    date: 2026-04-22
    change: |
      /onto:review 2차 (20260422-327ab3a4, 3 BLOCKING + 6 UF + 3 conditional)
      반영 — **contract repair only scope** (review 권고). 주요 수선:
      (a) `carry_forward` 의미 고정 — implicit only, batch action 은
      explicit terminal state 로 1:1 매핑, `principal_deferred` 신규
      terminal state 추가, (b) manifest authority 분리 — reconstruct =
      consumer only, 자동 생성 폐지, 별도 `onto domain init` CLI 가
      producer, (c) Hook γ apply-seat single bridge 명시 (Step 2c →
      Step 4a Synthesize aggregate → Step 4b Runtime apply),
      (d) `out_of_domain` 을 `domain_scope_miss` (terminal) +
      `domain_pack_incomplete` (transient) 2 state 로 분리,
      (e) 용어 경계 glossary (§1.3) 추가 — seat / UI+process term /
      payload 구별, (f) quality vocabulary 정규화 (§4.7),
      (g) `manifest_schema_version` parse-time compatibility rule,
      (h) provenance 에 `proposer_contract_version` +
      `reviewer_contract_version` + `manifest_schema_version` 추가,
      (i) no-domain fallback 통일 — interactive + non-interactive 모두
      Principal 명시 동의 필수, (j) Phase 3 evidence surface —
      individual + group sample 에 inferred_meaning + justification +
      domain_refs 전수 노출, γ full-failure 시 exhaustive collection,
      (k) `add_for_stage2_entity` operation 을 기존 entity 로 제약
      (Reviewer 가 entity 생성 불가).
  - revision: 4
    date: 2026-04-22
    change: |
      /onto:review 3차 (20260422-cc77ecfa, 3 BLOCKING + 4 UF + 1 disagreement)
      반영 — **contract repair only scope** 유지. 주요 수선:
      (a) B4 Quality vocabulary 정합 — §4.7 glossary 와 §5.2/§5.4 동기화.
      `degraded → quality_tier ∈ {partial, minimal}` (minimal 포함).
      `fallback_reason` enum (`user_flag` / `principal_confirmed_no_domain`)
      +  `degraded_reason` enum (`pack_optional_missing` /
      `pack_quality_floor` / `pack_tier_minimal`) 확정. `skipped_by_flag`
      제거, (b) B5 γ-degraded 이후 Phase 3.5 전이 rule — proposed / gap
      / domain_pack_incomplete / domain_scope_miss 의 Principal action
      → terminal state 5 매핑 테이블 §7.9 신규, (c) B6 domain_scope_miss
      override contract — 4 action (accept/override/defer/미판정) 매핑 +
      `principal_judged_at` audit truth (§4.6 invariant 6 의 reviewer
      time backfill 허용 제거. carry_forward 와 domain_scope_miss+미판정
      시 null 유지), (d) §5.2 inference mode 에 halt 조건 3 종과 none
      mode 2 경로 분리 (UF-LOGIC-NO-DOMAIN-MODE-CONFLICT 해소),
      (e) §6.1 Producer seat = Principal 만 rename (3차 review
      disagreement 해소, `onto domain init` 은 Principal 의 mechanism),
      (f) Pack upgrade re-entry = P2 옵션 채택 — v1 단일 세션 완결,
      업그레이드 후 새 reconstruct 세션 (§12 backlog 명시),
      (g) `gap` state 에 `reject` action disabled — UI 에 버튼 미표시,
      (h) §12 backlog 에 domain_refs stable identity
      (UF-EVOLUTION-DOMAIN-REF-IDENTITY, v1.1) + provenance normalization
      (UF-CONCISENESS-PROVENANCE-DUPLICATION, implementation detail) 명시.
  - revision: 5
    date: 2026-04-23
    change: |
      /onto:review 4차 (20260422-53307585, 9/9 consensus on 5 repairs +
      0 BLOCKING + 5 contested + 2 structural UF) 반영 — **strictly
      contract-local repair scope** (review 명시 권고). 주요 수선:
      (a) Phase 3.5 input contract naming 통일 (UF-STRUCTURE-PHASE35-
      PORT-MISMATCH) — §4.3 의 `rationale_decisions[].decision` +
      `accept_all/reject_all/defer_all` 을 §7.9 canonical 인 `action`
      + `batch_actions[].action` 으로 통일, (b) gap 의 terminal state
      split (Contested 1) — `mark_acceptable_gap` 의 terminal 을
      `principal_deferred` 에서 신규 `principal_accepted_gap` 으로
      분리. terminal states 6 → 7. audit 구별: deferred = 재판정 의도
      (pack upgrade 대기), accepted_gap = 현재 rationale 없음 수용
      (재판정 의도 없음), (c) degraded start policy 통일 (Contested
      3) — interactive 에서는 Principal confirm, non-interactive 에서는
      auto-continue with warning (§5.2/§5.4/§8 하나로), (d) `pack_quality_
      floor` operational 정의 (Contested 4) — trigger/scope/precedence
      4-tier order 명시 (missing→halt, floor→degraded, tier_minimal→
      degraded, optional_missing→degraded), (e) `carry_forward` prose
      precise (Contested 5) — "not reviewed" 주장 제거, "per-item
      explicit action 부재, reviewed 여부는 불명" 으로 정확화,
      (f) §4.2 lifecycle diagram update (UF-STRUCTURE-LIFECYCLE-OMISSION) —
      domain_pack_incomplete → carry_forward edge + principal_accepted_gap
      전이 edges 추가.
  - revision: 6
    date: 2026-04-23
    change: |
      /onto:review 5차 (20260423-0ba31c64, 3 consensus mirror/closure + 2 UF
      + 0 disagreement + axiology 추가 perspective 없음) 반영 —
      **mirror/closure sweep** narrow scope. 주요 수선:
      (a) C1 carry_forward prose sweep — §4.3 핵심 구별 + §4.6 invariant 9
      + §7.7 prose 전수에서 "Principal 이 실제로 본 것" / "per-item 안 봄"
      등 over-claim 제거. "per-item explicit action 기록 없음" 으로
      엄격화. "Principal 읽었는지 여부는 본 state 로 판별 불가" 명시,
      (b) C2 mark_acceptable_gap_all batch path close — §4.3 judgment
      rule 에 batch_actions "mark_acceptable_gap_all" → principal_accepted_gap
      추가. §7.9.3/§7.9.4 테이블에 batch row 추가, (c) C3 §10 Q2
      "5+6 terminal" → "5+7 terminal" 수정 (r5 stale mirror),
      (d) UF-STRUCTURE-PACK-QUALITY-FLOOR-SUMMARY-DRIFT — §4.7 참조 관계
      summary 를 §4.7.1 precedence order 참조로 재작성, pack_quality_floor
      포함, (e) UF-CONCISENESS-ACTION-AXIS-DUPLICATION — `modify` vs
      `provide_rationale` 구별 방어 추가. source state × UI affordance
      로 구별 (reviewed 에는 modify, gap/incomplete 에는 provide_rationale).
      terminal 은 단일 (`principal_modified`).
  - revision: 7
    date: 2026-04-23
    change: |
      /onto:review 6차 (20260423-aa9b3f33, 1 D1 + 1 UF + 0 BLOCKING +
      axiology 추가 없음) 반영 — **sync fix 2 항목** narrow scope.
      (a) D1 §5.2 full row contradiction — full mode 조건에
      `pack_quality_floor 통과` 추가 (§4.7.1 precedence 5 와 정합),
      (b) UF-COVERAGE-CHEATSHEET-DEGRADED-SUMMARY-DRIFT — §14 item 21
      을 §4.7.1 precedence 4-tier (pack_quality_floor miss /
      pack_tier_minimal / pack_optional_missing) 를 반영하도록 확장.
      `full tier` 자체가 full mode 를 보장하지 않음을 명시.
source_refs:
  stage_1_design_input: "development-records/evolve/20260419-phase4-design-input.md §1.4 reconstruct"
  stage_2_wrap_up: "development-records/evolve/20260422-phase4-stage2-wrap-up.md"
  reconstruct_v0_contract: ".onto/processes/reconstruct.md"
  reconstruct_v0_cli: "src/core-runtime/evolve/commands/reconstruct.ts"
  invariant: ".onto/processes/govern.md §14.6"
  prior_reviews:
    - ".onto/review/20260422-6763a95c/ (r1 → r2)"
    - ".onto/review/20260422-327ab3a4/ (r2 → r3)"
    - ".onto/review/20260422-cc77ecfa/ (r3 → r4)"
    - ".onto/review/20260422-53307585/ (r4 → r5)"
    - ".onto/review/20260423-0ba31c64/ (r5 → r6)"
    - ".onto/review/20260423-aa9b3f33/ (r6 → r7)"
---

# Reconstruct v1 Flow — Structural Review (사용자 / LLM / runtime / script 4 축)

## 0. 본 문서의 목적

Stage 3 Step 1 의 결정을 확정하기 전에 reconstruct v1 의 **목적 충족 가능성**을 flow 수준에서 검증한다. revision 3 는 2차 review 의 권고 ("contract repair only, not further expansion") 를 준수하여 기존 r2 의 구조 (seat → contract → role → artifact) 를 그대로 유지하며 내부 모순·벙어리 boundary·version 부재만 수선한다.

본 리뷰의 원칙 (r2 와 동일):

1. **결과물의 의미성이 process 정합성보다 우선**
2. **Fail-loud not fail-silent**
3. **Fail-close at boundary**
4. **Single seat for single concept**
5. **Inference is input-bound**

## 1. reconstruct v1 의 목적 재진술

### 1.1 정의

**무엇인가**: product (code + documents + spreadsheets + databases) 로부터 ontology 를 재구성하는 과정에서, product 자체에는 기록되지 않은 **각 요소의 맥락·존재이유·역할을 외부 지식으로 합리적 추론** 하여 ontology 에 함께 기록하는 활동.

**왜 존재하는가**: product 의 소스 코드·문서는 "무엇이 구현되었는가" 는 기록하지만 "왜 그렇게 구현되었는가" 는 종종 누락된다. 이 누락을 그대로 ontology 에 옮기면 ontology 가 구조만 있고 의미가 없다. v1 은 이 누락을 외부 3 가지 근거 (domain 지식·product 목적·핵심 entity 관계) 로 합리적 추론하여 채운다.

**다른 활동과의 관계**: review 는 기존 산출물을 검증, evolve 는 새 설계를 제안, learn 은 학습을 축적, govern 은 규범을 관리. reconstruct 는 기존 product 를 ontology 로 **재구성** 하며, v1 은 이 재구성에 **의미 층** 을 추가한다.

### 1.2 v1 의 input 3 축 + 가용 시점

| 입력 | 출처 | 가용 시점 (v0 flow 기준) |
|---|---|---|
| **domain 지식** | `~/.onto/domains/{session_domain}/` + `manifest.yaml` | Domain Selection (Phase 0 이전) 즉시 가용 |
| **product 목적** | `context_brief.system_purpose` | Phase 0.5.4 저장 후 가용 |
| **핵심 entity** | Stage 1 확정 entity 집합 | **Stage 1 종료 직후** 가용 |

세 입력이 모두 갖춰지는 최초 시점은 **Stage 1 종료 직후**. 이 시점 이전의 추론은 purpose violation.

### 1.3 용어 경계 glossary (UF-semantics-concept-boundary 해소)

r2 의 2차 review 가 지적한 "`intent_inference` (seat) vs `rationale` (UI term) vs `inferred_meaning` (payload) 의 의미 경계가 fuzzy" 를 해소하기 위해 단일 용어 표를 고정한다:

| 용어 | 정의 | 사용처 |
|---|---|---|
| **`intent_inference`** | **Canonical seat name** — `wip.yml.elements[].intent_inference` / `raw.yml.elements[].intent_inference` field 자체를 가리킴 | 구현 layer. data schema. 본 문서 §4 |
| **`rationale`** | **UI + process term** — Phase 3 의 사용자 경험, Rationale Proposer·Rationale Reviewer agent 의 이름, "rationale review surface" 등 프로세스·역할·사용자 인터페이스 층에서 사용 | UI, role, process term |
| **`inferred_meaning`** | **Payload field** — `intent_inference.inferred_meaning` 의 구체 content (추론된 의미 문장) 만 가리킴 | data value. `intent_inference` 내부 |
| **`justification`** | **Supporting rationale** — `intent_inference.justification` 의 근거 문장. `inferred_meaning` 의 정당화 | data value. `intent_inference` 내부 |
| **`domain_refs`** | **Domain evidence pointers** — `intent_inference.domain_refs[]` 의 도메인 md 참조 항목 | data value |

**결정**: 본 문서와 이후 모든 설계·구현·문서화에서 위 4 용어는 **정의된 책임 밖으로 사용 금지**. 예를 들어 "rationale field" 라고 data schema 를 기술하는 문서는 이 rule 에 따라 "`intent_inference` field" 로 수정되어야 한다. "rationale UI" 는 그대로 허용.

## 2. 4 축 정의

| 축 | 정의 | 결정성 | 책임 | 비용 특성 |
|---|---|---|---|---|
| **사용자** (Principal) | 인간 판단 주체 | N/A | 맥락 입력, 판정, 반려, 수정, 자유 기술 | 시간 비용 + 인지 부하 |
| **LLM** (agent) | subagent spawn | **비결정** | 해석, 추론, 충돌 리포트 | 토큰 비용 + 불안정 |
| **runtime** (coordinator) | state machine + atomic write | **결정적** | wip.yml sole-writer, patch 적용, invariant | I/O (낮음) |
| **script** (CLI) | entrypoint 함수 | **결정적** (LLM 호출 없음) | argv parsing, 파일 I/O, state 전이 | CPU (미미) |

### 2.1 축 간 이동 금지선

- script → LLM 호출 금지
- LLM → runtime state 직접 쓰기 금지
- runtime → 사용자 개입 우회 금지
- 사용자 → LLM/runtime 책임 대리 금지

## 3. v0 flow 의 4 축 baseline

| 단계 | 사용자 | LLM | runtime | script |
|---|---|---|---|---|
| Domain Selection | 도메인 선택 | — | — | `{session_domain}` resolve |
| Phase 0.5.1 | (애매 시) source_type 응답 | — | source_type 판정 + tool 체크 | — |
| Phase 0 Schema | A~E 선택 | team lead 추천 | schema.yml 저장 | — |
| Phase 0.5.2~4 | context 응답 | — | context_brief.yml atomic write | (선택) clone |
| Phase 0.5.5 | 재확인 or keep | team lead 판정 | schema 결정 | — |
| Phase 1 Round N (Stage 1/2) | — | Explorer + Lenses + Adjudicator + Synthesize | sole-writer + 수렴 판정 | — |
| **Stage 1→2 Transition** | — | — | `module_inventory` 교체 | — |
| Phase 2 Step 1~4 | — | Semantics + Coverage + Adjudicator + Synthesize | dispatch + apply | — |
| Phase 3 | ontology summary 확인 | — | summary render | — |
| Phase 3.5 | — | — | user decisions atomic apply | — |
| Phase 4 Save | (옵션) overwrite 승인 | — | raw.yml 저장 | — |
| Phase 5 | — | learning extractor | learning storage | — |

---

## 4. Canonical Seat + Rationale State Lifecycle

### 4.1 Canonical seat (single)

**결정**: rationale 관련 모든 상태는 `wip.yml.elements[].intent_inference` 단일 field 에 encode. raw.yml 에서도 동일 seat.

**금지**:
- `meta.intent_inference_gaps` — **폐지**
- `meta.coverage_gaps` — **폐지** (Coverage lens 의 module gap 과 무관)
- `issues[]` 에 rationale 관련 별도 entry — **금지** (intent_inference 에 이미 상태)

### 4.2 Rationale state lifecycle (single enum, r3 확장 + r5 `principal_accepted_gap` 추가)

```
┌──────────────────── rationale_state ─────────────────────┐

  [empty]                                                    ← Stage 1 종료 전
     │
     └──(Hook α Rationale Proposer 실행)──►
     
  [proposed]    (confidence: low | medium | high)           ← α 생성 완료
     │
     ├──(Hook γ: confirm)──────────────────► [reviewed]
     ├──(Hook γ: revise)───────────────────► [reviewed]     (content updated)
     ├──(Hook γ: mark_domain_scope_miss)───► [domain_scope_miss]
     └──(Hook γ: mark_domain_pack_incomplete)──► [domain_pack_incomplete]

  [gap]                                                      ← α 실패 or 근거 불충분
     │
     ├──(Hook γ: add_for_stage2_entity — 기존 entity 만)──► [proposed] | [domain_pack_incomplete] | [domain_scope_miss]
     │
     ├──(Phase 3 action: provide_rationale)──► [principal_modified]
     ├──(Phase 3 action: mark_acceptable_gap)──► [principal_accepted_gap]   (r5 신규)
     ├──(Phase 3 action: defer)──────────────► [principal_deferred]
     └──(Phase 3 global 'confirmed' 만)──────► [carry_forward]

  [domain_pack_incomplete]  (transient)                      ← pack quality 부족
     │
     ├──(Phase 3 action: provide_rationale)──► [principal_modified]
     ├──(Phase 3 action: mark_acceptable_gap)──► [principal_accepted_gap]   (r5 신규)
     ├──(Phase 3 action: defer — pack upgrade 대기)──► [principal_deferred]
     └──(Phase 3 global 'confirmed' 만)──────► [carry_forward]             (r5 — UF-STRUCTURE-LIFECYCLE-OMISSION 해소)

  [reviewed]                                                 ← γ 처리 완료 (terminal 후보)
     │
     ├──(Phase 3 action: accept — individual or batch)──► [principal_accepted]
     ├──(Phase 3 action: reject — individual or batch)──► [principal_rejected]
     ├──(Phase 3 action: modify — individual only)─────► [principal_modified]
     ├──(Phase 3 action: defer — individual or batch)──► [principal_deferred]
     └──(Phase 3 global 'confirmed' 만, no per-item)───► [carry_forward]

└──────────────────────────────────────────────────────────┘

Terminal states (Phase 4 Save 허용 — 7 개, r5 에서 1 추가):
  principal_accepted
  principal_rejected
  principal_modified
  principal_deferred        (r3 — 재판정 의도 있음, pack upgrade 대기)
  principal_accepted_gap    (r5 신규 — 현재 rationale 없음 수용, 재판정 의도 없음)
  carry_forward             (implicit only)
  domain_scope_miss         (r3 — true scope miss, save-allowed)

Intermediate states (Phase 3.5 종료 전 terminal 로 전이 필수 — 5 개):
  empty | proposed | reviewed | gap | domain_pack_incomplete
```

**r5 `principal_accepted_gap` vs `principal_deferred` 구별 (B5 Contested 1 해소)**:
- `principal_deferred`: Principal 이 "나중에 재판정할 것" — pack upgrade 대기, 재 reconstruct 세션에서 rationale 채움 의도
- `principal_accepted_gap`: Principal 이 "현재 rationale 없음을 수용" — 재판정 의도 없음, 이 element 는 rationale 없이 archivable

audit consumer 는 두 상태를 구별하여 처리 (예: govern 이 "재판정 대기 queue" 를 만들 때 `principal_deferred` 만 포함).

### 4.3 `carry_forward` 의미 고정 (B1 해소 — r3, prose precise — r5)

**단 하나의 의미** (r5 precise): `carry_forward` 는 **해당 element 에 대한 per-item explicit action (individual 또는 batch) 이 phase3_user_responses 에 기록되지 않은 상태에서 `global_reply == "confirmed"` 로 세션이 종료됨**을 의미한다.

**중요 — state 가 prove 하는 것 vs prove 하지 않는 것** (r5 contested point 5 해소):
- **prove 하는 것**: per-item explicit action 부재 + global `confirmed`
- **prove 하지 않는 것**: Principal 이 해당 element 의 rationale 을 **실제로 읽었는지 여부**. Principal 이 전수 읽고 "모두 동의" 해서 per-item action 을 생략했을 수도, 일부 skip 했을 수도 있다. state 는 이를 구별하지 않음

따라서 audit consumer (예: govern) 는 `carry_forward` 를 **"explicit judgment 없음"** 으로 해석해야 하며, **"definitely not reviewed"** 로 결론내릴 수 없다. 만약 "실제로 본 것" 을 audit 에 기록하고 싶으면 별도 per-item view-tracking mechanism 이 필요 (본 v1 scope 밖).

**판정 rule** (runtime 결정적, LLM 불개입, r5 naming 통일 — `action` canonical, UF-STRUCTURE-PHASE35-PORT-MISMATCH 해소):

```
Phase 3.5 에서 element E 의 rationale_state 가 reviewed 일 때,
phase3_user_responses 를 조사:
  - rationale_decisions[] 에 E 의 id 가 있고 action == "accept" → principal_accepted
  - rationale_decisions[] 에 E 의 id 가 있고 action == "reject" → principal_rejected
  - rationale_decisions[] 에 E 의 id 가 있고 action == "modify" → principal_modified
  - rationale_decisions[] 에 E 의 id 가 있고 action == "defer"  → principal_deferred
  - batch_actions[] 중 하나가 E 를 포함하고 action == "accept_all" → principal_accepted
  - batch_actions[] 중 하나가 E 를 포함하고 action == "reject_all" → principal_rejected
  - batch_actions[] 중 하나가 E 를 포함하고 action == "defer_all"  → principal_deferred
  - batch_actions[] 중 하나가 E 를 포함하고 action == "mark_acceptable_gap_all" → principal_accepted_gap  (r6 신규 — C2 해소)
    (단 source state 가 gap / domain_pack_incomplete 인 경우에만 유효. reviewed
     source 에는 해당 안 됨 — gap 계열 전용 batch)
  - 위 어느 것도 해당 안 되고 global_reply == "confirmed" → carry_forward
  - 위 어느 것도 해당 안 되고 global_reply != "confirmed" → invariant 위반 (bug)

(gap / domain_pack_incomplete source 에 대한 action 매핑은 §7.9.3 / §7.9.4 참조.
 domain_scope_miss 는 §7.9.5 의 special case 로 carry_forward 로 전이하지 않음)
```

**field naming (r5 통일 — UF-STRUCTURE-PHASE35-PORT-MISMATCH 해소)**:
- `rationale_decisions[].action` — enum: `accept | reject | modify | defer | provide_rationale | mark_acceptable_gap | override`
- `batch_actions[].action` — enum: `accept_all | reject_all | defer_all | mark_acceptable_gap_all`
- r3/r4 에서 `decision` 필드명을 사용한 흔적이 남아 있었으나 r5 에서 `action` 로 canonical. §7.9 의 naming 과 일치

**action 축 구별 (r6 — UF-CONCISENESS-ACTION-AXIS-DUPLICATION 방어)**:
`modify` 와 `provide_rationale` 은 **terminal state 에서 동일** (`principal_modified`) 이지만 **source state × UI affordance** 로 구별:
- `modify`: `reviewed` source 에만 사용. "γ 가 제안한 rationale 을 수정" UI
- `provide_rationale`: `gap` / `domain_pack_incomplete` source 에 사용. "rationale 이 없는 element 에 새로 제공" UI
- 이 구별은 **사용자 경험 (UI affordance)** 차원 — Principal 이 "수정" 과 "신규 제공" 을 같은 버튼으로 하면 혼란. contract terminal 은 단일 (`principal_modified`) 로 유지하여 audit 간결성 보장
- 두 action 은 모두 `principal_provided_rationale.inferred_meaning` 필수 populate (§4.5 schema, §4.6 invariant 7)

**핵심 구별 (r6 prose sweep)**: `carry_forward` 는 **per-item explicit action 이 기록되지 않았음** 을 명시하는 상태. `principal_*` 는 **per-item explicit action 이 기록되었음** 을 의미. raw.yml consumer (예: govern audit) 는 이 구별로 판정 가중치를 구별한다 — 단, `carry_forward` 가 "Principal 이 읽지 않았음" 을 prove 하지는 않음 (§4.3 상단 참조). 읽었는지 여부는 본 state 로는 판별 불가이며, per-item view-tracking 이 필요한 경우 별도 mechanism 도입이 필요하다 (v1 scope 밖).

### 4.4 provenance field

rationale 의 감사 가능성·migration 지원을 위해 `intent_inference.provenance` 필수:

```yaml
intent_inference:
  provenance:
    proposed_at: "{ISO 8601 UTC}"
    proposed_by: "rationale-proposer"
    proposer_contract_version: "1.0"       # r3 신규 — proposer 계약 버전
    reviewed_at: "{ISO 8601 UTC}"          # γ 처리 시에만
    reviewed_by: "rationale-reviewer"
    reviewer_contract_version: "1.0"       # r3 신규
    principal_judged_at: "{ISO 8601 UTC}"  # Phase 3.5 시
    manifest_schema_version: "1.0"         # r3 신규 — manifest.yaml schema version
    domain_manifest_version: "{semver}"    # pack content version
    domain_manifest_hash: "{content hash}"
    domain_quality_tier: full | partial | minimal   # 추론 당시 pack tier
    session_id: "{reconstruct session id}"
    runtime_version: "v1.0.0"
```

raw.yml 에 전량 보존. 후속 재해석·마이그레이션 시 contract/manifest/runtime 버전 모두 감사 가능.

### 4.5 intent_inference field schema

```yaml
intent_inference:
  # 본체 (field split)
  inferred_meaning: "{이 element 가 무엇을 의미하는가 — 1~2 문장}"
  justification: "{왜 그렇게 추론했는가 — 근거, 1~3 문장}"
  domain_refs:
    - manifest_ref: "concepts.md"         # manifest.yaml referenced_files[].path
      heading: "{도메인 md 내 heading path}"
      excerpt: "{인용 ≤100자}"
  
  # 상태 (§4.2 lifecycle)
  rationale_state:
    empty | proposed | reviewed | gap | domain_pack_incomplete    # intermediate (5)
    | principal_accepted | principal_rejected | principal_modified
    | principal_deferred | principal_accepted_gap                 # terminal (r5: 7 개, +principal_accepted_gap)
    | carry_forward | domain_scope_miss
  confidence: low | medium | high                                 # proposed 시에만 의미
  
  # 감사 (§4.4)
  provenance: {...}
  
  # Principal 판정 결과 (해당 시에만 populate)
  principal_provided_rationale:            # principal_modified 시에만
    inferred_meaning: "{Principal 이 교체한 내용}"
    justification: "{Principal 이 제공한 근거, optional}"
  principal_note: "{Principal 자유 기술, optional}"
```

### 4.6 Phase 3.5 invariant 확장

```
reconstruct.md:1431 의 Phase 3.5 invariants 에 추가:

5. 모든 element 의 intent_inference.rationale_state 는 terminal state 7 중 하나 (r5: +principal_accepted_gap):
   {principal_accepted, principal_rejected, principal_modified,
    principal_deferred, principal_accepted_gap, carry_forward, domain_scope_miss}
   (intermediate state 5 가 남아 있으면 invariant 위반)

6. intent_inference.provenance.principal_judged_at 은 **실제 Principal 판정이
   있었던 시점에만 populate** (r4 — audit truth 원칙):
   - principal_accepted / principal_rejected / principal_modified
     / principal_deferred / principal_accepted_gap: Principal explicit action 이
     있었음 → populate 필수
   - carry_forward: Principal per-item explicit action 없음 → **null 필수**
   - domain_scope_miss:
     * Principal 이 Phase 3 에서 explicit accept / override / defer → populate
     * Principal 미판정 (global `confirmed` only 또는 미응답) → **null 필수**
   - **reviewer time 으로 backfill 금지** — r3 의 "γ 시점의 reviewed_at 로
     충당 가능" 허용은 audit truth 훼손이므로 r4 에서 제거

7. rationale_state == principal_modified 인 element 는
   principal_provided_rationale.inferred_meaning 필수 populate

8. rationale_state == carry_forward 인 element 는 phase3_user_responses 에
   해당 element_id 에 대한 per-item explicit action (individual + batch 모두)
   이 **없어야** 한다 (즉 carry_forward 는 §4.3 의 rule 로만 도달 가능)

9. (r4 신규, r6 prose sweep) raw.yml consumer 는 `principal_judged_at == null` 인 terminal
   element 를 "per-item explicit action 기록 없음" 으로 해석해야 한다:
   - carry_forward + null: Principal 이 global `confirmed` 했으나 per-item
     explicit action (individual 또는 batch) 이 기록되지 않음.
     **Principal 이 실제 읽었는지 여부는 본 state 로 판별 불가**
   - domain_scope_miss + null: γ 판정 존재 + Principal explicit action 기록 없음.
     **Principal 이 검토했는지 여부는 본 state 로 판별 불가**
   이 두 경우는 audit 가중치가 principal_* 보다 낮음을 명시한다 — 단, "읽음"
   이나 "미검토" 로 확정하지 않는다. per-item view-tracking 은 v1 scope 밖.

10. (r5 신규) raw.yml consumer 는 `principal_accepted_gap` 과 `principal_deferred`
    를 **재판정 의도** 기준으로 구별해 처리한다:
    - `principal_accepted_gap`: Principal 이 "rationale 없음을 현재 상태로 수용".
      재 reconstruct 세션의 자동 재판정 queue 에 **포함하지 않음**
    - `principal_deferred`: Principal 이 "pack upgrade 후 재판정" 의도.
      재 reconstruct 세션의 자동 재판정 queue 에 **포함함**
```

runtime 이 Phase 4 Save 진입 전 결정적으로 검증.

### 4.7 Quality vocabulary glossary (UF-semantics-quality-tier-drift 해소 — r3, B4 수선 — r4)

quality 관련 용어가 manifest / inference_mode / provenance 에 분산되어 혼란을 일으킨 문제를 해소. 각 용어는 **서로 다른 책임** 을 가지므로 값 집합도 별도이며, 단일 glossary 에서 참조 관계를 명시:

| 용어 | 값 집합 | 사용처 | 의미 |
|---|---|---|---|
| **`inference_mode`** | `full / degraded / none` | `raw.yml.meta` — reconstruct 전체 mode | 본 세션이 v1 full / v1 degraded / v0 fallback 중 무엇이었나 |
| **`domain_quality_tier`** | `full / partial / minimal` | `manifest.yaml.quality_tier` + `intent_inference.provenance.domain_quality_tier` | **domain pack 자체의** 품질 등급. Principal 이 `onto domain init` 시 선언 |
| **`confidence`** | `low / medium / high` | `intent_inference.confidence` | **개별 추론의** 자신감. Proposer 가 element 단위로 판정 |
| **`degraded_reason`** (r4 수정) | `pack_optional_missing / pack_quality_floor / pack_tier_minimal` | `raw.yml.meta.degraded_reason` | `inference_mode: degraded` 시 구체 원인 (enum). `skipped_by_flag` 는 r4 에서 제거 (none mode 용이므로 `fallback_reason` 으로 이동) |
| **`fallback_reason`** (r4 신규) | `user_flag / principal_confirmed_no_domain` | `raw.yml.meta.fallback_reason` | `inference_mode: none` 시 구체 원인 (enum). `user_flag` = `--v0-only` 명시, `principal_confirmed_no_domain` = interactive TTY 에서 Principal 이 no-domain 하 v0 fallback 승인 |

참조 관계 (r4 수정, r6 summary sync — UF-STRUCTURE-PACK-QUALITY-FLOOR-SUMMARY-DRIFT 해소):
- `inference_mode == full` → `domain_quality_tier == full` AND `optional` 파일 전수 존재 AND `pack_quality_floor` 통과 (§4.7.1 precedence 5). `degraded_reason` / `fallback_reason` 모두 N/A
- `inference_mode == degraded` → §4.7.1 precedence 2~4 중 하나 trigger (`pack_quality_floor` / `pack_tier_minimal` / `pack_optional_missing`). 각 trigger 가 해당 `degraded_reason` 를 결정. `fallback_reason` N/A
- `inference_mode == none` → `domain_quality_tier` / `degraded_reason` 모두 N/A. `fallback_reason` 필수

본 참조 관계는 **§4.7.1 의 precedence order 의 요약 표현** — runtime decision rule 은 §4.7.1 이 canonical.

#### 4.7.1 `pack_quality_floor` operational 정의 (Contested 4 해소 — r5)

r4 는 enum 만 도입하고 trigger / evaluation scope / precedence 미정의. r5 는 runtime decision rule 을 명시:

**Trigger (per-file quality floor 미달 조건)**:
- `referenced_files[].min_headings` 필드가 명시된 file 에서 실제 heading 수 < `min_headings` (primary)
- OR file size < 200 bytes (fallback — min_headings 미명시 시 적용되는 default floor)

**Evaluation scope**:
- `required: true` file 만 대상. `required: false` file 의 quality floor 는 manifest 의 `pack_tier_minimal` 판정으로 흡수
- 단일 required file 이라도 floor 미달 → degraded

**Precedence order** (runtime 이 manifest 평가 시 first-match 방식):
1. `required: true` file 부재 → **halt** (`fallback_reason` 이 아님, §5.2 halt 조건)
2. `required: true` file 존재하되 `pack_quality_floor` 미달 (§4.7.1 trigger) → **degraded**, `degraded_reason: pack_quality_floor`
3. `manifest.quality_tier == minimal` (Principal 이 `onto domain init` 시 선언) → **degraded**, `degraded_reason: pack_tier_minimal`
4. `optional: true` file 일부 부재 → **degraded**, `degraded_reason: pack_optional_missing`
5. 모든 조건 통과 → **full**

복수 조건 동시 발생 시 **priority order 로 single `degraded_reason`** 저장 (precedence 가 낮은 reason 은 raw.yml 에 기록 안 됨 — audit 가 필요하면 manifest 재평가로 도출 가능). 단일 reason 유지가 consumer 인터페이스 단순성 보장.

**halt 조건** (inference_mode 값이 아니라 raw.yml 미생성):
- `session_domain == none` + **non-interactive** + `--v0-only` 부재
- `manifest.yaml` 부재
- `manifest_schema_version` 이 runtime supported list 에 없음

이 3 halt 는 Principal 명시 조치 후 재 reconstruct 해야 하는 **fail-close gate**. §5.2 참조.

---

## 5. Fail-close Contract

### 5.1 v1 entry conditions (AND 조건)

1. `session_domain != none`
2. `~/.onto/domains/{session_domain}/manifest.yaml` 존재 AND `manifest_schema_version` 이 runtime 의 supported version list 에 포함 AND `required: true` 파일 전수 존재
3. `--v0-only` flag 부재

### 5.2 Inference Mode 3 분기 + Halt 분기 (r4 정밀화 — UF-LOGIC-NO-DOMAIN-MODE-CONFLICT 해소)

r3 의 table 이 "5.1 조건 미충족 → none" 으로 모든 실패 경로를 none 으로 라우팅했으나, 실제로는 **halt 조건** 과 **none mode** 가 명확히 구별되어야 한다. r4 는 두 분기를 분리:

**Mode 3 분기** (raw.yml 생성됨):

| Mode | 조건 | 동작 | raw.yml meta |
|---|---|---|---|
| **full** | 5.1 의 3 조건 모두 만족 AND `quality_tier: full` AND `optional` 파일 전수 존재 AND **`pack_quality_floor` 통과** (§4.7.1 precedence 5 — 모든 조건 통과 시에만 full, r7 sync — D1 해소) | Hook α + β + γ + δ 전수. 정상 | `inference_mode: full` |
| **degraded** | 5.1 의 3 조건 모두 만족 AND §4.7.1 precedence 2~4 중 하나 매칭 (`pack_quality_floor` / `pack_tier_minimal` / `pack_optional_missing`) | v1 진입. **interactive 에서는 warning + Principal confirm 필수**, **non-interactive 에서는 warning log + auto-continue** (r5 Contested 3 해소 — §5.4 상세) | `inference_mode: degraded` + `degraded_reason` ∈ §4.7.1 precedence order |
| **none** (v0 fallback) | (a) `--v0-only` flag 명시 OR (b) `session_domain == none` + **interactive TTY** + Principal 이 fallback 승인 | v0 모드 진행. Hook α/γ skip | `inference_mode: none` + `fallback_reason` ∈ {user_flag, principal_confirmed_no_domain} |

**Halt 분기** (raw.yml 미생성, exit code 비-0):

| Halt 원인 | 조건 | Principal 조치 |
|---|---|---|
| no-domain 비-TTY | `session_domain == none` + **non-interactive** + `--v0-only` 부재 | `--v0-only` 추가 또는 `--domain <name>` 명시 후 재실행 |
| manifest 부재 | `~/.onto/domains/{domain}/manifest.yaml` 부재 | `onto domain init <domain>` 실행 후 재 reconstruct |
| manifest version 미지원 | `manifest_schema_version` 이 runtime supported list 에 없음 | `onto domain manifest-migrate` (v1.1 backlog) 또는 runtime downgrade |

이 3 halt 는 **`inference_mode` 값이 아니다** — raw.yml 이 생성되지 않고 runtime 이 명시 guidance 와 함께 종료. Principal 이 조치한 뒤 재실행. silent fallback 경로 없음.

### 5.3 no-domain 경로 통일 (r3 — conditional consensus 해소)

r2 의 문제: interactive 는 Principal confirm, non-interactive 는 "continue with warning log" — authority semantics 불일치.

**r3 통일**: 두 branch 모두 **Principal 명시 동의 필수**. silent fallback 금지.

| Branch | 동작 |
|---|---|
| **interactive (TTY)** | Start 시 halt + prompt: "No domain specified. v1 mode requires a domain pack. Proceed with v0 fallback (no rationale inference)? [y/n]". y → v0 fallback 진입, n → abort |
| **non-interactive (CI)** | **fail-fast** — "No domain specified. For v0 fallback in non-interactive mode, add `--v0-only` flag explicitly." exit code 비-0 |

근거: v1 의 meaning layer 를 사용자 인지 없이 silent 하게 skip 하면 v1 명칭 훼손 (axiology "fail-close + prompt-path contract parity"). non-interactive 는 명시 flag 를 필수로 하여 **Principal 의도가 반드시 명시** 되게 한다.

### 5.4 degraded domain pack 처리 (r5 Contested 3 해소 — interactive/non-interactive 분리)

r2~r4 는 "warning + continue" 와 "Principal interactive confirm" 을 혼용 기술. r5 에서는 no-domain 경로 (§5.3) 와 동일한 구조로 **branch 별 명확한 policy** 로 통일:

| Branch | 동작 |
|---|---|
| **interactive (TTY)** | Start 시 halt + prompt: "Domain pack quality degraded (reason: {degraded_reason}). Proceed with v1 degraded mode? [y/n]". y → v1 degraded 진입, n → abort |
| **non-interactive (CI)** | warning log 출력 후 **auto-continue** with `inference_mode: degraded` + `degraded_reason` 기록. fail-fast 아님 (degraded 는 scope 내부 — pack 이 존재하고 entry conditions 만족, 단지 quality 낮음) |

**no-domain (§5.3) 과 degraded (§5.4) 의 차이**:
- **no-domain non-interactive → fail-fast** (pack 자체 없음, v1 entry 실패, Principal 명시 의도 필수)
- **degraded non-interactive → auto-continue** (pack 있고 v1 entry 성공, quality 만 낮음, CI 연속 실행 필요)

이 차이는 CI 환경에서 "pack 없음" 은 설정 오류 (사람 개입 필요) 이고 "pack 있으나 품질 낮음" 은 운영 수용 가능 상태 (log 기록 + continue) 라는 구별.

### 5.5 `--v0-only` flag

**용도**: Principal 이 도메인 pack 이 있어도 v1 을 의도적으로 skip.

**동작**:
- v0 fallback mode 로 강제 진입 (`inference_mode: none`)
- raw.yml `meta.fallback_reason: user_flag`
- Hook α/γ skip

**rename 규약**: `--skip-intent-inference` 는 backward-compat alias (v1.0 에서 제거).

### 5.6 fail-close invariant

`meta.inference_mode == full | degraded` 인 raw.yml 의 모든 element 는 `intent_inference.rationale_state` 가 terminal state **7 중 하나** (r5 업데이트). intermediate state 저장 = Runtime bug.

---

## 6. Domain-pack Manifest Contract (B2 재설계 — r3)

### 6.1 Authority 분리 원칙 (r3 핵심)

**결정**: reconstruct 는 manifest 의 **consumer only**. runtime 이 manifest 를 자동 생성하지 않는다.

| 역할 | 주체 | mechanism (tool) |
|---|---|---|
| **Producer** (manifest 생성·편집의 **책임자**) | 사용자 (Principal) | `onto domain init <name>` CLI — Principal 이 manifest 를 생성·편집할 때 사용하는 tool. CLI 자체가 Producer 자격은 아님. Principal 이 Producer |
| **Consumer** (manifest 읽기·소비) | reconstruct runtime | — (본 v1 scope) |

**seat 단일화 (r4 — 3차 review disagreement 해소)**: Producer 는 **Principal 만**. `onto domain init` 은 Principal 이 Producer 역할을 수행하는 **mechanism (tool)** — 별도 seat 이 아니다. 이 구분이 중요한 이유: 만약 CLI 자체를 Producer 로 놓으면 authority 가 tool 에 있는 것처럼 오해될 수 있음. authority 는 Principal 에게 있고, CLI 는 Principal 이 그 authority 를 행사하는 수단. `--config` non-interactive 모드도 Principal 이 config 를 작성한 것이므로 여전히 Principal 이 Producer.

이 분리가 필요한 이유: 1 세션의 runtime 이 producer + consumer 를 겸하면 (a) 자동 생성된 manifest 가 바로 v1 entry evidence 로 elevate 되어 **input trust 원천이 모호** 해지고, (b) product-locality 위반 (runtime 이 authority 를 만들어 자기가 소비), (c) legacy pack 이 자동으로 v1 authoritative 로 승격되어 Principal 의사 없이 품질 미검증된 pack 이 사용됨. 2차 review axiology 가 지적한 governance 오류.

**reconstruct runtime 의 manifest 부재 처리**:

```
If manifest.yaml is missing at reconstruct start:
  1. Halt with guidance message:
     "Domain pack at ~/.onto/domains/{domain}/ has no manifest.yaml.
      v1 mode requires an explicit manifest.
      
      To create one:
        onto domain init {domain}              # interactive, new pack
        onto domain init --migrate-existing {domain}  # migrate legacy pack
      
      To proceed without v1 intent inference:
        re-run reconstruct with --v0-only flag"
  2. exit code 비-0
```

silent fallback 금지 — 사용자 의도가 명시되지 않은 채 v1 이 skip 되는 경로 제거.

### 6.2 manifest.yaml schema

경로: `~/.onto/domains/{domain}/manifest.yaml`

```yaml
manifest_schema_version: "1.0"             # r3 — parse-time compatibility check 대상
domain_name: "{domain}"
version: "0.3.0"                           # domain content semver
version_hash: "{content hash}"
last_updated: "2026-04-22"

referenced_files:
  - path: "concepts.md"
    purpose: "domain concept definitions"
    required: true
    min_headings: 3                        # quality floor (optional per-file)
  - path: "structure_spec.md"
    required: true
  - path: "logic_rules.md"
    required: true
  - path: "domain_scope.md"
    required: true
  - path: "dependency_rules.md"
    required: false
  - path: "conciseness_rules.md"
    required: false
  - path: "competency_qs.md"
    required: false
  - path: "extension_cases.md"
    required: false

quality_tier: full | partial | minimal     # Principal 이 init 시 선언
upgrade_status: completed | in_progress | not_started
notes: "{자유 기술 — Principal 용}"
```

### 6.3 `manifest_schema_version` parse-time compatibility rule (UF-evolution-manifest-compat — r3)

reconstruct runtime 은 manifest 를 load 할 때 schema version 검사:

```
supported_manifest_schema_versions = ["1.0"]    # runtime 내부 정의

If manifest.manifest_schema_version not in supported_list:
  Halt with guidance:
    "Manifest schema version {x} not supported by this reconstruct runtime
     (supports: {supported_list}).
     
     To upgrade the manifest:
       onto domain manifest-migrate {domain} --to {target_version}
     
     Or downgrade reconstruct runtime to a compatible version."
  exit code 비-0
```

미래 v1.1 / v2.0 manifest schema 를 대비한 migration CLI (`onto domain manifest-migrate`) 는 본 v1 범위 밖 (backlog §12). v1 초기는 `"1.0"` 단일 버전만.

### 6.4 `onto domain init` CLI contract (B2 producer 분리 — r3)

본 CLI 는 v1 과 함께 도입되지만 reconstruct 와는 별도의 entry — **Principal 이 한 번 실행** 하여 manifest 생성. reconstruct 는 이후 consumer 로만 동작.

**usage**:

```
# 신규 pack (interactive)
onto domain init <name>

# legacy pack migrate (interactive)
onto domain init --migrate-existing <name>

# CI (non-interactive) — config file 필수
onto domain init <name> --config <path-to-init.yaml>
```

**interactive flow**:
1. 기존 디렉토리 scan → 모든 `*.md` 파일 나열
2. 각 파일의 `required: true / false` 를 Principal 이 선택
3. `quality_tier` 선언 (full / partial / minimal)
4. `upgrade_status`, `notes` 입력
5. version_hash 계산 후 manifest.yaml 작성

**non-interactive 는 explicit config 필수** — Principal 의도 명시 보장.

### 6.5 기존 11 도메인 migration

현재 `~/.onto/domains/` 의 11 도메인은 manifest.yaml 미보유. migration 정책:

| 단계 | 주체 |
|---|---|
| 1. 첫 reconstruct 시도 | runtime 이 halt + `onto domain init --migrate-existing` guidance |
| 2. `onto domain init --migrate-existing` 실행 | Principal interactive — required/optional 선언 + tier 선언 |
| 3. 재 reconstruct | manifest 이미 존재 → v1 진입 |

**reconstruct runtime 의 자동 생성 경로는 존재하지 않는다** — Principal 이 init 을 실행할 때까지 해당 도메인으로의 v1 은 진입 불가.

---

## 7. Hook Points — Lifecycle 을 구현하는 시점

### 7.1 Hook α — Rationale Proposer (Stage 1 → 2 transition)

**시점**: Stage 1 종료 직후, `module_inventory` 가 entity 목록으로 교체된 직후.

**v1 entry 조건 확인 (§5.1)**: `inference_mode ∈ {full, degraded}` 일 때만 실행.

**agent**: `Rationale Proposer` (fresh, Axiology Adjudicator 패턴 동형). role: `.onto/roles/rationale-proposer.md`.

**입력**:
- `context_brief.system_purpose`
- Stage 1 확정 entity 목록
- manifest.yaml 및 referenced_files content
- `manifest.version_hash`, `manifest_schema_version` (provenance 기록용)

**출력 (directive)**:

```yaml
rationale_proposer_directive:
  proposals:
    - target_element_id: {entity id}
      outcome: proposed | gap | domain_scope_miss | domain_pack_incomplete
      # outcome == proposed 시:
      inferred_meaning: "{...}"
      justification: "{...}"
      domain_refs: [...]
      confidence: low | medium | high
      # outcome == gap 시:
      gap_reason: "{예: 근거 불충분}"
      # outcome == domain_scope_miss 시:
      scope_miss_reason: "{예: entity 가 domain 범위 밖}"
      # outcome == domain_pack_incomplete 시:
      incompleteness_reason: "{예: 해당 개념 pack 에 부재하지만 domain 범위 내}"
  provenance:
    proposed_at: "{ISO 8601}"
    proposer_contract_version: "1.0"
    manifest_schema_version: "1.0"
    domain_manifest_version: "{manifest.version}"
    domain_manifest_hash: "{hash}"
    domain_quality_tier: full | partial | minimal
    session_id: "{id}"
    runtime_version: "{version}"
```

**runtime apply**: Stage transition 전용 runtime step. directive 의 각 proposal 을 atomic write.

**실패 처리**:
- **full failure**: Stage 2 진입 전 halt + retry / `--v0-only` 전환 선택
- **partial failure**: 처리 entity 만 전이, 미처리는 `gap` + `gap_reason: "proposer_partial_failure"`

### 7.2 Hook β — α 의 gated propagation rule (독립 hook 없음)

Stage 2 round N Explorer prompt 구성 시, 다음 조건 **모두** 만족하는 element 의 `inferred_meaning` + `justification` 만 `[entity_intent_inferences]` 블록에 포함:

- `rationale_state` ∈ {`proposed`, `reviewed`, `principal_accepted`, `principal_modified`}
- `confidence` ∈ {`medium`, `high`}

**제외**: `low` / `gap` / `domain_pack_incomplete` / `domain_scope_miss` / `principal_rejected` / `principal_deferred` / `carry_forward`.

Lens 에는 전량 제외 (v0 anonymization 연장).

### 7.3 Hook γ — Rationale Reviewer (Phase 2 Step 2c)

**시점**: Phase 2 Step 2 dispatch 시 2a/2b 와 parallel.

**agent**: `Rationale Reviewer` (fresh). role: `.onto/roles/rationale-reviewer.md`.

**입력**:
- 전체 wip.yml
- manifest.yaml + referenced_files
- `context_brief.system_purpose`

**출력 (directive, wip.yml 직접 쓰기 금지 — Synthesize 동형)**:

```yaml
rationale_reviewer_directive:
  updates:
    - target_element_id: {id}
      operation: confirm | revise | mark_domain_scope_miss | mark_domain_pack_incomplete | add_for_stage2_entity
      # revise / add_for_stage2_entity 시:
      new_inferred_meaning: "{...}"
      new_justification: "{...}"
      new_domain_refs: [...]
      new_confidence: {level}
      reason: "{1 문장}"
  provenance:
    reviewed_at: "{ISO 8601}"
    reviewed_by: "rationale-reviewer"
    reviewer_contract_version: "1.0"
```

**`add_for_stage2_entity` operation 제약 (B3 조치 — r3)**:

```
Validation rule (runtime 결정적):
  - target_element_id 는 wip.yml.elements[] 에 **이미 존재** 해야 함
  - 존재하지 않는 id → Runtime reject directive + log invalid
  - Reviewer 는 **entity 생성 불가** — 기존 element 의 intent_inference 보완만
  - 새 entity 발견은 Explorer 의 책임 (Stage 2 round 에서 수행됨)

이로써 Reviewer 가 silently generator territory 로 재편입되는 경로를 차단.
```

### 7.4 Hook γ apply-seat single bridge (B3 핵심 — r3)

r2 의 2차 review BLOCKING #3 을 해소: Step 2c directive 가 어떻게 wip.yml 에 반영되는지 **explicit 3-step bridge** 로 명시.

```
Step 2c (parallel with 2a/2b):
  Rationale Reviewer fresh agent spawn
    ↓ (emit)
  rationale_reviewer_directive          (wip.yml 쓰기 금지 — directive only)
    ↓ (carried to Step 4a)
Step 4a (Synthesize aggregate):
  Synthesize 가 2a/2b/2c 의 directives 를 단일 finalization directive 로 통합
    ↓ (emit)
  finalization_directive.rationale_updates: [...]
    ↓ (carried to Step 4b)
Step 4b (Runtime apply):
  Runtime 이 finalization_directive 를 atomic apply to wip.yml
  rationale_updates 의 각 update 를 검증 (schema + add_for_stage2_entity 제약 등)
    - invalid 하나라도 있으면 entire directive reject (partial application 금지)
    - 동일 element 에 multiple update → reject
  validated updates 를 intent_inference field 에 write
```

**핵심 원칙**: 
1. Reviewer agent 는 **wip.yml 에 직접 쓰지 않는다** (runtime sole-writer 보존)
2. Step 2c → Step 4a → Step 4b 는 **단일 bridge** — 다른 경로로 rationale 이 wip.yml 에 진입하지 않는다
3. Runtime 의 validation 은 **atomic** — partial application 은 Runtime bug

### 7.5 Hook γ failure/degradation contract

**full failure**:
- Step 2c skip. Step 4a directive 에 `rationale_review_degraded: true` flag
- 모든 `rationale_state == proposed` element 가 Phase 3 판정 대상 (reviewed 없이)
- heading 에 "Rationale review failed — all proposed rationales require Principal decision"
- degradation counter 증가 (`meta.rationale_reviewer_failures_streak`)

**partial failure**:
- 처리 element 는 operation 별 전이
- 미처리는 `proposed` 유지 + Phase 3 에 "pending γ review" 표식
- Fail-loud

**degradation counter rule**: v0 Adjudicator/Synthesize 동형. Stage transition 에서 reset.

**Phase 3 surface → Phase 3.5 terminal 전이 (r4 추가 — B5 해소)**: γ-degraded 시 `proposed` / `gap` / `domain_pack_incomplete` element 가 Phase 3 에 surface 한다. Principal action → terminal state 매핑은 §7.9 의 5 테이블 (source state 별) 에서 결정적으로 정의.

### 7.6 Hook δ — Phase 3 Principal 검증 surface (r3 정밀화)

**Ontology Elements 표**:

```
| # | Type | Name | Certainty | Stage | Round | Rationale | Confidence | Summary |
```

`rationale_state` 별 표시:
- `proposed` — Rationale 표시 + 회색 + "pending review"
- `reviewed` — Rationale 표시 + 정상
- `domain_scope_miss` — "(도메인 범위 밖)" + 회색 + override 가능
- `domain_pack_incomplete` — "(pack 에 개념 부재)" + 노랑 + Principal 조치 필요
- `gap` — "(추론 실패)" + 빨강

### 7.7 Phase 3 evidence surface — exhaustive 원칙 (conditional consensus 해소 — r3)

r2 의 2차 review conditional: "throttled UI 가 rationale 요약만 보여주고 justification/domain_refs 숨김" 지적. r3 해소:

**individual item display** (max_individual_items 이하):
- `inferred_meaning` 전수 표시
- `justification` 전수 표시
- `domain_refs[]` 전수 표시 (manifest_ref + heading + excerpt)
- confidence 표시

**group summary sample (3 per group)**:
- 각 sample 도 `inferred_meaning` + `justification` + `domain_refs` 전수 노출 (hover/expander 가 아니라 inline)
- group 전체 elements 목록은 "View all {n} elements" expander 로 제공 — 펼치면 전원 evidence 표시

**γ full-failure 시 — exhaustive collection**:
- 모든 `rationale_state == proposed` element 가 Phase 3 판정 대상
- throttling 은 적용되지만 **throttled-out element 수가 0 이어서는 안 됨** — 사용자가 "throttled 되어 누락된 element 목록" 을 명시 확인 가능하도록 summary footer 에 "X elements not shown due to throttling — view all at `.onto/builds/{session}/rationale-queue.yaml`" 표시
- `rationale-queue.yaml` 은 Phase 3 rendering 시점에 runtime 이 전체 Principal 판정 대상 element 를 exhaustive 하게 기록한 보조 artifact

이로써 Principal 은 **"per-item explicit action 을 남긴 element"** 와 **"남기지 않은 element"** 를 명확히 구별 가능 — §4.3 의 carry_forward 판정과 정합. 단, "남기지 않은" 이 "읽지 않은" 과 동치가 아님을 유의 (§4.3 상단 참조).

### 7.8 Phase 3 throttling (rendering 알고리즘)

config (r2 와 동일):

```yaml
config.reconstruct.phase3_rationale_review:
  max_individual_items: 20
  grouping_threshold: 5
  group_summary_sample_count: 3
```

**rendering 알고리즘** (r2 와 동일): priority 계산 → 상위 `max_individual_items` 는 individual, 나머지는 group.

Phase 3.5 terminal 전이 매핑은 source rationale_state 에 따라 5 종 분기. §7.9 에서 comprehensive 테이블로 정의.

### 7.9 Principal action → terminal state 매핑 (B5 + B6 해소 — r4 신규)

3차 review BLOCKING #2 (γ-degraded 시 `proposed` / `gap` 의 terminal 전이 미정) + BLOCKING #3 (`domain_scope_miss` override contract 모호) 을 해소하기 위해 **source rationale_state 별로 Principal action 과 terminal state 의 매핑을 1:1 로 고정**.

Phase 3.5 write-back 시 Runtime 이 결정적으로 판정 (LLM 불개입). Principal action 은 `phase3_user_responses.rationale_decisions[].action` 과 `batch_actions[].action` 에서 읽음.

#### 7.9.1 `reviewed` → terminal (r3 유지)

γ 가 정상적으로 review 한 element. v1 의 정상 경로.

| Principal action | terminal state | principal_judged_at |
|---|---|---|
| accept (individual or batch) | principal_accepted | populate |
| reject (individual or batch) | principal_rejected | populate |
| modify (**individual only** — batch 에서는 불가) | principal_modified | populate |
| defer (individual or batch) | principal_deferred | populate |
| 미판정 + global `confirmed` | carry_forward | **null** |

#### 7.9.2 `proposed` → terminal (γ-degraded 시, r4 신규)

γ full failure 또는 partial failure 시 γ review 없이 Phase 3 에 surface 한 element. Principal 판정이 γ 검증을 대체.

| Principal action | terminal state | principal_judged_at |
|---|---|---|
| accept (individual or batch) | principal_accepted | populate |
| reject (individual or batch) | principal_rejected | populate |
| modify (individual only) | principal_modified | populate |
| defer (individual or batch) | principal_deferred | populate |
| 미판정 + global `confirmed` | carry_forward | **null** |

#### 7.9.3 `gap` → terminal (r4 신규, r5 state split)

rationale 이 없는 상태 (α 실패 또는 근거 불충분). **`reject` 액션 disabled** — rationale 이 없으므로 reject 대상 없음. UI 에 reject 버튼 미표시.

**r5 Contested 1 해소**: `mark_acceptable_gap` 과 `defer` 가 r4 에서 같은 `principal_deferred` 로 terminate 되어 audit 상 "accepted absence" vs "later revisit" 구별 상실 문제를 해소. `mark_acceptable_gap` 의 terminal 을 신규 `principal_accepted_gap` 으로 분리.

| Principal action | terminal state | principal_judged_at | 의미 |
|---|---|---|---|
| provide_rationale (individual — new inferred_meaning + justification 제공) | principal_modified | populate | Principal 이 rationale 직접 제공 |
| mark_acceptable_gap (individual — rationale 없이 저장 OK, 재판정 의도 **없음**) | **principal_accepted_gap** | populate | Principal 이 **현재 상태 수용**. audit consumer 는 "rationale 불필요 합의" 로 해석 |
| **mark_acceptable_gap_all (batch)** (r6 추가 — C2 해소) | **principal_accepted_gap** | populate | batch 도 explicit action. group 전체 "rationale 없이 저장 OK" |
| defer (individual — pack 업그레이드 대기, 재판정 의도 **있음**) | principal_deferred | populate | pack 후속 업그레이드 후 재 reconstruct 에서 재판정 대상 |
| **defer_all (batch)** | principal_deferred | populate | group 전체 defer |
| reject | **disabled** | — | gap 에는 reject 대상 없음 |
| 미판정 + global `confirmed` | carry_forward | **null** | — |

#### 7.9.4 `domain_pack_incomplete` → terminal (r4 신규, r5 state split, r6 batch close)

γ 가 "pack 에 대응 개념 부재" 로 명시 판정한 state. Principal action 은 `gap` 과 유사.

| Principal action | terminal state | principal_judged_at |
|---|---|---|
| provide_rationale (individual) | principal_modified | populate |
| mark_acceptable_gap (individual, 재판정 의도 **없음**) | **principal_accepted_gap** | populate |
| **mark_acceptable_gap_all (batch)** (r6 추가) | **principal_accepted_gap** | populate |
| defer (individual, pack 업그레이드 대기, 재판정 의도 **있음**) | principal_deferred | populate |
| **defer_all (batch)** | principal_deferred | populate |
| reject | **disabled** | — |
| 미판정 + global `confirmed` | carry_forward | **null** |

#### 7.9.5 `domain_scope_miss` → terminal (B6 해소 — r4)

γ 가 "이 element 는 domain 범위 밖" 으로 판정한 terminal state. Phase 3 에서 Principal 이 확인/override 가능. **special case**: 미판정 시 `carry_forward` 로 가지 않고 `domain_scope_miss` 를 유지 (§4.6 invariant 6 참조).

| Principal action | terminal state | principal_judged_at |
|---|---|---|
| accept (scope miss 확인) | domain_scope_miss (유지) | populate |
| override (실은 scope 내부, rationale 제공) | principal_modified | populate |
| defer | principal_deferred | populate |
| reject | **disabled** | — |
| 미판정 + global `confirmed` | **domain_scope_miss (유지)** | **null** (special case) |

**special case 의 audit 의미 (r6 prose sweep)**: `domain_scope_miss` + `principal_judged_at == null` 는 "γ 판정이 있고 Principal 의 per-item explicit action 기록이 없음" 으로 해석. Principal 이 실제 검토했는지 여부는 본 state 로 판별 불가 (§4.6 invariant 9 참조). raw.yml consumer (예: govern audit) 는 이를 `principal_*` 보다 낮은 가중치로 처리. γ 판정이 이미 "audit-ready terminal" 이기 때문에 carry_forward 로 강제 전이할 필요 없음.

#### 7.9.6 매핑 rule 요약 (r5 업데이트)

1. **`principal_accepted / rejected / modified / deferred / accepted_gap`**: Principal explicit action 필수. `principal_judged_at` populate
2. **`principal_accepted_gap` vs `principal_deferred`** (r5 신규 구별): 둘 다 rationale 이 없는 상태에서 Principal 의 explicit action 결과이지만 **재판정 의도** 로 구별.
   - `principal_accepted_gap`: "rationale 없음을 현재 상태로 수용" — 재 reconstruct 의 판정 대상 **아님**
   - `principal_deferred`: "pack upgrade 후 재판정" — 재 reconstruct 의 판정 대상 **맞음**
3. **`carry_forward`**: global `confirmed` + per-item (individual + batch) explicit action 전무. `principal_judged_at = null`. **`domain_scope_miss` source 는 제외** (special case §7.9.5)
4. **`domain_scope_miss`**: γ 판정. Principal 유지 or override 가능. 미판정 시 γ terminal 유지 + `principal_judged_at = null`
5. **`reject` action disabled**: `gap`, `domain_pack_incomplete`, `domain_scope_miss` source 는 UI 에 reject 버튼 미표시 (rationale 이 없거나 γ 가 이미 판정)
6. **`modify` action**: batch 에서는 불가 (개별 rationale content 필요). individual only
7. **`mark_acceptable_gap` action**: `gap` + `domain_pack_incomplete` source 에서만 의미. `reviewed` / `domain_scope_miss` source 는 해당 없음

---

## 8. v1 flow 의 4 축 분해 (role/artifact)

v0 와 비교하여 v1 이 추가/변경하는 책임:

| 단계 | 사용자 | LLM | runtime | script |
|---|---|---|---|---|
| Start | **변경**: (1) manifest 부재 시 halt + `onto domain init` guidance. (2) no-domain 시 interactive confirm / non-interactive fail-fast (§5.3). (3) degraded 시 interactive confirm / non-interactive auto-continue (§5.4) | — | **변경**: §5.1 entry check + §4.7.1 precedence 로 inference_mode/degraded_reason 판정 + `manifest_schema_version` compat check | **변경**: manifest.yaml load (부재 시 halt, 자동 생성 없음) |
| Phase 0.5.1~5 | 변동 없음 | 변동 없음 | 변동 없음 | 변동 없음 |
| Phase 1 Round N (Stage 1) | 변동 없음 | 변동 없음 | 변동 없음 | 변동 없음 |
| **Stage 1→2 Transition** | 변동 없음 | **Hook α Rationale Proposer** (fresh) | **변경**: Proposer directive apply + intent_inference 초기 populate | 변동 없음 |
| Phase 1 Round N (Stage 2) | 변동 없음 | **변경**: Explorer prompt 에 §7.2 gated propagation | Explorer prompt 구성 시 gating | 변동 없음 |
| Phase 2 Step 2 | 변동 없음 | **Hook γ Rationale Reviewer** (fresh, 2c parallel) | **변경**: 2a/2b/2c dispatch | 변동 없음 |
| Phase 2 Step 4 (r3 명시) | 변동 없음 | **변경**: Synthesize aggregates Step 2c directive into finalization directive.rationale_updates | **변경**: atomic apply with add_for_stage2_entity validation | 변동 없음 |
| Phase 3 | **변경**: Rationale + evidence exhaustive + group batch UI | — | **변경**: throttling + exhaustive collection + rationale-queue.yaml | 변동 없음 |
| Phase 3.5 | 변동 없음 | — | **변경**: §4.3 결정 rule + terminal 전이 + §4.6 invariant | 변동 없음 |
| Phase 4 Save | 변동 없음 | — | **변경**: raw.yml 에 inference_mode + manifest_schema_version + intent_inference 전량 | 변동 없음 |
| Phase 5 (optional) | 변동 없음 | **변경 (optional)**: rejected rationale → domain upgrade hint | 변동 없음 | 변동 없음 |
| Separate CLI: `onto domain init` | **신규**: interactive manifest 작성 | — | — | **신규**: producer CLI (reconstruct 와 분리) |

---

## 9. 비용·위험 분석

### 9.1 LLM 호출 비용
- α: Stage 전환 시 1 회 batch
- γ: Step 2c 에서 1 회 fresh
- 총 추가: 2 회 (세션 전체 5~30 회 대비 5~10% 증가)

### 9.2 품질 위험 + 완화책

| 위험 | 완화책 |
|---|---|
| Hallucination | `domain_refs` 필수. empty 시 `confidence=low`. γ 검증. δ Principal 판정 |
| Anchoring bias | §7.2 gating (medium+ 만). "hint, not fact" prompt. Lens 격리 |
| Domain mismatch | `domain_scope_miss` + `domain_pack_incomplete` 분리 판정 + Principal 조치 |
| Principal 인지 부하 | §7.6 throttling + §7.7 evidence exhaustive |
| Partial γ failure silent 수용 | Fail-loud + pending γ review 표식 + degradation counter |
| Manifest authority 훼손 | §6.1 authority 분리 — producer / consumer 역할 명확 |
| Silent v0 fallback | §5.3 통일 — interactive confirm 필수, non-interactive fail-fast |

### 9.3 §14.6 invariant 적용 확인

- `intent_inference` 는 wip.yml / raw.yml 내부 field ✅
- `manifest.yaml` 은 `~/.onto/domains/{domain}/` 내부 — 기존 도메인 sink 연장 ✅
- `rationale-queue.yaml` (§7.7) 은 `.onto/builds/{session}/` 내부 — reconstruct 본질 sink 연장 ✅
- Proposer / Reviewer directive 는 transient ✅
- dogfood off 시 본질 sink 정상 작동 ✅

---

## 10. Step 1 결정 표면 (revision 3)

§4~7 구조 결정이 많은 원 Q 를 자동 해소. 결정 표면:

| # | 결정 | 옵션 | 권장 |
|---|---|---|---|
| Q1 | Canonical seat 단일화 | A. `intent_inference` 단일 / B. 다중 | A |
| Q2 | rationale_state enum 채택 | A. §4.2 의 5 intermediate + **7 terminal** (r5 업데이트, principal_accepted_gap 포함) / B. 단순화 | A |
| Q3 | Hook α 주체 | A. Rationale Proposer fresh agent / B. Explorer 확장 | A |
| Q4 | Hook β 성격 | A. α 의 gated propagation rule / B. independent hook | A |
| Q5 | Hook γ 주체 | A. Rationale Reviewer fresh agent / B. lens 확장 | A |
| Q6 | Hook γ 실패 처리 | A. §7.5 escalation + counter / B. silent partial | A |
| Q7 | Principal 검증 표면 | A. Phase 3 내부 + throttling + evidence exhaustive / B. 독립 Phase | A |
| Q8 | Fail-close mode | A. §5 의 full/degraded/none 3 분기 / B. v1/v0 2 분기 | A |
| Q9 | Domain-pack manifest | A. §6 manifest.yaml + consumer 전용 / B. 8 md hardcode | A |
| Q10 | `--skip-intent-inference` rename | A. `--v0-only` + alias / B. 기존 유지 | A |
| Q11 | §14.6 invariant 적용 | A. Step 1 명시 + checklist | A |
| Q12 (r3) | Manifest producer CLI | A. `onto domain init` 별도 CLI / B. reconstruct 자동 생성 (review 반대) | A |
| Q13 (r3) | Manifest schema version | A. `manifest_schema_version: "1.0"` + parse-time compat + future migration CLI / B. 미관리 | A |
| Q14 (r3) | `out_of_domain` 분리 | A. `domain_scope_miss` + `domain_pack_incomplete` 2 state / B. 단일 상태 | A |
| Q15 (r3) | `carry_forward` 의미 | A. implicit global-only, batch 는 explicit terminal / B. batch defer 포함 | A |
| Q16 (r3) | no-domain 경로 | A. interactive + non-interactive 모두 explicit consent 필수 / B. silent with warning | A |

### 10.1 원 Q 와의 대응

- r1 Q1~Q4 → §4~7 구조가 흡수
- r2 Q1~Q11 → r3 Q1~Q11 로 계승
- r3 Q12~Q16 → 2차 review BLOCKING + conditional + UF 해소 결정

---

## 11. 본 리뷰의 위치 + Revision trail

- **Revision 1** (2026-04-22 오전): 초안
- **Revision 1 review** (`.onto/review/20260422-6763a95c/`): 9/9 consensus, 4 BLOCKING
- **Revision 2** (2026-04-22 오후): canonical seat + fail-close + manifest + rename
- **Revision 2 review** (`.onto/review/20260422-327ab3a4/`): 3 BLOCKING + 6 UF (contract detail)
- **Revision 3** (2026-04-22 저녁): contract repair — carry_forward, manifest authority, γ apply bridge, 2 state 분리, version compat, evidence exhaustive
- **Revision 3 review** (`.onto/review/20260422-cc77ecfa/`): 3 BLOCKING + 4 UF + 1 disagreement. 전반 contract detail 수선
- **Revision 4** (2026-04-22 야간): B4/B5/B6 수선 — quality vocab 정합, γ-degraded 전이 rule (§7.9 5 테이블), domain_scope_miss override + audit truth (§4.6 invariant 6), halt vs none 분기 명시, §6.1 Producer rename, pack re-entry = P2 scope 제외
- **Revision 4 review** (`.onto/review/20260422-53307585/`): 9/9 consensus on 5 repairs + 0 BLOCKING + 5 contested + 2 structural UF. 수렴 신호 강화 (BLOCKING 0), 잔여는 contract-local detail
- **Revision 5** (2026-04-23 오전): action naming 통일, `principal_accepted_gap` 신규 terminal (gap state split), `pack_quality_floor` operational 정의, degraded start policy 통일, carry_forward prose precise, §4.2 diagram 업데이트
- **Revision 5 review** (`.onto/review/20260423-0ba31c64/`): 3 consensus mirror/closure defects + 2 UF + 0 disagreement + axiology 추가 perspective 없음. 수렴 신호 강화
- **Revision 6** (2026-04-23 낮): mirror/closure sweep — carry_forward prose 전수, batch path close, Q2 stale, §4.7 summary sync, modify/provide_rationale 구별 방어
- **Revision 6 review** (`.onto/review/20260423-aa9b3f33/`): 1 D1 (§5.2 full row contradiction) + 1 UF (§14 summary drift) + 0 BLOCKING. Sync fix 2 항목만 잔존
- **Revision 7** (본 문서): §5.2 full row 에 pack_quality_floor 추가 + §14 item 21 을 4-tier precedence 로 확장
- **Next**: r7 에 대한 /onto:review 7 차 실행
- **Next**: r4 에 대한 /onto:review 4 차 실행
- **그 다음**: Step 1 결정 문서 착수 (4차 review 통과 후)
- **최종 정착**: Track B 구현 세션에서 §4~7 계약이 코드 + `.onto/processes/reconstruct.md` + `.onto/roles/rationale-{proposer,reviewer}.md` + `manifest.yaml` + `onto domain init` CLI 에 반영

## 12. 미해소 / backlog (구현 세션 진입 후)

- Rationale Proposer / Reviewer 의 English-only prompt 실문자열
- `.onto/roles/rationale-{proposer,reviewer}.md` role 본문
- `onto domain init` CLI 의 실제 interactive UX (UI prompt 문자열 + validation)
- `onto domain manifest-migrate` CLI (future schema version 대비, v1 범위 밖)
- 11 도메인의 manifest 수동 migration 실행 (Principal interactive)
- Phase 3 throttling config 의 default tuning (empirical)
- degradation counter reset 정책 세부
- `--v0-only` 시 learning extractor 수집 여부
- `domain_pack_incomplete` 대량 발생 도메인 → learn 의 domain upgrade backlog 인계
- `rationale-queue.yaml` 의 schema 세부 (§7.7)
- Phase 5 Learning 에서 rejected rationale 수집 vs learn v1 의 중복 조정

### 12.1 scope 밖 결정 (r4)

다음 항목들은 3차 review 가 발견했으나 **본 v1 contract scope 밖** 으로 명시 분류 — 이유와 대체 경로 함께 기록:

- **Pack upgrade re-entry (UF-COVERAGE-PACK-REENTRY-LIFECYCLE)** — 옵션 P2 결정 (r4):
  v1 은 **단일 reconstruct 세션 완결 contract**. `domain_pack_incomplete` / `principal_deferred` element 를 pack 업그레이드 후 재판정하려면 **새 reconstruct 세션** 실행.
  - 기존 raw.yml 의 Principal 판정은 reference 로 load 가능하나 재 reconstruct 의 Principal 판정을 override 하지 않음
  - Cross-session reconciliation (판정 이력 propagation) 은 v1.1 backlog
  - 이 결정의 근거: v1 범위를 좁게 유지 — pack upgrade 는 reconstruct 외부 workflow (별도 `onto domain init` 실행)

- **`domain_refs` stable identity (UF-EVOLUTION-DOMAIN-REF-IDENTITY)** — v1.1 backlog:
  현재 `domain_refs.manifest_ref` 는 file path (string). manifest schema v2.0 에서 stable UUID 또는 semantic identity 도입 검토. v1.0 에서는 file path + heading + excerpt 로 충분하나, pack reorganization 시 evidence 연속성 약화.

- **Provenance normalization (UF-CONCISENESS-PROVENANCE-DUPLICATION)** — implementation detail:
  element-local provenance 가 session-global facts (`manifest_schema_version`, `domain_manifest_hash`, `runtime_version`) 를 반복.
  - Contract 수준에서는 element-local 로 서술 (단순성, audit 독립성)
  - 구현 시 raw.yml save hoist — element 에서는 reference only, `meta` 에서 canonical 저장 가능
  - 구현 세션에서 storage 전략 결정 (contract 변경 없음)

## 13. 본 리뷰가 피한 것

- 구현 설계 (prompt 문자열, role 본문, CLI signature)
- Phase 번호 체계 재설계
- 도메인 문서 자체의 내용 개선 (learn 책임)
- review UX 확장
- manifest schema v2.0 설계 (future backlog)

---

## 14. Revision 7 의 중요 결정 요약 (cheatsheet)

### r1~r3 에서 확정된 결정 (유지)
1. **Single seat**: `wip.yml.elements[].intent_inference` 단일
2. **Single lifecycle**: rationale_state 5 intermediate + **7 terminal (r5: +principal_accepted_gap)**
3. **Fail-close 3-mode**: inference_mode ∈ {full, degraded, none}
4. **carry_forward precise**: implicit global 'confirmed' only
5. **Hook β 독립 폐지**: α 의 gated propagation (medium+)
6. **Hook γ failure contract**: full/partial + fail-loud + degradation counter
7. **Hook γ apply single bridge**: Step 2c → Step 4a → Step 4b (§7.4)
8. **`add_for_stage2_entity` 제약**: target_element_id 기존 entity 만
9. **Agent rename**: Rationale Proposer / Rationale Reviewer
10. **Field split**: inferred_meaning + justification + domain_refs[]
11. **Term boundary** (§1.3): intent_inference (seat) / rationale (UI+process) / inferred_meaning (payload) / justification / domain_refs
12. **Quality vocabulary** (§4.7): inference_mode / domain_quality_tier / confidence / degraded_reason / fallback_reason 분리
13. **`out_of_domain` split**: domain_scope_miss (terminal) + domain_pack_incomplete (transient)
14. **Contract versions in provenance**: proposer + reviewer + manifest_schema
15. **no-domain unified**: interactive + non-interactive 모두 explicit consent
16. **Phase 3 evidence exhaustive**: individual + group sample 전수 + rationale-queue.yaml
17. **OaC 순서 유지**: canonical seat → contract → role → artifact

### r4 신규 / 수선 결정 (B4/B5/B6 + UF + disagreement 해소)
18. **Halt vs none mode 분리** (B4, §5.2): 3 halt 조건 (no-domain non-interactive / manifest 부재 / schema version unsupported) → raw.yml 미생성. none mode 는 2 조건 (user_flag / principal_confirmed_no_domain) 만
19. **`fallback_reason` enum** (B4, §4.7): `user_flag / principal_confirmed_no_domain` — inference_mode=none 시
20. **`degraded_reason` enum** (B4, §4.7 수정): `pack_optional_missing / pack_quality_floor / pack_tier_minimal` (r3 의 `skipped_by_flag` 제거)
21. **`degraded` trigger 재정의** (B4, r7 precedence sync — UF-COVERAGE-CHEATSHEET-DEGRADED-SUMMARY-DRIFT 해소): degraded 는 §4.7.1 precedence 2~4 중 하나라도 match. 단일 `quality_tier ∈ {partial, minimal}` 축이 아니라 다음 3 하위 경로 모두 포함:
    - `pack_quality_floor` miss (`full tier` 도 가능): required file 이 min_headings 미달 or 200 bytes 미달 → degraded
    - `pack_tier_minimal`: manifest `quality_tier: minimal` → degraded
    - `pack_optional_missing` (`full tier` + optional 일부 부재): degraded
    **full mode** 는 3 경로 모두 미해당 + `quality_tier: full` + optional 전수 존재 일 때만. `full tier` 자체가 full mode 를 보장하지 않음
22. **`principal_judged_at` audit truth** (B6, §4.6 invariant 6): 실제 Principal 판정 시에만 populate. carry_forward / domain_scope_miss+미판정 = null. reviewer time backfill 금지
23. **Principal action → terminal 5 테이블** (B5+B6, §7.9): reviewed / proposed / gap / domain_pack_incomplete / domain_scope_miss 각각 매핑 명시
24. **`domain_scope_miss` special case** (B6, §7.9.5): 미판정 + global `confirmed` → carry_forward 아니라 domain_scope_miss 유지 + principal_judged_at=null. γ 가 이미 audit-ready terminal
25. **`reject` action disabled** (§7.9): gap / domain_pack_incomplete / domain_scope_miss source 에서 UI 에 reject 버튼 미표시
26. **`modify` action 은 individual only** (§7.9): batch 에서는 불가 (개별 rationale content 필요)
27. **Producer seat = Principal only** (3차 disagreement 해소, §6.1): `onto domain init` 은 Principal 의 mechanism (tool), Producer 자격 아님
28. **Pack upgrade re-entry 제외** (P2, §12.1): v1 단일 세션 완결. 업그레이드 후 새 reconstruct 세션. cross-session reconciliation 은 v1.1 backlog
29. **`domain_refs` stable identity 이연** (§12.1): v1.1 backlog — file path 에서 stable UUID/semantic identity 로 확장
30. **Provenance normalization 이연** (§12.1): implementation detail — contract 는 element-local, 구현 시 session-global hoist 가능

### r5 신규 / 수선 결정 (0 BLOCKING but 5 contested + 2 UF 해소)
31. **Phase 3.5 action naming 통일** (UF-STRUCTURE-PHASE35-PORT-MISMATCH, §4.3): `rationale_decisions[].action` + `batch_actions[].action` (r3/r4 의 `decision` 필드명 폐지). enum 은 `accept/reject/modify/defer/provide_rationale/mark_acceptable_gap/override` + batch 는 `..._all` suffix
32. **`principal_accepted_gap` 신규 terminal** (Contested 1, §4.2 + §7.9.3/4): `mark_acceptable_gap` action 의 terminal 을 `principal_deferred` 에서 분리. audit 상 "재판정 의도 없음" (accepted_gap) vs "pack upgrade 후 재판정" (deferred) 구별. terminal states 6 → 7
33. **`pack_quality_floor` operational 정의** (Contested 4, §4.7.1): trigger (min_headings 미달 OR file size < 200 bytes) + scope (required: true file 만) + precedence 4-tier (missing→halt / floor→degraded / tier_minimal→degraded / optional_missing→degraded) + single degraded_reason 저장
34. **degraded start policy 통일** (Contested 3, §5.4): no-domain 패턴과 동형 — interactive=confirm, non-interactive=auto-continue with warning log (degraded 는 scope 내부 v1 entry 성공)
35. **`carry_forward` prose precise** (Contested 5, §4.3): "not actually reviewed" 주장 제거. state 는 "per-item explicit action 부재" 만 prove. "실제 읽었는가" 여부는 별도 mechanism 필요 (v1 scope 밖)
36. **§4.2 lifecycle diagram update** (UF-STRUCTURE-LIFECYCLE-OMISSION): `domain_pack_incomplete → carry_forward` edge 추가 + `principal_accepted_gap` 전이 edges (`gap`, `domain_pack_incomplete` source 양쪽에서) 추가
37. **Phase 3.5 invariant 10** (r5 §4.6): raw.yml consumer 는 `principal_accepted_gap` vs `principal_deferred` 를 재판정 의도 기준으로 구별. `accepted_gap` 은 재 reconstruct 의 자동 재판정 queue 에 **미포함**

### r6 신규 / 수선 결정 (mirror/closure sweep — 5차 review 의 3 consensus + 2 UF 해소)
38. **carry_forward prose sweep** (C1, §4.3/§4.6 invariant 9/§7.7): 전수 "Principal 이 실제로 본 것" / "per-item 안 봄" 등 over-claim 제거. "per-item explicit action 기록 없음" 으로 엄격화. "Principal 읽음 여부는 본 state 로 판별 불가" 명시
39. **mark_acceptable_gap_all batch path close** (C2, §4.3 + §7.9.3/§7.9.4): batch_actions 의 `mark_acceptable_gap_all` → `principal_accepted_gap` terminal 명시. gap/domain_pack_incomplete source 에서만 유효 (reviewed source 에는 해당 없음)
40. **§10 Q2 terminal count 수정** (C3): "5 intermediate + 6 terminal" → "5 intermediate + 7 terminal" (r5 update 시 Q section drift 수정)
41. **§4.7 summary sync** (UF-STRUCTURE-PACK-QUALITY-FLOOR-SUMMARY-DRIFT): 참조 관계 summary 를 §4.7.1 precedence order 참조로 재작성. pack_quality_floor 포함
42. **`modify` vs `provide_rationale` 구별 방어** (UF-CONCISENESS-ACTION-AXIS-DUPLICATION, §4.3): source state × UI affordance 로 구별 (reviewed source → `modify`, gap/incomplete source → `provide_rationale`). terminal 은 단일 (`principal_modified`) — contract 간결성 + UI 의 Principal 경험 차별화 양립
