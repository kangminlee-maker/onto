/**
 * Citation audit — Phase 3-4 (A5), fabrication post-flight detection.
 *
 * # What this module is
 *
 * Given a synthesize output and the raw text of participating lens outputs,
 * extracts "significant quoted strings" from the synthesize output and checks
 * whether each one appears as a substring of AT LEAST ONE lens output. Quotes
 * that match nothing are flagged as potential fabrications.
 *
 * # Why it exists
 *
 * Phase 3-4 A3 benchmark (2026-04-17) demonstrated that inline mode + path-only
 * packet caused Qwen3-30B-A3B to emit a quoted axiology finding
 * (`"Naming alignment between value, activity, and concept is not yet resolved"`)
 * that grep returned 0 matches for across all three lens outputs. The model
 * hallucinated a citation to support its deliberation. A4 (PR #74) blocks the
 * known precondition (`Tools: required` + inline) at executor entry, but the
 * audit here is a **defense-in-depth** layer that catches fabrications from:
 *   - packets that don't declare `Tools: required`
 *   - partially-inlined packets where some lens content is embedded and some is
 *     referenced by path
 *   - native-mode runs where the model read a file but still made up a quote
 *   - future prompt regressions that could reintroduce fabrication
 *
 * # What it does NOT do
 *
 * - It does not block execution. The audit is **warning-only** per the A5
 *   design: an unmatched quote is a suspicion, not a proof. Some legitimate
 *   patterns (cross-lens meta-phrases, paraphrased citations, quoted file
 *   names that aren't in any lens body) produce false positives.
 * - It does not parse semantic meaning. Only literal substring matching.
 * - It does not audit LENS outputs. Lens outputs don't cite each other; they
 *   cite the review target. A separate audit layer (future work) could check
 *   lens-to-target citations.
 *
 * # Grammar
 *
 * Quotes are extracted from:
 *   - `"..."` — straight double-quoted strings
 *   - `` `...` `` — backtick-quoted (markdown code spans)
 *
 * Strings shorter than `minQuoteLength` (default 20) are skipped as noise
 * (e.g. `"none"`, `"performed"`, `` `file.ts` ``). The threshold is tunable to
 * trade precision (short phrases match trivially) for recall (important short
 * phrases slip through).
 */

const DEFAULT_MIN_QUOTE_LENGTH = 20;

export interface CitationAuditResult {
  /** Total number of significant quotes extracted from the synthesize output. */
  quotes_checked: number;
  /**
   * Quotes that did NOT substring-match any participating lens output.
   * A non-empty array is a fabrication WARNING — callers should log it and
   * surface to operators, but MUST NOT fail the executor on audit alone.
   */
  quotes_unmatched: string[];
  /** Configured threshold used for this audit run. */
  min_quote_length: number;
}

export interface CitationAuditOptions {
  /** Minimum quoted string length to audit. Default 20. */
  minQuoteLength?: number;
}

/**
 * Extract significant quoted strings from free-form markdown text.
 *
 * De-duplicates identical quotes so the audit doesn't double-count a phrase
 * the synthesize author repeated across multiple sections.
 */
export function extractSignificantQuotes(
  text: string,
  options?: CitationAuditOptions,
): string[] {
  const min = options?.minQuoteLength ?? DEFAULT_MIN_QUOTE_LENGTH;
  const found: string[] = [];

  // Straight double-quoted strings. Non-greedy body so we don't absorb across
  // paragraph boundaries that the model might have joined. Allow newlines
  // inside a quote (multiline citations happen) but not more than one.
  const doubleRe = /"([^"\n]+(?:\n[^"\n]+)?)"/g;
  for (const m of text.matchAll(doubleRe)) {
    const body = (m[1] ?? "").trim();
    if (body.length >= min) found.push(body);
  }

  // Backtick code spans. Single-line only — markdown code fences (```...```)
  // are multi-line but are handled by a separate capture below. We skip the
  // fence case to avoid matching code samples.
  const backtickRe = /`([^`\n]+)`/g;
  for (const m of text.matchAll(backtickRe)) {
    const body = (m[1] ?? "").trim();
    if (body.length >= min) found.push(body);
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const q of found) {
    if (!seen.has(q)) {
      seen.add(q);
      deduped.push(q);
    }
  }
  return deduped;
}

/**
 * Run citation audit: extract significant quotes from synthesize output, then
 * for each quote check whether it appears as a substring of any lens content.
 */
export function auditCitations(
  synthesizeText: string,
  lensContents: readonly string[],
  options?: CitationAuditOptions,
): CitationAuditResult {
  const min = options?.minQuoteLength ?? DEFAULT_MIN_QUOTE_LENGTH;
  const quotes = extractSignificantQuotes(synthesizeText, { minQuoteLength: min });
  const unmatched: string[] = [];
  for (const q of quotes) {
    const isInSomeLens = lensContents.some((content) => content.includes(q));
    if (!isInSomeLens) unmatched.push(q);
  }
  return {
    quotes_checked: quotes.length,
    quotes_unmatched: unmatched,
    min_quote_length: min,
  };
}
