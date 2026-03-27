# Visual Design Domain — Extension Scenarios

Each scenario is simulated to verify whether the existing visual design system breaks.

## Case 1: Dark Mode Addition

- Adding dark mode to an existing light mode system
- Verification: Are semantic tokens designed theme-independently so that switching is possible by simply replacing values?
- Verification: Do all text-background combinations in dark mode meet WCAG contrast ratio criteria?
- Verification: Are non-color visual elements (shadow, border, overlay) appropriately adjusted for dark mode?
- Verification: Are images, icons, and illustrations visually appropriate on a dark background?
- Verification: Are semantic colors (error, success, etc.) still clearly meaningful in dark mode?
- Affected files: dependency_rules.md (color–accessibility dependency), structure_spec.md (token layers)

## Case 2: Brand Renewal

- Brand identity change (full replacement of logo, brand colors, typefaces, tone and manner)
- Verification: When brand colors change, does the propagation path through the entire color system (primitive → semantic → component) function correctly?
- Verification: Has the type scale, line-height, and measure been re-verified with the new brand typeface?
- Verification: Have icon style, image style, and motion characteristics been adjusted to match the new tone and manner?
- Verification: Is the transition period (old brand → new brand) co-existence duration and migration plan defined?
- Verification: Are accessibility criteria still met with the new brand colors?
- Affected files: dependency_rules.md (brand–visual system dependency), logic_rules.md (brand alignment logic)

## Case 3: New Platform Support

- Extending the existing web design system to mobile apps (iOS/Android), desktop apps, kiosks, etc.
- Verification: Are design tokens designed platform-agnostically so they can be converted for the new platform?
- Verification: Are conflicts with platform-specific design conventions (Material Design, HIG) identified and resolved?
- Verification: Are platform-specific interaction differences (touch target sizes, gesture patterns) reflected?
- Verification: Do responsive breakpoints accommodate the new platform's screen size range?
- Verification: Does the component state system accommodate platform-specific interaction models (mouse vs touch vs keyboard)?
- Affected files: structure_spec.md (responsive structure, state system), logic_rules.md (accessibility logic)

## Case 4: Large-Scale Design System Component Addition

- Adding 10 or more new components to the existing design system
- Verification: Do new components reuse the existing token system (primitive/semantic/component)? If new tokens are needed, are they consistent with the existing system?
- Verification: Is the position of new components in the Atomic Design hierarchy (Atom/Molecule/Organism) clear?
- Verification: Are all states (default/hover/active/focus/disabled, etc.) defined for new components?
- Verification: Are the variant criteria of new components consistent with existing component variant criteria?
- Verification: Does design system governance (add/approval procedures) accommodate large-scale additions?
- Affected files: structure_spec.md (component layers, token layers), dependency_rules.md (token–component dependency)

## Case 5: Multilingual/Multicultural Extension

- Applying the existing design to new languages (CJK, RTL, Cyrillic, etc.) and new cultural contexts
- Verification: Does the typography system accommodate the characteristics of new scripts (CJK square characters, Arabic RTL)?
- Verification: Does the layout accommodate RTL (right-to-left) conversion? (including icon direction, progress indicator direction)
- Verification: Does the layout flexibly accommodate text expansion (text length changes from translation)? (German can be 30~40% longer than English)
- Verification: Do colors, icons, and images not carry culturally inappropriate meanings?
- Verification: Are visual representations for localization elements (dates, numbers, currencies) defined?
- Affected files: logic_rules.md (typography logic), structure_spec.md (responsive structure)

## Case 6: Accessibility Level Upgrade

- Upgrading accessibility criteria from WCAG AA to AAA, or responding to new accessibility regulations
- Verification: Can the color system be adjusted to meet AAA contrast ratios (7:1 for normal text, 4.5:1 for large text)?
- Verification: Do adjusted colors maintain brand alignment? If conflicting, is there a resolution plan?
- Verification: Are all features maintained when text size is enlarged to 200%?
- Verification: Is prefers-reduced-motion support included for all motion?
- Verification: Is cognitive accessibility (information overload prevention, consistent navigation, clear labeling) systematically addressed?
- Affected files: logic_rules.md (accessibility logic, constraint conflicts), dependency_rules.md (color–accessibility dependency)

## Case 7: Design Tool Migration

- Design tool change such as Sketch → Figma, Figma → another tool
- Verification: Are design tokens managed in a tool-independent format (JSON, YAML, etc.) so no redefinition is needed during tool migration?
- Verification: Is there a component library migration plan?
- Verification: Does the design tool–code synchronization pipeline accommodate the new tool?
- Verification: Is the source of truth clear during the transition period (old and new tools in parallel)?
- Verification: Is design history (version tracking) preserved?
- Affected files: dependency_rules.md (design tool–code dependency), structure_spec.md (source of truth)

## Case 8: Design System Team Scale Expansion

- Expanding from 1~2 design system maintainers to a team of 5 or more, or external teams (agencies, partners) using the design system
- Verification: Does design system governance (contribution/review/approval procedures) accommodate multiple contributors?
- Verification: Are component naming conventions and structure rules documented so new contributors can work consistently?
- Verification: Does version management (breaking change distinction, migration guides) accommodate multiple consumers?
- Verification: Are deprecation procedures for tokens/components defined?
- Verification: Is the scope for external teams (full use vs partial use vs extension allowed) defined?
- Affected files: structure_spec.md (design system governance), dependency_rules.md (source of truth management)

## Related Documents
- structure_spec.md — Token layers, component layers, responsive structure, state system
- dependency_rules.md — Token–component, brand–visual system, color–accessibility, design tool–code dependency
- logic_rules.md — Color/typography/accessibility/motion/brand logic
