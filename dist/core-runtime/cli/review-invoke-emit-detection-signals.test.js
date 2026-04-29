/**
 * runReviewInvokeCli `--emit-detection-signals` early-exit path — E2E.
 *
 * Phase B-2 (PR #251 round 5 U6 deferred). Schema invariants are
 * covered by `src/core-runtime/review/detection-signals.test.ts`;
 * this file covers the CLI integration surface that round 5 review
 * flagged as missing — early-exit purity, stdout JSON shape, no
 * target requirement, parse error emission, and `--project-root`
 * behavior.
 *
 * Why CLI-level coverage matters: the unit tests verify
 * `gatherDetectionSignals` and `readConfigWithParseHealth` work in
 * isolation, but `runReviewInvokeCli` is what host prose actually
 * invokes. Regressions in the early-exit branch (e.g., accidentally
 * starting a session, mutating env, requiring a target) would slip
 * past the unit tests. These tests anchor the CLI contract.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runReviewInvokeCli } from "./review-invoke.js";
const HOST_ENV_VARS = [
    "ONTO_HOST_RUNTIME",
    "CLAUDECODE",
    "CLAUDE_PROJECT_DIR",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
    "CODEX_THREAD_ID",
    "CODEX_CI",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "LITELLM_BASE_URL",
    "ONTO_HOME",
];
let savedEnv = {};
let isolatedHome;
const trackedTempDirs = [];
let stdoutSpy;
function isolateEnv() {
    savedEnv = {};
    for (const key of HOST_ENV_VARS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
    }
    savedEnv.PATH = process.env.PATH;
    process.env.PATH = "";
    savedEnv.HOME = process.env.HOME;
    isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-emit-signals-home-"));
    process.env.HOME = isolatedHome;
}
function restoreEnv() {
    for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) {
            delete process.env[key];
        }
        else {
            process.env[key] = value;
        }
    }
    if (isolatedHome && fs.existsSync(isolatedHome)) {
        fs.rmSync(isolatedHome, { recursive: true, force: true });
    }
    while (trackedTempDirs.length > 0) {
        const dir = trackedTempDirs.pop();
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}
function makeProjectRootWith(configContent) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-emit-signals-project-"));
    trackedTempDirs.push(dir);
    if (configContent !== null) {
        fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
        fs.writeFileSync(path.join(dir, ".onto", "config.yml"), configContent, "utf8");
    }
    return dir;
}
function captureStdout() {
    return stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
}
beforeEach(() => {
    isolateEnv();
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => {
    stdoutSpy.mockRestore();
    restoreEnv();
});
describe("runReviewInvokeCli --emit-detection-signals — early exit purity", () => {
    it("returns 0 without starting any session (early exit before resolveReviewInvokeSetup)", async () => {
        const root = makeProjectRootWith(null);
        // Crucially, NO target/intent positional args. The early-exit
        // branch must reach completion without the input-resolution
        // pipeline (which requires a target).
        const exitCode = await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        expect(exitCode).toBe(0);
    });
    it("does NOT mutate process.env.ONTO_HOME (resolveReviewInvokeSetup is bypassed)", async () => {
        // resolveReviewInvokeSetup sets process.env.ONTO_HOME as a side
        // effect for downstream spawned children. The emit-signals branch
        // must not trigger that mutation — it is a pure read.
        const root = makeProjectRootWith(null);
        expect(process.env.ONTO_HOME).toBeUndefined();
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        expect(process.env.ONTO_HOME).toBeUndefined();
    });
});
describe("runReviewInvokeCli --emit-detection-signals — stdout JSON shape", () => {
    it("emits valid JSON with all 11 leaf fields in v1 schema order", async () => {
        const root = makeProjectRootWith("review:\n  teamlead:\n    kind: main\n");
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        const out = captureStdout();
        const parsed = JSON.parse(out);
        expect(parsed.schema_version).toBe("v1");
        expect(parsed.review_block_declared).toBe(true);
        expect(parsed.config_parse_error).toBeNull();
        // Field order matters for host-prose regex parsing — see
        // detection-signals-contract.md §3.3.
        const keys = Object.keys(JSON.parse(out));
        expect(keys).toEqual([
            "schema_version",
            "host_detected",
            "claude_code_teams_env_set",
            "codex",
            "litellm_base_url_set",
            "credentials",
            "review_block_declared",
            "config_parse_error",
        ]);
    });
    it("emits exactly one trailing newline after the JSON", async () => {
        const root = makeProjectRootWith(null);
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        const out = captureStdout();
        expect(out.endsWith("\n")).toBe(true);
        expect(out.endsWith("\n\n")).toBe(false);
    });
});
describe("runReviewInvokeCli --emit-detection-signals — config_parse_error emission", () => {
    it("absent .onto/config.yml → review_block_declared=false, parseError=null (first-run signal)", async () => {
        const root = makeProjectRootWith(null);
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        const parsed = JSON.parse(captureStdout());
        expect(parsed.review_block_declared).toBe(false);
        expect(parsed.config_parse_error).toBeNull();
    });
    it("malformed YAML → parseError set, review_block_declared=false (fail-fast signal)", async () => {
        const root = makeProjectRootWith("review:\n  teamlead: {kind: main\n  unclosed");
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        const parsed = JSON.parse(captureStdout());
        expect(parsed.review_block_declared).toBe(false);
        expect(parsed.config_parse_error).toMatch(/^Failed to parse YAML/);
    });
    it("YAML scalar root → parseError 'Config root is not a YAML object' (round 4 CC1)", async () => {
        const root = makeProjectRootWith("just-a-string\n");
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            root,
        ]);
        const parsed = JSON.parse(captureStdout());
        expect(parsed.config_parse_error).toMatch(/^Config root is not a YAML object/);
    });
});
describe("runReviewInvokeCli --emit-detection-signals — --project-root resolution", () => {
    it("emits review_block_declared based on the SPECIFIED project root (not cwd)", async () => {
        const rootWithBlock = makeProjectRootWith("review:\n  teamlead:\n    kind: main\n");
        const rootWithoutBlock = makeProjectRootWith(null);
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            rootWithBlock,
        ]);
        const parsedWith = JSON.parse(captureStdout());
        expect(parsedWith.review_block_declared).toBe(true);
        // Reset stdout spy for second invocation in the same test run.
        stdoutSpy.mockClear();
        await runReviewInvokeCli([
            "--emit-detection-signals",
            "--project-root",
            rootWithoutBlock,
        ]);
        const parsedWithout = JSON.parse(captureStdout());
        expect(parsedWithout.review_block_declared).toBe(false);
    });
});
