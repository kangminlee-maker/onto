---
as_of: 2026-04-25
status: active
functional_area: phase-4-stage-3-step-4-integration-decision
purpose: |
  Phase 4 Stage 3 Step 4 (4 영역 통합 — Hook δ + Phase 3.5 + raw.yml meta + onto domain
  init CLI + Step 2 amendment 3 action) 의 결정 표면 (Q-S4-* 58 점) + Principal Decision
  (P-DEC-A1 amendment 3 action 실 edit) Principal 일괄 승인 기록. Stage 3 wrap-up + Track B
  구현 세션의 결정 input.
source_refs:
  step_4_protocol: "development-records/evolve/20260424-phase4-stage3-step4-integration.md (r15, 15 rounds clean pass — 1756줄)"
  step_4_handoff: "development-records/plan/20260424-phase4-stage3-step4-handoff.md"
  step_4_review_sessions:
    - r1: ".onto/review/20260424-d6f6369d (codex, BLOCKING 6 Consensus + 2 Conditional + 11 UF + 5 Immediate Actions)"
    - r2: ".onto/review/20260424-de77643f (codex, 3 Consensus + 1 Conditional + 1 Axiology + 4 UF, Purpose Alignment 긍정)"
    - r3: ".onto/review/20260424-3b7f0245 (codex, 3 Consensus + 1 Disagreement + 6 UF)"
    - r4: ".onto/review/20260425-30d37372 (codex, 3 Consensus + 3 UF + 3 Recommendations)"
    - r5: ".onto/review/20260425-bb0d52d2 (codex, 3 Consensus + 2 Recommendations + 3 UF)"
    - r6: ".onto/review/20260425-021be2d4 (codex, 2 Consensus + 1 Conditional + 4 UF, 수렴 진전)"
    - r7: ".onto/review/20260425-5402cc07 (codex, 3 Consensus + 1 UF logic-only)"
    - r8: ".onto/review/20260425-856e4811 (codex, 2 Consensus + 1 Disagreement + 2 UF, recovery_from_malformed end-to-end no-challenge)"
    - r9: ".onto/review/20260425-819452d3 (codex, 1 Consensus + 1 Disagreement + 1 UF, focused re-review 권장)"
    - r10: ".onto/review/20260425-50f5ceaf (codex, Consensus = positive affirmation r10 closes r9 + 4 UF)"
    - r11: ".onto/review/20260425-07050236 (codex, 1 Consensus + 1 Disagreement + 0 UF)"
    - r12: ".onto/review/20260425-095af3d8 (codex, 2 Consensus positive affirmations + 0 Disagreement + 2 UF, contract-level clean pass)"
    - r13: ".onto/review/20260425-a8aff541 (codex, 2 Consensus positive + 2 Disagreement solo-lens)"
    - r14: ".onto/review/20260425-f4b37b96 (codex, 2 Consensus positive + 1 Disagreement 6vs2 + 1 positive UF)"
    - r15: ".onto/review/20260425-87e065d7 (codex, **CLEAN PASS** — 0 Immediate Actions, 0 Conditional, 0 Disagreement, 0 negative UF)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (Q-S1 16 점, PR #201 bae608e)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (Q-S2 22 점, PR #202 d15a17d) + r3-amendment (본 PR 에서 추가)"
  step_3_decision: "development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md (Q-S3 22 점 + 2 P-DEC, PR #208 5201c22)"
revision_history:
  - revision: r0
    date: 2026-04-25
    basis: "r15 clean pass 도달 (.onto/review/20260425-87e065d7) 후 주체자 일괄 승인"
    scope_summary: |
      Step 4 protocol r15 의 Q-S4 58 점 + P-DEC-A1 amendment 3 action 전수 Principal 승인 기록. Step 4 PR 의 4-commit stack 으로 commit 예정 (Step 4 protocol + Step 4 decision + Step 2 protocol amendment + Step 2 decision revision_history).
---

# Stage 3 Step 4 Decision — 4 영역 통합 (Hook δ + Phase 3.5 + raw.yml meta + onto domain init CLI + Step 2 amendment)

## 0. 본 문서의 목적

Stage 3 Step 4 protocol (`20260424-phase4-stage3-step4-integration.md` r15, 15 rounds clean pass) 의 결정 표면 (Q-S4-* 58 점) + Principal Decision (P-DEC-A1 amendment 3 action) 의 Principal **일괄 승인** 기록.

본 문서는 commit-ready decision artifact 로, Step 4 PR 의 별도 commit 으로 포함된다 (Step 3 decision 문서 패턴 mirror — `20260424-phase4-stage3-step3-rationale-reviewer-decision.md`).

## 1. Step 4 scope (간략)

4 영역 통합:
1. **Hook δ** — Phase 3 Principal 검증 surface (rendering + throttling + evidence + triple-read consume + rationale-queue.yaml artifact)
2. **Phase 3.5 write-back** — Principal action → terminal state action-first canonical matrix. Runtime sole-writer, LLM 불개입
3. **raw.yml meta 확장** — `inference_mode` + `degraded_reason` + `fallback_reason` + `rationale_review_degraded` + `gate_count` + element-level `intent_inference` block + `manifest_recovery_from_malformed` audit signal
4. **`onto domain init` CLI** — manifest.yaml producer 분리, Principal authority + 3 branch (init / `--migrate-existing` / `--regenerate`) + non-interactive `--config` + product-locality exception

추가: **Step 2 amendment 3 action 실 edit** (P-DEC-A1 경로 A — Step 3 PR #208 에서 명세만 포함, 본 Step 4 PR 에서 실 edit).

## 2. 결정 표면 (Q-S4-* 58 점) + Principal Decisions

### 2.1 영역별 Q-S4 group 요약

| 영역 | Q 수 | 범위 |
|---|---|---|
| Hook δ (§2) | 9 | Q-S4-δ-01 ~ Q-S4-δ-09 |
| Phase 3.5 (§3) | 16 | Q-S4-P3.5-01 ~ Q-S4-P3.5-16 |
| raw.yml meta (§4) | 7 | Q-S4-raw-01 ~ Q-S4-raw-07 |
| onto domain init CLI (§5) | 21 | Q-S4-CLI-01 ~ Q-S4-CLI-21 |
| Step 2 amendment (§6) | 4 | Q-S4-amend-01 ~ Q-S4-amend-04 |
| Canonical seat migration (§7) | 1 | Q-S4-migrate-01 |
| **총계** | **58** | (r1 33 + r2 7 + r3 2 + r4 4 + r5 3 + r6 4 + r7 2 + r8 2 + r11 1 + r13~r15 4 wording cleanup)|

### 2.2 Q-S4 누적 추가 trail

각 round 가 도입한 신규 Q + 해소한 BLOCKING / Disagreement / UF 의 trail. Q lookup 의 single authority 는 protocol 문서 §9.1 + §9.2 (count authority).

- **r1 (33 점)**: 초안 — Hook δ 8 + Phase 3.5 8 + raw.yml 6 + CLI 7 + amend 4
- **r2 (+7)**: structural 재편 — `domain_scope_miss` accept terminal split / `empty` source state matrix 편입 / batch vocabulary 단일화 / version_hash boundary 축소 / mutual exclusion overlap 제거 / canonical seat migration plan
- **r3 (+2)**: §3.4.1 grouping key + canonical seat migration §7
- **r4 (+4)**: validation step 1.5 + render-time snapshot seat + grouping enforcement + carry_forward 2 layer
- **r5 (+3)**: §5.5 hash input pack-spec 확장 + semver grammar/comparator + rendering partition 7-step
- **r6 (+4)**: 3-category taxonomy + manifest_schema_version hash 제외 + `"see below"` × `throttled_out` closure + 4-bucket strict
- **r7 (+2)**: `domain_manifest_version` 수집 + recovery_from_malformed audit flag
- **r8 (+2)**: `domain_name` dual-membership 해소 + `domain_manifest_version` closure scope narrow
- **r11 (+1)**: §5.6.3 failure code canonical map (4 codes)
- **r13~r15 (cleanup)**: governed-subject scope rename + recovery origin column + alias 단일화

### 2.3 Q-S4 lookup → protocol pointer

본 §2 는 Q 총 58 점의 metadata index. 각 Q 의 의미 + canonical seat 은 protocol 문서 (`20260424-phase4-stage3-step4-integration.md`) §9.1 (영역별 Q-list) + §2~§7 (canonical authority) 가 single source. drift 방지 — 본 decision 문서가 Q 의미를 재진술하지 않음.

## 3. Principal Decisions (P-DEC-A1 — Step 2 protocol amendment 3 action)

### P-DEC-A1 — Step 2 protocol amendment authority (경로 A 재확인)

**근거**: Step 3 decision §3 (`20260424-phase4-stage3-step3-rationale-reviewer-decision.md`) 에서 2026-04-23 Principal 승인. 경로 A = "Step 3 protocol 에는 amendment 명세만 포함 (PR #208 d15a17d 5201c22), 실 edit 은 Step 4 PR 의 별도 commit". Step 4 protocol §6 가 명세를 보존, 실 edit 은 본 Step 4 PR 의 commit 3 에서 수행.

**3 action — Step 2 protocol 3 지점 patch**:

1. **§6.3 `gate_count = 1` write rule 신설**: Hook α 가 `intent_inference.provenance.gate_count = 1` 로 초기화 (Hook γ 가 revise/confirm 시 2 로 증가). Step 3 §3.7.2 canonical 과 pair. Step 4 protocol §6.2 명세.
2. **§3.4.1 신설 — `rationale_state` canonical enum + `empty` 추가**: Stage 2 Explorer 가 추가한 entity 의 canonical shape `intent_inference.rationale_state = "empty"`. Step 1 §4.5 mirror, Step 3 §3.6 + §3.8 rule 8+11 와 pair. Step 4 protocol §6.3 명세.
3. **§6.3.1 문장 수정 — `pack_missing_areas` 재해석**: "semantic refinement 는 Reviewer 에 이연" → "Reviewer 는 v1 에서 pack_missing_areas 에 관여하지 않음 (Step 3 §6.3.1 canonical), semantic refinement 는 v1.1 backlog". Step 4 protocol §6.4 명세.

**Step 2 decision 문서 동시 갱신** (Step 4 PR commit 4):
- frontmatter `revision_history` array 에 `r3-amendment` entry 추가
- basis: "Step 4 P-DEC-A1 경로 A (2026-04-23 Principal 승인) — Step 4 PR 에서 병행 수행"
- scope_summary: "additive: §6.3 gate_count write rule + §3.4.1 empty enum + §6.3.1 pack_missing_areas 재해석 3 지점. Q-S2-1~22 재검토 아님."
- related_pr: "PR #<Step 4 PR number — merge 시 backfill>"

**scope 엄격**: Additive extension + forward-declared seat 정정만. Step 2 decision 표면 (Q-S2-1~22) 재검토 아님.

## 4. Decision summary table (Principal 일괄 승인 — 2026-04-25)

| 결정 항목 | 승인 상태 | 근거 |
|---|---|---|
| **Q-S4-δ-01 ~ Q-S4-δ-09** (Hook δ 9 점) | ✅ 일괄 승인 | r15 clean pass — protocol §2 + §9.1 |
| **Q-S4-P3.5-01 ~ Q-S4-P3.5-16** (Phase 3.5 16 점) | ✅ 일괄 승인 | r15 clean pass — protocol §3 + §9.1 |
| **Q-S4-raw-01 ~ Q-S4-raw-07** (raw.yml meta 7 점) | ✅ 일괄 승인 | r15 clean pass — protocol §4 + §9.1 |
| **Q-S4-CLI-01 ~ Q-S4-CLI-21** (onto domain init CLI 21 점) | ✅ 일괄 승인 | r15 clean pass — protocol §5 + §9.1 |
| **Q-S4-amend-01 ~ Q-S4-amend-04** (Step 2 amendment 4 점) | ✅ 일괄 승인 | r15 clean pass — protocol §6 + §9.1 |
| **Q-S4-migrate-01** (Canonical seat migration 1 점) | ✅ 일괄 승인 | r15 clean pass — protocol §7 + §9.1 |
| **P-DEC-A1 — Step 2 protocol amendment 실 edit (경로 A)** | ✅ 일괄 승인 | Step 3 decision §3 (2026-04-23 승인) 의 reaffirm. 실 edit Step 4 PR commit 3 + Step 2 decision revision_history Step 4 PR commit 4 |
| **r15 review recommendation — Bounded clean pass** | ✅ 수용 | r15 review (`.onto/review/20260425-87e065d7`) 의 명시 권장 |

**총 결정 표면**: 58 Q-S4 + 1 P-DEC-A1 + 1 review acceptance. **전수 일괄 승인**.

## 5. Principal 결정 수집

### 5.1 일괄 승인 결과

2026-04-25 주체자 결정: **A. 전체 승인 — 3 단계 (decision 작성 + Step 2 amendment edit + PR 생성) 순차 자동 진행**.

### 5.2 결정의 배경

- **15 rounds review cycle 완료**: r1 BLOCKING 6 Consensus → r15 0 negative findings. 각 round 가 서로 다른 축에서 drift 를 surface 했고 누적적으로 해소
- **Contract-level clean pass 는 r12 에서 이미 도달** (positive Consensus affirmations). r13~r15 는 wording polish (focused scope §5.4.2 + §5.6.3)
- **Axiology lens** 가 r10 이후 7 rounds 연속 "no purpose drift, no missing perspective" 보고 — value alignment 안정
- **r15 review recommendation**: "Accept r15 as closing r14 D-01 and treat the requested focused re-review as passed"
- **handoff 예상 6~8 rounds 의 2배 초과** 했으나 문서 규모 (1756 줄, 58 Q) + 4 영역 통합 complexity 고려 시 정상 수렴 pattern

### 5.3 status 전환

- Step 4 protocol (`20260424-phase4-stage3-step4-integration.md`): `draft` → **`active`** (decision 후 Step 4 PR 에 commit, post-promotion 시 `superseded-by-reconstruct.md` — §7.2 canonical seat migration plan)
- 본 decision 문서: `active` (Step 4 PR commit 시점에 status 유지, Stage 3 wrap-up 에서 archive 후보)

### 5.4 구현 세션 (Track B) input 으로 전달되는 mechanical 계약

본 Step 4 의 4 영역 + Step 2 amendment 가 Track B 구현 세션 (W-A-80~) 진입 시 직접 consume:

**4 canonical seats** (Step 4 protocol §7.2 promotion 대상):
1. `.onto/processes/reconstruct.md §Phase 3` ← Step 4 protocol §2 (Hook δ rendering + throttling + evidence + triple-read + rationale-queue.yaml)
2. `.onto/processes/reconstruct.md §Phase 3.5` ← Step 4 protocol §3 (action-first matrix + step sequencing + validation + carry_forward sweep)
3. `.onto/processes/reconstruct.md §Phase 4` ← Step 4 protocol §4 (raw.yml meta canonical schema + element-level intent_inference persist + mutual exclusion)
4. `.onto/commands/domain-init.md` 신설 ← Step 4 protocol §5 (CLI contract + product-locality exception + version semantics + recovery)

**3 governed-subject taxonomy** (Step 4 protocol §5.4.2 single canonical):
- Runtime-managed (CLI write-only, pre-load gate)
- Enforced (--regenerate, guard mechanism subtype: pack-spec / pack-content / semver)
- Unenforced soft (manual edit OK)

**4 failure codes canonical map** (Step 4 protocol §5.6.3 single authority):
- `manifest_malformed` (YAML parse / required missing)
- `manifest_version_format_invalid` (semver grammar fail)
- `manifest_version_not_incremented` (comparator non-bump)
- `config_schema_invalid` (non-interactive config schema fail)

각 code 의 origin × recovery path matrix 는 §5.6.3 가 sole source.

**Step 2 amendment 3 action** (P-DEC-A1 실 edit, Track B 가 mirror marker 부착):
- gate_count canonical write timing (§6.2)
- rationale_state empty enum (§6.3)
- pack_missing_areas v1 vs v1.1 boundary (§6.4)

## 6. 다음 단계

### 6.1 본 Step 4 PR — 4-commit stack

Branch: `docs/phase4-stage3-step4` (이미 생성됨)

| commit | 파일 변경 | 의미 |
|---|---|---|
| 1 | `20260424-phase4-stage3-step4-integration.md` (1756줄, r15 final) | Step 4 protocol |
| 2 | `20260424-phase4-stage3-step4-integration-decision.md` (본 문서) | Step 4 decision (Principal 일괄 승인) |
| 3 | `20260423-phase4-stage3-step2-rationale-proposer-protocol.md` 3 지점 patch | Step 2 amendment 실 edit (P-DEC-A1) |
| 4 | `20260423-phase4-stage3-step2-rationale-proposer-decision.md` revision_history | Step 2 decision r3-amendment entry |

**PR title**: `docs(phase-4): Stage 3 Step 4 — Integration (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment)`

**commit 본문 language**: 한국어 (project convention).

### 6.2 Stage 3 wrap-up 착수

본 Step 4 PR merge 후 Stage 3 wrap-up 세션 진입 (Step 4 protocol §7.1 seat):

- §1 4 Step 누적 결정 집계 (count authority: 각 Step decision + 본 §9.2)
- §2 Hook α / γ / δ / Phase 3.5 / raw.yml / CLI canonical authority map
- §3 v1 scope 전수 + v1.1 backlog index
- §4 Track B 구현 세션 W-ID list (W-A-80~, 예상 20~30 W-ID)
- §5 Track B 진입 전 pre-check checklist
- §6 Canonical seat migration plan (Step 4 §7.2 consume)

### 6.3 Track B 구현 세션 진입 (Stage 3 wrap-up 후)

- W-ID 부여 + canonical seat promotion (`.onto/processes/reconstruct.md` + `.onto/commands/domain-init.md`)
- runtime code 작성 (`src/core-runtime/**`)
- role 파일 배치 (`.onto/roles/rationale-proposer.md` + `.onto/roles/rationale-reviewer.md`)
- mirror marker 부착 (`<!-- mirror-of: step-4-integration §X.Y -->`)

## 7. 본 문서의 위치

- **Previous (Stage 3)**:
  - Step 1 (PR #201 bae608e, 16 Q 승인) — 차이 축
  - Step 2 (PR #202 d15a17d, 22 Q 승인) — Hook α Proposer
  - Step 3 (PR #208 5201c22, 22 Q-S3 + 2 P-DEC 승인) — Hook γ Reviewer
- **Current (본 문서)**: Step 4 decision (58 Q-S4 + P-DEC-A1 일괄 승인)
- **Next**: Step 4 PR 머지 → Stage 3 wrap-up → Track B 구현 세션

**Revision 이력의 단일 authority**: frontmatter `revision_history:` (YAML).

## 8. 구현 세션 진입 시 주의사항

본 §8 은 Stage 3 wrap-up + Track B 구현 세션이 directly consume.

### 8.1 Step 2 protocol amendment 3 action — 본 PR commit 3 + 4 에서 수행

Step 4 PR 의 commit 3 에서 Step 2 protocol 3 지점 edit + commit 4 에서 Step 2 decision revision_history `r3-amendment` entry 추가. Track B 진입 시 추가 amendment 작업 없음 (이미 main 병합).

### 8.2 Mirror marker implementation-commit obligation

Step 3 §8.2 precedent — Track B 가 `.onto/processes/reconstruct.md` + `.onto/commands/domain-init.md` 신설/edit 시 `<!-- mirror-of: step-4-integration §X.Y -->` marker 부착 필수. promotion 후에도 historical reference 로 본 Step 4 protocol 문서 유지 (Step 4 protocol §7.4 post-promotion authority chain).

### 8.3 `rationale-proposer.md` + `rationale-reviewer.md` role 파일 배치

Step 2 §5.1 + Step 3 §5.1 본문을 각각 `.onto/roles/rationale-proposer.md` / `.onto/roles/rationale-reviewer.md` 에 복사. Track B commit.

### 8.4 Hook δ + Phase 3.5 prompt template (LLM 미개입 design — verify)

Hook δ + Phase 3.5 는 Runtime sole-writer (LLM 불개입). Step 4 protocol §3.8 canonical. Track B 구현 시 LLM 호출 경로 도입 금지 — invariant 위반.

### 8.5 wip.yml schema 확장 (Step 4 범위)

Step 4 protocol §4.3 element-level `intent_inference` block + §3.6 `phase3_user_responses` 확장 + §3.5.1 validation + §3.5.2 sweep + `phase3-snapshot.yml` artifact + `rationale-queue.yaml` artifact 전수 반영.

### 8.6 `manifest.yaml` schema 확장 (CLI 범위)

Step 4 protocol §5.4.2 9 governed subjects (3 category) + §5.5 version_hash algorithm + §5.6.1 semver grammar + §5.6.3 4 failure codes. CLI 코드 + reconstruct runtime 양쪽 모두 schema-aware.

### 8.7 raw.yml meta 확장 + element-level persist

Step 4 protocol §4.1 (meta block flat layout) + §4.3 (element-level intent_inference) + §4.5 (provenance 3 hash element-level persist) + §4.4 (persistence responsibility chain). govern / learn consumer 의 read scope 확장.

### 8.8 §14.6 dogfood SDK-like invariant

Step 4 protocol §8 — 4 영역 모두 off switch (`config.reconstruct.v1_inference.enabled` 등) 보장. dogfood 와 본질 sink 독립 (govern←reconstruct reader direction). Track B 구현 시 unconditional 도입 금지.

### 8.9 Canonical seat migration commit sequencing (Step 4 protocol §7.3)

Track B 진입 시:
1. Stage 3 wrap-up 문서 commit
2. `reconstruct.md` Phase 3 / 3.5 / 4 섹션 edit (Step 4 §2/§3/§4 mirror)
3. `.onto/commands/domain-init.md` 신설 (Step 4 §5 mirror)
4. `src/core-runtime/**` code 작성
5. 각 commit 에 `<!-- mirror-of: step-4-integration §X.Y -->` marker 부착

## 9. 참조

- **Step 4 protocol r15** (canonical 4-area integration spec): `development-records/evolve/20260424-phase4-stage3-step4-integration.md`
- **15 rounds review sessions**: `.onto/review/20260424-d6f6369d` ~ `.onto/review/20260425-87e065d7` (r1 ~ r15)
- **Step 1 precedent**: `20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md` + `20260423-phase4-stage3-step1-reconstruct-v1-axes.md`
- **Step 2 precedent**: `20260423-phase4-stage3-step2-rationale-proposer-protocol.md` + `20260423-phase4-stage3-step2-rationale-proposer-decision.md` (r3-amendment 본 PR commit 4 추가)
- **Step 3 precedent**: `20260423-phase4-stage3-step3-rationale-reviewer-protocol.md` + `20260424-phase4-stage3-step3-rationale-reviewer-decision.md`
- **Step 4 handoff**: `development-records/plan/20260424-phase4-stage3-step4-handoff.md`
- **Phase 4 handoff**: `development-records/plan/20260419-phase4-handoff.md`
- **§14.6 invariant** (정본): `.onto/processes/govern.md §14.6`
- **product-locality principle**: `.onto/principles/product-locality-principle.md`
