---
version: 3
last_updated: "2026-03-31"
source: manual
status: established
---

# Palantir Foundry Domain — Concept Dictionary and Interpretation Rules

Classification axis: **observer-participant** — each term is tagged by its transfer potential: `[관찰]` Foundry-specific, `[참여]` universal design rule, `[관찰→참여]` transferable pattern.

## Semantic Layer Core Terms

The Semantic Layer answers "what exists in the business domain." It defines entities, their attributes, and their relationships. All terms here compose Foundry's ontology "language" — everything is expressed as combinations of these six entity types.

- `[관찰→참여]` Object Type = Business entity type definition -> The minimal unit of a Foundry ontology. Composed of display_name, primary_key, properties, data_source, and description. Corresponds to an RDB table or OOP class, but mandates business meaning — a table without business description is not an Object Type. Concrete type: can be instantiated as Objects and must be backed by a Dataset
- `[관찰→참여]` Property = Attribute of an Object Type -> Includes base type, constraints, and business description. Corresponds to an RDB column. Base types include String, Integer, Decimal, Date, Boolean, Timestamp, Geopoint, Geoshape, Vector, Attachment, Time Series, and Struct
- `[관찰→참여]` Link Type = Relationship between Object Types -> Explicitly declares direction (source -> target), cardinality (one-to-one, one-to-many, many-to-many), and business meaning. Corresponds to RDB FK/join, but enforces meaning. 1:1 and 1:N links are backed by foreign keys in the Object Type's datasource; M:N links require their own backing datasource
- `[관찰→참여]` Interface = Common shape that multiple Object Types must implement -> Abstract type with no backing dataset. Supports multiple implementation (one Object Type implements many Interfaces) and interface extension (one Interface extends another). Serves as a cross-reference contract in multi-ontology environments. Achieves polymorphism via shape contract, not inheritance chain
- `[관찰→참여]` Shared Property = A Property defined once and reused across multiple Object Types -> Changes automatically propagate to all referencing Object Types. Prevents duplicate definitions and ensures cross-type consistency
- `[관찰]` Enum = Permitted value set definition -> Code generation as union type. Adding a value is breaking_minor; removing is breaking_major. In Foundry's type system, Enum is a constraint on Value Types (not an independent base type). Supports case sensitivity configuration

## Semantic Layer Extended Terms

These terms extend the core vocabulary with richer type semantics and metadata capabilities.

- `[관찰→참여]` Value Type = Semantic wrapper around a base type -> Three-layer structure: base type (e.g., String) + business metadata (e.g., "email address") + validation constraints (regex, range, enum, RID/UUID, uniqueness). Customizable per Space (ontology region). Transferable pattern: any system benefits from separating technical type, business meaning, and validation rule
- `[관찰]` Struct Type = Composite property type -> Maximum 10 fields, depth limited to 1 level (no nesting). An intentional complexity constraint in Foundry's design. Used for grouped attributes that do not warrant a separate Object Type
- `[관찰→참여]` Type Classes = Metadata annotation layer applied to properties, link types, and action types -> Five categories: Analyzer (Lucene search indexing behavior), Application-Specific (platform app hints like hubble, timeseries, vertex), Structural (hierarchy.parent, vertex.link_merge), Scheduling (schedulable-start-time), Geospatial (geo.latitude, geo.longitude). Enables loose coupling: new applications can discover and interpret ontology semantics without schema changes

## Kinetic Layer Core Terms

The Kinetic Layer answers "what can be done." It connects the Semantic Layer to real data and defines executable business operations. Without a Kinetic Layer, the ontology is read-only and cannot capture decisions (no feedback loop).

- `[관찰→참여]` Action Type = Definition of mutation operations on Objects -> An atomic transaction unit: all changes commit together or none do. Composed of parameters, ontology rules (8 types: create/modify/delete objects, create/delete links, function rule, interface-based operations), side effect rules (notifications, webhooks), and submission criteria. Formalizes business actions such as "process refund." Corresponds to Command in CQRS — the write path is separated from the read path
- `[관찰→참여]` Action Parameter = Input definition for an Action Type -> Four value sources: from parameter (existing action input), object parameter property (extracted from referenced object), static value (fixed at definition), current user/time (context). Parameters define what information the user must provide to execute the action
- `[관찰→참여]` Side Effect Rule = External effect triggered by an Action -> Two types: notification rules (user alerts) and webhook rules (external system calls). When a webhook is configured as writeback, it executes before other rules — failure cancels all changes (simplified saga pattern). Side effects are declared in the Action definition, not embedded in application code
- `[관찰→참여]` Function = Server-side business logic -> Implemented in TypeScript or Python. Uses ontology Objects as inputs and outputs. Read-only (no state changes) — distinguished from Action (state-changing). Corresponds to Query in CQRS
- `[관찰→참여]` Function-Backed Action = Action whose logic is implemented via Function code rather than declarative rules -> Used when built-in rules are insufficient for complex multi-object mutations. Two-tier design principle: declarative rules as default (auditable, validatable), imperative code as escape hatch (flexible, complex). Most business logic should be expressible declaratively

## Dynamic Layer Core Terms

The Dynamic Layer answers "who can do what, and when." It introduces governance, access control, and automation. At small scale, Semantic + Kinetic suffice; at large scale with many users and agents, Dynamic Layer becomes essential.

- `[관찰→참여]` Workflow = Sequential/parallel execution flow of multiple Actions -> Declaratively defines business processes. Manages object state lifecycles (e.g., Suspect -> Investigated -> Cleared). The orchestration unit for multi-step operations
- `[관찰→참여]` Rule = Conditional automatic execution -> An event trigger invokes an Action. Automates flows. Rules are evaluated sequentially; later rules on the same property override earlier ones. Distinct from Action rules: Workflow Rules trigger Actions based on events, Action rules define what happens inside an Action
- `[관찰→참여]` Marking = Mandatory access control tag that restricts data access -> Binary (all-or-nothing). Multiple Markings are AND-evaluated (all must be satisfied). Propagates automatically to derived resources — when data moves, Marking moves with it. Owner permissions cannot remove Markings (requires separate Expand Access privilege). Corresponds to data-centric security; contrast with role-based access which expands access. Common use: PII restriction, classification-based access control
- `[관찰→참여]` Marking Group = A collection of related Markings -> Organizes Markings by classification category (e.g., PII, confidentiality level). Corresponds to ABAC policy groups. Provides administrative structure for managing large numbers of Markings
- `[관찰→참여]` Permission = Access control per Object Type / Action Type -> The execution layer of governance. Three mechanisms: (1) Object Security Policy — per-instance view access (row-level security), (2) Property Security Policy — per-attribute visibility (column-level security), (3) Action Permission — execution authorization gates. Combined row + column policies achieve cell-level security. Operates independently from backing datasource permissions
- `[관찰→참여]` Organization = Administrative unit for user and group management -> Defines the boundary within which Markings, Permissions, and roles apply. Corresponds to IAM tenant/organization boundary
- `[관찰]` Restricted View = A filtered projection of an Object Type that limits visible instances and properties -> Applies row and column restrictions declaratively. Consumes Object Security Policy and Property Security Policy rules. Allows sharing subsets of data without exposing the full Object Type

## Platform Terms

These terms describe Foundry's data integration infrastructure — how external data enters the system, is transformed, and binds to the ontology. The overall data flow: Source Systems -> Data Connection -> Sync -> Dataset -> Transform (Pipeline) -> Ontology.

- `[관찰→참여]` Pipeline = Data transformation flow from source to ontology -> Two modes: Pipeline Builder (low-code GUI) and Code Repository (full-code). Dependency tracking is dataset-centric: upstream data changes automatically determine which downstream datasets to rebuild. Corresponds to ETL/ELT orchestration, but triggered by data change rather than schedule
- `[관찰→참여]` Dataset = Versioned, governed file collection -> A wrapper over files providing schema management, version history, permission control, and lineage tracking. The physical storage unit. Supports branching: a feature branch can run the entire pipeline independently and verify data results before merge
- `[관찰→참여]` Backing Dataset = Data source for an Object Type -> Binds an Object Type to physical data. One Object Type can have multiple backing datasets. Adding a backing datasource triggers indexing into Object Storage
- `[관찰→참여]` Virtual Dataset = Compute-on-demand data access without physical copy -> No storage cost but higher compute cost. Source system governance applies. Decision criteria: audit requirements, latency tolerance, and transformation complexity determine whether to use Dataset (physical copy) or Virtual Dataset (live query)
- `[관찰→참여]` Writeback Dataset = Dataset capturing user edits via Actions -> Source data (backing dataset) remains immutable; edits are recorded in a separate layer. A variation of Event Sourcing: original state (backing) + change events (user edits) = current state (writeback). Enables audit trail and rollback
- `[관찰→참여]` Data Connection = Secure access channel to external source systems -> Three modes: Agents (installed on source network), Webhooks (event-driven push), Listeners (polling). The entry point of the data flow
- `[관찰→참여]` Sync Schedule = Configuration for data movement frequency -> Batch, streaming, or file-based. Determines data freshness in the ontology. Design principle: "choose the integration pattern per workflow requirements, not globally"
- `[관찰→참여]` Transform = A computation unit within a Pipeline -> Takes input datasets, applies transformation logic, produces output datasets. Foundry tracks input-output dependencies automatically for incremental rebuilds
- `[관찰]` Object Storage V2 = Read/Write separated storage architecture -> Object Data Funnel (write path) orchestrates all data writes. Object Set Service (read path) handles queries, filters, aggregation. Independent scaling of read and write paths. Performance: up to 10,000 object edits per Action, up to 2,000 properties per Object Type

## Data Classification Terms

These terms classify data by its nature and change frequency. Classification determines indexing strategy, sync frequency, and governance requirements.

- `[관찰→참여]` Master Data = "What exists" -> Low change frequency. Business units, products, customers. Forms the structural backbone of the ontology. Corresponds to dimension data in star schema terminology
- `[관찰→참여]` Transaction Data = "Who did what, when" -> High change frequency (daily or more). Orders, interactions, events. Forms the operational record of business activity. Corresponds to fact data in star schema terminology
- `[관찰→참여]` Derived Data = Aggregated or computed results from master and transaction data -> Change frequency depends on computation schedule. Reports, metrics, summaries. Not a source of truth — always re-derivable from upstream data

## Change Management Terms

Change management defines how ontology structures evolve without breaking existing consumers. The severity classification (non_breaking through breaking_major) determines the approval process and migration requirements.

- `[관찰→참여]` Schema Migration = Framework for managing compatibility when ontology structure changes -> Requires impact analysis before execution. Severity determines whether Ontology Lead alone or Ontology Lead + Program Lead must approve
- `[관찰→참여]` non_breaking = No impact on existing systems -> Adding a nullable Property, editing descriptions. Ontology Lead approval sufficient
- `[관찰→참여]` breaking_minor = Minor impact on existing data -> Adding an enum value, changing optional to required. Requires consumer notification
- `[관찰→참여]` breaking_major = May break existing data/integrated systems -> Changing a Property type, changing PK, changing data source. Requires co-approval from Ontology Lead + Program Lead
- `[관찰→참여]` deprecation = Retiring an existing element (Lifecycle Intent) -> Removed after a grace period. Applies to Object Type/Property/enum value removal. A replacement must be specified. 주의: deprecation은 프로세스 축(Lifecycle Intent)이지, 영향 축(Impact Severity)이 아님. 어떤 영향도 수준(non_breaking, breaking_minor, breaking_major)과도 공존 가능 — 예: nullable Property 제거 예고는 deprecation + non_breaking, PK 변경을 수반하는 제거 예고는 deprecation + breaking_major
- `[관찰→참여]` Branching = Isolated experimentation on a copy of the Main ontology -> Verified and then merged into Main. Foundry uniquely branches both code and data simultaneously — other platforms (Snowflake, Databricks) branch code only, requiring separate data environment management
- `[관찰→참여]` Proposal = A change proposal -> Corresponds to Git Pull Request. Individual approval/rejection per change item is possible. The review unit for ontology evolution

## Architecture Framework Terms

These terms describe the system-level architecture of an ontology platform. They apply to the design of any system that integrates semantic modeling with operational execution.

- `[관찰→참여]` Three-Layer Architecture = Separation of concerns into Semantic (what exists), Kinetic (what can be done), and Dynamic (who can do what) -> Each layer has different stakeholders (analysts, engineers, users), evolves independently, and addresses a distinct concern. This separation enables independent scaling and modification
- `[관찰→참여]` Language / Engine / Toolchain = Three-part system decomposition -> Language defines what can be expressed (Object Types, Link Types, Action Types). Engine defines how expressions are executed (read path, write path, indexing). Toolchain defines how developers build and govern (OSDK, DevOps). Useful framework for evaluating any ontology system's architecture
- `[관찰→참여]` Ontology-first = Design philosophy where business concepts are defined before data is bound -> Contrast with Data-first (Snowflake, Databricks: tables exist first, meaning is layered on) and Domain-first (SAP BTP: DDD domain model as starting point). Ontology-first produces entities that survive data source changes; Data-first is faster to start but harder to evolve
- `[관찰→참여]` Digital Twin = Ontology as an executable model of the organization -> Not just a data catalog but an operational system that captures decisions via writeback. "Read-only model" is a static representation; "read+write model" is a digital twin

## Code Generation Terms

Code generation bridges the ontology definition and application development. The generated code provides type-safe access to ontology entities, ensuring that schema changes are detected at compile time rather than runtime.

- `[관찰]` OSDK = Ontology Software Development Kit -> Auto-generates TypeScript/Python/Java clients (or OpenAPI spec for arbitrary languages). Generates only the subset of ontology relevant to the application (not the full ontology). Dual-layer security: token scope limits accessible ontology entities, user permissions further restrict data access
- `[관찰→참여]` codegen = Ontology definition -> typed client auto-generation pipeline. Schema changes produce compile errors that automatically detect impact scope at build time, not runtime. Generated mappings: Object Type -> interface, Property -> readonly field, Link Type -> reference type, Enum -> union type. This pattern applies to any schema-driven system

## AI/LLM Integration Terms

These terms describe how AI/LLM agents interact with the ontology. The core principle is that AI agents operate within the same semantic and security boundaries as human users — the ontology is the single source of truth for both.

- `[관찰→참여]` AIP Logic = AI agent execution framework that binds LLM capabilities to ontology operations -> AI agents read Objects and execute Actions through the ontology, not through raw data access. The ontology provides structured context (Object properties, Link relationships) instead of unstructured text, reducing hallucination. Corresponds to the principle that AI should operate through the same semantic layer as human users
- `[관찰→참여]` Ontology-Augmented Generation (OAG) = Pattern of injecting ontology objects (not text documents) into LLM context -> Differs from text-based RAG: structured Objects with typed Properties and explicit Links carry unambiguous meaning, while text requires interpretation. Reduces hallucination by providing the LLM with facts that have been validated through the ontology's type system and constraints
- `[관찰→참여]` AI Agent Permission Inheritance = Principle that an AI agent's data access scope equals the invoking user's access scope -> Marking and Permission models apply identically to AI agents. Without this principle, AI agents become a privilege escalation vector — accessing data the human user cannot see. Applies to any system where AI acts on behalf of users
- `[관찰→참여]` Human-in-the-Loop Governance = Requirement that AI-proposed changes undergo human review before committing to the ontology -> AI agents propose changes via Branch Proposal (equivalent to Pull Request); humans approve or reject. Prevents autonomous AI mutations that bypass governance. The review gate applies regardless of the AI agent's technical capability to execute directly
- `[관찰]` AI FDE = LLM-based AI agent that operates Foundry via natural language -> Changes are reflected after human review via Branch Proposal. A Foundry-specific implementation of Human-in-the-Loop Governance. See also: Governance Terms — AI FDE for the Foundry-specific role definition

## Governance Terms

Governance defines who has authority over ontology changes and how decisions are made. The role structure separates technical ownership (Ontology Lead) from business ownership (Program Lead).

- `[관찰]` Ontology Lead = Technical owner of ontology design and changes -> Has sole approval authority for non_breaking changes. Responsible for structural integrity of the ontology
- `[관찰]` Program Lead = Business owner of the overall program -> Has co-approval authority for breaking_major/deprecation changes. Responsible for business impact assessment
- `[관찰]` FDE = Forward Deployed Engineer -> Palantir employee deployed to the client. Serves as a translator between domain experts and engineers. Unique to Palantir's delivery model
- `[관찰]` AI FDE = LLM-based AI agent -> Operates Foundry via natural language. Changes are reflected after human review via Branch Proposal. Human-in-the-loop governance: AI proposes, human approves

## Homonyms Requiring Attention

Terms that share names across Foundry, general software engineering, and competitive platforms but carry different meanings. Three-column disambiguation prevents cross-domain confusion.

| Term | Foundry Meaning | General SW Meaning | Competitive Platform Meaning |
|------|----------------|--------------------|-----------------------------|
| Object | Instance of a business entity (Order #123) | OOP object, JSON object | Databricks: row in a table; SAP: Business Object (aggregate root) |
| Property | Attribute of an Object Type (includes business meaning + constraints) | CSS property, general attribute | Snowflake: column; SAP CDS: element |
| Interface | Shape contract that an Object Type implements (abstract, no data) | UI interface, API interface | SAP CDS: aspect; Databricks: n/a (no equivalent) |
| Action | Formalized atomic mutation operation on Objects | General "action", GitHub Action | SAP CDS: bound/unbound action; Snowflake: stored procedure |
| Branch | Isolated copy of ontology including code and data | Git branch (code only) | Snowflake: Time Travel (read-only); Databricks: Delta versioning (data only) |
| Dataset | Versioned, governed file collection with lineage | Generic "dataset" (unversioned file/table) | Snowflake: table; Databricks: Delta table |
| Pipeline | Dataset-centric transformation flow (triggered by data change) | CI/CD pipeline, ML pipeline | Databricks: Notebook DAG; Snowflake: SQL Task chain |
| Function | Read-only server-side logic (TypeScript/Python) returning ontology data | Programming function | SAP CDS: unbound function (read-only); Snowflake: UDF |
| Marking | Mandatory access restriction tag that propagates with data | n/a | Snowflake: Row Access Policy (no propagation); Databricks: ABAC tag |
| AI Agent | LLM-based operator within ontology security boundaries | Autonomous software agent (no security inheritance) | Databricks: AI/BI Genie (analytics-only); SAP: Joule (CDS-bound, no writeback) |
| Ontology | Executable business model (read + write + govern) | Formal knowledge representation (OWL/RDFS, read-only reasoning) | Databricks: Unity Catalog (metadata governance); SAP: CDS domain model |
| Sync | Data movement from source to Foundry (batch/streaming/file) | File synchronization, state sync | Databricks: ingestion; Snowflake: COPY INTO / Snowpipe |
| Transform | Computation unit within a Pipeline (input datasets -> output datasets) | Data transformation (generic ETL step) | Databricks: Notebook cell; dbt: model |

## Interpretation Principles

### Tag Judgment Rules

- 2-step test for tag assignment: Step 1 — "Is this content derived from Foundry observation?" No -> `[참여]` (universal design rule, independent of Foundry). Yes -> Step 2. Step 2 — "Remove Foundry-specific implementation (API, SDK, platform features). Is the principle still valid?" No -> `[관찰]` (Foundry-specific). Yes -> `[관찰→참여]` (transferable pattern)
- Tags apply to domain content items only. Meta-structure (classification scheme itself, tag rules, frontmatter) does not receive tags
- All three tags have deterministic decision paths — no ambiguous cases should remain untagged

### Transfer Considerations

- `[관찰→참여]` content is the primary input for transfer validation. When applying a Foundry pattern to a different system, verify that the underlying problem (not the Foundry-specific solution) exists in the target context
- `[관찰]` content provides design context but should not be directly adopted. It documents how Foundry solved a problem, which informs but does not prescribe solutions for different systems
- `[참여]` content applies regardless of platform. These are universal engineering principles that Foundry happens to implement but that were not invented by Foundry

### Domain Interpretation Rules

- Foundry's Ontology is not a "metadata layer" but an "operating system." Snowflake/Databricks Semantic Layers focus on metric governance for analytics; Foundry's Ontology includes operational workflow automation. This distinction determines which patterns transfer and which do not
- Ontology-first vs Data-first: Foundry defines business concepts first and binds data to them. Snowflake/Databricks define tables first and layer business meaning on top. SAP BTP follows Domain-first (DDD principles). The choice affects how easily the system adapts to business changes
- Read path and write path separation (CQRS pattern) appears at multiple levels: Function (read) vs Action (write), Object Set Service (read) vs Object Data Funnel (write), Backing Dataset (source) vs Writeback Dataset (edits). This separation is a transferable architectural pattern
- Declarative-first, imperative-second: Built-in rules handle most business logic declaratively. Function-Backed Actions handle complex cases imperatively. Declarative definitions are easier to audit, validate, and migrate. This principle applies to any system balancing flexibility with governability
- Security propagation distinguishes Foundry from competitors: Marking travels with data through derivation chains. In Snowflake/Databricks, security policies attach to tables and do not follow derived data. This is a fundamental design decision, not a feature gap
- "Entities must be long-lived and meaningful." Exposing raw tables as Object Types is an anti-pattern — table structure reflects technical decisions, not business concepts. An Object Type must represent a business concept that persists beyond any single data source
- Semantic Layer defines "nouns" (Object Types), Kinetic Layer defines "verbs" (Action Types). A read-only ontology (Semantic only) cannot capture decisions. Adding the Kinetic Layer transforms a repository into an engine
- The three-layer model maps to competitive platform equivalents but with varying completeness. Foundry integrates all three natively; Snowflake/Databricks focus on Semantic + partial Dynamic; SAP BTP provides Semantic + Kinetic with declarative Dynamic. No competitor provides data branching (code + data isolation in a single branch)
- Closed World Assumption: Foundry's ontology operates under CWA — if something is not in the system, it does not exist. This contrasts with traditional Semantic Web (OWL) which uses Open World Assumption. The CWA is appropriate for operational systems where completeness is required for decision-making
- Constraint declaration belongs at the schema level, not the application level. Value Type constraints (regex, range, enum, uniqueness) are defined in the ontology, not in consuming applications. This ensures all consumers enforce the same rules consistently
- AI/LLM integration through the ontology layer (OAG) differs fundamentally from direct database access by AI. OAG provides typed, constrained, permission-governed context; direct access provides raw data without semantic guarantees. This distinction determines whether AI operations are auditable and governable
- AI agent permission inheritance is not optional — it is a security requirement. Any system that grants AI agents broader access than the invoking user creates a privilege escalation path

## Synonym and Inclusion Relationships

Terms that refer to the same concept across different contexts, and terms that stand in subset/superset relationships.

- Object Type ≈ CDS Entity (SAP) ≈ Table + business semantics. All define a business entity, but with different levels of semantic enforcement
- Link Type ≈ Association (SAP CDS) ≈ FK/JOIN (RDB). All express entity relationships, but Link Type mandates business description; FK/JOIN does not
- Action Type ≈ Bound Action (SAP CDS) ≈ Stored Procedure (Snowflake). All represent executable operations, but at different abstraction levels: business action vs entity-bound operation vs technical procedure
- Interface ≠ Shared Property — 상호 보완적 재사용 메커니즘. Interface = 형태 계약 (여러 Property + Link 제약을 하나의 shape으로 정의), Shared Property = 교차 타입 속성 (단일 Property를 여러 Object Type에서 재사용). 포함 관계가 아니라 직교하는 재사용 축: Interface는 "어떤 형태를 따를 것인가", Shared Property는 "어떤 속성을 공유할 것인가"
- Dataset ⊃ Backing Dataset, Dataset ⊃ Writeback Dataset — 형제 특수화. Backing = 읽기 소스 (Object Type에 데이터를 공급), Writeback = 편집 기록 (Action을 통한 변경사항 저장). source-writeback separation 원칙에 의해 역할이 분리됨. 중첩 관계(⊃)가 아니라 동일 부모의 병렬 특수화
- Ontology (Foundry) ≠ Ontology (Semantic Web). Foundry ontology is an executable business model (CWA, read+write+govern). Semantic Web ontology is a formal knowledge representation (OWA, read+reason). The same word, fundamentally different systems
- Pipeline (Foundry) ≠ Pipeline (CI/CD). Foundry Pipeline is data-centric (triggered by data change); CI/CD Pipeline is code-centric (triggered by code change)
- Marking ≠ Role. Roles expand access; Markings restrict access. They operate in opposite directions and are not interchangeable

## Related Documents
- domain_scope.md — overall scope of the three-layer architecture, data layers, and change management
- structure_spec.md — structural design rules for ontology elements
- logic_rules.md — logic rules that these terms must satisfy
- dependency_rules.md — dependency relationships between terms
- competency_qs.md — questions these concepts must be able to answer
- extension_cases.md — extension scenarios
- conciseness_rules.md — conciseness rules
