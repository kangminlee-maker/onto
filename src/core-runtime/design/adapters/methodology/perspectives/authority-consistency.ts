/**
 * Authority-Consistency Perspective.
 *
 * Checks whether a design document (or trajectory) maintains
 * consistency with the project's authority hierarchy.
 *
 * Failure modes this perspective detects:
 * 1. Self-contradiction: a section contradicts another section
 *    within the same document.
 * 2. Authority violation: a document overrides or conflicts with
 *    a higher-authority source without explicit justification.
 * 3. Ghost axis: a concept is declared removed/derived-only but
 *    operative prose still treats it as an independent field.
 */

export interface AuthorityViolation {
  id: string;
  type: "self-contradiction" | "authority-violation" | "ghost-axis";
  severity: "high" | "medium" | "low";
  source_section: string;
  conflicting_section: string;
  summary: string;
  recommendation: string;
}

export interface AuthorityConsistencyInput {
  /** Sections of the document being analyzed. */
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  /** Authority references this document must respect. */
  authority_refs: Array<{
    source: string;
    rank: number;
    relevant_rules: string[];
  }>;
}

export interface AuthorityConsistencyResult {
  violations: AuthorityViolation[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  passed: boolean;
}

/**
 * Analyze a design document for authority consistency.
 *
 * Current implementation: structural analysis only.
 * LLM-assisted deep analysis is a future extension.
 */
export function checkAuthorityConsistency(
  input: AuthorityConsistencyInput,
): AuthorityConsistencyResult {
  const violations: AuthorityViolation[] = [];

  // Phase 1: detect ghost axes —
  // sections that declare a concept removed/derived but still reference it operatively
  for (const section of input.sections) {
    const declaredRemoved = extractRemovedDeclarations(section.content);
    for (const other of input.sections) {
      if (other.id === section.id) continue;
      for (const removed of declaredRemoved) {
        if (hasOperativeUsage(other.content, removed.term)) {
          violations.push({
            id: `GHOST-${removed.term}-${other.id}`,
            type: "ghost-axis",
            severity: "high",
            source_section: section.id,
            conflicting_section: other.id,
            summary: `"${removed.term}" is declared ${removed.declaration} in ${section.id} but used operatively in ${other.id}`,
            recommendation: `Remove operative usage of "${removed.term}" from ${other.id}, or revoke the declaration in ${section.id}`,
          });
        }
      }
    }
  }

  const high = violations.filter((v) => v.severity === "high").length;
  const medium = violations.filter((v) => v.severity === "medium").length;
  const low = violations.filter((v) => v.severity === "low").length;

  return {
    violations,
    summary: { total: violations.length, high, medium, low },
    passed: high === 0,
  };
}

// ─── Helpers ───

interface RemovedDeclaration {
  term: string;
  declaration: string; // e.g., "removed", "derived-only", "deprecated"
}

const REMOVAL_PATTERNS = [
  /(?:제거|삭제|deprecated|removed)\s*[:：]?\s*[`"]?(\w[\w_-]*)[`"]?/gi,
  /[`"]?(\w[\w_-]*)[`"]?\s*(?:를|을|은|는)\s*(?:제거|삭제)/gi,
  /[`"]?(\w[\w_-]*)[`"]?\s*(?:is|are)\s+(?:removed|deprecated|derived.only)/gi,
  // Korean pattern: "X는 derive-only 축" / "X를 ... 취급하지 않는다"
  /[`"]?(\w[\w_-]*)[`"]?\s*(?:는|은)\s*derive[- ]only/gi,
  /[`"]?(\w[\w_-]*)[`"]?\s*(?:를|을)\s*(?:.*?)취급하지\s*않/gi,
];

function extractRemovedDeclarations(content: string): RemovedDeclaration[] {
  const results: RemovedDeclaration[] = [];
  for (const pattern of REMOVAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        results.push({ term: match[1], declaration: "removed" });
      }
    }
  }
  return results;
}

function hasOperativeUsage(content: string, term: string): boolean {
  // Simple heuristic: the term appears outside of declaration/removal context
  const termRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
  const matches = content.match(termRegex);
  if (!matches || matches.length === 0) return false;

  // Check if any occurrence is NOT in a removal/declaration context
  const lines = content.split("\n");
  for (const line of lines) {
    if (!termRegex.test(line)) continue;
    // Reset lastIndex
    termRegex.lastIndex = 0;
    // Skip lines that are themselves declarations of removal
    const isDeclaration = REMOVAL_PATTERNS.some((p) => {
      const r = new RegExp(p.source, p.flags);
      return r.test(line);
    });
    if (!isDeclaration) return true;
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
