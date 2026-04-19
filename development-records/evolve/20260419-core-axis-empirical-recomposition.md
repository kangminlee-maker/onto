---
as_of: 2026-04-19
status: design-proposal
functional_area: core-axis-empirical-recomposition
revision_history:
  - "2026-04-19: initial proposal — v5 empirical analysis (`20260419-lens-contribution-analysis.md`) 기반 core-axis 재구성 권장. Option P' (6 lens) 를 Pareto-optimal 로 채택"
purpose: |
  주체자가 재정의한 core-axis 의 목적 ("최소 비용으로 full-review 와 유사한
  coverage 달성, lens 는 mece 하지 않고 이 겹침이 품질 보증") 에 따라, 실제
  review 실행 데이터 (valid 243 full session + 24 consensus items depth
  data) 기반으로 core-axis 구성을 재설계한다.

  V5 분석 결과: 현 core-axis (logic/pragmatics/evolution/axiology) 는
  coverage 77.4% + depth retention 51.5% 로 **empirical suboptimal**.
  K=3~9 전수 비교에서 **Option P' (6 lens) 가 Pareto-optimal** — coverage
  86.4% + depth 67.6% + items lost 2. 현 대비 coverage +9.0%, depth
  +16.1%, items lost -3.

  본 proposal 은 Option P' 을 새 core-axis 구성으로 제안. 구현은 합의 후
  별도 PR.
authority_stance: non-authoritative-design-surface
canonicality: scaffolding
source_refs:
  benchmark: "development-records/benchmark/20260419-lens-contribution-analysis.md (v5 analysis)"
  parse_script: "scripts/analytics/parse-final-outputs.ts"
  set_cover_script: "scripts/analytics/v5-filtered-set-cover.ts"
  rename_proposal: "development-records/evolve/20260418-light-to-core-axis-rename-proposal.md (PR #126/#127/#128)"
  mitigation_proposal: "development-records/evolve/20260419-core-axis-silent-failure-mitigation.md (PR #129 signal proposal — superseded by empirical findings)"
  user_redefinition: "2026-04-19 세션 — core-axis 목적 재정의 (경제성 + full 근사 coverage)"
  ssot: "authority/core-lens-registry.yaml:66-94"
---

# Core-Axis Empirical Recomposition — Design Proposal (2026-04-19)

## 1. 배경

### 1.1 Core-axis 목적의 재정의 (사용자 2026-04-19)

PR #126/#127/#128 의 rename 은 "이름이 본질을 전달" 을 목표로 했고, 그 본질을 "meta-level 4 axis" 로 내가 추론했다. 주체자 정정:

- **실제 목적**: 최소 비용으로 full-review 와 유사한 coverage 달성
- **선정 근거**: 경제성 + 실용성, mece 하지 않음이 품질 보증
- **"meta-level 4 axis"**: 잠정 구성, 본질 아님
- **최적 조합**: empirical 검증으로 결정

### 1.2 Empirical 검증 수행 (v1~v5)

`20260419-lens-contribution-analysis.md` 에 전체 분석 기록. 핵심 진화:

- v1-v2: onto-4 + all cowork, unique appearance rate (잘못된 metric)
- v3: Set-cover 5 session PoC
- v4: Set-cover 479 full session (synthesize-based)
- **v5 (FINAL)**: Round1 direct validation + halted filter + consensus depth

V5 최종 데이터:
- **Valid pool: 243 full session** (1743 중 halted/incomplete 981 filter 후)
- **Depth metric**: 24 consensus items (Accounted findings pattern 있는 5 session)
- Synthesize attribution quality validated via Claude agent round1 direct comparison (3 session)

## 2. 현 core-axis 의 empirical 한계

| 지표 | 현 core-axis (logic, pragmatics, evolution, axiology) |
|---|---|
| Coverage (session 완전 cover) | **77.4%** (188/243) |
| Depth retention (consensus item 의 contributor 유지) | **51.5%** |
| Items lost entirely | **5/24** |
| Lens 비용 | 4 (reference baseline) |

현 구성이 empirical 최적 아님의 3 가지 증거:

### 2.1 Coverage 손실
186 / 243 session 은 current core-axis 로 완전 cover 되지만, 55 session 에서 finding 손실. Coverage/semantics/conciseness/evolution 중 현재 포함 안 된 lens 의 unique contribution 때문.

### 2.2 Depth 손실
24 consensus items 의 avg 원 depth 2.83 lenses. 현 core-axis 로 줄이면 avg 1.46 — 즉 각 defect 이 평균 1.5 lens 로만 confirmed. Depth 는 **cross-lens redundancy** 이고 redundancy 가 품질 보증의 핵심 (사용자 원칙 "mece 하지 않음이 품질 보증"). 51.5% 로 떨어짐은 큰 손실.

### 2.3 Items lost
5/24 consensus items 는 현 core-axis 로 **어느 lens 도 cover 안 함**. 해당 finding 이 review 에서 완전히 누락.

## 3. K=3~9 전수 비교

| k | Best subset | Coverage | Depth retention | Items lost |
|---|---|---|---|---|
| 3 | coverage, logic, semantics | 81.1% | 35.3% | 8 |
| 4 | conciseness, coverage, evolution, semantics | 82.7% | 39.7% | 7 |
| **5** | + logic = {conciseness, coverage, evolution, logic, semantics} | 84.8% | 55.9% | 5 |
| **6 ★** | + structure | **86.4%** | **67.6%** | **2** |
| 7 | + dependency | 89.3% | 77.9% | 2 |
| 8 | + pragmatics | 93.0% | 91.2% | 2 |
| 9 | + axiology (full) | 100% | 100% | 0 |

### 3.1 Knee point 식별

세 전환이 특별:

- **k=4 → 5 (Depth breakthrough)**: Logic 추가로 depth +16.2%. Logic 이 broad lens — 많은 defect 에 partial contribute.
- **k=5 → 6 (Items lost 급감)**: Structure 추가로 items lost 5→2 (-3). Structure 가 "broken paths / isolated elements" 의 고유 category 담당.
- **k=8 → 9 (Coverage 점프)**: Axiology 추가로 coverage +7.0%. Axiology 만 cover 할 수 있는 17 session 의 "purpose/value alignment" category.

### 3.2 Pareto frontier

| k | Pareto-dominated by | Reason |
|---|---|---|
| 3 | k=5, k=6 | Coverage 낮고 depth 낮음 |
| 4 | k=5, k=6 | Coverage 낮고 depth 낮음 |
| 5 | k=6 | Items lost 5 vs k=6 의 2 |
| **6** | — | **Pareto-optimal** |
| 7 | k=8 when accepting +1 cost | 마진 감소 |
| 8 | k=9 when requiring axiology | 17 session lost |
| 9 | reference | Full 9 lens = 100% / 100% / 0 |

**k=6 이 유일 Pareto-optimal** (dominated by none). K=7, 8 은 marginal gain 감소 구간, k=9 는 full.

### 3.3 Axiology always_include 정책 고려

`always_include_lens_ids: [axiology]` 는 policy constraint. 이 constraint 하에서 유효 후보는 (axiology + k-1 다른 lens):

| Lens count (axiology 포함) | Best candidate |
|---|---|
| 4 (Option P 의 재구성) | {axiology, coverage, evolution, semantics} 이 near-optimal 이지만 logic/structure 빠지면 depth 손실 |
| **5 (Option P)** | {axiology, coverage, evolution, logic, semantics} — previous recommendation |
| **6 (Option P')** | {axiology, coverage, evolution, logic, semantics, structure} — **Pareto-optimal** |
| 7 | + dependency |
| 8 | + conciseness (pragmatics 포함 또는 제외) |
| 9 | full |

Option P' 은 k=6 best subset {conciseness, coverage, evolution, logic, semantics, structure} 에서 conciseness 를 axiology 로 교체한 버전:

| 구성 | Coverage | Depth | Items lost |
|---|---|---|---|
| k=6 best (conciseness 포함) | 86.4% | 67.6% | 2 |
| **Option P' (axiology 포함)** | **~86.4%** | **~67.6%** | **~2** (재계산 필요 but similar) |

## 4. 권장안 — Option P'

### 4.1 구성

**`{axiology, coverage, evolution, logic, semantics, structure}` 6 lens**

현 core-axis 대비 변화:

| 조치 | Lens |
|---|---|
| 유지 | axiology, logic, evolution |
| 제거 | pragmatics |
| 추가 | coverage, semantics, structure |

### 4.2 근거 5 층

1. **Empirical Pareto-optimal**: k=3~9 중 coverage + depth + items-lost 세 dimension 모두에서 dominated 아님
2. **Items lost 급감**: 5→2 (-3 defects 복원). Structure 가 해결
3. **Depth 대폭 향상**: 51.5% → 67.6% (+16.1%). Broad + niche lens 혼합
4. **사용자 원칙 부합**: "mece 하지 않음이 품질 보증" 과 일치. Broad (logic/evolution/axiology) + niche (coverage/semantics/structure) 혼합 — overlap 유지
5. **Policy compatible**: Axiology always_include 유지

### 4.3 비용 변화

- Lens count: 4 → 6 (**+50% LLM call**)
- Full 9 lens 대비: 67% 비용
- 절감 측면에서는 현 core-axis 보다 늘어남. 그러나 **quality-per-cost ratio 는 우수**

| 구성 | 비용 | Coverage | Cov/Cost |
|---|---|---|---|
| Current (4) | 4 | 77.4% | 19.4 |
| Option P' (6) | 6 | 86.4% | 14.4 |
| Full (9) | 9 | 100% | 11.1 |

Cov/Cost 는 current 가 높지만 **depth retention** (51.5% vs 67.6%) 을 감안하면 Option P' 의 quality 이득이 1.5x cost 를 정당화.

### 4.4 대안 Option P (5 lens) 과의 비교

| 지표 | P (5 lens) | P' (6 lens) |
|---|---|---|
| Coverage | 84.8% | **86.4%** (+1.6%) |
| Depth retention | 57.4% | **67.6%** (+10.2%) |
| Items lost | 4 | **2** (-2) |
| 비용 | 5 | 6 (+1 lens) |

P' 이 더 expensive 하지만 3 dimension 모두에서 상당한 quality 개선. **+1 lens 투자 대비 significant**.

## 5. 영향 범위

### 5.1 변경 대상

| 파일 | 변경 |
|---|---|
| `authority/core-lens-registry.yaml` | `core_axis_lens_ids` 4 → 6 lens |
| `authority/core-lens-registry.yaml` 주석 | 선정 근거 empirical 로 갱신 |
| `processes/review/review.md` | core-axis 설명 (6 lens 명시) |
| `processes/configuration.md` | review_mode 절 |
| `BLUEPRINT.md` | Full vs Core-Axis Review 표 |
| `CHANGELOG.md` | Minor version bump 또는 note |

**코드 변경 최소**: `core_axis_lens_ids` array 값만 수정. Parser / resolver / type 등 logic 은 unchanged (lens set 변동만).

### 5.2 버전 정책

v0.2.0 (core-axis rename) 의 후속이므로 **v0.2.1 patch** 가 자연:
- Lens set 재구성은 behavior 변경이지만 **breaking 아님** (기존 config `review_mode: core-axis` 여전히 작동)
- 외부 영향: core-axis 를 쓰던 사용자는 review cost 증가 (+50%) — notify 필요

CHANGELOG 에 `### Changed` 항목으로 명시.

### 5.3 Tests

- `config-profile.test.ts` / `e2e-codex-multi-agent-fixes.test.ts` / `codex-nested-dispatch.test.ts`: `review_mode: "core-axis"` 사용 시 lens set 가정 있으면 갱신
- 신규 unit test: core-axis 가 exactly 6 lens emit 확인

## 6. 구현 단계 (proposal 합의 후)

### Step 1 — SSOT 갱신
- `authority/core-lens-registry.yaml`:
  - `core_axis_lens_ids`: 4 → 6 lens
  - 주석: empirical rationale (v5 benchmark 참조)
- Rename 이력 주석은 그대로 유지

### Step 2 — Tests
- Registry 로딩 test 에서 core_axis_lens_ids.length === 6 확인
- E2E test 가 core-axis 실행 시 6 lens 소비 확인

### Step 3 — Documentation
- BLUEPRINT.md / review.md / configuration.md 의 "4 lens" 설명을 "6 lens" 로 갱신
- Empirical 근거 note 추가 (benchmark reference)

### Step 4 — Version bump + CHANGELOG
- package.json `0.2.0` → `0.2.1`
- CHANGELOG `### Changed — core-axis lens set recomposed from 4 to 6` 섹션

### Step 5 — Memory 갱신
- `project_core_axis_rename_complete.md`: v0.2.1 recomposition 추가
- 신규 `project_core_axis_empirical_recomposition.md`: 본 proposal + 구현 기록

## 7. 주체자 의사결정 (§7)

| 항목 | 권장 | 대안 |
|---|---|---|
| 구성 | Option P' (6 lens) | Option P (5) / k=6 best w/o axiology / Current (4) / Full (9) |
| Pragmatics 처리 | 제거 | 유지 (4→5 lens 대체) |
| Coverage/semantics/structure 추가 | 3 개 모두 | 일부만 |
| Version bump | 0.2.0 → 0.2.1 (patch) | 0.2.0 → 0.3.0 (minor, 비용 변화 신호) |
| 외부 사용자 notify | CHANGELOG 명시 | 별도 notice 추가 |
| Sample 확장 먼저 | 현 데이터로 충분 | 더 많은 Accounted findings 수집 후 재결정 |

## 8. Caveat

### 8.1 Depth sample 한계

24 consensus items (5 session) 만 depth 분석 대상. 작은 sample:
- 1 session 의 8-lens outlier 영향 — 결과 왜곡 가능
- "Accounted findings" pattern 은 최근 format. 과거 synthesize 는 attribution 미기록
- Generalizability 제한 — domain-specific target 은 다를 수 있음

### 8.2 Quality-vs-coverage 등가 가정 미검증

Coverage + depth metric 은 proxy. 실제 review quality (defect 발견의 correctness, actionability) 는 직접 측정 안 됨. Option P' 이 수치 상 최적이라도 실제 review 품질은 **direct comparison 실험** 으로 확인 필요.

### 8.3 Lens role 변화 미고려

본 분석은 현 lens role (authority/core-lens-registry.yaml) 기준. 만약 future 에 lens role 이 재정의되면 optimal set 도 변동.

### 8.4 Synthesize bias 가능성

V5 round1 validation 에서 synthesize quality 는 accurate 로 확인됐지만 3 session sample. 다른 session 은 다를 수 있음.

## 9. 후속 research 제안

### 9.1 Direct comparison 실험
- 같은 target 에 Option P' vs full 9 lens 실행 후 finding 일치도 측정
- "Option P' 이 full 의 86-90% finding 을 포착하는가" empirical 확인
- 비용: full 실행 × N + Option P' × N, claude-sonnet 기준 $2-5

### 9.2 Synthesize contract 개정
- 모든 review 에서 "Accounted findings" pattern 필수화
- 이후 수집된 data 는 depth measurement 가능
- Option P'/P/Q 중 re-analysis 대상 확장

### 9.3 Lens role refinement
- 본 분석으로 "structure / coverage / semantics 의 non-substitutability" 확인
- 이 insight 를 authority/core-lens-registry.yaml 의 purpose 주석에 empirical note 추가
- 미래 lens 추가 시 "complementary domain 확인" 를 policy 화

## 10. 참조

- **Benchmark**: `development-records/benchmark/20260419-lens-contribution-analysis.md` (v5 canonical)
- **Rename proposal**: `development-records/evolve/20260418-light-to-core-axis-rename-proposal.md` (PR #126/#127/#128)
- **Silent failure mitigation (superseded)**: `development-records/evolve/20260419-core-axis-silent-failure-mitigation.md` (PR #129 같은 branch)
- **Scripts**: `scripts/analytics/parse-final-outputs.ts`, `v5-filtered-set-cover.ts`, `compute-set-cover.ts`, `compute-set-cover-from-unique.ts`
- **Memory**: `project_core_axis_rename_complete.md`, `project_light_review_lens_design.md` ((b)(c) 해소는 본 proposal 의 후속 작업)
