---
version: 2
last_updated: "2026-03-31"
source: manual
status: established
---

# UI Design Domain — Logic Rules

Classification axis: **behavioral concern** — rules classified by the user-facing behavior they govern.

## Navigation Logic

### Wayfinding Completeness

- Users must always be able to answer 3 questions: "Where am I?", "Where can I go?", "How do I go back?" If any one of these cannot be answered, navigation has failed
- Verification method: for each screen, confirm the presence of (1) active state indicator on current item, (2) visible links/buttons for next destinations, (3) a back/up affordance. Missing any one is a wayfinding violation

### Label Clarity

- Navigation item labels must be written in the user's language. Internal system terminology (e.g., "Instance Management") conflicts with the user's mental model
- Ambiguity test: if two different users could reasonably interpret a label to mean different destinations, the label fails. Replace with concrete nouns that describe content ("Orders" rather than "Management")
- Case study: a B2B SaaS product labeled a navigation item "Resources." Some users expected documentation, others expected cloud infrastructure. Renaming to "Help Docs" and "Infrastructure" eliminated support tickets about navigation confusion

### Hierarchy Depth and Information Scent

- As navigation hierarchy depth increases, user abandonment probability increases. If depth cannot be reduced, information scent must be strengthened at each level
- Quantitative threshold: at 4+ levels of depth, each additional level correlates with measurable drop in task completion. Beyond 3 levels, breadcrumbs become mandatory, not optional
- Information scent strengthening: each intermediate level must display a preview or summary of what the next level contains. A category page showing only sub-category names with no descriptions provides zero information scent

### Global Navigation Consistency

- Global navigation must be consistent across all screens. If global navigation disappears on a specific screen, users lose their sense of location
- Exception: immersive flows (checkout, onboarding wizards) may suppress global navigation to reduce distraction, but must provide an explicit exit mechanism (e.g., "Save and Exit" or close button)
- Violation case study: an e-commerce app hid the bottom navigation bar on product detail pages to maximize content area. Users attempting to switch to their cart had to press back repeatedly to reach a screen with navigation visible. Restoring persistent bottom navigation increased cart access by measurable amounts

### Mobile Navigation Discoverability

- On mobile, hamburger menus (≡) have low discoverability. Core navigation items should be placed in always-visible positions like bottom navigation, with only secondary items in the hamburger
- Quantitative guidance: bottom navigation supports 3–5 items. Exceeding 5 items in bottom navigation creates touch targets that are too small. If more than 5 primary destinations exist, re-evaluate the information architecture before adding items
- Case study: a news app moved its 3 most-used sections from a hamburger menu to bottom tabs. User engagement with those sections increased significantly because users no longer had to discover and open the menu

### Back Button Consistency

- Browser back and in-app back behavior must be consistent. Inconsistency causes user prediction to fail
- Specific requirement: single-page applications (SPAs) must manage browser history so that the browser back button matches the user's expectation of "go to the previous view." If a modal opens and the user presses browser back, the expected behavior is modal close, not navigation to the previous page
- Violation pattern: SPA routing that pushes no history entry when opening a modal, causing browser back to skip past the modal context entirely

## Form Design Logic

### Field Count and Completion Rate

- The number of form fields is inversely proportional to completion rate. Remove unnecessary fields, convert them to optional, or divide into steps
- Quantitative reference: forms with more than 7 visible fields at once show measurably higher abandonment rates. If more fields are required, progressive disclosure or multi-step layout should be used
- Decision rule: for each field, ask "Can we complete this task without this data?" and "Can we collect this data later?" If either answer is yes, the field should be removed or deferred

### Required/Optional Field Indication

- Required/optional field indication: if most are required, mark optional fields with "(optional)"; if most are optional, mark required fields with "*". Marking both creates visual noise
- Threshold: when the required/optional ratio is approximately 50/50, mark required fields with "*" because the consequence of missing a required field is higher than the consequence of filling an optional one

### Inline Validation Timing

- Inline validation timing: showing errors during input (on input) displays warnings before input is complete. On blur is generally appropriate. However, real-time feedback like password strength indicators is valid
- Specific timing rules:
  - **On blur**: appropriate for most text fields (email, name, address). Validates after the user signals they are done with the field
  - **On input (debounced, 300ms+)**: appropriate for username availability checks, search-as-you-type. Provides value during input without excessive requests
  - **On submit**: appropriate as a final validation pass. Must not be the only validation — catching all errors only on submit forces the user to scan the entire form
  - **Real-time (on each keystroke)**: appropriate only for password strength meters, character counters, and formatting previews. For other fields, keystroke-level validation is disruptive

### Error Message Quality

- Error messages should be written as positive instructions. "Invalid email" → "Please enter in email format (e.g., name@example.com)." How to fix it is more important than what went wrong
- Error message template: [What is wrong] + [How to fix it] + [Example if applicable]. Example: "Phone number must be 10 digits. Enter digits only, e.g., 0101234567"
- Case study: a registration form showed "Validation error" for all fields. Changing to field-specific messages with correction guidance ("Password must be at least 8 characters, including one number") reduced form abandonment measurably

### Multi-Step Form Coherence

- In multi-step forms, each step should be a logically complete unit. Mixing unrelated fields in the same step disrupts the user's context
- Grouping rule: fields within a step must share a single conceptual theme (identity, address, payment, preferences). If a step requires the user to context-switch between unrelated topics, it should be split
- Data preservation: when returning to a previous step, entered data must be preserved. Losing data on back-navigation forces re-entry and causes abandonment

### Autofill Compatibility

- Autofill must not be obstructed. Browser autofill greatly increases user input efficiency. The autocomplete attribute must be correctly specified
- Required autocomplete values: `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, `cc-exp`, `cc-csc`. Omitting these forces manual entry for data the browser already knows
- Violation pattern: setting `autocomplete="off"` on login or payment forms to "improve security." This degrades user experience without meaningful security benefit (password managers bypass it anyway)

## Feedback Logic

### Feedback Duration by Urgency

- Feedback persistence should be proportional to urgency:
  - **Success** → transient, auto-dismiss after 3–5 seconds. Success requires only acknowledgment, not sustained attention
  - **Info** → transient (3–5 seconds) or persistent by user choice. Non-critical information should not demand attention but should be retrievable
  - **Warning** → persistent until user acknowledgment. Warnings indicate potential problems the user should consciously decide to accept or address
  - **Error** → persistent until cause is resolved. Errors that auto-dismiss before the user reads them leave users confused about what went wrong
- Quantitative threshold for transient feedback: minimum 3 seconds visibility (below this, users may not notice or read the message), maximum 5 seconds (beyond this, stale success messages clutter the interface)

### Loading State Representation

- Loading state representation depends on expected duration. These implementation thresholds adapt Nielsen's perception thresholds (1993: 0–100ms/100ms–1s/>1s/>10s) to UI implementation practice. The 300ms boundary (vs Nielsen's 100ms) accounts for flash prevention — displaying and immediately removing a loading indicator in under 300ms is more disruptive than showing nothing:
  - **0–300ms** → no display needed (flash prevention — a spinner appearing and vanishing in <300ms is more jarring than the delay itself)
  - **300ms–1s** → spinner. Brief enough that detailed progress is not needed, but long enough that users notice the delay
  - **1s–10s** → skeleton screen or progress bar. Skeleton screens preserve layout stability and give users a preview of where content will appear. Progress bars provide completion estimation
  - **10s+** → background processing + completion notification. Operations this long should not block the user. Move to background and notify on completion
- Implementation detail: use a 300ms delay before showing any loading indicator. If the response arrives within 300ms, never show the indicator at all. This prevents spinner flash on fast connections

### Skeleton Screen Fidelity

- Skeleton screens must reflect the final layout. A skeleton unrelated to actual content causes a layout shift on load completion
- Verification: overlay the skeleton on the loaded state. If element positions, sizes, or counts differ significantly, the skeleton is misleading. A two-column skeleton that loads into a three-column layout violates this rule
- Case study: a dashboard showed a generic skeleton with 4 equal-width blocks, but the actual layout was a wide chart + narrow sidebar. The layout shift on load completion caused users to misclick because buttons moved

### Optimistic Update Boundaries

- Optimistic updates should be applied only to actions with low failure probability. Frequent failures cause frequent rollbacks, undermining user trust
- Appropriate uses: toggling a like/favorite (server failure is rare), reordering a list (conflict is unlikely for single-user data)
- Inappropriate uses: payment processing (failure is common enough that showing success prematurely is harmful), inventory-dependent actions (concurrent users may cause conflicts)
- Rollback requirement: every optimistic update must have a defined rollback UX — what the user sees when the server rejects the optimistic assumption. A silent rollback (item disappears without explanation) is worse than no optimistic update

### Notification Fatigue Management

- Notifications become ignored when they accumulate. Without managing notification frequency and importance, notification fatigue occurs. Urgent and informational notifications must be distinguished
- Frequency threshold: more than 3 toast notifications visible simultaneously indicate a system design problem, not a notification display problem. Audit the triggers, not just the display
- Priority channel separation: urgent notifications (errors, security alerts) must use a visually distinct channel from informational notifications (tips, updates). If both use the same toast style, users learn to ignore all toasts

### Empty State Guidance

- Guidance for the 3 types of empty states:
  - **First use (zero state)**: "No items yet" + first action CTA. The CTA must be the exact action the user needs to take (e.g., "Create your first project" button), not a generic "Get started"
  - **No data**: "No items matching the criteria" + criteria change guidance. Provide specific suggestions: "Try removing the date filter" or "Search for a broader term"
  - **Error-caused empty state**: "Could not load data" + retry or alternative. Include a retry button and, if applicable, a link to a status page or support
- Empty state hierarchy: illustration/icon (optional, adds personality) → explanatory text (required) → action CTA (required). Text-only empty states with no action leave users stranded

## Modal Logic

### Modal Usage Criteria

- Modal usage criteria: use only when (1) the user's immediate attention is needed, (2) input/confirmation in an independent context is needed, and (3) background interaction would disrupt the current task
- Anti-pattern: using modals for content that users may want to reference while interacting with the main page. If users need to compare modal content with page content, use a panel, drawer, or inline expansion instead
- Decision flowchart: Is the content blocking? → Yes: Does it require input? → Yes: Modal. No: Could it be an inline banner? → Yes: Use banner. No: Modal. Is the content blocking? → No: Use non-modal (panel, toast, inline)

### Stacked Modal Prohibition

- Stacked modals (a modal on top of a modal) must not be used. Nested modals make context tracking difficult and complicate focus/accessibility management
- Alternative when a second context is needed within a modal: replace the modal content (wizard-style step transition within the same modal shell), or close the first modal and open the second
- Case study: a settings modal opened a confirmation modal for "discard changes?" which opened another modal for "are you sure?" Three layers of modals, each with its own overlay and close mechanism, made it impossible for keyboard users to determine which ESC press would close which layer

### Modal Close Mechanisms

- Modals must provide 3 or more close mechanisms: (1) X button, (2) ESC key, (3) action completion/cancel button. Background click to close only when there is no data loss risk
- Close mechanism details:
  - **X button**: positioned top-right (LTR) or top-left (RTL). Must have minimum 44×44px touch target
  - **ESC key**: must be captured at the modal level. If nested interactive elements capture ESC for their own purposes (e.g., closing a dropdown within the modal), ESC must first close the inner element and only close the modal when no inner element is active
  - **Background click**: disabled by default for modals containing forms or unsaved data. Enabled only for informational or read-only modals
  - **Cancel/Close button**: text must be explicit ("Cancel," "Close," "Discard"). Avoid "OK" for cancel actions

### Unsaved Data Protection

- If a modal with a form is accidentally closed during input, data loss occurs. Modals with input require an unsaved changes warning before closing
- Detection rule: if any form field within the modal has been modified from its initial state (dirty check), all close mechanisms (X, ESC, background click, cancel button) must trigger the unsaved changes confirmation
- Confirmation dialog content: "You have unsaved changes. Discard changes?" with two clear options: "Keep Editing" (returns to modal) and "Discard" (closes modal and loses data). "Keep Editing" must be the visually primary action

### Mobile Modal Alternatives

- On mobile, modals that occupy the full screen are difficult to distinguish from a new screen. A bottom sheet or separate screen navigation may be more appropriate
- Decision criteria: if the modal content exceeds 50% of viewport height on mobile, convert to a full-screen page or bottom sheet with swipe-to-dismiss. Full-screen modals must include an explicit close/back button since there is no visible background to click

## Action Guidance Logic

### Primary Action Singularity

- There should be 1 primary action per screen. If 2 or more are equally emphasized, users cannot determine priority
- Visual hierarchy enforcement: primary action uses filled/solid style, secondary actions use outlined or text style. Tertiary actions (if any) use text-only style
- Exception: split-button patterns where a primary action has a dropdown for variations (e.g., "Save" with dropdown options "Save as Draft" and "Save and Publish") count as a single primary action with variants, not multiple primary actions

### Fitts's Law Application

<!-- derived-from: WCAG 2.2, SC 2.5.5; also Apple HIG target size guidance and Material Design touch target guidance -->
- Fitts's Law applied: primary actions should be visually large and close to the user's current attention. Destructive actions should be physically distanced from primary actions to prevent misclicks
- Quantitative thresholds:
  - **Touch targets**: minimum 44×44px (Apple HIG) / 48×48dp (Material Design). Below this, error rates increase significantly on touch devices
  - **Destructive action separation**: at least 24px gap between a destructive action button and the nearest non-destructive button. Adjacent "Delete" and "Save" buttons without separation invite catastrophic misclicks
  - **Primary action placement**: in forms, the submit button should be left-aligned with form fields (following the gaze path), not right-aligned or centered

### Destructive Action Confirmation Labels

- In destructive action confirmation dialogs, the confirm button label must be specific. Instead of "OK," use "Delete," "Cancel Account," etc. to state the action. "OK" risks users clicking without reading the content
- Label matching rule: the confirmation button text must contain the verb from the action being confirmed. "Delete 3 items" → button says "Delete 3 Items," not "Confirm" or "Yes"
- Case study: a file management app used "OK" for all confirmation dialogs. Users reported accidentally deleting files because they had trained themselves to click "OK" to dismiss dialogs. Changing to "Delete Permanently" reduced accidental deletions

### Undo Over Confirmation

- For actions where undo is possible, immediate execution + undo is a better experience than confirmation dialogs. Confirmation dialogs interrupt flow, while undo shows the action's result first
- Undo time window: 5–10 seconds is standard. Below 5 seconds, users may not notice or react to the undo option. Above 10 seconds, the system must hold the operation in a pending state too long, complicating backend logic
- Applicable actions: email send (Gmail's "Undo Send"), list item archive, notification dismiss, item move between categories. Not applicable: permanent deletion, financial transactions, actions affecting other users

### Progressive Disclosure of Guidance

- Displaying 5 or more onboarding/coach marks at once causes users to skip all of them. Following the progressive disclosure principle, guide at the point when users actually use the feature
- Maximum simultaneous highlights: 1 coach mark or tooltip at a time. Sequential tours may chain up to 3–5 steps before user fatigue causes skip-all behavior
- Trigger-based guidance: show a tooltip when the user first encounters a feature, not when they first open the app. "First encounter" means the user navigates to the screen or hovers/focuses on the element for the first time

## Data Display Logic

### Display Pattern Selection

- Table vs card selection criteria: tables when attribute comparison between items is needed, cards when individual item browsing is central. Lists are sufficient when attributes are 3 or fewer
- Decision matrix:
  - **Table**: data has 4+ comparable attributes, users need to sort/filter by columns, users scan horizontally across rows. Example: order management, user administration
  - **Card**: each item is a distinct entity with a visual component (image, avatar, chart), users browse items individually. Example: product catalog, team member directory
  - **List**: items have 1–3 attributes, items are consumed sequentially. Example: notifications, activity log, search results

### Pagination vs Infinite Scroll

- Pagination vs infinite scroll selection criteria: pagination when specific item revisiting is needed (position recall possible), infinite scroll when browsing/consumption-focused (flow maintenance). In infinite scroll, footer content must be relocated since footer access is difficult
- Decision factors:
  - **Pagination**: user needs to return to a specific item later (bookmarkable position), result set is bounded and countable, task is goal-directed (finding a specific item). Example: search results, admin tables
  - **Infinite scroll**: content is stream-like and consumption-ordered, user rarely needs to return to a specific position, task is exploratory. Example: social media feed, news feed
  - **Load more button**: compromise when neither pure pagination nor infinite scroll fits. Gives users control over loading pace without losing scroll position

### Filter Application Timing

- Filter application method: apply immediately when there are few filters and results return quickly; use an "Apply" button when filters are complex or server requests are needed. Even with immediate application, active filter display and reset mechanism are mandatory
- Threshold guidance: if the filter count is 3 or fewer and response time is under 500ms, immediate application is preferred. If filter count exceeds 3 or response time exceeds 500ms, batch with an "Apply" button to avoid excessive server requests and rapid UI changes
- Active filter visibility: all currently active filters must be visible and individually removable. A "Clear all filters" option must always be available. Filters hidden in collapsed panels that the user forgets about cause "I can't find anything" confusion

### Default Sort Order

- The default sort order should be the most useful order for users. Using a technically convenient order (ID ascending, etc.) as default forces users to change sorting every time
- Common defaults by context: messaging/activity → newest first (reverse chronological), product catalog → relevance or popularity, admin tables → most recently modified, search results → relevance score

### Empty Table/List State

- A table/list showing only column headers with no data appears as broken UI. An empty state message and next-action guidance are needed
- Required elements: explanatory text ("No orders yet") + primary action ("Create your first order"). For filtered empty states: "No orders match your filters" + "Clear filters" button

## Accessible Interaction Logic

### Native HTML Preference

- If a native HTML element can be used, do not create a custom component. `<button>`, `<select>`, `<input>`, etc. natively support keyboard/screen reader. Custom implementations require building accessibility from scratch
- Cost of custom: a custom dropdown requires implementing keyboard navigation (arrow keys, type-ahead search, ESC to close), ARIA roles (`listbox`, `option`), focus management, and screen reader announcements. A native `<select>` provides all of these by default
- Decision rule: use a custom component only when the native element cannot support the required interaction pattern (e.g., multi-select with search, date range picker, rich text editor)

### ARIA Usage Principle

- ARIA should be used only when native semantics are insufficient. "No ARIA is better than bad ARIA" — incorrect ARIA roles/states cause more confusion for screen reader users
- Common ARIA misuse patterns:
  - Adding `role="button"` to a `<div>` instead of using `<button>` — the `<div>` still lacks keyboard focus, click handler on Enter/Space, and form submission behavior
  - Using `aria-label` that contradicts visible text — screen reader users hear different content than sighted users see
  - Setting `aria-hidden="true"` on interactive elements — hides the element from screen readers while sighted users can still interact with it

### Tab Order Integrity

- Tab order follows DOM order. Changing only visual position with CSS without changing DOM order causes keyboard users' tab movement to be inconsistent with visual order
- Verification method: press Tab through the entire page and confirm that the focus order matches the visual reading order (left-to-right, top-to-bottom for LTR languages)
- `tabindex` rules: `tabindex="0"` adds to natural tab order, `tabindex="-1"` is for programmatic focus (not reachable by tab), `tabindex > 0` must not be used. Positive tabindex disrupts the entire tab order of the page

### Live Region Usage

- Live region (aria-live) urgency selection: most updates use "polite" (notification after current reading completes); only urgent errors use "assertive" (immediate notification). Overusing assertive degrades screen reader user experience
- Application examples:
  - **polite**: search result count update, form save confirmation, chat message received
  - **assertive**: session timeout warning, form submission error, connection lost alert
  - **off**: content that updates frequently (stock tickers, real-time counters) — these should be queryable on demand, not announced on every change

### Focus Management for Dynamic Content

- When content is dynamically added or removed, focus must be managed explicitly. If a user deletes an item from a list, focus should move to the next item, the previous item, or a logical container — not be lost to the document body
- Pattern for dynamic additions: when new content appears (e.g., expanded accordion, loaded comments), do not auto-focus the new content unless the user explicitly requested it. Exception: newly opened dialogs must receive focus (see Modal Logic)

## Constraint Conflict Checks

This section governs the resolution of conflicts between competing design principles. It serves as the internal consistency and intentional deviation endpoint for competency verification (CQ-CO inference path).

### Security vs Convenience

- When security (re-authentication) and convenience (auto-login) conflict → set thresholds by risk level
  - **Low risk** (viewing content, browsing): allow auto-login, session tokens with standard expiration
  - **Medium risk** (editing profile, changing settings): require session validation, optionally prompt for password on sensitive fields
  - **High risk** (payments, account deletion, changing email/password): require re-authentication regardless of session state
- Deviation documentation: if a high-risk action is exempted from re-authentication (e.g., small-value payments below a threshold), the risk assessment and threshold must be documented

### Information Density vs Cognitive Load

- When information density (efficiency) and cognitive load (overload) conflict → differentiate by user type
  - **Expert users**: dense UI (dashboards, admin panels) with compact display, keyboard shortcuts, batch operations. Experts tolerate density because they have learned the patterns
  - **General users**: progressive disclosure — show essentials first, allow drill-down for details. Default to the simpler view
  - **Hybrid audiences**: provide density toggles (compact/comfortable/spacious view options) rather than choosing one density for all
- Case study: a project management tool showed all task metadata (assignee, due date, priority, labels, time estimate, story points) in the list view. Expert project managers loved it; new team members were overwhelmed. Adding a "Compact" / "Detailed" toggle satisfied both groups

### Consistency vs Contextual Appropriateness

- When consistency (same pattern on all screens) and contextual appropriateness (different pattern is effective for this screen) conflict → context may take precedence, but the deviation reason must be documented and user learning support is needed
- Documentation requirement: intentional pattern deviations must be recorded with (1) the standard pattern being deviated from, (2) the reason the context requires a different pattern, (3) the specific screens/components where the deviation applies
- Consistency scope levels (4 levels, priority order per concepts.md §Interpretation Principles):
  1. **Within-screen consistency**: elements on the same screen follow the same pattern. Highest priority — inconsistency within a single view is immediately noticeable
  2. **Across-app consistency**: the same pattern repeated throughout the product. Second priority — users build muscle memory within one product
  3. **Across-products consistency (design system)**: consistency across multiple products via shared design system. Third priority — enables cross-product user transfer
  4. **Platform convention consistency**: conformance to platform conventions. Fourth priority — users accept platform-specific behavior differences when within-product consistency is maintained

### Simplicity vs Discoverability

- When simplicity (minimal UI) and discoverability (features must be visible) conflict → core features are always visible, secondary features use progressive disclosure. Hiding core features for "cleanliness" is a usability failure
- Feature classification method: measure feature usage frequency. Features used by >50% of users in a typical session are "core" (always visible). Features used by 10–50% are "secondary" (one interaction away). Features used by <10% are "tertiary" (in settings, menus, or help)
- Violation pattern: hiding a frequently used filter behind a "More options" button to keep the interface "clean" while users repeatedly fail to find it

### Platform Convention vs Differentiation

- When platform convention adherence (Jakob's Law) and differentiation (unique experience) conflict → follow conventions for core interactions (navigation, forms, system gestures); differentiate in unique features (core value delivery area)
- Differentiation zones: content presentation, data visualization, domain-specific workflows. These are areas where users do not bring strong prior expectations
- Convention zones: navigation patterns, form submission, back button behavior, scroll behavior, pull-to-refresh, swipe gestures. These are areas where users expect platform-standard behavior
- Case study: a social media app implemented a custom swipe-left gesture to delete posts, conflicting with the iOS system gesture for back navigation. Users frequently accidentally deleted posts when trying to go back. Reverting to the standard iOS swipe-back gesture and using a different mechanism for deletion resolved the issue

### Accessibility vs Visual Simplicity

<!-- derived-from: WCAG 2.2, SC 1.3.1, 1.4.1, 2.4.1, and 2.4.7 -->
- When accessibility and visual simplicity conflict → accessibility takes precedence. Focus indicators, labels, and error messages are not "visual noise" but essential information
- Non-negotiable accessibility elements: focus indicators (cannot be hidden with `outline: none` without a visible alternative), form labels (cannot be replaced with placeholder-only), error messages (cannot be conveyed by color alone), skip navigation links (can be visually hidden but must exist in DOM)
- Accommodation: accessible elements can be styled to be visually subtle while remaining functional. Focus indicators can use a brand-appropriate color and style. Labels can use a compact visual treatment. The requirement is functional presence, not visual prominence

### Conflict Resolution Procedure

When two or more rules from this document or from structure_spec.md and dependency_rules.md produce contradictory guidance for a specific design decision:

1. **Apply the ordering principle directly** (see domain_scope.md §Normative System Classification): Tier-1a overrides Tier-1b/2/3; Tier-1b overrides Tier-2/3; Tier-2 overrides Tier-3
2. **Within the same tier, compare enforcement strength**: the rule with the stronger enforcement mechanism takes precedence (legal > app store review > design system lint > design review)
3. **Document the decision and verify impact scope**: record the overridden rule, the prevailing rule, and the rationale, then confirm that the choice does not cascade into new violations elsewhere

## SE Transfer Verification

The following SE domain patterns were evaluated for transfer to UI Design and found to differ in enforcement context:

| SE Pattern | UI Design Equivalent | Key Difference |
|---|---|---|
| Type system enforcement (compile-time) | Design system token enforcement (design-time) | SE has compiler enforcement; UI Design relies on design tool linting and review |
| State machine determinism | Screen state matrix completeness | SE verifies via tests; UI Design verifies via state audit and QA |
| Database constraints (NOT NULL, UNIQUE) | Required field / unique identifier constraints in IA | SE uses DB enforcement; UI Design uses IA rules and form validation |
| API versioning | Design system versioning | SE uses URL/header versioning; UI Design uses token/component versioning with visual regression |
| Test coverage | Screen state coverage | SE measures line/branch coverage; UI Design measures state coverage per screen (8 states × N screens) |

## Related Documents
- concepts.md — Usability, navigation, form, feedback, modal, accessibility term definitions
- dependency_rules.md — Action–feedback, form–validation, modal–focus dependency rules
- structure_spec.md — Screen structure, state system, navigation structure, structural thresholds
- domain_scope.md — Normative hierarchy (Tier-1a/1b/2/3), reference standards, cross-cutting concerns
- competency_qs.md — Verification questions linked to each logic rule (CQ-CO references this file's Constraint Conflict Checks section)
