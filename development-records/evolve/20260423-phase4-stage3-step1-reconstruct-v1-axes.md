---
as_of: 2026-04-23
status: decision-approved
functional_area: phase-4-stage-3-step-1
purpose: |
  Phase 4 Stage 3 Step 1 (reconstruct v1 차이 축 재정의) 의 Principal
  결정 수집 문서. 사전 구조 검토 (flow-review r7, 7 rounds 수렴) 를 통해
  9/9 lens clean pass 가 확인된 뒤 16 개 결정 표면 (Q1~Q16) 을 Principal
  에게 제시하여 승인/수정 선언을 받기 위한 single seat.
authority_stance: decision-record
canonicality: scaffolding
source_refs:
  flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 9/9 lens clean pass)"
  stage_1_design_input: "development-records/evolve/20260419-phase4-design-input.md §1.4 reconstruct"
  stage_2_wrap_up: "development-records/evolve/20260422-phase4-stage2-wrap-up.md"
  review_session_final: ".onto/review/20260423-df566f97/ (r7 review, 9 lens pass + synthesize infra-halted)"
  invariant: ".onto/processes/govern.md §14.6"
---

# Phase 4 Stage 3 Step 1 — Reconstruct v1 차이 축 재정의 (Decision)

## 0. 본 문서의 목적

**사전 구조 검토 완료 후 Principal 결정 수집 단계**. flow-review 문서 (r7) 가 7 rounds 의 /onto:review 를 거쳐 9/9 lens clean pass + 0 BLOCKING + 0 contested + 0 UF blocker 에 도달했다. 본 문서는 해당 구조 검토가 도출한 16 개 결정 표면 (Q1~Q16) 을 Principal 에게 제시하여 승인/수정/반려 선언을 수집하는 single seat 이다.

본 문서는 **설계 재논의가 아니라 decision seat** — flow-review 에서 권장으로 확정된 A 옵션들을 Principal 이 일괄 승인하는 것이 기본 경로이며, 특정 Q 에서 다른 옵션 선호 시 해당 Q 만 재조정한다.

## 1. Stage 3 Step 1 scope (간략)

**Step 1 의 범위**: reconstruct v1 이 v0 대비 어떻게 다른지 — 변경되는 structural axes 를 Principal 결정으로 고정. 이후 Step 2~4 는 이 Step 1 결정을 기반으로 세부 protocol / UI / sink 계약을 확정.

**v1 의 목적 재진술**: product 로부터 ontology 를 재구성하는 과정에서 product 자체에 기록되지 않은 **각 요소의 맥락·존재이유·역할을 외부 지식 (domain 지식 + product 목적 + 핵심 entity) 으로 합리적 추론** 하여 ontology 에 함께 기록한다.

flow-review 의 구조 검토가 확정한 v1 의 4 축 (사용자 / LLM / runtime / script) 와 hook 시점 (Stage 1 → 2 transition 직후에 "왜" 추론 개시) 이 본 Step 1 의 전제. 상세는 `flow-review` r7 §1~§9 참조.

## 2. 결정 표면 (Q1~Q16)

각 Q 는 **Structural Question + 옵션 + 권장 + 근거** 구성. 권장은 모두 A — flow-review 7 rounds 수렴의 결과이며 9/9 lens 가 해당 방향을 clean pass 로 인정한 상태.

---

### Q1 — Canonical seat 단일화

**질문**: rationale 관련 모든 상태를 어디에 저장할 것인가?

**옵션**:
- **A (권장)**: `wip.yml.elements[].intent_inference` 단일 field — raw.yml 에서도 동일 seat
- B: 다중 seat (meta + element + issues 분산)

**근거**: 1차 review BLOCKING #1 이 "7-seat authority ambiguity" 지적. 단일 seat 이 authority 명확성 + consumer 인터페이스 단순성 보장. flow-review §4.1.

**권장**: **A**

---

### Q2 — Rationale state lifecycle (single enum)

**질문**: rationale 의 생애 주기를 어떤 state enum 으로 표현할 것인가?

**옵션**:
- **A (권장)**: 5 intermediate (`empty / proposed / reviewed / gap / domain_pack_incomplete`) + 7 terminal (`principal_accepted / principal_rejected / principal_modified / principal_deferred / principal_accepted_gap / carry_forward / domain_scope_miss`)
- B: 단순화 (4-state; audit 구별 상실)

**근거**: 각 state 가 **서로 다른 audit query 에 답함** — Principal 판정 유형·pack 품질·scope 판정을 audit consumer (govern 등) 가 구별 처리 가능. flow-review §4.2 + §4.6 + §7.9 의 5 테이블 전수가 이 enum 을 기반으로 정의.

**권장**: **A**

---

### Q3 — Hook α (초기 rationale 생성) 의 LLM 주체

**질문**: Stage 1 → 2 transition 에서 entity 별 "왜" 추론을 수행하는 agent 는?

**옵션**:
- **A (권장)**: **`Rationale Proposer`** fresh agent 신규 도입 (Axiology Adjudicator 패턴 동형, 영속 teammate 아님)
- B: 기존 Explorer 확장 (Role Boundary 위반 — Explorer 의 "facts only, no interpretation" 원칙)

**근거**: 1차 review 가 Explorer 확장을 Role Boundary 위반으로 명시 판정. fresh agent 분리가 아키텍처 대칭 유지. flow-review §7.1.

**권장**: **A**

---

### Q4 — Hook β (Stage 2 propagation) 의 성격

**질문**: Hook α 산출물을 Stage 2 Explorer 에 어떻게 전달?

**옵션**:
- **A (권장)**: α 의 **gated propagation rule** (독립 hook 아님). `confidence ≥ medium` 인 inference 만 prompt 주입. low / gap / rejected 등 제외. Lens 에는 전량 제외 (anchoring bias 방지)
- B: independent hook (unconditional per-round injection)

**근거**: 1차 review conditional consensus — "independent hook 은 anchoring bias 위험, gated propagation 이 원칙과 정합". flow-review §7.2.

**권장**: **A**

---

### Q5 — Hook γ (rationale review) 의 LLM 주체

**질문**: Phase 2 Step 2c 의 rationale 검증·보완 agent 는?

**옵션**:
- **A (권장)**: **`Rationale Reviewer`** fresh agent 신규 도입 (Step 2a Semantics / Step 2b Coverage 와 parallel dispatch)
- B: Coverage/Semantics lens 확장 (책임 혼선)

**근거**: γ 는 α 검증 + Stage 2 신규 entity 에 대한 rationale 보완 담당 — 전용 agent 가 책임 분리. flow-review §7.3.

**권장**: **A**

---

### Q6 — Hook γ 실패 처리

**질문**: Rationale Reviewer agent 실패 시 어떻게?

**옵션**:
- **A (권장)**: **§7.5 + §7.9.2 contract** — full failure 시 `proposed` element 전수를 Phase 3 Principal 판정으로 escalate. partial failure 시 미처리 element 는 `proposed` 유지 + "pending γ review" 표식. degradation counter (`rationale_reviewer_failures_streak`). fail-loud
- B: silent partial (미처리 element 에 대한 Principal 가시성 부재)

**근거**: Fail-loud 원칙 — low confidence / partial failure 는 그대로 드러내고 Principal 판정 요청. silent auto-accept 금지. flow-review §7.5 + §7.9.

**권장**: **A**

---

### Q7 — Principal 검증 표면

**질문**: Principal 이 rationale 을 검증하는 UI 는?

**옵션**:
- **A (권장)**: **Phase 3 User Confirmation 내부 확장** — Rationale 컬럼 + User Decision Required Items 확장 + throttling + evidence exhaustive (individual + group sample 전수 노출, γ full-failure 시 `rationale-queue.yaml` exhaustive collection)
- B: 독립 Phase 3.3 신설 (Phase 번호 체계 변경)

**근거**: 기존 Phase 3 의 Principal 개입 지점을 확장하는 쪽이 CLI bounded state 계약 보존 + Phase 번호 변동 없음. flow-review §7.6 + §7.7.

**권장**: **A**

---

### Q8 — Fail-close mode 분기

**질문**: v1 entry 실패 경로를 어떻게 분류?

**옵션**:
- **A (권장)**: **3 분기** — `full / degraded / none`. 추가로 3 halt 조건 (no-domain non-interactive / manifest 부재 / schema version unsupported) 은 raw.yml 미생성
- B: v1/v0 2 분기 (degraded 상태 정보 손실)

**근거**: audit 가치 보존 — degraded pack 사용 시에도 그 상태가 raw.yml 에 기록되어 사후 재평가 가능. flow-review §5.2 (r7 sync 완료) + §4.7 + §4.7.1.

**권장**: **A**

---

### Q9 — Domain-pack manifest

**질문**: 도메인 pack 의 v1 entry schema 는?

**옵션**:
- **A (권장)**: `~/.onto/domains/{domain}/manifest.yaml` 도입 + reconstruct = consumer only
- B: 기존 8 md hardcode 유지 (evolution 부적절, pack 확장성 제한)

**근거**: evolution + authority boundary 양자 — manifest 가 required/optional 구별 + quality_tier 명시 + version hash 로 audit 지원. flow-review §6.

**권장**: **A**

---

### Q10 — `--skip-intent-inference` flag rename

**질문**: v0 fallback 명시 flag 의 이름은?

**옵션**:
- **A (권장)**: `--v0-only` 로 rename + `--skip-intent-inference` 는 backward-compat alias (v1.0 에서 제거)
- B: 기존 이름 유지 (의도 불명확 — "skip" 이 무엇을 skip 하는지 모호)

**근거**: Principal 의 명시 의도 표현 명확화. flow-review §5.5.

**권장**: **A**

---

### Q11 — §14.6 dogfood SDK-like invariant 적용

**질문**: Stage 2 Step 4 에서 확정된 invariant 를 Stage 3 설계에 어떻게 적용?

**옵션**:
- **A (권장)**: Step 1 문서 명시 + 각 Step review checklist 에 점검 항목 포함
- B: 언급 없이 진행 (drift 위험)

**근거**: Stage 2 Step 4 §6.1 의 실 사례 — 초기부터 의식 조건화가 drift 방지에 유효. flow-review §9.3.

**권장**: **A** — 본 Step 1 설계가 **기존 본질 sink (wip.yml / raw.yml) 내부 field 확장** 만 수행하므로 §14.6 invariant 를 자연스럽게 만족 (신규 sink 결정 불필요).

---

### Q12 — Manifest Producer CLI

**질문**: manifest.yaml 을 누가 어떻게 생성하는가?

**옵션**:
- **A (권장)**: 별도 CLI `onto domain init <name>` — Principal 이 producer 역할을 수행하는 mechanism (tool). reconstruct runtime 은 consumer only
- B: reconstruct 자동 생성 (3차 review BLOCKING — governance 오류)

**근거**: Producer/Consumer 분리 + authority 가 Principal 에게 귀속. flow-review §6.1 + §6.4.

**권장**: **A** — 본 v1 contract 는 `onto domain init` CLI 의 존재와 책임만 고정. 실제 CLI 구현 UX (interactive prompt 문자열 등) 는 구현 세션 책임.

---

### Q13 — Manifest schema version compatibility

**질문**: manifest.yaml schema 버전 관리 방식?

**옵션**:
- **A (권장)**: `manifest_schema_version: "1.0"` + parse-time compat check + supported version list 유지. future migration CLI (`onto domain manifest-migrate`) 는 v1.1 backlog
- B: 미관리 (future evolution 불가)

**근거**: manifest 가 장기 audit 대상 artifact — schema evolution 시 version-based migration 필수. flow-review §6.3.

**권장**: **A**

---

### Q14 — `out_of_domain` state 분리

**질문**: entity 가 domain 과 매칭되지 않을 때 2 원인을 어떻게?

**옵션**:
- **A (권장)**: **`domain_scope_miss` (terminal, true scope miss)** + **`domain_pack_incomplete` (transient, pack 결함)** 로 분리
- B: 단일 `out_of_domain` 상태 (audit 원인 구별 상실)

**근거**: 3차 review UF — "true scope miss" 와 "pack insufficiency" 는 본질 다른 concept. 분리 시 Principal 이 pack upgrade 필요 여부를 정확히 판단 가능. flow-review §4.2 + §7.9.4/§7.9.5.

**권장**: **A**

---

### Q15 — `carry_forward` 의미 고정 + batch action 매핑

**질문**: Phase 3 batch action 의 terminal 매핑은?

**옵션**:
- **A (권장)**: **implicit only** — `carry_forward` 는 global `confirmed` + per-item (individual + batch 모두) explicit action 부재 시에만. batch `accept_all / reject_all / defer_all / mark_acceptable_gap_all` 는 각각 explicit terminal 로 1:1 매핑. `principal_judged_at` 은 Principal explicit action 시에만 populate (audit truth)
- B: batch defer 등이 carry_forward 로 가도 허용 (의미 혼재)

**근거**: "Principal 이 본 것" vs "per-item explicit action" 구별 — audit consumer 가 판정 가중치를 정확히 구별 가능. flow-review §4.3 (r6 prose sweep) + §4.6 invariant 6 + §7.9.

**권장**: **A**

---

### Q16 — no-domain 경로 통일

**질문**: `session_domain = none` 시 v1 entry 처리?

**옵션**:
- **A (권장)**: interactive + non-interactive 모두 **explicit consent 필수**. interactive TTY 는 Principal confirm, non-interactive 는 `--v0-only` flag 명시 없으면 **fail-fast halt**
- B: silent continue with warning log (silent fallback — v1 의미 훼손)

**근거**: fail-close + prompt-path contract parity (axiology). Principal 의도가 명시되지 않은 채 v1 이 skip 되는 경로 제거. flow-review §5.3.

**권장**: **A**

---

## 3. Decision summary table (Principal 일괄 승인용)

| # | 질문 (한 줄 요약) | 권장 | 근거 (flow-review r7 §) |
|---|---|---|---|
| Q1 | Canonical seat 단일화 (`intent_inference` 단일) | A | §4.1 |
| Q2 | Rationale state lifecycle (5 intermediate + 7 terminal) | A | §4.2 |
| Q3 | Hook α 주체 (Rationale Proposer fresh agent) | A | §7.1 |
| Q4 | Hook β 성격 (α 의 gated propagation) | A | §7.2 |
| Q5 | Hook γ 주체 (Rationale Reviewer fresh agent) | A | §7.3 |
| Q6 | Hook γ 실패 처리 (escalation + degradation counter) | A | §7.5 + §7.9 |
| Q7 | Principal 검증 표면 (Phase 3 내부 확장 + throttling) | A | §7.6 + §7.7 |
| Q8 | Fail-close mode 분기 (full/degraded/none + halt) | A | §5.2 + §4.7 |
| Q9 | Domain-pack manifest 도입 | A | §6 |
| Q10 | `--v0-only` rename (`--skip-intent-inference` deprecated) | A | §5.5 |
| Q11 | §14.6 invariant 적용 (명시 + checklist) | A | §9.3 |
| Q12 | Manifest Producer CLI (`onto domain init`) | A | §6.1 + §6.4 |
| Q13 | Manifest schema version compatibility | A | §6.3 |
| Q14 | `out_of_domain` 2 state 분리 | A | §4.2 + §7.9 |
| Q15 | `carry_forward` implicit only + batch 1:1 + audit truth | A | §4.3 + §4.6 + §7.9 |
| Q16 | no-domain explicit consent (interactive + non-interactive) | A | §5.3 |

## 4. Principal 결정 수집

**결정 일자**: 2026-04-23
**결정 주체**: Principal (kangmin.lee.n@gmail.com)
**결정 형식**: 일괄 승인 — 16 Q 모두 권장 옵션 A

### 4.1 일괄 승인 결과

| # | 질문 | 승인 옵션 |
|---|---|---|
| Q1 | Canonical seat 단일화 | **A** (승인) |
| Q2 | Rationale state lifecycle (5 intermediate + 7 terminal) | **A** (승인) |
| Q3 | Hook α 주체 (Rationale Proposer fresh agent) | **A** (승인) |
| Q4 | Hook β 성격 (α 의 gated propagation) | **A** (승인) |
| Q5 | Hook γ 주체 (Rationale Reviewer fresh agent) | **A** (승인) |
| Q6 | Hook γ 실패 처리 | **A** (승인) |
| Q7 | Principal 검증 표면 (Phase 3 확장 + throttling) | **A** (승인) |
| Q8 | Fail-close mode 3 분기 + halt | **A** (승인) |
| Q9 | Domain-pack manifest 도입 | **A** (승인) |
| Q10 | `--v0-only` rename | **A** (승인) |
| Q11 | §14.6 invariant 적용 명시 | **A** (승인) |
| Q12 | Manifest Producer CLI (`onto domain init`) | **A** (승인) |
| Q13 | Manifest schema version compatibility | **A** (승인) |
| Q14 | `out_of_domain` 2 state 분리 | **A** (승인) |
| Q15 | `carry_forward` implicit + batch 1:1 + audit truth | **A** (승인) |
| Q16 | no-domain explicit consent 통일 | **A** (승인) |

### 4.2 결정의 배경

- flow-review r7 이 **9/9 lens clean pass** 도달 (0 BLOCKING + 0 contested + 0 UF blocker)
- 7 rounds 의 /onto:review 에서 각 Q 의 옵션 A 가 구조적으로 정렬되었음이 반복 확인됨
- Principal 은 "결과물 의미성 > process 정합성" 원칙 하에 각 round 결정 (A 옵션) 을 명시 승인해왔음
- 본 일괄 승인은 그 누적 승인의 결과

### 4.3 status 전환

- 본 문서의 status: `decision-pending` → `decision-approved`
- Stage 3 Step 1 은 본 승인으로 **설계 합의 완료**
- Stage 3 Step 2 진입 가능 (Hook α Rationale Proposer protocol 세부 설계)

## 5. 다음 단계

### 5.1 본 Step 1 decision 문서 commit + PR

모든 Q 에 대해 Principal 승인이 수집되면:
1. flow-review 문서 (r7) 와 본 decision 문서를 함께 commit
2. branch: `docs/phase4-stage3-step1`
3. PR 제목: "docs(phase-4): Stage 3 Step 1 — reconstruct v1 차이 축 재정의 (decision)"

### 5.2 Stage 3 Step 2 착수 (flow-review 의 Step 2 권장 scope 기반)

Stage 2 의 Step 1→2→3→4 순차 전개 패턴을 따라:

- **Step 2**: Hook α Rationale Proposer 의 protocol 세부 (입력 schema / output directive / prompt 문자열 / role 파일 본문 위치 등)
- **Step 3**: Hook γ Rationale Reviewer 의 protocol 세부 + Phase 3 throttling config tuning
- **Step 4**: 통합 — Phase 3.5 write-back + raw.yml meta 확장 + invariant 10 구현 + `onto domain init` CLI 계약

### 5.3 Track B 구현 세션

Stage 3 (Step 1~4) 설계 합의 완료 후 Track B 구현 세션 진입:

- **W-ID 체계**: Q4 결정 (기존 축 연장) 에 따라 Track B → `W-A-80~` 신규 W-ID 부여
- **의존성**: Track C/D (learn × govern drift-engine) 가 이미 설계 합의 완료 (Stage 2) — 본 Track B 는 그 결과를 consume
- **우선순위**: Track B 먼저 (reconstruct v1 산출물이 Track A evolve v1 의 input) — Q2 Stage 2 결정 (옵션 A: C/D → B → A) 과 정합

## 6. 본 문서의 위치

- **Previous**: `flow-review` r7 (9/9 lens clean pass, 2026-04-23)
- **Current**: Step 1 decision (본 문서, Principal 결정 대기)
- **Next**: Stage 3 Step 2 (본 Step 1 결정 후 착수)
- **최종 정착**: Track B 구현 세션에서 본 Q1~Q16 결정이 코드 + `.onto/processes/reconstruct.md` + `.onto/roles/rationale-{proposer,reviewer}.md` + `manifest.yaml` + `onto domain init` CLI 에 반영

## 7. scope 밖 (이연)

- 구현 설계 (agent prompt 실문자열, role 파일 본문, CLI 함수 signature) — Step 2~4 + 구현 세션
- `domain_refs` stable identity (UF-EVOLUTION-DOMAIN-REF-IDENTITY) — v1.1 backlog
- Provenance normalization (UF-CONCISENESS-PROVENANCE-DUPLICATION) — implementation detail
- Pack upgrade re-entry (UF-COVERAGE-PACK-REENTRY-LIFECYCLE) — v1.1 backlog (P2 결정: v1 은 단일 세션 완결)
- `onto domain manifest-migrate` CLI — v1.1 backlog
- 11 도메인의 실제 manifest 수동 migration — Principal 향후 운영 작업
- Phase 3 throttling config 의 default tuning — empirical, 구현 세션

## 8. 참조

- **flow-review r7** (canonical design): `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md`
- **7 rounds review sessions**:
  - r1 review: `.onto/review/20260422-6763a95c/`
  - r2 review: `.onto/review/20260422-327ab3a4/`
  - r3 review: `.onto/review/20260422-cc77ecfa/`
  - r4 review: `.onto/review/20260422-53307585/`
  - r5 review: `.onto/review/20260423-0ba31c64/`
  - r6 review: `.onto/review/20260423-aa9b3f33/`
  - r7 review: `.onto/review/20260423-df566f97/` (9 lens clean pass, synthesize halt — `development-records/bug-reports/20260423-onto-home-synthesize-halt.md`)
- **Stage 2 wrap-up** (precedent): `development-records/evolve/20260422-phase4-stage2-wrap-up.md`
- **Phase 4 handoff**: `development-records/plan/20260419-phase4-handoff.md`
- **§14.6 invariant** (정본): `.onto/processes/govern.md §14.6`
