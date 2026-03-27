# Software Engineering Domain — Domain Scope Definition

This is the reference document used by onto_coverage to identify "what should exist but is missing."
This domain applies when **reviewing** a software system.

## Major Sub-areas

Classification axis: **concern** — classified by the design concerns that a software system must address.

### Data & State
- **Data Modeling** (required): entities, relationships, type definitions, schema design
- **State Management** (required): state transitions, invariants, recovery paths, concurrency control
- **Event Sourcing** (when applicable): event storage, state reconstruction, projections, terminal states, partial commit prevention

### Interface & Contract
- **API Design** (required): public interfaces, versioning, contracts, backward compatibility
- **Type System** (required): discriminated union, exhaustive check, type-level safety mechanisms
- **Error Handling** (required): error classification, recovery strategies, fallback paths, user guidance

### Security & Auth
- **Authentication/Authorization** (required): user identification, permission systems, access control
- **Security** (required): input validation, injection prevention, data encryption, supply chain security

### Verification & Quality
- **Test Strategy** (required): unit/integration/E2E coverage, verification criteria, test data management
- **Verification Design** (when applicable): verification timing (shift-left), structural verification vs semantic verification, specification requirements when delegating to AI agents
- **Performance** (scale-dependent): response time, throughput, caching strategy

### Structure & Architecture
- **Module Separation** (required): layer structure, dependency direction, separation of concerns
- **Data Flow** (required): input-to-processing-to-output paths, transformation chains, source of truth designation
- **Event/Messaging** (when applicable): message queues, asynchronous processing, pipeline scalability

### Operations & Deployment
- **Deployment/Operations** (scale-dependent): CI/CD, environment separation, monitoring, logging
- **Internationalization/Accessibility** (scale-dependent): multi-language, time zones, accessibility standards

### Documentation & Consumers
- **Document Design** (when applicable): dual-consumer handling for AI agents and humans, separation of contract documents vs guide documents, separation of information structure and rendering
- **Constraint Design** (when applicable): hard/soft constraint classification, invariant vs best-effort boundary, pre-inclusion vs post-verification

## Required Concept Categories

These are concept categories that must be addressed in any software system.

| Category | Description | Risk if Missing |
|---|---|---|
| Happy path | Normal behavior for expected inputs | Incomplete functional definition |
| Error path | Handling of abnormal inputs/states | Defenseless during failures |
| Boundary condition | Min/max values, empty inputs, concurrent access | Edge case failures |
| Lifecycle | Creation -> use -> disposal, state transitions | Resource leaks, zombie objects |
| Traceability | Change rationale, decision justification, audit trail | Unmaintainable |
| Source of truth | The authoritative data/definition source when inconsistencies arise | Unable to resolve information conflicts |

## Reference Standards/Frameworks

| Standard | Application Area | Usage |
|---|---|---|
| OWASP Top 10 | Security | Web application security vulnerability classification criteria |
| 12-Factor App | Deployment/Operations | Cloud-native application design principles |
| REST API Maturity Model (Richardson) | API Design | API design level assessment |
| SOLID Principles | Module separation, type system | Five principles of object-oriented design |
| Event Sourcing Pattern | Event Sourcing | Event storage, state reconstruction, projections |
| Diátaxis Documentation Framework | Document Design | Tutorial/How-to/Reference/Explanation 4-way classification |

## Bias Detection Criteria

- If 3 or more of the 7 concern areas are not represented at all -> **insufficient coverage**
- If concepts from a specific area account for more than 70% of the total -> **bias warning**
- If only the happy path is defined with no error path -> **path bias**
- If creation/use is defined but disposal/cleanup is missing -> **incomplete lifecycle**
- If 2 or more data sources lack a designated source of truth -> **undesignated authority**
- If the document design area is missing in a system where AI agents are consumers/executors -> **missing consumer perspective**

## Related Documents
- concepts.md — definitions of terms within this scope
- structure_spec.md — specific rules for module structure
- competency_qs.md — questions this scope must be able to answer
