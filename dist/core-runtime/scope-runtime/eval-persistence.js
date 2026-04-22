/**
 * eval-persistence — 산출물 재사용 횟수·비율 측정 (W-C-04, §1.4 측면 2 지속성).
 *
 * 지속성 = LLM 모델 교체 전후 eval 통과율 회귀 0.
 * 본 모듈은 산출물 (review record, learning, ontology) 이 **재사용** 되는 이벤트를 기록하고,
 * 재사용 횟수·비율을 산출하는 계측 seat.
 *
 * 저장: .onto/eval/persistence-log.ndjson (product-local, append-only event log)
 *
 * 이벤트 타입:
 *   - artifact_reuse: 기존 산출물이 새 session 에서 소비됨 (예: learning load, ontology reference)
 *
 * 소비자:
 *   - §1.4 지속성 metric dashboard (향후)
 *   - W-C-05 consumption feedback 와 보완 관계 (W-C-05 = learning 소비 baseline, W-C-04 = 산출물 전반 재사용)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
export function resolveEvalPath(projectRoot) {
    return join(projectRoot, ".onto", "eval", "persistence-log.ndjson");
}
export function logArtifactReuse(projectRoot, event, now = new Date()) {
    const logPath = resolveEvalPath(projectRoot);
    const dir = dirname(logPath);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    const full = {
        type: "artifact_reuse",
        ...event,
        reused_at: now.toISOString(),
    };
    appendFileSync(logPath, JSON.stringify(full) + "\n", "utf-8");
}
export function readReuseEvents(projectRoot) {
    const logPath = resolveEvalPath(projectRoot);
    if (!existsSync(logPath))
        return [];
    const raw = readFileSync(logPath, "utf-8");
    const events = [];
    for (const line of raw.split("\n")) {
        if (!line.trim())
            continue;
        try {
            const parsed = JSON.parse(line);
            if (parsed?.type === "artifact_reuse")
                events.push(parsed);
        }
        catch { /* skip malformed */ }
    }
    return events;
}
export function computePersistenceMetrics(events) {
    const byKind = {};
    const uniqueRefs = new Set();
    for (const ev of events) {
        byKind[ev.artifact_kind] = (byKind[ev.artifact_kind] ?? 0) + 1;
        uniqueRefs.add(`${ev.artifact_kind}:${ev.artifact_ref}`);
    }
    return {
        total_reuse_events: events.length,
        by_kind: byKind,
        unique_artifacts: uniqueRefs.size,
        reuse_ratio: uniqueRefs.size > 0 ? events.length / uniqueRefs.size : 0,
    };
}
