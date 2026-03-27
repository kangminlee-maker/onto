# Agent Process — Common Definitions

Common definitions referenced by each process file (`processes/`).

**Adaptive axis-based learning system** — Learnings are tagged with 3 adaptive axes (communication, methodology, domain), and a single learning can belong to multiple axes. Process improvement is performed continuously based on empirical data and friction.

## Process Map

| Process | File | Description | Related Processes |
|---|---|---|---|
| Onboarding | `processes/onboard.md` | Set up onto environment for a project | -> Review, Query |
| Individual Query | `processes/question.md` | Ask a question to a single agent | Learning -> Promotion |
| Team Review | `processes/review.md` | Agent panel review (Agent Teams) | Learning -> Promotion |
| Ontology Build | `processes/build.md` | Build ontology from analysis target (Agent Teams) | -> Transform, Review |
| Transform | `processes/transform.md` | Raw Ontology format conversion | Build -> |
| Learning Promotion | `processes/promote.md` | Promote project-level learnings to global-level (Agent Teams) | Review/Query -> |

---

## Agent Configuration

### Design Principles

These agents are not a MECE classification but a set of empirically validated independent verification perspectives. No single classification axis is intentionally used; each perspective's justification for retention is verified by the existence of a unique detection area.

### Verification Agents
| ID | Role | Verification Dimension |
|---|---|---|
| `onto_logic` | Logical consistency verifier | Contradictions, type conflicts, constraint conflicts |
| `onto_structure` | Structural completeness verifier | Isolated elements, broken paths, missing relations |
| `onto_dependency` | Dependency integrity verifier | Cycles, reverse direction, diamond dependencies |
| `onto_semantics` | Semantic accuracy verifier | Name-meaning alignment, synonyms/homographs |
| `onto_pragmatics` | Pragmatic fitness verifier | Queryability, competency question testing |
| `onto_evolution` | Evolution fitness verifier | Breakage when adding new data/domains |
| `onto_coverage` | Domain coverage verifier | Missing sub-areas, concept bias, gaps against standards |
| `onto_conciseness` | Conciseness verifier | Duplicate definitions, over-specification, unnecessary distinctions |

### Verification Dimension Coverage Checklist

A meta-tool for confirming the comprehensiveness of the agent configuration. This is not an agent configuration axis but a reference frame for verifying that the current agents cover all verification dimensions without gaps.

| Verification Dimension | Verification Question | Covering Agent(s) | Standard Framework Mapping |
|-----------|----------|-------------|-------------------|
| Formal consistency | Does ~ exist? Contradictions between definitions? | onto_logic, onto_dependency | Gomez-Perez: Consistency, Obrst: L4 |
| Semantic accuracy | Does each concept accurately represent its target? | onto_semantics | Obrst: L1, OntoClean: Rigidity/Identity |
| Structural completeness | Do all internal connections exist without gaps? | onto_structure | Obrst: L2-L3, Gomez-Perez: Completeness (internal) |
| Domain coverage | Are all relevant concepts represented? | onto_coverage | Gomez-Perez: Completeness (external) |
| Minimality | Are there unnecessary elements? | onto_conciseness | Gomez-Perez: Conciseness |
| Pragmatic fitness | Does it serve the actual intended purpose? | onto_pragmatics | Brank: Application-based |
| Evolution adaptability | Can it adapt when changes occur? | onto_evolution | — |

> Verification dimensions and agents have a many-to-many (N:M) relationship. Since agents are a "set of independent perspectives," a single agent may cover multiple dimensions, and a single dimension may span multiple agents.

### Touch Point Checklist for Adding/Removing Agents

When adding or removing an agent, all of the following files must be updated:

| # | File | Update Item |
|---|------|----------|
| 1 | `roles/{agent-id}.md` | Create/delete role definition |
| 2 | `commands/ask-{dimension}.md` | Create/delete command file |
| 3 | `process.md` verification agents table | Add/delete row |
| 4 | `process.md` domain document mapping | Add/delete row |
| 5 | `process.md` teammate initial prompt mapping | Add/delete row |
| 6 | `processes/review.md` Philosopher file list | Add/delete path |
| 7 | `domains/*/` | Add/delete domain document template for the agent |
| 8 | `dev-docs/BLUEPRINT.md` agent section | Add/delete description |
| 9 | `README.md` directory tree | Add/delete filename |

### Purpose Alignment Verifier (1 agent)
| ID | Role |
|---|---|
| `philosopher` | Provides meta-perspective based on system purpose, synthesizes and reframes verification agents' review findings from a purpose-oriented viewpoint, presents new perspectives |

### Domain Documents
Each agent reads the corresponding domain documents at execution time (verified using general principles if no file exists):

| Type | Document | Agent | Impact When Absent | Update Method |
|---|---|---|---|---|
| **Scope-defining** | `domain_scope.md` | onto_coverage | Role rendered ineffective | Promote proposal -> user approval |
| **Accumulable** | `concepts.md` | onto_semantics | Performance degradation (compensated by learnings) | Promote proposal -> user approval |
| **Accumulable** | `competency_qs.md` | onto_pragmatics | Performance degradation (compensated by learnings) | Promote proposal -> user approval |
| **Rule-defining** | `logic_rules.md` | onto_logic | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `structure_spec.md` | onto_structure | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `dependency_rules.md` | onto_dependency | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `extension_cases.md` | onto_evolution | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `conciseness_rules.md` | onto_conciseness | Performance degradation (LLM can substitute) | User directly writes/edits |

Path: `~/.onto/domains/{domain}/`

**Domain document protection principle**: Domain documents are **never auto-modified without explicit user approval.** Both the update proposal in promote step 7 and the draft generation in onboard require user confirmation. Agents are prohibited from directly modifying domain documents during review/query execution. Domain documents are **domain-level agreed-upon standards** distinct from project-level learnings, containing only general standards applicable across the entire domain rather than content specific to a particular project.

### Output Language Rules

1. **config.yml takes priority**: If the project's `{project}/.onto/config.yml` declares `output_language:`, that language is used.
2. **Default**: If `output_language:` is absent, `en` (English) is used.
3. **CLAUDE.md precedence**: `output_language` in config.yml always takes priority over language directives in CLAUDE.md.

The team lead reads config.yml during Context Gathering, resolves the `output_language` value, and fills the `{output_language}` variable in the teammate initial prompt.

### Domain Determination Rules

1. **Plugin config takes priority**: If the project's `.onto/config.yml` declares `domain:`, that domain is used.
2. **CLAUDE.md backward compatibility**: If `.onto/config.yml` does not exist or lacks `domain:`, the `domain:` or `agent-domain:` declaration in CLAUDE.md is used.
3. **Multiple domains**: If `secondary_domains:` is declared (in config.yml or CLAUDE.md), the primary domain document is referenced first, and secondary domain documents are additionally referenced. If rules conflict, the primary domain takes precedence.
4. **No declaration**: If no domain declaration exists anywhere, ask the user.
5. **No domain documents**: If documents for the declared domain (`~/.onto/domains/{domain}/`) do not exist, verified using general principles (no domain document).
6. **Agent re-evaluation on domain expansion**: When entering a domain that meets the conditions below, agent configuration re-evaluation is required.

| Condition | Reason | Re-evaluation Target |
|------|------|------------|
| Domains that classify humans/groups (medical, education, legal, HR) | Ethics/axiology verification required — "Does this classification disadvantage a specific group?" | Consider adding a normative judgment agent |
| Financial/administrative domains | Increased weight of social ontology — the mode of existence of institutional constructs is central | Adjust onto_semantics' existence-type verification weight |

---

## Learning Storage Structure

Agent learnings are stored via **2 paths**:

| Learning Type | Storage Path | Content |
|---|---|---|
| **Communication learning** | `~/.onto/communication/common.md` | Communication rules applied to all agents |
| **Verification learning** | `~/.onto/learnings/{agent-id}.md` | Verification learnings distinguished by axis tags (methodology + domain combined) |

**Adaptive axis model**: The 3-classification (communication / methodology / domain) is not a mutually exclusive classification system but a declaration of 3 independent axes to which agents must adapt. A single learning can contribute to multiple axes.

Project-level learnings are stored at `{project}/.onto/learnings/{agent-id}.md`.

---

## Agent Teams Execution

Processes requiring parallel agent execution (team review, ontology build, learning promotion) use **Agent Teams** as the primary method.

### Fallback Rules

When TeamCreate fails, fall back to the Agent tool (subagent) approach. The **purpose and output format** of the process remain identical, but the execution method differs:
- Agent tool is used instead of TeamCreate/SendMessage.
- Each Agent tool call includes the agent definition + context + task directives combined. (Since the teammate cannot self-load, the team lead includes the content directly.)
- **File-based delivery applies identically**: Subagents also save results to files using the Write tool, and only return the path to the team lead. The Philosopher subagent also reads files directly using the Read tool.
- Deliberation (direct SendMessage) is skipped. Even if the Philosopher determines "deliberation needed," disagreement items are included as-is in the final report.
- Content the team lead must include in each Agent tool call during fallback: agent definition + learning file (with axis tag filtering) + domain document + communication learning + task directives + **session path**. (All context must be included directly since self-loading is not possible.)

### Error Handling Rules

Errors are classified into 2 categories for response:
- **Process-halting**: Review target read failure, agent definition file read failure -> halt the process + inform the user.
- **Graceful degradation**: Teammate non-response/failure, learning file absence, domain document absence -> exclude the affected agent or mark as "not yet available" and continue with remaining agents. Adjusts the consensus denominator during adjudication.

**Per-process error handling extension**: If an irreplaceable single role within a process (e.g., Explorer in build, Philosopher) fails, it is classified as process-halting. This is specified in the respective process file.

### Team Lifecycle Management

#### Team Creation

When executing TeamCreate, generate a session ID and use it identically for the team_name and session directory.

**Session ID format**: `{YYYYMMDD}-{hash8}`
- `YYYYMMDD`: Creation date (for chronological ordering)
- `hash8`: 8-character random hash (collision prevention, tracking identifier)
- Generation method: `$(date +%Y%m%d)-$(openssl rand -hex 4)` (e.g., `20260325-a3f7b2c1`)

**team_name**: `{process name}-{session ID}` (e.g., `onto-20260325-a3f7b2c1`)
**Session directory**: `{project}/.onto/{process}/{session ID}/`

Before TeamCreate, check whether an existing team exists using the `~/.claude/teams/{process name}-*` pattern. If one exists, inform the user.

#### Team Shutdown Procedure (Mandatory)

1. **Full-member shutdown confirmation**: Send shutdown_request to all teammates via **individual SendMessage** (structured messages cannot use `to: "*"` broadcast).
2. **Await responses**: Confirm shutdown_approved from each teammate.
3. **Non-response handling**: Resend after 30 seconds of non-response (up to 3 times).
4. **TeamDelete after full shutdown**: Execute TeamDelete only after all teammates have shut down.

**Prohibited actions**:
- **Manual deletion** of team directories such as `rm -rf ~/.claude/teams/{team}/` is **prohibited**. Agent processes may survive, receive work from other sessions, and report results unrelated to the current session, causing cross-session contamination.
- If TeamDelete fails with an "active member" error, resend shutdown_request to the unshut teammates. If it still fails, guide the user to perform manual cleanup.

#### Orphan Team/File Cleanup

Team directories from previous sessions may remain in `~/.claude/teams/`. Check for existing teams before creating a new team.

**Team lead behavioral rules**:
1. Only check for existing team existence using `ls ~/.claude/teams/{process name}-*`.
2. If an existing team is found, inform the user: "A team `{team name}` from a previous session remains. If cleanup is needed, please run `! rm -rf ~/.claude/teams/{team name} ~/.claude/tasks/{team name}`."
3. **The team lead must not attempt direct deletion (rm, rm -rf, etc.).** Creating, modifying, or deleting files under the `~/.claude/` path via Bash triggers sensitive path permission prompts and degrades user experience.
4. Once the user completes cleanup (or chooses to ignore it), create the new team.

### Team Lead Role: Structure Coordinator

The team lead is a **structure coordinator**. It manages the relationships between tasks and overall direction, not the content of each agent's work.

**Decision phase** (Context Gathering):
- Identifying the review target, domain determination, process flow decisions — judgment is permitted.

**Relay phase** (after Round 1):
- Do not modify or summarize content when relaying collected results.
- Do not inject own judgment into the review.
- Do not cross-share results between teammates (to ensure independence).
  - **Build mode exception**: For build process anonymized WIP sharing rules, refer to `processes/build.md`.

**Lifecycle management**: Creation -> task assignment -> error handling -> **full-member shutdown confirmation** -> shutdown.

### Teammate Initial Prompt Template

When creating each teammate (Agent tool's prompt), combine identity setup + self-loading instructions + **Round 1 task directives** into a single prompt. The teammate begins work immediately upon creation.

The team lead resolves the **domain name**, **plugin path**, **review target**, and **system purpose** obtained during Context Gathering to fill in the variables.

```
You are {role}.
You are joining the {team name} team.

[Your Definition]
{Content of ~/.claude/plugins/onto/roles/{agent-id}.md}

[Context Self-Loading]
Read the files below and construct your own context. Skip if file does not exist:
1. Learnings: ~/.onto/learnings/{agent-id}.md
2. Domain document: ~/.onto/domains/{domain}/{corresponding domain document}
3. Communication learning: ~/.onto/communication/common.md
If project-level learnings exist:
4. Project-level learnings: {project}/.onto/learnings/{agent-id}.md

[Agent-Domain Document Mapping]
| agent-id | Domain Document |
|---|---|
| onto_logic | logic_rules.md |
| onto_structure | structure_spec.md |
| onto_dependency | dependency_rules.md |
| onto_semantics | concepts.md |
| onto_pragmatics | competency_qs.md |
| onto_evolution | extension_cases.md |
| onto_coverage | domain_scope.md |
| onto_conciseness | conciseness_rules.md |
| explorer | (none) |
| philosopher | (none) |

[Task Directives]
{Per-process task directives — review target, system purpose, specific instructions}
{For build process: The definitions of certainty levels (observed, rationale-absent, inferred, ambiguous, not-in-source) are defined in the "Certainty Classification (2-Stage Adjudication)" section of processes/build.md as the SSOT.}

[Team Rules]
- Save your review finding to {session path}/round1/{agent-id}.md using the Write tool.
- After saving, report **only the file path** to the team lead. Do not include the review text in the message.
- Only report the full text via SendMessage if Write fails.
- Do not send direct messages to other teammates until the team lead permits.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

**Agent definitions** (roles/{agent-id}.md) are read by the team lead and included directly in the initial prompt (~14 lines per agent, minimal overhead). The remaining context is self-loaded by the teammate.

---

## Learning Storage Rules

### Axis Tag-Based Storage

**Communication learning**:
- `~/.onto/communication/common.md`: Communication rules applied to all agents. Findings from team reviews are stored here.
- Store items from "communication learning" that are not "none."
- These are findings about the user's communication preferences, work style, and feedback.

Entry format:
```markdown
### {date} — {project name} / {query/review target summary}

- **Context**: {In which query/review, under what circumstances was this discovered}
- **Finding**: {What was newly learned about user communication}
- **Reflection status**: Not reflected (user confirmation required)
```

**Verification learning** (`~/.onto/learnings/{agent-id}.md` or `{project}/.onto/learnings/{agent-id}.md`):
- Storage path determination:
  - If the project has a `.onto/learnings/` directory: `{project}/.onto/learnings/{agent-id}.md` (project-level)
  - If it does not exist: `~/.onto/learnings/{agent-id}.md` (global-level)
- Do not add if it duplicates an existing entry.
- If it contradicts an existing entry, replace with the new learning.

Entry format:
```markdown
- [{type}] [{axis tag}] {learning content} (source: {project name}, {domain}, {date})
```

`{type}` tags:
- `fact`: Objective description of definitions, structures, or relations. Accumulation does not introduce judgment bias.
- `judgment`: Value judgments such as "this pattern is/is not problematic." Validity may change with context, making these subject to re-verification.

`{axis tag}` (multiple allowed):
- `[methodology]`: Practical verification techniques applicable regardless of domain
- `[domain/{name}]`: Learnings valid in the context of a specific domain
- A single learning can be tagged with both `[methodology]` and `[domain/{name}]`
- **Tag absence = open-world**: The absence of a specific axis tag does not mean "invalid for that axis." It means "validity for that axis has not yet been confirmed."

**Axis tag adjudication criteria** (mandatory before storage, bidirectional):
1. "If domain-specific terms are removed from this learning, does the principle still hold?" -> If yes, assign `[methodology]` tag
2. "Did this learning arise from or is it valid in the context of a specific domain?" -> If yes, assign `[domain/{name}]` tag
3. If both apply, assign both tags

### Consumption Rules

After an agent loads its learning file, each entry is processed according to the following rules:

1. Items with `[methodology]` tag: **Always apply**
2. Items with `[domain/{current-domain}]` tag: **Always apply**
3. Items with only `[domain/{other-domain}]` tag: **Review then judge** — If the principle still holds after removing domain-specific terms from the learning content, apply it. Otherwise, ignore.
4. Items without tags (legacy): Treat as `[methodology]`

### Learning Verification Rules

**Judgment learning re-verification** (recommended):
- For agents with 10 or more accumulated `[judgment]`-type learnings, the validity of existing judgment learnings is re-verified when `/onto:promote` is executed.
- Re-verification criteria: Is this judgment still valid in the current context? Is the agent fixated on details from past judgments, losing sight of the current target's purpose?

### Post-Storage Notification

If new communication entries have been added, notify the user:
"N communication finding(s) have been recorded. Please review them at `~/.onto/communication/` and decide whether to reflect them in the global settings (`~/.claude/CLAUDE.md`)."

---

## Rules

- All agents respond in the language specified by output_language in config.yml (default: en).
- Agents do not use metaphors or analogies. They explain directly.
- Preserves technical terms and adds explanations.
- Even when unanimous consensus is reached in team review mode, the **logical rationale** of the consensus is verified separately.
- If the query/review target is unclear, ask the user.
- If a learning file exceeds 200 lines, notify the user. The user decides whether and to what extent to clean up.
- In projects where domain documents do not exist, agents verify using general principles only, without domain rules.
