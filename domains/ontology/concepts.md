---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Ontology Domain — Concept Dictionary and Interpretation Rules

## Basic Component Terms

- Class = a set of entities sharing the same characteristics. Formally represents a concept in an ontology
- Instance = an individual entity belonging to a class. Also called an Individual
- Property = describes characteristics of an entity. Divided into Object Property (relations between entities) and Data Property (data values of entities)
- Relation = a semantic connection between two entities. Has directionality, cardinality, and inverse relations
- Axiom = a statement declared as true in an ontology. The foundation for reasoning

## Relation Type Terms

- is-a (subclass-of) = superclass/subclass classification relation. The subclass inherits all characteristics of the superclass
- part-of (mereological) = part-whole relation. The compositional relationship between whole and parts. May or may not be transitive
- has-property = property possession relation. An entity has a specific property value
- depends-on = dependency relation. The existence or definition of one entity depends on another
- equivalent-to = equivalence relation. Two classes or properties are semantically identical
- disjoint-with = disjointness relation. Two classes cannot have common instances

## Constraint-Related Terms

- Domain = the subject class to which a property applies. "What class of entities does this property apply to?"
- Range = the class or data type that can be a property's value. "What can be the value of this property?"
- Cardinality = a constraint on the number of entities participating in a relation. min, max, exact
- Closure Axiom = a constraint that only what is stated is true. The opposite of the Open World Assumption
- Disjoint Union = subclasses are mutually exclusive and completely partition the superclass

## Ontology Design Terms

- TBox = Terminological Box. The set of class and property definitions. Corresponds to a schema
- ABox = Assertional Box. The set of instances and their relations. Corresponds to data
- Open World Assumption (OWA) = what is not stated is not false but unknown. The default assumption in OWL
- Closed World Assumption (CWA) = what is not stated is false. The default assumption in databases
- Reasoner = software that derives implicit knowledge based on axioms. Performs consistency checking and classification inference
- Ontology Alignment = the task of establishing correspondence between concepts in different ontologies

## Version Management Terms

- Deprecation = notice that a concept/relation will be maintained but removed in the future. A replacement concept must be specified
- Backward Compatible = existing instances and queries work without modification
- Breaking Change = a change that breaks existing instances or queries (class deletion, constraint tightening, etc.)

## Homonyms Requiring Attention

- "property": OWL Object Property (inter-entity relation) ≠ OWL Data Property (data value) ≠ programming property (field/attribute)
- "class": ontology class (concept set) ≠ programming class (code structure)
- "instance": ontology instance (individual entity) ≠ programming instance (object)
- "domain": ontology domain (property's domain) ≠ business domain (business area) ≠ DDD domain
- "type": ontology type (rdf:type, class membership) ≠ programming type (data type)
- "schema": ontology schema (TBox) ≠ DB schema ≠ JSON Schema ≠ Schema.org
- "constraint": ontology constraint (axiom/SHACL) ≠ DB constraint (CHECK, FOREIGN KEY) ≠ business rule

## Interpretation Principles

- The purpose of an ontology is not "to represent everything in the world" but "to provide a consistent semantic system within a specific scope." An ontology without scope cannot be completed
- OWL's Open World Assumption and the database's Closed World Assumption produce different inference results for the same data. If the difference in assumptions is not stated, verification results become ambiguous
- "A class exists" and "a class is correctly defined" are not the same. A class without properties/constraints/relations is an empty shell with only a name
- Formal representations (OWL, SHACL) and natural language definitions require separate verification. A formally correct axiom may differ from its intended meaning
- When classification criteria are mixed (e.g., functional and structural classification at the same level), cross-classification occurs and the classification system becomes incomplete

## Related Documents
- domain_scope.md — the scope definition where these terms are used
- logic_rules.md — rules related to axioms, reasoning, and constraints
- structure_spec.md — ontology structural design rules
