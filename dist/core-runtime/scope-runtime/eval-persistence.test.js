/**
 * eval-persistence unit tests (W-C-04).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computePersistenceMetrics, logArtifactReuse, readReuseEvents, resolveEvalPath, } from "./eval-persistence.js";
describe("eval-persistence", () => {
    let tmpRoot;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-eval-persist-"));
    });
    afterEach(() => rmSync(tmpRoot, { recursive: true, force: true }));
    it("logArtifactReuse appends ndjson event", () => {
        logArtifactReuse(tmpRoot, {
            artifact_kind: "learning",
            artifact_ref: "~/.onto/learnings/logic.md:42",
            consumer_session: "20260416-review-001",
            consumer_activity: "review",
        });
        const raw = readFileSync(resolveEvalPath(tmpRoot), "utf-8");
        const event = JSON.parse(raw.trim());
        expect(event.type).toBe("artifact_reuse");
        expect(event.artifact_kind).toBe("learning");
        expect(event.artifact_ref).toBe("~/.onto/learnings/logic.md:42");
        expect(event.consumer_activity).toBe("review");
        expect(event.reused_at).toBeDefined();
    });
    it("multiple events appended as separate lines", () => {
        logArtifactReuse(tmpRoot, {
            artifact_kind: "learning",
            artifact_ref: "logic.md:1",
            consumer_session: "s1",
            consumer_activity: "review",
        });
        logArtifactReuse(tmpRoot, {
            artifact_kind: "ontology",
            artifact_ref: "builds/001/output.yaml",
            consumer_session: "s2",
            consumer_activity: "evolve",
        });
        const events = readReuseEvents(tmpRoot);
        expect(events.length).toBe(2);
        expect(events[0].artifact_kind).toBe("learning");
        expect(events[1].artifact_kind).toBe("ontology");
    });
    it("readReuseEvents returns empty for nonexistent file", () => {
        expect(readReuseEvents(tmpRoot)).toEqual([]);
    });
    it("computePersistenceMetrics calculates correctly", () => {
        logArtifactReuse(tmpRoot, {
            artifact_kind: "learning",
            artifact_ref: "logic.md:1",
            consumer_session: "s1",
            consumer_activity: "review",
        });
        logArtifactReuse(tmpRoot, {
            artifact_kind: "learning",
            artifact_ref: "logic.md:1",
            consumer_session: "s2",
            consumer_activity: "evolve",
        });
        logArtifactReuse(tmpRoot, {
            artifact_kind: "review_record",
            artifact_ref: "record-001.yaml",
            consumer_session: "s3",
            consumer_activity: "learn",
        });
        const events = readReuseEvents(tmpRoot);
        const metrics = computePersistenceMetrics(events);
        expect(metrics.total_reuse_events).toBe(3);
        expect(metrics.by_kind.learning).toBe(2);
        expect(metrics.by_kind.review_record).toBe(1);
        expect(metrics.unique_artifacts).toBe(2);
        expect(metrics.reuse_ratio).toBe(1.5);
    });
    it("computePersistenceMetrics handles empty events", () => {
        const metrics = computePersistenceMetrics([]);
        expect(metrics.total_reuse_events).toBe(0);
        expect(metrics.unique_artifacts).toBe(0);
        expect(metrics.reuse_ratio).toBe(0);
    });
});
