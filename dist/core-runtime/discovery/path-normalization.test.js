import { describe, expect, it } from "vitest";
import { startsWithDirPrefix } from "./path-normalization.js";
describe("startsWithDirPrefix — segment-bound check", () => {
    it("matches exact segment boundary with trailing slash", () => {
        expect(startsWithDirPrefix(".onto/principles/foo.md", ".onto/principles/")).toBe(true);
        expect(startsWithDirPrefix(".onto/principles/sub/bar.md", ".onto/principles")).toBe(true);
    });
    it("rejects mid-segment prefix collision", () => {
        expect(startsWithDirPrefix(".onto/principlesABC/foo.md", ".onto/principles")).toBe(false);
        expect(startsWithDirPrefix(".onto/principles_backup/foo.md", ".onto/principles")).toBe(false);
        expect(startsWithDirPrefix(".onto/authorityX/foo.md", ".onto/authority")).toBe(false);
    });
    it("rejects the directory itself (must be a path under the directory)", () => {
        expect(startsWithDirPrefix(".onto/principles", ".onto/principles")).toBe(false);
        expect(startsWithDirPrefix(".onto/principles/", ".onto/principles")).toBe(false);
    });
    it("treats trailing slash in `dir` argument uniformly", () => {
        const p = ".onto/principles/foo.md";
        expect(startsWithDirPrefix(p, ".onto/principles")).toBe(true);
        expect(startsWithDirPrefix(p, ".onto/principles/")).toBe(true);
    });
});
