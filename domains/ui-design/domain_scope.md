# UI Design Domain — Domain Scope Definition

This domain applies when **reviewing** the structure, patterns, and interaction design of user interfaces (UI).
It identifies "what should be there but is missing" based on core principles and patterns of UI design.

> **Boundary with visual-design domain**: visual-design covers the "visual expression system" including color, typography, composition, and branding. This domain covers "the structure through which the interface accommodates user intent and communicates results." Button color and typeface are under visual-design's jurisdiction; where a button is placed, what feedback it provides, and when it is disabled are under this domain's jurisdiction.

## Key Sub-Areas

Classification axis: **UI design concern** — Classified by the design concern that the interface must address.

### Navigation
- **Information Architecture** (required): Content classification and hierarchy, menu structure, sitemap/app map
- **Navigation Patterns** (required): Global navigation (top bar/sidebar), local navigation (tabs/segments), secondary navigation (breadcrumbs/pagination)
- **Navigation Paths** (required): Number and depth of paths for users to reach desired information/functionality. The 3-click rule is a rule of thumb, not an absolute standard, but deeper paths increase abandonment rates
- **Search** (if applicable): Search UI patterns, filters/sorting, autocomplete, no-results state

### Forms and Input
- **Form Structure** (required): Field grouping, logical order, multi-step division, required/optional distinction
- **Input Types** (required): Text, selection (select/radio/checkbox), date/time, file upload, free input vs restricted input
- **Validation** (required): Real-time validation vs on-submit validation, inline error messages, error summary, success feedback
- **Input Aids** (required): Placeholders, help text, input masks, default values, autocomplete

### Feedback and Status
- **System Feedback** (required): Success/failure/warning/info messages, notifications, toasts, banners
- **Loading States** (required): Spinners, skeleton screens, progress bars, optimistic updates
- **Empty States** (required): No data, no search results, first-use state (onboarding) — each requires different guidance
- **Error States** (required): Network errors, permission errors, 404, 500, and other type-specific error pages/states

### Data Display
- **Lists and Tables** (required): List view, table, card view, grid view — selection criteria based on data characteristics
- **Sorting and Filtering** (required): Sort criteria display, active filter display, filter reset, compound filters
- **Pagination** (required): Page numbers, infinite scroll, "load more" button — selection criteria based on data volume and browsing patterns
- **Data Visualization** (if applicable): Chart/graph interactions (hover info, zoom, filter), dashboard composition

### Modals and Overlays
- **Modal Dialogs** (required): Usage criteria (when to use a modal), close mechanisms, focus trap, background interaction blocking
- **Dropdowns/Popovers** (required): Trigger elements, placement, collision avoidance (screen edges), close conditions
- **Bottom Sheets/Drawers** (if applicable): Mobile bottom sheets, side drawers, slide-overs — usage context and close gestures

### Action and Decision
- **CTA Design** (required): Visual and positional distinction between primary actions and secondary actions
- **Destructive Actions** (required): Confirmation patterns for deletion, non-cancelable operations; whether undo is provided
- **Choice and Comparison** (if applicable): Option presentation methods, comparison UI, recommendation/default selection
- **Onboarding** (if applicable): First-use guidance, feature discovery, coach marks, tours

### Responsive UI Adaptation
- **Component Adaptation** (required): Component variations based on screen size — desktop table → mobile card, top bar → bottom navigation, etc.
- **Content Priority** (required): Criteria for what information to keep and what to reduce/hide when screen shrinks
- **Touch vs Pointer** (required): Touch target size (44×44px minimum), touch alternatives for hover-dependent interactions

### Accessible Interaction
- **Keyboard Navigation** (required): Tab order, focus management, keyboard shortcuts, skip links
- **Screen Reader** (required): ARIA roles, states, properties, live regions
- **Cognitive Load Management** (required): Progressive disclosure of information, preventing cognitive overload, consistent pattern usage

## Required Concept Categories

Concept categories that must be addressed in any UI design.

| Category | Description | Risk if Missing |
|----------|------------|----------------|
| Navigation structure | The route system for users to reach desired destinations | Users get lost, increased abandonment |
| Input and validation | User data collection and error prevention/guidance system | Form completion rate decreases, incorrect data collected |
| Feedback system | System for communicating system status and action results | Users cannot know results, anxiety |
| Error/empty state | Guidance and recovery paths for exceptional situations | User abandonment, dead ends |
| Call to action | Distinction and placement of primary and secondary actions | Users do not know what to do next |
| Information density | Amount and composition of information displayed per screen | Cognitive overload when dense, inefficiency when sparse |
| Accessible interaction | Support for keyboard, screen reader, and diverse input methods | User exclusion, legal violations |
| Source of truth | Authoritative standard for interface pattern decisions (UI pattern library, platform guidelines) | Pattern inconsistency proliferation |

## Reference Standards/Frameworks

| Standard/Framework | Application Area | Core Content |
|-------------------|-----------------|--------------|
| Nielsen's 10 Usability Heuristics | Overall UI evaluation | 10 usability principles including system status visibility, consistency, error prevention |
| Fitts's Law | Action guidance/layout | Distance and size to target determine click time. Primary actions should be large and close |
| Hick's Law | Choice/decision-making | Decision time increases logarithmically with number of choices. Limit or categorize choices |
| Miller's Law | Information architecture | Working memory capacity is 7±2 chunks. Information grouping and chunking are needed |
| Jakob's Law | Consistency | Users expect experiences from other sites. Follow conventions; when deviating, state the reason |
| WAI-ARIA | Accessibility | Standard for roles, states, and properties to ensure dynamic UI accessibility |
| WCAG 2.1/2.2 | Accessibility | 4 principles: perceivable, operable, understandable, robust. Accessibility criteria for UI interaction |
| Material Design / HIG | Platform patterns | Platform-specific UI patterns and component guidelines for Android/iOS |

## Bias Detection Criteria

- If 3 or more of the 8 concern areas are not represented at all → **insufficient coverage**
- If patterns in a specific area account for more than 70% of the total → **bias warning**
- If only the happy path is defined and error/empty states are missing → **exception state gap**
- If only desktop UI is defined and mobile adaptation is missing → **responsive absence** (when mobile use is applicable)
- If input UI exists but validation patterns are missing → **validation system absence**
- If asynchronous operations exist but loading/failure states are missing → **status communication absence**
- If only visual patterns exist without keyboard/screen reader support → **accessibility gap**
- If 2 or more core patterns have no designated source of truth → **authority undesignated**
- If 3 or more CTAs of equal emphasis exist on a single screen → **action guidance competition**

## Related Documents
- concepts.md — Term definitions within this scope
- structure_spec.md — UI design structural requirements
- competency_qs.md — Questions this scope must be able to answer
