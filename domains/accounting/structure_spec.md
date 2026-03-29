---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Accounting Domain — Structure Specification

## Financial Statement Structure Required Elements

- **Statement of Financial Position (재무상태표)**: 3-section structure of assets (current/non-current), liabilities (current/non-current), and equity. Complies with the Assets = Liabilities + Equity identity
- **Statement of Comprehensive Income (포괄손익계산서)**: sequential structure of revenue -> cost of goods sold -> gross profit -> SG&A -> operating income -> financial income/expenses -> income tax expense -> net income -> Other Comprehensive Income (기타포괄손익) -> total comprehensive income
- **Statement of Cash Flows (현금흐름표)**: 3-section structure of operating/investing/financing activities. Opening cash + change = closing cash
- **Notes**: 4-area structure covering significant accounting policies, estimation uncertainty, detailed breakdowns, and related party transactions

## Chart of Accounts

- Level 1: Assets (1), Liabilities (2), Equity (3), Revenue (4), Expenses (5) — 5 major classifications
- Level 2: Current assets (11), Non-current assets (12), Current liabilities (21), Non-current liabilities (22), etc. — classification by nature
- Level 3: Individual accounts (Cash and Cash Equivalents (현금및현금성자산), Trade Receivables (매출채권), Inventories (재고자산), etc.) — transaction recording units
- Subsidiary ledgers: detailed breakdowns of individual accounts (by counterparty, by asset) — supplementary information for the General Ledger (총계정원장)

## Required Relations

- Every Journal Entry (분개) must have at least 1 Debit (차변) account and 1 Credit (대변) account
- Every account must belong to exactly one of the 5 major classifications
- Cross-verification points must exist between financial statements (e.g., net income must match between the income statement and the Statement of Changes in Equity (자본변동표))
- Note numbers and main statement references must correspond to each other

## Hierarchy Structure Principles

- Journal Entry (분개, transaction) -> Ledger (account-level aggregation) -> Trial Balance (시산표, overall balance verification) -> Financial statements (reporting): upward aggregation structure
- Changes at lower levels must be reflected at upper levels. When a Journal Entry (분개) is modified, the ledger and financial statements must update accordingly
- Notes are supplementary to the main financial statements. Notes alone cannot change the meaning of main statement items

## Classification Criteria

- **Current/non-current classification**: whether realization/settlement is expected within 12 months after the reporting period. When the operating cycle exceeds 12 months, the operating cycle criterion applies
- **Operating/non-operating classification**: whether directly related to the entity's primary operating activities
- **Recurring/non-recurring classification**: K-IFRS prohibits the presentation of extraordinary items. All items are classified only as operating/non-operating

## Verification Structure

- Monthly closing: Trial Balance (시산표) balance verification, bank reconciliation, receivable/payable confirmation
- Quarterly closing: monthly verification + revenue/expense period attribution verification, depreciation recording
- Annual closing: quarterly verification + asset physical count, impairment review, Deferred Tax (이연법인세) recalculation, note preparation
- Completion criteria and verification evidence must be stated at each verification stage to enable audit trail

## Isolated Node Prohibition

- Accounts not used in any Journal Entry (분개) -> warning (unused account)
- Ledger balances not presented in financial statements -> warning (omitted reporting item)
- Financial statement items not referenced in notes (when material) -> warning (disclosure omission)
- Classification items not defined in any standard -> warning (non-standard classification)

## Related Documents
- concepts.md — definitions of accounts, financial statements, and other terms
- dependency_rules.md — inter-financial-statement linkage, inter-standard dependencies
- competency_qs.md — Q7~Q10 (financial statement structure questions)
