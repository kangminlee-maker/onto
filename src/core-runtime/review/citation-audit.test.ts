import { describe, it, expect } from "vitest";
import { auditCitations, extractSignificantQuotes } from "./citation-audit.js";

describe("extractSignificantQuotes", () => {
  it("extracts double-quoted strings above threshold", () => {
    const text = 'The lens said "Top-level value lacks operational backing" in evidence.';
    const quotes = extractSignificantQuotes(text);
    expect(quotes).toContain("Top-level value lacks operational backing");
  });

  it("extracts backtick code spans above threshold", () => {
    const text =
      "The evidence is at `src/core-runtime/scope-runtime/state-machine.ts` in the module.";
    const quotes = extractSignificantQuotes(text);
    expect(quotes).toContain("src/core-runtime/scope-runtime/state-machine.ts");
  });

  it("skips quotes below threshold (default 20)", () => {
    const text = 'The status is "performed" for now, file `x.ts`.';
    const quotes = extractSignificantQuotes(text);
    expect(quotes).not.toContain("performed");
    expect(quotes).not.toContain("x.ts");
  });

  it("respects a custom threshold", () => {
    const text = 'File `x.ts` matters.';
    expect(extractSignificantQuotes(text, { minQuoteLength: 3 })).toContain("x.ts");
  });

  it("de-duplicates identical quotes", () => {
    const text =
      '"Declaration without operational backing" appears here and "Declaration without operational backing" again.';
    const quotes = extractSignificantQuotes(text);
    expect(quotes.filter((q) => q === "Declaration without operational backing").length).toBe(1);
  });

  it("handles multi-line quote bodies (single newline tolerated)", () => {
    const text = '"Line one of a long citation\nthat wraps across one linebreak"';
    const quotes = extractSignificantQuotes(text);
    expect(quotes[0]?.includes("Line one")).toBe(true);
  });

  it("does not extract from triple-backtick code fences as code spans", () => {
    const text = "Before\n```ts\nconst x = 1;\n```\nAfter";
    const quotes = extractSignificantQuotes(text);
    expect(quotes.length).toBe(0);
  });

  it("returns empty array when no quoted strings present", () => {
    const text = "Pure prose with no quotations or backtick spans above threshold.";
    expect(extractSignificantQuotes(text)).toEqual([]);
  });
});

describe("auditCitations", () => {
  it("flags a quote that does not appear in any lens (the A3 fabrication case)", () => {
    const synthesize = [
      "### Disagreement",
      "- Axiology said \"Naming alignment between value, activity, and concept is not yet resolved\".",
    ].join("\n");
    const axiologyLens =
      "Findings: Top-level value 시간/비용 최소화 lacks operational backing in executor.";
    const depLens = "Authority chain integrity circular between core-lexicon.yaml and design-principles/.";
    const structLens = "Naming alignment resolved as of W-A-77.";

    const result = auditCitations(synthesize, [axiologyLens, depLens, structLens]);
    expect(result.quotes_checked).toBe(1);
    expect(result.quotes_unmatched).toContain(
      "Naming alignment between value, activity, and concept is not yet resolved",
    );
  });

  it("passes a quote that substring-matches any lens", () => {
    const synthesize =
      'The evidence cites "Top-level value 시간/비용 최소화 lacks operational backing" in axiology.';
    const lensContent =
      "Findings: Top-level value 시간/비용 최소화 lacks operational backing in executor selection.";
    const result = auditCitations(synthesize, [lensContent]);
    expect(result.quotes_checked).toBe(1);
    expect(result.quotes_unmatched).toEqual([]);
  });

  it("matches against any lens (disjunction)", () => {
    const synthesize = 'cite "unique phrase of sufficient length here"';
    const lensA = "not related content at all";
    const lensB = "some prose containing unique phrase of sufficient length here inside it";
    const result = auditCitations(synthesize, [lensA, lensB]);
    expect(result.quotes_unmatched).toEqual([]);
  });

  it("reports empty unmatched list when no quotes present", () => {
    const synthesize = "Pure synthesis prose.";
    const result = auditCitations(synthesize, ["some lens content"]);
    expect(result.quotes_checked).toBe(0);
    expect(result.quotes_unmatched).toEqual([]);
  });

  it("includes min_quote_length in result for traceability", () => {
    const result = auditCitations("", [], { minQuoteLength: 30 });
    expect(result.min_quote_length).toBe(30);
  });

  it("uses default threshold 20 when options omitted", () => {
    const result = auditCitations("", []);
    expect(result.min_quote_length).toBe(20);
  });

  it("handles empty lens pool: every significant quote becomes unmatched", () => {
    const synthesize = 'cite "this quote has more than twenty chars in it"';
    const result = auditCitations(synthesize, []);
    expect(result.quotes_unmatched).toHaveLength(1);
  });
});
