/**
 * Prompt section renderers for Phase 2 — §1.6 Newly Learned + §1.7 Event Markers.
 *
 * Injected into lens prompt packets when extract mode is shadow or active.
 * CON-4 해소: Phase 2 배포 시 주입 시작.
 */

/**
 * §1.6: Newly Learned prompt instructions.
 * Tells the LLM how to output new learnings in structured format.
 */
export function renderNewlyLearnedInstructions(
  sessionDomain: string | null,
): string {
  const domainExample =
    sessionDomain && sessionDomain !== "none" && sessionDomain !== "@-"
      ? `domain/${sessionDomain}`
      : "domain/{name}";

  return `
## Learning Extraction

After completing your review, include a "### Newly Learned" section at the end of your output.

### Newly Learned
- [{fact|judgment}] [methodology|${domainExample}]+ [{guardrail|foundation|convention}]? {content} [impact:{high|normal}]

Rules:
- type is required: fact (objective) or judgment (subjective assessment)
- applicability: at least one tag. Use [methodology] for cross-domain learnings, [${domainExample}] for domain-specific
- role is optional: [guardrail] for safety/correctness rules, [foundation] for core principles, [convention] for style/naming
- For guardrail items, include: **Situation**: ... **Result**: ... **Corrective action**: ...
- impact: [impact:high] for critical learnings, [impact:normal] for standard
- source metadata is automatically added by the system. Do NOT write (source: ...) yourself
- If you have no new learnings: write "- none"

PROHIBITION: Do NOT write to learning files directly.
Write learnings ONLY in the ### Newly Learned section of your output.
The extraction pipeline will process and store them.
Do NOT use the Write tool on any file under .onto/learnings/.`;
}

/**
 * §1.7: Event Marker prompt instructions.
 * Tells the LLM how to report problematic applied learnings.
 */
export function renderEventMarkerInstructions(): string {
  return `
### Applied Learnings — Event Markers

If during your review you applied a prior learning and found it to be harmful or incorrect, report it here:
- marker: applied-then-found-invalid
- learning_excerpt: <identifiable excerpt from the learning>
- reason: <why the learning was harmful or incorrect>

If no markers to report, omit this section entirely.`;
}
