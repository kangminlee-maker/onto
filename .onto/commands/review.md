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

> **2026-04-21 canonical update** — Review UX Redesign (P1~P8) landed. The canonical
> surface is now the `review:` axis block in `.onto/config.yml`. User declares 6
> axes (teamlead / subagent / max_concurrent_lenses / lens_deliberation +
> per-model effort); runtime derives one of 6 internal `TopologyShape` s and
> dispatches accordingly. See design doc
> `development-records/evolve/20260420-review-execution-ux-redesign.md`.
>
> The "3 canonical paths" and "10 topology ids" described below remain
> operational as backward-compat layers. P7 will remove the legacy
> `execution_topology_priority` identifier path — use `onto config` CLI or
> `npm run onboard:write-review-block` to migrate.

### Canonical path (Review UX Redesign)

```yaml
# .onto/config.yml
review:
  teamlead:
    model: main                     # "main" = host session
  subagent:
    provider: main-native           # or codex / anthropic / openai / litellm
    # model_id: gpt-5.4             # required when foreign provider
    # effort: high
  # max_concurrent_lenses: 6
  # lens_deliberation: synthesizer-only
```

Runtime dispatch under the axis block:
1. `validateReviewConfig` — syntactic + discriminated-union check.
2. `deriveTopologyShape` — axes + env signals (Claude/Codex host, agent-teams) → one of 6 shapes.
3. `shapeToTopologyId` — shape + signals → canonical `TopologyId` in the existing catalog.
4. Resolver emits `[topology] priority source=review-axes order=[<id>]` and matches the id.
5. Any failure (validation / derivation / mapping) → P3 universal fallback: degrade to `main_native` shape with `[topology] degraded: requested=... → actual=main_native (reason: ...)`. Only when `main_native` itself is unmappable does the resolver fall through to the legacy priority ladder.

Use `onto config show` / `onto config validate` to preview the derivation before running a review. Design-integrity audit: `development-records/audit/20260421-shape-pipeline-audit.md`.

### Legacy execution paths (backward compat through P7)

Onto review previously supported **세 가지 canonical 실행 경로** (`execution_realization × host_runtime` 2-axis의 세 유효 조합). 자세한 의미론은 `authority/core-lexicon.yaml`의 `LlmAgentSpawnRealization`.

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

### Sketch v3 Topology-Aware Execution (opt-in, 2026-04-18)

위 세 경로는 **3 canonical combinations** — sketch v3 (PR #99~#106) 은 이것을 **10 canonical topology 옵션** 으로 확장하고 `.onto/config.yml` 의 `execution_topology_priority: [...]` 배열로 주체자가 우선순위 지정 가능하게 만든다.

```yaml
# .onto/config.yml 예
execution_topology_priority:
  - cc-main-codex-subprocess       # 1st: Claude Code 세션 내 codex lens
  - codex-main-subprocess          # 2nd: Codex CLI 세션 폴백
  - codex-nested-subprocess        # 3rd: plain terminal 폴백
```

Principal 이 이 field 를 설정하면:
- `onto review` auto-resolution 이 topology resolver 를 추가 호출 → 환경 시그널 (`CLAUDECODE`, codex binary, LiteLLM endpoint) 에 맞는 첫 옵션 채택
- Coordinator-start handoff JSON 에 `topology` descriptor 필드 포함 → coordinator subagent 가 `topology.id` / `lens_spawn_mechanism` / `deliberation_channel` 을 canonical 로 해석
- 상세 topology 별 orchestration 지침: `processes/review/nested-spawn-coordinator-contract.md` §2.2

Opt-in 안 한 주체자는 3-path legacy 동작 그대로 유지. Migration guide: `docs/topology-migration-guide.md`.

Legacy 필드 (`host_runtime` / `execution_realization` / `execution_mode` / `executor_realization` / `api_provider`) 사용 시 `[onto:deprecation]` STDERR 경고 출력 (PR #103) — 동작은 유지, 마이그레이션 권장.

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

**Domain selection** (canonical: explicit flags; legacy `@` syntax kept for backward compat):
- **Canonical**: `--domain {name}` to specify a domain; `--no-domain` for no-domain mode
- **Legacy** (kept for backward compat — note: `@` may conflict with Claude Code's `@filename` mention syntax): append positional `@{domain}` or `@-`
- If omitted:
  - one configured domain → use it directly
  - multiple configured domains → prompt for interactive selection when a TTY is available
  - multiple configured domains in a non-interactive environment → fail fast and require an explicit domain selection
- `--domain` and `--no-domain` are mutually exclusive (specifying both fails fast)

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

Examples (canonical):
- `/onto:review process.md --domain ontology --codex` — codex host runtime, ontology domain
- `/onto:review src/ --no-domain --codex` — codex, no-domain
- `/onto:review --target-scope-kind bundle --primary-ref drafts/ontology --member-ref drafts/ontology/domain_scope.md --member-ref drafts/ontology/concepts.md "seed bundle review" --codex` — explicit bundle target
- `/onto:review drafts/palantir-foundry --no-domain --codex` — seed review

Examples (legacy `@` syntax — still works):
- `/onto:review process.md @ontology --codex`
- `/onto:review src/ @- --codex`

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
   - `host_runtime: litellm` / `anthropic` / `openai` / `standalone` in config → `ts_inline_http` self-execute (TS runtime calls the endpoint directly). When `subagent_llm` is also set it overrides; otherwise top-level `api_provider` / `llm_base_url` / `model` are the fallback source
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
