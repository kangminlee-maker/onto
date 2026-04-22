import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolveLearningProviderConfig, logLiteLLMIssue, __resetNoticeFlagsForTests, } from "./llm-caller.js";
// ─── Helpers ───
const originalEnv = { ...process.env };
function clearLlmEnv() {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LITELLM_BASE_URL;
    delete process.env.LITELLM_API_KEY;
    delete process.env.ONTO_LLM_MOCK;
    delete process.env.ONTO_SUPPRESS_CODEX_INSTALL_NOTICE;
}
function restoreEnv() {
    for (const k of Object.keys(process.env)) {
        if (!(k in originalEnv))
            delete process.env[k];
    }
    for (const [k, v] of Object.entries(originalEnv)) {
        process.env[k] = v;
    }
}
/**
 * Create a temp HOME dir containing a writable ~/.codex so we can vary auth.json
 * without touching the real user directory.
 */
function createTmpHome() {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "onto-llm-caller-test-"));
    fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
    return {
        home,
        cleanup: () => {
            fs.rmSync(home, { recursive: true, force: true });
        },
    };
}
function writeAuthJson(home, content) {
    fs.writeFileSync(path.join(home, ".codex", "auth.json"), JSON.stringify(content), "utf8");
}
/**
 * Exercise resolveProvider indirectly via the exported surface that callLlm uses.
 * We can't import resolveProvider directly (it's private), so we trigger
 * resolution paths by calling callLlm with a guaranteed-to-fail-but-observable
 * provider, or by hitting the no-provider error path which surfaces guidance.
 *
 * Most behavior tests route through a separate module that re-exports the
 * resolver for test purposes, but here we use the module's public throw paths.
 */
async function attemptResolve() {
    // We import dynamically to pick up env changes; callLlm mocks would need fetch stubs.
    // Use ONTO_LLM_MOCK=1 to short-circuit actual API calls — but that short-circuits
    // BEFORE resolveProvider, which defeats the test. Instead we rely on the throw.
    const { callLlm } = await import("./llm-caller.js");
    try {
        await callLlm("sys", "user", { max_tokens: 1 });
        return { ok: true, text: "unreachable — no real credential should be valid in tests" };
    }
    catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}
// ─── resolveLearningProviderConfig (bridge, pure function) ───
describe("resolveLearningProviderConfig", () => {
    it("T16: CLI overrides beat OntoConfig for every field", () => {
        const config = {
            external_http_provider: "litellm",
            llm_base_url: "http://config:4000/v1",
            model: "config-model",
        };
        const cli = {
            provider: "anthropic",
            llm_base_url: "http://cli:4000/v1",
            model: "cli-model",
        };
        const out = resolveLearningProviderConfig({ config, cliOverrides: cli });
        expect(out.provider).toBe("anthropic");
        expect(out.base_url).toBe("http://cli:4000/v1");
        expect(out.model_id).toBe("cli-model");
    });
    it("falls back to config when CLI overrides absent", () => {
        const out = resolveLearningProviderConfig({
            config: { external_http_provider: "codex", model: "gpt-5", codex: { model: "codex-x", effort: "high" } },
        });
        expect(out.provider).toBe("codex");
        // codex uses config.codex.model override over config.model
        expect(out.model_id).toBe("codex-x");
        expect(out.reasoning_effort).toBe("high");
    });
    it("per-provider model override applies for anthropic", () => {
        const out = resolveLearningProviderConfig({
            config: {
                external_http_provider: "anthropic",
                anthropic: { model: "claude-sonnet-4" },
                model: "generic-fallback",
            },
        });
        expect(out.provider).toBe("anthropic");
        expect(out.model_id).toBe("claude-sonnet-4");
    });
    it("per-provider model override applies for openai", () => {
        const out = resolveLearningProviderConfig({
            config: { external_http_provider: "openai", openai: { model: "gpt-4o" }, model: "other" },
        });
        expect(out.model_id).toBe("gpt-4o");
    });
    it("per-provider model override applies for litellm", () => {
        const out = resolveLearningProviderConfig({
            config: { external_http_provider: "litellm", litellm: { model: "local-llama" }, model: "other" },
        });
        expect(out.model_id).toBe("local-llama");
    });
    it("falls back to top-level model when per-provider absent", () => {
        const out = resolveLearningProviderConfig({
            config: { external_http_provider: "openai", model: "fallback-model" },
        });
        expect(out.model_id).toBe("fallback-model");
    });
    it("auto-resolution (no provider) emits models_per_provider for dispatch-time lookup", () => {
        // Per-provider models are carried through to dispatch so they apply after
        // resolveProvider picks. This closes the earlier UX gap where
        // `anthropic: { model: X }` was silently ignored under auto-resolution.
        const out = resolveLearningProviderConfig({
            config: {
                anthropic: { model: "ant-model" },
                openai: { model: "oa-model" },
                model: "top-level-fallback",
            },
        });
        expect(out.provider).toBeUndefined();
        expect(out.model_id).toBe("top-level-fallback");
        expect(out.models_per_provider).toEqual({
            anthropic: "ant-model",
            openai: "oa-model",
        });
    });
    it("auto-resolution with only per-provider set → models_per_provider carries, top-level absent", () => {
        const out = resolveLearningProviderConfig({
            config: { anthropic: { model: "claude-opus-4" } },
        });
        expect(out.provider).toBeUndefined();
        expect(out.model_id).toBeUndefined();
        expect(out.models_per_provider).toEqual({ anthropic: "claude-opus-4" });
    });
    it("reasoning_effort passes through regardless of provider being explicit", () => {
        // codex.effort must reach dispatch even when external_http_provider isn't set,
        // since cost-order may still pick codex.
        const out = resolveLearningProviderConfig({
            config: { codex: { effort: "high" } },
        });
        expect(out.reasoning_effort).toBe("high");
    });
    it("env LITELLM_BASE_URL beats config.llm_base_url when CLI absent", () => {
        process.env.LITELLM_BASE_URL = "http://env:4000/v1";
        try {
            const out = resolveLearningProviderConfig({
                config: { llm_base_url: "http://config:4000/v1" },
            });
            expect(out.base_url).toBe("http://env:4000/v1");
        }
        finally {
            delete process.env.LITELLM_BASE_URL;
        }
    });
    it("narrows invalid external_http_provider values to undefined", () => {
        const out = resolveLearningProviderConfig({ config: { external_http_provider: "main-model" } });
        expect(out.provider).toBeUndefined();
    });
    it("returns empty object when nothing provided", () => {
        const out = resolveLearningProviderConfig({});
        expect(Object.keys(out).length).toBe(0);
    });
});
// ─── resolveProvider (via throw paths and observable outputs) ───
describe("callLlm resolveProvider cost-order", () => {
    let tmp = null;
    beforeEach(() => {
        clearLlmEnv();
        tmp = createTmpHome();
        process.env.HOME = tmp.home;
        __resetNoticeFlagsForTests();
    });
    afterEach(() => {
        if (tmp)
            tmp.cleanup();
        tmp = null;
        restoreEnv();
    });
    it("T14: completely empty — fail-fast with cost-order guidance", async () => {
        const result = await attemptResolve();
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain("background task용 LLM provider를 해소할 수 없습니다");
            expect(result.error).toContain("codex OAuth");
            expect(result.error).toContain("LiteLLM");
            expect(result.error).toContain("ANTHROPIC_API_KEY");
            expect(result.error).toContain("OPENAI_API_KEY");
        }
    });
    it("explicit anthropic without ANTHROPIC_API_KEY → fail-fast with clear guidance", async () => {
        const { callLlm } = await import("./llm-caller.js");
        let caught = null;
        try {
            await callLlm("s", "u", { provider: "anthropic", max_tokens: 8 });
        }
        catch (err) {
            caught = err instanceof Error ? err : new Error(String(err));
        }
        expect(caught).not.toBeNull();
        expect(caught.message).toContain("external_http_provider=anthropic");
        expect(caught.message).toContain("ANTHROPIC_API_KEY");
    });
    it("explicit anthropic + key + no model → missing-model error (hardcoded defaults removed)", async () => {
        process.env.ANTHROPIC_API_KEY = "sk-fake";
        try {
            const { callLlm } = await import("./llm-caller.js");
            let caught = null;
            try {
                await callLlm("s", "u", { provider: "anthropic", max_tokens: 8 });
            }
            catch (err) {
                caught = err instanceof Error ? err : new Error(String(err));
            }
            expect(caught).not.toBeNull();
            expect(caught.message).toContain("model 지정이 필요");
            expect(caught.message).toContain("anthropic.model");
        }
        finally {
            delete process.env.ANTHROPIC_API_KEY;
        }
    });
    it("T5b: codex OAuth + no binary + no credential → fail-fast with install emphasis", async () => {
        writeAuthJson(tmp.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
        // Clear PATH so codex binary not found
        const originalPath = process.env.PATH;
        process.env.PATH = "/tmp/none-existing-dir";
        try {
            const result = await attemptResolve();
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toContain("chatgpt OAuth");
                expect(result.error).toContain("codex 바이너리");
                expect(result.error).toContain("https://github.com/openai/codex");
            }
        }
        finally {
            process.env.PATH = originalPath;
        }
    });
    it("bridge narrows main-model to undefined (execution realization axis, not provider)", () => {
        const out = resolveLearningProviderConfig({ config: { external_http_provider: "main-model" } });
        expect(out.provider).toBeUndefined();
    });
    // B1: cost-order transition notice — auto-resolution picks codex, user also has ANTHROPIC_API_KEY.
    it("B1: auto-resolution picks codex while ANTHROPIC_API_KEY present → STDERR transition notice", async () => {
        writeAuthJson(tmp.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
        // ensure codex binary IS findable — use the real PATH so `codex` is resolvable
        // (the test machine has codex installed per §1.4 verification).
        // We don't actually invoke codex — we intercept STDERR before the call.
        process.env.ANTHROPIC_API_KEY = "sk-fake-anthropic";
        const captured = [];
        const originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = (chunk) => {
            captured.push(String(chunk));
            return true;
        };
        try {
            const { callLlm } = await import("./llm-caller.js");
            // callLlm will try to spawn codex. We don't care if it succeeds/fails —
            // we only care that the STDERR notice is emitted BEFORE dispatch.
            await callLlm("s", "u", { max_tokens: 1 }).catch(() => { });
            const combined = captured.join("");
            expect(combined).toContain("provider resolution changed by cost-order");
            expect(combined).toContain("would have used anthropic");
            expect(combined).toContain("now using codex");
        }
        finally {
            process.stderr.write = originalWrite;
            delete process.env.ANTHROPIC_API_KEY;
        }
    });
    it("B1: no notice when user sets external_http_provider explicitly", async () => {
        writeAuthJson(tmp.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
        process.env.ANTHROPIC_API_KEY = "sk-fake-anthropic";
        const captured = [];
        const originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = (chunk) => {
            captured.push(String(chunk));
            return true;
        };
        try {
            const { callLlm } = await import("./llm-caller.js");
            // explicit provider=anthropic — user chose, no transition surprise
            await callLlm("s", "u", { provider: "anthropic", max_tokens: 1 }).catch(() => { });
            const combined = captured.join("");
            expect(combined).not.toContain("provider resolution changed by cost-order");
        }
        finally {
            process.stderr.write = originalWrite;
            delete process.env.ANTHROPIC_API_KEY;
        }
    });
    it("B1: notice suppressed by ONTO_SUPPRESS_COST_ORDER_NOTICE=1", async () => {
        writeAuthJson(tmp.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
        process.env.ANTHROPIC_API_KEY = "sk-fake-anthropic";
        process.env.ONTO_SUPPRESS_COST_ORDER_NOTICE = "1";
        const captured = [];
        const originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = (chunk) => {
            captured.push(String(chunk));
            return true;
        };
        try {
            const { callLlm } = await import("./llm-caller.js");
            await callLlm("s", "u", { max_tokens: 1 }).catch(() => { });
            const combined = captured.join("");
            expect(combined).not.toContain("provider resolution changed by cost-order");
        }
        finally {
            process.stderr.write = originalWrite;
            delete process.env.ANTHROPIC_API_KEY;
            delete process.env.ONTO_SUPPRESS_COST_ORDER_NOTICE;
        }
    });
});
// ─── LlmCallResult audit fields (provenance) ───
describe("LlmCallResult audit fields", () => {
    // Full SDK-level calls cannot run in unit tests without real credentials.
    // Provenance coverage is via integration/e2e (see e2e-promote.test.ts).
    // This block documents what each provider path SHOULD record.
    //
    // T15 mapping:
    //   anthropic → effective_base_url="https://api.anthropic.com", declared_billing_mode="per_token"
    //   openai    → effective_base_url="https://api.openai.com/v1", declared_billing_mode="per_token"
    //   litellm   → effective_base_url=<resolved URL>,                declared_billing_mode="per_token"
    //   codex     → effective_base_url="codex-cli://oauth",           declared_billing_mode="subscription"
    //   mock      → effective_base_url="mock://deterministic",        declared_billing_mode="per_token"
    it("mock provider records audit fields (ONTO_LLM_MOCK=1)", async () => {
        const orig = process.env.ONTO_LLM_MOCK;
        process.env.ONTO_LLM_MOCK = "1";
        try {
            const { callLlm } = await import("./llm-caller.js");
            const result = await callLlm("You are reviewing promotion candidates for x", "candidate_id=test type=fact tags=[methodology] role=foundation", { max_tokens: 10 });
            expect(result.effective_base_url).toBe("mock://deterministic");
            expect(result.declared_billing_mode).toBe("per_token");
        }
        finally {
            if (orig === undefined)
                delete process.env.ONTO_LLM_MOCK;
            else
                process.env.ONTO_LLM_MOCK = orig;
        }
    });
});
// ─── logLiteLLMIssue (opt-in LiteLLM issue log) ───
describe("logLiteLLMIssue", () => {
    let tmpDir;
    let logPath;
    let savedEnv;
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-litellm-log-"));
        logPath = path.join(tmpDir, "ISSUE-LOG.md");
        savedEnv = process.env.ONTO_LITELLM_ISSUE_LOG;
    });
    afterEach(() => {
        if (savedEnv === undefined)
            delete process.env.ONTO_LITELLM_ISSUE_LOG;
        else
            process.env.ONTO_LITELLM_ISSUE_LOG = savedEnv;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    it("is a no-op when ONTO_LITELLM_ISSUE_LOG is unset", () => {
        delete process.env.ONTO_LITELLM_ISSUE_LOG;
        logLiteLLMIssue("title", "symptom", { model_id: "gpt-4o-mini" });
        expect(fs.existsSync(logPath)).toBe(false);
    });
    it("appends a structured entry when the env var points to a file", () => {
        process.env.ONTO_LITELLM_ISSUE_LOG = logPath;
        logLiteLLMIssue("call failed (503)", "upstream unavailable", {
            model_id: "gpt-4o-mini",
            base_url: "http://127.0.0.1:4000/v1",
            status: 503,
            error_name: "APIError",
            error_message: "Service Unavailable",
            prompt_hash: "abc123def456",
        });
        const content = fs.readFileSync(logPath, "utf8");
        expect(content).toMatch(/### \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] call failed \(503\)/);
        expect(content).toContain("- **모듈**: onto / LiteLLM");
        expect(content).toContain("- **증상**: upstream unavailable");
        expect(content).toContain("- **모델**: gpt-4o-mini");
        expect(content).toContain("- **엔드포인트**: http://127.0.0.1:4000/v1");
        expect(content).toContain("- **상태 코드**: 503");
        expect(content).toContain("- **에러**: APIError: Service Unavailable");
        expect(content).toContain("- **프롬프트 해시**: abc123def456");
    });
    it("appends successive entries without overwriting prior ones", () => {
        process.env.ONTO_LITELLM_ISSUE_LOG = logPath;
        logLiteLLMIssue("first", "first symptom", { model_id: "a" });
        logLiteLLMIssue("second", "second symptom", { model_id: "b" });
        const content = fs.readFileSync(logPath, "utf8");
        expect(content.match(/] first\b/g)?.length ?? 0).toBe(1);
        expect(content.match(/] second\b/g)?.length ?? 0).toBe(1);
    });
    it("renders em-dash placeholders for missing context fields", () => {
        process.env.ONTO_LITELLM_ISSUE_LOG = logPath;
        logLiteLLMIssue("minimal", "no context", {});
        const content = fs.readFileSync(logPath, "utf8");
        expect(content).toContain("- **모델**: —");
        expect(content).toContain("- **엔드포인트**: —");
        expect(content).toContain("- **상태 코드**: —");
        expect(content).toContain("- **에러**: —");
        expect(content).toContain("- **프롬프트 해시**: —");
    });
    it("does not throw when the log path is unwritable", () => {
        process.env.ONTO_LITELLM_ISSUE_LOG = path.join(tmpDir, "missing-dir", "log.md");
        const originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = () => true;
        try {
            expect(() => logLiteLLMIssue("unwritable", "should degrade gracefully", {})).not.toThrow();
        }
        finally {
            process.stderr.write = originalWrite;
        }
    });
});
// ─── Provider ladder observability ([provider-ladder] STDERR) ───
describe("model-call observability ([model-call] STDERR)", () => {
    let captured = [];
    let originalWrite = null;
    beforeEach(() => {
        clearLlmEnv();
        __resetNoticeFlagsForTests();
        captured = [];
        originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = (chunk) => {
            captured.push(String(chunk));
            return true;
        };
    });
    afterEach(() => {
        if (originalWrite)
            process.stderr.write = originalWrite;
        originalWrite = null;
        restoreEnv();
    });
    function modelCallLines() {
        return captured.filter((l) => l.includes("[model-call]"));
    }
    it("anthropic API failure → [model-call] FAILED log includes status / type / message / request_id", async () => {
        // Mock @anthropic-ai/sdk to throw an APIError-shaped object.
        vi.doMock("@anthropic-ai/sdk", () => ({
            default: class {
                messages = {
                    create: vi.fn().mockRejectedValue({
                        status: 400,
                        name: "BadRequestError",
                        message: "400 Bad Request",
                        error: { type: "invalid_request_error", message: "model: claude-fake-id not found" },
                        request_id: "req_test_123",
                    }),
                };
            },
        }));
        vi.resetModules();
        process.env.ANTHROPIC_API_KEY = "sk-test";
        const { callLlm } = await import("./llm-caller.js");
        try {
            await callLlm("s", "u", { provider: "anthropic", model_id: "claude-fake-id", max_tokens: 8 });
        }
        catch {
            // expected
        }
        const lines = modelCallLines();
        expect(lines.some((l) => l.includes("anthropic call:") && l.includes('model="claude-fake-id"'))).toBe(true);
        expect(lines.some((l) => l.includes("anthropic call FAILED") && l.includes("status=400"))).toBe(true);
        expect(lines.some((l) => l.includes("invalid_request_error"))).toBe(true);
        expect(lines.some((l) => l.includes("claude-fake-id not found"))).toBe(true);
        expect(lines.some((l) => l.includes("req_test_123"))).toBe(true);
        vi.doUnmock("@anthropic-ai/sdk");
        vi.resetModules();
        delete process.env.ANTHROPIC_API_KEY;
    });
    it("pre-call log always emits before failure — principal sees attempted model id even on throw", async () => {
        vi.doMock("@anthropic-ai/sdk", () => ({
            default: class {
                messages = {
                    create: vi.fn().mockRejectedValue(new Error("network blip")),
                };
            },
        }));
        vi.resetModules();
        process.env.ANTHROPIC_API_KEY = "sk-test";
        const { callLlm } = await import("./llm-caller.js");
        try {
            await callLlm("s", "u", { provider: "anthropic", model_id: "claude-x", max_tokens: 8 });
        }
        catch { /* expected */ }
        const lines = modelCallLines();
        const preIdx = lines.findIndex((l) => l.includes("anthropic call:"));
        const failIdx = lines.findIndex((l) => l.includes("anthropic call FAILED"));
        expect(preIdx).toBeGreaterThanOrEqual(0);
        expect(failIdx).toBeGreaterThan(preIdx);
        vi.doUnmock("@anthropic-ai/sdk");
        vi.resetModules();
        delete process.env.ANTHROPIC_API_KEY;
    });
});
describe("resolveProvider ladder observability", () => {
    let tmp = null;
    let captured = [];
    let originalWrite = null;
    beforeEach(() => {
        clearLlmEnv();
        tmp = createTmpHome();
        process.env.HOME = tmp.home;
        __resetNoticeFlagsForTests();
        captured = [];
        originalWrite = process.stderr.write.bind(process.stderr);
        process.stderr.write = (chunk) => {
            captured.push(String(chunk));
            return true;
        };
    });
    afterEach(() => {
        if (originalWrite)
            process.stderr.write = originalWrite;
        originalWrite = null;
        if (tmp)
            tmp.cleanup();
        tmp = null;
        restoreEnv();
    });
    function ladderLines() {
        return captured.filter((l) => l.includes("[provider-ladder]"));
    }
    it("empty env → step 3 codex skipped (auth.json 부재) + step 4/5/6 skipped + final throw log", async () => {
        await attemptResolve();
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("step 3 codex: skipped") && l.includes("auth.json 부재"))).toBe(true);
        expect(lines.some((l) => l.includes("step 4 litellm: skipped"))).toBe(true);
        expect(lines.some((l) => l.includes("step 5 anthropic: skipped"))).toBe(true);
        expect(lines.some((l) => l.includes("step 6 openai: skipped"))).toBe(true);
        expect(lines.some((l) => l.includes("final:") && l.includes("no provider viable"))).toBe(true);
    });
    it("LITELLM_BASE_URL set → step 4 matched (env source) log, step 5/6 not evaluated", async () => {
        process.env.LITELLM_BASE_URL = "https://litellm.example.com";
        try {
            await attemptResolve();
        }
        catch { /* ignore */ }
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("step 4 litellm: matched") && l.includes("LITELLM_BASE_URL env"))).toBe(true);
        expect(lines.some((l) => l.includes("step 5 anthropic:"))).toBe(false);
        expect(lines.some((l) => l.includes("step 6 openai:"))).toBe(false);
    });
    it("ANTHROPIC_API_KEY only → step 3/4 skipped + step 5 matched log", async () => {
        process.env.ANTHROPIC_API_KEY = "sk-fake";
        try {
            await attemptResolve();
        }
        catch { /* ignore */ }
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("step 3 codex: skipped"))).toBe(true);
        expect(lines.some((l) => l.includes("step 4 litellm: skipped"))).toBe(true);
        expect(lines.some((l) => l.includes("step 5 anthropic: matched"))).toBe(true);
        expect(lines.some((l) => l.includes("step 6 openai:"))).toBe(false);
    });
    it("codex auth.json exists but auth_mode != 'chatgpt' → step 3 skip with 'OAuth 조건 미충족'", async () => {
        writeAuthJson(tmp.home, { auth_mode: "api" });
        await attemptResolve();
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("step 3 codex: skipped") && l.includes("OAuth 조건 미충족"))).toBe(true);
    });
    it("codex OAuth present + binary missing → step 3 falls-through log with binary NOT on PATH", async () => {
        writeAuthJson(tmp.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
        const originalPath = process.env.PATH;
        process.env.PATH = "/tmp/none-existing-dir-xyz";
        process.env.ANTHROPIC_API_KEY = "sk-fake";
        try {
            await attemptResolve();
        }
        catch { /* ignore */ }
        finally {
            process.env.PATH = originalPath ?? "";
        }
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("step 3 codex: OAuth detected") && l.includes("binary NOT on PATH"))).toBe(true);
        expect(lines.some((l) => l.includes("step 5 anthropic: matched"))).toBe(true);
    });
    it("explicit anthropic without key → explicit fail-fast log", async () => {
        const { callLlm } = await import("./llm-caller.js");
        try {
            await callLlm("s", "u", { provider: "anthropic", max_tokens: 8 });
        }
        catch { /* ignore */ }
        const lines = ladderLines();
        expect(lines.some((l) => l.includes("explicit anthropic") && l.includes("fail-fast"))).toBe(true);
    });
});
