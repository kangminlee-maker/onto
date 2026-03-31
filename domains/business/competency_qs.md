---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Competency Questions

This document defines the questions a business review must be able to answer.
The questions are organized by verification concern and written in CQ format so that inference paths and pass/fail logic are explicit.

Priority levels:
- **P1**: Must be answerable in any serious business review. Failure indicates a fundamental design gap.
- **P2**: Should be answerable in operating businesses. Failure indicates a material quality gap.
- **P3**: Recommended for mature or more complex businesses. Failure indicates a refinement opportunity.

Applicability conventions:
- `SKIP-scale` = the target scale is known and falls outside the CQ's applicable range
- `SKIP-scale-unknown` = the CQ is tier-sensitive but the scale input contract is not satisfied
- `SKIP-benchmark` = the CQ is applicable, but a required benchmark is unavailable or inapplicable
- `N/A-pattern` = the business pattern that triggers the CQ does not exist in the target

## 1. Strategic Management (CQ-SM)

- **CQ-SM-01** [P1] Has the industry competitive environment of `{target business}` been analyzed using a defensible framework?
  - Inference path: `domain_scope.md §Strategic Management` -> derive competitive analysis as a required concern AND `logic_rules.md §Strategy Analysis Logic` -> confirm strategy needs industry basis -> `concepts.md §Strategic Management Core Terms` -> compare against Porter's Five Forces or an equivalent structure -> conclusion
  - Verification criteria: PASS if rivalry, substitutes, entry pressure, and bargaining dynamics are explicitly analyzed with implications for strategic choice. FAIL if strategic direction is stated with no competitive-environment basis.

- **CQ-SM-02** [P1] Has the source of competitive advantage been identified and tested for sustainability?
  - Inference path: `domain_scope.md §Strategic Management` -> derive resource-based strategy as required AND `concepts.md §Strategic Management Core Terms` -> confirm VRIO meaning -> `logic_rules.md §Strategy Analysis Logic` -> compare claimed advantage against value, rarity, imitability resistance, and organizational support -> conclusion
  - Verification criteria: PASS if the business names its advantage source and explains why competitors cannot readily neutralize it. FAIL if the advantage is described only as a feature list, trend, or aspiration.

- **CQ-SM-03** [P1] Is the growth strategy direction stated with a clear rationale for why that direction was chosen?
  - Inference path: `concepts.md §Strategic Management Core Terms` -> derive Ansoff and diversification logic AND `logic_rules.md §Strategy Analysis Logic` -> compare growth risk by adjacency and capability transfer -> `structure_spec.md §Strategy-Marketing-Operations Alignment` -> confirm downstream implications -> conclusion
  - Verification criteria: PASS if the business states whether it is pursuing penetration, market development, product development, or diversification and explains why. FAIL if growth is described only as "expand" or "scale" without a direction-specific rationale.

- **CQ-SM-04** [P1] Is the relationship between strategic objectives and execution paths traceable?
  - Inference path: `structure_spec.md §Business System Required Elements` -> derive strategy system and execution visibility AND `dependency_rules.md §Strategy-Execution Dependency` -> confirm objectives must map to programs -> `domain_scope.md §Required Concept Categories` -> reconcile with performance measurement and organization design -> conclusion
  - Verification criteria: PASS if each major strategic objective maps to at least one execution path, resource commitment, and KPI. FAIL if strategic goals exist without a visible delivery mechanism.

- **CQ-SM-05** [P2] Is there a strategy modification path for major environmental change?
  - Inference path: `logic_rules.md §Strategy Analysis Logic` -> derive strategy modification triggers as necessary AND `dependency_rules.md §Strategy-Execution Dependency` -> confirm KPI and environmental feedback must flow back to strategy -> `structure_spec.md §Hierarchy Structure Principles` -> compare feedback-loop completeness -> conclusion
  - Verification criteria: PASS if trigger conditions and response options such as pivot, defense, retreat, or reallocation are stated. FAIL if environmental change is acknowledged with no decision rule for adaptation.

## 2. Marketing (CQ-MK)

- **CQ-MK-01** [P1] Are the segmentation criteria and target-market rationale explicitly stated?
  - Inference path: `domain_scope.md §Marketing` -> derive market strategy as required AND `concepts.md §Marketing Core Terms` -> confirm STP structure -> `logic_rules.md §Marketing Logic` -> compare segmentation and targeting order -> conclusion
  - Verification criteria: PASS if customer segments are defined with meaningful criteria and the chosen target is justified. FAIL if the business names a broad market with no segment-selection logic.

- **CQ-MK-02** [P1] Is the positioning of `{target business}` clear relative to meaningful alternatives?
  - Inference path: `concepts.md §Marketing Core Terms` -> derive positioning as comparative logic AND `logic_rules.md §Marketing Logic` -> confirm positioning constrains price and channel -> `logic_rules.md §Strategy Analysis Logic` -> reconcile with generic strategy choice -> conclusion
  - Verification criteria: PASS if the business explains how it should be preferred over real alternatives or substitutes. FAIL if positioning is generic, internally framed, or detached from competitor comparison.

- **CQ-MK-03** [P1] Are the marketing-mix elements aligned with the chosen target and position?
  - Inference path: `domain_scope.md §Marketing` -> derive marketing mix as required AND `logic_rules.md §Marketing Logic` -> confirm mix elements are interdependent -> `structure_spec.md §Strategy-Marketing-Operations Alignment` -> compare with operating capability -> conclusion
  - Verification criteria: PASS if product, price, place, and promotion (or 7P) reinforce the stated target and position. FAIL if key mix elements contradict the intended segment or strategy.

- **CQ-MK-04** [P2] Are the key touchpoints in the customer journey identified with stage-level measurement?
  - Inference path: `concepts.md §Marketing Core Terms` -> derive customer journey as staged path AND `logic_rules.md §Marketing Logic` -> confirm stage-level measurement is needed -> `domain_scope.md §Required Concept Categories` -> reconcile with performance measurement -> conclusion
  - Verification criteria: PASS if major journey stages and their conversion, retention, or drop-off measurements are defined. FAIL if the journey is described only narratively or measured only in aggregate.

## 3. Finance (CQ-FI)

- **CQ-FI-01** [P1] Are capital-budgeting techniques applied to significant investment decisions?
  - Inference path: `domain_scope.md §Finance` -> derive investment decision-making as required AND `concepts.md §Finance Core Terms` -> confirm NPV, IRR, and decision-rule meanings -> `logic_rules.md §Financial Decision-Making Logic` -> compare whether committed capital follows a stated rule -> conclusion
  - Verification criteria: PASS if significant investments use an explicit evaluation method such as NPV, IRR, staged investment, or an equivalent rule. FAIL if capital decisions are justified only by intuition or generic optimism.

- **CQ-FI-02** [P2] Has an explicit discount-rate logic such as WACC been calculated and used where applicable?
  - Applicability: Small-Large. Micro: SKIP-scale. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Finance` -> derive capital structure as required from Small upward AND `concepts.md §Finance Core Terms` -> confirm WACC meaning -> `logic_rules.md §Financial Decision-Making Logic` -> compare actual discount-rate use against capital structure and risk -> conclusion
  - Verification criteria: PASS if the business uses a justified discount-rate logic tied to financing structure and risk. FAIL if valuation or investment approval uses an arbitrary rate with no capital-cost rationale. SKIP if the target is outside the applicable scale range or scale evidence is missing.

- **CQ-FI-03** [P1] Has cash-flow forecasting been performed with a response path for liquidity stress?
  - Inference path: `domain_scope.md §Finance` -> derive working-capital management as required AND `concepts.md §Finance Core Terms` -> confirm CCC and working-capital meanings -> `logic_rules.md §Financial Decision-Making Logic` -> compare liquidity management completeness -> conclusion
  - Verification criteria: PASS if the business has a forward-looking cash view and defined responses for shortfalls or shocks. FAIL if liquidity is assumed rather than actively planned.

- **CQ-FI-04** [P1] Are the key assumptions behind the revenue model and valuation logic stated?
  - Inference path: `structure_spec.md §Business System Required Elements` -> derive revenue architecture as required AND `domain_scope.md §Required Concept Categories` -> confirm revenue model is mandatory -> `logic_rules.md §Financial Decision-Making Logic` -> compare whether return logic rests on explicit assumptions -> conclusion
  - Verification criteria: PASS if price, volume, adoption, share, margin, and sensitivity assumptions are visible where they matter. FAIL if financial outcomes depend on implied assumptions that are never stated.

## 4. Revenue and Cost Structure (CQ-RC)

- **CQ-RC-01** [P1] Has the revenue-generation structure been identified with pricing rationale?
  - Inference path: `domain_scope.md §Required Concept Categories` -> derive revenue model as mandatory AND `structure_spec.md §Business System Required Elements` -> confirm revenue architecture must be explicit -> `concepts.md §Marketing Core Terms` -> compare willingness-to-pay and positioning logic -> conclusion
  - Verification criteria: PASS if the revenue unit, pricing mechanism, and rationale for how value is monetized are explicit. FAIL if the business only lists products or customers without explaining how revenue is captured.

- **CQ-RC-02** [P1] Are fixed and variable costs distinguished with break-even logic?
  - Inference path: `structure_spec.md §Business System Required Elements` -> derive cost architecture as required AND `concepts.md §Finance Core Terms` -> confirm break-even and contribution margin meanings -> `logic_rules.md §Cost Classification Logic` -> compare cost classification discipline -> conclusion
  - Verification criteria: PASS if fixed and variable costs are separated and break-even or contribution logic can be derived. FAIL if cost structure is stated only as a total spend number.

- **CQ-RC-03** [P2] In recurring or marketplace models, are unit-economics metrics such as LTV, CAC, churn, and NRR defined with explicit calculation bases?
  - Applicability: when a subscription, marketplace, or recurring-revenue model exists. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Modern Extensions` -> derive recurring and platform economics triggers AND `concepts.md §Platform/Subscription/AI Extension Terms` -> confirm metric meanings -> `logic_rules.md §Subscription Economy Logic` -> compare unit-economics completeness -> conclusion
  - Verification criteria: PASS if metric formulas, scope, cadence, and owners are defined. FAIL if the business cites LTV/CAC or churn only as slogans or dashboard labels. N/A if the target does not use a recurring or marketplace model.

- **CQ-RC-04** [P2] In ROI calculations, are the investment scope and return-attribution period explicitly aligned?
  - Inference path: `concepts.md §Finance Core Terms` -> derive ROI scope discipline AND `logic_rules.md §Financial Decision-Making Logic` -> confirm numerator and denominator must match -> `dependency_rules.md §Finance-Strategy Dependency` -> compare with scale decision logic -> conclusion
  - Verification criteria: PASS if ROI uses matched scope, matched time window, and explicit cost inclusion rules. FAIL if returns are counted over a different scope or period than the underlying investment.

## 5. Operations and Automation (CQ-OP)

- **CQ-OP-01** [P1] Has the core operational bottleneck been identified with a defined improvement approach?
  - Inference path: `domain_scope.md §Operations Management` -> derive constraint management as required AND `concepts.md §Operations Management Core Terms` -> confirm TOC meaning -> `logic_rules.md §Operations Management Logic` -> compare improvement focus against the bottleneck -> conclusion
  - Verification criteria: PASS if the bottleneck or throughput constraint is named and the improvement plan targets it directly. FAIL if the business optimizes general activity without identifying the limiting step.

- **CQ-OP-02** [P1] Is the scope of automation clearly defined?
  - Inference path: `domain_scope.md §Operations Management` -> derive automation as a bounded concern AND `concepts.md §Operations Management Core Terms` -> confirm automation requires a scope boundary -> `logic_rules.md §Operations Management Logic` -> compare whether start and end points are explicit -> conclusion
  - Verification criteria: PASS if the automated process has a named start point, end point, exception boundary, and owner. FAIL if automation is described only as "we automated it" without scope definition.

- **CQ-OP-03** [P1] Is the authority for adjudicating discrepancies between manual and automated results designated?
  - Inference path: `logic_rules.md §Operations Management Logic` -> derive discrepancy authority as required AND `structure_spec.md §Authority and Responsibility Separation` -> confirm adjudication is a distinct authority type -> `dependency_rules.md §Organization-Process Dependency` -> compare alignment with execution responsibility -> conclusion
  - Verification criteria: PASS if a person, role, or forum is responsible for exception resolution between human and automated outputs. FAIL if discrepancy handling is improvised after errors occur.

- **CQ-OP-04** [P2] Is the path for converting time savings into economic value explicitly explained?
  - Inference path: `concepts.md §Finance Core Terms` -> derive contribution and ROI logic AND `logic_rules.md §Financial Decision-Making Logic` -> confirm time saved is not automatically cost saved -> `dependency_rules.md §Finance-Strategy Dependency` -> compare with scale-decision consequences -> conclusion
  - Verification criteria: PASS if the business explains whether released time is removed, redeployed, or converted into higher throughput or revenue. FAIL if savings are claimed with no capacity-conversion path.

- **CQ-OP-05** [P2] Are key supply-chain risks identified with explicit operational consequences?
  - Applicability: when the business depends on suppliers, inventory, or external fulfillment. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Operations Management` -> derive supply chain as a conditional concern AND `dependency_rules.md §Operations-Quality Dependency` -> confirm supply-chain design links to risk posture -> `logic_rules.md §Operations Management Logic` -> compare resilience completeness -> conclusion
  - Verification criteria: PASS if concentration, lead-time, geography, substitution difficulty, or other material risks are identified with response logic. FAIL if supply-chain dependence exists but is treated as a black box. N/A if the business has no meaningful supply-chain exposure.

## 6. Organization and HR (CQ-OH)

- **CQ-OH-01** [P1] Is the organizational structure appropriate for the business strategy, scale, and environment?
  - Inference path: `domain_scope.md §Organization & HR` -> derive organizational structure as required AND `structure_spec.md §Organization-Strategy Fit` -> compare structure type against environment and coordination need -> `concepts.md §Organization/HR Core Terms` -> confirm Mintzberg meanings -> conclusion
  - Verification criteria: PASS if the business can justify why its current structure fits its strategic and operating context. FAIL if the structure is implicit, contradictory, or treated as irrelevant.

- **CQ-OH-02** [P2] Is the decision-authority structure stated with safeguards against agency risk?
  - Applicability: Small-Large. Micro: SKIP-scale. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Organization & HR` -> derive organizational theory from Small upward AND `concepts.md §Organization/HR Core Terms` -> confirm Agency Theory meaning -> `structure_spec.md §Authority and Responsibility Separation` -> compare delegation and monitoring completeness -> conclusion
  - Verification criteria: PASS if the business names who decides, who executes, and how monitoring or incentive alignment works. FAIL if delegated authority exists with no visible safeguard. SKIP if the target is outside the applicable scale range or scale evidence is missing.

- **CQ-OH-03** [P2] Does a talent pipeline exist for key roles?
  - Applicability: Small-Large. Micro: SKIP-scale. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Organization & HR` -> derive human-resource management from Small upward AND `concepts.md §Organization/HR Core Terms` -> confirm talent pipeline meaning -> `dependency_rules.md §Organization-Process Dependency` -> compare role continuity logic -> conclusion
  - Verification criteria: PASS if key roles have candidate, succession, or development paths. FAIL if role continuity depends on irreplaceable individuals with no pipeline logic. SKIP if the target is outside the applicable scale range or scale evidence is missing.

- **CQ-OH-04** [P2] Is the competency model linked to performance management and role design?
  - Applicability: Small-Large. Micro: SKIP-scale. scale unknown: SKIP-scale-unknown.
  - Inference path: `concepts.md §Organization/HR Core Terms` -> derive competency-model meaning AND `structure_spec.md §Business System Required Elements` -> confirm people system structure -> `dependency_rules.md §Organization-Process Dependency` -> reconcile competency definitions with hiring, development, and role expectations -> conclusion
  - Verification criteria: PASS if competencies influence hiring, evaluation, development, or promotion decisions. FAIL if competencies are absent or disconnected from performance management. SKIP if the target is outside the applicable scale range or scale evidence is missing.

## 7. Change Management (CQ-CM)

- **CQ-CM-01** [P2] Has a defined change-management model been applied to a material change initiative?
  - Applicability: Small-Large when a material change program exists. Micro: SKIP-scale. No material change program: N/A-pattern. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Organization & HR` -> derive change management as a conditional concern from Small upward AND `concepts.md §Organization/HR Core Terms` -> confirm Kotter and ADKAR meanings -> `logic_rules.md §Change Management Logic` -> compare sequencing completeness -> conclusion
  - Verification criteria: PASS if a material change initiative uses an explicit model or equivalent change sequence. FAIL if a large change is expected to succeed with no adoption framework. SKIP or N/A according to applicability.

- **CQ-CM-02** [P2] Is the cooperation-securing plan in the "first success -> expansion" pattern specific?
  - Applicability: Small-Large when change adoption depends on cross-functional cooperation. Micro: SKIP-scale. No such dependency: N/A-pattern. scale unknown: SKIP-scale-unknown.
  - Inference path: `logic_rules.md §Change Management Logic` -> derive first-win logic as a transfer mechanism AND `dependency_rules.md §Change Management Circular Dependency` -> compare the entry-point design -> `structure_spec.md §Authority and Responsibility Separation` -> confirm sponsor or owner visibility -> conclusion
  - Verification criteria: PASS if the business names who must cooperate first, why they would cooperate, and what makes the first win transferable. FAIL if "pilot first" is asserted with no cooperation design. SKIP or N/A according to applicability.

- **CQ-CM-03** [P2] Is there an explicit resolution path for the circular dependency between cooperation and change execution?
  - Applicability: Small-Large when the initiative depends on adoption behavior. Micro: SKIP-scale. No adoption dependency: N/A-pattern. scale unknown: SKIP-scale-unknown.
  - Inference path: `dependency_rules.md §Change Management Circular Dependency` -> derive the circular pattern AND `logic_rules.md §Change Management Logic` -> confirm an entry rule must exist -> `structure_spec.md §Business System Required Elements` -> compare whether ownership and process exist -> conclusion
  - Verification criteria: PASS if the business states how it breaks the cycle through sponsorship, incentives, pilot scope, or proof points. FAIL if cooperation and execution are both assumed to appear without an entry mechanism. SKIP or N/A according to applicability.

## 8. Innovation (CQ-IN)

- **CQ-IN-01** [P2] Has the innovation type facing `{target business}` been identified with an appropriate response strategy?
  - Inference path: `domain_scope.md §Innovation Management` -> derive disruptive and sustaining innovation as relevant concerns AND `concepts.md §Innovation Management Core Terms` -> confirm type meanings -> `logic_rules.md §Innovation Logic` -> compare whether the response matches the innovation type -> conclusion
  - Verification criteria: PASS if the business identifies whether the threat or opportunity is sustaining, disruptive, or otherwise distinct and states the response logic. FAIL if innovation is discussed only as a generic need to "be innovative."

- **CQ-IN-02** [P2] When introducing a new technology or product, are the target stage on the Technology Adoption Lifecycle and the Chasm response defined?
  - Applicability: when the business is introducing a new technology or adoption-sensitive product. Otherwise: N/A-pattern.
  - Inference path: `concepts.md §Innovation Management Core Terms` -> derive lifecycle and Chasm meanings AND `logic_rules.md §Innovation Logic` -> confirm whole-product and beachhead requirements -> `dependency_rules.md §Strategy-Marketing Dependency` -> compare downstream go-to-market implications -> conclusion
  - Verification criteria: PASS if the business names the intended adopter stage and the mechanism for crossing adoption risk. FAIL if adoption is assumed to be uniform across the market. N/A if no adoption-sensitive launch exists.

- **CQ-IN-03** [P3] If both exploration and exploitation are pursued, is the separation or coordination rule explicit?
  - Applicability: when the business is trying to run innovation and efficiency agendas simultaneously. Otherwise: N/A-pattern.
  - Inference path: `concepts.md §Innovation Management Core Terms` -> derive ambidexterity meaning AND `logic_rules.md §Innovation Logic` -> confirm exploration and exploitation need separation rules -> `logic_rules.md §Constraint Conflict Checking` -> reconcile efficiency-versus-innovation tension -> conclusion
  - Verification criteria: PASS if the business states how experimentation and core execution are structurally separated or coordinated. FAIL if both are demanded without a resource-allocation or operating-boundary rule. N/A if the business is not pursuing both at once.

## 9. Governance and Risk (CQ-GR)

- **CQ-GR-01** [P1] Is the corporate-governance structure defined for businesses that need formal oversight?
  - Applicability: Mid-Large. Micro-Small: SKIP-scale. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Governance & Risk` -> derive corporate governance as required from Mid upward AND `structure_spec.md §Authority and Responsibility Separation` -> confirm control authority is distinct from execution -> `concepts.md §Governance/Risk Core Terms` -> compare oversight completeness -> conclusion
  - Verification criteria: PASS if oversight, internal-control logic, and escalation structure are defined for a Mid/Large target. FAIL if delegated authority exists at scale with no formal control structure. SKIP if the target is outside range or scale evidence is missing.

- **CQ-GR-02** [P1] Have response strategies been designated for identified risks?
  - Inference path: `domain_scope.md §Governance & Risk` -> derive risk management as required AND `concepts.md §Governance/Risk Core Terms` -> confirm residual risk and control-owner meanings -> `dependency_rules.md §Operations-Quality Dependency` AND `dependency_rules.md §Governance-ESG Relationship` -> compare whether risk consequences have owners -> conclusion
  - Verification criteria: PASS if major risks have a response posture and owner. FAIL if risks are listed with no mitigation, transfer, acceptance, or escalation logic.

- **CQ-GR-03** [P2] If ESG or sustainability commitments exist, are they treated as an independent concern from governance with overlap made explicit?
  - Applicability: Small-Large when ESG disclosure, sustainability claims, or stakeholder-impact commitments exist. Micro: SKIP-scale. No ESG commitment: N/A-pattern. scale unknown: SKIP-scale-unknown.
  - Inference path: `domain_scope.md §Governance & Risk` -> derive ESG as a separate concern AND `dependency_rules.md §Governance-ESG Relationship` -> confirm bidirectional reference logic -> `concepts.md §Governance/Risk Core Terms` -> compare governance versus stakeholder-impact boundaries -> conclusion
  - Verification criteria: PASS if ESG ownership, disclosure logic, and overlap with governance are explicitly separated. FAIL if ESG is collapsed into governance with no boundary or owner clarity. SKIP or N/A according to applicability.

## 10. Platform Business (CQ-PL)

- **CQ-PL-01** [P2] If the business is a platform, are the participant sides and network effects explicitly defined?
  - Applicability: when a multi-sided or marketplace model exists. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Modern Extensions` -> derive platform business as a triggered concern AND `concepts.md §Platform/Subscription/AI Extension Terms` -> confirm network-effect and liquidity meanings -> `logic_rules.md §Platform Business Logic` -> compare side-value completeness -> conclusion
  - Verification criteria: PASS if the business names the participant sides, the value each side receives, and the relevant network-effect mechanism. FAIL if it claims platform economics with no side-specific logic. N/A if no platform model exists.

- **CQ-PL-02** [P2] Are take rate, liquidity, and participant economics defined coherently?
  - Applicability: when a monetized platform or marketplace model exists. Otherwise: N/A-pattern.
  - Inference path: `concepts.md §Platform/Subscription/AI Extension Terms` -> derive take-rate and liquidity meanings AND `logic_rules.md §Platform Business Logic` -> confirm monetization depends on participant economics -> `dependency_rules.md §Platform Dependency Chains` -> compare cross-side dependency closure -> conclusion
  - Verification criteria: PASS if the business can explain how monetization, participant surplus, and matching quality fit together. FAIL if take rate is discussed in isolation from side economics. N/A if the target does not operate a monetized platform.

- **CQ-PL-03** [P1] Is platform governance defined with enforcement and appeal paths?
  - Applicability: when the business governs interactions between platform participants. Otherwise: N/A-pattern.
  - Inference path: `structure_spec.md §Digital Business Structure` -> derive governance owner and dispute path requirements AND `logic_rules.md §Platform Business Logic` -> confirm policy without enforcement is insufficient -> `domain_scope.md §Bias Detection Criteria` -> compare against platform-governance bias -> conclusion
  - Verification criteria: PASS if platform rules have an enforcing owner, an exception path, and a contest or appeal mechanism. FAIL if participant rules are unilateral statements with no operational governance path. N/A if no participant-governance layer exists.

## 11. Subscription Economy (CQ-SB)

- **CQ-SB-01** [P2] If the business has recurring revenue, are subscription metrics and unit economics defined with explicit thresholds where appropriate?
  - Applicability: when a recurring-revenue model exists. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Modern Extensions` -> derive subscription economy as a triggered concern AND `concepts.md §Platform/Subscription/AI Extension Terms` -> confirm MRR, ARR, churn, NRR, and CAC meanings -> `concepts.md §Benchmark Registry` -> compare against threshold use such as `LTV/CAC > 3` or `NRR > 100%` -> conclusion
  - Verification criteria: PASS if recurring-revenue metrics are defined with formulas, owners, and appropriate threshold or context usage. FAIL if recurring metrics are cited with no calculation basis. SKIP if a benchmark needed for judgment is unavailable. N/A if no recurring model exists.

- **CQ-SB-02** [P2] Is churn and net-retention management connected to an operating loop such as customer success, pricing intervention, or product change?
  - Applicability: when a recurring-revenue model exists. Otherwise: N/A-pattern.
  - Inference path: `concepts.md §Platform/Subscription/AI Extension Terms` -> derive churn and NRR meanings AND `logic_rules.md §Subscription Economy Logic` -> confirm retention metrics need intervention loops -> `structure_spec.md §Digital Business Structure` -> compare owner visibility -> conclusion
  - Verification criteria: PASS if churn or contraction signals trigger a named operating response. FAIL if retention metrics are measured but have no operational owner or intervention path. N/A if no recurring model exists.

- **CQ-SB-03** [P2] In a subscription transition or pricing reset, is the J-curve and transition economics explicitly managed?
  - Applicability: when the business is moving into subscription, materially changing pricing architecture, or resetting contract economics. Otherwise: N/A-pattern.
  - Inference path: `logic_rules.md §Subscription Economy Logic` -> derive J-curve logic AND `dependency_rules.md §Finance-Strategy Dependency` -> confirm transition economics constrain strategic pace -> `structure_spec.md §Strategy-Marketing-Operations Alignment` -> compare downstream effects -> conclusion
  - Verification criteria: PASS if the business explains how revenue timing, liquidity, sales incentives, and customer migration are managed during the transition. FAIL if the transition is presented as a pricing change with no economic transition plan. N/A if no such transition exists.

## 12. AI Business (CQ-AB)

- **CQ-AB-01** [P2] If the business claims AI advantage, are the data moat and model economics stated explicitly?
  - Applicability: when AI is part of the product, workflow, or business-model claim. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Modern Extensions` -> derive AI business as a triggered concern AND `concepts.md §Platform/Subscription/AI Extension Terms` -> confirm data moat and model-economics meanings -> `logic_rules.md §AI Business Logic` -> compare whether the claim has a real capture mechanism -> conclusion
  - Verification criteria: PASS if the business explains unique data access, feedback-loop defensibility, and the economics of serving AI output. FAIL if AI advantage is described as model usage alone. N/A if AI is not part of the business claim.

- **CQ-AB-02** [P1] If AI affects business decisions or customer outcomes, is AI governance defined with explainability, override, and data-rights logic?
  - Applicability: when AI outputs affect customer-facing, employee-facing, or operational decisions. Otherwise: N/A-pattern.
  - Inference path: `logic_rules.md §AI Business Logic` -> derive governance requirements for explainability and override AND `dependency_rules.md §AI/Data Dependency` -> confirm data rights and rollback dependencies -> `domain_scope.md §Bias Detection Criteria` -> compare against algorithmic-accountability risk -> conclusion
  - Verification criteria: PASS if the business names model owner, override path, appeal path, monitoring logic, and data-rights basis. FAIL if AI decisions operate with no governance or contestability design. N/A if AI is not used in consequential decision flows.

## 13. Scalability and Adaptation (CQ-SC)

- **CQ-SC-01** [P2] In M&A, can the key structure of core systems and governance accommodate the acquired business?
  - Applicability: Small-Large when acquisition or integration is in scope. Micro: SKIP-scale. No M&A scope: N/A-pattern. scale unknown: SKIP-scale-unknown.
  - Inference path: `structure_spec.md §Core System Key Structure (M&A Compatibility)` -> derive key-structure requirements AND `dependency_rules.md §M&A Dependency` -> confirm integration dependencies -> `domain_scope.md §Strategic Management` -> compare with business-development or acquisition rationale -> conclusion
  - Verification criteria: PASS if identifiers, transition structure, and governance integration logic are visible. FAIL if acquisition is planned or underway with no integration design. SKIP or N/A according to applicability.

- **CQ-SC-02** [P2] When the business expands to new markets or regions, are regulatory, cultural, and operational response paths defined?
  - Applicability: when market or regional expansion is in scope. Otherwise: N/A-pattern.
  - Inference path: `domain_scope.md §Strategic Management` -> derive market-development logic AND `logic_rules.md §Strategy Analysis Logic` -> confirm environmental change needs an adaptation path -> `dependency_rules.md §Strategy-Marketing Dependency` AND `dependency_rules.md §Operations-Quality Dependency` -> reconcile market, operating, and supply implications -> conclusion
  - Verification criteria: PASS if the business states how regulation, customer behavior, and operations change by region and what adaptations are required. FAIL if expansion is described as geographic replication with no local-response logic. N/A if no expansion is in scope.

- **CQ-SC-03** [P3] When importing a business-model or operating pattern from another context, are the boundary conditions and adaptation logic explicit?
  - Applicability: when the business is transferring a pattern across industries, scales, or models. Otherwise: N/A-pattern.
  - Inference path: `logic_rules.md §Transfer Patterns` -> derive source pattern, preserved mechanism, changed assumptions, and adaptation rule AND `concepts.md §Benchmark Registry` -> compare whether benchmark transfer is context-appropriate -> `domain_scope.md §Bias Detection Criteria` -> exclude scale-mismatch and pattern-copying bias -> conclusion
  - Verification criteria: PASS if the business can explain what mechanism is being transferred, what assumptions change, and how the pattern is adapted. FAIL if it copies a pattern or benchmark by analogy alone. N/A if no cross-context transfer is being claimed.

## Related Documents

- `domain_scope.md §Sub-area to CQ Section Mapping` and `domain_scope.md §Scale Tier Definitions` — the scope and scale rules that govern these questions
- `concepts.md §Benchmark Registry` — numeric thresholds and context values referenced by verification criteria
- `logic_rules.md §Strategy Analysis Logic`, `logic_rules.md §Financial Decision-Making Logic`, and `logic_rules.md §Transfer Patterns` — representative rule anchors that recur across the inference paths
- `structure_spec.md §Business System Required Elements`, `structure_spec.md §Authority and Responsibility Separation`, `dependency_rules.md §Strategy-Execution Dependency`, and `dependency_rules.md §Platform Dependency Chains` — structural and dependency anchors that close the reasoning chain
