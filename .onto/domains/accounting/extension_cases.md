---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Accounting Domain — Extension Scenarios

Classification axis: **Change trigger** — cases classified by the type of change that triggers accounting system evolution. Cases cover growth triggers (Cases 1–8) and shrinkage/simplification triggers (Cases 9–10).

---

## Case 1: Adding a New Revenue Source

### Situation

A previously non-existent type of revenue occurs (subscription model, licensing, bundled sales, usage-based billing).

### Case Study: SaaS Subscription Transition

A software company shifted from perpetual licenses (recognized at delivery) to SaaS subscriptions (over-time recognition). Each subscription has multiple performance obligations: software access (over-time), implementation services (point-in-time on delivery), customer support (over-time over subscription period). Revenue recognition required IFRS 15 allocation at standalone selling price.

### Impact Analysis

| Principle | Impact |
|---|---|
| Performance obligation identification | New types must be identified and documented |
| Over-time vs point-in-time determination | New arrangements may require different pattern |
| Transaction price allocation | Multi-element contracts require allocation |
| Chart of accounts | New revenue account may be needed |
| System support | ERP must handle over-time revenue and contract liabilities |

### Verification Checklist

- [ ] Can 5-step IFRS 15 model be applied to new revenue source? → logic_rules.md §Recognition Logic
- [ ] Are Performance Obligations properly identified? → concepts.md §Revenue Recognition Terms
- [ ] Can chart of accounts accommodate new revenue type? → structure_spec.md §Chart of Accounts
- [ ] Does ERP system handle over-time recognition? → domain_scope.md §Key Sub-Areas
- [ ] Are contract assets/liabilities distinguishable from trade receivables/payables? → concepts.md §Revenue Recognition Terms

### Affected Files

| File | Impact | Section |
|---|---|---|
| concepts.md | Verify | §Revenue Recognition Terms |
| logic_rules.md | Verify | §Recognition Logic (Revenue) |
| structure_spec.md | Modify | §Chart of Accounts |
| dependency_rules.md | Verify | §Inter-Account Dependencies |

---

## Case 2: K-IFRS Standard Amendment

### Situation

A major amendment to an applicable standard changing recognition, measurement, or disclosure requirements.

### Case Study: IFRS 16 Leases Adoption (2019)

Operating leases moved from off-balance-sheet to on-balance-sheet. Companies must choose transition method:
- Full retrospective (prior periods restated)
- Modified retrospective (cumulative effect at transition date, no prior period restatement)

Impact: total assets and liabilities increase materially (10-30% for asset-heavy companies). Leverage ratios fundamentally altered.

### Impact Analysis

| Principle | Impact |
|---|---|
| Accounting policy change | Retrospective or modified retrospective |
| Prior period restatement | Comparative statements may be restated |
| Ratio recalculation | Leverage, ROA, interest coverage all affected |
| Disclosure transition year | Additional disclosures in first year of application |
| Tax effect | Tax adjustment items change (tax often uses prior treatment) |

### Verification Checklist

- [ ] Is transition method chosen and documented? → dependency_rules.md §Period Dependencies → IAS 8
- [ ] Are prior period comparatives restated (if full retrospective)? → logic_rules.md §Period Attribution Logic
- [ ] Is transition impact disclosed in notes? → domain_scope.md §Key Sub-Areas → Disclosure
- [ ] Do tax adjustments reflect new treatment? → logic_rules.md §Tax-Accounting Difference Logic
- [ ] Are affected ratios recalculated and disclosed? → dependency_rules.md §Inter-Financial-Statement Linkage

### Affected Files

| File | Impact | Section |
|---|---|---|
| concepts.md | Modify | relevant IFRS section, §Accounting Policy Choices |
| logic_rules.md | Modify | relevant rules, §Constraint Conflict Checking |
| dependency_rules.md | Verify | §Period Dependencies, §External Dependency Management |

---

## Case 3: Subsidiary Acquisition/Disposal

### Situation

Consolidation scope changes: new acquisition, share disposal, loss of control, gaining control.

### Case Study: Control Assessment Change

A company owned 45% of an associate (equity method). Board composition change gave the investor majority board seats, passing the power test. All three IFRS 10 tests (power + variable returns + link) now met → reclassification from associate to subsidiary → full consolidation required from date of control.

### Impact Analysis

| Principle | Impact |
|---|---|
| Control determination | 3-element test applied (IFRS 10) |
| Consolidation scope change | Subsidiary added or removed |
| Intercompany elimination | New intercompany transactions to eliminate |
| NCI calculation | NCI share of subsidiary's net assets and income |
| Goodwill | PPA required for acquisition; goodwill = acquisition cost - fair value of net assets |
| Retrospective vs prospective | Generally prospective from acquisition/disposal date |

### Verification Checklist

- [ ] Are control determination criteria applied (3 elements)? → logic_rules.md §Consolidation Logic
- [ ] Is consolidation scope updated? → structure_spec.md §Required Relationships
- [ ] Are intercompany transactions identified and eliminated? → logic_rules.md §Consolidation Logic
- [ ] Is NCI calculated correctly? → concepts.md §Consolidation Terms
- [ ] Is goodwill recognition documented per IFRS 3? → logic_rules.md §Consolidation Logic
- [ ] For disposal: is loss of control recognition appropriate? → concepts.md §Consolidation Terms

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Verify | §Consolidation Logic |
| dependency_rules.md | Verify | §Referential Integrity |
| structure_spec.md | Verify | §Required Relationships |

---

## Case 4: Foreign Currency Transaction Increase

### Situation

Increase in transactions with overseas counterparties, establishment of overseas subsidiaries with different functional currency.

### Case Study: Overseas Subsidiary Establishment

Korean parent establishes US subsidiary with USD as functional currency. Consolidation requires:
- Subsidiary's assets/liabilities translated at closing rate
- Subsidiary's income/expenses translated at average rate (or transaction-date rate)
- Translation differences recognized in OCI (Foreign Currency Translation Reserve)
- On disposal, accumulated translation differences reclassified to P&L

### Impact Analysis

| Principle | Impact |
|---|---|
| Functional currency determination | Primary economic environment of operations |
| Initial recognition rate | Transaction date rate |
| Period-end translation | Monetary items at closing rate; non-monetary at historical |
| Translation differences | P&L for monetary; OCI for consolidated foreign operations |
| Exchange rate disclosure | Basis for applicable rates disclosed |

### Verification Checklist

- [ ] Are initial recognition and period-end rates applied separately? → logic_rules.md §Measurement Logic, §Period Attribution Logic
- [ ] Are translation differences classified correctly (P&L vs OCI)? → dependency_rules.md §Inter-Financial-Statement Linkage (OCI)
- [ ] Are exchange rate effects separately presented on CF? → structure_spec.md §Financial Statement Structure → CF
- [ ] Is functional currency determination documented? → concepts.md §Accounting Policy Choices
- [ ] For consolidated foreign operation, is translation reserve tracked? → logic_rules.md §Consolidation Logic

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Verify | §Financial Statement Structure |
| logic_rules.md | Verify | §Measurement Logic, §Consolidation Logic |
| dependency_rules.md | Modify | §External Dependency Management |

---

## Case 5: Tax Law Amendment

### Situation

Corporate tax rate change, tax adjustment item change, new tax credit introduction, transfer pricing rule change.

### Case Study: Corporate Tax Rate Reduction

Korea reduces Corporate Tax rate from 25% to 22%. All Deferred Tax assets and liabilities must be remeasured at new rate. Impact:
- DTL reduction → Deferred Tax benefit in current period P&L
- DTA reduction → Deferred Tax expense in current period P&L
- Net impact depends on entity's DT balance composition
- Disclosure: change impact on effective tax rate

### Impact Analysis

| Principle | Impact |
|---|---|
| Deferred Tax recalculation | All DT at new rate |
| Current period P&L | Net impact of remeasurement in current period |
| Effective tax rate | Shifts toward new statutory rate |
| Prior period | Unchanged (rate change applies prospectively) |
| Disclosure | IAS 12 requires disclosure of tax rate change impact |

### Verification Checklist

- [ ] Are DT assets/liabilities recalculated at new rate? → logic_rules.md §Tax-Accounting Difference Logic
- [ ] Is remeasurement impact in current period P&L? → concepts.md §Tax Accounting Terms
- [ ] Are temporary vs permanent differences classifications reviewed? → concepts.md §Tax Accounting Terms
- [ ] Is tax law change disclosed? → domain_scope.md §Key Sub-Areas → Disclosure
- [ ] Is effective tax rate reconciliation updated? → competency_qs.md CQ-TX-05

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §Tax-Accounting Difference Logic |
| dependency_rules.md | Modify | §External Dependency Management |
| concepts.md | Verify | §Tax Accounting Terms |

---

## Case 6: Audit Standards Change

### Situation

ISA amendments, strengthened internal control requirements (SOX-like), new audit report format.

### Case Study: Key Audit Matters Introduction (ISA 701, 2016)

Listed company audit reports must include Key Audit Matters (KAM) section. Auditor identifies matters of most significance in current period audit:
- Areas of higher assessed risk
- Areas involving significant management judgment
- Significant transactions in the period

### Impact Analysis

| Principle | Impact |
|---|---|
| Audit procedures | KAM identification formalized |
| Audit report | New KAM section |
| Entity response | Management prepares for enhanced audit scrutiny |
| Internal controls | Enhanced documentation may be needed |
| Disclosure | Entity notes align with KAM areas |

### Verification Checklist

- [ ] Does audit trail meet strengthened requirements? → domain_scope.md §Cross-Cutting Concerns → Audit Trail
- [ ] Is internal control documentation updated? → concepts.md §Audit and Internal Control Terms
- [ ] Are KAM identification procedures established? → concepts.md §Audit and Internal Control Terms → KAM
- [ ] Are management estimates more robustly documented? → logic_rules.md §Measurement Logic
- [ ] Are disclosures aligned with KAM topics? → domain_scope.md §Key Sub-Areas → Disclosure

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Verification Structure |
| concepts.md | Modify | §Audit and Internal Control Terms |
| competency_qs.md | Verify | CQ-AU section |

---

## Case 7: Digital Reporting Transition

### Situation

XBRL tagging expansion, real-time reporting requirements, electronic disclosure format changes.

### Case Study: DART (Korea) Expanded XBRL Tagging

Financial Supervisory Service expands XBRL tagging scope from main statements to notes (block tagging). Companies must:
- Map chart of accounts to DART taxonomy elements
- Tag main statements and note items
- Validate referential integrity between tagged items

### Impact Analysis

| Principle | Impact |
|---|---|
| Taxonomy mapping | Chart of accounts mapped to DART elements |
| Note tagging | Additional tagging burden |
| Referential integrity | Tags in notes must match main statement tags |
| Validation | Filing system validates before acceptance |
| Reporting frequency | More frequent tagging if reporting cycles shortened |

### Verification Checklist

- [ ] Does chart of accounts map to XBRL taxonomy? → structure_spec.md §Chart of Accounts
- [ ] Is referential integrity between financial statement items and XBRL tags maintained? → dependency_rules.md §Referential Integrity
- [ ] When reporting frequency shortens, is period attribution verification scaled? → logic_rules.md §Period Attribution Logic
- [ ] Are extension elements documented when standard taxonomy insufficient? → concepts.md §Accounting Policy Choices
- [ ] Is validation pipeline established? → structure_spec.md §Verification Structure

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Chart of Accounts |
| dependency_rules.md | Verify | §Referential Integrity |
| domain_scope.md | Verify | §Reference Standards/Frameworks |

---

## Case 8: ESG/Sustainability Reporting Integration

### Situation

Adding ESG (Environmental, Social, Governance) reporting requirements alongside financial reporting.

### Case Study: ISSB S1/S2 Adoption

International Sustainability Standards Board (ISSB) releases S1 (General sustainability) and S2 (Climate) requiring disclosures:
- Climate-related risks and opportunities
- Scope 1/2/3 greenhouse gas emissions
- Climate-related financial effects
- Transition plans

Integration with financial reporting: sustainability metrics may flow into impairment assessment, provisions, contingent liabilities.

### Impact Analysis

| Principle | Impact |
|---|---|
| New reporting standards | ISSB alongside IFRS |
| Financial impact | Climate risks may trigger impairment, provisions |
| Disclosure integration | Sustainability and financial disclosures connected |
| Data requirements | Non-financial data (emissions, workforce) alongside financial |
| Audit scope | Assurance on sustainability may be required |

### Verification Checklist

- [ ] Are ISSB standards applicable and adopted? → domain_scope.md §Reference Standards/Frameworks
- [ ] Do climate risks trigger impairment or provisions? → logic_rules.md §Recognition Logic (Asset/Liability)
- [ ] Are sustainability disclosures connected to financial disclosures? → domain_scope.md §Cross-Cutting Concerns
- [ ] Is audit scope extended to sustainability? → concepts.md §Audit and Internal Control Terms

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Key Sub-Areas (new sub-area) |
| concepts.md | Modify | new §Sustainability Terms |
| dependency_rules.md | Verify | §External Dependency Management |

---

## Case 9: Chart of Accounts Simplification

### Situation (Shrinkage)

Reducing chart of accounts to improve reporting clarity and reduce maintenance burden.

### Impact Analysis

| Principle | Impact |
|---|---|
| Account consolidation | Rarely-used accounts merged into parent accounts |
| Subsidiary ledger preservation | Detail may be retained in subsidiary ledgers |
| Historical comparability | Prior period re-classification may be needed |
| System migration | ERP updates required |
| Reporting impact | Simplified statements possible |

### Verification Checklist

- [ ] Are merged accounts documented with migration mapping? → structure_spec.md §Chart of Accounts
- [ ] Is detail preserved in subsidiary ledgers? → concepts.md §Double-Entry Bookkeeping → Subsidiary Ledger
- [ ] Are prior period statements re-classified for comparability? → dependency_rules.md §Period Dependencies
- [ ] Are system changes tested? → structure_spec.md §Verification Structure

---

## Case 10: Interim Reporting Discontinuation

### Situation (Shrinkage)

Private company that went private or de-listed discontinues interim reporting.

### Impact Analysis

| Principle | Impact |
|---|---|
| Reporting frequency | Quarterly → Annual only |
| Internal management reporting | May continue interim for internal use |
| Audit scope | Annual audit remains; quarterly review discontinued |
| Disclosure relief | Fewer mandatory disclosures |
| Data retention | Historical interim data retained but not published |

### Verification Checklist

- [ ] Are regulatory requirements updated for private company status? → domain_scope.md §Reference Standards/Frameworks
- [ ] Is internal reporting structure separated from external? → structure_spec.md §Verification Structure
- [ ] Is audit contract updated? → concepts.md §Audit and Internal Control Terms
- [ ] Are historical interim records retained? → domain_scope.md §Cross-Cutting Concerns → Audit Trail

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (New Revenue Source) | → Case 2 (Standard Amendment) | New revenue patterns may reveal standard interpretation questions |
| Case 2 (Standard Amendment) | → Case 5 (Tax Law) | Accounting change often triggers tax treatment review |
| Case 3 (Consolidation Change) | → Case 4 (Foreign Currency) | International acquisitions create FX exposure |
| Case 4 (Foreign Currency) | → Case 7 (Digital Reporting) | Multi-currency reporting requires XBRL dimensional tagging |
| Case 5 (Tax Law Change) | → Case 2 (Standard Amendment) | Tax change may require accounting policy review |
| Case 6 (Audit Standards) | → Case 8 (ESG) | Enhanced audit often includes sustainability assurance |
| Case 7 (Digital Reporting) | → Case 9 (Chart Simplification) | Taxonomy mapping reveals chart consolidation opportunities |
| Case 8 (ESG) | → Case 6 (Audit Standards) | ESG assurance expands audit scope |
| Case 9 (Chart Simplification) | → Case 1 (New Revenue) | Simplified chart must still accommodate new revenue types |

---

## Related Documents
- domain_scope.md — Classification axes, sub-area definitions affected by scenarios
- concepts.md — Term definitions for scenario impact analysis
- structure_spec.md — Structural basis for new elements
- dependency_rules.md — Inter-statement linkages, referential integrity, external dependencies
- logic_rules.md — Recognition, measurement, consolidation, tax logic
- competency_qs.md — Questions verifying scenario handling
