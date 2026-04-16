---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Extension Scenarios

Classification axis: **Change trigger** — cases classified by the type of change that triggers system evolution. Cases cover growth triggers (Cases 1–8) and shrinkage/simplification triggers (Cases 9–10).

The evolution agent simulates each scenario to verify whether the existing market intelligence system breaks.

---

## Case 1: Adding a New Data Source Type

### Situation

A new data source type not covered by the existing credibility rating system emerges. Examples: AI-generated reports, social media real-time sentiment data, blockchain on-chain analytics, satellite imagery, IoT sensor data.

### Case Study: AI-Generated Report Integration

A market intelligence team began incorporating AI-generated industry reports (e.g., from large language models analyzing public data). Existing credibility rating system has Primary/Secondary/Tertiary, but AI-generated content fits none cleanly:
- Not Primary (not direct observation)
- Not Secondary (not human-authored intermediary processing)
- Not Tertiary (not summary of secondary)

Team added a new rating "AI-Generated" with credibility downgrade applied. Required updates across collection policy, decision gates, analysis pipeline.

### Impact Analysis

| Principle | Impact |
|---|---|
| Credibility rating set | New value added to allowed set |
| Multi-point matching (ST01-ST02) | Must update at all 3 reference points simultaneously |
| Credibility propagation (TP01) | New rating's relative position determined |
| Pipeline ingestion | New source type recognition |

### Verification Checklist

- [ ] Has new value been added to credibility rating allowed set? → logic_rules.md §2.1
- [ ] Following multi-point matching rule, has it been **simultaneously** updated at collection/policy/analysis? → logic_rules.md §ST01-ST02
- [ ] Are credibility propagation rules defined for the new rating? → dependency_rules.md §4.2
- [ ] Has competency_qs.md CQ-DC-01 been re-executed to verify consistency? → competency_qs.md
- [ ] Is the new value validly handled in all entity types declared as application targets? → structure_spec.md §3.1

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §2 Allowed Set Definition |
| dependency_rules.md | Verify | §Credibility Propagation Rules |
| structure_spec.md | Verify | §Trait Definitions (Source Credibility Rating) |
| concepts.md | Modify | §Source Classification Terms |

---

## Case 2: Adding Decision Gate Conditions

### Situation

New pass conditions added to decision gate due to new regulations, compliance requirements, internal policies, or risk events.

### Case Study: ESG Compliance Gate Addition

After ESG regulations affecting strategic decisions, the team added "ESG impact assessment" as a pass condition for all major strategy options. Required:
- New condition declaration at decision gate
- Implementation of ESG assessment verification logic
- Review of all in-progress strategy options

### Impact Analysis

| Principle | Impact |
|---|---|
| Pass condition count | Increased |
| Verification logic | Must be created simultaneously |
| Existing strategies | May need re-validation |
| Declaration-implementation gap | Must avoid creating new gap |

### Verification Checklist

- [ ] Has new condition been added to decision gate's pass condition list? → structure_spec.md §2.3 Pass Condition
- [ ] Following declaration-implementation link rule, has corresponding verification logic been **immediately** created? → logic_rules.md §PG02
- [ ] Have existing strategy options whose gate status changes been identified? → dependency_rules.md §3 AC02
- [ ] Have existing passed strategies been re-evaluated against new condition? → competency_qs.md CQ-SD-04

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Verify | §3 Decision Gate Declaration-Implementation Link Rules |
| structure_spec.md | Modify | §2.3 Pass Condition entity instances |
| competency_qs.md | Verify | CQ-SD section, CQ-DI section |

---

## Case 3: Risk Assessment Framework Replacement

### Situation

Switching from current framework to a different framework (e.g., from ISO 31000 to COSO ERM, or to NIST RMF for cybersecurity-heavy contexts).

### Case Study: ISO 31000 → NIST CSF Transition

A company expanding into critical infrastructure adopted NIST Cybersecurity Framework alongside ISO 31000. Required:
- Risk score calculation formula reconciliation
- Risk taxonomy mapping
- Risk Independence preservation across both frameworks

### Impact Analysis

| Principle | Impact |
|---|---|
| Risk score formula | May change (e.g., qualitative ratings vs numeric) |
| Risk type taxonomy | Reclassification needed |
| Risk independence | Must be preserved regardless of framework |
| Existing risk register | Migration needed |

### Verification Checklist

- [ ] Is risk score calculation formula updated in logic_rules.md? → logic_rules.md §RA01
- [ ] Have risk level trait allowed values been updated? → structure_spec.md §3 Trait Definitions
- [ ] Is risk assessment **independence** maintained regardless of framework change? → logic_rules.md §RA03, §5.2
- [ ] Have existing risk factor scores been recalculated using new formula? → concepts.md §Risk Quantification Terms
- [ ] Are framework references updated in domain_scope.md? → domain_scope.md §Reference Standards/Frameworks

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §5 Risk Assessment Rules |
| structure_spec.md | Modify | §3 Risk-related traits |
| domain_scope.md | Modify | §Reference Standards |
| concepts.md | Modify | §Risk Identification/Quantification/Response Terms |

---

## Case 4: Multi-Domain Simultaneous Analysis

### Situation

Applying market intelligence domain alongside another domain in a single project (e.g., market intelligence + technology trend analysis + regulatory compliance domain).

### Case Study: MI + Technology + Compliance

A pharmaceutical company set up an integrated intelligence system combining:
- Market intelligence (commercial market analysis)
- Technology intelligence (R&D and patent landscape)
- Compliance intelligence (regulatory environment)

Naming conflicts: "Risk", "Trend", "Segment" — different meanings per domain.

### Impact Analysis

| Principle | Impact |
|---|---|
| Namespace prefixes | Required across all entities and traits |
| Homonym registration | All conflicting terms documented |
| Cross-domain references | `{domain}::{concept}` format mandatory |
| Decision gates | Each domain operates independent gates |

### Verification Checklist

- [ ] Have domain namespace prefixes been applied to all entities and traits? → structure_spec.md §5.4
- [ ] Have conflicting terms been registered in concepts.md homonym table? → concepts.md §5
- [ ] Are cross-domain references using `{domain}::{concept}` format? → domain_scope.md §Multi-Domain Coexistence
- [ ] If inter-domain dependencies arise, are multi-domain rules from dependency_rules.md applied? → dependency_rules.md §6
- [ ] Do decision gates for each domain operate independently? → dependency_rules.md §MD03

### Affected Files

| File | Impact | Section |
|---|---|---|
| concepts.md | Modify | §5 Cross-Domain Homonyms |
| dependency_rules.md | Verify | §6 Multi-Domain Dependency Rules |
| structure_spec.md | Verify | §5.4 Multi-Domain Namespace |

---

## Case 5: Adding Real-Time Monitoring

### Situation

Extending from batch analysis to real-time monitoring (live market data, social sentiment streams, automated alerts on threshold breach).

### Case Study: Social Sentiment Real-Time Pipeline

Existing batch analysis updated daily. New real-time stream integration:
- Twitter/X API + Reddit firehose
- Detection latency < 5 minutes
- Auto-alert on negative sentiment spikes
- Risk threshold-triggered alerts

### Impact Analysis

| Principle | Impact |
|---|---|
| Collection method trait | New value: "streaming" |
| Freshness criteria | Stricter TTL for real-time |
| Trend signal detection | Latency attribute added |
| Risk alert path | Threshold-triggered automation |
| Multi-point credibility matching | Applies in real-time too |

### Verification Checklist

- [ ] Has collection method trait been added to raw data (batch/streaming/event-driven)? → structure_spec.md §3 Trait Definitions
- [ ] Have freshness rating criteria been adjusted for real-time data? → logic_rules.md §6 Data Freshness Rules
- [ ] Has detection latency attribute been added to trend signals? → structure_spec.md §2.2 Trend Signal
- [ ] Has alert path that **immediately** triggers when risk thresholds exceeded been designed? → logic_rules.md §RA02
- [ ] Do multi-point credibility rating matching rules apply equally in real-time environment? → logic_rules.md §ST01-ST02

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §3 Traits, §2.1 Collection entity attributes |
| logic_rules.md | Modify | §6 Data Freshness Rules, §RA02 |
| concepts.md | Modify | §Collection Method Terms (Streaming Ingestion) |

---

## Case 6: Classification Axis Refinement

### Situation

Adding a third classification axis to existing 2-axis (entity type, trait) system. Example: "Analysis perspective" — analyzing the same market entity from technical, financial, regulatory perspectives.

### Impact Analysis

| Principle | Impact |
|---|---|
| Classification dimensionality | 2 → 3 axes |
| Orthogonality | New axis must be orthogonal to existing two |
| Axis mixing prohibition | Applies to new axis as well |
| Backward compatibility | Existing entities may need new axis assignment |

### Verification Checklist

- [ ] Is new classification axis explicitly declared in structure_spec.md? → structure_spec.md §3
- [ ] Is new axis orthogonal to existing entity type axis and trait axis? → concepts.md §6.1
- [ ] Does axis mixing prohibition principle apply to new axis as well? → concepts.md §6.1
- [ ] Has classification axis separation principle been updated in concepts.md? → concepts.md §6.1
- [ ] Is new axis value needed for all existing entities? → structure_spec.md §6.1

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §3 (add new axis), §6 Classification Criteria Design |
| concepts.md | Modify | §6.1 Classification Axis Separation |

---

## Case 7: Quantitative Analysis Model Integration

### Situation

Integrating quantitative models (statistics, ML, forecasting) for market size estimation, competitive simulation, sentiment analysis, etc.

### Case Study: Forecasting Model Integration

Team integrated time-series forecasting model (ARIMA + LSTM) for market size projection. Required:
- New entity type: Analysis Model
- Model output credibility rating logic
- Model preconditions documentation
- Decision gate integration

### Impact Analysis

| Principle | Impact |
|---|---|
| New entity type | Analysis Model entity added |
| New relationship | Model Application: model → market/competitor/segment |
| Model output credibility | Determined by input data + model verification status |
| Decision gate integration | Model output as verification logic |

### Verification Checklist

- [ ] Has new entity type "Analysis Model" been added (model name, preconditions, input/output definitions)? → structure_spec.md §2.2
- [ ] Has new relationship type "Model Application" been added (analysis model → market/competitor/segment)? → structure_spec.md §4.1
- [ ] Is model output credibility determined by input data credibility AND model verification status? → logic_rules.md §7 Credibility Propagation Rules
- [ ] If model is used as verification logic at decision gate, does it comply with declaration-implementation link rule? → logic_rules.md §PG01

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §2.2 (add Analysis Model entity), §4.1 (add Model Application relationship) |
| logic_rules.md | Modify | §7 Credibility Propagation Rules |
| concepts.md | Modify | §Methodology Terms (Quantitative modeling) |

---

## Case 8: Geographic Scope Expansion

### Situation

Expanding analysis from single-country/region to multi-country/global scope.

### Case Study: APAC Expansion

Team expanded from Korea-only market intelligence to APAC (Korea, Japan, China, SEA). Required:
- Geographic dimension added
- Source credibility variations by jurisdiction
- Risk taxonomy expanded for cross-border risks
- Cultural/regulatory framework differences

### Impact Analysis

| Principle | Impact |
|---|---|
| Market entity scope | Geographic attribute added |
| Source credibility | May vary by jurisdiction (e.g., government statistics quality varies) |
| Risk taxonomy | Foreign exchange, geopolitical risks added |
| Compliance | Multi-jurisdictional regulatory analysis |

### Verification Checklist

- [ ] Has geographic dimension been added to market and competitor entities? → structure_spec.md §2.2
- [ ] Are source credibility ratings adjusted per jurisdiction? → concepts.md §Source Classification Terms
- [ ] Has risk taxonomy been expanded for cross-border risks? → concepts.md §Risk Identification Terms
- [ ] Are jurisdiction-specific regulatory frameworks incorporated? → domain_scope.md §Reference Standards

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §2.2 Market entity attributes |
| concepts.md | Modify | §Risk Identification Terms |
| domain_scope.md | Modify | §Reference Standards |

---

## Case 9: Source Decommissioning

### Situation (Shrinkage)

A previously trusted data source is decommissioned (vendor stops publishing, source becomes paywalled beyond budget, source becomes unreliable).

### Impact Analysis

| Principle | Impact |
|---|---|
| Source registry | Decommission with effective date |
| Historical data | Preserved but marked as no-longer-updating |
| Analysis dependencies | Identify analyses dependent on decommissioned source |
| Replacement | Identify alternative sources or accept analytical gap |

### Verification Checklist

- [ ] Is source decommission documented with effective date? → structure_spec.md §2.1
- [ ] Are dependent analyses identified and re-validated? → dependency_rules.md §7.2
- [ ] Are alternative sources identified or analytical gaps documented? → concepts.md §Source Classification Terms
- [ ] Are dependent strategy options re-evaluated for credibility? → logic_rules.md §TP03

---

## Case 10: Methodology Deprecation

### Situation (Shrinkage)

A methodology is deprecated (e.g., a framework is shown to have systematic biases; a model is invalidated by new evidence).

### Impact Analysis

| Principle | Impact |
|---|---|
| Methodology registry | Mark as deprecated |
| Analysis outputs | Mark outputs from deprecated methodology |
| Re-analysis | Determine if affected analyses need re-execution |
| Documentation | Document deprecation reason for institutional memory |

### Verification Checklist

- [ ] Is methodology marked as deprecated? → concepts.md §Methodology Terms
- [ ] Are analysis outputs from deprecated methodology marked? → structure_spec.md §2.2 Analysis Output
- [ ] Have affected analyses been re-evaluated? → competency_qs.md CQ-AN-04
- [ ] Has deprecation reason been documented? → extension_cases.md (this file, future cases)

---

## Common Checklist for All Extensions

Confirm the following items in all extension scenarios:

- [ ] Is multi-point credibility rating matching maintained? (logic_rules.md §ST01-ST05)
- [ ] Has no declaration-implementation gap occurred at decision gates? (logic_rules.md §PG01-PG05)
- [ ] Are entity type and trait classification axes not mixed? (concepts.md §6.1)
- [ ] Does the cross-verification of trait application targets and value sets pass? (structure_spec.md §3.1)
- [ ] Is the independence of risk assessment maintained? (domain_scope.md §Independence of Risk Assessment, logic_rules.md §RA03)
- [ ] Are there no multi-domain namespace collisions? (structure_spec.md §5.4)
- [ ] Has no circular dependency occurred? (dependency_rules.md §3)
- [ ] Do the relevant questions in competency_qs.md pass when re-executed?

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (New Source Type) | → Case 5 (Real-Time Monitoring) | New source types often involve real-time data |
| Case 2 (Decision Gate Condition) | → Case 7 (Quantitative Model) | New conditions often need automated verification via models |
| Case 3 (Risk Framework) | → Case 8 (Geographic Expansion) | International expansion may require different risk frameworks |
| Case 4 (Multi-Domain) | → Case 6 (Classification Axis) | Multi-domain may reveal need for additional classification dimensions |
| Case 5 (Real-Time) | → Case 7 (Quantitative Model) | Real-time data often paired with ML models |
| Case 6 (Classification Axis) | → Case 4 (Multi-Domain) | Refined classification supports multi-domain coexistence |
| Case 7 (Quantitative Model) | → Case 2 (Decision Gate) | Models become verification logic for gates |
| Case 8 (Geographic Expansion) | → Case 1 (New Source Type) | New geographies require new source types |
| Case 9 (Source Decommissioning) | → Case 1 (New Source Type) | Often triggers search for replacement |
| Case 10 (Methodology Deprecation) | → Case 7 (Quantitative Model) | Replacement methodology may be a new model |

---

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition, independence principles, multi-domain principles |
| [concepts.md](concepts.md) | Terms, homonyms, classification axis principles |
| [competency_qs.md](competency_qs.md) | Post-extension verification questions |
| [logic_rules.md](logic_rules.md) | Credibility rating consistency, decision gate rules |
| [structure_spec.md](structure_spec.md) | Entity/trait/relationship structure |
| [dependency_rules.md](dependency_rules.md) | Dependency and impact relationship rules |
| [conciseness_rules.md](conciseness_rules.md) | Allowed/prohibited redundancy patterns |
