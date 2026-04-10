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

  // Phase 2: detect authority violations —
  // sections that contradict rules from higher-authority sources
  for (const section of input.sections) {
    const negations = extractNegations(section.content);
    for (const ref of input.authority_refs) {
      for (const rule of ref.relevant_rules) {
        for (const neg of negations) {
          if (negationContradictsRule(neg, rule)) {
            const vid = `AUTH-${section.id}-${ref.source}`;
            // Avoid duplicate ids for same section+source pair
            const exists = violations.some((v) => v.id === vid);
            if (!exists) {
              violations.push({
                id: vid,
                type: "authority-violation",
                severity: "high",
                source_section: section.id,
                conflicting_section: ref.source,
                summary: `${section.id} declares "${neg.statement}" which contradicts authority rule "${rule}" from ${ref.source} (rank ${ref.rank})`,
                recommendation: `Align ${section.id} with ${ref.source} or provide explicit justification for the override`,
              });
            }
          }
        }
      }
    }
  }

  // Phase 3: detect self-contradictions —
  // pairs of sections where one negates what the other affirms about the same topic
  for (const sA of input.sections) {
    const negationsA = extractNegations(sA.content);
    for (const sB of input.sections) {
      if (sA.id === sB.id) continue;
      // Only process each unordered pair once: skip if sB.id < sA.id
      if (sB.id <= sA.id) continue;
      for (const neg of negationsA) {
        if (hasAffirmation(sB.content, neg)) {
          const vid = `SELF-${sA.id}-${sB.id}-${neg.topic}`;
          const exists = violations.some((v) => v.id === vid);
          if (!exists) {
            violations.push({
              id: vid,
              type: "self-contradiction",
              severity: "medium",
              source_section: sA.id,
              conflicting_section: sB.id,
              summary: `${sA.id} negates "${neg.topic}" ("${neg.statement}") but ${sB.id} affirms it`,
              recommendation: `Reconcile the conflicting statements about "${neg.topic}" between ${sA.id} and ${sB.id}`,
            });
          }
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

// ─── Authority-violation & Self-contradiction Helpers ───

/** Strip common Korean postpositions/particles from a word. */
function stripKoreanParticles(word: string): string {
  // Order matters: longer suffixes first
  return word.replace(
    /(?:에서|으로|이며|에게|부터|까지|처럼|만큼|이라|라고|이고|하고|과는|와는|은|는|이|가|을|를|의|에|도|로|와|과|고)$/,
    "",
  );
}

/** Strip Korean verb/adjective endings to extract stem. */
function stripKoreanVerbEndings(word: string): string {
  return word.replace(
    /(?:하지|하는|한다|하고|하며|해야|합니다|합니|했다|해서|하여|된다|되지|않는다|않다)$/,
    "",
  );
}

interface Negation {
  /** The topic/subject being negated (e.g., "학습", "learn") */
  topic: string;
  /** The full negation statement for display */
  statement: string;
  /** Keywords extracted from the negation for matching (particles stripped) */
  keywords: string[];
}

/**
 * Korean negation patterns:
 *   "X는/은 Y하지 않는다", "X를/을 Y하지 않는다"
 *   "X를/을 차단", "X를/을 금지"
 *
 * English negation patterns:
 *   "does not X", "must not X", "cannot X", "X is blocked/prohibited"
 */
const NEGATION_PATTERNS: Array<{ pattern: RegExp; topicGroup: number; keywordGroups: number[] }> = [
  // Korean: "A은/는 B하지 않는다" — topic = A, action keywords = B
  {
    pattern: /([가-힣\w_-]+)(?:은|는)\s+([가-힣\w_-]+(?:을|를)?)\s*(?:저장하지|하지|작성하지|기록하지)\s*않/g,
    topicGroup: 1,
    keywordGroups: [1, 2],
  },
  // Korean: "A를/을 차단/금지"
  {
    pattern: /([가-힣\w_-]+)(?:를|을)\s*(?:차단|금지|거부)/g,
    topicGroup: 1,
    keywordGroups: [1],
  },
  // English: "does not / must not / cannot X"
  {
    pattern: /(\w[\w_-]*)\s+(?:does not|must not|cannot|shall not)\s+(\w[\w_-]*)/gi,
    topicGroup: 1,
    keywordGroups: [1, 2],
  },
];

function extractNegations(content: string): Negation[] {
  const results: Negation[] = [];
  const sentences = content.split(/[.。!\n]+/).filter((s) => s.trim());

  for (const sentence of sentences) {
    for (const { pattern, topicGroup, keywordGroups } of NEGATION_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        const topic = match[topicGroup]?.trim();
        if (!topic) continue;
        const keywords: string[] = [];
        for (const g of keywordGroups) {
          if (match[g]) {
            const raw = match[g].trim();
            keywords.push(raw);
            keywords.push(stripKoreanParticles(raw));
          }
        }
        // Also extract keywords from surrounding context (with particles and verb endings stripped)
        const surroundingWords = sentence
          .replace(/[^가-힣a-zA-Z0-9_-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 1)
          .flatMap((w) => {
            const stripped = stripKoreanParticles(w);
            const stemmed = stripKoreanVerbEndings(w);
            const stemmedStripped = stripKoreanVerbEndings(stripped);
            return [w, stripped, stemmed, stemmedStripped];
          });
        results.push({
          topic,
          statement: sentence.trim(),
          keywords: [...new Set([...keywords, ...surroundingWords].filter((k) => k.length > 0))],
        });
      }
    }
  }
  return results;
}

/**
 * Check if a negation contradicts an authority rule.
 * A contradiction occurs when the negation's topic/keywords overlap
 * significantly with the rule's content, and the rule is affirmative
 * (grants permission or defines capability) while the section denies it.
 */
function negationContradictsRule(neg: Negation, rule: string): boolean {
  // Extract rule words (both raw and particle-stripped)
  const rawRuleWords = rule
    .replace(/[^가-힣a-zA-Z0-9_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const ruleWords = [...new Set(rawRuleWords.flatMap((w) => [w, stripKoreanParticles(w)]).filter((w) => w.length > 0))];

  // The rule must contain affirmative action keywords
  const affirmativePatterns = [
    /write/i, /저장/i, /생성/i, /기록/i, /자동/i, /권한/i, /정의/i,
  ];
  const ruleIsAffirmative = affirmativePatterns.some((p) => p.test(rule));
  if (!ruleIsAffirmative) return false;

  // Count keyword overlap between negation keywords and rule words
  const negKeySet = new Set(neg.keywords.map((k) => k.toLowerCase()));
  let overlap = 0;
  for (const rw of ruleWords) {
    if (negKeySet.has(rw.toLowerCase())) {
      overlap++;
    }
  }

  // Also check if the topic itself appears in the rule (partial match),
  // or if negation keywords intersect with the rule's core concepts
  const strippedTopic = stripKoreanParticles(neg.topic).toLowerCase();
  const topicInRule =
    rule.toLowerCase().includes(strippedTopic) ||
    (strippedTopic.includes("learn") && /learn/i.test(rule)) ||
    (strippedTopic.includes("학습") && /학습|learn|저장/i.test(rule));

  // Require either topic match or significant keyword overlap
  return topicInRule || overlap >= 2;
}

/**
 * Check if content affirms what a negation denies.
 * Used for self-contradiction detection between section pairs.
 */
function hasAffirmation(content: string, neg: Negation): boolean {
  const topicEscaped = escapeRegex(neg.topic);
  const topicRegex = new RegExp(topicEscaped, "gi");

  if (!topicRegex.test(content)) return false;

  // The content should use the topic in an affirmative/operative way
  // (not in another negation)
  const lines = content.split("\n");
  for (const line of lines) {
    const lineTopicRegex = new RegExp(topicEscaped, "gi");
    if (!lineTopicRegex.test(line)) continue;

    // Check this line is NOT itself a negation
    const isNeg = /하지\s*않|차단|금지|does not|must not|cannot|shall not/i.test(line);
    if (isNeg) continue;

    // Affirmative usage patterns
    const affirmativeUsage =
      /실재|직접|참여|사용|결정|생성|저장|기록|적용|소비|pipeline|consumer|write|read|create|apply/i.test(line);
    if (affirmativeUsage) return true;
  }
  return false;
}
