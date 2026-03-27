# Conciseness Rules (llm-native-development)

This document contains the domain-specific rules that onto_conciseness references during conciseness verification.
It is organized in the order of **type (allow/remove) → verification criteria → role boundaries → measurement method**.

---

## 1. Allowed Duplication

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Duplication that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Duplication retained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Traceability

- [MUST-ALLOW] Spec → implementation → frontmatter triple traceability — spec.md requirements, implementation file code, and frontmatter metadata express the same facts in different formats. The three layers have different consumers (human judgment, LLM generation, machine verification), so removing any one severs the traceability chain.
- [MUST-ALLOW] AI/human dual consumption paths — The same information coexists in human-facing documents (README, explanatory text) and LLM-facing structures (frontmatter, system map). Since consumers read differently, consolidation destroys accessibility for one side.

### Navigation Structure

- [MUST-ALLOW] File list overlap between system map (ARCHITECTURE.md) and navigation index (INDEX.md) — The system map provides a structural overview of the whole, while the navigation index provides per-directory detail. Since their purposes and navigation depth differ, independent maintenance is mandatory.
- [MAY-ALLOW] Frontmatter relationship declarations and body "Related Documents" links pointing to the same file. Frontmatter is for machine verification, body links are for human navigation, so retention is acceptable, but there is a risk of inconsistency during updates.

### Role and Domain Document (Role-Document Mapping)

- [MUST-ALLOW] Agent role definitions (roles/*.md) and process document (process.md) role-document mapping both mentioning role names. Role files define judgment criteria while process documents define execution order, so their concerns differ.
- [MAY-ALLOW] The same file (e.g., concepts.md) appearing in multiple agents' domain document lists. If the reference context differs per agent, retain; if it is mere listing, extraction into a common reference is possible.

### Learning and Promotion

- [MAY-ALLOW] The same content temporarily coexisting in project learning items and promoted domain documents. Project learning items should be removed after promotion is complete, but temporary duplication during the promotion process is allowed.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Role Duplication

- [MUST-REMOVE] Duplicate agent definitions for the same role — Agents with different names but identical judgment criteria and assigned documents existing in 2 or more instances. Maintaining both causes verification result conflicts or unnecessary repeated execution.
- [SHOULD-REMOVE] Judgment criteria duplicately described in both role definition files and process documents — The authoritative source for judgment criteria is the role definition file, so process documents should reference only the role name.

### Navigation and History Mixing

- [MUST-REMOVE] Change history mixed into navigation index — INDEX.md describing both file lists (navigation) and change logs (history). Since navigation structure and change history have different update cycles and consumption purposes, separation is mandatory.
- [SHOULD-REMOVE] Change history fields and navigation relationship fields mixed in frontmatter — Frontmatter describes current-state metadata, so change history should be delegated to git or a separate history file.

### Structural Duplication

- [MUST-REMOVE] Multiple paths to the same concept file — The same concept existing in different directories under different filenames. By the "File = Concept" equation, one concept must be expressed as exactly one file.
- [SHOULD-REMOVE] System map structural descriptions that list only information completely identical to individual file frontmatter — The system map should show overviews and relationships; simple copies of frontmatter cause update omissions.

### Constraint Duplication

- [SHOULD-REMOVE] Rules from structure_spec.md re-described in individual file bodies — The authoritative source for constraints is structure_spec.md, so individual files should maintain only references.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (token budget, frontmatter schema, traversal depth limit) apply?
3. **Consumer difference**: Do different consumers (humans, LLMs, automation scripts) require the classification?

Examples:
- `Concept file` and `meta file` have different constraints (frontmatter schema, "File = Concept" equation applicability), so the classification is justified.
- If `navigation index` and `system map` list only the same files in the same directory with no additional information, they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the specific application cases in the llm-native-development domain.

### onto_pragmatics Boundary

- onto_conciseness: Does an unnecessary element **exist**? (structural level)
- onto_pragmatics: Does unnecessary information **waste** the LLM's context window? (execution level)
- Example: A deprecated concept file remains in the directory → onto_conciseness. A valid but currently unnecessary file is included in the reference chain → onto_pragmatics.

### onto_coverage Boundary

- onto_conciseness: Is there something that should not be there? (reduction direction)
- onto_coverage: Is there something missing that should be there? (expansion direction)
- Example: An agent role is defined but has no assigned domain document → onto_coverage. Two agents with identical judgment criteria are defined → onto_conciseness.

### onto_logic Boundary (preceding/following relationship)

- onto_logic precedes: Determines logical equivalence (implication)
- onto_conciseness follows: Decides whether to remove after equivalence is confirmed
- Example: A rule in structure_spec.md implies a constraint in an individual file body → onto_logic determines equivalence → onto_conciseness determines "re-description in individual file is unnecessary."

### onto_semantics Boundary (preceding/following relationship)

- onto_semantics precedes: Determines semantic identity (synonym status)
- onto_conciseness follows: Decides whether merging is needed after synonym is confirmed
- Example: system map / architecture overview / structure guide are the same concept → onto_semantics determines synonym → onto_conciseness determines "consolidate into one canonical term."

---

## 5. Quantitative Criteria

Thresholds observed in this domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — Term definitions, synonym mappings, homonym list (semantic criteria for duplication determination)
- `structure_spec.md` — Frontmatter specifications, file type classification (structural-perspective removal criteria)
- `competency_qs.md` — Competency question list (criteria for judging "actual difference" in minimum granularity)
- `dependency_rules.md` — Reference chains and direction rules (basis for allowing reference copies)
- `domain_scope.md` — Domain scope, required concept categories (scope reference for duplication determination)
