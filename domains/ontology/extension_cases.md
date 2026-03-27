# Ontology Domain — Extension Scenarios

The onto_evolution agent simulates each scenario to verify whether the existing ontology structure breaks.

## Case 1: Adding a New Class

- Adding a new class to the existing classification system
- Verification: Is it consistent with the existing classification criteria (axes)? Does it implicitly introduce a new classification criterion?
- Verification: Are the disjoint relations with sibling classes maintained?
- Verification: Are the superclass's constraints semantically validly inherited by the new class?
- Verification: Are there existing instances that should be reclassified into the new class?
- Affected files: structure_spec.md (classification criteria, hierarchy structure), logic_rules.md (classification logic)

## Case 2: Adding Properties/Relations

- Adding a new property to an existing class, or a new relation between classes
- Verification: Is the new property's domain/range consistent with the existing class structure?
- Verification: Do cardinality constraints conflict with existing instances?
- Verification: Does running the reasoner produce unintended classifications or consistency errors?
- Affected files: logic_rules.md (constraint logic, reasoning logic), dependency_rules.md (inter-property dependencies)

## Case 3: External Ontology Integration

- Importing an external ontology or adding a mapping
- Verification: Is consistency maintained when external axioms are combined with internal axioms?
- Verification: Are there no namespace conflicts?
- Verification: Are the mapped concepts actually in an equivalence/subsumption relationship? (Formal mapping and semantic identity are separate concerns)
- Verification: Is the external ontology's license compatible?
- Affected files: dependency_rules.md (inter-ontology dependencies, external dependency management)

## Case 4: Constraint Tightening/Relaxation

- Changing cardinality of existing constraints (optional -> required), adding new disjoint declarations, changing domain/range
- Verification: When constraints are tightened, do existing instances violate the new constraints? (Breaking change detection)
- Verification: When constraints are relaxed, are unintended instances permitted?
- Verification: Is the scope of constraint changes propagated to subclasses understood?
- Affected files: logic_rules.md (constraint logic, constraint conflict checking), competency_qs.md (Q12~Q15)

## Case 5: Ontology Type Transition

- Transitioning from a lightweight ontology (Taxonomy, SKOS) to a formal ontology (OWL), or vice versa
- Verification: Has the information lost during the type transition (axioms, constraints) been identified?
- Verification: Have the inference differences resulting from assumption transitions (CWA->OWA or OWA->CWA) been analyzed?
- Verification: Do existing queries (SPARQL, etc.) still work under the new type?
- Affected files: domain_scope.md (ontology type classification), logic_rules.md (reasoning logic)

## Case 6: Scale Expansion

- 10x increase in number of classes, 100x increase in instances, increased relation complexity
- Verification: Is the reasoner's computational complexity within acceptable bounds? (Decidability of OWL DL and actual performance are different)
- Verification: Are hierarchy depth and breadth at navigable/maintainable levels?
- Verification: Is the structure modularizable (partitionable)? Does it only work as a single monolithic ontology?
- Affected files: structure_spec.md (hierarchy structure), competency_qs.md (Q25)

## Case 7: Multilingual/Multicultural Expansion

- Applying the ontology to a new language/cultural context
- Verification: Is multilingual support for natural language labels (language tags) structurally possible?
- Verification: Have concepts whose classification criteria differ by cultural context been identified?
- Verification: Are URIs language-independent? (Impact when URIs contain words from a specific language)
- Affected files: structure_spec.md (naming conventions), concepts.md (glossary)

## Related Documents
- structure_spec.md — class hierarchy, classification criteria, naming conventions
- dependency_rules.md — inter-ontology dependencies, inter-property dependencies
- logic_rules.md — classification logic, constraint logic, reasoning logic
