---
as_of: 2026-04-23
status: active
functional_area: phase-4-stage-3-step-2-session-entry
purpose: |
  Phase 4 Stage 3 Step 1 merge 후 다음 세션이 Step 2 (Hook α Rationale
  Proposer protocol 세부) 를 즉시 시작할 수 있도록 self-contained entry.
  Step 1 (PR #201) 결정을 전제로 하며 본 handoff 는 Step 1 merge 후 활성화.
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 9/9 clean pass)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인)"
  step_1_pr: "#201"
  stage_2_precedent: "development-records/evolve/20260422-phase4-stage2-wrap-up.md"
  phase_4_handoff: "development-records/plan/20260419-phase4-handoff.md"
---

# Stage 3 Step 2 Handoff — Hook α Rationale Proposer Protocol

## 0. /clear 후 첫 명령

```
development-records/plan/20260423-phase4-stage3-step2-handoff.md 읽고 Phase 4 Stage 3 Step 2 시작
```

본 handoff 는 self-contained. 이전 세션 memory 는 optional reference.

## 1. 전제 상태 확인

Step 2 진입 전 다음 상태가 성립해야 함:
- [ ] PR #201 main 에 merge 완료 (확인: `git log --oneline origin/main -5` 에 "Stage 3 Step 1" 포함)
- [ ] flow-review r7 파일이 main 에 존재: `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md`
- [ ] decision 문서 (status: decision-approved) 가 main 에 존재: `development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md`

미충족 시 Step 2 scope 축소 (예: design only without reference) 또는 대기.

## 2. Step 2 scope — Hook α Rationale Proposer protocol 세부

### 2.1 Step 1 결정 중 Step 2 가 구체화해야 할 항목 (Q3 + 관련)

Step 1 Q3 (Rationale Proposer fresh agent) 가 **승인** 상태. Step 2 는 해당 agent 의 **protocol 세부** 를 확정:

| 설계 항목 | 내용 |
|---|---|
| **Input schema 상세** | Step 1 flow-review §7.1 의 rationale_proposer_directive 입력 3 축 (system_purpose + Stage 1 entity 목록 + manifest referenced_files content) 각각의 선택 field, 크기 제한, 주입 순서 |
| **Output directive schema 상세** | `proposals[]` 의 outcome enum (`proposed / gap / domain_scope_miss / domain_pack_incomplete`) 별 필수/조건부 field. confidence 판정 기준. provenance 초기 populate 방식 |
| **Prompt 실문자열 (English-only)** | reconstruct.md §1.0 Team Composition 의 기존 agent prompt (Explorer / Lens / Adjudicator / Synthesize) 패턴 참조. Language Policy + Role + Rules + Procedure 블록 구성 |
| **Role 파일 본문** | `.onto/roles/rationale-proposer.md` 신규 생성 (기존 lens role 파일들 `.onto/roles/*.md` 패턴 참조) |
| **Runtime integration 세부** | Stage Transition 의 module_inventory 교체 직후 전용 runtime step. directive apply 의 atomic write 순서. wip.yml schema 확장 세부 (`intent_inference` field 초기 populate) |
| **Failure handling integration** | Stage 2 진입 전 halt 시 Principal 에게 제시할 선택지 (`재시도 / --v0-only 전환 / abort`) UX. partial failure 의 gap 기록 규약 |

### 2.2 Step 2 가 다루지 않는 것 (Step 3/4 이연)

- Hook γ Rationale Reviewer protocol (Step 3)
- Phase 3 throttling config default tuning (Step 3)
- Phase 3.5 write-back 구현 세부 (Step 4)
- raw.yml meta 확장 구현 (Step 4)
- `onto domain init` CLI 실제 UX (Step 4 또는 별도 CLI 설계 세션)

### 2.3 예상 /onto:review cycle

Step 1 이 7 rounds (architectural → elaboration) 를 요했다면, Step 2 는 **3~5 rounds** 예상:
- 초안 review: prompt text 정확성 + role 본문 완결성
- 2~3 round: prose precision + schema closure + runtime integration sync
- final: Principal 승인 수집

Step 1 대비 scope 좁음 (1 agent protocol vs 전체 structural redesign). 다만 prompt text + role 본문의 정확성이 의미 추론 품질을 직접 결정하므로 "결과물 의미성 > process" 원칙 하에 충분한 review 유지.

## 3. 진입 단계

### 3.1 Branch + 초안

1. `git checkout -b docs/phase4-stage3-step2` (main 기반, #201 merge 확인 후)
2. 초안 문서: `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
3. 초안 구조 (Step 1 flow-review 와 유사):
   - §0 purpose + revision_history
   - §1 Step 2 scope 재진술 + Step 1 결정 참조
   - §2 Input schema 상세
   - §3 Output directive schema 상세
   - §4 Prompt 실문자열 (English-only, 전문)
   - §5 Role 파일 본문 (`.onto/roles/rationale-proposer.md` 전문)
   - §6 Runtime integration 세부
   - §7 Failure handling integration
   - §8 §14.6 invariant 재확인 (sink 결정 없음)
   - §9 결정 표면 (Q1~Qn, 권장 A 일괄)
   - §10 다음 단계 (Step 3)

### 3.2 /onto:review 실행

```bash
npm run review:invoke -- \
  development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md \
  "Stage 3 Step 2 — Rationale Proposer protocol 세부 초안. Step 1 Q3 (Rationale Proposer fresh agent) 의 input/output/prompt/role/runtime integration 구체화. Step 1 결정 re-open 아님." \
  --no-domain --codex
```

**ONTO_HOME 주의**: PR #199 가 도입한 `ONTO_HOME` propagation 요구. 본 handoff 작성 시점 (2026-04-23) 에 synthesize 단계 halt 재현됨 (bug report: `development-records/bug-reports/20260423-onto-home-synthesize-halt.md`). Step 2 review 전 fix 되어 있을 수도, 아닐 수도. 대응:
- synthesize 실패 시 9 lens output 직접 합의 synthesis (Step 1 r7 과 동형 처리)
- Or `export ONTO_HOME=/Users/kangmin/cowork/onto-4` 후 재실행

### 3.3 결정 → PR

Step 1 과 동일 패턴:
- 최종 review round clean pass 도달
- decision 섹션에 Principal 일괄 승인 기록
- commit + PR (제목: `docs(phase-4): Stage 3 Step 2 — Rationale Proposer protocol (decision)`)

## 4. 참조 reading order

새 세션 시작 시 읽을 파일 (priority):

1. **본 handoff** (이 파일) — 진입 지점
2. **Step 1 decision 문서** (§3 summary table + §4 Principal 결정) — 승인된 16 결정 확인
3. **Step 1 flow-review r7 §7.1 (Hook α Rationale Proposer)** — Step 2 가 상세화할 baseline
4. **Step 1 flow-review r7 §4.5 (intent_inference schema)** — directive output 이 populate 할 target
5. **reconstruct.md §1.0 Team Composition** — 기존 agent prompt 패턴 (Explorer / Lens / Adjudicator / Synthesize)
6. **`.onto/roles/<existing-lens>.md`** (하나) — role 파일 구조 참조 (예: `.onto/roles/logic.md`)

## 5. 위험 + 주의사항

- **Scope creep 위험**: Step 2 는 Hook α 만. Hook γ (Step 3) 또는 Phase 3.5 (Step 4) 내용이 초안에 섞이면 review 가 scope 확장 지적 가능. 엄격히 Hook α protocol 만
- **Prompt text 의 English-only 규약**: `reconstruct.md` 의 기존 agent prompt 들이 모두 영어. role 파일과 prompt 본문은 English. 본 handoff 의 Korean 는 meta-document (Korean principle 적용 영역)
- **agent 호출 결정성 보장**: Proposer 가 Synthesize 와 유사하게 **directive only, wip.yml 직접 쓰기 금지** 원칙 유지 — Step 1 §7.1 에 이미 확정. Step 2 는 이 원칙의 mechanical 구현 정확성만
- **`domain_refs` 의 정확 serialization**: Step 1 에서 `manifest_ref: "concepts.md"` 형태로 결정. Step 2 에서 heading path + excerpt 길이 제한 등 세부 값 확정

## 6. Stage 3 전체 road map (Step 2 이후)

| Step | 내용 | 의존 |
|---|---|---|
| Step 1 | 차이 축 재정의 (16 Q 승인) | — |
| **Step 2 (본 handoff 대상)** | Hook α Rationale Proposer protocol | Step 1 Q3, Q15 |
| Step 3 | Hook γ Rationale Reviewer protocol + Phase 3 throttling tuning | Step 1 Q5/Q6/Q7, Step 2 |
| Step 4 | 통합 (Phase 3.5 write-back + raw.yml meta + invariant 10 + `onto domain init` CLI) | Step 1 전수 + Step 2/3 |
| **Stage 3 wrap-up** | 4 Step 누적 결정 single index | Step 4 |
| Track B 구현 세션 | W-A-80~ W-ID 부여, 코드/계약/role/manifest 실현 | Stage 3 wrap-up |

## 7. Lifecycle

- **Active**: Stage 3 Step 2 설계 완료 (PR merge) 시까지
- **Superseded**: Step 2 PR merge 시 "superseded by <PR>" 표기
- **Archive**: Stage 3 전체 wrap-up 시 reference 이동
