---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Dependency Rules

Classification axis: **Dependency type** — rules classified by the nature of the inter-area or inter-element relationship.

## 1. Purpose

Defines the dependency relationships and their constraints among the four areas (data collection, analysis, strategy derivation, risk assessment) of the market intelligence analysis system. Critical because risk assessment must remain independent.

## 2. Inter-Area Dependency Structure

### 2.1 Forward Dependencies (Allowed)

| Dependency | Meaning | Description |
|-----------|---------|-------------|
| Data Collection → Analysis | Analysis depends on collected data | Collection quality is the upper bound for analysis quality (TP01) |
| Analysis → Strategy Derivation | Strategy depends on analysis results | Strategy without analysis has no basis |
| Risk Assessment → Strategy Derivation | Risk assessment can modify strategy | Modification relationship — risk has veto authority above threshold |
| Risk Assessment → Strategy Derivation (escalation) | Risk findings escalate to strategy decision authority | Direct path bypassing strategy team for executive review |

### 2.2 Independent Relationships

| Relationship | Meaning |
|-------------|---------|
| Risk Assessment ∥ Analysis | Risk assessment can be performed in parallel with analysis (need not wait for analysis output) |
| Risk Assessment ∥ Data Collection | Risk assessment may have its own separate data collection paths (regulatory feeds, threat intelligence) |
| Analysis ∥ Risk Assessment | Bidirectional independence — analysis can flag risks; risk can request analysis, but neither blocks the other |

### 2.3 Prohibited Dependencies

| Prohibited Relationship | Reason |
|------------------------|--------|
| Strategy Derivation → Risk Assessment (input) | If risk assessment becomes subordinate to strategy (only assesses risks the strategy team raises), independence is violated |
| Analysis → Data Collection (mandatory) | Analysis can request additional data collection but cannot block existing collection from operating |
| Strategy Derivation → Risk Assessment (definition) | Strategy team cannot define what counts as a risk for risk team |

### Risk Independence Enforcement

The prohibited dependency "Strategy Derivation → Risk Assessment" is enforced through:
1. **Organizational separation**: distinct teams with separate reporting lines
2. **Independent input sources**: risk team has own data collection
3. **Veto authority**: risk findings above threshold can block strategy regardless of strategy team input
4. **Direct escalation**: risk reports to executive/board, not through strategy chain
5. **Calendar independence**: risk reviews on own schedule, not synchronized to strategy reviews

## 3. Acyclicity Rules

| ID | Rule | Description | Violation Handling |
|---|------|-------------|-------------------|
| AC01 | No cycles in the Data Collection → Analysis → Strategy Derivation path | Ensures unidirectional flow | Block |
| AC02 | Prevention of infinite loops in Risk Assessment → Strategy Modification → Risk Re-assessment | Requires limit on modification iterations | Warning |
| AC03 | Analysis → Collection feedback (request additional data) is not a cycle but a managed flow | Treated as separate flow with explicit request artifact | Informational |
| AC04 | Multi-domain cross-references must form DAG (no inter-domain cycles) | Dependencies declared explicitly | Block |

### Risk-Strategy Iteration Bounds

To prevent AC02 violation:
- **Max iteration**: 3 rounds of risk-driven strategy modification per strategy option
- **Convergence required**: each iteration must converge (risk score reduction ≥ 10% or new risks limited to ≤ 2)
- **Escalation if non-convergent**: after 3 rounds, escalate to executive review

## 4. Credibility Propagation Rules

### 4.1 Propagation Direction

Credibility propagates in the direction of Data Collection → Analysis → Strategy Derivation. Reverse propagation is prohibited (cannot upgrade credibility through processing).

### 4.2 Propagation Principles

| ID | Rule | Description |
|---|------|-------------|
| TP01 | Credibility of analysis results ≤ lowest credibility among input data | Weakest link principle |
| TP02 | Credibility of strategy options ≤ credibility of supporting analysis | Same principle at strategy phase |
| TP03 | Data without a credibility rating is prohibited from entering the propagation chain | No rating = blocked from analysis input |
| TP04 | Risk assessment uses its own propagation chain (independent of analysis chain) | Risk has separate inputs |
| TP05 | Multi-source aggregation does not increase credibility | Lowest input remains upper bound |

### 4.3 Credibility Override Conditions

In rare cases, downstream verification can confirm credibility:
- If analysis output is independently verified (e.g., by audited financial data), the verified result can have higher credibility than original inputs
- This requires explicit verification step documentation (cannot be implicit)
- The verification source itself must be appropriately credible

## 5. Cycle Detection Criteria

### Detection Methods

- **Inter-area references** forming cycle pattern A → B → A → block
- **Modification loops** between risk assessment and strategy derivation: enforce maximum depth (AC02)
- **Collection feedback loops**: separate as distinct flow (analysis can request collection, but must be explicit request artifact, not implicit dependency)

### Acceptable Bidirectional Patterns (Not Cycles)

- **Risk ↔ Strategy** modification: managed iteration with bounds (AC02)
- **Analysis → Data Collection** request: managed feedback with explicit request artifact
- **Risk Monitoring ↔ Risk Register** update: maintenance loop, not strategic dependency

### Defective Cyclic Patterns

- **Strategy → Risk → Strategy** without managed bounds: infinite refinement loop
- **Analysis ↔ Analysis** (circular reference between analysis components)
- **Source → Source** circular references in data lineage

## 6. Multi-Domain Dependency Rules

When market intelligence coexists with other domains:

### 6.1 Cross-Domain Dependency Declaration

| Rule | Description |
|------|-------------|
| MD01 | Inter-domain dependencies must be explicitly declared in domain scope | Implicit dependencies are prohibited |
| MD02 | Cross-domain dependencies allow only unidirectional relationships | Bidirectional = design flaw |
| MD03 | Decision gates of each domain operate independently | One domain's gate does not bypass another's |
| MD04 | Namespace prefixes ({domain}::{concept}) prevent collision | Required for any cross-domain reference |

### 6.2 Domain Coexistence Examples

**Valid**: Market Intelligence (MI) feeds analysis to Business (B). MI does not depend on B.
- `MI::competitor_analysis` → `B::strategic_planning`

**Invalid**: B references MI which references B.
- `B::strategy` → `MI::competitor_analysis` → `B::strategy_assumption` (cycle)

**Resolution**: Extract shared concept to a common layer or break cycle by replacing reference with explicit data passing.

## 7. Inter-Element Dependencies

### 7.1 Within Data Collection

| Pair | Relationship |
|------|--------------|
| Source → Raw Data | Provides relationship; raw data without source is invalid |
| Raw Data → Credibility Rating | Mandatory assignment before downstream use |
| Source Type → Default Credibility | Type determines default rating (Primary/Secondary/Tertiary) |

### 7.2 Within Analysis

| Pair | Relationship |
|------|--------------|
| Analysis Output → Methodology | Output cites methodology used |
| Analysis Output → Input Data | Output traces to specific input data |
| Segment → Classification Criteria | Segment definition includes criteria |

### 7.3 Within Strategy Derivation

| Pair | Relationship |
|------|--------------|
| Strategy Option → Analysis Source | Each option traces to supporting analysis |
| Decision Gate → Pass Conditions | Gate has explicit conditions |
| Pass Condition → Verification Logic | Each condition has implementation (PG01) |

### 7.4 Within Risk Assessment

| Pair | Relationship |
|------|--------------|
| Risk Factor → Risk Score | Each risk has quantified score |
| Risk Score → Risk Threshold | Comparison drives response requirement |
| Risk Threshold → Response Strategy | Response triggered by threshold breach |

## 8. Referential Integrity

| ID | Rule | Severity |
|---|------|---------|
| RI-01 | All entities referenced in relationships must exist | Error |
| RI-02 | Credibility rating values must be in declared allowed set | Error |
| RI-03 | Strategy options must reference existing analysis outputs | Error |
| RI-04 | Decision gates must reference existing pass conditions and verification logic | Error |
| RI-05 | Risk responses must reference existing risk factors | Error |

## 9. SE Transfer Verification

| SE Pattern | Market Intelligence Equivalent | Key Difference |
|---|---|---|
| Acyclic Dependencies Principle (module DAG) | Acyclicity Rules (AC01-AC04) | Both prohibit cycles; MI adds risk independence |
| Dependency Inversion (depend on abstractions) | Strategy depends on analysis abstractions, not raw data | Same principle; MI uses analysis as abstraction layer |
| Referential Integrity (FK) | RI-01 to RI-05 | SE enforces at DB; MI enforces at workflow validation |
| Source of Truth Management | Single-source credibility rating set | Same principle; MI applies to enum values |
| Diamond Dependencies | Multi-area shared concepts | SE version conflicts; MI uses namespace |

## 10. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition, independence principles, multi-domain principles |
| [logic_rules.md](logic_rules.md) | Logical basis of credibility propagation rules, decision gate rules |
| [structure_spec.md](structure_spec.md) | Relationship structure and direction rules |
| [concepts.md](concepts.md) | Credibility rating term definitions |
| [competency_qs.md](competency_qs.md) | Verification questions for dependency rules |
| [extension_cases.md](extension_cases.md) | Scenarios requiring dependency relationship changes |
