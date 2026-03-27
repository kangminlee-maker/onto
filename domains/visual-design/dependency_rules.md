# Visual Design Domain — Dependency Rules

## Token–Component Dependency

- Primitive Token → Semantic Token → Component Token: Tokens must reference in the direction of lower → upper. If semantic tokens directly contain raw values, theme switching becomes impossible
- Component → Semantic Token: A component's visual properties reference semantic tokens. Using hardcoded values directly makes consistency maintenance impossible
- Semantic Token Change → Propagates to all referencing components: Changing a semantic token value affects all components referencing that token. Impact scope verification before change is mandatory
- When adding a new token: First verify whether an existing token can express it. Unnecessary token growth increases system complexity and undermines consistency

## Typography–Layout Dependency

- Type Scale → Visual Hierarchy: A type scale must be defined for visual hierarchy between headings/body/captions to be established
- Type Scale → Spacing System: Text size provides the basis for surrounding spacing. Typography changes require spacing review
- Measure → Grid Column Width: The optimal readability measure constrains grid column width. Grid design must not ignore readability
- Typeface Change → Full Typography System Re-verification: Since x-height, character width, and line-height characteristics differ between typefaces, changing a typeface requires re-verification of scale, line-height, and measure

## Color–Accessibility Dependency

- Color Palette Definition → Contrast Ratio Verification: After defining colors, verify that WCAG contrast criteria are met in usage contexts (text/background combinations)
- Color Palette Change → Accessibility Re-verification: If any color in the palette changes, contrast re-verification of all combinations using that color is needed
- Semantic Color → Supplementary Means: Semantic colors (error, success, etc.) must always be accompanied by supplementary means other than color (icons, text, shapes)
- Dark Mode Addition → Full Color System Redefinition: Dark mode is not an inversion of light mode colors but requires a separate semantic token mapping

## Brand–Visual System Dependency

- Brand Colors → Color System: Brand colors constrain the primary/accent colors of the color system. Choosing primary colors unrelated to brand colors violates brand alignment
- Brand Typeface → Typography System: When a brand typeface is designated, it constrains the typeface selection in the typography system
- Brand Tone and Manner → Image/Icon Style: If the tone and manner is "professional and restrained," elaborate illustrations are inappropriate
- Brand Guideline Change → Full Visual System Review: Brand identity is a higher-level constraint on the visual system, so changes have a large propagation scope

## Component–State Dependency

- Component Definition → State Definition: All interactive components must have at least default, hover, active, focus, and disabled states defined
- State Definition → Motion Definition: If state transitions exist, the easing and duration of the transition must be defined
- Component Variant Addition → Visual Specification for All States Required: When adding a new variant, all states of that variant must be defined. Partial definition causes arbitrary interpretation during implementation

## Design Tool–Code Dependency

- Design Tool Component → Code Component: Components defined in design tools must be implemented in code. A bidirectional synchronization frequency must be defined
- Design Token → Code Variable: Design tokens are converted to CSS variables, style constants, etc. in code. A conversion pipeline must exist
- When discrepancy occurs: A prior agreement on which side (design tool or code) is the source of truth is needed. Without agreement, discrepancies evolve independently on both sides, causing drift

## Accessibility–Motion Dependency

- Motion Definition → prefers-reduced-motion Support: All elements with motion must have a reduced motion alternative expression defined
- Auto-playing Content → Pause Mechanism: Automatically moving content must be pausable by the user (WCAG 2.2.2)
- Flashing → Restriction: Content that flashes more than 3 times per second can trigger seizures (WCAG 2.3.1)

## Source of Truth Management

- Source of truth for design decisions: Design system documentation (token definitions, component specifications)
- Source of truth for brand-related decisions: Brand guidelines
- Source of truth for accessibility criteria: WCAG official documentation and the organization's accessibility policy
- When sources of truth conflict: Accessibility criteria > Design system > Brand guidelines. Accessibility is a non-negotiable baseline requirement

## Related Documents
- concepts.md — Token, component, color, typography term definitions
- structure_spec.md — Token layers, component layers, design system structure
- logic_rules.md — Color/typography/accessibility/motion logic
