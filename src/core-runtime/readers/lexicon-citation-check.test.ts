import { describe, it, expect } from "vitest";
import {
  checkFileCitations,
  checkMultipleFiles,
  hasRejectViolations,
  type ProvisionalTerm,
} from "./lexicon-citation-check.js";

const TERMS: ProvisionalTerm[] = [
  { term_id: "governance_pipeline", lifecycle_status: "seed" },
  { term_id: "drift_detector", lifecycle_status: "candidate" },
  { term_id: "approval_queue", lifecycle_status: "provisional" },
  { term_id: "review_record", lifecycle_status: "promoted" },
];

describe("lexicon-citation-check", () => {
  // ─── Case 1: warn ───
  it("seed/candidate/provisional term 인용 시 warn 위반을 보고한다", () => {
    const content = [
      "# Design Document",
      "",
      "이 설계는 governance_pipeline 을 기반으로 한다.",
      "drift_detector 가 변경을 감지하면 approval_queue 에 등록된다.",
    ].join("\n");

    const violations = checkFileCitations(
      "design-principles/example.md",
      content,
      TERMS,
      { severity: "warn" },
    );

    expect(violations).toHaveLength(3);
    expect(violations.every((v) => v.severity === "warn")).toBe(true);

    const termIds = violations.map((v) => v.term_id).sort();
    expect(termIds).toEqual(["approval_queue", "drift_detector", "governance_pipeline"]);

    // line 번호 확인
    const seedViolation = violations.find((v) => v.term_id === "governance_pipeline");
    expect(seedViolation!.line).toBe(3);
  });

  // ─── Case 2: reject ───
  it("reject severity 설정 시 reject 위반을 보고한다", () => {
    const content = "drift_detector 를 사용합니다.";

    const violations = checkFileCitations(
      "processes/build.md",
      content,
      TERMS,
      { severity: "reject" },
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]!.severity).toBe("reject");
    expect(hasRejectViolations(violations)).toBe(true);
  });

  // ─── Case 3: authority file bypass ───
  it("authority file (core-lexicon.yaml) 내 참조는 위반으로 보고하지 않는다", () => {
    const content = [
      "provisional_terms:",
      "  governance_pipeline:",
      "    lifecycle_status: seed",
      "  drift_detector:",
      "    lifecycle_status: candidate",
    ].join("\n");

    const violations = checkFileCitations(
      "authority/core-lexicon.yaml",
      content,
      TERMS,
    );

    expect(violations).toEqual([]);
  });

  // ─── promoted term 은 위반이 아님 ───
  it("promoted term 인용은 위반으로 보고하지 않는다", () => {
    const content = "review_record 를 참조한다.";

    const violations = checkFileCitations(
      "processes/review.md",
      content,
      TERMS,
    );

    expect(violations).toEqual([]);
  });

  // ─── 단어 경계 (부분 매칭 방지) ───
  it("term_id 의 부분 매칭은 위반으로 보고하지 않는다", () => {
    // "governance_pipeline_v2" 는 "governance_pipeline" 과 다른 토큰
    const content = "governance_pipeline_v2 는 별개 식별자이다.";

    const violations = checkFileCitations(
      "docs/example.md",
      content,
      TERMS,
    );

    expect(violations).toEqual([]);
  });

  // ─── 복수 파일 검사 ───
  it("checkMultipleFiles 로 복수 파일을 한번에 검사한다", () => {
    const files = [
      { path: "a.md", content: "governance_pipeline 사용" },
      { path: "authority/core-lexicon.yaml", content: "governance_pipeline 정의" },
      { path: "b.ts", content: "drift_detector 참조" },
    ];

    const violations = checkMultipleFiles(files, TERMS);

    // a.md + b.ts = 2건 (core-lexicon.yaml 은 bypass)
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.file).sort()).toEqual(["a.md", "b.ts"]);
  });

  // ─── hasRejectViolations ───
  it("warn 만 있으면 hasRejectViolations 는 false", () => {
    const violations = checkFileCitations(
      "docs/test.md",
      "governance_pipeline 사용",
      TERMS,
      { severity: "warn" },
    );

    expect(hasRejectViolations(violations)).toBe(false);
  });
});
