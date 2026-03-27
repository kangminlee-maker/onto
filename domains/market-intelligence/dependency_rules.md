# Market Intelligence Domain — Dependency Rules

## 1. Purpose

Defines the dependency relationships and their constraints among the four areas (data collection, analysis, strategy derivation, risk assessment) of the market intelligence analysis system.

## 2. Inter-Area Dependency Structure

### 2.1 Forward Dependencies

| Dependency | Meaning | Description |
|-----------|---------|-------------|
| Data Collection → Analysis | Analysis depends on collected data | Collection quality is the upper bound for analysis quality |
| Analysis → Strategy Derivation | Strategy depends on analysis results | Strategy without analysis has no basis |
| Risk Assessment → Strategy Derivation | Risk assessment can modify strategy | This is a modification relationship, not a subordination relationship |

### 2.2 Independent Relationships

| Relationship | Meaning |
|-------------|---------|
| Risk Assessment ∥ Analysis | Risk assessment can be performed in parallel with analysis |
| Risk Assessment ∥ Data Collection | Risk assessment may have its own separate data collection path |

### 2.3 Prohibited Dependencies

| Prohibited Relationship | Reason |
|------------------------|--------|
| Strategy Derivation → Risk Assessment | If risk assessment becomes subordinate to strategy, independence is violated |
| Analysis → Data Collection | Analysis directing collection is allowed, but circular dependency is prohibited |

## 3. Acyclicity Rules

| ID | Rule | Description | Violation Handling |
|---|------|-------------|-------------------|
| AC01 | No cycles in the Data Collection → Analysis → Strategy Derivation path | Ensures unidirectional flow | Block |
| AC02 | Prevention of infinite loops in Risk Assessment → Strategy Modification → Risk Re-assessment | Requires a limit on modification count or depth | Warning |

## 4. Credibility Propagation Rules

### 4.1 Propagation Direction

Credibility propagates in the direction of Data Collection → Analysis → Strategy Derivation, and reverse propagation is prohibited.

### 4.2 Propagation Principles

| ID | Rule | Description |
|---|------|-------------|
| TP01 | Credibility of analysis results ≤ lowest credibility among input data | Weakest link principle |
| TP02 | Credibility of strategy options ≤ credibility of supporting analysis | Same principle applies at the strategy phase |
| TP03 | Data without a credibility rating is prohibited from entering the propagation chain | No rating = blocked from analysis input |

## 5. Cycle Detection Criteria

- If inter-area references form a cycle in the pattern A → B → A, block it
- Modification loops between risk assessment and strategy derivation require a defined maximum depth to prevent infinite cycles
- Collection feedback loops (adjusting collection targets based on analysis results) are separated as a distinct flow to distinguish them from circular dependencies

## 6. Multi-Domain Dependency Rules

When coexisting with other domains:
- Inter-domain dependency relationships must be explicitly declared
- Cross-domain dependencies allow only unidirectional relationships (bidirectional dependency = design flaw)
- Decision gates of each domain operate independently

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and independence principles |
| [logic_rules.md](logic_rules.md) | Logical basis of credibility propagation rules |
| [structure_spec.md](structure_spec.md) | Relationship structure and direction rules |
| [concepts.md](concepts.md) | Credibility rating term definitions |
| [extension_cases.md](extension_cases.md) | Scenarios requiring dependency relationship changes |
