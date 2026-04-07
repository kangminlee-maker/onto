---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Conciseness Rules (market-intelligence)

This document contains the domain-specific rules that conciseness references during conciseness verification.
It is organized in the order of **type (allow/remove) → verification criteria → role boundaries → measurement method**.

---

## 1. Allowed Duplication

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Duplication that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Duplication retained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Market Size Estimation

- [MUST-ALLOW] TAM/SAM/SOM 3-tier estimation — TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) each narrow the scope and use different preconditions and calculation logic. They target the same market but are not duplicates; they represent a scope-narrowing relationship. Removing any one collapses the hierarchical structure of market size estimation.

### Data References Between Analysis and Strategy

- [MUST-ALLOW] Competitive Landscape Analysis and SWOT analysis referencing the same data — Competitive Landscape Analysis structures competitors' positions within the analysis area, while SWOT is used in the strategy derivation area as input for generating strategy options. They reference the same data but serve different purposes and belong to different areas. Consolidation would break the boundary between the analysis and strategy derivation areas.
- [MAY-ALLOW] PESTEL analysis results referenced separately in the analysis area and risk assessment area. They use the same macro-environment factor classification framework, but the application context differs (trend identification vs risk identification). Only consolidation-worthy when they restate completely identical conclusions.

### Multi-Point Credibility Rating References

- [MUST-ALLOW] Data source credibility ratings referenced separately in collection policy, analysis input verification, and decision gates — The multi-point consistency verification required by logic_rules.md ST01~ST03 demands that each reference point independently uses the rating values. Consolidating to a single point would make cross-verification of consistency impossible.

### Risk Assessment Independent Path

- [MUST-ALLOW] Risk factors referenced from both strategy options and analysis results — Risk assessment is an independent area parallel to strategy derivation (domain_scope.md). The risk factor → strategy option path and the analysis result → strategy option path are structurally independent; merging them would violate the independence of risk assessment.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Data Source Classification

- [MUST-REMOVE] Data sources without credibility rating classification — Data sources without a credibility rating are prohibited from being fed into analysis (logic_rules.md ST03). Data sources existing in the system without a rating assigned contaminate the credibility propagation chain and must be removed until a rating is assigned.
- [SHOULD-REMOVE] Data sources that register the same raw data under different names — Determined by the synonym mapping in concepts.md. Duplicate registration can cause credibility rating inconsistencies.

### Risk Assessment

- [MUST-REMOVE] Standalone risk items without strategy options placed in the strategy derivation area — Risk assessment is an independent area. If a risk item not linked to a strategy option exists in the strategy derivation area, it violates the area boundary. The item should be moved to the risk assessment area, or if it is a risk item without a response strategy, a response should be designed before retaining it.
- [SHOULD-REMOVE] Risk items without a risk response strategy — A state where a risk factor is identified but no response (avoidance/mitigation/acceptance/transfer) is designed is an incomplete item. Either complete the response design, or if it is intentionally accepted, explicitly classify it as "acceptance."

### Relationship Duplication

- [MUST-REMOVE] Multiple path representations of the same relationship — When analysis result → strategy option and analysis result → decision gate → strategy option carry the same meaning, retain only one path. Maintaining both causes inconsistencies due to missed updates.
- [MUST-REMOVE] Redundant lower-level re-declarations already guaranteed by higher-level constraints — There is no need to re-declare credibility constraints at individual analysis items when the credibility propagation rules (TP01~TP03) already guarantee them.

### Classification Duplication

- [SHOULD-REMOVE] Intermediate hierarchy nodes with only 1 child — If only a single sub-segment exists under a segment, it has no classification significance and should be merged with the parent.
- [SHOULD-REMOVE] Classification nodes with no instances — Empty segments or risk classifications with no actual data should be removed. However, if reserved for future extension (see extension_cases.md), they may be retained.

### Definition Duplication

- [MUST-REMOVE] Duplicate definitions of the same concept under different paths/names — Determined by the synonym mapping in concepts.md.
- [SHOULD-REMOVE] The same analysis methodology copied across multiple segments without preconditions — Extraction into a common methodology is needed.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (credibility rating, collection frequency, risk threshold) apply?
3. **Dependency difference**: Does it depend on different areas/entity types, or do different areas/entity types depend on it?

Examples:
- TAM and SAM have different preconditions (total market vs accessible range) and calculation logic, so the classification is justified.
- If "Competitor A's market share" and "Competitor A's revenue-based scale" follow the same analysis logic, they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/conciseness.md`. This section describes only the specific application cases in the market-intelligence domain.

### pragmatics Boundary

- conciseness: Does an unnecessary element **exist**? (structural level)
- pragmatics: Does unnecessary information **impede** query execution? (execution level)
- Example: An analysis report includes unused segment data → pragmatics. An unused segment is defined in structure_spec.md → conciseness.

### coverage Boundary

- conciseness: Is there something that should not be there? (reduction direction)
- coverage: Is there something missing that should be there? (expansion direction)
- Example: The risk assessment area exists but risk response types are not defined → coverage. The same risk factor is duplicately defined in both the risk assessment and strategy derivation areas → conciseness.

### logic Boundary (preceding/following relationship)

- logic precedes: Determines logical equivalence (implication)
- conciseness follows: Decides whether to remove after equivalence is confirmed
- Example: The credibility propagation rule (TP01) already guarantees a constraint that is re-declared at a lower-level analysis item → logic determines equivalence → conciseness determines "lower-level re-declaration unnecessary."

### semantics Boundary (preceding/following relationship)

- semantics precedes: Determines semantic identity (synonym status)
- conciseness follows: Decides whether merging is needed after synonym is confirmed
- Example: "market share" and "market share" (different language terms) are the same concept → semantics determines synonym → conciseness determines "consolidate into one canonical term."

---

## 5. Quantitative Criteria

Thresholds observed in this domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — Term definitions, synonym mappings, homonym list (semantic criteria for duplication determination)
- `structure_spec.md` — Entity types, traits, relationship structure (structural-perspective removal criteria)
- `competency_qs.md` — Competency question list (criteria for judging "actual difference" in minimum granularity)
- `dependency_rules.md` — Inter-area dependency relationships and independence rules (basis for allowing reference copies)
- `logic_rules.md` — Credibility consistency and propagation rules (criteria for logical equivalence determination)
