# Onto Review (8-Agent Panel Review)

Reviews $ARGUMENTS with the agent panel (team review).

**Domain selection**: Append `@{domain}` to specify a domain, or `@-` for no-domain mode. If omitted, the Domain Selection Flow runs interactively.

**Execution mode**: Append `--codex` to use Codex execution mode, or `--claude` to force Agent Teams mode. If omitted, uses config.yml `execution_mode` (default: `agent-teams`).

Examples:
- `/onto:review process.md @ontology` — Agent Teams mode (default)
- `/onto:review process.md @ontology --codex` — Codex mode
- `/onto:review src/ @- --codex` — Codex mode, no-domain
- `/onto:review drafts/palantir-foundry @-` — seed review (recommended for initial seed review)

Read `~/.claude/plugins/onto/process.md` (common definitions),
`~/.claude/plugins/onto/learning-rules.md` (learning storage rules), and
`~/.claude/plugins/onto/processes/review.md`, then execute.

**Execution mode resolution** (before starting the process):
1. Parse `--codex` or `--claude` from $ARGUMENTS (strip from arguments before passing to the process).
2. If neither flag → read `{project}/.onto/config.yml` `execution_mode` field.
3. If `codex` → verify Codex CLI readiness: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --check 2>/dev/null`. If unavailable → halt with guidance.
4. Resolved mode is passed to Step 2 of the review process.
