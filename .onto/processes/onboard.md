# Onboarding Process

> Sets up the onto plugin environment for a project. Run once at initial setup.
> Related: After onboarding, all commands such as `/onto:review`, `/onto:ask-{dimension}` become available.

Sets up the onto environment for the project.

### 0. Legacy Migration Check (auto-detect)

Before diagnosis, check if this project used the deprecated `onto-review` plugin:

| Check | Path | Action |
|---|---|---|
| Project-level legacy data | `{project}/.onto-review/` | If exists → migrate to `{project}/.onto/` |
| Global-level legacy data | `~/.onto-review/` | If exists → migrate to `~/.onto/` |

**If `.onto-review/` is detected, execute migration automatically:**

1. **Project-level migration** (`{project}/.onto-review/` → `{project}/.onto/`):
   - `config.yml` → copy to `.onto/config.yml` (add `output_language: en` if missing)
   - `learnings/` → copy all files to `.onto/learnings/`
   - `review/` → copy all session directories to `.onto/review/`
   - `builds/` → copy all build directories to `.onto/builds/`
   - `buildfromcode/` → copy to `.onto/buildfromcode/` (if exists)

2. **Global-level migration** (`~/.onto-review/` → `~/.onto/`):
   - `learnings/` → copy to `~/.onto/learnings/`
   - `communication/` → copy to `~/.onto/communication/`
   - `domains/` → copy to `~/.onto/domains/` (skip files that already exist at destination)

3. **Rename legacy directory**: `{project}/.onto-review/` → `{project}/.onto-review-backup/` (preserve, do not delete)

4. **Report**: "Migrated from `.onto-review/` to `.onto/`. Legacy data preserved at `.onto-review-backup/`."

5. **Translation of learnings** (if content is in Korean): If learning files contain Korean text (detected by presence of Korean characters), translate them to English using `.onto/authority/translation-reference.yaml` as SSOT. Preserve dates, project names, tags, and markdown structure.

After migration, proceed to Step 1 with the migrated data in place.

### 1. Status Diagnosis

Checks the following items in order:

| Check Item | Path | Status Value |
|---|---|---|
| Project learning directory | `{project}/.onto/learnings/` | exists / does not exist |
| Domain declaration | `{project}/.onto/config.yml` `domains:` or `domain:`/`agent-domain:` in `{project}/CLAUDE.md` | declared / not declared |
| Global domain documents | `~/.onto/domains/{domain}/` for each declared domain | exists / does not exist / N/A (domains not declared) |
| Global agent memory | Subdirectories under `~/.onto/` | list of existing files |
| Codex CLI | `codex --version` | installed (version) / not installed |
| Codex execution mode | `{project}/.onto/config.yml` `execution_mode:` | codex / agent-teams / not declared |

### 2. User Confirmation

Presents the diagnosis results in the format below and confirms whether to proceed:

```markdown
## Onto Onboarding Diagnosis

| Item | Status | Action |
|---|---|---|
| Project learning directory | {status} | {to be created / already exists} |
| Domain declaration | {status} | {to be asked / already declared: {domains list}} |
| Global domain documents | {status per domain} | {guidance to be provided / already exists} |
| Codex CLI | {installed v{version} / not installed} | {setup to be offered / already available} |
| Execution mode | {codex / agent-teams / not declared} | {to be asked / already configured} |

Proceed?
```

### 3. Environment Setup

Executes the following upon user approval:

**3.1 Output language configuration**
- Asks the user first: "What language should agent output be in? (e.g., `en`, `ko`, `ja`) Default: `en`"
- Creates `.onto/config.yml` with `output_language: {language}` as the first entry.
- All subsequent onboarding messages are delivered in the configured language.
- Full OntoConfig key surface: `.onto/processes/configuration.md` (SSOT)

**3.2 Create project learning directory**
- Creates `.onto/learnings/` directory if it does not exist.
- Creates `.onto/learnings/.gitkeep` file (for Git tracking of empty directories).

**3.3 Domain configuration**
- If `domains:` is not declared in `.onto/config.yml` (and no `domain:`/`agent-domain:` in CLAUDE.md), asks the user:
  "Which domains are relevant to this project? You can specify multiple. (e.g., `software-engineering`, `ontology`) Order does not matter. If unsure, you can skip and select domains per review."
- If the user specifies domains, adds `domains:` list to `.onto/config.yml`. Does not modify CLAUDE.md.
  ```yaml
  domains:
    - software-engineering
    - ontology
  ```
- If the user says 'none' or 'skip': omit `domains:` from config.yml (domains will be selected per session).
- **Old format detection**: If `.onto/config.yml` has `domain:` + `secondary_domains:`, convert to `domains:` unordered set and notify the user of the migration.

**3.4 Install global domain documents**
- If global documents for the specified domain (`~/.onto/domains/{domain}/`) are missing or incomplete:
  1. Checks whether default documents for the domain exist in the plugin's `.onto/domains/` directory.
  2. If they exist, suggests installation:
     "Default documents for domain `{domain}` are included in the plugin ({N} files). Install them? Existing learnings will be preserved."
  3. Upon user approval: copies default documents (*.md) from the plugin's `.onto/domains/{domain}/` to `~/.onto/domains/{domain}/`. Also creates the `learnings/` directory. Skips files with identical content.
  4. If the domain does not exist in the plugin, suggests seed creation:
     "Domain documents for `{domain}` are not included in the plugin. Would you like to generate seed documents? (`/onto:create-domain {domain} {description}`). Seeds are LLM-generated drafts that improve through review experience."
     Upon user approval: execute the create-domain process (`.onto/processes/create-domain.md`). If declined: skip (domain documents can be created later).
- Repeats the installation check for each domain in the `domains:` list.

> **Note**: Default domains included in the plugin can be installed in bulk via `setup-domains.sh --all`, or selectively via `setup-domains.sh {domain1} {domain2}`.

**3.5 Global learning status notification**
- If global learnings (`~/.onto/learnings/`) exist, notifies:
  "There are {N} global learnings for domain `{domain}`. Verification experience accumulated from previous projects will also be utilized in reviews for this project."
- If none exist, does not notify.

**3.6 Domain scope document draft generation**
- `domain_scope.md` is the core reference document for coverage (scope-defining — role rendered ineffective if absent).
- If `~/.onto/domains/{domain}/domain_scope.md` does not exist, suggests draft generation to the user:
  "The scope document (domain_scope.md) for domain `{domain}` does not exist. This document serves as the basis for identifying 'what should exist but is missing.' Generate a draft?"
- Upon user approval: generates a draft of domain sub-area lists, required concept categories, and reference standards/frameworks using project code/documents and LLM knowledge.
- Presents the draft to the user for revision/confirmation before saving.

**3.7 Codex execution mode setup (optional)**

Codex mode delegates reviewer passes to OpenAI Codex, reducing Claude token consumption by ~80%. The tradeoff: deliberation (agent-to-agent exchange) is structurally not possible.

- Ask: "Codex 모드를 사용하시겠습니까? Claude 토큰을 ~80% 절감할 수 있지만, 에이전트 간 숙의(deliberation)가 불가합니다. 현재 review 프로세스에서만 지원됩니다."

**If user selects yes:**

1. **Codex CLI installation check**: Run `codex --version`.
   - If installed: report version and proceed.
   - If not installed: suggest installation:
     "Codex CLI가 설치되어 있지 않습니다. 설치 방법:"
     - macOS: `brew install codex`
     - npm: `npm install -g @openai/codex`
     "설치 후 다시 진행하거나, `! brew install codex`로 지금 설치할 수 있습니다."
     Wait for user to install, then re-check.

2. **Authentication check**: Run `codex --version` (authenticated state is verified when Codex attempts a task; there is no dedicated auth-check command). Suggest: `! codex login` for the user to authenticate interactively.
   - "Codex 인증이 필요합니다. `! codex login`을 실행하여 ChatGPT 구독 또는 OpenAI API 키로 로그인하세요."
   - Wait for user confirmation that login is complete.

3. **Base configuration check**: Check if `~/.codex/config.toml` exists and contains `model` and `model_reasoning_effort` fields.
   - If config exists with both fields: report current settings (e.g., "model = gpt-5.4, effort = xhigh").
   - If config is missing or incomplete: suggest defaults:
     "Codex 기본 설정이 없습니다. 권장 설정을 적용하시겠습니까?"
     ```toml
     model = "gpt-5.4"
     model_reasoning_effort = "xhigh"
     ```
     Upon user approval: create/update `~/.codex/config.toml` (preserve existing entries).

4. **Project config update**: Add `execution_mode` and `codex` block to `.onto/config.yml`:
   ```yaml
   execution_mode: codex
   codex:
     model: gpt-5.4        # override per-project, or omit to use ~/.codex/config.toml
     effort: xhigh          # override per-project, or omit to use ~/.codex/config.toml
   ```
   - Ask user whether to set per-project overrides or rely on global `~/.codex/config.toml` defaults.
   - If user chooses global defaults: add only `execution_mode: codex` (omit `codex:` block).

5. **Verification**: Confirm Codex is ready, in this priority order:
   1. **Env var (preferred contract)**: If `$CODEX_COMPANION_PATH` is set and points to an existing file, run `node "$CODEX_COMPANION_PATH" setup --check 2>/dev/null` and parse `ready: true` from the JSON output. (Codex plugin owners are expected to export this env var as the canonical cross-plugin handoff. Until they do, fall through to the slash-command path.)
   2. **Slash command (fallback)**: Otherwise, invoke the `/codex:setup` slash command via the Skill tool. The codex plugin is the canonical source of its readiness check; delegating to its slash command keeps onto out of `${CLAUDE_PLUGIN_ROOT}` cross-plugin path resolution. (Why not hardcode `${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs`? That variable expands to the *onto* plugin root, where no `scripts/codex-companion.mjs` exists — the file lives in the codex plugin. Hardcoding the path crosses a plugin boundary that Claude Code's variable expansion does not.)
   - If verification succeeds: "Codex 모드가 정상적으로 설정되었습니다."
   - If verification fails: "Codex 연결에 실패했습니다. `/codex:setup`으로 상세 진단을 실행하세요." Set `execution_mode` back to `agent-teams` in config.yml.

**If user selects no/skip:** No changes. Default `execution_mode` remains `agent-teams`.

**3.8 Review execution axes (design doc §5 — Review UX Redesign P4)**

This step replaces the older single-axis `execution_mode` question with the 6-axis review block introduced by the Review UX Redesign. When the project's `.onto/config.yml` already has a `review:` block, skip this step unless the user passes `--re-detect` (design doc §5.3).

The stage has three sub-parts: **automatic detection**, **interactive selection**, **config write**. The onboard session delegates detection + write to two helper scripts so the prose stays short and deterministic.

**3.8.1 Automatic detection (design doc §5.2 stages 1–4)**

Run the detection helper and parse the JSON output:

```bash
npm run onboard:detect-review-axes --silent
```

Output shape:
```json
{
  "detected": {
    "host": "claude-code" | "codex-cli" | "plain-terminal",
    "agent_teams_available": true | false,
    "codex_available": true | false,
    "litellm_endpoint": "http://..." | null
  }
}
```

Show the detected signals to the user in a short summary:

```markdown
## Review execution — detected environment

| Axis | Detected |
|---|---|
| Host session | {host} |
| Agent teams env (D) | {agent_teams_available} |
| Codex binary available | {codex_available} |
| LiteLLM endpoint | {litellm_endpoint or "not configured"} |
```

**3.8.2 Subagent provider 선택 (design doc §5.2 stage 5)**

Present the enumerated options (filtered by detection — e.g. skip `codex` option when `codex_available=false`). Default is `main-native`.

- `main-native` — default. No extra fields. Works on every host.
- `codex` — only offer when `detected.codex_available=true`. Ask for `model_id` (default `gpt-5.4`) + `effort` (default `high`) + `max_concurrent_lenses` (default `6`).
- `anthropic` — ask for `model_id` (e.g. `claude-opus-4.7`) + `max_concurrent_lenses` (default: total lens count, currently `9`; substitute the concrete integer). Requires `ANTHROPIC_API_KEY`.
- `openai` — ask for `model_id` + `max_concurrent_lenses` (default: total lens count, currently `9`; substitute the concrete integer). Requires `OPENAI_API_KEY`.
- `litellm` — only offer when `detected.litellm_endpoint` is non-null. Ask for `model_id` + `max_concurrent_lenses` (default `1`).

> **`max_concurrent_lenses` must be a positive integer.** The validator rejects strings and non-integer numbers, so substitute the literal count (e.g. `9`) before composing the JSON. Design doc §2.3 uses the token `num_lenses` as shorthand for "all currently configured lenses, executed in parallel" — the actual value at the time of writing is **9** (the 9-lens review set).

If the user chose a foreign provider that requires an API key and the key is missing, report this but do NOT block — the user may supply the key out-of-band.

**3.8.3 Deliberation 선택 (design doc §5.2 stage 6)**

Only ask when `detected.agent_teams_available=true` AND the chosen teamlead is `main` (the default; foreign teamlead overrides skip this). Present:

- `synthesizer-only` (default) — lenses write independent verdicts; synthesizer reconciles.
- `sendmessage-a2a` — lenses exchange messages during deliberation (requires agent teams env).

Skip this step silently when `agent_teams_available=false` and force `synthesizer-only` (the validator would reject `sendmessage-a2a` anyway).

**3.8.4 Config 쓰기 (design doc §5.2 stage 7)**

Build the `OntoReviewConfig` object from the user's answers. Examples:

Minimal (universal fallback — matches the absent-block default):
```json
{"teamlead":{"model":"main"},"subagent":{"provider":"main-native"}}
```

Claude Code + Codex subagent + teams env (recommended when all three are detected):
```json
{"teamlead":{"model":"main"},"subagent":{"provider":"codex","model_id":"gpt-5.4","effort":"high"},"max_concurrent_lenses":6,"lens_deliberation":"synthesizer-only"}
```

Invoke the write helper, passing `--strip-legacy-priority` when the file currently has an `execution_topology_priority` entry (so the migrated config has a single source of truth):

```bash
npm run onboard:write-review-block --silent -- .onto/config.yml '<JSON>' --strip-legacy-priority
```

The helper returns a JSON result on stdout:
```json
{"ok":true,"path":"/abs/path/.onto/config.yml","created":false,"replacedExistingBlock":false,"strippedLegacyPriority":true}
```

If `strippedLegacyPriority=true`, print the deprecation notice:

> `execution_topology_priority` 필드가 발견되어 제거되었습니다. 이제 `review:` block 이 설정의 정본입니다.

If the helper returns `{ok: false, errors: [...]}`, show each `{path, message}` entry verbatim and re-ask the relevant question. Do not proceed to step 4 until the write succeeds.

### 4. Completion Report

```markdown
## Onboard Complete

| Item | Result |
|---|---|
| `.onto/learnings/` | {created / already exists} |
| Domains | {domains list / none (select per session)} |
| Global domain documents | {N present per domain / not present (auto-accumulation pending)} |
| Execution mode | {codex / agent-teams (default)} |
| Review axes | {review block written / unchanged / skipped} |

### Next Steps
- `/onto:review {target}` — run agent panel review
- `/onto:review {target} --codex` — run review in Codex mode (if not set as default)
- `/onto:ask-{dimension} {question}` — individual expert query
- `/onto:create-domain {name} {desc}` — generate seed domain documents for a new domain
- `/onto:backup` — snapshot current learnings and domains for rollback
- `/onto:help` — full command reference
- When learnings accumulate, `/onto:promote` — promote project learnings to global-level
```
