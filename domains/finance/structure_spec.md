# Finance Domain — Ontology Structure Specification

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Node type | Entity / Statement / Fact / Concept / Period / Note / Policy / Segment | Ontology components |
| Relationship direction | Upward (attribution) / Downward (composition) / Horizontal (reference) | Edge direction semantics |

## Required Node Types (8)

| Type | Description | Examples |
|---|---|---|
| Entity | Reporting entity (legal entity) | A specific listed company (identified by stock code, etc.) |
| Statement | Financial statement type | Consolidated Statement of Financial Position, Separate Income Statement |
| FinancialFact | Individual financial figure | A specific company's revenue for a specific year (consolidated) |
| Concept | Account (taxonomy element) | ifrs:Revenue, company-specific extension accounts |
| Period | Reporting period | A specific fiscal year period, a specific reporting date |
| Note | Note information | Contingent liability details, accounting policy descriptions |
| Policy | Accounting policy choice | Inventory: FIFO method |
| Segment | Business division | A specific business segment (company-defined) |

> The Segment node is essential for large companies, but since segment labels are company-specific extension accounts, mapping to Concept nodes must be performed as a prerequisite.

## Required Relationships

### FinancialFact Relationships (4)

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| REPORTED_BY | FinancialFact | Entity | N:1 | Which company reported it |
| BELONGS_TO | FinancialFact | Statement | N:1 | Which financial statement it belongs to |
| HAS_CONCEPT | FinancialFact | Concept | N:1 | Which account it represents |
| IN_PERIOD | FinancialFact | Period | N:1 | Which period/point-in-time it belongs to |

### Note Relationships (2)

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| ANNOTATES | Note | FinancialFact | N:M | Which financial figures it explains |
| DISCLOSES_POLICY | Note | Policy | 1:N | Which accounting policies it discloses |

### Segment Relationships

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| IN_SEGMENT | FinancialFact | Segment | N:1 | Which business division it belongs to (optional) |
| PART_OF | Segment | Entity | N:1 | Which company's business division it is |

## Financial Statement Completeness

For a given Entity-Period combination, the following Statements must exist:
- Statement of Financial Position (required)
- Income Statement (required)
- Cash Flow Statement (required)
- Statement of Changes in Equity (required)
- Statement of Comprehensive Income (required; may be combined with Income Statement)

> For the financial industry, Statement composition may differ. Example: insurance companies may have an additional "Statement of Insurance Contract Liability Changes." Completeness criteria branch based on the industry classification axis (general/financial).

## Isolated Node Prohibition

Every node must have at least 1 relationship (edge).
- Entity node: requires at least 1 REPORTED_BY relationship
- Concept node: requires at least 1 HAS_CONCEPT relationship
- Period node: requires at least 1 IN_PERIOD relationship
- Note node: requires at least 1 ANNOTATES relationship

> If an isolated node is detected, it is considered a data collection error or mapping omission, and a warning is raised.

## ID System

### Unification Principle
- Node IDs are unified into a single system regardless of source
- ID composition: `{EntityCode}_{PeriodKey}_{StatementType}_{ConceptID}`
- Temporary IDs are treated as "warning" for referential integrity verification until converted to canonical IDs

### Semantic Identifier Preservation
- XBRL taxonomy element IDs are not mere technical identifiers but semantic identifiers
- Semantic identifiers embody the concept's definition, hierarchy, and relationships, so preserving and leveraging existing element IDs is preferred over creating new identifiers

## Related Documents

- [domain_scope.md](domain_scope.md) — the relationship between required concept categories and their realization as node types
- [concepts.md](concepts.md) — synonym mappings and extension account handling for Concept nodes
- [logic_rules.md](logic_rules.md) — mathematical constraints applied to inter-node relationships
- [dependency_rules.md](dependency_rules.md) — direction and acyclic rules for relationships (edges)
- [extension_cases.md](extension_cases.md) — scenarios for adding new node types
