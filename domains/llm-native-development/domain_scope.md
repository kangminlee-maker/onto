# LLM-Native Development Domain — Domain Scope Definition

The reference document used by onto_coverage when identifying "what should be there but is missing" in an LLM-native system.

## Application Scope

This domain applies when designing and building systems where LLMs are the primary consumers and producers.
**The rules of this domain apply to both LLM reading (consumption) and writing (generation).**

## Key Sub-Areas

Classification axis: **Concern** — Classified by the design concern each area addresses. Required/optional distinction is specified in each area's description.

### Knowledge Structuring
The structural foundation needed for LLMs to explore, understand, and generate domain knowledge.

- **Domain Knowledge Encoding** (required): Encoding concepts at the file level. YAML frontmatter + Markdown body format. Inter-concept relationships specified in frontmatter
- **Naming and Navigation** (required): Filenames and folder names directly express content roles. Navigation index (INDEX.md) provided. Directory depth limited
- **System Map** (required): ARCHITECTURE.md or llms.txt providing the entire structure as a single document. Supports progressive detail (overview → detail)
- **Concept Dictionary and Relationship Types** (required): Domain term definitions, homonym handling, relationship type classification (is-a, part-of, depends-on, etc.)

### Development Process
The procedures and criteria that LLMs must follow when generating artifacts.

- **Spec-First Development** (required): Write spec.md before implementation. Maintain traceability between spec and implementation
- **Document Lifecycle** (required): Document creation, update, and deprecation procedures. Conformance verification triggers
- **Change Tracking** (required): Definition of change atomicity. Diff readability criteria. Update history management (delegated to git or frontmatter recording)

### Consumption Interface
Design constraints for LLMs to efficiently consume the system.

- **Context Window Design** (required): Single file token budget management. Reference chain depth limits. Minimal traversal path from entry point to target
- **Prompt/Interface Design** (required): System prompt structure. Tool definitions (tool schema). Response format constraints (structured output). Role definition document structure

### Quality Assurance
Criteria for verifying the conformance of LLM artifacts and the system itself.

- **Verification Criteria** (required): Criteria for determining correctness of LLM artifacts. Frontmatter schema verification, referential integrity checking
- **Verification Procedures** (scale-dependent): Timing, order, and automation level of verification execution

### Collaboration and Scaling
Design for multi-agent environments and scale expansion.

- **Agent Role System** (required): Agent role separation, role-domain document mapping, shared knowledge structure
- **Learning Accumulation System** (scale-dependent): Storage, promotion, and application paths for knowledge discovered by agents
- **Domain Switching** (scale-dependent): Reuse strategy for applying the same structure to different domains

### Physical Layout
Rules for file/folder physical structure.

- **Monorepo Configuration** (scale-dependent): Unified management of domains, processes, and roles in a single repository
- **Layer Design** (required): 3-layer structure of domain → process → role, or similar hierarchy

## Required Concept Categories

Concept categories that must be addressed in any LLM-native system.

| Category | Description | Risk if Missing |
|----------|------------|----------------|
| Entry path | The starting file the LLM should read when first encountering the system | Exploration cost explosion, context waste |
| Concept definition | Domain term definitions and relationships | Interpretation inconsistency, hallucination |
| Navigation path | Explicit references for moving from file A to related file B | Isolated documents, severed reasoning |
| Constraints | Explicit rules for structure, naming, and format | Consistency collapse, automation impossible |
| Change history | Document change reasons and timing | Context-free updates, regressions |
| Role definition | Agent perspective, judgment criteria, assigned documents | Verification omission, role overlap |

## Reference Standards/Frameworks

| Standard | Application | Usage |
|----------|-----------|-------|
| llms.txt specification | System map, context window design | Entry point structure, progressive detail pattern reference |
| Diataxis documentation framework | Document lifecycle | Document type classification (Tutorial/How-to/Reference/Explanation) criteria |
| Ontology Design Patterns | Concept dictionary, relationship types | Relationship pattern (is-a, part-of, has-role) classification criteria |
| LLM instruction file conventions (CLAUDE.md, AGENTS.md, .cursorrules, etc.) | System map, Spec-First | Structure and size limit criteria for project-specific LLM instruction documents. Vendor-specific conventions reference structure_spec.md |

## Bias Detection Criteria

- If 3 or more of the 6 concern areas are not represented at all → **insufficient coverage**
- If only reading (consumption) structure exists without writing (generation) structure → **producer perspective absent**
- If only document creation procedures exist without update/deprecation procedures → **lifecycle incomplete**
- If only single-agent use is assumed without multi-agent scenarios → **scalability bias**
- If only generation rules exist without verification criteria → **quality assurance absent**

## Related Documents
- concepts.md — Term definitions within this scope
- structure_spec.md — Specific rules for physical layout
- competency_qs.md — Questions this scope must be able to answer
