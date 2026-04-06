# Onto Review (9-Lens Review + Synthesize)

Reviews $ARGUMENTS with the 9-lens review structure and a separate synthesize stage.

During current productization work, this command must follow the **current repo-local source of truth**.
The installed plugin copy is only a packaged realization and must not override newer repo-local authority.

## Repo-local canonical bounded path

Preferred entrypoints:

- `onto review <target> <intent>` — global CLI (from any directory)
- `npm run review:invoke -- ...` — repo-local (from onto repo)
- `onto-harness` 채널에서는 user-facing `review:*` CLI 실행 시 베타 채널 안내가 먼저 출력됩니다

Internal bounded path:

1. `���토 해석 (InvocationInterpretation)`
2. 사용자 확인 / 선택 확정
3. `npm run review:start-session -- ...`
4. `npm run review:run-prompt-execution -- ...`
   using:
   - `execution-plan.yaml`
   - `prompt-packets/*.prompt.md`
   - each packet should stay lightweight and point to authoritative artifact files
   - lens execution must be parallel by default
   - if the realization has a concurrency limit, use bounded parallel dispatch and backfill freed slots with the next pending lens
5. `npm run review:complete-session -- --project-root {project} --session-root "{session_root}" --request-text "{original user request}"`

## Execution path selection

When this skill is invoked in a Claude Code session, choose the execution path:

| 조건 | 경로 | 실행 주체 | 비용 모델 |
|---|---|---|---|
| `$ARGUMENTS`에 `--execution-realization`, `--executor-bin`, `--host-runtime`, `--codex`, `--claude` 중 하나라도 있음 | **CLI executor** | `npm run review:invoke` (child process) | executor별 (codex 할당량 / API 과금) |
| 위 플래그 없음 (기본) | **Nested Spawn Coordinator** | Agent tool (현재 세션 내) | 구독 내 |

- **CLI executor path**: 모든 원본 인자를 `npm run review:invoke -- ...`에 전달하고 종료.
- **Nested Spawn Coordinator (default)**: `processes/review/nested-spawn-coordinator-contract.md`의 state machine 실행 계약을 따른다. `onto coordinator start` → lens dispatch → `onto coordinator next` → synthesize dispatch → `onto coordinator next` → presentation. 상세는 coordinator contract 참조.

### Agent Teams 필수 규칙

Claude Code에서 Nested Spawn Coordinator를 실행할 때, lens dispatch는 반드시 **Agent Teams를 통해** 수행한다:

1. Agent Teams로 coordinator agent 1개를 생성한다 (TeamCreate → TaskCreate).
2. 해당 agent가 Agent tool로 lens별 subagent를 spawn한다 (nested spawn 구조).
3. Agent Teams가 비활성화된 환경에서만 메인 컨텍스트에서 직접 lens를 dispatch한다.

### 3-Tier Executor Fallback

CLI executor 경로(`--claude`, `--agent-teams` 등)에서 실행 실패 시, 다음 순서로 fallback한다.
각 tier 전환 시 세션 재준비는 불필요하다 — `--prepare-only`로 이미 생성된 세션 artifact를 재사용한다.

| Tier | 실행 방식 | 전환 조건 | 비용 |
|---|---|---|---|
| 1 | CLI executor (claude CLI subagent) | `[CLAUDE_AUTH_FAILED]` 감지 시 → Tier 2 | 구독 내 |
| 2 | Nested Spawn Coordinator (Agent Teams → Agent tool) | dispatch 실패 시 → Tier 3 | 구독 내 |
| 3 | Codex CLI | **사용자 동의 필수** — 추가 과금 발생 고지 후 승인 시에만 실행 | 추가 과금 |

#### Tier 1 → Tier 2 전환

CLI executor 출력(stdout/stderr)에 `[CLAUDE_AUTH_FAILED]`가 포함되면:
1. CLI executor 결과의 `session_root`를 확인한다 (세션 artifact는 이미 존재).
2. `{session_root}/execution-plan.yaml`을 읽어 lens seats를 도출한다.
3. Nested Spawn Coordinator의 Phase 2부터 실행한다 (Phase 1 preparation은 CLI executor가 이미 완료).

#### Tier 2 → Tier 3 전환

Nested Spawn Coordinator의 lens dispatch도 실패하면:
1. 사용자에게 Codex CLI 사용 동의를 구한다:
   `"Codex CLI로 재시도할까요? 추가 과금이 발생합니다. (y/n)"`
2. 승인 시: `onto review {$ARGUMENTS} --codex`로 재실행 (codex executor 경로).
3. 거부 시: 실패를 보고하고 종료.

해소되는 실무 질문:
- "Claude Code에서 기본으로 어느 경로?" → Nested Spawn Coordinator (Agent Teams → Agent tool)
- "`--claude`를 붙이면?" → CLI executor path (`review:invoke`가 resolved profile로 실행)
- "CLI executor가 auth 실패하면?" → 자동으로 Nested Spawn Coordinator로 전환 (Tier 2)
- "Codex는 언제 사용?" → Tier 2까지 모두 실패 + 사용자 명시적 동의 시에만
- "플래그 없이 실행하면 bound profile은?" → `execution-plan.yaml`의 `execution_realization` + `host_runtime`에서 도출

The coordinator contract is the authority for execution procedure. This command surface only selects the path.

The command surface should stay thin:
- do not restate coordinator procedure here — read the contract document
- do not hard-code lens counts, concurrency values, or execution profile constants
- all runtime values are derived from `execution-plan.yaml` and `binding.yaml`

**Domain selection**:
- Append `@{domain}` to specify a domain
- Append `@-` for no-domain mode
- If omitted:
  - one configured domain -> use it directly
  - multiple configured domains -> prompt for interactive selection when a TTY is available
  - multiple configured domains in a non-interactive environment -> fail fast and require an explicit domain token

**Boundary selection**
- If the requested target resolves outside `project-root`, runtime now asks for explicit user decision in TTY mode.
- Default options in an interactive session:
  - approve review on that external target and add an explicit filesystem boundary
  - stop and rerun with an in-repo target
  - cancel
- In non-interactive mode, choose one explicit decision before rerun:
  - `--filesystem-boundary-decision approve --filesystem-allowed-root <external_root>`
  - `--filesystem-boundary-decision rerun` (with repo-relative target)
  - `--filesystem-boundary-decision cancel`

**Execution profile**:
- canonical:
  - `--execution-realization subagent --host-runtime codex`
  - `--execution-realization subagent --host-runtime claude`
  - `--execution-realization agent-teams --host-runtime claude`
- convenience aliases:
  - `--codex` → `host_runtime: codex`
  - `--claude` → `host_runtime: claude`
- if omitted, use `{project}/.onto/config.yml`
  - prefer `execution_realization` + `host_runtime`
  - accept legacy `execution_mode` as a compatibility alias
  - if both are absent, default by resolved host runtime:
    - `codex` → `subagent`
    - `claude` → `agent-teams`

Current productization status:
- `subagent + codex` is currently wired into the TS bounded path
- `subagent + claude` is currently wired into the TS bounded path
- `agent-teams + claude` is currently wired into the TS bounded path
- `agent-teams + codex` is not supported
- this is an implementation-status difference, not a canonical hierarchy or quality ranking

Examples:
- `/onto:review process.md @ontology` — uses host-aware default execution profile
- `/onto:review process.md @ontology --codex` — codex host runtime, defaulting to `subagent`
- `/onto:review process.md @ontology --claude` — claude host runtime, defaulting to `agent-teams`
- `/onto:review process.md @ontology --claude --execution-realization subagent` — claude host runtime with `subagent`
- `/onto:review src/ @- --codex` — codex host runtime, no-domain
- `/onto:review --target-scope-kind bundle --primary-ref drafts/ontology --member-ref drafts/ontology/domain_scope.md --member-ref drafts/ontology/concepts.md "seed bundle review"` — explicit bundle target
- `/onto:review drafts/palantir-foundry @-` — seed review (recommended for initial seed review)

Read the current repo copies of:
- `AGENTS.md`
- `processes/review/productized-live-path.md`
- `processes/review/nested-spawn-coordinator-contract.md`
- `processes/review/interpretation-contract.md`
- `processes/review/binding-contract.md`
- `processes/review/execution-preparation-artifacts.md`
- `processes/review/lens-prompt-contract.md`
- `processes/review/synthesize-prompt-contract.md`
- `processes/review/prompt-execution-runner-contract.md`
- `processes/review/record-contract.md`
- `processes/review/record-field-mapping.md`
- `processes/review/review.md`

**Execution profile resolution** (before starting the process):
1. Parse canonical options from $ARGUMENTS:
   - `--execution-realization`
   - `--host-runtime`
2. Parse convenience aliases if present:
   - `--codex`
   - `--claude`
3. If canonical options are absent → read `{project}/.onto/config.yml`
   - prefer `execution_realization` + `host_runtime`
   - accept legacy `execution_mode`
4. If execution realization is still absent after config lookup → default by resolved host runtime:
   - `codex` → `subagent`
   - `claude` → `agent-teams`
5. If resolved host runtime is `codex` → verify Codex CLI readiness. If unavailable → halt with guidance.
6. If resolved host runtime is `claude` → verify Claude CLI readiness. If unavailable → halt with guidance.
7. Resolved execution profile is passed to Step 2 of the review process.
8. Before lens execution, the command must ensure the bounded TS core steps have already written:
   - `interpretation.yaml`
   - `binding.yaml`
   - `session-metadata.yaml`
   - `execution-plan.yaml`
   - `execution-preparation/*`
   - `prompt-packets/*.prompt.md`
9. Prefer the combined repo-local entrypoint when possible:
   - `review:invoke`
10. Otherwise prefer the internal bounded steps:
   - `review:start-session`
   - `review:run-prompt-execution`
   - `review:complete-session`
11. `review:run-prompt-execution` accepts `--max-concurrent-lenses`
   - default:
     - `subagent` → `3`
     - `agent-teams` → `9`
   - override is allowed per user or project config
12. Treat `review:prepare-session`, `review:materialize-prompt-packets`, `review:render-final-output`, and `review:finalize-session` as internal bounded steps unless a narrower replacement boundary is being debugged.
