# Software Engineering Domain — Extension Cases

The onto_evolution agent simulates each scenario to verify whether the existing structure breaks.

## Case 1: Adding a New Feature

- Adding new functionality to the existing module structure
- Verification: Can it be added as a new module without modifying existing modules? (Open-Closed)
- Verification: Are existing tests unaffected?
- Verification: Does the public API require changes? If so, are they backward compatible?
- Affected files: structure_spec.md (module structure), dependency_rules.md (dependency direction)

## Case 2: External Dependency Change

- Major version upgrade of a library/framework in use
- Verification: Is internal code directly coupled to the library, or is there an abstraction layer?
- Verification: When API signatures change, can the impact scope be determined?
- Verification: Does a migration path exist?
- Affected files: dependency_rules.md (external dependency management)

## Case 3: Schema/Data Model Change

- Adding/removing fields or changing types in an existing data model
- Verification: Does the migration preserve existing data?
- Verification: Does all code referencing the model accommodate the change?
- Verification: Is backward compatibility of the API response format maintained?
- Verification: If the change involves identifier formats, has the impact on the entire referential integrity system been assessed?
- Affected files: logic_rules.md (type system), dependency_rules.md (referential integrity)

## Case 4: Scale Expansion

- 10x increase in users/data/traffic
- Verification: Can bottleneck points (DB queries, synchronous processing, memory usage) be identified?
- Verification: Is the structure capable of horizontal scaling (adding instances)?
- Verification: Does shared state (sessions, cache) not impede scaling?
- Affected files: structure_spec.md (module structure)

## Case 5: New Deployment Environment

- Adding a new deployment target beyond the current environment (on-premises -> cloud, single -> multi-region)
- Verification: Are environment-specific settings separated from code?
- Verification: Is environment-dependent code (file paths, OS calls) abstracted?
- Affected files: structure_spec.md (configuration/environment)

## Case 6: Team/Organization Expansion

- Increase in developer count leading to higher concurrent work frequency
- Verification: Are module boundaries clear enough to allow independent work?
- Verification: Do changes to shared code not block other teams' work?
- Verification: Does the CI/CD pipeline support parallel builds/tests?
- Affected files: structure_spec.md, dependency_rules.md

## Case 7: Event Sourcing Extension (when applicable)

- Adding new event types, states, and resume functionality to an Event Sourcing system
- Verification: When a new event is added, do existing Projectors safely handle unknown events?
- Verification: Is handling defined for when external inputs have changed at the point of resumption?
- Verification: When adding pipeline stages, do Touch Points grow proportionally to the number of stages, or remain fixed? (Whether list/chain pattern is used)
- Affected files: logic_rules.md (state management, terminal state), concepts.md (Terminal State)

## Related Documents
- structure_spec.md — module structure, layer principles
- dependency_rules.md — dependency direction, external dependencies, source of truth
- logic_rules.md — type system, state management logic
