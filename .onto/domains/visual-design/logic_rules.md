---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Logic Rules

Classification axis: **visual construction concern** — rules classified by the visual property they govern.

## Visual Hierarchy Logic

- Visual hierarchy is composed through a combination of size, weight, color, contrast, and position. Using only one means makes the hierarchy weak in distinguishing power. At least 2 means combined (e.g., size + color, weight + position) is the minimum for robust hierarchy
- The number of hierarchy levels should be within the range users can immediately perceive: 3~5 levels. More levels make adjacent levels harder to distinguish. If more than 5 levels are needed, group them into tiers with clear visual separation between tiers
- "When everything is emphasized, nothing is emphasized" — if emphasized elements exceed ~30% of the viewport, the emphasis effect is lost. Emphasis works by contrast with surrounding non-emphasized elements
- Placement that does not consider gaze movement patterns causes failure to perceive critical information. F-pattern: text-heavy pages — users scan the top, then the left side downward. Z-pattern: image-heavy pages — users scan top-left → top-right → bottom-left → bottom-right. Critical information must sit along these paths
- Visual weight distribution must be intentional. Larger, darker, more saturated, more complex, and more isolated elements draw attention. An unintentionally heavy decorative element competes with the primary content
- Case study: a SaaS dashboard placed a large, colorful illustration as decoration in the center of the screen. Users' eyes were drawn to the illustration rather than the KPI metrics in the sidebar. Removing the illustration and applying size + color emphasis to the KPIs resolved the hierarchy failure

## Typography Logic

- Type scale must be based on a consistent ratio. Arbitrary size combinations (14px, 17px, 21px, 28px) break visual rhythm. A 1.25 ratio from 16px base produces: 16, 20, 25, 31.25, 39 — each step is a predictable, harmonious jump
- Typeface pairing follows the contrast principle. Combining two similar typefaces (two geometric sans-serifs) is perceived as "awkward similarity" — the intent is unclear. Clear contrast is needed: sans-serif + serif, geometric + humanist, display + text
- The number of typefaces used in one design system should be 2~3 at most. One for body text, one for headings, optionally one for code or special contexts. More causes visual clutter and consistency burden
- When measure exceeds the optimal range, readability declines. Over 75 characters (English): finding the next line start is difficult. Under 45 characters: excessive line breaks and eye movement. For CJK: 25~35 characters per line
- Insufficient line-height causes characters between lines to collide; excessive line-height breaks the sense of connection between lines. Body text: 1.4~1.6×, headings: 1.1~1.3×. Longer lines need more line-height (toward 1.6); shorter lines need less (toward 1.4)
- Full text justification causes uneven word spacing. Justify on narrow columns (under 40 characters) causes the "river" effect — empty spaces forming visible vertical lines through the text. Left-align is the default for body text; center-align only for short headings or invitations
- Minimum text sizes per context: body text ≥16px (screen), caption/metadata ≥12px, touch interface labels ≥14px. Below 12px, legibility degrades significantly on most screens
- Letter-spacing adjustments by role: headings may use tighter tracking (negative letter-spacing) for a cohesive headline feel; uppercase text and small text should use wider tracking (+0.5~1px) for legibility
- Case study: a news site used 11px body text with 1.2 line-height to fit more content per screen. Mobile readers reported eye strain and high bounce rate on long articles. Increasing to 16px with 1.5 line-height reduced reading time and bounce rate

## Color Logic

- The more colors in a palette, the harder it is to maintain harmony. Basic composition: 1 primary, 1~2 secondary, 1 accent, plus a neutral palette (grays). Total active hues should not exceed 5~7
- In the 60-30-10 ratio, accent color (10%) should be concentrated on user action guidance (CTAs, status indicators). Distributing accent across many purposes dilutes action guidance power
- Complementary color combinations (opposite on the wheel) provide strong contrast but simultaneous use on large areas causes visual vibration and eye strain. One as primary, the other as small accent only
- High-saturation colors on large background areas cause eye fatigue. Low saturation for large surfaces, high saturation for small areas (accents, CTAs). Exception: dark mode surfaces may use more saturated colors due to reduced overall luminance
- Conveying information through color alone is an accessibility violation (WCAG 1.4.1). Red-green color blind users (~8% of males) cannot distinguish error (red) from success (green) by color alone. Supplementary means: different icons (exclamation vs checkmark), text labels, position changes, shape differences
<!-- derived-from: WCAG 2.2, SC 1.4.1 -->
- Color harmony must be based on identifiable color wheel relationships, not arbitrary selection. Analogous (adjacent hues, harmonious but low contrast), complementary (opposite hues, high contrast), triadic (equilateral, vibrant), split-complementary (one base + two adjacent to complement, balanced contrast)
- Dark mode is not a color inversion of light mode. Dark mode requires: (1) separate semantic token mappings, (2) reduced saturation for colored surfaces, (3) elevated surfaces using lighter backgrounds (not darker, as in light mode), (4) all contrast ratios re-verified. Case study: a productivity app auto-inverted its light theme colors. White text on bright yellow backgrounds became unreadable (contrast ratio 1.1:1). A properly designed dark palette resolved this
- Tonal palettes (lightness variations of a single hue) must be perceptually even. Mathematically even steps in sRGB produce perceptually uneven results. OKLCH or CIE LAB color spaces produce better perceptual uniformity

## Accessibility Logic

<!-- derived-from: WCAG 2.2, SC 1.4.3, 1.4.6, 1.4.11 -->
- WCAG contrast ratio criteria: Normal text (under 18px regular / 14px bold): AA requires 4.5:1, AAA requires 7:1. Large text (18px+ regular / 14px+ bold): AA requires 3:1, AAA requires 4.5:1. These are minimum thresholds, not targets — higher contrast is better
- UI components and graphical objects: 3:1 minimum contrast against adjacent colors (WCAG 2.1 SC 1.4.11). This applies to icons, form control borders, focus indicators, chart elements
- Focus indicator requirements: minimum 2px solid outline with 3:1 contrast against adjacent colors. The focus indicator must be visible on all background colors used in the product. Custom focus styles (box-shadow, border) are acceptable if they meet the contrast and size minimums
- Content must not be clipped and functionality must not be lost at 200% text enlargement (WCAG 1.4.4). Layout must reflow — horizontal scrolling for vertical text is a violation
- Minimum touch target size: 44×44px (WCAG 2.5.5 AAA) or 24×24px minimum with ≥24px spacing (WCAG 2.5.8 AA). Adjacent touch targets need sufficient spacing to prevent misclicks
<!-- derived-from: WCAG 2.2, SC 2.5.5, 2.5.8 -->
- When accessibility criteria and brand guidelines conflict → accessibility takes precedence; the brand adjusts. "Our brand blue doesn't meet contrast on white" → adjust the blue, change the background, or change the text color. Lowering accessibility standards is never the solution
- Icons must not be the sole means of conveying information. Every icon should have an accompanying text label, tooltip, or aria-label. An icon-only navigation bar without labels forces users to guess meanings
- Color blindness simulation must be verified for all semantic colors and status indicators. Tools: Sim Daltonism, Stark, Chrome DevTools. The three primary types: protanopia (red-weak), deuteranopia (green-weak), tritanopia (blue-yellow weak)

## Grid and Spacing Logic

- A grid is a constraint, not a prison. Intentional grid breaking is a valid emphasis technique, but the intent must be stated and documented. Arbitrary grid breaking is an error
- Spacing system must use multiples of a consistent base unit. 8px base is the most common: 4, 8, 12, 16, 24, 32, 48, 64. Arbitrary spacing values (15px, 23px, 37px) destroy visual rhythm. 4px may be used for fine adjustments within components
- Gestalt proximity principle: closer elements are perceived as related. Therefore, spacing between related elements must always be narrower than spacing between unrelated elements. If this difference is unclear (e.g., 16px between related items and 20px between unrelated groups), group perception fails. Recommended ratio: inter-group spacing ≥ 2× intra-group spacing
- Gutter size must be less than margin size. If gutters are larger, the separation between content blocks becomes stronger than the page edge separation, visually inverting the structure — content appears to float apart from each other while clinging to the edges
- Baseline grid (based on body text line-height) creates vertical rhythm. All vertical spacing — section gaps, component heights, image heights — should align to multiples of the baseline. This produces a subtle but perceptible sense of order
- Max-width constraints prevent content from stretching beyond readable measure on wide screens. Common max-widths: content area 1200~1440px, text blocks 680~720px (for measure compliance). Without max-width, body text on a 2560px monitor exceeds 200 characters per line

## Icon and Image Logic

- Icon style (outline/filled/duotone) must be consistent within the system. Mixing styles creates visual noise and implies unintended meaning differences. If both outline and filled are used, there must be a documented semantic distinction (outline = inactive, filled = active)
- Icon meaning consistency: once an icon is associated with a concept (gear = settings, bell = notifications), that mapping is permanent within the product. The same icon must not represent different concepts on different screens
- Icon sizing follows a defined scale (e.g., 16, 20, 24, 32px). Each size has a usage context: 16px for inline text, 20px for navigation items, 24px for buttons, 32px for empty states. Sizes outside the scale are prohibited
- Icon optical alignment: mathematically centered icons may appear visually off-center due to shape (e.g., a play triangle appears right-heavy when centered). Optical adjustments (shifting 1~2px) are acceptable and often necessary
- Image aspect ratios must be consistent within the same context. A card grid where images have aspect ratios of 16:9, 4:3, and 1:1 mixed together looks chaotic. Define one ratio per context (e.g., all product cards use 4:3)
- Data visualization charts must not rely on color alone for data series distinction. Use pattern, shape (marker type), or direct labeling in addition to color. A line chart with 4 colored lines and no legend accessible to color-blind users fails accessibility

## Component Logic

- Components with the same function must have the same visual expression (visual consistency principle). "A blue button is sometimes confirm, sometimes cancel" causes user learning failure
- Component states must be visually distinguishable from each other. If the difference between default and hover is minimal (e.g., 2% opacity change), it is functionally equivalent to having no interaction feedback
- The disabled state must convey "exists but unavailable." Complete hiding (display:none) makes interface prediction impossible; looking identical to the default state causes frustration when interaction fails. Standard treatment: 0.4~0.6 opacity or desaturation
- Component variants must be within a manageable range. Review signal: >7 variants with overlapping props. Excessive variants make selection criteria unclear and increase design system complexity. If variants differ only by a single token value (e.g., color), they may be one variant with a color prop, not separate variants
- In Atomic Design, upper layers (Organism and above) are composed of lower layers (Atom, Molecule). If upper layers bypass lower layers and directly include raw visual elements, reusability is lost and updates fail to propagate

## Motion Logic

- Motion duration should be proportional to the element's movement distance and complexity. Small changes (button state, toggle): 100~200ms. Medium changes (panel expand, card flip): 200~400ms. Large changes (page transition, complex layout reflow): 400~700ms. Above 700ms feels sluggish in UI context
- Easing provides physical naturalness. Standard assignments: ease-out for entrances (element arrives and settles), ease-in for exits (element accelerates away), ease-in-out for repositioning (element moves between positions). Linear easing is appropriate only for continuous progress indicators
- Multiple simultaneous animations rapidly increase cognitive load. Limit simultaneous motions to 2. For sequences of 3+, use staggered timing (30~50ms offset between elements)
- If motion does not convey information (state change, spatial relationship, or feedback), it should be removed. "Looking good" is not a sufficient condition for motion to exist. Every animation must answer: "what information does this convey?"
- When prefers-reduced-motion is active: do not completely remove motion. Replace with instant transition (0ms duration or crossfade). The state change must still be communicated — only the animation is removed
- Content that flashes more than 3 times per second can trigger seizures (WCAG 2.3.1). This is an absolute prohibition, not a guideline. Applies to all visual changes including loading animations, GIFs, and video content
<!-- derived-from: WCAG 2.2, SC 2.3.1 -->
- Motion semantics must be consistent: expansion always means "revealing content," collapse always means "hiding," slide-in always means "new context arriving." If expansion means "reveal" on one screen and "error" on another, users cannot build predictive models

## Brand Alignment Logic

- Brand tone and manner is a higher-level constraint on visual element selection. Cold geometric typefaces and desaturated colors contradict a "warm and friendly" brand tone
- Logo clear space violation is never permitted in any context. If space is insufficient, reduce the logo size or change the layout. Never encroach on clear space
- When brand colors must be used in combinations that do not meet accessibility criteria, either adjust the brand colors (preferred) or change the usage context (e.g., brand color as background with white text instead of brand color as text on white). Lowering accessibility standards is not an option
- In co-branding situations where both brands' visual rules conflict, priorities and application scopes must be agreed upon in advance. Without agreement, each designer applies their preferred brand's rules, producing inconsistent results
- Brand visual elements must be applied through the design token system, not as one-off hardcoded values. This ensures brand consistency scales and brand updates propagate automatically
- Case study: a fintech company's brand blue (#1A237E, very dark) failed WCAG AA contrast against dark backgrounds. Rather than using it as text color on gray, they adjusted the usage: brand blue as button background with white text (ratio 9.8:1). Brand identity preserved, accessibility met

## Constraint Conflict Checks

This section governs the resolution of conflicts between competing visual design principles.

### Accessibility vs Brand Identity

- When brand colors do not meet accessibility contrast requirements → accessibility takes precedence. Adjust brand color usage context or modify the color. The brand must accommodate accessibility, not the reverse
- Documentation: when a brand color is adjusted for accessibility, record the original value, the adjusted value, and the usage context

### Consistency vs Contextual Appropriateness

- When applying the same visual pattern everywhere would be inappropriate for a specific context → context may take precedence, but the deviation must be documented
- Example: a design system specifies 8px border-radius for all cards. A card containing a map requires 0px border-radius to prevent the map from being clipped. Document the deviation and the reason

### Visual Density vs Readability

- When dense visual presentation (efficiency) and readability (clarity) conflict → differentiate by audience
  - Expert users: denser layouts, smaller text acceptable (minimum 14px), compact spacing
  - General users: default to generous spacing, 16px+ body text, progressive disclosure for density
- Threshold: body text below 14px on any screen is a readability violation regardless of audience

### Brand Consistency vs Platform Convention

- When brand visual rules conflict with platform guidelines (Material Design, HIG) → platform conventions take precedence for system-level elements (status bar, navigation bar, system controls). Brand rules take precedence for content areas and custom components
- Documentation: record which elements follow platform convention and which follow brand rules

### Aesthetic Quality vs Performance

- When visual richness (high-resolution images, complex animations, custom fonts) conflicts with performance (load time, rendering speed) → prioritize above-the-fold content loading and use progressive enhancement for visual richness below the fold
- Quantitative threshold: custom font loading must not block text rendering for more than 100ms. Use `font-display: swap` or equivalent

### Conflict Resolution Procedure

When two or more rules from this document or from structure_spec.md and dependency_rules.md produce contradictory guidance:

1. **Apply the normative tier ordering** (domain_scope.md §Normative System Classification): Tier-1a > Tier-1b > Tier-2 > Tier-3
2. **Within the same tier, compare enforcement strength**: legal > platform review > design system lint > design review
3. **Document the decision**: record the overridden rule, the prevailing rule, and the rationale

## Design System Logic

### Token Value Propagation

- When a semantic token value changes, the impact scope depends on the number of component tokens referencing it. Before changing any semantic token, enumerate all referencing component tokens and verify that the new value works in every context
- Quantitative threshold: a semantic token referenced by 10+ component tokens is a "high-impact token." Changes to high-impact tokens require visual regression testing across all referencing components. Changes to low-reference tokens (1~3 references) need manual verification
- Case study: a fintech company changed `color-surface-primary` from `gray-50` to `white`. The change propagated to 47 components. Most looked fine, but a card component that used `color-surface-primary` for both the card background and the input field background lost the visual boundary between the two. Adding a separate `color-surface-input` semantic token resolved this

### Token Naming Conflict Resolution

- When two teams independently create tokens for the same concept under different names, the conflict must be resolved by choosing one canonical name, not by keeping both
- Resolution process: (1) identify the semantic overlap, (2) determine which name better expresses the purpose, (3) deprecate the non-canonical name with a migration timeline, (4) update all references
- Prevention: token creation must go through the design system governance process (domain_scope.md §Key Sub-Areas, Governance)

### Component State Distinguishability

- Adjacent states must be visually distinguishable at a glance. If a user cannot tell whether a button is in default or hover state without moving their mouse, the hover state is insufficient
- Minimum distinguishability: the visual difference between adjacent states must be perceptible within 200ms of exposure. This eliminates subtle opacity changes (e.g., 1.0 → 0.95) that are technically different but practically invisible
- State ordering for visual intensity: disabled (least intense) < default < hover < active/pressed (most intense). Focus is orthogonal — it overlays on any other state
- Case study: a design system defined hover as `background: rgba(0,0,0,0.04)` on white. The 4% black overlay was invisible on most monitors. Changing to `background: rgba(0,0,0,0.08)` with a subtle border color shift made hover perceptible

### Visual Regression Prevention

- Design token changes, component variant additions, and state definition updates must be verified against visual regression — unintended visual changes in components that were not deliberately modified
- Regression risk matrix:
  - **High risk**: primitive token change (affects all semantic tokens referencing it), font-family change, base spacing unit change
  - **Medium risk**: semantic token change, component state redefinition, color palette expansion
  - **Low risk**: component token change (affects only one component), new component addition (no existing component affected)

## Spacing Logic (Extended)

### Component-Internal vs Component-External Spacing

- Component-internal spacing (padding) and component-external spacing (margin/gap) serve different purposes and should use different token categories
- Internal spacing: how content is arranged within a component. Controlled by the component itself. Uses component-level spacing tokens
- External spacing: how components relate to each other. Controlled by the layout. Uses layout-level spacing tokens
- Violation: a button component that includes its own external margin (e.g., `margin-bottom: 16px`) forces a specific layout relationship. The layout should control the gap between buttons, not the button itself

### Spacing Scale Ratios

- A well-designed spacing scale has a perceptible difference between adjacent steps. If the scale includes 12px and 16px, the difference (4px, ~25%) is perceivable. If the scale includes 48px and 52px, the difference (4px, ~8%) may not be perceivable
- Practical rule: adjacent spacing values should differ by at least 25% or 4px, whichever is greater, to be visually distinguishable
- Quantitative threshold: spacing scales with more than 12 values → review for over-granulation. Most systems function well with 8~10 values

### Content Density Modes

- Applications serving both expert and general users may need density modes: compact, comfortable, spacious
- Implementation: density modes adjust spacing tokens (not typography or color), producing denser or more generous layouts
- Constraints: compact mode must still meet accessibility thresholds (touch targets ≥ 44×44px, focus indicators visible, text ≥ 12px). Density reduction cannot compromise accessibility

## Typography Logic (Extended)

### Fluid Typography

- Fluid typography uses CSS `clamp()` or equivalent to smoothly scale text between viewport breakpoints, rather than jumping between fixed sizes at breakpoints
- Formula structure: `clamp(min, preferred, max)` where preferred is a viewport-relative value (e.g., `1.5vw + 0.5rem`)
- Constraints: fluid typography must still respect minimum size thresholds (body ≥16px, caption ≥12px). The `min` value in `clamp()` must be the accessibility minimum
- When not to use: body text in narrow columns (the text already has a constrained measure — fluid scaling adds complexity without benefit)

### Font Loading Strategy

- Custom font loading must not block text rendering. Text should be immediately readable with a fallback system font, then swap to the custom font when loaded
- Preferred strategy: `font-display: swap` or `font-display: optional` (the latter prevents layout shift entirely by not swapping if the font loads too late)
- Size-adjust for fallback: use `size-adjust`, `ascent-override`, `descent-override` CSS properties to match the fallback font metrics to the custom font, minimizing layout shift on swap
- Performance threshold: custom font files should total <200KB for the initial page load. Variable fonts often achieve this by replacing multiple static files with one

### Typographic Contrast for Readability

- Beyond typeface pairing, typographic contrast includes weight contrast (regular vs bold), size contrast (body vs heading), and case contrast (sentence case vs uppercase)
- Weight contrast: the difference between body weight and heading weight should be ≥200 units (e.g., 400 body + 700 heading). A 400/500 pairing lacks sufficient contrast for hierarchy
- Size contrast: adjacent type scale levels should differ by at least the scale ratio. If the ratio is 1.25, each level must be 1.25× the previous level — not 1.1× or 1.15×

## SE Transfer Verification

The following SE domain patterns were evaluated for transfer to Visual Design and found to differ in enforcement context:

| SE Pattern | Visual Design Equivalent | Key Difference |
|---|---|---|
| Type system enforcement (compile-time) | Design token enforcement (design-time / lint-time) | SE has compiler enforcement; visual design relies on design tool linting and review |
| State machine determinism | Component state visual completeness | SE verifies via tests; visual design verifies via state audit and visual QA |
| API versioning | Token/component versioning | SE versions at endpoint level; visual design versions at token/component level with visual regression testing |
| Naming conventions | Token naming conventions | SE uses language-level convention enforcement; visual design uses team agreement and lint rules |
| Test coverage | Visual regression coverage | SE measures line/branch coverage; visual design measures component × state coverage |

## Related Documents
- concepts.md — Visual hierarchy, color, typography, accessibility, motion, brand term definitions
- dependency_rules.md — Token–component, color–accessibility, brand–visual system dependency chains
- structure_spec.md — Token layers, component layers, state system, responsive structure
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), cross-cutting concerns
- competency_qs.md — Verification questions linked to each logic rule
