---
as_of: 2026-04-13T15:00:00+09:00
supersedes: null
status: active
revision: v3.2
revision_note_v3_2: |
  v3.1 (commit f0b66dd) 기반 v3.2 patch. 9-lens review session `20260413-cf964039` 의 **MINOR Recommendations 6~21 + unique lens findings** 전수 해소 (약 20건).
  주요 변경:
  - [CN-2] DR-M03-02 `already covered` 4 경로에 `verification_source: inventory_done | explicit_exclusion | post_direction_verified | m03_schema_absorption` sub-태그 도입. BL-041 Notes 에 `verification_source: m03_schema_absorption` 반영.
  - [S-4] §10 build_coordinator_redesign anchor 에 cluster + BL-097→BL-095→BL-096 순서 명시.
  - [S-3 + axiology A-6] BL-122 ↔ DL-022 양방향 연계 (BL-122 resolution_path/reactivation_trigger + DL-022 context note).
  - [P-1] DL-011 resolution_note 에 evidence_ref 추가 (execution-log timestamp + 스캔 명령 + stdout).
  - [semantics §3 + pragmatics P-4] Activity 분포 L=0 각주 (Phase 1/2/3 merge 완료 + CC-3 재분류).
  - [semantics §6] Canonicality 분포 표 상단에 work-level vs document-level 구분 문구.
  - [semantics §7 + dependency D-4] DL-010 cross-ref 를 `rule_to_instance` relation name 으로 정규화. ledger frontmatter 에 `relation_names` 선언.
  - [semantics §8] legacy_name_mapping 에 3-scope (activity 분류 / 파일명·명령명 / 관용 표현) 주석.
  - [semantics §5] DR-M03-04 context 에 "§1 정본 정합성(DR-M03-02 분리) vs cycle 우선순위(본 DR)" 구분 명시.
  - [E-1] consolidated frontmatter 에 `activity_enum_ref` + `axis_enum_ref` 추가 (§1 정본 직접 참조, DL-014 M-04 Phase A 에서 authority/core-lexicon.yaml canonical seat 으로 이관 예정).
  - [E-2] `id_scheme` 에 dedup_retire / n/a 전환 시 tombstone 처리 + ID 공간 구멍 허용 규칙 추가.
  - [E-5] ledger frontmatter 에 `stage_id_scheme: "M-NN 또는 M-NN-X"` 명시.
  - [E-6] DL-007 context 에 axis D 30+ monitoring seat 의 DL-027 흡수 명시.
  - [E-7] DL-027 context 에 schema_version migration logic (v2→v3 변경 fields, rollback, downstream reader 재파싱) 포함.
  - [C-1 ghost] **DL-029 신규 도출** — review §1.4 ontology 유무 경로 분기 (M-06 resolution_stage). DL-017 measurement-infra 와 범위 분리.
  - [C-6] BL-118 Notes 에 "M-08 refresh 시 n/a 재분류 가능성 재평가" 노트.
  - [CN-4] DL-025 context 에 deferred sub-source 3종 → `deferred_reason` enum 승격 검토 포함.
  - [CN-5] m00-decisions.md 의 DR-M00-06 을 SSOT 로 유지 + ledger §"관리 정책" 을 참조로 축약.
  - [S-4 + D-3] DL-013 Notes 에 M-04 Phase A task schema `depends_on` 필드 슬롯 예약 명시.
  - [NP-1] **DL-030 신규 도출** — Aggregate Prioritization Coherence Lens 제안 보존 (M-08 resolution_stage, lens set 확장 여부 governance 결정).
  추가 카운트 변화: ledger item_count 28 → 30 (DL-029 + DL-030), pending_count 16 → 18. 새 resolved 없음.
  이전 이력:
  - v3.1 (commit f0b66dd): 9-lens review BLOCKING 1 + MAJOR 4 + MODERATE 5 해소.
revision_note_v3_1: |
  v3 (commit a53981b / b370fe0 / 742d125) 기반 v3.1 patch. 9-lens review session `20260413-cf964039` CONDITIONAL verdict 의 BLOCKING 1 + MAJOR 4 + MODERATE 5 해소.
  주요 변경:
  - [BLOCKING C-A] Disposition 분포 산술 off-by-one 수정 — 본문 실측 gap 101 / deferred 21 / already_covered 1 / n_a 0 = 123. 요약 + CURRENT.md + execution-log 3지점 동기화. "본문 표 = canonical" 선언 + invariant 산술 주석 추가.
  - [MAJOR C-B] `already covered (partial)` enum 경계 위반 해소 — DR-M03-01 Decision.3 에서 "(partial)" 제거. DR-M03-02 `already covered` 정의에 경로 (d) 추가 ("M-03 내부 DR 이 schema/rule pre-gate 보강으로 item 요구를 흡수한 경우"). BL-041 Notes ↔ DL-006 resolution_note 양방향 링크.
  - [MAJOR C-C] DR-M03-03 subordinate rule 2개 추가 — (i) governance decision execution → canonical-advancing (BL-121 retain), (ii) seat seed 정돈 → supporting (BL-088~090 판례). applied_cases 등재.
  - [MAJOR CC-C] DR-M03-03 에 `onto_direction_ref: "...20260413-onto-direction.md#as_of=2026-04-13"` snapshot anchor + §1 변경 escalation_trigger. DR-M03-02 에 `inventory_staleness_policy` 필드. canonical-advancing 7건 Notes 에 precedes/depends_on inline (BL-053/064/122 → BL-123, BL-120 → DL-017 등).
  - [MAJOR CC-D] DR-M03-01 을 `dedup_evidence_schema` primary_owner_of 로 지정. consolidated v3 schema block 에 `owning_decision: DR-M03-01` back-link. DL-006 resolution_note 에 "DR-M03-01 의 schema instantiation 을 수용" downgrade.
  - [MODERATE C-D] DR-M03-04 에 `priority_x_disposition_mapping` 규칙 추가 (P3 "경향" → "default mapping + Principal escalation"). BL-119 P2 vs BL-120 P1 경계 applied_cases 기록. "P1 후보 7건" → "M-06 first-candidate 7건" rename (priority axis 와 gap × canonical-advancing axis 구분).
  - [MODERATE C-E] `dedup_evidence` 3건 basis 값 enum literal 정규화 + `basis_rationale` 필드 분리.
  - [MODERATE C-F] DL-004 resolution_note 에 Scope="대표 사례 부착" 명시 (전수 적용 아님). 전수 필드 필요 시 M-04 Phase A 또는 별도 DL 로 재정의.
  - [MODERATE CC-A] BL-120 Notes 에 "측면 1 점진성 proxy 도 동시 계측 대상" 보강. DL-017 context note 에 M-06 3 지표 전수 work item 분할 필수 + BL-120 superset 관계 명시.
  - [MODERATE CC-B] §1/§2 anchor 에 `cluster: processes-build-md-residuals` 태그. 요약에 scaffolding 50.4% 분포 정당화 문단 (62건 중 44건 71% post-PR hygiene). DL-023 context 에 `scaffolding_ratio_trend` health metric.
  - BL-122 MINOR (axiology A-6) 병행 반영: resolution_path/reactivation_trigger Notes inline.
  이전 이력:
  - v3 (commit a53981b): M-03 disposition + canonicality 분류. DL-004~012 resolved. DR-M03-01~04.
revision_note_v3: |
  v2.1 (commit 84736c7) 기반 v3 patch. M-03 (Gap 분석 + Disposition 분류) 결과 통합.
  주요 변경:
  - 본문 표 컬럼 추가: `Disposition` (4분류) + `Canonicality` (3분류). 123 BL 전원 할당.
  - 요약 섹션 재작성: Disposition 분포 + Canonicality 분포 + gap × canonical-advancing 교집합.
  - Pre-cutoff 37건 Notes 에 `P1/P2/P3` priority 태그 추가 (DR-M03-04).
  - frontmatter 보강 (DL-004 C-4 schema): `id_scheme` stable 화 (v3 이후 BL-ID 재할당 금지), `schema_version v3`, row-level traversability 필드(`src`, `origin_date`, `merged_from`)는 본 표 Notes 컬럼에 inline 포함.
  - frontmatter `source_taxonomy` 도입 (DL-005 C-6): backlog_memory / memory / design / pr / onto_direction 각 source 카테고리의 경계·제외 규칙 명시.
  - frontmatter `dedup_evidence.schema` 재정비 (DL-006 C-7 + DR-M03-01): `basis` 카테고리 고정 enum, `kept_primary_source` + `linked_supporting_sources` 필드 분리, `supersedes`(doc-level) vs `dedup_retires`(item-level) 관계명 명시.
  - DL-007/008/010 ledger 해소: CC-2 axis D sub-tag 미도입(15 item 모두 lexicon/provisional 범위 내), CC-3 L/G 경계는 이미 v2에서 반영 확인, CN-1 BL-085↔BL-103은 dedup 아님 cross-ref 관계 명시.
  - DL-011/012 해소: M-03 시작 시점 Open PR 0건 (snapshot 유효), BL-041 standing lens 승격은 DR-M03-01 로 폐기 (axiology 자체가 반대, dedup pre-gate 로 분해).
  이력:
  - v2.1 (commit 84736c7) Deferred ledger DL-001/002/003 반영. BL-035 E→G, BL-121 G→E,G, L452 오타 수정.
  - v2 (commit 3d360ab) v1 9-lens review (session 20260413-30463d46) 결과 BLOCKING 2 + MAJOR 2 반영.
  - v1 (commit 69fcdc4) 초판 120 items.
functional_area: backlog-consolidation
item_count: 123
canonicality: scaffolding
authority_stance: non-authoritative-plan-surface
schema_version: v3
id_scheme: "BL-NNN (v3 기점 stable. M-03 disposition 할당 완료로 citation 허용. 향후 revision 에서 ID 재할당 금지 — 신규 item 은 BL-124 이후 sequential). dedup_retire / n/a 전환 시 ID 는 tombstone 처리 (본문에서 row 제거 but dedup_evidence/disposition_history 에 기록 유지). 신규 + retire 동시 발생 시 ID 공간 구멍 허용 (E-2 반영)."
primary_tag_convention: "comma-list의 첫 태그 = primary. primary-only 집계 기준"
activity_enum_ref: "development-records/design/20260413-onto-direction.md#§1.2 (E/D/R/L/G 5 활동). DL-014 에서 authority/core-lexicon.yaml canonical seat 으로 이관 예정 (M-04 Phase A)"
axis_enum_ref: "development-records/design/20260413-onto-direction.md#§1.5 (A/B/C/D 4 축). DL-014 연계"
legacy_name_mapping:
  build: reconstruct  # §1.2 기준. scope: (1) activity 분류 시 build→reconstruct (E) 로 계산, (2) 파일명·명령명 (processes/reconstruct.md, commands/reconstruct.md, npm build:*) 은 legacy 유지 — BL-121 agent_id_rename 유사 Phase 이전까지 병존 허용, (3) 관용 표현 ("build 프로세스", "build 명령") 은 legacy 명칭 유지 가능. rename/retire 는 M-06 신규 도출 또는 향후 Phase 로 위임.
source_counts:
  memory: 29
  backlog_memory: 87
  design: 4
  pr: 0
  onto_direction: 3  # §1 정본 직접 지시 항목 (신규 source 카테고리)
source_taxonomy:
  backlog_memory:
    description: "`{project}/.claude-1/.../memory/project_*_backlog.md` 파일. 특정 기능·영역의 post-review 잔여 backlog 를 집약한 memory artifact"
    inclusion_rule: "filename 에 `_backlog` 접미사를 가진 memory file 전수 포함"
    excluded_paths: ["status=COMPLETED 또는 RESOLVED 로 명시된 entry"]
  memory:
    description: "non-backlog memory file entry. MEMORY.md index 의 project_*.md / feedback_*.md 중 IN PROGRESS / PLANNED / DESIGNED status 를 가진 항목"
    inclusion_rule: "MEMORY.md 에서 status 가 IMPLEMENTED/MERGED/COMPLETED 가 아닌 entry 의 file body"
    excluded_paths: ["status=IMPLEMENTED 단일 선언만 있고 body 에 follow-up memo 없는 경우"]
  design:
    description: "`development-records/design/*.md` 설계 문서. explicit backlog 섹션 보유 또는 TBD·hypothesis 선언"
    inclusion_rule: "design 문서 본문에 `backlog` / `hypothesis` / `TBD` 명시 섹션"
  pr:
    description: "GitHub open PR snapshot (M-00 재스캔 시점). merged PR 은 explicit_exclusions 의 evidence_ref 로만 참조"
    dual_role: "open=inclusion (신규 작업 seed), merged=exclusion evidence (already covered 판정 근거)"
  onto_direction:
    description: "§1 정본 (`development-records/design/20260413-onto-direction.md`) 본문이 직접 지시한 backlog 항목"
    inclusion_rule: "본문에 '폐기' / '보류' / '다음 작업' 등 직접 지시문구"
dedup_events: 3
dedup_evidence_schema:
  owning_decision: DR-M03-01  # dedup_evidence_schema 의 primary owner. DL-004/DL-006 은 본 schema 의 instantiation 을 ledger 관점에서 서술
  basis_enum: ["reference_normalization", "title_topic_scope_identity", "partial_overlap_with_distinct_scope"]
  fields:
    - kept_primary_source: "authority/lineage 를 더 잘 보존하는 source (DR-M03-01)"
    - linked_supporting_sources: "동일 이슈를 담는 나머지 source (PR, memory 등)"
    - kept_because: "primary 선택 근거 (pairwise tie-break 한정)"
    - basis_rationale: "basis_enum 값의 자연어 근거 (C-E 반영)"
    - dedup_retires: "item-level retirement — 특정 entry 의 폐기"
  distinction:
    supersedes: "document-level 관계 — 전체 문서가 다른 문서로 대체됨. frontmatter `supersedes` 필드"
    dedup_retires: "item-level 관계 — 동일 issue 를 담는 2+ entry 중 하나를 retire"
dedup_evidence:
  - basis: reference_normalization
    basis_rationale: "parent index ↔ detailed list"
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#4 review_record entity 승격 검토" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-3 review_record entity 승격 검토" }
    kept: "Principal Stage 3 #4 (detailed)"
    dedup_retires: "lexicon_stage2_prep.md Stage 3-3 (brief summary)"
    kept_because: "principal_stage3_backlog is the detailed canonical list; lexicon_stage2_prep.md Stage 3 is a parent index"
  - basis: title_topic_scope_identity
    basis_rationale: "title + topic + scope 동일 (≥95%)"
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#5 build/ask/learn/govern/design dispatch target relation" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-1 dispatch target relation" }
    kept: "Principal Stage 3 #5"
    dedup_retires: "lexicon_stage2_prep.md Stage 3-1"
    kept_because: "same item, principal_stage3 has richer context"
  - basis: title_topic_scope_identity
    basis_rationale: "title + topic + scope 동일 (≥95%)"
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#6 entrypoint별 process entity" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-2 process entity" }
    kept: "Principal Stage 3 #6"
    dedup_retires: "lexicon_stage2_prep.md Stage 3-2"
    kept_because: "same item"
explicit_exclusions:
  - item: "lexicon_stage2_prep.md Stage 3-5 (processes/design.md 설계자 → 주체자)"
    reason: "DONE (verified)"
    verification_status: "verified"
    evidence_ref: "grep -c '설계자' processes/design.md → 0, grep -c '주체자' → 27; PR #12 merged (c23fa90, 2026-04-11)"
  - item: "optimization-4features.md Feature 9 (Agent Error Auto-Recovery)"
    reason: "IMPLEMENTED"
    verification_status: "verified"
    evidence_ref: "project_agent_error_retry.md IMPLEMENTED 2026-03-29 (3단계 분류, 2회 재시도 프로토콜)"
  - item: "build_3rd_review_backlog.md 6 RESOLVED items (A-1, A-2, A-3, D-2, D-4, Line 997 중복)"
    reason: "RESOLVED"
    verification_status: "verified"
    evidence_ref: "2차 커밋에서 해결 확인, 3차 리뷰 RESOLVED 섹션 기록"
  - item: "project_learn_design.md (Learn Implementation Design v4)"
    reason: "ABSORBED"
    verification_status: "verified"
    evidence_ref: "overarching design. Phase 1/2/3 detailed designs로 분화 후 각각 impl로 흡수"
  - item: "project_learn_phase2_design.md (Learn Phase 2 Design v4)"
    reason: "ABSORBED"
    verification_status: "verified"
    evidence_ref: "project_learn_phase2_impl.md에서 구현 완료"
  - item: "project_learn_phase2_impl.md (Learn Phase 2 Implementation)"
    reason: "DONE (transition complete)"
    verification_status: "asserted"
    evidence_ref: "2026-04-08 shadow 10/10 PASS + active 전환 완료. 잔존 follow-up memo 없음. M-03에서 재검 가능"
  - item: "project_learn_phase3_design.md (Learn Phase 3 Design v9 final)"
    reason: "ABSORBED"
    verification_status: "verified"
    evidence_ref: "PR #1 merged → main (2026-04-09). project_learn_phase3_impl.md 참조"
decision_records_applied:
  - id: DR-M00-01
    status: "not triggered"
    note: "3개 memory dedup 쌍 동일 mtime이었으나 구조적 hierarchy로 해결. Timestamp escalation 미발동."
  - id: DR-M00-02
    status: "not triggered"
    note: "0 Open PR → authority vs PR 충돌 기회 미발생"
  - id: DR-M00-03
    status: "applied"
    note: "v2 Activity/Axis primary-only 집계 규약 확정. 첫 태그 = primary."
  - id: DR-M00-04
    status: "applied"
    note: "v2 build↔reconstruct homonym 매핑 확정. processes/reconstruct.md, commands/reconstruct.md 등은 legacy 명칭; activity는 reconstruct(E)"
  - id: DR-M00-05
    status: "applied"
    note: "v2 axis D 태깅 기준 명문화. lexicon term/entity/relation 관리로 한정. schema/registry/namespace는 B."
---

# Backlog Consolidated (2026-04-13 v2)

본 문서는 M-00 (Planning·Backlog Source Consolidation) 결과물 v2. §1 정본 확정 직후 첫 실행 + 9-lens review feedback 반영.

## 본 문서의 위상 (CC-1 해소)

- **canonicality**: scaffolding (plan 준비용, authority 아님)
- **authority_stance**: non-authoritative plan surface
- **BL-ID 인용 금지 (M-03 이전)**: 본 v2의 BL-NNN ID는 position-based이며 M-03 disposition 전까지 provisional. 다른 문서가 이 ID를 authoritative citation 목적으로 참조하지 말 것. M-03에서 확정 ID로 재할당됨.

## 전체 구조

- **M-00 (Planning·Backlog Source Consolidation) 목적**: memory + open PR + design/ + backlog-specific memory + §1 정본 직접 지시 항목을 단일 리스트로 통합
- **Inclusion criteria** (QA v3 A5 + §1 정본 추가):
  1. §1 축 A/B/C/D 또는 5 활동(review/design/reconstruct/learn/govern) 중 하나와 직접 관계
  2. 2026-04-01 이후 발생 또는 발생일 상관없이 현재 유효 (M-03에서 disposition으로 최종 판정)
  3. Source 카테고리 5종: MEMORY.md entry / Open PR / development-records/design/ / backlog 전용 memory 파일 / §1 정본 직접 지시 항목
  4. 제외: 이미 merged / 완전 폐기 / 주체자 대화용 메모 / ABSORBED (다른 산출물에 흡수됨)
- **M-03 (Gap 분석 + Disposition 분류) 예정**: 각 item disposition 4분류 (gap / already covered / n/a / deferred) + canonicality 3분류 (canonical-advancing / supporting / scaffolding)
- **M-06 (축별 Work Item 초안) 예정**: gap 분류 → work item 변환

## Activity/Axis Tag 표기 규약 (DR-M00-03)

**primary tag convention**: comma-list의 **첫 번째 tag = primary**. 집계는 primary-only 기준.

**activity code** (§1.2 정의 기준):
- **R (review)**: product에 대한 lens 검증
- **D (design)**: direction에서 출발한 신규 구조 생성
- **E (reconstruct)**: 기존 product의 재생성·refactor·spec 수정 — **legacy 명칭 "build" 포함** (DR-M00-04)
- **L (learn)**: learning artifact lifecycle (수집·저장·승격·은퇴) 본체 조작. 정책·규범은 G로
- **G (govern)**: principle/canonical/lexicon 구조적 결정, 규범 수정, authority 관리

**axis code** (§1.5 정의 + DR-M00-05):
- **A (entrypoint)**: command surface (commands/, CLI flag, activity 호출 계약)
- **B (infrastructure)**: 내부 runtime, readers, middleware, processes/*.md 프로세스 spec, domain asset docs
- **C (autonomy)**: harness, self-review, monitoring loops, drift 판정, 큐·승인 흐름
- **D (lexicon/provisional)**: authority/*.yaml, core-lexicon, term/entity/relation 등록·승격·은퇴. **schema/registry/namespace 항목은 B** (not D).

---

## Source 1: backlog_memory (87 items)

### §1. project_build_8th_review_backlog.md (15 items) — updatedAt: 2026-04-12

Target: `processes/reconstruct.md` (= reconstruct 프로세스 spec, legacy 명칭 "build") post-PR#17 잔여. fix/build-post-merge 브랜치로 일괄 처리 예정.

**cluster**: `processes-build-md-residuals` (§1+§2 통합 37건, single-target single-writer 계약 고려 필요)

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-001 | P-5 MAJOR: halt-message per-code template 5개 (phase_3_5, phase_reentry, explorer_failure, runtime_coordinator, session_state_corrupt) | E | B | gap | scaffolding | spec update |
| BL-002 | C-1 MODERATE: session_state_corrupt error code 신설 (wip.yml/deltas/session-log 손상 대응) | E | B | gap | scaffolding | |
| BL-003 | E-1 future: Error code registry 확장성 (N≈20 시 authority/error-codes.yaml로 이관) | D,G | B,D | deferred | supporting | scale-trigger gated, structural reorganization |
| BL-004 | L-4 MINOR: adjudicator_failure phase "phase_1 or phase_2" cardinality 위반 | E | B | gap | scaffolding | |
| BL-005 | S-2 MINOR: session-log.yml single-writer declaration 명시 | E | B | gap | scaffolding | |
| BL-006 | D-1 MINOR: session-log multi-writer 시 atomic append 계약 | E | B | gap | scaffolding | |
| BL-007 | C-2 MINOR: custom:/x-* namespace 예약 (user config 확장) | E | B | gap | scaffolding | schema namespace = axis B |
| BL-008 | L-3 MINOR: degradation_threshold_warning level 불일치 | E | B | gap | scaffolding | |
| BL-009 | S-4 MINOR: phase3_user_responses + phase4_runtime_state atomic-clear invariant | E | B | gap | scaffolding | |
| BL-010 | S-6 MINOR: phase3_user_responses absence = resumption trigger 명시 | E | B | gap | scaffolding | |
| BL-011 | S-1 Struct MINOR: phase3_user_responses producer step을 Phase 3 body에 추가 | E | B | gap | scaffolding | |
| BL-012 | P-4 Prag MINOR: global_reply vs decisions 일관성 enforcement cross-ref | E | B | gap | scaffolding | |
| BL-013 | E-F1/E-F2 Evo MINOR: phase3_user_responses 추가 필드 path + error code extensibility 정책 | E | B | gap | scaffolding | |
| BL-014 | Axiology A-F2: output_language scope 결정 (build-only vs cross-command 공용) | G | B | gap | supporting | cross-command 정책 결정 |
| BL-015 | Axiology A-F1: degradation 연속 발생 시 session log diagnostic | E | B | gap | scaffolding | |

### §2. project_build_3rd_review_backlog.md (22 items) — updatedAt: 2026-04-12

Target: `processes/reconstruct.md` (40411d3 기준). **선행 권장**: PR #16 merged 기반이므로 §1 (8차) 작업 전에 본 §2 (3차) 항목부터 처리 권장 (C-8 대응).

**cluster**: `processes-build-md-residuals` (§1 공유, 37건 단일 target single-writer)

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-016 | CB-1: Tier 2 loop dispatch 경로 미정의 | E | B | gap | scaffolding | BLOCKING |
| BL-017 | CB-2: rationale-absent 재분류 patch operation 부재 | E | B | gap | scaffolding | BLOCKING |
| BL-018 | CB-3: user_resolved enum 미정의 | E | B | gap | scaffolding | BLOCKING |
| BL-019 | CB-4: Phase 3 Unresolved Conflicts 표에 priority 필드 누락 | E | B | gap | scaffolding | BLOCKING |
| BL-020 | CB-5: Stage 2 module_inventory 3중 정의 | E | B | gap | scaffolding | BLOCKING |
| BL-021 | CB-6: observation_aspect 고립 (Explorer 생산만, 소비자 없음) | E | B | gap | scaffolding | BLOCKING |
| BL-022 | CB-7: stage1_uncovered_modules 필드 wip.yml schema 미선언 | E | B | gap | scaffolding | BLOCKING |
| BL-023 | CC-1: Semantics lens 실패 시 graceful degradation vs No-impact 규칙 충돌 | E | B | gap | scaffolding | Critical |
| BL-024 | CC-2: Phase 1 Adjudicator 실패 시 label conflict 경로 모호 | E | B | gap | scaffolding | Critical |
| BL-025 | CC-3: degradation_count "successful round" 정의 모호 | E | B | gap | scaffolding | Critical |
| BL-026 | CC-4: nullify operation 트리거 미명세 | E | B | gap | scaffolding | Critical |
| BL-027 | CC-5: added_in_stage 필드 schema 미선언 | E | B | gap | scaffolding | Critical |
| BL-028 | CC-6: Coverage underexplored_assessment threshold 정보 부재 | E | B | gap | scaffolding | Critical |
| BL-029 | CC-7: unresolved_for_user 라운드 간 persistence target 미명세 | E | B | gap | scaffolding | Critical |
| BL-030 | R-29: Tier 1 tokenization CJK/Unicode 처리 규칙 명시 | E | B | gap | scaffolding | Recommend |
| BL-031 | R-30: convergence_status에 semantic_matching_degraded flag 추가 | E | B | gap | scaffolding | Recommend |
| BL-032 | R-31: fact_type enum을 Delta Format SSOT로 통합 (현재 6곳 분산) | E | B | gap | supporting | Recommend, schema enum SSOT = axis B |
| BL-033 | R-32: Change Propagation Checklist에 config.yml, golden/schema-*.yml, core-lexicon.yaml 추가 | G | D | gap | supporting | Recommend, change rule |
| BL-034 | R-33: degradation threshold 2를 config로 파라미터화 | E | B | gap | scaffolding | Recommend |
| BL-035 | R-34: Phase 0.5.4 Schema reconfirmation check 단계 명시 | G | B | gap | supporting | Recommend, procedural rule (BL-085~087 P-1/2/3 패턴). DL-001 반영 |
| BL-036 | R-35: Query Type Registry 각 type에 input/output YAML 스키마 추가 | E | B | gap | scaffolding | Recommend |
| BL-037 | R-36: user-decline path가 degradation threshold 외 체크포인트에서 필요한지 설계 결정 기록 | G | B | gap | supporting | Recommend, decision record |

### §3. project_roles_refactor_v3_backlog.md (5 items) — updatedAt: 2026-04-12

Target: roles/*.md perspective-first refactor v3 baseline 후속.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-038 | BL-1 CONS-1: domain=none self-contained fallback (lens-prompt-contract.md §9.3 4요소 명시) | G | A | gap | supporting | 7차 리뷰 deferred, entrypoint 행동 rule |
| BL-039 | BL-2 CC-1: contributor-time discoverability (symptom→lens 발견성) receiving seat 결정 | G | A | gap | supporting | 7차 리뷰 deferred |
| BL-040 | BL-3 UF-1/UF-2: dependency/conciseness naming scope 과소 (rename or 정의 문구 추가) | G | D | gap | scaffolding | 6차 deferred, lexicon term rename 후보 |
| BL-041 | BL-4 Authority/Lineage Compatibility Gate (axiology proposal, 여러 리뷰 반복) | G | D | already covered | supporting | DR-M03-01 resolved (disposition_basis). DR-M03-02 경로 (d) 적용. verification_source: m03_schema_absorption. Schema 반영: DL-006 dedup_evidence_schema `kept_primary_source`/`linked_supporting_sources`. 양방향 링크: DL-006 resolution_note |
| BL-042 | BL-5 coverage-reported evidence/provenance gap (전담 lens 없음) | G | D | gap | supporting | 5차 deferred, lens 집합 확장 (evidence/provenance lens 후보) |

### §4. project_principal_stage3_backlog.md (9 items) — updatedAt: 2026-04-12

Principal 용어 정렬 후 Stage 3 구조적 개선.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-043 | #1 Runtime principal confirmation seat 도입 | E | B | deferred | scaffolding | DEFERRED TO PRODUCTION PHASE (v3 설계 완료, code refactor 규모 큼) |
| BL-044 | #2 Structured diagnostic contract (design/commands/error-messages.ts 문자열 매칭 → diagnostic code) | G | B | gap | supporting | Medium, diagnostic code registry rule |
| BL-045 | #3 draft-packet.ts constraint source 일치 가드 | E | B | gap | scaffolding | Medium |
| BL-046 | #4 review_record entity 승격 검토 (term → entity, lifecycle 부여) | G | D | gap | supporting | Merges lexicon_stage2_prep Stage 3-3 |
| BL-047 | #5 build/ask/learn/govern/design dispatch target relation 추가 | G | D | gap | supporting | Merges lexicon_stage2_prep Stage 3-1. ask 삭제와 연동 (BL-121) |
| BL-048 | #6 각 entrypoint별 process entity 도입 가능성 | G | D | gap | supporting | Merges lexicon_stage2_prep Stage 3-2 |
| BL-049 | #8 competency scope / competency questions 개념 | G | D | gap | supporting | |
| BL-050 | #9 provenance concept | G | D | gap | supporting | |
| BL-051 | #10 modularity boundary 개념 | G | D | gap | supporting | |

### §5. project_design_spec_v4_residuals.md (8 items) — updatedAt: 2026-04-12

Design Spec v4 리뷰 후 CC 전건 해소, R 4건 별도 작업. CC 4건은 구현 완료 후 재확인 대상.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-052 | CC-1: invoke surface authority 정렬 (commands/design.md active authority seat + design_target binding) | E | B | gap | scaffolding | 구현 완료 후 재확인 |
| BL-053 | CC-2: Build/Design/Learning graph closure (재진입 계약, promotion edge, owner-key 모델) | G | D | gap | canonical-advancing | relation graph rule. §1.2 활동 간 경계 계약 직접 advance. depends_on: BL-123 (축 D 선행) |
| BL-054 | CC-3: learning-rules.md 단일 소유 원칙 (processes/design.md 중복 서술 제거) | G | B | gap | supporting | authority ownership rule |
| BL-055 | CC-4: §7 마지막 두 문장 중복 (adapter 표와 동일 내용 반복 제거) | E | B | gap | scaffolding | spec cleanup |
| BL-056 | R-1: spec_schema 호환성 계약 (reader 분기, migration ownership, backward policy) | G | B | gap | supporting | compatibility rule |
| BL-057 | R-2: design_gap 판정 절차 (등급 산정 + 사용자 질의 응답 규칙) | G | B | gap | supporting | procedure rule |
| BL-058 | R-3: prompt-backed reference entrypoint 명시 (command/process/overview surface 실행 형태) | G | A | gap | supporting | entrypoint surface rule |
| BL-059 | R-4: install-surface authority alignment (entrypoint invoke surface vs active installation truth) | G | A | gap | supporting | alignment rule |

### §6. project_design_review_findings_backlog.md (4 items) — updatedAt: 2026-04-12

design 리뷰(20260410-e238c6de) 발견 결함 3건 + system-wide issue 1건.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-060 | #1 align CLI help rescan/redirect 불일치 (cli.ts:50 vs align.ts:29-33) | E | B | gap | scaffolding | HIGH logic |
| BL-061 | #2 defer CLI 서브커맨드 미노출 (executeDefer 구현 있으나 CLI 도달 불가) | E | A | gap | scaffolding | MEDIUM structure, CLI 노출 |
| BL-062 | #3 figma-mcp / generic mcp 소스 스켈레톤 (scan/grounding 비어있음) | D | B | gap | supporting | coverage+evolution, 신규 구현 필요 |
| BL-063 | #4 project 학습이 promote 전 소비 (loader.ts + process.md teammate prompt drift risk) | G | B | gap | canonical-advancing | system-wide, §1.2 learn/govern 경계·§1.0 기제 신뢰 직접 영향. depends_on: (independent) |

### §7. project_lexicon_stage2_prep.md (1 unique item remaining after dedup) — updatedAt: 2026-04-12

Stage 3 잔여 5건 중 3건은 Principal Stage 3과 merge (§4). 1건(design.md 용어 정렬)은 verified DONE으로 excluded. 1건이 고유.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-064 | Stage 3-4: principal entity 승격 검토 (entrypoint와의 invokes relation) | G | D | gap | canonical-advancing | principal 현재 term, entity 승격 결정. §1.1 주체자 core concept. depends_on: BL-123 (축 D 선행) |

### §8. project_se_domain_review_followup.md (23 items) — [PRE-CUTOFF] origin 2026-03-30

SE 도메인 업그레이드 후 Stage 3 커버리지 확장 + Stage 4 확장 프로토콜 + 프로세스 개선.
**[PRE-CUTOFF]** origin 2026-03-30. 유효성 판단은 M-03에서 (DR-M03-04 P1/P2/P3).

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-065 | R-1: competency_qs.md Boundary Condition CQ 추가 | E | B | gap | supporting | HIGH Stage 3, domain asset, priority: P2 |
| BL-066 | R-2: logic_rules.md §Error Handling Logic 섹션 신설 | E | B | gap | supporting | HIGH Stage 3, priority: P2 |
| BL-067 | R-3: extension_cases.md 축소/퇴역 시나리오 2건 | E | B | gap | supporting | HIGH Stage 3, priority: P2 |
| BL-068 | R-4: concepts.md i18n/a11y 실체 추가 또는 적용 조건 명시 | E | B | gap | supporting | HIGH Stage 3, priority: P2 |
| BL-069 | R-5: domain_scope.md + competency_qs.md Requirements & Specification | E | B | gap | supporting | MEDIUM Stage 3, priority: P2 |
| BL-070 | R-6: domain_scope.md Maintenance 관심사 추가 | E | B | gap | supporting | MEDIUM Stage 3, priority: P2 |
| BL-071 | R-7: competency_qs.md Event/Messaging CQ 추가 | E | B | gap | supporting | MEDIUM Stage 3, priority: P2 |
| BL-072 | R-8: logic_rules.md Performance 규칙 보강 | E | B | gap | supporting | MEDIUM Stage 3, priority: P2 |
| BL-073 | R-9: competency_qs.md Generic Type Handling CQ (CQ-T09) | E | B | deferred | supporting | LOW Stage 3, priority: P3 |
| BL-074 | R-10: competency_qs.md Constraint Propagation CQ | E | B | deferred | supporting | LOW Stage 3, priority: P3 |
| BL-075 | R-11: concepts.md topic 주축 전환 + [L1]/[L2]/[L3] 태그 보존 | E | B | deferred | scaffolding | MEDIUM Stage 4 (구조적 전환), priority: P3 |
| BL-076 | R-12: extension_cases.md 분류 축 "change trigger" 명시 | E | B | deferred | scaffolding | MEDIUM Stage 4, priority: P3 |
| BL-077 | R-13: domain_scope.md Bias Detection "7" 리터럴 → 동적 참조 | E | B | deferred | scaffolding | MEDIUM Stage 4, priority: P3 |
| BL-078 | R-14: domain_scope.md Sub-area 귀속 규칙 추가 | E | B | deferred | scaffolding | MEDIUM Stage 4, priority: P3 |
| BL-079 | R-15: domain_scope.md 적용 가능성 마커 부여 기준 | E | B | deferred | scaffolding | LOW Stage 4, priority: P3 |
| BL-080 | R-16: domain_scope.md 외부 표준 버전 참조 단일화 | E | B | deferred | scaffolding | LOW Stage 4, priority: P3 |
| BL-081 | R-17: concepts.md "Module" 동음이의어 등록 | E | B | deferred | scaffolding | MEDIUM Stage 4, priority: P3 |
| BL-082 | R-18: domain_scope.md "concern" 3개 분류축 관계 명시 | E | B | deferred | scaffolding | LOW Stage 4, priority: P3 |
| BL-083 | R-19: competency_qs.md Sub-area × CQ 매핑 테이블 | E | B | deferred | scaffolding | LOW Stage 4, priority: P3 |
| BL-084 | R-20: competency_qs.md CQ 코드 접두사 충돌 해소 | E | B | deferred | scaffolding | LOW Stage 4, priority: P3 |
| BL-085 | P-1: 도메인 문서 확장 후 교차 참조 무결성 점검 단계 추가 | G | B | gap | supporting | process rule, priority: P2. **DL-010 cross-ref**: BL-085=canonical process rule, BL-103=Business 도메인 wave 3 instance. dedup 아님 |
| BL-086 | P-2: Structural Inspection Checklist에 자기 참조 검증 3항목 추가 | G | B | gap | supporting | process rule (Self-review IA BL-091~094와 관련), priority: P2 |
| BL-087 | P-3: Stage 1↔2 영향 파일 겹침 사전 확인 절차 | G | B | gap | supporting | process rule, priority: P2 |

---

## Source 2: memory (non-backlog file entries, 29 items)

### §9. project_harness_self_review.md (7 items) — updatedAt: 2026-04-12

IN PROGRESS. PR #20 OPEN. 재리뷰 BLOCKING 3건 + 4파일 self-review 18 IA (파일별 1 item으로 롤업).

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-088 | IA-1 BLOCKING: event_marker signal 의미 불일치 (retirement_candidates global vs panel_verdicts project) | E | C | gap | supporting | PR #20 재리뷰, §1.5 축 C seed |
| BL-089 | IA-2 BLOCKING: creation_gate detector dead code | E | C | gap | scaffolding | PR #20 재리뷰, code cleanup |
| BL-090 | IA-3 BLOCKING: health-history.jsonl canonical 아님 | G | C | gap | supporting | PR #20 재리뷰, canonicality decision |
| BL-091 | Self-review IA 수정: roles/logic.md (IA 4건) | G | A | gap | scaffolding | Stage 2 → 3 이행, role contract |
| BL-092 | Self-review IA 수정: roles/axiology.md (IA 4건) | G | A | gap | scaffolding | Stage 2 → 3 이행, role contract |
| BL-093 | Self-review IA 수정: roles/synthesize.md (IA 5건) | G | A | gap | scaffolding | Stage 2 → 3 이행, role contract |
| BL-094 | Self-review IA 수정: processes/review/lens-prompt-contract.md (IA 4건) | G | A | gap | scaffolding | Stage 2 → 3 이행, entrypoint contract |

### §10. project_build_coordinator_redesign.md (3 items) — updatedAt: 2026-04-12

Philosopher → Runtime + 9-lens + Axiology Adjudicator + Synthesize 4역할 분해 구현.

**cluster**: `build_coordinator_redesign`. 순서: BL-097 (Philosopher role 제거) → BL-095 (4역할 spec 반영) → BL-096 (state machine awaiting_adjudication 상태 추가). BL-097 선행이 역할 누락 방지, BL-095 spec 반영 후 BL-096 의 state 추가가 정합.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-095 | build.md 4역할 구조 반영 (9 Lenses + Runtime Coordinator + Axiology Adjudicator + Synthesize) | E | B | gap | scaffolding | DESIGNED 2026-04-11 |
| BL-096 | Coordinator state machine에 awaiting_adjudication 상태 추가 | E | B | gap | scaffolding | |
| BL-097 | Philosopher role build에서 제거 (review에서는 이미 분리됨) | E | B | gap | scaffolding | |

### §11. project_business_domain_upgrade.md (6 compound items) — [PRE-CUTOFF] origin 2026-03-31

IN PROGRESS. 리서치 705K 완료, 실행 계약 5개 + Scale Tier 설계.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-098 | Scale Tier P0 수정 (방향 A: employee count 단일 축, Micro/Small/Mid/Large) | G | B | gap | supporting | framework decision, priority: P2 |
| BL-099 | 실행 계약 즉시 조치 8건 반영 | E | B | gap | supporting | contract implementation, priority: P2 |
| BL-100 | PO 판단 4건 (FI/RC 통합, T3/T4 분리, AB Min CQ, CQ Applicability 범위) | G | B | gap | supporting | 주체자 판단 decisions, priority: P2 |
| BL-101 | Wave 1-3 실행 (5개 파일 병렬 각 wave) | E | B | gap | supporting | domain doc writing, compound N=3, priority: P2 |
| BL-102 | Gate 1 / Gate 2 (wave 간) | R | B | gap | supporting | review checkpoint, priority: P2 |
| BL-103 | 교차 참조 무결성 + 글로벌 동기화 + commit | E | B | gap | supporting | cross-ref fix + sync, priority: P2. **DL-010 cross-ref with BL-085**: 본 BL = Business wave 3 instance, BL-085 = general process rule |

### §12. project_agent_id_rename.md (6 phase items) — updatedAt: 2026-04-12 (origin 2026-04-07)

DESIGNED, 실행 대기. onto_ prefix 제거 → ~100 파일. Phase 0~5 strict sequence (C-8 대응: 순차 Phase 필요).

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-104 | Phase 0: Dual-read 구현 (learning loader + role loader + core-lens-registry reader) | E | B | gap | scaffolding | 선행 조건, depends on nothing |
| BL-105 | Phase 1: Repo content 치환 (10쌍, ~50 파일) | E | B | gap | scaffolding | depends on BL-104 |
| BL-106 | Phase 2: Repo file renames (roles/onto_*.md → roles/*.md × 10) | E | B | gap | scaffolding | depends on BL-105 |
| BL-107 | Phase 3: Global data migration (~/.onto/ + ~/.onto/learnings/) | E | B | gap | scaffolding | depends on BL-106, learn asset 이동 포함 |
| BL-108 | Phase 4: 3-layer verification | R | B | gap | supporting | depends on BL-107 |
| BL-109 | Phase 5: Authority 갱신 (core-lexicon legacy_aliases + Charter §17 + BLUEPRINT lens ID) | G | D | gap | scaffolding | depends on BL-108, authority 갱신 (legacy retire) |

### §13. project_design_process_prototype.md (2 items) — updatedAt: 2026-04-12 (origin 2026-04-08)

v8 확정, 옵션 B 프로토타입 실행 대기.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-110 | 옵션 B 프로토타입 실행 (.onto/temp/design-command.md + design-process.md 작성 후 실제 설계 과제) | D | A | gap | canonical-advancing | §1.2 design 활동 수준 1 진입 seed, 새 command surface. depends_on: (independent) |
| BL-111 | R10 잔존 결함 4건 실제 발현 여부 검증 (§9.1/9.2 + 4건) | R | B | gap | supporting | 프로토타입 이후 검증 |

### §14. project_next_domain_upgrade.md (4 items) — [PRE-CUTOFF] origin 2026-03-31

도메인 업그레이드 미착수 4건.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-112 | market-intelligence 도메인 업그레이드 (현 42K) | E | B | deferred | supporting | domain asset creation, priority: P3 |
| BL-113 | accounting 도메인 업그레이드 (현 44K, accounting-kr 141K와 별도) | E | B | deferred | supporting | priority: P3 |
| BL-114 | finance 도메인 업그레이드 (현 46K) | E | B | deferred | supporting | priority: P3 |
| BL-115 | visual-design 도메인 업그레이드 (현 57K, ui-design과 쌍) | E | B | deferred | supporting | priority: P3 |

### §15. project_palantir_foundry_upgrade.md (1 item) — [PRE-CUTOFF] origin 2026-03-31

3차 완료. RESEARCH_NOTES §10/§15 일부 미반영.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-116 | RESEARCH_NOTES §10 분석가 보고서 수치 반영 여부 결정 (현재 의도적 미반영) | G | B | deferred | supporting | 4차 업그레이드 판정 필요, priority: P3 |

---

## Source 3: design (4 items)

### §16. 20260409-graphify-adoption-hypothesis.md (1 item) — updatedAt: 2026-04-09

v7 consolidated. graphify adoption evaluation 부분은 여전히 backlog hypothesis.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-117 | graphify adoption hypothesis build authority owner re-review + BT-E5/E6 split + Promotion gate + Phase 0 ARCH 6건 | R | B | gap | supporting | v7 explicit backlog, reconstruct authority 결정 |

### §17. 20260330-optimization-4features.md (3 items, Feature 9 excluded per verified DONE) — [PRE-CUTOFF] origin 2026-03-30

Feature 9 IMPLEMENTED via project_agent_error_retry. Feature 1/14/15 구현 확인 불가 → backlog.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-118 | Feature 1: Adaptive Light Review (리뷰 복잡도 자동 판단, Step 1.5 Complexity Assessment) | D | B | deferred | scaffolding | impl 미확인, 신규 review 구조 (review runtime 재구조화 무거움), priority: P3. **coverage C-6 보존**: M-08 refresh 시 `n/a` 재분류 가능성 재평가 (§1 정본 확정 후 Adaptive 자체 유효성 재검토). |
| BL-119 | Feature 14: /onto:health (학습 건강도 대시보드) | G | A | gap | supporting | 학습 건강도 정책 dashboard (CC-3 적용: learn 정책은 G), priority: P2 |
| BL-120 | Feature 15: Consumption Feedback Verification (실측 검증 계획) | G | C | gap | canonical-advancing | 학습 소비 검증 정책. **§1.0 "기제" 측정 instrumentation 직접 구현** (측면 3). **측면 1 점진성 proxy 도 동시 계측 대상**. priority: P1. precedes: DL-017 (M-06 3지표 전수 work item 분할) |

---

## Source 4: pr (0 items)

`gh pr list --state open` (2026-04-13T10:35:00) → `[]`. Open PR 없음.

**M-03 시작 직전 재스캔** 권고 (pragmatics F6). merged PR은 explicit_exclusions의 evidence_ref로 참조됨(예: PR #12).

---

## Source 5: onto_direction (3 items) — §1 정본 직접 지시 항목

`development-records/design/20260413-onto-direction.md` 본문이 직접 지시한 backlog 항목.

| ID | Summary | Activity | Axis | Disposition | Canonicality | Notes |
|---|---|---|---|---|---|---|
| BL-121 | `commands/ask-*.md` 명령군 처리 (review 계열로 이동 또는 제거) — §1.2 "폐기된 개념: ask" | E,G | A | gap | canonical-advancing | 대상 10 파일: ask-{logic, structure, dependency, semantics, pragmatics, evolution, coverage, conciseness, axiology, philosopher}.md. **§1.2 폐기 지시 집행** (DR-M03-03 subordinate rule (i) 적용). primary=E (집행), secondary=G. DL-003 반영. depends_on: (independent) |
| BL-122 | knowledge → principle 승격 경로 결정 — §1.2 "보류 중, 구체 기준은 향후 govern 개발 시 결정" | G | D | deferred | canonical-advancing | principle lifecycle, learning-promotion-to-principle 계약 설계. §1.2 "보류 중" 명시 — govern runtime 개발 시 결정. depends_on: BL-123 (축 D). resolution_path: DL-022 (M-06 govern-runtime 신규 도출). reactivation_trigger: govern runtime DL-021 design 착수 |
| BL-123 | 축 D 선행 확인 (lexicon provisional lifecycle 성문화 위치 + 인용 금지 검증 도구) — §1 "다음 작업 #2" | G | D | gap | canonical-advancing | 축 D 교차 원칙, 전 축 선행. §1 "다음 작업 #2" 직접 지시. precedes: BL-053, BL-064, BL-122 (lexicon 관련 canonical-advancing 의 prior) |

---

## 요약

- **Total item count**: 123
- **Source 분포** (primary):
  - backlog_memory: 87 (70.7%)
  - memory: 29 (23.6%)
  - design: 4 (3.3%)
  - onto_direction: 3 (2.4%)
  - pr: 0 (0%) (M-03 시작 시점 재스캔에서도 0건 확인 — DL-011 snapshot 유효)
- **Dedup events**: 3 (v1에서 유지)
- **Explicit exclusions**: 7 (v1의 3 + learn phase 4)
- **Decision Records applied (M-00)**: DR-M00-01/02 not triggered; DR-M00-03/04/05 confirmed at v2
- **Decision Records applied (M-03)**: DR-M03-01 (BL-041 dedup rule pre-gate 분해), DR-M03-02 (Disposition 규칙), DR-M03-03 (Canonicality 규칙), DR-M03-04 (Pre-cutoff priority 규칙)

## Activity 분포 (primary, 합계 = 123)

| Activity | Count | 비중 |
|---|---|---|
| E (reconstruct) | 76 | 61.8% |
| G (govern) | 39 | 31.7% |
| D (design) | 4 | 3.3% |
| R (review) | 4 | 3.3% |
| L (learn) | 0 | 0% |
| **합계** | **123** | **100%** |

(v2 동일, v3에서 변동 없음)

**Activity L=0 각주**: learn 활동 lifecycle 본체 ops (Phase 1/2/3 seed→candidate→provisional→promoted 파이프라인) 는 2026-04-09 PR #1 merge 로 구현 완료 + E2E 52/52 PASS (explicit_exclusions 에 기록). 학습 소비 정책·건강도 대시보드·drift 검증 관련 항목 (BL-054/063/119/120/122 등) 은 DR-M00-03 DR-M00-05 의 CC-3 적용에 따라 **govern (G) 로 primary 재분류** (기준·정책 결정은 govern, 실행은 learn 의 경계 규약 §1.2). 따라서 L=0 은 구현 부재가 아닌 성숙·재분류 signal (semantics §3 / pragmatics P-4 반영).

## Axis 분포 (primary, 합계 = 123)

| Axis | Count | 비중 |
|---|---|---|
| B (infrastructure) | 92 | 74.8% |
| D (lexicon/provisional) | 15 | 12.2% |
| A (entrypoint) | 12 | 9.8% |
| C (autonomy) | 4 | 3.3% |
| **합계** | **123** | **100%** |

(v2 동일, v3에서 변동 없음)

## Disposition 분포 (M-03 core 결과, primary, 합계 = 123)

**Canonical SSOT**: 본문 §1~§18 표 (row-level). 본 요약 섹션은 그 표에서 derived — 두 값이 불일치할 경우 **본문 표 값이 우선**. 산술 invariant: `gap + deferred + already_covered + n_a = 123` (101+21+1+0=123 ✓).

| Disposition | Count | 비중 | 설명 |
|---|---|---|---|
| **gap** | 101 | 82.1% | M-06 work item seed |
| **deferred** | 21 | 17.1% | PRODUCTION PHASE 명시(BL-043) + Error code registry scale-trigger gated(BL-003) + SE Stage 3 LOW(BL-073/074, 2건) + SE Stage 4(BL-075~084, 10건) + domain 미착수 4건(BL-112~115) + Palantir 4차(BL-116) + Adaptive Light Review(BL-118) + §1.2 "보류 중"(BL-122) |
| **already covered** | 1 | 0.8% | BL-041 (DR-M03-01 resolved: axiology standing lens 승격 대신 dedup rule pre-gate 로 분해, v3 schema 에 반영) |
| **n/a** | 0 | 0% | §1 redesign 후 의미 상실 item 없음 (pre-cutoff 37건도 §1 정본과 직접 충돌하지 않고 priority 강등으로 처리) |

## Canonicality 분포 (primary, 합계 = 123)

**용어 구분 (semantics §6 반영)**: 본 섹션의 "Canonicality" 는 **work-level** — 각 BL 이 §1 정본 목표를 얼마나 직접 전진시키는지의 분류. frontmatter 의 `canonicality: scaffolding` (document-level — 본 consolidated 파일 자체가 plan 준비용 scaffolding artifact 임을 선언) 과 **axis 가 다름**. 두 값을 혼동하지 말 것.

| Canonicality (work-level) | Count | 비중 | 설명 |
|---|---|---|---|
| **canonical-advancing** | 8 | 6.5% | §1.0 세 측면·§1.2 5 활동·§1.5 4 축 을 직접 advance |
| **supporting** | 53 | 43.1% | 인프라·도구·정책·lexicon lifecycle·domain asset 지원 |
| **scaffolding** | 62 | 50.4% | spec fix, post-PR cleanup, rename, legacy migration |

**Scaffolding 50.4% 분포 정당화**: 62건 중 **44건 (71%) 이 post-PR 잔여 결함 수습 성격** — `processes-build-md-residuals` cluster 37건 (§1 build_8th 15 + §2 build_3rd 22) + agent_id_rename Phase 5건 (BL-104~107, 109) + design spec v4 residuals 2건 (BL-052, BL-055). 나머지 18건은 harness IA 수정·principal stage3 실행·mcp stub·build_coordinator spec 등 legacy product hygiene 성격. scaffolding 비중 자체는 자연스러우나 M-07 lifecycle balance check (DL-023) 에서 **`scaffolding_ratio_trend` health metric 추적** — cycle 후 scaffolding 비중이 감소 방향인지, canonical-advancing 진입 속도가 drain 되지는 않는지 모니터링.

**canonical-advancing 8건 breakdown**:
- BL-053 (G/D): Build/Design/Learning graph closure — §1.2 활동 간 경계 계약
- BL-063 (G/B): learn 소비 drift risk — §1.2 learn/govern 경계 + §1.0 기제 신뢰
- BL-064 (G/D): principal entity 승격 — §1.1 주체자 core concept
- BL-110 (D/A): design 프로토타입 — §1.2 design 활동 수준 1 진입
- BL-120 (G/C): Feature 15 Consumption Feedback Verification — §1.0 기제 측정 instrumentation
- BL-121 (E,G/A): ask 폐기 집행 — §1.2 폐기 지시 직접 실행
- BL-122 (G/D): knowledge→principle 경로 — §1.2 "보류 중" 해소 (deferred)
- BL-123 (G/D): 축 D 선행 — §1 "다음 작업 #2"

## Gap × Canonical-Advancing 교집합 (M-06 first-candidate 7건)

**용어 주의 (DR-M03-04 revised)**: 본 섹션의 "first-candidate" 는 M-06 work item 도출 시 canonical 전진 기여도가 가장 높은 7건 교집합을 뜻하며, DR-M03-04 의 pre-cutoff `priority: P1` (37건 중 1건, BL-120 만 해당) 과 **다른 축**. 두 axis 를 섞어 사용하지 말 것:

- **first-candidate**: gap × canonical-advancing (post-cutoff 포함 전수 123 BL 기준, 7건)
- **P1 priority**: pre-cutoff 37건 중 §1.0 측면 직접 instrumentation (1건, BL-120)

7건 — M-06 work item 도출 시 최우선 후보:

| ID | Summary 요약 | Activity/Axis |
|---|---|---|
| BL-053 | Build/Design/Learning graph closure | G/D |
| BL-063 | learn 소비 drift risk (system-wide) | G/B |
| BL-064 | principal entity 승격 | G/D |
| BL-110 | design 프로토타입 실행 | D/A |
| BL-120 | Feature 15 Consumption Feedback Verification | G/C |
| BL-121 | ask 폐기 집행 | E,G/A |
| BL-123 | 축 D 선행 확인 | G/D |

(BL-122 는 canonical-advancing 이나 deferred — M-03 후 govern runtime 개발 cycle 에서 재검토)

## Pre-cutoff Priority 분포 (DR-M03-04, 37건)

| Priority | Count | Items |
|---|---|---|
| **P1** | 1 | BL-120 (Feature 15, §1.0 기제 측정 직접 instrumentation) |
| **P2** | 18 | BL-065~072 (SE Stage 3 HIGH/MEDIUM 8), BL-085~087 (SE process 3), BL-098~103 (Business 6), BL-119 (/onto:health 1) |
| **P3** | 18 | BL-073~084 (SE Stage 3 LOW 2 + Stage 4 10), BL-112~115 (domain 미착수 4), BL-116 (Palantir 1), BL-118 (Adaptive Light Review 1) |

## M-06 scope 신규 도출 대상 (consolidated v3 미등재)

M-01/M-02 inventory 가 드러낸 구조적 gap 7건. consolidated v3 의 BL 이 아니라 M-06 에서 신규 work item 으로 도출. deferred ledger `DL-016 ~ DL-022` 로 추적.

1. **A0 framework 추출** (DL-016): §1.5 축 A 선행 조건
2. **§1.4 측정 인프라 3 지표** (DL-017): 점진성·지속성·기제 계측 seat (현 backlog 0건)
3. **State machine 3중 dedup** (DL-018): review 9-state / scope-runtime 15-state / build.md spec 통합
4. **Drift engine** (DL-019): 정책 engine·큐·승인 흐름 (§1.3 수준 0→1 조건)
5. **Reconstruct 전용 CLI bounded path** (DL-020): review 의 3-step bounded path 수준 달성
6. **Govern 전용 runtime** (DL-021): command/process/registry 도입 (§1.4 govern 완료 기준)
7. **Knowledge → principle 승격 경로** (DL-022): BL-122 와 연계, govern runtime 개발 시

## 다음 단계 (M-04 이후)

1. **M-04 Phase A (Task Schema·Canonical Output 결정)** — activity vocabulary + canonical seat + binding rule 확정. DL-013 (DR-M04-01 activity field canonical ref) + DL-014 (activity_enum_ref) 처리.
2. **M-05 (Pre-draft Dependency Modeling)** — M-04 Phase A barrier 후. DL-015 (C-8 compound sequencing, agent_id_rename Phase 0→5, §1→§2 build order 등) 처리.
3. **M-04 Phase B + M-05 순차**.
4. **M-06 (축별 Work Item 초안)** — Agent Teams 4 subagent (축 A/B/C/D). gap 102 건 + canonical-advancing 우선 (P1 후보 7건) + DL-016~022 신규 work item 도출.
5. **M-07 (Post-draft 충돌·병렬 Cluster 검증)** — DL-023 (lifecycle balance) + DL-024 (consistency check 3 지점: M-00→M-03 entry count, M-03→M-06 gap count ≥ work item count, M-06 schema 13필드 채움).
6. **M-08 (Refresh·Maintenance Protocol)** — DL-025~028 (진행률 모니터링·Principal 개입 trigger·longitudinal replay·primary_tag SSOT) 처리.

## 참조

- §1 정본: `development-records/design/20260413-onto-direction.md`
- Meta task list v5.1: `development-records/design/20260413-onto-todo-meta.md`
- QA v3: `development-records/plan/20260413-m00-preparation-qa.md`
- M-00 Decision records: `development-records/plan/20260413-m00-decisions.md`
- M-03 Decision records: `development-records/plan/20260413-m03-decisions.md`
- Execution log: `development-records/plan/20260413-execution-log.md`
- Deferred ledger: `development-records/plan/20260413-deferred-ledger.md` (v1.2 기준)
- M-01 activity inventory: `.onto/temp/m01-activity-inventory/{review,design,reconstruct,learn,govern}.md`
- M-02 infra inventory: `.onto/temp/m02-infra-inventory/{10 components}.md`
- v1 review session: `.onto/review/20260413-30463d46/` (verdict: CONDITIONAL, v2에서 BLOCKING 2 + MAJOR 2 해소)
