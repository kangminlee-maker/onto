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

1. 의도 해석 (InvocationInterpretation)
2. 주체자 확인 / 선택 확정
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

Onto review supports **두 가지 canonical 실행 경로** (2026-04-13 정책 확정):

| 경로 | 실행 주체 | 진입점 | 비용 모델 |
|---|---|---|---|
| **Codex CLI** | `codex` child process (CLI executor) | `npm run review:invoke -- <target> <intent> --codex` | Codex 할당량 |
| **Agent Teams nested spawn** | 메인 Claude Code 세션 내 Agent tool (nested) | `onto coordinator start` → `onto coordinator next` … | Claude Code 구독 내 |

- **Codex 경로**: `--codex` 플래그 또는 config의 `host_runtime: codex` 시. `onto review` CLI가 child process로 `codex` CLI를 spawn하여 lens별 bounded unit을 실행.
- **Agent Teams 경로**: Claude Code 세션에서 `onto coordinator start`로 진입. Coordinator state machine이 `prepare-only` 세션을 준비하고, 주체자(메인 세션)는 TeamCreate + Agent tool로 coordinator subagent를 nested spawn, coordinator subagent가 다시 Agent tool로 9개 lens + synthesize subagent를 nested spawn. 상세: `processes/review/nested-spawn-coordinator-contract.md`.

이외 경로 — Claude CLI subagent, API executor, 3-Tier fallback — 는 2026-04-13 정책 확정과 함께 **전부 제거되었다**. Claude CLI 인증 환경이 불안정하여 두 canonical 경로만 안정적으로 운용한다.

### Codex 경로의 자동 가시성 (live watcher)

`--codex` 경로는 lens 진행을 LLM 토큰 없이 주체자에게 보여주기 위해 **runtime이 자동으로 watcher pane을 띄운다**:

| 환경 감지 | 자동 동작 |
|---|---|
| `$TMUX` set (any OS) | `tmux split-window -v`로 새 pane을 분할하고 watcher 실행 |
| iTerm2 on macOS (`$TERM_PROGRAM === iTerm.app`) | osascript로 현재 window를 horizontally split, watcher 실행 |
| Apple Terminal on macOS (`$TERM_PROGRAM === Apple_Terminal`) | osascript로 새 tab 생성, watcher 실행 |
| 그 외 | fallback 메시지: "open another terminal and run `npm run review:watch`" |

watcher는 `error-log.md`를 polling하여 lens dispatch start/complete 이벤트를 ANSI 색상으로 렌더링한다. final-output.md가 생성되면 자동으로 "Press Enter to close" 안내 후 종료. **주체자는 별도 명령어를 입력할 필요가 없다** — `--codex` 플래그만 붙이면 자동으로 진행상황 pane이 열린다.

opt-out: `--no-watch` 플래그를 추가하면 watcher 자동 spawn을 비활성화한다.

수동 실행: `npm run review:watch` (zero-arg, `.onto/review/.latest-session`을 자동 발견) 또는 `npm run review:watch -- {session-root}` (명시적 path).

설계 근거: 진행상황은 결정론적 변환(파일 read + 포맷팅)이므로 `llm-native-development-guideline.md` §5 Script-First Automation에 따라 LLM이 아니라 runtime/script가 처리해야 한다. LLM polling 비용은 0이다.

### Agent Teams 경로 필수 규칙

Claude Code에서 coordinator state machine을 실행할 때, lens dispatch는 반드시 **Agent Teams를 통해** 수행한다:

1. Agent Teams로 coordinator agent 1개를 생성한다 (TeamCreate → TaskCreate).
2. 해당 agent가 Agent tool로 lens별 subagent를 spawn한다 (nested spawn 구조).
3. Agent Teams가 비활성화된 환경에서 해당 경로는 사용 불가 — Codex 경로를 사용한다.

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

**Execution path selection**:
- `--codex` → Codex CLI 경로 (`host_runtime: codex`, `execution_realization: subagent`). `onto review` CLI가 전체 실행을 담당.
- 플래그 없음 + Claude Code 세션: Agent Teams nested spawn 경로는 `onto coordinator start`로 별도 진입. `onto review` 자체는 Codex를 default로 한다.
- 플래그 없음 + Codex 세션: Codex 경로가 default.

Examples:
- `/onto:review process.md @ontology --codex` — codex host runtime
- `/onto:review src/ @- --codex` — codex, no-domain
- `/onto:review --target-scope-kind bundle --primary-ref drafts/ontology --member-ref drafts/ontology/domain_scope.md --member-ref drafts/ontology/concepts.md "seed bundle review" --codex` — explicit bundle target
- `/onto:review drafts/palantir-foundry @- --codex` — seed review

Agent Teams 경로는 `onto coordinator start <target> <intent>` 형태로 별도 진입한다.

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

**Execution procedure** (before starting the process):
1. Parse `--codex` flag (or lack thereof). If Claude Code session and user wants Agent Teams path → redirect to `onto coordinator start`.
2. If resolved path is Codex → verify Codex CLI readiness. If unavailable → halt with guidance.
3. Resolved execution profile is passed to Step 2 of the review process.
4. Before lens execution, the command must ensure the bounded TS core steps have already written:
   - `interpretation.yaml`
   - `binding.yaml`
   - `session-metadata.yaml`
   - `execution-plan.yaml`
   - `execution-preparation/*`
   - `prompt-packets/*.prompt.md`
5. Prefer the combined repo-local entrypoint when possible:
   - `review:invoke`
6. Otherwise prefer the internal bounded steps:
   - `review:start-session`
   - `review:run-prompt-execution`
   - `review:complete-session`
7. `review:run-prompt-execution` accepts `--max-concurrent-lenses` (default 9)
8. Treat `review:prepare-session`, `review:materialize-prompt-packets`, `review:render-final-output`, and `review:finalize-session` as internal bounded steps unless a narrower replacement boundary is being debugged.
