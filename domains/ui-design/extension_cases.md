---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Extension Cases

Classification axis: **change trigger** — cases classified by the type of change that triggers structural evolution of the UI. Cases cover both growth triggers (Cases 1–10) and shrinkage triggers (Cases 11–14).

The onto_evolution agent simulates each scenario to verify whether the existing UI design structure breaks.

---

## Case 1: Large-Scale Feature Addition

### Situation

Adding a new major feature requiring IA changes, navigation updates, and new screen states.

### Case Study: Slack — Clips (2021)

Slack added async audio/video messaging (Clips) to its text workspace. By scoping Clips as a message type — entry point in the composer, playback inline in the timeline — the existing IA and global navigation were unchanged. New empty/error states (permission denied, transcription failure) were required.

### Impact Analysis

| Principle | Impact |
|---|---|
| Information architecture | Must fit within existing IA or justify a new top-level section (5–7 item limit) |
| Screen state completeness | All states (ideal/empty/loading/error) must be defined for new screens |
| Pattern reuse | Must reuse design system patterns; new patterns must be consistent |
| CTA hierarchy | Must not conflict with existing CTA hierarchy |

### Verification Checklist

- [ ] Does the IA accommodate the feature within navigation thresholds? → structure_spec.md §Navigation Structure Patterns
- [ ] Are all states (ideal/first-use/loading/error/no-results) defined? → structure_spec.md §Screen State Matrix
- [ ] Does the feature reuse design system patterns? → dependency_rules.md §Referential Integrity (Component–Design System References)
- [ ] Does the CTA not conflict with existing hierarchy? → logic_rules.md §Action Guidance Logic (Primary Action Singularity)
- [ ] Are async operations covered with loading/success/failure? → structure_spec.md §Required Relationships (Async State Completeness)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Verify | §Navigation Structure Patterns, §Screen State Matrix |
| logic_rules.md | Verify | §Navigation Logic, §Action Guidance Logic |
| dependency_rules.md | Verify | §Information Architecture–Navigation Dependency, §Referential Integrity |

---

## Case 2: New Mobile App Launch

### Situation

Extending the existing web interface to a mobile app (iOS/Android) with responsive adaptations and touch optimization.

### Case Study: Airbnb — Mobile-First Redesign (2014–2016)

Airbnb shifted from desktop adaptation to mobile-first: search became full-screen vertical, tables became cards, hover map became tap-to-select, sidebar became 5-item bottom bar. Touch targets standardized to 48×48dp. Platform-specific: iOS used swipe-back; Android used Material bottom sheets.

### Impact Analysis

| Principle | Impact |
|---|---|
| Component transitions | Transition rules required (table → card, sidebar → bottom nav) |
| Touch targets | All elements must meet 44×44px minimum (WCAG 2.5.5) |
| Hover alternatives | Touch alternatives required for hover-dependent interactions |
| Platform conventions | Convention conflicts must have resolution criteria |

### Verification Checklist

- [ ] Are desktop-to-mobile transition rules defined? → structure_spec.md §Responsive Component Transition Rules
- [ ] Do all touch targets meet 44×44px minimum? → logic_rules.md §Action Guidance Logic (Fitts's Law Application)
- [ ] Are touch alternatives defined for hover interactions? → dependency_rules.md §Responsive–Component Dependency (Touch Environment → Hover Alternative)
- [ ] Are platform convention conflicts resolved? → domain_scope.md §Normative System Classification (Tier-1b)
- [ ] Is content priority preserved in responsive transitions? → dependency_rules.md §Responsive–Component Dependency (Screen Reduction → Content Priority)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Responsive Component Transition Rules, §Navigation Structure Patterns |
| dependency_rules.md | Verify | §Responsive–Component Dependency |
| logic_rules.md | Verify | §Navigation Logic (Mobile Navigation Discoverability) |

---

## Case 3: User Type Diversification

### Situation

Expanding from a single user type to multiple types (general, admin, power user) with role-based UI variations.

### Case Study: Notion — Team Plans and Permission Tiers (2020–2022)

Notion expanded from personal tool to team workspace with Members, Admins, and Guests. Each role saw different sidebar content; inaccessible features were disabled with tooltips; out-of-scope features were hidden. Admins had dense settings; Members saw simplified views. A sidebar role indicator communicated permission context.

### Impact Analysis

| Principle | Impact |
|---|---|
| Information density | Dense for admins, concise for general users |
| Permission-based display | Hide vs disable vs upgrade prompt must be consistent |
| Navigation adjustment | Must adjust per user type without breaking wayfinding |
| Role context | Users must know which role they operate under |

### Verification Checklist

- [ ] Are density variations designed per user type? → logic_rules.md §Constraint Conflict Checks (Information Density vs Cognitive Load)
- [ ] Is unpermitted feature handling consistent? → structure_spec.md §Screen State Matrix (No Permission state)
- [ ] Are admin-only features not exposed to general users? → dependency_rules.md §Referential Integrity (Cross-Screen References)
- [ ] Is navigation adjusted per user type? → dependency_rules.md §Information Architecture–Navigation Dependency
- [ ] Is the current role visible? → logic_rules.md §Navigation Logic (Wayfinding Completeness)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Screen State Matrix, §Classification Criteria Design |
| logic_rules.md | Verify | §Constraint Conflict Checks, §Navigation Logic |
| dependency_rules.md | Verify | §Referential Integrity, §Information Architecture–Navigation Dependency |

---

## Case 4: Complex Form Addition

### Situation

Expanding from simple inputs to complex forms (20+ fields) with multi-step division, conditional logic, and cross-step validation.

### Case Study: TurboTax — Tax Filing Form Redesign (2019)

Intuit restructured TurboTax (100+ fields) from linear flow to a topic-based hub: sections completable in any order with status indicators. Conditional branching was pervasive ("Self-employment?" → Yes revealed 15+ fields). Auto-save persisted every change. Cross-step validation surfaced errors with links to the conflicting field in another section.

### Impact Analysis

| Principle | Impact |
|---|---|
| Multi-step division | Divide into logical, conceptually complete steps |
| Progress indication | Current step, total steps, inter-step navigation visible |
| Conditional fields | Show/hide logic based on previous answers defined |
| Draft saving | Automatic preservation to prevent data loss |
| Cross-step errors | Errors in another step require navigation to source |

### Verification Checklist

- [ ] Is the form divided into logical multi-step units? → logic_rules.md §Form Design Logic (Multi-Step Form Coherence)
- [ ] Are progress indicators present? → structure_spec.md §Form Structure Principles (Multi-Step Forms)
- [ ] Is conditional field logic defined? → dependency_rules.md §Form–Validation Dependency (Multi-Step Form Dependencies)
- [ ] Is cross-step error navigation defined? → dependency_rules.md §Form–Validation Dependency (Validation → Error Display)
- [ ] Are all field validation rules defined? → dependency_rules.md §Form–Validation Dependency (Input Field → Validation Rules)

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §Form Design Logic |
| dependency_rules.md | Modify | §Form–Validation Dependency |
| structure_spec.md | Verify | §Form Structure Principles |

---

## Case 5: Real-Time Collaboration Feature Addition

### Situation

Expanding from single-user to multi-user real-time collaboration with presence, conflict resolution, and notification management.

### Case Study: Figma — Multiplayer Design (2016–2019)

Figma pioneered real-time multiplayer design: colored cursors with avatars, concurrent edits resolved via operational transform (no conflict dialogs), connection status indicator (green/yellow/red). Notifications used a sidebar panel rather than popups to prevent fatigue.

### Impact Analysis

| Principle | Impact |
|---|---|
| Presence indicators | Visible without disrupting the current user |
| Conflict resolution | Display/resolution for simultaneous edits defined |
| Disconnection handling | Offline display and reconnection guidance |
| Notification management | Change notifications must not cause fatigue |

### Verification Checklist

- [ ] Is a presence indicator designed? → structure_spec.md §UI Design Required Elements (Feedback System)
- [ ] Are concurrent edit conflict methods defined? → structure_spec.md §Screen State Matrix
- [ ] Are disconnection/reconnection states defined? → structure_spec.md §Screen State Matrix (Offline state)
- [ ] Are notifications managed to prevent fatigue? → logic_rules.md §Feedback Logic (Notification Fatigue Management)
- [ ] Are live regions used for screen reader announcements? → dependency_rules.md §Accessibility–Interaction Dependency (Dynamic Content → Live Region)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Screen State Matrix, §UI Design Required Elements (Feedback System) |
| logic_rules.md | Verify | §Feedback Logic |
| dependency_rules.md | Verify | §Action–Feedback Dependency, §Accessibility–Interaction Dependency |

---

## Case 6: Comprehensive Accessibility Improvement

### Situation

Full application of WCAG 2.2 AA to a previously accessibility-deficient interface.

### Case Study: Gov.uk — GDS Accessibility Overhaul (2018–2020)

UK GDS mandated WCAG 2.1 AA for all services. Custom components replaced with native HTML where possible; unavoidable ones received full ARIA specification. The error summary pattern (linked list at form top) became widely adopted. Skip links added to every page; time limits included 20-second warnings with extension buttons.

### Impact Analysis

| Principle | Impact |
|---|---|
| Keyboard access | All interactive elements keyboard accessible with logical tab order |
| Focus management | Traps for modals, restoration on close, management for dynamic content |
| ARIA specification | Custom components must have roles/states/properties |
| Time limits | Extension mechanisms required (WCAG 2.2.1) |

### Verification Checklist

- [ ] Is keyboard access available for all interactive elements? → logic_rules.md §Accessible Interaction Logic (Tab Order Integrity)
- [ ] Are focus traps and restoration applied to modals? → dependency_rules.md §Modal–Focus Dependency
- [ ] Are ARIA live regions applied to dynamic content? → dependency_rules.md §Accessibility–Interaction Dependency (Dynamic Content → Live Region)
- [ ] Are ARIA roles/states assigned to custom components? → dependency_rules.md §Accessibility–Interaction Dependency (Custom Component → ARIA Specification)
- [ ] Are keyboard alternatives provided for drag-and-drop? → dependency_rules.md §Accessibility–Interaction Dependency (Drag-and-Drop → Keyboard Alternative)
- [ ] Are extension mechanisms provided for time limits? → dependency_rules.md §Accessibility–Interaction Dependency (Time Limit → Extension Mechanism)

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Accessibility–Interaction Dependency, §Modal–Focus Dependency |
| logic_rules.md | Modify | §Accessible Interaction Logic |
| structure_spec.md | Verify | §UI Design Required Elements (Accessible Interaction) |
| domain_scope.md | Verify | §Normative System Classification (Tier-1a) |

---

## Case 7: Dashboard/Analytics Screen Addition

### Situation

Adding data dashboards to an existing CRUD interface with visualization patterns and per-widget state management.

### Case Study: Shopify — Analytics Dashboard (2019–2021)

Shopify added analytics dashboards to its CRUD-focused merchant admin. Each widget loaded independently with its own skeleton and error states. Responsive: desktop 2×3 grid → tablet 2×2 → mobile single-column by merchant priority. New stores saw sample data with a disclosure banner.

### Impact Analysis

| Principle | Impact |
|---|---|
| Information hierarchy | Metric priority defines dashboard layout |
| Chart interactions | Hover, drill-down, filter integration designed |
| Per-widget states | Loading/error/empty independent per widget |
| Responsive behavior | Chart rearrangement defined per breakpoint |

### Verification Checklist

- [ ] Is metric priority defined? → structure_spec.md §UI Design Required Elements (Data Display System)
- [ ] Are chart interactions designed? → logic_rules.md §Data Display Logic
- [ ] Are per-widget loading/error/empty states defined? → structure_spec.md §Required Relationships (Async State Completeness)
- [ ] Is responsive layout defined per breakpoint? → structure_spec.md §Responsive Component Transition Rules
- [ ] Is data freshness indicated? → dependency_rules.md §Referential Integrity (State References)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §UI Design Required Elements (Data Display System), §Responsive Component Transition Rules |
| logic_rules.md | Verify | §Data Display Logic, §Feedback Logic (Loading State Representation) |
| dependency_rules.md | Verify | §Data–Display Dependency, §Referential Integrity |

---

## Case 8: Internationalization (i18n) Extension

### Situation

Extending from single-language to multi-language support with text expansion, RTL, and locale-specific formatting.

### Case Study: Spotify — Global Expansion to 60+ Markets (2018–2020)

Spotify expanded from 65 to 178 markets: Arabic (RTL), Japanese, German (+30–40% expansion). Fixed-width containers became flexible. RTL: full mirroring (sidebar, progress bars, icons) except media elements. Date/time/number formatting localized per region.

### Impact Analysis

| Principle | Impact |
|---|---|
| Text expansion | Accommodate length changes (German +30–40%, Chinese -30%) |
| RTL support | Layout, icons, progress indicators mirror for RTL |
| Format localization | Date/time/number/currency accept regional formats |
| Translation completeness | All user-facing text in translation scope |

### Verification Checklist

- [ ] Does layout accommodate text expansion? → structure_spec.md §Form Structure Principles (Field Width)
- [ ] Are layout/icons/progress mirrored for RTL? → structure_spec.md §Responsive Component Transition Rules
- [ ] Do fields accept regional formats? → logic_rules.md §Form Design Logic
- [ ] Are navigation labels contained after translation? → structure_spec.md §Navigation Structure Patterns
- [ ] Are all user-facing texts in translation scope? → structure_spec.md §UI Design Required Elements

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Form Structure Principles, §Navigation Structure Patterns |
| logic_rules.md | Verify | §Navigation Logic (Label Clarity) |
| domain_scope.md | Verify | §Bias Detection Criteria (internationalization absence) |

---

## Case 9: Design System Adoption/Migration

### Situation

Migrating from ad-hoc components to a formalized design system, or between design systems.

### Case Study: Salesforce — Lightning Design System (2015–2018)

Salesforce migrated 200+ screens from Classic UI (23 button styles, 7 modal implementations) to SLDS with 80+ design tokens. Strategy: audit → compatibility layers → screen-by-screen migration with A/B testing → 12-month sunset. "Lightning Ready" badges marked migrated pages. Adoption enforced via automated linting.

### Impact Analysis

| Principle | Impact |
|---|---|
| Component audit | Inventory and map existing patterns to design system equivalents |
| Token standardization | Replace ad-hoc values with design tokens |
| Migration coexistence | Old and new patterns coexist without confusing users |
| Governance | Contribution model, versioning, adoption enforcement defined |

### Verification Checklist

- [ ] Is a component audit mapping to design system equivalents complete? → dependency_rules.md §Referential Integrity (Component–Design System References)
- [ ] Are design tokens the single source of truth? → domain_scope.md §Key Sub-Areas > Design System Architecture (Token System)
- [ ] Is a migration strategy with coexistence defined? → structure_spec.md §UI Design Required Elements
- [ ] Are deprecated patterns documented with timelines? → domain_scope.md §Key Sub-Areas > Design System Architecture (Governance)
- [ ] Is adoption enforced via tooling? → domain_scope.md §Normative System Classification (Tier-2 enforcement)
- [ ] Are accessibility requirements preserved during migration? → domain_scope.md §Normative System Classification (Tier-1a overrides Tier-2)

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Key Sub-Areas > Design System Architecture, §Normative System Classification |
| dependency_rules.md | Modify | §Referential Integrity, §Source of Truth Management |
| structure_spec.md | Verify | §Isolated Node Prohibition |
| logic_rules.md | Verify | §Constraint Conflict Checks (Consistency vs Contextual Appropriateness) |

---

## Case 10: Dark Mode / Theming Addition

### Situation

Adding dark mode or a theming system to a light-only interface.

### Case Study: Apple — iOS 13 System-Wide Dark Mode (2019)

Apple built dark mode on semantic colors (`systemBackground`, `label`) resolving per mode. Elevated surfaces used lighter backgrounds in dark (opposite of light-mode shadows). Contrast verified against WCAG AA in both modes. System respected `prefers-color-scheme`; transitions used cross-dissolve to avoid flashes.

### Impact Analysis

| Principle | Impact |
|---|---|
| Semantic tokens | Hardcoded colors become semantic tokens resolving per theme |
| Contrast ratios | WCAG AA maintained in every theme variant |
| Elevation model | Light uses shadows, dark uses surface brightness |
| User preference | Persist and respect system-level settings |

### Verification Checklist

- [ ] Are all colors expressed as semantic tokens? → domain_scope.md §Key Sub-Areas > Design System Architecture (Token System)
- [ ] Do all variants maintain WCAG AA contrast? → domain_scope.md §Normative System Classification (Tier-1a)
- [ ] Does the system respect `prefers-color-scheme`? → dependency_rules.md §Source of Truth Management (External Source of Truth)
- [ ] Is mode transition smooth without flash? → domain_scope.md §Key Sub-Areas > Micro-interaction & Animation (Transition Design)

### Affected Files

| File | Impact | Section |
|---|---|---|
| domain_scope.md | Modify | §Key Sub-Areas > Design System Architecture, §Key Sub-Areas > Micro-interaction & Animation |
| dependency_rules.md | Verify | §Source of Truth Management |
| logic_rules.md | Verify | §Constraint Conflict Checks (Accessibility vs Visual Simplicity) |

---

## Case 11: Navigation Simplification (Menu Consolidation/Removal)

### Situation

Reducing top-level navigation by consolidating or removing sections. A shrinkage trigger.

### Case Study: Google — Gmail Navigation Consolidation (2022)

Google consolidated Gmail's separate Mail/Chat/Spaces/Meet navigation into a unified sidebar. Chat and Spaces merged; Meet reduced to an icon; Labs features moved to a side panel. Mitigation: reorientation tooltip, redirects from old URLs, settings to restore layout choices.

### Impact Analysis

| Principle | Impact |
|---|---|
| Navigation reduction | Removed items must not leave users stranded |
| URL integrity | Old URLs redirect, not 404 |
| User reorientation | Established workflows need migration guidance |
| Secondary navigation | Breadcrumbs, sitemaps, footer links update synchronously |

### Verification Checklist

- [ ] Are all functions still reachable through the new structure? → logic_rules.md §Navigation Logic (Wayfinding Completeness)
- [ ] Are old URLs redirected? → dependency_rules.md §Referential Integrity (Navigation–URL References)
- [ ] Are secondary navigation elements updated? → dependency_rules.md §Information Architecture–Navigation Dependency (Navigation Change → Secondary Navigation Update)
- [ ] Is reorientation guidance provided? → logic_rules.md §Action Guidance Logic (Progressive Disclosure of Guidance)
- [ ] Are search scope categories updated? → dependency_rules.md §Information Architecture–Navigation Dependency (IA → Search)

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Navigation Structure Patterns |
| dependency_rules.md | Modify | §Information Architecture–Navigation Dependency, §Referential Integrity |
| logic_rules.md | Verify | §Navigation Logic |

---

## Case 12: Component Consolidation/Retirement

### Situation

Retiring legacy patterns and consolidating multiple implementations into a single approved component.

### Case Study: Atlassian — Atlaskit Consolidation (2020–2022)

Atlassian's products had 5 date pickers, 4 modals, 3 dropdowns with different behavior. Consolidation: cross-product audit → canonical version → 6–12 month deprecation → migration guides → lint rules. The canonical date picker unified Jira/Confluence/Bitbucket use cases via configuration API. Zero-usage components removed; others got "legacy" with console warnings.

### Impact Analysis

| Principle | Impact |
|---|---|
| Component audit | All legacy instances identified across the product |
| Canonical selection | One implementation covers all use cases it replaces |
| Migration path | Deprecated components need documentation |
| Deprecation enforcement | Tooling (lint, warnings) enforces migration |

### Verification Checklist

- [ ] Are all legacy pattern instances identified? → dependency_rules.md §Referential Integrity (Component–Design System References)
- [ ] Does the canonical component cover all use cases? → structure_spec.md §UI Design Required Elements
- [ ] Is deprecation timeline defined with documentation? → domain_scope.md §Key Sub-Areas > Design System Architecture (Governance)
- [ ] Is enforcement automated? → domain_scope.md §Normative System Classification (Tier-2 enforcement)
- [ ] Is accessibility preserved or improved? → logic_rules.md §Accessible Interaction Logic (Native HTML Preference)
- [ ] Are deprecated components eventually removed? → structure_spec.md §Isolated Node Prohibition

### Affected Files

| File | Impact | Section |
|---|---|---|
| dependency_rules.md | Modify | §Referential Integrity, §Source of Truth Management |
| structure_spec.md | Verify | §Isolated Node Prohibition |
| domain_scope.md | Verify | §Key Sub-Areas > Design System Architecture (Governance) |

---

## Case 13: Platform Support Discontinuation

### Situation

Dropping support for a platform, browser, or device category. Removes constraints and enables new patterns.

### Case Study: Microsoft — Dropping IE 11 for Microsoft 365 (2021)

IE 11 blocked CSS Grid, Custom Properties, and `IntersectionObserver`, adding 50KB+ polyfills. After dropping: Teams adopted CSS Grid, Outlook enabled theming via Custom Properties, polyfills removed. Migration: 6-month notice, IE-specific banner, degraded read-only in the final month.

### Impact Analysis

| Principle | Impact |
|---|---|
| Constraint removal | Enables previously blocked modern patterns |
| User notification | Advance notice and migration path required |
| Pattern enablement | Previously impossible patterns available |
| Dead code removal | Platform-specific workarounds cleaned up |

### Verification Checklist

- [ ] Are users notified with timeline and migration path? → logic_rules.md §Feedback Logic (Feedback Duration by Urgency)
- [ ] Are platform-specific workarounds removed? → structure_spec.md §Isolated Node Prohibition
- [ ] Are newly enabled patterns evaluated? → domain_scope.md §Key Sub-Areas > Design System Architecture
- [ ] Is support documentation updated? → domain_scope.md §Reference Standards/Frameworks

### Affected Files

| File | Impact | Section |
|---|---|---|
| structure_spec.md | Modify | §Responsive Component Transition Rules, §Isolated Node Prohibition |
| domain_scope.md | Verify | §Reference Standards/Frameworks |
| logic_rules.md | Verify | §Feedback Logic |

---

## Case 14: Feature Simplification (Power User → General User Pivot)

### Situation

Simplifying a feature-rich interface for a broader audience by reducing complexity and restructuring information density.

### Case Study: Microsoft — Simplified Ribbon for Office 365 (2018–2020)

Telemetry showed 80% of users used <20% of Ribbon commands (50+ buttons, 7+ tabs). Simplified Ribbon: 10–15 commands in one row, "..." overflow, toggle to restore classic. Context-sensitive: selecting text showed formatting; selecting an image showed image tools.

### Impact Analysis

| Principle | Impact |
|---|---|
| Feature prioritization | Classify by usage frequency for visibility decisions |
| Progressive disclosure | Advanced features accessible but not prominent |
| Default experience | Optimize for the majority user |
| Reversibility | Power users can restore the full view |

### Verification Checklist

- [ ] Are features classified by usage frequency? → logic_rules.md §Constraint Conflict Checks (Simplicity vs Discoverability)
- [ ] Is progressive disclosure used for non-core features? → logic_rules.md §Action Guidance Logic (Progressive Disclosure of Guidance)
- [ ] Does the default optimize for the majority? → logic_rules.md §Constraint Conflict Checks (Information Density vs Cognitive Load)
- [ ] Can power users restore the full view? → structure_spec.md §UI Design Required Elements (Action Guidance System)
- [ ] Are hidden features still discoverable? → logic_rules.md §Constraint Conflict Checks (Simplicity vs Discoverability)
- [ ] Is wayfinding completeness maintained? → logic_rules.md §Navigation Logic (Wayfinding Completeness)

### Affected Files

| File | Impact | Section |
|---|---|---|
| logic_rules.md | Modify | §Constraint Conflict Checks |
| structure_spec.md | Verify | §UI Design Required Elements, §Navigation Structure Patterns |
| dependency_rules.md | Verify | §Information Architecture–Navigation Dependency |

---

## Scenario Interconnections

| Scenario | Triggers / Interacts With | Reason |
|---|---|---|
| Case 1 (Feature Addition) | → Case 9 (Design System) | New features may require new design system components |
| Case 2 (Mobile Launch) | → Case 6 (Accessibility) | Mobile introduces touch accessibility requirements |
| Case 2 (Mobile Launch) | → Case 8 (i18n) | Global mobile launches often coincide with i18n |
| Case 3 (User Diversification) | → Case 14 (Simplification) | Adding general users often requires simplifying the power-user UI |
| Case 4 (Complex Forms) | → Case 6 (Accessibility) | Complex forms have the highest accessibility failure rate |
| Case 5 (Collaboration) | → Case 1 (Feature Addition) | Collaboration is itself a large feature addition |
| Case 7 (Dashboard) | → Case 2 (Mobile) | Dashboards need responsive strategies different from forms |
| Case 8 (i18n) | → Case 10 (Theming) | RTL and theming share token architecture concerns |
| Case 9 (Design System) | → Case 12 (Consolidation) | Adoption necessitates retiring legacy components |
| Case 10 (Theming) | → Case 9 (Design System) | Theming requires a token-based design system |
| Case 11 (Nav Simplification) | → Case 14 (Simplification) | Nav simplification is often part of broader simplification |
| Case 13 (Platform Drop) | → Case 10 (Theming) | Dropping old browsers enables CSS Custom Properties |
| Case 14 (Simplification) | → Case 11 (Nav Simplification) | Feature simplification often includes navigation reduction |

---

## Related Documents
- structure_spec.md — Navigation structure, screen state matrix, responsive transitions, required relationships, form structure, isolated node prohibition
- dependency_rules.md — IA–navigation, action–feedback, form–validation, modal–focus, responsive–component, accessibility–interaction dependencies, referential integrity, source of truth
- logic_rules.md — Navigation/form/feedback/modal/action/data display/accessibility logic, constraint conflict checks
- domain_scope.md — Key sub-areas, normative system classification, reference standards, cross-cutting concerns, bias detection
