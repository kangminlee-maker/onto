<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=551c00323b69c12ce1f054bb59ff31a520b1f6f98e496da612a838a9bf8fd4e6 -->

# Data Backup

Creates a timestamped snapshot of onto user data (learnings, domains, drafts, communication) in $ARGUMENTS.
$ARGUMENTS is an optional reason for the backup.

Examples:
  `/onto:backup` — manual backup
  `/onto:backup "before learning cleanup"` — backup with reason

> Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/backup.md`, then execute.
