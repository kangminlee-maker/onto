---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Ontology Domain — Domain Scope Definition

This is the reference document used by onto_coverage to identify "what should exist but is missing" in ontology design.
This domain applies when **reviewing** an ontology (a knowledge structuring system).

## Ontology Type Classification

Classification axis: **organizing principle** — classified by the core principle through which an ontology organizes knowledge.

| Type | Core Principle | Representative Examples |
|---|---|---|
| Axiom-based | Rigorously defines inter-concept relations using formal logic and axioms | OWL DL, SUMO |
| Action-Centric | Describes the domain centered on actions and processes | PSL (Process Specification Language) |
| Knowledge Graph | Graph structure of entities and relations | Wikidata, Google Knowledge Graph |
| Domain-Driven | Structures expert knowledge of a specific domain | SNOMED CT, Gene Ontology |
| Taxonomy | Hierarchical classification system (centered on is-a relations) | Biological taxonomy, library classification |
| Schema | Defines data structures and constraints (for instance validation) | Schema.org, JSON-LD |

## Major Sub-areas

### Core
- **Entity Definition** (required): classes, instances, entity identification and definition. Naming conventions and unique identifier systems
- **Relation Definition** (required): types of relations between entities (is-a, part-of, has-property, depends-on, etc.), directionality and cardinality of relations
- **Constraint Definition** (required): axioms, invariants, domain/range constraints, cardinality constraints
- **Classification System** (required): superclass/subclass hierarchies, whether multiple inheritance is allowed, consistency of classification criteria
- **Glossary** (required): definitions of domain terms, synonym/homonym handling, multilingual labels

### Supporting
- **Meta Model** (when applicable): an upper ontology describing the structure of the ontology itself. Meta-level definitions of classes/properties/relations
- **Mapping/Alignment** (when applicable): concept correspondence between different ontologies. Equivalence, subsumption, and similarity relations
- **Version Management** (when applicable): ontology change history, cross-version compatibility, deprecation procedures
- **Query Interface** (when applicable): approaches for accessing the ontology via SPARQL, OWL API, etc.

### Application
- **Reasoning/Verification** (when applicable): consistency checking via reasoners, classification inference, instance validation
- **Visualization** (scale-dependent): graph visualization of ontology structure, exploration interfaces
- **Data Integration** (when applicable): semantic integration of heterogeneous data sources, ontology-based ETL

## Required Concept Categories

These are concept categories that must be addressed in any ontology.

| Category | Description | Risk if Missing |
|---|---|---|
| Entity identity | A system for uniquely identifying entities (URI, IRI, etc.) | Entity confusion, reference failure |
| Relation typing | Explicit classification of relation kinds and their meanings | Ambiguous relation semantics, inference errors |
| Constraint declaration | Explicit declaration of structural/semantic constraints | Invalid instance creation, consistency breakdown |
| Classification consistency | Classification criteria applied consistently across the entire system | Cross-classification, classification omissions |
| Change tracking | History of concept/relation additions, modifications, and deletions | Regressions, compatibility breakage |
| Application context | Explicit statement of the ontology's intended purpose and scope | Over-design or under-design |

## Reference Standards/Frameworks

| Standard | Application Area | Usage |
|---|---|---|
| OWL 2 (Web Ontology Language) | Constraint definition, reasoning/verification | Expression language for formal ontologies, reasoner support |
| RDFS (RDF Schema) | Relation definition, classification systems | Class/property definitions for lightweight ontologies |
| SKOS (Simple Knowledge Organization System) | Glossary, classification systems | Concept schemes, labels, hierarchical relation representation |
| SHACL (Shapes Constraint Language) | Constraint definition, instance validation | Data shape constraints and validation rules |
| Dublin Core | Meta model, glossary | Standard vocabulary for metadata elements |
| Ontology Design Patterns (ODP) | Structural design overall | Catalog of reusable design patterns |

## Bias Detection Criteria

- If the ontology is designed for only one of the 6 ontology types without stated rationale for the type selection -> **type bias**
- If entity definitions are rich but relation definitions are sparse -> **structural bias (entity overload)**
- If relation definitions are rich but constraint definitions are absent -> **unverifiable (constraint absence)**
- If only classification systems exist with no properties/relations -> **classification bias (Taxonomy trap)**
- If only formal representations exist with no natural language definitions -> **missing consumer perspective (machine bias)**
- If only natural language definitions exist with no formal constraints -> **unverifiable (informality bias)**

## Related Documents
- concepts.md — definitions of terms within this scope
- structure_spec.md — specific rules for ontology structure
- competency_qs.md — questions this scope must be able to answer
