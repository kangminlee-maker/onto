# Agent Process — Common Definitions

Common definitions referenced by each process file (`processes/`).

**Adaptive axis-based learning system** — Learnings are tagged with 3 adaptive axes (communication, methodology, domain), and a single learning can belong to multiple axes. Process improvement is performed continuously based on empirical data and friction.

## Learning Management Definitions

| Term | Definition | Lifecycle Mapping |
|------|-----------|-------------------|
| Learning management | 학습의 전체 수명주기(생성·승격·보존·소비·퇴역)의 운영 | 전체 |
| Learning maintenance | 축적된 학습이 검증 품질에 기여하는 상태를 보존하는 활동. Management의 부분집합 | 보존 단계 |
| Learning curation | 유지보수의 하위 활동 — promote 내에서 수행되는 개별 항목의 재평가·통합. promote의 criterion 4(태그 재평가), criterion 6(교차 중복 제거)이 curation에 해당 | promote 내 |
| Learning Quality Assurance (LQA) | promote 프로세스의 3활동(승격·큐레이션·감사) 총칭 | promote 프로세스 |
| Audit (감사) | judgment 학습 재검증 + event marker 보유 학습 퇴역 검토 | promote Step 8 |
| Verification quality | 학습이 새로운 발견을 가능하게 하거나 기존에 놓쳤을 문제를 탐지하는 정도 | 소비 단계에서 실현 |

**Note**: "Verification quality"(검증 결과의 품질)와 "Learning Quality Assurance"(학습 항목의 품질 보증)는 다른 개념이다. 전자는 시스템 목적, 후자는 promote 프로세스의 범위이다.

**Note**: 수명주기에 "퇴역(retirement)"을 명시적으로 포함. 퇴역은 보존 상태에서 벗어나는 전이(transition)이며, 내용은 주석으로 보존된다.

## Process Map

| Process | File | Description | Related Processes |
|---|---|---|---|
| Onboarding | `processes/onboard.md` | Set up onto environment for a project | -> Review, Query |
| Individual Query | `processes/question.md` | Ask a question to a single agent | Learning -> Promotion |
| Team Review | `processes/review.md` | Agent panel review (Agent Teams) | Learning -> Promotion |
| Ontology Build | `processes/build.md` | Build ontology from analysis target (Agent Teams) | -> Transform, Review |
| Transform | `processes/transform.md` | Raw Ontology format conversion | Build -> |
| Learning Promotion | `processes/promote.md` | Learning Quality Assurance — 승격, 큐레이션, 감사 (Agent Teams) | Review/Query -> |
| Domain Creation | `processes/create-domain.md` | Generate seed domain documents from minimal input | -> Feedback, Review |
| Domain Feedback | `processes/feedback.md` | Feed learnings back into domain documents | Review/Query -> |
| Domain Promotion | `processes/promote-domain.md` | Promote seed domain to established | Feedback -> |
| Data Backup | `processes/backup.md` | Snapshot onto user data for rollback | -> Restore |
| Data Restore | `processes/restore.md` | Restore user data from backup | Backup -> |

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
| `onto_semantics` | Semantic accuracy verifier | Name-meaning alignment, synonyms/homonyms |
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

### Touch Point Checklist for Adding/Removing Processes

When adding or removing a process, all of the following files must be updated:

| # | File | Update Item |
|---|------|----------|
| 1 | `processes/{process-name}.md` | Create/delete process definition |
| 2 | `commands/{command-name}.md` | Create/delete command file |
| 3 | `process.md` Process Map table | Add/delete row |
| 4 | `process.md` Per-process domain resolution table | Add/delete row |
| 5 | `dev-docs/BLUEPRINT.md` Processes section | Add/delete description |
| 6 | `README.md` Commands section + directory tree | Add/delete entries |

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

#### Domain Document Frontmatter

Every domain document (both `domains/` and `drafts/`) must have YAML frontmatter:

```yaml
---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | int | Starts at 1. Incremented on every content update |
| `last_updated` | date | Date of last content modification |
| `source` | string | How this document was created: `setup-domains`, `create-domain`, `feedback`, `promote-domain`, `manual` |
| `status` | enum | `established` (in `domains/`) or `seed` (in `drafts/`) |

**Update rule**: Any process that modifies a domain document (`/onto:feedback`, `/onto:promote-domain`, promote Step 7, manual edit) must increment `version` and update `last_updated`. The `source` field reflects the **most recent** update method.

#### Seed Documents (drafts/)

Path: `~/.onto/drafts/{domain}/`

Seed documents have the same 8-file structure as established domain documents but are generated by LLM from minimal input via `/onto:create-domain`. They reside in `drafts/` and are subject to the following invariants:

1. `domains/` 내 문서는 미검증 내용을 포함하지 않는다
2. `drafts/` 내 문서는 에이전트의 검증 기준(standard)으로 참조되지 않는다
3. `drafts/` 내 문서는 리뷰 대상(target)으로 참조 가능하다

Design reference: `dev-docs/design-domain-document-creation.md`

#### Feedback Log

Each domain (both `drafts/` and `domains/`) may contain a `feedback-log.md` tracking feedback session history. Created on first feedback execution via `/onto:feedback`.

#### Feedback Loop Rules

Learnings tagged with `[domain/{domain}]` can be fed back into the corresponding domain's documents (whether in `drafts/` or `domains/`) via `/onto:feedback {domain}`. Key rules:

- **Manual trigger only** (Phase 0): feedback runs only when the user explicitly invokes the command
- **Compare-based deduplication**: no state markers on learnings; content is compared against current document state at feedback time
- **User approval required**: all changes require per-item user approval before application
- **SEED marker removal**: only the user can remove SEED markers; agents may suggest removal but must not execute it automatically

**Domain document protection principle**: Domain documents are **never auto-modified without explicit user approval.** Both the update proposal in promote step 7 and the draft generation in onboard require user confirmation. Agents are prohibited from directly modifying domain documents during review/query execution. Domain documents are **domain-level agreed-upon standards** distinct from project-level learnings, containing only general standards applicable across the entire domain rather than content specific to a particular project.

### Output Language Rules

1. **config.yml takes priority**: If the project's `{project}/.onto/config.yml` declares `output_language:`, that language is used.
2. **Default**: If `output_language:` is absent, `en` (English) is used.
3. **CLAUDE.md precedence**: `output_language` in config.yml always takes priority over language directives in CLAUDE.md.

The team lead reads config.yml during Context Gathering, resolves the `output_language` value, and fills the `{output_language}` variable in the teammate initial prompt.

### Domain Determination Rules

Domains use a **per-session selection** model. Each process execution selects a single `{session_domain}`.

#### Session domain (per process execution)

1. `@{domain}` specified → verify existence (if not found → warn + re-ask, no auto-fallback) → `{session_domain}` = `{domain}`
2. `@-` specified → `{session_domain}` = empty (no-domain mode)
3. `@{domain}` not specified → run Domain Selection Flow → set selected domain
4. `[-]` selected → `{session_domain}` = empty (no-domain mode)

**Command syntax**: `@` is recognized as a domain prefix only when it is an **independent whitespace-delimited token**. `@` within paths (e.g., `node_modules/@types/`) is not parsed as a domain. If 2+ `@` tokens appear, only the first is recognized; the rest are warned and ignored. `@-` specifies no-domain mode non-interactively.

#### Domain Selection Flow (shared module — review, build, question)

1. **Target analysis** — Read the target and summarize in 1-2 sentences
2. **Collect available domains** — config.yml `domains:` + `~/.onto/domains/` combined, deduplicated. Domains in `~/.onto/drafts/` are **not** included (seeds are not verification standards).
3. **Derive suggested domain** — LLM recommends based on available domains + target analysis + session context. Recommendation is a **suggestion** and does not override the user's final choice
4. **Display selection UI**

```
## Target Summary
{1-2 sentence target summary}

Suggested domain: {domain} ({reason})

Available domains:
  [a] {suggested domain} ← suggested
  ──────────────────────────
  [b] {project domain 1} ← project
  ──────────────────────────
  [c] {global domain 1}
  [d] {global domain 2}
  ...
  ──────────────────────────
  [-] Verify without domain rules (agent default methodology only)

Select domain [a]: _
```

5. **Await input (Enter to confirm)** — Enter selects the suggested domain. Other label/domain name input selects that domain. No timer
6. **Proceed after confirmation**

**UI rules**:
- Labels: lowercase a-z (not numbers). Display order: suggested > project > global — this order is for display convenience and does not imply priority between domains
- Deduplication: higher section takes precedence (suggested > project > global)
- 26+ domains: "Type the domain name directly for N additional domains"
- 0 suggestions (LLM fails to produce a recommendation): display available domains only, no default, await user input

#### "No domain" mode (`{session_domain}` empty)

The agents' default verification methodology (logical consistency, structural completeness, etc.) is based on ontological methodology. No-domain mode verifies using only this default methodology, without applying any specific domain's rule documents.

- Domain document loading: skipped
- Self-Loading: domain document line skipped (file absence graceful degradation already handles this)
- Learning storage: `[methodology]` tag only. No `[domain/...]` tag
- Learning storage path: `{project}/.onto/learnings/{agent-id}.md`
- Verification scope notice: domain-specific issues may be missed in this mode

#### Project domains (config.yml)

`domains:` is an **unordered set**. `[A, B]` and `[B, A]` are identical. No domain has priority over another. It declares only "which domains are relevant to this project."

1. config.yml `domains:` exists → project-relevant domains (unordered set)
2. config.yml `domains:` absent + CLAUDE.md `domain:`/`agent-domain:` exists → backward-compatible fallback (converted to unordered set)
3. config.yml `domains:` exists → CLAUDE.md domain declarations are ignored
4. `domains: []` (empty array) = same as key absence (CLAUDE.md fallback applies)
5. No declaration anywhere → ask during onboard, or ask at first execution

Config.yml format:
```yaml
domains:
  - software-engineering
  - ontology
output_language: ko
```

Old format compatibility: `domain: A` + `secondary_domains: B` → automatically converted to `domains: [A, B]` with migration guidance.

#### Per-process domain resolution

| Process | Domain resolution |
|---------|-------------------|
| review, build, question | Session domain selection (above) |
| promote | Auto-determined from learning tags' `[domain/X]` (no selection needed) |
| transform | No domain context needed |
| onboard | Asks user for relevant domain list |
| create-domain | Not applicable (creates a new domain in drafts/) |
| feedback | Command argument `{domain}` (auto-resolved to drafts/ or domains/) |
| promote-domain | Command argument `{domain}` (must exist in drafts/) |
| backup | Not applicable (operates on ~/.onto/ global data) |
| restore | Command argument `{backup-id}` or none (list mode) |

#### Cross-domain targets

When a target spans multiple domains, **run a separate review for each relevant domain**. Each execution is an independent session: results are not cross-referenced, and learnings are stored separately. Multi-domain simultaneous application is planned for future design.

#### Edge cases

For the complete edge case table, refer to Section 4 of `design-per-session-domain-selection.md`. Key behaviors:
- Non-existent `@{domain}` → warn + re-ask (no auto-fallback)
- No config.yml + no global domains → skip selection, no-domain mode
- Domain directory exists but 0 files → listed with "(empty — no rules)" marker
- Mid-session domain change → finish current process, re-run with different domain

#### Agent re-evaluation on domain expansion

When entering a domain that meets the conditions below, agent configuration re-evaluation is required.

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
- **Graceful degradation**: Teammate non-response/failure, learning file absence, domain document absence -> exclude the affected agent or mark as "not yet available" and continue with remaining agents. Adjusts the consensus denominator during determination.

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

The team lead resolves the **session domain**, **plugin path**, **review target**, and **system purpose** obtained during Context Gathering to fill in the variables.

```
You are {role}.
You are joining the {team name} team.

[Your Definition]
{Content of ~/.claude/plugins/onto/roles/{agent-id}.md}

[Context Self-Loading]
Read the files below and construct your own context. Skip if file does not exist:
1. Learnings: ~/.onto/learnings/{agent-id}.md
2. Domain document: ~/.onto/domains/{session_domain}/{corresponding domain document}
   (Skip this line if {session_domain} is empty)
   (Note: Documents in ~/.onto/drafts/ are never loaded as verification standards.
    When reviewing seed documents, they are loaded as review targets in Step 1, not as domain documents here.)
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
- [{type}] [{axis tag}] [{purpose type}] {learning content} (source: {project name}, {session_domain}, {date}) [impact:{impact_severity}]
```

> **Source of truth rule**: Inline tags are the source of truth for classification.
> Section headers (## methodology, ## domain/X) are human navigation aids.
> No mechanical synchronization is required, but gross divergence impairs
> human navigation and should be corrected opportunistically.
> Section headers (## methodology, ## domain/X) divergence with inline tags
> is corrected opportunistically — no scheduled maintenance required.

`{type}` tags:
- `fact`: Objective description of definitions, structures, or relations. Accumulation does not introduce judgment bias.
- `judgment`: Value judgments such as "this pattern is/is not problematic." Validity may change with context, making these subject to re-verification.

`{axis tag}` (multiple allowed):
- `[methodology]`: Practical verification techniques applicable regardless of domain
- `[domain/{name}]`: Learnings valid in the context of a specific domain. Uses `{session_domain}` value
- A single learning can be tagged with both `[methodology]` and `[domain/{name}]`
- **Tag absence = open-world**: The absence of a specific axis tag does not mean "invalid for that axis." It means "validity for that axis has not yet been confirmed."
- **No-domain mode**: When `{session_domain}` is empty, use `[methodology]` tag only. No `[domain/...]` tag

**Axis tag determination (2+1 stage test)** (mandatory before storage):

**Sanity check (Stage A)**: "Does the principle hold after removing domain-specific terms?"
→ No → `[domain/{session_domain}]` only. Test ends.
→ Yes → proceed to Stage B.

**Stage B — Applicability independence**: "Does applying this principle
presuppose conditions unique to a specific domain (presence OR absence)?"
(General structures — e.g., "cross-checking two representations" — are
not domain-specific preconditions.)
→ Yes (domain precondition required) → `[methodology]` + `[domain/{session_domain}]`
→ Uncertain → dual-tag + uncertainty flag. Re-evaluated at promote.
→ No → proceed to Stage C.

**Stage C — Effect independence (counterexample-based)**: "Can you identify
a specific domain where applying this principle would produce incorrect results?"
→ Yes (counterexample exists) → `[methodology]` + `[domain/{session_domain}]`
→ Uncertain → dual-tag + uncertainty flag. Re-evaluated at promote.
→ No (no counterexample) → `[methodology]` only

**[domain/{session_domain}] determination**:
"Did this learning arise from or is it valid in the context of {session_domain}?"
→ Yes → add `[domain/{session_domain}]` tag

**Summary**:
- A fails → `[domain/{session_domain}]` only
- A passes + B passes + C passes (no counterexample) → `[methodology]` only
- A passes + B or C blocks → `[methodology]` + `[domain/{session_domain}]`
- No-domain mode → `[methodology]` only

**Uncertainty default**: Both B and C → dual-tag + uncertainty flag.

**Retroactive reclassification**: New entries use this test immediately.
Existing entries reclassified during promote. Transition period: existing
[methodology]-only entries remain over-classified (safe direction).

**Domain document absence**: Skip Stage B, assign dual-tag.
Re-evaluate at first promote after domain document is created.

#### Creation-time Verification Gate

학습 저장 직전, 필수 태그 존재를 패턴 매칭으로 확인한다:

**필수 조건:**
- At least one axis tag: `[methodology]` or `[domain/...]`
- Exactly one purpose type: `[guardrail]`, `[foundation]`, `[convention]`, or `[insight]`
- Exactly one impact: `[impact:high]` or `[impact:normal]`
- For `[guardrail]`: presence of "Situation", "Result", "Corrective action" keywords

**실패 시 처리:**
1회 재시도: 에이전트가 determination flow를 재적용.
재시도 후에도 실패 시: 태그 미비 경고를 학습 항목에 부착하고 저장.
  `<!-- tag-incomplete: {missing tags}, {date} -->`
경고 부착 항목은 다음 promote의 criterion 4에서 보정 대상으로 우선 검토된다.

**Note**: purpose type determination flow는 항상 `[insight]`(기본값)에 도달하므로,
정상 경로에서 gate 실패는 발생하지 않는다. gate는 LLM의 확률적 준수 누락을
포착하기 위한 안전망이다.

#### Purpose-Based Type Tags (Phase 0.5)

Each learning is tagged with a purpose type in addition to the existing type and axis tags. This is an **orthogonal axis** independent of `[fact/judgment]` × `[methodology/domain]`.

`{purpose type}` tags:
- `[guardrail]`: Prohibition/warning derived from failure experience. **3 required elements** must all be present in the content: (1) failure situation — the specific action taken and context, (2) observed result — the negative outcome, (3) corrective action — what should be done instead. If any element is missing, do not tag as guardrail
- `[foundation]`: Foundational knowledge that serves as a prerequisite for other learnings
- `[convention]`: Terminology/notation/procedure agreement or conflict resolution
- `[insight]`: All learnings that do not qualify as the above 3 types (default)

**Determination flow** (mandatory at learning creation time):
```
All 3 elements present? (failure situation + observed result + corrective action)
  → Yes: guardrail
  → No: Prerequisite for other learnings?
    → Yes: foundation
    → No: Terminology/notation/procedure agreement?
      → Yes: convention
      → No: insight
```

#### Impact Severity (Phase 0.5)

Each learning is tagged with `impact_severity` at creation time. This value is **immutable** — set once and never changed.

| Value | Criteria |
|-------|----------|
| `high` | Either: (a) ignoring this learning could cause data loss, system failure, or user-facing errors; OR (b) reaching the same conclusion without this learning would require significant investigation/debugging |
| `normal` | Neither criterion met |

Tag format: `[impact:high]` or `[impact:normal]` appended after source info.

#### Failure Experience Detection (Phase 0.5)

The `[guardrail]` tag is the sole indicator of failure experience. A separate boolean field (`is_failure_experience`) is unnecessary — presence of the `[guardrail]` tag implies `is_failure_experience == true`. This replaces the former `conflict_resolution` field.

#### Guardrail Template

When storing a `[guardrail]` learning, use this structure:
```markdown
- [judgment] [domain/{session_domain}] [guardrail] **Situation**: {what action was taken and why}. **Result**: {what went wrong}. **Corrective action**: {what to do instead}. (source: {project}, {session_domain}, {date}) [impact:high]
```

### Consumption Rules

After an agent loads its learning file, each entry is processed according to the following rules:

1. Items with `[methodology]` tag: **Always apply**
2. Items with `[domain/{session_domain}]` tag: **Always apply** (where `{session_domain}` is the current session's domain)
3. Items with only `[domain/{other-domain}]` tag: **Review then judge** — If the principle still holds after removing domain-specific terms from the learning content, apply it. Otherwise, ignore.
4. Items without tags (legacy): Treat as `[methodology]`
5. Items with `[methodology]` + `[domain/X]` dual-tag:
   **Always load and apply.** The `[domain/X]` tag indicates the domain
   context in which this learning was verified (provenance).
   When the current session domain differs from X, apply the principle
   while noting the domain context difference.
   Uncertainty flags are ignored during consumption
   (flags are referenced only during promote re-evaluation).
6. Items with purpose type tags (`[guardrail]`, `[foundation]`, `[convention]`, `[insight]`): Apply using the same rules above. Purpose type does not affect consumption filtering (it is used for loading priority in Phase 1)

#### Consumption Feedback

에이전트가 리뷰/질문 수행 시 학습을 적용한 후:

1. **적용 기록**: 리뷰 결과의 "Newly Learned" 섹션 뒤에 "Applied Learnings"
   섹션을 추가. 적용된 학습의 요약과 소스를 기록.
   추가 관측: "이 학습이 없었다면 이번 리뷰에서 놓쳤을 발견이 있는가?" (yes/no)

2. **무효/유해 판단 시 이벤트 마커 부착**:
   `<!-- applied-then-found-invalid: {date}, {session_id}, {reason} -->`
   이벤트 마커는 과거 사실 기록이며, 현재 유효성 주장이 아니다.
   마커 부착: 에이전트 자율 (정보 추가 — 승인 불요)

3. **마커 읽기 (read path)**:
   - **누가**: promote Step 4a (Event Marker Review — Step 5 이전에 실행)
   - **언제**: promote 실행 시. 실행 조건: event marker 2개 이상 보유 학습 존재
     (judgment 재검증의 "10개 이상" 조건과 독립)
   - **임계값**: event marker가 2개 이상 부착된 학습 → 퇴역 후보로 표면화
   - **출력**: Step 5 User Approval에 "Event Marker Review" 섹션으로 표시
   - **퇴역 결정**: 사용자 승인 필요 (정보 삭제 → 개별 승인)
   - **퇴역 거부 시**: `<!-- retention-confirmed: {date} -->` 마커 부착.
     이후 promote에서는 retention-confirmed 이후에 새로 추가된 event marker만 카운트

4. **마커 정리**: 퇴역된 학습의 마커는 학습과 함께 주석 처리.
   퇴역되지 않은 학습의 마커는 보존 (판단 이력으로 유지).

**의도적 제한**: 이 메커니즘은 false positive(적용했으나 유해)만 포착한다.
False negative(적용하지 않았으나 적용했어야 함)는 포착하지 않는다.
현재 규모에서 비용 대비 효과가 낮아 제외한다.

**학습 품질 → 검증 품질 인과관계**: 현재 미검증 상태이다.
yes/no 관측이 유일한 직접 관측 경로이며, 소비 경로(집계·분석)는
현재 규모에서 과잉으로 판단하여 의도적으로 제외(deferral)한다.
사용자의 리뷰 결과 열람이 현재 유일한 소비 경로이다.

#### User Approval Tiers (학습 수정 승인 계층)

학습을 수정하는 모든 유지보수 활동에 적용:

| Activity Type | User Involvement | Invariant |
|---------------|-----------------|-----------|
| 정보 추가 (메타데이터 보충, 이벤트 마커) | 자동 적용 + 사후 보고 | 정보 손실 없음 |
| 정보 변경 (태그 수정, 통합) | 요약 보고 + 일괄 승인/거절 | 정보 변경 → 승인 |
| 정보 삭제 (중복 제거, 퇴역) | 항목별 승인 | 정보 삭제 → 개별 승인 |
| 관찰 (진단, 비율) | 보고서 열람만 | 판단 불요 |

**복합 연산 분류 규칙**: 하나의 활동이 여러 연산을 포함할 경우(예: consolidation =
새 통합 항목 생성 + 원본 주석 처리), 구성 연산 중 가장 엄격한 티어를 적용한다.

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
