import { describe, it, expect, beforeEach, vi } from "vitest";
import { wrapGateError, lookupDiagnosticCode, listDiagnosticCodes, validateRegistry, __resetDiagnosticRegistryCache, } from "./error-messages.js";
beforeEach(() => {
    __resetDiagnosticRegistryCache();
});
describe("wrapGateError — backward-compatible behavior (기존 7 tests)", () => {
    it("wraps Transition denied → Korean message", () => {
        const reason = 'Transition denied: "draft" does not allow "align.locked"';
        expect(wrapGateError(reason)).toBe("현재 단계에서 이 작업을 수행할 수 없습니다.");
    });
    it("wraps Referential integrity → Korean message", () => {
        const reason = 'Referential integrity: constraint_id "CST-999" not found in pool';
        expect(wrapGateError(reason)).toBe("내부 참조 오류가 발생했습니다. 에이전트가 이벤트를 재확인해야 합니다.");
    });
    it("wraps Required constraint + rationale → Korean message", () => {
        const reason = 'Required constraint "CST-001" with override decision requires non-empty rationale';
        expect(wrapGateError(reason)).toBe("필수 제약 사항을 무시하려면 이유를 반드시 입력해야 합니다.");
    });
    it("wraps Convergence blocked → Korean message", () => {
        const reason = 'Convergence blocked: cannot "align.revised" until convergence.action_taken is recorded';
        expect(wrapGateError(reason)).toBe("수렴 차단 상태입니다. 방향 변경, scope 축소, 또는 보류 중 하나를 선택하세요.");
    });
    it("wraps Compile retry limit → Korean message", () => {
        const reason = "Compile retry limit exceeded (3 gap_found cycles). Consider scope.deferred or redirect.to_align.";
        expect(wrapGateError(reason)).toBe("compile 재시도 한도(3회)를 초과했습니다. scope를 보류하거나 방향을 재검토하세요.");
    });
    it("passes through Target lock messages (already Korean)", () => {
        const reason = "Target lock 불가: 미결정 2건. 모든 constraint 결정이 완료되어야 합니다.";
        expect(wrapGateError(reason)).toBe(reason);
    });
    it("passes through unknown error messages unchanged and warns developer", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const reason = "Some unknown error occurred";
        expect(wrapGateError(reason)).toBe(reason);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0]?.[0]).toContain("no matching entry");
        expect(warnSpy.mock.calls[0]?.[0]).toContain(reason);
        warnSpy.mockRestore();
    });
});
describe("wrapGateError — 신규 coverage (기존 migrate 된 분기)", () => {
    it("wraps cannot be invalidated → Korean message", () => {
        const reason = "CST-007 is required and cannot be invalidated by system alone";
        expect(wrapGateError(reason)).toBe("필수 제약 사항은 시스템이 단독으로 무효화할 수 없습니다. 주체자의 확인이 필요합니다.");
    });
    it("wraps Compile 실패: → Korean message (Korean pattern)", () => {
        const reason = "Compile 실패: state mismatch at step 2";
        expect(wrapGateError(reason)).toBe("구현 명세 생성에 실패했습니다. 에이전트가 구현 계획을 수정한 뒤 재시도합니다.");
    });
    it("wraps Compile Defense failed → Korean message (OR branch of same code)", () => {
        const reason = "Compile Defense failed: shortcut not covered";
        expect(wrapGateError(reason)).toBe("구현 명세 생성에 실패했습니다. 에이전트가 구현 계획을 수정한 뒤 재시도합니다.");
    });
    it("wraps 'must be X state' → Korean message (AND match via includes_all)", () => {
        const reason = "scope must be in align_locked state before draft.surface.generated";
        expect(wrapGateError(reason)).toBe("현재 단계에서 이 작업을 수행할 수 없습니다.");
    });
    it("wraps compile_ready is false → Korean message", () => {
        const reason = "compile_ready is false: constraint decisions pending";
        expect(wrapGateError(reason)).toBe("아직 구현 명세를 생성할 수 없습니다. 제약 사항 결정이 완료되지 않았거나 소스가 변경되었습니다.");
    });
    it("wraps validation_plan_hash mismatch → Korean message", () => {
        const reason = "validation_plan_hash mismatch — recompute required";
        expect(wrapGateError(reason)).toBe("검증 계획이 변경되었습니다. compile을 다시 실행해야 합니다.");
    });
    it("wraps no matching injectValidation → Korean message", () => {
        const reason = "plan has no matching injectValidation for CST-003";
        expect(wrapGateError(reason)).toBe("구현 계획에 누락된 검증 항목이 있습니다. 에이전트가 수정한 뒤 재시도합니다.");
    });
});
describe("lookupDiagnosticCode — code 기반 routing", () => {
    it("Transition denied → DIAG-STATE-TRANSITION-01 code + category", () => {
        const hit = lookupDiagnosticCode('Transition denied: "draft" does not allow "x"');
        expect(hit).not.toBeNull();
        expect(hit.code).toBe("DIAG-STATE-TRANSITION-01");
        expect(hit.category).toBe("state-transition");
        expect(hit.passthrough).toBe(false);
    });
    it("Target lock → passthrough=true + 원문 message", () => {
        const reason = "Target lock 불가: 예시";
        const hit = lookupDiagnosticCode(reason);
        expect(hit).not.toBeNull();
        expect(hit.code).toBe("DIAG-TARGET-LOCK-01");
        expect(hit.passthrough).toBe(true);
        expect(hit.message).toBe(reason);
    });
    it("미매칭 reason → null (+ console.warn 발행)", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        expect(lookupDiagnosticCode("totally unknown error")).toBeNull();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        warnSpy.mockRestore();
    });
    it("우선순위: 가장 먼저 매칭되는 entry 가 이긴다 (registry 순서)", () => {
        // "Transition denied" 가 먼저, "must be ... state" 가 나중이므로
        // 둘 다 매칭될 수 있는 reason 에 대해 앞엣 것이 이겨야 한다.
        const reason = 'Transition denied: scope must be in grounded state';
        const hit = lookupDiagnosticCode(reason);
        expect(hit.code).toBe("DIAG-STATE-TRANSITION-01");
    });
});
describe("listDiagnosticCodes — registry 내용 노출", () => {
    it("모든 등록된 code 를 반환", () => {
        const codes = listDiagnosticCodes();
        expect(codes.length).toBeGreaterThanOrEqual(12);
        const codeIds = codes.map((c) => c.code);
        expect(codeIds).toContain("DIAG-STATE-TRANSITION-01");
        expect(codeIds).toContain("DIAG-TARGET-LOCK-01");
        expect(codeIds).toContain("DIAG-VALIDATION-MISSING-01");
    });
    it("각 entry 는 code·matchers·category 필드를 가진다", () => {
        const codes = listDiagnosticCodes();
        for (const c of codes) {
            expect(typeof c.code).toBe("string");
            expect(Array.isArray(c.matchers)).toBe(true);
            expect(c.matchers.length).toBeGreaterThan(0);
            expect(typeof c.category).toBe("string");
        }
    });
});
describe("validateRegistry — schema check (fail-fast on malformed registry)", () => {
    it("throws on duplicate code", () => {
        expect(() => validateRegistry({
            version: "test",
            diagnostic_codes: [
                { code: "DUP", matchers: [{ includes: "x" }], category: "test" },
                { code: "DUP", matchers: [{ includes: "y" }], category: "test" },
            ],
        })).toThrow(/duplicate code.*DUP/);
    });
    it("throws when entry has no matchers", () => {
        expect(() => validateRegistry({
            version: "test",
            diagnostic_codes: [
                { code: "C1", matchers: [], category: "test" },
            ],
        })).toThrow(/no matchers/);
    });
    it("throws on matcher without includes / includes_all", () => {
        expect(() => validateRegistry({
            version: "test",
            diagnostic_codes: [
                { code: "C1", matchers: [{}], category: "test" },
            ],
        })).toThrow(/includes.*includes_all/);
    });
    it("throws on matcher with empty includes_all array", () => {
        expect(() => validateRegistry({
            version: "test",
            diagnostic_codes: [
                { code: "C1", matchers: [{ includes_all: [] }], category: "test" },
            ],
        })).toThrow(/includes.*includes_all/);
    });
    it("passes a well-formed registry without throwing", () => {
        expect(() => validateRegistry({
            version: "test",
            diagnostic_codes: [
                { code: "C1", matchers: [{ includes: "x" }], category: "test" },
                { code: "C2", matchers: [{ includes_all: ["a", "b"] }], category: "test" },
            ],
        })).not.toThrow();
    });
    it("production registry (.onto/authority/diagnostic-codes.yaml) passes validation", () => {
        // loadRegistry 내부에서 validateRegistry 호출 — listDiagnosticCodes 로 간접 트리거
        expect(() => listDiagnosticCodes()).not.toThrow();
    });
});
