---
version: 2
last_updated: "2026-04-16"
source: manual
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

- [MUST-ALLOW] Dual semantic token definitions for light mode and dark mode — The same semantic name (e.g., `color-surface-primary`) references different primitive tokens in light/dark contexts. Consolidating into one makes theme switching impossible. (structure_spec.md §Token Layer Structure)
- [MUST-ALLOW] Token redefinition per brand theme — In a multi-brand system, the same semantic token references different primitive values for each brand. A necessary condition for visual independence between brands. (dependency_rules.md §Token–Component Dependency)

### Typography + Grid Integration

- [MUST-ALLOW] Typography scale and grid spacing system each re-referencing the same base unit (e.g., 8px) — Typography line-height/size and grid gutter/margin share the same base unit, but must be independently defined. Consolidating causes layout to unintentionally change when typography changes. (dependency_rules.md §Typography–Layout Dependency)
- [MAY-ALLOW] Typography scale redefinition per responsive breakpoint — Defining separate size steps per viewport is allowed when the purpose is readability maintenance. Steps with no difference between breakpoints can be consolidated. (structure_spec.md §Responsive Structure)

### Source of Truth Related

- [MUST-ALLOW] Design tool (Figma) components and code components each maintaining the same visual specification — Both are implementations of the design system documentation; both must independently maintain specifications. Synchronization frequency must be separately defined. (dependency_rules.md §Design Tool–Code Dependency)
- [MAY-ALLOW] Style guide (brand) and design system (product) each describing the same colors/typefaces — Brand style guides target all media (print, digital, environmental) while design systems are limited to digital products. If scopes are identical, consolidate by having one reference the other. (dependency_rules.md §Brand–Visual System Dependency)

### Accessibility

- [MUST-ALLOW] Accessibility criteria (contrast ratio, focus indicator) repeated in both the color system and component specifications — Color system verifies palette-level suitability; component specifications verify per-state contrast for individual components. Verification targets differ. (domain_scope.md §Cross-Cutting Concerns, Accessibility Conformance)
- [MUST-ALLOW] Supplementary means definitions per semantic color and per component — The semantic color definition says "error uses icon + text"; the component specification says "input error state shows exclamation icon + red border + error message." Both are needed — one defines the principle, the other the implementation. (dependency_rules.md §Color–Accessibility Dependency)

### Cross-Concern Appearances

- [MAY-ALLOW] Responsive rules across concern areas — Mobile adaptations (type scale changes, grid column changes, icon size changes) described in respective areas. Common principles defined once in domain_scope.md §Key Sub-Areas; each area adds its specific adaptation. (structure_spec.md §Responsive Structure)
- [MAY-ALLOW] Brand alignment rules in both brand identity section and individual element sections — Brand identity defines the overall constraints; individual elements (typography, color, icon) add their specific alignment rules. Primary definition in brand identity; others reference without duplicating values.

### Tier-Level Duplication

- [MUST-ALLOW] Same visual rule at different tiers — e.g., "4.5:1 contrast" in WCAG 2.2 (Tier-1a) and design system token contrast requirements (Tier-2). Tier-1a = legal baseline; Tier-2 = implementation spec. Removing either leaves a gap. (domain_scope.md §Normative System Classification)
- [MAY-ALLOW] Tier-3 heuristic and Tier-2 design system rule expressing the same principle — retain both if Tier-2 adds specificity; consolidate if Tier-2 merely quotes Tier-3. Example: "60-30-10 rule" (Tier-3) and token-level color ratio enforcement (Tier-2). Retain both only if Tier-2 adds operational specificity.

---

## 2. Removal Target Patterns

Each rule is tagged with a strength level:
- **[MUST-REMOVE]**: Duplication whose existence causes errors or incorrect reasoning.
- **[SHOULD-REMOVE]**: Duplication that is not significantly harmful but adds unnecessary complexity.

### Token Layer Duplication

- [MUST-REMOVE] Intermediate layers between primitive → semantic → component tokens that simply pass through without adding functional difference — Example: `blue-500` → `color-brand-blue` → `button-color-brand`. If `color-brand-blue` adds no semantic meaning beyond `blue-500`, remove it. Pass-through layers add update omission risk. (structure_spec.md §Token Layer Structure)
- [SHOULD-REMOVE] Semantic tokens and component tokens in 1:1 correspondence with identical values — When directly referencing the semantic token would suffice, a separate component token only adds unnecessary indirection. Retain only if the component may override the semantic value in a future theme.

### Brand and Accessibility Unseparated

- [MUST-REMOVE] Brand color definitions and accessibility contrast requirements mixed in a single specification — Brand colors are marketing/identity decisions; accessibility contrast is a perceivability requirement. When mixed, brand color changes may bypass accessibility verification. Separate into distinct systems and cross-verify. (logic_rules.md §Constraint Conflict Checks)
- [SHOULD-REMOVE] Accessibility criteria embedded only within the color system with no independent verification — Accessibility spans typography (minimum size), motion (reduced-motion), focus indicators, and icons, not just color. Subordinating to color causes omissions in other areas. (domain_scope.md §Cross-Cutting Concerns)

### Relationship Duplication

- [MUST-REMOVE] Multiple path definitions of the same visual property — If a component's background is defined through both a token reference and a hardcoded value, changing the token creates inconsistency. Maintain only one path. (dependency_rules.md §Token–Component Dependency)
- [MUST-REMOVE] Redundant re-declarations of visual properties already guaranteed by parent component — If a card defines `border-radius: 8px`, internal content areas do not need to re-declare the same value. (logic_rules.md §Component Logic)

### Classification Duplication

- [SHOULD-REMOVE] Component variants with only 1 instance — If there is only 1 variant, it has no classification significance and should be merged into the default. Retention possible if future extension is explicitly planned in extension_cases.md. (structure_spec.md §Component Layer Structure)
- [SHOULD-REMOVE] Different name definitions for the same visual expression — Based on synonym mapping in concepts.md §Homonyms, if `card-shadow` and `elevation-1` are the same shadow value, consolidate into one canonical token. (concepts.md §Homonyms Requiring Attention)

### Definition Duplication

- [MUST-REMOVE] Duplicate definitions of the same visual element under different paths/names — Determined by the synonym mapping in concepts.md. Canonical term is the one in the design system documentation; others are aliases to be removed.
- [SHOULD-REMOVE] The same accessibility verification logic copied across multiple component specifications — Extract into common accessibility verification criteria in structure_spec.md §Required Relationships. (structure_spec.md §Required Relationships)

### Design System Redundancy

- [MUST-REMOVE] Outdated component documentation alongside current version without deprecation marking — Mark with deprecation notice, sunset date, migration path. Undeprecated old docs cause implementers to build against the wrong spec. (extension_cases.md §Case 10)
- [SHOULD-REMOVE] Token aliases adding no semantic value — `color-brand-primary` → `color-blue-500` with no contextual meaning is pure indirection. Retain only if enabling theme switching or context-specific overrides.

---

## 3. Minimum Granularity Criteria

A sub-classification is allowed only if it satisfies **one or more** of the following. If none are satisfied, merge with the parent.

1. **Competency question difference**: Does it produce a different answer to a question in competency_qs.md? (11 CQ sections: CQ-VH, CQ-T, CQ-C, CQ-GL, CQ-II, CQ-DS, CQ-AC, CQ-BI, CQ-MO, CQ-SOT, CQ-CO)
2. **Constraint difference**: Do different constraints (contrast ratio, minimum size, ratio, usage context) apply?
3. **Dependency difference**: Does it depend on different tokens/components/systems, or do different tokens/components/systems depend on it?

Examples:
- `button-primary` and `button-secondary` have different color tokens and visual hierarchy → classification justified.
- If `icon-small` and `icon-compact` are the same size (16px) and use the same grid → merge candidates.
- `color-error` and `color-destructive` both resolve to the same red and serve the same meaning → merge to canonical name.

Anti-examples:
- "Dark-mode-blue-500" vs "Light-mode-blue-500" differing only in context — context separation is a theme mechanism, not a classification axis.
- Variants differing only by a single token value (e.g., button color) — may be one variant with a color prop rather than separate classifications.

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

### structure Boundary

- structure: Does the element conform to structural rules? (structure_spec.md §Token Layer Structure, §Component Layer Structure)
- conciseness: Is the element duplicated or unnecessary given the structure?
- Example: Token bypassing the semantic layer to directly reference a primitive → structure violation. Token duplicating another token's value → conciseness.

---

## 5. Quantitative Criteria

Domain-observed thresholds for conciseness judgment. Each threshold is a review signal, not an automatic removal trigger. **Conciseness judgment only** — behavioral thresholds → logic_rules.md; structural thresholds → structure_spec.md.

### Token System Thresholds

- **Token alias depth**: Token chain >3 levels → review for unnecessary indirection. Each level must add semantic meaning; pass-through aliases are removal targets. (structure_spec.md §Token Layer Structure)
- **Primitive token count per hue**: >12 steps per single hue → review for over-granulation. Most systems function well with 8~10 steps. Exception: tonal palette systems (Material Design 3) may use 13 steps by design.
- **Unused token ratio**: If >20% of defined tokens are unreferenced by any component → review for cleanup. Unreferenced tokens accumulate through incremental changes without corresponding cleanup.

### Component Thresholds

- **Component variant count**: >7 variants with overlapping props → review for split or consolidation. Conciseness signal, not structural rule. (logic_rules.md §Component Logic)
- **Single-instance variants**: Variant with exactly 1 use instance for >1 review cycle → merge with default or parent variant.

### Pattern Repetition Thresholds

- **Visual property repetition**: Same hardcoded value (not token) in 3+ components → extract into a token. Two copies may be coincidental; three almost certainly share one definition.
- **State definition repetition**: Same state visual treatment identical across 3+ components → extract into a shared state definition.

### Cross-Tier Duplication Thresholds

- **Tier-rule overlap**: Tier-2 and Tier-3 expressing same constraint at same specificity → consolidate to Tier-2. Retain both only when Tier-2 adds operational specificity beyond Tier-3. (domain_scope.md §Normative System Classification)
- **L-layer duplication**: Same concept at [L2] and [L3] without [L3] adding tool/practice-specific detail → merge into [L2]. (concepts.md §Abstraction Layer Reference)

### Review Output Conciseness

- **Finding deduplication**: 3+ findings citing same root cause → consolidate into 1 finding with root cause + affected locations.
- **Cross-file finding deduplication**: Issue flagged by both conciseness and a preceding agent → defer to preceding agent's finding; add only the removal recommendation.

---

## Related Documents

- `concepts.md` — §Homonyms Requiring Attention (synonym mappings), §Design System Core Terms (token hierarchy), §Abstraction Layer Reference ([L1]/[L2]/[L3])
- `structure_spec.md` — §Token Layer Structure, §Component Layer Structure, §State System, §Isolated Node Prohibition, §Required Relationships
- `competency_qs.md` — CQ-ID sections for minimum granularity judgment
- `domain_scope.md` — §Key Sub-Areas, §Normative System Classification (Tier system), §Cross-Cutting Concerns
- `logic_rules.md` — §Component Logic, §Color Logic, §Constraint Conflict Checks
- `dependency_rules.md` — §Token–Component Dependency, §Brand–Visual System Dependency, §Design Tool–Code Dependency
- `extension_cases.md` — Cases 9, 10 (shrinkage scenarios relevant to removal targets)
