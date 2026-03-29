---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# UI Design Domain — Logic Rules

## Navigation Logic

- Users must always be able to answer 3 questions: "Where am I?", "Where can I go?", "How do I go back?" If any one of these cannot be answered, navigation has failed
- Navigation item labels must be written in the user's language. Internal system terminology (e.g., "Instance Management") conflicts with the user's mental model
- As navigation hierarchy depth increases, user abandonment probability increases. If depth cannot be reduced, information scent must be strengthened at each level
- Global navigation must be consistent across all screens. If global navigation disappears on a specific screen, users lose their sense of location
- On mobile, hamburger menus (≡) have low discoverability. Core navigation items should be placed in always-visible positions like bottom navigation, with only secondary items in the hamburger
- Browser back and in-app back behavior must be consistent. Inconsistency causes user prediction to fail

## Form Design Logic

- The number of form fields is inversely proportional to completion rate. Remove unnecessary fields, convert them to optional, or divide into steps
- Required/optional field indication: If most are required, mark optional fields with "(optional)"; if most are optional, mark required fields with "*". Marking both creates visual noise
- Inline validation timing: Showing errors during input (on input) displays warnings before input is complete. On blur is generally appropriate. However, real-time feedback like password strength indicators is valid
- Error messages should be written as positive instructions. "Invalid email" → "Please enter in email format (e.g., name@example.com)." How to fix it is more important than what went wrong
- In multi-step forms, each step should be a logically complete unit. Mixing unrelated fields in the same step disrupts the user's context
- Autofill must not be obstructed. Browser autofill greatly increases user input efficiency. The autocomplete attribute must be correctly specified

## Feedback Logic

- Feedback persistence should be proportional to urgency. Success → transient (auto-dismiss after 3~5 seconds), info → transient/persistent by choice, warning → persistent until user acknowledgment, error → persistent until cause is resolved
- Loading state representation depends on expected duration. 0~300ms → no display needed (perceived as instant response), 300ms~1s → spinner, 1s~10s → skeleton or progress bar, 10s+ → background processing + completion notification
- Skeleton screens must reflect the final layout. A skeleton unrelated to actual content causes a layout shift on load completion
- Optimistic updates should be applied only to actions with low failure probability. Frequent failures cause frequent rollbacks, undermining user trust
- Notifications become ignored when they accumulate. Without managing notification frequency and importance, notification fatigue occurs. Urgent and informational notifications must be distinguished
- Guidance for the 3 types of empty states:
  - First use (zero state): "No items yet" + first action CTA
  - No data: "No items matching the criteria" + criteria change guidance
  - Error-caused empty state: "Could not load data" + retry or alternative

## Modal Logic

- Modal usage criteria: Use only when (1) the user's immediate attention is needed, (2) input/confirmation in an independent context is needed, and (3) background interaction would disrupt the current task
- Stacked modals (a modal on top of a modal) must not be used. Nested modals make context tracking difficult and complicate focus/accessibility management
- Modals must provide 3 or more close mechanisms: (1) X button, (2) ESC key, (3) action completion/cancel button. Background click to close only when there is no data loss risk
- If a modal with a form is accidentally closed during input, data loss occurs. Modals with input require an unsaved changes warning before closing
- On mobile, modals that occupy the full screen are difficult to distinguish from a new screen. A bottom sheet or separate screen navigation may be more appropriate

## Action Guidance Logic

- There should be 1 primary action per screen. If 2 or more are equally emphasized, users cannot determine priority
- Fitts's Law applied: Primary actions should be visually large and close to the user's current attention. Destructive actions should be physically distanced from primary actions to prevent misclicks
- In destructive action confirmation dialogs, the confirm button label must be specific. Instead of "OK," use "Delete," "Cancel Account," etc. to state the action. "OK" risks users clicking without reading the content
- For actions where undo is possible, immediate execution + undo is a better experience than confirmation dialogs. Confirmation dialogs interrupt flow, while undo shows the action's result first
- Displaying 5 or more onboarding/coach marks at once causes users to skip all of them. Following the progressive disclosure principle, guide at the point when users actually use the feature

## Data Display Logic

- Table vs card selection criteria: Tables when attribute comparison between items is needed, cards when individual item browsing is central. Lists are sufficient when attributes are 3 or fewer
- Pagination vs infinite scroll selection criteria: Pagination when specific item revisiting is needed (position recall possible), infinite scroll when browsing/consumption-focused (flow maintenance). In infinite scroll, footer content must be relocated since footer access is difficult
- Filter application method: Apply immediately when there are few filters and results return quickly; use an "Apply" button when filters are complex or server requests are needed. Even with immediate application, active filter display and reset mechanism are mandatory
- The default sort order should be the most useful order for users. Using a technically convenient order (ID ascending, etc.) as default forces users to change sorting every time
- A table/list showing only column headers with no data appears as broken UI. An empty state message and next-action guidance are needed

## Accessible Interaction Logic

- If a native HTML element can be used, do not create a custom component. `<button>`, `<select>`, `<input>`, etc. natively support keyboard/screen reader. Custom implementations require building accessibility from scratch
- ARIA should be used only when native semantics are insufficient. "No ARIA is better than bad ARIA" — incorrect ARIA roles/states cause more confusion for screen reader users
- Tab order follows DOM order. Changing only visual position with CSS without changing DOM order causes keyboard users' tab movement to be inconsistent with visual order
- tabindex="0" adds to natural tab order, tabindex="-1" is for programmatic focus (not reachable by tab), tabindex > 0 should not be used. Positive tabindex disrupts the entire tab order
- Live region (aria-live) urgency selection: Most updates use "polite" (notification after current reading completes); only urgent errors use "assertive" (immediate notification). Overusing assertive degrades screen reader user experience

## Constraint Conflict Checks

- When security (re-authentication) and convenience (auto-login) conflict → Set thresholds by risk level. Allow auto-login for viewing, require re-authentication for payments/deletion
- When information density (efficiency) and cognitive load (overload) conflict → Differentiate by user type. Dense UI (dashboard) for expert users, progressive disclosure for general users
- When consistency (same pattern on all screens) and contextual appropriateness (different pattern is effective for this screen) conflict → Context may take precedence, but the deviation reason must be documented and user learning support is needed
- When simplicity (minimal UI) and discoverability (features must be visible) conflict → Core features are always visible, secondary features use progressive disclosure. Hiding core features for "cleanliness" is a usability failure
- When platform convention adherence (Jakob's Law) and differentiation (unique experience) conflict → Follow conventions for core interactions (navigation, forms, system gestures); differentiate in unique features (core value delivery area)
- When accessibility and visual simplicity conflict → Accessibility takes precedence. Focus indicators, labels, and error messages are not "visual noise" but essential information

## Related Documents
- concepts.md — Usability, navigation, form, feedback, modal, accessibility term definitions
- dependency_rules.md — Action–feedback, form–validation, modal–focus dependency rules
- competency_qs.md — Verification questions linked to each logic rule
