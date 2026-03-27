# Finance Domain — Extension Scenarios

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Change type | Node addition / Relationship addition / Rule change / Source change | Impact on the ontology |
| Impact scope | Local (single node) / Broad (multiple rules) | Change propagation scope |
| Difficulty | Low / Medium / High | Implementation complexity |

## Scenario 1: Adding a New Company

- **Situation:** Adding a previously absent company's financial statements to the ontology
- **Change type:** Node addition
- **Impact scope:** Local
- **Difficulty:** Low
- **Required work:**
  1. Create Entity node (company code, industry classification)
  2. Create corresponding FinancialFact, Period, and Note nodes
  3. Perform normalization mapping for company-specific extension accounts
  4. Verify referential integrity (RI01, RI02)
- **Caution:** Financial industry companies require separate configuration due to different financial statement structures. Extension account ratios are high, making inter-entity comparison impossible without normalization mapping.

## Scenario 2: Adding Quarterly Reports

- **Situation:** Adding quarterly reports for a company that previously had only annual reports
- **Change type:** Node addition
- **Impact scope:** Local
- **Difficulty:** Low
- **Required work:**
  1. Create quarterly Period nodes (Q1, Q2, Q3 with respective start and end dates)
  2. Create quarterly FinancialFact nodes
  3. Apply period rule (PR03) — prevent direct comparison between quarterly and annual figures
  4. Note the distinction between cumulative period vs. single quarter
- **Caution:** Quarterly reports undergo review rather than audit, so the reliability level differs

## Scenario 3: Taxonomy Change

- **Situation:** IFRS taxonomy version update
- **Change type:** Rule change
- **Impact scope:** Broad
- **Difficulty:** High
- **Required work:**
  1. Identify changed Concept nodes (additions/deletions/renames)
  2. Re-verify referential integrity (RI01) of HAS_CONCEPT relationships
  3. Update synonym mappings (concepts.md)
  4. Update existing FinancialFact Concept references or maintain parallel versions
- **Caution:** Taxonomy changes affect only the Concept hierarchy; instances (FinancialFacts) are managed independently. Maintain a cross-version correspondence table in the mapping layer to ensure the stability of historical data.

## Scenario 4: Non-Financial Data Integration

- **Situation:** Adding non-financial information such as ESG data and workforce statistics to the ontology
- **Change type:** Node addition + Relationship addition
- **Impact scope:** Broad
- **Difficulty:** Medium
- **Required work:**
  1. Define new node types (e.g., NonFinancialFact)
  2. Define relationships with Entity (REPORTED_BY reuse possible)
  3. Define Period relationships (IN_PERIOD reuse possible)
  4. Confirm no impact on existing accounting identities (EQ01~EQ03)
  5. Define separate logic rules for non-financial data
- **Caution:** Non-financial data is rarely available from structured sources, so source dependencies are typically fixed at semi-structured/unstructured

## Scenario 5: Multi-Country Expansion

- **Situation:** Adding disclosure systems from other countries beyond a single country
- **Change type:** Node addition + Rule change
- **Impact scope:** Broad
- **Difficulty:** High
- **Required work:**
  1. Unify country-specific Entity code systems
  2. Cross-country taxonomy mapping (IFRS <-> US-GAAP <-> others)
  3. Add currency dimension
  4. Reflect differences in disclosure frequency and format
  5. Define Concepts comparable across countries in the unified normalization hierarchy
- **Caution:** Fundamental differences between accounting standards (e.g., LIFO allowance) make simple mapping impossible. The value of XBRL semantic identifiers is maximized in multi-country expansion — since each country's taxonomy follows the XBRL standard, preserving element IDs provides a foundational anchor for cross-country mapping.

## Scenario 6: Restatement Processing

- **Situation:** A previously collected report is superseded by a restatement
- **Change type:** Source change
- **Impact scope:** Local
- **Difficulty:** Medium
- **Required work:**
  1. Detect restatement (multiple instances exist for the same Entity-Period-Statement)
  2. Determine the final version (based on filing number and disclosure date/time)
  3. Deactivate previous version FinancialFacts (version management rather than deletion)
  4. Re-verify referential integrity (RI01, RI02) based on the final version
  5. Preserve previous versions to enable tracking of pre/post-restatement differences in time series queries
- **Caution:** Restatements may be partial — update only changed items and retain the rest from the original. When semi-structured sources are the sole source, restatement detection depends on source change detection.

## Related Documents

- [domain_scope.md](domain_scope.md) — classification axes and area definitions affected by extension scenarios
- [concepts.md](concepts.md) — mapping update targets for new companies and taxonomy changes
- [structure_spec.md](structure_spec.md) — the structural basis for adding new node types and relationships
- [dependency_rules.md](dependency_rules.md) — source transition and referential integrity rules
- [logic_rules.md](logic_rules.md) — confirming existing identity impact when adding non-financial data
- [competency_qs.md](competency_qs.md) — advanced query cases addressed by extension scenarios
