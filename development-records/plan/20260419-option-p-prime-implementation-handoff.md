---
as_of: 2026-04-19
status: active
functional_area: core-axis-empirical-recomposition-implementation
purpose: |
  /clear 후 다음 세션이 Option P' (6 lens 경험적 core-axis 재구성) 의 구현
  PR 을 즉시 시작할 수 있도록 self-contained handoff. 2026-04-19 세션에서
  rename rollout (PR #126/#127/#128) 완료 후, 사용자 methodology 재정의
  시퀀스 (4 회) 를 거쳐 empirical 분석 완성 (PR #129 merged). 이제 그
  분석 결과를 코드에 반영하는 단계.
source_refs:
  benchmark: "development-records/benchmark/20260419-lens-contribution-analysis.md (v5 FINAL)"
  proposal: "development-records/evolve/20260419-core-axis-empirical-recomposition.md (Option P' 제안)"
  prev_handoff: "development-records/plan/20260418-session3-handoff.md (이전 세션)"
  memory_rename_complete: "project_core_axis_rename_complete.md"
  merged_prs:
    - "PR #126 (design proposal + approval, commit 9261031)"
    - "PR #127 (BREAKING rename impl, commit 4022eb1)"
    - "PR #128 (backlog closure, commit 189b490)"
    - "PR #129 (empirical analysis + Option P' proposal, commit c18f683)"
---

# Option P' Implementation Handoff — 2026-04-19 → Next Session

## 0. /clear 후 첫 명령

```
development-records/plan/20260419-option-p-prime-implementation-handoff.md 읽고 Option P' 구현 PR 시작해줘
```

이 handoff 는 self-contained. 이전 세션의 어떤 memory 도 기대하지 않는다.

## 1. 배경 (간단)

### 1.1 이미 완료

- PR #126/#127/#128 (merged 2026-04-18~19): `light` → `core-axis` rename + next-patch backlog. v0.2.0 release.
- **PR #129 (merged 2026-04-19, commit c18f683)**: empirical lens contribution analysis + Option P' proposal.

현 core-axis (v0.2.0 시점):
- `authority/core-lens-registry.yaml`: `core_axis_lens_ids` = [logic, pragmatics, evolution, axiology] (4 lens)
- `always_include_lens_ids` = [axiology]

### 1.2 Option P' 권장 (이번 세션 에서 합의 확정 필요)

**`core_axis_lens_ids` = [axiology, coverage, evolution, logic, semantics, structure] (6 lens)**

변화:
- 유지: axiology, logic, evolution (3)
- 제거: pragmatics (1)
- 추가: coverage, semantics, structure (3)

**정량 비교 (v5 benchmark)**:
| Metric | Current (4) | Option P' (6) |
|---|---|---|
| Coverage (session 완전 cover) | 77.4% | **86.4%** (+9.0%) |
| Depth retention (consensus depth) | 51.5% | **67.6%** (+16.1%) |
| Items lost entirely | 5/24 | **2/24** (-3) |
| Cost | 4 lens | 6 lens (+50%) |

## 2. 구현 5 step

### Step 1 — SSOT 갱신

**파일**: `authority/core-lens-registry.yaml`

변경:
- `core_axis_lens_ids` array: [logic, pragmatics, evolution, axiology] → [axiology, coverage, evolution, logic, semantics, structure]
- 상단 주석: selection rationale 을 "meta-level 4 axis" 에서 "empirical Pareto-optimal" 로 갱신. Benchmark 참조 (`development-records/benchmark/20260419-lens-contribution-analysis.md`)
- Rename 이력 주석 (PR #127 기록) 은 유지 + "v0.2.1 recomposition" 이력 추가

### Step 2 — Tests

대상:
- `src/core-runtime/discovery/lens-registry.test.ts` (있으면): core_axis_lens_ids.length 가정 확인
- `src/core-runtime/cli/review-invoke.ts` 의 상수/테스트: `CORE_AXIS_LENS_IDS` consumer 가 4 고정 가정 있는지
- E2E (`src/core-runtime/cli/e2e-review-invoke.test.sh`): `--review-mode core-axis` 실행 시 6 lens 소비 확인 (mock mode 라 실제 lens 수 검증이 가능한지 확인)
- `src/core-runtime/discovery/config-profile.test.ts`: `review_mode: "core-axis"` literal 사용 — lens set 가정 없으면 OK

검증:
- `npm run check:ts-core`: 0 error
- `npx vitest run`: 회귀 0 확인

### Step 3 — Documentation

| 파일 | 변경 |
|---|---|
| `BLUEPRINT.md` (Full vs Core-Axis Review 표) | "4 meta-level axes" → "6 empirical Pareto-optimal lenses" + 근거 요약 |
| `processes/review/review.md` (389 부근 "core-axis 모드") | 고정 4 lens 기술 → 고정 6 lens 기술 |
| `processes/configuration.md` (review_mode 절) | "core-axis 는 meta-level 고정 4 lens" → "경험적 최적화된 고정 6 lens (logic / structure / semantics / evolution / coverage / axiology)" |
| `processes/review/review.md` (389, 495, 514 의 core-axis 설명) | 동일 갱신 |
| `scripts/smoke-topology/README.md` | 필요 시 갱신 (4 lens 명시 있다면 6 으로) |

### Step 4 — Version + CHANGELOG

- `package.json`: `0.2.0` → `0.2.1`
- `CHANGELOG.md`:

```markdown
## Unreleased

### Changed — core-axis lens set recomposed from 4 to 6 (v0.2.1)

Empirical analysis (479 session set-cover + 24 consensus items depth) 결과
core-axis 구성이 coverage 77.4% → 86.4%, depth retention 51.5% → 67.6%,
items lost 5 → 2 로 개선되는 Pareto-optimal 구성 확인.

#### Changed

- `authority/core-lens-registry.yaml` 의 `core_axis_lens_ids`:
  - Before: [logic, pragmatics, evolution, axiology]
  - After: [axiology, coverage, evolution, logic, semantics, structure]

#### Cost impact

- LLM call 수: core-axis mode 실행 시 4 → 6 lens (+50%)
- Full 9-lens 대비: 44% → 67% cost ratio
- Coverage/Cost trade-off 는 depth dimension (신뢰도) 감안 시 우위

#### Rationale

- v5 benchmark (`development-records/benchmark/20260419-lens-contribution-analysis.md`)
- Pareto analysis: k=3~9 전수 비교에서 k=6 이 유일 Pareto-optimal
- Option P' proposal: `development-records/evolve/20260419-core-axis-empirical-recomposition.md`
```

### Step 5 — Memory 갱신

- `project_core_axis_rename_complete.md` 에 "v0.2.1 recomposition completed" 섹션 추가
- 신규 `project_core_axis_empirical_recomposition_complete.md` (implementation 완료 시)
- `project_light_review_lens_design.md` 의 (b)(c) 는 empirical recomposition 으로 **흡수** — coverage 추가로 (c) 해소, structure 추가로 (b) 의 broken reference 커버 가능

## 3. 파일별 변경 preview

### `authority/core-lens-registry.yaml` (핵심)

기존:
```yaml
core_axis_lens_ids:
  - logic
  - pragmatics
  - evolution
  - axiology
```

변경:
```yaml
core_axis_lens_ids:
  - axiology
  - coverage
  - evolution
  - logic
  - semantics
  - structure
```

상단 주석에 empirical rationale 추가:
```yaml
# `core_axis_lens_ids` — review_mode 가 `core-axis` 일 때 실행.
#
# 선정 근거 (empirical, v5 benchmark 기반):
#   479 full session + 24 consensus depth items 의 set-cover simulation
#   결과, 본 6 lens 조합이 Pareto-optimal:
#     - Coverage 86.4% (cover rate of fully-coverable sessions)
#     - Depth retention 67.6% (consensus cross-lens redundancy)
#     - Items lost 2/24 (axiology-only sole contributor 2 개)
#   k=3~9 전수 비교 (k=6 이 유일 Pareto front).
#
# Broad lens (logic/evolution/axiology) 과 niche lens (coverage/semantics/
# structure) 의 혼합 — mece 하지 않음이 품질 보증 (다중 독립 검증).
#
# 참조: development-records/benchmark/20260419-lens-contribution-analysis.md
#       development-records/evolve/20260419-core-axis-empirical-recomposition.md
#
# 이력:
#   - PR #127 (v0.2.0): `light_review_lens_ids` → `core_axis_lens_ids` rename
#     (당시 4 lens: logic / pragmatics / evolution / axiology)
#   - PR ??? (v0.2.1): 4 → 6 lens empirical recomposition (본 PR)
```

## 4. 검증 체크리스트

새 세션에서 구현 후:

- [ ] `authority/core-lens-registry.yaml` 의 `core_axis_lens_ids.length === 6`
- [ ] 순서: [axiology, coverage, evolution, logic, semantics, structure] (alphabetical or 지정 순)
- [ ] `npm run check:ts-core`: 0 error
- [ ] `npx vitest run`: 회귀 0
- [ ] Documentation 3 파일 (BLUEPRINT / review.md / configuration.md) 에 "6 lens" 및 empirical rationale 반영
- [ ] `package.json` version `0.2.1`
- [ ] CHANGELOG 에 `### Changed` entry
- [ ] `.onto/config.yml` sample 에 영향 없음 확인 (review_mode: core-axis 그대로)

## 5. 주체자 의사결정 (새 세션 시작 시 확인)

| 항목 | 권장 |
|---|---|
| 구성 | Option P' (6 lens) |
| Lens 순서 | 알파벳 순 (axiology, coverage, evolution, logic, semantics, structure) |
| Version | 0.2.0 → 0.2.1 patch |
| Breaking 표기 | 아니오 (behavior 변화, breaking 아님) |
| Sample 확장 먼저 | 아니오 (현 데이터 충분, 후속 research 로 이연) |
| Direct comparison 실험 | 구현 후 별도 (비용 $2-5) |

주체자가 권장과 다른 선택 시 proposal (`development-records/evolve/20260419-core-axis-empirical-recomposition.md` §7) revision_history 추가 후 구현.

## 6. Risk + Caveat

### 6.1 Depth sample 한계
- 24 items / 5 session 에 기반. 1 session (onto/20260408) 의 8-lens overlap 이 outlier 영향
- Generalizability 제한 — **후속 direct comparison 실험으로 validate 권장**

### 6.2 Breaking 아님 but cost 증가
- 기존 `review_mode: core-axis` 동작: 4 lens → 6 lens 실행으로 **LLM call +50%**
- 외부 사용자 budget 에 영향 — CHANGELOG note + 필요시 upgrade notice

### 6.3 Sub-sequence "Synthesize contract 개정" 이 후속 research 에 있음
- 미래 review 가 Accounted findings 를 기록하면 depth measurement sample 확장 가능
- 본 PR 에는 포함 X (별도 작업)

## 7. 새 세션 시작 체크리스트

/clear 직후:

- [ ] `git status` — main, clean (branch 는 main)
- [ ] `git log --oneline -5` — 최상위 5 commit 중 #129, #128, #127, #126 포함 확인
- [ ] `npm run check:ts-core`: 0 error 상태 확인
- [ ] `npx vitest run 2>&1 | grep "Tests "`: 기준치 확인 (최근 ~1776 passed 추정)
- [ ] 본 handoff 정독
- [ ] Proposal §4.1-4.2 (`20260419-core-axis-empirical-recomposition.md`) 정독
- [ ] Benchmark §6.6-6.7 (`20260419-lens-contribution-analysis.md`) 정독
- [ ] Implementation branch 생성: `feat/core-axis-empirical-recomposition`
- [ ] Step 1~5 실행
- [ ] 검증 + commit + PR

## 8. 본 handoff 의 lifecycle

- **Active**: Option P' 구현 PR 머지 시까지
- **Superseded**: 구현 머지 시 "superseded by PR #???" 표시
- **Archive**: 차기 benchmark cycle (예: Synthesize contract 개정) 시 reference 로 활용

## 9. 참조

- **Benchmark v5**: `development-records/benchmark/20260419-lens-contribution-analysis.md`
- **Proposal**: `development-records/evolve/20260419-core-axis-empirical-recomposition.md`
- **Superseded proposal**: `development-records/evolve/20260419-core-axis-silent-failure-mitigation.md`
- **Rename proposal**: `development-records/evolve/20260418-light-to-core-axis-rename-proposal.md`
- **Scripts**: `scripts/analytics/parse-final-outputs.ts`, `v5-filtered-set-cover.ts`, `compute-set-cover*.ts`, `llm-attribute-findings.ts`
- **Merged PRs**:
  - PR #126 (9261031): rename proposal
  - PR #127 (4022eb1): rename implementation
  - PR #128 (189b490): rename backlog closure
  - PR #129 (c18f683): empirical analysis + Option P' proposal
- **Memory**: `project_core_axis_rename_complete.md`, `project_light_review_lens_design.md` ((b)(c) 는 Option P' 으로 해소 예정)
