/**
 * govern CLI unit tests (W-C-01 v0).
 *
 * Covers: submit append / projection / decide transition / invalid-input guards.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleGovernCli } from "./cli.js";
import { resolveQueuePath } from "./queue.js";
describe("govern CLI v0", () => {
    let tmpRoot;
    let logs;
    let errs;
    let origLog;
    let origErr;
    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), "onto-govern-test-"));
        logs = [];
        errs = [];
        origLog = console.log;
        origErr = console.error;
        console.log = (...args) => {
            logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
        };
        console.error = (...args) => {
            errs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
        };
    });
    afterEach(() => {
        console.log = origLog;
        console.error = origErr;
        rmSync(tmpRoot, { recursive: true, force: true });
    });
    function lastLogJson() {
        return JSON.parse(logs[logs.length - 1]);
    }
    it("submit appends a queue event with origin=human → tag=norm_change", async () => {
        const code = await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            ".onto/authority/core-lexicon.yaml",
            "--json",
            JSON.stringify({ summary: "add new term", rationale: "test" }),
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(0);
        const result = lastLogJson();
        expect(result.status).toBe("queued");
        expect(result.origin).toBe("human");
        expect(result.tag).toBe("norm_change");
        expect(result.id).toMatch(/^g-/);
        const queuePath = resolveQueuePath(tmpRoot);
        const raw = readFileSync(queuePath, "utf-8");
        const lines = raw.trim().split("\n");
        expect(lines.length).toBe(1);
        const event = JSON.parse(lines[0]);
        expect(event.type).toBe("submit");
        expect(event.tag).toBe("norm_change");
        expect(event.payload.summary).toBe("add new term");
        expect(event.submitted_by).toBe("principal");
    });
    it("submit with origin=system maps to tag=drift and submitted_by=drift-engine", async () => {
        const code = await handleGovernCli("", [
            "submit",
            "--origin",
            "system",
            "--target",
            ".onto/processes/evolve.md",
            "--json",
            JSON.stringify({ detected: "doc-code drift at §3" }),
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(0);
        const result = lastLogJson();
        expect(result.tag).toBe("drift");
        expect(result.origin).toBe("system");
        const queuePath = resolveQueuePath(tmpRoot);
        const event = JSON.parse(readFileSync(queuePath, "utf-8").trim());
        expect(event.submitted_by).toBe("drift-engine");
    });
    it("list --status pending returns only pending entries", async () => {
        await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            "a.md",
            "--json",
            "{}",
            "--project-root",
            tmpRoot,
        ]);
        const submitResp = lastLogJson();
        const firstId = submitResp.id;
        await handleGovernCli("", [
            "submit",
            "--origin",
            "system",
            "--target",
            "b.md",
            "--json",
            "{}",
            "--project-root",
            tmpRoot,
        ]);
        await handleGovernCli("", [
            "decide",
            firstId,
            "--verdict",
            "approve",
            "--reason",
            "test approval",
            "--project-root",
            tmpRoot,
        ]);
        logs.length = 0;
        await handleGovernCli("", [
            "list",
            "--status",
            "pending",
            "--format",
            "json",
            "--project-root",
            tmpRoot,
        ]);
        const pending = lastLogJson();
        expect(pending.length).toBe(1);
        expect(pending[0].status).toBe("pending");
        expect(pending[0].id).not.toBe(firstId);
        logs.length = 0;
        await handleGovernCli("", [
            "list",
            "--status",
            "decided",
            "--format",
            "json",
            "--project-root",
            tmpRoot,
        ]);
        const decided = lastLogJson();
        expect(decided.length).toBe(1);
        expect(decided[0].id).toBe(firstId);
        expect(decided[0].verdict.verdict).toBe("approve");
        logs.length = 0;
        await handleGovernCli("", [
            "list",
            "--status",
            "all",
            "--format",
            "json",
            "--project-root",
            tmpRoot,
        ]);
        const all = lastLogJson();
        expect(all.length).toBe(2);
    });
    it("decide transitions entry to decided and records verdict + reason", async () => {
        await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            "x.md",
            "--json",
            "{}",
            "--project-root",
            tmpRoot,
        ]);
        const id = lastLogJson().id;
        logs.length = 0;
        const code = await handleGovernCli("", [
            "decide",
            id,
            "--verdict",
            "reject",
            "--reason",
            "not aligned with §1.4",
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(0);
        const result = lastLogJson();
        expect(result.status).toBe("decided");
        expect(result.verdict).toBe("reject");
        expect(result.note).toContain("거부");
        logs.length = 0;
        await handleGovernCli("", [
            "list",
            "--status",
            "decided",
            "--format",
            "json",
            "--project-root",
            tmpRoot,
        ]);
        const decided = lastLogJson();
        expect(decided[0].verdict.reason).toBe("not aligned with §1.4");
    });
    it("decide refuses re-decide on already-decided entry", async () => {
        await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            "x.md",
            "--json",
            "{}",
            "--project-root",
            tmpRoot,
        ]);
        const id = lastLogJson().id;
        await handleGovernCli("", [
            "decide",
            id,
            "--verdict",
            "approve",
            "--reason",
            "ok",
            "--project-root",
            tmpRoot,
        ]);
        const code = await handleGovernCli("", [
            "decide",
            id,
            "--verdict",
            "reject",
            "--reason",
            "change mind",
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(1);
        expect(errs.some((e) => e.includes("already decided"))).toBe(true);
    });
    it("submit rejects invalid origin", async () => {
        const code = await handleGovernCli("", [
            "submit",
            "--origin",
            "bogus",
            "--target",
            "a.md",
            "--json",
            "{}",
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(1);
        expect(errs.some((e) => e.includes("--origin must be"))).toBe(true);
    });
    it("submit rejects non-object JSON payload", async () => {
        const code = await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            "a.md",
            "--json",
            "[1,2,3]",
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(1);
        expect(errs.some((e) => e.includes("JSON object"))).toBe(true);
    });
    it("decide rejects unknown id", async () => {
        const code = await handleGovernCli("", [
            "decide",
            "g-nonexistent",
            "--verdict",
            "approve",
            "--reason",
            "x",
            "--project-root",
            tmpRoot,
        ]);
        expect(code).toBe(1);
        expect(errs.some((e) => e.includes("not found"))).toBe(true);
    });
    it("prompted-by-drift links a human submit to a drift id", async () => {
        await handleGovernCli("", [
            "submit",
            "--origin",
            "human",
            "--target",
            "doc.md",
            "--json",
            "{}",
            "--prompted-by-drift",
            "g-drift-123",
            "--project-root",
            tmpRoot,
        ]);
        const id = lastLogJson().id;
        logs.length = 0;
        await handleGovernCli("", [
            "list",
            "--status",
            "pending",
            "--format",
            "json",
            "--project-root",
            tmpRoot,
        ]);
        const entries = lastLogJson();
        const entry = entries.find((e) => e.id === id);
        expect(entry?.prompted_by_drift_id).toBe("g-drift-123");
    });
});
