# Market Intelligence Domain — Structure Specification

## 1. Purpose

Defines the structural requirements of the market intelligence analysis system.
Specifies design principles and structural constraints for entity types, traits, and classification axes.

## 2. Entity Type Definitions

Entity types represent the **ontological kind** of entities within the system.

Classification axis: entity kinds per area

### 2.1 Data Collection Area

| Entity Type | Definition |
|-------------|-----------|
| Data Source | A source that provides market data |
| Raw Data | A unit of unprocessed data that has been collected |

### 2.2 Analysis Area

| Entity Type | Definition |
|-------------|-----------|
| Market | A market unit that is the subject of analysis |
| Competitor | A competitive entity within a market |
| Segment | A subset classification of markets or customers |
| Trend Signal | A directional pattern identified in time-series data |

### 2.3 Strategy Derivation Area

| Entity Type | Definition |
|-------------|-----------|
| Strategy Option | A strategy candidate derived from analysis |
| Decision Gate | A verification point for strategy execution approval |

### 2.4 Risk Assessment Area

| Entity Type | Definition |
|-------------|-----------|
| Risk Factor | An identified individual risk factor |
| Risk Response | A response strategy for a risk |

## 3. Trait Definitions

Traits represent the **attribute classification values** of entities.
Entity types and traits are separate classification axes and must not be mixed.

Classification axes:
- **Axis 1 — Entity Type**: What the entity "is" (ontological)
- **Axis 2 — Trait**: What attributes the entity "has" (attributive)
- The two axes are orthogonal, and using a value from one axis in the other is prohibited.

| Trait | Description | Example Allowed Values | Applicable Entity Types |
|-------|------------|----------------------|------------------------|
| Source Credibility Rating | Credibility classification of a data source | Primary/Secondary/Tertiary, etc. as defined in the system | Data Source, Raw Data |
| Freshness Rating | Temporal validity of data | Current/Recent/Outdated/Expired, etc. | Raw Data |
| Risk Level | Severity classification of a risk factor | Critical/High/Medium/Low, etc. | Risk Factor |
| Credibility | Confidence level of analysis results | High/Medium/Low, etc. | Trend Signal, Strategy Option |
| Priority | Execution priority classification | Ratings defined by the system | Strategy Option, Risk Response |
| Gate Status | Current status of a decision gate | Pending/Passed/Failed/Exempt, etc. | Decision Gate |

### 3.1 Cross-Verification of Trait Application Targets

If a trait is declared to apply to multiple entity types, its value set must be validly defined for all applicable entity types.

## 4. Relationship Structure

### 4.1 Required Relationships

| Relationship | Start | End | Description |
|-------------|-------|-----|-------------|
| Provides | Data Source | Raw Data | Which source collected it |
| Analyzes | Analysis Result | Market/Competitor/Segment | What was analyzed |
| Derives | Analysis Result | Strategy Option | From which analysis the strategy was derived |
| Blocks | Risk Factor | Strategy Option | Risk constrains strategy execution |
| Modifies | Risk Assessment | Strategy Option | Risk assessment results modify strategy |
| Validates | Decision Gate | Strategy Option | Gate approves strategy execution |

### 4.2 Direction Rules

All relationships may only be used in the specified direction. Reverse usage is prohibited.

## 5. Structural Constraints

### 5.1 No Isolated Entities

All entities must have at least 1 relationship. An isolated entity without relationships is considered a data collection error or omission.

### 5.2 No Cycles

No cycles may exist in the path Data Source → Raw Data → Analysis Result → Strategy Option.

### 5.3 Risk Assessment Path Independence

The Risk Factor → Strategy Option path is independent of the Analysis Result → Strategy Option path. Risk assessment can directly influence strategy without going through the analysis path.

### 5.4 Multi-Domain Namespace

When coexisting with other domains, all entity types and traits are prefixed with a domain namespace. Cross-domain references use the `{domain}::{concept}` format.

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and independence principles |
| [concepts.md](concepts.md) | Term definitions and classification axis principles |
| [logic_rules.md](logic_rules.md) | Trait value consistency rules |
| [dependency_rules.md](dependency_rules.md) | Relationship dependency direction rules |
| [extension_cases.md](extension_cases.md) | Structure extension scenarios |
