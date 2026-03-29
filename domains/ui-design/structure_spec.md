---
version: 1
last_updated: "2026-03-29"
source: setup-domains
status: established
---

# UI Design Domain — Structure Specification

## UI Design Required Elements

- **Navigation Structure**: Information architecture (IA), global/local/secondary navigation, search, wayfinding
- **Input System**: Form structure, input type patterns, validation, input aids
- **Feedback System**: System feedback (success/failure/warning/info), loading states, notifications/toasts
- **State System**: Empty states, error states, loading states, onboarding states — all states beyond the happy path
- **Action Guidance System**: CTA hierarchy, destructive action protection, undo patterns
- **Data Display System**: Lists/tables/cards/grids, sorting/filtering, pagination
- **Accessible Interaction**: Keyboard navigation, ARIA, screen reader support, time limit management

## Required Relationships

- Every user action must have a corresponding system feedback defined (action–feedback completeness)
- Every asynchronous operation must have loading/success/failure — 3 states defined (async state completeness)
- Every input field must have validation rules and error messages defined (input–validation completeness)
- Every data display must have an empty state defined (empty state completeness)
- Every error state must include a recovery path (error recovery completeness)
- Every interactive element must be accessible by keyboard (keyboard accessibility)

## Screen State Matrix

State list applied to all screens/components:

| State | Description | Required Elements |
|-------|------------|-------------------|
| Ideal | Sufficient data, normal operation | Core content, primary action |
| First-use (Zero) | No data yet | Guidance message, first action CTA |
| Partial Data | Only some data exists | Missing area guidance, completion prompts |
| Loading | Data request in progress | Skeleton/spinner, estimated time display |
| Error | Request failed | Error cause, recovery action (retry, etc.) |
| No Results | No filter/search results | Criteria change guidance, filter reset |
| No Permission | Insufficient access permission | Permission request method, alternative path |
| Offline | No network connection (if applicable) | Cached data display, reconnection guidance |

## Navigation Structure Patterns

| Pattern | Suitable For | Not Suitable For |
|---------|-------------|-----------------|
| Top Navigation (horizontal) | 5~7 main sections or fewer, desktop-focused | Many sections and mobile-focused |
| Side Navigation (vertical) | Many sections or deep hierarchy, admin tools | Mobile environment, content width is important |
| Bottom Navigation | Mobile, 3~5 core sections | More than 5 sections, desktop |
| Tabs (horizontal/segment) | 2~5 sub-views within the same context | Many tabs or weak inter-tab relationship |
| Breadcrumbs | Hierarchy 3 levels or deeper, upward navigation needed | Shallow hierarchy of 1~2 levels |
| Hamburger Menu | Secondary navigation, space constraints | Core navigation (low discoverability) |

## Feedback Type–Representation Matrix

| Feedback Type | Representation Pattern | Persistence | Position |
|--------------|----------------------|-------------|----------|
| Action Success | Toast | Transient (3~5 seconds) | Top or bottom of screen |
| Action Failure | Inline error + banner | Persistent until cause resolved | Near the relevant field + top of form |
| System Warning | Banner | Persistent until user acknowledgment | Top of screen |
| Info Notification | Toast or notification center | Transient or until marked as read | Top of screen or notification area |
| Loading (short) | Spinner | Until completion | At action trigger location |
| Loading (long) | Skeleton / progress bar | Until completion | Content area |
| Destructive Action Result | Undo toast or post-confirmation success message | Until undo time expires | Bottom of screen |

## Form Structure Principles

- Field placement order: Start with easiest/fastest fields → then complex/sensitive fields. Giving a sense of completion early prevents abandonment
- Single-column layout is the principle. Two-column forms complicate the gaze path and increase field omission risk. Exception: clear pairs such as first/last name, city/district
- Label position: Top-aligned (above field) has the fastest completion time. Left-aligned is easy to scan but increases completion time
- Input field width should reflect expected input length. A full-width field for a 5-digit postal code confuses users into thinking "should I enter more?"
- Submit button labels must be specific. Instead of "Submit," use "Create Account," "Place Order," etc. to specify the action result

## Responsive Component Transition Rules

| Desktop Pattern | Mobile Transition | Transition Criteria |
|----------------|------------------|-------------------|
| Data Table | Card list or core columns only | Number of columns × minimum column width > viewport |
| Side Navigation | Hamburger menu or bottom navigation | Viewport 768px or below |
| Horizontal Tabs (5+) | Scrollable tabs or dropdown | Total tab width > viewport |
| Multi-column Layout | Single-column stack | Viewport 768px or below |
| Modal Dialog | Full screen or bottom sheet | Modal width > 90% of viewport |
| Hover Tooltip | Tap popover or inline text | Touch environment detected |

## Domain Boundary Management

- The UI design domain covers "the structure through which the interface communicates with users"
- Visual expression (colors, typefaces, icon styles, visual hierarchy) falls under the visual-design domain. This domain focuses on "where to place what and how it responds"
- UX research (user studies, usability testing, personas) is a separate concern. Research results can be input to UI design, but the methodology itself is not under this domain's jurisdiction
- Frontend implementation (React components, CSS, state management) falls under the software-engineering domain. This domain provides interaction specifications that serve as input for implementation
- Content writing (UX writing, microcopy) overlaps with this domain, but text content itself is a separate concern. This domain covers the placement, timing, and structure of text

## Isolated Node Prohibition

- Async operations without loading/failure states defined → warning (state undefined)
- Data-displaying screens without empty states defined → warning (empty state absence)
- Error states without recovery paths → warning (dead end)
- Input fields without validation rules → warning (validation absence)
- Interactive elements not accessible by keyboard → warning (accessibility violation)
- Navigation paths from which return is impossible → warning (return path absence)
- Destructive actions without confirmation/undo → warning (protection absence)
- UI patterns not in the design system/pattern library → warning (out-of-system pattern)

## Related Documents
- concepts.md — Usability, navigation, form, feedback, modal, accessibility term definitions
- dependency_rules.md — Information architecture–navigation, action–feedback, form–validation, modal–focus dependency rules
- competency_qs.md — Structure-related verification questions
