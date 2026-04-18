---
as_of: 2026-04-19
status: tier-1-complete-tier-2-pending
functional_area: lens-contribution-empirical-analysis
revision_history:
  - "2026-04-19 v1: Tier 1 with onto-4 only (n=19 full). 초기 pattern 탐지"
  - "2026-04-19 v2: Sample 확장 — ~/cowork/* 전체 16 프로젝트 scan, 1440 session parsed (n=479 full, 961 light). 통계 신뢰도 급증. 순위 pattern 일관 (coverage/semantics/conciseness/evolution 최상위), 현재 core-axis 의 3/4 lens 가 하위 tier 확인"
  - "2026-04-19 v3: Metric 정정 — 사용자가 unique rate 가 잘못된 metric 임을 지적. 진짜 measure 는 set-cover (최소 lens 조합으로 전체 finding cover). Phase A (5 session, 'Accounted findings' format) 결과로 logic (60%) + evolution (60%) 가 set-cover top, coverage/semantics 는 하위. Unique rate 와 반대 결과 — cross-lens overlap 때문"
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

### 2.3 데이터 현황 (v2 — 전수 sample)

주체자 제안: onto-4 뿐 아니라 **이 컴퓨터의 모든 onto project** 의 review session 을 data pool 로 활용. `~/cowork/*/.onto/review/` 16 root 일괄 scan.

| 분류 | Session 수 | Empirical 가치 |
|---|---|---|
| Full mode | **479** | **핵심 pool** (9 lens 전수 실행) |
| Light mode | 961 | 거의 모두 `- none` (mock/smoke test) — 제외 |
| **총 parsed** | **1440** | 전체 session dir 1744 중 parse 성공 |

**Top contributing projects**:
- `onto`: 1340 (주력 개발 repo)
- onto-4: 29
- AI-data-dashboard: 20 + AI-data-dashboard-2: 22 (data domain)
- day1co-ontology: 11 (business ontology)
- ai-support-system: 9, onto-3: 9

**Domain diversity 확보**: AI/data, business ontology, finance, support system 등 — 이전 onto-4 만 본 pool 의 "design proposal / meta doc bias" 가 대폭 해소.

## 3. 결과 — Full mode 479 session 분석

### 3.1 Per-lens appearance rate (v2, 대규모 sample)

| 순위 | Lens | Total unique | Session w/unique | **Appearance rate** | Avg when appears |
|---|---|---|---|---|---|
| 1 | **coverage** | 37 | 34/479 | **7.1%** | 1.09 |
| 2 | **semantics** | 41 | 33/479 | **6.9%** | 1.24 |
| 3 | **conciseness** | 44 | 30/479 | **6.3%** | 1.47 |
| 4 | **evolution** | 32 | 28/479 | **5.8%** | 1.14 |
| 5 | structure | 23 | 22/479 | 4.6% | 1.05 |
| 6-7 | logic | 21 | 18/479 | 3.8% | 1.17 |
| 6-7 | dependency | 21 | 18/479 | 3.8% | 1.17 |
| 8-9 | pragmatics | 22 | 17/479 | 3.5% | 1.29 |
| 8-9 | axiology | 20 | 17/479 | 3.5% | 1.18 |

### 3.2 v1 (n=19) vs v2 (n=479) 비교

| Lens | v1 rate | v2 rate | Pattern |
|---|---|---|---|
| coverage | 36.8% | 7.1% | 상위 유지 |
| semantics | 36.8% | 6.9% | 상위 유지 |
| conciseness | 31.6% | 6.3% | 상위 유지 |
| evolution | 31.6% | 5.8% | 중상위 유지 |
| axiology | 26.3% | 3.5% | 중 → 하위 (always_include 정책상 unique 낮은 것 자연) |
| logic | 21.1% | 3.8% | 하위 유지 |
| structure | 21.1% | 4.6% | 하위-중 유지 |
| dependency | 21.1% | 3.8% | 하위 유지 |
| pragmatics | 21.1% | 3.5% | 하위 유지 |

**절대값은 전반 감소** (onto-4 의 meta-doc bias 제거 효과), **순위 pattern 은 매우 일관**. 큰 pool 이 작은 pool 의 trend 를 confirm.

### 3.3 Session-level aggregate

| Metric | Full mode avg (n=479) |
|---|---|
| Consensus items / session | 1.7 |
| Conditional consensus items | 1.6 |
| Disagreement items | 2.4 |

즉 479 session 평균 각 ~5.7 finding/decision 생성. 낮은 unique rate 는 **lens 들의 overlap 이 크다** 는 증거 — 많은 finding 이 여러 lens 공동 발견 (consensus) 또는 conditional 로 분류.

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

### 4.2 경험적 재배열 (v2 대규모 sample 기반)

**Top-4 appearance rate (unique contribution 기준)**:
- **coverage** (7.1%)
- **semantics** (6.9%)
- **conciseness** (6.3%)
- **evolution** (5.8%)

**Axiology 의 특별 지위**: 대규모 sample 에서 axiology appearance rate 가 3.5% (하위) — 단 axiology 는 `always_include_lens_ids: [axiology]` 로 등록된 **정책적 always-include**. 역할이 "purpose/value alignment guard" 이므로 unique finding 발생량 기준 평가 부적절. 유지 권장.

### 4.3 경험적 core-axis 후보 (정책 axiology 유지 가정)

| Option | 구성 | Lens 수 | Appearance rate 총합 | 현 core-axis 와의 공통 |
|---|---|---|---|---|
| **α (권장)** | axiology + coverage + semantics + evolution | 4 | 23.3% | 2 (axiology, evolution) |
| β | axiology + coverage + semantics + conciseness + evolution | 5 | 29.6% | 2 |
| γ | axiology + coverage + semantics | 3 | 17.5% | 1 (axiology) |

**현 core-axis (logic, pragmatics, evolution, axiology) 의 appearance rate 총합: 16.2%**

Option α 는 동일 lens 수 (4) 로 appearance rate 총합 **16.2% → 23.3% (+44%)** 향상. logic + pragmatics 를 coverage + semantics 로 교체.

Option β 는 +1 lens (5) 로 **29.6% (+83%)**. 비용 25% 증가 대비 coverage 83% 증가 — cost-effective.

Option γ 는 -1 lens (3) 로 **17.5% (+8%)**. 비용 25% 감소 대비 coverage 약간 증가 — 공격적 절감.

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

## 5. Caveat 요약 (v2 updated)

| 항목 | Caveat |
|---|---|
| Sample size | **해소**: 479 full session — 통계적 유의 확보 |
| Target bias | **대폭 해소**: 16 project domain diversity (AI/data, business, finance, support, ontology) |
| Severity missing | appearance rate 는 빈도만 — **blocking/major/minor** 분류 미반영. 드물지만 critical finding 을 놓치면 큰 손실 (Tier 2 필요) |
| Cross-lens overlap | 본 Tier 1 은 unique 만 측정. **overlap 정량은 Tier 2 필요** — 낮은 rate 가 "redundant" 인지 "high-overlap 으로 consensus 에 흡수" 인지 구분 |
| Always-include lens 고유 | axiology 는 정책 reserved. unique 기준 평가 부적절. Option 에 유지 |
| No full-vs-reduced direct comparison | 같은 target 에 (full 9-lens) + (reduced N-lens) 실측 비교 없음. 예측 simulation 만 가능 — 후속 연구 |

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

## 6.5 v3 — Set-cover metric (사용자 정정 2026-04-19)

### 6.5.1 Metric 정정의 핵심

사용자 지적: **unique appearance rate 는 잘못된 metric**. 진짜 질문은 "lens N 개 조합이 전체 finding 을 cover 하려면 최소 어떤 조합인가?" — set cover problem.

- Unique rate: lens 가 **독자** 기여한 빈도
- **Set cover**: lens 가 cover 하는 finding 중 **다른 lens 로 replace 불가** 한 비율

한 review 에서 5 finding 이 나왔고 각 finding 이 여러 lens 중첩 보고로 통합된 경우, 더 적은 lens 로도 동일 coverage 가능. 그 최소 조합이 경제적 optimal.

### 6.5.2 Phase A — "Accounted findings" 패턴 있는 5 session

Data source: `.onto/review/<session>/final-output.md` 의 Consensus / Conditional / Disagreement 섹션에 "Accounted findings: lens-N, lens-M" pattern 기록된 session. 1414 session 중 5 만 해당 (최근 format).

Script: `scripts/analytics/compute-set-cover.ts`

Per-session result:

| Session | Findings | Min cover size | Min cover |
|---|---|---|---|
| onto/ee929b92 | 4 | 1 | logic |
| onto/498f7b5c | 4 | 3 | evolution, logic, pragmatics |
| onto/cbd79411 | 5 | 3 | conciseness, logic, semantics |
| onto/a872a35c | 6 | 3 | dependency, evolution, structure |
| onto-4/32926f57 | 5 | 4 | axiology, coverage, evolution, structure |

**Avg min cover size: 2.80 lenses** — 9 lens 의 **31%** 로 coverage 가능. 사용자 가설 empirical 확인.

### 6.5.3 Set-cover 순위 vs Unique rate 순위

| Lens | Set-cover 출현 (5 session) | Unique rate v2 (479 session) | 해석 |
|---|---|---|---|
| **logic** | **60%** | 3.8% (하위) | 역전 — universal anchor |
| **evolution** | 60% | 5.8% (중상위) | 양쪽 상위 |
| structure | 40% | 4.6% | 중상위 |
| coverage | 20% | 7.1% (최상위) | 역전 — replaceable |
| semantics | 20% | 6.9% (최상위) | 역전 — replaceable |
| conciseness | 20% | 6.3% | 중 |
| dependency | 20% | 3.8% | 중 |
| pragmatics | 20% | 3.5% | 하위 |
| axiology | 20% | 3.5% | 하위 |

**Coverage / semantics 역전의 원인**: unique finding 빈도는 높지만 **다른 lens 도 같은 finding 을 중복 보고** → replaceable. 비용 관점에서는 redundant coverage.

**Logic 이 universal anchor**: 모든 k=3, k=4 top combination 에 포함. 논리 일관성이 다른 domain 검증의 공통 기반이기 때문.

### 6.5.4 k-subset universal cover

| k | 최고 cover 율 | Top combination |
|---|---|---|
| 3 | 40% (2/5) | logic 필수 + 2 more |
| 4 | 60% (3/5) | logic 필수 + (conciseness or dependency) |
| 5 | 80% (4/5) | {conciseness, dependency, evolution, logic, structure} |

5 lens 가 80% session cover — 9 lens 의 55% 비용으로 4/5 session 완전 커버.

### 6.5.5 현 core-axis 재평가 (v3 기준)

현 core-axis = (logic, pragmatics, evolution, axiology)
- Logic (60%) + evolution (60%) — 유지 타당
- Pragmatics (20%) + axiology (20%) — niche, 교체 후보

Tentative 경험적 후보:
- **Option A3**: {logic, evolution, structure, coverage} — required category 보완
- **Option B3**: {logic, evolution, structure, conciseness} — conciseness 가 required 1 session
- **Option C3**: {logic, evolution, structure} — 3 lens, 공격적

### 6.5.6 Phase A 의 통계 한계

5 session 는 **방법론 proof-of-concept** 로만 해석. Quantitative 결론은 Phase B (LLM 기반 legacy attribution, 475 full session 확장) 후.

### 6.5.7 Phase B 설계

**목적**: 1409 legacy session (Accounted findings 없음) 의 lens attribution 을 LLM 으로 추정.

**방법**:
- Input: 각 session 의 final-output.md (Consensus/Conditional/Disagreement sections) + round1/*.md 9 lens
- Prompt: 각 finding item 에 대해 "이 결함을 어느 lens 들에서 명시적으로 발견했는가" 질의
- Output: finding_id → contributing_lenses list

**비용 추정**:
- 475 session × 1 LLM call (input 15-25K tokens, output 1-2K tokens)
- claude-sonnet-4-6 기준 $0.025/call → **약 $12**
- 시간: 병렬 10 concurrent → ~15-25 분

**결과**: Phase A 의 5 → 480 sample 확대, 통계 유의성 확보.

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
