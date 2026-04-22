/**
 * promote-principle unit tests (W-C-03 v0).
 *
 * 검증:
 *   - Quality gate: workload evidence threshold 통과/미달
 *   - Frequency gate: similar_to 로 workload evidence 면제 (2번째부터)
 *   - Completeness gate: 필수 필드 누락 거부
 *   - Target 매핑: GovernSubmitEvent.target = file_path
 *   - Threshold fallback: config 없을 때 hardcoded default
 *   - E2E: promote-principle → list → decide 전체 흐름
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executePromotePrinciple, readThresholds } from "./promote-principle.js";
import { handleGovernCli } from "./cli.js";
function makeProposal(overrides = {}) {
    return {
        learning_ref: { agent_id: "logic", entry_marker: "test-entry-001" },
        target: { category: "principle", file_path: ".onto/principles/test.md", section: "NEW" },
        rationale: "test rationale",
        conflict_check: { reviewed_by_agent: true, existing_principle_refs: [], conflict_summary: "no conflict" },
        workload_evidence: { state_transitions: 10, retry_count: 3, evidence_summary: "10 transitions, 3 retries", event_refs: [] },
        source_impact: "high",
        ...overrides,
    };
}
describe("promote-principle Quality gate", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-principle-"));
        mkdirSync(join(tmpRoot, ".onto", "principles"), { recursive: true });
        writeFileSync(join(tmpRoot, ".onto", "principles", "test.md"), "# Test", "utf-8");
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("workload evidence 가 threshold 충족 시 quality gate 통과", () => {
        const result = executePromotePrinciple(makeProposal(), tmpRoot);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.gate_passed).toBe("quality");
            expect(result.id).toMatch(/^g-/);
        }
    });
    it("workload evidence 미달 시 quality gate 실패", () => {
        const result = executePromotePrinciple(makeProposal({
            workload_evidence: { state_transitions: 1, retry_count: 0, evidence_summary: "low", event_refs: [] },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.gate_failed).toBe("quality");
            expect(result.reason).toContain("Quality gate");
        }
    });
    it("OR mode: 하나의 축만 threshold 충족해도 통과", () => {
        const result = executePromotePrinciple(makeProposal({
            workload_evidence: { state_transitions: 10, retry_count: 0, constraint_count: 0, evidence_summary: "transitions only", event_refs: [] },
        }), tmpRoot);
        expect(result.success).toBe(true);
        if (result.success)
            expect(result.gate_passed).toBe("quality");
    });
});
describe("promote-principle Frequency gate", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-freq-"));
        mkdirSync(join(tmpRoot, ".onto", "principles"), { recursive: true });
        writeFileSync(join(tmpRoot, ".onto", "principles", "test.md"), "# Test", "utf-8");
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("similar_to 가 기존 pending 참조 시 workload evidence 면제", () => {
        const first = executePromotePrinciple(makeProposal(), tmpRoot);
        expect(first.success).toBe(true);
        const firstId = first.success ? first.id : "";
        const second = executePromotePrinciple(makeProposal({
            workload_evidence: { state_transitions: 0, evidence_summary: "none", event_refs: [] },
            similar_to: [firstId],
        }), tmpRoot);
        expect(second.success).toBe(true);
        if (second.success) {
            expect(second.gate_passed).toBe("frequency");
            expect(second.similar_to).toContain(firstId);
        }
    });
    it("similar_to 의 id 가 pending 에 없으면 validation 실패", () => {
        const result = executePromotePrinciple(makeProposal({ similar_to: ["g-nonexistent"] }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.reason).toContain("존재하지 않음");
    });
});
describe("promote-principle Completeness gate", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-complete-"));
        mkdirSync(join(tmpRoot, ".onto", "principles"), { recursive: true });
        writeFileSync(join(tmpRoot, ".onto", "principles", "test.md"), "# Test", "utf-8");
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("learning_ref 누락 시 거부", () => {
        const result = executePromotePrinciple(makeProposal({ learning_ref: { agent_id: "", entry_marker: "" } }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("completeness");
    });
    it("rationale 빈 문자열 시 거부", () => {
        const result = executePromotePrinciple(makeProposal({ rationale: "  " }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("completeness");
    });
    it("invalid category (field present, value unknown) → validation gate", () => {
        const result = executePromotePrinciple(makeProposal({ target: { category: "authority", file_path: ".onto/authority/x.yaml", section: "NEW" } }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("legacy design_principle label → validation gate + migration hint", () => {
        // Phase 7 review polish (UNIQ-gate-taxonomy): present-but-invalid value
        // routes through the validation gate, not completeness. The hint must
        // still guide callers to the new `principle` label.
        const result = executePromotePrinciple(makeProposal({ target: { category: "design_principle", file_path: ".onto/principles/x.md", section: "NEW" } }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.gate_failed).toBe("validation");
            expect(result.reason).toContain("design_principle");
            expect(result.reason).toMatch(/renamed to 'principle'/);
        }
    });
    it("empty category string → completeness gate (missing field)", () => {
        const result = executePromotePrinciple(makeProposal({ target: { category: "", file_path: ".onto/principles/x.md", section: "NEW" } }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("completeness");
    });
});
describe("promote-principle target 매핑 + queue integration", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-queue-"));
        mkdirSync(join(tmpRoot, ".onto", "principles"), { recursive: true });
        writeFileSync(join(tmpRoot, ".onto", "principles", "test.md"), "# Test", "utf-8");
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("GovernSubmitEvent.target = proposal.target.file_path", () => {
        executePromotePrinciple(makeProposal(), tmpRoot);
        const raw = readFileSync(join(tmpRoot, ".onto", "govern", "queue.ndjson"), "utf-8");
        const event = JSON.parse(raw.trim());
        expect(event.target).toBe(".onto/principles/test.md");
        expect(event.origin).toBe("human");
        expect(event.tag).toBe("norm_change");
        expect(event.payload.promotion_kind).toBe("knowledge_to_principle");
        expect(event.payload.proposal.target.section).toBe("NEW");
    });
});
describe("promote-principle target validation — canonical/legacy dual-path", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-dual-"));
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("principle category + canonical .onto/principles/ → pass", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: ".onto/principles/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(true);
    });
    it("principle category + legacy design-principles/ → validation 실패 (Phase 7 canonical-only)", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: "design-principles/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("process category + canonical .onto/processes/ → pass", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "process", file_path: ".onto/processes/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(true);
    });
    it("process category + legacy processes/ → validation 실패 (Phase 7 canonical-only)", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "process", file_path: "processes/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("segment-bound: .onto/principlesABC/foo.md → validation 실패 (near-miss prefix)", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: ".onto/principlesABC/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.gate_failed).toBe("validation");
            expect(result.reason).toContain(".onto/principles/");
        }
    });
    it("segment-bound: design-principlesX/foo.md → validation 실패", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: "design-principlesX/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    // Phase 7 review polish (UNIQ-logic traversal): stage-2 normalized-descendant
    // check 가 traversal-shaped input 을 실제로 거부하는지 executable 로 pin.
    it("traversal: .onto/principles/../../../etc/passwd → validation 실패 (stage-2 normalized-descendant)", () => {
        const result = executePromotePrinciple(makeProposal({
            target: {
                category: "principle",
                file_path: ".onto/principles/../../../etc/passwd",
                section: "NEW",
            },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("traversal: .onto/principles/subdir/../../escape.md → validation 실패", () => {
        const result = executePromotePrinciple(makeProposal({
            target: {
                category: "principle",
                file_path: ".onto/principles/subdir/../../escape.md",
                section: "NEW",
            },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("traversal: 합법적 canonical 하위 경로 (.onto/principles/sub/deep/x.md) 는 통과", () => {
        // Counter-example: stage-2 가 합법적 descendant 는 거부하지 않아야 함.
        const result = executePromotePrinciple(makeProposal({
            target: {
                category: "principle",
                file_path: ".onto/principles/sub/deep/x.md",
                section: "NEW",
            },
        }), tmpRoot);
        expect(result.success).toBe(true);
    });
    it("wrong category dir: process 카테고리 + .onto/principles/ 경로 → validation 실패", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "process", file_path: ".onto/principles/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("validation 은 파일 존재 여부와 무관하게 항상 수행 (existsSync bypass 제거)", () => {
        // 기존 버그: 파일이 존재하면 path 검증 전체 skip. 이제는 파일이 있어도 seat 검증 수행.
        // random/unrelated.md 는 실제 존재하지만 principle/process 디렉토리 밖이므로 rejection.
        mkdirSync(join(tmpRoot, "random"), { recursive: true });
        writeFileSync(join(tmpRoot, "random", "unrelated.md"), "# x", "utf-8");
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: "random/unrelated.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.gate_failed).toBe("validation");
    });
    it("canonical principle path → queue 에 동일 canonical 로 persist", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "principle", file_path: ".onto/principles/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(true);
        const raw = readFileSync(join(tmpRoot, ".onto", "govern", "queue.ndjson"), "utf-8");
        const event = JSON.parse(raw.trim());
        expect(event.target).toBe(".onto/principles/foo.md");
        expect(event.payload.proposal.target.file_path).toBe(".onto/principles/foo.md");
    });
    it("canonical process path → queue 에 동일 canonical 로 persist", () => {
        const result = executePromotePrinciple(makeProposal({
            target: { category: "process", file_path: ".onto/processes/foo.md", section: "NEW" },
        }), tmpRoot);
        expect(result.success).toBe(true);
        const raw = readFileSync(join(tmpRoot, ".onto", "govern", "queue.ndjson"), "utf-8");
        const event = JSON.parse(raw.trim());
        expect(event.target).toBe(".onto/processes/foo.md");
    });
});
describe("promote-principle threshold config", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-config-"));
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("config 없을 때 hardcoded default 사용", () => {
        const t = readThresholds(tmpRoot);
        expect(t.state_transitions_min).toBe(8);
        expect(t.retry_count_min).toBe(2);
        expect(t.mode).toBe("any");
    });
    it("custom config 읽기", () => {
        const configDir = join(tmpRoot, ".onto", "govern");
        mkdirSync(configDir, { recursive: true });
        writeFileSync(join(configDir, "thresholds.yaml"), [
            "mode: all",
            "state_transitions_min: 5",
            "constraint_count_min: 2",
            "retry_count_min: 1",
            "repeat_observation_min: 2",
        ].join("\n"), "utf-8");
        const t = readThresholds(tmpRoot);
        expect(t.mode).toBe("all");
        expect(t.state_transitions_min).toBe(5);
        expect(t.repeat_observation_min).toBe(2);
    });
});
describe("promote-principle E2E (promote → list → decide)", () => {
    let tmpRoot;
    let logs;
    let origLog;
    let origErr;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-promote-e2e-"));
        mkdirSync(join(tmpRoot, ".onto", "principles"), { recursive: true });
        writeFileSync(join(tmpRoot, ".onto", "principles", "test.md"), "# Test", "utf-8");
        logs = [];
        origLog = console.log;
        origErr = console.error;
        console.log = (...args) => {
            logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
        };
        console.error = () => { };
    });
    afterEach(() => {
        console.log = origLog;
        console.error = origErr;
        rmSync(tmpRoot, { recursive: true, force: true });
    });
    function lastLogJson() {
        return JSON.parse(logs[logs.length - 1]);
    }
    it("promote-principle → list(pending) → decide approve 전체 흐름", async () => {
        const proposal = makeProposal();
        const code = await handleGovernCli("", [
            "promote-principle",
            "--json", JSON.stringify(proposal),
            "--project-root", tmpRoot,
        ]);
        expect(code).toBe(0);
        const queued = lastLogJson();
        expect(queued.status).toBe("queued");
        expect(queued.gate_passed).toBe("quality");
        const id = queued.id;
        logs.length = 0;
        await handleGovernCli("", ["list", "--status", "pending", "--format", "json", "--project-root", tmpRoot]);
        const pending = lastLogJson();
        expect(pending.length).toBe(1);
        expect(pending[0].payload.promotion_kind).toBe("knowledge_to_principle");
        logs.length = 0;
        const decideCode = await handleGovernCli("", [
            "decide", id, "--verdict", "approve",
            "--reason", "3회 반복 관측, principle 승격 승인",
            "--project-root", tmpRoot,
        ]);
        expect(decideCode).toBe(0);
        const decided = lastLogJson();
        expect(decided.verdict).toBe("approve");
        expect(decided.target).toBe(".onto/principles/test.md");
        expect(decided.note).toContain("승인");
    });
});
