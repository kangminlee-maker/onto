---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Structure Specification

Classification axis: **Structural component** — specifications classified by the accounting element they govern.

## Financial Statement Structure Required Elements

### Statement of Financial Position (재무상태표)

3-section structure per IAS 1:

- **Assets**: Current Assets (유동자산) + Non-current Assets (비유동자산)
  - Current Assets: Cash and Cash Equivalents, Trade Receivables, Inventories, Prepaid Expenses, Other Current Assets
  - Non-current Assets: PP&E, Intangible Assets, Investment Property, Long-term Investments, Deferred Tax Assets, Goodwill
- **Liabilities**: Current Liabilities (유동부채) + Non-current Liabilities (비유동부채)
  - Current Liabilities: Trade Payables, Short-term Borrowings, Current Portion of Long-term Debt, Accrued Expenses, Contract Liabilities
  - Non-current Liabilities: Long-term Borrowings, Lease Liabilities, Deferred Tax Liabilities, Provisions, Pension Liabilities
- **Equity**: Share Capital (자본금) + Share Premium (자본잉여금) + Retained Earnings (이익잉여금) + Accumulated OCI (기타포괄손익누계액) + Non-controlling Interest (비지배지분, if consolidated)

**Identity**: Assets = Liabilities + Equity (must hold within rounding)

### Statement of Comprehensive Income (포괄손익계산서)

Sequential structure per IAS 1.82-87:

```
Revenue (매출액)
- Cost of Sales (매출원가)
= Gross Profit (매출총이익)
- Selling, General and Administrative Expenses (판매비와관리비)
= Operating Income (영업이익)
+/- Other Income/Expenses (기타영업외손익)
+/- Finance Income/Costs (금융손익)
= Pre-tax Income (법인세차감전순이익)
- Income Tax Expense (법인세비용)
= Net Income (당기순이익)
+/- Other Comprehensive Income items (기타포괄손익)
= Total Comprehensive Income (총포괄이익)
```

Attribution for consolidated statements:
- Net Income attributable to Parent (모회사 귀속)
- Net Income attributable to NCI (비지배지분 귀속)

### Statement of Cash Flows (현금흐름표)

3-section structure per IAS 7:

- **Operating Activities (영업활동)**: Cash from operations — direct method (gross cash receipts/payments) or indirect method (net income + non-cash adjustments + working capital changes)
- **Investing Activities (투자활동)**: Purchase/sale of PP&E, intangibles, investments; loans to others
- **Financing Activities (재무활동)**: Borrowing/repayment, share issuance/repurchase, dividends paid

**Identity**: Opening Cash + Operating CF + Investing CF + Financing CF + Exchange rate effects = Closing Cash

### Statement of Changes in Equity (자본변동표)

Column structure per IAS 1.106:

| Equity Component | Opening | + Net Income | + OCI | + Capital Txns | - Dividends | Closing |
|---|---|---|---|---|---|---|
| Share Capital | X | — | — | X | — | X |
| Share Premium | X | — | — | X | — | X |
| Retained Earnings | X | X | — | — | (X) | X |
| Accumulated OCI | X | — | X | — | — | X |
| NCI (consolidated) | X | X | X | X | (X) | X |
| **Total** | X | X | X | X | (X) | X |

### Notes (주석)

4-area structure per IAS 1.112:

- **Significant Accounting Policies (중요한 회계정책)**: measurement bases, recognition criteria, consolidation principles
- **Critical Accounting Estimates (중요한 회계추정)**: sources of estimation uncertainty, sensitivities
- **Detailed Breakdowns (세부 내역)**: disaggregation of aggregated line items (inventory breakdown, PP&E movement schedule, leases)
- **Other Disclosures (기타 공시)**: related party transactions, contingencies, subsequent events, capital management, segment reporting

## Chart of Accounts

Hierarchical 3-level structure:

### Level 1: 5 Elements

| Code | Element | Temporal Attribute | Normal Balance |
|---|---|---|---|
| 1 | Assets (자산) | Instant | Debit |
| 2 | Liabilities (부채) | Instant | Credit |
| 3 | Equity (자본) | Instant | Credit |
| 4 | Revenue (수익) | Duration | Credit |
| 5 | Expenses (비용) | Duration | Debit |

### Level 2: Classification by Nature

| Code | Classification | Parent Element |
|---|---|---|
| 11 | Current Assets (유동자산) | 1 |
| 12 | Non-current Assets (비유동자산) | 1 |
| 21 | Current Liabilities (유동부채) | 2 |
| 22 | Non-current Liabilities (비유동부채) | 2 |
| 31 | Share Capital (자본금) | 3 |
| 32 | Retained Earnings (이익잉여금) | 3 |
| 33 | Other Equity Components | 3 |
| 41 | Operating Revenue (영업수익) | 4 |
| 42 | Non-operating Income (영업외수익) | 4 |
| 51 | Cost of Sales (매출원가) | 5 |
| 52 | SG&A (판매비와관리비) | 5 |
| 53 | Non-operating Expenses (영업외비용) | 5 |
| 54 | Income Tax (법인세비용) | 5 |

### Level 3: Individual Accounts

Transaction-recording units. Examples:
- 1101: Cash and Cash Equivalents
- 1102: Trade Receivables
- 1105: Inventories
- 4101: Sales Revenue
- 4102: Service Revenue
- 5101: Cost of Goods Sold

### Subsidiary Ledgers

Detailed breakdowns supplementing Level 3 accounts:
- Trade Receivables subsidiary ledger: by customer
- Inventory subsidiary ledger: by item (SKU, batch, location)
- PP&E subsidiary ledger: by asset (acquisition date, depreciation method)
- Accounts Payable subsidiary ledger: by vendor

## Required Relationships

| ID | Relationship | Description |
|---|---|---|
| RR-01 | Every Journal Entry has ≥1 Debit account and ≥1 Credit account | Double-entry fundamental |
| RR-02 | Every Account belongs to exactly one Element (5 classification) | Chart of accounts integrity |
| RR-03 | Every Financial Statement item maps to ≥1 General Ledger account | Traceability |
| RR-04 | Every Note reference points to existing Main Statement item | Referential integrity |
| RR-05 | Intercompany transactions have matching counterparty entries | Consolidation requirement |
| RR-06 | Every material estimate has documented basis | Audit evidence |

## Hierarchy Structure Principles

Upward aggregation from transaction to statement:

```
Transaction (occurrence)
    ↓
Journal Entry (분개, transaction recording)
    ↓
Ledger (account-level aggregation)
    ↓
Trial Balance (시산표, overall balance verification)
    ↓
Financial Statements (main + notes)
```

### Principles

- Changes at lower levels propagate to upper levels. Journal entry modification triggers ledger re-posting and statement update
- Lower-level entities are more granular; upper-level entities are aggregates
- Modifications allowed only at transaction level via new journal entries (adjusting entries). Direct ledger/trial balance/statement edits are forbidden
- Notes supplement main statements. Notes alone cannot redefine main statement meaning

## State System (Period Lifecycle)

| State | Description | Allowed Operations |
|-------|-------------|--------------------|
| Open | Active accounting period | Record transactions, post journals, adjust entries |
| Pre-closing | Period-end, adjusting entries phase | Adjusting entries only (no regular transactions) |
| Closing | Closing entries being posted | Closing entries; no new transactions |
| Closed | Period finalized | No modifications (only prior period corrections via next period) |
| Reopened | Error correction requires reopening | Adjusting entries for correction only; re-closing required |

### Transitions

- Open → Pre-closing: at period end date
- Pre-closing → Closing: after all adjusting entries posted and reviewed
- Closing → Closed: after closing entries posted and statements prepared
- Closed → Reopened: only when material error discovered and management approves

## Classification Criteria

### Current vs Non-current Classification

Per IAS 1.66 (Assets):
- Current if: realized/sold/consumed in normal operating cycle, OR held primarily for trading, OR realized within 12 months, OR cash/cash equivalent
- Non-current: everything else
- Operating cycle: default 12 months if not identifiable

Per IAS 1.69 (Liabilities):
- Current if: settled in normal operating cycle, OR held primarily for trading, OR due within 12 months, OR no unconditional right to defer beyond 12 months
- Non-current: everything else

### Operating vs Non-operating Classification

- **Operating**: directly related to entity's primary activities (revenue, COGS, SG&A, depreciation of PP&E)
- **Non-operating**: not directly related (finance income/cost, gains on sale of investments, foreign exchange gains/losses)
- K-IFRS does NOT prescribe Operating Income calculation format — entity chooses presentation

### Recurring vs Non-recurring

K-IFRS prohibits presentation of extraordinary items. All items classified only as operating/non-operating. Material one-time items disclosed separately within these categories.

## Verification Structure

### Monthly Closing

1. Trial Balance balance verification (total Debits = total Credits)
2. Bank reconciliation (book balance vs bank statement)
3. Receivable/Payable confirmation with counterparties (sample basis)
4. Monthly journal review (unusual entries flagged)

### Quarterly Closing

All monthly procedures +
1. Revenue/expense period attribution verification
2. Depreciation and amortisation recorded
3. ECL allowance updated (IFRS 9)
4. Inventory valuation verified (NRV check)
5. Quarterly review (if listed) by external auditor

### Annual Closing

All quarterly procedures +
1. Physical inventory count and reconciliation
2. Impairment review of all material assets (IAS 36)
3. Deferred Tax recalculation (IAS 12)
4. Notes preparation (IAS 1 disclosure requirements)
5. Annual audit by external auditor (ISA procedures)
6. Subsequent event review (IAS 10)

### Completion Criteria at Each Stage

- Every verification stage must produce:
  1. Completion criteria (what must be true)
  2. Verification evidence (documentary support)
  3. Approver identification (who signed off)
  4. Exception log (what was flagged and resolution)

## Isolated Node Prohibition

Accounts and structural elements that must not exist in isolation:

| Node Type | Required Connection | Warning If |
|-----------|--------------------|-----|
| Account (chart of accounts) | Used in ≥1 Journal Entry per period | Unused account for multiple periods (may indicate retired account) |
| Ledger Balance | Presented in financial statement | Balance present but not on statement (omitted reporting) |
| Financial Statement Item (material) | Referenced in notes | Material item without note reference (disclosure omission) |
| Classification | Defined in standard | Non-standard classification without policy disclosure |
| Note | Points to main statement item | Orphan note (no main statement reference) |
| Intercompany Transaction | Matched counterparty entry | Single-sided intercompany (elimination impossible) |

## Classification Criteria Design

### Account Classification Axes

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Element | Asset / Liability / Equity / Revenue / Expense | Determines normal balance, temporal attribute |
| Liquidity | Current / Non-current | Determines BS classification |
| Operating status | Operating / Non-operating | Determines IS classification |
| Measurement basis | Historical cost / Fair value / Amortised cost / NRV / Value in use | Determines measurement procedure |
| Audit priority | High risk / Medium risk / Low risk | Determines audit effort |

### Anti-Patterns in Classification

- **Arbitrary classification**: classifying based on ease rather than substance (e.g., all long-term items as non-current without 12-month test)
- **Silent reclassification**: changing classification without disclosure (IAS 1.45 requires disclosure of reclassification)
- **Mixed measurement without policy**: using both historical cost and fair value for the same asset class

## Domain Boundary Management

- **This domain covers**: transaction recording, ledger aggregation, financial statement preparation, closing procedures, disclosure
- **Finance domain covers**: financial statement ontology, analytical metrics, inter-statement relationships for querying
- **Accounting-kr domain covers**: Korea-specific practices, K-GAAP transition, DART filing requirements
- **Software-engineering domain covers**: database schema for accounting software, query optimization, UI
- **Business domain covers**: strategic analysis using accounting data (not the data production itself)

## SE Transfer Verification

| SE Pattern | Accounting Equivalent | Key Difference |
|---|---|---|
| Required Module Structure | Required Financial Statement Elements (BS, IS, CF, SoCE, Notes) | SE by architectural layer; accounting by reporting element |
| Golden Relationships | Required Relationships (RR-01 to RR-06) | SE validates code coherence; accounting validates transactional coherence |
| Naming Conventions | Chart of Accounts hierarchy (Level 1/2/3 with codes) | SE uses code conventions; accounting uses standardized account codes |
| Isolated Node Prohibition | Unused account warning, orphan note warning | Same principle; different domain objects |
| Classification Criteria Design | Account classification axes | SE classifies code; accounting classifies transactions/balances |

## Related Documents
- concepts.md — Account types, financial statement terms, measurement terms
- dependency_rules.md — Inter-statement linkage, direction rules, referential integrity
- logic_rules.md — Recognition, measurement, closing procedures
- domain_scope.md — Normative tier classification, cross-cutting concerns
- competency_qs.md — Structural verification questions
- extension_cases.md — Structural evolution scenarios
