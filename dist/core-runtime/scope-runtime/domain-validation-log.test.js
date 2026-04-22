import { describe, it, expect } from "vitest";
import { computeValidationMetrics, createAssumptionRecord, markValidation, } from "./domain-validation-log.js";
// ─── Test helpers ───
function makeRecord(overrides = {}) {
    return {
        assumption_id: "a-001",
        session_id: "20260414-test",
        domain: "SE",
        stage1_certainty: "pending",
        stage2_certainty: "inferred",
        description: "test assumption",
        abduction_quality: { explanatory_power: "high", coherence: "consistent" },
        validation_status: "pending",
        validated_at: null,
        validation_evidence: null,
        ...overrides,
    };
}
// ─── Tests ───
describe("domain-validation-log", () => {
    describe("computeValidationMetrics", () => {
        it("빈 records 에서 null accuracy 를 반환한다", () => {
            const result = computeValidationMetrics([]);
            expect(result.total_records).toBe(0);
            expect(result.per_domain).toHaveLength(0);
            expect(result.overall_accuracy_ratio).toBeNull();
        });
        it("단일 도메인의 stage1/stage2 분포를 산출한다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", stage1_certainty: "observed", stage2_certainty: null }),
                makeRecord({ assumption_id: "a-002", stage1_certainty: "pending", stage2_certainty: "inferred" }),
                makeRecord({ assumption_id: "a-003", stage1_certainty: "pending", stage2_certainty: "rationale-absent" }),
                makeRecord({ assumption_id: "a-004", stage1_certainty: "pending", stage2_certainty: "ambiguous" }),
            ];
            const result = computeValidationMetrics(records);
            expect(result.per_domain).toHaveLength(1);
            const se = result.per_domain[0];
            expect(se.domain).toBe("SE");
            expect(se.stage1_distribution.observed).toBe(1);
            expect(se.stage1_distribution.pending).toBe(3);
            expect(se.stage2_distribution.inferred).toBe(1);
            expect(se.stage2_distribution.rationale_absent).toBe(1);
            expect(se.stage2_distribution.ambiguous).toBe(1);
        });
        it("inferred 검증 결과 별 카운트를 정확히 산출한다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-002", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-003", validation_status: "invalidated" }),
                makeRecord({ assumption_id: "a-004", validation_status: "pending" }),
            ];
            const result = computeValidationMetrics(records);
            const se = result.per_domain[0];
            expect(se.inferred_validated).toBe(2);
            expect(se.inferred_invalidated).toBe(1);
            expect(se.inferred_pending).toBe(1);
        });
        it("적중률을 정확히 계산한다 (validated / resolved)", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-002", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-003", validation_status: "invalidated" }),
                makeRecord({ assumption_id: "a-004", validation_status: "revised" }),
            ];
            const result = computeValidationMetrics(records);
            // 2 validated / (2 + 1 + 1) = 0.5
            expect(result.per_domain[0].accuracy_ratio).toBe(0.5);
            expect(result.overall_accuracy_ratio).toBe(0.5);
        });
        it("검증 완료 건이 없으면 accuracy null 을 반환한다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", validation_status: "pending" }),
                makeRecord({ assumption_id: "a-002", validation_status: "pending" }),
            ];
            const result = computeValidationMetrics(records);
            expect(result.per_domain[0].accuracy_ratio).toBeNull();
            expect(result.overall_accuracy_ratio).toBeNull();
        });
        it("여러 도메인을 별도 그룹으로 산출한다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", domain: "SE", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-002", domain: "SE", validation_status: "invalidated" }),
                makeRecord({ assumption_id: "a-003", domain: "Business", validation_status: "validated" }),
            ];
            const result = computeValidationMetrics(records);
            expect(result.per_domain).toHaveLength(2);
            expect(result.total_records).toBe(3);
            const business = result.per_domain.find((d) => d.domain === "Business");
            expect(business.accuracy_ratio).toBe(1.0);
            const se = result.per_domain.find((d) => d.domain === "SE");
            expect(se.accuracy_ratio).toBe(0.5);
        });
        it("overall_accuracy_ratio 는 전체 도메인 합산 기준이다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", domain: "SE", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-002", domain: "SE", validation_status: "invalidated" }),
                makeRecord({ assumption_id: "a-003", domain: "Business", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-004", domain: "Business", validation_status: "validated" }),
            ];
            const result = computeValidationMetrics(records);
            // 3 validated / (3 + 1) = 0.75
            expect(result.overall_accuracy_ratio).toBe(0.75);
        });
        it("non-inferred 항목은 적중률 계산에서 제외된다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", stage2_certainty: "inferred", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-002", stage2_certainty: "rationale-absent", validation_status: "validated" }),
                makeRecord({ assumption_id: "a-003", stage2_certainty: "ambiguous", validation_status: "validated" }),
            ];
            const result = computeValidationMetrics(records);
            const se = result.per_domain[0];
            // inferred 1건만 validated → accuracy 1.0
            expect(se.inferred_validated).toBe(1);
            expect(se.accuracy_ratio).toBe(1.0);
        });
        it("도메인을 알파벳순 정렬한다", () => {
            const records = [
                makeRecord({ assumption_id: "a-001", domain: "Zebra" }),
                makeRecord({ assumption_id: "a-002", domain: "Alpha" }),
            ];
            const result = computeValidationMetrics(records);
            expect(result.per_domain[0].domain).toBe("Alpha");
            expect(result.per_domain[1].domain).toBe("Zebra");
        });
    });
    describe("createAssumptionRecord", () => {
        it("validation_status=pending 으로 초기화한다", () => {
            const record = createAssumptionRecord({
                assumption_id: "a-new",
                session_id: "20260414-new",
                domain: "SE",
                stage1_certainty: "pending",
                stage2_certainty: "inferred",
                description: "new assumption",
                abduction_quality: { explanatory_power: "medium", coherence: "consistent" },
            });
            expect(record.validation_status).toBe("pending");
            expect(record.validated_at).toBeNull();
            expect(record.validation_evidence).toBeNull();
        });
    });
    describe("markValidation", () => {
        it("검증 결과를 기록한다", () => {
            const record = makeRecord({ assumption_id: "a-001" });
            const validated = markValidation(record, "validated", "confirmed by user");
            expect(validated.validation_status).toBe("validated");
            expect(validated.validated_at).toBeTruthy();
            expect(validated.validation_evidence).toBe("confirmed by user");
        });
        it("원본을 변경하지 않는다 (immutable)", () => {
            const record = makeRecord({ assumption_id: "a-001" });
            markValidation(record, "invalidated", "wrong assumption");
            expect(record.validation_status).toBe("pending");
        });
    });
});
