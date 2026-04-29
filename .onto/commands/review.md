<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=f5bb7bebcab67293b0b216d9eb1ef611981a9f5951eb448812e295c62ae59f2e -->

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

## Interactive runtime selection (Phase B-2)

> **2026-04-29 canonical update** — Phase B-2 of `development-records/evolve/
> 20260425-review-execution-interactive-selection.md`. Detection-signals
> v1 (PR #251, contract `.onto/processes/review/detection-signals-
> contract.md`) provides the L1 raw inputs; this section defines how the
> host prose composes those inputs with `review-config-validator.ts`
> into a 4-branch decision and (when applicable) an interactive selection
> chain.

### Step 1 — gather detection signals

Before any runtime dispatch, the host prose collects a v1 detection
signal JSON. This is a pure-read CLI surface that emits the JSON to
stdout and exits 0 without starting a session:

```
onto review --emit-detection-signals [--project-root <path>]
```

Schema (11 leaf fields, L1 raw detection only — see contract §3.1):

```jsonc
{
  "schema_version": "v1",
  "host_detected": "claude-code" | "codex" | "standalone",
  "claude_code_teams_env_set": boolean,
  "codex": { "binary_on_path": boolean, "auth_file_present": boolean },
  "litellm_base_url_set": boolean,
  "credentials": {
    "env_has_anthropic_api_key": boolean,
    "env_has_openai_api_key": boolean,
    "codex_auth_has_openai_api_key": boolean
  },
  "review_block_declared": boolean,
  "config_parse_error": string | null
}
```

Every field is a single observable fact. The host prose composes the
4-branch decision in Step 2 — schema does NOT carry the decision itself
(see contract §3.0, "Layer L1 vs L2").

### Step 2 — compose the 4-branch decision

The host prose enters one of four branches. Inputs are the detection
signal JSON above PLUS, when needed, a separate `review-config-
validator.ts` call. Drift detection is Phase B-N and not yet wired —
v1 cannot drive the (3) drift branch on its own (the placeholder
`drift_reason` field was removed in PR #251 round 3 to avoid
versioning policy violation).

| Branch | Entry condition | Action |
|---|---|---|
| **(1) first-run interactive** | `config_parse_error == null` AND `review_block_declared == false` AND interactive environment | Run the chain in Step 3, persist to `.onto/config.yml` per Q-Persist, then dispatch under the axis block. |
| **(2) subsequent run reminder** | `review_block_declared == true` AND `validateReviewConfig()` passes AND no drift detected | Emit a 1-line STDERR reminder of the active axes, then dispatch under the axis block. |
| **(3) drift re-selection** | `review_block_declared == true` AND drift detected (Phase B-N — not active under Phase B-1) | Show drift cause, then re-enter the Step 3 chain with the option to overwrite. |
| **(4) non-interactive fail-fast** | `config_parse_error != null` OR (`review_block_declared == false` AND interactive unavailable) | Print a clear error and exit. Do NOT silently fall through to a degraded path. |

`config_parse_error` precedence: when non-null, branch (4) regardless
of `review_block_declared`. Two non-null cases (contract §3.2):
- YAML parser threw — message starts with `Failed to parse YAML:`
- Root parsed but is not a plain object (scalar / null / array) —
  message starts with `Config root is not a YAML object:`

Both cases mean "config exists but is unusable", which is fix-the-file,
not first-run.

### Step 3 — host adapter for the interactive chain

The 4-question chain lives in host prose, not in TS runtime. The
actual input tool is host-specific; the prose stays neutral and the
host agent maps the abstract action ("ask the subject for a choice")
to its native tool:

| Host | Tool | Min version / mode |
|---|---|---|
| Claude Code | `AskUserQuestion` | Built-in, always available; called from the slash command. |
| Codex CLI | `request_user_input` | Codex `>= 0.106.0`. **Plan Mode is the default path**; Default Mode had silent-failure reports through v0.121.0 — opt-in only after local verification. |
| Plain terminal (no host LLM) | — | Branch (1) is unreachable — fall back to branch (4) fail-fast. |

The minimum-version guard: when invoked under Codex CLI, parse `codex
--version`. If `< 0.106.0`, halt the chain with an upgrade message
(`npm install -g @openai/codex@latest`) before reaching Q-Teamlead.

### Step 4 — the 4 questions

One question per call (each answer narrows the next question's option
set, so they cannot be batched). Skip rules at the top.

**Skip rules**:
- `Q-Teamlead == "external codex subprocess"` → skip Q-Subagent (subagent
  is fixed to `codex`).
- `Q-Subagent == "main-native"` → skip Q-Effort (host-managed).

**Q-Teamlead** — "where should the teamlead run?"

| Option | Available when |
|---|---|
| `main` (host session, recommended) | `host_detected == "claude-code"` OR `host_detected == "codex"` |
| `external codex subprocess` | `codex.binary_on_path && codex.auth_file_present` |

If neither is available (plain terminal + no codex), guide before
fail-fast: "Re-run inside Claude Code, OR install codex CLI."

**Q-Subagent** — "what runs each lens?"

Filtered by Q-Teamlead and the credential signals:

| Option | Available when |
|---|---|
| `main-native` (host's native subagent, recommended) | Q-Teamlead = `main` |
| `codex` | `codex.binary_on_path && codex.auth_file_present` |
| `anthropic` | `credentials.env_has_anthropic_api_key` |
| `openai` | `credentials.env_has_openai_api_key OR credentials.codex_auth_has_openai_api_key` |
| `litellm` | `litellm_base_url_set` (or `llm_base_url` set in config) |

Q-Teamlead = `external codex subprocess` fixes Q-Subagent to `codex`
(skip).

**Q-Effort** — "reasoning effort level?"

Domain depends on Q-Subagent's provider:

| Provider | Domain | Recommended |
|---|---|---|
| `main-native` | (skip — host-managed) | — |
| `codex` | `minimal` \| `low` \| `medium` \| `high` \| `xhigh` | `high` |
| `anthropic` | thinking budget preset: `off` \| `standard` \| `high` | `high` |
| `openai` | `low` \| `medium` \| `high` | `high` |
| `litellm` | provider pass-through (model-specific subset) | — |

**Q-Persist** — "how to use this choice?"

| Option | Effect |
|---|---|
| 1. **Use this run only** (default, reversible) | No config change. Pass the choice through `ONTO_REVIEW_CONFIG_OVERRIDE` env or per-axis CLI flags for this invocation only. |
| 2. **Save (set as default)** | `npm run onboard:write-review-block -- .onto/config.yml '<json>'`. On the **drift re-selection** branch, this option's label is "Save (overwrite existing)". |

Cancel path: when the host's input tool returns `Other → cancel`,
abort the review immediately. The next invocation re-enters from the
same question. Persisted config is never modified by a cancel.

### Step 5 — CLI override surface (per-axis flags)

Each axis exposes a flag for one-shot override without entering the
chain. `--save-choice` paired with any of these persists the same
choice to the axis block. `--reselect` ignores the saved config and
forces the chain to re-run.

| Flag | Axis | Example |
|---|---|---|
| `--teamlead <main\|codex>` | A. Teamlead | `--teamlead codex` |
| `--subagent-provider <name>` | B. Subagent provider | `--subagent-provider codex` |
| `--subagent-model <id>` | B. model_id | `--subagent-model gpt-5.4` |
| `--effort <value>` | F. Effort (provider domain) | `--effort high` |
| `--max-concurrent-lenses <n>` | C. Concurrency | `--max-concurrent-lenses 6` |
| `--lens-deliberation <mode>` | E. Deliberation | `--lens-deliberation sendmessage-a2a` |
| `--save-choice` | Persist toggle | (paired with above) |
| `--reselect` | Ignore saved config and re-run the chain | (no value) |

`--codex` is preserved as backward-compat shorthand for `--teamlead
main --subagent-provider codex`.

### Step 6 — non-interactive behavior (CI / background agents)

When `AskUserQuestion` / `request_user_input` is unreachable (CI, bg
agent, headless CLI without TTY):

- `review_block_declared == true` AND no drift → dispatch normally
  (same as branch 2).
- `review_block_declared == false` → fail-fast. Message:
  ```
  [review] .onto/config.yml has no review block.
           Run /onto:review once in an interactive environment to
           pick and save axes, OR pass per-axis flags
           (--teamlead ... --subagent-provider ... --effort ...)
           explicitly.
           Example: .onto/config.yml.example
  ```
- `config_parse_error != null` → fail-fast with the parser error and
  fix-the-file guidance.

The pre-Phase-B-2 "silent main_native degrade" path is the explicit
non-goal of this design — every fall-through must surface a single
visible message so the principal sees which decision the runtime
made (or could not make).

---

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
4. Resolver emits `[topology] topology source=review-axes id=<id>` and matches the id.
5. Any failure (validation / derivation / mapping) → universal fallback: degrade to `main_native` shape with `[topology] degraded: requested=... → actual=main_native (reason: ...)`. If `main_native` itself is unmappable (neither Claude nor Codex host present), the resolver fails fast with `no_host` — **the legacy priority ladder was retired in P9.1 (2026-04-21) and no longer participates in fallback**.

Use `onto config show` / `onto config validate` to preview the derivation before running a review. Design-integrity audit: `development-records/audit/20260421-shape-pipeline-audit.md`.

> **Legacy execution paths removed from prose (P7, 2026-04-21)** — The
> pre-redesign 3-path guidance (Agent Teams / Main-session / Codex CLI)
> and sketch v3's 10-topology priority ladder are folded into the 6-axis
> block above. P9.1 (2026-04-21) retired the runtime priority ladder:
> `execution_topology_priority` is still accepted by the config loader
> (field removal lands in P9.2) but has **no runtime effect** — the
> resolver acknowledges its presence with a single `[topology] legacy
> … ignored` line. Migration: `docs/topology-migration-guide.md` §7.

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
- `.onto/processes/review/productized-live-path.md`
- `.onto/processes/review/nested-spawn-coordinator-contract.md`
- `.onto/processes/review/interpretation-contract.md`
- `.onto/processes/review/binding-contract.md`
- `.onto/processes/review/execution-preparation-artifacts.md`
- `.onto/processes/review/lens-prompt-contract.md`
- `.onto/processes/review/synthesize-prompt-contract.md`
- `.onto/processes/review/prompt-execution-runner-contract.md`
- `.onto/processes/review/record-contract.md`
- `.onto/processes/review/record-field-mapping.md`
- `.onto/processes/review/review.md`

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
