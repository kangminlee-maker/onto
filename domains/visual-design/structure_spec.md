---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Structure Specification

Classification axis: **structural component** — specifications classified by the structural element they govern.

## Visual Design System Required Elements

This section serves as an internal consistency endpoint for competency verification (CQ-CO inference path). Each element category defines what must structurally exist in a visual design specification.

### Color System
- **Color Palette**: Full palette with primitive tokens (hue-step format: `blue-500`, `gray-100`), including neutral palette
- **Semantic Colors**: Functional color assignments (primary, secondary, accent, error, warning, success, info) as semantic tokens referencing primitives
- **Contrast Verification**: All foreground-background combinations verified against WCAG AA (4.5:1 normal text, 3:1 large text, 3:1 UI components)
- **Theme Definitions** (when applicable): Light and dark theme token mappings, with each semantic token resolving to appropriate primitives per theme

### Typography System
- **Typeface Selection**: Selected typefaces with rationale (medium, content type, target users, language support, licensing)
- **Type Scale**: Size steps based on a documented ratio, with levels named (display/h1/h2/h3/body/caption/overline)
- **Line-height and Spacing**: Line-height per level, letter-spacing adjustments, measure constraints
- **Fallback Stack**: Font-family fallback chain including system fonts and generic families

### Spacing System
- **Base Unit**: The fundamental spacing unit (4px or 8px)
- **Spacing Scale**: All permissible spacing values derived from the base unit (e.g., 4, 8, 12, 16, 24, 32, 48, 64)
- **Whitespace Rules**: When to use which spacing scale value (component-internal, component-between, section-between)

### Layout System
- **Grid Definition**: Column count per viewport range, gutter width, margin width, max-width
- **Breakpoints**: Viewport width thresholds where layout changes, with content reflow rules per transition
- **Alignment Rules**: Element alignment within grid columns, intentional grid-breaking rules

### Icon System
- **Style Definition**: Icon style (outline/filled/duotone), stroke width, corner radius
- **Size System**: Permitted sizes (e.g., 16/20/24/32px) with usage context per size
- **Grid**: Icon design keyline grid dimensions and padding rules
- **Meaning Registry**: Icon-to-meaning mapping ensuring no icon carries multiple meanings

### Component Visual System
- **State Definitions**: Visual specification per interactive state (default/hover/active/focus/disabled/loading/error/selected)
- **Variant Definitions**: Visual variations with documented usage criteria
- **Token Binding**: Each visual property referencing a design token (not hardcoded values)

### Brand Visual Elements
- **Logo Specifications**: Minimum size, clear space, color variations (full color/monochrome/reversed), prohibited modifications
- **Brand Colors**: Brand-specific color values mapped to the design system's color tokens
- **Brand Typeface**: Brand typeface mapped to the typography system

### Accessibility Visual Specifications
- **Contrast Documentation**: All critical combinations with computed contrast ratios
- **Focus Indicator Design**: Style, width (≥2px), contrast (≥3:1), for all interactive elements
- **Non-color Information**: For every color-based meaning, the supplementary means (icon, shape, text, pattern)

## Required Relationships

Cross-component validation rules. Each rule connects structural components that must remain consistent. A violation indicates a structural defect.

### Token Reference Integrity
- Every semantic token must reference at least 1 primitive token
- Every component token must reference a semantic token (not a primitive directly)
- Verification: trace each component token → semantic → primitive. Broken chain = violation
- Gap: if a component's visual property uses a hardcoded value instead of a token → token bypass violation

### Color–Contrast Completeness
- Every text-background color combination must have a computed contrast ratio documented
- Every semantic color (error, success, warning, info) must have supplementary means defined
- Verification: matrix of all foreground × background combinations → any unchecked cell is a violation

### State Visual Completeness
- Every interactive component must have at least 5 states visually defined (default/hover/active/focus/disabled)
- Each state must be visually distinguishable from adjacent states
- Verification: overlay state screenshots side by side. If two states are indistinguishable → violation
- Common gap: disabled state identical to default except for a slight opacity change that is imperceptible

### Brand–Token Alignment
- Every brand visual element (brand color, brand typeface) must map to a design system token
- Brand colors used in the product must trace to the brand style guide
- Verification: compare brand guideline values with token definitions. Divergence = violation

### Typography–Layout Coherence
- Type scale levels must have corresponding spacing values (heading spacing > body spacing)
- Measure constraints must be compatible with grid column widths
- Verification: for each type level, confirm that the grid column width accommodates the measure constraint

### Responsive–Content Coherence
- No content may be permanently hidden in responsive transitions. Content may be reorganized, collapsed, or moved
- Content priority order must be explicitly defined so responsive transitions have a reference
- Verification: compare desktop and mobile views. If high-priority content is below the fold on mobile → investigate

## Token Layer Structure

Classification axis: **Abstraction level** — Progresses from value specificity to meaning abstraction.

| Layer | Naming Convention | Role | Example |
|-------|------------------|------|---------|
| Primitive | `{category}-{name}-{step}` | Raw value definition | `blue-500`, `gray-100`, `spacing-16`, `shadow-sm` |
| Semantic | `{usage}-{property}` | Meaning/usage assignment | `color-primary`, `color-error`, `spacing-component-gap`, `shadow-elevation-1` |
| Component | `{component}-{property}-{state}` | Component-specific | `button-bg-primary`, `input-border-focus`, `card-shadow-hover` |

- References flow only in the Primitive → Semantic → Component direction (unidirectional dependency)
- Component tokens directly referencing Primitive tokens is a meaning layer violation — theme switching breaks
- Theme switching is achieved by replacing values at the Primitive layer, which propagate through Semantic to Component
- Token alias chains must not exceed 3 levels. Each level must add semantic meaning; pass-through aliases are conciseness removal targets (see conciseness_rules.md §Quantitative Criteria)

## Component Layer Structure (Atomic Design)

| Layer | Definition | Example |
|-------|-----------|---------|
| Atom | The smallest UI element that cannot be further decomposed | Button, input field, label, icon, badge |
| Molecule | A meaningful combination of Atoms | Search bar (input + button), form field (label + input + help text) |
| Organism | A complex composition of Molecules and Atoms | Header (logo + navigation + search bar), card (image + text + actions) |
| Template | Page-level arrangement of Organisms | Dashboard layout, list page layout |
| Page | Template with actual content filled in | Dashboard with real data applied |

- Upper layers are composed of lower layers. Bypassing lower layers (raw HTML/styles in an Organism) breaks reusability
- When an Atom changes, the change propagates to all upper layers. Impact scope tracking is mandatory
- Layer assignment must be based on composability, not visual size. A complex icon with internal structure is still an Atom if it is not composed of other Atoms

## State System

State list applied to all interactive visual components:

| State | Visual Representation Principle | Structural Threshold |
|-------|-------------------------------|---------------------|
| Default | Base appearance | All required visual properties defined via tokens |
| Hover | Subtle change from Default (background brightness ±5~15%, shadow addition) | Difference must be perceptible at a glance |
| Active/Pressed | Stronger change than Hover (scale 0.98, shadow reduction, color deepening) | Visually distinct from both Default and Hover |
| Focus | Clear outline (minimum 2px solid, ≥3:1 contrast against adjacent colors) | Must be visible on all background colors used in the product |
| Disabled | Reduced opacity (0.4~0.6) or desaturation | Must convey "exists but unavailable" — not invisible |
| Loading | Spinner, skeleton, or pulsing animation replacing content | Must preserve element dimensions to prevent layout shift |
| Error | Semantic error color + supplementary means (icon, text) | Must be distinguishable from disabled state |
| Selected | Highlighted background, check mark, or border accent | Must be distinguishable from focus state |

## Responsive Structure

| Range | Typical Breakpoint | Grid Characteristics |
|-------|-------------------|---------------------|
| Mobile | ~767px | 4 columns, 16px margins, 16px gutters |
| Tablet | 768px~1023px | 8 columns, 24px margins, 24px gutters |
| Desktop | 1024px~1439px | 12 columns, 32px margins, 24px gutters |
| Wide | 1440px~ | 12 columns, max-width 1440px centered, 32px gutters |

- Content must not disappear during breakpoint transitions — only rearranged, collapsed, or reduced
- Type scale must adjust per viewport (fluid typography or per-range scale definitions)
- Touch target size must meet minimum 44×44px on mobile viewports
- Content at 200% text enlargement must reflow without horizontal scrolling (WCAG 1.4.10)

## Classification Criteria Design

### Visual Element Classification Axes

Visual elements in a design system can be classified to determine which structural rules apply:

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Token Layer | Primitive / Semantic / Component | Determines reference direction rules |
| Interactivity | Static / Interactive | Interactive elements require state definitions |
| Theme Sensitivity | Theme-independent / Theme-dependent | Theme-dependent elements require per-theme token mappings |
| Media Target | Screen / Print / Both | Print elements require CMYK conversion and bleed rules |
| Brand Coupling | Brand-neutral / Brand-specific | Brand-specific elements require brand guideline alignment |

### Anti-Patterns in Classification

- **Classifying by tool rather than purpose**: "Figma component" vs "CSS class" is a tool classification. The structural classification should be "interactive element" vs "static element" because the structural requirements differ by interactivity, not by tool
- **Applying token rules uniformly to all layers**: primitive tokens have different naming and change velocity rules than component tokens. Applying the same governance to both creates unnecessary bureaucracy for primitives or insufficient control for components

## Domain Boundary Management

- The visual design domain covers the system of "what is seen" — visual expression, aesthetics, and visual communication
- UX research (user studies, usability testing) and information architecture (IA) are separate domains. Research results can inform visual design modifications, but the methodology is not under this domain's jurisdiction
- Code implementation details (CSS properties, framework APIs, rendering performance) fall under the software-engineering domain. This domain provides visual specifications; implementation is a reference relationship
- Content strategy (text writing, tone of voice) overlaps with visual design but is a separate concern. This domain covers the visual presentation of text (typeface, size, color), not the content itself
- UI design covers "structure through which the interface communicates with users" — placement, interaction logic, feedback patterns. This domain covers the visual treatment of those structural elements

## Isolated Node Prohibition

Each item below is a structural defect — a node that exists in isolation without required connections:

- Defined color tokens used by no component → warning (unused token)
- Defined components with incomplete states (< 5 of 8 states defined) → warning (state-incomplete component)
- Brand guideline visual elements not reflected in the design system tokens → warning (brand not reflected)
- Primitive tokens used directly in components without a semantic layer → warning (layer bypass)
- Color combinations without contrast ratio documented → warning (contrast unverified)
- Components existing only in the design tool without code implementation (or vice versa) → warning (synchronization incomplete)
- Spacing values used in layouts that are not in the spatial system → warning (off-scale spacing)
- Icon meanings used inconsistently (same icon, different meanings across screens) → warning (icon meaning collision)
- Semantic tokens defined but unreferenced by any component token → warning (orphan semantic token)
- Font weight values used that are not in the type system → warning (off-system typography)

## SE Transfer Verification

The following SE structural patterns were evaluated for transfer to Visual Design and found to differ in application context:

| SE Pattern | Visual Design Equivalent | Key Difference |
|---|---|---|
| Required Module Structure Elements (entry point, business logic, data access) | Required Visual System Elements (color, typography, spacing, layout, icons, components, brand, accessibility) | SE classifies by architectural layer; visual design classifies by visual concern |
| Golden Relationships (module-interface, test-code, config-code) | Required Relationships (token-integrity, color-contrast, state-completeness, brand-alignment) | SE validates code coherence; visual design validates visual system coherence |
| Architectural Patterns (hexagonal, clean, vertical slice) | Token Layer Patterns (primitive → semantic → component) | SE patterns are system-internal; visual design patterns face the viewer directly |
| Classification Criteria Design (by layer, by feature) | Classification Criteria Design (by token layer, interactivity, theme sensitivity, media target) | SE classifies code organization; visual design classifies visual element characteristics |
| Naming Conventions (camelCase, PascalCase) | Token Naming Conventions (`{category}-{property}-{variant}-{state}`) | Both serve discoverability; visual design naming bridges designer-developer communication |

## Related Documents
- concepts.md — Token, component, accessibility, brand, motion term definitions
- dependency_rules.md — Token–component, brand–visual system, design tool–code dependency rules
- logic_rules.md — Color/typography/accessibility/motion/brand behavioral rules
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), domain boundary, cross-cutting concerns
- competency_qs.md — Structure-related verification questions (CQ-DS, CQ-CO)
- conciseness_rules.md — Token alias depth and variant count thresholds
