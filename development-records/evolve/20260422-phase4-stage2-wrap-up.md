---
as_of: 2026-04-22
status: stage-wrap-up
functional_area: phase-4-stage-2
purpose: |
  Phase 4 Stage 2 (Track C/D drift-engine × learn v1 결합) 종결. 4 Step + 누적
  21 점 주체자 결정 + dogfood SDK-like invariant 정본 정착의 single index.
  Stage 2 종결 → Stage 3 (Track B reconstruct v1 설계) 별도 세션 입구.
authority_stance: non-authoritative-wrap-up
canonicality: scaffolding
source_refs:
  stage_1_handoff: "development-records/plan/20260419-phase4-handoff.md"
  stage_1_design_input: "development-records/evolve/20260419-phase4-design-input.md"
  step_1: "development-records/evolve/20260422-phase4-stage2-step1-drift-engine-learn-binding.md"
  step_2: "development-records/evolve/20260422-phase4-stage2-step2-authority-intersection.md"
  step_3: "development-records/evolve/20260422-phase4-stage2-step3-staging-schema.md"
  step_4: "development-records/evolve/20260422-phase4-stage2-step4-principal-ui-flow.md"
  invariant_sink: ".onto/processes/govern.md §14.6"
---

# Phase 4 Stage 2 — Wrap-up

## 0. 본 wrap-up 의 범위

Stage 2 (Track C/D 순환 의존 해소) 의 4 Step 종결 정본. 단일 index 로 누적 21 점 결정 + dogfood SDK-like invariant + 다음 단계 (Stage 3 Track B reconstruct v1) 의 입구 자료.

본 wrap-up 은 self-contained — 본 문서만 읽어도 Stage 2 전체 결정 + 다음 세션 진입 가능.

## 1. Stage 2 4 Step 종결 상태

| Step | PR | merge sha | 핵심 산출 |
|---|---|---|---|
| Step 1 | #194 | `de570f0` | drift-engine × learn v1 결합 계약 + Q1~Q4 (v1 4축 재정의 + self_apply matrix + principal_direct 원칙 + staging path) |
| Step 2 | #196 | `21a8c2a` | `.onto/processes/` 전체 principal_direct 승격 + 3 TBD 분류 확정 matrix |
| Step 3 | #197 | `5b8016e` | staging = decision replay + full baseline (재설계 β) + atomic_batch flag + queue payload convention |
| Step 4 | (본 세션) | - | Principal UI flow (4 신규 CLI) + emergency pause + self_apply 사후 보고 + 통합 matrix + dogfood SDK-like invariant |

Stage 1 (범위 합의) 은 PR #133 (`15da41b`) 에서 Q1~Q7 (5 점 요약) 종결.

## 2. 누적 21 점 결정 인덱스

### 2.1 Stage 1 (Q1~Q7, 5 점 핵심)

| # | 결정 | 결과 |
|---|---|---|
| Q1 | Phase 4 scope 전체 동의 | ✅ |
| Q2 | 트랙 순서 | C/D 동시 → B → A |
| Q3 | 자율성 수준 2 | Phase 5 분리 |
| Q4 | W-ID 축 정책 | 기존 축 연장 |
| Q5 | 세션 운영 | /clear focused session |
| Q6 | dogfood 운영 | mandatory + 3 세션 + feedback-to-product (Phase 4 단계 한정) |
| Q7 | dogfood log 노출 | aggregated only public (`.onto/dogfood/` gitignored) |

### 2.2 Step 1 (4 점)

| # | 결정 | 결과 |
|---|---|---|
| 1 | v1 차이 재정의 | 편집 대상 확장 + drift gate + staging + rollback (4 축) |
| 2 | self_apply matrix | learnings/domains 단일 편집 즉시 자동 (v0 거동 유지) |
| 3 | principal_direct 원칙 | authority + principles + processes/govern.md 자동 편집 금지 (예외 없음) |
| 4 | staging path | `.onto/govern/staging/` gitignored |

### 2.3 Step 2 (4 점)

| # | 결정 | 결과 |
|---|---|---|
| 1 | `.onto/processes/` | 전체 principal_direct 승격 (GOVERNANCE_CORE_DIR_PREFIXES 확장) |
| 2 | obligation_waive | self_apply (단일 audit-state) |
| 3 | cross_agent_dedup | queue (cluster 본질, 복수 파일) |
| 4 | domain_doc_updates per-decision | self_apply (단일 doc) / atomic_batch 시 queue |

### 2.4 Step 3 (4 점)

| # | 결정 | 결과 |
|---|---|---|
| 1 | staging layout | `.onto/govern/staging/<proposal-id>/{meta.yaml, decision.yaml, baseline.snapshot/}` |
| 2 | canonical staging content | **decision replay + full baseline** (재설계 β, patch.diff 폐기) |
| 3 | atomic_batch flag | `ChangeProposal.atomic_batch?: boolean`. cross_agent_dedup unconditional, domain_doc_updates 조건부 |
| 4 | queue payload | `staging_path` + `proposal_summary {mutation_step, target_count, change_kind, atomic_batch}` |

### 2.5 Step 4 (4 점 + 별도 + invariant)

| # | 결정 | 결과 |
|---|---|---|
| 1 | self_apply 사후 보고 seat | `.onto/govern/self-apply-log/<session>/events.jsonl` (govern 내부, dogfood 는 reader) |
| 2 | emergency pause flag | `.onto/govern/learn-paused.flag` (ephemeral file) |
| 3 | `show <id>` 예측 diff | promote-executor dry-run (decision 재주입 + write 인터셉트) |
| 4 | principal_direct 기록 | 명시 CLI `onto govern record-manual-edit --target ... --reason ...` |
| 별도 | authority dogfood entity 등재 | **미등재 유지** — 운영 layer 위상의 구조적 보장 |
| invariant | dogfood SDK-like sink 의존 방향 | 정본 `.onto/processes/govern.md §14.6` |

**누적 21 점** = Stage 1 (5) + Step 1 (4) + Step 2 (4) + Step 3 (4) + Step 4 (4). 별도 안건 (authority 미등재) + invariant 정본화는 21 점 외 architectural 결정.

## 3. 통합 matrix — 3 route × sink 위치 × dogfood 의존

| Route | 개입 시점 | 본질 sink 위치 | dogfood 의존 | Principal action UI |
|---|---|---|---|---|
| **self_apply** | 사후 | `.onto/govern/self-apply-log/<session>/events.jsonl` | 독립 (reader) | promote session stdout summary |
| **queue** | 사전 | `.onto/govern/staging/<proposal-id>/` + `.onto/govern/queue.ndjson` (event-sourced ledger, Step 4 §1.3) | 독립 (reader) | `onto govern list-drift-candidates → show → decide-staged` |
| **principal_direct** | 대신 | `.onto/govern/queue.ndjson` (manual_edit marker entry kind, Step 4 §1.3) | 독립 (reader) | 본인 편집 + `onto govern record-manual-edit` |

`queue.ndjson` 은 single seat 이지만 entry kind 다중 (pending decision / decided verdict / apply_failed / manual_edit / v0 freeform) — Step 4 §1.3 참조. consumer 는 entry kind 로 필터링.

모든 본질 sink 가 govern namespace 내부 → invariant (정본: govern.md §14.6) 충족 → dogfood off → 모든 route 정상 작동.

## 4. CLI surface 변화 요약 (구현 세션 input)

### v0 보존 (record-only)
- `onto govern submit / list / decide / route / promote-principle`

### v1 신규 (staging-driven actual apply)
- `onto govern list-drift-candidates`
- `onto govern show <id>`
- `onto govern decide-staged <id> approve [--reason <text>]`
- `onto govern decide-staged <id> reject --reason <text>`
- `onto govern record-manual-edit --target <path> --reason <text>`

### v1 신규 (learn pause)
- `onto learn pause [--reason <text>]`
- `onto learn resume`
- (옵션) `onto learn status`

## 5. 다음 단계 — Stage 3 Track B reconstruct v1 설계

Q2 결정 (C/D → B → A) 의 다음 stage. Stage 2 와 independent scope 라 별도 세션 권장.

### 5.1 입구 자료
- design-input: `development-records/evolve/20260419-phase4-design-input.md` §1.4 reconstruct 절 + §1.6 dogfood
- handoff: `development-records/plan/20260419-phase4-handoff.md` §2.2 Stage 3a
- invariant 정본: `.onto/processes/govern.md §14.6` (sink 결정 시 자동 적용)

### 5.2 Stage 3 첫 세션 진입 시 한 줄
```
Stage 3 진입 — Track B reconstruct v1 설계 시작.
입구: development-records/evolve/20260419-phase4-design-input.md §1.4 + handoff §2.2.
Stage 2 wrap-up: development-records/evolve/20260422-phase4-stage2-wrap-up.md
```

## 6. 미해소 / backlog

### 6.1 구현 세션 진입 후 결정
- `cross_doc_references` detection 방식 (domain-doc-proposer emit vs heuristic) — Step 3 §4.3
- promote-executor dry-run 구현 방법 (메모리 vfs vs in-process simulation) — Step 4 §6.3
- v1.1 enforcement lint `onto govern audit` (principal_direct 기록 누락 감지) — Step 4 §5.4
- v1.1 `onto learn rollback <session>` (self_apply rollback CLI) — Step 4 §4.4
- `onto learn status` 추가 여부 (pause 핵심 contract 아님) — Step 4 §3.1
- promote-executor 의 staging apply_failed 시 재시도 정책 (자동 vs 수동) — Step 4 §2.3
- `GovernApplyFailedEvent` type 신설 (`src/core-runtime/govern/types.ts`) — Step 4 §2.3
- staging.ts 신규 모듈 위치 (`src/core-runtime/govern/staging.ts`) — Step 1 §4
- `record-manual-edit` multi-file 확장 (현 v1 single-file scope) — Step 4 §5.4 (CCF-principal-direct-audit-contract)
- emergency stop mechanism (pause 가 차단하지 않는 Principal 명시 작업까지 차단하는 별도 layer) — Step 4 §3.3

### 6.2 Phase 5 (자율성 수준 2) 이연
- 수준 2 trigger 도구 (Q3 결정)
- dogfood entity 의 lexicon Stage 3 등재 재평가 (Step 4 §9 별도)
- design 활동 절차 (`.onto/processes/design.md`) 정착 — 정착 시 govern.md §14.6 location 표의 design 행 본질 sink 결정 (현 임시 sink: `development-records/design/`)

### 6.3 본 PR scope 외 (review fix-up 후속)
- UF-step4-over-specification: Step 4 본문의 같은 결정 반복 광범위 trim — 별도 PR scope (양식 의존성 자체 재검토 필요)

## 7. Track C/D 구현 착수

Stage 2 의 결정은 **설계 합의** 단계 — 실제 구현은 별도 세션. PR #133 Stage 2 원칙 ("설계 합의만") 준수.

W-ID 예약 (Q4 결정 기반):
- Track C → W-C-09~ (govern v1 staging machinery + 신규 CLI)
- Track D → W-C-09~ (learn v1 drift gate + emergency pause)

구현 우선순위는 별도 세션 결정. 권장 순서: Track C 먼저 (sink + CLI 표면) → Track D (gate 호출) → 통합 dogfood 3 세션 (Q6).

## 8. 본 문서의 위치

- **Previous**: Step 4 (본 세션 신규 작성)
- **Current**: Stage 2 wrap-up (본 문서)
- **Next**: Stage 3 Track B reconstruct v1 설계 (별도 세션)
- **최종 정착**: Track C/D 구현 세션에서 본 wrap-up 의 결정 21 점이 코드 + `.onto/processes/govern.md` 본문 + `.onto/processes/learn/promote.md` 본문에 반영
