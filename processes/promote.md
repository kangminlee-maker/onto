# Learning Promotion Process

> Reviews project-level learnings and promotes them to global-level.
> Related: Learnings accumulated from reviews (`processes/review.md`) or queries (`processes/question.md`) are the target.

Reviews project-level learnings (`{project}/.onto/learnings/`) and promotes them to global-level (`~/.onto/learnings/`). Axis tags are preserved, and tag appropriateness is also reviewed during promotion.

### Prerequisites

- The `{project}/.onto/learnings/` directory must exist.
- At least one project learning file must exist.
- If prerequisites are not met, inform the user and halt.

**Domain resolution**: Promote does not use session domain selection. Domains are automatically determined from learning tags' `[domain/X]`. Learnings without domain tags are promoted as methodology-only.

### 1. Target Collection

**If $ARGUMENTS is provided**: Collects only the specified agent's learning file.
- Example: `/promote-learnings onto_logic` → only `{project}/.onto/learnings/onto_logic.md` is targeted

**If $ARGUMENTS is not provided**: Collects all `*.md` files under `.onto/learnings/`.

For each file:
- Project learning: each entry in `{project}/.onto/learnings/{agent-id}.md`
- Global learning: existing entries in `~/.onto/learnings/{agent-id}.md`

### 2. Pre-Analysis

Compares each project learning entry against global learnings and classifies:

| Classification | Criteria | Action |
|---|---|---|
| **Duplicate** | Identical content already exists in global | Excluded from promotion targets |
| **Contradiction** | Conflicts with existing global entry | Explicit judgment required during review |
| **New** | New learning not in global | Promotion candidate |

### 3. Generalizability Review

Reviews promotion candidates (new + contradiction) via a 3-agent panel.
Follows the **Agent Teams Execution** in `process.md` (including error handling rules and structure coordinator role).
Creates a team (`onto-promote`) via TeamCreate and creates the 3 reviewers as teammates.
Initial prompt: use the **Teammate Initial Prompt Template** from `process.md` (team_name: `onto-promote`).
The team lead (structure coordinator) delivers review directives to the 3 reviewers via **individual SendMessage**.
If a review agent is non-responsive, exclude that agent and determine consensus with the remaining agents (adjusts the consensus denominator).

**Review agent selection**:
- The agent that originally generated the learning
- `philosopher` (synthesis perspective)
- One other agent most relevant to the learning content (auto-selected)

Content to deliver to each review agent:

```
You are {role}.
Please review whether the project-level learnings below should be promoted to global.

[Domains]
{domains derived from learning tags' [domain/X] — list all unique domains found in candidates}

[Promotion Candidates]
{item list — each item includes new/contradiction tag + axis tags}

[Existing Global Learnings]
{full global learnings for the agent}

[Judgment Criteria]
1. Generalizability: Is this learning valid only in this project, or also valid in other projects?
2. Accuracy: Is the learning content based on facts, or a coincidence from a unique situation?
3. Contradiction handling: If it contradicts an existing global learning, which is more generally correct?
4. Axis tag appropriateness: Are this learning's axis tags appropriate?
   - "Does the principle still hold after removing domain-specific terms?" → whether [methodology] tag is needed
   - "Is it also valid in domains other than the current project domain?" → whether additional [domain/X] tag is needed

[Report Format]
For each item:
- Judgment: promote / defer / reject
- Reason: (1 sentence)
- Axis tag judgment: retain current tags / add tag ({additional tag}) / modify tag
- If a contradiction item: whether to replace the existing global entry or defer
```

### 4. Consensus Judgment

Aggregates the 3 reviewers' results:

| Consensus | Action |
|---|---|
| 3/3 promote | Automatic promotion candidate |
| 2/3 promote | Promotion candidate (minority opinion attached) |
| 2/3 or more defer | Defer |
| 2/3 or more reject | Reject |

**Contradiction items**: Regardless of consensus, always require user confirmation.

### 5. User Approval

Presents the judgment results to the user:

```markdown
## Learning Promotion Review Result

### Domains: {domains derived from learning tags}
### Target Agents: {agent-id list}

---

### Recommended for Promotion (N items)
| # | Agent | Learning Content | Consensus | Axis Tags | Notes |
|---|---|---|---|---|---|
| 1 | {agent} | {content summary} | 3/3 | [methodology] [domain/SE] | |
| 2 | {agent} | {content summary} | 2/3 | [domain/SE] | Minority opinion: {reason} |

### Contradiction — User Judgment Required (N items)
| # | Agent | Project Learning | Existing Global | Panel Recommendation |
|---|---|---|---|---|
| 1 | {agent} | {project entry} | {global entry} | {replace/defer} |

### Deferred (N items)
| # | Agent | Learning Content | Reason |
|---|---|---|---|

### Rejected (N items)
| # | Agent | Learning Content | Reason |
|---|---|---|---|

---

Please specify which items to promote. (e.g., "promote all", "promote 1,3", "replace contradiction #1")
```

### 6. Promotion Execution

Processes only user-approved items:

- **New promotion**: Appends the entry to `~/.onto/learnings/{agent-id}.md` (with axis tags).
  - Changes the source to `(source: promoted from {project name}, {original source}, {promotion date})`.
- **Contradiction replacement**: Replaces the existing global entry with the new entry.
  - Preserves the replaced entry as `<!-- replaced ({date}): {original content} -->` in a comment.
- **Project learning cleanup**: Tags promoted entries with `(-> promoted to global, {date})`. Does not delete them.

### 7. Domain Document Update Proposal

Automatically detects items among promoted domain learnings that match the following conditions.

**Selection rationale for the 3 update targets** (by agent-domain document coupling type):
- `concepts.md` (accumulable): terminology definitions are naturally extracted from learnings
- `competency_qs.md` (accumulable): competency questions are naturally extracted from learnings
- `domain_scope.md` (scope-defining): domain scope discoveries are extracted from learnings
- The remaining 4 types (`logic_rules.md`, `structure_spec.md`, `dependency_rules.md`, `extension_cases.md`) are rule-defining; automatic extraction from learnings risks baseline contamination, so manual management is recommended.

| Condition | Target Document | Judgment Criteria |
|---|---|---|
| Learnings about concept definitions, term mappings, synonyms/homonyms | `concepts.md` | When the learning is from `onto_semantics` and concerns term definitions/distinctions/mappings |
| Learnings about competency questions, query paths, usage scenarios | `competency_qs.md` | When the learning is from `onto_pragmatics` and is in the form "should be able to answer this question" |
| Learnings about domain scope, sub-areas, required concept categories | `domain_scope.md` | When the learning is from `onto_coverage` and concerns domain scope/sub-areas/reference standards |

If items are detected, proposes to the user:

```markdown
## Domain Document Update Proposal

Among promoted learnings, there are items that can be reflected in domain documents.

### concepts.md Update Candidates (N items)
| # | Learning Content | Reflection Form |
|---|---|---|
| 1 | {learning summary} | {add term / modify definition / add mapping} |

### competency_qs.md Update Candidates (N items)
| # | Learning Content | Reflection Form |
|---|---|---|
| 1 | {learning summary} | {add question / modify question / delete question} |

### domain_scope.md Update Candidates (N items)
| # | Learning Content | Reflection Form |
|---|---|---|
| 1 | {learning summary} | {add sub-area / modify scope / add standard} |

Please specify which items to reflect. (e.g., "concepts all", "domain_scope #1 only")
If the document does not yet exist, it will be created.
```

Upon user approval:
- If the document does not exist, creates `~/.onto/domains/{domain}/concepts.md` or `competency_qs.md`.
- If the document exists, adds to/modifies the existing content.
- If no items are detected, skips this step.

### 8. Judgment Learning Re-verification

If any agent has accumulated 10 or more `[judgment]`-type learnings, re-verifies the contextual validity of existing judgment learnings:

```markdown
## Judgment Learning Re-verification

{agent-id} has accumulated {N} judgment learnings. Re-verifying contextual validity.
Re-verification criteria: Is this judgment still valid in the current context?

| # | Judgment Learning | Source | Verdict |
|---|---|---|---|
| 1 | {learning content} | {source} | retain / delete / modify |
```

### 9. Completion Report

```markdown
## Promotion Complete

| Action | Count |
|---|---|
| Promoted (new) | N items |
| Promoted (replaced) | N items |
| Deferred | N items |
| Rejected | N items |
| Duplicate (pre-excluded) | N items |
| Document update | N items |
| Judgment learning deleted/modified | N items |

Global learning path: `~/.onto/learnings/`
```
