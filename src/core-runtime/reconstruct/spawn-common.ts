// runtime-mirror-of: step-2-rationale-proposer §2 + §3 + step-3-rationale-reviewer §2 + §3
//
// Common LLM spawn helpers for Hook α (Rationale Proposer) and Hook γ
// (Rationale Reviewer). Shared:
//   - codex subprocess invocation (mirrors `cli/codex-review-unit-executor.ts`
//     pattern — review activity 의 deterministic CLI subprocess pattern 차용)
//   - YAML directive block extraction from LLM stdout
//   - canonical hash helpers (Hook γ wip_snapshot_hash + domain_files_content_hash)
//
// Out of scope (follow-up commits):
//   - inline-http variant (HTTP transport for non-codex hosts)
//   - retry / degraded_continue orchestration (caller-side, not spawn-side)
//   - prompt template — defined per-spawn module (spawn-proposer.ts /
//     spawn-reviewer.ts) since each Hook has different input package shape

import { spawn } from "node:child_process";
import yaml from "yaml";

// ============================================================================
// Codex subprocess invocation
// ============================================================================

export interface CodexSpawnConfig {
  /** Project root passed to `codex exec -C <root>`. */
  projectRoot: string;
  /** Codex sandbox mode (e.g. "read-only", "workspace-write"). */
  sandboxMode: string;
  /** Optional model_id override (chatgpt subscription allowlist constraint). */
  model?: string;
  /** Optional reasoning effort ("low" | "medium" | "high" | "xhigh"). */
  reasoningEffort?: string;
  /** Additional `-c key=value` config overrides for codex CLI. */
  configOverrides?: string[];
  /** Spawn timeout in milliseconds (default 600_000 = 10 minutes). */
  timeoutMs?: number;
}

export class CodexSpawnError extends Error {
  constructor(
    message: string,
    public readonly stage: "spawn" | "exit" | "timeout" | "parse",
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "CodexSpawnError";
  }
}

/**
 * Run a single `codex exec` subprocess with the bounded prompt as stdin and
 * return stdout (trimmed). Mirrors `cli/codex-review-unit-executor.ts:runCodexSubagent`
 * pattern minus per-lens output file routing — directive output is parsed from
 * stdout directly since the directive is a single YAML block (review writes
 * markdown into `-o <path>`; reconstruct's structured directive is small
 * enough to round-trip via stdout without intermediate file).
 *
 * Throws `CodexSpawnError` with stage discriminator on any failure.
 */
export function runCodexSpawn(
  config: CodexSpawnConfig,
  prompt: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = [
      "exec",
      "-C",
      config.projectRoot,
      "-s",
      config.sandboxMode,
      "--skip-git-repo-check",
    ];
    if (config.reasoningEffort && config.reasoningEffort.length > 0) {
      args.push("-c", `model_reasoning_effort="${config.reasoningEffort}"`);
    }
    if (config.model && config.model.length > 0) {
      args.push("-m", config.model);
    }
    for (const override of config.configOverrides ?? []) {
      args.push("-c", override);
    }
    args.push("-");

    const child = spawn("codex", args, {
      cwd: config.projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let timeoutHandle: NodeJS.Timeout | undefined;
    let timedOut = false;

    const timeoutMs = config.timeoutMs ?? 600_000;
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: string) => stderrChunks.push(chunk));

    child.on("error", (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(
        new CodexSpawnError(
          `codex spawn failed: ${err.message}`,
          "spawn",
          stderrChunks.join(""),
        ),
      );
    });

    child.on("close", (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (timedOut) {
        reject(
          new CodexSpawnError(
            `codex subprocess timed out after ${timeoutMs}ms`,
            "timeout",
            stderrChunks.join(""),
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new CodexSpawnError(
            `codex subprocess exited with code ${code}`,
            "exit",
            stderrChunks.join(""),
          ),
        );
        return;
      }
      resolve(stdoutChunks.join("").trim());
    });

    child.stdin.end(prompt);
  });
}

// ============================================================================
// YAML directive extraction
// ============================================================================

/**
 * Parse the directive YAML block from LLM stdout.
 *
 * Two acceptable forms:
 *   1. Raw YAML — stdout is yaml directly (preferred, lowest token waste)
 *   2. Fenced YAML — ```yaml\n{directive}\n``` block embedded in prose
 *
 * Returns the parsed object (caller validates shape via the per-Hook validator).
 *
 * Throws `CodexSpawnError(stage="parse")` on:
 *   - empty stdout
 *   - no parseable YAML
 *   - parsed value is not a plain object
 */
export function parseDirectiveYaml(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    throw new CodexSpawnError("empty stdout from codex", "parse");
  }

  // Try fenced ```yaml ... ``` block first (most common from LLM)
  const fencedMatch = trimmed.match(/```(?:yaml|yml)?\s*\n([\s\S]*?)```/);
  const yamlText = fencedMatch?.[1] ?? trimmed;

  let parsed: unknown;
  try {
    parsed = yaml.parse(yamlText);
  } catch (e) {
    throw new CodexSpawnError(
      `directive YAML parse failed: ${e instanceof Error ? e.message : String(e)}`,
      "parse",
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CodexSpawnError(
      `directive root must be an object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
      "parse",
    );
  }

  return parsed as Record<string, unknown>;
}
