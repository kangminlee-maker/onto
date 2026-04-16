---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Logic Rules

Classification axis: **Accounting rule type** — rules classified by the accounting concern they govern.

## Double-Entry Balance Logic

Fundamental invariants of double-entry bookkeeping. Violation indicates data error.

| ID | Rule | Severity | Verification Timing |
|---|---|---|---|
| DE-01 | Total Debits = Total Credits in every Journal Entry | Error | At journal entry |
| DE-02 | Sum of all Debit balances = Sum of all Credit balances in Trial Balance | Error | At trial balance compilation |
| DE-03 | Accounting Equation (Assets = Liabilities + Equity) holds after every transaction | Error | At statement preparation |
| DE-04 | Account balance direction matches element type (Assets/Expenses: debit normal; Liabilities/Equity/Revenue: credit normal) | Warning | At journal entry |
| DE-05 | Adjusting entries maintain Debit/Credit balance | Error | At adjusting entry |

### Rule Rationale

- **DE-01**: Transaction-level balance is the atomic invariant. Violation at this level produces cascading failures at ledger, trial balance, and statements
- **DE-02**: Trial balance imbalance indicates a journal posting error or journal entry violation. Tracing back finds the source
- **DE-03**: The accounting equation is preserved by construction if DE-01 holds. Direct verification catches posting errors that DE-01 missed (wrong account selected but correct amounts)
- **DE-04 Warning**: Unusual balance directions (credit cash, debit payables) are possible legitimately (e.g., bank overdraft, prepaid by vendor), but rare. Flag for review, not block

### Trial Balance ≠ Correctness

- Trial Balance balance does not guarantee classification accuracy. If both Debit and Credit use wrong accounts, totals still match
- Example: Sales of 1M recorded as Dr. Cash / Cr. "Miscellaneous Revenue" instead of "Sales Revenue" — totals balance, but revenue recognition is misclassified
- Complementary checks required: account classification audit, revenue/expense matching, period attribution

## Recognition Logic

Rules for when to recognize elements in financial statements.

### Revenue Recognition (IFRS 15)

| ID | Rule | Description | Severity |
|---|---|---|---|
| RR-01 | Revenue recognized at point of control transfer | IFRS 15 core principle. "Delivery complete" ≠ "control transferred" necessarily | Warning |
| RR-02 | 5-step model applied: contract → performance obligations → transaction price → allocation → recognition | Framework application | Warning |
| RR-03 | Over-time recognition requires one of 3 criteria (customer consumes as produced, customer controls WIP, no alternative use + enforceable payment) | Determines recognition pattern | Warning |
| RR-04 | Variable consideration estimated using expected value or most likely amount | Rebates, penalties, performance bonuses | Warning |
| RR-05 | Significant financing component separated when payment timing creates material benefit | Payment deferred > 1 year typically | Warning |

### Expense Recognition (Matching Principle)

| ID | Rule | Description | Severity |
|---|---|---|---|
| ER-01 | Direct expenses recognized in same period as related revenue | Matching principle — COGS with sales | Error |
| ER-02 | Expenses that cannot be directly matched recognized in period incurred | Period costs — rent, salaries | Warning |
| ER-03 | Expected future expenses for current period obligations recognized as provisions | Warranty, restructuring | Warning |

### Asset Recognition

| ID | Rule | Description | Severity |
|---|---|---|---|
| AR-01 | Asset recognized when probable future economic benefit + reliable cost measurement | IFRS Conceptual Framework | Warning |
| AR-02 | Internally generated intangibles capitalized only when recognition criteria met | IAS 38 — research expensed, development capitalized per criteria | Warning |
| AR-03 | Contingent assets recognized only when virtually certain | Not recognized for probable; disclosed for possible | Warning |

### Liability Recognition

| ID | Rule | Description | Severity |
|---|---|---|---|
| LR-01 | Liability recognized when present obligation + probable outflow + reliable measurement | IFRS Conceptual Framework | Warning |
| LR-02 | Provision recognized when legal or constructive obligation exists | IAS 37 — warranty, restructuring | Warning |
| LR-03 | Contingent liability disclosed (not recognized) when outflow possible but not probable | IAS 37 | Warning |

## Measurement Logic

| ID | Rule | Description | Severity |
|---|---|---|---|
| MR-01 | Initial recognition at transaction price (cost) unless specific standard requires fair value | IFRS Conceptual Framework | Warning |
| MR-02 | Subsequent measurement follows accounting policy choice (cost model or fair value model) | Applied consistently per asset class | Warning |
| MR-03 | Fair Value hierarchy: Level 1 (quoted prices active market) > Level 2 (observable inputs) > Level 3 (unobservable) | IFRS 13 | Warning |
| MR-04 | Impairment: Carrying Amount > Recoverable Amount → recognize Impairment Loss | IAS 36 | Error |
| MR-05 | Recoverable Amount = max(Fair Value less costs of disposal, Value in Use) | IAS 36 | Error |
| MR-06 | Depreciation: systematic allocation over useful life. Useful life and residual value reviewed annually | IAS 16 | Warning |
| MR-07 | Inventory valued at lower of cost and Net Realizable Value | IAS 2 | Error |

### Measurement Conflict Resolution

When multiple measurement bases could apply (e.g., PP&E can use cost or revaluation model):
1. Choose one model per asset class and apply consistently
2. Document policy choice in notes (IAS 1.117)
3. Change between models permitted only if resulting information more relevant/reliable (IAS 8)
4. Retrospective application required for policy change

## Period Attribution Logic

Rules for correct period attribution under accrual basis.

| Pattern | Cash Timing | Service Timing | Recognition |
|---------|-------------|----------------|-------------|
| Unearned Revenue (선수수익) | Received | Not yet performed | Liability (Contract Liability per IFRS 15) |
| Accrued Revenue (미수수익) | Not yet received | Performed | Asset (Contract Asset or Receivable) |
| Prepaid Expense (선급비용) | Paid | Not yet consumed | Asset |
| Accrued Expense (미지급비용) | Not yet paid | Consumed | Liability |

### Period-End Adjusting Entry Rules

| ID | Rule | Description |
|---|---|---|
| PA-01 | Every unrecorded accrual must be adjusted at period end | 4 types (unearned, accrued revenue; prepaid, accrued expense) |
| PA-02 | Depreciation recorded as adjusting entry at period end | Straight-line typical; matches expense to period of benefit |
| PA-03 | ECL allowance updated at period end | IFRS 9 stage transitions and forward-looking updates |
| PA-04 | Inventory write-down recognized when NRV < cost | IAS 2; recognize loss in period of decline |
| PA-05 | Foreign currency period-end translation applied | Monetary items at closing rate, non-monetary at historical |

## Closing Procedures

End-of-period procedures that reset temporary accounts and finalize statements.

1. **Adjusting entries** — accruals, deferrals, depreciation, allowances (per PA-01 to PA-05)
2. **Closing entries** — transfer revenue and expense balances to Retained Earnings, zeroing temporary accounts
3. **Reversing entries** (optional, next period start) — reverse certain adjusting entries to simplify subsequent cash transactions
4. **Carry-forward** — permanent account balances carried forward as opening balances

### Closing Entry Sequence

1. Close Revenue accounts to Income Summary: `Dr. Revenues / Cr. Income Summary`
2. Close Expense accounts to Income Summary: `Dr. Income Summary / Cr. Expenses`
3. Close Income Summary to Retained Earnings: `Dr. Income Summary / Cr. Retained Earnings` (profit) or reverse (loss)
4. Close Dividends declared to Retained Earnings (if separately tracked): `Dr. Retained Earnings / Cr. Dividends`

## Consolidation Logic

| ID | Rule | Description | Severity |
|---|---|---|---|
| CL-01 | Control determined by power + variable returns + link (IFRS 10) | All three required | Warning |
| CL-02 | Intercompany transactions fully eliminated in consolidation | Sales, purchases, loans, interest, dividends | Error |
| CL-03 | Unrealized profits on intercompany inventory eliminated until external sale | Prevents inflated earnings | Error |
| CL-04 | Non-controlling Interest presented separately in equity | IFRS 10.22; attributed share of net income | Error |
| CL-05 | Goodwill recognized as excess of acquisition cost over identifiable net assets at fair value | IFRS 3 | Warning |
| CL-06 | Goodwill not amortised; annually tested for impairment (IAS 36) | No reversal of goodwill impairment permitted | Warning |
| CL-07 | Associates/joint ventures accounted for using equity method (IAS 28) | 20-50% ownership typically; significant influence test | Warning |

### Consolidation Adjustment Example

Parent P owns 80% of Subsidiary S.
- S's net income: 100M
- Intercompany sale from S to P: 20M at 25% profit margin (5M profit, 10M still in P's inventory)

Adjustments:
- Eliminate intercompany sales revenue: 20M
- Eliminate intercompany COGS at P: 20M (net effect on consolidated: 0M)
- Eliminate unrealized profit in P's inventory: 2.5M (half of 5M profit still in ending inventory)

Attribution:
- NCI share of S's adjusted net income: 20% × (100 - 2.5) = 19.5M
- Parent share: 78M

## Tax-Accounting Difference Logic

| ID | Rule | Description | Severity |
|---|---|---|---|
| TD-01 | Temporary Difference: Carrying Amount ≠ Tax Base, will reverse | Generates Deferred Tax | Warning |
| TD-02 | Permanent Difference: accounting/tax treatment never reconciles | No Deferred Tax effect (e.g., entertainment expense limit excess) | Warning |
| TD-03 | Deferred Tax Asset recognized only when future taxable income probable | Recoverability assessment mandatory | Warning |
| TD-04 | Deferred Tax Liability recognized for all taxable temporary differences (with limited exceptions) | IAS 12.15 exceptions: initial goodwill, initial recognition of non-business-combination assets | Warning |
| TD-05 | Measured at tax rates expected to apply when difference reverses | Enacted or substantively enacted rates | Warning |

### Tax Adjustment Categories

| Category | Examples | Difference Type |
|----------|----------|-----------------|
| Non-deductible expenses | Entertainment excess, penalties, certain donations | Permanent |
| Tax-exempt income | Certain dividends, tax-free interest | Permanent |
| Timing differences | Depreciation method differences, bad debt expense timing, accrued expenses tax-deductible only on payment | Temporary |
| Loss carryforward | Tax losses carried to future periods | Temporary (future DTA) |

## Constraint Conflict Checking

When rules produce conflicting guidance:

### K-IFRS vs Tax Law

- Financial reporting follows K-IFRS; tax filing follows tax law. **Never consolidate into a single standard**
- Reconciliation via Tax Adjustment schedule
- Example: Depreciation — K-IFRS allows 4-year useful life based on actual wear; tax law mandates 5-year straight-line. Both apply independently

### Fair Value vs Historical Cost

- Once an accounting policy is chosen per asset class, applied consistently
- Example: Investment property must use cost model OR fair value model for all investment properties (IAS 40). Cannot mix
- Policy change requires IAS 8 retrospective application

### Conservatism vs Neutrality

- IFRS prioritizes **neutrality** over conservatism (revised Conceptual Framework 2018)
- Excessive conservatism (e.g., over-providing for bad debts) distorts financial statements toward understatement
- Prudence applied without systematic bias

### Recognition Threshold Conflicts

- When recognition criteria for an asset are marginally met, document the assessment
- Probable (>50%) vs virtually certain (>95%) vs remote thresholds drive classification (liability vs disclosure vs ignored)

### Resolution Procedure

1. Apply the tier ordering (domain_scope.md §Normative System Classification): Tier-1a > Tier-1b > Tier-2 > Tier-3
2. For same-tier conflicts, apply the more specific rule to the specific transaction
3. Document the decision and rationale in accounting policy notes

## SE Transfer Verification

| SE Pattern | Accounting Equivalent | Key Difference |
|---|---|---|
| Type system enforcement (compile-time) | Double-entry balance (at-entry) | SE uses compiler; accounting uses trial balance and software validation |
| Database constraints (CHECK, FK) | Chart of accounts validity, account classification | SE uses DB; accounting uses journal entry validation |
| Transaction atomicity (ACID) | Journal entry atomicity (all debits and credits post together) | Both require atomicity; accounting enforces via trial balance |
| Audit log | Audit trail (source document → journal → ledger → statement) | Same principle; accounting extends to include paper documents |
| Version control | Period-end closing and comparative restatement | Both preserve history; accounting groups by accounting period |

## Related Documents
- concepts.md — Definitions of Debit/Credit, recognition, measurement, consolidation terms
- structure_spec.md — Financial statement structure, chart of accounts, hierarchy principles
- dependency_rules.md — Inter-statement linkage, inter-standard dependencies
- competency_qs.md — Questions where logic rules provide inference paths
- domain_scope.md — Normative tier classification, cross-cutting concerns
