---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Market Intelligence Domain — Logic Rules

## 1. Purpose

Defines logic rules to ensure data credibility, policy consistency, and inference validity within the market intelligence analysis system.

## 2. Data Source Credibility Rating Consistency Rules

### Core Rule — Multi-Point Matching

The allowed value set for data source credibility ratings must match across all reference points within the system, including collection, policy, and analysis.

### 2.1 Allowed Set Definition

Define the allowed value set for the data source credibility ratings used by the system from a single source, and all reference points reference this source.

### 2.2 Consistency Verification Rules

| ID | Rule | Violation Severity |
|---|------|-------------------|
| ST01 | Credibility rating value set declared in collection policy = value set referenced at decision gates | Error |
| ST02 | Credibility rating value set declared in collection policy = value set used in the analysis phase | Error |
| ST03 | Data without a credibility rating must not be fed into analysis | Error |

## 3. Decision Gate Declaration-Implementation Link Rules

### Core Rule — Mandatory Link Between Declaration and Implementation

All pass conditions declared at a decision gate must have corresponding verification logic.

| ID | Rule | Violation Severity |
|---|------|-------------------|
| PG01 | Number of pass conditions at a decision gate = number of verification logic implementations | Error |
| PG02 | Adding a pass condition requires simultaneous creation of verification logic | Error |
| PG03 | A condition existing without verification logic is a "declaration-implementation gap" violation | Warning |

## 4. Analysis Methodology Precondition Rules

| ID | Rule | Violation Severity |
|---|------|-------------------|
| AM01 | Preconditions for the analysis methodology used must be explicitly stated | Warning |
| AM02 | Analysis results where preconditions are not met must be marked with a credibility downgrade | Warning |

## 5. Risk Assessment Rules

### 5.1 Risk Score Calculation

| ID | Rule | Violation Severity |
|---|------|-------------------|
| RA01 | Risk score = impact x likelihood (single formula applied consistently) | Error |
| RA02 | When a risk threshold is exceeded, formulating a response strategy is mandatory | Warning |
| RA03 | Risk assessment must be performable independently of strategy derivation | Error |

### 5.2 Risk Independence

Risk assessment results are not subordinate to strategy options. Risk assessment remains independently valid even when no strategy exists, and risk assessment results may require strategy modifications.

## 6. Data Freshness Rules

| ID | Rule | Violation Severity |
|---|------|-------------------|
| DF01 | Expired data (exceeding freshness criteria) must be checked for updates before being fed into analysis | Warning |
| DF02 | If expired data is used, the analysis results must be marked with a temporary validity notice | Warning |

## 7. Credibility Propagation Rules

| ID | Rule | Description |
|---|------|-------------|
| TP01 | Credibility of analysis results ≤ lowest credibility rating among input data | Credibility does not propagate upward |
| TP02 | When combining multiple sources, the lowest credibility is the upper bound for the overall result | Weakest link principle |
| TP03 | Credibility of strategy options ≤ credibility of supporting analysis results | Same principle applies at the strategy phase |

## Related Documents

| Document | Reference Reason |
|----------|-----------------|
| [domain_scope.md](domain_scope.md) | Domain definition and independence principles |
| [concepts.md](concepts.md) | Credibility rating term definitions |
| [structure_spec.md](structure_spec.md) | Trait allowed value definitions |
| [competency_qs.md](competency_qs.md) | Rule verification questions |
| [dependency_rules.md](dependency_rules.md) | Inter-area dependency relationships |
