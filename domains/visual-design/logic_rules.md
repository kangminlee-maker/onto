---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Visual Design Domain — Logic Rules

## Visual Hierarchy Logic

- Visual hierarchy is composed through a combination of size, weight, color, contrast, and position. Using only one means makes the hierarchy weak in distinguishing power
- The number of hierarchy levels should be within the range users can immediately perceive (generally 3~5 levels). More levels make adjacent levels harder to distinguish
- "When everything is emphasized, nothing is emphasized" — If emphasized elements exceed 30% of the screen, the emphasis effect is lost
- Placement that does not consider gaze movement patterns (F-pattern, Z-pattern, etc.) causes failure to perceive critical information

## Typography Logic

- Type scale must be based on a consistent ratio. Arbitrary size combinations break visual rhythm
- Typeface pairing follows the contrast principle. Combining two similar typefaces is perceived as "awkward similarity," making the intent unclear. Clear contrast is needed, such as sans-serif + serif, geometric + humanist
- The number of typefaces used in one design system should be 2~3 at most. Exceeding this causes visual clutter and reduced consistency
- When measure exceeds the optimal range (over 75 characters for English, under 45 characters), readability declines. If measure is too long, finding the next line is difficult; if too short, gaze movement is excessive
- Insufficient line-height causes characters between lines to collide, while excessive line-height breaks the sense of connection between lines. Body text at 1.4~1.6x is the general range
- Full text justification causes uneven word spacing. Justify on narrow columns causes the "river" effect (empty spaces running vertically)

## Color Logic

- The more colors in a palette, the harder it is to maintain harmony. The basic composition is 1 primary, 1~2 secondary, and 1 accent color
- In the 60-30-10 ratio, accent color (10%) should be concentrated on user action guidance (CTA, etc.). Distributing accent across multiple uses reduces action guidance power
- Complementary combinations provide strong contrast, but simultaneous use on large areas causes visual vibration. Limit one as primary and the other as accent
- Using high-saturation colors widely on backgrounds causes eye fatigue. Low saturation for large areas, high saturation for small areas (accents) is appropriate
- Conveying information through color alone is an accessibility violation (WCAG 1.4.1). Red-green color blind users (approximately 8% of males) may not distinguish error (red) from success (green)

## Accessibility Logic

- WCAG contrast ratio criteria: Normal text (under 18px) 4.5:1 or above, large text (18px or above, or 14px bold or above) 3:1 or above. These are AA criteria; AAA is 7:1 and 4.5:1 respectively
- Focus indicator is the only visual feedback for keyboard navigation. Without a focus indicator or with an unclear one, keyboard user navigation is impossible
- Content must not be clipped and functionality must not be lost at 200% text size enlargement (WCAG 1.4.4)
- Minimum touch target size: 44×44px (WCAG 2.5.5 AAA) or 24×24px (WCAG 2.5.8 AA). Spacing between adjacent touch targets must also be considered
- Automatically moving or flashing content must provide a pause mechanism (WCAG 2.2.2). Flashing more than 3 times per second can trigger seizures (WCAG 2.3.1)
- When accessibility and aesthetics conflict, accessibility takes precedence. Accessibility is not "nice to have" but "without it, the product is unusable"

## Grid and Spacing Logic

- A grid is a constraint, not a prison. Intentional grid breaking is a valid emphasis technique, but the intent must be stated
- Spacing system must be multiples of a consistent base unit. 8px base is common (4, 8, 12, 16, 24, 32, 48, 64). Arbitrary spacing destroys visual rhythm
- Gestalt proximity principle: Closer elements are perceived as related. Therefore, spacing between related elements must always be narrower than spacing between unrelated elements. If this difference is unclear, group perception fails
- If gutter size is larger than margin, the separation between content blocks becomes stronger than page edge separation, visually inverting the structure

## Component Logic

- Components with the same function must have the same visual expression (consistency principle). "A blue button is sometimes confirm, sometimes cancel" causes user learning failure
- Component states must be visually distinguishable. If the difference between default and hover is minimal, it is the same as having no interaction feedback
- The disabled state must convey "exists but unusable." Completely hiding (hidden) makes interface prediction impossible; looking identical to the normal state causes frustration on use failure
- The number of component variants must be within a manageable range. Excessive variants make selection criteria unclear and increase design system complexity
- In Atomic Design, upper layers (Organism and above) are composed of lower layers (Atom, Molecule). If upper layers bypass lower layers and directly include raw elements, reusability is lost

## Motion Logic

- Motion duration should be proportional to the element's movement distance and complexity. Small changes (button state) are 100~200ms; large changes (page transition) are 300~500ms
- Easing provides physical naturalness. Linear easing feels mechanical; ease-out is appropriate for appearances, ease-in for exits
- Multiple simultaneous animations rapidly increase cognitive load. Limit simultaneous motions to 2 or run them sequentially (stagger)
- If motion does not convey information, it should be removed. "Looking good" is not a sufficient condition for motion to exist
- When prefers-reduced-motion is set, do not completely remove motion but replace with instant transition (0ms or minimal time). The state change itself must still be communicated

## Brand Alignment Logic

- Brand tone and manner is a higher-level constraint on visual element selection. Cold tones and geometric typefaces contradict a "warm and friendly" brand
- Logo clear space violation is never permitted in any context. If space is insufficient, reduce the logo or change the layout
- When brand colors must be used in combinations that do not meet accessibility criteria, either adjust the brand colors or change the usage context. Lowering accessibility standards is not a solution
- In co-branding, when both brands' visual rules conflict, priorities and application scopes must be agreed upon in advance

## Constraint Conflict Checks

- When accessibility criteria and brand guidelines conflict → Accessibility takes precedence; the brand side adjusts
- When aesthetics and readability conflict → Readability takes precedence. An unreadable design cannot achieve its purpose
- When consistency and contextual appropriateness conflict → Context may take precedence over consistency, but the deviation reason must be documented
- When design system norms and a specific screen's requirements conflict → Extending the design system (adding new variants) is preferred. One-off exceptions erode the system
- When motion richness and accessibility (reduced motion) conflict → Provide alternative expressions to achieve coexistence

## Related Documents
- concepts.md — Visual hierarchy, color, typography, accessibility term definitions
- dependency_rules.md — Token–component, color–accessibility dependency rules
- competency_qs.md — Verification questions linked to each logic rule
