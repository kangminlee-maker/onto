# LLM-Native Development Domain — Dependency Rules

## Reference Direction Rules

### Inter-Layer Direction
- System Map (ARCHITECTURE.md) → Directory Index (INDEX.md) → Individual Documents: Allowed (upper → lower)
- Individual Documents → System Map: Prohibited (lower → upper reversal). Individual documents may reference only same-level or lower-level documents

### Inter-Type Direction
- Domain Documents → Process Documents: Prohibited. Domain must be independent of process
- Process Documents → Domain Documents: Allowed. Processes reference domain knowledge
- Role Documents → Domain Documents: Allowed. Roles read domain documents as judgment criteria

### Same-Type Document Direction
- References between domain documents of the same type: Allowed (e.g., concepts.md ↔ structure_spec.md)
- Bidirectional references are allowed, but cycles are prohibited (see "Cycle Exception Clause" below)
- When referencing, specify in the "Related Documents" section

### Inter-Domain Direction
- Child (specialized) domain → Parent (general) domain: Allowed (e.g., llm-native-development → software-engineering)
- Parent (general) domain → Child (specialized) domain: Prohibited
- Same-level domains: Bidirectional allowed, but cycles are prohibited

## Acyclicity Mandatory Relationships

- Document reference graph: Acyclic (DAG). Circular references cause LLM infinite traversal

### Cycle Exception Clause
- Bidirectional references (A↔B) arising from the bidirectional relationship requirement in logic_rules.md are cycle exceptions
- When cycles are unavoidable: Declare bidirectional references in frontmatter and record the reference reason
- Cycle exceptions allow only 2-node bidirectional (A↔B). 3-node or more cycles (A→B→C→A) are prohibited

## Referential Integrity

- File paths listed in frontmatter's depends_on, related_to, etc. must actually exist
- When a file is moved/deleted, all frontmatter referencing that file must be updated
- Files registered in INDEX.md must actually exist in that directory

### Inheritance Referential Integrity
- The parent domain path referenced in concepts.md's inheritance declaration must actually exist
- Terms in the redefinition list must actually exist in the parent domain's concepts.md
- When parent domain terms are deleted/moved, child domain inheritance declarations must also be updated

### Source of Truth for Redefinitions
- Terms in the redefinition list: The child domain (llm-native-development) is the source of truth
- Terms not in the redefinition list: The parent domain (software-engineering) is the source of truth

## External Reference Management

- External URL references: Used only in body text. Frontmatter relationship fields may only contain project-internal file paths
- External standard/framework references: Record the standard's version or access date alongside

## Duplication Prevention Rules

- If the same content exists in 2 or more files → Designate one as the source of truth and replace others with references
- If similar concepts are defined under different names in separate files → Consolidate or explicitly state the differences
- If INDEX.md descriptions and the original file's frontmatter description conflict → Frontmatter takes precedence (INDEX.md is the source of truth for file existence and location; frontmatter is the source of truth for file attributes)

## Change Atomicity

- When a single concept change spans multiple files, all changes are reflected in a single commit
- The unit of change is "one concept addition/modification/deletion"

## Related Documents
- logic_rules.md — Bidirectional relationship requirement (linked to this file's cycle exception clause)
- structure_spec.md — Frontmatter specifications, INDEX.md role definition
- concepts.md — Domain inheritance declaration
