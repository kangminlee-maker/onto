---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing."
This domain applies when **reviewing** financial reporting ontologies — structured representations of financial statements, taxonomy elements, accounting relationships, and derived metrics.

> **Boundary with accounting domain**: The accounting domain covers transaction-level bookkeeping (journal entries, ledger, trial balance, closing procedures). This domain covers the output of accounting — financial statements, their structure, inter-statement relationships, and analytical use. Journal entry mechanics are accounting's jurisdiction; how financial statements are structured, cross-referenced, and queried is this domain's jurisdiction.

> **Boundary with business domain**: The business domain covers business model analysis, strategy, market position, and competitive dynamics. This domain covers the financial data that quantifies business performance. Revenue growth analysis as a financial metric belongs here; revenue growth as a competitive strategy signal belongs to business.

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Reporting framework | IFRS / US-GAAP / Local GAAP (K-IFRS, J-GAAP, etc.) | Applicable accounting standard |
| Reporting unit | Consolidated / Separate | Financial statement preparation unit |
| Reporting frequency | Annual / Semi-annual / Quarterly / Interim | Disclosure frequency |
| Industry classification | General / Financial (banking, insurance, securities) | Statement structure and chart of accounts differ |
| Temporal attribute | instant / duration | Time attribution method of financial items |
| Source format | Structured (XBRL) / Semi-structured (HTML) / Unstructured (PDF) | Data origin format |

## Key Sub-Areas

Classification axis: **Financial reporting concern** — Classified by the concern that the financial ontology must address.

Applicability markers:
- **(required)**: Must be addressed in any financial reporting ontology review. Absence indicates a fundamental gap
- **(when applicable)**: Address when the system's scope includes the relevant feature. Condition type: feature existence (binary)
- **(scale-dependent)**: Becomes required beyond a scale threshold documented per item. Condition type: scale threshold (quantitative boundary crossed)

### Financial Statement Structure
- **Statement Components** (required): Statement of Financial Position (BS), Income Statement (IS), Cash Flow Statement (CF), Statement of Changes in Equity, Statement of Comprehensive Income — components and interrelationships
- **Statement Linkage** (required): Net income flowing from IS to equity changes, opening/closing balance consistency across BS periods, CF reconciliation to BS cash balances
- **Financial Industry Statements** (when applicable): Insurance contract liabilities, loan receivables, regulatory capital ratios — additional or differently structured statements for banking, insurance, and securities industries

### Chart of Accounts Classification
- **5-Element Structure** (required): Assets/Liabilities/Equity/Revenue/Expenses hierarchical classification, current/non-current distinction, normal balance direction
- **Account Hierarchy** (required): Parent-child account relationships, subtotal computation paths, roll-up logic from line items to totals
- **Extension Accounts** (required): Company-specific taxonomy extensions beyond standard accounts, normalization mapping to canonical names

### Accounting Identity and Constraints
- **Fundamental Identities** (required): Assets = Liabilities + Equity (BS), revenue - expenses = net income (IS), opening cash + CF activities = closing cash (CF)
- **Cross-Statement Linkage** (required): Net income from IS appears in equity changes, CF reconciles to BS cash balance, comprehensive income components appear in OCI statement
- **Constraint Conflict Detection** (required): Consolidated ≥ separate total assets (general expectation), identity violations as data quality signals

### Period and Point-in-Time
- **Temporal Attribution** (required): instant (BS items, point-in-time) vs duration (IS/CF items, over-a-period) distinction and enforcement
- **Period Matching** (required): Same-duration comparison enforcement (quarterly vs quarterly, annual vs annual), cumulative vs single-quarter distinction
- **Restatement Management** (required): Version tracking for restated figures, final version determination, historical comparison across restatements

### Consolidated and Separate Reporting
- **Consolidation Scope** (required): Subsidiary inclusion criteria, consolidation adjustments, intercompany transaction elimination
- **Segment Reporting** (required): Business segment and geographic segment dimensions, segment-level P&L, reconciliation to consolidated totals
- **Associate and Joint Venture** (when applicable): Equity method accounting, proportionate consolidation, significant influence determination

### Notes and Disclosure System
- **Note Structure** (required): Reference relationships between notes and main statement items, note categorization (accounting policies, estimates, contingencies)
- **Accounting Policy Disclosure** (required): Recognition, measurement, and presentation method choices disclosed per significant policy area
- **Contingent Liabilities and Commitments** (required): Off-balance-sheet items, guarantees, pending litigation — items not on the main statements but material for analysis

### Key Accounting Standards
- **Revenue Recognition (IFRS 15)** (required): 5-step model (contract → performance obligations → transaction price → allocation → recognition), over-time vs point-in-time, variable consideration
- **Financial Instruments (IFRS 9)** (required): Classification (amortised cost/FVOCI/FVPL), impairment (3-stage expected credit loss), hedge accounting basics
- **Leases (IFRS 16)** (required): Right-of-use asset and lease liability recognition, operating/finance lease distinction elimination (lessee), impact on BS and ratios
- **Business Combinations (IFRS 3)** (when applicable): Acquisition method, goodwill recognition, purchase price allocation, contingent consideration
- **Impairment (IAS 36)** (when applicable): Cash-generating units, recoverable amount (higher of fair value less costs to sell and value in use), impairment indicators
- **Fair Value Measurement (IFRS 13)** (when applicable): Fair value hierarchy (Level 1 quoted prices, Level 2 observable inputs, Level 3 unobservable inputs), valuation techniques

### Derived Metrics and Analysis
- **Profitability Metrics** (required): ROE, ROA, operating profit margin, net profit margin, EBITDA margin
- **Leverage Metrics** (required): Debt ratio, debt-to-equity ratio, interest coverage ratio, net debt
- **Liquidity Metrics** (required): Current ratio, quick ratio, cash conversion cycle
- **Market Metrics** (when applicable): EPS, P/E ratio, P/B ratio, dividend yield, market capitalization
- **Per-Share Metrics** (when applicable): Basic EPS, diluted EPS, book value per share

### Regulatory and Compliance
- **IFRS Compliance** (required): Conformance to applicable IFRS/IAS standards, first-time adoption considerations
- **Audit Opinion** (required): Unqualified/qualified/adverse/disclaimer classification, going concern emphasis, key audit matters
- **Disclosure Requirements** (required): Statutory disclosure framework by jurisdiction, mandatory vs voluntary disclosures
- **Filing Requirements** (when applicable): SEC (10-K, 10-Q), FSC (사업보고서), FCA filings — jurisdiction-specific filing formats and deadlines

## Normative System Classification

Standards governing financial reporting operate at four distinct tiers.

| Tier | Name | Enforcement Mechanism | Change Velocity | Examples |
|------|------|----------------------|-----------------|---------|
| Tier-1a | Accounting Standards | **Legal obligation** + auditor enforcement | Slow (years) | IFRS/IAS standards, US-GAAP ASC, local GAAP |
| Tier-1b | Regulatory Requirements | **Securities regulator** enforcement | Medium (annual) | SEC filing rules, FSC disclosure regulations, stock exchange listing requirements |
| Tier-2 | Taxonomy and Data Standards | Industry consortium enforcement, regulatory adoption | Medium (annual) | XBRL 2.1, IFRS Taxonomy, FIBO, ESEF |
| Tier-3 | Industry Practice and Heuristics | Analyst convention, peer comparison | Fast (per analysis) | Non-GAAP metrics (adjusted EBITDA), industry KPIs, analyst consensus methods |

**Ordering principle**: Tier-1a > Tier-1b > Tier-2 > Tier-3. Accounting standards override everything; regulatory requirements override data standards and practice; data standards override practice.

Tier classification decision tree:
1. **Tier-1a**: Is this rule from an IFRS/IAS/US-GAAP standard or local GAAP? Would non-conformance produce a qualified audit opinion?
2. **Tier-1b**: If not Tier-1a, is this rule from a securities regulator (SEC, FSC, FCA)? Would non-conformance produce a filing rejection or regulatory action?
3. **Tier-2**: If not Tier-1a/1b, is this rule from a data/taxonomy standard (XBRL, IFRS Taxonomy, FIBO)? Is it enforced by filing systems or data consumers?
4. **Tier-3**: If none of the above, is this an industry practice, analyst convention, or common analytical method?

## Cross-Cutting Concerns

### Data Quality and Consistency

Spans all sub-areas. Financial data must be internally consistent (identities hold, cross-statement linkages match) and externally consistent (comparable across entities and periods).

- Internal: logic_rules.md §Accounting Identities + §Cross-Statement Linkage Rules
- External: concepts.md §Extension Account Handling (normalization for comparability)
- Temporal: logic_rules.md §Period Rules (period matching for valid comparison)

### Source Trustworthiness

Spans Financial Statement Structure, Notes System, and Regulatory Compliance. Data from different sources (XBRL, HTML, PDF) has different reliability levels.

- Source priority: dependency_rules.md §Source of Truth Transition Rules
- Audit status: reviewed (quarterly) vs audited (annual) vs unaudited
- Restatement handling: extension_cases.md §Restatement Processing

## Required Concept Categories

| Category | Description | Risk if Missing | Example of Failure |
|---|---|---|---|
| Reporting entity | Legal entity that prepares financial statements | Cannot attribute financial data to an entity | Revenue figure exists but no entity reference — cannot determine whose revenue it is |
| Financial item | Monetary information at the account level | No queryable data | Ontology has structure but no actual financial figures loaded |
| Reporting period | Time range of financial information | Temporal analysis impossible | Revenue figure exists without period — cannot determine which year it belongs to |
| Accounting policy | Recognition, measurement, and presentation choices | Comparison produces misleading results | Two companies' inventory figures compared without noting one uses FIFO and the other weighted average |
| Note information | Detailed descriptions of main statement items | Contingent liabilities and off-balance-sheet risks invisible | Material litigation pending but not discoverable because notes are excluded from the ontology |
| External reference | Taxonomy and standard linkage information | Inter-entity comparison impossible | Each entity's "revenue" stored under different concept IDs with no normalization mapping |
| Segment information | Business division-level data | Diversified company analysis impossible | Conglomerate's overall revenue is available but cannot break down which division contributes what |
| Audit status | Audit opinion and assurance level | Data reliability unknown | Restated quarterly figures treated with same confidence as audited annual figures |

## Reference Standards

This file is the **single source of truth for external standard version information** within the finance domain.

| Standard | Version/Year | Application Area | Core Content |
|----------|-------------|-----------------|--------------|
| IFRS | 2024 (annual bound volume) | Accounting standards | 17 IFRS + 29 IAS standards governing recognition, measurement, presentation, disclosure |
| XBRL | 2.1 (2003, maintained) | Data taxonomy | Structured financial reporting specification — instances, taxonomies, linkbases |
| IFRS Taxonomy | 2024 | Taxonomy elements | ~6,000 elements mapping to IFRS disclosure requirements |
| FIBO | Ongoing (W3C EDMC) | Financial ontology | Financial Industry Business Ontology — entities, instruments, regulatory concepts |
| US-GAAP | ASC (codification, updated) | US accounting standards | ~90 topics codified by FASB |
| ESEF | 2020 (EU regulation) | European filing | European Single Electronic Format — mandatory XBRL tagging for IFRS annual reports in EU |
| K-IFRS | 2024 (aligned with IFRS) | Korean accounting | Korean adoption of IFRS with local amendments |

## Bias Detection Criteria

### Coverage Distribution

- If more than 70% of questions concentrate on a single financial statement (e.g., BS only) → **statement bias**
- If only one of consolidated/separate is addressed → **reporting unit gap**
- If only a single point in time is addressed with no time series → **temporal bias**

### System Completeness

- If the notes area is completely ignored → **notes absence** (contingent liabilities, policies invisible)
- If only raw items are addressed with no derived metrics → **analysis gap**
- If only a single industry (general or financial) is addressed → **industry bias**
- If source format is not differentiated (XBRL vs PDF treated identically) → **source quality blindness**

### Analytical Depth

- If no inter-entity comparison capability exists → **comparability absence**
- If restatement handling is undefined → **version management gap**
- If segment reporting is absent for multi-segment entities → **segment blindness**
- If audit opinion/status is not tracked → **assurance level ignorance**

## Inter-Document Contract

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Accounting identities and math | logic_rules.md §Accounting Identities | structure_spec.md (references), dependency_rules.md (references) |
| Concept definitions and synonyms | concepts.md | All other files reference, do not redefine |
| Dependency direction rules | dependency_rules.md §Direction Rules | structure_spec.md (references) |
| Source of Truth priority | dependency_rules.md §Source of Truth Transition Rules | domain_scope.md (tier mapping) |
| Structural requirements | structure_spec.md §Required Node Types, §Required Relationships | Other files reference |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Competency questions | competency_qs.md | Other files provide inference path targets |
| Constraint conflict resolution | logic_rules.md §Constraint Conflict Checking | dependency_rules.md (cascading failures) |

### Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Financial Statement Structure | CQ-FS | Full |
| Chart of Accounts Classification | CQ-CA | Full |
| Accounting Identity | CQ-AI | Full |
| Period/Point-in-Time | CQ-TP | Full |
| Consolidated/Separate | CQ-CS | Full |
| Notes and Disclosure | CQ-ND | Full |
| Key Accounting Standards | CQ-AS | Full |
| Derived Metrics | CQ-DM | Full |
| Regulatory and Compliance | CQ-RC | Full |

Cross-cutting CQ sections:
- CQ-IE (Inter-Entity Comparison) — spans Chart of Accounts, Derived Metrics, Consolidated/Separate
- CQ-TS (Time Series) — spans all sub-areas with temporal dimension
- CQ-DQ (Data Quality) — spans all sub-areas; enforcement through logic_rules.md identities

## Related Documents
- concepts.md — Synonym mappings, homonyms, interpretation principles, taxonomy element definitions
- competency_qs.md — Competency questions organized by CQ-ID sections
- structure_spec.md — Node types, relationships, and structural requirements
- logic_rules.md — Accounting identities, period rules, IFRS-specific rules
- dependency_rules.md — Acyclic, direction, diamond, referential integrity rules
- extension_cases.md — Taxonomy change, new entity, multi-country scenarios
- conciseness_rules.md — Allowed/prohibited redundancy patterns
