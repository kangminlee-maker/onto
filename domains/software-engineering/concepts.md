---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Software Engineering Domain — Concept Dictionary and Interpretation Rules

## Architecture Core Terms

- Module = an independently deployable/replaceable unit of code
- Interface = the contract for interaction between modules. Must be separated from implementation
- Dependency = a relationship where one module uses the functionality of another
- Layer = a structure that vertically separates concerns. Only upper layers depend on lower layers
- Bounded Context = the scope within which a specific domain model is consistently applied
- Source of Truth = the authoritative data/definition source when inconsistencies arise. When duplicated, priority must be explicitly stated

## Data/State Management Terms

- State = current point-in-time information of a system
- Mutation = an operation that modifies state
- Transaction = an atomic unit of operation that either succeeds or fails entirely
- Migration = the procedure for applying schema changes to existing data
- Terminal State = a final state from which no further transitions occur. In Event Sourcing, all three of (1) transition event, (2) Projector branch, and (3) allowed subsequent events must be defined

## Type System Terms

- Discriminated Union = a set of types distinguished by a shared field (discriminant). Distinct from string literal unions as a type construct
- Exhaustive Check = verification that all cases are handled in a switch statement. The `default: never` pattern focuses errors at the point of origin
- Contract = an agreement between modules. Includes both "what is guaranteed" and "what is not guaranteed"

## Constraint Design Terms

- Hard Constraint = a constraint that invalidates the system when violated. Can be enforced by code
- Soft Constraint = a constraint where violation degrades quality but the system continues to operate. Recommended through documentation/protocol
- Invariant = a constraint detectable by structure alone without semantic interpretation. Enforced by code
- Best-effort = a constraint requiring semantic interpretation, making structural detection impossible. Recommended through protocol

## Change Management Terms

- Breaking Change = a change that breaks existing consumers' code
- Backward Compatible = a change that existing consumers can use without modification
- Deprecation = maintaining a feature while announcing its future removal

## Quality Terms

- Idempotent = producing the same result regardless of how many times the same operation is performed
- Pure Function = a function that does not depend on external state and has no side effects
- Deterministic = always producing the same output for the same input

## Document Design Terms

- Contract Document = a specification document with 1:1 correspondence to code. Violation constitutes a defect
- Guide Document = a document describing intent and context. Serves as supplementary material for judgment
- Self-contained Spec = a specification that includes all information necessary for execution. Especially required when AI agents are the executors

## Homonyms Requiring Attention

- "service": service class (business logic handler) != service (deployment unit, microservice)
- "model": domain model (business object) != ML/LLM model != MVC model
- "controller": MVC controller != hardware controller
- "context": execution context (runtime) != Bounded Context (DDD) != React Context (state sharing) != context window (LLM)
- "migration": DB migration != system migration (relocation) != source of truth migration
- "validation": input validation (user data) != design validation (architecture review) != AI output validation
- "constraint": data constraint (DB) != design constraint (architecture) != business rule

## Interpretation Principles

- Whether a code's current behavior is intentional or a bug cannot be determined from code alone. Cross-check with tests, documentation, and commit history
- "Tests pass" and "works correctly" are not the same. There may be areas that tests do not verify
- Inter-module contracts (type signatures) must specify both "what is guaranteed" and "what is not guaranteed"
- When a design principle is agreed upon, first verify whether that principle is already achieved in another form. Distinguishing between literal interpretation and substantive achievement prevents over-engineering
- "Referential integrity" (does A point to B?) and "semantic consistency" (are A's contents compatible with B's contents?) are separate verification layers. Passing the former does not guarantee the latter

## Related Documents
- domain_scope.md — definition of the areas where these terms are used
- logic_rules.md — rules related to type system and constraints
- structure_spec.md — rules related to module structure
