# Accounting Domain — Domain Scope Definition

This is the reference document used by onto_coverage to identify "what should exist but is missing" in accounting systems.
This domain applies when **reviewing** accounting systems and financial reporting frameworks.

## Major Sub-areas

Classification axis: **concern** — classified by the design concerns that an accounting system must address.

### Double-Entry & Recording
- **Double-entry bookkeeping principles** (required): Debit (차변)/Credit (대변) balance, Journal Entry (분개), Trial Balance (시산표), Posting (전기)
- **Accrual basis accounting** (required): timing of revenue/expense recognition, differences from cash basis, period attribution
- **Chart of accounts** (required): 5 major classifications of assets/liabilities/equity/revenue/expenses, account code system, subsidiary ledgers

### Financial Statements
- **Statement of Financial Position (재무상태표)** (required): Assets = Liabilities + Equity identity, current/non-current classification, fair value measurement
- **Statement of Comprehensive Income (포괄손익계산서)** (required): revenue/expense recognition, Other Comprehensive Income (기타포괄손익), operating income calculation structure
- **Statement of Cash Flows (현금흐름표)** (required): operating/investing/financing activity classification, direct/indirect method
- **Statement of Changes in Equity (자본변동표)** (when applicable): changes in equity components, appropriation of Retained Earnings (이익잉여금)

### K-IFRS Core Standards
- **IFRS 15 Revenue Recognition (수익인식)** (required): 5-step revenue recognition model, Performance Obligation (이행의무) identification, transaction price allocation
- **IFRS 16 Leases (리스)** (required): Right-of-Use Asset (사용권자산)/Lease Liability (리스부채) recognition, elimination of operating/finance lease distinction, exemption conditions
- **IFRS 9 Financial Instruments (금융상품)** (required): classification and measurement (AC/FVOCI/FVTPL), Expected Credit Loss (기대신용손실), hedge accounting

### Period & Reporting
- **Accounting period** (required): fiscal year, quarterly/semi-annual reporting, closing procedures
- **Disclosure and notes** (required): significant accounting policy disclosure, estimation uncertainty, related party transactions
- **XBRL reporting** (scale-dependent): electronic disclosure taxonomy, tagging rules, validation

### Supporting Areas
- **Tax accounting** (when applicable): Corporate Tax Law and K-IFRS difference adjustments, Deferred Tax (이연법인세), tax adjustments
- **Cost/management accounting** (when applicable): cost allocation, budgeting, performance analysis, break-even point
- **Audit/internal controls** (when applicable): ISA-based audit procedures, internal control design, audit evidence
- **Consolidated accounting** (when applicable): control determination, consolidation scope, intercompany transaction elimination, Non-controlling Interest (비지배지분)

## Required Concept Categories

These are concept categories that must be addressed in any accounting system.

| Category | Description | Risk if Missing |
|---|---|---|
| Debit (차변)/Credit (대변) balance | Every transaction must have equal debits and credits | Trial Balance (시산표) imbalance, financial statement integrity breakdown |
| Accrual basis (발생기준) | Recognized at the time of economic event occurrence, not cash exchange | Revenue/expense period attribution errors |
| Going concern (계속기업) | Assumption that the entity will continue operations for the foreseeable future | Asset valuation basis breakdown, liquidation value application needed |
| Materiality (중요성) | The degree to which omissions/errors influence users' decisions | Excessive disclosure or omission of significant information |
| Substance over form (실질우선) | Accounting treatment based on economic substance rather than legal form | Formal classification errors, substance distortion |
| Audit trail (추적 가능성) | Tracing path from transaction occurrence -> Journal Entry (분개) -> ledger -> financial statements | Audit impossible, unable to identify error sources |

## Reference Standards/Frameworks

| Standard | Application Area | Usage |
|---|---|---|
| K-IFRS (한국채택국제회계기준) | Financial reporting overall | Standards for recognition, measurement, presentation, and disclosure |
| K-GAAP (일반기업회계기준) | Non-listed SMEs | Accounting standards for entities not applying K-IFRS |
| Corporate Tax Law/Income Tax Law | Tax accounting | Basis for tax adjustments and Deferred Tax (이연법인세) calculations |
| XBRL (eXtensible Business Reporting Language) | Electronic disclosure | Structured reporting format for financial data |
| ISA (International Standards on Auditing) | Audit/internal controls | Standards for audit planning, execution, and reporting procedures |
| COSO Internal Control Framework | Internal controls | Control environment, risk assessment, control activities, information/communication, monitoring |

## Bias Detection Criteria

- If 3 or more of the 5 concern areas are not represented at all -> **insufficient coverage**
- If concepts from a specific standard (e.g., IFRS 15) account for more than 70% of the total -> **bias warning**
- If only normal transactions are addressed with no Adjusting Entry (수정분개)/error corrections -> **path bias**
- If only recognition/measurement is present with no disclosure/notes -> **reporting incomplete**
- If only individual financial statements are present with no consolidated perspective (when applicable) -> **consolidated perspective absence**
- If K-IFRS income is used directly as taxable income without tax adjustments -> **tax-accounting confusion**

## Related Documents
- concepts.md — definitions of terms within this scope
- structure_spec.md — specific rules for financial statement structure and chart of accounts
- competency_qs.md — questions this scope must be able to answer
