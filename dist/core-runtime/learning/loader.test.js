/**
 * Learning consumption loader tests (W-B-17).
 *
 * 핵심 검증: promoted(user scope) 학습만 consumer 에 노출.
 * project scope(seed/candidate/provisional) 학습은 소비되지 않음.
 * feedback_learning_core_value.md 정책과 implementation 일치 확인.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadLearningsForAgent, loadLearningsForSession } from "./loader.js";
// ─── Test fixtures ───
const PROMOTED_LEARNING = `# logic learnings

- [fact] [methodology] [guardrail] [high] 리뷰 시 모순 검출은 첫 번째 우선순위
- [judgment] [methodology] [foundation] [normal] 구조 분해 후 의존성 분석이 효율적
`;
const UNPROMOTED_LEARNING = `# logic learnings (project scope)

- [fact] [methodology] [guardrail] [high] 이 프로젝트에서 인증 모듈은 항상 먼저 검토해야 함
- [judgment] [domain/se] [convention] [normal] SE 도메인의 CQ 우선순위는 보안 → 성능 → 유지보수
`;
let tmpDir;
let origHome;
beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "loader-test-"));
    origHome = process.env.HOME ?? "";
    // user scope (promoted) 경로 설정
    process.env.HOME = tmpDir;
});
afterEach(() => {
    process.env.HOME = origHome;
    rmSync(tmpDir, { recursive: true, force: true });
});
function setupPromotedLearning(agentId) {
    const userDir = join(tmpDir, ".onto", "learnings");
    mkdirSync(userDir, { recursive: true });
    writeFileSync(join(userDir, `${agentId}.md`), PROMOTED_LEARNING, "utf-8");
}
function setupProjectLearning(projectRoot, agentId) {
    const projectDir = join(projectRoot, ".onto", "learnings");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, `${agentId}.md`), UNPROMOTED_LEARNING, "utf-8");
}
describe("loader consumption guard (W-B-17)", () => {
    it("promoted(user scope) 학습만 로드한다", () => {
        const projectRoot = join(tmpDir, "project");
        mkdirSync(projectRoot, { recursive: true });
        setupPromotedLearning("logic");
        const result = loadLearningsForAgent("logic", projectRoot, "methodology");
        expect(result.items.length).toBeGreaterThan(0);
        // 모든 item 이 user scope
        for (const item of result.items) {
            expect(item.source_scope).toBe("methodology");
        }
    });
    it("project scope(unpromoted) 학습은 소비하지 않는다", () => {
        const projectRoot = join(tmpDir, "project");
        mkdirSync(projectRoot, { recursive: true });
        // project scope 만 존재, user scope 없음
        setupProjectLearning(projectRoot, "logic");
        const result = loadLearningsForAgent("logic", projectRoot, "methodology");
        // project scope 학습이 있어도 로드되지 않음
        expect(result.items).toHaveLength(0);
        expect(result.total_parsed).toBe(0);
    });
    it("user + project 모두 존재할 때 user 만 로드한다", () => {
        const projectRoot = join(tmpDir, "project");
        mkdirSync(projectRoot, { recursive: true });
        setupPromotedLearning("logic");
        setupProjectLearning(projectRoot, "logic");
        const result = loadLearningsForAgent("logic", projectRoot, "methodology");
        // user scope 항목만 로드됨
        expect(result.items.length).toBeGreaterThan(0);
        for (const item of result.items) {
            expect(item.source_scope).toBe("methodology");
        }
        // project scope 의 "인증 모듈" 항목은 포함되지 않음
        const hasProjectItem = result.items.some(i => i.raw_line.includes("인증 모듈"));
        expect(hasProjectItem).toBe(false);
    });
    it("loadLearningsForSession 도 동일한 promoted-only 정책을 따른다", () => {
        const projectRoot = join(tmpDir, "project");
        mkdirSync(projectRoot, { recursive: true });
        setupPromotedLearning("logic");
        setupProjectLearning(projectRoot, "logic");
        const { results, manifest } = loadLearningsForSession(["logic"], projectRoot, "methodology");
        expect(results).toHaveLength(1);
        for (const item of results[0].items) {
            expect(item.source_scope).toBe("methodology");
        }
        expect(manifest.total_items_loaded).toBeGreaterThan(0);
    });
    it("학습 파일이 없으면 빈 결과를 반환한다 (에러 아님)", () => {
        const projectRoot = join(tmpDir, "project");
        mkdirSync(projectRoot, { recursive: true });
        const result = loadLearningsForAgent("logic", projectRoot, "methodology");
        expect(result.items).toHaveLength(0);
        expect(result.degraded).toBe(false);
    });
});
