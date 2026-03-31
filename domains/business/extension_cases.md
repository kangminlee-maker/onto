---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Extension Scenarios

Each case simulates a business change event and tests whether the current business system can absorb that change without breaking strategic clarity, operating coherence, or governance.

## Case 1: Adding a New Revenue Source

- Related CQs: `CQ-SM-03`, `CQ-MK-01`, `CQ-RC-01`, `CQ-RC-02`, `CQ-OP-01`
- Real-world anchor: Amazon's move from retail infrastructure into AWS turned an internal capability into a major new revenue engine rather than just adding another product SKU.
- Change event: A new product, service, or revenue stream is added to the current business.
- Verification checklist:
  - Does the new revenue source fit a named Ansoff growth direction?
  - Is the target segment already covered by current STP, or must segmentation be revised?
  - Can the pricing logic and unit of monetization be explained?
  - Can costs be attributed cleanly enough to assess break-even or contribution?
  - Can the current operating system deliver the new value proposition?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Strategy | Growth direction and adjacency logic must be re-evaluated | `logic_rules.md §Strategy Analysis Logic` | Growth becomes opportunistic rather than intentional |
| Revenue model | Monetization structure and pricing rationale must be made explicit | `structure_spec.md §Business System Required Elements` | New revenue exists with no economic logic |
| Operations | Delivery capability and bottlenecks may change | `logic_rules.md §Operations Management Logic` | Demand is created that operations cannot fulfill |
| Measurement | Margin and contribution tracking may need new KPIs | `concepts.md §Finance Core Terms` | The new revenue source cannot be judged economically |

## Case 2: M&A (Mergers & Acquisitions)

- Related CQs: `CQ-OH-02`, `CQ-CM-01`, `CQ-GR-01`, `CQ-SC-01`
- Real-world anchor: Alphabet's history of integrating acquisitions while preserving or separating key structures shows that post-deal structure design matters as much as deal logic.
- Change event: The business acquires or merges with another organization and must integrate systems, governance, and people.
- Verification checklist:
  - Can finance, customer, product, and operations identifiers coexist, map, or consolidate?
  - Is the post-merger decision-rights structure explicit?
  - Is there a cultural and change-management path rather than only a systems plan?
  - Is the target organization type after integration stated?
  - Are stakeholder conflicts and transition periods planned?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Structure | Key systems and authority structures must integrate | `structure_spec.md §Core System Key Structure (M&A Compatibility)` | Integration becomes a manual workaround |
| Dependency | Governance, data, and process dependencies multiply | `dependency_rules.md §M&A Dependency` | Hidden conflicts surface late and expensively |
| Change | Integration requires adoption, not only mapping | `logic_rules.md §Change Management Logic` | The combined organization never really becomes one |
| Risk | Oversight and control gaps appear during transition | `domain_scope.md §Governance & Risk` | Control failure occurs at the point of greatest exposure |

## Case 3: Automation Introduction/Expansion

- Related CQs: `CQ-OP-01`, `CQ-OP-02`, `CQ-OP-03`, `CQ-OP-04`, `CQ-OH-04`
- Real-world anchor: Virginia Mason's adaptation of Lean and process redesign demonstrates that automation gains appear only when process boundaries and operating ownership are clear.
- Change event: Manual work is automated or the automation boundary expands.
- Verification checklist:
  - Are start and end points defined?
  - Is the pre-change baseline measured?
  - Is discrepancy adjudication authority assigned?
  - Is there a credible path from time savings to value capture?
  - Are roles, skills, and exception paths redesigned?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Operations | Process throughput and error handling change | `logic_rules.md §Operations Management Logic` | Automation speed increases but reliability does not |
| Organization | Roles and competencies shift | `dependency_rules.md §Organization-Process Dependency` | People design lags behind process change |
| Finance | Claimed savings require conversion logic | `logic_rules.md §Financial Decision-Making Logic` | Phantom ROI is reported |
| Governance | Exception ownership becomes material | `structure_spec.md §Authority and Responsibility Separation` | No one can decide when automation fails |

## Case 4: Market/Regional Expansion

- Related CQs: `CQ-SM-01`, `CQ-MK-01`, `CQ-MK-03`, `CQ-OP-05`, `CQ-SC-02`
- Real-world anchor: Many domestic winners fail abroad because they copy positioning and operations instead of adapting to local regulation, channel structure, and customer behavior.
- Change event: The business enters a new market, geography, or customer region.
- Verification checklist:
  - Has the new market's industry structure been analyzed?
  - Have segmentation and positioning been re-tested for the new context?
  - Are regulatory, cultural, and operational differences named?
  - Can supply chain and service operations support the expansion?
  - Are adaptation rules explicit rather than assumed?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Strategy | The expansion route changes the meaning of growth | `logic_rules.md §Strategy Analysis Logic` | Expansion is treated as replication instead of adaptation |
| Marketing | Targeting and channel fit may change materially | `logic_rules.md §Marketing Logic` | Existing positioning fails in the new market |
| Operations | Fulfillment, service, and supply constraints move | `dependency_rules.md §Operations-Quality Dependency` | New-market growth breaks operational reliability |
| Governance | New norms and legal rules can change control needs | `domain_scope.md §Governance & Risk` | Compliance risk appears after market entry |

## Case 5: Business Model Transition

- Related CQs: `CQ-SM-03`, `CQ-RC-03`, `CQ-SB-03`, `CQ-SC-03`
- Real-world anchor: Adobe's shift from perpetual software licenses to Creative Cloud required a full rewrite of revenue timing, customer value delivery, and investor communication.
- Change event: The core monetization model changes, such as product sale to subscription or direct sale to platform.
- Verification checklist:
  - Has the business explained what mechanism is changing and why?
  - Are old and new KPIs clearly separated?
  - Is the J-curve or transition economics explicitly planned?
  - Has the customer journey been redesigned for the new model?
  - Are imported patterns adapted rather than copied?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Revenue logic | The unit of monetization changes | `structure_spec.md §Business System Required Elements` | Old metrics continue to govern the wrong model |
| Finance | Cash timing and valuation logic shift | `logic_rules.md §Subscription Economy Logic` | The transition appears worse or better than it really is |
| Customer system | Retention and activation become more important | `logic_rules.md §Marketing Logic` | Acquisition remains optimized while retention becomes decisive |
| Transfer logic | Borrowed models need boundary adaptation | `logic_rules.md §Transfer Patterns` | A foreign pattern is copied without fit analysis |

## Case 6: Technology Adoption (Digital Transformation)

- Related CQs: `CQ-CM-01`, `CQ-CM-02`, `CQ-CM-03`, `CQ-IN-02`
- Real-world anchor: Nadella-era Microsoft illustrates that technology adoption succeeds when the management system changes with the technology, not after it.
- Change event: The business introduces AI, cloud, analytics, or another major enabling technology.
- Verification checklist:
  - Is the adoption target stage on the Technology Adoption Lifecycle explicit?
  - Is the change model named?
  - Has the business identified the entry point for early wins?
  - Is the circular dependency between cooperation and execution addressed?
  - Is impact measured after operating integration rather than after deployment?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Innovation | Adoption risk and whole-product needs rise | `logic_rules.md §Innovation Logic` | The technology is shipped but not adopted |
| Change | Cooperation and sequencing become the bottleneck | `dependency_rules.md §Change Management Circular Dependency` | Adoption stalls in the middle |
| Organization | Roles and incentives may need redesign | `structure_spec.md §Authority and Responsibility Separation` | The old organization rejects the new workflow |
| Measurement | Success criteria move from deployment to impact | `logic_rules.md §Change Management Logic` | Activity is mistaken for value creation |

## Case 7: Organizational Scale Expansion

- Related CQs: `CQ-OH-01`, `CQ-OH-02`, `CQ-OH-03`, `CQ-OH-04`, `CQ-GR-01`
- Real-world anchor: Many founder-led businesses hit a structural wall when headcount grows faster than reporting, delegation, and control systems.
- Change event: Headcount, management layers, or departmental complexity increase materially.
- Verification checklist:
  - Does the current structure still fit the scale?
  - Are decision rights and escalation paths still workable?
  - Have agency safeguards increased with delegation?
  - Do talent pipeline and competency systems keep pace?
  - Has the business crossed a scale tier that changes required governance?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Structure | Coordination mechanism may need to change | `structure_spec.md §Organization-Strategy Fit` | The old structure collapses under complexity |
| Authority | Delegation expands faster than control | `structure_spec.md §Authority and Responsibility Separation` | Decisions become slow, duplicated, or risky |
| People | Key-role dependency increases without pipeline depth | `dependency_rules.md §Organization-Process Dependency` | Growth depends on heroic individuals |
| Governance | Formal oversight may become newly required | `domain_scope.md §Scale Tier Definitions` | The review still treats the business like a smaller organization |

## Case 8: Competitive Environment Change Response

- Related CQs: `CQ-SM-01`, `CQ-SM-02`, `CQ-SM-05`, `CQ-IN-01`
- Real-world anchor: Incumbents often recognize competitive change early but fail because their response logic is slower than the market shift.
- Change event: New entrants, substitutes, regulation, or industry-structure changes alter the competitive basis of the business.
- Verification checklist:
  - Has the competitive environment been re-analyzed?
  - Is the old advantage still valid under the new conditions?
  - Does the business have a pivot, defense, or retreat rule?
  - Has disruptive threat been identified correctly?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Strategy | The original basis of advantage may disappear | `logic_rules.md §Strategy Analysis Logic` | The firm keeps executing a dead strategy |
| Innovation | The threat may require a separate response vehicle | `logic_rules.md §Innovation Logic` | The incumbent responds with the wrong operating logic |
| Marketing | Positioning and customer value may need revision | `logic_rules.md §Marketing Logic` | Customer messaging lags behind market change |
| Governance | Risk appetite and capital allocation may need revision | `dependency_rules.md §Finance-Strategy Dependency` | Capital keeps funding the wrong strategic posture |

## Case 9: Platform Governance Crisis

- Related CQs: `CQ-PL-01`, `CQ-PL-02`, `CQ-PL-03`, `CQ-GR-02`
- Real-world anchor: Marketplace crises such as seller revolts, trust-and-safety breakdowns, or take-rate backlash show that platform growth and platform legitimacy are inseparable.
- Change event: The platform faces participant backlash, policy controversy, fraud, or regulatory pressure.
- Verification checklist:
  - Are participant sides and value exchange clearly understood?
  - Can the platform explain take rate together with participant economics?
  - Are enforcement and appeal paths real, not only stated?
  - Is there a response owner for trust, safety, and participant remediation?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Governance | Policy and enforcement legitimacy become central | `logic_rules.md §Platform Business Logic` | Monetization choices trigger ecosystem revolt |
| Economics | Take-rate logic may become nonviable | `concepts.md §Platform/Subscription/AI Extension Terms` | The platform taxes away the value needed to stay |
| Risk | Legal and reputational exposure rise together | `domain_scope.md §Bias Detection Criteria` | Governance failure is seen too late |
| Structure | Trust-and-safety ownership must become visible | `structure_spec.md §Digital Business Structure` | Policy exists with no operating owner |

## Case 10: Subscription Churn Crisis

- Related CQs: `CQ-RC-03`, `CQ-SB-01`, `CQ-SB-02`, `CQ-SB-03`
- Real-world anchor: Subscription businesses often look healthy until churn compounds long enough to erase growth from new sales.
- Change event: Churn rises rapidly, renewals weaken, or a pricing model begins to contract NRR.
- Verification checklist:
  - Are churn, NRR, and CAC metrics still being measured correctly?
  - Does customer success or product intervention respond to churn signals?
  - Has pricing architecture contributed to contraction or downgrade pressure?
  - Is there a plan to stabilize economics during the crisis?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Metrics | Revenue retention becomes the leading health signal | `concepts.md §Benchmark Registry` | Growth is over-read from bookings alone |
| Operations | Retention needs an operating owner | `structure_spec.md §Digital Business Structure` | Churn is measured but unmanaged |
| Finance | Unit economics and payback change quickly | `logic_rules.md §Subscription Economy Logic` | The business keeps spending as if retention were stable |
| Strategy | Pricing and product value may need repositioning | `logic_rules.md §Marketing Logic` | The firm treats churn as a support issue only |

## Case 11: Benchmark/Standard Version Update

- Related CQs: `CQ-FI-02`, `CQ-GR-03`, `CQ-AB-02`, `CQ-SC-03`
- Real-world anchor: Changes to benchmark regimes such as cost-of-capital studies, sustainability standards, or AI regulation can invalidate prior judgments even when the business has not changed.
- Change event: A benchmark source, external standard, or governing rule changes materially.
- Verification checklist:
  - Is the prior benchmark or standard still current?
  - Which CQs or business rules depended on the older version?
  - Does the update change thresholds, disclosures, or required controls?
  - Has the business separated benchmark refresh from business-performance change?
- Impact matrix:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Benchmark authority | Numeric or normative SSOT changes | `concepts.md §Benchmark Registry` | Old thresholds continue to drive current decisions |
| Governance | Oversight or disclosure obligations may shift | `dependency_rules.md §Governance-ESG Relationship` | Compliance logic silently drifts out of date |
| AI risk | New AI rules may increase control depth | `logic_rules.md §AI Business Logic` | Model risk is reviewed with an obsolete standard |
| Transfer logic | Cross-context comparisons may become stale | `logic_rules.md §Transfer Patterns` | Benchmarks are copied without version awareness |

## Impact Matrix Template

Use this structure when adding or revising extension cases:

| Dimension | Primary Impact | Primary Owner File | Failure Mode if Missing |
|---|---|---|---|
| Strategy | Which strategic logic changes | The section that owns that logic | What goes wrong if the change is not modeled |
| Revenue / Finance | Which economics or metrics change | The owner of the economic rule or benchmark | The financial misread or decision failure |
| Operations / Structure | Which operating or organizational structures change | The owner of the structural rule | The execution failure or bottleneck |
| Governance / Risk | Which control, authority, or compliance logic changes | The owner of the oversight or risk rule | The control failure or unmanaged exposure |

Template usage rules:
- Use actual section names from the affected files.
- Keep the matrix additive: name changed logic, not the entire document.
- If a case is governed by a modern-extension section, still show the cross-impact on finance, operations, or governance.

## Related Documents

- `competency_qs.md §7. Change Management (CQ-CM)`, `competency_qs.md §10. Platform Business (CQ-PL)`, `competency_qs.md §11. Subscription Economy (CQ-SB)`, and `competency_qs.md §13. Scalability and Adaptation (CQ-SC)` — CQ sections most often used to verify change events
- `logic_rules.md §Strategy Analysis Logic`, `logic_rules.md §Change Management Logic`, and `logic_rules.md §Transfer Patterns` — the business-rule sections that drive case-level interpretation
- `structure_spec.md §Business System Required Elements`, `structure_spec.md §Authority and Responsibility Separation`, and `structure_spec.md §Digital Business Structure` — structural sections affected by business change events
- `dependency_rules.md §M&A Dependency`, `dependency_rules.md §Change Management Circular Dependency`, and `dependency_rules.md §Operations-Quality Dependency` — dependency paths that often break first under change
