<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=942383fc51736752f561e9798c047c16170e3d34cbb72abcf67abaa81d5d4269 -->

# Data Restore

Restores onto user data from a previous backup. If no argument, lists available backups.
$ARGUMENTS is the backup ID to restore.

Examples:
  `/onto:restore` — list available backups
  `/onto:restore 20260329-143022` — restore specific backup

A safety backup is automatically created before restoring.

Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/restore.md`, then execute.
