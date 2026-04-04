# Review Prompt Execution Runner Contract

> 상태: Active
> 목적: `execution-plan.yaml`과 `prompt-packets/*.prompt.md`를 읽고, 각 `맥락 격리 추론 단위 (ContextIsolatedReasoningUnit)`를 deterministic하게 dispatch하는 bounded runtime contract를 고정한다.
> 기준 문서:
> - `dev-docs/review-productized-live-path.md`
> - `dev-docs/review-lens-prompt-contract.md`
> - `dev-docs/review-synthesize-prompt-contract.md`
> - `dev-docs/review-record-contract.md`
> - `authority/core-lexicon.yaml`

---

## 1. Position

이 contract는 runtime이 `LLM` 대신 의미 판단을 수행한다는 뜻이 아니다.

runtime은 아래만 한다.

1. `execution-plan.yaml`을 읽는다
2. lens/synthesize prompt packet seat를 확인한다
3. 각 packet을 외부 실행 단위에 deterministic하게 전달한다
4. 각 output seat에 실제 결과 파일이 생성되었는지 검사한다
5. 기준 미달이면 `fail-close` 한다

추가로 synthesize dispatch 직전에는 runtime이
이미 생성된 lens output을 읽어 synthesize runtime packet에 embedded한다.
이건 새로운 semantic 판단이 아니라,
이미 존재하는 lens 결과를 declared seat에 따라 전달하는 deterministic handoff다.

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

중요:

- runtime은 packet 내용을 해석하지 않는다
- packet과 output seat를 외부 실행 단위에 전달만 한다

---

## 3. Outputs

최소 출력:

1. `round1/{lens}.md`
2. `synthesis.md`

원칙:

- lens output seat는 `execution-plan.yaml`이 고정한다
- synthesize output seat도 `execution-plan.yaml`이 고정한다
- runner는 seat를 바꾸면 안 된다

---

## 4. Canonical Bounded Step

현재 TS core bounded step:

```bash
npm run review:run-prompt-execution -- \
  --project-root {project_root} \
  --session-root {session_root} \
  --executor-bin {executor_bin} \
  --executor-arg {executor_arg}
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
  --executor-arg run \
  --executor-arg review:subagent-unit-executor \
  --executor-arg=-- \
  --executor-arg --host-runtime \
  --executor-arg codex
```

현재 구현에서는 아래 execution profile이 wired 되어 있다.

- `subagent + codex`
- `subagent + claude`
- `agent-teams + claude`

즉 canonical realization name과 host runtime은 분리해서 본다.

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

---

## 6. Immediate Follow-up

다음 단계는 아래다.

1. `review:start-session -> review:run-prompt-execution -> review:complete-session`를 `/onto:review`의 canonical bounded path로 올린다
2. 실제 host realization이 이 contract를 따르도록 연결한다
3. degraded case / partial failure를 이 runner contract에 추가한다
