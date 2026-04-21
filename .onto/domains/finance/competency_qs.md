---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Finance Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.

Classification axis: **Financial reporting concern** — classified by the concern that questions must address when reviewing a financial reporting ontology. This axis aligns with domain_scope.md Key Sub-Areas + Cross-Cutting Concerns.

Priority levels:
- **P1** — Must be answerable in any financial ontology review. Failure indicates a fundamental data gap.
- **P2** — Should be answerable for production systems. Failure indicates a quality gap.
- **P3** — Recommended for mature systems. Failure indicates a refinement opportunity.

## CQ ID System

### Prefix Allocation

| Prefix | Concern Area | Aligned Sub-Area |
|--------|-------------|------------------|
| CQ-FS | Financial Statement Structure | Financial Statement Structure |
| CQ-CA | Chart of Accounts Classification | Chart of Accounts Classification |
| CQ-AI | Accounting Identity | Accounting Identity and Constraints |
| CQ-TP | Temporal/Period | Period and Point-in-Time |
| CQ-CS | Consolidated/Separate | Consolidated and Separate Reporting |
| CQ-ND | Notes and Disclosure | Notes and Disclosure System |
| CQ-AS | Accounting Standards | Key Accounting Standards |
| CQ-DM | Derived Metrics | Derived Metrics and Analysis |
| CQ-RC | Regulatory and Compliance | Regulatory and Compliance |
| CQ-IE | Inter-Entity Comparison | Cross-cutting |
| CQ-TS | Time Series | Cross-cutting |
| CQ-DQ | Data Quality | Cross-cutting |

---

## 1. Financial Statement Structure (CQ-FS)

Verifies that the ontology correctly represents financial statement components and their interrelationships.

- **CQ-FS-01** [P1] Can the ontology retrieve all five required financial statements (BS, IS, CF, equity changes, comprehensive income) for a given entity-period?
  - Inference path: structure_spec.md §Financial Statement Completeness → 5 statements required → domain_scope.md §Key Sub-Areas → Statement Components
  - Verification criteria: PASS if all 5 statements retrievable for any entity-period. FAIL if any statement missing

- **CQ-FS-02** [P1] Do cross-statement linkages hold? (Net income from IS appears in equity changes; CF reconciles to BS cash)
  - Inference path: logic_rules.md §Cross-Statement Linkage Rules → net income linkage + cash reconciliation → structure_spec.md §Required Relationships
  - Verification criteria: PASS if net income in IS = net income in equity changes AND closing cash in CF = cash in BS. FAIL if any linkage broken

- **CQ-FS-03** [P1] Can the ontology distinguish between a combined IS+OCI statement and separate IS and OCI statements?
  - Inference path: concepts.md §Financial Statement Core Terms → Statement of Comprehensive Income → may be combined
  - Verification criteria: PASS if presentation format metadata captured. FAIL if combined/separate distinction lost

- **CQ-FS-04** [P2] For financial industry entities, are additional/different statement structures supported?
  - Inference path: domain_scope.md §Key Sub-Areas → Financial Industry Statements → structure_spec.md §Financial Statement Completeness
  - Verification criteria: PASS if banking/insurance statement structures accommodated. FAIL if only general industry structure

- **CQ-FS-05** [P2] Can the ontology retrieve the CF statement using both direct and indirect method presentations?
  - Inference path: concepts.md §Financial Statement Core Terms → Cash Flow Statement → direct/indirect method
  - Verification criteria: PASS if both methods supported. FAIL if only one method handled

---

## 2. Chart of Accounts Classification (CQ-CA)

Verifies that accounts are correctly classified and hierarchically structured.

- **CQ-CA-01** [P1] Is every account classified into one of the 5 elements (Assets/Liabilities/Equity/Revenue/Expenses)?
  - Inference path: concepts.md §Account Classification Principles → 5 elements → structure_spec.md §Required Node Types → Concept
  - Verification criteria: PASS if every Concept node has element classification. FAIL if unclassified accounts exist

- **CQ-CA-02** [P1] Is the current/non-current classification applied to all BS accounts?
  - Inference path: concepts.md §Current/Non-current Classification → IAS 1.66, 1.69 → logic_rules.md §Classification Rules
  - Verification criteria: PASS if every BS account has current/non-current tag. FAIL if classification missing

- **CQ-CA-03** [P1] Does the account hierarchy correctly roll up from line items to totals (e.g., current assets items → total current assets → total assets)?
  - Inference path: structure_spec.md §Required Relationships → Concept hierarchy → logic_rules.md §Relation Rules
  - Verification criteria: PASS if rollup math is consistent (sum of children = parent). FAIL if arithmetic gap in hierarchy

- **CQ-CA-04** [P2] Are company-specific extension accounts mapped to canonical names?
  - Inference path: concepts.md §Extension Account Handling → normalization strategy → conciseness_rules.md §Taxonomy Redundancy
  - Verification criteria: PASS if extension accounts have canonical mapping. FAIL if extension accounts are standalone without mapping

- **CQ-CA-05** [P2] Can the ontology distinguish between standard taxonomy accounts and extension accounts?
  - Inference path: concepts.md §Extension Account Handling → original preservation → structure_spec.md §Semantic Identifier Preservation
  - Verification criteria: PASS if metadata distinguishes standard from extension. FAIL if indistinguishable

- **CQ-CA-06** [P3] Is the normal balance direction (debit/credit) correctly assigned for each account?
  - Inference path: concepts.md §Account Classification Principles → Normal Balance column → logic_rules.md §Accounting Identities
  - Verification criteria: PASS if every account has correct normal balance. FAIL if normal balance missing or incorrect

---

## 3. Accounting Identity (CQ-AI)

Verifies that mathematical constraints hold across the financial data.

- **CQ-AI-01** [P1] Does Assets = Liabilities + Equity hold for every entity-period in the ontology?
  - Inference path: logic_rules.md §Accounting Identities → EQ01 → Error severity → At input verification
  - Verification criteria: PASS if identity holds for all entity-period pairs. FAIL if any violation (tolerance: ±1 unit for rounding)

- **CQ-AI-02** [P1] Does Opening cash + Operating CF + Investing CF + Financing CF = Closing cash hold?
  - Inference path: logic_rules.md §Accounting Identities → EQ03 → Error severity → At input verification
  - Verification criteria: PASS if cash reconciliation holds. FAIL if any violation beyond rounding tolerance

- **CQ-AI-03** [P1] Does Gross profit = Revenue - COGS hold for general industry entities?
  - Inference path: logic_rules.md §Relation Rules → RE01 → arithmetic relationship in IS
  - Verification criteria: PASS if arithmetic holds. FAIL if gross profit ≠ revenue - COGS

- **CQ-AI-04** [P2] Does Opening equity + Net income + OCI ± Capital transactions = Closing equity hold?
  - Inference path: logic_rules.md §Accounting Identities → EQ02 → Warning severity (note data may be needed)
  - Verification criteria: PASS if equity reconciliation holds within tolerance. FAIL if significant unexplained gap

- **CQ-AI-05** [P2] Are derived metrics calculated consistently using the documented formulas?
  - Inference path: logic_rules.md §Derived Metric Calculation Rules → ROE, debt ratio, EPS formulas
  - Verification criteria: PASS if computed values match documented formulas. FAIL if inconsistent calculation

---

## 4. Temporal/Period (CQ-TP)

Verifies that temporal attribution is correct and consistent.

- **CQ-TP-01** [P1] Are all BS items attributed with instant (point-in-time) and all IS/CF items with duration (period)?
  - Inference path: logic_rules.md §Period Rules → PR01, PR02 → concepts.md §Account Classification Principles → Temporal Attribute
  - Verification criteria: PASS if temporal attributes match element type. FAIL if BS items have duration or IS items have instant

- **CQ-TP-02** [P1] Does the ontology prevent comparison of items with mismatched durations (quarterly vs annual)?
  - Inference path: logic_rules.md §Period Rules → PR03 → prevents quarterly vs annual comparison
  - Verification criteria: PASS if period matching enforced. FAIL if quarterly and annual directly compared

- **CQ-TP-03** [P2] Can the ontology distinguish cumulative year-to-date figures from single-quarter figures?
  - Inference path: domain_scope.md §Key Sub-Areas → Period/Point-in-Time → cumulative vs single-quarter
  - Verification criteria: PASS if YTD vs single-quarter metadata captured. FAIL if indistinguishable

- **CQ-TP-04** [P2] Are restated figures version-tracked with final version determinable?
  - Inference path: extension_cases.md §Restatement Processing → version management → dependency_rules.md §Referential Integrity
  - Verification criteria: PASS if multiple versions tracked and final version identifiable. FAIL if restatements overwrite without version history

- **CQ-TP-05** [P3] Can the ontology support fiscal year-end dates other than December 31?
  - Inference path: domain_scope.md §Classification Axes → Reporting frequency → structure_spec.md §Period node
  - Verification criteria: PASS if arbitrary fiscal year-end dates supported. FAIL if hardcoded to calendar year

---

## 5. Consolidated/Separate (CQ-CS)

Verifies that consolidated and separate reporting are correctly handled.

- **CQ-CS-01** [P1] Can the ontology distinguish between consolidated and separate financial statements for the same entity?
  - Inference path: domain_scope.md §Classification Axes → Reporting unit → structure_spec.md §Required Node Types → Statement
  - Verification criteria: PASS if consolidated/separate metadata captured. FAIL if indistinguishable

- **CQ-CS-02** [P1] Are segment-level figures (revenue, operating income) retrievable and reconcilable to consolidated totals?
  - Inference path: structure_spec.md §Segment Relationships → IN_SEGMENT → concepts.md §Segment Dimension
  - Verification criteria: PASS if segment figures exist and segment total + unallocated ≈ consolidated total. FAIL if segments missing or irreconcilable

- **CQ-CS-03** [P2] Does the ontology enforce Consolidated total assets ≥ Separate total assets (general expectation)?
  - Inference path: logic_rules.md §Constraint Conflict Checking → CF01 → warning level
  - Verification criteria: PASS if warning raised on violation. FAIL if violation undetected

- **CQ-CS-04** [P2] Are intercompany transactions identifiable for consolidation adjustment analysis?
  - Inference path: domain_scope.md §Key Sub-Areas → Consolidation Scope → intercompany elimination
  - Verification criteria: PASS if intercompany items tagged. FAIL if elimination items not distinguishable

- **CQ-CS-05** [P3] Are associate and joint venture entities correctly classified (equity method vs full consolidation)?
  - Inference path: domain_scope.md §Key Sub-Areas → Associate and Joint Venture → concepts.md
  - Verification criteria: PASS if classification metadata captured. FAIL if no distinction between subsidiary and associate

---

## 6. Notes and Disclosure (CQ-ND)

Verifies that notes are structurally linked and queryable.

- **CQ-ND-01** [P1] Are notes linked to the main statement items they explain?
  - Inference path: structure_spec.md §Note Relationships → ANNOTATES → dependency_rules.md §Direction Rules → DR05
  - Verification criteria: PASS if ANNOTATES relationships exist from notes to facts. FAIL if notes are standalone without links

- **CQ-ND-02** [P1] Are accounting policy disclosures retrievable per policy area?
  - Inference path: structure_spec.md §Note Relationships → DISCLOSES_POLICY → concepts.md §Accounting Policy Differences
  - Verification criteria: PASS if policies retrievable by category (inventory, depreciation, etc.). FAIL if policies are unstructured text only

- **CQ-ND-03** [P2] Are contingent liabilities and off-balance-sheet items queryable?
  - Inference path: domain_scope.md §Key Sub-Areas → Notes → Contingent Liabilities
  - Verification criteria: PASS if contingent liabilities retrievable with associated risk information. FAIL if not represented

- **CQ-ND-04** [P2] Are related party transaction disclosures queryable?
  - Inference path: domain_scope.md §Key Sub-Areas → Notes → Note Structure
  - Verification criteria: PASS if related party transactions identifiable with parties and amounts. FAIL if not represented

- **CQ-ND-05** [P3] Are notes from unstructured sources (PDF) linked with appropriate confidence levels?
  - Inference path: dependency_rules.md §Referential Integrity → RI03 → temporary IDs → dependency_rules.md §Source of Truth Transition Rules
  - Verification criteria: PASS if source quality metadata captured. FAIL if all notes treated as equally reliable

---

## 7. Accounting Standards (CQ-AS)

Verifies that key IFRS standard requirements are reflected.

- **CQ-AS-01** [P1] Can the ontology distinguish over-time from point-in-time revenue recognition (IFRS 15)?
  - Inference path: logic_rules.md §Revenue Recognition Rules → RR01 → concepts.md §IFRS 15 Revenue Recognition Terms
  - Verification criteria: PASS if revenue recognition method metadata captured. FAIL if recognition timing indistinguishable

- **CQ-AS-02** [P1] Can the ontology classify financial assets into amortised cost/FVOCI/FVPL (IFRS 9)?
  - Inference path: logic_rules.md §Financial Instrument Classification Rules → FI01 → concepts.md §IFRS 9 Financial Instrument Terms
  - Verification criteria: PASS if classification metadata captured per financial asset. FAIL if classification absent

- **CQ-AS-03** [P2] Are right-of-use assets and lease liabilities recognized for leases (IFRS 16)?
  - Inference path: concepts.md §IFRS 16 Lease Terms → right-of-use asset, lease liability
  - Verification criteria: PASS if ROU assets and lease liabilities represented. FAIL if leases treated as off-balance-sheet

- **CQ-AS-04** [P2] Is the ECL impairment stage (Stage 1/2/3) tracked for financial instruments?
  - Inference path: logic_rules.md §Financial Instrument Classification Rules → FI02 → concepts.md §IFRS 9 → ECL 3-stage model
  - Verification criteria: PASS if impairment stage metadata captured. FAIL if ECL stages not distinguished

- **CQ-AS-05** [P2] Can the ontology represent fair value hierarchy levels (Level 1/2/3) per instrument?
  - Inference path: concepts.md §Fair Value and Measurement Terms → fair value hierarchy → IFRS 13
  - Verification criteria: PASS if fair value level metadata captured. FAIL if hierarchy information absent

- **CQ-AS-06** [P3] Are goodwill and business combination details (IFRS 3) represented for entities with acquisitions?
  - Inference path: domain_scope.md §Key Sub-Areas → Business Combinations → concepts.md §External Standard Mappings → Goodwill
  - Verification criteria: PASS if goodwill, PPA, and contingent consideration queryable. FAIL if acquisition details absent

---

## 8. Derived Metrics (CQ-DM)

Verifies that analytical metrics are correctly computed and queryable.

- **CQ-DM-01** [P1] Can ROE be computed (Net income / Average equity) with correct temporal handling?
  - Inference path: logic_rules.md §Derived Metric Calculation Rules → ROE → concepts.md §Derived Metric Terms
  - Verification criteria: PASS if ROE computed using average equity (opening+closing)/2. FAIL if using single-point equity or wrong formula

- **CQ-DM-02** [P1] Can the debt ratio be computed (Total liabilities / Total equity) with same-point-in-time data?
  - Inference path: logic_rules.md §Derived Metric Calculation Rules → Debt ratio → same point-in-time required
  - Verification criteria: PASS if both values from same date. FAIL if mismatched dates

- **CQ-DM-03** [P1] Can EPS be computed with weighted average shares (from notes)?
  - Inference path: logic_rules.md §Derived Metric Calculation Rules → EPS → share count from notes
  - Verification criteria: PASS if weighted average shares available from notes. FAIL if share data missing or using period-end shares

- **CQ-DM-04** [P2] Can operating profit margin be computed with consistent operating income definition?
  - Inference path: concepts.md §Homonyms → OperatingIncome definition varies → logic_rules.md §Derived Metric Calculation Rules
  - Verification criteria: PASS if operating income definition documented and consistently applied. FAIL if definition inconsistent across entities

- **CQ-DM-05** [P2] Can liquidity ratios (current ratio, quick ratio) be computed?
  - Inference path: concepts.md §Derived Metric Terms → Current ratio, Quick ratio → logic_rules.md §Derived Metric Calculation Rules
  - Verification criteria: PASS if current/non-current assets and inventory separately retrievable. FAIL if classification granularity insufficient

- **CQ-DM-06** [P2] Can EBITDA be computed with documented adjustments?
  - Inference path: concepts.md §Core Synonym Mappings → EBITDA not in IFRS → T3 non-GAAP
  - Verification criteria: PASS if EBITDA computation documented and D&A retrievable. FAIL if EBITDA presented without traceable computation

- **CQ-DM-07** [P3] Can DuPont decomposition (ROE = margin × turnover × leverage) be performed?
  - Inference path: concepts.md §Derived Metric Terms → ROE DuPont decomposition
  - Verification criteria: PASS if all three components computable. FAIL if any component unavailable

---

## 9. Regulatory and Compliance (CQ-RC)

- **CQ-RC-01** [P1] Is the audit opinion type captured for each financial statement set?
  - Inference path: domain_scope.md §Key Sub-Areas → Audit Opinion → unqualified/qualified/adverse/disclaimer
  - Verification criteria: PASS if audit opinion metadata captured. FAIL if audit status unknown

- **CQ-RC-02** [P2] Can the ontology distinguish between audited (annual) and reviewed (quarterly) financial statements?
  - Inference path: domain_scope.md §Cross-Cutting Concerns → Source Trustworthiness → audit status
  - Verification criteria: PASS if assurance level metadata captured. FAIL if all periods treated equally

- **CQ-RC-03** [P2] Are IFRS standard references linked to relevant disclosures?
  - Inference path: domain_scope.md §Reference Standards → IFRS Taxonomy → structure_spec.md §Semantic Identifier Preservation
  - Verification criteria: PASS if taxonomy element IDs preserved with standard references. FAIL if standard linkage lost

---

## 10. Inter-Entity Comparison (CQ-IE) — Cross-cutting

- **CQ-IE-01** [P1] Can the same financial metric be compared across two entities in the same industry?
  - Inference path: concepts.md §Extension Account Handling → normalization → logic_rules.md §Period Rules → PR03
  - Verification criteria: PASS if normalized concepts enable comparison. FAIL if extension accounts prevent comparison

- **CQ-IE-02** [P2] Can segment-level revenue of one entity be compared with total revenue of another?
  - Inference path: concepts.md §Segment Dimension → segment labels are company-specific → normalization required
  - Verification criteria: PASS if segment-to-total comparison possible with metadata. FAIL if segment data inaccessible

- **CQ-IE-03** [P2] When comparing entities with different accounting policies, is the policy difference flagged?
  - Inference path: concepts.md §Accounting Policy Differences → policy disclosure → concepts.md §Interpretation Principles → #3
  - Verification criteria: PASS if policy differences surfaced alongside comparison. FAIL if comparison proceeds without policy context

- **CQ-IE-04** [P3] Can cross-country entities be compared with IFRS↔US-GAAP mapping?
  - Inference path: extension_cases.md §Multi-Country Expansion → taxonomy mapping → concepts.md §External Standard Mappings
  - Verification criteria: PASS if cross-standard mapping exists. FAIL if entities from different standards cannot be compared

---

## 11. Time Series (CQ-TS) — Cross-cutting

- **CQ-TS-01** [P1] Can the 3-year trend of a metric (e.g., revenue) be retrieved for a given entity?
  - Inference path: domain_scope.md §Key Sub-Areas → Derived Metrics → logic_rules.md §Period Rules → PR03
  - Verification criteria: PASS if same-duration periods retrievable for 3+ years. FAIL if insufficient historical data

- **CQ-TS-02** [P2] Can pre-restatement and post-restatement figures be compared for the same period?
  - Inference path: extension_cases.md §Restatement Processing → version management → CQ-TP-04
  - Verification criteria: PASS if both versions retrievable with version metadata. FAIL if restatement overwrites

- **CQ-TS-03** [P2] Can YoY growth rate be computed for derived metrics (e.g., ROE growth)?
  - Inference path: logic_rules.md §Derived Metric Calculation Rules → concepts.md §Derived Metric Terms
  - Verification criteria: PASS if prior period values available for computation. FAIL if historical derived metrics unavailable

---

## 12. Data Quality (CQ-DQ) — Cross-cutting

- **CQ-DQ-01** [P1] Are identity violations (BS equation, CF reconciliation) automatically detected?
  - Inference path: logic_rules.md §Accounting Identities → EQ01, EQ03 → Error severity → At input
  - Verification criteria: PASS if violations blocked or flagged at input. FAIL if violations pass silently

- **CQ-DQ-02** [P1] Are isolated nodes (entities with no facts, concepts with no usage) detected?
  - Inference path: structure_spec.md §Isolated Node Prohibition → every node requires ≥1 relationship
  - Verification criteria: PASS if isolated nodes flagged. FAIL if orphan nodes accumulate undetected

- **CQ-DQ-03** [P2] Is source provenance tracked (XBRL vs HTML vs PDF)?
  - Inference path: dependency_rules.md §Source of Truth Transition Rules → priority 1/2/3 by source type
  - Verification criteria: PASS if source type metadata captured per fact. FAIL if source indistinguishable

- **CQ-DQ-04** [P2] Are referential integrity violations (broken concept references) detected?
  - Inference path: dependency_rules.md §Referential Integrity → RI01, RI02 → Block severity
  - Verification criteria: PASS if broken references blocked. FAIL if orphan references persist

---

## Coverage Verification

| Area | CQ Count | P1 | P2 | P3 |
|---|---|---|---|---|
| Financial Statement Structure (CQ-FS) | 5 | 3 | 2 | 0 |
| Chart of Accounts (CQ-CA) | 6 | 3 | 2 | 1 |
| Accounting Identity (CQ-AI) | 5 | 3 | 2 | 0 |
| Temporal/Period (CQ-TP) | 5 | 2 | 2 | 1 |
| Consolidated/Separate (CQ-CS) | 5 | 2 | 2 | 1 |
| Notes/Disclosure (CQ-ND) | 5 | 2 | 2 | 1 |
| Accounting Standards (CQ-AS) | 6 | 2 | 3 | 1 |
| Derived Metrics (CQ-DM) | 7 | 3 | 3 | 1 |
| Regulatory (CQ-RC) | 3 | 1 | 2 | 0 |
| Inter-Entity (CQ-IE) | 4 | 1 | 2 | 1 |
| Time Series (CQ-TS) | 3 | 1 | 2 | 0 |
| Data Quality (CQ-DQ) | 4 | 2 | 2 | 0 |
| **Total** | **58** | **25** | **26** | **7** |

## Related Documents

- domain_scope.md — Sub-area to CQ section mapping, bias detection criteria
- logic_rules.md — Accounting identities, derived metric formulas, IFRS rules
- structure_spec.md — Node types, relationships, financial statement completeness
- dependency_rules.md — Source of truth, referential integrity, direction rules
- concepts.md — Synonym mappings, interpretation principles, IFRS term definitions
- extension_cases.md — Extension scenarios for advanced questions
- conciseness_rules.md — Allowed/prohibited redundancy patterns
