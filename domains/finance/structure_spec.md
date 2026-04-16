---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Ontology Structure Specification

Classification axis: **Structural component** — specifications classified by the ontology element they govern.

## Required Node Types

| Type | Description | Required Attributes | Examples |
|---|---|---|---|
| Entity | Reporting entity (legal entity) | entity_code, name, industry_classification (general/financial), country, listing_status | Samsung Electronics (005930.KS), Apple Inc (AAPL) |
| Statement | Financial statement type | statement_type (BS/IS/CF/equity/OCI), reporting_unit (consolidated/separate) | Consolidated Statement of Financial Position FY2024 |
| FinancialFact | Individual financial figure | value, currency, unit, source_type, source_confidence, filing_id | Samsung revenue 2024 consolidated: 279.6T KRW |
| Concept | Account (taxonomy element) | element_id, label, element_type (standard/extension), normal_balance, temporal_attribute | ifrs:Revenue, ext:SegmentRevenue_Consumer |
| Period | Reporting period | start_date, end_date (for duration), instant_date (for instant), fiscal_year_end, period_type (annual/quarterly/interim) | 2024-01-01 ~ 2024-12-31, 2024-12-31 (instant) |
| Note | Note information | note_type (policy/contingency/related_party/segment/other), source_type, confidence | Contingent liability: pending patent litigation, estimated $50M |
| Policy | Accounting policy choice | policy_area (inventory/depreciation/revenue/lease/financial_instrument), method, standard_ref | Inventory: weighted average method (IAS 2) |
| Segment | Business division | segment_name, segment_type (operating/geographic), entity_ref | Samsung — Semiconductor division |
| AuditInfo | Audit status | opinion_type (unqualified/qualified/adverse/disclaimer), auditor_name, assurance_level (audited/reviewed/unaudited) | PwC, unqualified, audited |

> **Segment node:** Essential for diversified companies. Segment labels are company-specific extensions requiring normalization mapping to Concept nodes. IFRS 8 mandates segment reporting for listed entities using the chief operating decision maker's segmentation.

> **AuditInfo node (new):** Captures the assurance level and opinion for each financial statement set. Critical for data quality assessment — reviewed quarterly figures carry lower reliability than audited annual figures.

## Required Relationships

### FinancialFact Relationships

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| REPORTED_BY | FinancialFact | Entity | N:1 | Which entity reported this figure |
| BELONGS_TO | FinancialFact | Statement | N:M | Which financial statement(s) it belongs to (cash may appear in BS and CF) |
| HAS_CONCEPT | FinancialFact | Concept | N:1 | Which account/concept it represents |
| IN_PERIOD | FinancialFact | Period | N:1 | Which period/point-in-time it belongs to |
| FROM_SOURCE | FinancialFact | SourceRecord | N:1 | Provenance — which filing/extraction it came from |

### Note Relationships

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| ANNOTATES | Note | FinancialFact | N:M | Which financial figures this note explains |
| DISCLOSES_POLICY | Note | Policy | 1:N | Which accounting policies this note discloses |

### Concept Hierarchy

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| IS_CHILD_OF | Child Concept | Parent Concept | N:1 | Account hierarchy (line item → subtotal → total) |
| MAPS_TO | Extension Concept | Standard Concept | N:1 | Normalization mapping (company extension → IFRS standard) |
| EQUIVALENT_TO | Concept (Standard A) | Concept (Standard B) | 1:1 | Cross-standard mapping (IFRS ↔ US-GAAP) |

### Segment Relationships

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| IN_SEGMENT | FinancialFact | Segment | N:1 | Which business division (optional — only for segment-level facts) |
| PART_OF | Segment | Entity | N:1 | Which entity this segment belongs to |

### Entity Hierarchy

| Relationship | Start Node | End Node | Cardinality | Description |
|---|---|---|---|---|
| SUBSIDIARY_OF | Entity (child) | Entity (parent) | N:1 | Subsidiary-parent ownership |
| ASSOCIATE_OF | Entity | Entity | N:M | Significant influence (20-50% ownership) |
| AUDITED_BY | Statement set | AuditInfo | N:1 | Audit opinion for this reporting period |

## Financial Statement Completeness

For a given Entity-Period combination, the following Statements must exist:

### General Industry (required)
- Statement of Financial Position (BS) — required
- Income Statement (IS) — required
- Cash Flow Statement (CF) — required
- Statement of Changes in Equity — required
- Statement of Comprehensive Income — required (may be combined with IS)

### Financial Industry (when applicable)
All general industry statements plus:
- Insurance: Statement of Insurance Contract Liability Changes (IFRS 17)
- Banking: Regulatory capital disclosures (Basel III CET1, total capital)
- Securities: Trading book and banking book separation

> Completeness criteria branch on the industry classification axis. A banking entity missing regulatory capital disclosures is incomplete even if all 5 general statements exist.

### Completeness Verification

- For each Entity-Period, verify: all required statements exist with ≥1 FinancialFact each
- For each Statement, verify: key line items exist (total assets for BS, revenue for IS, operating CF for CF)
- For cross-statement linkage: verify XL01-XL04 from logic_rules.md

## Isolated Node Prohibition

Every node must have at least 1 relationship (edge). Isolated nodes indicate data quality issues.

| Node Type | Minimum Relationships | Warning Meaning |
|---|---|---|
| Entity | ≥1 REPORTED_BY (from any Fact) | Entity with no financial data — likely data collection error |
| Concept | ≥1 HAS_CONCEPT (from any Fact) | Defined account used by no entity — may be valid taxonomy placeholder |
| Period | ≥1 IN_PERIOD (from any Fact) | Period with no financial data — data gap |
| Note | ≥1 ANNOTATES | Orphan note — extracted but not linked to any fact |
| Segment | ≥1 IN_SEGMENT (from any Fact) | Defined segment with no segment-level data |
| FinancialFact | ≥4 relationships (REPORTED_BY + BELONGS_TO + HAS_CONCEPT + IN_PERIOD) | Incomplete fact — missing required context |
| Policy | ≥1 DISCLOSES_POLICY (from any Note) | Orphan policy — defined but not disclosed |
| AuditInfo | ≥1 AUDITED_BY | Orphan audit info — not linked to any statement set |

> **Concept node exception:** Standard taxonomy elements (e.g., ifrs:RevenueFromGovernmentGrants) may be unused by any entity in the current dataset but are valid taxonomy placeholders. These are flagged as informational, not warning.

## ID System

### Unification Principle

- Node IDs are unified into a single system regardless of source
- ID composition: `{EntityCode}_{PeriodKey}_{StatementType}_{ConceptID}_{ReportingUnit}`
- Example: `005930_2024_BS_ifrs-Revenue_consolidated`
- Temporary IDs (from PDF extraction) use prefix `tmp_` and are promoted to canonical form when structured source becomes available

### Semantic Identifier Preservation

- XBRL taxonomy element IDs are semantic identifiers, not mere technical keys
- Semantic identifiers embody the concept's definition, hierarchy, and relationships
- Preserving existing element IDs is preferred over creating new identifiers — this enables cross-entity and cross-period comparison without additional mapping
- When extension accounts are mapped to standard concepts, both IDs are preserved (extension as alias, standard as canonical)

### Version Management

- Restated filings create new FinancialFact instances with version metadata
- Version identification: `{filing_id}_{filing_date}_{version_number}`
- The latest filing (highest version number or latest filing date) is the authoritative version
- Previous versions are deactivated (not deleted) to enable pre/post-restatement comparison

## Classification Criteria Design

### Entity Classification

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Industry | General / Banking / Insurance / Securities | Determines statement completeness criteria and applicable rules |
| Listing status | Listed / Unlisted / State-owned | Determines disclosure requirements and segment reporting obligation |
| Reporting framework | IFRS / US-GAAP / Local GAAP | Determines applicable taxonomy and accounting rules |
| Entity size | Large / Medium / Small (by jurisdiction criteria) | May determine disclosure exemptions |

### Fact Classification

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Temporal attribute | instant / duration | Determines which identities and period rules apply |
| Statement membership | BS / IS / CF / Equity / OCI | Determines which cross-statement linkages apply |
| Data source | XBRL / HTML / PDF / API | Determines source confidence level |
| Assurance level | Audited / Reviewed / Unaudited | Determines data reliability |

## Domain Boundary Management

- This domain covers the structure and queryability of financial reporting data — the "what and how" of financial data organization
- The accounting domain covers transaction-level bookkeeping — journal entries, ledger, trial balance, closing procedures
- The business domain covers strategic and competitive analysis — market position, competitive dynamics, business model evaluation
- Code implementation details (database schema, API design, query optimization) fall under software-engineering
- Regulatory compliance process (filing deadlines, submission procedures) overlaps but the process itself is not this domain's jurisdiction — only the data structure requirements imposed by regulations

## SE Transfer Verification

| SE Pattern | Finance Equivalent | Key Difference |
|---|---|---|
| Required Module Structure | Required Node Types (Entity, Statement, Fact, Concept, Period, Note, Policy, Segment, AuditInfo) | SE classifies by architectural layer; finance classifies by financial reporting element |
| Golden Relationships | Required Relationships (REPORTED_BY, BELONGS_TO, HAS_CONCEPT, IN_PERIOD, ANNOTATES) | SE validates code coherence; finance validates financial data completeness |
| Naming Conventions | ID System (semantic identifier preservation, XBRL element IDs) | SE uses code conventions; finance uses taxonomy-based semantic naming |
| Isolated Node Prohibition | Isolated Node Prohibition (every node ≥1 edge) | Both use the same principle; finance adds type-specific minimum relationship counts |
| Classification Criteria | Entity/Fact Classification (industry, temporal, source, assurance) | SE classifies code; finance classifies financial data by reporting characteristics |

## Related Documents

- domain_scope.md — Classification axes, sub-area definitions, normative tiers
- concepts.md — Synonym mappings and extension account handling for Concept nodes
- logic_rules.md — Mathematical constraints applied to inter-node relationships
- dependency_rules.md — Direction, acyclic, referential integrity rules for relationships
- extension_cases.md — Scenarios for adding new node types and relationships
- competency_qs.md — Structural verification questions (CQ-FS, CQ-CA, CQ-DQ)
