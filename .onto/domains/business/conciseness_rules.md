---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Conciseness Rules (business)

This document defines the business-domain rules used by conciseness.
It controls where repetition is necessary, where it becomes harmful, and which thresholds should trigger consolidation review.

## 1. Allowed Redundancy

Each rule is tagged with a severity level:
- **[MUST-ALLOW]**: Removing the redundancy would break inference, traceability, or execution.
- **[MAY-ALLOW]**: The redundancy may remain when it serves a clearly different review purpose.

### Performance and Measurement

- [MUST-ALLOW] Leading and lagging indicators for the same objective appearing together. Removing either side breaks the causal interpretation of performance.
- [MUST-ALLOW] Balanced Scorecard perspectives referring to the same KPI from different lenses. The perspectives are not duplicates because they support different judgments.
- [MAY-ALLOW] The same metric appearing in `concepts.md §Benchmark Registry` and a CQ verification criterion, as long as the CQ cites the registry rather than redefining the number.

### Strategy and Operating Translation

- [MUST-ALLOW] A strategic claim in `domain_scope.md` and the operating consequence in `logic_rules.md` or `structure_spec.md`. These are not duplicates because one declares scope and the other declares behavior.
- [MAY-ALLOW] A revenue model appearing in both strategic and operational contexts when the strategic version explains choice and the operational version explains delivery mechanics.
- [MAY-ALLOW] The same case being referenced in both `extension_cases.md` and another file, provided only one file is the detailed owner and the others use it as a compressed anchor.

### Source of Truth and Reference Copies

- [MUST-ALLOW] An internal reference to an external authority such as a legal rule, accounting output, or benchmark source. Without the reference copy, the business domain loses reviewability.
- [MUST-ALLOW] A benchmark value in `concepts.md §Benchmark Registry` and a qualitative interpretation of that benchmark in `logic_rules.md`. Numeric authority and business interpretation are different functions.
- [MAY-ALLOW] The same stakeholder appearing under governance and ESG if one reference concerns control ownership and the other concerns impact ownership.

### Modern Business Patterns

- [MUST-ALLOW] A platform metric in both platform logic and governance analysis when the first explains economics and the second explains participant fairness or enforcement.
- [MUST-ALLOW] Subscription metrics in both finance and customer-management contexts when one explains unit economics and the other explains retention operations.
- [MUST-ALLOW] AI concepts appearing in economic and governance contexts when one explains value capture and the other explains control obligations.

## 2. Removal Target Patterns

Each rule is tagged with a severity level:
- **[MUST-REMOVE]**: The duplication itself creates wrong inferences or conflicting authority.
- **[SHOULD-REMOVE]**: The duplication adds complexity without adding a distinct review function.

### Relation Redundancy

- [MUST-REMOVE] Multiple causal chains that express the same business rule with no extra decision value. If both can change independently but should not, one should be removed.
- [MUST-REMOVE] A subordinate tactic restated as if it were an independent strategy when it is already entailed by the superior strategic choice.
- [SHOULD-REMOVE] Parallel lists of "important factors" that have the same members and no different ownership, threshold, or CQ impact.

### Classification Redundancy

- [SHOULD-REMOVE] Intermediate classifications with only one child and no distinct CQ, dependency, or constraint effect.
- [SHOULD-REMOVE] Separate classifications for labels that differ only in wording but not in review behavior.
- [SHOULD-REMOVE] Scale distinctions that do not change review behavior. If Micro, Small, Mid, or Large labels do not alter the rule, keep the rule at the broader level.

### Definition Redundancy

- [MUST-REMOVE] Competing definitions of the same metric, concept, or benchmark under different sections.
- [MUST-REMOVE] Re-stating a benchmark number outside `concepts.md §Benchmark Registry` without a reference back to the canonical source.
- [SHOULD-REMOVE] Re-explaining a concept in multiple files when the downstream file only needs to apply the concept.

### Case Redundancy

- [MUST-REMOVE] The same company case explained in detail in two or more files with no declared primary owner.
- [SHOULD-REMOVE] Multiple cases used to prove the same exact logic when one case already anchors the behavior and the others add no new boundary condition.
- [SHOULD-REMOVE] Extension cases that only restate existing CQ wording without adding a change event, impact pattern, or affected-file path.

## 3. Minimum Granularity Criteria

A sub-classification is justified only if it satisfies at least one of the following:

1. **Competency-question difference**: It changes the answer or evaluation path for at least one CQ in `competency_qs.md`.
2. **Constraint difference**: It introduces different metrics, thresholds, authorities, or time horizons.
3. **Dependency difference**: It changes which teams, systems, or stakeholders depend on the concept.

Examples:
- Platform governance and corporate governance remain separate because they change different authorities and CQ paths.
- Churn and NRR remain separate because both relate to retention but diagnose different economic behavior.
- If two customer-segmentation labels lead to the same target, same metrics, and same execution path, they should be merged.

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for general boundary definitions is `roles/conciseness.md`. This section only states the business-domain-specific edge cases.

### pragmatics boundary

- conciseness asks whether an element should exist at all.
- pragmatics asks whether the current amount or placement of information prevents effective use.
- Example: a dashboard with too many KPIs but still structurally legitimate is a pragmatics issue. Three different definitions of CAC is a conciseness issue.

### coverage boundary

- conciseness removes unjustified duplication.
- coverage adds missing concerns, rules, or CQ anchors.
- Example: missing supply-chain risk logic is coverage. Repeating the same supply-chain rule across three files is conciseness.

### logic boundary

- logic determines whether two statements are functionally equivalent or whether one entails the other.
- conciseness decides whether one of the equivalent statements should be removed after that equivalence is established.
- Example: if a premium position already entails premium pricing, a separate "use premium pricing" tactic may be removable.

### semantics boundary

- semantics determines whether two terms refer to the same concept.
- conciseness decides whether multiple names for that concept should be consolidated.
- Example: "recurring revenue retention" and "NRR" may be the same concept. "financial risk" and "model risk" are not.

## 5. Quantitative Criteria

These thresholds trigger consolidation review. They do not force deletion automatically, but they require an explicit owner or exception rationale.

| Criterion | Threshold | Review Action |
|---|---|---|
| Same detailed case appearing in multiple files | 2+ files with 3+ sentences each | Require a declared primary owner and compress other mentions |
| Intermediate classification with one child | 1 child | Merge unless the child changes CQ, dependency, or authority behavior |
| Empty classification | 0 concrete instances or no landing rule | Remove or mark as reserved for future extension |
| CQ duplication | Same target, same reasoning path, same pass/fail behavior | Merge or justify distinct scope |
| Benchmark duplication outside registry | 1+ uncited repeated numeric definitions | Replace with a reference to `concepts.md §Benchmark Registry` |
| Repeated threshold across CQ sections | 2+ CQ sections using the same threshold with different formulas | Normalize formula and designate one canonical interpretation |
| Same business pattern transferred across cases with no new boundary condition | 2+ cases | Merge into one stronger case or state the new boundary condition |
| Scale-specific rule with no changed review behavior | 1 occurrence is enough | Collapse to the broader rule and remove tier-specific wording |

## Related Documents

- `concepts.md §Benchmark Registry` and `concepts.md §Homonyms Requiring Attention` — canonical numeric authority and concept-boundary checks used in duplication review
- `structure_spec.md §Business System Required Elements` and `structure_spec.md §Authority and Responsibility Separation` — structural elements used to detect unjustified duplication of roles, systems, or hierarchies
- `competency_qs.md §4. Revenue and Cost Structure (CQ-RC)` and `competency_qs.md §13. Scalability and Adaptation (CQ-SC)` — CQ sections used to test whether a distinction creates a real verification difference
- `dependency_rules.md §Source of Truth Management` and `dependency_rules.md §Platform Dependency Chains` — authority and dependency rules that justify some reference copies
- `logic_rules.md §Constraint Conflict Checking` and `logic_rules.md §Transfer Patterns` — rule sections used to test whether repeated statements are actually distinct or just rephrasings
