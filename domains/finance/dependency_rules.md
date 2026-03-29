---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Finance Domain — Dependency Rules

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Rule type | Acyclic / Direction / Diamond / Referential integrity | Nature of the dependency constraint |
| Scope | Intra-node / Inter-node / Inter-source | Scope where the constraint applies |
| Violation handling | Block / Warning / Auto-correction | System behavior upon violation |

## Acyclic Rules (3 mandatory)

| ID | Rule | Description | Violation Handling |
|---|---|---|---|
| AC01 | No cycles in the Entity -> Statement -> FinancialFact path | Unidirectional from reporting entity to financial figures | Block |
| AC02 | No cycles in the Concept hierarchy | Superordinate account -> subordinate account hierarchy structure | Block |
| AC03 | No cycles in Note -> FinancialFact references | Notes reference main statements, but main statements do not back-reference notes | Block |

## Direction Rules (6)

| ID | Relationship | Allowed Direction | Prohibited Direction | Violation Handling |
|---|---|---|---|---|
| DR01 | REPORTED_BY | Fact -> Entity | Entity -> Fact | Block |
| DR02 | BELONGS_TO | Fact -> Statement | Statement -> Fact | Block |
| DR03 | HAS_CONCEPT | Fact -> Concept | Concept -> Fact | Block |
| DR04 | IN_PERIOD | Fact -> Period | Period -> Fact | Block |
| DR05 | ANNOTATES | Note -> Fact | Fact -> Note | Block |
| DR06 | IS_CHILD_OF | Child Concept -> Parent Concept | Parent -> Child (this direction can be separately defined as HAS_CHILD) | Warning |

## Diamond Rules (3)

| ID | Situation | Allowed | Description |
|---|---|---|---|
| DM01 | Same Fact belongs to multiple Statements | **Allowed** | Cash and cash equivalents appears in both Statement of Financial Position and Cash Flow Statement |
| DM02 | Same Concept used by multiple Entities | **Allowed** | ifrs:Revenue is shared by all companies |
| DM03 | Same Fact attributed to multiple Periods | **Prohibited** | A single financial figure belongs to exactly one period/point-in-time |

## Referential Integrity (3)

| ID | Rule | Description | Violation Handling |
|---|---|---|---|
| RI01 | The target Concept of FinancialFact's HAS_CONCEPT must exist | Referencing a non-existent account is prohibited | Block |
| RI02 | The target FinancialFact of Note's ANNOTATES must exist | Referencing a non-existent note target is prohibited | Block |
| RI03 | Temporary IDs are treated as "warning" for referential integrity until converted to canonical IDs | Reflects the ID instability of notes extracted from unstructured sources | Warning |

> RI03 reflects the reality that the ID system for notes extracted from unstructured sources (PDFs, etc.) is unstable. When the same note is obtained from a structured source, convert to the canonical ID and subsequently elevate to the same "block" level as RI02.

## Inter-Source Dependencies

### Source of Truth Transition Rules

| Priority | Source Type | Condition | Description |
|---|---|---|---|
| 1 | Structured data (XBRL, etc.) | Structure complete and parsing successful | Primary source — machine-readable |
| 2 | Semi-structured data (HTML, etc.) | Structured source incomplete or parsing failed | Secondary source — parsing required |
| 3 | Unstructured data (PDF, etc.) | Semi-structured source not available | Tertiary source — OCR required |

- In the financial industry, transition from structured to semi-structured sources is frequent due to structural inconsistencies in structured sources
- When semi-structured is the sole source, a single point of failure (SPOF) risk exists
- ID system unification must precede source transitions to maintain referential integrity

### Taxonomy/Instance Separation

- Taxonomy (Concept hierarchy definitions) and instances (actual financial figures) have separate dependency paths
- Taxonomy changes affect only Concept nodes; instance changes affect only FinancialFact nodes
- When both change simultaneously, referential integrity of HAS_CONCEPT relationships must be re-verified

## Related Documents

- [structure_spec.md](structure_spec.md) — the node and relationship structure where dependency rules apply
- [logic_rules.md](logic_rules.md) — the complementary relationship between logic rules and dependency rules
- [domain_scope.md](domain_scope.md) — source format axis and industry classification axis definitions
- [concepts.md](concepts.md) — the Concept mapping system that is the subject of referential integrity
- [extension_cases.md](extension_cases.md) — extension scenarios requiring dependency rule changes
