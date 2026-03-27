# Onboarding Process

> Sets up the onto plugin environment for a project. Run once at initial setup.
> Related: After onboarding, all commands such as `/onto:review`, `/onto:ask-{dimension}` become available.

Sets up the onto environment for the project.

### 0. Legacy Migration Check (auto-detect)

Before diagnosis, check if this project used the deprecated `onto-review` plugin:

| Check | Path | Action |
|---|---|---|
| Project-level legacy data | `{project}/.onto-review/` | If exists → migrate to `{project}/.onto/` |
| Global-level legacy data | `~/.onto-review/` | If exists → migrate to `~/.onto/` |

**If `.onto-review/` is detected, execute migration automatically:**

1. **Project-level migration** (`{project}/.onto-review/` → `{project}/.onto/`):
   - `config.yml` → copy to `.onto/config.yml` (add `output_language: en` if missing)
   - `learnings/` → copy all files to `.onto/learnings/`
   - `review/` → copy all session directories to `.onto/review/`
   - `builds/` → copy all build directories to `.onto/builds/`
   - `buildfromcode/` → copy to `.onto/buildfromcode/` (if exists)

2. **Global-level migration** (`~/.onto-review/` → `~/.onto/`):
   - `learnings/` → copy to `~/.onto/learnings/`
   - `communication/` → copy to `~/.onto/communication/`
   - `domains/` → copy to `~/.onto/domains/` (skip files that already exist at destination)

3. **Rename legacy directory**: `{project}/.onto-review/` → `{project}/.onto-review-backup/` (preserve, do not delete)

4. **Report**: "Migrated from `.onto-review/` to `.onto/`. Legacy data preserved at `.onto-review-backup/`."

5. **Translation of learnings** (if content is in Korean): If learning files contain Korean text (detected by presence of Korean characters), translate them to English using `dev-docs/translation-reference.yaml` as SSOT. Preserve dates, project names, tags, and markdown structure.

After migration, proceed to Step 1 with the migrated data in place.

### 1. Status Diagnosis

Checks the following items in order:

| Check Item | Path | Status Value |
|---|---|---|
| Project learning directory | `{project}/.onto/learnings/` | exists / does not exist |
| Domain declaration | `{project}/.onto/config.yml` or `domain:` in `{project}/CLAUDE.md` | declared / not declared |
| Global domain document | `~/.onto/domains/{domain}/` | exists / does not exist / N/A (domain not declared) |
| Global agent memory | Subdirectories under `~/.onto/` | list of existing files |

### 2. User Confirmation

Presents the diagnosis results in the format below and confirms whether to proceed:

```markdown
## Onto Onboarding Diagnosis

| Item | Status | Action |
|---|---|---|
| Project learning directory | {status} | {to be created / already exists} |
| Domain declaration | {status} | {to be asked / already declared: {domain}} |
| Global domain document | {status} | {guidance to be provided / already exists} |

Proceed?
```

### 3. Environment Setup

Executes the following upon user approval:

**3.1 Output language configuration**
- Asks the user first: "What language should agent output be in? (e.g., `en`, `ko`, `ja`) Default: `en`"
- Creates `.onto/config.yml` with `output_language: {language}` as the first entry.
- All subsequent onboarding messages are delivered in the configured language.

**3.2 Create project learning directory**
- Creates `.onto/learnings/` directory if it does not exist.
- Creates `.onto/learnings/.gitkeep` file (for Git tracking of empty directories).

**3.3 Domain configuration**
- If `domain:` is not declared in either `.onto/config.yml` or CLAUDE.md, asks the user:
  "Please specify the domain for this project. (e.g., `healthcare`, `fintech`, `e-commerce`) If you want to verify using general principles only without domain rules, answer 'none'."
- If the user specifies a domain, adds `domain: {domain}` to `.onto/config.yml`. Does not modify CLAUDE.md.
- Also checks for secondary domains: "Are there secondary domains? (e.g., a healthcare project that also partially applies fintech rules) Answer 'none' if there are none."
- If secondary domains exist, adds `secondary_domains: {domain1}, {domain2}` to `.onto/config.yml`.

**3.4 Install global domain documents**
- If global documents for the specified domain (`~/.onto/domains/{domain}/`) are missing or incomplete:
  1. Checks whether default documents for the domain exist in the plugin's `domains/` directory.
  2. If they exist, suggests installation:
     "Default documents for domain `{domain}` are included in the plugin ({N} files). Install them? Existing learnings will be preserved."
  3. Upon user approval: copies default documents (*.md) from the plugin's `domains/{domain}/` to `~/.onto/domains/{domain}/`. Also creates the `learnings/` directory. Skips files with identical content.
  4. If the domain does not exist in the plugin, provides existing guidance:
     "Global rule documents for domain `{domain}` do not yet exist. Learnings will accumulate automatically through repeated reviews/queries. Let me know if you would like to define domain rules in advance."
- If secondary domains exist, performs the same installation check for secondary domains.

> **Note**: Default domains included in the plugin can be installed in bulk via `setup-domains.sh --all`, or selectively via `setup-domains.sh {domain1} {domain2}`.

**3.5 Global learning status notification**
- If global learnings (`~/.onto/learnings/`) exist, notifies:
  "There are {N} global learnings for domain `{domain}`. Verification experience accumulated from previous projects will also be utilized in reviews for this project."
- If none exist, does not notify.

**3.6 Domain scope document draft generation**
- `domain_scope.md` is the core reference document for onto_coverage (scope-defining — role rendered ineffective if absent).
- If `~/.onto/domains/{domain}/domain_scope.md` does not exist, suggests draft generation to the user:
  "The scope document (domain_scope.md) for domain `{domain}` does not exist. This document serves as the basis for identifying 'what should exist but is missing.' Generate a draft?"
- Upon user approval: generates a draft of domain sub-area lists, required concept categories, and reference standards/frameworks using project code/documents and LLM knowledge.
- Presents the draft to the user for revision/confirmation before saving.

### 4. Completion Report

```markdown
## Onboard Complete

| Item | Result |
|---|---|
| `.onto/learnings/` | {created / already exists} |
| Domain | {domain / none (general mode)} |
| Secondary domains | {domains / none} |
| Global domain document | {N present / not present (auto-accumulation pending)} |

### Next Steps
- `/onto:review {target}` — run agent panel review
- `/onto:ask-{dimension} {question}` — individual expert query
- When learnings accumulate, `/onto:promote` — promote project learnings to global-level
```
