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

Onto review supports **세 가지 canonical 실행 경로** (`execution_realization × host_runtime` 2-axis의 세 유효 조합). 자세한 의미론은 `authority/core-lexicon.yaml`의 `LlmAgentSpawnRealization`.

| 경로 | 조합 | 실행 주체 | 진입점 | Context 비용 | Billing source |
|---|---|---|---|---|---|
| **Agent Teams nested spawn** | `agent-teams + claude` | 메인 Claude Code 세션 → TeamCreate로 coordinator subagent → coordinator가 lens subagents nested spawn | `onto coordinator start` → `onto coordinator next` … | 메인 무소비 (coordinator subagent orchestration) | Claude Code 구독 |
| **Main-session direct Agent spawn** | `subagent + claude` | 메인 Claude Code 세션이 TeamCreate 없이 Agent tool로 lens subagent 직접 spawn | `onto coordinator start` (동일 state machine, caller가 flat 패턴으로 사용) | 메인이 orchestration에 일부 사용 (lens reasoning은 독립 subagent) | Claude Code 구독 |
| **Codex CLI subagent** | `subagent + codex` | `codex` child process가 lens마다 subprocess | `npm run review:invoke -- <target> <intent> --codex` | 메인 무소비 | chatgpt 구독 또는 API-key |

- **Agent Teams nested spawn**: TeamCreate 가용 환경의 기본 선택. Coordinator state machine이 `prepare-only` 세션을 준비하고 주체자가 TeamCreate로 nested orchestration. 상세: `processes/review/nested-spawn-coordinator-contract.md`.
- **Main-session direct Agent spawn**: TeamCreate 비가용 환경의 대안. 주체자가 Agent tool로 각 lens subagent를 flat spawn. **동일한 `coordinator-state-machine.ts`를 사용**하되 caller가 nested 대신 flat 패턴으로 dispatch. lens reasoning은 여전히 독립 subagent context이므로 품질 영향 없음 — 주체자 메인 context가 orchestration에 일부 소비되는 트레이드오프만.
- **Codex CLI**: Claude 외부 host(chatgpt 구독·API-key). `--codex` 플래그 또는 `host_runtime: codex` 명시 시. `onto review` CLI가 child process로 codex를 spawn.

`onto review`(플래그 무명시)는 auto-resolution 수행: `CLAUDECODE=1` 감지 시 coordinator-start handoff(JSON) emit → 주체자가 이후 TeamCreate/Agent tool 패턴 선택. codex binary + auth.json 있으면 codex 경로. 둘 다 없으면 fail-fast with guidance.

이외 경로 — Claude CLI subagent, API executor, 3-Tier fallback — 는 2026-04-13 정책 확정과 함께 **전부 제거되었다**. Claude CLI 인증 환경이 불안정하여 위 세 canonical 경로만 안정적으로 운용한다.

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

### Claude host 경로 orchestration 규칙

Claude Code에서 coordinator state machine을 실행할 때, lens dispatch는 두 가지 orchestration 패턴 중 하나로 수행한다:

**nested (agent_teams_claude, 권장)**:
1. TeamCreate → TaskCreate로 coordinator agent 1개 생성.
2. 해당 coordinator agent가 Agent tool로 lens별 subagent를 nested spawn.
3. 주체자 메인 context 거의 무소비.

**flat (subagent_claude, TeamCreate 비가용 시)**:
1. 주체자 메인 세션이 TeamCreate 없이 Agent tool로 lens subagent를 직접 spawn.
2. Coordinator state machine은 동일하게 사용 (caller-neutral).
3. 주체자 context가 orchestration에 소비되나 lens reasoning은 독립 subagent context라 품질 동등.

TeamCreate 가용성은 세션 기능 설정에 따라 다르며, **onto는 외부에서 introspect할 수 없으므로 주체자가 시도 후 실패 시 flat 패턴으로 전환**. `onto coordinator start/next` state machine은 양쪽 caller를 수용한다.

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
- `--codex` → subagent + codex (`host_runtime: codex`). `onto review` CLI가 전체 실행을 담당.
- 플래그 무명시 + `CLAUDECODE=1` 감지: auto-resolution이 coordinator-start handoff JSON을 emit → 주체자가 이후 nested(agent_teams_claude) 또는 flat(subagent_claude) 패턴 선택.
- 플래그 무명시 + codex binary + auth.json만 있음: codex 경로를 default로 진행.
- 플래그 무명시 + 둘 다 없음: fail-fast with host-setup guidance (네 가지 해결 경로 제시).
- `.onto/config.yml`의 `host_runtime: claude` | `codex`로 명시 override 가능 (stay-in-host 자동 해소를 거스름).

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
1. `onto review` auto-resolves execution realization via stay-in-host policy:
   - `--codex` explicit OR `host_runtime: codex` config → `subagent + codex` path
   - `CLAUDECODE=1` OR `host_runtime: claude` config → coordinator-start handoff JSON emitted; subject session then invokes `onto coordinator start`, selecting nested (`agent_teams_claude`) or flat (`subagent_claude`) orchestration based on TeamCreate availability
   - `host_runtime: litellm` in config → explicit fail-fast (type-recognized but wiring deferred)
   - Neither host detected → fail-fast with host-setup guidance
2. If resolved path is `subagent + codex` → verify Codex CLI readiness. If unavailable → halt with guidance.
3. Resolved execution profile (execution_realization + host_runtime) is recorded into session artifacts (binding.yaml, execution-plan.yaml, session-metadata.yaml) so downstream consumers see actual path used.
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
