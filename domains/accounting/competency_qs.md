---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Accounting Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.
The onto_pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **verification concern** — classified by the concern of questions that must be answered during accounting system review.

## Double-Entry Consistency

- Q1: Do Debit (차변) totals equal Credit (대변) totals in every transaction?
- Q2: Are the accounts used in Journal Entries (분개) defined in the chart of accounts?
- Q3: Do the amounts in the journal and the General Ledger (총계정원장) match through the Posting (전기) process?

## Revenue/Expense Recognition

- Q4: Does revenue recognition follow the 5-step model of IFRS 15? (Contract identification -> Performance Obligation (이행의무) identification -> Transaction Price (거래가격) determination -> Allocation -> Recognition)
- Q5: Are the criteria for determining whether a Performance Obligation (이행의무) is fulfilled over time or at a point in time stated?
- Q6: Are expenses recognized in the same period as the related revenue? (Matching principle)

## Financial Statement Structure

- Q7: Does the Statement of Financial Position (재무상태표) satisfy the identity Assets = Liabilities + Equity?
- Q8: Is the current/non-current classification criterion applied consistently? (12-month criterion)
- Q9: Does the cash change amount on the Statement of Cash Flows (현금흐름표) match the cash change on the Statement of Financial Position (재무상태표)?
- Q10: Does net income on the Statement of Comprehensive Income (포괄손익계산서) connect to the Retained Earnings (이익잉여금) change on the Statement of Changes in Equity (자본변동표)?

## Financial Instruments (IFRS 9)

- Q11: Is the classification of financial assets (AC/FVOCI/FVTPL) determined based on the business model and cash flow characteristics?
- Q12: Is forward-looking information reflected in the Expected Credit Loss (기대신용손실) calculation?
- Q13: When hedge accounting is applied, is the effectiveness of the hedging relationship documented?

## Leases (IFRS 16)

- Q14: Are Right-of-Use Assets (사용권자산) and Lease Liabilities (리스부채) properly recognized in lease contracts?
- Q15: When Low-Value Lease (소액리스)/Short-Term Lease (단기리스) exemptions are applied, are the requirements met?
- Q16: Is the rationale for discount rate selection in Lease Liability (리스부채) measurement stated?

## Tax Adjustments

- Q17: Are differences between K-IFRS income and taxable income identified and adjusted?
- Q18: Are Deferred Tax (이연법인세) assets/liabilities recognized for Temporary Differences (일시적차이)?
- Q19: Has the realizability of Deferred Tax (이연법인세) assets been reviewed?

## Internal Controls and Audit

- Q20: Is an audit trail possible from transaction occurrence to financial statement presentation?
- Q21: Are the bases for key estimates (depreciation, provisions, Fair Value (공정가치)) documented?
- Q22: Are related party transactions identified and properly disclosed?

## Disclosure and Notes

- Q23: Are significant accounting policies described in the notes?
- Q24: Are the sources and sensitivities of estimation uncertainty disclosed?

## Related Documents
- domain_scope.md — the upper-level definition of the areas these questions cover
- logic_rules.md — Debit (차변)/Credit (대변) balance rules for Q1~Q3, recognition rules for Q4~Q6
- structure_spec.md — financial statement structure rules for Q7~Q10
