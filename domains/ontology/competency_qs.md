# Ontology Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.
The onto_pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **verification concern** — classified by the concern of questions that must be answered during ontology design review.

## Entity Definition

- Q1: Can all classes defined in the ontology be enumerated?
- Q2: Does each class have a natural language definition (label, comment)?
- Q3: Is the entity's unique identifier system (URI/IRI) applied consistently?

## Relation Structure

- Q4: Can we derive what relations exist between two classes?
- Q5: Are the domain and range of relations specified?
- Q6: Are the directionality and inverse relations defined?
- Q7: Are the logical characteristics of relations (transitive, symmetric, etc.) declared?

## Classification Consistency

- Q8: Are the classification criteria (axes) stated, and is a single criterion used within the same hierarchy level?
- Q9: Do subclasses satisfy all characteristics of their superclass? (Justification of the is-a relation)
- Q10: Are classes that should be mutually exclusive declared as disjoint?
- Q11: Is the classification system exhaustive? (Does every instance of a superclass belong to one of its subclasses?)

## Constraint Verification

- Q12: When required properties (minimum cardinality >= 1) are defined, do instances satisfy them?
- Q13: Are there no instances violating mutual exclusivity constraints (disjoint)?
- Q14: When domain/range constraints are declared, do actual instances comply?
- Q15: Is consistency maintained when a reasoner is executed?

## Scope and Purpose

- Q16: Is the ontology's scope explicitly stated?
- Q17: Are no out-of-scope concepts included? (Over-design detection)
- Q18: Are no core in-scope concepts missing? (Under-design detection)

## Interoperability

- Q19: When mapping/alignment with external ontologies is needed, are the correspondence relations specified?
- Q20: Are standard vocabularies (Dublin Core, SKOS, etc.) reused, or are they unnecessarily redefined?

## Change Readiness

- Q21: When adding new classes/properties, can pre-verification be performed to ensure no conflict with existing constraints?
- Q22: Are replacement paths specified for deprecated concepts?
- Q23: Has backward compatibility been assessed for version changes?

## Pragmatic Fitness

- Q24: Can the ontology actually execute the queries it targets?
- Q25: Does the reasoner return results within a reasonable time? (Computational complexity)

## Related Documents
- domain_scope.md — the upper-level definition of the areas these questions cover
- logic_rules.md — constraint/reasoning rules related to Q12~Q15
- structure_spec.md — structure/classification rules related to Q1~Q3, Q8~Q11
