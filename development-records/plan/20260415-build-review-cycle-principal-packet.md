---
as_of: 2026-04-15T02:00:00+09:00
status: approved
functional_area: principal-packet
purpose: build_review_cycle (W-A-11/12 kickoff + 36 sub-item) 실행 진입. line-by-line 검증 결과 16 + 2 kickoff = 18 W-ID done, 19 active, R-31 별도 처리, E-1 deferred 유지. 진행률 57 → 75/141 (53.2%) 예상.
author: Claude (세션 9)
decision_horizon: 주체자 A안 승인 (2026-04-15)
---

# build_review_cycle Principal 승인 Packet

## 1. 무엇을 결정받는가 (TL;DR)

주체자께 아래 3 결정을 요청합니다.

1. **Kickoff 승인** — W-A-11 (Phase 1 kickoff) + W-A-12 (Phase 2 kickoff) 를 active 로 진입시키는 승인.
2. **Scope 확정** — 36 sub-item 중 **11건은 이미 해소** (아래 §3.1), **25건이 실작업 scope** (§3.2). 해소 건은 seat 에서 `lifecycle_status=done` 으로 일괄 갱신하되 rewrite_trace 에 근거 기록.
3. **진입 순서** — Phase 1 (§2 build_3rd 잔여 16건) 을 Phase 2 (§1 build_8th 잔여 9건) 보다 선행. 근거는 §4.

---

## 2. 맥락: build_review_cycle 은 무엇인가

**대상**: `processes/reconstruct.md` (구 `processes/build.md`, W-A-77 rename 으로 2026-04-14 정렬). 1716 줄. onto 의 5 활동 중 `reconstruct` 계약 정본.

**build_review_cycle 의 역사**:
- 2026-04-12 PR #16 merge 이후 3차 9-lens 리뷰 발견 Critical 14 + R 8 → PR #17 `02e9834` 로 수정
- 그 후 8차 9-lens 리뷰 (PR #17 이 받은 8 cycles) 에서 새 잔여 발견 → PR #22 `afb11d3` 로 일부 수정
- 2026-04-13 M-06 에서 아직 처리되지 않은 잔여 항목을 BL-016~037 (3차 review) + BL-001~004 (8차 review) 로 ledger 등록 후 W-A-11~48 seat 로 확장

**현재 시점 (2026-04-15)**:
- PR #17 + PR #22 가 "즉시 해소 가능한" 항목을 먼저 처리
- M-06 seat 작성 시점 이후에도 W-A-50 (shared-phenomenon §7 reverse application), W-A-57 (lens-prompt-contract IA-2/3/4), W-A-77 (rename) 등이 merged 되면서 reconstruct.md 가 계속 개정됨
- 결과: M-06 당시 active 로 분류한 BL 일부가 이미 해소됨

---

## 3. Sanity Check 결과 (2026-04-15 실측)

Explore 에이전트로 36 sub-item 각각에 대해 `processes/reconstruct.md` 현재 상태와 cross-reference 한 결과.

### 3.1 이미 해소 — 11건 (seat → done 처리 후보)

**Phase 1 (5건)**:
| 항목 | W-ID | 해소 근거 |
|---|---|---|
| CB-3 | W-A-15 (BL-018) | `user_resolved` enum 이 reconstruct.md L790-792/L892-893 `conflict_decisions.resolution` 및 `issues.resolution` 에 모두 선언됨 |
| CB-4 | W-A-16 (BL-019) | Phase 3 Unresolved Conflicts 표 L1320-1323 에 `Priority` 컬럼 존재 |
| CB-5 | W-A-17 (BL-020) | module_inventory 3 맥락 (coverage denominator / Stage 1 uncovered / Round 0 meta) 이 각자 명확한 semantic 으로 구분되어 있음 (L301, L370, L580-584, L874-877) |
| CC-5 | W-A-24 (BL-027) | `added_in_stage: {1 \| 2}` 가 wip.yml schema L710/L933 에 선언됨 |
| R-35 | W-A-32 (BL-036) | Query Type Registry L190-196 에 3 query type 각자 input/output YAML schema 명시됨 |

**Phase 2 (6건)**:
| 항목 | W-ID | 해소 근거 |
|---|---|---|
| P-5 (MAJOR) | W-A-34 (BL-001) | 5 halt-code template 전수 추가 완료 (reconstruct.md L1531-1578): `config_malformed`, `phase_3_5_invariant_violation`, `phase_reentry_bound_exhausted`, `explorer_failure`, `runtime_coordinator_failure`, `session_state_corrupt` |
| C-1 (MODERATE) | W-A-35 (BL-002) | `session_state_corrupt` error code L1592 에 정의 + trigger 명시 |
| C-2 (MINOR) | W-A-40 (BL-008) | `custom:` + `x-*` namespace 예약 규칙 L687 명시 |
| S-4 (MINOR) | W-A-43 (BL-011) | phase3_user_responses + phase4_runtime_state atomic-clear invariant L912-914 명시 |
| P-4 Prag (MINOR) | W-A-46 (BL-013) | global_reply vs decisions 일관성 규칙 L899-901 에 명시 |
| E-F2 Evo (MINOR) | W-A-48 (BL-015) | Error code extensibility 정책 L1600 명시 ("Adding a new error code requires adding a row…") |

**합계**: 11건. M-06 seat 작성 시점 이후 PR #17 + PR #22 + W-A-50/57/77 merge 등으로 자연 해소.

### 3.2 여전히 유효 — 25건 (실작업 scope)

**Phase 1 잔여 16건**:

| 항목 | W-ID | 결함 요약 | 작업량 |
|---|---|---|---|
| CB-1 | W-A-13 | Tier 2 loop dispatch 경로 존재하나 prescriptive framework 부족 (lens 순서, retry logic) | 중 |
| CB-2 | W-A-14 | rationale-absent 전용 patch operation 부재. 현재는 일반 reclassify 로 포괄 | 중 |
| CB-6 | W-A-18 | ~~observation_aspect 고립~~ → 실측 결과 Phase 2/3 소비자 확인됨. **재분류 권고: done 후보로 이동** | 0 |
| CB-7 | W-A-19 | ~~stage1_uncovered_modules wip.yml schema 미선언~~ → 실측 결과 L877 선언 확인. **재분류 권고: done** | 0 |
| CC-1 | W-A-20 | Semantics lens 실패 시 graceful degradation 규칙 충돌 잔존 (L655 "No impact" vs L657 "full failure") | 소 |
| CC-2 | W-A-21 | ~~Phase 1 Adjudicator 실패 label conflict 경로 모호~~ → L1246 escalation 명시 확인. **재분류 권고: done** | 0 |
| CC-3 | W-A-22 | degradation_count "successful round" 정의 모호 (reset 시점 ambiguous) | 소 |
| CC-4 | W-A-23 | nullify operation trigger 부분 명세 (scope 는 명확, trigger 는 암시적) | 소 |
| CC-6 | W-A-25 | Coverage underexplored_assessment 입력 schema 에 threshold 전달 부재 (config 에만 존재) | 소 |
| CC-7 | W-A-26 | ~~unresolved_for_user persistence target 미명세~~ → L916-921 명시 확인. **재분류 권고: done** | 0 |
| R-29 | W-A-27 | Tier 1 tokenization 에 CJK/Unicode 규칙 없음 | 소 |
| R-30 | W-A-28 | convergence_status 에 semantic_matching_degraded flag 미존재 | 소 |
| R-31 | W-A-29 | fact_type enum 이 reconstruct.md 내부 embedded. Delta Format SSOT (authority/) 미이관 | 중 |
| R-32 | W-A-30 | Change Propagation Checklist 에 golden/schema + core-lexicon 포함 확인. config.yml 누락 | 소 |
| R-33 | W-A-31 | degradation threshold 2 하드코딩 (L362). config 파라미터화 안 됨 | 소 |
| R-34 | W-A-33 | Phase 0.5.4 Schema reconfirmation 명시적 protocol 없음 | 소 |
| R-36 | W-A-33 실제로 이건 W-A-32 | user-decline path 설계 결정 기록 없음 | 소 |

_(W-ID 매핑 확인 필요. Phase 1 은 W-A-13~33 이며 R-36 은 W-A-33 에 대응)_

**재분류 후 실작업 Phase 1 = 12건** (CB-6, CB-7, CC-2, CC-7 4건은 sanity check 결과 이미 해소 판정 → done).

**Phase 2 잔여 9건**:

| 항목 | W-ID | 결함 요약 | 작업량 |
|---|---|---|---|
| E-1 (MODERATE) | W-A-36 | Error code registry → authority/error-codes.yaml 이관. **이미 `lifecycle_status=deferred` (N≈20 scale trigger)** — 처리 불필요, 현 상태 유지 | 0 |
| L-4 (MINOR) | W-A-37 | adjudicator_failure phase L1594/L1595 에 phase_1 + phase_2 2 row 로 분리됨. **재분류 권고: done** | 0 |
| S-2 (MINOR) | W-A-38 | session-log single-writer 는 prose L1526 만 명시. schema-level 선언 부재 | 소 |
| D-1 (MINOR) | W-A-39 | session-log atomic append protocol L1527 prose 명시. 공식 계약 아님 | 소 |
| L-3 (MINOR) | W-A-41 | degradation_threshold_warning level 표 L1597 "warning" vs prose "user warning" 미세 불일치 | 소 |
| S-6 (MINOR) | W-A-44 | ~~phase3_user_responses absence = resumption trigger~~ → L1348 명시 확인. **재분류 권고: done** | 0 |
| S-1 Struct (MINOR) | W-A-45 | phase3_user_responses producer step 이 implicit (Phase 3 user interaction). 명시적 step 선언 부재 | 소 |
| E-F1 Evo (MINOR) | W-A-47 | phase3_user_responses extensibility path 명시 없음 | 소 |
| A-F2 (Axiology backlog) | 미확정 | output_language scope 결정 — Phase 3 rendering 엣지 케이스 | 소 |

**재분류 후 실작업 Phase 2 = 6건** (E-1 deferred 유지 + L-4, S-6 sanity 해소).

### 3.3 종합

| 분류 | 항목 수 |
|---|---|
| 36 sub-item 중 이미 해소 (seat → done) | **11 + 4 (sanity 재분류) = 15건** |
| Phase 2 deferred 유지 (E-1) | 1건 |
| **실작업 scope** | **20건** |

---

## 4. 진입 계획 (Principal 승인 시)

### 4.1 Phase 1 선행 근거

- **정본 기준 dependency**: W-A-12 `depends_on: [W-A-11]`. Phase 1 kickoff 가 선행되어야 Phase 2 기동 가능.
- **작업량 균형**: Phase 1 = 12건, Phase 2 = 6건. Phase 1 이 더 큰 덩어리 → 선행 처리로 Phase 2 재평가 시점 확보.
- **의존성**: R-31 (fact_type enum SSOT 이관) 이 authority/ 에 신규 파일 생성을 수반할 수 있음. Phase 2 의 S-1/E-F1 (phase3_user_responses schema 수정) 이 R-31 결과 (SSOT 패턴) 을 참조할 수 있음 → Phase 1 선행이 순서상 자연.

### 4.2 Phase 1 실행 sequence

1. **Seat 정리 PR** (선행, 1 commit):
   - 11 해소 + 4 재분류 = 15 W-ID seat `lifecycle_status=done` 갱신 + rewrite_trace 추가
   - 진행률 즉시 상승: 57/141 → 72/141 (51.1%)
   - Principal 에게는 sanity check 보고만 드리고 PR 승인 후 실행

2. **실작업 batch** (2~3 commit):
   - **Batch A — schema 보완 (5건, 1 commit)**: CB-2 (rationale-absent patch op), CC-3 (degradation_count 정의), CC-4 (nullify trigger), CC-6 (underexplored threshold input), R-30 (semantic_matching_degraded flag)
   - **Batch B — SSOT 이관 (1건, 1 commit)**: R-31 (fact_type enum → authority/fact-types.yaml or core-lexicon 흡수). scope 큼 → 독립 commit
   - **Batch C — 기타 명시화 (6건, 1 commit)**: CB-1 (Tier 2 dispatch 규칙), CC-1 (graceful degradation 규칙 정합), R-29 (CJK/Unicode), R-32 (config.yml propagation), R-33 (threshold config), R-34 (Phase 0.5.4 schema reconfirmation), R-36 (user-decline 결정 기록)

### 4.3 Phase 2 실행 sequence (Phase 1 merge 후)

- 단일 PR, 6건 일괄 처리: S-2, D-1, L-3, S-1 Struct, E-F1 Evo, A-F2.
- 전원 MINOR 수준, 1~2 줄 수정 위주.

### 4.4 검증 방법

- Phase 1: 각 item `verification_consumer=reviewer`. 실작업 commit 후 Principal 읽기 검증.
- R-31 은 scope 가 큰 예외. 별도 review cycle 1~2회 필요할 수 있음.

---

## 5. 위험 및 우려 (투명 기록)

1. **W-ID 재분류의 근거 강도**: sanity check 는 line-level grep + 맥락 해석에 의존. "already resolved" 판정 4건 (CB-6, CB-7, CC-2, CC-7, L-4, S-6) 은 주체자께서 직접 reconstruct.md 를 읽어 확인하시는 것이 안전.
2. **R-31 scope creep 가능성**: fact_type enum SSOT 이관은 authority/ 구조 변경을 수반. authority 1순위 파일 수정은 lexicon version bump + 기존 소비자 영향 분석 필요. 필요 시 별도 W-ID 로 분리 검토.
3. **Sanity check 자체의 한계**: Explore 에이전트가 "partial" 로 분류한 항목 (CC-1, R-32, S-2, D-1, L-3, A-F2) 은 실제 작업 시 scope 확장 가능성 있음. 작업 착수 후 추가 발견 → rewrite_trace 에 반영.

---

## 6. 주체자 결정 요청 (선택지)

**A. 본 계획 전체 승인** — §4 대로 진입 (Phase 1 selfish PR 먼저 + 실작업 Batch A/B/C, Phase 2 는 Phase 1 merge 후).

**B. Scope 조정** — 아래 중 골라 지시:
- B-1. 재분류 4건 (CB-6, CB-7, CC-2, CC-7, L-4, S-6) 중 특정 항목은 done 처리하지 말고 active 유지 (근거 불충분으로 판단 시)
- B-2. R-31 (fact_type SSOT 이관) 은 별도 W-ID 로 분리 → 본 cycle 에서 제외
- B-3. Phase 1 Batch A/B/C 분할 대신 단일 PR 로 통합 (혹은 더 세분화)

**C. 순서 변경** — Phase 2 를 Phase 1 보다 먼저 (소규모 6건 먼저 처리 후 Phase 1 본격 진입). 근거 없이는 비추천.

**D. 보류** — build_review_cycle 대신 business_domain_wave 또는 agent_id_rename 으로 진입 방향 전환.

---

## 7. 주체자 결정 결과 (2026-04-15)

**선택**: A안 전체 승인, 단 (1) 재분류 6건 line-by-line 검증 선행, (2) R-31 별도 처리.

**재분류 6건 line-by-line 검증 결과** — 전원 "해소 확실":

| 항목 | W-ID | 검증 근거 라인 | 판정 |
|---|---|---|---|
| CB-6 | W-A-18 | L403-406 (Explorer producer) + L976-983 (schema + 명시적 consumer 기재) + L1209-1210 (Phase 2 Step 2b consumer) + L1291-1296 (Phase 3 Observation Aspect Distribution 표) | 해소 확실 |
| CB-7 | W-A-19 | L877 (wip.yml meta schema 선언) + L745 (Runtime Coordinator producer at Stage transition) + L370 (Phase 3 Unexplored Areas consumer) | 해소 확실 |
| CC-2 | W-A-21 | L356 "Label conflicts ... continue to wait for Phase 2 Step 3 (not escalated early)" — Phase 3 직송 배제 명시 | 해소 확실 |
| CC-7 | W-A-26 | L915-924 전체 lifecycle (append/clear-on-resolve/carry/drop) + L882 (schema) + L1149-1172 (invariant) + L1257 (Phase 2 Step 4 merge) + L1500 (Phase 4 drop) | 해소 확실 |
| L-4 | W-A-37 | L1594 (phase_1 row) + L1595 (phase_2 row) — 2 row 분리로 cardinality 해소 | 해소 확실 |
| S-6 | W-A-43 | L1341 "absence of phase3_user_responses preserves the resumption-trigger semantics" + L1348 Runtime 동작 기재 | 해소 확실 |

**R-31 (fact_type SSOT) 검토 결과**:
- 현재 분포: `processes/reconstruct.md` L984 canonical + `BLUEPRINT.md` L414-422 duplicate (위계 역전 — rank 5 에 canonical, rank 4 에 duplicate)
- 권고: `authority/core-lexicon.yaml` 로 승급 (방향 1). 단 **별도 W-ID** 로 분리 (lexicon version bump + 독립 review cycle 필요)
- W-A-29 는 기존 active 유지, Phase 1 Batch 에서 제외, 별도 PR 로 처리

**세 축 결정**:

1. **Kickoff 승인**: W-A-11 + W-A-12 `active → done`
2. **Scope 확정**: 16 sub-item done (Phase 1 9 + Phase 2 7), R-31 (W-A-29) Phase 1 에서 분리 후 별도 PR, E-1 (W-A-36) deferred 유지
3. **진입 순서**: Phase 1 Batch A (schema 보완 5건) → Batch C (기타 명시화 6건 + `/onto:build` 잔존 치환) → Batch B (R-31 독립 PR) → Phase 2 (7건 일괄)

**진행률 예상 경로**:
- Seat 정리 commit: 57 → 75/141 (53.2%) [18 W-ID done: 2 kickoff + 9 Phase 1 + 7 Phase 2]
- Phase 1 Batch A: 75 → 80/141 (56.7%) [+5]
- Phase 1 Batch C: 80 → 86/141 (61.0%) [+6]
- R-31 독립: 86 → 87/141 (61.7%)
- Phase 2 batch: 87 → 94/141 (66.7%) [+7]

**부수 발견** (별도 W-ID 등록 후보):
- `processes/reconstruct.md` L1348 에 `/onto:build` 잔존 — W-A-77 rename 잔여. Batch C 에 일괄 치환 포함.

---

## 8. 참조

- 현재 정본 파일: `processes/reconstruct.md` (1716 줄)
- seat: `development-records/evolve/20260413-onto-todo.md` (W-A-11~48)
- 원 근거 (memory): `project_build_3rd_review_backlog.md`, `project_build_8th_review_backlog.md`
- 이전 수정 PR: #17 (`02e9834`), #22 (`afb11d3`)
- 세션 9 startup: `development-records/plan/20260415-execution-session9-startup.md`
