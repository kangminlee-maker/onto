# UI Design Domain — Competency Questions

A list of core questions that this domain's system must be able to answer.

Classification axis: **Verification concern** — Classified by the concern that must be addressed during UI design review.

## Navigation and Information Architecture

- Q1: Does the information architecture (content classification and hierarchy) of {target interface} match the user's mental model?
- Q2: Is global navigation provided consistently, and can users recognize their current location?
- Q3: Is the path for users to reach desired information/functionality clear, and is there sufficient information scent at each step?
- Q4: In deeply hierarchical structures, are breadcrumbs or equivalent secondary navigation provided?
- Q5: For content of sufficient scale requiring search, are the search UI and no-results state designed? (if applicable)

## Forms and Input

- Q6: Are form fields arranged in logical order, with related fields grouped together?
- Q7: Are required fields and optional fields clearly distinguished?
- Q8: Is the validation method (real-time/on-submit) defined, and do error messages include (1) what went wrong, (2) why, and (3) how to fix it?
- Q9: Are input aids (placeholders, help text, input masks, default values) appropriately provided?
- Q10: Are placeholders not substituting for labels?
- Q11: Are long forms divided into logical steps with progress indicators provided? (if applicable)

## Feedback and Status

- Q12: Is system feedback (success/failure/in-progress) defined for all major user actions?
- Q13: Is the loading state representation (spinner/skeleton/progress bar) chosen appropriately for the context?
- Q14: Are recovery paths (retry, alternative guidance) provided for asynchronous operation failures?
- Q15: Do empty states (first use/no data/no search results) each provide different guidance?
- Q16: Do error pages (404, 500, etc.) include recovery paths (home, back, retry)?

## Action Guidance and Decision-Making

- Q17: Is the primary action clearly identified on each screen and visually distinguished from secondary actions?
- Q18: Are destructive actions (delete, cancellation, etc.) provided with a confirmation step or undo?
- Q19: Are there no competing CTAs of equal emphasis on a single screen?
- Q20: Considering Hick's Law, is the number of choices presented at once appropriate? (within 7±2 or categorized)
- Q21: Is the user's next action clear? Are there no dead ends?

## Modals and Overlays

- Q22: Are modals used only when unavoidable? Are modals not overused where inline expansion/panels/toasts could work?
- Q23: Do modals have clear close mechanisms (X button, ESC key, background click)?
- Q24: Is focus trap applied within modals so keyboard focus does not escape to the background?
- Q25: Are there no cases of stacked modals (a modal opening on top of another modal)?

## Data Display

- Q26: Is the data display method (table/list/card/grid) appropriate for the data characteristics and user's browsing pattern?
- Q27: Are the sort criteria and direction visually displayed, and can the user change them?
- Q28: Are the number and content of active filters displayed, and is a full reset mechanism provided?
- Q29: Is the large data browsing method (pagination/infinite scroll/"load more") chosen appropriately for the usage context?

## Responsive UI Adaptation

- Q30: Do component patterns transition appropriately in mobile environments? (e.g., desktop table → mobile card)
- Q31: When the screen shrinks, is information rearranged/reduced according to content priority? (not disappeared)
- Q32: Do touch targets meet a minimum of 44×44px, and are there touch alternatives for hover-dependent interactions?

## Accessible Interaction

- Q33: Can all major features be accessed and operated with keyboard alone?
- Q34: Does the tab order match the visual order and logical order?
- Q35: Is dynamically changing content (notifications, error messages, etc.) communicated to screen readers via ARIA live regions?
- Q36: Are skip links provided to bypass repetitive navigation?
- Q37: Are keyboard/screen reader alternatives provided for complex interactions (drag-and-drop, sliders, etc.)?

## Consistency and Convention

- Q38: Is the same functionality implemented with the same pattern throughout the interface? (internal consistency)
- Q39: Are there no patterns that unnecessarily differ from platform/industry conventions? (external consistency, Jakob's Law)
- Q40: When intentionally deviating from convention, are the reason and learning support measures defined?

## Related Documents
- domain_scope.md — Higher-level definition of the areas covered by these questions
- logic_rules.md — Rules related to navigation/forms/feedback/accessibility/modals
- structure_spec.md — Structure-related rules
