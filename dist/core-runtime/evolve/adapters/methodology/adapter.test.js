import { describe, it, expect } from "vitest";
import { methodologyAdapter } from "./adapter.js";
describe("methodology adapter — registration", () => {
    it("has correct metadata", () => {
        expect(methodologyAdapter.name).toBe("methodology");
        expect(methodologyAdapter.scope_types).toContain("process");
        expect(methodologyAdapter.perspectives).toContain("authority-consistency");
    });
});
