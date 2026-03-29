---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Finance Domain — Logic Rules

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Rule type | Identity / Relation / Period / Conflict | Nature of the rule |
| Verification timing | At input / At query / At reporting | When the rule is applied |
| Violation severity | Error (block) / Warning (allow) | Handling level upon violation |

## Accounting Identities (3)

| ID | Identity | Violation Severity | Verification Timing |
|---|---|---|---|
| EQ01 | Assets = Liabilities + Equity | Error | At input |
| EQ02 | Opening equity + Net income + Other comprehensive income +/- Capital transactions = Closing equity | Warning | At query |
| EQ03 | Opening cash + Operating CF + Investing CF + Financing CF = Closing cash | Error | At input |

> **Note:** EQ02 is set to "warning" level because not all items from the Statement of Changes in Equity may be available as structured data. Accurate verification may require note information.

## Relation Rules (3)

| ID | Rule | Description | Violation Severity |
|---|---|---|---|
| RE01 | Gross profit = Revenue - Cost of goods sold | Arithmetic relationship within the Income Statement | Error |
| RE02 | Operating income = Gross profit - SG&A | Note: operating income definition varies by industry | Warning |
| RE03 | Current ratio = Current assets / Current liabilities | Derived metric calculation rule | — (calculation rule) |

> In RE02, the financial industry has a different operating income calculation structure. The general industry formula "gross profit - SG&A" does not apply; instead, a separate structure starting from interest income, fee income, etc. is followed. The applicable rule branches based on the industry classification axis (general/financial).

## Period Rules (3)

| ID | Rule | Description | Verification Timing |
|---|---|---|---|
| PR01 | Instant items are attributed to a specific date | Statement of Financial Position items (assets, liabilities, equity) | At input |
| PR02 | Duration items are attributed to a start-date-to-end-date interval | Income and cash flow items | At input |
| PR03 | Period comparison of the same item requires matching durations | Prevents quarterly vs. annual comparison | At query |

> Even for the same company and same reporting period, identifiers may differ depending on the source, causing period matching to fail. The identification system must be unified using the combination of "reporting entity + reporting period + reporting unit + source."

## Constraint Conflict Checking (1)

| ID | Rule | Description |
|---|---|---|
| CF01 | Consolidated total assets >= Separate total assets | General relationship due to subsidiary inclusion. Violation suggests consolidation scope error |

> CF01 is not an identity that holds 100% of the time but rather a general expectation. Exceptions may exist due to intercompany elimination, etc., so violations are treated as "warning."

## Derived Metric Calculation Rules

| Metric | Formula | Required Items | Attribute Caution |
|---|---|---|---|
| ROE | Net income / Average equity | ProfitLoss (duration), Equity (instant) | Average equity = (opening + closing) / 2 |
| Debt ratio | Total liabilities / Total equity | Liabilities (instant), Equity (instant) | Same point-in-time required |
| EPS | Net income / Weighted average shares outstanding | ProfitLoss (duration), Shares outstanding (from notes) | Share count is extracted from notes |
| Operating profit margin | Operating income / Revenue | OperatingIncome (duration), Revenue (duration) | Same period required |

## Revenue Recognition Rules (IFRS 15)

| ID | Rule | Description | Verification Timing |
|---|---|---|---|
| RR01 | Revenue is recognized at the point of or over the period of performance obligation fulfillment | Distinction between point-in-time and over-time recognition | At input |
| RR02 | Variable consideration is estimated using expected value or most likely amount and included in the transaction price | Returns, rebates, etc. | At query |

## Financial Instrument Classification Rules (IFRS 9)

| ID | Rule | Description | Verification Timing |
|---|---|---|---|
| FI01 | Financial assets are classified into 3 categories based on business model + contractual cash flow characteristics | Amortised cost / FVOCI / FVPL | At input |
| FI02 | Expected credit losses are measured as 12-month or lifetime depending on significant increase in credit risk | 3-stage impairment model | At query |

## Related Documents

- [domain_scope.md](domain_scope.md) — the basis for accounting identities being defined as a core area
- [concepts.md](concepts.md) — canonical names and mappings for concepts used in formulas
- [structure_spec.md](structure_spec.md) — the structure in which identities and relation rules are expressed as ontology relationships (edges)
- [competency_qs.md](competency_qs.md) — query cases where derived metric calculation rules are applied
- [dependency_rules.md](dependency_rules.md) — precedence dependencies between rules
