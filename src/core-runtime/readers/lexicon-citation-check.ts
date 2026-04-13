/**
 * Provisional term 인용 금지 검증 도구 (W-D-02, D0 Bootstrap).
 *
 * core-lexicon.yaml 의 provisional_lifecycle 규칙에 따라,
 * lifecycle_status 가 seed/candidate/provisional 인 term 을
 * authority file 이외의 문서·코드에서 인용하면 warn 또는 reject 한다.
 *
 * authority file (core-lexicon.yaml 자체) 내 참조는 예외 (bypass).
 */

import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parse as yamlParse } from "yaml";

// ─── Types ───

export type Severity = "warn" | "reject";

export interface CitationViolation {
  file: string;
  line: number;
  term_id: string;
  lifecycle_status: string;
  severity: Severity;
  message: string;
}

export interface ProvisionalTerm {
  term_id: string;
  lifecycle_status: string;
}

export interface CheckOptions {
  severity?: Severity;
}

// lifecycle_status 값 중 인용이 금지되는 상태
const CITATION_BLOCKED_STATUSES = new Set(["seed", "candidate", "provisional"]);

// authority file — 이 파일 내 참조는 예외
const AUTHORITY_FILE = "core-lexicon.yaml";

// ─── Lexicon 읽기 ───

/**
 * core-lexicon.yaml 에서 provisional_terms section 의 term 목록을 읽는다.
 * provisional_terms section 이 없으면 빈 배열을 반환한다.
 */
export function loadProvisionalTerms(lexiconPath: string): ProvisionalTerm[] {
  const content = readFileSync(resolve(lexiconPath), "utf-8");
  const data = yamlParse(content) as Record<string, unknown>;

  const provisionalTerms = data["provisional_terms"] as
    | Record<string, { lifecycle_status?: string }>
    | undefined;

  if (!provisionalTerms || typeof provisionalTerms !== "object") {
    return [];
  }

  return Object.entries(provisionalTerms)
    .filter(([_, entry]) => entry && typeof entry === "object" && entry.lifecycle_status)
    .map(([termId, entry]) => ({
      term_id: termId,
      lifecycle_status: entry.lifecycle_status!,
    }));
}

// ─── 검증 ───

/**
 * 단일 파일의 내용에서 provisional term 인용을 검사한다.
 *
 * @param filePath - 검사 대상 파일 경로
 * @param fileContent - 파일 내용 문자열
 * @param terms - provisional term 목록
 * @param options - severity 설정 (기본 warn)
 * @returns 발견된 위반 목록
 */
export function checkFileCitations(
  filePath: string,
  fileContent: string,
  terms: ProvisionalTerm[],
  options: CheckOptions = {},
): CitationViolation[] {
  const severity = options.severity ?? "warn";

  // authority file bypass
  if (basename(filePath) === AUTHORITY_FILE) {
    return [];
  }

  const violations: CitationViolation[] = [];
  const lines = fileContent.split("\n");

  for (const term of terms) {
    if (!CITATION_BLOCKED_STATUSES.has(term.lifecycle_status)) {
      continue;
    }

    // term_id를 단어 경계로 검색 (부분 매칭 방지)
    const pattern = new RegExp(`\\b${escapeRegex(term.term_id)}\\b`, "g");

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i]!)) {
        violations.push({
          file: filePath,
          line: i + 1,
          term_id: term.term_id,
          lifecycle_status: term.lifecycle_status,
          severity,
          message: `provisional term "${term.term_id}" (status: ${term.lifecycle_status}) 인용 금지 — promoted 전이 후 사용 가능`,
        });
      }
      // reset regex lastIndex for next line
      pattern.lastIndex = 0;
    }
  }

  return violations;
}

/**
 * 복수 파일을 검사하고 전체 위반 목록을 반환한다.
 */
export function checkMultipleFiles(
  files: Array<{ path: string; content: string }>,
  terms: ProvisionalTerm[],
  options: CheckOptions = {},
): CitationViolation[] {
  return files.flatMap((f) => checkFileCitations(f.path, f.content, terms, options));
}

/**
 * 위반 목록에 reject severity 가 1건 이상 있으면 true.
 * pre-commit hook 에서 exit code 결정에 사용.
 */
export function hasRejectViolations(violations: CitationViolation[]): boolean {
  return violations.some((v) => v.severity === "reject");
}

// ─── Helpers ───

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
