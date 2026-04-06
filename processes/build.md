# Ontology Build Process (Integral Exploration)

> The Explorer traverses the source, and verification agents provide exploration directions in an iterative loop that incrementally builds the ontology.
> Related: After build, transform via `/onto:transform`, verification via `/onto:review`.

## Generalization Scope

This process is an **extensible design**. Currently supported source types are codebase, spreadsheet, database, and document. New source types are supported by adding an `explorers/{source_type}.md` profile file and Phase 0.5 context questions. This is not a fully generalized abstraction for all source types.

## Design Principles

### Structural Difference Between Verification and Exploration

- **Verification (review)**: Multi-perspective evaluation of a scope-defined input. Independent parallelism is appropriate.
- **Exploration (build)**: Discovering domain knowledge from a scope-undefined source. Independent exploration yields N-fold duplication, and empty areas are only discovered at consensus time — unfavorable.

Therefore, build uses an **integral exploration** structure:
- A single Explorer traverses the source and generates **deltas** (domain fact reports)
- Verification agents analyze deltas to attach **labels** (ontology elements) and propose **epsilons** (next exploration directions)
- The Philosopher coordinates epsilons and judges convergence
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

**Stage 2 classification (verification agents refine `pending` when assigning labels)**:

| Level | Definition | Downstream Action |
|---|---|---|
| `rationale-absent` | Implementation exists in the source, but its rationale is not in the source | Presented to user in Phase 3 as a "policy rationale unconfirmed" item |
| `inferred` | Reasonable inference but not directly confirmed from the source | Presented to user in Phase 3 with inference quality. Can be demoted to `pending` if refuted in subsequent rounds |
| `ambiguous` | Source interpretation splits into equally valid multiple directions that cannot converge to a single inference | Presented to user in Phase 3 with "Multiple interpretations are possible. Please choose" along with interpretation options |
| `not-in-source` | Cannot be determined from this source. Requires another source or user input | Presented in Phase 3 as a "user decision required" item. Cannot assign label — only a placeholder is recorded |

`ambiguous` determination criteria: "Do 2 or more equally valid interpretations exist, with no evidence in the current source to narrow down to one?" → if yes, `ambiguous`. If one is more valid, judge as `inferred` and mention alternative interpretations in the rationale.

If a verification agent determines that the Explorer's Stage 1 classification was incorrect, they report a "certainty reclassification request" in issues. The Philosopher reflects this when applying patches.

**abduction_quality** (required for `inferred` classifications):

Self-evaluates the quality of inference. Used for prioritizing user decision items in Phase 3:
```yaml
abduction_quality:
  explanatory_power: high | medium | low   # How well does it explain the observed structure
  coherence: consistent | partial | conflicting  # Is it consistent with existing confirmed facts
```

When competing labels exist and the Philosopher must choose, the following rules apply:
1. Exclude candidates with `coherence: conflicting` from comparison (handled separately via conflict operation).
2. Among remaining candidates, compare `explanatory_power` first (high > medium > low).
3. If tied, compare `coherence` (consistent > partial).

**Justification guidelines**:

When verification agents write the `rationale` field of a label, include the following:
- **Observed evidence**: From which cases/patterns was this observed (specify case count if applicable)
- **Logical connection**: The reasoning path from observation to judgment
- Write in 1-2 sentences.

---

## Agent Configuration (build mode)

| ID | Role | Behavior in Build |
|---|---|---|
| `explorer` | Source traverser | Directly traverses the source and generates deltas (domain fact reports). Only judges certainty as binary (`observed`/`pending`). Does not perform ontological interpretation. Performs structural recognition |
| Verification agents (N) | Direction providers | Label deltas and propose epsilons for gaps in their dimension. **Do not directly traverse the source**. Refine `pending` facts' certainty |
| `philosopher` | Coordinator | Coordinates verification agents' epsilons into integrated directives, judges convergence, manages ontology consistency, applies patches |

Verification agent definitions (`roles/{agent-id}.md`) are the same as in review. In build, the role shifts from "verification" to "identifying gaps in their dimension + assigning labels." The current verification agent list is managed in the agent configuration table in `process.md`.

### Distinction Between Explorer's Structural Recognition and Ontological Interpretation

The Explorer reports "what exists." "What it means" is judged by verification agents.

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

Since Phase 0.5 context (source type, architecture, domain) has not yet been collected, the team lead recommends based on information available from $ARGUMENTS and the project's CLAUDE.md/README.md.

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

**Recommendation judgment criteria**:
- Source is a single-service codebase + clear business logic boundaries → D
- Source is a data platform, operational system with many tables/APIs → B
- Source is a document, spreadsheet, or initial exploration with unclear structure → C
- Cannot determine → C (most flexible)

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

After source type determination, checks availability of traversal tools defined in the corresponding profile (`explorers/{source_type}.md`). If tools are unavailable (MCP server not configured, etc.), inform the user and halt the process. This verification is completed before Schema selection (Phase 0) to prevent wasting the user's time.

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

Phase 1 consists of **2 Stages**. Within each Stage, the existing integral loop (Explorer→verification→Philosopher) operates independently.

| Stage | Purpose | fact_type Scope | Max Rounds |
|---|---|---|---|
| Stage 1: Structure | Identify Entity, Enum, Relation, Property | entity, enum, property, relation, code_mapping | 5 |
| Stage 2: Behavior | Identify State Machine, Command, Query, Policy, Flow | state_transition, command, query, policy_constant, flow | 5 |

When Stage 1 converges (or reaches maximum), proceed to Stage 2. The Stage 2 Explorer references Stage 1's wip.yml (confirmed Entity list) to perform behavior exploration.

**When Schema A is selected**: Axiom definitions are difficult to auto-extract from code traversal and require a separate process; currently unsupported. Phase 0 guides the user to re-select from B/C/D.
**When Schema C is selected**: Stage 2's command/query are converted to Entity (entity_type: command/query).

Follows the **Agent Teams Execution** in `process.md` (including error handling rules).
Creates a team (`onto-build`) via TeamCreate.

**Error handling (build-specific)**:
- **Explorer failure**: Halt the process + inform the user (irreplaceable single point).
- **Philosopher failure**: Halt the process + inform the user (irreplaceable single point).
- **Partial failure among N verification agents**: Apply graceful degradation from process.md. Adjust the denominator to the number of responding agents when judging convergence.

#### Error Recovery

> process.md Error Handling Rules의 Retry Protocol을 적용한다.
> build 고유 사항: Explorer는 irreplaceable role이므로 에러 시 process-halting.
> Verification agents와 Philosopher에 대해서만 retry → graceful degradation 적용.

#### 1.0 Team Composition

Creates the following agents as teammates:
- **explorer**: Dedicated source traverser. Recommended to use Explore-type subagent.
- **Verification agents (N)**: Analysis agents that do not directly traverse the source.
- **philosopher**: Epsilon coordination + convergence judgment + patch application.

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

Verification agent initial prompt: use the **Teammate Initial Prompt Template** from `process.md`. However, replace [Task Directives] with the following:

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

Philosopher initial prompt:
```
You are the coordinator (Philosopher).
You are joining the onto-build team.

[Role]
You coordinate verification agents' epsilons into integrated directives, judge convergence, manage ontology consistency, and convert labels into patches to update wip.yml.

[Procedure]
Each round, the team lead delivers:
- Verification agents' labels, epsilons, issues
- Current wip.yml

Perform:
1. Convert labels into patches per the "Patch Format" below and update wip.yml
2. Coordinate conflicts between epsilons (priority judgment)
3. Reflect certainty reclassification requests
4. Judge convergence — use the "convergence_status format" below
5. Generate integrated exploration directives — use the "epsilon integration format" below

[Patch Format]
Refer to "Patch Format" below.

[convergence_status Format]
Refer to "Philosopher's epsilon integration format" below.

[Team Rules]
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

When the Explorer reports delta-0, the team lead delivers the content to verification agents without modification.

#### 1.2 Round N: Iterative Loop (Common to Stage 1 and Stage 2)

```
Loop:
  1. Team lead delivers Explorer's delta(N-1) to verification agents
     + cumulative confirmed elements list (anonymized wip: labeled_by excluded)
  2. Verification agents each report label + epsilon + issues
  2.5. Philosopher converts labels into patches and updates wip.yml (Phase 1.4)
  3. Team lead delivers verification agents' epsilons and issues to Philosopher
  4. Philosopher:
     a. Coordinates conflicts between epsilons (priority judgment)
     b. Reflects certainty reclassification requests
     c. Judges convergence (termination)
     d. Generates integrated exploration directives
  5. Team lead delivers Philosopher's integrated directives to Explorer
     (does not modify or summarize the content)
  6. Explorer traverses in the directed direction → reports delta(N)
  → return to 1
```

**Convergence judgment (termination condition)** — AND:
```
Termination = (coverage satisfied) AND (information convergence)

Coverage satisfied = at least 1 fact reported from every module in module_inventory
Information convergence = number of new facts in Explorer's reported delta = 0
            (only previously reported content found in all epsilon directions)

"New fact" = a fact whose subject+statement differs from every previously reported fact.
               Supplementing an existing fact's detail does not count as "new."
```

If coverage is unsatisfied (facts=0 but unexplored modules exist), the Philosopher force-generates epsilons targeting unexplored modules.

The Philosopher judges termination. convergence_status format:

```yaml
convergence_status:
  fact_convergence: true | false
  coverage_complete: true | false
  uncovered_modules: [{unexplored module list}]
  converged_agents: [{agents that reported no epsilon}]
  remaining_agents: [{agents with epsilons}]
  judgment: continue | terminate
  reason: "{judgment rationale}"
```

**Maximum rounds**: 5 per Stage (10 total maximum). If convergence is not reached, proceed to Phase 2 with the current state and inform the user of unexplored areas (remaining_agents' epsilons + uncovered_modules).

#### 1.3 Stage Transition

**When a Stage 1 missing Entity is discovered in Stage 2**:
- The Explorer reports it as fact_type: entity (Stage fact_type scope exception).
- The Philosopher adds it to wip.yml with added_in_stage: 2, note: "supplemental discovery in Stage 2".
- Properties/relations for this Entity are explored in Stage 2's remaining rounds.

**Cross-Stage certainty propagation rules**:

Certainty of elements confirmed in Stage 1 can change in Stage 2. This is because Stage 2 behavior exploration can provide new evidence for Stage 1 structural judgments.

| Situation | Allowed | Action |
|---|---|---|
| **Demotion** of Stage 1 element's certainty in Stage 2 | Allowed | Stage 2 verification agent reports "certainty reclassification request" in issues. Philosopher applies demote patch |
| **Upgrade** of Stage 1 element's certainty in Stage 2 (ambiguous→inferred) | Allowed | When Stage 2's additional evidence narrows the interpretation. Philosopher applies upgrade patch |
| **Type change** of Stage 1 element in Stage 2 | Not allowed | If type change is needed, record in issues and present to user in Phase 3 |

When Stage 1 terminates (convergence or maximum 5 rounds reached):
1. The Philosopher finalizes Stage 1's wip.yml.
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
5. Stage 2's module_inventory is replaced by the Entity list confirmed in Stage 1.

#### 1.4 Cross-Round Ontology Accumulation

Executed at **step 2.5** of Phase 1.2 (after verification agent reports are complete, before delivering epsilons to Philosopher).

The Philosopher converts verification agents' labels into **patches** to update wip.yml.

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
      certainty: {observed | rationale-absent | inferred | ambiguous | not-in-source}
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
      resolution: pending | resolved
      # If pending, record in issues; Philosopher makes final determination in Phase 2

    - operation: demote
      target_id: {existing element ID}
      from_certainty: inferred
      to_certainty: pending
      reason: "{refutation rationale}"
      # When an existing inferred fact is refuted in a subsequent round

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
      # When all interpretations are excluded by subsequent evidence
```

**Patch application rules**:
- New element (add): add to wip.yml
- Additional label for existing element (update): add agent to labeled_by, supplement details
- Multiple agent labels for the same type (update): add agents to labeled_by list (treated as consensus)
- Label contradicting existing element (conflict): record in issues, Philosopher adjudicates in Phase 2
- Refutation of existing inferred element (demote): demote certainty to pending, re-adjudicate in next round
- Resolution of existing ambiguous element (upgrade): when additional evidence makes one interpretation dominant, upgrade to inferred. Retain alternative interpretation record in rationale
- All interpretations excluded for existing ambiguous element (nullify): when all interpretations are excluded by subsequent evidence, convert to not-in-source. Record exclusion rationale in issue

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
  module_inventory: [{module list confirmed in Round 0}]

elements:
  - id: {element ID}
    type: {element_type}
    name: {name}
    definition: {definition}
    certainty: {level}
    added_in_round: {round first identified}
    labeled_by: [{agents that assigned labels}]
    source_deltas: [{source delta ID list}]
    source:
      locations: [{source location list}]
      scope: {exploration scope}
    details: {type-specific details}

# relations, constraints, issues also follow the same accumulation structure (with certainty)
```

**Anonymized wip (version shared with verification agents)**:
- Version of wip.yml with the `labeled_by` field removed
- Verification agents know "which elements have already been identified" but not "who made the judgment"
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
      lens: [structure | rationale | presentation]
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

Verification agents record a delta with status `failed` as "unexplored" for that direction (distinct from delta=0).

**detail field format (by certainty)**:
- `observed`: `"structure/value description — source location"` (source location required)
- `pending`: `"inference rationale description"` or `"exploration scope — where was checked but nothing found"`

---

### Label/Epsilon Format

Format reported by verification agents:

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

**open_questions handling**: Verification agents review the delta's `open_questions` and convert them to epsilons if important from their dimension. Ignore if not important.

---

### Philosopher's Epsilon Integration Format

```yaml
round: {next round number}
convergence_status:
  fact_convergence: true | false
  coverage_complete: true | false
  uncovered_modules: [{unexplored modules}]
  converged_agents: [{agents with no epsilon}]
  remaining_agents: [{agents with epsilons}]
  judgment: continue | terminate
  reason: "{judgment rationale}"

integrated_directions:
  - direction: "{integrated exploration direction}"
    requested_by: [{requesting agent list}]
    priority: high | medium | low
  # ... sorted by priority

# Force-generated when coverage is unsatisfied
forced_directions:
  - direction: "Explore {unexplored module}"
    reason: "coverage unsatisfied"
    priority: high
```

**Philosopher's role scope distinction**:
- **Phase 1 (within rounds)**: label conflict resolution, certainty reclassification reflection, epsilon integration. Per-round consistency management.
- **Phase 2 (finalization)**: full ontology structural consistency verification, exploration direction bias verification, ubiquitous language/external system cleanup.

---

### Phase 2: Finalization

When the exploration loop terminates, the Philosopher performs a final review of wip.yml.

Final review directive delivered by the team lead to the Philosopher:

```
Perform a final review of wip.yml.

[Review Items]
1. Verify consistency of elements accumulated across rounds
2. If unresolved conflicts exist, adjudicate to resolve or record in issues
3. Clean up the ubiquitous language section (domain terms discovered during exploration)
4. Clean up external system boundaries
5. Exploration direction bias verification: compare the distribution of actually explored areas against Round 0's module_inventory to identify areas that structurally exist but were never deeply explored

[Output]
Convert the reviewed wip.yml into the raw.yml format.
```

After the final review, convert wip.yml → raw.yml.

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

### Exploration Coverage
| Round | Exploration Scope | New Facts | New Elements |
|---|---|---|---|
| 0 | Initial exploration (structure survey) | N | N |
| 1 | {epsilon summary} | N | N |

### Ontology Elements — N items
| # | Type | Name | Certainty | Identified Round | Summary |
|---|---|---|---|---|---|

### User Decision Required Items
| # | Element | Certainty | Decision Question | Inference Quality (inferred only) |
|---|---|---|---|---|

- `rationale-absent` items: "Implementation confirmed but please provide the rationale"
- `inferred` items: sorted by inference quality (explanatory_power, coherence) — lower quality inferences are priority confirmation targets
- `ambiguous` items: "Multiple interpretations are possible. Please choose" + each interpretation option with rationale
- `not-in-source` items: "Cannot be confirmed from this source. Please provide the information"

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
  agents: [explorer, {verification agent list}, philosopher]
```

**Schema C default format** (when Schema C is selected, or as reference for custom schemas):

```yaml
elements:
  - id: {element ID}
    type: {schema's element_type}
    name: {name}
    definition: {definition}
    certainty: {observed | rationale-absent | inferred | ambiguous | not-in-source}
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

---

### Phase 5: Learning Storage

Stores learnings from all verification agents. Follows the "Learning Storage Rules" in `learning-rules.md`.
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
| `authority/BLUEPRINT.md` | Section 2 (term definitions), Section 3.6 (Explorer), Section 4.3 (build), certainty table, directory structure, MCP interface |
| `process.md` | Certainty-related content in Teammate prompt template, agent-domain document mapping |
| `explorers/*.md` | Source-type profiles — if certainty level names/formats in build.md change, synchronize the examples in the profiles |
