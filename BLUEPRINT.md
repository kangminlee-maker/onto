# Onto — System Blueprint

> **Authoring Standards**
>
> 1. **Audience**: Non-specialists (not developers or product developers).
>    With this document and an LLM alone, it must be possible to rebuild the **review** process
>    and produce the same verification results as onto.
>    Non-review processes (build, promote, etc.) are described at surface level only.
>
> 2. **Tense**: Describes only the current state. No past history (migrations, renames, deprecated models).
>
> 3. **Implementation status markers** — required on every feature and artifact:
>    - ✅ Implemented — code exists and is executable
>    - 📐 Design complete — design document finalized, no code yet
>    - 🔲 Not yet implemented — direction decided only
>
> 4. **Future direction**: Only decided items. No "under consideration" or "exploring."
>    Items with a decided direction but no implementation use 🔲 with a reference document.
>
> 5. **Terminology**: Uses canonical labels from `authority/core-lexicon.yaml`.
>    Legacy terms are mapped once at first mention and not used thereafter.
>
> 6. **Authority relationship**: This document is a derived re-description of primary sources.
>    When conflicts arise, the primary sources take precedence:
>    - Concepts: `authority/core-lexicon.yaml`
>    - Principles: `design-principles/*.md`
>    - Contracts: `processes/{feature}/*.md`
>    - Operations: `process.md`
>
> 7. **Update rule**: When a primary source changes, this document must be updated accordingly.
>    All updates must follow these authoring standards.
>
> 8. **Scope and self-sufficiency**: This document's reconstruction depth is centered on **review**.
>    The review process (§4.1, §7, §8) is described at reconstruction depth — enough to rebuild with an LLM.
>    Build and other processes are described at **surface level** (command, input, output, flow summary) — enough to understand what they do, not enough to rebuild from scratch.
>    For full reconstruction of non-review processes, consult the primary sources listed in standard 6.

> **Status and Reliance**
>
> This document is a **derived overview**, not a canonical authority.
> It re-describes primary sources for a non-specialist audience.
> When this document and a primary source disagree, the primary source wins — always.
>
> | Section | Reliance level | Primary source |
> |---|---|---|
> | §3 Review Lenses | Derived | `authority/core-lens-registry.yaml`, `roles/*.md` |
> | §4.1 Review flow | Derived | `processes/review/productized-live-path.md` |
> | §4.3 Build flow | Surface summary | `processes/build.md` |
> | §5 Domain System | Derived | `process.md` Domain Documents section |
> | §6 Learning System | Derived | `learning-rules.md` |
> | §7 Execution Profile | Derived | `process.md` Agent Teams Execution section |
> | §8 Review Runtime | Derived | `package.json`, `src/core-runtime/cli/*.ts` |
> | §10 Implementation Status | Snapshot | May lag behind code changes |

---

## 1. System Identity

### What It Is

onto is a **Claude Code plugin** that runs inside Claude Code (an AI coding tool operating in the terminal) via slash commands (`/onto:review`, `/onto:build`, etc.).

Two core capabilities:

1. **Verification (review)** ✅: 9 independent review lenses inspect a scope-defined target, then a separate synthesize stage writes the final review result
2. **Build** ✅: Incrementally constructs ontologies (structured domain knowledge representations) from analysis targets using integral exploration

### Why It Exists

Verifying from a single perspective misses problems in certain dimensions. Something logically consistent may be unqueryable in practice; something structurally complete may break when a new domain is added; something technically correct may have drifted from its original purpose.

onto addresses this with **9 review lenses** that each evaluate independently from a unique verification dimension, plus a **synthesize stage** that integrates their findings into a final result.

### Core Design Principles

| Principle | Meaning | Without This |
|---|---|---|
| **Multi-perspective independent verification** | 9 lenses judge independently without knowing each other's results | Anchoring bias from being influenced by prior opinions |
| **Purpose alignment verification** | onto_axiology reinterprets findings from the perspective of purpose and values | Results that meet criteria but diverge from original purpose |
| **Context-isolated reasoning** | Each lens runs in its own isolated context (ContextIsolatedReasoningUnit) | Main context saturation; lenses copy each other's drift |
| **Domain-independent design** | Verification dimensions (logic, structure, dependency...) apply regardless of domain | A separate system would be needed for each domain |
| **Learning accumulation** | Lenses record learnings from each execution and use them in subsequent ones | Repeating the same mistakes or losing previous context |

---

## 2. Canonical Concepts

Terms used throughout this document. All definitions follow `authority/core-lexicon.yaml`.

| Term | Definition |
|---|---|
| **review lens** | An independent review perspective that produces its own finding before synthesis. The canonical lens set is defined in `authority/core-lens-registry.yaml` |
| **onto_synthesize** | The non-lens stage that integrates lens findings into a final review result. Not a lens itself |
| **InvocationInterpretation** | LLM-owned phase that interprets natural-language user input into entrypoint, target candidates, intent, and ambiguity |
| **InvocationBinding** | Runtime-owned deterministic phase that binds interpreted input into canonical requests and concrete refs |
| **ReviewRecord** | Canonical output of review; structured lineage record consumed by later learning/governance |
| **ContextIsolatedReasoningUnit** | A reasoning unit that does not share main-context state, consumes contract-bounded input, and produces contract-bounded output independently. Typical realizations: Agent Teams teammate, subagent, MCP-isolated LLM, external model worker |
| **execution_realization** | Structural realization used to execute review units. Values: `subagent`, `agent-teams` |
| **host_runtime** | Concrete host environment running a chosen execution realization. Values: `codex`, `claude` |
| **LensSelectionPlan** | Interpretation-owned plan that recommends full/light review and the lens set to execute |
| **DomainFinalSelection** | Final domain value after explicit token parsing and user confirmation |
| **DeterministicStateEnforcer** | Runtime state machine that deterministically enforces review process state transitions. States and edges defined in `authority/core-lexicon.yaml` 📐 |
| **domain document** | Documents defining verification criteria for a specific domain. Types defined in `process.md` Domain Documents table. Referenced by lenses during judgment |
| **learning** | Lessons lenses discover during review/query. Tagged with axis (methodology/domain) and purpose type |
| **seed** | LLM-generated draft domain documents in `~/.onto/drafts/`. Contains SEED markers. Not used as verification standards |
| **established** | Domain documents in `~/.onto/domains/` with zero SEED markers. Used as verification standards |

Legacy term mapping (for reference only — not used elsewhere in this document):

| Legacy Term | Current Canonical |
|---|---|
| Philosopher | onto_axiology (value/purpose alignment) + onto_synthesize (synthesis stage) |
| agent panel | 9 review lenses |
| agent | review_lens |
| execution_mode | execution_realization × host_runtime (2-axis model) |

---

## 3. Review Lenses

### 3.1 The 9 Lenses

Each lens has a unique verification dimension and evaluates the same target independently.

#### onto_logic — Logical Consistency Verifier

**Verification target**: Contradictions between definitions, type conflicts, constraint clashes

**Procedure**:
1. Extract all explicit and implicit axioms
2. Verify logical compatibility between axiom pairs
3. Confirm type hierarchy consistency
4. Check whether constraints conflict with each other

**Domain document**: `logic_rules.md`

---

#### onto_structure — Structural Completeness Verifier

**Verification target**: Isolated elements, broken paths, missing relations, unreachable nodes

**Procedure**:
1. Construct all elements and relations as a graph
2. Detect isolated nodes with no connections
3. Confirm both ends of each relation are defined
4. Path completeness verification

**Domain document**: `structure_spec.md`

---

#### onto_dependency — Dependency Integrity Verifier

**Verification target**: Circular dependencies, reverse dependencies, diamond dependencies

**Procedure**:
1. Construct all dependency relations as a directed graph
2. Detect circular references
3. Check for hierarchy direction violations
4. Diamond dependency analysis

**Domain document**: `dependency_rules.md`

---

#### onto_semantics — Semantic Accuracy Verifier

**Verification target**: Misalignment between names and actual meanings, synonyms, homonyms

**Procedure**:
1. Compare all terms' names against their definitions
2. Detect synonym candidates (similar definitions, different names)
3. Detect homonym candidates (same name, different definitions)
4. Verify mapping against standard terminology

**Domain document**: `concepts.md` (accumulable)

---

#### onto_pragmatics — Pragmatic Fitness Verifier

**Verification target**: Whether queries are actually possible, whether competency questions can be answered

**Procedure**:
1. Load the domain's competency question list
2. Verify whether each question can be answered with the current structure
3. Identify missing elements for unanswerable questions
4. Verify whether query paths are practical

**Domain document**: `competency_qs.md` (accumulable)

---

#### onto_evolution — Evolution Fitness Verifier

**Verification target**: Whether existing structure breaks when adding new data, domains, or requirements

**Procedure**:
1. Load extension scenarios
2. Simulate accommodation without modifying existing structure
3. Estimate impact scope and ripple effects
4. Classify critical cases where existing structure must be destroyed

**Domain document**: `extension_cases.md`

---

#### onto_coverage — Domain Coverage Verifier

**Verification target**: Missing subdomains, bias toward certain areas, gaps compared to standards

**Procedure**:
1. Load domain scope definition
2. Verify coverage of all areas in scope
3. Analyze bias in element counts by area
4. Detect gaps compared to domain standards

**Domain document**: `domain_scope.md` (scope-defining — this lens is ineffective without it)

---

#### onto_conciseness — Conciseness Verifier

**Verification target**: Duplicate definitions, over-specification, unnecessary distinctions

**Procedure**:
1. Detect identical or similar concepts defined redundantly
2. Detect re-declaration of constraints already guaranteed by parents
3. Detect subclassifications that make no actual difference
4. Detect unnecessary intermediate hierarchies

**Domain document**: `conciseness_rules.md`

---

#### onto_axiology — Purpose and Value Alignment Verifier

**Verification target**: Purpose drift, value conflicts, mission misalignment

**Procedure**:
1. Independently assess whether the target serves its declared purpose
2. Detect where detailed correctness has drifted from the original intent
3. Surface value conflicts, ethical concerns, and stakeholder impact
4. Present new perspectives that other lenses' dimensions do not cover

**Domain document**: None. Maintains a meta-perspective independent of domain.

**Special role**: onto_axiology is the only lens that may propose new perspectives. onto_synthesize must not invent new perspectives.

---

### 3.2 Synthesize Stage (onto_synthesize)

onto_synthesize has a fundamentally different role from the 9 lenses.

**Responsibilities**:
1. Classify lens findings into consensus / conditional consensus / disagreement / overlooked premises
2. Verify the logical rationale of consensus even for unanimous items
3. Present immediate actions and recommendations
4. Produce the final review result

**Key constraints**:
- Does not invent new independent perspectives (that is onto_axiology's role)
- Preserves and positions perspectives that onto_axiology proposed
- Is not a lens — it integrates, not verifies

### 3.3 Verification Dimension Coverage

| Dimension | Question | Covering Lenses |
|---|---|---|
| Formal consistency | No contradictions between definitions? | onto_logic, onto_dependency |
| Semantic accuracy | Each concept accurately represents its target? | onto_semantics |
| Structural completeness | All internal connections exist without gaps? | onto_structure |
| Domain coverage | All relevant concepts represented? | onto_coverage |
| Minimality | No unnecessary elements? | onto_conciseness |
| Pragmatic fitness | Serves the actual use purpose? | onto_pragmatics |
| Evolution adaptability | Can adapt to changes? | onto_evolution |
| Purpose alignment | Serves the higher purpose without drift? | onto_axiology |

---

## 4. Processes

### 4.1 Review ✅

**Command**: `/onto:review {target}`
**Input**: Scope-defined documents, code, design proposals
**Output**: Final review report + ReviewRecord (structured artifact)

#### Canonical Live Path

```
user request
-> InvocationInterpretation (LLM interprets intent, target, domain)
-> User confirmation / selection
-> InvocationBinding (runtime binds to concrete refs)
-> Execution preparation artifacts
-> 9 lenses execute independently
-> onto_synthesize integrates findings
-> Human-readable final output
-> ReviewRecord (primary artifact)
```

#### Step Details

**Step 1 — InvocationInterpretation** ✅: LLM interprets the user's natural-language request to determine entrypoint, target scope candidates, intent, domain recommendation, LensSelectionPlan (full/light), and any ambiguity.
Output: `interpretation.yaml`

**Step 2 — User confirmation** ✅: If needed, the user confirms domain selection (DomainFinalSelection), full/light mode, and any overrides. This is the point where the user exercises final authority between semantic recommendation and deterministic binding.

**Step 3 — InvocationBinding** ✅: Runtime deterministically binds the interpretation to concrete values: resolved target scope, final domain, execution realization, host runtime, review mode, lens set, session root, and all artifact paths.
Output: `binding.yaml`

**Step 4 — Execution preparation** ✅: The following artifacts are materialized:
- `session-metadata.yaml` — deterministic execution metadata
- `execution-preparation/materialized-input.md` — execution-friendly materialization of the review target (the single authoritative basis lenses read)
- `execution-preparation/context-candidates/` — candidate context set for lenses
- `execution-plan.yaml` — per-lens output seats, boundary policies
- `prompt-packets/` — per-lens and synthesize handoff prompts (produced by `review:materialize-prompt-packets`)

**Step 5 — 9 lenses execute independently** ✅: Each lens runs as a ContextIsolatedReasoningUnit. In Round 1, no lens sees another's results. Each saves its finding as a file in the session directory.

**Step 6 — onto_synthesize** ✅: Reads all lens result files. Classifies into consensus / conditional consensus / disagreement / overlooked premises. Produces `synthesis.md`. Producer: the synthesize execution unit (not a lens — dispatched by `review:run-prompt-execution` after all lenses complete).

**Step 7 — Final output** ✅: Human-readable `final-output.md` rendered from synthesis. Producer: `review:render-final-output`.

**Step 8 — ReviewRecord** ✅: `review-record.yaml` assembled as the canonical primary artifact by `review:finalize-session`. This is what later learn/govern processes will consume. Assembled last because it aggregates all preceding artifacts including the final output.

#### Core Rules

- **File-based relay**: Lens results are saved as files and only the path is reported. The team lead's context does not carry per-lens detailed reasoning.
- **Even unanimity is verified**: The logical basis for consensus is separately confirmed.
- **Team lead does not intervene in content**: Relays results as-is without modification or summary.
- **Deliberation is conditional**: Only triggered when onto_synthesize determines contested points exist. Available only in `agent-teams` + `claude` profile. In other profiles, contested points are reported as-is in the disagreement section. When deliberation occurs, its output is saved to `deliberation.md` in the session directory.

#### Full vs Light Review

Review mode is determined during InvocationInterpretation (LensSelectionPlan) and confirmed by the user.

| Mode | Lens set | When to use |
|---|---|---|
| **full** | All lenses defined in `full_review_lens_ids` (canonical set in `authority/core-lens-registry.yaml`) | Default. Comprehensive multi-perspective verification |
| **light** | Subset defined in `light_review_lens_ids` (same registry) | Quick-pass review when time or token budget is limited. Fewer lenses, same process |

Both modes follow the same canonical live path. The only difference is which lenses execute in Step 5. onto_axiology is always included regardless of mode (`always_include_lens_ids` in the registry).

---

### 4.2 Individual Query ✅

**Command**: `/onto:ask-{dimension} {question}` (e.g., `/onto:ask-logic Is there a contradiction?`)
**Input**: A question for a specific verification dimension
**Output**: Answer from that single lens + learning record

Directly asks a single-dimension specialist. The lens loads its role definition + learnings + domain documents before answering.

Available dimensions: `logic`, `structure`, `dependency`, `semantics`, `pragmatics`, `evolution`, `coverage`, `conciseness`, `axiology`

---

### 4.3 Ontology Build ✅ (prompt-only — no TS bounded runtime)

**Command**: `/onto:build {path|URL}`
**Input**: Analysis target (code, spreadsheets, databases, documents)
**Output**: `raw.yml` — ontology extracted from the source

Build is currently executed entirely via the prompt-backed reference path. TS runtime productization follows the review-first strategy and is 🔲 not yet implemented.

Build uses an **integral exploration** structure because, unlike review, the scope is undefined.

#### Flow

```
Phase 0: Schema Negotiation — decide the ontology framework with the user
  4 options: Action-Centric / Knowledge Graph / Domain-Driven / Custom
  → Save schema.yml

Phase 0.5: Context Gathering — project scan + user questions
  → Save context_brief.yml

Phase 1: Integral Exploration Loop (2 Stages × max 5 rounds each)
  Stage 1 — Structure (see fact_type table below for Stage 1 types)
    Round 0: Explorer surveys overall structure (module list = coverage denominator)
    Round N:
      1. Explorer reports deltas (domain facts with structured_data)
      2. Lenses: attach labels (ontology types) + suggest epsilons (next directions)
      3. Coordinator: convert labels to patches → update wip.yml
      4. Coordinator: integrate epsilons, judge convergence
      5. Explorer: explore in integrated direction → new deltas
    Termination: (all modules explored ≥1) AND (new facts = 0)

  Stage 2 — Behavior (see fact_type table below for Stage 2 types)
    References Stage 1 confirmed Entities. Same integral loop.

Phase 2: Finalization — coordinator review, wip.yml → raw.yml
Phase 3: User Confirmation — certainty distribution, coverage, decision items
Phase 4: Storage — save raw.yml
Phase 5: Learning Storage
```

#### Key Concepts

**Explorer**: An agent that directly traverses the source and reports domain facts (deltas) without ontological interpretation. "The Payment class has status, amount, createdAt fields" (correct) vs. "Payment is an Aggregate Root" (incorrect — that is a lens's job). The reason: if the Explorer also interprets, lenses' independent judgment gets anchored.

**Delta**: A domain fact unit the Explorer reports. Contains `fact_type` and optional `structured_data` (fields specific to each type, e.g., name and fields for entity).

**Epsilon**: A "next direction to explore" suggested by lenses based on gaps found in deltas.

**Label**: An ontology type assigned by lenses to a delta (e.g., "this is an Entity").

**Patch**: The unit of change where the coordinator converts labels into ontology elements and applies them to wip.yml.

**fact_type** (10 types), partitioned by Stage:

| Stage 1 — Structure | Stage 2 — Behavior |
|---|---|
| `entity` | `state_transition` |
| `enum` | `command` |
| `property` | `query` |
| `relation` | `policy_constant` |
| `code_mapping` | `flow` |

**Certainty classification** (2-stage adjudication):

Stage 1 — Explorer assigns:
- `observed` — directly confirmed in source
- `pending` — cannot be confirmed from source alone

Stage 2 — Lenses refine `pending` into:
- `rationale-absent` — implementation exists but rationale does not
- `inferred` — reasonable inference, not directly verifiable
- `ambiguous` — multiple equally valid interpretations
- `not-in-source` — cannot be determined from this source

Each certainty level triggers different actions in Phase 3 (user confirmation).

---

### 4.4 Transform ✅

**Command**: `/onto:transform {file}`
**Input**: `raw.yml`
**Output**: Ontology in chosen format (Markdown, Mermaid, YAML, JSON-LD, OWL/RDF, Hybrid)

---

### 4.5 Onboard ✅

**Command**: `/onto:onboard`
**Output**: onto environment configured for the project

Sets up `.onto/` directories, domain declaration in `.onto/config.yml`, suggests domain document installation, optional Codex setup.

---

### 4.6 Learning Promotion ✅

**Command**: `/onto:promote`
**Input**: Project-level learnings
**Output**: Learnings promoted to global-level after review

Promotes learnings valid across projects. Includes tag re-evaluation, cross-duplication removal, judgment re-verification, and event marker review. All changes require user approval.

---

### 4.7 Domain Creation ✅

**Command**: `/onto:create-domain {name} {description}`
**Output**: 8 seed domain documents in `~/.onto/drafts/{name}/`

LLM generates all 8 document types. Low-confidence content is marked with SEED markers. Seeds are never loaded as verification standards.

---

### 4.8 Domain Feedback ✅

**Command**: `/onto:feedback {domain}`
**Output**: Updated seed documents with learnings incorporated

Feeds `[domain/{domain}]` learnings back into seed documents. User approval required for all changes.

---

### 4.9 Domain Promotion ✅

**Command**: `/onto:promote-domain {domain}`
**Output**: Domain moved from `~/.onto/drafts/` to `~/.onto/domains/`

Pre-checks zero SEED markers. After promotion, the domain becomes an established verification standard.

---

### 4.10 Backup ✅

**Command**: `/onto:backup` or `/onto:backup "reason"`
**Output**: Timestamped snapshot at `~/.onto/_backups/{backup-id}/`

---

### 4.11 Restore ✅

**Command**: `/onto:restore` (list) or `/onto:restore {backup-id}`
**Output**: Restored data + safety backup of pre-restore state

---

### 4.12 Health Dashboard ✅

**Command**: `/onto:health`
**Output**: Learning pool health metrics (axis distribution, purpose type distribution, judgment ratio, duplicate candidates)

---

## 5. Domain System

### 5.1 Domain Selection

Domains use a **per-session selection** model. Each process execution selects a single session domain.

**Project domains** and execution profile are declared in `.onto/config.yml`:
```yaml
domains:
  - software-engineering
  - ontology
output_language: ko            # en (default) | ko | etc.
execution_realization: subagent # subagent | agent-teams
host_runtime: codex             # codex | claude
codex:
  model: gpt-5.4               # omit → ~/.codex/config.toml
  effort: xhigh                 # omit → ~/.codex/config.toml
```

**Output language priority**: config.yml `output_language` > CLAUDE.md language directives. If absent, defaults to `en`.

**Selection methods**:

| Method | Syntax | Behavior |
|---|---|---|
| Explicit | `@{domain}` | Non-interactive, uses specified domain |
| No-domain | `@-` | Non-interactive, no domain rules applied |
| Interactive | (omit) | Analyze target → suggest domain → user confirms |

**No-domain mode**: Verifies using lens default methodology only. Learning tags: `[methodology]` only.

### 5.2 Domain Documents (8 Types)

Each domain has up to 8 reference documents. Each lens references the document corresponding to its dimension.

| Document | Used by Lens | Type | Description |
|---|---|---|---|
| `domain_scope.md` | onto_coverage | Scope-defining | Domain area definition. Lens is ineffective without this |
| `concepts.md` | onto_semantics | Accumulable | Core concept definitions |
| `competency_qs.md` | onto_pragmatics | Accumulable | Competency question list |
| `logic_rules.md` | onto_logic | Rule-defining | Domain-specific logic rules |
| `structure_spec.md` | onto_structure | Rule-defining | Structural specifications |
| `dependency_rules.md` | onto_dependency | Rule-defining | Dependency rules |
| `extension_cases.md` | onto_evolution | Rule-defining | Extension scenarios |
| `conciseness_rules.md` | onto_conciseness | Rule-defining | Conciseness criteria |

onto_axiology has no dedicated domain document. It uses system purpose/principles and session context.

### 5.3 Agent Re-evaluation on Domain Expansion

The 9 lenses are domain-independent by default. However, certain domain types require re-evaluation:

| Condition | Reason | Action |
|---|---|---|
| Domains that classify humans/groups (medical, education, law, HR) | Ethics/axiology verification weight increases | Ensure onto_axiology is sufficiently informed |
| Financial/administrative domains | Social ontology weight increases — institutional constructs are central | Adjust onto_semantics existence-type verification weight |

### 5.4 Cross-Domain Targets

When a target spans multiple domains, run a **separate review for each relevant domain**. Each execution is an independent session: results are not cross-referenced, and learnings are stored separately.

**Storage path**: `~/.onto/domains/{domain}/` (established) or `~/.onto/drafts/{domain}/` (seed)

**Protection principle**: Domain documents are never auto-modified by lenses. All changes require explicit user approval.

### 5.5 Seed Lifecycle

```
create-domain → seed in drafts/
→ review (seeds can be review targets)
→ feedback (learnings incorporated)
→ (repeat review + feedback)
→ promote-domain (all SEED markers removed → moves to domains/)
→ established (used as verification standards)
```

### 5.6 Available Domains

| Domain | Description |
|---|---|
| `software-engineering` | Code quality, architecture, type safety, testing strategy |
| `llm-native-development` | LLM-friendly structure, ontology-as-code |
| `accounting` | Double-entry bookkeeping, K-IFRS, tax adjustments, auditing |
| `finance` | Financial statements, XBRL, revenue recognition, financial instruments |
| `business` | Business strategy, marketing, financial management, innovation |
| `market-intelligence` | Market analysis, competitive intelligence, risk assessment |
| `ontology` | Ontology design, OWL/RDFS/SKOS, classification consistency |
| `visual-design` | Typography, color, layout, motion, branding, accessibility |
| `ui-design` | Navigation, forms, feedback, responsive design, WAI-ARIA |

---

## 6. Learning System

### 6.1 Storage Model (2-Path + Axis Tags)

| Path | Scope | Contents |
|---|---|---|
| `~/.onto/learnings/{lens-id}.md` | Global | Methodology + domain learnings (axis-tagged) |
| `{project}/.onto/learnings/{lens-id}.md` | Project | Same format, project-specific |
| `~/.onto/communication/common.md` | Global | User communication preferences |

**Entry format**: `- [type] [axis tag] [purpose type] content (source: ...) [impact:severity]`

### 6.2 Tag System

**Type tags**: `[fact]` (objective) or `[judgment]` (value judgment, subject to re-verification)

**Axis tags** (multiple allowed):
- `[methodology]` — domain-independent verification technique
- `[domain/{name}]` — valid in context of a specific domain

Axis tags are determined by a mandatory 2+1 stage test before storage:
1. **Sanity check**: Does the principle hold after removing domain-specific terms? No → domain-only
2. **Applicability**: Does applying this presuppose domain-specific conditions? Yes → dual-tag
3. **Counterexample**: Can you identify a domain where this produces incorrect results? Yes → dual-tag

All stages pass → `[methodology]` only.

**Purpose type tags** (exactly one per learning):
- `[guardrail]` — failure-derived prohibition (3 required elements: situation, result, corrective action)
- `[foundation]` — prerequisite knowledge for other learnings
- `[convention]` — terminology/procedure agreement
- `[insight]` — operational default for learnings that do not qualify as the above 3. Note: `insight` was removed from the canonical `learning_role` enum in `core-lexicon.yaml` to resolve a rigidity violation; it is retained as an operational tag in `learning-rules.md`

**Impact**: `[impact:high]` or `[impact:normal]` — set once at creation, immutable.

### 6.3 Consumption Rules

1. `[methodology]` → always apply
2. `[domain/{session_domain}]` → always apply
3. `[domain/{other}]` only → review then judge
4. No tags (legacy) → treat as `[methodology]`
5. Dual-tag `[methodology]` + `[domain/X]` → always apply (domain tag is provenance)
6. Purpose type tags do not affect consumption filtering

### 6.4 Creation-Time Verification Gate

Before saving any learning, a mandatory tag check runs:

**Required**: at least one axis tag + exactly one purpose type + exactly one impact tag. For `[guardrail]`: presence of situation/result/corrective action keywords.

**On failure**: 1 retry (re-apply determination flow). If still failing, save with warning marker `<!-- tag-incomplete -->` — corrected at next promote.

### 6.5 Consumption Feedback

After applying learnings during execution, lenses record:
- Which learnings were applied and whether they revealed findings that would have been missed otherwise
- If a learning is found invalid/harmful, an event marker is attached
- Event markers accumulate; 2+ markers surface the learning as a retirement candidate during promote

### 6.6 User Approval Tiers

All learning modifications follow a tiered approval model:

| Activity | User Involvement |
|---|---|
| Information addition (metadata, markers) | Automatic + post-report |
| Information change (tag modification, consolidation) | Summary report + batch approval |
| Information deletion (dedup, retirement) | Per-item approval |
| Observation (diagnostics, ratios) | Report viewing only |

---

## 7. Execution Profile

Lens execution is configured by two independent axes. These are not "modes" — they are orthogonal properties that combine into a profile.

### 7.1 The Two Axes

| Axis | What it decides | Values |
|---|---|---|
| **execution_realization** | How lenses are structurally dispatched | `subagent` — each lens is an independent Agent tool call<br>`agent-teams` — lenses are teammates in a Claude Code team |
| **host_runtime** | Which host environment runs the dispatched lenses | `codex` — OpenAI Codex executes lens passes<br>`claude` — Claude executes lens passes |

### 7.2 Supported Profiles

Not all combinations are supported. The supported profiles and their properties:

| Profile | Lens self-loading | Deliberation | Claude token usage | Selection |
|---|---|---|---|---|
| `subagent` + `codex` ✅ | Hybrid (lens self-loads; learning-rules.md inlined) | Not available (by design) | Team lead only (~20%) | User-selectable via `--codex` |
| `subagent` + `claude` ✅ | Team lead inlines all context | Not available (technical) | Full | Auto fallback when TeamCreate fails |
| `agent-teams` + `claude` ✅ | Lens performs own self-loading | Available when contested points exist | Full | Default on claude host |
| `agent-teams` + `codex` | — | — | — | **Not supported** |

### 7.3 Resolution Order

1. Command flag (`--codex` / `--claude`) → sets host_runtime, overrides config
2. config.yml `host_runtime` + `execution_realization` → applies if no flag
3. Neither specified → `host_runtime: claude`, `execution_realization: agent-teams`

When `execution_realization` is not explicitly set, it defaults based on resolved host_runtime:
- `codex` → `subagent`
- `claude` → `agent-teams`

When `agent-teams` + `claude` is selected but TeamCreate fails → automatic fallback to `subagent` + `claude`.

### 7.4 Parallel Execution

All profiles dispatch lenses in parallel with bounded concurrency:

| execution_realization | Default max_concurrent_lenses |
|---|---|
| `subagent` | 3 |
| `agent-teams` | 9 |

Override: `--max-concurrent-lenses` flag.

### 7.6 Error Handling

| Category | Condition | Response |
|---|---|---|
| **Process-halting** | Target/definition read failure | Halt + inform user |
| **Process-halting-with-partial-result** | Irreplaceable role fails but intermediate results exist | Halt + deliver partial results with limitation disclosure |
| **Transient → retry** | API error, crash | Retry up to 2 times, then graceful degradation |
| **Graceful degradation** | Partial lens failure, missing files | Exclude affected lens, adjust consensus denominator |

---

## 8. Review Runtime (TypeScript Bounded Path) ✅

The review process has a TypeScript core runtime that deterministically manages artifacts and state transitions.

### 8.1 CLI Commands

**Combined entrypoint** (preferred):
```bash
npm run review:invoke -- --target {path} --domain {domain}
```

**Decomposed steps** (for debugging or integration):

| Step | Command | Produces |
|---|---|---|
| Start session | `npm run review:start-session -- ...` | Session directory + metadata |
| Write interpretation | `npm run review:write-interpretation -- ...` | `interpretation.yaml` |
| Bootstrap binding | `npm run review:bootstrap-binding -- ...` | `binding.yaml` |
| Materialize preparation | `npm run review:materialize-execution-preparation -- ...` | Execution preparation artifacts |
| Materialize prompts | `npm run review:materialize-prompt-packets -- ...` | `prompt-packets/` |
| Run prompt execution | `npm run review:run-prompt-execution -- ...` | Lens results + `synthesis.md` + `execution-result.yaml` |
| Render final output | `npm run review:render-final-output -- ...` | `final-output.md` |
| Assemble record | `npm run review:finalize-session -- ...` | `review-record.yaml` |
| **Complete session** (wrapper) | `npm run review:complete-session -- ...` | Calls render-final-output + finalize-session in sequence |

### 8.2 Canonical Artifacts

| Artifact | Format | Role | Presence |
|---|---|---|---|
| `interpretation.yaml` | YAML | LLM interpretation output | Always |
| `binding.yaml` | YAML | Runtime-bound concrete values | Always |
| `session-metadata.yaml` | YAML | Deterministic execution metadata | Always |
| `execution-plan.yaml` | YAML | Per-lens output seats, boundaries | Always |
| `prompt-packets/*.md` | Markdown | Per-lens handoff prompts | Always |
| `round1/{lens-id}.md` | Markdown | Per-lens findings (human-readable) | Always |
| `synthesis.md` | Markdown | Synthesize stage output | Always |
| `deliberation.md` | Markdown | Deliberation exchange between contested lenses | Conditional — only when onto_synthesize determines contested points exist and profile supports deliberation (`agent-teams` + `claude` only) |
| `final-output.md` | Markdown | Human-readable final review | Always |
| `execution-result.yaml` | YAML | Execution outcome metadata | Always |
| `review-record.yaml` | YAML | **Primary artifact** — canonical review record | Always |

### 8.3 DeterministicStateEnforcer 📐

A state machine design for the review process with 9 states and 12 edges:

- **Auto states** (3): Runtime executes deterministic steps automatically
- **Await states** (3): Runtime outputs dispatch instructions and waits for caller
- **Terminal states** (3): No outgoing transitions — session complete, failed, or cancelled

Design reference: `authority/core-lexicon.yaml` (state machine terms)

---

## 9. Data Layout

### 9.1 Plugin Code

```
onto/
├── authority/               # Canonical data (deployed)
│   ├── core-lexicon.yaml           # Concept SSOT (rank 1)
│   ├── core-lens-registry.yaml     # Lens config (runtime)
│   └── translation-reference.yaml  # Term translation (onboarding)
│
├── design-principles/       # Development governance (not deployed)
│   ├── ontology-as-code-guideline.md
│   ├── llm-native-development-guideline.md
│   ├── productization-charter.md
│   ├── llm-runtime-interface-principles.md
│   └── ontology-as-code-naming-charter.md
│
├── development-records/     # Development history (not deployed)
│
├── processes/               # Process definitions
│   └── review/              #   Review contracts and live path
├── roles/                   # Lens role definitions (10)
│   ├── onto_logic.md ... onto_axiology.md
│   └── onto_synthesize.md
├── commands/                # Command definitions
├── domains/                 # Domain base documents (9 domains × 8 files)
├── explorers/               # Explorer profiles (build only)
├── golden/                  # Golden examples per schema
├── src/core-runtime/        # TypeScript runtime
├── scripts/                 # Shell utilities (review watcher, etc.)
├── process.md               # Operational procedures + mutable paths
├── learning-rules.md        # Learning storage rules (teammate reference)
├── package.json             # npm scripts + dependencies
├── tsconfig.json            # TypeScript configuration
├── CLAUDE.md                # Authority hierarchy table
├── AGENTS.md                # Agent quick-reference
├── BLUEPRINT.md             # This document
└── README.md                # User guide + installation
```

### 9.2 Runtime-Generated (per project)

```
{project}/.onto/
├── config.yml                      # Project domains + execution profile
├── review/{session-id}/            # Review session
│   ├── interpretation.yaml
│   ├── binding.yaml
│   ├── session-metadata.yaml
│   ├── execution-preparation/
│   ├── prompt-packets/
│   ├── round1/{lens-id}.md
│   ├── synthesis.md
│   ├── deliberation.md          # Conditional — only when deliberation occurs
│   ├── final-output.md
│   ├── execution-result.yaml
│   └── review-record.yaml
├── builds/{session-id}/            # Build session
│   ├── schema.yml, context_brief.yml
│   ├── round0~N/
│   └── raw.yml
└── learnings/{lens-id}.md          # Project-level learnings
```

### 9.3 Global Storage

```
~/.onto/
├── learnings/{lens-id}.md          # Global learnings (2-path model)
├── communication/common.md         # Communication learnings
├── domains/{domain}/               # Established domain documents (8 files)
├── drafts/{domain}/                # Seed domain documents
└── _backups/{backup-id}/           # Backup snapshots
```

---

## 10. Implementation Status

| Feature | Status | Notes |
|---|---|---|
| **Review** — 9-lens + synthesize | ✅ | Full canonical live path |
| **Review** — TS bounded runtime | ✅ | `npm run review:invoke` and all decomposed steps |
| **Review** — Agent Teams mode | ✅ | Default on claude host |
| **Review** — Subagent fallback | ✅ | Auto on TeamCreate failure |
| **Review** — Codex mode | ✅ | `--codex` flag or config.yml |
| **Review** — DeterministicStateEnforcer | 📐 | 9 states, 12 edges designed. `authority/core-lexicon.yaml` |
| **Review** — ReviewRecord assembly | ✅ | `review:complete-session` |
| **Build** — integral exploration | ✅ | 2-stage structure |
| **Build** — TS bounded runtime | 🔲 | Prompt-only. Review-first strategy |
| **Individual Query** | ✅ | `/onto:ask-{dimension}` |
| **Domain system** — 8 doc types | ✅ | Established + seed lifecycle |
| **Domain system** — per-session selection | ✅ | config.yml + interactive flow |
| **Learning** — 2-path + axis tags | ✅ | Global + project paths |
| **Learning** — consumption feedback | ✅ | Event markers + retirement candidates |
| **Learning** — Phase 1 tiered loading | 🔲 | Triggers at >100 lines per lens |
| **Learn entrypoint** | 📐 | Reads ReviewRecord. Design: `design-principles/productization-charter.md` §12 |
| **Govern entrypoint** | 📐 | Reads learnings + ReviewRecords. Design: `design-principles/productization-charter.md` §12 |
| **Onboard / Promote / Health** | ✅ | |
| **Domain creation / feedback / promotion** | ✅ | |
| **Backup / Restore** | ✅ | |

---

## 11. Future Direction

Decided items only. All below are confirmed in design-principles/ documents.

### 11.1 Learn and Govern Entrypoints 📐

`learn` reads ReviewRecord artifacts to extract, curate, and promote learnings systematically. `govern` reads accumulated learnings and ReviewRecords to propose structural governance actions. Both are downstream consumers of the review output.

Current state: review writes ReviewRecords; learn/govern will read them. Review must close its boundary before learn/govern productization begins.

Reference: `design-principles/productization-charter.md` §12 Current Priority Order

### 11.2 Review State Machine Completion 📐

The DeterministicStateEnforcer will replace the current coordinator pattern with a formal state machine. 9 states (3 auto, 3 await, 3 terminal), 12 edges. The state machine enforces transitions deterministically without semantic judgment.

Reference: `authority/core-lexicon.yaml` (auto_state, await_state, terminal_state terms)

### 11.3 Build Productization 🔲

Build will follow the same methodology as review: ontology-as-code authority → prompt-backed reference path → observation → bounded TS runtime replacement, one boundary at a time.

Reference: `design-principles/productization-charter.md` §7, §12

### 11.4 Learning Phase 1 Tiered Loading 🔲

When any lens exceeds 100 accumulated learnings, a 3-tier priority system activates:
- Tier 1 (unconditional): `[foundation]`, `[convention]`
- Tier 2 (purpose-based): `[guardrail]`
- Tier 3 (recency): `[insight]`

Reference: `learning-rules.md` §Learning Lifecycle Phases
