# Learning Rules — Teammate Reference

> This file is self-loaded by teammates during review/query execution. Team lead operations are in `process.md`.

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

### User Approval Tiers (학습 수정 승인 계층)

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
