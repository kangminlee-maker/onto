# Review Nested Spawn Coordinator Contract

> 상태: Active
> 목적: Claude Code 세션에서 Deterministic State Enforcer를 사용한 review 실행 계약을 정의한다.
> authority: `processes/review/productized-live-path.md`의 하위 실행 계약
> 기준 문서:
> - `processes/review/productized-live-path.md`
> - `processes/review/prompt-execution-runner-contract.md`
> - `processes/review/execution-preparation-artifacts.md`
> - `src/core-runtime/review/artifact-types.ts`
> - `.onto/temp/coordinator-state-machine-v3.md` (설계 v3)

---

## 1. Position

이 문서는 `commands/review.md`가 가리키는 실행 계약 중 하나다.

- `commands/review.md`는 사용자 옵션과 경로 선택만 담는 thin entrypoint다
- 이 문서는 Nested Spawn Coordinator 경로의 실행 절차를 정의한다
- 실행 중 사용하는 값은 이 문서의 prose가 아니라 `execution-plan.yaml`과 `binding.yaml`이 authority다

---

## 2. Deterministic State Enforcer

Runtime은 "deterministic contract executor" 역할을 유지한다. 상태 전이와 auto state의 연쇄 실행은 "사전에 고정된 규칙의 순차 실행"이지 "의미 판단"이 아니다.

"Bounded Orchestrator"라는 표현은 사용하지 않는다. 기존 권위 문서(`llm-native-development-guideline.md`, `productization-charter.md`)가 runtime에 대해 "orchestrator"를 명시적으로 거부하기 때문이다.

**범위**: review 프로세스 전용. `build`, `learn`, `govern` 확장은 별도 설계.

**Caller 신뢰 가정**: 단일 Claude caller를 전제한다.

---

## 3. State Machine

### 3.1 State 정의

| State | 종류 | 목적 |
|---|---|---|
| `preparing` | auto | 세션 준비 (artifacts, prompt packets, error-log 초기화) |
| `awaiting_lens_dispatch` | await | caller에게 lens Agent dispatch 지시. 병렬 dispatch |
| `validating_lenses` | auto | lens output 검증 + synthesize packet enrichment |
| `awaiting_synthesize_dispatch` | await | caller에게 synthesize Agent dispatch 지시 |
| `awaiting_deliberation` | await | (조건부, 미구현) deliberation Agent dispatch 지시 |
| `completing` | auto | execution-result 작성 + complete-session |
| `completed` | terminal | 정상 종료 |
| `halted_partial` | terminal | lens 부족으로 중단 |
| `failed` | terminal | runtime 에러로 중단 |

### 3.2 전이 그래프

정상 경로:
```
(init) → preparing → awaiting_lens_dispatch → validating_lenses
  → awaiting_synthesize_dispatch → completing → completed
```

완전한 간선 목록 (유일한 전이 authority):

| # | From | To | 조건 |
|---|---|---|---|
| 1 | (init) | `preparing` | `start` 호출 |
| 2 | `preparing` | `awaiting_lens_dispatch` | 성공 |
| 3 | `preparing` | `failed` | runtime 에러 |
| 4 | `awaiting_lens_dispatch` | `validating_lenses` | `next` 호출 |
| 5 | `validating_lenses` | `awaiting_synthesize_dispatch` | participating ≥ minimum |
| 6 | `validating_lenses` | `halted_partial` | participating < minimum |
| 7 | `validating_lenses` | `failed` | runtime 에러 |
| 8 | `awaiting_synthesize_dispatch` | `completing` | `next` 호출 |
| 9 | `awaiting_synthesize_dispatch` | `awaiting_deliberation` | deliberation_required (미구현) |
| 10 | `awaiting_deliberation` | `completing` | `next` 호출 (미구현) |
| 11 | `completing` | `completed` | 성공 |
| 12 | `completing` | `failed` | synthesis output 부재 또는 runtime 에러 |

Machine-readable 허용 전이 맵: `artifact-types.ts`의 `ALLOWED_TRANSITIONS`.

---

## 4. CLI Interface

### `onto coordinator start`

```
onto coordinator start <target> <intent> [@domain] [options]
```

Runs `preparing` auto state → returns `CoordinatorStartResult` with lens agent instructions.

### `onto coordinator next`

```
onto coordinator next --session-root <session_root> [--project-root <path>]
```

| 현재 state | 동작 | 가능한 출력 state |
|---|---|---|
| `awaiting_lens_dispatch` | `validating_lenses` auto 실행 | `awaiting_synthesize_dispatch`, `halted_partial`, `failed` |
| `awaiting_synthesize_dispatch` | `completing` auto 실행 | `completed`, `failed` |
| `awaiting_deliberation` | `completing` auto 실행 (미구현) | `completed`, `failed` |
| terminal states | 에러 반환 | — ("session already terminated") |

### `onto coordinator status`

```
onto coordinator status --session-root <session_root>
```

Returns the coordinator state file as JSON.

---

## 5. Execution Flow (caller perspective)

### Step 1: Start

```bash
onto coordinator start <target> <intent> [@domain] [options]
```

Returns JSON with `state: "awaiting_lens_dispatch"`, `session_root`, `agents[]`.

### Step 2: Lens Dispatch

Caller reads `agents[]` from Step 1 output. Each agent has `lens_id`, `prompt`, `output_path`, `packet_path`.

Caller dispatches all lens agents in parallel (Agent tool, single message).

### Step 3: Validate + Get Synthesize Instruction

```bash
onto coordinator next --session-root <session_root>
```

Returns `state: "awaiting_synthesize_dispatch"` with `agent` (synthesize instruction) — or `halted_partial` / `failed`.

### Step 4: Synthesize Dispatch

Caller dispatches single synthesize agent using the `agent` from Step 3.

### Step 5: Complete

```bash
onto coordinator next --session-root <session_root>
```

Returns `state: "completed"` with `final_output_path`, `review_record_path`, `record_status`.

### Step 6: Presentation

Caller reads `final_output_path` and presents to user. State machine responsibility ends at `completed`.

---

## 6. State File

`{session_root}/coordinator-state.yaml`:

```yaml
schema_version: "1"
current_state: awaiting_lens_dispatch
session_root: /absolute/path
request_text: "리뷰 의도"
started_at: 2026-04-06T10:00:00.000Z
halt_reason: null
error_message: null
transitions:
  - from: "(init)"
    to: preparing
    at: 2026-04-06T10:00:00.000Z
  - from: preparing
    to: awaiting_lens_dispatch
    at: 2026-04-06T10:00:01.000Z
```

**State file 생성 시점**: `start` 호출 시 `preparing` auto state 완료 후 생성.

**State 전이 기록 시점**: auto state 완료 후에 기록. 크래시 시 state file은 이전 await state를 가리킨다.

---

## 7. Auto State 내부 순서

### `preparing` (auto)

1. `runReviewInvokeCli(enrichedArgv)` with `--prepare-only`
2. `runInitCoordinatorLog(argv)` — error-log 초기화
3. 성공 → `awaiting_lens_dispatch`로 전이 기록

### `validating_lenses` (auto)

1. 각 lens의 output_path 존재 + 비공 확인 (participating / degraded 분류)
2. participating < minimum → error-log 기록 → `halted_partial`로 전이 기록, 종료
3. participating ≥ minimum → `coordinator-build-synthesize-packet` 실행 (enrichment)
4. 성공 → `awaiting_synthesize_dispatch`로 전이 기록

### `completing` (auto)

1. synthesis output 존재 확인. 부재 시 → `failed`
2. (deliberation 확인 — 미구현)
3. `runWriteExecutionResult(argv)` — execution-result.yaml 작성
4. `runCompleteReviewSessionCli(argv)` — final-output.md + review-record.yaml
5. 성공 → `completed`로 전이 기록

---

## 8. Agent Prompt Template

lens와 synthesize 모두 동일 템플릿 사용. 출처: `agent-teams-review-unit-executor.ts:55-84`.

```
You are a single bounded review unit executing as an Agent Teams-style ContextIsolatedReasoningUnit.

Unit id: {unit_id}
Unit kind: {unit_kind}
Authoritative prompt packet path: {packet_path}
Canonical output path: {output_path}

Rules:
- Read the prompt packet file at {packet_path}. Treat it as the authoritative contract.
- Treat the Boundary Policy and Effective Boundary State in the packet as hard constraints.
- Read the files referenced by the prompt packet when needed.
- Stay within the smallest sufficient file set implied by the packet.
- Do not recursively follow reference chains beyond the files explicitly listed in the packet unless the packet requires it.
- Do not use web research when the packet says web research is denied.
- Do not read outside the allowed filesystem scope described in the packet.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files yourself.
- Do not change the required output structure from the packet.
- Preserve disagreement and uncertainty explicitly when present.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly as insufficient access or insufficient evidence within boundary instead of broadening the search.

Read the prompt packet, execute the review, then write the complete output to {output_path} using the Write tool.
```

---

## 9. Error-Log Format

TS runner의 `appendMarkdownLogEntry` 포맷과 동일:

```markdown
## {ISO timestamp} | {title}
{body}
```

---

## 10. Execution Status Derivation

`deriveExecutionStatus`와 동일:

1. `synthesis_executed`가 `false` → `halted_partial`
2. `degraded_lens_ids`가 비어있지 않음 → `completed_with_degradation`
3. 그 외 → `completed`

---

## 11. Resumability

**State 전이 기록 시점이 auto 완료 후**이므로:
- auto state 중 크래시 → state file은 이전 await state → `next` 재호출 시 auto 재실행
- await state 중 세션 끊김 → state file은 현재 await state → caller가 Agent 재dispatch 후 `next`

Auto state 재실행 시 기존 파일을 덮어쓴다 (overwrite-safe).

---

## 12. Deliberation Slot

현재 coordinator는 deliberation을 실행하지 않는다. 향후:
- `awaiting_synthesize_dispatch`에서 `next` 호출 후 `completing` 진입 시 synthesis output의 `deliberation_status` 확인
- `awaiting_deliberation`으로 분기 (간선 #9)

---

## 13. Boundary Model

coordinator는 `execution-plan.yaml`의 `effective_boundary_state`를 읽고, error-log에 전사한다. boundary를 설정하지 않는다.

---

## 14. Internal Call Method

auto state 내부에서 기존 함수를 TypeScript import로 호출한다:

```typescript
import { runReviewInvokeCli } from "./review-invoke.js";
import { runInitCoordinatorLog, runBuildSynthesizeRuntimePacket, runWriteExecutionResult } from "./coordinator-helpers.js";
import { runCompleteReviewSessionCli } from "./complete-review-session.js";
```

---

## 15. Artifact Dependencies

| State | 읽는 artifact | 쓰는 artifact |
|---|---|---|
| `preparing` | — | session artifacts, error-log.md, coordinator-state.yaml |
| `awaiting_lens_dispatch` | prompt-packets/*.prompt.md | round1/*.md |
| `validating_lenses` | round1/*.md, execution-plan.yaml | synthesize.runtime.prompt.md, error-log.md |
| `awaiting_synthesize_dispatch` | synthesize.runtime.prompt.md | synthesis.md |
| `completing` | execution-plan.yaml, synthesis.md | execution-result.yaml, final-output.md, review-record.yaml |
