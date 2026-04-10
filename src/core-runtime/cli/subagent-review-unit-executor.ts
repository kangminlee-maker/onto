#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function buildBoundedPrompt(
  packetPath: string,
  packetText: string,
  outputPath: string,
  unitId: string,
  unitKind: string,
): string {
  return `You are executing a single bounded review unit as a ContextIsolatedReasoningUnit.

Unit id: ${unitId}
Unit kind: ${unitKind}
Authoritative prompt packet path: ${packetPath}
Canonical output path: ${outputPath}

Rules:
- Treat the prompt packet below as the authoritative contract.
- Treat the Boundary Policy and Effective Boundary State in the packet as hard constraints.
- Read the files referenced by the prompt packet when needed.
- Stay within the smallest sufficient file set implied by the packet.
- Do not recursively follow reference chains beyond the files explicitly listed in the packet unless the packet requires it.
- Do not use web research when the packet says web research is denied.
- Do not read outside the allowed filesystem scope described in the packet.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files yourself.
- Do not change the required output structure from the packet.
- If the packet asks you to preserve disagreement or uncertainty, preserve it explicitly.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly as insufficient access or insufficient evidence within boundary instead of broadening the search.

Authoritative prompt packet follows:

${packetText}
`;
}

function resolveSetupToken(): string | undefined {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const candidatePaths = [
    process.env.CLAUDE_CONFIG_DIR
      ? `${process.env.CLAUDE_CONFIG_DIR}/.oauth-token`
      : "",
    `${homeDir}/.claude-1/.oauth-token`,
    `${homeDir}/.claude-2/.oauth-token`,
    `${homeDir}/.claude/.oauth-token`,
  ].filter(Boolean);

  for (const tokenPath of candidatePaths) {
    try {
      const token = require("node:fs").readFileSync(tokenPath, "utf8").trim();
      if (token.startsWith("sk-ant-")) {
        return token;
      }
    } catch { /* continue */ }
  }
  return undefined;
}

function buildClaudeChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  delete env.CLAUDE_CODE_EXECPATH;
  if (!env.CLAUDE_CODE_OAUTH_TOKEN) {
    const setupToken = resolveSetupToken();
    if (setupToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = setupToken;
    }
  }
  return env;
}

async function runCodexSubagent(
  projectRoot: string,
  boundedPrompt: string,
  outputPath: string,
  model: string | boolean | undefined,
  sandboxMode: string | boolean | undefined,
  reasoningEffort: string | boolean | undefined,
  configOverrides: string[],
): Promise<void> {
  const codexArgs: string[] = [
    "exec",
    "-C",
    projectRoot,
    "-s",
    requireString(sandboxMode, "sandbox-mode"),
    "-c",
    `model_reasoning_effort="${requireString(reasoningEffort, "reasoning-effort")}"`,
    "-o",
    outputPath,
    "--skip-git-repo-check",
  ];

  if (typeof model === "string" && model.length > 0) {
    codexArgs.push("-m", model);
  }

  for (const override of configOverrides) {
    codexArgs.push("-c", override);
  }

  codexArgs.push("-");

  const child = spawn("codex", codexArgs, {
    cwd: projectRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer | string) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += String(chunk);
  });

  child.stdin.write(boundedPrompt);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new Error("codex CLI not found. Install codex or use a different executor."));
      } else {
        reject(err);
      }
    });
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    const combinedMessage = [stderr.trim(), stdout.trim()]
      .filter((message) => message.length > 0)
      .join("\n");
    throw new Error(
      combinedMessage.length > 0
        ? combinedMessage
        : `codex subagent executor exited with code ${exitCode}`,
    );
  }

  // Codex CLI -o flag may not reliably write the output file.
  // If the file is missing or empty, fall back to stdout (same pattern as runClaudeSubagent).
  const outputExists = await fs.access(outputPath).then(() => true, () => false);
  const outputSize = outputExists ? (await fs.stat(outputPath)).size : 0;
  if (!outputExists || outputSize === 0) {
    const normalizedOutput = stdout.trim();
    if (normalizedOutput.length === 0) {
      throw new Error("Codex subagent executor produced no output (neither -o file nor stdout).");
    }
    await fs.writeFile(outputPath, `${normalizedOutput}\n`, "utf8");
  }
}

async function runClaudeSubagent(
  projectRoot: string,
  boundedPrompt: string,
  outputPath: string,
  model: string | boolean | undefined,
  reasoningEffort: string | boolean | undefined,
): Promise<void> {
  const claudeArgs: string[] = [
    "-p",
    "--bare",
    "--output-format",
    "text",
    "--permission-mode",
    "default",
    "--add-dir",
    projectRoot,
  ];

  if (typeof model === "string" && model.length > 0) {
    claudeArgs.push("--model", model);
  }

  if (typeof reasoningEffort === "string" && reasoningEffort.length > 0) {
    claudeArgs.push("--effort", reasoningEffort);
  }

  const claudeEnv = buildClaudeChildEnv();

  const child = spawn("claude", claudeArgs, {
    cwd: projectRoot,
    stdio: ["pipe", "pipe", "pipe"],
    env: claudeEnv,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer | string) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += String(chunk);
  });

  child.stdin.write(boundedPrompt);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    const combinedMessage = [stderr.trim(), stdout.trim()]
      .filter((message) => message.length > 0)
      .join("\n");
    throw new Error(
      combinedMessage.length > 0
        ? combinedMessage
        : `claude subagent executor exited with code ${exitCode}`,
    );
  }

  const normalizedOutput = stdout.trim();
  if (normalizedOutput.length === 0) {
    throw new Error("Claude subagent executor produced empty output.");
  }

  await fs.writeFile(outputPath, `${normalizedOutput}\n`, "utf8");
}

export async function runSubagentReviewUnitExecutorCli(
  argv: string[],
): Promise<number> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
      "unit-id": { type: "string" },
      "unit-kind": { type: "string" },
      "packet-path": { type: "string" },
      "output-path": { type: "string" },
      model: { type: "string" },
      "host-runtime": { type: "string", default: "codex" },
      "sandbox-mode": { type: "string", default: "read-only" },
      "reasoning-effort": { type: "string", default: "low" },
      "config-override": { type: "string", multiple: true, default: [] },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const projectRoot = path.resolve(
    requireString(values["project-root"], "project-root"),
  );
  const unitId = requireString(values["unit-id"], "unit-id");
  const unitKind = requireString(values["unit-kind"], "unit-kind");
  const packetPath = path.resolve(requireString(values["packet-path"], "packet-path"));
  const outputPath = path.resolve(requireString(values["output-path"], "output-path"));
  const packetText = await fs.readFile(packetPath, "utf8");
  const boundedPrompt = buildBoundedPrompt(
    packetPath,
    packetText,
    outputPath,
    unitId,
    unitKind,
  );
  const hostRuntime = requireString(values["host-runtime"], "host-runtime");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (hostRuntime === "codex") {
    await runCodexSubagent(
      projectRoot,
      boundedPrompt,
      outputPath,
      values.model,
      values["sandbox-mode"],
      values["reasoning-effort"],
      values["config-override"],
    );
  } else if (hostRuntime === "claude") {
    try {
      await runClaudeSubagent(
        projectRoot,
        boundedPrompt,
        outputPath,
        values.model,
        values["reasoning-effort"],
      );
    } catch (claudeError: unknown) {
      const claudeMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
      if (claudeMessage.includes("Not logged in")) {
        throw new Error(
          `[CLAUDE_AUTH_FAILED] Claude subagent auth failed for ${unitId}: ${claudeMessage}`,
        );
      }
      throw claudeError;
    }
  } else {
    throw new Error(`Unsupported --host-runtime for subagent: ${hostRuntime}`);
  }

  const outputText = await fs.readFile(outputPath, "utf8");
  if (outputText.trim().length === 0) {
    throw new Error(`Subagent executor produced empty output: ${outputPath}`);
  }

  console.log(
    JSON.stringify(
      {
        unit_id: unitId,
        unit_kind: unitKind,
        packet_path: packetPath,
        output_path: outputPath,
        realization: "subagent",
        host_runtime: hostRuntime,
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  return runSubagentReviewUnitExecutorCli(process.argv.slice(2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => process.exit(exitCode),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
