---
version: 1
last_updated: "2026-03-29"
source: setup-domains
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

- [MUST-ALLOW] Multiple definitions of error states — Network errors, permission errors, and validation errors each require different guidance messages, recovery paths, and visual treatments. Consolidating into a single generic error makes it impossible for users to understand what went wrong and how to resolve it.
- [MUST-ALLOW] Separate definitions by empty state type — First use (zero state), no data, and no search results each require different guidance and action prompts. Consolidating them makes it impossible to present appropriate next actions to the user.

### Cross-Concern Appearances

- [MAY-ALLOW] Form validation appearing in both the "Forms and Input" area and the "Feedback and Status" area — "Forms and Input" covers validation timing and methods (inline validation, on-submit validation), while "Feedback and Status" covers error message presentation and visual states. Since the concerns differ, appearing in both areas is allowed, but the validation rules themselves (what conditions are valid) must be defined in only one place.
- [MAY-ALLOW] Responsive rules applied across each concern area — Mobile adaptation of navigation (top bar → bottom navigation), mobile adaptation of data display (table → card), mobile adaptation of modals (modal → bottom sheet), etc. are described in their respective areas. The "Responsive UI Adaptation" area defines only common principles (content priority, touch target size), and each area describes only the specific adaptation for its components, which is not duplication.

### Source of Truth Related

- [MUST-ALLOW] Platform guidelines (Material Design, HIG) and internal UI pattern library each defining the same component — Platform guidelines are external standards while the internal library is an application adapted to the project context. Removing either makes it impossible to track conformity with platform standards.
- [MAY-ALLOW] Design tokens (spacing, sizes) appearing in both component specifications and responsive rules. The token value definitions should be in one place (token system), and component specs and responsive rules should reference the tokens. This is allowed.

### Accessibility

- [MUST-ALLOW] Accessibility requirements individually described in each component definition — Modal focus traps, form error associations (aria-describedby), toast live regions (aria-live), etc. are described within their respective components. The "Accessible Interaction" area defines only common principles (tab order, screen reader support), and each component describes accessibility requirements specific to that component.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Pattern Duplication

- [MUST-REMOVE] Concern-specific duplicate definitions of reusable modal patterns — If common patterns such as modal open/close behavior, focus trap, and background blocking are each redefined in "form modal," "confirmation modal," "information modal," etc., update omissions cause inconsistencies. Define the common modal pattern in one place, and each purpose-specific modal should define only its content and actions.
- [MUST-REMOVE] Multiple path representations of the same feedback pattern — If success feedback is simultaneously defined as a toast, a banner, and an inline message, it is unclear which is authoritative. Designate one representation path per feedback type.

### State Duplication

- [MUST-REMOVE] Confusion between global state and component state — If individual components each independently define app state (login status, user permissions), state inconsistencies arise. App state should be defined once globally, and components should reference it. Component-specific states (hover, active, disabled, and other UI interaction states) must be clearly distinguished from app state.
- [SHOULD-REMOVE] The same loading state defined differently across multiple screens — If the usage criteria for spinners, skeletons, and progress bars vary from screen to screen, user learning costs increase. Define loading type patterns commonly and apply them to each screen.

### Classification Duplication

- [SHOULD-REMOVE] Intermediate hierarchy nodes with only 1 child — Example: If only "Toast" exists under "Notifications," it has no classification significance and should be merged with the parent.
- [SHOULD-REMOVE] Empty classifications without actual screens or components implemented — Pattern classifications that exist only in definition with no actual application instances should be removed. However, if reserved for future extension (see extension_cases.md), they may be retained.

### Definition Duplication

- [MUST-REMOVE] Duplicate definitions of the same component under different names — Determined by the synonym mapping in concepts.md (e.g., "popup" vs "modal dialog"). Consolidate into one canonical term.
- [SHOULD-REMOVE] The same interaction pattern copied across multiple screen specifications — If dropdown open/close behavior, selection behavior, etc. are re-described in every screen, extraction into a common pattern is needed.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
2. **Interaction difference**: Do different user actions (click, swipe, keyboard input, etc.) apply?
3. **State difference**: Does it have a different set of states (active/inactive, loading/complete, error/success)?

Examples:
- `Toast` and `Banner` have different interactions (auto-dismiss vs manual close) and different states (transient vs persistent), so the classification is justified.
- If `ConfirmModal` and `AlertModal` have the same layout, same behavior, and only a single CTA, they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/onto_conciseness.md`. This section describes only the specific application cases in the ui-design domain.

### onto_pragmatics Boundary

- onto_conciseness: Does an unnecessary element **exist**? (structural level)
- onto_pragmatics: Does unnecessary information **impede** user task execution? (execution level)
- Example: Unused filter options are defined in the UI specification → onto_conciseness. Too many filter options make it difficult for users to find the desired filter → onto_pragmatics.

### onto_coverage Boundary

- onto_conciseness: Is there something that should not be there? (reduction direction)
- onto_coverage: Is there something missing that should be there? (expansion direction)
- Example: Error states are not defined → onto_coverage. The same error message is duplicately defined in three places → onto_conciseness.

### onto_logic Boundary (preceding/following relationship)

- onto_logic precedes: Determines logical equivalence (implication)
- onto_conciseness follows: Decides whether to remove after equivalence is confirmed
- Example: The common behavior rules of modals imply the behavior of individual modal definitions → onto_logic determines equivalence → onto_conciseness determines "redefinition of common behavior in individual modals is unnecessary."

### onto_semantics Boundary (preceding/following relationship)

- onto_semantics precedes: Determines semantic identity (synonym status)
- onto_conciseness follows: Decides whether merging is needed after synonym is confirmed
- Example: "popup" and "modal dialog" are the same pattern → onto_semantics determines synonym → onto_conciseness determines "consolidate into one canonical term."

---

## 5. Quantitative Criteria

Thresholds observed in this domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — Term definitions, synonym mappings, homonym list (semantic criteria for duplication determination)
- `structure_spec.md` — UI design structural requirements (structural-perspective removal criteria)
- `competency_qs.md` — Competency question list (criteria for judging "actual difference" in minimum granularity)
- `domain_scope.md` — Domain scope definition (basis for judging cross-concern appearances)
- `logic_rules.md` — Navigation, form, feedback, accessibility rules (criteria for logical equivalence determination)
