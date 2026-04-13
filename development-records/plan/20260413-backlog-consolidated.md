---
as_of: 2026-04-13T10:45:00+09:00
supersedes: null
status: active
functional_area: backlog-consolidation
revision: v1
item_count: 120
source_counts:
  memory: 29
  backlog_memory: 87
  design: 4
  pr: 0
dedup_events: 3
dedup_evidence:
  - basis: title + topic + scope match (≥90% similarity, structural reference)
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#4 review_record entity 승격 검토" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-3 review_record entity 승격 검토" }
    kept: "Principal Stage 3 #4 (detailed)"
    supersedes: "lexicon_stage2_prep.md Stage 3-3 (brief summary)"
    kept_because: "principal_stage3_backlog is the detailed canonical list; lexicon_stage2_prep.md Stage 3 is a parent index"
  - basis: title + topic + scope match (≥95%, identical item)
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#5 build/ask/learn/govern/design dispatch target relation" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-1 dispatch target relation" }
    kept: "Principal Stage 3 #5"
    supersedes: "lexicon_stage2_prep.md Stage 3-1"
    kept_because: "same item, principal_stage3 has richer context"
  - basis: title + topic + scope match (≥95%, identical item)
    duplicates:
      - { source: backlog_memory, path: project_principal_stage3_backlog.md, item: "#6 entrypoint별 process entity" }
      - { source: backlog_memory, path: project_lexicon_stage2_prep.md, item: "Stage 3-2 process entity" }
    kept: "Principal Stage 3 #6"
    supersedes: "lexicon_stage2_prep.md Stage 3-2"
    kept_because: "same item"
explicit_exclusions:
  - item: "lexicon_stage2_prep.md Stage 3-5 (processes/design.md 설계자 → 주체자)"
    reason: "likely DONE via PR #12 (repo-wide terminology normalization). M-03 verification required."
  - item: "optimization-4features.md Feature 9 (Agent Error Auto-Recovery)"
    reason: "IMPLEMENTED per project_agent_error_retry.md (2026-03-29 3단계 분류, 2회 재시도 프로토콜)"
  - item: "build_3rd_review_backlog.md 6 RESOLVED items (A-1, A-2, A-3, D-2, D-4, Line 997 dup)"
    reason: "이미 2차 커밋이 성공 해결 확인"
decision_records_applied:
  - id: DR-M00-01
    status: "not triggered (tie mtime escalation avoided via structural reference hierarchy)"
    note: "All 3 memory dedup pairs had same mtime 2026-04-12. Resolution used structural hierarchy (parent index vs detailed list) rather than timestamp, so escalation trigger was not fired."
  - id: DR-M00-02
    status: "not triggered (0 PRs → no PR vs authority conflict)"
---

# Backlog Consolidated (2026-04-13 initial)

본 문서는 M-00 (Planning·Backlog Source Consolidation) 결과물. §1 정본 확정 직후 첫 실행.

## 전체 구조

- **M-00 목적**: memory + open PR + design/ + backlog-specific memory의 backlog 항목을 단일 리스트로 통합
- **Inclusion criteria** (QA v3 A5 기준):
  1. §1 축 A/B/C/D 또는 5 활동 중 하나와 직접 관계
  2. 2026-04-01 이후 발생·유효 (pre-cutoff이어도 여전히 "유효" 상태면 포함. M-03에서 disposition으로 판정)
  3. Source: MEMORY.md entry / Open PR / `development-records/design/` / backlog 전용 memory
  4. 제외: 이미 merged / 완전 폐기 / 주체자 대화용 메모

- **M-03 예정**: 각 item disposition 4분류 (gap / already covered / n/a / deferred) + canonicality 3분류 (canonical-advancing / supporting / scaffolding)
- **M-06 예정**: gap 분류 → work item 변환

## Activity/Axis Tag 표기

- activity: {R=review, D=design, E=reconstruct, L=learn, G=govern} (복수 표기 허용)
- axis: {A=entrypoint, B=infrastructure, C=autonomy, D=lexicon/provisional}

---

## Source 1: backlog_memory (87 items)

### §1. project_build_8th_review_backlog.md (15 items) — updatedAt: 2026-04-12

Target: processes/build.md post-PR#17 잔여. fix/build-post-merge 브랜치로 일괄 처리 예정.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-001 | P-5 MAJOR: halt-message per-code template 5개 (phase_3_5, phase_reentry, explorer_failure, runtime_coordinator, session_state_corrupt) | R | B | |
| BL-002 | C-1 MODERATE: session_state_corrupt error code 신설 (wip.yml/deltas/session-log 손상 대응) | R | B | |
| BL-003 | E-1 future: Error code registry 확장성 (N≈20 시 authority/error-codes.yaml로 이관) | R | B,D | scale-trigger gated |
| BL-004 | L-4 MINOR: adjudicator_failure phase "phase_1 or phase_2" cardinality 위반 | R | B | |
| BL-005 | S-2 MINOR: session-log.yml single-writer declaration 명시 | R | B | |
| BL-006 | D-1 MINOR: session-log multi-writer 시 atomic append 계약 | R | B | |
| BL-007 | C-2 MINOR: custom:/x-* namespace 예약 (user config 확장) | R | B | |
| BL-008 | L-3 MINOR: degradation_threshold_warning level 불일치 | R | B | |
| BL-009 | S-4 MINOR: phase3_user_responses + phase4_runtime_state atomic-clear invariant | R | B | |
| BL-010 | S-6 MINOR: phase3_user_responses absence = resumption trigger 명시 | R | B | |
| BL-011 | S-1 Struct MINOR: phase3_user_responses producer step을 Phase 3 body에 추가 | R | B | |
| BL-012 | P-4 Prag MINOR: global_reply vs decisions 일관성 enforcement cross-ref | R | B | |
| BL-013 | E-F1/E-F2 Evo MINOR: phase3_user_responses 추가 필드 path + error code extensibility 정책 | R | B,D | |
| BL-014 | Axiology A-F2: output_language scope 결정 (build-only vs cross-command 공용) | R | B | |
| BL-015 | Axiology A-F1: degradation 연속 발생 시 session log diagnostic | R | B | |

### §2. project_build_3rd_review_backlog.md (22 items) — updatedAt: 2026-04-12

Target: processes/build.md (40411d3 기준). PR #16 merged → 별도 PR로 순차 처리 권장. 7 CB BLOCKING + 7 CC Critical + 8 R. RESOLVED 6건 별도 제외.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-016 | CB-1: Tier 2 loop dispatch 경로 미정의 (Round N loop에 team lead dispatch step 없음) | R | B | BLOCKING |
| BL-017 | CB-2: rationale-absent 재분류 patch operation 부재 (reclassification request 처리 operation 없음) | R | B | BLOCKING |
| BL-018 | CB-3: user_resolved enum 미정의 (Phase 3 custom resolution 기록에 conflict) | R | B | BLOCKING |
| BL-019 | CB-4: Phase 3 Unresolved Conflicts 표에 priority 필드 누락 | R | B | BLOCKING |
| BL-020 | CB-5: Stage 2 module_inventory 3중 정의 (L667, L336, L755) | R | B | BLOCKING |
| BL-021 | CB-6: observation_aspect 고립 (Explorer 생산만, 소비자 없음) | R | B | BLOCKING |
| BL-022 | CB-7: stage1_uncovered_modules 필드 wip.yml schema 미선언 | R | B | BLOCKING |
| BL-023 | CC-1: Semantics lens 실패 시 graceful degradation vs No-impact 규칙 충돌 | R | B | Critical |
| BL-024 | CC-2: Phase 1 Adjudicator 실패 시 label conflict 경로 모호 | R | B | Critical |
| BL-025 | CC-3: degradation_count "successful round" 정의 모호 | R | B | Critical |
| BL-026 | CC-4: nullify operation 트리거 미명세 | R | B | Critical |
| BL-027 | CC-5: added_in_stage 필드 schema 미선언 | R | B | Critical |
| BL-028 | CC-6: Coverage underexplored_assessment threshold 정보 부재 | R | B | Critical |
| BL-029 | CC-7: unresolved_for_user 라운드 간 persistence target 미명세 | R | B | Critical |
| BL-030 | R-29: Tier 1 tokenization CJK/Unicode 처리 규칙 명시 | R | B | Recommend |
| BL-031 | R-30: convergence_status에 semantic_matching_degraded flag 추가 | R | B | Recommend |
| BL-032 | R-31: fact_type enum을 Delta Format SSOT로 통합 (현재 6곳 분산) | R | B,D | Recommend |
| BL-033 | R-32: Change Propagation Checklist에 config.yml, golden/schema-*.yml, core-lexicon.yaml 추가 | R | B,D | Recommend |
| BL-034 | R-33: degradation threshold 2를 config로 파라미터화 | R | B | Recommend |
| BL-035 | R-34: Phase 0.5.4 Schema reconfirmation check 단계 명시 | R | B | Recommend |
| BL-036 | R-35: Query Type Registry 각 type에 input/output YAML 스키마 추가 | R | B | Recommend |
| BL-037 | R-36: user-decline path가 degradation threshold 외 체크포인트에서 필요한지 설계 결정 기록 | R | B | Recommend |

### §3. project_roles_refactor_v3_backlog.md (5 items) — updatedAt: 2026-04-12

Target: roles/*.md perspective-first refactor v3 baseline 후속. follow-up 진입 시 검토 권장.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-038 | BL-1 CONS-1: domain=none self-contained fallback (lens-prompt-contract.md §9.3 4요소 명시) | G,R | D,A | 7차 리뷰 deferred |
| BL-039 | BL-2 CC-1: contributor-time discoverability (symptom→lens 발견성) receiving seat 결정 | G,R | A,D | 7차 리뷰 deferred |
| BL-040 | BL-3 UF-1/UF-2: dependency/conciseness naming scope 과소 (rename or 정의 문구 추가) | G,R | D | 6차 deferred, 비용 대비 효용 불명확 |
| BL-041 | BL-4 Authority/Lineage Compatibility Gate (axiology proposal, 여러 리뷰 반복) | G | D | axiology standing lens 승격 미결 |
| BL-042 | BL-5 coverage-reported evidence/provenance gap (전담 lens 없음) | G,R | D | 5차 deferred |

### §4. project_principal_stage3_backlog.md (9 items) — updatedAt: 2026-04-12

Principal 용어 정렬 후 Stage 3 구조적 개선. 아키텍처 3건 + Lexicon 확장 6건.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-043 | #1 Runtime principal confirmation seat 도입 (design/command runtime authority) | G,R | B,D | DEFERRED TO PRODUCTION PHASE (v3 설계 완료) |
| BL-044 | #2 Structured diagnostic contract (design/commands/error-messages.ts 문자열 매칭 → diagnostic code) | D | B,D | Medium |
| BL-045 | #3 draft-packet.ts constraint source 일치 가드 (state.constraint_pool vs content.constraint_details) | D | B | Medium |
| BL-046 | #4 review_record entity 승격 검토 (term → entity, lifecycle 부여) | G | D | Merges lexicon_stage2_prep Stage 3-3 |
| BL-047 | #5 build/ask/learn/govern/design dispatch target relation 추가 (entrypoint instances) | G | D | Merges lexicon_stage2_prep Stage 3-1 |
| BL-048 | #6 각 entrypoint별 process entity 도입 가능성 (review_process 패턴 확장) | G | D | Merges lexicon_stage2_prep Stage 3-2 |
| BL-049 | #8 competency scope / competency questions 개념 (onto가 답할 수 있는 질문 경계 표현) | G | D | |
| BL-050 | #9 provenance concept (ontology 개념의 authorship/modification 추적) | G | D | |
| BL-051 | #10 modularity boundary 개념 (lexicon partition_trigger 연계) | G | D | |

### §5. project_design_spec_v4_residuals.md (8 items) — updatedAt: 2026-04-12

Design Spec v4 리뷰 후 CC 전건 해소, R 4건 별도 작업. CC 4건은 구현 완료 후 재확인 대상.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-052 | CC-1: invoke surface authority 정렬 (commands/design.md active authority seat + design_target binding) | D | B | 구현 완료 후 재확인 |
| BL-053 | CC-2: Build/Design/Learning graph closure (재진입 계약, promotion edge, owner-key 모델) | D,L | B,D | 구현 완료 후 재확인 |
| BL-054 | CC-3: learning-rules.md 단일 소유 원칙 (processes/design.md 중복 서술 제거) | L,D | B,D | 구현 완료 후 재확인 |
| BL-055 | CC-4: §7 마지막 두 문장 중복 (adapter 표와 동일 내용 반복 제거) | D | B | 구현 완료 후 재확인 |
| BL-056 | R-1: spec_schema 호환성 계약 (reader 분기, migration ownership, backward policy) | D | B,D | Recommend |
| BL-057 | R-2: design_gap 판정 절차 (등급 산정 + 사용자 질의 응답 규칙) | D | B | Recommend |
| BL-058 | R-3: prompt-backed reference entrypoint 명시 (command/process/overview surface 실행 형태) | D | A | Recommend |
| BL-059 | R-4: install-surface authority alignment (entrypoint invoke surface vs active installation truth) | D,G | A,D | Recommend |

### §6. project_design_review_findings_backlog.md (4 items) — updatedAt: 2026-04-12

design 리뷰(20260410-e238c6de) 발견 결함 3건 + system-wide issue 1건.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-060 | #1 align CLI help rescan/redirect 불일치 (cli.ts:50 vs align.ts:29-33) | D | B | HIGH logic |
| BL-061 | #2 defer CLI 서브커맨드 미노출 (executeDefer 구현 있으나 CLI 도달 불가) | D | B,A | MEDIUM structure |
| BL-062 | #3 figma-mcp / generic mcp 소스 스켈레톤 (scan/grounding 비어있음) | D | B | coverage+evolution |
| BL-063 | #4 project 학습이 promote 전 소비 (loader.ts + process.md teammate prompt drift risk) | L | B,D | system-wide |

### §7. project_lexicon_stage2_prep.md (1 unique item remaining after dedup) — updatedAt: 2026-04-12

Stage 3 잔여 5건 중 3건은 Principal Stage 3과 merge (§4). 1건(design.md 용어 정렬)은 excluded (likely DONE via PR #12). 1건이 고유.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-064 | Stage 3-4: principal entity 승격 검토 (entrypoint와의 invokes relation) | G | D | principal 현재 term |

### §8. project_se_domain_review_followup.md (23 items) — updatedAt: 2026-04-12 (but origin 2026-03-30, pre-cutoff)

SE 도메인 업그레이드 후 Stage 3 커버리지 확장 + Stage 4 확장 프로토콜 + 프로세스 개선.
**Pre-cutoff note**: origin 2026-03-30. 유효성 판단은 M-03에서. 현재 여전히 backlog 상태로 labelled.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-065 | R-1: competency_qs.md Boundary Condition CQ 추가 | R,G | B | HIGH, Stage 3 |
| BL-066 | R-2: logic_rules.md §Error Handling Logic 섹션 신설 | R,G | B | HIGH, Stage 3 |
| BL-067 | R-3: extension_cases.md 축소/퇴역 시나리오 2건 (Feature Removal, Service Decommissioning) | R,G | B | HIGH, Stage 3 |
| BL-068 | R-4: concepts.md i18n/a11y 실체 추가 또는 적용 조건 명시 | R,G | B | HIGH, Stage 3 |
| BL-069 | R-5: domain_scope.md + competency_qs.md Requirements & Specification 하위 영역 + CQ | R,G | B | MEDIUM, Stage 3 |
| BL-070 | R-6: domain_scope.md Maintenance 관심사 추가 | R,G | B | MEDIUM, Stage 3 |
| BL-071 | R-7: competency_qs.md Event/Messaging CQ 추가 | R,G | B | MEDIUM, Stage 3 |
| BL-072 | R-8: logic_rules.md Performance 규칙 보강 | R,G | B | MEDIUM, Stage 3 |
| BL-073 | R-9: competency_qs.md Generic Type Handling CQ (CQ-T09) | R,G | B | LOW, Stage 3 |
| BL-074 | R-10: competency_qs.md Constraint Propagation CQ | R,G | B | LOW, Stage 3 |
| BL-075 | R-11: concepts.md topic 주축 전환 + [L1]/[L2]/[L3] 태그 보존 | R,G | B | MEDIUM, Stage 4 |
| BL-076 | R-12: extension_cases.md 분류 축 "change trigger" 명시 선언 | R,G | B | MEDIUM, Stage 4 |
| BL-077 | R-13: domain_scope.md Bias Detection "7" 리터럴 → 동적 참조 | R,G | B | MEDIUM, Stage 4 |
| BL-078 | R-14: domain_scope.md Sub-area 귀속 규칙 추가 | R,G | B | MEDIUM, Stage 4 |
| BL-079 | R-15: domain_scope.md 적용 가능성 마커 부여 기준 명시 | R,G | B | LOW, Stage 4 |
| BL-080 | R-16: domain_scope.md 외부 표준 버전 참조 단일화 | R,G | B | LOW, Stage 4 |
| BL-081 | R-17: concepts.md "Module" 동음이의어 등록 | R,G | B | MEDIUM, Stage 4 |
| BL-082 | R-18: domain_scope.md "concern" 3개 분류축 관계 명시 | R,G | B | LOW, Stage 4 |
| BL-083 | R-19: competency_qs.md Sub-area × CQ 매핑 테이블 | R,G | B | LOW, Stage 4 |
| BL-084 | R-20: competency_qs.md CQ 코드 접두사 충돌 해소 (CQ-S⊃CQ-SC) | R,G | B | LOW, Stage 4 |
| BL-085 | P-1: 도메인 문서 확장 후 교차 참조 무결성 점검 단계 추가 | G | B | 프로세스 |
| BL-086 | P-2: Structural Inspection Checklist에 자기 참조 검증 3항목 추가 | G | B | 프로세스 |
| BL-087 | P-3: Stage 1↔2 영향 파일 겹침 사전 확인 절차 | G | B | 프로세스 |

---

## Source 2: memory (non-backlog file entries, 29 items)

### §9. project_harness_self_review.md (7 items) — updatedAt: 2026-04-12

IN PROGRESS. PR #20 OPEN. 재리뷰 BLOCKING 3건 + 4파일 self-review 18 IA (파일별 1 item으로 롤업).

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-088 | IA-1 BLOCKING: event_marker signal 의미 불일치 (retirement_candidates global vs panel_verdicts project) | G,R | C | PR #20 재리뷰 |
| BL-089 | IA-2 BLOCKING: creation_gate detector dead code (creation_gate_failures hardcode 0) | G | C | PR #20 재리뷰 |
| BL-090 | IA-3 BLOCKING: health-history.jsonl canonical 아님 (PromoteReport 중복 + silent swallowing) | G | C | PR #20 재리뷰 |
| BL-091 | Self-review IA 수정: roles/logic.md (IA 4건, 세션 ceeed5b7) | G | D | Stage 2 → 3 이행 |
| BL-092 | Self-review IA 수정: roles/axiology.md (IA 4건, 세션 4508e1b1) | G | D | Stage 2 → 3 이행 |
| BL-093 | Self-review IA 수정: roles/synthesize.md (IA 5건, 세션 c403113b) | G | D | Stage 2 → 3 이행 |
| BL-094 | Self-review IA 수정: processes/review/lens-prompt-contract.md (IA 4건, 세션 8829dc72) | G | D | Stage 2 → 3 이행 |

### §10. project_build_coordinator_redesign.md (3 items) — updatedAt: 2026-04-12

Philosopher → Runtime + 9-lens + Axiology Adjudicator + Synthesize 4역할 분해 구현.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-095 | build.md 4역할 구조 반영 (9 Lenses + Runtime Coordinator + Axiology Adjudicator + Synthesize) | R,G | B | DESIGNED 2026-04-11 |
| BL-096 | Coordinator state machine에 awaiting_adjudication 상태 추가 | R | B | |
| BL-097 | Philosopher role build에서 제거 (review에서는 이미 분리됨) | R,G | B | |

### §11. project_business_domain_upgrade.md (6 compound items) — updatedAt: 2026-04-12 (origin 2026-03-31, pre-cutoff)

IN PROGRESS. 리서치 705K 완료, 실행 계약 5개 + Scale Tier 설계. Pre-cutoff (2026-03-31) but IN PROGRESS = 유효.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-098 | Scale Tier P0 수정 (방향 A: employee count 단일 축, Micro/Small/Mid/Large) | R,G | B | HANDOFF.md 참조 |
| BL-099 | 실행 계약 즉시 조치 8건 반영 | R,G | B | |
| BL-100 | PO 판단 4건 (FI/RC 통합, T3/T4 분리, AB Min CQ, CQ Applicability 범위) | R,G | B | 주체자 판단 필요 |
| BL-101 | Wave 1-3 실행 (5개 파일 병렬 각 wave) | R,G | B | |
| BL-102 | Gate 1 / Gate 2 (wave 간) | R,G | B | |
| BL-103 | 교차 참조 무결성 + 글로벌 동기화 + commit | R,G | B | |

### §12. project_agent_id_rename.md (6 phase items) — updatedAt: 2026-04-12 (origin 2026-04-07)

DESIGNED, 실행 대기. onto_ prefix 제거 → ~100 파일. Phase 0~5.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-104 | Phase 0: Dual-read 구현 (learning loader + role loader + core-lens-registry reader) | G | B,D | 선행 조건 |
| BL-105 | Phase 1: Repo content 치환 (10쌍, ~50 파일) | G | B,D | |
| BL-106 | Phase 2: Repo file renames (roles/onto_*.md → roles/*.md × 10) | G | B,D | |
| BL-107 | Phase 3: Global data migration (~/.onto/ + ~/.onto/learnings/) | G,L | B,D | |
| BL-108 | Phase 4: 3-layer verification (active-clean / legacy-allowlist / external-readback) | G,R | B | |
| BL-109 | Phase 5: Authority 갱신 (core-lexicon legacy_aliases + Charter §17 + BLUEPRINT lens ID) | G | D | |

### §13. project_design_process_prototype.md (2 items) — updatedAt: 2026-04-12 (origin 2026-04-08)

v8 확정, 옵션 B 프로토타입 실행 대기.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-110 | 옵션 B 프로토타입 실행 (.onto/temp/design-command.md + design-process.md 작성 후 실제 설계 과제) | D | A,B | handoff: design-prototype-handoff.md |
| BL-111 | R10 잔존 결함 4건 실제 발현 여부 검증 (§9.1/9.2 + 4건) | D | B | 프로토타입 이후 |

### §14. project_next_domain_upgrade.md (4 items) — updatedAt: 2026-04-12 (origin 2026-03-31)

Pre-cutoff. 도메인 업그레이드 미착수 4건. M-03에서 유효성 판정.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-112 | market-intelligence 도메인 업그레이드 (현 42K) | G | B | pre-cutoff, 우선순위 판정 필요 |
| BL-113 | accounting 도메인 업그레이드 (현 44K, accounting-kr 141K와 별도) | G | B | pre-cutoff |
| BL-114 | finance 도메인 업그레이드 (현 46K) | G | B | pre-cutoff |
| BL-115 | visual-design 도메인 업그레이드 (현 57K, ui-design과 쌍) | G | B | pre-cutoff |

### §15. project_palantir_foundry_upgrade.md (1 item) — updatedAt: 2026-04-12 (origin 2026-03-31)

3차 완료. RESEARCH_NOTES §10/§15 일부 미반영, 기존 Bias Detection 중복.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-116 | RESEARCH_NOTES §10 분석가 보고서 수치 반영 여부 결정 (현재 의도적 미반영) | G | B | 4차 업그레이드 판정 필요 |

---

## Source 3: design (4 items)

### §16. 20260409-graphify-adoption-hypothesis.md (1 item) — updatedAt: 2026-04-09

v7 consolidated. graphify adoption evaluation 부분은 여전히 backlog hypothesis (build authority owner re-review 필요).

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-117 | graphify adoption hypothesis build authority owner re-review + BT-E5/E6 split + Promotion gate 메커니즘 + Phase 0 ARCH 6건 진행 | R,D | B | v7 explicit backlog |

### §17. 20260330-optimization-4features.md (3 items, Feature 9 excluded) — updatedAt: 2026-03-30 (pre-cutoff)

5차 리뷰 승인 완료, Feature 9 IMPLEMENTED via project_agent_error_retry. Feature 1/14/15 구현 확인 불가 → backlog.

| ID | Summary | Activity | Axis | Notes |
|---|---|---|---|---|
| BL-118 | Feature 1: Adaptive Light Review (리뷰 복잡도 자동 판단, Step 1.5 Complexity Assessment) | R | B | pre-cutoff, impl 미확인 |
| BL-119 | Feature 14: /onto:health (학습 건강도 대시보드) | L,G | A,C | pre-cutoff, impl 미확인 |
| BL-120 | Feature 15: Consumption Feedback Verification (실측 검증 계획) | L,G | C | pre-cutoff, impl 미확인 |

---

## Source 4: pr (0 items)

`gh pr list --state open` → `[]`. Open PR 없음.

---

## 요약

- **Total item count**: 120
- **Source 분포**:
  - backlog_memory: 87 (72.5%)
  - memory: 29 (24.2%)
  - design: 4 (3.3%)
  - pr: 0 (0%)
- **Dedup events**: 3 (principal_stage3 ↔ lexicon_stage2_prep 구조적 중복)
- **Explicit exclusions**: 3 categories (resolved items + implemented feature + likely-done terminology work)
- **Decision Records applied**: DR-M00-01 not triggered (구조적 hierarchy로 해결), DR-M00-02 not triggered (0 PRs)

## Activity 분포 (복수 귀속 포함, 집계는 primary activity 기준)

| Activity | Count | Notes |
|---|---|---|
| R (review) | ~75 | build backlog 가장 큼 (build_8th + build_3rd = 37) |
| G (govern) | ~50 | principal stage 3 + roles refactor + lexicon + agent id rename |
| D (design) | ~15 | design spec v4 + design review findings + design prototype |
| L (learn) | ~5 | learning 관련 cross-cutting |
| E (reconstruct) | 0 | §1.2 신설된 활동, 기존 backlog에 직접 귀속 없음 |

Note: E (reconstruct)가 0건. §1 redesign 후 신설된 활동이므로 현재 backlog에 없고 향후 M-06 work item에서 신규 생성 대상.

## Axis 분포 (복수 귀속 포함, primary 기준)

| Axis | Count | Notes |
|---|---|---|
| B (infrastructure) | ~90 | 압도적. build/review infrastructure + domain docs + code runtime |
| D (lexicon/provisional) | ~35 | principal stage 3 + roles refactor + agent id rename + canonicality 관련 |
| A (entrypoint) | ~8 | design CLI 관련 + roles entrypoint discoverability |
| C (autonomy) | ~5 | harness self-review + optimization Features 14/15 |

## 다음 단계 (M-01 이후)

1. **M-01** (Agent Teams 2 subagent 병렬, 메인 세션은 oversight):
   - 5 활동(review/design/reconstruct/learn/govern) 구현 상태 inventory
   - 산출물: `.onto/temp/m01-activity-inventory/{activity}.md`
2. **M-02** (병렬):
   - 축 B 인프라 inventory (scope-runtime, readers, middleware 등)
   - 산출물: `.onto/temp/m02-infra-inventory/{component}.md`
3. **M-03** (메인 세션):
   - 본 consolidated list 각 entry에 대해 disposition (gap / already covered / n/a / deferred) + canonicality (canonical-advancing / supporting / scaffolding) 분류
   - gap 분류된 것이 M-06 work item seed

## M-03 대비 사전 메모

- 축 C (autonomy) 극소 → §1.5 "C → A, B 1사이클 후" 원칙으로 이번 사이클에서는 소량 착수 아이템만
- 활동 E (reconstruct) 0건 → M-06에서 reconstruct 활동 신규 work item 도출 필요
- Pre-cutoff items (SE domain + business domain + domain upgrades + optimization features): 유효성 판정 후 defer/include 분류
- Build backlog 비대 (37/120 = 31%): build.md 관련 일괄 처리 cluster 가능성
