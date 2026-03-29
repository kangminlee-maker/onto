---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Software Engineering Domain — Structure Specification

## Required Module Structure Elements

- **Entry Point**: the public interface through which users/external systems access the system
- **Business Logic**: the core layer implementing domain rules. Minimize external dependencies
- **Data Access**: a layer that abstracts interactions with the storage
- **Configuration/Environment**: manage environment-specific settings separately from code

## Required Relationships

- Every public function/class must have at least one caller or test (no isolation allowed)
- All external dependencies (libraries, APIs) must be abstracted via interfaces for replaceability
- Configuration values must not be hardcoded in code; they must be injected from environment variables or configuration files
- When structural verification (code) and execution procedures (protocol) are in separate documents, the linking reference must be back-referenced in the protocol document for enforcement to be complete

## Layer Structure Principles

- Upper layers (presentation/API) depend on lower layers (business/domain)
- Lower layers do not depend on upper layers
- Dependencies between modules within the same layer should be minimized

## Authority and Layer Separation

- Distinguish **definition authority** (what exists) from **specification authority** (how it behaves). The direction of change is definition -> specification -> code
- An intermediate abstraction layer is justified only when 2 or more consumers directly consume that layer. With only 1 consumer, it only adds indirection cost
- "Type of detail" (semantic/structural/implementation) and "placement of detail" (layer 1/2/3) are independent axes. Conflating them causes unnecessary conflicts
- Boundary criterion between "definition document" and "specification document": "Would misunderstanding this lead to misinterpreting the intent?"

## Verification Structure

- When delegating a verification plan to AI, "what to verify" (pass_criteria) and "how it was verified" (evidence_type) must be separate fields for audit traceability
- Even if edge cases are enumerated in the verification plan, without a structured path for recording results, "documented edge cases" and "actually verified edge cases" become separated
- A command that includes both "automated execution steps" and "user conversation steps" can simplify session resumption recovery by separating them into different states in a state machine

## Isolated Node Prohibition

- Public function/class with no callers -> warning (dead code)
- Module that is not imported -> warning (isolated module)
- Public API without tests -> warning (verification gap)
- Declared but unreachable state -> warning

## Storage/Data Layer

- Data sources (DB, API, files) must be separated from business logic
- Schema changes must be managed through migrations
- Data integrity rules (constraints) must be verified on both the application and storage sides

## Related Documents
- concepts.md — term definitions for module, interface, layer, etc.
- dependency_rules.md — dependency direction and circular dependency rules
- competency_qs.md — Q1-Q3 (structural understanding questions)
