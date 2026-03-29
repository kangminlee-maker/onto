---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Finance Domain — Domain Scope Definition

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Reporting framework | IFRS / Local GAAP | Applicable accounting standard |
| Reporting unit | Consolidated / Separate | Financial statement preparation unit |
| Reporting frequency | Annual / Semi-annual / Quarterly | Disclosure frequency |
| Industry classification | General / Financial | Financial statement structure and chart of accounts differ |
| Temporal attribute | instant / duration | Time attribution method of financial items |

## Core Areas (6)

1. **Financial Statement Structure** — components and interrelationships of the Statement of Financial Position (BS), Income Statement (IS), Cash Flow Statement (CF), Statement of Changes in Equity, and Statement of Comprehensive Income
2. **Chart of Accounts Classification** — hierarchical structure of assets/liabilities/equity/revenue/expenses, current/non-current classification, extension account handling
3. **Accounting Identity** — mathematical constraints such as Assets = Liabilities + Equity, net income linkage, cash flow verification
4. **Period/Point-in-Time Distinction** — rules for distinguishing and applying instant and duration attributes
5. **Consolidated/Separate Distinction** — scope of consolidated and separate financial statements, consolidation adjustments, intercompany transaction elimination
6. **Notes System** — the role of Notes, reference relationships with main statement items, accounting policy disclosures

## Supporting Areas (4)

1. **Derived Metrics** — analytical indicators derived from basic financial items, such as ROE, debt ratio, EPS
2. **Time Series Analysis** — period-over-period comparison for the same entity, trend analysis, restatement reflection
3. **Inter-Entity Comparison** — financial item comparison within the same industry, accounting code mapping difference correction
4. **Corporate Governance Structure** — ownership structure, associates, subsidiary relationships

## Key Accounting Standard Areas (3)

1. **Revenue Recognition (IFRS 15)** — 5-step revenue recognition model (contract identification -> performance obligation identification -> transaction price determination -> allocation -> recognition), over-time vs. point-in-time recognition
2. **Financial Instruments (IFRS 9)** — classification (amortised cost/FVOCI/FVPL), impairment (expected credit loss model), hedge accounting
3. **Leases (IFRS 16)** — right-of-use asset and lease liability recognition, elimination of operating/finance lease distinction (lessee side), impact on total assets and liabilities

## Regulatory/Standards (3)

1. **IFRS Compliance** — verification of International Financial Reporting Standards compliance
2. **Audit** — audit opinion classification: unqualified / qualified / adverse / disclaimer of opinion
3. **Disclosure Requirements** — statutory disclosure framework, processing rules by disclosure type

## Required Concept Categories (6)

| Category | Description | Examples |
|---|---|---|
| Reporting entity | Legal entity that prepares financial statements | A specific listed company, a specific financial institution |
| Financial item | Monetary information at the account level | Revenue, total assets, net income |
| Reporting period | Time range of financial information | A specific quarter, a specific fiscal year |
| Accounting policy | Recognition, measurement, and presentation method choices | Inventory valuation method, depreciation method |
| Note information | Detailed descriptions of main statement items | Contingent liability details, related party transactions |
| External reference | Taxonomy and standard linkage information | IFRS taxonomy element, FIBO mapping |

## Reference Standards (4)

1. IFRS (International Financial Reporting Standards)
2. XBRL 2.1 Specification
3. FIBO (Financial Industry Business Ontology)
4. Locally adopted accounting standards by country (K-IFRS, J-GAAP, etc.)

## Bias Detection Criteria (6)

1. Warning when more than 70% of questions are concentrated on a specific financial statement (e.g., Statement of Financial Position)
2. Warning when only one of consolidated/separate is addressed
3. Warning when only a single point in time is repeatedly addressed with no time series questions
4. Warning when the notes area is completely ignored
5. Warning when only raw items are addressed with no derived metrics
6. Warning when only a single industry (general or financial) is addressed

## Related Documents

- [concepts.md](concepts.md) — synonym mappings, homonyms, and interpretation principles for core concepts
- [competency_qs.md](competency_qs.md) — competency questions as the practical application targets of bias detection criteria
- [structure_spec.md](structure_spec.md) — the structure in which required concept categories are realized as ontology nodes
- [logic_rules.md](logic_rules.md) — formal definitions of accounting identities and period/point-in-time rules
- [extension_cases.md](extension_cases.md) — extension scenarios for industry and source format changes
