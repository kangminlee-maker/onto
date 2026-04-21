---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.

Classification axis: **Accounting verification concern** — classified by the concern that must be addressed during accounting system review.

Priority levels:
- **P1** — Must be answerable in any accounting system review. Failure indicates a fundamental gap.
- **P2** — Should be answerable for production systems. Failure indicates a quality gap.
- **P3** — Recommended for mature systems. Failure indicates a refinement opportunity.

## CQ ID System

### Prefix Allocation

| Prefix | Concern Area | Aligned Sub-Area |
|--------|-------------|------------------|
| CQ-DE | Double-Entry Bookkeeping | Double-Entry Bookkeeping |
| CQ-FS | Financial Statement Structure | Financial Statements |
| CQ-RR | Revenue Recognition (IFRS 15) | Revenue Recognition |
| CQ-FI | Financial Instruments (IFRS 9) | Financial Instruments |
| CQ-LS | Leases (IFRS 16) | Leases |
| CQ-PC | Period and Closing | Period and Closing |
| CQ-TX | Tax Accounting | Tax Accounting |
| CQ-AU | Audit and Internal Controls | Audit and Internal Controls |
| CQ-CS | Consolidated Accounting | Consolidated Accounting |
| CQ-DS | Disclosure and Notes | Disclosure and Notes |
| CQ-AT | Audit Trail (cross-cutting) | Cross-cutting |
| CQ-PA | Period Attribution (cross-cutting) | Cross-cutting |
| CQ-MC | Measurement Consistency (cross-cutting) | Cross-cutting |

---

## 1. Double-Entry Bookkeeping (CQ-DE)

Verifies that double-entry principles are correctly applied throughout transaction recording.

- **CQ-DE-01** [P1] Do Debit totals equal Credit totals in every Journal Entry?
  - Inference path: concepts.md §Double-Entry Bookkeeping Core Terms → Accounting Equation → logic_rules.md §Double-Entry Balance Logic
  - Verification criteria: PASS if every journal entry has equal debits and credits. FAIL if any entry is unbalanced

- **CQ-DE-02** [P1] Are all accounts used in Journal Entries defined in the chart of accounts?
  - Inference path: structure_spec.md §Chart of Accounts → dependency_rules.md §Referential Integrity → account existence requirement
  - Verification criteria: PASS if every debit/credit account traces to the chart of accounts. FAIL if any journal uses undefined accounts

- **CQ-DE-03** [P1] Do journal amounts match General Ledger amounts through the Posting process?
  - Inference path: concepts.md §Double-Entry Bookkeeping Core Terms → Posting → logic_rules.md §Double-Entry Balance Logic
  - Verification criteria: PASS if journal sum per account = ledger balance change. FAIL if any posting discrepancy

- **CQ-DE-04** [P1] Is the Trial Balance in balance (total debits = total credits across all accounts)?
  - Inference path: concepts.md §Double-Entry Bookkeeping Core Terms → Trial Balance → logic_rules.md §Double-Entry Balance Logic
  - Verification criteria: PASS if trial balance totals match. FAIL if imbalance (even 1 unit)

- **CQ-DE-05** [P2] Are account classifications (5 elements) correctly assigned per Journal Entry?
  - Inference path: concepts.md §Double-Entry Bookkeeping Core Terms → Accounting Equation → structure_spec.md §Chart of Accounts
  - Verification criteria: PASS if every account is one of Assets/Liabilities/Equity/Revenue/Expenses. FAIL if misclassified

- **CQ-DE-06** [P2] Do normal balance directions match account types (Assets: Debit; Liabilities/Equity: Credit; Revenue: Credit; Expenses: Debit)?
  - Inference path: concepts.md §Double-Entry Bookkeeping → Debit/Credit → logic_rules.md §Double-Entry Balance Logic
  - Verification criteria: PASS if normal balances match element rules. FAIL if e.g., Cash has credit normal balance

- **CQ-DE-07** [P3] Are subsidiary ledgers reconciled to General Ledger control accounts?
  - Inference path: concepts.md §Double-Entry Bookkeeping → Subsidiary Ledger → dependency_rules.md §Inter-Account Dependencies
  - Verification criteria: PASS if subsidiary ledger totals = control account balances. FAIL if unreconciled

---

## 2. Financial Statement Structure (CQ-FS)

Verifies that financial statements are correctly structured and linked.

- **CQ-FS-01** [P1] Does the Statement of Financial Position satisfy Assets = Liabilities + Equity?
  - Inference path: logic_rules.md §Double-Entry Balance Logic → Accounting Equation → structure_spec.md §Financial Statement Structure
  - Verification criteria: PASS if identity holds within rounding tolerance. FAIL if any violation

- **CQ-FS-02** [P1] Is the current/non-current classification criterion applied consistently (12-month rule)?
  - Inference path: concepts.md §Financial Statement Terms → logic_rules.md §Classification Rules → IAS 1.66/1.69
  - Verification criteria: PASS if every BS item has current/non-current classification. FAIL if missing or inconsistent

- **CQ-FS-03** [P1] Does cash change on the Statement of Cash Flows match the cash change on the Statement of Financial Position?
  - Inference path: dependency_rules.md §Inter-Financial-Statement Linkage → CF-BS cash reconciliation
  - Verification criteria: PASS if reconciliation holds. FAIL if mismatch

- **CQ-FS-04** [P1] Does net income on the Statement of Comprehensive Income connect to Retained Earnings change on the Statement of Changes in Equity?
  - Inference path: dependency_rules.md §Inter-Financial-Statement Linkage → IS to SoCE linkage
  - Verification criteria: PASS if net income appears consistently in both statements. FAIL if mismatch

- **CQ-FS-05** [P2] Does OCI on the Statement of Comprehensive Income connect to Accumulated OCI change on the Statement of Changes in Equity?
  - Inference path: dependency_rules.md §Inter-Financial-Statement Linkage → OCI to SoCE linkage
  - Verification criteria: PASS if OCI items reconcile. FAIL if mismatch

- **CQ-FS-06** [P2] Does closing equity on SoCE match total equity on Statement of Financial Position?
  - Inference path: dependency_rules.md §Inter-Financial-Statement Linkage → SoCE to BS equity
  - Verification criteria: PASS if closing equity matches. FAIL if mismatch

- **CQ-FS-07** [P2] Is each line item supported by a trial balance account balance?
  - Inference path: structure_spec.md §Hierarchy Structure Principles → upward aggregation → dependency_rules.md §Referential Integrity
  - Verification criteria: PASS if every statement line traces to account balances. FAIL if unsupported

---

## 3. Revenue Recognition (CQ-RR, IFRS 15)

- **CQ-RR-01** [P1] Does revenue recognition follow the 5-step IFRS 15 model (contract → performance obligations → transaction price → allocation → recognition)?
  - Inference path: logic_rules.md §Recognition Logic → IFRS 15 5-step → concepts.md §Revenue Recognition Terms
  - Verification criteria: PASS if each revenue contract traces through 5 steps with documentation. FAIL if any step missing or undocumented

- **CQ-RR-02** [P1] Is the criterion for over-time vs point-in-time recognition stated per contract?
  - Inference path: concepts.md §Revenue Recognition Terms → Over Time / Point in Time → logic_rules.md §Recognition Logic
  - Verification criteria: PASS if recognition method documented per contract. FAIL if indistinguishable

- **CQ-RR-03** [P1] Are expenses recognized in the same period as related revenue (matching principle)?
  - Inference path: logic_rules.md §Recognition Logic → matching principle
  - Verification criteria: PASS if direct matching for identifiable expenses. FAIL if systematic cross-period matching errors

- **CQ-RR-04** [P2] Is variable consideration estimated and included in transaction price?
  - Inference path: concepts.md §Revenue Recognition Terms → Variable Consideration → logic_rules.md §Recognition Logic
  - Verification criteria: PASS if variable consideration estimated using expected value or most likely amount. FAIL if ignored

- **CQ-RR-05** [P2] Are contract assets and contract liabilities correctly classified when performance and payment are not simultaneous?
  - Inference path: concepts.md §Revenue Recognition Terms → Contract Asset/Liability → dependency_rules.md §Inter-Account Dependencies
  - Verification criteria: PASS if timing differences create proper contract asset/liability. FAIL if misclassified as trade receivable/payable

- **CQ-RR-06** [P2] For multi-element contracts, is transaction price allocated by standalone selling price?
  - Inference path: concepts.md §Revenue Recognition Terms → Standalone Selling Price → logic_rules.md §Recognition Logic
  - Verification criteria: PASS if allocation documented. FAIL if allocation ad-hoc or missing

---

## 4. Financial Instruments (CQ-FI, IFRS 9)

- **CQ-FI-01** [P1] Are financial assets classified (AC/FVOCI/FVTPL) based on business model and SPPI test?
  - Inference path: concepts.md §Financial Instruments Terms → classification criteria → logic_rules.md §Recognition Logic
  - Verification criteria: PASS if classification documented per asset with both tests. FAIL if classification arbitrary

- **CQ-FI-02** [P1] Is Expected Credit Loss calculated using forward-looking information?
  - Inference path: concepts.md §Financial Instruments Terms → ECL 3-stage → logic_rules.md §Measurement Logic
  - Verification criteria: PASS if ECL uses forward-looking macro variables. FAIL if only historical loss rates

- **CQ-FI-03** [P2] Are ECL stages (1/2/3) tracked per asset?
  - Inference path: concepts.md §Financial Instruments Terms → ECL 3-stage model
  - Verification criteria: PASS if stage transitions documented. FAIL if stages indistinguishable

- **CQ-FI-04** [P2] When hedge accounting is applied, is the hedging relationship documented and effectiveness tested?
  - Inference path: concepts.md §Financial Instruments Terms → Hedge Accounting → logic_rules.md §Recognition Logic
  - Verification criteria: PASS if documentation exists and effectiveness retested periodically. FAIL if hedge applied without documentation

- **CQ-FI-05** [P3] Is effective interest method correctly applied for AC and FVOCI debt instruments?
  - Inference path: concepts.md §Financial Instruments Terms → Effective Interest Method
  - Verification criteria: PASS if amortisation schedule exists. FAIL if straight-line amortisation used

---

## 5. Leases (CQ-LS, IFRS 16)

- **CQ-LS-01** [P1] Are Right-of-Use Assets and Lease Liabilities recognized at commencement?
  - Inference path: concepts.md §Lease Terms → ROU asset and lease liability recognition
  - Verification criteria: PASS if both recognized at commencement date. FAIL if off-balance-sheet treatment

- **CQ-LS-02** [P1] Are short-term lease (≤12 months) or low-value asset exemptions applied only when criteria met?
  - Inference path: concepts.md §Lease Terms → Short-Term Lease / Low-Value Lease
  - Verification criteria: PASS if exemption applied only to qualifying leases. FAIL if improper exemption

- **CQ-LS-03** [P2] Is the discount rate for Lease Liability measurement documented (implicit rate or IBR)?
  - Inference path: concepts.md §Lease Terms → Incremental Borrowing Rate
  - Verification criteria: PASS if rate and basis documented per lease. FAIL if rate undocumented

- **CQ-LS-04** [P2] Is ROU asset depreciated over shorter of lease term and useful life?
  - Inference path: concepts.md §Lease Terms → ROU depreciation
  - Verification criteria: PASS if depreciation period matches rule. FAIL if inconsistent

---

## 6. Period and Closing (CQ-PC)

- **CQ-PC-01** [P1] Are period-end adjusting entries made for accrued revenues, accrued expenses, prepaid expenses, and unearned revenues?
  - Inference path: concepts.md §Period Attribution Terms → 4 accrual types → logic_rules.md §Period Attribution Logic
  - Verification criteria: PASS if all 4 types of adjustments made. FAIL if any missing

- **CQ-PC-02** [P1] Are closing entries posted to transfer temporary account balances to Retained Earnings?
  - Inference path: concepts.md §Double-Entry Bookkeeping → Closing Entry → logic_rules.md §Closing Procedures
  - Verification criteria: PASS if revenue/expense accounts zeroed at period end. FAIL if balances carried over

- **CQ-PC-03** [P2] Do opening balances (current period) equal closing balances (prior period) for all permanent accounts?
  - Inference path: dependency_rules.md §Period Dependencies → carryover consistency
  - Verification criteria: PASS if every permanent account rolls forward correctly. FAIL if any discontinuity

- **CQ-PC-04** [P2] Are depreciation, ECL allowance, and other estimates recorded systematically at period end?
  - Inference path: logic_rules.md §Measurement Logic → systematic allocation
  - Verification criteria: PASS if estimates recorded per documented methodology. FAIL if estimates ad-hoc

- **CQ-PC-05** [P2] Are comparative period figures correctly restated when accounting policies change?
  - Inference path: dependency_rules.md §Period Dependencies → comparative restatement → IAS 8
  - Verification criteria: PASS if prior period figures restated for policy changes. FAIL if only prospective applied without justification

---

## 7. Tax Accounting (CQ-TX)

- **CQ-TX-01** [P1] Are differences between K-IFRS income and taxable income identified and reconciled?
  - Inference path: concepts.md §Tax Accounting Terms → Tax Adjustment → logic_rules.md §Tax-Accounting Difference Logic
  - Verification criteria: PASS if tax adjustment schedule reconciles. FAIL if income gaps unexplained

- **CQ-TX-02** [P1] Are Deferred Tax assets/liabilities recognized for temporary differences?
  - Inference path: concepts.md §Tax Accounting Terms → Temporary Difference → logic_rules.md §Tax-Accounting Difference Logic
  - Verification criteria: PASS if all temporary differences produce deferred tax. FAIL if ignored

- **CQ-TX-03** [P2] Is recoverability of Deferred Tax Assets assessed?
  - Inference path: concepts.md §Tax Accounting Terms → Deferred Tax Asset → recognition threshold
  - Verification criteria: PASS if DTA recognized only when future taxable income probable. FAIL if DTA recognized without assessment

- **CQ-TX-04** [P2] Are permanent differences correctly excluded from deferred tax?
  - Inference path: concepts.md §Tax Accounting Terms → Permanent Difference
  - Verification criteria: PASS if permanent differences identified and excluded. FAIL if misclassified as temporary

- **CQ-TX-05** [P3] Does the effective tax rate reconciliation explain deviations from statutory rate?
  - Inference path: concepts.md §Tax Accounting Terms → Effective Tax Rate
  - Verification criteria: PASS if reconciliation disclosed in notes. FAIL if effective rate unexplained

---

## 8. Audit and Internal Controls (CQ-AU)

- **CQ-AU-01** [P1] Is an audit trail traceable from source document to financial statement presentation?
  - Inference path: domain_scope.md §Cross-Cutting Concerns → Audit Trail → structure_spec.md §Verification Structure
  - Verification criteria: PASS if every statement line can be traced back to supporting transactions. FAIL if any trace breaks

- **CQ-AU-02** [P1] Are bases for key estimates (depreciation, provisions, fair value) documented?
  - Inference path: concepts.md §Audit and Internal Control Terms → Audit Evidence → logic_rules.md §Measurement Logic
  - Verification criteria: PASS if each estimate has documented methodology. FAIL if estimates unsupported

- **CQ-AU-03** [P1] Are related party transactions identified and properly disclosed?
  - Inference path: domain_scope.md §Key Sub-Areas → Disclosure and Notes → concepts.md §Interpretation Principles
  - Verification criteria: PASS if related parties identified and transactions disclosed. FAIL if treated as arm's-length

- **CQ-AU-04** [P2] Do internal controls address the 5 COSO components?
  - Inference path: domain_scope.md §Reference Standards/Frameworks → COSO Internal Control Framework
  - Verification criteria: PASS if all 5 components (environment, risk assessment, control activities, information/communication, monitoring) documented. FAIL if any component absent

- **CQ-AU-05** [P2] Are materiality thresholds defined for the audit?
  - Inference path: concepts.md §Audit and Internal Control Terms → Material Misstatement
  - Verification criteria: PASS if threshold documented (e.g., 5% of pre-tax income). FAIL if threshold undefined

- **CQ-AU-06** [P3] Are Key Audit Matters identified and reported?
  - Inference path: concepts.md §Audit and Internal Control Terms → KAM (ISA 701)
  - Verification criteria: PASS if KAM section exists in audit report. FAIL if KAM absent

---

## 9. Consolidated Accounting (CQ-CS)

- **CQ-CS-01** [P1] Is consolidation scope determined by control (3 elements of IFRS 10)?
  - Inference path: concepts.md §Consolidation Terms → Control → logic_rules.md §Consolidation Logic
  - Verification criteria: PASS if control test documented (power + variable returns + link). FAIL if scope based only on ownership %

- **CQ-CS-02** [P1] Are intercompany transactions fully eliminated in consolidation?
  - Inference path: concepts.md §Consolidation Terms → Intercompany Transactions → logic_rules.md §Consolidation Logic
  - Verification criteria: PASS if intercompany sales/purchases, loans, dividends eliminated. FAIL if double-counted

- **CQ-CS-03** [P2] Are unrealized profits on intercompany inventory eliminated?
  - Inference path: concepts.md §Consolidation Terms → Unrealized Profit
  - Verification criteria: PASS if unrealized profit eliminated until external sale. FAIL if included in consolidated earnings

- **CQ-CS-04** [P2] Is Non-controlling Interest separately presented and correctly calculated?
  - Inference path: concepts.md §Consolidation Terms → Non-controlling Interest
  - Verification criteria: PASS if NCI shown separately in equity and attributed share of net income. FAIL if combined with parent equity

- **CQ-CS-05** [P2] For business combinations, is purchase price allocated to identifiable assets/liabilities at fair value?
  - Inference path: concepts.md §Consolidation Terms → Purchase Price Allocation → IFRS 3
  - Verification criteria: PASS if PPA documented with fair values. FAIL if excess lumped entirely into goodwill

- **CQ-CS-06** [P2] Is goodwill tested for impairment annually?
  - Inference path: concepts.md §Consolidation Terms → Goodwill → IAS 36 impairment
  - Verification criteria: PASS if annual impairment test documented. FAIL if goodwill tested only when impairment indicator

- **CQ-CS-07** [P3] Are associates and joint ventures accounted for using equity method?
  - Inference path: concepts.md §Consolidation Terms → Equity Method
  - Verification criteria: PASS if 20-50% ownership uses equity method. FAIL if treated as available-for-sale

---

## 10. Disclosure and Notes (CQ-DS)

- **CQ-DS-01** [P1] Are significant accounting policies described in the notes?
  - Inference path: domain_scope.md §Key Sub-Areas → Disclosure and Notes → IAS 1.117
  - Verification criteria: PASS if policies for significant items (revenue, inventory, PP&E, leases, financial instruments) disclosed. FAIL if policies missing

- **CQ-DS-02** [P1] Are sources and sensitivities of estimation uncertainty disclosed?
  - Inference path: concepts.md §Interpretation Principles → Estimates require documentation
  - Verification criteria: PASS if critical estimates identified with sensitivity analysis. FAIL if estimates silent

- **CQ-DS-03** [P2] Are contingent liabilities disclosed with probability and amount estimates?
  - Inference path: domain_scope.md §Key Sub-Areas → Disclosure and Notes → IAS 37
  - Verification criteria: PASS if contingent liabilities disclosed per IAS 37. FAIL if off-balance-sheet items hidden

- **CQ-DS-04** [P2] Are related party transactions disclosed with party identity and transaction nature?
  - Inference path: domain_scope.md §Key Sub-Areas → Disclosure and Notes → IAS 24
  - Verification criteria: PASS if IAS 24 disclosures complete. FAIL if related party obscured

- **CQ-DS-05** [P3] Are subsequent events (post-reporting period) disclosed?
  - Inference path: IAS 10 subsequent events
  - Verification criteria: PASS if material post-reporting events disclosed. FAIL if adjusting events missed

---

## 11. Audit Trail (CQ-AT) — Cross-cutting

- **CQ-AT-01** [P1] Can every financial statement line be traced back to journal entries?
  - Inference path: domain_scope.md §Cross-Cutting Concerns → Audit Trail → structure_spec.md §Hierarchy Structure Principles
  - Verification criteria: PASS if statement-to-journal trace exists. FAIL if any gap

- **CQ-AT-02** [P1] Can every journal entry be traced to a source document?
  - Inference path: concepts.md §Interpretation Principles → Audit Evidence
  - Verification criteria: PASS if every entry has document reference. FAIL if entries without support

- **CQ-AT-03** [P2] Are all modifications to prior records logged with reason and authorization?
  - Inference path: structure_spec.md §Verification Structure → adjusting entries require authorization
  - Verification criteria: PASS if modifications logged. FAIL if silent overwrites

---

## 12. Period Attribution (CQ-PA) — Cross-cutting

- **CQ-PA-01** [P1] Are transactions recorded in the correct accounting period per accrual basis?
  - Inference path: concepts.md §Period Attribution Terms → logic_rules.md §Period Attribution Logic
  - Verification criteria: PASS if economic event drives period attribution. FAIL if cash timing drives attribution

- **CQ-PA-02** [P2] Does cutoff testing verify period boundary transactions?
  - Inference path: concepts.md §Audit and Internal Control Terms → Management Assertion (cutoff)
  - Verification criteria: PASS if cutoff tests performed. FAIL if period boundaries unverified

---

## 13. Measurement Consistency (CQ-MC) — Cross-cutting

- **CQ-MC-01** [P1] Are measurement bases (historical cost, fair value, amortised cost) consistently applied per accounting policy?
  - Inference path: concepts.md §Accounting Policy Choices → logic_rules.md §Measurement Logic
  - Verification criteria: PASS if measurement basis documented per item class. FAIL if ad-hoc measurement

- **CQ-MC-02** [P2] When measurement basis changes, is the change retrospectively applied per IAS 8?
  - Inference path: dependency_rules.md §Period Dependencies → comparative restatement
  - Verification criteria: PASS if retrospective application documented. FAIL if prospective without disclosure

- **CQ-MC-03** [P2] Is the Fair Value hierarchy (Level 1/2/3) disclosed per fair-valued item?
  - Inference path: concepts.md §Financial Statement Terms → Fair Value → IFRS 13
  - Verification criteria: PASS if hierarchy disclosed. FAIL if level not identifiable

---

## Coverage Verification

| Area | CQ Count | P1 | P2 | P3 |
|---|---|---|---|---|
| Double-Entry Bookkeeping (CQ-DE) | 7 | 4 | 2 | 1 |
| Financial Statement Structure (CQ-FS) | 7 | 4 | 3 | 0 |
| Revenue Recognition (CQ-RR) | 6 | 3 | 3 | 0 |
| Financial Instruments (CQ-FI) | 5 | 2 | 2 | 1 |
| Leases (CQ-LS) | 4 | 2 | 2 | 0 |
| Period and Closing (CQ-PC) | 5 | 2 | 3 | 0 |
| Tax Accounting (CQ-TX) | 5 | 2 | 2 | 1 |
| Audit and Internal Controls (CQ-AU) | 6 | 3 | 2 | 1 |
| Consolidated Accounting (CQ-CS) | 7 | 2 | 4 | 1 |
| Disclosure and Notes (CQ-DS) | 5 | 2 | 2 | 1 |
| Audit Trail (CQ-AT) | 3 | 2 | 1 | 0 |
| Period Attribution (CQ-PA) | 2 | 1 | 1 | 0 |
| Measurement Consistency (CQ-MC) | 3 | 1 | 2 | 0 |
| **Total** | **65** | **30** | **29** | **6** |

## Related Documents

- domain_scope.md — Sub-area to CQ section mapping, bias detection criteria
- logic_rules.md — Recognition, measurement, balance logic, closing procedures
- structure_spec.md — Financial statement structure, chart of accounts, verification structure
- dependency_rules.md — Inter-statement linkage, referential integrity
- concepts.md — Term definitions, synonym mappings, interpretation principles
- extension_cases.md — Scenarios for advanced questions
- conciseness_rules.md — Redundancy patterns
