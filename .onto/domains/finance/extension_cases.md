---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Extension Scenarios

Classification axis: **Change trigger** — cases classified by the type of change that triggers structural evolution of the financial ontology. Cases cover both growth triggers (Cases 1–8) and shrinkage/migration triggers (Cases 9–10).

---

## Case 1: Adding a New Company

### Situation
Adding a previously absent company's financial statements to the ontology.

### Case Study: Adding a Financial Industry Entity (Banking)
A general-industry ontology expanded to include a major bank. The bank's IS started with Net Interest Income (not Revenue → Gross Profit), regulatory capital disclosures (CET1, Tier 1) were required beyond standard 5-statement completeness, and >40% of accounts were company-specific extensions requiring normalization.

### Impact Analysis

| Principle | Impact |
|---|---|
| Entity node creation | New Entity with industry classification and listing status |
| Statement structure | Financial industry may require additional statements |
| Extension accounts | Normalization mapping for company-specific accounts |
| Referential integrity | RI01 (concept exists), RI05 (entity recognized) |

### Verification Checklist
- [ ] Entity node created with correct industry classification? → structure_spec.md §Required Node Types
- [ ] All required statements created for entity-period? → structure_spec.md §Financial Statement Completeness
- [ ] Extension accounts mapped to canonical names? → concepts.md §Extension Account Handling
- [ ] Referential integrity verified? → dependency_rules.md §Referential Integrity

### Affected Files
| File | Impact | Section |
|---|---|---|
| structure_spec.md | Verify | §Financial Statement Completeness (industry branching) |
| concepts.md | Modify | §Extension Account Handling (new mappings) |
| dependency_rules.md | Verify | §Referential Integrity |

---

## Case 2: Adding Quarterly Reports

### Situation
Adding quarterly reports for a company that previously had only annual reports.

### Case Study: First Quarterly Data Ingestion
An entity's annual report was structured (XBRL). Quarterly reports were available only as HTML filings. Challenges: cumulative YTD vs single-quarter distinction, reviewed (not audited) status requiring confidence metadata, and quarterly extension accounts not matching annual taxonomy.

### Impact Analysis

| Principle | Impact |
|---|---|
| Period nodes | Quarterly Period nodes with distinct start/end dates |
| Period rules | PR03 enforcement (quarterly vs annual comparison prevented) |
| Cumulative vs single-quarter | PR04 metadata to distinguish YTD from single-quarter |
| Assurance level | Quarterly = reviewed (not audited); lower confidence |
| Source quality | Quarterly may come from different source format |

### Verification Checklist
- [ ] Quarterly Period nodes created with correct dates? → structure_spec.md §Required Node Types → Period
- [ ] PR03 prevents quarterly-annual direct comparison? → logic_rules.md §Period Rules
- [ ] Cumulative vs single-quarter distinguished? → logic_rules.md §Period Rules → PR04
- [ ] Assurance level (reviewed) captured? → structure_spec.md §Required Node Types → AuditInfo
- [ ] Source type metadata captured for quarterly data? → dependency_rules.md §Source Quality Metadata

### Affected Files
| File | Impact | Section |
|---|---|---|
| structure_spec.md | Verify | §Required Node Types (Period, AuditInfo) |
| logic_rules.md | Verify | §Period Rules (PR03, PR04) |
| dependency_rules.md | Verify | §Source of Truth Transition Rules |

---

## Case 3: IFRS Taxonomy Version Update

### Situation
The IFRS Foundation releases an annual taxonomy update — elements added, renamed, deprecated, or restructured.

### Case Study: IFRS Taxonomy 2023 → 2024 Update
Taxonomy update introduced new elements for IFRS 17 (Insurance Contracts) and refined IFRS 9 disclosure elements. 15 elements deprecated, 23 added, 8 renamed. Historical FinancialFacts referencing deprecated elements needed migration to new element IDs while preserving query continuity.

### Impact Analysis

| Principle | Impact |
|---|---|
| Concept hierarchy | Additions, deletions, renames in Concept nodes |
| Referential integrity | RI01 re-verification for all HAS_CONCEPT edges |
| Synonym mappings | concepts.md update for renamed elements |
| Historical data | Cross-version correspondence table for deprecated → new mapping |
| Version tracking | Taxonomy version per entity-period must be tracked |

### Verification Checklist
- [ ] Changed Concept nodes identified? → concepts.md §Core Synonym Mappings
- [ ] RI01 re-verified? → dependency_rules.md §Referential Integrity
- [ ] Synonym mappings updated? → concepts.md §Extension Account Handling
- [ ] Historical data migrated or cross-version table maintained? → structure_spec.md §Version Management
- [ ] Taxonomy version tracked per entity-period? → dependency_rules.md §Taxonomy/Instance Separation

### Affected Files
| File | Impact | Section |
|---|---|---|
| concepts.md | Modify | §Core Synonym Mappings, §Extension Account Handling |
| dependency_rules.md | Verify | §Referential Integrity, §Taxonomy/Instance Separation |
| structure_spec.md | Verify | §Semantic Identifier Preservation, §Version Management |

---

## Case 4: Non-Financial Data Integration (ESG)

### Situation
Adding ESG (Environmental, Social, Governance) metrics, workforce statistics, and sustainability disclosures alongside financial data.

### Case Study: ISSB S1/S2 Integration
ISSB released sustainability disclosure standards (IFRS S1 General, IFRS S2 Climate) aligned with IFRS financial reporting. Non-financial facts (carbon emissions, workforce diversity, board composition) required new Concept types, different temporal granularity (some metrics are annual-only), and different source dependencies (sustainability reports, CDP filings).

### Impact Analysis

| Principle | Impact |
|---|---|
| New node types | NonFinancialFact or extended FinancialFact with category tag |
| Relationship reuse | REPORTED_BY, IN_PERIOD reusable; HAS_CONCEPT requires extended taxonomy |
| Accounting identity impact | EQ01-EQ03 do not apply to non-financial data — separate rule set needed |
| Source dependencies | Non-financial data rarely from XBRL; typically semi-structured/unstructured |
| Comparability | Non-financial metrics have less standardized definitions than financial |

### Verification Checklist
- [ ] New node type or category tag defined? → structure_spec.md §Required Node Types
- [ ] Existing relationships reused where possible? → structure_spec.md §Required Relationships
- [ ] Existing accounting identities not impacted? → logic_rules.md §Accounting Identities
- [ ] Separate logic rules for non-financial data defined? → logic_rules.md
- [ ] Source quality tracked for non-financial data? → dependency_rules.md §Source Quality Metadata

### Affected Files
| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Required Node Types (new type or extension) |
| logic_rules.md | Modify | §new section for non-financial rules |
| dependency_rules.md | Verify | §Source of Truth Transition Rules |

---

## Case 5: Multi-Country Expansion

### Situation
Expanding from single-country financial data to multi-country coverage with different accounting standards (IFRS, US-GAAP, J-GAAP).

### Case Study: IFRS ↔ US-GAAP Cross-Mapping
Expanding from Korea (K-IFRS) to US (US-GAAP) entities. Key differences: goodwill amortisation (US-GAAP 2024 option vs IFRS impairment-only), LIFO allowed (US-GAAP) vs prohibited (IFRS), lease classification (US-GAAP retains operating/finance for lessees; IFRS does not). The EQUIVALENT_TO relationship between IFRS and US-GAAP taxonomy elements required mapping ~2,000 elements with ~300 partial correspondences.

### Impact Analysis

| Principle | Impact |
|---|---|
| Entity codes | Cross-country entity code unification (stock codes, LEI) |
| Taxonomy mapping | IFRS ↔ US-GAAP ↔ Local GAAP cross-mapping (~2,000 elements) |
| Currency | Multi-currency dimension added to FinancialFact |
| Reporting frequency | Different disclosure frequencies and fiscal year-ends |
| Accounting standard differences | LIFO, goodwill, lease classification differences must be flagged |

### Verification Checklist
- [ ] Entity code system unified across countries? → structure_spec.md §ID System
- [ ] Cross-standard taxonomy mapping defined? → concepts.md §External Standard Mappings
- [ ] Currency dimension added? → structure_spec.md §Required Node Types → FinancialFact attributes
- [ ] Accounting standard differences flagged during comparison? → concepts.md §Interpretation Principles → #3
- [ ] Period rules accommodate non-December fiscal year-ends? → logic_rules.md §Period Rules → PR05

### Affected Files
| File | Impact | Section |
|---|---|---|
| concepts.md | Modify | §External Standard Mappings (cross-standard) |
| structure_spec.md | Modify | §ID System (multi-country), §Required Node Types (currency) |
| logic_rules.md | Verify | §Period Rules (PR05, PR03 with different standards) |

---

## Case 6: Restatement Processing

### Situation
A previously filed report is superseded by a restated filing.

### Case Study: Material Restatement Due to Revenue Recognition Error
A company restated 3 years of revenue after discovering premature recognition (recognizing revenue before performance obligations were satisfied under IFRS 15). The restatement created multiple FinancialFact versions for the same entity-period-concept combination. Prior period BS figures also changed due to cumulative effect adjustment.

### Impact Analysis

| Principle | Impact |
|---|---|
| Version management | Multiple instances for same entity-period-concept |
| Final version determination | Filing ID + date determines authoritative version |
| Historical comparison | Previous versions preserved for trend analysis |
| Cross-statement impact | IS restatement cascades to BS (retained earnings) and equity changes |
| Partial restatement | Only changed items updated; unchanged items retained from original |

### Verification Checklist
- [ ] Restatement detected (multiple versions for same combination)? → structure_spec.md §Version Management
- [ ] Final version determinable by filing metadata? → structure_spec.md §Version Management
- [ ] Previous versions deactivated but preserved? → structure_spec.md §Version Management
- [ ] Cross-statement impact verified? → logic_rules.md §Cross-Statement Linkage Rules
- [ ] Referential integrity maintained for final version? → dependency_rules.md §Referential Integrity

### Affected Files
| File | Impact | Section |
|---|---|---|
| structure_spec.md | Verify | §Version Management, §ID System |
| logic_rules.md | Verify | §Cross-Statement Linkage Rules (XL04) |
| dependency_rules.md | Verify | §Referential Integrity |

---

## Case 7: New Accounting Standard Adoption

### Situation
A new or significantly amended IFRS standard takes effect, changing recognition, measurement, or disclosure requirements.

### Case Study: IFRS 16 Leases Adoption (2019)
Operating leases moved from off-balance-sheet to on-balance-sheet. Right-of-use assets and lease liabilities appeared on BS for the first time. Companies chose between full retrospective and modified retrospective transition methods. Impact: total assets and total liabilities increased by 10-30% for asset-heavy companies (airlines, retail). Existing ratios (debt-to-equity, ROA) were fundamentally altered.

### Impact Analysis

| Principle | Impact |
|---|---|
| New concepts | Right-of-use asset, lease liability taxonomy elements added |
| BS impact | Total assets and liabilities increase materially |
| Ratio impact | Leverage ratios, ROA, interest coverage all affected |
| Transition method | Full retrospective vs modified retrospective → different comparability |
| Historical comparison | Pre-adoption and post-adoption figures not directly comparable |

### Verification Checklist
- [ ] New taxonomy elements added to Concept hierarchy? → concepts.md §IFRS 16 Lease Terms
- [ ] Accounting identities still hold with new elements? → logic_rules.md §Accounting Identities
- [ ] Derived metric formulas updated or caveated? → logic_rules.md §Derived Metric Calculation Rules
- [ ] Transition method documented for comparability? → concepts.md §Accounting Policy Differences
- [ ] Historical comparison flagged for standard adoption impact? → concepts.md §Interpretation Principles

### Affected Files
| File | Impact | Section |
|---|---|---|
| concepts.md | Modify | §relevant IFRS section, §Accounting Policy Differences |
| logic_rules.md | Modify | §relevant rules, §Derived Metric Calculation Rules |
| structure_spec.md | Verify | §Required Node Types (Concept) |

---

## Case 8: Source Format Migration (PDF → XBRL)

### Situation
A previously PDF-only filing jurisdiction mandates XBRL filing, or a company that was available only via HTML now files in XBRL.

### Case Study: EU ESEF Mandate (2020)
EU mandated XBRL tagging (European Single Electronic Format) for IFRS annual reports. Previously HTML-only filings became XBRL-tagged. Challenges: initial XBRL filings had high error rates, extension accounts were tagged inconsistently, and block-tagged notes (entire note sections tagged as one element rather than granular tagging) limited data extraction.

### Impact Analysis

| Principle | Impact |
|---|---|
| Source quality upgrade | PDF/HTML (Priority 2/3) → XBRL (Priority 1) |
| ID system | Temporary IDs from PDF can be replaced by XBRL element IDs |
| Referential integrity | RI03 temporary IDs promoted to canonical |
| Data completeness | XBRL may tag more items than what was extractable from PDF |
| Validation | XBRL filing validation rules catch errors not detected in PDF |

### Verification Checklist
- [ ] Source priority metadata updated? → dependency_rules.md §Source of Truth Transition Rules
- [ ] Temporary IDs promoted to canonical XBRL IDs? → dependency_rules.md §Referential Integrity → RI03
- [ ] Historical PDF data preserved for comparison? → structure_spec.md §Version Management
- [ ] XBRL validation errors handled? → logic_rules.md §Accounting Identities

### Affected Files
| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Source of Truth Transition Rules, §Referential Integrity |
| structure_spec.md | Verify | §ID System (canonical promotion) |

---

## Case 9: Entity Delisting or Dissolution

### Situation (Shrinkage)
A company delists from a stock exchange or dissolves. Historical data must be preserved but entity status updated.

### Impact Analysis

| Principle | Impact |
|---|---|
| Entity status | Listing status → delisted, with effective date |
| Historical preservation | All historical facts preserved with immutable period attribution |
| Going concern | Final filing may have going concern emphasis |
| Segment changes | Segments may be dissolved or transferred to acquirer |
| Comparison impact | Peer comparison sets must exclude delisted entity from current period |

### Verification Checklist
- [ ] Entity status updated with delisting/dissolution date? → structure_spec.md §Required Node Types
- [ ] Historical data preserved and queryable? → structure_spec.md §Version Management
- [ ] Peer comparison exclusion implemented? → competency_qs.md CQ-IE
- [ ] Going concern audit emphasis captured? → structure_spec.md §Required Node Types → AuditInfo

---

## Case 10: Taxonomy Element Deprecation

### Situation (Shrinkage)
A taxonomy element is deprecated in a new IFRS Taxonomy version. All references must be migrated.

### Impact Analysis

| Principle | Impact |
|---|---|
| Concept node | Mark as deprecated with sunset date |
| Migration mapping | Deprecated element → replacement element mapping |
| Historical data | Old references preserved for historical queries; new queries use replacement |
| Cross-version queries | Queries spanning pre/post-deprecation must use mapping table |

### Verification Checklist
- [ ] Deprecated concept marked with metadata? → structure_spec.md §Semantic Identifier Preservation
- [ ] Migration mapping defined? → concepts.md §Extension Account Handling
- [ ] Historical queries still functional? → competency_qs.md CQ-TS
- [ ] New filings use replacement element? → dependency_rules.md §Referential Integrity

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (New Company) | → Case 3 (Taxonomy) | New company may use newer taxonomy version |
| Case 2 (Quarterly) | → Case 8 (Source Migration) | Quarterly data may come from different source format |
| Case 3 (Taxonomy Update) | → Case 10 (Deprecation) | Taxonomy updates include element deprecations |
| Case 4 (ESG) | → Case 7 (New Standard) | ESG standards (ISSB S1/S2) are new accounting standards |
| Case 5 (Multi-Country) | → Case 3 (Taxonomy) | Different countries use different taxonomy versions |
| Case 6 (Restatement) | → Case 2 (Quarterly) | Restatements may affect both quarterly and annual data |
| Case 7 (New Standard) | → Case 3 (Taxonomy) | New standards produce new taxonomy elements |
| Case 8 (Source Migration) | → Case 1 (New Company) | Newly XBRL-filed companies become data-accessible |
| Case 9 (Delisting) | → Case 6 (Restatement) | Final filings may include retrospective adjustments |
| Case 10 (Deprecation) | → Case 5 (Multi-Country) | Deprecation affects cross-country mapping tables |

---

## Related Documents
- domain_scope.md — Classification axes affected by extension scenarios
- concepts.md — Mapping update targets for new companies and taxonomy changes
- structure_spec.md — Structural basis for adding new node types and relationships
- dependency_rules.md — Source transition and referential integrity rules
- logic_rules.md — Identity impact verification for new data types
- competency_qs.md — Advanced questions addressed by extension scenarios
