# Build Generalization Design

> buildfromcode -> build: Redesigned as a general-purpose process for building ontologies from any analysis target (spreadsheets, databases, documents, etc.), not just code.

---

## 1. Certainty Redefinition

The essence of build: distinguishing what is observable from the source (f'(x)) from unobservable context (C), and fixing C with domain knowledge.

| Current | Changed | Definition | Relationship to C |
|---|---|---|---|
| `deterministic` | `observed` | Facts directly observed from source. Does not change unless source changes | No C |
| `non-deterministic` | `unresolved` | Facts that cannot be confirmed from source alone (Explorer's initial judgment) | C exists, unclassified |
| `code-embedded-policy` | `embedded-rationale` | Implementation exists in source, but its rationale does not | C unresolved -- implementation visible but reason unknown |
| `inferred` | `inferred` | (Retained) Reasonable inference but not directly verifiable from source | C is estimated |
| `not-in-code` | `not-in-source` | Cannot be determined from this source. Requires another source or user input | C completely undetermined |

When making an `inferred` judgment, self-assess the inference quality:
```yaml
abduction_quality:
  explanatory_power: high | medium | low   # How well does it explain the observed structure
  coherence: consistent | partial | conflicting  # Is it consistent with existing confirmed facts
```

---

## 2. Source-Neutral Terminology

| Current (code-specific) | Changed (source-neutral) |
|---|---|
| "codebase" | "analysis target" or "source" |
| "read the code" | "traverse the source" |
| "code traverser" | "Explorer" (role name retained, description only changed) |
| "extractable from code" | "directly observable from source" |

---

## 3. Three Lenses

Parallel perspectives applied simultaneously to the same target. Not "levels" -- no hierarchy, cross-application is normal.

| Lens | Definition | Code example | Spreadsheet example |
|---|---|---|---|
| **Structure** | In the source and directly observable | Classes, fields, functions | Cell values, formulas, inter-sheet references |
| **Rationale** | Implementation is in the source, but rationale is outside | Reason for hardcoded rules | Rationale behind calculation methods |
| **Presentation** | In the source, but purpose is human cognition | UI, user navigation flow | Cell merging, colors, layout |

Multiple lenses can produce facts from a single observation.
Example: `MIN_PAYMENT = 500` -> Structure (value is 500) + Rationale (why 500 is C unresolved).

Add a `lens` field to deltas to tag which lens a fact was observed from:
```yaml
facts:
  - subject: "..."
    statement: "..."
    certainty: observed | unresolved
    lens: [structure]  # or [structure, rationale], [presentation], etc.
```

---

## 4. Explorer Redesign

### 4.1 Role Redefinition

Current: "Directly reads code and generates deltas. Interpretation prohibited."
Changed: "Traverses source and generates deltas. Ontological interpretation prohibited, but structural recognition is performed."

| Action | Structural recognition (Explorer allowed) | Ontological interpretation (Explorer prohibited) |
|---|---|---|
| Code | "This class has 3 fields" | "This is an Aggregate Root" |
| Spreadsheet | "This row has merged cells, Bold, different background color" | "This is a table header" |
| DB | "This table has 3 columns with no FK" | "This is a Lookup table" |

Key point: Explorer reports "what exists." "What it means" is determined by verification agents. When interpretation inevitably enters structural recognition (e.g., spreadsheet formatting), Explorer **states the observation basis**.

### 4.2 Source-Type-Specific Profiles

Explorer's process logic is identical. Only the traversal tools and structural recognition scope vary by source type.

| Source type | Traversal tools | module_inventory unit | Structural recognition scope |
|---|---|---|---|
| Codebase | Glob, Grep, Read | Directory/package | File structure, imports, class/function signatures |
| Spreadsheet | Spreadsheet parsing tools (MCP, etc.) | Sheet/named range/table | Cell values, formulas, formatting, inter-sheet references |
| DB | SQL query tools | Table/schema | Tables, columns, FKs, indexes, stored procedures |
| Document | Read, WebFetch | Section/chapter | Headings, body text, references, structure |

Source type determination: Auto-determined from $ARGUMENTS and file extension/content during Phase 0.5. Compound sources apply each type sequentially.

---

## 5. Phase-Level Changes

### Phase 0: Schema Negotiation -- No changes
Schema options (A-E) are independent of source format.

### Phase 0.5: Context Gathering -- Source-type-specific branching added

Add source type information to context_brief:
```yaml
context_brief:
  source_type: code | spreadsheet | database | document | mixed
  source_profile:
    type: {source type}
    format: {xlsx | csv | sql | py | java | ...}
  # ... existing fields retained
```

Additional context questions by source type:
| Source type | Additional questions |
|---|---|
| Code | (current retained) |
| Spreadsheet | "What is the primary purpose of this file?" / "Does formatting carry special meaning?" |
| DB | "Who is the primary consumer?" / "Is an ORM used?" |

### Phase 1: Integral Exploration Loop -- Structure retained, terminology/format changed

Loop structure (delta -> label -> epsilon) retained. Changes:
1. "code" -> "source" terminology replacement
2. Certainty level replacement
3. Add `source.type`, `lens` fields to deltas
4. Add `abduction_quality` field to labels
5. Location notation in detail becomes source-type-specific (`file:line` / `sheet:cell-range` / `table.column`)

### Phase 2-5: Terminology replacement only

---

## 6. Delta/Label Format Change Summary

### Delta
```yaml
delta:
  source:
    type: {code | spreadsheet | database | document}  # new
    scope: "{exploration scope}"
    files: [{list}]
  facts:
    - subject: "..."
      statement: "..."
      certainty: observed | unresolved
      lens: [structure, rationale, presentation]  # new
      detail:
        - "{description including source-type-specific location notation}"
```

### Label
```yaml
labels:
  - certainty_refinement: "{unresolved -> embedded-rationale / inferred / not-in-source}"
    abduction_quality:  # new, only when inferred
      explanatory_power: high | medium | low
      coherence: consistent | partial | conflicting
```

---

## 7. Scope of Changes

| File | Change type |
|---|---|
| `processes/reconstruct.md` | **Full rewrite** |
| `process.md` | Partial modification (certainty terminology, Teammate prompt) |
| `README.md` | Partial modification (commands, certainty) |
| `BLUEPRINT.md` | Partial modification (terminology, certainty, Explorer) |
| `commands/reconstruct.md` | Completed |

### What Does NOT Change

- Integral exploration loop structure (delta -> label -> epsilon -> convergence judgment)
- Agent configuration (N verification agents + Philosopher)
- Phase structure (0 -> 0.5 -> 1 -> 2 -> 3 -> 4 -> 5)
- Learning system (communication/methodology/domain 3-way classification)
- Team lifecycle (TeamCreate -> shutdown -> TeamDelete)

---

## 8. Implementation Order

1. **build.md rewrite** -- terminology (S2) + lenses (S3) + Explorer (S4) + phases (S5) + format (S6)
2. **process.md modification** -- certainty terminology, Teammate prompt template
3. **README.md / BLUEPRINT.md synchronization**
4. **E2E verification** -- confirm existing functionality works with code sources
