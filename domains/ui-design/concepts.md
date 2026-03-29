---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# UI Design Domain — Concept Dictionary and Interpretation Rules

## Usability Principle Core Terms

- Usability = the effectiveness, efficiency, and satisfaction with which users can achieve specific goals using an interface. ISO 9241-11 definition
- Affordance = a property of an object that suggests possible actions to the user. The raised appearance of a button suggests "it can be pressed." Proposed by Gibson and applied to UI by Norman
- Signifier = an explicit cue that communicates affordance to the user. Underlined text is a signifier for "clickable." Affordance is the actual possibility; signifier is the indication of it
- Mental Model = the understanding model that users construct in their minds about how a system works. The easier the interface's conceptual model matches the user's mental model, the easier it is to use
- Cognitive Load = the information processing demand placed on working memory during task performance. Divided into intrinsic (task complexity itself), extraneous (caused by unnecessary design), and germane (contributing to learning) load
- Progressive Disclosure = a strategy of revealing information gradually according to user needs rather than displaying everything at once. A core technique for managing cognitive load
- Discoverability = the degree to which users can find interface features and how to operate them on their own. Hidden features have zero discoverability

## Navigation Core Terms

- Information Architecture (IA) = the design of content organization, classification, labeling, and navigation systems. The backbone of UI design
- Global Navigation = the top-level navigation consistently accessible throughout the entire site/app. Top bar, sidebar, etc.
- Local Navigation = sub-navigation within a specific section. Tabs, segment controls, submenus
- Breadcrumb = secondary navigation showing the hierarchical path to the current location. Supports location awareness and upward navigation in deep hierarchies
- Wayfinding = the process by which users recognize their current location, find their destination, and determine the path. Must be able to answer three questions: "Where am I?", "Where can I go?", "How do I get there?"
- Deep Linking = a URL or path that allows direct access to a specific screen or state within an app/site

## Forms and Input Core Terms

- Inline Validation = a method of checking validity and providing feedback immediately while the user is typing or when leaving the field (on blur)
- Error Message = guidance displayed when validation fails. Must include 3 elements: (1) what went wrong, (2) why it is wrong, (3) how to fix it
- Placeholder = hint text displayed inside an input field. Since it disappears on input, it cannot replace a label. Used only as supplementary guidance
- Input Mask = an input aid that automatically applies a specific format such as phone numbers or dates. Prevents errors by enforcing format
- Default Value = a pre-filled value without user input. Setting the most common choice as default improves input efficiency
- Multi-step Form = a long form divided into logical steps. Requires step indicators and previous/next navigation for each step

## Feedback and Status Core Terms

- Toast = a non-blocking notification that appears temporarily and then disappears. Conveys results without interrupting user actions. Must provide auto-dismiss time and manual close
- Notification = an informational message delivered to the user. Classified by urgency (urgent/informational) and persistence (persistent/transient)
- Skeleton Screen = a technique that previews the outline of the final layout while content is loading. Reduces perceived loading time compared to spinners
- Optimistic Update = a technique that updates the UI before waiting for server response. Requires rollback on failure, so rollback UX must also be designed
- Empty State = the state of a screen with no content. First use (zero state), no data, and no search results each require different guidance
- Dead End = a state where the user cannot take any next action. An error page without a recovery path is a dead end

## Action Guidance Core Terms

- CTA (Call to Action) = a UI element that guides the user to take a specific action. One primary CTA per screen must be clear
- Primary Action = the action that achieves the screen's core purpose. Must be visually the most prominent
- Secondary Action = an alternative action other than the primary. Visually less prominent than the primary action
- Destructive Action = an action difficult to undo (deletion, account cancellation, etc.). Confirmation is mandatory
- Confirmation = a pattern that re-verifies user intent before executing a destructive action. In the form of "Are you sure you want to delete?" Frequent use causes confirmation fatigue, leading to being ignored
- Undo = the ability to reverse an action after execution. Provides a better user experience than confirmation dialogs — shows the result of the action first, then allows reversal if needed

## Modal and Overlay Core Terms

- Modal Dialog = an overlay window that prevents interaction with the background until the user closes it. Overuse continuously blocks user flow and causes frustration
- Focus Trap = a technique that keeps keyboard focus cycling within a modal so it does not escape to the background. An accessibility requirement
- Popover = a floating UI that appears near a trigger element. Unlike modals, it does not block background interaction
- Bottom Sheet = a panel that slides up from the bottom of the screen. Commonly used as a modal alternative on mobile. Typically closed with a swipe-down gesture
- Drawer = a panel that slides out from the side of the screen. Used for navigation or detailed information display

## Data Display Core Terms

- Pagination = a method of displaying data in fixed-size pages. Enables understanding of total data volume and easy access to specific positions
- Infinite Scroll = a method that automatically loads next data on scroll. Suitable for browsing, but difficult to revisit specific positions and access the footer
- Sorting = rearranging data by a specific criterion. The current sort criterion and direction must be visually indicated
- Filtering = displaying only data matching conditions. The number of active filters, filter reset mechanism, and number of filtered results must be displayed
- Card Pattern = a pattern that groups related information into visual containers (cards). High scannability and flexible grid placement

## Accessible Interaction Core Terms

- Tab Order = the order in which focus moves via the keyboard Tab key. DOM order and visual order must match. Changing only visual order with CSS causes tab order mismatch
- ARIA (Accessible Rich Internet Applications) = WAI-ARIA, a W3C standard for ensuring accessibility of dynamic web content. Adds roles, properties, and states to HTML elements
- Live Region = an ARIA region that notifies screen readers of dynamically changing content. aria-live="polite" (notification after current reading completes), aria-live="assertive" (immediate notification)
- Skip Link = a link that allows keyboard users to skip repetitive navigation and jump directly to the main content
- Screen Reader = an assistive technology that reads screen text and UI elements aloud. VoiceOver (Apple), NVDA/JAWS (Windows), TalkBack (Android)

## Homonyms Requiring Attention

- "state": UI component state (hover/active/disabled) != app state (application state, data state) != server state (HTTP response). In UI design, "state" primarily means the visual/interaction state of a component
- "modal": modal dialog (UI pattern) != modal interaction (state where user cannot perform other tasks). Modal interactions exist without modal dialogs (e.g., blocking other edits during inline editing)
- "navigation": information-architectural navigation (menus/tabs) != screen-to-screen movement (routing/navigation) != browser navigation (back/forward)
- "form": UI form (input screen) != HTML form element != form state management (libraries like React Hook Form). This domain covers the design patterns of UI forms
- "layout": page layout (visual arrangement) != information architecture (logical arrangement of content). In this domain, "layout" primarily refers to the intent and patterns of content placement
- "responsive": responsive layout (visual-design jurisdiction, grid transformation) != responsive UI adaptation (this domain's jurisdiction, component pattern transitions and content priority decisions)
- "feedback": system feedback (UI state communication) != user feedback (collecting user opinions) != haptic feedback
- "pattern": UI pattern (recurring design solutions) != design pattern (software design patterns) != visual pattern (visual repetition in visual-design)

## Interpretation Principles

- Users come to achieve goals, not to learn the interface. The UI is a means to achieve goals, not an end in itself
- The principle is to match the interface to the user's mental model. Exposing the system's technical structure directly conflicts with the user's mental model
- Errors are not the user's fault but the interface's failure to prevent them. Error messages must not blame the user ("Invalid input" → "This field only accepts numbers")
- Consistency reduces learning costs. The same action must produce the same result for users to predict outcomes. However, contextual appropriateness may take precedence over consistency, in which case the deviation reason must be stated
- The "3-click rule" is not an absolute standard. In practice, clarity at each step and information scent have a greater impact on user success than the number of clicks
- Modals block user flow. If a non-modal approach (inline expansion, panel, toast) can solve the problem, the principle is to not use a modal
- Fitts's Law: Frequently used actions should be large and close; destructive actions should be placed far from primary actions. Placing the delete button next to the confirm button increases misclick risk
- Placeholders cannot replace labels. Placeholders disappear on input, making the field's purpose unrecognizable after input

## Related Documents
- domain_scope.md — Domain definition where these terms are used
- logic_rules.md — Rules related to navigation, forms, feedback, accessibility
- structure_spec.md — UI design structure-related rules
