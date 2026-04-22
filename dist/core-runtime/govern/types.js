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
export function originToTag(origin) {
    return origin === "human" ? "norm_change" : "drift";
}
