---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# LLM-Native Development Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.
The onto_pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **Stage at which the LLM interacts with the system** (exploration → understanding → verification → utilization → change → automation → domain fitness)

## Entry and Exploration

- Q1: Is the system's entry point file explicitly designated in structure_spec.md and immediately identifiable at the top level of the directory?
- Q2: For any concept X, is the path from the entry point to the file defining X specified?
- Q3: Can the domain and sub-areas covered by this system be determined by looking at the directory structure alone?

## Concept Understanding

- Q4: Is any domain term defined in exactly one file? (no duplicate definitions or missing definitions)
- Q5: Can the relationship between concept A and concept B be confirmed through frontmatter or explicit references in the body?
- Q6: When a homonym is used in context, can the intended meaning be distinguished from the document itself?

## Structural Conformance

- Q7: Is every concept file referenced by at least one other file, or registered in a meta file (INDEX.md)? (no isolated documents)
- Q8: Do the target files for relationships declared in frontmatter (depends_on, related_to) actually exist?
- Q9: Is there no place where directory depth exceeds the upper limit defined in structure_spec.md?

## Context Efficiency

- Q10: Does no single file exceed the line count upper limit defined in structure_spec.md?
- Q11: Does the number of files that must be read to perform one task (per scenario in extension_cases.md) not exceed the reference chain upper limit defined in structure_spec.md?
- Q12: Is repeated content not duplicated across multiple files? (single source of truth)

## Change Response

- Q13: When adding a new concept, can it be completed by modifying only the meta file (INDEX.md) without modifying existing concept files? (concepts.md update is included when homonym registration is needed)
- Q14: When a concept's definition changes, can the list of affected referencing files be mechanically extracted?
- Q15: Can the last update time and update reason for a document be verified? (delegated to git commit or recorded in frontmatter)

## Automation Potential

- Q16: Is the frontmatter format consistent enough that a script can parse metadata from all documents?
- Q17: Is the filename convention consistent enough that the document type (concept file vs meta file) can be determined from the filename alone?
- Q18: Can referential integrity (references to non-existent files) be automatically verified?

## Domain Fitness

- Q19: Do the concern areas in domain_scope.md comprehensively cover the key concerns of LLM-native development?
- Q20: Are the terms in concepts.md the core terms actually used in this domain?
- Q21: Do the rules in logic_rules.md reflect the actual constraints of this domain?

## Related Documents
- structure_spec.md — Basis for the quantitative criteria in Q9, Q10, Q11
- extension_cases.md — "Task" unit definition for Q11
- dependency_rules.md — Mechanical extraction path for Q14
