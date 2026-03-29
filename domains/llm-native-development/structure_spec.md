---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# LLM-Native Development Domain — Structure Specification

## Project Required Files (Meta Files)

| Role | Filename | Location | Description | Constraints |
|------|---------|----------|-------------|-------------|
| LLM Instruction File | Per project convention | Project root | Delivers project instructions to the LLM. Include only information without which work would fail | 300 lines or fewer |
| Structure Map | ARCHITECTURE.md or llms.txt | Project root | Structure map of the entire system. Directory structure, each directory's role, key file list | All top-level directories mentioned |
| Navigation Index | INDEX.md | 1 per directory | File list within the directory and a one-line description of each file. Source of truth for file existence | — |
| Human-Readable Guide | README.md | Each directory (optional) | Can be used instead of INDEX.md. Human-readability focused | When coexisting with INDEX.md, INDEX.md takes precedence |
| Feature Specification | spec.md | Feature directory | Feature specification before implementation. Includes requirements, architecture decisions, test strategy | Same directory as implementation files |

**Vendor-Specific LLM Instruction File Conventions:**
| LLM Ecosystem | Filename | Notes |
|--------------|---------|-------|
| Claude Code | CLAUDE.md | Can be placed at project root + per subdirectory |
| Cursor | .cursorrules | Project root |
| GitHub Copilot | .github/copilot-instructions.md | .github directory |
| Windsurf | .windsurfrules | Project root |
| General (AGENTS.md standard) | AGENTS.md | Managed by Linux Foundation, multi-agent support |

Select the filename matching the LLM ecosystem used by the project. When using multiple LLM ecosystems simultaneously, instruction files for each ecosystem can be placed in parallel.

## Frontmatter Specification (Source of Truth)

This section is the source of truth for all rules regarding frontmatter. When other files (logic_rules.md, dependency_rules.md) reference frontmatter, they follow this definition.

### Required Fields
- `title`: File title (string)
- `type`: File type. Allowed values: `concept`, `rule`, `spec`, `index`, `architecture`, `config`
- `description`: One-line description (string)

### Relationship Fields (Optional)
- `depends_on`: List of file paths this file depends on
- `related_to`: List of related file paths (undirected association)
- `parent`: Parent concept file path

### Change Tracking Fields (Optional)
- `last_updated`: Last update date (YYYY-MM-DD). Can be omitted when delegated to git
- `update_reason`: Last update reason (string). Can be omitted when delegated to git

## File Structure Required Elements

- **Body**: Markdown format. One H1 title per file, structured with subsections (H2~H3)
- **File size**: Single file 500 lines or fewer recommended. When exceeded, review concept separation. This value is an empirical criterion considering context efficiency of current major LLMs (128K~1M tokens)

## Directory Structure Rules

- Maximum depth: 3 levels (e.g., domains/software-engineering/concepts.md). This value is an empirical criterion for minimizing LLM traversal cost
- Each directory expresses a single concern
- Directory names use plural nouns or domain names (e.g., domains, roles, processes)
- Do not create directories containing only a single file. Place the file in the parent directory
- Recommended files per directory: 3~20. When exceeding 20, review subdirectory separation or sub-index introduction

## Filename Rules

- Use snake_case (e.g., domain_scope.md, logic_rules.md)
- Filenames directly express the content's role
- Reserved filenames and roles (see "Project Required Files" table above): ARCHITECTURE.md, INDEX.md, README.md, spec.md, llms.txt, and each LLM ecosystem's instruction file
- Avoid order representation using numeric prefixes. Order is specified in INDEX.md

## Reference Chain Upper Limit

- Files that must be read to perform one task: 5 or fewer recommended. "Task" is defined per scenario in extension_cases.md. This value is an empirical criterion considering LLM context window utilization efficiency

## Required Relationships

- Every concept file must be referenced by at least 1 other document, or registered in INDEX.md
- Every directory must contain INDEX.md or README.md
- ARCHITECTURE.md must mention all top-level directories and their roles

## Isolated Element Prohibition

- Concept files referenced by nothing → warning (isolated document)
- Files not registered in INDEX.md → warning (unregistered file)
- Concept files with no relationships in frontmatter → warning (relationships undefined)

## Related Documents
- concepts.md — File type (concept file vs meta file) definition
- logic_rules.md — Frontmatter conformance rules (references this file's specification)
- dependency_rules.md — Referential integrity rules (references this file's specification)
