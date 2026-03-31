---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.
The onto_pragmatics agent verifies the actual reasoning path for each question.

Classification axis: **UI design concern** — classified by the design concern that questions must address when reviewing a user interface. This axis aligns with domain_scope.md Key Sub-Areas + Cross-Cutting Concerns.

Question priority principles: **Usability fundamentals (navigation structure, feedback system, accessibility) are the highest priority.** Consistency, design system governance, and micro-interaction refinement are secondary concerns applied on top of the usability foundation.

Priority levels:
- **P1** — Must be answerable in any UI design review. Failure indicates a fundamental usability defect.
- **P2** — Should be answerable for production systems. Failure indicates a quality gap.
- **P3** — Recommended for mature systems. Failure indicates a refinement opportunity.

## CQ ID System

### Prefix Allocation

| Prefix | Concern Area | Aligned Sub-Area (domain_scope.md) |
|--------|-------------|-------------------------------------|
| CQ-N | Navigation and Information Architecture | Navigation |
| CQ-FI | Forms and Input | Forms and Input |
| CQ-FS | Feedback and Status | Feedback and Status |
| CQ-AD | Action and Decision | Action and Decision |
| CQ-MO | Modal and Overlay | Modals and Overlays |
| CQ-DD | Data Display | Data Display |
| CQ-R | Responsive UI Adaptation | Responsive UI Adaptation |
| CQ-AC | Accessibility | Accessible Interaction |
| CQ-CO | Consistency (cross-cutting) | Cross-Cutting Concerns: Consistency |
| CQ-DS | Design System | Design System Architecture |
| CQ-MI | Micro-interaction and Animation | Micro-interaction & Animation |

Prefix allocation protocol: New CQ sections use 1-2 character alphabetic prefix codes with mandatory `-` separator (e.g., CQ-XX-01). Prefixes must not be string prefixes of existing prefixes. Current allocations: N, FI, FS, AD, MO, DD, R, AC, CO, DS, MI.

### ME Rationale

Each prefix covers a mutually exclusive concern area. CQ-N = how users find content. CQ-FI = how users provide data. CQ-FS = how the system reports results. CQ-AD = how users choose and execute actions. CQ-MO = how overlays behave. CQ-DD = how data collections are presented. CQ-R = how the interface adapts to viewports. CQ-AC = how the interface serves diverse abilities. CQ-CO = whether patterns are applied uniformly (cross-cutting). CQ-DS = how components and tokens are governed. CQ-MI = how transitions and animations behave.

When a concern touches multiple areas (e.g., touch target size: CQ-R and CQ-AC), attribution follows the **primary enforcement point** (domain_scope.md 'Cross-cutting Concern Attribution'). Touch targets → CQ-AC (WCAG 2.5.5 is the enforcement driver).

### CE Argument

The 11 prefixes cover all 10 sub-areas in domain_scope.md 'Key Sub-Areas' plus the cross-cutting concern Consistency. Performance Perception (the second cross-cutting concern) is addressed within CQ-FS and CQ-MI rather than a separate prefix, as its enforcement points reside there.

**Open-world note**: New sub-areas (e.g., Internationalization, Voice UI) require new CQ prefixes.

---

## 1. Navigation and Information Architecture (CQ-N)

Verifies that navigation enables users to find content, recognize location, and move efficiently.

- **CQ-N-01** [P1] Does the IA match the user's mental model rather than the system's internal structure?
  - Inference path: concepts.md 'Navigation Core Terms' → IA must match user expectations → dependency_rules.md 'IA → Navigation Patterns' → system-structure navigation conflicts with mental model
  - Verification criteria: PASS if navigation labels/hierarchy reflect user tasks. FAIL if navigation mirrors system architecture

- **CQ-N-02** [P1] Is global navigation consistent across all screens with current location indicated?
  - Inference path: logic_rules.md 'Global Navigation Consistency' → consistent across all screens → logic_rules.md 'Wayfinding Completeness' → "Where am I?" answerable
  - Verification criteria: PASS if global nav present on all screens (or documented immersive exceptions) with active state indicator. FAIL if nav disappears without exit mechanism

- **CQ-N-03** [P1] Is the path to target content clear with sufficient information scent at each level?
  - Inference path: logic_rules.md 'Hierarchy Depth and Information Scent' → deeper = stronger scent needed → concepts.md 'Navigation Core Terms' → Wayfinding
  - Verification criteria: PASS if each intermediate level provides preview/summary of next level. FAIL if category pages show only names without descriptions

- **CQ-N-04** [P1] Can users answer "Where am I?", "Where can I go?", "How do I go back?" on every screen?
  - Inference path: logic_rules.md 'Wayfinding Completeness' → 3 elements: active indicator, next-destination links, back affordance → structure_spec.md 'Navigation Structure'
  - Verification criteria: PASS if all 3 elements present on every screen. FAIL if any screen is missing any element

- **CQ-N-05** [P2] In hierarchies of 3+ levels, are breadcrumbs or equivalent provided?
  - Inference path: dependency_rules.md 'Navigation Depth → Wayfinding Aids' → 3 levels = breadcrumbs mandatory → structure_spec.md 'Navigation Structure Patterns'
  - Verification criteria: PASS if 3+ level hierarchies have breadcrumbs with clickable ancestors. FAIL if deep hierarchies lack secondary nav

- **CQ-N-06** [P2] Do navigation labels use user language, avoiding ambiguous or system-internal terminology?
  - Inference path: logic_rules.md 'Label Clarity' → user language required; ambiguity test: two users interpret differently = fail
  - Verification criteria: PASS if labels use concrete nouns describing content. FAIL if internal terminology or ambiguous labels exist

- **CQ-N-07** [P2] For content requiring search, are search UI, autocomplete, and no-results state designed?
  - Inference path: domain_scope.md 'Navigation' → Search (when applicable) → dependency_rules.md 'IA → Search' → results derive from IA categories
  - Verification criteria: PASS if search has input, IA-categorized results, and no-results guidance. FAIL if search lacks no-results state

- **CQ-N-08** [P2] On mobile, is core navigation in always-visible positions (bottom nav), not only in hamburger menu?
  - Inference path: logic_rules.md 'Mobile Navigation Discoverability' → hamburger = low discoverability; 3-5 core items in bottom nav
  - Verification criteria: PASS if 3-5 core items in bottom nav with icon+label. FAIL if all navigation behind hamburger menu

- **CQ-N-09** [P2] Is browser back / in-app back behavior consistent in SPAs?
  - Inference path: logic_rules.md 'Back Button Consistency' → SPA must manage browser history → modal opens should be closeable by back
  - Verification criteria: PASS if browser back navigates to expected previous view. FAIL if back skips modal contexts or produces unexpected navigation

---

## 2. Forms and Input (CQ-FI)

Verifies form design supports efficient, error-free data entry with validation and guidance.

- **CQ-FI-01** [P1] Are fields in logical order with related fields grouped?
  - Inference path: structure_spec.md 'Form Structure Principles' → Field Ordering → easy-to-complex, group related → logic_rules.md 'Multi-Step Form Coherence' → single conceptual theme per group
  - Verification criteria: PASS if logical order, related fields grouped, no unrelated mixing. FAIL if arbitrary order or mixed topics in groups

- **CQ-FI-02** [P1] Are required/optional fields clearly distinguished using the minority-marking convention?
  - Inference path: logic_rules.md 'Required/Optional Field Indication' → mark the minority; ~50/50 ratio → mark required (higher consequence)
  - Verification criteria: PASS if minority type marked consistently. FAIL if both marked (noise) or neither marked

- **CQ-FI-03** [P1] Is validation timing defined per field, with error messages containing what/why/how-to-fix?
  - Inference path: logic_rules.md 'Inline Validation Timing' → on blur / on input debounced / on submit per type → logic_rules.md 'Error Message Quality' → [what] + [how to fix] + [example]
  - Verification criteria: PASS if each field has timing and 3-part error messages. FAIL if generic errors ("Invalid input") or undefined timing

- **CQ-FI-04** [P1] Are input aids provided without placeholders substituting for labels?
  - Inference path: concepts.md 'Forms and Input Core Terms' → Placeholder → disappears on input, cannot replace label (WCAG 1.3.1, 3.3.2) → structure_spec.md 'Input System'
  - Verification criteria: PASS if every field has visible label; placeholders show examples only. FAIL if any field uses placeholder as sole label

- **CQ-FI-05** [P2] Is the form single-column with field widths reflecting expected input length?
  - Inference path: structure_spec.md 'Form Structure Principles' → Layout → single-column principle; Field Width → reflect expected length
  - Verification criteria: PASS if single-column (exceptions for pairs), field widths proportionate. FAIL if two-column without justification

- **CQ-FI-06** [P2] Are long forms divided into logical steps with progress, data preservation, and prev/next?
  - Inference path: logic_rules.md 'Multi-Step Form Coherence' → logically complete steps → structure_spec.md 'Form Structure Principles' → Multi-Step Forms → dependency_rules.md 'Multi-Step Form Dependencies'
  - Verification criteria: PASS if progress indicator, data preserved on back-nav, single theme per step. FAIL if mixed topics, data lost, or no progress

- **CQ-FI-07** [P2] Is browser autofill supported with correct `autocomplete` attributes?
  - Inference path: logic_rules.md 'Autofill Compatibility' → required values: name, email, tel, street-address, postal-code, cc-number
  - Verification criteria: PASS if standard fields have correct autocomplete values. FAIL if autocomplete="off" on login/payment forms

- **CQ-FI-08** [P2] Does the submit button use a specific action label and follow the gaze path?
  - Inference path: structure_spec.md 'Form Structure Principles' → Submit Button → "Create Account" not "Submit"; left-aligned with fields
  - Verification criteria: PASS if label names outcome, button left-aligned. FAIL if generic "Submit" or misaligned position

- **CQ-FI-09** [P2] Is cross-field validation defined for dependent fields?
  - Inference path: dependency_rules.md 'Input Field → Validation Rules' → cross-field dependencies explicit → dependency_rules.md 'Validation → Error Display' → error references both fields
  - Verification criteria: PASS if dependencies defined with revalidation. FAIL if dependent fields validated independently

---

## 3. Feedback and Status (CQ-FS)

Verifies the system communicates status, results, and guidance for all states.

- **CQ-FS-01** [P1] Is system feedback defined for every major user action (immediate/process/outcome)?
  - Inference path: dependency_rules.md 'User Action → System Feedback' → every action needs feedback → structure_spec.md 'Required Relationships' → Action–Feedback Completeness
  - Verification criteria: PASS if every interactive element has immediate + process + outcome feedback defined. FAIL if any element has no feedback

- **CQ-FS-02** [P1] Is feedback persistence proportional to urgency (success=transient, error=persistent)?
  - Inference path: logic_rules.md 'Feedback Duration by Urgency' → success 3-5s auto-dismiss, error persistent → dependency_rules.md 'Feedback Type → Persistence'
  - Verification criteria: PASS if success auto-dismisses, errors persist until resolved. FAIL if errors are transient toasts

- **CQ-FS-03** [P1] Is loading state representation matched to expected duration (<300ms=none, 300ms-1s=spinner, 1-10s=skeleton, 10s+=background)?
  - Inference path: logic_rules.md 'Loading State Representation' → duration-based selection; 300ms delay before showing indicator
  - Verification criteria: PASS if indicators match duration with 300ms delay. FAIL if spinner flash on fast ops or no indicator on long ops

- **CQ-FS-04** [P1] Do empty states (first-use/no-data/no-results) each provide different guidance with CTAs?
  - Inference path: logic_rules.md 'Empty State Guidance' → 3 types, different guidance each → structure_spec.md 'Screen State Matrix'
  - Verification criteria: PASS if first-use shows specific CTA, no-data shows criteria guidance, error-caused shows retry. FAIL if generic message for all

- **CQ-FS-05** [P1] Do error states include recovery paths (no dead ends)?
  - Inference path: structure_spec.md 'Required Relationships' → Error Recovery Completeness → structure_spec.md 'Screen State Matrix' → error cause + recovery action
  - Verification criteria: PASS if every error has explanation + actionable recovery. FAIL if any error is a dead end

- **CQ-FS-06** [P2] Do skeleton screens match the final layout?
  - Inference path: logic_rules.md 'Skeleton Screen Fidelity' → must reflect final layout; overlay test
  - Verification criteria: PASS if skeleton positions/sizes match loaded state. FAIL if significant layout shift on load

- **CQ-FS-07** [P2] Are async failure states designed with retry, and are timeouts distinct from failures?
  - Inference path: dependency_rules.md 'Asynchronous Action Chain' → loading/success/failure + timeout as 4th state
  - Verification criteria: PASS if async failures have retry, timeouts distinguished. FAIL if spinner runs indefinitely on timeout

- **CQ-FS-08** [P2] Is notification fatigue managed (channel separation, max 3 simultaneous toasts)?
  - Inference path: logic_rules.md 'Notification Fatigue Management' → 3+ simultaneous = system problem; priority channels separated
  - Verification criteria: PASS if urgent/informational visually distinct, max 3 simultaneous. FAIL if all use same style or 3+ stack

- **CQ-FS-09** [P2] Are optimistic updates limited to low-failure actions with defined rollback UX?
  - Inference path: logic_rules.md 'Optimistic Update Boundaries' → dependency_rules.md 'Optimistic Update → Rollback UX' → visible rollback required
  - Verification criteria: PASS if used only for rare-failure actions with rollback animation + message. FAIL if applied to payment or silent rollback

- **CQ-FS-10** [P3] Are all applicable screen states from the Screen State Matrix evaluated per screen?
  - Inference path: structure_spec.md 'Screen State Matrix' → 8 states per screen → structure_spec.md 'Classification Criteria Design' → applicability by data dependency
  - Verification criteria: PASS if each screen evaluated against applicable states. FAIL if only happy path designed

---

## 4. Action and Decision (CQ-AD)

Verifies primary actions are identifiable, destructive actions protected, and users guided without decision paralysis.

- **CQ-AD-01** [P1] Is one primary action per screen clearly identified and visually distinguished?
  - Inference path: logic_rules.md 'Primary Action Singularity' → 1 primary per screen; filled/outlined/text hierarchy → structure_spec.md 'Action Guidance System'
  - Verification criteria: PASS if exactly one primary (filled), secondary (outlined), tertiary (text). FAIL if 2+ equally emphasized or none clearly primary

- **CQ-AD-02** [P1] Are destructive actions protected by severity-appropriate confirmation or undo?
  - Inference path: logic_rules.md 'Destructive Action Confirmation Labels' → verb-specific labels → dependency_rules.md 'Destructive Action Protection Chain' → low=undo, medium=confirmation, high=type-to-confirm
  - Verification criteria: PASS if protection matches severity, confirmation uses action verb. FAIL if generic "OK" or no protection

- **CQ-AD-03** [P1] Is the user's next action clear on every screen (no dead ends)?
  - Inference path: concepts.md 'Feedback and Status Core Terms' → Dead End → at least one forward/backward path → structure_spec.md 'Required Relationships' → Error Recovery Completeness
  - Verification criteria: PASS if every screen (including errors/empty states) has actionable path. FAIL if any dead-end screen

- **CQ-AD-04** [P2] Is the number of simultaneous choices managed (Hick's Law) with categorization?
  - Inference path: concepts.md 'Usability Principle Core Terms' → Hick's Law + Miller's Law → categorize when options exceed working memory
  - Verification criteria: PASS if options categorized/limited for unfamiliar choices. FAIL if 10+ uncategorized options presented

- **CQ-AD-05** [P2] When undo is possible, is it preferred over confirmation dialogs?
  - Inference path: logic_rules.md 'Undo Over Confirmation' → undo better UX for reversible actions; 5-10s window
  - Verification criteria: PASS if reversible actions use undo pattern. FAIL if confirmation dialogs used when undo is feasible

- **CQ-AD-06** [P2] Are Fitts's Law constraints applied (targets 44x44px+, destructive distanced 24px+ from primary)?
  - Inference path: logic_rules.md 'Fitts's Law Application' → touch targets, separation thresholds, form submit left-aligned
  - Verification criteria: PASS if targets meet minimums, destructive distanced, submit aligned. FAIL if adjacent destructive/primary

- **CQ-AD-07** [P2] Are coach marks progressive (1 at a time, max 3-5 steps, trigger on first encounter)?
  - Inference path: logic_rules.md 'Progressive Disclosure of Guidance' → 5+ simultaneous = skip-all; trigger on first feature encounter
  - Verification criteria: PASS if 1 at a time, max 5 steps, encounter-triggered. FAIL if 5+ simultaneous or all on app open

---

## 5. Modal and Overlay (CQ-MO)

Verifies modals are used appropriately with correct focus management, close mechanisms, and accessibility.

- **CQ-MO-01** [P1] Are modals used only when user attention is required and background interaction would disrupt?
  - Inference path: logic_rules.md 'Modal Usage Criteria' → 3 criteria: attention needed, independent context needed, background would disrupt
  - Verification criteria: PASS if every modal satisfies all 3 criteria. FAIL if modals used where inline/panel/toast could serve

- **CQ-MO-02** [P1] Do modals have 3+ close mechanisms (X button, ESC, action/cancel button)?
  - Inference path: logic_rules.md 'Modal Close Mechanisms' → X top-right 44x44px, ESC at modal level, explicit cancel text
  - Verification criteria: PASS if 3+ mechanisms present. FAIL if any mechanism missing

- **CQ-MO-03** [P1] Is focus trapped within modal and restored to trigger on close?
  - Inference path: dependency_rules.md 'Modal → Focus Trap' → Tab cycles within modal → dependency_rules.md 'Modal Close → Focus Restore' → focus returns to trigger
  - Verification criteria: PASS if Tab cycles within modal, focus returns to trigger on close. FAIL if focus escapes or is lost on close

- **CQ-MO-04** [P1] Are stacked modals prohibited (no modal-on-modal)?
  - Inference path: logic_rules.md 'Stacked Modal Prohibition' → alternatives: wizard steps within same shell, or close-then-open
  - Verification criteria: PASS if no modal opens another modal. FAIL if any stacked modals

- **CQ-MO-05** [P2] Is the background deactivated (inert) while modal is open?
  - Inference path: dependency_rules.md 'Modal → Background Deactivation' → background non-interactive, keyboard-unreachable, screen-reader-hidden
  - Verification criteria: PASS if background inert. FAIL if background elements remain focusable

- **CQ-MO-06** [P2] Are form modals protected against accidental data loss?
  - Inference path: logic_rules.md 'Unsaved Data Protection' → dirty check, all close mechanisms trigger confirmation, "Keep Editing" primary
  - Verification criteria: PASS if dirty modal triggers unsaved warning on all close paths. FAIL if data lost silently

- **CQ-MO-07** [P2] On mobile, do large modals (>50% viewport) convert to bottom sheets or full-screen?
  - Inference path: logic_rules.md 'Mobile Modal Alternatives' → >50% viewport → full-screen or bottom sheet with close button
  - Verification criteria: PASS if large mobile modals use bottom sheet/full-screen. FAIL if desktop modal on mobile

---

## 6. Data Display (CQ-DD)

Verifies data display patterns match data characteristics with appropriate sorting, filtering, and pagination.

- **CQ-DD-01** [P1] Is the display pattern (table/card/list) chosen based on data characteristics and user task?
  - Inference path: logic_rules.md 'Display Pattern Selection' → table for comparison (4+ attributes), card for browsing (visual), list for sequential (1-3) → dependency_rules.md 'Data Characteristics → Display Pattern'
  - Verification criteria: PASS if pattern matches decision matrix. FAIL if mismatch (card for comparison tasks)

- **CQ-DD-02** [P1] Are sort criteria/direction displayed and user-changeable with appropriate defaults?
  - Inference path: concepts.md 'Data Display Core Terms' → Sorting → indicate sort/direction, URL state → logic_rules.md 'Default Sort Order'
  - Verification criteria: PASS if sort indicated, default contextually useful, state in URL. FAIL if sort hidden or default by system ID

- **CQ-DD-03** [P1] Are active filters visible, individually removable, with "clear all" and result count?
  - Inference path: logic_rules.md 'Filter Application Timing' → active filter display mandatory → concepts.md 'Data Display Core Terms' → Filtering
  - Verification criteria: PASS if all active filters visible, removable, clear-all exists, count shown. FAIL if filters hidden or no reset

- **CQ-DD-04** [P2] Is the pagination method appropriate for data volume and use case?
  - Inference path: logic_rules.md 'Pagination vs Infinite Scroll' → pagination for revisiting, infinite for browsing → dependency_rules.md 'Data Volume → Pagination Method' → thresholds (<20=none, 1000+=pagination+search)
  - Verification criteria: PASS if method matches use case and volume thresholds. FAIL if infinite scroll for 1000+ items

- **CQ-DD-05** [P2] Is filter application method (immediate vs "Apply") chosen by filter count and response time?
  - Inference path: logic_rules.md 'Filter Application Timing' → immediate if ≤3 filters and <500ms; batch if >3 or >500ms
  - Verification criteria: PASS if method matches threshold. FAIL if complex filters apply immediately causing excess requests

- **CQ-DD-06** [P2] Does every data display have context-specific empty states?
  - Inference path: logic_rules.md 'Empty Table/List State' → headers-only = broken UI → dependency_rules.md 'Empty Results → Empty State UI' → contextual per type
  - Verification criteria: PASS if search/filter/category empty states each have specific guidance and CTA. FAIL if empty = only headers

- **CQ-DD-07** [P2] Is filter/sort state reflected in the URL?
  - Inference path: dependency_rules.md 'Sort/Filter Change → Data Refresh' → URL state → dependency_rules.md 'Navigation–URL References'
  - Verification criteria: PASS if URL encodes filter/sort state, back restores previous. FAIL if state lost on refresh

---

## 7. Responsive UI Adaptation (CQ-R)

Verifies the interface adapts to viewports while preserving content priority and touch requirements.

- **CQ-R-01** [P1] Do components transition appropriately at breakpoints (table→card, top nav→bottom nav)?
  - Inference path: structure_spec.md 'Responsive Component Transition Rules' → per-component criteria → dependency_rules.md 'Viewport Size → Component Pattern Transition' → explicit breakpoints
  - Verification criteria: PASS if breakpoint transitions defined, no content permanently hidden. FAIL if components overflow/break

- **CQ-R-02** [P1] Is mobile layout ordered by content priority, not just DOM order?
  - Inference path: dependency_rules.md 'Screen Reduction → Content Priority' → priority matrix required → structure_spec.md 'Required Relationships' → Responsive–Content Coherence
  - Verification criteria: PASS if explicit priority ranking, mobile follows priority. FAIL if high-priority below fold

- **CQ-R-03** [P1] Do touch targets meet 44x44px minimum with 8px+ spacing?
  - Inference path: concepts.md 'Responsive and Adaptive Design Terms' → Touch Target → WCAG 2.5.5 → logic_rules.md 'Fitts's Law Application'
  - Verification criteria: PASS if all touch targets ≥44x44px with ≥8px spacing. FAIL if any target below minimum

- **CQ-R-04** [P2] Are hover-dependent interactions replaced with touch alternatives?
  - Inference path: dependency_rules.md 'Touch Environment → Hover Alternative' → tooltip→tap popover, mega menu→tap expand
  - Verification criteria: PASS if every hover has touch alternative. FAIL if info accessible only via hover

- **CQ-R-05** [P2] Are breakpoints explicitly defined with exact values (content-determined, not device-assumed)?
  - Inference path: dependency_rules.md 'Viewport Size → Component Pattern Transition' → explicit pixel values → concepts.md 'Responsive and Adaptive Design Terms' → Breakpoint
  - Verification criteria: PASS if documented with exact values. FAIL if assumed without definition

- **CQ-R-06** [P2] Does responsive transition preserve all content (none permanently hidden)?
  - Inference path: dependency_rules.md 'Viewport Size → Component Pattern Transition' → content loss prohibition; may collapse behind expand controls
  - Verification criteria: PASS if all desktop info accessible at mobile. FAIL if content disappears at mobile

---

## 8. Accessible Interaction (CQ-AC)

Verifies the interface serves users with diverse abilities via keyboard, screen reader, and cognitive support.

- **CQ-AC-01** [P1] Can all features be operated with keyboard alone?
  - Inference path: concepts.md 'Accessible Interaction Core Terms' → Keyboard Accessibility → WCAG 2.1.1 → structure_spec.md 'Required Relationships' → Keyboard Accessibility Completeness
  - Verification criteria: PASS if every element reachable via Tab, activatable via Enter/Space, focus visible. FAIL if any element keyboard-inaccessible

- **CQ-AC-02** [P1] Does tab order match visual reading order?
  - Inference path: logic_rules.md 'Tab Order Integrity' → DOM order = visual order (WCAG 1.3.2, 2.4.3); tabindex > 0 prohibited
  - Verification criteria: PASS if Tab follows visual order, no positive tabindex. FAIL if CSS reorder diverges from tab order

- **CQ-AC-03** [P1] Is dynamic content communicated to screen readers via ARIA live regions?
  - Inference path: logic_rules.md 'Live Region Usage' → polite for most, assertive for urgent only → dependency_rules.md 'Dynamic Content → Live Region'
  - Verification criteria: PASS if dynamic updates use appropriate aria-live. FAIL if changes invisible to screen readers

- **CQ-AC-04** [P1] Are skip links provided as first focusable element?
  - Inference path: concepts.md 'Accessible Interaction Core Terms' → Skip Link → WCAG 2.4.1, first in DOM, visible on focus
  - Verification criteria: PASS if skip link first focusable, visible on focus. FAIL if missing or not first

- **CQ-AC-05** [P1] Are native HTML elements preferred over custom components?
  - Inference path: logic_rules.md 'Native HTML Preference' → `<button>`, `<select>` natively support keyboard/SR → logic_rules.md 'ARIA Usage Principle' → "No ARIA is better than bad ARIA"
  - Verification criteria: PASS if native elements used where possible. FAIL if styled `<div>` replaces `<button>` without reason

- **CQ-AC-06** [P2] Do custom components have ARIA roles, states, and keyboard patterns?
  - Inference path: dependency_rules.md 'Custom Component → ARIA Specification' → role mappings (listbox, tablist, switch, region)
  - Verification criteria: PASS if every custom component has ARIA spec and keyboard interaction. FAIL if custom components lack ARIA

- **CQ-AC-07** [P2] Are keyboard alternatives provided for drag-and-drop and gesture-only interactions?
  - Inference path: dependency_rules.md 'Drag-and-Drop → Keyboard Alternative' → equivalent outcome + screen reader announcements
  - Verification criteria: PASS if keyboard alternative achieves same outcome with SR announcements. FAIL if reordering only possible via mouse

- **CQ-AC-08** [P2] Is focus managed when content is dynamically added or removed?
  - Inference path: logic_rules.md 'Focus Management for Dynamic Content' → deleted item → focus to next/previous, not lost to body
  - Verification criteria: PASS if focus moves logically after dynamic changes. FAIL if focus lost to body

- **CQ-AC-09** [P2] Do color contrast ratios meet WCAG (4.5:1 text, 3:1 large/UI)?
  - Inference path: concepts.md 'Accessible Interaction Core Terms' → Color Contrast → WCAG 1.4.3, 1.4.11, 1.4.1 (color not sole differentiator)
  - Verification criteria: PASS if all text/UI meets ratios, color not sole indicator. FAIL if below thresholds

- **CQ-AC-10** [P2] Are time limits warned 20s+ in advance with extension mechanism (WCAG 2.2.1)?
  - Inference path: dependency_rules.md 'Time Limit → Extension Mechanism' → warn ≥20s before, extension available
  - Verification criteria: PASS if warned with extension option. FAIL if sessions expire without warning

- **CQ-AC-11** [P3] Is `prefers-reduced-motion` respected?
  - Inference path: domain_scope.md 'Micro-interaction & Animation' → Reduced Motion (required) → concepts.md 'Responsive and Adaptive Design Terms' → Media Query
  - Verification criteria: PASS if animation reduced/removed when preference active. FAIL if animations unchanged

---

## 9. Consistency (CQ-CO)

Verifies identical concepts have identical representations; deviations are intentional and justified. Cross-cutting concern (domain_scope.md 'Cross-Cutting Concerns').

### CQ-CO Synthesis Rule

Three sub-types evaluated per review:
1. **Internal consistency** — same pattern repeated within product. Inference: logic_rules.md 'Constraint Conflict Checks' + structure_spec.md 'UI Design Required Elements'
2. **External consistency** — conformance to platform/industry conventions. Inference: domain_scope.md 'Reference Standards/Frameworks' + dependency_rules.md 'Source of Truth Management'
3. **Intentional deviation** — deviation documented with rationale. Inference: logic_rules.md 'Constraint Conflict Checks'

**Judgment**: All 3 sub-types PASS → CQ-CO PASS. 1+ sub-type FAIL → report violated sub-type with rationale.

### Internal Consistency

- **CQ-CO-01** [P1] Is the same functionality implemented with the same pattern throughout?
  - Inference path: logic_rules.md 'Consistency vs Contextual Appropriateness' → internal consistency highest priority → structure_spec.md 'UI Design Required Elements'
  - Verification criteria: PASS if pattern inventory shows identical patterns for identical functions. FAIL if same function uses different patterns without documented justification

- **CQ-CO-02** [P1] Are interactive element states (hover, focus, active, disabled, etc.) consistent across the interface?
  - Inference path: concepts.md 'Micro-interaction Terms' → State Transitions → consistent, distinguishable → structure_spec.md 'Feedback System'
  - Verification criteria: PASS if all elements use same state representations. FAIL if same component type has different states on different screens

### External Consistency

- **CQ-CO-03** [P1] Does the interface follow platform/industry conventions for core interactions (Jakob's Law)?
  - Inference path: concepts.md 'Usability Principle Core Terms' → Jakob's Law → domain_scope.md 'Reference Standards/Frameworks' → dependency_rules.md 'Source of Truth Management'
  - Verification criteria: PASS if core interactions follow platform conventions. FAIL if deviating without documented benefit

- **CQ-CO-04** [P2] Are platform-specific conventions correctly applied per target platform?
  - Inference path: domain_scope.md 'Normative System Classification' → Tier-1b enforced by OS/app store → dependency_rules.md 'Conflict Resolution Priority'
  - Verification criteria: PASS if platform conventions respected per target. FAIL if single design ignoring platform patterns

### Intentional Deviation

- **CQ-CO-05** [P2] When deviating from convention, is it documented with (1) what, (2) why, (3) learning support?
  - Inference path: logic_rules.md 'Consistency vs Contextual Appropriateness' → 3-element documentation → domain_scope.md 'Cross-Cutting Concerns'
  - Verification criteria: PASS if every inconsistency has documented rationale. FAIL if inconsistencies without documentation (defect per judgment rule)

- **CQ-CO-06** [P2] Are consistency scope levels prioritized (within-screen > across-app > across-products > platform)?
  - Inference path: concepts.md 'Interpretation Principles' → 4 levels in priority → logic_rules.md 'Consistency vs Contextual Appropriateness'
  - Verification criteria: PASS if within-product prioritized over cross-platform. FAIL if within-product sacrificed for cross-platform uniformity

---

## 10. Design System (CQ-DS)

Verifies design system provides governed components and tokens at scale. Scale-dependent (domain_scope.md 'Design System Architecture').

- **CQ-DS-01** [P2] Is a token system the single source of truth for visual consistency?
  - Inference path: concepts.md 'Design System Terms' → Design Token → one update propagates → dependency_rules.md 'Component–Design System References'
  - Verification criteria: PASS if visual values are named tokens, not hardcoded. FAIL if hex/px hardcoded in components

- **CQ-DS-02** [P2] Are tokens named semantically (by purpose, not value)?
  - Inference path: concepts.md 'Design System Terms' → Semantic Token → `color-text-error` not `color-red-500`; primitive → semantic → component-specific
  - Verification criteria: PASS if purpose-named tokens enabling theme switching. FAIL if value-named tokens

- **CQ-DS-03** [P2] Does every UI component reference a design system component?
  - Inference path: dependency_rules.md 'Component–Design System References' → ad-hoc = consistency + accessibility violation → structure_spec.md 'Isolated Node Prohibition'
  - Verification criteria: PASS if all components from system library. FAIL if ad-hoc components bypassing system

- **CQ-DS-04** [P3] Is design system governance defined (contribution, versioning, deprecation)?
  - Inference path: concepts.md 'Design System Terms' → Design System Governance → without governance, diverge or stagnate → domain_scope.md 'Design System Architecture'
  - Verification criteria: PASS if documented contribution model, versioning, deprecation. FAIL if uncontrolled changes

- **CQ-DS-05** [P3] Are component usage guidelines maintained (do/don't, accessibility per component)?
  - Inference path: domain_scope.md 'Design System Architecture' → Pattern Documentation (scale-dependent: >20 components)
  - Verification criteria: PASS if components have usage docs with do/don't and accessibility. FAIL if components lack documentation

---

## 11. Micro-interaction and Animation (CQ-MI)

Verifies transitions serve functional purposes within timing constraints and respect accessibility.

- **CQ-MI-01** [P2] Are state transitions designed (expand/collapse, show/hide, loading-to-content)?
  - Inference path: domain_scope.md 'Micro-interaction & Animation' → Transition Design → concepts.md 'Micro-interaction Terms' → State Transitions
  - Verification criteria: PASS if major transitions have defined animations. FAIL if state changes occur abruptly with no continuity

- **CQ-MI-02** [P2] Are animation durations within limits (100-200ms simple, 200-500ms complex, never >500ms)?
  - Inference path: concepts.md 'Micro-interaction Terms' → Animation Principles for UI → duration and easing rules
  - Verification criteria: PASS if all within limits with appropriate easing. FAIL if >500ms or linear easing for UI

- **CQ-MI-03** [P2] Do interactive elements provide immediate feedback (<100ms)?
  - Inference path: concepts.md 'Micro-interaction Terms' → Feedback → immediate (<100ms) → domain_scope.md 'Cross-Cutting Concerns' → Performance Perception
  - Verification criteria: PASS if every element responds within 100ms. FAIL if no immediate response on tap/click

- **CQ-MI-04** [P2] Is `prefers-reduced-motion` respected?
  - Inference path: domain_scope.md 'Micro-interaction & Animation' → Reduced Motion (required) → concepts.md 'Responsive and Adaptive Design Terms' → Media Query
  - Verification criteria: PASS if non-essential animations disabled/reduced when preference active. FAIL if animations unchanged

- **CQ-MI-05** [P3] Is a motion system defined when 5+ animation types exist?
  - Inference path: domain_scope.md 'Micro-interaction & Animation' → Motion System (scale-dependent: 5+ types)
  - Verification criteria: PASS if documented easing curves, duration scales, motion principles. FAIL if inconsistent timing/easing

---

## 12. Constraint Conflict CQs

Each maps to a conflict scenario in logic_rules.md 'Constraint Conflict Checks'.

- **CQ-CC-01** [P2] When security and convenience conflict, are thresholds set by risk level?
  - Inference path: logic_rules.md 'Security vs Convenience' → low=auto-login, medium=session validation, high=re-auth
  - Verification criteria: PASS if risk-level classification with appropriate trade-offs. FAIL if same security for all

- **CQ-CC-02** [P2] When density and cognitive load conflict, is resolution user-type-aware?
  - Inference path: logic_rules.md 'Information Density vs Cognitive Load' → expert=dense, general=progressive disclosure, hybrid=toggle
  - Verification criteria: PASS if user type considered (density toggle for hybrid). FAIL if single density for all

- **CQ-CC-03** [P2] When consistency and context conflict, is deviation documented with scope and rationale?
  - Inference path: logic_rules.md 'Consistency vs Contextual Appropriateness' → document (1) standard pattern, (2) reason, (3) affected screens
  - Verification criteria: PASS if 3-element documentation exists. FAIL if patterns differ without docs

- **CQ-CC-04** [P2] When simplicity and discoverability conflict, are core features (>50% usage) always visible?
  - Inference path: logic_rules.md 'Simplicity vs Discoverability' → core >50% visible, secondary 10-50% one step away, tertiary <10% in settings
  - Verification criteria: PASS if visibility by usage frequency. FAIL if frequent features hidden for cleanliness

- **CQ-CC-05** [P2] When platform convention and differentiation conflict, are conventions kept for core interactions?
  - Inference path: logic_rules.md 'Platform Convention vs Differentiation' → conventions for nav/forms/gestures; differentiate in content/workflow
  - Verification criteria: PASS if conventions for core, differentiation in value areas. FAIL if custom gestures conflict with platform

- **CQ-CC-06** [P1] When accessibility and visual simplicity conflict, does accessibility prevail?
  - Inference path: logic_rules.md 'Accessibility vs Visual Simplicity' → accessibility takes precedence; non-negotiable: focus indicators, labels, error messages, skip links → domain_scope.md 'Normative System Classification' → Tier-1a overrides all
  - Verification criteria: PASS if focus indicators, labels, messages, skip links all present. FAIL if any removed for visual simplicity

- **CQ-CC-07** [P2] Is the Conflict Resolution Procedure followed (apply tier ordering → compare enforcement → document and verify scope)?
  - Inference path: logic_rules.md 'Conflict Resolution Procedure' → 3-step process → domain_scope.md 'Normative System Classification' → Tier-1a > Tier-1b > Tier-2 > Tier-3
  - Verification criteria: PASS if conflicts resolved by tier with documented rationale. FAIL if ad-hoc without tier consideration

---

## 13. Normative System CQ

Verifies normative tier system is correctly applied.

- **CQ-NS-01** [P1] When tiers conflict, does the higher tier prevail ([Tier-1a] > [Tier-1b] > [Tier-2] > [Tier-3])?
  - Inference path: domain_scope.md 'Normative System Classification' → binding force determines priority → domain_scope.md 'Source of Truth Priority Mapping' → dependency_rules.md 'Conflict Resolution Priority'
  - Verification criteria: PASS if higher tier prevails (e.g., Tier-1a "errors persistent" overrides Tier-2 "toast for all feedback") with conflict documented. FAIL if lower tier overrides higher

- **CQ-NS-02** [P2] Are enforcement mechanisms in place per tier?
  - Inference path: domain_scope.md 'Normative System Classification' → Tier-1a: accessibility audit tools, Tier-1b: app store review, Tier-2: design system linting, Tier-3: design review
  - Verification criteria: PASS if each decision references appropriate tier with enforcement implemented. FAIL if no enforcement for applicable tier

---

## Related Documents
- domain_scope.md — Normative system (Tier-1a/1b/2/3), Key Sub-Areas, Cross-Cutting Concerns, Reference Standards, Bias Detection
- concepts.md — Term definitions for all sub-areas (usability, navigation, forms, feedback, action, modal, data, accessibility, design system, micro-interaction, responsive)
- logic_rules.md — Behavioral rules, constraint conflict resolution (CQ-CO inference path endpoint)
- structure_spec.md — Required Elements (CQ-CO internal consistency endpoint), Screen State Matrix, Required Relationships, Form/Navigation/Responsive structure
- dependency_rules.md — IA-Nav, Action-Feedback, Form-Validation, Modal-Focus, Responsive-Component, Accessibility-Interaction dependencies; Source of Truth Management (CQ-CO external consistency endpoint)

---

## Appendix: Q1–Q40 → CQ-ID Mapping

| Original | New CQ-ID | Summary | Notes |
|----------|-----------|---------|-------|
| Q1 | CQ-N-01 | IA matches mental model | Expanded with system-structure anti-pattern |
| Q2 | CQ-N-02 | Global nav consistency | Expanded with wayfinding |
| Q3 | CQ-N-03 | Path clarity, information scent | Expanded with depth-based strengthening |
| Q4 | CQ-N-05 | Breadcrumbs for deep hierarchy | Refined with 3-level threshold |
| Q5 | CQ-N-07 | Search UI and no-results | Expanded with IA categorization |
| Q6 | CQ-FI-01 | Logical field order | Expanded with theme coherence |
| Q7 | CQ-FI-02 | Required/optional distinction | Expanded with minority convention |
| Q8 | CQ-FI-03 | Validation and error messages | Expanded with per-field timing, 3-part template |
| Q9 | CQ-FI-04 | Input aids | Expanded with placeholder rule |
| Q10 | CQ-FI-04 | Placeholders ≠ labels | Merged into CQ-FI-04 |
| Q11 | CQ-FI-06 | Multi-step progress | Expanded with data preservation |
| Q12 | CQ-FS-01 | System feedback | Expanded with 3-stage model |
| Q13 | CQ-FS-03 | Loading state | Expanded with duration thresholds |
| Q14 | CQ-FS-07 | Async recovery paths | Expanded with timeout distinction |
| Q15 | CQ-FS-04 | Empty state guidance | Expanded with 3-type differentiation |
| Q16 | CQ-FS-05 | Error pages recovery | Expanded to all error types |
| Q17 | CQ-AD-01 | Primary action | Expanded with visual hierarchy |
| Q18 | CQ-AD-02 | Destructive protection | Expanded with severity levels |
| Q19 | CQ-AD-01 | No competing CTAs | Merged into CQ-AD-01 |
| Q20 | CQ-AD-04 | Hick's Law | Expanded with Miller's Law |
| Q21 | CQ-AD-03 | Clear next action | Expanded with error/empty coverage |
| Q22 | CQ-MO-01 | Modal usage criteria | Expanded with 3-criteria test |
| Q23 | CQ-MO-02 | Modal close mechanisms | Expanded with 3+ requirement |
| Q24 | CQ-MO-03 | Focus trap | Expanded with focus restore |
| Q25 | CQ-MO-04 | No stacked modals | Expanded with alternatives |
| Q26 | CQ-DD-01 | Display pattern selection | Expanded with decision matrix |
| Q27 | CQ-DD-02 | Sort criteria display | Expanded with defaults and URL |
| Q28 | CQ-DD-03 | Active filter display | Expanded with individual removal |
| Q29 | CQ-DD-04 | Pagination selection | Expanded with volume thresholds |
| Q30 | CQ-R-01 | Component transition | Expanded with breakpoint rules |
| Q31 | CQ-R-02 | Content priority | Expanded with priority vs DOM order |
| Q32 | CQ-R-03 | Touch target 44x44px | Expanded with spacing |
| Q33 | CQ-AC-01 | Keyboard access | Expanded with reachability/activatability |
| Q34 | CQ-AC-02 | Tab order = visual order | Expanded with tabindex prohibition |
| Q35 | CQ-AC-03 | ARIA live regions | Expanded with urgency selection |
| Q36 | CQ-AC-04 | Skip links | Expanded with DOM/visibility |
| Q37 | CQ-AC-07 | Complex interaction keyboard alt | Expanded with equivalent outcome |
| Q38 | CQ-CO-01 | Internal consistency | Expanded with pattern inventory |
| Q39 | CQ-CO-03 | External consistency | Expanded with Jakob's Law |
| Q40 | CQ-CO-05 | Intentional deviation | Expanded with 3-element doc |

New questions (no Q1-Q40 predecessor): CQ-N-04/06/08/09, CQ-FI-05/07/08/09, CQ-FS-02/06/08/09/10, CQ-AD-05/06/07, CQ-MO-05/06/07, CQ-DD-05/06/07, CQ-R-04/05/06, CQ-AC-05/06/08/09/10/11, CQ-CO-02/04/06, CQ-DS-01 through 05, CQ-MI-01 through 05, CQ-CC-01 through 07, CQ-NS-01/02. Total: 44 new questions covering design system architecture, micro-interaction, constraint conflicts, normative system, and expanded sub-areas from Wave 1 domain_scope.md upgrade.
