# Ontology Build Process (Integral Exploration)

> The Explorer traverses the source, and lenses provide exploration directions in an iterative loop that incrementally builds the ontology.
> Related: After build, transform via `/onto:transform`, verification via `/onto:review`.

## Generalization Scope

This process is an **extensible design**. Currently supported source types are codebase, spreadsheet, database, and document. New source types are supported by adding an `explorers/{source_type}.md` profile file and Phase 0.5 context questions. This is not a fully generalized abstraction for all source types.

## Design Principles

### Structural Difference Between Verification and Exploration

- **Verification (review)**: Multi-perspective evaluation of a scope-defined input. Independent parallelism is appropriate.
- **Exploration (build)**: Discovering domain knowledge from a scope-undefined source. Independent exploration yields N-fold duplication, and empty areas are only discovered at consensus time — unfavorable.

Therefore, build uses an **integral exploration** structure:
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

## Agent Configuration (build mode)

| ID | Role | Behavior in Build |
|---|---|---|
| `explorer` | Source traverser | Directly traverses the source and generates deltas (domain fact reports). Only judges certainty as binary (`observed`/`pending`). Does not perform ontological interpretation. Performs structural recognition |
| Lenses (N, per process.md agent table) | Direction providers | Label deltas and propose epsilons for gaps in their dimension. **Do not directly traverse the source**. Refine `pending` facts' certainty |
| Runtime Coordinator | Deterministic orchestrator | Applies patches to wip.yml, processes certainty reclassifications, checks convergence, preprocesses epsilons (sorting, grouping, forced_directions), classifies conflicts by rule-resolvability, anonymizes unresolved conflicts. **Not an LLM agent — implemented as runtime logic** |
| Axiology Adjudicator | Conflict resolver | Resolves conflicts that runtime rules cannot resolve. Judges based on system purpose only. **Spawned as a fresh context per invocation with anonymized inputs** — does not carry round-level reasoning context, cannot identify which lens produced which position |
| `synthesize` | Integrator | Composes resolved material into integrated exploration directives. Does not produce independent perspectives or resolve conflicts — structures and edits only |

Lens definitions (`roles/{lens-id}.md`) are the same as in review. In build, the role shifts from "verification" to "identifying gaps in their dimension + assigning labels." The current lens list is managed in the agent configuration table in `process.md`.

### Role Boundary Principles

- **Lenses** produce findings independently. They do not see each other's outputs within the same round.
- **Runtime Coordinator** performs only deterministic operations. Any operation requiring semantic judgment is delegated to the appropriate lens or adjudicator.
- **Axiology Adjudicator** receives only: (1) `context_brief.system_purpose` + `design-principles/productization-charter.md`, (2) anonymized conflict pairs (lens IDs removed). Three protections against self-reinforcement: context isolation (fresh agent), source anonymization (lens ID removal), scope restriction (purpose documents only — see Adjudicator prompt for exact allowed inputs).
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

> **Note**: Deeper architecture-based judgments (business logic boundary clarity, operational vs transactional, etc.) require `context_brief.architecture` which is only collected in Phase 0.5.2–0.5.4 (after Phase 0). The team lead may revisit schema selection after Phase 0.5 completes if the collected context contradicts the initial recommendation.

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
Creates a team (`onto-build`) via TeamCreate.

**Error handling (build-specific)** — applies process.md Retry Protocol. Build-specific rules:

- **Explorer failure**: Halt the process + inform the user (irreplaceable single point).
- **Runtime Coordinator failure**: Halt the process + inform the user (irreplaceable; failure indicates a bug, not a transient error).
- **Partial failure among N lenses**: Retry per process.md → graceful degradation. Adjust the denominator to the number of responding lenses when judging convergence.
- **Axiology Adjudicator failure (Phase 1 round)**: Skip adjudication for this round. **Epsilon conflicts** of this round are preserved as `unresolved_for_user` and accumulated into `meta.cumulative_unresolved_conflicts` for Phase 2 Step 4 collation (eventually Phase 3). **Label conflicts** (patch operation `conflict`) already live in wip.yml issues with `resolution: pending` and continue to wait for Phase 2 Step 3 (not escalated early — Phase 2 Step 3 is their designated batch resolution point). The round continues with consensus + rule-resolved epsilons only.
- **Synthesize failure**: Deliver raw epsilons directly to Explorer, sorted by priority. Specifically: consensus items pass through as-is; rule-resolved items pass through with their selected direction; adjudicator-resolved items pass through as the Adjudicator's selected position (not the raw conflict pair); forced_directions pass through as-is. Log degradation.
- **Degradation accumulation threshold**: Runtime Coordinator maintains two per-Stage counters in `meta` (mirrored in `convergence_status`): `adjudicator_failures_streak` and `synthesize_failures_streak`. Counter rules:
  - Adjudicator counter increments only on **actual agent failure** during a round where Adjudicator was invoked (unresolvable conflicts existed). Resets to 0 on successful Adjudicator completion. **A round where Adjudicator was not invoked (no unresolvable conflicts) does NOT change the counter** — it is neither a success nor a failure for this role.
  - Synthesize counter increments on Synthesize agent failure; resets on successful Synthesize completion. Synthesize runs every round.
  - Both counters reset to 0 at Stage transition.
  - If either counter reaches 2, present a warning to the user before the next round starts:
  - Show which role(s) degraded and what that implies for Phase 3 output (Adjudicator down → N unresolved conflicts will escalate to the user; Synthesize down → exploration directives will be unsorted lists)
  - Show current round and remaining rounds in the Stage
  - Ask: "Continue this Stage? [continue / end Stage now / abort build]"
    - **continue** — proceed with degraded execution
    - **end Stage now** — close current Stage immediately, proceed to Stage transition (if Stage 1) or Phase 2 (if Stage 2)
    - **abort build** — halt the entire build process, preserve current wip.yml as partial artifact in the session directory
  - Default action (if user does not respond): continue
- **Stage 2 module_inventory replacement**: Any modules from Stage 1's `module_inventory` that remained in `uncovered_modules` at Stage 1 termination are preserved in wip.yml meta as `stage1_uncovered_modules` and reported in Phase 3's "Unexplored Areas" section.

#### 1.0 Team Composition

Creates the following agents as teammates:
- **explorer**: Dedicated source traverser. Recommended to use Explore-type subagent.
- **Lenses (N, per process.md agent table)**: Analysis agents that do not directly traverse the source. Same role definitions as review (`roles/{lens-id}.md`), operating in build mode.
- **synthesize**: Integrator that composes resolved material into unified output. Not an independent lens.

Explorer initial prompt composition:

The team lead reads the `explorers/{source_type}.md` profile corresponding to the source type determined in Phase 0.5 and fills in the template variables below.

```
You are the source traverser (Explorer).
You are joining the onto-build team.

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

[Team Rules]
- Traverse the source according to the team lead's exploration directives (integrated epsilon).
- Report traversal results in delta format to the team lead.
- If traversal fails (file access failure, parsing failure, etc.), report delta with status: failed.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

Lens initial prompt: use the **Teammate Initial Prompt Template** from `process.md`. However, replace [Task Directives] with the following:

```
[Task Directives — build mode]
You are operating in build mode.
In review mode, your role is "verification," but in build mode, it shifts to "identifying gaps in your dimension + assigning labels."
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
  - `design-principles/productization-charter.md` (the canonical system purpose document)
  - Excluded: `context_brief.architecture`, `context_brief.legacy_context`, other `design-principles/` files (naming-charter, OaC, LLM-Native, etc. — these encode structural/engineering rules and would violate scope restriction)
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

[Rules]
- Judge based on system purpose only. Do not apply structural, coverage, or pragmatic criteria — those perspectives are already represented in the justifications.
- Do not speculate about which lens produced which position. Justification text may contain perspective-revealing language (e.g., "from a structural perspective") — disregard such cues entirely.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

Synthesize initial prompt:

```
You are the integrator (Synthesize).
You are joining the onto-build team.

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

[Rules]
- Do not invent new exploration directions not present in the input.
- Do not re-adjudicate resolved conflicts.
- **Do not mutate wip.yml directly.** Your output is a directive (text or structured emit); Runtime Coordinator is the sole writer of wip.yml. This applies in Phase 1 rounds and Phase 2 Step 4 alike.
- Work according to the team lead's directives.
- Respond in {output_language}. (resolved from config.yml, default: en)
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
> **Tier 1 (gating, deterministic)**: Normalize subject+statement (lowercase, trim whitespace, strip punctuation, split on whitespace into tokens, drop stopwords {`a, an, the, of, to, in, on, is, are, was, were, be`}). Two facts are the "same fact" if and only if their normalized token multisets are identical.
>
> **Convergence is determined solely by Tier 1.** This preserves the "No LLM judgment required" guarantee for termination: given the same source, the same normalized facts, the build terminates at the same round.
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
> **Tokenization note**: mirrors the `significantTokens` function in `src/core-runtime/learning/promote/panel-reviewer.ts` to maintain a single tokenization convention across the codebase. Facts with <4 tokens after normalization are excluded from Tier 2 (too noisy); Tier 1 always applies.
>
> **Semantics lens unavailable (Tier 2 only)**: Tier 2 diagnostic skipped. No impact on convergence (Tier 1 is authoritative). Logged once per affected round as an "advisory signal unavailable" notice. Does NOT trigger graceful degradation because no round-level lens output is lost — only the optional Tier 2 diagnostic.
>
> **Semantics lens full failure (Round N participation)**: If the semantics lens fails to deliver its round-level label+epsilon output, this IS a graceful degradation case per the general lens failure rule (responding lenses denominator adjusted for convergence). The Tier 1/Tier 2 semantic identity logic is orthogonal to the lens's round-level participation.

**Build-time configuration** (all keys resolved from `{project}/.onto/config.yml`):

```yaml
# {project}/.onto/config.yml — build-specific section
semantic_identity:
  diagnostic_enabled: true    # default; when false, Tier 2 is skipped entirely
  diagnostic_threshold: 0.7   # Jaccard cutoff; pairs in [threshold, 1.0) forwarded to semantics lens

build:
  underexplored_threshold:
    # module is underexplored if fact count ≤ max(min_floor, ratio × median)
    min_floor: 2              # absolute minimum facts before considered underexplored
    ratio: 0.5                # fraction of per-Stage median
  degradation_warn_threshold: 2   # consecutive rounds before user warning
  max_rounds_per_stage: 5         # default max rounds per Stage
```

If `config.yml` is absent or a key is missing, defaults listed above apply. Unknown keys under `semantic_identity:` or `build:` are ignored (forward-compatibility for new runtime features).

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

**When a Stage 1 missing Entity is discovered in Stage 2**:
- The Explorer reports it as fact_type: entity (Stage fact_type scope exception).
- The Runtime Coordinator adds it to wip.yml with added_in_stage: 2, note: "supplemental discovery in Stage 2".
- Properties/relations for this Entity are explored in Stage 2's remaining rounds.

**Cross-Stage certainty propagation — policy summary**:

Certainty of Stage 1 elements can change in Stage 2 via three policy classes. Operation mechanics are defined in the Patch Format section — this table only states policy (what is allowed, and by which mechanism).

| Situation | Policy | Mechanism |
|---|---|---|
| Lens-initiated certainty transitions (demote, upgrade, nullify, reclassify-downgrade) | Allowed | Stage 2 lens reports `certainty_reclassification` issue with `requested_operation` — see Patch Format for operation semantics and validation |
| Upgrade **to `observed`** (`pending → observed`, `inferred → observed`) | **Only via Explorer re-emission** | Lenses do not traverse the source (see Role Boundary). Requires a subsequent Explorer delta with a concrete source location; Runtime's dedup/merge logic detects the match (subject+statement after Tier 1 normalization) and upgrades `certainty`, appends to `source.locations`, and records `certainty_upgraded_at_round` + `upgrade_source: explorer_reconfirmation` for provenance |
| Element **type change** (element_type) | Not allowed | If type change is needed, record in issues and present to user in Phase 3 |

When Stage 1 terminates (convergence or maximum 5 rounds reached):
1. The Runtime Coordinator finalizes Stage 1's wip.yml.
2. Updates wip.yml's `meta.stage` to 2.
3. The team lead delivers Stage 2 initial directives to the Explorer:

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

4. Restart the integral loop from Stage 2's Round 0.
5. At Stage transition, Runtime Coordinator:
   - Preserves Stage 1's module list as `meta.stage1_module_inventory` (original module list from Phase 0.5.1 / Round 0).
   - Preserves `meta.stage1_uncovered_modules` = stage1_module_inventory − modules with ≥1 fact after Stage 1.
   - **Replaces** `meta.module_inventory` with the Entity list confirmed in Stage 1. From this point (determined by `meta.stage == 2`), `module_inventory` semantically means "Entities to cover with behavior facts."
6. In Stage 2, an entity is "covered" when ≥1 fact of type `state_transition`, `command`, or `query` references it in `structured_data.entity` / `structured_data.target_entities`. `policy_constant` and `flow` facts do not count toward Stage 2 coverage (they're cross-cutting).
7. The convergence formula's "Coverage satisfied" uses `module_inventory` under the current Stage's semantics (source modules in Stage 1 when `meta.stage == 1`, Entities in Stage 2 when `meta.stage == 2`). `meta.stage` is the single source of truth for which semantics apply.

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
- This is a **build mode exception** to the "independence guarantee" principle in process.md: to ensure coverage completeness, the confirmed element list from previous rounds is shared, but the judgment author is hidden to mitigate anchoring bias

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
      fact_type: entity | enum | property | relation | state_transition | command | query | policy_constant | flow | code_mapping
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
     - Stage 1 threshold: `max(config.build.underexplored_threshold.min_floor, config.build.underexplored_threshold.ratio × median(Stage 1 per-module counts))`. Defaults: `min_floor: 2`, `ratio: 0.5` → `max(2, 0.5 × Stage1_median)`.
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

#### Step 2: Focused lens queries (2a and 2b run in parallel, after Step 1 completes)

These are focused lens queries per the "Focused Lens Query Protocol" above. The team lead dispatches each query as a fresh-context agent.

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
| # | Type | Name | Certainty | Identified Stage | Identified Round | Summary |
|---|---|---|---|---|---|---|

- `Identified Stage` = `added_in_stage` (1 for Stage-1 origination, 2 for Stage-2 supplemental discovery). Lets users see which elements were discovered during behavior exploration vs structural survey.

### User Decision Required Items
| # | Element | Certainty | Decision Question | Inference Quality (inferred only) |
|---|---|---|---|---|

- `rationale-absent` items: "Implementation confirmed but please provide the rationale"
- `inferred` items: sorted by inference quality (explanatory_power, coherence) — lower quality inferences are priority confirmation targets
- `ambiguous` items: "Multiple interpretations are possible. Please choose" + each interpretation option with rationale
- `not-in-source` items: "Cannot be confirmed from this source. Please provide the information"

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

---

### Phase 3.5: User Decision Write-back (Runtime Coordinator)

After the user responds to Phase 3, Runtime Coordinator applies the user decisions to wip.yml before Phase 4 Save:

1. **Unresolved conflicts table** — for each row:
   - If user selects **Position A** or **Position B**: update the corresponding `conflict` issue to `resolution: resolved`, record which position was chosen in `resolved_position: position_a | position_b`, and apply the chosen label to the target element via an `update` patch (no element mutation for epsilon conflicts — they do not correspond to elements).
   - If user provides a **custom free-form resolution**: update the `conflict` issue to `resolution: user_resolved` with `resolution_text: {user's text}`. The target element itself is NOT mutated — the resolution_text is advisory context attached to the conflict issue only. Rationale: free-form text cannot be deterministically applied to a structured element field without re-invoking an LLM, which would reintroduce semantic judgment outside the build loop.
   - If user **defers** (explicit `defer` response or if the conflict is unaddressed when the user replies `confirmed` globally): update the `conflict` issue to `resolution: user_deferred` and leave the target element in its pre-confirmation state.
   - If user's response is **ambiguous or does not match any of the above patterns** (e.g., "kind of A and B combined", "A for subject X but B for Y", free-form note not clearly identifying a position): Runtime treats it as `user_resolved` with the raw reply preserved in `resolution_text`. The target element is NOT mutated. This default preserves the user's intent without silent misclassification as a specific position. Runtime may optionally log the ambiguity for post-build review.

2. **User Decision Required Items (certainty-based)** — for each row:
   - If user confirms the proposed action: update the element's `certainty` and note the rationale in `user_confirmed_rationale`.
   - If user rejects or defers: update the element with `user_decision: deferred` and leave certainty unchanged.

3. **Other user adjustments** (type changes, name corrections, etc. from Phase 3 global response): recorded as direct patches to wip.yml elements with `source: user_decision_phase3`.

4. **Atomicity and crash safety**:
   - Runtime applies all steps 1-3 as a single atomic wip.yml write (temp file + rename, or equivalent). Partial application is not exposed: either the full user-decision write-back is reflected in wip.yml or none of it is.
   - If Runtime crashes mid-Phase-3.5, re-execution reads the pre-3.5 wip.yml and re-applies all decisions from the preserved Phase 3 response log. Phase 3.5 is **idempotent**: re-running with the same Phase 3 response produces identical wip.yml state.

5. **Invariants after Phase 3.5**:
   - No element has `certainty: pending` (all resolved to a concrete level, or promoted to `not-in-source` per step 3.5 below).
   - All conflict issues have `resolution ∈ {resolved, user_resolved, user_deferred}` (no `pending`).

6. **Pending-certainty promotion (final pass)**:
   - For any element still at `certainty: pending` after steps 1-3 (e.g., deferred certainty decisions, unaddressed pending from earlier rounds): promote to `not-in-source`, preserve the prior level in `pre_defer_certainty` for provenance, and mark with `user_decision: promoted_on_defer`.
   - This ensures invariant 5 holds unconditionally.

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
    # `pending` is intra-build only and must be resolved before raw.yml save.
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
  - **Re-entry bound**: maximum 2 re-entries per Phase 4 attempt. If pending still remains after 2 re-entries, halt the build with a session error and preserve wip.yml for manual inspection. This prevents infinite loops when the underlying Phase 3.5 defect cannot be resolved by user re-decision alone.
- `meta.cumulative_unresolved_conflicts` is dropped at save (see its lifecycle comment in the wip.yml schema). User-deferred items persist via `raw.yml.issues[]` instead.

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

## Change Propagation Checklist

When modifying this file (build.md), the following documents must be synchronized:

| Document | Sections to Synchronize |
|---|---|
| `README.md` | Line 3 (description), agent table, "Ontology Build" section, certainty description, directory structure |
| `BLUEPRINT.md` | Section 2 (term definitions), Section 3.6 (Explorer), Section 4.3 (build), certainty table, directory structure, MCP interface |
| `process.md` | Certainty-related content in Teammate prompt template, agent-domain document mapping, "verification agent" → "lens" terminology |
| `explorers/*.md` | Source-type profiles — if certainty level names/formats in build.md change, synchronize the examples in the profiles |
| `roles/philosopher.md` | Update legacy note — now legacy for both review and build |
| `src/core-runtime/cli/coordinator-state-machine.ts` | Add `awaiting_adjudication` state for build mode pipeline |
