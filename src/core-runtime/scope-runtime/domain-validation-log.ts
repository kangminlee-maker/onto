/**
 * domain-validation-log.ts — Domain knowledge 추정 적중률 계측 seat
 *
 * W-A-73: DL-017 기제 seat (reconstruct).
 * reconstruct(build) 활동에서 발생하는 domain assumption 의
 * validated/invalidated 비율을 기록·산출한다.
 *
 * 측정 대상 (§1.4 측면 3):
 *   - certainty 분류: observed / pending / rationale-absent / inferred / ambiguous / not-in-source
 *   - 적중률: inferred 분류 중 후속 검증에서 validated 된 비율
 *   - 가정 분포: Stage 1/Stage 2 분류 비율
 *
 * reconstruct 활동이 아직 완전 구현되지 않았으므로(W-A-74 pending),
 * 본 모듈은 데이터 모델과 수집·산출 함수의 **seat** 을 제공한다.
 * 실제 reconstruct 파이프라인 연동은 W-A-74 에서 수행.
 *
 * 소비자: W-A-74 (reconstruct-cli), onto:health (W-A-59), refresh protocol (§4)
 */

// ─── Public Types ───

/** Stage 1 certainty (Explorer 분류) */
export type Stage1Certainty = "observed" | "pending";

/** Stage 2 certainty (Lens 세분화) */
export type Stage2Certainty =
  | "rationale-absent"
  | "inferred"
  | "ambiguous"
  | "not-in-source";

/** 하나의 domain assumption 기록 */
export interface DomainAssumptionRecord {
  /** 고유 식별자 */
  assumption_id: string;
  /** build 세션 식별자 */
  session_id: string;
  /** 가정이 관련된 도메인 */
  domain: string;
  /** Stage 1 분류 */
  stage1_certainty: Stage1Certainty;
  /** Stage 2 분류 (pending 에서 세분화된 경우) */
  stage2_certainty: Stage2Certainty | null;
  /** 가정 내용 요약 */
  description: string;
  /** inferred 일 때 abduction quality */
  abduction_quality?: AbductionQuality;
  /** 후속 검증 결과 */
  validation_status: ValidationStatus;
  /** 검증 시점 (ISO 8601) */
  validated_at: string | null;
  /** 검증 근거 */
  validation_evidence: string | null;
}

export interface AbductionQuality {
  explanatory_power: "high" | "medium" | "low";
  coherence: "consistent" | "partial" | "conflicting";
}

export type ValidationStatus =
  | "pending"      // 아직 검증되지 않음
  | "validated"    // 주체자가 확인
  | "invalidated"  // 주체자가 부정
  | "revised";     // 부분적으로 수정

/** 적중률 metric */
export interface DomainValidationMetric {
  domain: string;
  total_assumptions: number;
  /** Stage 1 분류 분포 */
  stage1_distribution: {
    observed: number;
    pending: number;
  };
  /** Stage 2 분류 분포 (pending 에서 세분화된 것만) */
  stage2_distribution: {
    rationale_absent: number;
    inferred: number;
    ambiguous: number;
    not_in_source: number;
  };
  /** inferred 중 검증 완료 건수 */
  inferred_validated: number;
  /** inferred 중 무효화 건수 */
  inferred_invalidated: number;
  /** inferred 중 수정 건수 */
  inferred_revised: number;
  /** inferred 중 미검증 건수 */
  inferred_pending: number;
  /** 적중률: validated / (validated + invalidated + revised). 검증 완료 건이 없으면 null */
  accuracy_ratio: number | null;
}

/** 전체 요약 */
export interface DomainValidationSummary {
  collected_at: string;
  total_records: number;
  per_domain: DomainValidationMetric[];
  overall_accuracy_ratio: number | null;
}

// ─── Core API ───

/**
 * DomainAssumptionRecord 목록에서 도메인별 적중률 metric 을 산출한다.
 */
export function computeValidationMetrics(
  records: DomainAssumptionRecord[],
): DomainValidationSummary {
  if (records.length === 0) {
    return {
      collected_at: new Date().toISOString(),
      total_records: 0,
      per_domain: [],
      overall_accuracy_ratio: null,
    };
  }

  // 도메인별 그룹화
  const groups = new Map<string, DomainAssumptionRecord[]>();
  for (const r of records) {
    const group = groups.get(r.domain) ?? [];
    group.push(r);
    groups.set(r.domain, group);
  }

  const perDomain: DomainValidationMetric[] = [];
  let totalValidated = 0;
  let totalInvalidated = 0;
  let totalRevised = 0;

  for (const [domain, group] of groups) {
    const metric = computeDomainMetric(domain, group);
    perDomain.push(metric);
    totalValidated += metric.inferred_validated;
    totalInvalidated += metric.inferred_invalidated;
    totalRevised += metric.inferred_revised;
  }

  perDomain.sort((a, b) => a.domain.localeCompare(b.domain));

  const resolved = totalValidated + totalInvalidated + totalRevised;
  const overallAccuracy = resolved > 0
    ? Math.round((totalValidated / resolved) * 1000) / 1000
    : null;

  return {
    collected_at: new Date().toISOString(),
    total_records: records.length,
    per_domain: perDomain,
    overall_accuracy_ratio: overallAccuracy,
  };
}

function computeDomainMetric(
  domain: string,
  records: DomainAssumptionRecord[],
): DomainValidationMetric {
  const stage1 = { observed: 0, pending: 0 };
  const stage2 = { rationale_absent: 0, inferred: 0, ambiguous: 0, not_in_source: 0 };
  let inferredValidated = 0;
  let inferredInvalidated = 0;
  let inferredRevised = 0;
  let inferredPending = 0;

  for (const r of records) {
    // Stage 1
    stage1[r.stage1_certainty]++;

    // Stage 2
    if (r.stage2_certainty) {
      const key = r.stage2_certainty.replace("-", "_") as keyof typeof stage2;
      if (key in stage2) stage2[key]++;
    }

    // inferred 검증 추적
    if (r.stage2_certainty === "inferred") {
      switch (r.validation_status) {
        case "validated":
          inferredValidated++;
          break;
        case "invalidated":
          inferredInvalidated++;
          break;
        case "revised":
          inferredRevised++;
          break;
        case "pending":
          inferredPending++;
          break;
      }
    }
  }

  const resolved = inferredValidated + inferredInvalidated + inferredRevised;
  const accuracy = resolved > 0
    ? Math.round((inferredValidated / resolved) * 1000) / 1000
    : null;

  return {
    domain,
    total_assumptions: records.length,
    stage1_distribution: stage1,
    stage2_distribution: stage2,
    inferred_validated: inferredValidated,
    inferred_invalidated: inferredInvalidated,
    inferred_revised: inferredRevised,
    inferred_pending: inferredPending,
    accuracy_ratio: accuracy,
  };
}

/**
 * DomainAssumptionRecord 를 생성하는 팩터리.
 * reconstruct 파이프라인(W-A-74)에서 가정 발견 시 호출.
 */
export function createAssumptionRecord(
  params: Omit<DomainAssumptionRecord, "validation_status" | "validated_at" | "validation_evidence">,
): DomainAssumptionRecord {
  return {
    ...params,
    validation_status: "pending",
    validated_at: null,
    validation_evidence: null,
  };
}

/**
 * 기존 record 에 검증 결과를 기록한다.
 * Phase 3 (주체자 확인) 에서 호출.
 */
export function markValidation(
  record: DomainAssumptionRecord,
  status: "validated" | "invalidated" | "revised",
  evidence: string,
): DomainAssumptionRecord {
  return {
    ...record,
    validation_status: status,
    validated_at: new Date().toISOString(),
    validation_evidence: evidence,
  };
}
