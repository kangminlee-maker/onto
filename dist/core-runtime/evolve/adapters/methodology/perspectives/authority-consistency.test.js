import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkAuthorityConsistency, } from "./authority-consistency.js";
// ─── Load v9.3 trajectory fixture ───
const fixturePath = join(import.meta.dirname, "../__fixtures__/v9.3-trajectory.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
describe("authority-consistency perspective", () => {
    it("detects ghost-axis violation in v9.3 trajectory", () => {
        const input = {
            sections: fixture.sections,
            authority_refs: fixture.authority_refs,
        };
        const result = checkAuthorityConsistency(input);
        // The v9.3 trajectory has C-3: consumer_assigned declared derive-only in §6.3
        // but used operatively in §8.0 and §8.5
        const ghostViolations = result.violations.filter((v) => v.type === "ghost-axis");
        expect(ghostViolations.length).toBeGreaterThanOrEqual(1);
        // At least one ghost-axis should mention consumer_assigned
        const consumerAssigned = ghostViolations.find((v) => v.summary.includes("consumer_assigned"));
        expect(consumerAssigned).toBeDefined();
        expect(consumerAssigned.source_section).toBe("§6.3");
    });
    it("returns passed=false when high-severity violations exist", () => {
        const input = {
            sections: fixture.sections,
            authority_refs: fixture.authority_refs,
        };
        const result = checkAuthorityConsistency(input);
        expect(result.passed).toBe(false);
        expect(result.summary.high).toBeGreaterThanOrEqual(1);
    });
    it("detects authority-violation when section contradicts authority refs", () => {
        const input = {
            sections: fixture.sections,
            authority_refs: fixture.authority_refs,
        };
        const result = checkAuthorityConsistency(input);
        // §6.3 says "design은 학습을 저장하지 않는다" which contradicts
        // authority refs that define learn write permissions (build.md, review.md)
        const authViolations = result.violations.filter((v) => v.type === "authority-violation");
        expect(authViolations.length).toBeGreaterThanOrEqual(1);
        // At least one violation should originate from §6.3
        const fromSection63 = authViolations.find((v) => v.source_section === "§6.3");
        expect(fromSection63).toBeDefined();
    });
    it("detects self-contradiction between sections", () => {
        const input = {
            sections: fixture.sections,
            authority_refs: fixture.authority_refs,
        };
        const result = checkAuthorityConsistency(input);
        // §6.3 negates learn participation ("학습을 저장하지 않는다")
        // but §8.0 affirms learn as a real consumer with direct participation
        const selfContradictions = result.violations.filter((v) => v.type === "self-contradiction");
        expect(selfContradictions.length).toBeGreaterThanOrEqual(1);
    });
    it("returns passed=true for clean document", () => {
        const input = {
            sections: [
                { id: "§1", title: "Introduction", content: "This document defines the process." },
                { id: "§2", title: "Rules", content: "Rule A applies. Rule B applies." },
            ],
            authority_refs: [],
        };
        const result = checkAuthorityConsistency(input);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
});
