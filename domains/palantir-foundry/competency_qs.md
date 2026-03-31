---
version: 4
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Competency Questions

A list of core questions that this domain's framework must be able to answer.

## CQ Classification System

### 2-Axis Classification

- **Axis 1 (Architecture Layer)**: CQ-SEM, CQ-KIN, CQ-DYN, CQ-DAT, CQ-X, CQ-AI
- **Axis 2 (Verification Purpose)**: `[T]` tag — orthogonal tag for transfer verification CQs

Example: `[P1] CQ-SEM-01 [T]` — Semantic Layer transfer verification question.

### Category Definitions

- **CQ-SEM**: Verifies that the Semantic Layer entities (Object Type, Property, Link Type, Interface, Enum) satisfy structural completeness and semantic correctness criteria
- **CQ-KIN**: Verifies that the Kinetic Layer operations (Action Type, Function) satisfy behavioral correctness and transactional integrity criteria
- **CQ-DYN**: Verifies that the Dynamic Layer policies (Permission, Marking, Workflow, Rule) satisfy governance and access control criteria
- **CQ-DAT**: Verifies that the Data Layer (Master, Transaction, Derived) and data integration infrastructure satisfy hierarchy, lineage, and integrity criteria
- **CQ-X**: Verifies cross-layer concerns that require judgment spanning 2+ layers and cannot be answered by combining single-layer sub-answers
- **CQ-AI**: Verifies that AI/LLM agent integration with the ontology satisfies authorization inheritance, context delivery (OAG), and human-in-the-loop governance criteria

### Inclusion/Exclusion Rules

- Single layer attribution possible -> that layer's category
- Must cross 2+ layers -> CQ-X
- **CQ-X test**: "Decompose into per-layer sub-questions. Can sub-answers be combined to answer the original? Yes -> not CQ-X. Requires additional inter-layer judgment -> CQ-X."
- AI/LLM agent authorization or context delivery -> CQ-AI
- AI combined with other layer concerns (e.g., AI + Marking propagation) -> if answerable within CQ-AI scope, keep in CQ-AI; if requires inter-layer judgment beyond AI, use CQ-X

### Priority Definitions

- `[P1]` Required: CQ unanswerable -> verification itself impossible
- `[P2]` Recommended: CQ unanswerable -> verification precision degraded
- `[P3]` Optional: CQ unanswerable -> no verification impact, for deepening only

### [T] Tag

- `[T]` marks CQs that verify transfer applicability of Foundry patterns to non-Foundry systems
- Input: `[관찰→참여]` content feeds [T] CQs
- [T] is not a standalone category but an orthogonal tag attachable to any layer's CQ

---

## CQ-SEM: Semantic Layer

Verifies that entities, attributes, and relationships are correctly defined with business meaning, structural completeness, and cross-type consistency.

- **CQ-SEM-01** [P1] Do all Object Types have primary_key, description, and data_source defined?
  -> structure_spec.md 'Object Type Required Elements'
- **CQ-SEM-02** [P1] Do Link Types between Object Types accurately reflect business meaning? Is the cardinality correct?
  -> structure_spec.md 'Link Type Required Elements'; logic_rules.md 'Link Type Rules'
- **CQ-SEM-03** [P1] [T] Is the distinction between Object Type (concrete, dataset-backed) and Interface (abstract, no dataset) correctly applied?
  -> concepts.md 'Semantic Layer Core Terms'; domain_scope.md 'Semantic Layer — Required'
- **CQ-SEM-04** [P2] For Properties shared across multiple Object Types, are they registered as Shared Properties when they share the same type, business meaning, and constraints?
  -> concepts.md 'Semantic Layer Core Terms'; conciseness_rules.md Section 1
- **CQ-SEM-05** [P2] Are Enum values mutually exclusive, and do they include all values currently used by the business?
  -> logic_rules.md 'Object Type Definition Rules'; concepts.md 'Semantic Layer Core Terms'
- **CQ-SEM-06** [P2] [T] Does each Object Type represent a business concept that persists beyond any single data source, not a raw table mapping?
  -> domain_scope.md 'Scope of Application'; concepts.md 'Interpretation Principles'
  Note: See also domain_scope.md 'Domain Identity Axiom' and Bias Detection "table-entity mapping trap".
  Inference path: Check Object Type origin — if derived from table/view name rather than business decision, suspect table-entity mapping. Verify against Domain Identity Axiom (domain_scope.md).
- **CQ-SEM-07** [P2] Does the Object Type's description and its properties describe the same subject?
  -> logic_rules.md 'Object Type Definition Rules'
- **CQ-SEM-08** [P3] [T] Is the Value Type 3-layer structure (base type + business metadata + validation constraints) applied consistently?
  -> concepts.md 'Semantic Layer Extended Terms'
- **CQ-SEM-09** [P1] Can every ontology change be classified into one of the four categories (non_breaking / breaking_minor / breaking_major / deprecation)?
  -> domain_scope.md 'Change Classification'; logic_rules.md 'Change Classification Rules'

---

## CQ-KIN: Kinetic Layer

Verifies that business operations are correctly formalized as executable, auditable Action Types and Functions.

- **CQ-KIN-01** [P1] [T] Are the major business operations defined as Action Types with parameters, preconditions, postconditions, and affected_object_types?
  -> structure_spec.md 'Action Type Required Elements'
- **CQ-KIN-02** [P1] Is business logic (calculations, transformations) separated into Functions? Is logic not mixed into Object Type definitions?
  -> structure_spec.md 'Function Required Elements'; concepts.md 'Kinetic Layer Core Terms'
- **CQ-KIN-03** [P2] [T] Are Action Types following the 2-tier design: declarative built-in rules as default, Function-Backed Actions as escape hatch?
  -> concepts.md 'Kinetic Layer Core Terms'; domain_scope.md 'Kinetic Layer — When Applicable'
- **CQ-KIN-04** [P2] Are Side Effect Rules (notifications, webhooks) declared in the Action definition, not embedded in application code?
  -> concepts.md 'Kinetic Layer Core Terms'; logic_rules.md 'Temporal and Ordering Rules'
- **CQ-KIN-05** [P2] [T] Is business logic isolated from the ontology platform via the DAO pattern, enabling unit testing with mock implementations?
  -> structure_spec.md 'Testing Structure'; concepts.md 'Kinetic Layer Core Terms'
- **CQ-KIN-06** [P2] [T] Is the Action Inbox pattern applied — decisions captured as Object Property changes and propagated to downstream processes?
  -> domain_scope.md 'Action Inbox Pattern'; concepts.md 'Kinetic Layer Core Terms'

---

## CQ-DYN: Dynamic Layer

Verifies that governance, access control, and automation policies are correctly defined and enforceable.

- **CQ-DYN-01** [P1] [T] Are Permissions defined per Object Type / Action Type using the three mechanisms (Object Security Policy, Property Security Policy, Action Permission)?
  -> structure_spec.md 'Permission Structure'; concepts.md 'Dynamic Layer Core Terms'
- **CQ-DYN-02** [P1] [T] Does Marking (mandatory access control) propagate automatically to derived resources — security travels with data?
  -> dependency_rules.md 'Marking Propagation Dependencies'; concepts.md 'Dynamic Layer Core Terms'
- **CQ-DYN-03** [P2] Are multi-step processes defined as Workflows with trigger conditions and action bindings?
  -> structure_spec.md 'Workflow and Rule Required Elements'; concepts.md 'Dynamic Layer Core Terms'
- **CQ-DYN-04** [P2] Are business rules requiring automation defined as Rules with event triggers?
  -> structure_spec.md 'Workflow and Rule Required Elements'; logic_rules.md 'Temporal and Ordering Rules'
- **CQ-DYN-05** [P2] [T] Is the Marking AND-logic vs Permission OR-logic interaction correctly understood and applied?
  -> logic_rules.md 'Marking AND Logic vs Permission OR Logic'
- **CQ-DYN-06** [P2] Is approval authority defined per change classification, and do changes with operational impact include executive approval?
  -> domain_scope.md 'Approval Authority'; logic_rules.md 'Governance Rules'

---

## CQ-DAT: Data Layer

Verifies that data hierarchy, integration infrastructure, and source-writeback separation satisfy integrity and traceability criteria.

- **CQ-DAT-01** [P1] Does every Object Type clearly belong to one of the Master / Transaction / Derived layers?
  -> domain_scope.md 'Data Layer Hierarchy'; concepts.md 'Data Classification Terms'
- **CQ-DAT-02** [P1] Do references flow only in the direction of lower layer (Master) -> upper layers (Transaction, Derived)?
  -> dependency_rules.md 'Data Layer Dependencies (Unidirectional, Reverse Prohibited)'; logic_rules.md 'Data Layer Rules'
- **CQ-DAT-03** [P1] [T] Is source data (Backing Dataset) and change data (Writeback Dataset) separated — source systems never directly modified?
  -> structure_spec.md 'Data Integration Structural Requirements'; concepts.md 'Platform Terms'
- **CQ-DAT-04** [P2] Does every Object Type declare at least one Backing Dataset? Is the choice between Backing Dataset and Virtual Table justified?
  -> structure_spec.md 'Data Integration Structural Requirements'; dependency_rules.md 'Referential Integrity'
- **CQ-DAT-05** [P2] Is Derived Data traceable back to source records in the Transaction and Master layers?
  -> logic_rules.md 'Data Layer Rules'
- **CQ-DAT-06** [P2] [T] Does data flow direction (forward) vs dependency direction (backward) remain correctly distinguished?
  -> dependency_rules.md 'Pipeline Data Flow vs Dependency Direction'
- **CQ-DAT-07** [P2] Does every data pipeline follow the Raw → Clean → Transform staging, with each stage independently verifiable?
  -> structure_spec.md 'Pipeline Quality Structure'; logic_rules.md 'Pipeline Quality Rules'
- **CQ-DAT-08** [P2] Do Dataset and Column names follow the naming conventions (snake_case, distinctive portion first, no abbreviations, no numeric increments)?
  -> structure_spec.md 'Pipeline Quality Structure'; logic_rules.md 'Pipeline Quality Rules'

---

## CQ-X: Cross-Layer

Verifies concerns that inherently span multiple layers, requiring inter-layer judgment beyond combining single-layer sub-answers.

- **CQ-X-01** [P1] [T] Does a codegen pipeline exist to detect the impact scope of schema changes across Semantic (type generation), Kinetic (Action parameter changes), and Dynamic (Permission invalidation) layers?
  -> structure_spec.md 'Codegen Output Structure (SSOT)'; dependency_rules.md 'Codegen Dependency Chain'; logic_rules.md 'Breaking Change Detection Logic'
- **CQ-X-02** [P1] Is the boundary between Shared Ontology and Private Ontology clear? Are cross-references made only through Interface / Shared Property?
  -> domain_scope.md 'Multi-Ontology Structure'; dependency_rules.md 'Dependencies Between Multiple Ontologies'; logic_rules.md 'Multi-Ontology Consistency Rules'
  Inference path: For each cross-ontology reference, verify it passes through Interface or Shared Property. Direct Object Type references across ontology boundaries indicate tight coupling. Check dependency_rules.md cross-ontology rules.
- **CQ-X-03** [P1] Can a new Private Ontology be added without changing the Shared Ontology?
  -> dependency_rules.md 'Dependencies Between Multiple Ontologies'; structure_spec.md 'Multi-Ontology Connection Structure'
- **CQ-X-04** [P2] [T] Are substitutes for the FDE role (domain translation, system building, user training) explicitly defined?
  -> domain_scope.md 'FDE (Forward Deployed Engineer) Operating Model'; concepts.md 'Governance Terms'
- **CQ-X-05** [P2] Does a Resource Status Lifecycle (Draft -> Experimental -> Stable -> Deprecated -> Retired) govern all ontology resources, with hierarchical cascade rules?
  -> logic_rules.md 'Resource Status Logic'; dependency_rules.md 'Resource Status Cascade Dependencies'
- **CQ-X-06** [P2] [T] When applying a Foundry pattern to a non-Foundry system, has the underlying problem (not the Foundry-specific solution) been verified to exist in the target context?
  -> concepts.md 'Transfer Considerations'; domain_scope.md 'Scope of Application'
  Inference path: Identify the [관찰→참여] pattern being transferred. Strip Foundry-specific implementation. Verify that the underlying problem exists in the target context independently. If the problem only exists because of Foundry's architecture, the transfer is invalid.
- **CQ-X-07** [P3] [T] Can Foundry's three-layer separation (Semantic/Kinetic/Dynamic) be mapped to the target system's architecture, including competitive platform equivalents?
  -> concepts.md 'Architecture Framework Terms'; domain_scope.md 'Three-Layer Architecture'; competitive_comparison.md 'Platform Comparison'
- **CQ-X-08** [P2] [T] Does the end-to-end pipeline (Source → Raw → Clean → Transform → Ontology binding → codegen → compile) pass without errors?
  -> structure_spec.md 'Testing Structure'; logic_rules.md 'Pipeline Quality Rules'
- **CQ-X-09** [P2] [T] Does the Schema-Type-UI pipeline ensure that ontology schema changes propagate as compile errors to UI components?
  -> structure_spec.md 'Frontend Integration Structure'; concepts.md 'Code Generation Terms'
- **CQ-X-10** [P2] [T] In a federated ontology, is a CDM defined with organization-owned IP, and are de-identification rules applied at the Property level?
  -> domain_scope.md 'Data Sharing and De-identification'; concepts.md 'Platform Terms'

---

## CQ-AI: AI/LLM Integration

Verifies that AI/LLM agent integration satisfies authorization, context delivery, and governance criteria.

- **CQ-AI-01** [P1] [T] Does the AI agent's data access scope equal the invoking user's access scope — Marking and Permission applied identically?
  -> logic_rules.md 'AI Agent Authorization Rules'; domain_scope.md 'AI Agent Permission Inheritance'
- **CQ-AI-02** [P1] [T] Are AI-proposed ontology changes routed through Branch Proposal (human review) before committing to Main?
  -> logic_rules.md 'AI Agent Authorization Rules'; domain_scope.md 'Human-in-the-Loop Governance'
- **CQ-AI-03** [P2] [T] Does the AI agent receive ontology objects (typed Properties, explicit Links) as context, not unstructured text documents?
  -> domain_scope.md 'Ontology-Augmented Generation (OAG)'; concepts.md 'AI/LLM Integration Terms'
- **CQ-AI-04** [P2] Are Action Type submission criteria (preconditions) enforced identically for AI agents and human users?
  -> logic_rules.md 'AI Agent Authorization Rules'; structure_spec.md 'Action Type Required Elements'

---

## Related Documents
- domain_scope.md — scope definitions that each CQ verifies against
- concepts.md — term definitions used in the questions
- structure_spec.md — structural required elements, codegen SSOT
- logic_rules.md — logic rules underlying the questions
- dependency_rules.md — dependency directions and propagation rules
- extension_cases.md — expansion scenarios that consume these CQs
- conciseness_rules.md — conciseness thresholds referenced by CQ-SEM
