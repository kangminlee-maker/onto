---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Logic Rules

This document defines the business rules and review logic that connect strategic statements to operational consequences.
If `concepts.md` defines what a term means, this file defines how the term must behave in a business review.

## Strategy Analysis Logic

- Competitive analysis is a prerequisite for strategy formulation. A strategy that names a goal without naming the industry pressures it is responding to has no defensible basis.
- A generic strategy choice must be explicit. If the business claims both low cost and premium differentiation, it must state the mechanism that prevents a stuck-in-the-middle failure.
- VRIO is conjunctive, not additive. Value plus rarity is temporary advantage; sustainability requires imitability resistance and organizational support.
- Diversification requires a capability-transfer argument. "New market plus new product" is not strategic logic unless the business states what existing capability or channel makes the move plausible.
- A Blue Ocean claim is incomplete until the business names what is eliminated, reduced, raised, and created, and how that changes both willingness to pay and cost structure.
- BCG categories do not decide by themselves. A Dog business may still be retained if it protects capability, channel access, or ecosystem leverage that the portfolio needs.
- Strategy modification paths must specify trigger conditions. Environmental change without a stated pivot, defense, or retreat rule creates strategic paralysis.
- Market growth is not the same as value capture. A large TAM, large GMV, or category growth story is not sufficient unless the capture mechanism and competitive position are stated.

## Marketing Logic

- STP is ordered logic: segmentation -> targeting -> positioning. Skipping or reordering the sequence makes later marketing choices arbitrary.
- Positioning constrains pricing, channel, service level, and proof points. A premium position with discount-driven acquisition requires an explicit reconciliation rule.
- Each customer-journey stage needs its own conversion or retention measurement. Aggregate "growth" numbers hide where the funnel is actually failing.
- Marketing mix elements are interdependent. Changes in one element, especially price or channel, should trigger review of the others.
- Brand equity is cumulative and slow-moving. Short-term promotional gains that erode trust, quality perception, or willingness to pay should be treated as value destruction unless explicitly justified.
- A value proposition is not validated by messaging alone. It must be deliverable through operations and visible in customer behavior.
- Product-led growth logic is not "free sign-up." It requires activation, habit formation, and expansion mechanisms that connect product usage to revenue.

## Financial Decision-Making Logic

- When NPV and IRR conflict in mutually exclusive choices, NPV takes precedence because IRR can mislead under different scale or reinvestment assumptions.
- Discount rates must match the risk and capital structure of the decision being reviewed. Using book-value debt weights or an inherited corporate rate without justification distorts investment judgment.
- WACC reference values from `concepts.md §Benchmark Registry` are context markers, not automatic acceptance rules. Company-specific capital structure, risk, and cash-flow stability still govern the actual hurdle rate.
- Working capital logic must track DSO, DIO, and DPO separately. A "healthy CCC" claim is incomplete unless the component drivers are visible.
- Negative CCC is context-dependent. It can create a growth engine, but it may also hide supplier-power dependence or inventory-risk transfer.
- ROI is valid only if the numerator, denominator, and attribution period describe the same business change. Otherwise it becomes a scope illusion.
- Contribution margin must be positive before scaling can improve enterprise economics. Scaling a negative-contribution business magnifies loss.
- Subscription or platform transitions require explicit J-curve planning. Temporary revenue recognition decline, cash pressure, and investor misread risk must be addressed before the transition is called financially sound.
- Real-options logic applies when staged investment preserves the right to expand or stop later. A binary go/no-go framing is often too coarse for uncertain innovation bets.

## Operations Management Logic

- Lean improvement must state the balance between waste reduction and service resilience. Eliminating slack without stating the acceptable service-risk trade-off invites fragile efficiency.
- Six Sigma claims are invalid without baseline measurement. No improvement can be attributed unless the "Measure" stage exists.
- In TOC, optimizing non-bottlenecks does not improve system throughput. Bottleneck identification must precede resource allocation.
- Supply chain resilience is not covered by naming multiple suppliers alone. Dependency concentration, lead-time volatility, and substitution difficulty must also be reviewed.
- Automation scope must define explicit start and end points. Without a boundary, performance measurement and ownership are undefined.
- Automation performance requires a before/after baseline with the same unit of work, volume assumptions, and exception handling rules.
- Manual-versus-automated discrepancies require an adjudication authority and an escalation rule before launch, not after the first failure.
- Time savings become cost savings only when capacity is removed or redeployed. Otherwise the result is capacity release, not cash release.
- Local process optimization must not create hidden queues, handoff delays, or quality failures downstream. Flow logic outranks step-level vanity gains.

## Cost Classification Logic

- Fixed and variable cost classification holds only inside the relevant range. Scale changes can reclassify labor, infrastructure, or support cost behavior.
- A cost reduction claim is invalid if the cost is only shifted to another department, vendor, customer segment, or later period.
- Shared-cost allocation must state its rule. Margin or ROI comparisons without explicit allocation logic are not comparable.
- Unit economics must use the same unit on both revenue and cost sides. Per-order revenue against per-customer cost, or gross revenue against contribution cost, creates false insight.

## Change Management Logic

- Kotter is sequential in its first stages. If urgency and coalition are missing, downstream execution typically becomes a compliance exercise rather than real adoption.
- ADKAR is cumulative. Knowledge or training delivered before desire exists will often appear as learning activity without behavioral change.
- The "first success -> expansion" pattern contains a circular dependency: cooperation is needed to create the first win, but the first win is often needed to earn cooperation. The entry point must be named explicitly.
- Short-term wins are meaningful only if they are transferable. A pilot that works under exceptional sponsorship or heroic effort does not prove scaling logic.
- Adoption impact should be measured after integration into the operating process, not at the point of announcement or technical deployment.
- Change governance must distinguish sponsor, driver, implementer, and affected role. Ambiguous ownership converts change resistance into execution drift.

## Innovation Logic

- Incumbents facing disruptive innovation should not assume the core organization can absorb the response. When the business model, margin structure, or customer logic differs materially, a separate vehicle is often more viable.
- Crossing the Chasm requires a beachhead segment and a whole-product promise. Broad-market claims before this point are usually premature.
- Design Thinking is a logic of reframing, not just ideation. Problem statements that are written before empathy work should be treated as supplier-bias risks.
- Open innovation is beneficial only when inbound and outbound idea flow have governance. Without selection logic and IP boundaries, openness becomes noise.
- Ambidexterity requires a separation rule. Exploration and exploitation may share leadership, but not every operating metric or incentive should be shared.
- Innovation portfolio logic must distinguish learning bets from scale bets. Early experiments should be judged by learning velocity and option value, not the same return criteria used for mature products.

## Platform Business Logic

- A platform is not healthy unless both sides receive value. Growth on one side that degrades the other side's economics is not sustainable network-effect growth.
- Take rate must be interpreted together with participant economics, liquidity, subsidy levels, and multi-homing pressure. A high take rate is not automatically strong, and a low take rate is not automatically weak.
- Direct and indirect network effects should not be conflated. A large user count with low cross-side conversion may indicate poor liquidity, not strong defensibility.
- Platform governance rules need enforcement, appeal, and exception paths. Unilateral rule changes with no contestability create governance debt and seller revolt risk.
- Positive GMV is not the same as positive platform economics. Contribution margin per transaction and retention quality still determine whether scale creates value.
- Multi-homing weakens platform power. If switching or simultaneous participation is easy, governance and service quality matter more than nominal size.

## Subscription Economy Logic

- LTV/CAC is meaningful only when churn, gross margin, customer lifetime assumptions, and CAC scope are explicitly defined.
- `LTV/CAC > 3` from `concepts.md §Benchmark Registry` is a healthy default threshold for recurring-revenue businesses, but only when the business actually measures gross-margin retention and acquisition cost consistently.
- NRR must be read with churn composition. A high NRR produced only by a few expansions can hide fragile base retention.
- CAC payback must be evaluated on gross-margin contribution, not gross revenue. Otherwise payback appears artificially short.
- Subscription transitions create a J-curve. If the business claims a successful transition, it must show how liquidity, sales compensation, and investor expectations were protected during the dip.
- Pricing resets, downgrade friction, cancellation design, and customer-success intervention are part of the economic system, not just UX choices.
- Usage-based pricing must be assessed for both revenue upside and budget volatility. Better NRR does not eliminate procurement friction or customer predictability concerns.

## AI Business Logic

- A data moat claim requires three parts: unique data access, a feedback loop that improves output quality, and a reason competitors cannot cheaply replicate the loop.
- AI model economics must include inference cost, latency, reliability, human-review overhead, and rework cost. Gross margin can collapse even when model quality improves.
- A better model score is not enough to justify AI business advantage. The business still needs workflow embedding, distribution, trust, and a capture mechanism.
- High-impact AI decisions require explainability, appeal, override, and monitoring paths. Absence of these controls is a governance failure, not a documentation gap.
- Training-data rights, output rights, and customer-data reuse permissions must be explicit. Economic value built on unauthorized data usage is structurally unstable.
- AI features that do not alter workflow, pricing power, or retention should be treated as product enhancements, not automatically as new business models.

## Constraint Conflict Checking

- If revenue maximization and cost minimization are required for the same target, the priority rule or balance point must be explicit.
- If growth and margin are both demanded, the switch condition between expansion mode and efficiency mode must be stated.
- If speed and control conflict, the business must name which decisions can be accelerated and which require formal review.
- If standardization and local adaptation conflict, the operating model must state which elements are globally fixed and which are locally variable.
- If automation efficiency and customer experience conflict, the business must state which failure modes are acceptable and which must be blocked.
- If AI autonomy and accountability conflict, the human override and audit rule must win over raw speed claims.

## Transfer Patterns

- A cross-industry pattern transfer is incomplete until the business names the invariant mechanism, the changed boundary conditions, and the target-side constraints.
- Imported patterns must keep the economic premise visible. Copying a subscription, platform, or lean pattern without its unit-economics assumptions is analogy abuse.
- Patterns from digital businesses cannot be imported into asset-heavy operations without changing capital-intensity, cycle-time, and quality-control assumptions.
- Benchmark transfer requires industry and regulatory context. A SaaS retention benchmark, a marketplace take-rate pattern, and a manufacturing utilization target are not interchangeable.
- Large-company management patterns may transfer to Small firms only after formalization is stripped back to the minimum mechanism needed. The control logic may transfer even when the committee structure does not.
- Every transfer pattern should be expressible as: source pattern -> preserved mechanism -> changed assumptions -> adaptation rule.

## Related Documents

- `concepts.md §Benchmark Registry` and `concepts.md §Platform/Subscription/AI Extension Terms` — definitions and numeric anchors consumed by these rules
- `dependency_rules.md §Finance-Strategy Dependency`, `dependency_rules.md §Change Management Circular Dependency`, and `dependency_rules.md §Operations-Quality Dependency` — dependency consequences of these rules
- `structure_spec.md §Authority and Responsibility Separation` and `structure_spec.md §Digital Business Structure` — structural implications of rule violations
- `competency_qs.md §1. Strategic Management (CQ-SM)`, `competency_qs.md §3. Finance (CQ-FI)`, `competency_qs.md §10. Platform Business (CQ-PL)`, and `competency_qs.md §13. Scalability and Adaptation (CQ-SC)` — CQ sections that directly consume these rule families
