# Conciseness Rules (business)

This document contains the domain-specific rules that onto_conciseness references during conciseness verification.
It is organized in the order: **type (allow/remove) -> verification criteria -> role boundaries -> measurement methods**.

---

## 1. Allowed Redundancy

Each rule is tagged with a severity level:
- **[MUST-ALLOW]**: Redundancy that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Redundancy kept for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Performance Measurement

- [MUST-ALLOW] Parallel definition of leading indicators and lagging indicators — both leading indicators (activity/input measurement) and lagging indicators (outcome measurement) exist for the same goal. Retaining only one breaks the cause-effect linkage, making it impossible to determine improvement direction.
- [MUST-ALLOW] Balanced Scorecard's 4 perspectives (financial/customer/internal process/learning & growth) referencing the same KPI from different perspectives. Since each perspective's interpretation differs, consolidation prevents multi-dimensional performance assessment.

### Revenue Model

- [MAY-ALLOW] Revenue model appearing in both strategic management and operations management — at the strategic level it serves as the basis for market selection and pricing strategy; at the operational level it serves as the standard for revenue realization processes. Since the reference contexts differ, retention is acceptable, but if the definitions themselves are inconsistent, consolidation is needed.
- [MAY-ALLOW] Cost structure described in both finance (cost analysis) and operations management (waste elimination). Retain if the analysis purposes differ; consolidate if it is a simple repetition of the same figures.

### Source of Truth Related

- [MUST-ALLOW] When the source of truth resides in external systems (regulatory bodies, contracts, accounting systems), maintaining an internal reference copy. Removing it makes external dependency tracking impossible.
- [MAY-ALLOW] Reinterpreting accounting domain financial statement figures in the context of management decision-making. Since the original is under the accounting domain's jurisdiction, retain if the reference copy's interpretive context is stated.

### Stakeholder Related

- [MUST-ALLOW] The same stakeholder referenced in both governance (decision-making authority) and ESG (stakeholder impact management). Since the concerns differ, retain each. Removing one causes the analysis from that perspective to be missing.

---

## 2. Removal Target Patterns

Each rule is tagged with a severity level:
- **[MUST-REMOVE]**: Redundancy whose mere existence causes errors or incorrect inferences.
- **[SHOULD-REMOVE]**: Redundancy that is not very harmful but adds unnecessary complexity.

### Relation Redundancy

- [MUST-REMOVE] Multiple path representations of the same causal relation — when "price cut -> revenue increase" and "price cut -> customer count increase -> revenue increase" have the same meaning, retain only one path. Maintaining both causes causal relation inconsistencies due to missed updates.
- [MUST-REMOVE] Redeclaration of subordinate tactics already guaranteed by the superior strategy — when the superior competitive strategy is confirmed as "differentiation," there is no need to redeclare "adopt differentiation strategy" in subordinate marketing tactics.

### Classification Redundancy

- [SHOULD-REMOVE] Purposeless sub-classification — intermediate hierarchy nodes with only 1 child, or nodes that have the same constraints/behaviors as the parent classification. They have no classification significance and should be merged with the parent.
- [SHOULD-REMOVE] Classification nodes with no instances — empty classifications to which no actual business activities are mapped should be removed. However, retain if reserved for future expansion (see extension_cases.md).

### Definition Redundancy

- [MUST-REMOVE] Duplicate definitions of the same concept under different paths/names — use the synonym mappings in concepts.md as the basis for identification. Note in particular that homonyms ("cost," "value," "model," "risk," "governance," "innovation," "automation") have different meanings and are therefore not duplicates.
- [SHOULD-REMOVE] Strategy items without execution plans — items where only the strategic goal is declared without an execution path (responsible organization, timeline, resource allocation). Non-executable declarations add unnecessary complexity.

### Measurement Redundancy

- [MUST-REMOVE] Multiple definitions of the same metric — when the same KPI is defined with different formulas or criteria, it is impossible to determine which is the authoritative version. Designate one as the source of truth and remove the rest.

---

## 3. Minimum Granularity Criteria

A sub-classification is permitted only if it satisfies **at least one** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it generate a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (measurement metrics, decision-making authority, time horizon) apply?
3. **Dependency difference**: Does it depend on different stakeholders/departments/external systems, or do different stakeholders/departments/external systems depend on it?

Examples:
- "Market penetration strategy" and "market development strategy" are justified as separate classifications because different constraints (existing market vs. new market) and different dependencies (existing customer base vs. new channels) apply.
- If "customer retention strategy" and "customer loyalty strategy" share the same KPIs (churn rate, repurchase rate) and the same target (existing customers), they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the specific application cases in the business domain.

### onto_pragmatics boundary

- onto_conciseness: Does an unnecessary element **exist**? (structural level)
- onto_pragmatics: Does unnecessary information **hinder** query execution? (execution level)
- Example: Unused metrics included in a decision-making report -> onto_pragmatics. An empty classification with no mapped business activities defined in the system -> onto_conciseness.

### onto_coverage boundary

- onto_conciseness: Does something exist that should not? (reduction direction)
- onto_coverage: Is something missing that should exist? (expansion direction)
- Example: Only revenue model is defined with no cost structure -> onto_coverage. Revenue model is duplicated with different definitions in strategy/operations/marketing -> onto_conciseness.

### onto_logic boundary (predecessor/successor relationship)

- onto_logic predecessor: determines logical equivalence (entailment)
- onto_conciseness successor: decides whether to remove after equivalence is confirmed
- Example: The superior competitive strategy ("differentiation") entails the subordinate marketing strategy ("premium positioning") -> onto_logic determines equivalence -> onto_conciseness determines "subordinate redeclaration is unnecessary."

### onto_semantics boundary (predecessor/successor relationship)

- onto_semantics predecessor: determines semantic identity (synonym status)
- onto_conciseness successor: decides whether merging is needed after synonym confirmation
- Example: "Churn Rate" in Korean and "Churn Rate" in English are the same concept -> onto_semantics determines they are synonyms -> onto_conciseness determines "consolidate to a single canonical term." However, "financial risk" and "operational risk" are homonyms with different meanings — onto_semantics determines "distinct concepts" -> onto_conciseness does not intervene.

---

## 5. Quantitative Criteria

Observed thresholds from the domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — term definitions, synonym mappings, homonym lists (semantic criteria for redundancy determination)
- `structure_spec.md` — structural requirements for business systems (structural removal criteria)
- `competency_qs.md` — competency question list (criteria for "actual difference" in minimum granularity determination)
- `dependency_rules.md` — source of truth management rules (basis for allowing reference copies)
- `logic_rules.md` — financial logic, strategy logic, and automation scope rules (criteria for logical equivalence determination)
