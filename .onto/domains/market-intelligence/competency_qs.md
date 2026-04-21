---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — System Verification Questions

A list of core questions for verifying that the market intelligence analysis system is properly structured.

Classification axis: **Market intelligence verification concern** — classified by the concern that must be addressed during system review.

Priority levels:
- **P1** — Must be answerable in any market intelligence system review. Failure indicates a fundamental gap.
- **P2** — Should be answerable for production systems. Failure indicates a quality gap.
- **P3** — Recommended for mature systems. Failure indicates a refinement opportunity.

## CQ ID System

### Prefix Allocation

| Prefix | Concern Area | Aligned Sub-Area |
|--------|-------------|------------------|
| CQ-DC | Data Collection | Data Collection |
| CQ-AN | Analysis | Analysis |
| CQ-SD | Strategy Derivation | Strategy Derivation |
| CQ-RA | Risk Assessment | Risk Assessment |
| CQ-CR | Credibility Propagation (cross-cutting) | Cross-cutting |
| CQ-DI | Declaration-Implementation Link (cross-cutting) | Cross-cutting |
| CQ-MD | Multi-Domain Coexistence (cross-cutting) | Cross-cutting |

---

## 1. Data Collection (CQ-DC)

Verifies that data collection is rigorous, classified, and traceable.

- **CQ-DC-01** [P1] List the set of data source credibility rating values declared in the collection policy. Does it match the set used at decision gates and in analysis?
  - Inference path: logic_rules.md §Data Source Credibility Rating Consistency Rules → ST01-ST03 multi-point matching → concepts.md §Source Classification Terms
  - Verification criteria: PASS if all 3 reference points (collection policy, decision gates, analysis) use the **exact same** set. FAIL if any value missing or extra in any reference point

- **CQ-DC-02** [P1] Have all active data sources been assigned a credibility rating?
  - Inference path: concepts.md §Data Source Credibility Rating → mandatory assignment → logic_rules.md §ST03
  - Verification criteria: PASS if every active source has a rating. FAIL if any unrated source exists

- **CQ-DC-03** [P1] Is data without a credibility rating prohibited from entering analysis?
  - Inference path: logic_rules.md §ST03 → blocking rule
  - Verification criteria: PASS if pipeline blocks unrated data. FAIL if unrated data reaches analysis stage

- **CQ-DC-04** [P2] Is the collection frequency for each source appropriate for the data's rate of change?
  - Inference path: concepts.md §Collection Method Terms → Collection Policy → §Data Quality Terms → Data Freshness
  - Verification criteria: PASS if collection frequency documented per source with rate-of-change basis. FAIL if frequency arbitrary or static across volatile sources

- **CQ-DC-05** [P2] Are data freshness criteria defined per source type, with a policy for handling expired data?
  - Inference path: concepts.md §Data Quality Terms → Data Freshness, TTL → logic_rules.md §Data Freshness Rules
  - Verification criteria: PASS if TTL defined per source with expiration handling rules. FAIL if no expiration policy or single global TTL applied to all data

- **CQ-DC-06** [P2] Does a mechanism enforce credibility rating assignment when adding a new data source?
  - Inference path: extension_cases.md §EXT-01 → adding new source type → enforcement gate
  - Verification criteria: PASS if new source registration requires rating assignment. FAIL if sources can be added without rating

- **CQ-DC-07** [P3] Is data lineage (provenance) traceable from collected data back to its source?
  - Inference path: concepts.md §Data Quality Terms → Data Provenance, Data Lineage
  - Verification criteria: PASS if every data point traceable to source. FAIL if anonymous data appears in analysis

- **CQ-DC-08** [P3] Is anomaly detection in place for collection errors?
  - Inference path: concepts.md §Data Quality Terms → Anomaly Detection
  - Verification criteria: PASS if anomaly detection triggers review. FAIL if collection errors enter analysis silently

---

## 2. Analysis (CQ-AN)

Verifies that analysis methodology is structured, valid, and traceable.

- **CQ-AN-01** [P1] Are analysis methodologies used (Five Forces, SWOT, PESTEL, etc.) explicitly identified per analysis output?
  - Inference path: concepts.md §Methodology Terms → Analysis Methodology Precondition → logic_rules.md §AM01
  - Verification criteria: PASS if every analysis output cites methodology. FAIL if methodology not stated

- **CQ-AN-02** [P1] Are preconditions for each methodology met before application?
  - Inference path: logic_rules.md §AM01-AM02 → preconditions stated and verified
  - Verification criteria: PASS if precondition check documented per use. FAIL if methodology applied without precondition verification

- **CQ-AN-03** [P1] Are customer/market segmentation criteria mutually exclusive and collectively exhaustive (MECE)?
  - Inference path: concepts.md §Customer Analysis Terms → MECE → logic_rules.md §AM01
  - Verification criteria: PASS if every customer/market unit belongs to exactly one segment, segments cover all units. FAIL if overlap or gap in segmentation

- **CQ-AN-04** [P2] Can segment classification changes be traced to their impact on existing analysis results?
  - Inference path: dependency_rules.md §Inter-Area Dependency Structure → analysis depends on collection
  - Verification criteria: PASS if change traceability documented. FAIL if classification changes silently invalidate prior analysis

- **CQ-AN-05** [P2] Is competitive landscape analysis comprehensive (direct competitors + indirect competitors + substitutes + new entrants)?
  - Inference path: concepts.md §Competitive Analysis Terms → Direct/Indirect Competitor → §Methodology Terms → Five Forces
  - Verification criteria: PASS if all 4 competitive dimensions addressed. FAIL if only direct competitors analyzed

- **CQ-AN-06** [P2] Is market sizing structured as TAM/SAM/SOM (not just TAM)?
  - Inference path: concepts.md §Market Sizing Terms → TAM/SAM/SOM hierarchy
  - Verification criteria: PASS if 3-level sizing exists. FAIL if only top-line TAM provided

- **CQ-AN-07** [P3] Are quantitative and qualitative analysis methods balanced (not dominated by one)?
  - Inference path: domain_scope.md §Bias Detection Criteria → methodology imbalance
  - Verification criteria: PASS if both methods documented. FAIL if exclusively quantitative or exclusively qualitative

- **CQ-AN-08** [P3] Is signal-to-noise ratio assessed for trend signals?
  - Inference path: concepts.md §Trend Analysis Terms → Signal-to-Noise Ratio
  - Verification criteria: PASS if S/N assessment documented per trend. FAIL if all observed patterns treated as signals

---

## 3. Strategy Derivation (CQ-SD)

Verifies that strategy derivation has rigor, traceability, and decision controls.

- **CQ-SD-01** [P1] What are the pass conditions declared at the decision gate?
  - Inference path: concepts.md §Decision and Evaluation Terms → Decision Gate, Pass Condition
  - Verification criteria: PASS if pass conditions explicitly listed. FAIL if gate exists without documented conditions

- **CQ-SD-02** [P1] Does actual verification logic (checklists, automation, expert review) exist for each pass condition?
  - Inference path: logic_rules.md §Decision Gate Declaration-Implementation Link Rules → PG01
  - Verification criteria: PASS if each condition has verifiable implementation. FAIL if any condition lacks implementation (declaration-implementation gap)

- **CQ-SD-03** [P1] Are there "declaration-implementation gaps" where only the declaration exists without verification logic?
  - Inference path: logic_rules.md §PG03 → gap detection
  - Verification criteria: PASS if zero gaps exist. FAIL if any gap detected

- **CQ-SD-04** [P1] Does a mechanism enforce synchronization of verification logic when policy declarations change?
  - Inference path: logic_rules.md §PG02 → simultaneous creation requirement
  - Verification criteria: PASS if policy change triggers verification update. FAIL if declarations can change without implementation update

- **CQ-SD-05** [P1] Can each strategy option be traced back to the analysis results from which it was derived?
  - Inference path: dependency_rules.md §Inter-Area Dependency Structure → analysis → strategy derivation → structure_spec.md §Required Relationships → Derives
  - Verification criteria: PASS if every strategy option has analysis source reference. FAIL if any strategy without basis

- **CQ-SD-06** [P2] When analysis data is updated, can affected strategy options be identified?
  - Inference path: dependency_rules.md §Cycle Detection Criteria → impact propagation
  - Verification criteria: PASS if impact analysis tools/process exist. FAIL if updates require manual rediscovery of affected strategies

- **CQ-SD-07** [P2] Are strategy options evaluated using a documented multi-criteria matrix?
  - Inference path: concepts.md §Decision and Evaluation Terms → Decision Criteria, Priority Score → §MCDA
  - Verification criteria: PASS if evaluation matrix documented. FAIL if priority assigned ad-hoc

- **CQ-SD-08** [P3] Is strategy portfolio balanced (core + adjacent + transformational)?
  - Inference path: concepts.md §Strategy Generation Terms → Strategy Portfolio
  - Verification criteria: PASS if portfolio balance assessed. FAIL if only one strategy type considered

- **CQ-SD-09** [P3] Are scenario plans developed for major strategic decisions?
  - Inference path: concepts.md §Scenario and Contingency Terms → Scenario Planning
  - Verification criteria: PASS if scenarios developed for high-impact decisions. FAIL if single-scenario planning

---

## 4. Risk Assessment (CQ-RA)

Verifies that risk assessment is independent, structured, and operationalized.

- **CQ-RA-01** [P1] Can risk assessment be performed independently of strategy derivation?
  - Inference path: domain_scope.md §Independence of Risk Assessment → logic_rules.md §RA03
  - Verification criteria: PASS if risk assessment can produce output without strategy input. FAIL if risk assessment requires strategy as input

- **CQ-RA-02** [P1] Are risk assessment results valid even in the absence of a strategy?
  - Inference path: domain_scope.md §Independence of Risk Assessment
  - Verification criteria: PASS if risk register exists without requiring strategy. FAIL if no strategy = no risk assessment

- **CQ-RA-03** [P1] Does a path exist for risk assessment results to trigger strategy modification?
  - Inference path: dependency_rules.md §Inter-Area Dependency Structure → Risk Assessment → Strategy Derivation modification
  - Verification criteria: PASS if risk findings can modify strategy. FAIL if risk has no veto/modification authority

- **CQ-RA-04** [P1] Are risk assessment personnel/processes separated from strategy derivation personnel/processes?
  - Inference path: domain_scope.md §Independence of Risk Assessment → enforcement mechanism
  - Verification criteria: PASS if separate ownership documented. FAIL if same team owns both

- **CQ-RA-05** [P1] Is the risk score formula (impact × likelihood) applied uniformly to all risk factors?
  - Inference path: logic_rules.md §RA01 → single formula consistency
  - Verification criteria: PASS if all risks scored with same formula. FAIL if formula varies by risk

- **CQ-RA-06** [P2] Are risk thresholds defined, with automatic alerts/triggers when exceeded?
  - Inference path: concepts.md §Risk Response Terms → Risk Threshold → logic_rules.md §RA02
  - Verification criteria: PASS if thresholds defined with alert mechanism. FAIL if thresholds undefined or no alerting

- **CQ-RA-07** [P2] Are risks classified by type (market, operational, strategic, compliance, reputational)?
  - Inference path: concepts.md §Risk Identification Terms → Risk Taxonomy
  - Verification criteria: PASS if risk taxonomy applied. FAIL if all risks treated as one category

- **CQ-RA-08** [P2] Are risk responses defined for all identified risks (avoidance/mitigation/acceptance/transfer)?
  - Inference path: concepts.md §Risk Response Terms → 4 response strategies (ISO 31000)
  - Verification criteria: PASS if every risk has response. FAIL if risks identified without responses

- **CQ-RA-09** [P3] Is risk appetite documented at organizational level?
  - Inference path: concepts.md §Risk Response Terms → Risk Appetite
  - Verification criteria: PASS if risk appetite statement exists. FAIL if no organizational risk tolerance documented

- **CQ-RA-10** [P3] Are stress tests performed for high-impact scenarios?
  - Inference path: concepts.md §Risk Monitoring Terms → Stress Test
  - Verification criteria: PASS if stress test documented. FAIL if extreme scenarios not tested

---

## 5. Credibility Propagation (CQ-CR) — Cross-cutting

- **CQ-CR-01** [P1] Does credibility of analysis results never exceed lowest credibility of input data (weakest link)?
  - Inference path: logic_rules.md §Credibility Propagation Rules → TP01 → concepts.md §Interpretation Principles → Credibility Propagation Principle
  - Verification criteria: PASS if rule enforced systematically. FAIL if analysis can have higher credibility than worst input

- **CQ-CR-02** [P1] Does credibility of strategy options never exceed credibility of supporting analysis?
  - Inference path: logic_rules.md §TP03 → propagation through strategy phase
  - Verification criteria: PASS if strategy credibility ≤ analysis credibility. FAIL if strategy credibility inflated

- **CQ-CR-03** [P2] When combining multiple sources, is the lowest credibility used as the upper bound for combined result?
  - Inference path: logic_rules.md §TP02 → multi-source weakest link
  - Verification criteria: PASS if multi-source results capped at lowest input. FAIL if averaging or maximum used

- **CQ-CR-04** [P2] Is data without credibility rating excluded from the propagation chain?
  - Inference path: dependency_rules.md §Credibility Propagation Rules → TP03
  - Verification criteria: PASS if unrated data blocked. FAIL if unrated data passed through

---

## 6. Declaration-Implementation Link (CQ-DI) — Cross-cutting

- **CQ-DI-01** [P1] Does every declared decision gate condition have implemented verification logic?
  - Inference path: logic_rules.md §PG01 → declaration count = implementation count
  - Verification criteria: PASS if 1:1 mapping exists. FAIL if any condition without implementation

- **CQ-DI-02** [P1] When a new condition is declared, is verification logic created simultaneously?
  - Inference path: logic_rules.md §PG02 → simultaneous creation
  - Verification criteria: PASS if process enforces simultaneous creation. FAIL if conditions can be added before logic

- **CQ-DI-03** [P2] Are existing declaration-implementation gaps tracked and prioritized for resolution?
  - Inference path: logic_rules.md §PG03 → gap = warning
  - Verification criteria: PASS if gap tracking and remediation exists. FAIL if gaps accumulate without resolution plan

---

## 7. Multi-Domain Coexistence (CQ-MD) — Cross-cutting

- **CQ-MD-01** [P2] Are there namespace collisions when used in the same project as other domains?
  - Inference path: domain_scope.md §Multi-Domain Coexistence Principles
  - Verification criteria: PASS if namespace prefixes prevent collision. FAIL if collisions exist

- **CQ-MD-02** [P2] Are all homonyms registered in concepts.md?
  - Inference path: concepts.md §Cross-Domain Homonyms
  - Verification criteria: PASS if all known homonyms documented. FAIL if homonyms undocumented

- **CQ-MD-03** [P3] Are entity types not mixed with traits (classification axis separation)?
  - Inference path: concepts.md §Interpretation Principles → Classification Axis Separation
  - Verification criteria: PASS if axes maintained orthogonally. FAIL if entity type used as trait or vice versa

---

## Coverage Verification

| Area | CQ Count | P1 | P2 | P3 |
|---|---|---|---|---|
| Data Collection (CQ-DC) | 8 | 3 | 3 | 2 |
| Analysis (CQ-AN) | 8 | 3 | 3 | 2 |
| Strategy Derivation (CQ-SD) | 9 | 5 | 2 | 2 |
| Risk Assessment (CQ-RA) | 10 | 5 | 3 | 2 |
| Credibility Propagation (CQ-CR) | 4 | 2 | 2 | 0 |
| Declaration-Implementation Link (CQ-DI) | 3 | 2 | 1 | 0 |
| Multi-Domain Coexistence (CQ-MD) | 3 | 0 | 2 | 1 |
| **Total** | **45** | **20** | **16** | **9** |

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition, normative tier classification, sub-area to CQ mapping |
| [concepts.md](concepts.md) | Term definitions and classification axis principles |
| [logic_rules.md](logic_rules.md) | Credibility, decision gate, risk rules |
| [structure_spec.md](structure_spec.md) | Structural requirements |
| [dependency_rules.md](dependency_rules.md) | Inter-area dependency rules |
| [extension_cases.md](extension_cases.md) | Scenarios for advanced questions |
| [conciseness_rules.md](conciseness_rules.md) | Redundancy patterns |
