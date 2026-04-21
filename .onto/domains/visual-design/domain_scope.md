---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing."
This domain applies when **reviewing** visual design systems (design systems, brand identity, UI/UX visual elements, print/digital media design).
It identifies "what should be there but is missing" based on core principles and systems of visual design.

> **Boundary with ui-design domain**: ui-design covers "the structure through which the interface accommodates user intent and communicates results." This domain covers "the visual expression system" — color, typography, composition, layout, branding, iconography, motion aesthetics. Button placement, feedback timing, and disabled-state logic are ui-design's jurisdiction; button color, typeface, border-radius, and hover color shift are this domain's jurisdiction.

## Key Sub-Areas

Classification axis: **Visual design concern** — Classified by the design concern that the visual system must address.

Applicability markers:
- **(required)**: Must be addressed in any visual design system review. Absence indicates a fundamental gap
- **(when applicable)**: Address when the system's feature set includes the relevant pattern. Condition type: feature existence (binary)
- **(scale-dependent)**: Becomes required beyond a scale threshold documented per item. Condition type: scale threshold (quantitative boundary crossed)

`(when applicable)` and `(scale-dependent)` are **mutually exclusive** (ME). If a concern depends on both feature presence and scale, split it into two statements.

### Typography
- **Typeface System** (required): Typeface selection rationale, typeface hierarchy (heading/body/caption/code), typeface pairing principles, fallback stacks
- **Type Scale** (required): Size steps based on a ratio (e.g., Minor Third 1.2, Perfect Fourth 1.333), minimum/maximum size per viewport
- **Readability** (required): Line-height per text role, measure (line length) constraints, letter-spacing rules, readability vs legibility distinction
- **Multilingual Typography** (when applicable): CJK typesetting rules, RTL script handling, script-specific typeface fallbacks, text expansion accommodation
- **Variable Fonts** (when applicable): Axis usage (weight, width, optical size), performance trade-offs vs multiple static files

### Color
- **Color System** (required): Color palette composition, primary/secondary/accent definition, color ratio (60-30-10), neutral palette
- **Color Theory** (required): Color wheel relationships, harmony rules (complementary/analogous/triadic/split-complementary), color psychology by context
- **Accessibility** (required): WCAG contrast ratio criteria (AA and AAA), color blindness accommodation, supplementary means beyond color
- **Dark Mode/Themes** (when applicable): Light/dark theme switching via semantic tokens, elevation model inversion, image/icon adaptation per theme
- **Data Visualization Colors** (when applicable): Sequential, diverging, and categorical palettes, colorblind-safe palette requirements

### Layout and Composition
- **Grid System** (required): Column grid (4/8/12), modular grid, gutters, margins, max-width constraints
- **Composition Principles** (required): Visual hierarchy, Gestalt principles (proximity, similarity, continuity, closure, figure-ground), CRAP principles
- **Spacing System** (required): Base unit (4px or 8px), spacing scale, intentional whitespace rules
- **Responsive Layout** (required): Breakpoint definitions, fluid vs fixed widths, content reflow rules per viewport
- **Print Layout** (when applicable): Bleed, trim, safe area, fold considerations, CMYK conversion rules

### Iconography and Imagery
- **Icon System** (required): Icon style (outline/filled/duotone), size system (16/20/24/32px), grid-based design, meaning consistency
- **Image Usage Principles** (when applicable): Photo/illustration style guide, aspect ratios, cropping rules, image quality thresholds
- **Data Visualization** (when applicable): Chart type selection criteria, data-ink ratio (Tufte), visual encoding principles (position, length, area, color)

### Motion and Animation
- **Motion Principles** (when applicable): Animation purpose classification (feedback/transition/guidance/decoration), easing curve system, duration system
- **Micro-interaction Visuals** (when applicable): State transition animations (hover/active/focus), loading animations, success/error feedback animations
- **Accessibility Motion** (required): prefers-reduced-motion support, vestibular disorder considerations, flashing content prohibition (WCAG 2.3.1)

### Brand Identity
- **Brand Visual Elements** (required): Logo usage rules (minimum size, clear space, prohibited modifications), brand colors, brand typefaces
- **Brand Tone and Manner** (required): Visual tone definition via adjective pairs, mood boards, intended impression
- **Medium-Specific Application** (when applicable): Print/digital/environmental graphic rules, co-branding rules, social media asset rules
- **Brand Architecture** (scale-dependent): Sub-brand visual relationships, endorsed vs monolithic branding. Scale threshold: 2+ distinct brand identities managed

### Design System
- **Tokens** (required): Design tokens — primitive/semantic/component layers for color, typography, spacing, shadow, border-radius, z-index
- **Components** (required): Visual specifications for reusable UI components, per-state visual representations, variant definitions
- **Patterns** (scale-dependent): Recurring visual compositions (card layouts, hero sections, data display patterns). Scale threshold: component count >20
- **Governance** (scale-dependent): Design system contribution/change/deprecation procedures, version management, adoption tracking. Scale threshold: 2+ contributing teams

### Accessibility
- **Visual Accessibility** (required): Contrast ratio, minimum text size, focus indicator design, information delivery means beyond color
- **Cognitive Accessibility** (when applicable): Information overload prevention via visual hierarchy, consistent visual patterns, clear visual labeling
- **Legal Standards** (reference): WCAG 2.1/2.2, Section 508, EN 301 549, ADA — by jurisdiction

## Normative System Classification

Standards governing visual design operate at four distinct tiers with different enforcement mechanisms.

| Tier | Name | Enforcement Mechanism | Change Velocity | Examples |
|------|------|----------------------|-----------------|---------|
| Tier-1a | Accessibility Standards | **Legal obligation** + browser/AT enforcement | Slow (years) | WCAG 2.2 contrast (1.4.3, 1.4.6, 1.4.11), color-only info prohibition (1.4.1), text resize (1.4.4), flashing (2.3.1) |
| Tier-1b | Platform Visual Standards | **OS/app store review** + device rendering constraints | Slow (years) | Apple HIG Dynamic Type, Material Design color system mandatory specs, system font rendering |
| Tier-2 | Design System / Brand Guidelines | Design system linting/tokens, brand compliance review | Medium (quarterly) | Internal design tokens, brand style guide, component visual specs |
| Tier-3 | Industry Principles / Heuristics | Design review, visual QA | Fast (per project) | Gestalt Principles, 60-30-10 rule, type scale ratios, 8pt grid convention |

**Ordering principle**: Binding force determines priority: **Tier-1a > Tier-1b > Tier-2 > Tier-3**. When rules from different tiers conflict, the higher tier prevails.

Tier classification decision tree:
1. **Tier-1a**: Would non-conformance create an accessibility/legal violation?
2. **Tier-1b**: If not Tier-1a, is the rule enforced by OS rendering, device constraints, or app store visual requirements?
3. **Tier-2**: If not Tier-1a/1b, is the rule enforced by an internal design system, token system, or brand compliance process?
4. **Tier-3**: If none of the above, treat it as an industry convention or visual design heuristic

**Visual-design-specific enforcement mechanisms** (distinct from ui-design's interaction-focused mechanisms):
- **Tier-1a**: Automated contrast checkers (axe-core, Stark), WCAG compliance audits, browser text-resize enforcement
- **Tier-1b**: App store screenshot review, OS-level Dynamic Type / text scaling enforcement, system dark mode API
- **Tier-2**: Design token linting (Stylelint with token rules), Figma design lint plugins, brand compliance checklists
- **Tier-3**: Design critique sessions, visual QA by inspection, style guide adherence review — no automated enforcement

### Source of Truth Priority Mapping

| Existing SoT Priority (dependency_rules.md) | Tier Mapping | Rationale |
|---------------------------------------------|-------------|-----------|
| Accessibility standards (WCAG) | **Tier-1a** | Legal obligation + browser/AT enforcement |
| Brand guidelines | **Tier-2** | Internal enforcement via brand review |
| Design system documentation | **Tier-2** | Internal enforcement via token linting |

### Relationship Between Tier and Abstraction Layer (L)

The normative tier axis is defined here. The abstraction layer axis (`[L1]`/`[L2]`/`[L3]`) is defined in concepts.md. The two are independently defined but not all combinations are occupied:

| | L1 (Standard/Specification) | L2 (Principle/Convention) | L3 (Practice/Tool-Specific) |
|---|---|---|---|
| **Tier-1a** | WCAG 2.2 contrast spec, color-only prohibition | WCAG interpretation guidelines | (empty) |
| **Tier-1b** | OS font rendering specs, Dynamic Type API | Platform visual adaptation patterns | (empty) |
| **Tier-2** | Design token specification format | Token hierarchy conventions | Team-specific token naming |
| **Tier-3** | (empty) | Gestalt principles, color theory, type scale ratios | Project-specific visual decisions |

## Cross-Cutting Concerns

Cross-cutting concerns span multiple Key Sub-Areas. Defined here because their enforcement points are distributed across multiple files.

Admission criteria:
- Spans **3 or more** Key Sub-Areas
- No single sub-area can own the concern without hiding enforcement points
- Creates a reusable verification lens (CQ-worthy)

Scale guardrail: if cross-cutting concerns exceed **Key Sub-Areas / 3**, revisit taxonomy.

### Visual Consistency

Identical visual concepts must have identical visual representations; deviations must be intentional and justified. Three sub-types:

1. **Internal consistency** (same visual expression for the same meaning within the product):
   - Enforcement: logic_rules.md §Constraint Conflict Checks + structure_spec.md §Required Relationships
   - Detection: visual element inventory comparison

2. **External consistency** (conformance to platform and industry visual conventions):
   - Enforcement: domain_scope.md §Reference Standards/Frameworks + dependency_rules.md §Source of Truth Management
   - Detection: comparison against platform guidelines and industry patterns

3. **Intentional deviation with rationale requirement**: deviation must document why it provides a better outcome.
   - Enforcement: logic_rules.md §Constraint Conflict Checks
   - Detection: deviation audit

### Accessibility Conformance

Spans Color, Typography, Motion, Layout, Iconography. The visual system must meet accessibility standards across all visual elements, not just color.

- Color: contrast ratios, supplementary means (structure_spec.md §Required Relationships)
- Typography: minimum size, resize support (logic_rules.md §Typography Logic)
- Motion: reduced-motion support (logic_rules.md §Motion Logic)
- Layout: reflow at 200% zoom (structure_spec.md §Responsive Structure)
- Iconography: meaning not conveyed by icon alone without text label (logic_rules.md §Accessibility Logic)

## Required Concept Categories

| Category | Description | Risk if Missing | Example of Failure |
|----------|------------|----------------|-------------------|
| Visual hierarchy | System for conveying information importance through visual means | Users cannot find critical information | Dashboard with 12 equally-sized metrics in same color; users scan randomly, miss the one KPI that requires action |
| Color system | Rules for color selection, combination, and meaning assignment | Visual inconsistency, accessibility violations | Product uses 23 shades of blue with no defined palette; dark mode conversion produces unreadable text on 8 screens |
| Type system | Rules for typeface, size, line-height, letter-spacing | Readability degradation, information delivery failure | Marketing site uses decorative typeface at 12px for body text; mobile bounce rate increases significantly |
| Spacing system | Rules for distance between elements | Absence of visual rhythm, unclear relationships | Card grid uses 5 different gap values (8, 12, 15, 20, 24px); elements appear randomly placed |
| Visual consistency | Same visual expression for the same meaning | Increased learning cost, reduced trust | "Primary" buttons are blue on 3 screens, green on 2, and purple on 1; users hesitate before clicking |
| Accessibility | Design enabling users of diverse abilities to access visual information | User exclusion, legal violations | Error messages conveyed only by red text color; 8% of male users with red-green color blindness cannot identify errors |
| Brand alignment | Degree to which visual elements match brand identity | Brand recognition confusion | Sub-product uses a different typeface and color palette with no documented reason; users question whether it is the same brand |
| Source of truth | Authoritative standard for visual design decisions | Visual inconsistency proliferation | Design team and development team each maintain separate color values; 15 of 40 tokens have diverged over 6 months |

## Reference Standards/Frameworks

This file is the **single source of truth for external standard version information** within the visual-design domain. Other files reference standards without version numbers; the version in this table governs.

| Standard/Framework | Version | Application Area | Core Content | When to Apply |
|-------------------|---------|-----------------|--------------|---------------|
| WCAG | 2.2 (2023) | Accessibility | Contrast ratios (1.4.3, 1.4.6, 1.4.11), color-only prohibition (1.4.1), text resize (1.4.4), flashing (2.3.1) | Every visual design review |
| Material Design | 3 (2023) | Design system | Color system (dynamic color, tonal palettes), typography (type scale), motion (easing, duration) | Android (mandatory); others (reference) |
| Apple HIG | 2024 | Design system | Dynamic Type, SF Symbols, vibrancy, materials, system colors, dark mode | iOS/macOS (mandatory); others (reference) |
| Gestalt Principles | — | Composition/layout | Proximity, similarity, continuity, closure, figure-ground, common fate | Every layout/composition review |
| Modular Scale | — | Typography | Ratio-based size step system (Minor Third 1.2, Major Third 1.25, Perfect Fourth 1.333) | Type scale definition |
| 8pt Grid | — | Layout/spacing | 8px unit-based spacing and sizing system (4px for fine adjustments) | Spacing and layout review |
| Color Universal Design (CUD) | — | Color/accessibility | Color design considering color vision diversity | Color palette review |
| Atomic Design | — | Design system | Atom → Molecule → Organism → Template → Page, 5 layers | Component architecture review |
| Design Tokens W3C | Community Group Draft (2023) | Design system | Platform-agnostic token format specification (JSON) | Token system review |
| ICC Color Profile | v4 (2004) | Color management | sRGB, Display P3 color spaces, cross-device color consistency | Print and cross-device color review |

### External-Standard Derivation Markers

Rules materially derived from external standards carry grep-friendly source markers in their owner files:

- `<!-- derived-from: WCAG 2.2, SC 1.4.3 -->`
- `<!-- derived-from: Material Design 3, Color system -->`

Marker usage: add when the rule would need review if the standard version changes. Keep the marker in the rule-owning file.

## Bias Detection Criteria

A triggered criterion indicates a review coverage problem, not necessarily a design defect.

### Coverage Distribution

- If 3 or more of the 8 Key Sub-Areas are not represented at all → **insufficient coverage** (threshold: ⌈8 / 2.5⌉ = 4, using 3 for visual design's tighter coupling)
- If definitions in a specific area account for >70% of the total → **bias warning**

### System Balance

- If only color is defined and typography system is missing → **basic system imbalance**
- If only components are defined and tokens are missing → **abstraction layer missing** (consistency maintenance impossible without tokens)
- If a visual system exists without brand guidelines → **brand basis absent**
- If only static states are defined without state transitions (hover, active, disabled) → **interaction state missing**

### Media and Context

- If only digital is covered while print/environmental media are applicable but missing → **media bias**
- If only light mode is defined when dark mode is required → **theme coverage gap**
- If only desktop visual specs exist when mobile is applicable → **viewport bias**

### Governance and Authority

- If 2 or more core visual elements have no designated source of truth → **authority undesignated**
- If animation is present but no motion system or `prefers-reduced-motion` is evaluated → **animation excess without governance**
- If design tool (Figma) and code implementation have no synchronization method defined → **tool-code drift risk**

## Inter-Document Contract

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Dependency direction rules | dependency_rules.md | structure_spec.md (references only) |
| Source of Truth priority | dependency_rules.md §Source of Truth Management | domain_scope.md (tier mapping) |
| Concept definitions and synonyms | concepts.md | All other files reference, do not redefine |
| Structural coherence rules | structure_spec.md §Required Relationships | Other files reference |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Competency questions | competency_qs.md | Other files provide inference path targets |
| Behavioral quantitative thresholds | logic_rules.md | structure_spec.md (structural thresholds only) |
| External-standard derivation markers | owner file of each derived rule | domain_scope.md (version SSOT only) |
| Constraint conflict resolution | logic_rules.md §Constraint Conflict Checks | dependency_rules.md (cascading failures) |
| Visual consistency (cross-cutting) | domain_scope.md §Cross-Cutting Concerns | logic_rules.md, structure_spec.md, dependency_rules.md |

### Required Substance per Sub-area

Each sub-area in Key Sub-Areas must have corresponding substance in at least one of:
- concepts.md: term definitions
- logic_rules.md or structure_spec.md or dependency_rules.md: operational rules
- competency_qs.md: verification questions

A sub-area with declaration but no substance in any file is a "ghost sub-area."

### Cross-cutting Concern Attribution

When a concern spans multiple sub-areas, attribute to the sub-area with the **primary enforcement point**:

1. **Primary enforcement point**: the sub-area whose rules would be violated. Example: contrast ratio spans Color and Accessibility. Primary: Accessibility (WCAG violation is the enforcement driver)
2. **Secondary references**: other sub-areas reference primary rules, do not duplicate
3. **Tie-breaking**: if enforcement equally distributed, attribute to the sub-area with fewer existing items

### Classification Axis Relationships

| File | Axis | Facet |
|---|---|---|
| domain_scope.md | Visual design concern | What design concerns exist (scope) |
| logic_rules.md | Visual construction concern | What concerns are governed by behavioral rules |
| competency_qs.md | Verification concern | What concerns must be verified |

### Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Typography | CQ-T | Full |
| Color | CQ-C | Full |
| Layout and Composition | CQ-GL | Full |
| Iconography and Imagery | CQ-II | Full |
| Motion and Animation | CQ-MO | Full |
| Brand Identity | CQ-BI | Full |
| Design System | CQ-DS | Full |
| Accessibility | CQ-AC | Full |

Cross-cutting CQ sections:
- CQ-VH (Visual Hierarchy) — spans Typography, Color, Layout, Iconography
- CQ-SOT (Source of Truth) — spans Design System, Brand Identity
- CQ-CO (Consistency) — spans all sub-areas

## Related Documents
- concepts.md — Term definitions, abstraction layer ([L1]/[L2]/[L3]) classification
- structure_spec.md — Visual design system structural requirements and thresholds
- logic_rules.md — Visual construction behavioral rules, constraint conflict checks
- dependency_rules.md — Token–component, brand–visual system, color–accessibility dependency rules
- competency_qs.md — Verification questions organized by CQ-ID sections
- extension_cases.md — Growth and contraction scenarios with impact analysis
- conciseness_rules.md — Conciseness criteria for review output
