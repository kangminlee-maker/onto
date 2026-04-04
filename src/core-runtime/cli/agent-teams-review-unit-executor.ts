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

function buildAgentPrompt(
  outputPath: string,
  unitId: string,
  unitKind: string,
): string {
  return `You are a single bounded review unit executing as an Agent Teams-style ContextIsolatedReasoningUnit.

Unit id: ${unitId}
Unit kind: ${unitKind}
Canonical output path: ${outputPath}

Rules:
- Treat the incoming user prompt as the authoritative prompt packet.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files yourself.
- Do not run shell commands or other tools.
- Do not change the required output structure from the packet.
- Preserve disagreement and uncertainty explicitly when present.
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
  const hostRuntime = requireString(values["host-runtime"], "host-runtime");

  if (hostRuntime !== "claude") {
    throw new Error(
      `Unsupported --host-runtime for agent-teams realization: ${hostRuntime}`,
    );
  }

  const packetText = await fs.readFile(packetPath, "utf8");
  const agentPrompt = buildAgentPrompt(outputPath, unitId, unitKind);
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
    "--tools",
    "",
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

  const child = spawn("claude", claudeArgs, {
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
