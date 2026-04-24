---
as_of: 2026-04-25
status: draft
functional_area: phase-4-stage-3-step-4-integration
revision: r15
revision_history:
  - revision: r1
    date: 2026-04-24
    basis: "Step 3 handoff + Step 1/2/3 확정 결정 + reconstruct.md v0 Phase 3/3.5/4 baseline"
    scope_summary: "4 영역 통합 초안 (Hook δ + Phase 3.5 write-back + raw.yml meta 확장 + onto domain init CLI) + Step 2 amendment 3 action 실 edit 명세. Step 1/2/3 decision re-open 아님."
  - revision: r2
    date: 2026-04-24
    basis: "r1 codex review (.onto/review/20260424-d6f6369d) — 6 Consensus + 2 Conditional Consensus + 11 Unique Findings + 5 Immediate Actions 전수 해소"
    scope_summary: |
      structural 재편: (1) `gate_count` canonical path 를 `intent_inference.provenance.gate_count` 단일 seat 로 고정 (§2.3 §3.6 §4.1 §4.3 §6.2 전수 sync).
      (2) `domain_scope_miss` accept 의 terminal 을 `principal_confirmed_scope_miss` 별도 state 로 분리 — 미판정 `domain_scope_miss` 유지 와 audit 구별 (§2.8 §3.1 §3.2).
      (3) γ full-failure 의 `throttled_out_count > 0` invariant 제거, "surface 된 element 가 0 이어서는 안 됨" 으로 재표현 (§2.6).
      (4) `empty` source state 를 §3.1 action matrix 에 `provide_rationale`/`mark_acceptable_gap` 경로 추가 + Phase 3 queue selection 포함 (§2.2 §3.1 §3.3).
      (5) Batch vocabulary 단일화 — `batch_actions[].action ∈ {accept,reject,defer,mark_acceptable_gap}` single enum, `_all` UI alias 는 rendering layer 에서만 (§3.4 §3.6).
      (6) `version_hash` input boundary — `referenced_files[].path` 만 input, `manifest.yaml` 자체 self-cycle 제외 (§5.5).
      (7) raw/meta mutual exclusion — `pack_optional_missing × minimal tier` overlap 제거, `manifest.quality_tier` vs `domain_quality_tier` 1:1 mapping 명시 (§4.2).
      (8) §9 decision surface 를 Q 라벨 + §2~§6 pointer only 로 축소 — second authority drift 제거.
      (9) §7 Stage 3 wrap-up 에 canonical seat migration plan 추가 — `reconstruct.md` promotion roadmap.
      (10) `onto domain init` global path 의 product-locality exception 명시 (§5.1 §5.9).
      (11) `carry_forward sweep` 이 `batch_actions[].target_element_ids` 독취 추가 (§3.5 step 8).
      (12) `gate_count` type 을 extensible integer 로 재정의 (§2.3 §4.3).
      (13) priority formula `confidence = null` 처리 명시 (§2.5).
      (14) Phase 3.5 malformed/stale Principal decision validation step 삽입 (§3.5 step 2-pre).
      (15) `onto domain init` regeneration branch 추가 (§5.4).
      (16) `pack_missing_areas` stable identity 는 v1.1 backlog 로 이연 (§10.2).
      (17) `global_reply = "confirmed"` naming — `finalize` Recommendation 으로 §10.2 기록, v1 은 `confirmed` 유지 (behavior documentation 명확화).
      (18) `carry_forward` artifact terminal vs semantic 미판정 구별 명시 (§3.9 확장).
  - revision: r3
    date: 2026-04-24
    basis: "r2 codex review (.onto/review/20260424-de77643f) — 3 Consensus + 1 Conditional + 1 Axiology + 4 Unique Findings 전수 해소. r2 Purpose Alignment 긍정 유지"
    scope_summary: |
      (1) §4.3 element schema single-seat 완전 정렬 — top-level `intent_inference.gate_count` 제거, `principal_judged_at` 을 `provenance.principal_judged_at` 단일 seat 로, `rationale_state` enum 에 `principal_confirmed_scope_miss` 포함, `provenance.carry_forward_from` 추가.
      (2) §4.4 persistence responsibility table 정렬 — `principal_judged_at` row 를 `provenance.principal_judged_at` 로 교정, `carry_forward_from` row 추가.
      (3) §3.5.2 sweep pseudocode bug fix — `rationale_state` overwrite 전에 `original_state` capture 후 `provenance.carry_forward_from = original_state` 기록. 3 invariant 명시 + §3.9 Layer B bridge 와의 정합.
      (4) §2.7 `rationale-queue.yaml` schema 일반화 — `gate_count_distribution.{single_gate, double_gate}` → `gate_count_histogram.<gate_count_str>` map (future-extensible), entries 의 `single_gate: boolean` field 제거 (UF-conciseness-01 해소, `gate_count == 1` derived).
      (5) §5.4.2 manual `manifest.yaml` edit 경로 closure (r3 Conditional Consensus) — `onto domain init --regenerate` 유일 수정 경로. runtime guard (`manifest_version_hash_mismatch` halt) 로 manual edit enforcement. contract 보강 option 은 v1.1 backlog.
      (6) §5.1.1 product-locality exception 재서술 — 3 scope canonical 구별 (domain pack content / manifest / product-specific state), shared-reference 예외는 좁게 유지, product-local override 는 v1.1 연장 layer (backlog 아님 — 원칙 확장). UF-axiology-01 해소.
      (7) §3.5.1 validation step 1.5 에 batch exact-match check (rule 7) 추가 — `batch_actions[i].target_element_ids` × `target_group` key 를 Runtime 이 재계산 후 exact-match 검증. UF-pragmatics-01 해소.
      (8) §3.6 schema 의 `global_reply` comment 확장 — behavior documentation 전면 노출 ("per-item + batch 명시 처리 안 된 pending 을 carry_forward 로 close" 명시). UF-semantics-01 해소.
      Step 1/2/3 재론 아님.
  - revision: r4
    date: 2026-04-25
    basis: "r3 codex review (.onto/review/20260424-3b7f0245) — 3 Consensus + 1 Disagreement + 6 Unique Findings 전수 해소. Purpose Alignment 긍정 유지, cleanup 성격"
    scope_summary: |
      (1) §2.5 priority formula 의 `element.single_gate ? 30 : 0` term 제거 — `gate_count_bonus` 와 duplicate signal (C-03 해소).
      (2) §3.6 `global_reply` enum 을 `"confirmed" | "see below"` 로 restrict (`"other"` 제거) + `"see below"` deterministic closure rule 명시 (C-01 해소).
      (3) §3.5.1 validation rule 3 에 render-time snapshot seat 선언 — `.onto/builds/{session}/phase3-snapshot.yml` (UF-structure-02 해소).
      (4) §3.5.1 validation rule 8 에 `"see below"` pending coverage check 추가 — 미-address pending 1+ 시 `phase_3_5_input_incomplete` halt (C-01 closure).
      (5) §3.5 step 5 atomicity 확장 — step 1 + 1.5 + 2 + 3 + 4 + 8 전수 single atomic fsync 경계 명시 (UF-structure-01 해소).
      (6) §5.4.2 closure scope narrow — `pack-content + pack spec` 편집만 closure, `notes / upgrade_status / last_updated / freeform version bump` 는 unenforced (D-01 해소).
      (7) §5.4.2 malformed manifest recovery path 추가 — parse-invalid 시 `manifest_malformed` halt + `--regenerate` 를 bytes-level rename 으로 안전 recovery (broken manifest parse 의존 없음) (C-02 해소).
      (8) §5.4.1 `--regenerate --config` non-interactive path 추가 (UF-coverage-02 해소).
      (9) §4.3 element schema 에 `provenance.carry_forward_from_schema_version: "rationale_state/1.0"` 추가 (UF-evolution-01 해소).
      (10) §3.3 을 §3.1 matrix 의 derived view 로 축소 — second normative seat 제거 (UF-conciseness-01 해소).
      (11) §2.5 rendering 알고리즘 에 grouping_threshold 미달 residual 의 individual promotion rule 추가 + exhaustive partition invariant 명시 (UF-coverage-01 해소).
      Step 1/2/3 재론 아님.
  - revision: r5
    date: 2026-04-25
    basis: "r4 codex review (.onto/review/20260425-30d37372) — 3 Consensus + 0 Conditional + 0 Disagreement + 3 UF. Axiology 긍정 (no additional perspective). Local contract inconsistency 해소 위주"
    scope_summary: |
      (1) C-01 §5.5 version_hash algorithm 에 pack-spec fields (`quality_tier`, `referenced_files_spec` [path, required, min_headings]) hash input 추가 — §5.4.2 "Closed" rows 를 실제 runtime enforce.
      (2) C-02 §5.6 config schema 에 `domain_manifest_version` seat 추가 + §5.6.1 canonical grammar (semver subset) + comparator 규칙 + malformed manifest recovery 시 comparator 생략 rule 명시.
      (3) C-03 §2.5 rendering partition 완전 명시 — `max_individual_items_hard_cap` (default 100) + `max_group_rows` (default 50) config 추가. 7-step mechanical algorithm 과 4 bucket 결정 규칙 (individual / group_sample / group_truncated / throttled_out) 정의. exhaustive partition invariant.
      (4) UF-logic-01 §5.4.2 opening 재작성 — "유일한 수정 경로" → "pack-content + pack-spec 은 `--regenerate` 유일 경로, soft fields (notes/upgrade_status/last_updated/freeform version bump) 는 manual edit 허용" 범위 구분.
      (5) UF-conciseness-01 §2.5 priority formula 의 `rationale_state_weight[reviewed-low/medium/high]` 3-tier split 제거 → `reviewed = 4` single. confidence tier 구별은 `confidence_score` term (× 100) 에 위임. single source of confidence signal.
      UF-semantics-01 (`global_reply` naming) 는 v1.1 rename backlog §10.2 에 이미 기록 — 변경 없음.
      Step 1/2/3 재론 아님.
  - revision: r6
    date: 2026-04-25
    basis: "r5 codex review (.onto/review/20260425-bb0d52d2) — 3 Consensus + 2 Recommendations + 3 UF 전수 해소. Taxonomy centralization + boundary closure 성격"
    scope_summary: |
      (1) C-01 `domain_manifest_version` centralization — §5.4.2 soft field 목록에서 제거, pre-load gate 의 required field set 에 추가, §5.4.2 taxonomy 의 새 category "Semver enforced" 로 재분류. 3곳 contract 분열 해소, single canonical seat = §5.6.1.
      (2) C-02 §3.4.1 grouping key table 확장 — `reviewed` 를 low/medium/high 전수 grouping 대상으로, non-degraded `proposed` single-gate 를 별도 4번째 row 로 추가. §2.5 4-bucket partition 과 align (모든 intra-Phase-3.5 state 가 deterministic bucket 경로).
      (3) C-03 §5.4.2 edit-closure taxonomy 중앙화 — 9 manifest field 를 3 category (Runtime-managed / Pack-spec·content·Semver enforced / Unenforced soft) 에 명시 분류. future field 추가 시 한 곳에만 declaration (drift 방지).
      (4) UF-evolution-01 §5.5 hash input 에서 `manifest_schema_version` 제외 — schema-only migration 이 pack-semantic drift 로 보이지 않도록. Runtime-managed category 의 pre-load gate 가 primary guard.
      (5) UF-pragmatics-01 §3.5.1 rule 8 확장 — `"see below"` × `throttled_out` closure rule. throttled_out 있는 상태에서 `"see below"` 는 `phase_3_5_input_incomplete` halt (operationally deadlock 방지). `"confirmed"` 는 legal (sweep 이 carry_forward 로 close).
      (6) UF-conciseness-01 §2.5 4-bucket taxonomy 엄격 준수 — `group_row` 를 algorithmic label 로 강등, persisted bucket 은 4 종 (individual / group_sample / group_truncated / throttled_out) 만. `rationale-queue.yaml.entries[].render_bucket` enum 과 정합.
      Step 1/2/3 재론 아님.
  - revision: r7
    date: 2026-04-25
    basis: "r6 codex review (.onto/review/20260425-021be2d4) — 2 Consensus + 1 Conditional + 4 UF 전수 해소. Axiology 긍정 (no additional perspective). r6 taxonomy 재편의 propagation cleanup 성격"
    scope_summary: |
      (1) CNS-01 §3.6 batch_actions[].target_group.kind enum 에 `rationale_state_single_gate` 추가 + §3.5.1 rule 7 의 4 kind recomputation rule 명시. r6 §3.4.1 의 single_gate grouping row 가 이제 serialize/validate/reconstitute 경로 완성.
      (2) CNS-02 §5.4.2 strict 3-category taxonomy rewrite — top-level (Runtime-managed / Enforced / Unenforced soft) 과 guard mechanism subtype (pack-spec / pack-content / semver) 분리. `last_updated` 를 CLI auto-populate 로 재분류 (Recommendation 3 해소).
      (3) CCS-01 `domain_scope_miss` closure rule 명시 — `"see below"` × `throttled_out` fail rule 에 exception 추가 (γ terminal state 는 closure 불필요), §3.5.2 sweep 제외 재확인. render/throttle path 전수 coverage.
      (4) UF-coverage-domain-manifest-version-producer-gap 해소 — §5.3 interactive flow 에 step 5 추가 (`domain_manifest_version` 입력), `--migrate-existing` 도 default suggestion + 입력 허용.
      (5) UF-coverage-last-updated-producer-gap 해소 — `last_updated` 를 CLI auto-populate (ISO 8601 UTC) 로 명시 (§5.3 step 6 + §5.4.2 taxonomy entry).
      (6) UF-evolution-malformed-recovery-version-continuity 해소 — §5.6.1 에 "intentional discontinuity" note 추가 + `recovery_from_malformed: true` optional flag 도입 (audit marker).
      (7) UF-structure-freeform-version-bump-secondary-taxonomy 해소 — §9 Q-S4-CLI-10 wording 에서 `freeform version bump` 제거, `domain_manifest_version` 을 Semver enforced 로 명시.
      Step 1/2/3 재론 아님.
  - revision: r8
    date: 2026-04-25
    basis: "r7 codex review (.onto/review/20260425-5402cc07) — 3 Consensus + 0 Conditional + 0 Axiology + 1 UF (logic-only) 전수 해소. Local propagation synchronization 성격"
    scope_summary: |
      (1) CNS-01 `domain_name` dual-membership 해소 — §5.5 hash input 에서 제거 (Runtime-managed category 로 단일 membership). pre-load gate 의 `path ↔ domain_name` consistency 검증 (`manifest_identity_mismatch` halt) 이 primary guard.
      (2) CNS-02 `recovery_from_malformed` end-to-end 동기 — §4.1 raw.yml.meta 에 `manifest_recovery_from_malformed` mirror seat 추가, §4.4 persistence responsibility chain row 추가, §5.4.2 taxonomy 에 Runtime-managed audit signal 로 분류 + write/clear rule 명시 (1회성 audit, 다음 regenerate 에서 재계산).
      (3) CNS-03 `target_group.single_gate` field 제거 — `kind == rationale_state_single_gate` 가 이미 single_gate constraint 를 내포 (derive-only), §3.6 schema 에서 단순화.
      (4) UF-logic-01 §5.6.2 신설 — `domain_manifest_version` manual-edit closure scope 명시 narrow ("YAML-valid manual bump + unchanged pack" 은 v1 intentional limitation, v1.1 signature/provenance trail backlog).
      (5) Recommendation 1 해소 — §5.4.2 canonical authority 선언, §5.5 / §5.6.1 / §4.1 field-role 재진술 제거 (pointer only).
      (6) Recommendation 2 해소 — §5.6.1 `recovery_from_malformed` write + clear rule 명시.
      (7) Recommendation 3 해소 — §9 Q-S4-CLI-10 wording 에서 `freeform version bump` 제거 완료 (r7 이미 반영), r8 에서는 신규 Q 에 canonical section pointer 일관성 유지.
      Step 1/2/3 재론 아님.
  - revision: r9
    date: 2026-04-25
    basis: "r8 codex review (.onto/review/20260425-856e4811) — 2 Consensus + 1 Disagreement + 2 UF 전수 해소. r8 taxonomy 결정이 §5.5 prose / §5.4.2 opening / §9 pointer layer / manifest.version alias 에 propagate 되지 않은 wording-closure 결함"
    scope_summary: |
      (1) Consensus 1 §5.5 canonical boundary 결과 prose 재작성 — `domain_name` 이 hash 에 반영된다는 문구 제거, §5.4.2 pointer only 로 축소 (field-role 재진술 금지). algorithm 결과만 bullet 로 기술.
      (2) Consensus 2 + UF-conciseness-01 §9 CLI summary items 를 strict pointer-only 로 정리 — Q-S4-CLI-01~20 전수를 "title + §section" 형식으로 축소, restated policy 문구 제거.
      (3) Disagreement (logic vs pragmatics) §5.4.2 opening 재작성 — "manual text edit 는 runtime guard 로 차단" 광범위 claim 약화, §5.6.2 narrow scope 와 align (pack-content/spec 는 hash mismatch, domain_manifest_version 은 malformed/non-bump 만).
      (4) UF-semantics-01 해소 — §4.1 line 812 comment `# manifest.version` → `# manifest.domain_manifest_version` 단일 canonical term.
      Step 1/2/3 재론 아님.
  - revision: r10
    date: 2026-04-25
    basis: "r9 codex review (.onto/review/20260425-819452d3) — 1 Consensus + 1 Disagreement + 1 UF. Purpose Alignment preserved. Review recommended focused re-review (§4.1, §5.4.1, §5.4.2, §5.6.2, §9.1, §9.2)"
    scope_summary: |
      (1) CNS-01 §5.4.1 bump prose alias 잔재 제거 — "기존 manifest.version" → "기존 domain_manifest_version" (canonical naming 단일화, 마지막 alias instance).
      (2) DGS-01 §5.4.2 Enforced category 경계 원칙 문장 narrow — "manual drift 차단" 광범위 claim 약화, "row-level exception (§5.6.2 narrow closure) 는 row 의 guard column 이 canonical, 본 원칙 문장이 덮어쓰지 않음" 명시. Logic vs Pragmatics disagreement 해소.
      (3) UF-STR-01 §9.1 group header count drift 해소 — 6 영역 header 에서 "N 점" metadata 제거, "count authority: §9.2" 로 pointer 이동. §9.2 가 count 의 단일 authority. r2~r9 에서 누적 추가된 Q 의 header count drift 원천 차단.
      Step 1/2/3 재론 아님.
  - revision: r11
    date: 2026-04-25
    basis: "r10 codex review (.onto/review/20260425-50f5ceaf) — 0 Consensus defects (Consensus = r10 closes r9 scope 긍정 affirmation) + 0 Conditional + 0 Disagreement + 4 UF (1 MAJOR + 3 MINOR). Clean pass 직전 단계"
    scope_summary: |
      (1) UF-DEP-01 (MAJOR) §5.4.2 `domain_manifest_version` row closure pointer §5.6.1 → §5.6.2 교체 + failure code list 명시.
      (2) UF-PRAG-01 §5.6.3 canonical map 신설 — 4 error code (`manifest_malformed` / `manifest_version_format_invalid` / `manifest_version_not_incremented` / `config_schema_invalid`) 의 trigger + primary section + recovery guidance single authority. 이전 "schema validation error" wording 을 `config_schema_invalid` canonical code 로 통일.
      (3) UF-EVO-01 §7.1 Stage 3 wrap-up skeleton 의 stale `Q-S1 × 16 + Q-S2 × 22 + Q-S3 × 22 + Q-S4 × ~35 = ~95` formula 제거 → "count authority: 각 Step decision 문서 + 본 §9.2" pointer 로 대체.
      (4) UF-CON-01 §9.1 Hook δ + Phase 3.5 bullets strict pointer-only trim — operational detail 재진술 제거, "title + section pointer" 형식 통일.
      Step 1/2/3 재론 아님. Clean pass 수렴 목표.
  - revision: r12
    date: 2026-04-25
    basis: "r11 codex review (.onto/review/20260425-07050236) — 1 Consensus (CNS-01 failure-code propagation 미완) + 1 Disagreement (D-01 §5.6.3 decision surface 미반영, coverage vs 3 lens) + 0 UF. Axiology no drift"
    scope_summary: |
      (1) CNS-01 해소 — upstream sections 의 error code wording 이 §5.6.3 canonical map 과 align:
          - §5.4.2 pre-load gate: `manifest_malformed` (YAML parse / required missing) 과 `manifest_version_format_invalid` (semver grammar fail) 를 분리 명시
          - §5.6 non-interactive: "schema validation error" 문구 제거 → `config_schema_invalid` + `manifest_version_format_invalid` 구체 code 로 분리
          - §5.6.2 enforcement chain: `manifest_malformed` (잘못된 categorization) → `manifest_version_format_invalid` 교체 (semver grammar fail 범주)
          - §5.6.3 `manifest_malformed` trigger 를 "YAML parse fail 또는 manifest required field 누락 (전체 list 명시)" 로 확장해 semver grammar fail 제외
      (2) D-01 해소 (coverage lens 주장 채택) — §9.1 CLI 에 **Q-S4-CLI-21 failure code canonical map (4 codes): §5.6.3** 추가 + §9.2 count update (CLI 20 → 21, 총계 57 → 58).
      Step 1/2/3 재론 아님. r11 review 의 "axiology no drift + 0 UF" 는 convergence tail 의 강한 신호 — r12 clean pass 예상.
  - revision: r13
    date: 2026-04-25
    basis: "r12 codex review (.onto/review/20260425-095af3d8) — 2 Consensus (positive affirmations: repair closed + axiology no drift) + 0 Conditional + 0 Disagreement + 2 UF (solo lens minor). Contract-level clean pass 도달, final wording polish"
    scope_summary: |
      (1) UF-semantics-01 (semantics solo, Immediate) — §5.4.2 table scope 명칭 정밀화. "manifest field" → "governed subject" 로 rename (manifest field + pack-content 실제 파일 모두 포함). future-proof rule 도 동일하게 업데이트.
      (2) UF-pragmatics-01 (pragmatics solo, Recommendation) — §5.6.3 operator 복구 guidance 를 code 별 specific path table 로 분리. `config_schema_invalid` 는 universal `--regenerate` fallback 이 아닌 "config file 수정 + 동일 `--regenerate --config <path>` 재실행" 명시 (CI/non-interactive 전용 clarity).
      Step 1/2/3 재론 아님. r12 contract 결정 건드리지 않음 — wording polish only. final clean pass 목표.
  - revision: r14
    date: 2026-04-25
    basis: "r13 codex review (.onto/review/20260425-a8aff541) — 2 Consensus positive affirmations + 0 Conditional + 2 Disagreement (SEM-01 + DEP-01 solo-lens) + 0 UF + 0 Axiology perspective. Recommendation: §5.4.2 + §5.6.3 만 focused re-review. micro-cleanup"
    scope_summary: |
      (1) SEM-01 해소 — §5.4.2 opening 의 "모든 manifest field" → "모든 governed subject (manifest field + pack-content 실제 파일)" 수정. r13 rename 에서 누락된 opening 문구와 table scope align.
      (2) DEP-01 해소 — §5.6.3 recovery table 에 origin column 추가 (interactive `--regenerate` vs non-interactive `--regenerate --config <path>`). `manifest_version_format_invalid` / `manifest_version_not_incremented` 의 non-interactive branch 각각 "config file 수정 + 동일 명령 재실행" single-seat guidance 명시.
      Step 1/2/3 재론 아님. r12 contract 결정 건드리지 않음 — final focused wording cleanup. full clean pass 목표.
  - revision: r15
    date: 2026-04-25
    basis: "r14 codex review (.onto/review/20260425-f4b37b96) — 2 Consensus positive affirmations (§5.4.2 closed + §5.6.3 origin-specific map closed) + 0 Conditional + 1 Disagreement (D-01 6 vs 2 lens, 1 line alias residue) + 1 positive UF (axiology) + 0 negative UF. Review Recommendation: §5.6.3 only focused re-review, §5.4.2 unchanged"
    scope_summary: |
      D-01 해소 — §5.6.3 non-interactive `manifest_version_not_incremented` row 의 deprecated alias 제거: "기존 manifest.version 보다 bump" → "기존 `domain_manifest_version` 보다 bump". canonical seat 단일화. r14 에서 놓친 1 line cleanup.
      Step 1/2/3 재론 아님. §5.4.2 unchanged. full clean pass 최종 수렴 목표.
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md (r7, 9/9 clean pass)"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (16 Q 승인, PR #201)"
  step_2_protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 9/9 clean pass, PR #202)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (22 Q 승인)"
  step_3_protocol: "development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md (r6, 9/9 clean pass, PR #208)"
  step_3_decision: "development-records/evolve/20260424-phase4-stage3-step3-rationale-reviewer-decision.md (22 Q-S3 + 2 P-DEC 승인)"
  v0_flow_baseline: ".onto/processes/reconstruct.md §Phase 3 / §Phase 3.5 / §Phase 4"
  phase_4_handoff: "development-records/plan/20260419-phase4-handoff.md"
  step_4_handoff: "development-records/plan/20260424-phase4-stage3-step4-handoff.md"
---

# Stage 3 Step 4 — Integration (Hook δ + Phase 3.5 + raw.yml + CLI + Step 2 amendment)

## 0. 본 문서의 목적

Stage 3 Step 1 (차이 축) + Step 2 (Hook α Proposer) + Step 3 (Hook γ Reviewer) 확정 후 남은 4 영역을 **단일 coherent contract** 로 통합 고정:

1. **Hook δ** — Phase 3 Principal 검증 surface (throttling + rendering + evidence surface + triple-read consumption)
2. **Phase 3.5 write-back** — Principal action → terminal state 매핑 canonical matrix. Runtime sole-writer (LLM 불개입)
3. **raw.yml meta 확장** — `inference_mode` + `degraded_reason` + `fallback_reason` + `rationale_review_degraded` + `rationale_reviewer_failures_streak` + `gate_count` + element-level `intent_inference` persistence
4. **`onto domain init` CLI contract** — manifest.yaml producer 분리 + quality_tier 선언 + `--v0-only` + `--migrate-existing`

추가로 Step 3 decision §8.1 (P-DEC-A1 경로 A) 에 따라 **Step 2 protocol 3 action 실 edit** (§6.3 `gate_count = 1` write rule + §3.4 `empty` enum + §6.3.1 `pack_missing_areas` 재해석) 을 본 Step 4 PR 동일 branch 의 별도 commit 으로 병행.

Track B 실 구현 (src/core-runtime/** + reconstruct.md 실 수정 + role 파일 배치 + W-A-80~ W-ID 부여) 은 본 Step 4 범위 밖. Stage 3 wrap-up 이후 별도 세션.

## 1. Step 4 scope + Step 1/2/3 의존

### 1.1 Step 1 + Step 2 + Step 3 가 이미 확정한 것 (본 Step 4 의 전제)

**Step 1 확정 (flow-review r7)**:
- 5 source state (`reviewed` / `proposed` / `gap` / `domain_pack_incomplete` / `domain_scope_miss`) lifecycle (§4.2)
- §7.6 Phase 3 rendering column 구조 (rationale 컬럼, rationale_state 별 표시)
- §7.7 Phase 3 evidence surface — exhaustive 원칙 (individual + group sample + rationale-queue.yaml artifact)
- §7.8 Phase 3 throttling config (`max_individual_items: 20` / `grouping_threshold: 5` / `group_summary_sample_count: 3`)
- §7.9.1~§7.9.6 Principal action → terminal state 매핑 (5 source state × action, 6 terminal + carry_forward + `domain_scope_miss` special case)
- §4.7 quality vocabulary glossary + §4.7.1 `pack_quality_floor` precedence order
- §5.2/§5.3/§5.4 inference_mode 3 분기 + halt 분기
- §6.4 `onto domain init` CLI producer 분리 결정 (interactive / `--migrate-existing` / non-interactive `--config`)

**Step 2 확정 (protocol r6)**:
- Hook α Proposer protocol (input / output / prompt / role / Stage transition runtime / failure)
- `meta.stage_transition_state` 7 enum + retry policy
- Proposer directive apply bridge (steps 5a~5d)

**Step 3 확정 (protocol r6)**:
- Hook γ Reviewer protocol (input / output / prompt / role / Phase 2 Step 2c runtime / failure)
- `meta.step2c_review_state` 7 enum
- Element-level `intent_inference.provenance` schema (§3.7.2) — `gate_count` 포함
- Triple-read contract (§7.2): `(reviewed_at, rationale_review_degraded, rationale_state)` minimum-sufficient disambiguation set
- **Step 4 read contract pair list** (§10.1):
  - `gate_count` → Phase 3 single-gate 2 case badge
  - `rationale_review_degraded: true` → proposed 전수 Principal queue
  - triple-read → Phase 3 row-level render decision minimum-sufficient set

### 1.2 Step 4 가 상세화할 것

| 영역 | 통합 artifact | Canonical seat (single authority) |
|---|---|---|
| **Hook δ** | `reconstruct.md §Phase 3` (extend) + `rationale-queue.yaml` artifact | 본 문서 §2 |
| **Phase 3.5** | `reconstruct.md §Phase 3.5` (extend) + `phase3_user_responses.rationale_decisions[]` schema | 본 문서 §3 (action-first canonical matrix) |
| **raw.yml meta** | `reconstruct.md §Phase 4` (extend common meta header) + element-level `intent_inference` persist | 본 문서 §4 |
| **`onto domain init` CLI** | `.onto/commands/domain-init.md` (신설) + `~/.onto/domains/{domain}/manifest.yaml` | 본 문서 §5 |
| **Step 2 amendment** | `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md` 3 지점 patch | 본 문서 §6 (명세만 — 실 edit 은 Step 4 PR 별도 commit) |

### 1.3 Step 4 가 피할 것

- 실제 runtime code 편집 (`src/core-runtime/**`) — Track B
- `.onto/processes/reconstruct.md` 실 편집 — Track B (본 문서는 target seat 명시만)
- `.onto/roles/rationale-proposer.md` / `.onto/roles/rationale-reviewer.md` 실 배치 — Track B (Step 3 §8.3)
- `.onto/commands/domain-init.md` 실 작성 — Track B (본 문서는 contract 명세만)
- Step 1/2/3 decision 재론 — 본 Step 4 는 4 영역 **상세화** + Step 2 amendment **실 edit** 만
- W-ID 부여 (W-A-80~) — Stage 3 wrap-up

### 1.4 Step 3 와의 핵심 차이 (본 Step 4 에서 반드시 유의)

| 축 | Step 3 (Hook γ) | Step 4 (4 통합) |
|---|---|---|
| 대상 | 단일 Hook protocol | **4 영역 통합** + Step 2 amendment |
| Artifact | `rationale-reviewer.md` + `reconstruct.md` Phase 2 Step 2c | `reconstruct.md` Phase 3 / 3.5 / 4 + `raw.yml` schema + `domain-init.md` + Step 2 protocol patch |
| SSOT 압력 | 단일 seat 신설로 해소 가능 | **multiple seats** — 4 sink 각각 별도 artifact. cross-sink drift 방지 필수 |
| 결정 표면 | 22 Q-S3 | 예상 ~35 Q-S4 (본 문서 §9) |
| 예상 rounds | 6 | 6~8 (multi-sink 초기 drift 분산) |

**핵심 trap 1 — Step 3 canonical seat 패턴 재적용**: Step 3 의 §3.1.1 + §3.1.2 + §3.7.2 가 "common apply rule + empty partition + element-level provenance" 를 single authority 로 고정했듯, Step 4 는 4 영역 각각에 **§2~§5 가 single authority** 로 선언. 각 영역 내부에서 다른 section 은 pointer only.

**핵심 trap 2 — §7.9 matrix orientation**: Step 1 §7.9.1~§7.9.6 은 source state 별 6 개 table 로 분할되어 있음. 본 Step 4 canonical 은 **action-first single matrix** 로 재편 (§3.1). state-first view 가 필요하면 §3.2 에서 pointer 로만 제공.

**핵심 trap 3 — raw.yml field 간 mutual exclusion**: Step 1 §4.7 이 inference_mode × degraded_reason × fallback_reason 의 mutual exclusion 을 declarative 하게 명시. Step 4 는 여기에 `rationale_review_degraded` 를 **co-occurrence matrix** 로 추가 (§4.2).

**핵심 trap 4 — Step 2 amendment commit 구조**: P-DEC-A1 의 의도는 "Step 2 amendment 가 Step 3 merge PR 에 병행 포함" 이었으나, Step 3 PR (#208) 은 **명세만** 포함하고 실 edit 을 Track B 이연. 본 Step 4 세션이 설계 세션이므로 실 edit 을 Step 4 PR 에 별도 commit 으로 포함하는 것이 자연스러움 — §6 결정 표면.

### 1.5 예상 `/onto:review` cycle

- r1: codex (초안 빠른 drift surface)
- r2: Claude cc-teams-lens-agent-deliberation 2 rounds (구조 재편 — 4 영역 cross-sink drift 탐지)
- r3~: codex cleanup 수렴
- 예상 6~8 rounds, clean pass (BLOCKING 0 + MAJOR 0 + 9/9 lens clean)

---

## 2. Hook δ — Phase 3 Principal 검증 surface (CANONICAL AUTHORITY)

### 2.1 Hook δ 의 목적 + scope

**목적**: Phase 2 Step 2c 완료 후 wip.yml 의 모든 `intent_inference.rationale_state` terminal-pending element 를 Principal 에게 exhaustive 하게 surface. 개별 / 그룹 throttling 을 통해 판정 부담을 최소화하면서 **누락 없음** 을 보장.

**scope 내부**:
- Phase 3 rendering algorithm (column 구조 + rationale_state 별 표시)
- Throttling (priority score + individual vs group 분기)
- Evidence surface (individual + group sample 모두 inline 전수)
- `rationale-queue.yaml` artifact write (γ full-failure 시 + general throttled-out audit)
- Step 4 read contract consumption (gate_count + rationale_review_degraded + triple-read)

**scope 밖**:
- Phase 2 Step 2c 실행 logic (Step 3 §6.2)
- Phase 3.5 write-back logic (본 문서 §3)
- raw.yml persist logic (본 문서 §4)

### 2.2 Phase 3 Ontology Elements 표 — column 구조 canonical

Step 1 §7.6 mirror. reconstruct.md §Phase 3 `### Ontology Elements` 를 다음으로 extend:

```markdown
### Ontology Elements — N items
| # | Type | Name | Certainty | Stage | Round | Rationale | Confidence | Summary |
|---|---|---|---|---|---|---|---|---|
```

`Rationale` 컬럼 표시 rule (rationale_state 별):

| rationale_state | Rationale 컬럼 표시 | 색상 / 스타일 |
|---|---|---|
| `proposed` | `inferred_meaning` 요약 (1 sentence) + "(pending review)" suffix | 회색 |
| `reviewed` | `inferred_meaning` 요약 (1 sentence) | 정상 |
| `principal_accepted` / `principal_modified` / `principal_rejected` / `principal_accepted_gap` / `principal_deferred` / `principal_confirmed_scope_miss` (r2 신규) | terminal state label + Principal decision 요약 | 정상 (terminal 마다 distinct icon — §2.2.1) |
| `gap` | "(추론 실패)" | 빨강 |
| `domain_pack_incomplete` | "(pack 에 개념 부재)" | 노랑 |
| `domain_scope_miss` | "(도메인 범위 밖)" + override 가능 힌트 (pre-Phase 3.5 — γ 가 판정) | 회색 |
| `empty` | "—" (rationale 부재 canonical marker — Phase 3 queue 대상, r2 §3.1 action 경로 열림) | 회색 |
| `carry_forward` | "(이전 세션 미판정)" + re-judgment 힌트 | 회색 (§3.9) |

#### 2.2.1 Terminal state icon mapping (r1 초안 — §2 canonical)

Phase 3 는 terminal state 를 Principal 이 빠르게 식별할 수 있도록 distinct icon 을 prefix:

| terminal state | icon | 의미 |
|---|---|---|
| `principal_accepted` | `✓` | Principal 이 rationale 수용 |
| `principal_modified` | `✎` | Principal 이 rationale 수정 |
| `principal_rejected` | `✗` | Principal 이 rationale 거부 |
| `principal_accepted_gap` | `○` | Principal 이 rationale 부재 수용 |
| `principal_deferred` | `⌛` | Principal 이 재판정 보류 |
| `principal_confirmed_scope_miss` (r2 신규) | `☑` | Principal 이 γ 의 scope miss 판정 명시 수용 |
| `carry_forward` | `→` | 미판정 + global `confirmed` 자동 전이 (§3.9 artifact terminal) |
| `domain_scope_miss` (미판정 유지) | `⊘` | γ 판정 유지 + Principal explicit action 없음 (r2 — accept 와 구별된 audit state) |

### 2.3 Single-gate badge (Step 4 read contract — gate_count)

Step 3 §10.1 forward contract pair: **gate_count → Phase 3 rendering single-gate 2 case badge**.

**gate_count canonical path (r2 CONSENSUS 1 해소)**: `elements[].intent_inference.provenance.gate_count`. **element-level `provenance` 아래가 single seat**. Step 3 §3.7.2 canonical mirror. 본 문서 §3.6 schema / §4.1 raw.yml meta / §4.3 element-level persist / §6.2 Step 2 amendment 전수 이 경로만 참조 (drift 금지).

**gate_count type (r2 CONSENSUS + [evolution] Unique 해소)**: `integer` (v1 range: `{1, 2}`, future gate 도입 시 monotonic extension). enum 고정 아님 — v1.2 이후 Hook ε / Hook ζ 가 추가되더라도 schema breaking 없이 `{1, 2, 3, ...}` 확장 가능.

**Single-gate 정의** (v1 기준 `gate_count == 1`):
1. `populate_stage2_rationale`-origin element (Stage 2 Explorer 추가 entity — Hook γ 가 rationale 을 write 한 후에도 gate 단일 — `reviewed_at` 존재)
2. Hook α 생성 후 Hook γ 에 의해 explicit revise/confirm/mark_* 을 받지 않은 element (`reviewed_at == null` AND `gate_count == 1`)

**Badge rule**:
- 두 case 모두 "Single-gate (audit only)" badge 를 Rationale 컬럼에 suffix
- 색상: warning yellow (quality-asymmetry audit signal)
- Principal action set 은 일반 element 와 동일 (source state 에 따라 §3.3 disabled rule 적용)

**2 case 구별 (audit 용)**:
- case 1: `reviewed_at != null` AND `gate_count == 1` AND `rationale_state ∈ {reviewed, principal_*}` → populate_stage2_rationale-origin
- case 2: `reviewed_at == null` AND `gate_count == 1` → Hook γ 미개입

UI 는 **동일 badge** 로 render. case 1/2 구별은 raw.yml consumer (govern audit) 책임.

### 2.4 rationale_review_degraded 시 escalation

Step 3 §10.1 forward contract: **rationale_review_degraded: true → proposed 전수 Principal queue**.

**rule**:
- `raw.yml.meta.rationale_review_degraded == true` 시 (γ full failure retry 소진 — Step 3 §7.1)
- `rationale_state == proposed` 인 모든 element 를 Phase 3 queue 에 escalate
- 일반 throttling rule (§2.5) 은 적용 — individual 과 group 분기는 유지
- **다른 점**: proposed 가 일반적으로 γ 검증된 상태가 아니므로, Phase 3 row 에 "γ-degraded — Principal 판정이 γ review 를 대체" warning banner 삽입

### 2.5 Throttling algorithm (rendering)

Step 1 §7.8 mirror + 구체화:

**config** (default — `.onto/config.yml` override 가능):
```yaml
config.reconstruct.phase3_rationale_review:
  max_individual_items: 20
  grouping_threshold: 5
  group_summary_sample_count: 3
```

**Priority score 계산** (높은 순서대로 individual 대상):
```
priority(element) =
  rationale_state_weight(element.intent_inference.rationale_state) * 1000
  + (10 - confidence_score(element.intent_inference.confidence)) * 100
  + (element.added_in_stage == 2 ? 50 : 0)      # Stage 2 origin 가산
  + gate_count_bonus(element.intent_inference.provenance.gate_count)
                                                 # r4: 이전 `element.single_gate ? 30 : 0` term 제거
                                                 # (C-03 해소) — single_gate 는 gate_count == 1 의 derived predicate,
                                                 # gate_count_bonus 가 이미 gate_count 를 read 하므로 duplicate signal 제거
```

`rationale_state_weight` (high → low, r5 UF-conciseness-01 해소 — confidence 이중 모델링 제거):
- `empty` = 11 (r2 신규 — rationale 부재 + Hook γ 미개입, 판정 optimizer 최우선)
- `gap` / `domain_pack_incomplete` = 10
- `proposed` (γ-degraded 시) = 9
- `domain_scope_miss` = 5 (Principal override 가능성)
- `reviewed` = 4 (r5 — confidence sub-split 제거, confidence_score term 이 tiered surface 제공)
- `principal_*` terminal state = 0 (재판정 대상 아님 — already-decided)
- `carry_forward` = 0 (per-item action 미존재 — global `confirmed` 후 재판정 외 Phase 3 대상 아님)

**r5 simplification 의 결과** (UF-conciseness-01 해소): `reviewed` source 의 우선순위 tier 구별은 `confidence_score` term (× 100) 에 위임. `reviewed (low)` = `4*1000 + 9*100 = 4900`, `reviewed (medium)` = `4*1000 + 8*100 = 4800`, `reviewed (high)` = `4*1000 + 7*100 = 4700` — 순위 유지하되 confidence signal 은 single source.

`confidence_score` (r2 Unique [pragmatics] 해소 — null case 명시):
- `low` = 1, `medium` = 2, `high` = 3
- `null` = 1 (rationale_state ∈ {empty, gap, domain_pack_incomplete, domain_scope_miss} 에서 정상 — low confidence 동등 취급으로 우선순위 상위 편입)

`gate_count_bonus` (r2 gate_count integer 재정의 반영):
- `gate_count == 1` → 10
- `gate_count >= 2` → 0
- `gate_count == null` → 10 (defensive — v1 에서 원칙적으로 발생 불가이나 unreviewed 동등 처리)

**rendering 분기** (r5 C-03 해소 — overflow / throttled_out 완전 명시):

**Config extension (r5)**:
```yaml
config.reconstruct.phase3_rationale_review:
  max_individual_items: 20                   # priority-top individual 할당량
  grouping_threshold: 5                      # group 구성 최소 element 수
  group_summary_sample_count: 3              # group 당 inline sample 수
  max_individual_items_hard_cap: 100         # r5 신규 — priority top + residual 개별 row 총 hard cap
  max_group_rows: 50                         # r5 신규 — group row 총 hard cap
```

**algorithm** (r5 mechanical partition):

1. **priority score 계산** — 모든 terminal-pending element
2. **priority-top individual 할당** (상위 `max_individual_items` 개) — `### User Decision Required Items (individual)` 에 render
3. **나머지 element 의 group candidate 구성** — §3.4.1 canonical grouping key 기준
4. **각 candidate 처리**:
   - element 수 ≥ `grouping_threshold` → **group candidate** 로 유지 (group row 렌더 대상)
   - element 수 < `grouping_threshold` → **residual individual** 로 편입 (individual list 말미 append)
5. **individual hard cap 적용**:
   - individual list (priority-top + residual) 의 총 수가 `max_individual_items_hard_cap` 초과 시 → priority 낮은 순으로 **`throttled_out`** 이동
   - hard cap 내에 수용되는 element 는 `individual` bucket 확정
6. **group row hard cap 적용**:
   - group candidate 의 총 수가 `max_group_rows` 초과 시 → group 전체 priority 합 낮은 순으로 group 자체를 **`throttled_out`** (해당 group 의 모든 element 포함)
   - hard cap 내 group 의 element: sample `group_summary_sample_count` 개는 `group_sample` bucket, 나머지 element 는 `group_truncated` bucket (expander 뒤)
7. **`throttled_out` bucket**: (5) / (6) 단계에서 hard cap 초과로 surface 에서 제외된 element 전수. rationale-queue.yaml 의 `render_bucket: throttled_out` 로 persist

**bucket 결정 규칙 (element 관점, r6 UF-conciseness-01 해소 — 4 bucket taxonomy 엄격)**:

persisted bucket 은 **정확히 4 종** (`rationale-queue.yaml.entries[].render_bucket` 의 enum). `group_row` 는 bucket 이 아닌 **algorithmic label** (group candidate 가 hard cap 통과 여부를 나타내는 상태, 최종 persist 는 sample / truncated 2 bucket 으로).

| bucket (persisted, 4 종) | 생성 조건 (mechanical) |
|---|---|
| `individual` | priority top `max_individual_items` OR residual (grouping_threshold 미달, §3.4.1 grouping key table 의 모든 source state 고려 후 미충족) 이며 individual hard cap 내 |
| `group_sample` | group row 의 sample (상위 `group_summary_sample_count` per group) — group 이 `max_group_rows` hard cap 내 |
| `group_truncated` | group row 의 expander 뒤 (sample 제외 element) — group 이 `max_group_rows` hard cap 내 |
| `throttled_out` | individual hard cap 초과 (step 5) OR group candidate 가 `max_group_rows` hard cap 초과 (step 6, group 전체 element 포함) |

**exhaustive partition invariant**: `individual_count + group_sample_count + group_truncated_count + throttled_out_count == total_pending_count`. 각 element 는 정확히 하나의 bucket 에 배치 — 어느 element 도 누락되지 않음 (UF-coverage-01 + r6 C-02 closure).

**4-bucket taxonomy 엄격 준수** (r6 UF-conciseness-01): §2.5 본문이 `group_row bucket` 같은 5번째 label 을 도입하지 않음 — "group candidate 가 hard cap 통과 시 → group_sample / group_truncated 2 bucket 으로 persist" 만 기술.

**γ full-failure 시 invariant** (§2.6 연계): `rendered_count = individual + group_sample + group_truncated > 0`. 전수 throttled_out 금지 (§2.6 canonical). 단, throttled_out 자체의 크기는 hard cap 넘는 만큼 자연스럽게 존재 허용.

### 2.6 Evidence surface — exhaustive 원칙 (Step 1 §7.7 canonical consume)

**Individual item display** (max_individual_items 이하):
- `inferred_meaning` 전수 표시
- `justification` 전수 표시
- `domain_refs[]` 전수 표시 (`manifest_ref` + `heading` + `excerpt`)
- `confidence` 표시
- `state_reason` 표시 (gap / domain_pack_incomplete / domain_scope_miss 만)
- `gate_count` badge (single-gate 시)

**Group summary sample** (group 당 `group_summary_sample_count` 개):
- 각 sample 도 `inferred_meaning` + `justification` + `domain_refs` 전수 노출 (hover/expander 아니라 **inline**)
- group 전체 elements 목록은 "View all {n} elements" expander — 펼치면 전원 evidence 표시

**γ full-failure 시** (r2 CONSENSUS 3 해소 — invariant 재작성):
- 모든 `rationale_state == proposed` element 가 Phase 3 대상
- throttling 은 일반 rule (§2.5) 과 동일하게 적용
- **invariant**: "Phase 3 rendered count > 0" (surface 된 element 가 0 이어서는 안 됨 — 즉 전수 throttled-out 금지)
- `throttled_out_count == 0` 은 허용 (소규모 queue `N ≤ max_individual_items` 에서 정상)
- `rendered_count + throttled_out_count == total_pending_count` 가 항상 성립
- summary footer 에 `throttled_out_count > 0` 인 경우만 "X elements not shown due to throttling — view all at `.onto/builds/{session}/rationale-queue.yaml`" 표시

### 2.7 `rationale-queue.yaml` artifact schema (r3 CONSENSUS 3 + UF-conciseness-01 해소)

**path**: `{project}/.onto/builds/{session}/rationale-queue.yaml`

**write timing**:
- Phase 3 rendering 직전에 Runtime 이 atomic write
- content: Phase 3 surface 대상 element 전수 (throttled-out 포함)

**r3 fix — gate_count future-extensible 일반화**:
- `gate_count_distribution` 을 `single_gate`/`double_gate` 고정 key 에서 **histogram map** 으로 일반화 — v1 실 key 는 `"1"` / `"2"` 만이지만 future gate 도입 시 key 추가만으로 schema breaking 없음
- entries 의 `single_gate: boolean` field 제거 — `gate_count == 1` 에서 derived 이므로 duplicate (UF-conciseness-01). consumer 가 필요 시 `gate_count == 1` 로 계산

**schema** (r3):
```yaml
version: "1.1"                  # r3 schema bump
session_id: string
written_at: string              # ISO 8601 UTC
rendered_count: integer         # Phase 3 에 individual/group 으로 render 된 수 (invariant: > 0 if total > 0)
throttled_out_count: integer    # throttling 으로 surface 에서 제외된 수 (0 허용 — §2.6 재작성)
rationale_review_degraded: boolean
gate_count_histogram:           # r3 — histogram map (future-extensible)
  # key = stringified gate_count integer, value = element count
  # 예: {"1": 12, "2": 88}
  # v1.2+ 에서 gate 추가 시 "3", "4", ... 자연스럽게 확장
  <gate_count_str>: integer

entries:
  - element_id: string
    render_bucket: individual | group_sample | group_truncated | throttled_out
    priority_score: number
    rationale_state: string
    confidence: low | medium | high | null
    gate_count: integer         # r3 — v1 range {1, 2}, future extensible (§2.3 canonical)
    # single_gate field 제거 — gate_count == 1 로 derived (UF-conciseness-01 해소)
    intent_inference_snapshot:
      inferred_meaning: string | null
      justification: string | null
      domain_refs: array
      state_reason: string | null
```

**schema version bump rule**: `rationale-queue.yaml` 의 `version` 은 본 문서의 §2.7 schema 에 변경 발생 시 increment. v1.0 → v1.1 (r3 histogram 일반화). v1 내 consumer 는 두 version 모두 read 가능 (backward-compat).

**소비처**:
- Principal 이 "full list 를 보고 싶다" 는 요청 시 file viewer 로 pointer
- govern audit 이 "Phase 3 에서 Principal 에게 surface 된 element 전수" 재현 가능
- rare path debugging (rationale_review_degraded == true 시)

### 2.8 Row-level render decision — triple-read 소비 (Step 3 §7.2 canonical consume)

Step 3 §10.1: `(reviewed_at, rationale_review_degraded, rationale_state)` triple 은 Phase 3 row-level render decision 의 **minimum-sufficient disambiguation set** — Step 3 forward contract 존중.

**r2 CONSENSUS 2 해소**: `domain_scope_miss` source state 에서 "explicit accept" 와 "미판정 유지" 가 같은 terminal 로 collapse 하던 collision 은 Phase 3.5 §3.1 에서 terminal state 를 **분리** (accept → `principal_confirmed_scope_miss`, 미판정 유지 → `domain_scope_miss`) 하여 해소. 따라서 Phase 3 row render 는 triple-read 만으로 계속 충분하며, Phase 3.5 이전의 row 는 항상 pre-decision state (`rationale_state == domain_scope_miss`), 이후 row 는 `principal_confirmed_scope_miss | principal_modified | principal_deferred | domain_scope_miss (re-entry 유지)` 중 하나로 구별 렌더 가능.

**decision table** (Phase 3 row 1 개가 어떻게 render 되는지):

| reviewed_at | rationale_review_degraded | rationale_state | Phase 3 row 해석 |
|---|---|---|---|
| non-null | false | `reviewed` | γ 정상 review. Rationale 정상 표시 |
| non-null | false | `principal_accepted` / `principal_modified` / `principal_rejected` / `principal_accepted_gap` / `principal_deferred` / `principal_confirmed_scope_miss` | 이미 Phase 3.5 write-back 완료 (re-entry case). Terminal icon + 요약 |
| null | false | `proposed` | Hook γ 미개입 but degraded 아님 — single-gate case 2 (§2.3) |
| null | true | `proposed` | γ full-failure — rationale_review_degraded warning banner + 전수 queue |
| non-null | false | `gap` / `domain_pack_incomplete` / `domain_scope_miss` | γ 가 이 state 로 판정 |
| null | — | `empty` | Stage 2 Explorer 추가 entity (rationale 부재 canonical marker, r2 — §3.1 matrix 에 action 경로 추가) |
| — | — | `carry_forward` | 이전 reconstruct 에서 미판정 terminal (§3.9 — v1 재진입 시 §3.1 matrix source state 에 재편입 또는 유지) |

triple 이외 축은 도입하지 않음. Source-state split (`principal_confirmed_scope_miss` 분리) 으로 sufficiency 유지.

---

## 3. Phase 3.5 write-back — Principal action → terminal state CANONICAL MATRIX

### 3.1 Action-first canonical matrix (SINGLE AUTHORITY)

Step 1 §7.9.1~§7.9.6 은 source state 별 6 개 table 로 분할. 본 §3.1 은 **action-first single matrix** 로 재편 — v1 Runtime 이 "action → (source state, terminal)" lookup 을 O(1) 로 수행하기 위함.

**Canonical authority**: 본 §3.1 table 이 single source of truth. Step 1 §7.9.1~§7.9.6 은 backward-compat 참조만 (state-first view 필요 시). drift 방지 mirror marker: `<!-- mirror-of: step-4-integration §3.1 -->` 를 Step 1 §7.9 본문 bullet 에 부착 (Track B).

**r2 CONSENSUS 2 + 4 해소**:
- `domain_scope_miss` 의 `accept` action terminal 을 기존 `domain_scope_miss` (유지) 가 아닌 **신규 `principal_confirmed_scope_miss`** 로 분리 — Principal 의 explicit accept 와 미판정 유지를 audit-level 에서 구별
- `empty` source state 를 matrix 에 추가 — `provide_rationale` / `mark_acceptable_gap` / `defer` 경로 열림 (§3.1 전수 closure)

| action | 적용 source states | terminal state | principal_judged_at | batch 가능 | 의미 |
|---|---|---|---|---|---|
| **accept** | `reviewed`, `proposed` (γ-degraded) | `principal_accepted` | populate | ✓ | rationale 수용 |
| **accept** | `domain_scope_miss` | **`principal_confirmed_scope_miss`** (r2 신규 terminal — §3.2 canonical) | populate | ✓ | γ scope miss 판정 명시 수용 |
| **reject** | `reviewed`, `proposed` (γ-degraded) | `principal_rejected` | populate | ✓ | rationale 거부 (element 자체 제거 아님) |
| **modify** | `reviewed`, `proposed` (γ-degraded) | `principal_modified` | populate | ✗ (individual only) | 새 rationale 제공 |
| **defer** | `reviewed`, `proposed`, `gap`, `domain_pack_incomplete`, `domain_scope_miss`, **`empty`** (r2 신규) | `principal_deferred` | populate | ✓ | 재판정 보류 |
| **provide_rationale** | `gap`, `domain_pack_incomplete`, **`empty`** (r2 신규) | `principal_modified` | populate | ✗ | Principal 이 rationale 직접 제공 |
| **mark_acceptable_gap** | `gap`, `domain_pack_incomplete`, **`empty`** (r2 신규) | `principal_accepted_gap` | populate | ✓ | rationale 부재 수용 (재판정 의도 없음) |
| **override** | `domain_scope_miss` | `principal_modified` | populate | ✗ | scope miss 판정 overturn, rationale 제공 |
| (미판정 + global `confirmed`) | `reviewed`, `proposed`, `gap`, `domain_pack_incomplete`, **`empty`** (r2 신규) | `carry_forward` | **null** | — | per-item explicit action 전무 |
| (미판정 + global `confirmed`) | `domain_scope_miss` | `domain_scope_miss` (유지) | **null** (special case) | — | γ 판정 유지 + Principal 명시 동의 없음 (§3.2 canonical) |

### 3.2 `domain_scope_miss` terminal split (r2 CONSENSUS 2 canonical 해소)

**r1 collision**: `accept` action 과 미판정 유지가 같은 terminal (`domain_scope_miss`) 로 collapse → Principal 실제 검토 여부 audit 불가.

**r2 canonical resolution**:

| scenario | terminal state | principal_judged_at | audit semantic |
|---|---|---|---|
| `accept` (individual 또는 batch) | **`principal_confirmed_scope_miss`** | populate | Principal 이 γ scope miss 판정을 명시적으로 수용. 재 reconstruct 대상 아님 |
| `override` (individual) | `principal_modified` | populate | Principal 이 scope miss overturn, rationale 제공 |
| `defer` (individual 또는 batch) | `principal_deferred` | populate | 재판정 보류 |
| 미판정 + global `confirmed` | `domain_scope_miss` (유지) | **null** (special case) | γ 판정 존재 + Principal explicit action 없음. Principal 실제 검토 여부 판별 불가 |

**Step 1 §7.9.5 와의 관계**: Step 1 §7.9.5 의 "accept → domain_scope_miss (유지)" 는 r2 에서 canonical terminal split 으로 변경됨 — Step 2 amendment 선례 동형 (P-DEC-A1) 으로 **Step 1 §7.9.5 row additive amendment** 를 Step 4 Stage 3 wrap-up 에서 기록 (§10.1). v1 Stage 3 wrap-up 이 누적 결정 index 에서 "Step 1 §7.9.5 accept terminal: domain_scope_miss → principal_confirmed_scope_miss" 명시. Q-S1 재론 아님, mechanical detail.

**carry_forward 과의 구별**: `domain_scope_miss` (미판정 유지) 는 `carry_forward` 와 달리 γ 의 audit-ready 판정이 이미 있으므로 강제 전이하지 않음. raw.yml consumer 가 두 state 를 구별해 audit (§3.9 artifact terminal layer).

### 3.3 Principal action disabled rule (UI constraint) — r4 pointer collapse (UF-conciseness-01 해소)

**canonical seat**: §3.1 action-first matrix. 본 §3.3 은 §3.1 에서 **mechanically derived**:
- 어떤 source state 가 어떤 action 을 지원하는지는 §3.1 matrix 의 "적용 source states" 컬럼이 single authority
- UI 에 미표시되는 action = §3.1 matrix 에서 해당 (source state, action) 조합이 row 로 존재하지 않는 경우
- v1 runtime 구현은 §3.1 matrix 를 data structure 로 load 하고, Phase 3 row render 시 source state 에 대응하는 action set 을 lookup

**v0 compatibility table (reference only, drift 금지 — §3.1 변경 시 자동 폐기)**:
| source state | supported actions (§3.1 matrix lookup) |
|---|---|
| `reviewed` | accept, reject, modify, defer |
| `proposed` (γ-degraded) | accept, reject, modify, defer |
| `gap` | defer, provide_rationale, mark_acceptable_gap |
| `domain_pack_incomplete` | defer, provide_rationale, mark_acceptable_gap |
| `domain_scope_miss` | accept (→ principal_confirmed_scope_miss), override, defer |
| `empty` | provide_rationale, mark_acceptable_gap, defer |
| `carry_forward` | 본 reconstruct 에서 action 대상 아님 (§3.9 — artifact terminal) |

위 table 은 **§3.1 의 derived view** — 본 §3.3 에 독립 decision 없음. 구현 시 §3.1 matrix 가 sole compatibility authority.

### 3.4 Batch action semantics (r2 CONSENSUS 5 — vocabulary 단일화)

**Batch 가능 action** (§3.1 batch 가능 열 `✓`): `accept`, `reject`, `defer`, `mark_acceptable_gap`.

**Batch 불가 action**: `modify`, `provide_rationale`, `override` — rationale 내용이 per-element 고유해야 하므로.

**r2 CONSENSUS 5 해소 — canonical vocabulary**:
- `batch_actions[].action` enum 은 **single set**: `{accept, reject, defer, mark_acceptable_gap}`
- `_all` suffix (`defer_all`, `mark_acceptable_gap_all`) 는 **UI rendering layer 의 label alias only** — persisted data model 에는 존재하지 않음
- Runtime parser 는 UI submission 에서 `_all` alias 를 발견하면 `batch_actions[].action` 값으로 alias 제거된 base action 으로 normalize, `target_element_ids` 에 group 전수 전개

**Batch 수행 방식**:
- Phase 3 UI 에서 group row 마다 checkbox + `Apply: [batch action]` dropdown
- Phase 3 footer 에서 "Batch action: all remaining {state} → {action}" (optional aggregate control)
- Principal 의 global reply 에 `batch_actions[{action, target_group, target_element_ids, decided_at}]` 으로 기록 (§3.6 schema)

### 3.4.1 Grouping key canonical table (r2 CONSENSUS 5 해소, r6 확장 — C-02 partition completeness)

Phase 3 grouping key 는 단일 canonical table 에서 enumerate. **r6 확장** — 모든 terminal-pending source state 에 deterministic grouping 경로 보장 (§2.5 4-bucket partition completeness 과 align).

| grouping source | grouping key | 적용 source states |
|---|---|---|
| `pack_missing_areas` aggregate (Step 2 §6.3.1) | `(manifest_ref, heading)` | `domain_pack_incomplete` |
| rationale_state grouping | `rationale_state` | `gap`, `empty` (r2 신규), `domain_scope_miss`, `proposed` (γ-degraded 시) |
| confidence level grouping | `(rationale_state, confidence)` | `reviewed` (low / medium / high 전수, r6 — 이전 "low only" 제한 제거) |
| single-gate flag grouping (r6 신규) | `(rationale_state, single_gate=true)` | non-degraded `proposed` single-gate (Hook γ 미개입 case 2, §2.3) — γ-degraded proposed 와 별도 bucket |

**grouping invariant (r6 C-02 closure)**: 모든 intra-Phase-3.5 state 는 최소 하나의 grouping key 적용 가능 — overflow `reviewed(high|medium)` 및 non-degraded single-gate `proposed` 는 위 3/4 번째 row 를 통해 deterministic bucket 배치. "어느 grouping 에도 속하지 않는 element" 부재 (§2.5 exhaustive partition 과 align).

`batch_actions[].target_group` 은 위 table 의 key 중 하나를 담음 (§3.6 schema). 다른 grouping source 는 v1 scope 밖 (v1.1 backlog §10.2).

### 3.5 Phase 3.5 step sequencing (reconstruct.md §Phase 3.5 extend)

기존 v0 Phase 3.5 steps (reconstruct.md §Phase 3.5 §1~§6):
1. Unresolved conflicts table
2. User Decision Required Items (certainty-based)
3. Other user adjustments
4. Atomicity and crash safety
5. Invariants after Phase 3.5
6. Pending-certainty promotion

**r2 Step 4 extend** (Unique [coverage] malformed/stale validation + [dependency] sweep batch_actions[] 독취 해소):

| 순서 | step | 역할 |
|---|---|---|
| 1 | Unresolved conflicts (v0 기존) | conflict issue resolution |
| **1.5 (r2 신규)** | **Rationale decisions validation** | **§3.6 schema + action × source state compat check. fail 시 `phase_3_5_input_invalid` 로 halt + Phase 3 re-prompt** |
| **2 (r1 신규)** | **Rationale decisions apply (individual + batch)** | **§3.1 matrix 적용, `intent_inference.rationale_state` terminal write** |
| 3 | User Decision Required Items (certainty-based, v0 기존) | certainty level write |
| 4 | Other user adjustments (v0 기존) | free-form patches |
| 5 | Atomicity (v0 기존, r4 확장) | **step 1 + 1.5 + 2 + 3 + 4 + 8** 전수 single atomic wip.yml write (temp + rename). step 1.5 validation pass 후 step 2 / 3 / 4 / 8 이 동일 fsync 경계에 포함 — UF-structure-01 해소 |
| 6 | Invariants (v0 기존, 확장) | rationale_state terminal enum invariant (§3.8) |
| 7 | Pending-certainty promotion (v0 기존) | pending → not-in-source |
| **8 (r1 신규, r2 fix)** | **carry_forward sweep** | per-item + batch action 전무 + global `confirmed` + (source state ∉ {`domain_scope_miss`, `carry_forward`, `principal_*`}) → `carry_forward` 일괄 write |

### 3.5.1 Rationale decisions validation (step 1.5, r2 신규 — Unique [coverage] 해소)

**입력**: `phase3_user_responses.rationale_decisions[]` + `batch_actions[]` (Phase 3 Principal reply)

**check list** (runtime 이 결정적 — LLM 불개입):

1. **Schema validation**: 각 `rationale_decisions[i]` 가 §3.6 schema 에 부합 (required field 존재, enum 값 valid, nested object 구조)
2. **Target existence**: 모든 `element_id` 가 wip.yml `elements[]` 에 존재
3. **Source state currency** (r4 UF-structure-02 해소 — snapshot seat 선언): `rationale_decisions[i].element_id` 의 현재 wip.yml `rationale_state` 와 **render-time snapshot** 의 state 불일치 (stale) 체크. snapshot seat: `.onto/builds/{session}/phase3-snapshot.yml` — Phase 3 rendering 직전 Runtime 이 atomic write (wip.yml element 의 `rationale_state` + `gate_count` + `confidence` 만 포함한 경량 snapshot). stale check 는 이 snapshot 과 Phase 3 reply 시점 wip.yml 상태를 비교. mismatch 시 fail (Phase 3 중 외부 mutation 가능성 방지)
4. **Action × source state compat**: §3.3 disabled rule 위반 없음 (e.g. `empty` source 에 `accept` action 거부)
5. **Batch normalization**: `batch_actions[].action` 이 §3.4 enum, `target_element_ids` 각각이 source state 에 해당 action 허용
6. **principal_provided_rationale 필수 필드**: `action ∈ {modify, provide_rationale, override}` 인 경우 `principal_provided_rationale.{inferred_meaning, justification}` populate 검사

7. **Batch exact-match** (r3 UF-pragmatics-01 해소, r7 single_gate kind 포함): `batch_actions[i].target_element_ids` 가 `target_group.kind` + key 와 **정확히** 매칭 — Runtime 이 wip.yml 에서 해당 group 의 element set 을 재계산해 Principal 제출값과 exact-match 검증. 4 kind 별 재계산 rule:
    - `pack_missing_area`: wip.yml 중 `rationale_state == domain_pack_incomplete AND domain_refs[].manifest_ref == target_group.manifest_ref AND domain_refs[].heading == target_group.heading` element set
    - `rationale_state`: wip.yml 중 `rationale_state == target_group.rationale_state` element set
    - `rationale_state_with_confidence`: wip.yml 중 `rationale_state == target_group.rationale_state AND confidence == target_group.confidence` element set
    - `rationale_state_single_gate` (r7 신규): wip.yml 중 `rationale_state == target_group.rationale_state AND provenance.gate_count == 1 AND provenance.reviewed_at == null` element set (non-degraded single-gate case 2, §2.3)
   불일치 시 fail (Principal stale group 또는 race condition 감지)

**fail 동작**:
- invalid entries 전수 list + reason 을 session-log.yml 에 기록
- `phase3_user_responses` field 는 **persist 하지 않음** (v0 invariant 유지 — invalid submission 은 Phase 3 re-prompt)
- Runtime 이 error code `phase_3_5_input_invalid` 로 Phase 3 re-render
- Principal 에게는 구체 reason 을 포함한 re-prompt message 표시

**`"see below"` global_reply 보조 check** (r4 신규 — C-01 해소, r6 UF-pragmatics-01 확장):
8. **`"see below"` pending coverage**: `global_reply == "see below"` 시, `wip.yml.elements[]` 중 intra-Phase-3.5 state (`reviewed` / `proposed` / `gap` / `domain_pack_incomplete` / `empty`) 인 element 중 `rationale_decisions[].element_id` 또는 `batch_actions[].target_element_ids` 에 address 안 된 것이 1+ → fail (`phase_3_5_input_incomplete`). Principal 에게 미-address id list 제시 + "추가 per-item action 또는 `confirmed` 로 close" 선택 유도. 0 개면 `"confirmed"` 와 동일하게 apply 경로로 (sweep 필요 없음 — 모두 per-item 에서 close).

**`"see below"` × `throttled_out` closure rule (r6 UF-pragmatics-01 해소, r7 domain_scope_miss exception 명시)**:
- `global_reply == "see below"` 이고 `rationale-queue.yaml.entries[].render_bucket == "throttled_out"` 인 element 중 **`rationale_state != domain_scope_miss`** 인 것이 1+ 존재 → fail (`phase_3_5_input_incomplete`). Principal guidance: "throttled_out 상태의 element 는 `"see below"` 에서 직접 address 불가 — `"confirmed"` 로 close 해서 모두 carry_forward 로 넘기거나 `max_individual_items_hard_cap` / `max_group_rows` config 상향 후 재 render"
- **`domain_scope_miss` exception** (r7 CCS-01 해소): throttled_out 된 `domain_scope_miss` element 는 fail 대상 **아님** — γ 가 이미 audit-ready terminal 을 write 한 상태 (§3.2), Phase 3.5 closure 필요 없음. raw.yml consumer 관점에서 `rationale_state == domain_scope_miss` + `principal_judged_at == null` 으로 persist (§3.2 special case 확장)
- 근거: `"see below"` 는 "UI 에 render 된 intra-Phase-3.5 element 에 대한 per-item address" semantic — 이미 terminal 인 `domain_scope_miss` 는 closure 필요 없음
- `"confirmed"` 는 throttled_out 있어도 legal (sweep 가 non-terminal 5 state → `carry_forward` 로 close — §3.5.2 제외 source states 참조. `domain_scope_miss` + `principal_*` + `carry_forward` 는 sweep 제외)

**v1 scope 밖**: partial recovery (valid entries 만 apply) — 부분 수용은 input trust 가 모호해지므로 v1 은 **all-or-nothing** 로 엄격 (v1.1 backlog §10.2).

### 3.5.2 carry_forward sweep algorithm (step 8, r1 신규 — r3 pseudocode fix)

**r3 CONSENSUS 2 해소**: r2 pseudocode 는 `rationale_state = "carry_forward"` 로 덮어쓴 **후** `carry_forward_from = e.intent_inference.rationale_state` 를 기록해 원 state 가 아니라 이미 덮어쓴 `"carry_forward"` 만 저장되는 bug. **original state capture before overwrite** 순서로 수정.

```
excluded_element_ids = {
  e.element_id  for e in phase3_user_responses.rationale_decisions
} ∪ {
  id  for batch in phase3_user_responses.batch_actions
      for id in batch.target_element_ids
}

For each element e in wip.yml.elements[]:
  if e.intent_inference.rationale_state ∈ {reviewed, proposed, gap, domain_pack_incomplete, empty}
     AND e.element_id NOT in excluded_element_ids
     AND phase3_user_responses.global_reply == "confirmed":
    # r3 fix — original state 먼저 capture, overwrite 는 그 다음
    original_state = e.intent_inference.rationale_state
    # Write (순서 중요):
    e.intent_inference.provenance.carry_forward_from = original_state                   # Layer B bridge write (§3.9)
    e.intent_inference.provenance.principal_judged_at = null                            # r3 single seat (§4.3)
    e.intent_inference.rationale_state = "carry_forward"                                # artifact terminal (§3.9 Layer A)
```

**3 key invariants**:
1. `carry_forward_from` 은 5 source state (`reviewed / proposed / gap / domain_pack_incomplete / empty`) 중 하나로 기록 (terminal source 는 불가 — sweep 대상 아님)
2. `rationale_state == carry_forward` 인 element 는 항상 `provenance.carry_forward_from != null` (invariant)
3. `rationale_state != carry_forward` 인 element 는 `provenance.carry_forward_from == null` (sweep 이 한 번도 적용 안 됨)

**r2 fix (Unique [dependency] 해소)**: `excluded_element_ids` set 에 `batch_actions[].target_element_ids` 를 추가하여 이미 batch 로 판정된 element 를 sweep 이 overwrite 하지 않도록 보장.

**제외 source states** (sweep 이 처리하지 않음):
- `domain_scope_miss` — §3.2 special case, 미판정 유지
- `carry_forward` — 이전 reconstruct 에서 넘어온 state (이중 carry 금지)
- `principal_*` (6 종) — 이미 per-item action 대상으로 전이됨 (excluded_element_ids 에 포함)

**§3.9 Layer B bridge 와의 정합**: 차기 reconstruct 가 본 raw.yml 을 seed 로 재진입 시, `provenance.carry_forward_from` 을 read 해 원 source state 로 복원 후 재판정 대상 편입. sweep 이 이 value 를 정확히 write 하지 않으면 Layer B 는 무효 — r3 fix 의 실질적 근거.

### 3.6 `phase3_user_responses.rationale_decisions[]` schema

Phase 3 Principal reply 를 Runtime 이 parse 후 wip.yml 에 persist 하는 canonical structure (r2 — batch vocabulary 단일화 + grouping_key §3.4.1 정합):

```yaml
phase3_user_responses:
  received_at: string
  global_reply: "confirmed" | "see below"               # r4 C-01 해소 — enum 을 restrict (ambiguous "other" 제거)
                                                          # r3 behavior documentation (UF-semantics-01 해소):
                                                          #   "confirmed" 의 실제 동작: per-item + batch action 으로 명시 처리 안 된 남은 pending element
                                                          #     전수를 §3.5.2 sweep 이 carry_forward 로 close (semantic approval 이 아님).
                                                          #     즉 "본 세션 Phase 3 를 마감하고, 미판정 element 는 차기 reconstruct 에 넘김" 신호.
                                                          #   "see below" 의 실제 동작 (r4 신규 deterministic closure):
                                                          #     Phase 3.5 sweep 미수행. per-item + batch action 에서 address 되지 않은 pending element 가 1+ 존재 시
                                                          #     runtime 은 phase_3_5_input_incomplete 로 halt + Phase 3 re-prompt (미address pending id list 제시).
                                                          #     0 개면 `"confirmed"` 로 implicit 승격 (모든 pending 이 per-item + batch 에서 address 됨).
                                                          #   "other" (ambiguous free-form) 는 v1 enum 에서 제거 — runtime 이 받으면 phase_3_5_input_invalid (§3.5.1).
                                                          #   v1.1 에서 "finalize" rename 검토 (§10.2).
  rationale_decisions:
    - element_id: string
      action: accept | reject | modify | defer | provide_rationale | mark_acceptable_gap | override
      principal_provided_rationale:        # action ∈ {modify, provide_rationale, override} 에만 populate (§3.5.1 check 6)
        inferred_meaning: string
        justification: string
      principal_note: string | null        # 자유 기술
      decided_at: string                   # Principal action 시점 (UI event)
  batch_actions:
    - action: accept | reject | defer | mark_acceptable_gap     # r2 — single enum, _all alias 제거 (§3.4)
      target_group:                                              # §3.4.1 canonical grouping key table 준수
        kind: "pack_missing_area" | "rationale_state" | "rationale_state_with_confidence" | "rationale_state_single_gate"
                                                                 # r7 CNS-01 — 4번째 kind 추가 (§3.4.1 row 4)
                                                                 # r8 CNS-03 — kind 자체가 single_gate constraint 를 내포
                                                                 #   (rationale_state_single_gate = provenance.gate_count == 1 AND provenance.reviewed_at == null)
                                                                 # 따라서 별도 single_gate field 불필요 (derive-only)
        manifest_ref: string | null                              # kind == "pack_missing_area" 시 populate
        heading: string | null                                   # kind == "pack_missing_area" 시 populate
        rationale_state: string | null                          # kind ∈ {rationale_state / rationale_state_with_confidence / rationale_state_single_gate} 시
        confidence: string | null                                # kind == "rationale_state_with_confidence" 시 (e.g. "low")
      target_element_ids: array of string                        # group 원 element 전수 (Runtime normalize 시 전개)
      decided_at: string
  conflict_decisions: array (v0 기존)
  certainty_decisions: array (v0 기존)
  other_adjustments: array (v0 기존)
```

**Runtime apply rule** (§3.5.1 validation 통과 후):
1. `rationale_decisions[]` 먼저 apply (individual — §3.5 step 2)
2. `batch_actions[]` apply (group — §3.5 step 2, individual 과 동일 write path; Runtime 이 `target_element_ids` 를 iterate 하며 §3.1 matrix 적용)
3. 두 list 가 동일 element_id 를 가리키면 **individual 이 우선** (Principal 의 per-element explicit intent)
4. 전체가 single atomic fsync (§3.5 step 5)

### 3.6.1 `principal_provided_rationale` persistence path (r2 canonical)

**canonical seat**: `elements[].intent_inference.principal_provided_rationale` (element-level). raw.yml 저장 시 §4.3 element-level `intent_inference` block 에 포함.

`phase3_user_responses.rationale_decisions[i].principal_provided_rationale` 은 **input buffer** (Phase 3 reply 원형 보존). Runtime apply (§3.5 step 2) 시 element-level field 로 mirror write.

### 3.7 Phase 3.5 idempotency (v0 invariant 확장)

v0 §4.1 idempotency: "re-running with same phase3_user_responses produces identical wip.yml state".

**Step 4 확장**:
- `rationale_decisions[]` + `batch_actions[]` 적용 순서는 element_id 순 (deterministic)
- `carry_forward sweep` (§3.5 step 8) 은 rationale_decisions 적용 후 수행
- 동일 `phase3_user_responses` 로 재실행 시 동일 terminal state distribution

### 3.8 Runtime sole-writer 원칙 (LLM 불개입)

Phase 3.5 의 모든 step 은 Runtime Coordinator (deterministic) 가 sole-writer. 본 §3 의 §3.1 matrix + §3.5 step sequencing + §3.6 schema 는 **runtime decision rule** — LLM 에 쿼리 없음. Step 1 §7.9 canonical rule 과 정합.

### 3.8.1 Rationale terminal state enum (r2 invariant 확장)

Phase 3.5 완료 후 모든 element 의 `intent_inference.rationale_state` 는 다음 enum 중 하나 (§3.5 step 6 invariant):

```
terminal = {
  principal_accepted,
  principal_rejected,
  principal_modified,
  principal_accepted_gap,
  principal_deferred,
  principal_confirmed_scope_miss,       # r2 신규 (§3.2)
  carry_forward,                         # §3.9 artifact terminal
  domain_scope_miss                      # γ 판정 미판정 유지 (§3.2 special case)
}
```

총 8 terminal. `reviewed` / `proposed` / `gap` / `domain_pack_incomplete` / `empty` 는 **intra-Phase-3.5** state — Phase 3.5 완료 후 남아 있으면 Runtime defect.

### 3.9 `carry_forward` 2 layer semantic (r2 [semantics] Unique 해소)

**r1 collision**: carry_forward 가 "artifact terminal" (Phase 3.5 완료 후 raw.yml 저장 상태) 이면서 "semantic 미판정" (차기 reconstruct 재판정 대상) 으로 동시 기술 → 의미 모호.

**r2 canonical split**:

**Layer A — artifact terminal** (본 reconstruct 의 Phase 3.5 완료 후 state):
- `rationale_state == carry_forward` 는 "본 세션에서 Principal per-item + batch action 이 없었고 global `confirmed` 로 마무리됨" 을 persist
- raw.yml 의 artifact perspective 에서 **완료된 state**
- `principal_judged_at = null` 이 audit marker

**Layer B — semantic 미판정 (차기 reconstruct 의 input)**:
- 차기 reconstruct 가 본 raw.yml 을 seed 로 재진입 시, `carry_forward` element 는 **§3.5.2 `provenance.carry_forward_from`** 에 기록된 원 source state 로 reload 되어 판정 대상에 재편입
- 즉 "artifact terminal" 은 본 세션 경계에서만 terminal, 차기 세션에서는 re-judgment source

**raw.yml consumer 구별**:
- govern audit: layer A 관점 (본 세션 completion 의 audit)
- learn / 차기 reconstruct: layer B 관점 (`provenance.carry_forward_from` 필수 read)

**§3.5.2 sweep 에서 `carry_forward` 는 이미 terminal 로 간주**: 이중 carry 방지 (§3.5.2 제외 source states).

---

## 4. raw.yml meta 확장 — CANONICAL SCHEMA

### 4.1 `raw.yml.meta` 확장 schema (SINGLE AUTHORITY)

reconstruct.md §Phase 4 common meta header extend. Step 1 §4.7 + Step 3 §7.1 + Step 3 §10.1 통합.

```yaml
meta:
  # v0 기존 (reconstruct.md §Phase 4 §1455~):
  schema: ./schema.yml
  source_type: string
  domain: string
  source: string
  date: string
  rounds: integer
  convergence: converged | max_rounds_reached
  unexplored_directions: array
  agents: array

  # Step 4 신규 — intent_inference mode (세션 수준):
  inference_mode: full | degraded | none                        # Step 1 §4.7
  degraded_reason: pack_optional_missing | pack_quality_floor | pack_tier_minimal | null
  fallback_reason: user_flag | principal_confirmed_no_domain | proposer_failure_downgraded | null
                                                                 # proposer_failure_downgraded: Q-S2-21 선례 (§6 Step 2 amendment 에서 enum 추가)
  domain_quality_tier: full | partial | minimal | null          # inference_mode ∈ {full, degraded} 만 populate

  # Step 4 신규 — manifest pair (Step 1 §6.2):
  manifest_schema_version: string | null                        # "1.0" 등
  domain_manifest_version: string | null                        # manifest.domain_manifest_version (r9 UF-semantics-01 — manifest.version alias 제거)
  domain_manifest_hash: string | null                           # manifest.version_hash
  manifest_recovery_from_malformed: boolean                     # r8 CNS-02 해소 — manifest.recovery_from_malformed mirror
                                                                 # true 시: 본 세션의 manifest 는 malformed recovery 기원 (intentional semver discontinuity, §5.6.1)
                                                                 # raw.yml consumer (govern / learn) 이 "domain_manifest_version 이 이전 세션보다 낮을 수 있음" 을 알 수 있는 audit signal
                                                                 # 기본값 false (정상 manifest path)

  # Step 4 신규 — γ review 결과 session-level summary:
  rationale_review_degraded: boolean                            # Step 3 §7.1 [d]
  rationale_reviewer_failures_streak: integer                   # Step 3 §7.4
  rationale_reviewer_contract_version: string | null            # "1.0" 등
  rationale_proposer_contract_version: string | null

  # Step 4 신규 — pack-level aggregation:
  pack_missing_areas:                                           # Step 2 §6.3.1 sync (r6 narrow — domain_pack_incomplete 만, non-semantic)
    - grouping_key:
        manifest_ref: string
        heading: string
      element_ids: array of string

  # Step 4 신규 — γ review artifact provenance:
  step2c_review_state: completed | partial | degraded | aborted | null
  step2c_review_retry_count: integer | null

  # v0 기존 (§Phase 3 response):
  phase3_user_responses: (schema §3.6 참조)
```

### 4.2 raw.yml meta mutual exclusion + co-occurrence matrix (r2 CONSENSUS Conditional 해소)

Step 1 §4.7 Mutual exclusion + Step 3 rationale_review_degraded co-occurrence 를 machine-readable table 로 통합. **r2 fix**: `pack_optional_missing × minimal tier` overlap 제거, `manifest.quality_tier` ↔ `domain_quality_tier` 1:1 mapping 명시.

**`manifest.quality_tier` ↔ `domain_quality_tier` mapping** (r2 canonical):
- 두 field 는 **동일 value** 로 1:1 mirror. `raw.yml.meta.domain_quality_tier = manifest.yaml.quality_tier`
- `raw.yml` persist 시점에 runtime 이 read-copy, Principal 이 `onto domain init` 에서 선언한 값을 훼손하지 않음
- drift 감지: raw.yml write 직전 runtime validation — 두 value 불일치 시 `manifest_quality_tier_mismatch` halt

**Mutual exclusion matrix** (r2 — 7 → 6 row, overlap 제거):

| condition | inference_mode | degraded_reason | fallback_reason | domain_quality_tier | rationale_review_degraded | rationale_reviewer_failures_streak |
|---|---|---|---|---|---|---|
| Entry v1 full | `full` | null | null | `full` | any (γ 결과) | 0 ~ max_streak |
| Entry v1 degraded (optional missing) | `degraded` | `pack_optional_missing` | null | **`full` \| `partial`** (`minimal` 제외 — §4.7.1 precedence order 상 `pack_tier_minimal` 이 우선) | any | 0 ~ max_streak |
| Entry v1 degraded (quality floor) | `degraded` | `pack_quality_floor` | null | `full` \| `partial` \| `minimal` | any | 0 ~ max_streak |
| Entry v1 degraded (tier minimal) | `degraded` | `pack_tier_minimal` | null | `minimal` | any | 0 ~ max_streak |
| Entry v0 fallback (flag) | `none` | null | `user_flag` | null | false (γ 미실행) | 0 |
| Entry v0 fallback (principal no-domain) | `none` | null | `principal_confirmed_no_domain` | null | false | 0 |
| Entry v0 fallback (proposer 실패 downgrade) | `none` | null | `proposer_failure_downgraded` | null | false | 0 |

**Validation rule** (Runtime check on raw.yml write):
- `inference_mode == full` → `degraded_reason IS NULL AND fallback_reason IS NULL AND domain_quality_tier == 'full' AND manifest.quality_tier == 'full'`
- `inference_mode == degraded` → `degraded_reason IS NOT NULL AND fallback_reason IS NULL AND domain_quality_tier == manifest.quality_tier`
- `inference_mode == degraded AND degraded_reason == 'pack_optional_missing'` → `domain_quality_tier ∈ {full, partial}` (minimal 금지 — §4.7.1 precedence order 상 `pack_tier_minimal` 이 우선)
- `inference_mode == degraded AND degraded_reason == 'pack_tier_minimal'` → `domain_quality_tier == 'minimal'`
- `inference_mode == none` → `degraded_reason IS NULL AND fallback_reason IS NOT NULL AND domain_quality_tier IS NULL AND rationale_review_degraded == false`
- 위반 시 raw.yml write 거부 (Runtime bug — halt + session-log 기록, error code `raw_yml_meta_invariant_violation`)

**Step 1 §4.7.1 precedence 와의 관계**: 본 matrix 는 Step 1 §4.7.1 precedence order (1. required 부재 → halt / 2. quality_floor → degraded / 3. tier minimal → degraded / 4. optional missing → degraded / 5. 모든 통과 → full) 의 row-level persist 결과. §4.7.1 canonical consume (본 문서 재선언 아님).

### 4.3 Element-level `intent_inference` block persist (v0 elements 불존재 대응)

v0 `raw.yml.elements[]` 에는 `intent_inference` field 없음. v1 `inference_mode ∈ {full, degraded}` 시 raw.yml 로 persist 하는 extend:

**r3 CONSENSUS 1 해소 — single-seat 완전 정렬**:
- `gate_count` single seat = `intent_inference.provenance.gate_count` (top-level `intent_inference.gate_count` 제거)
- `principal_judged_at` single seat = `intent_inference.provenance.principal_judged_at` (top-level 이나 다른 위치에 두지 않음 — §4.4 persistence table 과 정합)
- `rationale_state` enum 에 `principal_confirmed_scope_miss` 포함 (r2 §3.8.1 canonical mirror)
- `provenance.carry_forward_from` field 추가 (§3.5.2 sweep 이 write, §3.9 Layer B bridge 의 persistence sink)

```yaml
elements:
  - id: string
    type: string
    name: string
    definition: string
    certainty: observed | rationale-absent | inferred | ambiguous | not-in-source
    # v0 기존 field 계속 유지

    # Step 4 신규 — v1 intent_inference block (r3 single-seat aligned):
    intent_inference:
      rationale_state: reviewed | proposed | gap | domain_pack_incomplete | domain_scope_miss | empty | carry_forward | principal_accepted | principal_modified | principal_rejected | principal_accepted_gap | principal_deferred | principal_confirmed_scope_miss
        # intra-Phase-3.5: reviewed / proposed / gap / domain_pack_incomplete / domain_scope_miss / empty
        # terminal (§3.8.1): carry_forward / domain_scope_miss (미판정 유지) / principal_* (6 종)
      inferred_meaning: string | null
      justification: string | null
      domain_refs: array | null
      confidence: low | medium | high | null
      state_reason: string | null
      principal_provided_rationale: object | null       # §3.6 schema — action ∈ {modify, provide_rationale, override}
      principal_note: string | null
      # NOTE: gate_count + principal_judged_at 은 provenance 내부 (single seat, r3)
      provenance:
        # Element-level provenance (Step 3 §3.7.2 canonical + r3 single-seat):
        proposed_at: string | null
        proposed_by: string | null
        proposer_contract_version: string | null
        reviewed_at: string | null
        reviewed_by: string | null
        reviewer_contract_version: string | null
        principal_judged_at: string | null              # r3 single seat (Phase 3.5 write)
        gate_count: integer                             # v1 range: {1, 2}, future-extensible (§2.3)
        carry_forward_from: string | null               # r3 신규 — §3.5.2 sweep capture, §3.9 Layer B bridge
        carry_forward_from_schema_version: string | null  # r4 UF-evolution-01 — v1: "rationale_state/1.0". v1.2+ source state 추가 시 version bump, 차기 reconstruct 가 이 version 으로 source state migration rule select
        wip_snapshot_hash: string | null                # Step 3 §3.7.1
        domain_files_content_hash: string | null        # Step 3 §3.7.1
        hash_algorithm: string | null                   # "sha256" 등
        input_chunks: integer | null                    # v1 default 1
        truncated_fields: array | null
        effective_injected_files: array | null          # Step 2 §3.6
```

**`inference_mode == none` 시**: element-level `intent_inference` block 은 raw.yml 에서 **omit** (v0 호환 유지).

### 4.4 Persistence responsibility chain

| field | Populated by | Hook |
|---|---|---|
| `meta.inference_mode`, `degraded_reason`, `fallback_reason`, `domain_quality_tier` | Runtime (pre-Phase 1) | Fail-close contract (Step 1 §5.2) |
| `meta.manifest_*` | Runtime (pre-Phase 1) | Step 1 §5.1 entry |
| `meta.manifest_recovery_from_malformed` (r8 신규) | Runtime (pre-Phase 1) — `manifest.yaml.recovery_from_malformed` 를 read-mirror | §5.6.1 audit signal propagation |
| `meta.rationale_review_degraded`, `rationale_reviewer_failures_streak` | Runtime (post-Phase 2 Step 2c) | Hook γ (Step 3 §7.1, §7.4) |
| `meta.pack_missing_areas` | Runtime (post-Hook α) | Hook α post-pass (Step 2 §6.3.1) |
| `meta.step2c_review_state`, `step2c_review_retry_count` | Runtime (during Phase 2 Step 2c) | Hook γ state machine (Step 3 §6.2) |
| `meta.phase3_user_responses` | Runtime (at Phase 3 response) | v0 + §3.6 extend |
| element `intent_inference.inferred_meaning`, `justification`, `domain_refs`, `confidence`, `state_reason` | Hook α (Runtime apply) | Step 2 §6.3 |
| element `intent_inference.rationale_state` | Hook α + Hook γ + Hook δ (Phase 3.5) | Step 2/3/4 |
| element `intent_inference.provenance.gate_count` | Hook α (init = 1) + Hook γ (increment = 2) | Step 2 §6.3 (§6 Step 2 amendment) + Step 3 §3.7.2 |
| element `intent_inference.provenance.reviewed_at / reviewed_by` | Hook γ | Step 3 §3.7.2 |
| element `intent_inference.principal_provided_rationale` + `principal_note` | Hook δ (Phase 3.5 step 2) | 본 Step 4 §3.6.1 |
| element `intent_inference.provenance.principal_judged_at` (r3 single seat) | Hook δ (Phase 3.5 step 2; action 시 populate, 미판정 carry_forward / domain_scope_miss 유지 시 null) | 본 Step 4 §3.1 matrix + §3.5.2 sweep |
| element `intent_inference.provenance.carry_forward_from` (r3 신규) | Hook δ (Phase 3.5 step 8 sweep — original rationale_state capture) | 본 Step 4 §3.5.2 + §3.9 Layer B bridge |

### 4.5 Provenance full persistence

Step 3 §3.7.1 의 `wip_snapshot_hash` + `domain_files_content_hash` + `hash_algorithm` 은 raw.yml element-level provenance 에 **persist** — Principal 이 "이 rationale 이 어떤 wip 와 어떤 domain file 기준에서 review 되었는가" audit 가능.

**persistence format**: element 단위. session 수준에 중복 저장하지 않음 (각 element 가 독립적으로 hash 를 가짐 — Step 3 §3.7.1 r3 canonical).

---

## 5. `onto domain init` CLI contract — CANONICAL

### 5.1 CLI 의 위치 + scope (r2 axiology — product-locality exception)

**위치**: `.onto/commands/domain-init.md` (신설 — Track B 실 작성)

**scope 내부**:
- `~/.onto/domains/{domain}/manifest.yaml` 생성 / 갱신
- Principal 이 authority 를 행사하는 mechanism (Step 1 §6.1 canonical)

**scope 밖**:
- reconstruct runtime 의 manifest consumption (Step 1 §6.1 ~ §6.3)
- domain pack content (`concepts.md`, `structure_spec.md`, ...) 의 authoring — 별도
- `onto domain manifest-migrate` (v1.1 backlog)

### 5.1.1 Product-locality exception 선언 (r2 Axiology + r3 UF-axiology-01 해소)

**r3 재서술 (r2 Axiology Consensus + UF-axiology-01 해소)**: r2 문구가 domain scope 와 methodology scope 를 합쳐 product override 를 backlog 로 지나치게 밀어냄. r3 는 **3 scope 를 명시 구별** + shared-reference 예외만 좁게 유지.

**3 scope canonical 구별**:

| scope | 대상 | 소비 경로 | product-locality principle 적용? |
|---|---|---|---|
| **domain pack content** (방법론 지식) | `concepts.md`, `structure_spec.md`, `logic_rules.md`, `domain_scope.md`, auxiliary md | `~/.onto/domains/{domain}/` (shared reference) | **예외** — cross-product 공유 |
| **domain pack manifest** (pack meta 선언) | `manifest.yaml` (quality_tier, required/optional, version_hash) | `~/.onto/domains/{domain}/manifest.yaml` (shared reference 동일) | **예외** — domain pack content 와 paired |
| **product-specific state** (제품 reconstruct 결과) | `wip.yml`, `raw.yml`, `session-log.yml`, `rationale-queue.yaml` | `{product}/.onto/builds/{session}/` (product-local) | **원칙 적용** |

**core principle**: product-locality principle 은 **제품 특정 상태 (wip/raw 등)** 에 적용. domain pack 은 cross-product 재사용 asset 이므로 원칙의 "제품 별 상태" 대상이 아니라 별개 category (**shared reference**).

**shared-reference 예외 의미** (scope 엄격):
- "product 별 재정의 금지" 가 아님 (v1.1 override 경로가 그 정확한 의미)
- "domain pack 은 제품 특정이 아닌 방법론 asset 이므로 shared reference 배치가 자연" — 이 사실 자체가 예외 선언

**product-local override 는 backlog 아님, 보완 layer** (v1.1):
- `{product}/.onto/domains/{domain}/` override 경로 는 shared reference 를 **대체** 하는 것이 아니라 **product 별 refinement layer** 추가 (resolve order: product-local → shared)
- v1 은 shared-only — single resolve path. v1.1 이 multi-layer resolve 도입
- 이는 product-locality 원칙의 **연장**, 예외 확대가 아님

**mirror note (Track B 추가)**: `.onto/principles/product-locality-principle.md` 에 §7.3 canonical seat migration commit 시 한 줄 추가 — "Cross-product shared reference (domain pack 방법론 asset) 는 `~/.onto/domains/{domain}/` 에 배치. 제품 별 refinement layer 는 v1.1 backlog (`domain-resolve-order` canonical)".

### 5.2 Usage 3 branches

```bash
# 1. 신규 pack (interactive)
onto domain init <name>

# 2. Legacy pack migrate (interactive) — manifest.yaml 부재인 기존 pack
onto domain init --migrate-existing <name>

# 3. CI (non-interactive) — config file 필수
onto domain init <name> --config <path-to-init.yaml>
```

### 5.3 Interactive flow canonical sequence (§1 ~ §6 순서, r7 — `domain_manifest_version` 수집 추가)

Step 1 §6.4 mirror + 구체화:

1. **Scan** — `~/.onto/domains/{name}/` 아래의 모든 `*.md` 파일 나열
   - 파일 없음 → "Empty directory. Create canonical files first (concepts.md, structure_spec.md, logic_rules.md, domain_scope.md). Abort." exit code 비-0
2. **Classify** — 각 파일의 `required: true / false` 를 Principal 이 선택
   - default suggestion: 4 canonical file (`concepts.md`, `structure_spec.md`, `logic_rules.md`, `domain_scope.md`) 은 `required: true` pre-check
   - 그 외 `*.md` 는 `required: false` pre-check
   - Principal 이 override 가능
3. **quality_tier 선언** — `full | partial | minimal`
   - UI 설명:
     - `full`: 4 canonical file 전수 존재 + `optional` file 다수 (ex: 7 이상)
     - `partial`: 4 canonical file 전수 존재, optional 일부
     - `minimal`: 4 canonical 중 일부만 (운영 가능하나 degraded 로 강제)
   - Principal 이 현재 pack 상태를 자기 판정
4. **upgrade_status** — `completed | in_progress | not_started`, **notes** free-form text
5. **`domain_manifest_version` 입력** (r7 UF-coverage-domain-manifest-version-producer-gap 해소)
   - §5.6.1 semver grammar (e.g. `"0.1.0"`) 로 입력
   - 신규 init default suggestion: `"0.1.0"`
   - `--migrate-existing` default suggestion: legacy pack 의 README / 기존 frontmatter 에서 힌트 추출 가능하면 제시, 없으면 `"0.1.0"`
   - 입력 값이 semver grammar 불일치 → 재입력 요청
6. **CLI 자동 populate**: `last_updated` = current ISO 8601 UTC (§5.4.2 Unenforced soft category 의 CLI auto-write)
7. **version_hash 계산** + `manifest.yaml` 작성
   - `version_hash` = §5.5 canonical algorithm
   - `manifest.yaml` 을 atomic write (temp + rename)

### 5.4 `--migrate-existing` branch (r2 — regeneration branch 추가, r3 manual edit 경로 closure)

**detection rule**:
- `~/.onto/domains/{name}/` 에 `manifest.yaml` **부재** AND 하나 이상의 `*.md` 존재 → legacy pack 으로 판정 → `--migrate-existing` 허용
- `manifest.yaml` 존재 시 `--migrate-existing` 거부 (error message: "Manifest already exists. Use `onto domain init --regenerate {name}` to regenerate interactively." + exit code 비-0)

**flow**: §5.3 interactive flow 와 동일 (Principal 이 required/optional/tier 명시 선언).

**기존 11 도메인 migration 목적**: Step 1 §6.5 — Phase 4 v1 진입 전 Principal 이 한 번 실행하여 legacy pack 을 manifest-backed 로 승격.

### 5.4.2 Manual `manifest.yaml` edit 경로 — enforced vs unenforced 구분 (r4 D-01 + C-02 + r5 UF-logic-01 해소)

**r6/r8/r9/r13/r14 centralized taxonomy**: 모든 governed subject (manifest field + pack-content 실제 파일) 는 **3 top-level category** (Runtime-managed / Enforced / Unenforced soft) 중 하나. `domain_manifest_version` 은 Enforced → semver guard.

- **pack-content + pack-spec 편집**: `onto domain init --regenerate` 가 canonical 경로. manual text edit 는 §5.5 `version_hash` mismatch 로 runtime 이 감지 (`manifest_version_hash_mismatch` halt)
- **`domain_manifest_version` 편집**: `--regenerate` 가 canonical 경로. manual edit 의 runtime 감지 범위는 §5.6.2 가 canonical — (a) malformed semver 는 pre-load gate 로 차단, (b) regenerate 실행 시 non-bump 는 comparator 로 차단. **intentional limitation**: "YAML-valid manual bump + unchanged pack" 은 차단 대상 아님 (§5.6.2)
- **unenforced soft fields**: `notes`, `upgrade_status` 만 manual edit 허용 (`last_updated` 는 CLI 가 auto-populate, Principal manual 쓰더라도 다음 CLI write 에서 덮어씀)

**r7 strict 3-category taxonomy** (r5 C-01 + C-03 + r6 UF-evolution-01 + r7 CNS-02 해소, r13 UF-semantics-01 — table scope 정밀화): 모든 **governed subject** (manifest field + 그 field 가 지시하는 pack-content) 가 **정확히 3 top-level category** (Runtime-managed / Enforced / Unenforced soft) 중 하나에 분류. `Pack-spec` / `Pack-content` / `Semver` 는 **guard mechanism subtype** — category 가 아닌 enforcement 의 구체 수단.

**r7 centralized governed-subject taxonomy — 3 top-level category** (r13 — "manifest field" → "governed subject" scope 정정, manifest field + pack-content 실제 파일 모두 포함):

| governed subject | category (3 top-level) | guard mechanism (subtype, Enforced 에만 적용) |
|---|---|---|
| `domain_name` | **Runtime-managed** (r8 CNS-01 해소 — hash input 에서 제거) | pre-load gate: `path ↔ domain_name` consistency 검증 (`~/.onto/domains/{name}/manifest.yaml` 의 `{name}` 이 `manifest.domain_name` 와 일치해야 함). 불일치 시 `manifest_identity_mismatch` halt. §5.5 hash input 에 포함되지 않음 (dual-membership 제거) |
| `manifest_schema_version` | **Runtime-managed** | pre-load required + supported_list check (§5.7). hash input 제외 (r6) |
| `version_hash` | **Runtime-managed** | pre-load required + §5.5 재계산 비교 |
| `recovery_from_malformed` (r8 신규 — CNS-02 해소) | **Runtime-managed** (audit signal) | CLI 가 §5.6.1 malformed recovery path 에서 `true` 로 write. 다음 `--regenerate` 가 malformed 아니면 `false`/absent 로 write (§5.6.1 clear rule). raw.yml mirror seat: `meta.manifest_recovery_from_malformed` (§4.1). pre-load gate 는 이 field 를 검증하지 않음 (audit-only) |
| `referenced_files[].path` | **Enforced** | pack-spec guard (§5.5 hash input) |
| `referenced_files[].{required, min_headings}` | **Enforced** | pack-spec guard (§5.5 hash input) |
| `quality_tier` | **Enforced** | pack-spec guard (§5.5 hash input) |
| `referenced_files[].path` 의 실제 파일 content | **Enforced** | pack-content guard (§5.5 hash input 의 pack_files_map) |
| `domain_manifest_version` | **Enforced** (r8/r11 — closure scope narrow) | semver guard (§5.6.1 grammar parse + comparator). failure codes: `manifest_version_format_invalid` (§5.6.1 grammar fail) / `manifest_version_not_incremented` (§5.4.1 comparator non-bump). **closure scope authority**: **§5.6.2** ("YAML-valid manual semver bump + unchanged pack" 은 v1 intentional limitation, 차단 대상 아님) |
| `notes` | **Unenforced soft** | — (Principal freeform) |
| `upgrade_status` | **Unenforced soft** | — (Principal freeform) |
| `last_updated` | **Unenforced soft** (r7 — Recommendation 3 해소) | CLI 가 `onto domain init` / `--regenerate` write 시점에 **자동 populate** (ISO 8601 UTC). Principal manual edit 허용되지만 runtime 이 다시 write 시 덮어씀 |

**3 category 의 경계 원칙** (r10 DGS-01 해소 — Enforced 원칙 문장 narrow):
- **Runtime-managed**: CLI / runtime 이 관리, Principal 편집 대상 아님. pre-load gate (identity / schema_version / hash) 로 missing/invalid 감지. audit signal (`recovery_from_malformed`) 는 runtime write + raw.yml mirror
- **Enforced**: `--regenerate` 가 canonical 편집 경로. guard mechanism (pack-spec / pack-content / semver) 이 runtime 감지 범위 내의 manual drift 만 차단 — row-level exception (예: `domain_manifest_version` 의 §5.6.2 narrow closure scope) 는 각 row 의 guard column 이 canonical, 본 원칙 문장이 덮어쓰지 않음
- **Unenforced soft**: manual text edit 허용, runtime guard 없음 (다만 `last_updated` 는 CLI 가 자동 갱신)

**guard mechanism subtypes** (Enforced category 내부):
- `pack-spec guard`: §5.5 hash input 의 `quality_tier` + `referenced_files_spec[path/required/min_headings]` (r8 — `domain_name` 제외)
- `pack-content guard`: §5.5 hash input 의 `pack_files_map`
- `semver guard`: §5.6.1 grammar parse + comparator

**§5.4.2 가 single authority, 다른 section 은 pointer** (r8 Recommendation 1 해소): 본 §5.4.2 table 이 canonical. §5.5 / §5.6.1 / §4.1 등 다른 section 은 "본 §5.4.2 의 {field} 분류 참조" 로만 기술, field-role 정의를 재진술하지 않음 (drift 원천 차단).

**future-proof rule**: 새 governed subject (manifest field 신규 또는 pack-content scope 확장) 는 3 top-level category 중 하나에 명시 분류. Enforced 이면 guard mechanism subtype 도 선언. taxonomy drift 방지.

**r4 C-02 해소 — malformed manifest recovery**:

**detection** (pre-load stage):
- reconstruct runtime 이 `~/.onto/domains/{domain}/manifest.yaml` 을 **load 하기 전** YAML parse + top-level required field 존재 확인
- required field set (r6 centralized): `manifest_schema_version`, `domain_name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `version_hash`
  - `domain_manifest_version` 이 r6 에서 required 로 승격 (이전 round 의 "soft field" 분류 오류 수정 — §5.4.2 category table)
- YAML parse error 또는 required field missing → `manifest_malformed` halt (§5.6.3 canonical)
- `domain_manifest_version` 존재하지만 §5.6.1 semver grammar 불일치 → `manifest_version_format_invalid` halt (§5.6.3 canonical)
- 두 halt 모두 version_hash 계산 이전에 발생

**recovery guidance**:
```
Manifest at ~/.onto/domains/{domain}/manifest.yaml is malformed:
  {reason — YAML parse error or missing field list}

To recover without Principal manually editing the broken file:
  1. (Preferred) Re-initialize: run `onto domain init --regenerate {domain}` — the
     existing manifest will be moved to manifest.yaml.bak-{timestamp} and a new one
     will be generated interactively. No reliance on successfully reading the broken manifest.
  2. (Alternative) Delete the corrupted file and run `onto domain init --migrate-existing {domain}`.
```

**key property**: recovery path 는 broken manifest 의 parse 에 **의존하지 않음** — `--regenerate` 는 기존 파일을 backup (bytes 그대로 rename) 후 scratch 에서 interactive 재실행. C-02 해소의 핵심.

**v1.1 backlog**: validated manual edit mode (`onto domain manifest-validate {domain}`) — 편집 후 version_hash + bump + schema 재검증 후 commit. v1 은 `--regenerate` 만.

### 5.4.1 `--regenerate` branch (r2 신규 — Unique [coverage] 해소, r4 CI path 추가)

**usage**:
```bash
# interactive
onto domain init --regenerate <name>

# non-interactive (CI, r4 UF-coverage-02 해소)
onto domain init --regenerate <name> --config <path-to-regenerate.yaml>
```

**detection rule**:
- `manifest.yaml` **존재** 전제 (부재 시 error — `--migrate-existing` 쓰라 guidance). 단 malformed 인 경우 §5.4.2 recovery path 로 진입 (parse 성공 불필요)
- 실행 시 기존 manifest.yaml 을 backup 경로 `manifest.yaml.bak-{timestamp}` 로 이동 (bytes-level rename — broken 이어도 안전) 후 §5.3 interactive flow 재실행

**flow (interactive)**:
1. 기존 `manifest.yaml` 을 backup (bytes rename)
2. 기존 값 parse 시도 → 성공하면 각 field 를 interactive prompt 의 default suggestion 으로 prefill, 실패하면 blank 상태로 §5.3 처음부터
3. Principal 이 각 field 수정 가능 (required/optional/tier/upgrade_status/notes)
4. `version_hash` 재계산 (§5.5 algorithm — input 은 현재 pack content)
5. 새 `manifest.yaml` atomic write (temp + rename)

**flow (non-interactive, r4 신규)**:
1. `--config <path>` YAML 을 load 후 §5.6 schema validation (필수 field 존재, enum valid)
2. 기존 manifest 가 있으면 backup (interactive 와 동일)
3. config 값 그대로 populate + `version_hash` 재계산 + atomic write
4. schema invalid → `config_schema_invalid` error + exit code 비-0 (§5.6.3 canonical map). `domain_manifest_version` bump 미수행 → `manifest_version_not_incremented` error

**domain_manifest_version bump**:
- 기존 `domain_manifest_version` 보다 **≥ 1 patch** 증가 (Principal 이 명시 제공; e.g. `0.3.0` → `0.3.1` 또는 `0.4.0`)
- manifest content 변경 시 version bump 필수 — bump 없으면 CLI error (`manifest_version_not_incremented`)

**reconstruct runtime impact**:
- 기존 reconstruct session 은 `domain_manifest_version` + `domain_manifest_hash` 를 `meta` 에 기록 (§4.1) — regeneration 후 다음 reconstruct 는 새 version/hash 로 naturally 분리
- 기존 raw.yml 은 훼손되지 않음 (immutable artifact)

**v1 scope 밖**: regeneration 전후 diff reporting, migration-assisted edit — v1.1 backlog (§10.2).

### 5.5 `version_hash` canonical algorithm (r2 CONSENSUS 6 — input boundary 축소)

**r1 drift**: `*.md` 파일을 Principal 이 classify 하지만 version_hash 는 pack directory 전체를 대상으로 계산 → classify 되지 않은 파일 변화가 hash 에 영향 + `manifest.yaml` 자체가 self-input 되는 self-cycle 위험.

**r2 canonical input boundary**:

**hash input set** (r5 C-01 + r6 UF-evolution-01 + r8 CNS-01 해소):
- `manifest.referenced_files[].path` 에 등재된 각 파일의 bytes (pack-content)
- **pack-spec fields** (r8 — `domain_name` 제거): `quality_tier` + 각 `referenced_files[]` 의 `{path, required, min_headings}` (§5.4.2 taxonomy 의 Enforced → pack-spec guard subtype)
- **등재되지 않은 pack directory 의 다른 파일은 input 아님** (auxiliary 변화는 version_hash 에 영향 없음)
- **hash input 제외** (§5.4.2 Runtime-managed category):
  - `domain_name` (r8 CNS-01 — pre-load gate 의 `path ↔ domain_name` consistency 검증이 primary guard, hash 에 중복 위임 불필요)
  - `manifest_schema_version` (r6 UF-evolution-01 — schema-only migration 이 pack-semantic drift 로 보이지 않도록)
  - `version_hash` (self-cycle 제거, §5.5 가 compute output)
  - `recovery_from_malformed` (audit signal, hash 대상 아님)
- **hash input 제외** (§5.4.2 Enforced → semver guard): `domain_manifest_version` — §5.6.1 이 별도 enforcement 경로
- **hash input 제외** (§5.4.2 Unenforced soft): `notes` / `upgrade_status` / `last_updated`
- `manifest.yaml` 자체는 input 아님 (self-cycle 제거)

field-role 재진술 없음 (§5.4.2 canonical 참조). 본 §5.5 는 **algorithm 만 정의**.

**algorithm** (r5):
```
canonical_yaml(obj) = js-yaml dump with {sortKeys: true, noRefs: true, lineWidth: -1}

# pack-content hash (file bytes)
for each path in manifest.referenced_files[].path (sorted lexicographically):
  if file exists at ~/.onto/domains/{name}/{path}:
    file_hash = sha256(file_bytes_as_hex)
  else:
    file_hash = "__missing__"  # required: false 인 경우 정상, required: true 는 halt

pack_files_map = {
  "{path}": file_hash for each classified path
}

# pack-spec fields canonical snapshot (r5 신규)
referenced_files_spec = [
  { path, required, min_headings }  for each referenced_files entry, sorted by path
]

hash_input = canonical_yaml({
  # r8 CNS-01 — domain_name 제거 (pre-load gate 의 path ↔ domain_name consistency 검증이 primary guard)
  # r6 UF-evolution-01 — manifest_schema_version 제외 (schema-only migration)
  quality_tier: manifest.quality_tier,                        # pack-spec
  referenced_files_spec: referenced_files_spec,               # pack-spec (path/required/min_headings)
  referenced_files_snapshot: pack_files_map                   # pack-content
})

version_hash = "sha256:" + hex(sha256(hash_input))
```

- `hash_algorithm = "sha256"` 기록
- `lineWidth: -1` 은 YAML line-wrapping 비활성화 (re-serialization drift 방지)
- 이 algorithm 은 reconstruct runtime 의 `domain_files_content_hash` (Step 3 §3.7.1) 와 **별도** — manifest-level (pack 전체) vs element-level provenance (per-element)
- `min_headings = null` 인 경우 canonical representation 은 field 생략 (not populated)

**canonical boundary 결과** (r9 — §5.4.2 taxonomy pointer only, field-role 재진술 제거):

본 §5.5 는 algorithm 정의 layer. field 별 category membership + guard mechanism 은 §5.4.2 가 single authority. 따라서 field-role prose 를 재진술하지 않고, algorithm 결과만 기술:
- hash input 에 포함된 field (§5.4.2 Enforced → pack-spec guard / pack-content guard) 변화 → `version_hash` 변화 → `manifest_version_hash_mismatch` halt
- hash input 제외된 field (§5.4.2 Runtime-managed / Enforced → semver guard / Unenforced soft) 변화 → `version_hash` 불변 (각 field 는 §5.4.2 에 선언된 primary guard 가 담당)
- auxiliary (non-classified) pack directory 파일 변화 → hash 불변 (hash input 제외, continuity 보장)

### 5.6 `--config <path>` non-interactive schema (r5 C-02 해소 — `domain_manifest_version` seat 추가)

CI 환경에서 Principal 이 작성한 config file 을 기반으로 manifest 자동 생성:

```yaml
# ~/onto-domain-init.yaml 예시
name: software-engineering
domain_manifest_version: "0.4.0"       # r5 신규 seat — semver string (§5.6.1 canonical grammar)
referenced_files:
  - path: concepts.md
    required: true
    min_headings: 3
  - path: structure_spec.md
    required: true
  - path: logic_rules.md
    required: true
  - path: domain_scope.md
    required: true
  - path: dependency_rules.md
    required: false
  # ...
quality_tier: full
upgrade_status: completed
notes: "3차 업그레이드 완료 (237K)"
```

**non-interactive 실행 시**:
- `--config` path 의 YAML parse
- 필수 field 전수 존재 확인: `name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `upgrade_status`
- required field 부재 또는 type invalid → `config_schema_invalid` error (§5.6.3). `domain_manifest_version` 존재하지만 semver grammar 불일치 → `manifest_version_format_invalid` (§5.6.3). 두 경우 모두 exit code 비-0
- `--regenerate` branch 에서는 §5.4.1 non-interactive flow 의 bump check 와 결합 (§5.6.1 comparator 규칙)
- 모든 field populate 후 §5.5 version_hash 계산 + `manifest.yaml` atomic write

### 5.6.1 `domain_manifest_version` canonical grammar + comparator (r5 C-02 해소)

**grammar** (semver subset):
```
domain_manifest_version = MAJOR "." MINOR "." PATCH
MAJOR | MINOR | PATCH = 1+ digit, no leading zero except "0"
```

- 예: `"0.3.0"`, `"1.2.15"` valid. `"0.3"`, `"v0.3.0"`, `"0.03.0"` invalid
- pre-release / build-metadata (`-alpha`, `+abc`) 는 v1 unsupported (v1.1 backlog §10.2)

**comparator** (new vs old semver compare):
```
compare(new, old):
  (new_major, new_minor, new_patch) = parse(new)
  (old_major, old_minor, old_patch) = parse(old)
  lexicographic_compare_tuple:
    new_major > old_major                                                     → strictly greater (bump OK)
    new_major == old_major AND new_minor > old_minor                          → strictly greater (bump OK)
    new_major == old_major AND new_minor == old_minor AND new_patch > old_patch → strictly greater (bump OK)
    otherwise                                                                 → NOT greater (error)
```

**bump enforcement** (§5.4.1 regenerate flow 와 결합):

| scenario | bump rule |
|---|---|
| `onto domain init <name>` (신규) | `domain_manifest_version` 을 Principal 이 선언 (통상 `"0.1.0"`). 기존 값 부재 — comparator 건너뜀 |
| `onto domain init --migrate-existing <name>` | 기존 manifest 부재 (legacy). Principal 이 declare. comparator 건너뜀 |
| `onto domain init --regenerate <name>` (interactive, manifest readable) | 기존 `domain_manifest_version` 을 prefill default 로 제시. Principal 이 bump. `compare(new, old) > 0` 필수. 위반 시 `manifest_version_not_incremented` |
| `onto domain init --regenerate <name> --config <path>` (non-interactive, manifest readable) | config 의 `domain_manifest_version` 을 기존과 comparator 비교. `> 0` 필수 |
| `onto domain init --regenerate <name>` (manifest malformed, §5.4.2 recovery path) | 기존 version 읽을 수 없음 — **comparator 생략**. config 또는 interactive 의 값을 그대로 수용 |

malformed manifest recovery 의 bump 생략 허용은 "broken manifest parse 에 의존하지 않는다" (§5.4.2 key property) 와 정합.

**r7 intentional discontinuity note (UF-evolution-malformed-recovery 해소)**: malformed recovery 에서 comparator 생략은 **intentional trade-off** — "broken manifest 를 parse 하지 않고 recovery" 를 위해 semver continuity 를 희생. 결과적으로 recovery 후 새 `domain_manifest_version` 이 기존보다 **낮을 수도** 있음 (e.g. 기존이 `"0.5.2"` 였으나 parse 실패 → Principal 이 `"0.1.0"` 입력). 이는 v1 의 설계 선택으로 명시:

- **장점**: broken manifest 에서도 recovery 가능 (Principal 이 수동으로 backup 파일을 열어볼 필요 없음)
- **단점**: raw.yml consumer (govern / learn) 가 `domain_manifest_version` 을 semver monotonicity 로 해석하면 오해 가능 (r7 canonical: "recovery 후 version 은 re-base 가능, 동일 domain 내 monotonicity 보장 아님")
- **audit marker** (r7 + r8 clear rule): `manifest.yaml` 에 `recovery_from_malformed: boolean` field (§5.4.2 Runtime-managed category 의 audit signal).
  - **write rule**: `--regenerate` CLI 가 malformed recovery path (§5.4.2 malformed pre-load gate 후 `--regenerate` 경로) 에서 실행 시 `true` 로 populate
  - **clear rule** (r8 Recommendation 2 해소): 다음 `--regenerate` 실행 시 CLI 가 재계산:
    - 새 실행이 **malformed path** 라면 `true` 유지 (중첩 malformed 이어도 1회성 flag — 역사 누적 아님)
    - 새 실행이 **정상 path** (기존 manifest 가 valid) 라면 `false` 로 재write (flag 해제)
  - **1회성 semantic**: flag 는 "직전 세션의 manifest 생성이 malformed recovery 였는가" 만 기록. 여러 malformed recovery 가 연속돼도 각 세션은 독립. 역사 누적은 raw.yml 의 `meta.manifest_recovery_from_malformed` (§4.1 mirror) 에서 시간 순 trace
  - **raw.yml mirror**: runtime 이 `meta.manifest_recovery_from_malformed = manifest.recovery_from_malformed` 으로 read-copy (§4.4 persistence chain)
- **v1.1 backlog**: pre-malformed version 을 backup file 에서 manual read 후 continuity 복원 assisted mode (§10.2)

### 5.6.2 `domain_manifest_version` manual-edit closure scope (r8 UF-logic-01 해소)

**r8 prose narrow**: §5.4.2 taxonomy 의 Enforced → semver guard 는 다음 두 경우만 차단:

1. **malformed semver**: pre-load gate 가 §5.6.1 grammar 불일치 감지 → `manifest_version_format_invalid` halt (§5.6.3 canonical)
2. **non-bump regenerate**: `--regenerate` 실행 시 comparator 가 `new_version > old_version` 아닌 값 감지 → `manifest_version_not_incremented` halt (§5.6.3 canonical)

**closure scope 밖** (r8 명시): "YAML-valid manual semver bump + unchanged pack content" — Principal 이 manifest.yaml 을 editor 로 열어 `domain_manifest_version` 만 bump 한 경우, version_hash 는 pack 변경 없으므로 불변 → runtime guard 가 감지할 수 없음. 이는 v1 의 **intentional limitation**:

- 차단하려면 `domain_manifest_version` 을 §5.5 hash input 에 포함해야 하나, 이는 UF-evolution-01 (r6) 의 schema-only migration 문제 재도입 — trade-off 기피
- v1 은 "`--regenerate` 를 경유한 정상 경로" 와 "Principal 이 audit 를 의식한 manual bump" 를 구별하지 않음 (audit 가 필요하면 `--regenerate` 사용 원칙만 강조)
- v1.1 에서 `manifest.yaml` 에 signature / provenance trail 필드 도입 시 재검토 (§10.2)

### 5.6.3 `domain_manifest_version` failure code canonical map (r11 UF-PRAG-01 해소)

`domain_manifest_version` 관련 4 error code 의 단일 의미 + section responsibility:

| error code | trigger | primary section | 예시 scenario |
|---|---|---|---|
| `manifest_malformed` | YAML parse fail 또는 manifest required field 누락 (e.g. `manifest_schema_version`, `domain_name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `version_hash`) | §5.4.2 pre-load gate | Principal 이 manifest.yaml 을 편집하다 YAML 문법 오류 / required field 실수로 삭제 |
| `manifest_version_format_invalid` | `domain_manifest_version` value 가 §5.6.1 semver grammar 불일치 (`"0.3"`, `"v0.3.0"`, `"0.03.0"` 등) | §5.6.1 grammar parse | Principal 이 manifest.yaml 에 `domain_manifest_version: "v0.3.0"` 입력 |
| `manifest_version_not_incremented` | `--regenerate` 실행 시 new version ≤ old version (§5.6.1 comparator) | §5.4.1 regenerate flow + §5.6.1 comparator | `0.3.0` → `0.3.0` (no bump) / `0.3.0` → `0.2.9` (downgrade) |
| `config_schema_invalid` (§5.6 — r11 rename: 이전 "schema validation error" 대체) | `--regenerate --config` 의 YAML 에 required field (`name`, `domain_manifest_version`, `referenced_files`, `quality_tier`, `upgrade_status`) 누락 또는 type invalid | §5.6 non-interactive path | CI 가 `--config` YAML 작성 시 `domain_manifest_version` 필드 생략 |

**operator 복구 guidance** (r13 UF-pragmatics-01 + r14 DEP-01 해소 — code 별 + origin 별 specific path):

| error code | origin (execution branch) | primary recovery path (operator action) |
|---|---|---|
| `manifest_malformed` | any | `onto domain init --regenerate {domain}` — §5.4.2 bytes-level backup + fresh interactive/non-interactive flow. universal fallback (broken manifest parse 의존 없음) |
| `manifest_version_format_invalid` | interactive (`--regenerate`) | `onto domain init --regenerate {domain}` 재실행 — Principal 이 semver grammar 에 맞는 값 (§5.6.1) 입력 |
| `manifest_version_format_invalid` | **non-interactive** (`--regenerate --config <path>`, r14 신규) | **config file 의 `domain_manifest_version` 값을 semver grammar 로 수정 후 동일 `onto domain init --regenerate {domain} --config <path>` 재실행** |
| `manifest_version_not_incremented` | interactive (`--regenerate`) | 재실행 시 Principal 이 `compare(new, old) > 0` 만족하는 version 입력 (`0.3.0` → `0.3.1` 등) |
| `manifest_version_not_incremented` | **non-interactive** (`--regenerate --config <path>`, r14 신규) | **config file 의 `domain_manifest_version` 을 기존 `domain_manifest_version` 보다 bump 한 값으로 수정 후 동일 `--regenerate --config` 재실행** |
| `config_schema_invalid` | non-interactive 전용 | **config file (`--config <path>` YAML)** 의 누락/invalid field 수정 후 **동일 `onto domain init --regenerate {domain} --config <path>` 재실행**. `--regenerate` 없이 manifest 재생성 불가 |

**specific vs universal recovery 차이**: origin 이 non-interactive (`--config`) 인 경우 "config file 수정 + 동일 명령 재실행" single-seat pattern. CI 환경에서 operator action 이 명확.

**§5.4.1 + §5.6 의 이전 "schema invalid" wording**: r11 에서 모두 `config_schema_invalid` canonical code 로 통일. section-specific 변형 없음.

### 5.7 `manifest_schema_version` 호환성 rule (Step 1 §6.3 canonical consume)

CLI 는 현재 runtime 의 `supported_manifest_schema_versions` 중 **가장 최신 version** 을 manifest 에 write (`"1.0"` — v1 초기 유일).

미래 CLI version 이 새 schema 를 지원하면 init 시 옵션으로 선택 가능하되, v1 범위 밖 (v1.1+ backlog).

### 5.8 `--v0-only` flag (Step 1 §5.5 canonical pointer)

`onto domain init` 과는 **별도 CLI** (reconstruct CLI). 본 Step 4 §5 의 scope 가 아님 — `reconstruct` CLI 의 `--v0-only` flag 는 Step 1 §5.5 canonical.

본 §5.8 은 두 CLI 를 혼동하지 않도록 명시하는 pointer. 실제 `--v0-only` contract 은 Step 1 §5.5 가 authority.

---

## 6. Step 2 protocol amendment 3 action — 실 edit 명세 (P-DEC-A1)

### 6.1 Amendment 의 scope + 근거

Step 3 decision §8.1 (P-DEC-A1 경로 A, 2026-04-23 Principal 승인) 에 의해 Step 2 protocol (`development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`) 3 지점에 additive patch 가 필요. Step 3 PR #208 은 **명세만** 포함. 본 Step 4 는 설계 세션 — 실 edit 을 **Step 4 PR 의 별도 commit** 으로 포함.

**scope 엄격**: Additive extension + forward-declared seat 정정만. Step 2 decision 표면 (Q-S2-1~22) 재검토 아님. Step 2 decision 문서는 unchanged — `revision_history` 에 r3 P-DEC-A1 amendment note 만 추가.

### 6.2 Patch 1 — §6.3 `gate_count = 1` write rule 신설

**위치**: Step 2 protocol `### 6.3 wip.yml 변경 (Step 2 범위)` 의 "Hook α 가 populate 하는 element field" 목록 아래.

**추가 문장**:
```markdown
- `elements[].intent_inference.provenance.gate_count = 1` (Hook α 가 populate 시 초기화;
  Hook γ 가 revise/confirm 시점에 2 로 증가 — Step 3 §3.7.2 canonical 과 pair).
  Step 2 amendment (Step 4 P-DEC-A1, 2026-04-23 승인).
```

**근거**: Step 3 §3.7.2 가 `gate_count` 를 element-level provenance 에 canonical 선언했으므로 write timing 을 Step 2 authority 에서도 명시해야 Step 4 read contract (§2.3 single-gate badge) 가 성립.

### 6.3 Patch 2 — §3.4 `rationale_state` enum `empty` 추가

**위치**: Step 2 protocol `### 3.4 outcome: domain_scope_miss — domain 범위 밖` 부근 또는 `rationale_state` enum 을 언급하는 가장 가까운 지점.

**수정 내용**:
- Step 2 protocol 은 `rationale_state` 를 enum 으로 명시하지 않고 `outcome` 4 가지로만 다룸. amendment 는 **새 paragraph** 를 §3.4 아래에 삽입:

```markdown
### 3.4.1 `rationale_state` canonical enum — `empty` 추가 (Step 2 amendment, 2026-04-23 P-DEC-A1 승인)

`rationale_state` 는 Step 1 §4.2 canonical enum. Stage 2 Explorer 가 wip.yml `elements[]` 에
entity 추가 시 `intent_inference.rationale_state = "empty"` 로 populate 하는 canonical shape 를
Step 2 authority 에 명시:

| source | populated state |
|---|---|
| Stage 2 Explorer (entity 신규 add, rationale 부재) | `empty` |
| Hook α `outcome: proposed` | `proposed` |
| Hook α `outcome: gap` | `gap` |
| Hook α `outcome: domain_pack_incomplete` | `domain_pack_incomplete` |
| Hook α `outcome: domain_scope_miss` | `domain_scope_miss` |

Step 3 §3.6 + §3.8 rule 8+11 의 `empty` 정의와 pair. Step 1 §4.5 canonical mirror.
```

### 6.4 Patch 3 — §6.3.1 `pack_missing_areas` 재해석

**위치**: Step 2 protocol §6.3.1 `meta.pack_missing_areas — pack-level aggregation` 본문의 **"소비처" 섹션 직전 문장 수정**.

**기존 문장**:
```markdown
semantic grouping 이 필요하면: Step 3 Hook γ Rationale Reviewer (LLM-owned seat) 에 이연.
Reviewer 가 wip.yml 을 전수 읽을 때 `pack_missing_areas` 를 refine. 본 Step 2 의
`pack_missing_areas` population 은 provisional — Step 3 에서 재작성 가능.
```

**patched 문장**:
```markdown
Reviewer 는 v1 에서 `pack_missing_areas` 에 관여하지 않음 (Step 3 §6.3.1 canonical — Reviewer
의 output directive schema 에 pack_missing_areas_refinement 가 없음). Step 2 의 Hook α 후처리
aggregate 가 v1 의 유일한 writer. semantic refinement (heading paraphrase 매칭, 의미 근접 grouping)
는 **v1.1 backlog** (Step 3 protocol §10.2 `pack_missing_areas semantic refinement`).
본 Step 2 §6.3.1 의 "provisional" 문구는 v1.1 이연의 fact 임을 명시 — Step 3 merge 이후에도
v1 scope 에서는 재작성되지 않음.

Step 2 amendment (Step 4 P-DEC-A1, 2026-04-23 승인).
```

### 6.5 Step 2 decision 문서 revision_history 추가

**위치**: `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md` frontmatter `revision_history` array.

**추가 entry** (최하단):
```yaml
- revision: r3-amendment
  date: 2026-04-24
  basis: "Step 3 P-DEC-A1 경로 A (2026-04-23 Principal 승인) — Step 4 PR 에서 병행 수행"
  scope_summary: "additive: §6.3 gate_count write rule + §3.4.1 empty enum + §6.3.1 pack_missing_areas 재해석 3 지점. Q-S2-1~22 재검토 아님."
  related_pr: "PR #<Step 4 PR number — merge 시 backfill>"
```

### 6.6 Commit 구조 in Step 4 PR

본 Step 4 PR (`docs/phase4-stage3-step4` branch) 내부 commit stack 예상:

| commit | file 변경 | 의미 |
|---|---|---|
| 1 | `20260424-phase4-stage3-step4-integration.md` (본 문서, clean pass 도달 후 최종본) | Step 4 protocol |
| 2 | `20260424-phase4-stage3-step4-integration-decision.md` (§9 결정 표면 Principal 승인 기록) | Step 4 decision |
| 3 | `20260423-phase4-stage3-step2-rationale-proposer-protocol.md` 3 지점 edit | Step 2 amendment (§6.2~§6.4) |
| 4 | `20260423-phase4-stage3-step2-rationale-proposer-decision.md` revision_history entry | Step 2 decision amendment note (§6.5) |

**commit 제목 prefix 권장** (커밋 본문 language: 한국어 preferred per project convention):
- commit 3: `docs(phase-4): Step 2 amendment 3 action (P-DEC-A1) — gate_count write + empty enum + pack_missing_areas 재해석`
- commit 4: `docs(phase-4): Step 2 decision revision_history r3-amendment`

Track B 구현 세션 이연 (Q-S4-amend-01 결정 대기): 본 §6 을 **Step 4 PR 별도 commit** 으로 병행 vs **Track B 첫 commit** 으로 분리. 전자 권장 — P-DEC-A1 본래 의도 (single coherent patch).

---

## 7. Stage 3 wrap-up input + canonical seat migration plan (r2 Axiology Consensus 해소)

Stage 3 (4 Step) 의 누적 결정을 single index 로 재편하는 작업은 **Stage 3 wrap-up** 에서 별도 수행. 본 §7 은 Step 4 완료 후 wrap-up 세션이 consume 할 index seat 을 예약 + **canonical seat 으로의 promotion migration plan** 을 명시.

### 7.1 Stage 3 wrap-up index seat

**seat** (Track B 구현 세션 진입 전 Stage 3 wrap-up 문서가 작성):

```
development-records/evolve/20260425-phase4-stage3-wrap-up.md (가정)
  ├─ §1 4 Step 누적 결정 집계 (count authority: 각 Step decision 문서 + 본 Step 4 §9.2 — wrap-up 이 read-copy)
  ├─ §2 Hook α / γ / δ / Phase 3.5 / raw.yml / CLI canonical authority map
  ├─ §3 v1 scope 전수 + v1.1 backlog index
  ├─ §4 Track B 구현 세션 W-ID list (W-A-80 ~ W-A-1??, 예상 20~30 W-ID)
  ├─ §5 Track B 세션 진입 전 pre-check checklist
  └─ §6 Canonical seat migration plan (§7.2 본 문서 확정 — wrap-up 이 consume)
```

본 Step 4 는 이 seat 을 문장으로만 예약 — 실 작성은 wrap-up 세션.

### 7.2 Canonical seat migration plan (r2 CONSENSUS Conditional 해소)

**r1 drift**: Step 4 문서 (`development-records/evolve/20260424-phase4-stage3-step4-integration.md`) 는 runtime-facing contract 의 "전이 single authority" 로 설계. 그러나 실 Runtime code 는 `development-records/` 가 아닌 `.onto/processes/reconstruct.md` + `src/core-runtime/**` 를 참조. Step 4 문서가 **영구적** single authority 로 남으면 runtime code 변경 시 drift 원천.

**r2 canonical resolution**: Step 4 문서는 **transitional artifact** — Track B 구현 commit 에서 4 영역 각각을 canonical seat 로 promotion 한다.

**promotion 대상 + 위치** (Stage 3 wrap-up + Track B scope):

| Step 4 section | Canonical seat (Track B promotion 후) | Step 4 문서 의 역할 (post-promotion) |
|---|---|---|
| §2 Hook δ | `.onto/processes/reconstruct.md §Phase 3` (rendering algorithm + throttling + evidence surface + triple-read decision table) + `.onto/processes/reconstruct.md §Session Log & Error Handling` (rationale-queue.yaml artifact contract) | historical reference (decision pointer) |
| §3 Phase 3.5 | `.onto/processes/reconstruct.md §Phase 3.5` (action-first matrix + step sequencing + validation + sweep) + `.onto/processes/reconstruct.md §wip.yml schema comment` (rationale_decisions + batch_actions schema) | historical reference |
| §4 raw.yml meta | `.onto/processes/reconstruct.md §Phase 4` (common meta header extend + element-level intent_inference persist + mutual exclusion matrix) | historical reference |
| §5 `onto domain init` CLI | `.onto/commands/domain-init.md` (신설) — Track B 실 작성 | historical reference (Q-S4-CLI-* 결정 pointer) |
| §6 Step 2 amendment | Step 2 protocol 문서 3 지점 직접 edit (P-DEC-A1 원래 의도) | historical reference (amendment commit trail) |

### 7.3 Promotion commit sequencing (Track B 진입 시)

1. Stage 3 wrap-up 문서 (§7.1 seat) commit → Q-S1~Q-S4 누적 decision index 확정
2. Track B 첫 commit: `reconstruct.md` Phase 3 / 3.5 / 4 섹션 edit — 본 문서 §2 / §3 / §4 의 canonical content 를 mirror marker 와 함께 이식
3. Track B 둘째 commit: `.onto/commands/domain-init.md` 신설 — 본 문서 §5 content 이식
4. Track B 셋째 commit: `src/core-runtime/**` code 작성 — reconstruct.md 의 canonical seat 만 참조
5. Track B 각 commit 에 `<!-- mirror-of: step-4-integration §X.Y -->` marker 부착 (Step 3 §8.2 precedent)

**promotion 완료 후**: Step 4 문서의 status 를 `transitional` → `superseded-by-reconstruct.md` 로 frontmatter update (단, 문서 자체는 archive 대상 아님 — 결정 이력 pointer 로 유지).

### 7.4 Post-promotion authority chain

post-promotion 상태의 canonical authority:

```
Level 1 (runtime-facing): .onto/processes/reconstruct.md
Level 2 (CLI contract): .onto/commands/domain-init.md
Level 3 (role spec): .onto/roles/rationale-proposer.md + rationale-reviewer.md
Level 4 (historical decision): development-records/evolve/20260424-phase4-stage3-step4-integration.md (본 문서, post-promotion)
```

Step 4 문서가 single authority 로 남는 구간은 **Stage 3 wrap-up → Track B 첫 commit 사이의 전이 구간** 으로 엄격히 bounded.

---

## 8. §14.6 invariant 재확인 (dogfood SDK-like)

### 8.1 invariant 재진술

`.onto/processes/govern.md §14.6`: "dogfood off 가능 + 들어내기 쉬워야. 5 활동 본질 sink 는 dogfood 와 독립 (govern←dogfood reader)."

### 8.2 Step 4 의 4 영역 × invariant 점검

| 영역 | dogfood off 가능? | 들어내기 용이? | govern reader 가능? |
|---|---|---|---|
| **Hook δ (Phase 3 rendering)** | ✓ (reconstruct 는 v0 mode 로 fall back — `--v0-only` flag) | ✓ (Phase 3 template 의 rationale column 제거 + throttling 비활성화 → v0 동일) | ✓ (rationale-queue.yaml artifact 가 reader-friendly) |
| **Phase 3.5 write-back** | ✓ (`inference_mode == none` 시 `rationale_decisions` 미존재 → v0 기존 4 step 만) | ✓ (`rationale_decisions` step 제거 → v0 동일) | ✓ (raw.yml meta + `intent_inference` block 이 reader-friendly) |
| **raw.yml meta 확장** | ✓ (element-level `intent_inference` block omit in `inference_mode == none`) | ✓ (meta field subset 제거 → v0 raw.yml) | ✓ (raw.yml 은 기존 govern reader 의 input) |
| **`onto domain init` CLI** | ✓ (domain pack 없이 `--v0-only` 로 reconstruct 가능) | ✓ (CLI 삭제 + manifest.yaml 요구 제거 → v0 동일) | N/A (독립 CLI — govern reader 직접 소비 없음) |

### 8.3 4 영역 통합의 off switch

```yaml
config.reconstruct:
  v1_inference:
    enabled: true | false          # default true (v1 mode)
  phase3_rationale_review:
    enabled: true | false          # default true
  write_intent_inference_to_raw_yml:
    enabled: true | false          # default true (v1 mode)
```

세 switch 가 모두 `false` 면 reconstruct runtime 은 v0 flow 와 동일한 wip.yml / raw.yml 을 produce. CI / test 환경에서 regression 대비 off switch 가 **공식 seat**.

### 8.4 govern ← reconstruct reader direction (§14.6 canonical)

본 Step 4 의 4 영역 persist 결과 (`raw.yml`, `rationale-queue.yaml`, `manifest.yaml`) 는 govern 이 reader 로 소비. reconstruct runtime 은 govern writer 를 직접 호출하지 않음 (invariant 유지).

---

## 9. Step 4 결정 표면 (Principal 합의 요청) — Q 라벨 + pointer

**r2 CONSENSUS Conditional 해소**: r1 §9 는 §2~§6 계약을 재서술해 second authority surface 를 만들었음. r2 는 Q 라벨 + §pointer only 로 축소 (single authority 는 §2~§6).

### 9.1 영역별 Q-S4 group

**Hook δ (§2)** — count authority: §9.2
- **Q-S4-δ-01** triple-read ordering: §2.8 decision table
- **Q-S4-δ-02** single-gate 2 case 동일 badge: §2.3
- **Q-S4-δ-03** `rationale_review_degraded` escalate + warning banner: §2.4
- **Q-S4-δ-04** `rationale-queue.yaml` artifact schema: §2.7
- **Q-S4-δ-05** Phase 3 rendering language (Principal locale): §2.2
- **Q-S4-δ-06** throttling config defaults: §2.5
- **Q-S4-δ-09** (r5) rendering partition + 4 bucket: §2.5
- **Q-S4-δ-07** priority score 계산식 + null handling: §2.5
- **Q-S4-δ-08** batch action UI placement: §2.5 + §3.4

**Phase 3.5 (§3)** — count authority: §9.2
- **Q-S4-P3.5-01** canonical matrix orientation (action-first): §3.1
- **Q-S4-P3.5-02** step sequencing v0 extend: §3.5
- **Q-S4-P3.5-03** `principal_provided_rationale` persist path: §3.6.1
- **Q-S4-P3.5-04** 미판정 detection + batch sweep exclude: §3.5.2
- **Q-S4-P3.5-05** `domain_scope_miss` terminal split: §3.2
- **Q-S4-P3.5-06** Phase 3.5 idempotency + individual 우선: §3.6
- **Q-S4-P3.5-07** certainty vs rationale_state orthogonality: §3.5
- **Q-S4-P3.5-08** Phase 3.5 atomicity (single fsync): §3.5
- **Q-S4-P3.5-09** (r2) validation step 1.5 all-or-nothing: §3.5.1
- **Q-S4-P3.5-10** (r2) `empty` source state 경로: §3.1 + §3.3
- **Q-S4-P3.5-11** (r2) `carry_forward` 2 layer (artifact vs semantic): §3.9 + §3.5.2
- **Q-S4-P3.5-12** (r3) batch exact-match check: §3.5.1
- **Q-S4-P3.5-13** (r4) `global_reply` enum + `"see below"` closure: §3.6 + §3.5.1
- **Q-S4-P3.5-14** (r4) render-time snapshot seat + sweep atomic boundary: §3.5.1 + §3.5
- **Q-S4-P3.5-15** (r6) §3.4.1 grouping key table 확장: §3.4.1
- **Q-S4-P3.5-16** (r6/r7) `"see below"` × `throttled_out` + `domain_scope_miss` exception: §3.5.1 + §3.2

**raw.yml meta (§4)** — count authority: §9.2
- **Q-S4-raw-01** meta block flat layout (별도 sub-block 없음): §4.1
- **Q-S4-raw-02** mutual exclusion matrix declarative (raw.yml 내 미저장, code validation): §4.2
- **Q-S4-raw-03** `gate_count` scope (element-level `intent_inference.provenance.gate_count`, integer type): §2.3 + §4.3
- **Q-S4-raw-04** `fallback_reason` enum `proposer_failure_downgraded` 추가 (Step 1 §4.7 canonical consume, 본 문서는 schema extend): §4.1
- **Q-S4-raw-05** provenance 3 hash (wip_snapshot_hash / domain_files_content_hash / hash_algorithm) element-level persist: §4.3 + §4.5
- **Q-S4-raw-06** `inference_mode == none` 시 element-level `intent_inference` block omit (v0 호환): §4.3
- **Q-S4-raw-07** (r2 신규) `manifest.quality_tier` ↔ `domain_quality_tier` 1:1 mirror + `pack_optional_missing × minimal` overlap 제거: §4.2

**onto domain init CLI (§5)** — count authority: §9.2
- **Q-S4-CLI-01** interactive flow canonical sequence: §5.3
- **Q-S4-CLI-02** `--migrate-existing` detection rule: §5.4
- **Q-S4-CLI-03** non-interactive `--config` schema: §5.6
- **Q-S4-CLI-04** `manifest_schema_version` supported_list: §5.7
- **Q-S4-CLI-05** `--v0-only` (reconstruct CLI, init 무관): §5.8
- **Q-S4-CLI-06** `version_hash` algorithm: §5.5
- **Q-S4-CLI-07** `notes` field unbounded: §5.3
- **Q-S4-CLI-08** (r2) product-locality exception — domain pack shared reference: §5.1.1
- **Q-S4-CLI-09** (r2) `--regenerate` branch: §5.4.1
- **Q-S4-CLI-10** (r3/r4/r7) manual `manifest.yaml` edit 경로 — category 별 scope: §5.4.2
- **Q-S4-CLI-11** (r4) malformed manifest recovery path: §5.4.2
- **Q-S4-CLI-12** (r4) `--regenerate --config` non-interactive: §5.4.1
- **Q-S4-CLI-13** (r5) §5.5 hash input pack-spec fields: §5.5
- **Q-S4-CLI-14** (r5) `domain_manifest_version` semver grammar + comparator: §5.6 + §5.6.1
- **Q-S4-CLI-15** (r6) §5.4.2 3-category taxonomy: §5.4.2
- **Q-S4-CLI-16** (r6) §5.5 hash input 에서 `manifest_schema_version` 제외: §5.5
- **Q-S4-CLI-17** (r7) §5.3 `domain_manifest_version` 수집 + `last_updated` CLI auto: §5.3
- **Q-S4-CLI-18** (r7/r8) `recovery_from_malformed` audit signal end-to-end: §5.6.1 + §4.1 + §4.4 + §5.4.2
- **Q-S4-CLI-19** (r8) `domain_name` dual-membership 해소: §5.4.2 + §5.5
- **Q-S4-CLI-20** (r8) `domain_manifest_version` manual-edit closure scope narrow: §5.6.2
- **Q-S4-CLI-21** (r11/r12) failure code canonical map (4 codes): §5.6.3

**Step 2 amendment (§6)** — count authority: §9.2
- **Q-S4-amend-01** amendment commit 구조 (Step 4 PR 별도 commit, P-DEC-A1 single coherent patch): §6.6
- **Q-S4-amend-02** Step 2 decision revision_history r3-amendment entry: §6.5
- **Q-S4-amend-03** Step 2 protocol §3.4.1 신설 위치 (§3.4 직후 paragraph): §6.3
- **Q-S4-amend-04** `gate_count = 1` 초기화 scope — 전체 outcome 에서 populate (outcome 무관): §6.2

**Canonical seat migration (§7)** — count authority: §9.2
- **Q-S4-migrate-01** (r2 신규) Step 4 문서 는 transitional artifact — Track B 구현 commit 에서 4 영역 각각을 `.onto/processes/reconstruct.md` / `.onto/commands/domain-init.md` 에 promotion. post-promotion 시 본 문서 status `superseded-by-reconstruct.md`: §7.2 + §7.3

### 9.2 Q 총합 (r12 기준 — single count authority)

- Hook δ: 9 (r1 8 + r5 1)
- Phase 3.5: 16 (r1 8 + r2 3 + r3 1 + r4 2 + r6 2)
- raw.yml: 7 (r1 6 + r2 1)
- CLI: 21 (r1 7 + r2 2 + r3 1 + r4 2 + r5 2 + r6 2 + r7 2 + r8 2 + r11 1)
- Step 2 amendment: 4
- Canonical seat migration: 1 (r2)
- **총계: 58 점** (r1 33 + r2 7 + r3 2 + r4 4 + r5 3 + r6 4 + r7 2 + r8 2 + r11 1, clean pass 최종 수렴 목표)

### 9.3 원 Step 1/2/3 Q 와의 관계

본 Step 4 의 Q 는 모두 **상세화** — Step 1/2/3 의 canonical 결정을 구현 수준으로 구체화. Step 1/2/3 decision 재론 아님.

**r2 예외 — `domain_scope_miss` accept terminal split**: §3.2 의 `principal_confirmed_scope_miss` 분리는 Step 1 §7.9.5 의 "accept → domain_scope_miss (유지)" 결정에 대한 **mechanical amendment**. Q-S1 재론이 아니며, Step 2 amendment (P-DEC-A1) 선례 동형 — Stage 3 wrap-up index 에 "Step 1 §7.9.5 accept terminal: domain_scope_miss → principal_confirmed_scope_miss" mechanical amendment note 로 기록 (Track B).

**Canonical source 관계**:
- Step 1 §7.6~§7.9 → 본 §2 + §3 (Hook δ + Phase 3.5 canonical)
- Step 1 §4.7 → 본 §4 (raw.yml meta mutual exclusion)
- Step 1 §6.1~§6.5 → 본 §5 (CLI contract + product-locality exception)
- Step 2 §6.3 + §3.4 + §6.3.1 → 본 §6 (amendment 명세)
- Step 3 §3.7.2 + §7.1 [d] + §7.2 + §10.1 → 본 §2.3 + §2.4 + §2.8 (Step 4 read contract consume)

---

## 10. 미해소 / backlog

### 10.1 Track B 구현 세션 진입 시 결정

- `.onto/commands/domain-init.md` 의 실 작성 — Track B (본 §5 가 contract)
- `reconstruct.md` Phase 3 / 3.5 / 4 실 edit — Track B (본 §2 + §3 + §4 가 target seat 명시)
- `src/core-runtime/**` code 작성 (Phase 3 rendering + Phase 3.5 write-back + raw.yml meta + CLI) — Track B
- W-ID 부여 (W-A-80~) — Stage 3 wrap-up 에서 예상 20~30 W-ID 할당
- Mirror marker 부착 (Step 3 precedent §8.2) — Track B 구현 commit 이 runtime code + reconstruct.md 에도 `<!-- mirror-of: step-4-integration §X.Y -->` 부착 필수 (implementation-commit obligation)
- `rationale-queue.yaml` 의 실제 write path 와 permission (현재 `.onto/builds/{session}/` 하에 writable 가정) — Track B
- `phase3_user_responses.rationale_decisions[]` 의 UI → parse → wip.yml write 의 parser 구현 — Track B (§3.6 schema 가 contract)
- Interactive CLI prompt 의 실제 문구 (§5.3 Principal-facing text) — Track B (한국어 localization)
- non-interactive `--config` YAML parser + schema validation — Track B

### 10.2 v1.1 이후 이연 (r2 확장)

- `onto domain manifest-migrate` CLI — manifest_schema_version 1.0 → 2.0 migration. Step 1 §6.3 mirror
- `pack_missing_areas` semantic refinement — Reviewer directive 에 `pack_missing_areas_refinement[]` field 추가. Step 3 protocol §10.2 mirror
- **`pack_missing_areas` stable identity** (r2 Unique [evolution]) — `(manifest_ref, heading)` 는 heading rename 시 continuity 훼손. v1.1 에서 `heading_hash` 또는 stable heading id 도입 검토. v1 scope 는 단순 key
- Chunked Phase 3 rendering (entity 수 100+ session) — `max_individual_items` 의 multi-page pagination. v1 throttling 은 single page 가정
- Phase 3 UI framework (현재 markdown template) → interactive React/CLI TUI 전환. v1 범위 밖
- `manifest_schema_version` 의 config file 승격 (§5.7 Q-S4-CLI-04) — runtime code constant → `.onto/config.yml` reader
- `rationale-queue.yaml` 의 append-only log 모드 (re-render 시 historical snapshot 유지) — v1 은 single write, rename-overwrite
- **Product-local override path** (r2 Axiology) — `{product}/.onto/domains/{domain}/` override. v1 은 global-only. v1.1 에서 `domain-resolve-order` canonical + reconstruct runtime 확장
- **`onto domain init --regenerate` diff reporting + migration-assisted edit** (§5.4.1 관련) — regeneration 전후 referenced_files / quality_tier / version diff 요약 + Principal 에게 주석 제시. v1 은 backup + 재실행 단순 flow
- **Phase 3.5 partial recovery** (r2 Unique [coverage] 연장) — §3.5.1 validation fail 시 valid entries 만 apply + invalid Phase 3 re-prompt. v1 은 all-or-nothing
- **`global_reply = "confirmed"` → `finalize` rename** (r2 Unique [semantics]) — 의미상 "추가 per-item action 없음" 이므로 명명이 실제 동작과 어긋남. v1 은 `confirmed` 유지 (v0 compat), v1.1 rename 검토. 본 문서 §3.6 schema 에 behavior documentation 명확화 (§3.5.2 sweep excluded_element_ids 정의)
- **Partial γ-degraded handling** (r2 시사) — `rationale_review_degraded: true` 시 rationale 이 partial 로 write 된 경우 Phase 3 별도 render (v1 은 전수 proposed escalate)

### 10.3 Scope 밖 결정 (Step 4 가 다루지 않음)

- v1 autonomy level 2 (Principal 없이 Hook γ 자동 승인) — Phase 4 v0→v1 autonomy backlog 참조
- Govern 의 raw.yml meta consumption rule (어떤 meta field 가 govern audit 에 어떤 가중치) — govern v1 설계 (Phase 4 별 스테이지)
- Learn 의 `phase3_user_responses.rationale_decisions[]` consumption — learn v1 설계

---

## 11. 본 문서의 위치 + Revision trail

- **Step 1** (차이 축) — PR #201 (`bae608e`) main 병합, 16 Q 승인
- **Step 2** (Hook α Proposer) — PR #202 (`d15a17d`) main 병합, 22 Q 승인
- **Step 3** (Hook γ Reviewer) — PR #208 (`5201c22`) main 병합, 22 Q-S3 + 2 P-DEC 승인
- **본 Step 4** (4 통합):
  - r1 (초안, 2026-04-24) → review (`.onto/review/20260424-d6f6369d`, codex, **BLOCKING 수준 6 Consensus + 2 Conditional + 3 Axiology + 11 Unique Findings + 5 Immediate Actions**)
  - r2 (r1 18 findings 전수 해소, 2026-04-24) → review (`.onto/review/20260424-de77643f`, codex, **3 Consensus + 1 Conditional + 1 Axiology + 4 Unique Findings**. Purpose Alignment 긍정 — §9 축소 + §7 promotion plan 올바름)
  - r3 (r2 9 findings 전수 해소 — single-seat 완전 정렬 + sweep bug fix + artifact schema 일반화 + manual edit closure + scope distinction 재서술, 2026-04-24) → review (`.onto/review/20260424-3b7f0245`, codex, **3 Consensus + 1 Disagreement + 6 Unique Findings**. Purpose Alignment 긍정 유지, cleanup 성격)
  - r4 (r3 10 findings 전수 해소 — formula duplicate 제거 + global_reply enum narrow + snapshot seat + atomicity 경계 + closure narrow + malformed recovery + non-interactive regenerate + schema version + pointer collapse + residual rule, 2026-04-25) → review (`.onto/review/20260425-30d37372`, codex, **3 Consensus + 0 Conditional + 0 Disagreement + 3 UF**. Axiology 긍정 no additional perspective. Local contract inconsistency — structural 유지)
  - r5 (r4 6 findings 전수 해소 — §5.5 hash input 에 pack-spec fields + §5.6 config schema + §5.6.1 semver + §2.5 4-bucket partition + §5.4.2 opening + priority formula confidence 이중모델링 제거, 2026-04-25) → review (`.onto/review/20260425-bb0d52d2`, codex, **3 Consensus + 2 Recommendations + 3 UF**. Axiology 긍정 no additional perspective. Taxonomy centralization 미완)
  - r6 (r5 8 findings 전수 해소 — `domain_manifest_version` centralization + §5.4.2 3-category taxonomy + §3.4.1 grouping 확장 + `manifest_schema_version` hash 제외 + `"see below"` × `throttled_out` closure + 4-bucket taxonomy 엄격, 2026-04-25) → review (`.onto/review/20260425-021be2d4`, codex, **2 Consensus + 1 Conditional + 0 Axiology + 4 UF**. 수렴 진전. Axiology 긍정 "authority-chain closure 강화")
  - r7 (r6 7 findings 전수 해소 — §3.6 single_gate kind + §5.4.2 strict 3-category + `domain_scope_miss` closure exception + §5.3 `domain_manifest_version` 수집 + `last_updated` CLI auto-populate + §5.6.1 intentional discontinuity + §9 stale wording 제거, 2026-04-25) → review (`.onto/review/20260425-5402cc07`, codex, **3 Consensus + 0 Conditional + 0 Disagreement + 1 UF (logic-only)**. Purpose Alignment 방향성 유지, clean pass 아님 — taxonomy propagation 미완)
  - r8 (r7 4 findings 전수 해소 — `domain_name` hash input 제거 + `recovery_from_malformed` end-to-end 동기 (§4.1/§4.4/§5.4.2) + `target_group.single_gate` field 제거 (kind derive-only) + §5.6.2 `domain_manifest_version` closure scope narrow + field-role 재진술 제거, 2026-04-25) → review (`.onto/review/20260425-856e4811`, codex, **2 Consensus + 1 Disagreement (logic vs pragmatics) + 2 UF**. Purpose Alignment 긍정, `recovery_from_malformed` end-to-end no-challenge — local wording propagation 미완)
  - r9 (r8 5 findings 전수 해소 — §5.5 canonical boundary 결과 prose pointer only + §9 CLI Q-label pointer-only strict + §5.4.2 opening narrow + `manifest.version` alias → `manifest.domain_manifest_version` 단일화, 2026-04-25) → review (`.onto/review/20260425-819452d3`, codex, **1 Consensus + 1 Disagreement + 1 UF**. Purpose Alignment preserved. Review "focused re-review 로 충분")
  - r10 (r9 3 findings 전수 해소 — §5.4.1 bump alias 마지막 instance 제거 + §5.4.2 경계 원칙 row-level exception 허용 명시 + §9.1 group header count drift 원천 차단, 2026-04-25) → review (`.onto/review/20260425-50f5ceaf`, codex, **Consensus = r10 이 r9 scope 닫았다 긍정 affirmation + 0 Conditional + 0 Disagreement + 4 UF (1 MAJOR + 3 MINOR)**. Clean pass 직전 단계)
  - r11 (r10 4 UF 전수 해소 — §5.4.2 row pointer fix + §5.6.3 error code canonical map 신설 + §7.1 stale formula 제거 + §9.1 bullets strict pointer-only trim, 2026-04-25) → review (`.onto/review/20260425-07050236`, codex, **1 Consensus (propagation 미완) + 1 Disagreement (coverage vs 3 lens) + 0 UF**. Axiology no drift)
  - r12 (r11 2 findings 전수 해소 — upstream error code wording 을 §5.6.3 canonical map 과 align + §9.1 Q-S4-CLI-21 추가 + §9.2 count update, 2026-04-25) → review (`.onto/review/20260425-095af3d8`, codex, **2 Consensus positive affirmations (CNS-01 repair closed + CNS-02 axiology no drift) + 0 Conditional + 0 Disagreement + 0 Axiology perspective + 2 UF (solo lens minor)**. **Contract-level clean pass 도달**)
  - r13 (r12 2 UF 전수 해소 — §5.4.2 table scope "manifest field" → "governed subject" rename + §5.6.3 operator recovery guidance 를 code 별 specific path table 로 분리, 2026-04-25) → review (`.onto/review/20260425-a8aff541`, codex, **2 Consensus positive affirmations (wording-level closure + axiology no drift) + 0 Conditional + 2 Disagreement (SEM-01 §5.4.2 opening residue + DEP-01 §5.6.3 non-interactive branch 누락) + 0 UF + 0 Axiology perspective**. Recommendation: §5.4.2 + §5.6.3 focused re-review)
  - r14 (r13 2 Disagreement 전수 해소 — §5.4.2 opening "모든 manifest field" → "모든 governed subject" sync + §5.6.3 recovery table 에 origin column 추가, 2026-04-25) → review (`.onto/review/20260425-f4b37b96`, codex, **2 Consensus positive affirmations + 0 Conditional + 1 Disagreement D-01 (6 vs 2 lens, 1 line alias residue) + 1 positive UF axiology + 0 negative UF**. Recommendation: §5.6.3 only focused re-review)
  - **r15** (r14 D-01 해소 — §5.6.3 non-interactive `manifest_version_not_incremented` row 의 "기존 manifest.version" → "기존 `domain_manifest_version`" 1 line fix) — 2026-04-25
- **Next**: r15 에 대한 `/onto:review` 15차 focused re-review (§5.6.3 only, final clean pass)

**Revision 이력의 단일 authority**: frontmatter `revision_history:` (YAML) 가 canonical. 본 §11 은 요약 pointer.

**Next Step (Stage 3 wrap-up) 예고**: 본 Step 4 clean pass 도달 + Step 4 PR + Step 2 amendment commit 완료 후, Stage 3 4 Step 누적 결정을 single index (§7 seat) 로 정리. 이후 Track B 구현 세션 진입 (W-A-80~) — canonical seat migration (§7.2~§7.4) 이 Track B 첫 commit 의 핵심 목표.
