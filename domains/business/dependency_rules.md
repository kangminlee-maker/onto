# Business Domain — Dependency Rules

## Strategy-Execution Dependency

- Strategic objective -> Execution plan: every strategic objective must be materialized into at least 1 execution plan
- Execution plan -> Resource allocation: every execution plan must have required resources (budget, personnel, time) allocated
- Resource allocation -> Performance measurement: performance measurement criteria (KPI) must exist for allocated resources
- Reverse feedback: a path must exist for performance measurement results to trigger strategy modification
- Balanced Scorecard causal chain: the causal relationship in the direction of learning & growth -> internal process -> customer -> financial must be traceable

## Strategy-Marketing Dependency

- Competitive strategy (Porter) -> STP: the choice of cost leadership/differentiation strategy influences market segmentation criteria and target selection
- STP -> Marketing mix (4P/7P): positioning must be defined before each element of the marketing mix can be determined
- Customer journey -> Operational processes: the experience at customer touchpoints is implemented by operational processes
- Brand strategy -> Pricing strategy: brand positioning constrains the price range. Excessive discounting of a premium brand damages brand equity

## Finance-Strategy Dependency

- Investment decision (NPV/IRR) -> Strategy execution: a strategy not validated for financial viability cannot secure execution resources
- Capital structure (WACC) -> Investment criteria: WACC must be calculated for investment acceptance/rejection criteria to be established
- Cash flow forecast -> Operations plan: liquidity constraints limit operational scale and speed
- Automation investment -> Effectiveness measurement: automation scope (start/end points) definition -> baseline measurement -> post-implementation measurement -> comparison. If this sequence is broken, effectiveness claims are unverified

## Organization-Strategy Dependency

- Strategy type -> Organizational structure: innovation strategies suit flexible structures (adhocracy); efficiency strategies suit machine bureaucracy. Misalignment between strategy and structure reduces execution capability
- Organizational structure -> Decision-making speed: deeper hierarchies slow decision-making. If the strategy requires rapid response, structural simplification is needed
- Agency Theory: delegation level -> monitoring mechanisms -> incentive design. These 3 must be designed simultaneously

## Change Management Circular Dependency

- Technology adoption -> cooperation securing -> success case -> expansion -> additional cooperation forms a circular structure; the entry point for starting the cycle must be stated
- Entry point candidates: (1) executive sponsorship (top-down), (2) scope-limited pilot (bottom-up), (3) borrowing external success cases
- In Kotter's 8 Steps, steps 1-3 (urgency/coalition/vision) serve as the cycle entry point
- In ADKAR, Awareness -> Desire must be secured before Knowledge/Ability training is effective
- If the circular dependency is not resolved, the change management plan itself becomes non-executable (deadlock)

## Organization-Process Dependency

- Organizational structure change -> Process redesign: when organizational structure changes, the processes handled by that organization must also be reviewed
- Process automation -> Role redefinition: when automation changes existing roles, redeployment/retraining plans for affected personnel are needed
- Competency model -> Talent pipeline: when the competency model changes, talent acquisition/development criteria must change accordingly
- Decision-making authority -> Execution responsibility: misalignment between authority and responsibility (authority without responsibility, or vice versa) causes execution bottlenecks

## Operations-Quality Dependency

- Lean/Six Sigma -> KPI: process improvement goals must be aligned with strategic KPIs. Improving without alignment leads to local optimization
- TOC -> Resource allocation: investing in the bottleneck resource first improves overall system performance. Investing in non-bottlenecks has no effect
- Supply chain -> Risk management: supply chain risks such as single-supplier dependency and lead time variability must be integrated into enterprise risk management

## Governance-ESG Relationship

- Corporate governance and ESG are independent concerns, but they overlap in board composition/oversight functions
- Priority in overlapping areas: governance regulations (legal obligation) > ESG standards (voluntary disclosure) — however, legislated ESG requirements are equivalent to governance
- Governance system changes require ESG impact assessment; ESG standard changes require governance system consistency verification — bidirectional reference is required

## M&A Dependency

- When integrating an acquired company, key structure compatibility of core systems (financial/customer/operations) is a prerequisite for verification
- When key structures are incompatible: choose among (1) key mapping table, (2) transitional parallel operation, (3) unified key system design
- Integration of organizational culture differences: from a Stakeholder Theory perspective, the interests of stakeholders on both sides must be reconciled
- The target organizational type (per Mintzberg) after integration must be stated

## Source of Truth Management

- Source of truth for financial data: the ledger of the accounting system (ERP, etc.)
- Source of truth for strategic decisions: board/management meeting minutes
- Source of truth for KPI data: the designated measurement system. When manual reports and system data disagree, system data takes precedence (however, a system error verification procedure is needed)
- When the source of truth changes (system replacement, etc.), all existing reference relationships must be updated. Partial updates create dual authority

## Related Documents
- concepts.md — definitions of strategy, marketing, governance, change management, and other terms
- structure_spec.md — hierarchy structure, organization-strategy fit, key structure rules
- logic_rules.md — strategy/finance/operations/change management logic
