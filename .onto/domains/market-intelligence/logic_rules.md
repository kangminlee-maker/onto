---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Market Intelligence Domain — Logic Rules

Classification axis: **Market intelligence rule type** — rules classified by the concern they govern.

## 1. Purpose

Defines logic rules to ensure data credibility, policy consistency, and inference validity within the market intelligence analysis system.

## 2. Data Source Credibility Rating Consistency Rules

### Core Rule — Multi-Point Matching

The allowed value set for data source credibility ratings must match across all reference points within the system, including collection, policy, and analysis. This is a **structural invariant**: divergence at any point breaks credibility propagation.

### 2.1 Allowed Set Definition

Define the allowed value set for credibility ratings from a single source. All reference points (collection policy, decision gates, analysis pipeline) reference this single source.

Example single-source definition (organizational choice):
```yaml
credibility_rating_set:
  - Trusted     # primary source, verified
  - Verified    # secondary source, multi-source corroborated
  - Unverified  # secondary or tertiary source, unconfirmed
  - Speculative # tertiary source, opinion or conjecture
```

### 2.2 Consistency Verification Rules

| ID | Rule | Violation Severity | Verification Timing |
|---|------|-------------------|---------------------|
| ST01 | Credibility rating value set declared in collection policy = value set referenced at decision gates | Error | At policy change, at gate definition |
| ST02 | Credibility rating value set declared in collection policy = value set used in the analysis phase | Error | At policy change, at analysis pipeline change |
| ST03 | Data without a credibility rating must not be fed into analysis | Error | At pipeline ingestion |
| ST04 | New rating value addition triggers simultaneous update at all reference points | Warning | At policy change |
| ST05 | Removed rating value triggers reassignment of affected data | Warning | At policy change |

### Rule Rationale

- **ST01-ST02**: Inconsistent value sets create ambiguity. If collection uses {A, B, C} but decision gates expect {High, Medium, Low}, mapping is implicit and prone to error
- **ST03**: Unrated data has unknown credibility — propagation rules cannot apply. Must block, not pass through
- **ST04-ST05**: Schema evolution requires coordinated updates. Single-point changes break invariants

### Common Violation Pattern

A team adds a new credibility level "Authoritative" in the collection policy but doesn't update the analysis pipeline, which still recognizes only {Trusted, Verified, Unverified, Speculative}. New "Authoritative" data is either rejected by analysis (false negative) or silently downgraded to a default rating (false confidence). ST04 prevents this.

## 3. Decision Gate Declaration-Implementation Link Rules

### Core Rule — Mandatory Link Between Declaration and Implementation

Every pass condition declared at a decision gate must have corresponding verification logic. A condition without verification logic is a **declaration-implementation gap** — strategic decisions appear governed but actually pass without check.

### 3.1 Link Verification Rules

| ID | Rule | Violation Severity | Verification Timing |
|---|------|-------------------|---------------------|
| PG01 | Number of pass conditions at a decision gate = number of verification logic implementations | Error | At gate review |
| PG02 | Adding a pass condition requires simultaneous creation of verification logic | Error | At condition addition |
| PG03 | A condition existing without verification logic is a "declaration-implementation gap" violation | Warning | At periodic gate audit |
| PG04 | Removing a verification logic without removing the condition creates a gap | Error | At verification logic change |
| PG05 | Modifying a condition requires re-validation of corresponding verification logic | Warning | At condition modification |

### Rule Rationale

- **PG01**: Mathematical invariant. Every condition must be checkable
- **PG02**: Prevents intentional or accidental gap introduction. Declaration without implementation is theatrical governance
- **PG03**: Audit trigger. Existing gaps may be tolerated as known issues but must be tracked
- **PG04**: Reverse direction also dangerous. Removing logic but keeping condition creates phantom gate
- **PG05**: Modified conditions may have logic that no longer matches intent

### Verification Logic Types

| Type | Example | Strength |
|------|---------|----------|
| Automated test | Code-based check (e.g., revenue forecast > $X threshold) | Strongest — runs every gate evaluation |
| Checklist | Human checklist (e.g., 5 risk categories assessed) | Medium — depends on rigor of completion |
| Expert review | SME review (e.g., legal team reviews compliance) | Weakest — subjective; document criteria |

## 4. Analysis Methodology Precondition Rules

| ID | Rule | Violation Severity |
|---|------|-------------------|
| AM01 | Preconditions for the analysis methodology used must be explicitly stated | Warning |
| AM02 | Analysis results where preconditions are not met must be marked with credibility downgrade | Warning |
| AM03 | Methodology name and version (where versioned) must be documented per analysis | Warning |
| AM04 | When methodology output contradicts substantial evidence, evidence wins (substance over methodology) | Informational |

### Methodology Preconditions Examples

| Methodology | Preconditions |
|-------------|---------------|
| Porter's Five Forces | Industry boundaries clearly defined; competitive dynamics analyzed (not consumer behavior) |
| SWOT | Bounded analysis scope (entity, market, time period); not for cross-comparison |
| PESTEL | Macro-environment factors of single jurisdiction; not for company-internal analysis |
| TAM/SAM/SOM | Market boundaries definable; sizing methodology disclosed (top-down or bottom-up) |
| Customer Segmentation | MECE classification possible; sufficient data per segment for characterization |

## 5. Risk Assessment Rules

### 5.1 Risk Score Calculation

| ID | Rule | Violation Severity |
|---|------|-------------------|
| RA01 | Risk score = Impact × Likelihood (single formula applied consistently to all risks) | Error |
| RA02 | When a risk threshold is exceeded, formulating a response strategy is mandatory | Warning |
| RA03 | Risk assessment must be performable independently of strategy derivation | Error |
| RA04 | Impact and Likelihood scales must be uniform across all risks (e.g., 1-5 each) | Error |
| RA05 | Each risk must have a designated owner | Warning |
| RA06 | Each risk must have at least one response strategy (avoidance/mitigation/acceptance/transfer) | Warning |

### Risk Score Calculation Example

Impact scale (1-5):
- 1: Negligible impact (<1% of revenue or operational disruption <1 day)
- 2: Minor (1-5% revenue or 1-7 day disruption)
- 3: Moderate (5-15% revenue or 1-4 week disruption)
- 4: Significant (15-30% revenue or 1-3 month disruption)
- 5: Severe (>30% revenue or >3 month disruption / business continuity threat)

Likelihood scale (1-5):
- 1: Rare (<5% probability in defined horizon)
- 2: Unlikely (5-25%)
- 3: Possible (25-50%)
- 4: Likely (50-75%)
- 5: Almost certain (>75%)

Risk score = Impact × Likelihood, range 1-25:
- 1-4: Low (acceptance often appropriate)
- 5-12: Medium (mitigation typical)
- 13-20: High (mandatory response, executive review)
- 21-25: Critical (mandatory immediate response, board-level escalation)

### 5.2 Risk Independence

Risk assessment results are not subordinate to strategy options. Risk assessment remains independently valid even when no strategy exists, and risk assessment results may require strategy modifications.

Operational requirements:
- Risk owner ≠ strategy owner (organizational separation)
- Risk register exists independent of strategy portfolio
- Risk assessment scheduled independently (not triggered only by strategy review)
- Risk findings have escalation path that bypasses strategy chain (direct to executive/board)

## 6. Data Freshness Rules

| ID | Rule | Violation Severity |
|---|------|-------------------|
| DF01 | Expired data (exceeding freshness criteria) must be checked for updates before being fed into analysis | Warning |
| DF02 | If expired data is used, the analysis results must be marked with a temporary validity notice | Warning |
| DF03 | Freshness criteria (TTL) must be defined per source type | Error |
| DF04 | Real-time data sources have stricter TTL than batch sources | Informational |

### Freshness Criteria Examples

| Source Type | Typical TTL | Rationale |
|-------------|-------------|-----------|
| Market price/quote | Seconds to minutes | High volatility |
| Social media sentiment | Minutes to hours | Fast-changing |
| News feeds | Hours to days | News cycle |
| Industry reports | Months | Update frequency |
| Government statistics | Quarter to year | Publication frequency |
| Academic research | 2-5 years | Long publication cycle, slower change |

## 7. Credibility Propagation Rules

The weakest-link principle: credibility decreases (or stays the same) through processing, never increases.

| ID | Rule | Description | Severity |
|---|------|-------------|----------|
| TP01 | Credibility of analysis results ≤ lowest credibility rating among input data | Weakest link in chain | Error |
| TP02 | When combining multiple sources, the lowest credibility is the upper bound for the overall result | Multi-source weakest link | Error |
| TP03 | Credibility of strategy options ≤ credibility of supporting analysis results | Same principle at strategy phase | Error |
| TP04 | Credibility cannot be inflated by methodology application | A "rigorous SWOT analysis" of speculative data is still speculative | Warning |
| TP05 | Aggregation does not increase credibility | Averaging 10 unverified sources still produces unverified result | Error |

### Credibility Propagation Example

Strategy option "Enter the market for IoT-enabled industrial sensors" derived from:
- Analysis: TAM estimation based on industry report (rated Verified) and one academic paper (rated Trusted)
- Analysis: Competitive landscape based on company websites (rated Unverified) and news articles (rated Unverified)

Per TP01: Analysis credibility ≤ min(Verified, Trusted, Unverified, Unverified) = Unverified
Per TP03: Strategy option credibility ≤ Analysis credibility = Unverified

If decision gate requires "Verified" credibility for strategic moves, this option fails the gate. Either:
1. Strengthen analysis (find Verified sources for competitive landscape) → may upgrade overall
2. Acknowledge the limitation and proceed with Unverified rating + appropriate risk treatment

## 8. Constraint Conflict Resolution

When rules produce conflicting guidance:

### Methodology vs Evidence

When methodology output (e.g., SWOT classification) contradicts substantial evidence (e.g., customer research):
- **Evidence wins**. Methodologies are tools for structured thinking, not replacements for empirical data
- Document the override with rationale
- Update methodology application going forward

### Speed vs Rigor

When analysis time pressure conflicts with rigor:
- Document the trade-off explicitly
- Mark output with "rapid analysis" credibility downgrade
- Schedule deeper analysis if decision warrants

### Risk Independence vs Coordination

When risk team flags issue that strategy team disagrees with:
- Risk has veto authority for risks above threshold (RA02)
- Below threshold, risk can recommend but strategy decides
- Disagreement escalates to executive/board (per organizational governance)

### Resolution Procedure

1. Apply normative tier ordering (domain_scope.md): Tier-1 (methodology) > Tier-2 (organizational) > Tier-3 (project)
2. For same-tier conflicts, prefer the more specific rule
3. Document the decision and rationale
4. Escalate persistent conflicts to governance review

## 9. SE Transfer Verification

| SE Pattern | Market Intelligence Equivalent | Key Difference |
|---|---|---|
| Type system enforcement (compile-time) | Credibility rating consistency (ST01-ST03) | SE uses compiler; MI uses pipeline validation |
| State machine determinism | Decision gate declaration-implementation | SE verifies via tests; MI verifies via gate audit |
| Interface contracts | Methodology preconditions (AM01-AM04) | SE uses interfaces; MI uses methodology documentation |
| Acyclic dependencies | Risk independence (RA03), area independence | Both prevent cycles; MI emphasizes independence at organizational level |
| Idempotency | Single-source credibility set | SE for retry safety; MI for consistency across reference points |

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and normative tier classification |
| [concepts.md](concepts.md) | Credibility rating, decision gate, risk term definitions |
| [structure_spec.md](structure_spec.md) | Trait allowed value definitions |
| [competency_qs.md](competency_qs.md) | Rule verification questions |
| [dependency_rules.md](dependency_rules.md) | Inter-area dependency relationships |
| [extension_cases.md](extension_cases.md) | Scenarios that may trigger rule changes |
