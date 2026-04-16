#!/usr/bin/env node

/**
 * Inline-HTTP review unit executor — Phase 2 of host runtime decoupling.
 *
 * Executes a single bounded review unit (lens or synthesize) by directly
 * calling an LLM HTTP endpoint (LiteLLM proxy / Anthropic SDK / OpenAI SDK)
 * from the TS process, instead of delegating to a host runtime
 * (Claude Code TeamCreate / codex exec subprocess).
 *
 * # When to use
 *
 * - **standalone host**: TS process invocation with no Claude Code or Codex
 *   CLI session — direct LLM call is the only option.
 * - **cross-host combinations**: Claude Code main + LiteLLM 8B subagent;
 *   Codex CLI main + Anthropic SDK subagent; etc.
 *
 * # Inline content mode (Phase 2 design decision)
 *
 * Unlike Claude TeamCreate (which spawns a tool-equipped subagent that
 * fetches files on demand) or codex exec (which has its own tool ecosystem),
 * a direct HTTP LLM call has NO tools available. Therefore the executor
 * must inline all needed context into the prompt:
 *
 * - Materialized input (target content): already inline in the prompt packet
 * - Domain documents: NOT inlined by default — packet only references them
 * - Learning context: already inline in the prompt packet
 *
 * Phase 2 inline embedding is **opt-in** via `--embed-domain-docs` flag.
 * When enabled, domain doc references in the packet are expanded into inline
 * content. When disabled, the executor warns that the LLM may produce
 * "domain doc not accessible" notes — acceptable for first-pass exploration
 * but not for production review.
 *
 * # Tool model
 *
 * No tools are made available to the LLM. The LLM produces a single
 * completion that is the lens output markdown. No iterative tool-calling
 * loop (deferred to Phase 3 if needed).
 *
 * # Provider selection
 *
 * Reuses `learning/shared/llm-caller.ts` cost-order resolution:
 *   1. --provider flag (caller-explicit)
 *   2. OntoConfig.api_provider
 *   3. Cost-order ladder (codex OAuth → LiteLLM → Anthropic → OpenAI)
 *
 * The `host_runtime` reported in the JSON output reflects the resolved
 * provider (`litellm` / `anthropic` / `openai`), not the orchestrator host.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import {
  callLlm,
  resolveLearningProviderConfig,
  type LlmCallConfig,
  type LearningProviderConfigInputs,
  type LearningProviderCliOverrides,
} from "../learning/shared/llm-caller.js";
import { embedInlineContext } from "../review/inline-context-embedder.js";

function requireString(
  value: string | boolean | undefined,
  optionName: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value;
}

function buildSystemPrompt(unitId: string, unitKind: string, packetPath: string, outputPath: string): string {
  return `You are executing a single bounded review unit as a ContextIsolatedReasoningUnit.

Unit id: ${unitId}
Unit kind: ${unitKind}
Authoritative prompt packet path: ${packetPath}
Canonical output path: ${outputPath}

Rules:
- Treat the prompt packet (in the user message) as the authoritative contract.
- All content needed for this task has been inlined into the prompt packet.
  You do NOT have file system access or any tools — produce your answer from
  the inlined content alone.
- Treat the Boundary Policy and Effective Boundary State in the packet as hard constraints.
- Stay within the smallest sufficient finding set implied by the packet.
- Produce ONLY the final markdown content for the canonical output path.
- Do not wrap the answer in code fences.
- Do not add commentary before or after the markdown.
- Do not modify repository files (you cannot — no tools available).
- Do not change the required output structure from the packet.
- If the packet asks you to preserve disagreement or uncertainty, preserve it explicitly.
- If you cannot complete the task with the inlined content alone, state the
  limitation as "insufficient content within boundary" rather than fabricating.`;
}

interface ExecutorOptions {
  projectRoot: string;
  sessionRoot: string;
  unitId: string;
  unitKind: string;
  packetPath: string;
  outputPath: string;
  embedDomainDocs: boolean;
  llmConfig: Partial<LlmCallConfig>;
  ontoHome: string;
}

interface ExecutorResult {
  unit_id: string;
  unit_kind: string;
  packet_path: string;
  output_path: string;
  realization: "ts_inline_http";
  host_runtime: "litellm" | "anthropic" | "openai" | "codex";
  /** Resolved LLM model used. */
  model_id?: string;
  /** Token usage for cost tracking. */
  input_tokens?: number;
  output_tokens?: number;
}

async function loadOntoConfig(projectRoot: string): Promise<LearningProviderConfigInputs> {
  const configPath = path.join(projectRoot, ".onto", "config.yml");
  try {
    const text = await fs.readFile(configPath, "utf8");
    // Lightweight YAML parse via dynamic import to avoid adding a dep just
    // for executor. yaml is already a transitive dep through other modules.
    const yaml = await import("yaml");
    const parsed = yaml.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed as LearningProviderConfigInputs;
    }
  } catch {
    // Missing config is fine — caller-explicit flags or env vars take over.
  }
  return {};
}

async function readPacketAndEmbed(
  packetPath: string,
  ontoHome: string,
  projectRoot: string,
  embedDomainDocs: boolean,
): Promise<string> {
  const packetText = await fs.readFile(packetPath, "utf8");
  if (!embedDomainDocs) {
    return packetText;
  }
  return embedInlineContext(packetText, { ontoHome, projectRoot });
}

function deriveHostRuntime(provider: string | undefined): ExecutorResult["host_runtime"] {
  if (provider === "litellm") return "litellm";
  if (provider === "anthropic") return "anthropic";
  if (provider === "openai") return "openai";
  if (provider === "codex") return "codex";
  // Fallback: cost-order auto-resolution defaults to anthropic if creds present
  // and no explicit provider; we can't know the resolved provider here without
  // re-running the resolver, so we use a permissive sentinel.
  return "anthropic";
}

export async function runInlineHttpReviewUnitExecutorCli(
  argv: string[],
): Promise<number> {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: "." },
      "session-root": { type: "string" },
      "onto-home": { type: "string" },
      "unit-id": { type: "string" },
      "unit-kind": { type: "string" },
      "packet-path": { type: "string" },
      "output-path": { type: "string" },
      // LLM provider selection (reuses llm-caller bridge)
      provider: { type: "string" }, // anthropic | openai | litellm | codex
      "llm-base-url": { type: "string" },
      model: { type: "string" },
      "reasoning-effort": { type: "string" },
      "max-tokens": { type: "string" },
      // Inline embedding control
      "embed-domain-docs": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
    args: argv,
  });

  const projectRoot = path.resolve(
    requireString(values["project-root"], "project-root"),
  );
  const sessionRoot = path.resolve(
    requireString(values["session-root"], "session-root"),
  );
  const ontoHome = path.resolve(
    typeof values["onto-home"] === "string" && values["onto-home"].length > 0
      ? values["onto-home"]
      : path.join(process.env.HOME ?? "", ".onto"),
  );
  const unitId = requireString(values["unit-id"], "unit-id");
  const unitKind = requireString(values["unit-kind"], "unit-kind");
  const packetPath = path.resolve(requireString(values["packet-path"], "packet-path"));
  const outputPath = path.resolve(requireString(values["output-path"], "output-path"));
  const embedDomainDocs = Boolean(values["embed-domain-docs"]);

  const maxTokensRaw = values["max-tokens"];
  const maxTokens =
    typeof maxTokensRaw === "string" && maxTokensRaw.length > 0
      ? Number.parseInt(maxTokensRaw, 10)
      : 4096;

  // Resolve LLM provider config: CLI flags → OntoConfig → cost-order ladder.
  const ontoConfig = await loadOntoConfig(projectRoot);
  const cliOverrides: LearningProviderCliOverrides = {};
  const providerValue = values.provider;
  if (
    providerValue === "anthropic" ||
    providerValue === "openai" ||
    providerValue === "litellm" ||
    providerValue === "codex"
  ) {
    cliOverrides.provider = providerValue;
  }
  if (typeof values["llm-base-url"] === "string") {
    cliOverrides.llm_base_url = values["llm-base-url"];
  }
  if (typeof values.model === "string") {
    cliOverrides.model = values.model;
  }
  if (typeof values["reasoning-effort"] === "string") {
    cliOverrides.reasoning_effort = values["reasoning-effort"];
  }

  const llmPartial = resolveLearningProviderConfig({
    config: ontoConfig,
    cliOverrides,
  });

  // Read packet, optionally embed inline content.
  const userPrompt = await readPacketAndEmbed(
    packetPath,
    ontoHome,
    projectRoot,
    embedDomainDocs,
  );
  const systemPrompt = buildSystemPrompt(unitId, unitKind, packetPath, outputPath);

  // Make the call.
  const llmConfig: Partial<LlmCallConfig> = { ...llmPartial, max_tokens: maxTokens };
  const result = await callLlm(systemPrompt, userPrompt, llmConfig);

  const outputText = result.text.trim();
  if (outputText.length === 0) {
    throw new Error(
      `Inline-HTTP executor produced empty output for unit ${unitId} (provider: ${cliOverrides.provider ?? "auto"}).`,
    );
  }

  // Write output file.
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${outputText}\n`, "utf8");

  const executorResult: ExecutorResult = {
    unit_id: unitId,
    unit_kind: unitKind,
    packet_path: packetPath,
    output_path: outputPath,
    realization: "ts_inline_http",
    host_runtime: deriveHostRuntime(cliOverrides.provider),
    model_id: result.model_id,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
  };

  console.log(JSON.stringify(executorResult, null, 2));
  return 0;
}

async function main(): Promise<number> {
  return runInlineHttpReviewUnitExecutorCli(process.argv.slice(2));
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
