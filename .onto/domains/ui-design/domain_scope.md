---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Domain Scope Definition

This is the reference document used by coverage to identify "what should exist but is missing."
This domain applies when **reviewing** the structure, patterns, and interaction design of user interfaces (UI).

> **Boundary with visual-design domain**: visual-design covers the "visual expression system" including color, typography, composition, and branding. This domain covers "the structure through which the interface accommodates user intent and communicates results." Button color and typeface are under visual-design's jurisdiction; where a button is placed, what feedback it provides, and when it is disabled are under this domain's jurisdiction.

## Key Sub-Areas

Classification axis: **UI design concern** — Classified by the design concern that the interface must address.

Applicability markers:
- **(required)**: Must be addressed in any UI design review. Absence indicates a fundamental gap
- **(when applicable)**: Address when the system's feature set includes the relevant pattern. Condition type: feature existence (binary — the feature either exists or does not)
- **(scale-dependent)**: Becomes required beyond a scale threshold documented per item. Condition type: scale threshold (a quantitative boundary is crossed)

`(when applicable)` and `(scale-dependent)` are **mutually exclusive** (ME). `(when applicable)` triggers on binary feature presence. `(scale-dependent)` triggers when a continuous scale metric exceeds a threshold. No item carries both.

Compound-condition handling:
- If a concern depends on both feature presence and scale, split it into two statements: the feature-level concern uses `(when applicable)`, and the governance/systemization concern uses `(scale-dependent)`
- Do not encode mixed conditions such as "when applicable and large-scale" into a single marker. Mixed triggers hide the primary enforcement point and make coverage checks non-deterministic
- If applicability is unknown at review time, record the unknown explicitly. Do not upgrade an unknown condition to `(required)` by default

Scale axes for `(scale-dependent)` items:
- **Screen count**: Number of distinct screens/views in the product
- **User type count**: Number of distinct user roles or personas
- **Data volume**: Volume of data items displayed, stored, or manipulated

### Navigation
- **Information Architecture** (required): Content classification and hierarchy, menu structure, sitemap/app map
- **Navigation Patterns** (required): Global navigation (top bar/sidebar), local navigation (tabs/segments), secondary navigation (breadcrumbs/pagination)
- **Navigation Paths** (required): Path count and depth to reach desired information/functionality; abandonment rate impact of deeper paths
- **Search** (when applicable): Search UI patterns, filters/sorting, autocomplete, no-results state

### Forms and Input
- **Form Structure** (required): Field grouping, logical order, multi-step division, required/optional distinction
- **Input Types** (required): Text, selection (select/radio/checkbox), date/time, file upload, free input vs restricted input
- **Validation** (required): Real-time vs on-submit validation, inline error messages, error summary, success feedback
- **Input Aids** (required): Placeholders, help text, input masks, default values, autocomplete

### Feedback and Status
- **System Feedback** (required): Success/failure/warning/info messages, notifications, toasts, banners
- **Loading States** (required): Spinners, skeleton screens, progress bars, optimistic updates
- **Empty States** (required): No data, no search results, first-use state — each requires different guidance
- **Error States** (required): Network errors, permission errors, 404, 500, type-specific error pages/states

### Data Display
- **Lists and Tables** (required): List view, table, card view, grid view — selection criteria based on data characteristics
- **Sorting and Filtering** (required): Sort criteria display, active filter display, filter reset, compound filters
- **Pagination** (required): Page numbers, infinite scroll, "load more" button — selection based on data volume and browsing patterns
- **Data Visualization** (when applicable): Chart/graph interactions (hover info, zoom, filter), dashboard composition

### Modals and Overlays
- **Modal Dialogs** (required): Usage criteria, close mechanisms, focus trap, background interaction blocking
- **Dropdowns/Popovers** (required): Trigger elements, placement, collision avoidance, close conditions
- **Bottom Sheets/Drawers** (when applicable): Mobile bottom sheets, side drawers, slide-overs — usage context and close gestures

### Action and Decision
- **CTA Design** (required): Visual and positional distinction between primary and secondary actions
- **Destructive Actions** (required): Confirmation patterns for deletion/non-cancelable operations; undo provision
- **Choice and Comparison** (when applicable): Option presentation methods, comparison UI, recommendation/default selection
- **Onboarding** (when applicable): First-use guidance, feature discovery, coach marks, tours

### Responsive UI Adaptation
- **Component Adaptation** (required): Component variations based on screen size (desktop table → mobile card, top bar → bottom navigation)
- **Content Priority** (required): Criteria for what to keep vs reduce/hide when screen shrinks
- **Touch vs Pointer** (required): Touch target size (44×44px minimum per WCAG 2.5.5), touch alternatives for hover-dependent interactions

### Accessible Interaction
- **Keyboard Navigation** (required): Tab order, focus management, keyboard shortcuts, skip links
- **Screen Reader** (required): ARIA roles, states, properties, live regions
- **Cognitive Load Management** (required): Progressive disclosure, preventing cognitive overload, consistent pattern usage

### Design System Architecture
- **Token System** (scale-dependent): Design tokens (color, spacing, typography, elevation) as the single source of truth for visual consistency. Scale threshold: screen count >10 or multiple contributing teams
- **Component Library** (scale-dependent): Reusable component inventory, component API design (props/variants/slots), composition patterns. Scale threshold: screen count >15 or user type count >3
- **Pattern Documentation** (scale-dependent): Component usage guidelines, do/don't examples, accessibility requirements per component. Scale threshold: component library >20 distinct components
- **Governance** (scale-dependent): Contribution model, versioning strategy, deprecation process, adoption metrics. Scale threshold: multiple teams consuming the design system

### Micro-interaction & Animation
- **Transition Design** (when applicable): Page transitions, state transitions (expand/collapse, show/hide), loading-to-content transitions
- **Feedback Animation** (when applicable): Button press responses, success/error animations, pull-to-refresh
- **Motion System** (scale-dependent): Easing curves, duration scales, motion principles (functional vs decorative). Scale threshold: 5+ distinct animation types
- **Reduced Motion** (required): Respect `prefers-reduced-motion` media query — accessibility requirement, not optional enhancement

## Normative System Classification

Standards governing UI design operate at four distinct tiers with different enforcement mechanisms and change velocity.

| Tier | Name | Enforcement Mechanism | Change Velocity | Examples |
|------|------|----------------------|-----------------|---------|
| Tier-1a | Accessibility Standards | **Legal obligation** + browser/device enforcement | Slow (years) | WCAG 2.2, WAI-ARIA 1.2, ADA, EAA |
| Tier-1b | Platform Standards | **OS/app store review** + device API constraints | Slow (years) | Apple HIG mandatory, Material Design mandatory, system gestures |
| Tier-2 | Design System / Framework | Design system linting/tokens, component library constraints | Medium (quarterly) | Internal design system, Material Design 3 optional, Carbon, Ant Design |
| Tier-3 | Industry Principles / Heuristics | Design review, usability testing | Fast (per incident) | Nielsen's Heuristics, Fitts's Law, Hick's Law, Gestalt Principles |

**Ordering principle**: Binding force determines priority: **Tier-1a > Tier-1b > Tier-2 > Tier-3**. When rules from different tiers conflict, the higher tier prevails. This ordering aligns with the existing Source of Truth priority in dependency_rules.md.

Tier classification decision tree:
1. **Tier-1a**: Would non-conformance create an accessibility/legal violation or contradict browser/assistive-technology processing rules?
2. **Tier-1b**: If not Tier-1a, is the rule enforced by OS conventions, device APIs, or app store/platform review expectations?
3. **Tier-2**: If not Tier-1a/1b, is the rule enforced by an internal design system, component library, token system, or lintable design governance?
4. **Tier-3**: If none of the above apply, treat it as an industry heuristic, usability principle, or project-level design judgment

Tier-1 internal classification axis:
- **Primary split inside Tier-1**: enforcement domain, not abstraction level. Tier-1a owns accessibility/legal/assistive-technology processing baselines. Tier-1b owns platform-review/API/device-behavior baselines
- **Expansion rule**: do not create a new Tier-1x merely because a clause is stricter or more specific. Extend Tier-1 only when a new enforcement domain exists that cannot be represented as accessibility/legal or platform/review/API

Secondary ordering within Tier-1:
1. **Within Tier-1a**: browser/assistive-technology processing requirements and legally binding accessibility requirements override interpretation techniques or implementation advice
2. **Within Tier-1b**: non-overridable OS/device/API constraints override app-store/review-blocking requirements, which override reference-only platform guidance
3. **If still tied**: prefer the narrower rule governing the concrete interaction under review, then document the overridden peer rule and rationale

**UI-specific enforcement mechanisms** (distinct from software engineering's compiler/lint/code review):
- **Tier-1a**: Automated accessibility audit tools (axe-core, Lighthouse, WAVE), legal compliance audits, browser-enforced behaviors (focus management, ARIA processing)
- **Tier-1b**: App store review rejection, OS API constraints (e.g., iOS system gestures cannot be overridden)
- **Tier-2**: Design system linting (Stylelint with token rules, ESLint component plugins), design tool plugins (Figma lint)
- **Tier-3**: Design review sessions, usability testing, heuristic evaluation checklists — no automated enforcement

### Source of Truth Priority Mapping

| Existing SoT Priority | Tier Mapping | Rationale |
|----------------------|-------------|-----------|
| Accessibility standards | **Tier-1a** | Legal obligation + browser/device enforcement |
| Platform guidelines | **Tier-1b** | OS/app store review + device API constraints |
| Internal pattern library | **Tier-2** | Design system = internal pattern library |

Tier-3 is a new layer not in the original SoT hierarchy — experiential rules with no binding enforcement, overridable by any higher tier without justification.

### Relationship Between Tier and Abstraction Layer (L)

The normative tier axis (`[Tier-1a]`..`[Tier-3]`) is defined here. The abstraction layer axis (`[L1]`/`[L2]`/`[L3]`) is defined in concepts.md. The two axes are independently defined but not all combinations are occupied:

- **Tier-1a × L3** and **Tier-1b × L3** are structurally empty: Tier-1 standards do not exist at the domain-specific/practical level
- **Tier-3 × L1** is structurally empty: Industry heuristics do not exist at the platform/standard level

| | L1 (Platform/Standard) | L2 (Pattern/Principle) | L3 (Domain/Practical) |
|---|---|---|---|
| **Tier-1a** | WCAG 2.2 spec, WAI-ARIA spec | WCAG interpretation patterns | (empty) |
| **Tier-1b** | Apple HIG spec, Material mandatory | Platform adaptation patterns | (empty) |
| **Tier-2** | Design token specification | Component composition patterns | Team-specific usage conventions |
| **Tier-3** | (empty) | Nielsen heuristics, Gestalt laws | Project-specific design decisions |

## Cross-Cutting Concerns

Cross-cutting concerns span multiple sub-areas. Defined here because their enforcement points are distributed across multiple files.

Admission criteria:
- A concern qualifies as cross-cutting only if it spans **3 or more** Key Sub-Areas
- No single sub-area can own the concern without hiding an essential enforcement point or causing duplicated rules elsewhere
- The concern requires inference path fragments in **2 or more** owner files
- The concern creates a reusable verification lens (CQ-worthy), not a one-off topic or example

Non-qualifier rule:
- If one sub-area still has a clear primary enforcement point, keep the concern in that sub-area and use cross-references rather than promoting it to cross-cutting

Scale guardrail:
- If the number of cross-cutting concerns exceeds **Key Sub-Areas / 3**, revisit the taxonomy before adding more. At that point the cross-cutting layer is starting to replace, rather than supplement, the sub-area structure

### Consistency

Identical concepts should have identical representations; deviations must be intentional and justified. Three sub-types:

1. **Internal consistency** (same pattern repeated within the product):
   - Enforcement: logic_rules.md §Constraint Conflict Checks + structure_spec.md §UI Design Required Elements
   - Detection: Pattern inventory comparison within the product

2. **External consistency** (conformance to platform and industry conventions):
   - Enforcement: domain_scope.md §Reference Standards/Frameworks + dependency_rules.md §Source of Truth Management
   - Detection: Comparison against platform guidelines and industry patterns

3. **Intentional deviation with rationale requirement**: Deviation must document why it provides a better outcome than conformance.
   - Enforcement: logic_rules.md §Constraint Conflict Checks
   - Detection: Deviation audit — any inconsistency without documented rationale is a defect

**Judgment rule**: An inconsistency is a defect unless it has a documented rationale. Burden of proof is on the deviator.

### Performance Perception

Spans Feedback and Status, Loading States, and Micro-interaction & Animation. Concerns how users perceive system responsiveness (distinct from actual performance).

- Perception thresholds (Nielsen 1993): 0-100ms = instantaneous, 100-1000ms = noticeable delay, >1000ms = perceived as a separate task, >10s = attention lost
- Implementation thresholds are adapted from these and owned by logic_rules.md §Feedback Logic (0-300ms = no indicator, 300ms-1s = spinner, 1-10s = skeleton/progress, 10s+ = background processing)

## Required Concept Categories

The "Risk if Missing" column describes the abstract consequence. The "Example of Failure" column provides a concrete, observable case.

| Category | Description | Risk if Missing | Example of Failure |
|----------|------------|----------------|-------------------|
| Navigation structure | Route system for users to reach destinations | Users get lost, increased abandonment | Settings page reachable only through 5-level nested menu; users contact support |
| Input and validation | Data collection and error prevention/guidance | Form completion rate decreases, incorrect data | Phone field accepts free text; 30% of numbers unparseable, breaking SMS verification |
| Feedback system | Communication of system status and action results | Users cannot know results, anxiety | After "Submit Order," no confirmation for 4s; users click again, creating duplicates |
| Error/empty state | Guidance and recovery for exceptional situations | User abandonment, dead ends | Search returns no results: blank page, no explanation, no suggestions |
| Call to action | Distinction/placement of primary and secondary actions | Decision paralysis | Checkout shows 3 equally-styled buttons; conversion drops 20% |
| Information density | Information amount/composition per screen | Cognitive overload or inefficiency | Dashboard shows 40+ ungrouped metrics; users cannot find their 3 relevant ones |
| Accessible interaction | Keyboard, screen reader, diverse input support | User exclusion, legal violations | Custom dropdown has no keyboard support; screen reader users cannot complete the form |
| Source of truth | Authoritative standard for pattern decisions | Pattern inconsistency proliferation | Three teams implement different date pickers with conflicting formats and behaviors |
| Responsive adaptation | Layout rules for different screen sizes/inputs | Broken layouts, unusable on mobile | Data table with horizontal scroll on mobile; no alternative view |
| Design system coherence | Token and component consistency across product | Visual drift, maintenance cost | After 2 years without governance, product uses 47 distinct shades of blue |
| State transition continuity | Communication of changes between states | Users lose context | List-to-detail navigation with no transition; detail appears with no connection to the tapped item |

## Reference Standards/Frameworks

This file is the **single source of truth for external standard version information** within the ui-design domain. Other files reference standards without version numbers; the version in this table governs.

| Standard/Framework | Version | Application Area | Core Content | When to Apply |
|-------------------|---------|-----------------|--------------|---------------|
| WCAG | 2.2 (2023) | Accessibility | Perceivable, operable, understandable, robust. 78 criteria across A/AA/AAA | Every UI review; legal for public-facing web |
| WAI-ARIA | 1.2 (2023) | Accessibility | Roles, states, properties for dynamic UI. 82 roles, 48 states/properties | Custom interactive components |
| ISO 9241 | 9241-110:2020 | Usability | Interaction principles: task suitability, self-descriptiveness, expectation conformity, learnability, controllability, error robustness, engagement | System-level usability evaluation |
| Nielsen's 10 Heuristics | 1994/2020 | Overall UI | System status visibility, consistency, error prevention, recognition over recall | Heuristic evaluation; design review |
| Fitts's Law | — | Layout | Target distance × size → click time. Primary actions: large and close | CTA placement, touch targets |
| Hick's Law | — | Decision | Decision time ∝ log(choices). Limit or categorize | Menu design, option presentation |
| Miller's Law | — | Information architecture | Working memory: 7±2 chunks | Navigation items, form sections |
| Jakob's Law | — | Consistency | Users expect cross-product consistency | Convention audit |
| Gestalt Principles | — | Visual grouping | Proximity, similarity, closure, continuity, figure-ground, common fate | Layout, grouping, hierarchy |
| Material Design | 3 (2023) | Android/Cross-platform | Components, interactions, motion, color, typography | Android (mandatory); others (reference) |
| Apple HIG | 2024 | iOS/macOS | Platform patterns, system gestures, SF Symbols, Dynamic Type | iOS/macOS (mandatory); cross-platform (reference) |
| Inclusive Design Principles | Microsoft (2016) | Inclusion | Recognize exclusion, learn from diversity, solve for one — extend to many | Inclusive review; persona development |

### External-Standard Derivation Markers

Rules and thresholds materially derived from external standards may carry grep-friendly source markers in their owner files. Use the following format:

- `<!-- derived-from: WCAG 2.2, SC 1.3.1 -->`
- `<!-- derived-from: WCAG 2.2, SC 2.2.1; also SC 2.2.6 -->`

Marker usage rule:
- Add a marker when the rule would likely need review if the external standard version changes
- Add a marker when the derived threshold or prohibition is not obvious from the surrounding prose
- Keep the marker in the **rule-owning file**. This file remains the version SSOT only; it does not own the downstream rule text

## Bias Detection Criteria

A triggered criterion indicates a review coverage problem, not necessarily a design defect.

### Coverage Distribution

- If ⌈N/2.5⌉ or more of the Key Sub-Areas (§Key Sub-Areas) are not represented → **insufficient coverage**. **N** = the number of `###` subsections under §Key Sub-Areas (count at review time — do not hard-code). At review time the reviewer counts the current `###` headings under §Key Sub-Areas and computes the threshold from N, so adding or removing a sub-area updates the threshold automatically without editing this rule
- If a specific sub-area accounts for >70% of total findings → **sub-area bias**

### State and Exception Coverage

- If only the happy path is defined and error/empty states are missing → **exception state gap**
- If only desktop UI is defined and mobile adaptation is missing → **responsive absence** (when mobile applicable)
- If input UI exists but validation patterns are missing → **validation system absence**
- If async operations exist but loading/failure states are missing → **status communication absence**
- If only visual patterns exist without keyboard/screen reader support → **accessibility gap**

### Governance and Ownership

- If 2+ core patterns have no designated source of truth → **authority undesignated**
- If 3+ CTAs of equal emphasis exist on a single screen → **action guidance competition**
- If the review ignores design system tokens/components → **design system blindness** (when a design system exists)
- If animation is present but no motion system or `prefers-reduced-motion` is evaluated → **animation excess without governance**
- If zero transition/animation exists and the review does not flag it → **animation absence unevaluated**

### Context Bias

- If the design assumes a single platform when the product serves multiple → **platform bias**
- If international users are served but text expansion, RTL, date/number formatting are unevaluated → **internationalization absence**

## Inter-Document Contract

### Rule Ownership

| Cross-cutting Topic | Owner File | Other Files |
|---|---|---|
| Dependency direction rules | dependency_rules.md | structure_spec.md (references only) |
| Source of Truth priority | dependency_rules.md | domain_scope.md (tier mapping), logic_rules.md (references) |
| Concept definitions | concepts.md | All other files reference, do not redefine |
| Structural coherence rules | structure_spec.md §UI Design Required Elements | Other files reference |
| Conciseness criteria | conciseness_rules.md | Other files reference |
| Competency questions | competency_qs.md | Other files provide inference path targets |
| Behavioral quantitative thresholds | logic_rules.md §Feedback Logic, §Fitts's Law Application | structure_spec.md (structural thresholds only) |
| Structural quantitative thresholds | structure_spec.md | logic_rules.md (behavioral only) |
| External-standard derivation markers | owner file of each derived rule | domain_scope.md (version SSOT only) |
| Constraint conflict resolution | logic_rules.md §Constraint Conflict Checks | dependency_rules.md (cascading failures) |
| Consistency (cross-cutting) | domain_scope.md §Cross-Cutting Concerns | logic_rules.md, structure_spec.md, dependency_rules.md |

### Required Substance per Sub-area

Each sub-area in Key Sub-Areas must have corresponding substance in at least one of:
- concepts.md: term definitions
- logic_rules.md or structure_spec.md or dependency_rules.md: operational rules
- competency_qs.md: verification questions

A sub-area with declaration but no substance in any file is a "ghost sub-area" — must be populated or annotated with applicability conditions.

### Cross-cutting Concern Attribution

When a concern spans multiple sub-areas, attribute to the sub-area with the **primary enforcement point**:

1. **Primary enforcement point**: The sub-area whose rules would be violated. Example: touch target sizing spans Responsive UI Adaptation and Accessible Interaction. Primary: Accessible Interaction (WCAG 2.5.5 violation is the enforcement driver)
2. **Secondary references**: Other sub-areas reference primary rules, do not duplicate
3. **Tie-breaking**: If enforcement is equally distributed, attribute to the sub-area with fewer existing items

### Classification Axis Relationships

| File | Axis | Facet |
|---|---|---|
| domain_scope.md | UI design concern | What design concerns exist (scope) |
| logic_rules.md | UI construction concern | What concerns are governed by behavioral rules |
| competency_qs.md | verification concern | What concerns must be verified |

### Sub-area to CQ Section Mapping

| Sub-area | CQ Sections | Coverage |
|---|---|---|
| Navigation | CQ-N | Full |
| Forms and Input | CQ-FI | Full |
| Feedback and Status | CQ-FS | Full |
| Data Display | CQ-DD | Full |
| Modals and Overlays | CQ-MO | Full |
| Action and Decision | CQ-AD | Full |
| Responsive UI Adaptation | CQ-R | Full |
| Accessible Interaction | CQ-AC | Full |
| Design System Architecture | CQ-DS | Full |
| Micro-interaction & Animation | CQ-MI | Full |

Cross-cutting CQ section:
- CQ-CO (Consistency) — spans all sub-areas; see §Cross-Cutting Concerns for inference path distribution

## Related Documents
- concepts.md — Term definitions, abstraction layer ([L1]/[L2]/[L3]) classification
- structure_spec.md — Structural requirements and quantitative structural thresholds
- logic_rules.md — Behavioral rules, temporal/spatial thresholds, constraint conflict checks
- dependency_rules.md — Dependency direction rules, Source of Truth management
- competency_qs.md — Verification questions organized by CQ-ID sections
- extension_cases.md — Growth and contraction scenarios with impact analysis
- conciseness_rules.md — Conciseness criteria for review output
- concepts.md §Abstraction Layer Reference — [L1]/[L2]/[L3] definitions and Tier×L relationship
