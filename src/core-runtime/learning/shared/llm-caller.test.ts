import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  resolveLearningProviderConfig,
  type LearningProviderConfigInputs,
  type LearningProviderCliOverrides,
} from "./llm-caller.js";

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
    if (!(k in originalEnv)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(originalEnv)) {
    process.env[k] = v;
  }
}

/**
 * Create a temp HOME dir containing a writable ~/.codex so we can vary auth.json
 * without touching the real user directory.
 */
function createTmpHome(): { home: string; cleanup: () => void } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "onto-llm-caller-test-"));
  fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
  return {
    home,
    cleanup: () => {
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

function writeAuthJson(home: string, content: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(home, ".codex", "auth.json"),
    JSON.stringify(content),
    "utf8",
  );
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
async function attemptResolve(): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  // We import dynamically to pick up env changes; callLlm mocks would need fetch stubs.
  // Use ONTO_LLM_MOCK=1 to short-circuit actual API calls — but that short-circuits
  // BEFORE resolveProvider, which defeats the test. Instead we rely on the throw.
  const { callLlm } = await import("./llm-caller.js");
  try {
    await callLlm("sys", "user", { max_tokens: 1 });
    return { ok: true, text: "unreachable — no real credential should be valid in tests" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── resolveLearningProviderConfig (bridge, pure function) ───

describe("resolveLearningProviderConfig", () => {
  it("T16: CLI overrides beat OntoConfig for every field", () => {
    const config: LearningProviderConfigInputs = {
      api_provider: "litellm",
      llm_base_url: "http://config:4000/v1",
      model: "config-model",
    };
    const cli: LearningProviderCliOverrides = {
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
      config: { api_provider: "codex", model: "gpt-5", codex: { model: "codex-x", effort: "high" } },
    });
    expect(out.provider).toBe("codex");
    // codex uses config.codex.model override over config.model
    expect(out.model_id).toBe("codex-x");
    expect(out.reasoning_effort).toBe("high");
  });

  it("per-provider model override applies for anthropic", () => {
    const out = resolveLearningProviderConfig({
      config: {
        api_provider: "anthropic",
        anthropic: { model: "claude-sonnet-4" },
        model: "generic-fallback",
      },
    });
    expect(out.provider).toBe("anthropic");
    expect(out.model_id).toBe("claude-sonnet-4");
  });

  it("per-provider model override applies for openai", () => {
    const out = resolveLearningProviderConfig({
      config: { api_provider: "openai", openai: { model: "gpt-4o" }, model: "other" },
    });
    expect(out.model_id).toBe("gpt-4o");
  });

  it("per-provider model override applies for litellm", () => {
    const out = resolveLearningProviderConfig({
      config: { api_provider: "litellm", litellm: { model: "local-llama" }, model: "other" },
    });
    expect(out.model_id).toBe("local-llama");
  });

  it("falls back to top-level model when per-provider absent", () => {
    const out = resolveLearningProviderConfig({
      config: { api_provider: "openai", model: "fallback-model" },
    });
    expect(out.model_id).toBe("fallback-model");
  });

  it("auto-resolution (no provider) uses top-level model only", () => {
    // Bridge can't predict which provider cost-order will pick, so per-provider fields don't apply here.
    const out = resolveLearningProviderConfig({
      config: { anthropic: { model: "ant" }, openai: { model: "oa" }, model: "top" },
    });
    expect(out.provider).toBeUndefined();
    expect(out.model_id).toBe("top");
  });

  it("env LITELLM_BASE_URL beats config.llm_base_url when CLI absent", () => {
    process.env.LITELLM_BASE_URL = "http://env:4000/v1";
    try {
      const out = resolveLearningProviderConfig({
        config: { llm_base_url: "http://config:4000/v1" },
      });
      expect(out.base_url).toBe("http://env:4000/v1");
    } finally {
      delete process.env.LITELLM_BASE_URL;
    }
  });

  it("narrows invalid api_provider values to undefined", () => {
    const out = resolveLearningProviderConfig({ config: { api_provider: "main-model" } });
    expect(out.provider).toBeUndefined();
  });

  it("returns empty object when nothing provided", () => {
    const out = resolveLearningProviderConfig({});
    expect(Object.keys(out).length).toBe(0);
  });
});

// ─── resolveProvider (via throw paths and observable outputs) ───

describe("callLlm resolveProvider cost-order", () => {
  let tmp: { home: string; cleanup: () => void } | null = null;

  beforeEach(() => {
    clearLlmEnv();
    tmp = createTmpHome();
    process.env.HOME = tmp.home;
  });

  afterEach(() => {
    if (tmp) tmp.cleanup();
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
    let caught: Error | null = null;
    try {
      await callLlm("s", "u", { provider: "anthropic", max_tokens: 8 });
    } catch (err) {
      caught = err instanceof Error ? err : new Error(String(err));
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toContain("api_provider=anthropic");
    expect(caught!.message).toContain("ANTHROPIC_API_KEY");
  });

  it("explicit anthropic + key + no model → missing-model error (hardcoded defaults removed)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-fake";
    try {
      const { callLlm } = await import("./llm-caller.js");
      let caught: Error | null = null;
      try {
        await callLlm("s", "u", { provider: "anthropic", max_tokens: 8 });
      } catch (err) {
        caught = err instanceof Error ? err : new Error(String(err));
      }
      expect(caught).not.toBeNull();
      expect(caught!.message).toContain("model 지정이 필요");
      expect(caught!.message).toContain("anthropic.model");
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("T5b: codex OAuth + no binary + no credential → fail-fast with install emphasis", async () => {
    writeAuthJson(tmp!.home, { auth_mode: "chatgpt", tokens: { access_token: "tok" } });
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
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("bridge narrows main-model to undefined (execution realization axis, not provider)", () => {
    const out = resolveLearningProviderConfig({ config: { api_provider: "main-model" } });
    expect(out.provider).toBeUndefined();
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
      const result = await callLlm(
        "You are reviewing promotion candidates for x",
        "candidate_id=test type=fact tags=[methodology] role=foundation",
        { max_tokens: 10 },
      );
      expect(result.effective_base_url).toBe("mock://deterministic");
      expect(result.declared_billing_mode).toBe("per_token");
    } finally {
      if (orig === undefined) delete process.env.ONTO_LLM_MOCK;
      else process.env.ONTO_LLM_MOCK = orig;
    }
  });
});
