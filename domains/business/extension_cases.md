# Business Domain — Extension Scenarios

Each scenario is simulated to verify whether the existing business system breaks.

## Case 1: Adding a New Revenue Source

- Adding a new revenue source (product/service) to the existing business system
- Verification: Which growth strategy in the Ansoff Matrix (market penetration/market development/product development/diversification) does it correspond to?
- Verification: Does the new revenue source's position in the BCG Matrix (Star/Question Mark) align with the portfolio strategy?
- Verification: Does the existing STP include the target customers for the new revenue source? Is new segmentation needed?
- Verification: Can the cost of the new revenue source be attributed within the existing cost structure?
- Verification: Can the existing operational processes (supply chain, production) support the new revenue source?
- Affected files: structure_spec.md (revenue structure), logic_rules.md (strategy analysis logic)

## Case 2: M&A (Mergers & Acquisitions)

- Integrating the acquired company's business system into the existing system
- Verification: Can the key structure of core systems accommodate the acquired company's system?
- Verification: Are decision-making authority and reporting hierarchy conflicts resolved during organizational structure integration?
- Verification: Is there a change management (Kotter/ADKAR) plan for organizational culture differences between both sides?
- Verification: Is the target organizational type (Mintzberg) after integration stated?
- Verification: Are the transitional parallel operation period and full integration timeline defined?
- Verification: From a Stakeholder Theory perspective, is there a plan for reconciling stakeholder interests on both sides?
- Affected files: dependency_rules.md (M&A dependency), structure_spec.md (key structure, organization-strategy fit)

## Case 3: Automation Introduction/Expansion

- Converting existing manual processes to automation, or expanding automation scope
- Verification: Are the start and end points of automation scope clearly defined?
- Verification: Has a pre-automation baseline measurement been performed? (Six Sigma DMAIC's Measure stage)
- Verification: Is the authority for adjudicating discrepancies between manual and automated results designated?
- Verification: Is the path for converting "time savings" into "cost savings" explained?
- Verification: Are there redeployment/retraining plans for roles changed by automation?
- Affected files: logic_rules.md (automation/operations logic), dependency_rules.md (organization-process dependency)

## Case 4: Market/Regional Expansion

- Expanding the existing business to a new market or new region
- Verification: Does it correspond to a market development strategy in the Ansoff Matrix, with the associated risks assessed?
- Verification: Has competitive environment analysis (Porter's 5 Forces) been performed for the new market?
- Verification: Has STP been redefined for the new market's customer segments?
- Verification: Are responses to regulatory environment differences defined?
- Verification: Can the supply chain/operational system accommodate regional expansion? (Identification of new bottlenecks from a TOC perspective)
- Affected files: structure_spec.md (domain boundaries), logic_rules.md (strategy/marketing logic)

## Case 5: Business Model Transition

- Fundamental revenue structure changes such as product sales -> subscription model, direct sales -> platform model
- Verification: Have the changes in value elements been analyzed using Blue Ocean Strategy's ERRC grid?
- Verification: Are existing KPIs (revenue, profit margin) suitable for the new model? (Whether new metrics such as MRR, LTV/CAC, Churn are needed)
- Verification: Is financial preparation for the J-curve revenue decline during the transition prepared? (Working capital/cash flow perspective)
- Verification: Can the existing organizational structure and capabilities support the new model? (Re-verification of organization-strategy fit)
- Verification: Has the customer journey been redesigned for the new model?
- Affected files: logic_rules.md (strategy/finance logic), structure_spec.md (revenue structure, organization-strategy fit)

## Case 6: Technology Adoption (Digital Transformation)

- Applying new technologies such as AI, cloud, and data analytics to the business
- Verification: Is the target stage on the Technology Adoption Lifecycle defined, with a Chasm response strategy?
- Verification: From Christensen's perspective, has it been determined whether the technology is sustaining or disruptive innovation?
- Verification: Has a change management model (Kotter 8 Steps/ADKAR) been applied?
- Verification: Is the entry point for the "first success -> expansion" strategy defined?
- Verification: Has the circular dependency between cooperation securing and change management been resolved?
- Verification: Is the technology adoption effect measured at the point of integration with existing processes, not at the point of adoption?
- Affected files: dependency_rules.md (change management circular dependency), logic_rules.md (innovation/change management logic)

## Case 7: Organizational Scale Expansion

- Organizational scale changes such as headcount growth, new department creation, additional hierarchy levels
- Verification: Is the current organizational type (Mintzberg) still appropriate after expansion? Is a structural transition needed?
- Verification: Can the decision-making authority structure accommodate the expanded organization?
- Verification: From an Agency Theory perspective, have monitoring/incentive mechanisms been adjusted for expanded delegation?
- Verification: Do the competency model and talent pipeline accommodate the expanded scale?
- Verification: Do information delivery paths (reporting hierarchy) still function without delay after scale expansion?
- Affected files: structure_spec.md (organization-strategy fit, authority and responsibility separation), dependency_rules.md (organization-process dependency)

## Case 8: Competitive Environment Change Response

- New competitor entry, substitute emergence, industry structure changes, etc.
- Verification: Has Porter's 5 Forces re-analysis been performed?
- Verification: Is the existing competitive advantage (VRIO) still valid in the new environment?
- Verification: Is a strategy modification path (defend/attack/pivot) defined?
- Verification: Has the threat from disruptive innovation been identified, with preparations (separate organization, business model transition, etc.)?
- Affected files: logic_rules.md (strategy analysis logic, innovation logic), structure_spec.md (strategy system)

## Related Documents
- structure_spec.md — business system structure, organization-strategy fit, key structure
- dependency_rules.md — strategy-execution, finance-strategy, M&A, change management dependency rules
- logic_rules.md — strategy/marketing/finance/operations/innovation/change management logic
