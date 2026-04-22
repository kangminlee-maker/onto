import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { collectLearningUsage, computeAggregate } from "./usage-tracker.js";
// ─── Fixture helpers ───
function makeManifest(overrides = {}) {
    return {
        session_domain: "none",
        agents_loaded: 2,
        total_items_loaded: 90,
        total_items_parsed: 200,
        total_items_skipped: 10,
        degraded: false,
        degradation_reason: null,
        per_agent: [
            {
                agent_id: "logic",
                loaded: 46,
                parsed: 120,
                skipped: 4,
                truncated: 74,
                role_distribution: { guardrail: 15, foundation: 21, convention: 1, unclassified: 9 },
                tier_distribution: { "1": 15, "2": 11, "3": 19, "4": 1 },
                cross_domain_included: 0,
                cross_domain_excluded: 0,
                tokens_used: 6259,
                tokens_budget: 4000,
                budget_truncated_count: 48,
            },
            {
                agent_id: "structure",
                loaded: 44,
                parsed: 80,
                skipped: 6,
                truncated: 36,
                role_distribution: { guardrail: 12, foundation: 4, convention: 0, unclassified: 28 },
                tier_distribution: { "1": 12, "2": 16, "3": 4, "4": 12 },
                cross_domain_included: 0,
                cross_domain_excluded: 0,
                tokens_used: 5666,
                tokens_budget: 4000,
                budget_truncated_count: 32,
            },
        ],
        learning_file_paths: [],
        ...overrides,
    };
}
let testDir;
function createSessionManifest(reviewRoot, sessionId, manifestOverrides = {}) {
    const prepDir = join(reviewRoot, sessionId, "execution-preparation");
    mkdirSync(prepDir, { recursive: true });
    writeFileSync(join(prepDir, "learning-manifest.yaml"), stringify(makeManifest(manifestOverrides)));
}
// ─── Tests ───
describe("usage-tracker", () => {
    beforeEach(() => {
        testDir = join(tmpdir(), `usage-tracker-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(testDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });
    describe("collectLearningUsage", () => {
        it("빈 디렉터리에서 빈 summary 를 반환한다", () => {
            const result = collectLearningUsage(testDir);
            expect(result.total_sessions).toBe(0);
            expect(result.entries).toHaveLength(0);
        });
        it("존재하지 않는 경로에서 빈 summary 를 반환한다", () => {
            const result = collectLearningUsage("/nonexistent/path");
            expect(result.total_sessions).toBe(0);
        });
        it("단일 세션의 learning manifest 를 수집한다", () => {
            createSessionManifest(testDir, "20260413-aaa00001");
            const result = collectLearningUsage(testDir);
            expect(result.total_sessions).toBe(1);
            const entry = result.entries[0];
            expect(entry.session_id).toBe("20260413-aaa00001");
            expect(entry.total_items_loaded).toBe(90);
            expect(entry.total_items_parsed).toBe(200);
            expect(entry.agents_loaded).toBe(2);
        });
        it("per-agent tier/role 분포를 합산한다", () => {
            createSessionManifest(testDir, "20260413-aaa00001");
            const result = collectLearningUsage(testDir);
            const entry = result.entries[0];
            // logic t1:15 + structure t1:12 = 27
            expect(entry.tier_distribution.t1).toBe(27);
            // logic guardrail:15 + structure guardrail:12 = 27
            expect(entry.role_distribution.guardrail).toBe(27);
        });
        it("tokens_used 와 budget_truncated 를 합산한다", () => {
            createSessionManifest(testDir, "20260413-aaa00001");
            const result = collectLearningUsage(testDir);
            const entry = result.entries[0];
            expect(entry.total_tokens_used).toBe(6259 + 5666);
            expect(entry.total_budget_truncated).toBe(48 + 32);
        });
        it("learning-manifest.yaml 없는 세션은 건너뛴다", () => {
            const sessionDir = join(testDir, "20260413-bbb00002");
            mkdirSync(sessionDir, { recursive: true });
            const result = collectLearningUsage(testDir);
            expect(result.total_sessions).toBe(0);
        });
        it("여러 세션을 session_id 순 정렬한다", () => {
            createSessionManifest(testDir, "20260413-bbb00002");
            createSessionManifest(testDir, "20260413-aaa00001");
            const result = collectLearningUsage(testDir);
            expect(result.entries[0].session_id).toBe("20260413-aaa00001");
            expect(result.entries[1].session_id).toBe("20260413-bbb00002");
        });
    });
    describe("computeAggregate", () => {
        it("빈 entries 에서 zero aggregate 를 반환한다", () => {
            const agg = computeAggregate([]);
            expect(agg.avg_items_loaded).toBe(0);
            expect(agg.supply_ratio).toBe(0);
        });
        it("단일 세션의 supply_ratio 를 정확히 산출한다", () => {
            const entries = [
                makeUsageEntry("s1", { loaded: 90, parsed: 200 }),
            ];
            const agg = computeAggregate(entries);
            expect(agg.supply_ratio).toBe(0.45); // 90/200
            expect(agg.avg_items_loaded).toBe(90);
        });
        it("여러 세션의 평균을 산출한다", () => {
            const entries = [
                makeUsageEntry("s1", { loaded: 100, parsed: 200, tokens: 10000 }),
                makeUsageEntry("s2", { loaded: 200, parsed: 400, tokens: 20000 }),
            ];
            const agg = computeAggregate(entries);
            expect(agg.avg_items_loaded).toBe(150);
            expect(agg.avg_items_parsed).toBe(300);
            expect(agg.supply_ratio).toBe(0.5); // 300/600
            expect(agg.avg_tokens_used).toBe(15000);
        });
        it("degradation_ratio 를 정확히 산출한다", () => {
            const entries = [
                makeUsageEntry("s1", { degraded: true }),
                makeUsageEntry("s2", { degraded: false }),
                makeUsageEntry("s3", { degraded: false }),
            ];
            const agg = computeAggregate(entries);
            expect(agg.degradation_ratio).toBe(0.333);
        });
        it("tier/role 분포를 합산한다", () => {
            const entries = [
                makeUsageEntry("s1", { tier: { t1: 10, t2: 5, t3: 3, t4: 2 } }),
                makeUsageEntry("s2", { tier: { t1: 8, t2: 4, t3: 2, t4: 1 } }),
            ];
            const agg = computeAggregate(entries);
            expect(agg.total_tier_distribution.t1).toBe(18);
            expect(agg.total_tier_distribution.t2).toBe(9);
        });
    });
});
// ─── Test helper ───
function makeUsageEntry(session_id, overrides = {}) {
    return {
        session_id,
        session_domain: "none",
        agents_loaded: 9,
        total_items_loaded: overrides.loaded ?? 100,
        total_items_parsed: overrides.parsed ?? 200,
        total_items_skipped: 10,
        total_tokens_used: overrides.tokens ?? 10000,
        total_budget_truncated: 5,
        degraded: overrides.degraded ?? false,
        tier_distribution: overrides.tier ?? { t1: 10, t2: 5, t3: 3, t4: 2 },
        role_distribution: { guardrail: 10, foundation: 5, convention: 2, unclassified: 3 },
    };
}
