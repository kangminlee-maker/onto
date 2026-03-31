---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Business Domain — Structure Specification

This document defines the structural elements and relationships a business system should expose so that strategy, operations, and governance can be reviewed coherently.

## Business System Required Elements

- **Strategy system**: industry view, advantage logic, growth direction, strategic constraints, and modification triggers
- **Revenue architecture**: revenue sources, pricing mechanisms, monetization unit, billing logic, and margin assumptions
- **Cost architecture**: fixed/variable split, shared-cost allocation, operating leverage, and cost-owner designation
- **Marketing system**: target segment, positioning, channel strategy, customer journey, and demand-generation logic
- **Customer-value delivery system**: how value is delivered after sale or activation, including service, onboarding, retention, and escalation paths
- **Operations system**: core process map, bottleneck ownership, quality controls, supply-chain design, and automation boundaries
- **Organization structure**: reporting hierarchy, decision rights, escalation paths, coordination mechanism, and structure type
- **People system**: role design, competency model, performance management, and key-role pipeline
- **Governance and risk system**: oversight body, control design, risk ownership, and response governance
- **Data and decision system**: KPI definitions, source-of-truth assignments, benchmark usage, and review cadence

## Required Relations

- Every strategic objective must map to at least one execution path.
- Every revenue source must have at least one corresponding cost category and one delivery mechanism.
- Every KPI must specify a measurement method, data source, owner, and review cadence.
- Every major risk must have a named owner and a response posture.
- Every marketing promise must be deliverable by the operating system and service model.
- Every role with decision authority must have a matching accountability and escalation path.
- Every automation initiative must connect to a baseline, an adjudication authority, and a post-change operating owner.
- Every platform rule, subscription metric, or AI decision policy must belong to a named owner structure rather than float as an isolated idea.

## Hierarchy Structure Principles

- Strategy -> business model -> operating model -> process -> task is the default direction of concretization.
- When operating data invalidates strategic assumptions, a reverse feedback path must exist from process or KPI level back to strategy.
- In digital businesses, the hierarchy is faster but not absent. Real-time data may shorten the loop, but it does not eliminate the need to distinguish direction-setting from execution.
- Portfolio-level logic and product-level logic should not be conflated. Growth or profitability decisions at one layer may be irrational at the other.
- A business review should be able to locate where a rule lives: strategic intent, operating design, control design, or execution procedure.

## Strategy-Marketing-Operations Alignment

- Porter's strategic posture must be visible in pricing, service level, and process design. A low-cost claim with premium-touch operations is a structural contradiction unless intentionally cross-subsidized.
- STP choices must be reflected in channel structure and customer journey design. If the target segment is enterprise, self-serve-only operating support is usually misaligned.
- Operations capability must be able to deliver the customer promise. Brand position or differentiation logic without matching operational support is an execution illusion.
- Improvement priorities should align with business economics. If retention drives enterprise value, operations should not optimize only acquisition throughput.
- A shift in business model, such as direct sale to subscription or product to platform, should force explicit review of metrics, process boundaries, and ownership structures.

## Organization-Strategy Fit

Classification axis: **organizational structure type and coordination logic**

| Organizational Type | Best-Fit Conditions | Structural Risk When Misapplied |
|---|---|---|
| Simple structure | Micro scale, founder-led, high uncertainty, short decision loops | Breaks down when specialization and delegated authority increase |
| Machine bureaucracy | Stable environment, repeatable process, efficiency priority | Suppresses adaptation and innovation under high uncertainty |
| Professional bureaucracy | Expert-driven work with autonomy and standards | Weak when fast cross-functional coordination is required |
| Divisionalized form | Large or diversified enterprise with semi-autonomous business units | Can create duplication, transfer-pricing disputes, and weak synergy capture |
| Adhocracy | Innovation-heavy, project-based, uncertain environments | Becomes expensive and chaotic when repeatability and control are required |

Transition rule:
- Structural change is not cosmetic. If scale, product complexity, or regulatory burden changes materially, the business should re-evaluate whether the current coordination mechanism still fits the strategy.

## Core System Key Structure (M&A Compatibility)

- The key structures of finance, customer, product, and operations systems must support namespace separation, mapping, or staged consolidation during acquisition.
- A business should declare which identifiers are canonical and which are translatable during integration.
- Transition structures such as mapping tables, parallel-run periods, or master-data authority shifts are part of M&A design, not implementation detail.
- If integration depends on manual reconciliation with no durable structure, the business has not specified M&A compatibility.

## Authority and Responsibility Separation

- Decision authority, execution responsibility, and control authority are distinct and should be named separately.
- Delegated authority requires matching monitoring and incentive logic. Otherwise the business creates agency risk by design.
- Escalation authority should exist for exceptions, disputes, and override conditions. A business with only "normal path" ownership is structurally incomplete.
- Automation introduces a special authority type: discrepancy adjudication between human and system outputs.
- AI systems introduce another authority type: model-risk ownership for override, rollback, and exception handling.
- Governance structure and ESG structure may share participants, but they should not collapse into the same authority description.

## Digital Business Structure

- **Platform structure**: participant groups, governance owner, pricing owner, trust-and-safety or dispute path, liquidity metrics, and side-specific incentive logic
- **Subscription structure**: acquisition path, activation path, customer-success owner, churn-detection loop, expansion motion, and revenue-recognition implications
- **AI structure**: data source owner, model owner, review or override owner, appeal path, and deployment boundary between experimentation and production
- **Digital feedback loops**: telemetry should connect product usage, operating response, and strategic review rather than exist as isolated dashboards
- **Cross-system coherence**: digital business structures often cross product, sales, operations, finance, and governance. The business should show where coordination happens explicitly

## Domain Boundary Management

- The business domain covers strategy, marketing, finance, operations, organization/HR, innovation, governance/risk, and the modern extensions of platform, subscription, and AI business design.
- Detailed accounting rules remain in the accounting domain. This document consumes accounting outputs as business inputs rather than redefining accounting standards.
- Modern extensions are overlays, not separate empires. A platform concern can also be a governance concern; a subscription concern can also be a finance and customer-management concern.
- When overlap exists, the business should name the primary enforcement point and treat other mentions as references.

## Isolated Node Prohibition

- Strategic objectives with no execution mechanism -> warning
- Revenue sources with no cost logic or delivery path -> warning
- KPIs with no owner, measurement path, or decision use -> warning
- Risks with no response or escalation design -> warning
- Roles with no competency definition or accountability -> warning
- Platform rules with no enforcement or appeal path -> warning
- Subscription metrics with no operating owner -> warning
- AI decisions with no override or audit path -> warning

## Related Documents

- `domain_scope.md §Inter-Document Contract` and `domain_scope.md §Scale Tier Definitions` — ownership and scale filters that shape this structure
- `concepts.md §Organization/HR Core Terms` and `concepts.md §Platform/Subscription/AI Extension Terms` — canonical definitions used by this structure
- `dependency_rules.md §Organization-Strategy Dependency`, `dependency_rules.md §M&A Dependency`, and `dependency_rules.md §AI/Data Dependency` — dependency implications of these structures
- `logic_rules.md §Platform Business Logic`, `logic_rules.md §Subscription Economy Logic`, and `logic_rules.md §AI Business Logic` — judgment rules applied to these structures
