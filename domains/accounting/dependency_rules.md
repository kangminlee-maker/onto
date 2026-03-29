---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Accounting Domain — Dependency Rules

## Inter-Financial-Statement Linkage

- Net income on the Statement of Comprehensive Income (포괄손익계산서) -> Retained Earnings (이익잉여금) change on the Statement of Changes in Equity (자본변동표): must match
- Closing equity on the Statement of Changes in Equity (자본변동표) -> Total equity on the Statement of Financial Position (재무상태표): must match
- Cash change on the Statement of Cash Flows (현금흐름표) -> Cash and Cash Equivalents (현금및현금성자산) change on the Statement of Financial Position (재무상태표): must match
- Other Comprehensive Income (기타포괄손익) on the Statement of Comprehensive Income (포괄손익계산서) -> Accumulated Other Comprehensive Income (기타포괄손익누계액) change on the Statement of Changes in Equity (자본변동표): must match
- If any of these 4 linkages is inconsistent, the integrity of the entire financial statements is compromised

## Direction Rules

- Transaction occurrence -> Journal Entry (분개) -> Posting (전기) -> Trial Balance (시산표) -> Financial statements: unidirectional flow. Reverse modifications are only permitted through Adjusting Entries (수정분개)
- Financial statements -> Notes: the main statements reference notes. Notes cannot change the recognition/measurement of main statement items
- K-IFRS standards -> Accounting policies -> Individual transaction treatment: application direction from higher to lower level
- Tax adjustments: K-IFRS financial statements -> Tax Adjustment (세무조정) -> Taxable income. Tax standards do not modify the financial statements

## Inter-Standard Dependencies

- IFRS 15 (Revenue Recognition) and IFRS 16 (Leases): when a contract contains both lease and non-lease components, they are separated and each standard is applied respectively
- IFRS 9 (Financial Instruments) and IFRS 15 (Revenue Recognition): initial recognition of trade receivables follows IFRS 15; subsequent measurement (impairment) follows IFRS 9
- IFRS 9 (Financial Instruments) and IFRS 16 (Leases): impairment of lease receivables uses IFRS 9's Expected Credit Loss (기대신용손실) model
- Inter-standard application priority: when a specific standard has explicit requirements for a particular transaction, that standard takes precedence

## Period Dependencies

- Prior period financial statement closing balances = current period financial statement opening balances: must match (carryover consistency)
- Comparative financial statements: current and prior periods are presented together. When accounting policies change, prior period financial statements are restated retrospectively
- Consistency between interim reporting (quarterly/semi-annual) and annual reporting summation: 4 quarters summed ≠ annual (year-end closing adjustments may exist)

## Inter-Account Dependencies

- Revenue and trade receivables: arise simultaneously for credit sales. When receivables are collected, receivables decrease and cash increases
- Depreciation expense and accumulated depreciation: expense recognition and asset reduction occur simultaneously
- Inventories and cost of goods sold: upon sale, inventories decrease and cost of goods sold increases
- Deferred Tax (이연법인세) assets/liabilities and income tax expense: linked to Temporary Difference (일시적차이) changes

## Referential Integrity

- Accounts referenced in Journal Entries (분개) must exist in the chart of accounts
- Financial statement items referenced in notes must exist in the main statements
- Accounting items referenced in Tax Adjustments (세무조정) must exist in the financial statements
- Subsidiaries referenced in consolidated financial statements must be included in the consolidation scope

## Source of Truth Management

- Source of truth for individual transactions: the journal. Ledgers and financial statements are aggregated/derived from the journal
- Source of truth for accounting policies: significant accounting policies described in the notes. Individual treatments are subordinate to these policies
- Source of truth for tax standards: Corporate Tax Law/Income Tax Law. Applied independently from K-IFRS standards
- When sources of truth conflict: apply based on purpose (financial reporting purpose -> K-IFRS; tax purpose -> tax law)

## External Dependency Management

- K-IFRS standard amendments: when amended, review whether accounting policy changes are required, distinguish retrospective vs. prospective application
- Tax law amendments: when tax rates change, Deferred Tax (이연법인세) recalculation is required
- Exchange rate fluctuations: the point-in-time basis for applicable exchange rates must be stated for foreign currency transactions/translations
- Appraisals: when measuring Fair Value (공정가치), the independence and qualification of external experts must be verified

## Related Documents
- concepts.md — definitions of financial statement and standards-related terms
- structure_spec.md — financial statement structure and hierarchy principles
- logic_rules.md — recognition/measurement logic and tax-accounting difference logic
