---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Concept Dictionary and Interpretation Rules

Classification axis: **Accounting concern** — classified by the concern each term addresses. Each term is tagged with its normative tier: [T1a] Accounting Standard, [T1b] Regulatory/Tax Requirement, [T2] Audit Standard/Data Taxonomy, [T3] Industry Practice.

## Normative Tier Reference

- **[T1a] Accounting Standard**: Elements defined by K-IFRS, IFRS/IAS, K-GAAP, or US-GAAP. Enforced by auditors and legal requirements. Non-conformance produces audit qualification.
- **[T1b] Regulatory/Tax Requirement**: Elements required by tax authorities (Corporate Tax Law, Income Tax Law) or financial regulators (FSC disclosure rules). Enforced by regulatory review.
- **[T2] Audit Standard/Data Taxonomy**: Elements from ISA audit standards or XBRL/DART taxonomies. Enforced by audit firms and filing validation.
- **[T3] Industry Practice**: Professional conventions, typical materiality thresholds, common allocation methods. No formal enforcement — adopted by professional convention.

## Double-Entry Bookkeeping Core Terms

- [T1a] Debit (차변) = the side that records asset increases and expense occurrences. Also records decreases in liabilities/equity/revenue. Always recorded on the left side of a T-account or left column of a journal
- [T1a] Credit (대변) = the side that records liability/equity increases and revenue occurrences. Also records decreases in assets/expenses. Always recorded on the right side of a T-account or right column of a journal
- [T1a] Journal Entry (분개) = the act of decomposing a transaction into Debit and Credit entries for recording. Format: `(Dr) Account1 XXX / (Cr) Account2 XXX`. Must balance: total debits = total credits
- [T1a] Posting (전기) = the procedure of transferring journal records to the General Ledger (총계정원장). Each journal line posts to its specific account ledger
- [T1a] Trial Balance (시산표) = a schedule verifying that the total of all account Debit balances equals the total of all Credit balances. Compiled from General Ledger balances. Precedes financial statement preparation
- [T1a] General Ledger (총계정원장) = the master record of all account balances, organized by account code. Contains every journal posting affecting each account
- [T1a] Subsidiary Ledger (보조원장) = detailed records supplementing General Ledger accounts. Examples: Accounts Receivable subsidiary ledger by customer, Inventory subsidiary ledger by item
- [T1a] Accounting Equation (A = L + E) = the fundamental identity: Assets = Liabilities + Equity. Every transaction maintains this identity through double-entry
- [T1a] Adjusting Entry (수정분개) = end-of-period entries to record accrued revenues/expenses, deferred revenues/expenses, and estimates (depreciation, bad debts). Required for accrual basis accounting
- [T1a] Closing Entry (마감분개) = end-of-period entries that transfer temporary account (revenue/expense) balances to Retained Earnings, resetting them to zero for the next period
- [T1a] Reversing Entry (역분개) = optional entries at period start that reverse certain adjusting entries. Simplifies subsequent cash transactions

## Financial Statement Terms

- [T1a] Statement of Financial Position (재무상태표) = snapshot of assets, liabilities, and equity at a specific date. Former name: Balance Sheet (대차대조표). Instant attribute — represents a point in time
- [T1a] Statement of Comprehensive Income (포괄손익계산서) = revenue, expenses, and Other Comprehensive Income (OCI) for a given period. May be single statement or two-statement (separate IS + OCI statement). Duration attribute
- [T1a] Statement of Cash Flows (현금흐름표) = cash inflows/outflows classified as operating, investing, and financing activities. Operating CF presentable as direct or indirect method
- [T1a] Statement of Changes in Equity (자본변동표) = reconciliation of equity components (share capital, retained earnings, OCI accumulation, non-controlling interest) from opening to closing balance
- [T1a] Notes (주석) = integral part of financial statements. Disclose accounting policies, estimates, contingencies, related party transactions, segment information. Required per IAS 1
- [T1a] Fair Value (공정가치) = the price receivable in an orderly transaction between market participants at the measurement date. An exit price, not entry price. IFRS 13 defines measurement
- [T1a] Carrying Amount (장부금액) = the amount at which an asset/liability is recognized on the Statement of Financial Position after deducting accumulated depreciation/amortisation and accumulated impairment
- [T1a] Historical Cost (취득원가) = the original transaction price paid to acquire an asset. Basis for initial recognition in most cases
- [T1a] Net Realizable Value (순실현가능가치, NRV) = estimated selling price minus estimated costs of completion and disposal. Used for inventory impairment (IAS 2)
- [T1a] Value in Use (사용가치) = present value of future cash flows expected from an asset's continued use. Used for impairment testing (IAS 36)
- [T1a] Recoverable Amount (회수가능액) = higher of (fair value less costs of disposal) and (value in use). Used to assess impairment (IAS 36)

## Revenue Recognition Terms (IFRS 15)

- [T1a] Performance Obligation (이행의무) = a promise to transfer a distinct good/service to the customer. A contract may contain one or multiple performance obligations
- [T1a] Transaction Price (거래가격) = the consideration the entity expects to receive in exchange for transferring goods/services to the customer. Includes variable consideration, significant financing component adjustments
- [T1a] Variable Consideration (변동대가) = portion of transaction price contingent on future events (rebates, penalties, performance bonuses). Estimated using expected value or most likely amount method
- [T1a] Over Time (진행기준) = recognizing revenue progressively as Performance Obligations are fulfilled. Criteria: customer simultaneously receives/consumes benefit, entity's performance creates/enhances customer asset, or no alternative use + enforceable payment right
- [T1a] At a Point in Time (시점기준) = recognizing revenue at the specific point when control transfers. Control indicators: right to payment, legal title, physical possession, risks/rewards, customer acceptance
- [T1a] Contract Asset (계약자산) = entity's right to consideration for goods/services transferred before payment is due. Becomes a receivable when the right becomes unconditional
- [T1a] Contract Liability (계약부채) = obligation to transfer goods/services for which consideration has been received (deferred revenue, advance payment)
- [T1a] Standalone Selling Price (개별판매가격) = price at which the entity would sell a promised good/service separately. Used to allocate transaction price to performance obligations

## Financial Instruments Terms (IFRS 9)

- [T1a] AC (Amortised Cost, 상각후원가) = financial assets held to collect contractual cash flows that are solely payments of principal and interest (SPPI). Measured using effective interest method
- [T1a] FVOCI (Fair Value through OCI, 기타포괄손익-공정가치) = debt instruments held to collect and sell; equity instruments by irrevocable election. Gains/losses in OCI until derecognition (debt) or never recycled to P&L (equity)
- [T1a] FVTPL (Fair Value through P&L, 당기손익-공정가치) = all financial assets not qualifying for AC or FVOCI. Trading assets, derivatives (unless designated as hedging instruments)
- [T1a] Expected Credit Loss (기대신용손실, ECL) = probability-weighted estimate of credit losses. 3-stage model:
  - Stage 1: 12-month ECL for performing assets (no significant increase in credit risk)
  - Stage 2: Lifetime ECL for assets with significant increase in credit risk (but not credit-impaired)
  - Stage 3: Lifetime ECL for credit-impaired assets (objective evidence of impairment)
- [T1a] Effective Interest Method (유효이자율법) = method of calculating amortised cost using the effective interest rate. Spreads interest income/expense over the instrument's life
- [T1a] Hedge Accounting (위험회피회계) = optional treatment matching timing of gain/loss on hedging instruments with hedged items. Types: fair value hedge, cash flow hedge, net investment hedge

## Lease Terms (IFRS 16)

- [T1a] Right-of-Use Asset (사용권자산) = lessee's right to use an underlying asset for the lease term. Recognized at commencement. Depreciated over shorter of lease term and useful life
- [T1a] Lease Liability (리스부채) = present value of lease payments not yet paid. Discounted at interest rate implicit in the lease (or incremental borrowing rate if not available)
- [T1a] Low-Value Lease (소액리스) = lease where underlying asset has low value when new (typically under ~5,000 USD equivalent). Recognition exemption available — expense payments on straight-line basis
- [T1a] Short-Term Lease (단기리스) = lease with a term of 12 months or less, with no purchase option. Recognition exemption available
- [T1a] Incremental Borrowing Rate (증분차입이자율) = rate lessee would pay to borrow funds to purchase a similar asset, over a similar term, in a similar economic environment. Used when implicit rate is not readily determinable

## Impairment Terms (IAS 36)

- [T1a] Cash-Generating Unit (현금창출단위, CGU) = smallest identifiable group of assets that generates cash inflows largely independent of cash inflows from other assets. Unit of impairment testing when individual asset cash flows are indeterminable
- [T1a] Impairment Loss (손상차손) = excess of carrying amount over recoverable amount. Recognized immediately in P&L (or OCI for revalued assets)
- [T1a] Impairment Indicator (손상징후) = external/internal event suggesting possible impairment. Market value decline, adverse changes in technology/market/economic/legal environment, obsolescence, physical damage
- [T1a] Impairment Reversal (손상차손환입) = reversal of prior impairment loss when circumstances improve. Permitted for most assets; prohibited for goodwill

## Inventory Terms (IAS 2)

- [T1a] FIFO (선입선출법) = First-In, First-Out cost formula. Oldest inventory costs assigned to COGS, newest to ending inventory. Approximates physical flow for most businesses
- [T1a] Weighted Average (가중평균법) = weighted average cost of beginning inventory and purchases assigned to COGS and ending inventory. Smooths price fluctuations
- [T1a] Specific Identification (개별법) = actual cost of each specific item assigned. Used for unique items (jewelry, custom equipment, real estate projects)
- [T1a] LIFO (후입선출법) = Last-In, First-Out. **Prohibited under IFRS/K-IFRS** since 2005. Still permitted under US-GAAP

## Tax Accounting Terms

- [T1b] Tax Adjustment (세무조정) = the procedure of reconciling differences between K-IFRS income and taxable income. Required annually for tax filing
- [T1b] Temporary Difference (일시적차이) = difference between Carrying Amount and tax base of assets/liabilities. Will reverse in future periods. Generates Deferred Tax
- [T1b] Permanent Difference (영구적차이) = difference between accounting and tax treatment that never reverses (e.g., entertainment expense limit excess, certain penalties). Does not generate Deferred Tax
- [T1b] Deferred Tax Asset (이연법인세자산) = future tax benefit from deductible temporary differences or tax loss carryforwards. Recognized only when probable that future taxable income will be available
- [T1b] Deferred Tax Liability (이연법인세부채) = future tax liability from taxable temporary differences
- [T1b] Tax Base (세무기준) = the amount attributed to an asset/liability for tax purposes. Differs from Carrying Amount when temporary differences exist
- [T1b] Effective Tax Rate (유효세율) = income tax expense / pre-tax accounting income. Differs from statutory rate due to permanent differences and deferred tax effects

## Consolidation Terms

- [T1a] Control (지배력) = power over investee + exposure to variable returns + link between power and returns (IFRS 10). All three required for consolidation
- [T1a] Non-controlling Interest (비지배지분, NCI) = portion of subsidiary's net assets not attributable to parent. Presented separately in equity
- [T1a] Goodwill (영업권) = excess of acquisition cost over fair value of identifiable net assets acquired (IFRS 3). Subject to annual impairment testing; not amortised
- [T1a] Intercompany Transactions (내부거래) = transactions between consolidated entities. Fully eliminated in consolidation (sales/purchases, loans/borrowings, dividends)
- [T1a] Unrealized Profit (미실현이익) = profit from intercompany sales still held in inventory. Eliminated in consolidation until realized through external sale
- [T1a] Equity Method (지분법) = accounting for investments in associates and joint ventures. Investment carried at cost + proportionate share of investee's net income/equity changes
- [T1a] Purchase Price Allocation (PPA, 취득가격 배분) = process of allocating business combination cost to identifiable assets acquired and liabilities assumed at fair value. Excess over net assets = goodwill

## Audit and Internal Control Terms

- [T2] Material Misstatement (중요한 왜곡표시) = misstatement significant enough to influence user decisions. Materiality thresholds typically 5% of pre-tax income or 0.5% of revenue
- [T2] Audit Evidence (감사증거) = information obtained by auditor to support audit opinion. Types: documentary, observation, confirmation, inquiry, recalculation, reperformance, analytical procedures
- [T2] Management Assertion (경영진 주장) = explicit/implicit claims by management about financial statements. Categories: occurrence, completeness, accuracy, cutoff, classification (transactions); existence, rights/obligations, valuation/allocation, completeness (balances)
- [T2] Internal Control (내부통제) = processes designed by management to provide reasonable assurance of reliable financial reporting, operational effectiveness, and compliance. 5 COSO components
- [T2] Key Audit Matters (핵심감사사항, KAM) = matters of most significance in current period audit. Communicated in auditor's report (ISA 701)
- [T2] Audit Opinion Types = unqualified (적정), qualified (한정), adverse (부적정), disclaimer (의견거절)

## Period Attribution Terms

- [T1a] Unearned Revenue (선수수익) = cash received but Performance Obligation not yet fulfilled. Liability until fulfillment. Contract Liability per IFRS 15
- [T1a] Accrued Revenue (미수수익) = Performance Obligation fulfilled but cash not yet received. Asset until collected. Contract Asset or Receivable per IFRS 15
- [T1a] Prepaid Expense (선급비용) = cash paid but benefit not yet consumed. Asset until consumption. Allocated to expense over consumption period
- [T1a] Accrued Expense (미지급비용) = benefit consumed but cash not yet paid. Liability until payment

## Cost Accounting Terms

- [T3] Direct Cost (직접원가) = costs directly traceable to a cost object (direct materials, direct labor). Does not require allocation
- [T3] Indirect Cost (간접원가) = costs shared across cost objects, requiring allocation (factory overhead, administrative costs)
- [T3] Variable Cost (변동비) = costs that change proportionally with activity level (raw materials, direct labor)
- [T3] Fixed Cost (고정비) = costs that remain constant over a relevant range regardless of activity (rent, depreciation)
- [T3] Activity-Based Costing (ABC, 활동기준원가계산) = allocation method assigning costs to activities then to products based on activity consumption. More accurate than traditional volume-based allocation for diverse product mix
- [T3] Standard Cost (표준원가) = predetermined cost per unit used as a benchmark. Variances (actual vs standard) indicate efficiency

## Homonyms Requiring Attention

| Term | Context A | Context B | Context C |
|---|---|---|---|
| "equity" | Equity (자본, net assets on BS) | Capital (자본, invested funds) | Share Capital (자본금, proceeds from share issuance) |
| "cost" | Historical Cost (취득원가) | Manufacturing Cost (제조원가) | Opportunity Cost (기회원가) |
| "loss" | Net Loss (당기순손실) | Impairment Loss (손상차손) | Expected Credit Loss (기대신용손실) |
| "value" | Fair Value (공정가치) | Carrying Amount (장부금액) | Net Realizable Value (순실현가능가치) / Value in Use (사용가치) |
| "income" | Operating Income (영업이익) | Net Income (당기순이익) | Other Comprehensive Income (기타포괄이익) / EBITDA |
| "recognition" | Revenue Recognition (수익인식) | Asset Recognition (자산인식) | Provision Recognition (충당부채인식) |
| "reserve" | Revaluation Reserve (재평가잉여금) | Legal Reserve (법정적립금) | Hedging Reserve (위험회피적립금) |
| "depreciation" | Depreciation (감가상각, PP&E) | Amortisation (무형자산상각) | Depletion (감모상각, natural resources) |
| "provision" | Provision (충당부채, contingent obligation) | Allowance (대손충당금, contra-asset) | Reserve (준비금) |
| "write-off" | Write-off (손상처리, impairment recognition) | Write-down (평가감, partial impairment) | Derecognition (제거, asset removal) |

## Accounting Policy Choices

Areas where management must choose among allowed methods and disclose the choice:

| Item | Options | Impact | Standard |
|---|---|---|---|
| Inventory valuation | FIFO / Weighted average / Specific identification | COGS and ending inventory | IAS 2 (LIFO prohibited) |
| Depreciation method | Straight-line / Declining balance / Units of production | Operating income and asset carrying amounts | IAS 16 |
| Revenue recognition timing | Point-in-time / Over-time (IFRS 15 criteria) | Revenue timing and contract balances | IFRS 15 |
| Lease accounting | Full recognition / Short-term exemption / Low-value exemption | Total assets, liabilities, leverage ratios | IFRS 16 |
| Financial instrument classification | AC / FVOCI / FVTPL | Income volatility and OCI | IFRS 9 |
| Investment property | Cost model / Fair value model | Balance sheet values and income recognition | IAS 40 |
| Revaluation (PP&E) | Cost model / Revaluation model | Asset carrying amounts, OCI accumulation | IAS 16 |
| Intangible asset (indefinite life) | Non-amortisation + annual impairment | Income smoothness | IAS 38 |

## Interpretation Principles

1. **Substance over form (실질우선)**: Accounting treatment must reflect economic substance, not just legal form. Sale-and-leaseback that is economically financing must be classified as financing. IFRS Conceptual Framework
2. **Materiality (중요성)**: Not every item requires the same disclosure detail. Materiality — whether omission could influence user decisions — determines disaggregation level. IAS 1.7, 1.29-31
3. **Going concern (계속기업)**: Financial statements assume continued operation unless management intends liquidation. Going concern issues fundamentally change interpretation of all figures. IAS 1.25-26
4. **Prudence (보수주의) vs neutrality (중립성)**: IFRS prioritizes neutrality — faithful representation without undue conservatism. Excessive conservatism distorts. Conceptual Framework (2018)
5. **Trial Balance ≠ correctness**: Debit/Credit balance does not guarantee classification accuracy. Both sides can be wrong and still balance
6. **Accounting ≠ Tax**: K-IFRS and tax standards have different purposes. Differences are systemic, not errors. Tax adjustment bridges them
7. **Estimates require documentation**: Depreciation life, allowance for doubtful accounts, fair value. Reasonableness is evaluated by whether basis is explicitly stated
8. **Consistency with change rule**: Accounting policies applied consistently across periods. Changes require retrospective restatement (IAS 8) unless explicitly prospective
9. **Measurement basis disclosure**: When mixed measurement bases exist (historical cost + fair value), each item's basis must be disclosed. IAS 1

## Related Documents
- domain_scope.md — Classification axes, sub-area definitions, normative tier classification
- logic_rules.md — Recognition, measurement, period attribution, consolidation logic
- structure_spec.md — Financial statement structure, chart of accounts, verification structure
- dependency_rules.md — Inter-statement linkage, inter-standard dependencies, source of truth
- competency_qs.md — Questions where concept mappings are applied
- extension_cases.md — Standard amendments, new transaction types, consolidation changes
- conciseness_rules.md — Redundancy rules using synonym mappings from this file
