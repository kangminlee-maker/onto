---
as_of: 2026-04-20
status: active
functional_area: post-framework-v1-next-session-entry
purpose: |
  framework v1.0 (PR #135) 생성 세션 이후 다음 세션이 lexicon 정합 PR 또는
  Phase 4 Stage 2 재개로 즉시 진입할 수 있도록 self-contained handoff.
  본 handoff 는 어떤 prior memory 도 기대하지 않으며, /clear 후 entry 만 제공.
source_refs:
  framework_doc: "development-records/evolve/20260419-knowledge-framework.md (PR #135, docs/knowledge-framework-v1 branch)"
  pr_url: "https://github.com/kangminlee-maker/onto/pull/135"
  prior_handoff: "development-records/plan/20260419-phase4-handoff.md (superseded by framework v1.0)"
  onto_direction: "development-records/evolve/20260413-onto-direction.md (framework 의 상위 전제)"
  memory_deferred_migration: "project_onto_repo_layout_migration.md (framework §10.1 기록)"
  review_records:
    - ".onto/review/20260419-19e88ea1/ (Round 1 full, 9 lens)"
    - ".onto/review/20260419-ef004e5a/ (Round 2 full, 9 lens)"
    - ".onto/review/20260419-756d2b71/ (Core-review, 6 lens)"
    - ".onto/review/20260420-86c22d4d/ (Final-check, 6 lens, CONVERGED)"
---

# Post-Framework v1.0 Handoff — 2026-04-20 → Next Session

## §0 /clear 후 첫 명령

세 진입점 중 하나 선택 후 해당 § 지시 따르기:

```
(α) lexicon 정합 PR 진입 → §4
(β) Phase 4 Stage 2 (govern↔learn) 설계 재개 → §5
(γ) 병행 진행 → §4 + §5 를 별도 session 에서
```

**제 권장**: (α). framework §11 zone matrix 가 Stage 2 의 canonical input 인데, lexicon 반영 전에는 framework 가 `canonical (pending-lexicon-sync)` 상태라 Stage 2 설계의 좌표 기반이 불안정.

---

## §1 이전 세션 (2026-04-19~04-20) 요약

### §1.1 세션 의도 vs 실제 진행

- **의도**: Phase 4 Stage 2 (govern↔learn 순환 의존) 설계 시작
- **실제**: 선행 개념 framework 의 광범위한 모호·누락 발견 → 개념 framework 전면 정리가 Stage 2 의 선행 조건으로 격상 → 4 scope × 3 tier 좌표계 정본 문서 작성

### §1.2 핵심 산출물

| 산출물 | 위치 | 상태 |
|---|---|---|
| **framework v1.0 정본 문서** | `development-records/evolve/20260419-knowledge-framework.md` (1039 lines) | **PR #135** on `docs/knowledge-framework-v1` |
| 메모리 — deferred migration | `~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_onto_repo_layout_migration.md` | recorded |
| Round 1 full-review artifacts | `.onto/review/20260419-19e88ea1/` | local (gitignored) |
| Round 2 full-review artifacts | `.onto/review/20260419-ef004e5a/` | local |
| Core-review artifacts | `.onto/review/20260419-756d2b71/` | local |
| Final-check artifacts | `.onto/review/20260420-86c22d4d/` | local, **CONVERGED** |

### §1.3 framework 주요 결정 (핵심 요약)

| 영역 | 결정 |
|---|---|
| 용어 | `project` retire → `product` 통합. `artifact` retire → `medium` rename |
| scope axis | `product / medium / domain / methodology` 4 값 |
| tier axis | Tier 1 (실용 cost-saver) / Tier 2 (서술적 reference) / Tier 3 (의무 obligation) |
| maturity axis | Experience / Learning (Tier 1 한정) |
| 전이 verbs | `promote` (성숙도) + `generalize` (scope) + `canonicalize` (tier) + **compound `promote_and_generalize`** (v1 active: target=medium/domain) |
| canonicalize semantics | **snapshot copy** — source commit SHA 기록, Tier 1↔Tier 3 feedback 루프 부재 |
| multi-medium product | m:n relation + `implemented_with.yaml` manifest + single primary + multi-axis frontmatter |
| framework 자기 확장 | §12 — scope enum 확장 / tier 재조정 / framework version 관리 / meta-schema 선언 |

### §1.4 3-round review 수렴 추이

| Round | lens | blocking | verdict |
|---|---|---|---|
| Round 1 full | 9 | 7 (IA-1~IA-7) | framework 자기 모순 식별 |
| Round 2 full | 9 | 7 (R2-IA-1~R2-IA-7) | 세부 polish + Principal 결정 반영 |
| Core-review | 6 | 0 (CR-1~CR-6 mechanical fix) | lexicon sync 흡수 가능 |
| **Final-check** | 6 | **0** | **CONVERGED** |

---

## §2 현 상태 + Deferred

### §2.1 git · PR 상태

```
branch: docs/knowledge-framework-v1 (pushed to origin)
commit: 7a83995 — docs(framework): add knowledge framework v1.0
PR: #135 — https://github.com/kangminlee-maker/onto/pull/135
  base: main
  status: open, awaiting review·merge
```

`docs/phase4-design-input` branch 는 별개 deliverable (phase4-design-input 문서) 으로 미merge 상태. framework PR 과 독립. 필요 시 별도 진행.

### §2.2 framework 잔존 IA 6건 (모두 non-blocking, lexicon PR 흡수 예정)

| IA | 내용 | 해소 seat |
|---|---|---|
| Next-IA-1 | `methodology` §8.6 entity block 추가 + 자기 분류 1 줄 | lexicon 갱신 PR |
| Next-IA-2 | `lifecycle_status` enum values 명시 | §8.3 또는 외부 inherit note |
| Next-IA-3 | `principle.enforcement_state` attribute 추가 (declared-only vs enforceable 구별) | §8.6 |
| Next-IA-4 | §6.6 row 6 (`promote_and_generalize` target=methodology) 제거 | framework v1.0 patch (v1.0.1) |
| Next-IA-5 | §12.7 storage-derivation 명시 1 줄 — Tier 1 의 Exp/Learn 가 같은 (tier, primary_scope) 에서 별도 dir | framework v1.0 patch |
| Next-IA-6 | §11.1 `patch only` label 을 binary enum 과 분리 | framework v1.0 patch |

Next-IA-4/5/6 는 framework 문서 자체 patch (v1.0.1), 나머지 (1/2/3) 는 lexicon 갱신 PR 에서 처리.

### §2.3 Deferred items (framework §10)

| Deferred | trigger |
|---|---|
| onto repo layout migration | Phase 4 (5-activity v1) 완료 후 별도 W-ID |
| product Tier 1 Exp/Learn 분리 유효성 | 6개월 누적 후 재평가 |
| methodology instance 발생 관찰 | 첫 instance 발생 시 §6 generalize 경로 재평가 |
| `organizational_process` / `slack_workflow` medium 정식 등재 | cross-product 반복 관찰 후 |

---

## §3 세 진입 경로 비교

| 경로 | scope | 규모 | 의존성 |
|---|---|---|---|
| **(α) lexicon 정합 PR** | rank 1 (core-lexicon.yaml) + rank 2-5 prose 치환 | 중간 (8 entity 신설·refine + 3 enum + relation block + 10개 file rename) | framework PR #135 merge 선행 권장 |
| **(β) Phase 4 Stage 2 (govern↔learn)** | 2-phase commit 계약 + Principal 개입 matrix + drift probe v1 | 큼 (신규 설계 + 구현) | framework §11 이 input, lexicon 반영 전엔 drift risk |
| **(γ) 병행** | α + β 를 다른 session 에서 | α × β 합산 | 양쪽 session 간 drift 관리 필요 |

---

## §4 경로 (α) — lexicon 정합 PR 진입 세부

### §4.1 진입 체크리스트

1. [ ] PR #135 merge 확인 또는 reviewer feedback 수용 후 merge
2. [ ] main 으로 checkout + pull
3. [ ] 신규 branch 생성: `feat/lexicon-sync-framework-v1`
4. [ ] `authority/core-lexicon.yaml` 갱신 작업 시작

### §4.2 lexicon 정합 작업 list (framework §8 전수 반영 + 6 IA 중 3건)

**신규 entity 등재** (6 entity — framework §8.1):
- `product` (Principal 의 작동 실체, onto-direction §1 prose 를 entity 격상)
- `experience` (Tier 1 raw 항목)
- `medium` (구현 수단)
- `medium_reference` (Tier 2 medium reference doc 묶음)
- `domain` (분야 frame)
- `methodology` (cross-everything frame, definition only) **← Next-IA-1 여기서 해소**
- `principle` (Tier 3 의무 규범)

**기존 entity refine** (3):
- `learning` — "promoted 검증된 cost-saver" 로 정의 좁힘. scope attribute 추가
- `domain_document` — grain 명확화 (1 file = 1 instance). doc_type enum 추가
- `ontology` — onto-direction §1 prose 를 entity 격상. scope=product 한정

**신규 enum** (3):
- `scope.values: [product, medium, domain, methodology]` + notes 에 기존 [user, project, domain] migration
- `transition_kind.values: [promote, generalize, promote_and_generalize, canonicalize, norm_update, medium_norm_update, ontology_update, re_classification, retire]` — Next-IA-4 반영 필요 (enum 에 from methodology target 제거)
- `normative_tier.values: [1_cost_saver, 2_reference, 3_obligation]`
- `lifecycle_status.values` ← **Next-IA-2 여기서 해소** (기존 enum 의 values 명시 또는 신설)

**Attribute 신규** (IA-3 대응):
- `experience.attributes.primary_scope + secondary_scopes`
- `learning.attributes.primary_scope + secondary_scopes + source_experience_ref`
- `principle.attributes.primary_scope + secondary_scopes + source_commit_sha + source_ref + enforcement_state` ← **Next-IA-3 여기서 해소**

**Relation block** (framework §8.6 전수 반영).

**Deprecate**:
- `learning_applicability` enum
- inline tags `[methodology]`, `[domain/X]`, `[medium/X]`
- scope.values 기존 `user`, `project`

**Retire**:
- 어휘 `project` (전역)
- 어휘 `artifact` 의 "means" 용법 (instance 의미는 유지)

### §4.3 rank 2-5 prose 치환 (framework §9)

| 파일 | 작업 |
|---|---|
| `design-principles/project-locality-principle.md` | **rename** → `product-locality-principle.md`. 본문 "project" 치환 |
| `design-principles/productization-charter.md` | §1 에 경계 선언 한 줄 추가 |
| `processes/learn/promote.md` | scope enum + 저장 경로 갱신 |
| `processes/learn/health.md` | 동일 |
| `processes/learn/promote-domain.md` | 동일 |
| `processes/govern.md` | product-local 표현 정정 |
| `CLAUDE.md` | authority 위계 표의 project-locality → product-locality 경로 갱신 |

### §4.4 framework 문서 patch (v1.0.1)

Next-IA-4/5/6 반영:
- §6.6 row 6 제거 (`promote_and_generalize target=methodology`)
- §12.7 storage-derivation 1 줄 (Tier 1 Exp/Learn 경로 분화 명시)
- §11.1 `patch only` label 을 Tier 3 zone 에서 separate column 으로 분리

framework 버전 `v1.0` → `v1.0.1`. frontmatter `status` 는 `canonical (pending-lexicon-sync)` 유지.

### §4.5 lexicon PR merge 후 framework status transition

framework frontmatter `status: canonical (pending-lexicon-sync)` → `status: canonical` 승격. separate small PR 로 처리 또는 lexicon PR 에 포함.

### §4.6 예상 PR 구성

- PR A: framework v1.0.1 patch (Next-IA-4/5/6, 소규모)
- PR B: lexicon 정합 (rank 1 entity 등재 + enum + relation, 중간)
- PR C: rank 2-5 prose 치환 (product-locality rename 등, 다수 파일)
- PR D (optional): framework status 승격

순서 제안: A → B → C → D.

---

## §5 경로 (β) — Phase 4 Stage 2 (govern↔learn) 설계 재개 세부

### §5.1 Stage 2 설계 진입점 (framework §11.4)

framework v1.0 채택 후 Stage 2 scope 가 명확히 좁아졌음. 다음 4 점만 결정:

1. **Tier 3 canonicalize 경로의 2-phase commit 계약** (staging area · patch 생성 · rollback)
2. **Principal 개입 matrix** — Tier 3 진입 시 Principal direct 강제
3. **drift probe v1 의 Tier 3 사전 분석** 규칙
4. **framework §11.3 의 3 질문 결정**:
   - Q1: product-local Tier 3 (`{product}/.onto/principles/`) 변경의 소유권 = product govern vs user-level govern?
   - Q2: onto-direction §1.3 drift 분기 3 경로 (self_apply / queue / principal_direct) 중 어디?
   - Q3: onto repo (self-hosted) 과 일반 product 의 자율성 경계 — 동일 취급 vs 분리?

### §5.2 Stage 2 권장 진입 선행 조건

- framework PR #135 merge 필수 (framework 본문이 Stage 2 zone matrix 의 SSOT)
- 가능하면 lexicon 정합 PR 도 merge 후 진입 — drift risk 최소화
- 최소 요건: framework §11 zone matrix 가 lexicon entity (experience, learning, principle 의 primary_scope) 에 anchor 되어 있어야 Stage 2 의 2-phase commit 계약이 entity-driven design 으로 표현 가능

### §5.3 §11 zone matrix 재확인 (framework 본문)

Tier 1 + Tier 2 = learn 자동 zone (govern 무관). Tier 3 = govern 강제 zone. 순환 의존 해소의 본질:
- Tier 1·2 는 learn 자동 zone 안에서 완결 → 순환 없음
- canonicalize 가 snapshot copy (§6.3) 이므로 Tier 1↔Tier 3 feedback 루프 부재 → 완전 분리 성립
- Stage 2 의 2-phase commit 은 Tier 3 canonicalize 경로에만 필요

---

## §6 entry 체크리스트 (/clear 직후 어느 경로든 공통)

/clear 후 수행:

- [ ] `git status` → main 또는 framework branch
- [ ] `git log --oneline -5` → 최상위에 framework PR merge commit 확인 (미merge 시 α 진입 전 PR #135 먼저 처리)
- [ ] 본 handoff (`development-records/plan/20260420-post-framework-handoff.md`) 정독
- [ ] framework 본문 (`development-records/evolve/20260419-knowledge-framework.md`) 열람
- [ ] 선택 경로에 따라 §4 (α), §5 (β), §4+§5 (γ) 의 체크리스트 진행
- [ ] 경로별 branch 생성 및 작업 시작

---

## §7 참조

### §7.1 Framework 문서
- **framework v1.0 정본**: `development-records/evolve/20260419-knowledge-framework.md`
- PR #135: https://github.com/kangminlee-maker/onto/pull/135
- branch: `docs/knowledge-framework-v1` (commit `7a83995`)

### §7.2 상위 전제 문서
- `development-records/evolve/20260413-onto-direction.md` (onto 방향 §1 정본)
- `design-principles/productization-charter.md` (productization trajectory)
- `design-principles/project-locality-principle.md` (rename 예정)

### §7.3 관련 프로세스 (lexicon 정합 작업 소비 대상)
- `processes/learn/promote.md`, `health.md`, `promote-domain.md`
- `processes/govern.md`
- `src/core-runtime/govern/drift-engine.ts` (GOVERNANCE_CORE_PREFIXES — framework §11.3 Stage 2 대상)

### §7.4 Review artifacts (이번 세션 산출, local gitignored)
- `.onto/review/20260419-19e88ea1/` — Round 1 full-review
- `.onto/review/20260419-ef004e5a/` — Round 2 full-review
- `.onto/review/20260419-756d2b71/` — Core-review (post-R2-IA)
- `.onto/review/20260420-86c22d4d/` — **Final-check (CONVERGED)**

### §7.5 Memory
- `project_onto_repo_layout_migration.md` — deferred: design-principles/, processes/, authority/ → `{product}/.onto/` (Phase 4 완료 후)
- `MEMORY.md` pointer (line 81) — above memory 등록 완료

### §7.6 세션 연속성
- **이전 handoff**: `development-records/plan/20260419-phase4-handoff.md` (Phase 4 Stage 2 설계 진입용, 본 framework 로 인해 superseded — Stage 2 설계는 framework §11 이 input)
- **본 handoff**: framework 생성 완료 후 다음 세션 진입 경로 3개 제시

---

## §8 lifecycle

- **Active**: framework PR #135 merge 또는 lexicon 정합 PR 착수 전까지
- **Superseded**: lexicon 정합 PR merge 시점 — "superseded by lexicon-sync PR" 표시
- **Archive**: Phase 4 Stage 2 설계 완료 시 reference 용
