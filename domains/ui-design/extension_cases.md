# UI Design Domain — Extension Scenarios

Each scenario is simulated to verify whether the existing UI design breaks.

## Case 1: Large-Scale Feature Addition

- Adding a new major feature (section) to the existing interface
- Verification: Does the information architecture (IA) accommodate the new feature? Does the number of top-level navigation items not exceed a manageable range (5~7)?
- Verification: Does the navigation position of the new feature align with the user's mental model?
- Verification: Are all states (ideal/empty/loading/error) defined for the new feature?
- Verification: Does the new feature reuse existing UI patterns (forms, tables, feedback, etc.)? If a new pattern is needed, is it consistent with the existing system?
- Verification: Does the new feature's CTA not conflict with the CTA hierarchy of existing screens?
- Affected files: structure_spec.md (navigation structure, screen states), dependency_rules.md (information architecture–navigation dependency)

## Case 2: New Mobile App Launch

- Extending the existing web interface to a mobile app (iOS/Android)
- Verification: Are desktop-to-mobile UI pattern transition rules defined? (table → card, sidebar → bottom navigation, etc.)
- Verification: Are touch target sizes (44×44px minimum) and spacing between touch areas satisfied?
- Verification: Are touch alternatives defined for all hover-dependent interactions?
- Verification: Are conflicts between platform conventions (Material Design, HIG) and internal UI patterns identified with resolution criteria defined?
- Verification: Are the scope and meaning of native gestures (swipe, pinch, long press) defined?
- Verification: Are offline behavior and guidance defined? (if applicable)
- Affected files: structure_spec.md (responsive component transitions), logic_rules.md (navigation logic)

## Case 3: User Type Diversification

- Expanding from a single user type to multiple user types (general user/administrator/power user, etc.)
- Verification: When different user types have different information density requirements, are UI variations designed to accommodate this? (dense dashboard for administrators vs concise UI for general users)
- Verification: Are permission-based UI branches (visible features, edit permissions) defined?
- Verification: Is the handling of features without permission (hide vs disable vs upgrade prompt) consistent?
- Verification: Are administrator-only features not exposed to general users?
- Verification: Is navigation appropriately adjusted for each user type?
- Affected files: structure_spec.md (screen state matrix), logic_rules.md (constraint conflicts — information density vs cognitive load)

## Case 4: Complex Form Addition

- Expanding from simple inputs to complex forms with 20+ fields
- Verification: Is the form divided into logical multi-steps?
- Verification: Are progress indicators, previous/next navigation, and data preservation designed for each step?
- Verification: Is the logic for conditional fields (shown/hidden based on previous answers) defined?
- Verification: Is draft saving supported? Are there measures to prevent data loss on browser exit?
- Verification: Is the flow for navigating to the step containing the error and displaying it defined when errors are in other steps?
- Affected files: logic_rules.md (form design logic), dependency_rules.md (form–validation dependency)

## Case 5: Real-Time Collaboration Feature Addition

- Expanding from a single-user interface to multi-user real-time collaboration
- Verification: Is a presence indicator for other users designed?
- Verification: Are the display and resolution methods for concurrent editing conflicts defined?
- Verification: When other users' changes are reflected in real time, does it not disrupt the current user's work?
- Verification: Are disconnection state display and post-reconnection synchronization guidance provided?
- Verification: Are real-time change notifications not excessive enough to cause notification fatigue?
- Affected files: logic_rules.md (feedback logic), structure_spec.md (screen state matrix)

## Case 6: Comprehensive Accessibility Improvement

- Full application of WCAG 2.1 AA or above to a previously accessibility-deficient interface
- Verification: Is keyboard access available for all interactive elements, and is the tab order logical?
- Verification: Are focus traps and focus restoration applied to all modals/overlays?
- Verification: Are ARIA live regions applied to dynamic content changes?
- Verification: Are appropriate ARIA roles/states assigned to custom components?
- Verification: Are keyboard alternatives provided for special interactions like drag-and-drop?
- Verification: Are extension mechanisms provided for features with time limits (timeouts)?
- Affected files: dependency_rules.md (accessibility–interaction dependency), logic_rules.md (accessible interaction logic)

## Case 7: Dashboard/Analytics Screen Addition

- Adding data dashboards/analytics screens to an existing CRUD interface
- Verification: Is the information hierarchy (which metrics are most important) defined for the dashboard?
- Verification: Are chart/graph interactions (hover info, drill-down, filter integration) designed?
- Verification: Is the responsive behavior of the dashboard (chart rearrangement/simplification on mobile) defined?
- Verification: When data loading times are long, are loading states displayed independently per chart/widget?
- Verification: Are no-data/error states defined per chart/widget? (whole dashboard error vs individual widget error distinction)
- Affected files: structure_spec.md (data display system, screen states), logic_rules.md (data display logic)

## Case 8: Internationalization (i18n) Extension

- Extending from a single-language interface to multi-language support
- Verification: Does the layout flexibly accommodate text expansion (length changes from translation — German +30~40%, Chinese -30%)?
- Verification: For RTL (right-to-left) languages, are layout, icon direction, and progress indicators mirrored?
- Verification: Do date/time/number/currency input fields accept regional formats?
- Verification: Are navigation labels still contained within their space after translation? (Longer translations may cause truncation/wrapping)
- Verification: Are all user-facing texts (error messages, empty state guidance, CTA labels) included in translation scope?
- Affected files: structure_spec.md (form structure, responsive transitions), logic_rules.md (navigation logic, form design logic)

## Related Documents
- structure_spec.md — Navigation structure, screen state matrix, feedback matrix, responsive transitions
- dependency_rules.md — Information architecture–navigation, action–feedback, form–validation, accessibility dependencies
- logic_rules.md — Navigation/form/feedback/modal/accessibility/data display logic
