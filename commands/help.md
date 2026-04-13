# Onto Help

Read `{project}/.onto/config.yml` to check `output_language:` (default: `en`).
Display the command reference below in the configured language.

---

## Onto Review — Command Reference

### Core Workflow

```
/onto:onboard                              Set up onto environment for a project
/onto:review {target}                      9-lens review + synthesize
/onto:review {target} @{domain}            Review with specific domain
/onto:review {target} @-                   Review without domain rules
/onto:review {target} --codex              Use codex host runtime (Codex CLI path)
/onto:build {path|URL}                     Build ontology from analysis target
/onto:design {goal}                        Design new areas for existing target (brownfield)
/onto:design {goal} @{domain}              Design with specific domain
/onto:design {goal} @-                     Design without domain rules
/onto:transform {file}                     Transform raw ontology to desired format
```

### Individual Agent Query

```
/onto:ask-logic {question}                 Logical consistency
/onto:ask-structure {question}             Structural completeness
/onto:ask-dependency {question}            Dependency integrity
/onto:ask-semantics {question}             Semantic accuracy
/onto:ask-pragmatics {question}            Pragmatic fitness
/onto:ask-evolution {question}             Evolution fitness
/onto:ask-coverage {question}              Domain coverage
/onto:ask-conciseness {question}           Conciseness
/onto:ask-axiology {question}              Purpose and value alignment
```

### Legacy Compatibility

```
/onto:ask-philosopher {question}           Legacy alias for /onto:ask-axiology (value-alignment only)
```

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

Each review/build/question selects a single **session domain**:

| Method | Syntax | Behavior |
|--------|--------|----------|
| Explicit | `@{domain}` | Uses specified domain |
| No-domain | `@-` | No domain rules applied |
| Interactive | (omit) | Suggests domain, user confirms |

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

- README: `~/.claude/plugins/onto/README.md`
- Authority docs: `~/.claude/plugins/onto/authority/`
- Review contracts: `~/.claude/plugins/onto/processes/review/`
- Domain documents: `~/.onto/domains/`
