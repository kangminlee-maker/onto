# LLM-Native Development Domain — Logic Rules

## File–Concept Correspondence Logic

- One concept must be defined in exactly one concept file. If the same concept is defined in two files, it is a source of truth conflict
- A filename must represent the concept the file defines. A mismatch between filename and content is a self-describing violation
- If a concept file exists, it must define at least one concept. Empty files are not allowed
- Meta files (INDEX.md, ARCHITECTURE.md, etc.) do not define concepts and serve the role of specifying structural relationships among other files. They are excluded from the "File = Concept" correspondence

## Frontmatter Conformance Logic

- The specification for frontmatter (required fields, format) has structure_spec.md as its source of truth. When other files reference frontmatter, they follow structure_spec.md's definitions
- All references declared in frontmatter (depends_on, related_to, parent) must point to actually existing files
- The type field value in frontmatter must belong to the type list defined in the system. An undefined type is unclassifiable
- If a relationship declared in frontmatter is bidirectional, the reverse relationship must also exist in the target file's frontmatter. In this case, follow the cycle exception clause in dependency_rules.md

## Hierarchy Logic

- Directory hierarchy represents containment relationships of concepts. A parent directory must be a category encompassing the concepts in its child directories
- Files within the same directory must be concepts at the same abstraction level. If abstraction levels differ, separate into directories
- As directory depth increases, concepts become more specific. Depth reversal (child is more abstract) is a structural contradiction

## Navigation Path Logic

- A reference chain must exist from the entry point to any concept file. A file that cannot be reached is an isolated document
- If a reference chain has cycles, the LLM may fall into infinite traversal. Circular references must be explicitly marked in frontmatter (see cycle exception clause in dependency_rules.md)
- When A references B and B references C, if understanding C's content from A requires traversing through B, a direct A→C reference should be added (navigation shortcut)

## Change Propagation Logic

- When concept X's definition changes, all files referencing X are verification targets
- When adding a new concept file, if existing concept files require modification beyond the meta file (INDEX.md), it is a signal of high coupling. Homonym registration (concepts.md) is exceptionally allowed
- When deleting a file, all references to that file must be removed everywhere (referential integrity)

## Related Documents
- concepts.md — File type classification (concept file vs meta file) definition
- dependency_rules.md — Cycle exception clause, reference direction rules
- structure_spec.md — Source of truth for frontmatter specifications
