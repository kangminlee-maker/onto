---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# UI Design Domain — Dependency Rules

## Information Architecture–Navigation Dependency

- Information Architecture (IA) → Navigation Patterns: Content classification and hierarchy must be defined before navigation structure can be determined. Designing navigation without IA causes menus to reflect system structure, conflicting with the user's mental model
- Information Architecture → Search: Content must be structured for search results to be meaningfully classified and displayed
- Navigation Change → Breadcrumb/Sitemap Update: When navigation hierarchy changes, secondary navigation (breadcrumbs, sitemaps) must be updated synchronously
- Navigation Depth → Wayfinding Aids: When hierarchy is 3 levels or deeper, current location indicators and upward navigation are mandatory

## Action–Feedback Dependency

- User Action → System Feedback: Every user action must have a corresponding feedback. An action without feedback creates the perception that "the system is not responding"
- Asynchronous Action → Loading State → Success/Failure State: Asynchronous operations must have at least 3 states defined (requesting/success/failure). Displaying only results without a loading state causes response delays to be perceived as system malfunction
- Destructive Action → Confirmation or Undo: Irreversible actions require at least one of pre-execution confirmation or post-execution undo
- Optimistic Update → Rollback UX: When UI is updated before server confirmation, a rollback scenario and user guidance for failure must be designed together
- Feedback Type → Persistence: Success is transient (toast), errors are persistent (inline message), warnings persist until user acknowledgment. Displaying errors as toasts causes users to miss them

## Form–Validation Dependency

- Input Field → Validation Rules: All input fields must have their allowed value range/format defined. Accepting input without rules makes validation impossible
- Validation → Error Message: On validation failure, error messages must be visually proximate to the relevant field (Gestalt proximity). Displaying errors only at the top of the page makes it difficult to identify which field is affected
- Form Submission → Success/Failure Feedback: After form submission, feedback on the result (success/server error/validation error) and next-action guidance must be provided
- Multi-step Form → Progress Indicator: When steps are divided, the current step, total number of steps, and previous/next navigation availability must be displayed
- Multi-step Form → Data Preservation: When returning to a previous step, entered data must be preserved. Otherwise, re-entry is forced

## Data–Display Dependency

- Data Characteristics → Display Pattern: Data requiring comparison uses tables; browsing-oriented data uses cards; order-important data uses lists. Mismatch between data characteristics and display pattern reduces usage efficiency
- Data Volume → Pagination Method: If total item count is finite and specific position access is needed, use pagination; if browsing-focused, use infinite scroll
- Sort/Filter Change → Data Refresh: When sort criteria or filters change, data must be refreshed immediately (or after explicit apply). The selection criteria for refresh method (immediate/apply button) must be defined
- Empty Results → Empty State UI: When filter/search results are empty, the empty state must provide appropriate guidance (suggesting filter adjustments, search term changes)

## Modal–Focus Dependency

- Modal Open → Focus Move: When a modal opens, focus must move inside the modal
- Modal Open → Focus Trap: Tab key within a modal must cycle only within the modal. If focus escapes to the background, screen reader users cannot perceive the modal
- Modal Close → Focus Restore: When a modal closes, focus must return to the element that triggered the modal. Lost focus causes keyboard users to lose their position
- Modal → Background Deactivation: While a modal is open, the background must be treated as non-interactive (inert). Apply aria-hidden or inert attribute

## Responsive–Component Dependency

- Viewport Size → Component Pattern Transition: The criteria for components transitioning to different patterns at specific viewports must be defined. Example: Table → card transition below 960px
- Touch Environment → Hover Alternative: Hover-dependent interactions (tooltips, mega menus, etc.) must have alternatives defined for touch environments (long press, tap, dedicated button)
- Screen Reduction → Content Priority: Priorities for which information to keep and which to reduce/rearrange must be defined. Reducing without priorities pushes critical information aside

## Accessibility–Interaction Dependency

- Custom Component → ARIA Role/State: Custom components not using native HTML elements must specify appropriate ARIA roles, states, and properties
- Dynamic Content Change → Live Region: Content that changes without user action (notifications, counters, status changes) must be communicated to screen readers via ARIA live regions
- Drag-and-Drop → Keyboard Alternative: Drag-and-drop cannot be operated with keyboard/screen reader. Alternative interactions such as arrow key movement and context menus are needed
- Time Limit → Extension Mechanism: If time limits exist (session timeout, auto-logout), users must be warned and provided with an extension mechanism (WCAG 2.2.1)

## Source of Truth Management

- Source of truth for UI pattern decisions: UI pattern library or design system pattern documentation
- Source of truth for platform conventions: Material Design (Android), Human Interface Guidelines (iOS), web accessibility standards (WCAG/WAI-ARIA)
- Source of truth for interaction specifications: Interaction specification documents (design tool prototypes or separate documents). If code implementation conflicts with spec, spec takes precedence (but if technical constraints exist, update the spec)
- When sources of truth conflict: Accessibility standards > Platform guidelines > Internal pattern library. Accessibility is a non-negotiable baseline requirement

## Related Documents
- concepts.md — Navigation, form, feedback, modal, accessibility term definitions
- structure_spec.md — Screen structure, state system, navigation structure
- logic_rules.md — Navigation/form/feedback/modal/accessibility logic
