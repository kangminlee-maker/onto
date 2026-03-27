# Software Engineering Domain — Competency Questions

This is a list of core questions that this domain's system must be able to answer.
The onto_pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **verification concern** — classified by the concern that questions must address when reviewing a software system.

## Structural Understanding

- Q1: Can the system's major modules and their roles be enumerated?
- Q2: Can the modules that a specific module depends on be derived?
- Q3: Can the list of public APIs (externally exposed interfaces) be extracted?

## Data Flow

- Q4: Can the path that a specific user input takes through the system be traced?
- Q5: Can it be identified where specific data is created, where it is transformed, and where it is consumed?
- Q6: Can the scope of impact when a state change occurs be determined?
- Q7: Is a source of truth designated, and is it specified which source takes priority when data inconsistencies arise?

## Change Impact

- Q8: When a specific module/function's signature changes, can the affected consumers be enumerated?
- Q9: When adding a new feature, can it be pre-verified whether it conflicts with existing logic?
- Q10: When an external dependency (library, API) changes, can the internal impact scope be determined?

## Error Handling

- Q11: Can it be traced how the system recovers in a specific failure scenario?
- Q12: Can the path through which an error propagates be identified?
- Q13: Do error messages delivered to users include the cause and recommended actions?

## Types and Constraints

- Q14: Is an exhaustive check applied in every function that switches on a discriminated union?
- Q15: Are hard constraints and soft constraints distinguished, and are hard constraints enforced by code?
- Q16: When terminal states are defined, do all terminal states have transition events, processing branches, and allowed subsequent actions?

## Testing/Verification

- Q17: Can the existence of tests for a specific feature be confirmed?
- Q18: Can code paths not covered by tests be identified?
- Q19: Are the happy path and error path each verified separately? (Including refactoring equivalence verification)

## Deployment/Operations

- Q20: Can it be determined which version of the code is running in which environment?
- Q21: Are configurations (environment variables, config files) separated from code and managed per environment?

## AI Agent Collaboration (when applicable)

- Q22: Is the specification that an AI agent will execute self-contained? (Does it not depend on context from other sessions?)
- Q23: When both AI agents and humans consume documentation, is the reading path for each audience specified?
- Q24: Is the verification criteria for AI-generated output defined at the "ambiguity detection" level? (Detection, not proof)

## Related Documents
- domain_scope.md — top-level definition of the areas these questions cover
- logic_rules.md — rules related to types/constraints for Q14-Q16
- structure_spec.md — rules related to structure for Q1-Q3
