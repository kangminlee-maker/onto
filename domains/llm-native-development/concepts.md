---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# LLM-Native Development Domain — Concept Dictionary and Interpretation Rules

## Domain Inheritance

This domain inherits from `software-engineering/concepts.md`. Inherited terms follow the parent domain's definitions unless explicitly redefined. Below is the redefinition list:

| Term | Parent Domain Definition | This Domain Redefinition | Change Scope |
|------|------------------------|-------------------------|-------------|
| model | domain model (business object) | domain model (concept structure) | Parenthetical description changed — refers to file-based concept structure, not business objects |

## File Type Classification

In this domain, files are classified into two types:

- **Concept file**: A file that defines a single domain concept. The "File = Concept" equation applies
- **Meta file**: A file that does not define concepts but describes the system's structure. INDEX.md, ARCHITECTURE.md, README.md, LLM instruction files (CLAUDE.md, AGENTS.md, .cursorrules, etc.) are included. Excluded from the "File = Concept" equation

## File/Document Structure Terms

- Frontmatter = the YAML block at the top of a file. Records metadata such as title, type, and relationships in a machine-readable format. **Source of truth is structure_spec.md**
- Navigation Index = a meta file summarizing the file list within a directory and each file's role (INDEX.md or README.md)
- System Map = a meta file representing the entire system's structure as a single document (ARCHITECTURE.md, llms.txt)
- Code Map = a document that provides a compressed summary of the codebase's core architecture. Size and coverage scope are determined per project

## Design Principle Terms

- Self-Describing = the property that content and role can be understood from the filename, folder name, and structure alone
- Colocation = the principle of placing related concepts together in the same directory
- Spec-First = the development order of finalizing feature specifications via spec.md before writing implementation code
- Ontology-as-Code = the approach of managing domain knowledge as declarative, structured files with version control and automated conformance verification
- Living Document = a document whose accuracy is continuously maintained through verification, update, and suggestion cycles

## Context Management Terms

- Context Window = the maximum number of tokens an LLM can process at once. Varies by model and configuration
- Token Budget = the upper token limit allocable to a single file or task. Specific values are defined in structure_spec.md
- Traversal Depth = the number of file references that must be traversed from the entry point to the target information
- Reference Chain = sequential reference relationships such as file A → file B → file C. Direction and cycle rules are defined in dependency_rules.md
- Minimal Traversal = design that minimizes the number of files needed to reach target information

## Agent/Role Terms

- Agent Role = a unit that verifies or performs tasks on the system from a specific perspective. Role definitions are described in individual files in the roles/ directory
- Domain Document = a domain-specific reference file that an agent uses as its judgment criteria. Agent-document mapping is defined in process.md
- Learning = a pattern or rule discovered by an agent during work. Type-tagged as [fact] or [judgment]. Goes through accumulation → verification → promotion
- Promote = the procedure by which project-level learning items are integrated into domain-level documents. Requires explicit user approval

## Homonyms Requiring Attention

- "context": context window (LLM token limit) != execution context (runtime) != bounded context (DDD)
- "model": domain model (concept structure, this domain's redefinition) != LLM model (AI system) != data model (schema)
- "scope": domain scope (coverage area) != variable scope (visibility range) != project scope (work range)
- "rule": logic rule (conformance constraint) != lint rule (code style) != business rule (domain logic)
- "index": navigation index (directory guide, meta file) != DB index (search optimization) != array index (order reference)

## Interpretation Principles

These principles apply to individual concept files within this domain. They do not apply to this file itself, which defines the interpretation principles.

- If a filename does not match the content, the side conforming to structure_spec.md's filename rules is prioritized for review
- If frontmatter metadata and body content conflict, frontmatter takes precedence. Frontmatter is subject to mechanical conformance verification and is therefore more strictly managed
- Hierarchical relationships expressed in folder structure are explicit declarations. The interpretation "it was placed there for convenience" is not made

## Related Documents
- domain_scope.md — Domain definition where these terms are used
- structure_spec.md — Source of truth for frontmatter specifications
- dependency_rules.md — Details of reference chains and direction rules
