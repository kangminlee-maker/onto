---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Market Intelligence Domain — Extension Scenarios

## 1. Purpose

Defines practical scenarios where extension of the market intelligence analysis system is needed,
and specifies how the existing structure should adapt in each scenario.

## 2. Scenario List

### EXT-01. Adding a New Data Source Type

**Situation**: A new data source type not covered by the existing credibility rating system emerges.
Example: AI-generated reports, social media real-time sentiment data.

**Extension Requirements**:
1. Add a new value to the data source credibility rating allowed set.
2. Following the multi-point matching rule in logic_rules.md, **simultaneously** update all reference points across collection/policy/analysis.
3. Define credibility propagation rules (dependency_rules.md) for the new rating.
4. Execute competency_qs.md Q1 to verify consistency.

**Structural Impact**: Change in the value set of the credibility rating trait. Verify that the new value is validly handled in all entity types declared as application targets.

### EXT-02. Adding Decision Gate Conditions

**Situation**: New pass conditions are added to the decision gate due to new regulations, compliance requirements, or internal policies.

**Extension Requirements**:
1. Add new conditions to the decision gate's pass condition list.
2. Following the declaration-implementation link rule in logic_rules.md, **immediately** create corresponding verification logic.
3. Declaring a condition without verification logic constitutes a declaration-implementation gap violation.
4. Identify existing strategy options whose gate status changes due to the new conditions.

**Structural Impact**: Expansion of the decision gate's condition set. Re-verification of existing passed strategies is required.

### EXT-03. Risk Assessment Framework Replacement

**Situation**: Switching from the current framework to a different framework (e.g., from ISO 31000 to COSO ERM).

**Extension Requirements**:
1. The risk score calculation formula may change. Update logic_rules.md.
2. The allowed values for the risk level trait may change. Update structure_spec.md.
3. The **independence** of risk assessment must be maintained regardless of framework change.
4. Recalculate risk scores for existing risk factors using the new formula.

**Structural Impact**: Internal changes within the risk assessment area. Interfaces to other areas (analysis, strategy derivation) are maintained.

### EXT-04. Multi-Domain Simultaneous Analysis

**Situation**: Applying the market intelligence domain alongside another domain in a single project.

**Extension Requirements**:
1. Apply domain namespace prefixes to all entities and traits.
2. Register conflicting terms in the homonym table of concepts.md.
3. Use the `{domain}::{concept}` format for cross-domain references.
4. If inter-domain dependencies arise, apply the multi-domain rules from dependency_rules.md.
5. Decision gates for each domain operate independently.

**Structural Impact**: Full application of the namespace system. Convert existing single-domain references to the namespace format.

### EXT-05. Adding Real-Time Monitoring

**Situation**: Extending from batch analysis to real-time monitoring.

**Extension Requirements**:
1. Add a collection method trait to raw data (batch/streaming/event-driven).
2. Adjust freshness rating criteria for real-time data.
3. Add a detection latency attribute to trend signals.
4. Design a path that **immediately** triggers alerts when risk thresholds are exceeded.
5. The multi-point credibility rating matching rules apply equally in the real-time environment.

**Structural Impact**: Trait additions, changes to freshness rating criteria. Compatibility with the existing batch analysis structure must be maintained.

### EXT-06. Classification Axis Refinement

**Situation**: Adding a third classification axis to the existing 2-axis (entity type, trait) system.
Example: "Analysis perspective" — analyzing the same market entity from technical, financial, and regulatory perspectives.

**Extension Requirements**:
1. Explicitly declare the new classification axis in structure_spec.md.
2. Verify that the new axis is orthogonal to the existing entity type axis and trait axis.
3. Apply the axis mixing prohibition principle to the new axis as well.
4. Update the classification axis separation principle in concepts.md.

**Structural Impact**: Increase in the dimensionality of the classification system. Determine whether a new axis value is needed for all existing entities.

### EXT-07. Quantitative Analysis Model Integration

**Situation**: Integrating quantitative models (statistics, ML) for market size estimation, competitive simulation, etc.

**Extension Requirements**:
1. Add a new entity type "Analysis Model" (including model name, preconditions, input/output definitions).
2. Add a relationship type "Model Application": analysis model → market/competitor/segment.
3. Model output credibility is determined by the input data's credibility rating and the model's own verification status.
4. If the model is used as verification logic at a decision gate, comply with the declaration-implementation link rule.

**Structural Impact**: Expansion of entity types and relationship types. Addition of model credibility factors to existing credibility propagation rules.

## 3. Common Checklist for Extensions

Confirm the following items in all extension scenarios:

- [ ] Is multi-point credibility rating matching maintained? (logic_rules.md)
- [ ] Has no declaration-implementation gap occurred at decision gates? (logic_rules.md)
- [ ] Are entity type and trait classification axes not mixed? (concepts.md)
- [ ] Does the cross-verification of trait application targets and value sets pass? (structure_spec.md)
- [ ] Is the independence of risk assessment maintained? (domain_scope.md)
- [ ] Are there no multi-domain namespace collisions? (structure_spec.md)
- [ ] Has no circular dependency occurred? (dependency_rules.md)
- [ ] Do the relevant questions in competency_qs.md pass when re-executed?

## 4. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition, independence principles, multi-domain principles |
| [concepts.md](concepts.md) | Terms, homonyms, classification axis principles |
| [competency_qs.md](competency_qs.md) | Post-extension verification questions |
| [logic_rules.md](logic_rules.md) | Credibility rating consistency, decision gate rules |
| [structure_spec.md](structure_spec.md) | Entity/trait/relationship structure |
| [dependency_rules.md](dependency_rules.md) | Dependency and impact relationship rules |
