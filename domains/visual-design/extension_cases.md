---
version: 2
last_updated: "2026-04-16"
source: manual
status: established
---

# Visual Design Domain — Extension Cases

Classification axis: **change trigger** — cases classified by the type of change that triggers structural evolution of the visual design system. Cases cover both growth triggers (Cases 1–8) and shrinkage triggers (Cases 9–12).

Each scenario is simulated to verify whether the existing visual design system breaks.

---

## Case 1: Dark Mode Addition

### Situation

Adding dark mode to an existing light-only visual system.

### Case Study: Apple — iOS 13 System-Wide Dark Mode (2019)

Apple built dark mode on semantic colors (`systemBackground`, `label`) resolving per mode. Light mode used shadows for elevation; dark mode used lighter surface backgrounds. Contrast verified against WCAG AA in both modes. Images and icons were evaluated for dark-background visibility. System respected `prefers-color-scheme`; transitions used cross-dissolve to prevent flash.

### Impact Analysis

| Principle | Impact |
|---|---|
| Semantic tokens | All hardcoded colors must become semantic tokens resolving per theme |
| Contrast ratios | WCAG AA must be maintained in every theme variant |
| Elevation model | Light uses shadows for depth; dark uses surface brightness |
| Image/icon adaptation | Images and icons must be verified on dark backgrounds |
| Semantic colors | Error/success/warning must remain clearly meaningful in dark mode |

### Verification Checklist

- [ ] Are all colors expressed as semantic tokens that resolve per theme? → structure_spec.md §Token Layer Structure
- [ ] Do all text-background combinations in dark mode meet WCAG contrast criteria? → logic_rules.md §Accessibility Logic
- [ ] Are non-color visual elements (shadow, border, overlay) adjusted for dark mode? → dependency_rules.md §Color–Accessibility Dependency
- [ ] Are images, icons, and illustrations visually appropriate on dark backgrounds? → logic_rules.md §Icon and Image Logic
- [ ] Are semantic colors (error, success) still clearly meaningful in dark mode? → dependency_rules.md §Color–Accessibility Dependency

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Color–Accessibility Dependency (Dark Mode) |
| structure_spec.md | Modify | §Token Layer Structure (theme mappings) |
| logic_rules.md | Verify | §Accessibility Logic, §Color Logic |

---

## Case 2: Brand Renewal

### Situation

Brand identity change: full replacement of logo, brand colors, typefaces, and tone and manner.

### Case Study: Slack — Brand Refresh (2019)

Slack replaced its multi-color hashtag logo with a unified 4-color pinwheel. The color palette shifted from 11 primary colors to 4. Typography changed from Lato to a custom Slack Circular. The design system's token architecture absorbed the change: primitive tokens were updated, semantic tokens remained stable, component tokens propagated automatically. The migration took 3 months with both brands coexisting.

### Impact Analysis

| Principle | Impact |
|---|---|
| Token propagation | Primitive token update must propagate through semantic to component |
| Typography re-verification | New typeface requires scale, line-height, measure re-verification |
| Icon/image alignment | Visual style must match new tone and manner |
| Accessibility re-check | New brand colors must meet all contrast requirements |
| Transition period | Old → new coexistence duration and migration plan defined |

### Verification Checklist

- [ ] When brand colors change, does the propagation path (primitive → semantic → component) function correctly? → dependency_rules.md §Token–Component Dependency
- [ ] Has the type scale, line-height, and measure been re-verified with the new brand typeface? → dependency_rules.md §Typography–Layout Dependency
- [ ] Have icon, image, and motion styles been adjusted to match the new tone? → dependency_rules.md §Brand–Visual System Dependency
- [ ] Are accessibility criteria met with new brand colors? → logic_rules.md §Accessibility Logic
- [ ] Is the transition period (old → new coexistence) defined? → dependency_rules.md §Brand–Visual System Dependency

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Brand–Visual System Dependency, §Color–Accessibility Dependency |
| logic_rules.md | Verify | §Brand Alignment Logic, §Typography Logic |
| structure_spec.md | Verify | §Brand Visual Elements, §Typography System |

---

## Case 3: New Platform Support

### Situation

Extending the existing web design system to mobile apps (iOS/Android), desktop apps, kiosks, etc.

### Case Study: Airbnb — Cross-Platform Design Language System (2016)

Airbnb's DLS defined tokens as platform-agnostic JSON. Web: CSS custom properties. iOS: Swift constants. Android: XML resources. Platform-specific adaptations (iOS 44pt touch targets, Android 48dp, Android ripple vs iOS highlight) were documented as platform overrides to shared tokens. A single source (DLS documentation) governed all three.

### Impact Analysis

| Principle | Impact |
|---|---|
| Token portability | Tokens must be platform-agnostic and convertible per platform |
| Platform conventions | Conflicts with Material Design / HIG must be identified and resolved |
| Touch targets | Platform-specific minimums must be accommodated |
| Responsive breakpoints | New platform screen sizes must be accommodated |
| Component state models | Platform-specific interaction models (mouse vs touch vs keyboard) |

### Verification Checklist

- [ ] Are design tokens in a platform-agnostic format (JSON/YAML)? → structure_spec.md §Token Layer Structure
- [ ] Are platform convention conflicts identified and resolved? → domain_scope.md §Normative System Classification (Tier-1b)
- [ ] Are touch targets adjusted per platform (44pt iOS, 48dp Android)? → logic_rules.md §Accessibility Logic
- [ ] Do breakpoints accommodate new platform screen ranges? → structure_spec.md §Responsive Structure
- [ ] Does the state system accommodate platform-specific interaction models? → structure_spec.md §State System

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Responsive Structure, §State System |
| dependency_rules.md | Verify | §Design Tool–Code Dependency |
| domain_scope.md | Verify | §Normative System Classification (Tier-1b) |

---

## Case 4: Large-Scale Design System Component Addition

### Situation

Adding 10+ new visual components to the existing design system.

### Case Study: Shopify — Polaris Component Expansion (2020)

Shopify expanded Polaris from 40 to 80+ components. Each new component reused the existing token system. New tokens were added only when no existing semantic token fit. Component variants were limited to ≤5 per component. A component proposal process (RFC → design → review → implementation → documentation) was formalized as governance.

### Impact Analysis

| Principle | Impact |
|---|---|
| Token reuse | New components must reuse existing tokens; new tokens justified by 2+ users |
| Atomic Design position | New components must have clear layer assignment (Atom/Molecule/Organism) |
| State completeness | All 5+ states must be defined for each new interactive component |
| Variant discipline | Variant criteria consistent with existing components |
| Governance capacity | Does the contribution/review process accommodate the volume? |

### Verification Checklist

- [ ] Do new components reuse existing tokens? New tokens justified? → dependency_rules.md §Token–Component Dependency
- [ ] Is the Atomic Design layer of new components clear? → structure_spec.md §Component Layer Structure
- [ ] Are all states defined for each new interactive component? → structure_spec.md §State System
- [ ] Are variant criteria consistent with existing components? → logic_rules.md §Component Logic
- [ ] Does governance accommodate large-scale additions? → domain_scope.md §Key Sub-Areas (Governance)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Component Layer Structure, §State System |
| dependency_rules.md | Verify | §Token–Component Dependency |
| domain_scope.md | Verify | §Key Sub-Areas > Design System (Governance) |

---

## Case 5: Multilingual/Multicultural Extension

### Situation

Applying the existing design to new languages (CJK, RTL, Cyrillic) and cultural contexts.

### Case Study: Spotify — Global Expansion to 60+ Markets (2018–2020)

Spotify expanded from 65 to 178 markets: Arabic (RTL), Japanese, German (+30–40% text expansion). Fixed-width containers became flexible. RTL: full layout mirroring (navigation, progress bars, iconography direction) except media playback controls. CJK: typeface fallback stacks (Noto Sans CJK), line-height adjustments, measure adjustments.

### Impact Analysis

| Principle | Impact |
|---|---|
| Typography adaptation | CJK and RTL scripts require typeface fallbacks and line-height adjustments |
| Layout mirroring | RTL requires full layout mirror (except media and math) |
| Text expansion | German/Finnish +30~40%, Chinese −30%. Fixed widths break |
| Cultural sensitivity | Colors, icons, images may carry different cultural meanings |
| Format localization | Date, number, currency visual representations per locale |

### Verification Checklist

- [ ] Does the typography system accommodate new scripts? → dependency_rules.md §Typography–Layout Dependency
- [ ] Does the layout accommodate RTL mirroring? → structure_spec.md §Responsive Structure
- [ ] Does the layout accommodate text expansion (German +40%)? → structure_spec.md §Responsive Structure
- [ ] Are colors, icons, and images culturally appropriate? → logic_rules.md §Brand Alignment Logic
- [ ] Are visual representations for localized formats defined? → structure_spec.md §Visual Design System Required Elements

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Typography System, §Responsive Structure |
| logic_rules.md | Verify | §Typography Logic (measure, line-height) |
| dependency_rules.md | Verify | §Typography–Layout Dependency |

---

## Case 6: Accessibility Level Upgrade

### Situation

Upgrading from WCAG AA to AAA, or responding to new accessibility regulations (e.g., European Accessibility Act 2025).

### Case Study: Gov.uk — GDS Accessibility Standards (2018–2020)

UK GDS mandated WCAG 2.1 AA for all government services. All custom components were audited and rebuilt with accessibility as a baseline requirement. The color palette was revised: 3 of 8 brand colors failed the higher contrast requirements and were adjusted. Focus indicators were standardized to a 3px yellow outline with 4.5:1 contrast.

### Impact Analysis

| Principle | Impact |
|---|---|
| Contrast ratios | AAA requires 7:1 normal text, 4.5:1 large text |
| Brand color adjustment | Some brand colors may not meet AAA; adjustment or usage change needed |
| Text resize | Full functionality at 200% text enlargement must be verified |
| Motion | All motion must have prefers-reduced-motion alternative |
| Focus indicators | Higher contrast and visibility requirements |

### Verification Checklist

- [ ] Can the color system meet AAA contrast ratios? → logic_rules.md §Accessibility Logic
- [ ] Do adjusted colors maintain brand alignment? → logic_rules.md §Constraint Conflict Checks
- [ ] Are all features maintained at 200% text enlargement? → structure_spec.md §Responsive Structure
- [ ] Is prefers-reduced-motion support universal? → logic_rules.md §Motion Logic
- [ ] Are focus indicators enhanced for AAA? → structure_spec.md §State System (Focus)

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §Accessibility Logic (threshold update) |
| structure_spec.md | Verify | §Responsive Structure, §State System |
| dependency_rules.md | Verify | §Color–Accessibility Dependency |

---

## Case 7: Design Tool Migration

### Situation

Design tool change: Sketch → Figma, Figma → another tool.

### Case Study: GitHub — Sketch to Figma Migration (2020)

GitHub's Primer design system migrated from Sketch to Figma. Tokens were already in JSON (Style Dictionary), so token migration was automated. Component library re-creation was manual (3 months). During transition: Figma was the source of truth for new work, Sketch maintained for legacy screens. Token format independence prevented tool lock-in.

### Impact Analysis

| Principle | Impact |
|---|---|
| Token portability | Tokens in tool-independent format (JSON/YAML) require no redefinition |
| Component migration | Component library must be re-created in the new tool |
| Pipeline adaptation | Design token → code pipeline must accommodate the new tool |
| Transition period SoT | Source of truth during parallel tool usage must be defined |
| Design history | Version tracking and decision history preservation |

### Verification Checklist

- [ ] Are tokens in a tool-independent format? → structure_spec.md §Token Layer Structure
- [ ] Is there a component library migration plan? → dependency_rules.md §Design Tool–Code Dependency
- [ ] Does the token build pipeline accommodate the new tool? → dependency_rules.md §Design Tool–Code Dependency
- [ ] Is the source of truth clear during transition? → dependency_rules.md §Source of Truth Management
- [ ] Is design history preserved? → dependency_rules.md §Source of Truth Management

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Design Tool–Code Dependency, §Source of Truth Management |
| structure_spec.md | Verify | §Token Layer Structure |

---

## Case 8: Design System Scale Expansion

### Situation

Expanding from 1~2 maintainers to 5+ contributors, or external teams consuming the design system.

### Case Study: Salesforce — Lightning Design System Governance (2015–2018)

SLDS grew from an internal tool to a system consumed by thousands of external developers. Governance: RFC process for new components, semantic versioning (breaking changes in major versions only), automated token linting, deprecation notices with 2-release migration windows, adoption dashboard tracking. Component naming conventions documented for external contributors.

### Impact Analysis

| Principle | Impact |
|---|---|
| Governance capacity | Contribution/review/approval process must accommodate multiple contributors |
| Naming conventions | Token and component naming must be documented for consistency |
| Version management | Breaking changes, migration guides, deprecation procedures |
| External consumer scope | Full use vs partial use vs extension allowed |
| Quality assurance | Automated linting and visual regression testing |

### Verification Checklist

- [ ] Does governance accommodate multiple contributors? → domain_scope.md §Key Sub-Areas (Governance)
- [ ] Are naming conventions documented? → structure_spec.md §Token Layer Structure
- [ ] Is version management defined? → domain_scope.md §Key Sub-Areas (Governance)
- [ ] Are deprecation procedures defined? → domain_scope.md §Key Sub-Areas (Governance)
- [ ] Is external team scope defined? → dependency_rules.md §Source of Truth Management

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Key Sub-Areas > Design System (Governance) |
| structure_spec.md | Verify | §Token Layer Structure (naming) |
| dependency_rules.md | Verify | §Source of Truth Management |

---

## Case 9: Color Palette Reduction

### Situation

Reducing the number of colors in the palette to improve consistency and reduce maintenance. A shrinkage trigger.

### Case Study: IBM — Carbon Design System Palette Consolidation (2019)

IBM Carbon reduced its color palette from 80+ values to a structured 10-step tonal palette per hue (10 hues × 10 steps = 100 primitives, but semantically organized). Arbitrary colors were mapped to the nearest palette value. Teams initially resisted "losing" their custom colors, but visual consistency improved measurably.

### Impact Analysis

| Principle | Impact |
|---|---|
| Token consolidation | Removed colors must be mapped to remaining tokens |
| Contrast re-verification | All combinations must be re-verified with the reduced palette |
| Brand color preservation | Brand colors must remain in the reduced palette |
| Migration path | Components using removed tokens need token replacement |

### Verification Checklist

- [ ] Are all removed tokens mapped to replacement tokens? → dependency_rules.md §Token–Component Dependency
- [ ] Are all contrast ratios re-verified? → dependency_rules.md §Color–Accessibility Dependency
- [ ] Are brand colors preserved? → dependency_rules.md §Brand–Visual System Dependency
- [ ] Is a migration guide provided for teams using removed tokens? → domain_scope.md §Key Sub-Areas (Governance)

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Token–Component Dependency |
| structure_spec.md | Verify | §Token Layer Structure, §Isolated Node Prohibition |
| logic_rules.md | Verify | §Color Logic |

---

## Case 10: Component Visual Simplification

### Situation

Reducing component visual complexity — fewer variants, fewer visual effects, simpler state representations.

### Case Study: Microsoft — Fluent Design Simplification (2021)

Fluent Design 2 simplified components: reduced shadow levels from 5 to 3, eliminated gradient backgrounds on buttons, consolidated border-radius to 2 values (4px, 8px). Component variant count reduced by ~30%. The visual language became cleaner but maintained all functional states.

### Impact Analysis

| Principle | Impact |
|---|---|
| Variant reduction | Removed variants must have migration paths |
| Token cleanup | Unused tokens after simplification must be removed |
| State preservation | All functional states must be maintained despite visual simplification |
| Visual regression | Simplification must not accidentally change unrelated components |

### Verification Checklist

- [ ] Are removed variants mapped to remaining ones? → structure_spec.md §Component Layer Structure
- [ ] Are unused tokens cleaned up? → structure_spec.md §Isolated Node Prohibition
- [ ] Are all functional states preserved? → structure_spec.md §State System
- [ ] Is visual regression verified? → dependency_rules.md §Token–Component Dependency

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §State System, §Isolated Node Prohibition |
| conciseness_rules.md | Verify | §Removal Target Patterns |

---

## Case 11: Platform Support Discontinuation

### Situation

Dropping support for a browser or platform. Removes visual constraints and enables modern features.

### Case Study: Microsoft — Dropping IE 11 for Microsoft 365 (2021)

IE 11 blocked CSS Grid, Custom Properties, and modern color functions. After dropping: CSS Custom Properties enabled runtime theming, CSS Grid simplified responsive layouts, reduced polyfill bundle by 50KB+. Migration: 6-month notice, IE-specific degradation banner.

### Impact Analysis

| Principle | Impact |
|---|---|
| Constraint removal | Modern CSS features (custom properties, grid, container queries) become available |
| Token implementation | Runtime token switching (CSS Custom Properties) enables dynamic theming |
| Dead code removal | Platform-specific visual workarounds removed |
| New patterns | Previously impossible visual patterns become available |

### Verification Checklist

- [ ] Are platform-specific visual workarounds removed? → structure_spec.md §Isolated Node Prohibition
- [ ] Are newly enabled features evaluated? → domain_scope.md §Key Sub-Areas
- [ ] Is support documentation updated? → domain_scope.md §Reference Standards/Frameworks
- [ ] Is the token implementation updated for new capabilities? → structure_spec.md §Token Layer Structure

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Token Layer Structure, §Isolated Node Prohibition |
| domain_scope.md | Verify | §Reference Standards/Frameworks |

---

## Case 12: Print/Environmental Media Extension

### Situation

Extending a digital design system to print materials, environmental graphics, or packaging.

### Impact Analysis

| Principle | Impact |
|---|---|
| Color space | RGB → CMYK conversion, Pantone matching |
| Typography | Screen typeface → print typeface (different optical characteristics) |
| Layout | Pixel grid → physical units (mm, pt), bleed and trim areas |
| Token adaptation | Digital tokens extended with print-specific values |
| Resolution | 72dpi screen → 300dpi print |

### Verification Checklist

- [ ] Are CMYK equivalents defined for brand colors? → domain_scope.md §Reference Standards/Frameworks
- [ ] Are print typeface selections made? → dependency_rules.md §Brand–Visual System Dependency
- [ ] Are bleed, trim, and safe areas defined? → domain_scope.md §Key Sub-Areas (Print Layout)
- [ ] Are tokens extended with print-specific values? → structure_spec.md §Token Layer Structure

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Key Sub-Areas (Print Layout) |
| structure_spec.md | Modify | §Token Layer Structure |
| dependency_rules.md | Verify | §Brand–Visual System Dependency |

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (Dark Mode) | → Case 4 (Component Addition) | Dark mode may require new component state definitions |
| Case 2 (Brand Renewal) | → Case 6 (Accessibility Upgrade) | New brand colors require full accessibility verification |
| Case 3 (New Platform) | → Case 5 (Multilingual) | Global platform launches often coincide with i18n |
| Case 3 (New Platform) | → Case 1 (Dark Mode) | Mobile platforms require dark mode support |
| Case 4 (Component Addition) | → Case 8 (Scale Expansion) | Large additions require governance capacity |
| Case 5 (Multilingual) | → Case 1 (Dark Mode) | RTL and theming share token architecture concerns |
| Case 7 (Tool Migration) | → Case 8 (Scale Expansion) | Tool migration often coincides with team growth |
| Case 9 (Palette Reduction) | → Case 10 (Simplification) | Color reduction is often part of broader simplification |
| Case 10 (Simplification) | → Case 9 (Palette Reduction) | Component simplification often exposes unused tokens |
| Case 11 (Platform Drop) | → Case 1 (Dark Mode) | Dropping old browsers enables CSS Custom Properties for theming |

---

## Related Documents
- structure_spec.md — Token layers, component layers, responsive structure, state system, isolated node prohibition
- dependency_rules.md — Token–component, brand–visual system, color–accessibility, design tool–code dependencies
- logic_rules.md — Color/typography/accessibility/motion/brand/component logic, constraint conflict checks
- domain_scope.md — Key sub-areas, normative system classification, reference standards
- conciseness_rules.md — Token alias depth, variant count thresholds (relevant to Cases 9, 10)
