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

- `commands/review.md`는 주체자 옵션과 경로 선택만 담는 thin entrypoint다
- 이 문서는 Nested Spawn Coordinator 경로의 실행 절차를 정의한다
- 실행 중 사용하는 값은 이 문서의 prose가 아니라 `execution-plan.yaml`과 `binding.yaml`이 authority다

---

## 2. Deterministic State Enforcer

Runtime은 "deterministic contract executor" 역할을 유지한다. 상태 전이와 auto state의 연쇄 실행은 "사전에 고정된 규칙의 순차 실행"이지 "의미 판단"이 아니다.

"Bounded Orchestrator"라는 표현은 사용하지 않는다. 기존 권위 문서(`llm-native-development-guideline.md`, `productization-charter.md`)가 runtime에 대해 "orchestrator"를 명시적으로 거부하기 때문이다.

**범위**: review 프로세스 전용. `reconstruct`, `learn`, `govern` 확장은 별도 설계.

**Caller 신뢰 가정**: 단일 Claude caller를 전제한다.

### 2.1 Caller Orchestration Pattern (nested vs flat)

이 state machine은 **caller-neutral**이다. 주체자(Claude Code 세션)가 lens/synthesize dispatch를 수행하는 방식은 두 canonical 패턴 중 하나로 나뉘며, 두 패턴 모두 동일한 state machine을 사용한다:

**nested (canonical path: `agent_teams_claude`)**:
- 주체자가 `TeamCreate + TaskCreate`로 coordinator subagent 1개 spawn.
- coordinator subagent가 `onto coordinator start/next`를 호출하고 그 결과의 `agents[]`를 Agent tool로 lens subagent를 추가 nested spawn.
- 주체자 메인 context는 거의 사용되지 않음 (coordinator가 orchestration 담당).

**flat (canonical path: `subagent_claude`)**:
- 주체자가 TeamCreate 없이 자신이 직접 `onto coordinator start/next`를 호출하고 결과의 `agents[]`를 Agent tool로 lens subagent spawn.
- 주체자 메인 context가 orchestration(state machine 호출·결과 집계)에 일부 사용되나 lens reasoning은 여전히 독립 subagent context.
- TeamCreate 비가용 환경(기능 설정·권한 제약 등)의 canonical 대안.

**선택 책임**: TeamCreate 가용성은 onto child process가 introspect할 수 없으므로 **주체자의 판단**. 주체자는 TeamCreate 시도 후 실패 시 flat 패턴으로 전환할 수 있다. `onto review` auto-resolution이 emit하는 handoff JSON의 `orchestration_guidance.preferred` / `.fallback` 문구가 참고 지침.

Semantic reference: `authority/core-lexicon.yaml:LlmAgentSpawnRealization` (instances `agent_teams_claude`, `subagent_claude`).

### 2.2 Topology-Driven Orchestration (sketch v3, 2026-04-18)

Principal 이 `.onto/config.yml` 의 `execution_topology_priority: [...]` 를 설정한 경우 handoff JSON 에 `topology` descriptor 필드가 포함된다 (PR #105 이후). Payload 예:

```json
{
  "handoff": "coordinator-start",
  "preferred_realization": "agent-teams",
  "topology": {
    "id": "cc-teams-agent-subagent",
    "teamlead_location": "claude-teamcreate",
    "lens_spawn_mechanism": "claude-agent-tool",
    "max_concurrent_lenses": 10,
    "transport_rank": "S2",
    "deliberation_channel": "synthesizer-only"
  },
  "next_action": {
    "orchestration_guidance": {
      "preferred": "...",
      "fallback": "...",
      "topology_note": "principal 이 topology=... 를 canonical 로 따르세요"
    }
  }
}
```

**`topology` 필드가 존재하면 이것이 canonical.** `preferred_realization` / `fallback` 힌트 대신 `topology.id` 에 따라 아래 mapping 을 따른다:

| topology.id | Coordinator orchestration 지침 |
|---|---|
| `cc-main-agent-subagent` | flat (`subagent_claude`): 주체자 메인 세션이 직접 `onto coordinator start/next` 호출 → 결과의 `agents[]` 를 Agent tool 로 lens subagent spawn. TeamCreate 미사용. |
| `cc-teams-agent-subagent` | nested (`agent_teams_claude`): 주체자가 `TeamCreate + TaskCreate` 로 coordinator subagent 1 개 spawn → coordinator 가 Agent tool 로 lens subagent nested spawn. |
| `cc-main-codex-subprocess` | 주체자 메인이 `onto coordinator start/next` 로 state machine 구동. Lens dispatch 는 Agent tool 아니라 **onto 가 spawn 하는 codex CLI subprocess** (coordinator-state-machine 의 executor_realization=codex 경로). |
| `cc-teams-codex-subprocess` | 주체자가 TeamCreate 로 coordinator spawn. Coordinator 는 Agent tool 대신 codex CLI subprocess 를 lens 당 1 회 spawn. Teamlead 는 Claude agent, lens 실행은 codex. |
| `cc-teams-litellm-sessions` | 주체자가 TeamCreate 로 coordinator spawn. Coordinator 가 lens 당 1 회 LiteLLM HTTP 세션 (inline-http executor). `llm_base_url` 필요. |
| `cc-teams-lens-agent-deliberation` | **유일한 lens 간 deliberation 옵션**. Lens 를 TeamCreate MEMBER (persistent) 로 spawn 후 SendMessage A2A round 1 (+2) 수행. 상세: §16. |
| `codex-main-subprocess` | Codex CLI host 세션 내부. onto TS 가 teamlead, lens 는 codex CLI subprocess. Claude TeamCreate 미사용. |
| `codex-nested-subprocess` | Host 무관. onto TS 가 outer `codex exec` 1 개 spawn → outer 가 shell 로 nested `codex exec` 을 lens 당 spawn. **이 경로는 TS runtime (`executeReviewViaCodexNested` bridge, PR #106) 가 처리** — coordinator state machine 관여 없음. |
| `generic-nested-subagent` / `generic-main-subagent` | Host adapter 미구현. 현재 도달 시 지원되지 않음 경고. |

**Fallback**: handoff payload 에 `topology` 필드가 없으면 §2.1 의 `preferred_realization` 해석으로 회귀 (sketch v3 opt-in 하지 않은 주체자).

Semantic reference: `docs/topology-migration-guide.md` + `development-records/evolve/20260418-execution-topology-priority-sketch.md` §3.

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

lens와 synthesize 모두 동일 템플릿 사용. 출처: `src/core-runtime/cli/coordinator-state-machine.ts` (AGENT_PROMPT_TEMPLATE).

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

현재 coordinator state machine 은 deliberation 을 자동 실행하지 않는다 (state 존재, trigger 미구현). 향후:
- `awaiting_synthesize_dispatch`에서 `next` 호출 후 `completing` 진입 시 synthesis output의 `deliberation_status` 확인
- `awaiting_deliberation`으로 분기 (간선 #9)

**Topology `cc-teams-lens-agent-deliberation` (sketch v3 option 1-0)** 이 선택된 경우 coordinator 는 §16 프로토콜을 수동 실행하거나, state machine 이 자동 실행하도록 후속 PR 에서 확장. 현재 PR-D (src/core-runtime/cli/teamcreate-lens-deliberation-executor.ts) 는 prompt template + artifact schema 를 완비 — coordinator 가 SendMessage 로 직접 호출 가능.

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
| `awaiting_deliberation` (1-0 only, §16) | round1/*.md, deliberation/round1/*.md | deliberation/round1/*.md, deliberation/round2/*.md |
| `completing` | execution-plan.yaml, synthesis.md, deliberation/**/* (있을 시) | execution-result.yaml, final-output.md, review-record.yaml |

---

## 16. Deliberation Protocol (topology cc-teams-lens-agent-deliberation)

### 16.1 진입 조건 (3 중 opt-in)

이 프로토콜은 **topology `cc-teams-lens-agent-deliberation`** 이 선택된 경우에만 실행된다. 3 조건 AND:

1. `CLAUDECODE=1` (Claude Code 세션)
2. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (~/.claude*/settings.json env)
3. `.onto/config.yml` 의 `lens_agent_teams_mode: true`

Resolver (`src/core-runtime/review/execution-topology-resolver.ts`) 가 세 조건 모두 검증 후에만 이 topology 를 채택. PR-D 의 `requireDeliberationOptIn` (`src/core-runtime/cli/teamcreate-lens-deliberation-executor.ts`) 가 defence-in-depth 로 재검증.

### 16.2 Lens agent lifecycle 차이점

다른 모든 topology 에서는 lens 실행 후 agent 가 종료되어 synthesizer 단계에서만 교차. 1-0 은:

- Lens agent 를 **TeamCreate MEMBER (persistent)** 로 spawn. Agent tool 아님.
- Lens 가 primary output 작성 후에도 **종료 금지** — deliberation round 를 위해 살아있어야 함.

### 16.3 Round 1 (재평가)

`awaiting_synthesize_dispatch` → `awaiting_deliberation` 전이 후 각 lens agent 에게 순차 또는 병렬로 SendMessage:

1. Prompt 생성: `buildDeliberationRound1Prompt({ own_lens_id, own_output_summary, other_lens_outputs })` (PR-D helper)
2. Prompt 는 다른 lens 들의 primary output 전체를 embed + 재평가 요청
3. Required response sections: `## 재평가 요약`, `## 동의/강화 지점`, `## 충돌/수정 지점`, `## 추가 발견`
4. Lens 응답을 `{session_root}/deliberation/round1/<lens_id>-deliberation.md` 에 기록
5. 모든 lens round 1 완료 후 round 2 진행 여부 결정

### 16.4 Round 2 (수렴 + 이견 명시, 선택)

Round 2 는 선택적 — config 에 `deliberation_rounds: 2` 같은 설정이 있거나 coordinator 가 이견 surfacing 이 필요하다고 판단한 경우. Disagreement 가 crypt 되는 것보다 명시되는 것이 synthesizer 에 낫다.

1. 모든 round 1 artifact 읽기
2. 각 lens 에게 SendMessage + `buildDeliberationRound2Prompt({ own_lens_id, round1_responses })`
3. Round 2 prompt 는 모든 round 1 응답 전체 embed + 수렴·이견·최종 입장 요청
4. Required sections: `## 수렴 요약`, `## 지속적 이견` (bullet `- **이견 항목**: ...`), `## 최종 입장`
5. 응답을 `{session_root}/deliberation/round2/<lens_id>-deliberation.md` 기록

### 16.5 Synthesizer 단계 반영

Deliberation 완료 후 `completing` auto state 에서 synthesizer 가 소비할 artifact:

- Lens primary outputs (`round1/<lens>.md`)
- Deliberation round 1 artifacts (`deliberation/round1/<lens>-deliberation.md`)
- Deliberation round 2 artifacts (있으면)
- `extractDisagreements(round2_artifacts)` (PR-D helper) 가 surface 한 persistent disagreements 는 synthesis 본문에 **숨기지 말고 명시** — 표상이 소거보다 낫다는 sketch v3 §3.1 의 epistemic independence axiom.

### 16.6 현재 runtime 지원 상태

- **TypeScript state machine**: `awaiting_deliberation` state 는 존재하지만 trigger 조건 + 완료 경로가 **미구현** (coordinator-state-machine.ts:510 `throw "not yet implemented"`). 자동 실행 wiring 은 후속 PR.
- **Prompt 도구**: PR-D 가 prompt template + artifact schema + 3 중 opt-in guard + disagreement 추출을 완비. Coordinator 가 state machine 지원을 기다리지 않고도 **수동으로** SendMessage 호출 + artifact 작성 가능.

### 16.7 Reference

- PR #102 (PR-D): `src/core-runtime/cli/teamcreate-lens-deliberation-executor.ts`
- PR #102 tests: `src/core-runtime/cli/teamcreate-lens-deliberation-executor.test.ts`
- Sketch v3 §3.1 option 1-0, §6.4 triple opt-in 근거
