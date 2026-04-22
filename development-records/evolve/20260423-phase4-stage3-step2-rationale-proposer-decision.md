---
as_of: 2026-04-23
status: decision-approved
functional_area: phase-4-stage-3-step-2
purpose: |
  Phase 4 Stage 3 Step 2 (Hook α Rationale Proposer protocol 세부) 의
  Principal 결정 수집 문서. 사전 구조 검토 (protocol r6, 6 rounds 수렴)
  를 통해 9/9 lens clean pass 가 확인된 뒤 20 개 결정 표면 (Q-S2-1~20)
  을 Principal 에게 제시하여 승인 선언을 받는 single seat.
authority_stance: decision-record
canonicality: scaffolding
source_refs:
  protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 9/9 lens clean pass)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인)"
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md"
  step_2_handoff: "development-records/plan/20260423-phase4-stage3-step2-handoff.md"
  review_sessions_final: ".onto/review/20260423-b10952d5/ (r6 review, 9/9 clean pass)"
  invariant: ".onto/processes/govern.md §14.6"
---

# Phase 4 Stage 3 Step 2 — Rationale Proposer Protocol (Decision)

## 0. 본 문서의 목적

**사전 구조 검토 완료 후 Principal 결정 수집 단계**. protocol 문서 (r6) 가 6 rounds 의 `/onto:review` 를 거쳐 **9/9 lens clean pass** (0 BLOCKING + 0 contested + 0 UF + 0 axiology 추가 관점) 에 도달했다. 본 문서는 해당 구조 검토가 도출한 20 개 결정 표면 (Q-S2-1~20) 을 Principal 에게 제시하여 승인 선언을 수집하는 single seat 이다.

본 문서는 **설계 재논의가 아니라 decision seat** — 각 Q 의 권장 A 옵션은 6 rounds review 로 수렴된 결과이며 Principal 이 일괄 승인하는 것이 기본 경로.

## 1. Step 2 scope (간략)

**Step 2 의 범위**: Step 1 (PR #201) 이 확정한 Hook α 의 역할 + 입력 3 축 + 출력 directive 를 **mechanical 구체화** — input schema, output schema, prompt 실문자열, role 파일 본문, runtime integration, failure handling 세부. Step 1 결정 re-open 없음.

**Step 2 가 다루지 않은 것** (Step 3/4 이연): Hook γ Rationale Reviewer (Step 3), Phase 3 throttling (Step 3), Phase 3.5 write-back (Step 4), raw.yml meta (Step 4), `onto domain init` CLI (Step 4).

## 2. 결정 표면 (Q-S2-1~20)

각 Q 는 Structural Question + 옵션 + 권장 + 근거 (protocol r6 §N) 구성. 권장은 모두 A — 6 rounds 수렴 결과이며 r6 에서 9/9 lens clean pass 로 인정된 상태.

### 2.1 초기 8 결정 (r1)

| # | 결정 | 권장 | 근거 |
|---|---|---|---|
| Q-S2-1 | Input 에 `source.locations` 포함 | A (포함) | §2.1 |
| Q-S2-2 | Input 에 `relations_summary` 포함 | A (포함) | §2.1 |
| Q-S2-3 | `confidence` + empty `domain_refs` 허용 | A (허용, 자동 low) | §3.2.1 |
| Q-S2-4 | Partial failure 처리 | A (full failure 만, runtime 대리 생성 금지) | §7.2 폐지 + §7.3 |
| Q-S2-5 | Non-interactive 기본 | A (abort, silent v0 fallback 금지) | §7.1 |
| Q-S2-6 | Retry 횟수 | A (1 회) | §7.1 |
| Q-S2-7 | Prompt version bump 규약 | A (`proposer_contract_version` 별도 축) | §4.2 |
| Q-S2-8 | Confidence 자동 downgrade | A (warning + apply) | §3.7.1 |

### 2.2 r2/r3 추가 결정 (mechanical contract + state machine)

| # | 결정 | 권장 | 근거 |
|---|---|---|---|
| Q-S2-9 | `meta.stage_transition_state` field (7 enum) | A (도입) | §6.2 |
| Q-S2-10 | `meta.pack_missing_areas[]` 예약 | A (예약 + non-semantic grouping only) | §6.3.1 |
| Q-S2-11 | `intent_inference.state_reason` 단일 unified field | A (단일 field) | §3.5.1 |
| Q-S2-12 | Schema single authority | A (§3 authority, prompt/role reference only) | §3 + §4 + §5 |
| Q-S2-13 | Single-shot full-pack vs smallest-bundle | A (v1 = single-shot + trade-off 명시) | §4.1 |
| Q-S2-14 | Post-validation confidence 를 Explorer gating source | A (채택) | §6.4 |
| Q-S2-15 | `domain_refs` citation constraint | A (manifest 있고 content 주입된 파일만) | §3.7 rule 8 |
| Q-S2-16 | `alpha_failed_abandoned` state split | A (`alpha_failed_continued_v0` + `alpha_failed_aborted`) | §6.2 |
| Q-S2-17 | Per-entity truncation marker | A (`proposals[].__truncation_hint` 예약) | §3.1 |
| Q-S2-18 | `provenance.effective_injected_files[]` 예약 | A (예약) | §3.6 |
| Q-S2-19 | `pack_missing_areas` runtime grouping 경계 | A (non-semantic 만, semantic grouping 은 Step 3 Reviewer) | §6.3.1 |
| Q-S2-20 | `domain_refs` 카디널리티 0 허용 | A (0 이상 + §3.7.1 D2 auto-downgrade) | §3.2 |

### 2.3 r5 추가 (additive + required 승격)

| # | 결정 | 권장 | 근거 |
|---|---|---|---|
| Q-S2-21 (r5 신규) | `proposer_failure_downgraded` 을 Step 1 §4.7 `fallback_reason` enum 에 additive 확장 (구현 PR 에서 patch) | A (additive extension, breaking change 없음) | §7.1 `[v]` branch |
| Q-S2-22 (r5 신규) | `domain_pack_incomplete` 의 `domain_refs` required (r4 optional → r5 required) | A (scope 확인 논리 정당성) | §3.5 + §6.3 field matrix |

### 2.4 Q-S2 총합 22 점 (r1: 8 + r2~r3: 12 + r5: 2)

## 3. Decision summary table (Principal 일괄 승인)

모든 Q 의 권장은 A. 6 rounds review 수렴 결과이며 r6 에서 9/9 clean pass.

| # | 질문 (한 줄 요약) | 승인 |
|---|---|---|
| Q-S2-1 | Input `source.locations` 포함 | **A** |
| Q-S2-2 | Input `relations_summary` 포함 | **A** |
| Q-S2-3 | Empty `domain_refs` 허용 (low) | **A** |
| Q-S2-4 | Partial failure 폐지 (full only) | **A** |
| Q-S2-5 | Non-interactive abort 기본 | **A** |
| Q-S2-6 | Retry 1 회 | **A** |
| Q-S2-7 | `proposer_contract_version` 별도 축 | **A** |
| Q-S2-8 | Confidence 자동 downgrade | **A** |
| Q-S2-9 | `meta.stage_transition_state` 7 enum | **A** |
| Q-S2-10 | `pack_missing_areas[]` 예약 + non-semantic | **A** |
| Q-S2-11 | `state_reason` 단일 unified field | **A** |
| Q-S2-12 | Schema single authority | **A** |
| Q-S2-13 | Single-shot + trade-off 명시 | **A** |
| Q-S2-14 | Post-validation confidence gating | **A** |
| Q-S2-15 | `domain_refs` citation constraint | **A** |
| Q-S2-16 | `alpha_failed` state split (v0/aborted) | **A** |
| Q-S2-17 | Per-entity `__truncation_hint` | **A** |
| Q-S2-18 | `effective_injected_files[]` 예약 | **A** |
| Q-S2-19 | `pack_missing_areas` non-semantic grouping | **A** |
| Q-S2-20 | `domain_refs` 카디널리티 0 허용 | **A** |
| Q-S2-21 | `proposer_failure_downgraded` additive | **A** |
| Q-S2-22 | `domain_pack_incomplete` domain_refs required | **A** |

## 4. Principal 결정 수집

**결정 일자**: 2026-04-23
**결정 주체**: Principal (kangmin.lee.n@gmail.com)
**결정 형식**: 일괄 승인 — 22 Q 모두 권장 옵션 A

### 4.1 일괄 승인 결과

위 §3 table 의 22 Q 전수에 대해 Principal 이 권장 옵션 A 로 일괄 승인.

### 4.2 결정의 배경

- protocol 문서 (r6) 가 **9/9 lens clean pass** 도달 (0 BLOCKING + 0 contested + 0 UF + 0 axiology 추가 관점)
- 6 rounds `/onto:review` 에서 각 Q 의 옵션 A 가 구조적으로 정렬되었음이 반복 확인됨
- Principal 은 "결과물 의미성 > process 정합성" 원칙 하에 각 round 결정 (A 옵션) 을 명시 승인해왔음
- 본 일괄 승인은 그 누적 승인의 결과

### 4.3 status 전환

- 본 문서의 status: `decision-pending` → `decision-approved` (일괄 승인 직후)
- Stage 3 Step 2 는 본 승인으로 **설계 합의 완료**
- Stage 3 Step 3 진입 가능 (Hook γ Rationale Reviewer protocol 세부 설계)

### 4.4 구현 세션 input 으로 전달되는 mechanical 계약

본 Step 2 가 고정한 mechanical spec:
- **Rationale Proposer prompt** (protocol §4, English-only): agent spawn 시 이 template 사용
- **Role 파일** (protocol §5): `.onto/roles/rationale-proposer.md` 경로에 이 본문 복사 → 구현 commit
- **Runtime step 5a~5d + Stage transition state machine** (protocol §6.2): 신규 `meta.stage_transition_state` 7 enum + `meta.stage_transition_retry_count` + Stage 2 gate 확장
- **Schema validation rule 1~9** (protocol §3.7) + **downgrade rule D1~D3** (protocol §3.7.1)
- **Failure handling** (protocol §7.1): full failure + retry enforcement + [r]/[v]/[a] state transition
- **`pack_missing_areas` narrow schema** (protocol §6.3.1): domain_pack_incomplete only, non-semantic grouping, grouping_key + element_ids 만

## 5. 다음 단계

### 5.1 본 Step 2 decision 문서 commit + PR

1. protocol r6 + 본 decision 문서를 함께 commit
2. branch: `docs/phase4-stage3-step2` (이미 존재)
3. PR 제목: `docs(phase-4): Stage 3 Step 2 — Rationale Proposer protocol (decision)`

### 5.2 Stage 3 Step 3 착수 — Hook γ Rationale Reviewer protocol

본 Step 2 의 패턴을 거울 참조:
- Schema single authority (§3) + prompt/role reference
- Stage transition state machine (§6.2) 동형 패턴
- Full failure only + retry enforcement
- LLM/runtime boundary (`pack_missing_areas` non-semantic)

Step 3 의 주요 mechanical decisions:
- Input schema: 전체 wip.yml (intent_inference 포함) + manifest + referenced_files content
- Output directive: `rationale_reviewer_directive.updates[]` + operation enum (`confirm / revise / mark_domain_scope_miss / mark_domain_pack_incomplete / add_for_stage2_entity`)
- Prompt 실문자열 (English-only, Axiology Adjudicator 동형)
- Role 파일 본문: `.onto/roles/rationale-reviewer.md`
- Runtime integration: Phase 2 Step 2c parallel dispatch (Semantics / Coverage 와 병렬) + Step 4a Synthesize aggregation + Step 4b Runtime atomic apply
- Failure handling: Step 2 동형 (full failure + retry + state transition) + `rationale_review_degraded` flag 처리

### 5.3 Stage 3 Step 4 통합

Step 4 에서 Hook δ + Phase 3.5 write-back + raw.yml meta + `onto domain init` CLI 확정.

### 5.4 Stage 3 wrap-up + Track B 구현 세션

Stage 3 Step 1~4 완료 후 wrap-up 문서 + W-A-80~ W-ID 부여 + Track B 구현 세션 진입.

## 6. 본 문서의 위치

- **Previous**: Step 1 PR #201 (bae608e) — Q1~Q16 승인 + Step 2 protocol r6 (본 PR 에 포함)
- **Current**: Step 2 decision (본 문서) — Q-S2-1~22 승인
- **Next**: Step 3 (Hook γ Rationale Reviewer protocol) 별도 설계 세션
- **최종 정착**: Track B 구현 세션에서 Step 2 결정이 코드 + `.onto/processes/reconstruct.md` + `.onto/roles/rationale-proposer.md` + runtime state machine 에 반영

## 7. 구현 세션 진입 시 주의사항

### 7.1 Step 1 §4.7 fallback_reason enum 에 `proposer_failure_downgraded` 추가

Q-S2-21 의 decision — Step 1 decision doc 의 §4.7 table 에 한 row additive 추가:

```yaml
# Step 1 flow-review r7 §4.7 fallback_reason enum:
- user_flag                            # --v0-only 명시
- principal_confirmed_no_domain        # interactive TTY + Principal 승인
- proposer_failure_downgraded          # r5 Q-S2-21 additive — Rationale Proposer failure 후 [v] 선택
```

이는 breaking change 없는 additive extension — Step 1 decision 의 spirit 내 구현 detail.

### 7.2 `rationale-proposer.md` role 파일 배치

Step 2 protocol §5.1 의 본문을 `.onto/roles/rationale-proposer.md` 경로에 복사. 구현 commit 에서 track.

### 7.3 Prompt template 의 실제 agent invocation

Step 2 protocol §4 의 template 을 runtime 이 input package 와 함께 agent spawn 시 제공. Axiology Adjudicator 패턴 동형 (fresh agent per invocation).

### 7.4 wip.yml schema 확장 (Step 2 범위)

protocol §6.3 의 populate / non-populate field + `meta.stage_transition_state` + `meta.stage_transition_retry_count` + `meta.pack_missing_areas[]` + `proposals[].__truncation_hint` + `provenance.input_chunks` + `provenance.truncated_fields` + `provenance.effective_injected_files[]` 전수 반영.

## 8. 참조

- **Protocol r6** (canonical mechanical spec): `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
- **6 rounds review sessions**:
  - r1: `.onto/review/20260423-c4806103/` (5 BLOCKING)
  - r2: `.onto/review/20260423-d917a60c/` (2 BLOCKING)
  - r3: `.onto/review/20260423-0f5f98dc/` (2 BLOCKING)
  - r4: `.onto/review/20260423-b845a4e9/` (0 BLOCKING)
  - r5: `.onto/review/20260423-2fd6eb6a/` (0 BLOCKING)
  - r6: `.onto/review/20260423-b10952d5/` (**9/9 clean pass**)
- **Step 1 precedent**: `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md` + `20260423-phase4-stage3-step1-reconstruct-v1-axes.md`
- **Phase 4 handoff**: `development-records/plan/20260419-phase4-handoff.md`
- **§14.6 invariant** (정본): `.onto/processes/govern.md §14.6`
