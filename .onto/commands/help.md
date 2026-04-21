# Onto Help

Read `{project}/.onto/config.yml` to check `output_language:` (default: `en`).
Display the command reference below in the configured language.

---

## Onto Review — Command Reference

### Core Workflow

```
/onto:onboard                              Set up onto environment for a project
/onto:review {target}                      9-lens review + synthesize
/onto:review {target} --domain {name}      Review with specific domain (canonical)
/onto:review {target} --no-domain          Review without domain rules (canonical)
/onto:review {target} --codex              Use codex host runtime (Codex CLI path)
/onto:reconstruct {path|URL}               Reconstruct ontology from analysis target
                                           (4-step bounded path: start → explore → complete → confirm)
/onto:reconstruct confirm --session-id <id> --verdict passed|rejected
                                           Record Principal verification result
/onto:evolve {goal}                        Add new areas to existing target (brownfield)
/onto:evolve {goal} --domain {name}        Evolve with specific domain (canonical)
/onto:evolve {goal} --no-domain            Evolve without domain rules (canonical)
/onto:transform {file}                     Transform raw ontology to desired format
```

> **Legacy `@` domain syntax**: `@{domain}` and `@-` still work for backward compat. Note: `@filename` is also Claude Code's mention syntax — use `--domain` / `--no-domain` to avoid ambiguity.

### Domain Document Management

```
/onto:create-domain {name} {description}   Generate seed domain documents
/onto:feedback {domain}                    Feed learnings back into domain docs
/onto:promote-domain {domain}              Promote seed (drafts/ → domains/)
```

### Learning Management

```
/onto:promote                              Promote project learnings to global
```

### Data Management

```
/onto:backup                               Snapshot learnings + domains for rollback
/onto:backup "reason"                      Backup with reason
/onto:restore                              List available backups
/onto:restore {backup-id}                  Restore from specific backup
```

### Domain Selection

Each review/reconstruct/evolve selects a single **session domain**:

| Method | Canonical | Legacy (still works) | Behavior |
|--------|-----------|----------------------|----------|
| Explicit | `--domain {name}` | `@{domain}` | Uses specified domain |
| No-domain | `--no-domain` | `@-` | No domain rules applied |
| Interactive | (omit) | (omit) | Suggests domain, user confirms |

`--domain` and `--no-domain` are mutually exclusive (specifying both fails fast).
Legacy `@` syntax conflicts with Claude Code's `@filename` mention — prefer `--domain`/`--no-domain`.

### Execution Path

Onto review has **two canonical execution paths** (2026-04-13 policy):

| Path | Entrypoint | Executor |
|---|---|---|
| Codex CLI | `onto review ... --codex` | `codex` child process |
| Agent Teams nested spawn | `onto coordinator start ...` in a Claude Code session | Agent tool (nested) |

Claude CLI subagent, API executor, and 3-Tier fallback paths have been removed — Claude CLI authentication is unstable in the current environment, and only these two paths are supported.

### Domain Document Lifecycle

```
create-domain → drafts/{domain}/    Seed with SEED markers
      ↓
review drafts/{domain} @-          Review seed (no-domain recommended)
      ↓
feedback {domain}                  Feed learnings into seed
      ↓  (repeat until all SEED markers removed)
promote-domain {domain}            Move to domains/ (established)
      ↓
review {target} @{domain}          Use as verification standard
```

### Quick Start

1. **Set up**: `/onto:onboard`
2. **Review**: `/onto:review {file-or-design}`
3. **New domain**: `/onto:create-domain my-domain "description"`
4. **Ask one agent**: `/onto:ask-logic "Is there a contradiction in X?"`

### More Info

> Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

- README: `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/README.md`
- Authority docs: `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/authority/`
- Review contracts: `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/review/`
- Domain documents: `~/.onto/domains/`
