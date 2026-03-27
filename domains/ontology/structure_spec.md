# Ontology Domain — Structure Specification

## Ontology Structure Required Elements

- **Namespace**: A URI/IRI space for uniquely identifying entities within the ontology. Prevents conflicts with external ontologies
- **Class Hierarchy**: A tree or DAG structure of classes organized by is-a relations
- **Property Definitions**: Lists of Object Properties and Data Properties, with their respective domains/ranges/characteristics
- **Constraint Declarations**: Formal rules including axioms, cardinality constraints, disjoint declarations, etc.
- **Metadata**: Information about the ontology itself, including creator, version, license, and scope

## Required Relations

- Every class must have at least 1 property or relation (empty classes are prohibited)
- Every property must have its domain and range specified
- Every instance must belong to at least 1 class (rdf:type is required)
- Root classes (excluding owl:Thing) in the class hierarchy must represent the top-level domain concepts of the ontology

## Hierarchy Structure Principles

- Superclass (general) -> Subclass (specific): the direction of specialization. Subclasses inherit superclass properties/constraints
- When a subclass redefines (overrides) a superclass property, only constraint tightening is allowed. Constraint relaxation is an is-a violation
- When hierarchy depth is 7 or more, the necessity of intermediate classes should be reviewed. Excessive depth makes navigation and maintenance difficult
- Sibling classes must be distinguished by the same classification criterion

## Classification Criteria Design

- Classification axes (dimensions) must be explicitly declared (e.g., "by type," "by function," "by lifecycle")
- Only a single classification axis is used at the same hierarchy level. If multiple axes are needed, separate into distinct hierarchies or properties
- Both completeness (exhaustive) and exclusiveness (mutually exclusive) of classification must be stated. MECE (Mutually Exclusive, Collectively Exhaustive) is the default, but intentional incompleteness is allowed if stated
- When classification criteria change over time (e.g., technology classification), a change procedure must be defined

## Naming Conventions

- Class names: PascalCase or domain convention. Use singular form (e.g., Person, not Persons)
- Property names: camelCase. Express the direction of the relation (e.g., hasAuthor, isPartOf)
- URI: human-readable form recommended. Meaningless IDs (auto-increment) should be avoided
- Natural language labels (rdfs:label): required for all classes/properties. Use language tags (@ko, @en) for multilingual support

## Verification Structure

- Syntactic verification: parsing verification that the ontology file is in valid OWL/RDF format
- Structural verification: detecting structural defects such as empty classes, isolated nodes, and unspecified domain/range
- Logical verification: consistency checking via reasoners, detecting unsatisfiable classes
- Semantic verification: expert review of whether natural language definitions match formal representations. Outside the scope of automation

## Isolated Node Prohibition

- A class not participating in any relation -> warning (isolated class)
- A leaf class with no instances and no subclasses -> warning (unused concept)
- A property not referenced in any domain/range -> warning (unused property)
- An instance not belonging to any class -> warning (unclassified instance)

## Related Documents
- concepts.md — definitions of classes, properties, namespaces, and other terms
- dependency_rules.md — inter-ontology dependencies and mapping-related rules
- competency_qs.md — Q1~Q3 (entity definition), Q8~Q11 (classification consistency questions)
