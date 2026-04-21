---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.
The pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **Verification concern** — Classified by the concern that must be addressed during visual design system review. This axis aligns with domain_scope.md Key Sub-Areas + Cross-Cutting Concerns.

Question priority principles: **Visual system fundamentals (color system, typography, accessibility, token architecture) are the highest priority.** Consistency, brand governance, and motion refinement are secondary concerns applied on top of the visual foundation.

Priority levels:
- **P1** — Must be answerable in any visual design review. Failure indicates a fundamental visual system defect.
- **P2** — Should be answerable for production systems. Failure indicates a quality gap.
- **P3** — Recommended for mature systems. Failure indicates a refinement opportunity.

## CQ ID System

### Prefix Allocation

| Prefix | Concern Area | Aligned Sub-Area (domain_scope.md) |
|--------|-------------|-------------------------------------|
| CQ-VH | Visual Hierarchy and Composition | Cross-cutting: Typography + Color + Layout + Iconography |
| CQ-T | Typography | Typography |
| CQ-C | Color | Color |
| CQ-GL | Grid and Layout | Layout and Composition |
| CQ-II | Iconography and Imagery | Iconography and Imagery |
| CQ-DS | Design System | Design System |
| CQ-AC | Accessibility | Accessibility |
| CQ-BI | Brand Alignment | Brand Identity |
| CQ-MO | Motion and Animation | Motion and Animation |
| CQ-SOT | Source of Truth | Cross-cutting: Design System + Brand Identity |
| CQ-CO | Consistency | Cross-cutting: all sub-areas |

Prefix allocation protocol: New CQ sections use 1-3 character alphabetic prefix codes with mandatory `-` separator (e.g., CQ-XX-01). Prefixes must not be string prefixes of existing prefixes.

### ME Rationale

Each prefix covers a mutually exclusive concern area. CQ-VH = how information importance is conveyed visually (cross-cutting). CQ-T = how text is displayed. CQ-C = how colors are selected and combined. CQ-GL = how elements are spatially arranged. CQ-II = how icons and images communicate. CQ-DS = how tokens and components are governed. CQ-AC = how diverse abilities are served visually. CQ-BI = how brand identity is maintained. CQ-MO = how motion conveys information. CQ-SOT = which standards govern decisions. CQ-CO = whether visual patterns are uniformly applied.

When a concern touches multiple areas, attribution follows the **primary enforcement point** (domain_scope.md §Cross-cutting Concern Attribution). Contrast ratio → CQ-AC (WCAG is the enforcement driver), not CQ-C.

### CE Argument

The 11 prefixes cover all 8 sub-areas in domain_scope.md Key Sub-Areas plus 3 cross-cutting concerns (Visual Hierarchy, Source of Truth, Consistency). Visual Hierarchy is cross-cutting because it spans Typography, Color, Layout, and Iconography.

**Open-world note**: New sub-areas (e.g., 3D Design, Spatial UI) require new CQ prefixes.

---

## 1. Visual Hierarchy and Composition (CQ-VH)

Cross-cutting section — spans Typography, Color, Layout, and Iconography sub-areas. Verifies that information importance is clearly conveyed through visual means.

- **CQ-VH-01** [P1] Is the order of information importance clearly conveyed through visual means (size, color, contrast, position)?
  - Inference path: logic_rules.md §Visual Hierarchy Logic → visual hierarchy through combination of means → concepts.md §Composition Principle Core Terms → Visual Hierarchy definition
  - Verification criteria: PASS if a first-time viewer can identify the most important element within 3 seconds. FAIL if no clear visual priority — elements compete equally for attention

- **CQ-VH-02** [P1] Are at least 2 different visual means combined to establish each hierarchy level?
  - Inference path: logic_rules.md §Visual Hierarchy Logic → single means = weak hierarchy → concepts.md §Visual Weight → size, saturation, contrast, complexity, isolation
  - Verification criteria: PASS if each hierarchy level uses ≥2 combined means (e.g., larger + bolder, or brighter + positioned higher). FAIL if hierarchy relies on a single dimension (e.g., size alone)

- **CQ-VH-03** [P1] Are Gestalt principles (proximity, similarity, continuity, closure, figure-ground) consistently applied to group related elements?
  - Inference path: concepts.md §Composition Principle Core Terms → Gestalt Principles → logic_rules.md §Grid and Spacing Logic → proximity principle enforcement
  - Verification criteria: PASS if related elements are visually grouped and unrelated elements visually separated. FAIL if related elements have the same spacing as unrelated elements

- **CQ-VH-04** [P2] Is negative space intentionally designed, not incidentally left over?
  - Inference path: concepts.md §Composition Principle Core Terms → Negative Space → active vs passive whitespace
  - Verification criteria: PASS if whitespace serves clear purpose (breathing room, separation, emphasis). FAIL if whitespace distribution appears random or incidental

- **CQ-VH-05** [P2] Does the layout account for gaze movement patterns (F-pattern for text, Z-pattern for images)?
  - Inference path: concepts.md §Composition Principle Core Terms → F-pattern/Z-pattern → logic_rules.md §Visual Hierarchy Logic → critical info along scan paths
  - Verification criteria: PASS if most important content sits along natural scan path. FAIL if critical information is placed in areas users scan last

- **CQ-VH-06** [P2] Is the number of hierarchy levels within the perceivable range (3~5)?
  - Inference path: logic_rules.md §Visual Hierarchy Logic → 3~5 levels perceivable → more levels make adjacent levels indistinguishable
  - Verification criteria: PASS if hierarchy has 3~5 clearly distinguishable levels. FAIL if >5 levels that blur into each other or <3 levels (flat presentation)

- **CQ-VH-07** [P2] Do emphasized elements stay below ~30% of the viewport area?
  - Inference path: logic_rules.md §Visual Hierarchy Logic → >30% emphasis = emphasis lost → emphasis works by contrast with non-emphasized
  - Verification criteria: PASS if emphasis is selective and creates clear contrast. FAIL if most elements are visually "loud"

- **CQ-VH-08** [P3] Are CRAP principles (Contrast, Repetition, Alignment, Proximity) each explicitly applied?
  - Inference path: concepts.md §Composition Principle Core Terms → CRAP Principles → Robin Williams (1994)
  - Verification criteria: PASS if all 4 principles identifiable in the layout. FAIL if any principle is not addressed

---

## 2. Typography (CQ-T)

Verifies that the typography system supports readability, hierarchy, and visual rhythm.

- **CQ-T-01** [P1] Is the rationale for typeface selection documented (medium, content type, target users, licensing, language support)?
  - Inference path: logic_rules.md §Typography Logic → typeface selection is functional, not sensory → concepts.md §Typography Core Terms → Typeface
  - Verification criteria: PASS if selection rationale documented with constraints. FAIL if choice is undocumented or justified only by "it looks nice"

- **CQ-T-02** [P1] Is the type scale defined on a consistent ratio basis with named hierarchy levels?
  - Inference path: logic_rules.md §Typography Logic → consistent ratio prevents arbitrary sizes → structure_spec.md §Token Layer Structure → type tokens → concepts.md §Typography Core Terms → Type Scale
  - Verification criteria: PASS if ratio documented (e.g., 1.25), levels named (h1/h2/h3/body/caption), and all sizes derivable from ratio. FAIL if sizes are arbitrary

- **CQ-T-03** [P1] Do line-height values meet readability criteria (body 1.4~1.6×, heading 1.1~1.3×)?
  - Inference path: logic_rules.md §Typography Logic → insufficient = collision, excessive = broken cohesion → concepts.md §Typography Core Terms → Line-height
  - Verification criteria: PASS if body line-height 1.4~1.6× and heading 1.1~1.3×. FAIL if values outside range without documented justification

- **CQ-T-04** [P1] Is the measure within optimal readability range (45~75 chars English, 25~35 chars CJK)?
  - Inference path: logic_rules.md §Typography Logic → long = hard to find next line, short = excessive breaks → dependency_rules.md §Typography–Layout Dependency → Measure → Grid Column Width
  - Verification criteria: PASS if text blocks at each breakpoint fall within range. FAIL if any text block consistently exceeds/falls below range

- **CQ-T-05** [P2] Is the number of typefaces limited to 2~3?
  - Inference path: logic_rules.md §Typography Logic → >3 causes visual clutter and consistency burden
  - Verification criteria: PASS if 2~3 typefaces with clear role assignment. FAIL if >3 typefaces or roles overlap

- **CQ-T-06** [P2] Does typeface pairing follow the contrast principle (e.g., sans-serif + serif)?
  - Inference path: logic_rules.md §Typography Logic → similar typefaces = awkward similarity → clear contrast needed
  - Verification criteria: PASS if paired typefaces have clear visual contrast. FAIL if two similar typefaces (e.g., two geometric sans-serifs)

- **CQ-T-07** [P2] Are minimum text sizes enforced per context (body ≥16px, caption ≥12px)?
  - Inference path: logic_rules.md §Typography Logic → below 12px, legibility degrades significantly
  - Verification criteria: PASS if no text below 12px and body text ≥16px on screen. FAIL if text below minimum thresholds

- **CQ-T-08** [P2] Are letter-spacing adjustments defined per text role?
  - Inference path: concepts.md §Typography Core Terms → Letter-spacing → logic_rules.md §Typography Logic → headings tighter, uppercase/small text wider
  - Verification criteria: PASS if tracking varies appropriately by role. FAIL if uniform tracking everywhere including uppercase/small text

- **CQ-T-09** [P2] Is text alignment method chosen with rationale (left for body, center for short headings)?
  - Inference path: logic_rules.md §Typography Logic → full justification on narrow columns causes river effect
  - Verification criteria: PASS if alignment appropriate to context with documented rationale. FAIL if full justification on narrow columns

- **CQ-T-10** [P3] Is typeface fallback defined for multilingual environments? (when applicable)
  - Inference path: concepts.md §Typography Core Terms → fallback stacks → dependency_rules.md §Typography–Layout Dependency → typeface change requires full re-verification
  - Verification criteria: PASS if fallback chain defined with CJK/script-specific faces. FAIL if no fallback beyond generic family

- **CQ-T-11** [P3] Are variable font axes utilized when variable fonts are available? (when applicable)
  - Inference path: concepts.md §Typography Core Terms → Variable Font → axes (wght, wdth, opsz) → optical sizing for small text
  - Verification criteria: PASS if variable axes used for responsive type or optical sizing. FAIL if variable font loaded but only one static instance used

---

## 3. Color (CQ-C)

Verifies that the color system supports harmony, hierarchy, meaning, and accessibility.

- **CQ-C-01** [P1] Is a color palette defined with primary/secondary/accent/neutral roles distinguished?
  - Inference path: structure_spec.md §Visual Design System Required Elements → Color System → logic_rules.md §Color Logic → basic composition
  - Verification criteria: PASS if palette has named roles with clear usage rules. FAIL if colors selected ad-hoc without role system

- **CQ-C-02** [P1] Are semantic colors (success, error, warning, info) defined and separated from raw values?
  - Inference path: concepts.md §Color Core Terms → Semantic Color → structure_spec.md §Token Layer Structure → semantic layer references primitive
  - Verification criteria: PASS if semantic colors reference primitive tokens, not hardcoded values. FAIL if `error: #EF4444` instead of `error: red-500`

- **CQ-C-03** [P1] Do all text-background combinations meet WCAG AA contrast (4.5:1 normal, 3:1 large)?
  - Inference path: logic_rules.md §Accessibility Logic → WCAG criteria → dependency_rules.md §Color–Accessibility Dependency → all combinations verified
  - Verification criteria: PASS if all combinations documented with computed ratio. FAIL if any combination below threshold or unverified
<!-- derived-from: WCAG 2.2, SC 1.4.3 -->

- **CQ-C-04** [P1] Are supplementary means (icons, text, shape) provided alongside color for conveying meaning?
  - Inference path: logic_rules.md §Accessibility Logic → color alone = WCAG 1.4.1 violation → dependency_rules.md §Color–Accessibility Dependency → Semantic Color → Supplementary Means
  - Verification criteria: PASS if every color-based meaning has ≥1 non-color supplement. FAIL if any meaning conveyed by color alone
<!-- derived-from: WCAG 2.2, SC 1.4.1 -->

- **CQ-C-05** [P2] Does the color ratio approximate 60-30-10 (dominant/secondary/accent)?
  - Inference path: logic_rules.md §Color Logic → accent 10% concentrated on action guidance → concepts.md §Color Core Terms → 60-30-10 Rule
  - Verification criteria: PASS if dominant/secondary/accent proportions identifiable. FAIL if accent distributed widely or no clear proportion

- **CQ-C-06** [P2] Are high-saturation colors restricted to small areas (accents) with low saturation for large surfaces?
  - Inference path: logic_rules.md §Color Logic → high saturation on large areas = eye fatigue
  - Verification criteria: PASS if backgrounds use desaturated colors and only accents use high saturation. FAIL if large areas use high-saturation colors

- **CQ-C-07** [P2] Is color harmony based on identifiable color wheel relationships?
  - Inference path: logic_rules.md §Color Logic → harmony from identifiable relationships → concepts.md §Color Core Terms → Color Wheel
  - Verification criteria: PASS if palette colors have an identifiable relationship (complementary, analogous, triadic). FAIL if colors appear arbitrarily selected

- **CQ-C-08** [P2] Do UI components and graphical objects meet 3:1 contrast against adjacent colors?
  - Inference path: logic_rules.md §Accessibility Logic → WCAG 1.4.11 → icons, borders, focus rings, form controls
  - Verification criteria: PASS if all non-text UI elements meet 3:1. FAIL if icon/border on similar-tone background fails ratio
<!-- derived-from: WCAG 2.2, SC 1.4.11 -->

- **CQ-C-09** [P2] Is the palette tested against protanopia, deuteranopia, and tritanopia simulations?
  - Inference path: logic_rules.md §Accessibility Logic → color blindness simulation required for semantic colors
  - Verification criteria: PASS if simulations run and semantic colors remain distinguishable. FAIL if error/success indistinguishable under simulation

- **CQ-C-10** [P2] If dark mode exists, is it designed with separate semantic token mappings (not color inversion)?
  - Inference path: dependency_rules.md §Color–Accessibility Dependency → Dark Mode Addition → logic_rules.md §Color Logic → dark mode ≠ inversion
  - Verification criteria: PASS if dark mode has separate primitives, re-verified contrast, elevation model adapted. FAIL if colors are auto-inverted

- **CQ-C-11** [P3] Are colors specified in a defined color space (sRGB, Display P3)?
  - Inference path: concepts.md §Color Core Terms → Color Space → cross-device consistency
  - Verification criteria: PASS if color space documented and conversions defined. FAIL if hex-only with no space specification

- **CQ-C-12** [P3] Are tonal palettes perceptually even (using OKLCH or CIE LAB, not just sRGB math)?
  - Inference path: logic_rules.md §Color Logic → perceptually even > mathematically even → concepts.md §Accessibility Core Terms → Perceptual Uniformity
  - Verification criteria: PASS if lightness steps appear visually even. FAIL if palette has visible jumps or plateaus

---

## 4. Grid and Layout (CQ-GL)

Verifies that spatial organization supports alignment, rhythm, and responsive adaptation.

- **CQ-GL-01** [P1] Is a grid system (columns, gutters, margins) defined and consistently applied?
  - Inference path: structure_spec.md §Visual Design System Required Elements → Layout System → concepts.md §Layout Core Terms → Grid System
  - Verification criteria: PASS if grid documented with column count, gutter width, margin width per breakpoint. FAIL if no grid or elements placed arbitrarily

- **CQ-GL-02** [P1] Is a spacing system defined based on a consistent base unit (4px or 8px)?
  - Inference path: logic_rules.md §Grid and Spacing Logic → consistent base unit required → structure_spec.md §Visual Design System Required Elements → Spacing System
  - Verification criteria: PASS if base unit documented and all spacing values are multiples. FAIL if arbitrary spacing values used

- **CQ-GL-03** [P1] Are responsive breakpoints defined based on content (where layout breaks), not devices?
  - Inference path: structure_spec.md §Responsive Structure → concepts.md §Layout Core Terms → Breakpoint → content-driven
  - Verification criteria: PASS if breakpoints set where content needs to reflow. FAIL if breakpoints match only specific device widths

- **CQ-GL-04** [P2] Is gutter width less than margin width?
  - Inference path: logic_rules.md §Grid and Spacing Logic → gutter > margin inverts visual structure
  - Verification criteria: PASS if gutter < margin at every breakpoint. FAIL if gutter ≥ margin

- **CQ-GL-05** [P2] Are spacing values restricted to the defined spatial system (no off-scale values)?
  - Inference path: logic_rules.md §Grid and Spacing Logic → arbitrary values destroy visual rhythm → structure_spec.md §Isolated Node Prohibition → off-scale spacing
  - Verification criteria: PASS if all spacing values in the system. FAIL if values outside the scale (e.g., 15px, 23px)

- **CQ-GL-06** [P2] Is the Gestalt proximity principle applied — related elements closer than unrelated?
  - Inference path: logic_rules.md §Grid and Spacing Logic → inter-group ≥ 2× intra-group recommended
  - Verification criteria: PASS if spacing ratios clearly distinguish groups. FAIL if related and unrelated elements have similar spacing

- **CQ-GL-07** [P2] Does content reflow properly at 200% text enlargement without clipping?
  - Inference path: structure_spec.md §Responsive Structure → WCAG 1.4.10 → no horizontal scrolling for vertical text
  - Verification criteria: PASS if content reflows with no horizontal scroll at 200%. FAIL if content clipped or horizontal scrollbar appears
<!-- derived-from: WCAG 2.2, SC 1.4.10 -->

- **CQ-GL-08** [P2] Are max-width constraints defined to prevent content from stretching beyond readable measure?
  - Inference path: logic_rules.md §Grid and Spacing Logic → max-width prevents 200+ char lines on wide screens
  - Verification criteria: PASS if content area has max-width (1200~1440px) and text blocks have max-width (680~720px). FAIL if text stretches full-width on wide monitors

- **CQ-GL-09** [P3] Is a baseline grid defined to maintain vertical rhythm?
  - Inference path: concepts.md §Layout Core Terms → Baseline Grid → all vertical spacing aligns to multiples of body line-height
  - Verification criteria: PASS if vertical spacing aligns to baseline. FAIL if no baseline grid defined

---

## 5. Iconography and Imagery (CQ-II)

Verifies that icons and images communicate clearly, consistently, and accessibly.

- **CQ-II-01** [P1] Is the icon style (outline/filled/duotone) unified across the system?
  - Inference path: logic_rules.md §Icon and Image Logic → mixing styles = visual noise → structure_spec.md §Visual Design System Required Elements → Icon System
  - Verification criteria: PASS if one consistent style throughout. FAIL if styles mixed without documented semantic distinction

- **CQ-II-02** [P1] Are icon meanings used consistently (same icon = same meaning everywhere)?
  - Inference path: logic_rules.md §Icon and Image Logic → meaning mapping is permanent → structure_spec.md §Isolated Node Prohibition → icon meaning collision
  - Verification criteria: PASS if each icon maps to exactly one meaning. FAIL if same icon means different things on different screens

- **CQ-II-03** [P1] Are icons accompanied by text labels so meaning is not conveyed by icon alone?
  - Inference path: logic_rules.md §Accessibility Logic → icons must not be sole information carrier → WCAG 1.4.1 principle extended
  - Verification criteria: PASS if every icon has text label, tooltip, or aria-label. FAIL if icon-only navigation or action without any text

- **CQ-II-04** [P2] Is an icon size system defined (e.g., 16/20/24/32px) with usage context per size?
  - Inference path: logic_rules.md §Icon and Image Logic → defined scale with usage context → structure_spec.md §Visual Design System Required Elements
  - Verification criteria: PASS if sizes defined with context (16px=inline, 24px=button). FAIL if arbitrary icon sizes used

- **CQ-II-05** [P2] Do icons meet 3:1 contrast against their background (WCAG 1.4.11)?
  - Inference path: logic_rules.md §Accessibility Logic → UI components 3:1 → applies to icons
  - Verification criteria: PASS if all icons meet 3:1 contrast. FAIL if icons on similar-tone backgrounds fail
<!-- derived-from: WCAG 2.2, SC 1.4.11 -->

- **CQ-II-06** [P2] Are icons designed on a consistent grid (keyline grid with uniform stroke and padding)?
  - Inference path: logic_rules.md §Icon and Image Logic → grid-based design → optical alignment may adjust 1~2px
  - Verification criteria: PASS if grid documented and icons follow it. FAIL if icons appear visually inconsistent in size/weight

- **CQ-II-07** [P3] Are image aspect ratios consistent within the same context?
  - Inference path: logic_rules.md §Icon and Image Logic → mixed ratios in same context = chaotic
  - Verification criteria: PASS if one ratio per context (e.g., all product cards 4:3). FAIL if mixed ratios in a grid

---

## 6. Design System (CQ-DS)

Verifies that tokens and components are structured, governed, and consistently applied.

- **CQ-DS-01** [P1] Are design tokens defined with primitive/semantic/component layers distinguished?
  - Inference path: structure_spec.md §Token Layer Structure → 3 layers, unidirectional reference → concepts.md §Design System Core Terms → Design Token
  - Verification criteria: PASS if 3 layers exist with clear naming convention. FAIL if flat token structure or missing semantic layer

- **CQ-DS-02** [P1] Do component tokens reference semantic tokens (not primitives directly)?
  - Inference path: dependency_rules.md §Token–Component Dependency → primitive bypass = meaning layer violation → structure_spec.md §Isolated Node Prohibition → layer bypass
  - Verification criteria: PASS if all component tokens trace to semantic tokens. FAIL if any component token references a primitive directly

- **CQ-DS-03** [P1] Are visual specifications defined per interactive state (default/hover/active/focus/disabled)?
  - Inference path: structure_spec.md §State System → 5 minimum states → dependency_rules.md §Component–State Dependency → all states required
  - Verification criteria: PASS if ≥5 states visually specified per interactive component. FAIL if any interactive component has <5 states

- **CQ-DS-04** [P2] Are component variants defined with usage criteria?
  - Inference path: structure_spec.md §Visual Design System Required Elements → Variant Definitions → logic_rules.md §Component Logic → manageable range
  - Verification criteria: PASS if variants documented with when-to-use criteria. FAIL if variants exist without selection guidance

- **CQ-DS-05** [P2] Is a Figma↔code synchronization method defined with frequency and tolerance?
  - Inference path: dependency_rules.md §Design Tool–Code Dependency → bidirectional sync → frequency and acceptable discrepancy documented
  - Verification criteria: PASS if sync frequency, token pipeline, and acceptable discrepancy defined. FAIL if no sync process

- **CQ-DS-06** [P2] Are token naming conventions consistent (e.g., `{category}-{property}-{variant}-{state}`)?
  - Inference path: structure_spec.md §Token Layer Structure → naming convention per layer
  - Verification criteria: PASS if naming follows documented pattern consistently. FAIL if naming is inconsistent or undocumented

- **CQ-DS-07** [P2] Is design system governance defined (add/change/deprecation)? (scale-dependent: 2+ teams)
  - Inference path: domain_scope.md §Key Sub-Areas → Governance (scale-dependent) → concepts.md §Design System Core Terms → Governance
  - Verification criteria: PASS if process documented and enforced. FAIL if no process or ad-hoc additions without review

- **CQ-DS-08** [P3] Are tokens managed in a tool-independent format (JSON/YAML)?
  - Inference path: extension_cases.md §Case 7 → tool migration → tokens in tool-agnostic format
  - Verification criteria: PASS if tokens in JSON/YAML with build pipeline. FAIL if tokens only in Figma with no export

- **CQ-DS-09** [P3] Is the design system maturity level identified and appropriate?
  - Inference path: concepts.md §Design System Core Terms → Design System Maturity → L1 style guide → L4 infrastructure
  - Verification criteria: PASS if maturity level identified and roadmap exists. FAIL if maturity not assessed

---

## 7. Accessibility (CQ-AC)

Verifies that the visual system serves users of diverse visual abilities.

- **CQ-AC-01** [P1] Is WCAG 2.2 AA explicitly stated as the applicable standard?
  - Inference path: domain_scope.md §Reference Standards/Frameworks → WCAG version SSOT → domain_scope.md §Normative System Classification → Tier-1a
  - Verification criteria: PASS if standard version explicitly stated. FAIL if "WCAG" without version or no standard stated

- **CQ-AC-02** [P1] Does the focus indicator provide sufficient visibility (≥2px, ≥3:1 contrast)?
  - Inference path: logic_rules.md §Accessibility Logic → focus indicator requirements → structure_spec.md §State System → Focus state
  - Verification criteria: PASS if focus indicator ≥2px solid with ≥3:1 contrast on all backgrounds. FAIL if outline:none without alternative or insufficient contrast
<!-- derived-from: WCAG 2.2, SC 2.4.7, 2.4.11 -->

- **CQ-AC-03** [P1] Is prefers-reduced-motion supported for all non-essential motion?
  - Inference path: logic_rules.md §Motion Logic → replace with instant transition, not remove → concepts.md §Accessibility Core Terms → prefers-reduced-motion
  - Verification criteria: PASS if all non-essential motion has reduced-motion alternative. FAIL if animations play regardless of system setting

- **CQ-AC-04** [P1] Is there no content that flashes more than 3 times per second?
  - Inference path: logic_rules.md §Motion Logic → WCAG 2.3.1 absolute prohibition → seizure risk
  - Verification criteria: PASS if no flashing content. FAIL if any element flashes >3/sec (GIFs, loaders, video)
<!-- derived-from: WCAG 2.2, SC 2.3.1 -->

- **CQ-AC-05** [P2] Is content readable and functional at 200% text enlargement?
  - Inference path: structure_spec.md §Responsive Structure → WCAG 1.4.4 → no clipping, no horizontal scroll
  - Verification criteria: PASS if content reflows and remains functional at 200%. FAIL if text clipped or functionality lost
<!-- derived-from: WCAG 2.2, SC 1.4.4 -->

- **CQ-AC-06** [P2] Do all non-text UI elements meet 3:1 contrast (WCAG 1.4.11)?
  - Inference path: logic_rules.md §Accessibility Logic → icons, borders, focus rings, form controls → 3:1 minimum
  - Verification criteria: PASS if all UI elements meet 3:1. FAIL if any element below threshold

- **CQ-AC-07** [P2] Is color blindness accommodation verified via simulation?
  - Inference path: logic_rules.md §Accessibility Logic → protanopia, deuteranopia, tritanopia simulations
  - Verification criteria: PASS if all semantic colors distinguishable under all 3 simulations. FAIL if any pair indistinguishable

- **CQ-AC-08** [P3] When reduced motion is active, are state changes still communicated (instant transition, not removal)?
  - Inference path: logic_rules.md §Motion Logic → instant transition replaces animation → state change must still be visible
  - Verification criteria: PASS if state changes visible without motion. FAIL if reduced-motion removes all visual feedback

---

## 8. Brand Alignment (CQ-BI)

Verifies that visual elements maintain brand identity consistently.

- **CQ-BI-01** [P1] Are visual elements (colors, typefaces, image style) consistent with the brand tone and manner?
  - Inference path: logic_rules.md §Brand Alignment Logic → tone constrains visual choices → dependency_rules.md §Brand–Visual System Dependency
  - Verification criteria: PASS if visual choices align with documented tone. FAIL if visual elements contradict the stated brand personality

- **CQ-BI-02** [P1] Are logo usage rules (minimum size, clear space, prohibited modifications) defined and followed?
  - Inference path: concepts.md §Brand Identity Core Terms → Logo, Clear Space → logic_rules.md §Brand Alignment Logic → clear space never violated
  - Verification criteria: PASS if logo rules documented and consistently followed. FAIL if logo encroached, distorted, or below minimum size

- **CQ-BI-03** [P2] Are brand colors applied through the design token system (not hardcoded)?
  - Inference path: logic_rules.md §Brand Alignment Logic → brand through token system → dependency_rules.md §Brand–Visual System Dependency
  - Verification criteria: PASS if brand colors are tokens that propagate through the system. FAIL if brand colors hardcoded in individual components

- **CQ-BI-04** [P2] When brand colors conflict with accessibility, is accessibility prioritized with adjustment documented?
  - Inference path: logic_rules.md §Constraint Conflict Checks → Accessibility vs Brand Identity → accessibility prevails
  - Verification criteria: PASS if accessibility met with documented brand adjustment. FAIL if contrast sacrificed for brand

- **CQ-BI-05** [P3] Are brand application rules defined per medium (digital/print/environmental)? (when applicable)
  - Inference path: domain_scope.md §Key Sub-Areas → Brand Identity → Medium-Specific Application
  - Verification criteria: PASS if per-medium rules exist. FAIL if single set of rules applied across all media

- **CQ-BI-06** [P3] Is co-branding visual hierarchy defined? (when applicable)
  - Inference path: concepts.md §Brand Identity Core Terms → Co-branding → logic_rules.md §Brand Alignment Logic
  - Verification criteria: PASS if relative size, placement, clear space rules defined. FAIL if co-branding ad-hoc

---

## 9. Motion and Animation (CQ-MO)

Verifies that motion conveys information, respects accessibility, and follows a consistent system.

- **CQ-MO-01** [P2] Is the purpose of each animation (feedback/transition/guidance) stated?
  - Inference path: logic_rules.md §Motion Logic → motion is information, not decoration → concepts.md §Motion Core Terms
  - Verification criteria: PASS if each animation has stated purpose. FAIL if any animation exists without information purpose

- **CQ-MO-02** [P2] Is an easing curve system defined (ease-out for entrance, ease-in for exit)?
  - Inference path: logic_rules.md §Motion Logic → standard easing assignments → concepts.md §Motion Core Terms → Easing
  - Verification criteria: PASS if easing assignments documented per motion type. FAIL if easing is arbitrary or uniform linear

- **CQ-MO-03** [P2] Is a duration system defined with ranges by complexity (100~200ms micro, 200~400ms transitions)?
  - Inference path: logic_rules.md §Motion Logic → duration proportional to complexity → concepts.md §Motion Core Terms → Duration
  - Verification criteria: PASS if duration ranges defined and applied. FAIL if durations are arbitrary or >700ms for UI

- **CQ-MO-04** [P2] Are simultaneous animations limited to 2?
  - Inference path: logic_rules.md §Motion Logic → >2 simultaneous = cognitive overload → stagger 30~50ms
  - Verification criteria: PASS if ≤2 simultaneous animations. FAIL if >2 simultaneous without stagger

- **CQ-MO-05** [P3] Are motion semantics consistent (expansion = reveal, slide-in = new context)?
  - Inference path: concepts.md §Motion Core Terms → Motion Semantics → logic_rules.md §Motion Logic → consistent semantics
  - Verification criteria: PASS if same motion type conveys same meaning throughout. FAIL if expansion means "reveal" on one screen and "error" on another

---

## 10. Source of Truth (CQ-SOT)

Cross-cutting section. Verifies that authoritative standards for visual decisions are designated and followed.

- **CQ-SOT-01** [P1] Is an authoritative standard for visual design decisions designated?
  - Inference path: dependency_rules.md §Source of Truth Management → design system documentation = SoT → not Figma, not code
  - Verification criteria: PASS if SoT explicitly designated. FAIL if no designated authority or ambiguous authority

- **CQ-SOT-02** [P1] Is the conflict resolution priority defined (Accessibility > Platform > Design System > Heuristics)?
  - Inference path: dependency_rules.md §Source of Truth Management → Conflict Resolution Priority → domain_scope.md §Normative System Classification
  - Verification criteria: PASS if priority documented and consistently applied. FAIL if conflicts resolved ad-hoc

- **CQ-SOT-03** [P2] Is design tool vs code precedence defined for discrepancy resolution?
  - Inference path: dependency_rules.md §Design Tool–Code Dependency → Discrepancy Resolution → documentation is SoT
  - Verification criteria: PASS if resolution process documented. FAIL if discrepancies left unresolved or resolved inconsistently

- **CQ-SOT-04** [P2] Are external standard versions explicitly specified (e.g., "WCAG 2.2" not "WCAG")?
  - Inference path: domain_scope.md §Reference Standards/Frameworks → version SSOT table
  - Verification criteria: PASS if all external standards include version. FAIL if version omitted

---

## 11. Consistency (CQ-CO)

Cross-cutting section — spans all sub-areas. Verifies that visual patterns are uniformly applied.

- **CQ-CO-01** [P1] Is the same visual expression applied for the same meaning across the product?
  - Inference path: domain_scope.md §Cross-Cutting Concerns → Visual Consistency → logic_rules.md §Constraint Conflict Checks → same function = same expression
  - Verification criteria: PASS if visual patterns are uniform for identical concepts. FAIL if same concept has different visual treatment on different screens

- **CQ-CO-02** [P1] Are all token values used consistently — no hardcoded values bypassing the token system?
  - Inference path: structure_spec.md §Isolated Node Prohibition → hardcoded values bypass tokens → dependency_rules.md §Token–Component Dependency
  - Verification criteria: PASS if all visual properties reference tokens. FAIL if hardcoded values found in component specs

- **CQ-CO-03** [P2] Are intentional visual deviations documented with rationale?
  - Inference path: logic_rules.md §Constraint Conflict Checks → Consistency vs Contextual Appropriateness → deviation must be documented
  - Verification criteria: PASS if every deviation has documented reason. FAIL if deviations exist without rationale

- **CQ-CO-04** [P2] Is the design system consistent with platform guidelines where applicable?
  - Inference path: domain_scope.md §Normative System Classification → Tier-1b platform standards → dependency_rules.md §Source of Truth Management
  - Verification criteria: PASS if platform conventions followed for system elements. FAIL if platform conventions violated without documentation

- **CQ-CO-05** [P3] Are visual specs consistent between design tool and code implementation?
  - Inference path: dependency_rules.md §Design Tool–Code Dependency → Discrepancy Resolution → within defined tolerance
  - Verification criteria: PASS if Figma and code values match within tolerance. FAIL if divergence detected

---

## Related Documents
- domain_scope.md — Sub-area to CQ section mapping, normative tier classification, cross-cutting concerns
- logic_rules.md — Rules providing inference paths for CQ answers
- structure_spec.md — Structural requirements providing inference paths
- dependency_rules.md — Dependency rules providing inference paths
- concepts.md — Term definitions referenced in questions
- extension_cases.md — Extension scenarios referenced in CQ-BI and CQ-DS
