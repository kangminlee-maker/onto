---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Logic Rules

Classification axis: **Rule type** — rules classified by the nature of the financial constraint they enforce.

## Accounting Identities

Fundamental mathematical constraints that must hold. Violation indicates data error, not a business exception.

| ID | Identity | Violation Severity | Verification Timing | Tolerance |
|---|---|---|---|---|
| EQ01 | Assets = Liabilities + Equity | Error (block) | At input | ±1 unit (rounding) |
| EQ02 | Opening equity + Net income + OCI ± Capital transactions = Closing equity | Warning | At query | ±1% of equity (notes may be incomplete) |
| EQ03 | Opening cash + Operating CF + Investing CF + Financing CF = Closing cash | Error (block) | At input | ±1 unit (rounding) |
| EQ04 | Comprehensive income = Net income + Other comprehensive income | Error (block) | At input | ±1 unit |
| EQ05 | Total assets = Current assets + Non-current assets | Error (block) | At input | ±1 unit |
| EQ06 | Total liabilities = Current liabilities + Non-current liabilities | Error (block) | At input | ±1 unit |

> **EQ02 Warning rationale:** Not all items from the Statement of Changes in Equity may be available as structured data (treasury stock transactions, stock-based compensation, dividends). Note information may be needed for complete verification. A warning allows data to be stored while flagging the gap for investigation.

### Identity Verification Priority

When multiple identities can be verified, prioritize by impact:
1. **EQ01** (BS equation) — most fundamental; failure indicates systemic data error
2. **EQ03** (CF reconciliation) — second most critical; failure often indicates missing CF items
3. **EQ05, EQ06** (subtotal consistency) — structural consistency within BS
4. **EQ04** (OCI linkage) — important but OCI items are sometimes presented differently
5. **EQ02** (equity reconciliation) — lowest priority due to data availability constraints

## Cross-Statement Linkage Rules

These rules verify consistency between different financial statements.

| ID | Rule | From Statement | To Statement | Severity |
|---|---|---|---|---|
| XL01 | Net income in IS = Net income in Statement of Changes in Equity | IS | Equity Changes | Error |
| XL02 | Closing cash in CF = Cash and cash equivalents in BS | CF | BS | Error |
| XL03 | OCI items in Comprehensive Income = OCI items in Statement of Changes in Equity | OCI | Equity Changes | Warning |
| XL04 | Opening balances in current period BS = Closing balances in prior period BS | BS(t) | BS(t-1) | Warning |

> **XL04 Warning:** Restated prior-period figures may differ from the originally reported prior period. Verification requires restatement-aware comparison — match against the restated version, not the original filing.

## Relation Rules

Arithmetic relationships within financial statements.

| ID | Rule | Description | Severity | Industry |
|---|---|---|---|---|
| RE01 | Gross profit = Revenue - Cost of goods sold | IS arithmetic | Error | General |
| RE02 | Operating income = Gross profit - SG&A | Varies by industry — see note | Warning | General |
| RE03 | Current ratio = Current assets / Current liabilities | Derived metric formula | — (calculation) | All |
| RE04 | Quick ratio = (Current assets - Inventory) / Current liabilities | Derived metric formula | — (calculation) | All |
| RE05 | Interest coverage = EBIT / Interest expense | Derived metric formula | — (calculation) | All |
| RE06 | Working capital = Current assets - Current liabilities | Derived metric formula | — (calculation) | All |

> **RE02 industry branching:** Financial industry has a different operating income structure. Instead of "gross profit - SG&A," it starts from net interest income, fee income, and insurance premium income. The general industry formula does not apply. Rule selection branches on the industry classification axis (general/financial).

### Financial Industry Specific Rules

| ID | Rule | Description | Severity |
|---|---|---|---|
| FI-RE01 | Net interest income = Interest income - Interest expense | Bank P&L starting point | Error |
| FI-RE02 | Pre-provision income = Net interest income + Non-interest income - Non-interest expense | Bank operating metric | Warning |
| FI-RE03 | CET1 ratio = Common Equity Tier 1 / Risk-weighted assets | Basel III regulatory ratio | — (calculation) |

## Period Rules

Temporal attribution and comparison constraints.

| ID | Rule | Description | Verification Timing | Severity |
|---|---|---|---|---|
| PR01 | Instant items are attributed to a specific date | BS items (assets, liabilities, equity) | At input | Error |
| PR02 | Duration items are attributed to a start-date-to-end-date interval | IS and CF items | At input | Error |
| PR03 | Period comparison of the same item requires matching durations | Prevents quarterly vs annual comparison | At query | Error |
| PR04 | Cumulative YTD figures must be distinguishable from single-quarter figures | Q3 cumulative (Jan-Sep) ≠ Q3 single (Jul-Sep) | At input | Warning |
| PR05 | Fiscal year end date must be captured — not all entities use December 31 | April-end (Japan), March-end (Korea gov), June-end (retail) | At input | Warning |

> **PR03 enforcement:** Even for the same company, quarterly revenue (3-month) and annual revenue (12-month) are not directly comparable. The ontology must prevent queries that compare items across different durations without explicit normalization (e.g., annualization).

### Period Identification

- Period identification uses the combination: `{EntityCode}_{StartDate}_{EndDate}_{ReportingUnit}_{Source}`
- Same entity, same dates, but different sources (XBRL vs PDF) produce different Facts — source provenance is part of the identifier
- Restated filings for the same period produce additional version-tagged instances

## Classification Rules

| ID | Rule | Description | Severity |
|---|---|---|---|
| CL01 | BS items with recovery/settlement ≤12 months are current | IAS 1.66 current asset criteria | Warning |
| CL02 | Liabilities with no unconditional right to defer beyond 12 months are current | IAS 1.69 current liability criteria | Warning |
| CL03 | Reclassification of current portion of long-term debt | Long-term borrowings due ≤12 months → current | Warning |
| CL04 | Financial assets classified by business model + SPPI test | IFRS 9 classification: amortised cost / FVOCI / FVPL | Warning |

> **CL01-CL03 Warning:** Classification often requires judgment and note disclosures. Automated verification may flag items that are correctly classified based on judgment not visible in structured data.

## Revenue Recognition Rules (IFRS 15)

| ID | Rule | Description | Verification Timing | Severity |
|---|---|---|---|---|
| RR01 | Revenue is recognized at the point of or over the period of performance obligation fulfillment | Point-in-time vs over-time | At input | Warning |
| RR02 | Variable consideration is estimated and included in the transaction price | Returns, rebates, performance bonuses | At query | Warning |
| RR03 | Contract assets arise when performance precedes payment | Right to consideration not yet unconditional | At input | Warning |
| RR04 | Contract liabilities arise when payment precedes performance | Obligation to transfer goods/services | At input | Warning |
| RR05 | Multi-element arrangements allocate transaction price to performance obligations | Standalone selling price basis | At query | Warning |

> **IFRS 15 Warning rationale:** Revenue recognition requires significant judgment (identification of performance obligations, estimation of variable consideration). Automated verification can flag patterns but cannot replace judgment — hence Warning severity.

## Financial Instrument Classification Rules (IFRS 9)

| ID | Rule | Description | Verification Timing | Severity |
|---|---|---|---|---|
| FI01 | Financial assets classified by business model + cash flow test | Amortised cost / FVOCI / FVPL | At input | Warning |
| FI02 | ECL measured as 12-month (Stage 1) or lifetime (Stage 2/3) | Significant increase in credit risk triggers Stage 2 | At query | Warning |
| FI03 | Hedge relationships require documentation and effectiveness testing | Hedging instrument ↔ hedged item linkage | At query | Warning |

## Lease Rules (IFRS 16)

| ID | Rule | Description | Verification Timing | Severity |
|---|---|---|---|---|
| LS01 | Lessee recognizes right-of-use asset and lease liability at commencement | Except short-term (≤12 months) and low-value exemptions | At input | Warning |
| LS02 | ROU asset depreciated over shorter of lease term and useful life | Straight-line unless another method more appropriate | At query | Warning |
| LS03 | Lease liability = PV of remaining lease payments | Discounted at implicit rate or incremental borrowing rate | At input | Warning |

## Constraint Conflict Checking

| ID | Rule | Description | Severity |
|---|---|---|---|
| CF01 | Consolidated total assets ≥ Separate total assets | General expectation due to subsidiary inclusion | Warning |
| CF02 | Audit opinion ≠ "Qualified" or "Adverse" for reliable comparison | Qualified opinions indicate material misstatement or scope limitation | Warning |
| CF03 | Segment revenue sum + intercompany eliminations + unallocated ≈ Consolidated revenue | Segment reconciliation | Warning |
| CF04 | Non-GAAP metrics must be accompanied by GAAP reconciliation | SEC requirement; ESMA guidelines | Warning |

> **CF01 exceptions:** Intercompany elimination, different consolidation dates, and foreign currency effects can cause consolidated < separate in specific line items. The constraint is a heuristic, not an identity — violations trigger investigation, not rejection.

### Constraint Conflict Resolution

When rules conflict:
1. **Accounting identities (EQ01-EQ06)** always take precedence — they are mathematical facts
2. **Cross-statement linkages (XL01-XL04)** take precedence over classification rules — consistency across statements is more important than individual classification
3. **Period rules (PR01-PR05)** take precedence over comparison queries — temporal validity must hold before comparison is meaningful
4. **Classification rules** are subordinate to identities and linkages — classification involves judgment and may be overridden by auditor determination

## Derived Metric Calculation Rules

| Metric | Formula | Required Items | Temporal Caution | Tier |
|---|---|---|---|---|
| ROE | Net income / Average equity | ProfitLoss (duration), Equity (instant) | Average = (opening + closing) / 2 | T3 |
| ROA | Net income / Average total assets | ProfitLoss (duration), Assets (instant) | Average = (opening + closing) / 2 | T3 |
| Debt-to-equity | Total liabilities / Total equity | Liabilities (instant), Equity (instant) | Same point-in-time required | T3 |
| Current ratio | Current assets / Current liabilities | CurrentAssets (instant), CurrentLiabilities (instant) | Same point-in-time required | T3 |
| Quick ratio | (Current assets - Inventory) / Current liabilities | CurrentAssets, Inventory, CurrentLiabilities (all instant) | Same point-in-time required | T3 |
| Interest coverage | EBIT / Interest expense | OperatingIncome + Interest (duration), Interest (duration) | Same period required | T3 |
| EPS | Net income / Weighted avg shares | ProfitLoss (duration), Shares (from notes) | Weighted average, not period-end count | T1a |
| Operating margin | Operating income / Revenue | Both duration | Same period required | T3 |
| EBITDA | Operating income + D&A | Or: Net income + Interest + Tax + D&A | Both duration; definition must be documented | T3 |
| Free cash flow | Operating CF - CapEx | Both duration | CapEx = purchase of PP&E from investing CF | T3 |
| Net debt | Total borrowings - Cash and equivalents | Borrowings (instant), Cash (instant) | Same point-in-time required | T3 |
| P/E ratio | Market price / EPS | Price (market data), EPS (computed) | Price is point-in-time; EPS is trailing 12 months | T3 |
| P/B ratio | Market cap / Book value of equity | Price × shares, Equity (instant) | Same point-in-time for equity; price is market | T3 |

### Metric Computation Cautions

- **Averaging rule:** When a duration metric (net income) is divided by an instant metric (equity), the instant metric must be averaged (opening + closing) / 2 to match the period. Using only the closing value biases the ratio
- **Non-GAAP consistency:** EBITDA, free cash flow, and adjusted metrics are not standardized. When comparing across entities, the definition must be verified — "adjusted EBITDA" may exclude different items at each company
- **Financial industry:** Standard profitability ratios (operating margin, gross margin) are not meaningful for banks and insurance companies. Use NIM, ROE, CET1 ratio, combined ratio (insurance) instead

## SE Transfer Verification

| SE Pattern | Finance Equivalent | Key Difference |
|---|---|---|
| Type system enforcement (compile-time) | Accounting identity verification (at-input) | SE uses compiler; finance uses data validation pipeline |
| State machine determinism | Period/temporal state correctness | SE verifies via tests; finance verifies via period rule enforcement |
| Database constraints (NOT NULL, FK) | Referential integrity (RI01-RI03) | SE uses DB enforcement; finance uses ontology validation |
| API versioning | Taxonomy versioning (IFRS Taxonomy annual updates) | SE versions endpoints; finance versions concept hierarchies |
| Test coverage | Competency question coverage (CQ matrix) | SE measures line coverage; finance measures question answerability |

## Related Documents

- domain_scope.md — Normative tier classification, sub-area definitions
- concepts.md — Account classification principles, synonym mappings, IFRS term definitions
- structure_spec.md — Node types and relationships where identities and rules are enforced
- dependency_rules.md — Direction rules, referential integrity, source dependencies
- competency_qs.md — Questions where logic rules provide inference paths
- conciseness_rules.md — Redundancy rules informed by identity-based equivalence
