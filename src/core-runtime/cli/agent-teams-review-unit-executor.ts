#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

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

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function buildAgentPrompt(
  packetPath: string,
  outputPath: string,
  unitId: string,
  unitKind: string,
): string {
  return `You are a single bounded review unit executing as an Agent Teams-style ContextIsolatedReasoningUnit.

Unit id: ${unitId}
Unit kind: ${unitKind}
Authoritative prompt packet path: ${packetPath}
Canonical output path: ${outputPath}

Rules:
- Treat the incoming user prompt as the authoritative prompt packet.
- The packet path is provided for traceability: ${packetPath}
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
- Preserve disagreement and uncertainty explicitly when present.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly as insufficient access or insufficient evidence within boundary instead of broadening the search.
`;
}

export async function runAgentTeamsReviewUnitExecutorCli(
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
      "reasoning-effort": { type: "string", default: "low" },
      "host-runtime": { type: "string", default: "claude" },
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
  const hostRuntime = requireString(values["host-runtime"], "host-runtime");

  const agentPrompt = buildAgentPrompt(packetPath, outputPath, unitId, unitKind);
  const agentsJson = JSON.stringify({
    review_unit: {
      description: `Bounded ${unitKind} review unit for ${unitId}`,
      prompt: agentPrompt,
    },
  });

  const claudeArgs: string[] = [
    "-p",
    "--bare",
    "--output-format",
    "text",
    "--permission-mode",
    "default",
    "--add-dir",
    projectRoot,
    "--agents",
    agentsJson,
    "--agent",
    "review_unit",
  ];

  if (typeof values.model === "string" && values.model.length > 0) {
    claudeArgs.push("--model", values.model);
  }

  if (
    typeof values["reasoning-effort"] === "string" &&
    values["reasoning-effort"].length > 0
  ) {
    claudeArgs.push("--effort", values["reasoning-effort"]);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  let claudeError: Error | null = null;

  try {
    const child = spawn("claude", claudeArgs, {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: buildClaudeChildEnv(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });

    child.stdin.write(packetText);
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
          : `agent-teams executor exited with code ${exitCode}`,
      );
    }

    const normalizedOutput = stdout.trim();
    if (normalizedOutput.length === 0) {
      throw new Error(`Agent-teams executor produced empty output: ${outputPath}`);
    }

    await fs.writeFile(outputPath, `${normalizedOutput}\n`, "utf8");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Not logged in")) {
      claudeError = error instanceof Error ? error : new Error(errorMessage);
    } else {
      throw error;
    }
  }

  if (claudeError) {
    console.error(
      `[onto] Claude agent-teams auth failed for ${unitId}. Falling back to codex subagent.`,
    );
    const boundedPrompt = `${agentPrompt}\n\nAuthoritative prompt packet follows:\n\n${packetText}`;
    const codexChild = spawn("codex", [
      "exec", "-C", projectRoot, "-s", "read-only",
      "-c", 'model_reasoning_effort="low"',
      "-o", outputPath, "--skip-git-repo-check", "-",
    ], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let codexStdout = "";
    let codexStderr = "";
    codexChild.stdout.on("data", (chunk: Buffer | string) => { codexStdout += String(chunk); });
    codexChild.stderr.on("data", (chunk: Buffer | string) => { codexStderr += String(chunk); });
    codexChild.stdin.write(boundedPrompt);
    codexChild.stdin.end();

    const codexExitCode = await new Promise<number>((resolve, reject) => {
      codexChild.on("error", reject);
      codexChild.on("close", (code) => resolve(code ?? 1));
    });

    if (codexExitCode !== 0) {
      const msg = [codexStderr.trim(), codexStdout.trim()].filter(Boolean).join("\n");
      throw new Error(msg || `codex fallback exited with code ${codexExitCode}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        unit_id: unitId,
        unit_kind: unitKind,
        packet_path: packetPath,
        output_path: outputPath,
        realization: "agent-teams",
        host_runtime: "claude",
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  return runAgentTeamsReviewUnitExecutorCli(process.argv.slice(2));
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
