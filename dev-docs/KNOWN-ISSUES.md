# onto -- Known Issues

## Issue 1-A: Partial Inbox Message Recognition Failure Due to Team-Lead LLM Context Saturation (2026-03-25)

### Status: Resolved, implemented

### Observed Symptoms

In an 8-agent panel review, the team lead recognized reviews from only 3 out of 7 agents.

| Agent | Review report received | Idle notification received | Notes |
|---------|:---:|:---:|------|
| onto_logic | X | O | Transitioned to idle but report not received |
| onto_semantics | X | X | Idle notification also not received |
| onto_structure | **O** | O | Normal |
| onto_dependency | X | O | Transitioned to idle but report not received |
| onto_pragmatics | **O** | O | Normal |
| onto_evolution | X | X | Idle notification also not received |
| onto_coverage | **O** | O | Normal |

Even after resend requests (SendMessage), results from the 4 unrecognized agents were not received.

### Root Cause (verified via inbox data)

**Transport layer is normal. Team-lead LLM context saturation is the cause.**

Verified facts:
- All 7 agents' reviews arrived in team-lead inbox (5,031-9,456 chars/agent)
- All messages `read=True` (transport layer success)
- Resent results from 4 agents also present in inbox, also `read=True`
- Team-lead inbox total message size: ~64,517 chars (7 agents' originals + idle notifications + resends)
- Only 3 agents' results forwarded to Philosopher; 18,072 chars of original text summarized to 3,997 chars (violating "relay original text as-is" rule)

**Causal path**: Team-lead's existing context (process.md + review.md + agent definitions + review target) plus ~64,517 chars flooding the inbox -> LLM recognizes only some messages -> only 3 agents' results forwarded to Philosopher -> even originals get summarized (insufficient context)

### Resolution

#### File-Based Context Externalization

Maintains the existing Agent Teams -> fallback -> Subagent flow while changing review text relay to file-based. No MCP server needed -- uses only built-in Write/Read tools.

Data flow change:
```
[Current]  Reviewer -> SendMessage(original) -> loaded into team-lead context -> SendMessage(original) -> Philosopher
[Changed]  Reviewer -> Write(file) -> report only path to team-lead -> Philosopher -> Read x 7(files)
```

Session directory: `{project}/.onto/review/{YYYYMMDD}-{hash8}/round1/{agent-id}.md`
- Session ID (`{YYYYMMDD}-{hash8}`) is the same as team_name (generated once at team creation, no collisions)
- Team lead creates the session directory and includes the path in each reviewer's initial prompt

Context separation effect:
- Team lead: ~64,517 chars -> ~500 chars (path strings only)
- "Relay original text as-is" rule is structurally guaranteed (preserved in files, no intermediate relay)
- Philosopher reads all 7 agents' originals directly in its own context (intended loading)

Write failure fallback:
- If a reviewer's Write fails, falls back to SendMessage for original text relay (current method)
- Team lead performs proxy Write or delivers mixed content to Philosopher

### Current Mitigation (process.md:93 graceful degradation)

- Proceeds with received results, excluding unrecognized agents
- Adjusts the consensus denominator (e.g., 3/8 -> 3/3)
- If Philosopher is unresponsive, team lead performs synthesis directly

---

## Issue 1-B: Inter-Session Agent Leakage Due to Fixed team_name (2026-03-25)

### Status: Resolved, implemented

### Observed Symptoms

#### Symptom 1: `-2` Instance Leakage Across Sessions

After shutting down the original team (8 agents), `-2` suffixed instances created in another session began sending messages to the current session's team lead:

- `onto_logic-2`, `onto_semantics-2`, `onto_structure-2`, `onto_dependency-2`, `onto_pragmatics-2`, `onto_evolution-2`, `onto_coverage-2`
- These were reviewing **a different topic than the original review target** -- confirmed as agents from another session
- config.json verification: team-lead's `cwd=/Users/kangmin/cowork/sprint-kit`, -2 agents' `cwd=/Users/kangmin/cowork/onto` -- different sessions
- TeamDelete failed due to `-2` instances (7 active members). Separate shutdown required.

#### Symptom 2: Team Residue in Another Project's Session

When resuming the sprint-kit session, system-reminder from a panel review executed in the onto session appeared in the sprint-kit session.

### Root Cause

- `team_name` was fixed to `onto` (process.md:101)
- `~/.claude/teams/onto/config.json` is shared on the filesystem
- Multiple teams with the same `team_name` can coexist across sessions
- Agents created in other sessions send messages to the same team_name's inbox

### Resolution

1. **Session ID-based team_name**: Format `onto-{YYYYMMDD}-{hash8}` generates a unique team_name per session (collision-proof, traceable like git commits)
2. **Check for existing teams before TeamCreate**: Check for existing teams matching `~/.claude/teams/onto-*` pattern. Notify user if found.
3. **Maintain concurrent multi-session execution prohibition**: If onto is running in one session, it should not be executed in another session (isolated by timestamps, but previous team residue possible on same-session re-execution)

### Affected Locations

- process.md:101 -- team_name rule change
- review.md:41 -- Remove team_name hardcoding
- process.md:114~116 -- Add timestamp pattern matching to orphan team cleanup rules

---

## Issue 1 Reference: Analysis Content from -2 Agents

The -2 instances analyzed the message loss problem instead of the original review target. Key findings:

- **onto_semantics-2**: The diagnosis name "routing issue" is inaccurate -- routing (transport) succeeded; the failure is at the LLM recognition stage. Proposed 5-stage message lifecycle: submission -> polling -> injection -> recognition -> utilization
- **onto_logic-2**: The context window saturation hypothesis can simultaneously explain both message loss and summarized relay. Repeated failure after resend is evidence of a structural limitation
- **onto_coverage-2**: Total of ~45,635 chars from 7 agents' reviews + 14 idle notifications. Combined with team lead's existing context, saturation is plausible. Could be more severe in the build process (iteration loop)
- **onto_evolution-2**: The "relay original text as-is" rule itself is a failure cause that scales with volume. Need to explicitly list the infrastructure behaviors that the process implicitly assumes

---

## Issue 1 Verification History

### 2026-03-25: Root Cause Verification Based on Inbox Data

The original KNOWN-ISSUES described Issues 1-A and 1-B as a single issue ("team message loss + inter-session leakage") and analyzed the root cause as "inter-session routing issue due to shared team_name."

Inbox data (`~/.claude/teams/onto/inboxes/team-lead.json`) verification results:
- **Issue 1-A's cause is LLM context saturation, not inter-session leakage** (occurred within a single session)
- **Issue 1-B's cause is shared team_name**, confirming the original analysis

The two problems have different causes and different solutions, so they were separated into distinct issues (1-A, 1-B).

### 2026-03-25: 8-Agent Panel Review of Resolution Design (Subagent Mode)

An 8-agent panel review was conducted on the design proposal (MCP externalization + control/data plane separation).

Key review results:
- Degradation system incomplete (7/7 consensus) -> needs restructuring into 2x2 matrix
- Synchronization protocol absent (4/7 consensus) -> must decompose SendMessage into 3 functions and replace
- Partial failure paths undefined (5/7 consensus)
- Session isolation gaps (5/7 consensus)

PO decision:
- MCP externalization separated as **optional activation** (requires MCP Key configuration)
- Default mode retains existing Agent Teams -> fallback -> Subagent
- Design complexity managed by clearly defining branches and designing processes independently
