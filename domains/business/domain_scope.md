---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Domain Scope Definition

This is the reference document used by onto_coverage to identify what should exist but is missing when reviewing a business system.
This domain applies when **reviewing** business plans, operating models, growth strategies, and management system design.

## Major Sub-areas

Classification axis: **management concern** — classified by the business concerns that a viable and governable business system must address.

Applicability markers:
- **(required, scale: X-Y)**: Must be addressed whenever the target falls inside the stated scale range. Absence indicates a coverage gap.
- **(when applicable, scale: X-Y)**: Address only when the business actually uses the pattern and the target falls inside the stated scale range.
- **(reference)**: Context provider only. Informative, not a mandatory coverage anchor.

Scale handling rule:
- If the target is `scale unknown`, review generic structure and decision logic, but do not fail the target for missing tier-specific controls until the scale input contract is satisfied.

### Strategic Management
- **Competitive Analysis** (required, scale: Micro-Large): Porter's Five Forces, substitute pressure, competitor response patterns, and market attractiveness. Micro businesses may use qualitative analysis; Mid/Large businesses should make industry structure explicit.
- **Resource-Based Strategy** (required, scale: Micro-Large): VRIO, core capability identification, dynamic capabilities, and sustainability of advantage. Claimed data moats, ecosystem control, or brand assets must be tested for rarity and imitability, not just asserted.
- **Growth Strategy** (required, scale: Micro-Large): Ansoff Matrix, adjacency logic, portfolio posture, and the rationale for market penetration, market development, product development, or diversification.
- **Value Innovation** (when applicable, scale: Micro-Large): Blue Ocean strategy, strategy canvas, and ERRC logic when the business claims category creation or non-price differentiation.
- **Business Development** (when applicable, scale: Small-Large): partnerships, channel expansion, M&A, regional expansion, and ecosystem entry. Founder-led opportunistic dealmaking in a Micro business is not treated as a full business-development system unless it is formalized.

### Marketing
- **Market Strategy** (required, scale: Micro-Large): STP, customer selection criteria, willingness-to-pay logic, and explicit target-customer rationale.
- **Marketing Mix** (required, scale: Micro-Large): 4P or 7P alignment with the target segment, including service operations and physical evidence where relevant.
- **Customer Management** (required, scale: Micro-Large): customer journey, conversion logic, retention design, brand equity, and feedback loops between customer behavior and strategic decisions.
- **Digital and Growth Marketing** (when applicable, scale: Micro-Large): funnel measurement, attribution logic, experimentation, product-led growth, lifecycle messaging, and paid/organic channel mix.

### Finance
- **Investment Decision-Making** (required, scale: Micro-Large): capital budgeting, payback logic, NPV or IRR where appropriate, and explicit treatment of downside cases. Micro firms may use simpler survival-oriented screens, but capital commitments still require a decision rule.
- **Capital Structure** (required, scale: Small-Large): cost of capital, debt-equity mix, funding strategy, and financing constraints. For Small and above, WACC or an explicit substitute discount-rate rationale should exist.
- **Working Capital Management** (required, scale: Micro-Large): cash runway, CCC, liquidity planning, receivables/inventory/payables management, and crisis response triggers.
- **Corporate Valuation** (when applicable, scale: Small-Large): DCF, relative valuation, scenario ranges, and value-driver assumptions for fundraising, M&A, or strategic review.
- **Accounting Standards Reference** (reference): revenue recognition and detailed financial-statement compliance are governed by the accounting domain. This domain uses accounting outputs as decision inputs, not as the primary rule system.

### Operations Management
- **Process Optimization** (required, scale: Micro-Large): Lean, process flow clarity, waste identification, baseline measurement, and operational improvement logic.
- **Constraint Management** (required, scale: Micro-Large): TOC, bottleneck identification, throughput logic, and avoidance of local optimization.
- **Supply Chain Management** (when applicable, scale: Small-Large): procurement, logistics, inventory policy, supplier concentration, lead-time risk, and resilience design once direct founder coordination no longer scales.
- **Quality Management** (required, scale: Small-Large): TQM, cost-of-quality reasoning, defect prevention, and repeatability controls. Micro businesses may apply lightweight quality checks, but formal quality systems become material as process volume rises.
- **Automation** (when applicable, scale: Micro-Large): automation scope boundaries, baseline measurement, discrepancy adjudication authority, ROI conversion logic, and role redesign after automation.

### Organization & HR
- **Organizational Structure** (required, scale: Micro-Large): Mintzberg structure fit, reporting hierarchy, coordination mechanism, and the match between structure and strategy.
- **Organizational Theory** (required, scale: Small-Large): Agency Theory, stakeholder alignment, incentive design, and delegated authority controls once ownership, management, and execution are no longer the same person or team.
- **Human Resource Management** (required, scale: Small-Large): competency model, performance management, role design, succession logic, and talent pipeline for key positions.
- **Change Management** (when applicable, scale: Small-Large): Kotter, ADKAR, sponsorship structure, short-term-win design, and circular dependency resolution between adoption and cooperation.
- **Leadership** (when applicable, scale: Micro-Large): leadership style, delegation, culture formation, and management-system maturity.

### Innovation Management
- **Disruptive Innovation** (when applicable, scale: Micro-Large): sustaining vs. disruptive innovation, response options for incumbents, and the organizational implications of attacking non-consumption or the low end.
- **Technology Adoption** (when applicable, scale: Micro-Large): Technology Adoption Lifecycle, Chasm strategy, whole-product design, and adoption-risk segmentation.
- **Design Thinking** (when applicable, scale: Micro-Large): user research, problem framing, prototyping, and iteration where uncertainty is customer-need driven.
- **R&D Management** (when applicable, scale: Small-Large): technology roadmaps, innovation portfolio balancing, open-innovation interfaces, and governance of experimentation spend.

### Governance & Risk
- **Corporate Governance** (required, scale: Mid-Large): board or equivalent oversight, internal controls, audit logic, escalation design, and separation between decision rights and control rights.
- **Risk Management** (required, scale: Micro-Large): risk identification, response strategy, residual-risk ownership, and crisis escalation. COSO-style formalization becomes more explicit with scale, but risk blindness is a gap at every size.
- **Business Law** (required, scale: Micro-Large): contracts, regulatory compliance, intellectual property, labor obligations, and legal constraints on growth or automation.
- **ESG** (when applicable, scale: Small-Large): environmental and social disclosure obligations, stakeholder-impact management, and the boundary between governance structures and sustainability claims.

### Modern Extensions
- **Platform Business** (when applicable, scale: Micro-Large): multi-sided markets, network effects, take rate logic, participant governance, and cross-side incentive balance.
- **Subscription Economy** (when applicable, scale: Micro-Large): MRR/ARR, churn, retention cohorts, LTV/CAC, pricing resets, and J-curve transition management.
- **AI Business** (when applicable, scale: Micro-Large): data moat claims, model economics, AI product design, explainability, appeal paths, and regulatory exposure for algorithmic decisions.

## Required Concept Categories

These categories must be available somewhere in the business knowledge system.

| Category | Description | Risk if Missing |
|---|---|---|
| Revenue model | Revenue generation structure, pricing system, and unit of monetization | No basis for commercial viability |
| Cost structure | Fixed/variable cost logic, cost attribution, and operating leverage | Profitability cannot be tested |
| Value proposition | The concrete customer benefit and differentiation logic | Market fit is unverified |
| Competitive strategy | Industry position, advantage source, and growth direction | Strategic choices lack basis |
| Risk management | Risk register, response design, and residual-risk ownership | Shocks cannot be absorbed or escalated properly |
| Performance measurement | KPI definitions, cadence, and leading/lagging split | Improvement cannot be directed or verified |
| Organization design | Decision rights, reporting hierarchy, and execution ownership | Strategy cannot be executed consistently |
| Source of truth | The designated authority when strategic, financial, or operational data conflicts | Decisions will be made on inconsistent facts |

## Reference Standards/Frameworks

| Standard/Framework | Application Area | Core Content | When to Apply |
|---|---|---|---|
| Porter's Five Forces | Strategic management | Industry structure and competitive intensity analysis | Any strategy review with external competition |
| VRIO | Strategic management | Sustainability test for resources and capabilities | When advantage claims are made |
| Ansoff Matrix | Growth strategy | Product-market growth directions | When growth direction or adjacency expansion is reviewed |
| Business Model Canvas | Business model design | Nine-block business model framing | When revenue logic or operating model needs explicit articulation |
| Balanced Scorecard | Performance management | Financial, customer, internal process, and learning perspectives | Small-Large organizations with formal KPI systems |
| Lean / TPS | Operations management | Waste elimination and flow improvement | Any process-improvement review |
| Six Sigma / DMAIC | Quality and process improvement | Variation reduction through measurement-driven improvement | Mid-Large operating environments with repeatable processes |
| Theory of Constraints | Operations management | Throughput focus via bottleneck management | When flow constraints or capacity saturation exist |
| Kotter's 8 Steps / ADKAR | Change management | Organizational change sequencing and adoption readiness | When adoption depends on organizational cooperation |
| COSO ERM | Governance and risk | Enterprise risk management structure | Small-Large risk-system design; most formal at Mid-Large |
| GRI / SASB / ISSB | ESG | Sustainability disclosure and reporting frameworks | When ESG disclosure or stakeholder-impact reporting exists |
| SaaS Metrics | Subscription business | MRR, ARR, churn, NRR, LTV/CAC | When recurring-revenue models are present |

## Scale Tier Definitions

Scale is determined by employee count only. Lifecycle signals are tracked separately and never override tier assignment.

| Scale State | Employee Count Rule | Review Meaning | Typical Coordination Pattern |
|---|---|---|---|
| scale unknown | No verified employee-count evidence | Tier-sensitive conclusions must be deferred or downgraded | Generic structure review only |
| Micro | `[1,10)` | Very small operating organization | Direct coordination, founder-centered execution |
| Small | `[10,100)` | Functionally differentiated small business | Emerging specialization and repeatable processes |
| Mid | `[100,1000)` | Formally managed organization | Delegated authority, explicit coordination systems |
| Large | `[1000,∞)` | Enterprise-scale organization | Cross-business-unit governance and formal control systems |

Interpretation rules:
- Use the half-open intervals exactly as written.
- `0 employees`, founder-only entities, or targets with no verified headcount remain `scale unknown`.
- `pre_revenue`, `founder_led`, `regulated_business`, `single_product`, and `multi_business_unit` are lifecycle or context flags, not scale tiers.
- Tier-sensitive checks may produce `SKIP-scale` or `SKIP-scale-unknown`, but generic review of structure, decision rights, and economic logic should still proceed.

### Scale Assessment Input Contract

| Field | Requirement | Notes |
|---|---|---|
| `employee_count` or `employee_count_range` | Required for deterministic tiering | Exact count preferred; a range is acceptable only if it resolves to one tier |
| `as_of` | Required | Headcount is time-sensitive |
| `source` | Required | User statement, filing, org chart, HR source, or equivalent |
| `confidence` | Recommended | `high`, `medium`, or `low` |
| `lifecycle_flags` | Optional | `pre_revenue`, `founder_led`, `multi_business_unit`, `regulated_business`, etc. |

Resolution rules:
- If evidence spans multiple tiers, keep `scale unknown`.
- If sources conflict, prefer the narrower range from the stronger source; otherwise keep `scale unknown`.
- Lifecycle flags refine interpretation but do not change the scale state.

## Bias Detection Criteria

- If 3 or more of the major sub-areas are missing entirely -> **insufficient coverage**
- If one area accounts for more than 70% of the content -> **area bias**
- If the revenue model exists with no cost structure -> **revenue-cost imbalance**
- If strategy exists with no execution path or operating consequences -> **execution path absence**
- If only qualitative goals exist with no measurable indicators -> **unmeasurable warning**
- If strategy is stated without competitive analysis -> **strategy basis absence**
- If relevant modern extensions (platform, subscription, AI) are missing for an applicable business model -> **modern business model blind spot**
- If 2 or more key data items have no designated source of truth -> **undesignated authority**
- If execution plans exist with no organization design or decision owner -> **execution owner unclear**
- If multiple normative systems (law, industry standard, self-regulation) apply but priority is unspecified -> **normative priority absence**
- If mandatory norms and voluntary norms are applied with the same force -> **normative strength confusion**
- If KPI targets exist but no qualitative judgment principle exists for conflict resolution -> **qualitative judgment absence**
- If platform participant rules are set unilaterally with no governance or appeal path -> **platform governance bias**
- If AI decisions have no explainability, contestability, or override path -> **algorithmic accountability absence**
- If subscription changes (pricing, downgrade, cancellation) ignore customer-impact analysis -> **subscriber impact not evaluated**
- If Mid/Large control frameworks are applied to Micro/Small targets without adaptation -> **scale mismatch (over-application)**
- If Mid/Large organizations are reviewed only with Micro/Small informal heuristics -> **scale mismatch (under-formalization)**
- If a tier-sensitive judgment is made without verified employee-count evidence -> **scale context unverified**

## Inter-Document Contract

This section declares which file owns which cross-cutting topic so that the business domain can expand without duplicating rules or leaving orphan concepts.

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Concept definitions | `concepts.md` | All other files reference, do not redefine |
| Financial decision-making rules | `logic_rules.md §Financial Decision-Making Logic` | `dependency_rules.md` references only |
| Strategy analysis rules | `logic_rules.md §Strategy Analysis Logic` | `structure_spec.md` references only |
| Organizational structure rules | `structure_spec.md §Organization-Strategy Fit` | `logic_rules.md` references only |
| Dependency chain rules | `dependency_rules.md` | `structure_spec.md` references only |
| Source-of-truth designation | `dependency_rules.md §Source of Truth Management` | `structure_spec.md` references only |
| Competency questions | `competency_qs.md` | Other files provide inference-path targets |
| Conciseness criteria | `conciseness_rules.md` | Other files reference only |
| Extension scenarios | `extension_cases.md` | `competency_qs.md` provides one-way CQ linkage |
| Benchmark registry | `concepts.md §Benchmark Registry` | Other files reference with `as_of` metadata |
| Change management rules | `logic_rules.md §Change Management Logic` | `dependency_rules.md §Change Management Circular Dependency` |
| Platform business rules | `logic_rules.md §Platform Business Logic` | `structure_spec.md §Digital Business Structure` |
| Automation scope rules | `logic_rules.md §Operations Management Logic` | `dependency_rules.md §Organization-Process Dependency` |
| Supply-chain and operations-quality rules | `dependency_rules.md §Operations-Quality Dependency` | `logic_rules.md §Operations Management Logic` |
| ESG relationship rules | `dependency_rules.md §Governance-ESG Relationship` | `concepts.md §Governance/Risk Core Terms`; `competency_qs.md` references only |
| Scale tier definitions and applicability ranges | `domain_scope.md §Scale Tier Definitions` | `competency_qs.md` and coverage planning inherit only |
| Bias detection criteria | `domain_scope.md §Bias Detection Criteria` | `competency_qs.md` may consume as warnings only |

### Required Substance per Sub-area

Each sub-area declared in `§Major Sub-areas` must have corresponding substance in at least one of:
- `concepts.md`: term definitions and interpretation anchors
- `logic_rules.md`, `structure_spec.md`, or `dependency_rules.md`: operational rules and structural constraints
- `competency_qs.md`: verification questions

A declared sub-area with no substance in any of those files is a **ghost sub-area** and must either be populated or explicitly narrowed by applicability.

### Cross-cutting Concern Attribution

When a concern spans multiple sub-areas, attribute it to the sub-area with the **primary enforcement point**:

1. The primary enforcement point is the sub-area whose rules would be violated if the concern were ignored.
2. Other sub-areas should reference the primary rule rather than redefine it.
3. If enforcement is genuinely split, attribute the concern to the area with the fewer existing items and cross-reference the rest.

### Classification Axis Relationships

The business domain uses three related concern axes. They are facets of the same system, not separate taxonomies.

| File | Axis | Facet |
|---|---|---|
| domain_scope.md | management concern | What business concerns exist |
| logic_rules.md / structure_spec.md / dependency_rules.md | operational concern | What rules govern those concerns |
| competency_qs.md | verification concern | What must be answerable during review |

### Sub-area to CQ Section Mapping

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

Cross-cutting CQ sections:
- `CQ-RC` spans Finance + Marketing + Modern Extensions where pricing, unit economics, and return attribution intersect.
- `CQ-CM` spans Organization & HR + Operations Management + Innovation Management where change crosses structure, process, and adoption.
- `CQ-SC` spans Strategic Management + Governance & Risk + extension events such as M&A, regional expansion, and business-model transfer.

## Related Documents

- `concepts.md §Strategic Management Core Terms` and `concepts.md §Governance/Risk Core Terms` — canonical concept definitions for this scope
- `structure_spec.md §Business System Required Elements` and `structure_spec.md §Authority and Responsibility Separation` — structural requirements implied by this scope
- `dependency_rules.md §Source of Truth Management` and `dependency_rules.md §Governance-ESG Relationship` — dependency and authority rules consumed by this scope
- `competency_qs.md §3. Finance (CQ-FI)` and `competency_qs.md §9. Governance and Risk (CQ-GR)` — verification entry points that consume this scope
