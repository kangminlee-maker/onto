# Software Engineering Domain — Dependency Rules

## Acyclic Required Relationships

- Module dependency graph: acyclic (DAG). Cycles make build order undeterminable and initialization order indeterminate
- Package/library dependencies: acyclic. Circular dependencies prevent deployment units from being separated
- Type-only imports and value imports must be distinguished. Type-only imports do not cause runtime cycles and are therefore evaluated at a separate severity level

## Direction Rules

- Upper layer -> lower layer: allowed
- Lower layer -> upper layer: prohibited (layer inversion)
- Business logic -> direct dependency on external library: discouraged (abstract via interface)
- Test -> production code: allowed
- Production code -> test: prohibited

## Type Location and Dependency Direction

- When shared types are defined in a specific module, unintended dependency directions are created. Placing shared types at the lowest dependency layer is structurally safe
- The module location of a type definition implicitly declares that type's contract level. When the consumer is at the system's external boundary, maintaining it as a kernel contract is advantageous for intent preservation
- Moving a type to the consumer module can cause the producer to depend on the consumer, resulting in a structural constraint violation

## Diamond Dependencies

- A diamond of the form A -> B, A -> C, B -> D, C -> D: allowed (provided D's versions match)
- Simultaneous dependency on different versions of the same module: prohibited (version conflict)

## Referential Integrity

- A module referenced by import/require must actually exist
- All types referenced in a public API must be exported
- Environment variables referenced in configuration must actually be defined
- When the same function name exists in multiple files, limiting the search scope to a specific file when enumerating change targets causes omissions structurally. The full search (grep) results must be stated to prevent scope mismatch

## Source of Truth Management

- When data collection input paths number 3 or more, the consumption timing and source of truth designation for each path are required
- When migrating a source of truth, if the existing document's "definition authority" rules and the new system's source of truth declaration coexist, the dependency direction becomes duplicated. The existing rules must also be updated during migration
- When data is delivered through two paths — event stream (structural state) and file (semantic context) — the priority in case of inconsistency must be specified as a contract

## External Dependency Management

- Production dependencies and development-only dependencies must be distinguished (dependencies vs devDependencies)
- External API calls must have a fallback path in case of failure
- The license of external dependencies must be compatible with the project license
- For detecting changes from external-service-based sources, using service-provided metadata (lastModified, etc.) is advantageous for preventing false positives
- A pattern that concentrates external interface definitions in a single file (like MCP tool definitions) is prone to growing into a God Module. A distributed registration pattern maintains correct dependency directions

## Related Documents
- concepts.md — term definitions for dependency, source of truth, contract, etc.
- structure_spec.md — layer structure principles, module structure rules
- logic_rules.md — dependency logic, circular dependency rules
