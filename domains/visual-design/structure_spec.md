# Visual Design Domain — Structure Specification

## Visual Design System Required Elements

- **Color System**: Color palette, primary/secondary/accent colors, semantic colors, contrast ratio criteria
- **Typography System**: Typeface selection, type scale, line-height/letter-spacing/measure rules
- **Spacing System**: Base unit, spacing scale, whitespace rules
- **Layout System**: Grid system, breakpoints, responsive rules
- **Icon System**: Style, size system, meaning consistency
- **Component System**: Reusable components, state definitions, variants
- **Brand Visual Elements**: Logo rules, brand colors, brand typefaces, tone and manner
- **Accessibility Criteria**: WCAG conformance level, contrast ratio, focus indicator, information delivery means beyond color

## Required Relationships

- Every semantic token must reference at least 1 primitive token (token reference integrity)
- Every component must receive visual properties through semantic tokens (token-based styling)
- Every interactive component must have at least 5 states defined (default/hover/active/focus/disabled) (state completeness)
- Every text-background color combination must meet WCAG contrast ratio criteria (accessibility conformance)
- Every element of the visual system must align with brand identity (brand alignment)
- Every visual meaning delivery must be accompanied by means other than color (multi-sensory delivery)

## Token Layer Structure

Classification axis: **Abstraction level** — Progresses from value specificity to meaning abstraction.

| Layer | Naming Convention | Role | Example |
|-------|------------------|------|---------|
| Primitive | color-name-step | Raw value definition | blue-500, gray-100, spacing-16 |
| Semantic | usage-property | Meaning/usage assignment | color-primary, color-error, spacing-component-gap |
| Component | component-property-state | Component-specific | button-bg-primary, input-border-focus |

- References flow only in the Primitive → Semantic → Component direction (unidirectional dependency)
- Component tokens directly referencing Primitive tokens is a meaning layer violation
- Theme switching is achieved by replacing values at the Primitive layer, which propagate to the Semantic/Component layers

## Component Layer Structure (Atomic Design)

| Layer | Definition | Example |
|-------|-----------|---------|
| Atom | The smallest UI element that cannot be further decomposed | Button, input field, label, icon |
| Molecule | A meaningful combination of Atoms | Search bar (input field + button), form field (label + input field + help text) |
| Organism | A complex composition of Molecules and Atoms | Header (logo + navigation + search bar), card list |
| Template | Page-level arrangement of Organisms | Dashboard layout, list page layout |
| Page | Template with actual content filled in | Dashboard with real data applied |

- Upper layers are composed of lower layers. If upper layers bypass lower layers and directly include raw HTML/styles, reusability is lost
- When an Atom changes, the change propagates to all upper layers containing that Atom. Impact scope tracking is mandatory

## State System

State list applied to all interactive components:

| State | Visual Representation Principle | Purpose |
|-------|-------------------------------|---------|
| Default | Base appearance | Initial state |
| Hover | Subtle change from Default (background brightness, shadow, etc.) | Mouse-over feedback |
| Active/Pressed | Stronger change than Hover (pressed effect) | Click/tap feedback |
| Focus | Clear outline (2px or more, 3:1 contrast) | Keyboard navigation indicator |
| Disabled | Reduced opacity or desaturation | Unavailable state |
| Loading | Progress indicator (spinner, skeleton) | During async operation |
| Error | Semantic error color + supplementary means | Validation failure |
| Selected | Highlighted background or check mark | Selection confirmation |

## Responsive Structure

| Range | Typical Breakpoint | Grid Characteristics |
|-------|-------------------|---------------------|
| Mobile | ~767px | 4 columns, single-column layout focused |
| Tablet | 768px~1023px | 8 columns, 2-column layout |
| Desktop | 1024px~1439px | 12 columns, multi-column layout |
| Wide | 1440px~ | 12 columns, max-width constrained |

- Content must not disappear during breakpoint transitions. It must be rearranged or reduced
- Type scale must adjust per viewport (fluid typography or per-range scale)
- Touch target size must meet a minimum of 44×44px on mobile

## Domain Boundary Management

- The visual design domain covers the system of "what is seen." UX research (user studies), information architecture (IA), and interaction design (behavioral logic) are separate domains
- Code implementation details (CSS properties, framework APIs) fall under the software-engineering domain. This domain provides visual specifications; implementation is a reference relationship
- Content strategy (text writing, tone of voice) overlaps with visual design but is a separate concern. This domain covers the visual presentation of text, not the content itself
- Usability evaluation (usability testing) results can be input for visual design modifications, but the evaluation methodology itself is not under this domain's jurisdiction

## Isolated Node Prohibition

- Defined color tokens used by no component → warning (unused token)
- Defined components with incomplete states → warning (state-incomplete component)
- Brand guideline visual elements not reflected in the design system → warning (brand not reflected)
- Primitive tokens used directly in components without a semantic layer → warning (layer bypass)
- Color combinations without accessibility criteria applied → warning (contrast unverified)
- Components existing only in the design tool without code implementation (or vice versa) → warning (synchronization incomplete)

## Related Documents
- concepts.md — Token, component, accessibility, brand term definitions
- dependency_rules.md — Token–component, brand–visual system, design tool–code dependency rules
- competency_qs.md — Structure-related verification questions
