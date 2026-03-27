# Structural Completeness Review — onto plugin

**Reviewer**: onto_structure
**Date**: 2026-03-28
**Target**: Full plugin structural integrity (`/Users/kangmin/cowork/onto/`)

---

## 1. File Path References in process.md

### 1.1 Process Map References (all valid)

| Referenced Path | Exists |
|---|---|
| `processes/onboard.md` | Yes |
| `processes/question.md` | Yes |
| `processes/review.md` | Yes |
| `processes/build.md` | Yes |
| `processes/transform.md` | Yes |
| `processes/promote.md` | Yes |

### 1.2 Role File References (all valid)

All agent IDs in the verification agents table correspond to existing files in `roles/`:
`onto_logic.md`, `onto_structure.md`, `onto_dependency.md`, `onto_semantics.md`, `onto_pragmatics.md`, `onto_evolution.md`, `onto_coverage.md`, `onto_conciseness.md`, `philosopher.md` -- all 9 files exist.

### 1.3 Domain Document References (all valid)

All 8 domain documents listed in the Domain Documents table exist in every domain directory:
`domain_scope.md`, `concepts.md`, `competency_qs.md`, `logic_rules.md`, `structure_spec.md`, `dependency_rules.md`, `extension_cases.md`, `conciseness_rules.md` -- present in all 9 domain directories.

### 1.4 Touch Point Checklist References (all valid)

All paths listed in the "Touch Point Checklist for Adding/Removing Agents" table point to existing files/patterns:
- `roles/{agent-id}.md` -- valid pattern
- `commands/ask-{dimension}.md` -- valid pattern
- `process.md` -- exists
- `processes/review.md` -- exists
- `dev-docs/BLUEPRINT.md` -- exists
- `README.md` -- exists

---

## 2. Cross-Reference Issues Between Files

### CRITICAL-1: `processes/question.md` references obsolete 3-path learning structure

`processes/question.md` still uses the **old 3-path learning model** that was replaced by the 2-path + axis tag model in `process.md`:

- **Line 12**: `~/.onto/methodology/{agent-id}.md` -- this path no longer exists in the current model. Should be `~/.onto/learnings/{agent-id}.md`.
- **Line 14**: `~/.onto/communication/{agent-id}.md` -- per-agent individual communication learning files are not part of the current model. `process.md` only defines `~/.onto/communication/common.md`.
- **Line 21**: `~/.onto/domains/{domain}/learnings/{agent-id}.md` -- this path is from the old model. Global learnings are now at `~/.onto/learnings/{agent-id}.md`.
- **Line 43**: Template section `[Past Learnings -- Methodology]` references `~/.onto/methodology/{agent-id}.md` -- same obsolete path.

The current model defined in `process.md` (lines 119-128) uses:
- Communication: `~/.onto/communication/common.md` (single file)
- Verification: `~/.onto/learnings/{agent-id}.md` (global) or `{project}/.onto/learnings/{agent-id}.md` (project)

### CRITICAL-2: `processes/build.md` line 942 references non-existent golden example files

- References `golden/object-types.yaml` and `golden/action-types.yaml` -- these files do not exist.
- Actual files in `golden/`: `b-action-centric.yaml`, `c-knowledge-graph.yaml`, `canonical.yaml`, `d-domain-driven.yaml`, `schema-b.yml`, `schema-c.yml`, `schema-d.yml`.
- The correct file for Schema B is likely `golden/b-action-centric.yaml` or `golden/schema-b.yml`.

### CRITICAL-3: `processes/onboard.md` line 64 references obsolete learning path

- References `~/.onto/domains/{domain}/learnings/` -- this is the old per-domain learning path.
- Current model stores global learnings at `~/.onto/learnings/{agent-id}.md` (not under domains).

### RECOMMENDED-1: README.md missing `/onto:ask-conciseness` command

README.md Individual Query table (lines 93-100) lists 8 ask-commands but omits `/onto:ask-conciseness`. The file `commands/ask-conciseness.md` exists and is functional. This is the only command file not referenced in README.md.

### RECOMMENDED-2: README.md Domain Documents section says "7 types" but there are 8

README.md line 255 states "Domain Documents (7 types)" and the table lists 7 documents. However, `process.md` lists 8 domain documents -- `conciseness_rules.md` (mapped to `onto_conciseness`) is missing from the README table. Each domain directory actually contains 8 document files (7 standard + `conciseness_rules.md`).

### RECOMMENDED-3: `dev-docs/BLUEPRINT.md` uses obsolete 3-path learning model

BLUEPRINT.md (lines 496-504, 722-734) still describes the old 3-path model:
- `~/.onto/methodology/{agent-id}.md` (line 503)
- `~/.onto/domains/{domain}/learnings/{agent-id}.md` (line 504)
- `~/.onto/communication/{agent-id}.md` (per-agent individual) (line 722)
- `~/.onto/methodology/` directory tree (line 723)
- `~/.onto/domains/{domain}/learnings/` directory tree (line 733)

These should be updated to match the current 2-path + axis tag model in `process.md`.

### RECOMMENDED-4: Two domains (`ui-design`, `visual-design`) exist on disk but are not listed in README.md

Actual domain directories: 9 (accounting, business, finance, llm-native-development, market-intelligence, ontology, software-engineering, **ui-design**, **visual-design**)

README.md domain table lists only 7, omitting `ui-design` and `visual-design`.

### RECOMMENDED-5: `domains/llm-native-development/prompt_interface.md` is an extra file

This domain has 9 files (8 standard + `prompt_interface.md`). The file `prompt_interface.md` is not part of the standard domain document schema defined in `process.md`. It is only mentioned in `dev-docs/BLUEPRINT.md` line 642.  This is not necessarily an error -- it may be an intentional domain-specific extension -- but it is not documented in `process.md`'s domain document table.

### RECOMMENDED-6: README.md directory tree omits `migrate-learnings.sh`

The directory tree in README.md (lines 189-221) lists `migrate-sessions.sh` but not `migrate-learnings.sh`. The file exists at the project root and is referenced in the README migration section (line 296), creating an inconsistency between the tree and the actual file listing.

---

## 3. Orphaned Files Check

All `.md` files are referenced somewhere except:
- `commands/ask-conciseness.md` -- not referenced by name in any other `.md` file (covered by RECOMMENDED-1 above)

All other files have at least one reference from another file.

---

## 4. Commands/*.md -> Process File Path Verification

| Command File | References | Exists |
|---|---|---|
| `commands/ask-conciseness.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-coverage.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-dependency.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-evolution.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-logic.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-philosopher.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-pragmatics.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-semantics.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/ask-structure.md` | `process.md`, `processes/question.md` | Yes, Yes |
| `commands/build.md` | `process.md`, `processes/build.md` | Yes, Yes |
| `commands/onboard.md` | `process.md`, `processes/onboard.md` | Yes, Yes |
| `commands/promote.md` | `process.md`, `processes/promote.md` | Yes, Yes |
| `commands/review.md` | `process.md`, `processes/review.md` | Yes, Yes |
| `commands/transform.md` | `process.md`, `processes/transform.md` | Yes, Yes |

All command files reference valid process files.

---

## 5. README.md Directory Tree vs. Actual Structure

| Item in README Tree | Actual | Status |
|---|---|---|
| `process.md` | Exists | OK |
| `processes/review.md` | Exists | OK |
| `processes/question.md` | Exists | OK |
| `processes/build.md` | Exists | OK |
| `processes/transform.md` | Exists | OK |
| `processes/onboard.md` | Exists | OK |
| `processes/promote.md` | Exists | OK |
| `roles/onto_logic.md` | Exists | OK |
| `roles/onto_structure.md` | Exists | OK |
| `roles/onto_dependency.md` | Exists | OK |
| `roles/onto_semantics.md` | Exists | OK |
| `roles/onto_pragmatics.md` | Exists | OK |
| `roles/onto_evolution.md` | Exists | OK |
| `roles/onto_coverage.md` | Exists | OK |
| `roles/onto_conciseness.md` | Exists | OK |
| `roles/philosopher.md` | Exists | OK |
| `explorers/` | Exists (4 files) | OK |
| `domains/` | Exists (9 dirs) | OK (but README lists 7 domains) |
| `golden/` | Exists (7 files) | OK |
| `dev-docs/BLUEPRINT.md` | Exists | OK |
| `dev-docs/KNOWN-ISSUES.md` | Exists | OK |
| `dev-docs/DESIGN-build-generalization.md` | Exists | OK |
| `dev-docs/philosophical-foundations-of-ontology.md` | Exists | OK |
| `commands/` | Exists (14 files) | OK |
| `setup-domains.sh` | Exists | OK |
| `migrate-sessions.sh` | Exists | OK |
| `migrate-learnings.sh` | **Missing from tree** | RECOMMENDED-6 |
| `.claude-plugin/` | Exists | OK |

---

### Findings Summary
- Critical: 3
- Recommended: 6
