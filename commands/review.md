# Onto Review (9-Lens Review + Synthesize)

Reviews $ARGUMENTS with the 9-lens review structure and a separate synthesize stage.

During current productization work, this command must follow the **current repo-local source of truth**.
The installed plugin copy is only a packaged realization and must not override newer repo-local authority.

## Repo-local canonical bounded path

Preferred repo-local entrypoint:

- `npm run review:invoke -- ...`

Internal bounded path:

1. `검토 해석 (InvocationInterpretation)`
2. 사용자 확인 / 선택 확정
3. `npm run review:start-session -- ...`
4. `npm run review:run-prompt-execution -- ...`
   using:
   - `execution-plan.yaml`
   - `prompt-packets/*.prompt.md`
5. `npm run review:complete-session -- --project-root {project} --session-root "{session_root}" --request-text "{original user request}"`

The command surface should stay thin:
- do not restate detailed process prose here
- do not invent a parallel execution order here
- use this file only as the entrypoint instruction that points to the repo-local bounded path

**Domain selection**: Append `@{domain}` to specify a domain, or `@-` for no-domain mode. If omitted, the Domain Selection Flow runs interactively.

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
- `/onto:review drafts/palantir-foundry @-` — seed review (recommended for initial seed review)

Read the current repo copies of:
- `AGENTS.md`
- `dev-docs/review-productized-live-path.md`
- `dev-docs/review-interpretation-contract.md`
- `dev-docs/review-binding-contract.md`
- `dev-docs/review-execution-preparation-artifacts.md`
- `dev-docs/review-lens-prompt-contract.md`
- `dev-docs/review-synthesize-prompt-contract.md`
- `dev-docs/review-prompt-execution-runner-contract.md`
- `dev-docs/review-record-contract.md`
- `dev-docs/review-record-field-mapping.md`
- `processes/review.md`

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
11. Treat `review:prepare-session`, `review:materialize-prompt-packets`, `review:render-final-output`, and `review:finalize-session` as internal bounded steps unless a narrower replacement boundary is being debugged.
