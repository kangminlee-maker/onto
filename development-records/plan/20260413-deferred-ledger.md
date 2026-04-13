---
as_of: 2026-04-13T20:40:00+09:00
supersedes: null
status: active
revision: v1.9
functional_area: deferred-ledger
purpose: |
  M-00 ~ M-08 meta task 실행 중 deferred로 분류된 item의 **단일 추적 ledger**.
  각 item의 origin / severity / resolution_stage / status를 longitudinal로 관리.
item_count: 31
resolved_count: 18
pending_count: 13
resolution_stage_distribution:
  M-01: 3 (전원 resolved)
  M-03: 9 (전원 resolved — v1.2)
  M-04-A: 2 (전원 resolved — v1.5)
  M-05: 2 (전원 resolved — v1.7)  # DL-015 + DL-031 resolved (DR-M05-02 + DR-M05-03)
  M-06: 8  # DL-016/018 resolved (v1.9 Wave 2). 잔여 pending 6: DL-017/019/020/021/022/029
  M-07: 2
  M-08: 5  # DL-030 신규 추가 (v1.4, NP-1 lens proposal)
id_scheme: "DL-NNN (sequential, stable across revisions). BL-ID 와 달리 본 ledger 내에서 불변"
stage_id_scheme: "M-NN 또는 M-NN-X (M-04-A, M-04-B 등 sub-stage 허용. ledger resolution_stage 값은 이 scheme 을 준수)"
relation_names:
  rule_to_instance: "general process rule (canonical) 이 specific execution instance 에 적용되는 관계. 예: BL-085 (SE P-1 rule) → BL-103 (Business 도메인 wave 3 instance)"
  instance_to_rule: "역방향 — instance 가 canonical rule 을 참조"
  superset_subset: "한 DL 이 다른 DL/BL 을 포괄. 예: DL-017 (measurement-infra) ⊃ BL-120 (기제 측정 proxy)"
---

# Deferred Item Ledger (2026-04-13)

본 문서는 M-00 ~ M-08 실행 과정에서 **즉시 해소하지 않고 후속 stage로 연기**된 item의 단일 관리 ledger.

## 관리 정책

**SSOT**: `development-records/plan/20260413-m00-decisions.md` §DR-M00-06 (Deferred Item Ledger 수립 + stage completion protocol). 본 ledger 는 그 DR 의 implementation seat — 정책 세부 (단계·성공 기준·escalation) 은 m00-decisions.md 를 참조 (CN-5 conciseness review 반영).

간단 요약: 매 M-NN 완료 시점에 (1) 신규 deferred 식별 + `resolution_stage` 할당, (2) 현 stage item 전원 resolved 처리, (3) 미해소 시 재defer (연속 2회 defer 시 Principal escalation). 성공 기준: `resolution_stage == M-NN` AND `status == pending` = 0.

## 필드 정의

- `id`: DL-NNN (sequential, stable)
- `origin`: v1-review / v2-review / v5.1-meta / qa-v3 / m01-inv / m02-inv / ad-hoc
- `origin_ref`: 원 문서의 ID (C-4, CC-2, N-1 등) 또는 session id
- `severity`: BLOCKING / MAJOR / MODERATE / MINOR / MEDIUM / CC / Recommend / Gap
- `summary`: 한 줄 요약
- `resolution_stage`: M-01 / M-03 / M-04-A / M-04-B / M-05 / M-06 / M-07 / M-08
- `status`: pending / in_progress / resolved / escalated
- `resolution_note`: (해소 시) 어떻게 해결됐는지

---

## M-01 (다섯 활동 구현 상태 Inventory) resolution_stage — 3 items (전원 resolved)

**Rationale**: MINOR 수준 + M-01 inventory 작업 중 자연 재검증 가능.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-001 | v2-review | logic N-1 | MEDIUM | consolidated v2 Activity per-bucket 산술 off-by-one: E 76→75, G 39→40 (합계 invariant 123 유지). 어느 item이 miscategorize인지 특정 필요 | **resolved** |
| DL-002 | v2-review | structure S-4-v2 | MINOR | consolidated v2 L452 오타 "v1에서 로 포함했던" → "v1에서 C로 포함했던" | **resolved** |
| DL-003 | v2-review | dep N-DEP-03 | MINOR | BL-121 `commands/ask-*.md` primary tag. §1.2 ask 폐기 govern 결정 이미 완료 → BL-121은 **집행(E)** 성격. primary E 또는 E,G로 조정 | **resolved** |

### 해소 기록 (DL-001/002/003, 2026-04-13T12:45, consolidated v2.1 patch)

**DL-002 resolution_note**: L452 직접 수정. "v1에서 로 포함했던" → "v1에서 C로 포함했던".

**DL-003 resolution_note**: BL-121 activity를 `G` → `E,G`로 변경. Notes에 "primary=E: §1.2 ask 폐기 govern 결정은 이미 완료됨 → 본 BL은 그 결정의 집행(파일 이동/제거). secondary=G: govern 결정의 실행이라는 성격" 기록.

**DL-001 resolution_note**: 후보 식별 → **BL-035 (R-34: Phase 0.5.4 Schema reconfirmation check 단계 명시)**를 E → G로 재분류. 근거: 절차 규칙 추가는 BL-085~087 (SE domain process improvements P-1/2/3)와 동일 패턴이며 v2에서 이들은 G로 태깅됨. 일관성 확보.

**산술 반영**: DL-001 (E→G 1건) + DL-003 (G→E 1건) 상쇄 → Activity 분포 E=76, G=39 표시값 불변. 버킷 멤버십만 교정. v2.1 revision_note에 명시.

**Commit**: `84736c7`

---

## M-03 (Gap 분석 + Disposition 분류) resolution_stage — 9 items

**Rationale**: M-03이 consolidated v2의 각 BL에 disposition + canonicality 부여하는 단계. schema 보강·taxonomy·dedup·cluster 관련 defer item을 본 단계에서 흡수.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-004 | v1-review | C-4 | MODERATE | row-level traversability + schema 보강: `src:<source_file>`, `origin_date`, `merged_from` 컬럼 + `id_scheme`, `schema_version`, `source_types` frontmatter 필드 | **resolved** |
| DL-005 | v1-review | C-6 | MODERATE | source taxonomy 명문화: `backlog_memory` vs `memory` 경계 + merged PR 이중 역할(open=inclusion, merged=exclusion evidence) 선언 | **resolved** |
| DL-006 | v1-review | C-7 | MODERATE | Dedup event 1 basis "structural reference" 카테고리 분리 + `supersedes`(문서-level) vs `dedup_retires`(item-level) 관계명 정리 | **resolved** |
| DL-007 | v1-review | CC-2 | Conditional | Axis D 태깅 기준 명문화 + `axis_sub: lexicon_entity_promotion | provisional_quarantine` 하위 태그 (필요 시). **E-6**: axis D 30+ 재평가 trigger 의 monitoring seat 은 DL-027 longitudinal replay/audit 에 흡수. | **resolved** |
| DL-008 | v1-review | CC-3 | Conditional | activity L(learn) vs G(govern) 경계 재분류 (BL-063, BL-119 등 govern 성격 항목 primary 재지정) | **resolved** |
| DL-009 | v1-review | axiology A-5 | Recommend | pre-cutoff 37건 (§8 SE 23 + §11 business 6 + §14 domain 4 + §15 palantir 1 + §17 optimization 3)을 P1/P2/P3 class로 분할. 판정 부하 분산 | **resolved** |
| DL-010 | v1-review | conciseness CN-1 | Recommend | BL-085 ↔ BL-103 "프로세스 일반화 canonical vs 사이클 instance" 교차참조 dedup 후보 검토 | **resolved** |
| DL-011 | v1-review | pragmatics F6 | Recommend | "M-03 시작 직전 Open PR 재스캔" 트리거 명시 (snapshot staleness 방지) | **resolved** |
| DL-012 | v1-review | axiology NP-1 | Governance | BL-041 Authority/Lineage Compatibility Gate의 axiology standing lens 승격 결정을 **M-03 이전**으로 앞당김 권고 (v1+v2 반복 제기) | **resolved** |

### 해소 기록 (DL-004~012, 2026-04-13T13:50, M-03 v1.2 patch)

**DL-004 resolution_note**: consolidated v3 frontmatter 에 `schema_version: v3`, `id_scheme` (v3 기점 stable, BL-ID 재할당 금지) 반영. row-level traversability (`src`, `origin_date`, `merged_from`) 는 본문 표 Notes 컬럼에 inline 포함 방식으로 수용 — separate 컬럼 추가 시 표 폭 과도 판단. **Scope: 대표 사례 부착** (전수 적용 아님). 적용 대상: (i) DR 또는 DL 로 source/disposition/canonicality 가 변동된 BL 에 한해 Notes 에 출처 token inline. 적용례: BL-035 ("DL-001 반영"), BL-041 ("DR-M03-01 resolved (disposition_basis)"), 기타 Notes 에 명시된 BL. **전수 row-level 출처 필드 (src/origin_date/merged_from)** 가 필요하면 M-04 Phase A 의 task schema 재설계 또는 M-08 refresh 시 별도 DL 로 재정의. 본 DL 은 "출처 token inline" scope 로 한정 완결.

**DL-005 resolution_note**: consolidated v3 frontmatter 에 `source_taxonomy` 필드 추가. 5 source 카테고리(backlog_memory / memory / design / pr / onto_direction) 각각의 `description` + `inclusion_rule` + `excluded_paths` (해당 시) + PR 의 `dual_role` (open=inclusion, merged=exclusion evidence) 명시.

**DL-006 resolution_note**: consolidated v3 frontmatter 에 `dedup_evidence_schema` 필드 신설. `basis_enum` 카테고리 고정 (`reference_normalization` / `title_topic_scope_identity` / `partial_overlap_with_distinct_scope`), `supersedes`(doc-level) 와 `dedup_retires`(item-level) 구분 명시. `kept_primary_source` + `linked_supporting_sources` 필드는 **DR-M03-01 의 schema instantiation 을 수용** 한 것 — DR-M03-01 이 primary owning_decision, 본 DL 은 schema 을 ledger 기록 관점에서 서술. 양방향 링크: BL-041 Notes (disposition_basis: DR-M03-01, schema 반영 DL-006).

**DL-007 resolution_note**: axis D 태깅 기준은 이미 DR-M00-05 (consolidated v2) 에서 명문화됨 — "lexicon term/entity/relation 관리로 한정, schema/registry/namespace 는 B". v3 의 axis D 15 item 은 모두 이 정의 내부 (lexicon lifecycle, entity 승격, relation 추가, provisional lifecycle, retire rule). **`axis_sub` 하위 태그 미도입 결정** — 15 item 이 모두 단일 범주(lexicon lifecycle) 라 sub-tag 추가 비용 > 정보 이득. 재평가 조건: axis D 가 30+ item 으로 증가 시 또는 Principal 판단.

**DL-008 resolution_note**: CC-3 L/G 경계 재분류는 이미 v2 에서 반영 완료 — BL-063/BL-119/BL-120 등 "학습 소비 정책 / 학습 건강도 / consumption 검증"은 primary G (govern) 로 분류됨 (learn 본체 ops 와 구분). v3 에서 재확인: activity L count = 0 (§1.2 learn lifecycle ops 본체 backlog 없음, Phase 1~3 모두 IMPLEMENTED/ABSORBED). M-03 에서 추가 재분류 불필요.

**DL-009 resolution_note**: pre-cutoff 37건에 DR-M03-04 priority 규칙 적용. **P1=1** (BL-120 Feature 15 Consumption Feedback — §1.0 기제 측정 직접 instrumentation), **P2=18** (SE Stage 3 HIGH/MEDIUM 8 + SE process 3 + Business 6 + /onto:health 1), **P3=18** (SE Stage 3 LOW 2 + SE Stage 4 10 + domain 미착수 4 + Palantir 1 + Adaptive Light Review 1). consolidated v3 Notes 컬럼 `priority: Pn` 태그로 기록.

**DL-010 resolution_note**: BL-085 (P-1 도메인 문서 확장 후 cross-ref 점검 단계, SE process canonical rule) ↔ BL-103 (Business 도메인 wave 3 cross-ref sync, specific instance) 관계 검토 — **dedup 아님**. 관계명 정규화 (D-4 반영): `rule_to_instance` (frontmatter `relation_names` 에 선언). BL-085 는 general process rule (canonical, role=rule), BL-103 은 그 rule 의 Business 도메인 execution instance (role=instance). consolidated v3 Notes 에 양방향 명시 (BL-085 Notes 에 "**DL-010 cross-ref**: BL-085=canonical process rule, BL-103=Business 도메인 wave 3 instance", BL-103 Notes 에 "**DL-010 cross-ref with BL-085**: 본 BL = Business wave 3 instance, BL-085 = general process rule").

**DL-011 resolution_note**: M-03 Step 1 에서 `gh pr list --state open` 재실행 (2026-04-13T13:10) → 0건 확인. M-00 실행 시점(2026-04-13T10:35) snapshot 유효. consolidated v3 Source 4 변동 없음. **evidence_ref (P-1 반영)**: execution-log.md M-03 entry `start_time: 2026-04-13T13:10:00+09:00` (명령 실행 timestamp). 스캔 명령: `gh pr list --state open --json number,title,updatedAt,url --limit 20` → `[]` (stdout). 재현: 동일 명령을 해당 timestamp 이후 재실행 시 결과 다를 수 있음 (open PR 변동 가능).

**DL-012 resolution_note**: DR-M03-01 로 해소 — axiology standing lens 승격 경로 폐기 (axiology lens 자체가 반대), dedup rule pre-gate 로 분해하여 consolidated v3 `dedup_evidence_schema` 에 `kept_primary_source` + `linked_supporting_sources` 필드 도입. BL-041 자체는 `already covered (partial)` + supporting.

**Commit**: `a53981b` (feat(plan): M-03 disposition + canonicality 분류 (102 gaps, 8 canonical-advancing, DL-004~012 resolved))

---

## M-04 Phase A (Task Schema·Canonical Output 결정) resolution_stage — 2 items (전원 resolved)

**Rationale**: Phase A는 activity vocabulary + canonical seat + binding rule 확정. activity/enum 관련 defer를 본 단계에 집약.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-013 | v5.1-meta | DR-M04-01 | DR | M-06/M-07/Expansion의 `activity` field canonical 참조 정렬. M-04 Phase A에서 활성화. **S-4/D-3 반영**: M-04 Phase A task schema 에 `depends_on: [BL-NNN | DL-NNN]` 필드 슬롯 예약 — M-05 Pre-draft Dependency Modeling 에서 값 채움. | **resolved** |
| DL-014 | v2-review | evolution F2 | Recommend | `activity_enum_ref: authority/core-lexicon.yaml#§1.activity.v2026-04-13` frontmatter 필드 도입 (enum 진화 hook) | **resolved** |

### 해소 기록 (DL-013/014, 2026-04-13T15:30, M-04 Phase A)

**DL-013 resolution_note**: DR-M04-01 으로 해소. `authority/core-lexicon.yaml` v0.6.0 에 `activity_enum` term 추가 (`allowed_values: [review, design, reconstruct, learn, govern]` + legacy_aliases `build→reconstruct`, `ask→retired`) + `axis_enum` term 추가 (`allowed_values: [A, B, C, D]` + 축 간 의존 notes). M-04 Phase A task schema 의 `depends_on` 필드는 `20260413-onto-todo.md#§1.1` 에 slot 예약 완료 — 각 원소 regex `^(W-[ABCD]-\d{2}|BL-\d{3}|DL-\d{3})$`, 값은 M-05 Pre-draft Dependency Modeling 에서 채움. 본 DL 의 "canonical 참조 정렬" 은 DR-M04-01 + `20260413-onto-todo.md` frontmatter `activity_enum_ref` + `axis_enum_ref` 의 3지점 정렬로 완결.

**DL-014 resolution_note**: DR-M04-02 로 해소. frontmatter 필드 `activity_enum_ref` + `axis_enum_ref` 의무화 규약 수립. 값 형식: `authority/core-lexicon.yaml#<term_id>.v<lexicon_version>`. `20260413-onto-todo.md` 초판 frontmatter 에 신규 형식으로 반영 완료. 기존 consolidated v3.2 의 `#§1.2` / `#§1.5` 형식 은 legacy 호환 기간 (v3.3 재revision 또는 M-08 일괄 교체) 까지 병존 허용. lexicon_version bump 규약 (additive=minor, breaking=major) + Expansion Protocol Migration Contract (v5.1 meta) 연계.

**Commit**: `15d1e56`

---

## M-05 (Pre-draft Dependency Modeling) resolution_stage — 2 items

**Rationale**: Compound/Phase sequencing은 의존성 모델의 영역. Phase B sanity check 는 M-05 dep graph 작성 직전 schema 수용성 검증 단계.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-015 | v1-review | C-8 | MODERATE | Compound/Phase sequencing 구조 승격. agent_id_rename Phase 0→5 (BL-104~109), §2(3차) → §1(8차) build 선행, Wave 1-3 compound expansion. `depends_on` 컬럼 또는 Notes 표준 문구. `item_granularity: consolidation-row (not work-item)` | **resolved** |
| DL-031 | m04-a-review-C2 | review-cf964039 C-02 | MAJOR | **Phase B sanity check tracking** — M-04 Phase A v1 에서 Phase B 가 "skipped (M-05 착수 직전 이관)" 으로 표시됐으나 재호출 contract 부재. v1.1 patch 에서 (1) onto-todo.md §4 에 PASS/FAIL/FAIL-boundary exit 경로 명시, (2) execution-log 에 phase_b_skip_rationale 등재, (3) 본 DL 로 M-05 dep graph 작성 직전 실행 의무 추적. 대상: BL-123→W-D-01, BL-120→W-C-01 (또는 M-05 직전 후보 재평가 결과). 축 A/B sanity 는 M-06 전수 검증에 위임. 현 sample 이 schema 의 약한 지점(depends_on 의미 구분/cluster 알고리즘/Migration Contract change_type/enum_ref resolution) 을 촉발하지 않으므로 후보 확장 또는 Migration Contract sanity case 추가 (evolution E-09 제안) 도 옵션. | **resolved** |

### 해소 기록 (DL-015, DL-031, 2026-04-13T19:20, M-05 v1 → 19:45 v1.1 patch)

**DL-015 resolution_note** (v1 + v1.1 통합): DR-M05-02 로 해소. Compound sequencing 표기 규약 수립. v1 (2026-04-13T19:20): `compound_id` metadata + `depends_on` 체인 + Notes compound_member 3종 표기 + `rewrite_trace.change_type` enum 에 `compound_expansion` 추가 필요 (M-06 trigger 보류). **v1.1 (2026-04-13T19:45, codex review 383afe00 Immediate A1 해소)**: Compound metadata canonical schema seat 승격 — DR-M04-03 신규로 `compound_member` (object `{id, ordinal, total}`) 를 onto-todo.md v1.4 schema 의 18번째 formal field 로 추가 + `compound_expansion` change_type 정식 등재 (schema_version v1.1 → v1.2 additive minor bump). Notes/frontmatter 허용 규정 revoke. Compound 무결성 불변식 4건 신규 (onto-todo.md §1.3). Rule SSOT = dep graph §5. Pre-identified compound 3 사례: `agent_id_rename` (BL-104~109, 6 Phase), `build_review_cycle` (§2 build_3rd → §1 build_8th, 2 단계), `business_domain_wave` (BL-101~103, 3 단계 + BL-101 nested Wave 1/2/3).

**DL-031 resolution_note** (v1 + v1.1 통합): DR-M05-03 로 해소-by-delegation. Principal 이 3 옵션 (A 현 후보 유지 / B 후보 확장 / C 전체 위임) 중 **Option C (skip 확정)** 선택 (v1, 2026-04-13T19:20). onto-todo.md v1.3 §4.2 Exit 경로 에 `skipped-by-delegation` row 추가. **v1.1 (2026-04-13T19:45, codex review 383afe00 Immediate A2/A3 해소)**: escalation 전면 개정 — 기존 "3회 누적" trigger 폐기, "첫 blocking-schema 또는 첫 weak-class-defect" 로 강화. Defect taxonomy 3종 신규 (blocking-schema / weak-class-defect / minor-clarification). M-06 delegated validation minimum surface 3 조건 (compound_member / depends_on 3종 / compound_expansion first-use) 신규 요구. v1.1 escalation 개정으로 Phase B 미실행 이어도 M-06 초기에 known weak class 가 강제 활성 검증됨 (codex review Consensus 2 "guardrails too weak" 해소).

**Commit**: `da61adf` (v1) + `e3e588b` (v1.1)

---

## M-06 (축별 Work Item 초안) resolution_stage — 8 items (Wave 2 완료 시점: 2 resolved / 6 pending)

**Rationale**: M-06은 축별 work item 생성 단계. 현 backlog에 미등재되었으나 §1 정본·§1.5 축 정의·M-01/M-02 inventory에서 drive된 **신규 work item 도출** 대상.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-016 | m02-inv | A0-framework | Gap | A0 (scope-runtime framework 추출) work item 신규 도출. §1.5 "A0 = 축 A 선행" 원칙 consolidated v2 미등재. 축 A 전체의 선행 조건 | **resolved** |
| DL-017 | m01-inv + m02-inv | measurement-infra | Gap | §1.4 측정 인프라 3지표 (점진성 / 지속성 / 기제) 계측 seat 구축. 전 활동 0건. `data-seats` component에서 M-02가 0 primary 확인. **M-06 분할 요구 (CC-A)**: 본 DL 을 3 지표 전수 work item 으로 분할 필수 (점진성 seat + 지속성 seat + 기제 seat 독립). BL-120 (gap × canonical-advancing, P1) 이 측면 3 기제 proxy — 측면 1/2 는 BL-120 같은 직접 advance 항목 0건이라 DL-017 분할이 유일 seed. superset 관계 (DL-017 ⊃ BL-120) 명시하여 중복 seat risk 회피. | pending |
| DL-018 | m02-inv | state-machine-dedup | Gap | State machine 3중 구현 통합 (review 9-state coordinator / scope-runtime 15-state / build.md spec). A0 framework 추출의 핵심 대상 | **resolved** |
| DL-019 | m01-inv + v2-review | drift-engine | Gap | drift 정책 engine·큐·승인 흐름 구축. §1.3 수준 0→1 도달 조건. 현 축 C 4건(BL-088~090, BL-120)은 harness 수습·검증 정책 수준이며 engine 자체 부재. axiology A-3도 동일 지적 | pending |
| DL-020 | m01-inv | reconstruct-cli | Gap | reconstruct 활동 전용 CLI bounded path 구축. review의 3-step bounded path 수준 비대칭. build-runtime 40 BL cluster의 근본 원인 | pending |
| DL-021 | m01-inv | govern-runtime | Gap | govern 전용 runtime (command / process / registry) 도입. artifact 풍부(authority/, design-principles/)하나 실행 주체 없음. §1.4 govern 완료 기준 "규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제" 충족 경로 | pending |
| DL-022 | v1-review + m01-inv | knowledge-principle-path | Gap | knowledge → principle 승격 경로 runtime 설계 + 구현. **BL-122 와 양방향 연계** (structure S-3 반영): BL-122 resolution_path=DL-022, reactivation_trigger=govern runtime DL-021 design 착수. 본 DL 은 BL-122 의 M-06 resolution seat. §1.2 "보류 중" 선언 상태. govern 개발 시 결정. | pending |
| DL-029 | m03-review-C1 | review-ontology-path-分岐 | Gap | review §1.4 완료 기준 3 "ontology 유무 경로 분기" 의 명시적 work item 도출. M-01 review inventory 가 "PARTIAL" 로 기록 (ontology 있음/없음 시 review 품질 차이 측정 seat 부재). DL-017 measurement-infra 는 §1.4 3 지표 (점진성/지속성/기제) 범위이며, "경로 분기" 자체는 별도 review runtime 결정 — 본 DL 로 분리. M-06 신규 도출 (C-1 ghost 해소 coverage review). | pending |

---

## M-07 (Post-draft 충돌·병렬 Cluster 검증) resolution_stage — 2 items

**Rationale**: M-07은 lifecycle balance + revise escalation + consistency check 단계.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-023 | qa-v3 | Q10 | Defer | lifecycle 분포 (buildout/migration/validation/maintenance/adoption) balance check. **M-03 CC-B 반영**: `scaffolding_ratio_trend` health metric 포함 — cycle 별 scaffolding 비중 (현 v3 = 50.4%) 추적하여 감소 방향성 검증. post-PR 잔여 결함 수습 비중이 canonical-advancing 진입 속도를 drain 하지 않는지 모니터. | pending |
| DL-024 | qa-v3 | Q9-extended | Defer | M-07 시점 consistency check 3 지점 실행 (M-00→M-03 entry count 일치, M-03→M-06 gap count ≥ work item count, M-06 schema 17필드 전부 채움 — `20260413-onto-todo.md` v1.x §1.1 canonical 기준; 이전 "13필드" 표기는 v4 meta 잔재) | pending |

---

## M-08 (Refresh·Maintenance Protocol) resolution_stage — 4 items

**Rationale**: M-08은 refresh protocol 수립 단계. 인프라·모니터링·audit 메커니즘을 본 단계에 집약.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-025 | qa-v3 | Q7 | Defer | 진행률·비용·토큰 예산 모니터링 방법 수립. M-08 refresh protocol에 포함. **CN-4 반영**: `deferred` sub-source 3종 (PRODUCTION PHASE / pre-cutoff P3 / §1.2 "보류 중") 을 deferred_reason enum 으로 승격 검토 포함. | pending |
| DL-026 | qa-v3 | Q8 | Defer | Principal 개입 trigger 임계값 확정. M-00~M-07 실행 중 누적 사례 후 | pending |
| DL-027 | v2-review | evolution F5/F7/F10 | Recommend | longitudinal replay/audit 인프라: `dedup_rule_set_ref`, `verification_status` enum, `dr_registry_ref`. **E-6 흡수**: axis D 30+ 재평가 trigger monitoring seat 통합. **E-7 반영**: schema_version migration logic 선언 (v2→v3 변경 fields, rollback policy, downstream reader 재파싱 요건) 포함. | pending |
| DL-028 | v2-review | pragmatics N1 | Recommend | `primary_tag_convention` SSOT 단일화 (frontmatter canonical 선언, 본문은 참조) | pending |
| DL-030 | m03-review-NP1 | aggregate-prioritization-lens | Governance | **NP-1 Aggregate Prioritization Coherence Lens** 제안 preserve (axiology 제안). canonical-advancing 집합의 축 분포가 §1.5 축 중요도·의존 관계와 정합하는지 평가하는 집합 level lens. 현 9 lens 는 item-level 또는 개별 가치 위주. M-08 refresh (또는 M-07 재검토) 시 lens set 확장 여부 결정. 현재는 보존만. | pending |

---

## 해소 이력 (resolved items)

### DL-001, DL-002, DL-003 (resolved 2026-04-13T12:45:00+09:00, via consolidated v2.1 patch)
- 해소 근거: 위 "M-01 resolution_stage — 3 items" 섹션의 resolution_note 참조
- commit: `84736c7` (fix(plan): consolidated v2.1 + ledger v1.1 — M-01 MINOR 3건 해소)
- context: M-01은 이미 이전 commit(f248253 및 이전)에서 실행 완료. 본 3건은 ledger 수립 직후 M-01 incremental scope로 즉시 처리.

### DL-004 ~ DL-012 (resolved 2026-04-13T13:50:00+09:00, via M-03 consolidated v3 patch)
- 해소 근거: 위 "M-03 resolution_stage — 9 items" 섹션의 resolution_note 참조
- M-03 core output: consolidated v3 (disposition + canonicality 123 BL 전원 할당) + m03-decisions.md (DR-M03-01/02/03/04)
- commit: `a53981b`
- context: Stage completion protocol (DR-M00-06) 첫 완결 적용. `resolution_stage == M-03 AND status == pending` 인 item = 0 (성공 기준 충족).

### DL-013 ~ DL-014 (resolved 2026-04-13T15:30:00+09:00, via M-04 Phase A)
- 해소 근거: 위 "M-04 Phase A (Task Schema·Canonical Output 결정) resolution_stage — 2 items" 섹션의 resolution_note 참조
- M-04 Phase A core output: `authority/core-lexicon.yaml` v0.6.0 (activity_enum + axis_enum canonical seat) + `development-records/design/20260413-onto-todo.md` v1 (schema + 축별 빈 섹션) + m04-decisions.md (DR-M04-01/02)
- commit: `15d1e56`
- context: Stage completion protocol (DR-M00-06) 두 번째 완결 적용. `resolution_stage == M-04-A AND status == pending` 인 item = 0 (성공 기준 충족).

### DL-015, DL-031 (resolved 2026-04-13T19:20:00+09:00, via M-05)
- 해소 근거: 위 "M-05 (Pre-draft Dependency Modeling) resolution_stage — 2 items" 섹션의 resolution_note 참조
- M-05 core output: `development-records/design/20260413-onto-todo-dep-graph.md` v1 (축·활동 dep graph + Compound sequencing 규약 + D bootstrap/continuing) + `development-records/plan/20260413-m05-decisions.md` v1 (DR-M05-01/02/03) + `development-records/design/20260413-onto-todo.md` v1.3 (§4.2 skip-by-delegation exit 경로 추가)
- commit: `da61adf`
- context: Stage completion protocol (DR-M00-06) 세 번째 완결 적용. `resolution_stage == M-05 AND status == pending` 인 item = 0 (성공 기준 충족). Principal 판단 Option C (Phase B skip-by-delegation) 적용.

---

## 개정 이력

- v1 (2026-04-13T12:30): 초판. 28 item 등재. M-00 v1 review 결과 + v2 review 결과 + v5.1 meta + QA v3 + M-01 inventory + M-02 inventory 통합.
- v1.1 (2026-04-13T12:45): DL-001/002/003 (M-01 resolution_stage 3건) 전원 resolved 처리. consolidated v2.1 patch와 연동.
- v1.2 (2026-04-13T13:50): DL-004~012 (M-03 resolution_stage 9건) 전원 resolved 처리. consolidated v3 + m03-decisions.md 와 연동. resolved_count: 3 → 12, pending_count: 25 → 16.
- v1.3 (2026-04-13T14:30): 9-lens review `20260413-cf964039` feedback 반영. DL-004 resolution_note 에 Scope="대표 사례 부착" 명시 (C-F 해소). DL-006 resolution_note 에 "DR-M03-01 schema instantiation 수용" downgrade (CC-D 해소). DL-017 context 에 M-06 3 지표 분할 + BL-120 superset 관계 명시 (CC-A 반영). DL-023 context 에 `scaffolding_ratio_trend` metric 추가 (CC-B 반영). 새 resolved 없음.
- v1.4 (2026-04-13T15:00): 9-lens review MINOR 20+ 반영. DL-029 신규 (review ontology 경로 분기, M-06 resolution_stage, C-1 ghost). DL-030 신규 (NP-1 Aggregate Prioritization Coherence Lens 제안, M-08 resolution_stage governance). frontmatter: stage_id_scheme + relation_names 선언. DL-007/010/011/013/022/025/027 context note 보강. §"관리 정책" 을 DR-M00-06 SSOT 참조로 축약 (CN-5). item_count: 28 → 30, pending_count: 16 → 18. 새 resolved 없음.
- v1.5 (2026-04-13T15:30): DL-013 + DL-014 (M-04-A resolution_stage 2건) 전원 resolved 처리. M-04 Phase A core output (core-lexicon.yaml v0.6.0 activity_enum/axis_enum + onto-todo.md v1 schema + m04-decisions DR-M04-01/02) 와 연동. resolved_count: 12 → 14, pending_count: 18 → 16. Stage completion protocol 두 번째 완결 적용 (resolution_stage=M-04-A pending=0 성공 기준 충족).
- v1.6 (2026-04-13T16:10): M-04 Phase A v1.1 patch (9-lens review session `20260413-a9e93dd7` CONDITIONAL 해소). DL-031 신규 (Phase B sanity check tracking, M-05 resolution_stage, MAJOR — C-02 해소). M-05 stage item count 1 → 2. item_count: 30 → 31, pending_count: 16 → 17. 새 resolved 없음. 본 v1.1 patch 의 다른 변경 (lexicon v0.6.1, onto-todo v1.1, m04-decisions v1.1) 은 DR-M04-01/02 의 applied_cases 갱신으로 흡수 — 신규 DL 미발생.
- v1.6 micro-update (2026-04-13T16:25): M-04 Phase A v1.2 follow-up (codex review session `20260413-de95c971` PASS-with-residuals 후속). DL-024 의 "13필드" 표기 → "17필드" 로 정정 (잔재 표기 주석). 새 DL 미발생, count 변화 없음. 본 micro-update 는 v1.6 sub-revision (revision 번호 유지, 본문만 정정).
- v1.7 (2026-04-13T19:20): DL-015 + DL-031 (M-05 resolution_stage 2건) 전원 resolved 처리. M-05 core output (onto-todo-dep-graph.md v1 + m05-decisions.md v1 + onto-todo.md v1.3) 와 연동. resolved_count: 14 → 16, pending_count: 17 → 15. Stage completion protocol 세 번째 완결 적용 (resolution_stage=M-05 pending=0 성공 기준 충족). Principal 판단 Option C (Phase B skip-by-delegation) 적용 — DL-031 이 skip-by-delegation 경로로 resolved.
- v1.8 (2026-04-13T19:45): M-05 codex 9-lens review session `20260413-383afe00` CONDITIONAL 해소 (Option B consolidated patch per Principal). 새 DL 미발생, resolved/pending count 변화 없음 (resolved 16 / pending 15 유지). DL-015 resolution_note 및 DL-031 resolution_note 에 v1.1 patch (DR-M04-03 schema 확장, DR-M05-02 canonical seat 확정, DR-M05-03 escalation tighten + defect taxonomy + minimum validation surface, DR-M05-04 책임 경계 재정의, dep graph §0.1 + §2.2.1 + §2.2.2 + §4 + §5 patch) 반영 기록 통합. Artifact revision: onto-todo.md v1.3 → v1.4, m04-decisions v1.1 → v1.2, m05-decisions v1 → v1.1, dep graph v1 → v1.1.
- v1.9 (2026-04-13T20:40): M-06 Wave 2 — DL-016 (A0 framework via W-B-01) + DL-018 (state machine 3중 dedup via W-B-02) 2건 resolved. resolved_count 16 → 18, pending_count 15 → 13. M-06 stage pending 8 → 6 (DL-017/019/020/021/022/029 잔여).
  - **DL-016 resolution_note**: onto-todo.md v2-wave2 §2 W-B 섹션에 W-B-01 (A0 framework 추출, scope-runtime kernel 구축, 축 A 전체 선행) 작성. canonical-advancing, activity=reconstruct, depends_on=[DL-016, DL-018] (양방향 연계), completion_criterion 에 sprint-kit 흡수 stable + 5 활동 entrypoint 선행 + 1 활동 E2E pass 명시. files=[src/core-runtime/scope-runtime/**, processes/build.md]. M-06 Wave 2 commit 으로 resolved 확정.
  - **DL-018 resolution_note**: onto-todo.md v2-wave2 §2 W-B 섹션에 W-B-02 (state machine 3중 구현 dedup — review 9-state + scope-runtime 15-state + build.md spec) 작성. canonical-advancing, activity=reconstruct, depends_on=[W-B-01, BL-095, DL-018] (3종 edge — **DR-M05-03 v1.1 minimum surface 조건 2 cover anchor**). completion_criterion 에 3 source 간 일관성 검증 + build.md spec 단일 SSOT 명시. M-06 Wave 2 commit 으로 resolved 확정.
  - **M-06 stage resolved 진행률**: 2/8 = 25% (Wave 2 완료 시점). Wave 3 에서 DL-017/020/029 해소 + Wave 4 에서 DL-019/021/022 해소 예정.

## 참조

- `development-records/plan/20260413-backlog-consolidated.md` (v2) — 본 ledger와 분리. Ledger는 backlog item이 아닌 **작업 방식·schema·구조·gap에 대한 defer**
- `development-records/plan/20260413-m00-decisions.md` — DR-M00-06 (본 ledger 수립 결정) 추가 예정
- `development-records/plan/20260413-execution-log.md` — 각 stage 완료 시 ledger 갱신 이벤트 기록
