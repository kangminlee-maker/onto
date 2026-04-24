---
as_of: 2026-04-24
status: active
functional_area: phase-4-stage-3-step-4-session-entry
purpose: |
  Phase 4 Stage 3 Step 3 (PR #208) merge 후 다음 세션이 Step 4 (통합 —
  Hook δ + Phase 3.5 write-back + raw.yml meta + `onto domain init` CLI
  + Step 2 amendment 3 action 실 edit) 를 즉시 시작할 수 있도록 self-
  contained entry. Step 1/2/3 결정을 전제로 Step 4 통합 spec 구체화.
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 9/9 clean pass)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인)"
  step_1_pr: "#201 (bae608e)"
  step_2_protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 9/9 clean pass)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (22 Q 승인)"
  step_2_pr: "#202 (d15a17d)"
  step_3_protocol: "development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md (r6, 9/9 clean pass)"
  step_3_decision: "development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md (22 Q-S3 + 2 P-DEC 승인)"
  step_3_pr: "#208 (5201c22)"
  step_3_handoff_predecessor: "development-records/plan/20260423-phase4-stage3-step3-handoff.md (retired, Step 3 완결)"
  phase_4_handoff: "development-records/plan/20260419-phase4-handoff.md"
---

# Stage 3 Step 4 Handoff — 통합 (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment)

## 0. /clear 후 첫 명령

```
development-records/plan/20260424-phase4-stage3-step4-handoff.md 읽고 Phase 4 Stage 3 Step 4 시작
```

본 handoff 는 self-contained. 이전 세션 memory 는 optional reference.

## 1. 전제 상태 확인

Step 4 진입 전 다음 상태가 성립해야 함:
- [x] PR #201 (Step 1) main 에 merge 완료 (`bae608e`)
- [x] PR #202 (Step 2) main 에 merge 완료 (`d15a17d`)
- [x] PR #208 (Step 3) main 에 merge 완료 (`5201c22`)
- [x] Protocol r6 + decision 문서 main 에 존재:
  - `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md`
  - `development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md`
  - `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
  - `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md`
  - `development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md`
  - `development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md`

확인 명령:
```bash
git log --oneline origin/main -10 | grep -E "#201|#202|#203|#208"
ls development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md
```

## 2. Step 4 scope — 4 영역 통합 + Step 2 amendment

### 2.1 Step 1 + Step 2 + Step 3 가 이미 확정한 것 (Step 4 가 전제로 하는 것)

**Step 1 이 확정한 것**:
- 5 source state (`reviewed` / `proposed` / `gap` / `domain_pack_incomplete` / `domain_scope_miss`) lifecycle (§4.2)
- §7.6 Phase 3 Principal 검증 표면 column 구조 (rationale 컬럼, rationale_state 별 표시)
- §7.7 Phase 3 evidence surface — exhaustive 원칙
- §7.8 Phase 3 throttling 기본 config (max_individual_items / grouping_threshold / group_summary_sample_count)
- §7.9 Principal action → terminal state 매핑 5 테이블 (§7.9.1~§7.9.6, Step 4 가 canonical 구체화)

**Step 2 이 확정한 것** (r6 decision):
- Hook α Proposer protocol (input / output / prompt / role / runtime / failure)
- Stage transition state machine (`meta.stage_transition_state` 7 enum)
- Proposer directive apply bridge (Stage transition 내부 step 5a~5d)
- **Step 3 PR #208 에 의한 amendment 명세** (P-DEC-A1): Step 2 protocol §6.3 + §3.4 + §6.3.1 3 지점의 additive patch — **Step 4 Track B 구현 세션에서 실 edit 예정** (본 Step 4 설계 세션의 주요 deliverable 중 하나)

**Step 3 이 확정한 것** (r6 decision):
- Hook γ Reviewer protocol (input / output / prompt / role / Phase 2 Step 2c runtime / failure)
- Phase 2 Step 2c progress state machine (`meta.step2c_review_state` 7 enum)
- Reviewer directive apply bridge (Step 2c → Step 4a → Step 4b)
- Element-level `intent_inference.provenance` schema (§3.7.2) — `gate_count` 포함
- Triple-read contract (§7.2): `(reviewed_at, rationale_review_degraded, rationale_state)` minimum-sufficient disambiguation set
- Step 4 read contract pair list (§10.1):
  - `gate_count` → Phase 3 rendering single-gate 2 case 별 badge
  - `rationale_review_degraded: true` → proposed element 전수 Principal queue
  - triple-read contract → Phase 3 render decision minimum-sufficient set
- [d] Continue with degraded 의 Principal burden trade-off (onto-direction §1.0 axis)

### 2.2 Step 4 가 상세화할 것

Step 4 는 **4 영역 통합 + 1 amendment**:

| 영역 | 내용 | 근거 |
|---|---|---|
| **Hook δ (Phase 3 throttling + rendering)** | Step 1 §7.6~§7.8 의 rendering 알고리즘 + config + evidence exhaustive 원칙의 mechanical 구체화. rationale-queue.yaml artifact 포맷. `(reviewed_at, rationale_review_degraded, rationale_state)` triple-read 를 Phase 3 row-level render decision 에 적용 | Step 1 §7.6~§7.8 + Step 3 §10.1 Step 4 read contract |
| **Phase 3.5 write-back** | Principal action → terminal state 매핑 §7.9 전수. 5 source state × action mapping matrix. `principal_*` field population. Hook δ 에서 수집한 action 을 wip.yml 에 apply. Runtime Coordinator 가 sole-writer (LLM 불개입) | Step 1 §7.9.1~§7.9.6 |
| **raw.yml meta 확장** | `inference_mode` (full/degraded/none) + `degraded_reason` (pack_optional_missing / pack_quality_floor / pack_tier_minimal) + `fallback_reason` (user_flag / principal_confirmed_no_domain / proposer_failure_downgraded) + `rationale_review_degraded` + `rationale_reviewer_failures_streak` + `gate_count`. Provenance full persistence (wip_snapshot_hash + domain_files_content_hash + hash_algorithm 포함) | Step 1 §4.7 + Step 3 §10.1 |
| **`onto domain init` CLI contract** | manifest.yaml 자동 생성 + quality_tier 선언 + `--v0-only` flag 의미 + manifest_schema_version 호환성 체크. Step 1 §6.4 의 B2 producer 분리 결정 구체화 | Step 1 §6.4 |
| **Step 2 amendment 3 action 실 edit** | Step 3 decision §8.1 의 명세에 따라 Step 2 protocol 파일의 3 지점 patch 실 edit. Q-S2-21 선례 동형 — Track B 구현 세션 범위이나 본 Step 4 설계와 coherent patch 로 묶임 | Step 3 decision P-DEC-A1 |

### 2.3 Step 4 가 다루지 않는 것 (Track B 구현 세션 이연)

- 실제 runtime code 편집 (src/core-runtime/**)
- `.onto/processes/reconstruct.md` 실 수정
- role 파일 (`.onto/roles/rationale-proposer.md`, `.onto/roles/rationale-reviewer.md`) 실 배치
- W-ID (W-A-80~) 부여 — Stage 3 wrap-up 에서 수행
- Track B 구현 세션에서 4 Hook 전수 + Step 2 amendment 를 single coherent commit 으로 묶기

### 2.4 Step 3 와의 핵심 차이 (Step 4 에서 반드시 유의)

| 축 | Step 3 (Hook γ) | Step 4 (4 통합) |
|---|---|---|
| 대상 | 단일 Hook protocol (Reviewer) | **4 영역 통합** (Hook δ + Phase 3.5 + raw.yml + CLI) + Step 2 amendment |
| Artifact | `.onto/roles/rationale-reviewer.md` 1 개 role 파일 + `reconstruct.md` Phase 2 Step 2c | `reconstruct.md` Phase 3 / Phase 3.5 / Phase 4 + `raw.yml` schema + `.onto/commands/domain-init.md` (또는 유사 CLI 계약 파일) + Step 2 protocol patch |
| SSOT 압력 | 단일 seat (§3.1.1 / §3.1.2 / §3.7.2) 를 신설해 pointer 통일 가능 | **multiple seats** — Phase 3 rendering / Phase 3.5 apply / raw.yml meta 가 서로 다른 artifact. cross-artifact mirror marker 강제 필수 |
| 결정 표면 수 | 22 Q-S3 (r1 8 + r2 12 + r2 신규 2) | 예상 30~40 Q-S4 (4 영역 × 평균 8~10 결정) |
| 예상 rounds | 6 (BLOCKING 1 → clean) | **6~8** (대형 통합 문서, 초기 drift 가 multiple sinks 에 분산) |

**핵심 trap 1 (Step 3 경험 적용)**: §3.1.1 / §3.1.2 / §3.7.2 canonical seat 신설 패턴은 Step 4 에서도 유효. 특히 Phase 3.5 의 5 source state × action matrix 는 **single authority table** 로 배치, 각 source state 섹션은 pointer. Step 2 의 r4 UF-CONC-02 (revision_history 이중화 해소) 와 Step 3 의 §3.1.1 pointer collapse 패턴 mirror.

**핵심 trap 2**: Step 1 §7.9 의 5 테이블 (§7.9.1~§7.9.6) 은 source state 별로 나뉘어 있지만 Step 4 canonical 은 **action-first matrix** 또는 **state-first matrix** 중 하나를 single authority 로 선언 필요. 두 view 가 동시에 존재하면 drift 원천.

**핵심 trap 3 (Step 3 empirical)**: raw.yml meta 확장은 Step 1 + Step 2 + Step 3 에 걸쳐 조금씩 field 를 예약해놓은 상태. Step 4 에서 전수 통합 시 **field 간 의존 관계** (inference_mode + degraded_reason + fallback_reason + rationale_review_degraded 의 mutual exclusion / co-occurrence) 가 canonical table 로 필요.

**핵심 trap 4 (Step 2 amendment — Q-S2-21 선례)**: Step 2 amendment 3 action 은 Step 3 decision 에 명세만 있고 실 edit 없음. Step 4 세션에서 edit 시점에 Step 2 decision 문서도 amendment note 를 revision_history 에 추가 필요. Step 2 Q 재논의 아님.

### 2.5 예상 `/onto:review` cycle

- Step 2 / Step 3 는 6 rounds 수렴
- Step 4 는 **6~8 rounds** 예상 — 대형 통합 문서로 초기 drift 가 multiple sinks 에 분산, 구조 재편 round (r2 or r3) 에서 canonical matrix 확정 후 cleanup rounds 에서 수렴
- Claude deliberation 권장 round: r2 (구조 재편 확정), 나머지는 codex

## 3. 진입 단계

### 3.1 Branch + 초안

```bash
# PR #208 merge 후
git checkout main
git pull --ff-only origin main
git checkout -b docs/phase4-stage3-step4
```

초안 문서: `development-records/evolve/20260424-phase4-stage3-step4-integration.md`

초안 구조 (Step 3 protocol r6 패턴 mirror + 4 영역 통합 적응):
- §0 purpose + revision_history
- §1 Step 4 scope + Step 1/2/3 의존
- §2 **Hook δ (Phase 3 throttling + rendering)** — input (wip.yml elements + meta + config), output (rationale-queue.yaml + Phase 3 table), algorithm (priority score + throttling + individual vs group), evidence exhaustive (§7.7 mirror)
- §3 **Phase 3.5 write-back** — Principal action → terminal state canonical matrix (single authority), runtime apply rule per source state
- §4 **raw.yml meta 확장** — canonical schema (inference_mode + degraded_reason + fallback_reason + rationale_review_degraded + rationale_reviewer_failures_streak + gate_count), mutual exclusion / co-occurrence table, provenance persistence
- §5 **`onto domain init` CLI contract** — manifest 자동 생성 algorithm, quality_tier 선언 UI, --v0-only flag semantic, manifest_schema_version 호환성 rule
- §6 **Step 2 amendment 3 action 실 edit** (P-DEC-A1) — Step 2 §6.3 gate_count write + §3.4 empty enum + §6.3.1 문장 수정. Step 2 decision 의 revision_history 에 amendment note 추가
- §7 Stage 3 wrap-up input — 4 Step 누적 결정 index (Stage 3 wrap-up 에서 실 작성)
- §8 §14.6 invariant 재확인 — raw.yml 확장이 dogfood SDK-like invariant 유지하는지
- §9 결정 표면 (Q-S4-1~N) — 예상 30~40 점
- §10 미해소 / backlog
- §11 본 문서의 위치

### 3.2 /onto:review 실행

```bash
ONTO_HOME=/Users/kangmin/cowork/onto-4 npm run review:invoke -- \
  development-records/evolve/20260424-phase4-stage3-step4-integration.md \
  "Stage 3 Step 4 — 4 영역 통합 초안 (Hook δ + Phase 3.5 write-back + raw.yml meta 확장 + onto domain init CLI + Step 2 amendment 3 action 실 edit). Step 1 §7.6~§7.9 + Step 3 §10.1 Step 4 read contract pair 거울 참조. Step 1/2/3 re-open 아님." \
  --no-domain --codex
```

**Review path 권장 (Step 3 empirical 기반)**:
- r1: codex (초안 빠른 drift surface)
- r2: **Claude cc-teams-lens-agent-deliberation 2 rounds** (구조 재편 round — 4 영역 cross-sink drift 탐지)
- r3~: codex (cleanup 수렴)

### 3.3 결정 → PR

Step 3 와 동일 패턴:
- clean pass 도달
- decision 문서에 Principal 일괄 승인 기록
- commit + PR (제목: `docs(phase-4): Stage 3 Step 4 — Integration (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment)`)
- Step 2 amendment 3 action 실 edit 을 **동일 PR 에 별도 commit** 으로 포함 (P-DEC-A1 원래 의도 — single coherent patch)

## 4. 참조 reading order

새 세션 시작 시 읽을 파일 (priority):

1. **본 handoff** (이 파일) — 진입 지점
2. **Step 3 protocol r6 §10.1 전체** — Step 4 read contract pair + Step 2 amendment 3 action 명세 + mirror marker enforcement (Step 4 가 honor 해야 하는 forward contract)
3. **Step 1 flow-review r7 §7.6 / §7.7 / §7.8 / §7.9** — Hook δ + Phase 3.5 write-back 의 source spec (Step 4 가 mechanical 화)
4. **Step 1 flow-review r7 §4.7 + §6.4** — raw.yml meta vocabulary + `onto domain init` CLI producer 분리 결정
5. **Step 2 protocol r6 §6.3 + §3.4 + §6.3.1** — Step 2 amendment 3 action 대상 (실 edit 전 확인)
6. **Step 3 decision §8** — 구현 세션 진입 시 주의사항 전수 (Step 4 가 consume)
7. **reconstruct.md §Phase 3 + §Phase 3.5 + §Phase 4** — 기존 v0 flow 의 해당 섹션 (Step 4 가 extend)

## 5. 위험 + 주의사항

### 5.1 Multi-sink drift risk

Step 4 는 Step 3 와 달리 **4 artifact sink** 를 동시 다룸. 각 sink 의 canonical authority 를 초안에서 명시하지 않으면 r3~r4 review 가 cross-sink drift 를 대량 surface. 초안 시 §3/§4/§5 의 canonical table 을 각 sink 당 1 개씩 명시 (Step 3 의 §3.1.1 / §3.1.2 / §3.7.2 패턴).

### 5.2 §7.9 matrix orientation 결정

Step 1 §7.9.1~§7.9.6 은 source state 별로 table 분할. Step 4 canonical 은 **action-first 또는 state-first 중 single view** — 둘 다 존재하면 drift 원천. Q-S4 초안에 "matrix orientation" 명시 결정 표면 필수.

### 5.3 raw.yml mutual exclusion

Step 1 §4.7 의 table:
- `inference_mode == full` → `degraded_reason` / `fallback_reason` 모두 N/A
- `inference_mode == degraded` → `degraded_reason` 필수, `fallback_reason` N/A
- `inference_mode == none` → `fallback_reason` 필수, `degraded_reason` N/A

이 rule 을 Step 4 에서 **machine-readable table** (예: YAML matrix) 로 명시. `rationale_review_degraded` 의 관계도 추가.

### 5.4 Step 2 amendment commit 구조

Step 3 decision §6.1 이 "본 Step 3 PR 에는 명세만, 실 edit 은 Track B 이연" 으로 기록. Step 4 는 설계 세션이므로 **실제 Step 2 protocol 파일 edit 은 Step 4 PR 의 별도 commit** 이 자연스러움. 또는 Track B 구현 세션 첫 commit 에서 처리. 둘 중 선택은 Step 4 초안 §6 의 결정 표면.

### 5.5 `onto domain init` CLI vs 기존 coordinator CLI

`onto coordinator start` / `onto coordinator next` (본 repo 에 이미 존재) 와 `onto domain init` 는 서로 다른 CLI. 본 Step 4 설계는 **domain init CLI contract 만** — 실제 CLI 구현은 Track B.

### 5.6 Review cost 예상

6~8 rounds × codex ~10 분 = 60~80 분 wall-clock. Claude deliberation 1~2 round 추가 시 +~15 분 per round. 본 세션 이후 Step 4 는 2~3 세션 (설계 → review → decision → PR) 으로 분할 가능.

## 6. Stage 3 전체 road map (Step 4 이후)

| Step | 내용 | 의존 | 상태 |
|---|---|---|---|
| Step 1 | 차이 축 재정의 | — | ✅ PR #201 merged |
| Step 2 | Hook α Proposer protocol | Step 1 Q3, Q15 | ✅ PR #202 merged |
| Step 3 | Hook γ Reviewer protocol | Step 1 Q5/Q6/Q7, Step 2 | ✅ PR #208 merged |
| **Step 4 (본 handoff 대상)** | 통합 (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment) | Step 1 + 2 + 3 | 📋 진입 대기 |
| **Stage 3 wrap-up** | 4 Step 누적 결정 single index | Step 4 | — |
| Track B 구현 세션 | W-A-80~ W-ID 부여, 4 Hook + CLI + role + manifest 전수 실 구현 | Stage 3 wrap-up | — |

## 7. Step 1 + Step 2 + Step 3 의 구현 세션 전달 사항 (Step 4 가 상속 + 확장)

본 handoff 는 Step 1 + Step 2 + Step 3 의 구현 세션 주의사항을 **상속** — Step 4 완료 후 Track B 구현 세션 진입 시 함께 반영:

1. **Step 1 §4.7 fallback_reason enum additive** — `proposer_failure_downgraded` 추가 (Q-S2-21) — Track B 에서 Step 1 decision doc §4.7 table 에 row additive
2. **rationale-proposer.md role 파일 배치** — Step 2 protocol §5.1 본문 복사 — Track B
3. **rationale-reviewer.md role 파일 배치** — Step 3 protocol §5.1 본문 복사 — Track B
4. **Prompt template agent invocation** — Step 2 protocol §4 + Step 3 protocol §4 template 을 runtime 이 agent spawn 시 제공
5. **wip.yml schema 확장 (Step 2 + Step 3 범위)** — intent_inference 전수 + meta.stage_transition_state + stage_transition_retry_count + meta.step2c_review_state + step2c_review_retry_count + rationale_reviewer_failures_streak + pack_missing_areas + element-level provenance schema + wip_snapshot_hash + domain_files_content_hash + hash_algorithm + gate_count
6. **5 mirror markers 문서 본문 부착** — Step 3 에서 §3.8 / §3.8.1 / §4 [Role] / §5.1 / §6.2 에 attachment 완료. Track B 에서 reconstruct.md + 관련 code 에도 동일 marker 부착 필수 (implementation-commit obligation)
7. **Step 2 amendment 3 action 실 edit** (P-DEC-A1) — Step 4 세션 또는 Track B 에서 — gate_count write + empty enum + pack_missing_areas 재해석
8. **snapshot persistence artifacts** — `.onto/builds/{session}/wip-2c-snapshot.yml` + `domain-files-2c-snapshot.yml` (Step 3 §3.7.1 item 4+8)
9. **Step 4 가 추가로 상속** — Step 4 설계 완료 후 Hook δ rendering + Phase 3.5 write-back mechanical spec + raw.yml meta canonical schema + domain init CLI contract 전수

## 8. Lifecycle

- **Active**: Stage 3 Step 4 설계 완료 (PR merge) 시까지
- **Superseded**: Step 4 PR merge 시 "superseded by <PR>" 표기
- **Archive**: Stage 3 전체 wrap-up 시 reference 이동
