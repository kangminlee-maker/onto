/**
 * govern runtime v0 — types.
 *
 * Bounded minimum surface (W-C-01, 2026-04-16):
 *   - submit event: 규범 변경 제안 / drift 감지 항목 큐 append
 *   - decide event: Principal 판정 기록 (v0 는 기록만, 차단은 W-C-02)
 *
 * origin → tag 매핑은 deterministic:
 *   origin=human  → tag=norm_change
 *   origin=system → tag=drift
 *
 * cross-project 규범은 W-C-03 에서 설계. v0 는 프로젝트 로컬 한정.
 */

export type GovernOrigin = "human" | "system";
export type GovernTag = "norm_change" | "drift";
export type GovernVerdict = "approve" | "reject";
export type GovernEventType = "submit" | "decide";

export interface GovernSubmitEvent {
  type: "submit";
  id: string;
  origin: GovernOrigin;
  tag: GovernTag;
  target: string;
  payload: Record<string, unknown>;
  prompted_by_drift_id?: string;
  submitted_at: string;
  submitted_by: string;
}

export interface GovernDecideEvent {
  type: "decide";
  id: string;
  verdict: GovernVerdict;
  reason: string;
  decided_at: string;
  decided_by: string;
}

export type GovernEvent = GovernSubmitEvent | GovernDecideEvent;

export interface GovernQueueEntry {
  id: string;
  origin: GovernOrigin;
  tag: GovernTag;
  target: string;
  payload: Record<string, unknown>;
  prompted_by_drift_id?: string;
  submitted_at: string;
  submitted_by: string;
  status: "pending" | "decided";
  verdict?: {
    verdict: GovernVerdict;
    reason: string;
    decided_at: string;
    decided_by: string;
  };
}

export function originToTag(origin: GovernOrigin): GovernTag {
  return origin === "human" ? "norm_change" : "drift";
}
