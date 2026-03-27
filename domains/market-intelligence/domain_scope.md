# Market Intelligence Domain — Domain Scope Definition

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

Risk assessment is performed in parallel with strategy derivation and is not subordinate to strategy.
Risk assessment results can modify strategy, and risk assessment remains independently valid even without a strategy.

## Required Concept Categories

Concept categories that each area must include.

### Data Collection

- Data source classification (credibility rating system)
- Collection frequency and update policies
- Data freshness evaluation criteria
- Raw data normalization criteria

### Analysis

- Competitive Landscape Analysis
- Market Size Estimation (TAM/SAM/SOM)
- Customer segment analysis
- Trend identification and time-series analysis

### Strategy Derivation

- Strategy option generation criteria
- Option evaluation matrix
- Execution priority determination logic
- Decision gate pass requirements

### Risk Assessment

- Risk identification framework
- Risk quantification criteria (impact x likelihood)
- Risk response strategy types (avoidance, mitigation, acceptance, transfer)
- Risk monitoring frequency

## Reference Standards

| Standard | Application Area | Usage |
|----------|-----------------|-------|
| ISO 31000 (Risk Management) | Risk Assessment | Risk identification, analysis, and evaluation framework |
| Porter's Five Forces | Analysis | Competitive landscape analysis structure |
| PESTEL | Analysis, Risk Assessment | Macro-environment factor classification |
| SWOT / TOWS | Strategy Derivation | Strategy option generation matrix |
| OSINT Framework | Data Collection | Open source intelligence collection methodology |

## Multi-Domain Coexistence Principles

The market intelligence domain can be applied in parallel with other domains (e.g., technology, healthcare, finance) within the same project. To support this:
- All concepts are prefixed with a domain namespace.
- Cross-domain references use the `{domain}::{concept}` notation.
- Terms shared across domains are explicitly differentiated in the homonyms section of concepts.md.

## Related Documents

| Document | Role |
|----------|------|
| [concepts.md](concepts.md) | Core term definitions and interpretation principles |
| [competency_qs.md](competency_qs.md) | System verification questions |
| [logic_rules.md](logic_rules.md) | Logic rules and data credibility consistency |
| [structure_spec.md](structure_spec.md) | Structural requirements and classification axes |
| [dependency_rules.md](dependency_rules.md) | Inter-element dependency relationships |
| [extension_cases.md](extension_cases.md) | Extension scenarios |
