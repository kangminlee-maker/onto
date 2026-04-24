---
as_of: 2026-04-24
revision: 6
status: pre-decision-structural-review
functional_area: phase-4-stage-3-step-3
purpose: |
  Phase 4 Stage 3 Step 3 — Hook γ Rationale Reviewer 의 protocol 세부를
  확정하는 설계 문서. Step 1 (PR #201) 이 확정한 Hook γ 의 역할 + 입력 +
  출력 directive + sole-writer invariant + apply bridge + failure contract
  전제, Step 2 (PR #202) 가 확정한 mechanical 패턴 (schema single
  authority + state machine + full failure only + LLM/runtime boundary +
  English-only prompt + fresh-agent role) 을 거울 참조. Step 3 는 이들의
  mechanical 하위 구현 spec: input schema, output directive schema,
  prompt 실문자열, role 파일 본문, runtime integration (Phase 2 Step 2c),
  failure handling. Step 1/2 재논의 아님.
authority_stance: non-authoritative-review
canonicality: scaffolding
revision_history:
  - revision: 1
    date: 2026-04-23
    change: |
      초안 — handoff (`development-records/plan/20260423-phase4-stage3-step3-handoff.md`)
      §2.1~§2.5 scope 반영. Step 2 r6 거울 참조 + Step 3 특유 결정
      (selective partial output / abort semantic 차이 / [d] Continue with
      degraded / populate_stage2_rationale Explorer 경계) 명시.
  - revision: 2
    date: 2026-04-23
    change: |
      /onto:review 1차 (20260423-dd4dae66, 1 BLOCKING + 5 MAJOR + 5 MODERATE +
      2 MINOR + 3 Conditional + 3 Disagreement + 38 Recommendations + NP-1
      proposal) 반영 — BLOCKING evidence-claim 해소 + mechanical contract
      정돈.
      (B1 — C-1 BLOCKING) Implicit confirm 의 evidence-claim 제거.
      axiology option α 채택 (Principal 승인) — IMPLICIT CONFIRM pass 삭제,
      Reviewer directive 에 포함된 element 에만 provenance.reviewed_at/by/
      version populate. directive 에 없는 element = `reviewed_at` null 유지.
      §1.4 / §3.1 / §3.2 / §6.2 / §7.2 일괄 정합. Q-S3-18 재구성 (A populate
      / B populate 안 함, **B 권장** — 6 finding 일괄 해소: C-1 + DI-1 +
      C-2 일부 + logic F-3 + semantics S-4 + pragmatics Y-5 + coverage
      F-COV-1).
      (B2 — C-3) `wip_snapshot_hash` 정책 3 지점 명시 — (a) canonical YAML
      serialization (sorted keys + LF + UTF-8), (b) Step 4b 재검증 snapshot
      = 2c-spawn 시점 해시 (race 감지), (c) 2a/2b/2c 병렬 dispatch 간섭 —
      §3.7 + §3.8 + §6.2 조정. pragmatics Y-4 + coverage F-COV-2 수렴.
      (B3 — C-4) §7.1 [d] 에 Phase 3 read 계약 1 문장 추가 — Step 4 scope
      forward contract.
      (B4 — C-5) `populate_stage2_rationale` 의 `proposed_by /
      proposer_contract_version` 2 중 의미 해소 — option A 채택:
      Reviewer 가 생성한 entity 는 `proposed_by = "rationale-reviewer"`
      + `proposer_contract_version = reviewer_contract_version`, 해석 규칙
      §3.6 + §6.3 명시. 3 lens 수렴 해소 (semantics S-2 + structure
      MAJOR #3 + dependency D-7).
      (B5 — C-6) `meta.step2c_review_retry_count` reset rule 명시 —
      `gamma_completed / gamma_skipped` 도달 시 0 reset. §7.4 degradation
      counter 와 분리. structure MAJOR #2 + dependency D-9 수렴.
      (B6 — C-9) `__truncation_hint` per-update marker 제거 — v1 dead
      field. v1.1 backlog 이연. §3.1 + §6.3 수정.
      (B7 — F-COV-11 trivial anchor) §3.2 / §3.3 / §3.6 의 `§3.7.1 D2` →
      `§3.8.1 D2` 전면 정정 (rename drift).
      (B8 — logic F-2) §6.2 `gamma_completed` description "Phase 2 Step 3
      진행 가능" → "Phase 3 진입 가능" 수정 (flow ordering 정합).
      (R-1 / C-7) operation→field apply mapping 3-way enumeration 축약 —
      §3 canonical + §6.2/§6.3 pointer 로 재편. conciseness F-CONC-1 HIGH +
      evolution E-2 수렴.
      (R-6 / E-5 HIGH) Step 2 ↔ Step 3 mirror 참조 drift trigger — §10.1
      에 "Step 2 개정 시 Step 3 동기 갱신, reviewer_contract_version bump
      trigger" 항목 추가 (dependency D-2 + evolution E-5 수렴).
      (R-7 + R-8 + E-4) §2.1 input 에 `rationale_state` single-declaration
      명시 + §3.8 rule 11 신설 — `revise / mark_*` operation 이
      `rationale_state == empty` element 에 적용되면 reject.
      (R-9 / DI-2 / A-5 / F-1) `reviewed` 의미 축 명시 (modify/populate 한
      상태, 절차 단계 선후 아님) + CC-1 β option `provenance.gate_count`
      신규 field (Stage 2 add-path single-gate vs Proposer+Reviewer
      two-gate 구별) — §3 + §6.3 반영.
      (R-10) `inference_mode` field path + enum + Reviewer 동작 차이 명시
      (§2.3 precondition 에 full/degraded 구별 명시). `none` 은 이미
      `gamma_skipped` 트리거이므로 동작 차이 없음.
      (R-11 / S-1) §3.4 runtime apply 의 `null` 리터럴 표현 수정 —
      "`new_domain_refs` 가 directive 에 absent 면 기존 유지".
      (R-12) §3.4 의 `new_domain_refs` optional 정당화 1 줄 추가 (§3.5
      required 와 대조).
      (R-13 / S-3) §3.7 provenance 에 3 version field definition block
      1 줄씩 추가.
      (R-14 / E-1) §4.2 에 `reviewer_contract_version` migration rule —
      "major bump = `rationale_state: reviewed` element 의 재검증 필요
      여부는 Step 4 scope, 본 Step 3 는 version bump trigger 만 규정"
      명시.
      (Q-S3-21 신규) operation enum 확장 protocol — Step 4 scope. 본 Step
      3 r2 는 "v1 에서 enum 변경 없음" 만 확정.
      (Q-S3-22 신규) `provenance.gate_count` field 도입 (CC-1 β option).
      (§10.1 추가) Step 2 §6.3.1 의 "Reviewer refinement 이연" 문장
      amendment action item 명시 (dependency D-2, inverted dependency 해소).
      (§6.5 mis-scope) "Hook β propagation (§6.5)" 섹션명을 "Post-Hook γ
      propagation semantics" 로 rename + Hook β no-op 설명과 Hook γ→δ
      flow 를 별 paragraph 로 분리.
      (retained as backlog) axiology A-7 NP-1 (Principal Burden Drift) —
      axiology role 정의 § Core questions 확장으로 이연. 본 review 의
      active lens set 변경 없음.
  - revision: 3
    date: 2026-04-23
    change: |
      /onto:review 2차 (20260423-d1c26548, sendmessage-a2a deliberation 2
      rounds, BLOCKING 0 + 20 Consensus 중 6 MAJOR + 3 CC + 7 Disagreement
      + 10 IA + 24 R) 반영 — α enforcement seat drift 전수 해소 + 2
      Principal Decision 경로 A 채택.
      (P-DEC-A1 — IA-SYN-9, CC-SYN-1, D-SYN-A) Step 2 protocol amendment
      authority 경로 A 승인. §10.1 Step 2 patch 블록 신설 + 3 action 통합:
      (a) Step 2 protocol §6.3 에 `provenance.gate_count = 1` write rule
      추가, (b) Step 2 protocol §3.4 의 `rationale_state` enum 에 `empty`
      추가 (Step 1 §4.5 canonical mirror), (c) `pack_missing_areas` 의
      "Reviewer v1 미관여, v1.1 backlog" 재해석을 Step 2 §6.3.1 에 반영.
      Step 2 Q-S2-21 (`fallback_reason` additive extension) 선례 정합.
      axiology NEW-A6 BLOCKING-근사 해소. evolution E-16 MODERATE 로 확정.
      (P-DEC-A2 — IA-SYN-10, D-SYN-B) Q-S3-21 enum rename scope 경로 A
      승인. `populate_stage2_rationale` → `populate_stage2_rationale`
      throughout (§3.6 / §3.8 rule 2+8 / §4 prompt / §5.1 role body / §6.3
      / §9 Q-S3-4 / §9 Q-S3-15 전수). "populate + stage2 + rationale"
      어근 순서 (semantics S-5 의도 존중) + 간결성 (rename 대비 약 35%
      축약). Q-S3-21 scope 는 "v1 에서 enum 변경 없음" → "v1 에서 rename
      1 회 허용, 신규 enum value 도입 없음" 로 clarify.
      (IA-SYN-1) §5.1 role body + §9 Q-S3-3 옵션명 "implicit confirm" →
      "UNREVIEWED (reviewed_at == null)" 완전 교체 — α enforcement seat
      drift 5 lens 수렴 해소. "fabricate confirm" warning 문구 추가.
      (IA-SYN-3 + IA-SYN-8 + C-SYN-8) Provenance scope 분리 + SSOT 정돈.
      §3.7 heading → "Top-level directive provenance" rename. §3.7.2
      "Element-level `intent_inference.provenance` schema" subsection 신설
      (proposed_at/by/version, reviewed_at/by/version, gate_count,
      principal_*, state_reason canonical 선언 위치). §3.1.1 "Common
      provenance-3 populate apply rule" 신설. §3.2~§3.6 runtime apply block
      의 provenance-3 populate 문구 제거, 고유 effect 만 유지.
      (IA-SYN-4 + C-SYN-4) §3.7.1 Step 4b 재검증 mechanism 확정 — snapshot
      을 `.onto/builds/{session}/wip-2c-snapshot.yml` 에 persist,
      rehash 는 file read + canonical serialize + SHA-256 로 결정. §3.7
      에 `domain_files_content_hash` field 추가 + §3.8 rule 12 신설 (pack
      content drift 감지). library pinning — `provenance.hash_algorithm`
      field 에 `"js-yaml@X.Y + sha256"` 기록.
      (IA-SYN-5 + C-SYN-5) `rationale_state == "empty"` enum drift 해소 —
      Step 2 amendment 경유 (P-DEC-A1 (b)). §3.8 rule 8 의 Boolean 오류
      교정 — "non-empty = `rationale_state != "empty"` **AND**
      intent_inference field 존재" (logic F-1 one-line fix). §3.6 empty
      정의도 대칭.
      (IA-SYN-6 + C-SYN-6) §7.2 말미에 Phase 3 consumer **triple-read
      contract** 명시 — `reviewed_at == null` 해석은 `(reviewed_at,
      rationale_review_degraded, rationale_state)` 3-tuple 로 결정.
      minimum-sufficient disambiguation set 선언.
      (IA-SYN-7 + C-SYN-7) `reviewed_at` timestamp source 교정 — Runtime
      populate = "directive.provenance.reviewed_at 값 복사 (agent emit
      시점)" 로 통일. §3.2 table + §3.3~§3.6 apply 문구 + §4 prompt
      [Provenance] block 동시 수정.
      (IA-SYN-8 + C-SYN-9 + R-SYN-mirror) Step 2 ↔ Step 3 mirror marker
      enforcement — §3.8 / §3.8.1 / §4 / §5 / §6.2 5 mirror point 에
      `<!-- mirror-of: step-2-protocol §X.Y -->` comment 부착. §10.1 에서
      marker 필수화 (selectable 제거). §6.2 + §7.1 의 "Step 2 와 semantic
      차이" block 을 §1.4 pointer 로 축약 (conciseness F-CONC-2).
      (R-SYN-1 + C-SYN-10) §6.2 retry cycle bound invariant 1 줄 명시 —
      "bounded cycle invariant: `gamma_in_progress ↔ gamma_failed_retry_pending`
      는 `retry_count ≤ 1` 로 bound. 1 회 소비 후 terminal. 다른 cycle
      없음".
      (R-SYN-3 + C-SYN-11) `meta.pack_missing_areas` read-only 주석 —
      §2.1 + §4 prompt [Input] + §5 role 본문에 "read-only context; Reviewer
      does NOT emit operations against this field" 추가. Step 2 §6.3.1
      재해석 amendment (P-DEC-A1 (c)) 와 정합.
      (CC-SYN-2 + A-1) `rationale_state == "reviewed"` semantic axis
      명시 — §3.3 + §3.6 의 "`reviewed` 는 Reviewer 가 active 하게
      modify/populate 한 상태, 절차 단계 선후 아님" 문장 강화. gate_count
      가 one-gate vs two-gate 구별 provides (별도 enum 확장 불필요).
      (Conditional — axiology A-2 + D-SYN-C) `[d] Continue with degraded`
      의 Principal burden trade-off 기록 확대 — §7.1 [d] block 에 "This
      option transfers rationale-quality judgement to Principal workload.
      Onto-direction §1.0 axis trade-off: local (Phase 2 완주) vs global
      (Principal 시간/비용 최소화). Threshold-triggered default flip 은
      v1.1 backlog." 문단 추가.
      (기타 MINOR 수렴) C-SYN-12~C-SYN-18 의 MINOR 교정 일괄 반영:
      §3.4 domain_refs stale 처리 (C-SYN-12), §3.3 new_domain_refs absent
      vs empty (C-SYN-13), §6.2+§7.4 failures_streak reset 통합 문구
      (C-SYN-14), §3.2 confirm.reason 비대칭 설명 (C-SYN-15), new_* prefix
      convention (C-SYN-16), §5.1 add-path boundary pointer 축약
      (C-SYN-17), gamma_failed_continued_degraded 어근 glossary (C-SYN-18).
      (§10.1 확장) 3 action Step 2 amendment + gate_count read contract +
      mirror marker enforcement 항목 추가.
      (§10.2 추가) axiology NP-A1 (Principal Burden Accounting) —
      axiology role 정의 확장 path 명시.
  - revision: 4
    date: 2026-04-24
    change: |
      /onto:review 3차 (20260424-fcdcf9dc, codex-nested-subprocess, BLOCKING
      0 + 2 Consensus + 3 CC + 5 Disagreement + 6 Immediate Actions + 2 UF)
      반영 — r3 구조 재편 후 leftover local drift 일괄 정리.
      (IA-r3-1) §4 prompt [Provenance] block 에 `domain_files_content_hash`
      + `hash_algorithm` 2 field populate 요구 추가 (r3 §3.7 schema 추가
      후 prompt 반영 누락 해소).
      (IA-r3-2) Rename 잔재 정리 — prompt 본문 + Q-S3-22 설명 + § 기타
      지점의 "Add-for-stage2" / "add_for_stage2_entity" 어근 전수 검색
      후 `populate_stage2_rationale` 로 통일. rename scope 완결.
      (IA-r3-3) §7.2 triple-read table 에 `confirm` case row 추가 —
      reviewed_at != null AND rationale_state == "proposed" (Reviewer 가
      explicit confirm emit 했으나 state 는 proposer 상태 유지) 조합을
      4 번째 canonical row 로 등재. 이 조합은 §3.2 confirm 의 "rationale_state
      는 변경 없음" rule 과 정합.
      (IA-r3-4) `gate_count` legacy default 를 §3.7.2 canonical 1 seat 만
      유지. §6.3 table 의 gate_count row 는 §3.7.2 pointer 로 축약.
      §10.1 Step 4 read contract pair list 에서 "legacy default 결정은
      Step 4 이연" 문장 제거 — §3.7.2 canonical 기준 legacy = 1 확정,
      Step 4 는 read 만.
      (IA-r3-5) §10.1 mirror marker enforcement 를 single mandatory rule
      로 통일 — "selectable 제거" 표현과 "구현 세션 필수" 2 곳 모순 해소.
      "r3 merge PR 의 구현 commit 에 mirror marker 5 지점 부착이 필수"
      단일 선언. §7.3 의 "rule 1~11" 참조 문구를 `rule 1~12` 로 sync
      (r3 rule 12 신설 반영).
      (IA-r3-6) §3.7.1 item 8 (`domain_files_content_hash`) 에 Step 4b
      re-read source path 명시 — `.onto/builds/{session}/domain-files-2c-snapshot.yml`
      에 persist (wip-2c-snapshot.yml 과 mirror pattern). file-based rehash
      의 dual drift coverage (wip + pack) 완결.
      (UF-LOGIC-1) §3.1.2 "Empty / non-empty partition canonical definition"
      신설 — De Morgan complement 쌍을 single authority 에 선언. §3.6 +
      §3.8 rule 8+11 의 empty/non-empty 인용은 §3.1.2 pointer 로 축약.
      (UF-CONC-1) §3.2~§3.5 runtime apply 의 provenance-3 populate 문구
      잔재 제거 — 고유 effect (intent_inference field 교체/null-clear)
      만 유지. §3.1.1 common rule 이 single authority 로 확정.
  - revision: 5
    date: 2026-04-24
    change: |
      /onto:review 4차 (20260424-38fd67b9, codex-nested-subprocess, BLOCKING
      0 + MAJOR 0 유지 + 2 Consensus + 1 CC + 1 Disagreement + 6 IA + 4 UF
      + 3 R — 모두 collapse residue local fix) 반영 — r4 구조 재편 후
      잔여 sync drift 일괄 정리.
      (IA-r4-1) §10.1 `gate_count` migration bullet 제거 — "legacy default
      결정 Step 4 이연" 표현 제거, §3.7.2 canonical (missing = 1) single
      authority 확정. dual authority 해소 (C-1 9/9 lens 수렴).
      (IA-r4-2) §9 Q-S3-22 rewrite — `populate_stage2_rationale` + §3.7.2
      pointer 로 교체. `add_for_stage2` wording + §6.3 reference 잔재 제거
      (C-2 4 lens 수렴).
      (IA-r4-3) §2.1 Input schema 항목 5+6 신설 — `wip_snapshot_hash` /
      `domain_files_content_hash` / `hash_algorithm` 를 input-package
      member 로 explicit 선언 (§4 [Provenance] 의 copy-from-input 지시와
      pair). UF-DEPENDENCY-1 해소.
      (IA-r4-4) §6.2 "§3.8 reject 조건 1~10" → "1~12" sync (UF-DEPENDENCY-2).
      (IA-r4-5) §10.1 Step 4 read-contract `gate_count` 항목 확장 — single-
      gate case 2 종 명시: (a) populate_stage2_rationale origin, (b) Hook
      α 생성 + Hook γ 미검증 (legacy 포함). UF-COVERAGE-1 해소.
      (IA-r4-6 + UF-STRUCTURE-1 + R-3) Mirror marker 의 semantic 명확화 —
      "implementation-commit obligation" 로 명시. 문서 본문에 5 개
      `<!-- mirror-of: step-2-protocol §X.Y -->` attachment 를 본 r5 에서
      실제 부착 (§3.8 / §3.8.1 / §4 role 블록 / §5.1 / §6.2). 문서-level
      obligation 과 구현-commit obligation 양쪽 모두 충족.
      (R-1) §3.1.2 에 `domain_scope_miss` / `domain_pack_incomplete` 를
      non-empty state 로 explicit 명시 — semantics D-1 우려 해소.
      rationale text 가 null 이어도 rationale_state 가 non-empty value
      이므로 non-empty partition 에 속함을 canonical 문장으로 선언.
      (R-2) Pointer section (§6.3 / §7.3 / §10.1) 의 legacy example 재진술
      재검사 — §6.3 Gate count block + §10.1 Step 4 read-contract 가
      pointer-only 유지, legacy example 잔재 없음 확인 (r4 부분 완료 + r5
      IA-r4-1+5 로 완결).
  - revision: 6
    date: 2026-04-24
    change: |
      /onto:review 5차 (20260424-e538f3ac, codex-nested-subprocess,
      BLOCKING 0 + MAJOR 0 + **6 lens clean** + 2 Consensus + 0 CC + 0
      Disagreement + 2 IA + 1 UF — "no broader redesign needed, final
      synchronization cleanup" synthesize 선언) 반영 — clean pass 직전
      local sync drift 2 건 정리.
      (IA-r5-1) §7.1 full failure 정의의 "§3.8 의 11 reject 조건" → "§3.8
      reject 조건 중 하나 (rule count 는 §3.8 authority 참조)" pointer-only
      로 교체. §7.3 / §7.5 가 이미 1~12 로 sync 된 상태에서 §7.1 만 11
      잔재했던 local oversight 해소 (logic + structure 공동 수렴).
      (IA-r5-2) §10.1 mirror marker 중복 bullet 제거 — amendment block 내
      "mirror marker enforcement" 선언이 single local authority 로 확정,
      별도 bullet restate 제거 (conciseness UF).
source_refs:
  step_1_flow_review: "development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §7.3/§7.4/§7.5 Hook γ"
  step_1_decision: "development-records/evolve/20260423-phase4-stage3-step1-reconstruct-v1-axes.md (Q5/Q6/Q7 승인)"
  step_2_protocol: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md (r6, 9/9 clean pass)"
  step_2_decision: "development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md (22 Q 승인)"
  step_3_handoff: "development-records/plan/20260423-phase4-stage3-step3-handoff.md"
  reconstruct_v0: ".onto/processes/reconstruct.md §Phase 2 Step 2 (focused lens queries, 2a/2b parallel dispatch) + §1.0 Team Composition (Axiology Adjudicator prompt 패턴)"
  language_policy: ".onto/principles/output-language-boundary.md"
---

# Stage 3 Step 3 — Rationale Reviewer Protocol

## 0. 본 문서의 목적

Step 1 (PR #201) 이 확정한 Hook γ 의 **역할 + 입력 + 출력 directive + sole-writer invariant + apply bridge + failure contract** 를 전제로, Step 2 (PR #202) 가 확정한 **mechanical 패턴 (schema single authority + state machine + full failure only + LLM/runtime boundary + English-only prompt + fresh-agent role)** 을 거울 참조하여, Rationale Reviewer agent 의 **mechanical 구체** 를 확정한다:

1. Input schema 상세 (전체 wip.yml + manifest + domain_files_content + system_purpose 가 어떤 순서/크기로 주입되는가)
2. Output directive schema 상세 (operation enum 별 필수/조건부 field, **selective partial output** semantic)
3. Prompt 실문자열 (English-only, Axiology Adjudicator / Rationale Proposer 패턴 동형)
4. Role 파일 본문 (`.onto/roles/rationale-reviewer.md` 전문)
5. Runtime integration (Phase 2 Step 2c parallel dispatch + Step 4a Synthesize aggregation + Step 4b Runtime atomic apply)
6. Failure handling (full failure + [r]/[d]/[a] Principal response — **Hook α 와 abort semantic 차이** 반영)

**Scope 엄격**: Phase 3 throttling (Step 4), Phase 3.5 write-back (Step 4), raw.yml meta 확장 (Step 4), `onto domain init` CLI (Step 4) 는 본 문서 밖.

## 1. Step 3 scope 재진술 + Step 1/2 의존

### 1.1 Step 1 + Step 2 가 이미 확정한 것 (본 Step 3 가 전제로 하는 것)

**Step 1 (flow-review r7 + decision) 이 확정한 것**:

- **agent 종류**: `Rationale Reviewer` fresh agent (Q5). role: `.onto/roles/rationale-reviewer.md`
- **시점**: Phase 2 Step 2c (Step 2a Semantics + Step 2b Coverage 와 parallel dispatch)
- **입력 3 축**: 전체 wip.yml (`intent_inference` 포함) + manifest + referenced_files content + `context_brief.system_purpose`
- **출력 directive 상위 구조**: `rationale_reviewer_directive.updates[]` + `provenance`
- **operation enum**: `confirm / revise / mark_domain_scope_miss / mark_domain_pack_incomplete / populate_stage2_rationale`
- **sole-writer invariant**: Reviewer 는 wip.yml 직접 쓰기 금지. directive only
- **apply bridge**: Step 2c directive → Step 4a Synthesize aggregation (`finalization_directive.rationale_updates[]`) → Step 4b Runtime atomic apply
- **`populate_stage2_rationale` 제약**: `target_element_id` 는 wip.yml 기존 entity 만 — Reviewer 의 entity 생성 불가 (Q6 근거: Stage 2 Explorer 가 발견한 신규 entity 의 rationale 을 Reviewer 가 populate 하는 의미. 신규 entity 자체는 이미 Stage 2 round 에서 elements[] 에 들어온 상태)
- **failure contract**: full failure + degradation counter (`meta.rationale_reviewer_failures_streak`) + fail-loud 원칙

**Step 2 가 확정한 것 (거울 참조 패턴)**:

- **Schema single authority** — protocol §3 가 authority, prompt/role 은 reference only
- **Stage transition state machine** — `meta.stage_transition_state` 7 enum + retry_count pattern (단 Hook γ 는 Phase 2 Step 2c 단계이므로 다른 state 명명과 enum 구성)
- **Full failure only** — schema validation 실패 → full failure. partial recovery 경로 없음. runtime 이 LLM 을 대리 생성하지 않음
- **LLM/runtime boundary** — non-semantic runtime 작업만, semantic clustering 금지 (단 Reviewer 는 LLM-owned seat 이므로 pack_missing_areas refinement 는 Reviewer 책임으로 이연 — §6.3.1 참조)
- **Agent prompt 패턴** — English-only, `[Role/Input/Procedure/Provenance/Output Format/Language Policy/Rules]` 구조, Axiology Adjudicator 동형
- **Role 파일 구조** — lens 가 아닌 fresh-agent role 명시, boundary routing 명시
- **Post-validation 저장** — agent 자기보고 값이 아닌 runtime-downgraded 값 저장 (Hook β gating 포함)

### 1.2 Step 3 가 상세화할 것

위 항목들의 **mechanical 구현 spec**. Step 1 의 "결정 표면" 수준에서 구현 세션 input 수준으로 구체화. Step 2 의 mechanical 패턴을 Hook γ 의 Phase 2 Step 2c 문맥으로 옮겨 정밀화.

### 1.3 Step 3 가 피할 것

- Phase 3 throttling (Hook δ) — Step 4 책임
- Phase 3.5 write-back (Principal action → terminal state 매핑, §7.9 전수) — Step 4
- raw.yml meta 확장 (`rationale_review_degraded: true` flag 의 raw.yml persistence) — Step 4
- `onto domain init` CLI 구현 — Step 4
- wip.yml 의 `intent_inference` field 전체 schema — Step 1 §4.5 canonical, Step 3 는 Reviewer 가 populate 하는 field 만 referencing

### 1.4 Step 2 와의 핵심 차이 (Step 3 에서 반드시 유의)

| 축 | Step 2 (Hook α) | Step 3 (Hook γ) |
|---|---|---|
| **시점** | Stage 1 → Stage 2 transition (1 회) | Phase 2 Step 2c (1 회, 2a/2b 와 parallel) |
| **입력 완결성** | Stage 1 확정 entity 목록 (rationale 없는 상태) | **전체 wip.yml** — Stage 1+2 exploration 완료 + intent_inference 기 populate 된 상태 |
| **출력 완결성** | `proposals.length == entity_list.length` **강제** | **selective** — 모든 element 에 update 불필요 (변경이 필요한 element 만 emit) |
| **partial output 의미** | partial = full failure (Step 2 §7.2 폐지 결정) | partial = **정상** — directive 에 없는 element 는 기존 intent_inference + provenance 전부 유지 (Reviewer 가 판단하지 않은 element 임을 `provenance.reviewed_at == null` 로 표시, r2 α 결정) |
| **operation kind** | outcome enum (proposed/gap/domain_scope_miss/domain_pack_incomplete) — entity 의 **새로운** rationale state | operation enum (confirm/revise/mark_domain_scope_miss/mark_domain_pack_incomplete/populate_stage2_rationale) — 기존 state 의 **변경 작업** |
| **state transition 주체** | Stage transition state machine (`meta.stage_transition_state`) | Phase 2 Step 2c progress state (`meta.step2c_review_state` — §6.2) |
| **abort semantic** | `alpha_failed_aborted` = 세션 종료 (Stage 1 상태 보존, Stage 2 진입 차단, Principal 재실행 결정 필요) | `gamma_failed_aborted` = **Phase 2 차단 + wip.yml Stage 2 완료 상태 보존** (재시작 시 Phase 2 Step 2 부터 re-enter 가능) |
| **degraded 경로** | [v] Switch to v0-only — intent_inference 미populate 로 Stage 2 진행 | **[d] Continue with degraded** — proposed element 전수 Phase 3 Principal 판정으로 escalate (`rationale_review_degraded: true` flag) |
| **entity 생성 권한** | Proposer: 기존 entity 의 초기 rationale generation only — 신규 entity 생성 불가 | Reviewer: 기존 entity 의 revise + Stage 2 신규 entity 의 intent_inference populate (populate_stage2_rationale) — 단 Explorer 가 elements[] 에 이미 넣은 entity 에 한정 |

**핵심 trap (handoff §2.4 에서 경고)**: Step 2 의 "partial = failure" 원칙을 Step 3 에 기계적으로 복사하면 잘못. Reviewer 의 **정상** 행동이 partial output (대부분 element 는 Reviewer 가 판단 변경 없이 accept — directive 에 명시 안 함) 이며, 이를 failure 로 routing 하면 모든 정상 Reviewer 실행이 halt.

**r2 α 결정 (C-1 BLOCKING 해소)**: directive 에 없는 element 는 **"Reviewer 가 판단하지 않았다"** 로 해석하며 runtime 은 `intent_inference` 와 `provenance` 전부를 변경하지 않는다. `reviewed_at / reviewed_by / reviewer_contract_version` 3 field 는 Reviewer 가 directive 에 explicit operation 으로 emit 한 element 에만 Runtime 이 populate. 이 원칙은 **evidence-generating claim 은 LLM output 에만 근거한다** 는 llm-native-development-guideline §3 + productization-charter §5.1 에 정합하며, `reviewed_at` 의 존재 여부가 "Reviewer 가 실제로 판단 emit 했는가" 와 1:1 대응하도록 artifact truth 를 유지.

`reviewed_at == null` element 는 downstream (Phase 3 rendering, raw.yml audit) 에서 **"Reviewer 미판정"** 으로 해석 — Hook α 의 `rationale_state: proposed + reviewed_at null` 조합이 γ-degraded 와 γ-미수행 상태를 구별하는 기준이 된다 (Step 4 scope).

## 2. Input Schema 상세

Rationale Reviewer agent 는 team lead (Runtime Coordinator) 가 Phase 2 Step 2 dispatch 시 spawn 하며 **단일 prompt 주입** 으로 다음 입력을 받는다. Axiology Adjudicator / Rationale Proposer 와 동형 — fresh agent per invocation.

### 2.1 Input 구성 (team lead 주입 순서)

```
[input_package] (team lead 가 prompt 에 주입)

1. system_purpose: string (1~2 sentences)
   source: context_brief.system_purpose
   size: unbounded but typically ≤ 300 chars

2. wip_snapshot: object (Stage 1+2 exploration 완료 상태의 wip.yml 전수)
   source: Phase 2 Step 1 (Runtime Coordinator deterministic output) 이후의 wip.yml
   주입 sections (authored by Step 1/2 runtime + Stage 1/2 lenses/agents):
     - elements[]: Stage 1+2 확정 entity 전수
         per-entity fields (선택된 것만 주입):
           - id: string
           - type: string (schema element_type)
           - name: string
           - definition: string
           - certainty: enum (observed | rationale-absent | inferred | ambiguous | not-in-source)
           - source.locations: array of location refs (file:line / sheet:cell / schema.table.column)
           - relations_summary: array of related entity ids + relation types (Stage 1+2 종료 상태)
           - intent_inference: object (Proposer 가 populate 한 상태, §4.5 schema)
               * inferred_meaning, justification, domain_refs, confidence,
                 rationale_state, state_reason, provenance, principal_provided_rationale,
                 principal_note — 주입 시점에 존재하는 field 전수
         excluded fields (주입 안 함):
           - labeled_by (anonymization 보존 — lens identity 숨김)
           - source_deltas (delta ID 직접 참조 불필요, location 으로 충분)
           - issues (Reviewer 는 conflict resolution 담당 아님 — Step 3 Axiology Adjudicator 가 별도 처리)
     - relations[]: Stage 1+2 확정 관계 전수
         per-relation fields: source_id, target_id, type, certainty
     - ubiquitous_language: object (Stage 1+2 terminology cleanup 전의 raw)
         * Reviewer 는 ubiquitous_language 에 직접 관여 안 함 — Semantics lens (2a) 가 별도 처리
         * 본 field 는 Reviewer 가 rationale 과 terminology 의 alignment 확인용 read-only
     - meta.module_inventory: Stage 1 확정 module 목록
     - meta.stage1_module_inventory, meta.stage1_uncovered_modules: Stage 1 history (read-only)
     - meta.stage: 2 (Step 2 기준 Stage 2 완료 상태)
     - meta.stage_transition_state: "alpha_completed" | "alpha_skipped" | "alpha_failed_continued_v0" (Step 2)
     - meta.pack_missing_areas: Hook α 가 non-semantic grouping 한 provisional aggregate (Step 2 §6.3.1)

3. domain_manifest: object
   source: ~/.onto/domains/{session_domain}/manifest.yaml
   주입 fields:
     - manifest_schema_version
     - domain_name
     - version, version_hash
     - quality_tier
     - referenced_files: array of {path, purpose, required, min_headings}

4. domain_files_content: array of {path, content}
   source: manifest.referenced_files 의 각 path 의 파일 전체 content
   순서: manifest.referenced_files[] 의 배열 순서 유지
   size limit: 도메인 전체 content ≤ 100 KB 목표
   degraded pack 처리: required file 은 무조건 주입, optional file 이 부재하면 해당 entry 생략

5. provenance_inputs: object (r5 IA-r4-3 명시 선언 — §4 [Provenance] copy-from-input 지시와 pair)
   주입 fields (Reviewer 가 directive.provenance 로 그대로 relay):
     - session_id: string
     - runtime_version: string | null (nullable 허용, §3.7 R-15)
     - wip_snapshot_hash: string (runtime 이 §3.7.1 canonical serialization 으로 사전 계산 후 주입)
     - domain_files_content_hash: string (runtime 이 §3.7.1 item 8 canonical serialization 으로 사전 계산 후 주입)
     - hash_algorithm: string (예: "js-yaml@4.1.0 + sha256", §3.7.1 item 7)
   source: runtime 이 2c-spawn 시점에 계산 + 주입
   Reviewer 책임: 값 계산 아님, directive.provenance 로 값 복사만
```

### 2.2 Input 주입 rule

- **stateless** — Reviewer 는 이전 세션 / 이전 round 정보 없음. 세션마다 독립
- **lens anonymization 보존** — wip.yml elements[].labeled_by 는 주입 안 함. Reviewer 가 lens identity 에 영향 받지 않도록 (Axiology Adjudicator 와 동형)
- **no source.content injection** — entity source code / 문서 본문 content 는 주입 안 함. `source.locations` 만으로 충분 (Step 2 와 동일 — Reviewer 의 역할은 domain + wip.yml 기반 재검증이지 source 재독해 아님)
- **strict scope limit** — manifest 외 도메인 파일은 주입 안 함. `context_brief.architecture` 는 Adjudicator / Proposer 와 동일하게 excluded (scope restriction 보존)
- **intent_inference 포함 주입** — Reviewer 는 Proposer 가 populate 한 기존 rationale 을 읽고 검증한다. Proposer 와 달리 "빈 상태에서 생성" 이 아님. 이 포함 여부가 Reviewer 의 핵심 input 차이

### 2.3 Input quality floor check (team lead 책임, Reviewer 아님)

Team lead (Runtime Coordinator) 는 Reviewer spawn 전에 다음 precondition 확인. 위반 시 spawn 자체를 거부 (Phase 2 Step 2c skip):

- `meta.stage == 2` AND `meta.stage_transition_state ∈ {alpha_completed, alpha_skipped, alpha_failed_continued_v0}` (Stage 2 완료 상태 보장 — Step 2 §6.2 r4 B-new-1 해소 gate 와 동형)
- `inference_mode ∈ {full, degraded}` 확인 (v1 entry 실패 시 Reviewer spawn 금지 — Hook α 와 동형)
- `stage_transition_state == alpha_skipped` OR `alpha_failed_continued_v0` 인 경우: wip.yml 의 elements 에 intent_inference 가 미populate 된 상태. Reviewer 는 이 경우 **skip** (reviewing nothing) 또는 **populate_stage2_rationale 만 emit** 선택. v1 에서는 **skip** (Hook γ 자체 미실행) — `meta.step2c_review_state = "gamma_skipped"` 기록
- `domain_manifest.referenced_files` 의 `required: true` file 전수 존재 (Step 1 flow-review r7 §5.1 v1 entry condition 3 번째)

Reviewer 자신은 preconditions 를 재검증하지 않음 — team lead 가 이미 통과시킨 input 만 받는다고 가정.

## 3. Output Directive Schema 상세

### 3.1 Top-level schema

```yaml
rationale_reviewer_directive:
  updates:                              # SELECTIVE — variable length, 0 이상
    - target_element_id: string        # wip.yml.elements[].id 중 하나
      operation: enum                  # confirm | revise | mark_domain_scope_miss | mark_domain_pack_incomplete | populate_stage2_rationale
      # operation 별 조건부 field — §3.2~§3.6
      ...
  provenance: object                   # §3.7
```

**invariant (Step 2 와 다름, r2 α)**: `updates` 는 **variable length**. `updates.length == elements.length` 강제 없음. directive 에 없는 element_id 는 **Reviewer 가 판단하지 않은 element** — runtime 은 `intent_inference` 와 `provenance` 전부를 변경하지 않는다. `provenance.reviewed_at` 은 null 로 유지되어 downstream 이 "Reviewer 미판정" 을 식별 가능.

**r2 설계 축 (α — C-1 BLOCKING 해소)**: `reviewed_at / reviewed_by / reviewer_contract_version` 3 field 의 존재 여부는 **Reviewer 가 directive 에 explicit operation 으로 emit 한 element 와 1:1 대응**. runtime 이 Reviewer 를 대리하여 evidence-generating claim 을 찍지 않음 (llm-native-development-guideline §3 + productization-charter §5.1). `reviewed_at == null` 은 silent 가 아니라 명시적 "미판정" 신호.

**Per-update truncation marker 부재 (r2 C-9 해소)**: r1 은 `__truncation_hint: string` optional field 를 예약했으나 v1 consumer 부재 (coverage F-COV / structure S-1 + C-9 consensus). r2 에서 제거 + §10.2 v1.1 backlog 이연. session-level `provenance.truncated_fields` 만 유지.

### 3.1.1 Common provenance-3 populate apply rule (r3 IA-SYN-3 + IA-SYN-8 + C-SYN-8)

모든 Reviewer directive operation (confirm / revise / mark_domain_scope_miss / mark_domain_pack_incomplete / populate_stage2_rationale) 의 runtime apply 시 Runtime Coordinator 는 **element-level** `intent_inference.provenance` 의 다음 3 field 를 공통 populate 한다:

- `intent_inference.provenance.reviewed_at` = `directive.provenance.reviewed_at` 값 복사 (agent emit 시점의 ISO 8601 UTC; §3.7 top-level provenance 에서 기원, r3 IA-SYN-7)
- `intent_inference.provenance.reviewed_by` = `"rationale-reviewer"`
- `intent_inference.provenance.reviewer_contract_version` = directive 의 `reviewer_contract_version` 값 복사

§3.2~§3.6 각 operation 의 runtime apply 섹션은 **operation 고유 effect 만** 기술 (intent_inference field 의 교체/null-clear/신규 populate 패턴). 공통 provenance-3 populate 는 본 §3.1.1 이 canonical authority — §3.2~§3.6 에 중복 서술하지 않음 (conciseness F-CONC-1 해소).

**Directive 에 없는 element (r2 α + r3 IA-SYN-1 재확인)**: Runtime 은 본 §3.1.1 의 provenance-3 populate 를 실행하지 않는다. 해당 element 의 `intent_inference.provenance.reviewed_at` 은 null 로 유지 (downstream 이 "UNREVIEWED" 로 해석).

### 3.1.2 Empty / non-empty partition canonical definition (r4 UF-LOGIC-1)

Stage 2 Explorer 가 추가한 entity 는 `intent_inference` 가 empty 상태일 수 있다. Empty / non-empty 의 정의는 **본 §3.1.2 가 single authority**; §3.6 populate_stage2_rationale 전제 + §3.8 rule 8+11 reject 조건은 모두 본 정의의 pointer:

- **empty**: `rationale_state == "empty"` **OR** `intent_inference` field 자체 부재
- **non-empty**: `rationale_state != "empty"` **AND** `intent_inference` field 실제 존재 + populated (inferred_meaning 또는 justification 등 non-null 값 존재)

두 정의는 **De Morgan's 법칙으로 서로 complement**. 한 element 는 empty 이거나 non-empty 이며 둘 다 아니다.

**Canonical empty shape (Stage 2 Explorer convention, Step 1 §4.5 mirror)**: Stage 2 Explorer 가 entity 를 elements[] 에 추가할 때 `intent_inference: {rationale_state: "empty"}` — field 존재 + rationale_state=empty. Step 2 amendment (P-DEC-A1 (b)) 가 Step 2 protocol §3.4 enum 에 `empty` 추가.

**Non-empty state 목록 (r5 R-1 — semantics D-1 해소)**: `rationale_state` 가 `empty` 이외 모든 값은 non-empty partition 에 속한다. 명시적으로:
- `proposed` (Hook α 생성 후 Hook γ 미검증) → non-empty
- `reviewed` (Hook γ revise 또는 populate_stage2_rationale 완료) → non-empty
- `domain_scope_miss` (Hook γ mark_domain_scope_miss — `inferred_meaning/justification/confidence` 가 null 로 cleared 되었어도 **rationale_state 자체는 non-empty value 이므로 non-empty partition**) → non-empty
- `domain_pack_incomplete` (Hook γ mark_domain_pack_incomplete — 동일 이유) → non-empty
- terminal state (principal_accepted / principal_modified / principal_rejected / principal_deferred 등 Step 1 §4.5) → non-empty

즉 `mark_domain_scope_miss` / `mark_domain_pack_incomplete` 적용 후 rationale text field 가 비어도 `populate_stage2_rationale` 을 다시 걸 수 없다 (§3.8 rule 8 reject) — rationale_state 가 이미 판정 완료이므로.

§3.6 / §3.8 rule 8 / §3.8 rule 11 의 "empty" / "non-empty" 인용은 본 §3.1.2 를 canonical source 로 참조 — 중복 서술 금지.

### 3.2 `operation: confirm` — 기존 intent_inference 명시 유지 (explicit)

```yaml
- target_element_id: {id}
  operation: confirm
  reason: string                        # 1 sentence, English (optional but 권장)
                                        # 예: "Domain pack alignment verified against concepts.md Session heading"
```

**semantic (r2 α, r4 UF-CONC-1 pointer)**: Reviewer 가 기존 `intent_inference` 값 (inferred_meaning / justification / domain_refs / confidence / rationale_state / state_reason) 을 **명시적으로 검증 완료, 변경 없음** 으로 선언. 나머지 intent_inference field 는 변경 없이 그대로 유지. Common provenance-3 populate 은 §3.1.1 canonical (검증이 있었다는 evidence 기록).

**directive 부재 element 와의 구별 (r2 α — C-1 BLOCKING 해소)**:

| 표현 | `reviewed_at` | intent_inference field | 의미 |
|---|---|---|---|
| `operation: confirm` directive emit | Runtime copies `directive.provenance.reviewed_at` (agent emit 시점 ISO, §3.7 + r3 IA-SYN-7) | 기존 값 유지 | Reviewer 가 검증 후 변경 없음 선언 |
| directive 에 element_id 부재 | null 유지 (Runtime 미populate, §3.1.1 공통 apply rule 의 "directive 부재 element" 경로) | 기존 값 유지 | Reviewer 가 판단하지 않음 (UNREVIEWED) |

이 구별은 **LLM output (directive) 을 evidence 의 유일한 source** 로 보존. runtime 이 Reviewer 를 대리하여 "reviewed" 를 claim 하지 않는다 (llm-native-development-guideline §3). downstream (Phase 3 rendering, raw.yml audit — Step 4 scope) 은 `reviewed_at == null` 을 "Reviewer 미판정" 으로 해석하여 Principal 판정 surface 에 적절히 반영.

`inferred_meaning / justification / domain_refs / confidence / state_reason` 은 **omit** (revise 가 아니므로 새 값 제공 안 함). 존재 시 runtime reject (§3.8 rule 5).

### 3.3 `operation: revise` — 기존 intent_inference 교체

```yaml
- target_element_id: {id}
  operation: revise
  new_inferred_meaning: string          # 1~2 sentences, English (required — revise 는 의미 교체)
  new_justification: string             # 1~3 sentences, English (required)
  new_domain_refs:                      # 0 개 이상 허용 (§3.8.1 D2 로 empty 시 low downgrade)
    - manifest_ref: string              # manifest.referenced_files[].path 중 하나
      heading: string
      excerpt: string                   # ≤ 100 chars
  new_confidence: enum                  # low | medium | high (self-reported, §3.8.1 downgrade 적용)
  reason: string                        # 1 sentence, English (required — 왜 revise 했는가)
                                        # 예: "Proposer's justification conflicted with structure_spec.md Session scope"
```

**semantic (r2 R-9 해소)**: Reviewer 가 기존 `intent_inference` 의 inferred_meaning / justification / domain_refs / confidence 를 새 값으로 교체. `rationale_state` 는 `reviewed` 로 전이 — 여기서 `reviewed` 는 **"Reviewer 가 actively modify 또는 populate 한 상태"** 를 의미 (절차 단계의 선후가 아님). explicit confirm 은 `rationale_state` 를 변경하지 않음 — Proposer 가 남긴 `proposed` state 를 유지하면서 `provenance.reviewed_at` 만 populate 하여 "검증 완료" 를 표시. `state_reason` field 는 revise 에서 omit (reviewed state 는 state_reason 미저장).

runtime apply (r4 UF-CONC-1 — provenance-3 populate 는 §3.1.1 common rule pointer): `inferred_meaning = new_inferred_meaning`, `justification = new_justification`, `domain_refs = new_domain_refs`, `confidence = new_confidence` (post-validation value — §3.8.1 downgrade 적용), `rationale_state = "reviewed"`, `state_reason = null`. Common provenance-3 field populate 은 §3.1.1 canonical 참조 — 여기 재진술 없음.

### 3.4 `operation: mark_domain_scope_miss` — domain 범위 밖 재판정

```yaml
- target_element_id: {id}
  operation: mark_domain_scope_miss
  state_reason: string                  # 1 sentence, English (required)
                                        # 예: "Entity represents infrastructure concern outside stated domain scope"
  new_domain_refs:                      # optional — scope-declaring file 참조
    - manifest_ref: string
      heading: string
      excerpt: string
  reason: string                        # 1 sentence, English (required)
```

**semantic**: Reviewer 가 기존 state 를 `domain_scope_miss` 로 재판정. `inferred_meaning / justification / confidence` 는 **null 로 clear** (scope 밖 판정이므로 rationale 무효).

**`new_domain_refs` optional 정당화 (r2 R-12)**: scope 판정은 scope-declaring file 의 존재로부터 bottom-up 도출되기도 하지만 **"해당 개념의 pack 내 부재"** 로부터도 도출 가능 (e.g. scope 파일은 있지만 entity 가 그 scope 내 어떤 concept 과도 매칭되지 않음). 이 경우 Reviewer 는 단일 heading/excerpt 를 cite 하기 어려움 — optional 허용. §3.5 `mark_domain_pack_incomplete` 의 required 와 비대칭: incomplete 는 "scope 내부 positive 선언" 이 필수, scope_miss 는 "negative 관찰" 이 근거.

runtime apply (r2 R-11 명시, r4 UF-CONC-1 pointer): `rationale_state = "domain_scope_miss"`, `state_reason = directive.state_reason`, `inferred_meaning = null`, `justification = null`, `confidence = null`. Common provenance-3 populate 은 §3.1.1 canonical 참조. `domain_refs` 처리: directive 에 `new_domain_refs` field 가 **존재 (empty array 포함)** 하면 교체, **absent** (field 자체 생략) 이면 기존 유지.

### 3.5 `operation: mark_domain_pack_incomplete` — pack 결함 재판정

```yaml
- target_element_id: {id}
  operation: mark_domain_pack_incomplete
  state_reason: string                  # 1 sentence, English (required)
                                        # 예: "Entity clearly in scope but pack lacks concept definition"
  new_domain_refs:                      # required (≥ 1, Step 2 §3.5 r5 DIS-02 거울) — scope 일치 근거
    - manifest_ref: string
      heading: string
      excerpt: string
  reason: string                        # 1 sentence, English (required)
```

**semantic**: Reviewer 가 "pack 은 결함이지만 entity 는 scope 내부" 로 재판정. `inferred_meaning / justification / confidence` 는 `null 로 clear` (rationale 불가 판정). `domain_refs` 는 scope 확인 근거로 **required** (Step 2 §3.5 r5 와 동일 mirror).

runtime apply (r4 UF-CONC-1 pointer): `rationale_state = "domain_pack_incomplete"`, `state_reason = directive.state_reason`, `domain_refs = new_domain_refs`, `inferred_meaning = null`, `justification = null`, `confidence = null`. Common provenance-3 populate 은 §3.1.1 canonical 참조.

### 3.6 `operation: populate_stage2_rationale` — Stage 2 신규 entity 의 rationale populate

```yaml
- target_element_id: {id}                # 반드시 wip.yml.elements[] 에 존재, intent_inference 가 empty 상태
  operation: populate_stage2_rationale
  new_inferred_meaning: string          # 1~2 sentences, English (required)
  new_justification: string             # 1~3 sentences, English (required)
  new_domain_refs:                      # 0 개 이상 허용 (§3.8.1 D2 로 empty 시 low downgrade)
    - manifest_ref: string
      heading: string
      excerpt: string
  new_confidence: enum                  # low | medium | high
  reason: string                        # 1 sentence, English (required)
                                        # 예: "Stage 2 Explorer added RefreshTokenSession entity; rationale inferred from concepts.md Session heading"
```

**semantic**: Stage 2 Explorer 가 Stage 2 round 에서 발견한 **신규 entity** — Hook α 가 spawn 된 시점 (Stage 1 → 2 transition) 에는 존재하지 않았던 entity. 따라서 `intent_inference` 가 empty 상태로 wip.yml 에 존재. Reviewer 가 이 entity 의 초기 rationale 을 populate.

**Explorer 경계 (Step 1 §7.3 r3 B3 + handoff §5)**:

```
Runtime validation (결정적, r4 §3.1.2 pointer):
  - target_element_id 는 wip.yml.elements[] 에 **이미 존재** 해야 함
  - target_element_id 의 intent_inference 가 **empty** 여야 함 — empty/non-empty 정의는 §3.1.2 canonical. Canonical Stage 2 Explorer shape (`{rationale_state: "empty"}`) 포함
  - 위 조건 중 하나라도 위반 → reject (hallucinated id or duplicate rationale)
  - Reviewer 는 **entity 생성 불가** — Stage 2 Explorer 가 elements[] 에 이미 넣은 entity 에 한정
  - 신규 entity 발견은 Explorer 의 책임 (Stage 2 round 에서 수행됨)
```

이로써 Reviewer 가 "entity 생성자" territory 로 silently 재편입되는 경로를 차단 (Step 1 §7.3 r3 B3 조치).

runtime apply (r2 C-5 + R-9 해소): `inferred_meaning = new_inferred_meaning`, `justification = new_justification`, `domain_refs = new_domain_refs`, `confidence = new_confidence (post-validation)`, `rationale_state = "reviewed"` (populate_stage2_rationale 는 reviewed terminal state 로 바로 전이 — proposed 를 거치지 않음. `reviewed` 의 semantic 축: "Reviewer 가 actively modify/populate 한 상태"), `state_reason = null`.

**Provenance semantic 결정 (r2 C-5 option A)**: `populate_stage2_rationale` 로 생성된 intent_inference 는 **생성자 (proposer) 가 Hook γ Reviewer** 이다. Hook α 가 관여하지 않은 entity 이므로 Hook α 의 provenance convention 을 그대로 쓰면 의미 혼선:

- `provenance.proposed_at = reviewed_at` (동일 timestamp — 생성과 검증이 한 시점)
- `provenance.proposed_by = "rationale-reviewer"` (Hook α 의 "rationale-proposer" 와 구별 — downstream 이 "Hook α 생성 vs Hook γ 생성" 을 이 field 로 판별)
- `provenance.proposer_contract_version = reviewer_contract_version` (단일 contract 내 generation+review 가 일관. Hook α 의 `proposer_contract_version` 과 이름 같지만 본 element 의 source contract 는 Step 3)
- `provenance.reviewed_at / reviewed_by / reviewer_contract_version` — §3.1.1 common rule 로 populate (r4 UF-CONC-1 pointer)

§6.3 의 interpretation rule: Step 4 scope consumer 는 `proposed_by == "rationale-reviewer"` 인 element 를 "Stage 2 add-path" 로 식별 가능.

**Gate count field (r4 IA-r3-4 — §3.7.2 canonical pointer)**: `provenance.gate_count` populate rule 은 §3.7.2 canonical. 본 §3.6 은 populate_stage2_rationale 경로가 `gate_count = 1` (single-gate) 로 초기 세팅됨만 명시. 기타 operation 의 gate_count 처리 (Hook α 1 → Hook γ revise/confirm 시 2 로 increment) 는 §3.7.2 참조.

### 3.7 Top-level directive `provenance` (r3 IA-SYN-3 rename — element-level vs directive-level scope 분리)

```yaml
provenance:
  reviewed_at: string                   # ISO 8601 UTC — directive emit 시점 (runtime apply 시점 아님, r2 C-3)
  reviewed_by: "rationale-reviewer"     # agent role id
  reviewer_contract_version: "1.0"      # (r2 R-13) 본 Step 3 protocol 본문+input schema+output schema 의 version axis. bump = contract semantic 변경
  manifest_schema_version: string       # (r2 R-13) input manifest file 의 schema version axis. bump = manifest file 구조 변경
  domain_manifest_version: string       # (r2 R-13) input manifest 의 content version axis. bump = pack 내용 개정
  domain_manifest_hash: string          # input manifest 의 version_hash
  domain_quality_tier: enum             # full | partial | minimal (input manifest 기준)
  session_id: string
  runtime_version: string               # reconstruct runtime version — nullable 허용 (r2 R-15: 미결정 시 null, audit-only field)
  wip_snapshot_hash: string             # (r2 C-3) 주입된 wip.yml content 의 SHA-256, canonical YAML serialization 기준
  domain_files_content_hash: string     # (r3 IA-SYN-4) injected domain_files_content 전체의 SHA-256 (canonical serialize, §3.7.1 mirror). pack content drift 감지
  hash_algorithm: string                # (r3 IA-SYN-4 library pinning) 예: "js-yaml@4.1.0 + sha256" — rehash reproducibility
  input_chunks: integer                 # default 1 (single-shot). v1.1 에서 chunking 도입 시 N>1
  truncated_fields: array               # default [] (no truncation). SESSION-level truncation. (r2 C-9: per-update __truncation_hint 제거, v1.1 이연)
  effective_injected_files: array       # Step 2 §3.6 와 동형 — 실제 prompt 에 주입된 manifest.referenced_files subset
```

본 §3.7 의 provenance block 은 **directive top-level** scope 전용. element-level `intent_inference.provenance` schema 는 §3.7.2 에서 별도 선언 (r3 IA-SYN-3 canonical 분리).

### 3.7.1 `wip_snapshot_hash` canonical serialization rule (r2 C-3)

pragmatics Y-4 + coverage F-COV-2 수렴 — snapshot hash 의 computation 이 결정적이지 않으면 §3.8 rule 10 의 race detection 이 false-positive 발생. 다음을 canonical 로 확정:

1. **Computation source**: Reviewer 에 주입되는 `wip_snapshot` YAML string (§2.1 항목 2 의 serialized form). wip.yml file content 의 raw bytes 가 아니라 runtime 이 직렬화한 결과 — Reviewer 입력과 1:1 대응.
2. **Serialization rule**: YAML 1.2 + sorted keys + LF line ending + UTF-8 encoding. nested mapping 도 재귀적으로 key sort. array 는 순서 유지 (list semantic 보존).
3. **Hash algorithm**: SHA-256 hex lowercase.
4. **Computation timing (r3 IA-SYN-4 확정)**:
   - **Step 2 dispatch (2c-spawn)**: runtime 이 wip.yml 을 read → canonical serialize → SHA-256 → `wip_snapshot_hash` 계산. **serialized YAML string 을 `.onto/builds/{session}/wip-2c-snapshot.yml` 에 persist** (file-based snapshot, in-memory 한정 아님). Reviewer 에 직렬화된 YAML + hash 두 가지를 주입.
   - **Step 4b apply 재검증**: runtime 이 persistent snapshot file `.onto/builds/{session}/wip-2c-snapshot.yml` 을 **file 에서 re-read + canonical serialize + SHA-256 rehash** → `directive.provenance.wip_snapshot_hash` 와 bit-exact 비교. file-based rehash 로 in-memory tautology (`D1-r2-residual`) 차단. 2a/2b directive 가 아직 apply 되지 않은 상태 snapshot 기준이므로 **wip.yml 의 실제 파일 상태와 비교하지 않음**.
5. **Parallel 2a/2b/2c 간섭**: Step 2 dispatch 시점에 wip.yml 은 **read-only snapshot**. 2a/2b directive 도 이 시점 wip 을 기준으로 emit. 2c 의 wip_snapshot_hash 는 이 snapshot 의 hash. Step 4a Synthesize aggregation 에서 3 directive 가 동일 snapshot base 를 공유하므로 aggregation 시점의 **element-level conflict** 는 §3.8 rule 1+2 로 reject (동일 target_element_id 에 revise + mark_* 가 동시 emit 되어도 operation 레벨에서 감지 가능).
6. **hash mismatch 의미**: Step 4b 재검증 시 hash 불일치 = 2c-spawn snapshot file 이 변경되었거나 (concurrent 세션 / crash recovery 외부 개입) rehash library drift (hash_algorithm pinning 불일치). runtime bug or invariant 위반 신호 → full failure (§7.1).
7. **Library pinning (r3 IA-SYN-4 evolution E-14)**: `provenance.hash_algorithm` field 에 직렬화 library + version + hash algorithm 을 기록 (예: `"js-yaml@4.1.0 + sha256"`). Step 4b 재검증 시 runtime 이 동일 library+version 사용. 불일치 시 warning log + rehash 이후에도 mismatch 면 full failure.
8. **`domain_files_content_hash` (r3 IA-SYN-4 신규, r4 IA-r3-6 Step 4b source 명시)**: injected `domain_files_content` 전체를 canonical YAML (파일 array 순서 유지, `{path, content}` tuple 직렬화) + SHA-256 로 hash.
   - **Computation timing (wip_snapshot_hash 와 mirror pattern)**:
     - **Step 2 dispatch (2c-spawn)**: runtime 이 manifest.referenced_files 의 content 전수 read → canonical serialize → SHA-256 → `domain_files_content_hash` 계산. **serialized YAML string 을 `.onto/builds/{session}/domain-files-2c-snapshot.yml` 에 persist** (file-based, wip-2c-snapshot.yml 과 mirror).
     - **Step 4b apply 재검증**: runtime 이 persistent snapshot file `.onto/builds/{session}/domain-files-2c-snapshot.yml` 을 **file 에서 re-read + canonical serialize + SHA-256 rehash** → `directive.provenance.domain_files_content_hash` 와 bit-exact 비교. §3.8 rule 12 reject 경로.
   - **Drift coverage**: `domain_manifest_hash` 는 manifest.yaml 자체만 hash — referenced_files 내용 변경 미탐지. 본 field 가 pack content drift 를 별도 cover. dual drift detection (wip + pack) 완결.

### 3.7.2 Element-level `intent_inference.provenance` schema (r3 IA-SYN-3 canonical 신설)

본 §3.7.2 는 **wip.yml.elements[].intent_inference.provenance** field 의 canonical schema. §3.7 top-level directive provenance 와 구별 — 서로 다른 artifact scope.

```yaml
# wip.yml element 내부:
intent_inference:
  ...
  provenance:
    proposed_at: string                 # ISO 8601 UTC — 최초 rationale generation 시점
    proposed_by: enum                   # "rationale-proposer" (Hook α 생성) | "rationale-reviewer" (Hook γ populate_stage2_rationale 생성, r2 C-5 option A)
    proposer_contract_version: string   # 생성 seat 의 contract version (Hook α = proposer_contract_version, Hook γ populate = reviewer_contract_version, 동일 field name 이지만 value 가 생성자에 귀속)
    reviewed_at: string | null          # ISO 8601 UTC — Reviewer explicit operation emit 시점 (r2 α). directive 에 없던 element 는 null 유지 (UNREVIEWED)
    reviewed_by: string | null          # "rationale-reviewer" | null
    reviewer_contract_version: string | null # 본 Step 3 protocol version | null
    gate_count: integer                 # (r2 Q-S3-22 + CC-1 β, r4 IA-r3-4 canonical) 1 (single-gate — populate_stage2_rationale 또는 Hook α 생성 후 Hook γ 미검증 element) | 2 (two-gate — Hook α 생성 + Hook γ explicit revise/confirm). **Canonical 단일 rule**: 기본 write 는 Hook α 가 1 (proposed_at populate 시점), Hook γ 가 explicit operation emit 시 increment 또는 populate_stage2_rationale 시 1 로 세팅. legacy field 미존재 element (pre-r3 protocol) 는 consumer 가 **1 로 간주** (audit-only 기본값) — proposed_by 추론 경로 폐지 (r4 IA-r3-4). Step 4 는 read 만, legacy default migration 이연 없음
    principal_provided_rationale: object | null  # Hook δ (Step 4 scope) 가 populate
    principal_note: string | null       # Hook δ
    principal_judged_at: string | null  # Hook δ
    state_reason: string | null         # gap / domain_scope_miss / domain_pack_incomplete 시 1 문장 (r2 C-11 state_reason 위치)
```

**Scope 경계**:
- Hook γ (본 Step 3) 가 populate / update: `reviewed_at / reviewed_by / reviewer_contract_version` (explicit operation), `gate_count` (operation 별 증분/세팅), `proposed_*` (populate_stage2_rationale 경로에서만)
- Hook α (Step 2) 가 populate: `proposed_*`, 초기 `gate_count = 1`
- Hook δ (Step 4) 가 populate: `principal_*`
- runtime 이 이 scope 경계를 enforce — 위반 시 sole-writer invariant 위반

**`reviewed_at == null` triple-read rule**: §7.2 Phase 3 consumer read contract 참조 — `(reviewed_at, meta.rationale_review_degraded, rationale_state)` 3-tuple 이 element 의 semantic interpretation 최소 충분 set.

<!-- mirror-of: step-2-protocol §3.7 (r5 IA-r4-6) -->
### 3.8 Runtime validation — reject 조건

Runtime 은 directive apply 전 다음을 결정적으로 검증. **위반 시 entire directive reject** (atomic — partial application 금지, full failure §7.1 경로로 흐름):

1. 동일 `target_element_id` 2 회 이상 → reject
2. `target_element_id` 가 `wip.yml.elements[].id` 에 없음 → reject (hallucinated id)
3. `operation` enum 외 값 → reject
4. operation 별 field 요구사항 (§3.2~§3.6) 위반 → reject (예: revise 에 new_inferred_meaning 부재, mark_domain_pack_incomplete 에 new_domain_refs 부재)
5. confirm operation 에 inferred_meaning/justification/domain_refs/confidence/state_reason field 존재 → reject
6. `new_domain_refs[].manifest_ref` 가 `manifest.referenced_files[].path` 에 없음 → reject (hallucinated filename)
7. `new_domain_refs[].manifest_ref` 가 manifest.referenced_files 에는 있지만 해당 entry 가 `domain_files_content` 에 주입되지 않음 (degraded pack 의 미주입 optional file 인용 방지) → reject
8. `populate_stage2_rationale` 의 target_element_id 의 기존 intent_inference 가 **non-empty** → reject. empty/non-empty 정의는 **§3.1.2 canonical pointer** (r4 UF-LOGIC-1 — 중복 서술 제거)
9. `provenance.manifest_schema_version / domain_manifest_hash` 가 input 과 불일치 → reject
10. `provenance.wip_snapshot_hash` 가 input wip.yml 의 SHA-256 과 불일치 → reject (race condition 감지: Reviewer 가 spawn 된 후 wip.yml 이 변경되었는지 확인 — Step 2 Hook α 와 달리 parallel dispatch 구조이므로 snapshot 진실성 필요. §3.7.1 canonical serialization rule)
11. **(r2 R-8 + E-4, r4 §3.1.2 pointer)** `operation ∈ {revise, mark_domain_scope_miss, mark_domain_pack_incomplete}` 이면서 target_element_id 의 기존 intent_inference 가 **empty** (§3.1.2 canonical 정의) → reject. 해당 element 는 `populate_stage2_rationale` operation 을 써야 함 — empty state 에 generation 아닌 operation 을 적용하는 것은 contract 위반
12. **(r3 IA-SYN-4)** `provenance.domain_files_content_hash` 가 Step 4b 재검증 시 runtime 의 rehash (주입된 `domain_files_content` 을 동일 canonical serialize + SHA-256) 와 불일치 → reject (pack content drift 감지 — 2c-spawn 과 Step 4b 사이 manifest.referenced_files content 가 외부 프로세스에 의해 변경됨)

**Note (Step 2 와 다름)**: `updates.length == elements.length` rule 은 **없음**. variable length 허용. 이것이 selective partial output 의 core.

<!-- mirror-of: step-2-protocol §3.7.1 (r5 IA-r4-6) -->
### 3.8.1 Downgrade-only rules (reject 아님, Step 2 §3.7.1 거울)

다음은 runtime 이 apply 하되 warning log 를 남기는 downgrade 경로 — **reject list 와 분리**. revise + populate_stage2_rationale operation 의 confidence 값에 적용:

- **D1**: `new_confidence == high` 인데 `new_domain_refs.length < 2` → `medium` 으로 downgrade + warning
- **D2**: `new_domain_refs.length == 0` → `low` 로 강제 + warning
- **D3**: `new_confidence == medium` 인데 `new_domain_refs` 전체가 manifest 의 optional file 에서만 유래 → `low` 로 downgrade + warning

downgraded value 가 wip.yml 에 저장됨 (agent 원 출력은 session-log.yml 보존). runtime validator 가 적용 후 apply.

confirm + mark_domain_scope_miss + mark_domain_pack_incomplete operation 은 new_confidence field 없음 → downgrade 규칙 적용 대상 아님.

## 4. Prompt 실문자열 (English-only)

Team lead (Runtime Coordinator) 가 Axiology Adjudicator / Rationale Proposer 와 동형 패턴으로 spawn. 다음 prompt template 을 fill in:

```
You are the Rationale Reviewer.

<!-- mirror-of: step-2-protocol §4 prompt structure (r5 IA-r4-6) -->
[Role]
You verify, revise, and fill gaps in rationales for entities captured in the
wip.yml ontology after Stage 1 and Stage 2 exploration. Your perspective is
domain-grounded rationale quality control: given entities already enriched
with initial rationales by the Rationale Proposer, detect rationale errors,
strengthen weak inferences, and populate rationales for Stage 2 entities
that the Proposer could not see.

You are NOT a generator of new entities. Stage 2 Explorer is responsible for
discovering and adding entities to wip.yml.elements[]. Your scope is limited
to editing `intent_inference` fields of entities that already exist in
wip.yml.

You do NOT produce lens labels, resolve conflicts, or decide semantic
identities. Those are the responsibility of lenses, the Axiology Adjudicator,
and the Semantics lens (Step 2a), respectively.

You do NOT mutate wip.yml. Your output is a directive; the Runtime Coordinator
is the sole writer of wip.yml via the Synthesize aggregation path
(Step 4a → Step 4b).

[Input]
You receive a single input package containing:

1. system_purpose — a 1~2 sentence statement of the target product's purpose
2. wip_snapshot — the full wip.yml after Stage 1+2 exploration, including:
   - elements[] with intent_inference already populated by the Rationale
     Proposer (at the Stage 1 → 2 transition) for entities that existed at
     that point
   - elements[] added by Stage 2 Explorer with intent_inference EMPTY
   - relations[], ubiquitous_language, meta (read-only context)
3. domain_manifest — manifest.yaml of the domain pack selected for this session
4. domain_files_content — the full content of each file listed in
   manifest.referenced_files, in manifest order
5. provenance_inputs — pre-computed values the runtime relays for you to
   copy into directive.provenance without modification:
   - session_id: string
   - runtime_version: string | null
   - wip_snapshot_hash: string (SHA-256 of canonical-serialized wip_snapshot)
   - domain_files_content_hash: string (SHA-256 of canonical-serialized
     domain_files_content in manifest order)
   - hash_algorithm: string (library+version identifier, e.g.
     "js-yaml@4.1.0 + sha256")
   You MUST NOT recompute these; treat them as opaque strings to relay.

Excluded from input:
- Source code / document content of the product itself (only source.locations,
  not the content)
- context_brief.architecture, context_brief.legacy_context
- wip.yml author/lens identities (elements[].labeled_by is omitted —
  anonymization is preserved)
- wip.yml issues (conflict resolution is not your responsibility)

[Procedure]
You review each element in wip_snapshot.elements[] and decide whether to emit
an update. You do NOT need to emit one update per element. Emit updates only
for elements that require one of the following operations:

A. operation = "confirm"
   If the existing intent_inference is verified as correct and needs no
   change, AND you want to record an explicit audit signal that you
   verified this element:
   - reason: 1 sentence describing what you verified (recommended)
   No other fields — the existing intent_inference is kept intact; the
   Runtime Coordinator populates provenance.reviewed_at / reviewed_by /
   reviewer_contract_version on apply as EVIDENCE that you reviewed this
   element.

   NOTE (r2 α — important semantic): You MAY omit an update entirely for
   elements you did not review. Elements absent from your updates[] are
   treated as "UNREVIEWED" — the Runtime Coordinator keeps the existing
   intent_inference and provenance UNCHANGED. `provenance.reviewed_at` will
   remain null for these elements, which downstream consumers interpret as
   "Reviewer did not inspect this element in this session". The Runtime
   does NOT populate reviewed_at for elements you did not emit an operation
   for — evidence-generating claims come only from your directive, not
   from Runtime dispatch state.

   If you reviewed an element and concluded it is correct as-is, emit
   `operation: confirm` to record that audit evidence. If you did not
   actually review an element (skipped due to relevance or truncation),
   omit it — do not emit a confirm you did not perform.

B. operation = "revise"
   If the existing intent_inference has an incorrect meaning, weak
   justification, misaligned domain_refs, or over-claimed confidence:
   - new_inferred_meaning: 1~2 sentences (required)
   - new_justification: 1~3 sentences (required)
   - new_domain_refs: 0 or more (empty is legal but triggers automatic
     downgrade to confidence=low per §3.8.1 D2)
   - new_confidence: self-reported high/medium/low (§3.8.1 downgrade may
     apply)
   - reason: 1 sentence explaining why you revised (required)
   rationale_state transitions to "reviewed".

C. operation = "mark_domain_scope_miss"
   If the entity represents a concern outside the domain stated by the
   scope-declaring file of the pack (typically domain_scope.md):
   - state_reason: 1 sentence (required)
   - new_domain_refs: optional — cite the scope-declaring file if it
     directly establishes the miss
   - reason: 1 sentence (required)
   rationale_state transitions to "domain_scope_miss"; existing
   inferred_meaning / justification / confidence are cleared to null.

D. operation = "mark_domain_pack_incomplete"
   If the entity is clearly within domain scope but the pack lacks the
   concept needed for a rationale:
   - state_reason: 1 sentence (required)
   - new_domain_refs: REQUIRED (≥1). Cite the scope-declaring file and
     heading that establishes the entity IS within scope. If you cannot
     cite specific scope evidence, do not use this operation — omit the
     update entirely (element will remain UNREVIEWED, `reviewed_at == null`)
     or use "revise" with a more careful justification.
   - reason: 1 sentence (required)
   rationale_state transitions to "domain_pack_incomplete"; existing
   inferred_meaning / justification / confidence are cleared to null.

E. operation = "populate_stage2_rationale"
   If the element has EMPTY intent_inference (rationale_state == "empty"
   or the field is absent) — meaning it was added by Stage 2 Explorer after
   the Rationale Proposer ran — populate an initial rationale:
   - new_inferred_meaning: 1~2 sentences (required)
   - new_justification: 1~3 sentences (required)
   - new_domain_refs: 0 or more (same downgrade rules as "revise")
   - new_confidence: self-reported high/medium/low
   - reason: 1 sentence explaining what you filled and why (required)
   The target_element_id MUST already exist in wip.yml.elements[]. You
   CANNOT create new entities; your scope is rationale population only.
   rationale_state transitions to "reviewed" (not "proposed" — this is
   both creation and review in one step).

[Selective output]
Your updates[] array has VARIABLE length. It is normal — and expected —
for many elements to receive no explicit update. Elements you did not
review will have provenance.reviewed_at == null after apply, which is
the correct signal that you did not inspect them. Do NOT force an update
per element. Do NOT fabricate confirm entries you did not actually verify —
that would inject false evidence into the audit trail.

[Citation constraint]
Every new_domain_refs entry MUST cite a file that is BOTH listed in
domain_manifest.referenced_files AND actually present in
domain_files_content. Do not cite files missing from the injected content
even if the manifest mentions them as optional — the runtime will reject
such citations.

[Populate-stage2 boundary]
The "populate_stage2_rationale" operation is strictly limited to elements that:
1. Already exist in wip.yml.elements[] (not hallucinated by you)
2. Have empty intent_inference (not yet populated by the Proposer) — see
   §3.1.2 for the canonical empty/non-empty partition definition
You MUST NOT use this operation to create new entities — entity creation
is the Explorer's responsibility during Stage 2 rounds. The runtime
enforces both conditions; violations cause full directive rejection.

[Provenance]
Populate the top-level directive provenance block. Self-generated fields:
- reviewed_at: current ISO 8601 UTC timestamp
- reviewed_by: "rationale-reviewer"
- reviewer_contract_version: "1.0"

Copy-from-input fields (from input package item 5, `provenance_inputs`):
- session_id, runtime_version, wip_snapshot_hash,
  domain_files_content_hash, hash_algorithm

Do NOT recompute hashes or modify copy-from-input values; the runtime
pre-computes and will reject any mutation.
- manifest_schema_version, domain_manifest_version, domain_manifest_hash,
  domain_quality_tier: copy from input domain_manifest
- session_id, runtime_version: copy from input package
- wip_snapshot_hash: copy from input package (the runtime computes this
  before spawn; you relay the value)

[Output Format]
The canonical output schema is Step 3 contract §3. This prompt restates
procedure and rules; the schema itself (field names, validation rules,
reject conditions) is authoritative at §3. If prompt and schema conflict,
§3 wins.

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

[Rules]
- Domain pack is the primary source of rationale correctness. Do not invent
  rationales not grounded in pack content.
- Source code and document content are NOT in your input. Do not claim to
  have read source; use domain_refs only.
- Emit "confirm" only for elements you actually verified. Do NOT emit
  confirm entries to reach one-per-element parity — fabricated confirm is
  false evidence. Elements you did not review should be omitted entirely
  (`provenance.reviewed_at == null` is the correct unreviewed signal).
- Use "revise" when the existing inferred_meaning or justification is
  factually off or semantically weaker than what the pack supports.
- Use "mark_domain_scope_miss" only when the scope-declaring file directly
  establishes that the entity is outside scope.
- Use "mark_domain_pack_incomplete" only when scope is clearly affirmed
  AND the pack lacks the needed concept.
- confidence is self-reported but the runtime validator will downgrade
  over-claimed high/medium values per §3.8.1. Be conservative — low is
  acceptable.
- justification text may be consumed by the Principal later as evidence —
  write it as evidence, not as persuasion.
- Do not use metaphors or analogies.
```

### 4.1 Prompt 크기 추정 + single-shot 선택의 근거 (Step 2 §4.1 거울)

- template + input package (system_purpose + wip_snapshot + manifest + domain_files_content) = 전형적 20~200 KB (wip.yml 이 Step 2 의 entity_list 보다 크므로 Step 2 보다 평균 1.5~2배)
- 100+ entity 세션에서 token budget 주의 (구현 세션에서 chunking 필요 여부 재평가 — 본 v1 scope 에서는 batch 1 회 가정)

**trade-off 기록 — single-shot full-wip vs incremental review**:

- **v1 채택: single-shot full-wip** — 이유:
  - coordinator simplicity (chunking logic 불필요, 1 agent invocation)
  - cross-element consistency 판정 가능 (동일 domain 개념을 다른 entity 가 다르게 해석한 경우 Reviewer 가 전수 비교 가능)
  - prompt cache 효율 (wip_snapshot_hash 를 cache key 로 사용 가능 — 동일 snapshot 재실행 시)
- **trade-off 기록**: entity 수 × (pack 크기 + wip.yml 크기) 가 token budget 을 초과할 가능성 존재. 본 contract 는 이를 **`provenance.input_chunks` + `provenance.truncated_fields`** 로 audit 가능하게 기록 (v1 default: `input_chunks=1, truncated_fields=[]`)
- **v1.1 backlog**: incremental review — entity batch 별 chunked review. cross-batch consistency check 로직 필요. 본 v1 scope 밖

### 4.2 Prompt 변경 시 version bump + migration rule (r2 R-14)

`reviewer_contract_version` 은 본 prompt 본문 + input schema + output schema 의 semantic 단위. 본문이 바뀔 때마다 version bump 필요 (v1.0 → v1.1 → …). provenance 에 기록되어 후속 재해석 시 contract drift 감사 가능.

**Migration rule (evolution E-1 해소)**:

- **Minor bump (v1.0 → v1.1)**: additive 변경 — 기존 directive schema 와 forward-compatible. 기존 `rationale_state: reviewed` element 는 재검증 불필요. consumer 는 새 field 를 optional 로 처리.
- **Major bump (v1.x → v2.0)**: breaking change — 기존 `rationale_state: reviewed` element 의 검증 타당성 재평가 필요. **본 Step 3 protocol 의 scope 는 "version bump trigger 규정" 만**; 기존 reviewed element 의 "자동 재검증 vs Principal 재판정 queue 추가" 결정은 **Step 4 scope** (Phase 3.5 write-back + raw.yml meta 확장 범위 내 후속 결정). v1.1 backlog 로 명시 이연.

이 분리의 이유: re-review decision 은 Phase 3 surface 설계와 얽혀 있으므로 Step 4 의 전수 통합 시점에서 결정하는 것이 의미적으로 정합.

## 5. Role 파일 본문

`.onto/roles/rationale-reviewer.md` 신규 생성. Step 2 의 `.onto/roles/rationale-proposer.md` 패턴 거울 참조 — **lens 가 아닌 fresh-agent role** 임을 명시.

<!-- mirror-of: step-2-protocol §5 role file body (r5 IA-r4-6) -->
### 5.1 전문 (English — role 파일은 agent 가 참조하는 canonical spec)

```markdown
# rationale-reviewer

## Perspective

This role is NOT a review lens. It is a fresh-agent role invoked once per
reconstruct session at Phase 2 Step 2c, in parallel with the Semantics lens
(Step 2a) and the Coverage lens (Step 2b). Its perspective is **rationale
quality control over the Stage 1+2 wip.yml**: verify, revise, and fill gaps
in `intent_inference` fields using the domain pack as the primary authority.

The role does not participate in the Phase 1 exploration loop, does not
produce lens labels or exploration directions, does not create new entities,
and does not mutate wip.yml. It emits a directive consumed by the Synthesize
aggregation step (Step 4a), which in turn is applied atomically by the
Runtime Coordinator (Step 4b).

### Observation focus

- Rationale quality: is the existing inferred_meaning factually correct?
- Justification strength: does the justification cite domain evidence or
  rely on vague structural inference?
- Domain ref validity: do cited heading+excerpt pairs actually support the
  claim?
- Confidence calibration: is the self-reported confidence proportional to
  evidence?
- Stage 2 coverage: are there entities added after the Proposer ran that
  still have empty intent_inference?

### Assertion type

Per-element operation with one of five kinds:
- `confirm` — existing intent_inference verified, no change. `rationale_state`
  is **not** transitioned (stays at `proposed` or whatever it was); only
  `provenance.reviewed_at/by/version` are populated to record that evidence
  of review exists.
- `revise` — replace inferred_meaning / justification / domain_refs /
  confidence with a stronger alternative. `rationale_state` transitions
  to `reviewed`.
- `mark_domain_scope_miss` — re-classify as outside declared scope.
- `mark_domain_pack_incomplete` — re-classify as scope-affirmed but
  pack-incomplete.
- `populate_stage2_rationale` — populate initial rationale for a Stage 2-added
  entity whose intent_inference is empty. `rationale_state` transitions
  directly to `reviewed`, but `provenance.gate_count = 1` (single-gate)
  distinguishes this single-pass path from the standard two-gate
  (Proposer + Reviewer) flow where `gate_count = 2` (r3 CC-SYN-2 + axiology
  A-1 — semantic axis: `reviewed` means "Reviewer actively modified or
  populated", not a procedural step order; the gate_count field preserves
  the quality-asymmetry audit signal without enum expansion).

Updates are SELECTIVE — elements absent from the directive are treated as
UNREVIEWED (provenance.reviewed_at remains null; intent_inference unchanged).
The role does NOT enforce one-update-per-element parity; do NOT fabricate
confirm entries you did not actually verify — that injects false evidence
into the audit trail (r3 α enforcement).

## Core questions

- Does the existing rationale align with what the domain pack actually
  states, or has the Proposer over-extrapolated?
- Is the cited domain heading + excerpt the strongest available evidence,
  or is there a better citation in the pack that the Proposer missed?
- For entities without rationale (Stage 2 additions), does the pack support
  an initial meaning inference?
- Are there rationales that should be re-classified as scope_miss or
  pack_incomplete given evidence the Proposer did not have?

## Procedure

Refer to Step 3 contract §4 (Prompt) and §3 (Output Schema). The role is
invoked by the Runtime Coordinator with a single input package containing
the full wip.yml and produces a single directive as output.

## Output schema

**Single authority**: Step 3 contract §3 is the canonical schema. This role
file restates high-level intent only; field names, validation rules, and
reject conditions are authoritative at §3. In case of conflict, §3 wins.

The role does not emit wip.yml patches directly.

## Boundary routing

### rationale-reviewer ↔ Rationale Proposer (Step 2, Hook α)

Proposer generates initial rationales at Stage 1 → 2 transition. Reviewer
verifies / revises / fills gaps at Phase 2 Step 2c. Reviewer does NOT
re-run the Proposer — if a revise is needed, it is applied in-place on the
existing intent_inference. The Proposer's output is the Reviewer's input.

### rationale-reviewer ↔ Explorer

Explorer emits fact deltas during Phase 1 rounds (Stage 1 + Stage 2).
Reviewer does NOT re-traverse source code. For Stage 2 entities that
Explorer added after the Proposer ran, the Reviewer may use
`populate_stage2_rationale` to populate initial rationale — but the entity
itself MUST already exist in wip.yml.elements[]; Reviewer cannot create
entities.

### rationale-reviewer ↔ Semantics lens (Step 2a) / Coverage lens (Step 2b)

All three run in parallel at Phase 2 Step 2. Their outputs are independent
directives aggregated by Synthesize at Step 4a. Reviewer does NOT consume
Semantics or Coverage outputs — their directives target different sinks
(ubiquitous_language, issues). Cross-lens consistency is the Synthesize
step's responsibility.

### rationale-reviewer ↔ Axiology Adjudicator (Phase 2 Step 3)

Adjudicator resolves label conflicts in parallel with the Step 2 queries.
Reviewer does NOT touch wip.yml issues — rationale quality and label
conflict are orthogonal concerns.

### rationale-reviewer ↔ Runtime Coordinator

Runtime Coordinator is the sole writer of wip.yml. Reviewer emits a
directive; Synthesize aggregates it with 2a/2b/3 outputs into a
finalization directive; Runtime validates and applies atomically.
Partial application is prohibited.

## Language

Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

## References

- Step 3 contract: `development-records/evolve/20260423-phase4-stage3-step3-rationale-reviewer-protocol.md`
- Step 2 contract (Proposer, mirror pattern): `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-protocol.md`
- Step 1 flow-review: `development-records/evolve/20260422-phase4-stage3-step1-reconstruct-v1-flow-review.md §7.3/§7.4/§7.5`
- reconstruct contract: `.onto/processes/reconstruct.md §Phase 2 Step 2 + §1.0 Team Composition`
- language policy: `.onto/principles/output-language-boundary.md`
```

### 5.2 파일 배치

- 경로: `.onto/roles/rationale-reviewer.md`
- git: Track B 구현 세션에서 commit (본 Step 3 는 contract 만 고정, 실제 file write 는 구현 책임)
- 본 §5.1 은 구현 세션의 **canonical reference** — 구현 시 이 본문을 복사하여 role 파일 생성

## 6. Runtime Integration — Phase 2 Step 2c 내부 배치

### 6.1 기존 Phase 2 Step 2 (reconstruct.md §Phase 2 Step 2 요약, r2 R-4 — heading reference)

```
Phase 2 Step 2: Focused lens queries (2a and 2b run in parallel, after Step 1 completes)
  - Team lead dispatches 2a (semantics lens) and 2b (coverage lens) as fresh-context agents
  - Each emits a directive (not a wip.yml patch)
  - Step 3 (Axiology Adjudicator) runs after Step 2 (sequentially, not parallel with 2a/2b)
  - Step 4a (Synthesize) aggregates 2a + 2b + 3 directives into a finalization directive
  - Step 4b (Runtime) applies finalization directive atomically to wip.yml
```

<!-- mirror-of: step-2-protocol §6.2 Stage Transition state machine (r5 IA-r4-6) -->
### 6.2 Step 3 추가 step (Hook γ 배치, state marker)

Step 2c 를 2a/2b 와 parallel 로 추가. Step 2 (Hook α) 의 `meta.stage_transition_state` 패턴 거울 참조 — `meta.step2c_review_state` 신규 field 로 Phase 2 Step 2c 진행 단계를 명시 tracking:

**`meta.step2c_review_state` enum** (7 values — Step 2 mirror with semantic differences):
- `pre_gamma` — Phase 2 Step 1 finalize 후, Step 2 dispatch 진입 전
- `gamma_skipped` — `inference_mode == none` 또는 `alpha_skipped/alpha_failed_continued_v0` 로 intent_inference 없는 상태 → Reviewer skip. Phase 2 계속 진행 가능 (2a/2b 만 dispatch)
- `gamma_in_progress` — Reviewer spawn 직전 ~ directive apply 직전
- `gamma_completed` — directive apply 완료 (Step 4b). Phase 3 진입 가능 (r2 logic F-2 정정 — 이전 "Phase 2 Step 3 진행 가능" 은 flow ordering 과 불일치: Step 3 Adjudicator 는 Step 2 수집 완료 후 **Step 4a 이전** 에 실행되고, gamma_completed 는 Step 4b 이후 도달하는 상태)
- `gamma_failed_retry_pending` — full failure 후 retry 대기 중 (Principal response 미수신)
- `gamma_failed_continued_degraded` — retry 실패 후 Principal 이 `[d] Continue with degraded` 선택. **proposed element 전수가 Phase 3 Principal 판정으로 escalate**. Phase 2 계속 진행 (Step 3 + Step 4b 에서 rationale_updates 만 empty). raw.yml 의 `rationale_review_degraded: true` 기록 (Step 4 scope)
- `gamma_failed_aborted` — retry 실패 후 Principal 이 `[a] Abort` 선택. **Phase 2 진행 차단**, wip.yml Stage 2 완료 상태 보존, `meta.stage` 는 2 로 유지. 재시작 시 Phase 2 Step 2 부터 re-enter 가능

**Bounded cycle invariant (r3 R-SYN-1 + C-SYN-10)**: state machine 에는 단 하나의 cycle (`gamma_in_progress ↔ gamma_failed_retry_pending`) 만 존재하며 `meta.step2c_review_retry_count ≤ 1` 로 bound — 1 회 소비 후 terminal 4 state (`gamma_completed / gamma_skipped / gamma_failed_continued_degraded / gamma_failed_aborted`) 중 하나로 흡수. 다른 cycle 없음. retry edge 의 arrow 는 §6.2 dispatch flow 의 "[r] Retry" branch 참조.

**Step 2 와의 abort semantic 차이 (§1.4 pointer, r3 IA-SYN-8 축약)**:

§1.4 table "abort semantic" 행이 canonical. 여기 재진술 없음.

resumption logic: runtime 재시작 시 `step2c_review_state` 를 read 하여 정확한 복귀점 판정:
- `pre_gamma` / `gamma_in_progress` / `gamma_failed_retry_pending` → Phase 2 Step 2 재진입 가능 (2a/2b/2c 재dispatch)
- `gamma_skipped` / `gamma_completed` / `gamma_failed_continued_degraded` → Phase 2 Step 3 바로 진입
- `gamma_failed_aborted` → Principal 이 재실행 결정 필요 (wip.yml 상태 유지, Phase 2 재시작 명시 필요)

**재조정된 flow** (Phase 2 Step 2 dispatch):

```
Phase 2 Step 1 (Runtime Coordinator deterministic) 종료 시점:
  - wip.yml 에 Step 1 integrity_fixes 계산 완료
  - meta.step2c_review_state = "pre_gamma" (신규 marker)
    meta.step2c_review_retry_count = 0 (one-shot retry 소비 persistence, Step 2 §6.2 r4 UF-PRAG-01 동형)
  
  === Phase 2 Step 2 parallel dispatch ===
  2a. Team lead spawns Semantics lens (기존)
  2b. Team lead spawns Coverage lens (기존)
  2c. Hook γ — Rationale Reviewer 전용 dispatch (Step 3 신규):
      2c-precondition 확인 (Reviewer skip 여부):
        - inference_mode == "none":
            meta.step2c_review_state = "gamma_skipped"
            → 2a/2b 만 진행, 2c 미실행
        - stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0}:
            meta.step2c_review_state = "gamma_skipped"
            → 2a/2b 만 진행, 2c 미실행 (intent_inference 없는 상태 review 무의미)
        - inference_mode ∈ {full, degraded} AND stage_transition_state == alpha_completed:
            → 2c dispatch 진행
      2c-spawn:
        meta.step2c_review_state = "gamma_in_progress" + fsync
        team lead 가 Rationale Reviewer spawn:
          - input package 구성 (§2.1)
          - Axiology Adjudicator / Proposer 와 동형 — fresh agent per invocation
          - prompt = §4 의 template + input package
          - wip_snapshot_hash 계산 + 주입
      2c-directive 수신:
        - schema validation (§3.8 reject 조건 1~12, §3.8.1 downgrade 조건 D1~D3) (r5 IA-r4-4 sync)
        - reject → §7.1 full failure (meta.step2c_review_state = "gamma_failed_retry_pending")
        - downgrade → warning log + directive 보관 (apply 는 Step 4b 에서)
  === Step 2 dispatch 종료 — 2a/2b/2c 병렬 수집 대기 ===
  
  Step 2 완료 gate:
    - 2a/2b/2c 모두 directive 수신 (또는 skip 결정) 시 Step 3 진행
    - 단 2c 가 gamma_failed_retry_pending 상태면 Principal response 수신까지 Step 3 대기
    - gamma_failed_continued_degraded 또는 gamma_skipped 시 2c directive empty 로 간주하여 Step 3 진행
  
  Step 3 (Axiology Adjudicator) 진행
  Step 4a (Synthesize 가 2a/2b/2c/3 directives 를 단일 finalization directive 로 통합)
    - rationale_updates 필드 신규 — 2c directive 의 updates[] 를 그대로 merge (Synthesize 는 semantic 변형 금지)
  Step 4b (Runtime 이 finalization directive atomic apply):
    - rationale_updates 의 각 update 를 §3.8 validation 재검증 (2c 수신 시점과 Step 4b 시점 사이 wip.yml 변경 감지 — wip_snapshot_hash 재검증, §3.7.1)
    - apply (per-operation detail 은 §3.2~§3.6 canonical, 본 block 은 r2 R-1/C-7 pointer):
        - operation = confirm → §3.2
        - operation = revise → §3.3
        - operation = mark_domain_scope_miss → §3.4
        - operation = mark_domain_pack_incomplete → §3.5
        - operation = populate_stage2_rationale → §3.6
    - directive 에 없는 element_id (r2 α — C-1 BLOCKING 해소): runtime 은 해당 element 의 intent_inference + provenance 를 변경하지 않음. provenance.reviewed_at 은 null 로 유지되어 downstream 이 "Reviewer 미판정" 으로 해석. evidence-generating claim 은 Reviewer directive 에만 근거 (llm-native §3 + productization-charter §5.1)
    - atomic write (temp file + rename 또는 equivalent)
    - meta.step2c_review_state = "gamma_completed"
    - meta.step2c_review_retry_count = 0 (r2 C-6 — gamma_completed 도달 시 reset)
  === Hook γ apply 종료 ===
  
  Phase 2 Step 4b 완료 후 Phase 3 진입
```

**retry_count reset rule (r2 C-6 해소, structure MAJOR #2 + dependency D-9 수렴)**:

- `gamma_completed` 도달 시 runtime 이 `meta.step2c_review_retry_count = 0` 으로 reset (atomic write)
- `gamma_skipped` 도달 시 동일하게 0 reset (Reviewer 미실행, retry 소비 자체 없음)
- `gamma_failed_continued_degraded` / `gamma_failed_aborted` 도달 시 reset 하지 않음 (다음 재진입 시 이전 retry 소비 이력 유지 — structural leak 방지)
- 세션 재시작 시 `pre_gamma` 로 직행하는 경로는 §6.2 초기화 구문에서 이미 0 세팅

이 rule 은 Step 2 §6.2 `stage_transition_retry_count` 의 reset convention 과 동형.

### 6.3 wip.yml 변경 (Step 3 범위)

**Per-operation apply rule authority (r2 R-1 + C-7)**: §3.2~§3.6 이 canonical. 본 §6.3 은 **어떤 field 를 어떤 operation 이 건드리는가** summary pointer 만.

| Operation | 변경 field | Canonical detail |
|---|---|---|
| `confirm` | provenance 3 field (reviewed_at / by / version) | §3.2 |
| `revise` | inferred_meaning, justification, domain_refs, confidence (post-validation), rationale_state→reviewed, state_reason→null, provenance 3 | §3.3 |
| `mark_domain_scope_miss` | rationale_state→domain_scope_miss, state_reason, (optional) domain_refs, inferred_meaning/justification/confidence→null, provenance 3 | §3.4 |
| `mark_domain_pack_incomplete` | rationale_state→domain_pack_incomplete, state_reason, domain_refs (required), inferred_meaning/justification/confidence→null, provenance 3 | §3.5 |
| `populate_stage2_rationale` | intent_inference 전체 신규 populate + proposed_at/by/version + reviewed 3 + gate_count=1 | §3.6 |
| _directive 부재 (r2 α)_ | 변경 없음 — intent_inference + provenance 전부 유지. reviewed_at 은 null 로 유지 | §1.4 + §3.1 |

**Gate count field population (§3.7.2 canonical pointer, r4 IA-r3-4)**:

§3.7.2 의 `gate_count` field comment 가 canonical single authority. 본 §6.3 은 아래 pointer summary 만 유지:

- write rule 전수 (1 초기 / 2 증분 / populate_stage2_rationale 시 1 / directive 부재 element 는 변경 없음 / legacy field 미존재 = 1 기본값) → §3.7.2 참조
- Step 4 read contract 는 §10.1 Step 4 read contract pair list 참조

Hook γ 가 건드리지 않는 element field (다른 hook 책임):
- `principal_provided_rationale` — Hook δ (Phase 3.5, Step 4)
- `principal_note` — Hook δ
- `provenance.principal_judged_at` — Hook δ

Hook γ 가 populate 하는 meta field (Step 3 신규):
- `meta.step2c_review_state` (enum, §6.2)
- `meta.step2c_review_retry_count` (integer, §6.2 — retry enforcement + reset rule §6.2 하단)
- `meta.rationale_reviewer_failures_streak` (integer, Step 1 §7.5 — degradation counter. Stage transition 에서 reset)

### 6.3.1 `meta.pack_missing_areas` refinement boundary (Step 2 §6.3.1 거울)

Step 2 §6.3.1 r3 UF-AXIOLOGY-01 해소: runtime (Hook α apply 후처리) 은 `pack_missing_areas` 를 **non-semantic grouping** 으로만 채운다 (동일 `manifest_ref + heading` 정확 매칭만). semantic grouping 은 **Step 3 Reviewer (LLM-owned seat) 로 이연** 명시.

본 Step 3 의 **v1 결정**: Reviewer 는 **`pack_missing_areas` refinement 를 수행하지 않는다** — Step 2 의 non-semantic grouping 결과를 그대로 유지. 이유:

- Reviewer 의 v1 scope 는 per-element operation (confirm/revise/mark_*/populate_stage2_rationale) 에 제한
- pack-level semantic aggregation 은 Reviewer directive schema 에 추가 field (`new_pack_missing_areas[]`) 필요 — v1 scope 를 확대
- Hook γ 의 주요 가치는 element-level quality control. pack-level signal 은 Phase 3 에서 Principal 이 보는 surface 이므로 v1 에서는 non-semantic grouping 수준으로 충분

**v1.1 backlog 로 이연**: Reviewer directive 에 `pack_missing_areas_refinement[]` field 추가. Reviewer 가 Step 2 의 non-semantic grouping 을 읽고 semantic 근접 그룹을 merge / split. Step 3 (본 문서) 에서는 field 추가 하지 않음.

이로써 Step 2 의 "semantic refinement 는 Reviewer 에 이연" statement 는 **v1.1 이연** 로 명시 확정.

### 6.4 Step 4a Synthesize aggregation — `rationale_updates` field 추가

기존 Phase 2 Step 4a (reconstruct.md:1307~1312) 의 finalization_directive 에 신규 field 추가:

```yaml
finalization_directive:
  integrity_fixes: [...]                # 기존
  ubiquitous_language_changes: [...]    # 기존 (2a)
  coverage_gap_annotations: [...]       # 기존 (2b)
  adjudicator_resolutions: [...]        # 기존 (3)
  unresolved_collation: [...]           # 기존
  rationale_updates: [...]              # Step 3 신규 — 2c directive 의 updates[] 를 그대로 merge
```

**Synthesize 의 rationale_updates 처리 rule (LLM/runtime boundary)**:
- Synthesize 는 2c directive 의 `updates[]` 를 **그대로 복사** 하여 finalization_directive.rationale_updates 에 넣는다
- Synthesize 는 semantic 변형 금지 (예: 두 revise 를 하나로 merge, confirm 을 revise 로 승격 등)
- Synthesize 는 **cross-2c-2a** consistency 도 검사하지 않음 (Reviewer 가 Semantics lens output 을 참조하지 않는다는 §5.1 boundary routing 과 동형)

**Step 4b apply 는 §6.2 에서 이미 기술** — 각 rationale_update 를 operation 별 runtime apply.

### 6.5 Post-Hook γ propagation semantics (r2 R — mis-scoping 해소)

r1 은 본 섹션을 "Hook β propagation (no-op)" 로 명명했으나 실제 본문이 Hook β no-op 설명 + Hook γ → Hook δ edge 설명을 섞어 제시 (dependency D-3 지적). r2 에서 두 내용을 paragraph 로 분리하고 섹션명을 범위 정확한 이름으로 교체.

**(a) Hook β propagation with respect to Hook γ (no-op)**:

Hook β (Explorer prompt gating) 는 Stage 2 round 중 소비. Hook γ 가 Phase 2 Step 2c 에서 실행되므로 **Stage 2 round 는 이미 종료 상태**. 즉 Hook γ apply 후 Hook β 재실행 없음 — Phase 2 → Phase 3 flow 직진. Step 2 §6.4 의 Hook β propagation rule 은 Hook γ apply 시점에는 **적용 대상 없음**.

**(b) Hook γ → Hook δ edge (Phase 3 rendering scope)**:

Reviewer 가 revise 로 `confidence` 를 변경하거나 rationale_state 를 reviewed 로 전이시켜도, 그 결과는 **Phase 3 rendering 시점에 Hook δ 가 소비** — Phase 3 Principal 판정 surface 구성에 반영 (Step 1 §7.6 테이블 + §7.9 매핑). 구체적 rendering rule (rationale 컬럼 / color coding / throttling) 은 Step 4 scope.

이 차이는 Step 2 §6.4 와 대조적 — Step 2 의 α 결과는 Stage 2 Explorer (Hook β) 가 소비, Step 3 의 γ 결과는 Phase 3 Principal (Hook δ) 이 소비. 두 Hook 은 **서로 다른 phase 의 서로 다른 consumer** 로, Hook γ apply 의 downstream propagation 은 Hook δ 를 통해서만.

## 7. Failure Handling

### 7.1 Full failure — Reviewer agent 가 실패 (응답 없음 / invalid directive)

**정의**:
- agent invocation timeout
- network / LLM 오류
- directive schema validation 실패 (§3.8 reject 조건 중 하나 — rule count 는 §3.8 authority 참조, r6 IA-r5-1 pointer-only)

**runtime 처리**:
1. Phase 2 Step 3 진입 **차단** (Step 2c 가 resolve 될 때까지 Synthesize 진행 금지)
2. Step 2a / Step 2b 는 **계속 진행** (parallel, 상호 독립 — 2c 실패가 2a/2b 진행을 막지 않음). 단 최종 Synthesize (Step 4a) 가 Principal response 대기 상태에서 차단
3. Principal 에게 interactive prompt:
   ```
   Rationale Reviewer failed at Phase 2 Step 2c.
   Failure kind: {timeout / invalid_directive / llm_error}
   Details: {error message}
   
   Choose:
   [r] Retry — respawn Reviewer with same input (one-shot retry)
   [d] Continue with degraded review — skip rationale review for this session,
       proposed element 전수를 Phase 3 Principal 판정으로 escalate.
       raw.yml.meta.rationale_review_degraded = true 기록 (Step 4 scope).
       **Trade-off WARN (r3 D-SYN-C + axiology A-2)**: this option transfers
       rationale-quality judgement to Principal workload. Onto-direction
       §1.0 axis trade-off: local Phase 2 완주 (process) vs global Principal
       시간/비용 최소화 (goal). Choose [r] Retry first if the failure looks
       transient; choose [d] only when Retry exhausted AND preserving
       partial session is more valuable than clean restart.
       Threshold-triggered default flip (proposed 개수 N 이상 시 [a] 권장)
       은 v1.1 backlog.
   [a] Abort Phase 2 — halt Phase 2, preserve wip.yml (Stage 1+2 state).
       Restart may re-enter at Phase 2 Step 2
   ```
4. interactive 불가 (non-interactive CI) 시: **abort 기본값** — 의도치 않은 silent degradation 금지 (Step 2 Hook α §7.1 non-interactive abort 원칙과 동형)
5. **retry 는 1 회 한정, enforcement 규칙 (Step 2 §7.1 r5 DIS-01 거울)**:
   - Principal 이 `[r] Retry` 선택 시, runtime 이 **spawn 전에** `meta.step2c_review_retry_count` 를 read
   - `retry_count >= 1` 이면 `[r]` 선택지를 Principal prompt 에서 **제거** (표시 안 함) — Principal 은 `[d]` / `[a]` 만 선택 가능
   - `retry_count < 1` 이면 runtime 이 `retry_count` 를 atomic increment (+1) + fsync → Reviewer 재spawn (§6.2 2c-spawn 재진입)
   - retry 의 enforcement 는 runtime 의 deterministic read + conditional UI rendering + atomic increment
6. Principal 응답별 state transition:
   - **[r] Retry**: `meta.step2c_review_state = "gamma_in_progress"` 로 복귀. Reviewer 재spawn. 1 회 한정
   - **[d] Continue with degraded**: `meta.step2c_review_state = "gamma_failed_continued_degraded"` + `meta.rationale_reviewer_failures_streak` 증가 + Step 4b 의 rationale_updates empty 로 진행 + raw.yml 의 `rationale_review_degraded = true` 기록 (Step 4 scope 에서 구현).
     - **Read contract (r2 C-4 — Step 4 forward contract)**: Step 4 는 Phase 3 rendering contract 에 다음을 포함해야 한다 — "if `raw.yml.meta.rationale_review_degraded == true`, Phase 3 MUST surface all elements with `rationale_state == 'proposed'` (i.e., `reviewed_at == null`) to the Principal judgement queue (Step 1 §7.9.2 proposed→terminal mapping). degraded flag 가 false 이면 reviewed_at null 은 Reviewer 가 individual 판단하지 않았다는 의미이며, proposed state 는 Proposer 의 confidence 에 따라 Hook β gating 을 거친다". 본 Step 3 는 write 만 수행하고 read rule 은 Step 4 에서 구현 — pair 존재는 본 조항으로 확정
   - **[a] Abort**: `meta.step2c_review_state = "gamma_failed_aborted"` + `meta.stage = 2` 유지 + wip.yml 전체 보존. Phase 2 진행 차단. 재실행 시 Phase 2 Step 2 부터 re-enter 가능 (Stage 1+2 exploration 결과 손실 없음)
   - **non-interactive** (CI) 기본: `[a] Abort` (silent degradation 금지)

**Step 2 §7.1 과의 semantic 차이 (§1.4 pointer, r3 IA-SYN-8 + conciseness F-CONC-2 축약)**:

§1.4 table 의 "abort semantic" + "degraded 경로" 행이 canonical. 여기 재진술 없음.

### 7.2 Partial output — 정상 (Step 2 §7.2 와 정반대, r2 α 정합)

Step 2 (Hook α) 의 §7.2 "partial failure 폐지" 결정은 Hook α 특유 — 모든 entity 의 rationale 을 한번에 생성해야 하는 generator 책임 때문. Hook γ (Reviewer) 는 **selective update** 가 정상 — 실제 판단한 element 만 emit. 따라서 **partial output 은 failure 가 아니다**.

**runtime 처리 rule (r2 α)**:

1. `updates.length == wip.yml.elements.length` rule 은 **없음**
2. `updates.length < wip.yml.elements.length` 은 **정상**. directive 에 없는 element 는 **Reviewer 가 판단하지 않은 element** 로 해석 — runtime 은 intent_inference + provenance 전부 변경하지 않음. `provenance.reviewed_at` 은 null 로 유지
3. `updates` 가 비어 있음 (`updates: []`) 도 정상 — Reviewer 가 어떤 element 도 판단하지 않은 세션. 이 경우 wip.yml 의 intent_inference field 는 Proposer apply 결과 그대로 유지 + meta.step2c_review_state 만 gamma_completed 로 전이
4. directive 의 `updates[]` 개별 entry 에 대한 schema validation 은 §3.8 reject rule 1~12 로 엄격 — 하나라도 위반 시 **entire directive reject (§7.1 full failure)** (r4 IA-r3-5 rule 수 sync)

**함의 (r2 C-1 BLOCKING 해소 축)**: `provenance.reviewed_at` 의 존재 여부는 **Reviewer 가 해당 element 에 대해 explicit operation (confirm/revise/mark_*/populate_stage2_rationale) 을 emit 했는가** 와 1:1 대응. runtime 은 Reviewer 를 대리하여 reviewed_at timestamp 를 찍지 않으며, LLM output (directive) 이 evidence 의 유일한 source. "이 element 가 Review pass 에 포함된 세션인가" 는 session 수준 `meta.step2c_review_state == gamma_completed` 로 판정 — element 수준 signal 은 reviewed_at 유무로 정확히 표현됨 (smallest sufficient).

**Phase 3 surface 에서의 해석 (Step 4 scope 정의 대상)**:
- `reviewed_at != null` element → Reviewer 가 직접 판단한 element (explicit operation). Principal 은 Reviewer 판단을 evidence 로 참고 가능
- `reviewed_at == null` AND `rationale_review_degraded == false` → Reviewer 가 개별 판단하지 않음 (정상 경로). rationale_state 의 Proposer 산출값 + confidence 가 evidence. Hook β gating (confidence medium/high) 로 Stage 2 Explorer 이미 소비
- `reviewed_at == null` AND `rationale_review_degraded == true` → Reviewer 자체 실패 (gamma_failed_continued_degraded). Proposer 산출값의 신뢰도가 낮다는 명시 신호, Phase 3 가 proposed element 를 전수 Principal queue 로 escalate

이 3 구별은 Step 1 §7.9 (Principal action → terminal state mapping) 과 정합하며 audit truth 훼손 없음.

**Triple-read contract (r3 IA-SYN-6 + C-SYN-6 — Phase 3 consumer minimum-sufficient disambiguation)**:

Phase 3 rendering consumer (Step 4 scope) 는 `intent_inference.provenance.reviewed_at == null` 을 해석할 때 다음 3-tuple 을 **모두** 읽어야 한다 — 단일 field 만으로는 3 정상 경로 구별 불가:

```
(reviewed_at, meta.rationale_review_degraded, rationale_state)
```

| reviewed_at | rationale_review_degraded | rationale_state | 해석 | Phase 3 render rule |
|---|---|---|---|---|
| **non-null** | (irrelevant) | reviewed / domain_scope_miss / domain_pack_incomplete | Reviewer 가 explicit revise / mark_* / populate_stage2 판단 emit | Reviewer 판단을 evidence 로 render |
| **non-null** | (irrelevant) | **proposed** (r4 IA-r3-3 신규) | Reviewer 가 explicit `confirm` emit — 기존 Proposer rationale 을 검증 완료, state 변경 없음 (§3.2) | Proposer 산출값 + "Reviewer verified" badge 병기. Proposer confidence 그대로 사용 |
| null | false | proposed | **정상 UNREVIEWED** — Reviewer 개별 확인 없음, Proposer confidence gating 으로 충분 | Proposer 산출값 + confidence 를 evidence 로 render |
| null | **true** | proposed | **γ-degraded** — Reviewer 자체 실패, 모든 proposed 를 Principal queue 로 escalate | proposed element 전수 Principal 판정 surface |
| null | (any) | empty | populate_stage2_rationale 도 안 된 element — Hook γ skip 경로 또는 α/γ 둘 다 미populate | Principal 에 "rationale 미생성" 명시 + v0 fallback 가능성 |

**본 Step 3 가 확정하는 것**: 3-tuple 이 minimum-sufficient disambiguation set 임을 commit. 각 tuple 조합의 실제 render 규칙 (색상 / 아이콘 / grouping / action UI) 은 **Step 4 scope** (Hook δ Phase 3 throttling + rendering). Step 4 는 본 tuple contract 를 read authority 로 인정하고 추가 축을 도입하지 않음 — 2+ lens 수렴.

### 7.3 Directive schema validation 실패 — §3.8 + §7.1 pointer

Step 2 §7.3 (r4 UF-CONC-01 collapse) 와 동형. §3.8 을 authority, §7.1 을 processing path 로 pointer 통일:

- **Reject rule list authority**: §3.8 (rule 1~12, r4) — 단일 authority
- **Processing path**: §7.1 — Principal response 별 state transition
- 모든 rule 1~12 위반은 full failure 로 §7.1 경로 (retry 1 회 한정 + [d]/[a] 선택지)

duplicated enumeration 제거. 상세 validation rule 은 §3.8 에서만 참조.

### 7.4 Degradation counter rule (Step 1 §7.5 mirror)

**`meta.rationale_reviewer_failures_streak`** (cross-session degradation signal):
- `[d] Continue with degraded` 선택 시 increment (+1)
- `[r] Retry` 성공 시 reset (0)
- Stage transition 에서 reset (Step 1 §7.5 statement — 다음 세션에서 fresh 상태)
- `[a] Abort` 시 increment 안 함 (abort 는 session-level 결정, streak tracking 의미 없음)

**`meta.step2c_review_retry_count`** (intra-session retry enforcement — separate concern):
- §6.2 하단 reset rule 참조 — `gamma_completed` / `gamma_skipped` 도달 시 0 reset, `gamma_failed_continued_degraded` / `gamma_failed_aborted` 시 reset 안 함
- degradation counter 와 **분리** — retry_count 는 단일 Phase 2 실행 내 [r] 반복 차단, streak 는 cross-session Hook γ 품질 signal

counter 의 소비:
- `failures_streak` 는 Step 4 scope 에서 raw.yml.meta 에 기록
- 반복 failure 는 systemic issue (LLM 품질 / pack 품질 / runtime bug) 신호로 Phase 3 summary 에 warning 노출 가능 — Step 4 에서 결정

### 7.5 `confidence` 자동 downgrade — 별도 downgrade 경로 (Step 2 §7.4 mirror)

§3.8.1 D1~D3 은 **reject 와 구별되는 downgrade-only 규칙**. revise + populate_stage2_rationale operation 의 `new_confidence` field 에 적용:

**downgrade 처리 순서**:
1. Runtime validator 가 directive 수신 → §3.8 rule 1~12 전수 검사 (r4 IA-r3-5 sync)
2. 어느 하나라도 reject → full failure (§7.1)
3. 통과 시 → 각 revise / populate_stage2_rationale update 에 대해 §3.8.1 D1~D3 적용:
   - D1 (new_confidence == high + new_domain_refs.length < 2) → medium 으로 교체
   - D2 (new_domain_refs.length == 0) → low 로 강제
   - D3 (new_confidence == medium + all optional refs) → low 로 교체
4. downgraded value 로 wip.yml apply
5. agent 원 출력은 `.onto/builds/{session}/session-log.yml` 에 preserve

## 8. §14.6 invariant 재확인

Step 3 는 Step 1 + Step 2 와 동일하게 **본질 sink 확장이 아니라 기존 `wip.yml.elements[].intent_inference` field 의 update + 기존 meta field 확장 (step2c_review_state + step2c_review_retry_count + rationale_reviewer_failures_streak)**. 신규 본질 sink 없음.

dogfood off 시나리오:
- wip.yml 및 intent_inference field 는 dogfood 와 무관하게 정상 작동
- dogfood layer (있다면) 는 wip.yml 을 read-only mirror 로 소비
- Reviewer directive 는 transient — runtime apply 후 destruct. sink 아님
- Reviewer agent 자체는 fresh per invocation — 영속 state 없음
- `meta.step2c_review_state / retry_count / failures_streak` 는 wip.yml 내부 run-time state — dogfood 와 독립

결과: Step 3 도 §14.6 invariant 를 자연 만족.

## 9. Step 3 결정 표면 (Principal 합의 요청)

Step 2 의 Q 패턴 거울. Step 1 Q5/Q6/Q7 (승인 완료) 의 **mechanical 하위 결정** — Step 1 결정 re-open 아님.

| # | 결정 | 옵션 | 권장 |
|---|---|---|---|
| **Q-S3-1** | Input 에 wip.yml 전체 주입 범위 | A. elements + relations + ubiquitous_language + meta (§2.1) / B. elements 만 | **A** — cross-element consistency 판정 + relations_summary 만으로 부족한 관계 맥락 확보. Step 2 의 relations_summary 포함 결정과 동형 |
| **Q-S3-2** | Lens anonymization 보존 | A. elements[].labeled_by 제외 주입 (§2.2) / B. 포함 | **A** — Axiology Adjudicator / Proposer 패턴 동형. Reviewer 가 lens identity 영향 받지 않도록 |
| **Q-S3-3 (r3 rename)** | Selective partial output semantic | A. **unreviewed-by-omission** (directive 에 없는 element = 기존 intent_inference + provenance 전부 유지, reviewed_at == null, §3.1 + §7.2) / B. updates.length == elements.length 강제 | **A** — Hook γ 는 review 역할, 대부분 element 는 Reviewer 가 개별 확인하지 않을 수 있으므로 directive 부재 경로가 정상. r1 의 "implicit confirm" 명칭은 r2 α 결정 (Runtime 이 evidence claim 찍지 않음) 와 semantic drift 가 있어 r3 에서 "unreviewed-by-omission" 으로 정정. Step 2 의 "partial = failure" 와 정반대 결정 — handoff §2.4 trap 해소 |
| **Q-S3-4** | `populate_stage2_rationale` 의 Explorer 경계 | A. target_element_id 가 wip.yml 에 이미 존재 AND intent_inference empty 양쪽 강제 (§3.6 + §3.8 rule 2/8) / B. target_element_id 만 강제 (intent_inference 덮어쓰기 허용) | **A** — Step 1 §7.3 r3 B3 결정. Reviewer 의 entity 생성자 territory 재편입 차단 + 기존 Proposer rationale 의 silent 덮어쓰기 차단 (덮어쓰기는 revise operation 의 책임) |
| **Q-S3-5** | Full failure 시 Principal response 옵션 | A. [r]/[d]/[a] 3 개 (§7.1) — [d] = degraded review, [a] = Phase 2 차단 wip.yml 보존 / B. [r]/[a] 2 개 (Hook α 와 동일) | **A** — Hook γ 시점에는 이미 Stage 1+2 완료 상태. [d] 경로가 가능 (proposed 를 Phase 3 로 escalate). Hook α 의 [v] v0-only 와 semantic 다름 |
| **Q-S3-6** | Retry 횟수 | A. 1 회 (§7.1) — Step 2 §7.1 r5 DIS-01 거울 / B. 0 회 / C. N 회 | **A** — Axiology Adjudicator / Proposer 관행 동형. 2 번째 실패는 systemic issue 신호 |
| **Q-S3-7** | `reviewer_contract_version` 별도 축 | A. 별도 field (§3.7 + §4.2) / B. manifest_schema_version 에 통합 | **A** — contract 수준 version 과 manifest 수준 version 은 서로 다른 audit 축. Step 2 §4.2 와 동형 |
| **Q-S3-8** | Confidence 자동 downgrade | A. warning + apply (§7.5) — Step 2 §7.4 거울 / B. reject directive | **A** — Principal 이 Phase 3 에서 판정. self-report over-claim 을 consumer-side correction 으로 해소 |
| **Q-S3-9** | `meta.step2c_review_state` field (7 enum) | A. 도입 (§6.2) — resumption 복귀점 + [d]/[a] 분기 semantic 구별 / B. 기존 meta.stage integer 로 충분 | **A** — Step 2 §6.2 Q-S2-9 거울. [d]/[a] 분기 resumption 구별 + Phase 2 차단 vs degraded 진행 구별 |
| **Q-S3-10** | `meta.pack_missing_areas` refinement 이연 | A. v1 은 Step 2 non-semantic grouping 그대로 (§6.3.1) — Reviewer 미관여 / B. Reviewer 가 semantic refinement 수행 | **A** — Step 3 v1 scope 제한. directive schema 확장 없음. v1.1 backlog 로 이연 |
| **Q-S3-11** | Schema single authority | A. §3 authority, §4 prompt / §5 role 은 reference only (§3 + §4 + §5) / B. 3 곳 독립 restate | **A** — Step 2 Q-S2-12 거울. drift 원천 차단 |
| **Q-S3-12** | Single-shot full-wip vs chunking | A. v1 = single-shot full-wip + trade-off 명시 (§4.1) + truncation provenance / B. v1 = chunked review | **A** — Step 2 Q-S2-13 거울. cross-element consistency + prompt cache 효율 우선. chunking 은 v1.1 |
| **Q-S3-13** | domain_refs citation constraint | A. manifest 있고 AND content 주입된 파일만 (§3.8 rule 6+7) — Step 2 §3.7 rule 6+8 거울 / B. manifest 만 있으면 OK | **A** — degraded pack 의 uninjected optional 인용 차단. Step 2 Q-S2-15 거울 |
| **Q-S3-14** | Post-validation confidence 저장 | A. runtime-downgraded value 가 canonical (§3.8.1 → apply) — Step 2 §6.4 거울 / B. agent self-reported value | **A** — Step 2 Q-S2-14 거울. self-report bias 방지 |
| **Q-S3-15** | `populate_stage2_rationale` 의 rationale_state 도달점 | A. 바로 `reviewed` (§3.6) — generation + review 동시, proposed 를 skip / B. 먼저 `proposed`, 다음 별도 confirm 필요 | **A** — Reviewer 의 단일 invocation 에서 "이 rationale 은 맞다" 판정을 포함하므로 reviewed terminal 로 바로 전이. proposed 단계 불필요 |
| **Q-S3-16** | `gamma_failed_aborted` 의 wip.yml 보존 | A. Stage 1+2 완료 상태 보존 + meta.stage=2 유지 (§6.2) — 재실행 시 Phase 2 Step 2 부터 re-enter 가능 / B. Stage 1 로 rollback | **A** — Hook α abort 와 semantic 다름. Stage 1+2 exploration 재실행은 token/시간 낭비. 재시작 시 Phase 2 재진입이 실용적 |
| **Q-S3-17** | `provenance.wip_snapshot_hash` 도입 | A. 도입 (§3.7 + §3.8 rule 10) — race condition 감지 (2c 수신 후 Step 4b 사이 wip.yml 변경 검출) / B. 미도입 | **A** — Hook γ 는 parallel dispatch 구조. 2a/2b 와 동시 실행 중 wip.yml snapshot 진실성 보장 필요. Step 4b apply 시점 재검증 |
| **Q-S3-18 (r2 재구성 — C-1 BLOCKING 해소)** | Directive 에 없는 element 의 provenance.reviewed_at 처리 | A. runtime 이 apply pass 에서 populate (runtime-writes-review-timestamp — "review pass 에 포함된 세션" 기록) / **B. populate 안 함 (α)** — Reviewer explicit operation emit 한 element 에만 populate. directive 부재 element 는 reviewed_at null 유지 | **B (α, r2)** — r1 의 A 는 Runtime 이 LLM 의 evidence-generating claim ("reviewed") 을 대리 찍는 구조로 llm-native-development-guideline §3 + productization-charter §5.1 + onto-direction §1.0 "기제" 축 위반. B (α) 는 evidence ↔ field 존재 1:1 대응 유지 — 6 finding 일괄 해소 (C-1 BLOCKING + DI-1 + C-2 일부 + logic F-3 + semantics S-4 + pragmatics Y-5 + coverage F-COV-1). Principal 2026-04-23 승인 |
| **Q-S3-19** | Reviewer skip 조건 | A. inference_mode == none OR stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0} (§2.3) / B. inference_mode 만 check | **A** — intent_inference 가 populate 되지 않은 상태에서 review 무의미. 양쪽 조건 모두 skip trigger |
| **Q-S3-20** | Synthesize 의 rationale_updates 처리 | A. 그대로 복사, semantic 변형 금지 (§6.4) — LLM/runtime boundary / B. Synthesize 가 cross-lens consistency 로 변형 | **A** — Step 2 의 LLM/runtime boundary 원칙 동형. Reviewer directive 의 진실성 보존 |
| **Q-S3-21 (r2 신규 / r3 재기술 — P-DEC-A2 경로 A)** | `operation` enum 의 v1 scope 변경 범위 | A. **v1 에서 rename 1 회 허용 (신규 enum value 도입 없음)** + 나머지 확장 rule 은 Step 4 scope / B. 본 Step 3 에서 enum value 추가 포함 / C. r1 원안 (v1 에서 enum 변경 전혀 없음) | **A (r3 rename 허용)** — r3 P-DEC-A2 승인. `add_for_stage2_entity` → `populate_stage2_rationale` rename 을 r3 에서 §3.6 + §3.8 rule 2/8/11 + §4 prompt + §5.1 role + §9 Q-S3-4/Q-S3-15 동시 갱신. 신규 enum value 추가 (empty state 용 새 operation 등) 는 Step 4 에서 mirror-amendment protocol 과 함께 정의. semantics S-5 + conciseness F-CONC-7 동시 해소. Principal 2026-04-23 승인 |
| **Q-S3-22 (r2 신규 / r5 IA-r4-2 rewrite)** | `provenance.gate_count` field 도입 (CC-1 β) | A. 도입 (§3.7.2 canonical) — `populate_stage2_rationale` 또는 Hook α 생성 후 Hook γ 미검증 element = 1 (single-gate), Hook α 생성 + Hook γ explicit revise/confirm = 2 (two-gate) / B. 미도입, `proposed_by` 값으로 추론 | **A** — logic F-1 + axiology A-5 + semantics S-5 수렴. Stage 2 add-path + legacy un-reviewed path 의 single-gate 품질 비대칭이 audit 에 explicit signal 로 필요. 추론 경로는 polymorphic 해서 consumer code 복잡도 상승. §3.7.2 single authority + §10.1 Step 4 read contract pair 로 Phase 3 rendering surface 확정 |

### 9.1 원 Step 1 Q 와의 관계

Step 3 의 Q 는 Step 1 의 Q5 (Rationale Reviewer fresh agent) + Q6 (Hook γ 실패 처리) + Q7 (Principal 검증 표면) 의 **mechanical 하위 결정**. Step 1 Q5/Q6/Q7 은 승인 상태이므로 Step 3 Q-S3-* 는 그 구체화 — Step 1 결정 re-open 아님.

### 9.2 원 Step 2 Q 와의 관계

Step 3 의 대부분 Q 는 Step 2 의 동형 Q 를 거울 참조 (Q-S2-6 → Q-S3-6, Q-S2-8 → Q-S3-8 등). Step 3 특유 Q (handoff §2.4 에서 경고된 차이점 반영) 는 Q-S3-3 (selective partial), Q-S3-5 (3 옵션 response), Q-S3-10 (pack_missing_areas 이연), Q-S3-16 (abort semantic), Q-S3-17 (wip_snapshot_hash), Q-S3-18 (α vs β), Q-S3-22 (gate_count).

### 9.3 Q 총합 (r3 기준)

22 Q — r1 의 Q-S3-1~20 (20) + r2 신규 Q-S3-21/Q-S3-22 (2). r3 에서 Q-S3-3 rename (unreviewed-by-omission), Q-S3-18 옵션+권장 재구성 (B, α), Q-S3-21 재기술 (rename 1회 허용). 신규 Q 추가 없음.

## 10. 미해소 / backlog

### 10.1 구현 세션 진입 시 결정

- Token budget 의 실제 empirical tuning (wip.yml + pack 전수 주입 시 entity 100+ 세션에서 batch vs chunking) — 구현 세션 책임
- `provenance.runtime_version` 의 소스 — 구현 세션 결정 (Step 2 와 동일). r2 R-15: nullable 허용, audit-only 로 명시
- `wip_snapshot_hash` 의 canonical YAML library 선택 (e.g. js-yaml `sortKeys: true`) — 구현 세션
- Retry 실패 시 Principal 에게 제시하는 message 의 실제 문구 tuning — 구현 세션 (r2 pragmatics Y-1)
- `gamma_failed_aborted` 후 재실행 CLI / entrypoint 문구 — 구현 세션 또는 Step 4 scope (r2 pragmatics Y-2 + structure S-7)
- `rationale-reviewer.md` role 파일의 실제 commit 시점 (본 contract merge 시 vs 구현 세션) — PR scope 논의
- session-log.yml 에 original agent output 보존 format (explicit operation vs absence 구별 기록) — 구현 세션
- `meta.rationale_reviewer_failures_streak` 의 raw.yml persistence format — Step 4 scope
- `raw.yml.meta.rationale_review_degraded = true` flag 의 schema 위치 — Step 4 scope
- **Step 2 protocol amendment — 3 action 통합 (r3 P-DEC-A1 경로 A 승인)**: Principal 2026-04-23 승인 하에 본 Step 3 merge PR 이 Step 2 protocol (PR #202, d15a17d) 에 다음 3 additive patch 를 병행 포함 (Q-S2-21 `fallback_reason` enum additive extension 선례 정합):
  1. **`provenance.gate_count = 1` write rule** (Step 2 §6.3 신설): Hook α 가 Stage 1 → 2 transition 에서 intent_inference.provenance 를 populate 할 때 `gate_count = 1` 로 초기화 (Hook γ 가 revise/confirm 시점에 2 로 증가). 본 Step 3 §3.7.2 의 gate_count canonical 선언과 pair.
  2. **`rationale_state` enum 에 `empty` 추가** (Step 2 §3.4 확장): Stage 2 Explorer 가 elements[] 에 entity 추가 시 `intent_inference.rationale_state = "empty"` 로 populate 하는 canonical shape 를 Step 2 authority 에 commit. Step 1 §4.5 canonical mirror. 본 Step 3 §3.6 + §3.8 rule 8+11 empty 정의와 pair.
  3. **`pack_missing_areas` 재해석** (Step 2 §6.3.1 문장 수정): "semantic refinement 는 Reviewer 에 이연" → "Reviewer 는 v1 에서 pack_missing_areas 에 관여하지 않으며 (본 Step 3 §6.3.1), semantic refinement 는 v1.1 backlog". forward-declared seat 을 v1.1 이연 fact 로 정정.

  **scope 엄격**: 본 amendment 는 Step 2 의 decision 표면 (Q-S2-1~22) 재검토 아님. Additive extension + forward-declared seat 정정만. Step 2 decision 문서 (PR #202 `development-records/evolve/20260423-phase4-stage3-step2-rationale-proposer-decision.md`) 는 unchanged — `revision_history` 에 r3 P-DEC-A1 amendment 만 기록.

  **mirror marker enforcement (r4 IA-r3-5 single mandatory rule)**: Step 2 ↔ Step 3 mirror point 5 곳 (§3.8 / §3.8.1 / §4 / §5 / §6.2) 에 `<!-- mirror-of: step-2-protocol §X.Y -->` comment 부착이 **r3 merge PR 의 구현 commit 에 필수** (선택 옵션 없음 — r3 review 의 "mandatory-and-optional 동시" drift 해소). `reviewer_contract_version` 또는 `proposer_contract_version` bump 시 양쪽 문서 동기 갱신 trigger.

  **Step 4 read contract pair (r3 IA-SYN-2 + IA-SYN-6 + C-SYN-2/C-SYN-6, r5 IA-r4-5 single-gate 2 case 명시)**: 본 Step 3 가 write 하는 field 에 대한 read contract 는 Step 4 가 commit. forward contract list:
  - `gate_count` (§3.7.2 canonical) → Phase 3 rendering 시 single-gate element 를 별도 badge / warning 로 surface. Single-gate case 2 종: (a) `populate_stage2_rationale`-origin element, (b) Hook α 생성 후 Hook γ 에 의해 explicit revise/confirm/mark_* 을 받지 않은 element (gate_count 가 1 에서 증가하지 않은 상태 — `reviewed_at == null` AND `gate_count == 1`). 두 case 모두 quality-asymmetry audit signal 로 동일 render rule 적용
  - `rationale_review_degraded: true` (§7.1 [d]) → Phase 3 가 proposed element 전수 Principal queue 로 escalate
  - `(reviewed_at, rationale_review_degraded, rationale_state)` triple-read contract (§7.2) → Phase 3 render decision 의 minimum-sufficient disambiguation set. Step 4 는 추가 축을 도입하지 않음
- **§6.2 flow diagram 의 2a/2b/2c parallel completion gate 구체 wait mechanism** — coverage F-COV-3 race condition rule 은 §3.7.1 wip_snapshot_hash 로 해소됐으나 구현 시 2a/2b/2c coordination 의 event loop 는 구현 세션 (r6 IA-r5-2: mirror marker 중복 bullet 제거 — Step 2 amendment block 내 "mirror marker enforcement" 선언이 single local authority)

### 10.2 v1.1 이후 이연

- **Smallest-sufficient-bundle input injection**: v1 single-shot 대신 entity 단위 chunked review. 본 Step 3 §4.1 trade-off 와 동형. v1.1 backlog
- **`pack_missing_areas` semantic refinement** (§6.3.1): Reviewer directive 에 `pack_missing_areas_refinement[]` field 추가. Step 2 의 non-semantic grouping 을 Reviewer 가 LLM-owned refinement 로 merge/split. v1.1 backlog
- **Cross-batch consistency** (§4.1 chunking backlog 와 연계): v1.1 chunked review 도입 시 동일 domain 개념을 여러 batch 에서 다르게 revise 한 경우의 consistency check. v1.1
- **Per-update `__truncation_hint` field (r2 C-9 이연)**: r1 에서 예약했던 `proposals[].__truncation_hint` / `updates[].__truncation_hint` field 는 v1 consumer 부재로 r2 에서 제거. v1.1 chunked review 도입 시 재검토 (entity-level truncation audit surface 필요 시)
- **`reviewer_contract_version` major bump 시 재검증 rule (r2 R-14)**: major bump 시 기존 `rationale_state: reviewed` element 의 "자동 재검증 vs Principal 재판정 queue 추가" 결정. Phase 3 surface 와 얽혀 Step 4 scope 에서 전수 통합 결정
- **Axiology lens role 확장 (r2 axiology A-7 NP-1 + r3 NP-A1 "Principal Burden Accounting" 통합)**: `.onto/roles/axiology.md` 의 Core questions 에 "설계 변경이 Principal 의 판정 부담 분포에 기여하는가? — local process 정합과 global Principal 시간/비용 최소화의 축 대응" 1 질문 추가. 본 review 의 active lens set 변경 없음, govern 경로에서 role 정의 개정 시 반영. r3 axiology round 2 NP-A1 로 구체화된 "Principal Burden Accounting" sub-check 는 이 role question 이 체계화하는 축 — 본 Step 3 r3 의 §7.1 [d] trade-off 문단 (D-SYN-C) 이 첫 자가 적용 사례
- **Step 2 의 이연 backlog 들** (scope-declaring file marker, chunking provenance format, Step 1 §12.1 의 backlog 들) — Step 2/Step 1 에서 이미 이연. Step 3 에도 영향 없음

## 11. 본 문서의 위치

- **Previous**: Step 2 PR #202 (d15a17d, 2026-04-23) — Q-S2-1~22 일괄 승인
- **r1** (초안) → review (`20260423-dd4dae66`, 1 BLOCKING + 5 MAJOR + 5 MODERATE + 2 MINOR + 38 Recommendations)
- **r2** (α 채택) → review (`20260423-d1c26548`, cc-teams-lens-agent-deliberation sendmessage-a2a 2 rounds, **BLOCKING 0** + 6 MAJOR + 5 MODERATE + 7 MINOR + 3 CC + 7 Disagreement + 10 IA + 24 R)
- **r3** (P-DEC-A1+A2 + IA-SYN-1~8) → review (`20260424-fcdcf9dc`, codex-nested-subprocess, **BLOCKING 0** + 2 Consensus + 3 CC + 5 Disagreement + 6 IA + 2 UF — 모두 local leftover)
- **r4** (r3 review 6 IA + 2 UF 해소) → review (`20260424-38fd67b9`, codex-nested-subprocess, **BLOCKING 0 + MAJOR 0** + 2 Consensus + 1 CC + 1 Disagreement + 6 IA + 4 UF + 3 R — 모두 collapse residue)
- **r5** (r4 review 6 IA + 4 UF + 3 R 전수 해소) → review (`20260424-e538f3ac`, codex-nested-subprocess, **BLOCKING 0 + MAJOR 0 + 6 lens clean + 0 CC + 0 Disagreement + 2 IA + 1 UF** — synthesize "final synchronization cleanup, no broader redesign needed" 선언)
- **Current**: r6 — r5 review 의 2 IA + 1 UF 전수 해소. §7.1 "11 reject 조건" → §3.8 authority pointer-only 교체 (logic + structure 공동 해소), §10.1 mirror marker 중복 bullet 제거 (conciseness UF — amendment block 이 single local authority)
- **Next**: r6 에 대한 `/onto:review` 6차 실행 (codex-nested-subprocess — clean pass 도달 예상)
- **그 다음**: clean pass 도달 시 Step 3 decision 문서 (`20260424-phase4-stage3-step3-rationale-reviewer-decision.md`) 작성 → PR (Step 2 amendment 3 action 병행 포함) → Step 4 (통합)

**Revision 이력의 단일 authority**: frontmatter `revision_history:` (YAML) 가 canonical. 본 §11 은 요약 pointer (Step 2 r4 UF-CONC-02 거울).

**Next Step (Step 4) 예고**: 본 Step 3 의 Hook γ mechanical spec 이 확정된 후, Step 4 에서 Hook δ (Phase 3 throttling) + Phase 3.5 write-back (Principal action → terminal state 매핑 §7.9 전수) + raw.yml meta 확장 (rationale_review_degraded + rationale_reviewer_failures_streak + inference_mode + degraded_reason + fallback_reason 전수) + `onto domain init` CLI contract 를 한꺼번에 고정. 이후 Stage 3 wrap-up + Track B 구현 세션 진입.
