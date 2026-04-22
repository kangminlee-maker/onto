/**
 * ontology-path-classifier.ts — Review 세션의 ontology path 라벨링 + 경로 비교 metric
 *
 * W-A-75 (review-r+ / ontology-present path) + W-A-76 (review-r− / ontology-absent path).
 * 세션별로 r+ / r− / unknown 라벨을 부여하고, 두 경로 간 비용·품질 delta 를 산출한다.
 *
 * 현재 구현은 "환경 수준" classifier — project 에 ontology seat 이 존재했느냐를 시그널로 쓴다.
 * 세션별 ontology 소비 기록을 artifact 에 추가할 수 있게 되면 per-session 로직으로 확장한다.
 * (세부 설계 한계는 .onto/processes/review/ontology-path.md §5 참조)
 *
 * 소비자: W-A-75/76 evidence, onto:health, refresh protocol
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
// ─── Internal constants ───
const DEFAULT_ONTOLOGY_SEAT_FILENAMES = [
    // design/commands/start.ts signature
    "code-mapping.yaml",
    "behavior.yaml",
    "model.yaml",
    // 일반 pattern (다른 프로젝트 호환성)
    "ontology.yaml",
    "actions.yaml",
    "transitions.yaml",
];
const DEFAULT_SEARCH_ROOTS = ["ontology", "authority"];
const MAX_SCAN_DEPTH = 3;
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".onto", "dist", "build"]);
// ─── Core API ───
/**
 * 프로젝트 루트에서 ontology seat 을 탐지하고, 세션별 라벨과 cohort delta 를 산출한다.
 *
 * 현재는 "환경 수준" classifier — project 에 seat 이 존재하면 모든 세션이 r+,
 * 존재하지 않으면 모든 세션이 r− 로 라벨링된다. 세션별 per-session 라벨은
 * 향후 artifact 확장 후 구현 (.onto/processes/review/ontology-path.md §5 한계 항목).
 */
export function classifyReviewPaths(entries, projectRoot, options = {}) {
    const absProjectRoot = resolve(projectRoot);
    const seatFilenames = options.ontology_seat_filenames ?? DEFAULT_ONTOLOGY_SEAT_FILENAMES;
    const searchRoots = options.search_roots ?? DEFAULT_SEARCH_ROOTS;
    const seatPaths = detectOntologySeats(absProjectRoot, searchRoots, seatFilenames);
    const seatDetected = seatPaths.length > 0;
    const envLabel = seatDetected ? "r+" : "r-";
    const overrides = options.session_overrides ?? {};
    const sessions = entries.map((e) => {
        const override = overrides[e.session_id];
        const label = override ?? envLabel;
        // evidence 는 label=r+ 일 때만 의미 있음. override 로 r+ 지정됐는데 환경에 seat 이 있으면 그 seat 을 evidence 로 연결.
        const evidence = label === "r+" ? seatPaths : [];
        return {
            session_id: e.session_id,
            label,
            ontology_seat_evidence: evidence,
            total_duration_ms: e.total_duration_ms,
            degraded_lens_ratio: computeDegradedRatio(e),
            review_target_refs: e.review_target_refs,
        };
    });
    const rPlus = sessions.filter((s) => s.label === "r+");
    const rMinus = sessions.filter((s) => s.label === "r-");
    const cohortRPlus = aggregateCohort("r+", rPlus);
    const cohortRMinus = aggregateCohort("r-", rMinus);
    const delta = computeDelta(cohortRPlus, cohortRMinus);
    return {
        classified_at: new Date().toISOString(),
        project_root: absProjectRoot,
        ontology_seat_detected: seatDetected,
        ontology_seat_paths: seatPaths,
        sessions,
        cohort_r_plus: cohortRPlus,
        cohort_r_minus: cohortRMinus,
        delta,
    };
}
// ─── Internal helpers ───
function computeDegradedRatio(entry) {
    if (entry.lens_count <= 0)
        return null;
    return Math.round((entry.degraded_lens_ids.length / entry.lens_count) * 1000) / 1000;
}
function aggregateCohort(label, sessions) {
    if (sessions.length === 0) {
        return {
            label,
            session_count: 0,
            avg_duration_ms: null,
            avg_degraded_lens_ratio: null,
        };
    }
    const totalDuration = sessions.reduce((s, x) => s + x.total_duration_ms, 0);
    const avgDuration = Math.round(totalDuration / sessions.length);
    const ratioValues = sessions
        .map((s) => s.degraded_lens_ratio)
        .filter((v) => v !== null);
    const avgRatio = ratioValues.length === 0
        ? null
        : Math.round((ratioValues.reduce((s, x) => s + x, 0) / ratioValues.length) * 1000) / 1000;
    return {
        label,
        session_count: sessions.length,
        avg_duration_ms: avgDuration,
        avg_degraded_lens_ratio: avgRatio,
    };
}
function computeDelta(rPlus, rMinus) {
    let durationDelta = null;
    let durationRatio = null;
    if (rPlus.avg_duration_ms !== null && rMinus.avg_duration_ms !== null) {
        durationDelta = rPlus.avg_duration_ms - rMinus.avg_duration_ms;
        if (rMinus.avg_duration_ms > 0) {
            durationRatio = Math.round((rPlus.avg_duration_ms / rMinus.avg_duration_ms) * 1000) / 1000;
        }
    }
    let degradedDelta = null;
    if (rPlus.avg_degraded_lens_ratio !== null && rMinus.avg_degraded_lens_ratio !== null) {
        degradedDelta =
            Math.round((rPlus.avg_degraded_lens_ratio - rMinus.avg_degraded_lens_ratio) * 1000) / 1000;
    }
    return {
        r_plus: rPlus,
        r_minus: rMinus,
        duration_delta_ms: durationDelta,
        duration_ratio: durationRatio,
        degraded_ratio_delta: degradedDelta,
    };
}
/**
 * project 내에서 ontology seat 파일을 탐지한다.
 *
 * 탐색 범위:
 * - `{projectRoot}/{searchRoot}/**` 를 최대 MAX_SCAN_DEPTH 까지
 * - EXCLUDED_DIRS 제외
 *
 * 성능 고려: classifier 는 read-only observational tool 이므로 비용을 최소화.
 */
function detectOntologySeats(projectRoot, searchRoots, seatFilenames) {
    const found = new Set();
    const seatSet = new Set(seatFilenames);
    for (const rootName of searchRoots) {
        const rootPath = join(projectRoot, rootName);
        if (!safeIsDirectory(rootPath))
            continue;
        scanForSeats(rootPath, seatSet, 0, found);
    }
    return [...found].sort();
}
function scanForSeats(dir, seatSet, depth, found) {
    if (depth > MAX_SCAN_DEPTH)
        return;
    let names;
    try {
        names = readdirSync(dir);
    }
    catch {
        return;
    }
    for (const name of names) {
        if (EXCLUDED_DIRS.has(name))
            continue;
        const full = join(dir, name);
        if (seatSet.has(name)) {
            found.add(full);
            continue;
        }
        if (safeIsDirectory(full)) {
            scanForSeats(full, seatSet, depth + 1, found);
        }
    }
}
function safeIsDirectory(p) {
    if (!existsSync(p))
        return false;
    try {
        return statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
