---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Dependency Rules

Classification axis: **Dependency type** — rules classified by the nature of the relationship constraint.

## Acyclic Rules

No cycles are permitted in these relationship paths. Cycles indicate structural defects in the ontology.

| ID | Rule | Description | Violation Handling |
|---|---|---|---|
| AC01 | No cycles in Entity → Statement → FinancialFact path | Unidirectional from reporting entity to financial figures | Block |
| AC02 | No cycles in Concept hierarchy | Superordinate account → subordinate account hierarchy | Block |
| AC03 | No cycles in Note → FinancialFact references | Notes reference main statements; main statements do not back-reference notes | Block |
| AC04 | No cycles in Segment → Entity attribution | Segments belong to entities; entities do not belong to segments | Block |

> **AC03 rationale:** Notes explain and supplement main statement items. If main statements referenced notes, a circular dependency would arise: the meaning of a figure depends on a note that depends on the figure. Notes annotate; figures do not annotate notes.

### Intentional Bidirectional Patterns (Not Cycles)

- **FinancialFact ↔ Period:** A Fact belongs to a Period (IN_PERIOD); a Period contains many Facts. This is a managed 1:N relationship, not a cycle. The Period is the source of truth for temporal context
- **Concept ↔ FinancialFact:** A Concept defines the meaning (HAS_CONCEPT); many Facts instantiate the Concept. The Concept is the source of truth for semantics
- **Cross-Statement Appearance:** Cash and cash equivalents appears in both BS and CF. This is intentional (DM01 allows it) — the same Fact can belong to multiple Statements

## Direction Rules

| ID | Relationship | Allowed Direction | Prohibited Direction | Violation Handling |
|---|---|---|---|---|
| DR01 | REPORTED_BY | Fact → Entity | Entity → Fact | Block |
| DR02 | BELONGS_TO | Fact → Statement | Statement → Fact | Block |
| DR03 | HAS_CONCEPT | Fact → Concept | Concept → Fact | Block |
| DR04 | IN_PERIOD | Fact → Period | Period → Fact | Block |
| DR05 | ANNOTATES | Note → Fact | Fact → Note | Block |
| DR06 | IS_CHILD_OF | Child Concept → Parent Concept | — | Warning |
| DR07 | DISCLOSES_POLICY | Note → Policy | Policy → Note | Block |
| DR08 | IN_SEGMENT | Fact → Segment | Segment → Fact | Block |
| DR09 | PART_OF | Segment → Entity | Entity → Segment | Warning |

> **DR06 Warning:** The reverse direction (Parent → Child, i.e., HAS_CHILD) can be separately defined as a convenience relationship. It is not prohibited, but it must be derived from IS_CHILD_OF, not independently maintained. Independent maintenance creates synchronization risk.

### Direction Rule Rationale

The direction rules encode the ontology's semantic model:
- **Facts are attributed** (to entities, statements, concepts, periods) — they are the "leaf" data
- **Notes annotate** (facts and policies) — they provide supplementary context
- **Concepts classify** (facts) — they define what the fact represents
- **Segments partition** (facts within an entity) — they provide dimensional analysis

Reversing any direction would change the semantic relationship. "Revenue is reported by Samsung" ≠ "Samsung is reported by Revenue."

## Diamond Rules

| ID | Situation | Allowed? | Rationale |
|---|---|---|---|
| DM01 | Same Fact belongs to multiple Statements | **Allowed** | Cash appears in both BS and CF — this is correct per IFRS |
| DM02 | Same Concept used by multiple Entities | **Allowed** | ifrs:Revenue is shared across all companies — the concept is universal |
| DM03 | Same Fact attributed to multiple Periods | **Prohibited** | A single financial figure belongs to exactly one period/point-in-time. Multiple periods = data duplication error |
| DM04 | Same Fact attributed to multiple Entities | **Prohibited** | A fact is reported by one entity. Intercompany items are separate facts with separate entity attribution |
| DM05 | Same Concept appears at multiple hierarchy levels | **Prohibited** | A concept has one parent in the hierarchy. Multiple parents = taxonomy structure error |

### DM01 Resolution Protocol

When the same Fact appears in multiple Statements (e.g., cash in BS and CF):
- The Fact node is created once
- Multiple BELONGS_TO edges point to different Statement nodes
- The values must be identical — if BS cash ≠ CF closing cash, this is a cross-statement linkage violation (XL02 in logic_rules.md)

## Referential Integrity

| ID | Rule | Description | Violation Handling |
|---|---|---|---|
| RI01 | FinancialFact's HAS_CONCEPT target must exist | Referencing a non-existent account is prohibited | Block |
| RI02 | Note's ANNOTATES target must exist | Referencing a non-existent note target is prohibited | Block |
| RI03 | Temporary IDs treated as "warning" until converted to canonical | Reflects ID instability from unstructured sources | Warning |
| RI04 | Period node must have valid date format (ISO 8601) | Start/end dates must be parseable and logically consistent | Block |
| RI05 | Entity code must be a recognized identifier (stock code, LEI, etc.) | Prevents orphan entities without external linkage | Warning |

> **RI03 real-world context:** Notes extracted from PDFs via OCR may not have stable identifiers across different extraction runs. Temporary IDs are assigned during extraction. When the same note is obtained from a structured source (XBRL), convert to the canonical ID and elevate to Block level (same as RI02).

### Referential Integrity Verification Pipeline

1. **At ingestion:** RI01 (concept exists), RI04 (date valid), RI05 (entity recognized)
2. **After normalization:** RI03 upgrade (temporary → canonical IDs)
3. **At query time:** RI02 (note targets exist), cross-statement consistency
4. **Periodic audit:** orphan node detection (structure_spec.md §Isolated Node Prohibition)

## Source Dependencies

### Source of Truth Transition Rules

| Priority | Source Type | Condition | Description | Data Quality |
|---|---|---|---|---|
| 1 | Structured (XBRL, API) | Structure complete and parsing successful | Machine-readable, taxonomy-tagged | Highest |
| 2 | Semi-structured (HTML, tables) | Structured source incomplete or parsing failed | Requires parsing/extraction | Medium |
| 3 | Unstructured (PDF, images) | Semi-structured not available | Requires OCR/NLP extraction | Lowest |

- Source transitions are common: structured XBRL may be incomplete (e.g., notes not tagged), requiring fallback to semi-structured HTML or unstructured PDF for supplementary data
- **SPOF risk:** When semi-structured is the sole source for a critical data element, a single parsing failure produces complete data loss. Mitigation: maintain at least 2 extraction methods for critical items
- **ID system unification** must precede source transitions — if different sources assign different IDs to the same concept, referential integrity breaks during transition

### Source Quality Metadata

Every FinancialFact should carry source metadata:
- **source_type:** XBRL / HTML / PDF / API
- **source_confidence:** high (structured) / medium (semi-structured) / low (unstructured)
- **extraction_date:** when the data was extracted
- **filing_id:** the specific regulatory filing the data came from
- **audit_status:** audited / reviewed / unaudited

### Taxonomy/Instance Separation

- **Taxonomy** (Concept hierarchy definitions) and **instances** (actual financial figures/Facts) have separate dependency paths
- Taxonomy changes affect only Concept nodes; instance changes affect only FinancialFact nodes
- When both change simultaneously (e.g., IFRS taxonomy update concurrent with new filing), referential integrity of HAS_CONCEPT relationships must be re-verified
- Taxonomy version must be tracked per entity-period — different filings may use different taxonomy versions

## Cross-Entity Dependencies

### Entity Hierarchy

- Parent entity → Subsidiary entity → Sub-subsidiary entity
- Consolidation scope depends on control (IFRS 10): holding >50% voting rights or effective control
- Associate: significant influence (typically 20-50% ownership) → equity method accounting
- Joint venture: joint control → equity method (IFRS 11)
- Changes in ownership percentage may trigger reclassification (subsidiary → associate or vice versa), which changes the consolidation method

### Intercompany Transaction Dependency

- Intercompany transactions must be eliminated in consolidation
- Dependency chain: Intercompany Transaction Identified → Elimination Entry → Consolidated Figure Adjusted
- Failure mode: intercompany sales not eliminated → revenue double-counted in consolidated IS
- Verification: total intercompany sales in subsidiaries should net to zero in consolidated statements

## Circular Dependency Detection

### Unintentional Cycles (Defects)

- **Concept ↔ Concept:** Concept A is a child of Concept B, and B is a child of A → hierarchy cycle → Block
- **Entity ↔ Entity:** Entity A is a subsidiary of Entity B, and B is a subsidiary of A → ownership cycle → Block
- **Fact ↔ Note ↔ Fact:** Fact A is annotated by Note X, which references Fact B, which is annotated by Note Y, which references Fact A → annotation cycle. Resolution: notes annotate facts, not other notes' references

### Detection Method

1. For Concept hierarchy: topological sort — if sort fails, cycle exists
2. For Entity hierarchy: ownership graph traversal — if any entity is its own ancestor, cycle exists
3. For Note-Fact references: ANNOTATES edges form a bipartite graph (Note → Fact) — if Note → Note edges exist, investigate

## SE Transfer Verification

| SE Pattern | Finance Equivalent | Key Difference |
|---|---|---|
| Acyclic Dependencies Principle (module DAG) | Acyclic Rules (AC01-AC04) | Both prohibit cycles; finance adds domain-specific intentional bidirectional patterns |
| Dependency Inversion (depend on abstractions) | Concept hierarchy (depend on taxonomy, not raw data) | SE uses interfaces; finance uses taxonomy elements as the abstraction |
| Referential Integrity (FK constraints) | RI01-RI05 | SE enforces at DB level; finance enforces at ontology validation + pipeline level |
| Source of Truth Management | Source Priority (XBRL > HTML > PDF) | SE has single SoT; finance has hierarchical SoT with fallback chain |
| Diamond Dependencies (version conflict) | DM01-DM05 | SE resolves with version managers; finance allows some diamonds (DM01, DM02) while prohibiting others |

## Related Documents

- structure_spec.md — Node and relationship structure where dependency rules apply
- logic_rules.md — Accounting identities and rules complementing dependency rules
- domain_scope.md — Source format axis, industry classification, normative tiers
- concepts.md — Concept mapping system subject to referential integrity
- extension_cases.md — Extension scenarios requiring dependency rule changes
- competency_qs.md — Data quality questions (CQ-DQ) testing dependency enforcement
