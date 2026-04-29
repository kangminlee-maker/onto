/**
 * Detection signals — Phase B-1, schema v1 (L1 only) unit tests.
 *
 * The host-detection.test.ts hostile-env pattern is reused: env vars
 * that affect host runtime / capability detection are deleted in
 * beforeEach and restored in afterEach. PATH is cleared so the codex
 * binary lookup cannot pick up the test runner's shell. HOME is
 * repointed at a guaranteed-empty directory so the
 * `~/.codex/auth.json` filesystem probe returns false deterministically.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  formatDetectionSignalsJson,
  gatherDetectionSignals,
  readConfigWithParseHealth,
  type ConfigReadWithHealth,
  type DetectionSignalsV1,
} from "./detection-signals.js";

type RawConfig = ConfigReadWithHealth["rawConfig"];

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
const trackedTempDirs: string[] = [];

function isolateEnv(): void {
  savedEnv = {};
  for (const key of HOST_ENV_VARS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  savedEnv.PATH = process.env.PATH;
  process.env.PATH = "";

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
  while (trackedTempDirs.length > 0) {
    const dir = trackedTempDirs.pop()!;
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

beforeEach(() => {
  isolateEnv();
});
afterEach(() => {
  restoreEnv();
});

// Helper: build a project-root with optional .onto/config.yml content.
function makeProjectRootWith(configContent: string | null): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-detection-project-"));
  trackedTempDirs.push(dir);
  if (configContent !== null) {
    fs.mkdirSync(path.join(dir, ".onto"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".onto", "config.yml"), configContent, "utf8");
  }
  return dir;
}

describe("gatherDetectionSignals — schema invariants", () => {
  it("emits schema_version 'v1'", () => {
    expect(gatherDetectionSignals().schema_version).toBe("v1");
  });

  it("v1 has no drift_reason field (deferred to v1.x; PR #251 round 3 C2)", () => {
    const signals = gatherDetectionSignals();
    expect((signals as unknown as Record<string, unknown>).drift_reason).toBeUndefined();
  });
});

describe("gatherDetectionSignals — host_detected (observed runtime fact)", () => {
  it("Claude env signal → 'claude-code'", () => {
    process.env.CLAUDECODE = "1";
    expect(gatherDetectionSignals().host_detected).toBe("claude-code");
  });

  it("Codex env signal → 'codex'", () => {
    process.env.CODEX_THREAD_ID = "abc";
    expect(gatherDetectionSignals().host_detected).toBe("codex");
  });

  it("no host env + empty PATH → 'standalone'", () => {
    expect(gatherDetectionSignals().host_detected).toBe("standalone");
  });

  it("config-level host_runtime override is IGNORED (raw runtime fact only)", () => {
    // PR #251 round 1 C3: host_detected reports the OBSERVED runtime,
    // never a config override. Even if upstream callers hand over a
    // `host_runtime: "codex"` field on the rawConfig, the signal here
    // stays as the observed Claude session.
    process.env.CLAUDECODE = "1";
    const signals = gatherDetectionSignals({
      rawConfig: { host_runtime: "codex" } as unknown as RawConfig,
      parseError: null,
    });
    expect(signals.host_detected).toBe("claude-code");
  });
});

describe("gatherDetectionSignals — claude_code_teams_env_set (exact match)", () => {
  it("=true only when env var equals literal '1'", () => {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    expect(gatherDetectionSignals().claude_code_teams_env_set).toBe(true);
  });

  it("=false when env var absent", () => {
    expect(gatherDetectionSignals().claude_code_teams_env_set).toBe(false);
  });

  it("=false when env var set to non-'1' value (e.g. '0', 'true')", () => {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "0";
    expect(gatherDetectionSignals().claude_code_teams_env_set).toBe(false);
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "true";
    expect(gatherDetectionSignals().claude_code_teams_env_set).toBe(false);
  });

  it("decoupled from CLAUDECODE (which only flags Claude session)", () => {
    process.env.CLAUDECODE = "1";
    expect(gatherDetectionSignals().claude_code_teams_env_set).toBe(false);
  });
});

describe("gatherDetectionSignals — codex {binary_on_path, auth_file_present} 4-cell matrix", () => {
  // PR #251 round 2 review C1+C2: binary_on_path is PATH-only (NOT
  // binary AND auth). All four corners of the matrix must be reachable,
  // especially binary=true / auth=false ("Codex installed but
  // unauthenticated") which prior to round 2 was unreachable because
  // the emit went through the legacy combined helper.

  function plantFakeCodexBinary(): void {
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "onto-fake-codex-bin-"));
    trackedTempDirs.push(binDir);
    fs.writeFileSync(
      path.join(binDir, "codex"),
      "#!/usr/bin/env bash\nexit 0\n",
      { mode: 0o755 },
    );
    process.env.PATH = binDir;
  }

  function plantCodexAuthFile(): void {
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(isolatedHome, ".codex", "auth.json"), "{}", "utf8");
  }

  it("FF: binary_on_path=false, auth_file_present=false (no codex artifacts)", () => {
    const signals = gatherDetectionSignals();
    expect(signals.codex.binary_on_path).toBe(false);
    expect(signals.codex.auth_file_present).toBe(false);
  });

  it("FT: binary_on_path=false, auth_file_present=true (residual auth only)", () => {
    plantCodexAuthFile();
    const signals = gatherDetectionSignals();
    expect(signals.codex.binary_on_path).toBe(false);
    expect(signals.codex.auth_file_present).toBe(true);
  });

  it("TF: binary_on_path=true, auth_file_present=false (installed but unauthenticated — round 2 critical case)", () => {
    plantFakeCodexBinary();
    const signals = gatherDetectionSignals();
    expect(signals.codex.binary_on_path).toBe(true);
    expect(signals.codex.auth_file_present).toBe(false);
  });

  it("TT: binary_on_path=true, auth_file_present=true (fully usable)", () => {
    plantFakeCodexBinary();
    plantCodexAuthFile();
    const signals = gatherDetectionSignals();
    expect(signals.codex.binary_on_path).toBe(true);
    expect(signals.codex.auth_file_present).toBe(true);
  });
});

describe("gatherDetectionSignals — credentials (3 source-prefixed fields, PR #251 round 4 C2)", () => {
  it("env_has_anthropic_api_key reflects ANTHROPIC_API_KEY presence", () => {
    expect(gatherDetectionSignals().credentials.env_has_anthropic_api_key).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(gatherDetectionSignals().credentials.env_has_anthropic_api_key).toBe(true);
  });

  it("env_has_openai_api_key reports env source ONLY (auth.json key does NOT flip it)", () => {
    expect(gatherDetectionSignals().credentials.env_has_openai_api_key).toBe(false);
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(isolatedHome, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "sk-from-codex-auth" }),
      "utf8",
    );
    // env source false even with auth.json present.
    expect(gatherDetectionSignals().credentials.env_has_openai_api_key).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(gatherDetectionSignals().credentials.env_has_openai_api_key).toBe(true);
  });

  it("codex_auth_has_openai_api_key reports auth.json source ONLY (env key does NOT flip it)", () => {
    expect(gatherDetectionSignals().credentials.codex_auth_has_openai_api_key).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test-env";
    expect(gatherDetectionSignals().credentials.codex_auth_has_openai_api_key).toBe(false);
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(isolatedHome, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "sk-from-codex-auth" }),
      "utf8",
    );
    expect(gatherDetectionSignals().credentials.codex_auth_has_openai_api_key).toBe(true);
  });

  it("both openai source fields are independent — host prose composes the union itself", () => {
    process.env.OPENAI_API_KEY = "sk-env";
    fs.mkdirSync(path.join(isolatedHome, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(isolatedHome, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "sk-codex" }),
      "utf8",
    );
    const signals = gatherDetectionSignals();
    expect(signals.credentials.env_has_openai_api_key).toBe(true);
    expect(signals.credentials.codex_auth_has_openai_api_key).toBe(true);
  });

  it("litellm_base_url_set reflects LITELLM_BASE_URL presence", () => {
    expect(gatherDetectionSignals().litellm_base_url_set).toBe(false);
    process.env.LITELLM_BASE_URL = "http://localhost:4000";
    expect(gatherDetectionSignals().litellm_base_url_set).toBe(true);
  });
});

describe("gatherDetectionSignals — review_block_declared", () => {
  it("undefined config → false", () => {
    expect(gatherDetectionSignals().review_block_declared).toBe(false);
  });

  it("config without review block → false", () => {
    expect(
      gatherDetectionSignals({ rawConfig: {}, parseError: null }).review_block_declared,
    ).toBe(false);
  });

  it("review block null → false", () => {
    expect(
      gatherDetectionSignals({
        rawConfig: { review: null } as unknown as RawConfig,
        parseError: null,
      }).review_block_declared,
    ).toBe(false);
  });

  it("empty review object → true (any axis-block adoption counts)", () => {
    expect(
      gatherDetectionSignals({
        rawConfig: { review: {} } as unknown as RawConfig,
        parseError: null,
      }).review_block_declared,
    ).toBe(true);
  });

  it("review block with sub-fields → true", () => {
    expect(
      gatherDetectionSignals({
        rawConfig: {
          review: { teamlead: { kind: "main" }, max_concurrent_lenses: 4 },
        } as unknown as RawConfig,
        parseError: null,
      }).review_block_declared,
    ).toBe(true);
  });
});

describe("gatherDetectionSignals — config_parse_error (PR #251 round 3 C1)", () => {
  it("=null when read result carries null error", () => {
    expect(
      gatherDetectionSignals({ rawConfig: {}, parseError: null }).config_parse_error,
    ).toBeNull();
  });

  it("=string when read result carries an error message", () => {
    const message = "Failed to parse YAML: foo: bar";
    const signals = gatherDetectionSignals({ rawConfig: {}, parseError: message });
    expect(signals.config_parse_error).toBe(message);
  });

  it("review_block_declared=false even when parse error set (parse error takes precedence as separate fact)", () => {
    // The two fields report independent facts: a parse failure means
    // we couldn't see whether a review block exists, so review_block_
    // declared falls to false but config_parse_error explicitly says
    // "we couldn't see". Host prose distinguishes the two cases.
    const signals = gatherDetectionSignals({
      rawConfig: {},
      parseError: "Failed to parse YAML: x",
    });
    expect(signals.review_block_declared).toBe(false);
    expect(signals.config_parse_error).toBe("Failed to parse YAML: x");
  });
});

describe("readConfigWithParseHealth — parse-health capture", () => {
  it("absent .onto/config.yml → empty config + null error", async () => {
    const root = makeProjectRootWith(null);
    const read = await readConfigWithParseHealth(root);
    expect(read.rawConfig).toEqual({});
    expect(read.parseError).toBeNull();
  });

  it("valid YAML object → parsed config + null error", async () => {
    const root = makeProjectRootWith("output_language: ko\nreview:\n  teamlead:\n    kind: main\n");
    const read = await readConfigWithParseHealth(root);
    expect(read.rawConfig.output_language).toBe("ko");
    expect((read.rawConfig as { review?: unknown }).review).toEqual({
      teamlead: { kind: "main" },
    });
    expect(read.parseError).toBeNull();
  });

  it("malformed YAML → empty config + error string starting with 'Failed to parse YAML'", async () => {
    const root = makeProjectRootWith("review:\n  teamlead: {kind: main\n  unclosed_brace");
    const read = await readConfigWithParseHealth(root);
    expect(read.rawConfig).toEqual({});
    expect(read.parseError).toMatch(/^Failed to parse YAML/);
  });

  it("YAML scalar (parseable but not an object) → empty config + parseError set (PR #251 round 4 CC1)", async () => {
    // Parseable scalar/null root must NOT collapse into first-run absence.
    // Host prose treats `parseError !== null` as fail-fast like a real
    // parse failure, distinguishing it from a genuinely missing config.
    const root = makeProjectRootWith("just-a-string\n");
    const read = await readConfigWithParseHealth(root);
    expect(read.rawConfig).toEqual({});
    expect(read.parseError).toMatch(/^Config root is not a YAML object/);
  });

  it("YAML null root (e.g. empty file) also flagged as non-object", async () => {
    const root = makeProjectRootWith("");
    const read = await readConfigWithParseHealth(root);
    expect(read.rawConfig).toEqual({});
    expect(read.parseError).toMatch(/^Config root is not a YAML object/);
  });
});

describe("formatDetectionSignalsJson — emission ordering", () => {
  it("preserves the v1 schema field order regardless of input ordering", () => {
    const signals: DetectionSignalsV1 = {
      review_block_declared: true,
      config_parse_error: null,
      credentials: {
        codex_auth_has_openai_api_key: true,
        env_has_openai_api_key: false,
        env_has_anthropic_api_key: false,
      },
      codex: { auth_file_present: false, binary_on_path: true },
      litellm_base_url_set: false,
      claude_code_teams_env_set: true,
      host_detected: "claude-code",
      schema_version: "v1",
    };
    const json = formatDetectionSignalsJson(signals);
    const keys = Object.keys(JSON.parse(json));
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

  it("output is valid JSON parseable back to the same shape", () => {
    const original = gatherDetectionSignals({
      rawConfig: { review: {} } as unknown as RawConfig,
      parseError: null,
    });
    const round = JSON.parse(formatDetectionSignalsJson(original)) as DetectionSignalsV1;
    expect(round).toEqual(original);
  });
});
