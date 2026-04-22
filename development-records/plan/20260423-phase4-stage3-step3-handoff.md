---
as_of: 2026-04-23
status: active
functional_area: phase-4-stage-3-step-3-session-entry
purpose: |
  Phase 4 Stage 3 Step 2 (PR #202) merge 후 다음 세션이 Step 3 (Hook γ
  Rationale Reviewer protocol 세부) 를 즉시 시작할 수 있도록 self-contained
  entry. Step 1 (PR #201) + Step 2 (PR #202) 결정을 전제로 Reviewer protocol
  mechanical spec 구체화.
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 9/9 clean pass)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인)"
  step_1_pr: "#201 (bae608e)"
  step_2_protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 9/9 clean pass)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (22 Q 승인)"
  step_2_pr: "#202 (d15a17d)"
  step_2_handoff_predecessor: "development-records/plan/20260423-phase4-stage3-step2-handoff.md (retired, Step 2 완결)"
  phase_4_handoff: "development-records/plan/20260419-phase4-handoff.md"
---

# Stage 3 Step 3 Handoff — Hook γ Rationale Reviewer Protocol

## 0. /clear 후 첫 명령

```
development-records/plan/20260423-phase4-stage3-step3-handoff.md 읽고 Phase 4 Stage 3 Step 3 시작
```

본 handoff 는 self-contained. 이전 세션 memory 는 optional reference.

## 1. 전제 상태 확인

Step 3 진입 전 다음 상태가 성립해야 함:
- [x] PR #201 (Step 1) main 에 merge 완료 (`bae608e`)
- [x] PR #202 (Step 2) main 에 merge 완료 (`d15a17d`)
- [x] Protocol r6 + decision 문서 main 에 존재:
  - `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md`
  - `development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md`
  - `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
  - `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md`

확인 명령:
```bash
git log --oneline origin/main -5 | grep -E "#201|#202"
ls development-records/evolve/20260423-phase4-stage3-step2-*
```

## 2. Step 3 scope — Hook γ Rationale Reviewer protocol 세부

### 2.1 Step 1 + Step 2 가 이미 확정한 것 (Step 3 가 전제로 하는 것)

**Step 1 (flow-review r7 + decision) 이 확정한 것**:
- Hook γ 의 **역할**: Phase 2 Step 2c 에서 fresh agent 로 dispatch. Rationale Proposer 결과 검증 + 수정 + Stage 2 신규 entity 의 rationale 보완
- **입력**: 전체 wip.yml (`intent_inference` 포함) + manifest + referenced_files content + `context_brief.system_purpose`
- **출력 directive 상위 구조**: `rationale_reviewer_directive.updates[]` + operation enum (`confirm / revise / mark_domain_scope_miss / mark_domain_pack_incomplete / add_for_stage2_entity`) + provenance (reviewed_at + reviewed_by + reviewer_contract_version)
- **sole-writer invariant**: Reviewer 는 wip.yml 직접 쓰기 금지. directive only
- **apply bridge**: Step 2c directive → Step 4a Synthesize aggregation → Step 4b Runtime atomic apply
- **`add_for_stage2_entity` 제약**: target_element_id 는 wip.yml 기존 entity 만
- **failure contract**: full failure + partial failure + degradation counter (`rationale_reviewer_failures_streak`)

**Step 2 가 확정한 것 (거울 참조 패턴)**:
- **Schema single authority** — protocol §3 가 authority, prompt/role 은 reference
- **Stage transition state machine** — `meta.stage_transition_state` 7 enum + retry_count pattern (단 Hook γ 는 Phase 2 Step 2c 단계이므로 다른 state machine)
- **Full failure only** — partial recovery 폐지, runtime 이 LLM 을 대리 생성하지 않음
- **LLM/runtime boundary** — non-semantic runtime 작업만, semantic clustering 금지
- **Agent prompt 패턴** — English-only, [Role/Input/Procedure/Provenance/Output Format/Language Policy/Rules] 구조, Axiology Adjudicator 동형
- **Role 파일 구조** — lens 가 아닌 fresh-agent role 명시

### 2.2 Step 3 가 상세화할 것

| 설계 항목 | 내용 |
|---|---|
| **Input schema 상세** | 전체 wip.yml 주입 방식 (full dump vs anonymized subset — lens anonymization 원칙 고려), manifest + referenced_files content, per-element intent_inference (가 이미 populate 된 상태), provenance 참조 |
| **Output directive schema 상세** | `updates[]` 의 operation 별 조건부 field validation rule. Reviewer 는 Proposer 와 달리 **모든 element 에 대해 update 를 emit 하지 않음** (선택적) — 이 변경 처리가 partial output 으로 해석되면 B1/B3 drift 가능성 주의 |
| **Prompt 실문자열 (English-only)** | Step 2 §4 template 을 mirror. Reviewer 의 역할 ("verify / revise / fill gaps") 과 Proposer 구별 명시 |
| **Role 파일 본문** | `.onto/roles/rationale-reviewer.md` 신규 — Step 2 의 rationale-proposer.md 본문을 거울 참조 |
| **Runtime integration** | Phase 2 Step 2c dispatch (Semantics / Coverage 와 parallel). Step 4a Synthesize aggregation 계약 세부 (`rationale_updates` field 구조). Step 4b Runtime apply 의 `add_for_stage2_entity` validation enforcement |
| **Failure handling** | Step 2 §7.1 패턴 (full failure + Principal response [r]/[v]/[a]) 을 Phase 2 단계로 adapt. Phase 2 Step 2c 에서의 failure 는 Hook α 의 Stage Transition 실패보다 덜 치명적 (ontology 이미 Stage 1+2 exploration 완료된 상태) — abort 옵션 semantic 이 다름 |

### 2.3 Step 3 가 다루지 않는 것 (Step 4 이연)

- Phase 3 throttling (Step 4) — Hook δ 책임
- Phase 3.5 write-back (Step 4) — Reviewer 출력은 Phase 2 Step 4 로 apply, Phase 3.5 와 무관
- raw.yml meta 확장 (Step 4) — Reviewer 는 wip.yml 만 대상
- `onto domain init` CLI (Step 4)

### 2.4 Step 2 와의 핵심 차이 (Step 3 에서 유의)

| 축 | Step 2 (Hook α) | Step 3 (Hook γ) |
|---|---|---|
| 시점 | Stage 1 → Stage 2 transition (1 회) | Phase 2 Step 2c (1 회, 2a/2b 와 parallel) |
| 입력 | Stage 1 확정 entity 목록 | **전체 wip.yml** (Stage 1+2 모두 끝난 상태) |
| 출력 완결성 | proposals.length == entity_list.length 강제 | **selective** — 모든 element 에 update 불필요 (변경이 필요한 element 만) |
| partial output 의미 | partial = full failure (Step 2 B1/B3) | partial = 정상 (업데이트 없는 element 는 암묵적 confirm) — **Step 2 와 정반대** 주의 |
| Operation kind | outcome enum (proposed/gap/domain_scope_miss/domain_pack_incomplete) | operation enum (confirm/revise/mark_domain_scope_miss/mark_domain_pack_incomplete/add_for_stage2_entity) |
| State transition 주체 | Stage transition state machine (Step 2) | Phase 2 Step 2 progress state (Step 3 에서 정의) |

**핵심 trap**: Step 2 의 "partial = failure" 원칙을 Step 3 에 기계적으로 복사하면 잘못. Reviewer 의 정상 행동이 partial output (대부분 element 는 confirm 만 하므로 directive 에 명시 안 함) 인데, 이를 failure 로 routing 하면 모든 정상 Reviewer 실행이 halt.

Step 3 에서는 "explicit confirm vs implicit confirm" 구별이 필요 — 예: directive 에 명시 안 된 element 는 implicit confirm 으로 해석. Step 1 의 `carry_forward` vs `principal_accepted` 구별과 동형.

### 2.5 예상 `/onto:review` cycle

- Step 2 는 6 rounds 수렴 (r1 5 BLOCKING → r6 clean pass)
- Step 3 는 **4~6 rounds** 예상 — Step 2 패턴 재사용 + "partial output 의미" 같은 step 3 특유 구조적 결정이 있어 r1~r3 에서 자리 잡는 데 시간 필요

## 3. 진입 단계

### 3.1 Branch + 초안

```bash
# PR #202 merge 후
git checkout main
git pull --ff-only origin main
git checkout -b docs/phase4-stage3-step3
```

초안 문서: `development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md`

초안 구조 (Step 2 protocol r6 패턴):
- §0 purpose + revision_history
- §1 Step 3 scope + Step 1/2 의존
- §2 Input schema 상세 (전체 wip.yml + manifest)
- §3 Output directive schema 상세 (operation enum + selective partial output 명시)
- §4 Prompt 실문자열 (English-only, Axiology Adjudicator 동형)
- §5 Role 파일 본문 (`.onto/roles/rationale-reviewer.md` 전문)
- §6 Runtime integration (Phase 2 Step 2c dispatch + Step 4a aggregation + Step 4b apply)
- §7 Failure handling (Step 2 §7.1 패턴 adapt + degradation counter)
- §8 §14.6 invariant 재확인
- §9 결정 표면 (Q-S3-1~N)
- §10 미해소 / backlog
- §11 본 문서의 위치

### 3.2 /onto:review 실행

```bash
ONTO_HOME=/Users/kangmin/cowork/onto-4 npm run review:invoke -- \
  development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md \
  "Stage 3 Step 3 — Rationale Reviewer protocol 세부 초안. Step 1 Q5 (Rationale Reviewer fresh agent) + Step 2 패턴 (schema single authority / state machine / full failure / LLM-runtime boundary) 거울 참조. selective partial output 원칙 (Step 2 와 정반대) 명시. Step 1/2 re-open 아님." \
  --no-domain --codex
```

**ONTO_HOME 주의**: PR #199 가 도입한 `ONTO_HOME` propagation 요구. workaround 로 env var 명시 (bug report: `development-records/bug-reports/20260423-onto-home-synthesize-halt.md`). transition 완료 여부 확인 필요.

### 3.3 결정 → PR

Step 2 와 동일 패턴:
- clean pass 도달
- decision 문서에 Principal 일괄 승인 기록
- commit + PR (제목: `docs(phase-4): Stage 3 Step 3 — Rationale Reviewer protocol (decision)`)

## 4. 참조 reading order

새 세션 시작 시 읽을 파일 (priority):

1. **본 handoff** (이 파일) — 진입 지점
2. **Step 2 protocol r6 §N 전체** — 거울 참조 대상 (prompt + role + runtime integration + failure handling)
3. **Step 1 flow-review r7 §7.3 (Hook γ Rationale Reviewer)** — Step 3 가 상세화할 baseline
4. **Step 1 flow-review r7 §7.4 (Hook γ apply-seat bridge)** — Step 2c → Step 4a → Step 4b bridge
5. **Step 1 flow-review r7 §7.5 (Hook γ failure/degradation)** — degradation counter
6. **Step 2 decision §4 + §7** — 구현 세션 주의사항 + 거울 참조 pattern
7. **reconstruct.md §1.0 + Phase 2 Step 2** — Semantics/Coverage lens dispatch 기존 패턴

## 5. 위험 + 주의사항

- **Step 2 패턴 기계적 복사 위험**: Step 2 의 "partial = full failure" 는 Hook α 특성 (모든 entity rationale 을 한번에 생성해야 함). Hook γ 는 "selective update" 가 정상 — 기계적 복사 금지. Step 3 에서 "implicit confirm" 의미 명시 필요 (§2.4 참조)
- **Phase 2 Step 2c 의 abort semantic**: Hook α 실패 시 [a] abort 는 "세션 종료" 이지만, Hook γ 실패 시 abort 는 "Phase 2 차단, Stage 2 이미 완료된 wip.yml 은 보존" — 복구 난이도 다름. failure handling 의 Principal UX 문구 다를 필요
- **add_for_stage2_entity 의 Explorer 경계**: Step 1 에서 "Reviewer 는 entity 생성 불가" 로 확정. 즉 `add_for_stage2_entity` 는 "Stage 2 Explorer 가 발견한 entity 의 intent_inference 를 Reviewer 가 추가 populate" 의미. 신규 entity 발견은 Explorer 책임. Step 3 prompt 에 이 경계 명시 필요
- **English-only language policy**: 기존 reconstruct.md agent prompt (Explorer / Lens / Adjudicator / Synthesize / Proposer) 모두 영어. Reviewer 도 동일
- **pack_missing_areas refinement**: Step 2 §6.3.1 은 runtime 이 non-semantic grouping 만. Reviewer 는 LLM-owned seat 이므로 semantic refinement 가능. Step 3 에서 Reviewer 의 pack_missing_areas 재작성 rule 을 정의 (or v1.1 이연)

## 6. Stage 3 전체 road map (Step 3 이후)

| Step | 내용 | 의존 |
|---|---|---|
| Step 1 | 차이 축 재정의 (16 Q 승인) | — |
| Step 2 | Hook α Rationale Proposer protocol (22 Q 승인) | Step 1 Q3, Q15 |
| **Step 3 (본 handoff 대상)** | Hook γ Rationale Reviewer protocol | Step 1 Q5/Q6/Q7, Step 2 |
| Step 4 | 통합 (Phase 3.5 write-back + raw.yml meta + invariant 10 + `onto domain init` CLI) | Step 1 전수 + Step 2/3 |
| **Stage 3 wrap-up** | 4 Step 누적 결정 single index | Step 4 |
| Track B 구현 세션 | W-A-80~ W-ID 부여, 코드/계약/role/manifest 실현 | Stage 3 wrap-up |

## 7. Step 1 + Step 2 의 구현 세션 전달 사항 (Step 3 이 상속)

본 handoff 는 Step 1 + Step 2 의 구현 세션 주의사항을 **상속** — Step 3 완료 후 구현 세션 진입 시 함께 반영:

1. **Step 1 §4.7 fallback_reason enum additive** — `proposer_failure_downgraded` 추가 (Q-S2-21)
2. **rationale-proposer.md role 파일 배치** — Step 2 protocol §5.1 본문 복사
3. **rationale-reviewer.md role 파일 배치** (Step 3 이후) — Step 3 protocol §5 본문 복사
4. **Prompt template agent invocation** — Step 2 protocol §4 + Step 3 protocol §4 template 을 runtime 이 agent spawn 시 제공
5. **wip.yml schema 확장 (Step 2 범위)** — intent_inference + meta.stage_transition_state + meta.stage_transition_retry_count + meta.pack_missing_areas + proposals[].__truncation_hint + provenance 전수

## 8. Lifecycle

- **Active**: Stage 3 Step 3 설계 완료 (PR merge) 시까지
- **Superseded**: Step 3 PR merge 시 "superseded by <PR>" 표기
- **Archive**: Stage 3 전체 wrap-up 시 reference 이동
