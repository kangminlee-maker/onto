---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Visual Design Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.

Classification axis: **Verification concern** — Classified by the concern that must be addressed during visual design system review.

## Visual Hierarchy and Composition

- Q1: Is the order of information importance in {target design} clearly conveyed through visual means (size, color, contrast, position)?
- Q2: Are Gestalt principles (proximity, similarity, continuity, closure) consistently applied to group related elements?
- Q3: Is negative space (whitespace) intentionally designed to provide visual breathing room and element separation?
- Q4: Are CRAP principles (Contrast, Repetition, Alignment, Proximity) each applied to the layout?

## Grid and Layout

- Q5: Is a grid system (columns, gutters, margins) defined and consistently applied to content placement?
- Q6: Are responsive design breakpoints defined, and does the layout transform as intended at each interval?
- Q7: Is a spacing system defined and applied consistently in uniform units (8pt, etc.)?

## Typography

- Q8: Is the rationale for typeface selection (medium, content type, target users) stated?
- Q9: Is the type scale (size steps) defined on a ratio basis, and are hierarchical levels (heading/body/caption) distinguished?
- Q10: Do line-height and measure meet readability criteria?
- Q11: Is the balance of contrast and harmony in typeface pairing explained?
- Q12: Is typeface fallback defined for CJK or other scripts in a multilingual environment? (if applicable)

## Color

- Q13: Is a color system (palette) defined with roles distinguished for primary/secondary/accent colors?
- Q14: Are semantic colors (success, error, warning, info) defined and separated from raw color values?
- Q15: Do color combinations meet the WCAG contrast ratio criteria (4.5:1 for normal text, 3:1 for large text)?
- Q16: Are supplementary means (shape, text, icons) provided alongside color for conveying meaning?
- Q17: If dark mode/theme switching is needed, is it designed based on semantic tokens? (if applicable)

## Icons and Images

- Q18: Is the icon style (outline/filled/duotone) unified, and is a size system defined?
- Q19: Are icon meanings used consistently? (Is the same icon not used with different meanings?)
- Q20: Is a style guide for images/illustrations defined? (if applicable)

## Design System

- Q21: Are design tokens defined with primitive/semantic/component layers distinguished?
- Q22: Are visual specifications for components defined per state (default, hover, active, focus, disabled)?
- Q23: Are component variants defined with usage criteria specified?
- Q24: Is a synchronization method between design tool (Figma, etc.) components and code components defined?
- Q25: Is design system governance (add/change/deprecation procedures) defined? (if applicable)

## Accessibility

- Q26: Is WCAG 2.1 AA or above explicitly stated as the applicable accessibility standard?
- Q27: Does the focus indicator provide sufficient visual clarity (2px or more, 3:1 contrast) during keyboard navigation?
- Q28: Is accommodation for color blindness designed?
- Q29: Is prefers-reduced-motion support included for motion/animation? (if applicable)

## Brand Alignment

- Q30: Are visual elements (colors, typefaces, image styles) consistent with the brand identity (tone and manner)?
- Q31: Are logo usage rules (minimum size, clear space, prohibited modifications) defined and followed?
- Q32: Are brand application rules defined per medium (digital/print/environmental)? (if applicable)

## Motion and Interaction

- Q33: Is the purpose of motion/animation (feedback/transition/guidance) stated? (if applicable)
- Q34: Is an easing curve and duration system defined? (if applicable)
- Q35: Do micro-interactions provide immediate feedback to user actions? (if applicable)

## Source of Truth

- Q36: Is an authoritative standard for design decisions (design system, brand guidelines) designated?
- Q37: Is it defined which takes precedence when design tool and code implementation disagree?

## Related Documents
- domain_scope.md — Higher-level definition of the areas covered by these questions
- logic_rules.md — Rules related to color/typography/accessibility/brand
- structure_spec.md — Structure-related rules
