---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Business Domain — Structure Specification

## Business System Required Elements

- **Strategy system**: competitive environment analysis, competitive advantage source, growth direction, positioning
- **Revenue structure**: revenue generation sources, pricing system, revenue model type (product sales/service/subscription/platform/licensing)
- **Cost structure**: fixed/variable cost distinction, cost attribution principles, break-even point
- **Marketing system**: STP, marketing mix, customer journey, brand strategy
- **Value delivery system**: paths and touchpoints through which value is delivered to customers
- **Operations system**: core processes, bottleneck management, supply chain, quality management
- **Organizational structure**: decision-making authority, responsibility allocation, reporting hierarchy, organizational type
- **HR system**: competency model, performance management, talent acquisition/development
- **Governance system**: board of directors, internal controls, risk management, auditing

## Required Relations

- Every revenue source must correspond to at least 1 cost item (revenue-cost correspondence)
- Every strategic objective must be linked to at least 1 execution plan (strategy-execution linkage)
- Every KPI must have its measurement method and data collection path defined (measurability)
- All marketing activities must align with the target market defined in STP (marketing alignment)
- Organizational structure must be appropriate for the strategy type and business scale (structure-strategy fit)
- The performance management system must be linked to KPIs derived from strategic objectives (performance-strategy alignment)

## Hierarchy Structure Principles

- Strategy -> Tactics -> Operations: the direction of concretization
- When operational-level results invalidate strategic-level assumptions, a feedback path must exist
- In businesses where the strategy/tactics/operations 3-tier distinction is fluid (digital/agile), feedback cycles between tiers and strategy modification triggers must be stated
- The causal relationship among Balanced Scorecard's 4 perspectives (financial/customer/internal process/learning & growth) must be logically connected

## Strategy-Marketing-Operations Alignment

- Porter's competitive strategy choice (cost leadership/differentiation) must be reflected in the marketing mix. A premium pricing policy with a cost leadership strategy is a contradiction
- STP's target market must be consistent with the strategic growth direction (Ansoff Matrix)
- Whether the operations system's capabilities can actually deliver the value promised by strategy/marketing must be verified
- The direction of operational optimization (Lean/Six Sigma, etc.) must be aligned with strategic priorities

## Organization-Strategy Fit

Classification axis: **organizational structure type and suitable environment**

| Organizational Type (Mintzberg) | Suitable Environment | Unsuitable Environment |
|---|---|---|
| Simple structure | Small-scale, early-stage startup, high environmental uncertainty | Large-scale, standardization needed |
| Machine bureaucracy | Large-scale, stable environment, standardized work | High uncertainty, innovation needed |
| Professional bureaucracy | Expertise-based, autonomy needed | Rapid decision-making needed |
| Divisionalized form | Diversified large enterprise, business unit autonomy | Synergy maximization needed |
| Adhocracy | Innovation-centered, project-based, high uncertainty | Stable mass production |

## Core System Key Structure (M&A Compatibility)

- The key (identifier) structures of core systems (financial, customer, operations) must be capable of accommodating the acquired company's system during M&A
- Key structure design considerations: (1) namespace separation possibility, (2) rule merge/conflict resolution procedures, (3) transitional parallel operation period
- The criteria for which system takes precedence during key conflicts must be stated in the integration agreement

## Authority and Responsibility Separation

- **Decision-making authority** (who decides) and **execution responsibility** (who performs) are distinguished
- Agency Theory perspective: when delegating decision-making authority, monitoring costs and incentive alignment mechanisms are needed
- When introducing automation, "discrepancy adjudication authority" is a type of decision-making authority that must be designated at automation design time
- Governance (decision-making structure) and ESG (stakeholder impact) are managed as separate structures

## Domain Boundary Management

- The business domain covers 7 major areas (strategy/marketing/finance/operations/organization & HR/innovation/governance) + 3 modern extension areas (platform, subscription, AI)
- Detailed accounting rules (K-IFRS, 5-step revenue recognition, etc.) are separated into the accounting domain. This domain includes only financial decision-making principles
- Extension areas may overlap with existing areas. When overlapping, the primary attribution ("which area covers this topic") must be stated

## Isolated Node Prohibition

- Defined strategic objectives with no execution plans -> warning (isolated objective)
- Defined KPIs with no measurement path -> warning (unmeasurable indicator)
- Cost items that do not correspond to any revenue source -> warning (unattributed cost)
- Risks identified with no response strategy -> warning (unaddressed risk)
- Roles within the organization with no link to the competency model -> warning (competency-undefined role)
- Marketing activities with no link to STP -> warning (untargeted activity)

## Related Documents
- concepts.md — definitions of strategy, marketing, organization, governance, and other terms
- dependency_rules.md — strategy-execution, finance-operations, organization-process dependency rules
- competency_qs.md — structure-related verification questions
