---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Dependency Rules

Classification axis: **Dependency type** — rules classified by the nature of the inter-element relationship.

## Inter-Financial-Statement Linkage

The 4 core linkages across financial statements. Violation of any linkage indicates compromised statement integrity.

| ID | Rule | Severity |
|---|---|---|
| LK-01 | Net income on IS = Retained Earnings change on SoCE | Error |
| LK-02 | Closing equity on SoCE = Total equity on BS | Error |
| LK-03 | Cash change on CF = Cash and Cash Equivalents change on BS | Error |
| LK-04 | OCI on IS = Accumulated OCI change on SoCE | Error |

### Linkage Verification

- Every period-end, the 4 linkages must be verified before statements are issued
- Failure of any linkage indicates: (1) missed closing entry, (2) posting error, (3) incorrect adjustment, (4) intercompany elimination error (consolidated)
- Tracing technique: start from the linkage violation, trace back through closing entries, then adjusting entries, then individual journal entries

### Violation Example

**Scenario**: SoCE shows Retained Earnings change of 100M. IS shows net income of 120M. Discrepancy of 20M.
**Diagnosis**: Likely causes in order of likelihood:
1. Dividends declared of 20M not recorded in SoCE (closing entry missed)
2. Prior period adjustment of 20M posted directly to Retained Earnings (should appear in SoCE)
3. Posting error in closing entry (partial close of income summary)

## Direction Rules

Rules governing the allowed direction of data flow.

| ID | Flow | Allowed Direction | Prohibited Direction |
|---|---|---|---|
| DR-01 | Transaction occurrence → Journal Entry | Transaction → Journal | Journal → Transaction (cannot create transactions from journals) |
| DR-02 | Journal Entry → Ledger (via Posting) | Journal → Ledger | Ledger → Journal (cannot backfill journals from ledgers) |
| DR-03 | Ledger → Trial Balance | Ledger → TB | TB → Ledger (TB is aggregation, not source) |
| DR-04 | Trial Balance → Financial Statements | TB → Statements | Statements → TB (statements are derived) |
| DR-05 | Main Statement → Note Reference | Main → Note | Note → Main (notes explain, don't define) |
| DR-06 | K-IFRS Standards → Accounting Policies | Standards → Policies | Policies → Standards (policies conform to standards) |
| DR-07 | K-IFRS Financial Statements → Tax Adjustment | K-IFRS → Tax | Tax → K-IFRS (tax does not modify financial statements) |

### Direction Rule Rationale

- **DR-01 to DR-04** establish the unidirectional flow from transaction to statement. Modifications are only permitted through adjusting entries (new journal entries) — direct modification of ledgers or trial balances is forbidden
- **DR-05** preserves the primacy of main statements. Notes add context but cannot reclassify main statement items
- **DR-06** enforces standard hierarchy. Accounting policies are derivative; standards are the source
- **DR-07** maintains separation between financial and tax reporting. Tax adjustments do not rewrite the books

## Inter-Standard Dependencies

When multiple K-IFRS standards apply to the same transaction, priority and interaction rules determine treatment.

### Standard Interaction Matrix

| Transaction Type | Applicable Standards | Interaction Rule |
|---|---|---|
| Contract with lease + non-lease components | IFRS 16, IFRS 15 | Separate components and apply each standard independently (IFRS 16.12-17) |
| Trade receivables | IFRS 15 (initial), IFRS 9 (subsequent) | Initial recognition per IFRS 15 transaction price; subsequent ECL per IFRS 9 |
| Lease receivables (lessor) | IFRS 16 (recognition), IFRS 9 (impairment) | ECL model from IFRS 9 applied to lease receivables |
| Revenue from financial products | IFRS 9 (interest), IFRS 15 (service fees) | Interest income per effective interest method (IFRS 9); service fees per IFRS 15 |
| Investment in equity-method entity | IAS 28 (measurement), IFRS 9 (held-for-sale if applicable) | Equity method unless reclassified to held-for-sale |
| Goodwill | IFRS 3 (recognition), IAS 36 (impairment) | Initial recognition per IFRS 3; annual impairment per IAS 36 |

### Priority Principle

When a specific standard has explicit requirements for a transaction type, that standard takes precedence over general principles. Example:
- Revenue from contracts with customers → IFRS 15 (specific)
- Other revenue (interest, dividends, rental) → per respective standards
- General asset recognition → IFRS Conceptual Framework (only when no specific standard applies)

## Period Dependencies

Rules governing multi-period consistency.

| ID | Rule | Severity |
|---|---|---|
| PD-01 | Prior period closing balances = Current period opening balances (permanent accounts) | Error |
| PD-02 | Temporary accounts (revenue, expense) start each period at zero | Error |
| PD-03 | Comparative financial statements: current and prior periods presented together | Warning |
| PD-04 | Accounting policy change: prior period restated retrospectively (IAS 8) | Warning |
| PD-05 | Error correction: prior period restated retrospectively (IAS 8) | Error |
| PD-06 | Estimate change: prospective application (IAS 8.32) | Warning |
| PD-07 | Quarterly sum ≠ Annual (year-end closing adjustments create differences) | Informational |

### Policy Change vs Estimate Change

- **Policy change** (retrospective): method of applying standard changes. Example: inventory valuation method FIFO → Weighted average
- **Estimate change** (prospective): judgment about future changes. Example: useful life of machinery revised from 10 to 8 years

Retrospective application process:
1. Restate prior period comparatives as if new policy had always been applied
2. Adjust opening retained earnings of earliest presented period
3. Disclose change and impact

## Inter-Account Dependencies

Dependencies between specific account pairs that must be maintained.

| Pair | Relationship | Verification |
|------|--------------|--------------|
| Revenue ↔ Trade Receivables | Simultaneous on credit sale | Revenue period = Receivable recognition period |
| Trade Receivables ↔ Allowance for Doubtful Accounts | Contra-asset | Allowance updated when receivables change materially |
| Depreciation Expense ↔ Accumulated Depreciation | Simultaneous recognition | Depreciation expense = change in accumulated depreciation |
| Inventories ↔ COGS | On sale | Inventory decrease = COGS recognition |
| Deferred Tax ↔ Temporary Differences | Derived | DT balance = sum of (temporary difference × tax rate) |
| Share Capital ↔ Shares Outstanding | 1:1 | Capital issued at par × shares outstanding |

### Referential Integrity

| ID | Rule | Severity |
|---|---|---|
| RI-01 | Accounts referenced in Journal Entries must exist in chart of accounts | Error |
| RI-02 | Financial statement items referenced in notes must exist in main statements | Error |
| RI-03 | Tax adjustment items must reference existing financial statement items | Error |
| RI-04 | Consolidated subsidiaries must be included in consolidation scope | Error |
| RI-05 | Intercompany transactions must reference both counterparties | Error |

## Source of Truth Management

Defining the authoritative source when accounting data appears in multiple places.

### Internal Source of Truth

| Data Type | Source of Truth | Derived/Reference |
|-----------|-----------------|-------------------|
| Transaction details | Journal (분개장) | Ledger, trial balance, statements |
| Account balances | General Ledger (총계정원장) | Trial balance, statements |
| Inter-period totals | Trial Balance (시산표) | Statements |
| Accounting policy | Notes (significant accounting policies) | Individual treatment |
| Internal control design | Internal Control Manual / COSO assessment | Control activity execution |

### External Source of Truth

| Data Type | Source of Truth | Notes |
|-----------|-----------------|-------|
| Accounting standards | K-IFRS (Korean Institute of CPAs translation) | Aligned with IFRS Foundation text |
| Tax standards | Corporate Tax Law, Income Tax Law | Periodic amendments |
| Audit standards | ISA (IAASB) | Periodic amendments |
| Fair value inputs | Market data (for Level 1/2); valuation models (Level 3) | IFRS 13 hierarchy |
| Exchange rates | Official bank rate or recognized source | Documented per transaction |

### Conflict Resolution Priority

When sources conflict:

1. **Accounting standards (K-IFRS)** for financial reporting — non-negotiable
2. **Tax law** for tax filing — applied in parallel
3. **Internal policy** for standard implementation choices — must be within K-IFRS framework
4. **Industry practice** for judgment areas where standards are silent — documented rationale

### Documentation Requirement

When conflicts resolved, document:
- Standards referenced
- Rationale for choice
- Expected impact on financial statements
- Subsequent monitoring plan

## External Dependency Management

Dependencies on external factors that change over time.

### K-IFRS Standard Amendments

- When standards amended, assess:
  1. Effective date (current period or future)
  2. Transition method (retrospective, modified retrospective, prospective)
  3. Impact on accounting policies
  4. Impact on financial statement presentation
  5. Disclosure requirements in transition year
- Change propagation: new standard → policy update → transaction treatment → statement impact → disclosure

### Tax Law Amendments

- When tax rates change, recalculate Deferred Tax at new rates
- When tax adjustment rules change, reclassify items between temporary/permanent differences
- Disclose tax law change impact on effective tax rate

### Exchange Rate Fluctuations

- Foreign currency transactions: recognized at transaction date rate
- Foreign currency monetary items at period end: translated at closing rate
- Non-monetary items at historical cost: translated at historical rate
- Translation differences: P&L for monetary items, OCI for certain non-monetary items
- Hedge of foreign operation: translation differences in OCI (net investment hedge)

### Fair Value Inputs

- Market data for Level 1 instruments: quoted prices in active markets
- Observable inputs for Level 2: yield curves, credit spreads, volatility
- Unobservable inputs for Level 3: internal valuation models, management assumptions
- When market data source changes (e.g., broker discontinues), revalidate and disclose

## Circular Dependency Detection

### Intentional Bidirectional Patterns (Not Cycles)

- **Parent ↔ Subsidiary** (consolidation): intercompany transactions create bidirectional edges that are eliminated in consolidation — managed, not circular
- **Deferred Tax Asset ↔ Deferred Tax Liability**: both derived from Temporary Differences; not circular but derived from same source
- **Trial Balance ↔ Journal Entries**: TB aggregates journals, but when journals are modified, TB recalculates — one-way recalculation, not cycle

### Unintentional Cycles (Defects)

- **Journal A ↔ Journal B**: two journals referencing each other without a source transaction
- **Policy A requires Policy B, Policy B requires Policy A**: circular policy definition
- **Control assessment loops**: consolidation scope depends on control; control assessment requires consolidation data

### Detection Method

- For accounting data: verify the strict flow (Transaction → Journal → Ledger → Trial Balance → Statements). If any reverse dependency exists, investigate
- For policy/standard dependencies: construct DAG of policy references; cycles indicate defective policy design

## SE Transfer Verification

| SE Pattern | Accounting Equivalent | Key Difference |
|---|---|---|
| Acyclic Dependencies Principle (module DAG) | Transaction-to-statement flow DAG | Both prohibit cycles; accounting enforces via direction rules |
| Dependency Inversion (depend on abstractions) | Policies depend on standards, not on specific transactions | SE uses interfaces; accounting uses standards as abstraction |
| Referential Integrity (FK) | RI-01 to RI-05 | SE enforces at DB level; accounting enforces at entry validation + audit |
| Source of Truth Management | SoT priority (K-IFRS > tax > internal > practice) | Similar principle; accounting has multiple parallel SoT for different purposes |
| Diamond Dependencies | Multi-standard transactions (IFRS 15 + IFRS 9) | SE version conflicts; accounting uses standard interaction rules |
| Change propagation | Standard/tax law amendment propagation | Both trace changes through dependencies; accounting emphasizes period boundary |

## Related Documents
- concepts.md — Definitions of financial statement and standards-related terms
- structure_spec.md — Financial statement structure and hierarchy principles
- logic_rules.md — Recognition, measurement, consolidation, tax logic
- domain_scope.md — Source of Truth priority mapping
- competency_qs.md — Questions verifying dependency rules
- extension_cases.md — Scenarios requiring dependency rule changes
