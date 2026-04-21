---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Core Concept Definitions

Classification axis: **Financial reporting concern** — classified by the financial domain each term addresses. Each term is tagged with its normative tier: [T1a] Accounting Standard, [T1b] Regulatory Requirement, [T2] Taxonomy/Data Standard, [T3] Industry Practice.

## Normative Tier Reference

- **[T1a] Accounting Standard**: Elements defined by IFRS/IAS, US-GAAP ASC, or local GAAP. Enforced by auditors and legal requirements. Non-conformance produces audit qualification.
- **[T1b] Regulatory Requirement**: Elements required by securities regulators (SEC, FSC, FCA). Enforced by filing systems and regulatory review.
- **[T2] Taxonomy/Data Standard**: Elements defined by XBRL, IFRS Taxonomy, FIBO. Enforced by filing validation systems and data consumers.
- **[T3] Industry Practice**: Analytical conventions, non-GAAP metrics, common industry KPIs. No formal enforcement — adopted by analyst convention.

## Account Classification Principles (5 Elements)

| Element | Definition | Financial Statement | Temporal Attribute | Normal Balance | Tier |
|---|---|---|---|---|---|
| [T1a] Assets | Resources controlled by the entity as a result of past events, from which future economic benefits are expected to flow | Statement of Financial Position | instant | Debit | IFRS Conceptual Framework |
| [T1a] Liabilities | Present obligations arising from past events, settlement of which is expected to result in outflow of resources | Statement of Financial Position | instant | Credit | IFRS Conceptual Framework |
| [T1a] Equity | Residual interest in the assets after deducting all liabilities | Statement of Financial Position | instant | Credit | IFRS Conceptual Framework |
| [T1a] Revenue (Income) | Increases in economic benefits during the period in the form of inflows or enhancements of assets or decreases of liabilities | Income Statement | duration | Credit | IFRS Conceptual Framework |
| [T1a] Expenses | Decreases in economic benefits during the period in the form of outflows or depletions of assets or incurrences of liabilities | Income Statement | duration | Debit | IFRS Conceptual Framework |

### Current/Non-current Classification

- [T1a] Current assets: expected to be realized, sold, or consumed within the normal operating cycle or 12 months, whichever is longer. Cash and cash equivalents unless restricted. IAS 1.66
- [T1a] Current liabilities: expected to be settled within the normal operating cycle or 12 months, or held primarily for trading, or no unconditional right to defer settlement beyond 12 months. IAS 1.69
- [T1a] Reclassification: long-term borrowings with current portion due within 12 months → current portion reclassified to current liabilities. Failure to reclassify distorts liquidity ratios

## Financial Statement Core Terms

- [T1a] Statement of Financial Position (Balance Sheet) = snapshot of an entity's financial position at a specific date. Assets = Liabilities + Equity. Instant attribute — represents a point in time
- [T1a] Income Statement (Statement of Profit or Loss) = summary of revenue, expenses, and profit/loss over a period. Duration attribute — represents an interval. May be presented as a single statement or combined with OCI
- [T1a] Statement of Comprehensive Income = net income + other comprehensive income (OCI). OCI includes items recognized directly in equity: foreign currency translation, FVOCI revaluation, cash flow hedge reserve, revaluation surplus, actuarial gains/losses
- [T1a] Cash Flow Statement = classification of cash movements into operating, investing, and financing activities. Operating CF may be presented using direct or indirect method. Reconciles to BS cash balance
- [T1a] Statement of Changes in Equity = reconciliation of each component of equity (share capital, retained earnings, reserves, NCI) from opening to closing balance. Captures dividends, share issues, OCI, and net income
- [T1a] Notes to Financial Statements = integral part of financial statements. Disclose accounting policies, estimates, contingencies, related party transactions, segment information. Not optional — IFRS requires specific disclosures per standard

## Core Synonym Mappings

| Canonical Name | IFRS Taxonomy ID | Common Labels | Notes | Tier |
|---|---|---|---|---|
| Revenue | ifrs:Revenue | Revenue, Sales, Net sales, Operating revenue, Turnover | Inclusion of operating revenue varies by industry; "Turnover" used in UK/EU | T1a |
| Assets | ifrs:Assets | Total assets | instant attribute | T1a |
| Equity | ifrs:Equity | Total equity, Shareholders' equity, Net assets, Stockholders' equity | "Stockholders' equity" in US-GAAP context | T1a |
| CashAndCashEquivalents | ifrs:CashAndCashEquivalents | Cash and cash equivalents | Appears in both BS and CF; must reconcile | T1a |
| ProfitLoss | ifrs:ProfitLoss | Net income (loss), Profit (loss), Net profit, Bottom line | duration attribute; "Bottom line" is T3 informal | T1a |
| OperatingIncome | ifrs:ProfitLossFromOperatingActivities | Operating income, Operating profit, EBIT (approx.) | Definition varies: IFRS does not formally define "operating profit"; EBIT is T3 approximation | T1a/T3 |
| GrossProfit | ifrs:GrossProfit | Gross profit, Gross margin | Revenue minus cost of sales | T1a |
| EBITDA | — | EBITDA, Adjusted EBITDA | Not defined in IFRS; T3 non-GAAP metric. Earnings Before Interest, Taxes, Depreciation, and Amortization. "Adjusted EBITDA" varies by company — definition must be disclosed | T3 |
| TotalCurrentAssets | ifrs:CurrentAssets | Current assets, Total current assets | instant; IAS 1.66 classification criteria | T1a |
| TotalNonCurrentAssets | ifrs:NoncurrentAssets | Non-current assets, Fixed assets | "Fixed assets" is informal — non-current assets include intangibles, investments, etc. | T1a |
| TotalLiabilities | ifrs:Liabilities | Total liabilities | instant attribute | T1a |

## Homonyms

| Term | Context A | Context B | Context C (if applicable) | Distinguishing Criterion |
|---|---|---|---|---|
| Other financial assets | Current (recoverable ≤12 months) | Non-current (>12 months) | — | Current/non-current classification |
| Provisions | Product warranty provisions | Litigation provisions | Restructuring provisions | Sub-classification by provision reason |
| Borrowings | Short-term borrowings | Long-term borrowings (incl. current portion reclassification) | — | Maturity basis |
| Other income | Other income (operating-related) | Other comprehensive income (recognized in equity) | — | IS vs OCI classification |
| Total/Subtotal | Total assets (top-level) | Current assets subtotal (intermediate) | Segment subtotal | Hierarchy position |
| Fair value | Fair value through profit or loss (FVPL) | Fair value through OCI (FVOCI) | Fair value for disclosure purposes | IFRS 9 classification or IFRS 13 measurement |
| Revenue | Revenue from contracts with customers (IFRS 15) | Other revenue (interest, dividends, rental) | Segment revenue | Revenue source and standard |
| Reserve | Revaluation reserve (OCI) | Legal reserve (statutory) | Hedging reserve (cash flow hedge) | Origin and regulatory basis |

> Many cases exist where the same label is assigned to different taxonomy elements. Therefore, the taxonomy element ID, not the label, must be used as the primary identifier.

## Extension Account Handling

Companies use proprietary extension accounts beyond the standard taxonomy. The higher the proportion of extension accounts, the more important normalization work becomes for inter-entity comparison.

### Normalization Strategy

- **Original preservation:** Store the original taxonomy element and label as-is — never discard the source data
- **Synonym mapping:** Map company-specific labels for the same concept to the canonical name in this document
- **Unified concept:** Aggregate into a higher-level concept system for inter-entity comparison where exact mapping is not possible
- Concept normalization must precede relation normalization — if concepts are unstable, relations are also unstable
- Extension account ratio: if >30% of an entity's accounts are extensions, inter-entity comparison requires extra caution and normalization effort

### Segment Dimension

- Large companies have a segment (business division) dimension. IFRS 8 requires segment reporting for listed entities
- Segment-level revenue and operating income are components of consolidated totals but intercompany transactions between segments and unallocated items mean they do not simply sum to the total
- Segment labels are company-specific extensions (e.g., "Consumer Products Division") — normalization mapping required for cross-entity segment comparison
- Geographic segments vs operating segments: IFRS 8 requires the segmentation used by the chief operating decision maker (CODM)

## IFRS 15 Revenue Recognition Terms

- [T1a] Performance obligation = a promise to transfer a distinct good or service to the customer. Contract may contain one or multiple performance obligations
- [T1a] Transaction price = the amount of consideration the entity expects to be entitled to in exchange for transferring goods/services. Includes variable consideration, significant financing component, non-cash consideration
- [T1a] Variable consideration = portion of transaction price that is contingent on future events (rebates, penalties, performance bonuses). Estimated using expected value or most likely amount method
- [T1a] Over-time recognition = revenue recognized as the entity satisfies a performance obligation over time (construction contracts, SaaS subscriptions). Criteria: customer simultaneously receives and consumes benefits, entity's performance creates/enhances an asset the customer controls, or no alternative use + enforceable right to payment
- [T1a] Point-in-time recognition = revenue recognized when control transfers at a specific point (product delivery, license transfer). Control indicators: right to payment, legal title, physical possession, risks/rewards, customer acceptance
- [T1a] Contract asset = entity's right to consideration for goods/services transferred before payment is due. Becomes a receivable when the right becomes unconditional
- [T1a] Contract liability = obligation to transfer goods/services for which consideration has been received (deferred revenue, advance payment)

## IFRS 9 Financial Instrument Terms

- [T1a] Amortised cost = financial assets held to collect contractual cash flows that are solely payments of principal and interest (SPPI). Measured at amortised cost using effective interest method
- [T1a] FVOCI = Fair Value through Other Comprehensive Income. Debt instruments held both to collect and sell; equity instruments by irrevocable election. Gains/losses in OCI until derecognition (debt) or never recycled (equity)
- [T1a] FVPL = Fair Value through Profit or Loss. All financial assets not meeting amortised cost or FVOCI criteria. Trading assets, derivatives (unless designated as hedging instruments)
- [T1a] Expected credit loss (ECL) = probability-weighted estimate of credit losses. 3-stage model:
  - Stage 1: 12-month ECL for performing assets (no significant increase in credit risk)
  - Stage 2: Lifetime ECL for assets with significant increase in credit risk (but not credit-impaired)
  - Stage 3: Lifetime ECL for credit-impaired assets (objective evidence of impairment)
- [T1a] Hedge accounting = optional treatment that matches the timing of gain/loss recognition on hedging instruments with hedged items. Types: fair value hedge, cash flow hedge, net investment hedge

## IFRS 16 Lease Terms

- [T1a] Right-of-use asset = lessee's right to use an underlying asset for the lease term. Recognized at commencement date. Depreciated over the shorter of lease term and useful life
- [T1a] Lease liability = present value of lease payments not yet paid. Discounted at the interest rate implicit in the lease (or incremental borrowing rate if not available)
- [T1a] Short-term lease exemption = leases with a term of 12 months or less. Lessee may elect not to recognize right-of-use asset and lease liability — expense payments on straight-line basis
- [T1a] Low-value asset exemption = leases of assets with a low value when new (typically under ~$5,000). Same treatment as short-term lease exemption

## Fair Value and Measurement Terms

- [T1a] Fair value = the price that would be received to sell an asset or paid to transfer a liability in an orderly transaction between market participants at the measurement date (IFRS 13). An exit price, not an entry price
- [T1a] Fair value hierarchy:
  - Level 1: Quoted prices in active markets for identical assets/liabilities (most reliable)
  - Level 2: Observable inputs other than Level 1 prices (similar assets, interest rates, yield curves)
  - Level 3: Unobservable inputs (entity's own estimates, discounted cash flows). Requires the most extensive disclosure
- [T1a] Impairment (IAS 36) = carrying amount exceeds recoverable amount. Recoverable amount = higher of (fair value less costs of disposal) and (value in use). Impairment loss recognized immediately in profit/loss

## Derived Metric Terms

- [T3] ROE (Return on Equity) = Net income / Average equity. Average equity = (opening + closing) / 2. Measures profitability relative to shareholders' investment. DuPont decomposition: ROE = Net margin × Asset turnover × Equity multiplier
- [T3] ROA (Return on Assets) = Net income / Average total assets. Measures how efficiently assets generate profit
- [T3] Debt-to-equity ratio = Total liabilities / Total equity. Measures leverage. Higher ratio = more leveraged. Financial industry: higher ratios are normal (banks may have 10:1+)
- [T3] Current ratio = Current assets / Current liabilities. Measures short-term liquidity. Generally >1.0 considered adequate; <1.0 may signal liquidity risk (but depends on industry)
- [T3] Quick ratio = (Current assets - Inventory) / Current liabilities. Stricter liquidity test excluding inventory (which may not be quickly convertible to cash)
- [T3] Interest coverage ratio = EBIT / Interest expense. Measures ability to service debt. <1.5 is generally considered risky
- [T3] EPS (Earnings Per Share) = Net income attributable to ordinary shareholders / Weighted average shares outstanding. Basic EPS uses actual shares; diluted EPS includes potential dilutive shares (options, convertibles)
- [T3] Operating profit margin = Operating income / Revenue. Measures operating efficiency. Definition of "operating income" varies — some include other income, some exclude
- [T3] EBITDA margin = EBITDA / Revenue. Non-GAAP metric widely used as a cash-flow proxy. Removes non-cash charges (D&A) and capital structure effects (interest, tax)
- [T3] Free cash flow = Operating CF - Capital expenditure. Not defined in IFRS; T3 analytical metric. Measures cash available for distribution after maintaining asset base

## Financial Industry Specific Terms

- [T1a] Net interest income (NII) = Interest income - Interest expense. The primary revenue source for banks. Replaces "gross profit" concept in banking P&L
- [T1a] Net interest margin (NIM) = NII / Average interest-earning assets. Key profitability metric for banks
- [T1a] Provision for credit losses = expense recognized to cover expected defaults on the loan portfolio. Under IFRS 9, uses the ECL model
- [T1a] Regulatory capital (Basel III) = Common Equity Tier 1 (CET1), Additional Tier 1 (AT1), Tier 2. Capital ratios (CET1 ratio, Total capital ratio) measure bank solvency
- [T1a] Insurance contract liability (IFRS 17) = present value of future cash flows + risk adjustment + contractual service margin. Replaces the previous IFRS 4 framework

## Accounting Policy Differences

| Item | Options | Impact | Standard |
|---|---|---|---|
| Inventory valuation | FIFO / Weighted average / Specific identification | Differences in COGS and ending inventory | IAS 2 (LIFO prohibited under IFRS) |
| Depreciation method | Straight-line / Declining balance / Units of production | Differences in operating income and asset carrying amounts | IAS 16 |
| Revenue recognition timing | Point-in-time / Over-time (IFRS 15 criteria) | Differences in revenue timing and contract asset/liability balances | IFRS 15 |
| Lease accounting | Right-of-use recognized / Short-term exemption / Low-value exemption | Differences in total assets, liabilities, and leverage ratios | IFRS 16 |
| Financial instrument classification | Amortised cost / FVOCI / FVPL | Differences in income volatility and OCI | IFRS 9 |
| Goodwill | Annual impairment test (IFRS) / Amortisation (US-GAAP 2024 option) | Differences in intangible asset carrying amounts and impairment charges | IFRS 3 / ASC 350 |
| Investment property | Cost model / Fair value model | Differences in balance sheet values and income recognition | IAS 40 |

## External Standard Mappings

| Internal Concept | IFRS Taxonomy | FIBO Mapping | US-GAAP (ASC) | Mapping Level |
|---|---|---|---|---|
| Revenue | ifrs:Revenue | fibo-be-le:Revenue | us-gaap:Revenues | Direct (but IFRS 15 scope ≠ ASC 606 scope in edge cases) |
| Assets | ifrs:Assets | fibo-be-le:Asset | us-gaap:Assets | Direct |
| Equity | ifrs:Equity | fibo-be-le:Equity | us-gaap:StockholdersEquity | Direct (naming differs) |
| CashAndCashEquivalents | ifrs:CashAndCashEquivalents | fibo-be-le:CashInstrument | us-gaap:CashAndCashEquivalentsAtCarryingValue | Partial (FIBO is narrower) |
| ProfitLoss | ifrs:ProfitLoss | — | us-gaap:NetIncomeLoss | No direct FIBO correspondence |
| Goodwill | ifrs:Goodwill | fibo-be-le:Goodwill | us-gaap:Goodwill | Direct (but impairment vs amortisation treatment differs) |
| Right-of-use asset | ifrs:RightOfUseAssets | — | us-gaap:OperatingLeaseRightOfUseAsset | Partial (US-GAAP distinguishes operating/finance) |

## Interpretation Principles

1. **Taxonomy element priority:** Use the IFRS/DART taxonomy element ID, not labels, as the primary identifier. Labels are human-readable aliases; element IDs are machine-unambiguous identifiers
2. **Context completeness:** Even for the same amount, differences in consolidated/separate, current/non-current, or period/point-in-time make it a distinct Fact. A Fact without complete context (entity + period + statement + concept) is uninterpretable
3. **Policy disclosure:** For items where accounting policy differences exist (see table above), policy information must accompany the financial figures when comparing across entities. Without policy context, comparison produces misleading results
4. **Substance over form:** Financial ontology should reflect economic substance, not just legal form. A sale-and-leaseback that is economically a financing arrangement should be classified as such, regardless of legal contract form (IFRS Conceptual Framework)
5. **Materiality:** Not every financial item needs the same level of detail. Materiality — whether omission or misstatement could influence user decisions — determines the level of disaggregation and disclosure required (IAS 1.7, 1.29-31)
6. **Going concern:** Financial statements are prepared on a going concern basis unless management intends to liquidate or has no realistic alternative. Going concern issues fundamentally change the interpretation of all financial figures (IAS 1.25-26)
7. **Non-GAAP caution:** Non-GAAP metrics (EBITDA, adjusted earnings, free cash flow) are not standardized. When comparing across entities, verify that the definition is consistent. SEC requires reconciliation of non-GAAP to GAAP measures

## Related Documents

- domain_scope.md — Classification axes, sub-area definitions, normative system classification
- logic_rules.md — Mathematical constraints between concepts (accounting identities, derived metric formulas)
- structure_spec.md — Node types and relationships where concepts are realized
- competency_qs.md — Queries where concept mappings are applied
- dependency_rules.md — Source of truth and referential integrity rules
- extension_cases.md — Taxonomy change and extension account scenarios
- conciseness_rules.md — Redundancy rules using synonym mappings from this file
