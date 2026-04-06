# Review Prompt Execution Runner Contract

> 상태: Active
> 목적: `execution-plan.yaml`과 `prompt-packets/*.prompt.md`를 읽고, 각 `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`를 deterministic하게 dispatch하는 bounded runtime contract를 고정한다.
> 기준 문서:
> - `processes/review/productized-live-path.md`
> - `processes/review/lens-prompt-contract.md`
> - `processes/review/synthesize-prompt-contract.md`
> - `processes/review/record-contract.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

이 contract는 runtime이 `LLM` 대신 의미 판단을 수행한다는 뜻이 아니다.

runtime은 아래만 한다.

1. `execution-plan.yaml`을 읽는다
2. lens/synthesize prompt packet seat를 확인한다
3. 각 lens packet을 병렬로 외부 실행 단위에 deterministic하게 전달한다
4. 각 output seat에 실제 결과 파일이 생성되었는지 검사한다
5. 기준 미달이면 `fail-close` 한다
6. `EffectiveBoundaryState`를 `error-log.md`와 degraded 판단의 구조적 basis로 남긴다

추가로 synthesize dispatch 직전에는 runtime이
participating lens output의 seat/ref를 synthesize runtime packet에 반영할 수 있다.
이건 새로운 semantic 판단이 아니라,
이미 존재하는 lens 결과 seat를 declared handoff에 맞게 전달하는 deterministic handoff다.

즉 이 runner는:

- `결정론적 계약 실행기 (deterministic contract executor)`
- `구조 적합성 게이트 (structural conformance gate)`

역할만 가진다.

---

## 2. Inputs

최소 입력:

1. `project_root`
2. `session_root`
3. `execution-plan.yaml`
4. `prompt-packets/{lens}.prompt.md`
5. `prompt-packets/onto_synthesize.prompt.md`
6. executor realization
   - `subagent`
   - `agent-teams`
   - `MCP` 분리 `LLM`
   - `external model worker`
7. host runtime
   - `codex`
   - `claude`
8. `max_concurrent_lenses`

중요:

- runtime은 packet 내용을 해석하지 않는다
- packet과 output seat를 외부 실행 단위에 전달만 한다
- lens dispatch order는 deterministic하게 유지하되, 실행은 bounded parallel이어야 한다

---

## 3. Outputs

최소 출력:

1. `round1/{lens}.md`
2. `synthesis.md`
3. `execution-result.yaml`
4. `error-log.md`

원칙:

- lens output seat는 `execution-plan.yaml`이 고정한다
- synthesize output seat도 `execution-plan.yaml`이 고정한다
- `execution-result.yaml`은 actual execution truth의 canonical seat다
- degraded case / partial failure는 `error-log.md`에 기록해야 한다
- `error-log.md`는 최소 한 번 `EffectiveBoundaryState`를 기록해야 한다
- `error-log.md`는 runner progress seat도 겸할 수 있다
- runner는 seat를 바꾸면 안 된다
- `execution-result.yaml`은 최소 아래를 담아야 한다
  - planned/participating/degraded/excluded lens ids
  - per-unit started/completed timestamps
  - per-unit duration
  - synthesize execution status
  - halt reason

---

## 4. Canonical Bounded Step

현재 TS core bounded step:

```bash
npm run review:run-prompt-execution -- \
  --project-root {project_root} \
  --session-root {session_root} \
  --executor-bin {executor_bin} \
  --executor-arg {executor_arg} \
  --max-concurrent-lenses {N}
```

옵션:

- `--synthesize-executor-bin`
- `--synthesize-executor-arg`

를 통해 synthesize만 다른 realization으로 분리할 수 있다.

현재 repo-local actual realization 예:

```bash
npm run review:run-prompt-execution -- \
  --project-root {project_root} \
  --session-root {session_root} \
  --executor-bin npm \
  --executor-arg=run \
  --executor-arg=review:subagent-unit-executor \
  --executor-arg=-- \
  --executor-arg=--host-runtime \
  --executor-arg=codex
```

현재 구현에서는 아래 execution profile이 wired 되어 있다.

- `subagent + codex`
- `subagent + claude`
- `agent-teams + claude`

즉 canonical realization name과 host runtime은 분리해서 본다.

현재 기본 병렬성:

- `subagent` → `3`
- `agent-teams` → `9`

원칙:

- 병렬 실행은 필수다
- realization에 동시 실행 제한이 있으면 worker-pool 방식으로 bounded parallel dispatch를 사용한다
- slot이 비면 다음 pending lens를 즉시 dispatch한다
- synthesize는 participating lens outputs가 확정된 뒤에만 시작한다

---

## 5. What The Runner Must Not Do

이 runner는 아래를 하면 안 된다.

1. lens 순서를 semantic하게 재조정
2. packet 내용을 해석해서 수정
3. synthesize 결과를 임의로 보정
4. missing output을 추론으로 보완
5. output이 비어 있는데도 통과

즉 이 단계는 semantic execution engine이 아니라
semantic execution dispatch engine이다.

packet은 가능하면 lightweight해야 한다.
runtime은 packet을 giant embedded payload로 만들기보다,
authoritative artifact path와 output seat를 고정하는 쪽을 우선한다.

또한 runner는 boundary seat를 semantic하게 재해석하지 않는다.
다만 아래는 해야 한다.

1. `EffectiveBoundaryState`를 log basis로 남긴다
2. 경계 제약 아래에서 output이 생성되지 않았을 때 degraded/fail-close 경로를 탄다

---

## 6. Immediate Follow-up

다음 단계는 아래다.

1. `review:start-session -> review:run-prompt-execution -> review:complete-session`를 `/onto:review`의 canonical bounded path로 올린다
2. 실제 host realization이 이 contract를 따르도록 연결한다
3. deliberation branch를 bounded path에 추가한다
