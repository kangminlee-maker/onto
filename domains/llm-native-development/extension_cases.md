---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# LLM-Native Development Domain — Extension Scenarios

The onto_evolution agent simulates each scenario to verify whether the existing structure breaks.

## Case 1: Adding a New Domain Concept

- Adding a new concept to an existing domain
- Verification: Can it be completed by adding 1 new concept file + updating INDEX.md only?
- Verification: Is there no need to modify existing concept files? (concepts.md update is allowed when homonym registration is needed)
- Verification: Does the frontmatter format match the specification in structure_spec.md?

## Case 2: Adding a New Domain Area

- Adding a completely new domain (e.g., finance → healthcare) to the existing system
- Verification: Can the existing domain's file structure be duplicated to start with the same structure?
- Verification: Are shared structures (roles, processes) compatible with the new domain?
- Verification: Is the new domain navigable with only an ARCHITECTURE.md update?
- Verification: Can an inheritance relationship with a parent domain (concepts.md inheritance declaration) be established?

## Case 3: Adding/Changing Agent Roles

- Adding a new verification perspective agent or changing an existing role
- Verification: Does the new role correspond to **at least 1** existing domain document? (1:N mapping allowed)
- Verification: Is the role separated from existing agents' judgment scopes without overlap/conflict?
- Verification: Does it work by simply adding the new role's role file?

## Case 4: Document Scale Expansion

- Number of concepts in a single domain increasing from 50 → 200
- Verification: Can concepts be classified within a maximum directory depth of 3 levels? (based on 3~20 files per directory)
- Verification: When INDEX.md exceeds 20 files, can a sub-index be introduced?
- Verification: Is the system map (ARCHITECTURE.md) size at a manageable level?
- Affected files: structure_spec.md (directory rules), concepts.md (term additions)

## Case 5: Context Window Change

- LLM context window expanding from 128K → 1M tokens, or conversely shrinking
- Verification: Can the quantitative criteria in structure_spec.md (line count upper limit, reference chain upper limit, directory depth) be modified?
- Verification: Are quantitative criteria labeled as "empirical criteria" so the change basis can be updated?
- Verification: When window expands, can file merging criteria be derived from structure_spec.md? When it shrinks, can file splitting criteria be derived?
- Affected files: structure_spec.md

## Case 6: Process Flow Change

- Changing the order of existing processes (onboard → review → build) or inserting a new process step
- Verification: Are process documents independent of domain documents so that processes can be changed without modifying domain documents?
- Verification: Are inter-process dependencies specified so that the impact of order changes can be predicted?
- Verification: Is the new process step compatible with existing role definitions?
- Affected files: None (domain document independence)

## Case 7: Multi-Agent Concurrent Work

- Multiple agents referencing the same domain documents concurrently while working
- Verification: Can each agent make independent judgments with read-only references alone?
- Verification: Is there a defined resolution procedure when agents' judgment results conflict? (deliberation in process.md)
- Verification: Can concurrent learning item accumulation proceed without conflicts through per-agent file separation?

## Related Documents
- structure_spec.md — Quantitative criteria for Case 4 and 5
- dependency_rules.md — Referential integrity for Case 1, inheritance relationships for Case 2
- concepts.md — Homonym registration for Case 1
