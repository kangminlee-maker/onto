---
as_of: 2026-04-25
status: active
functional_area: phase-4-stage-3-wrap-up
purpose: |
  Phase 4 Stage 3 (Step 1~4) 누적 결정 single index + 6 영역 canonical authority
  map + v1 scope/v1.1 backlog index + Track B 구현 세션 W-ID list (W-A-80~) +
  pre-check checklist + canonical seat migration plan.

  Stage 3 의 4 Step decision 문서 (PR #201/#202/#208/#213) 가 single source 의
  index seat. 본 문서는 derived synthesis — original Q meaning / canonical
  authority 는 각 Step decision + protocol 이 sole source.
source_refs:
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (PR #201 bae608e, 16 Q 일괄 승인)"
  step_1_protocol: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 7 rounds clean pass)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (PR #202 d15a17d, 22 Q + r3-amendment via PR #214 095f431)"
  step_2_protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 6 rounds clean pass + 3-action amendment via PR #213)"
  step_3_decision: "development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md (PR #208 5201c22, 22 Q-S3 + 2 P-DEC 일괄 승인)"
  step_3_protocol: "development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md (r6, 6 rounds clean pass)"
  step_4_decision: "development-records/evolve/20260424-phase4-stage3-step4-integration-decision.md (PR #213 bdf8a3d, 58 Q-S4 + P-DEC-A1 reaffirm 일괄 승인)"
  step_4_protocol: "development-records/evolve/20260424-phase4-stage3-step4-integration.md (r15, 15 rounds clean pass)"
  phase_4_handoff: "development-records/plan/20260419-phase4-handoff.md"
  step_4_handoff: "development-records/plan/20260424-phase4-stage3-step4-handoff.md (Stage 3 wrap-up §3.1 seat 명시)"
  invariant: ".onto/processes/govern.md §14.6"
revision_history:
  - revision: r0
    date: 2026-04-25
    basis: "Stage 3 Step 4 (PR #213 bdf8a3d) + backfill (PR #214 095f431) main 머지 직후 wrap-up 진입"
    scope_summary: |
      4 Step 누적 118 Q index (Step 1: 16 + Step 2: 22 + Step 3: 22 + Step 4: 58) + 2 unique P-DEC (P-DEC-A1 amendment + P-DEC-A2 operation enum rename) + 6 영역 canonical authority map + Track B W-ID list (W-A-80 ~ W-A-104, 25 W-ID) + pre-check checklist + canonical seat migration plan (Step 4 §7.2 consume).
  - revision: r1
    date: 2026-04-25
    basis: "wrap-up r1 codex review (.onto/review/20260425-a4d5e4f8) — 3 Consensus positive (Q 분포 / W-ID coverage / derived-index self-position) + 1 Conditional + 2 Disagreement + 5 UF (모두 wording/index 보정, structural 변경 없음)"
    scope_summary: |
      (1) §1.1 PR 표기 — "4 PRs main merged" → "4 decision PR + 1 backfill PR" 명시화 (#201/#202/#208/#213 + #214)
      (2) §2.3 cross-area integration table — `↔` → `→` direction column 추가 (one-way vs two-way 명시, UF-dependency 해소)
      (3) §3.1 Hook taxonomy — "Hook 4 종" wording 분리 — conceptual taxonomy (4 hooks) vs executable surface (3 hooks, β 자동 파생) 명시 (UF-semantics 해소)
      (4) §4.1 W-ID 부여 원칙 — "1 W-ID = 1 atomic commit" 명시 강화
      (5) §5.1 ls glob 보정 — Step 1 protocol prefix `20260422` 추가 (UF-structure 해소, 9-file authority chain verify)
      (6) §6.1 — 8 promotion seats (Track B 작업 대상) vs already-consumed amendment 분리 (§6.1a / §6.1b)
      (7) §6.2 — phase grouping vs commit unit 정합 ("1 W-ID = 1 atomic commit" 변경 없음, phase 는 의존 cluster)
      (8) §6.3 + §2.2 + §8 — `superseded-by-canonical-seats` template 단일화 (UF-evolution 해소)
      (9) §8 Lifecycle supersede trigger — W-A-80~W-A-85 → W-A-80~W-A-87 (role 파일 W-A-86/87 까지 포함, Hook α/γ canonical authority 완전 promotion 조건)
  - revision: r2
    date: 2026-04-25
    basis: "wrap-up r2 codex review (.onto/review/20260425-6ceb9ef2) — 3 Consensus positive (r1 wording 모두 해소) + 1 Conditional (derived-index 본질 W-A-104 신규성에 의존) + 1 Disagreement (W-A-104) + 6 UF. derived-index 자기위치 final closure"
    scope_summary: |
      (1) W-A-104 explicit authority 부여 — Step 4 protocol §8 (§14.6 dogfood SDK-like invariant verification path) + 본 wrap-up §5.6 test coverage commitment 의 dual source. wrap-up 이 새 implementation authority 도입 안 함을 명시화 (Disagreement 해소)
      (2) UF-dep-01 W-A-95/96 vs W-A-97 sequencing 역전 — version_hash (W-A-97) 가 CLI (W-A-95/96) 의 producer prerequisite 명시 + §4.3 commit order reorder
      (3) UF-dep-02 W-A-100 vs W-A-94 sequencing 역전 — raw write seat (W-A-94) 가 mirror write (W-A-100) 의 sink prerequisite 명시 + §4.3 commit order reorder
      (4) UF-coverage-01 §6.1c 신설 — Step 1 보조 계약 (rationale_state lifecycle / fail-close / manifest_schema_version compatibility / carry_forward 의미 / §14.6 invariant 적용) post-promotion landing zone 5 항목 명시
      (5) UF-coverage-02 §5.3 pre-check 확장 — runtime/test landing surface (`src/core-runtime/**`, test) 추가
      (6) UF-semantics-01 — `seat` 용어 분리: `authority seat` (canonical content) vs `implementation landing zone` (runtime code) 명시 (§6.1a opening + 본문)
      (7) UF-semantics-02 — `mirror marker` scope 분리: `canonical-mirror-of` (authority seat 간) vs `runtime-mirror-of` (runtime code ↔ authority). W-A-102 obligation scope 정의 (§5.5)
  - revision: r3
    date: 2026-04-25
    basis: "wrap-up r3 codex review (.onto/review/20260425-757760fb) — 2 Consensus (C-01 mirror taxonomy 불일치 + C-02 positive r2 closure 인정) + 1 CC + 1 Disagreement (D-01 W-A-103/104 runtime-mirror scope 우려) + 0 UF + 0 Axiology proposed. derived-index final closure 직전 wording residue"
    scope_summary: |
      (1) IA-01 + C-01 — §4.1 + §6.2 의 generic `<!-- mirror-of: ... -->` 문구 → §5.5 canonical 2-scope 명시화. W-A-80~W-A-87 → `canonical-mirror-of`, W-A-88~W-A-104 전수 → `runtime-mirror-of` 명시 (marker taxonomy 가 다시 3종처럼 보이는 문제 해소)
      (2) IA-02 + D-01 — §5.5 runtime-mirror scope 를 W-A-88~W-A-100 → **W-A-88~W-A-104 전수** 로 확장 (config switches W-A-103 + E2E verify W-A-104 포함). evolution lens 우려 (Step 4 §8/§14.6 변경 시 자동 추적 집합 밖) 해소
      (3) W-A-102 description 동기화 — runtime-mirror scope 를 W-A-88~W-A-104 전수로 sync, W-A-102 가 final cross-cutting pass (누락 검출 + 일관성 verify) 명시
      derived-index 본질 final closure. clean pass 목표.
  - revision: r4-clean-pass
    date: 2026-04-25
    basis: "wrap-up r4 codex review (.onto/review/20260425-e8fbf906) — **CLEAN PASS** (3 Consensus all positive: mirror-marker closure / dependency closure / coverage + axiology + derived-synthesis 자기위치 유지) + 0 Conditional + 1 minor solo Disagreement (semantics lens, runtime-mirror prose vs W-A-101 schema 미세 ambiguity) + 0 Axiology proposed + 0 UF + **0 Immediate Actions Required**. Review 명시: 'the only preserved residue is editorial rather than structural or contractual'"
    scope_summary: |
      r4 본문 변경 없음 (r4 review 가 r3 의 IA-01/IA-02 closure 를 인정 + Recommendation 1 은 clarity improvement, not required for this round 평가). 본 entry 는 r4 review CLEAN PASS 도달 기록 + Stage 3 wrap-up final closure 선언.

      Stage 3 wrap-up 4 rounds review cycle 완결: r1 (wording/index) → r2 (W-A-104 self-positioning) → r3 (mirror taxonomy semantic precision) → r4 (CLEAN PASS).

      derived-index 본질 final closure 완료 — Track B 진입 ready.
---

# Phase 4 Stage 3 Wrap-up — 4 Step 누적 결정 + Track B 진입 input

## 0. 본 문서의 목적

Phase 4 Stage 3 의 **4 Step 종결** 직후 누적 결정 + Track B 구현 세션 진입 input 을 single seat 로 정리. 본 문서는:

- **derived synthesis** — 원본 Q meaning / canonical authority 는 각 Step decision + protocol 문서가 sole source. 본 wrap-up 은 index + pointer
- Track B 구현 세션의 **bootstrap document** — W-ID list + pre-check checklist + canonical seat migration sequencing
- Stage 3 의 **종결 record** — 4 PR 머지 trail + 결정 점수 + scope boundary

본 문서가 새로운 결정을 도입하지 않음 (additive 아님). 기존 4 Step decision 의 누적 view.

## 1. 4 Step 누적 결정 집계 (118 Q + 2 P-DEC)

### 1.1 Q 점수 분포 (count authority: 각 Step decision + Step 4 protocol §9.2)

| Step | Q 수 | 구성 | Decision PR |
|---|---|---|---|
| **Step 1** (차이 축) | 16 | Q1 ~ Q16 (single batch) | #201 (bae608e) |
| **Step 2** (Hook α Proposer) | 22 | r1 8 + r2~r3 12 + r5 2 | #202 (d15a17d) + r3-amendment via #214 (095f431) |
| **Step 3** (Hook γ Reviewer) | 22 | r1 8 + r2~r3 12 + r2 신규 2 | #208 (5201c22) |
| **Step 4** (4 영역 통합) | 58 | δ 9 + P3.5 16 + raw 7 + CLI 21 + amend 4 + migration 1 | #213 (bdf8a3d) |
| **총계** | **118** | | **4 decision PR + 1 backfill PR** main merged (#201 / #202 / #208 / #213 + #214) |

### 1.2 Step 1 (16 Q) — 차이 축 재정의

| Q | 의미 | canonical seat |
|---|---|---|
| Q1 | Canonical seat 단일화 | Step 1 §4.1 |
| Q2 | Rationale state lifecycle (single enum) | Step 1 §4.2 |
| Q3 | Hook α (초기 rationale 생성) LLM 주체 | Step 1 §7.1 |
| Q4 | Hook β (Stage 2 propagation) 성격 (자동 파생) | Step 1 §7.2 |
| Q5 | Hook γ (rationale review) LLM 주체 | Step 1 §7.3 |
| Q6 | Hook γ 실패 처리 | Step 1 §7.4 |
| Q7 | Principal 검증 표면 (Hook δ) | Step 1 §7.6~§7.9 |
| Q8 | Fail-close mode 분기 | Step 1 §5.2 |
| Q9 | Domain-pack manifest | Step 1 §6.2 |
| Q10 | `--skip-intent-inference` flag rename | Step 1 §5.5 |
| Q11 | §14.6 dogfood SDK-like invariant 적용 | Step 1 §9.3 |
| Q12 | Manifest Producer CLI | Step 1 §6.4 |
| Q13 | Manifest schema version compatibility | Step 1 §6.3 |
| Q14 | `out_of_domain` state 분리 (`domain_scope_miss` 명명) | Step 1 §4.2 |
| Q15 | `carry_forward` 의미 고정 + batch action 매핑 | Step 1 §4.3 + §7.9 |
| Q16 | no-domain 경로 통일 | Step 1 §5.3 |

### 1.3 Step 2 (22 Q) — Hook α Rationale Proposer Protocol

count authority: Step 2 decision §2 (Q-S2-1~22). 22 Q 의 의미 + canonical seat 은 Step 2 protocol r6 + r3-amendment 가 single source.

**핵심 Q 군집** (요약, Step 2 decision §2 가 sole source):
- Input schema (Q-S2-1~6): wip.yml + manifest + domain pack + grouping_threshold 등 input 구성
- Output directive schema (Q-S2-7~14): 4 outcome (proposed / gap / domain_scope_miss / domain_pack_incomplete) + state_reason + provenance
- Runtime validation (Q-S2-15~17): reject 조건 + downgrade-only rules
- Stage transition runtime (Q-S2-18~20): meta.stage_transition_state 7 enum + steps 5a~5d
- r5 추가 (Q-S2-21~22): fallback_reason proposer_failure_downgraded enum + domain_refs required for domain_pack_incomplete

### 1.4 Step 3 (22 Q + 2 P-DEC) — Hook γ Rationale Reviewer Protocol

count authority: Step 3 decision §2 (Q-S3-1~22) + §3 (P-DEC-A1 + P-DEC-A2).

**핵심 Q 군집** (요약):
- Input schema (Q-S3-1~5): wip.yml 전수 + Step 2 결과 + provenance pair
- Output directive schema (Q-S3-6~12): 6 operation (confirm / revise / mark_domain_scope_miss / mark_domain_pack_incomplete / populate_stage2_rationale / 등) + element-level provenance schema (gate_count 포함)
- Runtime validation (Q-S3-13~16): reject 조건 + empty/non-empty partition
- Phase 2 Step 2c runtime (Q-S3-17~20): meta.step2c_review_state 7 enum + bridge to Step 4a/4b
- Failure handling (Q-S3-21~22): rationale_review_degraded + retry policy

**P-DEC**:
- **P-DEC-A1** — Step 2 protocol amendment authority (경로 A): 명세는 Step 3 PR #208, 실 edit 은 Step 4 PR #213 commit 3+4 (✅ 완결)
- **P-DEC-A2** — `operation` enum rename scope (경로 A): mark_* 류 operation 명명 단일화

### 1.5 Step 4 (58 Q) — 4 영역 통합

count authority: Step 4 protocol §9.2 (single authority). 영역별 분포는 Step 4 protocol §9.1 가 sole source pointer.

| 영역 | Q 수 | 범위 |
|---|---|---|
| Hook δ (§2) | 9 | Q-S4-δ-01 ~ Q-S4-δ-09 |
| Phase 3.5 (§3) | 16 | Q-S4-P3.5-01 ~ Q-S4-P3.5-16 |
| raw.yml meta (§4) | 7 | Q-S4-raw-01 ~ Q-S4-raw-07 |
| onto domain init CLI (§5) | 21 | Q-S4-CLI-01 ~ Q-S4-CLI-21 |
| Step 2 amendment (§6) | 4 | Q-S4-amend-01 ~ Q-S4-amend-04 |
| Canonical seat migration (§7) | 1 | Q-S4-migrate-01 |

**P-DEC** (Step 3 P-DEC-A1 reaffirm + 실 edit 완결):
- Step 4 PR #213 commit 3 (Step 2 protocol 3 지점 patch) + commit 4 (Step 2 decision r3-amendment) + PR #214 (related_pr backfill)

### 1.6 Q lookup convention (drift 방지)

본 §1 은 Q 점수 분포 + Q 군집 요약. 각 Q 의 정확한 wording / canonical authority / acceptance 는 다음 chain 으로 lookup:

```
[Step decision] §2 (Q list + canonical seat pointer)
  → [Step protocol] § (canonical content)
    → 본 wrap-up §2 (영역별 canonical seat consolidation)
```

본 wrap-up 은 Q 의 wording 을 재진술하지 않음 — count + 영역 grouping + lookup chain 만 제공.

## 2. 6 영역 canonical authority map

### 2.1 현재 (Stage 3 종결, Track B 진입 전)

| 영역 | Current canonical (development-records/evolve/) |
|---|---|
| **Hook α (Rationale Proposer)** | Step 2 protocol §2~§7 (r6 + r3-amendment) |
| **Hook γ (Rationale Reviewer)** | Step 3 protocol §2~§7 (r6) |
| **Hook δ (Phase 3 rendering)** | Step 4 protocol §2 (r15) |
| **Phase 3.5 write-back** | Step 4 protocol §3 (r15) |
| **raw.yml meta 확장** | Step 4 protocol §4 (r15) |
| **`onto domain init` CLI** | Step 4 protocol §5 (r15) |

**보조 seats**:
- Rationale state lifecycle: Step 1 §4.2 (canonical enum, 13 states 합산)
- Fail-close contract: Step 1 §5
- §14.6 dogfood SDK-like invariant: Step 4 protocol §8
- Canonical seat migration plan: Step 4 protocol §7.2~§7.4

### 2.2 Post-promotion (Track B canonical seat migration 후)

| 영역 | Post-promotion canonical | Step 4 §7.3 commit step |
|---|---|---|
| Hook α | `.onto/roles/rationale-proposer.md` (role 본문) + `.onto/processes/reconstruct.md §Phase 1 Stage Transition` | Track B step 2 + 3 |
| Hook γ | `.onto/roles/rationale-reviewer.md` (role 본문) + `.onto/processes/reconstruct.md §Phase 2 Step 2c` | Track B step 2 + 3 |
| Hook δ | `.onto/processes/reconstruct.md §Phase 3` | Track B step 2 |
| Phase 3.5 | `.onto/processes/reconstruct.md §Phase 3.5` | Track B step 2 |
| raw.yml meta | `.onto/processes/reconstruct.md §Phase 4` | Track B step 2 |
| `onto domain init` CLI | `.onto/commands/domain-init.md` (신설) | Track B step 3 |

**runtime code seats** (Track B step 4): `src/core-runtime/**` (각 영역 별 module).

**post-promotion 시 본 development-records/evolve 문서들 status 전환**: `active` → `superseded-by-canonical-seats` (template 단일, frontmatter update — §6.3 와 align). 단 archive 대상 아님 — 결정 이력 pointer 로 유지.

### 2.3 Cross-area integration points

Track B 구현 시 6 영역이 상호 의존하는 contract pair (direction column 으로 one-way / two-way 명시 — UF-dependency 해소):

| pair | direction | 의미 | canonical refs |
|---|---|---|---|
| Hook α ↔ Hook γ | two-way (mirror) | Step 2 amendment 5 mirror points (§3.8 / §3.8.1 / §4 / §5 / §6.2) — Step 2/3 protocol 양방향 mirror | Step 3 §10.1 mandatory mirror marker enforcement |
| Hook γ → Hook δ | one-way (γ writes / δ reads) | gate_count + reviewed_at + rationale_review_degraded + element-level provenance triple-read | Step 3 §10.1 Step 4 read contract pair |
| Hook δ → Phase 3.5 | one-way (δ writes / 3.5 reads) | phase3-snapshot.yml render-time snapshot + rationale-queue.yaml exhaustive partition | Step 4 §3.5.1 rule 3 + §2.7 |
| Phase 3.5 → raw.yml | one-way (3.5 writes / raw consumes) | element-level intent_inference block + carry_forward_from + principal_judged_at element-level seat | Step 4 §4.3 + §3.5.2 sweep |
| CLI → raw.yml | one-way (manifest mirror) | manifest.recovery_from_malformed → meta.manifest_recovery_from_malformed | Step 4 §4.4 + §5.6.1 |
| CLI → Hook α/γ | one-way (manifest provides input) | manifest.yaml schema (referenced_files / quality_tier / domain_manifest_version / version_hash) | Step 4 §5.4.2 + Step 1 §6.2 |

## 3. v1 scope 전수 + v1.1 backlog index

### 3.1 v1 scope (Track B 구현 대상)

본 Stage 3 4 Step 결정으로 확정된 v1 scope:

**Hook taxonomy** (UF-semantics 해소 — conceptual taxonomy 4 종 vs executable surface 3 종 명시 분리):

- **Conceptual taxonomy** (4 hook concepts): α (rationale propose) / β (Stage 2 propagation) / γ (rationale review) / δ (Phase 3 surface)
- **Executable surface** (3 runtime hook implementations): α + γ + δ. **β 는 별도 hook 없음** — Explorer prompt 주입 규칙으로 자동 파생 (Step 1 §7.2)

**v1 scope (executable surface)**:
1. Hook α Rationale Proposer (Stage 1 → 2 transition)
2. Hook γ Rationale Reviewer (Phase 2 Step 2c)
3. Hook δ Phase 3 Principal 검증 surface
4. Phase 3.5 write-back (Runtime sole-writer)
5. `onto domain init` CLI (3 branches: init / `--migrate-existing` / `--regenerate`)

**Schema 확장**:
- `wip.yml` 확장 (8 영역 — Step 2 §6.3 + Step 3 §6.3 + Step 4 §3.6 + §4.3 element-level intent_inference)
- `raw.yml` element-level intent_inference block + meta 9 신규 fields (Step 4 §4.1)
- `manifest.yaml` 8 fields (3-category taxonomy, Step 4 §5.4.2)
- 신규 artifacts: `rationale-queue.yaml` (Step 4 §2.7) + `phase3-snapshot.yml` (Step 4 §3.5.1) + `wip-2c-snapshot.yml` + `domain-files-2c-snapshot.yml` (Step 3 §3.7.1)

**Failure code canonical** (Step 4 §5.6.3):
- `manifest_malformed` / `manifest_version_format_invalid` / `manifest_version_not_incremented` / `config_schema_invalid`
- 각 code × origin (interactive / non-interactive) recovery path matrix

**Runtime guards** (cross-area):
- Pre-load gate (`manifest_identity_mismatch` / `manifest_malformed` / `manifest_version_format_invalid`)
- Hash mismatch (`manifest_version_hash_mismatch`)
- Phase 3.5 validation step 1.5 (`phase_3_5_input_invalid` / `phase_3_5_input_incomplete`)
- Re-entry bound (`phase_reentry_bound_exhausted`, v0 기존)

### 3.2 v1.1 backlog index (각 protocol §10.2 통합)

| backlog | source protocol | 의미 |
|---|---|---|
| Smallest-sufficient-bundle input injection (chunked review) | Step 3 §10.2 | v1 single-shot 대신 entity 단위 chunked. Step 2/3 모두 영향 |
| `pack_missing_areas` semantic refinement | Step 2 §6.3.1 + Step 3 §10.2 | Reviewer directive `pack_missing_areas_refinement[]` field 추가 (heading paraphrase 매칭) |
| Cross-batch consistency | Step 3 §10.2 | chunked review 도입 시 동일 domain 개념의 inter-batch coherence check |
| Per-update `__truncation_hint` field | Step 3 §10.2 | r2 제거됐던 entity-level truncation audit surface — chunked review 도입 시 재검토 |
| `reviewer_contract_version` major bump 시 재검증 rule | Step 3 §10.2 | major bump 시 기존 reviewed element 의 자동 재검증 vs Principal 재판정 queue 결정 |
| Axiology lens role 확장 | Step 3 §10.2 | `.onto/roles/axiology.md` Core questions 에 Principal Burden Accounting sub-check |
| `onto domain manifest-migrate` CLI | Step 4 §10.2 + Step 1 §6.3 | manifest_schema_version 1.0 → 2.0 migration |
| `pack_missing_areas` stable identity | Step 4 §10.2 | `(manifest_ref, heading)` 가 heading rename 시 continuity 훼손 — `heading_hash` 또는 stable id 도입 |
| Chunked Phase 3 rendering | Step 4 §10.2 | entity 100+ session 의 `max_individual_items` multi-page pagination |
| Phase 3 UI framework 전환 | Step 4 §10.2 | markdown template → interactive React/CLI TUI |
| `manifest_schema_version` config file 승격 | Step 4 §10.2 | runtime constant → `.onto/config.yml` reader |
| `rationale-queue.yaml` append-only log mode | Step 4 §10.2 | re-render 시 historical snapshot 유지 |
| Product-local override path | Step 4 §10.2 | `{product}/.onto/domains/{domain}/` override + `domain-resolve-order` canonical |
| `--regenerate` diff reporting + migration-assisted edit | Step 4 §10.2 | regeneration 전후 referenced_files / quality_tier / version diff 요약 |
| Phase 3.5 partial recovery | Step 4 §10.2 | validation fail 시 valid entries 만 apply (v1 은 all-or-nothing) |
| `global_reply` "finalize" rename | Step 4 §10.2 | "confirmed" naming vs procedural closure semantic 정합 |
| Partial γ-degraded handling | Step 4 §10.2 | rationale partial write 의 별도 render |
| `manifest.yaml` signature / provenance trail | Step 4 §5.6.2 | "YAML-valid manual bump + unchanged pack" 감지 (v1 intentional limitation 해소) |
| validated manual edit mode (`onto domain manifest-validate`) | Step 4 §5.4.2 | 편집 후 version_hash + bump + schema 재검증 후 commit |
| Pre-malformed version 복원 assisted mode | Step 4 §5.6.1 | malformed recovery 시 backup 파일 manual read 후 continuity 복원 |

**v1.1 도입 시점**: Track B 의 v1 구현 안정 + production usage 누적 + Principal feedback 기반. 본 wrap-up 은 backlog 기록만 — 도입 결정은 별도 Stage.

## 4. Track B 구현 세션 W-ID list (W-A-80 ~ W-A-104, 25 W-ID)

### 4.1 W-ID 부여 원칙

- 본 Stage 3 4 Step protocol 의 결정을 **mechanical implementation** 하는 W-ID
- 각 W-ID 는 **1 atomic commit 단위** (single coherent change, test 포함). W-ID 단위로 commit message + branch + (optional) PR 가능
- mirror marker 부착 obligation — §5.5 canonical 2-scope taxonomy: `canonical-mirror-of` (authority seat 간, W-A-80~W-A-87 + W-A-102 대상) / `runtime-mirror-of` (runtime code ↔ authority, W-A-88~W-A-104 + W-A-102 대상). W-A-103/104 도 포함 — D-01 evolution 우려 해소
- W-A-80 ~ W-A-104 (Track B 진입 시 25 신규 W-ID)
- W-A-79 까지는 Phase 3 "execution-phase progress" 누적 (memory `project_execution_phase_progress.md` 참조)

### 4.2 영역별 W-ID 분포

#### 4.2.1 Canonical seat migration (Track B step 2 + 3)

| W-ID | 작업 | source protocol |
|---|---|---|
| **W-A-80** | `.onto/processes/reconstruct.md` §Phase 1 Stage Transition 확장 — Hook α Proposer 통합 | Step 2 protocol §6.2 + r3-amendment §6.3 |
| **W-A-81** | `.onto/processes/reconstruct.md` §Phase 2 Step 2c 신설 — Hook γ Reviewer | Step 3 protocol §6.2 |
| **W-A-82** | `.onto/processes/reconstruct.md` §Phase 3 확장 — Hook δ rendering + throttling + evidence + triple-read | Step 4 protocol §2 |
| **W-A-83** | `.onto/processes/reconstruct.md` §Phase 3.5 확장 — action-first matrix + step sequencing + validation + sweep | Step 4 protocol §3 |
| **W-A-84** | `.onto/processes/reconstruct.md` §Phase 4 확장 — raw.yml meta canonical schema + element-level intent_inference persist | Step 4 protocol §4 |
| **W-A-85** | `.onto/commands/domain-init.md` 신설 — 3 branches + product-locality exception + 4 failure codes | Step 4 protocol §5 |

#### 4.2.2 Role 파일 배치 (Track B step 2)

| W-ID | 작업 | source protocol |
|---|---|---|
| **W-A-86** | `.onto/roles/rationale-proposer.md` 신설 — Step 2 §5.1 본문 복사 + mirror marker | Step 2 protocol §5.1 |
| **W-A-87** | `.onto/roles/rationale-reviewer.md` 신설 — Step 3 §5.1 본문 복사 + mirror marker | Step 3 protocol §5.1 |

#### 4.2.3 Runtime code 작성 (Track B step 4)

| W-ID | 작업 | source protocol |
|---|---|---|
| **W-A-88** | Hook α runtime 구현 — Stage transition state machine + Proposer agent invocation + directive apply | Step 2 protocol §6 |
| **W-A-89** | Hook γ runtime 구현 — Phase 2 Step 2c state machine + Reviewer agent invocation + directive apply + retry | Step 3 protocol §6 + §7 |
| **W-A-90** | Hook δ runtime 구현 — Phase 3 rendering algorithm + priority score + 7-step partition + 4 bucket | Step 4 protocol §2.5 + §2.6 |
| **W-A-91** | `rationale-queue.yaml` artifact write — atomic write + histogram map | Step 4 protocol §2.7 |
| **W-A-92** | `phase3-snapshot.yml` artifact write — render-time atomic snapshot | Step 4 protocol §3.5.1 rule 3 |
| **W-A-93** | Phase 3.5 runtime 구현 — validation step 1.5 + rationale_decisions/batch_actions apply + carry_forward sweep + atomic fsync | Step 4 protocol §3.5 + §3.5.1 + §3.5.2 |
| **W-A-94** | raw.yml meta extended schema write — mutual exclusion validation + element-level intent_inference persist | Step 4 protocol §4 |
| **W-A-95** | `onto domain init` CLI 구현 — 3 branches (init / `--migrate-existing` / `--regenerate`) + interactive flow. **prereq: W-A-97** (version_hash algorithm 이 manifest atomic write 의 input) | Step 4 protocol §5.3 + §5.4 + §5.4.1 |
| **W-A-96** | `--config <path>` non-interactive CLI 구현 — schema validation + atomic write. **prereq: W-A-97** | Step 4 protocol §5.6 + §5.6.1 |
| **W-A-97** | `version_hash` algorithm 구현 — pack-spec + pack-content hash input + js-yaml canonical. **CLI/pre-load gate prerequisite** (W-A-95/96/99 의 의존 base) | Step 4 protocol §5.5 |
| **W-A-98** | Failure code canonical map runtime emit — `manifest_malformed` / `manifest_version_format_invalid` / `manifest_version_not_incremented` / `config_schema_invalid` | Step 4 protocol §5.6.3 |
| **W-A-99** | Pre-load gate 구현 — `manifest_identity_mismatch` (path ↔ domain_name) + required field check + `manifest_version_hash_mismatch`. **prereq: W-A-97** | Step 4 protocol §5.4.2 + §5.5 |
| **W-A-100** | `recovery_from_malformed` audit signal write/clear rule + raw.yml mirror. **prereq: W-A-94** (raw.yml meta sink 가 mirror seat 의 base) | Step 4 protocol §5.6.1 + §4.1 + §4.4 |

#### 4.2.4 Schema + integration (Track B step 4 cross-cutting)

| W-ID | 작업 | source protocol |
|---|---|---|
| **W-A-101** | `wip.yml` schema 전수 확장 — Step 2 (intent_inference + meta.stage_transition_state + pack_missing_areas) + Step 3 (meta.step2c_review_state + element-level provenance + gate_count + wip_snapshot_hash + domain_files_content_hash + hash_algorithm + rationale_reviewer_failures_streak) + Step 4 (principal_provided_rationale + principal_note + principal_judged_at + carry_forward_from + carry_forward_from_schema_version) | Step 2/3/4 protocol cross-references |
| **W-A-102** | Cross-area mirror marker final coherence — **canonical-mirror** (W-A-80~W-A-87 authority seat 간) + **runtime-mirror** (W-A-88~W-A-104 전수, runtime/config/test 포함) 양 scope cross-cutting verify (§5.5 mirror marker scope 분리). 각 W-ID 의 자기 scope marker 는 해당 commit 책임, W-A-102 는 final cross-cutting pass (누락 검출 + 일관성 verify) | Step 3 §10.1 mandatory enforcement + Step 4 §7.3 |
| **W-A-103** | §14.6 dogfood SDK-like invariant config switches 구현 — `config.reconstruct.v1_inference.enabled` / `phase3_rationale_review.enabled` / `write_intent_inference_to_raw_yml.enabled` | Step 4 protocol §8.3 |
| **W-A-104** | E2E smoke test — full v1 cycle (manifest init → reconstruct full mode → Hook α → γ → δ → Phase 3 user reply → Phase 3.5 write-back → Phase 4 raw.yml save) | Step 4 protocol §8 (§14.6 dogfood SDK-like invariant verification path — off switch 작동 + govern reader 친화 확인은 E2E cycle 로만 검증 가능) + 본 wrap-up §5.6 test coverage commitment |

### 4.3 W-ID 의존 관계 + 권장 commit sequencing

권장 commit order (Track B 첫 commit ~ 마지막 commit) — r3 sequencing fix (UF-dep-01/02 해소):

```
W-A-80 ~ W-A-85 (canonical seat migration to .onto/processes + .onto/commands)
  ↓
W-A-86, W-A-87 (role 파일 배치)
  ↓
W-A-101 (wip.yml schema 전수 확장 — runtime code 의존성 base)
  ↓
W-A-97 (version_hash algorithm — CLI / pre-load gate prerequisite)        ← r3 reorder
  ↓
W-A-99 (pre-load gate, prereq: W-A-97)
  ↓
W-A-95, W-A-96 (CLI init / --config — prereq: W-A-97)                     ← r3 reorder
  ↓
W-A-88 (Hook α runtime)
  ↓
W-A-89 (Hook γ runtime)
  ↓
W-A-90, W-A-91, W-A-92 (Hook δ + 2 artifacts)
  ↓
W-A-93 (Phase 3.5 runtime)
  ↓
W-A-94 (raw.yml meta sink — extended schema write)                         ← r3 reorder (W-A-100 의 prereq)
  ↓
W-A-100 (recovery_from_malformed mirror — prereq: W-A-94 raw sink)         ← r3 reorder
  ↓
W-A-98 (failure code emit — cross-cutting refinement)
  ↓
W-A-102 (mirror marker 전수 부착 — final coherence)
  ↓
W-A-103 (dogfood off switches)
  ↓
W-A-104 (E2E smoke test — Step 4 §8 §14.6 invariant verification + §5.6 test coverage commitment)
```

**Atomic commit** 원칙: 각 W-ID 가 single coherent change. test 포함. 25 W-ID = 25 atomic commit.

**Cross-W-ID coherence** (r3 명시):
- W-A-101 (wip.yml schema) 는 모든 runtime code W-ID 의 base — 먼저 착수
- W-A-97 (version_hash algorithm) 은 W-A-95/96/99 의 producer prerequisite (manifest pipeline 의 hash producer 가 모든 consumer 보다 먼저)
- W-A-94 (raw.yml meta sink) 는 W-A-100 (mirror write) 의 sink prerequisite (raw write seat 가 mirror 의 base)
- W-A-102 (mirror marker) 는 모든 canonical seat + role + command + runtime code 의 final coherence — 마지막 부근

## 5. Track B 진입 전 pre-check checklist

### 5.1 main 동기 + decision trail 확인

```bash
git checkout main && git pull --ff-only origin main
git log --oneline origin/main | grep -E "#201|#202|#208|#213|#214"
# 5 commits 확인:
#   095f431 chore(phase-4): Step 2 decision — backfill (#214)
#   bdf8a3d docs(phase-4): Stage 3 Step 4 — Integration (#213)
#   5201c22 docs(phase-4): Stage 3 Step 3 — Rationale Reviewer protocol (decision) (#208)
#   d15a17d docs(phase-4): Stage 3 Step 2 — Rationale Proposer protocol (decision) (#202)
#   bae608e docs(phase-4): Stage 3 Step 1 — reconstruct v1 차이 축 재정의 (decision) (#201)

ls development-records/evolve/20260422-phase4-stage3-step1-* \
   development-records/evolve/20260423-phase4-stage3-step1-* \
   development-records/evolve/20260423-phase4-stage3-step2-* \
   development-records/evolve/20260423-phase4-stage3-step3-* \
   development-records/evolve/20260424-phase4-stage3-step3-* \
   development-records/evolve/20260424-phase4-stage3-step4-* \
   development-records/evolve/20260425-phase4-stage3-wrap-up.md
# Step 1 protocol (20260422 prefix) + Step 1 decision (20260423) + Step 2 protocol/decision (20260423)
# + Step 3 protocol (20260423) + Step 3 decision (20260424) + Step 4 protocol/decision (20260424)
# + wrap-up (20260425) = 9 파일 main 존재
```

### 5.2 Track B branch + W-ID assignment

```bash
git checkout -b track-b/phase-4-stage-3-implementation
# 또는 W-ID 별 branch (예: track-b/W-A-80-phase3-canonical-seat-migration)
```

W-A-80 ~ W-A-104 의 commit log + memory 갱신 (`project_execution_phase_progress.md` 의 142 → 167 누적 update).

### 5.3 Pre-existing artifacts 확인 (r3 — runtime/test landing surface 포함, UF-coverage-02 해소)

**authority seat 확인** (Track B canonical promotion 대상):
```bash
ls .onto/processes/reconstruct.md          # canonical seat — extend 대상 (W-A-80~W-A-84)
ls .onto/processes/govern.md               # §14.6 invariant 확인
ls .onto/principles/product-locality-principle.md  # mirror note 추가 대상 (W-A-80~ commit 시)
ls .onto/roles/                             # rationale-proposer.md / rationale-reviewer.md 신설 (W-A-86/87)
ls .onto/commands/                          # domain-init.md 신설 (W-A-85)
```

**implementation landing zone 확인** (Track B runtime code 대상):
```bash
ls src/core-runtime/                        # runtime code 위치 (W-A-88~W-A-100)
ls src/core-runtime/cli/                    # CLI runtime (W-A-95~W-A-97 대상)
find src/core-runtime -name "*.test.ts"     # test landing — 각 W-ID 의 test 포함 commit
ls dist/                                    # build artifacts (필요 시 verify)
```

본 두 그룹을 모두 확인한 후 Track B 진입 — authority + implementation 양쪽 surface 가 준비됨을 보장.

### 5.4 §14.6 invariant commitment

Track B 모든 commit 은 §14.6 dogfood SDK-like invariant 준수 — 각 W-ID PR 머지 전 다음 4 점 확인:
1. dogfood off 가능 (config switch)
2. 들어내기 용이 (W-A-103 config switches 가 reference)
3. govern reader 친화 (raw.yml + manifest.yaml + rationale-queue.yaml 가 read-friendly)
4. 본질 sink ≠ dogfood sink (reconstruct ↔ govern direction 단방향)

### 5.5 Mirror marker enforcement (r3 — scope 분리, UF-semantics-02 해소)

Step 3 §10.1 + Step 4 §7.3 의 obligation. r3 에서 mirror marker 의 **2 종 scope** 명시:

- **canonical-mirror** (`<!-- canonical-mirror-of: step-{N}-{area} §X.Y -->`): authority seat 간 mirror — `.onto/processes/reconstruct.md` ↔ `.onto/roles/*.md` ↔ `.onto/commands/*.md` ↔ `development-records/evolve/*.md` 의 canonical content alignment. **W-A-80~W-A-87** promotion + W-A-102 final pass 의 대상
- **runtime-mirror** (`<!-- runtime-mirror-of: step-{N}-{area} §X.Y -->`): runtime code / config / test (`src/core-runtime/**`, config switches, E2E test) ↔ authority seat 의 implementation alignment. **W-A-88~W-A-104 전수** (runtime W-A-88~W-A-100 + cross-cutting W-A-101 + final coherence W-A-102 + dogfood switches W-A-103 + E2E verify W-A-104) 의 각 commit 에서 부착. W-A-102 final pass 가 cross-cutting verify (D-01 evolution 우려 해소 — W-A-103/104 가 runtime-mirror scope 안에 포함)

W-A-102 의 obligation 은 **두 scope 모두** 의 final coherence — 단, 각 W-ID 의 commit 에서 자기 scope 의 marker 부착은 그 W-ID 책임. W-A-102 는 누락 검출 + 일관성 final verify.

### 5.6 Test coverage commitment

각 W-ID 의 commit 에 unit test 또는 E2E test 포함. W-A-104 가 final E2E smoke test (full v1 cycle). v1 실 production usage 전 단계.

## 6. Canonical seat migration plan (Step 4 §7.2~§7.4 consume)

### 6.1a Migration 대상 (8 authority seats — Track B canonical promotion 대상)

**Authority seat** (canonical content 위치) vs **Implementation landing zone** (runtime code 위치) 분리 — UF-semantics-01 해소. 본 §6.1a 는 **authority seat** 만 다룸. Implementation landing zone (`src/core-runtime/**`) 은 §4.2.3 W-A-88~W-A-100 의 W-ID 가 직접 다룸.

| source | authority seat | W-ID |
|---|---|---|
| Step 2 §6 (Hook α Stage transition) | `.onto/processes/reconstruct.md §Phase 1 Stage Transition` | W-A-80 |
| Step 3 §6 (Hook γ Phase 2 Step 2c) | `.onto/processes/reconstruct.md §Phase 2 Step 2c` | W-A-81 |
| Step 4 §2 (Hook δ) | `.onto/processes/reconstruct.md §Phase 3` | W-A-82 |
| Step 4 §3 (Phase 3.5) | `.onto/processes/reconstruct.md §Phase 3.5` | W-A-83 |
| Step 4 §4 (raw.yml meta) | `.onto/processes/reconstruct.md §Phase 4` | W-A-84 |
| Step 4 §5 (CLI) | `.onto/commands/domain-init.md` 신설 | W-A-85 |
| Step 2 §5.1 (role) | `.onto/roles/rationale-proposer.md` | W-A-86 |
| Step 3 §5.1 (role) | `.onto/roles/rationale-reviewer.md` | W-A-87 |

### 6.1c Step 1 보조 계약 landing zone (r3 UF-coverage-01 해소)

Step 1 은 8 영역 외 **보조 계약** 도 확정. post-promotion 시 다음 location 에 landing:

| Step 1 보조 계약 | post-promotion landing |
|---|---|
| §4.2 Rationale state lifecycle (canonical enum 13 states) | `.onto/processes/reconstruct.md §Phase 4 raw.yml schema` (intent_inference.rationale_state enum 정의) — Step 4 §4.3 element-level block 와 함께 |
| §5 Fail-close contract (entry conditions + Inference Mode 3 분기 + halt 분기) | `.onto/processes/reconstruct.md §Domain Selection / §Phase 0` (entry gate) + `.onto/commands/domain-init.md` (CLI 가 fail-close 의 producer side) |
| §6.3 manifest_schema_version compatibility (parse-time check) | `.onto/commands/domain-init.md §schema_version compatibility rule` (Step 4 §5.7 와 함께) + reconstruct runtime supported_list constant |
| §4.3 carry_forward 의미 + §7.9 batch action 매핑 | Step 4 §3.1 + §3.9 → `.onto/processes/reconstruct.md §Phase 3.5` (W-A-83) — 별도 W-ID 부여 없음, W-A-83 안에 포함 |
| §11 §14.6 dogfood SDK-like invariant 적용 점검 | Step 4 §8 → W-A-103 (dogfood off switches) + W-A-104 (E2E verify) |

### 6.1b Already-consumed amendments (Track B 작업 아님)

| source | 처리 | merge trail |
|---|---|---|
| Step 4 §6 (Step 2 protocol amendment 3 action) | PR #213 commit 3 + commit 4 + PR #214 backfill 로 main merged 완결 | bdf8a3d / 095f431 |

### 6.2 Migration phase grouping (Step 4 §7.3 mirror — atomicity 보존)

본 §6.2 는 **phase grouping** 만 표기. **commit unit 은 §4.1 의 1 W-ID = 1 atomic commit** 원칙이 변경 없이 유효 — 본 phase grouping 은 의존 cluster 표시이지 multi-W-ID merge 가 아님.

| phase | W-ID range | 작업 cluster |
|---|---|---|
| 0 | (본 wrap-up PR) | Track B 진입 직전 single-source 확정 |
| 1 — canonical seat migration | W-A-80 ~ W-A-85 (6 atomic commits) | `.onto/processes/reconstruct.md` Phase 1/2c/3/3.5/4 + `.onto/commands/domain-init.md` 신설 — content 이식 + mirror marker |
| 2 — role 파일 | W-A-86 ~ W-A-87 (2 atomic commits) | `.onto/roles/rationale-proposer.md` + `rationale-reviewer.md` 배치 |
| 3 — runtime code | W-A-88 ~ W-A-100 (13 atomic commits) | canonical seat 만 참조하는 runtime 구현 |
| 4 — cross-cutting | W-A-101 ~ W-A-104 (4 atomic commits) | wip schema 전수 + mirror marker 전수 + dogfood off switches + E2E smoke |

각 W-ID 는 **독립 commit** (test 포함). phase 는 단순 의존 cluster 표시. 각 commit 의 marker 부착은 §5.5 canonical 2-scope (W-A-80~W-A-87 → `canonical-mirror-of`, W-A-88~W-A-104 → `runtime-mirror-of`) 에 따름. W-A-102 가 cross-cutting final coherence 보장.

### 6.3 Post-promotion authority chain (Step 4 §7.4 mirror)

```
Level 1 (runtime-facing): .onto/processes/reconstruct.md
Level 2 (CLI contract): .onto/commands/domain-init.md
Level 3 (role spec): .onto/roles/rationale-proposer.md + rationale-reviewer.md
Level 4 (historical decision): development-records/evolve/202604{22,23,24,25}-phase4-stage3-*-*.md (post-promotion superseded-by, 본 wrap-up 포함 + Step 1 protocol 20260422 prefix 포함)
```

post-promotion 시 Stage 3 4 Step protocol + decision + 본 wrap-up 의 frontmatter `status` field:
- `active` → **`superseded-by-canonical-seats`** (template 단일화 — UF-evolution 해소: `seat` 단수형 vs `seats` 복수형 혼재 제거)
- 단, archive 대상 아님 — 결정 이력 pointer 로 유지 (frontmatter `source_refs` 가 lookup chain)

## 7. 본 문서의 위치

- **Previous (Stage 3)**:
  - Step 1 (PR #201 bae608e, 16 Q 승인) — 차이 축
  - Step 2 (PR #202 d15a17d, 22 Q 승인 + r3-amendment via PR #214) — Hook α Proposer
  - Step 3 (PR #208 5201c22, 22 Q-S3 + 2 P-DEC 승인) — Hook γ Reviewer
  - Step 4 (PR #213 bdf8a3d, 58 Q-S4 + P-DEC-A1 reaffirm 승인) — 4 영역 통합
  - Step 4 backfill (PR #214 095f431) — Step 2 decision related_pr backfill
- **Current (본 문서)**: Stage 3 wrap-up — 4 Step 누적 118 Q + 25 W-ID + canonical seat migration plan
- **Next**: Track B 구현 세션 (W-A-80 ~ W-A-104)

**Revision 이력의 단일 authority**: frontmatter `revision_history:` (YAML).

## 8. Lifecycle

- **Active**: Track B 구현 진입 직전까지 single source 로 활용
- **Superseded**: Track B 가 **W-A-80 ~ W-A-87** (canonical seat migration phase 1 + role 파일 phase 2 — §6.2 phase 1+2 전체) commit 머지 완료 시 frontmatter status `active` → `superseded-by-canonical-seats` 전환. role 파일 (`.onto/roles/rationale-proposer.md` / `rationale-reviewer.md`, W-A-86/87) 까지 포함되어야 Hook α/γ canonical authority 가 완전히 promotion 되므로 W-A-85 만으로는 불충분 — UF-logic/dependency/evolution 해소
- **Archive**: 결정 이력 pointer 로 development-records/evolve/ 에 유지 (delete 대상 아님)

## 9. 참조

- **4 Step decision**: source_refs 참조
- **4 Step protocol**: source_refs 참조
- **Phase 4 handoff**: `development-records/plan/20260419-phase4-handoff.md`
- **Step 4 handoff** (wrap-up §3.1 seat 명시): `development-records/plan/20260424-phase4-stage3-step4-handoff.md`
- **§14.6 invariant** (정본): `.onto/processes/govern.md §14.6`
- **product-locality principle**: `.onto/principles/product-locality-principle.md`
- **execution-phase progress** (W-ID 누적 외부 참조): memory `project_execution_phase_progress.md` (W-A-79 까지 142 W-ID 누적)
