# Accounting Domain — Logic Rules

## Debit (차변)/Credit (대변) Balance Logic

- In every transaction, Debit (차변) total = Credit (대변) total. This is the fundamental invariant of double-entry bookkeeping
- Trial Balance (시산표) balance does not guarantee classification accuracy. Even if both Debit (차변) and Credit (대변) are wrong, the totals can still match
- Adjusting Entries (수정분개) must also maintain Debit (차변)/Credit (대변) balance. Modifying only one side is a logical contradiction
- Asset accounts: Debit (차변) increases, Credit (대변) decreases. Liability/Equity accounts: Credit (대변) increases, Debit (차변) decreases. This directionality is derived from the accounting equation (A=L+E)

## Recognition Logic

- Revenue recognition is performed at the point of control transfer (IFRS 15). "Delivery complete" and "control transferred" are not necessarily simultaneous
- Expenses are recognized in the same period as related revenue (matching principle). Expenses that cannot be directly matched to revenue are recognized in the period incurred
- Asset recognition requirements: (1) probability of future economic benefits flowing in is high, and (2) cost can be reliably measured
- Liability recognition requirements: (1) a present obligation exists, (2) probability of economic benefits flowing out is high, and (3) the amount can be reliably measured

## Measurement Logic

- Initial recognition is in principle measured at the transaction price (cost). Subsequent measurement uses either the cost model or Fair Value (공정가치) model
- Fair Value (공정가치) hierarchy: Level 1 (market price of identical assets) > Level 2 (similar assets or observable inputs) > Level 3 (unobservable inputs). Estimation uncertainty increases at lower levels
- Impairment Loss (손상차손): recognized when Carrying Amount (장부금액) > recoverable amount. Recoverable amount = max(net Fair Value (공정가치), Value in Use (사용가치))
- Depreciation: systematic allocation over the asset's useful life. Useful life and residual value are reviewed at each reporting period-end

## Period Attribution Logic

- Unearned Revenue (선수수익): cash received but Performance Obligation (이행의무) not yet fulfilled. Recognized as a liability, then converted to revenue upon fulfillment
- Accrued Revenue (미수수익): Performance Obligation (이행의무) fulfilled but cash not yet received. Recognized as an asset
- Prepaid Expenses (선급비용): cash paid but benefit not yet consumed. Recognized as an asset, then converted to expense upon consumption
- Accrued Expenses (미지급비용): benefit consumed but cash not yet paid. Recognized as a liability
- Period-end Adjusting Entries (수정분개) are the procedure for correcting the period attribution of these 4 types

## Consolidation Logic

- Control determination: control exists when the investor holds all three of: power over the investee, exposure to variable returns, and the link between power and returns
- Intercompany transaction elimination: transactions within the consolidated entity (sales/purchases, loans/borrowings) are eliminated in full during consolidation. Unrealized profits are also eliminated
- Non-controlling Interest (비지배지분): the portion of a subsidiary's net assets not attributable to the parent. Presented separately in equity

## Tax-Accounting Difference Logic

- Temporary Difference (일시적차이): the difference between Carrying Amount (장부금액) and tax base. Increases/decreases future taxable income. Generates Deferred Tax (이연법인세)
- Permanent Difference (영구적차이): a difference that is permanently treated differently between accounting and tax. Does not generate Deferred Tax (이연법인세) (e.g., entertainment expense limit excess)
- Deferred Tax (이연법인세) asset recognition: recognized only when it is probable that future taxable income will be available against which the deductible Temporary Difference (일시적차이) can be utilized

## Constraint Conflict Checking

- When K-IFRS and tax law require different treatment for the same transaction, financial reporting follows K-IFRS and tax filing follows tax law. Consolidating into a single standard is a logical error
- When Fair Value (공정가치) measurement and cost measurement coexist for the same asset, the measurement model choice must be applied consistently as an accounting policy
- When conservatism (prudence) conflicts with neutrality, K-IFRS prioritizes neutrality. Excessive conservatism distorts financial statements

## Related Documents
- concepts.md — definitions of Debit (차변)/Credit (대변), recognition, measurement, and related terms
- dependency_rules.md — inter-financial-statement linkage, inter-standard dependencies
- competency_qs.md — Q1~Q6 (Debit (차변)/Credit (대변) balance and recognition verification questions)
