---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Structure Specification

Classification axis: **Structural component** — specifications classified by the structural element they govern.

## 1. Purpose

Defines the structural requirements of the market intelligence analysis system. Specifies design principles and structural constraints for entity types, traits, classification axes, and relationships.

## 2. Entity Type Definitions

Entity types represent the **ontological kind** of entities within the system.

Classification axis: entity kinds per area

### 2.1 Data Collection Area

| Entity Type | Definition | Required Attributes |
|-------------|-----------|---------------------|
| Data Source | A source that provides market data | source_name, source_type, credibility_rating, access_method, contact_info |
| Raw Data | A unit of unprocessed data that has been collected | data_id, collection_timestamp, source_ref, format, payload |
| Collection Pipeline | An automated workflow for data collection | pipeline_name, source_refs, frequency, transformation_rules |

### 2.2 Analysis Area

| Entity Type | Definition | Required Attributes |
|-------------|-----------|---------------------|
| Market | A market unit that is the subject of analysis | market_name, geography, industry_classification, time_horizon |
| Competitor | A competitive entity within a market | competitor_name, market_ref, competitor_type (direct/indirect), capability_assessment |
| Segment | A subset classification of markets or customers | segment_name, parent_market, classification_criteria, segment_size |
| Trend Signal | A directional pattern identified in time-series data | signal_id, time_window, direction, magnitude, signal_strength |
| Analysis Output | A structured analysis result | output_id, methodology_ref, input_data_refs, credibility_rating, conclusions |
| Analysis Model | A quantitative model used for analysis | model_name, model_type, input_definition, output_definition, validation_status |

### 2.3 Strategy Derivation Area

| Entity Type | Definition | Required Attributes |
|-------------|-----------|---------------------|
| Strategy Option | A strategy candidate derived from analysis | option_id, goal, action_set, expected_outcome, resource_requirement, supporting_analysis_refs |
| Decision Gate | A verification point for strategy execution approval | gate_id, gate_purpose, pass_conditions, verification_logic_refs, gate_status |
| Pass Condition | A specific criterion the strategy must meet | condition_id, gate_ref, condition_description, verification_logic_ref |
| Verification Logic | The mechanism that checks pass conditions | logic_id, logic_type (automated/checklist/expert), implementation_ref |
| Evaluation Matrix | Multi-criteria evaluation tool for options | matrix_id, criteria, weights, scoring_scale |

### 2.4 Risk Assessment Area

| Entity Type | Definition | Required Attributes |
|-------------|-----------|---------------------|
| Risk Factor | An identified individual risk factor | risk_id, risk_name, risk_type (market/operational/strategic/compliance/reputational), description, owner |
| Risk Score | Quantified risk value | score_id, risk_ref, impact_score, likelihood_score, total_score, score_date |
| Risk Response | A response strategy for a risk | response_id, risk_ref, response_type (avoidance/mitigation/acceptance/transfer), response_action, owner |
| Risk Threshold | Acceptable boundary value | threshold_id, risk_type, threshold_value, escalation_action |

## 3. Trait Definitions

Traits represent the **attribute classification values** of entities. Entity types and traits are separate classification axes and must not be mixed.

### Classification Axes

- **Axis 1 — Entity Type**: What the entity "is" (ontological)
- **Axis 2 — Trait**: What attributes the entity "has" (attributive)
- The two axes are orthogonal. Using a value from one axis in the other is prohibited

### Trait Catalog

| Trait | Description | Allowed Values | Applicable Entity Types |
|-------|------------|----------------------|------------------------|
| Source Credibility Rating | Credibility classification of a data source | Organization-defined set (e.g., Trusted/Verified/Unverified/Speculative) | Data Source, Raw Data |
| Freshness Rating | Temporal validity of data | Current / Recent / Outdated / Expired | Raw Data |
| Risk Level | Severity classification of risk | Critical / High / Medium / Low | Risk Factor |
| Risk Type | Category of risk | Market / Operational / Strategic / Compliance / Reputational | Risk Factor |
| Analysis Credibility | Confidence level of analysis results | High / Medium / Low | Trend Signal, Analysis Output, Strategy Option |
| Priority | Execution priority classification | P1 / P2 / P3 (or numeric scale) | Strategy Option, Risk Response |
| Gate Status | Current status of a decision gate | Pending / Passed / Failed / Exempt | Decision Gate |
| Strategic Horizon | Time scope of strategy | Short-term (<1Y) / Medium-term (1-3Y) / Long-term (>3Y) | Strategy Option |
| Methodology Type | Analysis methodology category | Five Forces / SWOT / PESTEL / TAM-SAM-SOM / Other | Analysis Output |
| Response Status | Status of risk response | Planned / In-progress / Completed / Cancelled | Risk Response |

### 3.1 Cross-Verification of Trait Application Targets

If a trait is declared to apply to multiple entity types, its value set must be validly defined for all applicable entity types. Inconsistency = consistency violation per logic_rules.md ST04.

## 4. Relationship Structure

### 4.1 Required Relationships

| Relationship | Start Entity | End Entity | Cardinality | Description |
|-------------|-------------|-----------|-------------|-------------|
| Provides | Data Source | Raw Data | 1:N | Which source collected the data |
| Analyzes | Analysis Output | Market/Competitor/Segment | N:M | What was analyzed |
| Cites | Analysis Output | Methodology | N:1 | Which methodology was used |
| Derives | Strategy Option | Analysis Output | N:M | From which analysis the strategy was derived |
| Blocks | Risk Factor | Strategy Option | N:M | Risk constrains strategy execution |
| Modifies | Risk Assessment | Strategy Option | N:M | Risk assessment results modify strategy |
| Validates | Decision Gate | Strategy Option | 1:N | Gate approves strategy execution |
| Implements | Verification Logic | Pass Condition | 1:1 | Logic implements specific condition |
| Has-Score | Risk Factor | Risk Score | 1:1 | Risk has quantified score |
| Responds-To | Risk Response | Risk Factor | N:1 | Response addresses specific risk |

### 4.2 Direction Rules

All relationships may only be used in the specified direction. Reverse usage is prohibited.

| Relationship | Allowed Direction | Prohibited Direction |
|-------------|-------------------|---------------------|
| Provides | Data Source → Raw Data | Raw Data → Data Source (reverse direction would imply data creates source) |
| Derives | Strategy → Analysis | Analysis → Strategy (analysis must precede strategy) |
| Modifies | Risk Assessment → Strategy | Strategy → Risk Assessment (strategy cannot modify risk; risk has independence) |
| Validates | Decision Gate → Strategy | Strategy → Decision Gate (strategy cannot self-validate) |
| Implements | Verification Logic → Pass Condition | Pass Condition → Verification Logic (logic implements condition, not vice versa) |

## 5. Structural Constraints

### 5.1 No Isolated Entities

All entities must have at least 1 relationship. An isolated entity without relationships is considered a data collection error or omission.

| Entity Type | Required Relationship | Severity |
|-------------|----------------------|----------|
| Data Source | ≥1 Provides (to Raw Data) | Warning (acceptable for newly registered sources) |
| Raw Data | ≥1 source via Provides + downstream usage | Error if unused beyond TTL |
| Analysis Output | ≥1 input via Analyzes + ≥1 Methodology cited | Error |
| Strategy Option | ≥1 Derives (from Analysis) | Error |
| Decision Gate | ≥1 Pass Condition with Verification Logic | Error |
| Pass Condition | Exactly 1 Verification Logic Implements | Error |
| Risk Factor | ≥1 Has-Score + ≥1 Risk Response | Warning (newly identified risks may not have response yet) |

### 5.2 No Cycles

Path constraints (per dependency_rules.md):

- **Data Source → Raw Data → Analysis Output → Strategy Option**: must remain DAG. No back-edge from Strategy or Analysis to Source
- **Risk Assessment → Strategy modification**: bounded iteration (max 3 rounds, see AC02)
- **Multi-domain references**: namespace-prefixed; cross-domain cycles forbidden

### 5.3 Risk Assessment Path Independence

The Risk Factor → Strategy Option path is independent of the Analysis Output → Strategy Option path. Risk assessment can directly influence strategy without going through the analysis path.

Structural enforcement:
- Risk Factor entity has its own input data path (separate from Analysis Output's input data)
- Risk → Strategy edge is "Modifies" (not "Derives") to mark the different relationship semantics
- Risk owner attribute distinct from Strategy owner

### 5.4 Multi-Domain Namespace

When coexisting with other domains, all entity types and traits are prefixed with a domain namespace. Cross-domain references use the `{domain}::{concept}` format.

Example:
- `market-intelligence::Competitor` ≠ `business::Competitor` (different conceptual scope)
- `market-intelligence::Risk Factor` ≠ `finance::Risk Factor` (different risk taxonomy)

### 5.5 Declaration-Implementation Pairing

Per logic_rules.md PG01: every Pass Condition must have exactly 1 Verification Logic Implements relationship. Cardinality enforcement at structural level.

## 6. Classification Criteria Design

### 6.1 Entity Classification Axes

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Area | Collection / Analysis / Strategy / Risk | Determines applicable trait set, validation rules |
| Lifecycle Stage | Active / Deprecated / Archived | Determines visibility in current operations |
| Owner | Specific role/team | Determines accountability; risk owner ≠ strategy owner per RA03 |
| Confidentiality | Public / Internal / Confidential / Restricted | Determines access control |

### 6.2 Anti-Patterns in Classification

- **Mixing entity types and traits**: using "Trusted" (a trait value) as an entity type, or using "Data Source" (an entity type) as a trait value. Per concepts.md §6.1
- **Implicit area assignment**: failing to declare which area an entity belongs to creates ambiguity in applicable rules
- **Single-axis over-classification**: using only entity type without trait creates flat structure; using only traits loses ontological clarity

## 7. Domain Boundary Management

- **This domain covers**: market data collection, market analysis, strategy option generation, risk assessment for market context
- **Business domain**: strategy formulation, business model design, organizational implementation (consumes MI outputs)
- **Finance domain**: financial reporting, financial analysis (different from market analysis using public financial data)
- **Software-engineering domain**: technical implementation of MI pipelines (data engineering, model deployment)
- **Compliance/legal domain**: regulatory frameworks (specific to jurisdictions, separate from MI risk assessment of market regulations)

## 8. SE Transfer Verification

| SE Pattern | Market Intelligence Equivalent | Key Difference |
|---|---|---|
| Required Module Structure | Required Entity Types per area | SE by architectural layer; MI by analytical area |
| Golden Relationships | Required Relationships (Provides, Analyzes, Derives, Modifies, Validates) | SE validates code coherence; MI validates intelligence flow |
| Naming Conventions | Namespace prefixes ({domain}::{concept}) | Same principle; MI emphasizes domain disambiguation |
| Isolated Node Prohibition | §5.1 No Isolated Entities | Same principle, different domain objects |
| Classification Criteria Design | Entity types vs traits orthogonality | Same principle; MI strict orthogonality enforcement |
| Type system enforcement | Trait value set consistency (logic_rules.md ST01-ST05) | Both ensure value validity; MI cross-area consistency |

## 9. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and independence principles |
| [concepts.md](concepts.md) | Term definitions and classification axis principles |
| [logic_rules.md](logic_rules.md) | Trait value consistency rules, decision gate rules |
| [dependency_rules.md](dependency_rules.md) | Relationship dependency direction rules |
| [competency_qs.md](competency_qs.md) | Structural verification questions |
| [extension_cases.md](extension_cases.md) | Structure extension scenarios |
| [conciseness_rules.md](conciseness_rules.md) | Redundancy patterns |
