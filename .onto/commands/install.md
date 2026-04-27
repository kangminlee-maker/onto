<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=454902d6d6a31d38dd3dd39c96db568019617dae8bac34460dc85855c7c34f1c -->

# Onto Install

Runs the first-time setup wizard — chooses profile scope, review / learn providers, auth sources, and output language, then writes `config.yml`, `.env`, and `.env.example` to `~/.onto/` (global) or `<repo>/.onto/` (project).

> Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/install.md`, then execute.

> Run **once** after installing the plugin (or installing via `npm install -g onto-core`). Subsequent tuning is handled by `/onto:config edit` or `onto install --reconfigure`. Project-level initialization (domains, review execution axes) is a separate step: `/onto:onboard`.
