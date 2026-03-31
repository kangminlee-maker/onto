---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Conciseness Rules (palantir-foundry)

This document contains the domain-specific rules referenced by onto_conciseness during conciseness verification.
It is organized in the order: **type (allow/remove) → verification criteria → role boundary → measurement method**.

---

## 1. Allowed Redundancy

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Redundancy that, if removed, would break the system. Must be retained.
- **[MAY-ALLOW]**: Redundancy maintained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Shared Property vs. Local Property

- [MUST-ALLOW] When a Property appears in multiple Object Types with **same type, same business meaning, and same constraints**, but the Object Types are in **different ontologies** (e.g., Revenue Ontology and Cost Ontology). Cross-ontology consolidation via Shared Property creates coupling that violates ontology independence; use Interface instead. (CQ: CQ-SEM-04, CQ-X-02)
- [MAY-ALLOW] When a Property appears in 2+ Object Types within the **same ontology** with matching type and constraints. Consider extracting as Shared Property, but extracting prematurely (before business meaning stabilizes) creates fragile coupling.

### Interface Indirection

- [MUST-ALLOW] Interface layer between Shared Ontology Object Types and Private Ontology references. Even if only one Private Ontology currently references the type, the Interface preserves extensibility for future Private Ontologies. (CQ: CQ-SEM-03, CQ-X-02)
- [MAY-ALLOW] Interface for a Shared Object Type referenced by only one Private Ontology, with no planned additions. Direct reference with a documented contract is acceptable if simplicity outweighs abstraction benefit.

### Enum Redundancy Across Object Types

- [MUST-ALLOW] Multiple Object Types with Enum Properties containing overlapping values (e.g., "status" = [active, inactive] in both Order and Customer). These are NOT duplicates if the **business meanings differ** — Order status and Customer status have different state machines and evolve independently. (CQ: CQ-SEM-05)
- [MUST-ALLOW] Enum value "unknown" alongside nullable Property. "unknown" (explicit declaration of ignorance) and null (absence of value) have distinct semantics in Foundry-style ontologies.

### Action Type Precondition/Postcondition

- [MAY-ALLOW] Restatement of the same condition as both Action A's postcondition and Action B's precondition. Allowed for explicit validation at each boundary, but if purely redundant (no additional constraint), consolidate into a shared constraint. (CQ: CQ-KIN-01)

### Data Layer Redundancy

- [MUST-ALLOW] Derived Data Object Types that re-aggregate Transaction data. The aggregation result is structurally redundant with the source, but it serves a different purpose (reporting, auditing) and operates at a different granularity. (CQ: CQ-DAT-01, CQ-DAT-05)
- [MUST-ALLOW] Master Data reference copies in downstream systems (cache, synchronization). Removal makes external dependency tracking impossible.

### Permission Definition Redundancy

- [MUST-ALLOW] Separate Object Security Policy (row-level) and Property Security Policy (column-level) on the same Object Type. These are structurally redundant (both restrict access to the same OT), but they address different access dimensions and cannot be merged without losing granularity. (CQ: CQ-DYN-01)
- [MAY-ALLOW] Marking and Permission applied to the same resource when they overlap in effect. Marking (mandatory, AND-evaluated) and Permission (discretionary, OR-evaluated) operate in opposite directions and serve different governance purposes, but in practice they may produce identical access outcomes. Retain both unless governance review confirms one is fully redundant with the other. (CQ: CQ-DYN-05)

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Redundancy whose very existence causes errors or leads to incorrect reasoning.
- **[SHOULD-REMOVE]**: Redundancy that is not highly harmful but adds unnecessary complexity.

### Object Type Redundancy

- [MUST-REMOVE] Two Object Types with identical primary_key semantics, same Properties, and same Link Type connections. Merge into one. Exception: Object Types intentionally separated by data layer (e.g., Order in Transaction, OrderSummary in Derived) serve different purposes. (CQ: CQ-SEM-06)
- [SHOULD-REMOVE] Object Type whose Properties are a strict subset of another Object Type with no additional constraints or Link Types. Candidate for merge unless the separation reflects a competency question difference (competency_qs.md).

### Isolated Elements

- [SHOULD-REMOVE] Object Type with zero incoming and zero outgoing Link Types (see structure_spec.md "Isolated Element Check" for structural definition). Remove unless: (a) it is a Master Data root node expected to be referenced by future Object Types, or (b) it is registered in extension_cases.md for planned expansion. (CQ: CQ-SEM-01)
- [SHOULD-REMOVE] Link Type declared but never referenced in any Action Type, Rule, or Workflow logic. Verify against dependency_rules.md before removal.

### Enum Redundancy

- [SHOULD-REMOVE] Enum value defined but never instantiated in production or test data. Mark as deprecated with grace period, or remove if unused for a full business cycle. Retain if reserved for planned features in extension_cases.md.
- [MUST-REMOVE] Two Enum values with identical business meaning (synonyms confirmed by concepts.md homonym table). Consolidate to canonical name. (CQ: CQ-SEM-05)

### Shared Property Redundancy

- [MUST-REMOVE] Two Shared Properties with same type, same business meaning, same constraints. Merge into one canonical Shared Property. (CQ: CQ-SEM-04)
- [SHOULD-REMOVE] Shared Property referenced by only one Object Type. Demote to local Property unless planned for multi-Object Type use (extension_cases.md).

### Link Type Redundancy

- [MUST-REMOVE] Multiple-path redundancy: A→B and A→C→B with the same business meaning. Retain only one path. Both paths cause update inconsistency when one is modified but not the other.
- [SHOULD-REMOVE] Link Type with one-to-one cardinality and only one actual instance pair. If the relationship is a special case, embed as a Property rather than a Link Type.

### Action Type Redundancy

- [SHOULD-REMOVE] Two Action Types with identical input parameters, execution logic, and postconditions but different names. Merge per concepts.md synonym mapping. (CQ: CQ-KIN-01)
- [SHOULD-REMOVE] Action Type whose logic is a strict subset of another Action Type. Consolidate into one with optional parameters.

### Workflow and Rule Redundancy

- [SHOULD-REMOVE] Two Workflow definitions with identical trigger conditions and action bindings but different names. Merge into one canonical Workflow. (CQ: CQ-DYN-03)
- [SHOULD-REMOVE] Rule whose trigger condition is a strict subset of another Rule's condition and invokes the same Action Type. The broader Rule subsumes the narrower one. (CQ: CQ-DYN-04)

### Permission Redundancy

- [SHOULD-REMOVE] Duplicate Permission grants: same Object Type, same Action Type, same role — defined in multiple locations. Consolidate to single definition. (CQ: CQ-DYN-01)
- [SHOULD-REMOVE] Marking applied at both a parent resource (Folder/Project) and a child resource when the child already inherits the parent's Marking through file hierarchy propagation. The explicit child-level Marking is redundant. Verify via dependency_rules.md "Marking Propagation Dependencies." (CQ: CQ-DYN-02)

### Cross-Ontology Redundancy

- [MUST-REMOVE] Direct reference between Private Ontologies (bypassing Interface/Shared Property). This violates ontology independence and creates hidden coupling. Convert to Interface reference. (CQ: CQ-X-02)
- [SHOULD-REMOVE] Shared Ontology Object Type with Properties that are only meaningful in one Private Ontology. Move domain-specific Properties to the Private Ontology and keep Shared Ontology minimal.

---

## 3. Minimum Granularity Criteria

A new Object Type, Property, Link Type, or Action Type is justified **only if at least one** of the following holds. If none are satisfied, merge with the existing element.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
   - Example: "Order" and "Subscription" are separate because CQ-DAT-01 (data layer classification) places them in different layers.

2. **Constraint difference**: Do different constraints apply?
   - Data type: Order.amount (Integer) vs. Refund.amount (Decimal) → separate Properties, not Shared Property.
   - Nullability: Customer.middle_name (nullable) vs. Customer.last_name (required).
   - Cardinality: Order has_many Payments (one-to-many) vs. Customer has_one PrimaryAddress (one-to-one).
   - Preconditions: "process_order" requires status = "pending"; "cancel_order" requires status ≠ "completed".

3. **Dependency relationship difference**: Does it depend on different Object Types, or do different elements depend on it?
   - Order depends on Customer and Product; Invoice depends only on Order.
   - Derived Data Object Types are depended upon only by reporting; Transaction Object Types are depended upon by Workflows.

4. **Change impact classification difference**: Would changes be classified differently under change_classification rules?
   - Shared Property change = breaking_major for all referencing Object Types; local Property change = affects only that Object Type.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the concrete application cases in the palantir-foundry domain.

### onto_pragmatics Boundary

- onto_conciseness: Does an unnecessary element **exist** in the ontology definition? (structural level)
- onto_pragmatics: Does that element **hinder** query execution or workflow performance? (execution level)
- Example: Unused Property defined in Object Type → onto_conciseness (remove from ontology). That Property included in every codegen-generated type → onto_pragmatics (type bloat affecting compile time).
- Palantir-Foundry specific: codegen generates TypeScript types from **all** defined Properties. Unused Properties increase bundle size — both concerns apply.

### onto_coverage Boundary

- onto_conciseness: Does something **exist that should not**? (reduction direction)
- onto_coverage: Does something **not exist that should**? (expansion direction)
- Example: Redundant Enum value "unknown" alongside null → onto_conciseness. Missing Link Type to connect Order to Refund → onto_coverage.
- Palantir-Foundry specific: competency_qs.md CQ-SEM-04 ("Shared Property registration?") is onto_conciseness; CQ-KIN-01 ("major operations defined?") is onto_coverage.

### onto_logic Boundary (predecessor/successor)

- onto_logic precedes: determines **logical equivalence** (entailment)
- onto_conciseness follows: determines **whether to remove** after equivalence confirmed
- Example: onto_logic confirms Action A's postcondition entails Action B's precondition → onto_conciseness rules "precondition restatement is redundant, MAY-ALLOW for clarity."

### onto_semantics Boundary (predecessor/successor)

- onto_semantics precedes: determines **semantic identity** (synonym status per concepts.md)
- onto_conciseness follows: determines **consolidation necessity** after synonymy confirmed
- Example: "BusinessUnit" and "OrganizationalUnit" confirmed as synonyms → onto_conciseness rules "consolidate to one canonical name."
- Note: concepts.md homonym table (Object, Property, Interface, Action, Branch, Dataset, Pipeline, Function, Marking, Ontology, Sync, Transform) is input — homonyms are NOT synonyms, do not consolidate.

### onto_dependency Boundary

- onto_dependency: identifies and validates **dependency direction rules**
- onto_conciseness: uses those rules to identify **redundant paths**
- Example: A→B→C and A→C both exist. dependency_rules confirms both are correct. onto_conciseness decides: "Is direct path A→C necessary for performance, or is it a redundant shortcut?"
- Palantir-Foundry specific: Shared Property diamond dependency (X and Y both reference Shared Property A, both feed Derived Data aggregation) — dependency_rules identifies the diamond, onto_conciseness evaluates whether one reference should be removed.

### onto_structure Boundary

- onto_structure: verifies **required elements exist** (primary_key, display_name, etc.)
- onto_conciseness: evaluates **whether each element is necessary**
- Example: onto_structure confirms all Link Types have "description." onto_conciseness asks: "If the Link Type's meaning is obvious from source/target names, is the description adding value or is it redundant?"
- Note: structure_spec.md mandates elements; conciseness_rules.md does not override mandates but identifies cases where mandated elements are redundant with other information.

---

## 5. Quantitative Criteria

Domain-specific thresholds for conciseness evaluation. For structural health thresholds (OTs without Link Types, Action parameters, Properties per OT, etc.), see structure_spec.md "Quantitative Thresholds" — this section covers conciseness-specific ratios only, without duplicating structural thresholds.

### Shared Property Extraction Threshold

- Extract as Shared Property when appearing in **≥2 Object Types** within the **same ontology** with matching type, business meaning, and constraints. (CQ: CQ-SEM-04)
- 1 Object Type only → keep as local Property.

### Link Type Ratio

- Link Type count ≥ **0.5× Object Type count** to avoid isolation bias (per domain_scope.md bias detection: "Object Types abundant but Link Types sparse = isolated entities"). (CQ: CQ-SEM-02)
- If ratio < 0.3, audit for redundant Object Types or missing Link Types.

### Enum Utilization

- Enum values should have instantiation in **current + next fiscal year data plan**, or be explicitly registered in extension_cases.md. (CQ: CQ-SEM-05)
- Unused values beyond one fiscal year → deprecation candidate.

### Interface Complexity

- Interface should define **≤10 Properties**. Beyond 10, the Interface may be over-generalized (trying to abstract too much). (CQ: CQ-SEM-03)
- Interface with **1 Property** → question necessity; the Property may be better as local with a cross-reference contract.

### Action Type Granularity

- One Action Type = **one business decision/mutation**. If postcondition describes multiple unrelated state changes, split. For the maximum parameter count threshold (>8), see structure_spec.md "Quantitative Thresholds." (CQ: CQ-KIN-01)
- Example: "ProcessOrder" should not simultaneously "charge payment" AND "send notification" — split into ProcessPayment + SendNotification.

### Workflow Step Count

- A single Workflow should contain **≤10 steps** (Actions or decision gates). Beyond 10, the process likely conflates multiple business processes and should be decomposed into sub-Workflows connected via Rules. (CQ: CQ-DYN-03)
- Exception: linear approval chains (e.g., multi-level authorization) may exceed 10 steps if each step is a single approval Action.

### Rule Overlap Detection

- Two Rules with overlapping trigger conditions on the same Object Type property require explicit ordering justification. If evaluation order is unspecified, the later Rule silently overrides the earlier one — this is a latent conflict per logic_rules.md "Temporal and Ordering Rules." (CQ: CQ-DYN-04)
- Zero-overlap verification: for each Property that triggers Rules, list all Rules and verify mutual exclusivity of trigger conditions or explicit ordering.

### Cross-Ontology Coupling

- A Private Ontology should reference **≤3 Object Types** from Shared Ontology. Beyond 3, review whether the Private Ontology's scope is too broad or the Shared Ontology is too granular. (CQ: CQ-X-02)

### Permission Duplication Ratio

- Each Object Type + Action Type pair should have **exactly 1 Permission definition**. If >1 definition exists, deduplicate per Section 2 "Permission Redundancy." (CQ: CQ-DYN-01)
- Each Marking should appear at the **lowest necessary level** in the file hierarchy. If the same Marking appears at both parent and child levels, remove the child-level definition per Section 2 "Permission Redundancy." (CQ: CQ-DYN-02)

---

## 6. Removal Checklist

When reviewing an element for removal, verify all applicable items:

- [ ] Is it defined but never instantiated? (Check data_source and production data)
- [ ] Does it have dependency relationships? (Check dependency_rules.md)
- [ ] Is it necessary for answering a competency question? (Check competency_qs.md)
- [ ] Is it required by an extension scenario? (Check extension_cases.md)
- [ ] Is it a Master Data root node? (Exception: retain even if not actively referenced)
- [ ] Would removing it change the change_classification of related elements?
- [ ] Is it referenced by codegen output or external integrations? (Removal may break compiled code) (CQ: CQ-X-01)

---

## Related Documents

- `concepts.md` — term definitions, synonym/homonym list (semantic criteria for redundancy determination)
- `structure_spec.md` — isolated element rules, required element specifications, quantitative thresholds (structural removal criteria)
- `competency_qs.md` — competency question list (criteria for "actual difference" in minimum granularity judgment)
- `dependency_rules.md` — dependency direction rules, diamond dependency identification, Marking propagation (basis for redundant path analysis)
- `logic_rules.md` — constraint conflict detection, ME/CE verification, Marking AND vs Permission OR logic (criteria for logical equivalence determination)
- `extension_cases.md` — planned expansion scenarios (basis for "retain for future use" exceptions)
