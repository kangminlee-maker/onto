---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Concept Dictionary and Interpretation Rules

Classification axis: **UI design concern** — classified by the design concern each term addresses. Each term is tagged with its abstraction layer: [L1] Platform/Standard, [L2] Pattern/Principle, [L3] Domain/Practice.

## Abstraction Layer Reference

- **[L1] Platform/Standard**: Elements provided by browser/OS/device and defined in standard specifications (W3C, WCAG, WAI-ARIA). Exist as built-in capabilities regardless of design methodology.
- **[L2] Pattern/Principle**: Design principles and recurring solutions applied by convention. No technical enforcement — adherence depends on design review and team discipline.
- **[L3] Domain/Practice**: Terms belonging to specific UI design sub-disciplines (design systems, performance, micro-interactions).

**[L1]/[L2] boundary**: Browser/OS/device enforces or W3C/ISO defines → [L1]. Applied by convention without enforcement → [L2]. When a spec defines capability (L1) but effective use requires a pattern, both layers noted.

**SE layer difference**: SE [L1] = Language/Runtime primitives. UI [L1] = Platform/Standard capabilities. L2 and L3 share meaning across both domains.

**Tier × L relationship**: Normative tiers (domain_scope.md [Tier-1a/1b/2/3]) and abstraction layers ([L1/L2/L3]) are independently defined. Not all combinations are valid — Tier-1a/1b map primarily to L1; Tier-3 (heuristics) does not produce L1 terms. Two axes: normative authority vs. abstraction level.

## Usability Principle Core Terms

- [L2] Usability = effectiveness, efficiency, and satisfaction with which users achieve goals. ISO 9241-11 (1998, rev. 2018). Three components measured independently. See logic_rules.md §Constraint Conflict Checks
- [L2] Affordance = a property suggesting possible actions. Gibson (1977); applied to UI by Norman (1988). Norman distinguished affordance (actual possibility) from signifier (its indication)
- [L2] Signifier = explicit cue communicating affordance. Norman (2013). Underlined blue text signifies "clickable." Without signifiers, users cannot discover actions. See logic_rules.md §Action Guidance Logic
- [L2] Mental Model = user's internal understanding of how a system works. Three models: designer's model, system image, user's model (Norman). Mismatches are the root cause of usability problems
- [L2] Cognitive Load = information processing demand on working memory. Sweller (1988). Three types: intrinsic (task complexity — irreducible), extraneous (poor design — primary optimization target), germane (learning — beneficial). See logic_rules.md §Information Density vs Cognitive Load
- [L2] Progressive Disclosure = revealing information gradually by user need. Carroll & Rosson (1984). Manages cognitive load but can harm discoverability if over-applied
- [L2] Discoverability = degree to which users can find features on their own. Norman (2013, "The Design of Everyday Things" revised edition) identifies discoverability as a fundamental property of good design. In tension with progressive disclosure. See structure_spec.md §Navigation Structure
- [L2] Hick's Law = decision time increases logarithmically with choices. Hick & Hyman (1952). Does not apply when users already know their target. See logic_rules.md §Navigation Logic
- [L2] Miller's Law = working memory holds ~7 ± 2 items. Miller (1956). Applies when users hold items simultaneously — scanned navigation items are not subject. See structure_spec.md §Navigation Structure
- [L2] Jakob's Law = users expect your site to work like others they know. Nielsen. Foundation for convention consistency. Deviation requires clear user benefit. See domain_scope.md §Cross-Cutting Concerns
- [L2] Fitts's Law = time to reach a target is f(distance, size). Fitts (1954). Frequent actions → large and close; destructive → far from primary. Touch minimum: 44×44 CSS px (WCAG 2.5.5). See logic_rules.md §Fitts's Law Application

## Navigation Core Terms

- [L2] Information Architecture (IA) = design of content organization, classification, labeling, and navigation. Wurman coined the term (1976); Morville & Rosenfeld formalized the four-system model (organization, labeling, navigation, search) in "Information Architecture for the World Wide Web" (1998, 2nd ed. 2002, 3rd ed. 2006). See structure_spec.md §Navigation Structure
- [L1] Global Navigation = top-level navigation accessible throughout the app (top bar, sidebar, bottom tab). Browser back/forward is platform [L1]; app-level global nav is [L2] coexisting with it. See structure_spec.md §Navigation Structure
- [L2] Local Navigation = sub-navigation within a section (tabs, segment controls, submenus). Must maintain clear relationship to global navigation
- [L1] Breadcrumb = secondary navigation showing hierarchical path. WAI-ARIA Authoring Practices pattern (`nav` + `aria-label="Breadcrumb"`). Effective for 3+ depth levels
- [L2] Wayfinding = recognizing location, finding destination, determining path. Kevin Lynch (1960). Users answer: "Where am I?", "Where can I go?", "How do I get there?"
- [L1] Deep Linking = URL/path for direct access to a specific screen or state. Platform capability (browser/OS routing). Essential for shareability and SEO. See dependency_rules.md §Navigation–URL References
- [L2] Navigation Pattern Types = hierarchical, hub-and-spoke, sequential, matrix. Selection depends on content structure and task complexity. See logic_rules.md §Navigation Logic

## Forms and Input Core Terms

- [L1] Inline Validation = checking validity on input or blur. HTML5 Constraint Validation API (required, pattern, min/max). Wroblewski (2009): reduced errors 22%, increased completion 42%. See logic_rules.md §Inline Validation Timing
- [L2] Error Message = guidance when validation fails. Three elements: (1) what went wrong, (2) why, (3) how to fix. Must not blame user. Placement: adjacent to field. See logic_rules.md §Error Message Quality
- [L1] Placeholder = hint text via HTML `placeholder`. Disappears on input → cannot replace a label (WCAG 1.3.1, 3.3.2). Low contrast also fails WCAG 1.4.3
- [L2] Input Mask = auto-applied format (phone, date). Prevents format errors but can frustrate with unexpected formats. Must accept unformatted paste
- [L2] Default Value = pre-filled value. Most common choice improves efficiency. Status quo bias: defaults in consent/privacy require careful consideration
- [L2] Multi-step Form = long form in logical steps. Requires: step indicator, prev/next, state preservation, summary before submission. See structure_spec.md §Form Structure Requirements
- [L2] Autocomplete = suggestions as user types. Autosuggest (predefined list) vs. autocompletion (partial text). Requires debouncing, keyboard nav, graceful degradation
- [L1] Form Accessibility = label association (`<label for>`), fieldset/legend, error linking (`aria-describedby`), keyboard operability, visible focus. WCAG 1.3.1, 2.1.1, 3.3.1, 3.3.2, 4.1.2. See domain_scope.md §Normative System Classification

## Feedback and Status Core Terms

- [L2] Toast = non-blocking temporary notification. Origin: Android SDK. Requirements: auto-dismiss (3-5s), manual close, `aria-live="polite"`. Not for critical errors. See logic_rules.md §Feedback Logic
- [L2] Notification = message classified by urgency × persistence. Four quadrants: urgent+persistent (system alert), urgent+transient (incoming call), informational+persistent (badge), informational+transient (toast). Notification fatigue: excess causes all to be ignored
- [L2] Skeleton Screen = layout outline preview during loading. Facebook (2014). Reduces perceived load vs. spinners. Effective only when closely matching final layout. See §Performance Perception Terms
- [L2] Optimistic Update = UI updates before server response, rollback on failure. Best for >99% success rate. Example: "like" fills instantly, reverts on API failure. See logic_rules.md §Feedback Logic
- [L2] Empty State = screen with no content. Three types: first use (onboarding), no data (explain and guide), no results (suggest alternatives). See structure_spec.md §Screen State Matrix
- [L2] Dead End = state with no next action. Every screen must offer at least one forward or backward path
- [L2] Loading State Tiers = perception thresholds by duration: 0-100ms (instantaneous), 100ms-1s (noticeable delay), >1s (requires progress indication). Nielsen (1993). Implementation thresholds differ — logic_rules.md §Feedback Logic adapts these to 0-300ms/300ms-1s/1-10s/10s+ with a 300ms delay before showing any indicator

## Action Guidance Core Terms

- [L2] CTA (Call to Action) = element guiding user to act. One primary CTA per screen. Action-specific text: "Create Account" > "Submit." See logic_rules.md §Action Guidance Logic
- [L2] Primary Action = screen's core purpose action. Most visually prominent. One per viewport (Hick's Law)
- [L2] Secondary Action = alternative to primary. Less prominent, must not compete. See structure_spec.md §Action Guidance System
- [L2] Destructive Action = hard-to-undo action (deletion, cancellation). Requires confirmation, red differentiation, distance from primary. See logic_rules.md §Destructive Action Confirmation Labels
- [L2] Confirmation = re-verification before destructive action. Must name specific item. Overuse causes fatigue. Prefer undo when possible
- [L2] Undo = reverse action after execution. Better than confirmation (Raskin): act → observe → reverse. Window: 5-10s via timed toast

## Modal and Overlay Core Terms

- [L2] Modal Dialog = overlay preventing background interaction. Blocks flow — overuse causes frustration. Valid: irreversible confirmations, critical messages, focused sub-tasks. See logic_rules.md §Modal Usage Criteria
- [L1] Focus Trap = keyboard focus cycles within modal only (WCAG 2.4.3). Focus to modal on open, to trigger on close. `<dialog>` + `showModal()` provides natively
- [L2] Popover = floating UI near trigger. No background blocking. Dismisses on outside click/Escape. HTML Popover API (`popover`) transitioning partially to [L1]
- [L2] Bottom Sheet = panel from bottom. Mobile modal alternative. Three states: peek, half, full. Material Design origin. Requires drag handle + alt close
- [L2] Drawer = side panel. Left for navigation, right for details. Persistent or temporary. See structure_spec.md §Responsive Component Transition Rules
- [L2] Lightbox = full-screen overlay for media. Requires keyboard nav, Escape, swipe, alt text

## Data Display Core Terms

- [L2] Pagination = data in fixed-size pages. Predictable performance, footer access, sharable URLs. Best for structured data. See logic_rules.md §Pagination vs Infinite Scroll
- [L2] Infinite Scroll = auto-loading on scroll. For browsing (feeds, galleries). Drawbacks: unreachable footer, lost position, unpredictable weight
- [L2] Virtual Scrolling = renders only visible items, recycles DOM. Required when items >~500. Trade-offs: variable-height complexity, find-in-page limits
- [L2] Sorting = rearranging by criterion. Current sort/direction must be indicated. Multi-column shows priority. State in URL. See structure_spec.md §Data Display System
- [L2] Filtering = data matching conditions. Required: active count, reset, result count, visible values. State in URL. See structure_spec.md §Data Display System
- [L2] Card Pattern = grouped info in visual containers. Self-contained, grid-flexible. Material Design: "surface for single topic." See structure_spec.md §Data Display System
- [L2] Data Table = rows/columns for tabular data. Not for layout. Requires sortable headers, row hover, responsive adaptation. Accessibility: `<table>`, `<th scope>`. See structure_spec.md §Data Display System

## Accessible Interaction Core Terms

- [L1] Tab Order = focus order via Tab key. DOM order and `tabindex`. DOM/visual order must match (WCAG 1.3.2, 2.4.3). `tabindex="0"` natural; `tabindex="-1"` programmatic; >0 anti-pattern. See logic_rules.md §Accessible Interaction Logic
- [L1] ARIA = WAI-ARIA (W3C 1.2). Roles (`role="dialog"`), properties (`aria-label`), states (`aria-expanded`). First rule: use native HTML when possible — ARIA misuse worsens accessibility. See domain_scope.md §Normative System Classification
- [L1] Live Region = ARIA region for dynamic content announcements. `polite` (queued), `assertive` (immediate, urgent only). Overuse overwhelms screen reader users
- [L1] Skip Link = hidden-until-focused link bypassing navigation. WCAG 2.4.1. First focusable in DOM, visible on focus
- [L1] Screen Reader = AT reading content aloud. VoiceOver, NVDA/JAWS, TalkBack. Reads accessibility tree, not visual rendering. See dependency_rules.md §Accessibility–Interaction Dependency
- [L1] Accessibility Tree = browser's parallel DOM for AT. Each element → node with role, name, state, value. Missing = nonexistent for AT. Inspectable via DevTools
- [L1] Color Contrast = luminance ratio. WCAG 1.4.3: 4.5:1 normal text, 3:1 large; 1.4.11: 3:1 UI components. Color alone must not convey info (1.4.1)
- [L1] Keyboard Accessibility = all functionality via keyboard (WCAG 2.1.1). No traps (2.1.2). Visible focus (2.4.7). Custom components implement expected patterns

## Design System Terms

Design systems scale consistent design across products. Emerged when teams outgrew informal convention (Salesforce, Google, Airbnb, 2013-2016).

- [L3] Design Token = atomic named value storing a design decision. Jina Anne (Salesforce Lightning, 2014). Encodes color, spacing, typography as platform-agnostic pairs. One update propagates everywhere. See dependency_rules.md §Component–Design System References
- [L3] Semantic Token = token named by purpose, not value. `color-text-error` vs. `color-red-500`. Hierarchy: primitive → semantic → component-specific. Enables theme switching. See dependency_rules.md §Component–Design System References
- [L3] Component API = props, slots, events a component exposes. Balances flexibility with consistency. Surface grows conservatively — adding easy, removing breaking
- [L3] Design System Governance = decision process for additions/modifications/deprecations. Contribution model, review, versioning, adoption tracking. Without it, systems diverge or stagnate
- [L3] Design Pattern (design systems) = documented solution with context, problem, solution, rationale. Composes multiple components. See extension_cases.md §Design System Pattern Addition
- [L3] Component Library = implemented components with APIs, guidelines, examples. Subset of design system. Tools: Storybook, Figma libraries
- [L3] Design System Maturity = L1 style guide → L2 pattern library → L3 full system (tokens, governance) → L4 infrastructure (tooling, metrics). Most plateau at L2

## Performance Perception Terms

Perceived speed vs. objective speed. Connects to §Feedback and Status Core Terms and logic_rules.md §Feedback Logic.

- [L2] Perceived Performance = subjective speed experience. Skeleton at 200ms feels faster than spinner at 200ms. Techniques: skeletons, progressive loading, optimistic updates. See logic_rules.md §Feedback Logic
- [L3] RAIL Model = Google's performance model (2015). Response <100ms, Animation <16ms/frame, Idle <50ms chunks, Load <5s (3G). See logic_rules.md §Feedback Logic
- [L3] First Contentful Paint (FCP) = time to first rendered content. Core Web Vital. <1.8s good, >3.0s poor. Does not measure useful content (see LCP)
- [L3] Largest Contentful Paint (LCP) = time until largest viewport element renders. Core Web Vital. <2.5s good, >4.0s poor
- [L3] Skeleton Screen Psychology = why skeletons reduce perceived wait. Progress perception (visual change signals progress) + expectation setting (shapes set layout expectations). Chung (2017): ~15% reduction vs. spinners
- [L2] Optimistic UI = design philosophy assuming success. Broader than Optimistic Update (§Feedback and Status): all interactions feel instant, rare failures handled gracefully

## Micro-interaction Terms

Dan Saffer's framework ("Microinteractions," 2013). Contained moments for a single task: trigger → rules → feedback → loops & modes.

- [L2] Trigger = event initiating micro-interaction. User-initiated (tap, click, gesture) or system-initiated (time, data). Must be discoverable. See logic_rules.md §Simplicity vs Discoverability
- [L2] Rules = logic after trigger. Sequence, branching, constraints. Must feel natural. Example: long-press → selection mode → haptic → multi-select
- [L2] Feedback = sensory response (visual, auditory, haptic, spatial). Immediate (<100ms), proportional, context-appropriate. See logic_rules.md §Feedback Logic
- [L2] Loops and Modes = change over time (loops: repeat/evolve) and alternative behaviors (modes: edit vs. view). Minimize modes — each doubles cognitive load
- [L2] Animation Principles for UI = Disney's 12 applied to UI. Easing (ease-out enter, ease-in exit), anticipation, follow-through. Duration: 100-200ms simple, 200-500ms complex, never >500ms. See logic_rules.md §Feedback Logic
- [L2] State Transitions = changes between states (default, hover, focus, active, disabled, loading, error, success). Each visible, consistent, distinguishable

## Responsive and Adaptive Design Terms

- [L2] Responsive Design = fluid viewport adaptation via flexible grids and media queries. Ethan Marcotte (2010). Same HTML, different CSS. See structure_spec.md §Responsive Component Transition Rules
- [L1] Media Query = CSS conditional styles by viewport/device. W3C spec. The [L1] mechanism for responsive design [L2]. `prefers-reduced-motion` is both platform and WCAG 2.3.3
- [L2] Breakpoint = viewport width where layout changes. Common: 320/768/1024/1440px. Determined by content, not devices. See structure_spec.md §Responsive Component Transition Rules
- [L2] Mobile-first = design smallest viewport first, enhance upward. Forces content prioritization
- [L2] Touch Target = tappable area minimum. 44×44 CSS px (WCAG 2.5.5), 48×48 dp (Material), 44pt (HIG). ≥8px spacing. See logic_rules.md §Fitts's Law Application
- [L2] Content Priority = importance per viewport. Small viewports require explicit visibility/interaction/removal decisions. See structure_spec.md §Responsive–Content Coherence

## Homonyms Requiring Attention

- "state": component state (hover/active/disabled) != app state (data) != server state (HTTP) != design system state (variant). Default: component visual/interaction state
- "modal": modal dialog (§Modal and Overlay) != modal interaction (blocked-task mode) != modal window (OS)
- "navigation": IA navigation (§Navigation) != routing (SE) != browser navigation (platform). Default: IA navigation
- "form": UI form (§Forms) != HTML `<form>` != form state management (SE). Default: UI form design patterns
- "layout": page layout (visual-design) != IA (this domain). Default: content placement intent
- "responsive": responsive layout (visual-design, grid) != responsive UI adaptation (this domain, component/content priority). See domain_scope.md §Key Sub-Areas
- "feedback": system feedback (§Feedback) != user feedback (research) != haptic (platform) != micro-interaction feedback (§Micro-interaction)
- "pattern": UI pattern != software design pattern (SE) != visual pattern (visual-design) != design system pattern (§Design System)
- "token": design token (§Design System) != auth/CSRF/session token (SE). Default: design token
- "component": UI component != software component (SE) != design system component (§Design System, with API). Default: UI component
- "accessibility": digital (§Accessible Interaction) != physical (ADA) != access control (SE). Default: digital accessibility
- "animation": functional (this domain) != decorative (visual-design) != CSS animation ([L1]). Default: functional
- "validation": form (§Forms) != design validation (testing) != accessibility validation (WCAG). Qualify on first use

## Interpretation Principles

- Users achieve goals, not learn interfaces. The UI is means, not end. (Goal-directed design, Alan Cooper)
- Match interface to user's mental model. Exposing technical structure (DB schema, HTTP codes) conflicts with user models
- Errors are interface failures, not user faults. "Invalid input" → "This field only accepts numbers." Norman's error classification: slips (unintended actions — prevent with constraints) vs. mistakes (wrong goals — make correct action obvious). See logic_rules.md §Error Message Quality
- Consistency reduces learning costs. Four levels (priority order): within-screen, across-app, across-products (design system), platform conventions. Deviation requires stated benefit. See domain_scope.md §Cross-Cutting Concerns
- The "3-click rule" is not absolute. Information scent (cue strength indicating path-to-target) matters more than click count. Porter (2003): no correlation between clicks and success; strong correlation between navigation clarity and success
- Modals block flow. Prefer non-modal alternatives when possible. See logic_rules.md §Modal Usage Criteria
- Placeholders cannot replace labels. Disappear on input → field purpose lost. Both usability principle and WCAG requirement
- Design for extremes (max data, empty data, errors, slow networks, AT users) and the middle takes care of itself. See structure_spec.md §Screen State Matrix
- Aesthetic-Usability Effect: users perceive attractive interfaces as more usable. Visual quality measurably impacts perceived usability — and can mask real problems in testing
- Paradox of the active user (Carroll): users prefer trying over reading. Interfaces must be safe to explore — undo, non-destructive defaults, clear error recovery

## Related Documents
- domain_scope.md §Key Sub-Areas — Domain boundaries for these terms
- domain_scope.md §Normative System Classification — Tier-1a requirements referenced by [L1] terms
- domain_scope.md §Cross-Cutting Concerns — Consistency evaluation rules
- logic_rules.md §Feedback Logic — Timing thresholds for feedback and loading
- logic_rules.md §Inline Validation Timing — Validation timing and error patterns
- logic_rules.md §Action Guidance Logic — CTA hierarchy and destructive action rules
- logic_rules.md §Accessible Interaction Logic — Focus, tab order, keyboard rules
- structure_spec.md §Navigation Structure — Element count and depth guidelines
- structure_spec.md §Responsive Component Transition Rules — Breakpoints and component transitions
- structure_spec.md §Screen State Matrix — Boundary state requirements
- dependency_rules.md §Component–Design System References — Token dependency chains
- dependency_rules.md §Accessibility–Interaction Dependency — Screen reader patterns
- competency_qs.md — Competency questions referencing terms here
- conciseness_rules.md — Deduplication rules for review output
