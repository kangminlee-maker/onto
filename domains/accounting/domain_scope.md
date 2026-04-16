---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing" in accounting systems.
This domain applies when **reviewing** accounting systems and financial reporting frameworks — transaction recording, journal entries, ledger aggregation, closing procedures, financial statement preparation, and note disclosure.

> **Boundary with finance domain**: The finance domain covers the output of accounting — financial statement ontologies, taxonomies, inter-statement relationships, analytical metrics. This domain covers the input and processing — journal entries, ledger posting, closing procedures, recognition/measurement rules, and disclosure mechanics. A completed income statement belongs to finance; the sequence of journal entries that produced it belongs to accounting.

> **Boundary with accounting-kr (Korean-specific) domain**: The accounting-kr domain covers Korea-specific accounting practices, K-GAAP vs K-IFRS transition issues, and Korean tax code interactions. This domain covers accounting fundamentals applicable across jurisdictions. Korean-specific regulatory filings (DART reporting) belong to accounting-kr; K-IFRS core standard principles belong here.

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Recording basis | Cash basis / Accrual basis | Timing of revenue/expense recognition |
| Standard | K-IFRS / K-GAAP / US-GAAP | Applicable accounting standard |
| Reporting unit | Consolidated / Separate | Financial statement preparation unit |
| Reporting frequency | Annual / Semi-annual / Quarterly / Monthly | Closing frequency |
| Entity type | General / Financial / Public sector / Non-profit | Chart of accounts structure varies |
| Measurement basis | Historical cost / Fair value / Amortised cost / NRV / Value in use | Valuation method per asset/liability |

## Key Sub-Areas

Classification axis: **Accounting concern** — Classified by the concern that an accounting system must address.

Applicability markers:
- **(required)**: Must be addressed in any accounting system review. Absence indicates a fundamental gap
- **(when applicable)**: Address when the entity's activity includes the relevant pattern. Condition type: feature existence (binary)
- **(scale-dependent)**: Becomes required beyond a scale threshold documented per item. Condition type: scale threshold (quantitative boundary crossed)

### Double-Entry Bookkeeping
- **Double-entry principles** (required): Debit (차변) / Credit (대변) balance, Journal Entry (분개), Trial Balance (시산표), Posting (전기), General Ledger (총계정원장)
- **Accrual basis accounting** (required): Revenue/expense recognition timing, differences from cash basis, period attribution via adjusting entries
- **Chart of accounts** (required): 5-element classification (Assets/Liabilities/Equity/Revenue/Expenses), account code hierarchy, subsidiary ledgers

### Financial Statements
- **Statement of Financial Position (재무상태표)** (required): Assets = Liabilities + Equity identity, current/non-current classification, measurement basis per item
- **Statement of Comprehensive Income (포괄손익계산서)** (required): Revenue/expense recognition, Operating Income structure, Other Comprehensive Income (기타포괄손익, OCI)
- **Statement of Cash Flows (현금흐름표)** (required): Operating/investing/financing classification, direct/indirect method for operating CF
- **Statement of Changes in Equity (자본변동표)** (required): Changes in equity components, Retained Earnings (이익잉여금) appropriation, OCI accumulation

### K-IFRS Core Standards
- **IFRS 15 Revenue Recognition (수익인식)** (required): 5-step model (contract → performance obligations → transaction price → allocation → recognition), over-time vs point-in-time
- **IFRS 16 Leases (리스)** (required): Right-of-Use Asset (사용권자산) / Lease Liability (리스부채) recognition, short-term and low-value exemptions
- **IFRS 9 Financial Instruments (금융상품)** (required): Classification (AC/FVOCI/FVTPL), Expected Credit Loss (기대신용손실), hedge accounting basics
- **IAS 36 Impairment (자산손상)** (when applicable): Cash-generating units, recoverable amount, impairment indicators, impairment reversal
- **IAS 2 Inventories (재고자산)** (when applicable): Cost formula (FIFO / weighted average), net realizable value, write-down
- **IAS 16 PP&E (유형자산)** (when applicable): Depreciation method, useful life, residual value, revaluation model
- **IAS 38 Intangible Assets (무형자산)** (when applicable): Recognition criteria, amortisation, internally generated intangibles
- **IFRS 3 Business Combinations (사업결합)** (when applicable): Acquisition method, goodwill (영업권) recognition, purchase price allocation (PPA)

### Period and Closing
- **Accounting period** (required): Fiscal year definition, interim periods, period attribution enforcement
- **Closing procedures** (required): Adjusting entries (수정분개), closing entries (마감분개), reversing entries, opening balance rollover
- **Disclosure and notes** (required): Significant accounting policy disclosure, estimation uncertainty, related party transactions, subsequent events
- **XBRL reporting** (scale-dependent): Electronic disclosure taxonomy mapping, tagging rules, validation. Scale threshold: listed entity

### Supporting Areas
- **Tax accounting** (when applicable): K-IFRS ↔ Corporate Tax Law reconciliation, Deferred Tax (이연법인세), tax adjustments (세무조정)
- **Cost accounting** (when applicable): Manufacturing cost allocation, job order vs process costing, standard costing, activity-based costing
- **Management accounting** (when applicable): Budgeting, variance analysis, break-even analysis, CVP analysis
- **Audit and internal controls** (when applicable): ISA-based audit procedures, internal control design (COSO framework), audit evidence, management assertions
- **Consolidated accounting** (when applicable): Control determination (IFRS 10), consolidation scope, intercompany elimination, Non-controlling Interest (비지배지분)
- **Foreign currency translation** (when applicable): Functional currency determination, transaction date rate, period-end rate, translation differences

## Normative System Classification

Standards governing accounting operate at four distinct tiers.

| Tier | Name | Enforcement Mechanism | Change Velocity | Examples |
|------|------|----------------------|-----------------|---------|
| Tier-1a | Accounting Standards | **Legal obligation** + auditor enforcement | Slow (years) | K-IFRS standards, IFRS/IAS, K-GAAP for non-listed, US-GAAP ASC |
| Tier-1b | Regulatory and Tax Requirements | **Regulatory/tax authority** enforcement | Medium (annual) | Financial Services Commission (FSC) disclosure rules, Corporate Tax Law, Income Tax Law, listing requirements |
| Tier-2 | Audit Standards and Data Taxonomies | Audit firm and regulatory review | Medium (annual) | ISA (International Standards on Auditing), XBRL taxonomies, DART filing rules |
| Tier-3 | Industry Practice and Heuristics | Professional convention, peer comparison | Fast (per analysis) | Common cost allocation methods, typical materiality thresholds (5% of pre-tax income), industry-specific metrics |

**Ordering principle**: Tier-1a > Tier-1b > Tier-2 > Tier-3. Accounting standards override everything; tax requirements override data standards and practice.

Tier classification decision tree:
1. **Tier-1a**: Is this rule from K-IFRS, IFRS/IAS, K-GAAP, or US-GAAP? Would non-conformance produce a qualified audit opinion?
2. **Tier-1b**: If not Tier-1a, is this rule from tax law, regulatory filing requirements, or listing rules? Would non-conformance produce a regulatory penalty?
3. **Tier-2**: If not Tier-1a/1b, is this rule from audit standards (ISA) or data taxonomies (XBRL)?
4. **Tier-3**: If none of the above, is this an industry practice or professional convention?

## Cross-Cutting Concerns

### Audit Trail

Spans all sub-areas. Every recorded transaction must be traceable from origin (source document) through journal entry, ledger, trial balance, to financial statement presentation.

- Transaction-to-statement traceability: logic_rules.md §Double-Entry Balance Logic
- Journal-to-ledger posting: dependency_rules.md §Direction Rules
- Supporting documentation retention: structure_spec.md §Verification Structure

### Period Attribution Integrity

Spans Double-Entry Bookkeeping, Financial Statements, and Period/Closing. Transactions must be attributed to the correct accounting period through accrual basis accounting.

- Accrual adjustments: logic_rules.md §Period Attribution Logic (unearned/accrued revenue, prepaid/accrued expense)
- Period boundaries: logic_rules.md §Closing Procedures
- Comparative period consistency: dependency_rules.md §Period Dependencies

### Measurement Consistency

Spans Financial Statements and Accounting Standards. Measurement basis (historical cost, fair value, amortised cost) must be consistently applied per accounting policy.

- Policy disclosure: concepts.md §Accounting Policy Choices
- Policy changes: extension_cases.md §K-IFRS Standard Amendment
- Measurement hierarchy: logic_rules.md §Measurement Logic

## Required Concept Categories

| Category | Description | Risk if Missing | Example of Failure |
|---|---|---|---|
| Debit/Credit balance (차변/대변) | Every transaction must have equal debits and credits | Trial Balance imbalance, financial statement integrity breakdown | Cash sale of 1M KRW recorded only as revenue increase — assets don't increase, trial balance broken |
| Accrual basis (발생기준) | Economic events recognized at occurrence, not cash exchange | Revenue/expense period attribution errors | December 31 service delivered, cash received January — if recorded in January only, December revenue understated |
| Going concern (계속기업) | Assumption that entity continues operations | Asset valuation basis breakdown; liquidation value application required instead | Bankruptcy-imminent entity still values assets at historical cost instead of NRV |
| Materiality (중요성) | Threshold for influencing user decisions | Excessive disclosure (noise) or omission of significant information | Disclosing every 10,000 KRW rounding difference as a note, obscuring material items |
| Substance over form (실질우선) | Economic substance drives accounting, not legal form | Formal classification errors | Sale-and-leaseback structured as sale for legal form but economically financing — must be classified as financing |
| Audit trail (추적가능성) | Traceability from transaction to statement | Audit impossible, error sources unidentifiable | Financial statements show revenue 10B but supporting journal entries only total 8B |
| Chart of accounts integrity | All accounts used are defined, classified correctly | Unauthorized accounts emerge, reporting drift | Journal entry uses "miscellaneous" account not in chart; aggregation produces inconsistent totals |
| Closing discipline | Period-end procedures executed completely | Period attribution errors carried forward | Adjusting entries not posted — accrued expenses missed, next period's opening balance wrong |
| Estimation reasonableness | Estimates (depreciation, ECL, Fair value) based on documented methodology | Subjective swings, manipulation risk | Depreciation useful life changed from 10 to 20 years without documented rationale — smoothed earnings artificially |

## Reference Standards/Frameworks

This file is the **single source of truth for external standard version information** within the accounting domain.

| Standard | Version | Application Area | Core Content |
|----------|---------|-----------------|--------------|
| K-IFRS | 2024 (aligned with IFRS) | Listed entity accounting | Korean adoption of IFRS; 17 IFRS + 29 IAS standards |
| K-GAAP | 2024 | Non-listed SME accounting | Korean accounting standards for entities not applying K-IFRS |
| Corporate Tax Law | 2024 (revised annually) | Tax accounting | Tax adjustments, Deferred Tax calculation |
| Income Tax Law | 2024 | Personal tax | Individual taxpayer filing and deduction rules |
| XBRL | 2.1 (2003, maintained) | Electronic disclosure | Structured reporting format for financial data |
| IFRS Taxonomy | 2024 | XBRL mapping | Element definitions for IFRS disclosure requirements |
| ISA | 2023 (IAASB) | Audit procedures | 40+ standards for audit planning, execution, reporting |
| COSO Internal Control Framework | 2013 | Internal controls | 5 components (control environment, risk assessment, control activities, information/communication, monitoring) |
| DART Taxonomy | Current | Korean electronic disclosure | Financial Supervisory Service taxonomy for DART filings |

## Bias Detection Criteria

### Coverage Distribution

- If 3 or more of the 5 concern areas are not represented at all → **insufficient coverage**
- If concepts from a specific standard (e.g., IFRS 15) account for more than 70% of the total → **standard bias**

### Transaction Path Completeness

- If only normal transactions are addressed with no adjusting entries/error corrections → **path bias**
- If only recognition/measurement is present with no disclosure/notes → **reporting incomplete**
- If closing procedures (adjusting, closing, reversing entries) are not addressed → **closing gap**

### Reporting Unit Completeness

- If only individual financial statements are present with no consolidated perspective (when applicable) → **consolidated perspective absence**
- If only current period is addressed with no comparative period → **comparability absence**

### Standard Separation

- If K-IFRS income is used directly as taxable income without tax adjustments → **tax-accounting confusion**
- If fair value measurement and cost measurement coexist for the same asset without policy documentation → **measurement policy ambiguity**
- If substance over form principle is not applied to complex transactions (e.g., leaseback, repo) → **form-driven classification**

## Inter-Document Contract

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Double-entry balance logic | logic_rules.md §Double-Entry Balance Logic | structure_spec.md (references) |
| Recognition rules (IFRS 15/9/16) | logic_rules.md §Recognition Logic | dependency_rules.md (references) |
| Concept definitions and synonyms | concepts.md | All other files reference, do not redefine |
| Source of Truth priority | dependency_rules.md §Source of Truth Management | domain_scope.md (tier mapping) |
| Structural requirements | structure_spec.md §Financial Statement Structure Required Elements | Other files reference |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Competency questions | competency_qs.md | Other files provide inference path targets |
| Constraint conflict resolution | logic_rules.md §Constraint Conflict Checking | dependency_rules.md (cascading failures) |

### Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Double-Entry Bookkeeping | CQ-DE | Full |
| Financial Statements | CQ-FS | Full |
| IFRS 15 Revenue Recognition | CQ-RR | Full |
| IFRS 9 Financial Instruments | CQ-FI | Full |
| IFRS 16 Leases | CQ-LS | Full |
| Period and Closing | CQ-PC | Full |
| Tax Accounting | CQ-TX | Full |
| Audit and Internal Controls | CQ-AU | Full |
| Consolidated Accounting | CQ-CS | Full |
| Disclosure and Notes | CQ-DS | Full |

Cross-cutting CQ sections:
- CQ-AT (Audit Trail) — spans all transaction flow sub-areas
- CQ-PA (Period Attribution) — spans Double-Entry, Financial Statements, Period/Closing
- CQ-MC (Measurement Consistency) — spans Financial Statements and Accounting Standards

## Related Documents
- concepts.md — Definitions of terms within this scope
- structure_spec.md — Specific rules for financial statement structure and chart of accounts
- competency_qs.md — Questions this scope must be able to answer
- logic_rules.md — Recognition, measurement, and balance logic
- dependency_rules.md — Inter-statement linkage, inter-standard dependencies
- extension_cases.md — Scenarios for accounting evolution (new revenue types, standard amendments, consolidation changes)
- conciseness_rules.md — Allowed/prohibited redundancy patterns
