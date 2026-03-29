# Onto Help

Display the command reference below to the user. Do not read any other files.

---

## Onto Review — Command Reference

### Core Workflow

```
/onto:onboard                              Set up onto environment for a project
/onto:review {target}                      Agent panel review (8+1 agents)
/onto:review {target} @{domain}            Review with specific domain
/onto:review {target} @-                   Review without domain rules
/onto:build {path|URL}                     Build ontology from analysis target
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
/onto:ask-philosopher {question}           Purpose alignment
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
- Design docs: `~/.claude/plugins/onto/dev-docs/`
- Domain documents: `~/.onto/domains/`
