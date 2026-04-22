import { describe, it, expect } from "vitest";
import { getAdapter, listAdapters } from "./registry.js";
import { methodologyAdapter } from "./methodology/adapter.js";
describe("adapter registry", () => {
    // ─── getAdapter ───
    it("returns code-product for 'experience' scope", () => {
        const entry = getAdapter("experience");
        expect(entry).toBeDefined();
        expect(entry.id).toBe("code-product");
        expect(entry.scope_kinds).toContain("experience");
    });
    it("returns code-product for 'interface' scope", () => {
        const entry = getAdapter("interface");
        expect(entry).toBeDefined();
        expect(entry.id).toBe("code-product");
        expect(entry.scope_kinds).toContain("interface");
    });
    it("returns methodology for 'process' scope", () => {
        const entry = getAdapter("process");
        expect(entry).toBeDefined();
        expect(entry.id).toBe("methodology");
        expect(entry.scope_kinds).toContain("process");
    });
    it("returns undefined for unknown scope kind", () => {
        const entry = getAdapter("unknown-kind");
        expect(entry).toBeUndefined();
    });
    // ─── methodology adapter metadata consistency ───
    it("methodology entry perspectives match adapter.ts SSOT", () => {
        const entry = getAdapter("process");
        expect(entry.perspectives).toEqual(methodologyAdapter.perspectives);
    });
    it("methodology entry scope_kinds match adapter.ts scope_types", () => {
        const entry = getAdapter("process");
        expect(entry.scope_kinds).toEqual(methodologyAdapter.scope_types);
    });
    // ─── listAdapters ───
    it("lists exactly 2 adapters", () => {
        const all = listAdapters();
        expect(all).toHaveLength(2);
    });
    it("returned list is readonly (immutable reference)", () => {
        const a = listAdapters();
        const b = listAdapters();
        expect(a).toBe(b); // same reference
    });
    it("every entry has required fields", () => {
        for (const entry of listAdapters()) {
            expect(entry.id).toBeTruthy();
            expect(entry.name).toBeTruthy();
            expect(entry.scope_kinds.length).toBeGreaterThan(0);
            expect(entry.perspectives.length).toBeGreaterThan(0);
            expect(entry.surface_types.length).toBeGreaterThan(0);
        }
    });
    // ─── No scope_kind collision ───
    it("no scope_kind is claimed by two adapters", () => {
        const all = listAdapters();
        const seen = new Map();
        for (const entry of all) {
            for (const kind of entry.scope_kinds) {
                expect(seen.has(kind)).toBe(false);
                seen.set(kind, entry.id);
            }
        }
    });
});
