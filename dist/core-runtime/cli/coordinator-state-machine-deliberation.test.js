/**
 * Tests for coordinator-state-machine deliberation handling (C-1).
 *
 * Two invariants pinned:
 *   1. awaiting_synthesize_dispatch → completing must fail-fast when the
 *      synthesis output declares `deliberation_status:
 *      required_but_unperformed` (synthesize task failed; do not silently
 *      advance to completed).
 *   2. Reaching `awaiting_deliberation` is a wiring defect — the canonical
 *      review flow has no external deliberation agent. Error message must
 *      point the caller at the upstream transition, not at a missing
 *      implementation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { coordinatorNext } from "./coordinator-state-machine.js";
async function makeSessionRoot(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), `onto-coord-delib-${prefix}-`));
}
async function writeState(sessionRoot, state) {
    const now = new Date().toISOString();
    await fs.writeFile(path.join(sessionRoot, "coordinator-state.yaml"), YAML.stringify({
        schema_version: "1",
        current_state: state,
        session_root: sessionRoot,
        request_text: "deliberation guard test",
        started_at: now,
        halt_reason: null,
        error_message: null,
        transitions: [
            { from: "(init)", to: "preparing", at: now },
            { from: "preparing", to: "awaiting_lens_dispatch", at: now },
            {
                from: "awaiting_lens_dispatch",
                to: "validating_lenses",
                at: now,
            },
            {
                from: "validating_lenses",
                to: "awaiting_synthesize_dispatch",
                at: now,
            },
        ],
    }), "utf8");
}
async function writeExecutionPlan(sessionRoot, synthesisOutputPath) {
    await fs.writeFile(path.join(sessionRoot, "execution-plan.yaml"), YAML.stringify({
        session_id: "test-session",
        synthesis_output_path: synthesisOutputPath,
        max_concurrent_lenses: 5,
    }), "utf8");
}
async function writeSynthesisOutput(filePath, deliberationStatus) {
    const body = `---\n` +
        `deliberation_status: ${deliberationStatus}\n` +
        `participation:\n` +
        `  expected_lenses: [logic]\n` +
        `  received_lenses: [logic]\n` +
        `  run_status: full\n` +
        `---\n\n` +
        `## Consensus\n\nnothing contested\n`;
    await fs.writeFile(filePath, body, "utf8");
}
describe("coordinator-state-machine — deliberation-status guard (C-1)", () => {
    const sessionRoots = [];
    beforeEach(() => {
        sessionRoots.length = 0;
    });
    afterEach(async () => {
        for (const root of sessionRoots) {
            try {
                await fs.rm(root, { recursive: true, force: true });
            }
            catch {
                // ignore
            }
        }
    });
    it("fails fast when synthesis declares required_but_unperformed", async () => {
        const sessionRoot = await makeSessionRoot("req-unperf");
        sessionRoots.push(sessionRoot);
        const synthesisPath = path.join(sessionRoot, "synthesis.md");
        await writeSynthesisOutput(synthesisPath, "required_but_unperformed");
        await writeExecutionPlan(sessionRoot, synthesisPath);
        await writeState(sessionRoot, "awaiting_synthesize_dispatch");
        const result = await coordinatorNext(sessionRoot, sessionRoot);
        // completing auto-state caught the invariant violation and transitioned
        // to failed rather than completed.
        expect(result.state).toBe("failed");
        if (result.state === "failed") {
            expect(result.error_message).toMatch(/required_but_unperformed/);
            expect(result.error_message).toMatch(/synthesize/i);
        }
        // On-disk state must not be `completed`.
        const diskRaw = await fs.readFile(path.join(sessionRoot, "coordinator-state.yaml"), "utf8");
        const disk = YAML.parse(diskRaw);
        expect(disk.current_state).not.toBe("completed");
    });
    it("advances normally when synthesis declares performed", async () => {
        const sessionRoot = await makeSessionRoot("performed");
        sessionRoots.push(sessionRoot);
        const synthesisPath = path.join(sessionRoot, "synthesis.md");
        await writeSynthesisOutput(synthesisPath, "performed");
        await writeExecutionPlan(sessionRoot, synthesisPath);
        await writeState(sessionRoot, "awaiting_synthesize_dispatch");
        // The completing auto-state runs multiple downstream steps
        // (writeExecutionResult / completeReviewSession). In the hermetic
        // fixture those will fail before reaching `completed`, but the
        // key invariant for C-1 is: failure must NOT be from the
        // deliberation-status guard. Any error that *does* occur must
        // come from a later step (not mentioning required_but_unperformed).
        const result = await coordinatorNext(sessionRoot, sessionRoot);
        if (result.state === "failed") {
            expect(result.error_message ?? "").not.toMatch(/required_but_unperformed/);
        }
        // Either the run advanced to completed or failed for an unrelated
        // downstream reason — both outcomes clear the guard.
    });
    it("advances normally when synthesis declares not_needed", async () => {
        const sessionRoot = await makeSessionRoot("not-needed");
        sessionRoots.push(sessionRoot);
        const synthesisPath = path.join(sessionRoot, "synthesis.md");
        await writeSynthesisOutput(synthesisPath, "not_needed");
        await writeExecutionPlan(sessionRoot, synthesisPath);
        await writeState(sessionRoot, "awaiting_synthesize_dispatch");
        const result = await coordinatorNext(sessionRoot, sessionRoot);
        if (result.state === "failed") {
            expect(result.error_message ?? "").not.toMatch(/required_but_unperformed/);
        }
    });
});
describe("coordinator-state-machine — awaiting_deliberation invariant (C-1)", () => {
    const sessionRoots = [];
    afterEach(async () => {
        for (const root of sessionRoots) {
            try {
                await fs.rm(root, { recursive: true, force: true });
            }
            catch {
                // ignore
            }
        }
        sessionRoots.length = 0;
    });
    it("throws a wiring-defect error (not a 'not implemented' error)", async () => {
        const sessionRoot = await makeSessionRoot("unreachable");
        sessionRoots.push(sessionRoot);
        // Hand-craft a state file that directly claims awaiting_deliberation.
        // The canonical flow never produces this, but a wiring defect could.
        const now = new Date().toISOString();
        fsSync.writeFileSync(path.join(sessionRoot, "coordinator-state.yaml"), YAML.stringify({
            schema_version: "1",
            current_state: "awaiting_deliberation",
            session_root: sessionRoot,
            request_text: "invariant test",
            started_at: now,
            halt_reason: null,
            error_message: null,
            transitions: [{ from: "(init)", to: "preparing", at: now }],
        }), "utf8");
        await expect(coordinatorNext(sessionRoot, sessionRoot)).rejects.toThrow(/unreachable|wiring defect|investigate the caller/);
    });
});
