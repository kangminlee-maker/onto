# Market Intelligence Domain — System Verification Questions

## 1. Purpose

This document is a list of questions for verifying whether the market intelligence analysis system is properly structured.
Each question checks compliance with a specific design principle.

## 2. Data Collection Verification

### Q1. Credibility Rating Consistency

- [ ] List the set of data source credibility rating values declared in the collection policy.
- [ ] List the set of credibility rating values referenced at decision gates.
- [ ] List the set of credibility rating values used in the analysis phase.
- [ ] Do the above sets **exactly match**? If there is a discrepancy, where does it occur?

### Q2. Data Source Classification Completeness

- [ ] Have all active data sources been assigned a credibility rating?
- [ ] Are there cases where data without a credibility rating was fed into analysis?
- [ ] Does a mechanism exist that enforces credibility rating assignment when adding a data source?

### Q3. Collection Frequency Validity

- [ ] Is the collection frequency for each data source appropriate for the data's rate of change?
- [ ] Are data freshness criteria defined, and is there a policy for handling expired data?

## 3. Analysis Verification

### Q4. Analysis Methodology Preconditions

- [ ] Are the preconditions for each analysis methodology used explicitly stated?
- [ ] Are there cases where analysis was performed without its preconditions being met?

### Q5. Segment Classification Criteria

- [ ] Are the classification criteria for market segments explicitly declared?
- [ ] Are the classification criteria mutually exclusive and collectively exhaustive (MECE)?
- [ ] When classification criteria change, can the impact on existing analysis results be traced?

## 4. Strategy Derivation Verification

### Q6. Decision Gate Declaration-Implementation Link

- [ ] What are the pass conditions declared at the decision gate?
- [ ] Does **actual verification logic** (checklists, automation, etc.) exist for each pass condition?
- [ ] Are there any "declaration-implementation gaps" where only the declaration exists without verification logic?
- [ ] Does a mechanism exist that enforces synchronization of verification logic when policy declarations change?

### Q7. Strategy Option Traceability

- [ ] Can each strategy option be traced back to the analysis results from which it was derived?
- [ ] When analysis data is updated, can the affected strategy options be identified?

## 5. Risk Assessment Verification

### Q8. Risk Assessment Independence

- [ ] Can risk assessment be performed **independently** of strategy derivation?
- [ ] Are risk assessment results valid even in the absence of a strategy?
- [ ] Does a path exist through which risk assessment results can trigger strategy modification?
- [ ] Are the risk assessment personnel/processes separated from the strategy derivation personnel/processes?

### Q9. Risk Quantification Consistency

- [ ] Is the risk score formula (impact x likelihood) applied uniformly to all risk factors?
- [ ] Are risk thresholds defined, and are there automatic alert/response triggers when thresholds are exceeded?

## 6. Overall Structural Verification

### Q10. Classification Axis Mixing Prevention

- [ ] Are there cases where an entity type is used as a trait?
- [ ] Are there cases where a trait is used as an entity type?

### Q11. Multi-Domain Coexistence

- [ ] Are there no namespace collisions when used in the same project as other domains?
- [ ] Are all homonyms registered in concepts.md?

## 7. Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and independence principles |
| [concepts.md](concepts.md) | Term definitions and classification axis principles |
| [logic_rules.md](logic_rules.md) | Credibility rating consistency rules |
| [structure_spec.md](structure_spec.md) | Structural requirements |
