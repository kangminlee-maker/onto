---
as_of: 2026-04-19
status: tier-1-complete-tier-2-pending
functional_area: lens-contribution-empirical-analysis
revision_history:
  - "2026-04-19: Tier 1 (final-output.md 기반 unique finding count) 완료. Tier 2 (LLM cross-lens detectability) 보류. 초기 결과로 현재 core-axis 구성의 경험적 재평가 제안"
purpose: |
  Core-axis review mode 의 lens 구성을 **실제 review 실행 데이터** 기반으로
  재평가. 주체자 2026-04-19 정정: core-axis 의 목적은 "meta-level 4 axis
  보존" 이 아니라 "최소 비용으로 full-review 와 유사한 coverage 달성". 9
  lens 는 MECE 하지 않으며 이 겹침이 품질 보증 메커니즘. 경제적 최적 조합
  은 empirical 검증으로 결정해야 함.

  본 benchmark 는 Tier 1 (deterministic parsing) 결과. Tier 2 (LLM 기반
  cross-lens detectability) 는 다음 cycle.
authority_stance: empirical-benchmark-record
canonicality: scaffolding
source_refs:
  trigger_memory: "~/.claude-1/projects/-Users-kangmin-cowork-onto-4/memory/project_light_review_lens_design.md"
  user_redefinition: "2026-04-19 세션 — core-axis 목적 재정의 (경제성 + full 근사 coverage). lens non-MECE 특성 긍정적 재평가"
  preceded_proposal: "development-records/evolve/20260419-core-axis-silent-failure-mitigation.md (PR #129) — 전제 오류로 retro 재검토 필요"
  parse_script: "scripts/analytics/parse-final-outputs.ts"
  raw_data: ".onto/temp/analytics/enhanced-stats.tsv (session-local, gitignored)"
---

# Lens Contribution Empirical Analysis — Tier 1 (2026-04-19)

## 1. 배경 — 재정의된 core-axis 목적

### 1.1 주체자 정정 (2026-04-19)

지금까지 `authority/core-lens-registry.yaml` 의 주석 ("meta-level 판단 축 4 개") 을 **core-axis 의 design intent** 로 해석. PR #126/#127 rename 과 PR #129 의 signal proposal 이 이 전제 위에서 작성됨.

주체자 설명으로 전제 정정:

- **core-axis 의 목적**: meta-level 4 axis 보존이 **아님**. "최소 비용으로 full-review 와 유사한 coverage 달성" — **경제성 + 실용성**
- **"meta-level 4 axis"**: 현재의 **잠정 구성**, 본질이 아님
- **Lens 는 MECE 하지 않음**: 이 겹침은 결함이 아니라 **품질 보증 메커니즘**. 다중 독립 검증으로 false negative 상쇄
- **경제성 확보**: 겹침을 활용해 lens 를 줄여도 유사 coverage 유지 가능. 최적 조합은 **empirical 검증**

### 1.2 연구 질문

> **과거 review 실행 데이터 기반으로, 어떤 lens N 개 조합이 full-review 대비 최대 coverage 를 유지하면서 비용 최소화를 달성하는가?**

그 조합이 경험적 optimal core-axis. dependency/coverage 포함 여부, 현재 4 중 제거 후보 등은 **데이터가 결정**.

## 2. 방법론

### 2.1 Tier 1 (본 benchmark) — Deterministic parsing

**Input**: `.onto/review/<session>/final-output.md` 의 structured 섹션
- `### Unique Finding Tagging`: lens 별 unique finding 목록 (synthesize lens 가 이미 수행한 cross-lens classification)
- `### Consensus`: 다수 lens 동의 finding 수 (cross-lens overlap proxy)
- `### Conditional Consensus` / `### Disagreement`: 부분 동의 / 비동의 수

**Extraction**: `tsx` script — 정규식 기반, LLM 호출 0
- Script: `.onto/temp/analytics/parse-final-outputs.ts`
- Output: `.onto/temp/analytics/enhanced-stats.tsv`

**Metric**:
- **Appearance rate**: 해당 lens 가 session 중 unique finding 1 개 이상 보고한 비율 — "lens 가 자주 독자 기여하는가"
- **Total unique count**: 전체 session 에서 lens 가 기여한 unique finding 총합
- **Avg when appears**: 기여 session 당 평균 unique finding 수 — "등장하면 얼마나 기여하는가"

### 2.2 Tier 2 (보류, 다음 cycle) — LLM cross-lens detectability

각 unique finding 에 대해 "다른 lens 가 이 결함을 포착 가능했을까?" LLM 질의:

- Input: 각 finding 의 claim + evidence + target text
- Output: detectable_by list (해당 finding 을 볼 수 있는 lens 집합)
- 판정: finding 마다 "진짜 unique" vs "겹침 가능" classification

**추정 비용**: 16 session × avg 3-5 unique finding × 1 LLM call ≈ 50-80 calls (claude-sonnet-4-6 기준 ~$0.30-0.50)

### 2.3 데이터 현황

| 분류 | Session 수 | Empirical 가치 |
|---|---|---|
| Full mode | 19 | **핵심 pool** (9 lens 전수 실행) |
| Light mode | 10 | **제외** (모두 `mock-runner-generated` 또는 `- none` — smoke test) |
| 총 | 29 | |

Full 19 session 중 3 개는 `Consensus (0/9)` — 모든 lens 가 finding 없음 또는 incomplete state. 이들도 appearance rate 계산에 포함 (negative example 의 의미).

## 3. 결과 — Full mode 19 session 분석

### 3.1 Per-lens appearance rate

| Lens | Total unique | Session w/unique | **Appearance rate** | Avg when appears |
|---|---|---|---|---|
| **semantics** | 8 | 7/19 | **36.8%** | 1.14 |
| **coverage** | 7 | 7/19 | **36.8%** | 1.00 |
| evolution | 7 | 6/19 | 31.6% | 1.17 |
| conciseness | 7 | 6/19 | 31.6% | 1.17 |
| axiology | 5 | 5/19 | 26.3% | 1.00 |
| logic | 5 | 4/19 | 21.1% | 1.25 |
| structure | 4 | 4/19 | 21.1% | 1.00 |
| dependency | 5 | 4/19 | 21.1% | 1.25 |
| pragmatics | 7 | 4/19 | 21.1% | **1.75** |

### 3.2 Session-level aggregate

| Metric | Full mode avg |
|---|---|
| Consensus items / session | 2.7 |
| Conditional consensus items | 2.8 |
| Disagreement items | 2.5 |

즉 19 session 평균 각 8.0 정도의 finding/decision 생성. 그 중 unique 는 lens 별로 분산.

## 4. 해석

### 4.1 현재 core-axis 재평가

현재 core-axis = (logic, pragmatics, evolution, axiology):

| Lens | Appearance rate | 순위 (전체 9 중) |
|---|---|---|
| evolution | 31.6% | 3위 그룹 |
| axiology | 26.3% | 5위 |
| logic | 21.1% | 6-9위 tier |
| pragmatics | 21.1% (avg 1.75) | 6-9위 tier |

**관찰**: 현재 4 lens 중 2 (logic, pragmatics) 가 appearance rate **최저 tier**. 제외된 5 lens 중 semantics + coverage 가 오히려 최고 tier.

### 4.2 경험적 재배열 (tentative, caveat 참조)

Appearance rate 상위 4 기준 재구성 시:

- **semantics** (36.8%)
- **coverage** (36.8%)
- **evolution** (31.6%)
- **conciseness** (31.6%)

혹은 상위 5 (axiology 포함): + **axiology** (26.3%)

이 조합이 **현재 4 보다 empirical 적으로 우수** (appearance rate 총합 기준).

### 4.3 중요 caveat — 해석의 양면성

Appearance rate 가 낮음 = "제거 가능" 인지 "다른 lens 가 커버 중" 인지 **현 Tier 1 으로는 구분 불가**:

- 가능성 A: 해당 lens 가 실제로 적은 경우 unique 기여 (낮은 기여도)
- 가능성 B: 해당 lens 가 발견한 결함이 다른 lens 와 **겹쳐서 consensus 로 잡힘** (높은 overlap, unique 에 안 나타남)

가능성 B 가 다수라면 해당 lens 제거 시 **consensus 가 약화됨** (다중 독립 검증의 redundancy 손실). 품질 보증이 약화될 risk.

**이 양면성 구분 = Tier 2 의 핵심 목표**.

### 4.4 특이 pattern — pragmatics

pragmatics: appearance rate 21.1% (저), **avg when appears 1.75** (최고).

해석: 특정 target 유형 (아마도 host-facing interface, UX document 등) 에서 **한 번 나타나면 wholesale 기여**. 평균적 기여는 낮지만 **conditional 기여는 높음**.

즉 pragmatics 제거 시 평균 session 은 영향 적지만 **특정 유형의 review 에서 크게 손실**. "일반 제거" 부적절 — 조건부 활성화 또는 signal-based approach 적절할 수 있음.

## 5. Caveat 요약

| 항목 | Caveat |
|---|---|
| Sample size | 19 full session — 통계적 유의 확보 어려운 규모. 초기 pattern 탐지용 |
| Target bias | session target 이 design proposal / meta doc 중심 — content-level 결함 (dep/cov 류) 이 원래 많을 가능성. domain-specific content 분석 target 이 부족 |
| Severity missing | appearance rate 는 빈도만 — **blocking/major/minor** 분류 미반영. 드물지만 critical finding 을 놓치면 큰 손실 |
| Cross-lens overlap | 본 Tier 1 은 unique 만 측정. overlap 정량은 Tier 2 필요 |
| No full-vs-reduced direct comparison | 같은 target 에 (full 4-lens) + (reduced 3-lens) 실측 비교 없음. 예측 simulation 만 가능 |

## 6. Tentative 제안 (확정 X)

### 6.1 단기 — 본 결과로 할 수 있는 것

1. **Core-axis 재구성 후보 탐색**: 아래 3 option 중 Tier 2 로 검증:
   - Option X: (semantics, coverage, evolution, axiology) — 4 lens, 현 core-axis 교체
   - Option Y: (semantics, coverage, evolution, conciseness, axiology) — 5 lens, 1 추가
   - Option Z: (semantics, coverage, axiology) — 3 lens, 1 감소

2. **pragmatics 의 conditional activation**: avg_when_appear 1.75 이므로 특정 trigger (예: target 이 interface / UX / command 류) 에서만 활성. PR #129 의 signal 메커니즘 재활용 가능

### 6.2 중기 — Tier 2 실행

LLM classification 으로 각 unique finding 의 "다른 lens 가 포착 가능했을까" 판정. 본 Tier 1 의 양면성 (§4.3) 해소.

### 6.3 장기 — Data expansion

- 같은 target 에 **여러 lens 조합** 의도적 실행 (direct comparison 쌍 증가)
- Domain-specific target (현재 bias 완화)
- severity classification 수집 (blocking/major/minor 구분)
- 새 pattern 확인되면 재분석

## 7. 본 benchmark 의 lifecycle

- **Active**: Tier 2 실행 전까지
- **Updated**: Tier 2 완료 시 본 파일에 §8 Tier 2 결과 추가
- **Superseded**: core-axis 재구성 PR 머지 시점에 archive

## 8. 참조

- 주체자 재정의 (2026-04-19 세션)
- Memory `project_light_review_lens_design.md` — 본 empirical 분석의 trigger ((b)(c) 해소)
- PR #129 (`20260419-core-axis-silent-failure-mitigation.md`) — 전제 오류 발견의 시발점. signal 메커니즘 자체는 pragmatics 조건부 활성화 등에서 재사용 가능
- PR #126/#127/#128 — core-axis rename (이름만 변경, 구성은 잠정 유지)
- `scripts/analytics/parse-final-outputs.ts` — Tier 1 parser (재실행 가능)
- `.onto/temp/analytics/enhanced-stats.tsv` — raw data (session-local, gitignored)
