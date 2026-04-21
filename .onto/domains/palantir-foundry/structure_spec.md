---
version: 4
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Structure Specification

## Object Type Required Elements

Every Object Type must include:
- `display_name`: User-facing display name
- `primary_key`: Unique identifier Property
- `description`: Business meaning description (1-2 sentences)
- `properties`: At least one Property
- `data_source`: Data origin source (if undetermined, state "TBD")

## Property Required Elements

- `name`: Attribute name (English, snake_case)
- `type`: Data type (String, Integer, Decimal, Date, Boolean, Enum, Timestamp, Geopoint, and others per concepts.md)
- `description`: Business meaning description
- `nullable`: Whether optional (true/false)

## Link Type Required Elements

- `source`: Origin Object Type
- `target`: Destination Object Type
- `cardinality`: one-to-one, one-to-many, or many-to-many
- `description`: Business meaning of the relationship

## Action Type Required Elements

[관찰→참여] Every Action Type must include:
- `parameters`: Input definitions with value source (from parameter, object parameter property, static value, current user/time)
- `preconditions`: Rules applied before execution — Ontology Rules (8 types: create/modify/delete objects, create/delete links, function rule, interface-based operations) + Side Effect Rules (2 types: notification rules, webhook rules)
- `postconditions`: Expected state after successful execution
- `side_effects`: External effects (notifications, webhook calls). When a webhook is configured as writeback, it executes before other rules — failure cancels all changes
- `affected_object_types`: List of Object Types modified by the Action

Rule evaluation order: sequential. Later rules on the same property override earlier ones.

## Function Required Elements

[관찰→참여] Every Function must include:
- `input_types`: Parameter types (ontology Objects or primitive values)
- `return_type`: Output type
- `purity`: Must be declared read-only (no state changes). Functions correspond to Query in CQRS. If state changes are needed, use Action Type instead

## Workflow and Rule Required Elements

[관찰→참여] Workflows and Rules require:
- `trigger_condition`: Event or state that initiates execution (e.g., object creation, property value change, schedule)
- `action_binding`: Which Action Type(s) the Workflow/Rule invokes
- `frequency`: Execution frequency (one-time, recurring, event-driven)

Workflow Rules trigger Actions based on events — distinct from Action rules, which define what happens inside an Action.

## Enum Required Elements

[관찰→참여] Every Enum must include:
- `name`: Enum type name (PascalCase)
- `description`: Business meaning and usage context
- `values`: List of allowed values (each with label and description)
- `default_value`: (optional) Default value when not explicitly set
- `deprecated_values`: (optional) Values no longer recommended, with migration guidance

## Interface Required Elements

[관찰→참여] Every Interface must include:
- `name`: Interface name (PascalCase)
- `description`: Shared behavior or contract this Interface represents
- `required_properties`: List of Properties that implementing Object Types must provide
- `implementing_object_types`: Reference to Object Types that implement this Interface

## Shared Property Required Elements

[관찰→참여] Every Shared Property must include:
- `name`: Property name (English, snake_case)
- `type`: Data type
- `description`: Business meaning description
- `owning_ontology`: Ontology that defines and maintains this Property
- `consuming_object_types`: List of Object Types that use this Shared Property

## Permission Structure

[관찰→참여] Foundry applies Mandatory Access Control (Marking) where security travels with data — derived resources inherit the restriction automatically. (Ref: Palantir Markings docs)

- **Marking hierarchy**: Marking Group → Marking → Resource. Multiple Markings are AND-evaluated. Owner permissions cannot remove Markings (requires separate Expand Access privilege)
- **Mandatory vs Discretionary**: Mandatory (Marking) restricts access, binary all-or-nothing, cannot be overridden by data owners. Discretionary (role-based grants) expands access. They operate in opposite directions
- **Row/Column/Cell-level security**: Object Security Policy (row-level) + Property Security Policy (column-level) = cell-level security. These policies operate independently from backing datasource permissions
- **Organization isolation**: Organization defines the boundary for Markings, Permissions, and roles. Cross-organization sharing requires explicit de-identification rules at the property level

## Isolated Element Check

[참여] Every element must be checked for structural connectivity:
- **Object Type**: Not connected to any Link Type → "isolated entity." Exception: top-level Master Data entities referenced by others are not isolated
- **Link Type**: References a non-existent Object Type → dangling reference
- **Action Type**: No `affected_object_types` → orphan action with no observable effect
- **Function**: Not referenced by any Action Type or application → unused logic
- **Permission**: References a non-existent Object Type or Property → stale security rule
- **Interface**: No implementing Object Type → warning: unused contract
- **Shared Property**: Not consumed by any Object Type → warning: orphan shared property
- **Enum**: Not referenced by any Property → warning: unused enumeration
- **Workflow**: No trigger condition binding → warning: workflow will never execute
- **Rule**: No action binding → warning: rule has no effect

## Connectivity Check

- Object Types within the same data layer (Master/Transaction/Derived) must be traversable via Link Types
- Cross-layer connections: Transaction -> Master direction. Upper layers reference lower layers; lower layers do not know about upper layers

## Data Integration Structural Requirements

[관찰→참여] Data flows through a staged pipeline before binding to the ontology. (Ref: Palantir Data Integration docs)

```
Source Systems → Data Connection → Sync → Dataset → Transform (Pipeline) → Ontology
```

- **Pipeline → Backing Dataset binding**: Every Object Type must declare at least one Backing Dataset
- **Backing Dataset vs Virtual Table**: Backing Dataset = persistent copy with version history and lineage. Virtual Table = compute-on-demand, no storage. Choice depends on audit requirements, latency tolerance, and transformation complexity
- **Source-writeback separation**: Source data (Backing Dataset) and change data (Writeback Dataset) must be separate — source systems are never directly modified

## Pipeline Quality Structure

[관찰→참여] Data quality is achieved through staged processing, not single-step transformation. (Ref: Palantir Development Best Practices docs)

### Stage Definitions

- **Raw**: Source system data as-is. No transformation applied. Purpose: audit trail and reprocessing capability
- **Clean**: Basic quality operations applied (type alignment, null handling, deduplication). Starting point for most Foundry activities
- **Transform**: Use-case-specific transformations. Produces datasets ready for ontology binding

### Naming Conventions

- Dataset/Column names: snake_case (e.g., awesome_dataset, not AwesomeDataset)
- Distinctive portion first (e.g., order_daily_summary, not daily_summary_order) — prevents truncation in UI dropdowns
- No abbreviations. No numeric increments (dataset1, dataset2)

### Catalog Organization

```
/Domain
  /Subject Area
    /Entity
      - gold_<entity>
      - silver_<entity>
      - ref_<lookups>
```

## Multi-Ontology Connection Structure

- Object Types in the Shared Ontology are referenced from Private Ontologies through Interfaces
- If a cross-reference exists without Interface implementation, it is a structural defect

## Change Management Required Structure

- `change_classification` rules must be defined (non_breaking/breaking_minor/breaking_major/deprecation)
- `governance.roles` must define at least an Ontology Lead
- `governance.approval_levels` must map approval authority to each change classification

## Codegen Output Structure (SSOT)

[참여] This section is the Single Source of Truth for codegen implementation rules. Other documents (domain_scope.md, logic_rules.md, dependency_rules.md) reference this section but do not redefine codegen rules.

### Generated File Layout

`generated/types/` — one file per entity category (ObjectTypes.ts, LinkTypes.ts, ActionTypes.ts, Enums.ts). `generated/functions/` — Function signatures. `generated/index.ts` — re-exports for consumer access.

### Type Naming Conventions

| Ontology Entity | Generated Type | Naming Rule |
|----------------|---------------|------------|
| Object Type | TypeScript interface | PascalCase (e.g., `interface SalesOrder`) |
| Property | readonly field | camelCase (e.g., `readonly orderDate: Date`) |
| Link Type | reference type | PascalCase with direction (e.g., `SalesOrder_To_Customer`) |
| Enum | union type | PascalCase, literal values (e.g., `type Status = "active" \| "inactive"`) |
| Action Type | parameter interface | PascalCase (e.g., `ProcessRefundParams`) |
| Function | function signature | camelCase (e.g., `calculateTotal`) |

### Subset Generation Principle

[관찰→참여] Only the relevant portion of the ontology is generated per application, not the entire ontology — benefiting both performance (linear scaling with ontology shape, not size) and security (no access to unneeded entities). Each application declares which Object Types, Action Types, and Functions it requires; codegen produces types only for the declared subset. (Ref: Palantir OSDK Overview docs)

### Scope-Limited Tokens

[관찰→참여] Generated code uses tokens scoped to the selected ontology subset. Dual-layer security: (1) token scope limits accessible entities, (2) user permissions further restrict data access within that scope. (Ref: Palantir OSDK docs)

### Schema Change Detection

[참여] Schema change → type regeneration → compile errors in referencing code. Re-running codegen after a schema change converts runtime errors into compile-time errors. This pattern applies to any schema-based system.

## Testing Structure

[관찰→참여] Testing validates that the ontology implementation matches its design specification. Three levels of testing address different concerns. (Ref: CodeStrap Operating Model — Foundry Mocks, DAO pattern)

### Platform Abstraction (DAO Pattern)

[관찰→참여] Business logic is isolated from the ontology platform via Data Access Object (DAO) pattern. Foundry-specific operations (Object reads, Action executions) are encapsulated behind function interfaces. This enables:
- Unit testing with mock implementations (no live platform required)
- Platform migration without business logic changes
- Dependency injection for component substitution

### Unit Testing with Mocks

[관찰→참여] Ontology interactions are testable via mock implementations (Foundry Mocks pattern):
- Mock Object reads return predefined datasets
- Mock Action executions verify parameter correctness and side effect invocation
- Mock codegen types verify type compatibility without live ontology

### Integration Testing (Schema Verification)

[참여] Schema consistency between ontology definition and backing data:
- Backing Dataset column types match Object Type Property types
- Writeback Dataset schema aligns with current Object Type definition
- Codegen output compiles without errors against current ontology

### E2E Verification

[참여] End-to-end validation of the complete pipeline:
- Source → Pipeline (Raw→Clean→Transform) → Ontology binding → codegen → compile
- Action execution → Writeback Dataset → re-indexing → query verification

## Frontend Integration Structure

[관찰→참여] The ontology-to-UI pipeline extends codegen to the presentation layer, ensuring type safety from schema to screen. (Ref: OSDK v2 React patterns, RESEARCH_NOTES.md Section 12)

### Schema-Type-UI Pipeline

[관찰→참여] The change detection chain extends beyond codegen:
```
Ontology Schema → codegen → Generated Types → UI Components
                                    ↓
                            Compile errors propagate
                            to component boundaries
```

### Polymorphic Component Rendering

[관찰→참여] Ontology Interfaces map to UI component hierarchies:
- Interface defines the common shape (e.g., ITask with status, assignee)
- Each implementing Object Type ($objectType field: CodingTask, LearningTask) renders via a distinct sub-component
- New Object Type implementations are automatically handled if the Interface contract is satisfied

### State Management

[관찰→참여] Ontology-backed applications follow:
- Context-based authentication (provider pattern) — no global state store required
- Hook-level caching with SWR (stale-while-revalidate) strategy
- Real-time subscription for onChange, onError, onOutOfDate events

### OSDK v2 Specifics

[관찰] Foundry OSDK v2 design decisions:
- Performance scales with ontology shape (metadata), not ontology size (total data)
- Lazy loading: types loaded at use time, not at initialization
- Client-code decoupling: library updates do not require SDK regeneration
- React Hooks: useOsdkObjects (collection), useOsdkObject (single), useLinks (relations)

## Quantitative Thresholds

Thresholds are structural health indicators. Exceeding a threshold requires explicit justification.

| Metric | Threshold | Implication | Action |
|--------|-----------|-------------|--------|
| OTs without Link Types | > 10% of total OTs | Structural disconnection | Review per "Isolated Element Check" |
| Action Type parameters | > 8 parameters | Overly complex action | Split into sub-actions or extract parameter groups |
| Properties per OT | > 50 properties | Overloaded Object Type | Split into multiple OTs with Link Types |
| Orphan Actions | > 0 | No affected_object_types | Remove or bind to Object Types |
| Enum values | > 25 values | May indicate missing OT | Evaluate promotion to Object Type |
| Pipeline depth | > 5 transform stages | Debugging complexity | Consolidate intermediate transforms |
| Pipeline stages without Clean | > 0 | Quality gap | Add Clean stage between Raw and Transform |

Cross-reference: Entity-relation ratio thresholds → conciseness_rules.md. Change classification → domain_scope.md "Change Classification."

## External References

1. Palantir OSDK Overview — type generation, subset generation principle, token scoping (Ref: Palantir developer docs)
2. Palantir Action Types & Rules — 8 ontology rules + 2 side effect rules, webhook transaction guarantees (Ref: Palantir Action Types Overview)
3. Palantir Markings & Object Security Policies — mandatory access control, row/column/cell-level security (Ref: Palantir security docs)
4. Palantir Data Integration — Pipeline, Backing Dataset, Virtual Table, Writeback Dataset (Ref: Palantir Data Integration docs)

## Related Documents
- domain_scope.md — three-layer architecture scope, codegen design principles
- concepts.md — term definitions (Object Type, Action Type, Marking, Pipeline, codegen, etc.)
- logic_rules.md — logic rules; references "Codegen Output Structure" for codegen logic
- dependency_rules.md — dependency directions; references "Codegen Output Structure" for codegen dependencies
- competency_qs.md — questions this structure must be able to answer
- conciseness_rules.md — entity-relation ratio thresholds, minimum granularity criteria
