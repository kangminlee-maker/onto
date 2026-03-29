---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Ontology Domain — Logic Rules

## Classification Logic

- A subclass inherits all required properties and constraints of the superclass. Relaxing a superclass's constraints in the subclass is a violation of the is-a relation
- Classification criteria at the same hierarchy level must be singular. Mixing functional and structural classification at the same level causes cross-classification
- A set of subclasses declared as a Disjoint Union must be (1) mutually exclusive and (2) completely partition the superclass. Satisfying only one condition is incomplete
- When multiple inheritance is allowed, a conflict resolution rule for diamond inheritance (A->B, A->C, B->D, C->D) must be specified for property conflicts

## Constraint Logic

- Domain/range constraints determine the direction of inference. In OWL, a domain declaration triggers the inference that "if this property is used, the subject belongs to that class." This is classification, not validation
- In cardinality constraints, the min/max combination must be logically satisfiable. min > max is a logical contradiction that destroys consistency
- Under OWL's Open World Assumption, "a property has no value" is different from "it is confirmed that the property has no value." If reasoning about absence is needed, switch to Closed World or use SHACL
- Defining an enumeration constraint without a Closure Axiom allows the reasoner to assume that additional unstated values may exist

## Reasoning Logic

- Transitivity: if part-of is transitive, then A part-of B, B part-of C -> A part-of C. However, not all part-of relations are transitive (e.g., whether "finger part-of hand part-of person" implies "finger part-of person" is context-dependent)
- Symmetry: it must be stated whether "A is related to B" implies "B is related to A." sibling-of is symmetric; parent-of is asymmetric
- When a reasoner detects inconsistency, the axioms causing the inconsistency must be isolated to a minimal unsatisfiable subset for correction to be possible
- When inference results differ from intent, it must be distinguished whether the axiom is wrong or the intent is wrong. Formal correctness and semantic correctness are separate concerns

## Naming Logic

- Multiple labels may exist for the same concept. However, one URI must refer to exactly one concept (URI uniqueness)
- Homonyms (same name, different meaning) must be separated into distinct URIs, each with a scope specified
- Inconsistency between natural language labels and formal URIs causes consumer confusion. When a label changes, the URI is retained but the change history is recorded

## Constraint Conflict Checking

- When two axioms constrain the same class in different directions, it is a conflict (e.g., "A must be a subclass of B" + "A is disjoint with B")
- When superclass constraints and subclass constraints are contradictory, it is an inconsistency
- When a mapped external ontology's constraints conflict with the internal ontology's constraints, the mapping itself is a logical error
- When combining different ontology types (e.g., Axiom-based + Taxonomy), the assumptions of each type (OWA vs CWA) must be verified to not conflict

## Related Documents
- concepts.md — definitions of axioms, reasoners, relation types, and other terms
- dependency_rules.md — inter-ontology dependencies and mapping rules
- competency_qs.md — Q12~Q15 (constraint/reasoning verification questions)
