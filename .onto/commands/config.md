<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=0923618eea7f4c494d963016212fb391a3e1177c31466e2615785d8e75c23b55 -->

# Onto Config

Inspects or modifies the onto configuration chain (`~/.onto/config.yml` + `<project>/.onto/config.yml`). Repair-path: `onto config` can run even when bootstrap has failed, so that the configuration that caused the failure can be repaired without a working environment.

Subcommands (see contract doc for the full list): `show`, `validate`, `edit`, `repair`.

> Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/configuration.md`, then execute.
