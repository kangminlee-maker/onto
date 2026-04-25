# Ontology Reconstruct Process (Integral Exploration)

> The Explorer traverses the source, and lenses provide exploration directions in an iterative loop that incrementally reconstructs the ontology.
> Related: After reconstruct, transform via `/onto:transform`, verification via `/onto:review`.
>
> **State machine SSOT**: `src/core-runtime/scope-runtime/state-machine.ts` — `RECONSTRUCT_TRANSITIONS` (W-B-02 dedup).
> Reconstruct session 의 phase 전이(negotiating→gathering_context→reconstruct_exploring→adjudicating→awaiting_user_review→processing_responses→converting→converted)는 이 파일이 canonical definition.

## Naming: reconstruct (activity + process + code)

DL-013 activity taxonomy (2026-04-13) 이후 public activity name 은 **reconstruct** 로 통일되었고, W-A-77 (2026-04-14) rename 으로 process filename (`.onto/processes/reconstruct.md`) + slash command (`/onto:reconstruct`) + state machine 상수/타입/phase label (`RECONSTRUCT_TRANSITIONS` / `ReconstructState` / `reconstruct_exploring` / `reconstruct_failed` 등) 이 전수 정렬되었다. legacy `build` 토큰은 activity_enum.legacy_aliases 에만 alias 로 보존된다.

- **Activity name**: `reconstruct` (canonical, DL-013)
- **Process filename**: `.onto/processes/reconstruct.md` (W-A-77 rename 완료, 2026-04-14)
- **CLI entry**: `.onto/commands/reconstruct.md` (W-A-74 DL-020 해소, 2026-04-14)
- **CLI handler**: `src/core-runtime/evolve/commands/reconstruct.ts`

### Bounded path (review 3-step 대응, W-A-74)

W-A-74 에서 reconstruct CLI 의 3-step bounded path 를 확보했다. 이는 본 process document 의 RECONSTRUCT_TRANSITIONS 전체 상태 머신과는 구분되는 **CLI 관찰 가능 minimum surface** 다:

| Step | CLI | Bounded state 전이 | process document 과의 관계 |
|---|---|---|---|
| 1 | `onto reconstruct start` | → `gathering_context` | negotiating~gathering_context phase 의 CLI face |
| 2 | `onto reconstruct explore` | → `exploring` (반복 가능) | reconstruct_exploring~adjudicating~awaiting_user_review~processing_responses loop 의 bounded invocation |
| 3 | `onto reconstruct complete` | → `converted` | converting~converted phase + Principal 검증 요청 |

본 document 의 상세 phase 구조 (Phase 0.5 ~ Phase 4) 는 CLI 호출 내부에서 reconstruct runtime 이 실행하는 방법론이다. CLI 는 방법론의 public surface 만 노출한다.

§1.4 정본의 reconstruct 완료 기준 3축 (ontology 초안 산출 + domain knowledge 기반 "왜" 추정 + Principal 검증 경로) 은 CLI 3-step 과 다음과 같이 매핑된다:

- **초안 산출** ← `complete` 가 `ontology-draft.md` 생성
- **"왜" 추정** ← `explore` 가 reconstruct runtime 의 certainty classification 호출
- **Principal 검증 경로** ← `complete` 가 `principal_review_status=requested` 로 검증 대기 명시

## Generalization Scope

This process is an **extensible design**. Currently supported source types are codebase, spreadsheet, database, and document. New source types are supported by adding an `explorers/{source_type}.md` profile file and Phase 0.5 context questions. This is not a fully generalized abstraction for all source types.

## Design Principles

### Structural Difference Between Verification and Exploration

- **Verification (review)**: Multi-perspective evaluation of a scope-defined input. Independent parallelism is appropriate.
- **Exploration (reconstruct)**: Discovering domain knowledge from a scope-undefined source. Independent exploration yields N-fold duplication, and empty areas are only discovered at consensus time — unfavorable.

Therefore, reconstruct uses an **integral exploration** structure:
- A single Explorer traverses the source and generates **deltas** (domain fact reports)
- Lenses analyze deltas to attach **labels** (ontology elements) and propose **epsilons** (next exploration directions)
- Runtime Coordinator applies patches and checks convergence; Axiology Adjudicator resolves conflicts; Synthesize composes integrated directives
- Termination condition: (coverage satisfied) AND (new facts = 0)

### Purpose: Precise Reproduction

The purpose of this process is to **precisely reproduce the domain knowledge of the analysis target** (brownfield identification). It is not about making new judgments through the ontology.

Not all information about the target exists in the source:
- **Directly observable from the source**: Structural facts (Entity, relations, state transitions, dependencies, formulas, schemas)
- **Implemented in the source but lacking rationale**: Business policies (reasons for hardcoded rules, meaning of format rules)
- **Not in the source**: Design intent, user experience, organizational context

These three categories are distinguished via `certainty` classification, so users can understand "what is confirmed and where decisions are needed."

### Certainty Classification (2-Stage Adjudication)

The purpose of this classification is to **determine the action type** to present to the user in Phase 3. Each level triggers a different user action.

> This section is the **single source of truth (SSOT)** for certainty level definitions. Other locations (Label/Epsilon format, Phase 3 output, etc.) reference this definition.

**Stage 1 classification (Explorer)**:

| Level | Definition | Determination Criteria |
|---|---|---|
| `observed` | A fact directly observed from the source. Does not change without modifying the source | "Would this fact remain unchanged if the source is not modified?" → yes |
| `pending` | A fact that cannot be confirmed from the source alone | The above question yields "no" or "unknown" |

Boundary case: A hardcoded constant (e.g., MIN_PAYMENT=500) is `observed` (the value itself is verifiable from the source). The rationale for that constant (why 500) is `pending`.

**Stage 2 classification (lenses refine `pending` when assigning labels)**:

| Level | Definition | Downstream Action |
|---|---|---|
| `rationale-absent` | Implementation exists in the source, but its rationale is not in the source | Presented to user in Phase 3 as a "policy rationale unconfirmed" item |
| `inferred` | Reasonable inference but not directly confirmed from the source | Presented to user in Phase 3 with inference quality. Can be demoted to `pending` if refuted in subsequent rounds |
| `ambiguous` | Source interpretation splits into equally valid multiple directions that cannot converge to a single inference | Presented to user in Phase 3 with "Multiple interpretations are possible. Please choose" along with interpretation options |
| `not-in-source` | Cannot be determined from this source. Requires another source or user input | Presented in Phase 3 as a "user decision required" item. Cannot assign label — only a placeholder is recorded |

`ambiguous` determination criteria: "Do 2 or more equally valid interpretations exist, with no evidence in the current source to narrow down to one?" → if yes, `ambiguous`. If one is more valid, judge as `inferred` and mention alternative interpretations in the rationale.

If a lens determines that the Explorer's Stage 1 classification was incorrect, it reports a "certainty reclassification request" in issues. The Runtime Coordinator reflects this when applying patches.

**abduction_quality** (required for `inferred` classifications):

Self-evaluates the quality of inference. Used for prioritizing user decision items in Phase 3:
```yaml
abduction_quality:
  explanatory_power: high | medium | low   # How well does it explain the observed structure
  coherence: consistent | partial | conflicting  # Is it consistent with existing confirmed facts
```

When competing labels exist, the following rules apply (executed by Runtime Coordinator; ties escalated to Axiology Adjudicator):
1. Exclude candidates with `coherence: conflicting` from comparison (handled separately via conflict operation).
2. Among remaining candidates, compare `explanatory_power` first (high > medium > low).
3. If tied, compare `coherence` (consistent > partial).

**Justification guidelines**:

When lenses write the `rationale` field of a label, include the following:
- **Observed evidence**: From which cases/patterns was this observed (specify case count if applicable)
- **Logical connection**: The reasoning path from observation to judgment
- Write in 1-2 sentences.

---

## Agent Configuration (reconstruct mode)

| ID | Role | Behavior in Build |
|---|---|---|
| `explorer` | Source traverser | Directly traverses the source and generates deltas (domain fact reports). Only judges certainty as binary (`observed`/`pending`). Does not perform ontological interpretation. Performs structural recognition |
| Lenses (N, per process.md agent table) | Direction providers | Label deltas and propose epsilons for gaps in their dimension. **Do not directly traverse the source**. Refine `pending` facts' certainty |
| Runtime Coordinator | Deterministic orchestrator | Applies patches to wip.yml, processes certainty reclassifications, checks convergence, preprocesses epsilons (sorting, grouping, forced_directions), classifies conflicts by rule-resolvability, anonymizes unresolved conflicts. **Not an LLM agent — implemented as runtime logic** |
| Axiology Adjudicator | Conflict resolver | Resolves conflicts that runtime rules cannot resolve. Judges based on system purpose only. **Spawned as a fresh context per invocation with anonymized inputs** — does not carry round-level reasoning context, cannot identify which lens produced which position |
| `synthesize` | Integrator | Composes resolved material into integrated exploration directives. Does not produce independent perspectives or resolve conflicts — structures and edits only |

Lens definitions (`.onto/roles/{lens-id}.md`) are the same as in review. In reconstruct, the role shifts from "verification" to "identifying gaps in their dimension + assigning labels." The current lens list is managed in the agent configuration table in `process.md`.

### Role Boundary Principles

- **Lenses** produce findings independently. They do not see each other's outputs within the same round.
- **Runtime Coordinator** performs only deterministic operations. Any operation requiring semantic judgment is delegated to the appropriate lens or adjudicator.
- **Axiology Adjudicator** receives only: (1) `context_brief.system_purpose` + `.onto/principles/productization-charter.md`, (2) anonymized conflict pairs (lens IDs removed). Three protections against self-reinforcement: context isolation (fresh agent), source anonymization (lens ID removal), scope restriction (purpose documents only — see Adjudicator prompt for exact allowed inputs).
- **Synthesize** integrates material where all conflicts have already been resolved. It must not invent new perspectives or resolve conflicts.

### Distinction Between Explorer's Structural Recognition and Ontological Interpretation

The Explorer reports "what exists." "What it means" is judged by lenses.

| Action | Structural Recognition (Explorer allowed) | Ontological Interpretation (Explorer prohibited) |
|---|---|---|
| Code | "This class has 3 state fields" | "This is an Aggregate Root" |
| Spreadsheet | "This row has merged cells, Bold, different background color" | "This is a table header" |
| DB | "This table has 3 columns without FK" | "This is a Lookup table" |

When interpretation inevitably intervenes in structural recognition (such as spreadsheet format patterns), the Explorer **specifies the observational evidence**.

### Explorer Profiles by Source Type

The Explorer's process logic is identical. Source-type-specific traversal tools, structural recognition scope, and context questions are defined in **Explorer profiles**.

| Source Type | Profile |
|---|---|
| Codebase | `explorers/code.md` |
| Spreadsheet | `explorers/spreadsheet.md` |
| DB | `explorers/database.md` |
| Document | `explorers/document.md` |

To add a new source type: create `explorers/{source_type}.md` + add a row to this table.

Each profile file defines: traversal tools, module_inventory unit, structural recognition scope, source type determination conditions, detail location notation format, Phase 0.5 context questions, Phase 0.5 scan targets.

If non-code source traversal tools are unavailable (MCP server not configured, etc.), inform the user and halt the process.

---

### Focused Lens Query Protocol

A focused lens query is a single-question call to a specific lens outside the standard round loop (which dispatches all lenses in parallel). It is used in three contexts: (1) Phase 1 semantic identity matching (step 3c, addressed to semantics lens), (2) Phase 2 Step 2a ubiquitous_language cleanup (addressed to semantics lens), and (3) Phase 2 Step 2b underexplored module assessment (addressed to coverage lens).

**Invocation**: The team lead issues the query. Runtime Coordinator identifies when a query is needed and specifies the target lens and question; the team lead dispatches it.

**Context model**: Fresh context (new agent spawn). The lens receives only the query input and its role definition — not the full Phase 1 round context. This preserves independence from accumulated round-level reasoning.

**Input format**:
```yaml
focused_query:
  target_lens: {lens-id}
  query_type: {identity_match | ubiquitous_language_cleanup | underexplored_assessment}
  input: {query-specific structured input — schema defined in Query Type Registry below}
  context_refs: [{minimal reference files — role definition, domain document if applicable}]
```

**Output format**:
```yaml
focused_response:
  target_lens: {lens-id}
  query_type: {type}
  result: {query-specific structured output — schema defined in Query Type Registry below}
```

**Query Type Registry**: Adding a new focused query type requires adding a row below and defining the input/output schemas. Current types:

| query_type | target_lens | Input | Output | Used at |
|---|---|---|---|---|
| `identity_match` | semantics | List of candidate fact pairs (from Tier 2) | `[{pair_id, result: same\|different}]` | Phase 1.2 step 3c (diagnostic only) |
| `ubiquitous_language_cleanup` | semantics | wip.yml `ubiquitous_language` section | `[{term, proposed_action: unify\|distinguish\|keep, rationale}]` | Phase 2 Step 2a |
| `underexplored_assessment` | coverage | List of `underexplored_modules` from Step 1 | `[{module, classification: gap\|acceptable_skip, rationale}]` | Phase 2 Step 2b |

**Failure handling**: If the targeted lens fails to respond, the query result is treated as absent. The calling context proceeds without it:
- `identity_match`: Tier 2 diagnostic signal simply skipped (convergence unaffected — see Semantic identity matching)
- `ubiquitous_language_cleanup`: ubiquitous_language section left unchanged
- `underexplored_assessment`: all underexplored modules reported to user as-is (no gap/skip classification)

---

### Domain Selection (before Phase 0)

Determine `{session_domain}` per the "Domain Determination Rules" in `process.md`.

- If `@{domain}` is specified in the command: use non-interactive resolution
- If `@-` is specified: set `{session_domain}` to empty (no-domain mode)
- Otherwise: run the Domain Selection Flow

The resolved `{session_domain}` is used for domain document loading in teammate prompts and learning storage tags.

---

### Phase 0: Schema Negotiation

Determines the ontology structure in consultation with the user. **Must be executed before exploration begins.**

**0.1 Check for existing schema**
- If `{project}/.onto/builds/{session ID}/schema.yml` already exists, show its contents and confirm whether to reuse it.
- If it does not exist, proceed to 0.2.

**0.2 Present structure options**

Since full Phase 0.5 context (architecture, domain) has not yet been collected, the team lead recommends based on information available from $ARGUMENTS, the project's CLAUDE.md/README.md, and the source type determined in Phase 0.5.1 (which runs before Phase 0 — see Phase 0.5.1).

```markdown
## Please select the ontology structure

> **Recommended: {recommended schema}** — {recommendation reason in 1 sentence, derived from project characteristics}

### A. Axiom-based (academic/reasoning) — currently unsupported, planned for future implementation
- Composition: Class, Property, Axiom, Individual
- Characteristics: logical inference possible, automatic contradiction detection
- Suitable for: rigorous domain modeling, when standard compliance is required
- ⚠️ Axiom definitions are difficult to auto-extract from code traversal, requiring a separate process. Please select from B/C/D.

### B. Action-Centric (Palantir style)
- Composition: ObjectType, LinkType, ActionType, Function
- Characteristics: no Axioms, action-oriented, practical
- Suitable for: data platforms, operational systems

### C. Knowledge Graph
- Composition: Entity, Relation, Property
- Characteristics: simple graph structure, flexible
- Suitable for: search, recommendation, data linkage

### D. Domain-Driven
- Composition: Aggregate, Entity, ValueObject, DomainEvent, Command
- Characteristics: centered on business logic boundaries
- Suitable for: microservices, event-driven systems

### E. Custom
- Combine the above structures or define your own

Please select an option or describe the desired structure.
```

**Recommendation judgment criteria** (based on Phase 0.5.1 data only — source_type, file extensions, top-level module count, CLAUDE.md/README.md keyword scan):

- source_type = `document` or `spreadsheet` → C (knowledge graph — most flexible for unstructured content)
- source_type = `database` with many tables → B (action-centric)
- source_type = `code` AND top-level module count ≤ 3 AND CLAUDE.md/README.md contains "domain" / "aggregate" / "bounded context" keywords → D (domain-driven)
- source_type = `code` AND top-level module count > 10 OR CLAUDE.md/README.md contains "service" / "API" / "platform" keywords → B (action-centric)
- Otherwise (including ambiguous cases) → C (most flexible, default safe choice)

> **Note**: Deeper architecture-based judgments (business logic boundary clarity, operational vs transactional, etc.) require `context_brief.architecture` which is only collected in Phase 0.5.2–0.5.4 (after Phase 0). Schema reconfirmation against the collected context is performed in Phase 0.5.5 (see Phase 0.5.5 Schema reconfirmation check).

**0.3 Schema confirmation and save**

Saves the user-selected/customized structure to `{project}/.onto/builds/{session ID}/schema.yml`.

```yaml
name: {structure name}
version: 1
description: {reason for choosing this structure — based on user statement}
element_types:
  - name: {element type name}
    description: {what this type is}
    has: [{sub-property list}]
```

---

### Phase 0.5: Context Gathering

Collects as much available context as possible before exploration begins.

**0.5.1 Source type determination and scan**

Auto-determines the source type from $ARGUMENTS and file extensions/content. If determination is ambiguous (extensions like `.json`, `.csv` that apply to multiple types), asks the user for the source type.

After source type determination, checks availability of traversal tools defined in the corresponding profile (`explorers/{source_type}.md`). If tools are unavailable (MCP server not configured, etc.), inform the user and halt the process.

> **Execution order note**: Phase 0.5.1 (source type determination + tool availability check) runs **before** Phase 0 (schema negotiation) to prevent wasting the user's time on schema selection when tools are unavailable. The remaining Phase 0.5 steps (0.5.2–0.5.4) run after Phase 0 as originally ordered. Effective sequence: Domain Selection → **0.5.1** → Phase 0 → 0.5.2–0.5.4 → Phase 1.

Source-type-specific scan targets are defined in the "Phase 0.5 scan targets" section of each Explorer profile. Source-type-specific context questions are defined in the "Phase 0.5 context questions" section of the profile.

Collects the project's top-level module list (`all_modules`). This list is reference information guiding the Explorer's initial exploration scope. The coverage denominator is the `module_inventory` reported by the Explorer in Round 0, which may differ from `all_modules`.

**0.5.2 User context questions**

Uses the "Phase 0.5 context questions" from the Explorer profile. If the user answers "none" or "unknown," skip and proceed.

**0.5.3 Related source identification**
- If $ARGUMENTS is a GitHub URL, auto-clone
- Detect related repo references from CLAUDE.md, package.json, etc.
- If related sources exist, suggest to the user "Analyze together?"

**0.5.4 Context summary creation**

Saves the collected context to `{project}/.onto/builds/{session ID}/context_brief.yml`:

```yaml
context_brief:
  source_type: code | spreadsheet | database | document | mixed
  source_profile:
    type: {source type}
    format: {xlsx | csv | sql | py | java | ...}
  system_purpose: "{the problem the target solves — 1-2 sentences}"
  architecture: "{major tech stack/structure — based on CLAUDE.md or user statement}"
  legacy_context: "{legacy history — based on user statement}"
  sources:
    - type: {source type}
      path: {path}
  all_modules: [{full list of top-level modules/sheets/tables}]
  known_terms: [{domain terms provided by user}]
```

**0.5.5 Schema reconfirmation check**

After `context_brief.yml` is saved, the team lead compares the collected `architecture` / `system_purpose` against the schema selected in Phase 0. Criteria triggering a reconfirmation prompt:

- `architecture` keywords contradict the schema's typical pattern (e.g., schema B "action-centric" selected but architecture describes strong domain boundaries → schema D candidate)
- `system_purpose` implies a source type the schema doesn't fit (e.g., schema D "domain-driven" selected but system_purpose describes a data-analysis pipeline → schema C candidate)
- User-stated `known_terms` contain clear aggregate/bounded-context vocabulary that Phase 0.5.1 keyword scan missed

If any criterion matches, the team lead presents: "Collected context suggests schema {Y} may fit better than the initially selected {X}. Keep {X} / switch to {Y} / customize." If none match, proceed to Phase 1 silently (no user prompt).

Default when user does not respond: keep the initially selected schema (no switch).

---

### Phase 1: Integral Exploration Loop

Phase 1 consists of **2 Stages**. Within each Stage, the integral loop (Explorer→lenses→Runtime→Adjudicator→Synthesize) operates independently.

| Stage | Purpose | fact_type Scope | Max Rounds |
|---|---|---|---|
| Stage 1: Structure | Identify Entity, Enum, Relation, Property | entity, enum, property, relation, code_mapping | 5 |
| Stage 2: Behavior | Identify State Machine, Command, Query, Policy, Flow | state_transition, command, query, policy_constant, flow | 5 |

When Stage 1 converges (or reaches maximum), proceed to Stage 2. The Stage 2 Explorer references Stage 1's wip.yml (confirmed Entity list) to perform behavior exploration.

**When Schema A is selected**: Axiom definitions are difficult to auto-extract from code traversal and require a separate process; currently unsupported. Phase 0 guides the user to re-select from B/C/D.
**When Schema C is selected**: Stage 2's command/query are converted to Entity (entity_type: command/query).

Follows the **Agent Teams Execution** in `process.md` (including error handling rules).
Creates a team (`onto-reconstruct`) via TeamCreate.

**Error handling (reconstruct-specific)** — applies process.md Retry Protocol. Reconstruct-specific rules:

- **Explorer failure**: Halt the process + inform the user (irreplaceable single point).
- **Runtime Coordinator failure**: Halt the process + inform the user (irreplaceable; failure indicates a bug, not a transient error).
- **Partial failure among N lenses**: Retry per process.md → graceful degradation. Adjust the denominator to the number of responding lenses when judging convergence.
- **Axiology Adjudicator failure (Phase 1 round)**: Skip adjudication for this round. **Epsilon conflicts** of this round are preserved as `unresolved_for_user` and accumulated into `meta.cumulative_unresolved_conflicts` for Phase 2 Step 4 collation (eventually Phase 3). **Label conflicts** (patch operation `conflict`) already live in wip.yml issues with `resolution: pending` and continue to wait for Phase 2 Step 3 (not escalated early — Phase 2 Step 3 is their designated batch resolution point). The round continues with consensus + rule-resolved epsilons only.
- **Synthesize failure**: Deliver raw epsilons directly to Explorer, sorted by priority. Specifically: consensus items pass through as-is; rule-resolved items pass through with their selected direction; adjudicator-resolved items pass through as the Adjudicator's selected position (not the raw conflict pair); forced_directions pass through as-is. Log degradation.
- **Degradation accumulation threshold**: Runtime Coordinator maintains two per-Stage counters in `meta` (mirrored in `convergence_status`): `adjudicator_failures_streak` and `synthesize_failures_streak`. Counter rules:
  - Adjudicator counter increments only on **actual agent failure** during a round where Adjudicator was invoked (unresolvable conflicts existed). Resets to 0 on successful Adjudicator completion. **A round where Adjudicator was not invoked (no unresolvable conflicts) does NOT change the counter** — it is neither a success nor a failure for this role.
  - Synthesize counter increments on Synthesize agent failure; resets on successful Synthesize completion. Synthesize runs every round.
  - Both counters reset to 0 at Stage transition.
  - If either counter reaches `config.reconstruct.degradation_warn_threshold` (default: 2 — see Config section), present a warning to the user before the next round starts:
  - Show which role(s) degraded and what that implies for Phase 3 output (Adjudicator down → N unresolved conflicts will escalate to the user; Synthesize down → exploration directives will be unsorted lists)
  - Show current round and remaining rounds in the Stage
  - Ask: "Continue this Stage? [continue / end Stage now / abort reconstruct]"
    - **continue** — proceed with degraded execution
    - **end Stage now** — close current Stage immediately, proceed to Stage transition (if Stage 1) or Phase 2 (if Stage 2)
    - **abort reconstruct** — halt the entire reconstruct process, preserve current wip.yml as partial artifact in the session directory
  - Default action (if user does not respond): continue
- **Stage 2 module_inventory replacement**: Any modules from Stage 1's `module_inventory` that remained in `uncovered_modules` at Stage 1 termination are preserved in wip.yml meta as `stage1_uncovered_modules` and reported in Phase 3's "Unexplored Areas" section.

#### 1.0 Team Composition

Creates the following agents as teammates:
- **explorer**: Dedicated source traverser. Recommended to use Explore-type subagent.
- **Lenses (N, per process.md agent table)**: Analysis agents that do not directly traverse the source. Same role definitions as review (`.onto/roles/{lens-id}.md`), operating in reconstruct mode.
- **synthesize**: Integrator that composes resolved material into unified output. Not an independent lens.

Explorer initial prompt composition:

The team lead reads the `explorers/{source_type}.md` profile corresponding to the source type determined in Phase 0.5 and fills in the template variables below.

```
You are the source traverser (Explorer).
You are joining the onto-reconstruct team.

[Role]
You directly traverse the analysis target and generate deltas (domain fact reports).
You do not perform ontological interpretation (whether this is an Entity, Aggregate, etc.).
Your role is to describe facts observed from the source in domain language.
Perform structural recognition (observation of format differences, reference relationships, etc.), but specify the observational evidence.

[Structured Reporting Rules]
Include structured_data whenever possible. Specifically:
- Class/table discovery: fact_type: entity + structured_data with field list
- Enum discovery: fact_type: enum + values list
- FK/reference discovery: fact_type: relation + from/to/fk_column
- State transition discovery: fact_type: state_transition + from/to/trigger
- Service method discovery: fact_type: command or query + signature
- Hardcoded constant discovery: fact_type: policy_constant + value
If structuring is not possible, report with statement + detail only.

Also populate `observation_aspect` for each fact:
- structure: fact about what the source IS (names, fields, schemas, relations)
- behavior: fact about what the source DOES (state transitions, methods, flows)
- presentation: fact about how the source is displayed (formatting, layout, merged cells)

[Source Type: {source_type}]
- Traversal tools: {profile's "traversal tools"}
- module_inventory unit: {profile's "module_inventory unit"}
- Structural recognition scope: {profile's "structural recognition scope"}
- detail location notation: {profile's "detail location notation"}

[Structural Recognition Examples]
{profile's "structural recognition examples" — correct reporting / what not to do}

[Certainty Classification Rules]
Perform only Stage 1 classification for each fact:
- observed: a fact directly observed from the source (structure, value, relation, constraint)
- pending: a fact that cannot be fully confirmed from the source alone

Determination criteria: "Would this fact remain unchanged if the source is not modified?" → if yes, observed.
Boundary case: A hardcoded constant (e.g., MIN_PAYMENT=500) is observed (the value itself is verifiable from the source). The rationale for that constant (why 500) is pending.

[context_brief]
{context collected in Phase 0.5 — content of context_brief.yml}

[Delta Report Format]
Refer to "Delta Format" below.

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

[Team Rules]
- Traverse the source according to the team lead's exploration directives (integrated epsilon).
- Report traversal results in delta format to the team lead.
- If traversal fails (file access failure, parsing failure, etc.), report delta with status: failed.
- Respond in English. Your delta flows into wip.yml and is consumed by downstream agents (Synthesize, Adjudicator). Principal-facing translation happens only at Runtime Coordinator render seats (see `.onto/principles/output-language-boundary.md`).
- Do not use metaphors or analogies.
```

Lens initial prompt: use the **Teammate Initial Prompt Template** from `process.md`. However, replace [Task Directives] with the following:

```
[Task Directives — reconstruct mode]
You are operating in reconstruct mode.
In review mode, your role is "verification," but in reconstruct mode, it shifts to "identifying gaps in your dimension + assigning labels."
You do not directly traverse the source. You analyze deltas (domain fact reports) reported by the Explorer.

Each round, the team lead delivers:
- Source type (code / spreadsheet / database / document)
- This round's delta (Explorer report)
- Cumulative confirmed elements list (anonymized wip — labeled_by excluded)

The `source.type` and `detail` field location notation in deltas vary by source type (file:line, sheet:cell range, schema.table.column, etc.). For source-type-specific notation rules, refer to "detail location notation" in `explorers/{source_type}.md`.

Procedure:
1. **Label**: For each fact in the delta, assign an ontology element type from your specialized perspective.
   - Specify the matching element_type from the schema
   - If not applicable, state "no label"
   - Specify the rationale in 1 sentence
   - If the fact's certainty is pending, perform the following refinement (refer to the "Certainty Classification" section for definitions):
     * rationale-absent: implementation exists in the source but its rationale is not in the source
     * inferred: inference not directly confirmed from the source. Also evaluate abduction_quality
     * ambiguous: equally valid multiple interpretations exist and cannot converge to a single inference
     * not-in-source: cannot be determined from this source. Requires another source or user input

2. **Certainty-specific processing rules**:
   - observed fact: assign label normally
   - rationale-absent fact: assign label + register "rationale unconfirmed" issue
   - inferred fact: label assignment possible but propagate certainty to label. Can be demoted to pending if refuted in subsequent rounds
   - ambiguous fact: tentatively assign label with the most plausible interpretation + register alternative interpretations in issues. Interpretation options to be presented to user in Phase 3
   - not-in-source fact: cannot assign label. Record "concept may exist in this area" placeholder → user decision target in Phase 3

3. **Epsilon**: From the cumulative element list and delta, identify areas not yet explored from your perspective.
   - Specific exploration direction (where and what to check)
   - If nothing further to explore, state "no epsilon"
   - Priority criteria:
     * high: without this, the current ontology contains errors
     * medium: reduces comprehensiveness but is not an error
     * low: nice to know but not essential

4. **Issue**: Report any problems/questions discovered in the delta, including certainty reclassification requests.

[Report Format]
Refer to "Label/Epsilon Format" below.
```

Axiology Adjudicator prompt (spawned as a **fresh agent per invocation** — not a persistent teammate):

```
You are the conflict adjudicator.

[Role]
You resolve conflicts between lenses that runtime rules could not resolve.
Your sole criterion is alignment with the system's stated purpose and operating principles.
You do not produce independent findings, propose exploration directions, or assign labels.

[Input]
You receive:
- System purpose and operating principles only. Specific allowed inputs:
  - `context_brief.system_purpose` field
  - `.onto/principles/productization-charter.md` (the canonical system purpose document)
  - Excluded: `context_brief.architecture`, `context_brief.legacy_context`, other `.onto/principles/` files (naming-charter, OaC, LLM-Native, etc. — these encode structural/engineering rules and would violate scope restriction)
- A list of anonymized conflict pairs. Each pair contains:
  - position_a: {direction or label} + priority + justification
  - position_b: {direction or label} + priority + justification
  - Lens identifiers are removed. You do not know which lens produced which position.

[Procedure]
For each conflict pair:
1. Evaluate which position better serves the system's stated purpose
2. If one position clearly aligns better, select it with a 1-sentence rationale
3. If neither position has a clear purpose advantage, report "no_resolution" (see Phase 2 Step 3 for downstream handling)

[Output Format]
Refer to "Adjudicator Output Format" below.

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

[Rules]
- Judge based on system purpose only. Do not apply structural, coverage, or pragmatic criteria — those perspectives are already represented in the justifications.
- Do not speculate about which lens produced which position. Justification text may contain perspective-revealing language (e.g., "from a structural perspective") — disregard such cues entirely.
- Respond in English. Your judgment is written into `wip.yml.issues[].resolution_decision` and consumed by Synthesize + downstream rounds. Principal-facing translation happens only at Runtime Coordinator render seats (see `.onto/principles/output-language-boundary.md`).
- Do not use metaphors or analogies.
```

Synthesize initial prompt:

```
You are the integrator (Synthesize).
You are joining the onto-reconstruct team.

[Role]
You compose resolved material into integrated exploration directives for the Explorer.
You do not produce independent perspectives, resolve conflicts, or assign labels.
All conflicts have been resolved before material reaches you.

[Procedure]
Each round, the team lead delivers:
- Consensus epsilon items (agreed by multiple lenses)
- Rule-resolved epsilon items (resolved by runtime via abduction_quality rules)
- Adjudicator-resolved epsilon items (resolved by Axiology Adjudicator)
- Forced directions (generated by runtime for uncovered modules)

Perform:
1. Merge epsilon items that point to the same exploration area into unified directives
2. Order directives by priority (high → medium → low)
3. Generate the integrated exploration directive text for the Explorer
4. Carry forward any `no_resolution` items from the Adjudicator into the `unresolved_for_user` list

[Output Format]
Refer to "Synthesize Output Format" below.

[Language Policy]
Respond in English. Reasoning, tool arguments, YAML / markdown emits, and
hand-offs to other agents stay English-only regardless of `output_language`.
Principal-facing translation happens at the Runtime Coordinator's render seat
(.onto/principles/output-language-boundary.md).

[Rules]
- Do not invent new exploration directions not present in the input.
- Do not re-adjudicate resolved conflicts.
- **Do not mutate wip.yml directly.** Your output is a directive (text or structured emit); Runtime Coordinator is the sole writer of wip.yml. This applies in Phase 1 rounds and Phase 2 Step 4 alike.
- Work according to the team lead's directives.
- Respond in English. Your epsilon directive feeds the next round's Explorer prompt and is persisted under `wip.yml.meta.epsilons`. Principal-facing translation happens only at Runtime Coordinator render seats (see `.onto/principles/output-language-boundary.md`).
- Do not use metaphors or analogies.
```

#### 1.1 Stage 1, Round 0: Initial Structure Exploration

The team lead directs the Explorer to perform initial exploration:

```
[Initial Exploration Directive]
Survey the overall structure of the analysis target:
1. Source structure (package/module/sheet/table list)
2. Core entities of each module (list and 1-line summary of domain models)
3. If documentation exists, summarize key content
4. Confirm tech stack/format

Depth: up to each module's domain models only. Do not look at detailed logic yet.
Do not redundantly explore documents already collected in Phase 0.5.

[fact_type Scope]
This is Stage 1. Focus on entity, enum, property, relation, code_mapping.
State transition rules, service methods, and business constants will be explored in Stage 2.

> code_mapping starts in Stage 1 but is supplemented in Stage 2 if additional discoveries (e.g., legacy names in the service layer) are made. The code_mapping fact_type is allowed in both Stages.

[module_inventory Report]
You must include module_inventory in delta-0:
- List of all modules/sheets/tables that are exploration targets
- This list is used as the coverage denominator for the termination condition
- Format: module_inventory: [{module list}]
```

When the Explorer reports delta-0, the team lead delivers the content to lenses without modification.

#### 1.2 Round N: Iterative Loop (Common to Stage 1 and Stage 2)

```
Loop:
  1. Team lead delivers Explorer's delta(N-1) to lenses
     + cumulative confirmed elements list (anonymized wip: labeled_by excluded)
  2. Lenses each report label + epsilon + issues
  2.5. (Optional) Tier 2 semantic identity diagnostic — see "Semantic identity matching" below:
     - Runtime Coordinator computes Jaccard candidate pairs from new facts vs existing facts
     - If candidate pairs exist and diagnostic is enabled (`config.semantic_identity.diagnostic_enabled`, default `true`): team lead dispatches a focused lens query (`query_type: identity_match`) to the semantics lens
     - Results are logged as diagnostic warnings only; DO NOT affect step 3c convergence
     - If semantics lens unavailable: skip this step, log "advisory signal unavailable"
  3. Runtime Coordinator (deterministic):
     a. Applies patches to wip.yml from lens labels (Phase 1.4)
     b. Processes certainty reclassification requests from issues
     c. Checks convergence (termination condition) using Tier 1 only — Tier 2 diagnostic does not affect this
     d. If terminate → exit loop
     e. Preprocesses epsilons: sort by priority, group by direction, generate forced_directions for uncovered modules
     f. Classifies conflicts: consensus / rule-resolvable / unresolvable
     g. Resolves rule-resolvable conflicts via abduction_quality rules
     h. Anonymizes unresolvable conflicts (removes lens IDs)
  4. Axiology Adjudicator (fresh context, only if unresolvable conflicts exist):
     - Receives anonymized conflict pairs + system purpose documents
     - Returns resolution or "no_resolution" per conflict (see Phase 2 Step 3 for no_resolution handling)
  5. Synthesize:
     - Receives: consensus items + rule-resolved items + adjudicator-resolved items + forced_directions
     - Composes integrated exploration directives
  6. Team lead delivers integrated directives to Explorer
     (does not modify or summarize the content)
  7. Explorer traverses in the directed direction → reports delta(N)
  → return to 1
```

**Convergence judgment (termination condition)** — AND:

Computed by Runtime Coordinator at step 3c. No LLM judgment required.

```
Termination = (coverage satisfied) AND (information convergence)

Coverage satisfied = at least 1 fact reported from every module in module_inventory
Information convergence = number of new facts in Explorer's reported delta = 0
            (only previously reported content found in all epsilon directions)

"New fact" = a fact whose subject+statement differs from every previously reported fact.
               Supplementing an existing fact's detail does not count as "new."
```

> **Semantic identity matching**: Runtime Coordinator determines "new fact" via a deterministic single-tier rule, with an optional LLM-based diagnostic signal:
>
> **Tier 1 (gating, deterministic)**: Normalize subject+statement then compare token multisets. Two facts are the "same fact" if and only if their normalized token multisets are identical.
>
> Normalization steps (in order):
> 1. Lowercase the entire string
> 2. Split on runs of Unicode letters and numbers (`/[\p{L}\p{N}]+/gu`). This replaces the legacy ASCII-only split (`[^a-z0-9]+`) which stripped all non-Latin characters
> 3. Drop English stopwords: {`a, an, the, of, to, in, on, is, are, was, were, be`}
> 4. Apply minimum token length — **language-sensitive threshold**:
>    - **Latin tokens**: minimum 4 characters. Drops short function words (`with`, `that`, `from`) that add noise without semantic content
>    - **CJK tokens**: minimum 2 characters. Korean/CJK words carry semantic content at shorter lengths (`코드` = code, `검증` = verification). A word is classified as CJK if it contains any character in: Hiragana `U+3040–30FF`, Hangul Jamo `U+3130–318F`, Hangul Syllables `U+AC00–D7AF`, CJK Unified Ideographs `U+4E00–9FFF`
>
> **Rationale for CJK threshold**: The previous ASCII-only tokenizer (`[^a-z0-9]+`) stripped every Korean character, making convergence detection blind on Korean-heavy corpora (e.g., this repository's own learnings). Unicode-aware splitting with a lower CJK threshold restores semantic sensitivity.
>
> **Convergence is determined solely by Tier 1.** This preserves the "No LLM judgment required" guarantee for termination: given the same source, the same normalized facts, the reconstruct terminates at the same round.
>
> **Tier 2 (non-gating diagnostic, operator-toggleable)**:
> - **Non-gating** (invariant of the design): Tier 2 output never affects convergence, regardless of enable state or availability.
> - **Operator-toggleable**: enabled via `config.semantic_identity.diagnostic_enabled` (default `true`). When `false`, Step 2.5 is skipped entirely and no candidate pairs are computed.
>
> When enabled, Runtime Coordinator computes token-level Jaccard similarity between each new fact and existing facts. Pairs with similarity in `[T_diag, 1.0)` — default `T_diag = 0.7`, tunable via `config.semantic_identity.diagnostic_threshold` — are forwarded to a focused lens query (semantics lens) which returns `same | different`. Pairs below `T_diag` are logged as "different without query."
>
> Tier 2 results are **logged as diagnostic warnings** (e.g., "potential duplicate — fact A and fact B judged same by semantics lens but kept as separate facts by Tier 1") and surfaced in Phase 3 issues if any, but DO NOT affect convergence, DO NOT change the new-fact count, and DO NOT trigger degradation counters.
>
> **Rationale for `T_diag = 0.7`**: chosen as a conservative over-recall cutoff for diagnostic purposes. Values below 0.3 overwhelm the semantics lens with noise; values above 0.85 miss common synonym patterns. 0.7 balances call volume against recall. Implementers may tune.
>
> **Tokenization note**: mirrors the `significantTokens` function in `src/core-runtime/learning/promote/panel-reviewer.ts` (Unicode-aware, CJK-sensitive) to maintain a single tokenization convention across the codebase. Facts with <4 significant tokens after normalization are excluded from Tier 2 (too noisy); Tier 1 always applies regardless of token count.
>
> **Semantics lens unavailable (Tier 2 only)**: Tier 2 diagnostic skipped. No impact on convergence (Tier 1 is authoritative). Logged once per affected round as an "advisory signal unavailable" notice. Does NOT trigger graceful degradation because no round-level lens output is lost — only the optional Tier 2 diagnostic.
>
> **Semantics lens full failure (Round N participation)**: If the semantics lens fails to deliver its round-level label+epsilon output, this IS a graceful degradation case per the general lens failure rule (responding lenses denominator adjusted for convergence). The Tier 1/Tier 2 semantic identity logic is orthogonal to the lens's round-level participation.

**Build-time configuration** (all keys resolved from `{project}/.onto/config.yml`):

This section enumerates the reconstruct-specific keys. Definitions, valid
values, defaults, and the full resolution chain (onto-home → project → CLI
→ env var) for every OntoConfig key are in **`.onto/processes/configuration.md`**
(canonical SSOT). The block below is a reconstruct-only excerpt for quick
reference.

```yaml
# {project}/.onto/config.yml — reconstruct-relevant keys
output_language: en           # principal-facing output language only. Agent prompts, wip.yml, session-log, and all internal artifacts stay in English regardless of this setting. Translation occurs only at Runtime Coordinator render seats registered in `.onto/authority/external-render-points.yaml`. See `.onto/principles/output-language-boundary.md`.

semantic_identity:
  diagnostic_enabled: true    # default; when false, Tier 2 is skipped entirely
  diagnostic_threshold: 0.7   # Jaccard cutoff; pairs in [threshold, 1.0) forwarded to semantics lens

reconstruct:
  underexplored_threshold:
    min_floor: 2              # absolute minimum facts before considered underexplored
    ratio: 0.5                # fraction of per-Stage median
  degradation_warn_threshold: 2   # consecutive rounds before user warning
  max_rounds_per_stage: 5         # default max rounds per Stage
  max_phase4_reentries: 2         # max Phase 4 bug-guard re-entries before halting with session error
```

**Parser**: standard YAML 1.2. Config is read once at reconstruct start and snapshotted into session context; no mid-reconstruct reloads.

**Error handling**:
- **File absent**: all defaults apply silently.
- **File present, malformed YAML** (parser throws): **halt** the reconstruct with error class `config_malformed` and return the parser message to the user. Do NOT silently fall back — a malformed config indicates user intent that cannot be resolved.
- **Valid YAML, missing key**: default applies for that key (forward-compatibility with older configs).
- **Valid YAML, type-invalid value** (e.g., `diagnostic_threshold: "high"` instead of a number): log warning `config_type_invalid: {key}` to the session log (see "Session Log & Error Handling Artifact"), fall back to default for that key.
- **Valid YAML, out-of-range numeric** (e.g., `diagnostic_threshold: 1.5` outside `[0, 1]`; `min_floor: -3`; negative counts): log warning `config_out_of_range: {key}`, fall back to default.
- **Unknown keys** at any level (top-level or under `semantic_identity:` / `reconstruct:`): log `config_unknown_key_ignored: {path}` to the session log, then ignore. Registered top-level keys for this document: `output_language`, `semantic_identity`, `reconstruct`. Any other top-level key (e.g., a typo like `output_langage`) is logged as unknown. Registered sub-keys are those shown in the schema example above; other sub-keys under `semantic_identity:` / `reconstruct:` are also logged as unknown. Preserves forward-compatibility while surfacing typos for post-hoc diagnosis.
- **User-extension namespace**: keys matching `x-*` at any level, or nested under a top-level `custom:` block, are reserved for user/tool extensions. Runtime ignores them silently (no `config_unknown_key_ignored` warning), so integrators can annotate config without triggering forward-compat diagnostics.

If coverage is unsatisfied (facts=0 but unexplored modules exist), Runtime Coordinator force-generates epsilons targeting unexplored modules (step 3e).

Runtime Coordinator computes convergence_status:

```yaml
convergence_status:
  fact_convergence: true | false
  coverage_complete: true | false
  uncovered_modules: [{unexplored module list}]
  converged_lenses: [{lenses that reported no epsilon}]
  remaining_lenses: [{lenses with epsilons}]
  judgment: continue | terminate
  reason: "{judgment rationale — deterministic: references termination formula}"
```

**Maximum rounds**: 5 per Stage (10 total maximum). If convergence is not reached, proceed to Phase 2 with the current state and inform the user of unexplored areas (remaining_lenses' epsilons + uncovered_modules).

#### 1.3 Stage Transition

<!-- canonical-mirror-of: step-2-rationale-proposer §6.2 -->
<!-- canonical-mirror-of: step-1-flow-review §7.1 -->

**When a Stage 1 missing Entity is discovered in Stage 2**:
- The Explorer reports it as fact_type: entity (Stage fact_type scope exception).
- The Runtime Coordinator adds it to wip.yml with added_in_stage: 2, note: "supplemental discovery in Stage 2".
- Properties/relations for this Entity are explored in Stage 2's remaining rounds.

**Cross-Stage certainty propagation — policy summary**:

Certainty of Stage 1 elements can change in Stage 2 via three policy classes. Operation mechanics are defined in the Patch Format section — this table only states policy (what is allowed, and by which mechanism).

| Situation | Policy | Mechanism |
|---|---|---|
| Lens-initiated certainty transitions (demote, upgrade, nullify, reclassify-downgrade) | Allowed | Stage 2 lens reports `certainty_reclassification` issue with `requested_operation` — see Patch Format for operation semantics and validation |
| Upgrade **to `observed`** (`pending → observed`, `inferred → observed`) | **Only via Explorer re-emission + Tier 1 exact match** | Lenses do not traverse the source (see Role Boundary). Requires a subsequent Explorer delta with a concrete source location; Runtime's dedup/merge logic detects the match **only via Tier 1 (normalized token multiset identity)** and upgrades `certainty`, appends to `source.locations`, records `certainty_upgraded_at_round` + `upgrade_source: explorer_reconfirmation` for provenance. **Tier 2 near-matches (Jaccard-flagged) do NOT trigger upgrade** — they create a new element and a `conflict` issue for Adjudicator resolution in a later round. This preserves Tier 1 as the sole deterministic identity gate |
| Element **type change** (element_type) | Not allowed | If type change is needed, record in issues and present to user in Phase 3 |

##### 1.3.1 Hook α State Machine (`meta.stage_transition_state`)

Hook α (Rationale Proposer) is the v1 LLM call inserted between Stage 1 finalize and Stage 2 Round 0 to populate `intent_inference` for Stage 1's confirmed entities. The transition lifecycle is tracked by `meta.stage_transition_state`:

| State | Meaning | Resumption |
|---|---|---|
| `pre_alpha` | Stage 1 finalize complete, Hook α not yet entered | Hook α re-entry possible |
| `alpha_skipped` | `inference_mode == none` or `entity_list` empty — Hook α skipped, Stage 2 may proceed | Stage 2 exploration entry |
| `alpha_in_progress` | Proposer spawn started, directive apply not yet complete | Hook α re-entry possible |
| `alpha_completed` | Directive applied atomically, Stage 2 may proceed | Stage 2 exploration entry |
| `alpha_failed_retry_pending` | Full failure occurred, awaiting Principal retry response | Hook α re-entry possible |
| `alpha_failed_continued_v0` | Retry exhausted, Principal selected `[v] Switch to v0-only` — `intent_inference` not populated, `inference_mode` downgraded to `none` in raw.yml. `meta.stage` promoted to 2 | Stage 2 exploration entry |
| `alpha_failed_aborted` | Retry exhausted, Principal selected `[a] Abort` — Stage 2 entry blocked, `meta.stage` retained at 1, wip.yml preserved | Session terminated; Principal must decide on re-execution (wip.yml inheritance choice) |

`meta.stage_transition_retry_count` (one-shot retry persistence): atomically incremented to 1 with fsync when Principal selects retry after `alpha_failed_retry_pending`. Resumption-safe.

##### 1.3.2 Stage 1 → Stage 2 Transition Flow (with Hook α)

When Stage 1 terminates (convergence or maximum 5 rounds reached):

1. The Runtime Coordinator finalizes Stage 1's wip.yml.
2. Preserves Stage 1's module list as `meta.stage1_module_inventory` (original module list from Phase 0.5.1 / Round 0) and `meta.stage1_uncovered_modules` = stage1_module_inventory − modules with ≥1 fact after Stage 1.
3. **Replaces** `meta.module_inventory` with the Entity list confirmed in Stage 1. From this point (determined by `meta.stage == 2`), `module_inventory` semantically means "Entities to cover with behavior facts."
4. Sets `meta.stage_transition_state = "pre_alpha"` and `meta.stage_transition_retry_count = 0`. **`meta.stage` remains 1** until Hook α completes or skips successfully (Step 2 r2 fix — prevents half-complete state on Hook α failure).

   **=== Hook α — Rationale Proposer (Step 2 §6.2) ===**

   5a. **v1 entry precondition check**:
       - If `inference_mode == "none"` OR `entity_list.length == 0`:
         - `meta.stage_transition_state = "alpha_skipped"`
         - `meta.stage = 2`
         - Skip to step 6 (Stage 2 exploration; Hook α not invoked)
       - If `inference_mode ∈ {full, degraded}` AND `entity_list.length ≥ 1`:
         - Proceed to 5b

   5b. `meta.stage_transition_state = "alpha_in_progress"` + fsync (crash recovery).
       Team lead spawns Rationale Proposer (fresh agent per invocation, mirroring Axiology Adjudicator pattern):
       - Input package per Step 2 §2.1 (wip.yml elements + manifest + domain pack + config)
       - Prompt = Step 2 §4 template + input package
       - Role spec: `.onto/roles/rationale-proposer.md` (Track B W-A-86 promotion)

   5c. Receive Proposer directive:
       - Schema validation per Step 2 §3.7 reject conditions 1~9, §3.7.1 downgrade D1~D3
       - Reject → §7.1 full failure path (`meta.stage_transition_state = "alpha_failed_retry_pending"`)
       - Downgrade → warning log + apply proceeds

   5d. Atomic directive apply:
       - For each `proposal.target_element_id`, populate `wip.yml.elements[].intent_inference`:
         - `inferred_meaning` / `justification` / `domain_refs` / `confidence` (post-validation values only; populated only when outcome == `proposed`)
         - `rationale_state` = directive's `outcome` ("proposed" / "gap" / "domain_scope_miss" / "domain_pack_incomplete")
         - `state_reason` (when outcome ∈ {gap, domain_scope_miss, domain_pack_incomplete})
         - `provenance` block (full copy from directive)
         - **`provenance.gate_count = 1`** (Step 2 r3-amendment, Step 4 P-DEC-A1 — Principal approved 2026-04-23): initialized on Hook α populate for **all outcomes**. Hook γ subsequently increments to 2 on revise/confirm/mark_*. Pair with Step 3 §3.7.2 canonical and Step 4 §2.3 single-gate badge consume.
       - Atomic write (temp file + rename, or equivalent)
       - `meta.stage_transition_state = "alpha_completed"`
       - `meta.stage = 2`

   **=== Hook α step end ===**

6. Team lead delivers Stage 2 initial directives to the Explorer (reachable when `meta.stage_transition_state ∈ {alpha_completed, alpha_skipped, alpha_failed_continued_v0}`; `alpha_failed_aborted` does not reach this gate — session terminated):

   ```
   [Stage 2 Initial Exploration Directive]
   Based on Entities identified in Stage 1, survey their behaviors:
   1. State transition rules for each Entity (value change conditions and triggers for state fields)
   2. Service/gateway methods → classify as command (state-changing) or query (read-only)
   3. Hardcoded business constants (policy_constant)
   4. Business flows between entities (flow)

   [fact_type Scope]
   This is Stage 2. Focus on state_transition, command, query, policy_constant, flow.

   Reference Stage 1 wip.yml: {wip.yml path}
   ```

   When `meta.stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0}`, the `[entity_intent_inferences]` block in subsequent Explorer prompts is empty (no gating elements available).

7. Restart the integral loop from Stage 2's Round 0.

##### 1.3.3 Stage 2 coverage semantics

8. In Stage 2, an entity is "covered" when ≥1 fact of type `state_transition`, `command`, or `query` references it in `structured_data.entity` / `structured_data.target_entities`. `policy_constant` and `flow` facts do not count toward Stage 2 coverage (they're cross-cutting).
9. The convergence formula's "Coverage satisfied" uses `module_inventory` under the current Stage's semantics (source modules in Stage 1 when `meta.stage == 1`, Entities in Stage 2 when `meta.stage == 2`). `meta.stage` is the single source of truth for which semantics apply.

##### 1.3.4 Hook α failure handling

Step 2 §7.1 defines the full failure path for `alpha_failed_retry_pending`:
- Runtime presents Principal with retry / `[v] Switch to v0-only` / `[a] Abort` choice
- Retry consumes one-shot retry budget (`stage_transition_retry_count` increment to 1, atomic fsync before re-spawn)
- `[v]` path: `meta.stage_transition_state = "alpha_failed_continued_v0"`, `meta.stage = 2`, raw.yml `inference_mode = "none"` with `fallback_reason = "proposer_failure_downgraded"` (Step 1 §4.7 enum, populated at Phase 4 save)
- `[a]` path: `meta.stage_transition_state = "alpha_failed_aborted"`, session terminated

#### 1.4 Cross-Round Ontology Accumulation

Executed at **step 3a** of Phase 1.2 (after lens reports are complete, as part of Runtime Coordinator's deterministic processing).

The Runtime Coordinator converts lens labels into **patches** to update wip.yml. This is a deterministic field-mapping operation — no LLM judgment required.

**Patch Format**:
```yaml
patch:
  round: {round number}
  source_labels: [{label references for this round}]

  operations:
    - operation: add
      target_id: {new element ID}
      type: {element_type}
      name: {name}
      definition: {definition}
      certainty: {observed | pending | rationale-absent | inferred | ambiguous | not-in-source}
      # `pending` is a transient state with three entry paths:
      #   (1) Explorer Stage 1 emission — direct from initial classification (see Certainty SSOT Stage 1 table).
      #   (2) demote operation — refutation of an existing `inferred` fact.
      #   (3) reclassify operation — cross-level corrections (e.g., `observed → pending` on misidentification).
      # All `pending` elements are re-adjudicated by lenses in subsequent rounds (Stage 2 refinement) or at Phase 2 Step 3.
      # Phase 3.5 guarantees no `pending` remains at Phase 4 Save (see Phase 3.5 invariant and step 3.5 promotion).
      labeled_by: [{agents that assigned the label}]
      source_deltas: [{source delta IDs}]
      source_locations: [{source location list}]
      details: {type-specific details}

    - operation: update
      target_id: {existing element ID}
      add_labeled_by: [{additional agents}]
      add_source_deltas: [{additional delta IDs}]
      merge_details: {details to supplement}

    - operation: conflict
      target_id: {existing element ID}
      conflicting_label: {conflicting label content}
      reported_by: {reporting agent}
      resolution: pending | resolved | user_resolved | user_deferred
      resolved_position: position_a | position_b  # only when resolution: resolved
      resolution_text: "{only when resolution: user_resolved — user's free-form resolution}"
      # pending: stays in wip.yml issues across rounds. Resolved in Phase 2 Step 3 by Axiology Adjudicator.
      #   By Phase 3.5 (Runtime Coordinator write-back), no conflict may remain `pending`.
      # resolved: Adjudicator selected one of the conflicting labels (position_a or position_b);
      #   `resolved_position` records the choice.
      # user_resolved: user provided a custom resolution at Phase 3 — stored in resolution_text.
      # user_deferred: user did not address this conflict at Phase 3 (either explicit defer or
      #   unaddressed with a global "confirmed"). Element remains in its pre-confirmation state.
      # Distinct from per-round epsilon conflicts (resolved in Phase 1.2 step 4).

    - operation: demote
      target_id: {existing element ID}
      from_certainty: inferred
      to_certainty: pending
      reason: "{refutation rationale}"
      # When an existing inferred fact is refuted in a subsequent round.
      # Scoped to `inferred` only per the Certainty Classification SSOT.
      # `observed` misidentified → certainty reclassification request (Stage 1 error), not demote.
      # `rationale-absent` refuted → certainty reclassification request (the implementation itself was misread).
      # `ambiguous` → use nullify (not demote).

    - operation: upgrade
      target_id: {existing element ID}
      from_certainty: ambiguous
      to_certainty: inferred
      reason: "{dominant interpretation and its rationale}"
      # When additional evidence makes one interpretation dominant

    - operation: nullify
      target_id: {existing element ID}
      from_certainty: ambiguous
      to_certainty: not-in-source
      reason: "{rationale for excluding all interpretations}"
      # Generated by Runtime Coordinator when a lens reports an issue with
      # issue_type: certainty_reclassification, requested_operation: nullify
      # (all registered interpretations of an existing ambiguous element have been excluded).

    - operation: reclassify
      target_id: {existing element ID}
      from_certainty: {existing level}
      to_certainty: {new level}
      reason: "{lens-reported rationale}"
      # Generated by Runtime Coordinator for certainty_reclassification issues
      # that do not match demote / upgrade / nullify semantics.
      # Covers: observed misidentification → pending (Stage 1 error),
      #         rationale-absent refuted → pending (implementation misread),
      #         any other cross-level reclassification a lens identifies.
      #
      # Runtime validates (from, to) pair before applying. Rejected pairs:
      #   - Identity (from == to) — no-op
      #   - Transitions owned by dedicated operations:
      #       inferred → pending          → must use `demote` instead
      #       ambiguous → inferred        → must use `upgrade` instead
      #       ambiguous → not-in-source   → must use `nullify` instead
      #   - pending → observed / inferred → observed — not permitted via lens issue;
      #     the `observed` upgrade path requires Explorer re-emission (see cross-Stage
      #     propagation table) and is detected by Runtime's dedup/merge logic, not a
      #     lens-requested reclassify.
      # Rejected requests are logged as issues with severity: warning + reason: "invalid_reclassify_pair"
      # and the original lens request is preserved in the log for debugging.
```

**Lens-requested operation routing**: Lenses reporting `issue_type: certainty_reclassification` specify `requested_operation` ∈ {demote, upgrade, nullify, reclassify} matching one of the operation definitions above. Runtime routes directly to that operation's semantics (defined in the YAML block). Unknown values fall back to `reclassify` with the original value preserved in the delta `reason` field.

**Patch application rules** (for operations not covered by the YAML block above):
- New element (add): add to wip.yml
- Additional label for existing element (update): add agent to labeled_by, supplement details
- Multiple agent labels for the same type (update): add agents to labeled_by list (treated as consensus)
- Label contradicting existing element (conflict): record in wip.yml issues with `resolution: pending`. Persists across rounds (not retried per-round — distinct from epsilon conflicts). Batch-resolved by Axiology Adjudicator in Phase 2 Step 3
- demote / upgrade / nullify / reclassify: see the operation definitions above for semantics and constraints.

The ontology is updated each round at `{project}/.onto/builds/{session ID}/wip.yml`.
Delta originals are saved at `{project}/.onto/builds/{session ID}/deltas/d-{round}-{seq}.yml`.

```yaml
# wip.yml — updated each round
meta:
  schema: ./schema.yml
  source_type: {code | spreadsheet | database | document | mixed}
  stage: {1 | 2}
  round: {current round}
  status: in_progress
  module_inventory: [{current-stage inventory — source modules in Stage 1, Entity IDs in Stage 2; semantic determined by `stage` field}]
  # Stage 2 only — preserved at Stage transition:
  stage1_module_inventory: [{original source module list from Stage 1 Round 0}]
  stage1_uncovered_modules: [{Stage 1 modules with 0 facts at Stage 1 termination}]
  # Per-role degradation counters (Phase 1.2 loop):
  adjudicator_failures_streak: {int, resets on success or Stage transition}
  synthesize_failures_streak: {int, resets on success or Stage transition}
  # Cross-round accumulation of unresolved conflicts (for Phase 2 Step 4 collation):
  cumulative_unresolved_conflicts: [{conflict_id, conflict_kind, subject, unresolved_since, position_a, position_b}]
  # Phase 3 user response log — required for Phase 3.5 idempotent replay and crash recovery.
  # Write-once at Phase 3 response receipt; never mutated thereafter. Cleared when Phase 4 Save succeeds.
  # Absence of this field after Phase 3 prompt was rendered = resumption trigger: Runtime re-enters Phase 3
  # and re-renders the same summary from existing wip.yml (see Phase 3 "Resumption" bullet).
  phase3_user_responses:
    received_at: "{ISO 8601 UTC timestamp when user submitted the Phase 3 reply}"
    global_reply: confirmed | adjustments_provided
    conflict_decisions:
      - conflict_id: "{string id matching Synthesize output conflict_id, case-sensitive exact match}"
        decision: position_a | position_b | user_resolved | user_deferred
        resolution_text: "{required when decision == user_resolved; free-form user text}"
    certainty_decisions:
      - element_id: "{string id matching wip.yml element id, case-sensitive exact match}"
        decision: confirmed | rejected | deferred
        user_rationale: "{optional free-form text}"
    other_adjustments: "{free-form text from user's Phase 3 global reply; advisory only — not applied deterministically by Runtime}"
  # Consistency rule: if global_reply == "confirmed", conflict_decisions and certainty_decisions MAY still be populated
  # (user confirms globally AND addresses some items); unaddressed items default to user_deferred.
  # If global_reply == "adjustments_provided", at least one of conflict_decisions / certainty_decisions / other_adjustments MUST be non-empty.
  # Violation handler: if the user submits global_reply == "adjustments_provided" with all three fields empty,
  # Runtime does NOT write phase3_user_responses, logs `phase3_response_inconsistent` warning to session-log, and
  # re-prompts Phase 3 with a clarifying message ("You indicated adjustments, but none were provided. Please specify,
  # or reply 'confirmed' to proceed."). Phase 3 is interactive, so re-prompt is the natural recovery path (no halt).
  #
  # Extensibility path: adding a new top-level field to phase3_user_responses (e.g., a future
  # `ambiguity_decisions` category) requires (1) adding the schema declaration here, (2) updating the
  # consistency rule above to reference the new field, (3) extending Phase 3 rendering to prompt for it,
  # and (4) extending Phase 3.5 to apply it. The `other_adjustments` field is NOT an extension point —
  # it is advisory-only and deliberately free-form; structured decisions MUST become first-class fields
  # rather than being encoded in `other_adjustments` text. This preserves Phase 3.5 determinism.

  # Phase 4 runtime state — system-managed, NOT part of user response:
  phase4_runtime_state:
    reentry_count: 0   # incremented by Phase 4 bug-guard on re-entry (see Phase 4 bug-guard rules)
  # Lifecycle: reentry_count starts at 0 at first Phase 4 entry; incremented atomically with wip.yml fsync
  # (must survive Runtime crash/restart to prevent crash-restart loop bypass); cleared with phase3_user_responses on Save success.
  # Atomic-clear invariant: phase3_user_responses and phase4_runtime_state MUST be cleared in the same wip.yml
  # rewrite that marks Save success. Partial clear (one but not the other) leaves the next /onto:reconstruct invocation
  # unable to distinguish completion from resumption; Runtime enforces this via a single atomic write.
  # Lifecycle of cumulative_unresolved_conflicts (Runtime-managed):
  #   - Appended by Runtime at end of each round (from Synthesize's unresolved_for_user).
  #   - Clear-on-resolve: at each round's step 3 (after Runtime applies label patches) and step 4
  #     (after Adjudicator resolutions are applied), Runtime scans cumulative entries and removes
  #     any whose conflict_id now has a terminal resolution in wip.issues[] (resolved, user_resolved,
  #     user_deferred). Label-conflict entries are matched by conflict_id; epsilon-conflict entries
  #     are matched by conflict_id against Synthesize's current-round resolution list. Entries not
  #     matched remain in the cumulative list.
  #   - Carried across Stage transition (NOT reset) — Stage 1 unresolved items may still need user attention at Phase 3.
  #   - Dropped at Phase 4 Save (intermediate artifact). User-deferred items persist via raw.yml.issues[] instead.

elements:
  - id: {element ID}
    type: {element_type}
    name: {name}
    definition: {definition}
    certainty: {level}
    added_in_round: {round first identified}
    added_in_stage: {1 | 2}   # set when element originated — Stage 1 or Stage 2 supplemental discovery
    certainty_upgraded_at_round: {N}   # optional; populated only on upgrade to `observed` via Explorer re-emission
    upgrade_source: explorer_reconfirmation   # optional; records that `observed` came from later traversal, not original discovery
    labeled_by: [{agents that assigned labels}]
    source_deltas: [{source delta ID list}]
    source:
      locations: [{source location list}]
      scope: {exploration scope}
    details: {type-specific details}

# relations, constraints, issues also follow the same accumulation structure (with certainty)
```

**Anonymized wip (version shared with lenses)**:
- Version of wip.yml with the `labeled_by` field removed
- Lenses know "which elements have already been identified" but not "who made the judgment"
- This is a **reconstruct mode exception** to the "independence guarantee" principle in process.md: to ensure coverage completeness, the confirmed element list from previous rounds is shared, but the judgment author is hidden to mitigate anchoring bias

---

### Delta Format

Format of deltas reported by the Explorer:

```yaml
delta:
  id: d-{round}-{sequence}
  round: {round number}
  status: success | partial | failed
  trigger: "{summary of the epsilon that triggered this exploration. 'initial exploration' for Round 0}"

  # Included only in Round 0
  module_inventory: [{full list of exploration target modules}]

  source:
    type: {code | spreadsheet | database | document}
    scope: "{explored scope (directory, sheet, table, etc.)}"
    locations: [{explored source location list}]

  facts:
    - subject: "{domain entity or relation}"
      statement: "{domain fact — natural language summary}"
      certainty: observed | pending
      observation_aspect: [structure | behavior | presentation]
      # A single value from the enum (not a list). Stored at fact top level, not inside structured_data.
      # structure: what the source IS — names, fields, relations, schemas
      # behavior: what the source DOES — state transitions, method signatures, data flows
      # presentation: how the source is displayed to humans — formatting, layout, cell styling (spreadsheets), UI ordering (code)
      # Explorer populates this field based on which aspect of the source was traversed to discover the fact.
      # Consumed by Phase 2 Step 1 (aspect_bias per module/entity + global aspect_totals) and Phase 3 Observation Aspect Distribution table.
      # If a future lens introduces a new aspect value, Runtime passes it through unchanged and Phase 3 renders it as an additional row.
      fact_type: {one of .onto/authority/core-lexicon.yaml#fact_type.allowed_values — Stage 1: entity, enum, property, relation, code_mapping; Stage 2: state_transition, command, query, policy_constant, flow}
      # Canonical enum: .onto/authority/core-lexicon.yaml#fact_type (v0.10.0+, R-31 SSOT 정렬).
      # 신규 fact_type 추가 시 lexicon term 의 allowed_values + stage_partition 우선 갱신 후 본 schema 의 structured_data 명세 추가.
      structured_data:  # structured data per fact_type (optional)
        # entity: {name, domain, db_table, properties: [{name, type, nullable, description, enum_ref, constraints}]}
        # enum: {name, values: [{value, code, description}]}
        # property: {entity, name, type, enum_ref, nullable}
        # relation: {from, to, type, cardinality, fk_column}
        # state_transition: {entity, field, from, to, trigger, guard, side_effects}
        # command: {name, actor, target_entities, preconditions, results, state_transitions, side_effects, source_code}
        # query: {name, actor, target_entities, description, source_code}
        # policy_constant: {name, value, unit, description, used_by}
        # flow: {name, steps, external_dependencies}
        # code_mapping: {canonical, legacy_aliases, code_entity, db_table, fk_variants}
      detail:
        - "{description including source location}"
        # Code: "field definition — User.java:42"
        # Spreadsheet: "formula =SUM(B2:B10) — Sheet1:B11"
        # DB: "FK constraint — orders.user_id -> users.id"
    # ... additional facts

  open_questions:  # uncertainties the Explorer could not resolve
    - "{what could not be confirmed}"
```

**status field**:
- `success`: exploration successful, facts included
- `partial`: some source exploration failed, facts from explored portions included
- `failed`: entire exploration in this direction failed, facts empty

Lenses record a delta with status `failed` as "unexplored" for that direction (distinct from delta=0).

**detail field format (by certainty)**:
- `observed`: `"structure/value description — source location"` (source location required)
- `pending`: `"inference rationale description"` or `"exploration scope — where was checked but nothing found"`

---

### Label/Epsilon Format

Format reported by lenses:

```yaml
agent: {agent-id}
round: {round number}

labels:
  - delta_id: d-{round}-{seq}
    fact_index: {index of the fact, starting from 0}
    type: "{schema's element_type or relation/constraint/issue}"
    target: "{ontology element name}"
    certainty_refinement: "{pending -> rationale-absent/inferred/ambiguous/not-in-source. Omit if observed}"
    abduction_quality:  # only for inferred. Used for Phase 3 user decision prioritization
      explanatory_power: high | medium | low
      coherence: consistent | partial | conflicting
    justification: "{why this type was judged — 1 sentence}"
    details: {additional attributes}
  # ... additional labels

epsilons:
  - direction: "{where and what to check}"
    priority: high | medium | low
    justification: "{why this direction is needed — 1 sentence}"
  # ... empty array [] if none

issues:
  - description: "{discovered problem}"
    severity: critical | warning | info
    issue_type: finding | certainty_reclassification
    justification: "{why this is a problem}"
    # Required when issue_type == certainty_reclassification:
    target_id: "{existing element ID being reclassified}"
    requested_operation: demote | upgrade | nullify | reclassify
    from_certainty: "{current certainty — required for reclassify}"
    to_certainty: "{requested new certainty — required for reclassify}"
  # ... empty array [] if none

learnings:
  communication: "none"
  methodology: "[{type}] {learning content}. 'none' if absent"
  domain: "[{type}] {learning content}. 'none' if absent"
```

**Appropriate specificity for epsilons**:
```yaml
# Too abstract
- direction: "Look more at the payment domain"

# Appropriate level
- direction: "PaymentInfo.status is a String; check all branches in PaymentGateway that compare this status and collect the actual set of values used"

# Too specific
- direction: "Check the 'REFUNDED' string at PaymentGateway.java line 1092"
```

**open_questions handling**: Lenses review the delta's `open_questions` and convert them to epsilons if important from their dimension. Ignore if not important.

---

### Epsilon Integration Pipeline Formats

The epsilon integration pipeline has three stages, each with its own output format.

#### Stage 1: Runtime Coordinator Output

Deterministic preprocessing. Produced at step 3e-3h of the Round N loop.

```yaml
round: {next round number}
convergence_status: # see Phase 1.2 convergence_status definition

consensus_epsilons:
  - direction: "{direction agreed by multiple lenses}"
    requested_by: [{requesting lens list}]
    priority: high | medium | low

rule_resolved_epsilons:
  - direction: "{direction selected by abduction_quality rules}"
    selected_over: "{defeated direction summary}"
    rule_applied: "{which rule resolved it — explanatory_power / coherence}"
    priority: high | medium | low

unresolved_conflicts:
  - conflict_id: {id}
    conflict_kind: epsilon | label
    subject: "{short phrase identifying what the conflict is about — e.g., 'PaymentInfo.status exploration direction' or 'Order entity classification'}"
    unresolved_since: "{stage}.{round}"   # first round this conflict appeared
    position_a:
      content: "{direction (for epsilon conflicts) or label (for label conflicts)}"
      priority: high | medium | low
      justification: "{rationale with perspective-revealing language neutralized when possible}"
      # lens ID removed (anonymized). For label conflicts, labeled_by is also stripped.
    position_b:
      content: "{direction or label}"
      priority: high | medium | low
      justification: "{rationale}"
      # lens ID removed (anonymized)

forced_directions:
  - direction: "Explore {unexplored module}"
    reason: "coverage unsatisfied"
    priority: high
```

#### Stage 2: Adjudicator Output Format

Produced by Axiology Adjudicator (fresh context). Only invoked when `unresolved_conflicts` is non-empty.

```yaml
adjudication_results:
  - conflict_id: {id}
    resolution: selected_a | selected_b | no_resolution
    rationale: "{1-sentence purpose-based rationale}"
    # no_resolution handling: see Phase 2 Step 3
```

#### Stage 3: Synthesize Output Format

Produced by Synthesize. Composes all resolved material into integrated directives for the Explorer.

```yaml
integrated_directions:
  - direction: "{integrated exploration direction}"
    source: consensus | rule_resolved | adjudicator_resolved | forced
    priority: high | medium | low
  # ... sorted by priority

unresolved_for_user:
  - conflict_id: {id}
    conflict_kind: epsilon | label
    subject: "{from Runtime output}"
    unresolved_since: "{stage}.{round}"
    # max_priority and min_priority are NOT stored — derived at display time from position priorities
    position_a:
      content: "{from Runtime output}"
      priority: "{from Runtime output}"
      justification: "{from Runtime output}"
    position_b:
      content: "{from Runtime output}"
      priority: "{from Runtime output}"
      justification: "{from Runtime output}"
    # Synthesize emits this list. Runtime Coordinator (sole writer of wip.yml) appends the items to
    # meta.cumulative_unresolved_conflicts at the end of the round (between step 5 Synthesize completion
    # and step 6 Explorer dispatch), consistent with Runtime's sole-writer authority over wip.yml.
    # Phase 2 Step 4 reads from meta.cumulative_unresolved_conflicts to collate with Phase 2 Step 3 results.
    # Phase 3 display ordering (three-level sort):
    #   1. max(position_a.priority, position_b.priority) desc — symmetric-high > asymmetric-high > medium > low
    #   2. min(position_a.priority, position_b.priority) desc — distinguishes high/high (both lenses agree)
    #      from high/low (lop-sided) within the same max tier
    #   3. unresolved_since asc — older conflicts first among same-priority pairs
    # Invariant: meta.cumulative_unresolved_conflicts is NEVER included in lens input context across rounds
    # (preserves lens independence — see Role Boundary Principles).
```

---

### Phase 2: Finalization

When the exploration loop terminates, finalization is performed in 4 steps. No single agent owns Phase 2 — each step is handled by the appropriate role.

#### Step 1: Runtime Coordinator (deterministic)

```
1. Element reference integrity verification:
   - All relation from/to IDs exist in elements
   - No duplicate element IDs
   - All constraint applies_to IDs exist
   - All source_deltas references exist in saved delta files

2. External system deduplication and field validation:
   - Remove duplicate entries by name
   - Validate external_systems direction field values (upstream | downstream | bidirectional only)
   - Validate relations direction field values (forward | backward | bidirectional only)

3. Exploration bias calculation (runs per Stage with Stage-independent thresholds):
   - **Stage 1 bias** (denominator = `meta.stage1_module_inventory`):
     - Compute: stage1_module_inventory − modules with ≥1 Stage-1 fact → Stage 1 underexplored set
     - Per-module fact count distribution (Stage 1 facts only)
     - Stage 1 threshold: `max(config.reconstruct.underexplored_threshold.min_floor, config.reconstruct.underexplored_threshold.ratio × median(Stage 1 per-module counts))`. Defaults: `min_floor: 2`, `ratio: 0.5` → `max(2, 0.5 × Stage1_median)`.
     - Each entry tagged `origin: stage1_module`.
   - **Stage 2 bias** (denominator = `meta.module_inventory` (Entity IDs)):
     - Compute: entity_inventory − entities with ≥1 state_transition/command/query fact referencing them → Stage 2 underexplored set
     - Per-entity fact count distribution (Stage 2 behavior facts only)
     - Stage 2 threshold: computed independently using Stage 2 per-entity median — **not** shared with Stage 1 threshold.
     - Each entry tagged `origin: stage2_entity`.
   - **Combined output** for Step 2b:
     - `underexplored_modules`: **union** of Stage 1 + Stage 2 underexplored sets. Each item carries its origin tag and fact count. The Coverage lens prompt distinguishes stage1_module items (source coverage gap) from stage2_entity items (behavior coverage gap).
     - `aspect_bias`: per-module/per-entity observation_aspect distribution (keyed by origin+id).
   - Output: `aspect_totals` (global dictionary `{aspect_value: count}`): for each fact across all wip.yml elements, count occurrences by `fact.observation_aspect`. Phase 3 renders one row per aspect value present in this dictionary (dynamically — forward-compatible for new aspect values).
```

#### Step 2: Focused lens queries + Hook γ (2a / 2b / 2c run in parallel, after Step 1 completes)

<!-- canonical-mirror-of: step-3-rationale-reviewer §6.2 -->

These are focused lens queries per the "Focused Lens Query Protocol" above (2a / 2b) plus Hook γ Rationale Reviewer dispatch (2c, v1 신규). The team lead dispatches each query as a fresh-context agent.

**2a. Semantics lens — ubiquitous language cleanup**:

```
Review the ubiquitous_language section of wip.yml.
- Identify synonyms (different names for the same concept) and propose unification
- Identify homonyms (same name for different concepts) and propose distinction
- Output: list of proposed changes with rationale
```

**2b. Coverage lens — underexplored module interpretation**:

```
The following modules were identified as underexplored (per Step 1's threshold):
{underexplored_modules from Step 1}

For each module, assess:
- Is this a coverage gap that affects ontology completeness?
- Or was this module intentionally low-priority given the system's domain?
- Output: list of modules classified as "gap" or "acceptable_skip" with rationale
```

**2c. Rationale Reviewer (Hook γ — v1 신규)**:

Reviews `intent_inference` populated by Hook α in Stage 1 → 2 transition (§1.3.2 step 5d). Detects under-claim / over-claim / scope misclassification / pack-incompleteness in Proposer rationales. Role spec: `.onto/roles/rationale-reviewer.md` (Track B W-A-87 promotion). Full protocol: Step 3 §2~§7.

##### Step 2c State Machine (`meta.step2c_review_state`)

| State | Meaning | Resumption |
|---|---|---|
| `pre_gamma` | Phase 2 Step 1 finalize 후, Step 2 dispatch 진입 전 | Step 2 재진입 |
| `gamma_skipped` | `inference_mode == none` OR `stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0}` — Reviewer skip (intent_inference 없는 상태 review 무의미) | Step 3 직행 |
| `gamma_in_progress` | Reviewer spawn 직전 ~ directive apply 직전 | Step 2 재진입 |
| `gamma_completed` | Step 4b 에서 directive atomic apply 완료 | Phase 3 진입 |
| `gamma_failed_retry_pending` | Full failure, Principal retry 응답 대기 | Step 2 재진입 (응답 후) |
| `gamma_failed_continued_degraded` | Retry 실패 + Principal `[d] Continue with degraded` 선택 — `proposed` element 전수 Phase 3 escalate, raw.yml `rationale_review_degraded: true` 기록 | Phase 3 진입 |
| `gamma_failed_aborted` | Retry 실패 + Principal `[a] Abort` — Phase 2 차단, wip.yml Stage 2 완료 상태 보존, `meta.stage = 2` 유지. 재시작 시 Phase 2 Step 2 부터 re-enter 가능 | 세션 종료 (Principal 재실행 결정 필요) |

`meta.step2c_review_retry_count` (one-shot retry persistence, `≤ 1` bound): Step 2 §6.2 `stage_transition_retry_count` 와 동형. `gamma_completed` / `gamma_skipped` 도달 시 0 reset, `gamma_failed_*` 시 reset 하지 않음 (다음 재진입에 이전 retry 소비 이력 유지).

##### Step 2c flow (parallel with 2a/2b, apply at Step 4b)

1. **2c-precondition** check:
   - `inference_mode == "none"` → `meta.step2c_review_state = "gamma_skipped"` (2a/2b 만 진행, 2c 미실행)
   - `stage_transition_state ∈ {alpha_skipped, alpha_failed_continued_v0}` → `meta.step2c_review_state = "gamma_skipped"` (intent_inference 없음)
   - `inference_mode ∈ {full, degraded}` AND `stage_transition_state == "alpha_completed"` → 2c dispatch 진행

2. **2c-spawn**: `meta.step2c_review_state = "gamma_in_progress"` + fsync. Team lead spawns Rationale Reviewer (fresh agent, mirroring Axiology Adjudicator + Proposer pattern):
   - Input package per Step 3 §2.1 (wip.yml 전수 + Step 2 결과 + manifest + provenance pair)
   - Prompt = Step 3 §4 template + input package
   - `wip_snapshot_hash` 계산 + 주입 (§3.7.1)

3. **2c-directive 수신**:
   - Schema validation per Step 3 §3.8 reject 1~12, §3.8.1 downgrade D1~D3
   - Reject → §7.1 full failure (`meta.step2c_review_state = "gamma_failed_retry_pending"`)
   - Downgrade → warning log + directive 보관 (apply 는 Step 4b 에서)

4. **Step 2 완료 gate** (2a/2b/2c 병렬 수집 대기): 모두 directive 수신 (또는 skip 결정) 시 Step 3 진행. 2c 가 `gamma_failed_retry_pending` 시 Principal response 수신까지 대기. `gamma_failed_continued_degraded` 또는 `gamma_skipped` 시 2c directive empty 로 간주하여 Step 3 진행.

5. **Step 3 (Axiology Adjudicator)** 통상 진행.

6. **Step 4a (Synthesize)** — 2a/2b/2c/3 directives 를 단일 finalization directive 로 통합. `rationale_updates` 필드 신규 — 2c directive 의 updates[] 를 그대로 merge (Synthesize 는 semantic 변형 금지).

7. **Step 4b (Runtime atomic apply)**:
   - `rationale_updates` 의 각 update 를 Step 3 §3.8 validation 재검증 (2c 수신 시점과 Step 4b 시점 사이 wip.yml 변경 감지 — `wip_snapshot_hash` 재검증, Step 3 §3.7.1)
   - Apply per-operation (canonical detail 은 Step 3 §3.2~§3.6):
     - `operation: confirm` → Step 3 §3.2 (existing rationale 명시 유지, `provenance.gate_count` 1 → 2 increment)
     - `operation: revise` → Step 3 §3.3 (rationale 교체, gate_count increment)
     - `operation: mark_domain_scope_miss` → Step 3 §3.4
     - `operation: mark_domain_pack_incomplete` → Step 3 §3.5
     - `operation: populate_stage2_rationale` → Step 3 §3.6 (Stage 2 신규 entity 의 rationale populate, gate_count 1 유지)
   - Directive 에 없는 `element_id`: runtime 은 변경 없음 (`provenance.reviewed_at` null 유지 → "Reviewer 미판정" downstream interpretation)
   - Atomic write (temp + rename)
   - `meta.step2c_review_state = "gamma_completed"`
   - `meta.step2c_review_retry_count = 0` (reset)

##### Step 2c failure handling

Step 3 §7.1 의 full failure 경로:
- Runtime presents Principal with retry / `[d] Continue with degraded` / `[a] Abort` choice
- Retry: `step2c_review_retry_count` increment to 1 (atomic fsync), Reviewer re-spawn
- `[d]` 경로: `meta.step2c_review_state = "gamma_failed_continued_degraded"`, raw.yml `rationale_review_degraded = true` (Step 4 §4.1 mirror seat), `proposed` element 전수가 Phase 3 Principal 판정으로 escalate (Step 4 §2.4)
- `[a]` 경로: `meta.step2c_review_state = "gamma_failed_aborted"`, 세션 종료

#### Step 3: Axiology Adjudicator (fresh context)

Resolves any remaining `resolution: pending` label conflicts from the exploration loop, plus any new conflicts from Step 1-2. Same mechanism as Phase 1 adjudication — anonymized inputs, system purpose criterion.

**Input sources**: (1) wip.yml issues with `resolution: pending` accumulated during Phase 1 rounds, (2) any new conflicts identified by Step 1 or Step 2 queries.

**`no_resolution` handling**: If the Adjudicator returns `no_resolution` for a conflict, the item is carried to Phase 3's "Unresolved Conflicts" section for user decision. This is the final adjudication attempt — there is no further retry.

**Step 3 invocation failure**: If the Adjudicator agent itself fails to respond (not `no_resolution`, but agent-level failure), all pending label conflicts are escalated en masse to Phase 3 as "Unresolved Conflicts" (same format as `no_resolution`). Step 4 proceeds normally — the wip.yml remains in its pre-Step-3 state for these conflicts. This failure is logged but does not halt Phase 2.

#### Step 4: Synthesize emits finalization directives; Runtime applies

Synthesize is an LLM role and does not mutate wip.yml directly — this preserves Runtime's **sole-writer invariant over wip.yml** across all phases (Phase 1 loop + Phase 2 finalization). Step 4 runs in two sub-steps:

**4a. Synthesize (LLM) emits a finalization directive** containing:
- `integrity_fixes`: list of patch operations derived from Step 1 Runtime output (structural fixes Synthesize confirms should be applied)
- `ubiquitous_language_changes`: set of UL unify/distinguish/keep decisions from Step 2a output
- `coverage_gap_annotations`: list of issues to add from Step 2b output (module/entity → gap | acceptable_skip)
- `adjudicator_resolutions`: list of conflict updates from Step 3 output (pending → resolved with resolved_position, or no_resolution → escalate)
- `unresolved_collation`: merged list of Phase 1 `cumulative_unresolved_conflicts` + Step 3 `no_resolution` items (for Phase 3 rendering — not a wip.yml mutation)

**4b. Runtime Coordinator applies** the finalization directive to wip.yml deterministically:
- Executes each operation in the directive in declared order
- Validates each before applying (rejects invalid reclassify pairs, unknown operations, etc. — see patch format rules)
- Produces the final wip.yml ready for Phase 3 rendering and Phase 3.5 user write-back

After 4b, Runtime also prepares the Phase 3 Unresolved Conflicts table using the `unresolved_collation` list (not persisted to wip.yml; displayed directly at Phase 3).

**raw.yml conversion** runs in Phase 4 (not Phase 2 Step 4) — Step 4 leaves the session in finalized-wip.yml state.

---

### Phase 3: User Confirmation

```markdown
## Ontology Build Result Summary

### Structure: {schema name}
### Analysis Target: {$ARGUMENTS or entire project}
### Source Type: {code | spreadsheet | database | document | mixed}
### Exploration Rounds: {N} rounds ({converged | max rounds reached})

---

### Certainty Distribution
| Level | Element Count | Ratio |
|---|---|---|
| observed | N | N% |
| rationale-absent | N | N% |
| inferred | N | N% |
| ambiguous | N | N% |
| not-in-source | N | N% |

### Observation Aspect Distribution
| Aspect | Fact Count | Ratio |
|---|---|---|
| structure | N | N% |
| behavior | N | N% |
| presentation | N | N% |

### Exploration Coverage
| Round | Exploration Scope | New Facts | New Elements |
|---|---|---|---|
| 0 | Initial exploration (structure survey) | N | N |
| 1 | {epsilon summary} | N | N |

### Ontology Elements — N items
| # | Type | Name | Certainty | Stage | Round | Rationale | Confidence | Summary |
|---|---|---|---|---|---|---|---|---|

<!-- canonical-mirror-of: step-4-integration §2.2 -->

- `Stage` = `added_in_stage` (1 for Stage-1 origination, 2 for Stage-2 supplemental discovery). Lets users see which elements were discovered during behavior exploration vs structural survey.
- **`Rationale` column** (v1 신규, Step 4 §2.2 canonical) — display rule per `intent_inference.rationale_state`:
  - `proposed` — `inferred_meaning` summary (1 sentence) + "(pending review)" suffix, gray
  - `reviewed` — `inferred_meaning` summary (1 sentence), normal
  - `principal_*` (terminal: `principal_accepted` / `principal_modified` / `principal_rejected` / `principal_accepted_gap` / `principal_deferred` / `principal_confirmed_scope_miss`) — terminal state label + Principal decision summary, normal (terminal-distinct icon per Step 4 §2.2.1)
  - `gap` — "(추론 실패)", red
  - `domain_pack_incomplete` — "(pack 에 개념 부재)", yellow
  - `domain_scope_miss` — "(도메인 범위 밖)" + override 가능 hint, gray (pre-Phase-3.5)
  - `empty` — "—" (rationale 부재 canonical marker, Stage 2 Explorer 추가 entity)
  - `carry_forward` — "(이전 세션 미판정)" + re-judgment hint, gray
- **Single-gate badge** (Step 4 §2.3) — `provenance.gate_count == 1` element 에 "Single-gate (audit only)" yellow badge suffix (Hook γ 미개입 또는 `populate_stage2_rationale`-origin 의 quality-asymmetry audit signal).

### User Decision Required Items (individual + grouped)

<!-- canonical-mirror-of: step-4-integration §2.5 §2.6 §2.8 -->

**Hook δ throttling + rendering** (Step 4 §2.5 canonical) — `intent_inference.rationale_state` terminal-pending element 에 priority score + 4-bucket exhaustive partition:
- `individual` (priority top `max_individual_items` + grouping_threshold 미달 residual, hard cap 보존)
- `group_sample` / `group_truncated` (same group within `max_group_rows` cap)
- `throttled_out` (hard cap 초과 — `rationale-queue.yaml` 전수 audit)

config defaults: `max_individual_items: 20` / `grouping_threshold: 5` / `group_summary_sample_count: 3` / `max_individual_items_hard_cap: 100` / `max_group_rows: 50`. Full algorithm + grouping key canonical table (`pack_missing_area` / `rationale_state` / `rationale_state_with_confidence` / `rationale_state_single_gate`) + priority formula + `rationale-queue.yaml` artifact schema: Step 4 §2.5~§2.8.

**Row-level render decision** triple-read (Step 4 §2.8 canonical): `(reviewed_at, rationale_review_degraded, rationale_state)` minimum-sufficient disambiguation set.

| # | Element | Certainty | Decision Question | Inference Quality (inferred only) |
|---|---|---|---|---|

- `rationale-absent` items: "Implementation confirmed but please provide the rationale"
- `inferred` items: sorted by inference quality (explanatory_power, coherence) — lower quality inferences are priority confirmation targets
- `ambiguous` items: "Multiple interpretations are possible. Please choose" + each interpretation option with rationale
- `not-in-source` items: "Cannot be confirmed from this source. Please provide the information"

**v1 rationale states**: rendered per Step 4 §3.1 action-first canonical matrix — `accept` / `reject` / `modify` / `defer` / `provide_rationale` / `mark_acceptable_gap` / `override` action set per source state (UI disabled rules per Step 4 §3.3 `governed subject` derived view). Batch action vocabulary single enum (Step 4 §3.4): `{accept, reject, defer, mark_acceptable_gap}` (UI alias `_all` suffix not persisted).

### Unresolved Conflicts — N items (if any)
| # | Priority | Kind | Subject | Position A (priority) | Position B (priority) | Unresolved Since |
|---|---|---|---|---|---|---|

- Items ordered by: (1) max(position_a.priority, position_b.priority) descending, (2) min(position_a.priority, position_b.priority) descending (distinguishes symmetric-high from asymmetric-high within same max tier), (3) `unresolved_since` ascending (oldest first).
- `Kind` = `epsilon` (exploration direction conflict) or `label` (ontology type classification conflict)
- These are lens perspective conflicts that neither runtime rules nor the Axiology Adjudicator could resolve.
- Please choose one position, or provide your own resolution. If you provide a custom resolution, it is recorded as an issue with `resolution: user_resolved` and applied to the corresponding element.

### Discovered Issues — N items
| # | Severity | Description | Identified Round |
|---|---|---|---|

### Unexplored Areas (if any)
- {unexplored modules or unconverged epsilons}

---

- Please let me know if there are any adjustments.
- If none, reply "confirmed."
```

**Runtime action after user reply**: On a valid user submission, Runtime Coordinator writes `meta.phase3_user_responses` to wip.yml atomically (single fsync), populating `received_at`, `global_reply`, and any `conflict_decisions` / `certainty_decisions` / `other_adjustments` the user provided. This write is the sole trigger for Phase 3.5 and occurs before any Phase 3.5 step. Invalid submissions (see the `global_reply` vs decisions consistency rule in the wip.yml `phase3_user_responses` schema comment) do NOT write the field; Runtime re-prompts Phase 3 instead, and the absence of `phase3_user_responses` preserves the resumption-trigger semantics.

**User no-response handling**: Phase 3 is interactive and awaits user input indefinitely. Runtime does NOT auto-timeout. If the session is abandoned:
- `phase3_user_responses` is never written to wip.yml.
- Phase 3.5 never executes (no trigger event).
- Phase 4 never triggers (Phase 3.5 is the only path into it).
- wip.yml remains in its post-Phase-2 state, preserved indefinitely in `{project}/.onto/builds/{session ID}/`.
- **Resumption**: the user re-runs `/onto:reconstruct` with the same session directory. Runtime detects existing `wip.yml` without `phase3_user_responses` and re-enters Phase 3 (re-renders the same summary from the existing wip.yml). No reconstruct work is lost; only the Phase 3 prompt is re-issued.
- **Resumption integrity check**: before re-entering any phase, Runtime reads and validates four artifacts — `schema.yml` (structural spec), `wip.yml` (reconstruct state, YAML-parse + meta presence), `deltas/` directory (non-empty, matches `meta.deltas` references), `session-log.yml` (YAML-parse if present). Any failure halts with `session_state_corrupt` (see registered codes table) and preserves the session directory untouched so the user can repair or discard.
- **Alternative abort**: user can manually delete the session directory to abort the reconstruct.

No implicit timeout or silent-promotion occurs — user authority over the Phase 3 decision is absolute.

---

### Phase 3.5: User Decision Write-back (Runtime Coordinator)

<!-- canonical-mirror-of: step-4-integration §3 -->

After the user responds to Phase 3, Runtime Coordinator applies the user decisions to wip.yml before Phase 4 Save. **Runtime sole-writer** — LLM 불개입 (Step 4 §3.8 canonical).

**v1 step sequencing** (Step 4 §3.5 canonical, atomic single fsync at step 5):

1. **Unresolved conflicts table** — for each row:
   - If user selects **Position A** or **Position B**: update the corresponding `conflict` issue to `resolution: resolved`, record which position was chosen in `resolved_position: position_a | position_b`, and apply the chosen label to the target element via an `update` patch (no element mutation for epsilon conflicts — they do not correspond to elements).
   - If user provides a **custom free-form resolution**: update the `conflict` issue to `resolution: user_resolved` with `resolution_text: {user's text}`. The target element itself is NOT mutated — the resolution_text is advisory context attached to the conflict issue only. Rationale: free-form text cannot be deterministically applied to a structured element field without re-invoking an LLM, which would reintroduce semantic judgment outside the reconstruct loop.
   - If user **defers** (explicit `defer` response or if the conflict is unaddressed when the user replies `confirmed` globally): update the `conflict` issue to `resolution: user_deferred` and leave the target element in its pre-confirmation state.
   - If user's response is **ambiguous or does not match any of the above patterns** (e.g., "kind of A and B combined", "A for subject X but B for Y", free-form note not clearly identifying a position): Runtime treats it as `user_resolved` with the raw reply preserved in `resolution_text`. The target element is NOT mutated. This default preserves the user's intent without silent misclassification as a specific position. Runtime may optionally log the ambiguity for post-reconstruct review.

**1.5 Rationale decisions validation** (v1 신규, Step 4 §3.5.1 canonical):
   - Schema validation per Step 4 §3.6 schema (rationale_decisions[] + batch_actions[])
   - Target existence + source state currency vs **render-time snapshot** (`.onto/builds/{session}/phase3-snapshot.yml`, Step 4 §3.5.1 rule 3)
   - Action × source state compat (Step 4 §3.3 derived from §3.1 matrix)
   - Batch exact-match (4 grouping kinds — `pack_missing_area` / `rationale_state` / `rationale_state_with_confidence` / `rationale_state_single_gate`)
   - `principal_provided_rationale` 필수 필드 (action ∈ {modify, provide_rationale, override})
   - `"see below"` pending coverage (`global_reply == "see below"` 시 미-address pending 1+ → `phase_3_5_input_incomplete`. `domain_scope_miss` exception — Step 4 §3.2)
   - Fail → all-or-nothing reject, `phase_3_5_input_invalid` halt + Phase 3 re-prompt (v0 invariant)

**2. Rationale decisions apply** (v1 신규, Step 4 §3.5 + §3.1 action-first canonical matrix):
   - `rationale_decisions[]` (individual) → terminal state per §3.1 action × source mapping (canonical: `accept` / `reject` / `modify` / `defer` / `provide_rationale` / `mark_acceptable_gap` / `override`; terminal: `principal_accepted` / `principal_rejected` / `principal_modified` / `principal_accepted_gap` / `principal_deferred` / `principal_confirmed_scope_miss`)
   - `batch_actions[]` (group, single enum: `{accept, reject, defer, mark_acceptable_gap}`) → 동일 write path
   - `principal_provided_rationale` populate (modify / provide_rationale / override 만)
   - `provenance.principal_judged_at` populate (Step 4 §4.3 element-level single seat)
   - 두 list 동일 element_id 시 individual 우선 (Step 4 §3.6 rule 3)
   - `domain_scope_miss` accept terminal split: `principal_confirmed_scope_miss` (v1 신규, Step 4 §3.2)

3. **User Decision Required Items (certainty-based)** — for each row:
   - If user confirms the proposed action: update the element's `certainty` and note the rationale in `user_confirmed_rationale`.
   - If user rejects or defers: update the element with `user_decision: deferred` and leave certainty unchanged.

4. **Other user adjustments** (type changes, name corrections, etc. from Phase 3 global response): recorded as direct patches to wip.yml elements with `source: user_decision_phase3`.

5. **Atomicity and crash safety** (Step 4 §3.5 step 5 확장):
   - Runtime applies all steps **1 + 1.5 + 2 + 3 + 4 + 8** as a single atomic wip.yml write (temp file + rename, or equivalent). Partial application is not exposed: either the full user-decision write-back is reflected in wip.yml or none of it is.
   - If Runtime crashes mid-Phase-3.5, re-execution reads the pre-3.5 wip.yml and re-applies all decisions from the preserved Phase 3 response log (persisted as `meta.phase3_user_responses` in wip.yml — written once at Phase 3 response receipt, before step 1). Phase 3.5 is **idempotent**: re-running with the same `phase3_user_responses` produces identical wip.yml state.

6. **Invariants after Phase 3.5**:
   - No element has `certainty: pending` (all resolved to a concrete level, or promoted to `not-in-source` per step 7 below).
   - All conflict issues have `resolution ∈ {resolved, user_resolved, user_deferred}` (no `pending`).
   - **All `intent_inference.rationale_state` are terminal** (Step 4 §3.8.1 — 8 terminal: `principal_*` 6 + `carry_forward` + `domain_scope_miss` 미판정 유지). Intra-Phase-3.5 state (`reviewed` / `proposed` / `gap` / `domain_pack_incomplete` / `empty`) 잔존 = Runtime defect.

7. **Pending-certainty promotion (final pass)**:
   - For any element still at `certainty: pending` after steps 1-4 (e.g., deferred certainty decisions, unaddressed pending from earlier rounds): promote to `not-in-source`, preserve the prior level in `pre_defer_certainty` for provenance, and mark with `user_decision: promoted_on_defer`.
   - This ensures invariant 6 holds unconditionally for `certainty`. `rationale_state` invariant (8 terminal) is enforced by step 8 sweep.

**8. carry_forward sweep** (v1 신규, Step 4 §3.5.2 canonical):
   - For each element with intra-Phase-3.5 `rationale_state ∈ {reviewed, proposed, gap, domain_pack_incomplete, empty}` AND `element_id` NOT in (rationale_decisions ∪ batch_actions) AND `global_reply == "confirmed"`:
     - Capture `original_state = rationale_state` first (overwrite-before-capture bug 방지)
     - Write order: `provenance.carry_forward_from = original_state` → `provenance.principal_judged_at = null` → `rationale_state = "carry_forward"`
   - 제외 source states: `domain_scope_miss` (§3.2 special case 미판정 유지) / `carry_forward` (이전 reconstruct 의 이중 carry 금지) / `principal_*` (이미 per-item action 대상)
   - `provenance.carry_forward_from_schema_version: "rationale_state/1.0"` (Step 4 §4.3 — 차기 reconstruct 의 Layer B bridge re-judgment migration rule 선택 input)

**`global_reply` enum** (Step 4 §3.6 + r5 canonical): `"confirmed" | "see below"` only (`"other"` v1 enum 제거, free-form 은 `phase_3_5_input_invalid`). `"confirmed"` semantic = "본 세션 Phase 3 마감 + 미판정 element 는 carry_forward 로 차기 reconstruct 에 넘김" (semantic approval 아님 — Step 4 §3.6 documentation).

---

### Phase 4: Save

Saves the Raw Ontology upon user confirmation.

**Save file**: `{project}/.onto/builds/{session ID}/raw.yml`

**The save format is determined by the selected schema**:
- Schema B: follows the sections structure of `golden/schema-b.yml`
- Schema C: follows the sections structure of `golden/schema-c.yml`
- Schema D: follows the sections structure of `golden/schema-d.yml`
- Schema E (custom): follows the structure of user-defined schema.yml

For the specific format of each schema, refer to the corresponding golden example.

**Common meta header** (identical across all schemas):

```yaml
# Raw Ontology — generated via integral exploration
meta:
  schema: ./schema.yml
  source_type: {code | spreadsheet | database | document | mixed}
  domain: {domain}
  source: {analysis target path}
  date: {date}
  rounds: {total round count}
  convergence: converged | max_rounds_reached
  unexplored_directions: [{unexplored areas — when max_rounds_reached}]
  agents: [explorer, {lens list}, synthesize]
```

**Schema C default format** (when Schema C is selected, or as reference for custom schemas):

```yaml
elements:
  - id: {element ID}
    type: {schema's element_type}
    name: {name}
    definition: {definition}
    certainty: {observed | rationale-absent | inferred | ambiguous | not-in-source}
    # `pending` is intra-reconstruct only and must be resolved before raw.yml save.
    # Any element still at `pending` at Phase 4 is either escalated to the user
    # (as an unresolved item) or treated as `not-in-source` if the user defers.
    added_in_round: {round}
    labeled_by: [{agents}]
    source:
      locations: [{source locations}]
      deltas: [{delta IDs}]
    details: {}

relations:
  - id: {relation ID}
    from: {element ID}
    to: {element ID}
    type: {relation type}
    direction: {forward | backward | bidirectional}
    certainty: {level}
    added_in_round: {round}
    labeled_by: [{agents}]
    source:
      locations: [{source locations}]
      deltas: [{delta IDs}]

constraints:
  - id: {constraint ID}
    applies_to: {element/relation ID}
    description: {constraint content}
    certainty: {level}
    added_in_round: {round}
    labeled_by: [{agents}]
    source:
      locations: [{source locations}]
      deltas: [{delta IDs}]

ubiquitous_language:
  - term: {domain term}
    definition: {definition}
    used_in: [{related element IDs}]
    source_delta: {delta ID}

external_systems:
  - name: {external system}
    role: {role}
    integration_point: {integration point}
    direction: upstream | downstream | bidirectional

issues:
  - id: {issue ID}
    severity: critical | warning | info
    description: {description}
    reported_by: [{agent-id}]
    discovered_in_round: {round}
    justification: {reason}
```

**Schema B/D raw.yml format**: follows the structure of the corresponding golden example. Uses each schema's sections directly under the meta header.
- Schema B: structure of `golden/b-action-centric.yaml` (enums, object_types, link_types, actors, action_types, functions, domain_flows)
- Schema D: structure of `golden/d-domain-driven.yaml` (bounded_contexts, aggregates, entities, value_objects, domain_events, commands, queries, sagas, relationships)

**Save rules**:
- If schema.yml does not exist, create it along with the `.onto/builds/` directory
- If raw.yml already exists, confirm with the user before overwriting
- Delete wip.yml and deltas/ directory after saving raw.yml
- Retain context_brief.yml (for reference in future re-runs)

**Unresolved-item handling at save time** (post Phase 3.5):
- Conflict issues with `resolution: resolved | user_resolved | user_deferred` are persisted to `raw.yml.issues[]` with their resolution field intact. `user_deferred` items appear in raw.yml as open issues for future follow-up (not discarded).
- Elements marked with `user_decision: deferred` at Phase 3.5 are saved with their pre-confirmation certainty.
- If any conflict with `resolution: pending` remains at Phase 4 (should not occur per Phase 3.5 invariants, but defensively): halt save and return to Phase 3 for the user to address. This is a bug guard.
  - **Re-entry semantics**: On re-entry, Phase 3 re-renders only the remaining pending items (previously-resolved items are NOT re-shown). Phase 3.5 re-runs idempotently — prior decisions (resolved/user_resolved/user_deferred) are preserved; only the new decisions for previously-pending items are applied.
  - **user_deferred is terminal**: The bug-guard triggers ONLY on `resolution: pending`. `user_deferred` is a valid terminal state and does not trigger re-entry.
  - **Data-consistency escape hatch**: If on re-entry Phase 3's pending item count is 0 (no items to re-show) but the bug-guard still flags `resolution: pending` in wip.yml, halt immediately with error class `phase_3_5_invariant_violation` — without consuming a re-entry slot. Under current Phase 3.5 step 5 invariants, surviving `pending` always indicates a Runtime defect. This escape hatch distinguishes two defect patterns: "pending without any Phase 3 queue item" (halts on first detection as invariant violation) vs "pending persists across re-entries despite Phase 3.5 terminalization" (consumes re-entries until bound, see `phase_reentry_bound_exhausted` below). Both require Runtime-level investigation, not additional user input.
  - **Re-entry bound**: `config.reconstruct.max_phase4_reentries` (default 2) re-entries per Phase 4 attempt. Counter stored as `meta.phase4_runtime_state.reentry_count` (persists across Runtime restarts to prevent crash-restart loop bypass).
  - **Counter increment timing**: Runtime increments `reentry_count` by 1 **immediately upon bug-guard detecting `resolution: pending`, atomically with a wip.yml fsync, BEFORE issuing the Phase 3 re-render prompt**. This ordering ensures that a crash between detection and re-render does not bypass the bound (after restart, the counter already reflects the detection).
  - **Bound semantics**: `max_phase4_reentries: N` means the counter MAY reach N; at `reentry_count == N` with pending still remaining after the N-th re-entry's Phase 3.5 completes, halt with `phase_reentry_bound_exhausted`. Per Phase 3.5 step 5 invariants, surviving `pending` after a full Phase 3.5 pass indicates a Runtime defect; the bound exists to prevent infinite re-entry loops while surfacing the defect for investigation. Default N=2 → up to 2 re-entries allowed; 3rd detection of pending halts. (Prior name `phase_3_5_defect_unresolvable` was retired when the registry consolidated on `phase_reentry_bound_exhausted`.)
- `meta.cumulative_unresolved_conflicts` is dropped at save (see its lifecycle comment in the wip.yml schema). User-deferred items persist via `raw.yml.issues[]` instead.

---

### Session Log & Error Handling Artifact

All runtime warnings, halt events, and error codes defined throughout this process flow to a single session log artifact:

**Path**: `{project}/.onto/builds/{session ID}/session-log.yml`

**Schema**:
```yaml
session_id: {session ID}
entries:
  - timestamp: "{ISO 8601 UTC}"
    level: halt | error | warning | info
    code: "{error/warning code}"   # e.g., config_malformed, phase_3_5_invariant_violation
    phase: phase_0 | phase_0_5_1 | phase_1 | phase_2 | phase_3 | phase_3_5 | phase_4 | phase_5
    context: "{free-form contextual detail, e.g., which lens, which round, which element}"
    user_message: "{rendered user-facing message if level in {halt, error}; absent for warning/info}"
```

**Lifecycle**:
- Created lazily on first write (not required if session has no events).
- Appended to as events occur; never overwritten.
- Preserved after Phase 4 Save (not deleted) — supports post-hoc debugging.
- **Single-writer**: Runtime Coordinator is the sole writer. All other agents (Explorer, lenses, Synthesize, Adjudicator) surface events through Runtime rather than writing directly, preserving chronological ordering and preventing concurrent-write corruption.
- **Atomic append**: each entry is serialized as a complete YAML record and written with an fsync'd append (append-then-flush). A crash mid-append MUST NOT leave a partial record that breaks the next session's log replay.

**Halt event rendering**: When Runtime halts with an error code, the user-facing message follows a per-code template. Each template renders code + phase tag, cause line(s), preserved-state paths (if applicable), and next-step guidance. Curly-braced tokens below are slot fills resolved at halt time.

`config_malformed` (phase_0):
```
[HALT: config_malformed at phase_0]
Config file /path/to/.onto/config.yml failed to parse.
YAML error: {parser_message}
Fix the config file and re-run. No session state was written (halt fires before Phase 1).
```

`phase_3_5_invariant_violation` (phase_4):
```
[HALT: phase_3_5_invariant_violation at phase_4]
Runtime bug: Phase 3.5 reported `resolution: pending` with no Phase 3 pending items to re-render.
Preserved: wip.yml at {wip_path}, session-log.yml at {log_path}.
Report this bug with the session directory attached. Do not re-run /onto:reconstruct on this session — state is inconsistent.
```

`phase_reentry_bound_exhausted` (phase_4):
```
[HALT: phase_reentry_bound_exhausted at phase_4]
Phase 4 bug-guard detected `resolution: pending` on {reentry_count}/{max_phase4_reentries} re-entries; the re-entry bound is exhausted with pending still remaining.
Preserved: wip.yml at {wip_path} (pre-Save state; raw.yml is NOT written by this halt), session-log.yml at {log_path}.
Per Phase 3.5 step 5 invariants, surviving `pending` indicates a Runtime defect (Phase 3.5 did not terminalize as expected). Report the session directory as a bug and start a new /onto:reconstruct session; do not resume this one.
```

`explorer_failure` (phase_1):
```
[HALT: explorer_failure at phase_1]
Explorer failed mid-exploration (stage {stage}, round {round}): {explorer_error}
Preserved: session directory at {session_dir} (partial wip.yml retained for debugging).
Start a new /onto:reconstruct session on the same target; the partial session is not resumable.
```

`runtime_coordinator_failure` (phase_1):
```
[HALT: runtime_coordinator_failure at phase_1]
Runtime Coordinator deterministic failure — indicates a bug in Runtime implementation: {coordinator_error}
Preserved: session directory at {session_dir}.
Report this bug with the session directory; investigate Runtime implementation before re-running.
```

`session_state_corrupt` (phase_0):
```
[HALT: session_state_corrupt at phase_0]
Session state at {session_dir} failed integrity check on resumption.
Cause: {wip_malformed | deltas_missing | session_log_corrupt | schema_missing}
Preserved: session directory (not modified by this halt).
Either delete the session directory and start a new reconstruct, or repair the affected file manually and re-run.
```

**Registered error/warning codes** (this document's canonical enumeration; extensible via additions to this list):

| Code | Level | Phase | Trigger |
|---|---|---|---|
| `config_malformed` | halt | phase_0 | YAML parser throws on config.yml |
| `config_type_invalid` | warning | phase_0 | Config key has wrong type; default substituted |
| `config_out_of_range` | warning | phase_0 | Numeric config key outside valid range; default substituted |
| `config_unknown_key_ignored` | warning | phase_0 | Unrecognized key in config.yml (any nesting level), excluding reserved user-extension namespaces (`x-*` keys at any level, or nested under top-level `custom:`) which are ignored silently without warning |
| `phase_3_5_invariant_violation` | halt | phase_4 | Bug-guard detects `resolution: pending` with no Phase 3 pending items to re-render (Runtime bug) |
| `phase_reentry_bound_exhausted` | halt | phase_4 | Re-entry count reached `max_phase4_reentries` with `resolution: pending` still remaining (Runtime defect — Phase 3.5 failed to terminalize across N re-entries) |
| `explorer_failure` | halt | phase_1 | Explorer fails (irreplaceable; see Error handling section) |
| `runtime_coordinator_failure` | halt | phase_1 | Runtime Coordinator deterministic failure (indicates bug) |
| `session_state_corrupt` | halt | phase_0 | Resumption integrity check detects any of: malformed `wip.yml`, missing `deltas/`, corrupt `session-log.yml`, or missing `schema.yml` — any of which prevents deterministic replay |
| `lens_partial_failure` | warning | phase_1 | One or more lenses failed; graceful degradation applied |
| `adjudicator_failure` | warning | phase_1 | Axiology Adjudicator agent failed during Phase 1 lens-loop; fallback paths engaged |
| `adjudicator_failure` | warning | phase_2 | Axiology Adjudicator agent failed during Phase 2 cross-Stage collation; fallback paths engaged |
| `synthesize_failure` | warning | phase_1 | Synthesize agent failed; raw epsilons delivered to Explorer |
| `degradation_threshold_warning` | warning | phase_1 | 2 consecutive Adjudicator/Synthesize failures reached; user warned |
| `phase3_response_inconsistent` | warning | phase_3 | User submitted `adjustments_provided` with all three fields empty; re-prompt issued (non-halting) |

Adding a new error code requires adding a row to this table with level/phase/trigger specification.

---

### Phase 5: Learning Storage

Stores learnings from all lenses. Follows the "Learning Storage Rules" in `learning-rules.md`.
The Explorer does not store learnings (since it does not perform interpretation).

Completion report:

```markdown
## Ontology Build Complete

| Item | Value |
|---|---|
| Structure | {schema name} |
| Source type | {source_type} |
| Exploration rounds | {N} rounds |
| Convergence status | {converged / max_rounds_reached} |
| Elements | N items (observed N / rationale-absent N / inferred N / ambiguous N / not-in-source N) |
| Relations | N items |
| Constraints | N items |
| Terms | N items |
| External systems | N items |
| Issues | N items |

Save path:
- Schema: `.onto/builds/{session ID}/schema.yml`
- Raw Ontology: `.onto/builds/{session ID}/raw.yml`

### Next Steps
- `/onto:transform` — transform into desired format
- `/onto:review .onto/builds/{session ID}/raw.yml` — verify the built ontology via panel
```

---

## Source Collection Rules

- If $ARGUMENTS is a directory: set that directory as the primary exploration target.
- If $ARGUMENTS is a file (.xlsx, .csv, etc.): set that file as the exploration target.
- If $ARGUMENTS is a GitHub URL: auto-clone and set as the exploration target.
- If $ARGUMENTS is absent: set the project root as the exploration target.
- Exclude binaries, node_modules, .git, and build artifacts.
- Include non-code text files (migrations, Proto, ADR) in exploration targets.
- The Explorer reports module_inventory in Round 0. If 50 or more, narrow the initial exploration scope based on Phase 0.5's context_brief, while maintaining the full list in module_inventory.

---

## Domain Document Integrity Rules

본 절은 reconstruct process 가 domain document 를 input 으로 소비하거나, domain document 확장 작업 (생성, Stage 3 coverage expansion, Stage 4 protocol extension 등) 을 수행할 때 적용되는 canonical process rule seat 이다. 구체 domain (software-engineering, business, ui-design 등) 적용은 이 규칙의 instance 이며, 규칙 자체는 domain 중립이다.

### P-1. Cross-Reference Integrity Check (교차 참조 무결성 점검 단계)

도메인 문서 확장 (생성 또는 Stage 3 coverage expansion) 직후에 다음을 수행한다.

1. 각 domain document 의 `Related Documents` 섹션이 참조하는 대상 파일이 실제 존재하는지 확인한다
2. 각 cross-reference (§번호, 섹션명, anchor) 가 대상 파일 내에서 실제 존재하는 섹션/anchor 를 가리키는지 확인한다
3. 팬텀 참조 (존재하지 않는 섹션 참조) 는 HIGH severity 로 기록하고 확장 완료 처리를 보류한다

적용 근거: domain 확장 직후 panel review 의 HIGH finding 중 다수가 교차 참조 무결성 갭에서 기인한다 (BL-085 의 SE domain Stage 3 리뷰 evidence).

본 규칙은 domain-중립 canonical rule 이다. 구체 instance: BL-103 (Business 도메인 wave 3 교차 참조 + 글로벌 동기화). DL-010 `rule_to_instance` relation 이 BL-085(본 규칙) ↔ BL-103(instance) 의 연결을 유지한다.

초기 생성 단계의 부분 검증은 `.onto/processes/create-domain.md §2 Reference Graph Validation` 이 소유한다. 본 규칙은 확장·후속 변경의 canonical seat 이다.

### P-2. Structural Inspection Checklist Self-Referential Verification (자기 참조 검증)

domain document 확장 직후 또는 domain document 변경 시, review 단계의 Structural Inspection Checklist (`.onto/processes/review/lens-prompt-contract.md §7`) 가 다음 3 점검 축을 포함함을 본 계약이 규정한다.

1. **분류 축 선언** (classification axis declaration) — 모든 domain document 가 분류 축을 명시하는가. 기존 SIC 항목 `axis explicitness` 가 이 점검을 수행한다
2. **선언-실체 대응** (declaration-substance correspondence) — `domain_scope.md` 의 모든 sub-area 가 다른 domain document 에 실체 (rule, CQ, concept, extension case 등) 를 가지는가. 기존 SIC 항목 `ghost sub-area check` 가 이 점검을 수행한다
3. **참조 무결성** (referential integrity) — cross-reference 가 실제 존재하는 섹션을 가리키는가. 기존 SIC 항목 `domain cross-reference validity` 가 이 점검을 수행한다

본 규칙은 점검 **축** 의 canonical seat 이며, checklist 의 owner seat 는 `.onto/processes/review/lens-prompt-contract.md §7` 이다. 동일 점검 축이 다른 문서에 normative 로 존재하면 authority violation 이다.

실행 시점: domain document 변경 시 (매 reconstruct 세션 이 아님).

P-2 와 P-1 의 역할 분리: P-1 은 reconstruct/extend 직후의 process gate (생산 시점), P-2 는 review-time 의 lens 공통 점검 (소비 시점). 두 gate 가 동일 cross-ref 점검을 중복 수행하지 않도록 실행 시점이 분리된다.

근거: BL-086, philosopher_synthesis CC-3 (4/4 합의).

### P-3. Inter-Stage File Overlap Pre-check (Stage 1↔Stage 2 영향 파일 겹침 사전 확인)

domain document refactoring 을 두 편집 축 (간결성 cleanup — 제거/병합, 그리고 참조 무결성 수정 — 리네이밍) 으로 분리 수행하는 경우, 개시 전에 다음을 확인한다.

1. 각 편집 축의 대상 파일 집합을 산출한다
2. 두 집합의 교집합에 속하는 파일이 있는지 확인한다
3. 교집합이 있으면 동일 파일 내 편집 위치 (섹션·줄 범위) 가 중복되는지 확인한다
   - 중복 있음 → 두 축의 순서 (간결성 우선 또는 참조 우선) 를 disagreement 로 기록하고 사전 판정한다. 판정 근거는 각 축의 안전성·효율성 기준이다
   - 중복 없음 → 두 축의 atomic 병렬 실행이 가능하다
4. 판정 결과는 해당 domain 의 refactoring plan 에 provenance 로 기록한다

적용 근거: 편집 축 순서 선택이 "제거 → 참조 수정" (효율성 기준) vs "참조 수정 → 제거" (안전성 기준) 로 갈릴 때, 영향 파일의 겹침 여부가 선택의 결정 기준이다 (BL-087 의 SE 리뷰 disagreement resolution evidence).

**용어 주의**: 본 규칙에서 "Stage 1/Stage 2" 는 domain document refactoring 의 두 편집 축을 의미한다. Phase 1 Integral Exploration Loop 의 Stage 1 (entity exploration) / Stage 2 (behavior exploration) 와 맥락이 다르며 혼동하지 않는다.

근거: BL-087.

---

## Change Propagation Checklist

When modifying this file (reconstruct.md), the following documents must be synchronized:

| Document | Sections to Synchronize |
|---|---|
| `README.md` | Line 3 (description), agent table, "Ontology Build" section, certainty description, directory structure |
| `BLUEPRINT.md` | Section 2 (term definitions), Section 3.6 (Explorer), Section 4.3 (reconstruct), certainty table, directory structure, MCP interface |
| `process.md` | Certainty-related content in Teammate prompt template, agent-domain document mapping, "verification agent" → "lens" terminology |
| `explorers/*.md` | Source-type profiles — if certainty level names/formats in reconstruct.md change, synchronize the examples in the profiles |
| `src/core-runtime/cli/coordinator-state-machine.ts` | Add `awaiting_adjudication` state for reconstruct mode pipeline |
| `.sprint-kit.yaml` / config | Schema negotiation (Phase 0) 변경 시 config 파일의 schema 옵션·기본값 동기화 |
| `golden/schema-*.yml` | Schema 구조(필드, 타입, 필수값) 변경 시 golden fixture 의 스키마 정합 확인 |
| `.onto/authority/core-lexicon.yaml` | 용어 정의(certainty level, fact_type 등) 변경 시 lexicon term 동기화 (W-D-01 provisional_lifecycle 참조) |
