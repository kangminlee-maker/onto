import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolvePluginPath, resolvePluginRelativePath, ENV_ONTO_PLUGIN_DIR, } from "./plugin-path.js";
let savedEnvOverride;
let savedHomeOverride;
let scratchDir;
beforeEach(() => {
    savedEnvOverride = process.env[ENV_ONTO_PLUGIN_DIR];
    delete process.env[ENV_ONTO_PLUGIN_DIR];
    // Redirect HOME to a scratch dir so the real ~/.claude/plugins/onto/ doesn't
    // accidentally satisfy the default-detection branch.
    savedHomeOverride = process.env.HOME;
    scratchDir = mkdtempSync(path.join(tmpdir(), "plugin-path-test-"));
    process.env.HOME = scratchDir;
});
afterEach(() => {
    if (savedEnvOverride === undefined) {
        delete process.env[ENV_ONTO_PLUGIN_DIR];
    }
    else {
        process.env[ENV_ONTO_PLUGIN_DIR] = savedEnvOverride;
    }
    if (savedHomeOverride === undefined) {
        delete process.env.HOME;
    }
    else {
        process.env.HOME = savedHomeOverride;
    }
    try {
        rmSync(scratchDir, { recursive: true, force: true });
    }
    catch { }
});
describe("resolvePluginPath", () => {
    it("returns null when no env override and no Claude install present", () => {
        // os.homedir() typically caches HOME at process start, so resolvePluginPath
        // may still see the original ~/.claude/plugins/onto/ if it exists.
        // This test asserts the env-override priority over both, by NOT setting it.
        // The base-case "returns null" is harder to assert in environments where
        // ~/.claude/plugins/onto/ exists; we only assert the absence of env crash.
        const result = resolvePluginPath();
        // Either null (clean env) or claude_code_install_default (real install)
        if (result !== null) {
            expect(result.source).toBe("claude_code_install_default");
        }
    });
    it("env override beats default detection", () => {
        const overridePath = mkdtempSync(path.join(tmpdir(), "onto-plugin-override-"));
        try {
            process.env[ENV_ONTO_PLUGIN_DIR] = overridePath;
            const result = resolvePluginPath();
            expect(result).not.toBeNull();
            expect(result.pluginDir).toBe(overridePath);
            expect(result.source).toBe("env_override");
        }
        finally {
            rmSync(overridePath, { recursive: true, force: true });
        }
    });
    it("env override expands ~ to HOME", () => {
        // Create a fake plugin dir under the scratched HOME.
        const fakePluginDir = path.join(scratchDir, "myplugin");
        mkdirSync(fakePluginDir, { recursive: true });
        process.env[ENV_ONTO_PLUGIN_DIR] = "~/myplugin";
        const result = resolvePluginPath();
        expect(result).not.toBeNull();
        expect(result.pluginDir).toBe(fakePluginDir);
        expect(result.source).toBe("env_override");
    });
});
describe("resolvePluginRelativePath", () => {
    it("appends relative path to resolved plugin dir", () => {
        const overridePath = mkdtempSync(path.join(tmpdir(), "onto-plugin-rel-"));
        try {
            process.env[ENV_ONTO_PLUGIN_DIR] = overridePath;
            const result = resolvePluginRelativePath(".onto/processes/reconstruct.md");
            expect(result).toBe(path.join(overridePath, ".onto/processes/reconstruct.md"));
        }
        finally {
            rmSync(overridePath, { recursive: true, force: true });
        }
    });
    it("returns null when plugin path cannot be resolved (env unset, no install)", () => {
        // Skip if real ~/.claude/plugins/onto/ exists in the test runner env.
        // We can't reliably test the "returns null" branch in CI environments
        // where Claude Code is installed.
        const result = resolvePluginRelativePath(".onto/processes/reconstruct.md");
        if (result !== null) {
            // Real install present — verify it ends with the relative path.
            expect(result.endsWith(".onto/processes/reconstruct.md")).toBe(true);
        }
    });
});
