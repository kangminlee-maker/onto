---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Conciseness Rules (visual-design)

This document contains the domain-specific rules that conciseness references during conciseness verification.
It is organized in the order of **type (allow/remove) → verification criteria → role boundaries → measurement method**.

---

## 1. Allowed Duplication

Each rule is tagged with a strength level:
- **[MUST-ALLOW]**: Duplication that breaks the system if removed. Must be retained.
- **[MAY-ALLOW]**: Duplication retained for convenience. Can be consolidated, but only remove when the benefit clearly outweighs the consolidation cost.

### Dark Mode / Themes

- [MUST-ALLOW] Dual semantic token definitions for light mode and dark mode — The same semantic name (e.g., `color-surface-primary`) references different primitive tokens in light/dark contexts. Consolidating into one makes theme switching impossible.
- [MUST-ALLOW] Token redefinition per brand theme — In a multi-brand system, the same semantic token references different primitive values for each brand. A necessary condition for visual independence between brands.

### Typography + Grid Integration Reference

- [MUST-ALLOW] Typography scale and grid spacing system each re-referencing the same base unit (e.g., 8px) — Typography line-height/size and grid gutter/margin share the same base unit, but must be independently defined in each system. Consolidating into one definition causes layout to unintentionally change when typography changes.
- [MAY-ALLOW] Typography scale redefinition per responsive breakpoint — Defining separate size steps per viewport is allowed when the purpose is readability maintenance. However, steps with no difference between breakpoints can be consolidated.

### Source of Truth Related

- [MUST-ALLOW] Design tool (Figma, etc.) components and code components each maintaining the same visual specification — The design tool is the designer's working environment and code is the implementation environment, so both must independently maintain specifications. Synchronization frequency and acceptable discrepancy range must be separately defined.
- [MAY-ALLOW] Style guide (brand) and design system (product) each describing the same colors/typefaces — Brand style guides target all media while design systems are limited to digital products, so their scopes differ. If the descriptions are completely identical, consolidation by having one reference the other is possible.

### Accessibility

- [MUST-ALLOW] Accessibility criteria (contrast ratio, focus indicator, etc.) repeated in both the color system and component specifications — The color system verifies palette-level contrast suitability, while component specifications verify per-state contrast for individual components. Since the verification targets and contexts differ, maintaining both is mandatory.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Token Layer Duplication

- [MUST-REMOVE] Intermediate layers between primitive → semantic → component tokens that simply pass through without adding functional difference — Example: In the path `blue-500` → `color-brand-blue` → `button-color-brand`, if `color-brand-blue` adds no semantic meaning and simply passes through `blue-500`, remove the intermediate layer. It only increases potential points for update omissions.
- [SHOULD-REMOVE] Semantic tokens and component tokens in 1:1 correspondence with identical values — When directly referencing the semantic token would suffice, maintaining a separate component token only adds unnecessary indirection.

### Brand and Accessibility Unseparated

- [MUST-REMOVE] Brand color definitions and accessibility contrast requirements mixed in a single specification — Brand colors are marketing/identity decisions, while accessibility contrast is a user perceivability requirement. When mixed, brand color changes may bypass accessibility verification, or accessibility corrections may compromise brand intent. Separate them into distinct systems and cross-verify.
- [SHOULD-REMOVE] Accessibility criteria embedded only within the color system with no independent verification system — Accessibility spans multiple areas including typography (minimum size), motion (reduced-motion), and focus indicators, not just color. Subordinating it to color causes accessibility verification omissions in other areas.

### Relationship Duplication

- [MUST-REMOVE] Multiple path definitions of the same visual property — If a component's background color is defined through both a token reference and a hardcoded value, changing the token creates inconsistency with the hardcoded value. Maintain only one path.
- [MUST-REMOVE] Redundant re-declarations of visual properties in child elements already guaranteed by the parent component — Example: If a card component defines `border-radius: 8px`, the internal content area does not need to re-declare the same value.

### Classification Duplication

- [SHOULD-REMOVE] Component variants with only 1 instance — If there is only 1 variant, it has no classification significance and should be merged into the default. However, retention is possible if future extension is explicitly planned.
- [SHOULD-REMOVE] Different name definitions for the same visual expression — Based on synonym mapping in concepts.md, if `card-shadow` and `elevation-1` are the same shadow value, consolidate into one canonical token.

### Definition Duplication

- [MUST-REMOVE] Duplicate definitions of the same visual element under different paths/names — Determined by the synonym mapping in concepts.md.
- [SHOULD-REMOVE] The same accessibility verification logic copied across multiple component specifications — Extraction into common accessibility verification criteria is needed.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md?
2. **Constraint difference**: Do different constraints (contrast ratio, minimum size, ratio, usage context) apply?
3. **Dependency difference**: Does it depend on different tokens/components/systems, or do different tokens/components/systems depend on it?

Examples:
- `button-primary` and `button-secondary` have different color tokens and visual hierarchy, so the classification is justified.
- If `icon-small` and `icon-compact` are the same size (16px) and use the same grid, they are candidates for merging.

---

## 4. Boundaries — Domain-Specific Application Cases

The authoritative source for boundary definitions is `roles/conciseness.md`. This section describes only the specific application cases in the visual-design domain.

### pragmatics Boundary

- conciseness: Does an unnecessary element **exist**? (structural level)
- pragmatics: Does unnecessary information **impede** query execution? (execution level)
- Example: An unused variant is included in a component specification → conciseness. Too many variants make it difficult for designers to select the correct one → pragmatics.

### coverage Boundary

- conciseness: Is there something that should not be there? (reduction direction)
- coverage: Is there something missing that should be there? (expansion direction)
- Example: A color system and typography exist but a spacing system is not defined → coverage. The spacing system has the same value duplicately defined under different names → conciseness.

### logic Boundary (preceding/following relationship)

- logic precedes: Determines logical equivalence (implication)
- conciseness follows: Decides whether to remove after equivalence is confirmed
- Example: A parent component's `border-radius` implies a child element's `border-radius` → logic determines equivalence → conciseness determines "child re-declaration unnecessary."

### semantics Boundary (preceding/following relationship)

- semantics precedes: Determines semantic identity (synonym status)
- conciseness follows: Decides whether merging is needed after synonym is confirmed
- Example: `elevation-1` and `card-shadow` are the same visual effect → semantics determines synonym → conciseness determines "consolidate into one canonical token."

---

## 5. Quantitative Criteria

Thresholds observed in this domain are recorded as they accumulate.

- (Not yet defined — accumulated through reviews)

---

## Related Documents

- `concepts.md` — Term definitions, synonym mappings, homonym list (semantic criteria for duplication determination)
- `structure_spec.md` — Visual design system structural requirements (structural-perspective removal criteria)
- `competency_qs.md` — Competency question list (criteria for judging "actual difference" in minimum granularity)
- `domain_scope.md` — Domain scope definition (token layers, accessibility areas, etc.)
- `logic_rules.md` — Color logic, typography logic, accessibility rules (criteria for logical equivalence determination)
