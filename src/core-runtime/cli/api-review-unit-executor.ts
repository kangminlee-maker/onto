#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
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
- Stay within the smallest sufficient file set implied by the packet.
- Do not recursively follow reference chains beyond the files explicitly listed in the packet unless the packet requires it.
- Produce only the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- If the packet asks you to preserve disagreement or uncertainty, preserve it explicitly.
- If you cannot complete the task within the declared boundary, preserve that limitation explicitly.

Authoritative prompt packet follows:

${packetText}
`;
}

async function runAnthropicApi(
  boundedPrompt: string,
  outputPath: string,
  model: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required for api executor with anthropic provider.",
    );
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: boundedPrompt }],
  });
  const textContent = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? (block as { text: string }).text : ""))
    .join("\n");
  if (textContent.trim().length === 0) {
    throw new Error("Anthropic API returned empty response.");
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${textContent.trim()}\n`, "utf8");
}

async function runOpenAiApi(
  boundedPrompt: string,
  outputPath: string,
  model: string,
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required for api executor with openai provider.",
    );
  }
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: boundedPrompt }],
  });
  const textContent = response.choices[0]?.message?.content ?? "";
  if (textContent.trim().length === 0) {
    throw new Error("OpenAI API returned empty response.");
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${textContent.trim()}\n`, "utf8");
}

export async function runApiReviewUnitExecutorCli(
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
      provider: { type: "string", default: "anthropic" },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const unitId = requireString(values["unit-id"], "unit-id");
  const unitKind = requireString(values["unit-kind"], "unit-kind");
  const packetPath = path.resolve(requireString(values["packet-path"], "packet-path"));
  const outputPath = path.resolve(requireString(values["output-path"], "output-path"));
  const packetText = await fs.readFile(packetPath, "utf8");
  const provider = requireString(values.provider, "provider");
  const boundedPrompt = buildBoundedPrompt(
    packetPath,
    packetText,
    outputPath,
    unitId,
    unitKind,
  );

  if (provider === "anthropic") {
    const model = typeof values.model === "string" && values.model.length > 0
      ? values.model
      : "claude-sonnet-4-20250514";
    await runAnthropicApi(boundedPrompt, outputPath, model);
  } else if (provider === "openai") {
    const model = typeof values.model === "string" && values.model.length > 0
      ? values.model
      : "gpt-4o";
    await runOpenAiApi(boundedPrompt, outputPath, model);
  } else {
    throw new Error(`Unsupported --provider: ${provider}. Use anthropic or openai.`);
  }

  const outputText = await fs.readFile(outputPath, "utf8");
  if (outputText.trim().length === 0) {
    throw new Error(`API executor produced empty output: ${outputPath}`);
  }

  console.log(
    JSON.stringify(
      {
        unit_id: unitId,
        unit_kind: unitKind,
        packet_path: packetPath,
        output_path: outputPath,
        realization: "api",
        provider,
      },
      null,
      2,
    ),
  );
  return 0;
}

async function main(): Promise<number> {
  return runApiReviewUnitExecutorCli(process.argv.slice(2));
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
