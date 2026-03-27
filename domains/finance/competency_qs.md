# Finance Domain — Competency Questions

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Question type | Single lookup / Comparison / Derived / Time series / Context | Required level of reasoning |
| Difficulty | Basic / Intermediate / Advanced | Number of concepts needed and reasoning steps |
| Data requirement | Main statement sufficient / Notes needed / Multiple sources needed | Scope of data needed for answering |

## Single Entity Lookup (4)

| ID | Question | Type | Difficulty | Data Requirement |
|---|---|---|---|---|
| Q01 | What is the consolidated revenue of a specific company for a specific fiscal year? | Single lookup | Basic | Main statement sufficient |
| Q02 | What is the total current assets on the separate Statement of Financial Position of a specific company for a specific fiscal year? | Single lookup | Basic | Main statement sufficient |
| Q03 | What is the operating cash flow on the consolidated Cash Flow Statement of a specific company for a specific fiscal year? | Single lookup | Basic | Main statement sufficient |
| Q04 | What are the contingent liability details in the consolidated notes of a specific company for a specific fiscal year? | Single lookup | Intermediate | Notes needed |

## Inter-Entity Comparison (3)

| ID | Question | Type | Difficulty | Data Requirement |
|---|---|---|---|---|
| Q05 | Compare the consolidated revenue of two companies in the same industry for a specific fiscal year | Comparison | Basic | Main statement sufficient |
| Q06 | Compare the consolidated operating profit margins of top companies in a specific industry for a specific fiscal year | Comparison | Intermediate | Main statement sufficient |
| Q07 | Compare one company's specific business segment revenue with another company's total revenue | Comparison | Advanced | Multiple sources needed |

> Q07 involves segment dimension comparison. Business segment revenue may only be available from segment notes, and segment labels are company-specific extension accounts requiring normalization mapping as a prerequisite.

## Derived Metrics (3)

| ID | Question | Type | Difficulty | Data Requirement |
|---|---|---|---|---|
| Q08 | What is the consolidated ROE of a specific company for a specific fiscal year? | Derived | Intermediate | Main statement sufficient |
| Q09 | What is the consolidated debt ratio of a specific company for a specific fiscal year? | Derived | Intermediate | Main statement sufficient |
| Q10 | What is the consolidated EPS of a specific company for a specific fiscal year? | Derived | Intermediate | Main statement sufficient |

## Time Series (3)

| ID | Question | Type | Difficulty | Data Requirement |
|---|---|---|---|---|
| Q11 | What is the trend of consolidated revenue for a specific company over the most recent 3 years? | Time series | Basic | Main statement sufficient |
| Q12 | What is the change in consolidated operating profit margin for a specific company over the most recent 3 years? | Time series | Intermediate | Main statement sufficient |
| Q13 | What is the difference in net income before and after a restatement for a specific company in a specific reporting period? | Time series | Advanced | Multiple sources needed |

> Q13 involves restatement processing. A restatement creates multiple data instances for the same reporting period, and metadata (filing number, disclosure date/time) is needed to determine which instance is the final version.

## Context Information (3)

| ID | Question | Type | Difficulty | Data Requirement |
|---|---|---|---|---|
| Q14 | What is the inventory valuation method of a specific company for a specific fiscal year? | Context | Intermediate | Notes needed |
| Q15 | What are the accounting policy changes related to lease liabilities of a specific company for a specific fiscal year? (IFRS 16) | Context | Advanced | Notes needed |
| Q16 | What are the consolidated total assets of a specific financial industry company for a specific fiscal year? | Context | Advanced | Multiple sources needed |

> Q16 involves the financial industry. The financial industry has a fundamentally different financial statement structure from general industries (e.g., insurance contract liabilities, loan receivables), and multiple sources may be needed due to structural differences in data origins.

## Coverage Verification

| Area | Number of Questions | Ratio |
|---|---|---|
| Single lookup | 4 | 25% |
| Comparison | 3 | 19% |
| Derived | 3 | 19% |
| Time series | 3 | 19% |
| Context | 3 | 19% |

Bias detection: balanced distribution confirmed against the 6 bias detection criteria in domain_scope.md.

## Related Documents

- [domain_scope.md](domain_scope.md) — bias detection criteria and area definitions
- [concepts.md](concepts.md) — synonym mappings and interpretation principles for concepts used in questions
- [logic_rules.md](logic_rules.md) — calculation rules for derived metric questions
- [structure_spec.md](structure_spec.md) — node and relationship structures needed for answering questions
- [extension_cases.md](extension_cases.md) — extension scenarios required by advanced difficulty questions
