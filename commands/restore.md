# Data Restore

Restores onto user data from a previous backup. If no argument, lists available backups.
$ARGUMENTS is the backup ID to restore.

Examples:
  `/onto:restore` — list available backups
  `/onto:restore 20260329-143022` — restore specific backup

A safety backup is automatically created before restoring.

Read `~/.claude/plugins/onto/process.md` (common definitions) and
`~/.claude/plugins/onto/processes/restore.md`, then execute.
