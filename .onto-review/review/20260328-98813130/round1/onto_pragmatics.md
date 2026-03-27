# onto_pragmatics -- Pragmatic Fitness Review (English Translation)

**Reviewer**: onto_pragmatics (pragmatic fitness verifier)
**Target**: Translated onto plugin -- English usability for new users
**Date**: 2026-03-28
**Session**: 20260328-98813130

---

## 1. README.md -- Can a new English-speaking user onboard successfully?

**Verdict: Largely yes, with friction points.**

The README is well-structured and covers installation, update, domain setup, agent configuration, commands, review flow, build flow, directory structure, learning system, and migration. A new user can follow the Getting Started section at the bottom to begin using the plugin.

### Findings

- **[R1] Getting Started is buried at the bottom.** The most actionable section for a new user ("Getting Started") appears at line 306, after migration scripts, learning system internals, and domain document taxonomy. A first-time reader must scroll past ~300 lines of system internals before finding the four commands they need. This creates an unnecessarily high onboarding barrier.

- **[R2] "Integral exploration" is unexplained jargon.** The term appears 4 times in the README (lines 9, 105, 133, 177) but is never defined for someone unfamiliar with the concept. The diagram at line 136 helps, but the term itself is opaque. A one-sentence definition on first use would resolve this.

- **[R3] "Competency question" is used without definition.** In the Agent Configuration table (line 77), onto_pragmatics is described as "Queryability, competency question testing." A user unfamiliar with ontology engineering will not know what a competency question is. The term also appears in process.md and roles/onto_pragmatics.md without explanation.

- **[R4] K-IFRS in domain table is Korea-specific.** Line 66 lists `accounting` domain as "K-IFRS, double-entry bookkeeping, tax adjustments, auditing." K-IFRS (Korean International Financial Reporting Standards) is meaningful only to users operating under Korean accounting standards. For an English-speaking audience, this should either be generalized to "IFRS" or explicitly noted as Korea-specific.

- **[C1] Migration section assumes prior version usage.** Lines 26-35 discuss migration scripts without first stating "Skip this section if you are installing for the first time." A new user may wonder whether they need to run these scripts. The sentence at line 284 ("Automatically skipped if no previous data exists") helps, but it appears 250 lines after the migration instructions.

## 2. Command Files (commands/review.md, commands/build.md) -- Clear enough without Korean?

**Verdict: Yes, but minimal.**

Both files are extremely short (6-7 lines each). They identify the command name, describe what it does in one sentence, and point to the process files for execution details. There is no residual Korean.

### Findings

- **[R5] Command files provide no inline usage examples.** `commands/review.md` says "Reviews $ARGUMENTS with the agent panel" but does not show what a valid $ARGUMENTS looks like. A user seeing `/onto:review` for the first time cannot tell whether to pass a file path, a directory, a concept name, or a URL. `commands/build.md` is slightly better ("$ARGUMENTS specifies the target directory/file"), but an example like `/onto:build src/` would eliminate guesswork.

## 3. process.md -- Does it read naturally in English?

**Verdict: Yes, the English reads naturally with no translationese detected in the first 50 lines.**

The prose is direct and technical. Sentences like "These agents are not a MECE classification but a set of empirically validated independent verification perspectives" read as native English. The table structures are clean. The term "MECE" (Mutually Exclusive, Collectively Exhaustive) is used without expansion, but this is standard consulting/analytical vocabulary and acceptable for the target audience (people building ontologies or reviewing systems).

### Findings

- No translationese issues detected. The writing is concise and idiomatic.

## 4. Role Files (roles/onto_logic.md, roles/onto_pragmatics.md) -- Clear about scope and boundaries?

**Verdict: Yes, these are well-written role definitions.**

Each role file follows a consistent structure: Specialization, Role, Core questions, Boundary (NOT responsible for), Domain examples, Domain document reference. The boundary section is particularly valuable -- it explicitly names which other agent handles what this agent does not. This prevents overlap confusion.

### Findings

- **[R6] "Boundary -- NOT responsible for" uses an unconventional heading format.** The double-dash with spaces ("Boundary -- NOT responsible for") reads slightly awkwardly. A more natural English heading would be "Boundary: Not Responsible For" or "Out of Scope." This is a minor style issue.

- The domain examples (Software, Law, Accounting) effectively demonstrate cross-domain applicability. No issues detected.

## 5. processes/review.md -- Can someone execute a team review without ambiguity?

**Verdict: Mostly yes, for a user already familiar with Claude Code Agent Teams.**

The first 50 lines cover Context Gathering (step 1) and the beginning of Team Creation + Round 1 (step 2). Instructions are procedural and specific: session ID format, directory creation path, TeamCreate parameters, and teammate creation approach are all spelled out.

### Findings

- **[C2] Step 2 assumes knowledge of "Agent Teams" and "TeamCreate."** Line 6 says "Follows the Agent Teams Execution in process.md" and line 44 references "TeamCreate" as a known operation. A user unfamiliar with Claude Code's Agent Teams feature will not know what these are. Since this is a plugin for Claude Code, this assumption may be intentional, but a brief note like "(see Claude Code documentation for Agent Teams)" would help users who encounter this feature for the first time through the onto plugin.

- The file-path conventions (`{project}/.onto/review/{session ID}/round1/`) are clear and concrete. Session ID generation uses a specific shell command, removing ambiguity.

---

## Pragmatic Fitness Assessment

The translated plugin is **usable by English-speaking users** with the current text. The English is natural, not machine-translated-sounding. The main barriers to onboarding are structural (Getting Started placement, missing definitions for domain-specific terms) rather than linguistic.

The role definitions are the strongest part of the translation -- they are precise, boundary-aware, and illustrated with cross-domain examples. The command files are functional but could benefit from inline examples.

---

### Findings Summary
- Critical: 2
- Recommended: 6

| ID | Severity | Location | Finding |
|---|---|---|---|
| C1 | Critical | README.md lines 26-35 | Migration section lacks "skip if new install" guidance; new users may run unnecessary scripts |
| C2 | Critical | processes/review.md line 6, 44 | "Agent Teams" and "TeamCreate" are used without explanation or reference link |
| R1 | Recommended | README.md line 306 | Getting Started section should be moved higher (after Installation) |
| R2 | Recommended | README.md lines 9, 105, 133, 177 | "Integral exploration" needs a one-sentence definition on first use |
| R3 | Recommended | README.md line 77; roles/onto_pragmatics.md | "Competency question" is undefined for non-ontology users |
| R4 | Recommended | README.md line 66 | K-IFRS is Korea-specific; generalize to IFRS or add clarification |
| R5 | Recommended | commands/review.md, commands/build.md | No usage examples showing valid $ARGUMENTS |
| R6 | Recommended | roles/*.md | "Boundary -- NOT responsible for" heading style is slightly unnatural in English |
