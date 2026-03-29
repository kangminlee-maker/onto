# Onto Review -- Blueprint

> This document describes the structure, principles, and usage of the onto system.
> Target audience: Non-developer product experts.
> Purpose: It should be possible to rebuild the system from scratch using only this document and an LLM.

---

## 1. System Identity

### What It Is

onto is a **Claude Code plugin**. It runs inside Claude Code (an AI coding tool that operates in the terminal) via slash commands (`/onto:review`, `/onto:build`, etc.).

This plugin provides two capabilities:

1. **Verification (review)**: The agent panel performs multi-perspective verification on scope-defined targets such as documents, code, and design proposals
2. **Build**: Automatically extracts ontologies (structured representations of domain knowledge) from analysis targets (code, spreadsheets, databases, documents)

### Why It Exists

Verifying from a single perspective misses problems in certain dimensions. For example, something logically consistent may be unqueryable in practice, and something structurally complete may break when a new domain is added. onto has 7 agents with distinct verification dimensions that evaluate independently, and an 8th agent (Philosopher) that synthesizes their findings to determine "does this serve the purpose without getting fixated on details?"

### Core Design Principles

| Principle | Meaning | Without This |
|---|---|---|
| **Multi-perspective independent verification** | Verification agents judge independently without knowing each other's results | Anchoring bias from being influenced by prior opinions |
| **Purpose alignment verification** | Philosopher reinterprets detailed results from the perspective of purpose | Results that meet detailed criteria but diverge from overall purpose |
| **Convergence prevention** | Not "preventing opinion homogenization" but preventing loss of purpose through fixation on details | Getting trapped in technical perfectionism and losing sight of the original question |
| **Domain-independent design** | Verification agent dimensions (logic, structure, dependency...) apply regardless of domain | A separate system would be needed for each domain |
| **Learning accumulation** | Agents record learnings from each review/query and use them in subsequent executions | Repeating the same mistakes or losing previous context |

---

## 2. Terminology

Terms used repeatedly in this document.

| Term | Definition |
|---|---|
| **ontology** | A structured representation of domain knowledge. Defines "what entities exist, what relationships they have, and what constraints apply" |
| **agent** | An AI instance assigned a specific role. Each has independent judgment criteria and a specialized domain |
| **team lead** | The entity that creates and orchestrates the agent team. Claude Code's main process performs this role |
| **teammate** | An individual agent instance created by the team lead |
| **delta** | The domain fact unit that the Explorer reports after traversing the source (build process only) |
| **epsilon** | The "next direction to explore" suggested by verification agents (build process only) |
| **label** | The ontology type assigned by verification agents to a delta (e.g., "this is an Entity") |
| **patch** | The unit of change where the Philosopher converts labels into ontology elements and applies them to wip.yml |
| **certainty** | The certainty level of a fact. Ranges from observed (confirmed in source) to not-in-source (external information needed). Stage 1 (Explorer: observed/pending) -> Stage 2 (verification agent: rationale-absent/inferred/ambiguous/not-in-source) |
| **wip.yml** | The ontology file in progress during build. Updated each round |
| **raw.yml** | The completed ontology file. Converted from wip.yml |
| **schema.yml** | The file defining the ontology framework (what types of elements to use) |
| **domain document** | 7 types of documents defining verification criteria for a specific domain. Referenced by agents during judgment |
| **learning** | Lessons agents discover during review/query processes. Classified into 3 types: communication/methodology/domain |
| **promote** | The process of elevating project-level learnings to global-level (domain-wide) |
| **Agent Teams** | Claude Code's multi-agent feature. Create teams with TeamCreate, communicate with SendMessage |
| **subagent (fallback)** | The alternative execution method used when Agent Teams fails. Sequentially executes individual agents via the Agent tool |
| **fact_type** | The type of domain facts reported by the Explorer. 10 types: entity, enum, property, relation, state_transition, command, query, policy_constant, flow, code_mapping. Used as criteria for limiting exploration scope in Stage 1/2 |
| **structured_data** | Structured supplementary data for facts within deltas. Contains fields specific to each fact_type (e.g., name, fields for entity). Optional but included whenever possible |
| **Stage 1 / Stage 2** | The two-stage division of build Phase 1. Stage 1 (Structure) identifies Entity, Enum, Relation, Property, and Stage 2 (Behavior) identifies State Machine, Command, Query, Policy, Flow based on Stage 1 results. Each Stage independently performs an integral exploration loop |
| **canonical.yaml** | The schema-neutral source example in the golden directory. The common starting point for how each schema (B/C/D) represents the same domain facts |
| **golden** | The directory containing golden examples (exemplary output samples) per schema. Referenced when determining raw.yml format during Phase 4 (storage) |
| **seed** | LLM-generated draft domain documents in `~/.onto/drafts/`. Contains SEED markers. Not used as verification standards |
| **established** | Domain documents in `~/.onto/domains/` with zero SEED markers. Used as verification standards by agents |
| **SEED marker** | `<!-- SEED: low-confidence, needs evidence -->` HTML comment marking LLM-inferred content in seed documents |
| **feedback loop** | Process of feeding accumulated learnings back into domain documents via `/onto:feedback` |
| **promotion** | Moving a seed domain from `drafts/` to `domains/` after all SEED markers are removed via `/onto:promote-domain` |
| **backup** | Timestamped snapshot of `~/.onto/` user data for rollback |
| **restore** | Rollback to a previous backup state with pre-restore safety net |

---

## 3. Agent Configuration

> **Design principle**: These agents are not a MECE classification but a set of empirically effective independent verification perspectives. A single classification axis is intentionally not used, and the justification for maintaining each perspective is verified by the existence of its unique detection domain.

### 3.1 Verification Agents

Each agent has a unique **verification dimension** and evaluates the same target from different perspectives.

#### onto_logic -- Logical Consistency Verifier

**Verification target**: Contradictions between definitions, type conflicts, constraint clashes

**Verification procedure**:
1. Extract all explicit and implicit axioms
2. Verify logical compatibility between axiom pairs
3. Confirm type hierarchy consistency (whether subtypes violate supertype constraints)
4. Check whether constraints conflict with each other

**Referenced domain document**: `logic_rules.md` -- domain-specific logic rules (uses general logic principles if absent)

**Report format**: When contradictions are found, presents the inference path in "Premise A + Premise B -> Contradiction" structure

---

#### onto_structure -- Structural Completeness Verifier

**Verification target**: Isolated elements, broken paths, missing relations, unreachable nodes

**Verification procedure**:
1. Construct all elements and relations as a graph
2. Detect isolated nodes with no connections
3. Confirm both ends of each relation are defined (broken references)
4. Path completeness verification: whether a reachable path exists between any two nodes

**Referenced domain document**: `structure_spec.md` -- domain-specific structural specifications

---

#### onto_dependency -- Dependency Integrity Verifier

**Verification target**: Circular dependencies, reverse dependencies, diamond dependencies, dependency direction violations

**Verification procedure**:
1. Construct all dependency relations as a directed graph
2. Detect circular references (A->B->C->A)
3. Check for hierarchy direction violations (cases where lower should depend on upper but the direction is reversed)
4. Diamond dependency: cases where different paths depend on the same target, creating potential conflicts

**Referenced domain document**: `dependency_rules.md` -- domain-specific dependency rules

---

#### onto_semantics -- Semantic Accuracy Verifier

**Verification target**: Misalignment between names and actual meanings, synonyms (different names for the same thing), homonyms (same name for different things)

**Verification procedure**:
1. Compare all terms' names against their definitions
2. Detect pairs with similar definitions but different names (synonym candidates)
3. Detect pairs with the same name but different definitions (homonym candidates)
4. Verify mapping against industry standard terminology

**Referenced domain document**: `concepts.md` -- domain core concept definitions (accumulable: supplemented through learnings)

---

#### onto_pragmatics -- Pragmatic Fitness Verifier

**Verification target**: Whether queries are actually possible, whether competency questions can be answered

**Verification procedure**:
1. Load the domain's competency question list
2. Verify whether each question can be answered with the current ontology
3. If unanswerable questions exist, specifically identify missing elements
4. Verify whether query paths are practical (impractical if answering requires traversing 10+ relationships)

**Referenced domain document**: `competency_qs.md` -- domain-specific competency question list (accumulable)

---

#### onto_evolution -- Evolution Fitness Verifier

**Verification target**: Whether existing structure breaks when adding new data, domains, or requirements

**Verification procedure**:
1. Load extension scenarios
2. Simulate whether each scenario can be accommodated without modifying existing structure
3. If modification is needed, estimate impact scope and ripple effects
4. Classify as critical when "existing structure must be destroyed to accommodate extension"

**Referenced domain document**: `extension_cases.md` -- domain-specific extension scenarios

---

#### onto_coverage -- Domain Coverage Verifier

**Verification target**: Missing subdomains, bias toward certain areas, gaps compared to standards

**Verification procedure**:
1. Load domain scope definition
2. Verify whether the current ontology covers all areas in the scope definition
3. Analyze bias in element counts by area
4. Detect missing areas compared to domain standards (ISO, IFRS, etc.)

**Referenced domain document**: `domain_scope.md` -- domain scope definition (scope-defining: onto_coverage role becomes ineffective without this)

---

#### onto_conciseness -- Conciseness Verifier

**Verification target**: Duplicate definitions, over-specification, distinctions that make no practical difference

**Verification procedure**:
1. Detect identical or similar concepts defined redundantly through different paths
2. Detect re-declaration of constraints already guaranteed by parent concepts (over-specification)
3. Detect subclassifications that make no actual difference
4. Detect unnecessary intermediate hierarchies with only one child

**Referenced domain document**: `conciseness_rules.md` -- domain-specific conciseness criteria

---

### 3.2 Philosopher -- Purpose Alignment Verifier

The Philosopher has a fundamentally different role from the verification agents.

**Difference from verification agents**:
- Verification agents: judge whether criteria are met along their own dimension
- Philosopher: reinterprets verification agents' judgment results in light of the system's "higher purpose"

**Responsibilities**:
1. Classify verification agents' results into consensus / contradictions / overlooked premises / new perspectives
2. Separately verify the "logical basis for consensus" even for unanimous items (flags it if unanimous agreement has weak rationale)
3. Detect cases where fixation on meeting detailed criteria has caused misalignment with the original purpose
4. Present new perspectives that all verification agents missed

**Referenced domain document**: None. Maintains a meta-perspective independent of domain.

**Additional role in build mode**:
- Coordinates verification agents' epsilons (exploration directions) into integrated directives
- Convergence judgment (determines whether to terminate)
- Applies patches to wip.yml, updating the ontology each round

---

### 3.4 Verification Dimension Coverage Checklist

A meta-tool for confirming the comprehensiveness of agent configuration. This checklist is not an agent classification axis but a reference frame for confirming that current agents cover all verification dimensions without gaps. These verification dimensions are cross-derived from standard frameworks (Gomez-Perez, Obrst, OntoClean).

| Verification Dimension | Verification Question | Covering Agents | Standard Framework Mapping |
|-----------|----------|-------------|-------------------|
| Formal consistency | Are there no contradictions between definitions? | onto_logic, onto_dependency | Gomez-Perez: Consistency, Obrst: L4 |
| Semantic accuracy | Does each concept accurately represent its target? | onto_semantics | Obrst: L1, OntoClean: Rigidity/Identity |
| Structural completeness | Do all internal connections exist without gaps? | onto_structure | Obrst: L2-L3, Gomez-Perez: Completeness (internal) |
| Domain coverage | Are all relevant concepts represented? | onto_coverage | Gomez-Perez: Completeness (external) |
| Minimality | Are there no unnecessary elements? | onto_conciseness | Gomez-Perez: Conciseness |
| Pragmatic fitness | Does it serve the actual use purpose? | onto_pragmatics | Brank: Application-based |
| Evolution adaptability | Can it adapt to changes? | onto_evolution | -- |

> The verification dimensions in this checklist have a many-to-many (N:M) relationship with agents. Since agents are a "set of independent perspectives," one agent may cover multiple dimensions and one dimension may span multiple agents.

---

### 3.5 Agent Re-evaluation Conditions for Domain Expansion

The current verification agents are designed to be domain-independent. However, re-evaluation of agent configuration is needed when entering the following domains:

| Condition | Reason | Re-evaluation Target |
|------|------|------------|
| Entering domains that classify humans/groups (medical, education, law, HR) | Verification from ethics/axiology (2.5) becomes necessary -- "does this classification disadvantage certain groups" | Consider adding a normative judgment agent |
| Entering finance/administration domains | The weight of social ontology (3.1) increases -- the mode of existence of institutional constructs becomes central | Adjust the weight of existence-type verification in onto_semantics |

---

### 3.6 Explorer -- Source Traverser (Build Only)

An agent that exists only in the build process. The traversal tools vary by source type (code, spreadsheet, DB, document), but the role is the same.

**Responsibilities**: Directly traverses the source and describes domain facts (deltas) structured by fact_type. Performs structural recognition (formatting differences, reference relations, etc.) while stating the observation basis. Includes structured_data (structured data per fact_type) whenever possible.
**Does NOT do**: Ontological interpretation (e.g., "this is an Aggregate," "this is a header"). That is done by verification agents.

**Exploration scope by Stage**: Stage 1 focuses on structural facts (entity, enum, property, relation, code_mapping), and Stage 2 explores behavioral facts (state_transition, command, query, policy_constant, flow) based on Entities confirmed in Stage 1.

**Example** (correct report -- code):
> "The Payment class has status, amount, createdAt fields, and PaymentGateway branches on status using string comparison"

**Example** (correct report -- spreadsheet):
> "Cells A1:F1 are merged, background color #4472C4, font Bold, and formatting differs from rows below"

**Example** (incorrect report):
> "Payment is an Aggregate Root, and PaymentGateway is a Domain Service"

The reason for this separation: If the Explorer also interprets, the verification agents' independent judgment gets anchored by the Explorer's interpretation.

---

## 4. Processes

### 4.1 Team Review (review)

**Command**: `/onto:review {target}`
**Input**: Scope-defined documents, code, design proposals
**Output**: Agent panel report with consensus/contested points/recommendations

#### Flow

```
1. Context Gathering
   Team lead reads the target, determines the domain, and identifies the system purpose

2. Team Creation + Round 1 (verification agents perform independent review)
   - Generate session ID (e.g., 20260325-a3f7b2c1)
   - Create all teammates (verification agents + Philosopher)
   - Verification agents verify independently. They do not know each other's results
   - Each saves results as files in the session directory
   - Reports only the file path to the team lead

3. Philosopher Synthesis
   - Reads verification agents' result files directly
   - Classifies into consensus / contradictions / overlooked premises / new perspectives
   - If contested points exist, directs deliberation between the relevant agents

4. Deliberation (conditional)
   - Only agents designated by the Philosopher participate
   - If consensus is not reached even after deliberation, recorded as "disagreement"

5. Final Output
   Consensus items (N/8), conditional consensus, purpose alignment verification,
   immediate actions required, recommendations

6. Wrap-up
   Learning storage, promotion guidance, Team shutdown
```

#### Core Rules

- **Team lead does not intervene in content**: Does not modify or summarize results; relays them as-is
- **File-based relay**: Review originals bypass the team lead's context and are relayed directly via files. Solution for Issue 1-A
- **Even unanimity is verified**: Even when all agree, the logical basis for that consensus is separately confirmed

---

### 4.2 Individual Query (question)

**Command**: `/onto:ask-{dimension} {question}` (e.g., `/onto:ask-logic Is there a contradiction in this design?`)
**Input**: A question you want answered from a specific perspective
**Output**: Answer from that single agent + learning record

Directly asks a single-dimension specialist without mobilizing the full panel.
The agent loads its role definition + methodology learnings + domain documents + domain learnings before answering.

---

### 4.3 Ontology Build (build)

**Command**: `/onto:build {path|URL}`
**Input**: Analysis target (entire project if no path specified. Supports code, spreadsheets, databases, documents)
**Output**: `raw.yml` -- ontology extracted from the source

Why this process is structurally different from review:
- review: Scope is defined -> verification agents evaluate independently in parallel
- build: Scope is undefined -> independent exploration leads to 7x duplication and gaps discovered only at the end

Therefore, build uses an **integral exploration** structure.

#### Flow

```
Phase 0: Schema Negotiation
   Decide the ontology "framework" with the user
   4 options: Action-Centric / Knowledge Graph / Domain-Driven / Custom
   (Schema A -- Axiom-based is not supported in build. Usable only in review/transform)
   -> Save schema.yml

Phase 0.5: Context Gathering
   Project scan (directory listing, README, documents, tests, etc.)
   Ask the user (core flows, legacy, related repos, glossary)
   -> Save context_brief.yml

Phase 1: Integral Exploration Loop (2 Stages x max 5 rounds = max 10 rounds)
   Stage 1 -- Structure (identify Entity, Enum, Relation, Property)
     fact_type scope: entity, enum, property, relation, code_mapping
     Round 0: Explorer surveys overall structure (module list = coverage denominator)
     Round N (iterate):
       1. Deliver Explorer's delta to verification agents
       2. Verification agents: report label + epsilon + issues
       2.5. Philosopher: convert labels to patches -> update wip.yml
       3. Philosopher: integrate epsilons, judge convergence
       4. Explorer: explore in the integrated directive direction -> report new delta
       -> Repeat
     Termination condition: (at least 1 fact reported from every module) AND (new facts = 0)

   Stage 2 -- Behavior (identify State Machine, Command, Query, Policy, Flow)
     fact_type scope: state_transition, command, query, policy_constant, flow
     References wip.yml (confirmed Entity list) from Stage 1 for behavior exploration
     Re-runs the same integral loop with Stage 2 fact_type scope
     If Schema A selected: Stage 2 skipped (Axiom-based does not include behavior specifications)

Phase 2: Finalization
   Philosopher performs final review of wip.yml
   Judges unresolved conflicts, tidies terminology, cleans up external systems, verifies exploration bias
   wip.yml -> raw.yml conversion

Phase 3: User Confirmation
   Presents certainty distribution, coverage, and items requiring user decisions

Phase 4: Storage
   Save raw.yml, delete wip.yml and deltas/

Phase 5: Learning Storage
```

#### Certainty Classification (Fact Certainty)

All facts discovered during build are assigned a certainty level.

**Stage 1 Judgment (Explorer)**:

| Level | Meaning | Example |
|---|---|---|
| `observed` | Directly observed from source. Does not change unless source changes | "The Payment class has a status field" |
| `pending` | Cannot be confirmed from source alone | "The rationale for this constant is not in the source" |

**Stage 2 Judgment (verification agents refine `pending`)**:

| Level | Meaning | Example | Downstream Action |
|---|---|---|---|
| `rationale-absent` | Implementation exists in source but rationale does not | "500 hardcoded -- reason for 500 unknown" | Request rationale confirmation in Phase 3 |
| `inferred` | Reasonable inference but not directly verifiable | "Presumed to use event-based communication" | Present with inference quality in Phase 3 |
| `ambiguous` | Multiple equally valid interpretations exist | "Unclear whether authentication or authorization" | Present interpretation options in Phase 3 |
| `not-in-source` | Cannot be determined from this source | "User scenarios" | Request user decision in Phase 3 |

The reason this classification exists: For users to understand "what is confirmed and where decisions are needed." Each level triggers different actions in Phase 3. Certainty is assigned independently of fact_type (domain fact type) -- the same certainty judgment criteria apply whether it is an entity or a command.

---

### 4.4 Ontology Transform (transform)

**Command**: `/onto:transform {file}`
**Input**: `raw.yml` (output of build)
**Output**: Ontology converted to the user's chosen format

Supported formats:
- Markdown (human-readable document)
- Mermaid (diagram)
- YAML / JSON-LD (data exchange)
- OWL/RDF (academic/reasoning tools)
- Hybrid (multiple format combination)

---

### 4.5 Onboarding (onboard)

**Command**: `/onto:onboard`
**Output**: onto environment setup complete for the project

Procedure:
1. **Diagnosis**: Check learning directory existence, domain declaration in CLAUDE.md, global domain document existence, agent memory status
2. **User confirmation**: Show diagnosis results and confirm items to configure
3. **Environment setup**: Create `.onto/learnings/` directory, add domain declaration to CLAUDE.md, suggest domain document installation, generate scope document draft

---

### 4.6 Learning Promotion (promote)

**Command**: `/onto:promote`
**Input**: Project-level learnings (`{project}/.onto/learnings/`)
**Output**: Learnings promoted to global-level after review

Promotes "learnings valid across other projects" from those accumulated in the project to global-level (domain-wide).

**3-agent review panel**: The relevant agent + Philosopher + 1 related agent
- 3/3 consensus: Automatic promotion
- 2/3 consensus: Recommended (minority opinion attached for user judgment)
- 2/3+ deferred/rejected: Not promoted

If domain document updates (`concepts.md`, `competency_qs.md`, `domain_scope.md`) are needed, they are suggested, but **never auto-modified without explicit user approval**.

---

### 4.7 Domain Creation (create-domain)

**Command**: `/onto:create-domain {name} {description}`
**Input**: Domain name and brief description
**Output**: 8 seed domain documents in `~/.onto/drafts/{name}/`
**Key behavior**: LLM generates all 8 document types from the provided description. Low-confidence content is marked with `<!-- SEED: low-confidence, needs evidence -->`. Seed documents are never loaded as verification standards.

---

### 4.8 Domain Feedback (feedback)

**Command**: `/onto:feedback {domain}`
**Input**: A seed domain in `~/.onto/drafts/{domain}/` with accumulated learnings
**Output**: Updated seed documents with learnings incorporated, SEED markers adjusted
**Key behavior**: Feeds `[domain/{domain}]` learnings back into the seed documents. May remove SEED markers where learnings provide sufficient evidence. Only the user can make final decisions on SEED marker removal.

---

### 4.9 Domain Promotion (promote-domain)

**Command**: `/onto:promote-domain {domain}`
**Input**: A seed domain in `~/.onto/drafts/{domain}/` with zero SEED markers
**Output**: Domain documents moved to `~/.onto/domains/{domain}/`
**Key behavior**: Pre-checks that zero SEED markers remain. If any SEED markers exist, promotion is blocked with a list of remaining markers. After promotion, the domain becomes an established verification standard.

---

### 4.10 Data Backup (backup)

**Command**: `/onto:backup` or `/onto:backup "reason"`
**Input**: Optional reason string
**Output**: Timestamped snapshot at `~/.onto/_backups/{backup-id}/`

Snapshots learnings, domains, drafts, and communication data. Includes a manifest with file counts and domain lists.

---

### 4.11 Data Restore (restore)

**Command**: `/onto:restore` (list) or `/onto:restore {backup-id}`
**Input**: Backup ID or none (list mode)
**Output**: Restored data + safety backup of pre-restore state

Automatically creates a safety backup before restoring. Supports rollback of the rollback.

---

## 5. Domain System

### 5.1 Domain Determination Rules

Domains use a **per-session selection** model. Each process execution selects a single `{session_domain}`.

**Project domains** (`config.yml`):
```yaml
domains:
  - software-engineering
  - ontology
```
`domains:` is an unordered set. No domain has priority over another. Old format (`domain:` + `secondary_domains:`) is auto-converted.

**Session domain resolution**:
1. `@{domain}` specified → non-interactive, use that domain
2. `@-` specified → no-domain mode (agent default methodology only)
3. Not specified → Domain Selection Flow (analyze target → suggest domain → user confirms)

**No-domain mode**: Verifies using agent default methodology without domain rule documents. `[methodology]` tags only for learnings.

**Command syntax**: `/onto:{process} {target} @{domain}` or `/onto:{process} {target} @-`

For full edge case definitions, refer to `design-per-session-domain-selection.md` Section 4.

### 5.2 Domain Documents (7 Types)

Each domain has up to 7 reference documents. Each agent references the document corresponding to its dimension.

| Document | Used by Agent | Type | Description |
|---|---|---|---|
| `domain_scope.md` | onto_coverage | Scope-defining | Definition of the areas this domain covers. onto_coverage role becomes ineffective without this |
| `concepts.md` | onto_semantics | Accumulable | Core concept and term definitions. Incrementally supplemented through learnings |
| `competency_qs.md` | onto_pragmatics | Accumulable | Competency question list. "The ontology should be able to answer this question" |
| `logic_rules.md` | onto_logic | Rule-defining | Domain-specific logic rules. Written/modified directly by users |
| `structure_spec.md` | onto_structure | Rule-defining | Domain-specific structural specifications |
| `dependency_rules.md` | onto_dependency | Rule-defining | Domain-specific dependency rules |
| `extension_cases.md` | onto_evolution | Rule-defining | Extension scenarios |

**Domain document protection principle**: Domain documents cannot be automatically modified by agents. Both update suggestions from promote and draft generation from onboard go through user confirmation. Domain documents are "agreed-upon standards for the entire domain," not "learnings from a specific project," so automatic changes are dangerous.

**Storage path**: `~/.onto/domains/{domain-name}/`

### 5.3 Available Domains

| Domain | Description |
|---|---|
| `software-engineering` | Code quality, architecture, type safety, testing strategy |
| `llm-native-development` | LLM-friendly file structure, ontology-as-code. Inherits from software-engineering and redefines concepts |
| `accounting` | Double-entry bookkeeping, K-IFRS, tax adjustments, auditing |
| `finance` | Financial statements, XBRL, revenue recognition (IFRS 15), financial instruments (IFRS 9), leases (IFRS 16) |
| `business` | Business strategy, marketing, financial management, organization/HR, innovation management |
| `market-intelligence` | Market analysis, competitive intelligence, risk assessment, data reliability |
| `ontology` | Ontology design itself. OWL/RDFS/SKOS, classification consistency |
| `visual-design` | Typography, color, layout, motion, branding, accessibility (WCAG) |
| `ui-design` | Navigation, forms, feedback, responsive design, WAI-ARIA accessibility |

**Installation method**: Run `./setup-domains.sh` (interactive selection or `--all` for full installation)

### Seed Documents and the Feedback Loop

Seed documents (`~/.onto/drafts/`) are LLM-generated domain document drafts sharing the same 8-file structure as established documents but containing SEED markers on low-confidence content.

**Lifecycle**: create → review → feedback → (repeat) → promote

**Key invariants**: (1) Seeds are never loaded as verification standards. (2) Seeds may be review targets. (3) Promotion requires zero SEED markers. (4) Only the user can remove SEED markers.

Design reference: `dev-docs/design-domain-document-creation.md`

---

## 6. Learning System

### 6.1 Learning Classification (2-Path + Axis Tag + Purpose Type)

Agents store lessons via 2 paths with multi-dimensional tagging.

| Learning Type | Storage Path | Scope |
|---|---|---|
| **Communication learning** | `~/.onto/communication/common.md` | User's communication preferences |
| **Verification learning** | `{project}/.onto/learnings/{agent-id}.md` (project) or `~/.onto/learnings/{agent-id}.md` (global) | Methodology + domain learnings combined via axis tags |

**Entry format**: `- [type] [axis tag] [purpose type] content (source: ...) [impact:severity]`

### 6.2 Type Tagging

Each learning item is tagged with `[fact]` or `[judgment]`.

- **[fact]**: Objective descriptions of definitions, structures, relations. Accumulation does not introduce bias
- **[judgment]**: Value judgments like "this pattern is problematic." Validity may change when context changes, so items with 10+ accumulations become re-verification targets

### 6.3 Axis Tag Determination (2+1 Stage Test)

Each learning gets axis tags via a 2+1 stage test:
- Sanity check (A): "Holds without domain terms?" → No → domain-only
- Stage B: "Requires domain-specific preconditions (presence or absence)?" → Yes → dual-tag
- Stage C: "Counterexample domain exists?" → Yes → dual-tag
- All pass → methodology-only. Uncertainty → dual-tag + flag.

Dual-tag consumption: always load and apply. Domain tag is provenance.

### 6.4 Purpose-Based Type Tags (Phase 0.5)

Orthogonal to type × axis tags. Determined at creation time:

| Purpose Type | Definition | Tier (Phase 1) |
|---|---|---|
| `[guardrail]` | Failure-derived prohibition. 3 required elements: failure situation + observed result + corrective action | Tier-2 |
| `[foundation]` | Prerequisite knowledge for other learnings | Tier-1 |
| `[convention]` | Terminology/notation/procedure agreement | Tier-1 |
| `[insight]` | Default — all other learnings | Tier-3 |

### 6.5 Impact Severity + Failure Experience (Phase 0.5)

- `impact_severity` (high/normal): Set once at creation, immutable. High if ignoring causes data loss/system failure, or reaching the same conclusion requires significant investigation
- Failure experience: The `[guardrail]` tag is the sole indicator of failure experience. Separate boolean field (`is_failure_experience`) deprecated — presence of `[guardrail]` tag implies failure experience

### 6.6 Consumption Rules

1. `[methodology]` → always apply
2. `[domain/{session_domain}]` → always apply
3. `[domain/{other}]` only → review then judge (does principle hold without domain terms?)
4. No tags (legacy) → treat as `[methodology]`
5. `[methodology]` + `[domain/X]` dual-tag → always load and apply. Domain tag is provenance

### 6.7 Learning Lifecycle Phases

| Phase | Condition | Behavior |
|---|---|---|
| Phase 0 | <100 lines per agent | Full loading (current) |
| Phase 0.5 | Now | Tag new learnings with purpose type + impact_severity |
| Phase 1 | >100 lines per agent | 3-Tier loading priority (Tier-1 unconditional → Tier-2 purpose-based → Tier-3 recency) |
| Phase 2 | Phase 1 + overload | Additional rules (quota, generation path weighting) |

For full lifecycle design, refer to `design-learning-lifecycle-management.md`.

---

## 7. Execution Infrastructure

### 7.1 Agent Teams (Preferred Execution Method)

Claude Code's multi-agent feature.

- **TeamCreate**: Creates a team. team_name follows the format `{process}-{session-id}` (e.g., `onto-20260325-a3f7b2c1`)
- **SendMessage**: Sends messages between teammates
- **TeamDelete**: Deletes a team

**Session ID**: Format `{YYYYMMDD}-{hash8}`. The date provides chronological ordering, and the 8-character random hash prevents collisions.

**Session directory**: `{project}/.onto/{process}/{session-id}/` -- where review result files are stored

### 7.2 Subagent Fallback

If TeamCreate fails, switches to Agent tool (subagent) mode.

Differences:
- Teammates cannot self-load (read their own necessary files), so the team lead must include all context directly when delivering
- Direct deliberation via SendMessage is not possible -> deliberation is skipped (disagreement items are included as-is in the final report)
- File-based relay still applies

### 7.3 Error Handling

Errors are classified into 2 categories:

| Category | Condition | Response |
|---|---|---|
| **Process-halting** | Review target read failure, agent definition file read failure, Explorer failure (build), Philosopher failure (build) | Halt the process and inform the user |
| **Graceful degradation** | Partial verification agent failure, learning file absence, domain document absence | Exclude the affected agent and proceed with the rest. Adjust the consensus denominator |

### 7.4 Team Lifecycle Management

#### Pre-creation Check
- Check for existing teams matching `~/.claude/teams/{process}-*` pattern
- If orphan teams/files (directories with only inbox and no config.json) exist, guide the user to clean up

#### Shutdown Procedure
1. Send shutdown_request to all teammates
2. Confirm each teammate's shutdown_approved
3. If no response, resend after 30 seconds (max 3 attempts)
4. Execute TeamDelete after confirming all members shut down

#### Prohibited Actions
- Manual deletion of team directories such as `rm -rf ~/.claude/teams/{team}/` is prohibited. Agent processes may survive and contaminate other sessions' work
- If TeamDelete fails with "active member" error, resend shutdown_request to unfinished agents. If still failing, guide the user to manual cleanup

### 7.5 Scope of Team Lead's Role

The team lead is a **structure coordinator**.

**Permitted** (Context Gathering stage):
- Identifying the review target, determining the domain, deciding the process flow

**Prohibited** (Relay stage):
- Modifying or summarizing collected results
- Injecting its own judgment into the review
- Cross-sharing results between teammates (to guarantee independence)

**Build mode exception**: Share the confirmed element list from the previous round in anonymized form (labeled_by field removed). "What has already been identified" is communicated, but "who judged it" is hidden, maintaining the balance between independence and coverage.

---

## 8. File Structure

### 8.1 Plugin Code (Distributed Files)

```
onto/
+-- .claude-plugin/
|   +-- plugin.json           # Plugin metadata (name, description, version)
|   +-- marketplace.json      # Marketplace distribution information
|
+-- process.md                # Common definitions -- top-level rules referenced by all processes
|                             #   Agent configuration, domain documents, Agent Teams execution,
|                             #   learning storage rules, team lifecycle, team lead role
|
+-- processes/                # Process definitions (11)
|   +-- review.md             #   Team review (agent panel)
|   +-- question.md           #   Individual query (1 agent)
|   +-- build.md              #   Ontology build (integral exploration)
|   +-- transform.md          #   Ontology transform
|   +-- onboard.md            #   Project onboarding
|   +-- promote.md            #   Learning promotion
|   +-- create-domain.md      #   Seed domain generation
|   +-- feedback.md           #   Domain document feedback loop
|   +-- promote-domain.md     #   Seed to established promotion
|   +-- backup.md             #   Data backup
|   +-- restore.md            #   Data restore
|
+-- roles/                    # Agent role definitions (8)
|   +-- onto_logic.md         #   Logical consistency
|   +-- onto_structure.md     #   Structural completeness
|   +-- onto_dependency.md    #   Dependency integrity
|   +-- onto_semantics.md     #   Semantic accuracy
|   +-- onto_pragmatics.md    #   Pragmatic fitness
|   +-- onto_evolution.md     #   Evolution fitness
|   +-- onto_coverage.md      #   Domain coverage
|   +-- philosopher.md        #   Purpose alignment
|
+-- commands/                 # Command definitions (20)
|   +-- review.md
|   +-- build.md
|   +-- transform.md
|   +-- onboard.md
|   +-- promote.md
|   +-- create-domain.md
|   +-- feedback.md
|   +-- promote-domain.md
|   +-- backup.md
|   +-- restore.md
|   +-- help.md
|   +-- ask-logic.md
|   +-- ask-structure.md
|   +-- ask-dependency.md
|   +-- ask-semantics.md
|   +-- ask-pragmatics.md
|   +-- ask-evolution.md
|   +-- ask-coverage.md
|   +-- ask-conciseness.md
|   +-- ask-philosopher.md
|
+-- domains/                  # Domain reference documents (9 domains)
|   +-- software-engineering/   # 7 documents
|   +-- llm-native-development/ # 8 documents (prompt_interface.md added)
|   +-- accounting/             # 7 documents
|   +-- finance/                # 7 documents
|   +-- business/               # 7 documents
|   +-- market-intelligence/    # 7 documents
|   +-- ontology/               # 7 documents
|   +-- visual-design/          # 7 documents
|   +-- ui-design/              # 7 documents
|
+-- golden/                  # Golden examples per schema (B/C/D)
|   +-- canonical.yaml       #   Schema-neutral source
|   +-- b-action-centric.yaml
|   +-- c-knowledge-graph.yaml
|   +-- d-domain-driven.yaml
|   +-- schema-*.yml         #   Schema templates
|
+-- setup-domains.sh          # Domain document installation script
+-- CLAUDE.md                 # Project domain declaration
+-- README.md                 # User guide
+-- KNOWN-ISSUES.md           # Known issues and resolutions
```

### 8.2 Runtime-Generated Directories (Created During Execution)

**Classification axes**:

| Axis | Role | Example |
|---|---|---|
| 1st: Process type | Distinguishes the kind of data | `review/`, `builds/`, `learnings/` |
| 2nd: Session ID | Isolates execution instances of the same process | `20260326-3be34f0f/` |
| 3rd: Round number | Distinguishes agent execution stages | `round1/` |

**Directory role definitions**:

| Directory | Role | Contents | Lifecycle |
|---|---|---|---|
| `review/{session-id}/` | All data belonging to a single review session | Round results + Philosopher synthesis | Permanently preserved after session ends |
| `builds/{session-id}/` | All data belonging to a single build session | Round results + ontology artifacts | Permanently preserved after session ends (wip, deltas deleted on completion) |
| `learnings/` | Project-level learning accumulation | Per-agent learning files | Cross-session, same lifetime as project |

**Round numbering**: review uses `round1` (1-indexed), build uses `round0` (0-indexed). review's round1 means "the first independent verification round," and build's round0 means "the initial exploration round (starting from Phase 0)."

**Session metadata**: Each process's final artifact includes metadata in YAML format.
- review: YAML frontmatter (`---` block) in `philosopher_synthesis.md`
- build: `meta:` key in `raw.yml` (existing format retained)

review frontmatter format:
```yaml
---
session_id: "{session ID}"
process: review
target: "{review target summary}"
domain: "{session_domain / none}"
date: "{YYYY-MM-DD}"
---
```

```
{project}/
+-- .onto/                 # Runtime data (gitignored)
|   +-- review/{session-id}/      #   review session (round results + artifacts unified)
|   |   +-- round1/               #     Verification agent results ({agent-id}.md)
|   |   +-- philosopher_synthesis.md  # Philosopher synthesis judgment
|   +-- builds/{session-id}/      #   build session (round results + artifacts unified)
|   |   +-- round0~N/             #     Per-round agent results ({agent-id}.yml)
|   |   +-- schema.yml            #     Ontology structure definition
|   |   +-- context_brief.yml     #     Build context summary
|   |   +-- wip.yml               #     In-progress ontology (deleted on completion)
|   |   +-- deltas/               #     Explorer's delta originals (deleted on completion)
|   |   +-- _repos/               #     Analysis target repo clones (for external URLs)
|   |   +-- raw.yml               #     Completed ontology
|   +-- learnings/                #   Project-level learnings ({agent-id}.md)
```

### 8.3 Global Storage (User Home Directory)

```
~/.onto/
+-- communication/            # Communication learnings
|   +-- common.md             #   Shared across all agents
|   +-- {agent-id}.md         #   Per-agent individual
+-- methodology/              # Methodology learnings
|   +-- {agent-id}.md         #   Per-agent (domain-independent)
+-- domains/{domain}/         # Per-domain storage
    +-- domain_scope.md       #   Scope definition
    +-- concepts.md           #   Core concepts
    +-- competency_qs.md      #   Competency questions
    +-- logic_rules.md        #   Logic rules
    +-- structure_spec.md     #   Structural specifications
    +-- dependency_rules.md   #   Dependency rules
    +-- extension_cases.md    #   Extension scenarios
    +-- learnings/            #   Global domain learnings
        +-- {agent-id}.md
```

---

## 9. Known Constraints and Resolutions

### Issue 1-A: Team Lead Context Saturation

**Problem**: When all agents' review originals (~64,500 characters) flood the team lead's context at once, the LLM recognizes only some messages. In an actual case, results from only 3 out of 7 verification agents were recognized.

**Cause**: Agent Teams' message delivery (transport) succeeded, but the team lead LLM could not process all messages due to context limits.

**Resolution**: File-based relay. Verification agents save results as files, and only file paths (~500 characters) are reported to the team lead. The Philosopher reads files directly to process the originals. This way, originals are not loaded into the team lead's context, and the "relay original text as-is" rule is structurally guaranteed.

### Issue 1-B: Inter-Session Agent Leakage

**Problem**: When team_name was fixed (`onto`), agents created in other sessions sent messages to the current session's team lead. Review content from other projects was injected into the current session.

**Cause**: The `~/.claude/teams/onto/` directory was shared on the filesystem, allowing teams with the same team_name to coexist across multiple sessions.

**Resolution**: Session ID-based team_name (`onto-20260325-a3f7b2c1`). Uses a unique name per session for isolation.

---

## 10. Usage

### Installation

```
/plugin marketplace add kangminlee-maker/onto
/plugin install onto@kangminlee-maker/onto
```

### Domain Document Installation (Optional)

```bash
./setup-domains.sh              # Interactive selection
./setup-domains.sh --all        # Install all
./setup-domains.sh software-engineering finance  # Specific domains only
```

### Project Environment Setup

```
/onto:onboard
```

### Agent Panel Review

```
/onto:review {review target file or path}
```

### Ask from a Specific Perspective

```
/onto:ask-logic {question}
/onto:ask-structure {question}
/onto:ask-dependency {question}
/onto:ask-semantics {question}
/onto:ask-pragmatics {question}
/onto:ask-evolution {question}
/onto:ask-coverage {question}
/onto:ask-philosopher {question}
```

### Ontology Build

```
/onto:build              # Entire project
/onto:build src/         # Specific directory
/onto:build {GitHub URL} # External repo
```

### Ontology Transform

```
/onto:transform .onto/builds/{session ID}/raw.yml
```

### Learning Promotion

```
/onto:promote
```

---

## 11. Reconstruction Guide

The key decision sequence when rebuilding this system from scratch:

### 11.1 Structural Decisions

1. **Agent configuration decision**: Verification dimensions (logic, structure, dependency, semantics, pragmatics, evolution, coverage, etc.) + meta-verification (Philosopher). This configuration is derived from ontology verification theory; dimensions can be added or removed, but each must be independent of the others.

2. **Process separation decision**: review (verification) and build share the same agents but have different execution structures. review is a single parallel pass, build is an iterative loop. This difference stems from "whether the input scope is defined."

3. **Learning three-way classification decision**: Communication/methodology/domain. This classification is determined by "where can this learning be reused." Communication is valid across all domains, methodology is a domain-independent principle, domain is valid only in a specific domain/project.

4. **Domain document protection decision**: The reason agents cannot auto-modify domain documents is that domain documents are "agreed-upon standards for the entire domain," not "learnings from a specific project." If erroneous learnings contaminate the standards, all subsequent verifications are contaminated.

### 11.2 Infrastructure Decisions

5. **File-based relay**: Uses files rather than messages for relaying results between agents. Prevents team lead context saturation and structurally guarantees original text preservation.

6. **Session ID isolation**: Generates a unique session ID for each execution, preventing agents from other sessions from contaminating the current session.

7. **Fallback system**: Agent Teams -> subagent. Execution methods differ but purpose and output format are identical. Deliberation is skipped in subagent mode.

### 11.3 File Creation Order

1. `.claude-plugin/plugin.json` -- Plugin metadata
2. `process.md` -- Common definitions (top-level rules for all processes)
3. `roles/` -- Agent role definitions
4. `processes/` -- 11 process definitions
5. `commands/` -- 20 command definitions (each specifying which process file to read and execute)
6. `domains/` -- Domain reference documents
7. `setup-domains.sh` -- Domain document installation script

### 11.4 Dependency Graph

```
process.md <- processes/*.md <- commands/*.md
                ^
             roles/*.md (agent definitions)
                ^
          domains/*/*.md (domain documents, referenced at runtime)
```

- `commands/*.md` contain instructions to read the corresponding process file (`processes/*.md`) and common definitions (`process.md`)
- `processes/*.md` reference the common rules in `process.md`
- `roles/*.md` are independent but must be registered in the agent configuration table in `process.md`
- `domains/*/*.md` are read by agents via self-loading at runtime

---

## 12. System Stage

**Current: Accumulation Phase**

Learning accumulation is the priority, and process refinement (e.g., promote separation) will be considered at the maturity phase once sufficient execution experience has accumulated. After running promote at least once, structural changes are judged based on actual friction.

---

## 13. MCP Server Externalization Design (Not Implemented)

> **Status**: Design document. Pre-implementation.
> **Motivation**: Enable onto to be used on MCP-compatible hosts beyond Claude Code, such as Codex and Cursor.
> **Reference model**: Ouroboros plugin's MCP server architecture.

### 13.1 Platform Dependencies of Current Architecture

Currently, onto depends on the **host (Claude Code)** for orchestration (agent creation, parallel execution, message routing):

| Capability | Host Feature Used |
|---|---|
| Agent parallel execution | Agent Teams (TeamCreate) or Agent tool |
| Inter-agent communication | SendMessage |
| Agent self-loading | Teammate reads files directly with Read tool |
| Learning storage | Teammate writes files directly with Write tool |

These features are Claude Code-specific and do not work on other platforms (Codex, Cursor, etc.).

### 13.2 Design Principle: Orchestration Ownership Transfer

**Core change**: Transfer orchestration from host to MCP server.

```
[Current]
Host (Claude Code) owns orchestration
  -> Manages agents via TeamCreate, Agent tool, SendMessage
  -> Cannot function without host

[After change]
MCP server owns orchestration
  -> Server directly calls LLM API to execute agents
  -> Parallel execution, message routing, learning storage within the server
  -> Host is a stateless client (calls MCP tools only)
```

### 13.3 Architecture

```
[Host: Claude Code / Codex / Cursor]     <- stateless
         | JSON-RPC over stdio (MCP protocol)
[onto MCP server]                     <- stateful
  +-- Agent execution engine
  |   +-- Agent parallel execution (async)
  |   +-- Inter-agent message routing
  |   +-- Direct LLM API calls (Claude API / OpenAI API)
  +-- Session management
  |   +-- {project}/.onto/{process}/{session ID}/
  +-- Learning storage system
  |   +-- ~/.onto/ (existing structure retained)
  +-- Domain document management
      +-- ~/.onto/domains/{domain}/
```

### 13.4 MCP Tool Design

Tools exposed to the host:

| Tool | Input | Output | Description |
|---|---|---|---|
| `onto_review_start` | target, domain, purpose | session_id | Start agent panel review (non-blocking) |
| `onto_review_status` | session_id | Progress (stage, completed agent count) | For polling |
| `onto_review_result` | session_id | Full final review result | Receive result after completion |
| `onto_question` | dimension, question, domain | answer | Individual agent query (blocking) |
| `onto_build_start` | path_or_url, schema | session_id | Start ontology build |
| `onto_build_status` | session_id | Progress (round, coverage) | For polling |
| `onto_build_result` | session_id | Ontology result | Receive result after completion |
| `onto_session_list` | -- | Session list | Query active/completed sessions |

**Non-blocking pattern** (same as Ouroboros):
```
Host: onto_review_start(target="process.md") -> session_id
Host: onto_review_status(session_id) -> "Round 1: 5/7 complete"
Host: onto_review_status(session_id) -> "Philosopher synthesis in progress"
Host: onto_review_result(session_id) -> final result
```

### 13.5 Server Directly Calls LLM

What the host's Agent tool currently does in onto, the MCP server performs directly:

```
[Current]
Host -> Agent tool(prompt="You are onto_logic...") -> Claude Code internal LLM call

[MCP server]
Server -> Claude API / OpenAI API (direct call)
     -> Combines agent role prompt + review target + domain documents
     -> Async parallel calls to verification agents
     -> Saves results to session directory
     -> Delivers verification agent results to Philosopher (within server)
```

This means:
- **With Claude API**: Same quality as current
- **With OpenAI API**: Freedom to choose models
- **Regardless of host**: Only MCP support is needed

### 13.6 Side Effect: Structural Resolution of Existing Issues

| Existing Issue | Status in MCP Server |
|---|---|
| **Issue 1-A** (team-lead context saturation) | Resolved. Server manages agent results directly, so they are not loaded into host context |
| **Issue 1-B** (inter-session agent leakage) | Resolved. Server manages sessions in isolation. ~/.claude/teams/ not used |
| File-based relay complexity | Resolved. Relayed in server internal memory. Files used only for result preservation |
| Fallback branching (Teams -> Agent tool) | Resolved. Server owns a single execution path |

### 13.7 Trade-offs

**Gains:**
- Platform independence (all MCP-supporting hosts)
- Fundamental resolution of host context saturation
- Execution path simplification (Teams/Agent tool/Fallback branching removed)
- Freedom to choose models (Claude, OpenAI, others)

**Costs:**
- MCP server implementation required (Python or TypeScript)
- Users must separately configure LLM API keys
- Process logic in process.md/review.md must be translated into executable code
- Increased deployment complexity (plugin + MCP server)
- Increased debugging difficulty (server logs must be checked)

### 13.8 Coexistence with Current Plugin

After MCP server transition, the current plugin structure (commands/, roles/, processes/) is retained:

- **commands/*.md**: Retained as fallback for environments without the MCP server (existing Claude Code-only mode)
- **roles/*.md**: Referenced by MCP server when assembling agent prompts
- **processes/*.md**: Source definitions for the MCP server's orchestration logic (dual maintenance of code and documents)
- **domains/**: Existing domain document installation script retained

### 13.9 Implementation Stages (Plan)

| Stage | Scope | Description |
|---|---|---|
| **Stage 1** | Individual query | Implement `onto_question` tool. Simplest as it involves only a single agent call |
| **Stage 2** | Agent panel review | Implement `onto_review_start/status/result`. Core value |
| **Stage 3** | Learning system | Server manages learning storage/loading |
| **Stage 4** | Build process | Server manages the integral exploration loop |

Each stage can operate in parallel with the existing plugin mode. If an MCP server is configured, it uses server mode; if not, it uses the existing plugin mode.
