---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Core Concept Definitions

Classification axis: **Market intelligence concern** — classified by the concern each term addresses. Each term is tagged with its normative tier: [T1] Methodology Framework, [T2] Organizational Standard, [T3] Project Practice.

## Normative Tier Reference

- **[T1] Methodology Framework**: Elements from established industry methodologies (ISO 31000, Porter, PESTEL, SWOT). Industry-recognized; deviation requires explicit justification.
- **[T2] Organizational Standard**: Internal organizational policies (credibility rating system, risk appetite, decision gate criteria). Subject to organizational governance.
- **[T3] Project Practice**: Project-specific decisions (competitor list, segment definitions). Tactical choices for current analysis.

## 1. Data Collection Area

### Source Classification Terms

- [T2] Data Source = a source that provides market data. Categorized by type, credibility, access method
- [T1] Primary Source = raw data collected directly through original observation, interviews, surveys, or experimentation. Highest credibility rating because the data has not been processed or interpreted by intermediaries
- [T1] Secondary Source = data processed and published by other organizations (industry reports, academic papers, government statistics, public disclosures). Medium credibility — interpretation by an intermediary may introduce bias
- [T1] Tertiary Source = data reprocessed from secondary sources (news summaries, blog posts, wiki entries, social media commentary). Lowest credibility — multiple layers of interpretation
- [T2] Data Source Credibility Rating = a rating system that classifies the credibility of data sources. A classification value that must be assigned before collected data is fed into analysis. Specific rating levels (e.g., A/B/C, 1-5, Trusted/Verified/Unverified) are organizational choices
- [T2] Source Authority = the institutional credibility of the source organization (government statistical office > industry association > individual blog)
- [T2] Data Provenance = traceable origin and chain of custody for data — when collected, by whom, transformations applied, retention period

### Collection Method Terms

- [T2] Collection Policy = a declaration that specifies collection frequency, targets, methods, and credibility filters. Input to decision gates
- [T3] Manual Collection = human-driven collection (analyst reading reports, conducting interviews)
- [T3] Automated Collection = system-driven collection (scheduled API calls, scraping pipelines, RSS feeds)
- [T1] OSINT (Open-Source Intelligence) = intelligence gathered from publicly available sources. Distinct from classified sources. Subject to ethical and legal boundaries (no scraping beyond robots.txt, no privacy violations)
- [T2] API Collection = structured collection via vendor APIs. Higher reliability than scraping; subject to rate limits and access controls
- [T3] Web Crawling = automated collection from web pages. Subject to legal compliance (robots.txt, terms of service)
- [T2] Streaming Ingestion = real-time data flow (event streams, social media firehoses, market data feeds)

### Data Quality Terms

- [T2] Data Freshness = a validity indicator measured by the difference between the data collection time and the current time. Linked with update frequency. Defined per source type (real-time market data freshness ≠ industry report freshness)
- [T2] Time-To-Live (TTL) = the maximum allowable age before data must be re-collected or marked as stale
- [T2] Raw Data Normalization = format unification, schema mapping, deduplication. Required before data feeds into analysis
- [T2] Data Lineage = traceability of data transformations from raw to analyzed state
- [T2] Anomaly Detection = identification of outliers or inconsistencies that may indicate collection errors

## 2. Analysis Area

### Competitive Analysis Terms

- [T1] Competitive Landscape Analysis = a structured analysis of competitors' positions, capabilities, and strategies within a specific market. Output is a positioning map or capability matrix
- [T1] Direct Competitor = entity offering similar products/services to the same target customers
- [T1] Indirect Competitor = entity offering substitute solutions to the same customer problem (e.g., Zoom's indirect competitor includes telephony, in-person meetings)
- [T1] Strategic Group = cluster of competitors with similar strategies and capabilities. Useful for analyzing within-industry competition
- [T1] Competitive Positioning = where the entity stands on relevant dimensions vs competitors (price/quality, breadth/depth, premium/value)
- [T1] Capability Assessment = evaluation of competitor strengths and weaknesses across relevant dimensions

### Market Sizing Terms

- [T1] TAM (Total Addressable Market) = total revenue opportunity if 100% market share were captured. Theoretical maximum
- [T1] SAM (Serviceable Addressable Market) = portion of TAM the entity can serve given current product/geography/channel constraints
- [T1] SOM (Serviceable Obtainable Market) = portion of SAM the entity can realistically capture given competitive position. Practical near-term opportunity
- [T1] Bottom-up Sizing = market estimate from individual customer/segment data aggregated upward
- [T1] Top-down Sizing = market estimate starting from total industry size, narrowed to segments of interest
- [T3] Market Share = entity's revenue / total market revenue (in the same period)

### Customer Analysis Terms

- [T1] Customer Segmentation = grouping customers by common characteristics (demographic, behavioral, needs-based, value-based)
- [T1] MECE (Mutually Exclusive, Collectively Exhaustive) = principle for segmentation: every customer belongs to exactly one segment, and segments together cover all customers
- [T1] Persona = composite description of typical customer in a segment
- [T1] Customer Journey = sequence of interactions from awareness to purchase to advocacy
- [T1] Voice of Customer (VoC) = direct customer feedback collected systematically

### Trend Analysis Terms

- [T1] Trend Signal = a directional pattern identified in time-series data. Must be distinguished from noise (random fluctuation)
- [T1] Leading Indicator = signal that changes before the underlying trend manifests (e.g., job postings as leading indicator for industry growth)
- [T1] Lagging Indicator = signal that changes after the underlying trend (e.g., revenue growth as lagging indicator)
- [T1] Coincident Indicator = signal that changes simultaneously with the trend
- [T1] Signal-to-Noise Ratio = relative strength of meaningful pattern vs random variation. High S/N → reliable signal
- [T3] Time Window = period over which trend is measured (3-month rolling, year-over-year)

### Methodology Terms

- [T1] Porter's Five Forces = framework analyzing 5 forces shaping industry competition: industry rivalry, supplier power, buyer power, threat of substitutes, threat of new entrants. Porter (1979)
- [T1] PESTEL = framework for macro-environment factors: Political, Economic, Social, Technological, Environmental, Legal
- [T1] SWOT = matrix of internal Strengths/Weaknesses × external Opportunities/Threats
- [T1] TOWS = SWOT extended with strategy formulation cells (SO, WO, ST, WT strategies)
- [T1] Value Chain = decomposition of activities into primary (inbound logistics, operations, outbound logistics, marketing/sales, service) and support (procurement, technology, HR, infrastructure). Porter (1985)
- [T1] BCG Matrix = portfolio classification by market growth (high/low) × market share (high/low). Star, Cash Cow, Question Mark, Dog
- [T1] Blue Ocean Strategy = creation of uncontested market space through differentiation + low cost. Kim & Mauborgne (2005)
- [T1] Disruptive Innovation = innovation that creates new market by serving overlooked segments, eventually displacing established competitors. Christensen (1997)
- [T1] Analysis Methodology Precondition = the specific conditions under which a methodology is valid. SWOT requires bounded analysis scope; Five Forces requires defined industry boundaries

## 3. Strategy Derivation Area

### Strategy Generation Terms

- [T2] Strategy Option = an actionable strategy candidate derived from analysis results. Includes goal, action, expected outcome, resource requirements
- [T1] Divergent Thinking = generating multiple options without judgment. Wide option space first
- [T1] Convergent Thinking = narrowing options through evaluation criteria
- [T2] Strategy Portfolio = balanced mix of core (sustaining), adjacent (extending), and transformational (new) strategies
- [T1] Real Options = strategy options that preserve future flexibility (e.g., minimum investment to maintain optionality)

### Decision and Evaluation Terms

- [T2] Decision Gate = a verification point that a strategy option must pass to proceed to the execution phase. Distinct from software deployment gate
- [T2] Pass Condition = specific criterion the strategy option must meet at the gate
- [T2] Verification Logic = the implemented mechanism that checks pass conditions (checklist, automated test, expert review)
- [T2] Declaration-Implementation Link = the mandatory pairing of declared pass conditions with implemented verification logic
- [T2] Decision Criteria = the set of judgment criteria used for strategy selection
- [T2] Priority Score = a quantitative score that determines the execution priority of a strategy option. Based on evaluation matrix
- [T1] Multi-Criteria Decision Analysis (MCDA) = formal method for evaluating options against multiple criteria with weights

### Scenario and Contingency Terms

- [T1] Scenario Planning = development of multiple plausible future scenarios for strategic preparation. Shell pioneered (1970s)
- [T1] Best Case / Base Case / Worst Case = three-scenario framework
- [T1] Contingency Plan = pre-defined response if a specific scenario materializes
- [T2] Strategic Pivot = significant change in strategy direction based on new information

## 4. Risk Assessment Area

### Risk Identification Terms

- [T1] Risk Factor = an individual risk factor identified in the market or operational environment
- [T1] Risk Taxonomy = classification system for risks. Common categories: market risk, operational risk, strategic risk, compliance risk, reputational risk, financial risk
- [T1] Risk Inventory = comprehensive list of identified risk factors with metadata
- [T1] Risk Register = central repository of risks with assessments, owners, and responses

### Risk Quantification Terms

- [T1] Risk Score = quantified risk value calculated as Impact × Likelihood. Single formula applied uniformly
- [T1] Impact = the consequence magnitude if the risk materializes (financial loss, operational disruption, reputational damage)
- [T1] Likelihood = the probability of the risk materializing in a defined time horizon
- [T1] Risk Matrix = 2-dimensional grid (Impact × Likelihood) for visual risk classification
- [T1] Heat Map = color-coded risk matrix showing risk concentration

### Risk Response Terms

- [T1] Risk Response Strategy = approach for handling identified risk. Per ISO 31000:
  - **Avoidance (회피)**: eliminate the activity that creates risk
  - **Mitigation (감소)**: reduce impact or likelihood
  - **Acceptance (수용)**: acknowledge and bear the risk
  - **Transfer (전가)**: shift risk to third party (insurance, contracts)
- [T2] Risk Threshold = acceptable boundary value for risk. Exceeding it requires mandatory response
- [T2] Risk Appetite = the amount and type of risk the organization is willing to accept in pursuit of objectives
- [T2] Risk Tolerance = acceptable variation around risk appetite for specific objectives
- [T1] Residual Risk = risk remaining after response strategy is applied
- [T1] Inherent Risk = risk before any response strategy is applied

### Risk Monitoring Terms

- [T2] Exposure Level = current level of exposure to a specific risk factor
- [T2] Risk Monitoring Frequency = how often risk level is re-evaluated (continuous, daily, monthly, quarterly)
- [T2] Escalation Path = protocol for when and how to escalate risk to higher decision levels
- [T1] Stress Test = simulation of extreme scenarios to assess resilience
- [T1] Sensitivity Analysis = examination of how output changes when key assumptions vary

## 5. Cross-Domain Homonyms

Cases where the same term carries different meanings depending on the domain.

| Term | market-intelligence Meaning | Other Domain Meaning | Confusion Risk |
|------|---------------------------|---------------------|---------------|
| Segment | Subset classification of markets or customers | software-engineering: memory segment / data segment | High |
| Pipeline | Processing flow from data collection → analysis → strategy | software-engineering: CI/CD pipeline | High |
| Decision Gate | Verification point for strategy option execution approval | software-engineering: code deployment policy gate | Medium |
| Exposure | Level of exposure to market risk | finance: financial asset risk exposure (similar but different scope) | Medium |
| Signal | Directional pattern in market data | signal-processing: electronic signal | Low |
| Source | Data source (origin of intelligence) | software-engineering: source code | Medium |
| Trend | Directional pattern in time series | general: any directional movement | Low |
| Strategy | Strategic option in market intelligence | game theory: optimal action in game / business: business strategy | Medium |
| Risk | Market/operational risk in MI context | finance: financial risk / SE: technical risk | Medium |
| Threshold | Risk threshold or freshness threshold | general: any boundary value | Low |
| Position | Competitive position in market | finance: trading position / SE: code position | Medium |

> **Interpretation principle**: When the above terms appear in a multi-domain project, the namespace must be specified in the format `{domain}::{term}`. Terms used without a namespace are interpreted in the currently active domain context.

## 6. Interpretation Principles

### 6.1 Classification Axis Separation

The kind (type) and attribute (trait) of an entity are separate classification axes and must not be mixed.

- **Entity type**: ontological kind (data source, market, competitor, risk factor)
- **Trait**: attribute classification (credibility rating, risk level, freshness rating)
- Entity types express "what something is"; traits express "what attributes it has"
- Multiple traits assignable to one entity; using entity type as trait or vice versa is prohibited

### 6.2 Cross-Verification of Trait Application Targets

If a trait is declared to be used across multiple areas, its value set must be defined in all applicable areas. If a value is defined in one area but missing in another, it constitutes a **consistency violation**.

### 6.3 Term Priority

1. Terms defined in this document — highest priority
2. Terms defined in domain_scope.md reference standards (Tier-1 frameworks) — next priority
3. General industry usage — applied only when absent from above

### 6.4 Risk Independence Principle

Risk assessment is **structurally independent** of strategy derivation. Specifically:
- Risk has its own collection paths and analysis methodology
- Risk assessment produces valid output even when no strategy exists
- Risk assessment can veto or modify strategy
- Risk owner and strategy owner are distinct roles

Treating risk as an appendage of strategy (e.g., "what risks does this strategy face?") inverts the relationship and undermines independent risk evaluation.

### 6.5 Credibility Propagation Principle (Weakest Link)

Credibility of analysis result ≤ minimum credibility of input data. Strategy option credibility ≤ supporting analysis credibility. Credibility never increases through processing — only decreases.

This principle prevents "credibility laundering" (using a single low-credibility source to support a high-credibility-rated conclusion).

### 6.6 Substance Over Methodology

When methodology output contradicts evidence, evidence wins. Methodology is a tool for structured thinking, not a replacement for judgment. Example: SWOT analysis identifies an "Opportunity" but customer research consistently shows no demand → the customer evidence overrides the SWOT framework conclusion.

## 7. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition, normative tier classification, reference standards |
| [logic_rules.md](logic_rules.md) | Credibility rating allowed set consistency rules |
| [structure_spec.md](structure_spec.md) | Entity type and trait classification axis structure |
| [dependency_rules.md](dependency_rules.md) | Inter-area dependency relationships |
| [competency_qs.md](competency_qs.md) | Verification questions referencing terms here |
| [extension_cases.md](extension_cases.md) | Scenarios introducing new terms |
| [conciseness_rules.md](conciseness_rules.md) | Redundancy patterns using synonym mappings here |
