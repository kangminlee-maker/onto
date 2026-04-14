# Agent Process — Common Definitions

> 이 문서는 운영 절차와 가변 경로를 소유한다. 원칙은 소유하지 않는다. shadow authority 금지.

Common definitions referenced by each process file (`processes/`).

> Learning storage rules, consumption rules, and tag definitions are in `learning-rules.md`.
> Teammates self-load `learning-rules.md` during context loading. Team lead references it when needed.

**현재 active enhancement seat**: `development-records/tracking/20260406-discovered-enhancements.md`

**Adaptive axis-based learning system** — Learnings are tagged with 3 adaptive axes (communication, methodology, domain), and a single learning can belong to multiple axes. Process improvement is performed continuously based on empirical data and friction.

## Process Map

| Process | File | Description | Related Processes |
|---|---|---|---|
| Onboarding | `processes/onboard.md` | Set up onto environment for a project | -> Review, Query |
| Individual Query | `processes/question.md` | Ask a question to a single agent | Learning -> Promotion |
| Team Review | `processes/review.md` | Agent panel review (Agent Teams) | Learning -> Promotion |
| Ontology Build | `processes/reconstruct.md` | Build ontology from analysis target (Agent Teams) | -> Transform, Review |
| Transform | `processes/transform.md` | Raw Ontology format conversion | Build -> |
| Learning Promotion | `processes/promote.md` | Learning Quality Assurance — 승격, 큐레이션, 감사. Canonical entrypoints: `onto promote` (Phase A analyze), `onto promote --apply <session>` (Phase B mutations), `onto reclassify-insights [--apply]` (insight role reclassification), `onto migrate-session-roots` (legacy layout migration). Slash command `/onto:promote` is the prompt-backed reference path. | Review/Query -> |
| Domain Creation | `processes/create-domain.md` | Generate seed domain documents from minimal input | -> Feedback, Review |
| Domain Feedback | `processes/feedback.md` | Feed learnings back into domain documents | Review/Query -> |
| Domain Promotion | `processes/promote-domain.md` | Promote seed domain to established | Feedback -> |
| Data Backup | `processes/backup.md` | Snapshot onto user data for rollback | -> Restore |
| Data Restore | `processes/restore.md` | Restore user data from backup | Backup -> |
| Health Dashboard | `processes/health.md` | Show learning pool health metrics | Standalone |
| Design | `processes/evolve.md` | 온톨로지 기반 설계 — 기존 설계 대상에 새 영역 추가 (brownfield) | Build ->, -> Review |

---

## Agent Configuration

### Design Principles

These agents are not a MECE classification but a set of empirically validated independent verification perspectives. No single classification axis is intentionally used; each perspective's justification for retention is verified by the existence of a unique detection area.

### Review Lenses
| ID | Role | Verification Dimension | Standard Framework Mapping |
|---|---|---|---|
| `logic` | Logical consistency verifier | Contradictions, type conflicts, constraint conflicts | Gomez-Perez: Consistency, Obrst: L4 |
| `structure` | Structural completeness verifier | Isolated elements, broken paths, missing relations | Obrst: L2-L3, Gomez-Perez: Completeness (internal) |
| `dependency` | Dependency integrity verifier | Cycles, reverse direction, diamond dependencies | Gomez-Perez: Consistency, Obrst: L4 |
| `semantics` | Semantic accuracy verifier | Name-meaning alignment, synonyms/homonyms | Obrst: L1, OntoClean: Rigidity/Identity |
| `pragmatics` | Pragmatic fitness verifier | Queryability, competency question testing | Brank: Application-based |
| `evolution` | Evolution fitness verifier | Breakage when adding new data/domains | — |
| `coverage` | Domain coverage verifier | Missing sub-areas, concept bias, gaps against standards | Gomez-Perez: Completeness (external) |
| `conciseness` | Conciseness verifier | Duplicate definitions, over-specification, unnecessary distinctions | Gomez-Perez: Conciseness |
| `axiology` | Purpose and value alignment verifier | Purpose drift, value conflict, mission misalignment | — |

> Verification dimensions and agents have a many-to-many (N:M) relationship. Since agents are a "set of independent perspectives," a single agent may cover multiple dimensions, and a single dimension may span multiple agents.

### Touch Point Checklist for Adding/Removing Agents

When adding or removing an agent, all of the following files must be updated:

| # | File | Update Item |
|---|------|----------|
| 1 | `roles/{agent-id}.md` | Create/delete role definition |
| 2 | ~~`commands/ask-{dimension}.md`~~ | Retired (§1.2 ask 폐기). 단일 lens 질의는 review 경로 사용 |
| 3 | `process.md` review lenses table | Add/delete row |
| 4 | `process.md` domain document mapping | Add/delete row |
| 5 | `process.md` teammate initial prompt mapping | Add/delete row |
| 6 | `processes/review.md` review lens + synthesize file list | Add/delete path |
| 7 | `domains/*/` | Add/delete domain document template for the agent |
| 8 | `BLUEPRINT.md` agent section | Add/delete description |
| 9 | `README.md` directory tree | Add/delete filename |
| 10 | learning-rules.md | Update if learning storage rules change |
| 11 | `processes/reconstruct.md` Agent Configuration table + Phase 1.0 Team Composition + error handling "N lenses" prose | Update lens count references and lens list |

### Touch Point Checklist for Adding/Removing Processes

When adding or removing a process, all of the following files must be updated:

| # | File | Update Item |
|---|------|----------|
| 1 | `processes/{process-name}.md` | Create/delete process definition |
| 2 | `commands/{command-name}.md` | Create/delete command file |
| 3 | `process.md` Process Map table | Add/delete row |
| 4 | `process.md` Per-process domain resolution table | Add/delete row |
| 5 | `BLUEPRINT.md` Processes section | Add/delete description |
| 6 | `README.md` Commands section + directory tree | Add/delete entries |
| 7 | learning-rules.md | Update if process affects learning storage |

### Review Synthesis Stage
| ID | Role |
|---|---|
| `synthesize` | Synthesizes review lens findings into consensus, disagreement, overlooked premises, and final review output |

> `philosopher` has been retired as a canonical review/build pipeline role. Canonical review uses `axiology` + `synthesize`. `ask` activity is retired (§1.2). The archival lineage is preserved at `development-records/legacy/philosopher.md`.

### Domain Documents
Each agent reads the corresponding domain documents at execution time (verified using general principles if no file exists):

| Type | Document | Agent | Impact When Absent | Update Method |
|---|---|---|---|---|
| **Scope-defining** | `domain_scope.md` | coverage | Role rendered ineffective | Promote proposal -> user approval |
| **Accumulable** | `concepts.md` | semantics | Performance degradation (compensated by learnings) | Promote proposal -> user approval |
| **Accumulable** | `competency_qs.md` | pragmatics | Performance degradation (compensated by learnings) | Promote proposal -> user approval |
| **Rule-defining** | `logic_rules.md` | logic | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `structure_spec.md` | structure | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `dependency_rules.md` | dependency | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `extension_cases.md` | evolution | Performance degradation (LLM can substitute) | User directly writes/edits |
| **Rule-defining** | `conciseness_rules.md` | conciseness | Performance degradation (LLM can substitute) | User directly writes/edits |

Path: `~/.onto/domains/{domain}/`

`axiology` has no dedicated domain document. It primarily uses system purpose/principles and any selected domain context as supporting input.

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

Design reference: `development-records/evolve/20260329-domain-document-creation.md`

#### Feedback Log

Each domain (both `drafts/` and `domains/`) may contain a `feedback-log.md` tracking feedback session history. Created on first feedback execution via `/onto:feedback`.

#### Feedback Loop Rules

Learnings tagged with `[domain/{domain}]` can be fed back into the corresponding domain's documents (whether in `drafts/` or `domains/`) via `/onto:feedback {domain}`. Key rules:

- **Manual trigger only** (Phase 0): feedback runs only when the user explicitly invokes the command
- **Compare-based deduplication**: no state markers on learnings; content is compared against current document state at feedback time
- **User approval required**: all changes require per-item user approval before application
- **SEED marker removal**: only the user can remove SEED markers; agents may suggest removal but must not execute it automatically

**Domain document protection principle**: Domain documents are **never auto-modified without explicit user approval.** Agents are prohibited from directly modifying domain documents during review/query execution. Domain documents are **domain-level agreed-upon standards** distinct from project-level learnings, containing only general standards applicable across the entire domain rather than content specific to a particular project.

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
execution_mode: codex          # agent-teams (default) | codex
codex:
  model: gpt-5.4               # omit → ~/.codex/config.toml model
  effort: xhigh                 # omit → ~/.codex/config.toml model_reasoning_effort
```

`execution_mode` and `codex` fields:
- `execution_mode`: `agent-teams` (default if absent) or `codex`. Command flag `--codex` overrides this.
- `codex.model`: Codex model to use. If omitted, falls back to `~/.codex/config.toml` `model` field. If that is also absent, uses Codex CLI default.
- `codex.effort`: Reasoning effort level (`none` | `minimal` | `low` | `medium` | `high` | `xhigh`). Same fallback chain as `codex.model`.

Old format compatibility: `domain: A` + `secondary_domains: B` → automatically converted to `domains: [A, B]` with migration guidance.

#### Per-process domain resolution

| Process | Domain resolution |
|---------|-------------------|
| review, build, question, design | Session domain selection (above) |
| promote | Auto-determined from learning tags' `[domain/X]` (no selection needed) |
| transform | No domain context needed |
| onboard | Asks user for relevant domain list |
| create-domain | Not applicable (creates a new domain in drafts/) |
| feedback | Command argument `{domain}` (auto-resolved to drafts/ or domains/) |
| promote-domain | Command argument `{domain}` (must exist in drafts/) |
| backup | Not applicable (operates on ~/.onto/ global data) |
| restore | Command argument `{backup-id}` or none (list mode) |
| health | Not applicable (reads learning files directly) |

#### Cross-domain targets

When a target spans multiple domains, **run a separate review for each relevant domain**. Each execution is an independent session: results are not cross-referenced, and learnings are stored separately. Multi-domain simultaneous application is planned for future design.

#### Edge cases

For the complete edge case table, refer to Section 4 of `development-records/evolve/20260328-per-session-domain-selection.md`. Key behaviors:
- Non-existent `@{domain}` → warn + re-ask (no auto-fallback)
- No config.yml + no global domains → skip selection, no-domain mode
- Domain directory exists but 0 files → listed with "(empty — no rules)" marker
- Mid-session domain change → finish current process, re-run with different domain

#### Agent re-evaluation on domain expansion

When entering a domain that meets the conditions below, agent configuration re-evaluation is required.

| Condition | Reason | Re-evaluation Target |
|------|------|------------|
| Domains that classify humans/groups (medical, education, legal, HR) | Ethics/axiology verification required — "Does this classification disadvantage a specific group?" | Ensure `axiology` remains included and sufficiently informed |
| Financial/administrative domains | Increased weight of social ontology — the mode of existence of institutional constructs is central | Adjust semantics' existence-type verification weight |

---

## Agent Teams Execution

Processes requiring parallel agent execution (team review, ontology build, learning promotion) use **Agent Teams** as the primary method.

### Fallback Rules

When TeamCreate fails, fall back to the Agent tool (subagent) approach. The **purpose and output format** of the process remain identical, but the execution method differs:
- Agent tool is used instead of TeamCreate/SendMessage.
- Each Agent tool call includes the agent definition + context + task directives combined. (Since the teammate cannot self-load, the team lead includes the content directly.)
- **File-based delivery applies identically**: Subagents also save results to files using the Write tool, and only return the path to the team lead. In review mode, `synthesize` also reads result files directly using the Read tool.
- Cross-process lens-to-lens deliberation messaging is skipped (no SendMessage in this realization). `synthesize` still performs deliberation in-process per `processes/review/synthesize-prompt-contract.md` §6 — it re-reads contested lens outputs and the materialized input, then records resolutions in the Deliberation Decision section.
- Content the team lead must include in each Agent tool call during fallback: agent definition + learning file (with axis tag filtering) + domain document + communication learning + task directives + **session path**. (All context must be included directly since self-loading is not possible.)

### Codex Execution Mode

When `execution_mode: codex` is set in config.yml or a `--codex` command flag is used, reviewer passes are delegated to Codex (OpenAI) via the `codex:codex-rescue` subagent type. The **purpose and output format** remain identical to Agent Teams and Subagent fallback.

**Scope**: Currently supported for the **review** process only. Other processes behave differently:
- **promote** — the Phase 3 CLI pipeline (`onto promote`, `onto promote --apply`, `onto reclassify-insights`) calls Anthropic / OpenAI / Codex CLI APIs directly through `src/core-runtime/learning/shared/llm-caller.ts` with automatic provider resolution. It does NOT route through the Agent Teams / Codex mode infrastructure. The `/onto:promote` slash command is a prompt-backed reference path that still uses Agent Teams.
- **build, question** — always use Agent Teams regardless of this setting.

This scope will expand as Codex mode is validated in review.

**Purpose and tradeoffs**:
Codex mode delegates review passes to an external runtime (OpenAI Codex) to reduce Claude token consumption. The team lead coordination (~50-100k tokens) is the only Claude cost; all review lens passes and the synthesize stage run on Codex. Direct lens-to-lens exchange (Step 4 messaging in Agent Teams mode) is unavailable because Codex tasks are independent processes — but deliberation itself is not skipped. `synthesize` performs deliberation in-process by re-reading contested lens outputs against the materialized input and recording resolutions in the Deliberation Decision section. See `processes/review/synthesize-prompt-contract.md` §6.

**Prerequisites**:
- Codex CLI must be installed and authenticated. Verify via `/codex:setup`.
- If Codex is unavailable at execution time → process-halting. Inform the user: "Codex CLI가 설정되지 않았습니다. `/codex:setup`을 실행하거나 Claude Code 세션에서 `onto coordinator start`로 Agent Teams 모드를 사용하세요."

**Mode selection priority**:
1. Command flag (`--codex`) → overrides config
2. config.yml `execution_mode` → applies if no flag
3. Neither specified → `agent-teams` (default) via `onto coordinator start`

**Execution model**:
- Team lead (Claude): Context Gathering, Complexity Assessment, prompt construction, result collection, learning storage, final output delivery.
- Reviewer passes (Codex): Independent review execution with self-loading.
- Review synthesize stage (Codex): Result synthesis and adjudication.

**Prompt delivery**:
- Self-loading instructions are included. Codex reads domain documents and learnings via Bash (cat). Unlike Subagent fallback, the team lead does NOT inline domain documents or learnings.
- The team lead DOES inline: agent definition (~14 lines), review target content, system purpose, **learning-rules.md content**. These are inlined to guarantee the core context and the learning candidate format specification.

**File I/O**:
- Reviewer results are written to the same session directory: `{session path}/round1/{agent-id}.md`.
- Codex writes files via Bash (shell redirect). If file write fails, Codex returns the review text as stdout.

**Parallel execution**:
- All reviewer Agents are launched simultaneously via Agent tool with `subagent_type: "codex:codex-rescue"` and `run_in_background: true`.
- The team lead waits for all background tasks to complete before proceeding to the review synthesize stage.
- `synthesize` is executed as a Codex task in foreground (depends on all review lens results).

**Model and effort**:
- The team lead reads config.yml `codex.model` and `codex.effort` during Context Gathering.
- These values are inserted into the `[Codex Configuration]` section of the prompt template as the **delivery mechanism** (not merely documentation). The delivery path is:
  1. Team lead inserts values into the prompt text (`[Codex Configuration]` section).
  2. The `codex:codex-rescue` subagent parses these from the prompt.
  3. The subagent converts them to CLI flags (`--model {value}`, `--effort {value}`) when invoking `codex-companion.mjs task`.
- Note: The Agent tool's `model` parameter only accepts Claude model names (sonnet/opus/haiku) and cannot pass Codex model names. The prompt text is the only delivery path.
- If either is absent → omit from `[Codex Configuration]` (Codex uses `~/.codex/config.toml` or its own default).

**Deliberation**: Performed by `synthesize` in-process. Lens-to-lens cross-process messaging is unavailable in Codex mode, so `synthesize` resolves contested points itself by re-reading the relevant lens outputs and the materialized input, then recording resolutions in the Deliberation Decision section. `deliberation_status` ends up `not_needed` (no contention) or `performed`. See `processes/review/synthesize-prompt-contract.md` §6.

**Error handling**: Same 4-category classification as Agent Teams (process-halting / process-halting-with-partial-result / transient retry / graceful degradation). Differences:
- Retry: re-spawn a new `codex:codex-rescue` Agent (not SendMessage).
- Review synthesize failure: process-halting (irreplaceable role). Retry once before halting.

**Comparison**:

| Aspect | Agent Teams | Subagent Fallback | Codex Mode |
|--------|------------|-------------------|------------|
| Selection type | User-selectable (default) | Automatic (on TeamCreate failure) | User-selectable |
| Runtime | Claude (TeamCreate) | Claude (Agent tool) | Codex (codex-rescue) |
| Self-loading | Agent performs | Team lead inlines | Hybrid (agent performs; learning-rules.md inlined) |
| Deliberation | Cross-process lens-to-lens via SendMessage | In-process by `synthesize` (no cross-process messaging) | In-process by `synthesize` (no cross-process messaging) |
| File I/O | Read/Write tools | Read/Write tools | Bash |
| Team lifecycle | TeamCreate/TeamDelete | N/A | N/A |
| Claude token usage | Full | Full | Team lead only |

### Error Handling Rules

Errors are classified into 4 categories for response:
- **Process-halting**: Review target read failure, agent definition file read failure -> halt the process + inform the user.
- **Process-halting-with-partial-result**: An irreplaceable role (e.g., Philosopher) fails after retry exhaustion, but intermediate results have already been collected to files. -> Halt the process, deliver collected intermediate results with explicit limitation disclosure. This applies regardless of execution mode — the determining factor is **whether intermediate artifacts exist at the point of failure**, not the execution mode.
- **Transient error → retry**: API error (500, timeout, rate limit), agent crash during execution -> team lead retries the failed agent via SendMessage. Retry up to 2 times. If the agent fails after 2 retries, fall back to graceful degradation.
- **Graceful degradation**: Teammate non-response/failure after retry exhaustion, learning file absence, domain document absence -> exclude the affected agent or mark as "not yet available" and continue with remaining agents. Adjusts the consensus denominator during determination.

**Retry protocol**: When a teammate fails with a transient error:
1. Team lead sends a retry message to the failed teammate with the original task directives and file paths.
2. If the teammate is unresponsive (no reply after 60 seconds), team lead resends once more.
3. After 2 failed retries, the teammate is excluded (graceful degradation) and the team lead informs the user.

**Per-process error handling extension**: If an irreplaceable single role within a process (e.g., Explorer in build, Philosopher) fails, it is classified as process-halting. This is specified in the respective process file. For irreplaceable roles, retry is attempted before halting.

### Team Lifecycle Management

#### Tool Availability Check (mandatory — before any Team operation)

TeamCreate, SendMessage, and TeamDelete are **deferred tools** in Claude Code. Their schemas are not loaded at conversation start and must be fetched explicitly before first use. Without this step, the LLM cannot invoke TeamCreate and silently falls back to Agent tool (subagent), bypassing Agent Teams entirely.

Before the first TeamCreate call in any process, execute:

```
ToolSearch("select:TeamCreate,SendMessage,TeamDelete")
```

- ToolSearch succeeds → proceed to Team Creation.
- ToolSearch fails (tools do not exist in this environment) → apply Fallback Rules (Agent tool subagent approach).

This check is required **once per conversation session**. Subsequent TeamCreate calls in the same session do not need to repeat it.

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
  - **Build mode exception**: For build process anonymized WIP sharing rules, refer to `processes/reconstruct.md`.

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
1. Learnings: ~/.onto/learnings/{agent-id}.md (promoted only)
2. Domain document: {resolved_domain_dir}/{corresponding domain document}
   (Skip this line if {session_domain} is empty)
   (Note: Documents in ~/.onto/drafts/ are never loaded as verification standards.
    When reviewing seed documents, they are loaded as review targets in Step 1, not as domain documents here.)
3. Communication learning: ~/.onto/communication/common.md
4. Learning rules: {plugin_path}/learning-rules.md

[Agent-Domain Document Mapping]
(Refer to the Domain Documents table in this file. Include the corresponding domain document path for the agent.)

[Task Directives]
{Per-process task directives — review target, system purpose, specific instructions}
{For build process: The definitions of certainty levels (observed, rationale-absent, inferred, ambiguous, not-in-source) are defined in the "Certainty Classification (2-Stage Adjudication)" section of processes/reconstruct.md as the SSOT.}

[Team Rules]
- Save your review finding to {session path}/round1/{agent-id}.md using the Write tool.
- Treat `{session path}/execution-preparation/materialized-input.md` as the authoritative review target basis when it is provided.
- After saving, report **only the file path** to the team lead. Do not include the review text in the message.
- Only report the full text via SendMessage if Write fails.
- Do not send direct messages to other teammates until the team lead permits.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

**Agent definitions** (roles/{agent-id}.md) are read by the team lead and included directly in the initial prompt (~14 lines per agent, minimal overhead). The remaining context is self-loaded by the teammate.

### Codex Reviewer Prompt Template

Used when execution_mode is `codex`. The team lead resolves variables and passes this as the Agent tool's `prompt` parameter with `subagent_type: "codex:codex-rescue"`.

Differences from the Teammate Initial Prompt Template:
- No team_name or SendMessage rules (Codex tasks are independent).
- Self-loading uses Bash (cat) instead of Read tool.
- learning-rules.md is inlined by the team lead (not self-loaded).
- File write uses Bash (shell redirect) instead of Write tool.

```
You are {role}.

[Your Definition]
{Content of roles/{agent-id}.md}

[Context Self-Loading]
Read the files below using `cat` and use them as your verification context.
Skip if file does not exist:
1. Learnings: ~/.onto/learnings/{agent-id}.md (promoted only)
2. Domain document: {resolved_domain_dir}/{corresponding domain document}
   (Skip this line if {session_domain} is empty)
   (Note: Documents in ~/.onto/drafts/ are never loaded as verification standards.
    When reviewing seed documents, they are loaded as review targets, not as domain documents here.)
3. Communication learning: ~/.onto/communication/common.md

[Agent-Domain Document Mapping]
(Refer to the Domain Documents table in process.md.)

[Codex Configuration]
{If codex.model is set: --model {value}}
{If codex.effort is set: --effort {value}}
(These are passed as CLI flags to the codex-companion task command by the team lead.
 If absent, Codex uses ~/.codex/config.toml or its own default.)

[Learning Rules]
{Content of learning-rules.md — inlined by the team lead}

[Task Directives]
{Per-process task directives — review target, system purpose, specific instructions}

[Output Rules]
- Write your review finding to {session path}/round1/{agent-id}.md using shell redirect (e.g., cat << 'EOF' > {path}).
- Treat `{session path}/execution-preparation/materialized-input.md` as the authoritative review target basis when it is provided.
- If file write fails, return the full review text as your response.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

### Subagent Fallback Synthesize Prompt Template

Used when TeamCreate is unavailable and execution falls back to the Agent tool. The team lead resolves variables and passes this as the Agent tool's `prompt` parameter with `subagent_type: "general-purpose"` in **foreground** (not background). The dispatched subagent performs in-process deliberation per `processes/review/synthesize-prompt-contract.md` §6 — there is no cross-process Step 4 in this path.

Differences from the Codex Review Synthesize Prompt Template:
- Self-loading uses the Read tool instead of Bash (`cat`).
- File write uses the Write tool instead of shell redirect.
- No `[Codex Configuration]` block.
- learning-rules.md is inlined by the team lead (subagents cannot self-load it reliably during fallback).

```
You are synthesize (review synthesis stage).

[Your Definition]
{Content of roles/synthesize.md}

[Context Self-Loading]
Read the files below using the Read tool. Skip if file does not exist:
1. Learnings: ~/.onto/learnings/synthesize.md (promoted only)
2. Communication learning: ~/.onto/communication/common.md

[Learning Rules]
{Content of learning-rules.md — inlined by the team lead}

[Task Directives]
{Review synthesize directives — lens result file paths,
 system purpose, synthesis format, adjudication rules}

synthesize는 deliberation actor입니다. lens 결과 사이에 disagreement가 있으면
contested된 lens 출력과 materialized input을 재읽어 직접 deliberation을 수행하고
'Deliberation Decision' 섹션에 contested point별로 resolution을 기록하세요.
Disagreement 섹션은 원 lens 입장을 보존합니다. frontmatter의 deliberation_status는
not_needed (논쟁 없음) 또는 performed (직접 수행) 둘 중 하나만 사용하세요.
required_but_unperformed는 synthesize 출력에서 사용하지 않습니다. 본 경로에서는
cross-process Step 4 deliberation이 실행되지 않습니다 — synthesize의 in-process
판단이 deliberation 결과의 유일한 authoritative source입니다.

[Output Rules]
- Write the final output to {session path}/synthesis.md using the Write tool.
- Read `{session path}/interpretation.yaml`, `{session path}/binding.yaml`, and `execution-preparation/*` before synthesizing.
- If file write fails, return the full synthesis text as your response.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

### Codex Review Synthesize Prompt Template

Used when execution_mode is `codex` for the review synthesize step. The team lead resolves variables and passes this as the Agent tool's `prompt` parameter with `subagent_type: "codex:codex-rescue"` in **foreground** (not background).

Differences from Codex Reviewer Prompt Template:
- Role is `synthesize` (synthesis + adjudication), not a review lens.
- Output path is `{session path}/synthesis.md`, not `round1/{agent-id}.md`.
- Includes in-process deliberation directive (synthesize is the deliberation actor).
- No domain document self-loading (`synthesize` has no dedicated domain document).

```
You are synthesize (review synthesis stage).

[Your Definition]
{Content of roles/synthesize.md}

[Context Self-Loading]
Read the files below using `cat`. Skip if file does not exist:
1. Learnings: ~/.onto/learnings/synthesize.md (promoted only)
2. Communication learning: ~/.onto/communication/common.md

[Codex Configuration]
{If codex.model is set: --model {value}}
{If codex.effort is set: --effort {value}}

[Learning Rules]
{Content of learning-rules.md — inlined by the team lead}

[Task Directives]
{Review synthesize directives — lens result file paths,
 system purpose, synthesis format, adjudication rules}

synthesize는 deliberation actor입니다. lens 결과 사이에 disagreement가 있으면
contested된 lens 출력과 materialized input을 재읽어 직접 deliberation을 수행하고
'Deliberation Decision' 섹션에 contested point별로 resolution을 기록하세요.
frontmatter의 deliberation_status는 not_needed (논쟁 없음) 또는 performed (직접 수행)
둘 중 하나만 사용하세요. required_but_unperformed는 synthesize 출력에서 사용하지 않습니다.

[Output Rules]
- Write the final output to {session path}/synthesis.md using shell redirect.
- Read `{session path}/interpretation.yaml`, `{session path}/binding.yaml`, and `execution-preparation/*` before synthesizing.
- If file write fails, return the full synthesis text as your response.
- Respond in {output_language}. (resolved from config.yml, default: en)
- Do not use metaphors or analogies.
```

---

## Rules

- Even when unanimous consensus is reached in team review mode, the **logical rationale** of the consensus is verified separately.
- If the query/review target is unclear, ask the user.
- If a learning file exceeds 200 lines, notify the user. The user decides whether and to what extent to clean up.
- When domain document expansion involves multiple stages editing the same files, verify before starting each subsequent stage that the previous stage's edits are complete and the file state is consistent. Run: diff between global (`~/.onto/domains/`) and plugin bundle copies to confirm sync.
