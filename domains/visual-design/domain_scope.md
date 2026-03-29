---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# Visual Design Domain — Domain Scope Definition

This domain applies when **reviewing** visual design systems (design systems, brand identity, UI/UX visual elements, print/digital media design).
It identifies "what should be there but is missing" based on core principles and systems of visual design.

## Key Sub-Areas

Classification axis: **Visual design concern** — Classified by the design concern that the visual system must address.

### Typography
- **Typeface System** (required): Typeface selection rationale, typeface hierarchy (heading/body/caption), typeface pairing principles
- **Type Scale** (required): Size steps (type scale), line-height, letter-spacing, word spacing
- **Readability** (required): Distinction between readability (comfort of reading) and legibility (character recognizability), optimal conditions per medium
- **Multilingual Typography** (if applicable): CJK typesetting, RTL support, script-specific typeface fallbacks

### Color
- **Color System** (required): Color palette composition, primary/secondary/accent color definition, color ratio (60-30-10, etc.)
- **Color Theory** (required): Color wheel, color harmony (complementary/analogous/triadic), color psychology
- **Accessibility** (required): WCAG contrast ratio criteria, color blindness accommodation
- **Dark Mode/Themes** (if applicable): Light/dark theme switching, semantic color definition

### Layout and Composition
- **Grid System** (required): Column grid, modular grid, gutters, margins, responsive breakpoints
- **Composition Principles** (required): Visual hierarchy, proximity, alignment, repetition, contrast — CRAP principles
- **Whitespace** (required): Intentional use of negative space, spacing scale
- **Responsive Design** (if applicable): Layout variations per viewport, fluid typography, adaptive components

### Iconography and Imagery
- **Icon System** (required): Icon style (outline/filled/duotone), size system, grid-based design, meaning consistency
- **Image Usage Principles** (if applicable): Photo/illustration style guide, image ratios, cropping rules
- **Data Visualization** (if applicable): Chart type selection criteria, data-ink ratio (Tufte), visual encoding principles

### Motion and Interaction
- **Motion Principles** (if applicable): Animation purpose (feedback/transition/guidance), easing curves, duration system
- **Interaction Patterns** (if applicable): Micro-interactions, state transitions (hover/active/focus/disabled), gesture patterns
- **Accessibility Motion** (if applicable): prefers-reduced-motion support, vestibular disorder considerations

### Brand Identity
- **Brand Visual Elements** (required): Logo usage rules (minimum size, clear space, prohibited modifications), brand colors, brand typefaces
- **Brand Tone and Manner** (required): Visual tone, mood, intended impression definition
- **Medium-Specific Application** (if applicable): Print/digital/environmental graphic application rules, co-branding rules

### Design System
- **Tokens** (required): Design tokens — primitive and semantic value definitions for color, typography, spacing, shadow, etc.
- **Components** (required): Visual specifications for reusable UI components, per-state representations, variants
- **Patterns** (if applicable): Recurring solution patterns composed of component combinations (form, navigation, card layout, etc.)
- **Governance** (if applicable): Design system contribution/change/deprecation procedures, version management

### Accessibility
- **Visual Accessibility** (required): Contrast ratio, text size, focus indicator, information delivery means beyond color
- **Cognitive Accessibility** (if applicable): Information overload prevention, consistent navigation, clear labeling
- **Legal Standards** (reference): WCAG 2.1/2.2 AA or above, Section 508, EN 301 549, etc. by jurisdiction

## Required Concept Categories

Concept categories that must be addressed in any visual design system.

| Category | Description | Risk if Missing |
|----------|------------|----------------|
| Visual hierarchy | System for conveying information importance through visual means | Users cannot find critical information |
| Color system | Rules for color selection, combination, and meaning assignment | Visual inconsistency, accessibility violations |
| Type system | Rules for typeface, size, line-height, letter-spacing | Readability degradation, information delivery failure |
| Spacing system | Rules for distance between elements | Absence of visual rhythm, unclear relationships |
| Consistency | Principle of applying the same visual expression for the same meaning | Increased learning cost, reduced trust |
| Accessibility | Design enabling users of diverse abilities to access information | User exclusion, legal violations |
| Brand alignment | Degree to which visual elements match brand identity | Brand recognition confusion |
| Source of truth | Authoritative standard for design decisions (design system, brand guidelines) | Visual inconsistency proliferation |

## Reference Standards/Frameworks

| Standard/Framework | Application Area | Core Content |
|-------------------|-----------------|--------------|
| Gestalt Principles | Composition/layout | Proximity, similarity, continuity, closure, figure-ground separation |
| WCAG 2.1/2.2 | Accessibility | 4 principles: perceivable, operable, understandable, robust |
| Material Design | Design system | Google's design language — tokens, components, motion system |
| Human Interface Guidelines | Design system | Apple platform design principles and patterns |
| Modular Scale | Typography | Ratio-based size step system (e.g., 1.25 scale) |
| 8pt Grid | Layout/spacing | 8px unit-based spacing and sizing system |
| Color Universal Design (CUD) | Color/accessibility | Color design considering color vision diversity |
| Atomic Design | Design system | Atom → Molecule → Organism → Template → Page, 5 layers |

## Bias Detection Criteria

- If 3 or more of the 8 concern areas are not represented at all → **insufficient coverage**
- If definitions in a specific area account for more than 70% of the total → **bias warning**
- If only color is defined and typography system is missing → **basic system imbalance**
- If only components are defined and tokens are missing → **abstraction layer missing** (consistency maintenance impossible without tokens)
- If only visual elements are defined and accessibility criteria are missing → **accessibility gap**
- If a visual system exists without brand guidelines → **brand basis absent**
- If only digital is covered while print/environmental media are applicable but missing → **media bias**
- If 2 or more core visual elements have no designated source of truth → **authority undesignated**
- If only static states are defined without state transitions (hover, active, disabled, etc.) → **interaction state missing**

## Related Documents
- concepts.md — Term definitions within this scope
- structure_spec.md — Visual design system structural requirements
- competency_qs.md — Questions this scope must be able to answer
