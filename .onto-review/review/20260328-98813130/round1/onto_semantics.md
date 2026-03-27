# onto_semantics Review: Semantic Accuracy of English Translation

**Reviewer**: onto_semantics (semantic accuracy verification agent)
**Date**: 2026-03-28
**Scope**: Translated onto plugin files checked against `dev-docs/translation-reference.yaml` (terminology SSOT)
**Files sampled**: 15 files across roles/, process.md, processes/, commands/

---

## 1. Term-to-SSOT Alignment Check

### 1.1 Correctly aligned terms

The following canonical terms from `translation-reference.yaml` are used consistently throughout the sampled files:

| SSOT Term | Verified In | Status |
|---|---|---|
| verification agent | roles/*.md, process.md | Correct |
| agent panel | processes/review.md:1, process.md:38 | Correct |
| Philosopher (capitalized) | roles/philosopher.md:1, processes/review.md | Correct |
| Explorer (capitalized) | processes/build.md | Correct |
| team lead | process.md:190, processes/review.md:9 | Correct |
| teammate | process.md:206-208 | Correct |
| team review | processes/review.md:1, process.md:13 | Correct |
| individual query | processes/question.md:1, process.md:12 | Correct |
| ontology build | processes/build.md:1, process.md:14 | Correct |
| transform | processes/transform.md:1, process.md:15 | Correct |
| onboarding | processes/onboard.md, commands/onboard.md | Correct |
| learning promotion | processes/promote.md:1 | Correct |
| review finding | processes/review.md:145 | Correct |
| review result | processes/review.md:176 | Correct |
| adjudication | processes/review.md:100, roles/philosopher.md | Correct |
| consensus / conditional consensus / disagreement | processes/review.md:186-278 | Correct |
| contested point | processes/review.md:229 | Correct |
| deliberation | processes/review.md:218 | Correct |
| unique / shared / cross-verified finding | processes/review.md:202-210 | Correct |
| domain document | process.md:76 | Correct |
| competency question | roles/onto_pragmatics.md:4 | Correct |
| delta / epsilon / label | processes/build.md:18-19 | Correct |
| convergence | processes/build.md:21 | Correct |
| Raw Ontology | processes/transform.md:1, processes/build.md | Correct |
| certainty | processes/build.md:34 | Correct |
| fallback | process.md:138 | Correct |
| session | process.md:157 | Correct |
| round | processes/review.md:38 | Correct |
| process-halting / graceful degradation | process.md:148-149 | Correct |
| learning (not "training") | process.md:117-128 | Correct |
| fact / judgment (tags) | process.md:288-289 | Correct |
| general principle | process.md:76, 107 | Correct |
| verification dimension | process.md:38-51 | Correct |

---

## 2. Synonym Inconsistency Check

### 2.1 "homograph" vs "homonym" -- INCONSISTENCY FOUND

The SSOT (`translation-reference.yaml`) does not explicitly define a canonical choice between "homograph" and "homonym." However, the plugin uses both terms interchangeably, which is a semantic accuracy issue because they have distinct meanings in linguistics:

- **homograph**: same spelling, different meaning (e.g., "bank" the financial institution vs "bank" the river edge)
- **homonym**: same name (spelling or pronunciation), different meaning (broader category)

| File | Line | Term Used |
|---|---|---|
| `process.md` | 32 | "synonyms/**homographs**" |
| `processes/promote.md` | 152 | "synonyms/**homographs**" |
| `roles/onto_semantics.md` | 3 | "synonym/**homonym** handling issues" |
| `roles/onto_semantics.md` | 8 | "same names with different meanings (**homonyms**)" |
| `dev-docs/BLUEPRINT.md` | 126 | "**homonym** candidates" |
| `domains/*/conciseness_rules.md` | various | "**homonym** lists" (consistently "homonym" across all 9+ domain files) |

**Assessment**: The Korean source term is likely "동음이의어" which maps most naturally to "homonym." The plugin should standardize on one term. "Homonym" is the more commonly understood term and is already used in the majority of occurrences. The two occurrences of "homographs" in `process.md:32` and `processes/promote.md:152` are the outliers.

**Severity**: Recommended (not critical, because context makes the intended meaning clear, but inconsistency undermines the semantic accuracy standard this plugin itself verifies)

### 2.2 "verification" vs "validation" -- NO ISSUE

The SSOT explicitly disambiguates: "verification" is the umbrella term for what agents do; "validation" checks fitness for purpose against external needs. All occurrences of "validation" in the plugin files are within domain documents (e.g., `domains/ui-design/` for "input validation," `domains/software-engineering/concepts.md` for the explicit disambiguation entry). No plugin core files misuse "validation" where "verification" is intended. **Clean.**

### 2.3 "learning" vs "training" -- NO ISSUE

The SSOT explicitly states: "'training' implies supervised data input to a model; 'learning' here is experiential knowledge." The only occurrences of "training" are in domain documents (`domains/business/`) referring to actual employee training (ADKAR model), and in `dev-docs/philosophical-foundations-of-ontology.md` referring to AI training data. These are legitimate domain usages, not synonym confusion. **Clean.**

### 2.4 "review" vs "audit" -- NO ISSUE

All occurrences of "audit" are within domain documents (accounting, finance, software-engineering) where "audit" refers to the domain-specific concept (financial audit, audit trail), not to the onto plugin's review process. **Clean.**

---

## 3. Homograph / Ambiguity Check

### 3.1 "query" used in multiple senses -- POTENTIAL AMBIGUITY

The SSOT explicitly flags this: "'Query' has homonym risk with 'ontology query' (SPARQL, competency question)."

In practice, "query" appears in three senses across the plugin:

| Sense | Example Location | Context |
|---|---|---|
| **Individual query** (process) | `processes/question.md:1`, `process.md:12` | The process of asking a single agent a question |
| **Competency question query** (ontology) | `roles/onto_pragmatics.md:4` | "can an answer be derived by traversing the system" |
| **Command/Query** (build fact_type) | `processes/build.md:244,505` | CQRS pattern: "query" as a read-only operation type |

**Assessment**: The SSOT acknowledges this risk and states "context resolves the ambiguity." In the translated files, the first sense is always qualified as "individual query" and the third is always in the build-specific `fact_type` enumeration. The second sense uses "competency question" as the full phrase. The disambiguation works in practice, but could be fragile if a future contributor uses bare "query" without qualification.

**Severity**: Recommended (no current misuse, but the disambiguation relies on implicit contextual convention rather than enforced terminology)

### 3.2 "finding" used in multiple senses -- MINOR AMBIGUITY

| Sense | Example Location |
|---|---|
| **review finding** (agent output) | `processes/review.md:145` |
| **communication finding** | `process.md:320` |
| **general English "finding"** | `processes/build.md:713` (issue_type: finding) |

The SSOT defines "review finding" as the canonical term for an agent's output. The use of "finding" in `process.md:320` ("N communication finding(s) have been recorded") is not a "review finding" -- it is a communication observation. And in `processes/build.md:713`, `issue_type: finding` uses "finding" as a generic issue classification.

**Assessment**: The overloading is minor and contextually clear, but "communication finding" could be confused with "review finding" by a reader unfamiliar with the system.

**Severity**: Recommended (low impact)

---

## 4. Command Description Accuracy Check

| Command File | Title | Description | Accuracy |
|---|---|---|---|
| `commands/review.md` | "Onto Review (8-Agent Panel Review)" | "Reviews $ARGUMENTS with the agent panel (team review)" | CORRECT -- accurately describes the process |
| `commands/ask-semantics.md` | "Onto Semantics (semantic accuracy verification)" | "Asks $ARGUMENTS to the semantic accuracy verification agent" | CORRECT -- matches individual query process |
| `commands/build.md` | "Onto Build" | "Builds an ontology from the analysis target" | CORRECT -- matches ontology build process |
| `commands/promote.md` | "Promote Learnings" | "Promotes project-level learnings to global-level" | CORRECT -- matches learning promotion process |
| `commands/transform.md` | "Onto Transform" | "Transforms a built Raw Ontology into the user's desired format" | CORRECT -- matches transform process |
| `commands/onboard.md` | "Project Onboard" | "Sets up the onto plugin environment for the current project" | CORRECT -- matches onboarding process |

All command descriptions accurately reflect what their corresponding processes do. No mismatches found.

---

## 5. Additional Observations

### 5.1 "review result" vs "review finding" in file path template

In `process.md:245`, the teammate initial prompt says:
> "Save your **review result** to {session path}/round1/{agent-id}.md"

Per the SSOT, an individual agent's output is a "review **finding**" (not "review result"). "Review result" is reserved for the Philosopher's synthesized output stored at `{session}/result.md`. This is a terminology mismatch.

**File**: `process.md`
**Line**: 245
**Severity**: Critical (this directly conflicts with the SSOT distinction between "review finding" and "review result")

### 5.2 Philosopher role subtitle uses non-SSOT term

In `roles/philosopher.md:1`, the subtitle reads:
> "Philosopher (purpose alignment **verifier**)"

The SSOT defines the Philosopher's function as "mediator and meta-reviewer." While the footnote on line 3 clarifies this is a "verification dimension" label, calling the Philosopher a "verifier" could suggest it operates like the other verification agents. The SSOT explicitly distinguishes the Philosopher from verification agents.

**Assessment**: The footnote adequately mitigates the risk. The subtitle is describing the verification dimension, not the role type.

**Severity**: Recommended (the footnote resolves it, but a reader seeing only the title could be misled)

### 5.3 process.md:73 uses "adjudications" where "findings" is meant

In `process.md:73`:
> "synthesizes and reframes verification agents' **adjudications** from a purpose-oriented viewpoint"

Per the SSOT, "adjudication" is the Philosopher's act of mediating between conflicting findings. What verification agents produce are "review findings," not "adjudications." The Philosopher synthesizes findings and performs adjudication -- the agents do not adjudicate.

**File**: `process.md`
**Line**: 73
**Severity**: Critical (misattributes the SSOT concept "adjudication" to verification agents instead of the Philosopher)

---

## Findings Summary

### Critical: 2

| # | File:Line | Issue |
|---|---|---|
| C1 | `process.md:245` | "review result" used for individual agent output; SSOT requires "review finding" (reserved for Philosopher's synthesis) |
| C2 | `process.md:73` | "adjudications" attributed to verification agents; SSOT defines adjudication as the Philosopher's exclusive function |

### Recommended: 4

| # | File:Line | Issue |
|---|---|---|
| R1 | `process.md:32`, `processes/promote.md:152` | "homographs" used while majority of files use "homonym" -- inconsistent synonym |
| R2 | Multiple files | "query" used in 3 senses (individual query, competency question traversal, CQRS fact_type) -- context resolves but convention is implicit |
| R3 | `process.md:320`, `processes/build.md:713` | "finding" overloaded across communication finding, review finding, and generic issue type |
| R4 | `roles/philosopher.md:1` | "purpose alignment verifier" subtitle could mislead readers into thinking Philosopher is a standard verification agent |

### Findings Summary
- Critical: 2
- Recommended: 4
