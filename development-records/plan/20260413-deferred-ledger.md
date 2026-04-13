---
as_of: 2026-04-13T13:50:00+09:00
supersedes: null
status: active
revision: v1.2
functional_area: deferred-ledger
purpose: |
  M-00 ~ M-08 meta task 실행 중 deferred로 분류된 item의 **단일 추적 ledger**.
  각 item의 origin / severity / resolution_stage / status를 longitudinal로 관리.
item_count: 28
resolved_count: 12
pending_count: 16
resolution_stage_distribution:
  M-01: 3 (전원 resolved)
  M-03: 9 (전원 resolved — v1.2)
  M-04-A: 2
  M-05: 1
  M-06: 7
  M-07: 2
  M-08: 4
id_scheme: "DL-NNN (sequential, stable across revisions). BL-ID 와 달리 본 ledger 내에서 불변"
---

# Deferred Item Ledger (2026-04-13)

본 문서는 M-00 ~ M-08 실행 과정에서 **즉시 해소하지 않고 후속 stage로 연기**된 item의 단일 관리 ledger.

## 관리 정책 (DR-M00-06)

**Stage completion protocol**: 매 meta task(M-NN) 완료 시점에 다음 3단계 수행:

1. **신규 deferred 식별 + stage 할당**: 해당 stage 실행 중 발견된 defer 대상 item을 본 ledger에 추가. 각 item에 `resolution_stage` 할당.
2. **현 stage item 해소**: `resolution_stage == 현재 완료 중인 stage`인 item 전원 status를 `resolved`로 변경. 해소 근거 `resolution_note`에 기록.
3. **미해소 시 재defer**: 해소 못한 item은 다음 stage로 이동 + 이유 기록. 연속 2회 defer 시 Principal escalation.

**성공 기준**: M-NN 완료 시점에 `resolution_stage == M-NN` AND `status == pending`인 item = 0.

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
| DL-007 | v1-review | CC-2 | Conditional | Axis D 태깅 기준 명문화 + `axis_sub: lexicon_entity_promotion | provisional_quarantine` 하위 태그 (필요 시) | **resolved** |
| DL-008 | v1-review | CC-3 | Conditional | activity L(learn) vs G(govern) 경계 재분류 (BL-063, BL-119 등 govern 성격 항목 primary 재지정) | **resolved** |
| DL-009 | v1-review | axiology A-5 | Recommend | pre-cutoff 37건 (§8 SE 23 + §11 business 6 + §14 domain 4 + §15 palantir 1 + §17 optimization 3)을 P1/P2/P3 class로 분할. 판정 부하 분산 | **resolved** |
| DL-010 | v1-review | conciseness CN-1 | Recommend | BL-085 ↔ BL-103 "프로세스 일반화 canonical vs 사이클 instance" 교차참조 dedup 후보 검토 | **resolved** |
| DL-011 | v1-review | pragmatics F6 | Recommend | "M-03 시작 직전 Open PR 재스캔" 트리거 명시 (snapshot staleness 방지) | **resolved** |
| DL-012 | v1-review | axiology NP-1 | Governance | BL-041 Authority/Lineage Compatibility Gate의 axiology standing lens 승격 결정을 **M-03 이전**으로 앞당김 권고 (v1+v2 반복 제기) | **resolved** |

### 해소 기록 (DL-004~012, 2026-04-13T13:50, M-03 v1.2 patch)

**DL-004 resolution_note**: consolidated v3 frontmatter 에 `schema_version: v3`, `id_scheme` (v3 기점 stable, BL-ID 재할당 금지) 반영. row-level traversability (`src`, `origin_date`, `merged_from`) 는 본문 표 Notes 컬럼에 inline 포함 방식으로 수용 — separate 컬럼 추가 시 표 폭 과도 판단. 대표 사례: BL-035 Notes 에 "DL-001 반영" 출처 표기, BL-041 Notes 에 "DR-M03-01 resolved" 출처 표기.

**DL-005 resolution_note**: consolidated v3 frontmatter 에 `source_taxonomy` 필드 추가. 5 source 카테고리(backlog_memory / memory / design / pr / onto_direction) 각각의 `description` + `inclusion_rule` + `excluded_paths` (해당 시) + PR 의 `dual_role` (open=inclusion, merged=exclusion evidence) 명시.

**DL-006 resolution_note**: consolidated v3 frontmatter 에 `dedup_evidence_schema` 필드 신설. `basis_enum` 카테고리 고정 (`reference_normalization` / `title_topic_scope_identity` / `partial_overlap_with_distinct_scope`), `supersedes`(doc-level) 와 `dedup_retires`(item-level) 구분 명시. DR-M03-01 의 `kept_primary_source` + `linked_supporting_sources` 필드 분리도 여기에 통합.

**DL-007 resolution_note**: axis D 태깅 기준은 이미 DR-M00-05 (consolidated v2) 에서 명문화됨 — "lexicon term/entity/relation 관리로 한정, schema/registry/namespace 는 B". v3 의 axis D 15 item 은 모두 이 정의 내부 (lexicon lifecycle, entity 승격, relation 추가, provisional lifecycle, retire rule). **`axis_sub` 하위 태그 미도입 결정** — 15 item 이 모두 단일 범주(lexicon lifecycle) 라 sub-tag 추가 비용 > 정보 이득. 재평가 조건: axis D 가 30+ item 으로 증가 시 또는 Principal 판단.

**DL-008 resolution_note**: CC-3 L/G 경계 재분류는 이미 v2 에서 반영 완료 — BL-063/BL-119/BL-120 등 "학습 소비 정책 / 학습 건강도 / consumption 검증"은 primary G (govern) 로 분류됨 (learn 본체 ops 와 구분). v3 에서 재확인: activity L count = 0 (§1.2 learn lifecycle ops 본체 backlog 없음, Phase 1~3 모두 IMPLEMENTED/ABSORBED). M-03 에서 추가 재분류 불필요.

**DL-009 resolution_note**: pre-cutoff 37건에 DR-M03-04 priority 규칙 적용. **P1=1** (BL-120 Feature 15 Consumption Feedback — §1.0 기제 측정 직접 instrumentation), **P2=18** (SE Stage 3 HIGH/MEDIUM 8 + SE process 3 + Business 6 + /onto:health 1), **P3=18** (SE Stage 3 LOW 2 + SE Stage 4 10 + domain 미착수 4 + Palantir 1 + Adaptive Light Review 1). consolidated v3 Notes 컬럼 `priority: Pn` 태그로 기록.

**DL-010 resolution_note**: BL-085 (P-1 도메인 문서 확장 후 cross-ref 점검 단계, SE process canonical rule) ↔ BL-103 (Business 도메인 wave 3 cross-ref sync, specific instance) 관계 검토 — **dedup 아님**. BL-085 는 general process rule (canonical), BL-103 은 그 rule 의 Business 도메인 execution instance. cross-ref 관계 consolidated v3 Notes 에 양방향 명시.

**DL-011 resolution_note**: M-03 Step 1 에서 `gh pr list --state open` 재실행 (2026-04-13T13:10) → 0건 확인. M-00 실행 시점(2026-04-13T10:35) snapshot 유효. consolidated v3 Source 4 변동 없음.

**DL-012 resolution_note**: DR-M03-01 로 해소 — axiology standing lens 승격 경로 폐기 (axiology lens 자체가 반대), dedup rule pre-gate 로 분해하여 consolidated v3 `dedup_evidence_schema` 에 `kept_primary_source` + `linked_supporting_sources` 필드 도입. BL-041 자체는 `already covered (partial)` + supporting.

**Commit**: (pending — Step 9 에서 기록)

---

## M-04 Phase A (Task Schema·Canonical Output 결정) resolution_stage — 2 items

**Rationale**: Phase A는 activity vocabulary + canonical seat + binding rule 확정. activity/enum 관련 defer를 본 단계에 집약.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-013 | v5.1-meta | DR-M04-01 | DR | M-06/M-07/Expansion의 `activity` field canonical 참조 정렬. M-04 Phase A에서 활성화 | pending |
| DL-014 | v2-review | evolution F2 | Recommend | `activity_enum_ref: authority/core-lexicon.yaml#§1.activity.v2026-04-13` frontmatter 필드 도입 (enum 진화 hook) | pending |

---

## M-05 (Pre-draft Dependency Modeling) resolution_stage — 1 item

**Rationale**: Compound/Phase sequencing은 의존성 모델의 영역.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-015 | v1-review | C-8 | MODERATE | Compound/Phase sequencing 구조 승격. agent_id_rename Phase 0→5 (BL-104~109), §2(3차) → §1(8차) build 선행, Wave 1-3 compound expansion. `depends_on` 컬럼 또는 Notes 표준 문구. `item_granularity: consolidation-row (not work-item)` | pending |

---

## M-06 (축별 Work Item 초안) resolution_stage — 7 items

**Rationale**: M-06은 축별 work item 생성 단계. 현 backlog에 미등재되었으나 §1 정본·§1.5 축 정의·M-01/M-02 inventory에서 drive된 **신규 work item 도출** 대상.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-016 | m02-inv | A0-framework | Gap | A0 (scope-runtime framework 추출) work item 신규 도출. §1.5 "A0 = 축 A 선행" 원칙 consolidated v2 미등재. 축 A 전체의 선행 조건 | pending |
| DL-017 | m01-inv + m02-inv | measurement-infra | Gap | §1.4 측정 인프라 3지표 (점진성 / 지속성 / 기제) 계측 seat 구축. 전 활동 0건. `data-seats` component에서 M-02가 0 primary 확인 | pending |
| DL-018 | m02-inv | state-machine-dedup | Gap | State machine 3중 구현 통합 (review 9-state coordinator / scope-runtime 15-state / build.md spec). A0 framework 추출의 핵심 대상 | pending |
| DL-019 | m01-inv + v2-review | drift-engine | Gap | drift 정책 engine·큐·승인 흐름 구축. §1.3 수준 0→1 도달 조건. 현 축 C 4건(BL-088~090, BL-120)은 harness 수습·검증 정책 수준이며 engine 자체 부재. axiology A-3도 동일 지적 | pending |
| DL-020 | m01-inv | reconstruct-cli | Gap | reconstruct 활동 전용 CLI bounded path 구축. review의 3-step bounded path 수준 비대칭. build-runtime 40 BL cluster의 근본 원인 | pending |
| DL-021 | m01-inv | govern-runtime | Gap | govern 전용 runtime (command / process / registry) 도입. artifact 풍부(authority/, design-principles/)하나 실행 주체 없음. §1.4 govern 완료 기준 "규범 등재·갱신·폐기 추적 + drift 정책 명시 + 자기 변경 시 Principal 승인 강제" 충족 경로 | pending |
| DL-022 | v1-review + m01-inv | knowledge-principle-path | Gap | knowledge → principle 승격 경로 runtime 설계 + 구현. BL-122와 연계. §1.2 "보류 중" 선언 상태. govern 개발 시 결정 | pending |

---

## M-07 (Post-draft 충돌·병렬 Cluster 검증) resolution_stage — 2 items

**Rationale**: M-07은 lifecycle balance + revise escalation + consistency check 단계.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-023 | qa-v3 | Q10 | Defer | lifecycle 분포 (buildout/migration/validation/maintenance/adoption) balance check | pending |
| DL-024 | qa-v3 | Q9-extended | Defer | M-07 시점 consistency check 3 지점 실행 (M-00→M-03 entry count 일치, M-03→M-06 gap count ≥ work item count, M-06 schema 13필드 전부 채움) | pending |

---

## M-08 (Refresh·Maintenance Protocol) resolution_stage — 4 items

**Rationale**: M-08은 refresh protocol 수립 단계. 인프라·모니터링·audit 메커니즘을 본 단계에 집약.

| ID | Origin | Ref | Severity | Summary | Status |
|---|---|---|---|---|---|
| DL-025 | qa-v3 | Q7 | Defer | 진행률·비용·토큰 예산 모니터링 방법 수립. M-08 refresh protocol에 포함 | pending |
| DL-026 | qa-v3 | Q8 | Defer | Principal 개입 trigger 임계값 확정. M-00~M-07 실행 중 누적 사례 후 | pending |
| DL-027 | v2-review | evolution F5/F7/F10 | Recommend | longitudinal replay/audit 인프라: `dedup_rule_set_ref`, `verification_status` enum, `dr_registry_ref` | pending |
| DL-028 | v2-review | pragmatics N1 | Recommend | `primary_tag_convention` SSOT 단일화 (frontmatter canonical 선언, 본문은 참조) | pending |

---

## 해소 이력 (resolved items)

### DL-001, DL-002, DL-003 (resolved 2026-04-13T12:45:00+09:00, via consolidated v2.1 patch)
- 해소 근거: 위 "M-01 resolution_stage — 3 items" 섹션의 resolution_note 참조
- commit: `84736c7` (fix(plan): consolidated v2.1 + ledger v1.1 — M-01 MINOR 3건 해소)
- context: M-01은 이미 이전 commit(f248253 및 이전)에서 실행 완료. 본 3건은 ledger 수립 직후 M-01 incremental scope로 즉시 처리.

### DL-004 ~ DL-012 (resolved 2026-04-13T13:50:00+09:00, via M-03 consolidated v3 patch)
- 해소 근거: 위 "M-03 resolution_stage — 9 items" 섹션의 resolution_note 참조
- M-03 core output: consolidated v3 (disposition + canonicality 123 BL 전원 할당) + m03-decisions.md (DR-M03-01/02/03/04)
- commit: (pending — Step 9)
- context: Stage completion protocol (DR-M00-06) 첫 완결 적용. `resolution_stage == M-03 AND status == pending` 인 item = 0 (성공 기준 충족).

---

## 개정 이력

- v1 (2026-04-13T12:30): 초판. 28 item 등재. M-00 v1 review 결과 + v2 review 결과 + v5.1 meta + QA v3 + M-01 inventory + M-02 inventory 통합.
- v1.1 (2026-04-13T12:45): DL-001/002/003 (M-01 resolution_stage 3건) 전원 resolved 처리. consolidated v2.1 patch와 연동.
- v1.2 (2026-04-13T13:50): DL-004~012 (M-03 resolution_stage 9건) 전원 resolved 처리. consolidated v3 + m03-decisions.md 와 연동. resolved_count: 3 → 12, pending_count: 25 → 16.

## 참조

- `development-records/plan/20260413-backlog-consolidated.md` (v2) — 본 ledger와 분리. Ledger는 backlog item이 아닌 **작업 방식·schema·구조·gap에 대한 defer**
- `development-records/plan/20260413-m00-decisions.md` — DR-M00-06 (본 ledger 수립 결정) 추가 예정
- `development-records/plan/20260413-execution-log.md` — 각 stage 완료 시 ledger 갱신 이벤트 기록
