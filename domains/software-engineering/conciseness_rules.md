---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Conciseness Rules (software-engineering)

This document contains the domain-specific rules referenced by onto_conciseness during conciseness verification.
It is organized in the order: **type (allow/remove) -> verification criteria -> role boundary -> measurement method**.

---

## 1. Allowed Redundancy

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Redundancy that, if removed, would break the system. Must be retained.
- **[MAY-ALLOW]**: Redundancy maintained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### State Management

- [MUST-ALLOW] Multiple definitions of terminal state — transition events, projector branches, and allowed subsequent event lists each reference the state. Removing any one makes state transition consistency verification impossible.
- [MUST-ALLOW] In Event Sourcing systems, where the event schema and projection logic express the same domain fact in different formats. Events are immutable records and cannot be consolidated with projections.

### Source of Truth Related

- [MUST-ALLOW] When the source of truth resides in an external system, maintaining an internal reference copy (cache, synchronization copy). Removal makes external dependency tracking impossible.
- [MAY-ALLOW] Redefining external API schemas as internal types. Retain if the purpose is to isolate from external changes; remove if it is a simple copy.

### Contracts and Interfaces

- [MUST-ALLOW] Bilateral redeclaration of interface contracts — provider (server) and consumer (client) each define the contract. Removal makes independent verification impossible.
- [MAY-ALLOW] Error paths and happy paths describing the same data in different contexts. Retain for readability purposes; consolidate if completely redundant.

### Cross-cutting Concerns

- [MAY-ALLOW] Cross-cutting concerns (security, logging, authentication) appearing in multiple modules. Allowed under the separation of concerns (SoC) principle, but copy-paste of identical logic is a removal target.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Redundancy whose very existence causes errors or leads to incorrect reasoning.
- **[SHOULD-REMOVE]**: Redundancy that is not highly harmful but adds unnecessary complexity.

### Relationship Redundancy

- [MUST-REMOVE] Multiple-path expression of the same relationship — when A->B and A->C->B have the same meaning, retain only one path. Maintaining both causes inconsistency due to missed updates.
- [MUST-REMOVE] Subordinate redeclaration already guaranteed by a superordinate constraint — if the superordinate interface guarantees non-null, the subordinate implementation's redeclaration is unnecessary.

### Classification Redundancy

- [SHOULD-REMOVE] Intermediate hierarchy node with only 1 child — has no classification value, so merge with parent.
- [SHOULD-REMOVE] Classification node with no instances — remove empty classifications with no actual data. However, retain if reserved for future extension (see extension_cases.md).

### Definition Redundancy

- [MUST-REMOVE] Duplicate definition of the same concept under different paths/names — determine based on the synonym mapping in concepts.md.
- [SHOULD-REMOVE] Same verification logic copied across multiple modules — needs extraction into a common module.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only when it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (cardinality, type, range) apply?
3. **Dependency relationship difference**: Does it depend on different modules/systems, or do different modules/systems depend on it?

Examples:
- `HttpError` and `ValidationError` are justified as separate classifications because different constraints apply (HTTP status code vs field list).
- `InternalServerError` and `UnexpectedError` are merge candidates if they follow the same processing logic.

---

## 4. Boundaries — Domain-specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the concrete application cases in the software-engineering domain.

### onto_pragmatics Boundary

- onto_conciseness: Does an unnecessary element **exist**? (structural level)
- onto_pragmatics: Does unnecessary information **hinder** query execution? (execution level)
- Example: Unused fields included in API response -> onto_pragmatics. Unused entity defined in schema -> onto_conciseness.

### onto_coverage Boundary

- onto_conciseness: Does something that should not exist, exist? (reduction direction)
- onto_coverage: Does something that should exist, not exist? (expansion direction)
- Example: Security/authentication exists but authorization system is undefined -> onto_coverage. Authentication and authorization are redundantly defined in the same module -> onto_conciseness.

### onto_logic Boundary (predecessor/successor relationship)

- onto_logic precedes: determines logical equivalence (entailment)
- onto_conciseness follows: determines whether to remove after equivalence is confirmed
- Example: Superordinate interface's constraint entails subordinate implementation's constraint -> onto_logic determines equivalence -> onto_conciseness rules "subordinate redeclaration unnecessary."

### onto_semantics Boundary (predecessor/successor relationship)

- onto_semantics precedes: determines semantic identity (synonym status)
- onto_conciseness follows: determines merge necessity after synonym is confirmed
- Example: user/account/member are the same concept -> onto_semantics determines synonymy -> onto_conciseness rules "consolidate to one canonical term."

---

## 5. Quantitative Criteria

Domain-observed thresholds are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — term definitions, synonym mappings, homonym list (semantic criteria for redundancy determination)
- `structure_spec.md` — isolated node rules, required relationship requirements (structural removal criteria)
- `competency_qs.md` — competency question list (criteria for "actual difference" in minimum granularity judgment)
- `dependency_rules.md` — source of truth management rules (basis for allowing reference copies)
- `logic_rules.md` — constraint conflict detection rules (criteria for logical equivalence determination)
