---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Dependency Rules

Classification axis: **linkage type** — dependencies classified by the type of relationship between UI components and systems.

## Information Architecture–Navigation Dependency

### IA → Navigation Patterns

- Information Architecture (IA) → Navigation Patterns: content classification and hierarchy must be defined before navigation structure can be determined. Designing navigation without IA causes menus to reflect system structure, conflicting with the user's mental model
- Dependency chain: Content Inventory → Content Categorization → Hierarchy Definition → Navigation Pattern Selection → Navigation Implementation
- Violation example: a SaaS product built its navigation directly from its database schema (Users, Sessions, Logs, Configurations). Users expected task-based navigation (Dashboard, Team Management, Activity, Settings). The system-structure navigation forced users to learn the internal architecture to use the product. Rebuilding navigation from a user-centered IA resolved the usability issues

### IA → Search

- Information Architecture → Search: content must be structured for search results to be meaningfully classified and displayed
- Dependency: search result categories, facets, and filters derive from IA categories. If the IA does not define categories, search results are an unstructured flat list
- Search result structure requirements: results must be groupable by IA category, and each result must display enough context (title, category, snippet) for the user to evaluate relevance without clicking

### Navigation Change → Secondary Navigation Update

- Navigation Change → Breadcrumb/Sitemap Update: when navigation hierarchy changes, secondary navigation (breadcrumbs, sitemaps, footer links) must be updated synchronously
- Failure mode: breadcrumbs showing a path that no longer exists in the navigation hierarchy. Users clicking a breadcrumb segment and reaching a 404 or unexpected page
- Update checklist when navigation hierarchy changes: (1) breadcrumb path definitions, (2) sitemap entries, (3) footer navigation links, (4) search scope categories, (5) URL structure (if URL reflects hierarchy)

### Navigation Depth → Wayfinding Aids

- Navigation Depth → Wayfinding Aids: when hierarchy is 3 levels or deeper, current location indicators and upward navigation are mandatory
- Depth thresholds:
  - **1–2 levels**: wayfinding aids optional (active state on navigation item is sufficient)
  - **3 levels**: breadcrumbs mandatory, current page title must reflect position in hierarchy
  - **4+ levels**: breadcrumbs mandatory + section-level sidebar navigation showing siblings and parent, or equivalent persistent context indicator
- Violation example: a documentation site with 5-level hierarchy (Product → Category → Topic → Article → Section) showed only the article title with no breadcrumbs or section context. Users landing from search could not determine their position or navigate to related articles

## Action–Feedback Dependency

### User Action → System Feedback

- User Action → System Feedback: every user action must have a corresponding feedback. An action without feedback creates the perception that "the system is not responding"
- Completeness verification: for each interactive element (button, link, toggle, input, drag target), define (1) immediate feedback (visual state change), (2) process feedback (loading if async), and (3) outcome feedback (success/failure)
- Minimum feedback: even if no async operation occurs, a button must show a pressed/active state (visual confirmation that the click registered). Flat buttons with no state change on click feel unresponsive

### Asynchronous Action Chain

- Asynchronous Action → Loading State → Success/Failure State: asynchronous operations must have at least 3 states defined (requesting/success/failure)
- Extended chain for long operations: Requesting → Progress Update → Success/Failure → Post-Success Action Guidance
- Timeout dependency: if an operation can time out, a fourth state (Timeout) must be defined, distinct from Failure. Timeout should offer retry with context ("Request timed out. Your data was not lost. Try again?")
- Violation example: a file upload feature showed a spinner on upload start and a success message on completion, but had no failure state defined. When uploads failed due to file size limits, the spinner continued indefinitely. Adding a failure state with file size guidance and retry resolved the confusion

### Destructive Action Protection Chain

- Destructive Action → Confirmation or Undo: irreversible actions require at least one of pre-execution confirmation or post-execution undo
- Decision chain: Is the action reversible? → Yes: Use undo pattern (immediate execution + undo toast, 5–10 seconds). No: Is the action high-impact (affects other users, deletes data permanently)? → Yes: Use explicit confirmation with specific label. No: Use soft-delete with recovery period
- Protection depth by severity:
  - **Low severity** (archive, hide): no confirmation needed, provide undo
  - **Medium severity** (delete single item): confirmation dialog with specific action label, or undo
  - **High severity** (delete account, bulk delete, publish to all users): confirmation dialog + typing confirmation (type the item name or "DELETE") + cooldown period
- Violation example: a project management tool allowed bulk deletion of tasks with a single "OK" button. A user accidentally selected all tasks (Ctrl+A) and clicked delete. 200+ tasks were permanently deleted with no recovery. Adding type-to-confirm ("Type DELETE to confirm removing 237 tasks") and a 30-day soft-delete recovery prevented recurrence

### Optimistic Update → Rollback UX

- When UI is updated before server confirmation, a rollback scenario and user guidance for failure must be designed together
- Rollback chain: Optimistic UI Update → Server Rejection → Rollback Animation → Explanatory Message → Recovery Option
- Rollback must be visible: silently reverting a change (e.g., a "liked" heart icon quietly returning to unliked) without explanation causes users to think the interface is buggy. The rollback must include a brief explanatory message ("Could not save. Try again?")

### Feedback Type → Persistence

- Success is transient (toast), errors are persistent (inline message), warnings persist until user acknowledgment. Displaying errors as toasts causes users to miss them
- Persistence chain: Feedback Type → Display Method → Persistence Duration → Dismissal Mechanism → Post-Dismissal State
- Post-dismissal requirement: after a user dismisses a warning, the warning must not immediately reappear (unless the condition that triggered it recurs). Dismissed warnings should be accessible in a notification center or log for later reference

## Form–Validation Dependency

### Input Field → Validation Rules

- All input fields must have their allowed value range/format defined. Accepting input without rules makes validation impossible
- Validation rule categories: (1) presence (required vs optional), (2) format (email, phone, URL patterns), (3) range (min/max length, numeric bounds), (4) business rules (unique username, valid address, future date only)
- Cross-field dependencies: when field B's valid values depend on field A's value (e.g., state/province depends on country), the dependency must be explicitly defined and the dependent field must revalidate when the source field changes

### Validation → Error Display

- On validation failure, error messages must be visually proximate to the relevant field (Gestalt proximity). Displaying errors only at the top of the page makes it difficult to identify which field is affected
- Error display chain: Validation Failure → Error Message Generation → Error Placement (inline below field) → Field Visual State Change (red border) → Focus Management (move focus to first error field on submit)
- Multiple error handling: when a form has multiple validation errors on submit, (1) display all errors simultaneously (not one at a time), (2) scroll to and focus on the first error field, (3) show an error summary at the top of the form linking to each error field

### Form Submission → Result Feedback

- After form submission, feedback on the result (success/server error/validation error) and next-action guidance must be provided
- Success chain: Form Submit → Loading State → Success Feedback → Next Action Guidance ("Your account has been created. Go to your dashboard?")
- Failure chain: Form Submit → Loading State → Error Feedback → Recovery Guidance (server error: retry button; validation error: highlighted fields with messages)
- Data preservation on failure: if a server error occurs after form submission, all entered data must be preserved. Clearing the form on error forces complete re-entry

### Multi-Step Form Dependencies

- Multi-step Form → Progress Indicator: when steps are divided, the current step, total number of steps, and previous/next navigation availability must be displayed
- Multi-step Form → Data Preservation: when returning to a previous step, entered data must be preserved. Otherwise, re-entry is forced
- Step dependency rules:
  - **Independent steps**: steps can be completed in any order. Progress indicator should allow direct navigation to any step. Example: profile setup (avatar, bio, preferences can be done in any order)
  - **Sequential steps**: step N requires data from step N-1. Progress indicator shows completed/current/locked states. Forward-only navigation until all preceding steps are complete. Example: checkout flow (shipping → payment → review)
  - **Branching steps**: step N's content depends on a choice in step M. The progress indicator must update to reflect the actual path. Example: insurance quote (different questions based on insurance type selected)

## Data–Display Dependency

### Data Characteristics → Display Pattern

- Data requiring comparison uses tables; browsing-oriented data uses cards; order-important data uses lists. Mismatch between data characteristics and display pattern reduces usage efficiency
- Dependency chain: Data Schema (fields, types, cardinality) → User Task Analysis (compare, browse, search, drill-down) → Display Pattern Selection → Layout Configuration
- Violation example: a product comparison feature used card layout, making users scroll back and forth to compare attributes. Switching to a table layout with products as columns and attributes as rows enabled direct comparison and measurably reduced time-on-task

### Data Volume → Pagination Method

- If total item count is finite and specific position access is needed, use pagination; if browsing-focused, use infinite scroll
- Volume thresholds:
  - **< 20 items**: no pagination needed; display all items
  - **20–100 items**: pagination or "load more" button, depending on use case
  - **100–1000 items**: pagination with page size selector (10/25/50/100)
  - **1000+ items**: pagination + search/filter required; infinite scroll inappropriate for this volume (scroll position becomes meaningless)

### Sort/Filter Change → Data Refresh

- When sort criteria or filters change, data must be refreshed immediately (or after explicit apply). The selection criteria for refresh method (immediate/apply button) must be defined
- Dependency: filter change → data request → loading state → result display → active filter update. If any step in this chain is missing, the UI becomes inconsistent (e.g., showing old data with new filter indicators)
- URL synchronization: filter and sort state should be reflected in the URL (query parameters). If the state is not in the URL, users cannot bookmark or share filtered views, and browser back does not restore the previous filter state

### Empty Results → Empty State UI

- When filter/search results are empty, the empty state must provide appropriate guidance (suggesting filter adjustments, search term changes)
- Dependency chain: Query → Zero Results → Empty State Display → Suggested Actions (modify filters, broaden search, clear all filters)
- Contextual empty states:
  - **Search empty**: "No results for '[query]'. Try different keywords or check your spelling"
  - **Filter empty**: "No items match your filters. [Clear filters] or [adjust criteria]" with specific filter names that could be changed
  - **Category empty**: "This category has no items yet. [Browse all items] or [Add the first item]"

## Modal–Focus Dependency

### Modal Open → Focus Management

- Modal Open → Focus Move: when a modal opens, focus must move inside the modal
- Focus target: first focusable element in the modal (typically the close button or the first form field). If the modal has a primary action, focusing that action may be appropriate for confirmation dialogs
- Implementation chain: Modal Trigger Click → Modal Render → `aria-modal="true"` Set → Background `inert` Applied → Focus Moved to Modal → Focus Trap Activated

### Modal → Focus Trap

- Modal Open → Focus Trap: Tab key within a modal must cycle only within the modal. If focus escapes to the background, screen reader users cannot perceive the modal
- Focus trap requirements: (1) Tab from last focusable element returns to first, (2) Shift+Tab from first returns to last, (3) no element outside the modal is reachable by Tab while modal is open
- Implementation note: the `inert` attribute on background content is the preferred mechanism over managing tabindex on individual elements

### Modal Close → Focus Restore

- Modal Close → Focus Restore: when a modal closes, focus must return to the element that triggered the modal. Lost focus causes keyboard users to lose their position
- Edge case: if the trigger element no longer exists when the modal closes (e.g., the modal was triggered by a list item that was deleted within the modal), focus should move to the nearest logical container or the element that now occupies the trigger's position

### Modal → Background Deactivation

- While a modal is open, the background must be treated as non-interactive (inert). Apply `aria-hidden` or `inert` attribute
- Requirement: all interactive elements in the background must be unreachable by keyboard and invisible to screen readers while the modal is open. Mouse/touch clicks on the background should either be ignored or close the modal (based on data loss risk — see logic_rules.md §Modal Close Mechanisms)

## Responsive–Component Dependency

### Viewport Size → Component Pattern Transition

- The criteria for components transitioning to different patterns at specific viewports must be defined
- Dependency chain: Viewport Width → Breakpoint Threshold → Component Pattern Switch → Content Reflow → Priority Reassertion
- Breakpoint definitions must be explicit: define the exact pixel values where transitions occur. Common breakpoints: 320px (small mobile), 375px (standard mobile), 768px (tablet), 1024px (small desktop), 1440px (standard desktop). The specific values should be project-defined, but must be documented
- Content loss prohibition: no content may be permanently hidden in responsive transitions. Content may be reorganized, collapsed behind expand controls, or moved to alternative locations, but information available at desktop must be accessible at mobile

### Touch Environment → Hover Alternative

- Hover-dependent interactions (tooltips, mega menus, etc.) must have alternatives defined for touch environments (long press, tap, dedicated button)
- Dependency chain: Hover Interaction Defined → Touch Alternative Defined → Consistent Information Access Guaranteed
- Common alternatives: tooltip on hover → tap popover with close button; mega menu on hover → tap to expand with tap-outside to close; hover preview → tap to expand in-place

### Screen Reduction → Content Priority

- Priorities for which information to keep and which to reduce/rearrange must be defined. Reducing without priorities pushes critical information aside
- Content priority matrix requirement: for each screen, define a priority ranking for all content sections. When viewport narrows, lower-priority content collapses first
- Violation example: a real estate listing page at desktop showed price, photos, description, map, agent contact, and similar listings. At mobile, the responsive layout stacked them in DOM order, pushing the agent contact button (high priority for conversion) below three scrolls of content. Reordering the mobile stack by priority (photos → price → agent contact → description → map → similar) significantly improved contact rates

## Accessibility–Interaction Dependency

### Custom Component → ARIA Specification

- Custom components not using native HTML elements must specify appropriate ARIA roles, states, and properties
- Dependency chain: Custom Component Design → ARIA Role Assignment → ARIA State/Property Definition → Keyboard Interaction Definition → Screen Reader Testing
- Common role mappings: custom dropdown → `role="listbox"` + `role="option"`; custom tabs → `role="tablist"` + `role="tab"` + `role="tabpanel"`; custom accordion → `role="region"` with `aria-expanded`; custom toggle → `role="switch"` with `aria-checked`
- Violation example: a custom "tag selector" component was built as a series of styled `<div>` elements. Screen readers announced it as "group" with no indication that items were selectable. Adding `role="listbox"` to the container and `role="option"` with `aria-selected` to each tag made the component usable with screen readers

### Dynamic Content → Live Region

- Content that changes without user action (notifications, counters, status changes) must be communicated to screen readers via ARIA live regions
- Dependency chain: Dynamic Content Identified → Update Frequency Assessed → `aria-live` Value Selected → Live Region Container Positioned in DOM
- Frequency-based decisions: updates every few seconds (stock prices, counters) → do not use live regions (too noisy); use on-demand query instead. Updates on user actions (form save result, search count) → `aria-live="polite"`. Urgent system alerts (session timeout, error) → `aria-live="assertive"`

### Drag-and-Drop → Keyboard Alternative

- Drag-and-drop cannot be operated with keyboard/screen reader. Alternative interactions such as arrow key movement and context menus are needed
- Alternative chain: Drag-and-Drop UI → Keyboard Alternative (arrow keys to move, Enter to pick up / drop) → Screen Reader Announcements ("Item 3 of 5. Press Enter to pick up, then arrow keys to move") → Equivalent Outcome Verification
- Requirement: the keyboard alternative must achieve the same outcome as drag-and-drop. If drag-and-drop allows reordering, the keyboard alternative must also allow reordering to any position, not just up/down by one

### Time Limit → Extension Mechanism

<!-- derived-from: WCAG 2.2, SC 2.2.1 -->
- If time limits exist (session timeout, auto-logout), users must be warned and provided with an extension mechanism (WCAG 2.2.1)
- Warning chain: Time Limit Defined → Warning Threshold Defined (warn at least 20 seconds before expiration) → Warning UI Displayed → Extension Mechanism Available → Extension Applied → Timer Reset
- Exception: time limits inherent to the activity (real-time auctions, live events) may not be extendable, but the user must be informed of the time limit before starting the activity

## Circular Dependency Detection and Classification

In UI design, some apparent circular dependencies are intentional design patterns, while others indicate structural defects.

### Intentional Circular Patterns

These are recognized patterns where bidirectional influence is expected and managed:

- **Filter ↔ Display**: changing filters updates the display; the display's empty state suggests filter changes. This is not a defect — it is a feedback loop. Management: the filter state is the source of truth; the display reacts to it and may suggest changes, but never modifies filters directly
- **Navigation ↔ Content**: navigation determines what content is shown; content (e.g., "related items" links) provides additional navigation. Management: the IA hierarchy is the source of truth for primary navigation; in-content links are secondary navigation and must not contradict the IA
- **Form ↔ Validation**: form input triggers validation; validation results modify form display (error states, field disabling). Management: the form data model is the source of truth; validation reads the model and writes to a separate error state, which the form displays

### Unintentional Circular Dependencies (Defects)

These indicate structural problems that must be resolved:

- **State ↔ State**: screen A's state depends on screen B's state, and screen B's state depends on screen A's state, with no clear source of truth. Resolution: identify which screen owns the state and make the other screen read from it
- **Navigation ↔ Navigation**: menu A links to menu B, and menu B links back to menu A, creating a loop with no content screens. Resolution: ensure every navigation path reaches a content endpoint
- **Modal ↔ Modal**: modal A opens modal B, and modal B has a path back to modal A (stacked modal violation). Resolution: flatten to a single modal with step transitions or convert to page navigation

### Detection Method

For any bidirectional dependency between components X and Y:
1. **Identify the source of truth**: is there a clear owner of the shared state/concept? If yes → intentional pattern (document the SoT). If no → unintentional circular dependency (resolve it)
2. **Trace the data flow**: does data flow X → Y → X in a managed loop (each direction serves a different purpose)? If yes → intentional feedback loop. Does data flow X → Y → X in an unmanaged loop (same data bouncing)? If yes → defect
3. **Test for infinite loops**: in the described interaction, could a user be stuck in an endless cycle with no exit? If yes → structural defect regardless of intent

## Referential Integrity

Referential integrity in UI design means that every reference from one UI element to another points to something that exists, is accessible, and is in a consistent state.

### Cross-Screen References

- A link, button, or CTA on screen A that navigates to screen B requires screen B to exist, be accessible to the same user, and display content consistent with what screen A promised
- Violation types:
  - **Broken reference**: screen A links to screen B, but screen B does not exist (404, missing route)
  - **Permission mismatch**: screen A shows a link to screen B visible to all users, but screen B requires admin permission. Non-admin users see the link, click it, and receive a permission error
  - **Content mismatch**: screen A says "View your invoices (3)" but screen B shows 5 invoices because the count on screen A is stale
- Verification: for each cross-screen reference, confirm (1) the target exists, (2) the user has permission, (3) any preview data (counts, names, summaries) on the source matches the target

### Component–Design System References

- Every component used in the UI must reference a defined component in the design system or pattern library
- Violation: a developer creates a custom date picker because the design system's date picker does not support range selection. The custom component has different styling, different keyboard behavior, and no ARIA support. It violates design system consistency and accessibility
- Resolution: extend the design system component to support the needed capability, or create a new design system component. Never use ad-hoc components that bypass the design system

### State References

- When one component displays data that originates from another component or screen, the data must be current or indicate staleness
- Stale data indicators: if a cached value is displayed while fresh data loads, show a visual indicator (e.g., greyed-out text, "Updating..." label, timestamp of last refresh)
- Real-time dependency: components displaying real-time data (notifications badge showing count, dashboard metrics) must define a refresh mechanism (polling interval, WebSocket subscription, or manual refresh button)

### Navigation–URL References

- If the UI uses URL-based routing, every navigable screen must have a corresponding URL, and every URL in the system must resolve to a valid screen or redirect
- URL integrity rules: (1) no dead URLs (URL exists but renders no content), (2) no orphan screens (screen exists but no URL reaches it), (3) URL changes must include redirects from old URLs for at least 90 days
- Deep linking: every screen that a user might want to bookmark, share, or return to via browser history must be addressable by URL. Modal states and filter configurations should be encoded in URL parameters or hash fragments when they represent shareable states

## Source of Truth Management

This section serves as the external consistency endpoint for competency verification (CQ-CO inference path). It defines which authoritative sources govern UI design decisions and how conflicts between sources are resolved.

### Internal Source of Truth

- **UI pattern decisions**: source of truth is the UI pattern library or design system pattern documentation. If the design system defines a modal pattern, all modals in the product must conform to it or document a deviation
- **Interaction specifications**: source of truth is the interaction specification document (design tool prototypes, specification documents, or annotated wireframes). If code implementation conflicts with spec, spec takes precedence (but if technical constraints exist, update the spec — never leave the conflict undocumented)
- **Content/copy**: source of truth is the content management system or UX writing guidelines. If the spec says "Submit" but the copy guidelines say action-specific labels, the copy guidelines take precedence for label text

### External Source of Truth

- **Accessibility standards**: WCAG 2.2 AA (minimum), WAI-ARIA 1.2, and applicable accessibility laws (ADA Section 508, European Accessibility Act). These define the non-negotiable baseline for accessible interaction
- **Platform guidelines**: Material Design (Android), Human Interface Guidelines (iOS/macOS), Fluent Design (Windows), GNOME HIG (Linux). These define platform-specific conventions that users expect
- **Web standards**: HTML specification (semantic elements), CSS specification (layout, animation), and relevant W3C specifications (Pointer Events, Touch Events). These define what the platform supports

### Conflict Resolution Priority

When sources of truth conflict, the following priority order applies:

1. **Accessibility standards** (Tier-1a): legal and ethical obligation. Non-negotiable
2. **Platform guidelines** (Tier-1b): enforced by app store review and user expectation. Override internal decisions when they conflict
3. **Internal pattern library / design system** (Tier-2): enforced by design system linting and review. Represents intentional internal decisions
4. **Industry principles / heuristics** (Tier-3): enforced by design review and usability testing. Provides guidance when no higher-tier rule applies

- Example conflict: the internal design system specifies toast notifications for all feedback. But accessibility standards require error messages to be persistent (not transient toasts). Accessibility takes precedence → errors must be persistent inline messages, even if the design system says toast
- Documentation requirement: when a higher-priority source overrides a lower-priority source, document the conflict and resolution in the design decision log

### Cross-Domain Source of Truth Boundaries

- When UI design decisions depend on data from other domains (API response structure from SE, brand guidelines from visual design, user research from UX research), the dependency and the authoritative source must be documented
- Change propagation: when an external source of truth changes (platform guideline update, accessibility standard revision, API schema change), all dependent UI design decisions must be reviewed for impact
- Version tracking: external standard versions referenced (e.g., "WCAG 2.2" not just "WCAG," "Material Design 3" not just "Material Design") must be specified in domain_scope.md and kept current

## SE Transfer Verification

The following SE dependency patterns were evaluated for transfer to UI Design and found to differ in application context:

| SE Pattern | UI Design Equivalent | Key Difference |
|---|---|---|
| Acyclic Dependencies Principle (module DAG) | Circular Dependency Detection/Classification | SE prohibits all cycles; UI Design distinguishes intentional feedback loops from unintentional cycles |
| Dependency Inversion Principle (depend on abstractions) | Design System abstraction (depend on pattern library, not ad-hoc implementation) | SE uses interfaces; UI Design uses design system components as the abstraction layer |
| Stable Dependencies Principle (depend toward stability) | Source of Truth Priority (depend toward higher-tier standards) | SE measures stability by coupling metrics; UI Design measures by enforcement mechanism strength |
| API Versioning | Design System Versioning | SE versions at endpoint level; UI Design versions at component/token level |
| Diamond Dependencies (version conflict) | Design System Token Conflicts (same token, different values in different contexts) | SE resolves with version managers; UI Design resolves with context-specific token overrides |
| Referential Integrity (foreign keys, schema alignment) | Cross-Screen Referential Integrity (links, permissions, data consistency) | SE enforces at database level; UI Design verifies at design review and QA level |

## Related Documents
- concepts.md — Navigation, form, feedback, modal, accessibility term definitions
- structure_spec.md — Screen structure, state system, navigation structure, required relationships
- logic_rules.md — Navigation/form/feedback/modal/accessibility behavioral logic, constraint conflict resolution
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), source of truth priority, cross-cutting concerns
- competency_qs.md — Dependency-related verification questions (CQ-CO references this file's Source of Truth Management section)
