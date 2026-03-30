# Team Review Mode

> The agent panel (verification agents + Philosopher) reviews a target from multiple perspectives.
> Related: If learnings accumulate after review, promotion is possible via `processes/promote.md`.

Follows the **Agent Teams Execution** in `process.md`.

**Team composition**:
- **Team lead**: main context (structure coordinator)
- **Teammates**: verification agents + Philosopher

**Execution paths**:
- **Default** (consensus clear): 0→1→2→3→5→6
- **Extended** (contested points exist): 0→1→2→3→4→5→6

---

### 0. Domain Selection

Determine `{session_domain}` per the "Domain Determination Rules" in `process.md`.

- If `@{domain}` is specified in the command: use non-interactive resolution
- If `@-` is specified: set `{session_domain}` to empty (no-domain mode)
- Otherwise: run the Domain Selection Flow (target analysis → collect available domains → derive suggestion → display UI → await user input)
- **Seed review detection**: If the review target path matches `drafts/{domain}`:
  - Default domain recommendation: `@-` (no-domain mode) unless user explicitly specifies otherwise
  - Reason: seed content is unverified, so applying domain-specific rules would use unverified content as standards

The resolved `{session_domain}` is used throughout this session for domain document loading, learning storage tags, and the verification context section of the final output.

---

### 1. Context Gathering (performed by team lead)

The team lead collects only the items below. Per-agent learnings/domain documents are self-loaded by the teammate.

1. **Review target collection**:
   - If file/directory: reads the relevant code.
   - If design/decision: reads the related documents.
   - If `drafts/{domain}` path: reads all 8 files from `~/.onto/drafts/{domain}/` as the review target (seed review mode). The seed domain's documents are the review target, not verification standards. Verification standards come from: (a) agent intrinsic methodology, (b) `@{other-domain}` if specified, (c) LLM pre-training knowledge.

2. **Project context collection**:
   - Identifies the system purpose and principles from CLAUDE.md, README.md, etc.

3. **Domain + path resolution**:
   - Uses `{session_domain}` determined in Step 0.
   - Identifies the plugin path. (Used for path variables in teammate initial prompt)

4. **Agent definition collection** (for all agents individually):
   - `~/.claude/plugins/onto/roles/{agent-id}.md` — ~14 lines per agent. The team lead reads and includes directly in the initial prompt.

---

### 2. Team Creation + Round 1 — Verification Agent Independent Review

**Step 1 — Session ID generation**: `$(date +%Y%m%d)-$(openssl rand -hex 4)` (e.g., `20260325-a3f7b2c1`)

**Step 2 — Session directory creation**: `{project}/.onto/review/{session ID}/round1/`

**Step 3 — Team creation via TeamCreate**:
- team_name: `onto-{session ID}`
- description: `Agent Panel Review: {review target summary}`

**Step 4 — Create all teammates**: After TeamCreate, create all teammates **simultaneously in a single message** via Agent tool. The initial prompt combines identity + self-loading + task directives, so **Round 1 begins immediately upon creation**.
- Each teammate's `name`: agent-id (e.g., `onto_logic`, `philosopher`)
- Each teammate's `team_name`: team_name created in Step 3
- Initial prompt: use the **Teammate Initial Prompt Template** from `process.md` (including session path)

**[Task Directives]** section to include in verification agents' initial prompt:

```
Begin Round 1 review.

[Structural Inspection Checklist]
Perform the following items first (only if applicable to the review target. Mark N/A if not applicable):
- [ ] Are there overlaps (ME violation) between classification items?
- [ ] Are there cases not covered by the classification criteria (CE violation)?
- [ ] Is each item's definition explicitly stated?
- [ ] Is the axis (criteria) used for classification explicitly stated?
- [ ] Are learning items tagged with type tags ([fact]/[judgment])? (Only for learning-related reviews)

[Review Target]
{review target content}

[System Purpose and Principles]
{CLAUDE.md/README.md content}

[Directives]
- After the structural inspection, perform content verification from your specialized perspective.
- Answer each core question specifically.
- If an issue is found: specify (1) what the issue is, (2) why it is an issue, and (3) how to fix it.
- If no issues are found, do not just state "no issues" — provide rationale for why it is correct.
- You do not know other agents' perspectives. Judge only from your own perspective.
- Reference past learnings, but ignore learnings that do not apply to the current review target.

[Report Format]
Include the following section at the end of the review finding:

### Newly Learned
For each learning, determine:
1. **Purpose type**: per learning-rules.md
   (guardrail / foundation / convention / insight)
2. **Impact severity**: high or normal (per criteria in learning-rules.md)
3. **Axis tags**: Apply 2+1 stage test per learning-rules.md

- Communication learning: (findings about user preferences/communication style)
- Learning: [{fact|judgment}] [{axis tags}] [{purpose type}] (content) [impact:{severity}]
  - Axis tags: `[methodology]` and/or `[domain/{session_domain}]`.
    Apply 2+1 stage test per learning-rules.md.
  - If {session_domain} is empty: `[methodology]` only, no `[domain/...]` tag
  - For guardrail type, use template:
    **Situation**: ... **Result**: ... **Corrective action**: ...
  - **Domain fact recording**: If a domain-specific fact (data format,
    industry rule, tool behavior, regulatory constraint, etc.)
    **influenced your review judgment** during this session,
    record it as a separate `[fact] [domain/{session_domain}]` learning entry.
Mark each as "none" if there is nothing to report.

### Applied Learnings
List learnings from your learning file that influenced your review judgment:
- Learning: {summary} (source: {source})
  - "이 학습이 없었다면 이번 리뷰에서 놓쳤을 발견이 있는가?" (yes/no)
- If a loaded learning was applied but found invalid/harmful during this review,
  attach event marker to the learning file:
  `<!-- applied-then-found-invalid: {date}, {session_id}, {reason} -->`
  (Event marker attachment is agent-autonomous — no approval needed.)
Mark "none" if no learnings were applied.
```

**[Task Directives]** section to include in the Philosopher's initial prompt:

```
The team lead will deliver results once the verification agents complete their Round 1 review. Wait until then.
```

**This is the only independent round.** In subsequent steps, other agents' perspectives are shared through Philosopher synthesis.

---

### 3. Philosopher Synthesis + Adjudication

The team lead delivers the verification agents' review finding file paths to the Philosopher teammate via SendMessage. **Since the original text is preserved in the files, the team lead does not include the original text in the message.**

SendMessage content to deliver to the Philosopher:

```
Synthesize the verification agents' Round 1 review results and adjudicate from the perspective of system purpose.

[Verification Agents' Review Result Files]
Read the files at the paths below directly using the Read tool:
{session path}/round1/onto_logic.md
{session path}/round1/onto_structure.md
{session path}/round1/onto_dependency.md
{session path}/round1/onto_semantics.md
{session path}/round1/onto_pragmatics.md
{session path}/round1/onto_evolution.md
{session path}/round1/onto_coverage.md
{session path}/round1/onto_conciseness.md

※ Results from agents whose Write failed are included directly below:
{Original text of Write-failed agents (only if applicable)}

[System Purpose and Principles]
{CLAUDE.md/README.md content}

[Directives]
Step 1 — Synthesis:

## Philosopher Synthesis

### Consensus Items
- (Judgments agreed upon by a majority of verification agents)

### Contradicting Opinions
- (Conflicting judgments + summary of each rationale)

### Overlooked Premises
- (Items not mentioned by any agent but requiring examination given the system purpose/principles)
- Refer to the "Verification Dimension Coverage Checklist" in process.md to confirm that no verification dimension has gone uncovered by any agent.

### New Perspectives
- (Perspectives derived from the system's purpose and philosophical principles that verification agents have not yet considered)

Step 3 — Unique Finding Tagging:
Classify each verification agent's findings as "unique finding / shared finding / cross-verified finding." Include in the "Unique Finding Tagging" section of the final output.

Step 4 — Adjudication:

### Judgment Conflict Resolution Rules

Judgment conflicts between verification agents are resolved by the following rules:

**General rule**: Judgment conflicts are used as error detection signals. If multiple agents render opposing judgments on the same target, mark it as a "high-probability error point" and the Philosopher adjudicates from the perspective of system purpose.

**Special rule — removal vs. retention conflict**: If onto_conciseness judges "removal needed" and another agent judges "retention needed":
1. The Philosopher compares both sides' rationale.
2. Adjudicates in light of the system's purpose (improving the quality of the review target).
3. Does not decide by simple majority — since the conciseness "removal" perspective is structurally in the minority, majority rule would always result in "retention," neutralizing the function of conciseness.

### Deliberation Necessity
If any of the following conditions are met, answer "needed":
- Do contradicting opinions exist?
- Were overlooked premises discovered?
- Do new perspectives require additional examination?

If none apply, answer "not needed" — in this case, write the final output directly:

---
session_id: {session ID}
process: review
target: "{review target summary}"
domain: {session_domain / none}
date: {YYYY-MM-DD}
---

## Agent Panel Review Result

### Review Target
{review target summary}

### Verification Context
- Domain: {session_domain / none (no-domain mode)}
- Domain rule documents: {N}/7 loaded {list of absent documents}
- (If session_domain is empty) "Verified using agent default methodology (no-domain mode). Domain-specific issues may be missed."
- (If domain documents are absent but session_domain is set) "Verified using general principles (no domain document). Creating domain documents via `/onto:onboard` will improve verification precision."

### Consensus (N/{participating agent count})
- (List of judgments with full consensus)

### Conditional Consensus
- (Majority consensus + minority reservations. Reservation reasons specified)

### Purpose Alignment Verification
- (Whether conclusions align with the system purpose, with rationale)

### Immediate Actions Required
- (Among consensus items, those that should be applied immediately)

### Recommendations
- (Among consensus items, those that can be applied later)

### Unique Finding Tagging
Classify each verification agent's findings into the 3 categories below. A "unique finding" is an issue that no other agent discovered, detectable only from that agent's verification dimension.

| Agent | Unique Finding | Shared Finding | Cross-Verified Finding |
|---------|----------|----------|----------|
| (Record the count and one representative case per agent) | | | |

- **Unique finding**: an issue discovered only by that agent (no other agent reported the same issue)
- **Shared finding**: an issue independently reported by 2 or more agents from their respective perspectives
- **Cross-verified finding**: a case where one agent's finding combines with another agent's finding to produce a new insight
```

**If the Philosopher judges "not needed"** → the final output has already been written. Proceed directly to Step 5.
**If the Philosopher judges "needed"** → proceed to Step 4 (deliberation).

---

### 4. Deliberation (Conditional)

Executed only if the Philosopher judges "deliberation needed."

In this step, **direct SendMessage between teammates is permitted**.
The team lead notifies the relevant agents (including the Philosopher) of deliberation commencement:

```
Deliberation begins.
Engage in direct deliberation with the relevant agents on the items below.

[Deliberation Items]
Items classified by type by the Philosopher:

**Contradicting opinions** (resolution method: direct exchange between opposing agents)
{applicable items. "None" if none}

**Overlooked premises** (resolution method: request additional verification from related agents)
{applicable items. "None" if none}

**New perspectives** (resolution method: request validity assessment from related agents)
{applicable items. "None" if none}

[Deliberation Participants]
{Agent list designated by the Philosopher}

[Deliberation Rules]
- Before starting deliberation, first confirm whether the definitions of key terms used in contested points are aligned among participating agents. Attempt definition alignment within 1 round-trip. If alignment is not reached, proceed with each agent stating their own definition. This round-trip does not count toward the 3-trip limit.
- Respond directly to the counterpart's arguments. Do not merely repeat your own position.
- If the counterpart's argument is valid, accept it.
- If a new alternative combining both sides' arguments is possible, propose it.
- If a derived contested point arises during deliberation that falls outside the original participants' areas of expertise, request the team lead to include the relevant specialist agent. If addition is not possible, record the contested point as an "unverified item."
- Round-trip definition: the team lead delivers the contested point and the relevant agents return their responses — this constitutes 1 round-trip. The team lead manages the round-trip count.
- If consensus is not reached after 3 round-trips, each party reports their final position to the team lead.
```

After deliberation concludes, the team lead delivers the results to the Philosopher to **write the final output**:

```
Write the final output reflecting the deliberation results.

[Deliberation Results]
{full deliberation results}

[Output Format]
---
session_id: {session ID}
process: review
target: "{review target summary}"
domain: {session_domain / none}
date: {YYYY-MM-DD}
---

## Agent Panel Review Result

### Review Target
### Verification Context
### Consensus (N/{participating agent count})
### Conditional Consensus
### Disagreement
Tag each disagreement item with a type:
- **[Factual discrepancy]** — verifiable via external reference (code, documents). PO action: gather additional information
- **[Criteria discrepancy]** — resolvable by applying a higher-level principle. PO action: confirm/decide on the higher-level principle
- **[Value discrepancy]** — no conditions for reaching consensus, unresolvable through repetition. PO action: make a direct value judgment
### Unverified
Items classified as outside the verification scope (e.g., cases where adding a specialist agent for derived contested points was not possible). PO action: request separate verification from a domain expert, or accept as tolerable risk.
### Purpose Alignment Verification
### Immediate Actions Required
### Recommendations
```

---

### 5. Final Output

The team lead delivers the Philosopher's final output to the user **without modification**.

---

### 6. Wrap-Up (Learning Storage + Team Shutdown)

1. **Learning storage**: Stores learnings from all members. Follows the "Learning Storage Rules" in `learning-rules.md`. If deliberation occurred, also includes learnings generated during the deliberation process. **Learning data collection must be completed before team shutdown.**
   - **Seed review learning tag**: When reviewing a seed domain (`drafts/{domain}`), learnings about the seed domain's content are tagged with `[domain/{seed-domain}]`. These learnings become input for the feedback loop (`/onto:feedback {domain}`).

2. **Promotion guidance** (conditional): Provide guidance only if new domain learnings were stored in this review:
   "Project domain learnings have accumulated to {N} entries. If promotion is needed, run `/onto:promote`."

3. **Team shutdown**: The team lead sends shutdown_request to all members via **individual SendMessage** (structured messages cannot use `to: "*"` broadcast). After all members have shut down, clean up the team via TeamDelete.
