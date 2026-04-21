# Project Onboard

Sets up the onto plugin environment for the current project.

> Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/processes/onboard.md`, then execute.

> If the project is new to the Review UX Redesign schema (no `review:` block in `.onto/config.yml`) or the user passed `--re-detect`, include the §3.8 **Review execution axes** walkthrough — it detects host / agent-teams / codex / litellm signals, asks for subagent + deliberation preferences, and writes the `review:` block. Existing `.onto/config.yml` files without a `review:` block still work (universal fallback); the walkthrough is opt-in migration.
