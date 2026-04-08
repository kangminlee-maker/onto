---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Conciseness Rules (accounting)

This document contains the domain-specific rules that conciseness references during conciseness verification.
It is organized in the order: **type (allow/remove) -> verification criteria -> role boundaries -> measurement methods**.

---

## 1. Allowed Redundancy

Each rule is tagged with a severity level:
- **[MUST-ALLOW]**: Redundancy that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Redundancy kept for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Double-Entry Processing Steps

- [MUST-ALLOW] Multiple records of the same transaction across the Journal Entry (분개) -> Posting (전기) -> Trial Balance (시산표) 3-step process — the same transaction exists in different formats in the journal, General Ledger (총계정원장), and Trial Balance (시산표). Each step performs a unique verification function and cannot be consolidated. The journal is the source of truth for raw transaction records, the ledger provides account-level aggregation, and the Trial Balance (시산표) provides balance verification.
- [MUST-ALLOW] Coexistence of Adjusting Entries (수정분개) and original Journal Entries (분개) — original entries are immutable records, and Adjusting Entries (수정분개) are added as separate records. Directly modifying original entries destroys the audit trail.

### Tax/Accounting Parallel Records

- [MUST-ALLOW] Parallel records of K-IFRS accounting treatment and tax basis treatment — the same transaction may be treated differently for financial reporting purposes (K-IFRS) and tax filing purposes (tax law). This difference arises from the difference in system objectives; consolidating into one makes it impossible to fulfill either purpose.
- [MUST-ALLOW] Dual tracking of Carrying Amounts (장부금액) and tax bases for Deferred Tax (이연법인세) — two amounts (Carrying Amount (장부금액) and tax base) for the same asset/liability must be maintained simultaneously to calculate Temporary Differences (일시적차이). Removing either makes Deferred Tax (이연법인세) calculation impossible.

### Cross-Reference Between Financial Statements

- [MUST-ALLOW] Both-side records of linking items between financial statements — net income is displayed on both the Statement of Comprehensive Income (포괄손익계산서) and the Statement of Changes in Equity (자본변동표). Cash changes are displayed on both the Statement of Cash Flows (현금흐름표) and the Statement of Financial Position (재무상태표). Both-side records are needed to verify inter-statement consistency.
- [MAY-ALLOW] Restating main statement figures in notes — detailed breakdowns of main statement figures are explained in notes. Retain as long as the totals between main statements and notes are consistent. Remove if it is a simple repetition.

### Chart of Accounts

- [MAY-ALLOW] Same information held in both subsidiary ledgers and the General Ledger (총계정원장) — subsidiary ledgers contain per-counterparty/per-item details; the General Ledger (총계정원장) contains per-account aggregation. Details and aggregation answer different queries, so retain both; however, when aggregation discrepancies occur, the subsidiary ledger is the authoritative source.

---

## 2. Removal Target Patterns

Each rule is tagged with a severity level:
- **[MUST-REMOVE]**: Redundancy whose mere existence causes errors or incorrect inferences.
- **[SHOULD-REMOVE]**: Redundancy that is not very harmful but adds unnecessary complexity.

### Account Redundancy

- [MUST-REMOVE] Duplicate definitions of the same account — when the same account appears in different locations with different classifications/definitions, Posting (전기) classification errors occur. Use the term definitions in concepts.md as the basis for identification.
- [MUST-REMOVE] Double-recording of the same transaction under different account paths — errors such as recognizing revenue in both revenue and non-operating income simultaneously. Even if the Trial Balance (시산표) remains balanced with duplicate entries in the journal, financial statements are distorted.

### Classification Redundancy

- [SHOULD-REMOVE] Accounts with no transactions — accounts that exist in the chart of accounts but have zero actual transactions. However, retain if recorded as planned for future use in extension_cases.md.
- [SHOULD-REMOVE] Intermediate classifications with only 1 child account — when only a single account exists under a classification such as Assets > Current Assets > Quick Assets, the intermediate classification has no significance and should be merged with the parent.

### Definition Redundancy

- [MUST-REMOVE] Dual definition of the same accounting policy in both notes and a separate document — the source of truth for accounting policies is the notes. If a different version exists in a separate document, policy inconsistency occurs.
- [SHOULD-REMOVE] Same calculation logic (depreciation, allowance for doubtful accounts, etc.) copied across multiple locations — transition to a structure where the calculation basis is defined in one place and referenced elsewhere.

### Standards Application Redundancy

- [SHOULD-REMOVE] Redeclaring in specific accounting policies what the overarching standard already requires — repeating principles guaranteed by the K-IFRS Conceptual Framework (accrual basis, going concern, etc.) in individual accounting policies creates update omission risk when standards are revised.

---

## 3. Minimum Granularity Criteria

A sub-classification is permitted only if it satisfies **at least one** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it generate a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (recognition requirements, measurement criteria, disclosure requirements) apply?
3. **Dependency difference**: Does it depend on different standards/regulations, or link to different financial statement items?

Examples:
- `Current assets` and `Non-current assets` are justified as separate classifications because different recognition/measurement constraints (12-month criterion, Fair Value (공정가치) measurement frequency) apply.
- If `Short-term borrowings` and `Current portion of long-term debt` have the same maturity conditions and same interest rate structure, they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/conciseness.md`. This section describes only the specific application cases in the accounting domain.

### pragmatics boundary

- conciseness: Does an unnecessary element **exist**? (structural level)
- pragmatics: Does unnecessary information **hinder** query execution? (execution level)
- Example: Unused accounting policies described in financial statement notes -> conciseness. Excessive notes making it difficult to identify important information -> pragmatics.

### coverage boundary

- conciseness: Does something exist that should not? (reduction direction)
- coverage: Is something missing that should exist? (expansion direction)
- Example: Accounts receivable impairment model is missing -> coverage. Both individual and collective assessment are redundantly applied to the same receivable -> conciseness.

### logic boundary (predecessor/successor relationship)

- logic predecessor: determines logical equivalence (entailment)
- conciseness successor: decides whether to remove after equivalence is confirmed
- Example: The Conceptual Framework's accrual basis principle entails an individual accounting policy's period attribution rule -> logic determines equivalence -> conciseness determines "individual policy redeclaration is unnecessary."

### semantics boundary (predecessor/successor relationship)

- semantics predecessor: determines semantic identity (synonym status)
- conciseness successor: decides whether merging is needed after synonym confirmation
- Example: Balance Sheet (대차대조표)/Statement of Financial Position (재무상태표), Income Statement (손익계산서)/Statement of Comprehensive Income (포괄손익계산서) are the same concepts -> semantics determines they are synonyms -> conciseness determines "consolidate to current terms (Statement of Financial Position (재무상태표), Statement of Comprehensive Income (포괄손익계산서))."

---

## 5. Quantitative Criteria

Observed thresholds from the domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — term definitions, synonym mappings, homonym lists (semantic criteria for redundancy determination)
- `structure_spec.md` — financial statement structure and chart of accounts rules (structural removal criteria)
- `competency_qs.md` — competency question list (criteria for "actual difference" in minimum granularity determination)
- `dependency_rules.md` — source of truth management rules, inter-financial-statement linkage relationships (basis for allowing reference copies)
- `logic_rules.md` — Debit (차변)/Credit (대변) balance, recognition/measurement logic, constraint conflict checking rules (criteria for logical equivalence determination)
