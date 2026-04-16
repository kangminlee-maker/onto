# Review Productized Live Path

> 상태: Active
> 목적: `검토 (review)`의 `제품화된 실시간 경로 (productized live path)`를 canonical 실행 경로로 고정한다.
> 하위 실행 계약:
> - `processes/review/nested-spawn-coordinator-contract.md` — Claude Code 세션에서 Agent tool 기반 lens dispatch coordinator
>
> 기준 문서:
> - `processes/review/interpretation-contract.md`
> - `processes/review/binding-contract.md`
> - `processes/review/lens-prompt-contract.md`
> - `processes/review/synthesize-prompt-contract.md`
> - `processes/review/record-contract.md`
> - `processes/review/record-field-mapping.md`
> - `processes/review/execution-preparation-artifacts.md`
> - `processes/review/prompt-execution-runner-contract.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

이 문서는 `검토 (review)`의 현재 canonical live execution truth다.

즉:

- `legacy source path`는 source material이다
- 실제 productization target은 이 문서의 순서를 따른다

`processes/review/review.md`는 prompt-backed reference execution의 source와 절차를 담되,
live path authority는 이 문서가 가진다.

---

## 2. Canonical Live Path

```text
user request
-> 호출 해석 (InvocationInterpretation)
-> 주체자 확인 / 선택 확정
-> 호출 고정 (InvocationBinding)
-> execution preparation artifacts
-> 9개 lens 독립 실행
-> 종합 단계 (synthesize)
-> human-readable final output
-> 리뷰 기록 (ReviewRecord)
```

---

## 3. Step-by-Step

### 3.1 주체자 요청 수집

host가 아래를 받는다.

- 주체자 자연어 요청
- explicit target token
- explicit domain token
- explicit execution profile token
- 현재 repo / selected target context

### 3.2 호출 해석 (InvocationInterpretation)

`LLM`이 아래를 해석한다.

- entrypoint가 `review`인지
- `검토 대상 범위 (review_target_scope)` 후보가 무엇인지
- intent가 무엇인지
- domain recommendation이 필요한지
- `lens 선택 계획 (LensSelectionPlan)`이 무엇인지
- `light/full` recommendation이 필요한지

prompt-backed path에서도 이 단계의 결과는 최종적으로
`interpretation.yaml`로 materialize되어야 한다.

### 3.3 주체자 확인 / 선택 확정

필요한 경우 아래를 주체자와 확정한다.

- `도메인 최종 선택 (DomainFinalSelection)`
- `light/full`
- explicit override

이 단계는 semantic recommendation과 deterministic binding의 중간에서
주체자가 최종 authority를 행사하는 구간이다.

현재 host-facing `review:invoke`의 기본 규칙:

- explicit `--domain {name}` / `--no-domain` (canonical) 또는 legacy `@{domain}` / `@-` (backward compat) 가 있으면 그대로 사용
- configured domain이 하나면 바로 사용
- configured domain이 여러 개면 interactive selection을 수행
- interactive selection이 불가능한 non-interactive 환경이면 fail-fast 하고 explicit domain selection을 요구
- `--domain` 과 `--no-domain` 동시 지정은 parser layer 에서 fail-fast

### 3.4 호출 고정 (InvocationBinding)

runtime/host가 아래를 고정한다.

- resolved target scope
- final domain value
- resolved execution realization
- resolved host runtime
- resolved review mode
- resolved lens set
- session root
- artifact paths

이 단계가 끝나면 prompt-backed path에서도
적어도 `session_root`와 각 artifact path는 확정되어 있어야 한다.

현재 bounded runtime step은 TypeScript core로 구현한다.

Preferred repo-local combined entrypoint는 아래다.

- `npm run review:invoke -- ...`

기본 bounded start step은 아래다.

- `npm run review:start-session -- ...`

필요하면 아래 분해된 step도 내부 bounded step으로 사용할 수 있다.

- `npm run review:write-interpretation -- ...`
- `npm run review:bootstrap-binding -- ...`
- `npm run review:materialize-execution-preparation -- ...`
- `npm run review:materialize-prompt-packets -- ...`

### 3.5 Execution Preparation Artifacts

binding 다음에는 최소 아래 artifact가 materialize되어야 한다.

1. `session metadata`
2. `target snapshot`
3. `review target materialized input`
4. `context candidate assembly`
5. `execution plan`
6. `prompt packets`
7. `execution result`

이 단계는 later `ReviewRecord`와 runtime replacement의 bridge다.

세부 contract는 `processes/review/execution-preparation-artifacts.md`를 따른다.

prompt-backed path에서도 실제 파일이 만들어져야 한다.
즉 이 단계는 단순 개념 설명이 아니라 artifact materialization step이다.

`execution plan`은 아래를 deterministic하게 고정한다.

- lens별 output seat
- `synthesis.md` seat
- `deliberation.md` seat
- `error-log.md` seat
- `final-output.md` seat
- `review-record.yaml` seat
- `execution-result.yaml` seat
- boundary seat
  - `BoundaryPolicy`
  - `BoundaryPresentation`
  - `BoundaryEnforcementProfile`
  - `EffectiveBoundaryState`

`prompt packets`는 아래를 deterministic하게 고정한다.

- lens별 prompt handoff text
- `synthesize` prompt handoff text
- 각 packet이 읽어야 할 artifact path
- 각 packet이 써야 할 output path
- packet은 가급적 lightweight handoff여야 하며, authoritative artifact의 전체 본문을 과도하게 embedded하지 않는다
- `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`는 packet이 가리키는 artifact file을 직접 읽는다
- synthesize runtime packet은 participating lens output의 seat/ref를 넘기되, 가능하면 본문 전체를 다시 중복 embedded하지 않는다
- packet은 boundary policy와 effective boundary state를 함께 제시해, 허용된 탐색 공간과 강제 강도를 분명히 해야 한다

### 3.6 9개 lens 독립 실행

각 lens는 **맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)** 로 실행된다.

가능하면 host는 자유 텍스트 대신 TS core가 materialize한 prompt packet을 사용해야 한다.
기본 bounded dispatch step은 아래다.

- `npm run review:run-prompt-execution -- ...`

이 step은 실행 종료 시 `execution-result.yaml`을 반드시 materialize해야 한다.

canonical requirement:

1. 각 lens는 자기 전용 맥락을 가진다
2. Round 1에서는 다른 lens 결과를 보지 않는다
3. 메인 `LLM` 콘텍스트는 per-lens detailed reasoning을 직접 모두 담지 않는다
4. 각 실행 단위는 packet에 제시된 `BoundaryPolicy`와 `EffectiveBoundaryState`를 hard constraint로 읽는다
5. 경계 안에서 충분한 근거를 얻지 못하면 broad search로 타협하지 않고 degraded/uncertain output을 남긴다
6. lens dispatch는 병렬 실행이 기본이다
7. realization에 동시 실행 제한이 있으면 bounded parallel dispatch를 사용하고, slot이 비면 다음 pending lens를 즉시 투입한다

가능한 realization:

- Agent Teams teammate
- subagent
- `MCP`로 분리된 `LLM`
- 독립 background agent
- external model worker

현재 repo-local TS bounded path에서 연결된 execution profile은 아래다.

- `subagent + codex`
- `subagent + claude`
- `agent-teams + claude`

현재 지원하지 않는 execution profile:

- `agent-teams + codex`

중요한 점은 host-specific naming이 아니라:

- `lens별 독립성`
- `메인 콘텍스트 보존`
- `독립 의미 검증`

이 유지되는 것이다.

packet materialization만 단독으로 디버깅해야 할 때는 아래 내부 bounded step을 쓸 수 있다.

- `npm run review:materialize-prompt-packets -- ...`

현재 TS bounded runner의 기본 병렬성:

- `subagent` → `max_concurrent_lenses = 3`
- `agent-teams` → `max_concurrent_lenses = 9`

필요하면 `--max-concurrent-lenses`로 override할 수 있다.

### 3.7 종합 단계 (synthesize)

`synthesize`는 lens finding을 읽고 아래를 정리한다.

- consensus
- conditional consensus
- disagreement
- overlooked premises
- immediate actions
- recommendations
- final review result

중요:

- `synthesize`는 새 독립 관점을 만들지 않는다
- `New Perspectives`는 `axiology`가 제시하는 영역이다
- synthesize는 `axiology`가 제시한 추가 관점이 있으면 그것을 보존/배치할 수는 있지만, 스스로 invent하면 안 된다

### 3.8 리뷰 기록 (ReviewRecord)

`review`의 primary output은 `리뷰 기록 (ReviewRecord)`다.

최종 human-readable output은 먼저 render될 수 있지만,
later `learn/govern`가 읽을 canonical artifact는 `ReviewRecord`여야 한다.

즉:

- lens markdown
- synthesis markdown

은 최종적으로 `ReviewRecord`의 source/human-readable layer로 내려간다.

세부 contract는 `processes/review/record-contract.md`를 따른다.

prompt-backed path에서는 `final-output.md`를 먼저 render한 뒤,
team lead 또는 bounded TS step이 마지막에 `review-record.yaml`을 actual aggregate로 assemble해야 한다.

Preferred repo-local combined completion 포함 entrypoint는 아래다.

- `npm run review:invoke -- ...`

기본 bounded completion step은 아래다.

- `npm run review:complete-session -- ...`

필요하면 아래 분해된 step도 내부 bounded step으로 사용할 수 있다.

- `npm run review:render-final-output -- ...`
- `npm run review:finalize-session -- ...`

### 3.9 Human-Readable Final Output

주체자에게 보여주는 최종 review output은
`ReviewRecord`와 synthesis result를 기반으로 render된 결과다.

즉 사람이 읽는 결과와
later system handoff artifact를 분리한다.

기본 bounded render step은 아래다.

- `npm run review:render-final-output -- ...`

중요:

- degraded case가 발생하면 `review:run-prompt-execution`은 `error-log.md`를 기록한다
- `review:complete-session`은 `final-output.md` render가 실패해도 `review-record.yaml` 조립은 계속 시도한다
- 따라서 partial failure에서도 `ReviewRecord`는 남아야 한다

---

## 4. What This Replaces

이 live path가 canonical truth가 되면,
기존 `processes/review/review.md`의 아래 항목은 source material로만 남는다.

- Step 0의 legacy domain selection wording
- Step 1.5의 legacy complexity UI wording
- host-specific TeamCreate / SendMessage 중심 절차 설명

즉 old process description은 버리는 것이 아니라
prompt-backed reference source로만 남기고,
live execution truth는 이 문서로 옮긴다.

---

## 5. Immediate Follow-up

이 문서 다음 우선순위는 아래다.

1. `processes/review/review.md`를 이 live path에 맞는 reference execution 문서로 더 축소한다
2. `review:invoke`를 host command path에 직접 연결하고, 내부에서는 `review:start-session` / `review:run-prompt-execution` / `review:complete-session` bounded steps를 유지한다
3. deprecated Python prototypes를 제거하고 TS core path만 canonical path로 남긴다
