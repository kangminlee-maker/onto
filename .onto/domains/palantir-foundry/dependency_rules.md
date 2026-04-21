---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Dependency Rules

Classification axis: **direction and strength** — dependencies classified by data/control flow direction and whether they are required or recommended.

### Notation
- `A → B` (or `A -> B`): A depends on B (B is prerequisite of A)
- `A <- B`: B depends on A (A is prerequisite of B)
- `A >> B`: data flows from A to B (direction of data movement)

## Data Layer Dependencies (Unidirectional, Reverse Prohibited)

- Master Data <- Transaction Data: Transaction references Master, but Master does not know about Transaction
- Transaction Data <- Derived Data: Derived Data aggregates Transaction, but Transaction does not know about Derived Data
- Master Data <- Derived Data: Derived Data may reference Master, but Master does not know about Derived Data
- If a reverse dependency occurs, a cycle is formed, and data update ordering cannot be guaranteed

## Soft vs Hard Dependencies Within the Semantic Layer

- Object Type -> Property: **Hard**. A Property belongs to exactly one Object Type (except Shared Property). Deleting the Object Type removes the Property
- Object Type -> Link Type: **Hard**. A Link Type depends on its source/target Object Types. Deleting an Object Type invalidates connected Link Types
- Object Type -> Interface: **Soft (recommended)**. Interface implementation is optional. Once declared, the Object Type must include all Properties defined by the Interface, but the decision to implement is not required
- Shared Property -> Object Type: **Hard (propagating)**. Changes to a Shared Property propagate to all referencing Object Types. Diamond dependency risk — if Object Types X and Y both reference Shared Property A and both affect the same aggregation, there is a double-counting risk

## Kinetic Layer -> Semantic Layer Dependencies

- Action Type -> Object Type: **Hard**. An Action changes the state of an Object. An Action Type cannot be defined without an Object Type
- Function -> Object Type: **Hard**. A Function uses Objects as inputs and outputs
- Ordering dependency between Action Types: If Action A's postcondition is Action B's precondition, then A -> B ordering dependency exists. Executing in reverse order violates the precondition

## Dynamic Layer -> Kinetic Layer Dependencies

- Workflow -> Action Type: A Workflow composes Actions sequentially/in parallel
- Rule -> Action Type: A Rule invokes an Action when a trigger condition is met
- Permission -> Object Type, Action Type: A Permission depends on the target (Object Type) and the action (Action Type)

## Dependencies Between Multiple Ontologies

- Private Ontology -> Shared Ontology: Domain-specific ontologies reference common entities
- Shared Ontology -> Private Ontology: Prohibited. If Shared references Private, the independence of the common layer is destroyed
- Private A -> Private B: Only indirect references through Interface are allowed. Direct references increase coupling, making independent changes impossible

## Pipeline Data Flow vs Dependency Direction

[관찰→참여] Data flow direction and dependency direction are opposite. Data flows forward; dependency points backward from consumer to source.

**Data flow** (forward): Source System >> Data Connection >> Sync >> Dataset >> Transform (Pipeline) >> Backing Dataset >> Object Type

**Dependency** (backward): Object Type depends on Backing Dataset → Pipeline output → source Dataset → Data Connection. When a source system changes, impact propagates forward along data flow. When a consumer requirement changes, the change request propagates backward along the dependency chain. Cross-reference: structure_spec.md "Data Integration Structural Requirements."

## Codegen Dependency Chain

[참여] Each stage depends on the output of the previous stage. For codegen implementation rules (file layout, naming, subset generation), see structure_spec.md "Codegen Output Structure (SSOT)" — this section defines dependency ordering only.

`ontology definition >> codegen >> generated types >> application code >> UI components`

- Generated types depend on ontology definition: re-running codegen is required when the definition changes
- Application code depends on generated types: compile check requires generated TypeScript types to exist
- Schema change at any stage produces compile errors in all downstream stages. (Ref: Palantir OSDK docs)

## Source of Truth Hierarchy

When multiple sources provide guidance on the same Foundry ontology design question, defer to the higher-priority source.

| Priority | Source | Authority Level |
|----------|--------|----------------|
| 1 | Foundry Ontology Manager (platform-defined schema, types, constraints) | Normative. Defines canonical entity definitions |
| 2 | OSDK Reference (generated type behavior, API contracts) | Binding specification for generated code behavior |
| 3 | Palantir official documentation (architecture guides, best practices) | Informative guidance. Recommended but not binding |
| 4 | Internal conventions (project naming rules, team modeling decisions) | Local authority. Must not contradict levels 1-3 |

Cross-reference: concepts.md "Governance Terms" for role definitions (Ontology Lead, Program Lead).

## Referential Integrity

- **Primary key uniqueness**: Every Object Type's `primary_key` must produce unique values across all instances. Duplicates cause indexing failures and ambiguous object resolution
- **Link Type endpoint existence**: A Link Type's `source` and `target` Object Types must both exist. Cross-reference: structure_spec.md "Isolated Element Check"
- **Action Type target existence**: Every `affected_object_types` entry must reference an existing Object Type
- **Interface contract completeness**: When an Object Type implements an Interface, all Properties defined by the Interface must exist in the Object Type
- **Backing Dataset binding**: Every Object Type must declare at least one Backing Dataset. An Object Type without one has no data source and cannot produce Objects

## Marking Propagation Dependencies

[관찰→참여] Marking propagation operates through two independent channels simultaneously (AND logic). A resource is accessible only when both channels grant access.

- **File hierarchy propagation**: Marking applied to a Project/Folder propagates to all child resources (Datasets, Pipelines, code repos). Downward-only. Removing a Marking from a parent does not remove it from children that had it independently applied
- **Data lineage propagation**: When a Pipeline produces a derived Dataset from a marked source, the derived Dataset inherits source Markings. Markings travel with data through transformation chains — "security travels with data." (Ref: Palantir Markings docs)
- **Combined evaluation**: A user must satisfy both hierarchy-path AND lineage-path Markings. Either channel alone can deny access

Cross-reference: structure_spec.md "Permission Structure" for mandatory vs discretionary distinction.

## Resource Status Cascade Dependencies

[관찰→참여] Parent resource status constrains child resource status. A child cannot be in a more permissive state than its parent.

- **Ontology deprecation -> Object Type**: All Object Types within a deprecated ontology are effectively deprecated. Consumers must migrate
- **Object Type deprecation -> dependents**: Deprecating an Object Type invalidates all Action Types that modify it, Link Types that reference it, and Functions that use it
- **Dataset deletion -> Backing Dataset -> Object Type**: Deleting the underlying Dataset removes the binding, leaving the Object Type without data (definition persists but produces no Objects)
- **Organization deactivation**: Invalidates all Markings, Permissions, and roles scoped to that Organization

## Branch and Proposal Lifecycle Dependencies

[관찰→참여] Branching and Proposal follow a sequential lifecycle where each stage depends on the previous stage's completion. (Ref: Palantir Foundry Branching docs)

- **Branch -> Proposal -> Review -> Merge**: A Proposal can only be created from a Branch. A Proposal must pass review before merge. Merge applies Branch changes to Main
- **Rebase -> Conflict Resolution -> Merge**: When Main has advanced since Branch creation, Rebase is required. Rebase may surface conflicts that must be resolved before the Proposal can proceed
- **Data branch dependency**: Unlike Git (code-only branching), Foundry branches both code and data. Pipeline execution within a Branch uses branched data, enabling end-to-end verification before merge

## Change Management Dependencies

- Change detection -> classification -> approval -> application -> recording: Five sequential stages. No stage can be skipped
- Impact scope identification -> approval: The impact scope must be identified before the appropriate approval authority level can be determined

## Permitted Cycles

- Conditional cycles between Actions within a Workflow: Loops such as "validation fails -> correction -> re-validation" are permitted if a termination condition is specified
- Feedback loops: Aggregation -> anomaly detection -> data correction -> re-aggregation is operationally essential. A maximum iteration count or termination condition is required

## External References

1. Palantir OSDK docs — codegen dependency chain, subset generation, token scoping (Ref: Palantir developer docs)
2. Palantir Markings docs — Marking propagation through file hierarchy and data lineage (Ref: Palantir security docs)
3. Palantir Foundry Branching docs — Branch/Proposal lifecycle, code+data branching (Ref: Palantir platform docs)

## Related Documents
- concepts.md — term definitions (Object Type, Interface, Marking, Pipeline, Branch, Proposal, etc.)
- structure_spec.md — codegen SSOT, data integration structure, permission structure
- logic_rules.md — contradiction check rules arising from dependency relationships
- competency_qs.md — dependency verification questions; domain_scope.md — scope of these rules
