---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# Conciseness Rules (ui-design)

This document contains the domain-specific rules that onto_conciseness references during conciseness verification.
It is organized in the order of **type (allow/remove) → verification criteria → role boundaries → measurement method**.

---

## 1. Allowed Duplication

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Duplication that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Duplication retained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Feedback and Status Communication

- [MUST-ALLOW] Multiple definitions of error states — Network, permission, and validation errors each require different guidance, recovery paths, and visual treatments. Consolidating into one generic error prevents users from understanding what went wrong. (logic_rules.md §Feedback Logic; structure_spec.md §Feedback Type–Representation Matrix)
- [MUST-ALLOW] Separate definitions by empty state type — First use, no data, no search results, and no permission each need different guidance and CTAs. (structure_spec.md §Screen State Matrix)

### Cross-Concern Appearances

- [MAY-ALLOW] Form validation in both "Forms and Input" and "Feedback and Status" — the former covers timing/methods, the latter covers message presentation/visual states. The validation rules themselves must be defined in only one place. (domain_scope.md §Inter-Document Contract)
- [MAY-ALLOW] Responsive rules across each concern area — mobile adaptations (top bar→bottom nav, table→card, modal→bottom sheet) described in respective areas. "Responsive UI Adaptation" defines only common principles; each area adds its specific adaptation.
- [MAY-ALLOW] Accessibility requirements across sub-areas — e.g., touch target sizing in both "Responsive UI Adaptation" and "Accessible Interaction." Primary enforcement point determines ownership (WCAG 2.5.5 → Accessible Interaction); others reference without duplicating. (domain_scope.md §Cross-cutting Concern Attribution)

### Source of Truth Related

- [MUST-ALLOW] Platform guidelines (Material Design, HIG) and internal pattern library each defining the same component — removing either makes conformity tracking impossible. (dependency_rules.md §Source of Truth Management)
- [MAY-ALLOW] Design tokens in both component specs and responsive rules — value definitions in one place (token system); specs and rules reference tokens. (concepts.md §Design System Terms)

### Accessibility

- [MUST-ALLOW] Accessibility requirements in each component definition — modal focus traps, form error associations (aria-describedby), toast live regions (aria-live). "Accessible Interaction" defines common principles; each component adds its specifics.

### Design System Architecture

- [MUST-ALLOW] Component-level token binding coexisting with global token definition — `button-padding: token(spacing-md)` alongside `spacing-md: 16px` is a binding, not value duplication. (concepts.md §Design System Terms)
- [MAY-ALLOW] Pattern documentation repeating component API descriptions — allowed when describing composition; consolidate if merely copying component internals.

### Tier-Level Duplication

- [MUST-ALLOW] Same interaction rule at different tiers — e.g., "visible focus" in WCAG 2.4.7 (Tier-1a) and design system focus spec (Tier-2). Tier-1a = legal baseline; Tier-2 = implementation spec. Removing either leaves a gap. (domain_scope.md §Normative System Classification)
- [MAY-ALLOW] Tier-3 heuristic and Tier-2 design system rule expressing the same principle — retain both if Tier-2 adds specificity; consolidate if Tier-2 merely quotes Tier-3.

### Micro-interaction and Animation

- [MAY-ALLOW] Per-component transition definitions alongside global motion system — global system defines easing/duration; components add direction, delay. Not duplication if adding context the global system does not contain. (concepts.md §Micro-interaction Terms)

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Pattern Duplication

- [MUST-REMOVE] Duplicate definitions of reusable modal patterns per concern — if open/close, focus trap, and background blocking are redefined per modal type, update omissions cause inconsistency. Define common modal pattern once; each type defines only content and actions. (logic_rules.md §Modal Logic)
- [MUST-REMOVE] Multiple path representations of same feedback pattern — if success feedback is defined as toast, banner, and inline message simultaneously, authority is unclear. One representation per type. (structure_spec.md §Feedback Type–Representation Matrix)
- [MUST-REMOVE] Duplicate interaction patterns between design system docs and screen specs — if both define a dropdown's keyboard behavior, they diverge on update. Screen specs should reference the design system component.

### State Duplication

- [MUST-REMOVE] Confusion between global state and component state — components independently defining app state (login, permissions) causes inconsistency. App state once globally; component states (hover, active, disabled) distinguished. (concepts.md §Homonyms Requiring Attention)
- [SHOULD-REMOVE] Same loading state defined differently across screens — varying spinner/skeleton/progress bar criteria per screen increases learning cost. Define commonly (logic_rules.md §Loading State Representation).

### Classification Duplication

- [SHOULD-REMOVE] Intermediate hierarchy nodes with only 1 child — e.g., only "Toast" under "Notifications" has no classification value; merge with parent.
- [SHOULD-REMOVE] Empty classifications without actual instances — remove unless reserved for future extension (see extension_cases.md).
- [SHOULD-REMOVE] Redundant sub-classifications across Tiers — if Tier-2 and Tier-3 define overlapping classifications, consolidate to Tier-2. Retain separate only if Tier-3 covers broader scope.

### Definition Duplication

- [MUST-REMOVE] Same component defined under different names — per concepts.md §Homonyms Requiring Attention (e.g., "popup" vs "modal dialog"). Consolidate to canonical term.
- [SHOULD-REMOVE] Same interaction pattern copied across multiple screen specs — extract into common pattern. (dependency_rules.md §Component–Design System References)
- [SHOULD-REMOVE] Duplicate motion definitions — same easing/duration hardcoded across components instead of referencing motion system. Extract to shared token. (concepts.md §Micro-interaction Terms)

### Design System Redundancy

- [MUST-REMOVE] Outdated component documentation alongside current version without deprecation marking — mark with deprecation notice, sunset date, migration path. (extension_cases.md)
- [SHOULD-REMOVE] Token aliases adding no semantic value — `color-brand-primary` → `color-blue-500` with no contextual meaning is pure indirection. Retain only if enabling theme switching or context-specific overrides.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md? (11 CQ sections: CQ-N, CQ-FI, CQ-FS, CQ-DD, CQ-MO, CQ-AD, CQ-R, CQ-AC, CQ-DS, CQ-MI, CQ-CO)
2. **Interaction difference**: Do different user actions (click, swipe, keyboard, drag, long-press) apply? (logic_rules.md §Constraint Conflict Checks)
3. **State difference**: Different set of states (active/inactive, loading/complete, error/success)? (structure_spec.md §Screen State Matrix)

Examples:
- `Toast` and `Banner` have different interactions (auto-dismiss vs manual close) and different states (transient vs persistent) → classification justified.
- `ConfirmModal` and `AlertModal` with same layout, same behavior, single CTA → merge candidates.
- `PrimitiveToken` and `SemanticToken` produce different CQ-DS answers: "what values exist?" vs "what purpose does this value serve?" → classification justified.

Anti-examples:
- "Primary Spinner" vs "Secondary Spinner" differing only in color — color is a token value, not a classification axis.
- "Mobile Modal" vs "Desktop Modal" with identical behavior, different presentation — responsive transitions (structure_spec.md §Responsive Component Transition Rules) govern presentation, not classification.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the specific application cases in the ui-design domain.

### onto_pragmatics Boundary

- onto_conciseness: Does an unnecessary element **exist**? (structural level)
- onto_pragmatics: Does unnecessary information **impede** user task execution? (execution level)
- Example: Unused filter options in UI spec → onto_conciseness. Too many filter options impeding discovery → onto_pragmatics.

### onto_coverage Boundary

- onto_conciseness: Is there something that should not be there? (reduction direction)
- onto_coverage: Is there something missing that should be there? (expansion direction)
- Example: Error states not defined → onto_coverage. Same error message duplicated in three places → onto_conciseness.

### onto_logic Boundary (preceding/following relationship)

- onto_logic precedes: Determines logical equivalence (implication). (logic_rules.md §Constraint Conflict Checks, §Modal Logic)
- onto_conciseness follows: Decides whether to remove after equivalence is confirmed
- Example: Common modal behavior implies individual definitions → onto_logic determines equivalence → onto_conciseness determines "redefinition unnecessary."

### onto_semantics Boundary (preceding/following relationship)

- onto_semantics precedes: Determines semantic identity (synonym status). (concepts.md §Homonyms Requiring Attention)
- onto_conciseness follows: Decides whether merging is needed after synonym is confirmed
- Example: "popup" and "modal dialog" are the same pattern → onto_semantics determines synonym → onto_conciseness determines "consolidate to canonical term."

### onto_structure Boundary

- onto_structure: Does the element conform to structural rules? (structure_spec.md §UI Design Required Elements, §Required Relationships)
- onto_conciseness: Is the element duplicated or unnecessary given the structure?
- Example: Navigation item violating structure_spec.md §Navigation Structure Patterns → onto_structure. Navigation item duplicating another's destination → onto_conciseness.

---

## 5. Quantitative Criteria

Domain-observed thresholds for conciseness judgment. Each threshold is a review signal, not an automatic removal trigger. **Conciseness judgment only** — behavioral thresholds → logic_rules.md; structural thresholds → structure_spec.md.

### Pattern Repetition Thresholds

- **Interaction pattern repetition**: Same pattern (dropdown open/close, modal entry/exit, swipe-to-dismiss) in 3+ screen specs → extract into common pattern. Two copies may vary by context; three almost certainly share one definition. (dependency_rules.md §Component–Design System References)
- **Feedback pattern repetition**: Same feedback representation in 3+ locations → consolidate into structure_spec.md §Feedback Type–Representation Matrix.
- **State definition repetition**: Same state with identical content in 3+ screens → extract into common definition per structure_spec.md §Screen State Matrix. Context-specific variations (different CTA, different guidance) are not duplicates.

### Classification Health Thresholds

- **Minimum instance count**: Sub-classification with <2 instances → merge candidate. Exception: reserved future extensions in extension_cases.md.
- **Maximum nesting depth**: Classification hierarchy exceeding 3 levels → flatten candidate. Each level must justify via §3 Minimum Granularity Criteria.
- **Single-child intermediate nodes**: Intermediate node with exactly 1 child for >1 review cycle → merge with parent or child.

### Cross-Tier Duplication Thresholds

- **Tier-rule overlap**: Tier-2 and Tier-3 expressing same constraint at same specificity → consolidate to Tier-2. Retain both only when Tier-2 adds operational specificity beyond Tier-3.
- **L-layer duplication**: Same concept at [L2] and [L3] without [L3] adding domain-specific detail → merge into [L2]. (concepts.md §Abstraction Layer Reference)

### Design System Conciseness Thresholds

- **Token alias depth**: Token chain >3 levels → review for unnecessary indirection. Each level must add semantic meaning; pass-through aliases are removal targets.
- **Component variant count**: >7 variants with overlapping props → review for split or consolidation. Conciseness signal, not structural rule. (structure_spec.md §Classification Criteria Design)
- **Pattern documentation staleness**: References to superseded component version (>1 release cycle) → update or remove.

### Review Output Conciseness

- **Finding deduplication**: 3+ findings citing same root cause → consolidate into 1 finding with root cause + affected locations.
- **Cross-file finding deduplication**: Issue flagged by both onto_conciseness and preceding agent → defer to preceding agent's finding, add only removal recommendation.

---

## Related Documents

- `concepts.md` — §Homonyms Requiring Attention (synonym mappings), §Design System Terms (token hierarchy), §Micro-interaction Terms (motion system), §Abstraction Layer Reference ([L1]/[L2]/[L3])
- `structure_spec.md` — §UI Design Required Elements, §Screen State Matrix, §Feedback Type–Representation Matrix, §Responsive Component Transition Rules, §Classification Criteria Design
- `competency_qs.md` — CQ-ID sections (CQ-N through CQ-MI, CQ-CO) for minimum granularity judgment
- `domain_scope.md` — §Key Sub-Areas, §Normative System Classification (Tier system), §Cross-Cutting Concerns, §Inter-Document Contract (rule ownership)
- `logic_rules.md` — §Modal Logic, §Feedback Logic, §Constraint Conflict Checks, §Accessible Interaction Logic
- `dependency_rules.md` — §Source of Truth Management, §Component–Design System References, §Circular Dependency Detection and Classification
- `extension_cases.md` — Reserved future extensions, deprecation scenarios
