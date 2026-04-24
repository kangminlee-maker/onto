---
as_of: 2026-04-23
revision: 6
status: pre-decision-structural-review
functional_area: phase-4-stage-3-step-2
purpose: |
  Phase 4 Stage 3 Step 2 — Hook α Rationale Proposer 의 protocol 세부를
  확정하는 설계 문서. Step 1 (PR #201, bae608e) 이 확정한 Hook α 의 역할
  + 입력 3 축 + 출력 directive 의 **mechanical 구체화**: input schema 상세,
  output directive schema 상세, prompt 실문자열 (English-only), role 파일
  본문, runtime integration, failure handling. Step 1 re-open 아님.
authority_stance: non-authoritative-review
canonicality: scaffolding
revision_history:
  - revision: 1
    date: 2026-04-23
    change: "초안 — handoff §2.1 의 6 설계 항목 + prompt + role 본문"
  - revision: 2
    date: 2026-04-23
    change: |
      /onto:review 1차 (20260423-c4806103, 5 BLOCKING + 6 UF + 3 conditional
      + 2 axiology) 반영 — narrow contract consistency repair.
      (B1) proposals.length mismatch 단일 경로 — §7.2 partial recovery 폐지,
      §3.7 rule 1 atomic reject 유일. (B2) proposed evidence contract 통일 —
      post-validation confidence 를 Explorer gating source 로. domain_refs
      citation 은 domain_files_content 에 실제 포함된 파일만 허용 (§3.2 +
      §3.7 validation rule 9 신설). (B3) partial failure 폐지 — gap 은
      Proposer explicit emit 만. runtime 자동 생성 금지, provenance 진실성
      복원. (B4) no-domain Hook α skip — §6.2 step 5a inference_mode check
      명시. (B5) meta.stage_transition_state 신규 field (pre_alpha /
      alpha_in_progress / alpha_completed / alpha_skipped / alpha_failed,
      6 enum at r2; r3 split 후 7 enum) —
      §6.2 step 순서 재조정, resumption 복원점 정확. (UF-LOGIC-01) §3.7
      rule 8 을 reject list 에서 제거, downgrade-only warning 명시.
      (UF-STRUCTURE-01) §4 prompt + §5 role 에 schema single authority
      reference. (UF-PRAGMATICS-01) intent_inference.state_reason 신규
      field — non-proposed outcome 의 reason 저장 sink. (UF-EVOLUTION-01)
      provenance.input_chunks + truncated_fields[] 예약 (v1 default=1).
      (UF-COVERAGE-01) wip.yml.meta.pack_missing_areas[] 예약 (Phase 3
      소비용). (UF-AXIOLOGY-01) single-shot trade-off 명시. (C2) schema
      single authority — prompt/role 은 reference only. (C3) filename
      literal softening — domain_scope.md 대신 "scope-declaring file per
      manifest".
  - revision: 3
    date: 2026-04-23
    change: |
      /onto:review 2차 (20260423-d917a60c, 2 BLOCKING + 1 conditional + 5 UF
      + 1 axiology) 반영 — narrow sync drift sweep + state split.
      (B-new-1) §3.1 top-level schema 의 "partial failure (§7.2)" 참조 제거 —
      §3.7/§7.1 full failure 단일 경로로 정합. (B-new-2) alpha_failed_abandoned
      을 alpha_failed_continued_v0 (Stage 2 진행 허용, inference_mode=none
      downgrade) + alpha_failed_aborted (abort, preserve) 로 split.
      stage_transition_state enum 6 → 7. §7.1 Principal response 별 명시
      state transition 기록. (Stale drift sweep) §7.1 "8 reject" → "9 reject",
      Q-S2-9 "5 enum" → "7 enum", revision_history enum 정확화.
      (UF-STRUCTURE-01) §2.3 의 §5.2 halt citation 을 Step 1 flow-review r7
      §5.1 reference 로 수정. (UF-PRAGMATICS-01) §3.2 domain_refs 카디널리티를
      "≥ 1" → "0 이상 허용" 으로 통일 (§3.2.1 / §3.7.1 D2 와 정합).
      prompt 의 "1 or more" 도 동일 수정. (UF-EVOLUTION-01)
      provenance.truncated_fields 를 per-entity 로 확장 — proposals[] 내부
      __truncation_hint field 예약. (UF-COVERAGE-01) provenance.effective_
      injected_files[] 신규 예약 — degraded pack audit. (UF-AXIOLOGY-01)
      meta.pack_missing_areas 에 "provisional, non-semantic grouping only"
      명시 — runtime-side semantic clustering 금지. 실 grouping 은 Step 3
      Reviewer 에 이연 검토.
  - revision: 4
    date: 2026-04-23
    change: |
      /onto:review 3차 (20260423-0f5f98dc, 2 BLOCKING + 1 conditional + 5 UF)
      반영 — narrow internal consistency sweep.
      (B-new-1) Stage 2 gate 확장 — §6.2 step 6 의 admissible set 에
      alpha_failed_continued_v0 추가. [v] Switch to v0-only 경로가 Stage 2
      진입 canonical gate 통과하도록 정합.
      (B-new-2) pack_missing_areas scope 제한 — domain_pack_incomplete only
      로 narrow (gap 제외). gap 은 domain_refs forbidden 이라 grouping key
      부재 → aggregate 대상 아님. §6.3.1 schema + outcome_distribution 정합.
      (UF-SEM-01) §0 본문 "full/partial failure" → "failure handling
      (full only)" 수정. partial 폐지 반영.
      (UF-PRAG-01) retry 소비 persistence — meta.stage_transition_retry_count
      신규 field (§6.2). resumption 시 retry 여부 audit.
      (UF-PRAG-02) pack_missing_areas row 에 grouping_key 명시 추가.
      (UF-CONC-01) §7.3 duplication 을 §3.7/§7.1 pointer 로 collapse.
      (UF-CONC-02) revision 이력 단일 canonical — frontmatter 가 authority,
      §12 section 제거, §11 은 summary pointer 로 남김.
      (Conditional) §10 backlog 의 state_reason similarity 문구 제거 —
      non-semantic boundary 재강화.
  - revision: 5
    date: 2026-04-23
    change: |
      /onto:review 4차 (20260423-b845a4e9, 3 Consensus repairs 인정 +
      1 Conditional + 2 Disagreement + 1 UF) 반영 — final narrow sweep.
      (COND-01) `proposer_failure_downgraded` 가 Step 1 §4.7 fallback_reason
      enum 에 미등재인 상태로 §7.1 에서 쓰이는 drift 해소 — 본 Step 2 가
      enum 확장을 명시 제안 + 구현 PR 에서 Step 1 §4.7 table additive patch
      (additive change only, decision-approved 재협의 없음).
      (DIS-01) meta.stage_transition_retry_count 의 reader/enforcer 경로
      명시 — §7.1 [r] Retry 에서 runtime 이 spawn 전 retry_count 검사 +
      atomic increment 명시.
      (DIS-02) domain_pack_incomplete 의 domain_refs 를 optional → required
      (§3.5) — scope 확인 논리 정당성. r2 carry-over drift 해소.
      (UF-CONC-01) pack_missing_areas row 의 count field 제거 —
      element_ids.length 로 충분, derived duplicate state.
  - revision: 6
    date: 2026-04-23
    change: |
      /onto:review 5차 (20260423-2fd6eb6a, 3 Consensus 인정 + 1 Cond +
      2 Disagreement drift + 2 UF) 반영 — mirror drift final sweep.
      (DIS-01) §4 prompt outcome D 의 domain_refs 문구를 "0 이상 optional"
      → "1 이상 required + no-ref 면 gap 으로 재분류" 로 update. §3.5
      required 결정의 prompt mirror. (DIS-02) §6.3 field matrix 에
      domain_pack_incomplete 의 domain_refs required 반영. 세 outcome 별
      required/optional 명시 (proposed: required, domain_scope_miss:
      optional, domain_pack_incomplete: required). (UF-CONC-01) §11 revision
      trail stale 해소 — r4→r5/r6 최신값 반영. (UF-CONC-02) pack_missing_areas
      row 의 area_hint field 제거 — grouping_key.heading 의 derived
      duplicate (count 와 동일 패턴).
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §7.1 Hook α"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인 Q3/Q15)"
  step_2_handoff: "development-records/plan/20260423-phase4-stage3-step2-handoff.md"
  prior_reviews:
    - ".onto/review/20260423-c4806103/ (r1 → r2, 5 BLOCKING contract consistency)"
    - ".onto/review/20260423-d917a60c/ (r2 → r3, 2 BLOCKING + 1 conditional + 5 UF sync drift + state split)"
    - ".onto/review/20260423-0f5f98dc/ (r3 → r4, 2 BLOCKING + 1 conditional + 5 UF internal consistency)"
    - ".onto/review/20260423-b845a4e9/ (r4 → r5, 3 Consensus repairs + 1 Cond + 2 Disagreement + 1 UF final sweep)"
    - ".onto/review/20260423-2fd6eb6a/ (r5 → r6, 3 Consensus repairs + 2 Disagreement mirror drift + 2 UF)"
  reconstruct_v0: ".onto/processes/reconstruct.md §1.0 Team Composition (Axiology Adjudicator prompt 패턴)"
  language_policy: ".onto/principles/output-language-boundary.md"
---

# Stage 3 Step 2 — Rationale Proposer Protocol

## 0. 본 문서의 목적

Step 1 (PR #201) 이 확정한 Hook α 의 **역할 + 입력 3 축 + 출력 directive** 을 전제로 하여, Rationale Proposer agent 의 **mechanical 구체** 를 확정한다:

1. Input schema 상세 (어떤 field 가 어떤 크기로 어떤 순서로 주입되는가)
2. Output directive schema 상세 (outcome 별 필수/조건부 field 의 validation 규칙)
3. Prompt 실문자열 (English-only, Axiology Adjudicator 패턴 동형)
4. Role 파일 본문 (`.onto/roles/rationale-proposer.md` 전문)
5. Runtime integration (Stage Transition 내부 배치 + directive apply step)
6. Failure handling (Step 1 결정된 **full failure only** 의 실제 UX + runtime behavior; partial recovery 경로는 r2 폐지)

**Scope 엄격**: Hook γ (Step 3), Phase 3 throttling (Step 3), Phase 3.5 write-back (Step 4), raw.yml meta (Step 4), `onto domain init` CLI (Step 4) 는 본 문서 밖.

## 1. Step 2 scope 재진술 + Step 1 의존

### 1.1 Step 1 에서 이미 확정된 것 (본 Step 2 가 전제로 하는 것)

- **agent 종류**: `Rationale Proposer` fresh agent (Q3)
- **시점**: Stage 1 종료 직후, `module_inventory` 교체 직후
- **입력 3 축**: `context_brief.system_purpose` + Stage 1 확정 entity 목록 + manifest + referenced_files content
- **출력 directive 상위 구조**: `rationale_proposer_directive.proposals[]` (per entity) + `provenance`
- **outcome enum**: `proposed / gap / domain_scope_miss / domain_pack_incomplete`
- **sole-writer invariant**: Proposer 는 wip.yml 직접 쓰기 금지. directive only
- **v1 entry 조건**: `inference_mode ∈ {full, degraded}` 일 때만 실행

### 1.2 Step 2 가 상세화할 것

위 항목들의 **mechanical 구현 spec**. Step 1 의 "결정 표면" 수준에서 구현 세션 input 수준으로 구체화.

### 1.3 Step 2 가 피할 것

- Rationale Reviewer (Hook γ) — Step 3 책임
- Phase 3 표면 (Hook δ) — Step 3 throttling tuning
- wip.yml 의 `intent_inference` field 의 실제 schema 전체 — Step 1 §4.5 canonical, 본 Step 2 는 directive 가 populate 하는 field 만 referencing
- `onto domain init` CLI 구현 — Step 4

## 2. Input Schema 상세

Rationale Proposer agent 는 team lead (Runtime Coordinator) 가 spawn 시 다음 입력을 **단일 prompt 주입** 으로 받는다. Axiology Adjudicator 와 동형 — fresh agent per invocation, 영속 teammate 아님.

### 2.1 Input 구성 (team lead 주입 순서)

```
[input_package] (team lead 가 prompt 에 주입)

1. system_purpose: string (1~2 sentences)
   source: context_brief.system_purpose
   size: unbounded but typically ≤ 300 chars
   
2. entity_list: array
   source: Stage 1 확정 entity 목록 (module_inventory 교체 직후의 entity set)
   per-entity fields (선택된 것만 주입):
     - id: string
     - type: string (schema element_type)
     - name: string
     - definition: string
     - certainty: enum (observed | rationale-absent | inferred | ambiguous | not-in-source)
     - source.locations: array of location refs (file:line / sheet:cell / schema.table.column)
     - relations_summary: array of related entity ids + relation types (inbound/outbound, Stage 1 까지 확정된 것만)
   excluded fields (주입 안 함):
     - labeled_by (anonymization 보존)
     - source_deltas (delta ID 직접 참조는 불필요, location 으로 충분)
     - issues (Proposer 는 conflict resolution 담당 아님)
   size limit: entity 당 prompt 1~2 KB 목표. 초과 시 definition / source.locations / relations_summary 순으로 truncate
   
3. domain_manifest: object
   source: ~/.onto/domains/{session_domain}/manifest.yaml
   주입 fields:
     - manifest_schema_version
     - domain_name
     - version, version_hash
     - quality_tier
     - referenced_files: array of {path, purpose, required, min_headings}
   
4. domain_files_content: array of {path, content}
   source: manifest.referenced_files 의 각 path 의 파일 전체 content
   순서: manifest.referenced_files[] 의 배열 순서 유지
   size limit: 도메인 전체 content ≤ 100 KB 목표 (manifest 가 정상 pack 이면 대부분 만족)
   degraded pack 처리: required file 은 무조건 주입, optional file 이 부재하면 해당 entry 생략
```

### 2.2 Input 주입 rule

- **stateless** — Proposer 는 이전 세션 / 이전 round 정보 없음. 세션마다 독립
- **no anonymization of entity authors** — Stage 1 의 `labeled_by` 는 anonymize 되어 이미 wip.yml 에서 제거된 상태로 주입됨. Proposer 가 anonymization 추가 작업 불필요
- **no source.content injection** — entity source code / 문서 본문 content 는 주입 안 함. `source.locations` 만으로 충분 (Proposer 의 역할은 domain 기반 추론이지 source 재독해 아님)
- **strict scope limit** — manifest 외 도메인 파일은 주입 안 함. `context_brief.architecture` 는 Adjudicator 와 동일하게 excluded (scope restriction 보존)

### 2.3 Input quality floor check (team lead 책임, Proposer 아님)

Team lead (Runtime Coordinator) 는 Proposer spawn 전에 다음 precondition 확인. 위반 시 spawn 자체를 거부:

- `inference_mode ∈ {full, degraded}` 확인 (v1 entry 실패 시 Proposer spawn 금지)
- `entity_list.length ≥ 1` (Stage 1 에서 entity 0 개 발견 시 Proposer 불필요 — Stage 2 로 pass)
- `domain_manifest.referenced_files` 의 `required: true` file 전수 존재 (Step 1 flow-review r7 §5.1 v1 entry condition 3 번째 + Step 1 §5.2 의 halt 분기; r3 수정 — `§5.2` citation 은 reconstruct session 의 halt 분기가 아니라 본 Step 2 §5 file placement 섹션이었던 drift. 실제 enforcement 는 Step 1 flow-review r7 §5.1)

Proposer 자신은 preconditions 를 재검증하지 않음 — team lead 가 이미 통과시킨 input 만 받는다고 가정.

## 3. Output Directive Schema 상세

### 3.1 Top-level schema

```yaml
rationale_proposer_directive:
  proposals:
    - target_element_id: string        # entity_list[].id 와 1:1 대응, 누락 없이 전수
      outcome: enum                     # proposed | gap | domain_scope_miss | domain_pack_incomplete
      # outcome 별 조건부 field — §3.2~§3.5
      ...
  provenance: object                    # §3.6
```

**invariant**: `proposals.length == entity_list.length`. 모든 input entity 에 대해 정확히 1 개의 proposal. 누락된 entity_id 가 있으면 **§3.7 rule 1 reject → §7.1 full failure** (r2/r3: partial recovery 경로 없음, §7.2 는 폐지 상태).

**Per-entity truncation marker (r3 UF-EVOLUTION-01)**: 각 proposal 은 optional field `__truncation_hint: string` 을 가질 수 있음 — 해당 entity 의 input (definition, relations_summary, source.locations 등) 이 size limit 으로 truncate 된 경우 어느 field 가 축약되었는지 기록 (예: `"entity.relations_summary"`). 기본값은 생략 (truncation 없음). session-level `provenance.truncated_fields` 와 달리 per-entity 단위 — degraded reasoning 이 특정 entity 에만 영향 준 경우 audit.

### 3.2 `outcome: proposed` — rationale 추론 성공

```yaml
- target_element_id: {id}
  outcome: proposed
  inferred_meaning: string             # 1~2 sentences, English
  justification: string                # 1~3 sentences, English, inferred_meaning 의 근거
  domain_refs:                         # 0 개 이상 허용 (empty 시 §3.7.1 D2 로 confidence 자동 low)
    - manifest_ref: string             # manifest.referenced_files[].path 중 하나
      heading: string                  # 도메인 md 의 heading path (예: "## Concepts > Session")
      excerpt: string                  # ≤ 100 chars, 도메인 md 본문 인용
  confidence: enum                     # low | medium | high
```

#### 3.2.1 `confidence` 판정 기준 (Proposer 의 자기 보고)

- **high**: domain_refs ≥ 2 AND 모두 `required: true` file 에서 유래 AND entity.name/definition 이 domain heading 의 term 과 직접 매칭
- **medium**: domain_refs ≥ 1 AND 하나 이상이 `required: true` file AND entity 와 domain concept 간 semantic 매칭 가능 (이름 불일치해도 definition 일치)
- **low**: domain_refs = 0 (empty 허용, 자동 low) OR domain_refs 전체가 `optional` file AND entity-domain 매칭이 tentative

runtime validator: `confidence == high` 인데 `domain_refs.length < 2` 이면 downgrade to medium. `domain_refs.length == 0` 이면 강제 low.

### 3.3 `outcome: gap` — 근거 불충분 (Proposer explicit 만, r2 B3)

```yaml
- target_element_id: {id}
  outcome: gap
  state_reason: string                 # 1 sentence, English (r2 renamed from gap_reason)
                                       # 예: "No matching concept found in domain pack despite full-tier manifest"
                                       # 예: "Ambiguous mapping — multiple domain concepts match with equal plausibility"
```

`inferred_meaning / justification / domain_refs / confidence` field 는 **omit**. 존재 시 runtime reject.

**r2 rule**: `gap` 은 Proposer 가 자신의 판정으로 emit 한 경우에만 허용. runtime 이 directive 의 누락 entity 를 대신 gap 으로 채우는 경로는 **폐지** (r1 §7.2 partial recovery 제거). 누락 entity → full failure (§7.1) 경로.

### 3.4 `outcome: domain_scope_miss` — domain 범위 밖

```yaml
- target_element_id: {id}
  outcome: domain_scope_miss
  state_reason: string                 # 1 sentence, English (r2 renamed from scope_miss_reason)
                                       # 예: "Entity represents infrastructure concern outside stated domain scope"
  domain_refs:                         # optional — scope-declaring file 참조
    - manifest_ref: string             # manifest.referenced_files[].path 중 하나
                                       # typically "domain_scope.md" 또는 pack 의 scope-declaring file
                                       # (r2 C3: filename literal 완화, manifest 참조로 표현)
      heading: string
      excerpt: string
```

`inferred_meaning / justification / confidence` 는 omit.

### 3.4.1 `rationale_state` canonical enum — `empty` 추가 (r3-amendment, Step 4 P-DEC-A1 — 2026-04-25 Principal 승인)

`rationale_state` 는 Step 1 §4.5 canonical enum. Stage 2 Explorer 가 wip.yml `elements[]` 에 entity 추가 시 `intent_inference.rationale_state = "empty"` 로 populate 하는 canonical shape 를 Step 2 authority 에 명시:

| source | populated state |
|---|---|
| Stage 2 Explorer (entity 신규 add, rationale 부재) | `empty` |
| Hook α `outcome: proposed` | `proposed` |
| Hook α `outcome: gap` | `gap` |
| Hook α `outcome: domain_pack_incomplete` | `domain_pack_incomplete` |
| Hook α `outcome: domain_scope_miss` | `domain_scope_miss` |

Step 1 §4.5 canonical mirror. Step 3 §3.6 + §3.8 rule 8+11 의 `empty` 정의 + Step 4 protocol §3.1 action-first matrix 의 `empty` source state 행 (`provide_rationale` / `mark_acceptable_gap` / `defer` 허용) 와 pair.

### 3.5 `outcome: domain_pack_incomplete` — pack 결함 (r5 DIS-02: domain_refs required)

```yaml
- target_element_id: {id}
  outcome: domain_pack_incomplete
  state_reason: string                 # 1 sentence, English (r2 renamed from incompleteness_reason)
                                       # 예: "Entity fits domain scope but no concept definition exists in pack"
  domain_refs:                         # r5 required (≥ 1) — scope 일치 근거 (scope-declaring file per manifest)
                                       # r4 는 optional 이었으나 r5 에서 required 승격: "pack 이 scope 내부 개념을 누락" 판정은
                                       # scope 확인 근거가 필수. 근거 없는 incomplete 판정은 gap 으로 재분류해야 함 (§3.3)
    - manifest_ref: string
      heading: string
      excerpt: string
```

`inferred_meaning / justification / confidence` 는 omit.

**r5 함의 (DIS-02 해소)**: `domain_pack_incomplete` element 는 이제 100% `pack_missing_areas` aggregate 포함 가능 — `manifest_ref + heading` grouping_key 보장. `domain_refs` 근거 없이 pack 결함을 주장하고 싶으면 `outcome: gap` 으로 재분류해야 함 (gap 은 scope 판정 없이 "근거 불충분" 의미).

### 3.5.1 `state_reason` field — persistence sink (r2 UF-PRAGMATICS-01)

r1 은 `gap_reason / scope_miss_reason / incompleteness_reason` 각각 다른 field name 을 사용하면서 저장 위치를 명시하지 않음. r2 는 **single unified field `intent_inference.state_reason`** 으로 통일:

- Proposer directive 에서 outcome 별 `state_reason` 문자열 emit
- runtime apply 시 `elements[].intent_inference.state_reason` field 에 저장
- Phase 3 rendering / Hook γ Reviewer / raw.yml 저장 시 동일 field 로 소비

이로써 reason 이 outcome 별로 **single field** 에 persist 되어 downstream consumer 인터페이스 단순화.

### 3.6 `provenance` (top-level)

```yaml
provenance:
  proposed_at: string                  # ISO 8601 UTC
  proposed_by: "rationale-proposer"    # agent role id
  proposer_contract_version: "1.0"     # 본 Step 2 protocol 의 version
  manifest_schema_version: string      # input manifest 의 manifest_schema_version
  domain_manifest_version: string      # input manifest 의 version
  domain_manifest_hash: string         # input manifest 의 version_hash
  domain_quality_tier: enum            # full | partial | minimal (input manifest 기준)
  session_id: string
  runtime_version: string              # reconstruct runtime version
  # r2 신규 + r3 확장 — UF-EVOLUTION-01 + UF-COVERAGE-01:
  input_chunks: integer                # default 1 (single-shot). v1.1 에서 chunking 도입 시 N>1
  truncated_fields: array              # default [] (no truncation). SESSION-level truncation (전체 entity 에 공통 적용된 truncation rule 만). per-entity truncation 은 proposals[].__truncation_hint 에 기록 (r3 UF-EVOLUTION-01)
  effective_injected_files: array      # r3 UF-COVERAGE-01 신규. 실제 prompt 에 주입된 파일 subset (manifest.referenced_files 의 부분집합). degraded pack 에서 optional 파일이 부재하여 일부 미주입된 경우 기록. 예: ["concepts.md", "structure_spec.md", "logic_rules.md", "domain_scope.md"] (optional 4 개 중 0 개 주입 시)
                                       # provenance 에 persist 되어 raw.yml consumer 가 "이 추론이 실제 어떤 파일을 근거로 생성되었는가" audit 가능
```

### 3.7 Runtime validation — reject 조건 (r2: rule 8 분리)

Runtime 은 directive apply 전 다음을 결정적으로 검증. **위반 시 entire directive reject** (atomic — partial application 금지, full failure §7.1 경로로 흐름):

1. `proposals.length != entity_list.length` → reject (누락/초과 entity_id). **r2**: partial recovery 폐지 — 누락은 무조건 full failure
2. 동일 `target_element_id` 2 회 이상 → reject
3. `target_element_id` 가 `entity_list[].id` 에 없음 → reject (hallucinated id)
4. `outcome` enum 외 값 → reject
5. outcome 별 field 요구사항 (§3.2~§3.5) 위반 → reject
6. `domain_refs[].manifest_ref` 가 `manifest.referenced_files[].path` 에 없음 → reject (hallucinated filename)
7. `provenance.manifest_schema_version / domain_manifest_hash` 가 input 과 불일치 → reject
8. **r2 신규**: `domain_refs[].manifest_ref` 가 manifest.referenced_files 에는 있지만 해당 entry 가 `domain_files_content` 에 주입되지 않음 (degraded pack 의 미주입 optional file 인용 방지) → reject
9. **r2 신규**: `state_reason` field 가 `outcome ∈ {gap, domain_scope_miss, domain_pack_incomplete}` 에서 missing or empty → reject

### 3.7.1 Downgrade-only rules (reject 아님, r2 UF-LOGIC-01)

다음은 runtime 이 apply 하되 warning log 를 남기는 downgrade 경로 — **reject list 와 분리**:

- **D1**: `confidence == high` 인데 `domain_refs.length < 2` → `medium` 으로 downgrade + warning
- **D2**: `domain_refs.length == 0` → `low` 로 강제 + warning
- **D3**: `confidence == medium` 인데 `domain_refs` 전체가 manifest 의 optional file 에서만 유래 → `low` 로 downgrade + warning

downgrade 된 값이 wip.yml 에 저장됨 (agent 원 출력은 session log 보존). runtime validator 가 적용 후 apply.

## 4. Prompt 실문자열 (English-only)

Team lead (Runtime Coordinator) 가 Axiology Adjudicator 와 동형 패턴으로 spawn. 다음 prompt template 을 fill in:

```
You are the Rationale Proposer.

[Role]
You generate initial rationale inferences for entities identified in Stage 1,
using the domain pack as the primary source of meaning. You do NOT traverse
the source code or re-verify facts — your role is to provide a first-pass
meaning layer based on domain knowledge.

You do NOT produce lens labels, resolve conflicts, or propose exploration
directions. Those are the responsibility of lenses, the Axiology Adjudicator,
and Synthesize, respectively.

You do NOT mutate wip.yml. Your output is a directive; the Runtime Coordinator
is the sole writer of wip.yml.

[Input]
You receive a single input package containing:

1. system_purpose — a 1~2 sentence statement of the target product's purpose
2. entity_list — the confirmed entities from Stage 1 (id, type, name, definition,
   certainty, source.locations, relations_summary)
3. domain_manifest — manifest.yaml of the domain pack selected for this session
4. domain_files_content — the full content of each file listed in
   manifest.referenced_files, in manifest order

Excluded from input:
- Source code / document content of the product itself (only source.locations,
  not the content)
- context_brief.architecture, context_brief.legacy_context
- Any .onto/principles/ files other than what the domain pack references
- wip.yml author/lens identities

[Procedure]
For each entity in entity_list, independently decide exactly one outcome:

A. outcome = "proposed"
   If you can identify a matching or adjacent concept in the domain pack and
   provide a justified rationale:
   - inferred_meaning: 1~2 sentences describing what the entity means in the
     context of the product and the domain
   - justification: 1~3 sentences explaining why this meaning is the best
     inference, referencing domain concepts or structural relations
   - domain_refs: 0 or more references to domain pack files (manifest_ref,
     heading path, excerpt ≤ 100 chars). Empty list is legal but triggers
     automatic downgrade to confidence=low per §3.7.1 D2. Prefer to cite
     at least one ref when a plausible grounding exists — empty should be
     used only when no grounding could be identified.
   - confidence: self-reported high/medium/low per criteria in §3.2.1 of the
     Step 2 contract (paraphrased):
     * high: ≥2 refs from required files AND direct name/definition match
     * medium: ≥1 ref from a required file AND semantic match
     * low: 0 refs (empty allowed) OR all refs from optional files with
       tentative mapping

B. outcome = "gap"
   If the entity appears to be within domain scope but the pack does not
   provide enough material to infer a rationale (e.g., ambiguous mapping,
   no concept definition):
   - state_reason: 1 sentence (required)

C. outcome = "domain_scope_miss"
   If the entity represents a concern outside the domain stated by the
   scope-declaring file of the pack (typically domain_scope.md, but any
   file in manifest.referenced_files that the pack designates as scope
   source):
   - state_reason: 1 sentence (required)
   - domain_refs: optional — cite the scope-declaring file if it directly
     establishes the miss

D. outcome = "domain_pack_incomplete"
   If the entity is clearly within domain scope (per the scope-declaring
   file) but the pack lacks the concept needed for a rationale:
   - state_reason: 1 sentence (required)
   - domain_refs: REQUIRED (≥1, r5 §3.5 required). Cite the scope-declaring
     file and heading that establishes the entity IS within scope.
     If you cannot cite specific scope evidence, use outcome = "gap"
     instead — domain_pack_incomplete requires manifest-backed scope
     evidence, not mere structural inference.

Your proposals array MUST contain exactly one entry per input entity. Do not
omit or duplicate entities. Missing entities cause full directive rejection
(atomic — no partial recovery).

[Citation constraint]
For "proposed" outcomes, every domain_refs entry MUST cite a file that is
BOTH listed in domain_manifest.referenced_files AND actually present in
domain_files_content. Do not cite files missing from the injected content
even if the manifest mentions them as optional — the runtime will reject
such citations.

[Provenance]
Populate the top-level provenance block with:
- proposed_at: current ISO 8601 UTC timestamp
- proposed_by: "rationale-proposer"
- proposer_contract_version: "1.0"
- manifest_schema_version, domain_manifest_version, domain_manifest_hash,
  domain_quality_tier: copy from input domain_manifest
- session_id, runtime_version: copy from input package

[Output Format]
The canonical output schema is Step 2 contract §3. This prompt restates
procedure and rules; the schema itself (field names, validation rules,
reject conditions) is authoritative at §3. If prompt and schema conflict,
§3 wins.

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

[Rules]
- Domain pack is the primary source. Do not invent rationales not grounded
  in the pack content. If the pack cannot support a rationale, use "gap"
  or "domain_pack_incomplete" — do not fabricate.
- Source code and document content are NOT in your input. Do not claim to
  have read source; use domain_refs only.
- Use "gap" when the domain scope likely covers the entity but the pack
  lacks specifics. Use "domain_pack_incomplete" when scope is clearly
  affirmed (per the scope-declaring file) but the pack content is missing.
  Use "domain_scope_miss" only when the entity falls outside declared scope.
- confidence is self-reported but the runtime validator will downgrade
  over-claimed high/medium values per §3.7.1. Be conservative — low is
  acceptable.
- Explorer-facing gating (§6.4) uses the POST-VALIDATION confidence value,
  not your self-reported value. Your honest assessment matters more than
  trying to qualify for propagation.
- Do not speculate about lens perspectives or other agents' outputs.
  justification text may be consumed by the Rationale Reviewer later —
  write it as evidence, not as persuasion.
- Do not use metaphors or analogies.
```

### 4.1 Prompt 크기 추정 + single-shot 선택의 근거 (r2 UF-AXIOLOGY-01)

- template + input package (system_purpose + entity_list + manifest + domain_files_content) = 전형적 10~150 KB
- 100+ entity 세션에서 token budget 주의 (구현 세션에서 chunking 필요 여부 재평가 — 본 v1 scope 에서는 batch 1 회 가정)

**r2 명시 trade-off — single-shot full-pack vs smallest-sufficient-bundle**:

1차 review axiology 가 지적: full-pack single-shot injection 이 smallest-sufficient-bundle 원칙 (필요한 최소만 주입) 과 충돌 가능. v1 의 선택:

- **v1 채택: single-shot full-pack** — 이유:
  - coordinator simplicity (bundle 선택 logic 불필요, 1 agent invocation)
  - prompt cache 효율 (같은 domain pack 이 여러 세션에서 cache hit 가능)
  - manifest schema v1.0 의 단순성 유지
- **trade-off 기록**: v1 은 entity 수 × pack 크기 의 곱이 token budget 을 초과할 가능성이 존재. 본 contract 는 이를 **`provenance.input_chunks` + `provenance.truncated_fields`** 로 audit 가능하게 기록 (v1 default: `input_chunks=1, truncated_fields=[]`)
- **v1.1 backlog**: smallest-sufficient-bundle — entity 단위로 domain concept selective injection. manifest schema 에 concept-level tagging 추가 필요. 본 v1 scope 밖

이 trade-off 는 본 contract 에 **explicit** 으로 기록 — 구현 세션 및 audit 시 "왜 single-shot 인지" 가 추적 가능.

### 4.2 Prompt 변경 시 version bump

`proposer_contract_version` 은 본 prompt 본문 + input schema + output schema 의 semantic 단위. 본문이 바뀔 때마다 version bump 필요 (v1.0 → v1.1 → …). provenance 에 기록되어 후속 재해석 시 contract drift 감사 가능.

## 5. Role 파일 본문

`.onto/roles/rationale-proposer.md` 신규 생성. 기존 lens role 파일 (`.onto/roles/logic.md` 등) 패턴을 따르되, **lens 가 아닌 fresh-agent role** 임을 명시.

### 5.1 전문 (English — role 파일은 agent 가 참조하는 canonical spec)

```markdown
# rationale-proposer

## Perspective

This role is NOT a review lens. It is a fresh-agent role invoked once per
reconstruct session at the Stage 1 → Stage 2 transition. Its perspective is
**domain-grounded rationale generation**: given a set of entities identified
in Stage 1, produce a first-pass meaning layer using the domain pack as the
primary source.

The role does not participate in the Phase 1 exploration loop, does not
produce lens labels or exploration directions, and does not mutate wip.yml.
It emits a directive consumed by the Runtime Coordinator.

### Observation focus

- Entity → domain concept alignment (name / definition / structural relation)
- Pack coverage: concept defined, scope-included-but-undefined, scope-missed
- Evidence grounding: domain_refs must cite specific heading + excerpt

### Assertion type

Per-entity outcome with one of four states:
- `proposed` — rationale inferred with domain evidence
- `gap` — in scope, pack insufficient
- `domain_scope_miss` — outside declared scope
- `domain_pack_incomplete` — scope affirmed, pack lacks concept

## Core questions

- Does the domain pack contain a concept that the entity implements or
  instantiates?
- If yes, what is the entity's intended meaning in the product, grounded in
  the pack?
- If no, does the scope of the domain include this entity's concern at all?
- If within scope but without concept: is this a pack-completeness issue or
  an entity-level ambiguity?

## Procedure

Refer to Step 2 contract §4 (Prompt) and §3 (Output Schema). The role is
invoked by the Runtime Coordinator with a single input package and produces
a single directive as output.

## Output schema

**Single authority**: Step 2 contract §3 is the canonical schema. This role
file restates high-level intent only; field names, validation rules, and
reject conditions are authoritative at §3. In case of conflict, §3 wins.

The role does not emit wip.yml patches directly.

## Boundary routing

### rationale-proposer ↔ Rationale Reviewer (Step 3, Hook γ)

Proposer generates initial rationales at Stage 1 → 2 transition. Reviewer
verifies / revises / fills gaps at Phase 2 Step 2c. Proposer does NOT
revisit its own output — the Reviewer takes over once the proposer directive
is applied.

### rationale-proposer ↔ Explorer

Explorer emits fact deltas during Phase 1 rounds. Proposer consumes entity
list derived from Stage 1 Explorer deltas (after labeling by lenses). Proposer
does NOT re-traverse source code.

### rationale-proposer ↔ Runtime Coordinator

Runtime Coordinator is the sole writer of wip.yml. Proposer emits a directive;
Runtime validates and applies atomically. Partial application is prohibited.

## Language

Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

## References

- Step 2 contract: `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
- Step 1 flow-review: `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §7.1`
- reconstruct contract: `.onto/processes/reconstruct.md §1.0 Team Composition`
- language policy: `.onto/principles/output-language-boundary.md`
```

### 5.2 파일 배치

- 경로: `.onto/roles/rationale-proposer.md`
- git: Track B 구현 세션에서 commit (본 Step 2 는 contract 만 고정, 실제 file write 는 구현 책임)
- 본 §5.1 은 구현 세션의 **canonical reference** — 구현 시 이 본문을 복사하여 role 파일 생성

## 6. Runtime Integration — Stage Transition 내부 배치

### 6.1 기존 Stage Transition (reconstruct.md:769~795 요약)

```
Stage 1 종료 시점:
  1. Runtime Coordinator 가 Stage 1 wip.yml finalize
  2. meta.stage 를 2 로 update
  3. team lead 가 Stage 2 initial exploration directive 를 Explorer 에 전달
  4. meta.module_inventory 를 확정 entity 목록으로 교체
  5. meta.stage1_module_inventory, meta.stage1_uncovered_modules 보존
  6. Stage 2 Round 0 restart
```

### 6.2 Step 2 추가 step (Hook α 배치, r2 state marker + order 재조정)

r1 은 `meta.stage = 2` 를 Hook α 실행 **전에** 세팅하여 실패 시 half-complete state 가 됨 (r1 review B5). r2 는 **`meta.stage_transition_state` 신규 field** 를 도입하여 transition 진행 단계를 명시 tracking:

**`meta.stage_transition_state` enum** (r3: 7 values — r2 의 `alpha_failed_abandoned` 를 2 state 로 split, resumption 모호성 해소):
- `pre_alpha` — Stage 1 finalize 후, Hook α 진입 전
- `alpha_skipped` — inference_mode == none 또는 entity_list empty 로 Hook α skip. Stage 2 진행 가능
- `alpha_in_progress` — Proposer spawn 직전 ~ directive apply 직전
- `alpha_completed` — directive apply 완료. Stage 2 진행 가능
- `alpha_failed_retry_pending` — full failure 후 retry 대기 중 (Principal response 미수신)
- `alpha_failed_continued_v0` (r3 신규) — retry 실패 후 Principal 이 `[v] Switch to v0-only` 선택. **intent_inference 는 populate 되지 않은 채 Stage 2 진행 허용**. raw.yml 의 inference_mode 가 none 으로 downgrade 기록. wip.yml 의 stage 를 2 로 promote
- `alpha_failed_aborted` (r3 신규) — retry 실패 후 Principal 이 `[a] Abort` 선택. **Stage 2 진행 차단**, wip.yml 보존, `meta.stage` 는 1 로 유지

resumption logic: runtime 재시작 시 `stage_transition_state` 를 read 하여 정확한 복귀점 판정:
- `pre_alpha` / `alpha_in_progress` / `alpha_failed_retry_pending` → Hook α 재진입 가능
- `alpha_skipped` / `alpha_completed` / `alpha_failed_continued_v0` → Stage 2 exploration 바로 진입
- `alpha_failed_aborted` → 세션 종료 상태, Principal 이 재실행 결정 필요 (wip.yml 상속 여부 재선택)

**재조정된 flow**:

```
Stage 1 종료 시점 (r7 §7.1 + Step 2 r2 정밀화):
  1. Runtime Coordinator 가 Stage 1 wip.yml finalize
  2. meta.stage1_module_inventory, meta.stage1_uncovered_modules 보존
  3. meta.module_inventory 를 확정 entity 목록으로 교체
  4. meta.stage_transition_state = "pre_alpha" (r2 신규 marker)
     meta.stage_transition_retry_count = 0 (r4 UF-PRAG-01 신규 — one-shot retry 소비 persistence. Principal 응답 후 retry 선택 시 runtime 이 1 로 atomic increment + fsync)
     meta.stage 는 아직 1 로 유지 (Hook α 성공 또는 skip 확정 후 2 로 update)
  
  === Hook α — Rationale Proposer 전용 step (Step 2 신규) ===
  5a. v1 entry precondition 확인 (r2 B4 명시):
      - inference_mode == "none" OR entity_list.length == 0:
          meta.stage_transition_state = "alpha_skipped"
          meta.stage = 2
          → step 6 로 직행 (Stage 2 exploration, Hook α 미실행)
      - inference_mode ∈ {full, degraded} AND entity_list.length ≥ 1:
          → 5b 진행
  5b. meta.stage_transition_state = "alpha_in_progress" + fsync (crash recovery 지원)
      team lead 가 Rationale Proposer spawn:
        - input package 구성 (§2.1)
        - Axiology Adjudicator 와 동형 — fresh agent per invocation
        - prompt = §4 의 template + input package
  5c. Proposer directive 수신:
      - schema validation (§3.7 reject 조건 1~9, §3.7.1 downgrade 조건 D1~D3)
      - reject → §7.1 full failure (meta.stage_transition_state = "alpha_failed_retry_pending")
      - downgrade → warning log + apply 진행
  5d. directive atomic apply:
      - 각 proposal 의 target_element_id 에 대해 wip.yml.elements[].intent_inference 를 populate:
          * inferred_meaning / justification / domain_refs / confidence (post-validation value 만)
          * rationale_state = outcome 직접 대응 ("proposed" / "gap" / "domain_scope_miss" / "domain_pack_incomplete")
          * state_reason = outcome 이 gap/scope_miss/incomplete 인 경우 directive 의 state_reason field
          * provenance = directive provenance block 전체 복사
      - atomic write (temp file + rename 또는 equivalent)
      - meta.stage_transition_state = "alpha_completed"
      - meta.stage = 2
  === Hook α step 종료 ===
  
  6. team lead 가 Stage 2 initial exploration directive 를 Explorer 에 전달
     (stage_transition_state ∈ {alpha_completed, alpha_skipped, alpha_failed_continued_v0} 일 때 도달 — r4 B-new-1 해소. alpha_failed_continued_v0 경로는 Principal 이 [v] Switch to v0-only 를 선택한 후 §7.1 에서 meta.stage 를 2 로 promote 한 뒤 이 gate 로 재진입.
      alpha_skipped 또는 alpha_failed_continued_v0 시 [entity_intent_inferences] block 은 empty — gating 대상 element 가 없음.
      alpha_failed_aborted 상태는 본 gate 에 도달하지 않음 — 세션 종료 상태)
  7. Stage 2 Round 0 restart
```

### 6.3 wip.yml 변경 (Step 2 범위)

Hook α 가 populate 하는 element field:
- `elements[].intent_inference.inferred_meaning` (outcome == proposed 만)
- `elements[].intent_inference.justification` (outcome == proposed 만)
- `elements[].intent_inference.domain_refs` (outcome 별 카디널리티 — r6 DIS-02 sync): `proposed` 필수 (≥ 0, §3.7.1 D2 로 empty 시 low downgrade) / `domain_scope_miss` optional / `domain_pack_incomplete` **필수** (≥ 1, §3.5 required, r5) / `gap` **forbidden** (§3.3)
- `elements[].intent_inference.confidence` (outcome == proposed 만; post-validation value)
- `elements[].intent_inference.rationale_state` (outcome 직접 대응)
- `elements[].intent_inference.state_reason` (outcome ∈ {gap, domain_scope_miss, domain_pack_incomplete} 만, r2 UF-PRAGMATICS-01)
- `elements[].intent_inference.provenance` (전체 block — input_chunks + truncated_fields 포함)
- `elements[].intent_inference.provenance.gate_count = 1` (r3-amendment, Step 4 P-DEC-A1 — 2026-04-23 Principal 승인): Hook α 가 populate 시 모든 outcome 에서 `gate_count = 1` 로 초기화. Hook γ 가 후속 revise/confirm/mark_* 시점에 2 로 증가 (Step 3 §3.7.2 canonical 과 pair). Step 4 protocol §6.2 + §2.3 single-gate badge consume.

Hook α 가 건드리지 않는 element field (다른 hook 책임):
- `principal_provided_rationale` — Hook δ (Phase 3.5, Step 4)
- `principal_note` — Hook δ
- `provenance.reviewed_at / reviewed_by / reviewer_contract_version` — Hook γ (Step 3)
- `provenance.principal_judged_at` — Hook δ

Hook α 가 populate 하는 meta field (r2 신규):
- `meta.stage_transition_state` (enum, §6.2)
- `meta.pack_missing_areas` (array, r2 UF-COVERAGE-01 예약 — §6.3.1)

### 6.3.1 `meta.pack_missing_areas` — pack-level aggregation (r2 UF-COVERAGE-01 예약, r3 UF-AXIOLOGY-01 boundary)

r1 review 가 지적: 여러 entity 가 `gap` 또는 `domain_pack_incomplete` 로 같은 domain area 를 가리킬 때 pack-level signal 로 집계할 surface 부재.

**r2 contract 예약**:

```yaml
meta:
  pack_missing_areas:
    - grouping_key:                    # r4 UF-PRAG-02 — non-semantic key 명시 persist
        manifest_ref: string           # manifest.referenced_files[].path
        heading: string                # 도메인 md 의 heading path (정확 매칭)
      element_ids: array of entity id  # 이 grouping_key 를 domain_refs 로 가진 domain_pack_incomplete element 들
      # r5 UF-CONC-01: count field 제거 — element_ids.length 로 충분
      # r6 UF-CONC-02: area_hint field 제거 — grouping_key.heading 의 derived duplicate
      # 두 field 모두 derived state 이므로 consumer 가 필요 시 grouping_key + element_ids 로부터 계산
```

**r4 scope narrowing (B-new-2 해소)**: `pack_missing_areas` 는 **`domain_pack_incomplete` outcome 의 element 만** 집계. `gap` outcome 은 `domain_refs` forbidden (§3.3) 이라 grouping_key 가 부재 → aggregate 대상 아님. r3 의 `outcome_distribution.gap` field 는 제거.

`gap` element 의 pack-level signal 이 필요하면 Step 3 Reviewer 가 wip.yml 전수 scan 후 `state_reason` semantic 기반으로 별도 집계 (LLM-owned). Step 2 의 `pack_missing_areas` 는 domain_pack_incomplete 전용 **non-semantic aggregate** 로 strict 제한.

**r3 boundary constraint (UF-AXIOLOGY-01 해소)**:

r2 는 runtime 이 "similar state_reason 또는 heading" 으로 grouping 한다고 기술했으나, 이는 **runtime 이 semantic clustering 을 수행** 하는 것 — LLM/runtime 책임 경계 위반. r3 에서 **runtime 의 grouping 은 non-semantic 매칭만 허용**:

- **허용 (runtime 결정적 grouping)**:
  - 동일 `domain_refs[].manifest_ref` + 동일 `domain_refs[].heading` (정확 문자열 매칭) 인 element 집계
  - scope: `outcome == domain_pack_incomplete` 인 element 만 (r4 B-new-2)
- **금지 (runtime 이 해서는 안 됨)**:
  - semantic similarity (예: `heading` 값의 paraphrase 매칭, 의미 근접 개념 묶음)
  - 하나라도 다른 `manifest_ref` 또는 다른 `heading` 문자열 에 속한 element 를 같은 group 으로 묶기

**semantic refinement 의 v1 위치 (r3-amendment, Step 4 P-DEC-A1 — 2026-04-25 Principal 승인)**: Reviewer 는 v1 에서 `pack_missing_areas` 에 관여하지 않음 (Step 3 §6.3.1 canonical — Reviewer 의 output directive schema 에 `pack_missing_areas_refinement` 가 없음). Step 2 의 Hook α 후처리 aggregate 가 v1 의 **유일한 writer**. semantic refinement (heading paraphrase 매칭, 의미 근접 grouping) 는 **v1.1 backlog** (Step 3 protocol §10.2 `pack_missing_areas semantic refinement`).

본 Step 2 §6.3.1 의 "**provisional**" 문구 (이전 r2~r6 기술) 는 v1.1 이연 fact 임을 명시 — Step 3 merge 이후에도 v1 scope 에서는 Reviewer 가 `pack_missing_areas` 를 재작성하지 않는다. Hook α 가 v1 의 sole writer.

**population 규칙 (r4 narrowed)**:
- Hook α directive apply 후 runtime 이 **후처리 pass** 로 생성
- scope: `outcome == domain_pack_incomplete` 만
- 동일 `domain_refs[].manifest_ref + heading` 정확 매칭으로 그룹핑 (non-semantic)
- empty array `[]` 는 허용 (domain_pack_incomplete 0 개면 field 생략 가능)
- Reviewer (Step 3) 가 refine 가능 (gap 까지 포함하는 semantic aggregate 는 Reviewer 의 책임)

**소비처** (Step 2 scope 밖):
- Step 3 (Hook γ Reviewer) 가 참고하여 batch review + semantic refine
- Step 4 (Phase 3) 가 Principal 에게 "pack 의 area X 에 N 개 entity 가 missing" 로 요약 제시

본 Step 2 는 **field 예약 + non-semantic population rule** 만 — semantic grouping 은 이후 Step 의 책임.

### 6.4 Explorer prompt 주입 규칙 — post-validation confidence 기반 (r2 B2 해소)

Step 1 §7.2 canonical 을 runtime 구현 구조로 정밀화. r2 핵심: gating source 는 **post-validation confidence** (runtime 이 §3.7.1 downgrade 후 저장한 값) — agent 의 self-reported 원값 아님.

```
Stage 2 round N 의 Explorer prompt 구성 시:
  1. wip.yml 을 load
  2. elements[] 중 다음 조건 모두 만족하는 element filter:
     - intent_inference.rationale_state ∈ {proposed, reviewed, principal_accepted, principal_modified}
     - intent_inference.confidence ∈ {medium, high}
       (wip.yml 에 저장된 POST-validation value — §3.7.1 downgrade 가 반영된 상태)
  3. filtered element 의 intent_inference.inferred_meaning + justification 를
     [entity_intent_inferences] block 에 주입
  4. 주입된 count / total entities count 를 block header 에 명시
  5. "These inferences are hints, not source-verified facts" 문구 포함
```

**r2 원칙**: Proposer 가 over-claimed `high` confidence 를 self-report 했더라도 runtime 이 §3.7.1 D1~D3 으로 downgrade 한 후 저장. Explorer gating 은 downgraded value 를 본다 → self-report bias 없음.

이는 Hook β 의 자동 파생 — 별도 step 아님. Explorer prompt 구성 로직에 상시 적용.

## 7. Failure Handling

### 7.1 Full failure — Proposer agent 가 실패 (응답 없음 / invalid directive)

**정의**:
- agent invocation timeout
- network / LLM 오류
- directive schema validation 실패 (§3.7 의 9 reject 조건 중 하나, r2/r3)

**runtime 처리**:
1. Stage 2 진입 **차단** (Stage Transition 의 step 6 직행 금지)
2. Principal 에게 interactive prompt:
   ```
   Rationale Proposer failed at Stage 1 → 2 transition.
   Failure kind: {timeout / invalid_directive / llm_error}
   Details: {error message}
   
   Choose:
   [r] Retry — respawn Proposer with same input (one-shot retry)
   [v] Switch to v0-only mode — abandon v1 rationale inference for this session,
       continue Stage 2 without intent_inference populate
   [a] Abort reconstruct — halt session, preserve wip.yml for inspection
   ```
3. interactive 불가 (non-interactive CI) 시: **abort 기본값** — 의도치 않은 silent v0 fallback 금지
4. **retry 는 1 회 한정, enforcement 규칙 (r5 DIS-01 해소)**:
   - Principal 이 `[r] Retry` 선택 시, runtime 이 **spawn 전에** `meta.stage_transition_retry_count` 를 read
   - `retry_count >= 1` 이면 `[r]` 선택지를 Principal prompt 에서 **제거** (표시 안 함) — Principal 은 `[v]` / `[a]` 만 선택 가능
   - `retry_count < 1` 이면 runtime 이 `retry_count` 를 atomic increment (+1) + fsync → Proposer 재spawn (step 5b 재진입)
   - 즉 retry 의 enforcement 는 runtime 의 deterministic read + conditional UI rendering + atomic increment. Principal 이 retry_count 를 직접 조작하는 경로 없음
5. Principal 응답별 state transition (r3 B-new-2 해소):
   - **[r] Retry**: `meta.stage_transition_state = "alpha_in_progress"` 로 복귀. Proposer 재spawn. 1 회 한정
   - **[v] Switch to v0-only**: `meta.stage_transition_state = "alpha_failed_continued_v0"` + `meta.stage = 2` + `raw.yml.meta.inference_mode = "none"` + `raw.yml.meta.fallback_reason = "proposer_failure_downgraded"`. intent_inference 미populate 상태로 Stage 2 exploration 진행. raw.yml 은 v0 mode 로 기록.
     - **r5 COND-01 해소 — Step 1 fallback_reason enum additive patch 제안**: Step 1 r7 §4.7 의 `fallback_reason` enum 은 현재 `{user_flag, principal_confirmed_no_domain}` 2 값만. 본 Step 2 구현 PR 에서 Step 1 §4.7 table 에 **`proposer_failure_downgraded`** row 를 additive 추가 (decision-approved 재협의 없음 — enum 에 값 추가는 breaking change 없는 additive extension). 구현 시점에 Step 1 decision 문서 §4.1 의 Q8 (Fail-close mode 분기) 승인의 spirit 내 extension 으로 기록
   - **[a] Abort**: `meta.stage_transition_state = "alpha_failed_aborted"` + `meta.stage = 1` 유지 + wip.yml 전체 보존. Stage 2 진행 차단. 세션 종료 — Principal 이 재실행 판정
   - **non-interactive** (CI) 기본: `[a] Abort` (silent v0 fallback 금지, Step 1 r7 §5.3 의 no-domain fail-fast 원칙과 동형)

### 7.2 Partial failure — 폐지 (r2 B1 + B3 해소)

r1 은 `proposals.length < entity_list.length` (§3.7 rule 1) 를 "partial recovery" 로 처리했지만, 두 BLOCKING 이 이 설계를 무효화:

- **B1**: 같은 조건이 §3.7 atomic reject 와 §7.2 recover-and-apply 두 경로에 동시 존재 → 결정적 규칙 부재
- **B3**: runtime 이 누락 entity 에 `outcome: gap` 를 대신 생성하고 `provenance.proposed_by: "rationale-proposer"` 로 stamp → LLM/runtime boundary 흐려짐, provenance 진실성 훼손

**r2 결정**: partial recovery 경로 **폐지**. `proposals.length != entity_list.length` 는 §3.7 rule 1 에 의해 **full failure** (§7.1 경로). runtime 은 누락 entity 를 대신 채우지 않음 — Proposer 가 모든 entity 에 대해 명시적으로 outcome 을 emit 하도록 강제.

**함의**: LLM 이 어쩌다 일부 entity 를 omit 하면 full failure 로 retry. retry 에서도 실패하면 Principal 이 `[v] Switch to v0-only` / `[a] Abort` 선택. **runtime 이 LLM 을 대리하여 출력을 생성하지 않는다** 는 원칙 관철.

### 7.3 Directive schema validation 실패 — §3.7 + §7.1 pointer (r4 UF-CONC-01 collapse)

r2/r3 는 reject rule list 를 본 섹션에서 재열거했지만 §3.7 과 duplicated. r4 는 **§3.7 을 authority, §7.1 을 processing path** 로 pointer 통일:

- **Reject rule list authority**: §3.7 (rule 1~9) — 단일 authority
- **Processing path**: §7.1 — Principal response 별 state transition
- 모든 rule 1~9 위반은 full failure 로 §7.1 경로 (retry 1 회 한정 + [v]/[a] 선택지)

duplicated enumeration 제거. 상세 validation rule 은 §3.7 에서만 참조.

### 7.4 `confidence` 자동 downgrade — 별도 downgrade 경로 (r2 UF-LOGIC-01)

§3.7.1 D1~D3 은 **reject 와 구별되는 downgrade-only 규칙**. r1 에서 rule 8 이 reject list 와 warning list 양쪽에 놓였던 모순을 r2 에서 해소:

- §3.7 = reject list (9 rules, 모두 full failure)
- §3.7.1 = downgrade-only (D1~D3, warning + apply)

**downgrade 처리 순서**:
1. Runtime validator 가 directive 수신 → §3.7 rule 1~9 전수 검사
2. 어느 하나라도 reject → full failure (§7.1)
3. 통과 시 → §3.7.1 D1~D3 적용:
   - D1 (high + refs < 2) → medium 으로 교체
   - D2 (refs == 0) → low 로 강제 (medium 또는 high 였어도)
   - D3 (medium + all optional refs) → low 로 교체
4. downgraded value 로 wip.yml apply
5. agent 원 출력은 `.onto/builds/{session}/session-log.yml` 에 preserve

Explorer gating (§6.4) 은 step 4 결과 (post-validation confidence) 를 consume — self-reported value 아님 (r2 B2).

## 8. §14.6 invariant 재확인

Step 2 는 Step 1 과 동일하게 **본질 sink 확장이 아니라 기존 `wip.yml.elements[].intent_inference` field 의 초기 populate**. 신규 sink 없음.

dogfood off 시나리오:
- wip.yml 및 intent_inference field 는 dogfood 와 무관하게 정상 작동
- dogfood layer (있다면) 는 wip.yml 을 read-only mirror 로 소비
- Proposer directive 는 transient — runtime apply 후 destruct. sink 아님
- Proposer agent 자체는 fresh per invocation — 영속 state 없음

결과: Step 2 도 §14.6 invariant 를 자연 만족.

## 9. Step 2 결정 표면 (Principal 합의 요청)

Step 1 의 Q 수준 대비 Step 2 는 **mechanical detail** 로 Principal 판정이 덜 필요하지만, 구조적 선택이 있는 지점은 Q 로 분리:

| # | 결정 | 옵션 | 권장 |
|---|---|---|---|
| **Q-S2-1** | Input 에 `source.locations` 포함 여부 | A. 포함 (per-entity) — domain 매칭 단서 제공 / B. 제외 — pack 기반 추론 원칙 엄격 | **A** — location 은 domain heading 과의 문자열 매칭 단서 (예: 디렉토리 이름이 pack 개념과 매칭) 로 유용. content 주입과 구별 |
| **Q-S2-2** | Input 에 `relations_summary` 포함 여부 | A. 포함 — entity 간 관계 맥락으로 추론 품질 향상 / B. 제외 — entity 독립 판정 | **A** — 같은 domain 의 "session ↔ user" 관계는 pack 에서 도출 가능하되 product 에서 확인. relations_summary 가 그 bridge |
| **Q-S2-3** | `confidence: empty domain_refs` 허용 여부 | A. 허용 (자동 low) — fail-loud 원칙, Principal 판정 가능 / B. reject — 무근거 추론 차단 | **A** — Step 1 r5/r6 에서 "fail-loud not fail-silent" 원칙 확정. low confidence 노출이 silent reject 보다 나음 |
| **Q-S2-4** (r2 revised) | Partial failure 처리 | A. full failure 처리 (§7.3) — runtime 이 LLM 을 대리 생성하지 않음. partial 수신은 retry / v0-only / abort 로 흐름 / B. runtime 자동 gap 처리 (r1, BLOCKING B1/B3 원인) | **A** — r2 폐지 결정. provenance 진실성 (LLM/runtime boundary) 이 "Stage 2 차단 회피" 보다 우선 |
| **Q-S2-9** (r2 신규, r3 split) | `meta.stage_transition_state` field 도입 | A. 도입 (§6.2) — 7 enum 으로 resumption 복귀점 명시 (r3: r2 의 6 enum 에서 `alpha_failed_abandoned` 를 `alpha_failed_continued_v0` + `alpha_failed_aborted` 로 split) / B. 기존 `meta.stage` integer 로 충분 | **A** — r1 B5 해소 + r2 B-new-2 해소. half-complete state 의 audit 가능성 + [v]/[a] 분기 resumption 구별 |
| **Q-S2-10** (r2 신규) | `meta.pack_missing_areas[]` field 예약 | A. 예약 (§6.3.1) — 본 Step 2 는 field 만 고정, heuristic 은 이후 Step / B. 예약 없음 | **A** — r1 UF-COVERAGE-01 해소. Phase 3 consumer 의 structural landing surface |
| **Q-S2-11** (r2 신규) | `intent_inference.state_reason` field — 단일 unified reason | A. 단일 field (§3.5.1) — outcome 별 reason 을 하나의 field 에 / B. outcome 별 별도 field (gap_reason / scope_miss_reason / incompleteness_reason) | **A** — r1 UF-PRAGMATICS-01 해소. downstream 인터페이스 단순화 |
| **Q-S2-12** (r2 신규) | Schema single authority | A. §3 가 authority, §4 prompt / §5 role 은 reference only / B. 3 곳 독립적 restate | **A** — r1 C2 + UF-STRUCTURE-01 해소. drift 원천 차단 |
| **Q-S2-13** (r2 신규) | Single-shot full-pack vs smallest-sufficient-bundle | A. v1 = single-shot + trade-off 명시 (§4.1) + truncation provenance 예약 / B. v1 = smallest-bundle (manifest schema 확장 필요, 복잡) | **A** — r1 UF-AXIOLOGY-01 해소. coordinator simplicity 우선, smallest-bundle 은 v1.1 |
| **Q-S2-14** (r2 신규) | Post-validation confidence 를 Explorer gating source 로 | A. 채택 (§6.4) — runtime-downgraded value 가 canonical / B. agent self-reported value 사용 | **A** — r1 B2 해소. self-report bias 방지 |
| **Q-S2-15** (r2 신규) | domain_refs citation constraint | A. manifest 있고 AND content 주입된 파일만 (§3.7 rule 8) / B. manifest 만 있으면 OK (r1) | **A** — r1 B2 해소. degraded pack 의 uninjected optional 인용 차단 |
| **Q-S2-16** (r3 신규) | `alpha_failed_abandoned` state split | A. `alpha_failed_continued_v0` + `alpha_failed_aborted` 분리 (§6.2) — resumption 명확 / B. 단일 state 유지 | **A** — r2 B-new-2 해소. [v] vs [a] Principal 선택의 resumption semantic 정확화 |
| **Q-S2-17** (r3 신규) | Per-entity truncation marker | A. proposals[].__truncation_hint field 예약 (§3.1) — entity 단위 audit / B. session-level truncated_fields 만 | **A** — r2 UF-EVOLUTION-01 해소. degraded reasoning 의 entity-level trace 가능 |
| **Q-S2-18** (r3 신규) | `provenance.effective_injected_files[]` 예약 | A. 예약 (§3.6) — degraded pack audit 지원 / B. 예약 없음 | **A** — r2 UF-COVERAGE-01 해소. consumer 가 "이 추론이 어떤 파일 근거로 생성되었는가" 역추적 |
| **Q-S2-19** (r3 신규) | `pack_missing_areas` runtime grouping 경계 | A. non-semantic (정확 manifest_ref+heading 매칭) 만 허용, semantic grouping 은 Step 3 Reviewer 이연 / B. runtime 이 semantic grouping 수행 (r2) | **A** — r2 UF-AXIOLOGY-01 해소. LLM/runtime 책임 boundary 유지 |
| **Q-S2-20** (r3 신규) | `domain_refs` 카디널리티 0 허용 | A. 0 이상 허용 + §3.7.1 D2 자동 low downgrade (§3.2) / B. ≥1 reject (r1 drift) | **A** — r2 UF-PRAGMATICS-01 해소. Fail-loud 원칙 (Step 1) 과 정합 |
| **Q-S2-5** | Full failure 시 non-interactive 기본 | A. abort (§7.1) / B. v0-only 자동 전환 | **A** — silent v0 fallback 금지 (Step 1 Q16 의 no-domain 통일 원칙과 동형) |
| **Q-S2-6** | Retry 횟수 | A. 1 회 (§7.1) / B. 0 회 / C. N 회 | **A** — Axiology Adjudicator 의 retry 관행 (reconstruct.md §1.0 partial failure rule) 과 정렬. 2 번째 실패는 systemic issue 신호 |
| **Q-S2-7** | Prompt version bump 규약 | A. `proposer_contract_version` 을 본문 변경 시 명시 bump (§4.2) / B. manifest_schema_version 에 통합 | **A** — contract 수준의 version 과 manifest 수준의 version 은 서로 다른 audit 축. 분리 유지 |
| **Q-S2-8** | `confidence` 자동 downgrade | A. warning + apply (§7.4) / B. reject directive | **A** — Principal 이 Phase 3 에서 판정 가능. agent 의 self-report 가 over-claim 이어도 consumer-side correction 으로 충분 |

### 9.1 원 Step 1 Q 와의 관계

Step 2 의 Q 는 Step 1 의 Q3 (Rationale Proposer fresh agent) 의 **mechanical 하위 결정**. Step 1 Q3 이 승인 상태이므로 Step 2 Q-S2-* 는 그 구체화 — Step 1 결정 re-open 아님.

## 10. 미해소 / backlog

### 10.1 구현 세션 진입 시 결정

- Token budget 의 실제 empirical tuning (entity 100+ 세션에서 batch vs chunking) — 구현 세션 책임
- `provenance.runtime_version` 의 소스 (package.json version? git SHA? 별도 runtime version 파일?) — 구현 세션 결정
- Retry 실패 시 Principal 에게 제시하는 message 의 실제 문구 tuning — 구현 세션
- `rationale-proposer.md` role 파일의 실제 commit 시점 (본 contract merge 시 vs 구현 세션) — PR scope 논의
- Proposer directive 가 wip.yml 에 apply 된 후 Hook β propagation 이 즉시 적용되는가 (다음 Explorer prompt 부터) — 기본 yes, 구현 시 확인
- session-log.yml 에 original agent output 보존 format — 구현 세션
- `meta.pack_missing_areas` population 구현 세부 — r4 기준 scope: `outcome == domain_pack_incomplete` 만, `manifest_ref + heading` 정확 매칭만 (non-semantic). state_reason 기반 유사도 grouping 은 **runtime scope 밖** (Step 3 Reviewer 책임)

### 10.2 v1.1 이후 이연 (r2 명시)

- **Smallest-sufficient-bundle domain injection** (r2 UF-AXIOLOGY-01 trade-off 기록): v1 single-shot 대신 entity 단위 concept selective injection. manifest schema 에 concept-level tagging 추가 필요. v1.1 backlog
- **Scope-declaring file 의 manifest-level marker** (r2 C3 softening): 현재 domain_scope.md 를 manifest.referenced_files 내에서 문서 관행으로 지정. manifest schema v2.0 에서 `role: "scope_declaration"` 같은 명시 marker 추가 검토. v1.1 backlog
- **Chunking 도입 시 provenance format** (r2 UF-EVOLUTION-01 연속): v1 contract 가 `input_chunks` + `truncated_fields` field 만 예약. 실제 chunking strategy + cross-chunk consistency 는 v1.1
- **Step 1 flow-review r7 §12.1 의 backlog 들** (`domain_refs` stable identity, provenance normalization, pack upgrade re-entry) — Step 1 에서 이미 이연됨. Step 2 에도 영향 없음

## 11. 본 문서의 위치

- **Previous**: Step 1 PR #201 (bae608e, 2026-04-23) — Q1~Q16 일괄 승인
- **r1** (오전 초안) → review (`c4806103`, 5 BLOCKING)
- **r2** (오후) — mechanical contract 재정밀화 → review (`d917a60c`, 2 BLOCKING + 1 conditional + 5 UF)
- **r3** (내부 consistency) → review (`0f5f98dc`, 2 BLOCKING + 1 Cond + 5 UF)
- **r4** (Stage 2 gate + pack_missing_areas narrow + retry persist) → review (`b845a4e9`, 3 Consensus + 1 Cond + 2 Disagreement + 1 UF)
- **r5** (domain_refs required + retry enforcement + count 제거 + enum additive) → review (`2fd6eb6a`, 3 Consensus + 1 Cond + 2 Disagreement mirror drift + 2 UF)
- **Current**: r6 (본 문서) — mirror drift sweep (§4 outcome D + §6.3 field matrix + §11 sync + area_hint 제거)
- **Next**: r6 에 대한 `/onto:review` 6차 실행
- **그 다음**: clean pass 도달 시 Step 2 decision 문서 → PR → Step 3 (Hook γ Rationale Reviewer)

**Revision 이력의 단일 authority**: frontmatter `revision_history:` (YAML) 가 canonical. 본 §11 은 요약 pointer. r4 UF-CONC-02 해소: r3 까지 중복 존재했던 §12 section 은 제거 (frontmatter + §11 두 곳으로 통일).

**Next Step (Step 3) 예고**: Hook γ Rationale Reviewer 의 동형 protocol 구체화. 본 Step 2 의 **schema single authority + partial recovery 폐지 + post-validation gating + state_reason unified + stage_transition state machine + pack_missing_areas narrow scope** 패턴을 거울 참조하여 Reviewer 의 input (전체 wip.yml + manifest) / output directive (operation enum: confirm/revise/mark_*/add_for_stage2_entity) / role 파일 / runtime integration (Phase 2 Step 2c parallel dispatch) / failure handling 을 확정.
