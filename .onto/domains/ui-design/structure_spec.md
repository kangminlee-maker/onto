---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Structure Specification

Classification axis: **structural component** — specifications classified by the structural element they govern.

## UI Design Required Elements

This section serves as an internal consistency endpoint for competency verification (CQ-CO inference path). Each element category defines what must structurally exist in a UI design specification.

### Navigation Structure
- **Information Architecture (IA)**: content inventory, categorization scheme, hierarchy definition
- **Global Navigation**: persistent navigation visible across all screens (or with documented exceptions for immersive flows)
- **Local Navigation**: context-specific navigation within a section (sidebar, tabs, breadcrumbs)
- **Secondary Navigation**: supplementary paths (footer links, utility navigation, search)
- **Search**: search input, results display pattern, no-results state, search scope indicator
- **Wayfinding**: active state indicators, breadcrumbs (when hierarchy ≥ 3 levels), location labels

### Input System
- **Form Structure**: field grouping, step division (if multi-step), field ordering rationale
- **Input Type Patterns**: appropriate input types per data (text, number, date picker, select, checkbox, radio, file upload)
- **Validation**: rules per field (required, format, range, dependencies between fields), timing (on blur, on submit, real-time), error message content
<!-- derived-from: WCAG 2.2, SC 1.3.1 and 3.3.2 -->
- **Input Aids**: placeholder text (as example, never as label), autocomplete attributes, input masks, character counters

### Feedback System
- **System Feedback**: success/failure/warning/info messages, visual style per type, persistence rules
- **Loading States**: spinner, skeleton, progress bar — selection criteria per duration (see logic_rules.md §Loading State Representation for behavioral thresholds)
- **Notifications/Toasts**: position, duration, stacking behavior, urgency-based channel separation
- **Micro-feedback**: hover states, active states, pressed states, disabled states for all interactive elements

### State System
- **Empty States**: first-use (zero state), no-data, error-caused, no-results, no-permission — all states beyond the happy path
- **Error States**: error message, recovery path, retry mechanism
- **Loading States**: per-component and per-page loading representations
- **Onboarding States**: first-time experience, progressive disclosure triggers
- **Offline States** (when applicable): cached data display, reconnection behavior

### Action Guidance System
- **CTA Hierarchy**: primary/secondary/tertiary action visual distinction per screen
- **Destructive Action Protection**: confirmation dialogs with specific labels, or undo mechanisms
- **Undo Patterns**: undo availability, time window, visual treatment of undo option

### Data Display System
- **Display Patterns**: tables, cards, lists, grids — selection criteria per data characteristics
- **Sorting/Filtering**: default sort order, available sort options, filter application method (immediate vs apply button), active filter display
- **Pagination**: pattern selection (pagination, infinite scroll, load more), page size defaults

### Accessible Interaction
<!-- derived-from: WCAG 2.2, SC 2.1.1, 2.4.1, and 2.4.3 -->
- **Keyboard Navigation**: tab order, focus management for dynamic content, skip links
- **ARIA**: roles, states, properties for all custom components
- **Screen Reader Support**: live regions, landmark roles, meaningful sequence
<!-- derived-from: WCAG 2.2, SC 2.2.1 -->
- **Time Limit Management**: extension mechanism for session timeouts, auto-save for long forms

## Required Relationships

These are cross-component validation rules. Each rule connects two structural components that must remain consistent with each other. A violation indicates a structural defect.

### Action–Feedback Completeness
- Every user action must have a corresponding system feedback defined
- Verification: create a matrix of all interactive elements × their feedback. Any empty cell is a violation
- Common gaps: icon buttons without tooltip feedback, toggle switches without state confirmation, drag-and-drop without drop zone feedback

### Async State Completeness
- Every asynchronous operation must have loading/success/failure — 3 states defined
- Verification: for each API call or async operation in the specification, confirm all 3 states are specified. If only the success state is specified, the design is incomplete
- Extended requirement: operations that may time out must also define a timeout state (distinct from failure)

### Input–Validation Completeness
- Every input field must have validation rules and error messages defined
- Verification: for each input field, confirm (1) required/optional status, (2) format/range constraints, (3) error message text for each constraint violation, (4) validation timing
- Cross-field validation: when fields have dependencies (e.g., end date must be after start date), the validation rules must specify the dependency and the error message must reference both fields

### Empty State Completeness
- Every data display must have an empty state defined
- Verification: for each screen that displays dynamic data, confirm that the empty state is specified for all applicable types (first-use, no-results, error-caused)
- Context-specific empty states: the same component in different contexts may need different empty states. A "Recent Orders" widget on a dashboard needs a different empty state than the full Orders page

### Error Recovery Completeness
- Every error state must include a recovery path
- Verification: for each error state, confirm that the user has at least one actionable option (retry, edit input, contact support, navigate elsewhere). An error with no recovery path is a dead end
- Recovery path hierarchy: retry (if transient error) > edit input (if user error) > alternative path (if permanent failure) > support contact (last resort)

### Keyboard Accessibility Completeness
- Every interactive element must be accessible by keyboard
- Verification: tab through all interactive elements on each screen. Confirm that (1) every element is reachable, (2) every element can be activated (Enter/Space), (3) focus is visible on every element
- Custom component verification: for each custom interactive component, confirm that keyboard interaction is defined (which keys do what)

### Navigation–IA Coherence
- Navigation structure must reflect the information architecture
- Verification: compare the IA hierarchy with the navigation implementation. If the IA defines a category that has no corresponding navigation entry, or navigation contains items not in the IA, there is a mismatch
- Update propagation: when IA changes, navigation must be updated synchronously. A lag between IA revision and navigation update causes structural inconsistency

### Responsive–Content Coherence
- Responsive transitions must preserve content priority
- Verification: compare the content visible at desktop breakpoint with mobile breakpoint. If high-priority content (defined by IA) is hidden or deprioritized at mobile, the responsive transition violates content priority
- Structural requirement: the content priority order must be explicitly defined (not just implied by desktop layout) so that responsive transitions have a reference

## Screen State Matrix

State list applied to all screens/components. Each screen must be verified against all applicable states.

| State | Description | Required Elements | Structural Threshold |
|-------|------------|-------------------|---------------------|
| Ideal | Sufficient data, normal operation | Core content, primary action | All required elements present per §UI Design Required Elements |
| First-use (Zero) | No data yet | Guidance message, first action CTA | CTA must lead to the single most important first action |
| Partial Data | Only some data exists | Missing area guidance, completion prompts | Completion prompts for any section below 50% populated |
| Loading | Data request in progress | Skeleton/spinner, estimated time display | Skeleton layout must match final layout within ±10% element positioning |
| Error | Request failed | Error cause, recovery action (retry, etc.) | At least 1 recovery action; no dead-end errors |
| No Results | No filter/search results | Criteria change guidance, filter reset | Filter reset must be 1-click accessible |
| No Permission | Insufficient access permission | Permission request method, alternative path | Must state what permission is needed and how to obtain it |
| Offline | No network connection (if applicable) | Cached data display, reconnection guidance | Cache staleness indicator if cached data is older than 5 minutes |

## Navigation Structure Patterns

| Pattern | Suitable For | Not Suitable For | Structural Threshold |
|---------|-------------|-----------------|---------------------|
| Top Navigation (horizontal) | 5–7 main sections or fewer, desktop-focused | Many sections and mobile-focused | Maximum 7 items; beyond 7, use "More" overflow or restructure IA |
| Side Navigation (vertical) | Many sections or deep hierarchy, admin tools | Mobile environment, content width is important | Collapsible with persistent expand/collapse toggle |
| Bottom Navigation | Mobile, 3–5 core sections | More than 5 sections, desktop | Minimum 3 items, maximum 5 items. Each item must have icon + label |
| Tabs (horizontal/segment) | 2–5 sub-views within the same context | Many tabs or weak inter-tab relationship | Maximum 5 tabs visible without scroll; overflow with scroll indicator |
| Breadcrumbs | Hierarchy 3 levels or deeper, upward navigation needed | Shallow hierarchy of 1–2 levels | Each breadcrumb segment must be a clickable link except the current page |
| Hamburger Menu | Secondary navigation, space constraints | Core navigation (low discoverability) | Only for items not in primary navigation; never as the sole navigation method |

## Feedback Type–Representation Matrix

| Feedback Type | Representation Pattern | Persistence | Position | Structural Requirement |
|--------------|----------------------|-------------|----------|----------------------|
| Action Success | Toast | Transient (3–5 seconds) | Top or bottom of screen | Must include action description ("Item deleted") not just "Success" |
| Action Failure | Inline error + banner | Persistent until cause resolved | Near the relevant field + top of form | Must include specific error cause and correction guidance |
| System Warning | Banner | Persistent until user acknowledgment | Top of screen | Must include dismiss mechanism and, if applicable, action to resolve |
| Info Notification | Toast or notification center | Transient or until marked as read | Top of screen or notification area | Must not use the same visual style as warnings/errors |
| Loading (short) | Spinner | Until completion | At action trigger location | Display only after 300ms delay to prevent flash |
| Loading (long) | Skeleton / progress bar | Until completion | Content area | Skeleton must match final layout structure |
| Destructive Action Result | Undo toast or post-confirmation success message | Until undo time expires | Bottom of screen | Undo option must be reachable in 1 click; undo window 5–10 seconds |

## Form Structure Principles

### Field Ordering
- Field placement order: start with easiest/fastest fields → then complex/sensitive fields. Giving a sense of completion early prevents abandonment
- Structural rule: group related fields visually (using proximity and optionally a section divider). Never mix identity fields (name, email) with preference fields (notifications, theme) in the same visual group

### Layout
- Single-column layout is the principle. Two-column forms complicate the gaze path and increase field omission risk
- Exception: clear pairs such as first/last name, city/district may be placed side by side
- Structural threshold: form width should not exceed 600px on desktop. Wider forms increase eye-tracking distance and slow completion

### Label Position
- Top-aligned (above field) has the fastest completion time. Left-aligned is easy to scan but increases completion time
- Structural requirement: every field must have a visible label. Placeholder-only labels disappear on input and violate accessibility requirements

### Field Width
- Input field width should reflect expected input length. A full-width field for a 5-digit postal code confuses users into thinking "should I enter more?"
- Width guidelines: postal code → 120px, phone number → 200px, email → 300px, address → full width, textarea → full width

### Submit Button
- Submit button labels must be specific. Instead of "Submit," use "Create Account," "Place Order," etc. to specify the action result
- Position: left-aligned with form fields (following the gaze path), placed below the last field with adequate spacing (minimum 24px)

### Multi-Step Forms
- Structural requirements: progress indicator showing current step/total steps, previous/next navigation, data preservation across steps
- Step count threshold: 2–5 steps is optimal. Beyond 5 steps, user abandonment increases significantly. If more steps are needed, evaluate whether the form can be restructured or some data collected later

## Responsive Component Transition Rules

| Desktop Pattern | Mobile Transition | Transition Criteria | Structural Threshold |
|----------------|------------------|-------------------|---------------------|
| Data Table | Card list or core columns only | Number of columns × minimum column width > viewport | Identify 2–3 essential columns to preserve; hide remaining behind expand |
| Side Navigation | Hamburger menu or bottom navigation | Viewport 768px or below | Hamburger must include all items from side nav; no items may be lost |
| Horizontal Tabs (5+) | Scrollable tabs or dropdown | Total tab width > viewport | Scroll indicator (arrow or fade) required to signal more tabs exist |
| Multi-column Layout | Single-column stack | Viewport 768px or below | Stack order must follow content priority, not DOM order if they differ |
| Modal Dialog | Full screen or bottom sheet | Modal width > 90% of viewport | Full-screen modal must include close/back button in header |
| Hover Tooltip | Tap popover or inline text | Touch environment detected | Popover must have explicit close mechanism (tap outside or close button) |

## Classification Criteria Design

### Screen Classification Axes

Screens in a UI system can be classified along the following axes. Each axis determines which structural rules and state requirements apply.

| Axis | Values | Impact on Structure |
|------|--------|-------------------|
| Data Dependency | Static / Dynamic / Real-time | Dynamic and real-time screens require loading, error, and empty states. Static screens may omit loading states |
| User Role | Public / Authenticated / Admin | Admin screens may use dense layouts; public screens must prioritize simplicity and discoverability |
| Interaction Mode | Read-only / Input / Transactional | Input screens require form structure rules; transactional screens require confirmation/undo patterns |
| Content Type | Text / Media / Data visualization / Mixed | Media screens require responsive image/video handling; data visualization requires accessibility alternatives |

### Component Classification Axes

Components can be classified to determine which structural rules apply:

| Axis | Values | Structural Implication |
|------|--------|----------------------|
| Interactivity | Static / Interactive / Composite | Interactive components require focus management, keyboard support, ARIA. Static do not |
| State Count | Stateless / Binary (on/off) / Multi-state | Multi-state components require explicit state documentation for all states |
| Data Binding | Unbound / Read-bound / Write-bound / Bidirectional | Write-bound components require validation rules and error messages |
| Responsiveness | Fixed / Fluid / Adaptive | Adaptive components require breakpoint transition rules per §Responsive Component Transition Rules |

### Anti-Patterns in Classification

- **Applying the same structural rules to all screens**: an admin data table and a marketing landing page have different structural needs. Applying form validation rules to a static page wastes review effort; omitting state management from a data-heavy screen misses real defects
- **Classifying by implementation technology rather than user-facing concern**: "React page" vs "static HTML page" is an implementation classification. The structural classification should be "dynamic data display page" vs "static content page" because the user-facing structural requirements are what matter

## Domain Boundary Management

- The UI design domain covers "the structure through which the interface communicates with users"
- Visual expression (colors, typefaces, icon styles, visual hierarchy) falls under the visual-design domain. This domain focuses on "where to place what and how it responds"
- UX research (user studies, usability testing, personas) is a separate concern. Research results can be input to UI design, but the methodology itself is not under this domain's jurisdiction
- Frontend implementation (React components, CSS, state management) falls under the software-engineering domain. This domain provides interaction specifications that serve as input for implementation
- Content writing (UX writing, microcopy) overlaps with this domain, but text content itself is a separate concern. This domain covers the placement, timing, and structure of text

## Isolated Node Prohibition

Each item below is a structural defect — a node that exists in isolation without required connections.

- Async operations without loading/failure states defined → warning (state undefined)
- Data-displaying screens without empty states defined → warning (empty state absence)
- Error states without recovery paths → warning (dead end)
- Input fields without validation rules → warning (validation absence)
- Interactive elements not accessible by keyboard → warning (accessibility violation)
- Navigation paths from which return is impossible → warning (return path absence)
- Destructive actions without confirmation/undo → warning (protection absence)
- UI patterns not in the design system/pattern library → warning (out-of-system pattern)
- Responsive transitions without defined breakpoint behavior → warning (responsive gap)
- Custom components without ARIA role/state specification → warning (ARIA absence)
- Multi-step forms without progress indicators → warning (progress absence)

## SE Transfer Verification

The following SE structural patterns were evaluated for transfer to UI Design and found to differ in application context:

| SE Pattern | UI Design Equivalent | Key Difference |
|---|---|---|
| Required Module Structure Elements (entry point, business logic, data access, config) | Required UI Elements (navigation, input, feedback, state, action, data display, accessibility) | SE classifies by architectural layer; UI Design classifies by user-facing concern |
| Golden Relationships (module-interface, test-code, config-code, schema-code) | Required Relationships (action-feedback, async-state, input-validation, empty-state, error-recovery, keyboard-accessibility) | SE validates code structure coherence; UI Design validates interaction completeness |
| Architectural Patterns (hexagonal, clean, vertical slice) | Navigation/Layout Patterns (top nav, side nav, tabs, responsive transitions) | SE patterns are system-internal; UI Design patterns face the user directly |
| Classification Criteria Design (by layer, by feature, by bounded context) | Classification Criteria Design (by data dependency, user role, interaction mode, content type) | SE classifies code organization; UI Design classifies screen/component characteristics |
| Naming Conventions | Naming in design systems (component naming, token naming) | Both serve discoverability; UI Design naming affects designer-developer communication |

## Related Documents
- concepts.md — Usability, navigation, form, feedback, modal, accessibility term definitions
- dependency_rules.md — Information architecture–navigation, action–feedback, form–validation, modal–focus dependency rules
- logic_rules.md — Navigation/form/feedback/modal/accessibility behavioral logic
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), domain boundary, reference standards
- competency_qs.md — Structure-related verification questions (CQ-CO references this file's Required Elements section)
