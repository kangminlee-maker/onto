/**
 * Predicate for consumers: returns true when `duration_ms` is a real per-unit
 * measurement safe to average / sort / SLA-compare. Returns false for
 * `batch_fallback` and for absent values (older artifacts that predate this
 * field are treated conservatively as non-comparable).
 *
 * As of PR #26 there are no in-repo consumers of per-unit `duration_ms` —
 * this predicate is the recommended entry point for future aggregation,
 * reporting, or health-snapshot code.
 */
export function isPerUnitComparableProvenance(provenance) {
    return (provenance === "runner_wallclock" || provenance === "coordinator_derived");
}
// ALLOWED_TRANSITIONS: canonical definition is in scope-runtime/state-machine.ts (REVIEW_TRANSITIONS).
// Re-exported here for backward compatibility. W-B-02 dedup.
export { REVIEW_TRANSITIONS as ALLOWED_TRANSITIONS } from "../scope-runtime/state-machine.js";
