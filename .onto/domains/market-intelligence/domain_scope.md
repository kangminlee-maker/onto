---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing" in market intelligence systems.
This domain applies when **reviewing** market intelligence systems — data collection, analysis, strategy derivation, and risk assessment for strategic decision-making.

> **Boundary with business domain**: The business domain covers business model design, value proposition, organizational strategy. This domain covers the intelligence inputs that inform business strategy — market data, competitor analysis, risk assessment. Strategy formulation is business; strategy candidate generation from market analysis is here.

> **Boundary with finance domain**: The finance domain covers financial reporting and analytical metrics derived from financial statements. This domain covers market-side analysis — competitor financial position as competitive intelligence, market sizing using public data. Internal financial analysis belongs to finance; competitive intelligence using public financial data belongs here.

## Domain Definition

Market Intelligence is a system that supports strategic decision-making through the collection, analysis, and interpretation of market data.
This domain consists of the following four **independent areas**.

| Area | Definition | Basis for Independence |
|------|-----------|----------------------|
| Collection | Acquisition of market data, source management, credibility classification | Collection quality determines the upper bound for subsequent analysis |
| Analysis | Pattern identification, quantitative and qualitative interpretation of collected data | Analysis methodologies evolve independently of collection |
| Strategy Derivation | Conversion of analysis results into strategy options | Strategy is a separate judgment domain, not a derivative of analysis |
| Risk Assessment | Identification, quantification, and response design for market risks | **An independent area, not an appendage of strategy design** |

### Independence of Risk Assessment

Risk assessment is performed in parallel with strategy derivation and is not subordinate to strategy. Risk assessment results can modify strategy, but risk assessment remains independently valid even without a strategy.

This independence is enforced by:
- Separate organizational ownership (risk team vs strategy team)
- Separate input sources (risk has its own collection paths)
- Veto authority (risk assessment can block strategy execution)
- Independent reporting line (risk reports to board, not strategy)

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Source type | Primary / Secondary / Tertiary | Data origin classification |
| Collection method | Manual / Automated / Crawled / API | How data is acquired |
| Analysis type | Quantitative / Qualitative / Mixed | Analysis methodology |
| Strategic horizon | Short-term (<1Y) / Medium-term (1-3Y) / Long-term (>3Y) | Strategy time scope |
| Risk type | Market / Operational / Strategic / Compliance / Reputational | Risk category |

## Key Sub-Areas

Classification axis: **Market intelligence concern** — Classified by the concern that the intelligence system must address.

Applicability markers:
- **(required)**: Must be addressed in any market intelligence system review
- **(when applicable)**: Address when the system's scope includes the relevant pattern
- **(scale-dependent)**: Becomes required beyond a scale threshold

### Data Collection
- **Source classification** (required): Credibility rating system, source registration, classification criteria
- **Collection policy** (required): Frequency, targets, methods declaration
- **Data freshness** (required): Time-to-live (TTL) per source, expiration handling
- **Raw data normalization** (required): Format unification, schema mapping, deduplication
- **Real-time monitoring** (when applicable): Streaming data ingestion, event-driven triggers
- **OSINT collection** (when applicable): Open-source intelligence methodology, ethical and legal boundaries

### Analysis
- **Competitive landscape analysis** (required): Competitors identification, capability assessment, strategic positioning
- **Market size estimation** (required): TAM (Total Addressable Market), SAM (Serviceable Addressable Market), SOM (Serviceable Obtainable Market)
- **Customer segmentation** (required): Segment definition, classification criteria (MECE), segment characterization
- **Trend identification** (required): Time-series analysis, signal vs noise distinction, leading indicators
- **Industry framework analysis** (when applicable): Porter's Five Forces, PESTEL, SWOT, value chain analysis
- **Quantitative modeling** (when applicable): Statistical models, ML-based prediction, simulation
- **Sentiment analysis** (when applicable): Social media sentiment, news sentiment, brand perception

### Strategy Derivation
- **Strategy option generation** (required): Option creation from analysis, divergent thinking phase
- **Option evaluation matrix** (required): Multi-criteria evaluation (impact, feasibility, cost, time)
- **Priority determination** (required): Quantitative scoring, ranking logic
- **Decision gate criteria** (required): Pass conditions for execution approval
- **Scenario planning** (when applicable): Multiple future scenarios, contingency strategies
- **Option portfolio management** (when applicable): Strategy portfolio balance (core/adjacent/transformational)

### Risk Assessment
- **Risk identification** (required): Risk inventory, taxonomy, source identification
- **Risk quantification** (required): Impact × Likelihood scoring, risk score calculation
- **Risk response strategy** (required): Avoidance, mitigation, acceptance, transfer (per ISO 31000)
- **Risk monitoring** (required): Frequency definition, threshold alerts, escalation paths
- **Risk appetite definition** (when applicable): Organizational risk tolerance levels per category
- **Stress testing** (when applicable): Extreme scenario simulation, sensitivity analysis

## Normative System Classification

Standards governing market intelligence operate at three tiers (no hard regulatory tier — this is judgment-driven).

| Tier | Name | Enforcement Mechanism | Change Velocity | Examples |
|------|------|----------------------|-----------------|---------|
| Tier-1 | Methodology Frameworks | Industry adoption, professional convention | Slow (years) | ISO 31000 Risk Management, Porter's Five Forces, SWOT/TOWS |
| Tier-2 | Organizational Standards | Internal review, audit | Medium (annual) | Internal credibility rating system, internal decision gate criteria, risk appetite statement |
| Tier-3 | Project Practices | Per-project decision | Fast (per project) | Specific competitor list, segment definitions for current quarter, ad-hoc analysis approach |

**Ordering principle**: Tier-1 > Tier-2 > Tier-3. Methodology frameworks override organizational standards; organizational standards override project practices.

Tier classification decision tree:
1. **Tier-1**: Is this rule from an industry methodology (ISO 31000, Porter, PESTEL, SWOT)? Would deviation require explicit justification?
2. **Tier-2**: If not Tier-1, is this rule from organizational policy (risk appetite, internal credibility rating system)?
3. **Tier-3**: If neither, is this a project-level decision (competitor list, segment criteria for the current analysis)?

## Cross-Cutting Concerns

### Source Credibility Propagation

Spans Data Collection, Analysis, Strategy Derivation, Risk Assessment. Credibility is established at collection and propagates through the entire chain.

- Credibility rating system: logic_rules.md §Data Source Credibility Rating Consistency Rules
- Propagation principle (weakest link): logic_rules.md §Credibility Propagation Rules
- Cross-area consistency: logic_rules.md §ST01-ST03 multi-point matching

### Declaration-Implementation Link

Spans Strategy Derivation and Decision Gates. Every declared rule must have implemented verification logic.

- Decision gate rule: logic_rules.md §Decision Gate Declaration-Implementation Link Rules
- Verification logic mandatory: PG01-PG03
- Audit trail for declarations and implementations

### Multi-Domain Coexistence

The market intelligence domain can be applied in parallel with other domains (e.g., technology, healthcare, finance) within the same project.

- Namespace prefixes: `{domain}::{concept}` notation
- Homonym resolution: concepts.md §Cross-Domain Homonyms
- Independent decision gates per domain

## Required Concept Categories

| Category | Description | Risk if Missing | Example of Failure |
|---|---|---|---|
| Source credibility rating | Classification system for data source reliability | Untrusted data treated as authoritative | Blog post used as basis for strategic decision |
| Collection policy | Declaration of frequency, targets, methods | Uncoordinated collection, gaps and duplicates | Same source crawled by 3 teams; missing critical sources |
| Data freshness | Time-validity of collected data | Stale data used as current | 2-year-old market sizing used for current strategy |
| Competitive landscape | Structured competitor analysis | Strategic blind spots | Major competitor missed; strategy attacks weak target |
| Market size estimation | TAM/SAM/SOM quantification | Unrealistic strategy scope | SaaS company plans for 10x revenue without TAM check |
| Customer segmentation | MECE customer grouping | Mass-market approach to differentiated needs | Single product strategy fails segments with different requirements |
| Trend signal | Directional pattern in time series | Reactive instead of proactive strategy | Industry shift detected after revenue decline begins |
| Strategy option | Actionable strategy candidate | No alternatives, single-track risk | Single strategic bet without backup plans |
| Decision gate | Verification point for strategy approval | Strategies execute without governance | Risky strategy executed without risk review |
| Risk factor | Identified market/operational/strategic risk | Unmanaged risk exposure | Foreign exchange risk realizes; no hedging strategy in place |
| Risk score | Quantified risk impact × likelihood | Subjective risk prioritization | High-impact rare risks ignored due to low frequency |
| Risk response | Strategy for handling identified risk | Risk identified but not addressed | Risk register exists but no mitigation plans |

## Reference Standards/Frameworks

This file is the **single source of truth for external standard version information** within the market-intelligence domain.

| Standard | Version | Application Area | Core Content |
|----------|---------|-----------------|--------------|
| ISO 31000 | 2018 | Risk Assessment | Risk management framework: identification, analysis, evaluation, treatment, monitoring |
| Porter's Five Forces | 1979 (Porter) | Analysis (industry structure) | 5 competitive forces: rivalry, supplier power, buyer power, substitute threat, new entrant threat |
| PESTEL | — | Analysis, Risk Assessment (macro environment) | 6 macro factors: Political, Economic, Social, Technological, Environmental, Legal |
| SWOT / TOWS | — | Strategy Derivation | Internal (Strengths/Weaknesses) × External (Opportunities/Threats) matrix |
| OSINT Framework | Open-Source Intelligence framework | Data Collection | Open-source intelligence collection methodology and tools taxonomy |
| Value Chain (Porter) | 1985 (Porter) | Analysis (internal) | Primary activities + support activities decomposition for competitive advantage |
| Blue Ocean Strategy | 2005 (Kim & Mauborgne) | Strategy Derivation | Uncontested market space creation framework |
| BCG Matrix | 1970 (Henderson) | Strategy Derivation (portfolio) | Market growth × Market share matrix (Star/Cash Cow/Question Mark/Dog) |
| Scenario Planning | — | Strategy Derivation | Multiple future scenarios for contingency planning |
| TAM/SAM/SOM | — | Market Size Estimation | Total/Serviceable Addressable/Serviceable Obtainable Market |

## Bias Detection Criteria

### Coverage Distribution

- If 2 or more of the 4 areas are not represented at all → **insufficient coverage**
- If specific area accounts for >70% of total findings → **area bias**
- If risk assessment is treated as subordinate to strategy → **independence violation**

### Source Quality

- If collection policy is undefined or undocumented → **collection rigor absence**
- If credibility rating is not assigned to all sources → **credibility gap**
- If only one source type (e.g., only secondary) is used → **source diversity gap**

### Analysis Completeness

- If competitive landscape addresses only direct competitors (no substitutes, new entrants) → **narrow competitive view**
- If market size uses only TAM without SAM/SOM → **unrealistic sizing**
- If only quantitative or only qualitative analysis is used → **methodology imbalance**

### Strategy and Risk

- If strategy options have no traceability to analysis → **strategy without basis**
- If decision gate conditions are declared without verification logic → **declaration-implementation gap**
- If risk identification covers only one risk type (e.g., only market risk) → **risk type narrow**
- If risk responses are not defined for all identified risks → **response gap**

## Inter-Document Contract

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Data source credibility rating consistency | logic_rules.md §Data Source Credibility Rating Consistency Rules | structure_spec.md (references) |
| Decision gate declaration-implementation link | logic_rules.md §Decision Gate Declaration-Implementation Link Rules | dependency_rules.md (references) |
| Risk independence | logic_rules.md §Risk Assessment Rules | dependency_rules.md §Inter-Area Dependency Structure |
| Concept definitions and homonyms | concepts.md | All other files reference, do not redefine |
| Source of Truth priority | dependency_rules.md §Source Credibility Propagation | logic_rules.md (references) |
| Structural requirements | structure_spec.md §Entity Type Definitions, §Trait Definitions | Other files reference |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Competency questions | competency_qs.md | Other files provide inference path targets |

### Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Data Collection | CQ-DC | Full |
| Analysis | CQ-AN | Full |
| Strategy Derivation | CQ-SD | Full |
| Risk Assessment | CQ-RA | Full |

Cross-cutting CQ sections:
- CQ-CR (Credibility Propagation) — spans all 4 areas
- CQ-DI (Declaration-Implementation Link) — spans Strategy Derivation
- CQ-MD (Multi-Domain Coexistence) — spans all 4 areas

## Related Documents
- concepts.md — Term definitions and interpretation principles
- competency_qs.md — System verification questions
- logic_rules.md — Logic rules and data credibility consistency
- structure_spec.md — Structural requirements and classification axes
- dependency_rules.md — Inter-element dependency relationships
- extension_cases.md — Extension scenarios
- conciseness_rules.md — Allowed/prohibited redundancy patterns
