# Ontology Domain — Dependency Rules

## Inter-Class Dependencies

- is-a relation graph: acyclic (DAG). Cyclic inheritance is a logical contradiction (A is-a B, B is-a A -> A and B must be identical)
- part-of relation: acyclic in principle. A part-of B, B part-of A implies the same entity, which is a contradiction
- depends-on relation: acyclicity is recommended, but when mutual dependency is intentional, it must be explicitly declared with initialization/interpretation order defined

## Direction Rules

- Subclass -> Superclass: the subclass depends on the superclass (inheritance). Changes to the superclass affect subclasses
- Property -> Domain/Range class: the property depends on the class. Deleting the class invalidates the property
- Instance -> Class: the instance depends on the class. Deleting the class leaves the instance unclassified
- External ontology import -> Internal ontology: depends on the imported external concepts. Changes to the external ontology affect the internal ontology

## Inter-Ontology Dependencies

- When importing an external ontology via owl:imports, all imported axioms are combined with internal axioms. Unintended inferences may occur
- The version of the external ontology must be pinned. If not pinned, external changes may destroy internal consistency
- Mapping (alignment) and import are different. Mapping declares correspondence relations and does not integrate axioms. Import integrates axioms
- Circular imports (A imports B, B imports A) may cause infinite recursion or reasoner errors and are prohibited

## Inter-Property Dependencies

- Inverse relations: hasAuthor <-> isAuthorOf. Changing one side requires updating the other
- Sub-properties (subPropertyOf): instances of the sub-property are also instances of the super-property
- Property chains: a property that shortcuts A -> B -> C. Depends on each constituent property of the chain
- Dependencies among complex properties propagate change impacts, so it must be possible to derive the list of affected properties upon change

## Referential Integrity

- Classes declared as domain/range of properties must exist in the ontology
- External ontologies referenced via owl:imports must be accessible
- Classes and properties referenced by instances must be defined in the TBox
- External concepts (URIs) referenced in mappings must actually exist in the target ontology
- Other concepts/instances referencing deprecated concepts must be identified

## Source of Truth Management

- Source of truth for class/property definitions: TBox. ABox (instances) is subordinate to TBox
- When the ontology reuses external standards (Dublin Core, SKOS, etc.), those standards are the source of truth. Their semantics must not be redefined internally
- When two mapped ontologies have different definitions for the same concept, the mapping document must specify which takes precedence
- When natural language definitions and formal definitions are inconsistent, the formal definition is the source of truth for reasoning and verification. Natural language is for conveying intent

## External Dependency Management

- When using standard ontologies (RDFS, OWL, SKOS, Dublin Core), specify namespace and version
- Change detection for external ontologies: based on version URI or changelog
- A response plan is needed for when external ontologies are deprecated
- License compatibility: the license of the external ontology must be compatible with the internal ontology's distribution/modification terms

## Related Documents
- concepts.md — definitions of relation types, mapping, and version management terms
- structure_spec.md — class hierarchy and namespace rules
- logic_rules.md — classification logic, reasoning logic, and constraint conflict checking
