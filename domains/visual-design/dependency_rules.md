---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Dependency Rules

Classification axis: **linkage type** — dependencies classified by the type of relationship between visual design elements and systems.

## Token–Component Dependency

### Token Reference Direction

- Primitive Token → Semantic Token → Component Token: tokens must reference in the direction of lower → upper (unidirectional). If semantic tokens directly contain raw values, theme switching becomes impossible
- Dependency chain: Raw Value → Primitive Token Definition → Semantic Token Reference → Component Token Reference → Component Visual Property
- Violation example: a design system defined `button-bg: #2563EB` directly. When dark mode was added, the blue that worked on white backgrounds became invisible on dark surfaces. Restructuring to `button-bg: color-primary` → `color-primary: blue-500` (light) / `color-primary: blue-300` (dark) resolved this

### Component → Token Binding

- A component's visual properties must reference semantic tokens. Using hardcoded values directly makes consistency maintenance impossible
- Verification: for each component visual property (background, border, text color, shadow, spacing, border-radius), confirm a token reference exists. Hardcoded values = violation
- Case study: a product had 47 distinct button background colors because developers copied hex values from design tool screenshots instead of referencing tokens. Migrating to token references and consolidating to 5 semantic button colors reduced visual inconsistency across 200+ screens

### Semantic Token Change → Propagation

- Changing a semantic token value affects all components referencing that token. Impact scope verification before change is mandatory
- Change chain: Semantic Token Value Change → Identify All Referencing Component Tokens → Verify Each Component's Visual Integrity → Verify Contrast Ratios → Approve Change
- When adding a new token: first verify whether an existing token can express the intent. Unnecessary token growth increases system complexity. Threshold: if a new semantic token is proposed, check whether it is used by 2+ components. Single-use semantic tokens are candidates for component tokens instead

## Typography–Layout Dependency

### Type Scale → Visual Hierarchy

- A type scale must be defined before visual hierarchy between text elements can be established. Without a scale, heading sizes are arbitrary and hierarchy is inconsistent
- Dependency chain: Base Size Selection → Ratio Selection → Scale Generation → Role Assignment (display/h1/h2/h3/body/caption)
- Failure mode: a marketing site defined headings at 32px, 28px, 24px (arbitrary steps). The 28px and 24px levels were nearly indistinguishable. Switching to a 1.25 scale (16, 20, 25, 31.25) produced clear, harmonious size differences

### Type Scale → Spacing System

- Text size provides the basis for surrounding spacing. Larger text requires proportionally more spacing above and below
- Dependency: heading spacing > body text spacing. A heading with the same spacing as body text appears cramped; body text with heading-level spacing appears isolated
- Verification: for each type scale level, confirm that the associated spacing creates visual grouping — text and its content are closer together than text and adjacent sections

### Measure → Grid Column Width

- The optimal readability measure (45~75 characters) constrains grid column width. Grid design must not produce text blocks that exceed or fall far below this range
- Calculation: at 16px body text, average character width is ~8px. Optimal measure (60 characters) = ~480px. A 12-column grid with 24px gutters on a 1440px screen produces ~96px columns; a 5-column text block = ~480px — within range
- Violation example: a 2-column layout on desktop placed body text in columns 1~8 (768px wide), producing ~96 characters per line. Users reported difficulty finding the next line start. Constraining text to columns 1~6 (576px, ~72 characters) resolved the issue

### Typeface Change → Full Typography Re-verification

- Different typefaces have different x-height, character width, and line-height characteristics. Changing a typeface requires re-verification of scale, line-height, measure, and spacing
- Change chain: New Typeface Selection → x-height Comparison → Line-height Adjustment → Measure Re-verification → Spacing Review → Type Scale Tuning → Visual Regression Test
- A typeface with significantly larger x-height than the previous one may make the same pixel size feel larger, requiring scale adjustments across the system

## Color–Accessibility Dependency

### Color Palette → Contrast Verification

- After defining colors, verify that WCAG contrast criteria are met in all usage contexts (text/background, icon/background, UI component/adjacent color)
- Dependency chain: Palette Definition → Usage Context Mapping → Contrast Ratio Calculation → Failure Identification → Color Adjustment or Context Change
- Verification scope: every foreground-background combination in the system, not just the "primary" combinations. Edge cases (light gray text on white, dark blue text on dark gray) are where failures hide

### Color Palette Change → Accessibility Re-verification

- If any color in the palette changes, contrast re-verification of all combinations using that color is needed
- Proportional impact: changing a primary color affects more combinations than changing an accent color. The propagation scope depends on the changed token's reference count
- Case study: a brand refreshed its primary green from `#2E7D32` to `#4CAF50` (lighter, more vibrant). The new green failed contrast (3.2:1) against white backgrounds for normal text. Adding a dark variant `#2E7D32` for text use while keeping `#4CAF50` for large elements resolved the conflict

### Semantic Color → Supplementary Means

- Semantic colors (error, success, warning) must always be accompanied by supplementary means other than color
- Required supplementary means per semantic meaning:
  - Error: red + exclamation icon + descriptive text
  - Success: green + checkmark icon + confirmation text
  - Warning: amber/yellow + warning triangle icon + guidance text
  - Info: blue + info circle icon + explanatory text
- Violation: a form validation system showed only a red border on invalid fields. Color-blind users could not distinguish error fields from normal fields. Adding an error icon and inline error text message resolved this

### Dark Mode Addition → Full Color System Redefinition

- Dark mode is not an inversion of light mode colors. It requires a separate semantic token mapping
- Dark mode specific rules: (1) reduce saturation of colored surfaces, (2) elevated surfaces use lighter backgrounds (opposite of light mode shadows), (3) text colors adjust for comfortable reading on dark backgrounds, (4) all contrast ratios re-verified
- Dependency chain: Dark Mode Decision → Separate Primitive Set (dark) → Semantic Token Remapping → All Component Contrast Re-verification → Image/Icon Adaptation → System Preference Detection

## Brand–Visual System Dependency

### Brand Colors → Color System

- Brand colors constrain the primary/accent colors of the color system. Choosing primary colors unrelated to brand colors violates brand alignment
- Dependency chain: Brand Guideline Colors → Design System Primitive Tokens → Semantic Token Mapping → Component Application
- When brand colors do not form a complete palette (common — brand guidelines define 2~3 colors), the design system extends the palette with neutral colors and complementary/analogous hues derived from the brand colors

### Brand Typeface → Typography System

- When a brand typeface is designated, it constrains typeface selection in the typography system
- Dependency chain: Brand Typeface → Typography System Primary Face → Pairing Typeface Selection → Type Scale Definition
- If the brand typeface has poor screen readability (e.g., a display typeface meant for headings), restrict it to headings and select a complementary readable typeface for body text

### Brand Tone and Manner → Visual Element Choices

- If the tone is "professional and restrained," elaborate illustrations, bright saturated colors, and playful typefaces are inappropriate. Tone constrains all visual choices
- Verification: for each visual element decision (typeface, color, icon style, image style, motion style), confirm alignment with the documented tone. Misalignment = brand drift

### Brand Guideline Change → Full Visual System Review

- Brand identity is a higher-level constraint on the visual system. Changes have a large propagation scope
- Change chain: Brand Guideline Update → Identify All Brand-Coupled Tokens → Re-verify Brand Alignment → Update Design System → Re-verify Accessibility → Propagate to Code → Visual Regression Test
- Transition period: define coexistence duration for old and new brand elements. Without a defined period, both versions proliferate indefinitely

## Component–State Dependency

### Component Definition → State Definition

- All interactive components must have at least 5 states visually defined: default, hover, active, focus, disabled
- Extended states for stateful components: loading, error, selected (total 8 states — see structure_spec.md §State System)
- Failure mode: a toggle switch component defined only default and active states. When users tabbed to it (focus state undefined), there was no visible indication of keyboard focus

### State Definition → Motion Definition

- If visual state transitions exist, the easing and duration of the transition must be defined
- Dependency: state pair → transition definition. Default→Hover: 150ms ease-out. Hover→Active: 100ms ease-in. Any→Focus: instant (0ms or crossfade). Any→Disabled: 200ms ease-out
- Without transition definitions, implementations vary: some developers add 0ms (jarring), others add 500ms (sluggish). Defining transitions prevents this divergence

### Component Variant Addition → All States Required

- When adding a new variant, all states of that variant must be defined. Partial definition causes arbitrary interpretation during implementation
- Verification: variant × state matrix. Every cell must have a visual specification. Empty cells = incomplete definition

## Design Tool–Code Dependency

### Design Tool Component → Code Component

- Components defined in design tools (Figma) must be implementable in code. Bidirectional synchronization frequency must be defined (e.g., weekly token sync, per-sprint component sync)
- Failure mode: Figma components using effects (blur, blend modes) that are not reproducible in CSS without performance impact. Design tool capabilities must be constrained by implementation feasibility

### Design Token → Code Variable

- Design tokens are converted to CSS custom properties, style constants, or platform-specific variables in code. A conversion pipeline must exist (e.g., Style Dictionary, Tokens Studio)
- Dependency chain: Design Token (Figma/JSON) → Token Build Pipeline → CSS Custom Properties / Swift Constants / Kotlin Values → Component Styles
- Without a pipeline, tokens are manually copied — introducing transcription errors and drift over time

### Discrepancy Resolution

- Prior agreement on which side is the source of truth is needed. Without agreement, discrepancies evolve independently, causing drift
- Recommended model: **design system documentation** (not Figma, not code) is the source of truth. Both Figma and code are implementations that must conform to the documentation. When they disagree, the documentation resolves the conflict
- Acceptable discrepancy: implementation-specific adaptations (CSS shadow rendering differs slightly from Figma shadow) within defined tolerance. Unacceptable: different colors, different spacing values, missing states

## Accessibility–Motion Dependency

### Motion Definition → prefers-reduced-motion Support

- All elements with motion must have a reduced-motion alternative defined. This is not optional — it is a WCAG requirement (2.3.3 AAA, widely adopted as AA baseline)
- Dependency chain: Motion Element Identified → Motion Purpose Documented → Reduced-Motion Alternative Defined → prefers-reduced-motion Media Query Implemented → Visual State Change Still Communicated
- The alternative must communicate the same state change without motion. Replace animation with instant transition (opacity crossfade at 0ms or very short duration), not with complete removal
- Violation example: a dashboard used animated bar chart transitions to show data changes. When prefers-reduced-motion was active, bars updated without any visual feedback — users couldn't tell when data refreshed. Adding an instant value change with a brief highlight (background flash without motion) resolved this

### Auto-playing Content → Pause Mechanism

- Automatically moving content (carousels, auto-scrolling feeds, video backgrounds) must be pausable by the user (WCAG 2.2.2)
<!-- derived-from: WCAG 2.2, SC 2.2.2 -->
- Dependency chain: Auto-playing Element Identified → Pause Control Visible → Pause State Persistent → Resume Available
- The pause control must be visible without scrolling or searching. A pause button hidden behind a hover state on the carousel itself is insufficient for keyboard and screen reader users

### Flashing Content → Absolute Restriction

- Content that flashes more than 3 times per second can trigger seizures (WCAG 2.3.1). This is an absolute prohibition
<!-- derived-from: WCAG 2.2, SC 2.3.1 -->
- Scope: all visual changes including animated GIFs, video content, loading animations, and transition effects
- Verification: analyze all animated elements for flash frequency. Tools: Photosensitive Epilepsy Analysis Tool (PEAT)
- No exceptions: this prohibition cannot be overridden by any other design consideration, brand requirement, or stakeholder request

## Responsive–Visual Dependency

### Viewport Size → Typography Adaptation

- Type scale must adapt to viewport size. The same heading size appropriate for desktop (e.g., 48px) may be too large for mobile
- Dependency chain: Viewport Width → Breakpoint Threshold → Type Scale Adjustment → Line-height Re-check → Measure Re-check → Vertical Spacing Adjustment
- Implementation: fluid typography (`clamp()`) or per-breakpoint scale definitions. Both are valid; fluid is smoother but harder to debug
- Constraint: minimum sizes (body ≥16px, caption ≥12px) must be maintained at all viewports

### Viewport Size → Spacing Adaptation

- Spacing values may need to reduce on smaller viewports to maintain content density without horizontal overflow
- Dependency: if spacing remains constant while viewport shrinks, eventually content overflows or becomes cramped
- Approach: define compact spacing scale for mobile (typically 75% of desktop values), but never below touch target minimums

### Viewport Size → Grid Adaptation

- Grid column count and gutter width change at breakpoints. Content must reflow to accommodate fewer columns without information loss
- Dependency chain: Viewport Width → Breakpoint → Column Count Change → Content Reflow → Priority Preservation → Touch Target Verification
- Content loss prohibition: no content may be permanently hidden in responsive transitions. Content may be collapsed, reorganized, or moved to alternative locations, but must remain accessible

## Circular Dependency Detection and Classification

In visual design, some apparent circular dependencies are intentional patterns, while others indicate structural defects.

### Intentional Circular Patterns

- **Token ↔ Theme**: tokens define visual properties; themes redefine token values. This is not a cycle — it is a controlled override mechanism. Management: the token system defines the structure; themes override primitive values only
- **Brand ↔ Design System**: brand guidelines constrain the design system; the design system feeds back into brand guidelines when digital-specific needs arise. Management: brand guidelines are the higher authority for identity decisions; the design system is the higher authority for digital implementation decisions
- **Grid ↔ Typography**: grid column width constrains measure; type scale affects spacing which affects grid gutters. Management: choose one as the starting point (usually type scale) and derive the other

### Unintentional Circular Dependencies (Defects)

- **Token ↔ Token**: semantic token A references semantic token B, and B references A. Resolution: flatten — one must reference a primitive directly
- **Component ↔ Component**: component A's visual spec depends on component B's dimensions, and B depends on A. Resolution: extract the shared dimension into a token
- **Brand ↔ Accessibility**: brand colors adjusted for accessibility fed back into brand guidelines, then brand guidelines re-adjusted for aesthetics, creating a loop. Resolution: establish accessibility as the non-negotiable baseline; brand adjusts once and the result is the new brand color

### Detection Method

For any bidirectional dependency between elements X and Y:
1. **Identify the source of truth**: is there a clear owner? If yes → intentional (document the SoT). If no → defect
2. **Trace the reference chain**: does the chain terminate at a primitive value? If yes → not a cycle. If it loops → defect
3. **Check for infinite loops**: can a token change cascade back to itself? If yes → structural defect regardless of intent

## Referential Integrity

### Token Reference Integrity

- Every semantic token must reference an existing primitive token. Broken references (semantic token pointing to a deleted primitive) produce undefined visual properties
- Every component token must reference an existing semantic token
- Verification: automated token reference validation as part of the design system build pipeline

### Cross-File References

- design_scope.md sub-areas referenced in competency_qs.md must exist and match the CQ-ID mapping
- logic_rules.md sections referenced in competency_qs.md inference paths must exist
- structure_spec.md structural requirements referenced in dependency_rules.md must exist
- Verification: grep all `→` and `§` references and confirm targets exist

### Design Tool–Code References

- Components in Figma must have corresponding code components (or documented exceptions)
- Token values in Figma must match code variables (within defined tolerance)
- Verification: per-sprint comparison of Figma token values vs code custom property values

## Source of Truth Management

### Internal Source of Truth

- **Visual design decisions**: source of truth is the design system documentation (token definitions, component visual specs). Not Figma, not code — documentation
- **Brand visual decisions**: source of truth is the brand guidelines document. If the design system and brand guidelines conflict on a brand element, the brand guidelines prevail
- **Accessibility criteria**: source of truth is WCAG official documentation and the organization's accessibility policy

### External Source of Truth

- **Accessibility standards**: WCAG 2.2 AA (minimum), applicable accessibility laws. Non-negotiable baseline
- **Platform visual guidelines**: Material Design 3 (Android), Apple HIG (iOS/macOS). Define platform-specific visual conventions
- **Color standards**: ICC color profiles for cross-device consistency, Pantone for print

### Conflict Resolution Priority

When sources of truth conflict:

1. **Accessibility standards** (Tier-1a): legal and ethical obligation. Non-negotiable
2. **Platform guidelines** (Tier-1b): enforced by platform review and user expectation
3. **Design system / Brand guidelines** (Tier-2): internal decisions
4. **Industry principles / Heuristics** (Tier-3): guidance when no higher-tier rule applies

Documentation requirement: when a higher-priority source overrides a lower-priority source, document the conflict and resolution.

## SE Transfer Verification

The following SE dependency patterns were evaluated for transfer to Visual Design:

| SE Pattern | Visual Design Equivalent | Key Difference |
|---|---|---|
| Acyclic Dependencies Principle (module DAG) | Token reference direction (primitive → semantic → component, unidirectional) | SE prohibits all cycles; visual design distinguishes intentional override patterns from unintentional cycles |
| Dependency Inversion Principle (depend on abstractions) | Token abstraction (components depend on semantic tokens, not primitive values) | SE uses interfaces; visual design uses semantic tokens as the abstraction layer |
| Stable Dependencies Principle (depend toward stability) | Source of Truth Priority (depend toward higher-tier standards) | SE measures stability by coupling metrics; visual design measures by enforcement mechanism strength |
| Referential Integrity (foreign keys) | Token reference integrity, design tool–code consistency | SE enforces at database level; visual design verifies at build pipeline and design review level |
| Diamond Dependencies (version conflict) | Token conflicts (same semantic token, different primitive values in different themes) | SE resolves with version managers; visual design resolves with theme-scoped token overrides |

## Related Documents
- concepts.md — Token, component, color, typography, brand, motion term definitions
- structure_spec.md — Token layers, component layers, state system, required relationships
- logic_rules.md — Color/typography/accessibility/motion/brand behavioral rules
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), source of truth priority mapping
- competency_qs.md — Dependency-related verification questions (CQ-DS, CQ-SOT, CQ-CO)
