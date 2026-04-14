import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { classifyReviewPaths } from "./ontology-path-classifier.js";
import type { ReviewLogEntry } from "../readers/review-log.js";

// ─── Test fixtures ───

function makeEntry(overrides: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    session_id: "20260413-aaa00001",
    created_at: "2026-04-13T10:00:00+09:00",
    review_target_refs: ["src/foo.ts"],
    request_text: "mock request",
    review_mode: "full",
    execution_realization: "subagent",
    host_runtime: "codex",
    execution_status: "completed",
    total_duration_ms: 100000,
    lens_count: 3,
    participating_lens_ids: ["logic", "structure", "axiology"],
    degraded_lens_ids: [],
    per_lens_duration: [],
    synthesis_duration_ms: 5000,
    provenance_summary: { runner_wallclock: 3, coordinator_derived: 0, batch_fallback: 0, unknown: 0 },
    ...overrides,
  };
}

// ─── Tests ───

describe("classifyReviewPaths", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = join(tmpdir(), `ontology-path-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpRoot, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
  });

  describe("ontology seat detection", () => {
    it("r- label 부여: project 에 ontology seat 이 없으면 모든 세션이 ontology-absent path", () => {
      const result = classifyReviewPaths(
        [makeEntry(), makeEntry({ session_id: "20260413-aaa00002" })],
        tmpRoot,
      );

      expect(result.ontology_seat_detected).toBe(false);
      expect(result.ontology_seat_paths).toEqual([]);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.every((s) => s.label === "r-")).toBe(true);
    });

    it("r+ label 부여: ontology/ 하위에 code-mapping.yaml 이 있으면 ontology-present 환경", () => {
      const ontoDir = join(tmpRoot, "ontology");
      mkdirSync(ontoDir, { recursive: true });
      writeFileSync(join(ontoDir, "code-mapping.yaml"), "glossary: []\n");

      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.ontology_seat_detected).toBe(true);
      expect(result.ontology_seat_paths).toEqual([join(ontoDir, "code-mapping.yaml")]);
      expect(result.sessions[0]!.label).toBe("r+");
      expect(result.sessions[0]!.ontology_seat_evidence).toEqual([join(ontoDir, "code-mapping.yaml")]);
    });

    it("r+ label 부여: authority/ 하위에 model.yaml 만 있어도 present 로 판정", () => {
      const authDir = join(tmpRoot, "authority");
      mkdirSync(authDir, { recursive: true });
      writeFileSync(join(authDir, "model.yaml"), "entities: []\n");

      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.ontology_seat_detected).toBe(true);
      expect(result.sessions[0]!.label).toBe("r+");
    });

    it("복수 seat 탐지: seat 3종 모두 존재 시 ontology_seat_paths 정렬되어 수집", () => {
      const ontoDir = join(tmpRoot, "ontology");
      mkdirSync(ontoDir, { recursive: true });
      writeFileSync(join(ontoDir, "code-mapping.yaml"), "");
      writeFileSync(join(ontoDir, "behavior.yaml"), "");
      writeFileSync(join(ontoDir, "model.yaml"), "");

      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.ontology_seat_paths).toHaveLength(3);
      // sort() 순서
      expect(result.ontology_seat_paths).toEqual([
        join(ontoDir, "behavior.yaml"),
        join(ontoDir, "code-mapping.yaml"),
        join(ontoDir, "model.yaml"),
      ]);
    });

    it("node_modules / .git / .onto 는 탐색 대상에서 제외된다", () => {
      const excluded = join(tmpRoot, "node_modules", "some-pkg", "ontology");
      mkdirSync(excluded, { recursive: true });
      writeFileSync(join(excluded, "model.yaml"), "");

      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.ontology_seat_detected).toBe(false);
    });

    it("search_roots 커스텀: 기본 외의 디렉터리도 탐색 가능", () => {
      const customDir = join(tmpRoot, "custom-onto");
      mkdirSync(customDir, { recursive: true });
      writeFileSync(join(customDir, "ontology.yaml"), "");

      const result = classifyReviewPaths([makeEntry()], tmpRoot, {
        search_roots: ["custom-onto"],
      });

      expect(result.ontology_seat_detected).toBe(true);
      expect(result.ontology_seat_paths[0]).toContain("custom-onto");
    });

    it("depth 초과 디렉터리는 탐지하지 않는다 (MAX_SCAN_DEPTH=3)", () => {
      const deep = join(tmpRoot, "ontology", "a", "b", "c", "d", "e");
      mkdirSync(deep, { recursive: true });
      writeFileSync(join(deep, "model.yaml"), "");

      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.ontology_seat_detected).toBe(false);
    });
  });

  describe("cohort metrics (r+ / r-)", () => {
    it("r- only: r+ cohort 는 모두 null, r- 집계만 산출", () => {
      const result = classifyReviewPaths(
        [
          makeEntry({ session_id: "s1", total_duration_ms: 100000, degraded_lens_ids: [], lens_count: 3 }),
          makeEntry({ session_id: "s2", total_duration_ms: 120000, degraded_lens_ids: ["logic"], lens_count: 3 }),
        ],
        tmpRoot,
      );

      expect(result.cohort_r_plus.session_count).toBe(0);
      expect(result.cohort_r_plus.avg_duration_ms).toBeNull();
      expect(result.cohort_r_plus.avg_degraded_lens_ratio).toBeNull();

      expect(result.cohort_r_minus.session_count).toBe(2);
      expect(result.cohort_r_minus.avg_duration_ms).toBe(110000);
      // (0 + 0.333) / 2 = 0.167 (rounded to 3 decimals — 0.333/2 ≈ 0.166 → 0.167)
      expect(result.cohort_r_minus.avg_degraded_lens_ratio).toBeCloseTo(0.167, 2);
    });

    it("r+ only: r- cohort 는 모두 null", () => {
      const ontoDir = join(tmpRoot, "ontology");
      mkdirSync(ontoDir, { recursive: true });
      writeFileSync(join(ontoDir, "model.yaml"), "");

      const result = classifyReviewPaths(
        [makeEntry({ total_duration_ms: 80000, lens_count: 3, degraded_lens_ids: [] })],
        tmpRoot,
      );

      expect(result.cohort_r_plus.session_count).toBe(1);
      expect(result.cohort_r_plus.avg_duration_ms).toBe(80000);
      expect(result.cohort_r_plus.avg_degraded_lens_ratio).toBe(0);

      expect(result.cohort_r_minus.session_count).toBe(0);
      expect(result.cohort_r_minus.avg_duration_ms).toBeNull();
    });

    it("empty entries: 두 cohort 모두 count=0 + null 평균", () => {
      const result = classifyReviewPaths([], tmpRoot);
      expect(result.cohort_r_plus.session_count).toBe(0);
      expect(result.cohort_r_minus.session_count).toBe(0);
      expect(result.delta.duration_delta_ms).toBeNull();
      expect(result.delta.duration_ratio).toBeNull();
      expect(result.delta.degraded_ratio_delta).toBeNull();
    });

    it("lens_count=0 인 세션은 degraded_lens_ratio null 로 제외되고 집계에 영향 없음", () => {
      const result = classifyReviewPaths(
        [
          makeEntry({ session_id: "s1", lens_count: 0, degraded_lens_ids: [] }),
          makeEntry({ session_id: "s2", lens_count: 3, degraded_lens_ids: ["logic"] }),
        ],
        tmpRoot,
      );

      // r- cohort: 2 세션이지만 degraded_ratio 계산 가능한 건 1건 (avg = 0.333)
      expect(result.cohort_r_minus.session_count).toBe(2);
      expect(result.cohort_r_minus.avg_degraded_lens_ratio).toBeCloseTo(0.333, 2);
    });
  });

  describe("path delta metric", () => {
    it("한쪽 cohort 가 비어있으면 duration_delta_ms / duration_ratio / degraded_ratio_delta 모두 null", () => {
      const result = classifyReviewPaths([makeEntry()], tmpRoot);

      expect(result.delta.duration_delta_ms).toBeNull();
      expect(result.delta.duration_ratio).toBeNull();
      expect(result.delta.degraded_ratio_delta).toBeNull();
    });
  });

  describe("session-level fields", () => {
    it("degraded_lens_ratio = degraded_lens_ids.length / lens_count (3decimal rounding)", () => {
      const result = classifyReviewPaths(
        [
          makeEntry({ session_id: "s1", lens_count: 3, degraded_lens_ids: ["logic"] }),
        ],
        tmpRoot,
      );

      expect(result.sessions[0]!.degraded_lens_ratio).toBeCloseTo(0.333, 2);
    });

    it("review_target_refs 는 ReviewLogEntry 에서 그대로 전달", () => {
      const result = classifyReviewPaths(
        [makeEntry({ review_target_refs: ["src/a.ts", "src/b.ts"] })],
        tmpRoot,
      );

      expect(result.sessions[0]!.review_target_refs).toEqual(["src/a.ts", "src/b.ts"]);
    });

    it("r- 세션의 ontology_seat_evidence 는 빈 배열", () => {
      const result = classifyReviewPaths([makeEntry()], tmpRoot);
      expect(result.sessions[0]!.ontology_seat_evidence).toEqual([]);
    });
  });
});
