import { describe, it, expect } from "vitest";
import { buildHealthReport, renderHealthReport, } from "./health-report.js";
// ─── Helpers ───
function makeItem(overrides = {}) {
    return {
        agent_id: "logic",
        scope: "global",
        source_path: "/home/user/.onto/learnings/logic.md",
        raw_line: "- [methodology][guardrail][fact] sample content",
        line_number: 10,
        type: "fact",
        applicability_tags: ["methodology"],
        role: "guardrail",
        content: "sample content",
        source_project: null,
        source_domain: null,
        source_date: null,
        impact: "normal",
        learning_id: null,
        event_markers: [],
        retention_confirmed_at: null,
        ...overrides,
    };
}
describe("buildHealthReport", () => {
    it("returns zero metrics for empty input", () => {
        const report = buildHealthReport([], "global");
        expect(report.total_entries).toBe(0);
        expect(report.file_count).toBe(0);
        expect(report.largest_file).toBeNull();
        expect(report.axis_distribution.methodology_only).toBe(0);
        expect(report.domains).toEqual([]);
    });
    it("classifies axis distribution (methodology-only / domain-only / dual)", () => {
        const items = [
            makeItem({ applicability_tags: ["methodology"] }),
            makeItem({ applicability_tags: ["methodology"] }),
            makeItem({ applicability_tags: ["domain/SE"] }),
            makeItem({ applicability_tags: ["methodology", "domain/SE"] }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.axis_distribution.methodology_only).toBe(2);
        expect(report.axis_distribution.domain_only).toBe(1);
        expect(report.axis_distribution.dual).toBe(1);
    });
    it("counts purpose distribution including unassigned (role=null)", () => {
        const items = [
            makeItem({ role: "guardrail" }),
            makeItem({ role: "foundation" }),
            makeItem({ role: "convention" }),
            makeItem({ role: "insight" }),
            makeItem({ role: null }),
            makeItem({ role: null }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.purpose_distribution.guardrail).toBe(1);
        expect(report.purpose_distribution.foundation).toBe(1);
        expect(report.purpose_distribution.convention).toBe(1);
        expect(report.purpose_distribution.insight).toBe(1);
        expect(report.purpose_distribution.unassigned).toBe(2);
    });
    it("tallies type distribution fact vs judgment", () => {
        const items = [
            makeItem({ type: "fact" }),
            makeItem({ type: "judgment" }),
            makeItem({ type: "judgment" }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.type_distribution.fact).toBe(1);
        expect(report.type_distribution.judgment).toBe(2);
    });
    it("counts event markers (sum of item.event_markers.length)", () => {
        const items = [
            makeItem({ event_markers: ["applied-then-found-invalid"] }),
            makeItem({ event_markers: ["applied-then-found-invalid", "applied-then-found-invalid"] }),
            makeItem({ event_markers: [] }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.event_markers).toBe(3);
    });
    it("detects tag-incomplete and consolidated markers from raw_line", () => {
        const items = [
            makeItem({ raw_line: "- [methodology] content [tag-incomplete]" }),
            makeItem({ raw_line: "- [methodology] content <!-- consolidated into learning_id -->" }),
            makeItem({ raw_line: "- [methodology] content" }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.tag_incomplete).toBe(1);
        expect(report.consolidated).toBe(1);
    });
    it("counts retention_confirmed (retention_confirmed_at non-null)", () => {
        const items = [
            makeItem({ retention_confirmed_at: "2026-04-10" }),
            makeItem({ retention_confirmed_at: "2026-04-11" }),
            makeItem({ retention_confirmed_at: null }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.retention_confirmed).toBe(2);
    });
    it("derives file_count and largest_file from source_path and line_number", () => {
        const items = [
            makeItem({ source_path: "/p/.onto/learnings/logic.md", line_number: 40 }),
            makeItem({ source_path: "/p/.onto/learnings/logic.md", line_number: 80 }),
            makeItem({ source_path: "/p/.onto/learnings/axiology.md", line_number: 50 }),
        ];
        const report = buildHealthReport(items, "project");
        expect(report.file_count).toBe(2);
        expect(report.largest_file?.agent).toBe("logic");
        expect(report.largest_file?.lines).toBe(80);
    });
    it("aggregates referenced domains with counts sorted desc then name asc", () => {
        const items = [
            makeItem({ applicability_tags: ["domain/SE"] }),
            makeItem({ applicability_tags: ["domain/SE"] }),
            makeItem({ applicability_tags: ["domain/UI"] }),
            makeItem({ applicability_tags: ["methodology", "domain/Business"] }),
        ];
        const report = buildHealthReport(items, "global");
        expect(report.domains).toEqual([
            { domain: "SE", count: 2 },
            { domain: "Business", count: 1 },
            { domain: "UI", count: 1 },
        ]);
    });
});
describe("renderHealthReport", () => {
    function makeReport() {
        return buildHealthReport([
            makeItem({ applicability_tags: ["methodology"], role: "guardrail" }),
            makeItem({ applicability_tags: ["domain/SE"], role: "insight", type: "judgment" }),
        ], "global");
    }
    it("renders markdown dashboard with all required sections", () => {
        const output = renderHealthReport(makeReport());
        expect(output).toContain("## Learning Health Dashboard");
        expect(output).toContain("### Global Learnings");
        expect(output).toContain("### Axis Distribution");
        expect(output).toContain("### Purpose Distribution");
        expect(output).toContain("### Type Distribution");
        expect(output).toContain("### Health Indicators");
        expect(output).toContain("### Domains Referenced");
    });
    it("labels target as Project when target=project", () => {
        const report = buildHealthReport([makeItem()], "project");
        const output = renderHealthReport(report);
        expect(output).toContain("### Project Learnings");
        expect(output).not.toContain("### Global Learnings");
    });
    it("marks file size WARNING when largest file >= 200 lines", () => {
        const report = buildHealthReport([makeItem({ line_number: 210 })], "global");
        const output = renderHealthReport(report);
        expect(output).toContain("| File size | WARNING |");
    });
    it("marks file size NOTICE when largest file >= 100 and < 200", () => {
        const report = buildHealthReport([makeItem({ line_number: 150 })], "global");
        const output = renderHealthReport(report);
        expect(output).toContain("| File size | NOTICE |");
    });
    it("marks file size OK when largest file < 100", () => {
        const report = buildHealthReport([makeItem({ line_number: 50 })], "global");
        const output = renderHealthReport(report);
        expect(output).toContain("| File size | OK |");
    });
    it("renders (none) when no domains referenced", () => {
        const report = buildHealthReport([makeItem({ applicability_tags: ["methodology"] })], "global");
        const output = renderHealthReport(report);
        expect(output).toContain("(none)");
    });
});
