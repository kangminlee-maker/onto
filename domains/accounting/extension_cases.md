# Accounting Domain — Extension Scenarios

The onto_evolution agent simulates each scenario to verify whether the existing accounting system breaks.

## Case 1: Adding a New Revenue Source

- A previously non-existent type of revenue occurs (subscription model, licensing, bundled sales, etc.)
- Verification: Can the 5-step model of IFRS 15 be applied to the new revenue source?
- Verification: Are Performance Obligations (이행의무) properly identified and Transaction Prices (거래가격) allocated?
- Verification: Can the existing chart of accounts accommodate the new revenue type, or is account addition needed?
- Affected files: logic_rules.md (recognition logic), structure_spec.md (chart of accounts)

## Case 2: K-IFRS Standard Amendment

- A major amendment to an applicable standard (e.g., revenue recognition criteria change, lease classification change)
- Verification: Does the accounting policy change require retrospective restatement of prior period financial statements?
- Verification: Is the impact of the change adequately disclosed in financial statement notes?
- Verification: Do Tax Adjustment (세무조정) items change as a result?
- Affected files: dependency_rules.md (inter-standard dependencies, period dependencies)

## Case 3: Subsidiary Acquisition/Disposal

- Consolidation scope changes (new acquisition, share disposal, loss of control)
- Verification: Are control determination criteria applied to correctly determine the consolidation scope?
- Verification: Does the intercompany transaction elimination scope respond to the change?
- Verification: Is Non-controlling Interest (비지배지분) calculation correctly adjusted?
- Verification: Are Goodwill (영업권) recognition and subsequent impairment reviews performed?
- Affected files: logic_rules.md (consolidation logic), dependency_rules.md (referential integrity)

## Case 4: Increase in Foreign Currency Transactions

- Increase in transactions with overseas counterparties, establishment of overseas subsidiaries
- Verification: Are initial recognition exchange rates and closing date exchange rates applied separately for foreign currency transactions?
- Verification: Are translation differences classified in the appropriate item (profit or loss vs. Other Comprehensive Income (기타포괄손익))?
- Verification: Are exchange rate effects separately presented on the Statement of Cash Flows (현금흐름표)?
- Affected files: structure_spec.md (financial statement structure), logic_rules.md (measurement logic)

## Case 5: Tax Law Amendment

- Corporate tax rate changes, tax adjustment item changes, new tax credit introduction
- Verification: Are Deferred Tax (이연법인세) assets/liabilities recalculated at the new tax rate?
- Verification: Is the Temporary Difference (일시적차이)/Permanent Difference (영구적차이) classification of tax adjustment items updated?
- Verification: Is the tax law change impact disclosed in notes?
- Affected files: logic_rules.md (tax-accounting difference logic), dependency_rules.md (external dependency management)

## Case 6: Audit Standards Change

- ISA amendments, strengthened internal control requirements, new audit report format introduction
- Verification: Does the audit trail meet the strengthened requirements?
- Verification: Is internal control documentation updated to the new standards?
- Verification: Are Key Audit Matters (KAM) identification and reporting procedures updated?
- Affected files: structure_spec.md (verification structure), competency_qs.md (Q20~Q22)

## Case 7: Digital Reporting Transition

- XBRL tagging expansion, real-time reporting requirements, electronic disclosure format changes
- Verification: Does the chart of accounts map to the XBRL taxonomy?
- Verification: Is referential integrity between financial statement items and XBRL tags maintained?
- Verification: When reporting frequency is shortened, does period attribution verification respond to the increased frequency?
- Affected files: structure_spec.md (chart of accounts), dependency_rules.md (referential integrity)

## Related Documents
- structure_spec.md — financial statement structure, chart of accounts
- dependency_rules.md — inter-financial-statement linkage, inter-standard dependencies
- logic_rules.md — recognition/measurement/consolidation/tax logic
