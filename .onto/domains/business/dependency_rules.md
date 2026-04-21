---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Dependency Rules

This document defines the directional dependencies that make business systems executable rather than merely descriptive.

## Strategy-Execution Dependency

- Strategic objective -> execution program: a strategic claim that does not map to a concrete program, project, or operating change is not execution-ready.
- Execution program -> resource allocation: a program without budget, people, and time allocation is not a real commitment.
- Resource allocation -> KPI system: any committed resource should have a measurement logic that makes its performance visible.
- KPI system -> strategic feedback: KPI results must be able to trigger continuation, revision, or abandonment of the original strategic objective.
- Portfolio logic -> business-unit logic: when multiple businesses or product lines exist, resource allocation must state whether optimization is local or portfolio-wide.

## Strategy-Marketing Dependency

- Competitive posture -> STP: cost leadership, differentiation, or focus should constrain who is targeted and what evidence is used to persuade them.
- STP -> marketing mix: positioning is upstream of price, channel, and promotional tone.
- Marketing promise -> customer journey: a promise without a delivery path or onboarding logic is not commercially complete.
- Brand strategy -> pricing and channel discipline: premium positioning can be destroyed by channels or discounts that contradict the intended signal.
- Acquisition motion -> retention logic: rapid customer acquisition without an explicit retention or service path can create growth optics with weak economics.

## Finance-Strategy Dependency

- Investment criteria -> strategic option selection: strategies that require capital should state the decision rule that allowed the capital to be committed.
- Capital structure -> investment hurdle rate: financing choices determine the relevant discount rate and acceptable return level.
- Cash-flow planning -> operating scope: liquidity constraints should visibly limit rollout speed, hiring pace, or inventory intensity.
- Unit economics -> scale decision: if contribution margin is negative, scale should not be treated as the primary fix unless there is a clearly stated transition mechanism.
- Transition economics -> strategic resilience: subscription shifts, pricing changes, and platform subsidy phases should state how temporary financial pain is financed.

## Organization-Strategy Dependency

- Strategy type -> structure type: efficiency-oriented strategies need repeatable control; exploration-oriented strategies need flexibility and faster adjustment.
- Structure type -> decision speed: deeper hierarchy and stronger control reduce local autonomy and response speed unless escalation design compensates.
- Delegation -> monitoring -> incentive design: these three must be designed together, not sequentially.
- Leadership model -> change capacity: the way leaders allocate authority directly affects whether change management is realistic or ceremonial.
- Multi-business-unit scope -> control model: once the business diversifies, local optimization and enterprise governance can no longer be treated as the same layer.

## Change Management Circular Dependency

- New technology or process -> cooperation requirement -> first success -> broader adoption -> more cooperation forms a circular structure that must be entered intentionally.
- Entry options include executive sponsorship, a narrow pilot, or an external proof point, but the chosen entry should match the real source of resistance.
- If the business depends on short-term wins to persuade the organization, it must also show how those wins will be translated into the next adoption step.
- If cooperation depends on incentives, the business should show which role controls those incentives.
- A change initiative without an entry rule is effectively blocked before it starts.

## Organization-Process Dependency

- Organization change -> process redesign: changing reporting lines or decision rights should trigger process review, not just org-chart updates.
- Process automation -> role redesign: automated work changes staffing, escalation, and accountability, not only labor hours.
- Competency model -> hiring and development criteria: if competency definitions change, role qualification logic should change as well.
- Decision authority -> execution responsibility: either one without the other creates bottlenecks or unmanaged risk.
- Growth in scale -> information flow design: more layers require deliberate reporting and exception routing, or decisions slow down invisibly.

## Operations-Quality Dependency

- Throughput goals -> bottleneck investment: capacity investment should follow the bottleneck rather than local convenience.
- Lean or Six Sigma initiative -> baseline and target metric: improvement programs need explicit measurement anchors.
- Supply chain design -> risk posture: supplier concentration, geography, lead-time variance, and inventory policy should connect to risk response logic.
- Quality system -> customer promise: premium positioning or regulated offerings require stronger quality controls than commodity operations.
- Automation quality -> exception handling: the faster the automated process, the more important the exception path becomes.

## Governance-ESG Relationship

- Governance and ESG are separate but linked. Governance defines who decides and who oversees; ESG defines which stakeholder impacts are managed and disclosed.
- Legal obligations outrank voluntary commitments unless a voluntary framework has been contractually or regulatorily adopted.
- Board or oversight changes should trigger ESG-responsibility review when sustainability claims depend on governance ownership.
- ESG disclosure changes should trigger governance review when new oversight, assurance, or data-control responsibilities are introduced.
- Green claims, social claims, or impact claims without underlying control ownership should be treated as structurally weak.

## M&A Dependency

- Key-structure compatibility of finance, customer, product, and operations systems is a prerequisite to integration quality.
- If identifiers are incompatible, the business should name whether it will use mapping tables, parallel-run phases, or canonical-key replacement.
- Governance integration should specify which approval rights and control structures move first and which remain transitional.
- Culture integration depends on stakeholder reconciliation, not only process integration.
- The intended target structure after integration should be stated; otherwise the business is only describing coexistence, not integration.

## Source of Truth Management

- Financial facts should point to the authoritative ledger or finance system.
- Strategic decisions should point to the approving body or decision record rather than a slide deck summary alone.
- KPI values should point to one measurement system and one refresh cadence.
- Customer, product, and supplier master data should each name a primary authority when multiple systems exist.
- When a source of truth changes, dependent references must be updated as a migration, not opportunistically. Partial authority changes create silent conflict.

## Platform Dependency Chains

- Participant growth on one side depends on perceived value on the other side. Marketplace growth is therefore a two-sided dependency chain, not a single-funnel problem.
- Take-rate changes depend on liquidity, trust, and side-specific surplus. Monetization cannot be changed independently of participant economics.
- Governance rules depend on enforcement tools, appeal paths, and moderation capacity. Policy text without operating enforcement is not a real dependency closure.
- Trust and safety incidents can break growth, monetization, and brand at once. Platform governance is upstream of multiple business outcomes.
- Multi-homing reduces switching dependence and increases the importance of differentiated workflow, demand quality, or service tools.

## AI/Data Dependency

- AI output quality depends on data access, data quality, model choice, prompt or workflow design, and review process together.
- Data rights are upstream of AI monetization. If reuse rights are unclear, the commercial model is unstable even if the product works.
- Model deployment depends on override and rollback design. A production AI system without a fallback path is an operational dependency gap.
- Human review load depends on model reliability, risk tolerance, and customer expectation. Review cost should be treated as part of the operating model.
- Regulatory exposure depends on use case, not only on the model. The same model can require different control depth across different business decisions.

## Related Documents

- `domain_scope.md §Major Sub-areas` and `domain_scope.md §Inter-Document Contract` — the business concerns and ownership model that these dependencies serve
- `concepts.md §Benchmark Registry` and `concepts.md §Governance/Risk Core Terms` — source concepts and benchmark authorities referenced by these dependencies
- `structure_spec.md §Business System Required Elements`, `structure_spec.md §Digital Business Structure`, and `structure_spec.md §Authority and Responsibility Separation` — structures that make these dependencies visible
- `logic_rules.md §Financial Decision-Making Logic`, `logic_rules.md §Change Management Logic`, and `logic_rules.md §AI Business Logic` — rule sections that interpret the consequences of broken dependencies
