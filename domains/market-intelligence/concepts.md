# Market Intelligence Domain — Core Concept Definitions

## 1. Term Definitions

### 1.1 Data Collection Area

| Term | Definition | Notes |
|------|-----------|-------|
| Data Source Credibility Rating | A rating system that classifies the credibility of data sources. A classification value that must be assigned before collected data is fed into analysis | See logic_rules.md |
| Primary Source | Raw data collected directly (interviews, surveys, direct observation) | Highest credibility rating |
| Secondary Source | Data processed and published by other organizations (reports, papers, public disclosures) | Medium credibility rating |
| Tertiary Source | Data reprocessed from secondary sources (news summaries, blogs, wikis) | Lowest credibility rating |
| Collection Policy | A policy declaration that specifies collection frequency, targets, and methods | Input to decision gates |
| Data Freshness | A validity indicator measured by the difference between the data collection time and the current time | Linked with update frequency |

### 1.2 Analysis Area

| Term | Definition | Notes |
|------|-----------|-------|
| Competitive Landscape Analysis | A structured analysis result of competitors' positions, capabilities, and strategies within a specific market | |
| Market Size Estimation | Estimation of total market size (TAM), serviceable addressable market (SAM), and serviceable obtainable market (SOM) | |
| Trend Signal | A directional pattern identified in time-series data | Must be distinguished from noise |
| Segment | A subset of customers or markets grouped by common characteristics | Classification criteria must be specified |
| Analysis Methodology | The name and preconditions of the methodology applied to the analysis | SWOT, Five Forces, etc. |

### 1.3 Strategy Derivation Area

| Term | Definition | Notes |
|------|-----------|-------|
| Strategy Option | An actionable strategy candidate derived from analysis results | |
| Decision Gate | A verification point that a strategy option must pass to proceed to the execution phase | See homonyms |
| Priority Score | A quantitative score that determines the execution priority of a strategy option | Based on evaluation matrix |
| Decision Criteria | The set of judgment criteria used for strategy selection | |

### 1.4 Risk Assessment Area

| Term | Definition | Notes |
|------|-----------|-------|
| Risk Factor | An individual risk factor identified in the market | |
| Risk Score | A quantified risk value calculated as impact x likelihood | |
| Risk Response | A response strategy for an identified risk (avoidance/mitigation/acceptance/transfer) | |
| Risk Threshold | The acceptable boundary value for risk. Exceeding it requires a mandatory response | |
| Exposure Level | The current level of exposure to a specific risk factor | |

## 2. Cross-Domain Homonyms

Cases where the same term carries different meanings depending on the domain are specified below.

| Term | market-intelligence Meaning | Other Domain Meaning | Confusion Risk |
|------|---------------------------|---------------------|---------------|
| Segment | A subset classification of markets or customers | software-engineering: memory segment | High |
| Pipeline | The processing flow from data collection → analysis → strategy | software-engineering: CI/CD pipeline | High |
| Decision Gate | A verification point for strategy option execution approval | software-engineering: code deployment policy gate | Medium |
| Exposure | The level of exposure to market risk | finance: financial asset risk exposure (similar but different in scope) | Medium |
| Signal | A directional pattern identified in market data | signal-processing: electronic signal | Low |

> **Interpretation principle**: When the above terms appear in a multi-domain project,
> the namespace must be specified in the format `{domain}::{term}`.
> Terms used without a namespace are interpreted in the currently active domain context.

## 3. Interpretation Principles

### 3.1 Classification Axis Separation

The kind (type) and attribute (trait) of an entity are separate classification axes and must not be mixed.

- **Entity type**: The ontological kind of an entity (e.g., data source, market, competitor, risk factor)
- **Trait**: An attribute classification of an entity (e.g., credibility rating, risk level, freshness rating)
- Entity types express "what something is," while traits express "what attributes it has."
- Multiple traits can be assigned to a single entity, but using an entity type as a trait or vice versa is prohibited.

### 3.2 Cross-Verification of Trait Application Targets and Value Sets

If a trait is declared to be used across multiple areas, its value set must be defined in all applicable areas.
If a value is defined in one area but missing in another, it constitutes a **consistency violation**.

### 3.3 Term Priority

1. Terms defined in this document — highest priority
2. Terms defined in domain_scope.md reference standards — next priority
3. General industry usage — applied only when absent from the above two sources

## 4. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and reference standards |
| [logic_rules.md](logic_rules.md) | Credibility rating allowed set consistency rules |
| [structure_spec.md](structure_spec.md) | Entity type and trait classification axis structure |
