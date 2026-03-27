# Finance Domain — Core Concept Definitions

## Classification Axes

| Axis | Values | Description |
|---|---|---|
| Mapping type | Synonym / Homonym / Extension account | Nature of the inter-concept relationship |
| Account classification | Assets / Liabilities / Equity / Revenue / Expenses | 5 major financial statement element classifications |
| Temporal attribute | instant / duration | Time attribution of financial items |

## Account Classification Principles (5 Elements)

| Element | Definition | Financial Statement | Temporal Attribute | Normal Balance |
|---|---|---|---|---|
| Assets | Resources controlled by the entity as a result of past events | Statement of Financial Position | instant | Debit |
| Liabilities | Present obligations arising from past events | Statement of Financial Position | instant | Credit |
| Equity | Residual interest after deducting liabilities from assets | Statement of Financial Position | instant | Credit |
| Revenue | Increases in equity from inflows of economic benefits | Income Statement | duration | Credit |
| Expenses | Decreases in equity from outflows of economic benefits | Income Statement | duration | Debit |

## Core Synonym Mappings (5)

| Canonical Name | IFRS Taxonomy | Commonly Used Labels | Notes |
|---|---|---|---|
| Revenue | ifrs:Revenue | Revenue, Sales, Operating revenue | Inclusion of operating revenue varies by industry |
| Assets | ifrs:Assets | Total assets | instant attribute |
| Equity | ifrs:Equity | Total equity, Shareholders' equity | instant attribute |
| CashAndCashEquivalents | ifrs:CashAndCashEquivalents | Cash and cash equivalents | Appears in both Statement of Financial Position and Cash Flow Statement |
| ProfitLoss | ifrs:ProfitLoss | Net income (loss) | duration attribute |

## Homonyms (5)

| Term | Context A | Context B | Distinguishing Criterion |
|---|---|---|---|
| Other financial assets | Current other financial assets (recoverable within 1 year) | Non-current other financial assets (over 1 year) | Current/non-current classification |
| Provisions | Product warranty provisions | Litigation provisions | Sub-classification by provision reason |
| Borrowings | Short-term borrowings | Long-term borrowings (including current portion reclassification) | Maturity basis |
| Other | Other income (operating-related) | Other comprehensive income (recognized directly in equity) | Income Statement vs. Statement of Comprehensive Income |
| Total/Subtotal | Total assets (top-level total) | Current assets subtotal (intermediate total) | Hierarchy position |

> Many cases exist where the same label is assigned to different taxonomy elements. Therefore, the taxonomy element ID, not the label, must be used as the primary identifier.

## Extension Account Handling

It is common for companies to use proprietary extension accounts beyond the standard taxonomy accounts. The higher the proportion of extension accounts, the more important normalization work becomes for inter-entity comparison.

### Normalization Strategy

- **Original preservation:** Store the original taxonomy element and label as-is
- **Synonym mapping:** Map company-specific labels for the same concept to the canonical name
- **Unified concept:** Aggregate into a higher-level concept system for inter-entity comparison
- Concept normalization must precede relation normalization — if concepts are unstable, relations are also unstable

### Segment Dimension

- Large companies have a segment (business division) dimension
- Segment-level revenue and operating income are treated as concepts separate from consolidated totals
- Segment labels are also company-specific extensions and are subject to normalization mapping

## Accounting Policy Differences (4)

| Item | Options | Impact |
|---|---|---|
| Inventory valuation | FIFO / Weighted average | Differences in cost of goods sold and ending inventory amounts |
| Depreciation method | Straight-line / Declining balance | Differences in operating income and asset carrying amounts |
| Revenue recognition timing | Delivery basis / Progress basis (IFRS 15) | Differences in revenue timing |
| Lease accounting | Whether right-of-use asset is recognized (IFRS 16) | Differences in total assets and liabilities |

## External Standard Mappings

| Internal Concept | FIBO Mapping | Mapping Level |
|---|---|---|
| Revenue | fibo-be-le:Revenue | Direct correspondence |
| Assets | fibo-be-le:Asset | Direct correspondence |
| Equity | fibo-be-le:Equity | Direct correspondence |
| CashAndCashEquivalents | fibo-be-le:CashInstrument | Partial correspondence |
| ProfitLoss | — | No direct correspondence |

## Interpretation Principles (3)

1. **Taxonomy element priority:** Use the IFRS/DART taxonomy element ID, not labels, as the primary identifier
2. **Context completeness:** Even for the same amount, differences in consolidated/separate, current/non-current, or period/point-in-time make it a distinct Fact
3. **Policy disclosure:** For items where accounting policy differences exist, present policy information together during comparison

## Related Documents

- [domain_scope.md](domain_scope.md) — classification axis definitions and core areas
- [logic_rules.md](logic_rules.md) — mathematical constraint relationships between core concepts
- [structure_spec.md](structure_spec.md) — the structure in which concepts are realized as ontology nodes
- [competency_qs.md](competency_qs.md) — query cases where concept mapping is applied in practice
- [extension_cases.md](extension_cases.md) — taxonomy change and extension account scenarios
