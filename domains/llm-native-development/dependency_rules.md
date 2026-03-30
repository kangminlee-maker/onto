---
version: 2
last_updated: "2026-03-30"
source: manual
status: established
---

# LLM-Native Development Domain — Dependency Rules

Classification axis: **linkage type** — dependencies and connections classified by the type of relationship between components, documents, and sub-areas within LLM-powered systems.

## Inter-Area Dependency Map

The 8 sub-areas defined in domain_scope.md interact through three distinct dependency flows: runtime data flow, design-time constraint flow, and feedback loops.

### Runtime Data Flow

Direction: data flows from left to right toward model output.

```
3 (Retrieval) → 2 (Prompt) → 1 (Model) → output
                                   ↑
4 (Agentic) ──── tool calls ──────┘
```

- Area 3 (Retrieval & Knowledge Systems) produces retrieved content that Area 2 (Prompt & Context Design) assembles into model input
- Area 2 constructs the complete prompt and sends it to Area 1 (Model Integration) for inference
- Area 4 (Agentic Systems) orchestrates multi-step workflows by issuing tool calls through Area 1

### Design-Time Constraint Flow

Direction: constraints propagate from the constraining area to the constrained area.

```
1 (Model capability) → constrains → 2 (Prompt design)
1 (Model capability) → constrains → 3 (Retrieval chunk size)
6 (Safety policy)    → constrains → 2 (Prompt design), 4 (Agent behavior)
5 (Eval criteria)    → constrains → all areas
```

- Area 1 constraints (context window size, supported output formats, tool calling capabilities) determine what Area 2 can construct and what chunk sizes Area 3 must produce
- Area 6 (Safety & Alignment) constraints (content policies, guardrail requirements) restrict what Area 2 may include in prompts and what actions Area 4 agents may take
- Area 5 (Evaluation & Testing) criteria serve as acceptance conditions for all areas — each area's output must satisfy its relevant evaluation criteria

### Feedback Loops

Intentional cycles that exist between areas. Each must have an explicit termination condition.

**Loop 1 — Evaluation ↔ Adaptation (→Area 5, →Area 8)**:
- Area 5 evaluation results drive fine-tuning decisions in Area 8 (Data & Model Adaptation). The fine-tuned model is then re-evaluated by Area 5.
- Termination: quality threshold met OR training budget exhausted.

**Loop 2 — Drift Correction (→Area 7, →Area 2, →Area 1)**:
- Area 7 (Production Operations) detects output quality drift → Area 2 adjusts prompts → Area 1 produces new output → Area 7 monitors the result.
- Termination: drift metric returns to baseline.

**Loop 3 — Production Re-evaluation (→Area 7, →Area 5)**:
- Area 7 production metrics trigger re-evaluation by Area 5. This is one-directional (not a cycle): Area 7 informs Area 5, and Area 5 may then inform other areas independently.

## Inter-Area Direction Rules

Each rule specifies the direction of dependency or data flow between two areas.

| Source | Target | Relationship | Direction |
|--------|--------|-------------|-----------|
| Area 3 (Retrieval) | Area 2 (Prompt) | Retrieval provides content to prompt construction | 3 feeds 2 |
| Area 2 (Prompt) | Area 1 (Model) | Constructed prompt is sent to model for inference | 2 feeds 1 |
| Area 4 (Agentic) | Area 1 (Model) | Agent issues tool calls through model | 4 orchestrates 1 |
| Area 6 (Safety) | Area 2 (Prompt), Area 4 (Agentic) | Safety constrains prompt design and agent behavior | 6 constrains 2, 4 |
| Area 5 (Evaluation) | All areas | Evaluation criteria are references, not hard dependencies. All areas may be evaluated | 5 evaluates all |
| Area 8 (Adaptation) | Area 1 (Model) | Adapted model replaces or supplements base model | 8 produces, 1 consumes |
| Area 7 (Operations) | Area 5 (Evaluation) | Operational metrics inform evaluation priorities | 7 informs 5 |

**Reverse direction prohibition**: An area that is fed, constrained, or consumed must not impose structural requirements back on the feeding/constraining area. For example, Area 1 (Model) must not require Area 2 (Prompt) to use a specific prompt template — Area 1 exposes capabilities, and Area 2 decides how to use them.

## Diamond Dependencies

A diamond dependency occurs when two areas share a common upstream dependency, creating a potential for conflicting requirements.

**Primary diamond: 4 ← {2, 3} ← 1**

Area 4 (Agentic Systems) depends on both Area 2 (Prompt & Context Design) and Area 3 (Retrieval & Knowledge Systems). Both Area 2 and Area 3 are constrained by Area 1 (Model Integration) — specifically by context window size, supported output formats, and tool calling capabilities.

Resolution:
- Area 1 constraints propagate independently to Area 2 and Area 3. Each area adapts to model constraints within its own scope.
- Conflict scenario: Area 2 and Area 3 could impose contradictory requirements on each other (e.g., Area 2 demands more token budget for instructions while Area 3 demands more for retrieved content).
- Conflict prevention: The handoff point defined in domain_scope.md (Area 3 boundary ends at retrieval results returned; Area 2 boundary begins at assembling results into prompt) ensures that token budget allocation is Area 2's responsibility, not Area 3's. Area 3 returns ranked results, and Area 2 decides how many to include.

## Truth Source Hierarchy

When multiple sources provide guidance on the same LLM system design question, defer to the higher-priority source. Document any conflict and its resolution.

| Priority | Source | Authority Level |
|----------|--------|----------------|
| 1 | Model provider documentation (Anthropic, OpenAI, Google) | Normative for model behavior. Defines what the model can and cannot do, correct API usage, and known limitations. Overrides all other sources for model-specific questions |
| 2 | Protocol specifications (MCP, A2A, OpenAPI for tool schemas) | Normative for integration interfaces. Defines correct interaction patterns between system components |
| 3 | Framework documentation (LangChain, LlamaIndex, LangGraph) | Informative for implementation. Describes available abstractions and their intended usage. May deviate from model provider guidance — when conflict occurs, defer to level 1 |
| 4 | Community best practices (Chip Huyen "AI Engineering", applied-llms.org, Anthropic/OpenAI guides) | Informative for patterns and trade-offs. Reflects practitioner experience. Follow unless domain-specific requirements dictate otherwise |
| 5 | Internal conventions (project CLAUDE.md, spec.md, onto domain files) | Local authority. Must not contradict levels 1-2. May deviate from levels 3-4 with documented rationale |

## External Dependency Management

LLM-powered systems depend on external services and libraries that evolve independently. Each dependency type has specific management requirements.

### Model API Dependencies (→Area 1)

- Model version must be pinned (e.g., `claude-sonnet-4-20250514`, not `claude-sonnet-4-latest`) in production environments. Unpinned versions may change behavior without warning.
- Breaking changes include: model deprecation, behavior changes between versions, pricing changes, rate limit changes, API format changes.
- Each breaking change requires a migration plan: (1) identify affected components, (2) evaluate replacement model, (3) run Area 5 evaluation suite against new model, (4) deploy with canary rollout via Area 7.

### MCP Server Dependencies (→Area 4)

- Server availability must be checked at startup. The agent must define fallback behavior for each MCP server: degrade gracefully (skip tools provided by the unavailable server) or halt (if the server provides critical capabilities).
- MCP server schema changes (tool parameter changes, new required fields) are breaking changes. Pin server versions or validate schemas at connection time.

### Embedding Model Dependencies (→Area 3)

- Changing the embedding model requires re-indexing all stored vectors. Embeddings from different models are incompatible — cosine similarity between vectors from different models is meaningless.
- Migration path: (1) generate new embeddings with new model, (2) run parallel retrieval evaluation (Area 5) comparing old and new, (3) switch over atomically, (4) delete old embeddings after validation period.

### Framework Dependencies (→Area 4, →Area 3)

- LangChain/LlamaIndex/LangGraph version upgrades may change default behavior (e.g., default prompt templates, default chunking strategies, default retrieval parameters).
- Pin framework versions in production. Upgrade only with explicit testing against Area 5 evaluation suite.
- When a framework abstracts away model-specific behavior, verify that the abstraction matches model provider documentation (Truth Source Hierarchy level 1 takes precedence over level 3).

## Metric Ownership Rules

Each metric in the system has exactly one owning area. Ownership is determined by the measurement purpose, not by the observable being measured.

| Measurement Purpose | Owning Area | Example Metric |
|---|---|---|
| Is the output correct? | Area 5 (Evaluation) | Answer accuracy, hallucination rate, factual grounding score |
| Is the output safe? | Area 6 (Safety) | Prompt injection detection rate, PII leak rate, policy violation rate |
| Is the system running efficiently? | Area 7 (Operations) | Response latency (p50/p95/p99), error rate, cost per request, throughput |
| Is the model training improving? | Area 8 (Adaptation) | Training loss, validation accuracy, fine-tuning convergence rate |

**Shared observable rule**: When the same observable (e.g., response latency) is measured for different purposes, each purpose's metric is owned by the respective area. For example:
- Response latency measured for SLA compliance → Area 7 (operational concern)
- Response latency measured as part of model comparison evaluation → Area 5 (evaluation concern)

These are distinct metrics with distinct owners, even though they measure the same underlying quantity.

## Document Reference Direction Rules

### Inter-Layer Direction

- System Map (ARCHITECTURE.md) → Directory Index (INDEX.md) → Individual Documents: Allowed (upper → lower)
- Individual Documents → System Map: Prohibited (lower → upper reversal). Individual documents may reference only same-level or lower-level documents

### Inter-Type Direction

- Domain Documents → Process Documents: Prohibited. Domain must be independent of process
- Process Documents → Domain Documents: Allowed. Processes reference domain knowledge
- Role Documents → Domain Documents: Allowed. Roles read domain documents as judgment criteria

### Same-Type Document Direction

- References between domain documents of the same type: Allowed (e.g., concepts.md ↔ structure_spec.md)
- Bidirectional references are allowed, but cycles are prohibited (see Cycle Exception Clause below)
- When referencing, specify in the Related Documents section

### Inter-Domain Direction

- Child (specialized) domain → Parent (general) domain: Allowed (e.g., llm-native-development → software-engineering)
- Parent (general) domain → Child (specialized) domain: Prohibited
- Same-level domains: Bidirectional allowed, but cycles are prohibited

## Acyclicity

- Document reference graph: Acyclic (DAG). Circular references cause LLM infinite traversal
- Inter-area dependency graph: Acyclic except for declared feedback loops (see Feedback Loops above). Each declared loop must specify a termination condition

### Cycle Exception Clause

- Bidirectional references (A↔B) arising from the bidirectional relationship requirement in logic_rules.md are cycle exceptions
- When cycles are unavoidable: Declare bidirectional references in frontmatter and record the reference reason
- Cycle exceptions allow only 2-node bidirectional (A↔B). 3-node or more cycles (A→B→C→A) are prohibited
- Feedback loops between areas (declared in Inter-Area Dependency Map) are also cycle exceptions, but must include termination conditions

## Referential Integrity

- File paths listed in frontmatter's `depends_on`, `related_to`, etc. must actually exist
- When a file is moved/deleted, all frontmatter referencing that file must be updated
- Files registered in INDEX.md must actually exist in that directory

### Inheritance Referential Integrity

- The parent domain path referenced in concepts.md's inheritance declaration must actually exist
- Terms in the redefinition list must actually exist in the parent domain's concepts.md
- When parent domain terms are deleted/moved, child domain inheritance declarations must also be updated

### Source of Truth for Redefinitions

- Terms in the redefinition list: The child domain (llm-native-development) is the source of truth
- Terms not in the redefinition list: The parent domain (software-engineering) is the source of truth

## Duplication Prevention Rules

- If the same content exists in 2 or more files → Designate one as the source of truth and replace others with references
- If similar concepts are defined under different names in separate files → Consolidate or explicitly state the differences
- If INDEX.md descriptions and the original file's frontmatter description conflict → Frontmatter takes precedence (INDEX.md is the source of truth for file existence and location; frontmatter is the source of truth for file attributes)

## Change Atomicity

- When a single concept change spans multiple files, all changes are reflected in a single commit
- The unit of change is "one concept addition/modification/deletion"
- When an inter-area dependency changes (e.g., Area 1 model capability changes that affect Area 2 prompt design and Area 3 chunk size), all affected areas' documentation must be updated atomically

## Related Documents

- domain_scope.md — Sub-area definitions, membership criteria, and handoff points referenced by inter-area rules
- logic_rules.md — Bidirectional relationship requirement (linked to this file's cycle exception clause)
- structure_spec.md — Frontmatter specifications, INDEX.md role definition
- concepts.md — Domain inheritance declaration, term definitions
- competency_qs.md — Dependency verification questions
