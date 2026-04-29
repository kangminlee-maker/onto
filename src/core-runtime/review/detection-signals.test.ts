/**
 * Detection signals — Phase B-1, schema v1 unit tests.
 *
 * The host-detection.test.ts hostile-env pattern is reused: env vars that
 * affect host runtime / capability detection are deleted in beforeEach and
 * restored in afterEach. PATH is cleared so the codex binary lookup cannot
 * pick up the test runner's shell. HOME is repointed at a guaranteed-empty
 * directory so the `~/.codex/auth.json` filesystem probe returns false
 * deterministically.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  formatDetectionSignalsJson,
  gatherDetectionSignals,
  type DetectionSignalsV1,
} from "./detection-signals.js";

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
];

let savedEnv: Record<string, string | undefined> = {};
let isolatedHome: string;

function isolateEnv(): void {
  savedEnv = {};
  for (const key of HOST_ENV_VARS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  savedEnv.PATH = process.env.PATH;
  process.env.PATH = "";

  // Repoint HOME at a fresh empty dir so detectCodexAuth() / detectOpenAiApiKey
  // (which both probe ~/.codex/auth.json) return false deterministically.
  savedEnv.HOME = process.env.HOME;
  isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), "onto-detection-signals-"));
  process.env.HOME = isolatedHome;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  if (isolatedHome && fs.existsSync(isolatedHome)) {
    fs.rmSync(isolatedHome, { recursive: true, force: true });
  }
}

beforeEach(() => {
  isolateEnv();
});
afterEach(() => {
  restoreEnv();
});

describe("gatherDetectionSignals — schema invariants", () => {
  it("always emits schema_version 'v1'", () => {
    const signals = gatherDetectionSignals();
    expect(signals.schema_version).toBe("v1");
  });

  it("drift_reason is reserved as null in Phase B-1", () => {
    const signals = gatherDetectionSignals({ review: { teamlead: { kind: "main" } } });
    expect(signals.drift_reason).toBeNull();
  });
});

describe("gatherDetectionSignals — host mapping (claude/codex/standalone)", () => {
  it("internal 'claude' category maps to user-facing 'claude-code'", () => {
    process.env.CLAUDECODE = "1";
    expect(gatherDetectionSignals().host).toBe("claude-code");
  });

  it("internal 'codex' category maps to 'codex'", () => {
    process.env.CODEX_THREAD_ID = "abc";
    expect(gatherDetectionSignals().host).toBe("codex");
  });

  it("internal 'standalone' category maps to 'standalone'", () => {
    // No host env signals + empty PATH ⇒ standalone default.
    expect(gatherDetectionSignals().host).toBe("standalone");
  });

  it("config.host_runtime is IGNORED — host reports observed runtime fact only", () => {
    // PR #251 review C3 (9/9): host must reflect the actual runtime
    // environment, not a config-level override. Even when the caller
    // hands over an OntoConfig carrying `host_runtime: "codex"`, the
    // signal here stays as the observed Claude session. Config-level
    // overrides belong to downstream resolvers (execution-profile /
    // review-invoke handoff), not to this raw runtime-fact field.
    process.env.CLAUDECODE = "1";
    const signals = gatherDetectionSignals({
      host_runtime: "codex",
    } as unknown as Parameters<typeof gatherDetectionSignals>[0]);
    expect(signals.host).toBe("claude-code");
  });
});

describe("gatherDetectionSignals — teams_env (TeamCreate gate)", () => {
  it("teams_env=true only when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1", () => {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    expect(gatherDetectionSignals().teams_env).toBe(true);
  });

  it("teams_env=false when env var is absent", () => {
    expect(gatherDetectionSignals().teams_env).toBe(false);
  });

  it("teams_env=false when env var is set to a non-'1' value (e.g. '0')", () => {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "0";
    expect(gatherDetectionSignals().teams_env).toBe(false);
  });

  it("teams_env decoupled from CLAUDECODE (which only flags Claude session)", () => {
    process.env.CLAUDECODE = "1";
    expect(gatherDetectionSignals().teams_env).toBe(false);
  });
});

describe("gatherDetectionSignals — codex {binary, auth} probes", () => {
  it("binary=false when PATH lacks codex (test runner state)", () => {
    expect(gatherDetectionSignals().codex.binary).toBe(false);
  });

  it("auth=false when ~/.codex/auth.json absent (isolated HOME)", () => {
    expect(gatherDetectionSignals().codex.auth).toBe(false);
  });

  it("auth=true when ~/.codex/auth.json exists, independent of binary", () => {
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(isolatedHome, ".codex", "auth.json"), "{}", "utf8");
    const signals = gatherDetectionSignals();
    expect(signals.codex.auth).toBe(true);
    // binary still false: PATH is empty.
    expect(signals.codex.binary).toBe(false);
  });
});

describe("gatherDetectionSignals — credentials + litellm", () => {
  it("credentials.anthropic reflects ANTHROPIC_API_KEY presence", () => {
    expect(gatherDetectionSignals().credentials.anthropic).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(gatherDetectionSignals().credentials.anthropic).toBe(true);
  });

  it("credentials.openai reflects OPENAI_API_KEY presence", () => {
    expect(gatherDetectionSignals().credentials.openai).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(gatherDetectionSignals().credentials.openai).toBe(true);
  });

  it("credentials.openai also reads ~/.codex/auth.json:OPENAI_API_KEY", () => {
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(isolatedHome, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "sk-from-codex-auth" }),
      "utf8",
    );
    expect(gatherDetectionSignals().credentials.openai).toBe(true);
  });

  it("litellm_endpoint reflects LITELLM_BASE_URL presence", () => {
    expect(gatherDetectionSignals().litellm_endpoint).toBe(false);
    process.env.LITELLM_BASE_URL = "http://localhost:4000";
    expect(gatherDetectionSignals().litellm_endpoint).toBe(true);
  });
});

describe("gatherDetectionSignals — review_block_present", () => {
  it("undefined config → false", () => {
    expect(gatherDetectionSignals().review_block_present).toBe(false);
  });

  it("config without review block → false", () => {
    expect(gatherDetectionSignals({}).review_block_present).toBe(false);
  });

  it("config.review explicitly null → false (rejects null)", () => {
    // null typed via cast: detectReviewBlockPresent guards against `null`.
    const signals = gatherDetectionSignals({ review: null as unknown as object });
    expect(signals.review_block_present).toBe(false);
  });

  it("empty review object → true (any axis-block adoption counts)", () => {
    expect(gatherDetectionSignals({ review: {} }).review_block_present).toBe(true);
  });

  it("review block with sub-fields → true", () => {
    const signals = gatherDetectionSignals({
      review: { teamlead: { kind: "main" }, max_concurrent_lenses: 4 },
    });
    expect(signals.review_block_present).toBe(true);
  });
});

describe("formatDetectionSignalsJson — emission ordering", () => {
  it("preserves the v1 schema field order regardless of input ordering", () => {
    const signals: DetectionSignalsV1 = {
      // Build with shuffled key order to prove the formatter normalizes.
      review_block_present: true,
      drift_reason: null,
      credentials: { openai: true, anthropic: false },
      codex: { auth: false, binary: true },
      litellm_endpoint: false,
      teams_env: true,
      host: "claude-code",
      schema_version: "v1",
    };
    const json = formatDetectionSignalsJson(signals);
    const keys = Object.keys(JSON.parse(json));
    expect(keys).toEqual([
      "schema_version",
      "host",
      "teams_env",
      "codex",
      "litellm_endpoint",
      "credentials",
      "review_block_present",
      "drift_reason",
    ]);
  });

  it("output is valid JSON parseable back to the same shape", () => {
    const original = gatherDetectionSignals({ review: {} });
    const round = JSON.parse(formatDetectionSignalsJson(original)) as DetectionSignalsV1;
    expect(round).toEqual(original);
  });
});
