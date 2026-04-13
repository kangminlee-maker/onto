---
as_of: 2026-04-13T12:45:00+09:00
supersedes: null
status: active
revision: v2.1
revision_note: |
  v2 (commit 3d360ab) 기반 v2.1 patch. Deferred ledger DL-001/002/003 반영:
  - DL-002 structure S-4-v2: L452 오타 수정 ("로 포함" → "C로 포함")
  - DL-003 dep N-DEP-03: BL-121 primary G → E,G (ask 폐기 govern 결정의 집행)
  - DL-001 logic N-1: BL-035 activity E → G (Phase 0.5.4 reconfirmation check 단계 추가는 절차 규칙. BL-085~087 P-1/2/3와 동일 패턴)
  순효과: Activity 분포 E=76, G=39는 동일 유지 (DL-001 E→G 1건 + DL-003 G→E 1건이 상쇄). 버킷 멤버십만 교정.
  v2 이력: v1 (commit 69fcdc4) 9-lens review (session 20260413-30463d46) 결과 BLOCKING 2 + MAJOR 2 반영.
  C-1 (primary 규약 + 정확 재집계), C-2 (R/E 재분류 + build↔reconstruct homonym), C-3 (exclusion modality 일관화),
  C-5 (learn phase 4 + §1 정본 지시 항목 등재) 해소.
  MODERATE 4건 (C-4/6/7/8) + Conditional 2건은 M-03 중 처리 예정 (deferred ledger DL-004~012).
functional_area: backlog-consolidation
item_count: 123
canonicality: scaffolding
authority_stance: non-authoritative-plan-surface
schema_version: v2
id_scheme: "BL-NNN (position-based, non-stable across revisions; M-03 disposition 전에 authoritative citation 금지)"
primary_tag_convention: "comma-list의 첫 태그 = primary. primary-only 집계 기준"
legacy_name_mapping:
  build: reconstruct  # §1.2 기준. processes/build.md, commands/build.md 등 파일명·명령명은 legacy. activity 분류 시 reconstruct로 계산
source_counts:
  memory: 29
  backlog_memory: 87
  design: 4
  pr: 0
  onto_direction: 3  # §1 정본 직접 지시 항목 (신규 source 카테고리)
dedup_events: 3
dedup_evidence:
  - basis: reference_normalization (parent index ↔ detailed list)
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#4 review_record entity 승격 검토" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-3 review_record entity 승격 검토" }
    kept: "Principal Stage 3 #4 (detailed)"
    dedup_retires: "lexicon_stage2_prep.md Stage 3-3 (brief summary)"
    kept_because: "principal_stage3_backlog is the detailed canonical list; lexicon_stage2_prep.md Stage 3 is a parent index"
  - basis: "title + topic + scope 동일 (≥95%)"
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#5 build/ask/learn/govern/design dispatch target relation" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-1 dispatch target relation" }
    kept: "Principal Stage 3 #5"
    dedup_retires: "lexicon_stage2_prep.md Stage 3-1"
    kept_because: "same item, principal_stage3 has richer context"
  - basis: "title + topic + scope 동일 (≥95%)"
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
    note: "v2 build↔reconstruct homonym 매핑 확정. processes/build.md, commands/build.md 등은 legacy 명칭; activity는 reconstruct(E)"
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

Target: `processes/build.md` (= reconstruct 프로세스 spec, legacy 명칭 "build") post-PR#17 잔여. fix/build-post-merge 브랜치로 일괄 처리 예정.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-001 | P-5 MAJOR: halt-message per-code template 5개 (phase_3_5, phase_reentry, explorer_failure, runtime_coordinator, session_state_corrupt) | E | B | spec update |
| BL-002 | C-1 MODERATE: session_state_corrupt error code 신설 (wip.yml/deltas/session-log 손상 대응) | E | B | |
| BL-003 | E-1 future: Error code registry 확장성 (N≈20 시 authority/error-codes.yaml로 이관) | D,G | B,D | scale-trigger gated, structural reorganization |
| BL-004 | L-4 MINOR: adjudicator_failure phase "phase_1 or phase_2" cardinality 위반 | E | B | |
| BL-005 | S-2 MINOR: session-log.yml single-writer declaration 명시 | E | B | |
| BL-006 | D-1 MINOR: session-log multi-writer 시 atomic append 계약 | E | B | |
| BL-007 | C-2 MINOR: custom:/x-* namespace 예약 (user config 확장) | E | B | schema namespace = axis B |
| BL-008 | L-3 MINOR: degradation_threshold_warning level 불일치 | E | B | |
| BL-009 | S-4 MINOR: phase3_user_responses + phase4_runtime_state atomic-clear invariant | E | B | |
| BL-010 | S-6 MINOR: phase3_user_responses absence = resumption trigger 명시 | E | B | |
| BL-011 | S-1 Struct MINOR: phase3_user_responses producer step을 Phase 3 body에 추가 | E | B | |
| BL-012 | P-4 Prag MINOR: global_reply vs decisions 일관성 enforcement cross-ref | E | B | |
| BL-013 | E-F1/E-F2 Evo MINOR: phase3_user_responses 추가 필드 path + error code extensibility 정책 | E | B | |
| BL-014 | Axiology A-F2: output_language scope 결정 (build-only vs cross-command 공용) | G | B | cross-command 정책 결정 |
| BL-015 | Axiology A-F1: degradation 연속 발생 시 session log diagnostic | E | B | |

### §2. project_build_3rd_review_backlog.md (22 items) — updatedAt: 2026-04-12

Target: `processes/build.md` (40411d3 기준). **선행 권장**: PR #16 merged 기반이므로 §1 (8차) 작업 전에 본 §2 (3차) 항목부터 처리 권장 (C-8 대응).

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-016 | CB-1: Tier 2 loop dispatch 경로 미정의 | E | B | BLOCKING |
| BL-017 | CB-2: rationale-absent 재분류 patch operation 부재 | E | B | BLOCKING |
| BL-018 | CB-3: user_resolved enum 미정의 | E | B | BLOCKING |
| BL-019 | CB-4: Phase 3 Unresolved Conflicts 표에 priority 필드 누락 | E | B | BLOCKING |
| BL-020 | CB-5: Stage 2 module_inventory 3중 정의 | E | B | BLOCKING |
| BL-021 | CB-6: observation_aspect 고립 (Explorer 생산만, 소비자 없음) | E | B | BLOCKING |
| BL-022 | CB-7: stage1_uncovered_modules 필드 wip.yml schema 미선언 | E | B | BLOCKING |
| BL-023 | CC-1: Semantics lens 실패 시 graceful degradation vs No-impact 규칙 충돌 | E | B | Critical |
| BL-024 | CC-2: Phase 1 Adjudicator 실패 시 label conflict 경로 모호 | E | B | Critical |
| BL-025 | CC-3: degradation_count "successful round" 정의 모호 | E | B | Critical |
| BL-026 | CC-4: nullify operation 트리거 미명세 | E | B | Critical |
| BL-027 | CC-5: added_in_stage 필드 schema 미선언 | E | B | Critical |
| BL-028 | CC-6: Coverage underexplored_assessment threshold 정보 부재 | E | B | Critical |
| BL-029 | CC-7: unresolved_for_user 라운드 간 persistence target 미명세 | E | B | Critical |
| BL-030 | R-29: Tier 1 tokenization CJK/Unicode 처리 규칙 명시 | E | B | Recommend |
| BL-031 | R-30: convergence_status에 semantic_matching_degraded flag 추가 | E | B | Recommend |
| BL-032 | R-31: fact_type enum을 Delta Format SSOT로 통합 (현재 6곳 분산) | E | B | Recommend, schema enum = axis B |
| BL-033 | R-32: Change Propagation Checklist에 config.yml, golden/schema-*.yml, core-lexicon.yaml 추가 | G | D | Recommend, change rule |
| BL-034 | R-33: degradation threshold 2를 config로 파라미터화 | E | B | Recommend |
| BL-035 | R-34: Phase 0.5.4 Schema reconfirmation check 단계 명시 | G | B | Recommend, procedural rule addition (BL-085~087 P-1/2/3와 같은 패턴). DL-001 반영 |
| BL-036 | R-35: Query Type Registry 각 type에 input/output YAML 스키마 추가 | E | B | Recommend |
| BL-037 | R-36: user-decline path가 degradation threshold 외 체크포인트에서 필요한지 설계 결정 기록 | G | B | Recommend, decision record |

### §3. project_roles_refactor_v3_backlog.md (5 items) — updatedAt: 2026-04-12

Target: roles/*.md perspective-first refactor v3 baseline 후속.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-038 | BL-1 CONS-1: domain=none self-contained fallback (lens-prompt-contract.md §9.3 4요소 명시) | G | A | 7차 리뷰 deferred, entrypoint 행동 rule |
| BL-039 | BL-2 CC-1: contributor-time discoverability (symptom→lens 발견성) receiving seat 결정 | G | A | 7차 리뷰 deferred |
| BL-040 | BL-3 UF-1/UF-2: dependency/conciseness naming scope 과소 (rename or 정의 문구 추가) | G | D | 6차 deferred, lexicon term rename 후보 |
| BL-041 | BL-4 Authority/Lineage Compatibility Gate (axiology proposal, 여러 리뷰 반복) | G | D | axiology standing lens 승격 미결. axiology NP-1에서 재제기 — M-03 이전 승격 결정 권고 |
| BL-042 | BL-5 coverage-reported evidence/provenance gap (전담 lens 없음) | G | D | 5차 deferred, lens 집합 확장 |

### §4. project_principal_stage3_backlog.md (9 items) — updatedAt: 2026-04-12

Principal 용어 정렬 후 Stage 3 구조적 개선.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-043 | #1 Runtime principal confirmation seat 도입 | E | B | DEFERRED TO PRODUCTION PHASE (v3 설계 완료, code refactor 규모 큼) |
| BL-044 | #2 Structured diagnostic contract (design/commands/error-messages.ts 문자열 매칭 → diagnostic code) | G | B | Medium, diagnostic code registry rule |
| BL-045 | #3 draft-packet.ts constraint source 일치 가드 | E | B | Medium |
| BL-046 | #4 review_record entity 승격 검토 (term → entity, lifecycle 부여) | G | D | Merges lexicon_stage2_prep Stage 3-3 |
| BL-047 | #5 build/ask/learn/govern/design dispatch target relation 추가 | G | D | Merges lexicon_stage2_prep Stage 3-1 |
| BL-048 | #6 각 entrypoint별 process entity 도입 가능성 | G | D | Merges lexicon_stage2_prep Stage 3-2 |
| BL-049 | #8 competency scope / competency questions 개념 | G | D | |
| BL-050 | #9 provenance concept | G | D | |
| BL-051 | #10 modularity boundary 개념 | G | D | |

### §5. project_design_spec_v4_residuals.md (8 items) — updatedAt: 2026-04-12

Design Spec v4 리뷰 후 CC 전건 해소, R 4건 별도 작업. CC 4건은 구현 완료 후 재확인 대상.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-052 | CC-1: invoke surface authority 정렬 (commands/design.md active authority seat + design_target binding) | E | B | 구현 완료 후 재확인 |
| BL-053 | CC-2: Build/Design/Learning graph closure (재진입 계약, promotion edge, owner-key 모델) | G | D | relation graph rule |
| BL-054 | CC-3: learning-rules.md 단일 소유 원칙 (processes/design.md 중복 서술 제거) | G | B | authority ownership rule |
| BL-055 | CC-4: §7 마지막 두 문장 중복 (adapter 표와 동일 내용 반복 제거) | E | B | spec cleanup |
| BL-056 | R-1: spec_schema 호환성 계약 (reader 분기, migration ownership, backward policy) | G | B | compatibility rule |
| BL-057 | R-2: design_gap 판정 절차 (등급 산정 + 사용자 질의 응답 규칙) | G | B | procedure rule |
| BL-058 | R-3: prompt-backed reference entrypoint 명시 (command/process/overview surface 실행 형태) | G | A | entrypoint surface rule |
| BL-059 | R-4: install-surface authority alignment (entrypoint invoke surface vs active installation truth) | G | A | alignment rule |

### §6. project_design_review_findings_backlog.md (4 items) — updatedAt: 2026-04-12

design 리뷰(20260410-e238c6de) 발견 결함 3건 + system-wide issue 1건.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-060 | #1 align CLI help rescan/redirect 불일치 (cli.ts:50 vs align.ts:29-33) | E | B | HIGH logic |
| BL-061 | #2 defer CLI 서브커맨드 미노출 (executeDefer 구현 있으나 CLI 도달 불가) | E | A | MEDIUM structure, CLI 노출 |
| BL-062 | #3 figma-mcp / generic mcp 소스 스켈레톤 (scan/grounding 비어있음) | D | B | coverage+evolution, 신규 구현 필요 |
| BL-063 | #4 project 학습이 promote 전 소비 (loader.ts + process.md teammate prompt drift risk) | G | B | system-wide, learning 소비 정책 rule |

### §7. project_lexicon_stage2_prep.md (1 unique item remaining after dedup) — updatedAt: 2026-04-12

Stage 3 잔여 5건 중 3건은 Principal Stage 3과 merge (§4). 1건(design.md 용어 정렬)은 verified DONE으로 excluded. 1건이 고유.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-064 | Stage 3-4: principal entity 승격 검토 (entrypoint와의 invokes relation) | G | D | principal 현재 term, entity 승격 결정 |

### §8. project_se_domain_review_followup.md (23 items) — [PRE-CUTOFF] origin 2026-03-30

SE 도메인 업그레이드 후 Stage 3 커버리지 확장 + Stage 4 확장 프로토콜 + 프로세스 개선.
**[PRE-CUTOFF]** origin 2026-03-30. 유효성 판단은 M-03에서.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-065 | R-1: competency_qs.md Boundary Condition CQ 추가 | E | B | HIGH, Stage 3, domain asset |
| BL-066 | R-2: logic_rules.md §Error Handling Logic 섹션 신설 | E | B | HIGH, Stage 3 |
| BL-067 | R-3: extension_cases.md 축소/퇴역 시나리오 2건 | E | B | HIGH, Stage 3 |
| BL-068 | R-4: concepts.md i18n/a11y 실체 추가 또는 적용 조건 명시 | E | B | HIGH, Stage 3 |
| BL-069 | R-5: domain_scope.md + competency_qs.md Requirements & Specification | E | B | MEDIUM, Stage 3 |
| BL-070 | R-6: domain_scope.md Maintenance 관심사 추가 | E | B | MEDIUM, Stage 3 |
| BL-071 | R-7: competency_qs.md Event/Messaging CQ 추가 | E | B | MEDIUM, Stage 3 |
| BL-072 | R-8: logic_rules.md Performance 규칙 보강 | E | B | MEDIUM, Stage 3 |
| BL-073 | R-9: competency_qs.md Generic Type Handling CQ (CQ-T09) | E | B | LOW, Stage 3 |
| BL-074 | R-10: competency_qs.md Constraint Propagation CQ | E | B | LOW, Stage 3 |
| BL-075 | R-11: concepts.md topic 주축 전환 + [L1]/[L2]/[L3] 태그 보존 | E | B | MEDIUM, Stage 4 |
| BL-076 | R-12: extension_cases.md 분류 축 "change trigger" 명시 | E | B | MEDIUM, Stage 4 |
| BL-077 | R-13: domain_scope.md Bias Detection "7" 리터럴 → 동적 참조 | E | B | MEDIUM, Stage 4 |
| BL-078 | R-14: domain_scope.md Sub-area 귀속 규칙 추가 | E | B | MEDIUM, Stage 4 |
| BL-079 | R-15: domain_scope.md 적용 가능성 마커 부여 기준 | E | B | LOW, Stage 4 |
| BL-080 | R-16: domain_scope.md 외부 표준 버전 참조 단일화 | E | B | LOW, Stage 4 |
| BL-081 | R-17: concepts.md "Module" 동음이의어 등록 | E | B | MEDIUM, Stage 4 |
| BL-082 | R-18: domain_scope.md "concern" 3개 분류축 관계 명시 | E | B | LOW, Stage 4 |
| BL-083 | R-19: competency_qs.md Sub-area × CQ 매핑 테이블 | E | B | LOW, Stage 4 |
| BL-084 | R-20: competency_qs.md CQ 코드 접두사 충돌 해소 | E | B | LOW, Stage 4 |
| BL-085 | P-1: 도메인 문서 확장 후 교차 참조 무결성 점검 단계 추가 | G | B | 프로세스 rule |
| BL-086 | P-2: Structural Inspection Checklist에 자기 참조 검증 3항목 추가 | G | B | 프로세스 rule (Self-review IA BL-091~094와 관련) |
| BL-087 | P-3: Stage 1↔2 영향 파일 겹침 사전 확인 절차 | G | B | 프로세스 rule |

---

## Source 2: memory (non-backlog file entries, 29 items)

### §9. project_harness_self_review.md (7 items) — updatedAt: 2026-04-12

IN PROGRESS. PR #20 OPEN. 재리뷰 BLOCKING 3건 + 4파일 self-review 18 IA (파일별 1 item으로 롤업).

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-088 | IA-1 BLOCKING: event_marker signal 의미 불일치 (retirement_candidates global vs panel_verdicts project) | E | C | PR #20 재리뷰, code fix |
| BL-089 | IA-2 BLOCKING: creation_gate detector dead code | E | C | PR #20 재리뷰, code cleanup |
| BL-090 | IA-3 BLOCKING: health-history.jsonl canonical 아님 | G | C | PR #20 재리뷰, canonicality decision |
| BL-091 | Self-review IA 수정: roles/logic.md (IA 4건) | G | A | Stage 2 → 3 이행, role contract |
| BL-092 | Self-review IA 수정: roles/axiology.md (IA 4건) | G | A | Stage 2 → 3 이행, role contract |
| BL-093 | Self-review IA 수정: roles/synthesize.md (IA 5건) | G | A | Stage 2 → 3 이행, role contract |
| BL-094 | Self-review IA 수정: processes/review/lens-prompt-contract.md (IA 4건) | G | A | Stage 2 → 3 이행, entrypoint contract |

### §10. project_build_coordinator_redesign.md (3 items) — updatedAt: 2026-04-12

Philosopher → Runtime + 9-lens + Axiology Adjudicator + Synthesize 4역할 분해 구현.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-095 | build.md 4역할 구조 반영 (9 Lenses + Runtime Coordinator + Axiology Adjudicator + Synthesize) | E | B | DESIGNED 2026-04-11 |
| BL-096 | Coordinator state machine에 awaiting_adjudication 상태 추가 | E | B | |
| BL-097 | Philosopher role build에서 제거 (review에서는 이미 분리됨) | E | B | |

### §11. project_business_domain_upgrade.md (6 compound items) — [PRE-CUTOFF] origin 2026-03-31

IN PROGRESS. 리서치 705K 완료, 실행 계약 5개 + Scale Tier 설계.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-098 | Scale Tier P0 수정 (방향 A: employee count 단일 축, Micro/Small/Mid/Large) | G | B | framework decision |
| BL-099 | 실행 계약 즉시 조치 8건 반영 | E | B | contract implementation |
| BL-100 | PO 판단 4건 (FI/RC 통합, T3/T4 분리, AB Min CQ, CQ Applicability 범위) | G | B | 주체자 판단 decisions |
| BL-101 | Wave 1-3 실행 (5개 파일 병렬 각 wave) | E | B | domain doc writing, compound N=3 |
| BL-102 | Gate 1 / Gate 2 (wave 간) | R | B | review checkpoint |
| BL-103 | 교차 참조 무결성 + 글로벌 동기화 + commit | E | B | cross-ref fix + sync |

### §12. project_agent_id_rename.md (6 phase items) — updatedAt: 2026-04-12 (origin 2026-04-07)

DESIGNED, 실행 대기. onto_ prefix 제거 → ~100 파일. Phase 0~5 strict sequence (C-8 대응: 순차 Phase 필요).

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-104 | Phase 0: Dual-read 구현 (learning loader + role loader + core-lens-registry reader) | E | B | 선행 조건, depends on nothing |
| BL-105 | Phase 1: Repo content 치환 (10쌍, ~50 파일) | E | B | depends on BL-104 |
| BL-106 | Phase 2: Repo file renames (roles/onto_*.md → roles/*.md × 10) | E | B | depends on BL-105 |
| BL-107 | Phase 3: Global data migration (~/.onto/ + ~/.onto/learnings/) | E | B | depends on BL-106, learn asset 이동 포함 |
| BL-108 | Phase 4: 3-layer verification | R | B | depends on BL-107 |
| BL-109 | Phase 5: Authority 갱신 (core-lexicon legacy_aliases + Charter §17 + BLUEPRINT lens ID) | G | D | depends on BL-108, authority 갱신 |

### §13. project_design_process_prototype.md (2 items) — updatedAt: 2026-04-12 (origin 2026-04-08)

v8 확정, 옵션 B 프로토타입 실행 대기.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-110 | 옵션 B 프로토타입 실행 (.onto/temp/design-command.md + design-process.md 작성 후 실제 설계 과제) | D | A | handoff: design-prototype-handoff.md, 새 command surface |
| BL-111 | R10 잔존 결함 4건 실제 발현 여부 검증 (§9.1/9.2 + 4건) | R | B | 프로토타입 이후 검증 |

### §14. project_next_domain_upgrade.md (4 items) — [PRE-CUTOFF] origin 2026-03-31

도메인 업그레이드 미착수 4건.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-112 | market-intelligence 도메인 업그레이드 (현 42K) | E | B | domain asset creation |
| BL-113 | accounting 도메인 업그레이드 (현 44K, accounting-kr 141K와 별도) | E | B | |
| BL-114 | finance 도메인 업그레이드 (현 46K) | E | B | |
| BL-115 | visual-design 도메인 업그레이드 (현 57K, ui-design과 쌍) | E | B | |

### §15. project_palantir_foundry_upgrade.md (1 item) — [PRE-CUTOFF] origin 2026-03-31

3차 완료. RESEARCH_NOTES §10/§15 일부 미반영.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-116 | RESEARCH_NOTES §10 분석가 보고서 수치 반영 여부 결정 (현재 의도적 미반영) | G | B | 4차 업그레이드 판정 필요 |

---

## Source 3: design (4 items)

### §16. 20260409-graphify-adoption-hypothesis.md (1 item) — updatedAt: 2026-04-09

v7 consolidated. graphify adoption evaluation 부분은 여전히 backlog hypothesis.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-117 | graphify adoption hypothesis build authority owner re-review + BT-E5/E6 split + Promotion gate + Phase 0 ARCH 6건 | R | B | v7 explicit backlog |

### §17. 20260330-optimization-4features.md (3 items, Feature 9 excluded per verified DONE) — [PRE-CUTOFF] origin 2026-03-30

Feature 9 IMPLEMENTED via project_agent_error_retry. Feature 1/14/15 구현 확인 불가 → backlog.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-118 | Feature 1: Adaptive Light Review (리뷰 복잡도 자동 판단, Step 1.5 Complexity Assessment) | D | B | impl 미확인, 신규 review 구조 |
| BL-119 | Feature 14: /onto:health (학습 건강도 대시보드) | G | A | 학습 건강도 정책 dashboard (CC-3 적용: learn 정책은 G) |
| BL-120 | Feature 15: Consumption Feedback Verification (실측 검증 계획) | G | C | 학습 소비 검증 정책 (CC-3 적용) |

---

## Source 4: pr (0 items)

`gh pr list --state open` (2026-04-13T10:35:00) → `[]`. Open PR 없음.

**M-03 시작 직전 재스캔** 권고 (pragmatics F6). merged PR은 explicit_exclusions의 evidence_ref로 참조됨(예: PR #12).

---

## Source 5: onto_direction (3 items) — §1 정본 직접 지시 항목

`development-records/design/20260413-onto-direction.md` 본문이 직접 지시한 backlog 항목.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-121 | `commands/ask-*.md` 명령군 처리 (review 계열로 이동 또는 제거) — §1.2 "폐기된 개념: ask" | E,G | A | 대상 10 파일: ask-{logic, structure, dependency, semantics, pragmatics, evolution, coverage, conciseness, axiology, philosopher}.md. **primary=E**: §1.2 ask 폐기 govern 결정은 이미 완료됨 → 본 BL은 그 결정의 **집행** (파일 이동/제거). **secondary=G**: govern 결정의 실행이라는 성격. DL-003 반영 |
| BL-122 | knowledge → principle 승격 경로 결정 — §1.2 "보류 중, 구체 기준은 향후 govern 개발 시 결정" | G | D | principle lifecycle, learning-promotion-to-principle 계약 설계 |
| BL-123 | 축 D 선행 확인 (lexicon provisional lifecycle 성문화 위치 + 인용 금지 검증 도구) — §1 "다음 작업 #2" | G | D | 축 D가 교차 원칙, 전 축 선행 |

---

## 요약

- **Total item count**: 123
- **Source 분포** (primary):
  - backlog_memory: 87 (70.7%)
  - memory: 29 (23.6%)
  - design: 4 (3.3%)
  - onto_direction: 3 (2.4%)
  - pr: 0 (0%)
- **Dedup events**: 3 (v1에서 유지)
- **Explicit exclusions**: 7 (v1의 3 + learn phase 4)
- **Decision Records applied**: DR-M00-01/02 not triggered; DR-M00-03/04/05 confirmed at v2

## Activity 분포 (primary, 합계 = 123)

| Activity | Count | 비중 |
|---|---|---|
| E (reconstruct) | 76 | 61.8% |
| G (govern) | 39 | 31.7% |
| D (design) | 4 | 3.3% |
| R (review) | 4 | 3.3% |
| L (learn) | 0 | 0% |
| **합계** | **123** | **100%** |

**V2 변경사항**:
- v1 R ~75 → v2 R 4: v1이 R로 분류한 build backlog(37건) + SE domain(23건)은 **process/regulative/domain doc 수정** 작업이며, §1.2 "review = product에 lens 검증" 정의에 맞지 않음. legacy 명칭 build = reconstruct(E)로 재분류 + domain doc 수정은 reconstruct(E), 프로세스 정책 추가는 govern(G)로 재분류.
- v1 E=0 → v2 E=76: build↔reconstruct homonym 매핑 후 build backlog 37건이 E로 편입. domain doc edits, code refactor 등도 E로.
- v1 L ~5 → v2 L=0: "학습 소비 정책" 항목들은 CC-3에 따라 learn(L) 대신 govern(G)로 재분류.
- v1 D ~15 → v2 D=4: 대부분 spec 개정은 design(신규 구조 창조)이 아니라 reconstruct. 신규 feature/구조만 D로.
- v1 G ~50 → v2 G=39: govern 범위를 lexicon 결정·principle 결정·rule 확정에 한정.

## Axis 분포 (primary, 합계 = 123)

| Axis | Count | 비중 |
|---|---|---|
| B (infrastructure) | 92 | 74.8% |
| D (lexicon/provisional) | 15 | 12.2% |
| A (entrypoint) | 12 | 9.8% |
| C (autonomy) | 4 | 3.3% |
| **합계** | **123** | **100%** |

**V2 변경사항**:
- v1 D ~35 → v2 D=15: axis D 정의를 "lexicon term/entity/relation 관리"에 한정 (DR-M00-05). schema/registry/namespace(BL-003 error code registry, BL-007 custom namespace, BL-032 fact_type enum 등)는 B로 재분류.
- v1 A ~8 → v2 A=12: role contract + CLI surface item을 명시적으로 A로 태깅.
- v1 C ~5 → v2 C=4: harness self-review 3건(BL-088~090) + Feature 15(BL-120) = 4. v1에서 C로 포함했던 /onto:health(BL-119)는 A primary(entrypoint surface)로 재분류.

## M-03 대비 사전 메모

- **축 C (autonomy) 4건**: §1.5 "C → A, B 1사이클 후" 원칙 유지. BL-118~120 + BL-088~090은 C의 착수 단계 소량 item
- **활동 E 우세 (76/123 = 61.8%)**: §1.2 reconstruct 활동이 backlog의 중심. build(legacy) + domain doc + code refactor 3대 축
- **활동 L (learn) 0건**: §1.2 learn 활동의 lifecycle 본체 ops는 현재 backlog에 없음 (Phase 1~3 모두 implemented/absorbed). 향후 "조직 차원 learning 관리" 방향(§1.2 learn의 향후 개발 범위)이 M-06에서 신규 도출될 가능성
- **Pre-cutoff items 30건 (24.4%)**: §8(23), §11(6), §14(4), §15(1), §17(3) 중 pre-cutoff 태그된 것. M-03에서 유효성 우선 판정 권고. P1/P2/P3 class 분할로 판정 부하 분산 권고 (axiology A-5)
- **Build backlog 37건 (§1+§2) cluster**: §2 (3차, 선행 권장) → §1 (8차) 순서로 처리 권고
- **Agent ID rename Phase 0→5 sequence (BL-104~109)**: strict 순차 실행 필요
- **BL-041 Authority/Lineage Compatibility Gate**: M-03 이전 승격 결정 권고 (axiology NP-1)
- **§1.4 측정 인프라 backlog 0건**: M-06에서 신규 도출 대상 (§1.0 점진성·지속성·기제 측정 지표 구현)

## 다음 단계 (M-01 이후)

1. **M-01 (다섯 활동 구현 상태 Inventory)** — Agent Teams 2 subagent 병렬:
   - 5 활동(review/design/reconstruct/learn/govern) 구현 상태 inventory
   - 산출물: `.onto/temp/m01-activity-inventory/{activity}.md`
2. **M-02 (축 B 기반 인프라 Inventory)** — 병렬:
   - 축 B 인프라 inventory (scope-runtime, readers, middleware 등)
   - 산출물: `.onto/temp/m02-infra-inventory/{component}.md`
3. **M-03 (Gap 분석 + Disposition 분류)** — 메인 세션:
   - 본 v2 consolidated list 각 entry에 대해 disposition (gap / already covered / n/a / deferred) + canonicality (canonical-advancing / supporting / scaffolding) 분류
   - gap 분류된 것이 M-06 work item seed
   - **MODERATE 4건 (C-4/6/7/8) + Conditional 3건 (CC-1/2/3)** 이 M-01~M-03 실행 중 반영됨

## 참조

- §1 정본: `development-records/design/20260413-onto-direction.md`
- Meta task list v5.1: `development-records/design/20260413-onto-todo-meta.md`
- QA v3: `development-records/plan/20260413-m00-preparation-qa.md`
- Decision records: `development-records/plan/20260413-m00-decisions.md`
- Execution log: `development-records/plan/20260413-execution-log.md`
- v1 review session: `.onto/review/20260413-30463d46/` (verdict: CONDITIONAL, v2에서 BLOCKING 2 + MAJOR 2 해소)
