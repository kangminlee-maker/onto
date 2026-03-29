---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Software Engineering Domain — Logic Rules

## Type System Logic

- A contract declared by a type signature must be honored at runtime. A discrepancy between declaration and implementation is a logical contradiction
- Changing a field from optional to required is a breaking change. Changing from required to optional is backward compatible
- Adding a value to an enum/union is a breaking change from the consumer's perspective (breaks exhaustive switch)
- When a discriminated union and a string literal union represent the same entity in different files, an addition on one side may not cause a compile error on the other. The `default: never` pattern is the only safety mechanism
- Excluding state fields at the type level from failure branches (success:false) can block the propagation of partial state on failure at compile time

## State Management Logic

- When state transitions are defined, the same input must always produce the same output (determinism)
- Mixing operations with side effects and operations without can cause results to vary depending on execution order
- In asynchronous operations, it must be verified whether race conditions are possible
- When a single business operation records multiple events in Event Sourcing, one of the following must be explicitly chosen to prevent partial commits: (1) composite event aggregation, (2) execute first then record at the end, or (3) saga pattern

## Constraint Design Logic

- When introducing hard/soft constraint classification, handle boundary cases with a two-stage evaluation: "does it invalidate?" + "can it be localized?"
- For output generation constraints, "pre-inclusion in generation directives" provides stronger quality assurance than "post-verification via checklist." Post-verification detects violations but cannot prevent them
- Free-text pass_criteria and expected_result have two simultaneous failure modes when executed by AI agents: "partial fulfillment" and "arbitrary interpretation"

## Dependency Logic

- If a circular dependency exists, initialization order cannot be determined
- Depending on an interface versus depending on an implementation have different levels of coupling (dependency inversion principle)
- A lower module depending on an upper module is a layer inversion

## Constraint Conflict Detection

- If two rules constrain the same target in opposite directions, it is a conflict
- Required and optional are independent axes
- Verification rules must be independent of execution order
- "Referential integrity" and "semantic consistency" are separate verification layers. Passing referential integrity does not guarantee semantic consistency

## Inter-module Contract Logic

- Changes to a public API affect all consumers
- Changes to internal implementation should not affect consumers as long as the public API is maintained
- Depending on behavior not specified in the contract is implicit coupling and is risky
- In batch processing, placing transaction boundaries at the Phase level and performing consistency verification at each Phase completion is a practical pattern

## Related Documents
- concepts.md — term definitions for type system and constraint design
- dependency_rules.md — details of dependency direction rules
- competency_qs.md — Q14-Q16 (type/constraint verification questions)
