# Business Domain Upgrade — Execution Contracts

> 목적: 8-agent panel review (세션 20260331-1101bc80)에서 도출된 5가지 실행 계약.
> 이 계약이 확정된 후 Wave 1/2/3 실행을 시작한다.
> 참조 표준: software-engineering domain (Inter-Document Contract 포맷)

---

## Contract 1: Section Manifest + Wave Boundary Gate

### 1.1 Section Manifest

모든 파일의 H2/H3 섹션명을 사전 확정한다. Wave 에이전트는 이 manifest에 정의된 섹션명만 사용하며, manifest에 없는 섹션을 생성하지 않는다.

#### domain_scope.md (Wave 1A — Agent A)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Major Sub-areas | existing→update | 7 major + 3 modern extensions, applicability marker normalization |
| H3 | Strategic Management | existing | Porter, VRIO, Ansoff, BCG, Blue Ocean |
| H3 | Marketing | existing | STP, 4P/7P, Customer Journey, Brand Equity |
| H3 | Finance | existing | Capital Budgeting, Capital Structure, Working Capital, Valuation |
| H3 | Operations Management | existing | Lean, Six Sigma, TOC, SCM, Quality, Automation |
| H3 | Organization & HR | existing | Mintzberg, Agency Theory, Stakeholder Theory, Competency, Change |
| H3 | Innovation Management | existing | Disruption, Tech Adoption, Design Thinking, R&D |
| H3 | Governance & Risk | existing | Corporate Governance, COSO ERM, Business Law, ESG |
| H3 | Modern Extensions | existing | Platform, Subscription, AI — 하위 구조 유지 |
| H2 | Required Concept Categories | existing | 8 categories table |
| H2 | Reference Standards/Frameworks | existing | framework table — 확장 가능 |
| H2 | Scale Tier Definitions | **NEW** | deterministic employee-count states + scale unknown contract |
| H3 | Scale Assessment Input Contract | **NEW** | employee_count/as_of/source/confidence/lifecycle flags |
| H2 | Bias Detection Criteria | existing→expand | 9→18 criteria (normative + scale-context 포함) |
| H2 | Inter-Document Contract | **NEW** | Rule Ownership + Required Substance + Cross-cutting Attribution + CQ mapping |
| H3 | Rule Ownership | **NEW** | file ownership per cross-cutting topic |
| H3 | Required Substance per Sub-area | **NEW** | ghost sub-area prevention |
| H3 | Cross-cutting Concern Attribution | **NEW** | primary enforcement point rule |
| H3 | Classification Axis Relationships | **NEW** | scope/rules/verification axis alignment |
| H3 | Sub-area to CQ Section Mapping | **NEW** | sub-area → CQ prefix mapping |
| H2 | Related Documents | existing→update | section-level references |

#### concepts.md (Wave 1B — Agent B)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Strategic Management Core Terms | existing→expand | real examples, case references |
| H2 | Marketing Core Terms | existing→expand | real examples |
| H2 | Finance Core Terms | existing→expand | benchmarks with as_of metadata |
| H2 | Operations Management Core Terms | existing→expand | Lean/Six Sigma real results |
| H2 | Organization/HR Core Terms | existing→expand | Mintzberg real examples |
| H2 | Innovation Management Core Terms | existing→expand | disruption cases |
| H2 | Governance/Risk Core Terms | existing→expand | governance failures |
| H2 | Platform/Subscription/AI Extension Terms | existing→expand | metrics, real cases |
| H2 | Benchmark Registry | **NEW** | time-sensitive benchmarks SSOT (as_of tagged) |
| H2 | Homonyms Requiring Attention | existing→expand | new conflicts from case additions |
| H2 | Interpretation Principles | existing→expand | modern business principles |
| H2 | Related Documents | existing→update | section-level references |

#### logic_rules.md (Wave 1C — Agent C)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Strategy Analysis Logic | existing→expand | anti-patterns with real failure cases |
| H2 | Marketing Logic | existing→expand | digital marketing logic |
| H2 | Financial Decision-Making Logic | existing→expand | NPV/IRR conflict cases |
| H2 | Operations Management Logic | existing→expand | Lean/Six Sigma application logic |
| H2 | Cost Classification Logic | existing | minor updates only |
| H2 | Change Management Logic | existing→expand | circular dependency resolution |
| H2 | Innovation Logic | existing→expand | disruption response logic |
| H2 | Platform Business Logic | **NEW** | network effects, take rate, governance rules |
| H2 | Subscription Economy Logic | **NEW** | LTV/CAC, churn, J-curve rules |
| H2 | AI Business Logic | **NEW** | data moat, AI ethics, algorithmic decision rules |
| H2 | Constraint Conflict Checking | existing→expand | modern business conflicts added |
| H2 | Transfer Patterns | **NEW** | cross-industry logic transfer patterns |
| H2 | Related Documents | existing→update | section-level references |

#### structure_spec.md (Wave 1D — Agent D)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Business System Required Elements | existing→expand | digital business elements |
| H2 | Required Relations | existing→expand | platform/subscription relations |
| H2 | Hierarchy Structure Principles | existing→expand | agile/digital fluidity |
| H2 | Strategy-Marketing-Operations Alignment | existing→expand | real alignment examples |
| H2 | Organization-Strategy Fit | existing→expand | digital org types added |
| H2 | Core System Key Structure (M&A Compatibility) | existing | minor updates |
| H2 | Authority and Responsibility Separation | existing→expand | platform/AI authority |
| H2 | Digital Business Structure | **NEW** | platform governance, subscription metrics, AI decision structure |
| H2 | Domain Boundary Management | existing→update | updated for modern extensions |
| H2 | Isolated Node Prohibition | existing | minor updates |
| H2 | Related Documents | existing→update | section-level references |

#### dependency_rules.md (Wave 1E — Agent E)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Strategy-Execution Dependency | existing→expand | real failure cases |
| H2 | Strategy-Marketing Dependency | existing→expand | digital marketing dependencies |
| H2 | Finance-Strategy Dependency | existing→expand | valuation dependency chains |
| H2 | Organization-Strategy Dependency | existing→expand | structure transition dependencies |
| H2 | Change Management Circular Dependency | existing→expand | more resolution patterns |
| H2 | Organization-Process Dependency | existing→expand | automation redeployment |
| H2 | Operations-Quality Dependency | existing→expand | supply chain risk integration |
| H2 | Governance-ESG Relationship | existing→expand | ESG regulation convergence |
| H2 | M&A Dependency | existing | minor updates |
| H2 | Source of Truth Management | existing→integrate | integrated with Rule Ownership in domain_scope.md |
| H2 | Platform Dependency Chains | **NEW** | multi-sided market dependencies |
| H2 | AI/Data Dependency | **NEW** | data pipeline, model governance dependencies |
| H2 | Related Documents | existing→update | section-level references |

#### competency_qs.md (Wave 2F — Agent F)

Full restructure. See Contract 2 for specification.

#### extension_cases.md (Wave 2G — Agent G)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | Case 1: Adding a New Revenue Source | existing→enhance | real case + impact matrix |
| H2 | Case 2: M&A (Mergers & Acquisitions) | existing→enhance | real case + impact matrix |
| H2 | Case 3: Automation Introduction/Expansion | existing→enhance | real case + impact matrix |
| H2 | Case 4: Market/Regional Expansion | existing→enhance | real case + impact matrix |
| H2 | Case 5: Business Model Transition | existing→enhance | real case + impact matrix |
| H2 | Case 6: Technology Adoption (Digital Transformation) | existing→enhance | real case + impact matrix |
| H2 | Case 7: Organizational Scale Expansion | existing→enhance | real case + impact matrix |
| H2 | Case 8: Competitive Environment Change Response | existing→enhance | real case + impact matrix |
| H2 | Case 9: Platform Governance Crisis | **NEW** | take rate dispute, seller revolt, regulatory action |
| H2 | Case 10: Subscription Churn Crisis | **NEW** | rapid churn, pricing reset, retention |
| H2 | Case 11: Benchmark/Standard Version Update | **NEW** | WACC recalc, regulatory change, framework version update |
| H2 | Impact Matrix Template | **NEW** | standardized format for all cases |
| H2 | Related Documents | existing→update | section-level references |

#### conciseness_rules.md (Wave 3H — Agent H)

| Level | Section Name | Status | Description |
|-------|-------------|--------|-------------|
| H2 | 1. Allowed Redundancy | existing→expand | modern business patterns |
| H2 | 2. Removal Target Patterns | existing→expand | case duplication patterns |
| H2 | 3. Minimum Granularity Criteria | existing | no change |
| H2 | 4. Boundaries | existing | no change |
| H2 | 5. Quantitative Criteria | existing→populate | review-accumulated thresholds |
| H2 | Related Documents | existing→update | section-level references |

### 1.2 Naming Convention

- 새 섹션명은 기존 섹션의 명명 패턴을 따른다: `{Topic} {Type}` (e.g., "Platform Business Logic", "Digital Business Structure")
- 교차 참조 시 `{file}.md §{Section Name}` 형식 사용 (e.g., `concepts.md §Finance Core Terms`)
- 섹션 내 하위 구분은 H3까지만 허용. H4 이하는 bullet list로 처리

### 1.3 Wave Boundary Gate Protocol

**Gate 1: Wave 1 완료 → Wave 2 시작 전**

팀 리드가 수행하는 검증 항목:
1. **섹션 존재 확인**: manifest의 모든 NEW/expand 섹션이 실제로 존재하는가
2. **정방향 교차 참조 유효성**: Wave 1 파일 간 교차 참조 (`§{Section}`) 가 모두 실제 존재하는 섹션을 가리키는가
3. **역방향 참조 검증**: 참조 대상 섹션이 "누가 자신을 참조하는지"를 Gate에서 추적 가능하도록 section-level reference가 누락되지 않았는가
4. **Benchmark Registry 확인**: concepts.md §Benchmark Registry에 시점 의존 수치가 `as_of` 메타데이터와 함께 등록되었는가
5. **Rule Ownership 무모순**: domain_scope.md §Rule Ownership의 owner 지정이 실제 파일 내용과 일치하는가
6. **허용 작업 유형 준수**: 변경이 §1.4의 허용 범위(additive, ID 변환, 교차 참조 정밀화, applicability marker normalization, integrate) 안에서 수행되었는가

Gate 1 PASS 조건: 항목 1-6 모두 통과. FAIL 시 해당 Wave 1 에이전트에 수정 요청 후 재검증.

**Gate 2: Wave 2 완료 → Wave 3 시작 전**

1a. **CQ inference path 참조 유효성**: 모든 CQ의 inference path가 Wave 1 파일의 실제 섹션을 가리키는가
1b. **CQ inference path 내용 적합성**: reasoning step이 "어떤 문서 근거를 어떻게 결론으로 연결하는지"를 설명하며, 복수 참조 시 AND/OR 규칙이 명시되어 있는가
2. **Extension case 앵커**: 모든 case의 `Related CQs`가 실제 CQ ID를 가리키고, Impact Matrix의 `Primary Owner File` section reference가 실제 존재하는 섹션을 가리키는가
3. **Sub-area to CQ mapping 검증**: domain_scope.md §Sub-area to CQ Section Mapping이 실제 CQ 파일과 일치하는가
4. **Tier-sensitive CQ 정합성**: `Applicability`가 있는 CQ가 domain_scope.md의 scale range와 충돌하지 않는가

### 1.4 Additive vs. Replace 권한

| 작업 유형 | 권한 | 예시 |
|-----------|------|------|
| 기존 섹션에 내용 추가 | additive (기본) | Strategy Analysis Logic에 anti-pattern 추가 |
| `existing→update` 상태 섹션 작업 | additive + localized replace (허용) | 기존 bullet 확장, 용어 정밀화, section-level reference 추가 |
| `existing→integrate` 상태 섹션 작업 | additive + targeted merge (허용) | Source of Truth 서술을 유지하되 ownership 중복 설명을 한 곳으로 통합 |
| ID 체계 변환 | replace (예외) | Q1→CQ-SM-01 (형식 변경, 내용 보존) |
| 교차 참조 정밀화 | replace (예외) | "concepts.md" → "concepts.md §Finance Core Terms" |
| Applicability marker normalization | replace (예외) | `(scale-dependent)` → `(when applicable, scale: Small-Large)` |
| 기존 내용 삭제/재작성 | 금지 | broad rewrite/delete without preservation rationale |
| 빈 섹션(§5) 채우기 | additive | conciseness_rules.md §5 Quantitative Criteria |

---

## Contract 2: CQ Reform Specification

### 2.1 Namespace Definition

| Element | Format | Example |
|---------|--------|---------|
| Prefix | CQ-{SECTION_CODE} | CQ-SM, CQ-MK |
| Full ID | CQ-{SECTION_CODE}-{NN} | CQ-SM-01, CQ-FI-03 |
| Priority | [P1] / [P2] / [P3] | [P1] |

### 2.2 Section Code Allocation

| Code | Section | Sub-area | Current Q range | Min CQ |
|------|---------|----------|----------------|--------|
| SM | Strategic Management | Strategic Management | Q1-Q5 | 5 |
| MK | Marketing | Marketing | Q6-Q9 | 4 |
| FI | Finance | Finance | Q10-Q13 | 4 |
| RC | Revenue & Cost Structure | Finance + Marketing + Modern Extensions (cross) | Q14-Q17 | 4 |
| OP | Operations & Automation | Operations Management | Q18-Q22 | 5 |
| OH | Organization & HR | Organization & HR | Q23-Q26 | 4 |
| CM | Change Management | Organization & HR (cross) | Q27-Q29 | 3 |
| IN | Innovation | Innovation Management | Q30-Q31 | 3 |
| GR | Governance & Risk | Governance & Risk | Q32-Q34 | 3 |
| PL | Platform Business | Modern Extensions | — (NEW) | 3 |
| SB | Subscription Economy | Modern Extensions | — (NEW) | 3 |
| AB | AI Business | Modern Extensions | — (NEW) | 2 |
| SC | Scalability & Adaptation | Cross-cutting | Q35-Q36 + NEW | 3 |
| **Total** | | | **36 existing + 1 new** | **46 minimum** |

**Prefix allocation protocol**: New CQ sections use 2-character alphabetic prefix codes with mandatory `-` separator (e.g., CQ-XX-01). Prefixes must not be string prefixes of existing prefixes. Reserved: CQ-BM (future Business Model general).

보충 결정:
- `RC`는 FI와 잠정 분리 유지한다. 이유: 자본배분/할인율/현금흐름 검증(FI)과 가격 구조/단위경제/수익-비용 귀속 검증(RC)은 검증 행위가 다르기 때문이다.
- `AB` 최소 CQ 수는 현 단계에서 2로 유지하되, Wave 2 Agent F는 3개 concern(AI models, data moat, AI governance)이 orphan 없이 커버되는지 명시해야 한다. 불가하면 3으로 상향한다.

### 2.3 Q1-Q36 Mapping Table

기존 36개 질문은 새 ID로 **1:1 매핑**된다. 내용은 보존하되, 형식(ID + inference path + verification criteria)이 추가된다. `CQ-SC-03`은 신규 `Transfer Patterns` 섹션을 검증하기 위한 additive CQ다.

| Old ID | New ID | Content (preserved) |
|--------|--------|-------------------|
| Q1 | CQ-SM-01 | Industry competitive environment analysis |
| Q2 | CQ-SM-02 | Competitive advantage sustainability (VRIO) |
| Q3 | CQ-SM-03 | Growth strategy direction and rationale |
| Q4 | CQ-SM-04 | Strategic objective to execution plan traceability |
| Q5 | CQ-SM-05 | Strategy modification path for environment changes |
| Q6 | CQ-MK-01 | Market segmentation criteria and target rationale |
| Q7 | CQ-MK-02 | Positioning relative to competitive alternatives |
| Q8 | CQ-MK-03 | Marketing mix alignment with target market |
| Q9 | CQ-MK-04 | Customer journey touchpoints and conversion measurement |
| Q10 | CQ-FI-01 | Capital budgeting techniques applied |
| Q11 | CQ-FI-02 | WACC calculation and discount rate usage |
| Q12 | CQ-FI-03 | Cash flow forecasting and liquidity crisis response |
| Q13 | CQ-FI-04 | Revenue model key assumptions stated |
| Q14 | CQ-RC-01 | Revenue generation structure and pricing rationale |
| Q15 | CQ-RC-02 | Fixed/variable cost distinction and break-even |
| Q16 | CQ-RC-03 | LTV, CAC, churn rate calculation (subscription/platform) |
| Q17 | CQ-RC-04 | ROI scope and return attribution period |
| Q18 | CQ-OP-01 | Core process bottleneck identification and improvement |
| Q19 | CQ-OP-02 | Automation scope definition (start/end) |
| Q20 | CQ-OP-03 | Automation discrepancy adjudication authority |
| Q21 | CQ-OP-04 | Time savings to cost savings conversion path |
| Q22 | CQ-OP-05 | Supply chain risk identification |
| Q23 | CQ-OH-01 | Organizational structure appropriateness |
| Q24 | CQ-OH-02 | Decision-making authority and principal-agent safeguards |
| Q25 | CQ-OH-03 | Talent pipeline for key positions |
| Q26 | CQ-OH-04 | Competency model linked to performance management |
| Q27 | CQ-CM-01 | Change management model applied |
| Q28 | CQ-CM-02 | Cooperation securing plan specificity |
| Q29 | CQ-CM-03 | Circular dependency resolution strategy |
| Q30 | CQ-IN-01 | Innovation type identification and response strategy |
| Q31 | CQ-IN-02 | Technology adoption lifecycle stage and Chasm strategy |
| Q32 | CQ-GR-01 | Corporate governance structure defined |
| Q33 | CQ-GR-02 | Risk response strategies designated (COSO ERM) |
| Q34 | CQ-GR-03 | ESG independent from governance, overlap stated |
| Q35 | CQ-SC-01 | M&A key structure accommodation |
| Q36 | CQ-SC-02 | New market/region regulatory and operational responses |
| NEW | CQ-SC-03 | Business model pattern transfer fit, boundary conditions, and adaptation logic |

### 2.4 CQ Entry Format

```markdown
- **CQ-{CODE}-{NN}** [{PRIORITY}] {Question text}
  - Applicability: {Tier range or trigger condition}  # Optional; required only for tier-sensitive CQs
  - Inference path: {file.md §Section} → {reasoning step} → {file.md §Section} → {conclusion}
  - Verification criteria: PASS if {measurable condition}. FAIL if {specific failure condition}. SKIP if {typed skip condition}
```

**Field definitions**:
- **Applicability**: Tier-sensitive CQ에서만 필수. 허용 타입은 `Micro-Large`, `Mid-Large`, `scale unknown`, `N/A-pattern` 등. Tier 정보의 SSOT는 domain_scope.md §Scale Tier Definitions / §Major Sub-areas marker이며, CQ는 이를 상속한다.
- **Inference path**: Document reference chain. 각 단계는 `{file}.md §{Section}` 형태의 문서 참조와 `→` 로 연결된 추론 단계로 구성. 추론(reasoning)과 참조(reference)를 혼합 가능하되, 모든 문서 참조는 manifest에 정의된 섹션을 가리켜야 한다.
- **Reasoning step requirement**: 각 reasoning step은 `derive`, `compare`, `confirm`, `reconcile`, `exclude` 중 하나 이상의 명시적 동사를 포함해, 어떤 문서 근거를 어떻게 연결하는지 드러내야 한다.
- **Multi-reference aggregation**: 복수 문서 참조는 기본값 `AND`다. 둘 중 하나면 충분한 경우에만 `[OR]`를 명시한다. `fallback:` 표기는 대체 경로일 때만 사용한다.
- **Verification criteria**: PASS/FAIL 조건. 정량 벤치마크 사용 시 Contract 4 (Benchmark Governance) 규칙을 따른다. 허용 SKIP 타입은 `SKIP-scale`, `SKIP-scale-unknown`, `SKIP-benchmark`, `N/A-pattern`이다.

### 2.5 Priority Definitions

| Priority | Definition | Example |
|----------|-----------|---------|
| P1 | 모든 비즈니스 시스템 리뷰에서 답할 수 있어야 함. 미답변 = 근본적 설계 결함 | 수익 모델 존재 여부, 경쟁 환경 분석 여부 |
| P2 | 운영 중인 비즈니스에서 답할 수 있어야 함. 미답변 = 품질 갭 | WACC 계산 여부, 변화관리 모델 적용 여부 |
| P3 | 성숙한 비즈니스에서 답할 수 있어야 함. 미답변 = 개선 기회 | 기술 채택 주기 단계 정의, ESG 독립 관리 |

### 2.6 Extension-Case Linkage

extension_cases.md의 각 Case에 관련 CQ를 명시한다:

```markdown
## Case N: {Title}
- Related CQs: CQ-XX-01, CQ-YY-02
```

역방향: CQ에서 extension case를 직접 참조하지 않는다 (단방향 참조).

---

## Contract 3: Authority Model Unification

### 3.1 Philosopher 판정 반영

| 항목 | 판정 | 처리 |
|------|------|------|
| Rule Ownership table | 유지 → domain_scope.md §Inter-Document Contract에 배치 | SE 포맷 적용 |
| Source of Truth Management | dependency_rules.md에 유지 | Rule Ownership과 참조 관계만 명시 |
| Normative System Classification | **흡수** | Bias Detection Criteria에 통합 (독립 질문/consumer 미증명) |

### 3.2 Rule Ownership Table (domain_scope.md §Inter-Document Contract §Rule Ownership)

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Concept definitions | concepts.md | All other files reference, do not redefine |
| Financial decision-making rules | logic_rules.md §Financial Decision-Making Logic | dependency_rules.md (references only) |
| Strategy analysis rules | logic_rules.md §Strategy Analysis Logic | structure_spec.md (alignment refs only) |
| Organizational structure rules | structure_spec.md §Organization-Strategy Fit | logic_rules.md (references only) |
| Dependency chain rules | dependency_rules.md | structure_spec.md (references only) |
| Source of truth designation | dependency_rules.md §Source of Truth Management | structure_spec.md (references only) |
| Competency questions | competency_qs.md | Other files provide inference path targets |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Extension scenarios | extension_cases.md | competency_qs.md (CQ linkage, one-way) |
| Benchmark registry (SSOT) | concepts.md §Benchmark Registry | Other files reference with as_of |
| Platform business rules | logic_rules.md §Platform Business Logic | structure_spec.md §Digital Business Structure |
| Automation scope rules | logic_rules.md §Operations Management Logic | dependency_rules.md §Organization-Process Dependency |
| Change management rules | logic_rules.md §Change Management Logic | dependency_rules.md §Change Management Circular Dependency |
| ESG relationship rules | dependency_rules.md §Governance-ESG Relationship | concepts.md §Governance/Risk Core Terms, competency_qs.md (references only) |
| Supply chain / operations-quality rules | dependency_rules.md §Operations-Quality Dependency | logic_rules.md §Operations Management Logic |
| Scale tier definitions and applicability ranges | domain_scope.md §Scale Tier Definitions | competency_qs.md, Coverage Matrix (inherit only) |
| Bias detection criteria | domain_scope.md §Bias Detection Criteria | competency_qs.md (warning consumption only) |

### 3.3 Required Substance per Sub-area

Each sub-area declared in domain_scope.md §Major Sub-areas must have corresponding substance in at least one of:
- concepts.md: term definitions
- logic_rules.md or structure_spec.md or dependency_rules.md: operational rules
- competency_qs.md: verification questions (CQ allocated)

A sub-area with declaration but no substance in any file is a "ghost sub-area" and must either be populated or annotated with applicability conditions.

**검증 시점**: Wave 2 Gate (Gate 2)에서 Sub-area to CQ Section Mapping으로 확인.

### 3.4 Cross-cutting Concern Attribution

When a concern spans multiple sub-areas, attribute to the sub-area where the concern has its **primary enforcement point**:
1. **Primary enforcement point**: The sub-area whose rules would be violated if the concern is not addressed
2. **Secondary references**: Other sub-areas reference the primary sub-area's rules
3. **Tie-breaking**: If enforcement is equally distributed, attribute to the sub-area with fewer existing items

### 3.5 Normative System → Bias Detection Integration

기존 Bias Detection Criteria (9개)에 normative 관점 항목을 추가:

| # | Criterion | Source |
|---|-----------|--------|
| 10 | 규범 체계(법규, 산업표준, 자율규제)가 혼재하는데 적용 우선순위가 명시되지 않음 → **규범 우선순위 부재** | normative → absorbed |
| 11 | 의무적 규범(법규)과 권고적 규범(ESG 자율공시)이 동일한 강도로 적용됨 → **규범 강도 미구분** | normative → absorbed |
| 12 | 정량적 목표(KPI)만 있고 정성적 판단 기준(거버넌스 원칙)이 없음 → **정성 판단 부재** | new |
| 13 | 플랫폼 참여자 규칙(take rate, 콘텐츠 정책)이 일방적으로 설정됨 → **플랫폼 거버넌스 편향** | modern ext |
| 14 | AI 의사결정의 설명 가능성/이의 제기 경로가 없음 → **알고리즘 책임 부재** | modern ext |
| 15 | 구독 해지/가격 변경의 고객 영향 분석이 없음 → **구독자 영향 미평가** | modern ext |
| 16 | Mid/Large용 통제 프레임워크를 Micro/Small에 무차별 적용함 → **scale mismatch (over-application)** | scale-tier |
| 17 | Mid/Large에서 필요한 형식화된 통제를 Micro/Small식 관행으로 대체함 → **scale mismatch (under-formalization)** | scale-tier |
| 18 | employee_count 근거 없이 tier-sensitive 판단을 수행함 → **scale context unverified** | scale-tier |

### 3.6 Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Strategic Management | CQ-SM | Full |
| Marketing | CQ-MK | Full |
| Finance | CQ-FI | Core financial decision-making |
| Operations Management | CQ-OP | Full |
| Organization & HR | CQ-OH | Core organizational design |
| Innovation Management | CQ-IN | Full |
| Governance & Risk | CQ-GR | Full |
| Modern Extensions — Platform | CQ-PL | Focused |
| Modern Extensions — Subscription | CQ-SB | Focused |
| Modern Extensions — AI Business | CQ-AB | Focused |

Cross-cutting CQ sections (not mapped to a single sub-area):
- `CQ-RC` — spans Finance + Marketing + Modern Extensions where pricing structure, unit economics, and return attribution intersect
- `CQ-CM` — spans Organization & HR + Operations Management + Innovation Management where change execution crosses structure/process/adoption
- `CQ-SC` — spans Strategic Management + Governance & Risk + structure-change extension events (M&A, market expansion, business-model transfer)

---

## Contract 4: Benchmark Governance

### 4.1 Benchmark Role Classification

| Role | Tag | Definition | Example |
|------|-----|-----------|---------|
| reference | `[ref]` | 맥락 파악용 참고 수치. 직접 판정 기준이 아님 | 산업별 WACC 범위 (5-11%) |
| threshold | `[thr]` | PASS/FAIL 판정에 사용되는 기준값 | LTV/CAC > 3 (SaaS 건전성) |
| context | `[ctx]` | 특정 사례의 맥락 수치. 일반화 불가 | Amazon CCC -32일 (2024) |

### 4.2 Metadata Format

모든 시점 의존 수치에 다음 메타데이터를 부착한다:

```markdown
{수치} (as_of: {YYYY}, source: {name/URL})
```

Examples:
- `산업 평균 WACC 6.96% (as_of: 2026, source: Damodaran)`
- `LTV/CAC > 3 [thr] (as_of: 2025, source: industry benchmark)`
- `Amazon CCC -32일 [ctx] (as_of: 2024, source: company filings)`

### 4.3 Placement Rules

| Content Type | Primary Location | Other Files |
|-------------|-----------------|-------------|
| Benchmark definitions (수치 + as_of + source) | concepts.md §Benchmark Registry | 참조만 |
| Benchmark-based verification criteria | competency_qs.md (CQ verification criteria) | — |
| Benchmark-based logic rules | logic_rules.md (해당 섹션) | concepts.md §Benchmark Registry 참조 |
| Case-specific context numbers | extension_cases.md (해당 case) | — |

**SSOT 원칙**: Benchmark owner는 Contract 3 §3.2에서 선언한다. Contract 4는 그 owner를 소비하는 배치/사용 규칙만 정의한다. 동일 벤치마크가 여러 파일에 등장할 때, 수치의 SSOT는 concepts.md §Benchmark Registry이며 다른 파일은 `(→ concepts.md §Benchmark Registry)` 참조만 부착한다.

### 4.4 CQ에서 Benchmark 사용 규칙

CQ verification criteria에 benchmark를 사용할 때:

```markdown
- Verification criteria: PASS if {condition using benchmark [role]}.
  FAIL if {failure condition}.
  SKIP if {benchmark 적용 불가 조건} — {fallback: 유사 업종 참조 / 정성 판단}.
```

- `[ref]` 벤치마크: verification criteria에서 "참고"로만 언급. PASS/FAIL 기준으로 사용 불가
- `[thr]` 벤치마크: PASS/FAIL 기준으로 사용 가능
- `[ctx]` 벤치마크: 사례 비교에만 사용. 일반 기준으로 사용 불가
- `SKIP-benchmark`: benchmark 자체가 업종/모델에 맞지 않거나 최신성이 부족해 정량 판정을 보류할 때만 사용한다
- `SKIP-scale` / `SKIP-scale-unknown`: CQ Applicability의 영역이며 Contract 2 §2.4를 따른다. benchmark SKIP이 CQ Applicability를 대체할 수는 없다

### 4.5 Freshness Protocol

| 트리거 | 조치 |
|--------|------|
| 연 1회 (매년 1월) | concepts.md §Benchmark Registry의 모든 `[thr]` 항목 검토. 출처에서 갱신된 수치가 있으면 `as_of` 업데이트 |
| 외부 표준 변경 (e.g., ISSB 신규 발행) | 해당 영역 benchmark + CQ verification criteria 검토 |
| 도메인 리뷰 시 | 리뷰어가 stale benchmark 발견 시 learning으로 기록 → 다음 feedback cycle에서 갱신 |
| stale `[ref]` 발견 | `stale-reference-warning`로 표기. 맥락값으로는 유지 가능하지만 `[thr]`로 승격 금지 |

### 4.6 conciseness_rules.md §5 범위 제한

§5 Quantitative Criteria는 **conciseness 전용 임계값**만 포함한다:

| Criterion | Threshold | Description |
|-----------|-----------|-------------|
| 동일 사례 중복 | 2+ files | 같은 기업/사건이 2개 이상 파일에서 3문장 이상 서술되면 SSOT 위반 경고 |
| 단일 자식 분류 | 1 child | 하위 항목이 1개뿐인 중간 분류 노드 → 병합 검토 |
| 미인스턴스 분류 | 0 instances | 실제 비즈니스 활동이 매핑되지 않는 빈 분류 → 제거 또는 확장 예약 표시 |
| CQ 중복 | same behavior | 동일한 검증 행위(같은 대상에 같은 판단)를 수행하는 CQ → 통합 검토 |

---

## Contract 5: Coverage Matrix

### 5.1 Matrix Format

```
Sub-area concern → Research Note section → Landing file §section → Owner Wave → CQ anchor → Extension Case anchor
```

운영 규칙:
- Tier applicability는 framework tag / CQ Applicability에서 상속하며, Coverage Matrix에 별도 Tier 열을 두지 않는다.
- 새로운 Research Note 약어를 임의로 추가하지 않는다. 필요한 경우 명시적 파일명을 사용한다.

### 5.2 Complete Coverage Matrix

#### Research Note Abbreviation Map

| Abbreviation | File | Scope |
|--------------|------|-------|
| RESEARCH_NOTES | RESEARCH_NOTES.md | 전략·마케팅 사례/데이터 |
| RN_finance | RESEARCH_NOTES_finance_ops.md | 재무·운영 사례/수치 |
| RN_org | RESEARCH_NOTES_org_change_innovation.md | 조직·변화·혁신 사례 |
| RN_modern | RESEARCH_NOTES_MODERN_BUSINESS_MODELS.md | 플랫폼·구독·AI·ESG 현대 비즈니스 모델 |

#### Strategic Management

| Concern | Research Note | Landing File §Section | Wave | CQ | Ext Case |
|---------|-------------|----------------------|------|-----|----------|
| Porter's 5 Forces (3 industries) | RESEARCH_NOTES §1.1-1.3 | domain_scope §Strategic Management, logic_rules §Strategy Analysis Logic | 1A, 1C | CQ-SM-01 | Case 8 |
| VRIO (4 companies) | RESEARCH_NOTES §2 | concepts §Strategic Management Core Terms, logic_rules §Strategy Analysis Logic | 1B, 1C | CQ-SM-02 | Case 8 |
| Blue Ocean (5 ERRC) | RESEARCH_NOTES §3 | concepts §Strategic Management Core Terms, logic_rules §Strategy Analysis Logic | 1B, 1C | CQ-SM-03 | Case 5 |
| Ansoff failures (Fire Phone, Google+) | RESEARCH_NOTES §4 | logic_rules §Strategy Analysis Logic (anti-patterns) | 1C | CQ-SM-03 | Case 1, 4 |
| BCG portfolio | RESEARCH_NOTES §4 | logic_rules §Strategy Analysis Logic | 1C | CQ-SM-03 | Case 1 |
| BMC analysis | RESEARCH_NOTES §7 | concepts §Strategic Management Core Terms | 1B | CQ-SM-04 | — |

#### Marketing

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| STP (Tesla, Airbnb) | RESEARCH_NOTES §5 | concepts §Marketing Core Terms | 1B | CQ-MK-01, 02 | Case 4 |
| Customer Journey metrics | RESEARCH_NOTES §5 | concepts §Marketing Core Terms, logic_rules §Marketing Logic | 1B, 1C | CQ-MK-04 | — |
| Brand Equity (Boeing, VW) | RESEARCH_NOTES §6 | concepts §Marketing Core Terms, logic_rules §Marketing Logic | 1B, 1C | CQ-MK-02 | Case 8 |
| Digital marketing funnel | RESEARCH_NOTES §5 | concepts §Benchmark Registry [ref] | 1B | CQ-MK-04 | — |

#### Finance

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| NPV/IRR conflict (3 types) | RN_finance §1.2 | logic_rules §Financial Decision-Making Logic | 1C | CQ-FI-01 | — |
| WACC benchmarks (16 industries) | RN_finance §1.3 | concepts §Benchmark Registry [ref] | 1B | CQ-FI-02 | — |
| Capital structure (Apple, Tesla) | RN_finance §2 | concepts §Finance Core Terms | 1B | CQ-FI-02 | — |
| Working capital (Amazon CCC, Dell) | RN_finance §3 | concepts §Finance Core Terms, concepts §Benchmark Registry [ctx] | 1B | CQ-FI-03 | — |
| Valuation (WeWork, Uber) | RN_finance §4 | logic_rules §Financial Decision-Making Logic (anti-patterns) | 1C | CQ-FI-04 | Case 5 |

#### Operations Management

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Lean/TPS (Toyota, Virginia Mason) | RN_finance §5 | concepts §Operations Management Core Terms, logic_rules §Operations Management Logic | 1B, 1C | CQ-OP-01 | Case 3 |
| Six Sigma (Motorola $17B, GE $12B) | RN_finance §6 | concepts §Operations Management Core Terms | 1B | CQ-OP-01 | Case 3 |
| TOC (Goldratt, DBR) | RN_finance §7 | logic_rules §Operations Management Logic | 1C | CQ-OP-01 | Case 3 |
| Supply chain disruptions (COVID, Suez) | RN_finance §8 | logic_rules §Operations Management Logic, dependency_rules §Operations-Quality Dependency | 1C, 1E | CQ-OP-05 | Case 4 |

#### Organization & HR

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Mintzberg 5 types + transitions | RN_org §1 | concepts §Organization/HR Core Terms, structure_spec §Organization-Strategy Fit | 1B, 1D | CQ-OH-01 | Case 7 |
| Agency Theory (Enron, WeWork) | RN_org §2 | concepts §Organization/HR Core Terms, logic_rules §Strategy Analysis Logic | 1B, 1C | CQ-OH-02 | Case 2 |
| Change Mgmt (Ford Mulally, Nadella) | RN_org §3 | concepts §Organization/HR Core Terms, logic_rules §Change Management Logic | 1B, 1C | CQ-CM-01, 02 | Case 6 |
| Talent Management (GE, Adobe, Netflix) | RN_org §8 | concepts §Organization/HR Core Terms | 1B | CQ-OH-03, 04 | Case 7 |

#### Innovation Management

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Disruption (Netflix, Uber, Airbnb) | RN_org §4 | concepts §Innovation Management Core Terms, logic_rules §Innovation Logic | 1B, 1C | CQ-IN-01 | Case 8 |
| Tech Adoption Lifecycle (Chasm) | RN_org §5 | concepts §Innovation Management Core Terms | 1B | CQ-IN-02 | Case 6 |
| Design Thinking (IBM, SAP) | RN_org §6 | concepts §Innovation Management Core Terms | 1B | CQ-IN-01 | Case 6 |

#### Governance & Risk

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Governance failures (Wirecard, FTX) | RN_org §7 | logic_rules §Strategy Analysis Logic (anti-patterns), concepts §Governance/Risk Core Terms | 1C, 1B | CQ-GR-01 | Case 8 |
| ESG frameworks (GRI, ISSB) | RN_modern §6 | concepts §Governance/Risk Core Terms, dependency_rules §Governance-ESG Relationship | 1B, 1E | CQ-GR-03 | — |

#### Modern Extensions — Platform

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Amazon Marketplace (GMV, take rate) | RN_modern §1.1 | concepts §Platform/Subscription/AI Extension Terms | 1B | CQ-PL-01 | Case 9 |
| Uber/Lyft (network effects) | RN_modern §1.2 | concepts §Platform/Subscription/AI Extension Terms, logic_rules §Platform Business Logic | 1B, 1C | CQ-PL-02 | Case 9 |
| Platform governance | RN_modern §1 | logic_rules §Platform Business Logic, structure_spec §Digital Business Structure | 1C, 1D | CQ-PL-03 | Case 9 |
| Platform failures | RN_modern §1 | logic_rules §Platform Business Logic (anti-patterns) | 1C | CQ-PL-01 | Case 9 |

#### Modern Extensions — Subscription

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| SaaS benchmarks (LTV:CAC, NRR) | RN_modern §2 | concepts §Benchmark Registry [thr], logic_rules §Subscription Economy Logic | 1B, 1C | CQ-SB-01 | Case 10 |
| Adobe J-curve transition | RN_modern §2 | logic_rules §Subscription Economy Logic | 1C | CQ-SB-02 | Case 5, 10 |
| Netflix/Peloton | RN_modern §2 | concepts §Platform/Subscription/AI Extension Terms | 1B | CQ-SB-03 | Case 10 |
| PLG model (Slack, Zoom) | RN_modern §2 | logic_rules §Subscription Economy Logic | 1C | CQ-SB-01 | — |

#### Modern Extensions — AI Business

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| OpenAI/Anthropic/NVIDIA models | RN_modern §3 | concepts §Platform/Subscription/AI Extension Terms | 1B | CQ-AB-01 | — |
| Data Moat (real vs. claimed) | RN_modern §3 | logic_rules §AI Business Logic, concepts §Platform/Subscription/AI Extension Terms | 1C, 1B | CQ-AB-02 | — |
| EU AI Act, AI governance | RN_modern §3 | logic_rules §AI Business Logic | 1C | CQ-AB-01 | Case 11 |

#### Cross-cutting

| Concern | Research Note | Landing §Section | Wave | CQ | Ext Case |
|---------|-------------|-----------------|------|-----|----------|
| Digital Transformation ROI | RN_modern §5 | logic_rules §Change Management Logic | 1C | CQ-CM-01 | Case 6 |
| BM Innovation patterns | RN_modern §4 | logic_rules §Transfer Patterns | 1C | CQ-SC-03 | Case 5 |
| Freemium/Creator economy | RN_modern §4 | concepts §Platform/Subscription/AI Extension Terms | 1B | CQ-SB-01 | — |

### 5.3 Identified Coverage Gaps (Research Note 미포함)

| Gap | Severity | Mitigation |
|-----|----------|-----------|
| 국제 사업/무역 | Low | domain_scope에 applicability marker `(when applicable)` 보유. CQ-SC-02가 부분 커버. 현재 리서치 범위 외 — 다음 리서치 사이클에서 보충 |
| 스타트업 고유 관심사 | Low | Strategic Management, Innovation 내에서 간접 커버. 전용 섹션 불필요 |
| 지속가능성 (ESG 이상) | Low | Governance & Risk에서 부분 커버 (ESG frameworks). 심화는 별도 도메인 후보 |
| 행동경제학/넛지 | Low | Marketing Logic에 1-2 원칙 추가로 대응 가능. 전용 섹션 불필요 |
| 법무/데이터 거버넌스 | Medium | Governance & Risk에 Business Law 항목 있음. 데이터 거버넌스는 AI Business Logic에 흡수 가능. CQ-GR 확장으로 대응 |
| 품질 관리 세부 | Medium | Operations에 Quality Management 항목 있음. TQM, cost of quality 이미 선언. 리서치 노트의 Six Sigma/Lean이 커버. CQ-OP 강화로 대응 |

### 5.4 Case Primary Owner (SSOT)

사례가 2+ 파일에 등장할 때, 상세 서술(3문장 이상)의 SSOT:

| Case/Example | Primary Owner | Other Files |
|-------------|--------------|-------------|
| Porter's 5 Forces 분석 (항공/제약/IT) | logic_rules §Strategy Analysis Logic | domain_scope (참조만) |
| VRIO 사례 (Apple, Toyota, Google) | concepts §Strategic Management Core Terms | logic_rules (참조만) |
| Blue Ocean ERRC (Cirque du Soleil 등) | concepts §Strategic Management Core Terms | logic_rules (참조만) |
| 성장전략 실패 (Fire Phone, Google+) | logic_rules §Strategy Analysis Logic | extension_cases (축약 참조) |
| 브랜드 훼손 (Boeing, VW) | concepts §Marketing Core Terms | logic_rules (참조만) |
| 자본구조 (Apple, Tesla) | concepts §Finance Core Terms | — |
| 공급망 붕괴 (COVID, Suez, Ericsson) | logic_rules §Operations Management Logic | extension_cases (축약 참조) |
| 조직 전환 (Spotify, Zappos, Alphabet) | concepts §Organization/HR Core Terms | structure_spec (참조만) |
| 거버넌스 실패 (Enron, WeWork, FTX) | concepts §Governance/Risk Core Terms | logic_rules (참조만) |
| 변화관리 (Ford Mulally, Nadella) | concepts §Organization/HR Core Terms | logic_rules (참조만) |
| 플랫폼 사례 (Amazon, Uber, Airbnb) | concepts §Platform/Subscription/AI Extension Terms | logic_rules (참조만) |
| 구독 사례 (Adobe, Netflix, Peloton) | concepts §Platform/Subscription/AI Extension Terms | logic_rules (참조만) |
| AI 사례 (OpenAI, NVIDIA, Harvey) | concepts §Platform/Subscription/AI Extension Terms | logic_rules (참조만) |
| 벤치마크 수치 (WACC, CCC, SaaS metrics) | concepts §Benchmark Registry | CQ verification criteria (참조만) |

---

## Completion Criteria

이 5개 계약의 확정 조건:

1. **Section manifest**: 모든 8개 파일의 H2/H3 섹션명이 확정되고, Wave 에이전트 할당이 완료
2. **CQ reform spec**: namespace, mapping, format, priority, extension-case linkage, applicability/skip semantics가 확정
3. **Authority model**: Rule Ownership table, Sub-area to CQ mapping, bias detection 18개 항목이 확정
4. **Benchmark governance**: role classification, metadata format, placement rules, freshness protocol이 확정
5. **Coverage matrix**: 모든 sub-area concern에 landing section + CQ anchor 또는 명시적 제외 사유가 지정되고, gap에 mitigation이 명시

**종료 기준 변경** (Philosopher 권고 반영):
- ~~59K → 156K~~ → 보조 지표
- ~~70+ CQ~~ → 보조 지표 (46 minimum으로 조정)
- **실제 종료 기준**: new verification behavior 확보 + resolved coverage gap + cross-reference integrity
