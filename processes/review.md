# Team Review Mode

> The agent panel (verification agents + Philosopher) reviews a target from multiple perspectives.
> Related: If learnings accumulate after review, promotion is possible via `processes/promote.md`.

Follows the **Agent Teams Execution** in `process.md`.

**Team composition**:
- **Team lead**: main context (structure coordinator)
- **Teammates**: verification agents + Philosopher

**Execution paths**:
- **Default** (consensus clear): 0→1→1.5→2→3→5→6
- **Extended** (contested points exist): 0→1→1.5→2→3→4→5→6

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

### 1.5 Complexity Assessment (performed by team lead)

Step 1에서 수집한 리뷰 대상을 분석하여 복잡도를 평가한다.
3개 질문에 모두 "경량 가능"으로 답해야 경량 리뷰를 제안한다.
하나라도 아니면 전원 리뷰로 진행한다.

**Q1: 관련 검증 차원이 4개 이하 `(= ⌊검증 차원 수 / 2⌋)` 인가?**
리뷰 대상이 8개 검증 차원(논리, 구조, 의존, 의미, 실용, 진화, 커버리지, 간결성) 중
몇 개와 관련되는지 평가.
→ 4개 이하: 경량 가능 / 5개 이상: 전원 필요

**Q2: 에이전트 간 교차 검증이 부차적인가?**
교차 검증이 핵심인 경우: 시스템 전체 설계 변경, 다중 파일 수정, 새 개념 도입
교차 검증이 부차적인 경우: 단일 관점 판단, 기존 설계 내 수정, 문서 정확성 확인
→ 부차적: 경량 가능 / 핵심: 전원 필요

**Q3: 놓칠 수 있는 발견의 위험도가 수용 가능한가?**
위험도 높음: 구현 직전 최종 검증, 안전장치 설계, 기존 사용자 영향 변경
위험도 낮음: 탐색적 질문, 초기 방향, 내부 문서, 이미 리뷰 거친 후속 확인
→ 수용 가능: 경량 가능 / 수용 불가: 전원 필요

**경량 가능 판단 시:**
사용자에게 사유와 함께 선택지를 제시한다.

```
## Review Complexity Assessment

**대상**: {리뷰 대상 요약}
**판단**: 경량 리뷰 가능
**사유**:
- Q1: {관련 차원과 수}
- Q2: {교차 검증이 부차적인 근거}
- Q3: {놓칠 위험이 수용 가능한 근거}

**권장 구성** ({N}명):
  [a] {agent-id} — {이 대상에서 필요한 이유}
  [b] {agent-id} — {이유}
  [c] {agent-id} — {이유}
  [d] philosopher — 목적 정합 검증 (항상 포함)

**전원 리뷰와의 차이**:
  제외되는 관점: {제외 에이전트 목록}
  놓칠 수 있는 것: {구체적 설명}

[a] 경량 리뷰 ({N}명, ~{토큰}k 토큰)
[b] 전원 리뷰 (9명, ~550k 토큰)

Select [a]:
```

**전원 필요 판단 시:**
별도 안내 없이 기존 프로세스대로 9명 스폰.
리뷰 시작 시 "9명 전원 리뷰로 진행합니다"를 표시.

**에이전트 선택 규칙:**

1. **philosopher**: 항상 포함
2. **나머지 2-3명**: 리뷰 대상의 성격에 따라 팀 리드가 선택

참고 테이블 (팀 리드 판단 보조):
| 대상 성격 | 권장 3명 |
|-----------|---------|
| 설계 결정/프로세스 | logic + pragmatics + evolution |
| 용어/명명/정의 | semantics + logic + pragmatics |
| 구조/파일 분리 | structure + dependency + conciseness |
| 도메인 커버리지 | coverage + semantics + pragmatics |
| 코드/구현 | logic + structure + evolution |

사용자에게는 선택한 에이전트와 그 이유를 함께 제시한다.

---

### 2. Team Creation + Round 1 — Verification Agent Independent Review

**Step 1 — Session ID generation**: `$(date +%Y%m%d)-$(openssl rand -hex 4)` (e.g., `20260325-a3f7b2c1`)

**Step 2 — Session directory creation**: `{project}/.onto/review/{session ID}/round1/`

**Step 3 — Team creation via TeamCreate**:
- team_name: `onto-{session ID}`
- description: `Agent Panel Review: {review target summary}`

**Step 4 — Create all teammates**: After TeamCreate, create all teammates **simultaneously in a single message** via Agent tool. The initial prompt combines identity + self-loading + task directives, so **Round 1 begins immediately upon creation**.
- **경량 모드 (light)**: Step 1.5에서 선택된 2-3명의 검증 에이전트 + philosopher만 생성한다.
- **전원 모드 (full) 또는 Complexity Assessment 미수행**: 기존 동작 — 8명 검증 에이전트 + philosopher 전원 생성.
- Each teammate's `name`: agent-id (e.g., `onto_logic`, `philosopher`)
- Each teammate's `team_name`: team_name created in Step 3
- Initial prompt: use the **Teammate Initial Prompt Template** from `process.md` (including session path)
- 세션 메타데이터에 `review_mode: light | full` 기록

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

#### Error Recovery (Round 1)

> process.md Error Handling Rules의 Retry Protocol을 적용한다.

Round 1에서 에이전트 에러 발생 시:

1. **감지**: 다른 에이전트가 전원 응답을 완료한 시점에 아직 응답하지 않은 에이전트,
   또는 에러를 보고한 에이전트를 감지한다.

2. **재시도**: 해당 에이전트에 SendMessage로 재실행을 요청한다.
   메시지에 원래 Task Directives + 파일 경로를 포함한다.

3. **종료 조건**: 2회 재시도 후에도 실패하면 graceful degradation 적용.
   해당 에이전트를 제외하고 합의 분모를 조정.
   Philosopher 전달 시: "※ {agent-id}: 에러로 제외됨" 명시.

4. **로깅**: {session path}/error-log.md에 에러 이력 기록.
   (디버깅 참조용. 자동 소비 경로 없음.)

에러 제외 후 잔존 검증 에이전트가 2명 미만이면 process-halting. 사용자에게 전원 리뷰 전환 또는 중단을 제안한다.

---

### 3. Philosopher Synthesis + Adjudication

The team lead delivers the verification agents' review finding file paths to the Philosopher teammate via SendMessage. **Since the original text is preserved in the files, the team lead does not include the original text in the message.**

SendMessage content to deliver to the Philosopher:

```
Synthesize the verification agents' Round 1 review results and adjudicate from the perspective of system purpose.

[Verification Agents' Review Result Files]
Read the files at the paths below directly using the Read tool:
{참여 에이전트의 review result 파일 경로 목록}
※ 경량 모드에서는 참여하지 않은 에이전트의 파일을 포함하지 않는다.

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
※ 합의 분모는 실제 참여한 검증 에이전트 수 (고정값 8이 아님). 경량 모드 및 에러 제외를 반영.
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
경량 모드에서는 Philosopher에게 'deliberation not needed' 지시를 포함한다.

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
